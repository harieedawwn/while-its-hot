import { describe, expect, it } from 'vitest';
import { Actions } from './actions';
import type { ControlId } from './touch-layout';
import { PointerRouter, type RouterEnv } from './touch-router';

/** 800×360 safe rect: stick bottom-left, Đánh and Đỡ bottom-right, Nhảy top-left (claw index finger). */
function rig(fixed = false) {
  const a = new Actions();
  const log: string[] = [];
  const buttons = [
    { id: 'attack', cx: 720, cy: 280, r: 44 },
    { id: 'parry', cx: 620, cy: 300, r: 30 },
    { id: 'jump', cx: 64, cy: 72, r: 38 },
  ];
  const env: RouterEnv = {
    buttons: () => buttons, stick: () => ({ cx: 110, cy: 260, r: 64 }), width: () => 800, height: () => 360,
    cfg: () => ({ stickFixed: fixed, deadzone: 0.1, sensX: 1, sensY: 1, invertY: false }),
    tune: { hitSlop: 8, slideOff: 1.25, fixedZone: 1.4, floatingZone: 0.5, lookSens: 0.004 },
    onPress: (id: ControlId, on: boolean) => log.push(`${id}:${on ? 'down' : 'up'}`),
    onStick: () => {},
  };
  return { a, r: new PointerRouter(a, env), log };
}

describe('pointer ownership', () => {
  it('4 fingers at once: stick, Nhảy, Đánh charge, and a free look finger, each keeps its role', () => {
    const { a, r } = rig();
    expect(r.down(1, 120, 250).k).toBe('stick');       // left thumb
    expect(r.down(2, 64, 72).k).toBe('button');        // left index on Nhảy
    expect(r.down(3, 720, 280).k).toBe('button');      // right index holds Đánh
    expect(r.down(4, 500, 180).k).toBe('look');        // right thumb looks
    r.move(1, 120, 200);
    r.move(4, 540, 160);
    expect(a.move.y).toBeGreaterThan(0.5);
    const l = a.takeLook();
    expect(l.dx).toBeGreaterThan(0); expect(l.dy).toBeGreaterThan(0);
    expect(a.isHeld('jump') && a.isHeld('attack')).toBe(true);
    r.up(2);
    expect(a.isHeld('jump')).toBe(false); expect(a.isHeld('attack')).toBe(true);
    expect(a.move.y).toBeGreaterThan(0.5);              // stick unaffected by other fingers lifting
    r.up(1);
    expect(a.move.x).toBe(0); expect(a.move.y).toBe(0);
    r.up(3); r.up(4);
    expect(r.roles.size).toBe(0); expect(a.isHeld('attack')).toBe(false);
  });
  it('a second finger in the stick zone looks instead of stealing the stick', () => {
    const { r } = rig();
    r.down(1, 100, 250);
    expect(r.down(2, 200, 200).k).toBe('look');
    r.up(1);
    expect(r.down(3, 150, 250).k).toBe('stick');
  });
  it('a button finger keeps holding while it slides off into looking', () => {
    const { a, r } = rig();
    r.down(5, 620, 300);
    r.move(5, 625, 302);
    expect(a.takeLook()).toEqual({ dx: 0, dy: 0 });
    r.move(5, 560, 300); r.move(5, 500, 300);
    expect(a.takeLook().dx).toBeLessThan(0);
    expect(a.isHeld('parry')).toBe(true);
    r.up(5);
    expect(a.isHeld('parry')).toBe(false);
  });
  it('two fingers on one button release it only when both lift', () => {
    const { a, r, log } = rig();
    r.down(1, 720, 280); r.down(2, 730, 290);
    r.up(1);
    expect(a.isHeld('attack')).toBe(true);
    r.up(2);
    expect(a.isHeld('attack')).toBe(false);
    expect(log).toEqual(['attack:down', 'attack:up']);
  });
  it('fixed stick only answers near its base; releaseAll lifts everything', () => {
    const { a, r } = rig(true);
    expect(r.down(1, 300, 200).k).toBe('look');
    expect(r.down(2, 110, 250).k).toBe('stick');
    r.down(3, 720, 280);
    r.releaseAll();
    expect(r.roles.size).toBe(0); expect(a.isHeld('attack')).toBe(false); expect(a.move.y).toBe(0);
  });
});
