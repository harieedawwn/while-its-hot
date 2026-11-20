import { describe, expect, it } from 'vitest';
import { sanitizeControls } from './controls-settings';
import { padAxis } from './gamepad';
import { gyroLook } from './gyro';
import { CONTROL_IDS, mirrorLayout, overlaps, placeCtl, realSize, resolveCtl, sanitizeLayout, uiScale } from './touch-layout';
import { DEFAULT_LAYOUT, PRESETS, PRESET_IDS } from './touch-presets';
import { clampKnob, dragToLook, hitDisc, stickVector } from './touch-math';

/** Safe rects of the shot devices (px): 16:9, 20:9, 21:9 phones minus a 48 px cutout side, and a 4:3 tablet. */
const SAFE = [[640, 360], [800, 360], [840, 360], [780, 360], [1024, 768], [736, 360]] as const;

describe('touch layout', () => {
  it('no preset overlaps anywhere, and every control is at least 48 px', () => {
    for (const pi of PRESET_IDS) for (const p of [PRESETS[pi], mirrorLayout(PRESETS[pi])]) for (const [w, h] of SAFE) {
      expect(overlaps(p, w, h), `preset ${pi} @${w}x${h}`).toEqual([]);
      for (const id of CONTROL_IDS) expect(realSize(id, p[id], uiScale(h))).toBeGreaterThanOrEqual(48);
    }
  });
  it('every disc stays inside the safe rect', () => {
    for (const p of PRESET_IDS.map((i) => PRESETS[i])) for (const [w, h] of SAFE) for (const id of CONTROL_IDS) {
      const c = resolveCtl(id, p[id], w, h);
      expect(c.cx - c.r).toBeGreaterThanOrEqual(0); expect(c.cx + c.r).toBeLessThanOrEqual(w);
      expect(c.cy - c.r).toBeGreaterThanOrEqual(0); expect(c.cy + c.r).toBeLessThanOrEqual(h);
    }
  });
  it('claw presets put Nhảy/Trượt/Đánh in the top corners', () => {
    for (const p of [PRESETS.four]) for (const id of ['jump', 'slide', 'attack'] as const) expect(resolveCtl(id, p[id], 800, 360).cy).toBeLessThan(120);
    expect(resolveCtl('attack', PRESETS.three.attack, 800, 360).cy).toBeLessThan(120);
  });
  it('mirrored layout puts the stick on the right', () => {
    const c = resolveCtl('stick', mirrorLayout(DEFAULT_LAYOUT).stick, 800, 360), d = resolveCtl('stick', DEFAULT_LAYOUT.stick, 800, 360);
    expect(c.cx).toBeCloseTo(800 - d.cx, 5);
  });
  it('placeCtl re-anchors to the nearest edge and snaps to the grid', () => {
    const k = placeCtl('jump', DEFAULT_LAYOUT.jump, 100, 90, 800, 360, 8);
    expect(k.ax).toBe('l'); expect(k.ay).toBe('t');
    expect(k.dx % 8).toBe(0); expect(k.dy % 8).toBe(0);
    const c = resolveCtl('jump', k, 800, 360);
    expect(Math.abs(c.cx - 100)).toBeLessThanOrEqual(8); expect(Math.abs(c.cy - 90)).toBeLessThanOrEqual(8);
  });
  it('placeCtl never leaves the safe rect', () => {
    const k = placeCtl('attack', DEFAULT_LAYOUT.attack, 9999, -50, 800, 360);
    const c = resolveCtl('attack', k, 800, 360);
    expect(c.cx + c.r).toBeLessThanOrEqual(800); expect(c.cy - c.r).toBeGreaterThanOrEqual(0);
  });
  it('overlaps reports two stacked buttons', () => {
    const l = { ...DEFAULT_LAYOUT, jump: { ...DEFAULT_LAYOUT.attack } };
    expect(overlaps(l, 800, 360).some(([a, b]) => a === 'attack' && b === 'jump')).toBe(true);
  });
  it('sanitizeLayout survives garbage and clamps size', () => {
    expect(sanitizeLayout('x', DEFAULT_LAYOUT)).toEqual(DEFAULT_LAYOUT);
    const l = sanitizeLayout({ jump: { ax: 'l', ay: 't', dx: 10, dy: 10, size: 5, opacity: 9 }, pause: { ax: 'q' } }, DEFAULT_LAYOUT);
    expect(l.jump.size).toBe(48); expect(l.jump.opacity).toBe(1);
    expect(l.pause).toEqual(DEFAULT_LAYOUT.pause);
  });
});

