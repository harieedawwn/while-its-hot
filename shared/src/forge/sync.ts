import type { ForgeSync, StrikeNet } from '../net/match-msgs';
import type { ForgeSession, StrikeResult } from './session';

/** The server's ForgeSession as the owner's client needs it (match-msgs ForgeSync). */
export function forgeSync(s: ForgeSession): ForgeSync {
  return {
    blades: [{ ...s.blades[0] }, { ...s.blades[1] }], carried: s.carried, slot: s.slot, armor: s.armor, target: s.target,
    heat: s.heat, meter: s.frenzyMeter, frenzyT: s.frenzyT, pending: s.pendingPick, zoneC: s.zoneC, lastFamily: s.lastFamily,
  };
}

/** Overwrite the client's predicted session with the server's. heat = false keeps the local (smoother) heat. */
export function applyForgeSync(s: ForgeSession, y: ForgeSync, heat: boolean): void {
  s.blades = [{ ...y.blades[0] }, { ...y.blades[1] }];
  s.carried = y.carried; s.slot = y.slot; s.armor = y.armor; s.target = y.target;
  if (heat) s.heat = y.heat;
  s.frenzyMeter = y.meter;
  if (y.frenzyT <= 0 || s.frenzyT <= 0) s.frenzyT = y.frenzyT;
  s.pendingPick = y.pending; s.zoneC = y.zoneC; s.lastFamily = y.lastFamily;
}

export function strikeNet(r: StrikeResult, heat: number): StrikeNet {
  return { outcome: r.outcome, timing: r.timing, target: r.target, level: r.level, refused: r.refused, broke: r.broke, pick: r.pick, evolved: r.evolved?.id ?? null, heat };
}
