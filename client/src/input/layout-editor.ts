import { FEEL } from '../core/feel';
import { STR } from '../ui/strings.vi';
import { SLOT_COUNT } from './layout-store';
import type { TouchControls } from './touch';
import { CONTROL_IDS, clampCtl, mirrorLayout, overlaps, placeCtl, resolveCtl, type ControlId, type Layout } from './touch-layout';
import { PRESET_IDS } from './touch-presets';

const T = FEEL.input.touch;
const CSS = `
.te{position:absolute;pointer-events:auto;display:flex;flex-direction:column;gap:4px;background:#1c1917;border:2px solid #3a3430;
  padding:4px;color:#e9e1d3;font:600 13px/1.35 'Be Vietnam Pro',system-ui,sans-serif;touch-action:manipulation;transition:opacity .12s linear}
.te.dragging{opacity:.3;pointer-events:none}
.te .row{display:flex;gap:4px;align-items:center}
.te .lab{color:#7f93a1;padding:0 2px 0 4px;font-size:12px}
.te .sep{width:2px;align-self:stretch;background:#3a3430;margin:0 2px}
.te button{min-width:48px;height:48px;padding:0 10px;background:#0d0b0a;color:#e9e1d3;border:2px solid #3a3430;font:inherit;border-radius:0;white-space:nowrap}
.te button.act{background:#f26a1b;color:#0d0b0a;border-color:#f26a1b}
.te button:active{transform:translateY(1px)}
.te label{display:flex;align-items:center;gap:6px;height:48px}
.te input[type=range]{width:96px;height:48px;accent-color:#f26a1b;margin:0}
`;
let injected = false;

type Dock = 'tc' | 'bc' | 'mc';

/**
 * Touch layout editor (TECH §5): drag, resize and fade every control (stick included), snap grid, reset one
 * control or all, factory presets 2/3/4 ngón loaded into one of 3 saved slots, mirror for left hands.
 * The panel docks where it covers the fewest controls and goes see-through while a control is dragged.
 * Resolves when closed.
 */
