import * as THREE from 'three';

/**
 * Free the GPU geometry of everything under `root` (meshes, instanced meshes, points, lines). Materials and
 * textures are NOT touched: they come from the shared `MaterialLib` / texture cache. Call it for any subtree that
 * was detached from the scene before the scene's own dispose ran (held weapons, pickups, remotes, viewmodels).
 */
export function disposeTree(root: THREE.Object3D): void {
  root.traverse((o) => {
    const g = (o as THREE.Mesh).geometry as THREE.BufferGeometry | undefined;
    if (g?.isBufferGeometry) g.dispose();
    if ((o as THREE.InstancedMesh).isInstancedMesh) (o as THREE.InstancedMesh).dispose();
  });
}
