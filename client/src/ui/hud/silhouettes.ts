import type { Family } from '@wih/shared';

/** Flat one-color weapon silhouettes (24×24 viewBox, vertical, tip up). Drawn SVG, never emoji. Used by HUD, kill feed, armory. */
const PATH: Record<Family | 'phoi', string> = {
  phoi: 'M10.5 2h3v13h-3zM8 15h8v2.4H8zM10.5 17.4h3V22h-3z',
  kiem: 'M12 1l2.6 4.2V15h-5.2V5.2zM6.5 15h11v2.6h-11zM10.6 17.6h2.8V23h-2.8z',
  bua: 'M4 3h13v7H4zM17 5h3v3h-3zM10.4 10h2.8v13h-2.8z',
  thuong: 'M12 0.5l3.2 6.5h-6.4zM11 7h2v16h-2zM8.2 9.2l1.6 1.4-1.6 3.4z M15.8 9.2l-1.6 1.4 1.6 3.4z',
};
export function silhouette(family: Family | null, cls = ''): string {
  return `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="${PATH[family ?? 'phoi']}"/></svg>`;
}
