import './vendor/sfx.js';

/** One row of `public/sfx/manifest.json` (written by tools/audio/design.py). */
export interface ManifestEntry { n: number; loop: boolean; lufs: number }
/** Procedural stand-in for an event that has no recording yet (rendered offline from vendor/sfx.js recipes). */
export interface Fallback { sfx: string; opts?: Record<string, unknown>; secs?: number; takes?: number }

interface SfxStatic { renderOffline(name: string, opts: Record<string, unknown>, seconds: number, sampleRate?: number): Promise<AudioBuffer>; names: string[] }
const SFX = (globalThis as unknown as { SFX?: SfxStatic }).SFX;

/** Round-robin that never repeats the previous take (AUDIO §1.3). `rand` in [0,1). */
export function pickTake(n: number, last: number, rand: number): number {
  if (n <= 1) return 0;
  const k = Math.floor(rand * (n - 1));
  return k >= last ? k + 1 : k;
}

export type Source = 'sourced' | 'synth' | 'missing';

export class Bank {
  entries: Record<string, ManifestEntry> = {};
  private buffers = new Map<string, AudioBuffer[]>();
  private synth = new Map<string, AudioBuffer[]>();
  private last = new Map<string, number>();
  constructor(private ctx: BaseAudioContext, private base: string = `${import.meta.env.BASE_URL}sfx/`) {}

  private ext(): string {
    const a = document.createElement('audio');
    return a.canPlayType('audio/ogg; codecs="vorbis"') ? 'ogg' : 'm4a';
  }

  /** Fetch the manifest and decode every take (the set is small: < 1 MB). Missing manifest = everything falls back to synth. */
  async load(): Promise<void> {
    try {
      const res = await fetch(`${this.base}manifest.json`);
      if (!res.ok) return;
      this.entries = (await res.json()) as Record<string, ManifestEntry>;
    } catch { return; }
    const ext = this.ext();
    await Promise.all(Object.entries(this.entries).map(async ([ev, e]) => {
      const list: AudioBuffer[] = [];
      for (let k = 0; k < e.n; k++) {
        try {
          const r = await fetch(`${this.base}${ev}_${k}.${ext}`);
          list.push(await this.ctx.decodeAudioData(await r.arrayBuffer()));
        } catch { /* a missing take just shortens the round-robin */ }
      }
      if (list.length) this.buffers.set(ev, list);
    }));
  }

  /** Render the procedural fallback for an event (a few random takes). */
  async renderFallback(ev: string, fb: Fallback): Promise<void> {
    if (!SFX || this.synth.has(ev)) return;
    const out: AudioBuffer[] = [];
    for (let k = 0; k < (fb.takes ?? 3); k++) {
      try { out.push(await SFX.renderOffline(fb.sfx, fb.opts ?? {}, fb.secs ?? 1.6, this.ctx.sampleRate)); } catch { /* unsupported in this webview */ }
    }
    if (out.length) this.synth.set(ev, out);
  }

  source(ev: string): Source { return this.buffers.has(ev) ? 'sourced' : this.synth.has(ev) ? 'synth' : 'missing'; }
  takes(ev: string): number { return (this.buffers.get(ev) ?? this.synth.get(ev))?.length ?? 0; }

  /** Next take for an event, or a specific one (audition). */
  take(ev: string, index?: number): AudioBuffer | null {
    const list = this.buffers.get(ev) ?? this.synth.get(ev);
    if (!list?.length) return null;
    const k = index !== undefined ? index % list.length : pickTake(list.length, this.last.get(ev) ?? -1, Math.random());
    this.last.set(ev, k);
    return list[k];
  }
}
