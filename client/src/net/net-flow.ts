import { BALANCE, DEFAULT_RULES, type MatchRules, ringSpan, type EndRowNet, foldRelics, type RelicFx, matchUnlocks, type MatchServerMsg, type PhaseNet, ringRadius, type ScoreNet, type Vec3 } from '@wih/shared';
import { clock } from '../core/clock';
import { profile, setProfile } from '../core/profile';
import type { Player } from '../player/player';
import type { Pipeline } from '../render/pipeline';
import { Draft } from '../ui/hud/draft';
import type { Hud, HudState } from '../ui/hud/hud';
import { Banner, EndScreen } from '../ui/hud/match-end';
import { Scoreboard, type ScoreRow } from '../ui/hud/overlays';
import { getTransition } from '../ui/transition';
import { STR } from '../ui/strings.vi';

const M = BALANCE.match;
type Msg<T extends MatchServerMsg['t']> = Extract<MatchServerMsg, { t: T }>;

export interface FlowDeps {
  host: HTMLElement; hud: Hud; pipeline: Pipeline; player: Player;
  arena: { setDoors(p: number): void; openCages(): void; setRing(i: number, r: number): void };
  me(): number; name(id: number): string; color(id: number): string; send(m: { t: 'draft'; pick?: string; reroll?: boolean }): void;
  /** Match ms now. */
  now(): number;
  /** Everyone's weapon for the scoreboard. */
  weaponOf(id: number): { family: ScoreRow['family']; level: number };
  /** A new round starts (cage): put the anvil away, leave the stance. */
  newRound(): void;
  /** Our relic effects changed (Đe nhẹ makes the anvil instant). */
  relicFx(fx: RelicFx): void;
  /** Leave the match (back to the lobby screen). */
  leave(): void;
}

/**
 * The round machine as the client sees it (GDD §3, §8): cage countdown + relic draft, doors, fire ring size,
 * lives and timers on the HUD, result beat with scoreboard, match end with unlocks. The server decides; this
 * only presents and pins the player to the cage until the doors open.
 */
export class NetFlow {
  /** The room's match rules (from the match init message). */
  rules: MatchRules = DEFAULT_RULES;
  f: PhaseNet = { ph: 'cage', n: 0, at: 0, end: 0, truce: 0, ring: 0, win: 0 };
  rows: ScoreNet[] = [];
  relics: string[] = [];
  private draft: Draft;
  private banner: Banner;
  private board: Scoreboard;
  private endScr: EndScreen;
  private pin: Vec3 | null = null;
  private lastPh = '';
  /** Unlock list of this match (after `end`). */
  unlocked: string[] = [];

  constructor(private d: FlowDeps) {
    this.draft = new Draft(d.host, (id) => d.send({ t: 'draft', pick: id }), () => d.send({ t: 'draft', reroll: true }));
    this.banner = new Banner(d.host);
    this.board = new Scoreboard(d.host);
    this.endScr = new EndScreen(d.host, () => d.leave());
  }

  get cage(): boolean { return this.f.ph === 'cage'; }
  get fighting(): boolean { return this.f.ph === 'fight'; }
  mine(): ScoreNet | undefined { return this.rows.find((r) => r.id === this.d.me()); }
  /** Seconds of truce left. */
  truceLeft(now: number): number { return this.fighting ? Math.max(0, (this.f.truce - now) / 1000) : 0; }
  /** Scoreboard while the scoreboard button is held (Tab / touch); the result beat shows it on its own. */
  peek(on: boolean): void {
    if (this.f.ph === 'result' || this.f.ph === 'end') return;
    if (on && !this.board.visible) this.board.show(this.scoreRows());
    else if (!on && this.board.visible) this.board.hide();
  }
  /** Held in the cage until the doors open. */
  pinTo(p: Vec3 | null): void { this.pin = p; }

  onMsg(m: MatchServerMsg): void {
    switch (m.t) {
      case 'phase': this.phase(m.f, m.rows); break;
      case 'score': this.rows = m.rows; break;
      case 'offer': this.draft.show(m.ids, m.rerolls); break;
      case 'own': this.relics = m.relics; this.d.relicFx(foldRelics(m.relics)); break;
      case 'end': this.end(m); break;
      default: break;
    }
  }

