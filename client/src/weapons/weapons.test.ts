import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { FAMILIES, familyForms, WEAPONS } from '@wih/shared';
import type { MaterialLib } from '../render/materials/library';
import { STR } from '../ui/strings.vi';
import { WEAPON_MODELS } from './models';
import { buildWeapon } from './weapon';
import { weaponTris } from './wkit';

const lib = { get: () => new THREE.MeshBasicMaterial() } as unknown as MaterialLib;
const built = new Map(WEAPONS.map((w) => [w.id, buildWeapon(w.id, { lib })]));

describe('weapon models', () => {
  it('every weapon has a model, a name and the contract markers', () => {
    for (const w of WEAPONS) {
      expect(WEAPON_MODELS[w.model], w.id).toBeDefined();
      expect((STR.weapon as Record<string, string>)[w.id], w.id).toBeTruthy();
      const g = built.get(w.id)!;
      const tip = g.getObjectByName('tip')!, base = g.getObjectByName('base')!;
      expect(tip && base, w.id).toBeTruthy();
      expect(tip.position.y, w.id).toBeGreaterThan(base.position.y);
      expect(base.position.y, w.id).toBeGreaterThan(0);
    }
    for (const f of FAMILIES) expect(STR.family[f]).toBeTruthy();
  });
  it('is one mesh of 300–1200 tris with uv, color and heatMask', () => {
    for (const [id, g] of built) {
      const meshes = g.children.filter((c) => (c as THREE.Mesh).isMesh) as THREE.Mesh[];
      expect(meshes, id).toHaveLength(1);
      const geo = meshes[0].geometry;
      for (const a of ['position', 'normal', 'uv', 'color', 'heatMask']) expect(geo.getAttribute(a), `${id}.${a}`).toBeDefined();
      const t = weaponTris(g);
      expect(t, id).toBeGreaterThanOrEqual(300);
      expect(t, id).toBeLessThanOrEqual(1200);
      const hm = geo.getAttribute('heatMask');
      let hot = 0;
      for (let i = 0; i < hm.count; i++) if (hm.getX(i) === 1) hot++;
      expect(hot, id).toBeGreaterThan(0);
    }
  });
  it('grips at the origin, blade up, and forms grow within each family', () => {
    for (const [id, g] of built) {
      const bb = new THREE.Box3().setFromObject(g);
      expect(bb.min.y, id).toBeLessThan(0);
      expect(bb.max.y, id).toBeGreaterThan(0.4);
      expect(Math.abs(bb.min.x) + Math.abs(bb.max.x), id).toBeLessThan(0.25);
    }
    for (const f of FAMILIES) {
      const len = familyForms(f).map((w) => { const bb = new THREE.Box3().setFromObject(built.get(w.id)!); return bb.max.y - bb.min.y; });
      expect(len[len.length - 1], f).toBeGreaterThan(len[0]);
    }
  });
});
