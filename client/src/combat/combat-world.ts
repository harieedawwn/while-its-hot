import { attackShape, BALANCE, slamEffects, swingFrame, sweepHit } from '@wih/shared';
import { bus } from '../core/events';
import { pushMove } from '../player/move-state';
import type { Combatant } from './combatant';
import { applyEffects, type HitResolver, knock, LocalResolver } from './resolver';

/**
 * The local melee world: every combatant, the per-tick blade sweeps and the fighter events turned into
 * bus events and lunges. Order per sim tick: owners call combatant.tick (intent) → bodies move → world.tick.
 * Hits go through a HitResolver (LocalResolver offline; a network resolver later).
 */
export class CombatWorld {
  readonly list: Combatant[] = [];
  resolver: HitResolver = new LocalResolver(this.list);
  time = 0;

  add(c: Combatant): Combatant { this.list.push(c); return c; }
  byId(id: number): Combatant | undefined { return this.list.find((c) => c.id === id); }

  tick(dt: number): void {
    this.time += dt;
    for (const c of this.list) this.events(c);
    for (const c of this.list) this.sweep(c);
    for (const c of this.list) {
      if (c.alive && c.hp <= 0) { c.hp = 0; c.fighter.kill(); bus.emit('combat:kill', { target: c.id, by: -1 }); }
    }
  }

  /** A slam landing of c: pushes everyone near; slam_aoe passives add damage. */
  slam(c: Combatant): void {
    const r = BALANCE.move.slam.knockR, p = c.body.s.pos;
    for (const o of this.list) {
      if (o === c || !o.alive || Math.hypot(o.body.s.pos.x - p.x, o.body.s.pos.z - p.z) > r) continue;
      knock(c, o, BALANCE.combat.slamKnock, BALANCE.combat.slamLift);
    }
    applyEffects(c, c, slamEffects(c.passives), this.list);
  }

  private events(c: Combatant): void {
    const f = c.fighter, s = c.body.s;
    for (const e of f.events) {
      switch (e.k) {
        case 'swing': {
          c.hitSet.clear(); c.hitSwing = e.id;
          const [x, y, z] = c.eye();
          bus.emit('combat:swing', { id: c.id, kind: e.kind, combo: e.combo, family: c.weapon.stats.moveset, x, y, z });
          break;
        }
        case 'lunge': {
          const sp = e.m / e.dur, fx = -Math.sin(c.yaw), fz = -Math.cos(c.yaw);
          // never slow a body that already moves faster along the lunge (dash attacks keep the dash)
          const along = s.vel.x * fx + s.vel.z * fz;
          if (along < sp) pushMove(s, fx * sp, fz * sp, e.dur);
          break;
        }
        case 'charge': bus.emit('combat:charge', { id: c.id }); break;
        case 'parry': bus.emit('combat:guard', { id: c.id, act: 'parry' }); break;
        case 'feint': bus.emit('combat:guard', { id: c.id, act: 'feint' }); break;
        case 'block': bus.emit('combat:guard', { id: c.id, act: e.on ? 'block_on' : 'block_off' }); break;
      }
    }
  }

  private sweep(c: Combatant): void {
    const sw = c.fighter.sweep;
    if (!sw || !c.alive) return;
    const f = c.fighter, def = c.weapon, reach = def.stats.reach;
    const shape = attackShape(def, f.kind, f.combo);
    const frame = swingFrame(c.eye(), c.yaw, c.pitch);
    const p = c.body.s.pos;
    for (const t of this.list) {
      if (t === c || t.team === c.team || !t.alive || c.hitSet.has(t.id)) continue;
      const dist = Math.hypot(t.body.s.pos.x - p.x, t.body.s.pos.z - p.z);
      if (dist > reach + 1) continue;
      const hit = sweepHit(frame, f.frames.arc, shape.arcDeg, reach, sw.u0, sw.u1, t.capsules());
      if (!hit) continue;
      c.hitSet.add(t.id);
      this.resolver.claim({ attacker: c.id, target: t.id, attackId: sw.id, kind: f.kind, combo: f.combo, zone: hit.zone, dist, point: hit.point, clientTime: this.time });
    }
  }
}
