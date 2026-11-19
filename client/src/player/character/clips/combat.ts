import { type Clip, k } from './types';

/** Defense, reactions, death. `upper` clips leave the legs to the movement layer. */
export const COMBAT: Clip[] = [
  {
    // guard held: forearms up and crossed in front of the chest
    id: 'block', len: 0.16, loop: false, upper: true,
    keys: [
      k(0, { chest: [-3, 0, 0], head: [-6, 0, 0], arm_l: [58, 0, -4], fore_l: [96, 0, 0], arm_r: [54, 0, 6], fore_r: [102, 0, 0] }, [0, 0, 0], 'out'),
      k(1, { chest: [-6, 0, 0], head: [-8, 0, 0], arm_l: [70, 20, -6], fore_l: [104, 0, 0], arm_r: [68, -26, 4], fore_r: [108, 0, 0] }, [0, -0.02, 0]),
    ],
  },
  {
    // quick deflect across the body and back
    id: 'parry', len: 0.32, loop: false, upper: true,
    keys: [
      k(0, { chest: [-3, 0, 0], arm_l: [58, 0, -4], fore_l: [96, 0, 0], arm_r: [54, 0, 6], fore_r: [102, 0, 0] }, undefined, 'out'),
      k(0.35, { chest: [-4, 24, 0], head: [-4, 12, 0], arm_l: [40, 0, -20], fore_l: [70, 0, 0], arm_r: [96, 0, 38], fore_r: [30, 0, 0] }, undefined, 'cubic'),
      k(1, { chest: [-3, 0, 0], arm_l: [58, 0, -4], fore_l: [96, 0, 0], arm_r: [54, 0, 6], fore_r: [102, 0, 0] }),
    ],
  },
  {
    id: 'hit_f', len: 0.4, loop: false, upper: true,
    keys: [
      k(0, { chest: [26, 0, 0], head: [24, 0, 0], arm_l: [-8, 0, -42], fore_l: [20, 0, 0], arm_r: [-8, 0, 42], fore_r: [20, 0, 0] }, [0, 0, 0.05], 'out'),
      k(1, {}),
    ],
  },
  {
    id: 'hit_b', len: 0.4, loop: false, upper: true,
    keys: [
      k(0, { chest: [-28, 0, 0], head: [-22, 0, 0], arm_l: [-40, 0, -24], fore_l: [10, 0, 0], arm_r: [-40, 0, 24], fore_r: [10, 0, 0] }, [0, 0, -0.05], 'out'),
      k(1, {}),
    ],
  },
  {
    // reeling back a step, arms out, then catching balance
    id: 'stagger', len: 0.7, loop: false,
    keys: [
      k(0, { pelvis: [14, 0, 0], chest: [22, 0, 0], head: [18, 0, 0], arm_l: [24, 0, -56], fore_l: [24, 0, 0], arm_r: [10, 0, 60], fore_r: [30, 0, 0], thigh_l: [-26, 0, -4], shin_l: [-30, 0, 0], thigh_r: [20, 0, 4], shin_r: [-14, 0, 0] }, [0, -0.06, 0.08], 'out'),
      k(0.5, { pelvis: [8, 0, 0], chest: [12, 0, 0], head: [8, 0, 0], arm_l: [16, 0, -38], fore_l: [40, 0, 0], arm_r: [20, 0, 40], fore_r: [40, 0, 0], thigh_l: [-14, 0, -4], shin_l: [-16, 0, 0], thigh_r: [10, 0, 4], shin_r: [-10, 0, 0] }, [0, -0.04, 0.1]),
      k(1, {}),
    ],
  },
  {
    // knees buckle, topples backwards, comes to rest on its back (holds the last key)
    id: 'death', len: 1.3, loop: false,
    keys: [
      k(0, {}, [0, 0, 0]),
      k(0.28, { pelvis: [6, 0, 0], chest: [20, 0, 0], head: [16, 0, 0], arm_l: [10, 0, -34], fore_l: [30, 0, 0], arm_r: [8, 0, 36], fore_r: [34, 0, 0], thigh_l: [44, 0, -4], thigh_r: [38, 0, 4], shin_l: [-86, 0, 0], shin_r: [-80, 0, 0] }, [0, -0.38, 0.06], 'in'),
      k(0.6, { pelvis: [58, 0, 0], chest: [10, 0, 0], head: [12, 0, 0], arm_l: [-26, 0, -62], fore_l: [20, 0, 0], arm_r: [-30, 0, 66], fore_r: [24, 0, 0], thigh_l: [34, 0, -8], thigh_r: [22, 0, 8], shin_l: [-52, 0, 0], shin_r: [-34, 0, 0] }, [0, -0.52, 0.3], 'in'),
      k(0.82, { pelvis: [92, 0, 0], chest: [4, 0, 0], head: [8, 0, 0], arm_l: [-30, 0, -70], fore_l: [14, 0, 0], arm_r: [-34, 0, 72], fore_r: [16, 0, 0], thigh_l: [10, 0, -10], thigh_r: [4, 0, 8], shin_l: [-22, 0, 0], shin_r: [-12, 0, 0] }, [0, -0.78, 0.42], 'out'),
      k(1, { pelvis: [90, 0, 0], chest: [3, 0, 0], head: [10, 8, 0], arm_l: [-28, 0, -76], fore_l: [12, 0, 0], arm_r: [-32, 0, 78], fore_r: [14, 0, 0], thigh_l: [6, 0, -12], thigh_r: [2, 0, 10], shin_l: [-14, 0, 0], shin_r: [-8, 0, 0] }, [0, -0.76, 0.44]),
    ],
  },
];
