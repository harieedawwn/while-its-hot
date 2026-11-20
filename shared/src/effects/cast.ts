import { BALANCE } from '../balance';
import type { Atom, EBody } from './atoms';
import { castB } from './cast-b';
import { aimOf, type EffectWorld, eyeY, flat, fwdOf } from './world';

const E = BALANCE.effects, PUSH_S = BALANCE.combat.pushS;

/** Velocity that carries t to (x, z) in ps seconds (pull-to-point knocks). */
export function toward(t: EBody, x: number, z: number, ps: number, vy = 0): [number, number, number] {
  return [(x - t.x) / ps, vy, (z - t.z) / ps];
}
/** Velocity straight away from (x, z) at speed. */
export function awayFrom(t: EBody, x: number, z: number, speed: number, vy = 0): [number, number, number] {
  let dx = t.x - x, dz = t.z - z;
  const l = Math.hypot(dx, dz) || 1;
  dx /= l; dz /= l;
  return [dx * speed, vy, dz * speed];
}

/** Bodies of `o`'s foes within r of (x, z), nearest first. */
export function near(w: EffectWorld, o: EBody, x: number, z: number, r: number): EBody[] {
  return w.foes(o).filter((b) => flat(b.x, b.z, x, z) <= r).sort((a, b) => flat(a.x, a.z, x, z) - flat(b.x, b.z, x, z));
}

/** Where the aim ray meets the owner's floor level, at most `range` m away (horizontal). */
export function aimGround(b: EBody, range: number): [number, number] {
  const d = aimOf(b), hl = Math.hypot(d[0], d[2]) || 1;
  let along = range;
  if (d[1] < -0.02) along = Math.min(range, ((eyeY(b) - b.y) / -d[1]) * hl);
  return [b.x + (d[0] / hl) * along, b.z + (d[2] / hl) * along];
}

