/** Generated impulse responses (no files): exponentially decaying noise that gets darker as it decays, plus early taps. */
export interface IrSpec { len: number; decay: number; bright: number }

/** Small deterministic PRNG so the IR is the same every boot. */
function prng(seed: number): () => number {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

export function makeIr(ctx: BaseAudioContext, spec: IrSpec, seed: number): AudioBuffer {
  const n = Math.floor(ctx.sampleRate * spec.len);
  const buf = ctx.createBuffer(2, n, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    const r = prng(seed + c * 977);
    let lp = 0;
    for (let i = 0; i < n; i++) {
      const t = i / ctx.sampleRate;
      lp += ((r() * 2 - 1) - lp) * (spec.bright - spec.bright * 0.75 * Math.min(1, t / spec.len));
      d[i] = lp * Math.exp(-t / spec.decay) * (t < 0.003 ? t / 0.003 : 1);
    }
    for (const [k, er] of [0.009, 0.017, 0.026, 0.038].entries()) {
      const j = Math.floor((er + c * 0.003) * ctx.sampleRate);
      if (j < n) d[j] += 0.45 / (k + 1);
    }
  }
  return buf;
}
