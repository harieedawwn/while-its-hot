import * as THREE from 'three';
import { FOUNDRY, type Rect } from '@wih/shared';
import { HEAT_HEX } from '../../render/heat';
import type { LightRig } from '../../render/lights';
import * as P from '../../render/geo/procgeo';
import { psxMaterial } from '../../render/materials/psx';

/**
 * Molten channels (LOOK §7): one flat sheet per arm whose small emissive texture scrolls outward in
 * 8 Hz steps, plus dark crust islands drifting at their own speeds over it. Two draw calls in all.
 * The sheet is unlit (it IS the light source); the crust is lit slag so it reads against it.
 */
const STEP_HZ = 8, TILE = 8, FLOW = 0.9;
const SIZE = 64;

/** Tileable hot-metal texture: lattice noise → 5 heat steps. Pure pixels, nearest sampled. */
function moltenTexture(seed: number): THREE.DataTexture {
  const rnd = P.rng(seed), L = 8, lat = new Float32Array(L * L).map(() => rnd());
  const at = (x: number, y: number) => lat[((y % L) + L) % L * L + (((x % L) + L) % L)];
  const smooth = (t: number) => t * t * (3 - 2 * t);
  const val = (u: number, v: number, f: number) => {
    const x = u * f, y = v * f, x0 = Math.floor(x), y0 = Math.floor(y), tx = smooth(x - x0), ty = smooth(y - y0);
    const a = at(x0, y0) * (1 - tx) + at(x0 + 1, y0) * tx, b = at(x0, y0 + 1) * (1 - tx) + at(x0 + 1, y0 + 1) * tx;
    return a * (1 - ty) + b * ty;
  };
  const data = new Uint8Array(SIZE * SIZE * 4);
  const cuts = [0.3, 0.46, 0.62, 0.78];
  for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
    const u = x / SIZE, v = y / SIZE;
    const n = 0.55 * val(u, v, 1) + 0.3 * val(u, v, 2) + 0.15 * val(u, v, 4);
    // sRGB bytes straight from the heat-ramp hex (the texture is flagged sRGB)
    const k = parseInt(HEAT_HEX[3 + cuts.filter((c) => n > c).length].slice(1), 16), i = (y * SIZE + x) * 4;
    data[i] = (k >> 16) & 255; data[i + 1] = (k >> 8) & 255; data[i + 2] = k & 255; data[i + 3] = 255;
  }
  const t = new THREE.DataTexture(data, SIZE, SIZE);
  t.colorSpace = THREE.SRGBColorSpace;
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestMipmapLinearFilter;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.generateMipmaps = true;
  t.needsUpdate = true;
  return t;
}

interface Arm { rect: Rect; dir: THREE.Vector2; out0: number; out1: number }
const E = FOUNDRY.half, W = FOUNDRY.channel.halfW, A = FOUNDRY.channel.from, FURNACE_BACK = FOUNDRY.half + FOUNDRY.furnace.depth - 0.1;
const ARMS: Arm[] = [
  { rect: { x0: A, x1: E, z0: -W, z1: W }, dir: new THREE.Vector2(1, 0), out0: A, out1: E },
  { rect: { x0: -E, x1: -A, z0: -W, z1: W }, dir: new THREE.Vector2(-1, 0), out0: A, out1: E },
  { rect: { x0: -W, x1: W, z0: -FURNACE_BACK, z1: -A }, dir: new THREE.Vector2(0, -1), out0: A, out1: FURNACE_BACK },
  { rect: { x0: -W, x1: W, z0: A, z1: E }, dir: new THREE.Vector2(0, 1), out0: A, out1: E },
];

export class Molten {
  readonly sheet: THREE.Mesh;
  readonly crust: THREE.Mesh;
  private uv: THREE.BufferAttribute;
  private islands: { arm: Arm; s: number; lat: number; speed: number; r: number; seed: number }[] = [];
  private shape: Float32Array[] = [];
  private cpos: THREE.BufferAttribute;
  private lastStep = -1;

