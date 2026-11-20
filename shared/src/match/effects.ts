import { BALANCE } from '../balance';
import type { Vec3 } from '../net/match-msgs';
import type { Atom } from '../effects/atoms';
import type { HitEffect } from '../passives';
import { flatDist, type MPlayer, type Out } from './mplayer';

const C = BALANCE.combat, P = BALANCE.weapons.passive;

/** Horizontal push of t straight away from (x, z) at speed m/s, plus vy (the target's client applies it). */
export function knockFrom(x: number, z: number, t: MPlayer, speed: number, vy = 0): Vec3 {
  let dx = t.st.x - x, dz = t.st.z - z;
  const l = Math.hypot(dx, dz) || 1;
  dx /= l; dz /= l;
  return [dx * speed, vy, dz * speed];
}

/** Apply damage (no defense) credited to `by`; pushes the kill out if it was lethal. */
export type Harm = (t: MPlayer, dmg: number, by: number, out: Out[]) => void;

/**
 * Passive hit effects on the server (GDD §6; the client twin is combat/resolver.ts applyEffects).
 * `kn` is the target's knockback, modified in place by launch/pull; others get their own knock/damage outs.
 * Toolkit atoms (phase 28) go to `atom` (the authority's EffectWorld).
 */
export function serverEffects(src: MPlayer, t: MPlayer, fx: readonly HitEffect[], kn: Vec3, list: readonly MPlayer[], harm: Harm, out: Out[], atom?: (src: MPlayer, t: MPlayer, a: Atom, out: Out[]) => void): void {
  for (const e of fx) {
    switch (e.type) {
      case 'burn': t.burnT = e.durS; t.burnDps = e.dps; t.burnBy = src.id; break;
      case 'launch': { const k = knockFrom(src.st.x, src.st.z, t, P.launch.push, e.upVel); kn[0] = k[0]; kn[1] = k[1]; kn[2] = k[2]; break; }
      case 'pull': { const k = knockFrom(src.st.x, src.st.z, t, -e.m / C.pushS); kn[0] = k[0]; kn[2] = k[2]; break; }
      case 'shockwave': case 'aoe':
        for (const o of list) {
          if (o === src || o === t || !o.alive || !o.online || flatDist(o, t) > e.r) continue;
          out.push({ to: o.id, m: { t: 'knock', kn: knockFrom(t.st.x, t.st.z, o, e.type === 'shockwave' ? e.push : C.slamKnock) } });
          if (e.type === 'aoe') harm(o, e.dmg, src.id, out);
        }
        break;
      default: atom?.(src, t, e, out);
    }
  }
}
