import * as THREE from 'three';
import { bus } from '../core/events';
import { FEEL } from '../core/feel';
import type { ForgeStage } from '../forge/stage';
import type { CollisionWorld } from '../physics/world';
import type { Pipeline } from '../render/pipeline';
import { fxSettings } from './fx-settings';
import type { FxWorld } from './fx-world';

const X = FEEL.fx;
const DOWN = new THREE.Vector3(0, -1, 0);

export interface FxDeps {
  fx: FxWorld;
  /** Floor lookups for bounces and decals (falls back to 1 m below the point). */
  world?: CollisionWorld;
  /** The local forge presentation (blade pulse, flash, shatter). */
  stage?: ForgeStage;
  /** World position of a combatant (orients hit puffs away from the attacker). */
  posOf?(id: number): THREE.Vector3 | null;
  /** Máu override for dev scenes (else the saved setting). */
  blood?: boolean;
}

/**
 * Bus events → effect recipes (CLAUDE.md: gameplay emits, VFX subscribes). Returns the unsubscribe.
 * Forge sparks wait for the hammer to land; level-ups pulse the blade one heat step; evolution flashes it
 * white-hot while the new form swaps in; Gãy hides the blade and throws shards.
 */
export function bindFx(d: FxDeps): () => void {
  const { fx, stage } = d;
  const ray = new THREE.Vector3(), a = new THREE.Vector3(), b = new THREE.Vector3();
  const floorAt = (p: THREE.Vector3): number => {
    if (!d.world) return p.y - 1;
    const h = d.world.raycast(ray.set(p.x, p.y + 0.05, p.z), DOWN, 4);
    return h ? h.point.y : p.y - 1;
  };
  const blood = () => d.blood ?? fxSettings.blood;

  const offs = [
    bus.on('forge:strike', (e) => {
      const p = new THREE.Vector3(e.x, e.y, e.z), floor = floorAt(p) + 0.005;
      const onBlade = e.target === 'blade' && !!stage?.bladeSegment(a, b);
      if (e.broke && onBlade) {
        stage!.hideBlade(X.shatter.hideS);
        fx.shatter(a.clone(), b.clone(), 0.05, floor);
        return;
      }
      const up = (e.outcome === 'tuyet' || e.outcome === 'dat') && !e.refused;
      const sa = a.clone(), sb = b.clone();
      fx.later(FEEL.forge.hammer.fallS, () => {
        fx.forgeStrike(p, e.outcome, floor);
        if (up && onBlade) {
          stage!.boost(Math.min(1, e.heat + 1 / 9), X.levelUp.pulseS);
          fx.bladeBurst(sa, sb, X.levelUp.sparks, floor);
        }
      });
    }),
    bus.on('forge:evolve', () => {
      if (!stage) return;
      stage.boost(1, X.evolve.flashS);
      if (stage.bladeSegment(a, b)) fx.quench(a.clone(), b.clone(), floorAt(a) + 0.005);
      bus.emit('cam:trauma', { amount: X.evolve.trauma });
    }),
    bus.on('combat:hit', (e) => {
      const p = new THREE.Vector3(e.x, e.y, e.z), floor = floorAt(p);
      if (e.result === 'blocked') { fx.clash(p, floor); return; }
      if (e.result === 'guardbreak') fx.clash(p, floor);
      fx.hit(p, d.posOf?.(e.attacker) ?? null, floor, blood(), e.kind === 'heavy');
    }),
    bus.on('combat:parry', (e) => fx.parryStar(new THREE.Vector3(e.x, e.y, e.z))),
    bus.on('move:slam', (e) => fx.slam(new THREE.Vector3(e.x, e.y, e.z))),
  ];
  return () => offs.forEach((o) => o());
}

/**
 * Fire ring per frame: embers near the camera's side of the wall, and inside the wall the world leans
 * toward the heat ramp (2 steps: inside, near the wall).
 */
export function ringFx(fx: FxWorld, pipeline: Pipeline, ring: { cx: number; cz: number; radius: number }, cam: THREE.Vector3, dt: number): void {
  if (ring.radius <= 0) { pipeline.setHeatTint(0); return; }
  fx.embers(dt, ring.cx, ring.cz, ring.radius);
  const dist = Math.hypot(cam.x - ring.cx, cam.z - ring.cz);
  pipeline.setHeatTint(dist < ring.radius ? X.ring.tint * (dist > ring.radius - 2.5 ? 1 : 0.6) : 0);
}
