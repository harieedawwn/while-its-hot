import { BALANCE } from '../balance';
import { FAMILIES } from '../data/weapons';
import { MODULE_IDS, type ModuleId } from '../data/modules';
import { foldRelics, isRelic } from '../data/relics';
import { ForgeSession, type RandFn } from '../forge/session';
import { forgeSync } from '../forge/sync';
import type { MatchRules } from '../net/protocol';
import type { MatchClientMsg, PhaseName, PhaseNet, ScoreNet } from '../net/match-msgs';
import { FOUNDRY, SPAWN_POINTS } from '../world/arenas/foundry';
import { leaveStance } from './forge-auth';
import type { MPlayer, Out } from './mplayer';
import { burnDps, killPoints, makeOffers, notorietyFor, ringRadius, roundWinner } from './rules';

/**
 * The round machine (GDD §3, §8), pure: cage (relic draft) → fight (truce, fire ring, lives) → result →
 * next cage … until someone holds `winsToWin` rounds → end. `MatchAuthority` calls `tick` and `onKill`;
 * everything here goes out as messages. Times are match ms.
 */
const M = BALANCE.match;
type Harm = (t: MPlayer, dmg: number, by: number, out: Out[]) => void;

export class RoundFlow {
  ph: PhaseName = 'cage';
  n = 0;
  at = 0; end = 0; truceEnd = 0;
  ring = 0;
  win = 0;
  /** Set once the end screen has been up long enough: the room may return to the lobby. */
  finished = false;
  matchWin = 0;
  private last = 0;
  private lastLead = 0;

  constructor(private players: Map<number, MPlayer>, readonly rules: MatchRules, private rand: RandFn, private harm: Harm, private onFight: (now: number, out: Out[]) => void) {}

  /** Immune to everything outside the fight, and during the truce. */
  truceUntil(): number { return this.ph === 'fight' ? this.truceEnd : Infinity; }
  get fighting(): boolean { return this.ph === 'fight'; }
  fightS(now: number): number { return Math.max(0, (now - this.at) / 1000); }
  net(): PhaseNet { return { ph: this.ph, n: this.n, at: this.at, end: this.end, truce: this.truceEnd, ring: this.ring, win: this.win }; }
  rows(): ScoreNet[] {
    return [...this.players.values()].map((p) => ({ id: p.id, pts: p.pts, kills: p.kills, deaths: p.deaths, lives: p.lives, wins: p.wins, stacks: p.stacks }));
  }

  /** Begin the first round (cage). */
  start(now: number, out: Out[], skipCage = false): void { this.last = now; this.cage(now, out); if (skipCage) this.fight(now, out); }

  private cage(now: number, out: Out[]): void {
    this.ph = 'cage'; this.n++; this.at = now; this.end = now + M.cageS * 1000; this.truceEnd = 0; this.win = 0;
    this.ring = Math.floor(this.rand() * FOUNDRY.ringCenters.length);
    const list = [...this.players.values()];
    const standing = [...list].sort((a, b) => a.wins - b.wins || a.pts - b.pts);
    list.forEach((p, i) => {
      if (p.anvil) { out.push({ to: 'all', m: { t: 'anvil', id: p.id, act: 'lift', p: p.anvil.p, yaw: p.anvil.yaw } }); p.anvil = null; }
      leaveStance(p);
      const c = SPAWN_POINTS[i % SPAWN_POINTS.length];
      p.forge = new ForgeSession(this.rand); p.forge.carried = 1;
      p.fx = foldRelics(p.relics);
      this.arm(p);
      Object.assign(p, { hp: BALANCE.combat.hp, alive: true, lives: this.rules.lives, rKills: 0, rDealt: 0, parryAt: -1e9, burnT: 0, swings: [], hongRun: 0, ifUntil: 0 });
      Object.assign(p.st, { x: c.pos[0], y: c.pos[1], z: c.pos[2], vx: 0, vy: 0, vz: 0, yaw: c.yaw });
      out.push({ to: 'all', m: { t: 'spawn', id: p.id, p: c.pos, yaw: c.yaw, hp: p.hp } });
      out.push({ to: p.id, m: { t: 'fsync', s: forgeSync(p.forge) } });
      const last = this.n > 1 && standing[0] === p;
      p.offer = makeOffers(p.relics, last, p.offerNo, this.rand);
      p.offerNo++;
      out.push({ to: p.id, m: { t: 'offer', ids: p.offer, rerolls: p.rerolls } }, { to: p.id, m: { t: 'own', relics: p.relics.slice() } });
    });
    out.push({ to: 'all', m: { t: 'phase', f: this.net(), rows: this.rows() } });
  }

  /** Relic effects at the start of a round: mods, charges, starting armor, owned modules. */
  private arm(p: MPlayer): void {
    const f = p.forge, x = p.fx;
    f.mods = { ...f.mods, cadenceMul: x.cadenceMul, heatDecayMul: x.heatDecayMul, heatGainMul: x.heatGainMul, zoneMul: x.zoneMul, notoriety: p.stacks, mercy: 0 };
    f.noBreak = x.noBreak; f.tuyet = x.tuyet; f.armor = Math.min(BALANCE.forge.armor.maxLevel, x.armorStart);
    f.modules = p.relics.filter((r): r is ModuleId => (MODULE_IDS as readonly string[]).includes(r));
  }

