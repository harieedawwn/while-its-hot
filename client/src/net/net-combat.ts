import { attackShape, BALANCE, type MatchServerMsg, type Vec3, resolveHit } from '@wih/shared';
import type { CombatWorld } from '../combat/combat-world';
import type { LocalFighter } from '../combat/local-fighter';
import type { HitClaim, HitResolver } from '../combat/resolver';
import { bus } from '../core/events';
import { pushMove } from '../player/move-state';
import type { Hud } from '../ui/hud/hud';
import type { Remotes } from './remotes';

/**
 * Melee online (TECH §4). Our blade's touches become HitClaims sent to the room; the hit feedback is
 * predicted at once from the target's mirrored state (parries wait for the server). The room's verdicts
 * (dmg, parried, kill, spawn, knock, reject) drive HP, staggers and knockback of our own body and the bus
 * events for everyone else. The local combatant is id 0 on the bus; `me` is our room id.
 */
export interface NetCombatDeps {
  lf: LocalFighter; world: CombatWorld; remotes: Remotes; hud: Hud;
  me(): number; send(m: import('@wih/shared').ClientMsg): void;
  /** Match ms now and the render time remotes are drawn at. */
  now(): number; renderT(): number;
  name(id: number): string;
  /** We died / stood up again at p. */
  died(): void; spawned(p: Vec3, yaw: number): void;
  /** We became a Hồn (ghost). */
  ghosted(): void;
}

const C = BALANCE.combat;
type Msg<T extends MatchServerMsg['t']> = Extract<MatchServerMsg, { t: T }>;

export class NetCombat implements HitResolver {
  accepted = 0; rejected = 0; lastReject = '';
  private predicted = new Set<string>();

  constructor(private d: NetCombatDeps) {}

  /** Bus id of a room id (we are 0). */
  private local(id: number): number { return id === this.d.me() ? 0 : id; }

  claim(c: HitClaim): void {
    if (c.attacker !== 0) return;
    const a = this.d.lf.c, t = this.d.world.byId(c.target);
    if (!t || !t.alive) return;
    const shape = attackShape(a.weapon, c.kind, c.combo, c.dist);
    const res = resolveHit({ x: a.body.s.pos.x, z: a.body.s.pos.z, shape, family: a.weapon.family, weaponLevel: a.level }, t.view());
    const [x, y, z] = c.point;
    if (res.r !== 'immune' && res.r !== 'parried') {
      this.predicted.add(`${c.attackId}:${c.target}`);
      bus.emit('combat:hit', { attacker: 0, target: t.id, dmg: res.dmg, zone: c.zone, kind: c.kind, result: res.r, x, y, z });
    }
    this.d.send({ t: 'hit', s: c.attackId, tg: c.target, zone: c.zone, dist: c.dist, p: [x, y, z], at: this.d.now(), rt: this.d.renderT() });
  }

  onMsg(m: MatchServerMsg): void {
    switch (m.t) {
      case 'dmg': this.dmg(m); break;
      case 'parried': this.parried(m); break;
      case 'reject': this.rejected++; this.lastReject = m.why; this.predicted.delete(`${m.s}:${m.tg}`); break;
      case 'kill': this.kill(m); break;
      case 'spawn':
        if (m.id === this.d.me()) { this.d.lf.c.revive(); this.d.spawned(m.p, m.yaw); }
        else this.d.remotes.teleport(m.id);
        break;
      case 'ghost': if (m.id === this.d.me()) this.d.ghosted(); break;
      case 'rtick': this.ringTick(m.id); break;
      case 'heal': this.d.lf.c.hp = m.hp; break;
      case 'knock': pushMove(this.d.lf.c.body.s, m.kn[0], m.kn[2], C.pushS, m.kn[1]); break;
      default: break;
    }
  }

  private dmg(m: Msg<'dmg'>): void {
    const me = this.d.me(), lc = this.d.lf.c;
    if (m.a === me) {
      this.accepted++;
      if (this.predicted.delete(`${m.s}:${m.tg}`)) return; // already shown when the blade touched
    }
    if (m.tg === me) {
      const s = lc.body.s;
      lc.hp = m.hp;
      s.stamina = Math.max(0, s.stamina - m.sc);
      if (m.st > 0) lc.fighter.stagger(m.st); else if (m.r !== 'blocked') lc.fighter.flinch();
      pushMove(s, m.kn[0], m.kn[2], C.pushS, m.kn[1]);
    }
    bus.emit('combat:hit', { attacker: this.local(m.a), target: this.local(m.tg), dmg: m.dmg, zone: m.zone, kind: m.kind, result: m.r, x: m.p[0], y: m.p[1], z: m.p[2] });
  }

  private parried(m: Msg<'parried'>): void {
    const me = this.d.me(), lc = this.d.lf.c;
    if (m.a === me) { this.predicted.delete(`${m.s}:${m.tg}`); lc.fighter.stagger(m.st); }
    if (m.tg === me) { lc.fighter.parried(); lc.body.s.stamina = Math.min(BALANCE.move.stamina.pips, lc.body.s.stamina + m.stam); }
    bus.emit('combat:parry', { parrier: this.local(m.tg), attacker: this.local(m.a), x: m.p[0], y: m.p[1], z: m.p[2] });
  }

  /** One fire-ring tick on `id`: sound, hurt cam and vignette pulse listen on the bus. */
  private ringTick(id: number): void {
    const p = id === this.d.me() ? this.d.lf.c.body.s.pos : this.d.remotes.get(id)?.c.body.s.pos;
    if (p) bus.emit('ring:hurt', { id: this.local(id), x: p.x, y: p.y, z: p.z });
  }

  private kill(m: Msg<'kill'>): void {
    const me = this.d.me();
    if (m.tg === me) { this.d.lf.c.hp = 0; this.d.lf.c.fighter.kill(); this.d.died(); }
    const at = m.tg === me ? this.d.lf.c.body.s.pos : this.d.remotes.get(m.tg)?.c.body.s.pos;
    bus.emit('combat:kill', { target: this.local(m.tg), by: this.local(m.by), x: at?.x, y: at?.y, z: at?.z });
    const killer = m.by === me ? this.d.lf.c : this.d.remotes.get(m.by)?.c;
    this.d.hud.kill(this.d.name(m.by), this.d.name(m.tg), killer?.weapon.family ?? null, m.by === me || m.tg === me);
  }
}
