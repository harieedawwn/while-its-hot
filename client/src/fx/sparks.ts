import * as THREE from 'three';
import { FEEL } from '../core/feel';
import { HEAT_LINEAR } from '../render/heat';
import type { LightRig } from '../render/lights';
import { FX_COMMON } from './glsl';

const S = FEEL.fx.spark;

/** kind 0 = spark (gravity, 1 bounce), 1 = ember (drifts up, sways), 2 = star (no gravity, short). */
export type SparkKind = 0 | 1 | 2;
export interface SparkSpawn { x: number; y: number; z: number; vx: number; vy: number; vz: number; life: number; floor: number; kind?: SparkKind; heat?: number }

const VERT = /* glsl */ `
attribute vec3 iPos;
attribute vec3 iVel;
attribute vec3 iHeat;   // heat 0..1, width multiplier, length multiplier
uniform float uPix;     // world size of one target pixel at 1 m
uniform vec3 uCam;
uniform float uLenK;
uniform float uMaxLen;
uniform float uWidth;
varying float vHeat;
varying float vDepth;
void main() {
  float sp = length(iVel);
  vec3 d = sp > 1e-3 ? iVel / sp : vec3(0.0, 1.0, 0.0);
  vec3 toCam = normalize(uCam - iPos);
  float dist = distance(uCam, iPos);
  float px = uPix * dist;
  float len = max(min(sp * uLenK, uMaxLen) * iHeat.z, px * 1.5);
  vec3 side = cross(d, toCam);
  float sl = length(side);
  side = sl > 1e-3 ? side / sl : vec3(1.0, 0.0, 0.0);
  float w = max(uWidth * iHeat.y, px) * 0.5;
  // position.x: -1/1 across, position.y: 0 head .. 1 tail (the tail trails behind the motion)
  vec3 wp = iPos - d * len * position.y + side * w * position.x;
  vHeat = iHeat.x;
  vec4 mv = viewMatrix * vec4(wp, 1.0);
  vDepth = -mv.z;
  gl_Position = projectionMatrix * mv;
}
`;
const FRAG = /* glsl */ `
${FX_COMMON}
varying float vHeat;
varying float vDepth;
void main() {
  vec3 c = heatRamp(vHeat);
  gl_FragColor = vec4(applyFog(c, vDepth * 0.6), 1.0);
  #include <colorspace_fragment>
}
`;

/**
 * The one spark pool (LOOK §7): stretched quads aligned to velocity, gravity, one floor bounce with energy
 * loss, color falling down the heat ramp as they cool. Embers (kind 1) share the pool. One instanced draw.
 */
export class SparkPool {
  readonly mesh: THREE.Mesh;
  private n = 0;
  private pos: Float32Array; private vel: Float32Array; private heat: Float32Array;
  private age: Float32Array; private life: Float32Array; private floor: Float32Array; private kind: Uint8Array; private h0: Float32Array; private bounced: Uint8Array;
  private aPos: THREE.InstancedBufferAttribute; private aVel: THREE.InstancedBufferAttribute; private aHeat: THREE.InstancedBufferAttribute;
  private geo: THREE.InstancedBufferGeometry;
  private u: Record<string, THREE.IUniform>;
  private t = 0;

