import * as THREE from 'three';
import { FEEL } from '../core/feel';
import { LightRig } from '../render/lights';
import { applyFoundryLook, createFoundry } from '../world/foundry';
import { num } from './params';
import type { SceneFactory } from './scenes';

/**
 * Arena 1, Xưởng Đúc (phase 05). Params: view=0..3 (preset cameras), cam=… overrides, doors=0..1 (pins the
 * cage doors; default: closed for 1.5 s then they slam open), ring=meters (fire ring radius) with
 * rc=0..2 (which ring center), plus the usual seed/t/res/quant.
 */
const VIEWS: { pos: THREE.Vector3Tuple; look: THREE.Vector3Tuple }[] = [
  { pos: [0, 2.2, 25], look: [0, 4.2, -30] },        // from the south edge: furnace, channel cross, dais
  { pos: [-24, 6.7, -24], look: [14, 2, 14] },        // north-west catwalk across the arena: tanks, crane, bridges
  { pos: [4.8, 2.5, 4.8], look: [-20, 2.4, -12] },    // standing on the dais: slag heap west, cage doors
  { pos: [26.5, 12.6, 24], look: [-6, 1, -12] },      // from the crane runway looking down
];

const make: SceneFactory = async ({ pipeline, params, width, height }) => {
  const scene = new THREE.Scene();
  const rig = new LightRig();
  pipeline.bindRig(rig);
  applyFoundryLook(rig);
  scene.background = rig.fogColor;

  const arena = await createFoundry(rig, params.seed);
  scene.add(arena.root);
  const ring = num(params, 'ring', 0);
  if (ring > 0) arena.setRing(Math.round(num(params, 'rc', 0)), ring);
  const pinned = params.get('doors');
  if (pinned !== null) arena.setDoors(num(params, 'doors', 0));

  const camera = new THREE.PerspectiveCamera(FEEL.fov, width / height, FEEL.camera.near, FEEL.camera.far);
  const v = VIEWS[Math.max(0, Math.min(VIEWS.length - 1, num(params, 'view', 0)))];
  const c = params.cam;
  if (c && c.length >= 5) { camera.position.set(c[0], c[1], c[2]); camera.rotation.set(c[4], c[3], 0, 'YXZ'); }
  else { camera.position.set(...(c ? [c[0], c[1], c[2]] as THREE.Vector3Tuple : v.pos)); camera.lookAt(...v.look); }
  camera.updateMatrixWorld();

  let opened = false;
  return {
    ready: true,
    update(dt, time) {
      if (pinned === null && !opened && time > 1.5) { opened = true; arena.openCages(); }
      arena.update(dt, time);
    },
    render() { pipeline.render(scene, camera); },
    resize(w, h) { camera.aspect = w / h; camera.updateProjectionMatrix(); },
    dispose() { arena.dispose(); },
  };
};
export default make;
