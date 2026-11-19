import type * as THREE from 'three';
import { PLAYER_COLORS, type Snapshot } from '@wih/shared';
import type { CombatWorld } from '../combat/combat-world';
import type { CollisionWorld } from '../physics/world';
import type { MaterialLib } from '../render/materials/library';
import { JitterMeter } from './interp';
import { RemotePlayer } from './remote';

/** A remote missing from snapshots this long (ms of server time) is offline: hidden and untargetable. */
const GONE_MS = 1500;

/**
 * Every other player in the room: snapshot intake (with the jitter → delay estimate), creation on first
 * sight, per-tick sampling for the blade sweeps and per-frame drawing. Remote combatants live in the
 * CombatWorld so sweeps, aim assist and FX find them like dummies.
 */
export class Remotes {
  readonly map = new Map<number, RemotePlayer>();
  readonly jitter = new JitterMeter();
  /** Newest server time seen (match ms). */
  latest = 0;
  snaps = 0;
  me = 0;

  constructor(private scene: THREE.Scene, private combat: CombatWorld, private world: CollisionWorld, private lib: MaterialLib,
    private load: (id: string) => Promise<THREE.Object3D>, private colorOf: (id: number) => number) {}

  /** arrival = local match-time estimate when the snapshot came in. */
  snapshot(s: Snapshot, arrival: number): void {
    this.snaps++;
    this.jitter.add(s.serverTime, arrival);
    this.latest = Math.max(this.latest, s.serverTime);
    for (const p of s.players) {
      if (p.id === this.me) continue;
      let r = this.map.get(p.id);
      if (!r) {
        r = new RemotePlayer(p.id, this.world, this.lib, PLAYER_COLORS[this.colorOf(p.id) % PLAYER_COLORS.length], this.load);
        this.map.set(p.id, r); this.scene.add(r.ch.root);
      }
      r.buf.push(s.serverTime, p.state); r.seenAt = s.serverTime;
    }
  }

  /** Sample everyone at render time rt; keep the combat list in step with who is online. */
  apply(rt: number): void {
    for (const r of this.map.values()) {
      const on = this.latest - r.seenAt < GONE_MS;
      const i = this.combat.list.indexOf(r.c);
      if (on && i < 0) this.combat.add(r.c);
      else if (!on && i >= 0) { this.combat.list.splice(i, 1); r.mode = 'none'; }
      if (on) r.apply(rt);
    }
  }

  render(dt: number, frozen: boolean): void { for (const r of this.map.values()) r.render(dt, frozen); }

  get(id: number): RemotePlayer | undefined { return this.map.get(id); }
  teleport(id: number): void { this.map.get(id)?.teleport(); }

  /** Worst buffer fill for the debug overlay. */
  get modes(): string { const m: Record<string, number> = {}; for (const r of this.map.values()) m[r.mode] = (m[r.mode] ?? 0) + 1; return Object.entries(m).map(([k, v]) => `${k}${v}`).join(' '); }

  dispose(): void {
    for (const r of this.map.values()) { const i = this.combat.list.indexOf(r.c); if (i >= 0) this.combat.list.splice(i, 1); r.dispose(); }
    this.map.clear();
  }
}
