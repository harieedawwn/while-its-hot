import { BALANCE } from '../balance';
import { WEAPON_IDS, passivesOf } from '../data/weapons';
import { forgeSync } from '../forge/sync';
import type { RandFn } from '../forge/session';
import { RoundFlow } from './flow';
import { FLAG, type NetState, type Snapshot } from '../net/codec';
import type { ForgeOp, MatchClientMsg, MatchServerMsg, Vec3 } from '../net/match-msgs';
import type { ServerMsg } from '../net/protocol';
import { slamEffects } from '../passives';
import { SAFE_RESPAWN } from '../world/arenas/foundry';
import { knockFrom, serverEffects } from './effects';
import { deathLoss, forgeOp, forgeTick, leaveStance } from './forge-auth';
import { claimHit, recordSwing, type HitCtx } from './hits';
import { flatDist, newPlayer, type MPlayer, type Out } from './mplayer';
import { Pickups } from './pickups';

export type { Out } from './mplayer';
export { parryOk, checkClaim } from './hits';

/**
 * The match on the server (TECH §4), pure: no sockets, no clocks. The room passes match ms (`now`) and a
 * seeded RNG; every call returns the messages to send. Movement is the clients'; hits, forging, pickups,
 * deaths and respawns are decided here. Rounds, lives and scoring are phase 18.
 */
const M = BALANCE.match, C = BALANCE.combat;
const SPAWN_Y = 0.1;

export class MatchAuthority {
  readonly players = new Map<number, MPlayer>();
  pickups: Pickups;
  readonly flow: RoundFlow;
  private now = 0;
  private last = 0;
  private ctx: HitCtx;
  /** Messages produced before the first tick (the first cage). */
  private pending: Out[] = [];

  /** `skipCage`: dev scenes and tests start straight in the fight (no draft, no countdown). */
  constructor(ids: readonly number[], truceS: number, private rand: RandFn, now = 0, skipCage = false) {
    this.now = now;
    const order = SAFE_RESPAWN.map((_, i) => i).sort(() => rand() - 0.5);
    ids.forEach((id, i) => {
      const [x, z] = SAFE_RESPAWN[order[i % order.length]];
      this.players.set(id, newPlayer(id, [x, SPAWN_Y, z], Math.atan2(x, z), rand));
    });
    this.pickups = new Pickups(ids.length, now, rand);
    const flow = this.flow = new RoundFlow(this.players, truceS, rand, (t, d, by, out) => this.harm(t, d, by, out), (n, out) => this.fightStarts(n, out));
    this.ctx = { list: [...this.players.values()], get truceUntil() { return flow.truceUntil(); }, harm: (t, d, by, out) => this.harm(t, d, by, out) };
    flow.start(now, this.pending, skipCage);
  }

  /** The fight opens: a fresh pedestal of blanks replaces whatever lay around. */
  private fightStarts(now: number, out: Out[]): void {
    const old = this.pickups.list.map((k) => k.id);
    this.pickups = new Pickups(this.players.size, now, this.rand);
    out.push({ to: 'all', m: { t: 'pickup', add: this.pickups.list.slice(), del: old, by: 0 } });
  }

  /** Draft offers and own relics for a (re)connecting player. */
  extras(id: number): ServerMsg[] {
    const p = this.players.get(id);
    if (!p) return [];
    const o: ServerMsg[] = [{ t: 'own', relics: p.relics.slice() }];
    if (p.offer) o.push({ t: 'offer', ids: p.offer, rerolls: p.rerolls });
    return o;
  }

  /** Full state for one player (match start, reconnect). */
  init(id: number): MatchServerMsg | null {
    const me = this.players.get(id);
    if (!me) return null;
    return {
      t: 'match', t0: 0, now: this.now, truce: this.flow.truceEnd, f: this.flow.net(), rows: this.flow.rows(),
      players: [...this.players.values()].map((p) => ({ id: p.id, hp: p.hp, alive: p.alive, p: [p.st.x, p.st.y, p.st.z] as Vec3, yaw: p.st.yaw })),
      anvils: [...this.players.values()].filter((p) => p.anvil).map((p) => ({ id: p.id, p: p.anvil!.p, yaw: p.anvil!.yaw })),
      pickups: this.pickups.list.slice(), you: forgeSync(me.forge),
    };
  }

  setOnline(id: number, on: boolean): void { const p = this.players.get(id); if (p) { p.online = on; if (!on) leaveStance(p); } }
  setRtt(id: number, rtt: number): void { const p = this.players.get(id); if (p) p.rtt = Math.max(0, rtt); }

  /** A State from a client: movement is trusted; dead players stay where they fell. */
  state(id: number, s: NetState): void {
    const p = this.players.get(id);
    if (p && p.alive && this.flow.fighting) p.st = s;
  }

  msg(id: number, m: MatchClientMsg, now: number): Out[] {
    this.now = now;
    const p = this.players.get(id), out: Out[] = [];
    if (!p) return out;
    switch (m.t) {
      case 'atk': recordSwing(p, m); break;
      case 'hit': { const t = this.players.get(m.tg); if (t) claimHit(this.ctx, p, t, m, now, out); break; }
      case 'parry': if (p.alive) p.parryAt = m.at; break;
      case 'dash': if (p.alive) p.dashAt = m.at; break;
      case 'slam': this.slam(p, out); break;
      case 'forge': this.forge(p, m.op, out); break;
      case 'anvil': this.anvil(p, m, out); break;
      case 'take': if (this.flow.fighting) this.pickups.take(p, m.id, out); break;
      case 'draft': this.flow.draft(p, m, out); break;
    }
    return out;
  }

