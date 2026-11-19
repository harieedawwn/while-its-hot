import { cbox } from '../../render/geo/cbox';
import * as P from '../../render/geo/procgeo';
import { cyl } from '../../render/models/kit';
import { type ArmorBuilder, BRASS, LEATHER_DARK, STEEL, STEEL_DARK } from './armor-kit';
import { leather } from './armor-soft';

const part = P.part, rounded = cbox;
const rivet = (x: number, y: number, z: number) => part(cyl(0.012, 0.012, 0.014, 5), BRASS, { pos: [x, y, z], rot: [Math.PI / 2, 0, 0], shade: 0 });

/** Breastplate, shared by both plate tiers: pec plate, belly plate, ridge, rivets. */
function breastplate(a: ArmorBuilder): void {
  a.put('chest', 'steel', [
    part(rounded(0.5, 0.22, 0.08, 0.05, 2), STEEL, { pos: [0, 0.1, -0.17], rot: [0.06, 0, 0] }),
    part(rounded(0.4, 0.17, 0.07, 0.04, 2), STEEL_DARK, { pos: [0, -0.09, -0.155] }),
    part(rounded(0.04, 0.36, 0.03, 0.012, 1), STEEL, { pos: [0, 0.0, -0.205] }),
    rivet(-0.17, 0.12, -0.212), rivet(0.17, 0.12, -0.212), rivet(-0.13, -0.1, -0.19), rivet(0.13, -0.1, -0.19),
  ]);
}

/** Tier 3 — Giáp nửa: leather jerkin under a steel breastplate, pauldrons, vambraces, tassets, kettle helm. */
export function halfPlate(a: ArmorBuilder): void {
  leather(a, false);
  breastplate(a);
  a.sash(0.47, 0.42);
  a.both('shoulder', 'steel', [
    part(P.shell(0.118, 1.75, 8), STEEL, { pos: [0.02, 0.0, 0], scale: [1.0, 0.85, 1.0] }),
    part(P.shell(0.126, 1.7, 8), STEEL_DARK, { pos: [0.025, -0.05, 0], scale: [1.0, 0.6, 1.0] }),
  ]);
  a.both('forearm', 'steel', [
    part(cyl(0.093, 0.084, 0.19, 8), STEEL, { pos: [0, -0.02, 0] }),
    part(rounded(0.125, 0.07, 0.135, 0.03, 1), STEEL_DARK, { pos: [0, 0.12, 0.012] }),
  ]);
  a.both('thigh', 'steel', [
    part(rounded(0.21, 0.08, 0.055, 0.025, 1), STEEL, { pos: [0, 0.13, -0.122] }),
    part(rounded(0.2, 0.08, 0.055, 0.025, 1), STEEL_DARK, { pos: [0, 0.06, -0.128] }),
    part(rounded(0.19, 0.08, 0.055, 0.025, 1), STEEL, { pos: [0, -0.01, -0.134] }),
  ]);
  a.put('hip', 'steel', [part(rounded(0.43, 0.075, 0.31, 0.03, 1), STEEL_DARK, { pos: [0, -0.07, 0] })]);
  a.put('head', 'steel', [
    part(P.shell(0.178, 1.2, 9), STEEL, { pos: [0, 0.02, 0.01] }),
    part(P.lathe([[0.17, 0.0], [0.255, -0.012], [0.265, 0.004]], 10, 1), STEEL_DARK, { pos: [0, 0.075, 0] }),
    part(rounded(0.2, 0.15, 0.04, 0.02, 1), STEEL_DARK, { pos: [0, -0.03, 0.17], rot: [-0.25, 0, 0] }),
  ]);
}

