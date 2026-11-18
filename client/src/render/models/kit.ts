import * as THREE from 'three';
import type { MaterialLib } from '../materials/library';
import { boxUV } from '../geo/uv';

/** Every model module exports build(ctx): THREE.Object3D (LOOK §2). */
export interface ModelCtx { lib: MaterialLib; seed?: number; }

/** Hard normals per face (metal). Keeps vertex colors. */
export function flat(g: THREE.BufferGeometry): THREE.BufferGeometry {
  const n = g.index ? g.toNonIndexed() : g;
  n.deleteAttribute('normal');
  n.computeVertexNormals();
  return n;
}

/** A model mesh: local box UVs at the material's tile so it also works outside a StaticBatch. */
export function mesh(g: THREE.BufferGeometry, mat: THREE.Material, name = ''): THREE.Mesh {
  boxUV(g, (mat.userData.tile as number | undefined) ?? 1);
  const m = new THREE.Mesh(g, mat);
  m.name = name;
  return m;
}

/** Axis-aligned box with segments every ~`step` meters (so point lights read on big faces). */
export function slab(w: number, h: number, d: number, step = 2): THREE.BufferGeometry {
  const s = (v: number) => Math.max(1, Math.round(v / step));
  const g = new THREE.BoxGeometry(w, h, d, s(w), s(h), s(d));
  g.deleteAttribute('uv');
  return g;
}

/** Plain cylinder without uv (procgeo parts drop uvs anyway). */
export function cyl(rTop: number, rBot: number, h: number, seg = 8): THREE.BufferGeometry {
  const g = new THREE.CylinderGeometry(rTop, rBot, h, seg);
  g.deleteAttribute('uv');
  return g;
}
