import * as THREE from 'three';
import { LightRig } from '../render/lights';
import { MaterialLib } from '../render/materials/library';
import * as Anvil from '../render/models/anvil';
import { hammer } from '../render/models/props';
import { SparkPool } from '../fx/sparks';
import { loadWeapon, setHeat } from '../weapons/weapon';
import { num } from './params';
import type { SceneFactory } from './scenes';

/**
 * App icon / splash source (phase 23): anvil close-up, a blade at forging heat on it, hammer frozen
 * mid-strike, a few sparks, one warm key from the blade, black all around. Square framing; run with
 * `res=native` (the shot tool adds it for the `icon` device). Params: weapon (default kiem_thep), heat, fov.
 */
const make: SceneFactory = async ({ pipeline, params, width, height }) => {
  const scene = new THREE.Scene();
  const rig = new LightRig();
  pipeline.bindRig(rig);
  rig.setHemi('#100c0a', '#080403', 0.4);
  rig.setDir([-0.4, 0.5, 0.8], '#5a6a7a', 0.35);
  rig.setFog('#050302', 6, 14);
  scene.background = rig.fogColor;
  const lib = await MaterialLib.load(rig, ['steel', 'wood', 'forged', 'rust']);
  const ctx = { lib, seed: params.seed };

  const anvil = Anvil.build(ctx);
  anvil.position.set(0, 0, 0);
  anvil.rotation.y = -0.25;
  scene.add(anvil);
  anvil.updateMatrixWorld(true);
  const face = (anvil.userData.sockets.face as THREE.Vector3).clone().applyMatrix4(anvil.matrixWorld);

  const heat = num(params, 'heat', 0.82);
  const blade = await loadWeapon(params.get('weapon') ?? 'kiem_tho', ctx);
  setHeat(blade, heat);
  blade.scale.setScalar(1.0);
  blade.rotation.set(Math.PI, 0, -Math.PI / 2);
  blade.position.set(face.x - 0.42, face.y + 0.03, face.z);
  scene.add(blade);

  const strike = new THREE.Vector3(face.x + 0.16, face.y + 0.03, face.z + 0.02);
  const hm = hammer(ctx, 0.42, 0.2);
  hm.scale.setScalar(1.5);
  hm.rotation.z = Math.PI + 0.62;
  hm.position.set(strike.x - 0.32, strike.y + 0.66, strike.z + 0.04);
  scene.add(hm);

  // one strong warm key from the blade/strike point, a faint orange rim from behind for the hammer
  rig.add([strike.x, strike.y + 0.18, strike.z + 0.25], '#ff9a48', 3.0, 3.6);
  rig.add([strike.x + 0.5, strike.y + 0.7, strike.z - 0.9], '#e0521a', 1.6, 3.0);
  rig.add([strike.x - 1.2, strike.y - 0.2, strike.z + 0.8], '#7d1d0d', 0.8, 3);

  const sparks = new SparkPool(rig);
  scene.add(sparks.mesh);
  const rnd = mulberry(params.seed + 7);
  for (let i = 0; i < 34; i++) {
    const a = rnd() * Math.PI * 2, up = 1.2 + rnd() * 2.2, out = 0.6 + rnd() * 1.9;
    sparks.spawn({ x: strike.x, y: strike.y + 0.02, z: strike.z, vx: Math.cos(a) * out * (rnd() > 0.5 ? 1.4 : 0.8), vy: up, vz: Math.sin(a) * out * 0.6, life: 0.9, floor: -9, kind: 0, heat: 0.75 + rnd() * 0.25 });
  }

  const camera = new THREE.PerspectiveCamera(num(params, 'fov', 30), width / height, 0.05, 30);
  const c = params.cam;
  if (c && c.length >= 5) { camera.position.set(c[0], c[1], c[2]); camera.rotation.set(c[4], c[3], 0, 'YXZ'); }
  else { camera.position.set(face.x + 0.15, face.y + 1.1, face.z + 1.85); camera.lookAt(face.x - 0.04, face.y + 0.3, face.z); }

  let step = 0;
  return {
    ready: true,
    update(dt) { if (step++ < 14) sparks.update(1 / 60, camera, height); else if (dt < 0) sparks.update(dt, camera, height); },
    render() { sparks.update(0, camera, pipeline.height); pipeline.render(scene, camera); },
    resize(w, h) { camera.aspect = w / h; camera.updateProjectionMatrix(); },
    dispose() { scene.traverse((o) => { if (o instanceof THREE.Mesh) o.geometry.dispose(); }); },
  };
};

function mulberry(a: number) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
export default make;
