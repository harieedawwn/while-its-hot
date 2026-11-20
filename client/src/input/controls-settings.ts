import { FEEL } from '../core/feel';
import { loadJson, saveJson } from '../core/store';

/** Điều khiển settings (TECH §5). Persisted per device; the settings ledger (phase 14) edits this object. */
export interface ControlSettings {
  sensX: number; sensY: number; invertY: boolean;
  stickFixed: boolean; deadzone: number;
  gyro: boolean; gyroSens: number;
  aimAssist: boolean; haptics: boolean; holdParry: boolean;
}
const C = FEEL.input.controls;
export const DEFAULT_CONTROLS: ControlSettings = {
  sensX: C.sens.def, sensY: C.sens.def, invertY: C.invertY,
  stickFixed: C.stickFixed, deadzone: C.deadzone.def,
  gyro: C.gyro, gyroSens: C.gyroSens.def,
  aimAssist: C.aimAssist, haptics: C.haptics, holdParry: C.holdParry,
};
const KEY = 'wih.controls.v1';
const num = (v: unknown, d: number, lo: number, hi: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d);
const bool = (v: unknown, d: boolean) => (typeof v === 'boolean' ? v : d);

/** Clamp every field into range; unknown or corrupt input falls back to defaults. */
export function sanitizeControls(raw: unknown): ControlSettings {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const d = DEFAULT_CONTROLS;
  return {
    sensX: num(r.sensX, d.sensX, C.sens.min, C.sens.max), sensY: num(r.sensY, d.sensY, C.sens.min, C.sens.max),
    invertY: bool(r.invertY, d.invertY), stickFixed: bool(r.stickFixed, d.stickFixed),
    deadzone: num(r.deadzone, d.deadzone, C.deadzone.min, C.deadzone.max),
    gyro: bool(r.gyro, d.gyro), gyroSens: num(r.gyroSens, d.gyroSens, C.gyroSens.min, C.gyroSens.max),
    aimAssist: bool(r.aimAssist, d.aimAssist), haptics: bool(r.haptics, d.haptics), holdParry: bool(r.holdParry, d.holdParry),
  };
}

/** Live settings holder: sources read `.v` every event, so changes apply immediately. */
export class Controls {
  v: ControlSettings;
  constructor(v?: Partial<ControlSettings>) { this.v = sanitizeControls({ ...sanitizeControls(loadJson(KEY, {})), ...v }); }
  set(p: Partial<ControlSettings>): void { this.v = sanitizeControls({ ...this.v, ...p }); saveJson(KEY, this.v); }
}

/** The one live instance: the game's input rig, the settings screens and the pause menu all share it. */
let shared: Controls | null = null;
export function sharedControls(): Controls { return (shared ??= new Controls()); }
