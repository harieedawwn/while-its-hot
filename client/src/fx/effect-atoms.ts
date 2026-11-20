import * as THREE from 'three';
import type { AtomFx } from '@wih/shared';
import { bus } from '../core/events';
import { FEEL } from '../core/feel';
import type { FxWorld } from './fx-world';

const X = FEEL.fx.effects;
const col = (h: string) => new THREE.Color(h);
const POISON = col(X.poison), BONE = col(X.bone), SMOKE = col('#26222a'), BOLT = col(X.bolt), WAVE = col(X.wave), BELL = col(X.bell), PIN = col(X.pin), ICE = col(X.ice), DUST = col('#6a6258'), SCORCH = col('#1a1512');
const MAX_SEG = 64;

/**
 * Instant form-effect moments (bus fx:atom / fx:dmg / fx:status) → sparks, rings, puffs and short bolt lines.
 * Bolts and whips are 1-px line segments in the low-res pass: crisp, no glow. Returns the unsubscribe.
 */
export function bindEffectAtoms(fx: FxWorld, floorAt: (p: THREE.Vector3) => number, camPos: () => THREE.Vector3, localId = 0): { update(dt: number): void; dispose(): void } {
  const pos = new Float32Array(MAX_SEG * 6), g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
  g.setDrawRange(0, 0);
  const lines = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: BOLT, fog: false }));
  lines.frustumCulled = false; lines.userData.noCollide = true; lines.renderOrder = 3;
  fx.root.add(lines);
  let segs: { a: number[]; b: number[]; t: number }[] = [];
  const v = new THREE.Vector3();
  const vec = (p: readonly number[]) => v.set(p[0], p[1], p[2]);
  const floor = (p: readonly number[]) => floorAt(vec(p).setY(p[1] + 0.5)) + 0.006;
  const ring = (p: readonly number[], r: number, c: THREE.Color, s = 0.3, w = 0.1) =>
    fx.decals.spawn({ x: p[0], y: floor(p), z: p[2], r0: 0.4, r1: r, growS: s, steps: 4, life: s * 1.7, fadeS: s * 0.8, alpha: 0.95, color: c, shape: 1, seed: fx.rnd(), width: w });
  const dust = (p: readonly number[], n: number, sp: number, c = DUST) => {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * 6.283 + fx.rnd() * 0.5;
      fx.puffs.spawn({ x: p[0], y: p[1] + 0.15, z: p[2], vx: Math.cos(a) * sp, vy: 0.4 + fx.rnd(), vz: Math.sin(a) * sp, size: 0.18, grow: 0.6, life: 0.55, alpha: 0.85, color: c, drag: 4, seed: fx.rnd() });
    }
  };
  /** A jagged bolt from a to b: 5 kinks, a new shape every call. */
  const bolt = (a: readonly number[], b: readonly number[], t: number) => {
    let prev = [a[0], a[1], a[2]];
    for (let i = 1; i <= 5; i++) {
      const u = i / 5, j = i === 5 ? 0 : 0.35;
      const p = [a[0] + (b[0] - a[0]) * u + (fx.rnd() - 0.5) * j, a[1] + (b[1] - a[1]) * u + (fx.rnd() - 0.5) * j, a[2] + (b[2] - a[2]) * u + (fx.rnd() - 0.5) * j];
      segs.push({ a: prev, b: p, t }); prev = p;
    }
  };
  const near = (p: readonly number[], r: number) => camPos().distanceTo(vec(p)) < r;

  const on = (a: AtomFx) => {
    const p = a.p, r = a.r ?? 2;
    switch (a.k) {
      case 'chain': {
        const q = a.q ?? [];
        let from: readonly number[] = p;
        for (let i = 0; i + 2 < q.length; i += 3) {
          const to = [q[i], q[i + 1], q[i + 2]];
          bolt(from, to, X.boltS); bolt(from, to, X.boltS * 0.6);
          fx.spray(vec(to), 6, [2, 5], [0.12, 0.3], floor(to), 0.3, 2);
          from = to;
        }
        break;
      }
      case 'whip': if (a.q) { bolt(p, a.q, X.whipS); fx.spray(vec(a.q), 5, [1.5, 3], [0.15, 0.3], floor(a.q), 0.2); } break;
      case 'wave': ring(p, r, WAVE, 0.28); dust(p, 10, 6); break;
      case 'bell': ring(p, r, BELL, 0.45, 0.06); ring(p, r * 0.6, BELL, 0.3, 0.06); break;
      case 'pin': ring(p, r, PIN, 0.5, 0.2); dust(p, 14, 2.5, PIN); break;
      case 'magnet': fx.decals.spawn({ x: p[0], y: floor(p), z: p[2], r0: r, r1: 0.6, growS: 0.3, steps: 4, life: 0.5, fadeS: 0.25, alpha: 0.9, color: WAVE, shape: 1, seed: fx.rnd(), width: 0.06 }); break;
      case 'meteor_hit': case 'boom': {
        ring(p, r, a.k === 'boom' ? col(X.rimStar) : DUST, 0.35, 0.14);
        fx.decals.spawn({ x: p[0], y: floor(p), z: p[2], r0: r * 0.3, r1: r * 0.7, growS: 0.1, steps: 2, life: 7, fadeS: 3, alpha: 1, color: SCORCH, shape: 0, seed: fx.rnd() });
        fx.spray(vec(p).setY(p[1] + 0.4), 26, [3, 8], [0.3, 0.9], floor(p), 0.7, 1);
        dust(p, 12, 7);
        if (near(p, 14)) bus.emit('cam:trauma', { amount: 0.5 });
        break;
      }
      case 'anchor_hit': dust(p, 8, 4); fx.spray(vec(p), 8, [2, 4], [0.2, 0.4], floor(p), 0.3); break;
      case 'orbit_hit': fx.spray(vec(p), 4, [1.5, 3], [0.1, 0.25], floor(p), 0.1); break;
      case 'freeze': for (let i = 0; i < 8; i++) fx.puffs.spawn({ x: p[0], y: p[1] + 0.3 + fx.rnd() * 1.4, z: p[2], vx: (fx.rnd() - 0.5) * 2, vy: 0.3, vz: (fx.rnd() - 0.5) * 2, size: 0.14, grow: 0.3, life: 0.7, alpha: 0.9, color: ICE, drag: 3, seed: fx.rnd() }); break;
      case 'push': dust(p, 5, 3); break;
      case 'hook': if (a.q) { bolt(p, a.q, 0.18); dust(a.q, 4, 3); } break;
      case 'blink': case 'vanish': dust(p, a.k === 'blink' ? 12 : 7, 2.5, SMOKE); if (a.k === 'blink') ring(p, 1.4, SMOKE, 0.3, 0.08); break;
      case 'rift': {
        const q = a.q ?? p;
        bolt(p, q, 0.3); bolt(p, q, 0.22); bolt(p, q, 0.14);
        for (let i = 0; i < 8; i++) { const u = i / 7; dust([p[0] + (q[0] - p[0]) * u, p[1] - 0.8, p[2] + (q[2] - p[2]) * u], 2, 2.5, SMOKE); }
        ring(q, 2, SMOKE, 0.3, 0.1); fx.spray(vec(q), 10, [2, 5], [0.2, 0.5], floor(q), 0.4);
        if (near(q, 14)) bus.emit('cam:trauma', { amount: 0.25 });
        break;
      }
      case 'heal': for (let i = 0; i < 6; i++) fx.puffs.spawn({ x: p[0] + (fx.rnd() - 0.5) * 0.6, y: p[1] - 0.6 + fx.rnd() * 0.8, z: p[2] + (fx.rnd() - 0.5) * 0.6, vx: 0, vy: 1.1, vz: 0, size: 0.1, grow: 0.2, life: 0.8, alpha: 0.9, color: BONE, drag: 1, seed: fx.rnd() }); break;
      case 'ice_boom': ring(p, r, ICE, 0.35, 0.12); dust(p, 10, 5, ICE); for (let i = 0; i < 10; i++) fx.puffs.spawn({ x: p[0], y: p[1] + fx.rnd(), z: p[2], vx: (fx.rnd() - 0.5) * 5, vy: 1 + fx.rnd() * 2, vz: (fx.rnd() - 0.5) * 5, size: 0.14, grow: 0.3, life: 0.7, alpha: 0.9, color: ICE, drag: 2, seed: fx.rnd() }); break;
    }
  };
  const offs = [
    bus.on('fx:atom', on),
    bus.on('fx:dmg', (e) => { if (e.k !== 'orbit_hit') fx.spray(v.set(e.x, e.y, e.z), 5, [1.5, 3.5], [0.15, 0.35], floorAt(v), 0.25, e.k.startsWith('slash_burn') || e.k === 'column' ? 1 : 0); }),
    bus.on('fx:status', (e) => {
      if (e.k === 'shake' && e.id === localId) bus.emit('cam:trauma', { amount: 0.45 });
      if (e.k === 'pin') fx.decals.spawn({ x: e.x, y: e.y + 0.01, z: e.z, r0: 0.5, r1: 0.6, growS: 0.05, steps: 1, life: e.s, fadeS: 0.3, alpha: 0.9, color: PIN, shape: 1, seed: fx.rnd(), width: 0.25 });
      if (e.k === 'well') fx.spray(v.set(e.x, e.y + 1, e.z), 3, [1, 2], [0.2, 0.4], -1e3, 0.5, 2);
      if (e.k === 'poison') for (let i = 0; i < 4; i++) fx.puffs.spawn({ x: e.x + (fx.rnd() - 0.5) * 0.5, y: e.y + 0.6 + fx.rnd() * 1.0, z: e.z + (fx.rnd() - 0.5) * 0.5, vx: 0, vy: 0.7, vz: 0, size: 0.1, grow: 0.25, life: 0.7, alpha: 0.9, color: POISON, drag: 1, seed: fx.rnd() });
      if (e.k === 'haste') fx.spray(v.set(e.x, e.y + 0.2, e.z), 2, [1, 2], [0.1, 0.2], -1e3, 0.1, 0);
      if (e.k === 'invis' && e.s > 0) for (let i = 0; i < 6; i++) fx.puffs.spawn({ x: e.x + (fx.rnd() - 0.5) * 0.6, y: e.y + fx.rnd() * 1.6, z: e.z + (fx.rnd() - 0.5) * 0.6, vx: (fx.rnd() - 0.5), vy: 0.4, vz: (fx.rnd() - 0.5), size: 0.16, grow: 0.5, life: 0.5, alpha: 0.8, color: SMOKE, drag: 2, seed: fx.rnd() });
    }),
  ];
  return {
    update(dt: number) {
      segs = segs.filter((s) => (s.t -= dt) > 0).slice(-MAX_SEG);
      segs.forEach((s, i) => { pos.set(s.a, i * 6); pos.set(s.b, i * 6 + 3); });
      (g.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
      g.setDrawRange(0, segs.length * 2);
    },
    dispose() { offs.forEach((o) => o()); lines.removeFromParent(); g.dispose(); (lines.material as THREE.Material).dispose(); },
  };
}
