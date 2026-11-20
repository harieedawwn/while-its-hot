import { BALANCE } from '../balance';
import { type Family, formFor, passivesOf, type WeaponDef } from '../data/weapons';
import type { ModuleId } from '../data/modules';
import { frenzyZone, type ForgeMods, type ForgeTarget, heatZoneMul, NO_MODS, type Outcome, pLen, type Timing, zoneFrac } from './odds';
import { phaseAt, type RingBase, ringDist, zoneAfter, hash01 } from './ring';

/**
 * One player's forging state (ROUND3 §1, GDD §6/§7): two blades, armor, heat, the strike ring and Nhập thần.
 * Pure and deterministic given the rand source. The ring is a function of the clock (`time`, seconds): the
 * server rolls with this, the client predicts the verdict and draws the same ring every frame.
 */
const F = BALANCE.forge, W = BALANCE.weapons;

export interface Blade { family: Family | null; level: number; /** Highest level ever: the form never goes backwards. */ best: number; }
export const newBlade = (): Blade => ({ family: null, level: 0, best: 0 });
export const bladeForm = (b: Blade): WeaponDef => formFor(b.family, b.best);

export interface StrikeResult {
  outcome: Outcome; timing: Timing; target: ForgeTarget; delta: number; level: number;
  /** The strike would have gained a level but the training cap (or max level) refused it. */
  refused: boolean;
  /** Blade reached the pick level with no family yet. */
  pick: boolean;
  /** Struck during Nhập thần. */
  frenzy: boolean;
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
  armor = 0;
  modules: ModuleId[] = [];
  target: ForgeTarget = 'blade';
  heat = 0;
  /** The shared clock in seconds (the caller sets it: wall time offline, match time online). */
  time = 0;
  /** Seed of the zone sequence, how many zones were drawn from it, and the current zone center (0..1). */
  seed: number;
  zoneK = 0;
  zoneC = 0;
  ring: RingBase = { p0: 0, t0: 0, lap: F.ring.lapS };
  /** Nhập thần runs from frenzyStart to frenzyEnd (0 = not running). */
  frenzyStart = 0;
  frenzyEnd = 0;
  frenzyMeter = 0;
  /** The last strike was a Vỡ (card: sureAfterVo). */
  afterVo = false;
  lastStrikeAt = -1e9;
  mods: ForgeMods = { ...NO_MODS };
  caps: FamilyCaps = null;
  /** Family chosen last time (the default of the 3 s pick). */
  lastFamily: Family = 'kiem';
  /** Set when a blade needs its family picked; cleared by pickFamily(). */
  pendingPick: number | null = null;
  /** Seconds left of the blade switch (no attack while > 0). */
  swapT = 0;

  constructor(private rand: RandFn, seed?: number) {
    this.seed = seed ?? Math.floor(rand() * 2147483647);
    this.zoneC = hash01(this.seed, 99991);
  }

  get blade(): Blade { return this.blades[this.slot]; }
  get frenzy(): boolean { return this.frenzyEnd > 0 && this.time < this.frenzyEnd; }
  /** Seconds of Nhập thần left. */
  get frenzyT(): number { return this.frenzy ? this.frenzyEnd - this.time : 0; }
  /** Nhập thần at the anvil makes you untouchable (the caller checks "at the anvil"). */
  get immune(): boolean { return this.frenzy; }
  /** Level of whatever is being forged and the form the active blade shows. */
  get level(): number { return this.target === 'armor' ? this.armor : this.blade.level; }
  get form(): WeaponDef { return bladeForm(this.blade); }
  get passives() { return passivesOf(this.form); }
  get canStrike(): boolean { return this.pendingPick === null; }
  get marker(): number { return phaseAt(this.ring, this.time); }

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

  /** Move the clock; ends Nhập thần when its time is up (the ring goes back to the normal lap right at the end). */
  setTime(t: number): void {
    this.time = t;
    if (this.frenzyEnd > 0 && t >= this.frenzyEnd) this.endFrenzy(this.frenzyEnd);
  }

  /** Half the zone, as a fraction of the ring, at time t (heat band, level, mods; Nhập thần has its own size). */
  zoneHalfAt(t: number = this.time): number {
    const fr = this.frenzyEnd > 0 && t >= this.frenzyStart && t < this.frenzyEnd;
    const base = fr ? frenzyZone(t - this.frenzyStart, this.frenzyEnd - this.frenzyStart) : zoneFrac(this.level, this.target) * heatZoneMul(this.heat);
    return Math.min(F.zone.maxFrac, base * this.mods.zoneMul) / 2;
  }
  get zoneHalf(): number { return this.zoneHalfAt(this.time); }

  /** Trúng or Trượt for a strike stamped `at`; `tol` seconds of slack widens the zone (the server uses it). */
  verdict(at: number = this.time, tol = 0): Timing {
    return ringDist(phaseAt(this.ring, at), this.zoneC) <= this.zoneHalfAt(at) + tol / this.ring.lap ? 'hit' : 'miss';
  }

  /** Advance heat and the blade switch (the clock itself is `setTime`). Heat is frozen during Nhập thần. */
  tick(dt: number, heating: boolean): void {
    const H = F.heat;
    this.swapT = Math.max(0, this.swapT - dt);
    if (this.frenzy) return;
    this.heat = heating ? Math.min(1, this.heat + H.holdPerS * this.mods.heatMul * dt)
      : Math.max(0, this.heat - H.decayPerS * this.mods.decayMul * dt);
  }

