import { FEEL } from '../core/feel';

/** Touch layout model (TECH §5, LOOK §8): pure data + geometry, no DOM. Sizes are "design px" at a 360 px tall safe rect. */
export type ControlId = 'stick' | 'attack' | 'jump' | 'slide' | 'parry' | 'forge' | 'anvil' | 'swap' | 'pause' | 'scoreboard';
export const CONTROL_IDS: readonly ControlId[] = ['stick', 'attack', 'jump', 'slide', 'parry', 'forge', 'anvil', 'swap', 'pause', 'scoreboard'];
/** Forge and anvil only show when the game says so (contextual); the editor always shows them. */
export const CONTEXTUAL: readonly ControlId[] = ['forge', 'anvil'];

/** Center offset from the anchored safe-rect edges (ax: l|r, ay: t|b), size = diameter. */
export interface Ctl { ax: 'l' | 'r'; ay: 't' | 'b'; dx: number; dy: number; size: number; opacity: number }
export type Layout = Record<ControlId, Ctl>;
export interface Circle { cx: number; cy: number; r: number }
const T = FEEL.input.touch;

const clone = (l: Layout): Layout => JSON.parse(JSON.stringify(l)) as Layout;
export const cloneLayout = clone;
/** Left-handed copy: every control re-anchored to the opposite side edge. */
export function mirrorLayout(l: Layout): Layout { const o = clone(l); for (const id of CONTROL_IDS) o[id].ax = o[id].ax === 'l' ? 'r' : 'l'; return o; }

/** Design px → real px for a safe rect of this height (tablets scale up, phones stay 1:1). */
export function uiScale(safeH: number): number { return Math.min(T.scaleMax, Math.max(T.scaleMin, safeH / T.refHeight)); }

/** Diameter in real px, never under the 48 px touch minimum. */
export function realSize(id: ControlId, k: Ctl, u: number): number { return Math.max(id === 'stick' ? T.minStick : T.minButton, k.size * u); }

/** Disc in safe-rect coordinates (origin top-left). */
export function resolveCtl(id: ControlId, k: Ctl, w: number, h: number): Circle {
  const u = uiScale(h), r = realSize(id, k, u) / 2;
  const cx = k.ax === 'l' ? k.dx * u : w - k.dx * u;
  const cy = k.ay === 't' ? k.dy * u : h - k.dy * u;
  return { cx: Math.min(w - r, Math.max(r, cx)), cy: Math.min(h - r, Math.max(r, cy)), r };
}

/** Put a disc center at (x, y), re-anchoring to the nearest horizontal and vertical edge; optional design-px grid snap. */
export function placeCtl(id: ControlId, k: Ctl, x: number, y: number, w: number, h: number, grid = 0): Ctl {
  const u = uiScale(h), r = realSize(id, k, u) / 2;
  const cx = Math.min(w - r, Math.max(r, x)), cy = Math.min(h - r, Math.max(r, y));
  const ax = cx < w / 2 ? 'l' : 'r', ay = cy < h / 2 ? 't' : 'b';
  let dx = (ax === 'l' ? cx : w - cx) / u, dy = (ay === 't' ? cy : h - cy) / u;
  if (grid > 0) { dx = Math.round(dx / grid) * grid; dy = Math.round(dy / grid) * grid; }
  return { ...k, ax, ay, dx, dy };
}

export function clampCtl(id: ControlId, k: Ctl): Ctl {
  const lo = id === 'stick' ? T.minStick : T.minButton, hi = id === 'stick' ? T.maxStick : T.maxButton;
  return { ...k, size: Math.min(hi, Math.max(lo, k.size)), opacity: Math.min(T.maxOpacity, Math.max(T.minOpacity, k.opacity)) };
}

/** Pairs of controls whose discs overlap (the editor outlines them in --oxide). */
export function overlaps(l: Layout, w: number, h: number): [ControlId, ControlId][] {
  const out: [ControlId, ControlId][] = [];
  const d = CONTROL_IDS.map((id) => [id, resolveCtl(id, l[id], w, h)] as const);
  for (let i = 0; i < d.length; i++) for (let j = i + 1; j < d.length; j++) {
    const a = d[i]!, b = d[j]!;
    if (Math.hypot(a[1].cx - b[1].cx, a[1].cy - b[1].cy) < a[1].r + b[1].r) out.push([a[0], b[0]]);
  }
  return out;
}

/** Accept stored data only if every control is well-formed; anything else becomes the factory layout. */
export function sanitizeLayout(raw: unknown, fallback: Layout): Layout {
  if (!raw || typeof raw !== 'object') return clone(fallback);
  const r = raw as Record<string, Partial<Ctl> | undefined>;
  const out = clone(fallback);
  for (const id of CONTROL_IDS) {
    const k = r[id];
    if (!k || (k.ax !== 'l' && k.ax !== 'r') || (k.ay !== 't' && k.ay !== 'b')) continue;
    if (![k.dx, k.dy, k.size, k.opacity].every((n) => typeof n === 'number' && Number.isFinite(n))) continue;
    out[id] = clampCtl(id, k as Ctl);
  }
  return out;
}
