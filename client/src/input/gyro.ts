import { FEEL } from '../core/feel';
import type { Actions } from './actions';
import type { Controls } from './controls-settings';

const G = FEEL.input.gyro;
const RAD = Math.PI / 180;

/**
 * Device rotation rate (deg/s, the devicemotion axes of a phone in portrait) → look radians, for a phone held
 * in landscape. `angle` is screen.orientation.angle: 90 = landscape-primary, 270 = landscape-secondary.
 * Turning the phone about its vertical (screen-up) axis is the device x axis (beta); tilting its top edge
 * toward or away from you is the device y axis (gamma). Yaw right and pitch up are positive.
 */
export function gyroLook(beta: number, gamma: number, angle: number, dt: number, sens: number, invertY: boolean): { dx: number; dy: number } {
  const s = angle === 270 || angle === -90 ? -1 : 1;
  const cap = (v: number) => Math.max(-G.maxRate, Math.min(G.maxRate, v));
  const k = G.gain * sens * RAD * dt;
  return { dx: -s * cap(beta) * k, dy: -s * cap(gamma) * k * (invertY ? -1 : 1) };
}

/** Android (Chrome/WebView): devicemotion needs no permission. Disabled unless the setting is on. */
export function bindGyro(actions: Actions, controls: Controls): () => void {
  let last = 0;
  const on = (e: DeviceMotionEvent) => {
    const r = e.rotationRate, now = performance.now();
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
    last = now;
    if (!controls.v.gyro || !r || dt <= 0) return;
    const angle = screen.orientation?.angle ?? 90;
    const l = gyroLook(r.beta ?? 0, r.gamma ?? 0, angle, dt, controls.v.gyroSens, controls.v.invertY);
    actions.look(l.dx, l.dy);
  };
  addEventListener('devicemotion', on);
  return () => removeEventListener('devicemotion', on);
}
