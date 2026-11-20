import * as THREE from 'three';
import { BALANCE, type FighterInput, NO_FIGHT, type WeaponDef } from '@wih/shared';
import { bus } from '../core/events';
import type { CollisionWorld } from '../physics/world';
import { IDLE_INPUT } from '../player/character/animator';
import { Character } from '../player/character/character';
import { animInputFromMove } from '../player/character/drive';
import { NO_INPUT, type MoveInput } from '../player/move-state';
import { Player } from '../player/player';
import type { MaterialLib } from '../render/materials/library';
import { Combatant } from './combatant';
import { holdWeapon } from '../weapons/hold';
import { FighterAnim } from './fighter-anim';

/** Training dummy behaviours (phase 08). `attack` = dev: keeps swinging at the player. */
export const DUMMY_MODES = ['idle', 'block', 'parry', 'counter', 'move', 'attack'] as const;
export type DummyMode = (typeof DUMMY_MODES)[number];

const AI = { turn: 7, turnBusy: 2.2, react: 0.05, counterDelay: 0.12, keepDist: 2.4, strafeHz: 0.35, attackFirst: 0.8, attackEvery: 2.2 };

export { gripInHand } from '../weapons/hold';

/**
 * A blacksmith-shaped training dummy: a real Combatant (same rules, hit capsules, knockback, stagger)
 * driven by a tiny AI instead of input. Never emits movement events onto the bus.
 */
export class Dummy {
  readonly c: Combatant;
  readonly ch: Character;
  private anim: FighterAnim;
  private fin: FighterInput = { ...NO_FIGHT };
  private min: MoveInput = { ...NO_INPUT };
  private animIn = { ...IDLE_INPUT };
  private t = 0;
  private parriedSwing = -1;
  private counterAt = -1;
  private counterPresses = 0;
  private off: () => void;

  constructor(id: number, world: CollisionWorld, lib: MaterialLib, weapon: WeaponDef, model: THREE.Object3D,
    private home: THREE.Vector3Tuple, private homeYaw: number, public mode: DummyMode, color: string, armor = 0) {
    this.c = new Combatant(id, new Player(world, home, homeYaw, false), weapon, { armor, team: 100 + id });
    this.ch = new Character(lib, { color, armor });
    holdWeapon(this.ch.hold, model, weapon);
    this.anim = new FighterAnim(this.ch);
    this.off = bus.on('combat:hit', (e) => {
      if (e.target !== id) return;
      this.hitFrom(e.x, e.z);
      if (this.mode === 'counter' && this.counterAt < 0) { this.counterAt = this.t + AI.counterDelay; this.counterPresses = 0; }
    });
  }

  /** One sim tick: think, fight, move. foe = the player. */
  tick(dt: number, foe: Combatant): void {
    this.t += dt;
    const c = this.c, body = c.body, f = c.fighter, fin = this.fin, min = this.min;
    Object.assign(fin, NO_FIGHT); Object.assign(min, NO_INPUT);
    if (!c.alive) {
      if (c.deadT > BALANCE.combat.respawnS) this.respawn();
      c.tick(dt, fin); min.yaw = body.yaw; body.tickWith(dt, min);
      return;
    }
    const me = body.s.pos, fp = foe.body.s.pos;
    const dx = fp.x - me.x, dz = fp.z - me.z, dist = Math.hypot(dx, dz);
    // face the foe (slowly while committed to a swing), aim the sweep at the chest
    const want = Math.atan2(-dx, -dz);
    const rate = f.attacking || f.phase === 'charge' ? AI.turnBusy : AI.turn;
    body.yaw += clampAbs(Math.atan2(Math.sin(want - body.yaw), Math.cos(want - body.yaw)), rate * dt);
    body.pitch = Math.atan2(fp.y + 1.1 - (me.y + BALANCE.eyeHeight), Math.max(0.5, dist)) * 0.8;

    const ff = foe.fighter, threat = foe.alive && dist < foe.weapon.stats.reach + 0.8;
    switch (this.mode) {
      case 'block': this.guard(true); break;
      case 'parry':
        if (threat && ff.phase === 'windup' && ff.frames.w - ff.t <= AI.react && this.parriedSwing !== ff.swingId) {
          this.parriedSwing = ff.swingId; fin.parryPressed = true;
        }
        break;
      case 'counter':
        if (this.counterAt >= 0 && this.t >= this.counterAt) {
          // release the guard, swing twice, then guard again
          if (this.counterPresses < 2 && !f.busy) { fin.attackPressed = true; this.counterPresses++; }
          else if (this.counterPresses < 2 && f.phase === 'recover') { fin.attackPressed = true; this.counterPresses++; }
          if (this.counterPresses >= 2 && !f.attacking) this.counterAt = -1;
        } else this.guard(true);
        break;
      case 'move': {
        const s = Math.sin((this.t + this.c.id) * Math.PI * 2 * AI.strafeHz);
        min.mx = Math.abs(s) > 0.2 ? Math.sign(s) : 0;
        min.my = clampAbs((dist - AI.keepDist) * 0.8, 1);
        break;
      }
      case 'attack':
      {
        // swing at 0.8 s, then every 2.2 s; every third swing is a held heavy
        const k = this.t - AI.attackFirst, n = Math.floor(k / AI.attackEvery), ph = k - n * AI.attackEvery;
        if (k >= 0 && ph < dt * 0.999 && dist < c.weapon.stats.reach + 0.6) fin.attackPressed = true;
        fin.attackHeld = k >= 0 && n % 3 === 2 && ph < 0.7;
      }
        break;
      default: break;
    }
    c.tick(dt, fin);
    this.anim.sync(f);
    min.yaw = body.yaw;
    body.tickWith(dt, min);
  }

  /** Per render frame: pose the body (frozen while its own hit-stop runs). */
  render(dt: number, alpha: number, frozen: boolean): void {
    const v = this.c.body.viewState(alpha);
    this.ch.root.position.copy(v.pos);
    this.ch.root.rotation.y = v.yaw;
    this.ch.update(frozen ? 0 : dt, animInputFromMove(this.c.body.s, v.yaw, this.animIn));
  }


  respawn(): void {
    const s = this.c.body.s;
    s.pos.set(...this.home); s.vel.set(0, 0, 0);
    this.c.body.yaw = this.homeYaw;
    this.c.revive();
    this.anim.sync(this.c.fighter);
  }

  dispose(): void { this.off(); this.ch.dispose(); }

  /** Where the last hit came from (front/back), read when the flinch is synced next tick. */
  private hitFrom(x: number, z: number): void {
    const p = this.c.body.s.pos, y = this.c.body.yaw;
    this.anim.hitFromBack = (x - p.x) * -Math.sin(y) + (z - p.z) * -Math.cos(y) < 0;
  }

  private guard(hold: boolean): void {
    const f = this.c.fighter;
    this.fin.parryHeld = hold;
    if (hold && !f.blocking && !f.parrying && !f.busy) this.fin.parryPressed = true;
  }
}

const clampAbs = (x: number, m: number) => Math.max(-m, Math.min(m, x));
