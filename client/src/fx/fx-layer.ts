import * as THREE from 'three';
import type { CombatWorld } from '../combat/combat-world';
import type { ForgeStage } from '../forge/stage';
import type { CollisionWorld } from '../physics/world';
import type { LightRig } from '../render/lights';
import type { Pipeline } from '../render/pipeline';
import { bindEffectAtoms } from './effect-atoms';
import { WallBlockers } from './wall-blockers';
import { EffectView } from './effect-view';
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
  /** Form-effect entities (phase 28) from combat.effects, and their instant moments. */
  readonly effects: EffectView | null = null;
  private atoms: ReturnType<typeof bindEffectAtoms> | null = null;
  private cam = new THREE.Vector3();
  private walls: WallBlockers | null = null;

  constructor(private o: FxLayerOpts) {
    this.fx = new FxWorld(o.rig, o.seed ?? 1);
    o.scene.add(this.fx.root);
    this.unbind = bindFx({
      fx: this.fx, world: o.world, stage: o.stage, blood: o.blood,
      posOf: (id) => o.combat?.byId(id)?.body.s.pos ?? null,
    });
    const ray = new THREE.Vector3(), down = new THREE.Vector3(0, -1, 0);
    const floorAt = (p: THREE.Vector3) => { const h = o.world?.raycast(ray.set(p.x, p.y + 0.05, p.z), down, 6); return h ? h.point.y : p.y - 0.5; };
    const combat = o.combat;
    if (combat) {
      this.effects = new EffectView(o.rig, this.fx, () => combat.effects.ents(performance.now() / 1000), (id) => combat.byId(id)?.body.s.pos ?? null, floorAt);
      o.scene.add(this.effects.root);
    }
    if (combat && o.world) this.walls = new WallBlockers(o.world);
    this.atoms = bindEffectAtoms(this.fx, floorAt, () => this.cam);
  }

  /** A ribbon behind a weapon; `parent` is where it lives (the world scene, or the viewmodel's eye group). */
  trail(getModel: () => THREE.Object3D | null, active: () => boolean, attach: (m: THREE.Object3D) => void): WeaponTrail {
    const t = new WeaponTrail(this.o.rig, getModel, active);
    attach(t.mesh);
    this.trails.push(t);
    return t;
  }

  update(dt: number, camera: THREE.PerspectiveCamera): void {
    this.cam.setFromMatrixPosition(camera.matrixWorld);
    this.effects?.update(dt);
    if (this.walls && this.o.combat) this.walls.sync(this.o.combat.effects.ents(performance.now() / 1000));
    this.atoms?.update(dt);
    this.fx.update(dt, camera, this.o.pipeline.height);
    for (const t of this.trails) t.update(dt);
    if (this.o.ring) ringFx(this.fx, this.o.pipeline, this.o.ring, camera.position, dt);
  }

  dispose(): void { this.walls?.dispose(); this.unbind(); this.effects?.dispose(); this.atoms?.dispose(); this.trails.forEach((t) => t.dispose()); this.fx.dispose(); if (this.o.ring) this.o.pipeline.setHeatTint(0); }
}
