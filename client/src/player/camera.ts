import { game } from '../core/game-settings';
import * as THREE from 'three';
import { BALANCE } from '@wih/shared';
import { FEEL } from '../core/feel';
import { noise1 } from '../core/noise';
import { approach, Spring, unitPeak } from '../core/spring';

const C = FEEL.camera;
const D2R = Math.PI / 180;

/** What the camera needs from the body each frame (interpolated feet position, look angles, motion flags). */
export interface ViewState {
  pos: THREE.Vector3; yaw: number; pitch: number; vel: THREE.Vector3;
  grounded: boolean; low: boolean; sliding: boolean; clinging: boolean; wallN: THREE.Vector3;
}

/** Vertical FOV (deg) for a horizontal FOV given at 16:9, Hor+ up to maxAspect, then locked horizontally. */
export function verticalFov(hfov16x9: number, aspect: number): number {
  const v = 2 * Math.atan(Math.tan((hfov16x9 * D2R) / 2) / (16 / 9));
  if (aspect <= C.maxAspect) return v / D2R;
  const hMax = 2 * Math.atan(Math.tan(v / 2) * C.maxAspect);
  return (2 * Math.atan(Math.tan(hMax / 2) / aspect)) / D2R;
}

/**
 * First-person camera feel (LOOK §6): Hor+ FOV with slide widening, smoothed eye height, strafe/cling/slide
 * roll on a spring, landing dip spring, subtle vertical bob, trauma shake (rotation only) and hit-stop.
 * Hit-stop freezes these local animations only; the simulation and look input keep running.
 */
export class FirstPersonCamera {
  readonly camera: THREE.PerspectiveCamera;
  /** Settings ("FOV", "lắc đầu khi chạy", "rung màn hình"). */
  /** A scene/URL override wins over the saved setting; otherwise the camera follows `game` live. */
  private hfovSet: number | null = null;
  get hfov(): number { return this.hfovSet ?? game.hfov; }
  set hfov(v: number) { this.hfovSet = v; }
  private bobSet: boolean | null = null;
  get bobOn(): boolean { return this.bobSet ?? game.bob; }
  set bobOn(v: boolean) { this.bobSet = v; }
  private shakeSet: number | null = null;
  get shakeScale(): number { return this.shakeSet ?? game.shake; }
  set shakeScale(v: number) { this.shakeSet = v; }
  /** Seconds of animation time (stops during hit-stop). The viewmodel reads this and bobPhase. */
  animT = 0;
  bobPhase = 0;
  bobAmp = 0;
  freezeS = 0;

  private aspect: number;
  private eye: number = C.eye;
  private roll = new Spring(C.rollSpring.k, C.rollSpring.c);
  private land = new Spring(C.land.k, C.land.c);
  private landGain = 1 / unitPeak(C.land.k, C.land.c);
  private slideFov = 0;
  private trauma = 0;
  private hurtR = new Spring(C.hurt.k, C.hurt.c);
  private hurtP = new Spring(C.hurt.k, C.hurt.c);
  private hurtPeak = unitPeak(C.hurt.k, C.hurt.c);
  private deadK = 0;
  /** Dead: the eye sinks and the head tilts (first seconds after dying). */
  dead = false;
  private slideSign = 1;

  constructor(aspect: number) {
    this.aspect = aspect;
    this.camera = new THREE.PerspectiveCamera(verticalFov(this.hfov, aspect), aspect, C.near, C.far);
    this.camera.rotation.order = 'YXZ';
  }

  resize(aspect: number): void { this.aspect = aspect; this.camera.aspect = aspect; }

