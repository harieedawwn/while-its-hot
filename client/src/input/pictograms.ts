import type { ControlId } from './touch-layout';

/**
 * Control pictograms (LOOK §8): one 24×24 grid, one 2 px stroke, square caps and miter joins, no fills, no text.
 * Shapes are kept to a few strokes so they stay crisp at 48 px on a phone.
 */
const P: Partial<Record<ControlId, string>> = {
  // a blade on the diagonal: outlined edge to the tip, crossguard, short grip
  attack: '<path d="M20 4l-1 5-8 8-3-3 8-8z"/><path d="M5 12l7 7M7.5 16.5 4 20"/>',
  // heater shield with a center rib
  parry: '<path d="M12 3l7 2.5V11c0 5-3 8-7 10-4-2-7-5-7-10V5.5z"/><path d="M12 7.5v9"/>',
  // up arrow off the ground line
  jump: '<path d="M12 16V5M7 10l5-5 5 5M4 20h16"/>',
  // low arrow skimming the ground, one speed streak
  slide: '<path d="M5 14h12M13 10l4 4-4 4M3 20h18M4 9h5"/>',
  // hammer head, helve, two sparks off the face
  forge: '<path d="M4 5h9v5H4zM8.5 10v10M16 5l3-2M16.5 9H21"/>',
  // anvil: horn, face, waist, foot
  anvil: '<path d="M3 7h15l3 1.5L18 11h-4v3l3 3v2H7v-2l3-3v-3H6L3 9z"/>',
  // two opposed arrows
  swap: '<path d="M4 8h14M14 4l4 4-4 4M20 16H6M10 12l-4 4 4 4"/>',
  pause: '<path d="M7 5h3v14H7zM14 5h3v14h-3z"/>',
  // ledger: frame, header rule, two rows, name column
  scoreboard: '<path d="M4 5h16v14H4zM4 9.5h16M4 14h16M10 9.5V19"/>',
};

const svg = (inner: string, cls = '') =>
  `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square" stroke-linejoin="miter">${inner}</svg>`;

/** SVG markup for a control's pictogram ("" for the stick, which draws its own base and knob). */
export function pictogram(id: ControlId): string { const d = P[id]; return d ? svg(d, 'pg') : ''; }

/** Stick base: outer ring with eight machined notches (the knob is a separate element). */
export function stickBase(): string {
  let ticks = '';
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4, c = Math.cos(a), s = Math.sin(a);
    ticks += `M${(50 + c * 40).toFixed(1)} ${(50 + s * 40).toFixed(1)}L${(50 + c * 46).toFixed(1)} ${(50 + s * 46).toFixed(1)}`;
  }
  return `<svg class="sb" viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-linecap="square"><circle cx="50" cy="50" r="31" stroke-width="1.5" opacity=".45"/><path d="${ticks}" stroke-width="3"/></svg>`;
}

/** Progress ring drawn over the bevel (cooldown / charge), empty by default. */
export function rimRing(): string {
  return '<svg class="rim" viewBox="0 0 100 100" fill="none"><circle cx="50" cy="50" r="46" pathLength="1" stroke-width="7" stroke-dasharray="0 1" transform="rotate(-90 50 50)"/></svg>';
}
