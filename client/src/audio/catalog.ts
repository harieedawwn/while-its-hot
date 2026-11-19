import type { BusName } from './graph';
import type { Fallback } from './bank';

/** Every sound the game needs (docs/AUDIO.md §3). Data only: routing, mix level, voice limit, reverb send, and the
 *  procedural stand-in used until a recording exists. A recording appears by adding a recipe with the same id. */
export type Cat = 'move' | 'melee' | 'forge' | 'module' | 'world' | 'match' | 'amb' | 'ui';
export interface EventDef {
  cat: Cat; bus: BusName;
  /** Key of FEEL.audio.mix (dB relative to the bus). */
  mix: string;
  voices: number;
  /** Reverb send 0..1 (× the area send level). */
  reverb?: number;
  loop?: boolean;
  fb?: Fallback;
}
const d = (cat: Cat, bus: BusName, mix: string, voices: number, extra: Partial<EventDef> = {}): EventDef => ({ cat, bus, mix, voices, ...extra });
const mv = (mix: string, voices: number, fb?: Fallback, extra: Partial<EventDef> = {}) => d('move', 'sfx', mix, voices, { fb, reverb: 0.3, ...extra });
const ml = (mix: string, voices: number, fb?: Fallback, extra: Partial<EventDef> = {}) => d('melee', 'sfx', mix, voices, { fb, reverb: 0.4, ...extra });
const fg = (mix: string, voices: number, fb?: Fallback, extra: Partial<EventDef> = {}) => d('forge', 'sfx', mix, voices, { fb, reverb: 0.5, ...extra });
const ui = (fb?: Fallback) => d('ui', 'ui', 'ui', 4, { fb });
const amb = (mix: string, voices: number, extra: Partial<EventDef> = {}) => d('amb', 'world', mix, voices, extra);

