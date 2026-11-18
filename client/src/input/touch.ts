import { FEEL } from '../core/feel';
import type { Actions, Button } from './actions';
import type { Controls } from './controls-settings';
import type { LayoutStore } from './layout-store';
import { CONTEXTUAL, CONTROL_IDS, type Circle, type ControlId } from './touch-layout';
import { clampKnob, dragToLook, hitDisc, stickVector, type Disc } from './touch-math';
import { createView, type View } from './touch-view';

const T = FEEL.input.touch;
/** Priority when two discs overlap: the big attack button wins. */
const ORDER: readonly ControlId[] = ['attack', 'jump', 'dash', 'slide', 'parry', 'swap', 'pause', 'forge', 'anvil'];

type Owner =
  | { k: 'stick'; ox: number; oy: number }
  | { k: 'look'; x: number; y: number }
  | { k: 'button'; id: ControlId; x: number; y: number; off: boolean };

/**
 * Touch input (TECH §5): floating/fixed stick on the left, drag-to-look anywhere else, button cluster.
 * One capture layer owns every pointer; each pointer keeps its role until it lifts. A finger that starts on a
 * button holds it and begins looking once it slides off (fire + aim with one thumb).
 */
export class TouchControls {
  readonly view: View;
  private owners = new Map<number, Owner>();
  private discs: Record<ControlId, Circle>;
  private ctxShown = new Set<ControlId>();
  private editing = false;
  private flash = new Map<ControlId, number>();
  /** Stick origin (px, safe-rect coords) while held; null = idle at its layout position. */
  private stickAt: { x: number; y: number } | null = null;
  private stickPointer = -1;

  constructor(host: HTMLElement, private actions: Actions, private controls: Controls, readonly store: LayoutStore) {
    this.view = createView(host);
    this.discs = this.view.apply(store.layout);
    const c = this.view.capture;
    c.addEventListener('pointerdown', this.down);
    c.addEventListener('pointermove', this.move);
    c.addEventListener('pointerup', this.up);
    c.addEventListener('pointercancel', this.up);
    c.addEventListener('contextmenu', (e) => e.preventDefault());
    addEventListener('resize', this.relayout);
    addEventListener('blur', this.releaseAll);
    this.refresh();
  }

  /** Contextual buttons (forge, anvil) show only while the game says they apply. */
  setContext(id: 'forge' | 'anvil', on: boolean): void { if (on) this.ctxShown.add(id); else this.ctxShown.delete(id); this.refresh(); }

  /** Re-read the layout store (after the editor or a preset change). */
  relayout = (): void => { this.discs = this.view.apply(this.store.layout); this.refresh(); };

  setEditing(on: boolean): void {
    this.editing = on;
    this.releaseAll();
    this.view.capture.classList.toggle('edit', on);
    this.refresh();
  }

  private refresh(): void {
    for (const id of CONTROL_IDS) {
      const hidden = !this.editing && CONTEXTUAL.includes(id) && !this.ctxShown.has(id);
      this.view.els[id].classList.toggle('off', hidden);
    }
    this.drawStick();
  }

  private origin(): { x: number; y: number } { const s = this.discs.stick; return this.stickAt ?? { x: s.cx, y: s.cy }; }

  private drawStick(dx = 0, dy = 0): void {
    const s = this.discs.stick, o = this.origin(), el = this.view.els.stick;
    el.style.transform = `translate(${o.x - s.r}px,${o.y - s.r}px)`;
    const k = clampKnob(dx, dy, s.r);
    this.view.knob.style.transform = `translate(${k.x}px,${k.y}px)`;
    el.style.opacity = String(this.stickAt ? Math.min(1, this.store.layout.stick.opacity + 0.15) : this.store.layout.stick.opacity * (this.controls.v.stickFixed ? 1 : 0.55));
  }

  private local(e: PointerEvent): { x: number; y: number } {
    const r = this.view.rect(), b = this.view.capture.getBoundingClientRect();
    return { x: e.clientX - b.left - r.x, y: e.clientY - b.top - r.y };
  }

