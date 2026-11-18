/* procgeo.js — build detailed, smooth, stylized models from code (no asset files), then bake them
 * into ONE geometry with vertex colors = one draw call per model.
 *
 *   import * as P from './procgeo.js';
 *   const barrel = P.bake([
 *     P.part(P.lathe([[0.42,0],[0.5,0.45],[0.42,0.9]]), '#8a5a33'),
 *     P.part(new THREE.TorusGeometry(0.47, 0.025, 8, 32), '#4a4f57', { pos:[0,0.2,0], rot:[Math.PI/2,0,0] }),
 *   ]);
 *   const mesh = new THREE.Mesh(barrel, toonMaterial('#fff', { vertexColors: true }));
 *
 * Shapes: lathe (vases, bodies, helmets, bottles), tube (limbs, branches, tails, ropes; radius can vary along it),
 * blob (rocks, foliage, clouds, hair tufts: noise-displaced sphere), rounded (boxes with soft edges),
 * extrude (blades, planks, signs, leaves from a 2D outline, with bevel), shell (hair caps, hoods: part of a sphere).
 * Rules of thumb: silhouettes matter more than triangle count; 3-5 big shapes + 5-15 small details per model;
 * bevel/round everything a little (sharp primitives look cheap under cel shading); vary scale and rotation.
 */
import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

/* deterministic noise for repeatable shapes */
export function rng(seed = 1) { let s = seed >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
function hash(x, y, z, seed) { let h = (x * 374761393 + y * 668265263 + z * 2147483647 + seed * 144269504) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
export function noise3(x, y, z, seed = 0) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), xf = x - xi, yf = y - yi, zf = z - zi;
  const s = t => t * t * (3 - 2 * t), u = s(xf), v = s(yf), w = s(zf), L = (a, b, t) => a + (b - a) * t;
  const c = (dx, dy, dz) => hash(xi + dx, yi + dy, zi + dz, seed);
  return L(L(L(c(0,0,0), c(1,0,0), u), L(c(0,1,0), c(1,1,0), u), v), L(L(c(0,0,1), c(1,0,1), u), L(c(0,1,1), c(1,1,1), u), v), w) * 2 - 1;
}
export function fbm(x, y, z, seed = 0, oct = 3) { let a = 0.5, f = 1, s = 0; for (let i = 0; i < oct; i++) { s += a * noise3(x * f, y * f, z * f, seed + i * 17); a *= 0.5; f *= 2; } return s; }

