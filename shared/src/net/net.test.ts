import { describe, expect, it } from 'vitest';
import { decodeSnapshot, decodeState, encodeSnapshot, encodeState, FLAG, type NetState } from './codec';
import { ClockSync } from './clock';
import { DEFAULT_SETTINGS, rulesOf, cleanName, normalizeCode, randomCode, sanitizeSettings, validCode } from './protocol';

const st: NetState = { x: 12.5, y: 3.25, z: -40.125, vx: 4.5, vy: -9.75, vz: 0, yaw: 1.2, pitch: -0.6, anim: 7, animT: 0.431, flags: FLAG.grounded | FLAG.blocking, weapon: 9, level: 4, stamina: 2.5, armor: 3, hp: 77 };
const near = (a: NetState, b: NetState) => {
  for (const k of ['x', 'y', 'z'] as const) expect(a[k]).toBeCloseTo(b[k], 4);
  for (const k of ['vx', 'vy', 'vz'] as const) expect(Math.abs(a[k] - b[k])).toBeLessThan(0.01);
  expect(Math.abs(a.yaw - b.yaw)).toBeLessThan(0.001); expect(Math.abs(a.pitch - b.pitch)).toBeLessThan(0.001);
  expect(Math.abs(a.animT - b.animT)).toBeLessThan(0.002);
  expect([a.anim, a.flags, a.weapon, a.level, a.armor, a.hp]).toEqual([b.anim, b.flags, b.weapon, b.level, b.armor, b.hp]);
  expect(a.stamina).toBeCloseTo(b.stamina, 2);
};
describe('codec', () => {
  it('state round trip', () => { near(decodeState(encodeState(st))!, st); });
  it('snapshot round trip', () => {
    const d = decodeSnapshot(encodeSnapshot({ serverTime: 123456, players: [{ id: 1, state: st }, { id: 5, state: { ...st, x: -3 } }] }))!;
    expect(d.serverTime).toBe(123456); expect(d.players.map((p) => p.id)).toEqual([1, 5]); near(d.players[1].state, { ...st, x: -3 });
  });
  it('rejects bad sizes', () => { expect(decodeState(new ArrayBuffer(5))).toBeNull(); expect(decodeSnapshot(new ArrayBuffer(3))).toBeNull(); });
});
describe('clock', () => {
  it('finds the offset from low-rtt samples', () => {
    const c = new ClockSync();
    ([[0, 5100, 200], [1000, 6020, 1040], [2000, 7030, 2060], [3000, 8300, 3600]] as const).forEach(([s, sv, n]) => c.add(s, sv, n));
    expect(Math.abs(c.offset - 5000)).toBeLessThan(40); expect(c.rtt).toBe(40);
  });
});
describe('protocol', () => {
  it('codes', () => {
    const c = randomCode(() => 0.5); expect(validCode(c)).toBe(true); expect(validCode('ABIO')).toBe(false);
    expect(normalizeCode('ab-c d9ef')).toBe('ABCD');
  });
  it('names and settings', () => {
    expect(cleanName('  <b>Hùng</b>  ')).toBe('bHùng/b'); expect(cleanName(5)).toBe('Thợ rèn');
    expect(sanitizeSettings({ truce: 60 }, DEFAULT_SETTINGS).truce).toBe(60); expect(sanitizeSettings({ truce: 7 }, DEFAULT_SETTINGS).truce).toBe(30);
  });
  it('match settings accept only the allowed choices', () => {
    const s = sanitizeSettings({ rounds: 5, roundS: 240, lives: 1, ring: 2, maxPlayers: 4 }, DEFAULT_SETTINGS);
    expect(s).toMatchObject({ rounds: 5, roundS: 240, lives: 1, ring: 2, maxPlayers: 4, truce: 30 });
    const bad = sanitizeSettings({ rounds: 99, roundS: -1, lives: 'x' as unknown as number, ring: 7, maxPlayers: 1 }, s);
    expect(bad).toEqual(s);
    expect(rulesOf(0).truce).toBe(0); expect(rulesOf(0).lives).toBe(3);
  });
});
