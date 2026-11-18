import * as THREE from 'three';
import { bus } from './core/events';
import { FEEL } from './core/feel';
import { installGate } from './app/gate';
import { readParams } from './dev/params';
import { DEFAULT_SCENE, SCENES, type Scene } from './dev/scenes';

declare global {
  interface Window {
    __ready?: boolean;
    __stats?: { calls: number; tris: number; programs: number; frameMs: number };
  }
}

async function boot(): Promise<void> {
  const params = readParams();
  installGate(document.getElementById('gate')!, params.nogate);

  const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(1);
  const host = document.getElementById('app')!;
  host.appendChild(renderer.domElement);

  const name = params.scene && SCENES[params.scene] ? params.scene : DEFAULT_SCENE;
  const w0 = host.clientWidth, h0 = host.clientHeight;
  renderer.setSize(w0, h0, false);
  const loader = SCENES[name];
  const scene: Scene = await (await loader()).default({ renderer, params, width: w0, height: h0 });

  addEventListener('resize', () => {
    const w = host.clientWidth, h = host.clientHeight;
    renderer.setSize(w, h, false);
    scene.resize(w, h);
  });

  let paused = document.hidden;
  document.addEventListener('visibilitychange', () => { paused = document.hidden; bus.emit('app:pause', { paused }); });

  let time = params.t ?? 0, acc = 0, last = performance.now();
  const frozen = params.t !== null;
  const step = (now: number) => {
    requestAnimationFrame(step);
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    if (paused) return;
    const t0 = performance.now();
    if (!frozen) {
      acc += dt;
      while (acc >= FEEL.simStep) { time += FEEL.simStep; scene.update(FEEL.simStep, time); acc -= FEEL.simStep; }
    } else scene.update(0, time);
    scene.render();
    const info = renderer.info;
    window.__stats = { calls: info.render.calls, tris: info.render.triangles, programs: info.programs?.length ?? 0, frameMs: performance.now() - t0 };
    if (scene.ready && !window.__ready) window.__ready = true;
  };
  requestAnimationFrame(step);
}
void boot();
