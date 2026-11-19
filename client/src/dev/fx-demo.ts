import * as THREE from 'three';
import { bus } from '../core/events';
import type { ForgeStage } from '../forge/stage';

/** Every effect the `fx` scene can fire; each one emits the real bus events (so the bindings are what's tested). */
export const FX_IDS = ['strike', 'levelup', 'evolve', 'break', 'hit', 'heavy', 'clash', 'parry', 'slam', 'trail', 'ring', 'molten'] as const;
export type FxId = (typeof FX_IDS)[number];

/** Which camera preset frames an effect. */
export const FX_VIEW: Record<FxId, 'anvil' | 'target' | 'swing' | 'ring' | 'molten'> = {
  strike: 'anvil', levelup: 'anvil', evolve: 'anvil', break: 'anvil',
  hit: 'target', heavy: 'target', clash: 'target', parry: 'target', slam: 'target',
  trail: 'swing', ring: 'ring', molten: 'molten',
};

export interface FxDemoDeps {
  stage: ForgeStage; anvilPos: THREE.Vector3;
  /** Swap the blade on the anvil (preloaded, synchronous): 'next' form or a fresh 'phoi'. */
  swapBlade(which: 'start' | 'next' | 'phoi'): void;
  /** Chest point of the target body and the point the camera stands at (the attacker). */
  chest: THREE.Vector3; eye: THREE.Vector3; feet: THREE.Vector3;
  swing(): void;
  heat: number;
}

/** Fire one effect now. */
export function fireFx(id: FxId, d: FxDemoDeps): void {
  const strike = (outcome: 'tuyet' | 'dat' | 'giu' | 'hong', broke = false) => {
    d.stage.strike();
    const p = d.stage.hitPoint(new THREE.Vector3());
    bus.emit('forge:strike', { outcome, perfect: outcome === 'tuyet', auto: false, target: 'blade', level: 5, refused: false, broke, heat: d.heat, x: p.x, y: p.y, z: p.z });
  };
  const hit = (result: 'hit' | 'blocked', kind: 'light' | 'heavy') => {
    const p = d.chest;
    bus.emit('combat:hit', { attacker: 0, target: 1, dmg: kind === 'heavy' ? 26 : 9, zone: 'torso', kind, result, x: p.x, y: p.y, z: p.z });
  };
  switch (id) {
    case 'strike': strike('tuyet'); break;
    case 'levelup': strike('dat'); break;
    case 'evolve': d.swapBlade('start'); strike('tuyet'); bus.emit('forge:evolve', { form: 'next', family: 'kiem' }); d.swapBlade('next'); break;
    case 'break': d.swapBlade('start'); strike('hong', true); d.swapBlade('phoi'); break;
    case 'hit': hit('hit', 'light'); break;
    case 'heavy': hit('hit', 'heavy'); break;
    case 'clash': hit('blocked', 'light'); break;
    case 'parry': {
      const p = d.chest.clone().lerp(d.eye, 0.45);
      bus.emit('combat:parry', { parrier: 0, attacker: 1, x: p.x, y: p.y, z: p.z });
      break;
    }
    case 'slam': bus.emit('move:slam', { x: d.feet.x, y: d.feet.y, z: d.feet.z }); break;
    case 'trail': d.swing(); break;
    case 'ring': case 'molten': break;
  }
}
