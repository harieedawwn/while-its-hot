import { type Clip, cycle, k, mirrorClip } from './types';

/** Ground locomotion. Cycles are driven by distance travelled (animator), their `len` only matters when previewed. */

const runFwd = cycle('run_f', 0.7,
  { pelvis: [-7, 6, 0], chest: [-5, -10, 0], head: [6, 4, 0],
    arm_l: [48, 0, -6], fore_l: [85, 0, 0], arm_r: [-52, 0, 8], fore_r: [75, 0, 0],
    thigh_r: [30, 0, 2], shin_r: [-6, 0, 0], foot_r: [10, 0, 0],
    thigh_l: [-32, 0, -2], shin_l: [-48, 0, 0], foot_l: [-25, 0, 0] },
  { pelvis: [-9, 0, 0], chest: [-6, 0, 0], head: [6, 0, 0],
    arm_l: [8, 0, -8], fore_l: [78, 0, 0], arm_r: [-10, 0, 8], fore_r: [72, 0, 0],
    thigh_r: [4, 0, 2], shin_r: [-14, 0, 0],
    thigh_l: [30, 0, -2], shin_l: [-102, 0, 0], foot_l: [-12, 0, 0] },
  [0, -0.08, 0], [0, -0.01, 0]);

const runBack = cycle('run_b', 0.8,
  { pelvis: [3, -3, 0], chest: [4, 6, 0], head: [-2, 0, 0],
    arm_l: [30, 0, -10], fore_l: [85, 0, 0], arm_r: [-14, 0, 10], fore_r: [80, 0, 0],
    thigh_r: [-22, 0, 2], shin_r: [-6, 0, 0], foot_r: [-8, 0, 0],
    thigh_l: [20, 0, -2], shin_l: [-62, 0, 0] },
  { pelvis: [3, 0, 0], chest: [4, 0, 0], head: [-2, 0, 0],
    arm_l: [18, 0, -10], fore_l: [85, 0, 0], arm_r: [18, 0, 10], fore_r: [85, 0, 0],
    thigh_r: [-4, 0, 2], shin_r: [-14, 0, 0],
    thigh_l: [-10, 0, -2], shin_l: [-92, 0, 0] },
  [0, -0.06, 0], [0, -0.01, 0]);

const strafeR = cycle('strafe_r', 0.7,
  { pelvis: [-3, 0, 0], chest: [-3, 0, -2], head: [2, 0, 0],
    arm_l: [52, 0, -12], fore_l: [88, 0, 0], arm_r: [46, 0, 12], fore_r: [92, 0, 0],
    thigh_r: [14, 0, 20], shin_r: [-8, 0, 0], foot_r: [0, 0, -12],
    thigh_l: [-16, 0, 12], shin_l: [-52, 0, 0] },
  { pelvis: [-4, 0, 0], chest: [-3, 0, 0], head: [2, 0, 0],
    arm_l: [50, 0, -12], fore_l: [90, 0, 0], arm_r: [50, 0, 12], fore_r: [90, 0, 0],
    thigh_r: [4, 0, 4], shin_r: [-14, 0, 0],
    thigh_l: [22, 0, -3], shin_l: [-92, 0, 0] },
  [0, -0.05, 0], [0, -0.01, 0]);

