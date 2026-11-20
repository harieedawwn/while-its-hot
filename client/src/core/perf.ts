import { game } from './game-settings';
import { probe } from './perf-probe';
import { peekAudio } from '../audio/engine';

/** Rolling frame stats + a 30 s recorder for the on-phone perf report (phase 33). Pure sampling: no rendering, no DOM. */
export interface PerfSnap {
  fps: number; low1: number; frameP95: number; updMs: number; renMs: number; gpuMs: number | null;
  calls: number; tris: number; w: number; h: number;
  rtt: number | null; jitter: number | null; late: number; snaps: number;
  baseLat: number | null; outLat: number | null; longTasks: number; longMax: number;
}
const WINDOW = 600;
export const pct = (sorted: number[], p: number): number => (sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))] : 0);

export class PerfMeter {
  private ft = new Float32Array(WINDOW);
  private n = 0;
  private upd = 0; private ren = 0; calls = 0; tris = 0;
  longTasks = 0; longMax = 0;
  private lateBase = 0; private snapBase = 0;

  constructor() {
    try {
      new PerformanceObserver((l) => { for (const e of l.getEntries()) { this.longTasks++; this.longMax = Math.max(this.longMax, e.duration); } }).observe({ entryTypes: ['longtask'] });
    } catch { /* not supported */ }
  }
  /** Call once per presented frame with the raw frame interval and the last __stats. */
  frame(rawMs: number, st?: { updMs: number; renMs: number; calls: number; tris: number }): void {
    this.ft[this.n++ % WINDOW] = rawMs;
    if (st) { this.upd += (st.updMs - this.upd) * 0.1; this.ren += (st.renMs - this.ren) * 0.1; this.calls = st.calls; this.tris = st.tris; }
  }
  /** Sorted frame times of the window (ms). */
  frames(): number[] { return Array.from(this.ft.subarray(0, Math.min(this.n, WINDOW))).sort((a, b) => a - b); }
  resetNet(): void { const p = probe.net?.(); this.lateBase = p?.late ?? 0; this.snapBase = p?.snaps ?? 0; }
  read(): PerfSnap {
    const f = this.frames(), avg = f.length ? f.reduce((a, b) => a + b, 0) / f.length : 16.7;
    const worst = f.slice(Math.floor(f.length * 0.99)), low = worst.length ? worst.reduce((a, b) => a + b, 0) / worst.length : avg;
    const net = probe.net?.() ?? null, gfx = probe.gfx?.() ?? null, au = peekAudio()?.ctx;
    return {
      fps: 1000 / avg, low1: 1000 / low, frameP95: pct(f, 0.95), updMs: this.upd, renMs: this.ren, gpuMs: probe.gpuMs(),
      calls: this.calls, tris: this.tris, w: gfx?.width ?? 0, h: gfx?.height ?? 0,
      rtt: net ? net.rtt : null, jitter: net ? net.jitter : null, late: net ? net.late - this.lateBase : 0, snaps: net ? net.snaps - this.snapBase : 0,
      baseLat: au ? au.baseLatency : null, outLat: au && 'outputLatency' in au ? au.outputLatency : null,
      longTasks: this.longTasks, longMax: this.longMax,
    };
  }
}

/** Records one sample per 250 ms for `secs`, then builds the one-screen text report. */
export class PerfRecorder {
  private frames: number[] = [];
  private upd: number[] = []; private ren: number[] = []; private gpu: number[] = [];
  private heights = new Set<number>();
  private t0 = 0; private lastSample = 0;
  private lt0 = 0;
  active = false;
  constructor(private m: PerfMeter, readonly secs = 30) {}
  start(): void {
    this.frames = []; this.upd = []; this.ren = []; this.gpu = []; this.heights.clear();
    this.t0 = this.lastSample = performance.now(); this.active = true;
    this.lt0 = this.m.longTasks; this.m.longMax = 0; this.m.resetNet();
  }
  get left(): number { return this.active ? Math.max(0, this.secs - (performance.now() - this.t0) / 1000) : 0; }
  /** True once the recording is complete. */
  frame(rawMs: number): boolean {
    if (!this.active) return false;
    this.frames.push(rawMs);
    const now = performance.now();
    if (now - this.lastSample >= 250) {
      this.lastSample = now;
      const s = this.m.read();
      this.upd.push(s.updMs); this.ren.push(s.renMs); if (s.gpuMs !== null) this.gpu.push(s.gpuMs); if (s.h) this.heights.add(s.h);
    }
    if (now - this.t0 >= this.secs * 1000) { this.active = false; return true; }
    return false;
  }
  report(): string {
    const f = [...this.frames].sort((a, b) => a - b), n = f.length || 1, avg = f.reduce((a, b) => a + b, 0) / n;
    const worst = f.slice(Math.floor(f.length * 0.99)), low = worst.length ? worst.reduce((a, b) => a + b, 0) / worst.length : avg;
    const s = this.m.read(), g = probe.gfx?.();
    const mean = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : NaN);
    const mx = (a: number[]) => (a.length ? Math.max(...a) : NaN);
    const fx = (v: number, d = 1) => (Number.isFinite(v) ? v.toFixed(d) : 'n/a');
    const hs = [...this.heights].sort((a, b) => a - b);
    const over = (ms: number) => f.filter((x) => x > ms).length;
    const L = [
      `WIH perf ${this.secs}s ${new Date().toISOString().slice(0, 16)}Z`,
      `ua ${navigator.userAgent.replace(/^Mozilla\/5.0 /, '')}`,
      `gpu ${g?.gpu ?? '?'}`,
      `dpr ${devicePixelRatio} screen ${screen.width}x${screen.height} css ${innerWidth}x${innerHeight} cores ${navigator.hardwareConcurrency ?? '?'} mem ${(navigator as { deviceMemory?: number }).deviceMemory ?? '?'}`,
      `scene ${g?.scene ?? '?'} res ${game.resolution || 'native'} (now ${s.h}p, seen ${hs.join('/') || '?'}) quant ${game.quantize} snap ${game.snap ? 1 : 0} bright ${game.brightness} cap ${game.fpsCap}`,
      `fps ${fx(1000 / avg)} low1% ${fx(1000 / low)} min ${fx(1000 / (f[f.length - 1] || avg))} frames ${f.length}`,
      `frame ms p50 ${fx(pct(f, 0.5))} p95 ${fx(pct(f, 0.95))} p99 ${fx(pct(f, 0.99))} max ${fx(f[f.length - 1] ?? NaN)}  >33ms ${over(33.4)} >50ms ${over(50)}`,
      `cpu ms upd ${fx(mean(this.upd), 2)} (max ${fx(mx(this.upd), 2)}) ren ${fx(mean(this.ren), 2)} (max ${fx(mx(this.ren), 2)})  gpu ms ${this.gpu.length ? `${fx(mean(this.gpu))} (max ${fx(mx(this.gpu))})` : 'n/a'}`,
      `draw ${s.calls} tris ${s.tris}`,
      s.rtt === null ? 'net offline' : `net ping ${Math.round(s.rtt)} jitter ${fx(s.jitter ?? NaN)} late ${s.late}/${s.snaps} snaps`,
      `audio base ${fx((s.baseLat ?? NaN) * 1000)}ms out ${fx((s.outLat ?? NaN) * 1000)}ms  longtask>50ms ${s.longTasks - this.lt0} (max ${fx(s.longMax, 0)}ms)`,
    ];
    return L.join('\n');
  }
}
