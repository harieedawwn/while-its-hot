import { type Clip, k } from './types';

/** Movement states (held while the state lasts; the animator crossfades in/out). */
export const MOVEMENT: Clip[] = [
  {
    // sitting low, lead leg forward, trailing leg tucked, torso back, one hand dragging
    id: 'slide', len: 0.25, loop: false,
    keys: [
      k(0, { pelvis: [12, 0, 0], chest: [8, 0, 0], head: [-10, 0, 0], arm_l: [-30, 0, -34], fore_l: [20, 0, 0], arm_r: [38, 0, 18], fore_r: [60, 0, 0], thigh_r: [62, 0, 2], shin_r: [0, 0, 0], foot_r: [12, 0, 0], thigh_l: [40, 0, -6], shin_l: [-98, 0, 0] }, [0, -0.3, 0.05], 'out'),
      k(1, { pelvis: [26, 0, 0], chest: [10, 0, 0], head: [-14, 0, 0], arm_l: [-36, 0, -40], fore_l: [14, 0, 0], arm_r: [44, 0, 18], fore_r: [64, 0, 0], thigh_r: [64, 0, 2], shin_r: [-2, 0, 0], foot_r: [14, 0, 0], thigh_l: [46, 0, -8], shin_l: [-104, 0, 0] }, [0, -0.5, 0.12]),
    ],
  },
  {
    // plunge: arms stretched up and back, knees tucked, then braced
    id: 'slam', len: 0.2, loop: false,
    keys: [
      k(0, { pelvis: [-16, 0, 0], chest: [-24, 0, 0], head: [20, 0, 0], arm_l: [150, 0, -14], fore_l: [20, 0, 0], arm_r: [150, 0, 14], fore_r: [20, 0, 0], thigh_l: [38, 0, -3], thigh_r: [38, 0, 3], shin_l: [-74, 0, 0], shin_r: [-74, 0, 0] }, [0, -0.1, 0], 'out'),
      k(1, { pelvis: [-26, 0, 0], chest: [-30, 0, 0], head: [24, 0, 0], arm_l: [168, 0, -10], fore_l: [14, 0, 0], arm_r: [168, 0, 10], fore_r: [14, 0, 0], thigh_l: [30, 0, -3], thigh_r: [30, 0, 3], shin_l: [-60, 0, 0], shin_r: [-60, 0, 0] }, [0, -0.06, 0]),
    ],
  },
  {
    // hanging on a wall: hands up, knees bent, shivering a little
    id: 'cling', len: 0.5, loop: true, spline: true,
    keys: [
      k(0, { pelvis: [-8, 0, 0], chest: [-8, 0, 0], head: [10, 0, 0], arm_l: [156, 0, -12], fore_l: [34, 0, 0], arm_r: [140, 0, 14], fore_r: [44, 0, 0], thigh_l: [38, 0, -8], thigh_r: [22, 0, 8], shin_l: [-76, 0, 0], shin_r: [-52, 0, 0] }, [0, -0.04, 0]),
      k(0.5, { pelvis: [-9, 0, 0], chest: [-9, 0, 0], head: [10, 0, 0], arm_l: [150, 0, -12], fore_l: [38, 0, 0], arm_r: [146, 0, 14], fore_r: [40, 0, 0], thigh_l: [36, 0, -8], thigh_r: [24, 0, 8], shin_l: [-72, 0, 0], shin_r: [-56, 0, 0] }, [0, -0.05, 0]),
    ],
  },
];
