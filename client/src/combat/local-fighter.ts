import type * as THREE from 'three';
import { type FighterInput, NO_FIGHT, type WeaponDef } from '@wih/shared';
import { bus } from '../core/events';
import type { Actions } from '../input/actions';
import type { FirstPersonCamera, ViewState } from '../player/camera';
import type { Player } from '../player/player';
import { Viewmodel } from '../player/viewmodel';
import type { MaterialLib } from '../render/materials/library';
import { marker, mirrorLeft } from '../weapons/weapon';
import { AimAssist } from './aim-assist';
import { sharedControls } from '../input/controls-settings';
import { bindCombatFeel } from './combat-feel';
import type { CombatWorld } from './combat-world';
import { Combatant } from './combatant';
import { VmArms } from './vm/vm-arms';
import { VmDriver } from './vm/vm-driver';

/**
 * The local player's melee side: Combatant (rules), first-person viewmodel with arms and the attack
 * animation driver, aim assist and the combat feel binding. Reusable by every scene that fights.
 * Per sim tick: `tick(dt, actions)` BEFORE the body moves; per frame: `look` then `frame`.
 */
export class LocalFighter {
  readonly c: Combatant;
  readonly vm: Viewmodel;
  readonly aim = new AimAssist();
  private guardLatch = false;
  private aimWanted: boolean;
  private driver: VmDriver;
  private arms: VmArms;
  private gripL: THREE.Object3D | undefined;
  private fin: FighterInput = { ...NO_FIGHT };
  private offs: (() => void)[];

  constructor(player: Player, private world: CombatWorld, lib: MaterialLib, def: WeaponDef, model: THREE.Object3D,
    cam: FirstPersonCamera, aspect: number, o: { level?: number; armor?: number; aim?: boolean } = {}) {
    this.c = world.add(new Combatant(0, player, def, { level: o.level, armor: o.armor, team: 0 }));
    this.vm = new Viewmodel(model, aspect);
    this.gripL = marker(model, 'grip_l');
    this.driver = new VmDriver(this.vm, def);
    this.vm.setLeft(this.driver.fists ? mirrorLeft(model) : null);
    this.arms = new VmArms(lib);
    this.vm.attach(this.arms.root);
    this.aimWanted = o.aim ?? false; this.aim.enabled = this.aimWanted;
    this.offs = [
      bindCombatFeel(() => this.c.id, cam, this.vm),
      bus.on('combat:swing', (e) => { if (e.id === this.c.id) this.aim.snap(this.c); }),
    ];
  }

  setWeapon(def: WeaponDef, model: THREE.Object3D): void {
    this.c.fighter.setWeapon(def);
    this.vm.setModel(model);
    this.gripL = marker(model, 'grip_l');
    this.driver.setWeapon(def);
    this.vm.setLeft(this.driver.fists ? mirrorLeft(model) : null);
  }

  /** Read Đánh/Đỡ from the action layer and run the fighter for one sim tick. */
  tick(dt: number, a: Actions): void {
    const f = this.fin;
    f.attackPressed = a.take('attack'); f.attackHeld = a.isHeld('attack');
    f.parryPressed = a.take('parry'); f.parryHeld = a.isHeld('parry');
    if (!sharedControls().v.holdParry) { // tap mode: a tap raises the guard, the next tap (or a swing, a stagger) lowers it
      if (f.parryPressed) this.guardLatch = !this.guardLatch;
      if (f.attackPressed || this.c.fighter.phase === 'stagger' || this.c.fighter.phase === 'dead') this.guardLatch = false;
      f.parryHeld = this.guardLatch;
    }
    f.sinceSlide = this.c.sinceSlide;
    if (this.c.ghost) Object.assign(f, NO_FIGHT, { sinceSlide: f.sinceSlide }); // a ghost cannot attack or guard
    this.c.tick(dt, f);
  }

  /** Scripted intent (demos, tests). sinceSlide is filled in. */
  tickWith(dt: number, i: Omit<FighterInput, 'sinceSlide'>): void {
    Object.assign(this.fin, i, { sinceSlide: this.c.sinceSlide });
    this.c.tick(dt, this.fin);
  }

  /** Can the body take jump/slide presses right now. */
  get canAct(): boolean { const p = this.c.fighter.phase; return p !== 'stagger' && p !== 'dead'; }

  /** Look input in radians after aim-assist slowdown; pulls toward the target when the player acts. */
  look(dx: number, dy: number, dt: number, moving: boolean): { dx: number; dy: number } {
    this.aim.enabled = this.aimWanted && sharedControls().v.aimAssist;
    const k = this.aim.update(this.c, this.world.list);
    if (moving || dx !== 0 || dy !== 0 || this.c.fighter.attacking) this.aim.pull(this.c, dt);
    return { dx: dx * k, dy: dy * k };
  }

  /** Per render frame: animation driver → viewmodel springs → forearms. */
  frame(dt: number, cam: FirstPersonCamera, v: ViewState): void {
    this.driver.update(dt, this.c.fighter, cam.freezeS > 0);
    this.vm.update(dt, cam, v);
    this.arms.update(this.vm.hand, this.gripL, this.vm.handL);
  }

  get armTris(): number { return this.arms.tris; }

  dispose(): void { this.offs.forEach((o) => o()); this.vm.dispose(); }
}
