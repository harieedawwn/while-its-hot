import { BALANCE, type Fighter, type WeaponDef } from '@wih/shared';
import { FEEL } from '../../core/feel';
import { noise1 } from '../../core/noise';
import type { Viewmodel } from '../../player/viewmodel';
import { type VmClip, VmPose, sampleClip } from './vm-pose';
import { type VmSet, vmSet } from './vm-clips';

const C = BALANCE.combat;

/**
 * Drives the viewmodel hand from the local Fighter (LOOK §6). Attack clips are sampled on the fighter's
 * own timeline, minus the visual time owed to hit-stop (frozen while the camera is frozen, then paid back
 * faster) — the rules clock never stops. Guard/idle poses are eased in; attack poses follow tightly.
 */
export class VmDriver {
  private set: VmSet;
  private out = new VmPose();
  private target = new VmPose();
  private tmp = new VmPose();
  private lag = 0;
  private swing = -1;
  private t = 0;

  constructor(private vm: Viewmodel, def: WeaponDef) {
    this.set = vmSet(def);
    this.out.setKey(this.set.rest);
    vm.pose = { pos: this.out.pos, quat: this.out.quat };
  }

  setWeapon(def: WeaponDef): void { this.set = vmSet(def); }

  /** dt = render frame time; frozen = the camera's hit-stop is active. */
  update(dt: number, f: Fighter, frozen: boolean): void {
    this.t += dt;
    if (f.swingId !== this.swing) { this.swing = f.swingId; this.lag = 0; }
    if (frozen) { this.lag += dt; return; }
    this.lag = Math.max(0, this.lag - dt * FEEL.combat.catchUp);
    const set = this.set, tg = this.target;
    let rate = 16;
    switch (f.phase) {
      case 'windup': case 'active': case 'recover': {
        const fr = f.frames, at = Math.max(0, f.attackT - this.lag);
        const s = at < fr.w ? at / fr.w : at < fr.w + fr.a ? 1 + (at - fr.w) / fr.a : Math.min(3, 2 + (at - fr.w - fr.a) / fr.r);
        const c: VmClip = f.kind === 'heavy' ? set.heavy : f.kind === 'slide' ? set.slide : set.light[f.combo] ?? set.light[0];
        sampleClip(c, s, tg);
        rate = 70;
        break;
      }
      case 'charge': {
        tg.setKey(set.charge);
        // the held weight trembles harder as the charge fills
        const k = Math.min(1, f.t / C.heavy.maxS), a = 0.004 + 0.01 * k;
        tg.pos.x += noise1(this.t * 23, 1) * a; tg.pos.y += noise1(this.t * 19, 2) * a;
        rate = 22;
        break;
      }
      case 'parry': case 'parry_recover': {
        const el = f.phase === 'parry' ? f.t : f.parryWindowS + f.t;
        sampleClip(set.parry, el / C.parry.recoverS, tg);
        rate = 40;
        break;
      }
      case 'block': tg.setKey(set.block); rate = 24; break;
      case 'stagger': tg.setKey(set.stagger); rate = 14; break;
      case 'flinch': tg.setKey(set.rest); this.tmp.setKey(set.stagger); tg.towards(this.tmp, 0.45); rate = 30; break;
      case 'dead': tg.setKey(set.stagger); tg.pos.y -= 0.3; rate = 4; break;
      default: tg.setKey(set.rest);
    }
    this.out.towards(tg, 1 - Math.exp(-rate * dt));
  }
}
