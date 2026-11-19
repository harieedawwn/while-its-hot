import * as THREE from 'three';
import { BALANCE } from '@wih/shared';
import type { Kinematics } from './kinematics';
import { wishDir, type MoveInput, type MoveState } from './move-state';

const M = BALANCE.move;
/** Fraction of ground/air acceleration left while a combat push (lunge, knockback) carries the body. */
const PUSH_CONTROL = BALANCE.combat.pushControl;
const wish = new THREE.Vector3();
const tmp = new THREE.Vector3();

/** Move v's horizontal part toward (tx, tz) by at most `step` (m/s). */
function approachH(v: THREE.Vector3, tx: number, tz: number, step: number): void {
  const dx = tx - v.x, dz = tz - v.z, d = Math.hypot(dx, dz);
  if (d <= step || d < 1e-9) { v.x = tx; v.z = tz; return; }
  v.x += (dx / d) * step; v.z += (dz / d) * step;
}

/**
 * One fixed tick of the movement rules (GDD §4). Pure apart from the collision query in `kin`:
 * same state + input + world → same result. Events for this tick are left in s.events.
 */
export function stepMove(s: MoveState, input: MoveInput, dt: number, kin: Kinematics): void {
  s.events.length = 0;
  wishDir(input.mx, input.my, input.yaw, wish);
  const hasWish = wish.lengthSq() > 0.01;
  const fwdX = -Math.sin(input.yaw), fwdZ = -Math.cos(input.yaw);

  s.jumpBuf = input.jumpPressed ? M.jumpBufferS : Math.max(0, s.jumpBuf - dt);
  s.iframe = Math.max(0, s.iframe - dt);
  s.pushT = Math.max(0, s.pushT - dt);
  s.sinceSlam += dt;
  s.sinceWall += dt;
  s.clinging = false;

  // dash: any time, ground or air, if a pip is there
  if (input.dashPressed && s.stamina >= M.dash.cost && s.dashT <= 0) {
    s.stamina -= M.dash.cost;
    s.dashT = M.dash.durS;
    s.iframe = M.dash.iframeS;
    s.dashGround = s.grounded || s.coyote > 0;
    if (hasWish) s.dashDir.copy(wish).normalize(); else s.dashDir.set(fwdX, 0, fwdZ);
    if (s.sliding) endSlide(s);
    s.slamming = false;
    s.events.push({ k: 'dash', dir: s.dashDir.clone() });
  }

  // slide on the ground while held; a fresh press in the air is a slam
  if (input.slideHeld && s.grounded && !s.sliding && s.dashT <= 0) {
    s.sliding = true; s.slideT = 0;
    const sp = Math.hypot(s.vel.x, s.vel.z);
    if (hasWish) s.slideDir.copy(wish).normalize();
    else if (sp > 1) s.slideDir.set(s.vel.x / sp, 0, s.vel.z / sp);
    else s.slideDir.set(fwdX, 0, fwdZ);
    s.events.push({ k: 'slide', on: true });
  } else if (input.slidePressed && !s.grounded && s.coyote <= 0 && !s.slamming && s.dashT <= 0) {
    s.slamming = true;
    s.events.push({ k: 'slamstart' });
  }
  if (s.sliding && !input.slideHeld && kin.fits(s.pos, M.body.height)) endSlide(s);

  // jump: dash-jump > ground (coyote, bounce, slide-jump) > wall jump; otherwise the press stays buffered
  if (s.jumpBuf > 0) tryJump(s);

  // velocity per mode; gravity is split around the move (exact v²/2g apex at any tick rate)
  let fall = false, cling = false;
  if (s.dashT > 0) {
    s.vel.set(s.dashDir.x * M.dash.speed, 0, s.dashDir.z * M.dash.speed);
    s.dashT -= dt;
    if (s.dashT <= 0) clampH(s.vel, M.dash.exitSpeed);
  } else if (s.slamming) {
    s.vel.set(0, -M.slam.speed, 0);
  } else if (s.sliding) {
    s.slideT += dt;
    if (hasWish) steer(s.slideDir, wish, M.slide.steer * dt);
    const k = Math.min(1, s.slideT / M.slide.decayS);
    const sp = M.slide.speed + (M.slide.endSpeed - M.slide.speed) * k;
    s.vel.x = s.slideDir.x * sp; s.vel.z = s.slideDir.z * sp;
    if (!s.grounded) { s.vel.y -= M.gravity * dt * 0.5; fall = true; }
  } else if (s.grounded) {
    const sp = M.runSpeed * s.speedMul;
    approachH(s.vel, wish.x * sp, wish.z * sp, M.groundAccel * dt * (s.pushT > 0 ? PUSH_CONTROL : 1));
  } else {
    // strong air control that never bleeds speed gained from dashes or slides
    if (hasWish) {
      const cap = Math.max(M.runSpeed, Math.hypot(s.vel.x, s.vel.z));
      approachH(s.vel, wish.x * cap, wish.z * cap, M.airAccel * dt * (s.pushT > 0 ? PUSH_CONTROL : 1));
    }
    s.vel.y -= M.gravity * dt * 0.5;
    fall = true;
    cling = s.sinceWall <= dt * 1.01 && hasWish && -(wish.x * s.wallN.x + wish.z * s.wallN.z) > M.wall.minPush;
  }

  // posture: low while sliding, and until there is room to stand
  s.low = s.sliding || (s.low && !kin.fits(s.pos, M.body.height));

  const vyBefore = s.vel.y, wasGrounded = s.grounded;
  kin.move(s, dt);
  if (fall && !s.grounded) s.vel.y -= M.gravity * dt * 0.5;
  if (cling && !s.grounded && s.vel.y < -M.wall.clingFall) { s.vel.y = -M.wall.clingFall; s.clinging = true; }

  if (s.grounded) {
    s.coyote = M.coyoteS;
    if (!wasGrounded) {
      s.wallJumps = 0;
      if (s.slamming) {
        s.slamming = false; s.sinceSlam = 0;
        s.events.push({ k: 'slam', pos: s.pos.clone() });
      }
      s.events.push({ k: 'land', speed: Math.max(0, -vyBefore) });
    }
  } else {
    s.coyote = Math.max(0, s.coyote - dt);
    if (s.sliding && s.coyote <= 0) endSlide(s);
  }
  if (!s.sliding && s.dashT <= 0) s.stamina = Math.min(M.stamina.pips, s.stamina + dt / M.stamina.regenS);
}

