import { BALANCE } from './balance';

/**
 * Weapon passives (GDD §6): small hook objects registered by id. Gameplay code never asks "which weapon";
 * it folds the hooks of the held form's stacked passives (`passivesOf` in data/weapons.ts) with the
 * helpers below. Hooks are pure: they read a context and mutate/return values, no side effects.
 */
const PB = BALANCE.weapons.passive;

export type AttackKind = 'light' | 'heavy' | 'slide';
/** What the attacker is doing when the hit lands. combo = 0-based index inside the light chain. */
export interface AttackCtx { kind: AttackKind; combo: number; dist: number; reach: number; }
/** The attack as combat resolves it. Base values come from the family moveset (phase 08). */
export interface AttackShape {
  dmg: number; arcDeg: number; lungeM: number; staggerS: number;
  ignoresBlock: boolean; breaksBlock: boolean;
}
export type HitEffect =
  | { type: 'burn'; dps: number; durS: number }
  | { type: 'launch'; upVel: number }
  | { type: 'shockwave'; r: number; push: number }
  | { type: 'pull'; m: number }
  | { type: 'aoe'; dmg: number; r: number };
export interface PassiveHooks {
  /** Damage, arc, lunge, stagger and block interaction of one attack (light/heavy/slide). */
  modifyAttack?(a: AttackShape, c: AttackCtx): void;
  modifyParryWindow?(s: number): number;
  /** Extra effects on the target when an attack connects. */
  onHit?(c: AttackCtx, out: HitEffect[]): void;
  /** Effects when this player parries someone. */
  onParry?(out: HitEffect[]): void;
  /** Effects when a slam lands (centered on the player). */
  onSlamLand?(out: HitEffect[]): void;
}

const heavy = (c: AttackCtx) => c.kind === 'heavy';
/** Listed in a ROSTER row but not built yet (phases 28/29 give them hooks). `passives.test.ts` keeps the list. */
const PENDING: PassiveHooks = {};

export const PASSIVES = {
  // built: attack shape, parry window, on-hit status, slam
  combo3_bonus: { modifyAttack: (a, c) => { if (c.kind === 'light' && c.combo === 2) a.dmg *= PB.combo3Mul; } },
  combo4_bonus: { modifyAttack: (a, c) => { if (c.kind === 'light' && c.combo === 3) a.dmg *= PB.combo4Mul; } },
  after_slide_bonus: { modifyAttack: (a, c) => { if (c.kind === 'slide') a.dmg *= PB.afterSlideMul; } },
  parry_window_plus: { modifyParryWindow: (s) => s + PB.parryPlusS },
  thrust_pierce: { modifyAttack: (a, c) => { if (heavy(c)) a.ignoresBlock = true; } },
  burn_on_hit: { onHit: (_c, out) => { out.push({ type: 'burn', dps: PB.burn.dps, durS: PB.burn.durS }); } },
  burn_strong: { onHit: (_c, out) => { out.push({ type: 'burn', dps: PB.burnStrong.dps, durS: PB.burnStrong.durS }); } },
  light_break_block: { modifyAttack: (a, c) => { if (c.kind === 'light') a.breaksBlock = true; } },
  stagger_plus: { modifyAttack: (a, c) => { if (heavy(c)) a.staggerS += PB.staggerPlusS; } },
  slam_aoe: { onSlamLand: (out) => { out.push({ type: 'aoe', dmg: PB.slamAoe.dmg, r: PB.slamAoe.r }); } },
  heavy_launch: {
    onHit: (c, out) => {
      if (!heavy(c)) return;
      out.push({ type: 'launch', upVel: PB.launch.upVel }, { type: 'shockwave', r: PB.launch.shockR, push: PB.launch.shockPush });
    },
  },
  // kiem 18–45 (phase 28)
  slow_on_hit: PENDING, flying_slash: PENDING, flying_slash_strong: PENDING, parry_slash: PENDING,
  chain_whip: PENDING, light_reach_plus: PENDING, lava_crack: PENDING, flying_slash_burn: PENDING,
  freeze_combo3: PENDING, slash_ice_floor: PENDING, meteor_heavy: PENDING, orbit_blades: PENDING,
  black_hole_heavy: PENDING, slash_all_lights: PENDING, fire_column_heavy: PENDING,
  // bua 18–45 (phase 28)
  piston_blast: PENDING, magnet_pull_heavy: PENDING, lava_pool_ground: PENDING, slam_lava_big: PENDING,
  bell_ring: PENDING, bell_wave_heavy: PENDING, rubber_launch: PENDING, light_push: PENDING,
  chain_lightning_heavy: PENDING, anchor_throw: PENDING, gravity_pin: PENDING, slam_double: PENDING,
  mountain_crack: PENDING, star_black_hole: PENDING, light_shockwave: PENDING,
  // dao (phase 29)
  backstab_bonus: PENDING, slide_long: PENDING, throw_knife: PENDING, poison_on_hit: PENDING, throw_poison: PENDING,
  shadow_invis: PENDING, hook_lunge: PENDING, parry_blink: PENDING, slide_fire_trail: PENDING, throw_burn: PENDING,
  speed_stacks: PENDING, triple_jump: PENDING, time_slow_heavy: PENDING, slide_decoy: PENDING, blade_storm: PENDING,
  rift_dash: PENDING,
  // tay (phase 29)
  combo4_knock: PENDING, heal_on_hit: PENDING, heal_on_hit_2: PENDING, piston_charge: PENDING, heavy_push: PENDING,
  fireball_heavy: PENDING, freeze_combo4: PENDING, iceball_heavy: PENDING, spark_on_hit: PENDING, stone_wall: PENDING,
  heavy_push_far: PENDING, magnet_punch: PENDING, rocket_fist: PENDING, kill_full_heal: PENDING, giant_hand: PENDING,
  gravity_well_throw: PENDING, light_pull: PENDING, meteor_combo4: PENDING, meteor_rain: PENDING, sky_hand: PENDING,
} as const satisfies Record<string, PassiveHooks>;
export type PassiveId = keyof typeof PASSIVES;
export const PASSIVE_IDS = Object.keys(PASSIVES) as PassiveId[];

const hooks = (id: PassiveId): PassiveHooks => PASSIVES[id];
/** Ids that do nothing yet (no hook): the list phases 28/29 empty out. */
export const pendingPassives = (): PassiveId[] => PASSIVE_IDS.filter((id) => Object.keys(hooks(id)).length === 0);

/** Fold modifyAttack over the passives; returns a new shape. */
export function applyAttack(ids: readonly PassiveId[], base: AttackShape, c: AttackCtx): AttackShape {
  const a = { ...base };
  for (const id of ids) hooks(id).modifyAttack?.(a, c);
  return a;
}
export function parryWindow(ids: readonly PassiveId[], baseS: number): number {
  let s = baseS;
  for (const id of ids) s = hooks(id).modifyParryWindow?.(s) ?? s;
  return s;
}
export function hitEffects(ids: readonly PassiveId[], c: AttackCtx): HitEffect[] {
  const out: HitEffect[] = [];
  for (const id of ids) hooks(id).onHit?.(c, out);
  return out;
}
export function parryEffects(ids: readonly PassiveId[]): HitEffect[] {
  const out: HitEffect[] = [];
  for (const id of ids) hooks(id).onParry?.(out);
  return out;
}
export function slamEffects(ids: readonly PassiveId[]): HitEffect[] {
  const out: HitEffect[] = [];
  for (const id of ids) hooks(id).onSlamLand?.(out);
  return out;
}
