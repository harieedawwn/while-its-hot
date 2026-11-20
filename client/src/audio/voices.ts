import { FEEL } from '../core/feel';
/** A live sound. `gain` is its linear loudness at start (the stealing score); `stop` kills it with a short fade. */
export interface VoiceRec { id: number; ev: string; start: number; gain: number; stop(): void }

/** Voice stealing (AUDIO §2): lowest gain ÷ (1 + age) goes first = the oldest, quietest. Pure so it is unit-tested. */
export function pickVictim(voices: readonly VoiceRec[], now: number): number {
  let best = -1, bestScore = Infinity;
  for (let i = 0; i < voices.length; i++) {
    const v = voices[i], score = v.gain / (1 + Math.max(0, now - v.start));
    if (score < bestScore) { bestScore = score; best = i; }
  }
  return best;
}

export class VoicePool {
  private live: VoiceRec[] = [];
  private nextId = 1;
  private lastStart = new Map<string, number>();
  count(ev: string): number { return this.live.reduce((n, v) => n + (v.ev === ev ? 1 : 0), 0); }
  get all(): readonly VoiceRec[] { return this.live; }

  /** Make room for one more of `ev`. Returns false when the newcomer is quieter than everything it would steal from. */
  admit(ev: string, gain: number, now: number, limit: number, gap = 0): boolean {
    if (gap > 0 && this.lastStart.get(ev) !== undefined && now - (this.lastStart.get(ev) as number) < gap) return false;
    if (this.live.length >= FEEL.audio.maxVoices) {
      // global cap: the quietest oldest voice of ANY event makes room, unless the newcomer is quieter still
      const i = pickVictim(this.live, now), v = this.live[i];
      if (gain < v.gain / (1 + Math.max(0, now - v.start))) return false;
      v.stop(); this.remove(v);
    }
    const same = this.live.filter((v) => v.ev === ev);
    if (same.length < limit) return true;
    const i = pickVictim(same, now);
    const v = same[i];
    if (gain < v.gain / (1 + Math.max(0, now - v.start))) return false;
    v.stop(); this.remove(v);
    return true;
  }
  add(ev: string, now: number, gain: number, stop: () => void): VoiceRec {
    this.lastStart.set(ev, now);
    const v: VoiceRec = { id: this.nextId++, ev, start: now, gain, stop };
    this.live.push(v);
    return v;
  }
  remove(v: VoiceRec): void { const i = this.live.indexOf(v); if (i >= 0) this.live.splice(i, 1); }
}
