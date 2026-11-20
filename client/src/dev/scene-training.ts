import * as THREE from 'three';
import { BALANCE, DpsWindow, ForgeSession, PLAYER_COLORS, YARD_MODES, type YardMode, formFor, rackOffers, trainingCaps, weaponById } from '@wih/shared';
import { foundryAmbience } from '../audio/places';
import { SceneAudio } from '../audio/scene-audio';
import { CombatWorld } from '../combat/combat-world';
import { Dummy } from '../combat/dummy';
import { LocalFighter } from '../combat/local-fighter';
import { bus } from '../core/events';
import { FEEL } from '../core/feel';
import { profile } from '../core/profile';
import { Anvil } from '../forge/anvil';
import { ForgeController } from '../forge/controller';
import { ForgeStage } from '../forge/stage';
import { FxLayer } from '../fx/fx-layer';
import { bindInput } from '../input/bind-input';
import { FirstPersonCamera } from '../player/camera';
import { bindFeel } from '../player/feel-bind';
import { Player } from '../player/player';
import { LightRig } from '../render/lights';
import { MaterialLib } from '../render/materials/library';
import { Yard } from '../training/yard';
import { ForgeHud } from '../ui/forge-hud';
import { Hud } from '../ui/hud/hud';
import { loadWeapon } from '../weapons/weapon';
import { applyFoundryLook, createFoundry } from '../world/foundry';
import { num } from './params';
import type { SceneFactory } from './scenes';

/**
 * Training yard (phase 15, GDD §10): the foundry's north-west corner with three dummies, your anvil (caps = profile
 * bestLevel, a strike past the cap is refused), a weapon rack of unlocked forms, an armor stand, a lever board that
 * cycles the dummies' mode and a chalkboard with the last hit and 5 s DPS. Near a station Rèn (E) uses it; at the
 * anvil it forges. The wall-jump shafts and the crane tower of Arena 1 are the movement course.
 * Params: `weapon=<id>` `level=` `armor=0..10` `mode=idle|block|counter|move` `touch=1` `cam=x,y,z,yaw,pitch` `t=` freeze.
 * Shots: `cam=-19,1.9,-21,0,0.05` (dummies) or `cam=-19.5,1.7,-22.5,0,0.05` (stations from the left). R resets, `window.__yard`.
 */
