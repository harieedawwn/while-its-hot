import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import * as P from '../../render/geo/procgeo';
import { boxUV } from '../../render/geo/uv';
import { BONE_INDEX, type BoneName } from './skeleton';

type V3 = readonly [number, number, number];
export interface AddOpts {
  /** Hard normals (metal). Default smooth (cloth/leather). */
  flat?: boolean;
  /** Mirror across x (build the left side from the right). */
  mirror?: boolean;
  /** 1 = player color band: white at build time, tinted by `recolor`. */
  tag?: number;
}

/**
 * Collects bone-local parts for rigid CPU skinning: every vertex follows exactly one bone, so a pose is one
 * matrix multiply per vertex and the whole character stays 1 draw call per surface (TECH §8: ≤ 3).
 */
export class SkinBatch {
  private items: { bone: number; g: THREE.BufferGeometry; tag: number }[] = [];

  /** Bake `parts` (bone-local space), move them by `at` and attach to `bone`. */
  add(bone: BoneName, at: V3, parts: P.Part[], o: AddOpts = {}): void {
    let g = P.bake(parts);
    g = g.toNonIndexed();
    if (o.flat) { g.deleteAttribute('normal'); g.computeVertexNormals(); }
    if (o.mirror) mirrorX(g);
    g.translate(o.mirror ? -at[0] : at[0], at[1], at[2]);
    this.items.push({ bone: BONE_INDEX[bone], g, tag: o.tag ?? 0 });
  }

  get tris(): number { return this.items.reduce((n, i) => n + i.g.getAttribute('position').count / 3, 0); }
  get empty(): boolean { return this.items.length === 0; }

  /** `tile` = meters per texture repeat (characters are small: far finer than world surfaces). */
  build(mat: THREE.Material, tile = 0.3): SkinMesh {
    const geos = this.items.map((i) => i.g);
    const g = mergeGeometries(geos, false);
    const n = g.getAttribute('position').count;
    const bone = new Uint8Array(n), tag = new Uint8Array(n);
    let k = 0;
    for (const it of this.items) {
      const c = it.g.getAttribute('position').count;
      bone.fill(it.bone, k, k + c); tag.fill(it.tag, k, k + c); k += c;
    }
    boxUV(g, tile);
    return new SkinMesh(g, mat, bone, tag);
  }
}

/** Flip x and the winding order of a non-indexed geometry. */
function mirrorX(g: THREE.BufferGeometry): void {
  for (const name of ['position', 'normal']) {
    const a = g.getAttribute(name);
    for (let i = 0; i < a.count; i++) a.setX(i, -a.getX(i));
  }
  for (const name of Object.keys(g.attributes)) {
    const a = g.getAttribute(name) as THREE.BufferAttribute;
    const s = a.itemSize, arr = a.array as Float32Array;
    for (let t = 0; t < a.count; t += 3) for (let c = 0; c < s; c++) {
      const i1 = (t + 1) * s + c, i2 = (t + 2) * s + c, tmp = arr[i1];
      arr[i1] = arr[i2]; arr[i2] = tmp;
    }
  }
}

/** The merged, dynamically skinned mesh of one surface. */
export class SkinMesh {
  readonly mesh: THREE.Mesh;
  private rest: Float32Array;
  private restN: Float32Array;
  private col0: Float32Array;
  private pos: THREE.BufferAttribute;
  private nor: THREE.BufferAttribute;

  constructor(readonly geo: THREE.BufferGeometry, mat: THREE.Material, private bone: Uint8Array, private tag: Uint8Array) {
    this.pos = geo.getAttribute('position') as THREE.BufferAttribute;
    this.nor = geo.getAttribute('normal') as THREE.BufferAttribute;
    this.rest = new Float32Array(this.pos.array);
    this.restN = new Float32Array(this.nor.array);
    this.col0 = new Float32Array((geo.getAttribute('color') as THREE.BufferAttribute).array);
    this.pos.setUsage(THREE.DynamicDrawUsage);
    this.nor.setUsage(THREE.DynamicDrawUsage);
    // one fixed sphere around the whole standing/sliding/falling body: lights are picked from it
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0.95, 0), 1.35);
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.frustumCulled = false;
  }

  /** Re-pose every vertex with the root-relative bone matrices. */
  update(rel: THREE.Matrix4[]): void {
    const p = this.pos.array as Float32Array, nn = this.nor.array as Float32Array, r = this.rest, rn = this.restN, b = this.bone;
    for (let i = 0, n = b.length; i < n; i++) {
      const m = rel[b[i]].elements, j = i * 3;
      const x = r[j], y = r[j + 1], z = r[j + 2];
      p[j] = m[0] * x + m[4] * y + m[8] * z + m[12];
      p[j + 1] = m[1] * x + m[5] * y + m[9] * z + m[13];
      p[j + 2] = m[2] * x + m[6] * y + m[10] * z + m[14];
      const a = rn[j], c = rn[j + 1], d = rn[j + 2];
      nn[j] = m[0] * a + m[4] * c + m[8] * d;
      nn[j + 1] = m[1] * a + m[5] * c + m[9] * d;
      nn[j + 2] = m[2] * a + m[6] * c + m[10] * d;
    }
    this.pos.needsUpdate = true; this.nor.needsUpdate = true;
  }

  /** Tint the vertices tagged 1 (the player color band). */
  recolor(color: THREE.ColorRepresentation): void {
    const c = new THREE.Color(color), col = this.geo.getAttribute('color') as THREE.BufferAttribute;
    for (let i = 0; i < this.tag.length; i++) {
      const t = this.tag[i] === 1, j = i * 3;
      col.setXYZ(i, this.col0[j] * (t ? c.r : 1), this.col0[j + 1] * (t ? c.g : 1), this.col0[j + 2] * (t ? c.b : 1));
    }
    col.needsUpdate = true;
  }

  dispose(): void { this.geo.dispose(); }
}
