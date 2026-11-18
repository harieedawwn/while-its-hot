import * as THREE from 'three';

/**
 * The stepped blackbody ramp (LOOK §5): the single source of heat color for blades, sparks, molten metal
 * and the UI heat meter. Discrete steps only — never interpolate between them.
 */
export const HEAT_HEX = [
  '#1a0b08', '#4a140b', '#7d1d0d', '#b32d10', '#e0521a', '#f2862e', '#ffc061', '#ffe9b8', '#fffaf0',
] as const;
export const HEAT_STEPS = HEAT_HEX.length;

/** Linear-space colors for shaders (uniform array, same order). */
export const HEAT_LINEAR: readonly THREE.Color[] = HEAT_HEX.map((h) => new THREE.Color(h));

/** Heat 0..1 → step index 0..8. Heat 0 is the darkest step, 1 the white-hot step. */
export function heatStep(heat: number): number {
  const h = heat <= 0 ? 0 : heat >= 1 ? 1 : heat;
  return Math.min(HEAT_STEPS - 1, Math.floor(h * HEAT_STEPS));
}
/** Hex string for UI (DOM) at a given heat. */
export function heatHex(heat: number): string { return HEAT_HEX[heatStep(heat)]; }
/** The heat value at the middle of step i — handy for cycling and tests. */
export function stepHeat(i: number): number { return (Math.max(0, Math.min(HEAT_STEPS - 1, i)) + 0.5) / HEAT_STEPS; }
