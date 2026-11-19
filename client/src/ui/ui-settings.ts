import { loadJson, saveJson } from '../core/store';

/** UI settings (saved): reduce motion replaces every transition with a 0.2 s fade (LOOK §9). */
export interface UiSettings { reduceMotion: boolean }
const KEY = 'wih.ui';
const sysReduce = (): boolean => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; } };
export const uiSettings: UiSettings = { reduceMotion: sysReduce(), ...loadJson<Partial<UiSettings>>(KEY, {}) };
export function setUiSettings(p: Partial<UiSettings>): void {
  Object.assign(uiSettings, p);
  saveJson(KEY, uiSettings);
  document.documentElement.classList.toggle('k-reduce', uiSettings.reduceMotion);
}
if (typeof document !== 'undefined') document.documentElement.classList.toggle('k-reduce', uiSettings.reduceMotion);
