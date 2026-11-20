import { BALANCE } from '../balance';
import { type Family, formFor, passivesOf, type WeaponDef } from '../data/weapons';
import type { ModuleId } from '../data/modules';
import { type ForgeMods, type ForgeTarget, NO_MODS, OUTCOME_DELTA, type Outcome, oddsFor, rollOutcome, type Timing } from './odds';

/**
 * One player's forging state (GDD §6, §7, §9): two blades, armor, heat, the strike ring and frenzy.
 * Pure and deterministic given the rand source — the server rolls with this, the client predicts with it.
 */
const F = BALANCE.forge, W = BALANCE.weapons;

export interface Blade { family: Family | null; level: number; /** Highest level ever: the form never goes backwards. */ best: number; }
export const newBlade = (): Blade => ({ family: null, level: 0, best: 0 });
export const bladeForm = (b: Blade): WeaponDef => formFor(b.family, b.best);

export interface StrikeResult {
  outcome: Outcome; timing: Timing; target: ForgeTarget; delta: number; level: number;
  /** The strike would have gained a level but the training cap (or max level) refused it. */
  refused: boolean; broke: boolean;
  /** Blade reached the pick level with no family yet. */
  pick: boolean;
  /** New form when the blade's best level crossed a milestone. */
  evolved: WeaponDef | null;
}

export type RandFn = () => number;
/** Unlocked family caps (profile bestLevel); null = no cap (online). */
export type FamilyCaps = Readonly<Record<Family, number>> | null;

/** Module slots open at armor +3 and +7. */
export function moduleSlots(armorLevel: number): number { return F.moduleSlotAt.filter((l) => armorLevel >= l).length; }

export class ForgeSession {
  blades: [Blade, Blade] = [newBlade(), newBlade()];
  slot = 0;
  /** Blades carried (online you start with one; a picked-up blank adds the second, GDD §3). */
  carried = 2;
  /** false on a networked client: frenzy auto-strikes are rolled by the server, not predicted. */
  autoStrike = true;
  armor = 0;
  modules: ModuleId[] = [];
  target: ForgeTarget = 'blade';
  heat = 0;
  /** Strike ring: marker phase 0..1 (one lap per ringS) and the sweet zone center (0..1). */
  ring = 0;
  zoneC = 0;
  cooldown = 0;
  frenzyMeter = 0;
  frenzyT = 0;
  private autoT = 0;
  mods: ForgeMods = { ...NO_MODS };
  caps: FamilyCaps = null;
  /** Family chosen last time (the default of the 3 s pick). */
  lastFamily: Family = 'kiem';
  /** Set when a blade needs its family picked; cleared by pickFamily(). */
  pendingPick: number | null = null;
  /** Relic charges (reset each round): Gãy that are prevented, strikes that are certain Tuyệt. */
  noBreak = 0;
  tuyet = 0;

  constructor(private rand: RandFn) { this.zoneC = rand(); }

  get blade(): Blade { return this.blades[this.slot]; }
  get frenzy(): boolean { return this.frenzyT > 0; }
  /** Frenzy at the anvil makes you untouchable (the caller checks "at the anvil"). */
  get immune(): boolean { return this.frenzyT > 0; }
  get zoneHalf(): number { return (F.strike.zoneFrac * this.mods.zoneMul) / 2; }
  /** Level of whatever is being forged and the form the active blade shows. */
  get level(): number { return this.target === 'armor' ? this.armor : this.blade.level; }
  get form(): WeaponDef { return bladeForm(this.blade); }
  get passives() { return passivesOf(this.form); }

  /** Seconds left of the blade switch (no attack while > 0). */
  swapT = 0;
  /** Slot `i` holds a blade: the held one always does, the other only after a blank was picked up (carried 2). */
  filled(i: number): boolean { return i === this.slot || this.carried > 1; }
  /** Switch the held blade. Refused with an empty other slot or while a switch is running (`force` = server, which trusts the client's timing). */
  swapSlot(force = false): boolean {
    if (this.carried < 2 || (!force && this.swapT > 0)) return false;
    this.slot = 1 - this.slot; this.swapT = F.swapS; return true;
  }
  toggleTarget(): void { this.target = this.target === 'blade' ? 'armor' : 'blade'; }

  /** Equip a module into a free slot (relic draft, phase 18). */
  equip(m: ModuleId): boolean {
    if (this.modules.length >= moduleSlots(this.armor) || this.modules.includes(m)) return false;
    this.modules.push(m); return true;
  }

  /** Where the marker is relative to the zone, as the ring UI and the strike both read it. */
  timingNow(): Timing {
    const d = Math.abs(this.ring - this.zoneC);
    return Math.min(d, 1 - d) <= this.zoneHalf ? 'perfect' : 'miss';
  }
  get canStrike(): boolean { return this.cooldown <= 0 && this.pendingPick === null; }

