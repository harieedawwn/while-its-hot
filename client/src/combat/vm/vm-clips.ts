import { type Arc, arcAngle, arcSpan, attackShape, bladeDir, type Family, framesOf, type WeaponDef } from '@wih/shared';
import { clip, type V3, type VmClip, type VmKey } from './vm-pose';

/**
 * First-person attack sets per family (LOOK §6: anticipation → strike → follow-through). The strike keys
 * are generated from the SAME arcs the hit sweep uses (shared/combat/sweep.ts, view frame), so what the
 * player sees crossing the screen is what hits. Windup, follow-through and the guard poses are authored.
 */
interface Style {
  rest: VmKey; block: VmKey; deflect: VmKey; stagger: VmKey;
  /** Shoulder pivot the hand swings around, arm radius, anticipation/follow degrees, thrust travel. */
  pivot: V3; armR: number; antic: number; follow: number; thrust: number;
  /** Slash cheat: the hand's arc is scaled by squeeze, the blade leads it by lead degrees; lift tips it up. */
  squeeze: number; lead: number; lift: number;
  /** Blade direction while stabbing (leans so it reads as steel, not a dot). */
  thrustDir: V3;
}
const S: Record<Family, Style> = {
  kiem: {
    rest: { s: 0, p: [0.29, -0.29, -0.44], b: [0.06, 0.6, -0.8], e: [-0.95, -0.1, -0.1] },
    block: { s: 0, p: [0.13, -0.2, -0.4], b: [-0.95, 0.22, -0.18], e: [0, 0.35, -1] },
    deflect: { s: 0, p: [0.11, -0.2, -0.4], b: [-0.82, 0.5, -0.28], e: [-0.3, -0.3, -1] },
    stagger: { s: 0, p: [0.42, -0.5, -0.26], b: [0.55, 0.45, 0.15], e: [0, -0.5, -1] },
    pivot: [0.06, -0.15, 0.02], armR: 0.5, antic: 28, follow: 18, thrust: 0.24, squeeze: 0.75, lead: 26, lift: 0.18, thrustDir: [-0.22, 0.26, -1],
  },
  bua: {
    rest: { s: 0, p: [0.3, -0.33, -0.42], b: [0.3, 0.85, -0.38], e: [-0.8, 0.1, -0.5] },
    block: { s: 0, p: [0.14, -0.22, -0.38], b: [-0.94, 0.3, -0.1], e: [0, 0.2, -1] },
    deflect: { s: 0, p: [0.07, -0.18, -0.36], b: [-0.55, 0.8, -0.2], e: [-0.3, -0.2, -1] },
    stagger: { s: 0, p: [0.44, -0.55, -0.22], b: [0.6, 0.3, 0.2], e: [0, -0.5, -1] },
    pivot: [0.08, -0.15, 0.04], armR: 0.48, antic: 34, follow: 14, thrust: 0.2, squeeze: 0.75, lead: 18, lift: 0.3, thrustDir: [-0.22, 0.26, -1],
  },
  thuong: {
    rest: { s: 0, p: [0.21, -0.37, -0.24], b: [-0.14, 0.17, -0.98], e: [-1, 0, 0.1] },
    block: { s: 0, p: [0.16, -0.27, -0.3], b: [-0.86, 0.48, -0.18], e: [0, 0.3, -1] },
    deflect: { s: 0, p: [0.08, -0.22, -0.3], b: [-0.6, 0.72, -0.35], e: [-0.4, -0.2, -1] },
    stagger: { s: 0, p: [0.4, -0.52, -0.12], b: [0.35, 0.2, -0.9], e: [-1, 0, 0] },
    pivot: [0.12, -0.32, 0.12], armR: 0.42, antic: 24, follow: 12, thrust: 0.32, squeeze: 0.75, lead: 30, lift: 0.1, thrustDir: [-0.12, 0.13, -1],
  },
};

const VIEW = { fwd: [0, 0, -1] as [number, number, number], right: [1, 0, 0] as [number, number, number], up: [0, 1, 0] as [number, number, number] };
const D2R = Math.PI / 180;

