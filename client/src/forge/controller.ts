import type * as THREE from 'three';
import { BALANCE, type Family, type ForgeOp, NO_FIGHT, type ForgeSession, type StrikeResult, type Timing } from '@wih/shared';
import type { LocalFighter } from '../combat/local-fighter';
import { bus } from '../core/events';
import { FEEL } from '../core/feel';
import type { Actions } from '../input/actions';
import type { TouchControls } from '../input/touch';
import type { FirstPersonCamera } from '../player/camera';
import { NO_INPUT } from '../player/move-state';
import type { Player } from '../player/player';
import type { FlashKind, ForgeHud } from '../ui/forge-hud';
import type { Anvil } from './anvil';
import { StanceCamera } from './stance-cam';
import type { ForgeStage } from './stage';

const F = BALANCE.forge, S = FEEL.forge;

export interface ForgeDeps {
  player: Player; lf: LocalFighter; anvil: Anvil; stage: ForgeStage; session: ForgeSession; hud: ForgeHud;
  touch?: TouchControls;
  /** A fresh weapon model for a form id (viewmodel and anvil each get their own). */
  loadModel(id: string): Promise<THREE.Object3D>;
  /** Armor level or modules changed (refresh the third-person body, if any). */
  onArmor?(level: number): void;
  /** Online: the server rolls strikes (results come back through `reveal`) and hears every predicted op. */
  link?: ForgeLink;
}
export interface ForgeLink { op(o: Exclude<ForgeOp, { k: 'strike' }>): void; strike(timing: Timing): void }

/**
 * The local smith's forging loop (GDD §6, §7): place/lift the anvil, enter and leave the stance, heat (hold
 * Đánh), strike (Rèn), frenzy (Đỡ when full), target toggle and the weapon slot swap (Đổi), the +3 family
 * pick and form swaps. Rules are `ForgeSession`/`AnvilRule` (shared); this is input + presentation.
 * Owns the per-tick body dispatch: while in stance the body and fighter get no input.
 */
export class ForgeController {
  inStance = false;
  readonly stanceCam = new StanceCamera();
  private pickT = 0;
  private shown = '';
  private token = 0;
  private heating = false;
  private ctx = { forge: false, anvil: false };
  private off: () => void;

  constructor(private d: ForgeDeps) {
    this.off = bus.on('combat:hit', (e) => {
      if (e.target !== d.lf.c.id || !this.inStance || e.result === 'blocked') return;
      this.leave(); d.session.onHitOut();
    });
    d.stage.setTarget(d.session.target);
    void this.syncWeapon();
  }

  /** Viewmodel (the weapon in hand) shows until the camera is over the anvil. */
  get showViewmodel(): boolean { return this.stanceCam.k < 0.4; }

  /** Show the blade/hammer on the anvil (the smith is working) vs. in hand. */
  private get working(): boolean { return this.stanceCam.k >= 0.4; }

  /** Put the right form in the hand and on the anvil. */
  async syncWeapon(force = false): Promise<void> {
    const { session, lf, stage, loadModel } = this.d, def = session.form;
    lf.c.level = session.blade.level;
    if (def.id === this.shown && !force) return;
    this.shown = def.id;
    const t = ++this.token;
    const [vm, st] = await Promise.all([loadModel(def.id), loadModel(def.id)]);
    if (t !== this.token) return;
    lf.setWeapon(def, vm); stage.setBlade(st); stage.setHeat(session.heat);
  }

  enter(): boolean {
    if (this.inStance || !this.d.anvil.inReach(this.d.player.s.pos) || !this.d.lf.canAct) return false;
    this.inStance = true;
    this.d.link?.op({ k: 'stance', on: true });
    this.d.player.s.vel.set(0, this.d.player.s.vel.y, 0);
    bus.emit('forge:stance', { on: true, owner: this.d.lf.c.id });
    return true;
  }

  leave(): void {
    if (!this.inStance) return;
    this.inStance = false; this.d.session.endFrenzy(); this.d.hud.closePick(); this.pickT = 0;
    this.d.link?.op({ k: 'stance', on: false }); this.d.stage.lower();
    this.setHeating(false); this.d.lf.c.invuln = false;
    bus.emit('forge:stance', { on: false, owner: this.d.lf.c.id });
  }

  private setHeating(on: boolean): void {
    if (on === this.heating) return;
    this.heating = on; this.d.stage.setNung(on);
    this.d.link?.op({ k: 'heat', on });
    bus.emit('forge:heating', { on });
  }

  /** One sim tick. Replaces `lf.tick` + `player.tick` in the scene. */
  tick(dt: number, a: Actions): void {
    const { session, anvil, lf, player } = this.d;
    anvil.tick(dt);
    const near = anvil.inReach(player.s.pos);
    if ((!near && this.inStance) || !lf.c.alive || !lf.canAct) this.leave();

    const forgePress = a.take('forge'), anvilPress = a.take('anvil'), swapPress = a.take('swap');
    if (anvilPress && !this.inStance) {
      if (anvil.rule.canPlace) { if (lf.canAct) anvil.place(player.s.pos, player.yaw); }
      else if (anvil.rule.canLift && anvil.dist(player.s.pos) <= F.anvil.useRadius * 1.5) anvil.lift();
    }
    if (this.inStance) this.stanceTick(dt, a, forgePress, swapPress);
    else {
      if (forgePress) this.enter();
      if (swapPress && !lf.c.fighter.attacking && session.swapSlot()) { this.d.link?.op({ k: 'swap' }); void this.syncWeapon(true); }
      session.tick(dt, false);
    }
    if (this.inStance) { lf.tickWith(dt, NO_FIGHT); player.tickWith(dt, { ...NO_INPUT, yaw: player.yaw }); }
    else if (session.swapT > 0) { // Đổi in progress: no attack until the new blade is up
      a.take('attack');
      lf.tickWith(dt, { attackPressed: false, attackHeld: false, parryPressed: a.take('parry'), parryHeld: a.isHeld('parry') });
      player.tick(dt, a, lf.canAct);
    } else { lf.tick(dt, a); player.tick(dt, a, lf.canAct); }

    lf.c.invuln = this.inStance && session.immune;
    if (this.pickT > 0) { this.pickT -= dt; if (this.pickT <= 0) this.pick(session.lastFamily); }
    this.setContexts(near);
  }

