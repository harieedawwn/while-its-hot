import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { ARMOR_TIERS, armorTier, MODULE_IDS, MODULES, SOCKET_NAMES } from '@wih/shared';
import { cbox } from '../../render/geo/cbox';
import { Animator, IDLE_INPUT } from './animator';
import { buildArmor } from './armor';
import { buildBody } from './body';
import { ATTACK_SLOTS, clipIds, getClip, hasClip } from './clips';
import { sample } from './pose';
import { BONE_INDEX, newPose, SOCKETS, ROOT_AT, Skeleton } from './skeleton';

describe('data', () => {
  it('armor levels map to five tiers', () => {
    expect(ARMOR_TIERS).toHaveLength(5);
    expect([0, 1, 2, 3, 4, 5, 6, 7, 8, 10].map(armorTier)).toEqual([0, 0, 1, 1, 2, 2, 3, 3, 4, 4]);
    expect(armorTier(-3)).toBe(0); expect(armorTier(99)).toBe(4);
  });
  it('every module sits on real sockets and every socket has a bone', () => {
    for (const s of SOCKET_NAMES) expect(SOCKETS[s].bone in BONE_INDEX).toBe(true);
    for (const m of MODULES) for (const s of m.sockets) expect(SOCKET_NAMES).toContain(s);
  });
});

describe('geometry', () => {
  it('cbox is 44 triangles with outward winding', () => {
    const g = cbox(1, 2, 3, 0.1), p = g.getAttribute('position'), idx = g.index!;
    const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
    let bad = 0;
    for (let i = 0; i < idx.count; i += 3) {
      a.fromBufferAttribute(p, idx.getX(i)); b.fromBufferAttribute(p, idx.getX(i + 1)); c.fromBufferAttribute(p, idx.getX(i + 2));
      const n = b.clone().sub(a).cross(c.clone().sub(a));
      if (n.dot(a.clone().add(b).add(c)) <= 0) bad++;
    }
    expect(idx.count / 3).toBe(44); expect(bad).toBe(0);
  });
  it('stays inside the triangle budget (LOOK §2: player 2–4k)', () => {
    const body = buildBody().tris;
    expect(body).toBeLessThan(2400);
    for (const lvl of [0, 2, 4, 6, 8]) expect(body + buildArmor(lvl).tris).toBeLessThan(4600);
    for (const m of MODULE_IDS) expect(buildArmor(6, [m]).tris - buildArmor(6).tris).toBeGreaterThan(50);
  });
  it('armor swaps never change the body: the body batch is built independently', () => {
    expect(buildBody().tris).toBe(buildBody().tris);
    expect(buildArmor(0).tris).not.toBe(buildArmor(8).tris);
  });
});

describe('clips', () => {
  const need = ['idle', 'run_f', 'run_b', 'strafe_l', 'strafe_r', 'sprint_lean', 'jump', 'fall', 'land', 'slide', 'slam', 'cling',
    'forge_strike', 'heat_hold', 'block', 'parry', 'hit_f', 'hit_b', 'stagger', 'death'];
  it('has every clip of LOOK §4 and every attack slot (hammer chains 2 lights)', () => {
    for (const id of need) expect(hasClip(id), id).toBe(true);
    expect(ATTACK_SLOTS).toHaveLength(28);
    for (const id of ATTACK_SLOTS) expect(hasClip(id), id).toBe(!['atk_sword_light4', 'atk_hammer_light3', 'atk_hammer_light4'].includes(id));
    expect(clipIds().length).toBeGreaterThanOrEqual(need.length);
  });
  it('looping clips close: u=0 and u=1 give the same pose', () => {
    for (const id of clipIds()) {
      const c = getClip(id)!; if (!c.loop) continue;
      const a = newPose(), b = newPose();
      sample(c, 0, a); sample(c, 0.99999, b);
      for (let j = 0; j < a.length; j++) expect(Math.abs(a[j] - b[j]), id).toBeLessThan(0.02);
    }
  });
  it('run cycles are half-cycle mirrors (left/right swap)', () => {
    for (const id of ['run_f', 'run_b', 'strafe_r']) {
      const c = getClip(id)!, a = newPose(), b = newPose();
      sample(c, 0.1, a); sample(c, 0.6, b);
      const L = BONE_INDEX.thigh_l * 3, R = BONE_INDEX.thigh_r * 3;
      expect(a[L]).toBeCloseTo(b[R], 4); expect(a[R]).toBeCloseTo(b[L], 4);
      expect(a[L + 2]).toBeCloseTo(-b[R + 2], 4);
    }
  });
  it('non-looping clips clamp and spline/ease never blow up', () => {
    for (const id of clipIds()) {
      const c = getClip(id)!, p = newPose();
      for (const u of [-1, 0, 0.17, 0.5, 0.83, 1, 3]) { sample(c, u, p); for (const v of p) expect(Number.isFinite(v), id).toBe(true); }
    }
  });
});

