import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { BONE_ATTR, skinning } from '../../render/materials/skinned';
import { psxMaterial } from '../../render/materials/psx';
import { LightRig } from '../../render/lights';
import { buildBody } from './body';
import { BONE_COUNT, newPose, Skeleton } from './skeleton';

/** Vertex-shader formula (psx-glsl.ts SKINNED block) in JS: p = B[boneIdx] * rest. */
function shaderPose(geo: THREE.BufferGeometry, rel: THREE.Matrix4[]): Float32Array {
  const p = geo.getAttribute('position'), b = geo.getAttribute(BONE_ATTR), out = new Float32Array(p.count * 3), v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i).applyMatrix4(rel[Math.round(b.getX(i))]); out.set([v.x, v.y, v.z], i * 3); }
  return out;
}
function poseBones(): THREE.Matrix4[] {
  const sk = new Skeleton(), pose = newPose();
  for (let i = 0; i < pose.length; i++) pose[i] = Math.sin(i * 1.7) * 0.5;
  sk.apply(pose);
  return sk.rel;
}

describe('GPU skinning', () => {
  const mat = psxMaterial(new LightRig());
  it('keeps the rest pose + a bone index per vertex and hands the bones to the draw', () => {
    skinning.gpu = true;
    const sm = buildBody().build(mat), rel = poseBones();
    sm.update(rel);
    expect(sm.mesh.userData.bones).toBe(rel);
    const b = sm.geo.getAttribute(BONE_ATTR);
    expect(b.count).toBe(sm.geo.getAttribute('position').count);
    for (let i = 0; i < b.count; i++) { expect(b.getX(i)).toBeGreaterThanOrEqual(0); expect(b.getX(i)).toBeLessThan(BONE_COUNT); }
    expect((sm.mesh.material as THREE.ShaderMaterial).defines.SKINNED).toBe(1);
    expect(sm.mesh.material).not.toBe(mat);
  });
  it('the shader formula reproduces the CPU pose (positions)', () => {
    skinning.gpu = true;
    const g = buildBody().build(mat), rel = poseBones();
    const rest = shaderPose(g.geo, rel);
    skinning.gpu = false;
    const c = buildBody().build(mat); c.update(rel);
    const cpu = c.geo.getAttribute('position').array as Float32Array;
    expect(cpu.length).toBe(rest.length);
    let worst = 0;
    for (let i = 0; i < cpu.length; i++) worst = Math.max(worst, Math.abs(cpu[i] - rest[i]));
    expect(worst).toBeLessThan(1e-4);
    skinning.gpu = true;
  });
});
