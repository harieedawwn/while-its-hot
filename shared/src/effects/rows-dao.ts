import { BALANCE } from '../balance';
import type { AttackCtx, HitEffect, PassiveHooks } from '../passives';

/** Dao rows (ROSTER, phase 29) as hooks. Heavy swing atoms fire at the strike moment; numbers in BALANCE.effects.dao. */
const D = BALANCE.effects.dao;
const heavy = (c: AttackCtx) => c.kind === 'heavy';
const onHeavy = (...a: HitEffect[]): PassiveHooks => ({ onSwing: (c, out) => { if (heavy(c)) out.push(...a); } });

export const DAO_PASSIVES = {
  backstab_bonus: { modifyAttack: (a) => { a.backMul = (a.backMul ?? 1) * D.backMul; } },
  slide_long: { traits: { slideLen: D.slideLen } },
  triple_jump: { traits: { airJumps: 2 } },
  throw_knife: onHeavy({ type: 'knife' }),
  throw_poison: { ...onHeavy({ type: 'knife' }), knife: 'poison' },
  throw_burn: { ...onHeavy({ type: 'knife' }), knife: 'burn' },
  poison_on_hit: { onHit: (_c, out) => { out.push({ type: 'poison' }); } },
  shadow_invis: {
    onHit: (c, out) => { if (c.back) out.push({ type: 'invis', s: D.invis.s }); },
    onKill: (out) => { out.push({ type: 'invis', s: D.invis.s }); },
  },
  hook_lunge: onHeavy({ type: 'hook' }),
  parry_blink: { onParry: (out) => { out.push({ type: 'blink' }); } },
  slide_fire_trail: { slide: 'trail' },
  slide_decoy: { slide: 'decoy' },
  speed_stacks: { onHit: (_c, out) => { out.push({ type: 'haste' }); } },
  time_slow_heavy: onHeavy({ type: 'timefield' }),
  blade_storm: onHeavy({ type: 'storm' }),
  rift_dash: onHeavy({ type: 'rift' }),
} as const satisfies Record<string, PassiveHooks>;
