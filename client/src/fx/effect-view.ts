import * as THREE from 'three';
import { BALANCE, type Ent, type EntKind } from '@wih/shared';
import { bus } from '../core/events';
import { FEEL } from '../core/feel';
import { HEAT_LINEAR } from '../render/heat';
import type { LightRig } from '../render/lights';
import { anchorGeo, armGeo, bladeGeo, columnGeo, crescentGeo, cuffGeo, decoyGeo, handGeo, ringGeo, rockGeo, wallGeo } from './effect-meshes';
import { appearB, type BCtx, drawB, lifeB, makeB } from './effect-view-b';
import { effectMat, type EffectMat } from './effect-mat';
import type { FxWorld } from './fx-world';

const E = BALANCE.effects, X = FEEL.fx.effects;
const col = (h: string) => new THREE.Color(h);
const LAVA = HEAT_LINEAR[6], LAVA_DARK = col(X.lava), ICE = col(X.iceFloor), CRACK = col('#1c1916'), DUST = col('#6a6258'), HOLE_DUST = col('#2a2630');

/** Seconds an entity lives when the wire did not say (snapshots carry age, not life). */
function lifeOf(e: Ent): number {
  if (e.life > 0) return e.life;
  switch (e.k) {
    case 'slash': case 'slash_burn': case 'slash_ice': case 'slash_sun': return E.slash.range / E.slash.speed;
    case 'lava': return e.r < 1.5 ? E.lavaCrack.s : E.lavaPool.s;
    case 'ice': return E.ice.s;
    case 'meteor': return E.meteor.delayS;
    case 'eclipse': return E.eclipse.s;
    case 'star': return E.star.s;
    case 'column': return E.column.lifeS;
    case 'anchor': return E.anchor.range / E.anchor.speed;
    case 'crack': return E.crack.len / E.crack.speed;
    case 'orbit': return 1e6;
    default: return lifeB(e);
  }
}

interface Vis { k: EntKind; obj: THREE.Object3D; mats: EffectMat[]; seen: boolean; acc: number; lx: number; lz: number }

/**
 * Draws the effect entities (phase 28) from a source list (the offline EffectWorld or the snapshot), one pooled
 * object per entity, and spawns their per-frame particles through FxWorld. Appear/end are bus `fx:ent` events.
 */
export class EffectView {
  readonly root = new THREE.Group();
  private vis = new Map<number, Vis>();
  private free = new Map<EntKind, Vis[]>();
  private geo = { slash: crescentGeo(), rock: rockGeo(0.75), spike: rockGeo(0.45, 7), blade: bladeGeo(), anchor: anchorGeo(), ring: ringGeo(), column: columnGeo(), ball: new THREE.IcosahedronGeometry(1, 1), torus: new THREE.TorusGeometry(1, 0.08, 4, 16), hand: handGeo(), arm: armGeo(), cuff: cuffGeo(), decoy: decoyGeo(), wall: wallGeo(BALANCE.effects.tay.wall.w, BALANCE.effects.tay.wall.h) };
  private v = new THREE.Vector3();
  private bctx!: BCtx;

  constructor(private rig: LightRig, private fx: FxWorld, private source: () => Ent[], private posOf: (id: number) => THREE.Vector3 | null, private floorAt: (p: THREE.Vector3) => number) {
    this.root.name = 'fx:effects';
    this.bctx = { fx, v: this.v, geo: this.geo, m: (c, heat = 0, shade = 1) => effectMat(this.rig, c, heat, shade), mesh: (g, m, p) => this.mesh(g, m, p), posOf, floorAt };
  }

