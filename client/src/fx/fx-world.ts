import * as THREE from 'three';
import { BALANCE } from '@wih/shared';
import { FEEL } from '../core/feel';
import * as P from '../render/geo/procgeo';
import { HEAT_HEX } from '../render/heat';
import type { LightRig } from '../render/lights';
import { DecalPool } from './decals';
import { PuffPool } from './puffs';
import { Shards } from './shards';
import { SparkPool, type SparkKind } from './sparks';

const X = FEEL.fx;
const BLOOD = [new THREE.Color('#6e140e'), new THREE.Color('#4a0c08'), new THREE.Color('#82200f')];
const BLOOD_FLOOR = new THREE.Color('#2a0605');
const STEAM = new THREE.Color('#8a8079'), DUST = new THREE.Color('#4a3c32');
const RING_HOT = new THREE.Color(HEAT_HEX[4]), RING_DUST = new THREE.Color('#463629');

/**
 * All effects of a scene (LOOK §7): the shared spark pool, dithered puffs, ground decals and shatter shards,
 * plus the recipes that combine them. Pure presentation: `fx-bind.ts` maps bus events onto these recipes.
 * Seeded, so frozen dev shots are repeatable. Add `root` to the world scene; call `update` per frame.
 */
export class FxWorld {
  readonly root = new THREE.Group();
  readonly sparks: SparkPool; readonly puffs: PuffPool; readonly decals: DecalPool; readonly shards: Shards;
  readonly rnd: () => number;
  private timers: { t: number; fn: () => void }[] = [];
  private camPos = new THREE.Vector3(); private camRight = new THREE.Vector3(1, 0, 0); private camUp = new THREE.Vector3(0, 1, 0);
  private emberAcc = 0;

  constructor(rig: LightRig, seed = 1) {
    this.rnd = P.rng(seed * 31 + 7);
    this.sparks = new SparkPool(rig); this.puffs = new PuffPool(rig); this.decals = new DecalPool(rig); this.shards = new Shards(rig);
    this.root.name = 'fx';
    this.root.add(this.decals.mesh, this.shards.mesh, this.puffs.mesh, this.sparks.mesh);
  }

  /** Run `fn` after `s` seconds of effect time (hit-stop pauses it too). */
  later(s: number, fn: () => void): void { if (s <= 0) fn(); else this.timers.push({ t: s, fn }); }

  update(dt: number, camera: THREE.PerspectiveCamera, viewH: number): void {
    camera.updateMatrixWorld();
    this.camPos.setFromMatrixPosition(camera.matrixWorld);
    this.camRight.setFromMatrixColumn(camera.matrixWorld, 0); this.camUp.setFromMatrixColumn(camera.matrixWorld, 1);
    if (dt > 0) for (let i = this.timers.length - 1; i >= 0; i--) {
      const tm = this.timers[i];
      if ((tm.t -= dt) <= 0) { this.timers.splice(i, 1); tm.fn(); }
    }
    this.sparks.update(dt, camera, viewH); this.puffs.update(dt); this.decals.update(dt); this.shards.update(dt);
  }

  private range(r: readonly [number, number]): number { return r[0] + (r[1] - r[0]) * this.rnd(); }
  private dir(out: THREE.Vector3, upBias: number): THREE.Vector3 {
    const a = this.rnd() * Math.PI * 2, y = upBias + (1 - upBias) * this.rnd();
    const h = Math.sqrt(Math.max(0, 1 - y * y));
    return out.set(Math.cos(a) * h, y, Math.sin(a) * h);
  }

  /** A cone/spray of sparks from p. upBias 0 = hemisphere, near 1 = straight up. */
  spray(p: THREE.Vector3, n: number, speed: readonly [number, number], life: readonly [number, number], floor: number, upBias = 0.15, kind: SparkKind = 0): void {
    const d = new THREE.Vector3();
    for (let i = 0; i < n; i++) {
      this.dir(d, upBias).multiplyScalar(this.range(speed));
      this.sparks.spawn({ x: p.x, y: p.y, z: p.z, vx: d.x, vy: d.y, vz: d.z, life: this.range(life), floor, kind });
    }
  }

