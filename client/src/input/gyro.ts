import type { Actions } from './actions';
import type { Controls } from './controls-settings';
import { OneEuro, gyroRates, gyroStep, type Vec3 } from './gyro-math';

/**
 * Android (Chrome/WebView): devicemotion needs no permission and fires at sensor rate. Each sample is mapped,
 * filtered and integrated straight into the action layer's look accumulator, which the render loop drains once
 * per frame. Disabled unless the setting is on.
 */
export function bindGyro(actions: Actions, controls: Controls): () => void {
  let last = 0;
  const grav: Vec3 = { x: 0, y: 0, z: 0 };
  let haveGrav = false;
  const fy = new OneEuro(), fp = new OneEuro();
  const on = (e: DeviceMotionEvent) => {
    const now = performance.now();
    const iv = e.interval; // ms in current browsers
    const dt = iv > 0 && iv <= 100 ? iv / 1000 : last ? Math.min(0.05, (now - last) / 1000) : 0;
    last = now;
    const g = e.accelerationIncludingGravity;
    if (g && g.x !== null && g.y !== null && g.z !== null) {
      // slow low-pass: gravity direction, not shake
      const k = haveGrav ? Math.min(1, dt * 8) : 1;
      grav.x += k * (g.x - grav.x); grav.y += k * (g.y - grav.y); grav.z += k * (g.z - grav.z); haveGrav = true;
    }
    const r = e.rotationRate;
    if (!controls.v.gyro) { fy.reset(); fp.reset(); return; }
    if (!r || dt <= 0) return;
    const angle = screen.orientation?.angle ?? 90;
    const q = gyroRates({ alpha: r.alpha ?? 0, beta: r.beta ?? 0, gamma: r.gamma ?? 0 }, haveGrav ? grav : null, angle);
    const l = gyroStep(fy.filter(q.yaw, dt), fp.filter(q.pitch, dt), dt, controls.v.gyroSens, controls.v.invertY);
    actions.look(l.dx, l.dy);
  };
  addEventListener('devicemotion', on);
  return () => removeEventListener('devicemotion', on);
}
