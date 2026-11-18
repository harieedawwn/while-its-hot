import { FEEL } from '../core/feel';
import { STR } from '../ui/strings.vi';
import type { TouchControls } from './touch';
import { CONTROL_IDS, PRESETS, clampCtl, overlaps, placeCtl, resolveCtl, type ControlId, type Layout } from './touch-layout';

const T = FEEL.input.touch;
const CSS = `
.te{position:absolute;left:50%;top:6px;transform:translateX(-50%);pointer-events:auto;display:flex;flex-direction:column;gap:4px;
  background:#1c1917;border:2px solid #3a3430;padding:4px;color:#e9e1d3;font:600 13px/1.3 system-ui,sans-serif;touch-action:manipulation}
.te .row{display:flex;gap:4px;align-items:center}
.te button{min-width:48px;height:48px;padding:0 10px;background:#0d0b0a;color:#e9e1d3;border:2px solid #3a3430;font:inherit;border-radius:0;white-space:nowrap}
.te button.act{background:#f26a1b;color:#0d0b0a;border-color:#f26a1b}
.te label{display:flex;align-items:center;gap:6px;height:48px}
.te input[type=range]{width:108px;height:48px;accent-color:#f26a1b;margin:0}
`;
let injected = false;

/** Touch layout editor (TECH §5): drag, resize, opacity, snap grid, reset, 3 slots. Resolves when closed. */
export function openLayoutEditor(touch: TouchControls): Promise<void> {
  if (!injected) { injected = true; const s = document.createElement('style'); s.textContent = CSS; document.head.appendChild(s); }
  const { store, view } = touch;
  touch.setEditing(true);
  let sel: ControlId | null = null;
  let grid = true;
  let layout: Layout = store.layout;

  const panel = document.createElement('div');
  panel.className = 'te';
  const row1 = document.createElement('div'); row1.className = 'row';
  const row2 = document.createElement('div'); row2.className = 'row';
  panel.append(row1, row2);
  view.safe.appendChild(panel);

  const btn = (text: string, on: () => void) => {
    const b = document.createElement('button');
    b.textContent = text;
    b.addEventListener('click', on);
    return b;
  };
  const slots = PRESETS.map((_, i) => btn(String(i + 1), () => { store.select(i); sync(); }));
  slots.forEach((b, i) => { b.setAttribute('aria-label', STR.layout.slot(i + 1)); });
  const gridBtn = btn(STR.layout.grid, () => { grid = !grid; gridBtn.classList.toggle('act', grid); });
  gridBtn.classList.toggle('act', grid);
  const resetBtn = btn(STR.layout.reset, () => { store.reset(); sync(); });
  let finish!: () => void;
  const done = new Promise<void>((r) => { finish = r; });
  const doneBtn = btn(STR.layout.done, () => close());
  row1.append(...slots, gridBtn, resetBtn, doneBtn);

  const slider = (label: string, min: number, max: number, step: number, on: (v: number) => void) => {
    const l = document.createElement('label');
    const i = document.createElement('input');
    i.type = 'range'; i.min = String(min); i.max = String(max); i.step = String(step);
    i.addEventListener('input', () => on(Number(i.value)));
    l.append(label, i);
    return { l, i };
  };
  const size = slider(STR.layout.size, T.minButton, T.maxButton, 2, (v) => edit((k, id) => ({ ...k, size: id === 'stick' ? Math.max(T.minStick, v) : v })));
  const opac = slider(STR.layout.opacity, T.minOpacity, T.maxOpacity, 0.05, (v) => edit((k) => ({ ...k, opacity: v })));
  row2.append(size.l, opac.l);

  function edit(f: (k: Layout[ControlId], id: ControlId) => Layout[ControlId]): void {
    if (!sel) return;
    const id = sel;
    layout = { ...layout, [id]: clampCtl(id, f(layout[id], id)) };
    commit();
  }
  function commit(): void { store.update(layout); touch.relayout(); mark(); }
  function sync(): void {
    layout = store.layout;
    slots.forEach((b, i) => b.classList.toggle('act', i === store.active));
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
    row2.style.display = id ? 'flex' : 'none';
    if (id) {
      const k = layout[id];
      size.i.min = String(id === 'stick' ? T.minStick : T.minButton);
      size.i.max = String(id === 'stick' ? T.maxStick : T.maxButton);
      size.i.value = String(k.size);
      opac.i.value = String(k.opacity);
    }
    mark();
  }

  // drag any control; a plain tap selects it
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
      layout = { ...layout, [id]: placeCtl(id, layout[id], p.x - drag.dx, p.y - drag.dy, w, h, grid ? T.grid : 0) };
      commit();
    };
    const up = () => { drag = null; };
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    cleanups.push(() => { el.removeEventListener('pointerdown', down); el.removeEventListener('pointermove', move); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up); });
  }
  const local = (e: PointerEvent) => { const r = view.safe.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };

  function close(): void {
    cleanups.forEach((f) => f());
    panel.remove();
    for (const id of CONTROL_IDS) view.els[id].classList.remove('sel', 'bad');
    touch.setEditing(false);
    touch.relayout();
    finish();
  }
  sync();
  return done;
}
