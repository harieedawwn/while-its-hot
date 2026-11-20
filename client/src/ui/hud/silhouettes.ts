import type { Family } from '@wih/shared';

/** Flat one-color weapon silhouettes (24×24 viewBox, vertical, tip up). Drawn SVG, never emoji. Used by HUD, kill feed, armory. */
const PATH: Record<Family | 'phoi', string> = {
  phoi: 'M10.5 2h3v13h-3zM8 15h8v2.4H8zM10.5 17.4h3V22h-3z',
  kiem: 'M12 1l2.6 4.2V15h-5.2V5.2zM6.5 15h11v2.6h-11zM10.6 17.6h2.8V23h-2.8z',
  bua: 'M4 3h13v7H4zM17 5h3v3h-3zM10.4 10h2.8v13h-2.8z',
  // short knife: wide flat blade with a clipped point, a stub guard, a cord grip with a ring
  dao: 'M11 3.5l3.5 3.2V14H10V5zM8 14h8v2.2H8zM10.6 16.2h2.8v4.4h-2.8zM10 20.6h4V23h-4z',
  // gauntlet seen from the back of the hand: four knuckle plates over a flared cuff
  tay: 'M6 4h2.8v5H6zM9.2 3h2.8v6H9.2zM12.4 3h2.8v6h-2.8zM15.6 4h2.8v5h-2.8zM6 9.6h12.4v5.2L16.6 17H7.8L6 14.8zM7.4 17.6h9.6l1.4 5.4H6z',
};
export function silhouette(family: Family | null, cls = ''): string {
  return `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="${PATH[family ?? 'phoi']}"/></svg>`;
}
