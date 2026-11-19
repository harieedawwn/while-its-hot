import * as THREE from 'three';
import { disposeTree } from '../../render/dispose';
import type { ModuleId } from '@wih/shared';
import type { MaterialLib } from '../../render/materials/library';
import { type AnimInput, Animator } from './animator';
import { buildArmor } from './armor';
import { buildBody } from './body';
import { type Pose, Skeleton } from './skeleton';
import { type SkinMesh } from './skin-batch';

export interface CharacterOpts { color?: THREE.ColorRepresentation; armor?: number; modules?: readonly ModuleId[]; }

/**
 * One blacksmith: skeleton + animator + the skinned meshes (body = cloth, armor + modules = one steel-textured mesh;
 * 2 draw calls, TECH §8 allows 3). `root` sits at the feet and faces −Z at rotation 0 (set `root.rotation.y = yaw`).
 * Armor changes rebuild only the armor meshes through the sockets; the body is never touched.
 * Held items go on `hold.hand_r` / `hold.hand_l` (grip at origin, blade along +Y).
 */
export class Character {
  readonly skeleton = new Skeleton();
  readonly anim = new Animator();
  readonly root = new THREE.Group();
  private body: SkinMesh;
  private armor: SkinMesh[] = [];
  private color: THREE.ColorRepresentation;
  armorLevel = -1;
  modules: readonly ModuleId[] = [];

  constructor(private lib: MaterialLib, o: CharacterOpts = {}) {
    this.root.name = 'character';
    this.root.add(this.skeleton.root);
    this.color = o.color ?? '#c8501e';
    this.body = buildBody().build(lib.get('cloth'));
    this.body.recolor(this.color);
    this.root.add(this.body.mesh);
    this.setArmor(o.armor ?? 0, o.modules ?? []);
    this.refresh();
  }

  get hold(): Skeleton['hold'] { return this.skeleton.hold; }

  setColor(c: THREE.ColorRepresentation): void { this.color = c; this.body.recolor(c); this.armor.forEach((a) => a.recolor(c)); }

  setArmor(level: number, modules: readonly ModuleId[] = []): void {
    for (const m of this.armor) { m.mesh.removeFromParent(); m.dispose(); }
    this.armor = [];
    const batch = buildArmor(level, modules);
    if (!batch.empty) {
      const sm = batch.build(this.lib.get('steel'));
      sm.recolor(this.color);
      this.armor.push(sm); this.root.add(sm.mesh);
    }
    this.armorLevel = level; this.modules = [...modules];
    this.refresh();
  }

  /** Advance the animation by dt and re-pose the meshes. */
  update(dt: number, inp: AnimInput): void { this.anim.update(dt, inp); this.refresh(); }

  /** Re-pose the bones and meshes from the animator's current pose (after `anim.preview` or `update`). */
  refresh(pose: Pose = this.anim.pose): void {
    this.skeleton.apply(pose);
    this.body.update(this.skeleton.rel);
    for (const a of this.armor) a.update(this.skeleton.rel);
  }

  /** Draw calls and triangles this character costs. */
  get stats(): { calls: number; tris: number } {
    const all = [this.body, ...this.armor];
    return { calls: all.length, tris: all.reduce((n, m) => n + m.geo.getAttribute('position').count / 3, 0) };
  }

  dispose(): void { this.body.dispose(); this.armor.forEach((a) => a.dispose()); disposeTree(this.root); }
}
