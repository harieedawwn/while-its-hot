import * as THREE from 'three';
import { FEEL } from '../core/feel';

/** A point light for the PSX material. Not a THREE.Light: three's lighting is never used. */
export interface PointLight { pos: THREE.Vector3; color: THREE.Color; intensity: number; range: number; on: boolean; }

/**
 * Scene lighting for the PSX material: hemisphere ambient, one directional, fog, and a pool of point
 * lights from which each object gets its nearest 4 (by influence) right before it draws.
 * `shared` uniform objects are referenced (not copied) by every PSX material made with this rig.
 */
export class LightRig {
  readonly lights: PointLight[] = [];
  readonly shared = {
    uHemiSky: { value: new THREE.Color('#202228') },
    uHemiGround: { value: new THREE.Color('#120a07') },
    uDirDir: { value: new THREE.Vector3(0, 1, 0) },
    uDirColor: { value: new THREE.Color(0, 0, 0) },
    uFogColor: { value: new THREE.Color('#000000') },
    uFog: { value: new THREE.Vector2(8, 30) },
    uSnap: { value: new THREE.Vector2(0, 0) },
  };
  private scratch = new THREE.Vector3();
  private score = new Float32Array(64);
  private order = new Int16Array(64);

  setHemi(sky: THREE.ColorRepresentation, ground: THREE.ColorRepresentation, k = 1): void {
    this.shared.uHemiSky.value.set(sky).multiplyScalar(k);
    this.shared.uHemiGround.value.set(ground).multiplyScalar(k);
  }
  /** dir = direction the light travels FROM (toward the light), normalized internally. */
  setDir(dir: THREE.Vector3Tuple, color: THREE.ColorRepresentation, k = 1): void {
    this.shared.uDirDir.value.set(...dir).normalize();
    this.shared.uDirColor.value.set(color).multiplyScalar(k);
  }
  setFog(color: THREE.ColorRepresentation, near: number, far: number): void {
    this.shared.uFogColor.value.set(color);
    this.shared.uFog.value.set(near, far);
  }
  /** Linear fog color as a clear color, so the far edge of the world is the fog. */
  get fogColor(): THREE.Color { return this.shared.uFogColor.value; }
  add(pos: THREE.Vector3Tuple, color: THREE.ColorRepresentation, intensity: number, range: number): PointLight {
    const l = { pos: new THREE.Vector3(...pos), color: new THREE.Color(color), intensity, range, on: true };
    this.lights.push(l);
    return l;
  }

  /** Fill per-object light uniforms for the object at world point c with bounding radius r. */
  pick(c: THREE.Vector3, r: number, outPos: THREE.Vector4[], outCol: THREE.Color[]): void {
    const n = Math.min(this.lights.length, 64);
    let m = 0;
    for (let i = 0; i < n; i++) {
      const l = this.lights[i];
      if (!l.on || l.intensity <= 0) continue;
      const d = this.scratch.copy(l.pos).sub(c).length() - r;
      if (d >= l.range) continue;
      // influence: brighter and closer wins; insertion sort into a short list
      const s = l.intensity * (1 - Math.max(0, d) / l.range);
      let k = m++;
      while (k > 0 && this.score[k - 1] < s) { this.score[k] = this.score[k - 1]; this.order[k] = this.order[k - 1]; k--; }
      this.score[k] = s; this.order[k] = i;
    }
    for (let j = 0; j < FEEL.render.maxPointLights; j++) {
      if (j < m) {
        const l = this.lights[this.order[j]];
        outPos[j].set(l.pos.x, l.pos.y, l.pos.z, l.range);
        outCol[j].copy(l.color).multiplyScalar(l.intensity);
      } else { outPos[j].set(0, -1e4, 0, 0); outCol[j].setRGB(0, 0, 0); }
    }
  }
}
