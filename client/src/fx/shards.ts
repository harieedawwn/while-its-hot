import * as THREE from 'three';
import { FEEL } from '../core/feel';
import type { LightRig } from '../render/lights';
import { psxMaterial } from '../render/materials/psx';

const X = FEEL.fx.shatter, MAX = 5, VPS = 36;

interface Shard { base: Float32Array; nrm: Float32Array; pos: THREE.Vector3; vel: THREE.Vector3; q: THREE.Quaternion; w: THREE.Vector3; floor: number; rest: boolean }

/**
 * Gãy (LOOK §7): the blade splits into 3–5 slabs with simple rigid physics (gravity, floor bounce, spin
 * damping), cooling dull red → steel. All shards are one dynamic mesh (one draw), rewritten per frame.
 */
export class Shards {
  readonly mesh: THREE.Mesh;
  private list: Shard[] = [];
  private age = 0;
  private posA: THREE.BufferAttribute; private nrmA: THREE.BufferAttribute;
  private tmp = new THREE.Vector3(); private tq = new THREE.Quaternion(); private axis = new THREE.Vector3();

  constructor(rig: LightRig) {
    const g = new THREE.BufferGeometry();
    this.posA = new THREE.BufferAttribute(new Float32Array(MAX * VPS * 3), 3).setUsage(THREE.DynamicDrawUsage);
    this.nrmA = new THREE.BufferAttribute(new Float32Array(MAX * VPS * 3), 3).setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('position', this.posA); g.setAttribute('normal', this.nrmA);
    g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(MAX * VPS * 2), 2));
    g.setDrawRange(0, 0);
    const m = psxMaterial(rig, { tint: '#9aa0a6' });
    m.name = 'fx:shards';
    m.vertexColors = false;
    this.mesh = new THREE.Mesh(g, m);
    this.mesh.frustumCulled = false;
    this.mesh.visible = false;
    this.mesh.userData.noCollide = true;
  }

  /** Break the blade lying from a to b (world). width = blade width (m); rnd = seeded 0..1. */
  burst(a: THREE.Vector3, b: THREE.Vector3, width: number, floor: number, rnd: () => number): void {
    this.list = []; this.age = 0;
    const n = X.shards[0] + Math.floor(rnd() * (X.shards[1] - X.shards[0] + 1));
    const dir = this.tmp.subVectors(b, a), len = dir.length(), d = dir.clone().normalize();
    const align = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d);
    // cut points with random spacing; each piece is a slab with jagged ends
    const cuts = [0];
    for (let i = 1; i < n; i++) cuts.push((i + (rnd() - 0.5) * 0.5) / n);
    cuts.push(1);
    for (let i = 0; i < n; i++) {
      const l = (cuts[i + 1] - cuts[i]) * len, mid = (cuts[i] + cuts[i + 1]) * 0.5 * len;
      const w = width * (1 - (cuts[i] + cuts[i + 1]) * 0.25);
      const jag = () => (rnd() - 0.5) * l * 0.5;
      const { base, nrm } = slab(w, l, 0.012, jag(), jag());
      const pos = a.clone().addScaledVector(d, mid);
      const out = new THREE.Vector3(rnd() - 0.5, 0, rnd() - 0.5).normalize();
      const vel = out.multiplyScalar(0.8 + rnd() * 1.4).add(new THREE.Vector3(0, 1.8 + rnd() * 1.6, 0));
      const w3 = new THREE.Vector3(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).multiplyScalar(18);
      this.list.push({ base, nrm, pos, vel, q: align.clone(), w: w3, floor, rest: false });
    }
    this.mesh.geometry.setDrawRange(0, n * VPS);
    this.mesh.visible = true;
  }

  get live(): number { return this.mesh.visible ? this.list.length : 0; }

  update(dt: number): void {
    if (!this.mesh.visible) return;
    this.age += dt;
    if (this.age > X.stayS + 0.6) { this.mesh.visible = false; this.list = []; return; }
    // dull red cooling down the ramp to plain steel
    this.mesh.userData.heat = Math.max(0, X.heat * (1 - this.age / X.coolS));
    const sink = this.age > X.stayS ? Math.ceil((this.age - X.stayS) / 0.15) * 0.012 : 0;
    const p = this.posA.array as Float32Array, nn = this.nrmA.array as Float32Array;
    this.list.forEach((s, i) => {
      if (!s.rest) {
        s.vel.y -= FEEL.fx.spark.gravity * dt;
        s.pos.addScaledVector(s.vel, dt);
        const wl = s.w.length();
        if (wl > 1e-3) { this.tq.setFromAxisAngle(this.axis.copy(s.w).divideScalar(wl), wl * dt); s.q.premultiply(this.tq); }
        if (s.pos.y < s.floor + 0.01) {
          s.pos.y = s.floor + 0.01;
          s.vel.y = -s.vel.y * 0.28; s.vel.x *= 0.5; s.vel.z *= 0.5; s.w.multiplyScalar(0.45);
          if (Math.abs(s.vel.y) < 0.35) { s.rest = true; this.lay(s); }
        }
      }
      for (let v = 0; v < VPS; v++) {
        const o = (i * VPS + v) * 3;
        this.tmp.fromArray(s.base, v * 3).applyQuaternion(s.q).add(s.pos);
        p[o] = this.tmp.x; p[o + 1] = this.tmp.y - sink; p[o + 2] = this.tmp.z;
        this.tmp.fromArray(s.nrm, v * 3).applyQuaternion(s.q);
        nn[o] = this.tmp.x; nn[o + 1] = this.tmp.y; nn[o + 2] = this.tmp.z;
      }
    });
    this.posA.needsUpdate = this.nrmA.needsUpdate = true;
    this.mesh.geometry.computeBoundingSphere();
  }

  /** A resting slab lies flat on its broad face, keeping its heading. */
  private lay(s: Shard): void {
    const up = new THREE.Vector3(0, 0, 1).applyQuaternion(s.q);
    const flip = up.y < 0 ? -1 : 1;
    const along = new THREE.Vector3(0, 1, 0).applyQuaternion(s.q); along.y = 0;
    if (along.lengthSq() < 1e-4) along.set(1, 0, 0);
    along.normalize();
    const m = new THREE.Matrix4().makeBasis(new THREE.Vector3().crossVectors(along, new THREE.Vector3(0, flip, 0)), along, new THREE.Vector3(0, flip, 0));
    s.q.setFromRotationMatrix(m);
    s.w.set(0, 0, 0); s.vel.set(0, 0, 0);
  }

  clear(): void { this.mesh.visible = false; this.list = []; }
  dispose(): void { this.mesh.geometry.dispose(); (this.mesh.material as THREE.Material).dispose(); }
}