/** Smooth body of revolution. profile: [[radius, y], ...] bottom to top; smooth: subdivisions between points */
export function lathe(profile, segments = 28, smooth = 6) {
  const curve = new THREE.SplineCurve(profile.map(([r, y]) => new THREE.Vector2(Math.max(0.0001, r), y)));
  const pts = curve.getPoints((profile.length - 1) * smooth);
  if (profile[0][0] <= 0.001) pts[0].x = 0.0001;
  const g = new THREE.LatheGeometry(pts, segments);
  return finish(g);
}
/** Tube along 3D points with radius r (number) or r(t) for t in 0..1; caps rounded */
export function tube(points, r = 0.1, tubular = 24, radial = 12) {
  const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
  const rf = typeof r === 'function' ? r : () => r;
  const frames = curve.computeFrenetFrames(tubular, false);
  const pos = [], idx = [], P = new THREE.Vector3(), N = new THREE.Vector3();
  for (let i = 0; i <= tubular; i++) {
    const t = i / tubular; curve.getPointAt(t, P); const rad = rf(t);
    for (let j = 0; j <= radial; j++) {
      const a = j / radial * Math.PI * 2, c = -Math.cos(a), s = Math.sin(a);
      N.set(0, 0, 0).addScaledVector(frames.normals[i], c).addScaledVector(frames.binormals[i], s);
      pos.push(P.x + rad * N.x, P.y + rad * N.y, P.z + rad * N.z);
    }
  }
  for (let i = 0; i < tubular; i++) for (let j = 0; j < radial; j++) {
    const a = i * (radial + 1) + j, b = a + radial + 1;
    idx.push(a, b, a + 1, b, b + 1, a + 1);
  }
  // rounded caps: small hemispheres at both ends
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
  const parts = [g];
  [[0, -1], [1, 1]].forEach(([t, dir]) => {
    const rad = rf(t); if (rad < 0.002) return;
    const cap = new THREE.SphereGeometry(rad, radial, Math.max(4, radial / 2), 0, Math.PI * 2, 0, Math.PI / 2);
    const tan = curve.getTangentAt(t).multiplyScalar(dir);
    cap.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), tan));
    cap.translate(...curve.getPointAt(t).toArray());
    cap.deleteAttribute('uv'); cap.deleteAttribute('normal');
    parts.push(cap);
  });
  return finish(mergeGeometries(parts.map(p => p.index ? p : p), false));
}
/** Noise-displaced sphere: rocks (amp 0.25, freq 1.5), foliage (amp 0.15, freq 2.5), clouds (squash y) */
export function blob(radius = 1, { detail = 3, amp = 0.2, freq = 1.8, seed = 1, squash = [1, 1, 1], flatBottom = null } = {}) {
  let g = new THREE.IcosahedronGeometry(radius, detail);
  g.deleteAttribute('normal'); g.deleteAttribute('uv'); g = mergeVertices(g);
  const p = g.getAttribute('position'), v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const n = fbm(v.x * freq / radius, v.y * freq / radius, v.z * freq / radius, seed);
    v.multiplyScalar(1 + n * amp); v.x *= squash[0]; v.y *= squash[1]; v.z *= squash[2];
    if (flatBottom !== null && v.y < flatBottom) v.y = flatBottom + (v.y - flatBottom) * 0.15;
    p.setXYZ(i, v.x, v.y, v.z);
  }
  return finish(g);
}
/** Box with rounded edges (r = corner radius) */
export function rounded(w, h, d, r = 0.05, seg = 3) { const g = new RoundedBoxGeometry(w, h, d, seg, Math.min(r, w / 2, h / 2, d / 2)); g.deleteAttribute('uv'); return g; }
/** Extrude a 2D outline [[x,y],...] with depth and bevel; centered on z */
export function extrude(outline, depth = 0.1, bevel = 0.02, curveSegments = 6) {
  const s = new THREE.Shape(outline.map(([x, y]) => new THREE.Vector2(x, y)));
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel * 0.8, bevelSegments: 2, curveSegments });
  g.translate(0, 0, -depth / 2); g.deleteAttribute('uv');
  return mergeVertices(g, 1e-4);
}
/** Part of a sphere (hair cap, hood, dome, helmet). thetaLength: PI/2 = half sphere */
export function shell(radius, thetaLength = Math.PI / 2, seg = 24) { const g = new THREE.SphereGeometry(radius, seg, Math.ceil(seg / 2), 0, Math.PI * 2, 0, thetaLength); g.deleteAttribute('uv'); return g; }

function finish(g) {
  if (g.getAttribute('uv')) g.deleteAttribute('uv');
  if (g.getAttribute('normal')) g.deleteAttribute('normal');
  g = mergeVertices(g, 1e-4);
  g.computeVertexNormals();
  return g;
}

/** A placed, colored piece for bake(). opts: pos [x,y,z], rot [x,y,z] radians, scale number|[x,y,z], shade: darken bottom (0..1) */
export function part(geo, color, opts = {}) { return { geo, color: new THREE.Color(color), ...opts }; }

/**
 * Merge parts into one indexed geometry with position, normal, color.
 * shade (per part or global): darkens toward the bottom of each part, a cheap ambient-occlusion feel.
 */
export function bake(parts, { shade = 0.18 } = {}) {
  const out = [], m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3();
  for (const p of parts) {
    let g = p.geo.clone();
    if (!g.getAttribute('normal')) g.computeVertexNormals();
    ['uv', 'uv1', 'uv2', 'tangent', 'aOutlineNormal'].forEach(a => g.getAttribute(a) && g.deleteAttribute(a));
    const sc = p.scale == null ? [1, 1, 1] : typeof p.scale === 'number' ? [p.scale, p.scale, p.scale] : p.scale;
    m.compose(new THREE.Vector3(...(p.pos || [0, 0, 0])), q.setFromEuler(e.set(...(p.rot || [0, 0, 0]))), s.set(...sc));
    g.applyMatrix4(m);
    g.computeBoundingBox();
    const pos = g.getAttribute('position'), col = new Float32Array(pos.count * 3), bb = g.boundingBox, hgt = Math.max(1e-4, bb.max.y - bb.min.y);
    const sh = p.shade ?? shade;
    for (let i = 0; i < pos.count; i++) {
      const k = 1 - sh * (1 - (pos.getY(i) - bb.min.y) / hgt);
      col[i * 3] = p.color.r * k; col[i * 3 + 1] = p.color.g * k; col[i * 3 + 2] = p.color.b * k;
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    if (!g.index) g = mergeVertices(g, 1e-5);
    out.push(g);
  }
  const merged = mergeGeometries(out, false);
  merged.computeBoundingSphere();
  return merged;
}