/** Tier 4 — Giáp toàn thân: breast + back plate, gorget, spiked pauldrons, full limb plate, sabatons, closed great helm. */
export function fullPlate(a: ArmorBuilder): void {
  breastplate(a);
  a.sash(0.47, 0.42);
  a.put('chest', 'leather', [part(rounded(0.52, 0.5, 0.3, 0.1, 1), LEATHER_DARK, { pos: [0, 0.0, 0] })]);
  a.put('chest', 'steel', [
    part(P.lathe([[0.12, 0.0], [0.15, 0.03], [0.135, 0.07]], 10, 1), STEEL, { pos: [0, 0.225, 0] }),
    part(rounded(0.1, 0.26, 0.25, 0.04, 1), STEEL_DARK, { pos: [0.27, 0.05, 0] }),
    part(rounded(0.1, 0.26, 0.25, 0.04, 1), STEEL_DARK, { pos: [-0.27, 0.05, 0] }),
  ]);
  a.put('back', 'steel', [
    part(rounded(0.5, 0.4, 0.08, 0.05, 2), STEEL, { pos: [0, 0.0, 0.03] }),
    part(rounded(0.04, 0.4, 0.03, 0.012, 1), STEEL_DARK, { pos: [0, 0.0, 0.085] }),
  ]);
  a.both('shoulder', 'steel', [
    part(P.shell(0.135, 1.75, 8), STEEL, { pos: [0.02, 0.01, 0], scale: [1.0, 0.85, 1.0] }),
    part(P.shell(0.145, 1.7, 8), STEEL_DARK, { pos: [0.025, -0.045, 0], scale: [1.0, 0.6, 1.0] }),
    part(cyl(0.0, 0.022, 0.07, 5), BRASS, { pos: [0.02, 0.115, 0], shade: 0 }),
  ]);
  a.both('forearm', 'steel', [
    part(cyl(0.095, 0.085, 0.2, 8), STEEL, { pos: [0, -0.02, 0] }),
    part(rounded(0.135, 0.085, 0.145, 0.035, 1), STEEL_DARK, { pos: [0, 0.125, 0.012] }),
    part(cyl(0.098, 0.098, 0.02, 8), BRASS, { pos: [0, -0.115, 0], shade: 0 }),
  ]);
  a.both('thigh', 'steel', [
    part(P.lathe([[0.122, 0.16], [0.128, 0.08], [0.118, -0.06], [0.108, -0.14]], 8, 1), STEEL, { pos: [0, 0.0, 0] }),
    part(rounded(0.22, 0.07, 0.06, 0.025, 1), STEEL_DARK, { pos: [0, 0.14, -0.13] }),
    part(rounded(0.13, 0.13, 0.08, 0.04, 1), STEEL_DARK, { pos: [0, -0.17, -0.07] }),
  ]);
  a.put('hip', 'steel', [part(rounded(0.43, 0.075, 0.31, 0.03, 1), STEEL_DARK, { pos: [0, -0.07, 0] })]);
  a.both('shin', 'steel', [
    part(cyl(0.109, 0.102, 0.28, 8), STEEL, { pos: [0, 0.04, 0] }),
    part(rounded(0.14, 0.12, 0.09, 0.04, 1), STEEL_DARK, { pos: [0, 0.2, -0.045] }),
    part(rounded(0.04, 0.26, 0.03, 0.012, 1), STEEL_DARK, { pos: [0, 0.04, -0.108] }),
  ]);
  a.both('heel', 'steel', [
    part(rounded(0.145, 0.105, 0.33, 0.04, 2), STEEL, { pos: [0, -0.015, -0.162] }),
    part(rounded(0.125, 0.03, 0.18, 0.012, 1), STEEL_DARK, { pos: [0, 0.043, -0.2] }),
  ]);
  // closed great helm over the forge mask: only the visor slit shows
  a.put('head', 'steel', [
    part(P.lathe([[0.175, -0.17], [0.19, -0.09], [0.19, 0.0], [0.168, 0.08], [0.12, 0.14], [0.0, 0.17]], 10, 1), STEEL, { pos: [0, 0, 0] }),
    part(rounded(0.035, 0.34, 0.04, 0.015, 1), STEEL_DARK, { pos: [0, 0.02, -0.19] }),
    part(rounded(0.19, 0.036, 0.03, 0.01, 1), '#0c0908', { pos: [0, 0.01, -0.196], shade: 0 }),
    part(rounded(0.026, 0.12, 0.3, 0.012, 1), STEEL_DARK, { pos: [0, 0.165, 0.0] }),
    part(P.lathe([[0.19, 0], [0.205, -0.02], [0.2, -0.05]], 10, 1), STEEL_DARK, { pos: [0, -0.12, 0] }),
  ]);
}
