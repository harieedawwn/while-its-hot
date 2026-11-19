import * as THREE from 'three';
import { MODULE_IDS, PLAYER_COLORS, WEAPON_IDS, type ModuleId } from '@wih/shared';
import { gripInHand } from '../combat/dummy';
import { hasClip } from '../player/character/clips';
import { loadWeapon } from '../weapons/weapon';
import { type AnimInput, IDLE_INPUT } from '../player/character/animator';
import { Character } from '../player/character/character';
import { LightRig } from '../render/lights';
import { MaterialLib } from '../render/materials/library';
import { mesh, slab } from '../render/models/kit';
import { num } from './params';
import type { SceneFactory } from './scenes';

/**
 * Character lineup (phase 06). `view=0` the 5 armor tiers, `view=1` the 6 modules on half plate, and
 * `clip=<id>` one character playing a clip: idle run run_b strafe_l strafe_r run_fl sprint jump fall slide dash
 * slam cling land forge_strike heat_hold block parry hit_f hit_b stagger death. `armor=0..10`, `mods=a,b`,
 * `color=0..5`, `weapon=<id>` in the right hand (attack clips: `clip=atk_sword_light1` etc.). `t` replays the animation to that time and freezes; `cam` overrides the camera.
 */
const RUN = 9;
const BASE: Record<string, Partial<AnimInput>> = {
  idle: {},
  run: { vz: -RUN }, run_b: { vz: RUN }, strafe_l: { vx: -RUN }, strafe_r: { vx: RUN },
  run_fl: { vx: -RUN * 0.707, vz: -RUN * 0.707 }, sprint: { vz: -14 },
  jump: { grounded: false, vy: 8 }, fall: { grounded: false, vy: -8 },
  slide: { sliding: true, vz: -12 }, dash: { dashing: true, vz: -24 }, slam: { slamming: true, grounded: false, vy: -40 }, cling: { clinging: true, grounded: false },
};
const ACTIONS = ['land', 'forge_strike', 'heat_hold', 'block', 'parry', 'hit_f', 'hit_b', 'stagger', 'death'];
const MOD_YAW: Record<ModuleId, number> = { phan_luc: 2.5, sung_may_vai: -0.5, no_vai: 0.55, banh_lan: 0.6, khien_tay: 0.7, binh_no: 0.65 };

const make: SceneFactory = async ({ pipeline, params, width, height }) => {
  const scene = new THREE.Scene();
  const rig = new LightRig();
  pipeline.bindRig(rig);
  rig.setHemi('#b8aca0', '#6a5444', 1.6);
  rig.setDir([0.4, 0.8, -0.5], '#c4ccd6', 1.5);
  rig.setFog('#1a100c', 9, 26);
  scene.background = rig.fogColor;
  const lib = await MaterialLib.load(rig, ['concrete', 'slag', 'cloth', 'steel', 'forged']);

  const clip = params.get('clip');
  const view = Math.round(num(params, 'view', 0));
  const color = PLAYER_COLORS[Math.max(0, Math.min(5, Math.round(num(params, 'color', 0))))];
  const chars: { c: Character; pos: THREE.Vector3Tuple; yaw: number; seedT: number }[] = [];
  const add = (armor: number, mods: ModuleId[], x: number, yaw: number, col: string = color) =>
    chars.push({ c: new Character(lib, { armor, modules: mods, color: col }), pos: [x, 0, 0], yaw, seedT: x * 0.37 });

  let cam: { pos: THREE.Vector3Tuple; look: THREE.Vector3Tuple; fov: number };
  if (clip) {
    const mods = (params.get('mods')?.split(',') ?? []).filter((m): m is ModuleId => (MODULE_IDS as readonly string[]).includes(m));
    add(num(params, 'armor', 0), mods, 0, 0);
    cam = { pos: [1.9, 1.15, -2.3], look: [0, 0.88, 0], fov: 40 };
  } else if (view === 1) {
    MODULE_IDS.forEach((m, i) => add(6, [m], (i - 2.5) * 1.5, Math.PI + MOD_YAW[m], PLAYER_COLORS[i]));
    cam = { pos: [0, 1.5, 6.4], look: [0, 0.95, 0], fov: 36 };
  } else {
    [0, 2, 4, 6, 8].forEach((lvl, i) => add(lvl, [], (i - 2) * 1.5, Math.PI + (i - 2) * -0.16, PLAYER_COLORS[i]));
    cam = { pos: [0, 1.45, 6.6], look: [0, 0.95, 0], fov: 36 };
  }
  const half = chars.length === 1 ? 2.6 : chars.length * 0.82 + 1;
  const floor = mesh(slab(half * 2 + 2, 0.4, chars.length === 1 ? 5.2 : 3, 1), lib.get('slag'), 'floor');
  floor.position.set(0, -0.2, 0);
  scene.add(floor);
  for (const ch of chars) {
    if (chars.length > 1) {
      const ped = mesh(slab(1.1, 0.12, 1.1, 1), lib.get('concrete'), 'ped');
      ped.position.set(ch.pos[0], 0.06, 0);
      scene.add(ped);
      ch.pos[1] = 0.12;
    }
    ch.c.root.position.set(...ch.pos); ch.c.root.rotation.y = ch.yaw;
    scene.add(ch.c.root);
  }
  rig.add([-2.4, 2.2, 3.2 * (clip ? -1 : 1)], '#ff9a54', 2.2, 9);
  rig.add([2.8, 1.6, 3 * (clip ? -1 : 1)], '#ffb878', 1.6, 8);
  rig.add([0, 2.6, -3 * (clip ? -1 : 1)], '#7ea4cc', 2.0, 8);

  const camera = new THREE.PerspectiveCamera(cam.fov, width / height, 0.1, 60);
  const c = params.cam;
  if (c && c.length >= 5) { camera.position.set(c[0], c[1], c[2]); camera.rotation.set(c[4], c[3], 0, 'YXZ'); }
  else { camera.position.set(...(c ? [c[0], c[1], c[2]] as THREE.Vector3Tuple : cam.pos)); camera.lookAt(...cam.look); }

  const wid = params.get('weapon');
  if (wid && WEAPON_IDS.includes(wid)) for (const ch of chars) ch.c.hold.hand_r.add(gripInHand(await loadWeapon(wid, { lib })));
  const inputFor = (): AnimInput => ({ ...IDLE_INPUT, ...(clip ? BASE[clip] : {}) });
  const input = inputFor();
  const isAction = (id: string) => ACTIONS.includes(id) || (id.startsWith('atk_') && hasClip(id));
  for (const ch of chars) if (clip && isAction(clip)) ch.c.anim.play(clip, { loop: clip !== 'death' && clip !== 'land' && !clip.startsWith('atk_'), hold: clip === 'death' || clip.startsWith('atk_') });
  const STEP = 1 / 60;
  const advance = (ch: (typeof chars)[number], dt: number) => ch.c.anim.update(dt, input);
  const frozen = params.t !== null;
  if (frozen) {
    const n = Math.round((params.t ?? 0) / STEP);
    for (const ch of chars) { for (let i = 0; i < n; i++) advance(ch, STEP); ch.c.refresh(); }
  }

  return {
    ready: true,
    update(dt) { if (frozen) return; for (const ch of chars) { advance(ch, dt); ch.c.refresh(); } },
    render() { pipeline.render(scene, camera); },
    resize(w, h) { camera.aspect = w / h; camera.updateProjectionMatrix(); },
    dispose() { chars.forEach((ch) => ch.c.dispose()); scene.traverse((o) => { if (o instanceof THREE.Mesh && o.name) o.geometry.dispose(); }); },
  };
};
export default make;
