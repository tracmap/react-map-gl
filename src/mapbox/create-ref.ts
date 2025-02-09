import type {MapboxMap, LngLatLike, PointLike, ElevationQueryOptions} from '../types';
import type Mapbox from './mapbox';

/** These methods may break the react binding if called directly */
const skipMethods = [
  'setMaxBounds',
  'setMinZoom',
  'setMaxZoom',
  'setMinPitch',
  'setMaxPitch',
  'setRenderWorldCopies',
  'setProjection',
  'setStyle',
  'addSource',
  'removeSource',
  'addLayer',
  'removeLayer',
  'setLayerZoomRange',
  'setFilter',
  'setPaintProperty',
  'setLayoutProperty',
  'setLight',
  'setTerrain',
  'setFog',
  'remove'
] as const;

export type MapRef = {
  getMap(): MapboxMap;
} & Omit<MapboxMap, typeof skipMethods[number]>;

export default function createRef(mapInstance: Mapbox, mapLib: any): MapRef {
  const map: MapboxMap = mapInstance.map;
  const result: any = {
    getMap: () => map,

    // Overwrite getters to use our shadow transform
    getCenter: () => mapInstance.transform.center,
    getZoom: () => mapInstance.transform.zoom,
    getBearing: () => mapInstance.transform.bearing,
    getPitch: () => mapInstance.transform.pitch,
    getPadding: () => mapInstance.transform.padding,
    getBounds: () => mapInstance.transform.getBounds(),
    project: (lnglat: LngLatLike) => {
      return mapInstance.transform.locationPoint(mapLib.LngLat.convert(lnglat));
    },
    unproject: (point: PointLike) => {
      return mapInstance.transform.pointLocation(mapLib.Point.convert(point));
    },
    queryTerrainElevation: (lnglat: LngLatLike, options: ElevationQueryOptions) => {
      // @ts-ignore transform not defined
      const tr = map.transform;
      // @ts-ignore transform not defined
      map.transform = mapInstance.transform;
      const result = map.queryTerrainElevation(lnglat, options);
      // @ts-ignore transform not defined
      map.transform = tr;
      return result;
    }
  };

  for (const key of getMethodNames(map)) {
    // @ts-expect-error
    if (!(key in result) && !skipMethods.includes(key)) {
      // @ts-ignore
      result[key] = map[key].bind(map);
    }
  }

  return result;
}

function getMethodNames(obj: any) {
  const result = new Set<string>();

  let proto = obj;
  while (proto) {
    for (const key of Object.getOwnPropertyNames(proto)) {
      if (
        key[0] !== '_' &&
        typeof obj[key] === 'function' &&
        key !== 'fire' &&
        key !== 'setEventedParent'
      ) {
        result.add(key);
      }
    }
    proto = Object.getPrototypeOf(proto);
  }
  return Array.from(result);
}
