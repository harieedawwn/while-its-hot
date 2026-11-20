import * as THREE from 'three';
import { bus } from '../core/events';
import { FEEL } from '../core/feel';
import type { Actions } from '../input/actions';
import type { CollisionWorld } from '../physics/world';
import type { ViewState } from './camera';
import { Kinematics } from './kinematics';
import { stepMove } from './motor';
import { createMoveState, type MoveInput, type MoveState } from './move-state';

const MAX_PITCH = (FEEL.camera.maxPitch * Math.PI) / 180;

/**
 * The local player: reads the action layer once per sim tick, runs the movement rules, and turns the
 * tick's move events into bus events (camera, audio and VFX listen; nothing here calls them).
 */
export class Player {
  readonly s: MoveState;
  readonly kin: Kinematics;
  yaw: number;
  pitch = 0;
  private prev = new THREE.Vector3();
  private input: MoveInput = { mx: 0, my: 0, yaw: 0, jumpPressed: false, slidePressed: false, slideHeld: false };
  private view: ViewState;
  private stepAcc = 0;
  private side: 1 | -1 = 1;
  private down = new THREE.Vector3(0, -1, 0);
  private rayO = new THREE.Vector3();

  /** emit = false for bodies that are not the local player (dummies): their moves stay off the bus. */
  constructor(world: CollisionWorld, spawn: THREE.Vector3Tuple, yaw = 0, private emit = true) {
    this.s = createMoveState(spawn);
    this.kin = new Kinematics(world);
    this.yaw = yaw;
    this.prev.copy(this.s.pos);
    this.view = { pos: new THREE.Vector3(), yaw, pitch: 0, vel: this.s.vel, grounded: false, low: false, sliding: false, clinging: false, wallN: this.s.wallN };
  }

  /** Put the body at (x, y, z) facing yaw with no smear in the interpolated view (respawn, blink). */
  place(x: number, y: number, z: number, yaw: number): void {
    this.s.pos.set(x, y, z); this.prev.copy(this.s.pos); this.yaw = yaw;
  }

  /** Look in radians: dx > 0 turns right, dy > 0 looks up. Applied per render frame (lowest latency). */
  look(dx: number, dy: number): void {
    this.yaw -= dx;
    this.pitch = Math.max(-MAX_PITCH, Math.min(MAX_PITCH, this.pitch + dy));
  }

  /** allow = false while staggered or dead: the presses are swallowed, the stick still steers (at speedMul). */
  tick(dt: number, a: Actions, allow = true): void {
    const i = this.input;
    i.mx = a.move.x; i.my = a.move.y; i.yaw = this.yaw;
    i.jumpPressed = a.take('jump') && allow;
    i.slidePressed = a.take('slide') && allow; i.slideHeld = a.isHeld('slide') && allow;
    this.tickWith(dt, i);
  }

  /** Same as tick() with a ready-made input (scripted demos, tests, later: replays). */
  tickWith(dt: number, input: MoveInput): void {
    this.prev.copy(this.s.pos);
    stepMove(this.s, input, dt, this.kin);
    if (!this.emit) return;
    for (const e of this.s.events) {
      switch (e.k) {
        case 'jump': bus.emit('move:jump', { kind: e.kind }); break;
        case 'land': bus.emit('move:land', { speed: e.speed }); this.stepAcc = FEEL.audio.react.stepLen * 0.5; break;
        case 'slide': bus.emit('move:slide', { on: e.on }); break;
        case 'slamstart': bus.emit('move:slamstart', {}); break;
        case 'slam': bus.emit('move:slam', { x: e.pos.x, y: e.pos.y, z: e.pos.z }); break;
      }
    }
    this.footsteps();
  }

  /** Ground travel → `move:step` every FEEL.audio.react.stepLen m, with the surface under the feet. */
  private footsteps(): void {
    const s = this.s;
    if (!s.grounded || s.sliding) return;
    this.stepAcc += Math.hypot(s.pos.x - this.prev.x, s.pos.z - this.prev.z);
    if (this.stepAcc < FEEL.audio.react.stepLen) return;
    this.stepAcc = 0;
    this.side = this.side === 1 ? -1 : 1;
    const hit = this.kin.world.raycast(this.rayO.copy(s.pos).setY(s.pos.y + 0.3), this.down, 0.9);
    const surface = hit ? this.kin.world.footAt(hit) : 'stone';
    bus.emit('move:step', { surface, side: this.side, x: s.pos.x, y: s.pos.y, z: s.pos.z });
  }

  /** Camera input for this frame; alpha interpolates between the last two sim ticks. */
  viewState(alpha: number): ViewState {
    const v = this.view, s = this.s;
    v.pos.lerpVectors(this.prev, s.pos, alpha);
    v.yaw = this.yaw; v.pitch = this.pitch;
    v.grounded = s.grounded; v.low = s.low; v.sliding = s.sliding; v.clinging = s.clinging;
    return v;
  }
}
