import type { AttackKind, Family, Zone } from '@wih/shared';

/** Hit results the bus carries (parries have their own event). */
export type HitKind = 'hit' | 'blocked' | 'guardbreak' | 'pierced';

/** Tiny typed event bus. Gameplay emits; audio and VFX subscribe. Add event types to GameEvents as phases need them. */
export interface GameEvents {
  'app:pause': { paused: boolean };
  /** Android back button (Capacitor). Phase 14 opens the pause menu on it. */
  'app:back': Record<string, never>;
  /** Local player movement (player/player.ts). Positions/dirs are world space. */
  'move:jump': { kind: 'jump' | 'bounce' | 'dashjump' | 'slidejump' | 'walljump' };
  'move:land': { speed: number };
  'move:dash': { x: number; z: number };
  'move:slide': { on: boolean };
  'move:slamstart': Record<string, never>;
  'move:slam': { x: number; y: number; z: number };
  /** Melee (combat/*). ids are combatant ids; points are world space. */
  'combat:swing': { id: number; kind: AttackKind; combo: number; family: Family; x: number; y: number; z: number };
  'combat:charge': { id: number };
  'combat:guard': { id: number; act: 'parry' | 'block_on' | 'block_off' | 'feint' };
  'combat:hit': { attacker: number; target: number; dmg: number; zone: Zone; kind: AttackKind; result: HitKind; x: number; y: number; z: number };
  'combat:parry': { parrier: number; attacker: number; x: number; y: number; z: number };
  'combat:kill': { target: number; by: number };
  /** Forging (forge/*). act: place/placed/lift = anvil; owner = combatant id. */
  'forge:anvil': { act: 'place' | 'placed' | 'lift'; x: number; y: number; z: number; owner: number };
  'forge:stance': { on: boolean; owner: number };
  /** One strike: outcome, the level after it, and the world point of the anvil face. heat = 0..1 at the blow. */
  'forge:strike': { outcome: 'tuyet' | 'dat' | 'giu' | 'hong'; perfect: boolean; auto: boolean; target: 'blade' | 'armor'; level: number; refused: boolean; broke: boolean; heat: number; x: number; y: number; z: number };
  'forge:evolve': { form: string; family: Family };
  'forge:frenzy': { on: boolean };
  'forge:heating': { on: boolean };
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
