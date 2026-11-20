import { BALANCE, type FighterInput, NO_FIGHT, weaponById } from '@wih/shared';
import type { DummyMode } from '../combat/dummy';
import type { MoveInput } from '../player/move-state';

/**
 * Scripted runs of the `combat` scene for frozen screenshots (`demo=<id>&t=<s>`): the player's fight and
 * move intent over time, and the mode of the dummy standing 2 m in front. Deterministic: same t → same frame.
 */
export interface Demo {
  front: DummyMode;
  fight(t: number, weapon: string): Omit<FighterInput, 'sinceSlide'>;
  move?(t: number): Partial<MoveInput>;
  /** Distance of the front dummy (m). */
  dist?: number;
}

const DT = 1 / 60;
const at = (t: number, s: number) => t >= s && t < s + DT * 0.999;
const tap = (t: number, ...times: number[]) => ({ ...NO_FIGHT, attackPressed: times.some((s) => at(t, s)) });
const combo = (w: string) => weaponById(w).stats.comboS;

export const DEMOS: Record<string, Demo> = {
  light1: { front: 'idle', fight: (t) => tap(t, 0) },
  light2: { front: 'idle', fight: (t, w) => tap(t, 0, combo(w) - 0.1) },
  light3: { front: 'idle', fight: (t, w) => tap(t, 0, combo(w) - 0.1, 2 * combo(w) - 0.1) },
  light4: { front: 'idle', fight: (t, w) => tap(t, 0, combo(w) - 0.1, 2 * combo(w) - 0.1, 3 * combo(w) - 0.1) },
  heavy: { front: 'idle', fight: (t) => ({ ...NO_FIGHT, attackPressed: at(t, 0), attackHeld: t < 0.7 }) },
  charge: { front: 'idle', fight: (t) => ({ ...NO_FIGHT, attackPressed: at(t, 0), attackHeld: true }) },
  slide: { front: 'idle', dist: 4.2, fight: (t) => tap(t, 0.12), move: (t) => ({ my: t < 0.3 ? 1 : 0, slideHeld: t > 0.02 && t < 0.3, slidePressed: at(t, 0.02) }) },
  /** The player swings into a parrying dummy: freeze right after the parry lands. */
  parry: { front: 'parry', fight: (t) => tap(t, 0) },
  /** A dummy swings into the player, who parries on the right frame. */
  riposte: { front: 'attack', fight: (t) => ({ ...NO_FIGHT, parryPressed: at(t, 0.25) }) },
  /** Hold the guard while the dummy swings. */
  block: { front: 'attack', fight: (t) => ({ ...NO_FIGHT, parryPressed: at(t, 0), parryHeld: true }) },
};

/** Seconds every replay simulates before the demo clock starts (bodies land, guards come up). */
export const SETTLE_S = 0.6;
/** Lineup of the free-play dummies, left to right across the corner. */
export const LINEUP: DummyMode[] = ['idle', 'block', 'parry', 'counter', 'move'];
export const DUMMY_HP = BALANCE.combat.hp;
