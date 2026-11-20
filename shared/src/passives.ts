import { BALANCE } from './balance';
import type { Atom } from './effects/atoms';
import { ROW_PASSIVES } from './effects/rows';
import { DAO_PASSIVES } from './effects/rows-dao';
import { TAY_PASSIVES } from './effects/rows-tay';

/**
 * Weapon passives (GDD §6): small hook objects registered by id. Gameplay code never asks "which weapon";
 * it folds the hooks of the held form's stacked passives (`passivesOf` in data/weapons.ts) with the
 * helpers below. Hooks are pure: they read a context and mutate/return values, no side effects.
 */
const PB = BALANCE.weapons.passive;

export type AttackKind = 'light' | 'heavy' | 'slide';
/** What the attacker is doing when the hit lands. combo = 0-based index inside the light chain. */
export interface AttackCtx { kind: AttackKind; combo: number; dist: number; reach: number; /** The blow lands from behind the defender (on-hit hooks only). */ back?: boolean; }
/** The attack as combat resolves it. Base values come from the family moveset (phase 08). */
export interface AttackShape {
  dmg: number; arcDeg: number; lungeM: number; staggerS: number;
  ignoresBlock: boolean; breaksBlock: boolean;
  /** Damage × when the attacker stands behind the defender (resolveHit). */
  backMul?: number;
}
export type HitEffect =
  | { type: 'burn'; dps: number; durS: number }
  | { type: 'launch'; upVel: number }
  | { type: 'shockwave'; r: number; push: number }
  | { type: 'pull'; m: number }
  | { type: 'aoe'; dmg: number; r: number }
  | Atom;
/** The five effects resolved inline by hits/slams; every other HitEffect is a toolkit atom (effects/*). */
export type InlineEffect = Extract<HitEffect, { type: 'burn' | 'launch' | 'shockwave' | 'pull' | 'aoe' }>;
const INLINE = new Set(['burn', 'launch', 'shockwave', 'pull', 'aoe']);
export const isInline = (e: HitEffect): e is InlineEffect => INLINE.has(e.type);
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
  /** Effects when an attack strikes (hit or miss): projectiles, waves, holes. Fired at the end of the windup. */
  onSwing?(c: AttackCtx, out: HitEffect[]): void;
  /** Effects when this attack kills (target = the one just killed). */
  onKill?(out: HitEffect[]): void;
  /** Movement trait changes while held. */
  traits?: { airJumps?: number; slideLen?: number };
  /** Heavy charge time × (piston). */
  chargeMul?: number;
  /** Slide behaviour: fire trail while sliding / a decoy left where the slide starts. */
  slide?: 'trail' | 'decoy';
  /** What a thrown knife also does. */
  knife?: 'poison' | 'burn';
  /** Reach of one attack kind. */
  modifyReach?(r: number, kind: AttackKind): number;
  /** Always-on entity that follows the owner. */
  aura?: 'orbit';
}

const heavy = (c: AttackCtx) => c.kind === 'heavy';
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
  // kiem + bua 18–45 (phase 28): effects/rows.ts
  ...ROW_PASSIVES,
  // dao + tay (phase 29): effects/rows-dao.ts, rows-tay.ts
  ...DAO_PASSIVES,
  ...TAY_PASSIVES,
} as const satisfies Record<string, PassiveHooks>;
export type PassiveId = keyof typeof PASSIVES;
export const PASSIVE_IDS = Object.keys(PASSIVES) as PassiveId[];

const hooks = (id: PassiveId): PassiveHooks => PASSIVES[id] as PassiveHooks;
/** Ids that do nothing (no hook): empty since phase 29, kept as a guard (test). */
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
export function swingAtoms(ids: readonly PassiveId[], c: AttackCtx): HitEffect[] {
  const out: HitEffect[] = [];
  for (const id of ids) (hooks(id) as PassiveHooks).onSwing?.(c, out);
  return out;
}
export function reachFor(ids: readonly PassiveId[], base: number, kind: AttackKind): number {
  let r = base;
  for (const id of ids) r = (hooks(id) as PassiveHooks).modifyReach?.(r, kind) ?? r;
  return r;
}
export function auraOf(ids: readonly PassiveId[]): PassiveHooks['aura'] {
  for (const id of ids) { const a = (hooks(id) as PassiveHooks).aura; if (a) return a; }
  return undefined;
}
export function slamEffects(ids: readonly PassiveId[]): HitEffect[] {
  const out: HitEffect[] = [];
  for (const id of ids) hooks(id).onSlamLand?.(out);
  return out;
}

export function killEffects(ids: readonly PassiveId[]): HitEffect[] {
  const out: HitEffect[] = [];
  for (const id of ids) (hooks(id) as PassiveHooks).onKill?.(out);
  return out;
}
/** Folded trait changes: extra air jumps and slide length ×. */
export function traitMods(ids: readonly PassiveId[]): { airJumps: number; slideLen: number } {
  let airJumps = 0, slideLen = 1;
  for (const id of ids) { const t = (hooks(id) as PassiveHooks).traits; if (t) { airJumps = Math.max(airJumps, t.airJumps ?? 0); slideLen *= t.slideLen ?? 1; } }
  return { airJumps, slideLen };
}
export function chargeMulOf(ids: readonly PassiveId[]): number {
  let m = 1;
  for (const id of ids) m *= (hooks(id) as PassiveHooks).chargeMul ?? 1;
  return m;
}
export function slideOf(ids: readonly PassiveId[]): PassiveHooks['slide'] {
  for (const id of ids) { const a = (hooks(id) as PassiveHooks).slide; if (a) return a; }
  return undefined;
}
export function knifeOf(ids: readonly PassiveId[]): PassiveHooks['knife'] {
  for (const id of ids) { const a = (hooks(id) as PassiveHooks).knife; if (a) return a; }
  return undefined;
}
