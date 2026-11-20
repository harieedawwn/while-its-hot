/** One action layer for every input source (TECH §5). Sources write; gameplay reads once per sim tick. */
export type Button = 'attack' | 'parry' | 'jump' | 'slide' | 'forge' | 'anvil' | 'swap' | 'pause' | 'scoreboard';

export class Actions {
  /** Movement stick, x = right, y = forward, length ≤ 1. Sources set it each frame. */
  readonly move = { x: 0, y: 0 };
  private lookX = 0;
  private lookY = 0;
  private held = new Set<Button>();
  private pressed = new Set<Button>();
  /** performance.now() of every press not yet read (a strike is stamped with when the finger came down, not when the sim tick ran). */
  private stamps = new Map<Button, number[]>();

  /** Look delta in radians (yaw right +, pitch up +), accumulated until taken. */
  look(dx: number, dy: number): void { this.lookX += dx; this.lookY += dy; }
  takeLook(): { dx: number; dy: number } {
    const r = { dx: this.lookX, dy: this.lookY };
    this.lookX = this.lookY = 0;
    return r;
  }
  setMove(x: number, y: number): void {
    const l = Math.hypot(x, y);
    this.move.x = l > 1 ? x / l : x;
    this.move.y = l > 1 ? y / l : y;
  }

  down(b: Button): void {
    if (!this.held.has(b)) {
      this.pressed.add(b);
      const l = this.stamps.get(b); if (l) l.push(performance.now()); else this.stamps.set(b, [performance.now()]);
    }
    this.held.add(b);
  }
  up(b: Button): void { this.held.delete(b); }
  isHeld(b: Button): boolean { return this.held.has(b); }
  /** True once per press: the edge is latched until the next sim tick reads it (no lost taps at low fps). */
  take(b: Button): boolean { const p = this.pressed.has(b); this.pressed.delete(b); this.stamps.delete(b); return p; }
  /** Every press of `b` since the last take, as performance.now() stamps in order (quick double taps are kept). */
  takeStamps(b: Button): number[] {
    const l = this.stamps.get(b) ?? []; this.stamps.delete(b); this.pressed.delete(b);
    return l;
  }
  /** Drop everything (focus loss, pause). */
  clear(): void { this.held.clear(); this.pressed.clear(); this.stamps.clear(); this.setMove(0, 0); this.takeLook(); }
}
