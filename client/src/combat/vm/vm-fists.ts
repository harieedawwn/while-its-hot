import { clip, type V3, type VmClip, type VmEase, type VmHand, type VmKey } from './vm-pose';
import { ELBOW_L, ELBOW_R } from './vm-arms';

/**
 * First-person fists (tay, ROUND3 §4): jab L, jab R, hook R, uppercut L, charged straight R. Both hands are
 * keyed (VmKey.l). A gauntlet's +Z is its knuckles and −Z its cuff, so the knuckles always point away from the
 * off-screen elbow along the visible forearm; +Y is the thumb, given here as a hint and made perpendicular.
 * Impact keys sit where the hit sweep's thrust/slash puts the strike (screen centre for jabs, across for the hook).
 */
const norm = (v: V3): V3 => { const l = Math.hypot(...v) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
function fist(p: V3, thumb: V3, elbow: readonly [number, number, number]): VmHand {
  const e = norm([p[0] - elbow[0], p[1] - elbow[1], p[2] - elbow[2]]);
  const d = thumb[0] * e[0] + thumb[1] * e[1] + thumb[2] * e[2];
  return { p, b: norm([thumb[0] - e[0] * d, thumb[1] - e[1] * d, thumb[2] - e[2] * d]), e };
}
const R = (p: V3, thumb: V3 = [-0.5, 1, 0]) => fist(p, thumb, ELBOW_R);
const L = (p: V3, thumb: V3 = [0.5, 1, 0]) => fist(p, thumb, ELBOW_L);
const key = (s: number, r: VmHand, l: VmHand, ease?: VmEase): VmKey => ({ s, ...r, l, ease });

// guard: lead (left) fist a little forward, rear fist by the chin
const GR = R([0.16, -0.2, -0.36]), GL = L([-0.15, -0.17, -0.41]);
const GUARD = key(0, GR, GL);
const TUCK_R = R([0.15, -0.18, -0.31]), TUCK_L = L([-0.13, -0.15, -0.33]);

/** One punch: the throwing hand's antic → launch → impact → follow, the other hand tucked; back to guard at 3. */
function punch(side: 'r' | 'l', antic: VmHand, launch: VmHand, mid: VmHand, impact: VmHand, follow: VmHand, start: VmKey = GUARD): VmClip {
  const pair = (h: VmHand): [VmHand, VmHand] => (side === 'r' ? [h, TUCK_L] : [TUCK_R, h]);
  const k = (s: number, h: VmHand, e?: VmEase) => { const [r, l] = pair(h); return key(s, r, l, e); };
  return clip([
    { ...start, s: 0, ease: 'out' },
    k(0.72, antic, 'in'), k(1, launch, 'linear'), k(1.5, mid, 'linear'), k(2, impact, 'out'), k(2.32, follow, 'cubic'),
    { ...GUARD, s: 3 },
  ]);
}

const JAB_L = punch('l', L([-0.15, -0.19, -0.34]), L([-0.13, -0.16, -0.44]), L([-0.09, -0.12, -0.56], [0.8, 0.6, 0]),
  L([-0.05, -0.1, -0.67], [1, 0.25, 0]), L([-0.06, -0.11, -0.63], [1, 0.3, 0]));
const JAB_R = punch('r', R([0.17, -0.21, -0.32]), R([0.14, -0.17, -0.44]), R([0.09, -0.13, -0.57], [-0.8, 0.6, 0]),
  R([0.04, -0.1, -0.68], [-1, 0.25, 0]), R([0.05, -0.11, -0.64], [-1, 0.3, 0]));
// hook: cocked out to the right, then the fist travels across the screen at head height
const HOOK_R = punch('r', R([0.33, -0.17, -0.3], [0, 1, 0]), R([0.29, -0.13, -0.45], [0, 1, 0]), R([0.13, -0.1, -0.58], [0, 1, 0]),
  R([-0.06, -0.1, -0.55], [0, 1, 0.2]), R([-0.13, -0.13, -0.47], [0, 1, 0.3]));
// uppercut: drops low, then drives up through the middle, palm toward the face
const UPPER_L = punch('l', L([-0.12, -0.37, -0.32], [1, 0, 0.3]), L([-0.09, -0.24, -0.45], [1, 0, 0.3]), L([-0.06, -0.12, -0.52], [1, 0, 0]),
  L([-0.03, 0, -0.54], [1, 0, -0.3]), L([-0.05, 0.02, -0.48], [1, 0, -0.3]));
const CHARGE_R = R([0.25, -0.2, -0.22], [-0.3, 1, 0]);
const CHARGE = key(0, CHARGE_R, GL);
const STRAIGHT_R = punch('r', R([0.27, -0.21, -0.19], [-0.3, 1, 0]), R([0.16, -0.15, -0.44], [-0.8, 0.6, 0]), R([0.08, -0.11, -0.62], [-1, 0.3, 0]),
  R([0.02, -0.08, -0.74], [-1, 0.2, 0]), R([0.03, -0.09, -0.7], [-1, 0.25, 0]), CHARGE);

const BLOCK = key(0, R([0.07, -0.05, -0.29], [-1, 0.2, 0.4]), L([-0.08, -0.03, -0.31], [1, 0.2, 0.4]));
const DEFLECT = key(0, R([0.04, -0.08, -0.36], [-1, 0.4, 0]), L([-0.1, -0.06, -0.38], [1, 0.6, 0.2]));
const STAGGER = key(0, R([0.36, -0.46, -0.25], [0, 1, 0.6]), L([-0.33, -0.43, -0.3], [0, 1, 0.6]));

export interface FistSet { rest: VmKey; block: VmKey; stagger: VmKey; charge: VmKey; light: VmClip[]; slide: VmClip; heavy: VmClip; parry: VmClip }
export function fistSet(): FistSet {
  return {
    rest: GUARD, block: BLOCK, stagger: STAGGER, charge: CHARGE,
    light: [JAB_L, JAB_R, HOOK_R, UPPER_L],
    slide: JAB_R,
    heavy: STRAIGHT_R,
    parry: clip([{ ...GUARD, s: 0, ease: 'out' }, { ...DEFLECT, s: 0.24, ease: 'linear' }, { ...DEFLECT, s: 0.46, ease: 'cubic' }, { ...GUARD, s: 1 }]),
  };
}
