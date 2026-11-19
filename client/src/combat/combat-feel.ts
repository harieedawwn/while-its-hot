import { bus } from '../core/events';
import { FEEL } from '../core/feel';
import type { FirstPersonCamera } from '../player/camera';
import type { Viewmodel } from '../player/viewmodel';

const F = FEEL.combat, H = FEEL.camera.hitStop;

/** Hit-stop length for a landed hit: 50 ms for the weakest blow, 90 ms for a full heavy (LOOK §6). */
export function hitStopMs(dmg: number): number {
  const k = Math.max(0, Math.min(1, (dmg - F.dmgLo) / (F.dmgHi - F.dmgLo)));
  return H.minMs + (H.maxMs - H.minMs) * k;
}

/**
 * Combat bus events → the local camera and viewmodel (weight): hit-stop on landed hits and parries,
 * trauma by how hard it was, viewmodel kicks when the blade connects, is blocked or is parried.
 */
export function bindCombatFeel(localId: () => number, cam: FirstPersonCamera, vm: Viewmodel | null): () => void {
  const offs = [
    bus.on('combat:hit', (e) => {
      const me = localId(), heavy = e.kind === 'heavy';
      if (e.attacker === me) {
        const blocked = e.result === 'blocked';
        cam.hitStop(hitStopMs(blocked ? e.dmg * 2 : e.dmg));
        cam.addTrauma(blocked ? F.trauma.blocked : heavy ? F.trauma.heavy : F.trauma.hit);
        vm?.kick(blocked ? F.kick.blocked : heavy ? F.kick.heavy : F.kick.hit);
      } else if (e.target === me) {
        cam.hitStop(H.minMs);
        cam.addTrauma(heavy ? F.trauma.hurtHeavy : e.result === 'blocked' ? F.trauma.blocked : F.trauma.hurt);
      }
    }),
    bus.on('combat:parry', (e) => {
      const me = localId();
      if (e.parrier === me) { cam.hitStop(F.parryStopMs); cam.addTrauma(F.trauma.parry); }
      else if (e.attacker === me) { cam.hitStop(F.parryStopMs); cam.addTrauma(F.trauma.parried); vm?.kick(F.kick.parried); }
    }),
  ];
  return () => offs.forEach((o) => o());
}
