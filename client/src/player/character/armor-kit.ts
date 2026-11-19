import { cbox } from '../../render/geo/cbox';
import * as P from '../../render/geo/procgeo';
import type { SocketName } from '@wih/shared';
import { SOCKETS } from './skeleton';
import { SkinBatch } from './skin-batch';

/**
 * All armor and module pieces go into ONE batch (one draw call, steel texture). 'leather' parts are smooth
 * shaded and brown by vertex color, 'steel' parts are flat shaded (hard facets read as plate).
 */
type Surf = 'leather' | 'steel';
/** A socket whose name ends in _l/_r is built once on the right and mirrored for the left. */
export type Sided = 'shoulder' | 'forearm' | 'thigh' | 'shin' | 'heel';

/** Pieces are authored in socket space (origin = SOCKETS[name].pos on its bone). Armor never edits the base body. */
export class ArmorBuilder {
  readonly out = new SkinBatch();

  put(socket: SocketName, surf: Surf, parts: P.Part[]): this {
    const s = SOCKETS[socket];
    this.out.add(s.bone, s.pos, parts, { flat: surf === 'steel' });
    return this;
  }
  /** The player-color waist sash and hanging tail over the armor (tag 1, tinted by Character.setColor). `depth` must clear the torso piece. */
  sash(width: number, depth: number): this {
    this.out.add('chest', [0, 0.04, 0], [P.part(cbox(width, 0.07, depth, 0.02), '#ffffff', { shade: 0.1 })], { tag: 1 });
    this.out.add('pelvis', [0, 0, 0], [P.part(cbox(0.075, 0.26, 0.03, 0.01), '#ffffff', { pos: [-0.1, -0.03, -(depth / 2 + 0.01)], rot: [0.08, 0, 0.05], shade: 0.1 })], { tag: 1 });
    return this;
  }
  /** Both sides from right-hand parts. */
  both(base: Sided, surf: Surf, parts: P.Part[]): this {
    const s = SOCKETS[`${base}_r`];
    for (const m of [false, true]) {
      const bone = (s.bone.replace(/_r$/, m ? '_l' : '_r')) as typeof s.bone;
      this.out.add(bone, s.pos, parts, { flat: surf === 'steel', mirror: m });
    }
    return this;
  }
}

export const LEATHER = '#c89a6c';
export const LEATHER_DARK = '#94704c';
export const STEEL = '#dfe3e6';
export const STEEL_DARK = '#b4babf';
export const BRASS = '#d6b25e';
