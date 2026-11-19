import type { MatchRules } from './protocol';
import type { Zone } from '../combat/sweep';
import type { Family } from '../data/weapons';
import type { HitResult } from '../combat/damage';
import type { ForgeTarget, Outcome, Timing } from '../forge/odds';
import type { AttackKind } from '../passives';

/**
 * Match messages (TECH §4), JSON, alongside the binary State/Snapshot. Times `at` are match milliseconds
 * (server clock since the match started) as the sender estimates them. Ids are room player ids (≥ 1).
 */
export type Vec3 = [number, number, number];
export type ForgeOp =
  | { k: 'stance'; on: boolean } | { k: 'heat'; on: boolean }
  | { k: 'strike'; timing: Timing; n: number }
  | { k: 'frenzy' } | { k: 'pick'; f: Family } | { k: 'swap' } | { k: 'target' };

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
  heat: number; meter: number; frenzyT: number; pending: number | null; zoneC: number; lastFamily: Family;
}
export interface StrikeNet {
  outcome: Outcome; timing: Timing; target: ForgeTarget; level: number; refused: boolean; broke: boolean;
  pick: boolean; evolved: string | null; heat: number;
}
export type HitKindNet = Exclude<HitResult['r'], 'immune' | 'parried'>;
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
  | { t: 'knock'; kn: Vec3 }
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
  /** Match over: the standings, each player's best level per family (kiem, bua, thuong) and their relics. */
  | { t: 'end'; win: number; rows: EndRowNet[] };
