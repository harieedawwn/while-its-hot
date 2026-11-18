/**
 * Arena 1 — Xưởng Đúc (GDD §11) as pure data: the client builds geometry from it, the server will read
 * spawn / rack / ring points from it. Units meters, +Y up, x east, z south (the furnace is north = −z).
 * Yaw convention: forward = (−sin yaw, 0, −cos yaw), so yaw 0 faces north.
 */
export type V2 = readonly [number, number];
export interface Rect { x0: number; x1: number; z0: number; z1: number }
export type Side = 'N' | 'E' | 'S' | 'W';

const HALF = 30;
const ARM_W = 2.5;
const ARM_FROM = 7;

export const FOUNDRY = {
  id: 'foundry',
  half: HALF,
  wallH: 16,
  roofY: 17,
  /** Molten channels: four arms from the dais to the outer wall, 2 bridges each. */
  channel: { halfW: ARM_W, from: ARM_FROM, bedY: -1.4, surfaceY: -0.85, bridgeAt: [13, 22], bridgeW: 3.2 },
  /** Raised dais: concentric tiers, top at tiers[last]. */
  dais: { halves: [7, 6.5, 6] as readonly number[], heights: [0.3, 0.6, 0.9] as readonly number[] },
  pedestal: { pos: [0, 0] as V2, base: 1.3, top: 1.5, slotRadius: 0.95, slots: 7 },
  /** Mid catwalks (y), the crane runway layer (y). */
  midY: 5,
  upperY: 11,
  /** Cage alcoves cut into the 7 m thick outer wall. `wall` = point on the wall face, `yaw` = facing into the arena. */
  cages: [
    { id: 0, side: 'N', u: -18 }, { id: 1, side: 'N', u: 18 },
    { id: 2, side: 'E', u: -10 }, { id: 3, side: 'S', u: -18 },
    { id: 4, side: 'S', u: 18 }, { id: 5, side: 'W', u: -10 },
  ] as readonly { id: number; side: Side; u: number }[],
  cage: { w: 4, depth: 3.5, h: 4.2 },
  wallT: 7,
  furnace: { u: 0, w: 14, h: 9.5, depth: 5.5 },
  /** Weapon racks (side racks, GDD §3). yaw = rotation.y of the rack model; its front is local +Z, facing the arena center. */
  racks: [
    { id: 0, pos: [-9, -20] as V2, yaw: 0 },
    { id: 1, pos: [9, 20] as V2, yaw: Math.PI },
    { id: 2, pos: [21, -16] as V2, yaw: -Math.PI / 2 },
    { id: 3, pos: [-21, 16] as V2, yaw: Math.PI / 2 },
  ],
  rack: { w: 2.4, slots: 2 },
  /** Fire ring centers; one is picked per round (GDD §3). */
  ringCenters: [[0, 0], [-9, 7], [9, -7]] as readonly V2[],
  /** Landmarks. */
  tanks: { r: 3, h: 9, at: [[23.5, 10], [23.5, 17.5], [23.5, 25]] as readonly V2[] },
  heap: { c: [-23, -11] as V2, r: 7.2, h: 2.6 },
  crane: { z: 20, y: 11.4, x: 6 },
  /** Wall-jump shafts: pillar pairs beside the cross catwalks (2.6 m gap, like the movement course). */
  shafts: [[12.7, 16], [-12.7, 16], [12.7, -16], [-12.7, -16]] as readonly V2[],
  shaftGap: 2.6,
  crossX: 9,
} as const;

export type CageDef = (typeof FOUNDRY.cages)[number];

/** World (x,z) for a wall-local (u along the wall, d outward from the arena face). */
export function wallPoint(side: Side, u: number, d: number): V2 {
  const o = HALF + d;
  switch (side) { case 'N': return [u, -o]; case 'S': return [-u, o]; case 'E': return [o, u]; default: return [-o, -u]; }
}
/** Yaw that looks from the wall into the arena. */
export function wallYaw(side: Side): number {
  switch (side) { case 'N': return Math.PI; case 'S': return 0; case 'E': return Math.PI / 2; default: return -Math.PI / 2; }
}

