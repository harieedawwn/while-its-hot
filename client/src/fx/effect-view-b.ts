import * as THREE from 'three';
import { BALANCE, type Ent } from '@wih/shared';
import { FEEL } from '../core/feel';
import type { EffectMat } from './effect-mat';
import type { FxWorld } from './fx-world';

const E = BALANCE.effects, D = E.dao, T = E.tay, X = FEEL.fx.effects;
const col = (h: string) => new THREE.Color(h);
const ICE = col(X.iceFloor), POISON = col(X.poison), DUST = col('#6a6258'), CLOCK = col(X.clock);

/** What the phase-29 entity drawing needs from the EffectView (geometry, pools, helpers). */
export interface BCtx {
  fx: FxWorld; v: THREE.Vector3;
  geo: { blade: THREE.BufferGeometry; ball: THREE.BufferGeometry; ring: THREE.BufferGeometry; hand: THREE.BufferGeometry; arm: THREE.BufferGeometry; cuff: THREE.BufferGeometry; decoy: THREE.BufferGeometry; wall: THREE.BufferGeometry; rock: THREE.BufferGeometry };
  m(c: string, heat?: number, shade?: number): EffectMat;
  mesh(g: THREE.BufferGeometry, m: EffectMat, parent: THREE.Object3D): THREE.Mesh;
  posOf(id: number): THREE.Vector3 | null;
  floorAt(p: THREE.Vector3): number;
}
export interface BVis { obj: THREE.Object3D; mats: EffectMat[]; acc: number }

/** Seconds an entity lives when the wire did not say. */
export function lifeB(e: Ent): number {
  switch (e.k) {
    case 'knife': return (2 * D.knife.range) / D.knife.speed;
    case 'fireball': case 'iceball': case 'rocket': return T.proj[e.k].range / T.proj[e.k].speed;
    case 'hand': return e.r >= T.sky.r - 0.1 ? T.sky.delay : T.giant.delay;
    case 'timefield': return D.timefield.s;
    case 'storm': return D.storm.s;
    case 'decoy': return D.decoy.s;
    case 'wall': return T.wall.s;
    case 'gravity': return T.gravity.s;
    default: return e.life;
  }
}

/** Build the meshes of a phase-29 kind into `g`. */
export function makeB(e: Ent, c: BCtx, g: THREE.Group): void {
  switch (e.k) {
    case 'knife': c.mesh(c.geo.blade, c.m(X.knife), g).scale.setScalar(0.8); break;
    case 'fireball': c.mesh(c.geo.ball, c.m('#000', X.fireHeat, 0), g); break;
    case 'iceball': c.mesh(c.geo.ball, c.m(X.ice, 0, 1), g); break;
    case 'rocket': c.mesh(c.geo.ball, c.m(X.stone, 0, 1), g); c.mesh(c.geo.ball, c.m('#000', X.rocketHeat, 0), g); break;
    case 'hand': {
      const sky = e.r >= T.sky.r - 0.1, fist = new THREE.Group();
      c.mesh(c.geo.hand, c.m(sky ? X.handSky : X.handGiant), fist);
      c.mesh(c.geo.arm, c.m(sky ? X.handSkyArm : X.handGiantArm), fist);
      c.mesh(c.geo.cuff, c.m(sky ? X.handSkyCuff : X.handGiantCuff), fist);
      g.add(fist);
      c.mesh(c.geo.ring, c.m(X.rimStar, 0.6, 0), g);
      break;
    }
    case 'timefield': { c.mesh(c.geo.ring, c.m(X.clock, 0, 0), g); c.mesh(new THREE.BoxGeometry(0.12, 0.06, 1), c.m(X.clock, 0, 0), g); c.mesh(new THREE.BoxGeometry(0.12, 0.06, 1), c.m(X.clock, 0, 0), g); break; }
    case 'storm': for (let i = 0; i < D.storm.n; i++) c.mesh(c.geo.blade, c.m(X.blade), g); break;
    case 'decoy': c.mesh(c.geo.decoy, c.m(X.decoy, 0, 1), g); break;
    case 'wall': c.mesh(c.geo.wall, c.m(X.stone), g); break;
    case 'gravity': { c.mesh(c.geo.ball, c.m(X.hole, 0, 0), g); c.mesh(new THREE.TorusGeometry(1, 0.08, 4, 16), c.m(X.rimEclipse), g); break; }
    default: break;
  }
}

/** One-time marks when a phase-29 entity first shows up. */
export function appearB(e: Ent, c: BCtx): void {
  const fx = c.fx, floor = c.floorAt(c.v.set(e.x, e.y + 0.5, e.z)) + 0.004;
  if (e.k === 'timefield') fx.decals.spawn({ x: e.x, y: floor, z: e.z, r0: e.r * 0.3, r1: e.r, growS: 0.3, steps: 3, life: D.timefield.s, fadeS: 0.5, alpha: 0.7, color: CLOCK, shape: 1, seed: fx.rnd(), width: 0.05 });
  else if (e.k === 'wall') for (let i = 0; i < 8; i++) fx.puffs.spawn({ x: e.x + (fx.rnd() - 0.5) * e.r * 2, y: e.y + 0.1, z: e.z + (fx.rnd() - 0.5) * 1.2, vx: 0, vy: 1.5 + fx.rnd(), vz: 0, size: 0.25, grow: 0.7, life: 0.6, alpha: 0.85, color: DUST, drag: 3, seed: fx.rnd() });
}

function aim(o: THREE.Object3D, e: Ent): void {
  const sp = Math.hypot(e.vx, e.vy, e.vz);
  if (sp > 0.1) o.rotation.set(Math.asin(Math.max(-1, Math.min(1, e.vy / sp))), Math.atan2(-e.vx, -e.vz), 0);
}

