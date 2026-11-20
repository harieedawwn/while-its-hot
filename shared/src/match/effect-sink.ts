import { BALANCE } from '../balance';
import { passivesOf } from '../data/weapons';
import { FLAG } from '../net/codec';
import type { AtomFx, EBody, ESink, StatusKind } from '../effects/atoms';
import type { Vec3 } from '../net/match-msgs';
import type { Harm } from './effects';
import { hpMax, type MPlayer, type Out } from './mplayer';

/**
 * The server's ESink (phase 28): effect results become messages. Damage goes through the authority's harm (kills,
 * scores) plus an `edmg` for presentation; knocks/statuses go to the target's client, which owns its movement.
 * `out` is set by the authority before every call into the effect world.
 */
export class ServerSink implements ESink {
  out: Out[] = [];
  constructor(private players: Map<number, MPlayer>, private harm: Harm, private immune: (p: MPlayer) => boolean) {}

  bodies(): EBody[] {
    const list: EBody[] = [];
    for (const p of this.players.values()) {
      if (!p.online) continue;
      const s = p.st;
      list.push({ id: p.id, team: p.id, x: s.x, y: s.y, z: s.z, yaw: s.yaw, pitch: s.pitch, alive: p.alive, passives: passivesOf(p.forge.form), sliding: (s.flags & FLAG.sliding) !== 0, swinging: [1, 2, 3].includes((s.anim >> 4) & 15) });
    }
    return list;
  }
  hurtable(t: EBody): boolean { const p = this.players.get(t.id); return !!p && p.alive && !this.immune(p); }

  damage(t: EBody, dmg: number, by: number, k: Parameters<ESink['damage']>[3]): void {
    const p = this.players.get(t.id);
    if (!p || !p.alive) return;
    this.harm(p, dmg, by, this.out);
    this.out.push({ to: 'all', m: { t: 'edmg', tg: p.id, by, dmg, k, hp: p.hp } });
  }
  knock(t: EBody, v: Vec3, ps?: number, bounce?: boolean): void {
    this.out.push({ to: t.id, m: { t: 'knock', kn: [v[0], v[1], v[2]], ...(ps !== undefined ? { ps } : {}), ...(bounce ? { b: 1 as const } : {}) } });
  }
  status(t: EBody, k: StatusKind, s: number, v: number, p?: Vec3): void {
    this.out.push({ to: 'all', m: { t: 'status', tg: t.id, k, s, v, ...(p ? { p } : {}) } });
  }
  burn(t: EBody, dps: number, s: number, by: number): void {
    const p = this.players.get(t.id);
    if (!p || (p.burnT > 0 && p.burnDps > dps)) return;
    p.burnT = Math.max(p.burnT, s); p.burnDps = dps; p.burnBy = by;
  }
  heal(t: EBody, hp: number): void {
    const p = this.players.get(t.id);
    if (!p || !p.alive) return;
    p.hp = Math.min(hpMax(p), p.hp + hp);
    this.out.push({ to: p.id, m: { t: 'heal', hp: p.hp } });
  }
  teleport(t: EBody, to: Vec3, yaw: number): void {
    const p = this.players.get(t.id);
    if (!p || !p.alive) return;
    p.st.x = to[0]; p.st.y = to[1]; p.st.z = to[2];
    this.out.push({ to: p.id, m: { t: 'tp', p: [to[0], to[1], to[2]], yaw } });
  }
  fx(a: AtomFx): void { this.out.push({ to: 'all', m: { t: 'atom', a } }); }
}
