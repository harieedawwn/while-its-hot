import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { BALANCE } from '@wih/shared';
import { CollisionWorld } from '../physics/world';
import { Kinematics } from './kinematics';
import { stepMove } from './motor';
import { createMoveState, NO_INPUT, type MoveInput, type MoveState } from './move-state';

const M = BALANCE.move;
const DT = 1 / 60;
type Box = [w: number, h: number, d: number, x: number, y: number, z: number, rotX?: number];

/** Floor 60×60 at y=0 plus boxes (sizes, center, optional pitch). */
function world(boxes: Box[] = []): Kinematics {
  const meshes = [[60, 1, 60, 0, -0.5, 0] as Box, ...boxes].map(([w, h, d, x, y, z, rx]) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d));
    m.position.set(x, y, z);
    if (rx) m.rotation.x = rx;
    return m;
  });
  return new Kinematics(CollisionWorld.fromMeshes(meshes));
}
const input = (o: Partial<MoveInput> = {}): MoveInput => ({ ...NO_INPUT, ...o });
function run(s: MoveState, kin: Kinematics, secs: number, inp: Partial<MoveInput> | ((t: number) => Partial<MoveInput>) = {}): MoveState {
  const n = Math.round(secs / DT);
  for (let i = 0; i < n; i++) stepMove(s, input(typeof inp === 'function' ? inp(i * DT) : inp), DT, kin);
  return s;
}
const hspeed = (s: MoveState) => Math.hypot(s.vel.x, s.vel.z);
const settled = (kin: Kinematics, pos: THREE.Vector3Tuple = [0, 0.5, 0]) => run(createMoveState(pos), kin, 0.5);