  constructor(rig: LightRig, crustMat: THREE.Material) {
    const y = FOUNDRY.channel.surfaceY;
    const pos: number[] = [];
    for (const { rect: r } of ARMS) pos.push(r.x0, y, r.z1, r.x1, y, r.z1, r.x1, y, r.z0, r.x0, y, r.z1, r.x1, y, r.z0, r.x0, y, r.z0);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(pos.map((_, i) => (i % 3 === 1 ? 1 : 0)), 3));
    this.uv = new THREE.BufferAttribute(new Float32Array((pos.length / 3) * 2), 2);
    g.setAttribute('uv', this.uv);
    const mat = psxMaterial(rig, { map: moltenTexture(7), unlit: 1 });
    mat.name = 'molten';
    this.sheet = new THREE.Mesh(g, mat);
    this.sheet.frustumCulled = false;
    this.sheet.userData.noCollide = true;

    // crust islands: irregular 8-gons, 5 per arm, each with its own speed and lane
    const rnd = P.rng(23);
    ARMS.forEach((arm) => {
      for (let i = 0; i < 5; i++) {
        const isl = { arm, s: arm.out0 + ((i + rnd()) / 5) * (arm.out1 - arm.out0), lat: (rnd() - 0.5) * 2 * (W - 1.1), speed: 0.35 + rnd() * 0.5, r: 0.55 + rnd() * 0.8, seed: i };
        this.islands.push(isl);
        this.shape.push(Float32Array.from({ length: 8 }, () => 0.7 + rnd() * 0.5));
      }
    });
    const n = this.islands.length * 8 * 3;
    const cg = new THREE.BufferGeometry();
    this.cpos = new THREE.BufferAttribute(new Float32Array(n * 3), 3);
    cg.setAttribute('position', this.cpos);
    const cn = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) cn[i * 3 + 1] = 1;
    cg.setAttribute('normal', new THREE.BufferAttribute(cn, 3));
    cg.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n * 2), 2));
    const cc = new Float32Array(n * 3);
    for (let i = 0; i < n; i += 3) { cc.set([0.22, 0.14, 0.12], i * 3); cc.set([0.38, 0.2, 0.16], i * 3 + 3); cc.set([0.38, 0.2, 0.16], i * 3 + 6); }
    cg.setAttribute('color', new THREE.BufferAttribute(cc, 3));
    this.crust = new THREE.Mesh(cg, crustMat);
    this.crust.frustumCulled = false;
    this.crust.userData.noCollide = true;
    this.crust.userData.heat = 0;
    this.write(0);
  }

  update(time: number): void {
    const step = Math.floor(time * STEP_HZ);
    if (step === this.lastStep) return;
    this.lastStep = step;
    this.write(step / STEP_HZ);
  }

  private write(t: number): void {
    const sheetPos = this.sheet.geometry.getAttribute('position');
    for (let i = 0; i < sheetPos.count; i++) {
      const arm = ARMS[Math.floor(i / 6)], x = sheetPos.getX(i), z = sheetPos.getZ(i);
      const along = x * arm.dir.x + z * arm.dir.y, across = -x * arm.dir.y + z * arm.dir.x;
      this.uv.setXY(i, along / TILE - t * FLOW / TILE, across / TILE);
    }
    this.uv.needsUpdate = true;
    const y = FOUNDRY.channel.surfaceY + 0.06, p = this.cpos;
    let k = 0;
    this.islands.forEach((isl, n) => {
      const span = isl.arm.out1 - isl.arm.out0;
      const s = isl.arm.out0 + ((isl.s - isl.arm.out0 + t * isl.speed) % span + span) % span;
      const cx = isl.arm.dir.x * s - isl.arm.dir.y * isl.lat, cz = isl.arm.dir.y * s + isl.arm.dir.x * isl.lat;
      const shape = this.shape[n];
      for (let j = 0; j < 8; j++) {
        const a0 = (j / 8) * Math.PI * 2, a1 = ((j + 1) / 8) * Math.PI * 2, r0 = isl.r * shape[j], r1 = isl.r * shape[(j + 1) % 8];
        p.setXYZ(k++, cx, y, cz);
        p.setXYZ(k++, cx + Math.sin(a0) * r0, y, cz + Math.cos(a0) * r0);
        p.setXYZ(k++, cx + Math.sin(a1) * r1, y, cz + Math.cos(a1) * r1);
      }
    });
    p.needsUpdate = true;
  }
  dispose(): void { this.sheet.geometry.dispose(); this.crust.geometry.dispose(); }
}
