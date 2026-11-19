import type * as THREE from 'three';
import type { CombatWorld } from '../combat/combat-world';
import type { ForgeStage } from '../forge/stage';
import type { CollisionWorld } from '../physics/world';
import type { LightRig } from '../render/lights';
import type { Pipeline } from '../render/pipeline';
import { bindFx, ringFx } from './fx-bind';
import { FxWorld } from './fx-world';
import { WeaponTrail } from './trail';

export interface FxLayerOpts {
  scene: THREE.Scene; rig: LightRig; pipeline: Pipeline; world?: CollisionWorld;
  combat?: CombatWorld; stage?: ForgeStage; seed?: number; blood?: boolean;
  ring?: { cx: number; cz: number; radius: number };
}

/**
 * What a playable scene adds for effects: the FxWorld in its scene, the bus binding, weapon trails and the
 * fire-ring embers/tint. Call `update` once per render frame after everything has its final pose.
 */
export class FxLayer {
  readonly fx: FxWorld;
  private trails: WeaponTrail[] = [];
  private unbind: () => void;

  constructor(private o: FxLayerOpts) {
    this.fx = new FxWorld(o.rig, o.seed ?? 1);
    o.scene.add(this.fx.root);
    this.unbind = bindFx({
      fx: this.fx, world: o.world, stage: o.stage, blood: o.blood,
      posOf: (id) => o.combat?.byId(id)?.body.s.pos ?? null,
    });
  }

  /** A ribbon behind a weapon; `parent` is where it lives (the world scene, or the viewmodel's eye group). */
  trail(getModel: () => THREE.Object3D | null, active: () => boolean, attach: (m: THREE.Object3D) => void): WeaponTrail {
    const t = new WeaponTrail(this.o.rig, getModel, active);
    attach(t.mesh);
    this.trails.push(t);
    return t;
  }

  update(dt: number, camera: THREE.PerspectiveCamera): void {
    this.fx.update(dt, camera, this.o.pipeline.height);
    for (const t of this.trails) t.update(dt);
    if (this.o.ring) ringFx(this.fx, this.o.pipeline, this.o.ring, camera.position, dt);
  }

  dispose(): void { this.unbind(); this.trails.forEach((t) => t.dispose()); this.fx.dispose(); if (this.o.ring) this.o.pipeline.setHeatTint(0); }
}
