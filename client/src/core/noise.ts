/** Smooth 1-D value noise in [−1, 1] (cubic-smoothed lattice). `seed` picks an independent channel. */
export function noise1(t: number, seed: number): number {
  const i = Math.floor(t), f = t - i;
  const a = hash(i, seed), b = hash(i + 1, seed);
  const u = f * f * (3 - 2 * f);
  return a + (b - a) * u;
}
function hash(i: number, seed: number): number {
  let h = (i * 374761393 + seed * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return ((h >>> 0) / 4294967295) * 2 - 1;
}
