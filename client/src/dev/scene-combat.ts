import { game } from '../core/game-settings';
import { SceneAudio } from '../audio/scene-audio';
import { foundryAmbience } from '../audio/places';
import * as THREE from 'three';
import { BALANCE, NO_FIGHT, PLAYER_COLORS, WEAPON_IDS, weaponById } from '@wih/shared';
import { CombatWorld } from '../combat/combat-world';
import { DUMMY_MODES, Dummy, type DummyMode, gripInHand } from '../combat/dummy';
import { FighterAnim } from '../combat/fighter-anim';
import { LocalFighter } from '../combat/local-fighter';
import { bus } from '../core/events';
import { FEEL } from '../core/feel';
import { FxLayer } from '../fx/fx-layer';
import { bindInput } from '../input/bind-input';
import { FirstPersonCamera } from '../player/camera';
import { IDLE_INPUT } from '../player/character/animator';
import { Character } from '../player/character/character';
import { animInputFromMove } from '../player/character/drive';
import { bindFeel } from '../player/feel-bind';
import { NO_INPUT } from '../player/move-state';
import { Player } from '../player/player';
import { ThirdPersonCamera } from '../player/third-person';
import { LightRig } from '../render/lights';
import { MaterialLib } from '../render/materials/library';
import { loadWeapon } from '../weapons/weapon';
import { applyFoundryLook, createFoundry } from '../world/foundry';
import { DEMOS, LINEUP, SETTLE_S } from './combat-demo';
import { createMoveHud } from './move-hud';
import { num } from './params';
import type { SceneFactory } from './scenes';
import { disposeTree } from '../render/dispose';

