import * as THREE from 'three';

/**
 * Chamfered box in 44 triangles (a rounded box is 108–300): 6 inset face quads, 12 edge strips, 8 corner
 * triangles. Face vertices are shared with the strips, so edges shade softly. No uv (procgeo parts drop them).
 * `c` = chamfer size. The trailing arg is ignored (call-compatible with procgeo's rounded()).
 */
export function cbox(w: number, h: number, d: number, c = 0.03, _seg?: number): THREE.BufferGeometry {
  const cc = Math.min(c, w / 2 - 1e-4, h / 2 - 1e-4, d / 2 - 1e-4);
  const half = [w / 2 - cc, h / 2 - cc, d / 2 - cc];
  const pos: number[] = [], idx: number[] = [];
  const vid = new Map<string, number>();
  // vertex of the corner (sx,sy,sz) pushed out along axis a (sign s)
  const v = (sx: number, sy: number, sz: number, a: number, s: number): number => {
    const key = `${sx}${sy}${sz}${a}${s}`;
    let i = vid.get(key);
    if (i === undefined) {
      const p = [sx * half[0], sy * half[1], sz * half[2]];
      p[a] += s * cc;
      i = pos.length / 3; pos.push(p[0], p[1], p[2]); vid.set(key, i);
    }
    return i;
  };
  const sg = [-1, 1];
  const quad = (a: number, b: number, c2: number, d2: number, flip: boolean) => (flip ? idx.push(a, c2, b, a, d2, c2) : idx.push(a, b, c2, a, c2, d2));
  // faces: axis a, sign s; the other two axes u,w
  for (let a = 0; a < 3; a++) for (const s of sg) {
    const u = (a + 1) % 3, w2 = (a + 2) % 3;
    const at = (su: number, sw: number) => { const q = [0, 0, 0]; q[a] = s; q[u] = su; q[w2] = sw; return v(q[0], q[1], q[2], a, s); };
    quad(at(-1, -1), at(1, -1), at(1, 1), at(-1, 1), s < 0);
  }
  // edge strips: axes a<b, signs sa,sb; the free axis f runs along the edge
  for (let a = 0; a < 3; a++) for (let b = a + 1; b < 3; b++) for (const sa of sg) for (const sb of sg) {
    const f = 3 - a - b;
    const corner = (sf: number) => { const q = [0, 0, 0]; q[a] = sa; q[b] = sb; q[f] = sf; return q; };
    const c0 = corner(-1), c1 = corner(1);
    const A0 = v(c0[0], c0[1], c0[2], a, sa), A1 = v(c1[0], c1[1], c1[2], a, sa);
    const B0 = v(c0[0], c0[1], c0[2], b, sb), B1 = v(c1[0], c1[1], c1[2], b, sb);
    // pick the winding whose normal points along the edge's outward direction (sa·ea + sb·eb)
    const P = (i: number) => new THREE.Vector3(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]);
    const nrm = P(A1).sub(P(A0)).cross(P(B1).sub(P(A0)));
    const out = [0, 0, 0]; out[a] = sa; out[b] = sb;
    const flip = nrm.dot(new THREE.Vector3(out[0], out[1], out[2])) < 0;
    quad(A0, A1, B1, B0, flip);
  }
  // corner triangles
  for (const sx of sg) for (const sy of sg) for (const sz of sg) {
    const X = v(sx, sy, sz, 0, sx), Y = v(sx, sy, sz, 1, sy), Z = v(sx, sy, sz, 2, sz);
    if (sx * sy * sz > 0) idx.push(X, Y, Z); else idx.push(X, Z, Y);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}
