import { FOUNDRY } from '@wih/shared';
import { box, tiled, type Ctx } from './ctx';

/** Rectangle deck at height y (top surface), with stringers and cross girders underneath. */
export function deck(c: Ctx, x0: number, z0: number, x1: number, z1: number, y: number, cold = true): void {
  const { lib, pal } = c, grate = lib.get('grate'), steel = lib.get('steel');
  const col = cold ? pal.steelColdDark : pal.rust;
  tiled(c, grate, [x0, y - 0.1, z0], [x1, y, z1], '#d4dce4', 10, 1);
  const alongX = x1 - x0 > z1 - z0;
  if (alongX) {
    for (const z of [z0 + 0.12, z1 - 0.12]) box(c, steel, [x0, y - 0.55, z - 0.1], [x1, y - 0.1, z + 0.1], col, 4);
    for (let x = x0 + 2; x < x1; x += 4) box(c, steel, [x - 0.08, y - 0.5, z0], [x + 0.08, y - 0.1, z1], col, 4);
  } else {
    for (const x of [x0 + 0.12, x1 - 0.12]) box(c, steel, [x - 0.1, y - 0.55, z0], [x + 0.1, y - 0.1, z1], col, 4);
    for (let z = z0 + 2; z < z1; z += 4) box(c, steel, [x0, y - 0.5, z - 0.08], [x1, y - 0.1, z + 0.08], col, 4);
  }
}

/** Handrail along a straight edge (posts every 2 m, top + mid rail). `gaps` = [from,to] runs without rail. */
export function rail(c: Ctx, ax: number, az: number, bx: number, bz: number, y: number, gaps: [number, number][] = []): void {
  const { lib, pal } = c, steel = lib.get('steel');
  const len = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.round(len / 2));
  const dx = (bx - ax) / len, dz = (bz - az) / len;
  const ok = (t: number) => !gaps.some(([g0, g1]) => t > g0 && t < g1);
  let start = -1;
  const flush = (end: number) => {
    if (start < 0) return;
    const sx = ax + dx * start, sz = az + dz * start, ex = ax + dx * end, ez = az + dz * end;
    for (const h of [0.52, 1.02]) box(c, steel, [Math.min(sx, ex) - 0.03, y + h, Math.min(sz, ez) - 0.03], [Math.max(sx, ex) + 0.03, y + h + 0.05, Math.max(sz, ez) + 0.03], pal.steelCold, 4);
    start = -1;
  };
  for (let i = 0; i <= n; i++) {
    const t = (len * i) / n;
    if (ok(t)) {
      const px = ax + dx * t, pz = az + dz * t;
      box(c, steel, [px - 0.04, y, pz - 0.04], [px + 0.04, y + 1.05, pz + 0.04], pal.steelCold, 2);
      if (start < 0) start = t;
    } else flush(t - len / n);
  }
  flush(len);
}

/** Stair flight: x/z extent, rising from (y0 at `from`) to (y1 at the far end) along `dir`. */
export function stairs(c: Ctx, x0: number, z0: number, x1: number, z1: number, dir: '+x' | '-x' | '+z' | '-z', y0: number, y1: number, rise = 0.25): void {
  const { lib, pal } = c, steel = lib.get('steel'), conc = lib.get('concrete');
  const n = Math.round((y1 - y0) / rise), horiz = dir.endsWith('x'), len = horiz ? x1 - x0 : z1 - z0, run = len / n, sign = dir[0] === '+' ? 1 : -1;
  for (let i = 0; i < n; i++) {
    const a = sign > 0 ? i * run : len - (i + 1) * run, b = a + run;
    const top = y0 + (i + 1) * rise;
    // solid tread block down to just under the previous tread: reads as a stepped slab, collides cleanly
    if (horiz) box(c, i % 2 ? steel : conc, [x0 + a, Math.max(-0.3, top - 0.7), z0], [x0 + b, top, z1], pal.steelCold, 2);
    else box(c, i % 2 ? steel : conc, [x0, Math.max(-0.3, top - 0.7), z0 + a], [x1, top, z0 + b], pal.steelCold, 2);
  }
}

