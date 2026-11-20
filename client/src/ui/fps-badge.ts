import { game, onGameSettings } from '../core/game-settings';
import { PerfMeter, PerfRecorder } from '../core/perf';
import { STR } from './strings.vi';

/**
 * Hiện FPS: a tiny stamped counter, bottom-right under the safe area. With "FPS chi tiết" it grows into the
 * perf block (fps, 1% low, ms split, GPU, draw, net, audio) plus "Ghi 30 s": records 30 s, shows the text report
 * and copies it (the copy button also works after the fact, since a clipboard write needs a tap).
 */
const BOX = 'position:fixed;right:calc(var(--sr,0px) + 10px);bottom:calc(var(--sb,0px) + 6px);z-index:50;pointer-events:none;'
  + 'font:800 14px/1.3 var(--f-display);color:var(--bone);background:var(--soot);padding:1px 6px;letter-spacing:.04em;text-align:right';
const BTN = 'pointer-events:auto;margin:4px 0 2px 6px;padding:6px 12px;min-height:36px;font:800 14px var(--f-display);letter-spacing:.06em;color:var(--soot);background:var(--bone);border:0;border-radius:0';

export const perfMeter = new PerfMeter();

export class FpsBadge {
  private node: HTMLDivElement | null = null;
  private text!: HTMLDivElement;
  private btn!: HTMLButtonElement;
  private rec = new PerfRecorder(perfMeter);
  private panel: HTMLDivElement | null = null;
  private acc = 0;
  private n = 0;
  private report = '';
  constructor() { this.sync(); onGameSettings(() => this.sync()); }

  private sync(): void {
    if (game.showFps && !this.node) {
      const d = document.createElement('div');
      d.style.cssText = BOX;
      this.text = document.createElement('div'); this.text.style.whiteSpace = 'pre';
      this.btn = document.createElement('button'); this.btn.style.cssText = BTN; this.btn.textContent = STR.hud.perfRec;
      this.btn.onclick = () => this.startRec();
      d.append(this.text, this.btn);
      document.body.appendChild(d);
      this.node = d;
    } else if (!game.showFps && this.node) { this.node.remove(); this.node = null; this.panel?.remove(); this.panel = null; this.rec.active = false; }
    if (this.node) {
      this.btn.style.display = game.fpsDetail ? '' : 'none';
      this.node.style.font = game.fpsDetail ? '700 12px/1.3 ui-monospace,monospace' : '800 14px/1.3 var(--f-display)';
      // the detail block sits top-left, clear of the touch buttons; the plain counter stays bottom-right
      Object.assign(this.node.style, game.fpsDetail ? { left: 'calc(var(--sl,0px) + 8px)', right: 'auto', top: 'calc(var(--st,0px) + 6px)', bottom: 'auto', textAlign: 'left' }
        : { left: 'auto', right: 'calc(var(--sr,0px) + 10px)', top: 'auto', bottom: 'calc(var(--sb,0px) + 6px)', textAlign: 'right' });
    }
  }

  private startRec(): void { this.panel?.remove(); this.panel = null; this.rec.start(); this.btn.disabled = true; }

  private finish(): void {
    this.report = this.rec.report();
    console.log(this.report);
    this.btn.disabled = false; this.btn.textContent = STR.hud.perfRec;
    const p = document.createElement('div');
    p.style.cssText = 'position:fixed;left:calc(var(--sl,0px) + 8px);right:calc(var(--sr,0px) + 8px);top:calc(var(--st,0px) + 6px);bottom:calc(var(--sb,0px) + 6px);z-index:60;'
      + 'background:var(--soot);color:var(--bone);padding:8px 10px;display:flex;flex-direction:column;gap:6px;overflow:hidden';
    const pre = document.createElement('pre');
    pre.style.cssText = 'margin:0;flex:1;overflow:auto;font:600 10.5px/1.35 ui-monospace,monospace;white-space:pre-wrap;word-break:break-all;user-select:text;pointer-events:auto';
    pre.textContent = this.report;
    const row = document.createElement('div'); row.style.cssText = 'display:flex;gap:8px;align-items:center';
    const note = document.createElement('span'); note.style.cssText = 'flex:1;font:700 13px var(--f-text);color:var(--bone-dim)';
    const copy = document.createElement('button'); copy.style.cssText = BTN; copy.textContent = STR.hud.perfCopy;
    const close = document.createElement('button'); close.style.cssText = BTN; close.textContent = STR.hud.perfClose;
    copy.onclick = () => { void copyText(this.report).then((ok) => { note.textContent = ok ? STR.hud.perfCopied : STR.hud.perfCopyFail; }); };
    close.onclick = () => { p.remove(); this.panel = null; };
    row.append(note, copy, close); p.append(pre, row); document.body.appendChild(p); this.panel = p;
    void copyText(this.report).then((ok) => { note.textContent = ok ? STR.hud.perfCopied : STR.hud.perfTap; });
  }

  tick(rawMs: number, st?: { updMs: number; renMs: number; calls: number; tris: number }): void {
    perfMeter.frame(rawMs, st);
    if (!this.node) return;
    if (this.rec.frame(rawMs)) this.finish();
    if (this.rec.active) this.btn.textContent = `${STR.hud.perfRecording} ${Math.ceil(this.rec.left)}`;
    this.acc += rawMs; this.n++;
    if (this.acc >= 500) {
      const fps = Math.round((this.n * 1000) / this.acc); this.acc = 0; this.n = 0;
      if (!game.fpsDetail) { this.text.textContent = `${STR.hud.fps} ${fps}`; return; }
      const s = perfMeter.read(), f = (v: number | null, d = 1) => (v === null ? '-' : v.toFixed(d));
      this.text.textContent = [
        `${STR.hud.fps} ${fps}  1% ${s.low1.toFixed(0)}  p95 ${s.frameP95.toFixed(0)}ms`,
        `upd ${s.updMs.toFixed(1)}  ren ${s.renMs.toFixed(1)}  gpu ${f(s.gpuMs)}`,
        `${s.w}x${s.h}  draw ${s.calls}  ${(s.tris / 1000).toFixed(0)}k tri`,
        s.rtt === null ? '' : `ping ${Math.round(s.rtt)}  jit ${f(s.jitter)}  late ${s.late}/${s.snaps}`,
        `audio ${f(s.baseLat === null ? null : s.baseLat * 1000)}/${f(s.outLat === null ? null : s.outLat * 1000)}ms  lt ${s.longTasks}`,
      ].filter(Boolean).join('\n');
    }
  }
}

/** Clipboard write with the old execCommand path as fallback (WebViews without async clipboard). */
async function copyText(t: string): Promise<boolean> {
  try { await navigator.clipboard.writeText(t); return true; } catch { /* fall through */ }
  try {
    const a = document.createElement('textarea'); a.value = t; a.style.cssText = 'position:fixed;opacity:0;left:0;top:0';
    document.body.appendChild(a); a.select(); const ok = document.execCommand('copy'); a.remove(); return ok;
  } catch { return false; }
}