  private phase(f: PhaseNet, rows: ScoreNet[]): void {
    const first = this.lastPh === '', changed = f.ph !== this.lastPh || f.n !== this.f.n;
    this.f = f; this.rows = rows; this.lastPh = f.ph;
    if (!changed && !first) return;
    const d = this.d;
    this.board.hide(); this.endScr.hide();
    if (f.ph === 'cage') {
      d.arena.setDoors(0); d.arena.setRing(0, 0); d.newRound();
      this.draft.setHead(f.n); this.banner.flash(STR.match.round(f.n), 1600);
    } else if (f.ph === 'fight') {
      this.draft.hide(); this.pin = null;
      d.arena.openCages(); this.banner.flash(STR.match.fight, 900);
    } else if (f.ph === 'result') {
      this.board.show(this.scoreRows());
      this.banner.flash(f.win ? STR.match.won(d.name(f.win)) : STR.match.draw, 0, true);
      void getTransition().roundEnd(d.pipeline, () => { /* the next cage message repositions everyone */ });
    } else if (f.ph === 'end') this.banner.hide();
  }

  private scoreRows(): ScoreRow[] {
    return this.rows.map((r) => {
      const w = this.d.weaponOf(r.id);
      return { name: this.d.name(r.id), color: this.d.color(r.id), family: w.family, level: w.level, kills: r.kills, deaths: r.deaths, me: r.id === this.d.me() };
    });
  }

  private end(m: Msg<'end'>): void {
    const mine = m.rows.find((r: EndRowNet) => r.id === this.d.me());
    let forms: string[] = [];
    if (mine) {
      const u = matchUnlocks(mine.best, profile.unlocked, profile.bestLevel);
      forms = u.forms;
      const unlocked = { ...profile.unlocked }; for (const id of forms) unlocked[id] = true;
      const drafted = [...new Set([...profile.drafted, ...mine.relics.filter((r) => r in STR.module)])];
      setProfile({ unlocked, bestLevel: u.bestLevel as typeof profile.bestLevel, drafted, stats: { kills: profile.stats.kills + mine.kills, deaths: profile.stats.deaths + mine.deaths, matches: profile.stats.matches + 1 } });
    }
    this.unlocked = forms;
    this.board.hide(); this.banner.hide();
    clock.timeScale = 1; this.d.pipeline.setGrade({ desat: 0, keepHot: false });
    this.endScr.show({ win: m.win, rows: m.rows, name: (id) => this.d.name(id), color: (id) => this.d.color(id), me: this.d.me(), unlocked: forms });
  }

  /** Per sim tick: hold the player in the cage. */
  simTick(): void {
    if (!this.pin || !this.cage) return;
    const s = this.d.player.s;
    s.pos.set(this.pin[0], this.pin[1], this.pin[2]); s.vel.set(0, 0, 0);
  }

  /** Per frame: ring size, timers, lives, draft countdown, keys. */
  frame(now: number, base: HudState): HudState {
    const f = this.f, s = Math.max(0, (now - f.at) / 1000), me = this.mine();
    let roundS: number | null = null, ringS: number | null = null;
    if (f.ph === 'cage') this.draft.setTime(Math.max(0, (f.end - now) / 1000));
    else if (f.ph === 'fight') {
      const tl = this.truceLeft(now);
      roundS = tl > 0 ? tl : Math.max(0, (f.end - now) / 1000);
      ringS = s < M.ring.startS ? M.ring.startS - s : Math.max(0, M.ring.startS + ringSpan(this.rules.ring) - s);
      this.d.arena.setRing(f.ring, ringRadius(s, this.rules.ring));
    }
    return { ...base, roundS, ringS, lives: me ? { left: me.lives, max: this.rules.lives } : null };
  }

  keyPick(i: number): boolean { return this.draft.keyPick(i); }
  dispose(): void { this.draft.dispose(); this.banner.dispose(); this.board.hide(); this.endScr.hide(); clock.timeScale = 1; }
}
