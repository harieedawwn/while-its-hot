import { BALANCE } from '@wih/shared';
import { bus } from '../core/events';
import { FEEL } from '../core/feel';
import type { LocalFighter } from '../combat/local-fighter';
import type { TouchControls } from '../input/touch';
import type { FirstPersonCamera } from '../player/camera';
import type { Pipeline } from '../render/pipeline';
import type { Banner } from '../ui/hud/match-end';
import { STR } from '../ui/strings.vi';

export interface GhostDeps {
  lf: LocalFighter; cam: FirstPersonCamera; pipeline: Pipeline; banner: Banner;
  touch?: TouchControls;
  /** Fire-ring damage per second where we stand (0 = inside / no ring / truce). */
  painDps(): number;
}

const U = FEEL.ui;
type State = 'live' | 'dead' | 'ghost';

/**
 * What the local player sees and can do while dead and as a Hồn (ROUND3 §2, server decides): the death grade + "Bạn đã chết" with the
 * camera low, then the white dithered edge vignette with a slight desaturation and no action buttons; and the red edge vignette
 * while we stand outside the fire ring. Presentation only: HP, movement and the ghost flag come from the room.
 */
export class NetGhost {
  state: State = 'live';
  private k = 0;       // death / ghost grade 0..1
  private pain = 0;    // red vignette 0..1
  private pulse = 0;   // flash of the last ring tick
  private off: () => void;

  constructor(private d: GhostDeps) {
    this.off = bus.on('ring:hurt', (e) => { if (e.id === 0) this.pulse = 1; });
  }

  /** We died (server `kill`): dead for deadS, the camera sinks. */
  die(): void {
    this.state = 'dead'; this.k = 0;
    this.d.cam.dead = true; this.d.banner.flash(STR.match.dead, 0, true);
    this.d.touch?.setGhost(true);
  }
  /** The server made us a Hồn: stand up, move, cannot act. */
  rise(): void {
    this.state = 'ghost'; this.d.cam.dead = false; this.d.banner.hide();
    this.d.lf.c.revive(); this.d.lf.c.ghost = true; this.d.lf.c.hp = BALANCE.combat.hp;
    this.d.touch?.setGhost(true);
  }
  /** Solid again (server `spawn`), a new round, or the round ended: back to normal. */
  solid(): void {
    if (this.state === 'live') return;
    this.state = 'live'; this.k = 0; this.d.cam.dead = false; this.d.banner.hide();
    this.d.touch?.setGhost(false);
    this.d.pipeline.setGrade({ desat: 0, edge: 0 }); this.d.pipeline.setVignette(0);
  }

  /** Per render frame. */
  frame(dt: number): void {
    const p = this.d.pipeline, dps = this.state === 'live' ? this.d.painDps() : 0;
    const [lo, hi] = U.pain.vig, want = dps > 0 ? lo + (hi - lo) * Math.min(1, dps / U.pain.dpsFull) : 0;
    const rate = want > this.pain ? 1 / U.pain.in : 1 / U.pain.out;
    this.pain += Math.sign(want - this.pain) * Math.min(Math.abs(want - this.pain), rate * dt);
    this.pulse = Math.max(0, this.pulse - dt / 0.35);
    if (this.state === 'live') {
      const v = this.pain > 0.001 ? Math.min(1, this.pain + this.pulse * 0.3) : 0;
      p.setVignette(v, U.pain.color);
      return;
    }
    this.k = Math.min(1, this.k + dt / (this.state === 'dead' ? U.death.ramp : 0.3));
    if (this.state === 'dead') { p.setGrade({ desat: U.death.desat * this.k, edge: U.death.edge * this.k, steps: U.death.steps }); p.setVignette(0); }
    else { p.setGrade({ desat: U.ghost.desat * this.k, edge: 0 }); p.setVignette(U.ghost.vig * this.k, U.ghost.color); }
  }

  dispose(): void { this.off(); this.solid(); }
}
