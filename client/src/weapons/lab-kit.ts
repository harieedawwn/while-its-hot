import * as THREE from 'three';
import type { ModelCtx } from '../render/models/kit';
import { COL } from './palette';
import { type EdgeOpts, loftBlade, plateGeo, tubeGeo, wrapGeo } from './lab-geo';
import { type Skin, WeaponBuilder } from './wkit';

/**
 * The weapon-lab `k` kit (weapon-lab/PROMPT_FREE_CLAUDE.md) on top of the game's one-mesh builder. A lab file's
 * `build(k)` returns a Group of tagged meshes; `bakeLab` merges them into ONE flat-shaded mesh (slot → atlas
 * skin + color + heatMask) and keeps the `tip`/`base` markers. `tay` files (wrist at the origin, knuckles +Y,
 * back +Z, thumb −X) are remapped into the game gauntlet contract (fist at origin, knuckles +Z, back +X, thumb +Y).
 */
export interface LabMeta { id: string; name?: string; family: string; level: number; lengthM?: number; effects?: string[] }
export interface LabFile { meta: LabMeta; build(k: LabKit): THREE.Group }
interface Paint { color: string; metal: boolean }
type Slot = string | Paint;
interface Look { skin: Skin; color: string; heat: number }

const SLOT: Record<string, Look> = {
  steel: { skin: 'bright', color: COL.steel, heat: 1 }, steel_dark: { skin: 'bright', color: COL.dark, heat: 1 },
  iron_rough: { skin: 'forged', color: COL.raw, heat: 1 }, brass: { skin: 'bright', color: COL.brass, heat: 0.6 },
  copper: { skin: 'bright', color: '#d89070', heat: 0.6 }, wood: { skin: 'wood', color: COL.wood, heat: 0 },
  wood_dark: { skin: 'wood', color: COL.woodDark, heat: 0 }, leather: { skin: 'leather', color: COL.leather, heat: 0 },
  cloth_red: { skin: 'leather', color: COL.red, heat: 0 }, cloth_dark: { skin: 'leather', color: COL.leatherDark, heat: 0 },
  bone: { skin: 'bright', color: '#efe6d0', heat: 0 }, stone: { skin: 'forged', color: '#a8a29a', heat: 0 },
  gem: { skin: 'bright', color: COL.gem, heat: 0 },
};
const lookOf = (s: Slot): Look => typeof s === 'object'
  ? { skin: 'bright', color: s.color, heat: s.metal ? 1 : 0 } : SLOT[s] ?? SLOT.steel;

const DUMMY = new THREE.MeshBasicMaterial();
/** Geometry tagged with its look; `long` = UV stretched along the blade. */
function mesh(geo: THREE.BufferGeometry, slot: Slot, long = false): THREE.Mesh {
  const m = new THREE.Mesh(geo, DUMMY);
  m.userData.look = lookOf(slot); m.userData.long = long;
  return m;
}

export interface LabKit {
  group(): THREE.Group;
  box(w: number, h: number, d: number, s: Slot): THREE.Mesh;
  cyl(rt: number, rb: number, h: number, n: number, s: Slot): THREE.Mesh;
  cone(r: number, h: number, n: number, s: Slot): THREE.Mesh;
  sphere(r: number, d: number, s: Slot): THREE.Mesh;
  lathe(pts: [number, number][], n: number, s: Slot): THREE.Mesh;
  paint(color: string, metal?: boolean): Paint;
  edge(o: EdgeOpts): THREE.Object3D;
  blade(pts: [number, number][], th: number, s: Slot, bevel?: number): THREE.Mesh;
  tube(pts: [number, number, number][], r: number, n: number, s: Slot, segs?: number): THREE.Mesh;
  wrap(y0: number, y1: number, r: number, turns: number, s: Slot, sides?: number): THREE.Mesh;
  marker(g: THREE.Object3D, name: 'base' | 'tip', xyz: [number, number, number]): void;
}