function tryJump(s: MoveState): void {
  const onGround = s.grounded || s.coyote > 0;
  if (s.dashT > 0 && s.dashGround && onGround && s.stamina >= M.dashJump.cost) {
    s.stamina -= M.dashJump.cost;
    s.dashT = 0;
    s.vel.set(s.dashDir.x * M.dash.speed, M.jumpVel, s.dashDir.z * M.dash.speed);
    return jumped(s, 'dashjump');
  }
  if (onGround) {
    const bounce = s.sinceSlam <= M.slam.bounceS;
    const slid = s.sliding;
    if (s.dashT > 0) { s.dashT = 0; clampH(s.vel, M.dash.exitSpeed); }
    if (slid) endSlide(s);
    s.vel.y = M.jumpVel * (bounce ? M.slam.bounceMul : 1);
    return jumped(s, bounce ? 'bounce' : slid ? 'slidejump' : 'jump');
  }
  if (s.sinceWall <= M.wall.graceS && s.wallJumps < M.wall.jumps) {
    s.wallJumps++;
    const n = s.wallN;
    const into = s.vel.x * n.x + s.vel.z * n.z;
    if (into < 0) { s.vel.x -= n.x * into; s.vel.z -= n.z * into; }
    s.vel.x += n.x * M.wall.jumpOut; s.vel.z += n.z * M.wall.jumpOut;
    s.vel.y = M.wall.jumpUp;
    s.dashT = 0; s.slamming = false;
    s.sinceWall = 1e3;
    return jumped(s, 'walljump');
  }
}

function jumped(s: MoveState, kind: 'jump' | 'bounce' | 'dashjump' | 'slidejump' | 'walljump'): void {
  s.jumpBuf = 0; s.coyote = 0; s.grounded = false; s.sinceSlam = 1e3;
  s.events.push({ k: 'jump', kind });
}

function endSlide(s: MoveState): void {
  s.sliding = false;
  s.events.push({ k: 'slide', on: false });
}

function clampH(v: THREE.Vector3, max: number): void {
  const sp = Math.hypot(v.x, v.z);
  if (sp > max) { v.x *= max / sp; v.z *= max / sp; }
}

/** Rotate unit horizontal dir toward target by at most maxAngle radians. */
function steer(dir: THREE.Vector3, target: THREE.Vector3, maxAngle: number): void {
  tmp.copy(target).normalize();
  const cross = dir.x * tmp.z - dir.z * tmp.x;
  const dot = dir.x * tmp.x + dir.z * tmp.z;
  const ang = Math.atan2(cross, dot);
  if (Math.abs(ang) < 1e-4) return;
  const a = Math.sign(ang) * Math.min(Math.abs(ang), maxAngle);
  // positive atan2(cross, dot) here means target is clockwise in x→z; rotate by a about +Y accordingly
  const c = Math.cos(a), sn = Math.sin(a);
  const x = dir.x * c - dir.z * sn, z = dir.x * sn + dir.z * c;
  dir.set(x, 0, z).normalize();
}
