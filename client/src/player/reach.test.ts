import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { CollisionWorld } from '../physics/world';
import { Kinematics } from './kinematics';
import { stepMove } from './motor';
import { createMoveState, NO_INPUT, type MoveInput } from './move-state';

/**
 * Reach checks: the movement course numbers (dev/movement-course.ts) stay beatable, and only with the
 * intended move, when BALANCE.move is retuned. Simple scripted "bots" play each obstacle.
 */
const DT = 1 / 60;
function world(boxes: number[][]): Kinematics {
  return new Kinematics(CollisionWorld.fromMeshes([[60, 1, 60, 0, -0.5, 0], ...boxes].map(([a, b, c, x, y, z]) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(a, b, c));
    m.position.set(x, y, z);
    return m;
  })));
}

describe('course reach', () => {
  it('3 wall jumps in a 2.6 m shaft climb above the 5 m ledge', () => {
    const kin = world([[0.4, 7.5, 6, -1.5, 3.75, 0], [0.4, 7.5, 6, 1.5, 3.75, 0]]);
    const s = createMoveState([-0.85, 0, 0]);
    let top = 0, dir = -1;
    for (let i = 0; i < 300; i++) {
      const touching = s.sinceWall === 0 && !s.grounded && s.vel.y < 6 && Math.sign(-s.wallN.x) === dir;
      stepMove(s, { ...NO_INPUT, mx: dir, jumpPressed: i === 5 || touching }, DT, kin);
      if (s.events.some((e) => e.k === 'jump' && e.kind === 'walljump')) dir = -dir;
      top = Math.max(top, s.pos.y);
    }
    expect(top).toBeGreaterThan(5.2);
  });

  it('the 11 m gap between 1.5 m platforms needs a dash-jump', () => {
    const kin = world([[4, 1.5, 20, 0, 0.75, 10], [4, 1.5, 6, 0, 0.75, -14]]);
    const cross = (mode: 'dashjump' | 'jump' | 'jumpdash') => {
      const s = createMoveState([0, 1.6, 8]);
      let jumpedAt = -1;
      for (let i = 0; i < 400; i++) {
        const inp: MoveInput = { ...NO_INPUT, my: 1 };
        if (mode === 'dashjump') {
          if (s.pos.z < 3.4 && s.dashT <= 0 && jumpedAt < 0 && s.stamina >= 3) inp.dashPressed = true;
          if (s.dashT > 0 && s.pos.z < 0.4) inp.jumpPressed = true;
        } else if (s.pos.z < 0.6 && jumpedAt < 0) inp.jumpPressed = true;
        if (mode === 'jumpdash' && jumpedAt >= 0 && i - jumpedAt === 12) inp.dashPressed = true;
        stepMove(s, inp, DT, kin);
        if (jumpedAt < 0 && s.events.some((e) => e.k === 'jump')) jumpedAt = i;
        if (jumpedAt >= 0 && s.events.some((e) => e.k === 'land')) return s.pos.y > 1.4 && s.pos.z < -11;
      }
      return false;
    };
    expect(cross('dashjump')).toBe(true);
    expect(cross('jump')).toBe(false);
    expect(cross('jumpdash')).toBe(false);
  });

  it('a slam bounce clears the 3 m ledge, a plain jump does not', () => {
    const kin = world([]);
    const s = createMoveState([0, 0, 0]);
    let top = 0, plain = 0;
    for (let i = 0; i < 200; i++) {
      stepMove(s, { ...NO_INPUT, jumpPressed: i === 2 || (s.sinceSlam < 0.05 && s.grounded), slidePressed: i === 30, slideHeld: i >= 30 && i < 40 }, DT, kin);
      if (i < 30) plain = Math.max(plain, s.pos.y);
      else if (i > 40) top = Math.max(top, s.pos.y);
    }
    expect(plain).toBeLessThan(3);
    expect(top).toBeGreaterThan(3.3);
  });
});