/** A thin slab along +Y (w × l × t, broad face ±Z) with its end faces skewed by j0/j1 (non-indexed, 36 verts). */
function slab(w: number, l: number, t: number, j0: number, j1: number): { base: Float32Array; nrm: Float32Array } {
  const hw = w / 2, hl = l / 2, ht = t / 2;
  // 8 corners: x ∓hw, y bottom/top (skewed per side), z ∓ht
  const c = (sx: number, top: boolean, sz: number) => [sx * hw, top ? hl + sx * j1 : -hl + sx * j0, sz * ht];
  const v = [c(-1, false, -1), c(1, false, -1), c(1, true, -1), c(-1, true, -1), c(-1, false, 1), c(1, false, 1), c(1, true, 1), c(-1, true, 1)];
  const faces = [[4, 5, 6, 7], [1, 0, 3, 2], [5, 1, 2, 6], [0, 4, 7, 3], [7, 6, 2, 3], [0, 1, 5, 4]];
  const base = new Float32Array(VPS * 3), nrm = new Float32Array(VPS * 3);
  const A = new THREE.Vector3(), B = new THREE.Vector3(), C = new THREE.Vector3(), N = new THREE.Vector3();
  let k = 0;
  for (const f of faces) for (const tri of [[f[0], f[1], f[2]], [f[0], f[2], f[3]]]) {
    A.fromArray(v[tri[0]]); B.fromArray(v[tri[1]]); C.fromArray(v[tri[2]]);
    N.subVectors(B, A).cross(C.clone().sub(A)).normalize();
    for (const id of tri) { base.set(v[id], k * 3); N.toArray(nrm, k * 3); k++; }
  }
  return { base, nrm };
}
