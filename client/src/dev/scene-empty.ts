import * as THREE from 'three';
import { FEEL } from '../core/feel';
import type { SceneFactory } from './scenes';

/** Spinning test cube on a grid: proves the render loop, the shot tool and the fit on every device. */
const make: SceneFactory = ({ renderer, params, width, height }) => {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#14110f');
  const camera = new THREE.PerspectiveCamera(FEEL.fov, width / height, 0.1, 100);
  const c = params.cam;
  camera.position.set(c?.[0] ?? 2.6, c?.[1] ?? 2.0, c?.[2] ?? 3.6);
  camera.lookAt(0, 0.6, 0);
  if (c && c.length >= 5) camera.rotation.set(c[4], c[3], 0, 'YXZ');

  const grid = new THREE.GridHelper(20, 20, '#7a6a55', '#3a322a');
  scene.add(grid);
  const cube = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: '#c8642a' }));
  cube.position.y = 0.6;
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(cube.geometry), new THREE.LineBasicMaterial({ color: '#f0e6d2' }));
  cube.add(edges);
  scene.add(cube);

  return {
    ready: true,
    update(_dt, time) { cube.rotation.y = time * 0.9 + params.seed; cube.rotation.x = 0.4; },
    render() { renderer.render(scene, camera); },
    resize(w, h) { camera.aspect = w / h; camera.updateProjectionMatrix(); },
    dispose() { scene.traverse((o) => { if (o instanceof THREE.Mesh) { o.geometry.dispose(); (o.material as THREE.Material).dispose(); } }); },
  };
};
export default make;