export function openLayoutEditor(touch: TouchControls): Promise<void> {
  if (!injected) { injected = true; const s = document.createElement('style'); s.textContent = CSS; document.head.appendChild(s); }
  const { store, view } = touch;
  touch.setEditing(true);
  let sel: ControlId | null = null;
  let grid = true;
  let layout: Layout = store.layout;

  const panel = document.createElement('div');
  panel.className = 'te';
  const rows = [0, 1, 2].map(() => { const r = document.createElement('div'); r.className = 'row'; panel.appendChild(r); return r; });
  const [row1, row2, row3] = rows as [HTMLDivElement, HTMLDivElement, HTMLDivElement];
  view.safe.appendChild(panel);

  const btn = (text: string, on: () => void) => {
    const b = document.createElement('button');
    b.textContent = text;
    b.addEventListener('click', on);
    return b;
  };
  const lab = (t: string) => { const s = document.createElement('span'); s.className = 'lab'; s.textContent = t; return s; };
  const sep = () => { const s = document.createElement('span'); s.className = 'sep'; return s; };

  const slots = Array.from({ length: SLOT_COUNT }, (_, i) => {
    const b = btn(String(i + 1), () => { store.select(i); sync(); });
    b.setAttribute('aria-label', STR.layout.slot(i + 1));
    return b;
  });
  const presets = PRESET_IDS.map((p) => btn(STR.layout.preset[p], () => { store.usePreset(p); sync(); }));
  row1.append(lab(STR.layout.slots), ...slots, sep(), lab(STR.layout.presets), ...presets);

  const gridBtn = btn(STR.layout.grid, () => { grid = !grid; gridBtn.classList.toggle('act', grid); });
  gridBtn.classList.toggle('act', grid);
  const mirrorBtn = btn(STR.layout.mirror, () => { layout = mirrorLayout(layout); commit(); dock(); });
  const resetBtn = btn(STR.layout.reset, () => { store.reset(); sync(); });
  let finish!: () => void;
  const done = new Promise<void>((r) => { finish = r; });
  const doneBtn = btn(STR.layout.done, () => close());
  row2.append(gridBtn, mirrorBtn, resetBtn, sep(), doneBtn);

  const slider = (label: string, min: number, max: number, step: number, on: (v: number) => void) => {
    const l = document.createElement('label');
    const i = document.createElement('input');
    i.type = 'range'; i.min = String(min); i.max = String(max); i.step = String(step);
    i.addEventListener('input', () => on(Number(i.value)));
    l.append(label, i);
    return { l, i };
  };
  const size = slider(STR.layout.size, T.minButton, T.maxButton, 2, (v) => edit((k) => ({ ...k, size: v })));
  const opac = slider(STR.layout.opacity, T.minOpacity, T.maxOpacity, 0.05, (v) => edit((k) => ({ ...k, opacity: v })));
  const oneBtn = btn(STR.layout.resetOne, () => { if (sel) { store.reset(sel); sync(); } });
  row3.append(size.l, opac.l, oneBtn);

  function edit(f: (k: Layout[ControlId]) => Layout[ControlId]): void {
    if (!sel) return;
    const id = sel;
    layout = { ...layout, [id]: clampCtl(id, f(layout[id])) };
    commit();
  }
  function commit(): void { store.update(layout); touch.relayout(); mark(); }
  function sync(): void {
    layout = store.layout;
    slots.forEach((b, i) => b.classList.toggle('act', i === store.active));
    presets.forEach((b, i) => b.classList.toggle('act', PRESET_IDS[i] === store.base));
    touch.relayout();
    pick(sel);
  }
  function mark(): void {
    const { w, h } = view.rect();
    const bad = new Set<ControlId>();
    for (const [a, b] of overlaps(layout, w, h)) { bad.add(a); bad.add(b); }
    for (const id of CONTROL_IDS) { view.els[id].classList.toggle('bad', bad.has(id)); view.els[id].classList.toggle('sel', id === sel); }
  }
  function pick(id: ControlId | null): void {
    sel = id;
    row3.style.display = id ? 'flex' : 'none';
    if (id) {
      const k = layout[id];
      size.i.min = String(id === 'stick' ? T.minStick : T.minButton);
      size.i.max = String(id === 'stick' ? T.maxStick : T.maxButton);
      size.i.value = String(k.size);
      opac.i.value = String(k.opacity);
    }
    mark();
    dock();
  }

  /** Put the panel where it covers the least control area: top, bottom or middle, centered. */
  function dock(): void {
    const { w, h } = view.rect(), pw = panel.offsetWidth, ph = panel.offsetHeight;
    const at: Record<Dock, number> = { tc: 6, bc: h - ph - 6, mc: (h - ph) / 2 };
    const x0 = Math.max(0, (w - pw) / 2);
    let best: Dock = 'tc', bestA = Infinity;
    for (const d of ['tc', 'bc', 'mc'] as Dock[]) {
      let a = 0;
      for (const id of CONTROL_IDS) {
        const c = resolveCtl(id, layout[id], w, h);
        const ox = Math.max(0, Math.min(x0 + pw, c.cx + c.r) - Math.max(x0, c.cx - c.r));
        const oy = Math.max(0, Math.min(at[d] + ph, c.cy + c.r) - Math.max(at[d], c.cy - c.r));
        a += ox * oy;
      }
      if (a < bestA - 1) { best = d; bestA = a; }
    }
    panel.style.left = `${x0}px`;
    panel.style.top = `${at[best]}px`;
  }

  // drag any control (stick base too); a plain tap selects it
  const cleanups: (() => void)[] = [];
  for (const id of CONTROL_IDS) {
    const el = view.els[id];
    let drag: { dx: number; dy: number } | null = null;
    const down = (e: PointerEvent) => {
      el.setPointerCapture(e.pointerId);
      const { w, h } = view.rect(), c = resolveCtl(id, layout[id], w, h), p = local(e);
      drag = { dx: p.x - c.cx, dy: p.y - c.cy };
      pick(id);
    };
    const move = (e: PointerEvent) => {
      if (!drag) return;
      const { w, h } = view.rect(), p = local(e);
      panel.classList.add('dragging');
      layout = { ...layout, [id]: placeCtl(id, layout[id], p.x - drag.dx, p.y - drag.dy, w, h, grid ? T.grid : 0) };
      commit();
    };
    const up = () => { if (drag && panel.classList.contains('dragging')) { panel.classList.remove('dragging'); dock(); } drag = null; };
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    cleanups.push(() => { el.removeEventListener('pointerdown', down); el.removeEventListener('pointermove', move); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up); });
  }
  const local = (e: PointerEvent) => { const r = view.safe.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  addEventListener('resize', dock);

  function close(): void {
    cleanups.forEach((f) => f());
    removeEventListener('resize', dock);
    panel.remove();
    for (const id of CONTROL_IDS) view.els[id].classList.remove('sel', 'bad');
    touch.setEditing(false);
    touch.relayout();
    finish();
  }
  sync();
  return done;
}