  private buttonDiscs(): Disc[] {
    return ORDER.filter((id) => !this.view.els[id].classList.contains('off')).map((id) => ({ id, ...this.discs[id] }));
  }

  private down = (e: PointerEvent): void => {
    if (this.editing) return;
    e.preventDefault();
    this.view.capture.setPointerCapture(e.pointerId);
    const p = this.local(e), cs = this.controls.v;
    const hit = hitDisc(this.buttonDiscs(), p.x, p.y, T.hitSlop);
    if (hit) {
      const id = hit.id as ControlId;
      this.owners.set(e.pointerId, { k: 'button', id, x: p.x, y: p.y, off: false });
      this.press(id, true);
      return;
    }
    const s = this.discs.stick, w = this.view.rect().w;
    const stickFree = this.stickPointer < 0;
    const inFixed = Math.hypot(p.x - s.cx, p.y - s.cy) <= s.r * T.fixedZone;
    const inFloat = p.x < w * T.floatingZone;
    if (stickFree && (cs.stickFixed ? inFixed : inFloat)) {
      const r = this.view.rect();
      const at = cs.stickFixed ? { x: s.cx, y: s.cy } : { x: Math.min(r.w - s.r, Math.max(s.r, p.x)), y: Math.min(r.h - s.r, Math.max(s.r, p.y)) };
      this.stickAt = at;
      this.stickPointer = e.pointerId;
      this.owners.set(e.pointerId, { k: 'stick', ox: at.x, oy: at.y });
      this.stickMove(p.x, p.y);
      return;
    }
    this.owners.set(e.pointerId, { k: 'look', x: p.x, y: p.y });
  };

  private move = (e: PointerEvent): void => {
    const o = this.owners.get(e.pointerId);
    if (!o || this.editing) return;
    const p = this.local(e);
    if (o.k === 'stick') { this.stickMove(p.x, p.y); return; }
    if (o.k === 'button' && !o.off) {
      const d = this.discs[o.id];
      if (Math.hypot(p.x - d.cx, p.y - d.cy) <= d.r * T.slideOff) return;
      o.off = true; o.x = p.x; o.y = p.y;
      return;
    }
    const cs = this.controls.v;
    const l = dragToLook(p.x - o.x, p.y - o.y, T.lookSens, cs.sensX, cs.sensY, cs.invertY);
    o.x = p.x; o.y = p.y;
    this.actions.look(l.dx, l.dy);
  };

  private up = (e: PointerEvent): void => {
    const o = this.owners.get(e.pointerId);
    if (!o) return;
    this.owners.delete(e.pointerId);
    if (o.k === 'button') this.press(o.id, false);
    if (o.k === 'stick') this.endStick();
  };

  private stickMove(x: number, y: number): void {
    const o = this.origin(), s = this.discs.stick;
    const v = stickVector(x - o.x, y - o.y, s.r, this.controls.v.deadzone);
    this.actions.setMove(v.x, v.y);
    this.drawStick(x - o.x, y - o.y);
  }

  private endStick(): void { this.stickAt = null; this.stickPointer = -1; this.actions.setMove(0, 0); this.drawStick(); }

  private press(id: ControlId, on: boolean): void {
    const el = this.view.els[id];
    if (on) {
      window.clearTimeout(this.flash.get(id));
      el.classList.add('on');
      this.actions.down(id as Button);
      if (this.controls.v.haptics) navigator.vibrate?.(T.hapticMs);
    } else {
      this.actions.up(id as Button);
      this.flash.set(id, window.setTimeout(() => el.classList.remove('on'), T.flashMs));
    }
  }

  /** Release everything (focus loss, editor open, pause). */
  releaseAll = (): void => {
    for (const o of this.owners.values()) if (o.k === 'button') this.press(o.id, false);
    this.owners.clear();
    this.endStick();
  };

  dispose(): void {
    this.releaseAll();
    removeEventListener('resize', this.relayout);
    removeEventListener('blur', this.releaseAll);
    this.view.dispose();
  }
}
