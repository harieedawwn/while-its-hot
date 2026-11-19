import { BALANCE, type Family as WFamily, framesOf, totalS } from '@wih/shared';
import { type BonePose, type Clip, type Ease, k } from './types';

/** Weapon family (data ids) → clip family (clip ids). */
export const CLIP_FAMILY = { kiem: 'sword', bua: 'hammer', thuong: 'polearm' } as const;

/**
 * Third-person attack sets (LOOK §4), one per family: light ×N, heavy charge (held), heavy release, slide.
 * Clip length = the frame data's total, and the strike keys sit exactly at the windup end / active end,
 * so the body hits when the rules hit. Weapon in the right hand (hold: blade forward when the arm hangs,
 * edge down); wrist twist (hand y) turns the blade flat for horizontal cuts. Degrees, see skeleton.ts.
 */
type V3 = [number, number, number];
type Pose = BonePose;
interface Strike { windup: Pose; hit: Pose; follow: Pose; root?: V3; full?: boolean; }

const GUARD: Record<WFamily, Pose> = {
  kiem: { chest: [-4, 0, 0], arm_r: [26, 0, 12], fore_r: [62, 0, 0], hand_r: [-20, 0, 0], arm_l: [34, 0, -12], fore_l: [74, 0, 0] },
  bua: { chest: [-5, -6, 0], arm_r: [22, 0, 14], fore_r: [70, 0, 0], hand_r: [-10, 0, 0], arm_l: [30, 0, -14], fore_l: [70, 0, 0] },
  thuong: { chest: [-4, -14, 0], arm_r: [-6, 0, 16], fore_r: [80, 0, 0], hand_r: [-78, 0, 0], arm_l: [40, 0, -6], fore_l: [62, 0, 0] },
};

const LEGS: Pose = { thigh_l: [24, 0, -4], shin_l: [-30, 0, 0], thigh_r: [-16, 0, 6], shin_r: [-18, 0, 0], foot_l: [6, 0, 0] };
const with_ = (...p: Pose[]): Pose => Object.assign({}, ...p);

