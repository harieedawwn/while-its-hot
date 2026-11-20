import { FAMILIES, familyForms } from './data/weapons';

/**
 * Match-end unlocks (GDD §9): a form unlocks when its family blade reaches its level in an online match.
 * `best` = highest level per family in FAMILIES order [kiem, bua, dao, tay]. Returns the forms newly unlocked and the new bestLevel.
 */
export function matchUnlocks(best: readonly number[], unlocked: Readonly<Record<string, boolean>>, bestLevel: Readonly<Record<string, number>>): { forms: string[]; bestLevel: Record<string, number> } {
  const forms: string[] = [], bl: Record<string, number> = { ...bestLevel };
  FAMILIES.forEach((f, i) => {
    const b = Math.max(0, Math.floor(best[i] ?? 0));
    bl[f] = Math.max(bl[f] ?? 0, b);
    for (const w of familyForms(f)) if (w.minLevel <= b && !unlocked[w.id]) forms.push(w.id);
  });
  return { forms, bestLevel: bl };
}
