import { BALANCE } from '../balance';
import { slideOf } from '../passives';
import type { EBody } from './atoms';
import type { EffectWorld } from './world';

const D = BALANCE.effects.dao;

/**
 * Slide effects of one body per tick (dao_lua/ngoc fire trail, phan_than/nghin_luoi decoy). The server and the offline
 * client both feed `EBody.sliding`; the decoy appears on the slide's first tick, the trail drops a lava patch every D.trail.every seconds.
 */
export function tickSlide(w: EffectWorld, b: EBody, dt: number): void {
  const key = `slide:${b.id}`, was = (w.mem.get(key) ?? 0) > 0, now = !!b.sliding && b.alive;
  w.mem.set(key, now ? 1 : 0);
  const kind = slideOf(b.passives);
  if (!kind) return;
  if (kind === 'decoy') {
    if (now && !was && w.ready(`decoy:${b.id}`, D.decoy.cd)) w.spawn('decoy', b.id, b.x, b.y, b.z, b.yaw, D.decoy.s, D.decoy.r, undefined, D.decoy.dmg);
    return;
  }
  const tk = `trail:${b.id}`;
  if (!now) { w.mem.set(tk, 0); return; }
  const left = (w.mem.get(tk) ?? 0) - dt;
  if (left > 0) { w.mem.set(tk, left); return; }
  w.mem.set(tk, D.trail.every);
  w.spawn('lava', b.id, b.x, b.y, b.z, b.yaw, D.trail.s, D.trail.r, undefined, D.trail.dps);
}
