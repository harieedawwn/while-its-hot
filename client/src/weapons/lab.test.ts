import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { WEAPON_IDS } from '@wih/shared';
import type { MaterialLib } from '../render/materials/library';
import { bakeLab } from './lab-kit';
import { LAB_FILES, labSkipped } from './models/lab';
import { weaponTris } from './wkit';

const lib = { get: () => new THREE.MeshBasicMaterial() } as unknown as MaterialLib;
const roster = new Set(WEAPON_IDS);

describe('weapon-lab files', () => {
  it('ids are unique and families valid', () => {
    const ids = LAB_FILES.map((f) => f.meta.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it('every roster-id file bakes to one mesh ≤1500 tris with markers', () => {
    for (const f of LAB_FILES.filter((x) => roster.has(x.meta.id))) {
      const g = bakeLab(f, { lib });
      expect(g.children.filter((c) => (c as THREE.Mesh).isMesh), f.meta.id).toHaveLength(1);
      expect(g.getObjectByName('tip') && g.getObjectByName('base'), f.meta.id).toBeTruthy();
      const t = weaponTris(g);
      expect(t, f.meta.id).toBeGreaterThanOrEqual(150);
      expect(t, f.meta.id).toBeLessThanOrEqual(1500);
    }
  });
  it('files outside the roster are only the known strays', () => {
    expect(labSkipped(roster).sort()).toEqual(['the_dao_pha_thu']);
  });
});
