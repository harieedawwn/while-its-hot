import * as THREE from 'three';
import { FEEL } from '../core/feel';
import type { LightRig } from './lights';
import { PostPass } from './post';
import { brightnessParams } from './brightness';
import { ghostMaterial, veilMaterial } from './materials/ghost';

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
let warmGeo: THREE.BufferGeometry | null = null;
/** One degenerate triangle with the attributes every game material reads, only used to compile programs. */
function tinyTri(): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(9), 3));
  g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array([0, 1, 0, 0, 1, 0, 0, 1, 0]), 3));
  g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(6), 2));
  g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(9).fill(1), 3));
  return g;
}
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
  bindRig(rig: LightRig): void { this.rigs.add(rig); this.applySnap(); this.applyBright(); }

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
  /** "Độ sáng" 0..100: dark-end lift in the vertex light of every bound rig + a gamma lift in post. */
  setBrightness(b: number): void { this.bright = b; this.applyBright(); }
  private bright: number = FEEL.render.brightness.default;
  private applyBright(): void {
    const p = brightnessParams(this.bright);
    this.post.uniforms.uLift.value = p.gamma;
    for (const r of this.rigs) r.shared.uFloor.value = p.floor;
  }

  private applySnap(): void {
    const k = this.q.snap ? FEEL.render.snapGrid : 0;
    for (const r of this.rigs) r.shared.uSnap.value.set(this.width * k * 0.5, this.height * k * 0.5);
  }

  /** Fire-ring tint 0..1 (LOOK §7: inside the wall the world tints toward the heat ramp). */
  setHeatTint(k: number): void { this.post.uniforms.uHeatTint.value = Math.max(0, Math.min(1, k)); }

  /** Nhập thần: warm stepped edge vignette 0..1 (0 = off, costs nothing). */
  setWarm(k: number): void { this.post.uniforms.uWarm.value = Math.max(0, Math.min(1, k)); }

  /** Coloured stepped edge vignette 0..1 (fire-ring pain, ghost); `color` is sRGB hex, only read when given. */
  setVignette(k: number, color?: string): void {
    const u = this.post.uniforms;
    u.uVig.value = Math.max(0, Math.min(1, k));
    if (color) u.uVigColor.value.setHex(parseInt(color.slice(1), 16), THREE.LinearSRGBColorSpace);
  }

  /** Transition / death grade (LOOK §9): desaturate (optionally keeping heat colors), stepped edge darkening, fade. */
  setGrade(g: { desat?: number; keepHot?: boolean; edge?: number; steps?: number; fade?: number; fadeColor?: string }): void {
    const u = this.post.uniforms;
    if (g.desat !== undefined) u.uDesat.value = g.desat;
    if (g.keepHot !== undefined) u.uKeepHot.value = g.keepHot ? 1 : 0;
    if (g.edge !== undefined) u.uEdge.value = g.edge;
    if (g.steps !== undefined) u.uEdgeSteps.value = g.steps;
    if (g.fade !== undefined) u.uFade.value = g.fade;
    if (g.fadeColor !== undefined) u.uFadeColor.value.setHex(parseInt(g.fadeColor.slice(1), 16), THREE.LinearSRGBColorSpace); // raw sRGB values
  }

  private warmed = new WeakSet<THREE.Object3D>();
  /**
   * First time we see a scene: show every hidden object, compile all programs, hide them again. Effect pools stay
   * invisible until their first spark / puff / shard, and compiling a shader mid-fight is a visible hitch on a phone.
   */
  private warm(scene: THREE.Scene, camera: THREE.Camera): void {
    if (this.warmed.has(scene)) return;
    this.warmed.add(scene);
    // materials a character only gets mid-fight (ghost after death, invisibility veil): compile them now, not at the first death
    const extra = new THREE.Group();
    for (const m of [ghostMaterial(), veilMaterial(FEEL.fx.effects.veilAlpha)]) { const o = new THREE.Mesh(warmGeo ??= tinyTri(), m); o.frustumCulled = false; extra.add(o); }
    extra.visible = false; scene.add(extra);
    const hidden: THREE.Object3D[] = [];
    scene.traverse((o) => { if (!o.visible) { hidden.push(o); o.visible = true; } });
    // async: the page keeps painting (the cover animation) while the driver links programs in parallel
    this.warming++;
    const done = () => { this.warming = Math.max(0, this.warming - 1); };
    const guard = setTimeout(done, 4000); // never stay blank if the promise is lost
    this.renderer.compileAsync(scene, camera).catch(() => {}).finally(() => { clearTimeout(guard); scene.remove(extra); done(); });
    for (const o of hidden) o.visible = false;
  }
  /** Scenes being compiled in the background; the world is not drawn (and the scene is not "ready") until 0. */
  warming = 0;

  /** World, then an optional overlay (viewmodel) over a cleared depth buffer, then post. */
  render(scene: THREE.Scene, camera: THREE.Camera, overlay?: { scene: THREE.Scene; camera: THREE.Camera }): void {
    const r = this.renderer;
    r.setRenderTarget(this.rt);
    this.warm(scene, camera);
    if (overlay) this.warm(overlay.scene, overlay.camera);
    if (this.warming > 0) return;
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
   * never below adaptiveFloor. `targetMs` = the frame time the FPS cap asks for (0 = uncapped): a 30 fps cap is not
   * "slow". A hitch (scene load, tab switch, GC) is not slowness either: it only restarts the grace period.
   * Returns true when it stepped (the caller may want to persist it).
   */
  frame(frameMs: number, targetMs = 0): boolean {
    if (!this.q.adaptive) return false;
    if (frameMs > FEEL.render.adaptiveHitchMs) { this.graceS = Math.max(this.graceS, FEEL.render.adaptiveGraceS); this.slowS = 0; return false; }
    const dt = frameMs / 1000;
    if (this.graceS > 0) { this.graceS -= dt; return false; }
    this.slowS = frameMs > Math.max(FEEL.render.adaptiveSlowMs, targetMs * 1.15) ? this.slowS + dt : 0;
    // a really slow frame (< 25 fps) counts double: step down in half the time
    if (this.slowS < (frameMs > FEEL.render.adaptiveSevereMs ? FEEL.render.adaptiveHoldS / 2 : FEEL.render.adaptiveHoldS)) return false;
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
