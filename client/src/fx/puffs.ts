import * as THREE from 'three';
import { HEAT_LINEAR } from '../render/heat';
import type { LightRig } from '../render/lights';
import { FX_COMMON } from './glsl';

/** One dithered sprite: blood puff, steam, dust. Sizes are meters; grow = m/s; rise = upward accel. */
export interface PuffSpawn {
  x: number; y: number; z: number; vx: number; vy: number; vz: number;
  size: number; grow: number; life: number; alpha: number; color: THREE.Color;
  drag?: number; rise?: number; seed?: number;
}

const VERT = /* glsl */ `
attribute vec3 iPos;
attribute vec4 iA;     // size, alpha, seed, -
attribute vec3 iCol;
varying vec2 vUv;
varying vec3 vCol;
varying float vA;
varying float vSeed;
varying float vDepth;
void main() {
  vec4 mv = viewMatrix * vec4(iPos, 1.0);
  mv.xy += position.xy * iA.x;
  vUv = position.xy;
  vCol = iCol; vA = iA.y; vSeed = iA.z; vDepth = -mv.z;
  gl_Position = projectionMatrix * mv;
}
`;
const FRAG = /* glsl */ `
${FX_COMMON}
varying vec2 vUv;
varying vec3 vCol;
varying float vA;
varying float vSeed;
varying float vDepth;
void main() {
  // a lumpy round blob: radius wobbles with angle, different per puff
  float a = atan(vUv.y, vUv.x);
  float r = length(vUv) / (0.78 + 0.14 * sin(a * 3.0 + vSeed * 6.3) + 0.08 * sin(a * 5.0 - vSeed * 11.0));
  if (r > 1.0) discard;
  ditherClip(vA * (1.0 - r * r * 0.55));
  float shade = 0.82 + 0.18 * vUv.y;
  gl_FragColor = vec4(applyFog(vCol * shade, vDepth), 1.0);
  #include <colorspace_fragment>
}
`;

/** Dithered sprite pool (no blending, no glow): hit puffs, quench steam, slam dust. One instanced draw. */
export class PuffPool {
  readonly mesh: THREE.Mesh;
  private n = 0;
  private p: Float32Array; private a: Float32Array; private c: Float32Array;
  private vel: Float32Array; private st: Float32Array; // size0, grow, life, age, alpha0, drag, rise
  private aP: THREE.InstancedBufferAttribute; private aA: THREE.InstancedBufferAttribute; private aC: THREE.InstancedBufferAttribute;
  private geo = new THREE.InstancedBufferGeometry();

  constructor(rig: LightRig, readonly cap = 96) {
    this.p = new Float32Array(cap * 3); this.a = new Float32Array(cap * 4); this.c = new Float32Array(cap * 3);
    this.vel = new Float32Array(cap * 3); this.st = new Float32Array(cap * 7);
    const g = this.geo;
    g.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0], 3));
    g.setIndex([0, 1, 2, 0, 2, 3]);
    this.aP = new THREE.InstancedBufferAttribute(this.p, 3).setUsage(THREE.DynamicDrawUsage);
    this.aA = new THREE.InstancedBufferAttribute(this.a, 4).setUsage(THREE.DynamicDrawUsage);
    this.aC = new THREE.InstancedBufferAttribute(this.c, 3).setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('iPos', this.aP); g.setAttribute('iA', this.aA); g.setAttribute('iCol', this.aC);
    g.instanceCount = 0;
    const m = new THREE.ShaderMaterial({
      uniforms: { uHeatRamp: { value: HEAT_LINEAR }, uFogColor: rig.shared.uFogColor, uFog: rig.shared.uFog },
      vertexShader: VERT, fragmentShader: FRAG,
    });
    m.name = 'fx:puffs';
    this.mesh = new THREE.Mesh(g, m);
    this.mesh.frustumCulled = false;
    this.mesh.userData.noCollide = true;
  }

  get live(): number { return this.n; }

  spawn(s: PuffSpawn): void {
    if (this.n >= this.cap) return;
    const i = this.n++;
    this.p.set([s.x, s.y, s.z], i * 3); this.vel.set([s.vx, s.vy, s.vz], i * 3);
    this.c.set([s.color.r, s.color.g, s.color.b], i * 3);
    this.st.set([s.size, s.grow, s.life, 0, s.alpha, s.drag ?? 2, s.rise ?? 0], i * 7);
    this.a.set([s.size, s.alpha, s.seed ?? 0.5, 0], i * 4);
  }

  update(dt: number): void {
    let i = 0;
    while (i < this.n) {
      const o = i * 7, k = i * 3;
      const age = (this.st[o + 3] += dt), life = this.st[o + 2];
      if (age >= life) { this.kill(i); continue; }
      const drag = Math.max(0, 1 - this.st[o + 5] * dt);
      this.vel[k] *= drag; this.vel[k + 1] = this.vel[k + 1] * drag + this.st[o + 6] * dt; this.vel[k + 2] *= drag;
      this.p[k] += this.vel[k] * dt; this.p[k + 1] += this.vel[k + 1] * dt; this.p[k + 2] += this.vel[k + 2] * dt;
      const f = age / life;
      this.a[i * 4] = this.st[o] + this.st[o + 1] * age;
      // thick at first, thins out late (the shader steps it into 4 dither levels)
      this.a[i * 4 + 1] = this.st[o + 4] * (f < 0.35 ? 1 : 1 - (f - 0.35) / 0.65);
      i++;
    }
    this.geo.instanceCount = this.n;
    this.aP.needsUpdate = this.aA.needsUpdate = this.aC.needsUpdate = true;
    this.mesh.visible = this.n > 0;
  }

  clear(): void { this.n = 0; this.geo.instanceCount = 0; }

  private kill(i: number): void {
    const j = --this.n;
    if (i === j) return;
    this.p.copyWithin(i * 3, j * 3, j * 3 + 3); this.vel.copyWithin(i * 3, j * 3, j * 3 + 3); this.c.copyWithin(i * 3, j * 3, j * 3 + 3);
    this.a.copyWithin(i * 4, j * 4, j * 4 + 4); this.st.copyWithin(i * 7, j * 7, j * 7 + 7);
  }
  dispose(): void { this.geo.dispose(); (this.mesh.material as THREE.Material).dispose(); }
}
