import { BALANCE, type NetState } from '@wih/shared';

/**
 * Snapshot interpolation for remote players (TECH §4). States are kept by server match time; a remote is
 * drawn at `renderTime = now − delay`. Past the newest state it extrapolates on velocity for at most
 * extrapMs, then holds. The delay adapts: 2 × jitter + base, clamped, eased so time never jumps.
 */
const I = BALANCE.net.interp;
export type SampleMode = 'lerp' | 'extrap' | 'hold' | 'none';

interface Entry { t: number; s: NetState }
const lerpAngle = (a: number, b: number, k: number) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * k;

export class InterpBuffer {
  private buf: Entry[] = [];

  get size(): number { return this.buf.length; }
  get newest(): number { return this.buf.length ? this.buf[this.buf.length - 1].t : -1e9; }
  clear(): void { this.buf.length = 0; }

  push(t: number, s: NetState): void {
    if (t <= this.newest) return; // late or duplicate
    this.buf.push({ t, s });
    while (this.buf.length > 2 && (this.buf.length > 40 || this.buf[1].t < t - 1000)) this.buf.shift();
  }

  /** Fill `out` with the state at render time rt (ms). */
  sample(rt: number, out: NetState): SampleMode {
    const b = this.buf, n = b.length;
    if (!n) return 'none';
    if (rt <= b[0].t) { Object.assign(out, b[0].s); return 'lerp'; }
    const last = b[n - 1];
    if (rt >= last.t) {
      const ex = Math.min(rt - last.t, I.extrapMs) / 1000, s = last.s;
      Object.assign(out, s);
      out.x = s.x + s.vx * ex; out.z = s.z + s.vz * ex; out.y = s.y + Math.max(0, s.vy) * ex;
      out.animT = s.animT + ex;
      return rt - last.t > I.extrapMs ? 'hold' : 'extrap';
    }
    let i = n - 2;
    while (i > 0 && b[i].t > rt) i--;
    const A = b[i], B = b[i + 1], k = (rt - A.t) / Math.max(1, B.t - A.t);
    Object.assign(out, A.s);
    out.x = A.s.x + (B.s.x - A.s.x) * k; out.y = A.s.y + (B.s.y - A.s.y) * k; out.z = A.s.z + (B.s.z - A.s.z) * k;
    out.vx = A.s.vx + (B.s.vx - A.s.vx) * k; out.vy = A.s.vy + (B.s.vy - A.s.vy) * k; out.vz = A.s.vz + (B.s.vz - A.s.vz) * k;
    out.yaw = lerpAngle(A.s.yaw, B.s.yaw, k); out.pitch = A.s.pitch + (B.s.pitch - A.s.pitch) * k;
    // discrete state: switch at the newer sample's time; anim time runs on from the older one
    if (k >= 1 || B.s.anim === A.s.anim) out.animT = A.s.animT + (rt - A.t) / 1000;
    return 'lerp';
  }
}

/** Snapshot arrival jitter → the interpolation delay. */
export class JitterMeter {
  jitter = 0;
  delay: number = I.startMs;
  private lastArr = 0; private lastT = 0; private n = 0;

  add(serverT: number, arrival: number): void {
    if (this.n++ > 0) {
      const d = Math.abs((arrival - this.lastArr) - (serverT - this.lastT));
      this.jitter += (Math.min(d, 400) - this.jitter) * I.jitterK;
    }
    this.lastArr = arrival; this.lastT = serverT;
  }
  get target(): number { return Math.max(I.minMs, Math.min(I.maxMs, 2 * this.jitter + I.baseMs)); }
  /** Ease the delay toward the target (call per frame). */
  update(dt: number): number { this.delay += (this.target - this.delay) * Math.min(1, dt * 0.8); return this.delay; }
}
