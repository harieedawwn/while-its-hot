import * as THREE from 'three';
import { BALANCE } from '@wih/shared';
import { FEEL } from '../core/feel';

/**
 * Low-poly geometry of the form effects (phase 28). Built once per EffectView and shared by every instance.
 * Forward = -Z (an entity's yaw turns it like a player). All sizes in meters, a handful of triangles each.
 */
const X = FEEL.fx.effects;

/** Crescent standing across the path (XY plane, bulging up, tips swept back +Z): the flying slash seen from behind. */
export function crescentGeo(): THREE.BufferGeometry {
  const n = 12, half = (X.slash.arcDeg / 2) * (Math.PI / 180), R = X.slash.w / 2 / Math.sin(half), pos: number[] = [], idx: number[] = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n, a = -half + u * half * 2, t = X.slash.thick * Math.pow(Math.sin(u * Math.PI), 0.7) + 0.01;
    const back = 0.45 * Math.pow(Math.abs(u * 2 - 1), 2), lift = -R * Math.cos(half);
    pos.push(Math.sin(a) * R, Math.cos(a) * R + lift, back, Math.sin(a) * (R - t), Math.cos(a) * (R - t) + lift, back + 0.05);
    if (i < n) { const b = i * 2; idx.push(b, b + 1, b + 3, b, b + 3, b + 2); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** A jittered low icosahedron (meteor, crack spikes). */
export function rockGeo(r: number, seed = 3): THREE.BufferGeometry {
  const g = new THREE.IcosahedronGeometry(r, 0), p = g.getAttribute('position') as THREE.BufferAttribute;
  let s = seed;
  const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  const seen = new Map<string, number>();
  for (let i = 0; i < p.count; i++) {
    const key = `${p.getX(i).toFixed(3)},${p.getY(i).toFixed(3)},${p.getZ(i).toFixed(3)}`;
    let k = seen.get(key);
    if (k === undefined) { k = 0.75 + rnd() * 0.5; seen.set(key, k); }
    p.setXYZ(i, p.getX(i) * k, p.getY(i) * k * 0.85, p.getZ(i) * k);
  }
  g.computeVertexNormals();
  return g;
}

/** A thin diamond blade lying in XZ, point toward -Z (orbiting blades). */
export function bladeGeo(): THREE.BufferGeometry {
  const L = 0.8, W = 0.1, H = 0.03;
  const pos = [0, 0, -L, W, 0, 0, 0, H, 0, -W, 0, 0, 0, -H, 0, 0, 0, L * 0.25];
  const idx = [0, 1, 2, 0, 2, 3, 0, 3, 4, 0, 4, 1, 5, 2, 1, 5, 3, 2, 5, 4, 3, 5, 1, 4];
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  const ng = g.toNonIndexed();
  ng.computeVertexNormals();
  g.dispose();
  return ng;
}

/** A ship anchor from boxes: shank (+Y up), stock, two flukes; pointed along -Z when lying flat. */
export function anchorGeo(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const box = (w: number, h: number, d: number, x: number, y: number, z: number, rz = 0) => {
    const b = new THREE.BoxGeometry(w, h, d);
    b.rotateZ(rz); b.translate(x, y, z);
    parts.push(b);
  };
  box(0.12, 1.1, 0.12, 0, 0, 0);
  box(0.6, 0.08, 0.08, 0, 0.45, 0);
  box(0.1, 0.42, 0.1, -0.2, -0.5, 0, -0.9);
  box(0.1, 0.42, 0.1, 0.2, -0.5, 0, 0.9);
  box(0.5, 0.1, 0.12, 0, -0.56, 0);
  const g = mergeAll(parts);
  g.rotateX(-Math.PI / 2); // lie flat, shank along -Z
  return g;
}

/** Ground ring band for warnings and waves (unit radius, width w fraction). */
export function ringGeo(w = 0.12, n = 24): THREE.BufferGeometry {
  const g = new THREE.RingGeometry(1 - w, 1, n, 1);
  g.rotateX(-Math.PI / 2);
  return g;
}

/** The fire column: a row of ragged flame blocks along -Z, starting a little ahead of the caster (never around the camera). */
export function columnGeo(): THREE.BufferGeometry {
  const C = BALANCE.effects.column, start = 1.4, n = 14, step = (C.len - start) / n, parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < n; i++) {
    const h = (0.25 + 0.75 * Math.abs(Math.sin(i * 2.3 + 0.7))) * Math.min(1, 0.35 + i / 5), w = C.w * (0.6 + 0.4 * Math.abs(Math.sin(i * 1.7)));
    const b = new THREE.BoxGeometry(w, h, step * 0.8);
    b.rotateY(Math.sin(i * 3.1) * 0.5);
    b.translate(Math.sin(i * 5.3) * 0.15, h / 2, -start - step * (i + 0.5));
    parts.push(b);
  }
  return mergeAll(parts);
}

function mergeAll(list: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const pos: number[] = [];
  for (const g of list) {
    const ng = g.index ? g.toNonIndexed() : g, p = ng.getAttribute('position');
    for (let i = 0; i < p.count; i++) pos.push(p.getX(i), p.getY(i), p.getZ(i));
    g.dispose(); if (ng !== g) ng.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.computeVertexNormals();
  return out;
}
