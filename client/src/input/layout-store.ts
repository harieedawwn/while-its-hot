import { loadJson, saveJson } from '../core/store';
import { cloneLayout, PRESETS, sanitizeLayout, type Layout } from './touch-layout';

interface Saved { active: number; slots: (Layout | null)[] }
const KEY = 'wih.touch.layout.v1';

/** Three layout slots saved per device. Editing changes the active slot; reset restores that slot's factory preset. */
export class LayoutStore {
  active: number;
  private slots: Layout[];
  constructor() {
    const s = loadJson<Partial<Saved>>(KEY, {});
    this.slots = PRESETS.map((p, i) => sanitizeLayout(s.slots?.[i], p));
    this.active = typeof s.active === 'number' && s.active >= 0 && s.active < PRESETS.length ? s.active : 0;
  }
  get layout(): Layout { return this.slots[this.active]!; }
  select(i: number): void { this.active = Math.min(PRESETS.length - 1, Math.max(0, i)); this.save(); }
  update(l: Layout): void { this.slots[this.active] = l; this.save(); }
  reset(): void { this.slots[this.active] = cloneLayout(PRESETS[this.active]!); this.save(); }
  private save(): void { saveJson(KEY, { active: this.active, slots: this.slots } satisfies Saved); }
}
