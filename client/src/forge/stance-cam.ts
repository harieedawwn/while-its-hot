import * as THREE from 'three';
import { BALANCE } from '@wih/shared';
import { FEEL } from '../core/feel';
import type { Anvil } from './anvil';

const S = FEEL.forge, B = BALANCE.forge.stance, FR = S.frenzy;
const ease = (t: number) => t * t * (3 - 2 * t);

/**
 * Over-the-anvil camera (GDD §6): after the first-person camera has run, blend its pose toward a fixed
 * view of the working face. In 0.35 s, out 0.2 s. `k` (0..1, eased) tells the scene when to hide the viewmodel.
 */
export class StanceCamera {
  /** Raw progress 0..1 and its eased value. */
  private p = 0;
  k = 0;
  /** Nhập thần punch-in 0..1 (in over fovInS, out over outS). */
  private fk = 0;
  private pos = new THREE.Vector3();
  private look = new THREE.Vector3();
  private q = new THREE.Quaternion();
  private m = new THREE.Matrix4();
  private up = new THREE.Vector3(0, 1, 0);

  /** Move the blend and (when k > 0) pull the camera toward the stance pose. */
  apply(dt: number, on: boolean, anvil: Anvil, cam: THREE.PerspectiveCamera, frenzy = false): void {
    this.fk = frenzy ? Math.min(1, this.fk + dt / FR.fovInS) : Math.max(0, this.fk - dt / FR.outS);
    const rate = on ? 1 / B.blendInS : 1 / B.blendOutS;
    this.p = on ? Math.min(1, this.p + dt * rate) : Math.max(0, this.p - dt * rate);
    this.k = ease(this.p);
    if (this.k <= 0) return;
    anvil.root.updateMatrixWorld(true);
    this.pos.set(...S.cam.pos).applyMatrix4(anvil.root.matrixWorld);
    this.look.set(...S.cam.look).applyMatrix4(anvil.root.matrixWorld);
    this.m.lookAt(this.pos, this.look, this.up);
    this.q.setFromRotationMatrix(this.m);
    cam.position.lerp(this.pos, this.k);
    cam.quaternion.slerp(this.q, this.k);
    cam.fov += (S.cam.vfov - cam.fov) * this.k;
    cam.fov -= FR.fovPunch * ease(this.fk) * this.k;
    cam.updateProjectionMatrix();
  }
  /** 0..1 of the Nhập thần look (the vignette follows it). */
  get frenzyK(): number { return ease(this.fk); }
  reset(): void { this.p = 0; this.k = 0; this.fk = 0; }
}
