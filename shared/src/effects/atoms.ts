import type { Vec3 } from '../net/match-msgs';
import type { PassiveId } from '../passives';

/**
 * Effect toolkit vocabulary (phase 28). Passive hooks push `Atom`s; the EffectWorld (world.ts) turns them into
 * statuses, knocks, damage and short-lived entities. Server and offline client run the same world through an
 * `ESink`, so every rule lives once. Numbers: BALANCE.effects.
 */

/** Movement statuses the target's own client applies (movement is client-authoritative). */
export type StatusKind = 'slow' | 'freeze' | 'pin' | 'slip' | 'well' | 'shake';
export const STATUS_KINDS: readonly StatusKind[] = ['slow', 'freeze', 'pin', 'slip', 'well', 'shake'];

/** Entities: things that exist for a while and travel in the snapshot. Order = wire code. */
export const ENT_KINDS = ['slash', 'slash_burn', 'slash_ice', 'slash_sun', 'lava', 'ice', 'meteor', 'orbit', 'eclipse', 'column', 'anchor', 'crack', 'star'] as const;
export type EntKind = typeof ENT_KINDS[number];
export type SlashVariant = 'slash' | 'slash_burn' | 'slash_ice' | 'slash_sun';

/** One live entity as both worlds and the wire see it. age/life in seconds; r = radius (fields, holes). */
export interface Ent { id: number; k: EntKind; o: number; x: number; y: number; z: number; vx: number; vy: number; vz: number; yaw: number; age: number; life: number; r: number }

/** Instant moments for presentation only (sounds, sparks): sent as `atom` msgs online, bus events offline. */
export type AtomFxKind = 'chain' | 'wave' | 'bell' | 'pin' | 'magnet' | 'whip' | 'boom' | 'meteor_hit' | 'anchor_hit' | 'orbit_hit' | 'freeze' | 'push';
export interface AtomFx { k: AtomFxKind; o: number; p: Vec3; r?: number; /** extra points (chain lightning hops, whip end) as flat xyz */ q?: number[] }

/**
 * What passive hooks emit (besides the old burn/launch/shockwave/pull/aoe). `at` picks where an atom happens:
 * the target of the hit, or the owner. Cooldowns are looked up per atom in world.ts.
 */
export type Atom =
  | { type: 'status'; k: 'slow' | 'freeze' | 'bell'; at: 'target' }
  | { type: 'slash'; v: SlashVariant; dmg: number; cd: number; cdKey: string; toward?: 'attacker' }
  | { type: 'whip' }
  | { type: 'field'; k: 'lava_crack' | 'lava_pool' | 'lava_big' }
  | { type: 'meteor' }
  | { type: 'hole'; k: 'eclipse' | 'star' }
  | { type: 'column' }
  | { type: 'wave'; k: 'piston' | 'bell_wave' | 'light_wave' }
  | { type: 'magnet' }
  | { type: 'bounce' }
  | { type: 'push' }
  | { type: 'chain' }
  | { type: 'anchor' }
  | { type: 'pin_all' }
  | { type: 'crack' };
export type AtomType = Atom['type'];

/** A body the effect world can touch (a player or a dummy). y = feet. */
export interface EBody {
  id: number; team: number; x: number; y: number; z: number; yaw: number; pitch: number;
  alive: boolean; passives: readonly PassiveId[];
}

/** How a world applies results. The server sends messages; offline the client edits combatants and emits bus events. */
export interface ESink {
  bodies(): readonly EBody[];
  /** False while immune (truce, spawn protection, Nhập thần, i-frames). */
  hurtable(t: EBody): boolean;
  damage(t: EBody, dmg: number, by: number, src: EntKind | AtomFxKind): void;
  /** Velocity for the target's own body; ps = push seconds (weak control), bounce = reflect off walls meanwhile. */
  knock(t: EBody, v: Vec3, ps?: number, bounce?: boolean): void;
  /** s = seconds; mag = slow multiplier / pull speed; p = well center. */
  status(t: EBody, k: StatusKind, s: number, mag: number, p?: Vec3): void;
  burn(t: EBody, dps: number, s: number, by: number): void;
  fx(a: AtomFx): void;
}