  private forge(p: MPlayer, op: ForgeOp, out: Out[]): void {
    if (!this.flow.fighting) return;
    const was = p.stance;
    forgeOp(p, op, out, this.ctx.list);
    if (was && !p.stance && p.fx.stanceIframeS > 0) p.ifUntil = this.now + p.fx.stanceIframeS * 1000;
  }

  private slam(p: MPlayer, out: Out[]): void {
    if (!p.alive) return;
    for (const o of this.players.values()) {
      if (o === p || !o.alive || !o.online || flatDist(o, p) > BALANCE.move.slam.knockR) continue;
      out.push({ to: o.id, m: { t: 'knock', kn: knockFrom(p.st.x, p.st.z, o, C.slamKnock, C.slamLift) } });
    }
    serverEffects(p, p, slamEffects(passivesOf(p.forge.form)), [0, 0, 0], this.ctx.list, this.ctx.harm, out);
  }

  private anvil(p: MPlayer, m: Extract<MatchClientMsg, { t: 'anvil' }>, out: Out[]): void {
    if (m.act === 'place') {
      if (!this.flow.fighting || !p.alive || Math.hypot(m.p[0] - p.st.x, m.p[2] - p.st.z) > BALANCE.forge.anvil.placeDist + BALANCE.net.auth.anvilTol) return;
      p.anvil = { p: [m.p[0], m.p[1], m.p[2]], yaw: m.yaw };
    } else { if (!p.anvil) return; leaveStance(p); p.anvil = null; }
    out.push({ to: 'all', m: { t: 'anvil', id: p.id, act: m.act, p: m.p, yaw: m.yaw } });
  }

  /** Damage without defense (and the tail of every melee hit): kill, death loss, respawn timer. */
  private harm(t: MPlayer, dmg: number, by: number, out: Out[]): void {
    if (!t.alive) return;
    t.hp = Math.max(0, t.hp - dmg);
    const a = this.players.get(by);
    if (a && a !== t) { a.dealt += dmg; a.rDealt += dmg; }
    if (t.hp > 0) return;
    t.alive = false; t.spawnAt = this.now + M.respawnS * 1000; t.burnT = 0; t.swings.length = 0;
    if (a && a !== t) a.kills++;
    deathLoss(t);
    this.flow.onKill(t, a, out);
    out.push({ to: 'all', m: { t: 'kill', tg: t.id, by } }, { to: t.id, m: { t: 'fsync', s: forgeSync(t.forge) } });
  }

  /** A safe edge point away from everyone alive (best of a few random picks). */
  private spawnPoint(): Vec3 {
    let best: Vec3 = [0, SPAWN_Y, 0], bestD = -1;
    for (let i = 0; i < 6; i++) {
      const [x, z] = SAFE_RESPAWN[Math.floor(this.rand() * SAFE_RESPAWN.length)];
      let d = 1e9;
      for (const o of this.players.values()) if (o.alive) d = Math.min(d, Math.hypot(o.st.x - x, o.st.z - z));
      if (d > bestD) { bestD = d; best = [x, SPAWN_Y, z]; }
    }
    return best;
  }

  /** Server tick (20 Hz): burn, forging, respawns, rack blanks. */
  tick(now: number): Out[] {
    this.now = now;
    const dt = Math.max(0, Math.min(0.25, (now - this.last) / 1000)), out: Out[] = this.pending;
    this.pending = [];
    this.last = now;
    this.flow.tick(now, out);
    for (const p of this.players.values()) {
      if (p.alive && p.burnT > 0) { p.burnT -= dt; this.harm(p, p.burnDps * dt, p.burnBy, out); }
      if (p.alive) forgeTick(p, dt, out);
      else if (now >= p.spawnAt && this.flow.canRespawn(p)) {
        const s = this.spawnPoint(), yaw = Math.atan2(s[0], s[2]);
        p.alive = true; p.hp = C.hp; p.parryAt = p.dashAt = -1e9;
        Object.assign(p.st, { x: s[0], y: s[1], z: s[2], vx: 0, vy: 0, vz: 0, yaw });
        out.push({ to: 'all', m: { t: 'spawn', id: p.id, p: s, yaw, hp: p.hp } });
      }
    }
    if (this.flow.fighting) this.pickups.tick(now, out);
    return out;
  }

  /** Everyone online with the authoritative weapon, level, armor, hp and alive/forging flags. */
  snapshot(now: number): Snapshot {
    const players = [];
    for (const p of this.players.values()) {
      if (!p.online) continue;
      const f = p.forge;
      let flags = p.st.flags & ~(FLAG.dead | FLAG.forging);
      if (!p.alive) flags |= FLAG.dead;
      if (p.stance) flags |= FLAG.forging;
      players.push({ id: p.id, state: { ...p.st, flags, weapon: Math.max(0, WEAPON_IDS.indexOf(f.form.id)), level: f.blade.level, armor: f.armor, hp: p.hp } });
    }
    return { serverTime: Math.max(0, Math.round(now)) >>> 0, players };
  }
}
