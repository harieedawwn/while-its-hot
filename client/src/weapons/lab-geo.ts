import * as THREE from 'three';

/** Geometry half of the weapon-lab kit (port of weapon-lab/preview.html): blade loft, tube, wrap, extrude. */
type P2 = [number, number];
type V3 = [number, number, number];

export interface EdgeOpts {
  spine: P2[]; width: number | number[]; edge?: 'front' | 'back' | 'both'; thickness?: number; edgeThickness?: number;
  bevel?: number; taper?: number; smooth?: number; slot?: unknown;
  fuller?: { from?: number; to?: number; at?: number; width?: number; slot?: unknown };
}

/** Catmull-Rom resample of a 2D polyline (z, y), `n` points per segment. */
function smooth2(pts: P2[], n: number): P2[] {
  if (pts.length < 3 || n <= 1) return pts.map((p) => [...p] as P2);
  const out: P2[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let j = 0; j < n; j++) {
      const t = j / n, t2 = t * t, t3 = t2 * t;
      const f = (a: 0 | 1) => 0.5 * (2 * p1[a] + (-p0[a] + p2[a]) * t + (2 * p0[a] - 5 * p1[a] + 4 * p2[a] - p3[a]) * t2 + (-p0[a] + 3 * p1[a] - 3 * p2[a] + p3[a]) * t3);
      out.push([f(0), f(1)]);
    }
  }
  out.push([...pts[pts.length - 1]] as P2);
  return out;
}
function lerpArr(arr: number | number[], u: number): number {
  if (!Array.isArray(arr)) return arr;
  if (arr.length < 2) return arr[0] ?? 0;
  const f = u * (arr.length - 1), i = Math.min(arr.length - 2, Math.floor(f));
  return arr[i] + (arr[i + 1] - arr[i]) * (f - i);
}
const geoOf = (pos: number[]): THREE.BufferGeometry => {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  return g;
};

/** Blade loft along a spine in the Z-Y plane: flat-then-bevel wedge (or diamond for 'both'). Returns blade (+ fuller strips). */
export function loftBlade(o: EdgeOpts): { blade: THREE.BufferGeometry; fuller?: THREE.BufferGeometry } {
  const sp = smooth2(o.spine, o.smooth ?? 6), n = sp.length;
  const T = o.thickness ?? 0.012, E = o.edgeThickness ?? 0.002, B = Math.min(0.95, Math.max(0.05, o.bevel ?? 0.45));
  const mode = o.edge ?? 'front';
  const L = [0];
  for (let i = 1; i < n; i++) L.push(L[i - 1] + Math.hypot(sp[i][0] - sp[i - 1][0], sp[i][1] - sp[i - 1][1]));
  const rings: V3[][] = [], frames: { c: P2; nz: number; ny: number; w: number; u: number; t: number }[] = [];
  for (let i = 0; i < n; i++) {
    const a = sp[Math.max(0, i - 1)], b = sp[Math.min(n - 1, i + 1)];
    let tz = b[0] - a[0], ty = b[1] - a[1];
    const l = Math.hypot(tz, ty) || 1; tz /= l; ty /= l;
    const nz = ty, ny = -tz;
    const u = L[i] / (L[n - 1] || 1), w = Math.max(0, lerpArr(o.width, u)), t = T * (o.taper ? 1 - o.taper * u : 1);
    const P = (off: number, x: number): V3 => [x, sp[i][1] + ny * off, sp[i][0] + nz * off];
    let ring: V3[];
    if (mode === 'both') ring = [P(-w / 2, -E / 2), P(-w / 2 * B, -t / 2), P(0, -t / 2), P(w / 2 * B, -t / 2), P(w / 2, -E / 2), P(w / 2, E / 2), P(w / 2 * B, t / 2), P(0, t / 2), P(-w / 2 * B, t / 2), P(-w / 2, E / 2)];
    else {
      const s = mode === 'back' ? -1 : 1, f = w * (1 - B);
      ring = [P(0, -t / 2), P(s * f, -t / 2), P(s * w, -E / 2), P(s * w, E / 2), P(s * f, t / 2), P(0, t / 2)];
    }
    rings.push(ring); frames.push({ c: sp[i], nz, ny, w, u, t });
  }
  const pos: number[] = [], tri = (p: V3, q: V3, r: V3) => pos.push(...p, ...q, ...r);
  const K = rings[0].length;
  for (let i = 0; i < n - 1; i++) for (let j = 0; j < K; j++) {
    const a = rings[i][j], b = rings[i][(j + 1) % K], c = rings[i + 1][(j + 1) % K], d = rings[i + 1][j];
    tri(a, b, c); tri(a, c, d);
  }
  const cap = (r: V3[], flip: boolean) => {
    const c = r.reduce<V3>((s, p) => [s[0] + p[0] / r.length, s[1] + p[1] / r.length, s[2] + p[2] / r.length], [0, 0, 0]);
    for (let j = 0; j < K; j++) flip ? tri(c, r[(j + 1) % K], r[j]) : tri(c, r[j], r[(j + 1) % K]);
  };
  cap(rings[0], true); cap(rings[n - 1], false);
  const res: { blade: THREE.BufferGeometry; fuller?: THREE.BufferGeometry } = { blade: geoOf(pos) };
  const fu = o.fuller;
  if (fu) {
    const fp: number[] = [], s = mode === 'back' ? -1 : 1, at = fu.at ?? 0.3, wd = fu.width ?? 0.18;
    for (const side of [-1, 1]) for (let i = 0; i < n - 1; i++) {
      const f0 = frames[i], f1 = frames[i + 1];
      if (f0.u < (fu.from ?? 0.05) || f1.u > (fu.to ?? 0.6)) continue;
      const q = (f: typeof f0, off: number): V3 => {
        const o2 = mode === 'both' ? off - f.w / 2 : off;
        return [side * (f.t / 2 + 0.0008), f.c[1] + f.ny * o2 * s, f.c[0] + f.nz * o2 * s];
      };
      const a = q(f0, f0.w * at), b = q(f0, f0.w * (at + wd)), c = q(f1, f1.w * (at + wd)), d = q(f1, f1.w * at);
      fp.push(...a, ...b, ...c, ...a, ...c, ...d, ...a, ...c, ...b, ...a, ...d, ...c); // both windings: always visible
    }
    if (fp.length) res.fuller = geoOf(fp);
  }
  return res;
}

