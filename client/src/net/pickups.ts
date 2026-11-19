import * as THREE from 'three';
import { disposeTree } from '../render/dispose';
import { BALANCE, type PickupNet, WEAPONS } from '@wih/shared';

/**
 * Raw blanks (phôi) lying on the pedestal and the side racks (GDD §3), as the room lists them. Rèn near one
 * asks to take it; the server decides. Models are the blank form laid flat, edge up.
 */
export class NetPickups {
  private items = new Map<number, { k: PickupNet; obj: THREE.Object3D | null }>();
  private root = new THREE.Group();
  private token = 0;

  constructor(scene: THREE.Scene, private load: (id: string) => Promise<THREE.Object3D>) { this.root.name = 'pickups'; scene.add(this.root); }

  set(list: readonly PickupNet[]): void { for (const id of [...this.items.keys()]) this.del(id); this.add(list); }

  add(list: readonly PickupNet[]): void {
    const t = this.token;
    for (const k of list) {
      const e = { k, obj: null as THREE.Object3D | null };
      this.items.set(k.id, e);
      void this.load(WEAPONS[0].id).then((m) => {
        if (t !== this.token || this.items.get(k.id) !== e) return;
        m.rotation.set(0, (k.id * 2.4) % (Math.PI * 2), Math.PI / 2, 'YXZ');
        m.position.set(k.p[0], k.p[1] + 0.03, k.p[2]);
        e.obj = m; this.root.add(m);
      });
    }
  }

  del(id: number): void { const e = this.items.get(id); if (e?.obj) { e.obj.removeFromParent(); disposeTree(e.obj); } this.items.delete(id); }

  /** The blank within reach of feet position p, or null. */
  nearest(p: THREE.Vector3): number | null {
    let best: number | null = null, bd: number = BALANCE.match.pickupR;
    for (const { k } of this.items.values()) {
      const d = Math.hypot(k.p[0] - p.x, k.p[2] - p.z);
      if (d < bd && Math.abs(k.p[1] - p.y) < 1.8) { bd = d; best = k.id; }
    }
    return best;
  }

  get count(): number { return this.items.size; }
  dispose(): void { this.token++; disposeTree(this.root); this.root.removeFromParent(); this.items.clear(); }
}
