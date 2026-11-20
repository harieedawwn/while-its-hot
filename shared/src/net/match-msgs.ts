import type { MatchRules } from './protocol';
import type { Zone } from '../combat/sweep';
import type { Family } from '../data/weapons';
import type { HitResult } from '../combat/damage';
import type { ForgeTarget, Outcome, Timing } from '../forge/odds';
import type { AttackKind } from '../passives';
import type { AtomFx, AtomFxKind, EntKind, StatusKind } from '../effects/atoms';

/**
 * Match messages (TECH §4), JSON, alongside the binary State/Snapshot. Times `at` are match milliseconds
 * (server clock since the match started) as the sender estimates them. Ids are room player ids (≥ 1).
 */
export type Vec3 = [number, number, number];
export type ForgeOp =
  | { k: 'stance'; on: boolean } | { k: 'heat'; on: boolean }
  /** at = the pointer-down time in match seconds (the ring is a function of it); n = the owner's request number. */
  | { k: 'strike'; at: number; n: number }
  | { k: 'frenzy'; at: number } | { k: 'pick'; f: Family } | { k: 'swap' } | { k: 'target' };

export type MatchClientMsg =
  /** A swing began (windup or heavy release). s = the attacker's swing counter. */
  | { t: 'atk'; s: number; kind: AttackKind; combo: number; at: number }
  /** The attacker's blade touched tg. at = when (match ms), rt = the render time tg was drawn at (interpolated). */
  | { t: 'hit'; s: number; tg: number; zone: Zone; dist: number; p: Vec3; at: number; rt: number }
  | { t: 'parry'; at: number } | { t: 'slam'; p: Vec3 }
  | { t: 'forge'; op: ForgeOp }
  | { t: 'anvil'; act: 'place' | 'lift'; p: Vec3; yaw: number }
  | { t: 'take'; id: number }
  /** Relic draft during the cage: take one of the offers, or spend a reroll. */
  | { t: 'draft'; pick?: string; reroll?: boolean };

export type PhaseName = 'cage' | 'fight' | 'result' | 'end';
/** Where the round machine is. at = match ms the phase began, end = match ms it ends (0 = open), truce = match ms the truce ends. */
export interface PhaseNet { ph: PhaseName; n: number; at: number; end: number; truce: number; ring: number; win: number }
export interface ScoreNet { id: number; pts: number; kills: number; deaths: number; lives: number; wins: number; stacks: number }
export interface EndRowNet extends ScoreNet { best: [number, number, number]; relics: string[] }

/** One blade as the server keeps it (shared/forge/session.ts Blade). */
export interface BladeNet { family: Family | null; level: number; best: number }
/** The owner's forging state after the server applied an op (the client overwrites its prediction). */
export interface ForgeSync {
  blades: [BladeNet, BladeNet]; carried: number; slot: number; armor: number; target: ForgeTarget;
  heat: number; meter: number; pending: number | null; lastFamily: Family;
  /** The ring: base [p0, t0, lap], zone center, zones drawn so far, sequence seed, Nhập thần [start, end] (0 = off). */
  ring: [number, number, number]; zoneC: number; zoneK: number; seed: number; fr: [number, number];
  /** How many strike/frenzy ops of this player the server has handled: a client keeps its predicted ring until this catches up with what it sent. */
  ops: number;
}
export interface StrikeNet {
  outcome: Outcome; timing: Timing; target: ForgeTarget; level: number; delta: number; refused: boolean; frenzy: boolean;
  pick: boolean; evolved: string | null; heat: number;
}
export type HitKindNet = Exclude<HitResult['r'], 'immune' | 'parried'>;
/** Carried gear before → after the end-of-round loss. blades = filled slots in order. */
export interface CarryNet { id: number; blades: { family: Family | null; from: number; to: number }[]; armor: [number, number] }
export interface AnvilNet { id: number; p: Vec3; yaw: number }
export interface PickupNet { id: number; p: Vec3 }
export interface MatchPlayerNet { id: number; hp: number; alive: boolean; p: Vec3; yaw: number }

export type MatchServerMsg =
  /** Full match state: at match start and on a reconnect. t0 = server epoch ms of match start (the room fills it), now = match ms; truce = ms the truce ends. */
  | { t: 'match'; t0: number; now: number; truce: number; rules: MatchRules; f: PhaseNet; rows: ScoreNet[]; players: MatchPlayerNet[]; anvils: AnvilNet[]; pickups: PickupNet[]; you: ForgeSync }
  /** Damage applied. kn = knockback velocity for the target's own body; st = stagger seconds (0 = flinch unless blocked). */
  | { t: 'dmg'; a: number; tg: number; dmg: number; r: HitKindNet; zone: Zone; kind: AttackKind; hp: number; sc: number; st: number; kn: Vec3; p: Vec3; s: number }
  | { t: 'parried'; a: number; tg: number; st: number; stam: number; p: Vec3; s: number }
  | { t: 'reject'; s: number; tg: number; why: string }
  | { t: 'kill'; tg: number; by: number }
  | { t: 'spawn'; id: number; p: Vec3; yaw: number; hp: number }
  /** ps = push seconds (weak control; default pushS), b = bounce off walls meanwhile (bua_cao_su). */
  | { t: 'knock'; kn: Vec3; ps?: number; b?: 1 }
  /** Blink / rift dash: put the body at p facing yaw (its client finds a safe spot at or before p). */
  | { t: 'tp'; p: Vec3; yaw: number }
  /** Effect damage (phase 28 toolkit: slashes, meteors, waves; no defense): tg's hp after it. */
  | { t: 'edmg'; tg: number; by: number; dmg: number; k: EntKind | AtomFxKind; hp: number }
  /** A movement status on tg (its client applies it; everyone may show it): s seconds, v = slow mul / pull m/s, p = well center. */
  | { t: 'status'; tg: number; k: StatusKind; s: number; v: number; p?: Vec3 }
  /** An instant effect moment for sounds and sparks. */
  | { t: 'atom'; a: AtomFx }
  /** The dead player became a Hồn (ghost): invulnerable, can move, cannot act. They turn solid with `spawn`. */
  | { t: 'ghost'; id: number }
  /** One 0.5 s tick of fire-ring damage on `id` (the HP itself arrives with the snapshot). */
  | { t: 'rtick'; id: number }
  /** End of a round: what every carried blade and armor lost (result screen). */
  | { t: 'carry'; rows: CarryNet[] }
  /** A strike resolved (broadcast: everyone sees the sparks at that anvil). n = the owner's request number (auto = -1). */
  | { t: 'forged'; id: number; r: StrikeNet; n: number }
  | { t: 'fsync'; s: ForgeSync }
  | { t: 'anvil'; id: number; act: 'place' | 'lift'; p: Vec3; yaw: number }
  | { t: 'pickup'; add: PickupNet[]; del: number[]; by: number }
  /** Round machine change (cage → fight → result → next cage … → end). */
  | { t: 'phase'; f: PhaseNet; rows: ScoreNet[] }
  | { t: 'score'; rows: ScoreNet[] }
  /** Draft offers for you, rerolls left; or the relic/module you now own (own = full list). */
  | { t: 'offer'; ids: string[]; rerolls: number }
  | { t: 'own'; relics: string[] }
  /** Your HP was raised by the server (dau_toi). */
  | { t: 'heal'; hp: number }
  /** Match over: the standings, each player's best level per family (FAMILIES order: kiem, bua, dao, tay) and their relics. */
  | { t: 'end'; win: number; rows: EndRowNet[] };
