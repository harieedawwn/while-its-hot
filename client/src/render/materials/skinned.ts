import * as THREE from 'three';
import { BONE_COUNT } from '../../player/character/skeleton';

/** GPU skinning switch: on by default; `?skin=cpu` keeps the old CPU path (A/B perf and pose checks). Set once at boot, before any character exists. */
export const skinning = { gpu: true };

/** Defines every skinned program shares (bone matrices come from `object.userData.bones`, set per draw in onBeforeRender). */
export const SKIN_DEFINES = { SKINNED: 1, BONES: BONE_COUNT } as const;
export const identityBones = (): THREE.Matrix4[] => Array.from({ length: BONE_COUNT }, () => new THREE.Matrix4());
/** Single bone index per vertex, as a float attribute (the vertex shader rounds it). */
export const BONE_ATTR = 'boneIdx';

const cache = new WeakMap<THREE.ShaderMaterial, THREE.ShaderMaterial>();
/**
 * The skinned twin of a PSX material: same shaders + `SKINNED`, uniform objects shared with the base (so LightRig, map, tint and
 * per-object light/heat picks keep working), plus `uBones` taken from the drawn object's `userData.bones` (root-relative matrices).
 */
export function skinnedOf(base: THREE.ShaderMaterial): THREE.ShaderMaterial {
  let v = cache.get(base);
  if (v) return v;
  const uniforms = { ...base.uniforms, uBones: { value: identityBones() } };
  v = new THREE.ShaderMaterial({
    uniforms, vertexShader: base.vertexShader, fragmentShader: base.fragmentShader, defines: { ...base.defines, ...SKIN_DEFINES },
    vertexColors: base.vertexColors, side: base.side, fog: false, lights: false,
  });
  Object.assign(v.defaultAttributeValues, base.defaultAttributeValues, { [BONE_ATTR]: [0] });
  const twin = v;
  twin.onBeforeRender = (r, s, c, g, o, grp) => {
    base.onBeforeRender(r, s, c, g, o, grp);
    uniforms.uBones.value = (o.userData.bones as THREE.Matrix4[] | undefined) ?? uniforms.uBones.value;
    twin.uniformsNeedUpdate = true;
  };
  cache.set(base, twin);
  return twin;
}
