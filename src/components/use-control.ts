import {useEffect, useMemo} from 'react';
import type {ControlPosition, IControl} from '../types';
import type {MapContextValue} from './map';
import {useMapContext} from './map';

type ControlOptions = {
  position?: ControlPosition;
};

function useControl<T extends IControl>(
  onCreate: (context: MapContextValue) => T,
  opts?: ControlOptions
): T;

function useControl<T extends IControl>(
  onCreate: (context: MapContextValue) => T,
  onRemove: (context: MapContextValue) => void,
  opts?: ControlOptions
): T;

function useControl<T extends IControl>(
  onCreate: (context: MapContextValue) => T,
  onAdd: (context: MapContextValue) => void,
  onRemove: (context: MapContextValue) => void,
  opts?: ControlOptions
): T;

function useControl<T extends IControl>(
  onCreate: (context: MapContextValue) => T,
  arg1?: ((context: MapContextValue) => void) | ControlOptions,
  arg2?: ((context: MapContextValue) => void) | ControlOptions,
  arg3?: ControlOptions
) {
  const context = useMapContext();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const ctrl = useMemo(() => onCreate(context), []);

  useEffect(() => {
    const opts = (arg3 || arg2 || arg1) as ControlOptions;
    const onAdd = typeof arg1 === 'function' && typeof arg2 === 'function' ? arg1 : null;
    const onRemove = typeof arg2 === 'function' ? arg2 : typeof arg1 === 'function' ? arg1 : null;

    if (!context) {
      return () => {};
    }

    const {map} = context;
    if (map && !map.hasControl(ctrl)) {
      map.addControl(ctrl, opts?.position);
      if (onAdd) {
        onAdd(context);
      }
    }

    return () => {
      if (onRemove) {
        onRemove(context);
      }
      // Map might have been removed (parent effects are destroyed before child ones)
      if (map && map.hasControl(ctrl)) {
        map.removeControl(ctrl);
      }
    };
  }, [arg1, arg2, arg3, context, ctrl]);

  return ctrl;
}

export default useControl;
