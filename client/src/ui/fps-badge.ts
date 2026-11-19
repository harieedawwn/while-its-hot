import { game, onGameSettings } from '../core/game-settings';
import { STR } from './strings.vi';

/** Hiện FPS: a tiny stamped counter, top-right under the safe area. Only exists while the setting is on. */
export class FpsBadge {
  private node: HTMLDivElement | null = null;
  private acc = 0;
  private n = 0;
  constructor() { this.sync(); onGameSettings(() => this.sync()); }
  private sync(): void {
    if (game.showFps && !this.node) {
      const d = document.createElement('div');
      d.style.cssText = 'position:fixed;right:calc(var(--sr,0px) + 10px);bottom:calc(var(--sb,0px) + 6px);z-index:50;pointer-events:none;'
        + 'font:800 14px/1.3 var(--f-display);color:var(--bone);background:var(--soot);padding:1px 6px;letter-spacing:.04em';
      document.body.appendChild(d);
      this.node = d;
    } else if (!game.showFps && this.node) { this.node.remove(); this.node = null; }
  }
  tick(rawMs: number): void {
    if (!this.node) return;
    this.acc += rawMs; this.n++;
    if (this.acc >= 500) { this.node.textContent = `${STR.hud.fps} ${Math.round((this.n * 1000) / this.acc)}`; this.acc = 0; this.n = 0; }
  }
}
