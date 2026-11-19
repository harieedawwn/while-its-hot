import * as THREE from 'three';
import { FEEL } from '../core/feel';
import { PLAYER_COLORS } from '@wih/shared';
import { Anvil } from '../forge/anvil';
import { ForgeStage } from '../forge/stage';
import { StanceCamera } from '../forge/stance-cam';
import { bindFx, ringFx } from '../fx/fx-bind';
import { FxWorld } from '../fx/fx-world';
import { WeaponTrail } from '../fx/trail';
import { IDLE_INPUT } from '../player/character/animator';
import { Character } from '../player/character/character';
import { LightRig } from '../render/lights';
import { MaterialLib } from '../render/materials/library';
import { gripInHand } from '../combat/dummy';
import { loadWeapon, setHeat } from '../weapons/weapon';
import { applyFoundryLook, createFoundry } from '../world/foundry';
import { FX_IDS, FX_VIEW, type FxId, fireFx } from './fx-demo';
import { num } from './params';
import type { SceneFactory } from './scenes';

/**
 * VFX bench (phase 10). `fx=<id>` (strike levelup evolve break hit heavy clash parry slam trail ring molten)
 * fires that effect through the bus every `loop` s (default 1.8); the buttons along the bottom pick another.
 * `t=` fires once at 0 and freezes `t` s later (`?fx=evolve&t=0.2`). Also `heat=0..1` (blade on the anvil),
 * `blood=0` (Máu off), `view=stance` (forge effects from the stance camera), `ring=<m>`, `cam=` override.
 * `window.__fx` reports live particle counts.
 */
const ORIGIN = new THREE.Vector3(-18, 0.05, -17);
const TARGET = new THREE.Vector3(-14, 0.05, -18.5);
const STEP = 1 / 60;

