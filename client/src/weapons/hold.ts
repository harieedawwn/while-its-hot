import * as THREE from 'three';
import type { WeaponDef } from '@wih/shared';
import { mirrorLeft } from './weapon';

/** Turn a weapon model (grip at origin, blade +Y, edge +Z) into the hand socket frame: blade forward, edge down. */
export function gripInHand(model: THREE.Object3D): THREE.Object3D {
  model.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3(-1, 0, 0), new THREE.Vector3(0, 0, -1), new THREE.Vector3(0, -1, 0)));
  return model;
}

/**
 * Put a weapon in a third-person character's hands: the right hand always; two-fist movesets (tay) also get
 * the mirrored gauntlet on the left. Returns what was added (remove + dispose them on a weapon change).
 */
export function holdWeapon(hold: { hand_r: THREE.Object3D; hand_l: THREE.Object3D }, model: THREE.Object3D, def: WeaponDef): THREE.Object3D[] {
  hold.hand_r.add(gripInHand(model));
  if (def.stats.moveset !== 'tay') return [model];
  const l = gripInHand(mirrorLeft(model));
  hold.hand_l.add(l);
  return [model, l];
}
