/* global document */
import * as React from 'react';
import {useEffect, useMemo, useRef} from 'react';
import {createPortal} from 'react-dom';
import {applyReactStyle} from '../utils/apply-react-style';

import type {Anchor, MapboxPopup, PointLike, PopupEvent} from '../types';

import {useMapContext} from './map';
import {deepEqual} from '../utils/deep-equal';
import {PopupOptions} from 'mapbox-gl';

export type PopupProps = {
  /** Longitude of the anchor location */
  longitude: number;
  /** Latitude of the anchor location */
  latitude: number;
  /**
   * A string indicating the part of the popup that should be positioned closest to the coordinate.
   * Options are `'center'`, `'top'`, `'bottom'`, `'left'`, `'right'`, `'top-left'`, `'top-right'`, `'bottom-left'`,
   * and `'bottom-right'`. If unset, the anchor will be dynamically set to ensure the popup falls within the map
   * container with a preference for `'bottom'`.
   */
  anchor?: Anchor;
  /**
   * If `true`, a close button will appear in the top right corner of the popup.
   * @default true
   */
  closeButton?: boolean;
  /**
   * If `true`, the popup will close when the map is clicked.
   * @default true
   */
  closeOnClick?: boolean;
  /**
   * If `true`, the popup will closed when the map moves.
   * @default false
   */
  closeOnMove?: boolean;
  /**
   * If `true`, the popup will try to focus the first focusable element inside the popup.
   * @default true
   */
  focusAfterOpen?: boolean;
  /**
   * A pixel offset applied to the popup's location specified as:
   * - a single number specifying a distance from the popup's location
   * - a PointLike specifying a constant offset
   * - an object of Points specifing an offset for each anchor position.
   */
  offset?: number | PointLike | Partial<{[anchor in Anchor]: PointLike}>;
  /** Space-separated CSS class names to add to popup container. */
  className?: string;
  /**
   * A string that sets the CSS property of the popup's maximum width (for example, `'300px'`).
   * To ensure the popup resizes to fit its content, set this property to `'none'`
   * @default "240px"
   */
  maxWidth?: string;
  /** CSS style override, applied to the control's container */
  style?: React.CSSProperties;

  onOpen?: (e: PopupEvent) => void;
  onClose?: (e: PopupEvent) => void;
  children?: React.ReactNode;
};

// Adapted from https://github.com/mapbox/mapbox-gl-js/blob/v1.13.0/src/ui/popup.js
function getClassList(className: string | undefined) {
  return new Set(className ? className.trim().split(/\s+/) : []);
}

/* eslint-disable complexity,max-statements */
function Popup(props: PopupProps) {
  const {map, mapLib} = useMapContext();
  const container = useMemo(() => {
    return document.createElement('div');
  }, []);
  const thisRef = useRef({props});
  thisRef.current.props = props;

  // https://github.com/mapbox/mapbox-gl-js/blob/main/src/ui/popup.js options is set to default options
  const popup: MapboxPopup & {options: PopupOptions} = useMemo(() => {
    const options = {...props};
    const pp = new mapLib.Popup(options).setLngLat([props.longitude, props.latitude]);
    pp.once('open', (e: PopupEvent) => {
      thisRef.current.props.onOpen?.(e);
    });
    return pp;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onClose = (e: Object | undefined) => {
      thisRef.current.props.onClose?.(e as PopupEvent);
    };
    popup.on('close', onClose);
    if (map) {
      popup.setDOMContent(container).addTo(map.getMap());
    }

    return () => {
      // https://github.com/visgl/react-map-gl/issues/1825
      // onClose should not be fired if the popup is removed by unmounting
      // When using React strict mode, the component is mounted twice.
      // Firing the onClose callback here would be a false signal to remove the component.
      popup.off('close', onClose);
      if (popup.isOpen()) {
        popup.remove();
      }
    };
  }, [container, map, popup]);

  useEffect(() => {
    applyReactStyle(popup.getElement(), props.style);
  }, [popup, props.style]);

  if (popup.isOpen()) {
    if (popup.getLngLat().lng !== props.longitude || popup.getLngLat().lat !== props.latitude) {
      popup.setLngLat([props.longitude, props.latitude]);
    }

    if (props.offset && !deepEqual(popup?.options?.offset, props.offset)) {
      popup.setOffset(props.offset);
    }

    if (popup?.options?.anchor !== props.anchor) {
      popup.options.anchor = props.anchor;
    }

    if (props.maxWidth && popup?.options?.maxWidth !== props.maxWidth) {
      popup.setMaxWidth(props.maxWidth);
    }

    if (popup?.options?.className !== props.className) {
      const prevClassList = getClassList(popup?.options?.className);
      const nextClassList = getClassList(props.className);

      for (const c of prevClassList) {
        if (!nextClassList.has(c)) {
          popup.removeClassName(c);
        }
      }
      for (const c of nextClassList) {
        if (!prevClassList.has(c)) {
          popup.addClassName(c);
        }
      }

      popup.options.className = props.className;
    }
  }

  return createPortal(props.children, container);
}

// @ts-ignore
export default React.memo(Popup);
