import { BALANCE } from '../balance';
import { FAMILIES } from '../data/weapons';
import { forgeSync, strikeNet } from '../forge/sync';
import type { ForgeOp } from '../net/match-msgs';
import { knockFrom } from './effects';
import type { MPlayer, Out } from './mplayer';

/**
 * Server-authoritative forging (TECH §4): the room's RNG rolls every strike with shared/forge/session.ts.
 * The client predicts ring/heat/cooldown and sends ops; the server answers with `forged` (broadcast) and
 * `fsync` (owner). A strike carries its pointer-down time; the server re-checks the ring phase at that time (within strikeTolS) and rolls Lên/Giữ.
 */
const F = BALANCE.forge, A = BALANCE.net.auth;

export function nearOwnAnvil(p: MPlayer): boolean {
  if (!p.anvil) return false;
  return Math.hypot(p.st.x - p.anvil.p[0], p.st.z - p.anvil.p[2]) <= F.anvil.useRadius + A.anvilTol;
}

export function leaveStance(p: MPlayer, now = p.forge.time): void { p.stance = false; p.heating = false; p.forge.endFrenzy(now); }

/** `now` = match seconds. A strike's `at` is the client's pointer-down time on the same clock: it must not be from the future
 *  or older than a second, strikes come in order and no faster than `minGapS`; the zone is judged with `strikeTolS` of slack. */
export function forgeOp(p: MPlayer, op: ForgeOp, out: Out[], all: readonly MPlayer[] = [], now = p.forge.time): void {
  const s = p.forge;
  s.setTime(now);
  if (op.k === 'strike' || op.k === 'frenzy') p.forgeOps++;
  switch (op.k) {
    case 'stance':
      if (op.on && p.alive && nearOwnAnvil(p)) p.stance = true; else leaveStance(p, now);
      break;
    case 'heat': p.heating = op.on && p.stance; break;
    case 'strike': {
      if (!p.stance || s.pendingPick !== null) break;
      const at = Math.max(now - 1, Math.min(now + A.strikeTolS, op.at));
      if (at < s.lastStrikeAt + F.ring.minGapS) break;
      const r = s.strike(at, A.strikeTolS);
      if (r.outcome === 'vo' && p.fx.wave > 0 && p.anvil) wave(p, all, out);
      out.push({ to: 'all', m: { t: 'forged', id: p.id, r: strikeNet(r, s.heat), n: op.n } });
      break;
    }
    case 'frenzy': if (p.stance) s.activateFrenzy(Math.max(now - 1, Math.min(now, op.at))); break;
    case 'pick': if ((FAMILIES as readonly string[]).includes(op.f)) s.pickFamily(op.f); break;
    case 'swap': if (!p.stance) s.swapSlot(true); break;
    case 'target': s.toggleTarget(); break;
  }
  out.push({ to: p.id, m: { t: 'fsync', s: forgeSync(s, p.forgeOps) } });
}

/** Per server tick: clock, heat, the end of Nhập thần (only at the anvil). */
export function forgeTick(p: MPlayer, dt: number, out: Out[], now = p.forge.time): void {
  const s = p.forge, was = s.frenzy;
  s.setTime(now);
  if (p.stance && !nearOwnAnvil(p)) leaveStance(p, now);
  s.tick(dt, p.heating && p.stance);
  if (was !== s.frenzy) out.push({ to: p.id, m: { t: 'fsync', s: forgeSync(s, p.forgeOps) } });
}

/** Death: the held blade loses levels (never breaks; the form stays at its best). */
export function deathLoss(p: MPlayer): void {
  leaveStance(p);
  const b = p.forge.blade;
  b.level = Math.max(0, b.level - BALANCE.match.deathLevelLoss);
}

/** bua_nen: a Hỏng knocks everyone near the anvil back (no damage). */
function wave(p: MPlayer, all: readonly MPlayer[], out: Out[]): void {
  const a = p.anvil!;
  for (const o of all) {
    if (o === p || !o.alive || !o.online || Math.hypot(o.st.x - a.p[0], o.st.z - a.p[2]) > p.fx.wave) continue;
    out.push({ to: o.id, m: { t: 'knock', kn: knockFrom(a.p[0], a.p[2], o, 7, 3) } });
  }
}
