import * as THREE from 'three';
import { HEAT_LINEAR } from './heat';

/**
 * The one fullscreen pass (LOOK §1.4): reads the low-res linear target, encodes to sRGB, 4×4 ordered
 * dither, quantizes per channel, then the transition hooks (desaturate, fade to color) and the fire-ring heat tint. Nothing else.
 * Dither + quantize run in display (sRGB) space so dark foundry tones keep their steps.
 */
const VERT = /* glsl */ `
varying vec2 vUv;
void main() { vUv = position.xy * 0.5 + 0.5; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;
const FRAG = /* glsl */ `
uniform sampler2D tScene;
uniform float uLevels;   // 0 = no quantize
uniform float uDither;   // amplitude in quantize steps
uniform float uDesat;    // 0..1 transition/death hook
uniform vec3 uFadeColor; // sRGB
uniform float uFade;     // 0..1
uniform float uHeatTint; // 0..1: inside the fire ring the world leans toward the heat ramp
uniform vec3 uHeatRamp[9];
varying vec2 vUv;

float bayer4(vec2 p) {
  ivec2 q = ivec2(mod(p, 4.0));
  int i = q.x + q.y * 4;
  // 4×4 Bayer matrix, row-major, values 0..15
  int m[16] = int[16](0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5);
  return (float(m[i]) + 0.5) / 16.0;
}
vec3 toSRGB(vec3 c) {
  c = clamp(c, 0.0, 1.0);
  return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
}
void main() {
  vec3 c = texture2D(tScene, vUv).rgb;
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  c = mix(c, vec3(l), uDesat);
  if (uHeatTint > 0.0) c = mix(c, uHeatRamp[int(clamp(sqrt(l) * 9.0, 0.0, 8.0))], uHeatTint);
  c = toSRGB(c);
  if (uLevels > 1.0) {
    float s = uLevels - 1.0;
    float d = (bayer4(gl_FragCoord.xy) - 0.5) * uDither;
    c = floor(c * s + 0.5 + d) / s;
  }
  c = mix(c, uFadeColor, uFade);
  gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
}
`;

export class PostPass {
  readonly uniforms = {
    tScene: { value: null as THREE.Texture | null },
    uLevels: { value: 32 },
    uDither: { value: 1 },
    uDesat: { value: 0 },
    uFadeColor: { value: new THREE.Color(0, 0, 0) },
    uFade: { value: 0 },
    uHeatTint: { value: 0 },
    uHeatRamp: { value: HEAT_LINEAR },
  };
  private scene = new THREE.Scene();
  private camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private mesh: THREE.Mesh;

  constructor() {
    // one oversized triangle covers the screen (no diagonal seam, fewer verts than a quad)
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
    const m = new THREE.ShaderMaterial({ uniforms: this.uniforms, vertexShader: VERT, fragmentShader: FRAG, depthTest: false, depthWrite: false });
    this.mesh = new THREE.Mesh(g, m);
    this.mesh.frustumCulled = false;
    this.scene.add(this.mesh);
  }
  render(renderer: THREE.WebGLRenderer, input: THREE.Texture): void {
    this.uniforms.tScene.value = input;
    renderer.setRenderTarget(null);
    renderer.render(this.scene, this.camera);
  }
  dispose(): void { this.mesh.geometry.dispose(); (this.mesh.material as THREE.Material).dispose(); }
}