describe('movement integrator', () => {
  it('falls, lands and stays grounded on the floor', () => {
    const s = settled(world());
    expect(s.grounded).toBe(true);
    expect(s.pos.y).toBeCloseTo(0, 2);
  });

  it('reaches run speed in ~0.12 s and never exceeds it', () => {
    const kin = world(), s = settled(kin);
    run(s, kin, 0.12, { my: 1 });
    expect(hspeed(s)).toBeGreaterThan(8.9);
    run(s, kin, 0.5, { my: 1 });
    expect(hspeed(s)).toBeCloseTo(M.runSpeed, 3);
    expect(s.vel.z).toBeLessThan(0); // yaw 0 runs toward −Z
  });

  it('jump apex is v²/2g', () => {
    const kin = world(), s = settled(kin);
    let top = 0;
    run(s, kin, 1.2, (t) => { top = Math.max(top, s.pos.y); return { jumpPressed: t === 0 }; });
    expect(top).toBeCloseTo((M.jumpVel ** 2) / (2 * M.gravity), 1);
    expect(s.grounded).toBe(true);
  });

  it('coyote time: a jump just after running off a ledge still works, a late one does not', () => {
    const ledge = (late: number) => {
      const kin = world([[4, 2, 4, 0, 1, 0]]);
      const s = run(createMoveState([0, 2.2, 1.5]), kin, 0.3);
      let left = -1, jumped = false;
      for (let i = 0; i < 90; i++) {
        const t = i * DT;
        if (left < 0 && !s.grounded) left = t;
        stepMove(s, input({ my: -1, jumpPressed: left >= 0 && Math.abs(t - left - late) < DT / 2 }), DT, kin);
        if (s.events.some((e) => e.k === 'jump' && e.kind === 'jump')) jumped = true;
      }
      return jumped;
    };
    expect(ledge(0.05)).toBe(true);
    expect(ledge(0.15)).toBe(false); // past coyote, and the buffer runs out before touchdown
  });

  it('jump buffer: pressing just before landing jumps on touchdown', () => {
    const kin = world(), s = createMoveState([0, 0.15, 0]);
    let jumps = 0;
    for (let i = 0; i < 40; i++) {
      stepMove(s, input({ jumpPressed: i === 0 }), DT, kin);
      jumps += s.events.filter((e) => e.k === 'jump').length;
    }
    expect(jumps).toBe(1);
    const late = createMoveState([0, 1.2, 0]); // ~0.28 s of fall: the press expires
    let n = 0;
    for (let i = 0; i < 40; i++) { stepMove(late, input({ jumpPressed: i === 0 }), DT, kin); n += late.events.filter((e) => e.k === 'jump').length; }
    expect(n).toBe(0);
  });

  it('stamina regens one pip per regenS, not while sliding', () => {
    const kin = world(), s = settled(kin);
    s.stamina = 0;
    run(s, kin, M.stamina.regenS);
    expect(s.stamina).toBeCloseTo(1, 1);
    run(s, kin, 0.5, { slideHeld: true, my: 1 });
    expect(s.sliding).toBe(true);
    expect(s.stamina).toBeCloseTo(1, 1);
  });

  it('slide starts at 14 m/s, eases to run speed over maxS, lowers the hitbox; slide-jump keeps speed', () => {
    const kin = world(), s = settled(kin);
    run(s, kin, 0.3, { my: 1 });
    stepMove(s, input({ my: 1, slideHeld: true, slidePressed: true }), DT, kin);
    expect(s.sliding && s.low).toBe(true);
    expect(hspeed(s)).toBeCloseTo(M.slide.speed, 0);
    run(s, kin, M.slide.maxS * 0.5, { my: 1, slideHeld: true });
    expect(hspeed(s)).toBeLessThan(M.slide.speed - 1);
    stepMove(s, input({ my: 1, slideHeld: true, jumpPressed: true }), DT, kin);
    expect(s.events.some((e) => e.k === 'jump' && e.kind === 'slidejump')).toBe(true);
    run(s, kin, 0.2, { my: 1, slideHeld: true });
    expect(hspeed(s)).toBeGreaterThan(M.slide.endSpeed - 0.5);
  });

  it('a slide ends by itself after maxS even with the button held, then waits the cooldown', () => {
    const kin = world(), s = settled(kin);
    run(s, kin, 0.3, { my: 1 });
    stepMove(s, input({ my: 1, slideHeld: true, slidePressed: true }), DT, kin);
    run(s, kin, M.slide.maxS + 0.1, { my: 1, slideHeld: true });
    expect(s.sliding).toBe(false);
    expect(s.low).toBe(false);
    expect(hspeed(s)).toBeCloseTo(M.slide.endSpeed, 0);
    s.pos.set(0, 0.1, 0);
    run(s, kin, 1, { my: 1, slideHeld: true });
    expect(s.sliding).toBe(false); // held through: needs a release first
    s.pos.set(0, 0.1, 0);
    run(s, kin, 0.05, { my: 1 });
    stepMove(s, input({ my: 1, slideHeld: true, slidePressed: true }), DT, kin);
    expect(s.sliding).toBe(true);
    run(s, kin, M.slide.maxS + 0.1, { my: 1, slideHeld: true });
    expect(s.sliding).toBe(false);
    run(s, kin, 0.1, { my: 1 });
    stepMove(s, input({ my: 1, slideHeld: true, slidePressed: true }), DT, kin);
    expect(s.sliding).toBe(false); // inside the cooldown
    run(s, kin, M.slide.cooldownS, { my: 1 });
    stepMove(s, input({ my: 1, slideHeld: true, slidePressed: true }), DT, kin);
    expect(s.sliding).toBe(true);
  });

  it('slam: 40 m/s down, landing event, bounce jump ×1.5 inside the window', () => {
    const kin = world(), s = settled(kin);
    stepMove(s, input({ jumpPressed: true }), DT, kin);
    run(s, kin, 0.2);
    stepMove(s, input({ slidePressed: true, slideHeld: true }), DT, kin);
    expect(s.slamming).toBe(true);
    expect(s.vel.y).toBe(-M.slam.speed);
    let landed = false;
    for (let i = 0; i < 30 && !landed; i++) { stepMove(s, input(), DT, kin); landed = s.events.some((e) => e.k === 'slam'); }
    expect(landed).toBe(true);
    stepMove(s, input({ jumpPressed: true }), DT, kin);
    expect(s.events.some((e) => e.k === 'jump' && e.kind === 'bounce')).toBe(true);
    expect(s.vel.y).toBeCloseTo(M.jumpVel * M.slam.bounceMul - M.gravity * DT, 3); // after this tick's gravity
  });

  it('wall jumps: at most 3 before landing; cling caps the fall at 3 m/s', () => {
    const kin = world([[0.4, 12, 8, -1, 6, 0]]); // wall face at x = −0.8
    const s = settled(kin, [-0.4, 0.5, 0]);
    stepMove(s, input({ jumpPressed: true }), DT, kin);
    let walljumps = 0;
    for (let i = 0; i < 240; i++) {
      // steer back into the wall, jump whenever touching it
      stepMove(s, input({ mx: -1, jumpPressed: s.sinceWall === 0 && i % 10 === 0 }), DT, kin);
      walljumps += s.events.filter((e) => e.k === 'jump' && e.kind === 'walljump').length;
      if (s.grounded) break;
    }
    expect(walljumps).toBe(M.wall.jumps);
    const c = run(createMoveState([-0.4, 6, 0]), kin, 0.8, { mx: -1 });
    expect(c.clinging).toBe(true);
    expect(c.vel.y).toBeCloseTo(-M.wall.clingFall, 3);
  });

  it('steps up 0.3 m but not 0.45 m', () => {
    const climb = (h: number) => {
      const kin = world([[4, h, 4, 0, h / 2, -3]]);
      const s = settled(kin);
      run(s, kin, 0.45, { my: 1 });
      return s.pos.y;
    };
    expect(climb(0.3)).toBeCloseTo(0.3, 2);
    expect(climb(0.45)).toBeCloseTo(0, 2);
  });

  it('walks up a 30° ramp, cannot walk up a 55° one', () => {
    const ramp = (deg: number) => {
      const a = (deg * Math.PI) / 180;
      const kin = world([[3, 0.4, 20, 0, 10 * Math.sin(a) - 0.2 * Math.cos(a) - 0.02, -11, a]]); // top face meets the floor
      const s = settled(kin, [0, 0.5, 2]);
      let top = 0;
      run(s, kin, 1.2, () => { top = Math.max(top, s.pos.y); return { my: 1 }; });
      return top;
    };
    expect(ramp(30)).toBeGreaterThan(2);
    expect(ramp(55)).toBeLessThan(0.6);
  });

  it('cannot stand up under a low ceiling after sliding in', () => {
    const kin = world([[4, 0.5, 6, 0, 1.2 + 0.25, -5]]); // ceiling underside at 1.2 m
    const s = settled(kin);
    run(s, kin, 0.2, { my: 1 });
    run(s, kin, 0.4, { my: 1, slideHeld: true });
    run(s, kin, 0.02, { my: 1 });
    expect(s.pos.z).toBeLessThan(-2.5);
    expect(s.low).toBe(true);
    run(s, kin, 1.5, { my: 1 });
    expect(s.low).toBe(false); // slid out the far side and stood up
  });

  it('a slam from high up does not tunnel through a 0.2 m slab', () => {
    const kin = world([[6, 0.2, 6, 0, 3, 0]]);
    const s = createMoveState([0, 9, 0]);
    stepMove(s, input({ slidePressed: true, slideHeld: true }), DT, kin);
    run(s, kin, 0.5);
    expect(s.pos.y).toBeCloseTo(3.1, 2);
  });
});