  /** A new round (cage): transient forging state resets, blades, armor and slot carry over. */
  newRound(): void {
    this.endFrenzy(this.time); this.heat = 0; this.frenzyMeter = 0; this.swapT = 0; this.target = 'blade'; this.afterVo = false;
  }

  /** End of round: carried blades lose `bl` levels, armor `al` (min 0). The form follows the level (best restarts from it); returns [from, to] per blade and armor. */
  carryLoss(bl: number, al: number): { blades: [number, number][]; armor: [number, number] } {
    const blades: [number, number][] = [];
    this.blades.forEach((b, i) => {
      if (i >= this.carried) return;
      const from = b.level; b.level = Math.max(0, b.level - bl); b.best = b.level; blades.push([from, b.level]);
    });
    const a: [number, number] = [this.armor, Math.max(0, this.armor - al)];
    this.armor = a[1];
    return { blades, armor: a };
  }

  /** Heat is knocked down when the smith is hit out of the stance. */
  onHitOut(): void { this.heat = Math.max(0, this.heat - F.heat.hitCost); }

  /** Start Nhập thần at time `at` (the eye button): meter must be full. The ring switches to the fast lap with no jump. */
  activateFrenzy(at: number = this.time): boolean {
    if (this.frenzyMeter < F.frenzy.full || this.frenzy) return false;
    this.frenzyMeter = 0; this.frenzyStart = at; this.frenzyEnd = at + F.frenzy.durS + this.mods.frenzyPlusS;
    this.rebase(at, F.frenzy.lapS);
    this.jumpZone(at, this.zoneHalfAt(at));
    return true;
  }
  /** Leaving the stance ends Nhập thần early. */
  endFrenzy(at: number = this.time): void {
    if (this.frenzyEnd <= 0) return;
    this.frenzyEnd = 0; this.frenzyStart = 0;
    this.rebase(at, F.ring.lapS);
  }
  private rebase(t: number, lap: number): void { this.ring = { p0: phaseAt(this.ring, t), t0: t, lap }; }
  private jumpZone(at: number, half: number): void {
    const fr = this.frenzyEnd > 0 && at >= this.frenzyStart && at < this.frenzyEnd;
    const R = F.ring, N = F.frenzy;
    this.zoneC = fr ? zoneAfter(phaseAt(this.ring, at), half, this.seed, this.zoneK++, N.gapMin, N.gapMax, N.clear)
      : zoneAfter(phaseAt(this.ring, at), half, this.seed, this.zoneK++, R.gapMin, R.gapMax, R.clear);
  }

  private capFor(b: Blade): number {
    if (!this.caps) return W.maxLevel;
    return b.family ? Math.min(W.maxLevel, this.caps[b.family]) : Math.max(W.familyPick, 0);
  }

  /** Client online: the verdict for a strike stamped `at`; the zone jumps on a Trúng exactly as the server's will. No roll. */
  predict(at: number = this.time): Timing {
    this.setTime(Math.max(this.time, at));
    const half = this.zoneHalfAt(at), t = this.verdict(at);
    this.lastStrikeAt = at;
    if (t === 'hit') this.jumpZone(at, half);
    return t;
  }

  /** A full strike stamped `at` (offline, and the server with `tol`): verdict, roll, level, heat, meter, zone jump. */
  strike(at: number = this.time, tol = 0): StrikeResult {
    if (at > this.time) this.setTime(at);
    const armor = this.target === 'armor', b = this.blade, level = armor ? this.armor : b.level;
    const fr = this.frenzyEnd > 0 && at >= this.frenzyStart && at < this.frenzyEnd, half = this.zoneHalfAt(at);
    const timing = this.verdict(at, tol), M = this.mods;
    let outcome: Outcome, plus = 1;
    if (timing === 'miss') {
      outcome = fr ? (this.rand() < F.frenzy.voChance ? 'vo' : 'giu') : 'vo';
      if (outcome === 'vo' && !fr && M.guardVo > 0) { M.guardVo--; outcome = 'giu'; }
    } else {
      const p = Math.max(0.02, Math.min(1, pLen(level, this.target) - M.notoriety * F.notorietyP - (fr ? F.frenzy.pMinus : 0)));
      const sure = M.sureAfterVo && this.afterVo;
      outcome = sure || this.rand() < p ? 'len' : 'giu';
      if (outcome === 'len' && M.plus2Once > 0) { M.plus2Once--; plus = 2; }
    }
    const max = armor ? F.armor.maxLevel : this.capFor(b);
    let delta = outcome === 'len' ? plus : outcome === 'vo' ? -F.p.voLoss : 0, refused = false;
    if (delta > 0 && level >= max) { refused = true; delta = 0; }
    else if (delta > 0) delta = Math.min(delta, max - level);
    else if (delta < 0) delta = -Math.min(-delta, level) || 0;
    const res: StrikeResult = { outcome, timing, target: this.target, delta, level, refused, pick: false, frenzy: fr, evolved: null };
    this.applyLevel(res, armor, b, max);
    if (outcome === 'len' && !refused && !fr) this.frenzyMeter = Math.min(F.frenzy.full, this.frenzyMeter + F.frenzy.fill * M.frenzyFillMul);
    if (!fr) this.heat = Math.max(0, this.heat - F.heat.strikeCost * M.costMul);
    this.afterVo = outcome === 'vo';
    this.lastStrikeAt = at;
    if (timing === 'hit') this.jumpZone(at, half);
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
