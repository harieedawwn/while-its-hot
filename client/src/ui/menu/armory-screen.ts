import { familyForms, FAMILIES, weaponById, type Family } from '@wih/shared';
import type { Screen } from '../../app/screens';
import { isUnlocked } from '../../core/profile';
import { el, onPress, sfx } from '../kit/dom';
import { shutter, type Shutter } from '../kit/panels';
import { silhouette } from '../hud/silhouettes';
import { STR } from '../strings.vi';
import type { MenuCtx } from './menu-screens';
import '../styles/armory.css';

const wname = (id: string) => (STR.weapon as Record<string, string>)[id] ?? id;

/**
 * Armory (LOOK §8): the weapon lineage as four horizontal rails (Kiếm / Búa / Dao / Tay), forms placed by minLevel,
 * locked ones dark. Tap one → turntable on the anvil + its passive in one line.
 */
export class ArmoryScreen implements Screen {
  private sh: Shutter | null = null;
  private tiles = new Map<string, HTMLButtonElement>();
  private name = el('div', 'a-name');
  private line = el('div', 'a-line');
  private esc = (e: KeyboardEvent) => { if (e.key === 'Escape') this.back(); };
  constructor(private c: MenuCtx & { turntable: import('../../world/turntable').Turntable }, private pick = 'kiem_tho') {}

  async enter(): Promise<void> {
    const sh = shutter(this.c.layer, STR.menu.armory, STR.menu.back, () => this.back(), 'a-panel');
    const rails = el('div', 'a-rails');
    for (const f of FAMILIES) rails.appendChild(this.rail(f));
    const info = el('div', 'a-info k-plate');
    info.append(this.name, this.line);
    sh.body.append(rails, info);
    this.sh = sh;
    await this.select(this.pick);
    addEventListener('keydown', this.esc);
  }

  private rail(f: Family): HTMLElement {
    const r = el('div', 'a-rail');
    const head = el('div', 'a-fam');
    head.insertAdjacentHTML('beforeend', silhouette(f));
    head.append(el('span', '', STR.family[f]));
    const track = el('div', 'a-track'), row = el('div', 'a-row');
    track.appendChild(row);
    for (const w of familyForms(f)) {
      const t = el('button', 'a-tile k-plate');
      t.type = 'button';
      t.setAttribute('aria-label', wname(w.id));
      t.classList.toggle('is-locked', !isUnlocked(w.id));
      t.insertAdjacentHTML('beforeend', silhouette(f));
      t.append(el('span', 'k-num', STR.armory.level(w.minLevel)));
      onPress(t, () => { sfx('tap'); void this.select(w.id); });
      row.appendChild(t);
      this.tiles.set(w.id, t);
    }
    r.append(head, track);
    return r;
  }

  private async select(id: string): Promise<void> {
    const w = weaponById(id);
    this.tiles.forEach((t, k) => t.setAttribute('aria-pressed', String(k === id)));
    const locked = !isUnlocked(id);
    this.name.textContent = `${wname(id)} · ${STR.armory.level(w.minLevel)}${locked ? ` · ${STR.armory.locked}` : ''}`;
    this.line.textContent = locked ? '' : STR.armory.fx[w.id] ?? STR.armory.none;
    await this.c.turntable.show(id, locked);
  }

  exit(): void { removeEventListener('keydown', this.esc); this.c.turntable.hide(); this.sh?.root.remove(); this.sh = null; this.tiles.clear(); }
  back(): boolean { void this.c.machine.go('menu', 'quench'); return true; }
}
