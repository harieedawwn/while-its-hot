import * as THREE from 'three';
import { FOUNDRY, heapHeight, rackSlots } from '@wih/shared';
import * as P from '../../render/geo/procgeo';
import { crate, quenchTub } from '../../render/models/props';
import { cyl, flat, slab } from '../../render/models/kit';
import { box, type Ctx } from './ctx';

/** Local-frame box for yawed props: (ox,oz) offset from (cx,cz) in the prop's own axes. */
function lbox(c: Ctx, mat: THREE.Material, cx: number, cz: number, yaw: number, ox: number, oy: number, oz: number, sx: number, sy: number, sz: number, color: string): void {
  const s = Math.sin(yaw), co = Math.cos(yaw);
  c.b.add(slab(sx, sy, sz, 2), mat, { pos: [cx + ox * co + oz * s, oy, cz - ox * s + oz * co], rot: [0, yaw, 0], color });
}

/** Cooling tanks (east, cold steel), the slag heap (west, uneven ground), weapon racks, loose props. */
export function buildLandmarks(c: Ctx): void {
  tanks(c); heap(c); racks(c); scatter(c);
}

function tanks(c: Ctx): void {
  const { lib, pal } = c, steel = lib.get('steel'), rust = lib.get('rust'), concrete = lib.get('concrete');
  const { r, h, at } = FOUNDRY.tanks;
  for (const [x, z] of at) {
    const body = flat(P.bake([
      P.part(cyl(r, r, h, 14), '#ffffff', { pos: [0, h / 2, 0], shade: 0.1 }),
      P.part(P.shell(r * 0.999, Math.PI / 2, 14), '#d8e0e8', { pos: [0, h, 0], scale: [1, 0.35, 1], shade: 0.1 }),
    ], { shade: 0 }));
    c.b.add(body, steel, { pos: [x, 0, z], color: pal.steelCold });
    c.b.add(cyl(r + 0.4, r + 0.5, 0.5, 14), concrete, { pos: [x, 0.25, z], color: '#a89888' });
    for (const y of [1.8, 4.8, 7.8]) c.b.add(flat(cyl(r + 0.08, r + 0.08, 0.3, 14)), rust, { pos: [x, y, z], color: pal.rustDark });
    // ladder on the arena-facing side + cage hoop
    for (const s of [-0.3, 0.3]) box(c, rust, [x - r - 0.18, 0, z + s - 0.03], [x - r - 0.02, h + 0.2, z + s + 0.03], pal.rust, 3);
    for (let y = 0.4; y < h; y += 0.4) box(c, rust, [x - r - 0.16, y, z - 0.3], [x - r - 0.04, y + 0.04, z + 0.3], pal.rust, 1);
    // a vertical pipe up the back to the manifold
    c.b.add(cyl(0.22, 0.22, 8.4, 6), rust, { pos: [x + r - 0.1, 4.7, z + 0.9], color: pal.rustDark });
  }
  // manifold along the top, running into the east wall
  const zs = at.map((p) => p[1]), zMin = Math.min(...zs), zMax = Math.max(...zs), x = at[0][0];
  box(c, rust, [x + r - 0.5, 8.7, zMin - 0.3], [x + r + 0.1, 9.3, zMax + 0.3], pal.rustDark, 3);
  box(c, rust, [x + r - 0.5, 8.7, zMax - 0.3], [FOUNDRY.half, 9.3, zMax + 0.3], pal.rustDark, 3);
  const tub = quenchTub(c);
  tub.position.set(x - 5.2, 0, (zMin + zMax) / 2 - 2); c.b.addObject(tub);
}

