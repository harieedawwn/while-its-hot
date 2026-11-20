import { BALANCE } from '../balance';
import { framesOf } from '../combat/frames';
import { animCode } from '../match/anim-code';
import { FLAG, type NetState, type Snapshot } from './codec';
import type { ClientMsg, ServerMsg } from './protocol';

/**
 * A headless fake player (TECH §4 netbots): chases the nearest player, swings light combos and sends real
 * hit claims the server validates, and now and then places its anvil and forges. Used by tools/netbot.mjs
 * against a real room and by the client's in-process loopback room. Call tick() at 20 Hz with match ms.
 */
export interface BotIO { send(m: ClientMsg): void; state(s: NetState): void }
const RUN = 6, REACH = 2.3, CLOSE = 1.6;

export class NetBot {
  id = 0;
  x = 0; z = 0; y = 0.1; yaw = 0;
  alive = true;
  /** Seconds between swings; forge every `forgeEvery` s for `forgeFor` s. */
  swingEvery = 1.1; forgeEvery = 26; forgeFor = 7;
  hits = 0; rejects = 0; strikes = 0;
  private others = new Map<number, { x: number; z: number; alive: boolean }>();
  private swing = 0; private swingAt = -1e9; private hitSent = true; private combo = 0;
  private t = 0; private forgeT = -1; private strikeN = 0; private lastStrike = 0;
  private parity = false;
  private vx = 0; private vz = 0;

  constructor(private io: BotIO, private k = 0, private rand: () => number = Math.random) { this.t = -k * 3; }

  onMsg(m: ServerMsg): void {
    if (m.t === 'welcome') this.id = m.id;
    else if (m.t === 'match') { const me = m.players.find((p) => p.id === this.id); if (me) { [this.x, this.y, this.z] = me.p; this.yaw = me.yaw; } }
    else if (m.t === 'spawn' && m.id === this.id) { [this.x, this.y, this.z] = m.p; this.alive = true; this.forgeT = -1; }
    else if (m.t === 'kill' && m.tg === this.id) this.alive = false;
    else if (m.t === 'dmg' && m.a === this.id) this.hits++;
    else if (m.t === 'reject') this.rejects++;
    else if (m.t === 'forged' && m.id === this.id) this.strikes++;
  }

  onSnapshot(s: Snapshot): void {
    for (const p of s.players) if (p.id !== this.id) this.others.set(p.id, { x: p.state.x, z: p.state.z, alive: (p.state.flags & (FLAG.dead | FLAG.ghost)) === 0 });
  }

  tick(dt: number, now: number): void {
    this.t += dt;
    if (!this.alive) { this.io.state(this.pack(now, 'dead')); return; }
    if (this.forgeT >= 0) { this.forge(dt, now); return; }
    if (this.t > this.forgeEvery) { this.t = 0; this.startForge(); return; }
    let tgt: [number, { x: number; z: number }] | null = null, best = 1e9;
    for (const [id, o] of this.others) { const d = Math.hypot(o.x - this.x, o.z - this.z); if (o.alive && d < best) { best = d; tgt = [id, o]; } }
    if (tgt) {
      const dx = tgt[1].x - this.x, dz = tgt[1].z - this.z;
      this.yaw = Math.atan2(-dx, -dz);
      const sp = best > CLOSE ? RUN : 0;
      this.vx = (dx / (best || 1)) * sp; this.vz = (dz / (best || 1)) * sp;
      this.x += this.vx * dt; this.z += this.vz * dt;
      if (best < REACH + 0.2 && now - this.swingAt > this.swingEvery * 1000) {
        this.swing++; this.swingAt = now; this.hitSent = false; this.parity = !this.parity;
        this.combo = (this.combo + 1) % 3;
        this.io.send({ t: 'atk', s: this.swing, kind: 'light', combo: this.combo, at: now });
      }
      const f = framesOf('kiem', 'light', this.combo);
      if (!this.hitSent && now - this.swingAt >= (f.w + f.a * 0.5) * 1000) {
        this.hitSent = true;
        if (best <= REACH) this.io.send({ t: 'hit', s: this.swing, tg: tgt[0], zone: 'torso', dist: best, p: [tgt[1].x, 1.2, tgt[1].z], at: now, rt: now - 100 });
      }
    } else { this.vx = this.vz = 0; }
    this.io.state(this.pack(now, 'fight'));
  }

  private startForge(): void {
    this.forgeT = 0; this.strikeN = 0;
    this.io.send({ t: 'anvil', act: 'place', p: [this.x - Math.sin(this.yaw) * 1.15, 0, this.z - Math.cos(this.yaw) * 1.15], yaw: this.yaw });
  }

  private forge(dt: number, now: number): void {
    const was = this.forgeT;
    this.forgeT += dt;
    const on = BALANCE.forge.anvil.placeS + 0.1;
    if (was < on && this.forgeT >= on) { this.io.send({ t: 'forge', op: { k: 'stance', on: true } }); this.io.send({ t: 'forge', op: { k: 'heat', on: true } }); }
    if (this.forgeT > on + 1.2 && now - this.lastStrike > 650) {
      this.lastStrike = now;
      this.io.send({ t: 'forge', op: { k: 'strike', at: now / 1000, n: ++this.strikeN } });
      this.io.send({ t: 'forge', op: { k: 'pick', f: (['kiem', 'bua', 'thuong'] as const)[this.k % 3] } });
    }
    if (this.forgeT > this.forgeFor) {
      this.forgeT = -1;
      this.io.send({ t: 'forge', op: { k: 'stance', on: false } });
      this.io.send({ t: 'anvil', act: 'lift', p: [this.x, 0, this.z], yaw: this.yaw });
    }
    this.io.state(this.pack(now, 'forge'));
  }

  private pack(now: number, mode: 'dead' | 'fight' | 'forge'): NetState {
    const f = framesOf('kiem', 'light', this.combo), e = (now - this.swingAt) / 1000;
    const phase = mode === 'dead' ? 'dead' : e < f.w ? 'windup' : e < f.w + f.a ? 'active' : e < f.w + f.a + f.r ? 'recover' : 'idle';
    const t = phase === 'windup' ? e : phase === 'active' ? e - f.w : phase === 'recover' ? e - f.w - f.a : 0;
    let flags = FLAG.grounded | (this.parity ? FLAG.swing : 0);
    if (mode === 'forge') flags |= FLAG.forging;
    return {
      x: this.x, y: this.y, z: this.z, vx: mode === 'fight' ? this.vx : 0, vy: 0, vz: mode === 'fight' ? this.vz : 0,
      yaw: this.yaw, pitch: 0, anim: animCode({ phase, kind: 'light', combo: this.combo }), animT: t, flags, weapon: 0, level: 0, stamina: 3, armor: 0, hp: 0,
    };
  }
}
