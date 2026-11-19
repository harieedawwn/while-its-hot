import { setModal } from '../modal';
import { type EndRowNet, weaponById } from '@wih/shared';
import { silhouette } from './silhouettes';
import { stampedButton } from '../kit/controls';
import { el } from '../kit/dom';
import { STR } from '../strings.vi';
import '../styles/match.css';

/** A stamped word in the middle of the screen (round number, "Đấu!", winner of the round). */
export class Banner {
  private e = el('div', 'b-banner k-display');
  private timer = 0;
  constructor(parent: HTMLElement) { this.e.hidden = true; parent.appendChild(this.e); }
  flash(text: string, ms = 1400, top = false): void {
    this.e.textContent = text; this.e.hidden = false; this.e.classList.toggle('is-top', top);
    this.e.classList.remove('is-in'); void this.e.offsetWidth; this.e.classList.add('is-in');
    clearTimeout(this.timer);
    if (ms > 0) this.timer = window.setTimeout(() => { this.e.hidden = true; }, ms);
  }
  hide(): void { clearTimeout(this.timer); this.e.hidden = true; }
  dispose(): void { clearTimeout(this.timer); this.e.remove(); }
}

export interface EndInfo { win: number; rows: readonly EndRowNet[]; name(id: number): string; color(id: number): string; me: number; unlocked: readonly string[] }

/** Match end screen: standings by rounds then points, what this match unlocked for you, back to the lobby. */
export class EndScreen {
  private root: HTMLDivElement | null = null;
  constructor(private parent: HTMLElement, private onBack: () => void) {}

  show(i: EndInfo): void {
    this.hide();
    setModal('end', true);
    const r = el('div', 'e-root k-plate');
    r.appendChild(el('div', 'e-title k-display', STR.match.champion(i.name(i.win))));
    const t = el('table', 'e-tab');
    t.innerHTML = `<thead><tr><th>${STR.score.player}</th><th class="n">${STR.match.wins}</th><th class="n">${STR.match.points}</th><th class="n">${STR.hud.kills}</th></tr></thead>`;
    const body = el('tbody');
    for (const p of [...i.rows].sort((a, b) => b.wins - a.wins || b.pts - a.pts)) {
      const tr = el('tr', p.id === i.me ? 'is-me' : '');
      const n = el('td'), sw = el('span', 'sw');
      sw.style.background = i.color(p.id);
      n.append(sw, document.createTextNode(i.name(p.id)));
      tr.append(n, el('td', 'n', String(p.wins)), el('td', 'n', String(p.pts)), el('td', 'n', String(p.kills)));
      body.appendChild(tr);
    }
    t.appendChild(body);
    const un = el('div', 'e-un');
    un.appendChild(el('div', 'e-cap', STR.match.unlocked));
    if (!i.unlocked.length) un.appendChild(el('div', 'e-none', STR.match.none));
    for (const id of i.unlocked) {
      const w = weaponById(id), row = el('div', 'e-form');
      row.insertAdjacentHTML('beforeend', silhouette(w.family));
      row.append(document.createTextNode((STR.weapon as Record<string, string>)[id] ?? id));
      un.appendChild(row);
    }
    r.append(t, un, stampedButton(STR.match.back, this.onBack));
    this.parent.appendChild(r);
    this.root = r;
  }
  hide(): void { setModal('end', false); this.root?.remove(); this.root = null; }
}
