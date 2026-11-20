import * as THREE from 'three';
import { FAMILIES, familyForms, WEAPON_IDS } from '@wih/shared';
import { cbox } from '../render/geo/cbox';
import * as P from '../render/geo/procgeo';
import { LightRig } from '../render/lights';
import { MaterialLib } from '../render/materials/library';
import { mesh, slab } from '../render/models/kit';
import { loadWeapon, modelFor, setHeat } from '../weapons/weapon';
import { num } from './params';
import type { SceneFactory } from './scenes';

/**
 * Weapon gallery (phase 07). Default: every form with its OWN model standing on a rack, grouped phôi | kiếm |
 * búa | dao | tay (`all=1`: all 61 forms, borrowed models included), in front of a scale board (thin lines
 * every 0.5 m, bold every 1 m), each slowly turning about broadside.
 * `?weapon=<id>&heat=0..1` = one weapon close-up, laid diagonally; long weapons frame their top 1.3 m.
 * `yaw` adds a turn (rad). `t` freezes the turn.
 */
const BROAD = -Math.PI / 2; // turns the blade's flat (+X) toward a camera on +Z

function scaleBoard(w: number, h: number): THREE.BufferGeometry {
  const parts: P.Part[] = [];
  for (let x = 0; x <= w + 1e-6; x += 0.5) {
    const bold = Math.abs(x - Math.round(x)) < 1e-6;
    parts.push(P.part(cbox(bold ? 0.022 : 0.008, h, 0.01, 0.002), bold ? '#7a6250' : '#4a3c32', { pos: [x - w / 2, h / 2, 0], shade: 0 }));
  }
  for (let y = 0; y <= h + 1e-6; y += 0.5) {
    const bold = Math.abs(y - Math.round(y)) < 1e-6;
    parts.push(P.part(cbox(w, bold ? 0.022 : 0.008, 0.01, 0.002), bold ? '#7a6250' : '#4a3c32', { pos: [0, y, 0], shade: 0 }));
  }
  return P.bake(parts, { shade: 0 });
}

/** Flat dark wall (paint material, vertex color) so the steel reads against it. */
function backdrop(lib: MaterialLib, w: number, h: number, color: string, pos: THREE.Vector3Tuple): THREE.Mesh {
  const m = new THREE.Mesh(P.bake([P.part(slab(w, h, 0.1, 1), color, { shade: 0.35 })]), lib.get('paint'));
  m.position.set(...pos);
  m.name = 'back';
  return m;
}

