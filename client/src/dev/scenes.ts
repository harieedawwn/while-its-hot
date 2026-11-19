import type * as THREE from 'three';
import type { Params } from './params';
import type { Pipeline } from '../render/pipeline';
import type { Director } from '../app/director';

/** width/height are CSS pixels (aspect); the pipeline owns the internal low-res size. */
/** `app` changes scene through a transition (menu → training etc.). */
export interface SceneCtx { renderer: THREE.WebGLRenderer; pipeline: Pipeline; params: Params; width: number; height: number; app: Director; }
export interface Scene {
  /** Advance by dt seconds (already frozen/scaled when `t` is set). */
  update(dt: number, time: number): void;
  /** alpha = fraction of a sim step since the last update (render interpolation). */
  render(alpha: number): void;
  resize(w: number, h: number): void;
  /** Call once the frame is final; the loop sets window.__ready. */
  ready?: boolean;
  dispose?(): void;
}
export type SceneFactory = (ctx: SceneCtx) => Scene | Promise<Scene>;

/** Registry of dev scenes. Add one line per scene; every visual feature must be reachable here. */
export const SCENES: Record<string, () => Promise<{ default: SceneFactory }>> = {
  empty: () => import('./scene-empty'),
  lookdev: () => import('./scene-lookdev'),
  movement: () => import('./scene-movement'),
  arena: () => import('./scene-arena'),
  character: () => import('./scene-character'),
  weapons: () => import('./scene-weapons'),
  combat: () => import('./scene-combat'),
  forge: () => import('./scene-forge'),
  fx: () => import('./scene-fx'),
  audition: () => import('./scene-audition'),
  'ui-menu': () => import('./scene-menu'),
  'ui-settings': () => import('./scene-ui-settings'),
  'ui-armory': () => import('./scene-ui-armory'),
  hud: () => import('./scene-hud'),
  transition: () => import('./scene-transition'),
  training: () => import('./scene-training'),
};
/** No `scene=`: the app starts at the title / main menu. */
export const DEFAULT_SCENE = 'ui-menu';
