import { type Clip, k } from './types';

/** At the anvil. Standing, feet planted: hammer in the right hand, tongs/blade in the left. */
export const WORK: Clip[] = [
  {
    // lift, hang, strike (fast, ease-in), rebound
    id: 'forge_strike', len: 0.9, loop: true,
    keys: [
      k(0, { pelvis: [-4, -4, 0], chest: [-6, -6, 0], head: [-14, 0, 0], arm_l: [58, 0, -10], fore_l: [58, 0, 0], arm_r: [28, 0, 8], fore_r: [70, 0, 0], thigh_l: [10, 0, -4], thigh_r: [-8, 0, 4], shin_l: [-16, 0, 0], shin_r: [-12, 0, 0] }, [0, -0.04, 0], 'out'),
      k(0.4, { pelvis: [2, -4, 0], chest: [8, -6, 0], head: [-8, 0, 0], arm_l: [58, 0, -10], fore_l: [58, 0, 0], arm_r: [152, 0, 12], fore_r: [62, 0, 0], thigh_l: [10, 0, -4], thigh_r: [-8, 0, 4], shin_l: [-12, 0, 0], shin_r: [-10, 0, 0] }, [0, 0.0, 0], 'in'),
      k(0.55, { pelvis: [-8, -4, 0], chest: [-16, -6, 0], head: [-20, 0, 0], arm_l: [62, 0, -10], fore_l: [58, 0, 0], arm_r: [42, 0, 6], fore_r: [28, 0, 0], thigh_l: [14, 0, -4], thigh_r: [-8, 0, 4], shin_l: [-22, 0, 0], shin_r: [-18, 0, 0] }, [0, -0.1, -0.03], 'out'),
      k(0.7, { pelvis: [-5, -4, 0], chest: [-8, -6, 0], head: [-16, 0, 0], arm_l: [58, 0, -10], fore_l: [58, 0, 0], arm_r: [60, 0, 8], fore_r: [60, 0, 0], thigh_l: [10, 0, -4], thigh_r: [-8, 0, 4], shin_l: [-16, 0, 0], shin_r: [-12, 0, 0] }, [0, -0.05, 0]),
    ],
  },
  {
    // holding the blade in the coals, leaning in, looking down, slow shiver
    id: 'heat_hold', len: 2.4, loop: true, spline: true,
    keys: [
      k(0, { pelvis: [-5, 0, 0], chest: [-9, 0, 0], head: [-14, 0, 0], arm_l: [62, 0, -6], fore_l: [52, 0, 0], arm_r: [74, 0, 8], fore_r: [58, 0, 0], thigh_l: [8, 0, -3], thigh_r: [-6, 0, 3], shin_l: [-10, 0, 0], shin_r: [-8, 0, 0] }, [0, -0.02, 0]),
      k(0.5, { pelvis: [-6, 0, 0], chest: [-11, 0, 0], head: [-16, 0, 0], arm_l: [65, 0, -6], fore_l: [49, 0, 0], arm_r: [77, 0, 8], fore_r: [54, 0, 0], thigh_l: [8, 0, -3], thigh_r: [-6, 0, 3], shin_l: [-10, 0, 0], shin_r: [-8, 0, 0] }, [0, -0.03, 0]),
    ],
  },
];
