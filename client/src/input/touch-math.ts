/** Pure touch math (no DOM) so the feel rules are unit-tested. */

/** Stick offset in px → [-1,1] vector. Radial dead zone, remapped so the edge of the zone is 0 and the rim is 1. */
export function stickVector(dx: number, dy: number, radius: number, deadzone: number): { x: number; y: number } {
  const len = Math.hypot(dx, dy) / radius;
  if (len <= deadzone) return { x: 0, y: 0 };
  const m = Math.min(1, (len - deadzone) / (1 - deadzone));
  const k = m / len;
  // screen y grows downward; forward is up
  return { x: (dx / radius) * k, y: (-dy / radius) * k };
}

/** Keep the knob inside the base ring. */
export function clampKnob(dx: number, dy: number, radius: number): { x: number; y: number } {
  const l = Math.hypot(dx, dy);
  return l > radius ? { x: (dx / l) * radius, y: (dy / l) * radius } : { x: dx, y: dy };
}

/** Finger drag in px → look radians (yaw right +, pitch up +). Dragging up looks up; invertY flips it. */
export function dragToLook(dxPx: number, dyPx: number, rad: number, sensX: number, sensY: number, invertY: boolean): { dx: number; dy: number } {
  return { dx: dxPx * rad * sensX, dy: -dyPx * rad * sensY * (invertY ? -1 : 1) };
}

export interface Disc { id: string; cx: number; cy: number; r: number }
/** First disc (listed in priority order) containing the point, with a hit slop in px. */
export function hitDisc(discs: readonly Disc[], x: number, y: number, slop: number): Disc | null {
  for (const d of discs) if (Math.hypot(x - d.cx, y - d.cy) <= d.r + slop) return d;
  return null;
}
