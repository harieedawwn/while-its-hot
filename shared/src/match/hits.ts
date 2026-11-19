import { BALANCE } from '../balance';
import { resolveHit, type DefenderView } from '../combat/damage';
import { attackShape, framesOf, totalS } from '../combat/frames';
import { passivesOf } from '../data/weapons';
import { FLAG } from '../net/codec';
import type { MatchClientMsg, Vec3 } from '../net/match-msgs';
import { hitEffects, parryEffects, parryWindow } from '../passives';
import { knockFrom, serverEffects, type Harm } from './effects';
import { flatDist, type MPlayer, type Out } from './mplayer';

/**
 * Server-side melee authority (TECH §4): record swings, validate hit claims, resolve parry/block with the
 * shared damage rules and emit dmg/parried/reject. Movement stays client-authoritative; this only judges.
 */
const A = BALANCE.net.auth, C = BALANCE.combat;
type AtkMsg = Extract<MatchClientMsg, { t: 'atk' }>;
type HitMsg = Extract<MatchClientMsg, { t: 'hit' }>;

export interface HitCtx { list: readonly MPlayer[]; truceUntil: number; harm: Harm }

/** A new swing. Ignored (claims for it will be stale) if it starts sooner than the previous swing allows. */
export function recordSwing(a: MPlayer, m: AtkMsg): boolean {
  if (!a.alive) return false;
  const prev = a.swings[a.swings.length - 1];
  if (prev && m.s <= prev.s) return false;
  if (prev && m.kind !== 'heavy') {
    const f = framesOf(a.forge.form.stats.moveset, prev.kind, prev.combo);
    if (m.at - prev.at < totalS(f) * 1000 * A.rateMul) return false;
  }
  a.swings.push({ s: m.s, kind: m.kind, combo: Math.max(0, Math.min(2, m.combo | 0)), at: m.at, hits: new Set() });
  if (a.swings.length > 2) a.swings.shift();
  return true;
}

/** The parry press counts if the hit lands inside its window, widened both ways by min(parryMaxMs, rtt/2). */
export function parryOk(pressAt: number, hitAt: number, rtt: number, windowS: number): boolean {
  const slack = Math.min(A.parryMaxMs, rtt / 2), d = hitAt - pressAt;
  return d >= -slack && d <= windowS * 1000 + slack;
}

/** Inside the dash i-frames at either the hit time or the time the attacker saw the target. */
export function dodged(t: MPlayer, at: number, rt: number): boolean {
  const end = t.dashAt + BALANCE.move.dash.iframeS * 1000;
  return (at >= t.dashAt && at <= end) || (rt >= t.dashAt && rt <= end);
}

/** Why a claim is refused, or null. `now` = server match ms on arrival. */
export function checkClaim(a: MPlayer, t: MPlayer, m: HitMsg, now: number): string | null {
  if (!a.alive) return 'dead';
  if (a === t || !t.alive || !t.online) return 'target';
  const sw = a.swings.find((x) => x.s === m.s);
  if (!sw) return 'stale';
  if (sw.hits.has(t.id)) return 'repeat';
  if (Math.abs(now - m.at) > A.maxAgeMs) return 'old';
  const f = framesOf(a.forge.form.stats.moveset, sw.kind, sw.combo), dt = m.at - sw.at;
  if (dt < f.w * 1000 - A.earlyMs || dt > (f.w + f.a) * 1000 + A.lateMs) return 'timing';
  if (flatDist(a, t) > a.forge.form.stats.reach + A.reachTol) return 'reach';
  return null;
}

export function defenderView(t: MPlayer, m: HitMsg, now: number, truceUntil: number): DefenderView {
  const def = t.forge.form;
  return {
    x: t.st.x, z: t.st.z, yaw: t.st.yaw,
    parrying: parryOk(t.parryAt, m.at, t.rtt, parryWindow(passivesOf(def), C.parry.windowS)),
    blocking: (t.st.flags & FLAG.blocking) !== 0,
    immune: dodged(t, m.at, m.rt) || (t.stance && t.forge.immune) || now < truceUntil || now < t.ifUntil,
    stamina: t.st.stamina, armorLevel: t.forge.armor,
  };
}

/** Judge one claim; every result goes into `out`. */
export function claimHit(ctx: HitCtx, a: MPlayer, t: MPlayer, m: HitMsg, now: number, out: Out[]): void {
  const why = checkClaim(a, t, m, now);
  if (why) { out.push({ to: a.id, m: { t: 'reject', s: m.s, tg: m.tg, why } }); return; }
  const sw = a.swings.find((x) => x.s === m.s)!, def = a.forge.form;
  sw.hits.add(t.id);
  const dist = Math.max(0, Math.min(def.stats.reach, m.dist));
  const shape = attackShape(def, sw.kind, sw.combo, dist);
  const res = resolveHit({ x: a.st.x, z: a.st.z, shape, weaponLevel: a.forge.blade.level }, defenderView(t, m, now, ctx.truceUntil));
  const p: Vec3 = [m.p[0], m.p[1], m.p[2]];
  if (res.r === 'immune') { out.push({ to: a.id, m: { t: 'reject', s: m.s, tg: m.tg, why: 'immune' } }); return; }
  if (res.r === 'parried') {
    const fx = t.fx;
    if (fx.parryHp > 0) t.hp = Math.min(C.hp, t.hp + fx.parryHp);
    out.push({ to: 'all', m: { t: 'parried', a: a.id, tg: t.id, st: res.attackerStaggerS, stam: res.parrierStamina + fx.parryStamina, p, s: m.s } });
    if (fx.parryHp > 0) out.push({ to: t.id, m: { t: 'heal', hp: t.hp } });
    const kn: Vec3 = [0, 0, 0];
    serverEffects(t, a, parryEffects(passivesOf(t.forge.form)), kn, ctx.list, ctx.harm, out);
    return;
  }
  const frames = framesOf(def.stats.moveset, sw.kind, sw.combo);
  const kn = knockFrom(a.st.x, a.st.z, t, res.r === 'blocked' ? frames.knock * C.block.knockMul : frames.knock);
  const fx: Out[] = [];
  if (res.r !== 'blocked') serverEffects(a, t, hitEffects(passivesOf(def), { kind: sw.kind, combo: sw.combo, dist, reach: def.stats.reach }), kn, ctx.list, ctx.harm, fx);
  const dmg = res.dmg * a.fx.dmgMul;
  const hp = Math.max(0, t.hp - dmg);
  out.push({ to: 'all', m: { t: 'dmg', a: a.id, tg: t.id, dmg, r: res.r, zone: m.zone, kind: sw.kind, hp, sc: res.staminaCost, st: res.staggerS, kn, p, s: m.s } });
  ctx.harm(t, dmg, a.id, out);
  out.push(...fx);
}
