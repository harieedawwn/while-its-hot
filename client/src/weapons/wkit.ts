import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { noise3 } from '../render/geo/procgeo';
import type { ModelCtx } from '../render/models/kit';

/**
 * Weapon model builder (LOOK §2–3). Parts are placed, colored and given an atlas skin, then baked into ONE
 * flat-shaded mesh with one material (`forged`, tex weapon.png) = one draw call. Attributes: position,
 * normal, uv, color, heatMask (1 = metal that glows when hot, fittings less, wood/leather 0).
 * Contract: grip at origin, blade/head along +Y, edge (striking face) toward +Z; markers `tip`, `base`
 * (hit sweep + trail segment) and optional `grip_l` (off hand on two-handers).
 */
export type Skin = 'bright' | 'forged' | 'wood' | 'leather';
/** Atlas UV rects [u0, v0, u1, v1], inset 1 texel (texture flipY: v = 1 is the image top). */
const I = 1 / 128;
export const QUAD: Record<Skin, readonly [number, number, number, number]> = {
  bright: [I, 0.5 + I, 0.5 - I, 1 - I], forged: [0.5 + I, 0.5 + I, 1 - I, 1 - I],
  wood: [I, I, 0.5 - I, 0.5 - I], leather: [0.5 + I, I, 1 - I, 0.5 - I],
};
const HEAT: Record<Skin, number> = { bright: 1, forged: 1, wood: 0, leather: 0 };

type V3 = [number, number, number];
/** uv: `long` = across(z)/along(y) stretched to the quad (blades, hafts), `round` = around/along (wraps, rings),
 * `box` = box projection at one scale (heads, guards, pommels). */
export type UVMode = 'long' | 'round' | 'box';
export interface WPartOpts {
  pos?: V3; rot?: V3; scale?: number | V3;
  skin?: Skin; uv?: UVMode; heat?: number;
  /** darken toward the part's bottom (cheap AO) */
  shade?: number;
  /** hammered: displace along normals by noise (meters) */
  dent?: number;
  /** scale pits: darken by noise (0..1) */
  pits?: number;
  /** smooth normals (wraps, leather) instead of flat facets */
  smooth?: boolean;
}

export class WeaponBuilder {
  private parts: { geo: THREE.BufferGeometry; color: THREE.Color; o: WPartOpts }[] = [];
  private marks = new Map<string, V3>();
  constructor(readonly id: string, private seed = 1) {}

  add(geo: THREE.BufferGeometry, color: THREE.ColorRepresentation, o: WPartOpts = {}): this {
    this.parts.push({ geo, color: new THREE.Color(color), o });
    return this;
  }
  mark(name: 'tip' | 'base' | 'grip_l', p: V3): this { this.marks.set(name, p); return this; }

  /** Bake into the contract Group: one mesh + marker Object3Ds. */
  done(ctx: ModelCtx): THREE.Group {
    const g = bakeWeapon(this.parts, this.seed);
    const root = new THREE.Group();
    root.name = this.id;
    const m = new THREE.Mesh(g, ctx.lib.get('forged'));
    m.name = `weapon:${this.id}`;
    root.add(m);
    for (const [n, p] of this.marks) { const o = new THREE.Object3D(); o.name = n; o.position.set(...p); root.add(o); }
    return root;
  }
}

const tmpM = new THREE.Matrix4(), tmpQ = new THREE.Quaternion(), tmpE = new THREE.Euler(), tmpS = new THREE.Vector3();

