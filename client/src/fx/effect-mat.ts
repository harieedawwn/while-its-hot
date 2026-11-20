import * as THREE from 'three';
import { HEAT_LINEAR } from '../render/heat';
import type { LightRig } from '../render/lights';
import { FX_COMMON } from './glsl';

const VERT = /* glsl */ `
varying vec3 vN;
varying float vDepth;
void main() {
  vN = normalize(mat3(modelMatrix) * normal);
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vDepth = -mv.z;
  gl_Position = projectionMatrix * mv;
}
`;
const FRAG = /* glsl */ `
${FX_COMMON}
uniform vec3 uColor;
uniform float uHeat;
uniform float uAlpha;
uniform float uShade;
varying vec3 vN;
varying float vDepth;
void main() {
  ditherClip(uAlpha);
  vec3 c = uHeat > 0.0 ? heatRamp(uHeat) : uColor;
  // two flat bands of shade from a fixed key: faceted, never smooth
  float k = dot(normalize(vN), normalize(vec3(0.4, 0.8, 0.3)));
  c *= mix(1.0, k > 0.2 ? 1.0 : 0.62, uShade);
  gl_FragColor = vec4(applyFog(c, vDepth), 1.0);
  #include <colorspace_fragment>
}
`;

export interface EffectMat extends THREE.ShaderMaterial {
  uniforms: { uColor: { value: THREE.Color }; uHeat: { value: number }; uAlpha: { value: number }; uShade: { value: number } } & Record<string, THREE.IUniform>;
}

/**
 * The one material of effect meshes (slashes, rocks, holes, anchors): flat color or a heat-ramp step, two
 * shade bands, screen-door alpha in 4 steps, fog. Unlit by the light rig on purpose: effects must read at any light.
 */
export function effectMat(rig: LightRig, color: string, heat = 0, shade = 1): EffectMat {
  const m = new THREE.ShaderMaterial({
    uniforms: {
      uHeatRamp: { value: HEAT_LINEAR }, uFogColor: rig.shared.uFogColor, uFog: rig.shared.uFog,
      uColor: { value: new THREE.Color(color) }, uHeat: { value: heat }, uAlpha: { value: 1 }, uShade: { value: shade },
    },
    vertexShader: VERT, fragmentShader: FRAG, side: THREE.DoubleSide,
  }) as EffectMat;
  m.name = 'fx:effect';
  return m;
}
