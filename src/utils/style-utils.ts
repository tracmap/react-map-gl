import {ImmutableLike, MapboxStyle} from '../types';
import {AnyLayer} from 'mapbox-gl';

const refProps = [
  'type',
  'source',
  'source-layer',
  'minzoom',
  'maxzoom',
  'filter',
  'layout'
] as const;

// Prepare a map style object for diffing
// If immutable - convert to plain object
// Work around some issues in older styles that would fail Mapbox's diffing

export function normalizeStyle(
  style: string | MapboxStyle | ImmutableLike | undefined
): string | MapboxStyle | null {
  if (!style) {
    return null;
  }
  if (typeof style === 'string') {
    return style;
  }
  if ('toJS' in style) {
    style = style.toJS() as MapboxStyle;
  }
  if (!style.layers) {
    return style;
  }
  const layerIndex: {[layerId: string]: AnyLayer} = {};

  for (const layer of style.layers) {
    layerIndex[layer.id] = layer;
  }

  const layers = style.layers.map(layer => {
    // @ts-expect-error
    const layerRef = layerIndex[layer.ref];
    let normalizedLayer: AnyLayer | null = null;

    if ('interactive' in layer) {
      normalizedLayer = {...layer};
      // Breaks style diffing :(
      delete normalizedLayer.interactive;
    }

    // Style diffing doesn't work with refs so expand them out manually before diffing.
    if (layerRef) {
      normalizedLayer = normalizedLayer || {...layer};
      // @ts-ignore
      if (normalizedLayer?.ref) {
        // @ts-ignore
        delete normalizedLayer.ref;
      }
      // https://github.com/mapbox/mapbox-gl-js/blob/master/src/style-spec/deref.js
      for (const propName of refProps) {
        if (propName in layerRef) {
          // @ts-ignore
          normalizedLayer[propName] = layerRef[propName];
        }
      }
    }

    return normalizedLayer || layer;
  });

  // Do not mutate the style object provided by the user
  return {...style, layers};
}
