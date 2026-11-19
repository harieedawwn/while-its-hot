import { BALANCE, bodyCapsules, type Capsule, type DefenderView, Fighter, type FighterInput, type PassiveId, passivesOf, type V3, type WeaponDef } from '@wih/shared';
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
  /** Seconds since the last dash ended (0 while dashing): the dash-attack window. */
  sinceDash = 1e3;
  /** Targets already hit by swing `hitSwing` (one hit per target per swing). */
  readonly hitSet = new Set<number>();
  hitSwing = -1;
  burnT = 0;
  burnDps = 0;
  /** Seconds dead (respawn timing belongs to the owner). */
  deadT = 0;
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
  get alive(): boolean { return !this.fighter.dead; }
  get yaw(): number { return this.body.yaw; }
  get pitch(): number { return this.body.pitch; }

  /** Combat intent for this tick; call before the body's movement tick. */
  tick(dt: number, i: FighterInput): void {
    const s = this.body.s;
    this.sinceDash = s.dashT > 0 ? 0 : this.sinceDash + dt;
    this.fighter.tick(dt, i);
    s.speedMul = this.fighter.speedMul;
    if (this.burnT > 0) { this.burnT -= dt; this.hp -= this.burnDps * dt; }
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
      immune: s.iframe > 0 || f.dead, stamina: s.stamina, armorLevel: this.armor, blockArcDeg: this.blockArcDeg,
    };
  }

  revive(): void { this.hp = BALANCE.combat.hp; this.burnT = 0; this.deadT = 0; this.fighter.revive(); }
}

/** Fighter input from button states (local player) — kept here so dummies and players share the shape. */
export function fighterInput(out: FighterInput, attackPressed: boolean, attackHeld: boolean, parryPressed: boolean, parryHeld: boolean, sinceDash: number): FighterInput {
  out.attackPressed = attackPressed; out.attackHeld = attackHeld; out.parryPressed = parryPressed; out.parryHeld = parryHeld; out.sinceDash = sinceDash;
  return out;
}