  update(dt: number): void {
    for (const v of this.vis.values()) v.seen = false;
    for (const e of this.source()) {
      let v = this.vis.get(e.id);
      if (!v) { v = this.make(e); this.vis.set(e.id, v); this.appear(e, v); bus.emit('fx:ent', { on: true, k: e.k, e }); }
      v.seen = true;
      this.draw(e, v, dt);
    }
    for (const [id, v] of this.vis) {
      if (v.seen) continue;
      this.vis.delete(id);
      v.obj.visible = false;
      bus.emit('fx:ent', { on: false, k: v.k, e: { id, k: v.k, o: -1, x: v.obj.position.x, y: v.obj.position.y, z: v.obj.position.z, vx: 0, vy: 0, vz: 0, yaw: 0, age: 0, life: 0, r: 0 } });
      const list = this.free.get(v.k) ?? [];
      list.push(v); this.free.set(v.k, list);
    }
  }

  private mesh(g: THREE.BufferGeometry, m: EffectMat, parent: THREE.Object3D): THREE.Mesh {
    const o = new THREE.Mesh(g, m);
    o.frustumCulled = false; o.userData.noCollide = true;
    parent.add(o);
    return o;
  }

  private make(e: Ent): Vis {
    const reuse = this.free.get(e.k)?.pop();
    if (reuse) { reuse.obj.visible = true; reuse.acc = 0; reuse.lx = e.x; reuse.lz = e.z; return reuse; }
    const g = new THREE.Group(), mats: EffectMat[] = [], m = (c: string, heat = 0, shade = 1) => { const x = effectMat(this.rig, c, heat, shade); mats.push(x); return x; };
    switch (e.k) {
      case 'slash': this.mesh(this.geo.slash, m(X.steel, 0, 0), g); break;
      case 'slash_burn': this.mesh(this.geo.slash, m(X.steel, X.slashBurn, 0), g); break;
      case 'slash_ice': this.mesh(this.geo.slash, m(X.ice, 0, 0), g); break;
      case 'slash_sun': this.mesh(this.geo.slash, m(X.sun, 0, 0), g); break;
      case 'meteor': { this.mesh(this.geo.rock, m(X.rock), g); this.mesh(this.geo.ring, m(X.rimStar, 0.6, 0), g); break; }
      case 'orbit': for (let i = 0; i < E.orbit.n; i++) this.mesh(this.geo.blade, m(X.blade), g); break;
      case 'eclipse': case 'star': { this.mesh(this.geo.ball, m(X.hole, 0, 0), g); this.mesh(this.geo.torus, m(e.k === 'star' ? X.rimStar : X.rimEclipse, e.k === 'star' ? X.star : 0), g); break; }
      case 'column': this.mesh(this.geo.column, m('#000', X.column, 1), g); break;
      case 'anchor': { this.mesh(this.geo.anchor, m(X.anchor), g); this.mesh(new THREE.BoxGeometry(0.05, 0.05, 1), m('#3c3630'), g); break; }
      case 'crack': for (let i = 0; i < 3; i++) this.mesh(this.geo.spike, m(X.rock), g); break;
      case 'lava': case 'ice': break;
      default: makeB(e, { ...this.bctx, m: (c, heat = 0, shade = 1) => m(c, heat, shade) }, g);
    }
    this.root.add(g);
    return { k: e.k, obj: g, mats, seen: true, acc: 0, lx: e.x, lz: e.z };
  }

  /** One-time marks when an entity first shows up (fields are decals: their whole life is known now). */
  private appear(e: Ent, _v: Vis): void {
    const fx = this.fx, life = lifeOf(e) - e.age, floor = this.floorAt(this.v.set(e.x, e.y + 0.5, e.z)) + 0.004;
    appearB(e, this.bctx);
    if (e.k === 'lava') {
      fx.decals.spawn({ x: e.x, y: floor, z: e.z, r0: e.r * 0.4, r1: e.r, growS: 0.25, steps: 3, life, fadeS: 0.6, alpha: 1, color: LAVA_DARK, shape: 0, seed: fx.rnd() });
      fx.decals.spawn({ x: e.x, y: floor + 0.003, z: e.z, r0: e.r * 0.2, r1: e.r * 0.62, growS: 0.3, steps: 3, life: life * 0.9, fadeS: 0.6, alpha: 1, color: LAVA, shape: 0, seed: fx.rnd() });
    } else if (e.k === 'ice') {
      fx.decals.spawn({ x: e.x, y: floor, z: e.z, r0: e.r * 0.5, r1: e.r, growS: 0.15, steps: 2, life, fadeS: 0.8, alpha: 0.85, color: ICE, shape: 0, seed: fx.rnd() });
    } else if (e.k === 'column') {
      const [fx0, fz0] = [-Math.sin(e.yaw), -Math.cos(e.yaw)];
      for (let d = 1; d < E.column.len; d += 1.2) {
        this.v.set(e.x + fx0 * d, e.y + 0.4, e.z + fz0 * d);
        fx.spray(this.v, 2, [1.5, 3.5], [0.3, 0.7], floor, 0.8, 1);
        fx.decals.spawn({ x: this.v.x, y: floor, z: this.v.z, r0: 0.3, r1: 0.6, growS: 0.1, steps: 2, life: 4, fadeS: 2, alpha: 0.9, color: CRACK, shape: 0, seed: fx.rnd() });
      }
    }
  }

