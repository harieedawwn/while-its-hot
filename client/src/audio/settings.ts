import { loadJson, saveJson } from '../core/store';

/** "Đầu ra": phone speaker (default on the APK) or headphones (full range + HRTF). Labels: STR.audio. */
export type OutputMode = 'phone' | 'headphones';
export interface AudioSettings { master: number; sfx: number; world: number; ui: number; output: OutputMode }

const KEY = 'wih.audio';
export const audioSettings: AudioSettings = { master: 1, sfx: 1, world: 1, ui: 1, output: 'phone', ...loadJson<Partial<AudioSettings>>(KEY, {}) };

export function setAudioSettings(p: Partial<AudioSettings>): void { Object.assign(audioSettings, p); saveJson(KEY, audioSettings); }
