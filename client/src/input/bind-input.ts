import { bus } from '../core/events';
import { Actions } from './actions';
import { Controls } from './controls-settings';
import { bindGamepad } from './gamepad';
import { bindGyro } from './gyro';
import { bindKeyboardMouse } from './keyboard-mouse';
import { LayoutStore } from './layout-store';
import { TouchControls } from './touch';

export interface InputRig {
  actions: Actions;
  controls: Controls;
  /** Present when touch controls are on. */
  touch: TouchControls | null;
  /** Call once per render frame (gamepad is polled, not evented). */
  poll(dt: number): void;
  dispose(): void;
}

/** Wires every input source to one action layer. `touch` = on-screen controls (mouse then acts as a finger in dev). */
export function bindInput(host: HTMLElement, canvas: HTMLElement, opts: { touch: boolean }): InputRig {
  const actions = new Actions();
  const controls = new Controls();
  const touch = opts.touch ? new TouchControls(host, actions, controls, new LayoutStore()) : null;
  const unKm = touch ? () => {} : bindKeyboardMouse(actions, canvas);
  const unGyro = bindGyro(actions, controls);
  const pad = bindGamepad(actions, controls);
  return {
    actions, controls, touch,
    poll: (dt) => { pad.poll(dt); if (actions.take('pause')) bus.emit('app:back', {}); },
    dispose() { unKm(); unGyro(); pad.dispose(); touch?.dispose(); },
  };
}
