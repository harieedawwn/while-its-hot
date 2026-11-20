import type { CardIcon } from '@wih/shared';

/**
 * Card pictograms (ROUND3 §5): the touch pictogram grid — 24×24, one 2 px stroke, square caps, miter joins, no fills, no text.
 * A few strokes each so they stay crisp at 64 px on a phone.
 */
const I: Record<CardIcon, string> = {
  anvil: '<path d="M3 7h15l3 1.5L18 11h-4v3l3 3v2H7v-2l3-3v-3H6L3 9z"/>',
  kiem: '<path d="M20 4l-1 5-8 8-3-3 8-8z"/><path d="M5 12l7 7M7.5 16.5 4 20"/>',
  bua: '<path d="M4 5h9v5H4zM8.5 10v10M16 5l3-2M16.5 9H21"/>',
  dao: '<path d="M18 4c-5 1-9 5-11 12l3 1c4-1 7-6 8-13z"/><path d="M7 16l-3 4"/>',
  tay: '<path d="M6 10h11v8H6zM6 10V6h3v4M9 10V5h3v5M12 10V6h3v4M17 12h3v3h-3"/>',
  heart: '<path d="M12 20 4 12V7l3-2 5 3 5-3 3 2v5z"/>',
  foot: '<path d="M4 20h14l3-3v-3l-6-1-3-5H8l1 6-5 2z"/>',
  lungs: '<path d="M12 4v9M12 13c-1 3-3 6-6 6-2 0-2-3-2-6s2-6 4-6 4 3 4 6zM12 13c1 3 3 6 6 6 2 0 2-3 2-6s-2-6-4-6-4 3-4 6z"/>',
  pulse: '<path d="M2 12h5l2-6 3 12 3-9 2 3h5"/>',
  skin: '<path d="M12 3c1 4 6 6 6 12a6 6 0 0 1-12 0c0-3 2-4 3-6 1 2 1 3 2 3 1-2 1-5 1-9z"/><path d="M9 21h6"/>',
  ghost: '<path d="M5 20V10a7 7 0 0 1 14 0v10l-3.5-3L12 20l-3.5-3z"/><path d="M9 10h2v2H9zM13 10h2v2h-2z"/>',
  fang: '<path d="M4 5h16v4l-3 3-2 6-3-5-3 5-2-6-3-3z"/>',
  fist: '<path d="M5 11h13v7H5zM5 11V8h3v3M8 11V7h3v4M11 11V8h3v3M18 13h3v3h-3"/><path d="M8 18v3M15 18v3"/>',
  shield: '<path d="M12 3l7 2.5V11c0 5-3 8-7 10-4-2-7-5-7-10V5.5z"/><path d="M12 7.5v9"/>',
  spring: '<path d="M7 21h10M7 17l10-3M7 13l10-3M7 9l10-3M12 3v3"/>',
  wing: '<path d="M4 18c0-6 5-12 16-13-1 7-5 13-12 13zM4 18l9-8"/>',
  wheel: '<path d="M12 3l8 5v8l-8 5-8-5V8z"/><path d="M12 9h0v6M9 12h6"/>',
  gun: '<path d="M3 9h12l2-2h4v4h-4l-1 3H9l-1 5H5V9"/>',
  bow: '<path d="M6 4c8 2 12 6 14 14M6 4v0M6 4l14 14M3 21l6-6"/>',
  arm: '<path d="M6 4h12v6c0 6-3 9-6 11-3-2-6-5-6-11z"/><path d="M6 10h12"/>',
  bomb: '<path d="M10 9a7 7 0 1 0 0 0zM14 7l3-3h3M18 3l3 3"/>',
  plate: '<path d="M5 5h14v6l-3 2v6H8v-6l-3-2z"/><path d="M12 5v14"/>',
};
export function cardIcon(id: CardIcon): string {
  return `<svg class="cd-pg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square" stroke-linejoin="miter">${I[id]}</svg>`;
}