/** Mid-level catwalks, rails, supports, the two flights to the ring, the shafts, the crane runways. */
export function buildCatwalks(c: Ctx): void {
  const { lib, pal } = c, rust = lib.get('rust');
  const Y = FOUNDRY.midY, U = FOUNDRY.upperY, w = FOUNDRY.half, cx = FOUNDRY.crossX;

  // ring catwalks (3 m) on all four walls; the north one is split by the furnace
  deck(c, w - 3, -w, w, w, Y);             // E
  deck(c, -w, -w, -w + 3, w, Y);           // W
  deck(c, -w + 3, w - 3, w - 3, w, Y);     // S
  deck(c, -w + 3, -w, -8, -w + 3, Y);      // N left
  deck(c, 8, -w, w - 3, -w + 3, Y);        // N right
  // inner-edge rails, with gaps where flights land
  rail(c, w - 3, -w, w - 3, w, Y, [[2, 13], [35, 45]]);
  rail(c, -w + 3, -w, -w + 3, w, Y, [[14, 26], [47, 58]]);
  rail(c, -w + 3, w - 3, w - 3, w - 3, Y);
  rail(c, -w + 3, -w + 3, -8, -w + 3, Y);
  rail(c, 8, -w + 3, w - 3, -w + 3, Y);
  rail(c, -8, -w, -8, -w + 3, Y); rail(c, 8, -w, 8, -w + 3, Y);

  // cross catwalks over the E/W channels (2.4 m)
  for (const s of [-1, 1]) {
    deck(c, s * cx - 1.2, -w + 3, s * cx + 1.2, w - 3, Y);
    rail(c, s * cx - 1.2, -w + 3, s * cx - 1.2, w - 3, Y);
    rail(c, s * cx + 1.2, -w + 3, s * cx + 1.2, w - 3, Y);
  }

  // support columns (rust) under the rings and cross catwalks, clear of cages, arms and flights
  const col = (x: number, z: number) => box(c, rust, [x - 0.4, -0.2, z - 0.4], [x + 0.4, Y - 0.55, z + 0.4], pal.rust, 4);
  for (const z of [-24, -17, 17, 24]) { col(w - 3.4, z); col(-w + 3.4, z); }
  for (const x of [-24, -12, 12, 24]) col(x, w - 3.4);
  for (const x of [-24, -12, 12, 24].filter((x) => Math.abs(x) > 8)) col(x, -w + 3.4);
  for (const s of [-1, 1]) for (const z of [-20, -12, 12, 20]) col(s * cx, z);

  // floor → ring flights, one per side (E north end, W south end); mirrored through the center
  stairs(c, w - 5.4, -w + 3, w - 3, -w + 12, '-z', 0, Y);
  stairs(c, -w + 3, w - 12, -w + 5.4, w - 3, '+z', 0, Y);
  // wall-jump shafts: a short pillar flush with the catwalk, a tall one 2.6 m away
  for (const [sx, sz] of FOUNDRY.shafts) {
    const s = Math.sign(sx), g = FOUNDRY.shaftGap / 2;
    const a0 = sx - s * g, a1 = a0 - s * 1.2, b0 = sx + s * g, b1 = b0 + s * 1.2;
    box(c, rust, [Math.min(a0, a1), -0.2, sz - 1.5], [Math.max(a0, a1), Y, sz + 1.5], pal.rust, 2);
    box(c, rust, [Math.min(b0, b1), -0.2, sz - 1.5], [Math.max(b0, b1), U, sz + 1.5], pal.rustDark, 2);
    // perch on top of the tall pillar (north ones are free-standing, south ones join the crane bridge)
    const px = s * (Math.abs(b1) + 3.5), z0 = sz < 0 ? sz - 2.5 : sz - 1.5, z1 = sz < 0 ? sz + 2.5 : FOUNDRY.crane.z + 0.8;
    deck(c, Math.min(b0, px), z0, Math.max(b0, px), z1, U, false);
    rail(c, px, z0, px, z1, U);
  }
}