  constructor(rig: LightRig, readonly cap: number = S.pool) {
    this.pos = new Float32Array(cap * 3); this.vel = new Float32Array(cap * 3); this.heat = new Float32Array(cap * 3);
    this.age = new Float32Array(cap); this.life = new Float32Array(cap); this.floor = new Float32Array(cap);
    this.kind = new Uint8Array(cap); this.h0 = new Float32Array(cap); this.bounced = new Uint8Array(cap);
    const g = new THREE.InstancedBufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([-1, 0, 0, 1, 0, 0, 1, 1, 0, -1, 1, 0], 3));
    g.setIndex([0, 1, 2, 0, 2, 3]);
    this.aPos = new THREE.InstancedBufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage);
    this.aVel = new THREE.InstancedBufferAttribute(this.vel, 3).setUsage(THREE.DynamicDrawUsage);
    this.aHeat = new THREE.InstancedBufferAttribute(this.heat, 3).setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('iPos', this.aPos); g.setAttribute('iVel', this.aVel); g.setAttribute('iHeat', this.aHeat);
    g.instanceCount = 0;
    this.geo = g;
    this.u = {
      uHeatRamp: { value: HEAT_LINEAR }, uFogColor: rig.shared.uFogColor, uFog: rig.shared.uFog,
      uPix: { value: 0.002 }, uCam: { value: new THREE.Vector3() },
      uLenK: { value: S.lenPerSpeed }, uMaxLen: { value: S.maxLen }, uWidth: { value: S.width },
    };
    const m = new THREE.ShaderMaterial({ uniforms: this.u, vertexShader: VERT, fragmentShader: FRAG, side: THREE.DoubleSide });
    m.name = 'fx:sparks';
    this.mesh = new THREE.Mesh(g, m);
    this.mesh.frustumCulled = false;
    this.mesh.userData.noCollide = true;
  }

  get live(): number { return this.n; }

  spawn(s: SparkSpawn): void {
    if (this.n >= this.cap) return;
    const i = this.n++, k = i * 3;
    this.pos[k] = s.x; this.pos[k + 1] = s.y; this.pos[k + 2] = s.z;
    this.vel[k] = s.vx; this.vel[k + 1] = s.vy; this.vel[k + 2] = s.vz;
    this.age[i] = 0; this.life[i] = s.life; this.floor[i] = s.floor; this.kind[i] = s.kind ?? 0;
    this.h0[i] = s.heat ?? 1; this.bounced[i] = 0;
    this.heat[i * 3] = this.h0[i]; this.heat[i * 3 + 1] = s.kind === 1 ? 1.6 : s.kind === 2 ? 2.2 : 1; this.heat[i * 3 + 2] = s.kind === 2 ? 3 : 1;
  }

  update(dt: number, camera: THREE.PerspectiveCamera, viewH: number): void {
    this.t += dt;
    const g = S.gravity;
    let i = 0;
    while (i < this.n) {
      this.age[i] += dt;
      if (this.age[i] >= this.life[i]) { this.kill(i); continue; }
      const k = i * 3, kind = this.kind[i];
      if (kind === 0) this.vel[k + 1] -= g * dt;
      else if (kind === 1) {
        // embers: a little lift, drag, a slow sideways wander
        const w = Math.sin(this.t * 2.3 + i * 1.7);
        this.vel[k] += w * 0.9 * dt; this.vel[k + 2] += Math.cos(this.t * 1.9 + i) * 0.9 * dt;
        this.vel[k + 1] += (0.6 - this.vel[k + 1]) * 1.5 * dt;
      } else { this.vel[k] *= 1 - 6 * dt; this.vel[k + 1] *= 1 - 6 * dt; this.vel[k + 2] *= 1 - 6 * dt; }
      this.pos[k] += this.vel[k] * dt; this.pos[k + 1] += this.vel[k + 1] * dt; this.pos[k + 2] += this.vel[k + 2] * dt;
      if (kind === 0 && this.pos[k + 1] < this.floor[i]) {
        this.pos[k + 1] = this.floor[i];
        if (this.bounced[i]) { this.vel[k + 1] = 0; this.vel[k] *= 1 - 8 * dt; this.vel[k + 2] *= 1 - 8 * dt; }
        else { this.bounced[i] = 1; this.vel[k + 1] *= -S.bounceY; this.vel[k] *= S.bounceXZ; this.vel[k + 2] *= S.bounceXZ; }
      }
      // born at the top of the ramp, falls down it as it cools (stepped in the shader)
      const f = kind === 2 ? 0 : this.age[i] / this.life[i];
      this.heat[i * 3] = this.h0[i] * (1 - f * f * 0.75) - f * 0.1;
      i++;
    }
    this.geo.instanceCount = this.n;
    this.aPos.needsUpdate = this.aVel.needsUpdate = this.aHeat.needsUpdate = true;
    (this.u.uCam.value as THREE.Vector3).setFromMatrixPosition(camera.matrixWorld);
    this.u.uPix.value = (2 * Math.tan((camera.fov * Math.PI) / 360)) / Math.max(1, viewH);
    this.mesh.visible = this.n > 0;
  }

  clear(): void { this.n = 0; this.geo.instanceCount = 0; }

  private kill(i: number): void {
    const j = --this.n;
    if (i === j) return;
    this.pos.copyWithin(i * 3, j * 3, j * 3 + 3); this.vel.copyWithin(i * 3, j * 3, j * 3 + 3); this.heat.copyWithin(i * 3, j * 3, j * 3 + 3);
    this.age[i] = this.age[j]; this.life[i] = this.life[j]; this.floor[i] = this.floor[j]; this.kind[i] = this.kind[j];
    this.h0[i] = this.h0[j]; this.bounced[i] = this.bounced[j];
  }
  dispose(): void { this.geo.dispose(); (this.mesh.material as THREE.Material).dispose(); }
}
