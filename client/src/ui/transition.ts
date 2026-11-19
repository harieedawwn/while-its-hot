import { bus } from '../core/events';
import { clock } from '../core/clock';
import { FEEL } from '../core/feel';
import type { Pipeline } from '../render/pipeline';
import { el } from './kit/dom';
import { TransitionGL, type WipeUniforms } from './transition-gl';
import { uiSettings } from './ui-settings';

/**
 * Transitions (LOOK §9), implemented once: a fullscreen low-res WebGL overlay above the DOM.
 * `run(kind, origin, swap)` covers → awaits `swap()` (change DOM / load a scene) → uncovers.
 *  - quench: ordered-dither dissolve spreading from `origin` (CSS px), edge stepping down the heat ramp.
 *  - stamp: one bone frame, then the old frame (snapshot) splits along a jagged crack and shears apart.
 * Reduce motion replaces both with a 0.2 s dithered fade. `roundEnd` / `death` drive the post grade.
 */
export type WipeKind = 'quench' | 'stamp';
const W = FEEL.ui.wipe, S = FEEL.ui.stamp;
const SOOT = '#0d0b0a', BONE = '#e9e1d3';
const frame = () => new Promise<number>((r) => requestAnimationFrame(r));
const easeIn = (t: number) => t * t;
const easeOut = (t: number) => 1 - (1 - t) ** 3;

export class Transition {
  private gl: TransitionGL | null = null;
  private u: WipeUniforms = { mode: 0, t: 0, origin: [0, 0], maxF: 1, edge: W.edge, noise: W.noise, seed: 1, open: S.open, rot: S.rot, jag: S.jag, teeth: S.teeth, crackX: 0.5 };
  private snapWait: ((src: HTMLCanvasElement) => void) | null = null;
  private busy = false;
  private counter: HTMLDivElement | null = null;

  constructor(private host: HTMLElement) {
    try {
      this.gl = new TransitionGL(SOOT, BONE);
      const c = this.gl.canvas;
      c.className = 'k-wipe';
      Object.assign(c.style, { position: 'fixed', inset: '0', width: '100%', height: '100%', imageRendering: 'pixelated', zIndex: '30', display: 'none', touchAction: 'none' });
      host.appendChild(c);
    } catch { this.gl = null; /* no second context: transitions become instant cuts */ }
  }

  get active(): boolean { return this.busy; }

  /** Main loop hook: right after the game canvas rendered (its buffer is still valid in this task). */
  afterRender(src: HTMLCanvasElement): void { if (this.snapWait) { const f = this.snapWait; this.snapWait = null; f(src); } }

  async run(kind: WipeKind, origin: [number, number] | null, swap: () => void | Promise<void>): Promise<void> {
    if (this.busy) return;
    this.busy = true;
    try {
      if (!this.gl) { await swap(); return; }
      if (uiSettings.reduceMotion) await this.fade(swap);
      else if (kind === 'quench') await this.quench(origin, swap);
      else await this.stamp(origin, swap);
    } finally { this.hide(); this.busy = false; }
  }

  /** Dev/shots: draw one frozen phase. phase 0..1 = cover, 1..2 = uncover (quench) or shear (stamp). */
  pose(kind: WipeKind | 'fade', phase: number, origin: [number, number] | null, snap?: HTMLCanvasElement): void {
    if (!this.gl) return;
    this.show(origin);
    if (kind === 'fade') { this.u.mode = 5; this.u.t = phase < 1 ? phase : 2 - phase; }
    else if (kind === 'quench') { this.u.mode = phase < 1 ? 1 : 2; this.u.t = phase < 1 ? phase : phase - 1; }
    else {
      if (snap) this.gl.snapshot(snap);
      this.u.mode = phase <= 0 ? 4 : 3; this.u.t = Math.max(0, phase - 1);
    }
    this.gl.draw(this.u);
  }

