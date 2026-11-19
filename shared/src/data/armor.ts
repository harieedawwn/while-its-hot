/** Armor visual tiers (GDD §7, LOOK §4). Armor level 0–10 maps to one of five looks; stats come from balance.ts. */
export const ARMOR_TIERS = [
  { id: 'tap_de', minLevel: 0 },
  { id: 'da', minLevel: 2 },
  { id: 'da_dinh', minLevel: 4 },
  { id: 'giap_nua', minLevel: 6 },
  { id: 'giap_toan_than', minLevel: 8 },
] as const;
export type ArmorTierId = (typeof ARMOR_TIERS)[number]['id'];

/** Look tier index 0..4 for an armor level (clamped to 0..10). */
export function armorTier(level: number): number {
  const l = Math.max(0, Math.min(10, Math.floor(level)));
  let t = 0;
  for (let i = 0; i < ARMOR_TIERS.length; i++) if (l >= ARMOR_TIERS[i].minLevel) t = i;
  return t;
}
