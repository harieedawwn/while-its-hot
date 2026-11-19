import * as THREE from 'three';
import { FEEL } from '../core/feel';
import type { CollisionWorld } from '../physics/world';
import type { ViewState } from './camera';

const T = FEEL.thirdPerson;

/**
 * Third-person option (LOOK §4): takes the camera the first-person rig already placed (FOV kicks, roll,
 * shake and look all come for free) and moves it behind and beside the head, so the view direction is the
 * aim direction. Collision-aware: a ray from the pivot to the wanted spot pulls the camera in front of walls
 * at once and lets it ease back out.
 */
export class ThirdPersonCamera {
  private dist: number = T.dist;
  private fwd = new THREE.Vector3();
  private right = new THREE.Vector3();
  private pivot = new THREE.Vector3();
  private want = new THREE.Vector3();

  /** Reposition `cam` (already oriented) around the body at `v.pos`. `world` may be null (no collision). */
  apply(cam: THREE.PerspectiveCamera, v: ViewState, dt: number, world: CollisionWorld | null): void {
    cam.getWorldDirection(this.fwd);
    this.right.crossVectors(this.fwd, THREE.Object3D.DEFAULT_UP).normalize();
    // pivot: the shoulder height above the feet, nudged to the right shoulder
    this.pivot.set(v.pos.x, v.pos.y + (v.low ? T.pivotY - 0.7 : T.pivotY), v.pos.z).addScaledVector(this.right, T.shoulder);
    let allowed: number = T.dist;
    this.want.copy(this.fwd).multiplyScalar(-1);
    if (world) {
      // also keep the pivot itself inside the room: shoulder ray first
      const origin = new THREE.Vector3(v.pos.x, this.pivot.y, v.pos.z);
      const side = this.pivot.clone().sub(origin);
      const sl = side.length();
      if (sl > 1e-4) {
        const h = world.raycast(origin, side.clone().normalize(), sl + T.margin);
        if (h) this.pivot.copy(origin).addScaledVector(side.normalize(), Math.max(0, h.distance - T.margin));
      }
      const hit = world.raycast(this.pivot, this.want, T.dist + T.margin);
      if (hit) allowed = Math.max(T.minDist, hit.distance - T.margin);
    }
    // in at once, out smoothly
    this.dist = allowed < this.dist ? allowed : this.dist + (allowed - this.dist) * Math.min(1, T.outRate * dt);
    cam.position.copy(this.pivot).addScaledVector(this.want, this.dist);
    cam.updateMatrixWorld();
  }

  /** Forget the eased distance (respawn, scene change). */
  reset(): void { this.dist = T.dist; }
}
