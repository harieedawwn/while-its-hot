import { setModal } from './modal';
import { BALANCE, FAMILIES, type Family } from '@wih/shared';
import { HEAT_HEX, heatStep } from '../render/heat';
import { FORGE_CSS } from './forge-hud-css';
import { STR } from './strings.vi';
import { FEEL } from '../core/feel';

const F = BALANCE.forge;
export type FlashKind = 'tuyet' | 'dat' | 'giu' | 'hong' | 'broke' | 'refused';
export interface ForgeHudView {
  ring: number; zoneC: number; zoneHalf: number; cooling: boolean; heat: number; level: number;
  target: 'blade' | 'armor'; frenzyMeter: number; frenzyOn: boolean;
}
/** Result words use the heat ramp (LOOK §8); a miss reads cold or dark. */
const WORD_COLOR: Record<FlashKind, string> = {
  tuyet: HEAT_HEX[7], dat: HEAT_HEX[5], giu: '#7f93a1', hong: HEAT_HEX[3], broke: '#b3261e', refused: '#7f93a1',
};
const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', parent?: HTMLElement): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag); if (cls) e.className = cls; parent?.appendChild(e); return e;
};
const arc = (a0: number, a1: number, r = 40): string => {
  const p = (t: number) => `${(50 + r * Math.sin(t * 2 * Math.PI)).toFixed(2)} ${(50 - r * Math.cos(t * 2 * Math.PI)).toFixed(2)}`;
  return `M${p(a0)}A${r} ${r} 0 ${a1 - a0 > 0.5 ? 1 : 0} 1 ${p(a1)}`;
};
let cssDone = false;

/**
 * Forge stance HUD (LOOK §8): strike ring, heat meter, frenzy pips, level and the +3 family pick.
 * Plain DOM over the canvas; visible only in the stance. Updates touch the DOM only when a value changed.
 */
export class ForgeHud {
  private root = el('div', 'fh');
  private svgNS = 'http://www.w3.org/2000/svg';
  private ringSvg: SVGSVGElement;
  private zone: SVGPathElement;
  private mark: SVGGElement;
  private heatSegs: HTMLElement[] = [];
  private pips: HTMLElement[] = [];
  private lvl: HTMLElement;
  private tgt: HTMLElement;
  private fr: HTMLElement;
  private word: HTMLElement;
  private pick: HTMLElement | null = null;
  private cache = { zone: '', heat: -1, pips: -1, level: NaN, target: '', cool: false, on: false };
  private onKey: ((e: KeyboardEvent) => void) | null = null;

  constructor(host: HTMLElement) {
    if (!cssDone) { const st = document.createElement('style'); st.textContent = FORGE_CSS; document.head.appendChild(st); cssDone = true; }
    this.root.hidden = true;
    this.root.style.setProperty('--flash', `${FEEL.forge.flashS}s`);
    const col = el('div', 'fh-col', this.root), row = el('div', 'fh-row', col);
    const l = el('div', 'fh-lvl', row); this.lvl = el('b', '', l); this.tgt = el('i', '', l);
    const ns = this.svgNS;
    this.ringSvg = document.createElementNS(ns, 'svg') as SVGSVGElement;
    this.ringSvg.setAttribute('viewBox', '0 0 100 100'); this.ringSvg.setAttribute('class', 'fh-ring');
    const track = document.createElementNS(ns, 'circle'); track.setAttribute('class', 'tr'); track.setAttribute('cx', '50'); track.setAttribute('cy', '50'); track.setAttribute('r', '40');
    this.zone = document.createElementNS(ns, 'path') as SVGPathElement; this.zone.setAttribute('class', 'zn');
    this.mark = document.createElementNS(ns, 'g') as SVGGElement;
    const mk = document.createElementNS(ns, 'line'); mk.setAttribute('class', 'mk'); mk.setAttribute('x1', '50'); mk.setAttribute('x2', '50'); mk.setAttribute('y1', '4'); mk.setAttribute('y2', '16');
    this.mark.appendChild(mk);
    const dot = document.createElementNS(ns, 'circle'); dot.setAttribute('class', 'dot'); dot.setAttribute('cx', '50'); dot.setAttribute('cy', '50'); dot.setAttribute('r', '6');
    this.ringSvg.append(track, this.zone, this.mark, dot);
    row.appendChild(this.ringSvg);
    this.fr = el('div', 'fh-fr', row); this.fr.textContent = STR.forge.frenzy;
    const heat = el('div', 'fh-heat', col);
    for (let i = 0; i < HEAT_HEX.length; i++) this.heatSegs.push(el('u', '', heat));
    const band = el('div', 'fh-band', col), b = el('i', '', band);
    b.style.left = `${F.heat.dull * 100}%`; b.style.width = `${(F.heat.burning - F.heat.dull) * 100}%`;
    const pips = el('div', 'fh-pips', col);
    for (let i = 0; i < F.frenzy.full; i++) this.pips.push(el('u', '', pips));
    this.word = el('div', 'fh-word', this.root);
    host.appendChild(this.root);
  }

