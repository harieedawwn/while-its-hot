import { game, onGameSettings } from './core/game-settings';
import { FpsBadge } from './ui/fps-badge';
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
    __stats?: { calls: number; tris: number; programs: number; frameMs: number; geos: number; textures: number };
    __app?: Director;
    __progNames?: () => string;
    __THREE?: typeof THREE; // set with ?shot=1 so tools/leak.mjs can trace resource creation
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
    resolution: params.res ?? game.resolution, quantize: params.quant ?? game.quantize, snap: params.snap || game.snap,
    adaptive: params.adaptive && !params.shot && params.t === null,
  });

  onGameSettings((g) => {
    if (params.res === null) pipeline.setResolution(g.resolution);
    if (params.quant === null) pipeline.setQuantize(g.quantize);
    if (!params.snap) pipeline.setSnap(g.snap);
  });
  const fps = new FpsBadge();
  const app = new Director(renderer, pipeline, host, nativeSearch());
  window.__app = app;
  if (params.shot) { window.__THREE = THREE; window.__progNames = () => (renderer.info.programs ?? []).map((p) => p.name).join(','); }
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
    const cap = game.fpsCap;
    if (cap > 0 && raw < 1000 / cap - 2) return;
    last = now;
    fps.tick(raw);
    const scene = app.scene;
    if (paused || !scene) return;
    const frozen = app.params.t !== null;
    if (scene !== lastScene) { lastScene = scene; time = app.params.t ?? 0; acc = 0; }
    pipeline.frame(raw, cap > 0 ? 1000 / cap : 0);
    const t0 = performance.now();
    if (!frozen) {
      acc += dt * clock.timeScale;
      while (acc >= FEEL.simStep) { time += FEEL.simStep; scene.update(FEEL.simStep, time); acc -= FEEL.simStep; }
    } else scene.update(0, time);
    renderer.info.reset();
    scene.render(frozen ? 1 : acc / FEEL.simStep);
    const info = renderer.info;
    window.__stats = { calls: info.render.calls, tris: info.render.triangles, programs: info.programs?.length ?? 0, frameMs: performance.now() - t0, geos: info.memory.geometries, textures: info.memory.textures };
    wipe.afterRender(renderer.domElement);
    if (scene.ready && !pipeline.warming && !window.__ready) { window.__ready = true; native.firstFrame(); app.markReady(); }
  };
  requestAnimationFrame(step);
  await app.load(params.scene);
}
void boot();
