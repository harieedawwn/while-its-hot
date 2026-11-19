import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { CollisionWorld } from '../physics/world';
import { Kinematics } from '../player/kinematics';
import { stepMove } from '../player/motor';
import { createMoveState, NO_INPUT } from '../player/move-state';

/** A placed anvil is solid: the body is stopped by it, and walks on once the blocker is switched off. */
const DT = 1 / 60;
function setup() {
  const floor = new THREE.Mesh(new THREE.BoxGeometry(40, 1, 40));
  floor.position.set(0, -0.5, 0);
  const world = CollisionWorld.fromMeshes([floor]);
  const blocker = { x: 0, z: -3, r: 0.42, y: 0, h: 0.86, on: true };
  world.blockers.push(blocker);
  return { kin: new Kinematics(world), blocker };
}
const run = (s: ReturnType<typeof createMoveState>, kin: Kinematics, secs: number) => {
  for (let i = 0; i < secs / DT; i++) stepMove(s, { ...NO_INPUT, my: 1, yaw: 0 }, DT, kin);
};

describe('dynamic blockers', () => {
  it('stop a body walking into them, and let go when off', () => {
    const { kin, blocker } = setup();
    const s = createMoveState([0, 0, 0]);
    run(s, kin, 1.5);
    // body radius 0.35 + blocker 0.42 → can't get closer than 0.77 m to the center
    expect(s.pos.z).toBeGreaterThan(-3 + 0.7);
    blocker.on = false;
    run(s, kin, 1.2);
    expect(s.pos.z).toBeLessThan(-3.5);
  });
  it('slide along the side instead of sticking', () => {
    const { kin } = setup();
    const s = createMoveState([0.2, 0, 0]);
    run(s, kin, 2.5);
    expect(s.pos.z).toBeLessThan(-3.5);
  });
});
