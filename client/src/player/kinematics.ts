import * as THREE from 'three';
import { BALANCE } from '@wih/shared';
import type { CollisionWorld } from '../physics/world';
import { bodyHeight, type MoveState } from './move-state';

const B = BALANCE.move.body;
/** Walkable if the surface normal's y is at least this (cos of the max slope; 45° counts as walkable). */
export const WALKABLE = Math.cos((B.maxSlopeDeg * Math.PI) / 180) - 1e-3;
const MAX_SUB = 0.15;
const DROP_INC = 0.09;

interface Contacts { ground: boolean; gN: THREE.Vector3; wall: boolean; wN: THREE.Vector3; ceil: boolean; }
const mkContacts = (): Contacts => ({ ground: false, gN: new THREE.Vector3(), wall: false, wN: new THREE.Vector3(), ceil: false });
function resetContacts(c: Contacts): void { c.ground = c.wall = c.ceil = false; c.gN.set(0, 0, 0); c.wN.set(0, 0, 0); }

/**
 * Collide-and-slide for a capsule against the static world: substeps (≤ 15 cm, so a 40 m/s slam cannot
 * tunnel), velocity clipping per contact, step-up (≤ stepUp), ground snapping down stairs and ramps,
 * and a wall probe for clinging/wall jumps. Walking into a too-steep slope never lifts the body.
 */
export class Kinematics {
  private seg = new THREE.Line3();
  private nh = new THREE.Vector3();
  private start = new THREE.Vector3();
  private v0 = new THREE.Vector3();
  private posA = new THREE.Vector3();
  private velA = new THREE.Vector3();
  private cA = mkContacts();
  private cB = mkContacts();
  private c: Contacts = this.cA;
  private vel: THREE.Vector3 | null = null;
  private onContact = (n: THREE.Vector3) => this.contact(n);

  constructor(readonly world: CollisionWorld) {}

  /** Advance s.pos by s.vel·dt; updates grounded/groundN/wall fields and clips s.vel. */
  move(s: MoveState, dt: number): void {
    const wasGrounded = s.grounded;
    const h = bodyHeight(s);
    const plane = wasGrounded && s.vel.y <= 1e-3 ? s.groundN : null;
    this.start.copy(s.pos);
    this.v0.copy(s.vel);

    this.c = this.cA; resetContacts(this.cA);
    this.slide(s.pos, s.vel, dt, h, plane);
    const horiz = Math.hypot(this.v0.x, this.v0.z) * dt;
    if (wasGrounded && this.cA.wall && horiz > 1e-4) {
      this.posA.copy(s.pos); this.velA.copy(s.vel);
      s.pos.copy(this.start); s.vel.copy(this.v0);
      this.c = this.cB; resetContacts(this.cB);
      if (this.stepUp(s.pos, s.vel, dt, h) && this.progress(s.pos) > this.progress(this.posA) + 0.005) {
        this.cB.ground = true;
      } else {
        s.pos.copy(this.posA); s.vel.copy(this.velA); this.c = this.cA;
      }
    }
    const c = this.c;
    let grounded = c.ground && s.vel.y <= 1e-3;
    if (!grounded && wasGrounded && s.vel.y <= 1e-3) grounded = this.drop(s.pos, s.vel, h, B.stepUp);
    s.grounded = grounded;
    if (grounded) { s.groundN.copy(c.gN.lengthSq() > 0 ? c.gN : this.nh.set(0, 1, 0)); s.vel.y = Math.max(0, s.vel.y); }
    else s.groundN.set(0, 1, 0);
    this.probeWall(s, h);
  }

  /** True if a capsule of height h fits at feet position p. */
  fits(p: THREE.Vector3, h: number): boolean {
    return !this.world.overlaps(this.capsule(p, h), B.radius);
  }

  private capsule(p: THREE.Vector3, h: number): THREE.Line3 {
    this.seg.start.set(p.x, p.y + B.radius, p.z);
    this.seg.end.set(p.x, p.y + Math.max(B.radius, h - B.radius), p.z);
    return this.seg;
  }

