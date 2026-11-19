import { FAMILIES, WEAPONS, type Family, type WeaponDef } from './data/weapons';

/** Training yard rules (GDD §9, §10): rack offers, anvil caps, dummy modes on the lever board, the chalkboard DPS window. */
export const YARD_MODES = ['idle', 'block', 'counter', 'move'] as const;
export type YardMode = (typeof YARD_MODES)[number];

export interface RackProfile { unlocked: Record<string, boolean>; bestLevel: Record<Family, number> }

/** Every unlocked form the rack can hand over, ordered by family then minLevel. Phoi is the empty hand and always first. */
export function rackOffers(p: RackProfile): WeaponDef[] {
  const out: WeaponDef[] = [WEAPONS.find((w) => w.family === null)!];
  for (const f of FAMILIES) for (const w of WEAPONS) if (w.family === f && p.unlocked[w.id] === true && w.minLevel <= p.bestLevel[f]) out.push(w);
  return out;
}

/** Anvil caps per family = the best level reached (an unlock earned online raises it). */
export const trainingCaps = (p: RackProfile): Record<Family, number> => ({ ...p.bestLevel });

/** Damage dealt in the last `windowS` seconds divided by the window (the chalkboard's DPS). */
export class DpsWindow {
  private hits: { t: number; dmg: number }[] = [];
  last = 0;
  constructor(private windowS = 5) {}
  add(t: number, dmg: number): void { this.hits.push({ t, dmg }); this.last = dmg; }
  dps(now: number): number {
    while (this.hits.length && now - this.hits[0].t > this.windowS) this.hits.shift();
    return this.hits.reduce((s, h) => s + h.dmg, 0) / this.windowS;
  }
  reset(): void { this.hits = []; this.last = 0; }
}