/**
 * Melee test (phase 08): a corner of Arena 1 with training dummies (idle, block, parry, counter, move).
 * KB+mouse or `touch=1` (aim assist on with touch, `aim=0|1` to force). Q cycles the player's weapon form.
 * Params: `weapon=<id>` `level=0..20` `dw=<dummy weapon>` `modes=a,b,..` `tp=1` third person.
 * Frozen shots: `demo=light1|light2|light3|heavy|charge|dash|parry|riposte|block&t=<s>` replays a scripted
 * run to t (after a settle) and freezes; `cam` overrides the camera. R resets, `window.__combat` = counters.
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
  const lib = await MaterialLib.load(rig, ['steel', 'rust', 'wood', 'cloth', 'forged']);
  const ctx = { lib, seed: params.seed };

  const fwd = new THREE.Vector3(-Math.sin(YAW), 0, -Math.cos(YAW)), right = new THREE.Vector3(Math.cos(YAW), 0, -Math.sin(YAW));
  const spot = (d: number, s: number): THREE.Vector3Tuple => ORIGIN.clone().addScaledVector(fwd, d).addScaledVector(right, s).toArray();

  const demo = DEMOS[params.get('demo') ?? ''] ?? null;
  const frozen = params.t !== null && demo !== null;
  let weaponId = params.get('weapon') ?? 'kiem_tho';
  if (!WEAPON_IDS.includes(weaponId)) weaponId = 'kiem_tho';
  const dw = weaponById(WEAPON_IDS.includes(params.get('dw') ?? '') ? params.get('dw')! : 'kiem_tho');

  const world = new CombatWorld();
  const c = params.cam;
  const player = new Player(arena.world, c ? [c[0], c[1] - FEEL.camera.eye, c[2]] : ORIGIN.toArray(), c && c.length >= 4 ? c[3] : YAW);
  if (c && c.length >= 5) player.pitch = c[4];
  const cam = new FirstPersonCamera(width / height);
  cam.hfov = num(params, 'fov', FEEL.camera.hfov);
  cam.shakeScale = num(params, 'shake', 1);
  const input = bindInput(document.getElementById('app')!, renderer.domElement, { touch: params.touch });
  const actions = input.actions;
  const lf = new LocalFighter(player, world, lib, weaponById(weaponId), await loadWeapon(weaponId, ctx), cam, width / height,
    { level: num(params, 'level', 0), aim: params.get('aim') ? params.get('aim') === '1' : !!input.touch });
  const unbindFeel = bindFeel(cam, lf.vm);

  // third person: the player's own body
  const tp = params.get('tp') ? params.get('tp') === '1' : game.thirdPerson;
  const tpCam = new ThirdPersonCamera();
  let body: Character | null = null, bodyAnim: FighterAnim | null = null, bodyWeapon: THREE.Object3D | null = null;
  const animIn = { ...IDLE_INPUT };
  if (tp) {
    body = new Character(lib, { color: PLAYER_COLORS[0] });
    bodyWeapon = gripInHand(await loadWeapon(weaponId, ctx));
    body.hold.hand_r.add(bodyWeapon);
    bodyAnim = new FighterAnim(body);
    scene.add(body.root);
  }

  // dummies: the demo's one in front, or the lineup across the corner
  const modes = (params.get('modes')?.split(',') ?? (demo ? [demo.front] : LINEUP)).filter((m): m is DummyMode => (DUMMY_MODES as readonly string[]).includes(m));
  const dummies: Dummy[] = [];
  const fxl = new FxLayer({ scene, rig, pipeline, world: arena.world, combat: world, seed: params.seed, blood: params.get('blood') === '0' ? false : undefined });
  fxl.trail(() => lf.vm.weapon, () => lf.c.fighter.attacking, (m) => lf.vm.attach(m));
  for (let i = 0; i < modes.length; i++) {
    const n = modes.length, pos = demo ? spot(demo.dist ?? 2.0, 0) : spot(n === 1 ? 2.6 : 4.4 - Math.abs(i - (n - 1) / 2) * 0.5, (i - (n - 1) / 2) * 1.8);
    const dm = await loadWeapon(dw.id, ctx);
    const d = new Dummy(i + 1, arena.world, lib, dw, dm, pos, YAW + Math.PI, modes[i], PLAYER_COLORS[(i + 1) % PLAYER_COLORS.length]);
    world.add(d.c); dummies.push(d); scene.add(d.ch.root);
    fxl.trail(() => dm, () => d.c.fighter.attacking, (m) => scene.add(m));
  }

  const stats = { hits: 0, parries: 0, blocks: 0, kills: 0, last: '', get me() { const f = lf.c.fighter; return `${f.phase} ${f.kind}${f.combo} #${f.swingId} t=${f.t.toFixed(3)} hp=${lf.c.hp}`; }, get dummies() { return dummies.map((d) => `${d.mode}:${d.c.fighter.phase}:${d.c.hp.toFixed(0)}`).join(' '); } };
  (window as unknown as { __combat: unknown }).__combat = stats;
  const offs = [
    bus.on('combat:hit', (e) => { stats.hits++; if (e.result === 'blocked') stats.blocks++; stats.last = `${e.attacker}>${e.target} ${e.result} ${e.dmg.toFixed(1)} ${e.zone}`; }),
    bus.on('combat:parry', () => { stats.parries++; }),
    bus.on('combat:kill', () => { stats.kills++; }),
    bus.on('move:slam', () => world.slam(lf.c)),
  ];

  const hud = createMoveHud(document.getElementById('app')!, BALANCE.move.stamina.pips);
  let formIdx = WEAPON_IDS.indexOf(weaponId);
  const swapForm = async () => {
    formIdx = (formIdx + 1) % WEAPON_IDS.length;
    const def = weaponById(WEAPON_IDS[formIdx]);
    lf.setWeapon(def, await loadWeapon(def.id, ctx));
    if (body && bodyWeapon) { bodyWeapon.removeFromParent(); disposeTree(bodyWeapon); bodyWeapon = gripInHand(await loadWeapon(def.id, ctx)); body.hold.hand_r.add(bodyWeapon); }
  };
  const reset = () => {
    player.s.pos.copy(ORIGIN); player.s.vel.set(0, 0, 0); player.yaw = YAW; player.pitch = 0; lf.c.revive();
    dummies.forEach((d) => d.respawn());
  };
  const dev = (e: KeyboardEvent) => { if (e.code === 'KeyR') reset(); };
  addEventListener('keydown', dev);

  const step = FEEL.simStep;
  const simTick = (dt: number, scripted: number | null) => {
    if (scripted === null) {
      if (actions.take('swap')) void swapForm();
      lf.tick(dt, actions);
      player.tick(dt, actions, lf.canAct);
    } else if (scripted < 0) {
      lf.tickWith(dt, NO_FIGHT);
      player.tickWith(dt, { ...NO_INPUT, yaw: player.yaw });
    } else {
      lf.tickWith(dt, demo!.fight(scripted, weaponId));
      player.tickWith(dt, { ...NO_INPUT, ...demo!.move?.(scripted), yaw: player.yaw });
    }
    for (const d of dummies) d.tick(dt, lf.c);
    world.tick(dt);
    bodyAnim?.sync(lf.c.fighter);
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
    if (body) {
      tpCam.apply(cam.camera, v, dt, arena.world);
      body.root.position.copy(v.pos); body.root.rotation.y = v.yaw;
      body.update(stop ? 0 : dt, animInputFromMove(player.s, v.yaw, animIn));
    }
    sa?.frame(dt, cam.camera.position, v.yaw, Math.hypot(player.s.vel.x, player.s.vel.z));
    fxl.update(stop ? 0 : dt, cam.camera);
  };

  if (frozen) {
    const ns = Math.round(SETTLE_S / step), n = Math.round((params.t ?? 0) / step);
    for (let i = 0; i < ns + n; i++) { simTick(step, i < ns ? -1 : (i - ns) * step); frame(step, 1); }
  }

  sa = frozen ? null : new SceneAudio({ world: arena.world, ambience: foundryAmbience(arena.ring) });
  let last = performance.now();
  return {
    ready: true,
    update(dt, time) {
      arena.update(dt, time);
      if (!frozen) simTick(dt, null);
    },
    render(alpha) {
      const now = performance.now();
      const fdt = frozen ? 0 : Math.min(0.1, (now - last) / 1000);
      last = now;
      if (!frozen) {
        input.poll(fdt);
        const look = actions.takeLook();
        const l = lf.look(look.dx, look.dy, fdt, Math.hypot(actions.move.x, actions.move.y) > 0.1);
        player.look(l.dx, l.dy);
        frame(fdt, alpha);
      }
      hud.update(player.s.stamina);
      pipeline.render(scene, cam.camera, tp ? undefined : lf.vm);
    },
    resize(w, h) { cam.resize(w / h); lf.vm.resize(w / h); },
    dispose() {
      sa?.dispose();
      offs.forEach((o) => o()); unbindFeel(); fxl.dispose(); lf.dispose(); dummies.forEach((d) => d.dispose()); body?.dispose();
      arena.dispose(); input.dispose(); hud.dispose(); removeEventListener('keydown', dev);
      scene.traverse((o) => { if (o instanceof THREE.Mesh) o.geometry.dispose(); });
    },
  };
};
export default make;
