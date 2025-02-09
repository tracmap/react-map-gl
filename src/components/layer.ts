import {useEffect, useMemo, useRef, useState} from 'react';
import {useMapContext} from './map';
import assert from '../utils/assert';
import {deepEqual} from '../utils/deep-equal';

import type {AnyLayer, MapboxMap} from '../types';

// Omiting property from a union type, see
// https://github.com/microsoft/TypeScript/issues/39556#issuecomment-656925230
type OptionalId<T> = T extends {id: string} ? Omit<T, 'id'> & {id?: string} : T;

export type LayerProps = OptionalId<AnyLayer> & {
  /** If set, the layer will be inserted before the specified layer */
  beforeId?: string;
};

/* eslint-disable complexity, max-statements */
function updateLayer(map: MapboxMap, id: string, props: LayerProps, prevProps: LayerProps) {
  assert(props.id === prevProps.id, 'layer id changed');
  assert(props.type === prevProps.type, 'layer type changed');

  if (props.type === 'custom' || prevProps.type === 'custom') {
    return;
  }

  const {layout = {}, paint = {}, filter, minzoom, maxzoom, beforeId} = props;

  if (beforeId !== prevProps.beforeId) {
    map.moveLayer(id, beforeId);
  }
  if (layout !== prevProps.layout) {
    const prevLayout = prevProps.layout || {};
    for (const key in layout) {
      // @ts-ignore
      if (!deepEqual(layout[key], prevLayout[key])) {
        // @ts-ignore
        map.setLayoutProperty(id, key, layout[key]);
      }
    }
    for (const key in prevLayout) {
      if (!layout.hasOwnProperty(key)) {
        map.setLayoutProperty(id, key, undefined);
      }
    }
  }
  if (paint !== prevProps.paint) {
    const prevPaint = prevProps.paint || {};
    for (const key in paint) {
      // @ts-ignore
      if (!deepEqual(paint[key], prevPaint[key])) {
        // @ts-ignore
        map.setPaintProperty(id, key, paint[key]);
      }
    }
    for (const key in prevPaint) {
      if (!paint.hasOwnProperty(key)) {
        map.setPaintProperty(id, key, undefined);
      }
    }
  }
  if (!deepEqual(filter, prevProps.filter)) {
    map.setFilter(id, filter);
  }
  if (
    typeof minzoom === 'number' &&
    typeof maxzoom === 'number' &&
    (minzoom !== prevProps.minzoom || maxzoom !== prevProps.maxzoom)
  ) {
    map.setLayerZoomRange(id, minzoom, maxzoom);
  }
}

function createLayer(map: MapboxMap | undefined, id: string, props: LayerProps) {
  // @ts-ignore
  if (map?.style?._loaded && (!('source' in props) || map.getSource(props.source))) {
    const options: LayerProps = {...props, id};
    delete options.beforeId;

    // @ts-ignore
    map.addLayer(options, props.beforeId);
  }
}

/* eslint-enable complexity, max-statements */

let layerCounter = 0;

function Layer(props: LayerProps): null {
  const map: MapboxMap | undefined = useMapContext()?.map?.getMap();
  const propsRef = useRef(props);
  const [, setStyleLoaded] = useState(0);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const id = useMemo(() => props.id || `jsx-layer-${layerCounter++}`, []);

  useEffect(() => {
    if (map) {
      const forceUpdate = () => setStyleLoaded(version => version + 1);
      map.on('styledata', forceUpdate);
      forceUpdate();

      return () => {
        map.off('styledata', forceUpdate);
        // @ts-ignore
        if (map.style && map.style._loaded && map.getLayer(id)) {
          map.removeLayer(id);
        }
      };
    }
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  // @ts-ignore
  const layer = map && map.style && map.getLayer(id);
  if (layer) {
    try {
      updateLayer(map, id, props, propsRef.current);
    } catch (error) {
      console.warn(error); // eslint-disable-line
    }
  } else {
    createLayer(map, id, props);
  }

  // Store last rendered props
  propsRef.current = props;

  return null;
}

export default Layer;
