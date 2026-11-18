import type { ControlId } from './touch-layout';

/** Button pictograms: drawn SVG on a 24×24 grid, stroke only, no text, no emoji (LOOK §8). */
const P: Partial<Record<ControlId, string>> = {
  attack: '<path d="M12 2.5 14 14h-4zM7 14h10M12 14v6.5"/><path d="M10.5 20.5h3"/>',
  jump: '<path d="M12 20V5M6 11l6-6 6 6"/>',
  dash: '<path d="M4 8h5M2 12h8M4 16h5"/><path d="M12 6l6 6-6 6M17 6l5 6-5 6"/>',
  slide: '<path d="M3 8l14 6"/><path d="M12 19h9M17 15l4 4-4 4" transform="translate(0 -3)"/><path d="M3 20h10"/>',
  parry: '<path d="M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6z"/><path d="M12 7v10"/>',
  forge: '<path d="M4 9h11v4H4zM15 10h5M9.5 13v8"/><path d="M7 21h5"/>',
  anvil: '<path d="M3 8h18l-3 4h-4v3h3v3H7v-3h3v-3H6z"/>',
  swap: '<path d="M5 9a7 7 0 0 1 12-3M19 15a7 7 0 0 1-12 3"/><path d="M17 2v4h-4M7 22v-4h4"/>',
  pause: '<path d="M8 5v14M16 5v14"/>',
};

/** SVG markup for a control's pictogram ("" for the stick, which draws its own ring and knob). */
export function pictogram(id: ControlId): string {
  const d = P[id];
  return d ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square" stroke-linejoin="miter">${d}</svg>` : '';
}
