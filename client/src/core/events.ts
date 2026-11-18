/** Tiny typed event bus. Gameplay emits; audio and VFX subscribe. Add event types to GameEvents as phases need them. */
export interface GameEvents {
  'app:pause': { paused: boolean };
  /** Local player movement (player/player.ts). Positions/dirs are world space. */
  'move:jump': { kind: 'jump' | 'bounce' | 'dashjump' | 'slidejump' | 'walljump' };
  'move:land': { speed: number };
  'move:dash': { x: number; z: number };
  'move:slide': { on: boolean };
  'move:slamstart': Record<string, never>;
  'move:slam': { x: number; y: number; z: number };
  /** Requests from gameplay to the local camera (combat emits these on hits/parries). */
  'cam:trauma': { amount: number };
  'cam:hitstop': { ms: number };
}
type Handler<K extends keyof GameEvents> = (e: GameEvents[K]) => void;

export class EventBus {
  private map = new Map<keyof GameEvents, Set<Handler<never>>>();
  on<K extends keyof GameEvents>(k: K, h: Handler<K>): () => void {
    let s = this.map.get(k);
    if (!s) this.map.set(k, (s = new Set()));
    s.add(h as Handler<never>);
    return () => s.delete(h as Handler<never>);
  }
  emit<K extends keyof GameEvents>(k: K, e: GameEvents[K]): void {
    this.map.get(k)?.forEach((h) => (h as Handler<K>)(e));
  }
}
export const bus = new EventBus();