const STRIKES: Record<WFamily, { light: Strike[]; heavy: Strike; charge: Pose }> = {
  kiem: {
    light: [
      // forehand: high right → low left
      { windup: { chest: [-2, -38, 0], head: [0, 30, 0], arm_r: [96, 0, 64], fore_r: [44, 0, 0], hand_r: [0, 70, 0], arm_l: [30, 0, -24], fore_l: [70, 0, 0] },
        hit: { chest: [-12, 32, 0], head: [6, -26, 0], arm_r: [70, 0, -22], fore_r: [12, 0, 0], hand_r: [-60, 40, 0], arm_l: [16, 0, -30], fore_l: [60, 0, 0] },
        follow: { chest: [-10, 42, 0], head: [6, -32, 0], arm_r: [54, 0, -36], fore_r: [20, 0, 0], hand_r: [-60, 40, 0] } },
      // backhand: low left → high right
      { windup: { chest: [-8, 40, 0], head: [4, -30, 0], arm_r: [48, 0, -44], fore_r: [56, 0, 0], hand_r: [0, -80, 0], arm_l: [20, 0, -40], fore_l: [50, 0, 0] },
        hit: { chest: [-4, -34, 0], head: [0, 26, 0], arm_r: [96, 0, 52], fore_r: [10, 0, 0], hand_r: [-60, -40, 0], arm_l: [36, 0, -10], fore_l: [80, 0, 0] },
        follow: { chest: [-2, -42, 0], head: [0, 32, 0], arm_r: [112, 0, 60], fore_r: [18, 0, 0], hand_r: [-60, -40, 0] } },
      // overhead diagonal chop
      { windup: { chest: [6, -24, 0], head: [-4, 20, 0], arm_r: [158, 0, 30], fore_r: [52, 0, 0], hand_r: [-30, 40, 0], arm_l: [60, 0, -20], fore_l: [60, 0, 0] },
        hit: { chest: [-22, 18, 0], head: [10, -14, 0], arm_r: [56, 0, -12], fore_r: [8, 0, 0], hand_r: [-75, 10, 0], arm_l: [10, 0, -30], fore_l: [40, 0, 0] },
        follow: { chest: [-26, 24, 0], head: [12, -18, 0], arm_r: [34, 0, -20], fore_r: [14, 0, 0], hand_r: [-75, 10, 0] } },
    ],
    // thrust lunge: point back at the hip, then the arm drives straight out, wrist bent so the blade leads
    heavy: { windup: with_(LEGS, { pelvis: [0, -22, 0], chest: [-2, -30, 0], head: [0, 34, 0], arm_r: [-24, 0, 18], fore_r: [96, 0, 0], hand_r: [-84, 0, 0], arm_l: [60, 0, -30], fore_l: [40, 0, 0] }),
      hit: with_(LEGS, { pelvis: [-6, 12, 0], chest: [-16, 10, 0], head: [8, -14, 0], arm_r: [86, 0, 4], fore_r: [4, 0, 0], hand_r: [-88, 0, 0], arm_l: [-30, 0, -26], fore_l: [20, 0, 0], thigh_l: [44, 0, -4], shin_l: [-44, 0, 0], thigh_r: [-30, 0, 6], shin_r: [-6, 0, 0] }),
      follow: with_(LEGS, { pelvis: [-6, 10, 0], chest: [-14, 8, 0], arm_r: [80, 0, 4], fore_r: [10, 0, 0], hand_r: [-80, 0, 0], arm_l: [-24, 0, -26], fore_l: [24, 0, 0], thigh_l: [40, 0, -4], shin_l: [-42, 0, 0] }),
      root: [0, -0.1, -0.12], full: true },
    charge: with_(LEGS, { pelvis: [0, -24, 0], chest: [0, -34, 0], head: [0, 38, 0], arm_r: [-30, 0, 20], fore_r: [100, 0, 0], hand_r: [-86, 0, 0], arm_l: [64, 0, -34], fore_l: [36, 0, 0] }),
  },
  bua: {
    light: [
      { windup: { chest: [4, -44, 0], head: [-2, 34, 0], arm_r: [120, 0, 70], fore_r: [60, 0, 0], hand_r: [-10, 40, 0], arm_l: [40, 0, -30], fore_l: [60, 0, 0] },
        hit: { chest: [-20, 30, 0], head: [10, -24, 0], arm_r: [58, 0, -24], fore_r: [14, 0, 0], hand_r: [-50, 30, 0], arm_l: [10, 0, -34], fore_l: [50, 0, 0] },
        follow: { chest: [-24, 40, 0], head: [12, -30, 0], arm_r: [34, 0, -34], fore_r: [24, 0, 0], hand_r: [-50, 30, 0] } },
      { windup: { chest: [-10, 46, 0], head: [6, -34, 0], arm_r: [36, 0, -48], fore_r: [64, 0, 0], hand_r: [0, -70, 0], arm_l: [16, 0, -40], fore_l: [40, 0, 0] },
        hit: { chest: [-2, -32, 0], head: [0, 24, 0], arm_r: [104, 0, 50], fore_r: [14, 0, 0], hand_r: [-50, -30, 0], arm_l: [40, 0, -10], fore_l: [80, 0, 0] },
        follow: { chest: [2, -42, 0], head: [-2, 32, 0], arm_r: [124, 0, 58], fore_r: [22, 0, 0], hand_r: [-50, -30, 0] } },
    ],
    // overhead: both arms high behind the head, then everything comes down onto the front foot
    heavy: { windup: with_(LEGS, { pelvis: [6, -6, 0], chest: [16, -10, 0], head: [-14, 8, 0], arm_r: [176, 0, 16], fore_r: [70, 0, 0], hand_r: [-30, 0, 0], arm_l: [168, 0, -14], fore_l: [74, 0, 0] }),
      hit: with_(LEGS, { pelvis: [-12, 4, 0], chest: [-34, 4, 0], head: [20, 0, 0], arm_r: [62, 0, -4], fore_r: [6, 0, 0], hand_r: [-60, 0, 0], arm_l: [60, 0, 6], fore_l: [12, 0, 0], thigh_l: [40, 0, -4], shin_l: [-50, 0, 0], thigh_r: [-24, 0, 6], shin_r: [-22, 0, 0] }),
      follow: with_(LEGS, { pelvis: [-14, 4, 0], chest: [-38, 4, 0], head: [22, 0, 0], arm_r: [44, 0, -6], fore_r: [10, 0, 0], arm_l: [44, 0, 8], fore_l: [14, 0, 0], thigh_l: [42, 0, -4], shin_l: [-54, 0, 0] }),
      root: [0, -0.16, -0.06], full: true },
    charge: with_(LEGS, { pelvis: [8, -6, 0], chest: [20, -12, 0], head: [-18, 10, 0], arm_r: [172, 0, 18], fore_r: [84, 0, 0], hand_r: [-34, 0, 0], arm_l: [176, 0, -18], fore_l: [80, 0, 0] }),
  },
  thuong: {
    light: [
      { windup: { chest: [0, -26, 0], head: [0, 22, 0], arm_r: [-24, 0, 20], fore_r: [92, 0, 0], hand_r: [-84, 0, 0], arm_l: [30, 0, -10], fore_l: [64, 0, 0] },
        hit: { chest: [-10, 6, 0], head: [4, -8, 0], arm_r: [58, 0, 8], fore_r: [20, 0, 0], hand_r: [-82, 0, 0], arm_l: [70, 0, 4], fore_l: [6, 0, 0] },
        follow: { chest: [-10, 8, 0], arm_r: [54, 0, 8], fore_r: [24, 0, 0], hand_r: [-82, 0, 0], arm_l: [66, 0, 4], fore_l: [10, 0, 0] } },
      { windup: { chest: [0, -46, 0], head: [0, 36, 0], arm_r: [40, 0, 54], fore_r: [50, 0, 0], hand_r: [-82, 0, 0], arm_l: [60, 0, 20], fore_l: [40, 0, 0] },
        hit: { chest: [-8, 40, 0], head: [4, -30, 0], arm_r: [60, 0, -30], fore_r: [30, 0, 0], hand_r: [-82, 0, 0], arm_l: [50, 0, -50], fore_l: [20, 0, 0] },
        follow: { chest: [-8, 50, 0], head: [4, -36, 0], arm_r: [50, 0, -40], fore_r: [34, 0, 0], hand_r: [-82, 0, 0], arm_l: [40, 0, -56], fore_l: [24, 0, 0] } },
      { windup: { chest: [2, -30, 0], head: [-2, 24, 0], arm_r: [-30, 0, 22], fore_r: [96, 0, 0], hand_r: [-84, 0, 0], arm_l: [24, 0, -12], fore_l: [70, 0, 0] },
        hit: { chest: [-14, 8, 0], head: [6, -8, 0], arm_r: [64, 0, 6], fore_r: [12, 0, 0], hand_r: [-84, 0, 0], arm_l: [76, 0, 2], fore_l: [4, 0, 0] },
        follow: { chest: [-14, 10, 0], arm_r: [60, 0, 6], fore_r: [16, 0, 0], hand_r: [-84, 0, 0], arm_l: [72, 0, 2], fore_l: [8, 0, 0] } },
    ],
    // wide sweep: wound far right, low, then the whole body turns through
    heavy: { windup: with_(LEGS, { pelvis: [0, -34, 0], chest: [4, -50, 0], head: [-2, 44, 0], arm_r: [30, 0, 70], fore_r: [40, 0, 0], hand_r: [-82, 0, 0], arm_l: [60, 0, 30], fore_l: [40, 0, 0] }),
      hit: with_(LEGS, { pelvis: [-6, 30, 0], chest: [-10, 44, 0], head: [4, -40, 0], arm_r: [64, 0, -40], fore_r: [24, 0, 0], hand_r: [-82, 0, 0], arm_l: [40, 0, -60], fore_l: [20, 0, 0] }),
      follow: with_(LEGS, { pelvis: [-6, 38, 0], chest: [-10, 52, 0], head: [4, -46, 0], arm_r: [54, 0, -48], fore_r: [30, 0, 0], hand_r: [-82, 0, 0], arm_l: [32, 0, -62], fore_l: [24, 0, 0] }),
      root: [0, -0.1, 0], full: true },
    charge: with_(LEGS, { pelvis: [0, -38, 0], chest: [6, -54, 0], head: [-2, 48, 0], arm_r: [26, 0, 74], fore_r: [44, 0, 0], hand_r: [-82, 0, 0], arm_l: [64, 0, 34], fore_l: [40, 0, 0] }),
  },
};


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

/** All attack clips: atk_<family>_<light1..3|heavy_charge|heavy_release|slide> (clips/index.ts ATTACK_SLOTS). */
export function attackClips(): Clip[] {
  const out: Clip[] = [];
  for (const fam of ['kiem', 'bua', 'thuong'] as const) {
    const st = STRIKES[fam], name = CLIP_FAMILY[fam], g = GUARD[fam];
    st.light.forEach((s, i) => out.push(strikeClip(`atk_${name}_light${i + 1}`, fam, 'light', i, s, g)));
    out.push(strikeClip(`atk_${name}_slide`, fam, 'slide', 0, st.light[0], g));
    out.push(strikeClip(`atk_${name}_heavy_release`, fam, 'heavy', 0, st.heavy, st.charge));
    out.push({ id: `atk_${name}_heavy_charge`, len: BALANCE.combat.heavy.minS, loop: false, upper: false,
      keys: [k(0, g, [0, 0, 0], 'out'), k(1, st.charge, [0, -0.08, 0.04])] });
    out.push({ id: `guard_${name}`, len: 0.2, loop: false, upper: true, keys: [k(0, g), k(1, g)] });
  }
  return out;
}
