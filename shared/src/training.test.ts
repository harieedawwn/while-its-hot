import { describe, expect, it } from 'vitest';
import { DpsWindow, rackOffers } from './training';

const base = { unlocked: { phoi: true, kiem_tho: true, bua_ren: true, dao_gam: true, gang_sat: true }, bestLevel: { kiem: 3, bua: 3, dao: 3, tay: 3 } };
describe('training', () => {
  it('rack: phoi first, then unlocked forms within the cap', () => {
    const ids = rackOffers(base).map((w) => w.id);
    expect(ids[0]).toBe('phoi');
    expect(ids).toEqual(expect.arrayContaining(['kiem_tho', 'bua_ren', 'dao_gam', 'gang_sat']));
    expect(ids.length).toBe(5);
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
