import { BALANCE } from '../balance';
import { passivesOf, type WeaponDef } from '../data/weapons';
import { type AttackKind, chargeMulOf, parryWindow } from '../passives';
import { attackShape, type Frames, framesFor, framesOf } from './frames';

const C = BALANCE.combat;

export type FighterPhase =
  | 'idle' | 'windup' | 'active' | 'recover' | 'charge'
  | 'parry' | 'parry_recover' | 'block' | 'stagger' | 'flinch' | 'dead';

/** One sim tick of combat intent. sinceSlide = 0 while sliding, else seconds since the slide ended. */
export interface FighterInput {
  attackPressed: boolean; attackHeld: boolean; parryPressed: boolean; parryHeld: boolean; sinceSlide: number;
}
export const NO_FIGHT: FighterInput = { attackPressed: false, attackHeld: false, parryPressed: false, parryHeld: false, sinceSlide: 1e3 };

export type FighterEvent =
  | { k: 'swing'; kind: AttackKind; combo: number; id: number }
  /** Push the attacker forward m meters over dur seconds (slide attacks from the press, others on the strike). */
  | { k: 'lunge'; m: number; dur: number }
  | { k: 'charge'; id: number }
  | { k: 'parry' } | { k: 'block'; on: boolean } | { k: 'feint' };

/** Blade sweep of this tick: the active window went from u0 to u1 (0..1) of swing `id`. */
export interface SweepSpan { id: number; u0: number; u1: number; }

/**
 * Melee state machine (GDD §5), pure and shared so a server can check "attack active" with the same rules.
 * Tap Đánh = light chain; still held at tapS into a light windup = heavy charge (min/max), release = strike.
 * Đỡ press = parry window, still held after it = block. Hits from outside call stagger/flinch/kill.
 */
export class Fighter {
  phase: FighterPhase = 'idle';
  /** Seconds in the current phase. */
  t = 0;
  kind: AttackKind = 'light';
  combo = 0;
  frames: Frames = framesOf('kiem', 'light', 0);
  swingId = 0;
  /** Seconds the current stagger/flinch lasts. */
  holdS = 0;
  /** Charge time of the last heavy (seconds). */
  chargeS = 0;
  sweep: SweepSpan | null = null;
  readonly events: FighterEvent[] = [];
  /** Extra parry window from modules (khiên tay); passives come from the weapon. */
  parryBonusS = 0;
  /** Heavy charge time × from cards (Đầu nặng). */
  chargeCard = 1;
  private atkAge = 1e3;
  private parAge = 1e3;
  private released = true;
  private sinceEnd = 1e3;
  private nextCombo = 0;
  private def: WeaponDef;
  private sw: SweepSpan = { id: 0, u0: 0, u1: 0 };

  constructor(def: WeaponDef) { this.def = def; }

  get weapon(): WeaponDef { return this.def; }
  setWeapon(def: WeaponDef): void { this.def = def; this.combo = this.nextCombo = 0; }

  get parryWindowS(): number { return parryWindow(passivesOf(this.def), C.parry.windowS) + this.parryBonusS; }
  /** Inside the parry window right now. */
  get parrying(): boolean { return this.phase === 'parry'; }
  get blocking(): boolean { return this.phase === 'block'; }
  get attacking(): boolean { return this.phase === 'windup' || this.phase === 'active' || this.phase === 'recover'; }
  /** Can be interrupted by a hit (windups and charges; active frames trade). */
  get interruptible(): boolean { return this.phase === 'windup' || this.phase === 'charge'; }
  get busy(): boolean { return this.phase !== 'idle' && this.phase !== 'block'; }
  get dead(): boolean { return this.phase === 'dead'; }
  /** Movement speed multiplier for the current phase. */
  get speedMul(): number {
    if (this.phase === 'dead') return 0;
    if (this.phase === 'stagger') return C.slow.stagger;
    if (this.phase === 'flinch') return C.slow.flinch;
    if (this.phase === 'block') return 1 - C.block.slow;
    if (this.phase === 'charge') return C.slow.charge;
    if (this.kind === 'heavy' && this.attacking) return C.slow.heavy;
    return 1;
  }
  /** Seconds from the start of the current attack (windup..recover), or −1. */
  get attackT(): number {
    const f = this.frames;
    if (this.phase === 'windup') return this.t;
    if (this.phase === 'active') return f.w + this.t;
    if (this.phase === 'recover') return f.w + f.a + this.t;
    return -1;
  }

