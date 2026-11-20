import { BALANCE, FAMILIES as WFAMILIES, type Family as WFamily, framesOf, totalS } from '@wih/shared';
import { BLADE_GUARD, BLADE_STRIKES } from './strikes-blade';
import { SHORT_GUARD, SHORT_STRIKES } from './strikes-short';
import type { Strike, StrikeSet, V3 } from './strikes';
import { type BonePose, type Clip, type Ease, k } from './types';

/** Weapon family (data ids) → clip family (clip ids). */
export const CLIP_FAMILY = { kiem: 'sword', bua: 'hammer', dao: 'knife', tay: 'fist' } as const;

/**
 * Third-person attack sets (LOOK §4), one per family: light ×N, heavy charge (held), heavy release, slide.
 * Clip length = the frame data's total at base speed (a faster form plays them faster: FighterAnim), and the
 * strike keys sit exactly at the windup end / active end, so the body hits when the rules hit. Pose data:
 * strikes-blade.ts (kiem, bua) and strikes-short.ts (dao, tay).
 */
type Pose = BonePose;
const GUARD: Record<WFamily, Pose> = { ...BLADE_GUARD, ...SHORT_GUARD };
const STRIKES: Record<WFamily, StrikeSet> = { ...BLADE_STRIKES, ...SHORT_STRIKES };
const with_ = (...p: Pose[]): Pose => Object.assign({}, ...p);

function strikeClip(id: string, fam: WFamily, kind: 'light' | 'heavy' | 'slide', combo: number, s: Strike, start: Pose): Clip {
  const f = framesOf(fam, kind, combo), T = totalS(f), uw = f.w / T, ua = (f.w + f.a) / T;
  const g = GUARD[fam], r0: V3 = [0, 0, 0], r = s.root ?? [0, -0.03, -0.02];
  const lean: Pose = kind === 'slide' ? { pelvis: [-14, 0, 0], chest: [-10, 0, 0] } : {};
  const key = (u: number, p: Pose, root: V3, e: Ease) => k(u, with_(p, kind === 'slide' ? { ...lean, ...pick(p) } : {}), root, e);
  return {
    id, len: T, loop: false, upper: !s.full,
    keys: [
      key(0, start, r0, 'out'),
      key(uw * 0.78, s.windup, r0, 'in'),
      key(uw, s.windup, r0, 'in'),
      key(ua, s.hit, r, 'out'),
      key(ua + (1 - ua) * 0.38, s.follow, r, 'cubic'),
      key(1, g, r0, 'cubic'),
    ],
  };
}
/** Keep the pose's own chest/pelvis when it has them (the slide lean only fills what the strike leaves free). */
const pick = (p: Pose): Pose => ({ ...(p.pelvis ? { pelvis: p.pelvis } : {}), ...(p.chest ? { chest: p.chest } : {}) });

/** All attack clips: atk_<family>_<light1..4|heavy_charge|heavy_release|slide> (clips/index.ts ATTACK_SLOTS). */
export function attackClips(): Clip[] {
  const out: Clip[] = [];
  for (const fam of WFAMILIES) {
    const st = STRIKES[fam], name = CLIP_FAMILY[fam], g = GUARD[fam];
    st.light.forEach((s: Strike, i: number) => out.push(strikeClip(`atk_${name}_light${i + 1}`, fam, 'light', i, s, g)));
    out.push(strikeClip(`atk_${name}_slide`, fam, 'slide', 0, st.light[0], g));
    out.push(strikeClip(`atk_${name}_heavy_release`, fam, 'heavy', 0, st.heavy, st.charge));
    out.push({ id: `atk_${name}_heavy_charge`, len: BALANCE.combat.heavy.minS, loop: false, upper: false,
      keys: [k(0, g, [0, 0, 0], 'out'), k(1, st.charge, [0, -0.08, 0.04])] });
    out.push({ id: `guard_${name}`, len: 0.2, loop: false, upper: true, keys: [k(0, g), k(1, g)] });
  }
  return out;
}
