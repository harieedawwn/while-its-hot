import type { Family } from '@wih/shared';
import { bus } from '../core/events';
import { FEEL } from '../core/feel';
import type { AudioEngine, Handle } from './engine';
import { buzz } from './haptics';
import type { Vec3 } from './spatial';

/**
 * Gameplay bus → sounds + haptics (AUDIO §2 "audio/events.ts"). The only place that decides which sound an event makes.
 * Local player's own sounds are 2D; everyone else's are positional. `localId` is the local combatant (0 in dev scenes).
 */
const R = FEEL.audio.react, MIX = FEEL.audio.mix;
const SWING: Record<Family, string> = { kiem: 'swing_sword', bua: 'swing_hammer', thuong: 'swing_polearm' };
const FOOT: Record<string, string> = { stone: 'footstep_stone', metal: 'footstep_metal', grate: 'footstep_metal', wood: 'footstep_wood', gravel: 'footstep_slag' };
const STRIKE = { tuyet: 'strike_tuyet', dat: 'strike_dat', giu: 'strike_giu', hong: 'strike_hong' } as const;
const at = (e: { x: number; y: number; z: number }): Vec3 => ({ x: e.x, y: e.y, z: e.z });

export interface AudioBinding {
  /** Per render frame: listener-dependent loops (slide pitch by speed, slam wind rise). */
  frame(dt: number, speed: number): void;
  dispose(): void;
}

export function bindAudio(a: AudioEngine, localId = 0): AudioBinding {
  const loops: Record<string, Handle | null> = {};
  const stop = (k: string, fade = 0.08) => { loops[k]?.stop(fade); loops[k] = null; };
  const loop = (k: string, ev: string, db = 0) => { stop(k, 0.02); loops[k] = a.loop(ev, { db }); return loops[k]; };
  const charges = new Map<number, Handle | null>();
  let slamT = -1;
  const own = (id: number) => id === localId;

  const off = [
    // movement (local player only: remote movement arrives with netplay)
    bus.on('move:step', (e) => a.play(FOOT[e.surface] ?? 'footstep_stone', { db: MIX.footOwn - MIX.footEnemy })),
    bus.on('move:jump', (e) => a.play(e.kind === 'walljump' ? 'walljump' : 'jump')),
    bus.on('move:land', (e) => {
      const hard = e.speed >= R.landHard;
      a.play(hard ? 'land_hard' : 'land_soft', { db: hard ? Math.min(3, (e.speed - R.landHard) * 0.4) : Math.min(0, (e.speed - R.landHard) * 0.6) });
    }),
    bus.on('move:dash', () => a.play('dash')),
    bus.on('move:slide', (e) => {
      if (e.on) { a.play('slide_start'); loop('slide', 'slide_loop'); }
      else if (loops.slide) { stop('slide', 0.12); a.play('slide_end'); }
    }),
    bus.on('move:slamstart', () => { slamT = 0; loop('slam', 'slam_fall', -8)?.setRate(0.8); }),
    bus.on('move:slam', () => { slamT = -1; stop('slam', 0.03); a.play('slam_land'); a.duck(); buzz('medium'); }),

    // melee
    // the charge has no position on the bus: only the local player's is heard (tension swells in over ~1 s)
    bus.on('combat:charge', (e) => { if (!own(e.id)) return; charges.get(e.id)?.stop(0.05); const h = a.loop('heavy_charge', { db: -12 }); h?.setDb(0, 0.4); charges.set(e.id, h); }),
    bus.on('combat:swing', (e) => {
      const ch = charges.get(e.id); if (ch) { ch.stop(0.04); charges.delete(e.id); }
      const pos = own(e.id) ? undefined : at(e);
      if (e.kind === 'heavy') a.play('heavy_release', { pos });
      else a.play(SWING[e.family], { pos, pitch: 1 + R.comboPitch * e.combo, db: e.kind === 'dash' ? 2 : 0 });
    }),
    bus.on('combat:hit', (e) => {
      const pos = own(e.attacker) || own(e.target) ? undefined : at(e);
      if (e.result === 'blocked') a.play('hit_blocked', { pos });
      else {
        a.play(e.zone === 'head' || e.result === 'pierced' ? 'hit_flesh' : 'hit_armor', { pos });
        if (e.result === 'guardbreak') a.play('stagger', { pos });
      }
      if (own(e.target)) buzz('medium'); else if (own(e.attacker)) buzz('light');
    }),
    bus.on('combat:parry', (e) => {
      a.play('parry', { pos: own(e.parrier) || own(e.attacker) ? undefined : at(e) }); a.duck();
      if (own(e.parrier) || own(e.attacker)) buzz('medium');
    }),
    bus.on('combat:kill', (e) => {
      a.play('kill'); a.duck(-6, 0.6);
      if (own(e.target)) { a.play('death'); a.muffle(true); buzz('heavy'); }
    }),

    // forge
    bus.on('forge:anvil', (e) => { if (e.act === 'placed') a.play('anvil_place', { pos: own(e.owner) ? undefined : at(e) }); else if (e.act === 'lift') a.play('anvil_lift', { pos: own(e.owner) ? undefined : at(e) }); }),
    bus.on('forge:heating', (e) => {
      if (e.on) { const h = loops.heat ?? loop('heat', 'heat_loop', -12); h?.setDb(0, R.heatTau); h?.setCutoff(16000); }
      else { loops.heat?.setDb(-14, R.heatTau); loops.heat?.setCutoff(900); }
    }),
    bus.on('forge:stance', (e) => { if (!e.on && own(e.owner)) stop('heat', 0.4); }),
    bus.on('forge:strike', (e) => {
      const pos = at(e);
      if (e.refused) a.play('strike_refused', { pos });
      else if (e.broke) { a.play('gay', { pos }); a.duck(); buzz('medium'); }
      else { a.play(STRIKE[e.outcome], { pos, db: e.auto ? -3 : 0 }); buzz('light'); }
    }),
    bus.on('forge:evolve', () => { a.play('quench'); a.duck(-5, 0.8); buzz('heavy'); }),
    bus.on('forge:frenzy', (e) => {
      if (e.on) { a.play('frenzy_start'); loop('frenzy', 'frenzy_loop'); a.duck(); }
      else { stop('frenzy', 0.3); a.play('frenzy_end'); }
    }),

    // world / match flow
    bus.on('world:cages', (e) => { if (e.act === 'tick') a.play('cage_tick'); else { a.play('cage_open'); a.duck(-8, 0.8); } }),

    bus.on('app:pause', (e) => a.pause(e.paused)),
  ];

  return {
    frame(dt, speed) {
      const k = Math.min(1, speed / R.slideFast);
      loops.slide?.setRate(R.slideRate[0] + (R.slideRate[1] - R.slideRate[0]) * k);
      if (slamT >= 0 && loops.slam) {
        slamT += dt;
        const u = Math.min(1, slamT / R.slamRise);
        loops.slam.setRate(0.8 + (R.slamRate - 0.8) * u); loops.slam.setDb(-8 + 8 * u, 0.1);
      }
    },
    dispose() {
      off.forEach((f) => f());
      Object.keys(loops).forEach((k) => stop(k, 0.05));
      charges.forEach((h) => h?.stop(0.05));
      a.muffle(false);
    },
  };
}
