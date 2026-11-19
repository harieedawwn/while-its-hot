import * as THREE from 'three';
import { bus } from '../core/events';
import { FEEL } from '../core/feel';
import { buildRoom } from '../dev/lookdev-room';
import { bakeAO } from '../render/geo/ao';
import * as P from '../render/geo/procgeo';
import { StaticBatch } from '../render/geo/static-batch';
import type { LightRig, PointLight } from '../render/lights';
import type { MaterialLib } from '../render/materials/library';
import * as Anvil from '../render/models/anvil';
import * as Brazier from '../render/models/brazier';
import * as Helve from '../render/models/helve';
import { chain, crate, hammer, ingot, quenchTub, tongs } from '../render/models/props';

/**
 * The menu smithy at night (LOOK §8): the lookdev foundry corner, cold moonlight through the window, the
 * brazier as the warm key, a bar glowing on the anvil and a helve hammer that strikes it on every menu select.
 * `strike()` raises and drops the hammer; the blow emits `ui:strike` (sound + sparks subscribe) after `fall`.
 */
const H = FEEL.ui.hammer;
const ANVIL_AT: THREE.Vector3Tuple = [0.7, 0, 0.35];
const ANVIL_YAW = 0.42;
/** Helve axle sits behind-right of the anvil so the beam is seen in profile from the camera. */
const HELVE_DIR = new THREE.Vector3(0.5, 0, -0.87).normalize();

export class Smithy {
  readonly root = new THREE.Group();
  readonly face = new THREE.Vector3();
  private fire: PointLight;
  private barLight: PointLight;
  private coal: THREE.Object3D;
  private bar: THREE.Mesh;
  private tilt: THREE.Object3D;
  private angle: number = H.rest;
  private strikeT = -1;
  private struck = false;
  private kick = 0;

  constructor(lib: MaterialLib, rig: LightRig, seed: number) {
    const ctx = { lib, seed };
    const b = new StaticBatch();
    buildRoom(b, lib);
    const place = (o: THREE.Object3D, pos: THREE.Vector3Tuple, yaw = 0, e?: THREE.Euler) => { o.position.set(...pos); o.rotation.copy(e ?? new THREE.Euler(0, yaw, 0)); return o; };
    const anvil = place(Anvil.build(ctx), ANVIL_AT, ANVIL_YAW);
    anvil.add(place(tongs(ctx, 0.55), [0.05, Anvil.ANVIL.faceY + 0.02, -0.16], 0, new THREE.Euler(-Math.PI / 2, 0, 1.35)));
    b.addObject(anvil);
    const brazier = place(Brazier.build(ctx), [-0.75, 0, -0.95], 0.4);
    this.coal = brazier.getObjectByName('brazier:coal')!;
    this.coal.removeFromParent();
    b.addObject(brazier);
    b.addObject(place(crate(ctx, 0.82), [-3.35, 0, 1.55], 0.18));
    b.addObject(place(crate(ctx, 0.56), [-3.3, 0.82, 1.5], -0.35));
    b.addObject(place(quenchTub(ctx), [1.95, 0, -2.35]));
    b.addObject(place(chain(ctx, 22), [0.2, 4.15, -1.6], 0.6));
    b.add(new THREE.BoxGeometry(0.05, 0.16, 1.5), lib.get('wood'), { pos: [-3.97, 1.52, -0.2], color: '#8a7058' });
    [[-0.75, 0.42, 0.13], [-0.2, 0.36, 0.11], [0.35, 0.46, 0.16]].forEach(([z, len, head], i) =>
      b.addObject(place(hammer(ctx, len, head), [-3.9, 1.52 - len + 0.02, z - 0.2], 0, new THREE.Euler(0, Math.PI / 2, 0.05 * (i - 1)))));
    for (let i = 0; i < 4; i++) {
      const g = P.blob(0.35 - i * 0.05, { detail: 1, amp: 0.3, freq: 2.2, seed: 20 + i, squash: [1, 0.45, 1], flatBottom: 0 });
      b.add(g, lib.get('coal'), { pos: [-2.4 + i * 0.3, 0, -2.5 + (i % 2) * 0.25], color: '#c8c0bc' });
    }

    // helve hammer: axle above the face, offset along HELVE_DIR by the helve length
    anvil.updateMatrixWorld(true);
    this.face.copy(anvil.userData.sockets.face as THREE.Vector3).applyMatrix4(anvil.matrixWorld);
    const hv = Helve.build(ctx);
    const axle = this.face.clone().addScaledVector(HELVE_DIR, Helve.HELVE.len);
    axle.y = this.face.y + 0.03 + Helve.HELVE.drop;
    hv.root.position.copy(axle);
    hv.root.rotation.y = Math.atan2(HELVE_DIR.z, -HELVE_DIR.x);
    this.tilt = hv.tilt;
    this.root.add(hv.root);

    const statics = b.build();
    bakeAO(statics.filter((m) => m.material !== lib.get('glow')), { rays: 12, dist: 1.3, strength: 0.75 });
    statics.forEach((m) => this.root.add(m));
    this.coal.applyMatrix4(brazier.matrixWorld);
    this.root.add(this.coal);
    this.bar = ingot(ctx);
    this.bar.position.copy(this.face);
    this.bar.rotation.y = ANVIL_YAW + 0.2;
    this.bar.userData.heat = 0.7;
    this.root.add(this.bar);

    // night: low cold hemi, moonlight through the window, the brazier as key, the bar's own glow
    rig.setHemi('#1e2638', '#1a0f0a', 0.75);
    rig.setDir([0.25, 0.55, -1], '#5a7ea8', 0.85);
    rig.setFog('#06070a', 4.5, 14);
    this.fire = rig.add([-0.75, Brazier.BRAZIER.fireY + 0.3, -0.95], '#ff7a30', 3.0, 5.5);
    rig.add([0.8, 2.4, -2.2], '#7ea4d4', 2.2, 6.5);
    rig.add([3.6, 1.2, 3.0], '#ff8a48', 0.25, 6);
    // the bar's glow sits in front of the face, so it lights the hammer head from below and the anvil's flank
    this.barLight = rig.add([this.face.x + 0.25, this.face.y + 0.12, this.face.z + 0.3], '#e0521a', 0.9, 2.2);
    this.setAngle(H.rest);
  }

