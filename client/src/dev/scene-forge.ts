import { SceneAudio } from '../audio/scene-audio';
import { foundryAmbience } from '../audio/places';
import * as THREE from 'three';
import { BALANCE, FAMILIES, type Family, ForgeSession, PLAYER_COLORS, type ModuleId, MODULE_IDS, formFor, weaponById } from '@wih/shared';
import { CombatWorld } from '../combat/combat-world';
import { DUMMY_MODES, Dummy, type DummyMode } from '../combat/dummy';
import { LocalFighter } from '../combat/local-fighter';
import { bus } from '../core/events';
import { FEEL } from '../core/feel';
import { Anvil } from '../forge/anvil';
import { ForgeController } from '../forge/controller';
import { ForgeStage } from '../forge/stage';
import { FxLayer } from '../fx/fx-layer';
import { bindInput } from '../input/bind-input';
import { FirstPersonCamera } from '../player/camera';
import { Character } from '../player/character/character';
import { bindFeel } from '../player/feel-bind';
import { Player } from '../player/player';
import { LightRig } from '../render/lights';
import { MaterialLib } from '../render/materials/library';
import { ForgeHud } from '../ui/forge-hud';
import { loadWeapon } from '../weapons/weapon';
import { applyFoundryLook, createFoundry } from '../world/foundry';
import { num } from './params';
import type { SceneFactory } from './scenes';

/**
 * Forge loop (phase 09): a corner of Arena 1, your own anvil. F (anvil button) places / lifts it; E (Rèn) at the
 * anvil enters the stance; there E strikes, hold left mouse (Đánh) heats the blade, Q (Đổi) toggles blade ↔ armor
 * (outside the stance it swaps the two weapon slots), right mouse (Đỡ) starts Nhập thần when the meter is full;
 * the stick, Lướt, Nhảy or Trượt leave. At +3 a 3-way family pick (1/2/3 or tap) opens for 3 s.
 * Presets: `level=0..20` `fam=kiem|bua|thuong` `heat=0..1` `armor=0..10` `mods=a,b` `target=armor`
 * `frenzy=1|0` (meter full / active) `caps=1` (training caps) `dummy=<mode>` (a foe that hits you out).
 * `stance=1` starts in the stance with the anvil placed; `placed=1` places only. Frozen shots (`t=`): `ring=0..1`,
 * `zone=0..1`, `pick=1` (family pick open), `hit=<s since strike>` (hammer mid-swing). R resets, `window.__forge`.
 */
const ORIGIN = new THREE.Vector3(-18, 0.05, -17);
const YAW = 0;

