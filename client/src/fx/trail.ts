import * as THREE from 'three';
import { FEEL } from '../core/feel';
import { HEAT_LINEAR } from '../render/heat';
import type { LightRig } from '../render/lights';
import { marker } from '../weapons/weapon';
import { FX_COMMON } from './glsl';

const T = FEEL.fx.trail, N = T.segments;

const VERT = /* glsl */ `
attribute float aAge;
varying float vAge;
varying float vDepth;
void main() {
  vAge = aAge;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vDepth = -mv.z;
  gl_Position = projectionMatrix * mv;
}
`;
const FRAG = /* glsl */ `
${FX_COMMON}
uniform vec3 uSteel;
uniform float uHeat;
uniform float uAlpha;
varying float vAge;
varying float vDepth;
void main() {
  ditherClip(uAlpha * (1.0 - vAge));
  vec3 c = uHeat > 0.3 ? heatRamp(uHeat - 0.12) : uSteel;
  gl_FragColor = vec4(applyFog(c, vDepth), 1.0);
  #include <colorspace_fragment>
}
`;

/**
 * Weapon ribbon (LOOK §7): base→tip samples of the last `lifeS` seconds, 6–10 segments, dithered steel
 * grey in the low-res pass (no additive glow); heat tints it. Samples are taken in the mesh's parent space
 * (world for bodies, the eye group for the viewmodel, so turning the camera never smears it).
 * Draws only while the tip moves faster than `minSpeed` and `active()` says a swing is on.
 */
export class WeaponTrail {
  readonly mesh: THREE.Mesh;
  private samples: { b: THREE.Vector3; t: THREE.Vector3; time: number }[] = [];
  private posA: THREE.BufferAttribute; private ageA: THREE.BufferAttribute;
  private u: Record<string, THREE.IUniform>;
  private time = 0;
  private inv = new THREE.Matrix4(); private b = new THREE.Vector3(); private t = new THREE.Vector3(); private lastTip = new THREE.Vector3();
  private has = false;

  constructor(rig: LightRig, private getModel: () => THREE.Object3D | null, private active: () => boolean = () => true) {
    const g = new THREE.BufferGeometry();
    this.posA = new THREE.BufferAttribute(new Float32Array((N + 1) * 2 * 3), 3).setUsage(THREE.DynamicDrawUsage);
    this.ageA = new THREE.BufferAttribute(new Float32Array((N + 1) * 2), 1).setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('position', this.posA); g.setAttribute('aAge', this.ageA);
    const idx: number[] = [];
    for (let i = 0; i < N; i++) { const a = i * 2; idx.push(a, a + 1, a + 3, a, a + 3, a + 2); }
    g.setIndex(idx);
    g.setDrawRange(0, 0);
    this.u = {
      uHeatRamp: { value: HEAT_LINEAR }, uFogColor: rig.shared.uFogColor, uFog: rig.shared.uFog,
      uSteel: { value: new THREE.Color('#8c9298') }, uHeat: { value: 0 }, uAlpha: { value: T.alpha },
    };
    const m = new THREE.ShaderMaterial({ uniforms: this.u, vertexShader: VERT, fragmentShader: FRAG, side: THREE.DoubleSide, depthWrite: false });
    m.name = 'fx:trail';
    this.mesh = new THREE.Mesh(g, m);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 2;
    this.mesh.userData.noCollide = true;
  }

  /** Per render frame, after the weapon has its final pose for the frame. */
  update(dt: number): void {
    this.time += dt;
    const model = this.getModel(), parent = this.mesh.parent;
    const tip = model && marker(model, 'tip'), base = model && marker(model, 'base');
    if (!tip || !base || !parent || dt <= 0) { if (dt > 0) this.age(); return; }
    parent.updateMatrixWorld();
    this.inv.copy(parent.matrixWorld).invert();
    this.b.setFromMatrixPosition(base.matrixWorld).applyMatrix4(this.inv);
    this.t.setFromMatrixPosition(tip.matrixWorld).applyMatrix4(this.inv);
    const speed = this.has ? this.t.distanceTo(this.lastTip) / dt : 0;
    this.lastTip.copy(this.t); this.has = true;
    if (speed >= T.minSpeed && this.active()) this.samples.unshift({ b: this.b.clone(), t: this.t.clone(), time: this.time });
    this.age();
    // heat tint from the blade (setHeat writes it on every mesh of the model)
    let h = 0;
    model.traverse((o) => { const v = o.userData.heat as number | undefined; if (v !== undefined && v > h) h = v; });
    this.u.uHeat.value = h;
    this.write();
  }

  private age(): void {
    while (this.samples.length > N + 1 || (this.samples.length && this.time - this.samples[this.samples.length - 1].time > T.lifeS)) this.samples.pop();
    if (this.samples.length < 2) this.mesh.geometry.setDrawRange(0, 0);
  }

  private write(): void {
    const s = this.samples, n = s.length;
    if (n < 2) { this.mesh.geometry.setDrawRange(0, 0); return; }
    const p = this.posA.array as Float32Array, a = this.ageA.array as Float32Array;
    for (let i = 0; i < n; i++) {
      const age = Math.min(1, (this.time - s[i].time) / T.lifeS), f = i / (n - 1);
      // only the outer part of the blade sweeps a ribbon, and it narrows toward the tip as it ages
      const inner = 0.4 + Math.max(age, f) * 0.45;
      p.set([s[i].b.x + (s[i].t.x - s[i].b.x) * inner, s[i].b.y + (s[i].t.y - s[i].b.y) * inner, s[i].b.z + (s[i].t.z - s[i].b.z) * inner], i * 6);
      p.set([s[i].t.x, s[i].t.y, s[i].t.z], i * 6 + 3);
      a[i * 2] = a[i * 2 + 1] = Math.max(age, f * 0.85);
    }
    this.posA.needsUpdate = this.ageA.needsUpdate = true;
    this.mesh.geometry.setDrawRange(0, (n - 1) * 6);
  }

  clear(): void { this.samples = []; this.has = false; this.mesh.geometry.setDrawRange(0, 0); }
  dispose(): void { this.mesh.removeFromParent(); this.mesh.geometry.dispose(); (this.mesh.material as THREE.Material).dispose(); }
}
