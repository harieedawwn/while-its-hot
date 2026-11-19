import { LayoutStore } from '../../input/layout-store';
import { Actions } from '../../input/actions';
import { Controls } from '../../input/controls-settings';
import { openLayoutEditor } from '../../input/layout-editor';
import { TouchControls } from '../../input/touch';
import { FEEL } from '../../core/feel';
import { game, setGame } from '../../core/game-settings';
import { clearProfile, NAME_MAX, profile, setProfile } from '../../core/profile';
import { getAudio } from '../../audio/engine';
import { audioSettings } from '../../audio/settings';
import { fxSettings, setFxSettings } from '../../fx/fx-settings';
import { PLAYER_COLORS } from '@wih/shared';
import { ledger, notchedSlider, segmented, stampedButton, type Ledger } from '../kit/controls';
import { rangeSlider, swatches, textField } from '../kit/fields';
import { toast } from '../kit/panels';
import { STR } from '../strings.vi';
import { setUiSettings, uiSettings } from '../ui-settings';

/** The ledger rows of each settings tab (TECH §5). Every row applies live and persists through its store. */
export type Tab = 'gfx' | 'audio' | 'controls' | 'view' | 'profile';
export const TABS: readonly Tab[] = ['gfx', 'audio', 'controls', 'view', 'profile'];
export interface RowsCtx { layer: HTMLElement; host: HTMLElement; hide(on: boolean): void }

const onOff = [{ id: 'on', label: STR.settings.on }, { id: 'off', label: STR.settings.off }] as const;
const bool = (v: boolean) => (v ? 'on' : 'off');
const toggle = (label: string, v: boolean, fn: (v: boolean) => void) => segmented(label, onOff, bool(v), (x) => fn(x === 'on')).root;
const pct = (v: number) => `${Math.round(v * 100)}`;
const controls = new Controls();

function gfx(L: Ledger): void {
  const res = FEEL.render.resolutions;
  L.row(STR.gfx.resolution, segmented(STR.gfx.resolution, res.map((r) => ({ id: String(r), label: r === 0 ? STR.gfx.native : `${r}` })), String(game.resolution),
    (v) => setGame({ resolution: Number(v) })).root);
  L.row(STR.gfx.quantize, segmented(STR.gfx.quantize, [{ id: 'off', label: STR.gfx.quantOff }, { id: 'light', label: STR.gfx.quantLight }, { id: 'strong', label: STR.gfx.quantStrong }] as const,
    game.quantize, (v) => setGame({ quantize: v })).root);
  L.row(STR.gfx.snap, toggle(STR.gfx.snap, game.snap, (v) => setGame({ snap: v })));
  L.row(STR.gfx.fpsCap, segmented(STR.gfx.fpsCap, [30, 60, 90, 120].map((n) => ({ id: String(n), label: String(n) })), String(game.fpsCap),
    (v) => setGame({ fpsCap: Number(v) })).root);
  L.row(STR.gfx.blood, toggle(STR.gfx.blood, fxSettings.blood, (v) => setFxSettings({ blood: v })));
  L.row(STR.gfx.showFps, toggle(STR.gfx.showFps, game.showFps, (v) => setGame({ showFps: v })));
  L.row(STR.settings.reduceMotion, toggle(STR.settings.reduceMotion, uiSettings.reduceMotion, (v) => setUiSettings({ reduceMotion: v })));
}

function audio(L: Ledger): void {
  const a = getAudio();
  const vol = (label: string, key: 'master' | 'sfx' | 'world' | 'ui') =>
    L.row(label, notchedSlider(label, 10, Math.round(audioSettings[key] * 10), (v) => a.setSettings({ [key]: v / 10 }), (v) => String(v * 10)).root);
  vol(STR.audio.master, 'master'); vol(STR.audio.sfx, 'sfx'); vol(STR.audio.world, 'world'); vol(STR.audio.ui, 'ui');
  L.row(STR.audio.output, segmented(STR.audio.output, [{ id: 'phone', label: STR.audio.phone }, { id: 'headphones', label: STR.audio.headphones }] as const,
    audioSettings.output, (v) => a.setSettings({ output: v })).root);
  L.row(STR.audio.haptics, toggle(STR.audio.haptics, audioSettings.haptics, (v) => { a.setSettings({ haptics: v }); controls.set({ haptics: v }); }));
}

/** Layout editor from the menu: a throw-away touch layer over the settings (the real one lives in the game scenes). */
async function editLayout(c: RowsCtx): Promise<void> {
  c.hide(true);
  const store = new LayoutStore();
  const t = new TouchControls(c.host, new Actions(), new Controls(), store);
  try { await openLayoutEditor(t); } finally { t.dispose(); c.hide(false); }
}