  /** Advance heat, ring, cooldown and frenzy. Returns the frenzy auto-strikes that fired. */
  tick(dt: number, heating: boolean): StrikeResult[] {
    const H = F.heat;
    this.ring = (this.ring + dt / F.strike.ringS) % 1;
    this.cooldown = Math.max(0, this.cooldown - dt);
    this.swapT = Math.max(0, this.swapT - dt);
    this.heat = heating ? Math.min(1, this.heat + H.holdPerS * this.mods.heatGainMul * dt)
      : Math.max(0, this.heat - H.decayPerS * this.mods.heatDecayMul * dt);
    const out: StrikeResult[] = [];
    if (this.frenzyT > 0) {
      this.frenzyT = Math.max(0, this.frenzyT - dt);
      if (!this.autoStrike) return out;
      this.autoT -= dt;
      while (this.autoT <= 0 && this.pendingPick === null && this.frenzyT > 0) { this.autoT += F.strike.cadenceS * F.frenzy.cadenceMul * this.mods.cadenceMul; out.push(this.strike('auto')); }
      if (this.autoT < -1) this.autoT = 0;
    }
    return out;
  }

  /** Heat is knocked down when the smith is hit out of the stance. */
  onHitOut(): void { this.heat = Math.max(0, this.heat - F.heat.hitCost); }

  activateFrenzy(): boolean {
    if (this.frenzyMeter < F.frenzy.full || this.frenzy) return false;
    this.frenzyMeter = 0; this.frenzyT = F.frenzy.durS; this.autoT = 0;
    return true;
  }
  /** Leaving the stance ends frenzy early (the auto-strikes need the anvil). */
  endFrenzy(): void { this.frenzyT = 0; }

  private capFor(b: Blade): number {
    if (!this.caps) return W.maxLevel;
    return b.family ? Math.min(W.maxLevel, this.caps[b.family]) : Math.max(W.familyPick, 0);
  }

  /** A player strike (timing from the ring right now) or an auto one. */
  strike(timing: Timing = this.timingNow()): StrikeResult {
    const armor = this.target === 'armor', b = this.blade;
    const level = armor ? this.armor : b.level;
    const odds = oddsFor({ level, target: this.target, heat: this.heat, timing, passives: armor ? undefined : this.passives, mods: this.mods });
    let outcome = rollOutcome(odds, this.rand());
    if (outcome === 'hong' && this.frenzy) outcome = 'giu';
    if (this.tuyet > 0 && this.pendingPick === null) { this.tuyet--; outcome = 'tuyet'; }
    const max = armor ? F.armor.maxLevel : this.capFor(b);
    const delta = OUTCOME_DELTA[outcome];
    const res: StrikeResult = { outcome, timing, target: this.target, delta, level, refused: false, broke: false, pick: false, evolved: null };
    if (delta > 0 && level >= max) { res.refused = true; res.delta = 0; }
    else if (delta < 0 && level <= 0) {
      if (!armor && this.noBreak > 0) { this.noBreak--; res.delta = 0; }
      else if (!armor) { res.broke = true; this.blades[this.slot] = newBlade(); res.level = 0; res.delta = 0; }
      else res.delta = 0;
    }
    if (!res.broke) this.applyLevel(res, armor, b, max);
    if (!res.refused && !res.broke) this.frenzyMeter = Math.min(F.frenzy.full, this.frenzyMeter + (outcome === 'tuyet' ? F.frenzy.perTuyet : outcome === 'dat' ? F.frenzy.perDat : 0));
    this.heat = Math.max(0, this.heat - F.heat.strikeCost);
    if (timing !== 'auto') this.cooldown = F.strike.cadenceS * this.mods.cadenceMul;
    this.zoneC = this.rand();
    return res;
  }

  private applyLevel(res: StrikeResult, armor: boolean, b: Blade, max: number): void {
    if (armor) { this.armor = Math.max(0, Math.min(F.armor.maxLevel, this.armor + res.delta)); res.level = this.armor; return; }
    const before = bladeForm(b);
    b.level = Math.max(0, Math.min(max, b.level + res.delta));
    if (b.level > b.best) b.best = b.level;
    res.level = b.level;
    if (b.family === null && b.best >= W.familyPick) { res.pick = true; this.pendingPick = this.slot; }
    const after = bladeForm(b);
    if (after.id !== before.id) res.evolved = after;
  }

  /** Choose the family of the blade awaiting it (the 3-way pick at +3). Returns the new form. */
  pickFamily(f: Family): WeaponDef | null {
    if (this.pendingPick === null) return null;
    const b = this.blades[this.pendingPick];
    b.family = f; this.lastFamily = f; this.pendingPick = null;
    return bladeForm(b);
  }
}
