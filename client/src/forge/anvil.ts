import * as THREE from 'three';
import { AnvilRule, type AnvilPhase, BALANCE } from '@wih/shared';
import { bus } from '../core/events';
import { FEEL } from '../core/feel';
import * as P from '../render/geo/procgeo';
import type { PointLight, LightRig } from '../render/lights';
import type { MaterialLib } from '../render/materials/library';
import { build as buildAnvil, ANVIL } from '../render/models/anvil';
import { build as buildBrazier, BRAZIER } from '../render/models/brazier';
import { flat, mesh } from '../render/models/kit';
import type { CollisionWorld } from '../physics/world';
import type { Blocker } from '../physics/blockers';

const A = BALANCE.forge.anvil;
/** Brazier offset along the anvil's +X (horn) axis: it stands at the heel, on the smith's left. */
export const BRAZIER_X = FEEL.forge.blade.brazierX;

/**
 * A player's anvil (Đe): the model + a color band + its brazier, the place/lift animation, two solid
 * blockers and a warm point light. Rules (timers) are `AnvilRule` in shared/. Local frame: +X = horn,
 * +Z = the smith's side; `root.rotation.y` = the smith's yaw so the horn points to their right.
 */
export class Anvil {
  readonly rule = new AnvilRule();
  readonly root = new THREE.Group();
  readonly pos = new THREE.Vector3();
  yaw = 0;
  /** Brazier coals (heat is driven by the stage while the blade is in the fire). */
  readonly coal: THREE.Object3D | undefined;
  private body = new THREE.Group();
  private blockers: Blocker[];
  private light: PointLight;
  private drop = 0;

  constructor(lib: MaterialLib, rig: LightRig, private world: CollisionWorld, color: string, readonly ownerId = 0) {
    this.root.name = 'anvil_station';
    const ctx = { lib };
    this.body.add(buildAnvil(ctx));
    const brazier = buildBrazier(ctx);
    brazier.position.x = BRAZIER_X;
    this.body.add(brazier);
    this.coal = brazier.getObjectByName('brazier:coal');
    const band = mesh(flat(P.bake([P.part(new THREE.TorusGeometry(0.207, 0.017, 4, 14), color, { pos: [0, 0.27, 0], rot: [Math.PI / 2, 0, 0] })], { shade: 0 })), lib.get('paint'), 'anvil:band');
    this.body.add(band);
    this.root.add(this.body);
    this.root.visible = false;
    this.light = rig.add([0, 0, 0], '#ff8a44', 2.4, 7);
    this.light.on = false;
    this.blockers = [
      { x: 0, z: 0, r: A.radius, y: 0, h: A.height, on: false },
      { x: 0, z: 0, r: 0.34, y: 0, h: BRAZIER.bowlY + 0.2, on: false },
    ];
    world.blockers.push(...this.blockers);
  }

  get phase(): AnvilPhase { return this.rule.phase; }
  get usable(): boolean { return this.rule.usable; }
  /** Horizontal distance from a point to the anvil center. */
  dist(p: THREE.Vector3): number { return Math.hypot(p.x - this.pos.x, p.z - this.pos.z); }
  /** True if a player at p is close enough to use it. */
  inReach(p: THREE.Vector3): boolean { return this.usable && this.dist(p) <= A.useRadius; }

  /** World point on the anvil's working face. */
  face(out = new THREE.Vector3()): THREE.Vector3 { return out.set(-0.06, ANVIL.faceY, 0).applyMatrix4(this.root.matrixWorld); }

  /** Place in front of the smith at their feet position and yaw. Snaps to the floor under that point. */
  place(feet: THREE.Vector3, yaw: number): boolean {
    if (!this.rule.canPlace) return false;
    const fx = -Math.sin(yaw), fz = -Math.cos(yaw);
    const x = feet.x + fx * A.placeDist, z = feet.z + fz * A.placeDist;
    const hit = this.world.raycast(new THREE.Vector3(x, feet.y + 1.2, z), new THREE.Vector3(0, -1, 0), 3);
    const y = hit ? hit.point.y : feet.y;
    if (!this.rule.place()) return false;
    this.yaw = yaw; this.pos.set(x, y, z);
    this.root.position.copy(this.pos); this.root.rotation.y = yaw;
    this.root.visible = true; this.root.updateMatrixWorld(true);
    this.drop = FEEL.forge.drop;
    const co = Math.cos(yaw), si = Math.sin(yaw);
    this.blockers[0].x = x; this.blockers[0].z = z; this.blockers[0].y = y;
    this.blockers[1].x = x + co * BRAZIER_X; this.blockers[1].z = z - si * BRAZIER_X; this.blockers[1].y = y;
    this.light.pos.set(this.blockers[1].x, y + BRAZIER.fireY + 0.25, this.blockers[1].z);
    for (const b of this.blockers) b.on = true;
    this.light.on = true;
    bus.emit('forge:anvil', { act: 'place', x, y, z, owner: this.ownerId });
    return true;
  }

  lift(): boolean {
    if (!this.rule.lift()) return false;
    bus.emit('forge:anvil', { act: 'lift', x: this.pos.x, y: this.pos.y, z: this.pos.z, owner: this.ownerId });
    if (this.rule.phase === 'carried') this.hide();
    return true;
  }

  private hide(): void { this.root.visible = false; this.light.on = false; for (const b of this.blockers) b.on = false; }

  /** Per sim tick: timers. Per frame animation lives in `animate`. */
  tick(dt: number): void {
    const e = this.rule.tick(dt);
    if (e === 'placed') bus.emit('forge:anvil', { act: 'placed', x: this.pos.x, y: this.pos.y, z: this.pos.z, owner: this.ownerId });
    if (e === 'carried') this.hide();
  }

  /** Drop-in while placing, lift-out while lifting. */
  animate(): void {
    const r = this.rule, D = FEEL.forge.drop;
    let k = 0;
    if (r.phase === 'placing') k = Math.max(0, r.t) / A.placeS;
    else if (r.phase === 'lifting') k = 1 - Math.max(0, r.t) / A.pickupS;
    this.drop = k > 0 ? D * k * k : 0;
    this.body.position.y = this.drop;
    this.root.updateMatrixWorld(true);
  }

  dispose(): void {
    this.hide();
    for (const b of this.blockers) { const i = this.world.blockers.indexOf(b); if (i >= 0) this.world.blockers.splice(i, 1); }
    this.root.traverse((o) => { if (o instanceof THREE.Mesh) o.geometry.dispose(); });
  }
}
