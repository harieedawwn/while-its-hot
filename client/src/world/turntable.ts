import * as THREE from 'three';
import { loadWeapon } from '../weapons/weapon';
import type { MaterialLib } from '../render/materials/library';
import type { LightRig } from '../render/lights';

const LOCKED = new THREE.MeshBasicMaterial({ color: 0x0d0b0a });

/**
 * Armory turntable: one weapon hovering above the anvil, upright and tilted, turning slowly.
 * Locked forms show as a flat black silhouette. Lives in the smithy scene; shown only by the armory screen.
 */
export class Turntable {
  readonly root = new THREE.Group();
  private pivot = new THREE.Group();
  private token = 0;
  constructor(private lib: MaterialLib, private rig: LightRig, at: THREE.Vector3Like, private spin = 0.7) {
    this.root.position.set(at.x, at.y, at.z);
    this.root.add(this.pivot);
    this.root.visible = false;
  }

  async show(id: string, locked: boolean): Promise<void> {
    const my = ++this.token;
    const w = await loadWeapon(id, { lib: this.lib });
    if (my !== this.token) return;
    this.pivot.clear();
    if (locked) w.traverse((o) => { if (o instanceof THREE.Mesh) o.material = LOCKED; });
    // stand the weapon upright (blade +Y), centered on its own box
    const holder = new THREE.Group();
    holder.add(w);
    holder.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(holder);
    const c = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const k = Math.min(1.2, 0.95 / Math.max(0.1, size.y));
    holder.position.sub(c);
    const wrap = new THREE.Group();
    wrap.add(holder);
    wrap.scale.setScalar(k);
    wrap.rotation.z = 0.35;
    this.pivot.add(wrap);
    this.root.visible = true;
  }
  hide(): void { this.token++; this.root.visible = false; this.pivot.clear(); }
  /** `t` pins the angle for frozen shots. */
  update(dt: number, t: number | null): void {
    if (t !== null) this.pivot.rotation.y = 0.9 + t * this.spin;
    else this.pivot.rotation.y += dt * this.spin;
  }
}
