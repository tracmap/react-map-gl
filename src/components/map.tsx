import * as React from 'react';
import {
  useState,
  useRef,
  useEffect,
  useContext,
  useMemo,
  forwardRef,
  useImperativeHandle
} from 'react';

import { useMountedMapsContext} from './use-map';
import Mapbox, {MapboxProps} from '../mapbox/mapbox';
import createRef, {MapRef} from '../mapbox/create-ref';

import type {CSSProperties} from 'react';
import useIsomorphicLayoutEffect from '../utils/use-isomorphic-layout-effect';
import setGlobals, {GlobalSettings} from '../utils/set-globals';

export type MapContextValue = {
  mapLib: any;
  map: MapRef|undefined;
};

const MapContext = React.createContext<MapContextValue|null>(null);

export function useMapContext() {
  const context = useContext(MapContext);

  if(context === null) {
    return {
      mapLib: undefined,
      map: undefined
    }
  }

  return context
}


export type MapProps = MapboxProps &
  GlobalSettings & {
    mapLib?: any;
    reuseMaps?: boolean;
    /** Map container id */
    id?: string;
    /** Map container CSS style */
    style?: CSSProperties;
    children?: any;
  };

const defaultProps: MapProps = {
  // Constraints
  minZoom: 0,
  maxZoom: 22,
  minPitch: 0,
  maxPitch: 60,

  // Interaction handlers
  scrollZoom: true,
  boxZoom: true,
  dragRotate: true,
  dragPan: true,
  keyboard: true,
  doubleClickZoom: true,
  touchZoomRotate: true,
  touchPitch: true,

  // Style
  mapStyle: {version: 8, sources: {}, layers: []},
  styleDiffing: true,
  projection: 'mercator',
  renderWorldCopies: true,

  // Callbacks
  onError: e => console.error(e.error), // eslint-disable-line

  // Globals
  RTLTextPlugin:
    'https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-rtl-text/v0.2.3/mapbox-gl-rtl-text.js'
};

const Map = forwardRef<MapRef|undefined, MapProps>((props, ref) => {
  const mountedMapsContext = useMountedMapsContext()
  const [mapInstance, setMapInstance] = useState<Mapbox | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // @ts-ignore
  const {current: contextValue} = useRef<MapContextValue>({mapLib: null, map: null});

  useEffect(() => {
    const mapLib = props.mapLib;
    let isMounted = true;
    let mapbox: Mapbox | null;


    Promise.resolve(mapLib || import('mapbox-gl'))
      .then(mapboxgl => {
        if (!isMounted ) {
          return;
        }



        if (!mapboxgl.Map) {
          // commonjs style
          mapboxgl = mapboxgl.default;
        }
        if (!mapboxgl || !mapboxgl.Map) {
          throw new Error('Invalid mapLib');
        }

        if (mapboxgl.supported(props)) {
          setGlobals(mapboxgl, props);
          if (props.reuseMaps && containerRef.current) {
            mapbox = Mapbox.reuse(props, containerRef.current);
          }
          if (!mapbox ) {
            mapbox = new Mapbox(mapboxgl.Map, props, containerRef.current!);
          }
          contextValue.map = createRef(mapbox, mapboxgl);
          contextValue.mapLib = mapboxgl;

          setMapInstance(mapbox);
          // @ts-ignore
          mountedMapsContext?.onMapMount(contextValue.map, props.id);
        } else {
          throw new Error('Map is not supported by this browser');
        }
      })
      .catch(error => {
        // @ts-ignore
        props?.onError({
          type: 'error',
          // @ts-ignore
          target: null,
          // @ts-ignore
          originalEvent: null,
          error
        });
      });

    return () => {
      isMounted = false;
      if (mapbox) {
        // @ts-ignore
        mountedMapsContext?.onMapUnmount(props.id);
        if (props.reuseMaps) {
          mapbox.recycle();
        } else {
          mapbox.destroy();
        }
      }
    };
  }, []);

  useIsomorphicLayoutEffect(() => {
    if (mapInstance) {
      mapInstance.setProps(props);
    }
  });

  useImperativeHandle(ref, () => contextValue?.map, [contextValue?.map]);

  const style: CSSProperties = useMemo(
    () => ({
      position: 'relative',
      width: '100%',
      height: '100%',
      ...props.style
    }),
    [props.style]
  );

  return (

    // @ts-ignore
    <div id={props.id} ref={containerRef} style={style}>
      {mapInstance && (
        <MapContext.Provider value={contextValue}>{props.children}</MapContext.Provider>
      )}
    </div>
  );
});

Map.displayName = 'Map';
Map.defaultProps = defaultProps;

export default Map;
