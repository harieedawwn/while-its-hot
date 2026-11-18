/** Damped spring toward a target, integrated in fixed 1/240 s substeps so any frame rate feels the same. */
export class Spring {
  x = 0;
  v = 0;
  private acc = 0;
  constructor(public k: number, public c: number) {}
  step(target: number, dt: number): number {
    const h = 1 / 240;
    this.acc += dt;
    while (this.acc >= h) {
      this.v += (-this.k * (this.x - target) - this.c * this.v) * h;
      this.x += this.v * h;
      this.acc -= h;
    }
    return this.x;
  }
  /** Velocity impulse (m/s or rad/s). */
  kick(dv: number): void { this.v += dv; }
  reset(x = 0): void { this.x = x; this.v = 0; this.acc = 0; }
}

/** Exponential approach: covers ~95% of the gap in 3/rate seconds. */
export function approach(cur: number, target: number, rate: number, dt: number): number {
  return target + (cur - target) * Math.exp(-rate * dt);
}

/** Peak displacement of a resting spring kicked with unit velocity (turns "dip N meters" into an impulse). */
export function unitPeak(k: number, c: number): number {
  const s = new Spring(k, c);
  s.kick(1);
  let peak = 0;
  for (let i = 0; i < 240; i++) peak = Math.max(peak, s.step(0, 1 / 240));
  return peak;
}
