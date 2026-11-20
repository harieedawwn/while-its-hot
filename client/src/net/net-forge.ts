import { applyForgeSync, type ClientMsg, type ForgeSession, type ForgeSync, type MatchServerMsg, type StrikeNet, type StrikeResult, weaponById } from '@wih/shared';
import { bus } from '../core/events';
import type { ForgeController, ForgeLink } from '../forge/controller';
import type { NetAnvils } from './net-anvils';

/**
 * Forging online (TECH §4, ROUND3 §1). The controller predicts the ring, heat and every op, and tells the room;
 * a strike goes out stamped with the pointer-down time on the shared clock, so the room judges the same ring
 * phase. The hammer and the local Trúng/Trượt word are already shown; the room's Lên/Giữ roll follows. `forged`
 * for us is held until the `fsync` right behind it, so the session shows the server's level when the sparks fly.
 * The predicted ring stays until the room has handled every strike/frenzy we sent (`ForgeSync.ops`).
 */
export class NetForge implements ForgeLink {
  controller: ForgeController | null = null;
  strikes = 0;
  private n = 0;
  private sent = 0;
  private held: StrikeNet | null = null;

  constructor(private send: (m: ClientMsg) => void, private session: ForgeSession, private anvils: NetAnvils, private me: () => number) {}

  op(o: Parameters<ForgeLink['op']>[0]): void { if (o.k === 'frenzy') this.sent++; this.send({ t: 'forge', op: o }); }
  strike(at: number): void { this.sent++; this.send({ t: 'forge', op: { k: 'strike', at, n: ++this.n } }); }

  onMsg(m: MatchServerMsg): void {
    if (m.t === 'forged') {
      if (m.id !== this.me()) { this.remote(m.id, m.r); return; }
      this.strikes++;
      this.held = m.r;
    } else if (m.t === 'fsync') this.sync(m.s);
  }

  /** Apply the server's session; reveal a held strike now that the numbers match it. */
  sync(s: ForgeSync): void {
    const h = this.held;
    this.held = null;
    applyForgeSync(this.session, s, { heat: !!h, ring: s.ops >= this.sent });
    if (h && this.controller) this.controller.reveal(toResult(h));
    void this.controller?.syncWeapon();
  }

  private remote(id: number, r: StrikeNet): void {
    const p = this.anvils.face(id);
    if (!p) return;
    bus.emit('forge:strike', { outcome: r.outcome, hit: r.timing === 'hit', frenzy: r.frenzy, target: r.target, level: r.level, refused: r.refused, heat: r.heat, x: p.x, y: p.y, z: p.z, owner: id, fallS: 0 });
  }
}

function toResult(r: StrikeNet): StrikeResult {
  return { outcome: r.outcome, timing: r.timing, target: r.target, delta: r.delta, level: r.level, refused: r.refused, frenzy: r.frenzy, pick: r.pick, evolved: r.evolved ? weaponById(r.evolved) : null };
}
