import { describe, expect, it } from 'vitest';
import { BALANCE } from '../balance';
import { NetBot } from '../net/bot';
import type { MatchClientMsg } from '../net/match-msgs';
import { MatchAuthority } from './authority';
import type { Out } from './mplayer';

/** A whole match with three bots against the real authority, in virtual time (no sockets, no clocks). */
describe('full match with bots', () => {
  it('runs cage → fights → … until someone has won enough rounds, then ends', () => {
    let s = 11; const rand = () => (s = (s * 16807) % 2147483647) / 2147483647;
    const ids = [1, 2, 3], a = new MatchAuthority(ids, 5, rand, 0);
    const outs: Out[] = [], bots: NetBot[] = [];
    let now = 0;
    for (const id of ids) {
      const b = new NetBot({ send: (m) => outs.push(...a.msg(id, m as MatchClientMsg, now)), state: (st) => a.state(id, st) }, id - 1, rand);
      b.id = id; b.swingEvery = 0.6; bots.push(b);
    }
    const phases: string[] = [];
    let end: Extract<Out['m'], { t: 'end' }> | null = null;
    for (let i = 0; i < 20 * 60 * 90 && !end; i++) {
      now += 50;
      for (const b of bots) b.tick(0.05, now);
      const o = a.tick(now); outs.push(...o);
      const snap = a.snapshot(now);
      for (const b of bots) b.onSnapshot(snap);
      for (const x of outs.splice(0)) {
        for (const b of bots) if (x.to === 'all' || x.to === b.id) b.onMsg(x.m);
        if (x.m.t === 'phase' && phases[phases.length - 1] !== x.m.f.ph + x.m.f.n) phases.push(x.m.f.ph + x.m.f.n);
        if (x.m.t === 'end') end = x.m;
      }
    }
    expect(end).not.toBeNull();
    expect(phases[0]).toBe('cage1');
    expect(phases).toContain('fight1'); expect(phases).toContain('result1');
    expect(a.flow.ph).toBe('end');
    const e = end!;
    expect(e.rows.find((r) => r.id === e.win)!.wins).toBe(BALANCE.match.winsToWin);
    expect(a.flow.n).toBeGreaterThanOrEqual(BALANCE.match.winsToWin);
  });
});
