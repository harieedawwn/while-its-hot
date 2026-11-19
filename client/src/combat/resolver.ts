import { attackShape, BALANCE, type AttackKind, type HitEffect, hitEffects, parryEffects, resolveHit, type V3, type Zone } from '@wih/shared';
import { bus } from '../core/events';
import { pushMove } from '../player/move-state';
import type { Combatant } from './combatant';

/**
 * What an attacker's client claims when its blade touches someone (TECH §4). Offline the LocalResolver
 * applies it at once; online (phase 17) a resolver sends it to the room and the server answers with the
 * same rules (shared/combat/damage.ts), so nothing above this interface changes.
 */
export interface HitClaim {
  attacker: number; target: number; attackId: number; kind: AttackKind; combo: number;
  zone: Zone; dist: number; point: V3; clientTime: number;
}
export interface HitResolver { claim(c: HitClaim): void; }

const C = BALANCE.combat;

export class LocalResolver implements HitResolver {
  constructor(private list: readonly Combatant[]) {}

  claim(c: HitClaim): void {
    const a = this.list.find((o) => o.id === c.attacker), t = this.list.find((o) => o.id === c.target);
    if (!a || !t || !a.alive || !t.alive) return;
    const shape = attackShape(a.weapon, c.kind, c.combo, c.dist);
    const as = a.body.s, ts = t.body.s;
    const res = resolveHit({ x: as.pos.x, z: as.pos.z, shape, weaponLevel: a.level }, t.view());
    const [x, y, z] = c.point;
    if (res.r === 'immune') return;
    if (res.r === 'parried') {
      a.fighter.stagger(res.attackerStaggerS);
      t.fighter.parried();
      ts.stamina = Math.min(BALANCE.move.stamina.pips, ts.stamina + res.parrierStamina);
      applyEffects(t, a, parryEffects(t.passives), this.list);
      bus.emit('combat:parry', { parrier: t.id, attacker: a.id, x, y, z });
      return;
    }
    t.hp -= res.dmg;
    ts.stamina = Math.max(0, ts.stamina - res.staminaCost);
    if (res.staggerS > 0) t.fighter.stagger(res.staggerS);
    else if (res.r !== 'blocked') t.fighter.flinch();
    // knockback away from the attacker; a clean block only rocks the defender
    const frames = a.fighter.frames;
    knock(a, t, res.r === 'blocked' ? frames.knock * C.block.knockMul : frames.knock);
    if (res.r !== 'blocked') applyEffects(a, t, hitEffects(a.passives, { kind: c.kind, combo: c.combo, dist: c.dist, reach: a.weapon.stats.reach }), this.list);
    bus.emit('combat:hit', { attacker: a.id, target: t.id, dmg: res.dmg, zone: c.zone, kind: c.kind, result: res.r, x, y, z });
    if (t.hp <= 0) { t.hp = 0; t.fighter.kill(); bus.emit('combat:kill', { target: t.id, by: a.id }); }
  }
}

/** Push t straight away from a (horizontal) at speed m/s. */
export function knock(a: Combatant, t: Combatant, speed: number, vy = 0): void {
  const ap = a.body.s.pos, tp = t.body.s.pos;
  let dx = tp.x - ap.x, dz = tp.z - ap.z;
  const l = Math.hypot(dx, dz) || 1;
  dx /= l; dz /= l;
  pushMove(t.body.s, dx * speed, dz * speed, C.pushS, vy);
}

/** Passive hit effects (GDD §6): burn, launch, shockwave, pull, aoe. src = who owns the passive. */
export function applyEffects(src: Combatant, t: Combatant, fx: HitEffect[], list: readonly Combatant[]): void {
  for (const e of fx) {
    switch (e.type) {
      case 'burn': t.burnT = e.durS; t.burnDps = e.dps; break;
      case 'launch': knock(src, t, BALANCE.weapons.passive.launch.push, e.upVel); break;
      case 'pull': {
        const s = src.body.s.pos, p = t.body.s.pos, l = Math.hypot(p.x - s.x, p.z - s.z) || 1;
        pushMove(t.body.s, ((s.x - p.x) / l) * e.m / C.pushS, ((s.z - p.z) / l) * e.m / C.pushS, C.pushS);
        break;
      }
      case 'shockwave': case 'aoe':
        for (const o of list) {
          if (o === src || o === t || !o.alive) continue;
          const d = Math.hypot(o.body.s.pos.x - t.body.s.pos.x, o.body.s.pos.z - t.body.s.pos.z);
          if (d > e.r) continue;
          if (e.type === 'aoe') o.hp -= e.dmg;
          knock(t, o, e.type === 'shockwave' ? e.push : C.slamKnock);
        }
        break;
    }
  }
}
