import { cbox } from '../../render/geo/cbox';
import * as P from '../../render/geo/procgeo';
import { cyl } from '../../render/models/kit';
import type { ModuleId } from '@wih/shared';
import { type ArmorBuilder, BRASS, LEATHER_DARK, STEEL, STEEL_DARK } from './armor-kit';

const part = P.part, rounded = cbox;
const IRON = '#8d949a';
const HALF = Math.PI / 2;

/** The six armor modules as socket attachments (GDD §7). Each is a function of the builder: adding one = one entry. */
export const MODULE_BUILDERS: Record<ModuleId, (a: ArmorBuilder) => void> = {
  /** Bộ phản lực: twin thrusters on a frame, nozzles down. */
  phan_luc(a) {
    a.put('back', 'steel', [
      part(rounded(0.34, 0.3, 0.07, 0.03, 1), STEEL_DARK, { pos: [0, 0.02, 0.07] }),
      ...[-1, 1].flatMap((s) => [
        part(cyl(0.062, 0.07, 0.34, 8), STEEL, { pos: [s * 0.1, 0.0, 0.14] }),
        part(cyl(0.072, 0.052, 0.07, 8), BRASS, { pos: [s * 0.1, -0.2, 0.14], shade: 0 }),
        part(cyl(0.0, 0.062, 0.06, 8), STEEL_DARK, { pos: [s * 0.1, 0.19, 0.14] }),
      ]),
    ]);
  },
  /** Súng máy vai: swivel mount and a short barrel over the right shoulder. */
  sung_may_vai(a) {
    a.put('shoulder_r', 'steel', [
      part(rounded(0.1, 0.07, 0.12, 0.025, 1), STEEL_DARK, { pos: [0.02, 0.14, 0.0] }),
      part(rounded(0.095, 0.1, 0.22, 0.03, 1), IRON, { pos: [0.02, 0.22, -0.02] }),
      part(cyl(0.032, 0.032, 0.32, 6), STEEL, { pos: [0.02, 0.225, -0.2], rot: [HALF, 0, 0] }),
      part(cyl(0.046, 0.046, 0.06, 6), STEEL_DARK, { pos: [0.02, 0.225, -0.34], rot: [HALF, 0, 0] }),
      part(rounded(0.05, 0.07, 0.1, 0.02, 1), BRASS, { pos: [0.02, 0.29, -0.02], shade: 0 }),
    ]);
  },
  /** Nỏ vai: a small crossbow riding the left shoulder, bolt loaded. */
  no_vai(a) {
    a.put('shoulder_l', 'steel', [
      part(rounded(0.05, 0.05, 0.34, 0.015, 1), STEEL_DARK, { pos: [-0.02, 0.17, -0.04] }),
      part(P.tube([[-0.19, 0.17, 0.02], [-0.1, 0.17, -0.13], [-0.02, 0.17, -0.17], [0.06, 0.17, -0.13], [0.15, 0.17, 0.02]], 0.022, 8, 5), LEATHER_DARK, { shade: 0 }),
      part(rounded(0.3, 0.008, 0.008, 0.003, 1), '#cfc6b8', { pos: [-0.02, 0.17, 0.02], shade: 0 }),
      part(cyl(0.011, 0.011, 0.3, 5), BRASS, { pos: [-0.02, 0.2, -0.06], rot: [HALF, 0, 0], shade: 0 }),
    ]);
  },
  /** Bánh lăn gót: a wheel behind each heel. */
  banh_lan(a) {
    a.both('heel', 'steel', [
      part(cyl(0.062, 0.062, 0.11, 10), STEEL_DARK, { pos: [0, -0.03, 0.045], rot: [0, 0, HALF] }),
      part(cyl(0.03, 0.03, 0.125, 6), BRASS, { pos: [0, -0.03, 0.045], rot: [0, 0, HALF], shade: 0 }),
      part(rounded(0.13, 0.03, 0.09, 0.01, 1), IRON, { pos: [0, 0.03, 0.02] }),
    ]);
  },
  /** Khiên tay: a round buckler strapped to the left forearm. */
  khien_tay(a) {
    a.put('forearm_l', 'steel', [
      part(cyl(0.2, 0.2, 0.035, 14), STEEL, { pos: [-0.115, 0.02, -0.02], rot: [0, 0, HALF] }),
      part(cyl(0.205, 0.205, 0.022, 14), STEEL_DARK, { pos: [-0.105, 0.02, -0.02], rot: [0, 0, HALF], shade: 0 }),
      part(cyl(0.06, 0.08, 0.06, 10), BRASS, { pos: [-0.145, 0.02, -0.02], rot: [0, 0, HALF], shade: 0 }),
      part(rounded(0.04, 0.05, 0.1, 0.012, 1), LEATHER_DARK, { pos: [-0.075, 0.02, -0.02], shade: 0 }),
    ]);
  },
  /** Bình nổ: three round bombs with fuses on a belt loop at the left hip. */
  binh_no(a) {
    a.put('hip', 'steel', [
      part(rounded(0.06, 0.07, 0.3, 0.02, 1), LEATHER_DARK, { pos: [-0.225, 0.05, 0.0], shade: 0 }),
      ...[-0.1, 0, 0.1].flatMap((z) => [
        part(P.blob(0.058, { detail: 1, amp: 0.02, freq: 1, seed: 3 }), '#9aa1a7', { pos: [-0.26, -0.03, z] }),
        part(cyl(0.01, 0.014, 0.05, 5), BRASS, { pos: [-0.26, 0.04, z], shade: 0 }),
      ]),
    ]);
  },
};
