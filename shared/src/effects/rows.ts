import { BALANCE } from '../balance';
import type { AttackCtx, HitEffect, PassiveHooks } from '../passives';

/**
 * Kiếm and Búa rows 18–45 (ROSTER) as toolkit atoms. Each id is a few lines of data: which hook, which atom.
 * Swing hooks fire at the strike moment (EffectWorld.swing); on-hit hooks only when the blow lands unblocked.
 */
const E = BALANCE.effects, S = E.slash;
const heavy = (c: AttackCtx) => c.kind === 'heavy';
const light = (c: AttackCtx) => c.kind === 'light';
const onHeavy = (...a: HitEffect[]): PassiveHooks => ({ onSwing: (c, out) => { if (heavy(c)) out.push(...a); } });

export const ROW_PASSIVES = {
  // kiem
  slow_on_hit: { onHit: (_c, out) => { out.push({ type: 'status', k: 'slow', at: 'target' }); } },
  flying_slash: onHeavy({ type: 'slash', v: 'slash', dmg: S.dmg, cd: S.cd, cdKey: 'slash' }),
  flying_slash_strong: onHeavy({ type: 'slash', v: 'slash', dmg: S.strongDmg, cd: S.cd, cdKey: 'slash' }),
  parry_slash: { onParry: (out) => { out.push({ type: 'slash', v: 'slash', dmg: S.parryDmg, cd: S.parryCd, cdKey: 'pslash', toward: 'attacker' }); } },
  chain_whip: onHeavy({ type: 'whip' }),
  light_reach_plus: { modifyReach: (r, kind) => (kind === 'light' ? r + E.reachPlus : r) },
  lava_crack: { onHit: (_c, out) => { out.push({ type: 'field', k: 'lava_crack' }); } },
  flying_slash_burn: onHeavy({ type: 'slash', v: 'slash_burn', dmg: S.dmg, cd: S.cd, cdKey: 'slash' }),
  freeze_combo3: { onHit: (c, out) => { if (light(c) && c.combo === 2) out.push({ type: 'status', k: 'freeze', at: 'target' }); } },
  slash_ice_floor: onHeavy({ type: 'slash', v: 'slash_ice', dmg: S.dmg, cd: S.cd, cdKey: 'slash' }),
  meteor_heavy: onHeavy({ type: 'meteor' }),
  orbit_blades: { aura: 'orbit' },
  black_hole_heavy: onHeavy({ type: 'hole', k: 'eclipse' }),
  slash_all_lights: { onSwing: (c, out) => { if (light(c)) out.push({ type: 'slash', v: 'slash_sun', dmg: S.allDmg, cd: S.allCd, cdKey: 'sslash' }); } },
  fire_column_heavy: onHeavy({ type: 'column' }),
  // bua
  piston_blast: onHeavy({ type: 'wave', k: 'piston' }),
  magnet_pull_heavy: onHeavy({ type: 'magnet' }),
  lava_pool_ground: onHeavy({ type: 'field', k: 'lava_pool' }),
  slam_lava_big: { onSlamLand: (out) => { out.push({ type: 'field', k: 'lava_big' }); } },
  bell_ring: { onHit: (_c, out) => { out.push({ type: 'status', k: 'bell', at: 'target' }); } },
  bell_wave_heavy: onHeavy({ type: 'wave', k: 'bell_wave' }),
  rubber_launch: { onHit: (c, out) => { if (heavy(c)) out.push({ type: 'bounce' }); } },
  light_push: { onHit: (c, out) => { if (light(c)) out.push({ type: 'push' }); } },
  chain_lightning_heavy: onHeavy({ type: 'chain' }),
  anchor_throw: onHeavy({ type: 'anchor' }),
  gravity_pin: onHeavy({ type: 'pin_all' }),
  slam_double: {
    onSlamLand: (out) => {
      const P = BALANCE.weapons.passive.slamAoe, R = BALANCE.move.slam.knockR;
      out.push({ type: 'aoe', dmg: P.dmg, r: R * 1.3 }, { type: 'shockwave', r: R * 1.3, push: BALANCE.combat.slamKnock * E.slamDouble.mul });
    },
  },
  mountain_crack: onHeavy({ type: 'crack' }),
  star_black_hole: onHeavy({ type: 'hole', k: 'star' }),
  light_shockwave: { onSwing: (c, out) => { if (light(c)) out.push({ type: 'wave', k: 'light_wave' }); } },
} as const satisfies Record<string, PassiveHooks>;
