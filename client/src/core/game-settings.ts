import { FEEL } from './feel';
import { loadJson, saveJson } from './store';
import type { QuantizeMode } from '../render/pipeline';

/** Hình ảnh + Góc nhìn settings (TECH §5), saved. Applied live by `bindGraphics` (main) and read by the camera. */
export interface GameSettings {
  resolution: number; quantize: QuantizeMode; snap: boolean; fpsCap: number; showFps: boolean;
  hfov: number; bob: boolean; shake: number;
}
const R = FEEL.render;
export const DEFAULT_GAME: GameSettings = {
  resolution: R.defaultResolution, quantize: R.defaultQuantize, snap: false, fpsCap: 60, showFps: false,
  hfov: FEEL.camera.hfov, bob: true, shake: 1,
};
const KEY = 'wih.game.v1';
const clamp = (v: unknown, d: number, lo: number, hi: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d);
const bool = (v: unknown, d: boolean) => (typeof v === 'boolean' ? v : d);

export function sanitizeGame(raw: unknown): GameSettings {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const d = DEFAULT_GAME;
  const q = typeof r.quantize === 'string' && r.quantize in R.quantize ? (r.quantize as QuantizeMode) : d.quantize;
  const cap = [30, 60, 90, 120, 0].includes(r.fpsCap as number) ? (r.fpsCap as number) : d.fpsCap;
  return {
    resolution: clamp(r.resolution, d.resolution, 0, 1080), quantize: q, snap: bool(r.snap, d.snap), fpsCap: cap, showFps: bool(r.showFps, d.showFps),
    hfov: clamp(r.hfov, d.hfov, FEEL.camera.hfovMin, FEEL.camera.hfovMax),
    bob: bool(r.bob, d.bob), shake: clamp(r.shake, d.shake, 0, 1),
  };
}

export const game: GameSettings = sanitizeGame(loadJson(KEY, {}));
type Listener = (g: GameSettings) => void;
const listeners = new Set<Listener>();
export function onGameSettings(fn: Listener): () => void { listeners.add(fn); return () => listeners.delete(fn); }
export function setGame(p: Partial<GameSettings>): void {
  Object.assign(game, sanitizeGame({ ...game, ...p }));
  saveJson(KEY, game);
  listeners.forEach((f) => f(game));
}
