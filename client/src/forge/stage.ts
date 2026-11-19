import * as THREE from 'three';
import { FEEL } from '../core/feel';
import type { MaterialLib } from '../render/materials/library';
import { ANVIL } from '../render/models/anvil';
import { BRAZIER } from '../render/models/brazier';
import { cbox } from '../render/geo/cbox';
import * as P from '../render/geo/procgeo';
import { flat, mesh } from '../render/models/kit';
import { hammer } from '../render/models/props';
import { marker, setHeat } from '../weapons/weapon';
import { BRAZIER_X } from './anvil';

const S = FEEL.forge, H = S.hammer, D2R = Math.PI / 180;
const ease = (t: number) => t * t * (3 - 2 * t);

/**
 * What lies on the anvil while the smith works (anvil local frame): the blade (or an armor plate),
 * the hammer that comes down on each strike, and the blade sliding into the brazier while heating.
 * Pure presentation: the rules never read it.
 */
export class ForgeStage {
  readonly root = new THREE.Group();
  private blade: THREE.Object3D | null = null;
  private bladeBase = new THREE.Vector3();
  private bladeScale = 1;
  private plate: THREE.Mesh;
  private hammerPivot = new THREE.Group();
  private slide = 0;
  private nung = false;
  private hitT = 99;
  private phase = 0;
  private dip = 0;
  private target: 'blade' | 'armor' = 'blade';
  private heat = 0;

  constructor(lib: MaterialLib) {
    this.root.name = 'forge_stage';
    const h = hammer({ lib }, H.len, H.head);
    // pivot at the grip, on the smith's side; +Y of the hammer is the head direction
    this.hammerPivot.position.set(H.x, ANVIL.faceY + H.gripY, H.gripZ);
    this.hammerPivot.add(h);
    // the smith's forearm and fist: the hammer must be held, not floating (−Y of the pivot = toward the smith)
    const arm = P.bake([
      P.part(cbox(0.085, 0.62, 0.09, 0.02), '#a88a72', { pos: [0, -0.37, 0] }),
      P.part(cbox(0.1, 0.1, 0.1, 0.025), '#5a3a28', { pos: [0, -0.02, 0] }),
      P.part(cbox(0.105, 0.07, 0.105, 0.02), '#3a2a20', { pos: [0, -0.15, 0] }),
    ], { shade: 0.2 });
    this.hammerPivot.add(mesh(flat(arm), lib.get('paint'), 'forge:arm'));
    this.root.add(this.hammerPivot);
    this.plate = mesh(flat(P.bake([P.part(cbox(0.4, 0.028, 0.27, 0.008), '#e8ecef', { shade: 0.1 })])), lib.get('steel'), 'forge:plate');
    this.plate.position.set(-0.05, ANVIL.faceY + 0.016, 0);
    this.plate.visible = false;
    this.root.add(this.plate);
    this.swing(0);
  }

  /** Lay a blade model on the anvil (grip at origin, +Y, edge +Z). Replaces the previous one. */
  setBlade(model: THREE.Object3D): void {
    this.blade?.removeFromParent();
    this.blade = model;
    const tip = marker(model, 'tip')?.position, base = marker(model, 'base')?.position;
    const len = tip && base ? tip.distanceTo(base) : 1, from = base ?? new THREE.Vector3();
    this.bladeScale = Math.max(0.4, Math.min(S.blade.maxScale, S.blade.showLen / Math.max(0.2, len)));
    model.scale.setScalar(this.bladeScale);
    model.rotation.set(0, 0, -Math.PI / 2);
    // base of the blade (just above the grip) sits at the left end of the face
    this.bladeBase.set(-0.5 - from.y * this.bladeScale, ANVIL.faceY + 0.02, 0.02);
    this.root.add(model);
    this.syncTarget(); this.place(); setHeat(model, this.heat);
  }

  setTarget(t: 'blade' | 'armor'): void { this.target = t; this.syncTarget(); }
  private syncTarget(): void {
    if (this.blade) this.blade.visible = this.target === 'blade';
    this.plate.visible = this.target === 'armor';
  }
  setHeat(h: number): void {
    this.heat = h;
    if (this.blade) setHeat(this.blade, h);
    this.plate.userData.heat = h;
  }
  setNung(on: boolean): void { this.nung = on; }
  /** The hammer comes down now. */
  strike(): void { this.hitT = 0; this.dip = 1; }
  /** True from the strike until the hammer has touched down (for sparks). */
  get contact(): boolean { return this.hitT >= H.fallS && this.hitT - 1 / 30 < H.fallS; }

  /** World point where the hammer lands (the blade at the hammer's x). */
  hitPoint(out: THREE.Vector3): THREE.Vector3 {
    const b = H.hitDeg * D2R, c = Math.cos(b) * H.len;
    return out.set(H.x - c * Math.sin(H.yaw), ANVIL.faceY + 0.04, H.gripZ - c * Math.cos(H.yaw)).applyMatrix4(this.root.matrixWorld);
  }

  private swing(deg: number): void {
    // head direction (0, −sin β, −cos β) for a tilt β below horizontal, away from the smith → rotate about X by −(90° + β)
    this.hammerPivot.rotation.set(-(Math.PI / 2 + deg * D2R), 0, 0, 'YXZ');
    this.hammerPivot.rotation.y = H.yaw;
  }
  private place(): void {
    if (!this.blade) return;
    const k = ease(this.slide), b = this.bladeBase;
    this.blade.position.set(b.x + (BRAZIER_X - 0.1 - b.x) * k, b.y + (BRAZIER.bowlY + 0.17 - b.y) * k - this.dip * 0.01, b.z + 0.05 * k);
  }

  update(dt: number, time: number): void {
    const want = this.nung && this.target === 'blade' ? 1 : 0;
    const d = want - this.slide, st = S.blade.slideRate * dt;
    this.slide += Math.abs(d) <= st ? d : Math.sign(d) * st;
    this.dip = Math.max(0, this.dip - dt * 6);
    this.hitT += dt;
    let deg: number;
    if (this.hitT < H.fallS) deg = H.restDeg + (H.hitDeg - H.restDeg) * (this.hitT / H.fallS) ** 1.6;
    else if (this.hitT < H.fallS + H.riseS) deg = H.hitDeg + (H.restDeg - H.hitDeg) * ease((this.hitT - H.fallS) / H.riseS);
    else deg = H.restDeg + Math.sin(time * 2.1) * H.idleDeg;
    this.swing(deg);
    this.place();
  }
}
