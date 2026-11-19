import { FOUNDRY, channelRects } from '@wih/shared';
import type { AmbienceDef } from './ambience';
import type { Vec3 } from './spatial';

/** Ambience per place (AUDIO §3). Positions come from the arena data; nothing here is tuned (levels: catalog + FEEL). */
export interface RingView { readonly cx: number; readonly cz: number; readonly radius: number }
const HEAR = 30;

export function foundryAmbience(ring?: RingView): AmbienceDef {
  const chans = channelRects(), y = FOUNDRY.channel.surfaceY;
  return {
    bed: 'amb_foundry',
    emitters: [
      { id: 'molten', nearest(l: Vec3, o: Vec3) {          // closest point of the four molten arms
        let best = Infinity;
        for (const r of chans) {
          const x = Math.max(r.x0, Math.min(r.x1, l.x)), z = Math.max(r.z0, Math.min(r.z1, l.z));
          const d = Math.hypot(x - l.x, z - l.z);
          if (d < best) { best = d; o.x = x; o.y = y; o.z = z; }
        }
        return best < HEAR;
      } },
      { id: 'fire_ring', nearest(l: Vec3, o: Vec3) {       // the wall of fire at the listener's bearing
        if (!ring || ring.radius <= 0) return false;
        const dx = l.x - ring.cx, dz = l.z - ring.cz, d = Math.hypot(dx, dz) || 1;
        o.x = ring.cx + (dx / d) * ring.radius; o.y = 1.2; o.z = ring.cz + (dz / d) * ring.radius;
        return true;
      } },
    ],
    zones: [{ id: 'fire_inside', when: (l: Vec3) => !!ring && ring.radius > 0 && Math.hypot(l.x - ring.cx, l.z - ring.cz) > ring.radius }],
    oneshots: ['amb_oneshot', 'amb_oneshot', 'steam_vent'],
  };
}

export const yardAmbience = (): AmbienceDef => ({ bed: 'amb_yard', oneshots: ['amb_oneshot'] });
export const menuAmbience = (): AmbienceDef => ({ bed: 'menu_smithy' });
