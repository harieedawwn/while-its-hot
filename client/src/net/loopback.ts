import { decodeState, encodeSnapshot, DEFAULT_SETTINGS, MatchAuthority, MSG_STATE, NetBot, PLAYER_COLORS, type ClientMsg, type LobbyPlayer, type MatchClientMsg, type Out, type ServerMsg, type Vec3 } from '@wih/shared';
import type { SockLike } from './link-sim';

/**
 * An in-process room for dev scenes and screenshots (`?scene=net` without a code): the real MatchAuthority
 * and NetBots behind a fake socket, so the client runs the exact online code path, `?lag=` included.
 * `near` puts the bots in an arc in front of our spawn (shots); otherwise they spawn like a real match.
 */
export interface LoopOpts { bots: number; truce: number; seed: number; near?: { p: Vec3; yaw: number }; passive?: boolean; /** Skip the cage countdown and draft (default: run them). */ skipCage?: boolean }
const ME = 1;

export class Loopback {
  private auth: MatchAuthority | null = null;
  private bots: NetBot[] = [];
  private t0 = 0;
  private timer = 0;
  private client: SockLike | null = null;

  constructor(private o: LoopOpts) {}
  /** The room's match (dev previews poke it). */
  get authority(): MatchAuthority | null { return this.auth; }

  /** The socket RoomClient opens (any url). */
  socket = (): SockLike => {
    const sock: SockLike = {
      readyState: 0, binaryType: 'arraybuffer', onopen: null, onmessage: null, onclose: null, onerror: null,
      send: (d) => this.receive(d),
      close: () => { sock.readyState = 3; this.stop(); sock.onclose?.(); },
    };
    this.client = sock;
    setTimeout(() => { sock.readyState = 1; sock.onopen?.(); }, 0);
    return sock;
  };

  private toClient(m: ServerMsg | ArrayBuffer): void {
    const c = this.client;
    if (c && c.readyState === 1) c.onmessage?.({ data: m instanceof ArrayBuffer ? m : JSON.stringify(m) });
  }

  private get mt(): number { return Date.now() - this.t0; }

  private receive(d: string | ArrayBuffer): void {
    if (typeof d !== 'string') {
      if (this.auth && new DataView(d).getUint8(0) === MSG_STATE) { const s = decodeState(d); if (s) this.auth.state(ME, s); }
      return;
    }
    const m = JSON.parse(d) as ClientMsg;
    if (m.t === 'hello') this.begin(m.name, m.color);
    else if (m.t === 'ping') this.toClient({ t: 'pong', c: m.c, s: Date.now() });
    else if (m.t === 'rtt') this.auth?.setRtt(ME, m.v);
    else if (this.auth && m.t !== 'ready' && m.t !== 'settings' && m.t !== 'start') this.route(this.auth.msg(ME, m, this.mt));
  }

  private begin(name: string, color: number): void {
    const n = this.o.bots, players: LobbyPlayer[] = [{ id: ME, name, color, ready: true, host: true, online: true, ping: 0 }];
    let s = this.o.seed * 7919 + 1;
    const rand = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    for (let i = 0; i < n; i++) players.push({ id: ME + 1 + i, name: `Bot ${i + 1}`, color: (color + 1 + i) % PLAYER_COLORS.length, ready: true, host: false, online: true, ping: 0 });
    this.toClient({ t: 'welcome', id: ME, token: 'loop', code: 'LOOP' });
    this.toClient({ t: 'lobby', phase: 'match', players, settings: { ...DEFAULT_SETTINGS, truce: this.o.truce } });
    this.toClient({ t: 'start' });
    this.t0 = Date.now();
    const auth = this.auth = new MatchAuthority(players.map((p) => p.id), this.o.truce, rand, 0, !!this.o.skipCage);
    if (this.o.near) this.placeNear(this.o.near.p, this.o.near.yaw);
    for (let i = 0; i < n; i++) {
      const id = ME + 1 + i;
      const b = new NetBot({ send: (m) => this.route(auth.msg(id, m as MatchClientMsg, this.mt)), state: (st) => auth.state(id, st) }, i, rand);
      b.id = id;
      if (this.o.passive) { b.swingEvery = 1e9; b.forgeEvery = 1e9; }
      b.onMsg(auth.init(id)!);
      this.bots.push(b);
    }
    const init = auth.init(ME);
    if (init && init.t === 'match') this.toClient({ ...init, t0: this.t0 });
    this.timer = window.setInterval(() => this.tick(), 50);
  }

  private placeNear(p: Vec3, yaw: number): void {
    const a = this.auth!, fx = -Math.sin(yaw), fz = -Math.cos(yaw);
    Object.assign(a.players.get(ME)!.st, { x: p[0], y: p[1], z: p[2], yaw });
    for (let i = 0; i < this.o.bots; i++) {
      const u = (i - (this.o.bots - 1) / 2) * 1.6, x = p[0] + fx * 4.5 + fz * u, z = p[2] + fz * 4.5 - fx * u;
      Object.assign(a.players.get(ME + 1 + i)!.st, { x, y: p[1], z, yaw: yaw + Math.PI });
    }
  }

  private route(outs: Out[]): void {
    for (const o of outs) {
      if (o.to === 'all' || o.to === ME) this.toClient(o.m);
      for (const b of this.bots) if (o.to === 'all' || o.to === b.id) b.onMsg(o.m);
    }
  }

  private tick(): void {
    const a = this.auth;
    if (!a) return;
    const now = this.mt;
    for (const b of this.bots) b.tick(0.05, now);
    this.route(a.tick(now));
    const snap = a.snapshot(now), buf = encodeSnapshot(snap);
    for (const b of this.bots) b.onSnapshot(snap);
    this.toClient(buf);
  }

  stop(): void { clearInterval(this.timer); this.auth = null; }
}
