import * as THREE from 'three';
import { HEAT_LINEAR } from '../render/heat';
import type { LightRig } from '../render/lights';
import { FX_COMMON } from './glsl';

/** A flat ground mark. shape 0 = splat, 1 = ring. Radius goes r0 → r1 in `steps` jumps over `growS`. */
export interface DecalSpawn {
  x: number; y: number; z: number; r0: number; r1: number; growS: number; steps: number;
  life: number; fadeS: number; alpha: number; color: THREE.Color; shape: 0 | 1; seed: number; width?: number;
}

const VERT = /* glsl */ `
attribute vec3 iPos;
attribute vec4 iA;    // radius, alpha, shape, seed
attribute float iW;   // ring width (fraction of radius)
attribute vec3 iCol;
varying vec2 vUv;
varying vec4 vA;
varying float vW;
varying vec3 vCol;
varying float vDepth;
void main() {
  vec3 wp = iPos + vec3(position.x, 0.0, position.y) * iA.x;
  vUv = position.xy; vA = iA; vW = iW; vCol = iCol;
  vec4 mv = viewMatrix * vec4(wp, 1.0);
  vDepth = -mv.z;
  gl_Position = projectionMatrix * mv;
}
`;
const FRAG = /* glsl */ `
${FX_COMMON}
varying vec2 vUv;
varying vec4 vA;
varying float vW;
varying vec3 vCol;
varying float vDepth;
void main() {
  float ang = atan(vUv.y, vUv.x), s = vA.w * 6.283;
  float r = length(vUv);
  if (vA.z < 0.5) {
    // splat: lobed blob plus a few droplets around it
    float edge = 0.62 + 0.16 * sin(ang * 5.0 + s) + 0.1 * sin(ang * 9.0 - s * 2.0);
    vec2 dp = vec2(cos(s * 3.0), sin(s * 3.0)) * 0.82 - vUv;
    vec2 dq = vec2(cos(s * 5.0 + 2.0), sin(s * 5.0 + 2.0)) * 0.74 - vUv;
    if (r > edge && length(dp) > 0.11 && length(dq) > 0.08) discard;
  } else {
    float wob = 0.03 * sin(ang * 7.0 + s);
    if (abs(r - (1.0 - vW * 0.5) + wob) > vW * 0.5) discard;
  }
  ditherClip(vA.y);
  gl_FragColor = vec4(applyFog(vCol, vDepth), 1.0);
  #include <colorspace_fragment>
}
`;

/** Ground decals: blood splats, quench and slam rings. Depth-offset flat quads, dithered, one instanced draw. */
export class DecalPool {
  readonly mesh: THREE.Mesh;
  private n = 0;
  private p: Float32Array; private a: Float32Array; private w: Float32Array; private c: Float32Array;
  private st: Float32Array; // r0, r1, growS, steps, life, fadeS, alpha0, age
  private aP: THREE.InstancedBufferAttribute; private aA: THREE.InstancedBufferAttribute;
  private aW: THREE.InstancedBufferAttribute; private aC: THREE.InstancedBufferAttribute;
  private geo = new THREE.InstancedBufferGeometry();

  constructor(rig: LightRig, readonly cap = 48) {
    this.p = new Float32Array(cap * 3); this.a = new Float32Array(cap * 4); this.w = new Float32Array(cap);
    this.c = new Float32Array(cap * 3); this.st = new Float32Array(cap * 8);
    const g = this.geo;
    g.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0], 3));
    g.setIndex([0, 2, 1, 0, 3, 2]);
    this.aP = new THREE.InstancedBufferAttribute(this.p, 3).setUsage(THREE.DynamicDrawUsage);
    this.aA = new THREE.InstancedBufferAttribute(this.a, 4).setUsage(THREE.DynamicDrawUsage);
    this.aW = new THREE.InstancedBufferAttribute(this.w, 1).setUsage(THREE.DynamicDrawUsage);
    this.aC = new THREE.InstancedBufferAttribute(this.c, 3).setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('iPos', this.aP); g.setAttribute('iA', this.aA); g.setAttribute('iW', this.aW); g.setAttribute('iCol', this.aC);
    g.instanceCount = 0;
    const m = new THREE.ShaderMaterial({
      uniforms: { uHeatRamp: { value: HEAT_LINEAR }, uFogColor: rig.shared.uFogColor, uFog: rig.shared.uFog },
      vertexShader: VERT, fragmentShader: FRAG, depthWrite: false,
      polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
    });
    m.name = 'fx:decals';
    this.mesh = new THREE.Mesh(g, m);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 1;
    this.mesh.userData.noCollide = true;
  }

  get live(): number { return this.n; }

  spawn(s: DecalSpawn): void {
    // the oldest mark goes first when the floor is full
    if (this.n >= this.cap) this.kill(0);
    const i = this.n++;
    this.p.set([s.x, s.y + 0.012, s.z], i * 3);
    this.c.set([s.color.r, s.color.g, s.color.b], i * 3);
    this.a.set([s.r0, s.alpha, s.shape, s.seed], i * 4);
    this.w[i] = s.width ?? 0.18;
    this.st.set([s.r0, s.r1, s.growS, s.steps, s.life, s.fadeS, s.alpha, 0], i * 8);
  }

  update(dt: number): void {
    let i = 0;
    while (i < this.n) {
      const o = i * 8, age = (this.st[o + 7] += dt), life = this.st[o + 4];
      if (age >= life) { this.kill(i); continue; }
      const steps = this.st[o + 3], g = Math.min(1, age / Math.max(1e-3, this.st[o + 2]));
      const gs = steps > 0 ? Math.ceil(g * steps) / steps : g;
      this.a[i * 4] = this.st[o] + (this.st[o + 1] - this.st[o]) * gs;
      const fadeS = this.st[o + 5], left = life - age;
      this.a[i * 4 + 1] = this.st[o + 6] * (left < fadeS ? left / fadeS : 1);
      i++;
    }
    this.geo.instanceCount = this.n;
    this.aP.needsUpdate = this.aA.needsUpdate = this.aW.needsUpdate = this.aC.needsUpdate = true;
    this.mesh.visible = this.n > 0;
  }

  clear(): void { this.n = 0; this.geo.instanceCount = 0; }

  private kill(i: number): void {
    const j = --this.n;
    if (i === j) return;
    this.p.copyWithin(i * 3, j * 3, j * 3 + 3); this.c.copyWithin(i * 3, j * 3, j * 3 + 3);
    this.a.copyWithin(i * 4, j * 4, j * 4 + 4); this.st.copyWithin(i * 8, j * 8, j * 8 + 8); this.w[i] = this.w[j];
  }
  dispose(): void { this.geo.dispose(); (this.mesh.material as THREE.Material).dispose(); }
}
