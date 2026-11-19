import * as THREE from 'three';
import { FEEL } from '../../core/feel';
import type { LightRig } from '../../render/lights';
import { FLAME_FRAMES, flameAtlas } from './flame-atlas';

const R = FEEL.fx.ring, FPS = 8, MAX_CARDS = 256;

const VERT = /* glsl */ `
attribute float aOff;
uniform float uFrame;
varying vec2 vUv;
varying float vDepth;
void main() {
  float f = mod(uFrame + aOff, ${FLAME_FRAMES}.0);
  vUv = vec2((f + uv.x) / ${FLAME_FRAMES}.0, uv.y);
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vDepth = -mv.z;
  gl_Position = projectionMatrix * mv;
}
`;
const FRAG = /* glsl */ `
uniform sampler2D map;
uniform vec3 uFogColor;
uniform vec2 uFog;
varying vec2 vUv;
varying float vDepth;
void main() {
  vec4 t = texture2D(map, vUv);
  if (t.a < 0.5) discard;
  float f = clamp((vDepth - uFog.x) / max(uFog.y - uFog.x, 1e-3), 0.0, 1.0);
  gl_FragColor = vec4(mix(t.rgb, uFogColor, f * 0.5), 1.0);
  #include <colorspace_fragment>
}
`;

/**
 * Fire ring (LOOK §7): a wall of low-res flame cards (4-frame atlas, 8 fps, stepped) standing on a circle,
 * two staggered rows, each card on its own frame offset. Unlit, alpha-cut, one draw call. Embers and the
 * world tint inside the wall come from the fx layer (it reads `center`/`radius`).
 */
export class FireRing {
  readonly mesh: THREE.Mesh;
  cx = 0; cz = 0; radius = 0;
  private u: Record<string, THREE.IUniform>;

  constructor(rig: LightRig) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(MAX_CARDS * 4 * 3), 3));
    g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(MAX_CARDS * 4 * 2), 2));
    g.setAttribute('aOff', new THREE.BufferAttribute(new Float32Array(MAX_CARDS * 4), 1));
    const idx: number[] = [];
    for (let i = 0; i < MAX_CARDS; i++) { const a = i * 4; idx.push(a, a + 1, a + 2, a, a + 2, a + 3); }
    g.setIndex(idx);
    g.setDrawRange(0, 0);
    this.u = { map: { value: flameAtlas() }, uFrame: { value: 0 }, uFogColor: rig.shared.uFogColor, uFog: rig.shared.uFog };
    const m = new THREE.ShaderMaterial({ uniforms: this.u, vertexShader: VERT, fragmentShader: FRAG, side: THREE.DoubleSide });
    m.name = 'fire_ring';
    this.mesh = new THREE.Mesh(g, m);
    this.mesh.frustumCulled = false;
    this.mesh.visible = false;
    this.mesh.userData.noCollide = true;
  }

  /** radius <= 0 hides the ring. */
  set(cx: number, cz: number, radius: number): void {
    this.cx = cx; this.cz = cz; this.radius = radius;
    this.mesh.visible = radius > 0;
    if (radius > 0) this.build();
  }

  update(time: number): void { this.u.uFrame.value = Math.floor(time * FPS) % FLAME_FRAMES; }

  private build(): void {
    const g = this.mesh.geometry, pos = g.getAttribute('position') as THREE.BufferAttribute;
    const uv = g.getAttribute('uv') as THREE.BufferAttribute, off = g.getAttribute('aOff') as THREE.BufferAttribute;
    const hash = (a: number) => { const s = Math.sin(a * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
    let k = 0;
    for (let row = 0; row < R.rows && k < MAX_CARDS; row++) {
      const rr = this.radius - row * 0.35, n = Math.min(Math.floor((MAX_CARDS - k)), Math.ceil((Math.PI * 2 * rr) / (R.cardW * 0.62)));
      for (let i = 0; i < n; i++, k++) {
        const a = ((i + row * 0.5) / n) * Math.PI * 2, rnd = hash(k * 3.1 + row);
        const w = R.cardW * (0.85 + rnd * 0.3) / 2, h = R.cardH * (row === 0 ? 0.8 + rnd * 0.45 : 0.55 + rnd * 0.3);
        const ox = Math.cos(a), oz = Math.sin(a), tx = -oz, tz = ox, bx = this.cx + ox * rr, bz = this.cz + oz * rr;
        // cards toe in a little so the wall has depth from any side
        const tw = 0.25 * (rnd - 0.5);
        const cx = tx + ox * tw, cz = tz + oz * tw;
        const v = k * 4;
        pos.setXYZ(v, bx - cx * w, -0.05, bz - cz * w); pos.setXYZ(v + 1, bx + cx * w, -0.05, bz + cz * w);
        pos.setXYZ(v + 2, bx + cx * w, h, bz + cz * w); pos.setXYZ(v + 3, bx - cx * w, h, bz - cz * w);
        uv.setXY(v, 0, 0); uv.setXY(v + 1, 1, 0); uv.setXY(v + 2, 1, 1); uv.setXY(v + 3, 0, 1);
        const o = Math.floor(rnd * FLAME_FRAMES);
        for (let j = 0; j < 4; j++) off.setX(v + j, o);
      }
    }
    pos.needsUpdate = uv.needsUpdate = off.needsUpdate = true;
    g.setDrawRange(0, k * 6);
  }
  dispose(): void { this.mesh.geometry.dispose(); (this.mesh.material as THREE.Material).dispose(); (this.u.map.value as THREE.Texture).dispose(); }
}