  /** Landing dip scaled by fall speed (m/s). Returns the dip in meters (the viewmodel dips more). */
  onLand(speed: number): number {
    const k = Math.min(1, Math.max(0, (speed - C.land.minSpeed) / (C.land.fullSpeed - C.land.minSpeed)));
    const dip = C.land.maxDip * k;
    this.land.kick(-dip * this.landGain);
    return dip;
  }
  onSlam(): number {
    this.addTrauma(C.land.slamTrauma);
    this.land.kick(-C.land.maxDip * this.landGain);
    return C.land.maxDip;
  }
  /** A ring tick: roll kick to a random side + a small pitch dip, scaled by the camera-shake setting. */
  hurt(): void {
    const k = this.shakeScale / this.hurtPeak, side = Math.random() < 0.5 ? -1 : 1;
    this.hurtR.kick(side * C.hurt.roll * D2R * k); this.hurtP.kick(-C.hurt.pitch * D2R * k);
  }
  addTrauma(x: number): void { this.trauma = Math.min(1, this.trauma + x); }
  /** Freeze local animation for ms (clamped to the LOOK §6 range). */
  hitStop(ms: number): void {
    this.freezeS = Math.max(this.freezeS, Math.min(C.hitStop.maxMs, Math.max(C.hitStop.minMs, ms)) / 1000);
  }

  update(dt: number, v: ViewState): void {
    const adt = this.freezeS > 0 ? 0 : dt;
    this.freezeS = Math.max(0, this.freezeS - dt);
    this.animT += adt;

    this.deadK = approach(this.deadK, this.dead ? 1 : 0, C.dead.rate, adt);
    this.eye = approach(this.eye, this.deadK > 0.01 ? C.eye + (C.dead.eye - C.eye) * this.deadK : v.low ? C.lowEye : C.eye, this.deadK > 0.01 ? C.dead.rate : C.eyeRate, adt);
    const dip = Math.max(-C.land.maxDip * 1.15, this.land.step(0, adt));

    // bob: vertical only, scaled by ground speed
    const sp = Math.hypot(v.vel.x, v.vel.z);
    const run = BALANCE.move.runSpeed;
    const onFeet = v.grounded && !v.sliding;
    this.bobAmp = approach(this.bobAmp, onFeet ? Math.min(1, sp / run) : 0, 10, adt);
    if (onFeet) this.bobPhase += (sp * adt * Math.PI) / C.bob.stride;
    const bob = this.bobOn ? -C.bob.amp * this.bobAmp * (1 - Math.abs(Math.cos(this.bobPhase))) : 0;

    // roll: strafe, wall cling (lean away from the wall), slide
    const s = Math.sin(v.yaw), c = Math.cos(v.yaw);
    const lateral = Math.max(-1, Math.min(1, (v.vel.x * c - v.vel.z * s) / run));
    let rollT = -lateral * C.strafeRoll;
    if (v.clinging) rollT = -(v.wallN.x * c - v.wallN.z * s) * C.clingRoll;
    if (v.sliding) {
      if (Math.abs(lateral) > 0.2) this.slideSign = lateral > 0 ? -1 : 1;
      rollT = this.slideSign * C.slideRoll;
    }
    const roll = this.roll.step(rollT * D2R, adt);

    // FOV: slide widening
    this.slideFov = approach(this.slideFov, v.sliding ? C.slideFov : 0, C.fovRate, adt);
    const h = Math.min(C.hfovMax + C.slideFov, Math.max(C.hfovMin, this.hfov) + this.slideFov);
    const vf = verticalFov(h, this.aspect);
    if (Math.abs(vf - this.camera.fov) > 1e-4) { this.camera.fov = vf; }

    // trauma shake: rotation only, shake = trauma²
    this.trauma = Math.max(0, this.trauma - C.shake.decay * adt);
    const sh = this.trauma * this.trauma * this.shakeScale;
    const nt = this.animT * C.shake.freq;
    const sy = sh * C.shake.yaw * D2R * noise1(nt, 11);
    const sx = sh * C.shake.pitch * D2R * noise1(nt, 23);
    const sz = sh * C.shake.roll * D2R * noise1(nt, 37);

    this.camera.position.set(v.pos.x, v.pos.y + this.eye + dip + bob, v.pos.z);
    const maxP = C.maxPitch * D2R;
    const hr = this.hurtR.step(0, adt), hp = this.hurtP.step(0, adt);
    this.camera.rotation.set(Math.max(-maxP, Math.min(maxP, v.pitch + sx + hp)), v.yaw + sy, roll + sz + hr + this.deadK * C.dead.roll * D2R, 'YXZ');
    this.camera.updateProjectionMatrix();
    this.camera.updateMatrixWorld();
  }
}