export const EVENTS: Record<string, EventDef> = {
  // movement
  footstep_stone: mv('footEnemy', 6, { sfx: 'footstep', opts: { surface: 'stone' }, secs: 0.5 }),
  footstep_metal: mv('footEnemy', 6, { sfx: 'footstep', opts: { surface: 'metal' }, secs: 0.5 }),
  footstep_wood: mv('footEnemy', 6, { sfx: 'footstep', opts: { surface: 'wood' }, secs: 0.5 }),
  footstep_slag: mv('footEnemy', 6, { sfx: 'footstep', opts: { surface: 'gravel' }, secs: 0.5 }),
  jump: mv('move', 4, { sfx: 'jump', secs: 0.6 }),
  land_soft: mv('move', 4, { sfx: 'land', opts: { vol: 0.6 }, secs: 0.6 }),
  land_hard: mv('move', 3, { sfx: 'land', secs: 0.8 }),
  dash: mv('dash', 4),
  slide_start: mv('move', 2), slide_loop: mv('move', 2, undefined, { loop: true }), slide_end: mv('move', 2),
  slam_fall: mv('move', 1, undefined, { loop: true }), slam_land: mv('strike', 2, { sfx: 'explosion', opts: { vol: 0.6 }, secs: 2 }),
  walljump: mv('move', 3), cling: mv('move', 3),
  // melee
  swing_sword: ml('swing', 5, { sfx: 'sword_swing', secs: 0.8 }),
  swing_hammer: ml('swing', 4, { sfx: 'sword_slash_heavy', opts: { pitch: 0.7 }, secs: 1 }),
  swing_polearm: ml('swing', 4, { sfx: 'sword_slash', opts: { pitch: 0.85 }, secs: 1 }),
  heavy_charge: ml('swing', 1, undefined, { loop: true }), heavy_release: ml('swing', 3),
  hit_flesh: ml('hit', 8, { sfx: 'hit_body', secs: 1 }),
  hit_armor: ml('hit', 8, { sfx: 'impact_metal', secs: 1.2 }),
  hit_blocked: ml('hit', 8, { sfx: 'impact_wood', secs: 0.8 }),
  parry: ml('parry', 3, { sfx: 'sword_clash', secs: 1.4 }),
  stagger: ml('hit', 4, { sfx: 'hit_heavy', secs: 1 }),
  kill: ml('kill', 3, { sfx: 'hit_heavy', opts: { pitch: 0.7 }, secs: 1.4 }),
  death: ml('kill', 1),
  // forge
  anvil_place: fg('strike', 2, { sfx: 'impact_metal', opts: { pitch: 0.6 }, secs: 1.4 }), anvil_lift: fg('move', 2),
  heat_loop: d('forge', 'world', 'emitter', 1, { loop: true }),
  strike_tuyet: fg('strike', 3), strike_dat: fg('strike', 3, { sfx: 'impact_metal', secs: 1.6 }),
  strike_giu: fg('strike', 3, { sfx: 'impact_metal', opts: { pitch: 0.7, vol: 0.7 }, secs: 0.6 }), strike_hong: fg('strike', 3, { sfx: 'impact_stone', secs: 0.6 }),
  gay: fg('strike', 2), quench: fg('strike', 2), strike_refused: fg('strike', 2),
  frenzy_start: fg('strike', 1), frenzy_loop: fg('strike', 1, undefined, { loop: true }), frenzy_end: fg('strike', 1),
  swap_weapon: fg('move', 2, { sfx: 'sword_draw', secs: 0.8 }),
  // modules
  shoulder_gun: d('module', 'sfx', 'hit', 3, { fb: { sfx: 'gun_rifle', secs: 1.4 }, reverb: 0.5 }),
  bolt: d('module', 'sfx', 'hit', 3, { fb: { sfx: 'bow_release', secs: 1 } }),
  bomb: d('module', 'sfx', 'strike', 2, { fb: { sfx: 'explosion', secs: 2.4 }, reverb: 0.7 }),
  // world emitters
  fire_ring: d('world', 'world', 'emitter', 2, { loop: true }), fire_inside: d('world', 'world', 'ambience', 1, { loop: true }),
  steam_vent: d('world', 'world', 'emitter', 3, { reverb: 0.5 }), amb_oneshot: d('world', 'world', 'emitter', 3, { reverb: 0.7 }), molten: d('world', 'world', 'emitter', 3, { loop: true }),
  // match flow
  cage_tick: d('match', 'sfx', 'strike', 2), cage_open: d('match', 'sfx', 'strike', 1, { fb: { sfx: 'door_open', secs: 2 }, reverb: 0.7 }),
  truce_horn: d('match', 'sfx', 'strike', 1, { reverb: 0.8 }),
  round_win: d('match', 'sfx', 'kill', 1), round_lose: d('match', 'sfx', 'kill', 1), match_win: d('match', 'sfx', 'kill', 1),
  // ambience
  amb_foundry: amb('ambience', 1, { loop: true }), amb_yard: amb('ambience', 1, { loop: true }), menu_smithy: amb('ambience', 1, { loop: true }),
  // UI
  ui_tap: ui({ sfx: 'ui_click', secs: 0.4 }), ui_back: ui({ sfx: 'ui_hover', secs: 0.4 }), ui_toggle: ui({ sfx: 'ui_toggle_on', secs: 0.4 }),
  ui_notch: ui({ sfx: 'ui_hover', opts: { pitch: 1.3 }, secs: 0.3 }), ui_open: ui({ sfx: 'ui_open', secs: 0.5 }), ui_close: ui({ sfx: 'ui_close', secs: 0.5 }),
  ui_error: ui({ sfx: 'ui_error', secs: 0.5 }), ui_select: ui(),
  wipe_quench: d('ui', 'ui', 'ui', 1), wipe_stamp: d('ui', 'ui', 'ui', 1),
};
export const EVENT_IDS = Object.keys(EVENTS);
