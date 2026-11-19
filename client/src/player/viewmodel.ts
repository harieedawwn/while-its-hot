import * as THREE from 'three';
import { BALANCE } from '@wih/shared';
import { FEEL } from '../core/feel';
import { approach, Spring, unitPeak } from '../core/spring';
import type { FirstPersonCamera, ViewState } from './camera';
import { disposeTree } from '../render/dispose';

const V = FEEL.viewmodel;

/**
 * First-person viewmodel (LOOK §6): its own scene and 62° camera (never distorted by the world FOV), drawn
 * over the world after a depth clear. The hand group sits at the eye in WORLD space so it gets the world's
 * point lights. Look lag and movement sway are springs; bob, breathing, landing dip and recoil on top.
 */
export class Viewmodel {
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  private eye = new THREE.Group();
  /** The weapon hand (grip at origin, blade +Y), in the eye group's space. */
  readonly hand = new THREE.Group();
  /** Combat animation pose (view space). null = the rest pose from FEEL.viewmodel.rest. */
  pose: { pos: THREE.Vector3; quat: THREE.Quaternion } | null = null;
  private model: THREE.Object3D;
  private qLag = new THREE.Quaternion();
  private eLag = new THREE.Euler(0, 0, 0, 'YXZ');
  private lagY = new Spring(V.lag.k, V.lag.c);
  private lagP = new Spring(V.lag.k, V.lag.c);
  private sx = new Spring(V.sway.k, V.sway.c);
  private sy = new Spring(V.sway.k, V.sway.c);
  private sz = new Spring(V.sway.k, V.sway.c);
  private dip = new Spring(FEEL.camera.land.k, FEEL.camera.land.c * 0.85);
  private dipGain = 1 / unitPeak(FEEL.camera.land.k, FEEL.camera.land.c * 0.85);
  private recZ = new Spring(V.recoil.k, V.recoil.c);
  private recP = new Spring(V.recoil.k, V.recoil.c);
  private tilt = 0;
  private lastYaw: number | null = null;
  private lastPitch = 0;

  /** model: origin at the grip, held upright along +Y. */
  constructor(model: THREE.Object3D, aspect: number) {
    this.camera = new THREE.PerspectiveCamera(V.vfov, aspect, V.near, 10);
    this.camera.rotation.order = 'YXZ';
    this.model = model;
    this.hand.add(model);
    this.eye.add(this.hand);
    this.scene.add(this.eye);
  }

  /** Swap the held model (weapon change). */
  /** The viewmodel lives in its own overlay scene, so the host scene's dispose never reaches it. */
  dispose(): void { disposeTree(this.eye); }

  setModel(model: THREE.Object3D): void { this.model.removeFromParent(); disposeTree(this.model); this.model = model; this.hand.add(model); }
  /** The held weapon model (trails read its markers). */
  get weapon(): THREE.Object3D { return this.model; }
  /** Add something that lives in view space next to the hand (arms). */
  attach(o: THREE.Object3D): void { this.eye.add(o); }

  resize(aspect: number): void { this.camera.aspect = aspect; this.camera.updateProjectionMatrix(); }

  /** Landing: dip (m) from the camera, multiplied. */
  onLand(dip: number): void { this.dip.kick(-dip * V.landMul * this.dipGain); }
  /** Heavy attack recoil, 0..1. */
  kick(strength: number): void { this.recZ.kick(strength * 1.6); this.recP.kick(strength * 7); }

  update(dt: number, cam: FirstPersonCamera, v: ViewState): void {
    const adt = cam.freezeS > 0 ? 0 : dt;
    // look lag: the hand stays behind when the view turns, then springs back
    if (this.lastYaw === null) { this.lastYaw = v.yaw; this.lastPitch = v.pitch; }
    let dy = v.yaw - this.lastYaw;
    if (dy > Math.PI) dy -= Math.PI * 2; else if (dy < -Math.PI) dy += Math.PI * 2;
    this.lagY.x = clamp(this.lagY.x - dy * V.lag.gain, V.lag.max);
    this.lagP.x = clamp(this.lagP.x - (v.pitch - this.lastPitch) * V.lag.gain, V.lag.max);
    this.lastYaw = v.yaw; this.lastPitch = v.pitch;
    const ly = this.lagY.step(0, adt), lp = this.lagP.step(0, adt);

    // sway against movement in view space
    const run = BALANCE.move.runSpeed, s = Math.sin(v.yaw), c = Math.cos(v.yaw);
    const lat = clamp((v.vel.x * c - v.vel.z * s) / run, 1.6);
    const fwd = clamp((-v.vel.x * s - v.vel.z * c) / run, 2.6);
    const sx = this.sx.step(-lat * V.sway.side, adt);
    const sz = this.sz.step(fwd * V.sway.fwd, adt);
    const sy = this.sy.step(clamp(-v.vel.y / 20, 1) * V.sway.fall, adt);

    const ph = cam.bobPhase, amp = cam.bobOn ? cam.bobAmp : 0;
    const bx = V.bob.x * amp * Math.sin(ph);
    const by = -V.bob.y * amp * (1 - Math.abs(Math.cos(ph)));
    const breath = V.breath.amp * Math.sin(cam.animT * V.breath.rate);
    const dip = this.dip.step(0, adt);
    const rz = this.recZ.step(0, adt), rp = this.recP.step(0, adt);
    this.tilt = approach(this.tilt, v.sliding ? V.slideTilt : 0, 14, adt);

    const pp = this.pose?.pos, x0 = pp ? pp.x : V.rest[0], y0 = pp ? pp.y : V.rest[1], z0 = pp ? pp.z : V.rest[2];
    this.hand.position.set(x0 + sx + bx + ly * 0.25, y0 + sy + by + breath + dip - this.tilt * 0.12 - lp * 0.15, z0 + sz + rz * 0.1);
    if (this.pose) {
      this.qLag.setFromEuler(this.eLag.set(lp + rp * 0.1, ly, this.tilt, 'YXZ'));
      this.hand.quaternion.multiplyQuaternions(this.qLag, this.pose.quat);
    } else this.hand.rotation.set(lp + rp * 0.1, ly, this.tilt, 'YXZ');

    // follow the world camera's pose (incl. shake) with the viewmodel's own projection
    const w = cam.camera;
    this.eye.position.copy(w.position);
    this.eye.quaternion.copy(w.quaternion);
    this.camera.position.copy(w.position);
    this.camera.quaternion.copy(w.quaternion);
    this.eye.updateMatrixWorld(true);
    this.camera.updateMatrixWorld();
  }
}

function clamp(x: number, m: number): number { return Math.max(-m, Math.min(m, x)); }
