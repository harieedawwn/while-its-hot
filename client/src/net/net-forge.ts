import { applyForgeSync, type ClientMsg, type ForgeSession, type ForgeSync, type MatchServerMsg, OUTCOME_DELTA, type StrikeNet, type StrikeResult, type Timing, weaponById } from '@wih/shared';
import { bus } from '../core/events';
import type { ForgeController, ForgeLink } from '../forge/controller';
import type { ForgeStage } from '../forge/stage';
import type { NetAnvils } from './net-anvils';

/** A strike the server has not answered after this long was refused (cooldown, left the stance): lower the hammer. */
const PENDING_MS = 900;

/**
 * Forging online (TECH §4). The controller predicts the ring, heat, cooldown and every op and tells the
 * room; a strike only raises the hammer until the room's roll comes back, then it falls (the latency
 * hides in the bigger swing). `forged` for us is held until the `fsync` right behind it, so the session
 * shows the server's level when the sparks fly. Other players' strikes throw sparks at their anvil.
 */
export class NetForge implements ForgeLink {
  controller: ForgeController | null = null;
  strikes = 0;
  private n = 0;
  private pending: { n: number; at: number }[] = [];
  private held: { r: StrikeNet; auto: boolean } | null = null;

  constructor(private send: (m: ClientMsg) => void, private session: ForgeSession, private stage: ForgeStage,
    private anvils: NetAnvils, private me: () => number) {
    session.autoStrike = false;
  }

  op(o: Parameters<ForgeLink['op']>[0]): void { this.send({ t: 'forge', op: o }); }
  strike(timing: Timing): void {
    const n = ++this.n;
    this.pending.push({ n, at: performance.now() });
    this.send({ t: 'forge', op: { k: 'strike', timing, n } });
  }

  onMsg(m: MatchServerMsg): void {
    if (m.t === 'forged') {
      if (m.id !== this.me()) { this.remote(m.id, m.r); return; }
      this.strikes++;
      this.pending = this.pending.filter((p) => p.n !== m.n);
      this.held = { r: m.r, auto: m.n < 0 };
    } else if (m.t === 'fsync') this.sync(m.s);
  }

  /** Apply the server's session; reveal a held strike now that the numbers match it. */
  sync(s: ForgeSync): void {
    const h = this.held;
    this.held = null;
    applyForgeSync(this.session, s, !!h);
    if (h && this.controller) this.controller.reveal(toResult(h.r), h.auto);
    void this.controller?.syncWeapon();
  }

  tick(): void {
    const now = performance.now();
    if (this.pending.length && now - this.pending[0].at > PENDING_MS) { this.pending.shift(); if (!this.pending.length) this.stage.lower(); }
  }

  private remote(id: number, r: StrikeNet): void {
    const p = this.anvils.face(id);
    if (!p) return;
    bus.emit('forge:strike', { outcome: r.outcome, perfect: r.timing === 'perfect', auto: r.timing === 'auto', target: r.target, level: r.level, refused: r.refused, broke: r.broke, heat: r.heat, x: p.x, y: p.y, z: p.z, owner: id, fallS: 0 });
  }
}

function toResult(r: StrikeNet): StrikeResult {
  return { outcome: r.outcome, timing: r.timing, target: r.target, delta: OUTCOME_DELTA[r.outcome], level: r.level, refused: r.refused, broke: r.broke, pick: r.pick, evolved: r.evolved ? weaponById(r.evolved) : null };
}
