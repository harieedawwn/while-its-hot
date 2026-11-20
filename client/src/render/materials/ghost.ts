import * as THREE from 'three';
import { FX_COMMON } from '../../fx/glsl';
import { BONE_ATTR, identityBones, SKIN_DEFINES, skinning } from './skinned';

/**
 * The Hồn (ghost) body (ROUND3 §2): a pale flat-shaded silhouette drawn through the Bayer screen door at ~40 % (never blended,
 * no glow). One shared material for every ghost; the character swaps its meshes onto it and back.
 * With GPU skinning (default) the program skins in the vertex shader from the drawn object's `userData.bones`.
 */
let shared: THREE.ShaderMaterial | null = null, veil: THREE.ShaderMaterial | null = null;
export function ghostMaterial(alpha = 0.4): THREE.ShaderMaterial { return (shared ??= makeMat(alpha)); }
/** The invisible (dao_bong…) body: the same Bayer door at ~12 %, a sliver you can still catch moving. */
export function veilMaterial(alpha: number): THREE.ShaderMaterial { return (veil ??= makeMat(alpha)); }
function makeMat(alpha: number): THREE.ShaderMaterial {
  const gpu = skinning.gpu;
  const uniforms: Record<string, THREE.IUniform> = { uAlpha: { value: alpha }, uHeatRamp: { value: [] }, uFogColor: { value: new THREE.Color() }, uFog: { value: new THREE.Vector2(1, 2) } };
  if (gpu) uniforms.uBones = { value: identityBones() };
  const m = new THREE.ShaderMaterial({
    uniforms, defines: gpu ? { ...SKIN_DEFINES } : {},
    vertexShader: /* glsl */ `
      #ifdef SKINNED
      attribute float ${BONE_ATTR};
      uniform mat4 uBones[BONES];
      #endif
      varying vec3 vP;
      void main() {
        vec3 lp = position;
        #ifdef SKINNED
        lp = (uBones[int(${BONE_ATTR} + 0.5)] * vec4(position, 1.0)).xyz;
        #endif
        vec4 mv = modelViewMatrix * vec4(lp, 1.0); vP = mv.xyz; gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `${FX_COMMON.replace('uniform vec3 uHeatRamp[9];', '').replace(/vec3 heatRamp[^\n]*\n/, '')}
      uniform float uAlpha;
      varying vec3 vP;
      void main() {
        ditherClip(uAlpha);
        vec3 n = normalize(cross(dFdx(vP), dFdy(vP)));
        float l = 0.22 + 0.78 * clamp(dot(n, normalize(vec3(0.35, 0.75, 0.55))) * 0.5 + 0.5, 0.0, 1.0);
        l = floor(l * 5.0 + 0.5) / 5.0;
        gl_FragColor = vec4(vec3(0.52, 0.58, 0.64) * l, 1.0);
        #include <colorspace_fragment>
      }`,
  });
  if (gpu) {
    (m.defaultAttributeValues as Record<string, number[]>)[BONE_ATTR] = [0];
    m.onBeforeRender = (_r, _s, _c, _g, o) => { m.uniforms.uBones.value = (o.userData.bones as THREE.Matrix4[] | undefined) ?? m.uniforms.uBones.value; m.uniformsNeedUpdate = true; };
  }
  return m;
}