const make: SceneFactory = async ({ renderer, pipeline, params, width, height }) => {
  const scene = new THREE.Scene();
  const rig = new LightRig();
  pipeline.bindRig(rig);
  applyFoundryLook(rig);
  const arena = await createFoundry(rig, params.seed);
  arena.setDoors(1);
  scene.add(arena.root);
  scene.background = rig.fogColor;
  const lib = await MaterialLib.load(rig, ['steel', 'rust', 'wood', 'cloth', 'forged', 'coal', 'paint']);
  const ctx = { lib, seed: params.seed };
  const load = (id: string) => loadWeapon(id, ctx);

  const frozen = params.t !== null;
  const world = new CombatWorld();
  const c = params.cam;
  const player = new Player(arena.world, c ? [c[0], c[1] - FEEL.camera.eye, c[2]] : ORIGIN.toArray(), c && c.length >= 4 ? c[3] : YAW);
  if (c && c.length >= 5) player.pitch = c[4];
  const cam = new FirstPersonCamera(width / height);
  cam.hfov = num(params, 'fov', FEEL.camera.hfov);
  const input = bindInput(document.getElementById('app')!, renderer.domElement, { touch: params.touch });
  const actions = input.actions;

  // forge state from the presets
  let seed = params.seed * 7919 + 13;
  const rand = () => { seed = (seed + 0x6d2b79f5) >>> 0; let t = seed; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const session = new ForgeSession(rand);
  const lvl = Math.max(0, Math.min(BALANCE.weapons.maxLevel, Math.floor(num(params, 'level', 0))));
  const fam = FAMILIES.includes(params.get('fam') as Family) ? (params.get('fam') as Family) : 'kiem';
  session.blades[0] = { family: lvl >= BALANCE.weapons.familyPick && params.get('pick') !== '1' ? fam : null, level: lvl, best: lvl };
  session.armor = Math.max(0, Math.min(BALANCE.forge.armor.maxLevel, Math.floor(num(params, 'armor', 0))));
  session.target = params.get('target') === 'armor' ? 'armor' : 'blade';
  for (const m of (params.get('mods')?.split(',') ?? [])) if ((MODULE_IDS as readonly string[]).includes(m)) session.equip(m as ModuleId);
  if (params.get('caps') === '1') session.caps = { kiem: 6, bua: 6, thuong: 6 };
  const startForm = formFor(session.blade.family, lvl);

  const lf = new LocalFighter(player, world, lib, weaponById(startForm.id), await load(startForm.id), cam, width / height,
    { level: lvl, armor: session.armor, aim: params.get('aim') === '1' });
  const unbindFeel = bindFeel(cam, lf.vm);

  const anvil = new Anvil(lib, rig, arena.world, PLAYER_COLORS[0], lf.c.id);
  const stage = new ForgeStage(lib);
  anvil.root.add(stage.root);
  scene.add(anvil.root);
  const hud = new ForgeHud(document.getElementById('app')!);
  const fxl = new FxLayer({ scene, rig, pipeline, world: arena.world, combat: world, stage, seed: params.seed });
  // the smith's own body is invisible in first person; keep one hidden Character only to prove armor builds at every level
  const body = new Character(lib, { armor: session.armor, modules: session.modules });
  const forge = new ForgeController({
    player, lf, anvil, stage, session, hud, touch: input.touch ?? undefined, loadModel: load,
    onArmor: (l) => body.setArmor(l, session.modules),
  });

  // an optional foe, to test being hit out of the stance
  const dm = params.get('dummy');
  const dummy = dm && (DUMMY_MODES as readonly string[]).includes(dm)
    ? new Dummy(1, arena.world, lib, weaponById('kiem_tho'), await load('kiem_tho'), [ORIGIN.x + 4, ORIGIN.y, ORIGIN.z - 1.5], 2.4, dm as DummyMode, PLAYER_COLORS[1])
    : null;
  if (dummy) { world.add(dummy.c); scene.add(dummy.ch.root); }

  const stats = { strikes: 0, last: '', get session() { return `${session.blade.family}+${session.blade.level} best ${session.blade.best} armor ${session.armor} heat ${session.heat.toFixed(2)} meter ${session.frenzyMeter}`; }, get anvil() { return anvil.phase; }, get stance() { return forge.inStance; } };
  (window as unknown as { __forge: unknown }).__forge = stats;
  const offs = [
    bus.on('forge:strike', (e) => { stats.strikes++; stats.last = `${e.target} ${e.outcome}${e.perfect ? '!' : ''}${e.refused ? ' refused' : ''}${e.broke ? ' BROKE' : ''} +${e.level}`; }),
  ];

  const reset = () => {
    player.s.pos.copy(ORIGIN); player.s.vel.set(0, 0, 0); player.yaw = YAW; player.pitch = 0; lf.c.revive();
    forge.leave(); dummy?.respawn();
  };
  const dev = (e: KeyboardEvent) => { if (e.code === 'KeyR') reset(); };
  addEventListener('keydown', dev);

  const step = FEEL.simStep;
  let time = 0;
  const simTick = (dt: number) => {
    forge.tick(dt, actions);
    dummy?.tick(dt, lf.c);
    world.tick(dt);
    if (!lf.c.alive && lf.c.deadT > BALANCE.combat.respawnS) reset();
    if (player.s.pos.y < -20) reset();
  };
  let sa: SceneAudio | null = null;
  const frame = (dt: number, alpha: number) => {
    const v = player.viewState(alpha);
    cam.update(dt, v);
    lf.frame(dt, cam, v);
    dummy?.render(dt, alpha, cam.freezeS > 0);
    forge.frame(dt, time, cam);
    sa?.frame(dt, cam.camera.position, v.yaw, Math.hypot(player.s.vel.x, player.s.vel.z));
    fxl.update(cam.freezeS > 0 ? 0 : dt, cam.camera);
  };

  // presets that start placed / in the stance
  const startPlaced = params.get('placed') === '1' || params.get('stance') === '1';
  if (startPlaced) {
    for (let i = 0; i < 20; i++) simTick(step);
    anvil.place(player.s.pos, player.yaw);
    for (let i = 0; i < Math.round(0.8 / step); i++) { simTick(step); anvil.animate(); }
  }
  if (params.get('stance') === '1') {
    forge.enter();
    for (let i = 0; i < Math.round(0.6 / step); i++) { simTick(step); frame(step, 1); }
  }
  session.heat = Math.max(0, Math.min(1, num(params, 'heat', 0)));
  if (params.get('frenzy') === '1') session.frenzyMeter = BALANCE.forge.frenzy.full;
  if (params.get('frenzy') === 'on') { session.frenzyMeter = BALANCE.forge.frenzy.full; session.activateFrenzy(); }
  if (frozen) {
    for (let i = 0; i < 12; i++) frame(step, 1);
    session.ring = num(params, 'ring', 0.12); session.zoneC = num(params, 'zone', 0.5);
    if (params.get('hit')) { stage.strike(); time = 0; }
    time = params.t ?? 0;
    if (params.get('pick') === '1' && lvl >= BALANCE.weapons.familyPick) { session.pendingPick = 0; hud.openPick(session.lastFamily, BALANCE.forge.stance.pickS, (f) => { session.pickFamily(f); }); }
    stage.update(num(params, 'hit', 0), time);
    forge.frame(0, time, cam);
  }

  sa = frozen ? null : new SceneAudio({ world: arena.world, ambience: foundryAmbience(arena.ring) });
  let last = performance.now();
  return {
    ready: true,
    update(dt, t) {
      arena.update(dt, t); time = t;
      if (!frozen) simTick(dt);
    },
    render(alpha) {
      const now = performance.now(), fdt = Math.min(0.1, (now - last) / 1000);
      last = now;
      if (!frozen) {
        input.poll(fdt);
        const look = actions.takeLook();
        const mv = forge.inStance ? { dx: 0, dy: 0 } : lf.look(look.dx, look.dy, fdt, Math.hypot(actions.move.x, actions.move.y) > 0.1);
        player.look(mv.dx, mv.dy);
        frame(fdt, alpha);
      }
      pipeline.render(scene, cam.camera, forge.showViewmodel ? lf.vm : undefined);
    },
    resize(w, h) { cam.resize(w / h); lf.vm.resize(w / h); },
    dispose() {
      sa?.dispose();
      offs.forEach((o) => o()); unbindFeel(); fxl.dispose(); lf.dispose(); forge.dispose(); hud.dispose(); anvil.dispose(); body.dispose();
      arena.dispose(); input.dispose(); removeEventListener('keydown', dev);
      scene.traverse((o) => { if (o instanceof THREE.Mesh) o.geometry.dispose(); });
    },
  };
};
export default make;
