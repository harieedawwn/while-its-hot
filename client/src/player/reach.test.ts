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

  it('the 5.6 m gap between 1.5 m platforms needs a slide-jump', () => {
    const kin = world([[4, 1.5, 20, 0, 0.75, 10], [4, 1.5, 6, 0, 0.75, -8.6]]);
    const cross = (mode: 'slidejump' | 'jump') => {
      const s = createMoveState([0, 1.6, 8]);
      let jumpedAt = -1;
      for (let i = 0; i < 400; i++) {
        const inp: MoveInput = { ...NO_INPUT, my: 1 };
        if (mode === 'slidejump') {
          if (s.pos.z < 3.2 && jumpedAt < 0) { inp.slideHeld = true; inp.slidePressed = true; }
          if (s.sliding && s.pos.z < 0.4) inp.jumpPressed = true;
        } else if (s.pos.z < 0.6 && jumpedAt < 0) inp.jumpPressed = true;
        stepMove(s, inp, DT, kin);
        if (jumpedAt < 0 && s.events.some((e) => e.k === 'jump')) jumpedAt = i;
        if (jumpedAt >= 0 && s.events.some((e) => e.k === 'land')) return s.pos.y > 1.4 && s.pos.z < -5.8;
      }
      return false;
    };
    expect(cross('slidejump')).toBe(true);
    expect(cross('jump')).toBe(false);
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

  it('a running body steps up a 0.3 m curb head-on and a stair flight (0.25 m risers), but not a 0.4 m wall', () => {
    const run = (boxes: number[][], z0 = 3) => {
      const s = createMoveState([0, 0, z0]);
      const kin = world(boxes);
      let top = 0;
      for (let i = 0; i < 150; i++) { stepMove(s, { ...NO_INPUT, my: 1 }, DT, kin); top = Math.max(top, s.pos.y); }
      return top;
    };
    expect(run([[6, 0.3, 4, 0, 0.15, -2]])).toBeGreaterThan(0.29);
    expect(run([[6, 0.4, 4, 0, 0.2, -2]])).toBeLessThan(0.05);
    const stairs = Array.from({ length: 12 }, (_, i) => [3, (i + 1) * 0.25, 0.45, 0, ((i + 1) * 0.25) / 2, -0.45 * (i + 0.5)]);
    expect(run(stairs)).toBeGreaterThan(2.9);
  });
});