/** `lod` < 1 thins every round part (sides, curve samples, sphere detail) so a model fits the triangle budget. */
export function makeKit(lod = 1): LabKit {
  const sd = (n: number, floor = 4) => (n <= floor ? Math.max(3, n | 0) : Math.max(floor, Math.round(n * lod)));
  return {
    group: () => new THREE.Group(),
    box: (w, h, d, s) => mesh(new THREE.BoxGeometry(w, h, d), s),
    cyl: (rt, rb, h, n, s) => mesh(new THREE.CylinderGeometry(rt, rb, h, sd(n, 5)), s),
    cone: (r, h, n, s) => mesh(new THREE.ConeGeometry(r, h, sd(n, 4)), s),
    sphere: (r, d, s) => mesh(new THREE.IcosahedronGeometry(r, lod < 1 ? 0 : Math.min(2, d | 0)), s),
    lathe: (pts, n, s) => mesh(new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(Math.max(0, r), y)), sd(n, 5)), s),
    paint: (color, metal = false) => ({ color, metal }),
    edge(o) {
      const { blade, fuller } = loftBlade(lod < 1 ? { ...o, smooth: Math.max(2, Math.round((o.smooth ?? 6) * lod)) } : o), g = new THREE.Group();
      g.add(mesh(blade, (o.slot as Slot) ?? 'steel', true));
      if (fuller) g.add(mesh(fuller, (o.fuller?.slot as Slot) ?? 'steel_dark', true));
      return g;
    },
    blade: (pts, th, s, bevel) => mesh(plateGeo(pts, th, bevel), s, true),
    tube: (pts, r, n, s, segs) => mesh(tubeGeo(pts, r, n, segs, lod), s),
    wrap: (y0, y1, r, turns, s, sides) => mesh(wrapGeo(y0, y1, r, turns, sides, lod), s),
    marker(g, name, xyz) { const o = new THREE.Object3D(); o.name = name; o.position.set(...xyz); g.add(o); },
  };
}

/** Lab gauntlet (wrist origin, knuckles +Y) → game gauntlet (fist centre origin, knuckles +Z, back +X, thumb +Y). */
const TAY = new THREE.Matrix4().set(0, 0, 1, 0, -1, 0, 0, 0, 0, 1, 0, -0.06, 0, 0, 0, 1);

/** Merge a lab model into the contract Group: one mesh + `tip`/`base`. */
export const LAB_TRI_BUDGET = 1500;
/** Detail steps tried in order: round-part thinning + dropping parts smaller than `cull` metres (rivets, pins). */
const LODS: readonly { lod: number; cull: number }[] = [
  { lod: 1, cull: 0 }, { lod: 0.8, cull: 0 }, { lod: 0.65, cull: 0.008 }, { lod: 0.5, cull: 0.012 },
  { lod: 0.4, cull: 0.018 }, { lod: 0.4, cull: 0.026 }, { lod: 0.4, cull: 0.036 },
];
const lodOf = new Map<string, number>();
/** Bake at the finest detail whose triangle count fits `LAB_TRI_BUDGET` (the chosen level is remembered per id). */
export function bakeLab(file: LabFile, ctx: ModelCtx): THREE.Group {
  const known = lodOf.get(file.meta.id);
  for (let i = known ?? 0; i < LODS.length; i++) {
    const g = bakeAt(file, ctx, LODS[i].lod, LODS[i].cull);
    if (known != null || i === LODS.length - 1 || tris(g) <= LAB_TRI_BUDGET) { lodOf.set(file.meta.id, i); return g; }
  }
  throw new Error('unreachable');
}
const tris = (g: THREE.Group): number => (g.children.find((c) => (c as THREE.Mesh).isMesh) as THREE.Mesh).geometry.getAttribute('position').count / 3;

function bakeAt(file: LabFile, ctx: ModelCtx, lod: number, cull: number): THREE.Group {
  const root = file.build(makeKit(lod));
  root.updateMatrixWorld(true);
  const tay = file.meta.family === 'tay';
  const b = new WeaponBuilder(file.meta.id, hash(file.meta.id));
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    let g = m.geometry.clone().applyMatrix4(tay ? TAY.clone().multiply(m.matrixWorld) : m.matrixWorld);
    if (cull > 0) { g.computeBoundingBox(); if (g.boundingBox!.getSize(new THREE.Vector3()).toArray().sort((a, c) => c - a)[0] < cull) return; }
    if (g.index) g = g.toNonIndexed();
    if (tay) flipWinding(g);
    const look = m.userData.look as Look;
    b.add(g, look.color, { skin: look.skin, heat: look.heat, uv: m.userData.long ? 'long' : 'box' });
  });
  for (const n of ['base', 'tip'] as const) {
    const o = root.getObjectByName(n);
    if (!o) continue;
    const p = new THREE.Vector3().setFromMatrixPosition(o.matrixWorld);
    if (tay) p.applyMatrix4(TAY);
    b.mark(n, [p.x, p.y, p.z]);
  }
  return b.done(ctx);
}

function flipWinding(g: THREE.BufferGeometry): void {
  for (const a of Object.values(g.attributes)) {
    const arr = a.array as Float32Array, s = a.itemSize;
    for (let t = 0; t < a.count; t += 3) for (let k = 0; k < s; k++) {
      const i = (t + 1) * s + k, j = (t + 2) * s + k, v = arr[i]; arr[i] = arr[j]; arr[j] = v;
    }
  }
}
const hash = (s: string): number => { let h = 7; for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0; return (h % 97) + 1; };
