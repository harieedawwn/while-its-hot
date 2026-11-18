import type * as THREE from 'three';
import type { LightRig } from '../lights';
import { loadTextures, type TexName } from '../textures';
import { psxMaterial } from './psx';

/**
 * World surfaces: one PSX material each (all share one program). `tile` = meters per texture repeat for
 * world-space box UVs; `foot` is the footstep surface tag later phases read from colliders.
 */
export const SURFACES = {
  brick: { tex: 'brick', tile: 1.2, foot: 'stone' },
  grate: { tex: 'grate', tile: 1.0, foot: 'grate' },
  steel: { tex: 'steel', tile: 1.0, foot: 'metal' },
  rust: { tex: 'rust', tile: 1.5, foot: 'metal' },
  concrete: { tex: 'concrete', tile: 2.5, foot: 'stone' },
  wood: { tex: 'wood', tile: 1.5, foot: 'wood' },
  slag: { tex: 'slag', tile: 1.5, foot: 'gravel' },
  coal: { tex: 'coal', tile: 0.6, foot: 'gravel' },
  leather: { tex: 'leather', tile: 0.5, foot: 'stone' },
  cloth: { tex: 'cloth', tile: 0.5, foot: 'stone' },
  /** vertex color only */
  paint: { tex: null, tile: 1, foot: 'metal' },
  /** shows its color unlit: window glass, furnace mouth */
  glow: { tex: null, tile: 1, foot: 'metal', unlit: 1 },
} as const satisfies Record<string, { tex: TexName | null; tile: number; foot: string; unlit?: number }>;
export type SurfaceName = keyof typeof SURFACES;

export class MaterialLib {
  private mats = new Map<SurfaceName, THREE.ShaderMaterial>();
  private constructor(private rig: LightRig, private tex: Partial<Record<TexName, THREE.Texture>>) {}

  /** Load the textures of the named surfaces and return a library that can make them. */
  static async load(rig: LightRig, names: readonly SurfaceName[]): Promise<MaterialLib> {
    const texNames = [...new Set(names.map((n) => SURFACES[n].tex).filter((t): t is TexName => t !== null))];
    return new MaterialLib(rig, await loadTextures(texNames));
  }
  get(name: SurfaceName): THREE.ShaderMaterial {
    let m = this.mats.get(name);
    if (!m) {
      const s: { tex: TexName | null; unlit?: number } = SURFACES[name];
      m = psxMaterial(this.rig, { map: s.tex ? this.tex[s.tex] ?? null : null, unlit: s.unlit ?? 0 });
      m.name = name;
      m.userData.tile = SURFACES[name].tile;
      m.userData.foot = SURFACES[name].foot;
      this.mats.set(name, m);
    }
    return m;
  }
  /** Distinct materials created so far (budget: ≤ 12). */
  get count(): number { return this.mats.size; }
}
