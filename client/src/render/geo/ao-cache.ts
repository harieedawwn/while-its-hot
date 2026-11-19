import type * as THREE from 'three';
import type { AOOpts } from './ao';

/**
 * Pre-baked vertex AO (phase 19). Baking the foundry costs ~2 s on a desktop and many times that on a phone, and the
 * result is deterministic, so `tools/aobake.mjs` bakes it once into `public/ao/<key>.bin` and the game just loads it.
 * File = u32 magic, u32 fingerprint, u32 vertex count, then one byte per vertex (factor 0..1 -> 0..255).
 * The fingerprint hashes the world-space vertex positions + the bake options; if the geometry changed since the bake
 * the file is ignored and the game computes AO at load as before (and logs why in dev).
 */
const MAGIC = 0x314f4157; // "WAO1"
const loaded = new Map<string, Uint8Array>();
const params = typeof location === 'undefined' ? new URLSearchParams() : new URLSearchParams(location.search);
const forceBake = params.get('aobake') === '1';

declare global { interface Window { __aoBake?: Record<string, string> } }

function fingerprint(meshes: THREE.Mesh[], o: AOOpts): number {
  let h = 2166136261;
  const mix = (v: number) => { h = Math.imul(h ^ (v | 0), 16777619) >>> 0; };
  mix(Math.round((o.rays ?? 12) * 7 + (o.dist ?? 1.4) * 1000 + (o.strength ?? 0.8) * 100000));
  for (const m of [...meshes, ...(o.occluders ?? [])]) {
    m.updateMatrixWorld(true);
    const pos = m.geometry.getAttribute('position'), e = m.matrixWorld.elements;
    mix(pos.count);
    const stride = Math.max(1, Math.floor(pos.count / 400)); // 400 samples/mesh is plenty to notice any edit
    for (let i = 0; i < pos.count; i += stride) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      mix(Math.round((e[0] * x + e[4] * y + e[8] * z + e[12]) * 1000));
      mix(Math.round((e[1] * x + e[5] * y + e[9] * z + e[13]) * 1000));
      mix(Math.round((e[2] * x + e[6] * y + e[10] * z + e[14]) * 1000));
    }
  }
  return h >>> 0;
}
const count = (meshes: THREE.Mesh[]) => meshes.reduce((n, m) => n + m.geometry.getAttribute('position').count, 0);

/** Fetch a baked file into memory. Await this before building the geometry that will call `bakeAO({ key })`. */
export async function preloadAO(key: string): Promise<void> {
  if (forceBake || loaded.has(key)) return;
  try {
    const r = await fetch(`${import.meta.env.BASE_URL}ao/${key}.bin`);
    if (r.ok) loaded.set(key, new Uint8Array(await r.arrayBuffer()));
  } catch { /* offline dev server hiccup: compute instead */ }
}

export function cachedAO(key: string, meshes: THREE.Mesh[], o: AOOpts): Float32Array | null {
  const f = loaded.get(key);
  if (!f) return null;
  const dv = new DataView(f.buffer, f.byteOffset, f.byteLength);
  const n = count(meshes);
  if (f.byteLength !== 12 + n || dv.getUint32(0, true) !== MAGIC || dv.getUint32(4, true) !== fingerprint(meshes, o) || dv.getUint32(8, true) !== n) {
    if (import.meta.env.DEV) console.warn(`[ao] "${key}" is stale: run node tools/aobake.mjs (computing at load instead)`);
    return null;
  }
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = f[12 + i] / 255;
  return out;
}

/** Only used by tools/aobake.mjs (`?aobake=1`): leave the fresh result where the harness can read it. */
export function recordAO(key: string, meshes: THREE.Mesh[], o: AOOpts, k: Float32Array): void {
  if (!forceBake) return;
  const buf = new Uint8Array(12 + k.length), dv = new DataView(buf.buffer);
  dv.setUint32(0, MAGIC, true); dv.setUint32(4, fingerprint(meshes, o), true); dv.setUint32(8, k.length, true);
  for (let i = 0; i < k.length; i++) buf[12 + i] = Math.round(k[i] * 255);
  let s = ''; for (let i = 0; i < buf.length; i += 8192) s += String.fromCharCode(...buf.subarray(i, i + 8192));
  (window.__aoBake ??= {})[key] = btoa(s);
}
