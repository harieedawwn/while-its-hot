import * as THREE from 'three';
import type { SocketName } from '@wih/shared';

/**
 * Rigid segmented skeleton (LOOK §4): 15 bones as Object3D, no skinning shader. Character space: feet at
 * the origin, +Y up, the character FACES −Z (so `group.rotation.y = player yaw`), +X is its right.
 * Rotation axes in poses/clips (degrees): limbs hang along −Y.
 *   arm/thigh x+  = swing forward      shin x−  = knee bends      fore x+ = elbow bends (hand forward)
 *   pelvis/chest x− = lean forward     head x− = look down        head y+ = turn left
 *   right arm z+ = out to the side (left arm z−)                  foot x+ = toe up
 */
export const BONES = [
  'pelvis', 'chest', 'head',
  'arm_l', 'fore_l', 'hand_l', 'arm_r', 'fore_r', 'hand_r',
  'thigh_l', 'shin_l', 'foot_l', 'thigh_r', 'shin_r', 'foot_r',
] as const;
export type BoneName = (typeof BONES)[number];
export const BONE_COUNT = BONES.length;
export const BONE_INDEX: Record<BoneName, number> = Object.fromEntries(BONES.map((b, i) => [b, i])) as Record<BoneName, number>;

type V3 = readonly [number, number, number];
interface BoneDef { parent: BoneName | null; rest: V3; }
export const BONE_DEFS: Record<BoneName, BoneDef> = {
  pelvis: { parent: null, rest: [0, 0.95, 0] },
  chest: { parent: 'pelvis', rest: [0, 0.12, 0] },
  head: { parent: 'chest', rest: [0, 0.43, 0] },
  arm_l: { parent: 'chest', rest: [-0.27, 0.36, 0] },
  fore_l: { parent: 'arm_l', rest: [0, -0.29, 0] },
  hand_l: { parent: 'fore_l', rest: [0, -0.27, 0] },
  arm_r: { parent: 'chest', rest: [0.27, 0.36, 0] },
  fore_r: { parent: 'arm_r', rest: [0, -0.29, 0] },
  hand_r: { parent: 'fore_r', rest: [0, -0.27, 0] },
  thigh_l: { parent: 'pelvis', rest: [-0.115, -0.03, 0] },
  shin_l: { parent: 'thigh_l', rest: [0, -0.45, 0] },
  foot_l: { parent: 'shin_l', rest: [0, -0.38, 0] },
  thigh_r: { parent: 'pelvis', rest: [0.115, -0.03, 0] },
  shin_r: { parent: 'thigh_r', rest: [0, -0.45, 0] },
  foot_r: { parent: 'shin_r', rest: [0, -0.38, 0] },
};
export const PARENT: Int8Array = Int8Array.from(BONES.map((b) => { const p = BONE_DEFS[b].parent; return p === null ? -1 : BONE_INDEX[p]; }));

/** Armor sockets (GDD §7 + shin_l/r for greaves): the bone they ride and where the part's origin sits. Axes are the bone's own (front = −Z, back = +Z, right = +X). */
export const SOCKETS: Record<SocketName, { bone: BoneName; pos: V3 }> = {
  head: { bone: 'head', pos: [0, 0.15, 0] },
  chest: { bone: 'chest', pos: [0, 0.2, 0] },
  back: { bone: 'chest', pos: [0, 0.22, 0.17] },
  shoulder_l: { bone: 'arm_l', pos: [-0.03, 0.03, 0] },
  shoulder_r: { bone: 'arm_r', pos: [0.03, 0.03, 0] },
  forearm_l: { bone: 'fore_l', pos: [0, -0.13, 0] },
  forearm_r: { bone: 'fore_r', pos: [0, -0.13, 0] },
  thigh_l: { bone: 'thigh_l', pos: [0, -0.22, 0] },
  thigh_r: { bone: 'thigh_r', pos: [0, -0.22, 0] },
  shin_l: { bone: 'shin_l', pos: [0, -0.2, 0] },
  shin_r: { bone: 'shin_r', pos: [0, -0.2, 0] },
  heel_l: { bone: 'foot_l', pos: [0, -0.02, 0.09] },
  heel_r: { bone: 'foot_r', pos: [0, -0.02, 0.09] },
  hip: { bone: 'pelvis', pos: [0, 0, 0] },
};
/** Attachment points for held items (weapon contract: grip at origin, blade along +Y). */
export const HOLD = { hand_l: { bone: 'hand_l', pos: [0, -0.07, 0] }, hand_r: { bone: 'hand_r', pos: [0, -0.07, 0] } } as const;

/** One animation pose in a flat array: 3 radians per bone (Euler XYZ, BONES order) then the pelvis offset (x,y,z meters) from its rest height. */
export type Pose = Float32Array;
export const POSE_LEN = BONE_COUNT * 3 + 3;
export const ROOT_AT = BONE_COUNT * 3;
export const newPose = (): Pose => new Float32Array(POSE_LEN);

/**
 * Bone Object3D tree (holds sockets, weapons) plus root-relative matrices for the CPU skinning of the
 * baked body meshes. Bones are NOT meshes: the character's meshes sit directly under the root group.
 */
export class Skeleton {
  readonly root = new THREE.Group();
  readonly bones: THREE.Object3D[] = [];
  /** Bone → root-space matrix after `apply`. */
  readonly rel: THREE.Matrix4[] = [];
  readonly hold: Record<keyof typeof HOLD, THREE.Object3D>;

  constructor() {
    BONES.forEach((n, i) => {
      const o = new THREE.Object3D();
      o.name = n; o.position.set(...BONE_DEFS[n].rest); o.rotation.order = 'XYZ';
      (PARENT[i] < 0 ? this.root : this.bones[PARENT[i]]).add(o);
      this.bones.push(o);
      this.rel.push(new THREE.Matrix4());
    });
    const mk = (k: keyof typeof HOLD) => {
      const o = new THREE.Object3D(); o.name = k; o.position.set(...HOLD[k].pos);
      this.bones[BONE_INDEX[HOLD[k].bone]].add(o); return o;
    };
    this.hold = { hand_l: mk('hand_l'), hand_r: mk('hand_r') };
    this.apply(newPose());
  }

  /** Write a pose to the bones and refresh the root-relative matrices. */
  apply(p: Pose): void {
    for (let i = 0; i < BONE_COUNT; i++) {
      const o = this.bones[i];
      o.rotation.set(p[i * 3], p[i * 3 + 1], p[i * 3 + 2]);
      if (i === 0) o.position.set(BONE_DEFS.pelvis.rest[0] + p[ROOT_AT], BONE_DEFS.pelvis.rest[1] + p[ROOT_AT + 1], BONE_DEFS.pelvis.rest[2] + p[ROOT_AT + 2]);
      o.updateMatrix();
      if (PARENT[i] < 0) this.rel[i].copy(o.matrix); else this.rel[i].multiplyMatrices(this.rel[PARENT[i]], o.matrix);
    }
  }
}
