import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { applyAO, bakeAO, computeAO } from './ao';

/** A floor and a wall meeting at a corner: vertices in the corner must come out darker than the open ones. */
function corner(): THREE.Mesh[] {
  const mk = (w: number, h: number, rot: THREE.Euler, pos: THREE.Vector3Tuple) => {
    const g = new THREE.PlaneGeometry(w, h);
    g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(g.getAttribute('position').count * 3).fill(1), 3));
    const m = new THREE.Mesh(g);
    m.rotation.copy(rot); m.position.set(...pos); m.updateMatrixWorld(true);
    return m;
  };
  return [mk(4, 4, new THREE.Euler(-Math.PI / 2, 0, 0), [0, 0, 0]), mk(4, 4, new THREE.Euler(0, 0, 0), [0, 2, -2])];
}

describe('bakeAO', () => {
  it('computeAO + applyAO equals bakeAO and darkens the inner corner', () => {
    const a = corner(), b = corner();
    const k = computeAO(a, { rays: 8, dist: 2, strength: 0.8 });
    applyAO(a, k);
    bakeAO(b, { rays: 8, dist: 2, strength: 0.8 });
    for (let i = 0; i < a.length; i++) {
      expect(Array.from(a[i].geometry.getAttribute('color').array)).toEqual(Array.from(b[i].geometry.getAttribute('color').array));
    }
    expect(k.length).toBe(8);
    expect(Math.min(...k)).toBeLessThan(0.95); // corner vertices
    expect(Math.max(...k)).toBeLessThanOrEqual(1);
  });
});
