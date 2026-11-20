import { BALANCE } from '../balance';
import type { EBody } from './atoms';
import { awayFrom } from './cast';
import { tickEntB } from './ents-b';
import { type EffectWorld, flat, type Live } from './world';

const E = BALANCE.effects, B = BALANCE.weapons.passive.burnStrong;

/** Body overlap of a point-ish entity: horizontal within r + body radius, height between the feet and the head. */
export function touches(b: EBody, x: number, y: number, z: number, r: number): boolean {
  return flat(b.x, b.z, x, z) <= r + BALANCE.move.body.radius && y >= b.y - 0.3 && y <= b.y + BALANCE.move.body.height + 0.3;
}

/** Hits of a travelling entity: every foe it touches, once. */
export function sweep(w: EffectWorld, e: Live, o: EBody, r: number, flatOnly: boolean, hit: (b: EBody) => void): void {
  for (const b of w.foes(o)) {
    if (e.hits.has(b.id)) continue;
    if (flatOnly ? flat(b.x, b.z, e.x, e.z) > r + BALANCE.move.body.radius : !touches(b, e.x, e.y, e.z, r)) continue;
    e.hits.add(b.id);
    hit(b);
  }
}

/** One tick of one live entity (after its age advanced). */
export function tickEnt(w: EffectWorld, e: Live, dt: number): void {
  const s = w.sink, o = w.body(e.o);
  const move = () => { e.x += e.vx * dt; e.y += e.vy * dt; e.z += e.vz * dt; e.went += Math.hypot(e.vx, e.vy, e.vz) * dt; };
  switch (e.k) {
    case 'slash': case 'slash_burn': case 'slash_ice': case 'slash_sun': {
      move();
      if (!o) return;
      sweep(w, e, o, e.r, false, (b) => {
        s.damage(b, e.dmg, e.o, e.k);
        if (e.k === 'slash_burn') s.burn(b, B.dps, B.durS, e.o);
      });
      if (e.k === 'slash_ice' && (e.tick -= Math.hypot(e.vx, e.vz) * dt) <= 0) {
        e.tick = E.slash.iceEvery;
        w.spawn('ice', e.o, e.x, e.y - 1.1, e.z, e.yaw, E.ice.s, E.ice.r);
      }
      return;
    }
    case 'lava':
      if ((e.tick -= dt) > 0 || !o) return;
      e.tick = 0.25;
      for (const b of w.foes(o)) if (flat(b.x, b.z, e.x, e.z) <= e.r && b.y <= e.y + 0.6) s.burn(b, e.dmg, 0.4, e.o);
      return;
    case 'ice':
      if ((e.tick -= dt) > 0) return;
      e.tick = 0.2;
      for (const b of s.bodies()) if (b.id !== e.o && b.alive && flat(b.x, b.z, e.x, e.z) <= e.r && b.y <= e.y + 0.6) s.status(b, 'slip', 0.4, E.ice.grip);
      return;
    case 'meteor':
      if (e.age < e.life || e.done || !o) return;
      e.done = true;
      s.fx({ k: 'meteor_hit', o: e.o, p: [e.x, e.y, e.z], r: e.r });
      for (const b of w.foes(o)) {
        if (flat(b.x, b.z, e.x, e.z) > e.r) continue;
        s.damage(b, e.dmg, e.o, 'meteor_hit');
        s.knock(b, awayFrom(b, e.x, e.z, 6, E.meteor.up), BALANCE.combat.pushS);
      }
      return;
    case 'orbit':
      if (!o) { e.life = 0; return; }
      e.x = o.x; e.y = o.y; e.z = o.z; e.yaw += E.orbit.spin * dt;
      if ((e.tick -= dt) > 0) return;
      e.tick = E.orbit.everyS;
      for (const b of w.foes(o)) {
        if (flat(b.x, b.z, e.x, e.z) > E.orbit.reach) continue;
        s.damage(b, E.orbit.dmg, e.o, 'orbit_hit');
        s.fx({ k: 'orbit_hit', o: e.o, p: [b.x, b.y + 1.1, b.z] });
      }
      return;
    case 'eclipse': case 'star': case 'gravity': {
      const H = e.k === 'eclipse' ? E.eclipse : e.k === 'star' ? E.star : E.tay.gravity;
      if (!o) return;
      // each body is pulled once per hole, for at most capS: the cap can never be exceeded
      for (const b of w.foes(o)) {
        if (e.held.has(b.id) || flat(b.x, b.z, e.x, e.z) > e.r) continue;
        e.held.add(b.id);
        const left = Math.min(H.capS, e.life - e.age);
        if (left > 0.05) s.status(b, 'well', left, H.pull, [e.x, e.y, e.z]);
      }
      if (e.k === 'star' && e.age >= e.life && !e.done) {
        e.done = true;
        s.fx({ k: 'boom', o: e.o, p: [e.x, e.y, e.z], r: E.star.boomR });
        for (const b of w.foes(o)) {
          if (flat(b.x, b.z, e.x, e.z) > E.star.boomR) continue;
          s.damage(b, E.star.boom, e.o, 'boom');
          s.knock(b, awayFrom(b, e.x, e.z, E.star.boomPush, 6), 0.3);
        }
      }
      return;
    }
    case 'anchor': {
      move();
      if (!o || e.done) return;
      let caught = false;
      sweep(w, e, o, e.r, false, (b) => {
        if (caught) return;
        caught = true;
        s.damage(b, e.dmg, e.o, 'anchor_hit');
        const d = flat(b.x, b.z, o.x, o.z) || 1, k = Math.max(0, d - E.anchor.to);
        s.knock(b, [((o.x - b.x) / d) * k / 0.3, 2, ((o.z - b.z) / d) * k / 0.3], 0.3);
        s.fx({ k: 'anchor_hit', o: e.o, p: [b.x, b.y + 1, b.z] });
      });
      const landed = e.y <= e.floor + 0.05 || e.age + dt >= e.life;
      if (caught) { e.done = true; e.life = e.age; return; }
      if (!landed) return;
      e.done = true; e.life = Math.min(e.life, e.age + 0.4); e.vx = e.vy = e.vz = 0;
      const d = flat(e.x, e.z, o.x, o.z);
      if (d > 1.5) {
        const sp = Math.min(E.anchor.selfPush, d / 0.45);
        s.knock(o, [((e.x - o.x) / d) * sp, 6, ((e.z - o.z) / d) * sp], 0.45);
      }
      s.fx({ k: 'anchor_hit', o: e.o, p: [e.x, Math.max(e.y, e.floor), e.z] });
      return;
    }
    case 'crack':
      move();
      if (!o) return;
      sweep(w, e, o, e.r, true, (b) => {
        s.damage(b, e.dmg, e.o, 'crack');
        s.knock(b, awayFrom(b, e.x - e.vx, e.z - e.vz, 2, E.crack.up), 0.3);
      });
      return;
    case 'column':
      return;
    default: tickEntB(w, e, dt);
  }
}
