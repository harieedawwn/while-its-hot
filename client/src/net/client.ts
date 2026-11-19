import { BALANCE, ClockSync } from '@wih/shared';
import type { ClientMsg, ErrCode, LobbyPlayer, MatchServerMsg, RoomPhase, RoomSettings, ServerMsg } from '@wih/shared';
import { loadJson, saveJson } from '../core/store';
import { NO_SIM, simulate, type LinkSim, type SockLike } from './link-sim';

export interface RoomView { phase: RoomPhase; players: LobbyPlayer[]; settings: RoomSettings }
export interface RoomHandlers {
  lobby(v: RoomView, myId: number): void;
  start(): void;
  err(code: ErrCode | 'net'): void;
  /** Link state: 'up' once welcomed, 'retry' while reconnecting, 'down' when given up. */
  link(s: 'up' | 'retry' | 'down'): void;
  binary?(b: ArrayBuffer): void;
  /** Match messages (match-msgs.ts) once the match runs. */
  match?(m: MatchServerMsg): void;
}
export interface RoomOpts { sim?: LinkSim; socket?: (url: string) => SockLike }
const TOKENS = 'wih.room.tokens';

export async function createRoom(base: string): Promise<string> {
  const r = await fetch(`${base}/room`, { method: 'POST' });
  if (!r.ok) throw new Error('create');
  return (await r.json()).code as string;
}
export async function roomExists(base: string, code: string): Promise<boolean> {
  try { return (await fetch(`${base}/room/${code}/exists`)).ok; } catch { return false; }
}

/** One room connection: hello/welcome, 2 s ping + clock sync, auto-reconnect inside the 30 s slot window. */
export class RoomClient {
  readonly clock = new ClockSync();
  id = 0; view: RoomView | null = null;
  private ws: SockLike | null = null;
  private timer = 0; private retries = 0; private closed = false; private lastUp = 0;
  /** Match messages that came while nobody listened (between the lobby's `start` and the match scene). */
  private queue: MatchServerMsg[] = [];
  drain(): MatchServerMsg[] { const q = this.queue; this.queue = []; return q; }
  /** The match scene swaps these in when it takes the room over from the lobby. */
  h: RoomHandlers;
  constructor(private base: string, readonly code: string, private who: { name: string; color: number }, h: RoomHandlers, private o: RoomOpts = {}) { this.h = h; }

  get rtt(): number { return this.clock.rtt; }
  private token(): string | undefined { return loadJson<Record<string, string>>(TOKENS, {})[this.code]; }
  private saveToken(t: string): void { saveJson(TOKENS, { ...loadJson<Record<string, string>>(TOKENS, {}), [this.code]: t }); }

  connect(): void {
    if (this.closed) return;
    const url = `${this.base.replace(/^http/, 'ws')}/room/${this.code}/ws`;
    const ws = simulate(this.o.socket ? this.o.socket(url) : (new WebSocket(url) as unknown as SockLike), this.o.sim ?? NO_SIM);
    ws.binaryType = 'arraybuffer'; this.ws = ws;
    ws.onopen = () => this.send({ t: 'hello', name: this.who.name, color: this.who.color, token: this.token() });
    ws.onmessage = (e) => {
      if (typeof e.data !== 'string') return this.h.binary?.(e.data as ArrayBuffer);
      let m: ServerMsg; try { m = JSON.parse(e.data); } catch { return; }
      if (m.t === 'welcome') { this.id = m.id; this.saveToken(m.token); this.retries = 0; this.lastUp = performance.now(); this.h.link('up'); this.startPing(); }
      else if (m.t === 'lobby') { this.view = { phase: m.phase, players: m.players, settings: m.settings }; this.h.lobby(this.view, this.id); }
      else if (m.t === 'pong') { this.clock.add(m.c, m.s, Date.now()); this.send({ t: 'rtt', v: Math.round(this.clock.rtt) }); }
      else if (m.t === 'start') this.h.start();
      else if (m.t === 'err') { if (m.code === 'full' || m.code === 'started' || m.code === 'closed') this.closed = true; this.h.err(m.code); }
      else if (this.h.match) this.h.match(m); else if (this.queue.length < 64) this.queue.push(m);
    };
    ws.onclose = () => {
      clearInterval(this.timer);
      if (this.closed) return this.h.link('down');
      const away = this.lastUp ? performance.now() - this.lastUp : 0;
      if (this.retries++ > 12 || (this.lastUp && away > BALANCE.net.reconnectS * 1000)) { this.closed = true; this.h.link('down'); this.h.err('net'); return; }
      this.h.link('retry'); setTimeout(() => this.connect(), 800 + this.retries * 400);
    };
    ws.onerror = () => { /* onclose follows */ };
  }
  private startPing(): void {
    clearInterval(this.timer);
    const ping = () => { this.lastUp = performance.now(); this.send({ t: 'ping', c: Date.now() }); };
    ping(); this.timer = window.setInterval(ping, BALANCE.net.pingEveryS * 1000);
  }
  send(m: ClientMsg): void { if (this.ws?.readyState === 1) this.ws.send(JSON.stringify(m)); }
  sendBinary(b: ArrayBuffer): void { if (this.ws?.readyState === 1) this.ws.send(b); }
  close(): void { this.closed = true; clearInterval(this.timer); this.ws?.close(); }
}

/** The room this tab is in (lobby → match share it). */
export const room: { current: RoomClient | null } = { current: null };
