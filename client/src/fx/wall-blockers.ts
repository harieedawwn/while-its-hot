import { BALANCE, type Ent } from '@wih/shared';
import type { Blocker } from '../physics/blockers';
import type { CollisionWorld } from '../physics/world';

const W = BALANCE.effects.tay.wall;
const PER = 3;

/**
 * Găng đá walls are solid (phase 29): every live `wall` entity becomes a row of three blocker cylinders across its width,
 * switched on while it stands (rises over 0.15 s with the mesh, sinks in its last 12 %). Same source as the drawing: the local
 * EffectWorld offline, the snapshot online, so everyone's own movement collides with the same wall.
 */
export class WallBlockers {
  private live = new Map<number, Blocker[]>();
  private spare: Blocker[] = [];

  constructor(private world: CollisionWorld) {}

  sync(ents: readonly Ent[]): void {
    const seen = new Set<number>();
    for (const e of ents) {
      if (e.k !== 'wall') continue;
      seen.add(e.id);
      let list = this.live.get(e.id);
      if (!list) {
        list = Array.from({ length: PER }, () => this.spare.pop() ?? { x: 0, z: 0, r: 0, y: 0, h: 0, on: false });
        for (const b of list) if (!this.world.blockers.includes(b)) this.world.blockers.push(b);
        this.live.set(e.id, list);
      }
      const [px, pz] = [Math.cos(e.yaw), -Math.sin(e.yaw)]; // across the wall (perpendicular to the facing)
      const step = (W.w / PER), u = e.life > 0 ? e.age / e.life : 0, up = Math.min(1, e.age / 0.15), down = u > 0.88 ? 1 - (u - 0.88) / 0.12 : 1;
      list.forEach((b, i) => {
        const o = (i - 1) * step;
        b.x = e.x + px * o; b.z = e.z + pz * o; b.y = e.y; b.r = step * 0.62; b.h = W.h * up * down; b.on = b.h > 0.2;
      });
    }
    for (const [id, list] of this.live) {
      if (seen.has(id)) continue;
      for (const b of list) { b.on = false; this.spare.push(b); }
      this.live.delete(id);
    }
  }

  dispose(): void {
    const all = new Set([...this.spare, ...[...this.live.values()].flat()]);
    this.world.blockers.splice(0, this.world.blockers.length, ...this.world.blockers.filter((b) => !all.has(b)));
    this.live.clear(); this.spare = [];
  }
}
