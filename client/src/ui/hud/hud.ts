import type { Family } from '@wih/shared';
import { el } from '../kit/dom';
import { STR } from '../strings.vi';
import { silhouette } from './silhouettes';
import './hud.css';

/** What the HUD shows. The owner (a scene / the match) fills it every frame; null = not shown (e.g. no timer in training). */
export interface HudState {
  hp: number; hpMax: number; stamina: number; staminaMax: number;
  level: number; family: Family | null;
  roundS: number | null; ringS: number | null;
  lives: { left: number; max: number } | null;
}
const SEGMENTS = 10;
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

/** DOM HUD (LOOK §8). Heat meter and strike ring belong to the forge HUD; there is no minimap. */
export class Hud {
  readonly root: HTMLDivElement;
  private hpSegs: HTMLDivElement[] = [];
  private hpBox = el('div', 'h-hp');
  private chevs: HTMLDivElement[] = [];
  private pips = el('div', 'h-pips');
  private lvl = el('div', 'h-lvl');
  private lvlKey = '';
  private timer = el('div', 'h-box');
  private ring = el('div', 'h-box is-ring');
  private feed = el('div', 'h-feed');
  private pipsKey = '';

  constructor(parent: HTMLElement) {
    this.root = el('div', 'h-root');
    for (let i = 0; i < SEGMENTS; i++) { const s = el('div', 'h-seg'); this.hpSegs.push(s); this.hpBox.appendChild(s); }
    const sta = el('div', 'h-sta');
    for (let i = 0; i < 3; i++) { const c = el('div', 'h-chev'); this.chevs.push(c); sta.appendChild(c); }
    const vit = el('div', 'h-vit');
    vit.append(this.hpBox, sta);
    const top = el('div', 'h-top');
    top.append(this.timer, this.ring);
    this.ring.setAttribute('aria-label', STR.hud.ring);
    this.root.append(vit, this.pips, this.lvl, top, this.feed);
    parent.appendChild(this.root);
  }

  set(s: HudState): void {
    const k = Math.max(0, Math.min(1, s.hp / s.hpMax));
    const on = Math.ceil(k * SEGMENTS - 1e-6);
    this.hpSegs.forEach((e, i) => e.classList.toggle('is-on', i < on));
    this.hpBox.classList.toggle('is-low', k <= 0.3);
    this.chevs.forEach((e, i) => e.classList.toggle('is-on', s.stamina >= i + 1 - 1e-6));
    const key = `${s.level}|${s.family}`;
    if (key !== this.lvlKey) {
      this.lvlKey = key;
      this.lvl.innerHTML = `${silhouette(s.family)}<span class="h-n">${STR.armory.level(s.level)}</span>`;
    }
    this.timer.style.display = s.roundS === null ? 'none' : '';
    if (s.roundS !== null) this.timer.textContent = mmss(s.roundS);
    this.ring.style.display = s.ringS === null ? 'none' : '';
    if (s.ringS !== null) { this.ring.textContent = mmss(s.ringS); this.ring.classList.toggle('is-soon', s.ringS <= 10); }
    const pk = s.lives ? `${s.lives.left}/${s.lives.max}` : '';
    if (pk !== this.pipsKey) {
      this.pipsKey = pk;
      this.pips.replaceChildren();
      if (s.lives) for (let i = 0; i < s.lives.max; i++) this.pips.appendChild(el('div', `h-pip${i < s.lives.left ? '' : ' is-off'}`));
    }
  }

  /** A kill-feed line: names and the killer's weapon silhouette. Fades after `ms`; at most 4 lines. */
  kill(killer: string, victim: string, family: Family | null, mine = false, ms = 4500): void {
    const row = el('div', 'h-kill');
    const a = el('span', mine ? 'h-me' : '', killer), b = el('span', '', victim);
    row.append(a);
    row.insertAdjacentHTML('beforeend', silhouette(family));
    row.append(b);
    this.feed.appendChild(row);
    while (this.feed.children.length > 4) this.feed.firstElementChild!.remove();
    setTimeout(() => { row.classList.add('is-out'); setTimeout(() => row.remove(), 180); }, ms);
  }

  show(on: boolean): void { this.root.hidden = !on; }
  dispose(): void { this.root.remove(); }
}
