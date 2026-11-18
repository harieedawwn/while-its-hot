import * as THREE from 'three';
import { FEEL } from '../core/feel';
import { bakeAO } from '../render/geo/ao';
import * as P from '../render/geo/procgeo';
import { StaticBatch } from '../render/geo/static-batch';
import { HEAT_LINEAR, HEAT_STEPS, heatStep, stepHeat } from '../render/heat';
import { LightRig } from '../render/lights';
import { MaterialLib } from '../render/materials/library';
import * as Anvil from '../render/models/anvil';
import * as Brazier from '../render/models/brazier';
import { chain, crate, hammer, ingot, quenchTub } from '../render/models/props';
import { buildRoom } from './lookdev-room';
import { num } from './params';
import type { SceneFactory } from './scenes';

/**
 * Lookdev: a foundry corner that must already read as the game (LOOK §1). Brazier (orange) vs window
 * (cold) light, a bar on the anvil stepping down the heat ramp. Params: view=0|1, heat=0..1 (pins the
 * bar), plus res/quant/snap and the usual seed/t/cam.
 */
const VIEWS: { pos: THREE.Vector3Tuple; look: THREE.Vector3Tuple }[] = [
  { pos: [2.55, 1.62, 2.75], look: [-0.9, 0.85, -1.45] }, // standing, looking into the corner
  { pos: [-0.05, 1.22, 1.4], look: [0.72, 0.8, 0.25] },    // close, left of the anvil, brazier at the left edge
];

