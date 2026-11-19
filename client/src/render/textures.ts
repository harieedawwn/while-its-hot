import * as THREE from 'three';

/** Small point-sampled world textures (LOOK §1.3), baked by tools/texbake.mjs into public/tex/. */
export type TexName = 'brick' | 'grate' | 'steel' | 'rust' | 'concrete' | 'wood' | 'leather' | 'cloth' | 'slag' | 'coal' | 'weapon';

const cache = new Map<string, Promise<THREE.Texture>>();
const loader = new THREE.TextureLoader();

/** Atlases (weapon.png: 4 quadrants, tools/weapon-atlas.mjs) skip mipmaps so quadrants never bleed. */
const ATLAS: readonly TexName[] = ['weapon'];

function setup(t: THREE.Texture, atlas: boolean): THREE.Texture {
  t.colorSpace = THREE.SRGBColorSpace;
  t.magFilter = THREE.NearestFilter;
  t.minFilter = atlas ? THREE.NearestFilter : THREE.NearestMipmapLinearFilter;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 1;
  t.generateMipmaps = !atlas;
  return t;
}

export function loadTexture(name: TexName): Promise<THREE.Texture> {
  let p = cache.get(name);
  if (!p) {
    p = loader.loadAsync(`${import.meta.env.BASE_URL}tex/${name}.png`).then((t) => setup(t, ATLAS.includes(name)));
    cache.set(name, p);
  }
  return p;
}
export async function loadTextures<const N extends TexName>(names: readonly N[]): Promise<Record<N, THREE.Texture>> {
  const list = await Promise.all(names.map(loadTexture));
  return Object.fromEntries(names.map((n, i) => [n, list[i]])) as Record<N, THREE.Texture>;
}

let white: THREE.DataTexture | null = null;
/** 1×1 white map so untextured PSX materials keep the same program. */
export function whiteTexture(): THREE.Texture {
  if (!white) {
    white = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
    white.needsUpdate = true;
  }
  return white;
}
