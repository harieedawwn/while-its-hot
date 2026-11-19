import { FEEL } from '../core/feel';
import type { OutputMode } from './settings';

export interface Vec3 { x: number; y: number; z: number }
const S = FEEL.audio.spatial;

/** Air absorption: the low-pass cutoff closes with distance (log-interpolated ref→max) and again when occluded. Pure. */
export function airCutoff(dist: number, occluded: boolean): number {
  const k = Math.min(1, Math.max(0, (dist - S.ref) / (S.max - S.ref)));
  const f = S.lpNear * Math.pow(S.lpFar / S.lpNear, k);
  return occluded ? Math.max(400, f * S.occlusion) : f;
}

/** Per-voice positional chain: low-pass (distance/occlusion) → PannerNode. `out` is what connects to the bus. */
export class Spatial {
  readonly input: BiquadFilterNode;
  readonly out: PannerNode;
  private pos: Vec3;
  occluded = false;
  constructor(ctx: BaseAudioContext, pos: Vec3, mode: OutputMode) {
    this.pos = pos;
    this.input = ctx.createBiquadFilter(); this.input.type = 'lowpass'; this.input.Q.value = 0.5;
    const p = ctx.createPanner();
    p.panningModel = mode === 'headphones' ? 'HRTF' : 'equalpower';
    p.distanceModel = 'inverse'; p.refDistance = S.ref; p.maxDistance = S.max; p.rolloffFactor = 1;
    p.positionX.value = pos.x; p.positionY.value = pos.y; p.positionZ.value = pos.z;
    this.input.connect(p);
    this.out = p;
  }
  get position(): Vec3 { return this.pos; }
  move(ctx: BaseAudioContext, pos: Vec3): void {
    this.pos = pos; const t = ctx.currentTime;
    this.out.positionX.setTargetAtTime(pos.x, t, 0.03); this.out.positionY.setTargetAtTime(pos.y, t, 0.03); this.out.positionZ.setTargetAtTime(pos.z, t, 0.03);
  }
  /** Re-aim the low-pass for the current listener distance / occlusion. */
  filter(ctx: BaseAudioContext, listener: Vec3, immediate = false): void {
    const d = Math.hypot(listener.x - this.pos.x, listener.y - this.pos.y, listener.z - this.pos.z);
    this.input.frequency.setTargetAtTime(airCutoff(d, this.occluded), ctx.currentTime, immediate ? 0.001 : 0.08);
  }
}
