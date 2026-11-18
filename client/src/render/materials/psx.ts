import * as THREE from 'three';
import { HEAT_LINEAR } from '../heat';
import type { LightRig } from '../lights';
import { whiteTexture } from '../textures';
import { PSX_FRAG, PSX_VERT } from './psx-glsl';

export interface PsxOpts {
  map?: THREE.Texture | null;
  tint?: THREE.ColorRepresentation;
  /** 0 = fully lit, 1 = shows albedo as-is (window glass, furnace mouth). */
  unlit?: number;
  side?: THREE.Side;
}

/**
 * Vertex-lit PSX material. Every instance shares one program; per-object state (nearest point lights,
 * heat from `object.userData.heat`) is written in onBeforeRender. Geometry needs position, normal, uv;
 * `color` and `heatMask` are optional (default white / 1).
 */
export function psxMaterial(rig: LightRig, o: PsxOpts = {}): THREE.ShaderMaterial {
  const plPos = [0, 1, 2, 3].map(() => new THREE.Vector4(0, -1e4, 0, 0));
  const plCol = [0, 1, 2, 3].map(() => new THREE.Color(0, 0, 0));
  const uniforms = {
    ...rig.shared,
    map: { value: o.map ?? whiteTexture() },
    uTint: { value: new THREE.Color(o.tint ?? '#ffffff') },
    uUnlit: { value: o.unlit ?? 0 },
    uHeat: { value: 0 },
    uHeatRamp: { value: HEAT_LINEAR },
    uPL: { value: plPos },
    uPLc: { value: plCol },
  };
  const m = new THREE.ShaderMaterial({
    uniforms, vertexShader: PSX_VERT, fragmentShader: PSX_FRAG,
    vertexColors: true, side: o.side ?? THREE.FrontSide, fog: false, lights: false,
  });
  // geometry without these attributes reads the constant (three calls vertexAttrib1fv for length-1 arrays)
  (m.defaultAttributeValues as Record<string, number[]>).heatMask = [1];
  const center = new THREE.Vector3();
  m.onBeforeRender = (_r, _s, _c, geometry, object) => {
    if (!geometry.boundingSphere) geometry.computeBoundingSphere();
    const bs = geometry.boundingSphere!;
    center.copy(bs.center).applyMatrix4(object.matrixWorld);
    rig.pick(center, bs.radius * object.matrixWorld.getMaxScaleOnAxis(), plPos, plCol);
    uniforms.uHeat.value = (object.userData.heat as number | undefined) ?? 0;
    m.uniformsNeedUpdate = true;
  };
  return m;
}
