import { loadJson, saveJson } from '../core/store';
import { cloneLayout, sanitizeLayout, type ControlId, type Layout } from './touch-layout';
import { PRESETS, PRESET_IDS, isPresetId, type PresetId } from './touch-presets';

interface Slot { base: PresetId; layout: Layout }
interface Saved { active: number; slots: (Partial<Slot> | null)[] }
const KEY = 'wih.touch.layout.v2';
const OLD_KEY = 'wih.touch.layout.v1';
export const SLOT_COUNT = 3;

/**
 * Three custom layout slots saved per device; each remembers the factory preset (2/3/4 ngón) it started from,
 * so "reset" (all, or one control) goes back to that preset. Slots start as the three presets in order.
 * `preview` (dev scenes, `?preset=`) shows a factory preset without touching what is saved.
 */
export class LayoutStore {
  active = 0;
  private slots: Slot[] = [];
  private readonly preview: boolean;

  constructor(preview?: string | null) {
    this.preview = isPresetId(preview);
    this.load(preview);
  }

  /** Re-read what is saved (the settings screen edits it through its own store while the game is paused). */
  reload(): void { if (!this.preview) this.load(null); }

  private load(preview?: string | null): void {
    const s = loadJson<Partial<Saved>>(KEY, {});
    const old = s.slots ? null : loadJson<{ slots?: unknown[] }>(OLD_KEY, {}).slots ?? null;
    this.slots = Array.from({ length: SLOT_COUNT }, (_, i) => {
      const def = PRESET_IDS[i]!;
      const raw = s.slots?.[i];
      if (raw && typeof raw === 'object') {
        const base = isPresetId(raw.base) ? raw.base : def;
        return { base, layout: sanitizeLayout(raw.layout, PRESETS[base]) };
      }
      if (old?.[i]) return { base: 'two', layout: sanitizeLayout(old[i], PRESETS.two) };
      return { base: def, layout: cloneLayout(PRESETS[def]) };
    });
    this.active = typeof s.active === 'number' && s.active >= 0 && s.active < SLOT_COUNT ? s.active : 0;
    if (isPresetId(preview)) { this.slots = [{ base: preview, layout: cloneLayout(PRESETS[preview]) }, ...this.slots.slice(1)]; this.active = 0; }
  }

  get layout(): Layout { return this.slots[this.active]!.layout; }
  get base(): PresetId { return this.slots[this.active]!.base; }
  select(i: number): void { this.active = Math.min(SLOT_COUNT - 1, Math.max(0, i)); this.save(); }
  update(l: Layout): void { this.slots[this.active]!.layout = l; this.save(); }
  /** Load a factory preset into the active slot. */
  usePreset(p: PresetId): void { this.slots[this.active] = { base: p, layout: cloneLayout(PRESETS[p]) }; this.save(); }
  /** Back to the slot's preset: the whole layout, or just one control. */
  reset(id?: ControlId): void {
    const s = this.slots[this.active]!, f = cloneLayout(PRESETS[s.base]);
    s.layout = id ? { ...s.layout, [id]: f[id] } : f;
    this.save();
  }
  private save(): void { if (!this.preview) saveJson(KEY, { active: this.active, slots: this.slots } satisfies Saved); }
}
