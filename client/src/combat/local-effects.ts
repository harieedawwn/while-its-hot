import { type Atom, type AtomFx, BALANCE, type EBody, EffectWorld, type Ent, type ESink, type StatusKind, type Vec3 } from '@wih/shared';
import { bus } from '../core/events';
import { blinkTo } from '../player/blink';
import { pushMove } from '../player/move-state';
import type { Combatant } from './combatant';

/**
 * Offline form effects (phase 28): the shared EffectWorld over the local combatants. The server runs the same
 * world (match/effect-sink.ts); online this one is switched off and entities arrive in snapshots (`netEnts`).
 */
class LocalSink implements ESink {
  constructor(private list: readonly Combatant[]) {}
  private c(t: EBody): Combatant | undefined { return this.list.find((c) => c.id === t.id); }

  bodies(): EBody[] {
    return this.list.map((c) => {
      const p = c.body.s.pos;
      return { id: c.id, team: c.team, x: p.x, y: p.y, z: p.z, yaw: c.yaw, pitch: c.pitch, alive: c.alive, passives: c.passives, sliding: c.body.s.sliding, swinging: c.fighter.attacking };
    });
  }
  hurtable(t: EBody): boolean { const c = this.c(t); return !!c && c.alive && !c.view().immune; }
  damage(t: EBody, dmg: number, by: number, k: string): void {
    const c = this.c(t);
    if (!c || !c.alive) return;
    c.hp -= dmg;
    const p = c.body.s.pos;
    bus.emit('fx:dmg', { target: c.id, by, dmg, k, x: p.x, y: p.y + 1.1, z: p.z });
    if (c.hp <= 0 && !c.netOwned) { c.hp = 0; c.fighter.kill(); bus.emit('combat:kill', { target: c.id, by, x: p.x, y: p.y, z: p.z }); }
  }
  knock(t: EBody, v: Vec3, ps?: number, bounce?: boolean): void {
    const c = this.c(t);
    if (!c) return;
    pushMove(c.body.s, v[0], v[2], ps ?? BALANCE.combat.pushS, v[1]);
    if (bounce) c.body.s.af.bounceT = ps ?? 1;
  }
  status(t: EBody, k: StatusKind, s: number, v: number, p?: Vec3): void { this.c(t)?.status(k, s, v, p); }
  burn(t: EBody, dps: number, s: number): void {
    const c = this.c(t);
    if (!c || (c.burnT > 0 && c.burnDps > dps)) return;
    c.burnT = Math.max(c.burnT, s); c.burnDps = dps;
  }
  heal(t: EBody, hp: number): void { const c = this.c(t); if (c?.alive) c.hp = Math.min(BALANCE.combat.hp, c.hp + hp); }
  teleport(t: EBody, p: Vec3, yaw: number): void { const c = this.c(t); if (c) blinkTo(c.body, p[0], p[1], p[2], yaw); }
  fx(a: AtomFx): void { bus.emit('fx:atom', a); }
}

export class LocalEffects {
  readonly world: EffectWorld;
  /** Online: false (the server owns effects); entities then come from snapshots. */
  on = true;
  /** Snapshot entities (online) and the time they arrived (performance seconds). */
  netEnts: Ent[] = [];
  netAt = 0;
  private sink: LocalSink;

  constructor(list: readonly Combatant[]) {
    this.sink = new LocalSink(list);
    this.world = new EffectWorld(this.sink);
  }

  private eb(c: Combatant): EBody | null { return this.sink.bodies().find((b) => b.id === c.id) ?? null; }

  swing(c: Combatant, delayS: number): void {
    const b = this.on && this.eb(c);
    if (b) this.world.swing(b, c.fighter.kind, c.fighter.combo, delayS);
  }
  apply(src: Combatant, t: Combatant | null, a: Atom): void {
    const b = this.on && this.eb(src);
    if (b) this.world.apply(b, t && t !== src ? this.eb(t) : null, a);
  }
  tick(dt: number): void { if (this.on) this.world.tick(dt); }

  /** What to draw: the local world, or the latest snapshot's entities aged by the time since it arrived. */
  ents(nowS: number): Ent[] {
    if (this.on) return this.world.ents();
    const dt = Math.max(0, Math.min(0.25, nowS - this.netAt));
    return this.netEnts.map((e) => ({ ...e, x: e.x + e.vx * dt, y: e.y + e.vy * dt, z: e.z + e.vz * dt, age: e.age + dt }));
  }
  clear(): void { this.world.clear(); this.netEnts = []; }
}
