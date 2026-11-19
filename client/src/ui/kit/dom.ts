import { bus, type GameEvents } from '../../core/events';
import '../styles/fonts.css';
import '../styles/tokens.css';
import '../styles/components.css';

/** Tiny DOM helpers for the UI kit. Importing this module loads fonts, tokens and component CSS once. */
export function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}
export const stampNo = (i: number): string => String(i + 1).padStart(2, '0');
export const sfx = (id: GameEvents['ui:sound']['id']): void => bus.emit('ui:sound', { id });

/** The kit's full-screen layer inside a host; remove() takes everything with it. */
export function uiRoot(host: HTMLElement): HTMLDivElement {
  const r = el('div', 'k-root');
  host.appendChild(r);
  return r;
}

/** Wait until the UI fonts are usable (shots and first paint must not measure fallback fonts). */
export async function fontsReady(): Promise<void> {
  const f = document.fonts;
  if (!f) return;
  await Promise.all(['900 20px "Big Shoulders Display"', '800 20px "Big Shoulders Display"', '600 16px "Be Vietnam Pro"', '500 16px "Be Vietnam Pro"']
    .map((q) => f.load(q, 'ẤỮỖ Aa').catch(() => [])));
}

/** Pointer press with the 80 ms pressed state (LOOK §8); fires on release inside. */
export function onPress(e: HTMLElement, fn: (ev: PointerEvent | KeyboardEvent) => void, downCls = 'is-down'): void {
  e.addEventListener('pointerdown', () => { e.classList.add(downCls); });
  const up = () => setTimeout(() => e.classList.remove(downCls), 80);
  e.addEventListener('pointerup', (ev) => { up(); fn(ev); });
  e.addEventListener('pointerleave', up);
  e.addEventListener('pointercancel', up);
  e.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); fn(ev); } });
}
