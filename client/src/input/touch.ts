import { MODAL_EVENT } from '../ui/modal';
import { FEEL } from '../core/feel';
import type { Actions, Button } from './actions';
import type { Controls } from './controls-settings';
import type { LayoutStore } from './layout-store';
import { CONTEXTUAL, CONTROL_IDS, type Circle, type ControlId } from './touch-layout';
import { clampKnob, type Disc } from './touch-math';
import { TouchRims } from './touch-rims';
import { PointerRouter } from './touch-router';
import { createView, type View } from './touch-view';
import type { PictoVariant } from './pictograms';

const T = FEEL.input.touch;
/** Hit priority when two discs overlap: the big attack button wins. */
const ORDER: readonly ControlId[] = ['attack', 'parry', 'jump', 'slide', 'swap', 'pause', 'scoreboard', 'forge', 'anvil'];

/**
 * Touch input (TECH §5): floating/fixed stick, drag-to-look anywhere that is not a control, the button set.
 * One capture layer receives every pointer; `PointerRouter` gives each its role (any number at once, so
 * 3- and 4-finger claw play works). This class is only the DOM side: discs, pressed flash, stick, rims.
 */
export class TouchControls {
  readonly view: View;
  private router: PointerRouter;
  private rims: TouchRims;
  private discs: Record<ControlId, Circle>;
  private ctxShown = new Set<ControlId>();
  private editing = false;
  private flash = new Map<ControlId, number>();
  private stickHeld = false;

  constructor(host: HTMLElement, private actions: Actions, private controls: Controls, readonly store: LayoutStore) {
    this.view = createView(host);
    this.discs = this.view.apply(store.layout);
    this.router = new PointerRouter(actions, {
      buttons: () => this.buttonDiscs(),
      stick: () => this.discs.stick,
      width: () => this.view.rect().w,
      height: () => this.view.rect().h,
      cfg: () => this.controls.v,
      tune: T,
      onPress: (id, on) => this.press(id, on),
      onStick: (o, dx, dy) => this.drawStick(o, dx, dy),
    });
    this.rims = new TouchRims((id, v, tone) => this.view.rim(id, v, tone), (id) => this.actions.isHeld(id as Button));
    const c = this.view.capture;
    c.addEventListener('pointerdown', this.down);
    c.addEventListener('pointermove', this.move);
    c.addEventListener('pointerup', this.up);
    c.addEventListener('pointercancel', this.up);
    c.addEventListener('lostpointercapture', this.up);
    c.addEventListener('contextmenu', (e) => e.preventDefault());
    addEventListener('resize', this.relayout);
    addEventListener('blur', this.releaseAll);
    addEventListener(MODAL_EVENT, this.releaseAll);
    this.refresh();
  }

  /** Contextual buttons (forge, anvil) fade in place only while the game says they apply. */
  /** Pictogram override / grayed state for a control (forge stance, held slot). */
  setIcon(id: ControlId, v: PictoVariant | null): void { this.view.icon(id, v); }
  setDim(id: ControlId, on: boolean): void { this.view.dim(id, on); }
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
    this.drawStick(this.router.stickOrigin, 0, 0);
  }

  private drawStick(o: { x: number; y: number } | null, dx: number, dy: number): void {
    const s = this.discs.stick, at = o ?? { x: s.cx, y: s.cy }, el = this.view.els.stick;
    el.style.transform = `translate(${at.x - s.r}px,${at.y - s.r}px)`;
    const k = clampKnob(dx, dy, s.r * 0.72);
    this.view.knob.style.transform = `translate(${k.x}px,${k.y}px)`;
    const op = this.store.layout.stick.opacity;
    el.style.opacity = String(o ? Math.min(1, op + 0.15) : op * (this.controls.v.stickFixed ? 1 : 0.55));
    if (this.stickHeld !== !!o) { this.stickHeld = !!o; el.classList.toggle('held', !!o); }
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
    const p = this.local(e);
    this.router.down(e.pointerId, p.x, p.y);
  };

  private move = (e: PointerEvent): void => {
    if (this.editing) return;
    const p = this.local(e);
    this.router.move(e.pointerId, p.x, p.y);
  };

  private up = (e: PointerEvent): void => { this.router.up(e.pointerId); };

  private press(id: ControlId, on: boolean): void {
    const el = this.view.els[id];
    this.rims.press(id, on);
    if (on) {
      window.clearTimeout(this.flash.get(id));
      el.classList.add('on');
      if (this.controls.v.haptics) navigator.vibrate?.(T.hapticMs);
    } else {
      this.flash.set(id, window.setTimeout(() => el.classList.remove('on'), T.flashMs));
    }
  }

  /** Release everything (focus loss, editor open, modal, pause). */
  releaseAll = (): void => { this.router.releaseAll(); this.rims.clear(); };

  dispose(): void {
    this.releaseAll();
    this.rims.dispose();
    removeEventListener('resize', this.relayout);
    removeEventListener('blur', this.releaseAll);
    removeEventListener(MODAL_EVENT, this.releaseAll);
    this.view.dispose();
  }
}
