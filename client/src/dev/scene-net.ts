import * as THREE from 'three';
import { BALANCE, ForgeSession, PLAYER_COLORS, SAFE_RESPAWN, weaponById } from '@wih/shared';
import { foundryAmbience } from '../audio/places';
import { SceneAudio } from '../audio/scene-audio';
import { CombatWorld } from '../combat/combat-world';
import { LocalFighter } from '../combat/local-fighter';
import { FEEL } from '../core/feel';
import { profile } from '../core/profile';
import { Anvil } from '../forge/anvil';
import { ForgeController } from '../forge/controller';
import { ForgeStage } from '../forge/stage';
import { FxLayer } from '../fx/fx-layer';
import { bindInput } from '../input/bind-input';
import { room as current, RoomClient } from '../net/client';
import { serverBase } from '../net/config';
import { simFromParams } from '../net/link-sim';
import { Loopback } from '../net/loopback';
import { NetDebug } from '../net/net-debug';
import { NetMatch } from '../net/net-match';
import { FirstPersonCamera } from '../player/camera';
import { bindFeel } from '../player/feel-bind';
import { Player } from '../player/player';
import { LightRig } from '../render/lights';
import { MaterialLib } from '../render/materials/library';
import { ForgeHud } from '../ui/forge-hud';
import { Hud } from '../ui/hud/hud';
import { STR } from '../ui/strings.vi';
import { loadWeapon } from '../weapons/weapon';
import { applyFoundryLook, createFoundry } from '../world/foundry';
import { num } from './params';
import type { SceneFactory } from './scenes';

/**
 * Online match (phase 17, TECH §4): Arena 1 with remote players, server-judged hits, server-rolled forging,
 * replicated anvils and blanks. Rounds/lives/scoring are phase 18. The room comes from the lobby
 * (`room.current`), or `code=ABCD` joins a real room (`server=` as usual; ready is sent at once), or with neither
 * an in-process loopback room runs `bots=2` NetBots (`truce=0`, `near=1` puts them in front of you, `passive=1`).
 * Bad network: `lag=150&jitter=20&loss=0.05`. `netdebug=1` shows the net overlay (always on in dev builds).
 */
