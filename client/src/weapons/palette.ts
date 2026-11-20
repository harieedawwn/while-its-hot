/**
 * Weapon vertex colors (multiplied with the atlas quad, see wkit.ts). Crude forms use `raw` on the forged
 * quad; clean forms `steel` on the bright quad; masterwork adds `brass` and dark leather.
 */
export const COL = {
  steel: '#cdd2d8', dark: '#9a9ea6', raw: '#c8c6c4', iron: '#8e8a86', brass: '#e8b45e', gem: '#a02414',
  wood: '#e6ddd4', woodDark: '#9c8e86', leather: '#e2d2c6', leatherDark: '#8a6e62', cord: '#ead9b8', rag: '#d6c9b2',
  red: '#c4321e', ink: '#24201e',
} as const;

type V3 = [number, number, number];
/** Euler that turns a +Y primitive to point horizontally at angle a: direction (cos a, 0, −sin a). +Z = −π/2. */
export const outward = (a: number, tilt = 0): V3 => [0, a, -Math.PI / 2 + tilt];
/** Euler that turns a +Y primitive to point down. */
export const DOWN: V3 = [Math.PI, 0, 0];
/** Vertex color gain on a form that borrows a lower form's model (weapon.ts `modelFor`). */
export const BORROW_TINT = 1.18;