  /** Forge strike at the anvil face: count by outcome (×3 in Nhập thần); Vỡ throws fewer, duller sparks lower. */
  forgeStrike(p: THREE.Vector3, outcome: string, floor: number, frenzy = false): void {
    const n = Math.round((X.strike.count[outcome] ?? 16) * (frenzy ? X.strike.frenzyMul : 1)), dull = outcome === 'vo';
    this.spray(p, n, dull ? [1.4, 3.2] : X.strike.speed, dull ? [0.25, 0.5] : X.strike.life, floor, dull ? 0.05 : 0.25);
  }

  /** Level up: sparks lifting off along the blade a→b. */
  bladeBurst(a: THREE.Vector3, b: THREE.Vector3, n: number, floor: number): void {
    const p = new THREE.Vector3(), d = new THREE.Vector3();
    for (let i = 0; i < n; i++) {
      p.lerpVectors(a, b, this.rnd());
      this.dir(d, 0.55).multiplyScalar(1.2 + this.rnd() * 2.2);
      this.sparks.spawn({ x: p.x, y: p.y, z: p.z, vx: d.x, vy: d.y, vz: d.z, life: 0.25 + this.rnd() * 0.4, floor });
    }
  }

  /** Quench: a column of steam over the blade and a hot ring on the ground that widens in steps. */
  quench(a: THREE.Vector3, b: THREE.Vector3, floor: number): void {
    const E = X.evolve, p = new THREE.Vector3();
    for (let i = 0; i < E.steam; i++) {
      p.lerpVectors(a, b, (i + 0.5) / E.steam);
      this.later(i * 0.03, () => this.puffs.spawn({
        x: p.x + (this.rnd() - 0.5) * 0.1, y: p.y + 0.05, z: p.z + (this.rnd() - 0.5) * 0.1,
        vx: (this.rnd() - 0.5) * 0.25, vy: E.steamRise * (0.7 + this.rnd() * 0.6), vz: (this.rnd() - 0.5) * 0.25,
        size: 0.09 + this.rnd() * 0.05, grow: 0.16, life: E.steamLife * (0.75 + this.rnd() * 0.5), alpha: 0.75, color: STEAM, drag: 1.4, rise: 0.25, seed: this.rnd(),
      }));
    }
    const c = p.lerpVectors(a, b, 0.5);
    this.decals.spawn({ x: c.x, y: floor, z: c.z, r0: 0.3, r1: E.ringR, growS: E.ringS * 0.7, steps: 5, life: E.ringS, fadeS: E.ringS * 0.5, alpha: 0.85, color: RING_HOT, shape: 1, seed: this.rnd(), width: 0.07 });
  }

  /** Gãy: shards + sparks from the blade a→b. */
  shatter(a: THREE.Vector3, b: THREE.Vector3, width: number, floor: number): void {
    this.shards.burst(a, b, width, floor, this.rnd);
    this.spray(new THREE.Vector3().lerpVectors(a, b, 0.45), X.shatter.sparks, [1.5, 4.5], [0.25, 0.7], floor, 0.3);
  }

  /** A landed blow. blood: dark puffs + a floor mark; off: a few sparks only. */
  hit(p: THREE.Vector3, from: THREE.Vector3 | null, floor: number, blood: boolean, heavy: boolean): void {
    const H = X.hit, push = new THREE.Vector3();
    if (from) push.subVectors(p, from).setY(0).normalize();
    if (!blood) { this.spray(p, H.sparksNoBlood, [1.5, 3.5], [0.2, 0.45], floor, 0.2); return; }
    const n = H.puffs + (heavy ? 2 : 0), side = new THREE.Vector3(-push.z, 0, push.x);
    for (let i = 0; i < n; i++) {
      const s = (this.rnd() - 0.5) * 2.4, back = -0.2 - this.rnd() * 0.5;
      this.puffs.spawn({
        x: p.x, y: p.y, z: p.z, vx: side.x * s + push.x * back, vy: (this.rnd() - 0.2) * 1.4, vz: side.z * s + push.z * back,
        size: 0.05 + this.rnd() * 0.04, grow: 0.2, life: H.puffLife * (0.7 + this.rnd() * 0.6), alpha: 1, color: BLOOD[i % 3], drag: 4, rise: -2, seed: this.rnd(),
      });
    }
    const r = this.range(H.decalR) * (heavy ? 1.3 : 1), off = (this.rnd() - 0.5) * 0.6;
    this.decals.spawn({ x: p.x + side.x * off - push.x * 0.15, y: floor, z: p.z + side.z * off - push.z * 0.15, r0: r * 0.5, r1: r, growS: 0.12, steps: 2, life: H.decalS, fadeS: 1.5, alpha: 0.9, color: BLOOD_FLOOR, shape: 0, seed: this.rnd() });
  }

