import { DurableObject } from 'cloudflare:workers';
import { BALANCE, MSG_STATE, MSG_SNAPSHOT, decodeState, encodeSnapshot, validCode } from '@wih/shared';
import type { ClientMsg, ErrCode, NetState, ServerMsg } from '@wih/shared';
import { Lobby, type LobbySave } from './lobby';
import type { Env } from './worker';

interface Att { id: number }
/** One room = one Durable Object. Lobby hibernates; a running match keeps a 20 Hz relay tick. */
export class Room extends DurableObject<Env> {
  private lobby = new Lobby();
  private states = new Map<number, NetState>();
  private tick: ReturnType<typeof setInterval> | null = null;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    ctx.blockConcurrencyWhile(async () => {
      const s = await ctx.storage.get<LobbySave>('lobby');
      if (s) { this.lobby = Lobby.load(s); if (this.lobby.phase === 'match') this.startTick(); }
    });
  }

  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);
    if (url.pathname === '/init') {
      const code = url.searchParams.get('code') ?? '';
      if (!validCode(code) || this.lobby.code) return new Response('taken', { status: 409 });
      this.lobby.code = code; this.lobby.emptyAt = Date.now(); await this.persist(); return new Response('ok');
    }
    if (!this.lobby.code) return new Response('no room', { status: 404 });
    if (req.headers.get('Upgrade') !== 'websocket') return new Response('expected websocket', { status: 426 });
    const pair = new WebSocketPair();
    this.ctx.acceptWebSocket(pair[1]);
    return new Response(null, { status: 101, webSocket: pair[0] });
  }

  private send(ws: WebSocket, m: ServerMsg): void { try { ws.send(JSON.stringify(m)); } catch { /* closing */ } }
  private err(ws: WebSocket, code: ErrCode): void { this.send(ws, { t: 'err', code }); }
  private broadcastLobby(): void {
    const m: ServerMsg = { t: 'lobby', phase: this.lobby.phase, players: this.lobby.view(), settings: this.lobby.settings };
    const s = JSON.stringify(m); for (const w of this.ctx.getWebSockets()) { try { w.send(s); } catch { /* closing */ } }
  }
  private async persist(): Promise<void> {
    await this.ctx.storage.put('lobby', this.lobby.save());
    const d = this.lobby.nextDeadline(); if (d) await this.ctx.storage.setAlarm(d); else await this.ctx.storage.deleteAlarm();
  }
  private id(ws: WebSocket): number { return (ws.deserializeAttachment() as Att | null)?.id ?? 0; }

  async webSocketMessage(ws: WebSocket, data: string | ArrayBuffer): Promise<void> {
    const now = Date.now(), id = this.id(ws);
    if (typeof data !== 'string') {
      if (!id || this.lobby.phase !== 'match') return;
      if (new DataView(data).getUint8(0) === MSG_STATE) { const s = decodeState(data); if (s) this.states.set(id, s); }
      return;
    }
    let m: ClientMsg; try { m = JSON.parse(data); } catch { return this.err(ws, 'bad'); }
    if (m.t === 'ping') return this.send(ws, { t: 'pong', c: m.c, s: now });
    if (m.t === 'hello') {
      if (id) return;
      const r = this.lobby.join(m.name, m.color, m.token, now);
      if ('err' in r) { this.err(ws, r.err); return ws.close(1000, r.err); }
      for (const w of this.ctx.getWebSockets()) if (w !== ws && this.id(w) === r.m.id) { try { w.close(1000, 'replaced'); } catch { /* gone */ } }
      ws.serializeAttachment({ id: r.m.id } satisfies Att);
      this.send(ws, { t: 'welcome', id: r.m.id, token: r.m.token, code: this.lobby.code });
      this.broadcastLobby(); await this.persist(); return;
    }
    if (!id) return this.err(ws, 'bad');
    if (m.t === 'rtt') { const p = this.lobby.byId(id); if (p) p.ping = Math.max(0, Math.min(999, m.v | 0)); return; }
    if (m.t === 'ready') this.lobby.setReady(id, m.v);
    else if (m.t === 'settings') { const e = this.lobby.setSettings(id, m.s); if (e) return this.err(ws, e); }
    else if (m.t === 'start') {
      const e = this.lobby.start(id); if (e) return this.err(ws, e);
      const s = JSON.stringify({ t: 'start' } satisfies ServerMsg); for (const w of this.ctx.getWebSockets()) w.send(s);
      this.startTick();
    }
    this.broadcastLobby(); await this.persist();
  }

  async webSocketClose(ws: WebSocket): Promise<void> { await this.gone(ws); }
  async webSocketError(ws: WebSocket): Promise<void> { await this.gone(ws); }
  private async gone(ws: WebSocket): Promise<void> {
    const id = this.id(ws); if (!id) return;
    if (this.ctx.getWebSockets().some((w) => w !== ws && this.id(w) === id)) return; // replaced by a reconnect
    this.lobby.drop(id, Date.now()); this.states.delete(id);
    this.broadcastLobby(); await this.persist();
  }

  async alarm(): Promise<void> {
    const now = Date.now();
    if (this.lobby.isDead(now)) { this.stopTick(); await this.ctx.storage.deleteAll(); this.lobby = new Lobby(); return; }
    if (this.lobby.expire(now)) this.broadcastLobby();
    await this.persist();
  }

  private startTick(): void {
    if (this.tick) return;
    this.tick = setInterval(() => {
      const ws = this.ctx.getWebSockets(); if (!ws.length) return this.stopTick();
      const players = [...this.states].map(([id, state]) => ({ id, state }));
      if (!players.length) return;
      const buf = encodeSnapshot({ serverTime: Date.now() >>> 0, players }); void MSG_SNAPSHOT;
      for (const w of ws) { try { w.send(buf); } catch { /* closing */ } }
    }, 1000 / BALANCE.net.tickHz);
  }
  private stopTick(): void { if (this.tick) clearInterval(this.tick); this.tick = null; }
}
