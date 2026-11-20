import type { EntKind } from '@wih/shared';
import { bus } from '../core/events';
import type { AudioEngine, Handle } from './engine';
import { buzz } from './haptics';

/**
 * Form effects (phase 28) → sounds. No new recordings yet: each atom is an existing take re-pitched and placed
 * in 3D (a slash = the sword whoosh down a fifth, a meteor = the bomb, a bell = the anvil clang an octave down).
 * Black holes and orbiting blades hold positional loops for as long as the entity lives. Own effects are 2D.
 */
interface Cue { ev: string; pitch: number; db: number }
const ENT_ON: Partial<Record<EntKind, Cue>> = {
  slash: { ev: 'swing_sword', pitch: 0.72, db: 1 }, slash_burn: { ev: 'swing_sword', pitch: 0.66, db: 1 },
  slash_ice: { ev: 'swing_sword', pitch: 0.8, db: 0 }, slash_sun: { ev: 'swing_sword', pitch: 0.9, db: -3 },
  lava: { ev: 'steam_vent', pitch: 0.8, db: -4 }, ice: { ev: 'hit_armor', pitch: 1.7, db: -12 },
  meteor: { ev: 'slam_fall', pitch: 0.7, db: -2 }, column: { ev: 'bomb', pitch: 1.3, db: -2 },
  anchor: { ev: 'swing_hammer', pitch: 0.6, db: 2 }, crack: { ev: 'strike_hong', pitch: 0.55, db: 2 },
  eclipse: { ev: 'heavy_charge', pitch: 0.45, db: 0 }, star: { ev: 'heavy_charge', pitch: 0.38, db: 2 },
};
/** Entities that hum while alive. */
const ENT_LOOP: Partial<Record<EntKind, Cue>> = {
  eclipse: { ev: 'frenzy_loop', pitch: 0.5, db: -6 }, star: { ev: 'frenzy_loop', pitch: 0.42, db: -3 }, orbit: { ev: 'heavy_charge', pitch: 1.6, db: -16 },
};
const ATOM: Record<string, Cue> = {
  chain: { ev: 'hit_blocked', pitch: 1.9, db: 3 }, whip: { ev: 'swing_polearm', pitch: 1.4, db: 0 },
  wave: { ev: 'land_hard', pitch: 0.7, db: 2 }, bell: { ev: 'strike_giu', pitch: 0.5, db: 2 },
  pin: { ev: 'land_hard', pitch: 0.5, db: 3 }, magnet: { ev: 'heavy_release', pitch: 0.6, db: 0 },
  boom: { ev: 'bomb', pitch: 0.8, db: 4 }, meteor_hit: { ev: 'bomb', pitch: 1, db: 3 }, anchor_hit: { ev: 'land_hard', pitch: 0.8, db: 2 },
  orbit_hit: { ev: 'hit_blocked', pitch: 1.5, db: -6 }, freeze: { ev: 'hit_armor', pitch: 1.45, db: -2 }, push: { ev: 'land_soft', pitch: 1.2, db: -4 },
};

export function bindEffectAudio(a: AudioEngine, localId = 0): () => void {
  const loops = new Map<number, Handle | null>();
  const play = (c: Cue | undefined, own: boolean, x: number, y: number, z: number) => {
    if (c) a.play(c.ev, { pitch: c.pitch, db: c.db, pos: own ? undefined : { x, y, z } });
  };
  const offs = [
    bus.on('fx:ent', ({ on, k, e }) => {
      if (!on) { loops.get(e.id)?.stop(0.25); loops.delete(e.id); return; }
      const own = e.o === localId;
      play(ENT_ON[k], own, e.x, e.y, e.z);
      const l = ENT_LOOP[k];
      if (l) loops.set(e.id, a.loop(l.ev, { pitch: l.pitch, db: l.db, pos: own && k === 'orbit' ? undefined : { x: e.x, y: e.y, z: e.z } }));
    }),
    bus.on('fx:atom', (e) => {
      play(ATOM[e.k], e.o === localId && e.k !== 'meteor_hit' && e.k !== 'boom', e.p[0], e.p[1], e.p[2]);
      if (e.k === 'boom' || e.k === 'meteor_hit') a.duck();
    }),
    bus.on('fx:dmg', (e) => { if (e.target === localId) buzz(e.dmg >= 20 ? 'heavy' : 'light'); }),
    bus.on('fx:status', (e) => { if (e.id === localId && (e.k === 'freeze' || e.k === 'pin')) buzz('medium'); }),
  ];
  return () => { offs.forEach((o) => o()); loops.forEach((h) => h?.stop(0.05)); loops.clear(); };
}