  /** Steel on steel (a blocked blow): a short spray of sparks. */
  clash(p: THREE.Vector3, floor: number): void { this.spray(p, X.hit.clash, [2, 4.5], [0.18, 0.4], floor, 0.1); }

  /** Parry: a white star of 4 sparks, flat to the camera. */
  parryStar(p: THREE.Vector3): void {
    const R = X.parry, d = new THREE.Vector3(), tilt = this.rnd() * 0.5;
    for (let i = 0; i < R.sparks; i++) {
      const a = tilt + (i / R.sparks) * Math.PI * 2;
      d.copy(this.camRight).multiplyScalar(Math.cos(a)).addScaledVector(this.camUp, Math.sin(a)).multiplyScalar(R.speed);
      this.sparks.spawn({ x: p.x, y: p.y, z: p.z, vx: d.x, vy: d.y, vz: d.z, life: R.life, floor: -1e3, kind: 2, heat: 0.999 });
    }
  }

  /** Slam landing: a dust ring out to the knock radius and low dust puffs. */
  slam(p: THREE.Vector3): void {
    const S = X.slam, R = BALANCE.move.slam.knockR;
    this.decals.spawn({ x: p.x, y: p.y, z: p.z, r0: 0.4, r1: R, growS: S.ringS, steps: 4, life: S.ringS * 1.6, fadeS: S.ringS * 0.8, alpha: 0.9, color: RING_DUST, shape: 1, seed: this.rnd(), width: 0.12 });
    for (let i = 0; i < S.dust; i++) {
      const a = (i / S.dust) * Math.PI * 2 + this.rnd() * 0.4;
      this.puffs.spawn({ x: p.x + Math.cos(a) * 0.4, y: p.y + 0.12, z: p.z + Math.sin(a) * 0.4, vx: Math.cos(a) * 4.5, vy: 0.3, vz: Math.sin(a) * 4.5,
        size: 0.14, grow: 0.5, life: 0.5, alpha: 0.8, color: DUST, drag: 5, seed: this.rnd() });
    }
  }

  /** Fire ring embers: spawned around the wall near the camera, drifting up (shared spark pool, ≤ 40 live). */
  embers(dt: number, cx: number, cz: number, r: number): void {
    if (r <= 0) return;
    this.emberAcc += dt * X.ring.embersPerS;
    const base = Math.atan2(this.camPos.z - cz, this.camPos.x - cx);
    while (this.emberAcc >= 1) {
      this.emberAcc -= 1;
      const a = base + (this.rnd() - 0.5) * 2.4, rr = r + (this.rnd() - 0.5) * 0.8;
      this.sparks.spawn({ x: cx + Math.cos(a) * rr, y: 0.3 + this.rnd() * 2.5, z: cz + Math.sin(a) * rr, vx: 0, vy: 0.6 + this.rnd() * 0.6, vz: 0,
        life: this.range(X.ring.emberLife), floor: -1e3, kind: 1, heat: 0.72 + this.rnd() * 0.15 });
    }
  }

  clear(): void { this.timers = []; this.sparks.clear(); this.puffs.clear(); this.decals.clear(); this.shards.clear(); }
  dispose(): void { this.root.removeFromParent(); this.sparks.dispose(); this.puffs.dispose(); this.decals.dispose(); this.shards.dispose(); }
}
