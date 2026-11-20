/** Where parts of the game publish numbers for the on-phone perf report (no dependency on them, so core/ stays leaf). */
export interface NetProbe { rtt: number; jitter: number; snaps: number; late: number }
export interface GfxProbe { width: number; height: number; resolution: number; quantize: string; snap: boolean; brightness: number; gpu: string; scene: string }
export const probe: { net: (() => NetProbe) | null; gfx: (() => GfxProbe) | null; gpuMs: () => number | null } = {
  net: null, gfx: null, gpuMs: () => null,
};
