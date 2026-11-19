import { compile, type Compiled } from '../pose';
import { COMBAT } from './combat';
import { LOCOMOTION } from './locomotion';
import { MOVEMENT } from './movement';
import type { Clip } from './types';
import { WORK } from './work';

export type { Clip } from './types';

/** Weapon families of GDD §5; phase 08 registers their attack clips into the slots below. */
export const FAMILIES = ['sword', 'hammer', 'polearm'] as const;
export type Family = (typeof FAMILIES)[number];
/** Per family: light ×3, heavy charge, heavy release. */
export const ATTACK_PARTS = ['light1', 'light2', 'light3', 'heavy_charge', 'heavy_release'] as const;
export type AttackPart = (typeof ATTACK_PARTS)[number];
export const attackId = (f: Family, p: AttackPart): string => `atk_${f}_${p}`;
export const ATTACK_SLOTS: readonly string[] = FAMILIES.flatMap((f) => ATTACK_PARTS.map((p) => attackId(f, p)));

const compiled = new Map<string, Compiled>();
for (const c of [...LOCOMOTION, ...MOVEMENT, ...WORK, ...COMBAT]) compiled.set(c.id, compile(c));

export const hasClip = (id: string): boolean => compiled.has(id);
export const getClip = (id: string): Compiled | undefined => compiled.get(id);
export const clipIds = (): string[] => [...compiled.keys()];
/** Phase 08: register an attack clip into its slot (or any new clip). */
export function registerClip(c: Clip): void { compiled.set(c.id, compile(c)); }
