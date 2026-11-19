import { BALANCE } from '../balance';
import type { MatchClientMsg, MatchServerMsg } from './match-msgs';

/** Lobby/control messages are JSON; State/Snapshot are binary (codec.ts). */
export type RoomPhase = 'lobby' | 'match';
export interface RoomSettings { truce: number }
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

export const DEFAULT_SETTINGS: RoomSettings = { truce: BALANCE.net.truceDefault };

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
  const truce = (BALANCE.net.truceChoices as readonly number[]).includes(s.truce as number) ? (s.truce as number) : cur.truce;
  return { truce };
}
