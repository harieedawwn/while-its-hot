import { LEGS, type StrikeSet, with_ } from './strikes';
import type { BonePose } from './types';

/**
 * Third-person knife and fist sets (ROUND3 §4, LOOK §4). Degrees, axes in skeleton.ts. A gauntlet is held
 * like a blade (grip at the fist): with the forearm level the thumb points up and the knuckles lead, so a
 * straight arm is a straight punch. The left gauntlet is the mirrored copy on hand_l.
 */
export const SHORT_GUARD: Record<'dao' | 'tay', BonePose> = {
  // knife low and forward, the free hand out front for balance
  dao: { pelvis: [0, -10, 0], chest: [-10, -8, 0], head: [-4, 8, 0], arm_r: [34, 0, 16], fore_r: [80, 0, 0], hand_r: [-50, 0, 0], arm_l: [46, 0, -10], fore_l: [70, 0, 0] },
  // boxing guard: lead left fist forward, rear fist at the chin, chin down
  tay: { pelvis: [0, -14, 0], chest: [-8, -12, 0], head: [-10, 10, 0], arm_r: [36, 0, 18], fore_r: [124, 0, 0], arm_l: [52, 0, -14], fore_l: [112, 0, 0] },
};

export const SHORT_STRIKES: Record<'dao' | 'tay', StrikeSet> = {
  dao: {
    light: [
      // forehand flick: right → left at chest height
      { windup: { chest: [-8, -26, 0], head: [-2, 20, 0], arm_r: [74, 0, 52], fore_r: [56, 0, 0], hand_r: [-20, 60, 0], arm_l: [40, 0, -16], fore_l: [76, 0, 0] },
        hit: { chest: [-12, 24, 0], head: [2, -18, 0], arm_r: [70, 0, -20], fore_r: [16, 0, 0], hand_r: [-56, 40, 0], arm_l: [30, 0, -24], fore_l: [70, 0, 0] },
        follow: { chest: [-12, 30, 0], head: [2, -22, 0], arm_r: [62, 0, -28], fore_r: [22, 0, 0], hand_r: [-56, 40, 0] } },
      // backhand return: left → right
      { windup: { chest: [-10, 28, 0], head: [0, -20, 0], arm_r: [56, 0, -32], fore_r: [72, 0, 0], hand_r: [-20, -70, 0], arm_l: [36, 0, -30], fore_l: [64, 0, 0] },
        hit: { chest: [-8, -26, 0], head: [0, 20, 0], arm_r: [86, 0, 44], fore_r: [12, 0, 0], hand_r: [-56, -40, 0], arm_l: [44, 0, -8], fore_l: [80, 0, 0] },
        follow: { chest: [-8, -32, 0], head: [0, 24, 0], arm_r: [92, 0, 52], fore_r: [18, 0, 0], hand_r: [-56, -40, 0] } },
      // low rising cross
      { windup: { pelvis: [0, -16, 0], chest: [-4, -20, 0], arm_r: [128, 0, 30], fore_r: [64, 0, 0], hand_r: [-30, 30, 0], arm_l: [56, 0, -20], fore_l: [60, 0, 0] },
        hit: { pelvis: [-4, 12, 0], chest: [-18, 16, 0], head: [8, -12, 0], arm_r: [50, 0, -18], fore_r: [10, 0, 0], hand_r: [-72, 10, 0], arm_l: [20, 0, -30], fore_l: [50, 0, 0] },
        follow: { chest: [-20, 20, 0], arm_r: [40, 0, -24], fore_r: [16, 0, 0], hand_r: [-72, 10, 0] } },
      // stab from the hip
      { windup: { chest: [-6, -22, 0], head: [0, 20, 0], arm_r: [-14, 0, 16], fore_r: [104, 0, 0], hand_r: [-84, 0, 0], arm_l: [56, 0, -20], fore_l: [50, 0, 0] },
        hit: { chest: [-16, 12, 0], head: [6, -10, 0], arm_r: [84, 0, 4], fore_r: [4, 0, 0], hand_r: [-88, 0, 0], arm_l: [-10, 0, -24], fore_l: [40, 0, 0] },
        follow: { chest: [-16, 12, 0], arm_r: [80, 0, 4], fore_r: [10, 0, 0], hand_r: [-84, 0, 0] } },
    ],
    // lunge stab: coiled low, then the whole body flies along the blade
    heavy: { windup: with_(LEGS, { pelvis: [-8, -26, 0], chest: [-6, -30, 0], head: [-4, 30, 0], arm_r: [-20, 0, 20], fore_r: [110, 0, 0], hand_r: [-86, 0, 0], arm_l: [60, 0, -24], fore_l: [40, 0, 0] }),
      hit: with_(LEGS, { pelvis: [-14, 10, 0], chest: [-26, 10, 0], head: [14, -10, 0], arm_r: [90, 0, 2], fore_r: [2, 0, 0], hand_r: [-88, 0, 0], arm_l: [-34, 0, -30], fore_l: [16, 0, 0], thigh_l: [56, 0, -4], shin_l: [-60, 0, 0], thigh_r: [-36, 0, 6], shin_r: [-4, 0, 0] }),
      follow: with_(LEGS, { pelvis: [-14, 8, 0], chest: [-24, 8, 0], arm_r: [84, 0, 2], fore_r: [8, 0, 0], hand_r: [-84, 0, 0], arm_l: [-28, 0, -28], fore_l: [20, 0, 0], thigh_l: [52, 0, -4], shin_l: [-56, 0, 0] }),
      root: [0, -0.2, -0.22], full: true },
    charge: with_(LEGS, { pelvis: [-8, -28, 0], chest: [-6, -32, 0], head: [-4, 32, 0], arm_r: [-24, 0, 22], fore_r: [112, 0, 0], hand_r: [-86, 0, 0], arm_l: [62, 0, -26], fore_l: [36, 0, 0] }),
  },
  tay: {
    light: [
      // jab L: the lead arm snaps straight, shoulder turned in
      { windup: { chest: [-8, -16, 0], head: [-10, 12, 0], arm_l: [44, 0, -14], fore_l: [118, 0, 0], arm_r: [36, 0, 18], fore_r: [124, 0, 0] },
        hit: { chest: [-10, -24, 0], head: [-10, 18, 0], arm_l: [90, 0, -4], fore_l: [4, 0, 0], hand_l: [0, -70, 0], arm_r: [38, 0, 18], fore_r: [126, 0, 0] },
        follow: { chest: [-10, -22, 0], arm_l: [84, 0, -6], fore_l: [14, 0, 0], hand_l: [0, -60, 0] } },
      // jab R (cross): hips and chest turn through
      { windup: { pelvis: [0, -18, 0], chest: [-8, -18, 0], head: [-10, 14, 0], arm_r: [30, 0, 20], fore_r: [126, 0, 0], arm_l: [52, 0, -14], fore_l: [112, 0, 0] },
        hit: { pelvis: [0, 12, 0], chest: [-12, 24, 0], head: [-8, -18, 0], arm_r: [90, 0, 4], fore_r: [4, 0, 0], hand_r: [0, 70, 0], arm_l: [40, 0, -18], fore_l: [124, 0, 0] },
        follow: { pelvis: [0, 12, 0], chest: [-12, 22, 0], arm_r: [84, 0, 6], fore_r: [14, 0, 0], hand_r: [0, 60, 0] } },
      // hook R: elbow up and out, the fist comes round level
      { windup: { pelvis: [0, -14, 0], chest: [-6, -26, 0], head: [-10, 18, 0], arm_r: [80, 0, 66], fore_r: [96, 0, 0], arm_l: [52, 0, -14], fore_l: [114, 0, 0] },
        hit: { pelvis: [0, 18, 0], chest: [-8, 34, 0], head: [-8, -24, 0], arm_r: [86, 0, -6], fore_r: [92, 0, 0], hand_r: [0, 0, -20], arm_l: [40, 0, -20], fore_l: [124, 0, 0] },
        follow: { pelvis: [0, 20, 0], chest: [-8, 40, 0], arm_r: [82, 0, -16], fore_r: [94, 0, 0] } },
      // uppercut L: dip, then drive up from the legs
      { windup: { pelvis: [0, -10, 0], chest: [6, -18, 0], head: [-6, 10, 0], arm_l: [14, 0, -10], fore_l: [96, 0, 0], arm_r: [36, 0, 18], fore_r: [124, 0, 0] },
        hit: { pelvis: [-4, -20, 0], chest: [-18, -28, 0], head: [-14, 18, 0], arm_l: [128, 0, -4], fore_l: [84, 0, 0], hand_l: [0, -90, 0], arm_r: [40, 0, 18], fore_r: [126, 0, 0] },
        follow: { chest: [-16, -26, 0], arm_l: [138, 0, -4], fore_l: [80, 0, 0], hand_l: [0, -90, 0] },
        root: [0, 0.03, -0.02] },
    ],
    // charged straight: wound far back on the rear foot, then everything goes through the fist
    heavy: { windup: with_(LEGS, { pelvis: [0, -32, 0], chest: [-2, -38, 0], head: [-10, 34, 0], arm_r: [8, 0, 26], fore_r: [130, 0, 0], arm_l: [60, 0, -16], fore_l: [100, 0, 0] }),
      hit: with_(LEGS, { pelvis: [-10, 20, 0], chest: [-18, 34, 0], head: [-4, -28, 0], arm_r: [92, 0, 2], fore_r: [0, 0, 0], hand_r: [0, 80, 0], arm_l: [30, 0, -24], fore_l: [120, 0, 0], thigh_l: [46, 0, -4], shin_l: [-48, 0, 0], thigh_r: [-30, 0, 6], shin_r: [-8, 0, 0] }),
      follow: with_(LEGS, { pelvis: [-10, 22, 0], chest: [-18, 36, 0], arm_r: [88, 0, 2], fore_r: [8, 0, 0], hand_r: [0, 80, 0], arm_l: [30, 0, -24], fore_l: [120, 0, 0], thigh_l: [44, 0, -4], shin_l: [-46, 0, 0] }),
      root: [0, -0.12, -0.14], full: true },
    charge: with_(LEGS, { pelvis: [0, -34, 0], chest: [-2, -40, 0], head: [-10, 36, 0], arm_r: [4, 0, 28], fore_r: [134, 0, 0], arm_l: [62, 0, -16], fore_l: [100, 0, 0] }),
  },
};
