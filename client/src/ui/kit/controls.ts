import { el, onPress, sfx, stampNo } from './dom';

/** Stamped button: chamfered plate, display caps, iron-hot for 80 ms when pressed. */
export function stampedButton(label: string, fn: () => void, cls = ''): HTMLButtonElement {
  const b = el('button', `k-btn k-plate ${cls}`.trim(), label);
  b.type = 'button';
  onPress(b, () => { sfx('tap'); fn(); });
  return b;
}

export interface Ledger { root: HTMLDivElement; row(label: string, control: HTMLElement): HTMLDivElement }
/** Two-column ledger with stamped row numbers (01, 02 …) and thick rules. */
export function ledger(): Ledger {
  const root = el('div', 'k-ledger');
  let n = 0;
  return {
    root,
    row(label, control) {
      const r = el('div', 'k-row');
      r.append(el('span', 'k-n', stampNo(n++)), el('span', 'k-l', label), control);
      root.appendChild(r);
      return r;
    },
  };
}

export interface Slider { root: HTMLDivElement; set(v: number): void; readonly value: number }
/**
 * Notched steel slider: integer steps 0..steps, a notch per step, square thumb, a detent sound per notch.
 * `fmt` renders the stamped value; `onChange` fires live while dragging.
 */
export function notchedSlider(label: string, steps: number, value: number, onChange: (v: number) => void, fmt = (v: number) => String(v)): Slider {
  const root = el('div', 'k-slider');
  root.tabIndex = 0;
  root.setAttribute('role', 'slider');
  root.setAttribute('aria-label', label);
  root.setAttribute('aria-valuemin', '0');
  root.setAttribute('aria-valuemax', String(steps));
  const track = el('div', 'k-track'), fill = el('div', 'k-fill'), thumb = el('div', 'k-thumb'), out = el('span', 'k-v');
  const notches: HTMLDivElement[] = [];
  for (let i = 0; i <= steps; i++) {
    const nt = el('div', 'k-notch');
    nt.style.left = `${(i / steps) * 100}%`;
    notches.push(nt);
    track.appendChild(nt);
  }
  track.append(fill, thumb);
  root.append(track, out);
  let v = -1;
  const set = (nv: number, user: boolean) => {
    nv = Math.max(0, Math.min(steps, Math.round(nv)));
    if (nv === v) return;
    v = nv;
    const k = `${(v / steps) * 100}%`;
    fill.style.width = k; thumb.style.left = k;
    notches.forEach((n, i) => n.classList.toggle('is-pass', i <= v));
    out.textContent = fmt(v);
    root.setAttribute('aria-valuenow', String(v));
    if (user) { sfx('notch'); onChange(v); }
  };
  set(value, false);
  const at = (x: number) => { const r = track.getBoundingClientRect(); set(((x - r.left) / Math.max(1, r.width)) * steps, true); };
  root.addEventListener('pointerdown', (e) => { root.setPointerCapture(e.pointerId); root.classList.add('is-drag'); at(e.clientX); });
  root.addEventListener('pointermove', (e) => { if (root.hasPointerCapture(e.pointerId)) at(e.clientX); });
  const end = () => root.classList.remove('is-drag');
  root.addEventListener('pointerup', end);
  root.addEventListener('pointercancel', end);
  root.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); set(v - 1, true); }
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); set(v + 1, true); }
  });
  return { root, set: (n) => set(n, false), get value() { return v; } };
}

export interface Segmented<T extends string> { root: HTMLDivElement; set(v: T): void }
/** Segmented toggle: one stamped cell per option, the active one solid iron-hot. */
export function segmented<T extends string>(label: string, opts: readonly { id: T; label: string }[], value: T, onChange: (v: T) => void): Segmented<T> {
  const root = el('div', 'k-seg');
  root.setAttribute('role', 'radiogroup');
  root.setAttribute('aria-label', label);
  const cells = opts.map((o) => {
    const b = el('button', '', o.label);
    b.type = 'button';
    b.setAttribute('role', 'radio');
    onPress(b, () => { if (b.getAttribute('aria-checked') === 'true') return; sfx('toggle'); mark(o.id); onChange(o.id); });
    root.appendChild(b);
    return b;
  });
  const mark = (v: T) => cells.forEach((c, i) => c.setAttribute('aria-checked', String(opts[i].id === v)));
  mark(value);
  return { root, set: mark };
}
