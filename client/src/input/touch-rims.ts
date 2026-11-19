import { BALANCE } from '@wih/shared';
import { bus } from '../core/events';
import type { ControlId } from './touch-layout';

/** Rim look: 'cd' = steel arc draining (cooldown / time left), 'charge' = bone arc filling, 'full' = charged (--iron-hot). */
export type RimTone = 'cd' | 'charge' | 'full';
export type RimDraw = (id: ControlId, v: number, tone: RimTone) => void;

interface Timer { id: ControlId; t0: number; dur: number; tone: RimTone }
const now = () => performance.now() / 1000;

/**
 * Cooldown and charge on the button rims (phase 22). Reads gameplay only through the bus plus which buttons
 * this touch layer holds, so it never reaches into gameplay. Slide: time left while sliding, then the cooldown.
 * Đánh: fills from the heavy charge start to its max, turns hot once a heavy is ready. Đỡ: parry recovery.
 */
export class TouchRims {
  private timers = new Map<ControlId, Timer>();
  private pressedAt = new Map<ControlId, number>();
  private charge0 = -1;
  private raf = 0;
  private offs: (() => void)[] = [];

  constructor(private draw: RimDraw, private held: (id: ControlId) => boolean) {
    const M = BALANCE.move.slide, C = BALANCE.combat;
    this.offs.push(
      bus.on('move:slide', (e) => this.start({ id: 'slide', t0: now(), dur: e.on ? M.maxS : M.cooldownS, tone: 'cd' })),
      bus.on('combat:charge', () => { if (this.held('attack')) { this.charge0 = now(); this.kick(); } }),
      bus.on('combat:swing', () => { if (this.charge0 >= 0) { this.charge0 = -1; this.draw('attack', 0, 'charge'); } }),
      bus.on('combat:guard', (e) => {
        if (e.act === 'parry' && now() - (this.pressedAt.get('parry') ?? -9) < 0.25) this.start({ id: 'parry', t0: now(), dur: C.parry.recoverS, tone: 'cd' });
      }),
    );
  }

  /** Called by the touch layer on every press/release. */
  press(id: ControlId, on: boolean): void {
    if (on) this.pressedAt.set(id, now());
    else if (id === 'attack' && this.charge0 >= 0) { this.charge0 = -1; this.draw('attack', 0, 'charge'); }
  }

  private start(t: Timer): void { this.timers.set(t.id, t); this.kick(); }
  private kick(): void { if (!this.raf) this.raf = requestAnimationFrame(this.frame); }

  private frame = (): void => {
    this.raf = 0;
    const t = now();
    for (const [id, k] of this.timers) {
      const u = Math.min(1, (t - k.t0) / k.dur);
      this.draw(id, 1 - u, k.tone); // the arc drains as the time left runs out
      if (u >= 1) { this.timers.delete(id); this.draw(id, 0, k.tone); }
    }
    if (this.charge0 >= 0) {
      const H = BALANCE.combat.heavy, e = t - this.charge0;
      this.draw('attack', Math.min(1, e / H.maxS), e >= H.minS ? 'full' : 'charge');
    }
    if (this.timers.size || this.charge0 >= 0) this.kick();
  };

  clear(): void { this.timers.clear(); this.charge0 = -1; for (const id of ['slide', 'attack', 'parry'] as const) this.draw(id, 0, 'cd'); }
  dispose(): void { cancelAnimationFrame(this.raf); this.offs.forEach((f) => f()); }
}