  private draw(e: Ent, v: Vis, dt: number): void {
    const o = v.obj, life = lifeOf(e), u = Math.min(1, e.age / Math.max(1e-3, life)), fade = u > 0.7 ? 1 - (u - 0.7) / 0.3 : 1;
    o.position.set(e.x, e.y, e.z);
    o.rotation.set(0, e.yaw, 0);
    const fx = this.fx;
    v.acc += dt;
    switch (e.k) {
      case 'slash': case 'slash_burn': case 'slash_ice': case 'slash_sun': {
        o.rotation.z = (e.id % 2 ? 1 : -1) * 0.5;
        o.position.y -= 0.35;
        o.scale.setScalar(0.8 + u * 0.5);
        v.mats[0].uniforms.uAlpha.value = fade;
        if (v.acc > 0.04) {
          v.acc = 0;
          if (e.k === 'slash_burn' || e.k === 'slash_sun') fx.spray(o.position, 1, [0.5, 1.5], [0.15, 0.35], -1e3, 0.2, 1);
          if (e.k === 'slash_ice') fx.puffs.spawn({ x: e.x, y: e.y, z: e.z, vx: 0, vy: -0.3, vz: 0, size: 0.12, grow: 0.4, life: 0.4, alpha: 0.7, color: ICE, seed: fx.rnd() });
        }
        break;
      }
      case 'lava':
        if (v.acc > 1 / X.lavaEmbersPerS) {
          v.acc = 0;
          const a = fx.rnd() * 6.283, r = Math.sqrt(fx.rnd()) * e.r * 0.8;
          fx.sparks.spawn({ x: e.x + Math.cos(a) * r, y: e.y + 0.05, z: e.z + Math.sin(a) * r, vx: 0, vy: 0.8 + fx.rnd(), vz: 0, life: 0.6 + fx.rnd() * 0.5, floor: -1e3, kind: 1, heat: 0.7 });
        }
        break;
      case 'meteor': {
        const rock = o.children[0], ring = o.children[1], k = 1 - u;
        rock.scale.setScalar(e.r / E.meteor.r);
        rock.position.set(0, X.meteor.dropH * k * k, X.meteor.dropH * 0.35 * k * k);
        rock.rotation.set(e.age * 5, e.age * 3, 0);
        ring.scale.setScalar(e.r * (0.9 + 0.1 * Math.sin(e.age * 30)));
        ring.position.y = 0.06;
        (ring as THREE.Mesh).visible = Math.floor(e.age * 10) % 2 === 0 || u > 0.6;
        break;
      }
      case 'orbit': {
        const p = this.posOf(e.o);
        if (p) o.position.copy(p);
        o.rotation.set(0, 0, 0);
        o.children.forEach((b, i) => {
          const a = e.yaw + (i / E.orbit.n) * Math.PI * 2;
          b.position.set(Math.cos(a) * e.r, 1.1 + 0.12 * Math.sin(a * 2), Math.sin(a) * e.r);
          b.rotation.set(0, -a, 0);
        });
        break;
      }
      case 'eclipse': case 'star': {
        const grow = Math.min(1, e.age / 0.25), pulse = 1 + 0.08 * Math.sin(e.age * 18), R = (e.k === 'star' ? 0.55 + u * 0.4 : 0.42) * grow;
        o.children[0].scale.setScalar(R * pulse);
        o.children[1].scale.setScalar(R * 1.45);
        o.children[1].rotation.set(Math.PI / 2 + 0.3 * Math.sin(e.age * 2), 0, e.age * 2);
        if (v.acc > 0.05) {
          v.acc = 0;
          const a = fx.rnd() * 6.283, r = e.r * (0.5 + fx.rnd() * 0.5), sp = r / 0.5;
          fx.puffs.spawn({ x: e.x + Math.cos(a) * r, y: e.y - 1 + fx.rnd() * 1.6, z: e.z + Math.sin(a) * r, vx: -Math.cos(a) * sp, vy: 0.5, vz: -Math.sin(a) * sp, size: 0.12, grow: -0.1, life: 0.5, alpha: 0.9, color: HOLE_DUST, seed: fx.rnd() });
        }
        break;
      }
      case 'column': {
        const m = v.mats[0].uniforms;
        m.uAlpha.value = 0.8 * (1 - u * u); m.uHeat.value = X.column - 0.12 * Math.floor(u * 4) / 3;
        o.scale.set(1, 0.6 + 0.6 * Math.min(1, e.age / 0.08) - 0.3 * u + 0.12 * Math.sin(e.age * 50), 1);
        break;
      }
      case 'anchor': {
        const sp = Math.hypot(e.vx, e.vy, e.vz);
        if (sp > 0.1) o.rotation.set(Math.asin(Math.max(-1, Math.min(1, e.vy / sp))), Math.atan2(-e.vx, -e.vz), 0);
        o.children[0].rotation.z = e.age * 9;
        const p = this.posOf(e.o), chain = o.children[1];
        if (p) {
          this.v.set(p.x, p.y + 1.3, p.z);
          const d = this.v.distanceTo(o.position);
          chain.scale.set(1, 1, d); chain.position.set(0, 0, d / 2);
        }
        break;
      }
      case 'crack': {
        o.children.forEach((c, i) => { c.position.set((i - 1) * 0.5, 0.15 + 0.25 * Math.abs(Math.sin(e.age * 20 + i)), -i * 0.2); c.rotation.set(e.age * 4 + i, i, 0); });
        if (Math.hypot(e.x - v.lx, e.z - v.lz) > 0.7) {
          v.lx = e.x; v.lz = e.z;
          const floor = this.floorAt(this.v.set(e.x, e.y + 0.5, e.z)) + 0.004;
          fx.decals.spawn({ x: e.x, y: floor, z: e.z, r0: 0.5, r1: 0.8, growS: 0.08, steps: 2, life: 5, fadeS: 2, alpha: 1, color: CRACK, shape: 0, seed: fx.rnd() });
          fx.puffs.spawn({ x: e.x, y: e.y + 0.2, z: e.z, vx: 0, vy: 1.2, vz: 0, size: 0.25, grow: 0.6, life: 0.6, alpha: 0.8, color: DUST, drag: 3, seed: fx.rnd() });
          fx.spray(this.v.set(e.x, e.y + 0.2, e.z), 3, [2, 4], [0.3, 0.6], floor, 0.6);
        }
        break;
      }
      case 'ice': break;
      default: drawB(e, v, dt, this.bctx);
    }
  }

  clear(): void { for (const v of this.vis.values()) v.obj.visible = false; this.vis.clear(); }
  dispose(): void {
    this.root.removeFromParent();
    const shared = new Set<THREE.BufferGeometry>(Object.values(this.geo));
    this.root.traverse((o) => { if (o instanceof THREE.Mesh) { (o.material as THREE.Material).dispose(); if (!shared.has(o.geometry)) o.geometry.dispose(); } });
    for (const g of shared) g.dispose();
  }
}
