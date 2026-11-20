import { BALANCE, bodyCapsules, type Capsule, type DefenderView, Fighter, type FighterInput, NO_FIGHT, type PassiveId, passivesOf, type StatusKind, traitsOf, type V3, type WeaponDef } from '@wih/shared';
import { bus } from '../core/events';
import { afflict } from '../player/afflict';
import { bodyHeight } from '../player/move-state';
import type { Player } from '../player/player';

export interface CombatantOpts { level?: number; armor?: number; team?: number; blockArcDeg?: number; }

/**
 * One fighter in the local combat world: a movement body (Player, also used for dummies with emit=false),
 * the shared Fighter rules, HP and the numbers the hit resolver needs. Owners feed it a FighterInput
 * before the movement tick; CombatWorld does sweeps and events after it.
 */
export class Combatant {
  readonly fighter: Fighter;
  hp: number = BALANCE.combat.hp;
  level: number;
  armor: number;
  team: number;
  blockArcDeg?: number;
  /** Seconds since the last slide ended (0 while sliding): the slide-attack window. */
  sinceSlide = 1e3;
  /** Targets already hit by swing `hitSwing` (one hit per target per swing). */
  readonly hitSet = new Set<number>();
  hitSwing = -1;
  /** Untouchable (Nhập thần at the anvil). */
  invuln = false;
  burnT = 0;
  burnDps = 0;
  /** Seconds left invisible (dao_bong…): remotes and dummies draw it veiled; 0 = visible. */
  invisT = 0;
  /** Seconds dead (respawn timing belongs to the owner). */
  deadT = 0;
  /** Online: hp, death and revive come from the server; CombatWorld never kills this one by itself. */
  netOwned = false;
  /** Hồn (ghost, ROUND3 §2): stands and moves, cannot be hit or act; counts as not alive for every combat rule. */
  ghost = false;
  private eyeV: V3 = [0, 0, 0];

  constructor(readonly id: number, readonly body: Player, weapon: WeaponDef, o: CombatantOpts = {}) {
    this.fighter = new Fighter(weapon);
    this.level = o.level ?? 0;
    this.armor = o.armor ?? 0;
    this.team = o.team ?? id;
    this.blockArcDeg = o.blockArcDeg;
  }

  get weapon(): WeaponDef { return this.fighter.weapon; }
  get passives(): PassiveId[] { return passivesOf(this.weapon); }
  get alive(): boolean { return !this.fighter.dead && !this.ghost; }
  get yaw(): number { return this.body.yaw; }
  get pitch(): number { return this.body.pitch; }

  /** Combat intent for this tick; call before the body's movement tick. */
  tick(dt: number, i: FighterInput): void {
    const s = this.body.s;
    this.sinceSlide = s.sliding ? 0 : this.sinceSlide + dt;
    this.fighter.tick(dt, s.af.freezeT > 0 ? NO_FIGHT : i);
    s.traits = traitsOf(this.weapon);
    s.speedMul = this.fighter.speedMul * (this.ghost ? BALANCE.match.ghost.speedMul : 1);
    if (this.burnT > 0) { this.burnT -= dt; this.hp -= this.burnDps * dt; }
    this.invisT = Math.max(0, this.invisT - dt);
    if (this.fighter.dead) this.deadT += dt;
  }

  /** Eye point (attack origin) in world space. */
  eye(): V3 {
    const p = this.body.s.pos, e = this.eyeV;
    e[0] = p.x; e[1] = p.y + bodyHeight(this.body.s) * (BALANCE.eyeHeight / BALANCE.move.body.height); e[2] = p.z;
    return e;
  }

  capsules(): Capsule[] {
    const p = this.body.s.pos;
    return bodyCapsules([p.x, p.y, p.z], bodyHeight(this.body.s));
  }

  view(): DefenderView {
    const s = this.body.s, f = this.fighter;
    return {
      x: s.pos.x, z: s.pos.z, yaw: this.yaw, parrying: f.parrying, blocking: f.blocking,
      immune: s.iframe > 0 || f.dead || this.ghost || this.invuln, stamina: s.stamina, armorLevel: this.armor, blockArcDeg: this.blockArcDeg, taken: traitsOf(this.weapon).taken,
    };
  }

  /** A form-effect status on this body (offline sink or the server's `status`); everyone's presentation hears it. */
  status(k: StatusKind, s: number, v: number, p?: readonly number[]): void {
    afflict(this.body.s.af, k, s, v, p);
    if (k === 'invis') this.invisT = s;
    const q = this.body.s.pos;
    bus.emit('fx:status', { id: this.id, k, s, x: q.x, y: q.y, z: q.z });
  }

  revive(): void { this.ghost = false; this.hp = BALANCE.combat.hp; this.burnT = 0; this.invisT = 0; this.deadT = 0; Object.assign(this.body.s.af, { slowT: 0, freezeT: 0, pinT: 0, slipT: 0, wellT: 0, bounceT: 0, hasteT: 0 }); this.fighter.revive(); }
}

/** Fighter input from button states (local player) — kept here so dummies and players share the shape. */
export function fighterInput(out: FighterInput, attackPressed: boolean, attackHeld: boolean, parryPressed: boolean, parryHeld: boolean, sinceSlide: number): FighterInput {
  out.attackPressed = attackPressed; out.attackHeld = attackHeld; out.parryPressed = parryPressed; out.parryHeld = parryHeld; out.sinceSlide = sinceSlide;
  return out;
}
