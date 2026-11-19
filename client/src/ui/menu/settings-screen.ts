import type { Screen } from '../../app/screens';
import { el, onPress, sfx, stampNo } from '../kit/dom';
import { shutter, type Shutter } from '../kit/panels';
import { STR } from '../strings.vi';
import { buildRows, TABS, type Tab } from './settings-rows';

/**
 * Settings (LOOK §8 two-pane ledger), first cut: stamped tabs on the left, live rows on the right.
 * Five tabs (settings-rows.ts): Hình ảnh, Âm thanh, Điều khiển, Góc nhìn, Hồ sơ.
 */

export class SettingsScreen implements Screen {
  private sh: Shutter | null = null;
  private rows: HTMLDivElement | null = null;
  private tabs: HTMLButtonElement[] = [];
  private esc = (e: KeyboardEvent) => { if (e.key === 'Escape') this.back(); };
  /** `layer` hosts the panel; `onBack` leaves it (menu: quench back to the menu; in game: close and show the pause menu). */
  constructor(private layer: HTMLElement, private onBack: () => void, private tab: Tab = 'gfx') {}

  enter(): void {
    const sh = shutter(this.layer, STR.menu.settings, STR.menu.back, () => this.back(), 'm-set');
    const tabs = el('div', 'm-tabs');
    tabs.setAttribute('role', 'tablist');
    const ids = TABS;
    this.tabs = ids.map((id, i) => {
      const b = el('button', 'm-tab k-plate');
      b.type = 'button';
      b.setAttribute('role', 'tab');
      b.append(el('span', 'k-n', stampNo(i)), el('span', '', STR.settings.tabs[id]));
      onPress(b, () => { if (this.tab !== id) { sfx('toggle'); this.show(id); } });
      tabs.appendChild(b);
      return b;
    });
    this.rows = el('div', 'm-rows');
    sh.body.append(tabs, this.rows);
    this.sh = sh;
    this.show(this.tab);
    addEventListener('keydown', this.esc);
  }

  private show(tab: Tab): void {
    this.tab = tab;
    this.tabs.forEach((b, i) => b.setAttribute('aria-selected', String(TABS[i] === tab)));
    this.rows!.replaceChildren(buildRows(tab, { layer: this.layer, host: this.layer.parentElement ?? document.body, hide: (on) => { if (this.sh) this.sh.root.style.display = on ? 'none' : ''; } }));
    this.rows!.scrollTop = 0;
  }

  exit(): void { removeEventListener('keydown', this.esc); this.sh?.root.remove(); this.sh = null; }
  back(): boolean { this.onBack(); return true; }
}