  draft(p: MPlayer, m: Extract<MatchClientMsg, { t: 'draft' }>, out: Out[]): void {
    if (this.ph !== 'cage' || !p.offer) return;
    if (m.reroll) {
      if (p.rerolls <= 0) return;
      p.rerolls--;
      p.offer = makeOffers(p.relics, false, 99, this.rand);
      out.push({ to: p.id, m: { t: 'offer', ids: p.offer, rerolls: p.rerolls } });
    } else if (typeof m.pick === 'string' && p.offer.includes(m.pick)) this.take(p, m.pick, out);
  }
  private take(p: MPlayer, id: string, out: Out[]): void {
    p.offer = null;
    if (!p.relics.includes(id) && (isRelic(id) || (MODULE_IDS as readonly string[]).includes(id))) p.relics.push(id);
    p.fx = foldRelics(p.relics); this.arm(p);
    out.push({ to: p.id, m: { t: 'own', relics: p.relics.slice() } }, { to: p.id, m: { t: 'fsync', s: forgeSync(p.forge) } });
  }

  /** A kill: points (+ bounty), a life, kill levels. */
  onKill(t: MPlayer, a: MPlayer | undefined, out: Out[]): void {
    t.deaths++; t.lives = Math.max(0, t.lives - 1);
    if (a && a !== t) {
      a.pts += killPoints(t.stacks); a.rKills++;
      if (a.fx.killLevels > 0 && a.alive) { const b = a.forge.blade; b.level = Math.min(BALANCE.weapons.maxLevel, b.level + a.fx.killLevels); b.best = Math.max(b.best, b.level); out.push({ to: a.id, m: { t: 'fsync', s: forgeSync(a.forge) } }); }
    }
    out.push({ to: 'all', m: { t: 'score', rows: this.rows() } });
  }

  /** Dead players with lives stand up again, only in the fight. */
  canRespawn(p: MPlayer): boolean { return this.ph === 'fight' && p.lives > 0; }

  tick(now: number, out: Out[]): void {
    const dt = Math.max(0, Math.min(0.25, (now - this.last) / 1000)); this.last = now;
    if (this.ph === 'cage' && now >= this.end) this.fight(now, out);
    else if (this.ph === 'fight') { this.burn(now, dt, out); this.checkEnd(now, out); }
    else if (this.ph === 'result' && now >= this.end) { if (this.matchWin) this.over(now, out); else this.cage(now, out); }
    else if (this.ph === 'end' && now >= this.end) this.finished = true;
  }

  private fight(now: number, out: Out[]): void {
    for (const p of this.players.values()) if (p.offer) this.take(p, p.offer[0], out);
    this.ph = 'fight'; this.at = now; this.end = now + this.rules.roundS * 1000; this.truceEnd = now + this.rules.truce * 1000;
    this.onFight(now, out);
    out.push({ to: 'all', m: { t: 'phase', f: this.net(), rows: this.rows() } });
  }

  private burn(now: number, dt: number, out: Out[]): void {
    const s = this.fightS(now), r = ringRadius(s, this.rules.ring), c = FOUNDRY.ringCenters[this.ring % FOUNDRY.ringCenters.length];
    for (const p of this.players.values()) {
      const outside = r > 0 && Math.hypot(p.st.x - c[0], p.st.z - c[1]) > r;
      p.forge.mods.heatDecayMul = p.fx.heatDecayMul * (outside ? M.ring.heatMul : 1);
      if (outside && p.alive && now >= this.truceEnd) this.harm(p, burnDps(s) * dt, 0, out);
    }
  }

  private checkEnd(now: number, out: Out[]): void {
    const live = [...this.players.values()].filter((p) => p.online && p.lives > 0);
    if (now >= this.end || (this.players.size >= 2 && live.length <= 1)) this.result(now, out);
  }

  private result(now: number, out: Out[]): void {
    const list = [...this.players.values()];
    const r = roundWinner(list.map((p) => ({ id: p.id, kills: p.rKills, lives: p.lives, dealt: p.rDealt, online: p.online })));
    this.win = r.win ?? 0; this.lastLead = r.lead;
    for (const p of list) {
      p.stacks = p.id === this.win ? notorietyFor(r.lead) : 0;
      p.rerolls = p.id === this.win ? 0 : M.draft.rerolls;
      for (const b of p.forge.blades) if (b.family) { const i = FAMILIES.indexOf(b.family); p.best[i] = Math.max(p.best[i], b.best); }
      leaveStance(p);
    }
    const w = this.players.get(this.win);
    if (w) { w.wins++; if (w.wins >= this.rules.rounds) this.matchWin = w.id; }
    this.ph = 'result'; this.at = now; this.end = now + M.resultS * 1000;
    out.push({ to: 'all', m: { t: 'phase', f: this.net(), rows: this.rows() } });
  }

  private over(now: number, out: Out[]): void {
    this.ph = 'end'; this.at = now; this.end = now + M.endHoldS * 1000;
    const rows = [...this.players.values()].map((p) => ({
      id: p.id, pts: p.pts, kills: p.kills, deaths: p.deaths, lives: p.lives, wins: p.wins, stacks: p.stacks, best: p.best.slice() as [number, number, number], relics: p.relics.slice(),
    }));
    out.push({ to: 'all', m: { t: 'phase', f: this.net(), rows: this.rows() } }, { to: 'all', m: { t: 'end', win: this.matchWin, rows } });
  }

  /** Lead of the last round (tests). */
  get lead(): number { return this.lastLead; }
}
