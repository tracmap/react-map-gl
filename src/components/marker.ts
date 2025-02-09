/* global document */
import * as React from 'react';
import {useEffect, useMemo, useRef} from 'react';
import {createPortal} from 'react-dom';
import {applyReactStyle} from '../utils/apply-react-style';

import type {
  Alignment,
  Anchor,
  MapboxEvent,
  MapboxMarker,
  MapboxPopup,
  MarkerDragEvent,
  PointLike
} from '../types';
import {ViewStateChangeEvent} from '../types';

import {useMapContext} from './map';
import {arePointsEqual} from '../utils/deep-equal';

export type MarkerProps = {
  /** Longitude of the anchor location */
  longitude: number;
  /** Latitude of the anchor location */
  latitude: number;
  /** A string indicating the part of the Marker that should be positioned closest to the coordinate set via Marker.setLngLat.
   * Options are `'center'`, `'top'`, `'bottom'`, `'left'`, `'right'`, `'top-left'`, `'top-right'`, `'bottom-left'`, and `'bottom-right'`.
   * @default "center"
   */
  anchor?: Anchor;
  /**
   * The max number of pixels a user can shift the mouse pointer during a click on the marker for it to be considered a valid click
   * (as opposed to a marker drag). The default (0) is to inherit map's clickTolerance.
   */
  clickTolerance?: number;
  /** The color to use for the default marker if options.element is not provided.
   * @default "#3FB1CE"
   */
  color?: string;
  /** A boolean indicating whether or not a marker is able to be dragged to a new position on the map.
   * @default false
   */
  draggable?: boolean;
  /** The offset in pixels as a PointLike object to apply relative to the element's center. Negatives indicate left and up. */
  offset?: PointLike;
  /** `map` aligns the `Marker` to the plane of the map.
   * `viewport` aligns the `Marker` to the plane of the viewport.
   * `auto` automatically matches the value of `rotationAlignment`.
   * @default "auto"
   */
  pitchAlignment?: Alignment;
  /** The rotation angle of the marker in degrees, relative to its `rotationAlignment` setting. A positive value will rotate the marker clockwise.
   * @default 0
   */
  rotation?: number;
  /** `map` aligns the `Marker`'s rotation relative to the map, maintaining a bearing as the map rotates.
   * `viewport` aligns the `Marker`'s rotation relative to the viewport, agnostic to map rotations.
   * `auto` is equivalent to `viewport`.
   * @default "auto"
   */
  rotationAlignment?: Alignment;
  /** The scale to use for the default marker if options.element is not provided.
   * The default scale (1) corresponds to a height of `41px` and a width of `27px`.
   * @default 1
   */
  scale?: number;
  /** A Popup instance that is bound to the marker */
  popup?: MapboxPopup;
  /** CSS style override, applied to the control's container */
  style?: React.CSSProperties;
  onClick?: (e: MapboxEvent<MouseEvent>) => void;
  onDragStart?: (e: MarkerDragEvent) => void;
  onDrag?: (e: MarkerDragEvent) => void;
  onDragEnd?: (e: MarkerDragEvent) => void;
  children?: React.ReactNode;
};

const defaultProps: Partial<MarkerProps> = {
  draggable: false,
  popup: undefined,
  rotation: 0,
  rotationAlignment: 'auto',
  pitchAlignment: 'auto'
};

/* eslint-disable complexity,max-statements */
function Marker(props: MarkerProps) {
  const {map, mapLib} = useMapContext();
  const thisRef = useRef({props});
  thisRef.current.props = props;

  const marker: MapboxMarker = useMemo(() => {
    let hasChildren = false;
    React.Children.forEach(props.children, el => {
      if (el) {
        hasChildren = true;
      }
    });
    const options = {
      ...props,
      element: hasChildren ? document.createElement('div') : null
    };

    const mk = new mapLib.Marker(options).setLngLat([props.longitude, props.latitude]);

    mk.getElement().addEventListener('click', (e: MouseEvent) => {
      thisRef.current.props.onClick?.({
        type: 'click',
        target: mk,
        originalEvent: e
      });
    });

    mk.on('dragstart', (e: ViewStateChangeEvent) => {
      const evt = e as unknown as MarkerDragEvent;
      evt.lngLat = marker.getLngLat();
      thisRef.current.props.onDragStart?.(evt);
    });
    mk.on('drag', (e: ViewStateChangeEvent) => {
      const evt = e as unknown as MarkerDragEvent;
      evt.lngLat = marker.getLngLat();
      thisRef.current.props.onDrag?.(evt);
    });
    mk.on('dragend', (e: ViewStateChangeEvent) => {
      if (e) {
        const evt = e as unknown as MarkerDragEvent;
        evt.lngLat = marker.getLngLat();
        thisRef.current.props.onDragEnd?.(evt);
      }
    });

    return mk;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (map) {
      marker.addTo(map.getMap());
    }

    return () => {
      marker.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    applyReactStyle(marker.getElement(), props.style);
  }, [marker, props.style]);

  if (marker.getLngLat().lng !== props.longitude || marker.getLngLat().lat !== props.latitude) {
    marker.setLngLat([props.longitude, props.latitude]);
  }
  if (props.offset && !arePointsEqual(marker.getOffset(), props.offset)) {
    marker.setOffset(props.offset);
  }
  if (props.draggable && marker.isDraggable() !== props.draggable) {
    marker.setDraggable(props.draggable);
  }
  if (props.rotation && marker.getRotation() !== props.rotation) {
    marker.setRotation(props.rotation);
  }
  if (props.rotationAlignment && marker.getRotationAlignment() !== props.rotationAlignment) {
    marker.setRotationAlignment(props.rotationAlignment);
  }
  if (props.pitchAlignment && marker.getPitchAlignment() !== props.pitchAlignment) {
    marker.setPitchAlignment(props.pitchAlignment);
  }
  if (marker.getPopup() !== props.popup) {
    marker.setPopup(props.popup);
  }

  return createPortal(props.children, marker.getElement());
}

Marker.defaultProps = defaultProps;

// @ts-ignore
export default React.memo(Marker);
