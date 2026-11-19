import type * as THREE from 'three';
import { GamePause, PLAY_SCENES } from './pause';
import { bus } from '../core/events';
import { settleFrames, yieldTask } from '../core/slice';
import { readParams, type Params } from '../dev/params';
import { DEFAULT_SCENE, SCENES, type Scene } from '../dev/scenes';
import type { Pipeline } from '../render/pipeline';
import { getTransition, type WipeKind } from '../ui/transition';

/** Params carried across scene changes (device / harness flags, not scene presets). */
const CARRY = ['touch', 'nogate', 'shot', 'res', 'quant', 'snap', 'adaptive'];
export const MENU_SCENE = 'ui-menu';

/**
 * Owns the running scene (TECH §2 screen flow at scene level): loads one by name, disposes the old one, and
 * routes scene changes through ui/transition.ts. Scenes reach it as `ctx.app`.
 */
export class Director {
  scene: Scene | null = null;
  name = '';
  params!: Params;
  private firstReady: (() => void) | null = null;
  private loading = false;

  private cameFromMenu = false;
  private pause: GamePause;

  constructor(private renderer: THREE.WebGLRenderer, private pipeline: Pipeline, private host: HTMLElement, private search: string) {
    this.pause = new GamePause(host, () => void this.go(MENU_SCENE, 'quench', { screen: 'menu' }));
    bus.on('app:back', () => {
      if (this.loading || this.name === MENU_SCENE) return;
      if (PLAY_SCENES.has(this.name)) this.pause.back();
      else if (this.cameFromMenu) void this.go(MENU_SCENE, 'quench', { screen: 'menu' });
    });
  }

  /** Load `name` with the carried flags plus `extra` params. Resolves once its first final frame is on screen. */
  async load(name: string, extra: Record<string, string> = {}): Promise<void> {
    const cur = new URLSearchParams(this.search), next = new URLSearchParams();
    for (const k of CARRY) { const v = cur.get(k); if (v !== null) next.set(k, v); }
    for (const [k, v] of Object.entries(extra)) next.set(k, v);
    if (!this.scene) for (const [k, v] of cur) if (!next.has(k)) next.set(k, v); // first load keeps the URL as given
    const id = SCENES[name] ? name : DEFAULT_SCENE;
    next.set('scene', id);
    this.loading = true;
    this.scene?.dispose?.();
    this.scene = null;
    window.__ready = false;
    this.params = readParams('?' + next.toString());
    this.name = id;
    const w = this.host.clientWidth, h = this.host.clientHeight;
    this.pipeline.resize(w, h);
    await yieldTask();
    const mod = await SCENES[id]();
    await yieldTask();
    const s = await mod.default({ renderer: this.renderer, pipeline: this.pipeline, params: this.params, width: w, height: h, app: this });
    const ready = new Promise<void>((r) => { this.firstReady = r; });
    this.scene = s;
    this.loading = false;
    try { history.replaceState(null, '', '?' + next.toString()); } catch { /* file:// or sandboxed */ }
    await ready;
  }

  /** Change scene through a transition. `origin` = CSS px where the wipe starts (the tapped element). */
  async go(name: string, kind: WipeKind, extra: Record<string, string> = {}, origin: [number, number] | null = null): Promise<void> {
    const from = this.name;
    // the cover runs on its own clock and stays shut until the next scene has drawn 2 smooth frames
    await getTransition().run(kind, origin, async () => { await this.load(name, extra); await settleFrames(); });
    this.cameFromMenu = from === MENU_SCENE || (this.cameFromMenu && name !== MENU_SCENE);
  }

  /** Main loop: the scene drew a final frame. */
  markReady(): void { if (this.firstReady) { const f = this.firstReady; this.firstReady = null; f(); } }
}
