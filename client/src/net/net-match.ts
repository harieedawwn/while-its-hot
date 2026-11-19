import type * as THREE from 'three';
import { applyForgeSync, type ClientMsg, decodeSnapshot, encodeState, type ForgeSession, type MatchServerMsg, MSG_SNAPSHOT, type Vec3 } from '@wih/shared';
import type { CombatWorld } from '../combat/combat-world';
import type { LocalFighter } from '../combat/local-fighter';
import { bus } from '../core/events';
import type { Anvil } from '../forge/anvil';
import type { ForgeStage } from '../forge/stage';
import type { CollisionWorld } from '../physics/world';
import type { Player } from '../player/player';
import type { LightRig } from '../render/lights';
import type { MaterialLib } from '../render/materials/library';
import { STR } from '../ui/strings.vi';
import type { Hud } from '../ui/hud/hud';
import type { RoomClient } from './client';
import { NetAnvils } from './net-anvils';
import { NetCombat } from './net-combat';
import { NetForge } from './net-forge';
import { emptyState, packLocal } from './pack';
import { NetPickups } from './pickups';
import { Remotes } from './remotes';

export interface NetMatchDeps {
  room: RoomClient; scene: THREE.Scene; combat: CombatWorld; collision: CollisionWorld; lib: MaterialLib; rig: LightRig;
  load(id: string): Promise<THREE.Object3D>;
  lf: LocalFighter; player: Player; session: ForgeSession; stage: ForgeStage; anvil: Anvil; hud: Hud;
  /** Is the local smith in the forging stance (State flag). */
  forging(): boolean;
  died(): void;
  spawned(p: Vec3, yaw: number): void;
}

/** Sim ticks per State sent (60 Hz sim → 20 Hz uplink). */
const SEND_EVERY = 3;

/**
 * The client side of a running match (TECH §4): takes the room over from the lobby, keeps match time
 * (server clock − match start), streams our State at 20 Hz, feeds snapshots to the remotes and routes the
 * room's events to combat, forging, anvils and blanks. Our own gameplay events become room messages here.
 */
export class NetMatch {
  t0 = 0;
  started = false;
  truce = 0;
  link = 'up';
  readonly remotes: Remotes;
  readonly anvils: NetAnvils;
  readonly pickups: NetPickups;
  readonly combat: NetCombat;
  readonly forge: NetForge;
  private st = emptyState();
  private ticks = 0;
  /** Match ms of the current sim tick: steps with the fixed step (so a burst of catch-up ticks keeps its spacing), re-anchored on drift. */
  private simMs = 0;
  private offs: (() => void)[];

  constructor(private d: NetMatchDeps) {
    const color = (id: number) => d.room.view?.players.find((p) => p.id === id)?.color ?? id;
    this.remotes = new Remotes(d.scene, d.combat, d.collision, d.lib, d.load, color);
    this.anvils = new NetAnvils(d.scene, d.lib, d.rig, d.collision, color);
    this.pickups = new NetPickups(d.scene, d.load);
    this.combat = new NetCombat({
      lf: d.lf, world: d.combat, remotes: this.remotes, hud: d.hud, me: () => this.me, send: (m) => this.send(m),
      now: () => this.simMs, renderT: () => this.renderT(), name: (id) => this.name(id), died: d.died, spawned: d.spawned,
    });
    this.forge = new NetForge((m) => this.send(m), d.session, d.stage, this.anvils, () => this.me);
    d.combat.resolver = this.combat;
    d.lf.c.netOwned = true;
    const h = d.room.h;
    d.room.h = {
      lobby: () => { /* names/colors are read from room.view on demand */ },
      start: () => { /* the `match` message carries everything */ },
      err: h.err, link: (s) => { this.link = s; h.link(s); },
      binary: (b) => this.onBinary(b), match: (m) => this.onMsg(m),
    };
    for (const m of d.room.drain()) this.onMsg(m);
    const lc = d.lf.c;
    this.offs = [
      bus.on('combat:swing', (e) => { if (e.id === 0) this.send({ t: 'atk', s: lc.fighter.swingId, kind: e.kind, combo: e.combo, at: this.simMs }); }),
      bus.on('combat:guard', (e) => { if (e.id === 0 && e.act === 'parry') this.send({ t: 'parry', at: this.simMs }); }),
      bus.on('move:dash', () => this.send({ t: 'dash', at: this.simMs })),
      bus.on('move:slam', (e) => this.send({ t: 'slam', p: [e.x, e.y, e.z] })),
      bus.on('forge:anvil', (e) => {
        if (e.owner !== 0 || e.act === 'placed') return;
        this.send({ t: 'anvil', act: e.act, p: [e.x, e.y, e.z], yaw: d.anvil.yaw });
      }),
    ];
  }

