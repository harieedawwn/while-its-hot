/**
 * Modal choices (card draft, +3 family pick, match end): while any is open the touch control layer
 * stops catching pointers (CSS `.modal-open .tc`) and lets go of fingers it already holds.
 */
const open = new Set<string>();
export const MODAL_EVENT = 'wih:modal';

export function setModal(key: string, on: boolean): void {
  const was = open.size > 0;
  if (on) open.add(key); else open.delete(key);
  const now = open.size > 0;
  if (was === now) return;
  document.documentElement.classList.toggle('modal-open', now);
  window.dispatchEvent(new Event(MODAL_EVENT));
}
export const modalOpen = (): boolean => open.size > 0;