const ORIGIN = new THREE.Vector3(-18, 0.05, -17);
const YAW = 0;
const DUMMY_AT: THREE.Vector3Tuple[] = [[-20.4, 0.05, -21.4], [-18, 0.05, -22], [-15.6, 0.05, -21.4]];

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

  // forge session: caps from the profile; start with the chosen rack form
  let rs = params.seed * 7919 + 13;
  const rand = () => { rs = (rs + 0x6d2b79f5) >>> 0; let t = rs; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const session = new ForgeSession(rand);
  session.caps = trainingCaps(profile);
  const offers = rackOffers(profile);
  const setBlade = (id: string) => {
    const w = weaponById(id);
    session.blades[session.slot] = { family: w.family, level: w.minLevel, best: w.minLevel };
  };
  const lvl = Math.max(0, Math.floor(num(params, 'level', 0)));
  const want = params.get('weapon');
  if (want && offers.some((o) => o.id === want)) setBlade(want);
  else if (lvl > 0) session.blades[0] = { family: offers[1]?.family ?? null, level: lvl, best: lvl };
  session.armor = Math.max(0, Math.min(BALANCE.forge.armor.maxLevel, Math.floor(num(params, 'armor', 0))));
  const startForm = formFor(session.blade.family, session.blade.level);

  const lf = new LocalFighter(player, world, lib, weaponById(startForm.id), await load(startForm.id), cam, width / height,
    { level: session.blade.level, armor: session.armor, aim: params.get('aim') ? params.get('aim') === '1' : !!input.touch });
  const unbindFeel = bindFeel(cam, lf.vm);
  const anvil = new Anvil(lib, rig, arena.world, PLAYER_COLORS[0], lf.c.id);
  const stage = new ForgeStage(lib);
  anvil.root.add(stage.root);
  scene.add(anvil.root);
  const fhud = new ForgeHud(document.getElementById('app')!);
  const hud = new Hud(document.getElementById('app')!);
  const fxl = new FxLayer({ scene, rig, pipeline, world: arena.world, combat: world, stage, seed: params.seed });
  fxl.trail(() => lf.vm.weapon, () => lf.c.fighter.attacking, (m) => lf.vm.attach(m));

  // yard props
  const yard = new Yard(lib, rig);
  scene.add(yard.root);
  yard.setRack(offers, await Promise.all(offers.map((o) => load(o.id))));
  yard.setHeld(session.form.id);
  yard.setArmor(session.armor);
  let mode: YardMode = (YARD_MODES as readonly string[]).includes(params.get('mode') ?? '') ? (params.get('mode') as YardMode) : 'idle';
  yard.setMode(mode, false);

  const forge = new ForgeController({
    player, lf, anvil, stage, session, hud: fhud, touch: input.touch ?? undefined, loadModel: load, look: (k) => pipeline.setWarm(k),
    onArmor: (l) => { yard.setArmor(l); },
  });

  // dummies: stand in a row, mode set by the lever
  const dummies: Dummy[] = [];
  const dw = weaponById('kiem_tho');
  for (let i = 0; i < DUMMY_AT.length; i++) {
    const dm = await load(dw.id);
    const d = new Dummy(i + 1, arena.world, lib, dw, dm, DUMMY_AT[i], Math.PI, mode, PLAYER_COLORS[(i + 1) % PLAYER_COLORS.length]);
    world.add(d.c); dummies.push(d); scene.add(d.ch.root);
    fxl.trail(() => dm, () => d.c.fighter.attacking, (m) => scene.add(m));
  }

  // chalkboard: damage the player dealt
  const dps = new DpsWindow(5);
  let simT = 0;
  const stats = { hits: 0, refused: 0, station: '' as string, get mode() { return mode; }, get form() { return session.form.id; }, get armor() { return session.armor; }, get dps() { return dps.dps(simT); } };
  (window as unknown as { __yard: unknown }).__yard = stats;
  const offs = [
    bus.on('combat:hit', (e) => { if (e.attacker === lf.c.id && e.result !== 'blocked') { dps.add(simT, e.dmg); stats.hits++; } }),
    bus.on('fx:dmg', (e) => { if (e.by === lf.c.id) dps.add(simT, e.dmg); }),
    bus.on('forge:strike', (e) => { if (e.refused) stats.refused++; }),
  ];

  let touchOn = false;
  const useStation = (id: string) => {
    if (id === 'rack') {
      const i = offers.findIndex((o) => o.id === session.form.id);
      const next = offers[(i + 1) % offers.length];
      setBlade(next.id); yard.setHeld(next.id); void forge.syncWeapon(true);
    } else if (id === 'armor') {
      session.armor = (session.armor + 1) % (BALANCE.forge.armor.maxLevel + 1);
      lf.c.armor = session.armor; yard.setArmor(session.armor);
    } else {
      mode = YARD_MODES[(YARD_MODES.indexOf(mode) + 1) % YARD_MODES.length];
      for (const d of dummies) d.mode = mode;
      yard.setMode(mode);
    }
    bus.emit('ui:sound', { id: 'tap' });
  };
  const reset = () => {
    player.s.pos.copy(ORIGIN); player.s.vel.set(0, 0, 0); player.yaw = YAW; player.pitch = 0; lf.c.revive();
    forge.leave(); dummies.forEach((d) => d.respawn()); dps.reset(); world.effects.clear();
  };
  const dev = (e: KeyboardEvent) => { if (e.code === 'KeyR') reset(); };
  addEventListener('keydown', dev);

  const step = FEEL.simStep;
  const simTick = (dt: number) => {
    simT += dt;
    const st = yard.nearest(player.s.pos);
    stats.station = st ?? '';
    if (st && !forge.inStance && !anvil.inReach(player.s.pos) && actions.take('forge')) useStation(st);
    if (input.touch && (st !== null) !== touchOn) { touchOn = st !== null; if (!anvil.inReach(player.s.pos)) input.touch.setContext('forge', touchOn); }
    forge.tick(dt, actions);
    for (const d of dummies) d.tick(dt, lf.c);
    world.tick(dt);
    if (!lf.c.alive && lf.c.deadT > BALANCE.combat.respawnS) reset();
    if (player.s.pos.y < -20) reset();
  };
  let sa: SceneAudio | null = null;
  const frame = (dt: number, alpha: number) => {
    const v = player.viewState(alpha);
    cam.update(dt, v);
    lf.frame(dt, cam, v);
    const stop = cam.freezeS > 0;
    for (const d of dummies) d.render(dt, alpha, stop);
    forge.frame(dt, simT, cam);
    yard.update(dt);
    yard.chalkboard(dps.last, dps.dps(simT));
    hud.set({ hp: lf.c.hp, hpMax: BALANCE.combat.hp, stamina: player.s.stamina, staminaMax: BALANCE.move.stamina.pips,
      level: session.blade.level, family: session.blade.family, roundS: null, ringS: null, lives: null });
    sa?.frame(dt, cam.camera.position, v.yaw, Math.hypot(player.s.vel.x, player.s.vel.z));
    fxl.update(stop ? 0 : dt, cam.camera);
  };
  if (frozen) { for (let i = 0; i < 30; i++) { simTick(step); } for (let i = 0; i < 12; i++) frame(step, 1); }
  sa = frozen ? null : new SceneAudio({ world: arena.world, ambience: foundryAmbience(arena.ring) });
  let last = performance.now();
  return {
    ready: true,
    update(dt, t) { arena.update(dt, t); if (!frozen) simTick(dt); },
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
      offs.forEach((o) => o()); unbindFeel(); fxl.dispose(); lf.dispose(); forge.dispose(); fhud.dispose(); hud.dispose(); anvil.dispose(); yard.dispose();
      dummies.forEach((d) => d.dispose()); arena.dispose(); input.dispose(); removeEventListener('keydown', dev);
      scene.traverse((o) => { if (o instanceof THREE.Mesh) o.geometry.dispose(); });
    },
  };
};
export default make;

