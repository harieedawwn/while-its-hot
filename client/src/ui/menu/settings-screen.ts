import type { Screen } from '../../app/screens';
import { getAudio } from '../../audio/engine';
import { audioSettings } from '../../audio/settings';
import { fxSettings, setFxSettings } from '../../fx/fx-settings';
import { ledger, notchedSlider, segmented } from '../kit/controls';
import { el, onPress, sfx, stampNo } from '../kit/dom';
import { shutter, type Shutter } from '../kit/panels';
import { STR } from '../strings.vi';
import { setUiSettings, uiSettings } from '../ui-settings';
import type { MenuCtx } from './menu-screens';

/**
 * Settings (LOOK §8 two-pane ledger), first cut: stamped tabs on the left, live rows on the right.
 * Phase 13 wires Hình ảnh (Máu, Giảm chuyển động) and Âm thanh (volume, output, haptics); phase 14 adds the rest.
 */
type Tab = 'gfx' | 'audio';
const onOff = [{ id: 'on', label: STR.settings.on }, { id: 'off', label: STR.settings.off }] as const;
const bool = (v: boolean) => (v ? 'on' : 'off');

export class SettingsScreen implements Screen {
  private sh: Shutter | null = null;
  private rows: HTMLDivElement | null = null;
  private tabs: HTMLButtonElement[] = [];
  private esc = (e: KeyboardEvent) => { if (e.key === 'Escape') this.back(); };
  constructor(private c: MenuCtx, private tab: Tab = 'gfx') {}

  enter(): void {
    const sh = shutter(this.c.layer, STR.menu.settings, STR.menu.back, () => this.back(), 'm-set');
    const tabs = el('div', 'm-tabs');
    tabs.setAttribute('role', 'tablist');
    const ids: Tab[] = ['gfx', 'audio'];
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
    this.tabs.forEach((b, i) => b.setAttribute('aria-selected', String(['gfx', 'audio'][i] === tab)));
    const L = ledger();
    if (tab === 'gfx') {
      L.row(STR.gfx.blood, segmented(STR.gfx.blood, onOff, bool(fxSettings.blood), (v) => setFxSettings({ blood: v === 'on' })).root);
      L.row(STR.settings.reduceMotion, segmented(STR.settings.reduceMotion, onOff, bool(uiSettings.reduceMotion), (v) => setUiSettings({ reduceMotion: v === 'on' })).root);
    } else {
      const a = getAudio();
      L.row(STR.audio.master, notchedSlider(STR.audio.master, 10, Math.round(audioSettings.master * 10), (v) => a.setSettings({ master: v / 10 }), (v) => String(v * 10)).root);
      L.row(STR.audio.output, segmented(STR.audio.output, [{ id: 'phone', label: STR.audio.phone }, { id: 'headphones', label: STR.audio.headphones }] as const,
        audioSettings.output, (v) => a.setSettings({ output: v })).root);
      L.row(STR.audio.haptics, segmented(STR.audio.haptics, onOff, bool(audioSettings.haptics), (v) => a.setSettings({ haptics: v === 'on' })).root);
    }
    this.rows!.replaceChildren(L.root);
  }

  exit(): void { removeEventListener('keydown', this.esc); this.sh?.root.remove(); this.sh = null; }
  back(): boolean { void this.c.machine.go('menu', 'quench'); return true; }
}
