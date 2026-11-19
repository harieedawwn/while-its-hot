import { getTransition, type WipeKind } from '../ui/transition';

/**
 * Screen state machine (TECH §2): Title → Menu → {Training | Lobby → Match} ↔ Settings. Each screen owns its
 * DOM and input; `go` swaps screens under a transition (or instantly with `via: 'cut'`). Scene-level changes
 * (loading the training scene) happen inside a screen's enter() through the Director.
 */
export interface Screen {
  enter(from: string | null): void | Promise<void>;
  exit(): void;
  update?(dt: number): void;
  /** Back button / Escape. Return true when handled. */
  back?(): boolean;
}

export class ScreenMachine {
  private screens = new Map<string, Screen>();
  current: string | null = null;
  private switching = false;

  add(id: string, s: Screen): this { this.screens.set(id, s); return this; }
  get(id: string): Screen | undefined { return this.screens.get(id); }
  get busy(): boolean { return this.switching; }

  async go(id: string, via: WipeKind | 'cut' = 'quench', origin: [number, number] | null = null): Promise<void> {
    const next = this.screens.get(id);
    if (!next || this.switching || id === this.current) return;
    this.switching = true;
    const from = this.current;
    const swap = async () => {
      if (from) this.screens.get(from)!.exit();
      this.current = id;
      await next.enter(from);
    };
    try { if (via === 'cut') await swap(); else await getTransition().run(via, origin, swap); }
    finally { this.switching = false; }
  }

  update(dt: number): void { if (this.current) this.screens.get(this.current)!.update?.(dt); }
  back(): boolean { return !this.switching && !!this.current && !!this.screens.get(this.current)!.back?.(); }
}
