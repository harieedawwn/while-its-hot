import { BALANCE } from '../balance';
import type { Atom, EBody } from './atoms';
import { awayFrom, aimGround, near, toward } from './cast';
import { aimOf, type EffectWorld, eyeY, flat, fwdOf } from './world';

const E = BALANCE.effects, D = E.dao, T = E.tay, PUSH_S = BALANCE.combat.pushS;

/** One poison stack on t from src: burn over time that grows per stack and refreshes (also used by thrown knives). */
export function applyPoison(w: EffectWorld, src: EBody, t: EBody): void {
  if (!w.sink.hurtable(t)) return;
  const n = w.stack(`poison:${src.id}:${t.id}`, D.poison.max, D.poison.s);
  w.sink.burn(t, D.poison.dps * n, D.poison.s, src.id);
  w.sink.status(t, 'poison', D.poison.s, n);
}

/** Distance from point (px, pz) to the segment a→b (horizontal). */
function segDist(px: number, pz: number, ax: number, az: number, bx: number, bz: number): number {
  const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz || 1;
  const u = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / l2));
  return flat(px, pz, ax + dx * u, az + dz * u);
}

/** Dao and Tay atoms (phase 29). src = the owner; t = the body hit / the parried attacker, or null for swing atoms. */
export function castB(w: EffectWorld, src: EBody, t: EBody | null, a: Atom): void {
  const s = w.sink, [fx, fz] = fwdOf(src.yaw);
  switch (a.type) {
    case 'poison': if (t) applyPoison(w, src, t); return;
    case 'haste': {
      const n = w.stack(`haste:${src.id}`, D.haste.max, D.haste.s);
      s.status(src, 'haste', D.haste.s, 1 + D.haste.per * n);
      return;
    }
    case 'invis': w.hide(src, a.s); return;
    case 'knife': {
      if (!w.ready(`knife:${src.id}`, D.knife.cd)) return;
      const d = aimOf(src), sp = D.knife.speed;
      w.spawn('knife', src.id, src.x + d[0] * 0.6, eyeY(src) - 0.25, src.z + d[2] * 0.6, src.yaw, (2 * D.knife.range) / sp, D.knife.r, [d[0] * sp, d[1] * sp, d[2] * sp], D.knife.dmg);
      return;
    }
    case 'hook': {
      if (!w.ready(`hook:${src.id}`, D.hook.cd)) return;
      const hit = near(w, src, src.x, src.z, D.hook.range).find((b) => {
        const d = flat(b.x, b.z, src.x, src.z) || 1;
        return ((b.x - src.x) * fx + (b.z - src.z) * fz) / d >= D.hook.dot;
      });
      if (!hit) return;
      const d = flat(hit.x, hit.z, src.x, src.z) || 1, ux = (hit.x - src.x) / d, uz = (hit.z - src.z) / d, run = Math.max(0, d - D.hook.stop);
      s.fx({ k: 'hook', o: src.id, p: [src.x, src.y + 1.2, src.z], q: [hit.x, hit.y + 1, hit.z] });
      s.knock(src, [(ux * run) / D.hook.dur, 1.5, (uz * run) / D.hook.dur], D.hook.dur);
      return;
    }
    case 'blink': {
      if (!t || !w.ready(`blink:${src.id}`, D.blink.cd)) return;
      const [bx, bz] = fwdOf(t.yaw);
      s.fx({ k: 'blink', o: src.id, p: [src.x, src.y + 1, src.z] });
      s.teleport(src, [t.x - bx * D.blink.behind, t.y, t.z - bz * D.blink.behind], t.yaw);
      w.hide(src, D.invis.parryS);
      return;
    }
    case 'rift': {
      if (!w.ready(`rift:${src.id}`, D.rift.cd)) return;
      const ex = src.x + fx * D.rift.range, ez = src.z + fz * D.rift.range;
      for (const b of w.foes(src)) if (segDist(b.x, b.z, src.x, src.z, ex, ez) <= D.rift.w) s.damage(b, D.rift.dmg, src.id, 'rift');
      s.fx({ k: 'rift', o: src.id, p: [src.x, src.y + 1, src.z], q: [ex, src.y + 1, ez] });
      s.teleport(src, [ex, src.y, ez], src.yaw);
      return;
    }
    case 'storm':
      if (w.ready(`storm:${src.id}`, D.storm.cd)) w.spawn('storm', src.id, src.x, src.y, src.z, src.yaw, D.storm.s, D.storm.r, undefined, D.storm.dmg);
      return;
    case 'timefield':
      if (w.ready(`tfield:${src.id}`, D.timefield.cd)) w.spawn('timefield', src.id, src.x, src.y, src.z, src.yaw, D.timefield.s, D.timefield.r);
      return;
    case 'heal':
      s.heal(src, a.hp);
      if (a.hp >= 20) s.fx({ k: 'heal', o: src.id, p: [src.x, src.y + 1, src.z] });
      return;
    case 'proj': {
      const P = T.proj[a.k];
      if (!w.ready(`${a.k}:${src.id}`, P.cd)) return;
      const d = aimOf(src);
      const e = w.spawn(a.k, src.id, src.x + d[0] * 0.6, eyeY(src) - 0.25, src.z + d[2] * 0.6, src.yaw, P.range / P.speed, P.r, [d[0] * P.speed, d[1] * P.speed, d[2] * P.speed], P.dmg);
      if (e) e.floor = src.y;
      return;
    }
    case 'spark': {
      if (!t || !w.ready(`spark:${src.id}`, T.spark.cd)) return;
      const next = near(w, src, t.x, t.z, T.spark.r).find((b) => b.id !== t.id);
      if (!next) return;
      s.damage(next, T.spark.dmg, src.id, 'chain');
      s.fx({ k: 'chain', o: src.id, p: [t.x, t.y + 1.4, t.z], q: [next.x, next.y + 1.1, next.z] });
      return;
    }
    case 'wall': {
      const W = T.wall;
      if (src.pitch > W.lookDown || !w.ready(`wall:${src.id}`, W.cd)) return;
      const [x, z] = aimGround(src, W.ahead);
      w.spawn('wall', src.id, x, src.y, z, src.yaw, W.s, W.w / 2);
      return;
    }
    case 'magnet_punch': {
      const M = T.magnetPunch;
      if (!w.ready(`mpunch:${src.id}`, M.cd)) return;
      const dx = src.x + fx * M.to, dz = src.z + fz * M.to, pulled = near(w, src, src.x, src.z, M.r);
      s.fx({ k: 'magnet', o: src.id, p: [src.x, src.y + 1, src.z], r: M.r });
      for (const b of pulled) s.knock(b, toward(b, dx, dz, 0.3, 1.5), 0.3);
      const ids = pulled.map((b) => b.id), id = src.id;
      w.after(M.delay, () => {
        const me = w.body(id);
        if (!me?.alive) return;
        for (const k of ids) {
          const b = w.body(k);
          if (!b?.alive || !s.hurtable(b) || flat(b.x, b.z, me.x, me.z) > M.to + 2.5) continue;
          s.damage(b, M.dmg, id, 'magnet');
          s.knock(b, awayFrom(b, me.x, me.z, M.push, 2), PUSH_S);
          s.fx({ k: 'push', o: id, p: [b.x, b.y + 1, b.z] });
        }
      });
      return;
    }
    case 'hand': {
      const H = a.k === 'giant' ? T.giant : T.sky;
      if (!w.ready(`hand:${src.id}`, H.cd)) return;
      const [x, z] = aimGround(src, H.range);
      w.spawn('hand', src.id, x, src.y, z, src.yaw, H.delay, H.r, undefined, H.dmg);
      return;
    }
    case 'meteor_small': {
      const M = T.meteorSmall;
      if (!t || !w.ready(`msmall:${src.id}`, M.cd)) return;
      w.spawn('meteor', src.id, t.x, t.y, t.z, src.yaw, M.delay, M.r, undefined, M.dmg);
      return;
    }
    case 'meteor_rain': {
      const R = T.rain;
      if (!w.ready(`rain:${src.id}`, R.cd)) return;
      const [cx, cz] = aimGround(src, E.meteor.range), id = src.id;
      for (let i = 0; i < R.n; i++) {
        const ang = (i / R.n) * Math.PI * 2 + src.yaw, rr = i === 0 ? 0 : R.spread;
        w.after(i * R.every, () => { if (w.body(id)?.alive) w.spawn('meteor', id, cx + Math.cos(ang) * rr, src.y, cz + Math.sin(ang) * rr, 0, R.delay, R.r, undefined, R.dmg); });
      }
      return;
    }
    default: return;
  }
}
