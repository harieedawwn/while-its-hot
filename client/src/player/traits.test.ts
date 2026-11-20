import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { BALANCE, traitsOf, weaponById } from '@wih/shared';
import { CollisionWorld } from '../physics/world';
import { Kinematics } from './kinematics';
import { stepMove } from './motor';
import { createMoveState, NO_INPUT, type MoveInput, type MoveState } from './move-state';

/** Family traits while held (ROUND3 §4): dao runs faster, jumps twice, slides longer with a shorter cooldown. */
const DT = 1 / 60, M = BALANCE.move;
const floor = new THREE.Mesh(new THREE.BoxGeometry(80, 1, 80)); floor.position.y = -0.5;
const kin = new Kinematics(CollisionWorld.fromMeshes([floor]));
const run = (s: MoveState, secs: number, f: (i: number) => Partial<MoveInput>) => {
  for (let i = 0; i < Math.round(secs / DT); i++) stepMove(s, { ...NO_INPUT, ...f(i) }, DT, kin);
  return s;
};
const make = (w: string) => { const s = createMoveState([0, 0.5, 0]); s.traits = traitsOf(weaponById(w)); return run(s, 0.5, () => ({})); };

describe('family movement traits', () => {
  it('run speed follows the family multiplier', () => {
    for (const [w, k] of [['kiem_tho', 1], ['bua_ren', 0.92], ['dao_gam', 1.3], ['gang_sat', 1.12]] as const) {
      const s = run(make(w), 0.6, () => ({ my: 1 }));
      expect(Math.hypot(s.vel.x, s.vel.z), w).toBeCloseTo(M.runSpeed * k, 3);
    }
  });
  it('dao gets one extra jump in the air, the sword none', () => {
    const peak = (w: string) => {
      const s = make(w); let top = 0;
      run(s, 1.2, (i) => { top = Math.max(top, s.pos.y); return { jumpPressed: i === 0 || i === 20 }; });
      return top;
    };
    expect(peak('dao_gam')).toBeGreaterThan(peak('kiem_tho') + 0.8);
  });
  it('dao slides 30% longer and can slide again sooner', () => {
    const slide = (w: string) => {
      const s = make(w); let t = 0;
      run(s, 2, () => { if (s.sliding) t += DT; return { my: 1, slideHeld: true }; });
      return t;
    };
    expect(slide('dao_gam') / slide('kiem_tho')).toBeCloseTo(1.3, 1);
    expect(M.slide.cooldownS * traitsOf(weaponById('dao_gam')).slide.cd).toBeCloseTo(0.21);
  });
});
