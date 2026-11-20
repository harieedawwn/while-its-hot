import * as THREE from 'three';
import { cbox } from '../../render/geo/cbox';
import * as P from '../../render/geo/procgeo';
import { boxUV } from '../../render/geo/uv';
import type { MaterialLib } from '../../render/materials/library';
import { cyl } from '../../render/models/kit';

/** Same work-clothes colors as the body (player/character/body.ts), multiplied by the cloth texture. */
const C = { shirt: '#e6dcc4', glove: '#cfae8a', skin: '#ecc0a0', belt: '#9a7852' } as const;
/** Elbow anchors in view space (off screen, below and behind the eye). */
export const ELBOW_R = [0.34, -0.6, 0.2] as const;
export const ELBOW_L = [-0.32, -0.6, 0.16] as const;
const ER = new THREE.Vector3(...ELBOW_R), EL = new THREE.Vector3(...ELBOW_L);
const HALF_PI = Math.PI / 2;

/** One forearm: the mitten fist around the grip at the origin, the bare forearm and cuff running back along +Z. */
function buildArm(lib: MaterialLib): THREE.Mesh {
  const g = P.bake([
    P.part(cbox(0.088, 0.1, 0.105, 0.03), C.glove, { pos: [0, 0, 0.012] }),
    P.part(cbox(0.036, 0.06, 0.04, 0.014), C.glove, { pos: [-0.046, 0.03, -0.012], rot: [0, 0, 0.5] }),
    P.part(cyl(0.056, 0.058, 0.05, 7), C.belt, { pos: [0, 0, 0.075], rot: [HALF_PI, 0, 0], shade: 0 }),
    P.part(cyl(0.064, 0.05, 0.3, 7), C.skin, { pos: [0, 0, 0.24], rot: [HALF_PI, 0, 0], shade: 0.1 }),
    P.part(cyl(0.082, 0.078, 0.12, 8), C.shirt, { pos: [0, 0, 0.42], rot: [HALF_PI, 0, 0] }),
  ]).toNonIndexed();
  g.scale(0.82, 0.82, 0.82);
  boxUV(g, 0.3);
  const m = new THREE.Mesh(g, lib.get('cloth'));
  m.frustumCulled = false;
  return m;
}

const bladeV = new THREE.Vector3(), vz = new THREE.Vector3(), vy = new THREE.Vector3(), vx = new THREE.Vector3(), mx = new THREE.Matrix4(), tmp = new THREE.Vector3();

/**
 * First-person forearms (LOOK §6): the right fist sits on the weapon grip and its forearm points back to
 * an off-screen elbow; the left fist goes to the weapon's `grip_l` marker on two-handers, or to the left
 * gauntlet hand (tay), else stays hidden.
 */
export class VmArms {
  readonly root = new THREE.Group();
  private r: THREE.Mesh;
  private l: THREE.Mesh;

  constructor(lib: MaterialLib) {
    this.r = buildArm(lib);
    this.l = buildArm(lib);
    this.root.add(this.r, this.l);
  }

  get tris(): number { return (this.r.geometry.getAttribute('position').count / 3) * 2; }

  /** hand: the viewmodel hand (eye-local); gripL: the weapon's grip_l marker if it has one; handL: the left gauntlet hand when shown. */
  update(hand: THREE.Object3D, gripL: THREE.Object3D | undefined, handL?: THREE.Object3D): void {
    hand.updateMatrix();
    bladeV.set(0, 1, 0).applyQuaternion(hand.quaternion);
    place(this.r, hand.position, bladeV, ER);
    const left = handL?.visible ? handL : undefined;
    this.l.visible = !!gripL || !!left;
    if (left) {
      bladeV.set(0, 1, 0).applyQuaternion(left.quaternion);
      place(this.l, left.position, bladeV, EL);
    } else if (gripL) {
      tmp.copy(gripL.position).applyMatrix4(hand.matrix);
      place(this.l, tmp, bladeV, EL);
    }
  }
}

function place(m: THREE.Mesh, at: THREE.Vector3, blade: THREE.Vector3, elbow: THREE.Vector3): void {
  vz.subVectors(elbow, at).normalize();
  vy.copy(blade).addScaledVector(vz, -blade.dot(vz));
  if (vy.lengthSq() < 1e-6) vy.set(0, 1, 0);
  vy.normalize();
  vx.crossVectors(vy, vz);
  m.quaternion.setFromRotationMatrix(mx.makeBasis(vx, vy, vz));
  m.position.copy(at);
}
