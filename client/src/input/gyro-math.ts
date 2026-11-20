import { FEEL } from '../core/feel';

const G = FEEL.input.gyro;
const RAD = Math.PI / 180;

/** devicemotion.rotationRate (deg/s, device axes of a portrait phone: beta = x right, gamma = y top, alpha = z out of the screen). */
export interface Rate { alpha: number; beta: number; gamma: number }
export interface Vec3 { x: number; y: number; z: number }

/**
 * Rotation rate -> look rates in rad/s for a phone held in landscape. `angle` = screen.orientation.angle
 * (90 = landscape-primary, 270 = landscape-secondary). `acc` = accelerationIncludingGravity (it points UP at rest).
 * Yaw is the rotation about world up (so it works upright, tilted or flat); pitch is the rotation about the
 * screen's horizontal axis. Yaw right and pitch up are positive. Pure.
 */
export function gyroRates(r: Rate, acc: Vec3 | null, angle: number): { yaw: number; pitch: number } {
  const s = angle === 270 || angle === -90 ? -1 : 1;
  // device frame -> screen frame: screen right = -s*y_dev, screen up = +s*x_dev, screen out = z_dev
  const wx = -s * r.gamma * RAD, wy = s * r.beta * RAD, wz = r.alpha * RAD;
  let ux = 0, uy = 1, uz = 0;
  if (acc) {
    const ax = -s * acc.y, ay = s * acc.x, az = acc.z, m = Math.hypot(ax, ay, az);
    if (m > 2) { ux = ax / m; uy = ay / m; uz = az / m; }
  }
  // rotating counter-clockwise about up turns the view left, so yaw-right is the negative
  return { yaw: -(wx * ux + wy * uy + wz * uz), pitch: wx };
}

/** One-Euro filter (Casiez 2012): smooth when slow, nearly raw when fast. */
export class OneEuro {
  private x = 0; private dx = 0; private init = false;
  constructor(private minCut = G.oneEuro.minCutoff, private beta = G.oneEuro.beta, private dCut = G.oneEuro.dCutoff) {}
  private static a(cut: number, dt: number): number { const t = 1 / (2 * Math.PI * cut); return 1 / (1 + t / dt); }
  reset(): void { this.init = false; }
  filter(v: number, dt: number): number {
    if (!this.init || dt <= 0) { this.init = true; this.x = v; this.dx = 0; return v; }
    const d = (v - this.x) / dt;
    this.dx += OneEuro.a(this.dCut, dt) * (d - this.dx);
    const cut = this.minCut + this.beta * Math.abs(this.dx);
    this.x += OneEuro.a(cut, dt) * (v - this.x);
    return this.x;
  }
}

/** Tiny dead zone with a soft edge, rad/s. */
export function deadband(v: number, dz: number): number {
  const a = Math.abs(v);
  return a <= dz ? 0 : Math.sign(v) * (a - dz);
}

/** Rates (rad/s) -> look radians for one sensor sample of length dt. */
export function gyroStep(yaw: number, pitch: number, dt: number, sens: number, invertY: boolean): { dx: number; dy: number } {
  const cap = G.maxRate * RAD, k = G.gain * sens * dt;
  const c = (v: number) => Math.max(-cap, Math.min(cap, deadband(v, G.deadzone * RAD)));
  return { dx: c(yaw) * k, dy: c(pitch) * k * (invertY ? -1 : 1) };
}