const make: SceneFactory = async ({ pipeline, params, width, height }) => {
  const scene = new THREE.Scene();
  const rig = new LightRig();
  pipeline.bindRig(rig);
  const lib = await MaterialLib.load(rig, ['forged', 'concrete', 'wood', 'paint']);
  const single = params.get('weapon');
  const heat = num(params, 'heat', 0), yaw = num(params, 'yaw', 0);
  const items: { w: THREE.Group; x: number; phase: number }[] = [];
  const camera = new THREE.PerspectiveCamera(single ? 30 : 26, width / height, 0.05, 60);
  let fit = (_aspect: number) => {};

  if (single && WEAPON_IDS.includes(single)) {
    rig.setHemi('#8a7c70', '#2a1c16', 1.2);
    rig.setDir([0.5, 0.7, 0.6], '#c8d0dc', 1.3);
    rig.setFog('#120c0a', 6, 14);
    rig.add([-0.8, -0.6, 0.9], '#ff8a3c', 2.6, 3.2); // brazier glow from below
    rig.add([0.9, 0.8, 1.1], '#ffd2a0', 1.2, 4);
    const w = await loadWeapon(single, { lib });
    setHeat(w, heat);
    const tip = w.getObjectByName('tip')!.position;
    const bb = new THREE.Box3().setFromObject(w);
    const y0 = Math.max(bb.min.y, tip.y - 1.3);
    const pivot = new THREE.Group();
    pivot.rotation.z = -1.05; // lie diagonally across the landscape frame
    w.rotation.y = BROAD + yaw;
    pivot.add(w);
    scene.add(pivot);
    scene.add(backdrop(lib, 8, 6, '#2c2420', [0, 0, -1.4]));
    // frame the world bounds of the part above y0 (the whole weapon unless it is a long polearm)
    scene.updateMatrixWorld(true);
    const box = new THREE.Box3(), v = new THREE.Vector3();
    w.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      const p = m.geometry.getAttribute('position');
      for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); if (v.y >= y0) box.expandByPoint(v.applyMatrix4(m.matrixWorld)); }
    });
    const ctr = box.getCenter(new THREE.Vector3()), ext = box.getSize(new THREE.Vector3()).multiplyScalar(0.56);
    fit = (a) => {
      const t = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
      camera.position.set(ctr.x, ctr.y, box.max.z + Math.max(ext.y / t, ext.x / (t * a)));
      camera.lookAt(ctr.x, ctr.y, ctr.z);
    };
  } else {
    rig.setHemi('#a89a8c', '#3a2a20', 1.5);
    rig.setDir([0.3, 0.8, 0.6], '#c4ccd6', 1.2);
    rig.setFog('#160e0b', 12, 30);
    let x = 0;
    const all = params.get('all') === '1';
    const groups: string[][] = [['phoi'], ...FAMILIES.map((f) => familyForms(f).filter((w) => all || !modelFor(w).borrowed).map((w) => w.id))];
    const placed: { id: string; x: number }[] = [];
    groups.forEach((ids, gi) => {
      if (gi) x += 0.75;
      ids.forEach((id, i) => { if (i) x += gi === 2 ? 0.5 : 0.42; placed.push({ id, x }); });
    });
    const span = x;
    for (const p of placed) {
      const w = await loadWeapon(p.id, { lib });
      setHeat(w, heat);
      const bb = new THREE.Box3().setFromObject(w);
      w.position.set(p.x - span / 2, 0.08 - bb.min.y, 0);
      items.push({ w, x: p.x, phase: p.x * 1.7 });
      scene.add(w);
    }
    const W = Math.ceil(span + 2), H = 3.5;
    const board = mesh(scaleBoard(W, H), lib.get('paint'), 'grid');
    board.position.set(0, 0, -0.45);
    scene.add(board);
    scene.add(backdrop(lib, W + 8, H + 3, '#302822', [0, (H + 3) / 2 - 0.6, -0.52]));
    const rack = mesh(slab(span + 1.2, 0.08, 0.5, 1), lib.get('wood'), 'rack');
    rack.position.set(0, 0.04, 0);
    scene.add(rack);
    const floor = mesh(slab(W + 6, 0.2, 6, 1), lib.get('concrete'), 'floor');
    floor.position.set(0, -0.1, 1.5);
    scene.add(floor);
    for (const lx of [-0.36, 0, 0.36]) rig.add([lx * span, 2.4, 2.2], '#ffb070', 1.6, 6);
    rig.add([0, 1.2, 3.5], '#9ab0cc', 0.9, 7);
    fit = (a) => {
      const t = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)), hw = span / 2 + 0.45, hh = 1.7;
      camera.position.set(0, 1.55, Math.max(hh / t, hw / (t * a)) + 0.2);
      camera.lookAt(0, 1.5, 0);
    };
  }
  fit(width / height);
  const c = params.cam;
  if (c && c.length >= 5) { camera.position.set(c[0], c[1], c[2]); camera.rotation.set(c[4], c[3], 0, 'YXZ'); }

  const turn = (time: number) => { for (const it of items) it.w.rotation.y = BROAD + yaw + 0.5 * Math.sin(time * 0.5 + it.phase); };
  const frozen = params.t !== null;
  turn(params.t ?? 0.8);

  return {
    ready: true,
    update(_dt, time) { if (!frozen) turn(time); },
    render() { pipeline.render(scene, camera); },
    resize(w, h) { camera.aspect = w / h; camera.updateProjectionMatrix(); if (!(c && c.length >= 5)) fit(w / h); },
    dispose() { scene.traverse((o) => { if (o instanceof THREE.Mesh) o.geometry.dispose(); }); },
  };
};
export default make;
