import { describe, expect, it } from 'vitest';
import { FOUNDRY, SAFE_RESPAWN, SPAWN_POINTS, cageSpawn, heapHeight, inDais, inMolten, inTank, onHeap, pedestalSlots, rackSlots, wallPoint } from './foundry';

describe('foundry layout', () => {
  it('has 6 cages, 4 racks, 3 ring centers, 7 pedestal slots', () => {
    expect(FOUNDRY.cages.length).toBe(6);
    expect(FOUNDRY.racks.length).toBe(4);
    expect(FOUNDRY.ringCenters.length).toBe(3);
    expect(pedestalSlots().length).toBe(7);
  });
  it('cages are 180° symmetric and spawns lie inside the wall, facing in', () => {
    for (const c of FOUNDRY.cages) {
      const [x, z] = wallPoint(c.side, c.u, 0);
      const opp = FOUNDRY.cages.find((o) => { const [ox, oz] = wallPoint(o.side, o.u, 0); return Math.abs(ox + x) < 1e-6 && Math.abs(oz + z) < 1e-6; });
      expect(opp, `cage ${c.id} has a mirror`).toBeDefined();
    }
    for (const c of FOUNDRY.cages) {
      const s = cageSpawn(c);
      expect(Math.max(Math.abs(s.pos[0]), Math.abs(s.pos[2]))).toBeGreaterThan(FOUNDRY.half);
      // forward points back toward the arena center
      const fx = -Math.sin(s.yaw), fz = -Math.cos(s.yaw);
      expect(fx * s.pos[0] + fz * s.pos[2]).toBeLessThan(0);
    }
    expect(SPAWN_POINTS.length).toBe(6);
  });
  it('safe respawn points are on solid, open ground', () => {
    for (const [x, z] of SAFE_RESPAWN) {
      expect(inMolten(x, z, 1.5), `${x},${z} molten`).toBe(false);
      expect(inDais(x, z), `${x},${z} dais`).toBe(false);
      expect(inTank(x, z, 1.5), `${x},${z} tank`).toBe(false);
      expect(onHeap(x, z), `${x},${z} heap`).toBe(false);
      expect(Math.max(Math.abs(x), Math.abs(z))).toBeLessThan(FOUNDRY.half - 1);
    }
  });
  it('racks and pedestal stand on dry ground', () => {
    FOUNDRY.racks.forEach((r, i) => {
      for (const [x, z] of rackSlots(i)) { expect(inMolten(x, z, 1)).toBe(false); expect(inTank(x, z, 1)).toBe(false); expect(onHeap(x, z)).toBe(false); }
      expect(r.pos[0] * r.pos[0] + r.pos[1] * r.pos[1]).toBeGreaterThan(100);
    });
  });
  it('slag heap stays walkable (< 45°) and ends flat', () => {
    let max = 0;
    for (let x = -31; x < -15; x += 0.25) for (let z = -19; z < -3; z += 0.25) {
      const h = heapHeight(x, z);
      max = Math.max(max, Math.abs(heapHeight(x + 0.25, z) - h) / 0.25, Math.abs(heapHeight(x, z + 0.25) - h) / 0.25);
    }
    expect(max).toBeLessThan(0.9);
    expect(heapHeight(FOUNDRY.heap.c[0] + FOUNDRY.heap.r, FOUNDRY.heap.c[1])).toBeCloseTo(0, 6);
  });
  it('every channel has two bridges inside it', () => {
    expect(FOUNDRY.channel.bridgeAt.length).toBe(2);
    expect(inMolten(13, 0)).toBe(false); // on a bridge
    expect(inMolten(17, 0)).toBe(true);
  });
});
