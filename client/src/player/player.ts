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
  private input: MoveInput = { mx: 0, my: 0, yaw: 0, jumpPressed: false, dashPressed: false, slidePressed: false, slideHeld: false };
  private view: ViewState;

  constructor(world: CollisionWorld, spawn: THREE.Vector3Tuple, yaw = 0) {
    this.s = createMoveState(spawn);
    this.kin = new Kinematics(world);
    this.yaw = yaw;
    this.prev.copy(this.s.pos);
    this.view = { pos: new THREE.Vector3(), yaw, pitch: 0, vel: this.s.vel, grounded: false, low: false, sliding: false, clinging: false, wallN: this.s.wallN };
  }

  /** Look in radians: dx > 0 turns right, dy > 0 looks up. Applied per render frame (lowest latency). */
  look(dx: number, dy: number): void {
    this.yaw -= dx;
    this.pitch = Math.max(-MAX_PITCH, Math.min(MAX_PITCH, this.pitch + dy));
  }

  tick(dt: number, a: Actions): void {
    const i = this.input;
    i.mx = a.move.x; i.my = a.move.y; i.yaw = this.yaw;
    i.jumpPressed = a.take('jump'); i.dashPressed = a.take('dash');
    i.slidePressed = a.take('slide'); i.slideHeld = a.isHeld('slide');
    this.tickWith(dt, i);
  }

  /** Same as tick() with a ready-made input (scripted demos, tests, later: replays). */
  tickWith(dt: number, input: MoveInput): void {
    this.prev.copy(this.s.pos);
    stepMove(this.s, input, dt, this.kin);
    for (const e of this.s.events) {
      switch (e.k) {
        case 'jump': bus.emit('move:jump', { kind: e.kind }); break;
        case 'land': bus.emit('move:land', { speed: e.speed }); break;
        case 'dash': bus.emit('move:dash', { x: e.dir.x, z: e.dir.z }); break;
        case 'slide': bus.emit('move:slide', { on: e.on }); break;
        case 'slamstart': bus.emit('move:slamstart', {}); break;
        case 'slam': bus.emit('move:slam', { x: e.pos.x, y: e.pos.y, z: e.pos.z }); break;
      }
    }
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
