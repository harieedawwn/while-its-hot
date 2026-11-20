import { bus } from '../core/events';
import { Actions } from './actions';
import { sharedControls, type Controls } from './controls-settings';
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

/** Wires every input source to one action layer. `touch` = on-screen controls (mouse then acts as a finger in dev); `?preset=two|three|four` previews a factory layout unsaved. */
export function bindInput(host: HTMLElement, canvas: HTMLElement, opts: { touch: boolean }): InputRig {
  const actions = new Actions();
  const controls = sharedControls();
  const touch = opts.touch ? new TouchControls(host, actions, controls, new LayoutStore(new URLSearchParams(location.search).get('preset'))) : null;
  // the pause menu's settings edit the saved layout through their own store: pick it up when the game resumes
  const unResume = touch ? bus.on('app:pause', (e) => { if (!e.paused) { touch.store.reload(); touch.relayout(); } }) : () => {};
  const unKm = touch ? () => {} : bindKeyboardMouse(actions, canvas);
  const unGyro = bindGyro(actions, controls);
  const pad = bindGamepad(actions, controls);
  return {
    actions, controls, touch,
    poll: (dt) => { pad.poll(dt); if (actions.take('pause')) bus.emit('app:back', {}); },
    dispose() { unResume(); unKm(); unGyro(); pad.dispose(); touch?.dispose(); },
  };
}
