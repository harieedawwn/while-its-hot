import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { FEEL } from '../core/feel';
import { LightRig } from '../render/lights';
import { DecalPool } from './decals';
import { FxWorld } from './fx-world';
import { SparkPool } from './sparks';

const cam = new THREE.PerspectiveCamera(60, 16 / 9, 0.05, 100);
cam.updateMatrixWorld();

describe('fx pools', () => {
  it('sparks fall, bounce once with energy loss, cool and die', () => {
    const p = new SparkPool(new LightRig(), 8);
    p.spawn({ x: 0, y: 1, z: 0, vx: 1, vy: 0, vz: 0, life: 2, floor: 0 });
    const ys: number[] = [];
    for (let i = 0; i < 90; i++) { p.update(1 / 60, cam, 450); ys.push((p.mesh.geometry.getAttribute('iPos').array as Float32Array)[1]); }
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(0);
    const vy = (p.mesh.geometry.getAttribute('iVel').array as Float32Array)[1];
    expect(Math.abs(vy)).toBeLessThan(4.5 * FEEL.fx.spark.bounceY + 0.5);
    const heat = (p.mesh.geometry.getAttribute('iHeat').array as Float32Array)[0];
    expect(heat).toBeLessThan(1);
    for (let i = 0; i < 120; i++) p.update(1 / 60, cam, 450);
    expect(p.live).toBe(0);
  });

  it('the pool never exceeds its cap', () => {
    const p = new SparkPool(new LightRig(), 10);
    for (let i = 0; i < 25; i++) p.spawn({ x: 0, y: 0, z: 0, vx: 0, vy: 1, vz: 0, life: 1, floor: -1 });
    expect(p.live).toBe(10);
  });

  it('decal radius grows in steps and fades out', () => {
    const d = new DecalPool(new LightRig(), 4);
    d.spawn({ x: 0, y: 0, z: 0, r0: 0, r1: 1, growS: 1, steps: 4, life: 2, fadeS: 0.5, alpha: 1, color: new THREE.Color(), shape: 1, seed: 0 });
    const radius = () => (d.mesh.geometry.getAttribute('iA').array as Float32Array)[0];
    d.update(0.1); expect(radius()).toBeCloseTo(0.25);
    d.update(0.1); expect(radius()).toBeCloseTo(0.25);
    d.update(0.4); expect(radius()).toBeCloseTo(0.75);
    d.update(1.5); expect(d.live).toBe(0);
  });

  it('every effect stays within the per-effect particle budget', () => {
    const fx = new FxWorld(new LightRig(), 3);
    const p = new THREE.Vector3(0, 1, 0), a = new THREE.Vector3(-0.5, 1, 0), b = new THREE.Vector3(0.5, 1, 0);
    const live = () => fx.sparks.live + fx.puffs.live;
    const runs: (() => void)[] = [
      () => fx.forgeStrike(p, 'tuyet', 0), () => fx.bladeBurst(a, b, FEEL.fx.levelUp.sparks, 0), () => fx.quench(a, b, 0),
      () => fx.shatter(a, b, 0.05, 0), () => fx.hit(p, null, 0, true, true), () => fx.hit(p, null, 0, false, false),
      () => fx.clash(p, 0), () => fx.parryStar(p), () => fx.slam(p),
    ];
    for (const run of runs) {
      fx.clear(); run();
      for (let i = 0; i < 20; i++) fx.update(1 / 60, cam, 450);
      expect(live()).toBeLessThanOrEqual(60);
    }
  });
});
