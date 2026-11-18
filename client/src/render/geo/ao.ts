import * as THREE from 'three';
import { MeshBVH } from 'three-mesh-bvh';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export interface AOOpts {
  /** rays per vertex */ rays?: number;
  /** meters; hits farther than this do not darken */ dist?: number;
  /** 0..1 max darkening */ strength?: number;
  /** extra occluders that are not darkened themselves (e.g. a dynamic prop standing on the floor) */
  occluders?: THREE.Mesh[];
}

/**
 * Baked vertex AO (LOOK §1.7): for each vertex, cosine-weighted rays into the hemisphere around its normal
 * against one BVH of all static geometry; closer hits darken more. Multiplies the `color` attribute.
 * Vertices sharing position+normal share the result. Run once at load (≈ 0.2–0.5 s for a room).
 */
export function bakeAO(meshes: THREE.Mesh[], o: AOOpts = {}): void {
  const rays = o.rays ?? 12, dist = o.dist ?? 1.4, strength = o.strength ?? 0.8;
  const all = [...meshes, ...(o.occluders ?? [])].map((m) => {
    m.updateMatrixWorld(true);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', m.geometry.getAttribute('position').clone());
    if (m.geometry.index) g.setIndex(m.geometry.index.clone());
    g.applyMatrix4(m.matrixWorld);
    return g;
  });
  const merged = mergeGeometries(all, false);
  if (!merged) return;
  const bvh = new MeshBVH(merged);

  // fixed cosine-weighted directions in tangent space (golden-angle spiral), twisted per vertex
  const dirs: THREE.Vector3[] = [];
  for (let i = 0; i < rays; i++) {
    const r = Math.sqrt((i + 0.5) / rays), a = i * 2.399963;
    dirs.push(new THREE.Vector3(r * Math.cos(a), Math.sqrt(1 - r * r), r * Math.sin(a)));
  }
  const ray = new THREE.Ray(), t = new THREE.Vector3(), b = new THREE.Vector3(), n = new THREE.Vector3(), p = new THREE.Vector3();
  const nm = new THREE.Matrix3();
  const cache = new Map<string, number>();

  for (const mesh of meshes) {
    const pos = mesh.geometry.getAttribute('position'), nor = mesh.geometry.getAttribute('normal');
    const col = mesh.geometry.getAttribute('color') as THREE.BufferAttribute;
    nm.getNormalMatrix(mesh.matrixWorld);
    for (let i = 0; i < pos.count; i++) {
      p.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld);
      n.fromBufferAttribute(nor, i).applyMatrix3(nm).normalize();
      const key = `${p.x.toFixed(3)},${p.y.toFixed(3)},${p.z.toFixed(3)},${n.x.toFixed(1)},${n.y.toFixed(1)},${n.z.toFixed(1)}`;
      let occ = cache.get(key);
      if (occ === undefined) {
        // tangent basis with a per-vertex twist so neighbours sample different directions
        t.set(Math.abs(n.y) < 0.9 ? 0 : 1, Math.abs(n.y) < 0.9 ? 1 : 0, 0).cross(n).normalize();
        b.crossVectors(n, t);
        const tw = (Math.sin(p.x * 12.9898 + p.y * 78.233 + p.z * 37.719) * 43758.5453) % 1 * Math.PI * 2;
        const cs = Math.cos(tw), sn = Math.sin(tw);
        let sum = 0;
        for (const d of dirs) {
          const dx = d.x * cs - d.z * sn, dz = d.x * sn + d.z * cs;
          ray.direction.set(0, 0, 0).addScaledVector(t, dx).addScaledVector(n, d.y).addScaledVector(b, dz).normalize();
          ray.origin.copy(p).addScaledVector(n, 0.015);
          const hit = bvh.raycastFirst(ray, THREE.DoubleSide, 0, dist);
          if (hit) sum += 1 - hit.distance / dist;
        }
        occ = sum / rays;
        cache.set(key, occ);
      }
      const k = 1 - strength * Math.min(1, occ * 1.6);
      col.setXYZ(i, col.getX(i) * k, col.getY(i) * k, col.getZ(i) * k);
    }
    col.needsUpdate = true;
  }
  merged.dispose();
  all.forEach((g) => g.dispose());
}