  tick(dt: number, i: FighterInput): void {
    this.events.length = 0;
    this.sweep = null;
    this.atkAge = i.attackPressed ? 0 : this.atkAge + dt;
    this.parAge = i.parryPressed ? 0 : this.parAge + dt;
    if (!i.attackHeld) this.released = true;
    this.sinceEnd += dt;
    this.t += dt;
    const buf = C.bufferS;
    // a few transitions can happen inside one long tick: loop until the phase holds
    for (let guard = 0; guard < 6; guard++) {
      const f = this.frames;
      switch (this.phase) {
        case 'idle':
          if (this.parAge <= buf) { this.startParry(); continue; }
          if (this.atkAge <= buf) { this.startLight(i.sinceSlide); continue; }
          return;
        case 'windup':
          if (this.kind === 'light' && !this.released && this.t >= C.tapS) {
            this.phase = 'charge'; this.events.push({ k: 'charge', id: this.swingId }); continue;
          }
          if (this.t < f.w) return;
          this.t -= f.w; this.phase = 'active'; this.sweep = this.span(0, 0);
          if (this.kind !== 'slide') this.lunge(f.a + 0.04);
          continue;
        case 'active': {
          const u0: number = this.sweep ? this.sweep.u0 : Math.max(0, (this.t - dt) / f.a);
          this.sweep = this.span(u0, Math.min(1, this.t / f.a));
          if (this.t < f.a) return;
          this.t -= f.a; this.phase = 'recover'; continue;
        }
        case 'recover':
          if (this.t >= f.r * 0.5 && this.parAge <= buf) { this.startParry(); continue; }
          if (this.t < f.r) return;
          this.t -= f.r; this.sinceEnd = 0;
          if (this.atkAge <= buf) { this.startLight(i.sinceSlide); continue; }
          this.phase = 'idle'; continue;
        case 'charge': {
          const held = this.t;
          if (this.parAge <= buf) { this.events.push({ k: 'feint' }); this.startParry(); continue; }
          const cm = chargeMulOf(passivesOf(this.def)) * this.chargeCard;
          if ((this.released && held >= C.heavy.minS * cm) || held >= C.heavy.maxS * cm) { this.release(held); continue; }
          return;
        }
        case 'parry':
          if (this.t < this.parryWindowS) return;
          this.t -= this.parryWindowS;
          if (i.parryHeld) { this.phase = 'block'; this.events.push({ k: 'block', on: true }); continue; }
          this.phase = 'parry_recover'; continue;
        case 'parry_recover':
          if (this.t < C.parry.recoverS - this.parryWindowS) return;
          this.phase = 'idle'; this.t = 0; continue;
        case 'block':
          if (!i.parryHeld) { this.phase = 'idle'; this.t = 0; this.events.push({ k: 'block', on: false }); continue; }
          if (this.atkAge <= buf) { this.events.push({ k: 'block', on: false }); this.startLight(i.sinceSlide); continue; }
          return;
        case 'stagger': case 'flinch':
          if (this.t < this.holdS) return;
          this.phase = 'idle'; this.t = 0; continue;
        case 'dead':
          return;
      }
    }
  }

  /** A successful parry: the window ends at once so the parrier can answer. */
  parried(): void { if (this.phase === 'parry') { this.phase = 'idle'; this.t = 0; } }
  /** Knocked off balance (parried, guard broken, heavy hit): no attack or parry for s seconds. */
  stagger(s: number): void { this.enterHold('stagger', s); }
  /** A light hit interrupts a windup or charge. */
  flinch(): void { if (this.interruptible || this.phase === 'idle') this.enterHold('flinch', C.flinchS); }
  kill(): void { this.phase = 'dead'; this.t = 0; this.sweep = null; }
  revive(): void { this.phase = 'idle'; this.t = 0; this.combo = this.nextCombo = 0; this.atkAge = this.parAge = 1e3; }

  private enterHold(p: 'stagger' | 'flinch', s: number): void {
    if (this.phase === 'dead') return;
    if (this.phase === 'block') this.events.push({ k: 'block', on: false });
    this.phase = p; this.t = 0; this.holdS = s; this.sweep = null; this.nextCombo = 0;
  }

  private startParry(): void {
    this.parAge = 1e3;
    this.phase = 'parry'; this.t = 0;
    this.events.push({ k: 'parry' });
  }

  private startLight(sinceSlide: number): void {
    this.atkAge = 1e3;
    this.released = false;
    const slide = sinceSlide <= C.slideAtk.windowS;
    const chain = this.sinceEnd <= C.comboGapS;
    this.combo = slide ? 0 : chain ? this.nextCombo : 0;
    this.kind = slide ? 'slide' : 'light';
    this.begin();
    this.nextCombo = slide ? 1 : (this.combo + 1) % this.def.stats.comboHits;
  }

  private release(held: number): void {
    this.chargeS = held;
    this.kind = 'heavy'; this.combo = 0; this.nextCombo = 0;
    this.begin();
  }

  private begin(): void {
    this.frames = framesFor(this.def, this.kind, this.combo);
    this.phase = 'windup'; this.t = 0;
    this.swingId++;
    this.events.push({ k: 'swing', kind: this.kind, combo: this.combo, id: this.swingId });
    if (this.kind === 'slide') this.lunge(this.frames.w + this.frames.a);
  }

  private span(u0: number, u1: number): SweepSpan {
    const s = this.sw; s.id = this.swingId; s.u0 = u0; s.u1 = u1;
    return s;
  }

  private lunge(dur: number): void {
    const m = attackShape(this.def, this.kind, this.combo).lungeM;
    if (m > 0) this.events.push({ k: 'lunge', m, dur });
  }
}
