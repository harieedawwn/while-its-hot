import { BALANCE } from '../balance';
import { fxOf, hpMax, type MPlayer, type Out } from './mplayer';

const K = BALANCE.cards;

/**
 * Per server tick, per living player (cards): Hồi sức regenerates after `regenIdleS` untouched; the shoulder gun
 * (Súng máy vai) fires an explosive bolt at the nearest living foe in range every `gunEveryS`.
 */
export function cardTick(p: MPlayer, players: ReadonlyMap<number, MPlayer>, now: number, harm: (t: MPlayer, d: number, by: number, out: Out[]) => void, out: Out[]): void {
  const fx = fxOf(p);
  if (fx.regenHps > 0 && now - p.hurtAt >= K.regenIdleS * 1000 && p.hp < hpMax(p)) {
    p.hp = Math.min(hpMax(p), p.hp + fx.regenHps * 0.05);
    if (((now / 50) | 0) % 10 === 0) out.push({ to: p.id, m: { t: 'heal', hp: p.hp } });
  }
  if (fx.gunEveryS <= 0 || now < p.gunAt) return;
  if (p.gunAt === 0) { p.gunAt = now + fx.gunEveryS * 1000; return; }
  let best: MPlayer | null = null, bd: number = K.gunRange;
  for (const o of players.values()) {
    if (o === p || !o.alive || !o.online || o.spawnUntil > now) continue;
    const d = Math.hypot(o.st.x - p.st.x, o.st.z - p.st.z);
    if (d < bd) { bd = d; best = o; }
  }
  if (!best) return;
  p.gunAt = now + fx.gunEveryS * 1000;
  const dx = best.st.x - p.st.x, dz = best.st.z - p.st.z, k = K.gunKnock / Math.max(0.1, bd);
  harm(best, K.gunDmg, p.id, out);
  out.push({ to: 'all', m: { t: 'edmg', tg: best.id, by: p.id, dmg: K.gunDmg, k: 'boom', hp: best.hp } });
  out.push({ to: best.id, m: { t: 'knock', kn: [dx * k, 3, dz * k] } });
}
