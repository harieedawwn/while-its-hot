import { FEEL } from '../core/feel';

/** "Độ sáng" (0..100) -> the two shader knobs. 0 = the original look (both 0). Mirrors post.ts / psx-glsl.ts for the unit test. */
export function brightnessParams(b: number): { floor: number; gamma: number } {
  const k = Math.min(1, Math.max(0, b / 100)), B = FEEL.render.brightness;
  return { floor: B.floor * k, gamma: B.gamma * k };
}
/** Vertex light floor: lifts dark values toward 1, leaves 1 alone. */
export const liftLight = (l: number, floor: number): number => l + floor * (1 - Math.min(l, 1));
/** Post gamma lift on an sRGB channel; heat-ramp pixels (`hot`) bypass it. */
export const liftSrgb = (c: number, gamma: number, hot = false): number => (hot || gamma <= 0 ? c : Math.pow(c, 1 / (1 + gamma)));