const make: SceneFactory = async ({ renderer, pipeline, params, width, height }) => {
  const q = new URLSearchParams(location.search);
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

  const world = new CombatWorld();
  const c = params.cam, [sx, sz] = SAFE_RESPAWN[0];
  const start: [number, number, number] = c ? [c[0], c[1] - FEEL.camera.eye, c[2]] : [sx, 0.1, sz];
  const player = new Player(arena.world, start, c && c.length >= 4 ? c[3] : Math.atan2(sx, sz));
  if (c && c.length >= 5) player.pitch = c[4];
  const cam = new FirstPersonCamera(width / height);
  cam.hfov = num(params, 'fov', FEEL.camera.hfov);
  const input = bindInput(document.getElementById('app')!, renderer.domElement, { touch: params.touch });
  const actions = input.actions;

  const session = new ForgeSession(Math.random);
  session.carried = 1;
  const phoi = weaponById('phoi');
  const lf = new LocalFighter(player, world, lib, phoi, await load(phoi.id), cam, width / height,
    { aim: params.get('aim') ? params.get('aim') === '1' : !!input.touch });
  const unbindFeel = bindFeel(cam, lf.vm);
  const myColor = Math.max(0, PLAYER_COLORS.indexOf(profile.color as (typeof PLAYER_COLORS)[number]));
  const anvil = new Anvil(lib, rig, arena.world, PLAYER_COLORS[myColor], lf.c.id);
  const stage = new ForgeStage(lib);
  anvil.root.add(stage.root);
  scene.add(anvil.root);
  const host = document.getElementById('app')!;
  const fhud = new ForgeHud(host);
  const hud = new Hud(host);

  // the room: from the lobby, a code, or an in-process loopback with bots
  const sim = simFromParams(q);
  let loop: Loopback | null = null;
  let rc = current.current;
  if (!rc) {
    const code = params.get('code');
    const who = { name: profile.name || STR.profile.defaultName, color: myColor };
    const h = { lobby: () => {}, start: () => {}, err: () => {}, link: (s: string) => { if (s === 'up') rc!.send({ t: 'ready', v: true }); } };
    if (code) rc = new RoomClient(serverBase(), code.toUpperCase(), who, h, { sim });
    else {
      loop = new Loopback({ bots: Math.max(0, Math.min(5, Math.floor(num(params, 'bots', 2)))), truce: num(params, 'truce', 0), seed: params.seed,
        near: params.get('near') === '1' ? { p: start, yaw: player.yaw } : undefined, passive: params.get('passive') === '1' });
      rc = new RoomClient('http://loop', 'LOOP', who, h, { sim, socket: loop.socket });
    }
    rc.connect();
  }
  const roomC = rc;

  let forge: ForgeController | null = null;
  const net = new NetMatch({
    room: roomC, scene, combat: world, collision: arena.world, lib, rig, load, lf, player, session, stage, anvil, hud,
    forging: () => forge?.inStance ?? false,
    died: () => forge?.leave(),
    spawned: (p, yaw) => { player.s.pos.set(p[0], p[1], p[2]); player.s.vel.set(0, 0, 0); player.yaw = yaw; player.pitch = 0; },
  });
  forge = new ForgeController({ player, lf, anvil, stage, session, hud: fhud, touch: input.touch ?? undefined, loadModel: load, link: net.forge });
  net.forge.controller = forge;
  const fxl = new FxLayer({ scene, rig, pipeline, world: arena.world, combat: world, stage, seed: params.seed });
  fxl.trail(() => lf.vm.weapon, () => lf.c.fighter.attacking, (m) => lf.vm.attach(m));
  const debug = params.get('netdebug') === '1' || (import.meta.env.DEV && params.get('netdebug') !== '0') ? new NetDebug(host, net, sim) : null;
  (window as unknown as { __net: unknown }).__net = net;

  let touchOn = false;
  const simTick = (dt: number) => {
    const f = forge!;
    const pk = net.pickups.nearest(player.s.pos), atAnvil = anvil.inReach(player.s.pos);
    if (pk !== null && !f.inStance && !atAnvil && lf.c.alive && actions.take('forge')) net.take(pk);
    if (input.touch && (pk !== null) !== touchOn) { touchOn = pk !== null; if (!atAnvil) input.touch.setContext('forge', touchOn); }
    net.simTick(dt);
    f.tick(dt, actions);
    world.tick(dt);
    if (player.s.pos.y < -20) { player.s.pos.set(...start); player.s.vel.set(0, 0, 0); }
  };
  let sa: SceneAudio | null = null;
  let readyAt = 0;
  const frame = (dt: number, alpha: number) => {
    const v = player.viewState(alpha);
    cam.update(dt, v);
    lf.frame(dt, cam, v);
    const stop = cam.freezeS > 0;
    net.frame(dt, stop);
    forge!.frame(dt, performance.now() / 1000, cam);
    const truce = net.truceLeft;
    hud.set({ hp: lf.c.hp, hpMax: BALANCE.combat.hp, stamina: player.s.stamina, staminaMax: BALANCE.move.stamina.pips,
      level: session.blade.level, family: session.blade.family, roundS: truce > 0 ? truce : null, ringS: null, lives: null });
    sa?.frame(dt, cam.camera.position, v.yaw, Math.hypot(player.s.vel.x, player.s.vel.z));
    fxl.update(stop ? 0 : dt, cam.camera);
    debug?.update();
  };
  sa = new SceneAudio({ world: arena.world, ambience: foundryAmbience(arena.ring) });
  let last = performance.now();
  const out = {
    ready: false,
    update(dt: number, t: number) { arena.update(dt, t); simTick(dt); },
    render(alpha: number) {
      const now = performance.now(), fdt = Math.min(0.1, (now - last) / 1000);
      last = now;
      input.poll(fdt);
      const look = actions.takeLook();
      const mv = forge!.inStance ? { dx: 0, dy: 0 } : lf.look(look.dx, look.dy, fdt, Math.hypot(actions.move.x, actions.move.y) > 0.1);
      player.look(mv.dx, mv.dy);
      frame(fdt, alpha);
      pipeline.render(scene, cam.camera, forge!.showViewmodel ? lf.vm : undefined);
      // final frame for shots: the match is on and remotes are drawn (or a few seconds passed)
      if (!out.ready && net.started) { readyAt ||= now; if (now - readyAt > num(params, 'settle', 1500)) out.ready = true; }
    },
    resize(w: number, h: number) { cam.resize(w / h); lf.vm.resize(w / h); },
    dispose() {
      sa?.dispose(); debug?.dispose(); net.dispose(); loop?.stop();
      roomC.close(); if (current.current === roomC) current.current = null;
      unbindFeel(); fxl.dispose(); lf.dispose(); forge!.dispose(); fhud.dispose(); hud.dispose(); anvil.dispose();
      arena.dispose(); input.dispose();
      scene.traverse((o) => { if (o instanceof THREE.Mesh) o.geometry.dispose(); });
    },
  };
  return out;
};
export default make;
