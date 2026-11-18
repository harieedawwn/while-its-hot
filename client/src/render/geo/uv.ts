import * as THREE from 'three';

/**
 * World-space box projection UVs: each vertex picks the plane its normal faces most, so textures keep
 * one texel density everywhere and continue across merged pieces. `tile` = meters per texture repeat.
 * Works best on geometry with hard normals per face (boxes, planes, flat-shaded props).
 */
export function boxUV(g: THREE.BufferGeometry, tile: number, offset: [number, number] = [0, 0]): THREE.BufferGeometry {
  const p = g.getAttribute('position'), n = g.getAttribute('normal');
  const uv = new Float32Array(p.count * 2), k = 1 / tile;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
    let u: number, v: number;
    if (ay >= ax && ay >= az) { u = x; v = z; } else if (ax >= az) { u = z * Math.sign(n.getX(i) || 1); v = y; } else { u = -x * Math.sign(n.getZ(i) || 1); v = y; }
    uv[i * 2] = u * k + offset[0];
    uv[i * 2 + 1] = v * k + offset[1];
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return g;
}
