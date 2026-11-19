import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { weaponById } from '@wih/shared';
import type { ModelCtx } from '../render/models/kit';
import { WEAPON_MODELS } from './models';
import { setHeat } from './wkit';

/**
 * Weapon instances (LOOK §3). `buildWeapon` is the sync procedural build; `loadWeapon` first looks for
 * `public/models/weapons/<model>.glb` (same contract: grip at origin, +Y, edge +Z, nodes named `tip`/`base`,
 * optional `_HEATMASK` vertex attribute) and falls back to the procedural build.
 */
export function buildWeapon(id: string, ctx: ModelCtx): THREE.Group {
  const def = weaponById(id);
  const m = WEAPON_MODELS[def.model];
  if (!m) throw new Error(`no model ${def.model} for weapon ${id}`);
  return m.build(ctx);
}

const glbCache = new Map<string, Promise<THREE.Group | null>>();

export async function loadWeapon(id: string, ctx: ModelCtx): Promise<THREE.Group> {
  const model = weaponById(id).model;
  let p = glbCache.get(model);
  if (!p) { p = fetchGlb(model, ctx); glbCache.set(model, p); }
  const g = await p;
  if (!g) return buildWeapon(id, ctx);
  const c = g.clone(true);
  c.name = id;
  return c;
}

async function fetchGlb(model: string, ctx: ModelCtx): Promise<THREE.Group | null> {
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}models/weapons/${model}.glb`);
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    // the dev server answers unknown paths with index.html: only a real glTF binary counts
    if (buf.byteLength < 12 || new TextDecoder().decode(new Uint8Array(buf, 0, 4)) !== 'glTF') return null;
    const gltf = await new GLTFLoader().parseAsync(buf, '');
    const root = new THREE.Group();
    root.name = model;
    root.add(gltf.scene);
    const mat = ctx.lib.get('forged');
    gltf.scene.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      const hm = mesh.geometry.getAttribute('_heatmask');
      if (hm) { mesh.geometry.setAttribute('heatMask', hm); mesh.geometry.deleteAttribute('_heatmask'); }
      if (!mesh.geometry.getAttribute('color')) mesh.geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n2(mesh) * 3).fill(1), 3));
      if (!mesh.geometry.getAttribute('uv')) mesh.geometry.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n2(mesh) * 2), 2));
      mesh.material = mat;
    });
    return root;
  } catch {
    return null;
  }
}

const n2 = (m: THREE.Mesh) => m.geometry.getAttribute('position').count;

/** The `tip`/`base`/`grip_l` marker of a built weapon (world-agnostic: local to the weapon root). */
export function marker(root: THREE.Object3D, name: 'tip' | 'base' | 'grip_l'): THREE.Object3D | undefined {
  return root.getObjectByName(name);
}
export { setHeat };
