import { BALANCE, DEFAULT_SETTINGS, cleanName, sanitizeSettings } from '@wih/shared';
import type { ErrCode, LobbyPlayer, RoomPhase, RoomSettings } from '@wih/shared';

/** Pure room roster + lobby rules. No sockets, no clocks of its own: the DO passes `now` (ms). */
export interface Member { id: number; name: string; color: number; ready: boolean; token: string; online: boolean; dropAt: number; ping: number }
export interface LobbySave { code: string; phase: RoomPhase; settings: RoomSettings; members: Member[]; nextId: number; emptyAt: number }

export class Lobby {
  code = ''; phase: RoomPhase = 'lobby'; settings: RoomSettings = { ...DEFAULT_SETTINGS };
  members: Member[] = []; nextId = 1;
  /** When the room became empty (ms), 0 while someone is in. Drives the self-destruct alarm. */
  emptyAt = 0;
  constructor(private token: () => string = () => crypto.randomUUID()) {}

  static load(s: LobbySave, token?: () => string): Lobby { const l = new Lobby(token); Object.assign(l, s); return l; }
  save(): LobbySave { return { code: this.code, phase: this.phase, settings: this.settings, members: this.members, nextId: this.nextId, emptyAt: this.emptyAt }; }

  get host(): Member | undefined { return this.members.find((m) => m.online) ?? this.members[0]; }
  byId(id: number) { return this.members.find((m) => m.id === id); }

  /** Join or reconnect. A valid token reclaims its slot; otherwise a new slot if there is room and the match has not begun. */
  join(name: unknown, color: unknown, token: string | undefined, now: number): { m: Member } | { err: ErrCode } {
    const old = token ? this.members.find((m) => m.token === token) : undefined;
    if (old) { old.online = true; old.dropAt = 0; this.emptyAt = 0; return { m: old }; }
    if (this.phase !== 'lobby') return { err: 'started' };
    if (this.members.length >= BALANCE.net.maxPlayers) return { err: 'full' };
    const m: Member = { id: this.nextId++, name: cleanName(name), color: typeof color === 'number' ? Math.max(0, Math.min(15, color | 0)) : 0, ready: false, token: this.token(), online: true, dropAt: 0, ping: 0 };
    this.members.push(m); this.emptyAt = 0; void now; return { m };
  }
  /** Socket lost: keep the slot for the reconnect window (in a lobby the slot just frees on expiry). */
  drop(id: number, now: number): void {
    const m = this.byId(id); if (!m) return;
    m.online = false; m.ready = false; m.dropAt = now + BALANCE.net.reconnectS * 1000; this.checkEmpty(now);
  }
  leave(id: number, now: number): void { this.members = this.members.filter((m) => m.id !== id); this.checkEmpty(now); }
  /** Remove members whose reconnect window ran out. Returns true if the roster changed. */
  expire(now: number): boolean {
    const n = this.members.length;
    this.members = this.members.filter((m) => m.online || m.dropAt > now);
    this.checkEmpty(now); return this.members.length !== n;
  }
  private checkEmpty(now: number): void {
    const any = this.members.some((m) => m.online);
    if (any) this.emptyAt = 0; else if (!this.emptyAt) this.emptyAt = now;
  }
  nextDeadline(): number {
    const d = this.members.filter((m) => !m.online).map((m) => m.dropAt);
    if (this.emptyAt) d.push(this.emptyAt + BALANCE.net.emptyRoomS * 1000);
    return d.length ? Math.min(...d) : 0;
  }
  isDead(now: number): boolean { return !!this.emptyAt && now >= this.emptyAt + BALANCE.net.emptyRoomS * 1000; }

  setReady(id: number, v: boolean): void { const m = this.byId(id); if (m && this.phase === 'lobby') m.ready = !!v; }
  setSettings(id: number, s: Partial<RoomSettings>): ErrCode | null {
    if (this.host?.id !== id) return 'host';
    this.settings = sanitizeSettings(s ?? {}, this.settings); return null;
  }
  start(id: number): ErrCode | null {
    if (this.host?.id !== id) return 'host';
    if (this.phase !== 'lobby') return 'started';
    const on = this.members.filter((m) => m.online);
    if (on.length < 2 || !on.every((m) => m.ready || m.id === id)) return 'bad';
    this.phase = 'match'; return null;
  }
  /** After a match: back to the lobby, nobody ready. */
  reset(): void { this.phase = 'lobby'; for (const m of this.members) m.ready = false; }
  view(): LobbyPlayer[] {
    const h = this.host?.id;
    return this.members.map((m) => ({ id: m.id, name: m.name, color: m.color, ready: m.ready || m.id === h, host: m.id === h, online: m.online, ping: m.ping }));
  }
}
