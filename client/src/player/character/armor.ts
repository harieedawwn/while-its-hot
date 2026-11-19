import { armorTier, type ModuleId } from '@wih/shared';
import { ArmorBuilder } from './armor-kit';
import { fullPlate, halfPlate } from './armor-plate';
import { apron, leather, studded } from './armor-soft';
import { MODULE_BUILDERS } from './modules';
import type { SkinBatch } from './skin-batch';

const TIERS: readonly ((a: ArmorBuilder) => void)[] = [apron, leather, studded, halfPlate, fullPlate];

/** Geometry for an armor level (0–10) and its modules, as one batch. Swapping armor = rebuild this; the body is never touched. */
export function buildArmor(level: number, modules: readonly ModuleId[] = []): SkinBatch {
  const a = new ArmorBuilder();
  TIERS[armorTier(level)](a);
  for (const m of modules) MODULE_BUILDERS[m](a);
  return a.out;
}
export const TIER_COUNT = TIERS.length;
