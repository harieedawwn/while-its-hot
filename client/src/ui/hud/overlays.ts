import type { Family } from '@wih/shared';
import { el, sfx } from '../kit/dom';
import { segmented, stampedButton } from '../kit/controls';
import { sharedControls } from '../../input/controls-settings';
import { STR } from '../strings.vi';
import { silhouette } from './silhouettes';

/** One carried blade on the result screen: level after the round's loss, and what was lost. */
export interface ScoreBlade { family: Family | null; level: number; lost: number }
export interface ScoreRow {
  name: string; color: string; family: Family | null; level: number; kills: number; deaths: number; me?: boolean;
  /** Result screen only: every carried blade and the armor with what the round took (ROUND3 §3). */
  blades?: ScoreBlade[]; armor?: { level: number; lost: number };
}
const lost = (n: number): string => (n > 0 ? `<span class="loss">−${n}</span>` : '');

/** Scoreboard overlay: a steel plate with one ledger row per player, sorted by kills. Hidden until `show`. */
export class Scoreboard {
  private root: HTMLDivElement | null = null;
  constructor(private parent: HTMLElement) {}
  show(rows: readonly ScoreRow[]): void {
    this.hide();
    const r = el('div', 'h-score k-shutter k-plate');
    r.style.border = 'none';
    r.appendChild(el('div', 'k-head')).appendChild(el('div', 'k-title', STR.score.title));
    const t = el('table', 'h-tab');
    const gear = rows.some((r) => r.armor);
    t.innerHTML = `<thead><tr><th>${STR.score.player}</th><th>${STR.score.weapon}</th>${gear ? `<th class="n">${STR.match.armor}</th>` : ''}<th class="n">${STR.hud.kills}</th><th class="n">${STR.hud.deaths}</th></tr></thead>`;
    const body = el('tbody');
    for (const p of [...rows].sort((a, b) => b.kills - a.kills || a.deaths - b.deaths)) {
      const tr = el('tr', p.me ? 'is-me' : '');
      const n = el('td');
      const sw = el('span', 'sw'); sw.style.background = p.color;
      n.append(sw, document.createTextNode(p.name));
      const w = el('td');
      for (const b of p.blades ?? [{ family: p.family, level: p.level, lost: 0 }]) {
        w.insertAdjacentHTML('beforeend', `<span class="bl">${silhouette(b.family)}${STR.armory.level(b.level)}${lost(b.lost)}</span>`);
      }
      tr.append(n, w);
      if (gear) { const a = el('td', 'n'); if (p.armor) a.innerHTML = `${p.armor.level}${lost(p.armor.lost)}`; tr.append(a); }
      tr.append(el('td', 'n', String(p.kills)), el('td', 'n', String(p.deaths)));
      body.appendChild(tr);
    }
    t.appendChild(body);
    r.appendChild(t);
    this.parent.appendChild(r);
    this.root = r;
  }
  get visible(): boolean { return !!this.root; }
  hide(): void { this.root?.remove(); this.root = null; }
}

export interface PauseHandlers { resume(): void; settings(): void; leave(): void }
/** Pause menu: a dim plate over the frozen game and a shutter with three stamped buttons. Esc / back = resume. */
export class PauseMenu {
  private nodes: HTMLElement[] = [];
  private esc = (e: KeyboardEvent) => { if (e.key === 'Escape') this.h.resume(); };
  constructor(private parent: HTMLElement, private h: PauseHandlers) {}
  get open(): boolean { return this.nodes.length > 0; }
  show(): void {
    if (this.open) return;
    const dim = el('div', 'p-dim');
    const p = el('div', 'k-shutter k-plate k-in p-pause');
    p.style.pointerEvents = 'auto';
    const head = el('div', 'k-head');
    head.appendChild(el('div', 'k-title', STR.pause.title));
    const c = sharedControls();
    const aim = el('div', 'p-aim');
    aim.append(el('div', 'p-aim-l', STR.controls.aimAssist), segmented(STR.controls.aimAssist,
      [{ id: 'on', label: STR.settings.on }, { id: 'off', label: STR.settings.off }] as const,
      c.v.aimAssist ? 'on' : 'off', (x) => c.set({ aimAssist: x === 'on' })).root);
    p.append(head, stampedButton(STR.pause.resume, this.h.resume), aim, stampedButton(STR.pause.settings, this.h.settings), stampedButton(STR.pause.leave, this.h.leave));
    this.parent.append(dim, p);
    this.nodes = [dim, p];
    sfx('open');
    addEventListener('keydown', this.esc);
  }
  hide(): void { removeEventListener('keydown', this.esc); this.nodes.forEach((n) => n.remove()); this.nodes = []; }
}
