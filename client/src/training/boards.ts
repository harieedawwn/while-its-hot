import * as THREE from 'three';
import type { LightRig } from '../render/lights';
import { psxMaterial } from '../render/materials/psx';

export interface BoardLine { text: string; size: number; color?: string }

/**
 * A painted sign in the world: a canvas drawn at low resolution, nearest-sampled, shown unlit-ish through
 * the one PSX program. Used by the chalkboard and the lever board (GDD §10) — no floating UI.
 */
export class TextBoard {
  readonly mesh: THREE.Mesh;
  private cv = document.createElement('canvas');
  private g: CanvasRenderingContext2D;
  private tex: THREE.CanvasTexture;
  private key = '';

  constructor(rig: LightRig, readonly w: number, readonly h: number, private px: number, private bg: string, private fg: string) {
    this.cv.width = Math.round(w * px); this.cv.height = Math.round(h * px);
    this.g = this.cv.getContext('2d')!;
    this.tex = new THREE.CanvasTexture(this.cv);
    this.tex.colorSpace = THREE.SRGBColorSpace;
    this.tex.magFilter = this.tex.minFilter = THREE.NearestFilter;
    this.tex.generateMipmaps = false;
    const geo = new THREE.PlaneGeometry(w, h);
    this.mesh = new THREE.Mesh(geo, psxMaterial(rig, { map: this.tex, unlit: 0.55, side: THREE.DoubleSide }));
    this.draw([]);
  }

  /** Lines are stacked and centered; redraws only when the text changed. */
  draw(lines: BoardLine[]): void {
    const key = lines.map((l) => `${l.text}|${l.size}|${l.color ?? ''}`).join('\n');
    if (key === this.key) return;
    this.key = key;
    const { g, cv } = this;
    g.fillStyle = this.bg; g.fillRect(0, 0, cv.width, cv.height);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    const total = lines.reduce((s, l) => s + l.size * 1.3, 0);
    let y = (cv.height - total) / 2;
    for (const l of lines) {
      const f = l.size * 1.3;
      g.font = `800 ${l.size}px "Big Shoulders Display", "Big Shoulders", Impact, sans-serif`;
      g.fillStyle = l.color ?? this.fg;
      g.fillText(l.text, cv.width / 2, y + f / 2);
      y += f;
    }
    this.tex.needsUpdate = true;
  }

  dispose(): void { this.tex.dispose(); this.mesh.geometry.dispose(); (this.mesh.material as THREE.Material).dispose(); }
}
