import * as THREE from 'three';
import { FEEL } from '../core/feel';
import type { LightRig } from './lights';
import { PostPass } from './post';

export type QuantizeMode = keyof typeof FEEL.render.quantize;
export interface Quality {
  /** Internal height in px, 0 = native. */
  resolution: number;
  quantize: QuantizeMode;
  snap: boolean;
  adaptive: boolean;
}

/**
 * Low-res world (LOOK §1.1): the scene renders into an sRGB target at the internal resolution, the post
 * pass writes the canvas at that same size, and CSS (`image-rendering: pixelated`) does the nearest
 * upscale — zero native-resolution fill cost. DOM HUD stays crisp above it.
 */
export class Pipeline {
  readonly post = new PostPass();
  readonly q: Quality;
  private rt: THREE.WebGLRenderTarget;
  private rigs = new Set<LightRig>();
  private css = { w: 1, h: 1 };
  private slowS = 0;
  private graceS: number = FEEL.render.adaptiveGraceS;
  width = 1;
  height = 1;

  constructor(private renderer: THREE.WebGLRenderer, q: Partial<Quality> = {}) {
    this.q = {
      resolution: q.resolution ?? FEEL.render.defaultResolution,
      quantize: q.quantize ?? FEEL.render.defaultQuantize,
      snap: q.snap ?? false,
      adaptive: q.adaptive ?? true,
    };
    renderer.setPixelRatio(1);
    renderer.autoClear = true;
    this.rt = new THREE.WebGLRenderTarget(1, 1, {
      minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, generateMipmaps: false,
      depthBuffer: true, colorSpace: THREE.SRGBColorSpace,
    });
    this.setQuantize(this.q.quantize);
  }

  /** Materials made from this rig get the snap grid of this pipeline. */
  bindRig(rig: LightRig): void { this.rigs.add(rig); this.applySnap(); }

  resize(cssW: number, cssH: number): void {
    this.css.w = Math.max(1, cssW); this.css.h = Math.max(1, cssH);
    const nativeH = Math.round(this.css.h * (window.devicePixelRatio || 1));
    const h = this.q.resolution > 0 ? Math.min(this.q.resolution, nativeH) : nativeH;
    const w = Math.round(h * this.css.w / this.css.h);
    if (w === this.width && h === this.height) return;
    this.width = w; this.height = h;
    this.renderer.setSize(w, h, false);
    this.rt.setSize(w, h);
    this.applySnap();
    this.graceS = FEEL.render.adaptiveGraceS;
  }

  setResolution(h: number): void { this.q.resolution = h; this.width = 0; this.resize(this.css.w, this.css.h); }
  setQuantize(mode: QuantizeMode): void {
    this.q.quantize = mode;
    this.post.uniforms.uLevels.value = FEEL.render.quantize[mode];
    this.post.uniforms.uDither.value = FEEL.render.ditherAmount;
  }
  setSnap(on: boolean): void { this.q.snap = on; this.applySnap(); }

  private applySnap(): void {
    const k = this.q.snap ? FEEL.render.snapGrid : 0;
    for (const r of this.rigs) r.shared.uSnap.value.set(this.width * k * 0.5, this.height * k * 0.5);
  }

  /** World, then an optional overlay (viewmodel) over a cleared depth buffer, then post. */
  render(scene: THREE.Scene, camera: THREE.Camera, overlay?: { scene: THREE.Scene; camera: THREE.Camera }): void {
    const r = this.renderer;
    r.setRenderTarget(this.rt);
    r.render(scene, camera);
    if (overlay) {
      r.autoClear = false;
      r.clearDepth();
      r.render(overlay.scene, overlay.camera);
      r.autoClear = true;
    }
    this.post.render(r, this.rt.texture);
  }

  /**
   * Adaptive quality (LOOK §1.8): slower than adaptiveSlowMs for adaptiveHoldS seconds → one notch down,
   * never below adaptiveFloor. Returns true when it stepped (the caller may want to persist it).
   */
  frame(frameMs: number): boolean {
    if (!this.q.adaptive) return false;
    const dt = frameMs / 1000;
    if (this.graceS > 0) { this.graceS -= dt; return false; }
    this.slowS = frameMs > FEEL.render.adaptiveSlowMs ? this.slowS + dt : 0;
    if (this.slowS < FEEL.render.adaptiveHoldS) return false;
    this.slowS = 0;
    const steps = FEEL.render.resolutions.filter((r) => r > 0 && r >= FEEL.render.adaptiveFloor);
    const cur = this.q.resolution > 0 ? this.q.resolution : this.height;
    const lower = steps.filter((r) => r < Math.min(cur, this.height)).pop();
    if (lower === undefined) return false;
    this.setResolution(lower);
    return true;
  }

  dispose(): void { this.rt.dispose(); this.post.dispose(); }
}