function ctl(L: Ledger, c: RowsCtx): void {
  const v = controls.v, K = FEEL.input.controls, T = FEEL.input.touch;
  L.row(STR.controls.layout, stampedButton(STR.controls.open, () => void editLayout(c)));
  L.row(STR.controls.stick, segmented(STR.controls.stick, [{ id: 'floating', label: STR.settings.floating }, { id: 'fixed', label: STR.settings.fixed }] as const,
    v.stickFixed ? 'fixed' : 'floating', (x) => controls.set({ stickFixed: x === 'fixed' })).root);
  const store = new LayoutStore();
  L.row(STR.controls.stickSize, rangeSlider(STR.controls.stickSize, T.minStick, T.maxStick, 12, store.layout.stick.size, (s) => {
    const ls = new LayoutStore();
    ls.update({ ...ls.layout, stick: { ...ls.layout.stick, size: s } });
  }).root);
  L.row(STR.controls.deadzone, rangeSlider(STR.controls.deadzone, K.deadzone.min, K.deadzone.max, 0.02, v.deadzone, (x) => controls.set({ deadzone: x }), (x) => pct(x)).root);
  L.row(STR.controls.sensX, rangeSlider(STR.controls.sensX, K.sens.min, K.sens.max, 0.1, v.sensX, (x) => controls.set({ sensX: x }), (x) => x.toFixed(1)).root);
  L.row(STR.controls.sensY, rangeSlider(STR.controls.sensY, K.sens.min, K.sens.max, 0.1, v.sensY, (x) => controls.set({ sensY: x }), (x) => x.toFixed(1)).root);
  L.row(STR.controls.invertY, toggle(STR.controls.invertY, v.invertY, (x) => controls.set({ invertY: x })));
  L.row(STR.controls.gyro, toggle(STR.controls.gyro, v.gyro, (x) => controls.set({ gyro: x })));
  L.row(STR.controls.gyroSens, rangeSlider(STR.controls.gyroSens, K.gyroSens.min, K.gyroSens.max, 0.1, v.gyroSens, (x) => controls.set({ gyroSens: x }), (x) => x.toFixed(1)).root);
  L.row(STR.controls.aimAssist, toggle(STR.controls.aimAssist, v.aimAssist, (x) => controls.set({ aimAssist: x })));
  L.row(STR.controls.parry, segmented(STR.controls.parry, [{ id: 'tap', label: STR.settings.tapParry }, { id: 'hold', label: STR.settings.holdParry }] as const,
    v.holdParry ? 'hold' : 'tap', (x) => controls.set({ holdParry: x === 'hold' })).root);
}

function view(L: Ledger): void {
  L.row(STR.view.fov, rangeSlider(STR.view.fov, FEEL.camera.hfovMin, FEEL.camera.hfovMax, 5, game.hfov, (x) => setGame({ hfov: x })).root);
  L.row(STR.view.mode, segmented(STR.view.mode, [{ id: 'fp', label: STR.settings.firstPerson }, { id: 'tp', label: STR.settings.thirdPerson }] as const,
    game.thirdPerson ? 'tp' : 'fp', (x) => setGame({ thirdPerson: x === 'tp' })).root);
  L.row(STR.view.bob, toggle(STR.view.bob, game.bob, (x) => setGame({ bob: x })));
  L.row(STR.view.shake, rangeSlider(STR.view.shake, 0, 1, 0.25, game.shake, (x) => setGame({ shake: x }), pct).root);
}

function prof(L: Ledger, c: RowsCtx): void {
  L.row(STR.profile.name, textField(STR.profile.name, profile.name, NAME_MAX, STR.profile.defaultName, (v) => setProfile({ name: v.trim() })));
  L.row(STR.profile.color, swatches(STR.profile.color, PLAYER_COLORS, profile.color, (col) => setProfile({ color: col }), STR.profile.colorName));
  let armed = false;
  const b = stampedButton(STR.profile.clearDo, () => {
    if (!armed) { armed = true; toast(c.layer, STR.profile.clearSure, true); setTimeout(() => { armed = false; }, 3000); return; }
    armed = false; clearProfile(); toast(c.layer, STR.profile.cleared);
  });
  L.row(STR.profile.clear, b);
}

export function buildRows(tab: Tab, c: RowsCtx): HTMLElement {
  const L = ledger();
  ({ gfx: () => gfx(L), audio: () => audio(L), controls: () => ctl(L, c), view: () => view(L), profile: () => prof(L, c) })[tab]();
  return L.root;
}
