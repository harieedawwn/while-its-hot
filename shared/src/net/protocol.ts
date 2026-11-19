import { BALANCE } from '../balance';
import type { MatchClientMsg, MatchServerMsg } from './match-msgs';

/** Lobby/control messages are JSON; State/Snapshot are binary (codec.ts). */
export type RoomPhase = 'lobby' | 'match';
/** Host-chosen match rules (server-validated, see BALANCE.net.choices). ring: 0 chậm · 1 vừa · 2 nhanh. */
export interface RoomSettings { truce: number; rounds: number; roundS: number; lives: number; ring: number; maxPlayers: number }
/** What the round machine needs from the settings. */
export type MatchRules = Omit<RoomSettings, 'maxPlayers'>
export interface LobbyPlayer { id: number; name: string; color: number; ready: boolean; host: boolean; online: boolean; ping: number }

export type ClientMsg =
  | { t: 'hello'; name: string; color: number; token?: string }
  | { t: 'ready'; v: boolean }
  | { t: 'settings'; s: Partial<RoomSettings> }
  | { t: 'start' }
  | { t: 'ping'; c: number }
  | { t: 'rtt'; v: number }
  | MatchClientMsg;

export type ErrCode = 'full' | 'closed' | 'started' | 'bad' | 'notfound' | 'host';
export type ServerMsg =
  | { t: 'welcome'; id: number; token: string; code: string }
  | { t: 'lobby'; phase: RoomPhase; players: LobbyPlayer[]; settings: RoomSettings }
  | { t: 'pong'; c: number; s: number }
  | { t: 'err'; code: ErrCode }
  | { t: 'start' }
  | MatchServerMsg;

export const DEFAULT_SETTINGS: RoomSettings = { truce: BALANCE.net.truceDefault, ...BALANCE.net.defaults };
export const DEFAULT_RULES: MatchRules = { truce: DEFAULT_SETTINGS.truce, rounds: DEFAULT_SETTINGS.rounds, roundS: DEFAULT_SETTINGS.roundS, lives: DEFAULT_SETTINGS.lives, ring: DEFAULT_SETTINGS.ring };
/** A bare truce length (tests, loopback) or a partial rule set → full rules. */
export function rulesOf(r?: number | Partial<RoomSettings>): MatchRules {
  const p = typeof r === 'number' ? { truce: r } : r ?? {};
  return { ...DEFAULT_RULES, ...sanitizeSettings(p, DEFAULT_SETTINGS) };
}

export function cleanName(n: unknown): string {
  const s = typeof n === 'string' ? n.replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, BALANCE.net.nameMax) : '';
  return s || 'Thợ rèn';
}
export function normalizeCode(c: string): string { return c.toUpperCase().replace(/[^A-Z]/g, '').slice(0, BALANCE.net.codeLen); }
export function validCode(c: string): boolean {
  return c.length === BALANCE.net.codeLen && [...c].every((ch) => BALANCE.net.codeAlphabet.includes(ch));
}
export function randomCode(rnd: () => number = Math.random): string {
  const a = BALANCE.net.codeAlphabet; let s = '';
  for (let i = 0; i < BALANCE.net.codeLen; i++) s += a[Math.floor(rnd() * a.length)];
  return s;
}
export function sanitizeSettings(s: Partial<RoomSettings>, cur: RoomSettings): RoomSettings {
  const C = BALANCE.net.choices, pick = (list: readonly number[], v: unknown, d: number): number => (list.includes(v as number) ? (v as number) : d);
  return {
    truce: pick(BALANCE.net.truceChoices, s.truce, cur.truce),
    rounds: pick(C.rounds, s.rounds, cur.rounds), roundS: pick(C.roundS, s.roundS, cur.roundS), lives: pick(C.lives, s.lives, cur.lives),
    ring: pick(C.ring, s.ring, cur.ring), maxPlayers: pick(C.maxPlayers, s.maxPlayers, cur.maxPlayers),
  };
}
