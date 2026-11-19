import { PLAYER_COLORS, FAMILIES, MODULE_IDS, WEAPONS, type Family } from '@wih/shared';
import { loadJson, saveJson } from './store';

/** Offline profile (GDD §9). A form unlocks when reached in an online match; the start set is `phoi` + the three +3 forms. */
export interface Profile {
  name: string;
  color: string;
  unlocked: Record<string, boolean>;
  bestLevel: Record<Family, number>;
  stats: { kills: number; deaths: number; matches: number };
  /** Armor modules ever drafted in a match (the training armor stand offers them). */
  drafted: string[];
}
const KEY = 'wih.profile.v1';
export const NAME_MAX = 14;
const START = ['phoi', 'kiem_tho', 'bua_ren', 'giao_sat'];

export function defaultProfile(): Profile {
  return {
    name: '', color: PLAYER_COLORS[0],
    unlocked: Object.fromEntries(START.map((id) => [id, true])),
    bestLevel: { kiem: 3, bua: 3, thuong: 3 },
    stats: { kills: 0, deaths: 0, matches: 0 },
    drafted: [],
  };
}
export function sanitizeProfile(raw: unknown): Profile {
  const d = defaultProfile();
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const un = { ...d.unlocked };
  if (r.unlocked && typeof r.unlocked === 'object') for (const w of WEAPONS) if ((r.unlocked as Record<string, unknown>)[w.id] === true) un[w.id] = true;
  const best = { ...d.bestLevel };
  for (const f of FAMILIES) { const v = (r.bestLevel as Record<string, unknown> | undefined)?.[f]; if (typeof v === 'number' && Number.isFinite(v)) best[f] = Math.max(3, Math.min(30, Math.floor(v))); }
  const st = (r.stats && typeof r.stats === 'object' ? r.stats : {}) as Record<string, unknown>;
  const n = (v: unknown) => (typeof v === 'number' && v >= 0 ? Math.floor(v) : 0);
  return {
    name: typeof r.name === 'string' ? r.name.slice(0, NAME_MAX) : d.name,
    color: typeof r.color === 'string' && (PLAYER_COLORS as readonly string[]).includes(r.color) ? r.color : d.color,
    drafted: Array.isArray(r.drafted) ? MODULE_IDS.filter((m) => (r.drafted as unknown[]).includes(m)) : [],
    unlocked: un, bestLevel: best, stats: { kills: n(st.kills), deaths: n(st.deaths), matches: n(st.matches) },
  };
}

export const profile: Profile = sanitizeProfile(loadJson(KEY, {}));
export function setProfile(p: Partial<Profile>): void { Object.assign(profile, sanitizeProfile({ ...profile, ...p })); saveJson(KEY, profile); }
export function clearProfile(): void { Object.assign(profile, defaultProfile()); saveJson(KEY, profile); }
export const isUnlocked = (id: string): boolean => profile.unlocked[id] === true;