  private slide(p: THREE.Vector3, vel: THREE.Vector3, dt: number, h: number, plane: THREE.Vector3 | null): void {
    const vy = plane ? -(plane.x * vel.x + plane.z * vel.z) / plane.y : vel.y;
    const len = Math.hypot(vel.x, vy, vel.z) * dt;
    const n = Math.max(1, Math.ceil(len / MAX_SUB));
    const sdt = dt / n;
    this.vel = vel;
    for (let i = 0; i < n; i++) {
      const dy = plane ? -(plane.x * vel.x + plane.z * vel.z) / plane.y : vel.y;
      const seg = this.capsule(p, h);
      seg.start.x += vel.x * sdt; seg.start.y += dy * sdt; seg.start.z += vel.z * sdt;
      seg.end.x += vel.x * sdt; seg.end.y += dy * sdt; seg.end.z += vel.z * sdt;
      this.world.resolve(seg, B.radius, this.onContact);
      p.set(seg.start.x, seg.start.y - B.radius, seg.start.z);
    }
  }

  /** Lift by stepUp, move horizontally, drop back onto walkable ground. False if there is no step there. */
  private stepUp(p: THREE.Vector3, vel: THREE.Vector3, dt: number, h: number): boolean {
    const y0 = p.y;
    p.y += B.stepUp;
    if (!this.fits(p, h)) return false;
    const vy = vel.y; vel.y = 0;
    this.slide(p, vel, dt, h, null);
    vel.y = vy;
    resetContacts(this.c);
    if (!this.drop(p, vel, h, B.stepUp + DROP_INC)) return false;
    return p.y - y0 <= B.stepUp + 0.01;
  }

  /** Move down in small increments until walkable ground pushes back. Restores p if none within dist. */
  private drop(p: THREE.Vector3, vel: THREE.Vector3, h: number, dist: number): boolean {
    const y0 = p.y;
    this.vel = vel;
    const steps = Math.max(1, Math.ceil(dist / DROP_INC)), inc = dist / steps;
    for (let i = 0; i < steps; i++) {
      const seg = this.capsule(p, h);
      seg.start.y -= inc; seg.end.y -= inc;
      this.world.resolve(seg, B.radius, this.onContact);
      p.set(seg.start.x, seg.start.y - B.radius, seg.start.z);
      if (this.c.ground) return true;
    }
    p.y = y0;
    return false;
  }

  private probeWall(s: MoveState, h: number): void {
    if (s.grounded) return;
    let found = false;
    this.world.probe(this.capsule(s.pos, h), B.radius + BALANCE.move.wall.probe, (n) => {
      if (Math.abs(n.y) > 0.3) return;
      if (!found) s.wallN.set(0, 0, 0);
      found = true;
      s.wallN.x += n.x; s.wallN.z += n.z;
    });
    if (found && s.wallN.lengthSq() > 1e-6) { s.wallN.y = 0; s.wallN.normalize(); s.sinceWall = 0; }
  }

  private progress(p: THREE.Vector3): number {
    const vx = this.v0.x, vz = this.v0.z, l = Math.hypot(vx, vz) || 1;
    return ((p.x - this.start.x) * vx + (p.z - this.start.z) * vz) / l;
  }

  /** Record the contact and clip velocity. Steep surfaces never add upward speed. */
  private contact(n: THREE.Vector3): void {
    const c = this.c, v = this.vel!;
    if (n.y >= WALKABLE) {
      c.ground = true;
      if (n.y > c.gN.y) c.gN.copy(n);
      // ground only stops the fall: horizontal speed survives landings on ramps (plane projection does the rest)
      if (v.y < 0) v.y = 0;
      return;
    }
    if (n.y < -0.3) {
      c.ceil = true;
      const d = v.dot(n);
      if (d < 0) v.addScaledVector(n, -d);
      return;
    }
    c.wall = true;
    c.wN.copy(n);
    const nh = this.nh.set(n.x, 0, n.z);
    if (nh.lengthSq() < 1e-8) return;
    nh.normalize();
    const dh = v.x * nh.x + v.z * nh.z;
    if (dh < 0) { v.x -= nh.x * dh; v.z -= nh.z * dh; }
    if (v.y < 0 && n.y > 0) { const d = v.y * n.y; v.addScaledVector(n, -d); }
  }
}
