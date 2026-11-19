import { describe, expect, it } from 'vitest';
import { airCutoff } from './spatial';
import { pickTake } from './bank';
import { pickVictim, VoicePool, type VoiceRec } from './voices';
import { EVENTS } from './catalog';
import { FEEL } from '../core/feel';
import MANIFEST from '../../public/sfx/manifest.json';

describe('round robin', () => {
  it('never repeats the previous take and reaches every take', () => {
    for (const n of [2, 3, 6]) {
      let last = -1; const seen = new Set<number>();
      for (let i = 0; i < 400; i++) { const k = pickTake(n, last, (i * 0.6180339) % 1); expect(k).not.toBe(last); expect(k).toBeLessThan(n); seen.add(k); last = k; }
      expect(seen.size).toBe(n);
    }
    expect(pickTake(1, 0, 0.5)).toBe(0);
  });
});

describe('air absorption', () => {
  it('closes monotonically with distance and again when occluded', () => {
    const S = FEEL.audio.spatial;
    expect(airCutoff(0, false)).toBe(S.lpNear);
    let prev = Infinity;
    for (let d = 0; d <= 60; d += 3) { const f = airCutoff(d, false); expect(f).toBeLessThanOrEqual(prev); prev = f; }
    expect(airCutoff(S.max, false)).toBeCloseTo(S.lpFar, 0);
    expect(airCutoff(20, true)).toBeLessThan(airCutoff(20, false) * 0.5);
  });
});

describe('voice stealing', () => {
  const v = (id: number, start: number, gain: number): VoiceRec => ({ id, ev: 'a', start, gain, stop() {} });
  it('takes the oldest, quietest voice', () => {
    expect(pickVictim([v(1, 0, 1), v(2, 0, 0.2), v(3, 0, 0.6)], 1)).toBe(1);
    expect(pickVictim([v(1, 0, 0.5), v(2, 4, 0.5)], 5)).toBe(0);
  });
  it('enforces the limit, stops the victim, and refuses a newcomer quieter than all', () => {
    const pool = new VoicePool(); let stopped = 0;
    pool.add('a', 0, 1, () => stopped++); pool.add('a', 0, 0.3, () => stopped++);
    expect(pool.admit('a', 0.9, 1, 2)).toBe(true);
    expect(stopped).toBe(1); expect(pool.count('a')).toBe(1);
    pool.add('a', 1, 0.9, () => stopped++);
    expect(pool.admit('a', 0.01, 2, 2)).toBe(false);
    expect(pool.admit('b', 0.01, 2, 2)).toBe(true);
  });
});

describe('catalog', () => {
  it('only references mix keys that exist', () => {
    for (const [id, d] of Object.entries(EVENTS)) expect(FEEL.audio.mix[d.mix], id).toBeTypeOf('number');
  });
});

describe('sound list (AUDIO §3)', () => {
  it('every catalog event has a recording in the manifest, and every recording is routed', () => {
    const m = MANIFEST as Record<string, { n: number }>;
    expect(Object.keys(EVENTS).filter((id) => !m[id])).toEqual([]);
    expect(Object.keys(m).filter((id) => !EVENTS[id])).toEqual([]);
    for (const [id, def] of Object.entries(EVENTS)) if (/^(footstep_|swing_|hit_)/.test(id) && !def.loop) expect(m[id].n, id).toBeGreaterThanOrEqual(3);
  });
});