/** Per-frame pose and particles of a phase-29 entity. */
export function drawB(e: Ent, v: BVis, dt: number, c: BCtx): void {
  const o = v.obj, fx = c.fx, life = Math.max(1e-3, lifeB(e)), u = Math.min(1, e.age / life);
  switch (e.k) {
    case 'knife': {
      aim(o, e);
      o.children[0].rotation.z = e.age * 28;
      if (v.acc > 0.05) { v.acc = 0; fx.sparks.spawn({ x: e.x, y: e.y, z: e.z, vx: 0, vy: 0.2, vz: 0, life: 0.18, floor: -1e3, kind: 0, heat: 0.1 }); }
      break;
    }
    case 'fireball': case 'iceball': case 'rocket': {
      const ball = o.children[0], pulse = 1 + 0.12 * Math.sin(e.age * 40);
      if (e.k === 'rocket') { aim(o, e); ball.scale.set(0.2, 0.2, 0.55); o.children[1].scale.set(0.12, 0.12, 0.7); o.children[1].position.z = 0.5; }
      else ball.scale.setScalar((e.k === 'fireball' ? 0.34 : 0.3) * pulse);
      if (v.acc > 0.035) {
        v.acc = 0;
        if (e.k === 'iceball') fx.puffs.spawn({ x: e.x, y: e.y, z: e.z, vx: 0, vy: -0.2, vz: 0, size: 0.14, grow: 0.5, life: 0.4, alpha: 0.8, color: ICE, seed: fx.rnd() });
        else fx.spray(c.v.set(e.x, e.y, e.z), 1, [0.6, 1.6], [0.15, 0.35], -1e3, 0.1, 1);
        if (e.k === 'rocket') fx.puffs.spawn({ x: e.x - e.vx * 0.02, y: e.y, z: e.z - e.vz * 0.02, vx: 0, vy: 0.3, vz: 0, size: 0.2, grow: 0.9, life: 0.6, alpha: 0.8, color: DUST, drag: 2, seed: fx.rnd() });
      }
      break;
    }
    case 'hand': {
      const fist = o.children[0], ring = o.children[1], k = 1 - u, big = e.r >= T.sky.r - 0.1, sc = e.r * (big ? 0.34 : 0.3);
      fist.scale.setScalar(sc);
      fist.position.y = sc * 0.35 + (big ? 22 : 12) * k * k * k;
      fist.rotation.y = Math.PI * 0.12;
      ring.scale.setScalar(e.r * (0.9 + 0.1 * Math.sin(e.age * 30)));
      ring.position.y = 0.06;
      (ring as THREE.Mesh).visible = Math.floor(e.age * 12) % 2 === 0 || u > 0.6;
      break;
    }
    case 'timefield': {
      const hands = [o.children[1], o.children[2]], ring = o.children[0] as THREE.Mesh;
      ring.scale.setScalar(e.r * (0.97 + 0.03 * Math.sin(e.age * 8))); ring.position.y = 0.05;
      hands[0].scale.z = e.r * 0.9; hands[0].position.set(0, 0.1, 0); hands[0].rotation.y = e.age * 1.2; hands[0].translateZ(-e.r * 0.45);
      hands[1].scale.z = e.r * 0.55; hands[1].position.set(0, 0.1, 0); hands[1].rotation.y = e.age * 0.2; hands[1].translateZ(-e.r * 0.28);
      v.mats.forEach((m) => { m.uniforms.uAlpha.value = u > 0.8 ? 1 - (u - 0.8) / 0.2 : 0.8; });
      break;
    }
    case 'storm': {
      const p = c.posOf(e.o);
      if (p) o.position.copy(p);
      o.rotation.set(0, 0, 0);
      o.children.forEach((b, i) => {
        const a = e.yaw + (i / D.storm.n) * Math.PI * 2, rr = e.r * (0.55 + 0.4 * ((i % 2) + 0.5) / 1.5);
        b.position.set(Math.cos(a) * rr, 0.9 + 0.35 * Math.sin(a * 3 + e.age * 4), Math.sin(a) * rr);
        b.rotation.set(0, -a, 0.4);
      });
      break;
    }
    case 'decoy': {
      v.mats[0].uniforms.uAlpha.value = (u > 0.75 ? 1 - (u - 0.75) / 0.25 : 1) * (0.55 + 0.15 * Math.sin(e.age * 14));
      break;
    }
    case 'wall': {
      const rise = Math.min(1, e.age / 0.15), sink = u > 0.88 ? (u - 0.88) / 0.12 : 0;
      o.scale.set(1, Math.max(0.02, rise * (1 - sink)), 1);
      break;
    }
    case 'gravity': {
      const grow = Math.min(1, e.age / 0.25), pulse = 1 + 0.08 * Math.sin(e.age * 18), R = 0.45 * grow;
      o.children[0].scale.setScalar(R * pulse);
      o.children[1].scale.setScalar(R * 1.45);
      o.children[1].rotation.set(Math.PI / 2 + 0.3 * Math.sin(e.age * 2), 0, e.age * 2);
      if (v.acc > 0.05) {
        v.acc = 0;
        const a = fx.rnd() * 6.283, r = e.r * (0.5 + fx.rnd() * 0.5), sp = r / 0.5;
        fx.puffs.spawn({ x: e.x + Math.cos(a) * r, y: e.y - 1 + fx.rnd() * 1.6, z: e.z + Math.sin(a) * r, vx: -Math.cos(a) * sp, vy: 0.5, vz: -Math.sin(a) * sp, size: 0.12, grow: -0.1, life: 0.5, alpha: 0.9, color: POISON.clone().multiplyScalar(0.1), seed: fx.rnd() });
      }
      break;
    }
    default: break;
  }
  void dt;
}
