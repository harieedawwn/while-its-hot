import * as THREE from 'three';
import { PLAYER_COLORS } from '@wih/shared';
import { foundryAmbience } from '../audio/places';
import { SceneAudio } from '../audio/scene-audio';
import { FEEL } from '../core/feel';
import { bindInput } from '../input/bind-input';
import { LightRig } from '../render/lights';
import { applyFoundryLook, createFoundry } from '../world/foundry';
import { Hud } from '../ui/hud/hud';
import { PauseMenu, Scoreboard } from '../ui/hud/overlays';
import { fontsReady, uiRoot } from '../ui/kit/dom';
import { num } from './params';
import type { SceneFactory } from './scenes';

/**
 * HUD bench (LOOK §8) over the foundry. Params: `hp=0..100` `sta=0..3` `level=0..20` `fam=kiem|bua|thuong` `round=<s>` `ring=<s>`
 * (omit = hidden) `lives=<left>/<max>`, `feed=1` kill feed lines, `score=1` scoreboard, `pause=1` pause menu, `touch=1` shows the
 * touch controls under it (overlap check). Keys: Tab = scoreboard, Esc = pause.
 */
const make: SceneFactory = async ({ pipeline, params, width, height }) => {
  const scene = new THREE.Scene();
  const rig = new LightRig();
  pipeline.bindRig(rig);
  applyFoundryLook(rig);
  scene.background = rig.fogColor;
  const arena = await createFoundry(rig, params.seed);
  scene.add(arena.root);
  const camera = new THREE.PerspectiveCamera(FEEL.fov, width / height, FEEL.camera.near, FEEL.camera.far);
  camera.position.set(4.8, 2.5, 4.8);
  camera.lookAt(-20, 2.4, -12);
  const sa = params.t !== null ? null : new SceneAudio({ world: arena.world, ambience: foundryAmbience(arena.ring) });

  await fontsReady();
  const host = document.getElementById('app')!;
  const input = bindInput(host, host, { touch: params.touch });
  const hud = new Hud(host);
  const fam = params.get('fam');
  const family = fam === 'bua' || fam === 'thuong' ? fam : 'kiem';
  const [ll, lm] = (params.get('lives') ?? '2/3').split('/').map(Number);
  const opt = (k: string) => (params.get(k) === null ? null : num(params, k, 0));
  hud.set({
    hp: num(params, 'hp', 70), hpMax: 100, stamina: num(params, 'sta', 2), staminaMax: 3,
    level: num(params, 'level', 12), family, roundS: opt('round') ?? 154, ringS: opt('ring') ?? 38, lives: { left: ll, max: lm },
  });
  if (params.get('feed') === '1') {
    hud.kill('Tuấn', 'Hằng', 'bua', false, 1e9);
    hud.kill('Bạn', 'Nguyễn Văn Ấn', 'thuong', true, 1e9);
    hud.kill('Minh', 'Bạn', 'kiem', false, 1e9);
  }
  const layer = uiRoot(host);
  const board = new Scoreboard(layer);
  const rows = [
    { name: 'Bạn', color: PLAYER_COLORS[0], family: 'kiem' as const, level: 12, kills: 4, deaths: 1, me: true },
    { name: 'Tuấn', color: PLAYER_COLORS[1], family: 'bua' as const, level: 9, kills: 3, deaths: 2 },
    { name: 'Hằng', color: PLAYER_COLORS[2], family: 'thuong' as const, level: 14, kills: 6, deaths: 3 },
    { name: 'Minh', color: PLAYER_COLORS[3], family: null, level: 2, kills: 0, deaths: 4 },
  ];
  if (params.get('score') === '1') board.show(rows);
  const pause = new PauseMenu(layer, { resume: () => pause.hide(), settings: () => {}, leave: () => {} });
  if (params.get('pause') === '1') pause.show();
  const tab = (e: KeyboardEvent) => { if (e.key === 'Tab') { e.preventDefault(); if (e.type === 'keydown') board.show(rows); else board.hide(); } };
  addEventListener('keydown', tab); addEventListener('keyup', tab);

  return {
    ready: true,
    update(dt) { input.poll(dt); sa?.frame(dt, camera.position, camera.rotation.y); arena.update(dt, 0); },
    render() { pipeline.render(scene, camera); },
    resize(w, h) { camera.aspect = w / h; camera.updateProjectionMatrix(); },
    dispose() { removeEventListener('keydown', tab); removeEventListener('keyup', tab); hud.dispose(); layer.remove(); input.dispose(); sa?.dispose(); arena.dispose(); },
  };
};
export default make;