  show(on: boolean): void { this.root.hidden = !on; }

  update(v: ForgeHudView): void {
    this.mark.setAttribute('transform', `rotate(${(v.ring * 360).toFixed(1)} 50 50)`);
    const zk = `${v.zoneC.toFixed(3)}/${v.zoneHalf.toFixed(3)}`;
    if (zk !== this.cache.zone) {
      this.cache.zone = zk;
      this.zone.setAttribute('d', arc(v.zoneC - v.zoneHalf, v.zoneC + v.zoneHalf));
    }
    if (v.cooling !== this.cache.cool) { this.cache.cool = v.cooling; this.ringSvg.classList.toggle('cd', v.cooling); }
    const step = v.heat <= 0 ? -1 : heatStep(v.heat);
    if (step !== this.cache.heat) {
      this.cache.heat = step;
      this.heatSegs.forEach((s, i) => { s.style.background = i <= step ? HEAT_HEX[i] : ''; });
    }
    const fm = Math.floor(v.frenzyMeter);
    if (fm !== this.cache.pips) { this.cache.pips = fm; this.pips.forEach((p, i) => p.classList.toggle('on', i < fm)); }
    if (v.level !== this.cache.level) { this.cache.level = v.level; this.lvl.textContent = `+${v.level}`; }
    if (v.target !== this.cache.target) { this.cache.target = v.target; this.tgt.textContent = STR.forge.target[v.target]; }
    const ready = v.frenzyMeter >= F.frenzy.full && !v.frenzyOn;
    if (ready !== this.cache.on) { this.cache.on = ready; this.fr.classList.toggle('on', ready); }
  }

  flash(kind: FlashKind): void {
    this.word.textContent = kind === 'broke' ? STR.forge.broke : kind === 'refused' ? STR.forge.refused : STR.forge.outcome[kind];
    this.word.style.color = WORD_COLOR[kind];
    this.word.classList.remove('pop'); void this.word.offsetWidth; this.word.classList.add('pop');
  }

  get picking(): boolean { return this.pick !== null; }

  /** The +3 family pick: three stamped tags, the default pre-highlighted, `secs` to choose. 1/2/3 keys and taps work. */
  openPick(def: Family, secs: number, onPick: (f: Family) => void): void {
    this.closePick();
    setModal('pick', true);
    const p = (this.pick = el('div', 'fh-pick', this.root));
    p.style.setProperty('--pick', `${secs}s`);
    const tags = el('div', 'fh-tags', p);
    const choose = (f: Family) => { this.closePick(); onPick(f); };
    FAMILIES.forEach((f, i) => {
      const t = el('div', `fh-tag${f === def ? ' def' : ''}`, tags);
      const n = el('small', '', t); n.textContent = `0${i + 1}`;
      const name = el('span', '', t); name.textContent = STR.family[f];
      t.addEventListener('pointerdown', (e) => { e.stopPropagation(); choose(f); });
    });
    el('div', 'fh-count', p).appendChild(document.createElement('i'));
    this.onKey = (e) => {
      const i = ['Digit1', 'Digit2', 'Digit3'].indexOf(e.code);
      if (i >= 0) choose(FAMILIES[i]); else if (e.code === 'Enter') choose(def);
    };
    addEventListener('keydown', this.onKey);
  }
  closePick(): void {
    setModal('pick', false);
    this.pick?.remove(); this.pick = null;
    if (this.onKey) { removeEventListener('keydown', this.onKey); this.onKey = null; }
  }

  dispose(): void { this.closePick(); this.root.remove(); }
}
