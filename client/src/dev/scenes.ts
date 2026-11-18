import type * as THREE from 'three';
import type { Params } from './params';
import type { Pipeline } from '../render/pipeline';

/** width/height are CSS pixels (aspect); the pipeline owns the internal low-res size. */
export interface SceneCtx { renderer: THREE.WebGLRenderer; pipeline: Pipeline; params: Params; width: number; height: number; }
export interface Scene {
  /** Advance by dt seconds (already frozen/scaled when `t` is set). */
  update(dt: number, time: number): void;
  render(): void;
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
};
export const DEFAULT_SCENE = 'empty';