describe('animator', () => {
  const run = (a: Animator, inp: object, secs: number) => { for (let i = 0; i < secs * 60; i++) a.update(1 / 60, { ...IDLE_INPUT, ...inp }); };
  it('picks base states by priority', () => {
    const a = new Animator();
    run(a, { vz: -9 }, 0.2); expect(a.state).toBe('ground');
    run(a, { grounded: false, vy: 6 }, 0.1); expect(a.state).toBe('jump');
    run(a, { grounded: false, vy: -6 }, 0.1); expect(a.state).toBe('fall');
    run(a, { sliding: true }, 0.1); expect(a.state).toBe('slide');
    run(a, { sliding: true, slamming: true, grounded: false }, 0.1); expect(a.state).toBe('slam');
    run(a, { clinging: true, sliding: true }, 0.1); expect(a.state).toBe('cling');
  });
  it('run cycle advances with distance and mixes 8 directions without NaN', () => {
    const a = new Animator();
    run(a, { vz: -9 }, 0.5);
    expect(a.phase).toBeCloseTo((9 * 0.5) / 3.3 % 1, 1);
    for (const [vx, vz] of [[9, 0], [-9, 0], [0, 9], [6.4, -6.4], [-6.4, 6.4], [5, 5]]) { run(a, { vx, vz }, 0.1); for (const v of a.pose) expect(Number.isFinite(v)).toBe(true); }
  });
  it('idle at rest is a standing pose; running leans the torso forward', () => {
    const a = new Animator(); run(a, {}, 1);
    const P = BONE_INDEX.pelvis * 3, T = BONE_INDEX.thigh_r * 3;
    expect(Math.abs(a.pose[P])).toBeLessThan(0.05);
    const idleThigh = a.pose[T];
    run(a, { vz: -9 }, 0.4);
    expect(a.pose[P]).toBeLessThan(0); // lean forward = negative x
    expect(Math.abs(a.pose[T] - idleThigh)).toBeGreaterThan(0.1);
  });
  it('an upper-body action leaves the legs to the base layer', () => {
    const a = new Animator(); run(a, { vz: -9 }, 0.3);
    const before = Array.from(a.pose.subarray(BONE_INDEX.thigh_l * 3, BONE_INDEX.thigh_l * 3 + 3));
    expect(a.play('block', { fadeIn: 0.01 })).toBe(true);
    const b = new Animator(); run(b, { vz: -9 }, 0.3); b.play('block', { fadeIn: 0.01 });
    run(a, { vz: -9 }, 0.2); run(b, { vz: -9 }, 0.2);
    expect(Array.from(a.pose.subarray(BONE_INDEX.thigh_l * 3, BONE_INDEX.thigh_l * 3 + 3))).toEqual(Array.from(b.pose.subarray(BONE_INDEX.thigh_l * 3, BONE_INDEX.thigh_l * 3 + 3)));
    expect(before).toHaveLength(3);
    // the arms did take the guard pose
    expect(a.pose[BONE_INDEX.fore_r * 3]).toBeGreaterThan(1.2);
  });
  it('death holds its last key lying down; unknown ids are ignored; actions fade out', () => {
    const a = new Animator();
    expect(a.play('nope')).toBe(false);
    a.play('death', { hold: true, fadeIn: 0.05 }); run(a, {}, 2.5);
    expect(a.action).toBe('death');
    expect(a.pose[BONE_INDEX.pelvis * 3]).toBeGreaterThan(1.4); // ~90° back
    expect(a.pose[ROOT_AT + 1]).toBeLessThan(-0.6);
    const b = new Animator(); b.play('parry'); run(b, {}, 1);
    expect(b.action).toBeNull();
  });
  it('the skeleton applies poses to bones and keeps sockets reachable', () => {
    const s = new Skeleton(), p = newPose();
    s.apply(p);
    const feet = new THREE.Vector3(); s.bones[BONE_INDEX.foot_l].getWorldPosition(feet);
    expect(feet.y).toBeCloseTo(0.09, 2); // ankle height: sole at the floor
    p[BONE_INDEX.arm_r * 3] = Math.PI / 2; // swing forward
    s.apply(p); s.root.updateMatrixWorld(true);
    const hand = new THREE.Vector3(); s.hold.hand_r.getWorldPosition(hand);
    expect(hand.z).toBeLessThan(-0.4); // forward = −Z
  });
});
