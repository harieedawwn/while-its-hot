import type * as THREE from 'three';
import type { ModelCtx } from '../../render/models/kit';
import { bakeLab, type LabFile } from '../lab-kit';

/**
 * Community models from weapon-lab/weapons/*.js. A file becomes the model of the roster row with the same
 * `meta.id` (effects stay as ROSTER says); other ids are listed in `LAB_SKIPPED` (not in the roster / old family).
 */
const files = import.meta.glob<{ default: LabFile }>('../../../../weapon-lab/weapons/*.js', { eager: true });
export const LAB_FILES: LabFile[] = Object.values(files).map((m) => m.default);

export function labModels(roster: ReadonlySet<string>): Record<string, { build(ctx: ModelCtx): THREE.Group }> {
  const out: Record<string, { build(ctx: ModelCtx): THREE.Group }> = {};
  for (const f of LAB_FILES) if (roster.has(f.meta.id)) out[f.meta.id] = { build: (ctx) => bakeLab(f, ctx) };
  return out;
}
export const labSkipped = (roster: ReadonlySet<string>): string[] => LAB_FILES.map((f) => f.meta.id).filter((id) => !roster.has(id));
