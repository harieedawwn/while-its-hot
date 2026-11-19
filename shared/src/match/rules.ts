import { BALANCE } from '../balance';
import { MODULE_IDS } from '../data/modules';
import { RELICS } from '../data/relics';
import type { RandFn } from '../forge/session';

/** Pure round rules (GDD §3, §8): ring size and burn, round winner, Tiếng tăm, draft offers. */
const M = BALANCE.match, R = M.ring;

/** Seconds the ring takes to close at speed index `speed` (0 chậm · 1 vừa · 2 nhanh). */
export function ringSpan(speed = 1): number { return (R.closedS - R.startS) * (BALANCE.net.ringTime[speed] ?? 1); }

/** Fire ring radius at fight-clock `s` seconds: 0 (no ring) before it starts, then shrinking to minR by closedS. */
export function ringRadius(s: number, speed = 1): number {
  if (s < R.startS) return 0;
  const k = Math.min(1, (s - R.startS) / ringSpan(speed));
  return R.maxR + (R.minR - R.maxR) * k;
}
/** Damage per second outside the ring at fight-clock `s`. */
export function burnDps(s: number): number { return R.dps + R.step * Math.max(0, Math.floor((s - R.startS) / R.everyS)); }

export interface RoundRow { id: number; kills: number; lives: number; dealt: number; online: boolean }
/** Round winner = most kills; tiebreak lives left, then damage dealt. Null when nobody did anything at all. */
export function roundWinner(rows: readonly RoundRow[]): { win: number | null; lead: number } {
  const o = [...rows].sort((a, b) => b.kills - a.kills || b.lives - a.lives || b.dealt - a.dealt);
  if (!o.length) return { win: null, lead: 0 };
  const a = o[0], b = o[1];
  if (a.kills === 0 && a.dealt === 0) return { win: null, lead: 0 };
  return { win: a.id, lead: a.kills - (b?.kills ?? 0) };
}
/** Stacks the winner carries into the next round (a big win earns two). */
export function notorietyFor(lead: number): number { return lead >= M.draft.bigWin ? 2 : 1; }

/** Kill points: 1 for the kill + 1 per Tiếng tăm stack the victim carried. */
export function killPoints(victimStacks: number): number { return 1 + Math.max(0, victimStacks); }

function pick<T>(pool: readonly T[], n: number, rand: RandFn): T[] {
  const a = pool.slice(), out: T[] = [];
  while (out.length < n && a.length) out.push(a.splice(Math.floor(rand() * a.length), 1)[0]);
  return out;
}
/**
 * Offers for one player: normal pool minus what they own; last place draws from the rare pool, and its first
 * `moduleOffers` offers may swap one slot for an armor module (catch-up builds, GDD §8).
 */
export function makeOffers(own: readonly string[], lastPlace: boolean, offerNo: number, rand: RandFn): string[] {
  const free = RELICS.filter((r) => !own.includes(r.id));
  const rare = free.filter((r) => r.rare).map((r) => r.id as string);
  const pool = lastPlace && rare.length >= M.draft.offers ? rare : free.map((r) => r.id as string);
  const ids = pick(pool, M.draft.offers, rand);
  if (lastPlace && offerNo < M.draft.moduleOffers) {
    const mods = MODULE_IDS.filter((m) => !own.includes(m));
    if (mods.length && ids.length) ids[ids.length - 1] = mods[Math.floor(rand() * mods.length)];
  }
  return ids;
}
