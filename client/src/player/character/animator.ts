import { FEEL } from '../../core/feel';
import { getClip } from './clips';
import { addScaled, blend, type Compiled, sample, UPPER_MASK, FULL_MASK } from './pose';
import { newPose, type Pose } from './skeleton';

const A = FEEL.anim;
const smooth = (x: number) => { const t = x < 0 ? 0 : x > 1 ? 1 : x; return t * t * (3 - 2 * t); };
const step01 = (v: number, [a, b]: readonly [number, number]) => smooth((v - a) / (b - a));

/** What the animator needs from the body each frame. Velocity is world-space; yaw is the facing (radians). */
export interface AnimInput {
  vx: number; vy: number; vz: number; yaw: number;
  grounded: boolean; sliding: boolean; dashing: boolean; slamming: boolean; clinging: boolean;
}
export const IDLE_INPUT: AnimInput = { vx: 0, vy: 0, vz: 0, yaw: 0, grounded: true, sliding: false, dashing: false, slamming: false, clinging: false };

export type BaseState = 'ground' | 'jump' | 'fall' | 'slide' | 'dash' | 'slam' | 'cling';
export interface PlayOpts { fadeIn?: number; fadeOut?: number; speed?: number; loop?: boolean; hold?: boolean; }

interface Action { c: Compiled; t: number; speed: number; loop: boolean; hold: boolean; fadeIn: number; fadeOut: number; w: number; done: boolean; }

/**
 * Blends clips into one pose (LOOK §4): a base layer chosen by body state (ground = idle ↔ 8-direction run
 * blend ↔ sprint lean; air/slide/dash/slam/cling = their clip, crossfaded), and one action layer on top
 * (forge, heat-hold, block, parry, hit-react, stagger, death, attacks) that may cover the whole body or
 * only the upper half. All blending is per-bone on flat arrays: no allocation per frame.
 */
export class Animator {
  readonly pose: Pose = newPose();
  state: BaseState = 'ground';
  /** Run cycle phase 0..1 (advances with distance travelled). */
  phase = 0;
  private idleT = 0;
  private stateT = 0;
  private base = newPose();
  private from = newPose();
  private fadeT = 1;
  private fadeD = 0.1;
  private tmp = newPose();
  private tmp2 = newPose();
  private loco = newPose();
  private act: Action | null = null;
  private actPose = newPose();
  private actPrev = newPose();
  private swapT = 1;
  private swapD = 0.1;
  private hadAction = false;

  /** Start (or replace) the action layer. Unknown ids are ignored; returns whether it started. */
  play(id: string, o: PlayOpts = {}): boolean {
    const c = getClip(id); if (!c) return false;
    if (this.act && this.act.w > 0.02) { this.actPrev.set(this.actPose); this.swapT = 0; this.swapD = o.fadeIn ?? A.actionIn; this.hadAction = true; } else { this.hadAction = false; }
    this.act = { c, t: 0, speed: o.speed ?? 1, loop: o.loop ?? c.loop, hold: o.hold ?? false, fadeIn: o.fadeIn ?? A.actionIn, fadeOut: o.fadeOut ?? A.actionOut, w: this.hadAction ? this.act!.w : 0, done: false };
    return true;
  }
  /** Fade the action layer out (or drop it instantly with fade 0). */
  stop(fadeOut: number = A.actionOut): void { if (this.act) { this.act.loop = false; this.act.hold = false; this.act.done = true; this.act.fadeOut = fadeOut; if (fadeOut <= 0) this.act = null; } }
  get action(): string | null { return this.act?.c.id ?? null; }

  /** The land clip, shorter and lighter for soft landings. */
  onLand(speed: number): void {
    if (speed < A.landMin) return;
    const k = Math.min(1, (speed - A.landMin) / 22);
    this.play('land', { speed: 1.5 - 0.5 * k, fadeIn: 0.03, fadeOut: 0.12 });
  }

