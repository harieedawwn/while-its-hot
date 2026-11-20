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

export const PASSIVES = {
  combo3_bonus: { modifyAttack: (a, c) => { if (c.kind === 'light' && c.combo === 2) a.dmg *= PB.combo3Mul; } },
  parry_window_plus: { modifyParryWindow: (s) => s + PB.parryPlusS },
  thrust_pierce: { modifyAttack: (a, c) => { if (heavy(c)) a.ignoresBlock = true; } },
  burn_on_hit: { onHit: (_c, out) => { out.push({ type: 'burn', dps: PB.burn.dps, durS: PB.burn.durS }); } },
  light_break_block: { modifyAttack: (a, c) => { if (c.kind === 'light') a.breaksBlock = true; } },
  stagger_plus: { modifyAttack: (a, c) => { if (heavy(c)) a.staggerS += PB.staggerPlusS; } },
  slam_aoe: { onSlamLand: (out) => { out.push({ type: 'aoe', dmg: PB.slamAoe.dmg, r: PB.slamAoe.r }); } },
  heavy_launch: {
    onHit: (c, out) => {
      if (!heavy(c)) return;
      out.push({ type: 'launch', upVel: PB.launch.upVel }, { type: 'shockwave', r: PB.launch.shockR, push: PB.launch.shockPush });
    },
  },
  max_reach_bonus: { modifyAttack: (a, c) => { if (c.dist >= c.reach * PB.maxReach.frac) a.dmg *= PB.maxReach.mul; } },
  sweep_wide: { modifyAttack: (a, c) => { if (heavy(c)) a.arcDeg = Math.max(a.arcDeg, PB.sweepArcDeg); } },
  slide_lunge_plus: { modifyAttack: (a, c) => { if (c.kind === 'slide') a.lungeM *= PB.lungeMul; } },
  heavy_pull: { onHit: (c, out) => { if (heavy(c)) out.push({ type: 'pull', m: PB.pullM }); } },
} as const satisfies Record<string, PassiveHooks>;
export type PassiveId = keyof typeof PASSIVES;
export const PASSIVE_IDS = Object.keys(PASSIVES) as PassiveId[];

const hooks = (id: PassiveId): PassiveHooks => PASSIVES[id];

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
