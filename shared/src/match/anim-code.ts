import { framesFor } from '../combat/frames';
import type { Fighter, FighterPhase } from '../combat/fighter';
import type { AttackKind } from '../passives';

/**
 * The fighter's visible state packed into State.anim (one byte): phase << 4 | kind << 2 | combo.
 * Remote clients mirror it onto a Fighter that is never ticked, so clips, aim assist and the
 * local hit prediction read the same getters (parrying, blocking, dead) as for local fighters.
 */
export const PHASES: readonly FighterPhase[] = ['idle', 'windup', 'active', 'recover', 'charge', 'parry', 'parry_recover', 'block', 'stagger', 'flinch', 'dead'];
const KINDS: readonly AttackKind[] = ['light', 'heavy', 'slide'];

export function animCode(f: Pick<Fighter, 'phase' | 'kind' | 'combo'>): number {
  return (Math.max(0, PHASES.indexOf(f.phase)) << 4) | (Math.max(0, KINDS.indexOf(f.kind)) << 2) | (f.combo & 3);
}
export function decodeAnim(code: number): { phase: FighterPhase; kind: AttackKind; combo: number } {
  return { phase: PHASES[(code >> 4) & 15] ?? 'idle', kind: KINDS[(code >> 2) & 3] ?? 'light', combo: code & 3 };
}

/**
 * Mirror a replicated anim code onto a remote Fighter. A swing starts when the parity flips or the phase
 * enters windup/charge from a non-attack phase; then swingId advances and frames are refreshed.
 * Returns true when a new swing began (the owner emits combat:swing for its sound).
 */
export function mirrorFighter(f: Fighter, code: number, t: number, parity: boolean, lastParity: boolean): boolean {
  const d = decodeAnim(code), was = f.phase;
  const attack = d.phase === 'windup' || d.phase === 'active' || d.phase === 'recover';
  const newSwing = attack && (parity !== lastParity || !(was === 'windup' || was === 'active' || was === 'recover'));
  f.phase = d.phase; f.kind = d.kind; f.combo = d.combo; f.t = t;
  if (newSwing) { f.swingId++; f.frames = framesFor(f.weapon, d.kind, d.combo); }
  f.sweep = null;
  return newSwing;
}
