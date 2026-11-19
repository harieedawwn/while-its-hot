import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { BALANCE, type FighterInput, NO_FIGHT, weaponById } from '@wih/shared';
import { bus } from '../core/events';
import { CollisionWorld } from '../physics/world';
import { NO_INPUT } from '../player/move-state';
import { Player } from '../player/player';
import { CombatWorld } from './combat-world';
import { Combatant } from './combatant';
import { hitStopMs } from './combat-feel';

const DT = 1 / 60;
const floor = () => {
  const m = new THREE.Mesh(new THREE.BoxGeometry(40, 1, 40));
  m.position.y = -0.5;
  return CollisionWorld.fromMeshes([m]);
};

/** Attacker at the origin facing −Z, target `dist` ahead facing back at it. */
function duel(weapon = 'kiem_tho', dist = 1.8) {
  const col = floor(), world = new CombatWorld();
  const a = world.add(new Combatant(0, new Player(col, [0, 0, 0], 0, false), weaponById(weapon), { team: 0 }));
  const t = world.add(new Combatant(1, new Player(col, [0, 0, -dist], Math.PI, false), weaponById('kiem_tho'), { team: 1 }));
  const step = (ai: Partial<FighterInput> = {}, ti: Partial<FighterInput> = {}) => {
    a.tick(DT, { ...NO_FIGHT, ...ai }); t.tick(DT, { ...NO_FIGHT, ...ti });
    a.body.tickWith(DT, { ...NO_INPUT, yaw: a.yaw }); t.body.tickWith(DT, { ...NO_INPUT, yaw: t.yaw });
    world.tick(DT);
  };
  for (let i = 0; i < 20; i++) step();
  return { a, t, step };
}
const log = () => {
  const ev: string[] = [];
  const offs = [bus.on('combat:hit', (e) => ev.push(`hit:${e.result}:${e.dmg.toFixed(1)}`)), bus.on('combat:parry', () => ev.push('parry'))];
  return { ev, off: () => offs.forEach((o) => o()) };
};

describe('combat world (local resolver)', () => {
  it('a light swing hits once, for the table damage, and knocks back', () => {
    const { a, t, step } = duel(), l = log();
    const z0 = t.body.s.pos.z;
    step({ attackPressed: true });
    for (let i = 0; i < 30; i++) step();
    l.off();
    expect(l.ev).toEqual(['hit:hit:12.0']);
    expect(t.hp).toBeCloseTo(BALANCE.combat.hp - 12);
    expect(t.body.s.pos.z).toBeLessThan(z0 - 0.05);
    expect(a.hp).toBe(BALANCE.combat.hp);
  });
  it('a parry staggers the attacker and refunds a stamina pip', () => {
    const { a, t, step } = duel(), l = log();
    t.body.s.stamina = 1;
    step({ attackPressed: true });
    step({}, { parryPressed: true });
    for (let i = 0; i < 20; i++) step();
    l.off();
    expect(l.ev).toEqual(['parry']);
    expect(t.hp).toBe(BALANCE.combat.hp);
    expect(a.fighter.phase).toBe('stagger');
    expect(t.body.s.stamina).toBeGreaterThanOrEqual(2);
  });
  it('a held block cuts damage by 70% and costs a pip; a hammer heavy breaks it', () => {
    const { t, step } = duel(), l = log();
    for (let i = 0; i < 15; i++) step({}, { parryPressed: i === 0, parryHeld: true });
    const st = t.body.s.stamina;
    step({ attackPressed: true }, { parryHeld: true });
    for (let i = 0; i < 30; i++) step({}, { parryHeld: true });
    l.off();
    expect(l.ev).toEqual(['hit:blocked:3.6']);
    expect(t.body.s.stamina).toBeLessThan(st);
    const h = duel('bua_ta'), l2 = log();
    for (let i = 0; i < 15; i++) h.step({}, { parryPressed: i === 0, parryHeld: true });
    h.step({ attackPressed: true, attackHeld: true }, { parryHeld: true });
    for (let i = 0; i < 90; i++) h.step({ attackHeld: i < 40 }, { parryHeld: true });
    l2.off();
    expect(l2.ev[0]).toMatch(/^hit:guardbreak/);
    expect(h.t.fighter.phase === 'stagger' || h.t.fighter.phase === 'idle').toBe(true);
  });
  it('out of reach: the polearm reaches where the sword whiffs (thuong_thep: +25% at max reach)', () => {
    const s = duel('kiem_tho', 3.0), l = log();
    s.step({ attackPressed: true });
    for (let i = 0; i < 30; i++) s.step();
    const p = duel('thuong_thep', 3.0);
    p.step({ attackPressed: true });
    for (let i = 0; i < 30; i++) p.step();
    l.off();
    expect(l.ev).toEqual(['hit:hit:12.5']);
  });
  it('hit-stop spans 50–90 ms by damage', () => {
    expect(hitStopMs(9)).toBe(50); expect(hitStopMs(45)).toBe(90); expect(hitStopMs(100)).toBe(90);
  });
});
