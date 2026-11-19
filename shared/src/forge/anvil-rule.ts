import { BALANCE } from '../balance';

/**
 * The anvil's own state machine (GDD §6): carried → placing (0.6 s) → placed → lifting (0.6 s) → carried,
 * then a cooldown before it can be placed again. `instant` = relic "Đe nhẹ" (no place/pick-up time).
 */
export type AnvilPhase = 'carried' | 'placing' | 'placed' | 'lifting';

export class AnvilRule {
  phase: AnvilPhase = 'carried';
  /** Seconds left in placing/lifting. */
  t = 0;
  /** Seconds until the anvil may be placed again. */
  cooldown = 0;
  instant = false;

  get usable(): boolean { return this.phase === 'placed'; }
  get canPlace(): boolean { return this.phase === 'carried' && this.cooldown <= 0; }
  get canLift(): boolean { return this.phase === 'placed'; }

  place(): boolean {
    if (!this.canPlace) return false;
    this.phase = 'placing'; this.t = this.instant ? 0 : BALANCE.forge.anvil.placeS;
    if (this.t <= 0) this.phase = 'placed';
    return true;
  }
  lift(): boolean {
    if (!this.canLift) return false;
    this.phase = 'lifting'; this.t = this.instant ? 0 : BALANCE.forge.anvil.pickupS;
    if (this.t <= 0) this.finishLift();
    return true;
  }
  /** Interrupt a placement (the owner died, left the area). */
  cancel(): void { if (this.phase === 'placing') { this.phase = 'carried'; this.t = 0; } }
  /** Fresh round: carried, no cooldown. */
  reset(): void { this.phase = 'carried'; this.t = 0; this.cooldown = 0; }
  /** Put it down immediately (dev presets). */
  forcePlaced(): void { this.phase = 'placed'; this.t = 0; }

  /** Returns the phase it just entered ('placed' or 'carried'), or null. */
  tick(dt: number): AnvilPhase | null {
    if (this.cooldown > 0) this.cooldown = Math.max(0, this.cooldown - dt);
    if (this.phase === 'placing' || this.phase === 'lifting') {
      this.t -= dt;
      if (this.t <= 0) {
        if (this.phase === 'placing') { this.phase = 'placed'; this.t = 0; return 'placed'; }
        this.finishLift(); return 'carried';
      }
    }
    return null;
  }
  private finishLift(): void { this.phase = 'carried'; this.t = 0; this.cooldown = this.instant ? 0 : BALANCE.forge.anvil.cooldownS; }
}