function bakeWeapon(parts: { geo: THREE.BufferGeometry; color: THREE.Color; o: WPartOpts }[], seed: number): THREE.BufferGeometry {
  const out: THREE.BufferGeometry[] = [];
  parts.forEach(({ geo, color, o }, pi) => {
    let g = geo.clone();
    for (const a of Object.keys(g.attributes)) if (a !== 'position' && a !== 'normal' && a !== 'tint') g.deleteAttribute(a);
    if (!g.getAttribute('normal')) g.computeVertexNormals();
    if (o.dent) dent(g, o.dent, seed * 31 + pi);
    const skin = o.skin ?? 'bright';
    partUV(g, QUAD[skin], o.uv ?? 'box');
    const sc: V3 = o.scale == null ? [1, 1, 1] : typeof o.scale === 'number' ? [o.scale, o.scale, o.scale] : o.scale;
    tmpM.compose(new THREE.Vector3(...(o.pos ?? [0, 0, 0])), tmpQ.setFromEuler(tmpE.set(...(o.rot ?? [0, 0, 0]))), tmpS.set(...sc));
    g.applyMatrix4(tmpM);
    g = g.index ? g.toNonIndexed() : g;
    if (!o.smooth) { g.deleteAttribute('normal'); g.computeVertexNormals(); }
    paint(g, color, o, seed * 17 + pi);
    const n = g.getAttribute('position').count;
    g.setAttribute('heatMask', new THREE.BufferAttribute(new Float32Array(n).fill(o.heat ?? HEAT[skin]), 1));
    if (g.getAttribute('tint')) g.deleteAttribute('tint');
    out.push(g);
  });
  const merged = mergeGeometries(out, false);
  if (!merged) throw new Error('weapon bake: attribute mismatch between parts');
  merged.computeBoundingBox();
  merged.computeBoundingSphere();
  return merged;
}

/** Vertex color = part color × optional per-vertex `tint` (fuller/edge) × bottom shade × pits. */
function paint(g: THREE.BufferGeometry, c: THREE.Color, o: WPartOpts, seed: number): void {
  g.computeBoundingBox();
  const bb = g.boundingBox!, h = Math.max(1e-4, bb.max.y - bb.min.y);
  const p = g.getAttribute('position'), tint = g.getAttribute('tint');
  const col = new Float32Array(p.count * 3), sh = o.shade ?? 0.12, pits = o.pits ?? 0;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    let k = (1 - sh * (1 - (y - bb.min.y) / h)) * (tint ? tint.getX(i) : 1);
    if (pits) k *= 1 - pits * Math.max(0, noise3(x * 90, y * 90, z * 90, seed));
    col[i * 3] = c.r * k; col[i * 3 + 1] = c.g * k; col[i * 3 + 2] = c.b * k;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
}

/** Hammered surface: push vertices along their (smooth) normals by coherent noise. Indexed geo stays watertight. */
function dent(g: THREE.BufferGeometry, amp: number, seed: number): void {
  const p = g.getAttribute('position'), n = g.getAttribute('normal');
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), d = noise3(x * 40, y * 40, z * 40, seed) * amp;
    p.setXYZ(i, x + n.getX(i) * d, y + n.getY(i) * d, z + n.getZ(i) * d);
  }
  p.needsUpdate = true;
}

/** UVs inside one atlas quad, computed in part-local space so the texture follows the part. */
function partUV(g: THREE.BufferGeometry, q: readonly [number, number, number, number], mode: UVMode): void {
  g.computeBoundingBox();
  const bb = g.boundingBox!, p = g.getAttribute('position'), n = g.getAttribute('normal');
  const sx = Math.max(1e-4, bb.max.x - bb.min.x), sy = Math.max(1e-4, bb.max.y - bb.min.y), sz = Math.max(1e-4, bb.max.z - bb.min.z);
  const big = Math.max(sx, sy, sz), uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    const x = (p.getX(i) - bb.min.x), y = (p.getY(i) - bb.min.y), z = (p.getZ(i) - bb.min.z);
    let u: number, v: number;
    if (mode === 'long') { u = z / sz; v = y / sy; }
    else if (mode === 'round') { u = Math.atan2(p.getX(i) - (bb.min.x + sx / 2), p.getZ(i) - (bb.min.z + sz / 2)) / (Math.PI * 2) + 0.5; v = y / sy; }
    else {
      const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
      if (ay >= ax && ay >= az) { u = x / big; v = z / big; } else if (ax >= az) { u = z / big; v = y / big; } else { u = x / big; v = y / big; }
    }
    uv[i * 2] = q[0] + (q[2] - q[0]) * Math.min(1, Math.max(0, u));
    uv[i * 2 + 1] = q[1] + (q[3] - q[1]) * Math.min(1, Math.max(0, v));
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
}

/** Heat for every mesh under a weapon root (the PSX material reads object.userData.heat). */
export function setHeat(root: THREE.Object3D, heat: number): void {
  root.traverse((o) => { if ((o as THREE.Mesh).isMesh) o.userData.heat = heat; });
}
/** Triangle count of a built weapon. */
export function weaponTris(root: THREE.Object3D): number {
  let t = 0;
  root.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) t += (m.geometry.index?.count ?? m.geometry.getAttribute('position').count) / 3; });
  return t;
}