export const LOCOMOTION: Clip[] = [
  {
    id: 'idle', len: 2.8, loop: true, spline: true,
    keys: [
      k(0, { pelvis: [0, 1.5, 0], chest: [-1, -1, 0], head: [1.5, 1, 0], arm_l: [4, 0, -8], fore_l: [18, 0, 0], arm_r: [3, 0, 8], fore_r: [20, 0, 0], thigh_l: [-3, 0, -3], thigh_r: [-1, 0, 3], shin_l: [-3, 0, 0], foot_l: [3, 0, 0] }, [0, 0, 0]),
      k(0.5, { pelvis: [0, -1, 0], chest: [1.5, 1, 0], head: [-0.5, -1.5, 0], arm_l: [2, 0, -9], fore_l: [16, 0, 0], arm_r: [4, 0, 9], fore_r: [18, 0, 0], thigh_l: [-3, 0, -3], thigh_r: [-1, 0, 3], shin_l: [-3, 0, 0], foot_l: [3, 0, 0] }, [0, -0.008, 0]),
    ],
  },
  runFwd, runBack, strafeR, mirrorClip(strafeR, 'strafe_l'),
  {
    // added on top of the run cycle when faster than run speed
    id: 'sprint_lean', len: 1, loop: false, additive: true,
    keys: [k(0, { pelvis: [-12, 0, 0], chest: [-9, 0, 0], head: [13, 0, 0], arm_l: [-6, 0, 0], arm_r: [-6, 0, 0] }, [0, -0.03, 0.04])],
  },
  {
    id: 'jump', len: 0.42, loop: false,
    keys: [
      k(0, { pelvis: [-8, 0, 0], chest: [-6, 0, 0], arm_l: [-20, 0, -6], arm_r: [-20, 0, 6], thigh_l: [24, 0, 0], thigh_r: [24, 0, 0], shin_l: [-50, 0, 0], shin_r: [-50, 0, 0] }, [0, -0.2, 0], 'out'),
      k(0.4, { pelvis: [-4, 0, 0], chest: [-3, 0, 0], head: [4, 0, 0], arm_l: [95, 0, -22], fore_l: [30, 0, 0], arm_r: [85, 0, 22], fore_r: [30, 0, 0], thigh_l: [34, 0, -2], thigh_r: [-4, 0, 2], shin_l: [-62, 0, 0], shin_r: [-26, 0, 0], foot_r: [-20, 0, 0] }, [0, 0, 0]),
      k(1, { pelvis: [-4, 0, 0], chest: [-3, 0, 0], head: [4, 0, 0], arm_l: [100, 0, -26], fore_l: [28, 0, 0], arm_r: [92, 0, 26], fore_r: [28, 0, 0], thigh_l: [38, 0, -2], thigh_r: [-8, 0, 2], shin_l: [-70, 0, 0], shin_r: [-30, 0, 0], foot_r: [-20, 0, 0] }, [0, 0.01, 0]),
    ],
  },
  {
    id: 'fall', len: 0.9, loop: true, spline: true,
    keys: [
      k(0, { pelvis: [-3, 0, 0], chest: [-3, 0, 0], head: [6, 0, 0], arm_l: [30, 0, -52], fore_l: [24, 0, 0], arm_r: [38, 0, 48], fore_r: [30, 0, 0], thigh_l: [20, 0, -8], thigh_r: [-6, 0, 8], shin_l: [-44, 0, 0], shin_r: [-26, 0, 0] }, [0, 0, 0]),
      k(0.5, { pelvis: [-3, 0, 0], chest: [-3, 0, 0], head: [6, 0, 0], arm_l: [38, 0, -46], fore_l: [30, 0, 0], arm_r: [30, 0, 54], fore_r: [24, 0, 0], thigh_l: [-4, 0, -8], thigh_r: [22, 0, 8], shin_l: [-26, 0, 0], shin_r: [-48, 0, 0] }, [0, 0.01, 0]),
    ],
  },
  {
    id: 'land', len: 0.34, loop: false,
    keys: [
      k(0, { pelvis: [-12, 0, 0], chest: [-18, 0, 0], head: [14, 0, 0], arm_l: [40, 0, -22], fore_l: [40, 0, 0], arm_r: [40, 0, 22], fore_r: [40, 0, 0], thigh_l: [66, 0, -4], thigh_r: [62, 0, 4], shin_l: [-104, 0, 0], shin_r: [-100, 0, 0], foot_l: [-10, 0, 0], foot_r: [-10, 0, 0] }, [0, -0.3, 0], 'out'),
      k(0.4, { pelvis: [-8, 0, 0], chest: [-10, 0, 0], head: [8, 0, 0], arm_l: [20, 0, -14], fore_l: [24, 0, 0], arm_r: [20, 0, 14], fore_r: [24, 0, 0], thigh_l: [34, 0, -3], thigh_r: [32, 0, 3], shin_l: [-56, 0, 0], shin_r: [-54, 0, 0] }, [0, -0.15, 0]),
      k(1, {}, [0, 0, 0]),
    ],
  },
];