function heap(c: Ctx): void {
  const slag = c.lib.get('slag'), { c: [hx, hz], r } = FOUNDRY.heap, N = 1.0;
  const x0 = Math.floor(hx - r), z0 = Math.floor(hz - r), n = Math.ceil(r * 2) + 1;
  const pos: number[] = [], col: number[] = [], idx: number[] = [], rnd = P.rng(11);
  for (let j = 0; j <= n; j++) for (let i = 0; i <= n; i++) {
    const x = x0 + i * N, z = z0 + j * N, y = heapHeight(x, z), k = 0.8 + 0.25 * rnd() + (y > 0.2 ? 0.1 : -0.1);
    pos.push(x, y - 0.02, z); col.push(k, k * 0.94, k * 0.9);
  }
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const a = j * (n + 1) + i, b = a + 1, d = a + n + 1, e = d + 1;
    if (Math.max(pos[a * 3 + 1], pos[b * 3 + 1], pos[d * 3 + 1], pos[e * 3 + 1]) < 0.01) continue;
    idx.push(a, d, b, b, d, e);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  c.b.add(g, slag, { at: [hx, hz] });
  // a few big dark clinker lumps on top
  for (let i = 0; i < 7; i++) {
    const x = hx + (rnd() - 0.5) * r * 1.3, z = hz + (rnd() - 0.5) * r * 1.3;
    if (Math.hypot(x - hx, z - hz) > r * 0.8) continue;
    c.b.add(P.blob(0.5 + rnd() * 0.5, { detail: 1, amp: 0.35, freq: 2, seed: i + 3, squash: [1, 0.7, 1] }), c.lib.get('coal'), { pos: [x, heapHeight(x, z) + 0.05, z], rot: [0, rnd() * 3, 0], color: '#c8c0bc' });
  }
}

function racks(c: Ctx): void {
  const { lib, pal } = c, steel = lib.get('steel'), rust = lib.get('rust'), wood = lib.get('wood'), paint = lib.get('paint');
  FOUNDRY.racks.forEach((rk, i) => {
    const [x, z] = rk.pos, w = FOUNDRY.rack.w, yaw = rk.yaw;
    // base plate with ochre edge, two uprights, three cradles per slot, a top rail
    lbox(c, rust, x, z, yaw, 0, 0.08, 0, w + 0.5, 0.16, 1.1, pal.rustDark);
    lbox(c, paint, x, z, yaw, 0, 0.165, 0.5, w + 0.5, 0.012, 0.1, pal.ochre);
    for (const s of [-1, 1]) lbox(c, steel, x, z, yaw, s * (w / 2 + 0.05), 0.85, -0.3, 0.12, 1.4, 0.12, pal.steelCold);
    lbox(c, steel, x, z, yaw, 0, 1.5, -0.3, w + 0.25, 0.1, 0.1, pal.steelCold);
    lbox(c, wood, x, z, yaw, 0, 0.5, -0.38, w, 0.7, 0.06, '#8a7058');
    rackSlots(i).forEach(([sx, sz]) => {
      const lx = (sx - x) * Math.cos(yaw) - (sz - z) * Math.sin(yaw);
      for (const d of [-0.28, 0.28]) lbox(c, steel, x, z, yaw, lx + d, 0.32, 0.0, 0.06, 0.28, 0.5, pal.steelColdDark);
      lbox(c, rust, x, z, yaw, lx, 0.17, 0.0, 0.8, 0.02, 0.5, pal.rust);
    });
  });
}

/** Crates, a tub and slag drifts so the corners read as a worked place. */
function scatter(c: Ctx): void {
  const rnd = P.rng(5), slag = c.lib.get('slag');
  const put = (o: THREE.Object3D, x: number, y: number, z: number, yaw: number) => { o.position.set(x, y, z); o.rotation.y = yaw; c.b.addObject(o); };
  put(crate(c, 0.9), 25.5, 0, -24.5, 0.3); put(crate(c, 0.7), 25.8, 0.9, -24.4, -0.2);
  put(crate(c, 0.9), -25.5, 0, 24.5, 0.1); put(crate(c, 0.7), -25.4, 0.9, 24.6, 0.4);
  for (const [x, z, r] of [[-26, -26, 1.3], [26, 3.6, 1.0], [-26, -3.6, 1.1], [20, 26.5, 1.2], [-20, -26.5, 1.2]] as [number, number, number][])
    c.b.add(P.blob(r, { detail: 2, amp: 0.25, freq: 1.6, seed: Math.floor(rnd() * 99), squash: [1, 0.2, 0.8], flatBottom: 0 }), slag, { pos: [x, 0, z], color: '#a09088' });
}