const make: SceneFactory = async ({ pipeline, params, width, height }) => {
  const scene = new THREE.Scene();
  const rig = new LightRig();
  pipeline.bindRig(rig);
  applyFoundryLook(rig);
  const arena = await createFoundry(rig, params.seed);
  arena.setDoors(1);
  scene.add(arena.root);
  scene.background = rig.fogColor;
  const lib = await MaterialLib.load(rig, ['steel', 'rust', 'wood', 'cloth', 'forged', 'coal', 'paint', 'leather']);
  const ctx = { lib, seed: params.seed };
  const fxId: FxId = (FX_IDS as readonly string[]).includes(params.get('fx') ?? '') ? (params.get('fx') as FxId) : 'strike';
  const heat = num(params, 'heat', 0.5);

  // the anvil, placed and settled, with a blade on it
  const anvil = new Anvil(lib, rig, arena.world, PLAYER_COLORS[0], 0);
  const stage = new ForgeStage(lib);
  anvil.root.add(stage.root);
  scene.add(anvil.root);
  anvil.place(ORIGIN, 0);
  for (let i = 0; i < 90; i++) anvil.tick(STEP);
  anvil.animate();
  const models = { start: await loadWeapon('kiem_thep', ctx), next: await loadWeapon('kiem_ban_rong', ctx), phoi: await loadWeapon('phoi', ctx) };
  const swapBlade = (w: keyof typeof models) => { stage.setBlade(models[w]); stage.setHeat(heat); };
  swapBlade('start');

  // a body to hit, holding a sword that can swing
  const target = new Character(lib, { armor: 2, color: PLAYER_COLORS[1] });
  target.root.position.copy(TARGET); target.root.rotation.y = Math.PI;
  const sword = await loadWeapon('kiem_thep', ctx);
  target.hold.hand_r.add(gripInHand(sword));
  scene.add(target.root);
  const chest = TARGET.clone().add(new THREE.Vector3(0.05, 1.25, 0.24)); // front of the torso capsule
  const eye = TARGET.clone().add(new THREE.Vector3(0, FEEL.camera.eye, 2.3));

  const fx = new FxWorld(rig, params.seed);
  scene.add(fx.root);
  const trail = new WeaponTrail(rig, () => sword);
  scene.add(trail.mesh);
  const unbind = bindFx({ fx, stage, world: arena.world, posOf: (id) => (id === 0 ? eye : TARGET), blood: params.get('blood') === '0' ? false : undefined });
  if (fxId === 'ring') arena.setRing(0, num(params, 'ring', 9));

  // cameras
  const camera = new THREE.PerspectiveCamera(50, width / height, FEEL.camera.near, FEEL.camera.far);
  const look = (p: THREE.Vector3Tuple, at: THREE.Vector3Tuple, fov: number) => { camera.position.set(...p); camera.lookAt(...at); camera.fov = fov; camera.updateProjectionMatrix(); };
  const view = FX_VIEW[fxId];
  if (view === 'anvil') {
    if (params.get('view') === 'stance') { const sc = new StanceCamera(); for (let i = 0; i < 60; i++) sc.apply(STEP, true, anvil, camera); }
    else {
      anvil.root.updateMatrixWorld(true);
      const p = new THREE.Vector3(1.3, 1.45, 1.75).applyMatrix4(anvil.root.matrixWorld), at = new THREE.Vector3(-0.3, 0.62, 0).applyMatrix4(anvil.root.matrixWorld);
      look(p.toArray(), at.toArray(), 50);
    }
  } else if (view === 'target') look(eye.toArray(), [TARGET.x, TARGET.y + (fxId === 'slam' ? 0.3 : 1.1), TARGET.z], 62);
  else if (view === 'swing') look([TARGET.x - 0.5, TARGET.y + 1.55, TARGET.z + 2.3], [TARGET.x, TARGET.y + 1.15, TARGET.z], 50);
  else if (view === 'ring') look([3.5, 1.62, 2.5], [-6, 1.6, -3], 62);
  else look([14, 3.2, 4.5], [24, 0, 0], 55);
  const c = params.cam;
  if (c && c.length >= 5) { camera.position.set(c[0], c[1], c[2]); camera.rotation.set(c[4], c[3], 0, 'YXZ'); }
  camera.updateMatrixWorld();

  const swing = () => { target.anim.play('atk_sword_light1', { fadeIn: 0.02, fadeOut: 0.1 }); trail.clear(); };
  const deps = { stage, anvilPos: anvil.pos, swapBlade, chest, eye, feet: TARGET.clone().add(new THREE.Vector3(0, 0, 1.2)), swing, heat };

  let current: FxId = fxId, since = 0, time = 0;
  const loopS = num(params, 'loop', 1.8);
  const stats = { get sparks() { return fx.sparks.live; }, get puffs() { return fx.puffs.live; }, get decals() { return fx.decals.live; }, get shards() { return fx.shards.live; }, fx: current };
  (window as unknown as { __fx: unknown }).__fx = stats;

  const advance = (dt: number) => {
    time += dt; since += dt;
    target.update(dt, IDLE_INPUT);
    setHeat(sword, 0);
    stage.setHeat(heat);
    stage.update(dt, time);
    arena.update(dt, time);
    fx.update(dt, camera, pipeline.height);
    trail.update(dt);
    ringFx(fx, pipeline, arena.ring, camera.position, dt);
  };

  // dev buttons (ids only: this is a bench, not player-facing UI)
  const bar = document.createElement('div');
  bar.style.cssText = 'position:fixed;left:8px;right:8px;bottom:8px;display:flex;flex-wrap:wrap;gap:4px;z-index:5;font:12px monospace';
  if (!params.shot) for (const id of FX_IDS) {
    const b = document.createElement('button');
    b.textContent = id;
    b.style.cssText = 'background:#1a1210;color:#d8c8b8;border:1px solid #5a4030;padding:4px 8px';
    b.onclick = () => { const u = new URL(location.href); u.searchParams.set('fx', id); u.searchParams.delete('t'); location.href = u.toString(); };
    bar.appendChild(b);
  }
  document.body.appendChild(bar);

  const frozen = params.t !== null;
  if (frozen) {
    fireFx(current, deps);
    const n = Math.round((params.t ?? 0) / STEP);
    for (let i = 0; i < n; i++) advance(STEP);
    advance(0);
  } else fireFx(current, deps);

  return {
    ready: true,
    update(dt) {
      if (frozen) return;
      advance(dt);
      if (since >= loopS) { since = 0; fireFx(current, deps); }
    },
    render() { pipeline.render(scene, camera); },
    resize(w, h) { camera.aspect = w / h; camera.updateProjectionMatrix(); },
    dispose() {
      unbind(); fx.dispose(); trail.dispose(); anvil.dispose(); target.dispose(); arena.dispose(); bar.remove();
      pipeline.setHeatTint(0); current = 'strike';
      scene.traverse((o) => { if (o instanceof THREE.Mesh) o.geometry.dispose(); });
    },
  };
};
export default make;
