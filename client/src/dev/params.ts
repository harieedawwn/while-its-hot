/** URL params for dev scenes (TECH §9). Scene-specific params are read with `param()`. */
export interface Params {
  scene: string; seed: number; t: number | null; cam: number[] | null;
  nogate: boolean; touch: boolean; shot: boolean; q: string;
  /** Render quality overrides until the settings ledger exists: res=360|450|540|720|native, quant=off|light|strong, snap=1, adaptive=0. */
  res: number | null; quant: 'off' | 'light' | 'strong' | null; snap: boolean; adaptive: boolean;
  /** bright=0..100 overrides the saved Độ sáng. */
  bright: number | null;
  /** Any other param, raw. */
  get(name: string): string | null;
}
export function readParams(search = location.search): Params {
  const p = new URLSearchParams(search);
  const cam = p.get('cam')?.split(',').map(Number);
  const t = p.get('t');
  const res = p.get('res');
  const quant = p.get('quant');
  return {
    scene: p.get('scene') ?? '', seed: Number(p.get('seed') ?? 1), t: t === null ? null : Number(t),
    cam: cam && cam.length >= 3 && cam.every((n) => !Number.isNaN(n)) ? cam : null,
    nogate: p.get('nogate') === '1', touch: p.get('touch') === '1', shot: p.get('shot') === '1', q: p.get('q') ?? '',
    res: res === null ? null : res === 'native' ? 0 : Number(res) || null,
    quant: quant === 'off' || quant === 'light' || quant === 'strong' ? quant : null,
    snap: p.get('snap') === '1', adaptive: p.get('adaptive') !== '0',
    bright: p.get('bright') === null || Number.isNaN(Number(p.get('bright'))) ? null : Number(p.get('bright')),
    get: (name) => p.get(name),
  };
}
/** Number param with default (NaN-safe). */
export function num(params: Params, name: string, def: number): number {
  const v = params.get(name);
  const n = v === null ? NaN : Number(v);
  return Number.isNaN(n) ? def : n;
}
