import { pictogram } from './pictograms';
import { CONTROL_IDS, resolveCtl, type Circle, type ControlId, type Layout } from './touch-layout';

const CSS = `
.tc{position:absolute;inset:0;touch-action:none;-webkit-user-select:none;user-select:none;z-index:5}
.tc-safe{position:absolute;pointer-events:none;
  left:max(env(safe-area-inset-left),var(--cut-l,0px));right:max(env(safe-area-inset-right),var(--cut-r,0px));
  top:max(env(safe-area-inset-top),var(--cut-t,0px));bottom:max(env(safe-area-inset-bottom),var(--cut-b,0px))}
.tb{position:absolute;left:0;top:0;box-sizing:border-box;border-radius:50%;background:#1c1917b8;border:2px solid #e9e1d3;
  color:#e9e1d3;display:flex;align-items:center;justify-content:center;pointer-events:none}
.tb svg{width:56%;height:56%}
.tb.on{background:#f26a1b;color:#0d0b0a}
.tb.off{display:none}
.tb.stick{background:#1c1917a0;border-width:2px}
.tb .knob{position:absolute;left:50%;top:50%;width:42%;height:42%;margin:-21% 0 0 -21%;border-radius:50%;background:#e9e1d3c8;border:2px solid #0d0b0a}
.tc.edit{pointer-events:none}
.modal-open .tc{pointer-events:none;visibility:hidden}
.tc.edit .tb{pointer-events:auto;cursor:grab;touch-action:none}
.tc.edit .tb{outline:2px dashed #7f93a1;outline-offset:3px}
.tc.edit .tb.sel{border-color:#f26a1b;border-width:3px}
.tc.edit .tb.bad{border-color:#b3261e}
`;
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
  dispose(): void;
}

/** The DOM of the touch layer: capture surface, safe-rect container, one disc per control. */
export function createView(host: HTMLElement): View {
  if (!injected) { injected = true; const s = document.createElement('style'); s.textContent = CSS; document.head.appendChild(s); }
  const capture = document.createElement('div');
  capture.className = 'tc';
  const safe = document.createElement('div');
  safe.className = 'tc-safe';
  capture.appendChild(safe);
  const els = {} as Record<ControlId, HTMLElement>;
  for (const id of CONTROL_IDS) {
    const el = document.createElement('div');
    el.className = 'tb' + (id === 'stick' ? ' stick' : '');
    el.dataset.id = id;
    el.innerHTML = pictogram(id);
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
    dispose() { capture.remove(); },
  };
}