describe('touch math', () => {
  it('stick: dead zone, full rim, forward is up the screen', () => {
    expect(stickVector(3, 3, 60, 0.12)).toEqual({ x: 0, y: 0 });
    const v = stickVector(0, -60, 60, 0.12);
    expect(v.x).toBeCloseTo(0); expect(v.y).toBeCloseTo(1);
    expect(stickVector(500, 0, 60, 0.12).x).toBeCloseTo(1);
    const mid = stickVector(30, 0, 60, 0.12).x;
    expect(mid).toBeGreaterThan(0.3); expect(mid).toBeLessThan(0.5);
  });
  it('stick vector length never exceeds 1', () => {
    const v = stickVector(400, -300, 60, 0.2);
    expect(Math.hypot(v.x, v.y)).toBeLessThanOrEqual(1.0000001);
  });
  it('knob stays on the ring', () => { const k = clampKnob(300, 400, 60); expect(Math.hypot(k.x, k.y)).toBeCloseTo(60); });
  it('drag right turns right, drag up looks up, invert flips pitch only', () => {
    const a = dragToLook(10, -10, 0.004, 1, 1, false);
    expect(a.dx).toBeGreaterThan(0); expect(a.dy).toBeGreaterThan(0);
    const b = dragToLook(10, -10, 0.004, 1, 1, true);
    expect(b.dx).toBe(a.dx); expect(b.dy).toBe(-a.dy);
    expect(dragToLook(10, 10, 0.004, 2, 0.5, false).dx).toBeCloseTo(0.08);
  });
  it('hitDisc picks the first listed disc and honours the slop', () => {
    const d = [{ id: 'a', cx: 0, cy: 0, r: 20 }, { id: 'b', cx: 10, cy: 0, r: 20 }];
    expect(hitDisc(d, 5, 0, 0)?.id).toBe('a');
    expect(hitDisc(d, 100, 0, 0)).toBeNull();
    expect(hitDisc(d, 0, 26, 8)?.id).toBe('a');
  });
});

describe('gyro, gamepad, settings', () => {
  it('gyro: opposite landscape angles mirror the result; invert flips pitch', () => {
    const a = gyroLook(30, 10, 90, 0.016, 1, false), b = gyroLook(30, 10, 270, 0.016, 1, false);
    expect(a.dx).toBeCloseTo(-b.dx); expect(a.dy).toBeCloseTo(-b.dy);
    expect(gyroLook(30, 10, 90, 0.016, 1, true).dy).toBeCloseTo(-a.dy);
    expect(gyroLook(30, 0, 90, 0.016, 2, false).dx).toBeCloseTo(a.dx * 2);
  });
  it('gyro: a hard flick is capped', () => {
    expect(Math.abs(gyroLook(9999, 0, 90, 0.016, 1, false).dx)).toBeCloseTo((360 * Math.PI / 180) * 0.016);
  });
  it('gamepad axis: dead zone, rim = 1, curve softens the middle', () => {
    expect(padAxis(0.1, 0.1, 0.15, 1)).toEqual({ x: 0, y: 0 });
    expect(padAxis(1, 0, 0.15, 1.6).x).toBeCloseTo(1);
    expect(padAxis(0.5, 0, 0.15, 1.6).x).toBeLessThan(padAxis(0.5, 0, 0.15, 1).x);
  });
  it('control settings clamp and default', () => {
    const s = sanitizeControls({ sensX: 99, sensY: -3, invertY: 'yes', deadzone: 0.2 });
    expect(s.sensX).toBe(6); expect(s.sensY).toBe(0.3); expect(s.invertY).toBe(false); expect(s.deadzone).toBe(0.2);
    expect(sanitizeControls(null).haptics).toBe(true);
  });
});