  private stanceTick(dt: number, a: Actions, forgePress: boolean, swapPress: boolean): void {
    const { session, hud } = this.d;
    if (Math.hypot(a.move.x, a.move.y) > S.exitStick || a.take('jump') || a.take('slide')) { this.leave(); return; }
    a.take('attack');
    this.setHeating(a.isHeld('attack') && !hud.picking);
    const link = this.d.link;
    if (swapPress && !hud.picking) { session.toggleTarget(); link?.op({ k: 'target' }); this.d.stage.setTarget(session.target); }
    if (a.take('parry') && session.activateFrenzy()) { link?.op({ k: 'frenzy' }); bus.emit('forge:frenzy', { on: true }); }
    if (forgePress && session.canStrike) {
      if (!link) this.report(session.strike(), false);
      else { this.d.stage.raise(); link.strike(session.timingNow()); session.cooldown = F.strike.cadenceS * session.mods.cadenceMul; }
    }
    const wasFrenzy = session.frenzy;
    for (const r of session.tick(dt, this.heating)) this.report(r, true);
    if (wasFrenzy && !session.frenzy) bus.emit('forge:frenzy', { on: false });
  }

  /** Online: the server's roll for one of our strikes (or a frenzy auto-strike) arrived; the hammer falls now. */
  reveal(r: StrikeResult, auto: boolean): void { if (this.inStance || auto) this.report(r, auto); }

  private report(r: StrikeResult, auto: boolean): void {
    const { session, stage, hud, anvil, lf } = this.d;
    stage.strike();
    const p = stage.hitPoint(anvil.pos.clone());
    bus.emit('forge:strike', { outcome: r.outcome, perfect: r.timing === 'perfect', auto, target: r.target, level: r.level, refused: r.refused, broke: r.broke, heat: session.heat, x: p.x, y: p.y, z: p.z });
    bus.emit('cam:trauma', { amount: S.strike.trauma[r.outcome] });
    const up = (r.outcome === 'tuyet' || r.outcome === 'dat') && !r.refused;
    bus.emit('cam:hitstop', { ms: up ? S.strike.levelStopMs : S.strike.hitStopMs });
    hud.flash(r.broke ? 'broke' : r.refused ? 'refused' : (r.outcome as FlashKind));
    if (r.target === 'armor') { lf.c.armor = session.armor; this.d.onArmor?.(session.armor); }
    if (r.pick) { hud.openPick(session.lastFamily, F.stance.pickS, (f) => this.pick(f)); this.pickT = F.stance.pickS; }
    if (r.evolved) bus.emit('forge:evolve', { form: r.evolved.id, family: r.evolved.family as Family });
    if (r.target === 'blade' && (r.evolved || r.broke)) void this.syncWeapon(true);
    else lf.c.level = session.blade.level;
  }

  /** The family pick resolved (a tap, a key, or the timer's default). */
  private pick(f: Family): void {
    const form = this.d.session.pickFamily(f);
    this.pickT = 0; this.d.hud.closePick();
    if (!form) return;
    this.d.link?.op({ k: 'pick', f });
    bus.emit('forge:evolve', { form: form.id, family: f });
    void this.syncWeapon(true);
  }

  private setContexts(near: boolean): void {
    const { touch, anvil, player } = this.d;
    if (!touch) return;
    const forge = near || this.inStance;
    const anv = !this.inStance && (anvil.rule.canPlace || (anvil.rule.canLift && anvil.dist(player.s.pos) <= F.anvil.useRadius * 1.5));
    if (forge !== this.ctx.forge) { this.ctx.forge = forge; touch.setContext('forge', forge); }
    if (anv !== this.ctx.anvil) { this.ctx.anvil = anv; touch.setContext('anvil', anv); }
  }

  /** Button faces: flame / eye in the stance, the held slot digit on Đổi otherwise. */
  private faces(): void {
    const { touch } = this.d;
    if (!touch) return;
    const s = this.d.session, st = this.inStance;
    touch.setIcon('attack', st ? 'flame' : null);
    touch.setIcon('parry', st ? 'eye' : null);
    touch.setDim('parry', st && s.frenzyMeter < F.frenzy.full);
    touch.setIcon('swap', st ? null : s.slot === 0 ? 'slot1' : 'slot2');
    touch.setDim('swap', !st && !s.filled(1 - s.slot));
  }

  /** Per render frame, after `cam.update`. */
  frame(dt: number, time: number, cam: FirstPersonCamera): void {
    const { anvil, stage, session, hud } = this.d;
    anvil.animate();
    this.faces();
    this.stanceCam.apply(dt, this.inStance, anvil, cam.camera);
    stage.root.visible = this.working;
    stage.setHeat(session.heat);
    stage.update(dt, time);
    hud.show(this.inStance && this.stanceCam.k > 0.5);
    hud.update({
      ring: session.ring, zoneC: session.zoneC, zoneHalf: session.zoneHalf, cooling: !session.canStrike,
      heat: session.heat, level: session.level, target: session.target, frenzyMeter: session.frenzyMeter, frenzyOn: session.frenzy,
    });
  }

  dispose(): void { this.off(); this.leave(); }
}
