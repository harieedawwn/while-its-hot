import { BALANCE } from '../balance';
import { newBlade } from '../forge/session';
import { forgeSync } from '../forge/sync';
import type { PickupNet, Vec3 } from '../net/match-msgs';
import { FOUNDRY, pedestalSlots, rackSlots } from '../world/arenas/foundry';
import type { MPlayer, Out } from './mplayer';

/**
 * Raw blanks (phôi) lying in the arena (GDD §3): one per player + 1 on the pedestal at the start, `rackEach`
 * more on free side-rack slots every `rackEveryS`. Taking one gives a second blade (max carried 2).
 */
const M = BALANCE.match;

export class Pickups {
  readonly list: PickupNet[] = [];
  private next = 1;
  private rackAt: number;

  constructor(players: number, now: number, private rand: () => number) {
    const top = FOUNDRY.pedestal.top;
    for (const [x, z] of pedestalSlots().slice(0, Math.min(FOUNDRY.pedestal.slots, players + 1))) this.add([x, top, z]);
    this.rackAt = now + M.rackEveryS * 1000;
  }

  private add(p: Vec3): PickupNet { const k = { id: this.next++, p }; this.list.push(k); return k; }

  /** Spawn rack blanks when due. */
  tick(now: number, out: Out[]): void {
    if (now < this.rackAt) return;
    this.rackAt += M.rackEveryS * 1000;
    const free: Vec3[] = [];
    FOUNDRY.racks.forEach((_, i) => rackSlots(i).forEach(([x, z]) => {
      if (!this.list.some((k) => Math.hypot(k.p[0] - x, k.p[2] - z) < 0.3)) free.push([x, FOUNDRY.rack.slotY, z]);
    }));
    const add: PickupNet[] = [];
    for (let i = 0; i < M.rackEach && free.length && this.list.length < M.maxLying; i++) {
      add.push(this.add(free.splice(Math.floor(this.rand() * free.length), 1)[0]));
    }
    if (add.length) out.push({ to: 'all', m: { t: 'pickup', add, del: [], by: 0 } });
  }

  /** A take request: in reach, alive and a free hand. */
  take(p: MPlayer, id: number, out: Out[]): void {
    const i = this.list.findIndex((k) => k.id === id);
    if (i < 0 || !p.alive || p.forge.carried >= M.maxCarry) return;
    const k = this.list[i];
    if (Math.hypot(p.st.x - k.p[0], p.st.z - k.p[2]) > M.pickupR + BALANCE.net.auth.pickupTol) return;
    this.list.splice(i, 1);
    const s = p.forge;
    s.blades[1 - s.slot] = newBlade(); s.carried = 2;
    out.push({ to: 'all', m: { t: 'pickup', add: [], del: [id], by: p.id } }, { to: p.id, m: { t: 'fsync', s: forgeSync(s, p.forgeOps) } });
  }
}