export function tubeGeo(pts: V3[], r: number, n: number, segs?: number, lod = 1): THREE.BufferGeometry {
  const c = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)));
  // game budget: at most 4 sides, ~1.5 segments per control point (the lab preview allows more)
  return new THREE.TubeGeometry(c, Math.max(3, Math.round(Math.min(segs ?? 99, Math.max(4, Math.round(pts.length * 1.5)), 24) * lod)), r, Math.min(4, Math.max(3, n | 0)));
}
export function wrapGeo(y0: number, y1: number, r: number, turns: number, sides = 3, lod = 1): THREE.BufferGeometry {
  const pts: V3[] = [], N = Math.max(6, Math.round(turns * 8 * lod));
  for (let i = 0; i <= N; i++) { const a = (i / N) * turns * Math.PI * 2; pts.push([Math.cos(a) * r, y0 + (y1 - y0) * (i / N), Math.sin(a) * r]); }
  return tubeGeo(pts, Math.max(0.003, r * 0.22), sides, N);
}
/** Flat extruded outline [[z, y], …] (thickness along X), bevel squeezes X toward the +Z half. */
export function plateGeo(pts: P2[], th: number, bevel = 0.6): THREE.BufferGeometry {
  const sh = new THREE.Shape(pts.map(([z, y]) => new THREE.Vector2(z, y)));
  const g = new THREE.ExtrudeGeometry(sh, { depth: th, bevelEnabled: false });
  g.rotateY(-Math.PI / 2); g.translate(th / 2, 0, 0);
  const p = g.attributes.position;
  let zmin = Infinity, zmax = -Infinity;
  for (let i = 0; i < p.count; i++) { zmin = Math.min(zmin, p.getZ(i)); zmax = Math.max(zmax, p.getZ(i)); }
  const mid = (zmin + zmax) / 2;
  for (let i = 0; i < p.count; i++) {
    const t = Math.max(0, Math.min(1, (p.getZ(i) - mid) / Math.max(1e-6, zmax - mid)));
    p.setX(i, p.getX(i) * (1 - bevel * t));
  }
  return g;
}
