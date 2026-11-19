import { describe, expect, it } from 'vitest';
import { DpsWindow, rackOffers } from './training';

const base = { unlocked: { phoi: true, kiem_tho: true, bua_ren: true, giao_sat: true }, bestLevel: { kiem: 3, bua: 3, thuong: 3 } };
describe('training', () => {
  it('rack: phoi first, then unlocked forms within the cap', () => {
    const ids = rackOffers(base).map((w) => w.id);
    expect(ids[0]).toBe('phoi');
    expect(ids).toEqual(expect.arrayContaining(['kiem_tho', 'bua_ren', 'giao_sat']));
    expect(ids.length).toBe(4);
  });
  it('rack: a locked form stays off the rack', () => {
    expect(rackOffers({ ...base, unlocked: { phoi: true } }).map((w) => w.id)).toEqual(['phoi']);
  });
  it('dps: 5 s window', () => {
    const d = new DpsWindow(5);
    d.add(0, 10); d.add(2, 15);
    expect(d.dps(3)).toBe(5);
    expect(d.dps(6)).toBe(3);
    expect(d.last).toBe(15);
  });
});
