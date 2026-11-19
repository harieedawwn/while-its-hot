import { pictogram, rimRing, stickBase } from './pictograms';
import { TOUCH_CSS } from './touch-css';
import { CONTROL_IDS, resolveCtl, type Circle, type ControlId, type Layout } from './touch-layout';
import type { RimTone } from './touch-rims';

let injected = false;

export interface View {
  /** Full-screen element that receives the pointers. */
  capture: HTMLElement;
  safe: HTMLElement;
  els: Record<ControlId, HTMLElement>;
  knob: HTMLElement;
  /** Safe-rect size in px and its offset inside the capture layer. */
  rect(): { x: number; y: number; w: number; h: number };
  /** Reposition and resize every control from the layout. */
  apply(layout: Layout): Record<ControlId, Circle>;
  /** Cooldown / charge arc on a button rim, v in [0,1] (0 hides it). */
  rim(id: ControlId, v: number, tone: RimTone): void;
  dispose(): void;
}

/** The DOM of the touch layer: capture surface, safe-rect container, one machined disc per control. */
export function createView(host: HTMLElement): View {
  if (!injected) { injected = true; const s = document.createElement('style'); s.textContent = TOUCH_CSS; document.head.appendChild(s); }
  const capture = document.createElement('div');
  capture.className = 'tc';
  const safe = document.createElement('div');
  safe.className = 'tc-safe';
  capture.appendChild(safe);
  const els = {} as Record<ControlId, HTMLElement>;
  const rims = new Map<ControlId, SVGCircleElement>();
  for (const id of CONTROL_IDS) {
    const el = document.createElement('div');
    el.className = 'tb' + (id === 'stick' ? ' stick' : '');
    el.dataset.id = id;
    el.innerHTML = `<div class="face">${id === 'stick' ? stickBase() : pictogram(id)}</div>${id === 'stick' ? '' : rimRing()}`;
    const c = el.querySelector('.rim circle');
    if (c) rims.set(id, c as SVGCircleElement);
    els[id] = el;
    safe.appendChild(el);
  }
  const knob = document.createElement('div');
  knob.className = 'knob';
  els.stick.appendChild(knob);
  host.appendChild(capture);
  const rect = () => {
    const a = capture.getBoundingClientRect(), b = safe.getBoundingClientRect();
    return { x: b.left - a.left, y: b.top - a.top, w: b.width, h: b.height };
  };
  return {
    capture, safe, els, knob, rect,
    apply(layout) {
      const { w, h } = rect();
      const out = {} as Record<ControlId, Circle>;
      for (const id of CONTROL_IDS) {
        const k = layout[id], c = resolveCtl(id, k, w, h);
        out[id] = c;
        const el = els[id];
        el.style.width = el.style.height = `${c.r * 2}px`;
        el.style.transform = `translate(${c.cx - c.r}px,${c.cy - c.r}px)`;
        el.style.opacity = String(k.opacity);
      }
      return out;
    },
    rim(id, v, tone) {
      const c = rims.get(id), el = els[id];
      if (!c) return;
      const u = Math.max(0, Math.min(1, v));
      c.setAttribute('stroke-dasharray', `${u.toFixed(3)} 1`);
      el.classList.toggle('rim-charge', tone === 'charge');
      el.classList.toggle('rim-full', tone === 'full');
    },
    dispose() { capture.remove(); },
  };
}
