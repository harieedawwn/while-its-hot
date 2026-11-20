import { BALANCE } from '../balance';
import { knifeOf } from '../passives';
import type { EBody } from './atoms';
import { awayFrom } from './cast';
import { applyPoison } from './cast-b';
import { sweep } from './ents';
import { type EffectWorld, flat, type Live } from './world';

const E = BALANCE.effects, D = E.dao, T = E.tay, B = BALANCE.weapons.passive.burnStrong, PUSH_S = BALANCE.combat.pushS;

/** Bodies of `o`'s foes within r of the entity (horizontal) and roughly its height. */
function inBlast(w: EffectWorld, o: EBody, e: Live, r: number): EBody[] {
  return w.foes(o).filter((b) => flat(b.x, b.z, e.x, e.z) <= r + BALANCE.move.body.radius && Math.abs(b.y + 0.9 - e.y) <= r + 1);
}

/** Phase 29 entities: knife, projectiles, hands, fields, storm, decoy (the wall only exists; clients make it solid). */
export function tickEntB(w: EffectWorld, e: Live, dt: number): void {
  const s = w.sink, o = w.body(e.o);
  const move = () => { e.x += e.vx * dt; e.y += e.vy * dt; e.z += e.vz * dt; e.went += Math.hypot(e.vx, e.vy, e.vz) * dt; };
  switch (e.k) {
    case 'knife': {
      if (!o) { e.life = 0; return; }
      if (e.age <= e.life / 2) {
        move();
        sweep(w, e, o, e.r, false, (b) => {
          s.damage(b, e.dmg, e.o, 'knife');
          const tag = knifeOf(o.passives);
          if (tag === 'poison') applyPoison(w, o, b);
          else if (tag === 'burn') s.burn(b, B.dps, B.durS, e.o);
        });
        return;
      }
      const dx = o.x - e.x, dy = o.y + 1.2 - e.y, dz = o.z - e.z, d = Math.hypot(dx, dy, dz) || 1, sp = D.knife.speed;
      e.vx = (dx / d) * sp; e.vy = (dy / d) * sp; e.vz = (dz / d) * sp;
      move();
      if (d < 1) e.life = e.age;
      return;
    }
    case 'fireball': case 'iceball': case 'rocket': {
      move();
      if (!o || e.done) return;
      const P = T.proj[e.k];
      let boom = e.age + dt >= e.life || e.y <= e.floor + 0.15;
      sweep(w, e, o, e.r, false, () => { boom = true; });
      if (!boom) return;
      e.done = true; e.life = e.age; e.vx = e.vy = e.vz = 0;
      s.fx({ k: e.k === 'iceball' ? 'ice_boom' : 'boom', o: e.o, p: [e.x, e.y, e.z], r: P.boomR });
      for (const b of inBlast(w, o, e, P.boomR)) {
        s.damage(b, P.dmg, e.o, e.k);
        s.knock(b, awayFrom(b, e.x, e.z, e.k === 'rocket' ? 8 : 4, 3), PUSH_S);
        if (e.k === 'fireball') s.burn(b, T.proj.fireball.burnDps, T.proj.fireball.burnS, e.o);
        if (e.k === 'iceball') s.status(b, 'slow', T.proj.iceball.slowS, T.proj.iceball.slow);
      }
      return;
    }
    case 'hand': {
      if (e.age < e.life || e.done || !o) return;
      e.done = true;
      const push = e.r >= T.sky.r - 0.1 ? T.sky.push : T.giant.push;
      s.fx({ k: 'meteor_hit', o: e.o, p: [e.x, e.y, e.z], r: e.r });
      for (const b of w.foes(o)) {
        if (flat(b.x, b.z, e.x, e.z) > e.r) continue;
        s.damage(b, e.dmg, e.o, 'meteor_hit');
        s.knock(b, awayFrom(b, e.x, e.z, push, 5), PUSH_S);
      }
      return;
    }
    case 'timefield':
      if ((e.tick -= dt) > 0) return;
      e.tick = D.timefield.every;
      for (const b of s.bodies()) if (b.id !== e.o && b.alive && flat(b.x, b.z, e.x, e.z) <= e.r) s.status(b, 'slow', D.timefield.every * 1.6, D.timefield.slow);
      return;
    case 'storm':
      if (!o || !o.alive) { e.life = 0; return; }
      e.x = o.x; e.y = o.y; e.z = o.z; e.yaw += E.orbit.spin * 2.2 * dt;
      if ((e.tick -= dt) > 0) return;
      e.tick = D.storm.every;
      for (const b of w.foes(o)) {
        if (flat(b.x, b.z, e.x, e.z) > e.r) continue;
        s.damage(b, e.dmg, e.o, 'storm');
        s.fx({ k: 'orbit_hit', o: e.o, p: [b.x, b.y + 1.1, b.z] });
      }
      return;
    case 'decoy': {
      if (!o || e.done) return;
      const poked = w.foes(o).some((b) => b.swinging && flat(b.x, b.z, e.x, e.z) <= D.decoy.trigger);
      if (!poked) return;
      e.done = true; e.life = e.age;
      s.fx({ k: 'boom', o: e.o, p: [e.x, e.y + 0.5, e.z], r: e.r });
      for (const b of w.foes(o)) {
        if (flat(b.x, b.z, e.x, e.z) > e.r) continue;
        s.damage(b, e.dmg, e.o, 'boom');
        s.knock(b, awayFrom(b, e.x, e.z, 7, 3), PUSH_S);
      }
      return;
    }
    default: return;
  }
}
