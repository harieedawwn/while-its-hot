import type { ForgeSync, StrikeNet } from '../net/match-msgs';
import type { ForgeSession, StrikeResult } from './session';

/** The server's ForgeSession as the owner's client needs it (match-msgs ForgeSync). */
export function forgeSync(s: ForgeSession, ops = 0): ForgeSync {
  return {
    blades: [{ ...s.blades[0] }, { ...s.blades[1] }], carried: s.carried, slot: s.slot, armor: s.armor, target: s.target,
    heat: s.heat, meter: s.frenzyMeter, pending: s.pendingPick, lastFamily: s.lastFamily,
    ring: [s.ring.p0, s.ring.t0, s.ring.lap], zoneC: s.zoneC, zoneK: s.zoneK, seed: s.seed, fr: [s.frenzyStart, s.frenzyEnd], ops,
  };
}

/** What of the server's state a client applies. heat = false keeps the local (smoother) heat; ring = false keeps the predicted ring (strikes still in flight). */
export function applyForgeSync(s: ForgeSession, y: ForgeSync, opt: { heat: boolean; ring: boolean }): void {
  s.blades = [{ ...y.blades[0] }, { ...y.blades[1] }];
  s.carried = y.carried; s.slot = y.slot; s.armor = y.armor; s.target = y.target;
  if (opt.heat) s.heat = y.heat;
  s.frenzyMeter = y.meter; s.seed = y.seed;
  if (opt.ring) {
    s.ring = { p0: y.ring[0], t0: y.ring[1], lap: y.ring[2] }; s.zoneC = y.zoneC; s.zoneK = y.zoneK;
    s.frenzyStart = y.fr[0]; s.frenzyEnd = y.fr[1];
  }
  s.pendingPick = y.pending; s.lastFamily = y.lastFamily;
}

export function strikeNet(r: StrikeResult, heat: number): StrikeNet {
  return { outcome: r.outcome, timing: r.timing, target: r.target, level: r.level, delta: r.delta, refused: r.refused, frenzy: r.frenzy, pick: r.pick, evolved: r.evolved?.id ?? null, heat };
}