  get busy(): boolean { return this.strikeT >= 0; }

  /** Raise and drop the hammer. Resolves at the blow (sound/sparks fire through the bus). */
  strike(): Promise<void> {
    this.strikeT = 0; this.struck = false;
    return new Promise((res) => { this.onBlow = res; });
  }
  private onBlow: (() => void) | null = null;

  /** Frozen shots: pose the hammer at s seconds into a strike (or at rest when null). */
  pose(s: number | null): void { if (s === null) this.setAngle(H.rest); else { this.strikeT = s; this.advance(0); } }

  private setAngle(a: number): void { this.angle = a; this.tilt.rotation.z = a; }

  private advance(dt: number): void {
    if (this.strikeT < 0) return;
    this.strikeT += dt;
    const t = this.strikeT;
    if (t < H.raise) this.setAngle(H.rest + (H.up - H.rest) * Math.sin((t / H.raise) * Math.PI / 2));
    else if (t < H.raise + H.fall) { const k = (t - H.raise) / H.fall; this.setAngle(H.up * (1 - k * k)); }
    else {
      if (!this.struck) {
        this.struck = true; this.kick = 1;
        const p = this.face.clone(); p.y += 0.03;
        bus.emit('ui:strike', { x: p.x, y: p.y, z: p.z, floor: 0.005 });
        this.onBlow?.(); this.onBlow = null;
      }
      // small rebound, then the cam lifts it back to rest
      const r = t - H.raise - H.fall;
      this.setAngle(r < 0.08 ? 0.05 * Math.sin((r / 0.08) * Math.PI) : Math.min(H.rest, ((r - 0.08) / 0.35) * H.rest));
      if (r > 0.45) { this.strikeT = -1; this.setAngle(H.rest); }
    }
  }

  /** Per sim step: hammer, brazier flicker, the bar flaring after a blow. Returns camera kick 0..1. */
  update(dt: number, time: number, seed: number): number {
    this.advance(dt);
    const fl = 0.86 + 0.08 * Math.sin(time * 7.3 + seed) + 0.06 * Math.sin(time * 13.1 + 1.7) + 0.04 * Math.sin(time * 23.7);
    this.fire.intensity = 3.2 * fl;
    this.coal.userData.heat = 0.62 + 0.1 * (fl - 0.86) * 4;
    this.kick = Math.max(0, this.kick - dt * 6);
    this.bar.userData.heat = 0.66 + 0.2 * this.kick;
    this.barLight.intensity = 0.7 + 1.4 * this.kick;
    return this.kick;
  }

  dispose(): void { this.root.traverse((o) => { if (o instanceof THREE.Mesh) o.geometry.dispose(); }); }
}
