import { loadJson, saveJson } from '../core/store';

/** Effect settings the player can change (the ledger UI is phase 14; label `STR.gfx.blood`). */
export interface FxSettings { /** Máu: dark-red puffs and floor marks on hits; off = sparks only. */ blood: boolean }

const KEY = 'wih.fx';
export const fxSettings: FxSettings = { blood: true, ...loadJson<Partial<FxSettings>>(KEY, {}) };

export function setFxSettings(p: Partial<FxSettings>): void { Object.assign(fxSettings, p); saveJson(KEY, fxSettings); }
