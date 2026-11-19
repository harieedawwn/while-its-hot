import { MODULE_IDS } from '@wih/shared';
import { setModal } from '../modal';
import { el, sfx } from '../kit/dom';
import { STR } from '../strings.vi';
import '../styles/match.css';

type RelicStr = Record<string, { name: string; line: string }>;
const RELIC = STR.relic as RelicStr;
const MOD = STR.module as Record<string, string>;

/** Name and one-line effect of a draft offer (relic or armor module). */
export function offerText(id: string): { name: string; line: string; module: boolean } {
  if ((MODULE_IDS as readonly string[]).includes(id)) return { name: MOD[id] ?? id, line: STR.match.moduleTag, module: true };
  const r = RELIC[id];
  return { name: r?.name ?? id, line: r?.line ?? '', module: false };
}

/** Relic draft during the cage (GDD §8): three cards along the bottom, a reroll for whoever earned one, the countdown above. */
export class Draft {
  private root = el('div', 'd-root');
  private count = el('div', 'd-count k-display');
  private head = el('div', 'd-head');
  private row = el('div', 'd-row');
  private reroll = el('button', 'k-btn d-reroll', STR.match.reroll);
  private key = '';

  constructor(parent: HTMLElement, private pick: (id: string) => void, private onReroll: () => void) {
    this.reroll.type = 'button';
    this.reroll.addEventListener('click', () => { sfx('tap'); this.onReroll(); });
    this.root.append(this.head, this.count, this.row, this.reroll);
    this.root.hidden = true;
    parent.appendChild(this.root);
  }

  setHead(round: number): void { this.head.textContent = `${STR.match.round(round)} · ${STR.match.draft}`; }
  setTime(s: number): void { const n = String(Math.max(0, Math.ceil(s))); if (this.count.textContent !== n) this.count.textContent = n; }

  show(ids: readonly string[], rerolls: number): void {
    const key = ids.join();
    if (key !== this.key) {
      this.key = key;
      this.row.replaceChildren(...ids.map((id, i) => {
        const t = offerText(id), c = el('button', `d-card k-plate${t.module ? ' is-mod' : ''}`);
        c.type = 'button';
        c.append(el('div', 'd-key', String(i + 1)), el('div', 'd-name k-display', t.name), el('div', 'd-line', t.line));
        c.addEventListener('click', () => { sfx('tap'); this.pick(id); });
        return c;
      }));
    }
    this.reroll.hidden = rerolls <= 0;
    this.root.hidden = ids.length === 0;
    setModal('draft', ids.length > 0);
  }
  /** Keyboard 1–3 (dev). Returns true if it picked. */
  keyPick(i: number): boolean { const c = this.row.children[i] as HTMLElement | undefined; if (!c || this.root.hidden) return false; c.click(); return true; }
  hide(): void { setModal('draft', false); this.root.hidden = true; this.key = ''; }
  get visible(): boolean { return !this.root.hidden; }
  dispose(): void { setModal('draft', false); this.root.remove(); }
}
