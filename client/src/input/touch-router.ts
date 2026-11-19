import type { Actions, Button } from './actions';
import type { Circle, ControlId } from './touch-layout';
import { dragToLook, hitDisc, stickVector, type Disc } from './touch-math';

/** What the router needs from the outside world each event (all px in safe-rect coordinates). */
export interface RouterEnv {
  /** Visible buttons in hit priority order (contextual ones filtered out while hidden). */
  buttons(): Disc[];
  stick(): Circle;
  width(): number;
  height(): number;
  cfg(): { stickFixed: boolean; deadzone: number; sensX: number; sensY: number; invertY: boolean };
  tune: { hitSlop: number; slideOff: number; fixedZone: number; floatingZone: number; lookSens: number };
  /** Visual hooks (the DOM layer); the router itself never touches the DOM. */
  onPress(id: ControlId, on: boolean): void;
  onStick(origin: { x: number; y: number } | null, dx: number, dy: number): void;
}

export type Role =
  | { k: 'stick'; ox: number; oy: number }
  | { k: 'look'; x: number; y: number }
  | { k: 'button'; id: ControlId; x: number; y: number; off: boolean };

/**
 * Per-pointer ownership for the touch layer (TECH §5). Any number of pointers at once: each keeps the role it
 * got on touch-down until it lifts. A button finger holds its button and becomes a look finger once it slides
 * off (fire + aim with one thumb). One pointer owns the stick; every other touch that is not on a button looks.
 */
export class PointerRouter {
  readonly roles = new Map<number, Role>();
  private stickPointer = -1;
  /** How many pointers hold each button: two fingers on one disc release it only when both lift. */
  private holds = new Map<ControlId, number>();

  constructor(private actions: Actions, private env: RouterEnv) {}

  get stickOrigin(): { x: number; y: number } | null {
    const r = this.roles.get(this.stickPointer);
    return r && r.k === 'stick' ? { x: r.ox, y: r.oy } : null;
  }

  down(pid: number, x: number, y: number): Role {
    this.up(pid);
    const e = this.env, t = e.tune, cs = e.cfg();
    const hit = hitDisc(e.buttons(), x, y, t.hitSlop);
    if (hit) {
      const id = hit.id as ControlId;
      const r: Role = { k: 'button', id, x, y, off: false };
      this.roles.set(pid, r);
      this.hold(id, 1);
      return r;
    }
    const s = e.stick();
    const inFixed = Math.hypot(x - s.cx, y - s.cy) <= s.r * t.fixedZone;
    const inFloat = x < e.width() * t.floatingZone;
    if (this.stickPointer < 0 && (cs.stickFixed ? inFixed : inFloat)) {
      const w = e.width(), h = e.height();
      const o = cs.stickFixed ? { x: s.cx, y: s.cy } : { x: Math.min(w - s.r, Math.max(s.r, x)), y: Math.min(h - s.r, Math.max(s.r, y)) };
      const r: Role = { k: 'stick', ox: o.x, oy: o.y };
      this.roles.set(pid, r);
      this.stickPointer = pid;
      this.stickMove(r, x, y);
      return r;
    }
    const r: Role = { k: 'look', x, y };
    this.roles.set(pid, r);
    return r;
  }

  move(pid: number, x: number, y: number): void {
    const r = this.roles.get(pid);
    if (!r) return;
    if (r.k === 'stick') { this.stickMove(r, x, y); return; }
    if (r.k === 'button' && !r.off) {
      const d = this.env.buttons().find((b) => b.id === r.id);
      if (d && Math.hypot(x - d.cx, y - d.cy) <= d.r * this.env.tune.slideOff) return;
      r.off = true; r.x = x; r.y = y;
      return;
    }
    const cs = this.env.cfg();
    const l = dragToLook(x - r.x, y - r.y, this.env.tune.lookSens, cs.sensX, cs.sensY, cs.invertY);
    r.x = x; r.y = y;
    if (l.dx || l.dy) this.actions.look(l.dx, l.dy);
  }

  up(pid: number): void {
    const r = this.roles.get(pid);
    if (!r) return;
    this.roles.delete(pid);
    if (r.k === 'button') this.hold(r.id, -1);
    if (r.k === 'stick') { this.stickPointer = -1; this.actions.setMove(0, 0); this.env.onStick(null, 0, 0); }
  }

  /** Lift every pointer (focus loss, modal, editor). */
  releaseAll(): void { for (const pid of [...this.roles.keys()]) this.up(pid); }

  private hold(id: ControlId, d: 1 | -1): void {
    const n = (this.holds.get(id) ?? 0) + d;
    if (n > 0) this.holds.set(id, n); else this.holds.delete(id);
    if (d > 0 && n === 1) { this.actions.down(id as Button); this.env.onPress(id, true); }
    if (d < 0 && n === 0) { this.actions.up(id as Button); this.env.onPress(id, false); }
  }

  private stickMove(r: { ox: number; oy: number }, x: number, y: number): void {
    const s = this.env.stick(), dx = x - r.ox, dy = y - r.oy;
    const v = stickVector(dx, dy, s.r, this.env.cfg().deadzone);
    this.actions.setMove(v.x, v.y);
    this.env.onStick({ x: r.ox, y: r.oy }, dx, dy);
  }
}
