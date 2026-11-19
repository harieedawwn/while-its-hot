import { BALANCE } from '../balance';
import type { AttackKind } from '../passives';
import { ForgeSession, type RandFn } from '../forge/session';
import type { NetState } from '../net/codec';
import type { ServerMsg } from '../net/protocol';
import type { Vec3 } from '../net/match-msgs';

/** A message out of the authority: to one player id, or 'all'. */
export interface Out { to: number | 'all'; m: ServerMsg }

/** A swing the server has heard of (from `atk`), with the targets it already hit. */
export interface SwingRec { s: number; kind: AttackKind; combo: number; at: number; hits: Set<number> }

/** Everything the server knows about one player in a match (match ms for every time). */
export interface MPlayer {
  id: number;
  online: boolean;
  hp: number;
  alive: boolean;
  /** Match ms at which a dead player stands up again. */
  spawnAt: number;
  /** Latest State from the client (client-authoritative movement). */
  st: NetState;
  rtt: number;
  forge: ForgeSession;
  stance: boolean;
  heating: boolean;
  /** The last two swings (the claim may arrive after the next one started). */
  swings: SwingRec[];
  parryAt: number;
  dashAt: number;
  burnT: number; burnDps: number; burnBy: number;
  anvil: { p: Vec3; yaw: number } | null;
  /** Damage dealt / kills this match (phase 18 scores rounds from these). */
  dealt: number; kills: number;
}

export function blankState(p: Vec3, yaw: number): NetState {
  return { x: p[0], y: p[1], z: p[2], vx: 0, vy: 0, vz: 0, yaw, pitch: 0, anim: 0, animT: 0, flags: 1, weapon: 0, level: 0, stamina: BALANCE.move.stamina.pips, armor: 0, hp: BALANCE.combat.hp };
}

export function newPlayer(id: number, p: Vec3, yaw: number, rand: RandFn): MPlayer {
  const forge = new ForgeSession(rand);
  forge.carried = 1;
  return {
    id, online: true, hp: BALANCE.combat.hp, alive: true, spawnAt: 0, st: blankState(p, yaw), rtt: 0,
    forge, stance: false, heating: false, swings: [], parryAt: -1e9, dashAt: -1e9,
    burnT: 0, burnDps: 0, burnBy: 0, anvil: null, dealt: 0, kills: 0,
  };
}

export const posOf = (p: MPlayer): Vec3 => [p.st.x, p.st.y, p.st.z];
export const flatDist = (a: MPlayer, b: MPlayer): number => Math.hypot(a.st.x - b.st.x, a.st.z - b.st.z);
