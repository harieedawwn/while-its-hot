import * as THREE from 'three';
import { HEAT_HEX } from '../../render/heat';
import * as P from '../../render/geo/procgeo';

/**
 * Fire ring placeholder (LOOK §7): a wall of flame tongues around a center, stepped down the heat ramp,
 * re-rolled at 8 fps. Real flame cards, embers and the world tint come with the VFX pass (phase 10).
 */
const TONGUES = 72, FPS = 8;
const LAYERS: { h0: number; h1: number; w0: number; w1: number; hex: string }[] = [
  { h0: 0, h1: 0.42, w0: 1, w1: 0.8, hex: HEAT_HEX[3] },
  { h0: 0.42, h1: 0.75, w0: 0.8, w1: 0.45, hex: HEAT_HEX[4] },
  { h0: 0.75, h1: 1, w0: 0.45, w1: 0, hex: HEAT_HEX[5] },
  { h0: 0, h1: 0.3, w0: 0.5, w1: 0.3, hex: HEAT_HEX[6] },
];
const VERTS_PER_TONGUE = LAYERS.length * 6 * 2; // quads as 2 tris, both faces

export class FireRing {
  readonly mesh: THREE.Mesh;
  private pos: THREE.BufferAttribute;
  private last = -1;
  private cx = 0; private cz = 0; private radius = 0;
  private rnd = P.rng(31);

  constructor(material: THREE.Material) {
    const n = TONGUES * VERTS_PER_TONGUE;
    const g = new THREE.BufferGeometry();
    this.pos = new THREE.BufferAttribute(new Float32Array(n * 3), 3);
    g.setAttribute('position', this.pos);
    const nrm = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) nrm[i * 3 + 1] = 1;
    g.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
    g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n * 2), 2));
    const col = new Float32Array(n * 3), c = new THREE.Color();
    for (let t = 0; t < TONGUES; t++) LAYERS.forEach((l, i) => {
      c.set(l.hex);
      for (let v = 0; v < 12; v++) col.set([c.r, c.g, c.b], ((t * LAYERS.length + i) * 12 + v) * 3);
    });
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    this.mesh = new THREE.Mesh(g, material);
    this.mesh.frustumCulled = false;
    this.mesh.visible = false;
    this.mesh.userData.noCollide = true;
  }

  /** radius <= 0 hides the ring. */
  set(cx: number, cz: number, radius: number): void { this.cx = cx; this.cz = cz; this.radius = radius; this.last = -1; this.mesh.visible = radius > 0; }

  update(time: number): void {
    if (this.radius <= 0) return;
    const step = Math.floor(time * FPS);
    if (step === this.last) return;
    this.last = step;
    this.write(step);
  }

  private write(step: number): void {
    const p = this.pos;
    let k = 0;
    const hash = (a: number, b: number) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };
    for (let t = 0; t < TONGUES; t++) {
      const a = (t / TONGUES) * Math.PI * 2, wid = ((Math.PI * 2 * this.radius) / TONGUES) * 0.9;
      const h = 3.2 + hash(t, step & 3) * 3.4 + (t % 3 === 0 ? 1.4 : 0);
      const ox = Math.cos(a), oz = Math.sin(a), tx = -oz, tz = ox, bx = this.cx + ox * this.radius, bz = this.cz + oz * this.radius;
      const sway = (hash(t, (step & 3) + 9) - 0.5) * 0.9;
      for (const l of LAYERS) {
        const pt = (hh: number, ww: number, s: number): [number, number, number] => {
          const lean = sway * hh * hh;
          return [bx + tx * ww * wid * s + ox * lean, hh * h, bz + tz * ww * wid * s + oz * lean];
        };
        const a0 = pt(l.h0, l.w0, -1), a1 = pt(l.h0, l.w0, 1), b0 = pt(l.h1, l.w1, -1), b1 = pt(l.h1, l.w1, 1);
        for (const v of [a0, a1, b1, a0, b1, b0, a0, b1, a1, a0, b0, b1]) { p.setXYZ(k++, v[0], v[1], v[2]); }
      }
    }
    p.needsUpdate = true;
  }
  dispose(): void { this.mesh.geometry.dispose(); }
}
