import * as THREE from 'three';
import { PLAYER_COLORS, type Vec3 } from '@wih/shared';
import { Anvil } from '../forge/anvil';
import type { CollisionWorld } from '../physics/world';
import type { LightRig } from '../render/lights';
import type { MaterialLib } from '../render/materials/library';

/**
 * Other players' anvils (Đe) as the room relays them: same model, band color, place/lift animation and
 * solid blockers as ours. The server keeps where each one stands; this only shows it.
 */
export class NetAnvils {
  private map = new Map<number, Anvil>();
  private tmp = new THREE.Vector3();

  constructor(private scene: THREE.Scene, private lib: MaterialLib, private rig: LightRig, private world: CollisionWorld, private colorOf: (id: number) => number) {}

  private get(id: number): Anvil {
    let a = this.map.get(id);
    if (!a) {
      a = new Anvil(this.lib, this.rig, this.world, PLAYER_COLORS[this.colorOf(id) % PLAYER_COLORS.length], id);
      this.map.set(id, a); this.scene.add(a.root);
    }
    return a;
  }

  place(id: number, p: Vec3, yaw: number, instant = false): void {
    const a = this.get(id);
    a.rule.reset();
    a.placeAt(p[0], p[1], p[2], yaw);
    if (instant) a.rule.forcePlaced();
  }

  lift(id: number): void {
    const a = this.map.get(id);
    if (!a) return;
    if (a.rule.phase === 'placing') a.rule.forcePlaced();
    a.lift();
  }

  /** The working face of someone's anvil (where their sparks fly), or null. */
  face(id: number): THREE.Vector3 | null {
    const a = this.map.get(id);
    return a && a.root.visible ? a.face(this.tmp) : null;
  }

  tick(dt: number): void { for (const a of this.map.values()) a.tick(dt); }
  animate(): void { for (const a of this.map.values()) a.animate(); }
  dispose(): void { for (const a of this.map.values()) { a.root.removeFromParent(); a.dispose(); } this.map.clear(); }
}
