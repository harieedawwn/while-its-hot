import type { BonePose } from './types';

/** One strike of a third-person attack set: windup, the pose at the end of the active frames, follow-through. */
export type V3 = [number, number, number];
export interface Strike { windup: BonePose; hit: BonePose; follow: BonePose; root?: V3; full?: boolean; }
export interface StrikeSet { light: Strike[]; heavy: Strike; charge: BonePose; }

/** Lunge stance (front foot forward) used by heavies. */
export const LEGS: BonePose = { thigh_l: [24, 0, -4], shin_l: [-30, 0, 0], thigh_r: [-16, 0, 6], shin_r: [-18, 0, 0], foot_l: [6, 0, 0] };
export const with_ = (...p: BonePose[]): BonePose => Object.assign({}, ...p);
