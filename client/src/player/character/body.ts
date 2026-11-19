import * as THREE from 'three';
import { cbox } from '../../render/geo/cbox';
import * as P from '../../render/geo/procgeo';
import { cyl } from '../../render/models/kit';
import type { BoneName } from './skeleton';
import { SkinBatch } from './skin-batch';

/** Base-body colors (multiplied with the cloth texture: keep them light, LOOK §2). */
const C = {
  shirt: '#e6dcc4', pants: '#b8a690', boot: '#bd9a7a', sole: '#6a5444', glove: '#cfae8a', skin: '#ecc0a0',
  hood: '#a09080', belt: '#9a7852', steel: '#c4cacf', dark: '#0c0908', rivet: '#e6e9ec',
} as const;

/** Tapered limb segment hanging from y=0 down to −len, a slight belly in the middle. */
const limb = (len: number, r0: number, r1: number, seg = 8) =>
  P.lathe([[r0, 0], [(r0 + r1) / 2 * 1.06, -len / 2], [r1, -len]], seg, 1);
/** A low-poly ball for joints (20 triangles). */
const ball = (r: number) => new THREE.IcosahedronGeometry(r, 0);

/**
 * The stocky blacksmith (LOOK §4): about 1.9k tris, rigid pieces overlapping at every joint. Faceless: a
 * riveted forge mask with a visor slit under a hood. Work clothes only — the apron and everything else is
 * armor tier 0+. Player color shows as the waist sash, its tail and the armband (tag 1). Everything is bone-local, hanging along −Y.
 */
export function buildBody(): SkinBatch {
  const b = new SkinBatch();

  b.add('pelvis', [0, 0, 0], [
    P.part(cbox(0.38, 0.24, 0.27, 0.07), C.pants, { pos: [0, -0.01, 0] }),
    P.part(cbox(0.405, 0.075, 0.29, 0.025), C.belt, { pos: [0, 0.1, 0], shade: 0 }),
    P.part(cbox(0.07, 0.06, 0.02, 0.008), C.steel, { pos: [0, 0.1, -0.15], shade: 0 }),
  ]);

  b.add('chest', [0, 0, 0], [
    P.part(cbox(0.43, 0.22, 0.28, 0.08), C.shirt, { pos: [0, 0.08, 0] }),
    P.part(cbox(0.54, 0.3, 0.31, 0.1), C.shirt, { pos: [0, 0.28, 0] }),
    P.part(cyl(0.058, 0.066, 0.1, 7), C.skin, { pos: [0, 0.44, 0], shade: 0 }),
  ]);
  // waist sash and tail, player color (tag 1)
  b.add('chest', [0, 0.04, 0], [P.part(cbox(0.45, 0.07, 0.3, 0.02), '#ffffff', { shade: 0.1 })], { tag: 1 });
  b.add('pelvis', [0, 0, 0], [P.part(cbox(0.075, 0.26, 0.03, 0.01), '#ffffff', { pos: [-0.1, -0.03, -0.16], rot: [0.08, 0, 0.05], shade: 0.1 })], { tag: 1 });

  // hood over a smooth skull, forge mask on the front (head origin = neck pivot, head center +0.14)
  b.add('head', [0, 0, 0], [
    P.part(P.lathe([[0.1, -0.03], [0.15, 0.06], [0.16, 0.15], [0.13, 0.25], [0.0, 0.3]], 10, 1), C.hood),
    P.part(cbox(0.17, 0.06, 0.2, 0.025), C.hood, { pos: [0, -0.01, 0.06] }),
  ]);
  b.add('head', [0, 0, 0], [
    P.part(cbox(0.215, 0.2, 0.05, 0.03), C.steel, { pos: [0, 0.13, -0.15], rot: [0.08, 0, 0] }),
    P.part(cbox(0.17, 0.075, 0.06, 0.025), C.steel, { pos: [0, 0.015, -0.135] }),
    P.part(cbox(0.16, 0.028, 0.012, 0.005), C.dark, { pos: [0, 0.16, -0.178], rot: [0.08, 0, 0], shade: 0 }),
    ...[-1, 1].map((sx) => P.part(cyl(0.011, 0.011, 0.014, 5), C.rivet, { pos: [sx * 0.088, 0.2, -0.176], rot: [Math.PI / 2, 0, 0], shade: 0 })),
    P.part(cbox(0.1, 0.04, 0.01, 0.003), C.dark, { pos: [0, 0.012, -0.168], shade: 0 }),
  ], { flat: true });

  // arms (right built, left mirrored): sleeve, armband, rolled cuff, bare forearm, mitten + thumb
  for (const m of [false, true]) {
    const o = { mirror: m };
    const bn = (n: string) => `${n}_${m ? 'l' : 'r'}` as BoneName;
    b.add(bn('arm'), [0, 0, 0], [P.part(limb(0.3, 0.092, 0.078), C.shirt), P.part(ball(0.098), C.shirt, { shade: 0 })], o);
    b.add(bn('arm'), [0, -0.1, 0], [P.part(cyl(0.097, 0.095, 0.06, 8), '#ffffff', { shade: 0 })], { ...o, tag: 1 });
    b.add(bn('fore'), [0, 0, 0], [
      P.part(cyl(0.082, 0.08, 0.06, 8), C.shirt, { pos: [0, -0.02, 0] }),
      P.part(limb(0.3, 0.066, 0.052, 7), C.skin, { pos: [0, -0.03, 0], shade: 0.1 }),
    ], o);
    b.add(bn('hand'), [0, 0, 0], [
      P.part(cyl(0.064, 0.064, 0.05, 7), C.belt, { pos: [0, -0.005, 0], shade: 0 }),
      P.part(cbox(0.1, 0.13, 0.07, 0.03), C.glove, { pos: [0, -0.07, 0] }),
      P.part(cbox(0.04, 0.07, 0.04, 0.015), C.glove, { pos: [-0.035, -0.045, -0.05], rot: [-0.5, 0, 0] }),
    ], o);
    b.add(bn('thigh'), [0, 0, 0], [P.part(limb(0.47, 0.108, 0.08), C.pants, { pos: [0, -0.01, 0] }), P.part(ball(0.11), C.pants, { shade: 0 })], o);
    b.add(bn('shin'), [0, 0, 0], [
      P.part(limb(0.4, 0.078, 0.064, 7), C.pants),
      P.part(P.lathe([[0.085, -0.15], [0.094, -0.17], [0.07, -0.26], [0.066, -0.37]], 8, 1), C.boot),
      P.part(cyl(0.097, 0.097, 0.03, 8), C.belt, { pos: [0, -0.165, 0], shade: 0 }),
      P.part(ball(0.082), C.pants, { shade: 0 }),
    ], o);
    b.add(bn('foot'), [0, 0, 0], [
      P.part(cbox(0.125, 0.085, 0.3, 0.035), C.boot, { pos: [0, -0.04, -0.07] }),
      P.part(cbox(0.13, 0.03, 0.315, 0.012), C.sole, { pos: [0, -0.078, -0.07], shade: 0 }),
      P.part(cbox(0.115, 0.05, 0.075, 0.015), C.sole, { pos: [0, -0.07, 0.078], shade: 0 }),
    ], o);
  }
  return b;
}
