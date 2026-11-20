import { BALANCE } from '../balance';
import type { AttackKind } from '../passives';
import { ForgeSession, type RandFn } from '../forge/session';
import type { NetState } from '../net/codec';
import type { ServerMsg } from '../net/protocol';
import type { Vec3 } from '../net/match-msgs';
import { NO_CARD, type CardFx } from '../data/cards';

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
  /** Death timeline (match ms): the ghost starts at ghostAt, the player turns solid at spawnAt. `ghost` = in the Hồn phase (alive stays false: every combat rule rejects it). */
  ghostAt: number; spawnAt: number; ghost: boolean;
  /** Spawn protection after turning solid (match ms), broken by attacking. */
  spawnUntil: number;
  /** Seconds accumulated toward the next fire-ring tick. */
  ringT: number;
  /** Latest State from the client (client-authoritative movement). */
  st: NetState;
  rtt: number;
  forge: ForgeSession;
  stance: boolean;
  heating: boolean;
  /** The last two swings (the claim may arrive after the next one started). */
  swings: SwingRec[];
  parryAt: number;
  burnT: number; burnDps: number; burnBy: number;
  anvil: { p: Vec3; yaw: number } | null;
  /** Damage dealt / kills this match (phase 18 scores rounds from these). */
  dealt: number; kills: number;
  /** Match totals: points, deaths, rounds won. This round: kills, damage, lives left. */
  pts: number; deaths: number; wins: number; rKills: number; rDealt: number; lives: number;
  /** Persist across rounds: cards, Tiếng tăm stacks this round, best level per family. */
  cards: string[]; stacks: number; best: [number, number, number];
  /** Draft state of this round. */
  offer: string[] | null; rerolls: number; offerNo: number;
  /** Match ms until which gang_da i-frames last; consecutive Hỏng for mối hàn. */
  ifUntil: number;
  /** Strike/frenzy ops handled (echoed in every ForgeSync). */
  forgeOps: number;
  /** Folded card effects for the held family (`fxOf` recomputes when the cards or the held family change). */
  fx: CardFx; fxKey: string;
  /** Match ms of the last damage taken (Hồi sức), of the last shoulder-gun shot. */
  hurtAt: number; gunAt: number;
}

import { foldCards } from '../data/cards';
/** The player's card effects for the weapon they hold right now. */
export function fxOf(p: MPlayer): CardFx {
  const fam = p.forge.form.family, key = `${fam}|${p.cards.join()}`;
  if (p.fxKey !== key) { p.fxKey = key; p.fx = foldCards(p.cards, fam); }
  return p.fx;
}
/** Max hit points with Tim sắt cards. */
export function hpMax(p: MPlayer): number { return BALANCE.combat.hp + fxOf(p).hpBonus; }

export function blankState(p: Vec3, yaw: number): NetState {
  return { x: p[0], y: p[1], z: p[2], vx: 0, vy: 0, vz: 0, yaw, pitch: 0, anim: 0, animT: 0, flags: 1, weapon: 0, level: 0, stamina: BALANCE.move.stamina.pips, armor: 0, hp: BALANCE.combat.hp };
}

export function newPlayer(id: number, p: Vec3, yaw: number, rand: RandFn): MPlayer {
  const forge = new ForgeSession(rand);
  forge.carried = 1;
  return {
    id, online: true, hp: BALANCE.combat.hp, alive: true, ghostAt: 0, spawnAt: 0, ghost: false, spawnUntil: 0, ringT: 0, st: blankState(p, yaw), rtt: 0,
    forge, stance: false, heating: false, swings: [], parryAt: -1e9,
    burnT: 0, burnDps: 0, burnBy: 0, anvil: null, dealt: 0, kills: 0,
    pts: 0, deaths: 0, wins: 0, rKills: 0, rDealt: 0, lives: BALANCE.match.lives,
    cards: [], stacks: 0, best: [0, 0, 0], offer: null, rerolls: 0, offerNo: 0, ifUntil: 0, forgeOps: 0, fx: NO_CARD, fxKey: '', hurtAt: -1e9, gunAt: 0,
  };
}

export const posOf = (p: MPlayer): Vec3 => [p.st.x, p.st.y, p.st.z];
export const flatDist = (a: MPlayer, b: MPlayer): number => Math.hypot(a.st.x - b.st.x, a.st.z - b.st.z);