const make: SceneFactory = async ({ pipeline, params, width, height }) => {
  const scene = new THREE.Scene();
  const rig = new LightRig();
  pipeline.bindRig(rig);
  rig.setHemi('#463a36', '#6a3218', 1.0);
  rig.setDir([0.15, 0.55, -1], '#4a6680', 0.55);
  rig.setFog('#140805', 5.5, 17);
  scene.background = rig.fogColor;

  const lib = await MaterialLib.load(rig, ['brick', 'grate', 'steel', 'rust', 'concrete', 'wood', 'slag', 'coal']);
  const ctx = { lib, seed: params.seed };
  const batch = new StaticBatch();
  buildRoom(batch, lib);

  const place = (o: THREE.Object3D, pos: THREE.Vector3Tuple, yaw = 0, extra?: THREE.Euler) => {
    o.position.set(...pos);
    o.rotation.copy(extra ?? new THREE.Euler(0, yaw, 0));
    return o;
  };
  const anvil = place(Anvil.build(ctx), [0.7, 0, 0.35], 0.42);
  // a hammer lying on the heel, handle hanging over the near edge
  anvil.add(place(hammer(ctx, 0.4, 0.14), [-0.27, Anvil.ANVIL.faceY + 0.021, 0.37], 0, new THREE.Euler(-Math.PI / 2, 0, 0)));
  batch.addObject(anvil);
  const brazier = place(Brazier.build(ctx), [-0.75, 0, -0.95], 0.4);
  const coal = brazier.getObjectByName('brazier:coal')!;
  coal.removeFromParent();
  batch.addObject(brazier);
  batch.addObject(place(crate(ctx, 0.82), [-3.35, 0, 1.55], 0.18));
  batch.addObject(place(crate(ctx, 0.56), [-3.3, 0.82, 1.5], -0.35));
  batch.addObject(place(crate(ctx, 0.64), [-3.45, 0, 2.55], 0.05));
  batch.addObject(place(quenchTub(ctx), [1.95, 0, -2.35]));
  batch.addObject(place(chain(ctx, 26), [1.6, 4.15, 0.95], 0.6));
  // tool board on the left wall: three hammers hang head-up
  batch.add(new THREE.BoxGeometry(0.05, 0.16, 1.5), lib.get('wood'), { pos: [-3.97, 1.52, -0.2], color: '#8a7058' });
  [[-0.75, 0.42, 0.13], [-0.2, 0.36, 0.11], [0.35, 0.46, 0.16]].forEach(([z, len, head], i) =>
    batch.addObject(place(hammer(ctx, len, head), [-3.9, 1.52 - len + 0.02, z - 0.2], 0, new THREE.Euler(0, Math.PI / 2, 0.05 * (i - 1)))));
  // coal heap by the brazier
  for (let i = 0; i < 4; i++) {
    const g = P.blob(0.35 - i * 0.05, { detail: 1, amp: 0.3, freq: 2.2, seed: 20 + i, squash: [1, 0.45, 1], flatBottom: 0 });
    batch.add(g, lib.get('coal'), { pos: [-2.4 + i * 0.3, 0, -2.5 + (i % 2) * 0.25], color: '#c8c0bc' });
  }

  const statics = batch.build();
  bakeAO(statics.filter((m) => m.material !== lib.get('glow')), { rays: 12, dist: 1.3, strength: 0.75 });
  statics.forEach((m) => scene.add(m));

  coal.applyMatrix4(brazier.matrixWorld);
  scene.add(coal);
  const bar = ingot(ctx);
  const face = (anvil.userData.sockets.face as THREE.Vector3).clone().applyMatrix4(anvil.matrixWorld);
  bar.position.copy(face).add(new THREE.Vector3(0.04, 0, 0.05));
  bar.rotation.y = 0.42 + 0.25;
  scene.add(bar);

  // lights: brazier (warm, flickers), window (cold), and the bar itself while it is hot
  const fire = rig.add([-0.75, Brazier.BRAZIER.fireY + 0.3, -0.95], '#ff7a30', 3.0, 7.5);
  rig.add([0.8, 2.3, -2.35], '#7ea4cc', 2.2, 8);
  rig.add([0.8, 1.2, -0.3], '#7ea4cc', 0.35, 5);
  // off-screen furnace mouth behind the player: low warm key so the anvil's near faces model
  rig.add([4.4, 1.3, 3.4], '#ff8a48', 1.3, 7.5);
  const barLight = rig.add([face.x, face.y + 0.2, face.z], '#000000', 0, 2.4);

  const camera = new THREE.PerspectiveCamera(FEEL.fov, width / height, 0.05, 40);
  const v = VIEWS[Math.max(0, Math.min(VIEWS.length - 1, num(params, 'view', 0)))];
  const c = params.cam;
  if (c && c.length >= 5) { camera.position.set(c[0], c[1], c[2]); camera.rotation.set(c[4], c[3], 0, 'YXZ'); }
  else { camera.position.set(...(c ? [c[0], c[1], c[2]] as THREE.Vector3Tuple : v.pos)); camera.lookAt(...v.look); }

  const pinned = params.get('heat');
  const STEP_S = 0.7;
  return {
    ready: true,
    update(_dt, time) {
      // cool from white-hot down the ramp one step at a time, then reheat
      const h = pinned !== null ? num(params, 'heat', 0.5) : stepHeat(HEAT_STEPS - 1 - (Math.floor(time / STEP_S) % HEAT_STEPS));
      bar.userData.heat = h;
      const s = heatStep(h);
      barLight.color.copy(HEAT_LINEAR[s]);
      barLight.intensity = s < 2 ? 0 : (s - 1) * 0.3;
      const fl = 0.86 + 0.08 * Math.sin(time * 7.3 + params.seed) + 0.06 * Math.sin(time * 13.1 + 1.7) + 0.04 * Math.sin(time * 23.7);
      fire.intensity = 3.0 * fl;
      coal.userData.heat = 0.62 + 0.1 * (fl - 0.86) * 4;
    },
    render() { pipeline.render(scene, camera); },
    resize(w, h) { camera.aspect = w / h; camera.updateProjectionMatrix(); },
    dispose() { scene.traverse((o) => { if (o instanceof THREE.Mesh) o.geometry.dispose(); }); },
  };
};
export default make;