  update(dt: number, inp: AnimInput): void {
    const sp = Math.hypot(inp.vx, inp.vz);
    this.setState(this.pick(inp));
    this.stateT += dt;

    // base layer
    const target = this.tmp;
    this.sampleBase(target, dt, inp, sp);
    if (this.fadeT < 1) { this.fadeT += dt; blend(this.base, this.from, target, smooth(this.fadeT / this.fadeD)); } else this.base.set(target);

    // action layer
    this.pose.set(this.base);
    const a = this.act;
    if (a) {
      a.t += dt * a.speed;
      const u = a.t / a.c.len;
      if (!a.loop && u >= 1 && !a.hold) a.done = true;
      const target = a.done ? 0 : 1, rate = a.done ? a.fadeOut : a.fadeIn;
      a.w = rate <= 0 ? target : a.w + Math.sign(target - a.w) * Math.min(Math.abs(target - a.w), dt / rate);
      if (a.done && a.w <= 0) { this.act = null; this.hadAction = false; }
      else {
        sample(a.c, u, this.tmp2);
        if (a.c.additive) addScaled(this.pose, this.tmp2, a.w);
        else {
          if (this.swapT < 1) { this.swapT += dt; blend(this.tmp2, this.actPrev, this.tmp2, smooth(this.swapT / this.swapD)); }
          this.actPose.set(this.tmp2);
          blend(this.pose, this.base, this.tmp2, a.w, a.c.upper ? UPPER_MASK : FULL_MASK);
        }
      }
    }
  }

  private pick(i: AnimInput): BaseState {
    if (i.slamming) return 'slam';
    if (i.clinging) return 'cling';
    if (i.sliding) return 'slide';
    if (i.dashing) return 'dash';
    if (!i.grounded) return i.vy > A.jumpVy ? 'jump' : 'fall';
    return 'ground';
  }

  private setState(s: BaseState): void {
    if (s === this.state) return;
    this.from.set(this.base);
    this.fadeT = 0; this.fadeD = A.fade[s];
    this.state = s; this.stateT = 0;
  }

  private sampleBase(out: Pose, dt: number, i: AnimInput, speed: number): void {
    if (this.state !== 'ground') {
      const c = getClip(this.state)!;
      sample(c, this.stateT / c.len, out);
      return;
    }
    // idle
    this.idleT += dt;
    const idle = getClip('idle')!;
    sample(idle, this.idleT / idle.len, out);
    const lm = step01(speed, A.locoBlend);
    if (lm <= 0) return;
    // 8-direction run: forward/back/strafe clips weighted by the move direction in the body's frame
    const s = Math.sin(i.yaw), c = Math.cos(i.yaw);
    const f = -(i.vx * s + i.vz * c) / (speed || 1), r = (i.vx * c - i.vz * s) / (speed || 1);
    const wF = Math.max(f, 0), wB = Math.max(-f, 0), wR = Math.max(r, 0), wL = Math.max(-r, 0);
    const tot = wF + wB + wR + wL || 1;
    this.phase = (this.phase + (speed * dt) / A.cycleLen) % 1;
    const loco = this.loco, t = this.tmp2;
    loco.fill(0);
    for (const [id, w] of [['run_f', wF], ['run_b', wB], ['strafe_r', wR], ['strafe_l', wL]] as const) {
      if (w <= 0) continue;
      sample(getClip(id)!, this.phase, t);
      addScaled(loco, t, w / tot);
    }
    blend(out, out, loco, lm);
    const sw = step01(speed, A.sprintBlend) * lm;
    if (sw > 0) { sample(getClip('sprint_lean')!, 0, t); addScaled(out, t, sw); }
  }

  /** Dev/preview: pose = one clip at time t (seconds), no state machine. */
  preview(id: string, t: number): boolean {
    const c = getClip(id); if (!c) return false;
    sample(c, t / c.len, this.pose);
    return true;
  }
}
