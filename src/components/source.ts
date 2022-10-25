import * as React from 'react';
import {cloneElement, useEffect, useMemo, useRef, useState} from 'react';
import {useMapContext} from './map';
import assert from '../utils/assert';
import {deepEqual} from '../utils/deep-equal';

import type {
  AnySourceData,
  AnySourceImpl,
  GeoJSONSource,
  ImageSource,
  MapboxMap,
  VideoSource
} from '../types';

export type SourceProps = AnySourceData & {
  id?: string;
  children?: any;
};

let sourceCounter = 0;

function createSource(map: MapboxMap, id: string, props: SourceProps) {
  /**
   * This is NOT equivalent to `map.isStyleLoaded()`
   * because nothing exists in sourceCache
   */
  // @ts-ignore
  if (map.style && map.style._loaded) {
    const options = {...props};
    delete options.id;
    delete options.children;

    map.addSource(id, options);
    return map.getSource(id);
  }
  return null;
}

/* eslint-disable complexity */
function updateSource(source: AnySourceImpl, props: SourceProps, prevProps: SourceProps) {
  assert(props.id === prevProps.id, 'source id changed');
  assert(props.type === prevProps.type, 'source type changed');

  let changedKey = '';
  let changedKeyCount = 0;

  for (const key in props) {
    if (key !== 'children' && key !== 'id' && !deepEqual(prevProps[key], props[key])) {
      changedKey = key;
      changedKeyCount++;
    }
  }

  if (!changedKeyCount) {
    return;
  }

  const type = props.type;

  if (type === 'geojson' && props?.data) {
    // @ts-ignore
    (source as GeoJSONSource).setData(props.data);
  } else if (type === 'image') {
    (source as ImageSource).updateImage({url: props.url, coordinates: props.coordinates});
  } else if (
    (type === 'canvas' || type === 'video') &&
    changedKeyCount === 1 &&
    changedKey === 'coordinates' &&
    props.coordinates
  ) {
    (source as VideoSource).setCoordinates(props.coordinates);
  } else if (type === 'vector' && 'setUrl' in source) {
    // Added in 1.12.0:
    // vectorTileSource.setTiles
    // vectorTileSource.setUrl
    switch (changedKey) {
      case 'url':
        if (props.url) {
          source.setUrl(props.url);
        }
        break;
      case 'tiles':
        if (props.tiles) {
          source.setTiles(props.tiles);
        }
        break;
      default:
    }
  } else {
    // eslint-disable-next-line
    console.warn(`Unable to update <Source> prop: ${changedKey}`);
  }
}
/* eslint-enable complexity */

function Source(props: SourceProps) {
  const map: MapboxMap | undefined = useMapContext()?.map?.getMap();
  const propsRef = useRef(props);
  const [, setStyleLoaded] = useState(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const id = useMemo(() => props.id || `jsx-source-${sourceCounter++}`, []);

  useEffect(() => {
    if (map) {
      const forceUpdate = () => setStyleLoaded(version => version + 1);
      map.on('styledata', forceUpdate);
      forceUpdate();

      return () => {
        map.off('styledata', forceUpdate);
        // @ts-ignore
        if (map.style && map.style._loaded && map.getSource(id)) {
          // Parent effects are destroyed before child ones, see
          // https://github.com/facebook/react/issues/16728
          // Source can only be removed after all child layers are removed
          const allLayers = map.getStyle()?.layers;
          if (allLayers) {
            for (const layer of allLayers) {
              // @ts-ignore (2339) source does not exist on all layer types
              if (layer.source === id) {
                map.removeLayer(layer.id);
              }
            }
          }
          map.removeSource(id);
        }
      };
    }
    return undefined;
  }, [id, map]);

  // @ts-ignore
  let source = map && map.style && map.getSource(id);
  if (source) {
    updateSource(source, props, propsRef.current);
  } else if (map) {
    source = createSource(map, id, props);
  }
  propsRef.current = props;

  return (
    (source &&
      React.Children.map(
        props.children,
        child =>
          child &&
          cloneElement(child, {
            source: id
          })
      )) ||
    null
  );
}

export default Source;
