import type { LinkSim } from './link-sim';
import type { NetMatch } from './net-match';

/**
 * Dev-only net overlay (phase 17): ping, snapshot jitter, interpolation buffer, snapshot rate, accepted
 * and rejected hit claims (+ the last reason), the simulated link and how remotes are being sampled.
 * Developer text, not player-facing: it never ships visible (`?netdebug=1`, or dev builds).
 */
export class NetDebug {
  private node = document.createElement('div');
  private at = performance.now();
  private snaps = 0;
  private rate = 0;

  constructor(host: HTMLElement, private m: NetMatch, private sim: LinkSim) {
    this.node.style.cssText = 'position:absolute;left:calc(var(--sl,0px) + 8px);top:calc(var(--st,0px) + 6px);z-index:40;pointer-events:none;'
      + 'font:600 11px/1.35 ui-monospace,monospace;color:#e8dcc8;background:rgba(14,11,9,.78);padding:3px 6px;white-space:pre';
    host.appendChild(this.node);
  }

  update(): void {
    const now = performance.now(), el = (now - this.at) / 1000;
    if (el < 0.5) return;
    const m = this.m, r = m.remotes, n = r.snaps - this.snaps;
    this.rate = n / el; this.snaps = r.snaps; this.at = now;
    const s = this.sim, simTxt = s.lag || s.jitter || s.loss ? `sim ${s.lag}±${s.jitter}ms loss ${s.loss}` : 'sim off';
    this.node.textContent = [
      `ping ${Math.round(m.rtt)}  jit ${r.jitter.jitter.toFixed(1)}  buf ${Math.round(r.jitter.delay)}  snap ${this.rate.toFixed(0)}/s`,
      `hit ok ${m.combat.accepted}  rej ${m.combat.rejected}${m.combat.lastReject ? ' (' + m.combat.lastReject + ')' : ''}  forge ${m.forge.strikes}`,
      `${simTxt}  link ${m.link}  id ${m.me}  ${r.modes}`,
    ].join('\n');
  }

  dispose(): void { this.node.remove(); }
}