/** Blade dir, hand position and leading edge for the arc at u, optionally pushed past its ends by extraDeg. */
function arcKey(st: Style, arc: Arc, arcDeg: number, u: number, s: number, opt: { extraDeg?: number; r?: number; back?: number; ease?: VmKey['ease'] } = {}): VmKey {
  const p = st.pivot, r = (opt.r ?? 1) * st.armR, back = opt.back ?? 0;
  if (arc.kind === 'thrust') {
    const ext = (arc.from + (arc.to - arc.from) * u) * st.thrust;
    // the blade leans left and up so a stab reads as steel, not a dot at the crosshair
    return { s, p: [p[0] - 0.02, p[1] + 0.06, p[2] - r - ext + back], b: st.thrustDir, e: [-1, 0, -0.2], ease: opt.ease };
  }
  const sign = Math.sign(arc.to - arc.from) || 1;
  const extraU = (opt.extraDeg ?? 0) / (arcDeg || arcSpan(arc) || 1);
  const uu = u + (u <= 0.5 ? -extraU : extraU);
  // first-person cheat: the hand's arc is squeezed into the view and the blade leads it, so the steel
  // crosses the screen over the target when the sweep hits, instead of pointing away from the eye
  const a = arcAngle(arc, arcDeg, uu) * st.squeeze;
  const hand = dirAt(arc.roll, a), blade = dirAt(arc.roll, a + sign * st.lead);
  const rl = arc.roll * D2R, ab = (a + sign * st.lead) * D2R;
  const e: V3 = [sign * Math.cos(rl) * Math.cos(ab), sign * Math.sin(rl) * Math.cos(ab), sign * Math.sin(ab)];
  return {
    s, p: [p[0] + hand[0] * r, p[1] + hand[1] * r * 0.55, p[2] + hand[2] * r + back],
    b: [blade[0], blade[1] + st.lift, blade[2]], e, ease: opt.ease,
  };
}

/** View-space direction at angle a (deg) in the swing plane rolled by roll (deg). */
function dirAt(roll: number, a: number): V3 {
  const d: [number, number, number] = [0, 0, 0];
  bladeDir(VIEW, { kind: 'slash', from: a, to: a, roll }, 0, 0, d);
  return d;
}

function attackClip(st: Style, arc: Arc, arcDeg: number, start: VmKey, heavy: boolean): VmClip {
  const k = heavy ? 1.25 : 1;
  const keys: VmKey[] = [
    { ...start, s: 0, ease: 'out' },
    arcKey(st, arc, arcDeg, 0, 0.72, { extraDeg: st.antic * k, r: 0.82, back: 0.07 * k, ease: 'in' }),
    arcKey(st, arc, arcDeg, 0, 1, { ease: 'linear' }),
  ];
  for (const u of [0.25, 0.5, 0.75]) keys.push(arcKey(st, arc, arcDeg, u, 1 + u, { ease: 'linear' }));
  keys.push(arcKey(st, arc, arcDeg, 1, 2, { ease: 'out' }));
  keys.push(arcKey(st, arc, arcDeg, 1, 2.32, { extraDeg: st.follow * k, r: 0.9, ease: 'cubic' }));
  keys.push({ ...st.rest, s: 3 });
  return clip(keys);
}

export interface VmSet {
  rest: VmKey; block: VmKey; stagger: VmKey; charge: VmKey;
  light: VmClip[]; slide: VmClip; heavy: VmClip; parry: VmClip;
}

/** The viewmodel clips for a weapon (its family moveset and passive-widened arcs). */
export function vmSet(def: WeaponDef): VmSet {
  const fam = def.stats.moveset, st = S[fam];
  const light = Array.from({ length: def.stats.comboHits }, (_, i) => {
    const arc = framesOf(fam, 'light', i).arc;
    return attackClip(st, arc, attackShape(def, 'light', i).arcDeg, st.rest, false);
  });
  const ha = framesOf(fam, 'heavy', 0).arc, hDeg = attackShape(def, 'heavy', 0).arcDeg;
  const charge = arcKey(st, ha, hDeg, 0, 0, { extraDeg: st.antic * 1.7, r: 0.72, back: 0.13 });
  const da = framesOf(fam, 'slide', 0).arc;
  const slideStart: VmKey = { ...st.rest, p: [st.rest.p[0] - 0.03, st.rest.p[1] - 0.04, st.rest.p[2] + 0.06] };
  return {
    rest: st.rest, block: st.block, stagger: st.stagger, charge,
    light,
    slide: attackClip(st, da, attackShape(def, 'slide', 0).arcDeg, slideStart, false),
    heavy: attackClip(st, ha, hDeg, charge, true),
    parry: clip([
      { ...st.rest, s: 0, ease: 'out' },
      { ...st.deflect, s: 0.24, ease: 'linear' },
      { ...st.deflect, s: 0.46, p: [st.deflect.p[0] - 0.02, st.deflect.p[1] + 0.01, st.deflect.p[2]], ease: 'cubic' },
      { ...st.rest, s: 1 },
    ]),
  };
}
