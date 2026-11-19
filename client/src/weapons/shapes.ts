import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import * as P from '../render/geo/procgeo';

/**
 * Weapon shape primitives. All are built along +Y; "profile" shapes lie in the YZ plane (the plane a weapon
 * is seen broadside in) with their thickness along X. Per-vertex `tint` (1 channel) is read by wkit's paint.
 */

/** A blade cross-section station: y height, w half width, t half thickness, z center offset (curves), f fuller depth. */
export interface Station { y: number; w: number; t: number; z?: number; f?: number }
export interface BladeOpts {
  /** single-edged (dao, glaive): edge at +Z, flat spine at −Z */
  single?: boolean;
  /** where the edge bevel meets the flat, as a fraction of w (0.35 = wide bevel) */
  bevel?: number;
  /** fuller half width as a fraction of w */
  fullerW?: number;
  /** tint of the edge apex (hamon / polished edge) and of the fuller groove */
  edgeTint?: number; fullerTint?: number;
}

/** Lofted blade: hexagonal section with optional fuller groove, edge toward +Z. Cheap: 2·n·(stations−1) tris. */
export function blade(st: Station[], o: BladeOpts = {}): THREE.BufferGeometry {
  const b = o.bevel ?? 0.45, fw = o.fullerW ?? 0.16, et = o.edgeTint ?? 1, ft = o.fullerTint ?? 0.72;
  const pos: number[] = [], tint: number[] = [], idx: number[] = [];
  let n = 0;
  for (const s of st) {
    const w = s.w, t = s.t, f = Math.min(s.f ?? 0, t * 0.8), z0 = s.z ?? 0;
    const c = o.single ? -w * 0.3 : 0;
    // [z, x, tint]: upper (+X) side from the edge to the back, then the mirrored lower side
    const up: [number, number, number][] = o.single
      ? [[w, 0, et], [w * b, t, 1], [c + w * fw, t, 1], [c, t - f, ft], [c - w * fw, t, 1], [-w, t, 0.9]]
      : [[w, 0, et], [w * b, t, 1], [w * fw, t, 1], [0, t - f, ft], [-w * fw, t, 1], [-w * b, t, 1], [-w, 0, et]];
    // mirror to −X, skipping the shared edge apex (and, double-edged, the back apex)
    const lo = up.slice(1, o.single ? undefined : -1).reverse().map(([z, x, k]) => [z, -x, k] as [number, number, number]);
    const ring = [...up, ...lo];
    n = ring.length;
    for (const [z, x, k] of ring) { pos.push(x, s.y, z0 + z); tint.push(k); }
  }
  for (let i = 0; i < st.length - 1; i++) for (let j = 0; j < n; j++) {
    const a = i * n + j, bb = i * n + ((j + 1) % n), c = a + n, d = bb + n;
    idx.push(a, bb, c, bb, d, c);
  }
  for (let j = 1; j < n - 1; j++) idx.push(0, j + 1, j); // bottom cap (faces −Y)
  const last = (st.length - 1) * n;
  if (st[st.length - 1].w > 0.002) for (let j = 1; j < n - 1; j++) idx.push(last, last + j, last + j + 1);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('tint', new THREE.Float32BufferAttribute(tint, 1));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** Tapering stations from y0 to the tip at y1. w(t), t(t) take the 0..1 position along the blade. */
export function taper(y0: number, y1: number, n: number, w: (u: number) => number, t: (u: number) => number,
  extra: (u: number) => Partial<Station> = () => ({})): Station[] {
  return Array.from({ length: n + 1 }, (_, i) => { const u = i / n; return { y: y0 + (y1 - y0) * u, w: w(u), t: t(u), ...extra(u) }; });
}

/** 2D outline [[z, y], ...] extruded `depth` along X with a 1-step bevel: guards, heads, glaive blades. */
export function profile(outline: [number, number][], depth: number, bevel = 0.004): THREE.BufferGeometry {
  const s = new THREE.Shape(outline.map(([x, y]) => new THREE.Vector2(x, y)));
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel * 0.8, bevelSegments: 1, curveSegments: 3 });
  g.translate(0, 0, -depth / 2);
  g.rotateY(-Math.PI / 2); // outline x → +Z, depth → X
  g.deleteAttribute('uv');
  return mergeVertices(g, 1e-5);
}

/** Closed body of revolution along +Y from [[r, y], ...] (no spline smoothing: exact rings). */
export function turn(prof: [number, number][], seg = 8): THREE.BufferGeometry {
  const pts = prof.map(([r, y]) => new THREE.Vector2(Math.max(1e-4, r), y));
  const g = new THREE.LatheGeometry(pts, seg);
  g.deleteAttribute('uv');
  const m = mergeVertices(g, 1e-5);
  m.computeVertexNormals();
  return m;
}

/** Grip wrap from y0 to y1: radius r with `bumps` raised turns of height `ridge`, closed ends. */
export function wrap(y0: number, y1: number, r: number, bumps: number, ridge = 0.003, seg = 6): THREE.BufferGeometry {
  const prof: [number, number][] = [[0, y0], [r * 0.9, y0]];
  const n = bumps * 2;
  for (let i = 0; i <= n; i++) prof.push([r + (i % 2 ? ridge : 0), y0 + ((y1 - y0) * i) / n]);
  prof.push([r * 0.9, y1], [0, y1]);
  return turn(prof, seg);
}

/** Straight round pole (haft) with slight taper; `sides` ≥ 5. */
export function pole(y0: number, y1: number, r0: number, r1 = r0, sides = 7): THREE.BufferGeometry {
  return turn([[0, y0], [r0, y0], [r1, y1], [0, y1]], sides);
}

/** A crooked pole through jittered points (crude hafts). */
export function crooked(y0: number, y1: number, r: number, wobble: number, seed = 1): THREE.BufferGeometry {
  const rnd = P.rng(seed), pts: [number, number, number][] = [];
  for (let i = 0; i <= 4; i++) pts.push([(rnd() - 0.5) * wobble * (i % 4 ? 1 : 0.3), y0 + ((y1 - y0) * i) / 4, (rnd() - 0.5) * wobble * (i % 4 ? 1 : 0.3)]);
  return P.tube(pts, (u) => r * (1.06 - 0.12 * u), 8, 6);
}

/** Cone along +Y, base at 0: spikes, points, butt caps. */
export function spike(len: number, r: number, sides = 4): THREE.BufferGeometry {
  const g = new THREE.ConeGeometry(r, len, sides, 1);
  g.translate(0, len / 2, 0);
  g.deleteAttribute('uv');
  return mergeVertices(g, 1e-5);
}

/** Low torus ring around Y at height 0. */
export function ring(r: number, tube: number, seg = 10): THREE.BufferGeometry {
  const g = new THREE.TorusGeometry(r, tube, 4, seg);
  g.rotateX(Math.PI / 2);
  g.deleteAttribute('uv');
  return mergeVertices(g, 1e-5);
}

/** Faceted knob (pommels, rivets, gems). detail 0 = 20 tris. */
export function knob(r: number, detail = 0): THREE.BufferGeometry {
  const g = new THREE.IcosahedronGeometry(r, detail);
  g.deleteAttribute('uv');
  return mergeVertices(g, 1e-5);
}