export function channelRects(): Rect[] {
  const w = ARM_W, a = ARM_FROM, h = HALF + FOUNDRY.wallT;
  return [
    { x0: a, x1: h, z0: -w, z1: w }, { x0: -h, x1: -a, z0: -w, z1: w },
    { x0: -w, x1: w, z0: -h, z1: -a }, { x0: -w, x1: w, z0: a, z1: h },
  ];
}
export function bridgeRects(): Rect[] {
  const { halfW, bridgeAt, bridgeW } = FOUNDRY.channel, k = bridgeW / 2, out: Rect[] = [];
  for (const d of bridgeAt) {
    out.push({ x0: d - k, x1: d + k, z0: -halfW - 0.3, z1: halfW + 0.3 }, { x0: -d - k, x1: -d + k, z0: -halfW - 0.3, z1: halfW + 0.3 });
    out.push({ x0: -halfW - 0.3, x1: halfW + 0.3, z0: d - k, z1: d + k }, { x0: -halfW - 0.3, x1: halfW + 0.3, z0: -d - k, z1: -d + k });
  }
  return out;
}
const inRect = (r: Rect, x: number, z: number, m = 0) => x > r.x0 - m && x < r.x1 + m && z > r.z0 - m && z < r.z1 + m;
/** Inside a molten channel (and not on a bridge deck). */
export function inMolten(x: number, z: number, m = 0): boolean {
  return channelRects().some((r) => inRect(r, x, z, m)) && !bridgeRects().some((r) => inRect(r, x, z));
}
export function inDais(x: number, z: number, m = 0): boolean { const h = FOUNDRY.dais.halves[0] + m; return Math.abs(x) < h && Math.abs(z) < h; }

/** Slag heap ground height (west). Smooth bump with a ridge pattern; slopes stay below 45° (tested). */
export function heapHeight(x: number, z: number): number {
  const { c, r, h } = FOUNDRY.heap;
  const d = Math.hypot(x - c[0], z - c[1]) / r;
  if (d >= 1) return 0;
  const body = h * Math.pow(1 - d * d, 1.4);
  const lump = 0.2 * Math.sin(x * 0.9 + 0.6) * Math.sin(z * 0.8 - 0.3) + 0.08 * Math.sin(x * 1.9 + z * 1.5);
  return Math.max(0, body + lump * Math.min(1, body * 1.5));
}
export function onHeap(x: number, z: number): boolean { return Math.hypot(x - FOUNDRY.heap.c[0], z - FOUNDRY.heap.c[1]) < FOUNDRY.heap.r; }
export function inTank(x: number, z: number, m = 0): boolean {
  return FOUNDRY.tanks.at.some((p) => Math.hypot(x - p[0], z - p[1]) < FOUNDRY.tanks.r + m);
}

/** Where a cage's player stands (its spawn) and which way it faces. */
export function cageSpawn(c: CageDef): { pos: [number, number, number]; yaw: number } {
  const [x, z] = wallPoint(c.side, c.u, FOUNDRY.cage.depth / 2);
  return { pos: [x, 0, z], yaw: wallYaw(c.side) };
}
export const SPAWN_POINTS = FOUNDRY.cages.map(cageSpawn);

/** Blank slots on the pedestal top: one center + a ring (one per player + 1 = 7 for 6 players). */
export function pedestalSlots(): V2[] {
  const { pos, slotRadius, slots } = FOUNDRY.pedestal;
  const out: V2[] = [[pos[0], pos[1]]];
  for (let i = 0; i < slots - 1; i++) { const a = (i / (slots - 1)) * Math.PI * 2; out.push([pos[0] + Math.cos(a) * slotRadius, pos[1] + Math.sin(a) * slotRadius]); }
  return out;
}
/** Rack blank slots: along the rack front, `rack.slots` of them. */
export function rackSlots(i: number): V2[] {
  const r = FOUNDRY.racks[i], { w, slots } = FOUNDRY.rack, c = Math.cos(r.yaw), s = Math.sin(r.yaw);
  const out: V2[] = [];
  for (let k = 0; k < slots; k++) { const u = ((k + 0.5) / slots - 0.5) * (w * 0.7); out.push([r.pos[0] + c * u, r.pos[1] - s * u]); }
  return out;
}

/** Safe respawn points on open ground near the edge (GDD §3.5): not molten, tank, heap or dais. */
export const SAFE_RESPAWN: readonly V2[] = [
  [-26, -26], [-17, -26], [-8, -26], [8, -26], [17, -26], [26, -26],
  [26, -17], [26, -5.5], [26, 5.5], [-26, 26],
  [-26, 5.5], [-17, 26], [-8, 26], [8, 26], [17, 26],
];
