import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { FAMILIES, familyForms, WEAPONS, weaponById } from '@wih/shared';
import type { MaterialLib } from '../render/materials/library';
import { STR } from '../ui/strings.vi';
import { WEAPON_MODELS } from './models';
import { buildWeapon, modelFor } from './weapon';
import { weaponTris } from './wkit';

const lib = { get: () => new THREE.MeshBasicMaterial() } as unknown as MaterialLib;
const built = new Map(WEAPONS.map((w) => [w.id, buildWeapon(w.id, { lib })]));

describe('weapon models', () => {
  it('every weapon has a model, a name and the contract markers', () => {
    for (const w of WEAPONS) {
      expect(WEAPON_MODELS[modelFor(w).model], w.id).toBeDefined();
      if (modelFor(w).borrowed) expect(weaponById(modelFor(w).model).family ?? w.family, w.id).toBe(w.family);
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
  it('grips at the origin, blade up (gauntlets: thumb up, knuckles +Z), and own models grow within each family', () => {
    const top: Record<string, number> = { kiem: 0.4, bua: 0.4, dao: 0.25, tay: 0.04 };
    for (const w of WEAPONS) {
      const bb = new THREE.Box3().setFromObject(built.get(w.id)!);
      expect(bb.min.y, w.id).toBeLessThan(0);
      expect(bb.max.y, w.id).toBeGreaterThan(top[w.family ?? 'kiem']);
      expect(Math.abs(bb.min.x) + Math.abs(bb.max.x), w.id).toBeLessThan(0.25);
    }
    const g = new THREE.Box3().setFromObject(built.get('gang_sat')!);
    expect(g.max.z).toBeGreaterThan(0.05); expect(g.min.z).toBeLessThan(-0.15);
    for (const f of FAMILIES) {
      const own = familyForms(f).filter((w) => !modelFor(w).borrowed);
      if (own.length < 2) continue;
      const len = own.map((w) => { const bb = new THREE.Box3().setFromObject(built.get(w.id)!); return bb.max.y - bb.min.y; });
      expect(len[len.length - 1], f).toBeGreaterThan(len[0]);
    }
  });
  it('a missing model borrows the nearest lower form of its family, tinted brighter', () => {
    expect(modelFor(weaponById('kiem_rang_cua'))).toEqual({ model: 'kiem_toi_lua', borrowed: true });
    expect(modelFor(weaponById('bua_sao_lun'))).toEqual({ model: 'bua_de', borrowed: true });
    expect(modelFor(weaponById('dao_khe_nut'))).toEqual({ model: 'dao_gam', borrowed: true });
    expect(modelFor(weaponById('gang_dinh'))).toEqual({ model: 'gang_sat', borrowed: true });
    expect(modelFor(weaponById('kiem_tho')).borrowed).toBe(false);
    const col = (id: string) => ((built.get(id)!.children[0] as THREE.Mesh).geometry.getAttribute('color').array as Float32Array)[0];
    expect(col('dao_phay')).toBeGreaterThan(col('dao_gam'));
  });
});