/** One atom. src = the owner; t = the body the hook fired on (hit target, parried attacker) or null for swing atoms. */
export function castAtom(w: EffectWorld, src: EBody, t: EBody | null, a: Atom): void {
  const s = w.sink, [fx, fz] = fwdOf(src.yaw);
  switch (a.type) {
    case 'status': {
      if (!t || !w.sink.hurtable(t)) return;
      if (a.k === 'slow') s.status(t, 'slow', E.slow.s, E.slow.mul);
      else if (a.k === 'freeze') {
        if (!w.ready(`freeze:${src.id}:${t.id}`, E.freeze.cdTarget)) return;
        s.status(t, 'freeze', E.freeze.s, 0);
        s.fx({ k: 'freeze', o: src.id, p: [t.x, t.y, t.z] });
      } else {
        s.status(t, 'slow', E.bell.s, E.bell.slow);
        s.status(t, 'shake', E.bell.shakeS, 1);
        s.fx({ k: 'bell', o: src.id, p: [t.x, t.y + 1.2, t.z] });
      }
      return;
    }
    case 'slash': {
      if (!w.ready(`${a.cdKey}:${src.id}`, a.cd)) return;
      const yaw = a.toward === 'attacker' && t ? Math.atan2(-(t.x - src.x), -(t.z - src.z)) : src.yaw;
      const [dx, dz] = fwdOf(yaw), sp = E.slash.speed;
      w.spawn(a.v, src.id, src.x + dx * 0.6, src.y + 1.1, src.z + dz * 0.6, yaw, E.slash.range / sp, E.slash.r, [dx * sp, 0, dz * sp], a.dmg);
      return;
    }
    case 'whip': {
      if (!w.ready(`whip:${src.id}`, E.whip.cd)) return;
      const cone = Math.cos(E.whip.cone);
      const hit = near(w, src, src.x, src.z, E.whip.range).find((b) => {
        const d = flat(b.x, b.z, src.x, src.z) || 1;
        return ((b.x - src.x) * fx + (b.z - src.z) * fz) / d >= cone;
      });
      const end = hit ? [hit.x, hit.y + 1, hit.z] : [src.x + fx * E.whip.range, src.y + 1, src.z + fz * E.whip.range];
      s.fx({ k: 'whip', o: src.id, p: [src.x, src.y + 1.2, src.z], q: end });
      if (!hit) return;
      s.damage(hit, E.whip.dmg, src.id, 'whip');
      if (flat(hit.x, hit.z, src.x, src.z) > E.whip.to) s.knock(hit, toward(hit, src.x + fx * E.whip.to, src.z + fz * E.whip.to, 0.25, 2), 0.25);
      return;
    }
    case 'field': {
      if (a.k === 'lava_crack') {
        if (!t || !w.ready(`crackf:${src.id}`, E.lavaCrack.cd)) return;
        w.spawn('lava', src.id, t.x, t.y, t.z, 0, E.lavaCrack.s, E.lavaCrack.r, undefined, E.lavaCrack.dps);
      } else if (a.k === 'lava_pool') {
        if (!w.ready(`pool:${src.id}`, E.lavaPool.cd)) return;
        w.spawn('lava', src.id, src.x + fx * E.lavaPool.ahead, src.y, src.z + fz * E.lavaPool.ahead, src.yaw, E.lavaPool.s, E.lavaPool.r, undefined, E.lavaPool.dps);
      } else {
        if (!w.ready(`poolbig:${src.id}`, 1)) return;
        w.spawn('lava', src.id, src.x, src.y, src.z, src.yaw, E.lavaPool.s, E.lavaPool.r * E.lavaPool.slamMul, undefined, E.lavaPool.dps);
      }
      return;
    }
    case 'meteor': {
      if (!w.ready(`meteor:${src.id}`, E.meteor.cd)) return;
      const [x, z] = aimGround(src, E.meteor.range);
      w.spawn('meteor', src.id, x, src.y, z, src.yaw, E.meteor.delayS, E.meteor.r, undefined, E.meteor.dmg);
      return;
    }
    case 'hole': {
      const H = a.k === 'eclipse' ? E.eclipse : a.k === 'star' ? E.star : E.tay.gravity;
      if (!w.ready(`${a.k}:${src.id}`, H.cd)) return;
      w.spawn(a.k, src.id, src.x + fx * H.ahead, src.y + 1.1, src.z + fz * H.ahead, src.yaw, H.s, H.r);
      return;
    }
    case 'column': {
      const C = E.column;
      if (!w.ready(`column:${src.id}`, C.cd)) return;
      w.spawn('column', src.id, src.x, src.y, src.z, src.yaw, C.lifeS, C.w, undefined, C.dmg);
      for (const b of w.foes(src)) {
        const rx = b.x - src.x, rz = b.z - src.z, along = rx * fx + rz * fz, side = Math.abs(rx * fz - rz * fx);
        if (along < 0 || along > C.len || side > C.w) continue;
        s.damage(b, C.dmg, src.id, 'column');
        s.burn(b, C.burnDps, C.burnS, src.id);
      }
      return;
    }
    case 'wave': {
      const k = a.k, W = k === 'piston' ? E.piston : k === 'bell_wave' ? E.bellWave : E.lightWave;
      const cd = k === 'light_wave' ? 0.25 : (W as typeof E.piston).cd;
      if (!w.ready(`${k}:${src.id}`, cd)) return;
      const cx = src.x + fx, cz = src.z + fz;
      s.fx({ k: k === 'bell_wave' ? 'bell' : 'wave', o: src.id, p: [cx, src.y + 0.1, cz], r: W.r });
      for (const b of near(w, src, cx, cz, W.r)) {
        if ('dmg' in W) s.damage(b, W.dmg, src.id, 'wave');
        s.knock(b, awayFrom(b, src.x, src.z, W.push, 2), PUSH_S);
        if (k === 'bell_wave') { s.status(b, 'slow', E.bell.s, E.bell.slow); s.status(b, 'shake', E.bell.shakeS, 1); }
      }
      return;
    }
    case 'magnet': {
      if (!w.ready(`magnet:${src.id}`, E.magnet.cd)) return;
      const dx = src.x + fx * E.magnet.to, dz = src.z + fz * E.magnet.to;
      s.fx({ k: 'magnet', o: src.id, p: [src.x, src.y + 1, src.z], r: E.magnet.r });
      for (const b of near(w, src, src.x, src.z, E.magnet.r)) s.knock(b, toward(b, dx, dz, 0.3, 1.5), 0.3);
      return;
    }
    case 'bounce':
      if (t) s.knock(t, awayFrom(t, src.x, src.z, E.rubber.push, E.rubber.up), E.rubber.bounceS, true);
      return;
    case 'push':
      if (t) { s.knock(t, awayFrom(t, src.x, src.z, a.v ?? E.lightPush.push, 1), PUSH_S); s.fx({ k: 'push', o: src.id, p: [t.x, t.y + 1, t.z] }); }
      return;
    case 'chain': {
      if (!w.ready(`chain:${src.id}`, E.chain.cd)) return;
      const pts: number[] = [], done = new Set<number>();
      let cur: { x: number; z: number } = src;
      for (let i = 0; i < E.chain.n; i++) {
        const next = near(w, src, cur.x, cur.z, E.chain.r).find((b) => !done.has(b.id));
        if (!next) break;
        done.add(next.id); pts.push(next.x, next.y + 1.1, next.z);
        s.damage(next, E.chain.dmg, src.id, 'chain');
        cur = next;
      }
      if (pts.length) s.fx({ k: 'chain', o: src.id, p: [src.x, src.y + 1.4, src.z], q: pts });
      return;
    }
    case 'anchor': {
      if (!w.ready(`anchor:${src.id}`, E.anchor.cd)) return;
      const d = aimOf(src), sp = E.anchor.speed;
      const e = w.spawn('anchor', src.id, src.x + d[0] * 0.6, eyeY(src) - 0.3, src.z + d[2] * 0.6, src.yaw, E.anchor.range / sp, E.anchor.r, [d[0] * sp, d[1] * sp, d[2] * sp], E.anchor.dmg);
      if (e) e.floor = src.y;
      return;
    }
    case 'pin_all': {
      if (!w.ready(`pin:${src.id}`, E.gravityPin.cd)) return;
      s.fx({ k: 'pin', o: src.id, p: [src.x, src.y + 0.05, src.z], r: E.gravityPin.r });
      for (const b of near(w, src, src.x, src.z, E.gravityPin.r)) s.status(b, 'pin', E.gravityPin.s, 0);
      return;
    }
    case 'crack': {
      const C = E.crack;
      if (!w.ready(`crack:${src.id}`, C.cd)) return;
      w.spawn('crack', src.id, src.x + fx, src.y, src.z + fz, src.yaw, C.len / C.speed, C.w, [fx * C.speed, 0, fz * C.speed], C.dmg);
      return;
    }
    default: castB(w, src, t, a);
  }
}
