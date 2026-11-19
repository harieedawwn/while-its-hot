import * as THREE from 'three';
import { ScreenMachine } from '../app/screens';
import { menuAmbience } from '../audio/places';
import { SceneAudio } from '../audio/scene-audio';
import { bus } from '../core/events';
import { FxLayer } from '../fx/fx-layer';
import { LightRig } from '../render/lights';
import { MaterialLib } from '../render/materials/library';
import { fontsReady, uiRoot } from '../ui/kit/dom';
import { MenuScreen, TitleScreen, wordmark } from '../ui/menu/menu-screens';
import { TABS } from '../ui/menu/settings-rows';
import { SettingsScreen } from '../ui/menu/settings-screen';
import { Smithy } from '../world/smithy';
import { Turntable } from '../world/turntable';
import { LobbyScreen } from '../ui/menu/lobby-screen';
import { ArmoryScreen } from '../ui/menu/armory-screen';
import { num } from './params';
import type { SceneFactory } from './scenes';

/**
 * Title + main menu (LOOK §8): a live shot of the night smithy, the tag strip in the left third, every select
 * is a helve-hammer blow on the anvil and then the destination's transition. Also the app's start scene.
 * Params: `screen=title|menu|settings|armory` (start screen), `tab=gfx|audio|controls|view|profile`, `sel=<weapon id>`, `focus=0..4`, frozen shots: `hit=<s>`
 * (hammer pose s into a strike), plus seed/t/cam. Keys: ↑/↓ + Enter, Esc = back.
 */
const TURN_AT = new THREE.Vector3(0.62, 1.3, 0.5);
/** Armory: slide the picture right so the anvil sits in the free right part of the screen. */
const ARMORY_SHIFT = 0.15;
const CAM = { pos: new THREE.Vector3(2.31, 1.42, 1.8), look: new THREE.Vector3(0.4, 0.96, 0.7) };

const make: SceneFactory = async ({ pipeline, params, width, height, app }) => {
  const scene = new THREE.Scene();
  const rig = new LightRig();
  pipeline.bindRig(rig);
  const lib = await MaterialLib.load(rig, ['brick', 'grate', 'steel', 'rust', 'concrete', 'wood', 'slag', 'coal']);
  const smithy = new Smithy(lib, rig, params.seed);
  scene.add(smithy.root);
  scene.background = rig.fogColor;
  const fxl = new FxLayer({ scene, rig, pipeline, seed: params.seed });
  const frozen = params.t !== null;
  const sa = frozen ? null : new SceneAudio({ area: 'room_small', ambience: menuAmbience() });

  const camera = new THREE.PerspectiveCamera(58, width / height, 0.05, 30);
  const c = params.cam;
  if (c && c.length >= 5) { camera.position.set(c[0], c[1], c[2]); camera.rotation.set(c[4], c[3], 0, 'YXZ'); }
  else { camera.position.copy(CAM.pos); camera.lookAt(CAM.look); }
  const basePos = camera.position.clone();
  // keep the anvil in the right two thirds: widen the view on narrow screens instead of cropping it
  let shift = 0, size = [width, height];
  const fit = (w: number, h: number) => { size = [w, h]; camera.aspect = w / h; camera.fov = w / h < 1.6 ? 54 : 46;
    if (shift) camera.setViewOffset(w, h, -shift * w, 0, w, h); else camera.clearViewOffset();
    camera.updateProjectionMatrix(); };
  fit(width, height);

  await fontsReady();
  const host = document.getElementById('app')!;
  const layer = uiRoot(host);
  const mark = wordmark(layer);
  const machine = new ScreenMachine();
  const turntable = new Turntable(lib, rig, TURN_AT);
  scene.add(turntable.root);
  const ctx = { layer, smithy, machine, app, turntable };
  const tabId = params.get('tab');
  const tab = TABS.find((t) => t === tabId) ?? 'gfx';
  machine.add('title', new TitleScreen(ctx)).add('menu', new MenuScreen(ctx)).add('armory', new ArmoryScreen(ctx, params.get('sel') ?? undefined)).add('online', new LobbyScreen(layer, () => void machine.go('menu', 'quench'), params.get('code') ?? undefined, () => void ctx.app.go('net', 'stamp'))).add('settings', new SettingsScreen(layer, () => void machine.go('menu', 'quench'), tab));
  const start = params.get('screen');
  const first = start === 'menu' || start === 'settings' || start === 'armory' || start === 'online' ? start : 'title';
  if (first === 'settings' || first === 'armory') await machine.go('menu', 'cut');
  await machine.go(first, 'cut');
  mark.style.display = machine.current === 'title' ? 'none' : '';
  const offScreen = () => {
    mark.style.display = machine.current === 'title' ? 'none' : '';
    const want = machine.current === 'armory' ? ARMORY_SHIFT : 0;
    if (want !== shift) { shift = want; fit(size[0], size[1]); }
  };
  const focus = num(params, 'focus', 0);
  for (let i = 0; i < focus; i++) dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
  const hit = params.get('hit');
  if (frozen && hit !== null) smithy.pose(num(params, 'hit', 0));

  const offs = [bus.on('app:back', () => { machine.back(); })];
  const dir = camera.getWorldDirection(new THREE.Vector3());
  const yaw = Math.atan2(-dir.x, -dir.z);
  let kick = 0, time = 0;

  return {
    ready: true,
    update(dt, t) {
      time = t;
      kick = smithy.update(dt, t, params.seed);
      turntable.update(dt, frozen ? t : null);
      machine.update(dt);
      offScreen();
    },
    render() {
      // the blow jolts the view a few mm and settles (no roll: the menu must stay readable)
      camera.position.copy(basePos);
      camera.position.y += kick * kick * 0.006 * Math.sin(time * 90);
      fxl.update(1 / 60, camera);
      sa?.frame(1 / 60, camera.position, yaw);
      pipeline.render(scene, camera);
    },
    resize(w, h) { fit(w, h); },
    dispose() {
      offs.forEach((o) => o());
      const cur = machine.current; if (cur) machine.get(cur)!.exit();
      layer.remove(); sa?.dispose(); fxl.dispose(); smithy.dispose();
    },
  };
};
export default make;
