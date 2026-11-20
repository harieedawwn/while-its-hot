import { FEEL } from '../core/feel';
import type { Combatant } from './combatant';

const A = FEEL.aim;
const D2R = Math.PI / 180;
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

/**
 * Touch aim assist (GDD §5): picks the enemy closest to the crosshair inside the reach cone, slows the
 * look by 30% while on it, pulls the view gently toward its chest while the player moves or swings, and
 * snaps a few degrees at the start of a swing. Pure view-angle math; it never touches hit detection.
 */
export class AimAssist {
  enabled = true;
  target: Combatant | null = null;
  private dYaw = 0;
  private dPitch = 0;

  /** Choose the target for this frame. Returns the look-speed multiplier (1 = no slowdown). */
  update(me: Combatant, all: readonly Combatant[]): number {
    this.target = null;
    if (!this.enabled || !me.alive) return 1;
    const [ex, ey, ez] = me.eye();
    const reach = me.weapon.stats.reach + A.extraM;
    let best = A.coneDeg * D2R;
    for (const o of all) {
      if (o === me || o.team === me.team || !o.alive) continue;
      const p = o.body.s.pos, cy = p.y + 1.2;
      const dx = p.x - ex, dz = p.z - ez, dist = Math.hypot(dx, dz);
      if (dist > reach) continue;
      const yaw = Math.atan2(-dx, -dz), pitch = Math.atan2(cy - ey, dist);
      const dy = wrap(yaw - me.yaw), dp = pitch - me.pitch;
      const ang = Math.hypot(dy, dp * 0.7);
      if (ang < best) { best = ang; this.target = o; this.dYaw = dy; this.dPitch = dp; }
    }
    return this.target ? 1 - A.slow : 1;
  }

  /** Gentle pull toward the target (call when the player moves, looks or swings). */
  pull(me: Combatant, dt: number): void {
    if (!this.enabled || !this.target) return;
    me.body.yaw += clampAbs(this.dYaw, A.pullRate * dt);
    me.body.pitch += clampAbs(this.dPitch, A.pitchRate * dt);
  }

  /** At swing start: turn up to snapDeg toward the target. */
  snap(me: Combatant): void {
    if (!this.enabled || !this.target) return;
    me.body.yaw += clampAbs(this.dYaw, A.snapDeg * D2R);
    me.body.pitch += clampAbs(this.dPitch, A.snapDeg * D2R * 0.6);
  }
}

const clampAbs = (x: number, m: number) => Math.max(-m, Math.min(m, x));
