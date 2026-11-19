import { describe, expect, it } from 'vitest';
import { Lobby } from './lobby';

let n = 0; const mk = () => new Lobby(() => 't' + n++);
describe('lobby', () => {
  it('first joiner hosts, host passes on when they drop', () => {
    const l = mk(); const a = (l.join('A', 0, undefined, 0) as any).m, b = (l.join('B', 1, undefined, 0) as any).m;
    expect(l.host!.id).toBe(a.id); l.drop(a.id, 100); expect(l.host!.id).toBe(b.id);
  });
  it('reconnect with token keeps the slot, expiry frees it', () => {
    const l = mk(); const a = (l.join('A', 0, undefined, 0) as any).m; l.join('B', 0, undefined, 0);
    l.drop(a.id, 1000); expect((l.join('A2', 0, a.token, 5000) as any).m.id).toBe(a.id);
    l.drop(a.id, 6000); expect(l.expire(6000 + 29000)).toBe(false); expect(l.expire(6000 + 31000)).toBe(true);
    expect(l.members.length).toBe(1);
  });
  it('caps at 6 and refuses new joiners once the match started', () => {
    const l = mk(); for (let i = 0; i < 6; i++) l.join('x', 0, undefined, 0);
    expect((l.join('y', 0, undefined, 0) as any).err).toBe('full');
    l.members.pop(); l.phase = 'match'; expect((l.join('y', 0, undefined, 0) as any).err).toBe('started');
  });
  it('start needs host, 2 players and everyone ready', () => {
    const l = mk(); const a = (l.join('A', 0, undefined, 0) as any).m, b = (l.join('B', 0, undefined, 0) as any).m;
    expect(l.start(b.id)).toBe('host'); expect(l.start(a.id)).toBe('bad');
    l.setReady(b.id, true); expect(l.start(a.id)).toBeNull(); expect(l.phase).toBe('match');
  });
  it('host-only settings; empty room dies after 5 min', () => {
    const l = mk(); const a = (l.join('A', 0, undefined, 0) as any).m, b = (l.join('B', 0, undefined, 0) as any).m;
    expect(l.setSettings(b.id, { truce: 0 })).toBe('host'); expect(l.setSettings(a.id, { truce: 0 })).toBeNull(); expect(l.settings.truce).toBe(0);
    l.setSettings(a.id, { maxPlayers: 2 }); expect(l.join('C', 0, undefined, 0)).toEqual({ err: 'full' });
    expect(l.setSettings(a.id, { maxPlayers: 2 })).toBeNull(); l.settings.maxPlayers = 6;
    l.drop(a.id, 10); l.drop(b.id, 20); expect(l.isDead(299_000)).toBe(false); expect(l.isDead(10 + 300_000)).toBe(false); expect(l.isDead(20 + 300_000)).toBe(true);
  });
});
