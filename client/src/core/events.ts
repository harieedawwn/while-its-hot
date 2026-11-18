/** Tiny typed event bus. Gameplay emits; audio and VFX subscribe. Add event types to GameEvents as phases need them. */
export interface GameEvents {
  'app:pause': { paused: boolean };
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
