import { cbox } from '../../render/geo/cbox';
import * as P from '../../render/geo/procgeo';
import { cyl } from '../../render/models/kit';
import { type ArmorBuilder, BRASS, LEATHER, LEATHER_DARK, STEEL_DARK } from './armor-kit';

const part = P.part, rounded = cbox;

/** Tier 0 — Tạp dề: leather bib on shoulder straps, thigh flaps that swing with the legs, one belt pouch. */
export function apron(a: ArmorBuilder): void {
  a.sash(0.45, 0.33);
  a.put('chest', 'leather', [
    part(rounded(0.34, 0.4, 0.03, 0.012, 1), LEATHER, { pos: [0, 0, -0.172] }),
    part(rounded(0.17, 0.1, 0.025, 0.01, 1), LEATHER_DARK, { pos: [0, -0.1, -0.196] }),
    ...[-1, 1].map((s) => part(rounded(0.05, 0.022, 0.34, 0.008, 1), LEATHER_DARK, { pos: [s * 0.11, 0.238, 0], shade: 0 })),
  ]);
  a.both('thigh', 'leather', [part(rounded(0.17, 0.3, 0.03, 0.012, 1), LEATHER, { pos: [0, 0.06, -0.12] })]);
  a.put('hip', 'leather', [
    part(rounded(0.1, 0.3, 0.03, 0.012, 1), LEATHER, { pos: [0, -0.09, -0.152] }),
    part(rounded(0.09, 0.1, 0.07, 0.02, 1), LEATHER_DARK, { pos: [0.235, 0.0, -0.02] }),
  ]);
}

/** Tier 1 — Da: laced leather jerkin, shoulder caps, bracers, thigh guards, skullcap. */
export function leather(a: ArmorBuilder, sash = true): void {
  if (sash) a.sash(0.485, 0.345);
  a.put('chest', 'leather', [
    part(rounded(0.57, 0.34, 0.345, 0.1, 2), LEATHER, { pos: [0, 0.07, 0] }),
    part(rounded(0.465, 0.22, 0.31, 0.08, 2), LEATHER, { pos: [0, -0.13, 0] }),
    part(cyl(0.1, 0.11, 0.05, 8), LEATHER_DARK, { pos: [0, 0.255, 0], shade: 0 }),
    part(rounded(0.03, 0.34, 0.012, 0.005, 1), LEATHER_DARK, { pos: [0, 0.04, -0.176], shade: 0 }),
  ]);
  a.both('shoulder', 'leather', [part(P.shell(0.125, 1.4, 8), LEATHER, { pos: [0.02, -0.01, 0], rot: [0, 0, 0.5], scale: [1, 0.8, 1.1] })]);
  a.both('forearm', 'leather', [
    part(cyl(0.084, 0.078, 0.17, 8), LEATHER, { pos: [0, 0, 0] }),
    part(cyl(0.087, 0.087, 0.02, 8), LEATHER_DARK, { pos: [0, 0.05, 0], shade: 0 }),
    part(cyl(0.083, 0.083, 0.02, 8), LEATHER_DARK, { pos: [0, -0.05, 0], shade: 0 }),
  ]);
  a.both('thigh', 'leather', [part(rounded(0.19, 0.36, 0.03, 0.014, 1), LEATHER, { pos: [0, 0.07, -0.121] })]);
  a.put('head', 'leather', [part(P.shell(0.172, 1.1, 9), LEATHER_DARK, { pos: [0, 0.02, 0.005] })]);
}

/** Tier 2 — Da đinh: the leather set plus steel studs, shin guards and a studded cap. */
export function studded(a: ArmorBuilder): void {
  leather(a);
  const stud = (x: number, y: number, z: number, rot: [number, number, number]) =>
    part(cyl(0.02, 0.025, 0.02, 5), STEEL_DARK, { pos: [x, y, z], rot, shade: 0 });
  const front: P.Part[] = [];
  for (const y of [0.1, 0.0, -0.1, -0.2]) for (const x of [-0.14, -0.047, 0.047, 0.14]) front.push(stud(x, y, -0.182, [Math.PI / 2, 0, 0]));
  a.put('chest', 'steel', front);
  a.both('forearm', 'steel', [stud(0, 0, -0.088, [Math.PI / 2, 0, 0]), stud(0.04, -0.06, -0.078, [Math.PI / 2, 0, 0]), stud(-0.04, 0.06, -0.078, [Math.PI / 2, 0, 0])]);
  a.put('head', 'steel', [0, 1, 2, 3, 4, 5].map((i) => stud(Math.sin(i * 1.05 - 2.6) * 0.17, 0.08, Math.cos(i * 1.05 - 2.6) * 0.17, [Math.PI / 2, 0, 0])));
  a.both('shin', 'leather', [
    part(cyl(0.107, 0.1, 0.27, 8), LEATHER, { pos: [0, 0.05, 0] }),
    part(cyl(0.11, 0.11, 0.025, 8), LEATHER_DARK, { pos: [0, 0.16, 0], shade: 0 }),
    part(cyl(0.104, 0.104, 0.025, 8), LEATHER_DARK, { pos: [0, -0.06, 0], shade: 0 }),
  ]);
  a.put('hip', 'steel', [part(cbox(0.05, 0.05, 0.02, 0.008, 1), BRASS, { pos: [0, 0.1, -0.162], shade: 0 })]);
}
