import { BALANCE } from '../balance';
import { FAMILIES } from '../data/weapons';
import { forgeSync, strikeNet } from '../forge/sync';
import type { ForgeOp } from '../net/match-msgs';
import { knockFrom } from './effects';
import type { MPlayer, Out } from './mplayer';

/**
 * Server-authoritative forging (TECH §4): the room's RNG rolls every strike with shared/forge/session.ts.
 * The client predicts ring/heat/cooldown and sends ops; the server answers with `forged` (broadcast) and
 * `fsync` (owner). A strike's timing (perfect/miss) is the client's word: it is a skill input, not a roll.
 */
const F = BALANCE.forge, A = BALANCE.net.auth;

export function nearOwnAnvil(p: MPlayer): boolean {
  if (!p.anvil) return false;
  return Math.hypot(p.st.x - p.anvil.p[0], p.st.z - p.anvil.p[2]) <= F.anvil.useRadius + A.anvilTol;
}

export function leaveStance(p: MPlayer): void { p.stance = false; p.heating = false; p.forge.endFrenzy(); }

export function forgeOp(p: MPlayer, op: ForgeOp, out: Out[], all: readonly MPlayer[] = []): void {
  const s = p.forge;
  switch (op.k) {
    case 'stance':
      if (op.on && p.alive && nearOwnAnvil(p)) p.stance = true; else leaveStance(p);
      break;
    case 'heat': p.heating = op.on && p.stance; break;
    case 'strike': {
      if (!p.stance || s.pendingPick !== null) break;
      if (s.cooldown > A.strikeTolS) break;
      s.cooldown = 0;
      s.mods.mercy = Math.min(p.fx.mercyMax, p.hongRun * p.fx.mercyStep);
      const r = s.strike(op.timing === 'perfect' ? 'perfect' : 'miss');
      if (r.outcome === 'hong') p.hongRun++; else if (r.outcome !== 'giu') p.hongRun = 0;
      if (r.outcome === 'hong' && p.fx.wave > 0 && p.anvil) wave(p, all, out);
      out.push({ to: 'all', m: { t: 'forged', id: p.id, r: strikeNet(r, s.heat), n: op.n } });
      break;
    }
    case 'frenzy': if (p.stance) s.activateFrenzy(); break;
    case 'pick': if ((FAMILIES as readonly string[]).includes(op.f)) s.pickFamily(op.f); break;
    case 'swap': if (!p.stance) s.swapSlot(true); break;
    case 'target': s.toggleTarget(); break;
  }
  out.push({ to: p.id, m: { t: 'fsync', s: forgeSync(s) } });
}

/** Per server tick: heat, cooldown and frenzy auto-strikes (only at the anvil). */
export function forgeTick(p: MPlayer, dt: number, out: Out[]): void {
  const s = p.forge, was = s.frenzy;
  if (p.stance && !nearOwnAnvil(p)) leaveStance(p);
  const auto = s.tick(dt, p.heating && p.stance);
  for (const r of auto) out.push({ to: 'all', m: { t: 'forged', id: p.id, r: strikeNet(r, s.heat), n: -1 } });
  if (auto.length || was !== s.frenzy) out.push({ to: p.id, m: { t: 'fsync', s: forgeSync(s) } });
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
