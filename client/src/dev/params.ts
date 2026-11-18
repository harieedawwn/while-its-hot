/** URL params for dev scenes (TECH §9). */
export interface Params {
  scene: string; seed: number; t: number | null; cam: number[] | null;
  nogate: boolean; touch: boolean; shot: boolean; q: string;
}
export function readParams(search = location.search): Params {
  const p = new URLSearchParams(search);
  const cam = p.get('cam')?.split(',').map(Number);
  const t = p.get('t');
  return {
    scene: p.get('scene') ?? '', seed: Number(p.get('seed') ?? 1), t: t === null ? null : Number(t),
    cam: cam && cam.length >= 3 && cam.every((n) => !Number.isNaN(n)) ? cam : null,
    nogate: p.get('nogate') === '1', touch: p.get('touch') === '1', shot: p.get('shot') === '1', q: p.get('q') ?? '',
  };
}
