import * as THREE from 'three';
import { BALANCE } from '@wih/shared';
import { bus } from '../core/events';
import { FEEL } from '../core/feel';
import { bindInput } from '../input/bind-input';
import { openLayoutEditor } from '../input/layout-editor';
import { CollisionWorld } from '../physics/world';
import { FirstPersonCamera } from '../player/camera';
import { bindFeel } from '../player/feel-bind';
import { NO_INPUT, type MoveInput } from '../player/move-state';
import { Player } from '../player/player';
import { Viewmodel } from '../player/viewmodel';
import { bakeAO } from '../render/geo/ao';
import { StaticBatch } from '../render/geo/static-batch';
import { LightRig } from '../render/lights';
import { MaterialLib } from '../render/materials/library';
import { hammer } from '../render/models/props';
import { createMoveHud } from './move-hud';
import { buildCourse, COURSE } from './movement-course';
import { num } from './params';
import type { SceneFactory } from './scenes';

/**
 * Movement test course (phase 02). Keyboard + mouse (click to lock), or `touch=1` for the on-screen controls (`editor=1` opens the layout editor). Dev keys: R respawn, H hit-stop + shake.
 * Params: fov=75..110, bob=0, shake=0..1, and with `t` a scripted run (demo=slide|dash|slam) is replayed
 * to time t and frozen, e.g. `t=0.9` = mid-slide.
 */
type Script = (t: number) => Partial<MoveInput>;
/** Each demo: input over time, and the view yaw it runs with. */
const DEMOS: Record<string, { yaw: number; input: Script }> = {
  slide: { yaw: 0.42, input: (t) => ({ my: 1, mx: t > 0.5 ? 0.3 : 0, slideHeld: t > 0.4, slidePressed: Math.abs(t - 0.41) < 0.009 }) },
  dash: { yaw: 0, input: (t) => ({ my: 1, dashPressed: Math.abs(t - 0.5) < 0.009 }) },
  slam: { yaw: 0, input: (t) => ({ my: 0.4, jumpPressed: t < 0.01, slidePressed: Math.abs(t - 0.35) < 0.009, slideHeld: t > 0.35 }) },
};

const make: SceneFactory = async ({ renderer, pipeline, params, width, height }) => {
  const scene = new THREE.Scene();
  const rig = new LightRig();
  pipeline.bindRig(rig);
  rig.setHemi('#6e6258', '#4a3020', 1.0);
  rig.setDir([0.45, 0.75, 0.3], '#8a9aaa', 0.75);
  rig.setFog('#241a14', 18, 62);
  scene.background = rig.fogColor;
  COURSE.lights.forEach((p, i) => rig.add(p, i % 2 ? '#ffa060' : '#ff8a44', 3.2, 16));

  const lib = await MaterialLib.load(rig, ['brick', 'grate', 'steel', 'rust', 'concrete', 'wood', 'slag']);
  const ctx = { lib, seed: params.seed };
  const batch = new StaticBatch();
  buildCourse(batch, lib, ctx);
  const statics = batch.build();
  bakeAO(statics, { rays: 10, dist: 1.6, strength: 0.7 });
  statics.forEach((m) => scene.add(m));
  const world = CollisionWorld.fromMeshes(statics);

  const c = params.cam;
  const spawn: THREE.Vector3Tuple = c ? [c[0], c[1] - FEEL.camera.eye, c[2]] : [...COURSE.spawn];
  const yaw0 = c && c.length >= 4 ? c[3] : 0;
  let player = new Player(world, spawn, yaw0);
  if (c && c.length >= 5) player.pitch = c[4];

  const cam = new FirstPersonCamera(width / height);
  cam.hfov = num(params, 'fov', FEEL.camera.hfov);
  cam.bobOn = params.get('bob') !== '0';
  cam.shakeScale = num(params, 'shake', 1);
  const tool = hammer(ctx, 0.44, 0.16);
  // lower-right hold: head across the view in 3/4, leaned left and away, center of the screen clear
  tool.position.set(0.06, -0.16, 0);
  tool.rotation.set(-0.7, 0.35, 0.35, 'XZY');
  const vm = new Viewmodel(tool, width / height);
  const unbindFeel = bindFeel(cam, vm);

  const input = bindInput(document.getElementById('app')!, renderer.domElement, { touch: params.touch });
  const actions = input.actions;
  if (input.touch) {
    input.touch.setContext('forge', true);
    input.touch.setContext('anvil', true);
    if (params.get('editor') === '1') void openLayoutEditor(input.touch);
  }
  const hud = createMoveHud(document.getElementById('app')!, BALANCE.move.stamina.pips);
  const respawn = () => { player = new Player(world, [...COURSE.spawn], 0); };
  const dev = (e: KeyboardEvent) => {
    if (e.code === 'KeyR') respawn();
    if (e.code === 'KeyH') { bus.emit('cam:hitstop', { ms: 70 }); bus.emit('cam:trauma', { amount: 0.45 }); vm.kick(1); }
  };
  addEventListener('keydown', dev);

  const step = FEEL.simStep;
  const frozen = params.t !== null;
  if (frozen) {
    // deterministic replay of a scripted run up to t, camera stepped with the sim
    const demo = DEMOS[params.get('demo') ?? 'slide'] ?? DEMOS.slide;
    if (!c) player.yaw = demo.yaw;
    const n = Math.round((params.t ?? 0) / step);
    for (let i = 0; i < n; i++) {
      player.tickWith(step, { ...NO_INPUT, ...demo.input(i * step), yaw: player.yaw });
      const v = player.viewState(1);
      cam.update(step, v);
      vm.update(step, cam, v);
    }
  }

  let last = performance.now();
  return {
    ready: true,
    update(dt) {
      if (frozen) return;
      player.tick(dt, actions);
      if (player.s.pos.y < -20) respawn();
    },
    render(alpha) {
      const now = performance.now();
      const fdt = frozen ? 0 : Math.min(0.1, (now - last) / 1000);
      last = now;
      input.poll(fdt);
      const look = actions.takeLook();
      if (!frozen) player.look(look.dx, look.dy);
      const v = player.viewState(alpha);
      cam.update(fdt, v);
      vm.update(fdt, cam, v);
      hud.update(player.s.stamina);
      pipeline.render(scene, cam.camera, vm);
    },
    resize(w, h) { cam.resize(w / h); vm.resize(w / h); },
    dispose() {
      unbindFeel(); input.dispose(); hud.dispose(); removeEventListener('keydown', dev);
      scene.traverse((o) => { if (o instanceof THREE.Mesh) o.geometry.dispose(); });
    },
  };
};
export default make;
