import { describe, expect, it } from 'vitest';
import { CARDS, cardChanges, foldCards } from './cards';
import { makeOffers } from '../match/rules';

const rng = (seed = 7) => () => (seed = (seed * 16807) % 2147483647) / 2147483647;

describe('card data', () => {
  it('every card id is unique and has an effect', () => {
    expect(new Set(CARDS.map((c) => c.id)).size).toBe(CARDS.length);
    for (const c of CARDS) expect(cardChanges(c.id), c.id).toBe(true);
  });
  it('family cards only work with their family', () => {
    expect(foldCards(['dau_nang'], 'bua').chargeMul).toBeCloseTo(0.7);
    expect(foldCards(['dau_nang'], 'kiem').chargeMul).toBe(1);
    expect(foldCards(['buoc_nhe'], 'dao').airJumps).toBe(1);
  });
  it('offers always mix both kinds and never repeat unless stackable', () => {
    const r = rng();
    for (let i = 0; i < 300; i++) {
      const own = CARDS.filter(() => r() < 0.3).map((c) => c.id);
      const o = makeOffers(own, i % 2 === 0, r), defs = o.map((id) => CARDS.find((c) => c.id === id)!);
      expect(o).toHaveLength(3); expect(new Set(o).size).toBe(3);
      expect(defs.some((d) => d.kind === 'weapon')).toBe(true); expect(defs.some((d) => d.kind === 'body')).toBe(true);
      for (const d of defs) expect(d.stack || !own.includes(d.id)).toBe(true);
    }
  });
  it('last place always sees a rare card', () => {
    const r = rng(3);
    for (let i = 0; i < 100; i++) expect(makeOffers([], true, r).some((id) => CARDS.find((c) => c.id === id)!.rare)).toBe(true);
  });
});
