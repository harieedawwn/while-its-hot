import * as THREE from 'three';
import { bus } from './core/events';
import { FEEL } from './core/feel';
import { installGate } from './app/gate';
import { clock } from './core/clock';
import { readParams } from './dev/params';
import { Director } from './app/director';
import { getTransition } from './ui/transition';
import { installNative, nativeSearch } from './app/native';
import { Pipeline } from './render/pipeline';

declare global {
  interface Window {
    __ready?: boolean;
    __stats?: { calls: number; tris: number; programs: number; frameMs: number };
  }
}

async function boot(): Promise<void> {
  const native = installNative();
  const params = readParams(nativeSearch());
  installGate(document.getElementById('gate')!, params.nogate);

  const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
  renderer.info.autoReset = false; // world + post are two render() calls; __stats counts the whole frame
  const host = document.getElementById('app')!;
  host.appendChild(renderer.domElement);
  const pipeline = new Pipeline(renderer, {
    resolution: params.res ?? undefined, quantize: params.quant ?? undefined, snap: params.snap,
    adaptive: params.adaptive && !params.shot && params.t === null,
  });

  const app = new Director(renderer, pipeline, host, nativeSearch());
  const wipe = getTransition();
  addEventListener('resize', () => {
    const w = host.clientWidth, h = host.clientHeight;
    pipeline.resize(w, h);
    app.scene?.resize(w, h);
  });

  let paused = document.hidden;
  bus.on('app:pause', (e) => { paused = e.paused; });
  document.addEventListener('visibilitychange', () => { paused = document.hidden; bus.emit('app:pause', { paused }); });

  let time = 0, acc = 0, last = performance.now();
  let lastScene: unknown = null;
  const step = (now: number) => {
    requestAnimationFrame(step);
    const raw = now - last;
    const dt = Math.min(0.1, raw / 1000);
    last = now;
    const scene = app.scene;
    if (paused || !scene) return;
    const frozen = app.params.t !== null;
    if (scene !== lastScene) { lastScene = scene; time = app.params.t ?? 0; acc = 0; }
    pipeline.frame(raw);
    const t0 = performance.now();
    if (!frozen) {
      acc += dt * clock.timeScale;
      while (acc >= FEEL.simStep) { time += FEEL.simStep; scene.update(FEEL.simStep, time); acc -= FEEL.simStep; }
    } else scene.update(0, time);
    renderer.info.reset();
    scene.render(frozen ? 1 : acc / FEEL.simStep);
    const info = renderer.info;
    window.__stats = { calls: info.render.calls, tris: info.render.triangles, programs: info.programs?.length ?? 0, frameMs: performance.now() - t0 };
    wipe.afterRender(renderer.domElement);
    if (scene.ready && !window.__ready) { window.__ready = true; native.firstFrame(); app.markReady(); }
  };
  requestAnimationFrame(step);
  await app.load(params.scene);
}
void boot();
