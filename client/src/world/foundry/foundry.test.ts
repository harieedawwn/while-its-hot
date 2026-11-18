import * as THREE from 'three';
import { beforeAll, describe, expect, it } from 'vitest';
import { FOUNDRY, SPAWN_POINTS } from '@wih/shared';
import { CollisionWorld } from '../../physics/world';
import { Kinematics } from '../../player/kinematics';
import { stepMove } from '../../player/motor';
import { createMoveState, NO_INPUT, type MoveInput } from '../../player/move-state';
import { SURFACES, type MaterialLib, type SurfaceName } from '../../render/materials/library';
import { bakeAO } from '../../render/geo/ao';
import { RegionBatch } from '../region-batch';
import { buildCatwalks } from './catwalks';
import { PAL, type Ctx } from './ctx';
import { buildCrane } from './crane';
import { buildFloor } from './floor';
import { buildFurnace } from './furnace';
import { buildLandmarks } from './landmarks';
import { buildShell } from './shell';

/** The arena's collision as the player will meet it (no GL: untextured stand-in materials). */
const mats = new Map<string, THREE.Material>();
const lib = {
  get(n: SurfaceName) {
    let m = mats.get(n);
    if (!m) { m = new THREE.MeshBasicMaterial(); m.name = n; m.userData = { tile: SURFACES[n].tile, foot: SURFACES[n].foot }; mats.set(n, m); }
    return m;
  },
} as unknown as MaterialLib;

let world: CollisionWorld, kin: Kinematics, statics: THREE.Mesh[];
beforeAll(() => {
  const c: Ctx = { lib, seed: 1, b: new RegionBatch(FOUNDRY.half, 20), pal: PAL };
  buildFloor(c); buildShell(c); buildFurnace(c); buildCatwalks(c); buildCrane(c); buildLandmarks(c);
  statics = c.b.build();
  world = CollisionWorld.fromMeshes(statics);
  kin = new Kinematics(world);
});

/** Walk (forward = −Z at yaw 0 unless set) for `sec`, return the end state plus the highest y reached. */
function walk(from: [number, number, number], yaw: number, sec: number, extra: Partial<MoveInput> = {}) {
  const s = createMoveState(from);
  let top = from[1];
  for (let i = 0; i < sec * 60; i++) { stepMove(s, { ...NO_INPUT, my: 1, yaw, ...extra }, 1 / 60, kin); top = Math.max(top, s.pos.y); }
  return Object.assign(s, { top });
}
const down = (x: number, z: number, from = 3) => world.raycast(new THREE.Vector3(x, from, z), new THREE.Vector3(0, -1, 0), 30);

describe('foundry collision', () => {
  it('bakes vertex AO for the whole arena in a few seconds', () => {
    const t0 = performance.now();
    bakeAO(statics.filter((m) => m.material !== lib.get('glow')), { rays: 6, dist: 2.2, strength: 0.7 });
    const ms = performance.now() - t0;
    expect(ms).toBeLessThan(8000);
  });
  it('stays inside the budget of light regions and surface kinds', () => {
    expect(statics.length).toBeLessThan(80);
    expect(mats.size).toBeLessThanOrEqual(10);
  });
  it('tags footsteps per surface', () => {
    expect(world.footAt(down(26, -5)!)).toBe('metal');   // ember floor
    expect(world.footAt(down(13, 1)!)).toBe('grate');     // bridge deck
    expect(world.footAt(down(4.5, 4.5)!)).toBe('stone');  // dais steps
    expect(world.footAt(down(FOUNDRY.heap.c[0], FOUNDRY.heap.c[1])!)).toBe('gravel');
  });
  it('every cage spawn stands on the cage floor and can walk out into the arena', () => {
    for (const sp of SPAWN_POINTS) {
      const s = walk([sp.pos[0], 0.3, sp.pos[2]], sp.yaw, 1.5);
      expect(Math.abs(s.pos.y)).toBeLessThan(0.05);
      expect(Math.max(Math.abs(s.pos.x), Math.abs(s.pos.z))).toBeLessThan(FOUNDRY.half - 1);
    }
  });
  it('bridges carry you over the channel, open channel drops you in', () => {
    const over = walk([13, 0, -7], Math.PI, 2);
    expect(over.pos.z).toBeGreaterThan(4);
    expect(Math.abs(over.pos.y)).toBeLessThan(0.05);
    expect(walk([17.5, 0, -7], Math.PI, 2).pos.y).toBeLessThan(-1);
  });
  it('stairs, dais steps and the upper flights are walkable', () => {
    const e = walk([25.8, 0, -15], 0, 6);                    // floor → ring catwalk (east flight)
    expect(e.top).toBeGreaterThan(4.8);
    const w = walk([-25.8, 0, 15], Math.PI, 6);              // west flight, mirrored
    expect(w.top).toBeGreaterThan(4.8);
    expect(walk([27.6, 5, 4], Math.PI, 5).top).toBeGreaterThan(10.8); // ring → crane runway (east)
    expect(walk([-27.6, 5, -4], 0, 5).top).toBeGreaterThan(10.8);    // (west)
    const d = walk([4.5, 0, 12], 0, 3);                      // dais corner steps
    expect(d.top).toBeGreaterThan(0.85);
  });
  it('a 2.6 m wall-jump shaft climbs above the catwalk deck', () => {
    for (const [sx, sz] of FOUNDRY.shafts) {
      const s = createMoveState([sx, 0, sz]);
      let top = 0, dir = -1;
      for (let i = 0; i < 300; i++) {
        const touching = s.sinceWall === 0 && !s.grounded && s.vel.y < 6 && Math.sign(-s.wallN.x) === dir;
        stepMove(s, { ...NO_INPUT, mx: dir, jumpPressed: i === 5 || touching }, 1 / 60, kin);
        if (s.events.some((e) => e.k === 'jump' && e.kind === 'walljump')) dir = -dir;
        top = Math.max(top, s.pos.y);
      }
      expect(top, `shaft ${sx},${sz}`).toBeGreaterThan(FOUNDRY.midY + 0.2);
    }
  });
});