  private show(origin: [number, number] | null): void {
    const gl = this.gl!, c = gl.canvas;
    const cw = Math.max(1, innerWidth), ch = Math.max(1, innerHeight);
    const H = W.height, Wd = Math.round((H * cw) / ch);
    gl.size(Wd, H);
    const o: [number, number] = origin ? [(origin[0] / cw) * Wd, (1 - origin[1] / ch) * H] : [Wd / 2, H / 2];
    this.u.origin = o;
    this.u.crackX = 0.5 + (o[0] / Wd - 0.5) * 0.3; // the crack runs near the middle, leaning toward the tap
    this.u.maxF = Math.hypot(Math.max(o[0], Wd - o[0]), Math.max(o[1], H - o[1])) + W.noise * 1.2 + W.edge * 6;
    this.u.seed = (this.u.seed * 1.618 + 0.37) % 9.7;
    c.style.display = 'block';
  }
  private hide(): void { if (this.gl) { this.gl.canvas.style.display = 'none'; this.u.mode = 0; } }

  private async animate(mode: number, secs: number, ease: (t: number) => number): Promise<void> {
    const t0 = performance.now();
    for (;;) {
      const k = Math.min(1, (performance.now() - t0) / 1000 / secs);
      this.u.mode = mode; this.u.t = ease(k);
      this.gl!.draw(this.u);
      if (k >= 1) return;
      await frame();
    }
  }

  private async quench(origin: [number, number] | null, swap: () => void | Promise<void>): Promise<void> {
    bus.emit('ui:wipe', { kind: 'quench' });
    this.show(origin);
    await this.animate(1, W.cover, easeIn);
    await swap();
    await frame();
    await this.animate(2, W.uncover, (t) => t);
  }

  private async stamp(origin: [number, number] | null, swap: () => void | Promise<void>): Promise<void> {
    const src = await new Promise<HTMLCanvasElement>((r) => { this.snapWait = r; });
    this.show(origin);
    this.gl!.snapshot(src);
    bus.emit('ui:wipe', { kind: 'stamp' });
    this.u.mode = 4; this.gl!.draw(this.u);
    await frame();
    if (S.flash > 1 / 60) await new Promise((r) => setTimeout(r, (S.flash - 1 / 60) * 1000));
    this.u.mode = 3; this.u.t = 0; this.gl!.draw(this.u);
    await swap();
    await frame(); await frame();
    await this.animate(3, S.shear, easeOut);
  }

  private async fade(swap: () => void | Promise<void>): Promise<void> {
    bus.emit('ui:wipe', { kind: 'fade' });
    this.show(null);
    await this.animate(5, FEEL.ui.fade / 2, (t) => t);
    await swap();
    await frame();
    await this.animate(5, FEEL.ui.fade / 2, (t) => 1 - t);
  }

  /** Round end: time scale → 0.25, world desaturates except heat colors and oxide, hold, then quench to `swap`. */
  async roundEnd(pipeline: Pipeline, swap: () => void | Promise<void>): Promise<void> {
    const R = FEEL.ui.roundEnd, t0 = performance.now();
    pipeline.setGrade({ keepHot: true });
    for (;;) {
      const k = Math.min(1, (performance.now() - t0) / 1000 / R.ramp);
      clock.timeScale = 1 + (R.scale - 1) * k;
      pipeline.setGrade({ desat: R.desat * k });
      if (k >= 1) break;
      await frame();
    }
    await new Promise((r) => setTimeout(r, R.hold * 1000));
    await this.run('quench', null, async () => {
      clock.timeScale = 1;
      pipeline.setGrade({ desat: 0, keepHot: false });
      await swap();
    });
  }

  /** Death look: k 0..1 (desaturate + edge darkening in dithered steps); `secs` shows the stamped respawn numeral. */
  death(pipeline: Pipeline, k: number, secs: number | null): void {
    const D = FEEL.ui.death;
    pipeline.setGrade({ desat: D.desat * k, edge: D.edge * k, steps: D.steps });
    if (secs === null || k <= 0) { this.counter?.remove(); this.counter = null; return; }
    if (!this.counter) { this.counter = el('div', 'k-death k-display'); this.host.appendChild(this.counter); }
    const n = String(Math.max(1, Math.ceil(secs)));
    if (this.counter.textContent !== n) this.counter.textContent = n;
  }
}

let shared: Transition | null = null;
/** The one overlay for the app (created on first use inside #app's parent). */
export function getTransition(): Transition {
  return (shared ??= new Transition(document.body));
}