  get me(): number { return this.d.room.id; }
  /** Match ms on the server clock. */
  now(): number { return this.d.room.clock.serverNow(Date.now()) - this.t0; }
  /** The time remote players are drawn at (sim side: the tick's own time). */
  renderT(): number { return this.simMs - this.remotes.jitter.delay; }
  name(id: number): string { return this.d.room.view?.players.find((p) => p.id === id)?.name ?? STR.profile.defaultName; }
  get rtt(): number { return this.d.room.rtt; }
  /** Seconds of truce left (0 when fighting). */
  get truceLeft(): number { return this.started ? Math.max(0, (this.truce - this.now()) / 1000) : 0; }

  send(m: ClientMsg): void { this.d.room.send(m); }
  take(id: number): void { this.send({ t: 'take', id }); }

  private onBinary(b: ArrayBuffer): void {
    if (!this.started || new DataView(b).getUint8(0) !== MSG_SNAPSHOT) return;
    const s = decodeSnapshot(b);
    if (!s) return;
    this.remotes.me = this.me;
    this.remotes.snapshot(s, this.now());
    const mine = s.players.find((p) => p.id === this.me);
    if (mine && this.d.lf.c.alive) this.d.lf.c.hp = mine.state.hp;
  }

  private onMsg(m: MatchServerMsg): void {
    switch (m.t) {
      case 'match': {
        this.t0 = m.t0; this.truce = m.truce; this.started = true;
        const me = m.players.find((p) => p.id === this.me);
        if (me) this.d.spawned(me.p, me.yaw);
        for (const a of m.anvils) if (a.id !== this.me) this.anvils.place(a.id, a.p, a.yaw, true);
        this.pickups.set(m.pickups);
        applyForgeSync(this.d.session, m.you, true);
        void this.forge.controller?.syncWeapon(true);
        break;
      }
      case 'anvil': if (m.id !== this.me) { if (m.act === 'place') this.anvils.place(m.id, m.p, m.yaw); else this.anvils.lift(m.id); } break;
      case 'pickup': for (const id of m.del) this.pickups.del(id); this.pickups.add(m.add); break;
      case 'forged': case 'fsync': this.forge.onMsg(m); break;
      default: this.combat.onMsg(m);
    }
  }

  /** Per sim tick, BEFORE combat.tick: remotes at the render time (the sweeps hit what we see), uplink. */
  simTick(dt: number): void {
    if (!this.started) return;
    const now = this.now();
    this.simMs += dt * 1000;
    if (Math.abs(this.simMs - now) > 200) this.simMs = now;
    this.remotes.apply(this.renderT());
    this.anvils.tick(dt);
    this.forge.tick();
    if (++this.ticks % SEND_EVERY === 0) this.d.room.sendBinary(encodeState(packLocal(this.d.lf.c, this.d.forging(), this.st)));
  }

  /** Per render frame. */
  frame(dt: number, frozen: boolean): void {
    this.remotes.jitter.update(dt);
    if (this.started) this.remotes.apply(this.now() - this.remotes.jitter.delay);
    this.remotes.render(dt, frozen);
    this.anvils.animate();
  }

  dispose(): void { this.offs.forEach((o) => o()); this.remotes.dispose(); this.anvils.dispose(); this.pickups.dispose(); }
}
