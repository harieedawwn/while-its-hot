import { BALANCE } from '../balance';
import type { AttackCtx, HitEffect, PassiveHooks } from '../passives';

/** Tay rows (ROSTER, phase 29) as hooks. Numbers in BALANCE.effects.tay. */
const T = BALANCE.effects.tay;
const heavy = (c: AttackCtx) => c.kind === 'heavy';
const light = (c: AttackCtx) => c.kind === 'light';
const onHeavy = (...a: HitEffect[]): PassiveHooks => ({ onSwing: (c, out) => { if (heavy(c)) out.push(...a); } });
const on4 = (...a: HitEffect[]): PassiveHooks => ({ onHit: (c, out) => { if (light(c) && c.combo === 3) out.push(...a); } });
const v = (m: number) => m * T.mToV;

export const TAY_PASSIVES = {
  combo4_knock: on4({ type: 'push', v: v(T.combo4Knock) }),
  heal_on_hit: { onHit: (_c, out) => { out.push({ type: 'heal', hp: T.heal.hit }); } },
  heal_on_hit_2: { onHit: (_c, out) => { out.push({ type: 'heal', hp: T.heal.hit2 }); } },
  kill_full_heal: { onKill: (out) => { out.push({ type: 'heal', hp: BALANCE.combat.hp }); } },
  piston_charge: { chargeMul: T.chargeMul },
  heavy_push: { onHit: (c, out) => { if (heavy(c)) out.push({ type: 'push', v: v(T.pistonPush) }); } },
  heavy_push_far: { onHit: (c, out) => { if (heavy(c)) out.push({ type: 'push', v: v(T.farPush) }); } },
  light_pull: { onHit: (c, out) => { if (light(c)) out.push({ type: 'pull', m: T.lightPull }); } },
  freeze_combo4: on4({ type: 'status', k: 'freeze', at: 'target' }),
  spark_on_hit: { onHit: (_c, out) => { out.push({ type: 'spark' }); } },
  fireball_heavy: onHeavy({ type: 'proj', k: 'fireball' }),
  iceball_heavy: onHeavy({ type: 'proj', k: 'iceball' }),
  rocket_fist: onHeavy({ type: 'proj', k: 'rocket' }),
  stone_wall: onHeavy({ type: 'wall' }),
  magnet_punch: onHeavy({ type: 'magnet_punch' }),
  giant_hand: onHeavy({ type: 'hand', k: 'giant' }),
  sky_hand: onHeavy({ type: 'hand', k: 'sky' }),
  gravity_well_throw: onHeavy({ type: 'hole', k: 'gravity' }),
  meteor_combo4: on4({ type: 'meteor_small' }),
  meteor_rain: onHeavy({ type: 'meteor_rain' }),
} as const satisfies Record<string, PassiveHooks>;
