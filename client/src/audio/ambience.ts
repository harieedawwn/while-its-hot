import { FEEL } from '../core/feel';
import { rand, type AudioEngine, type Handle } from './engine';
import type { Vec3 } from './spatial';

/** A loop that follows the closest point of some shape to the listener (molten channels, the fire ring wall). */
export interface ShapeEmitter { id: string; nearest(l: Vec3, out: Vec3): boolean; db?: number }
/** A loop that plays only while `when(listener)` is true (inside the fire). 2D. */
export interface ZoneLoop { id: string; when(l: Vec3): boolean }
export interface AmbienceDef {
  bed: string;
  emitters?: ShapeEmitter[];
  zones?: ZoneLoop[];
  /** Random positional one-shots around the listener (AUDIO §3: distant clanks, chains, steam vents). */
  oneshots?: string[];
}

const AMB = FEEL.audio.amb;

/**
 * Ambience for one place: a 2D room-tone bed, positional loops that track the nearest point of their shape, zone loops,
 * and scattered one-shots every 4–12 s. Everything sits on the world bus, so `duck()` takes it down under big events.
 */
export class Ambience {
  private bed: Handle | null = null;
  private em: { e: ShapeEmitter; h: Handle | null; p: Vec3 }[] = [];
  private zones: { z: ZoneLoop; h: Handle | null }[] = [];
  private next = rand(AMB.every[0], AMB.every[1]) * 0.5;

  constructor(private a: AudioEngine, private def: AmbienceDef) {
    this.em = (def.emitters ?? []).map((e) => ({ e, h: null, p: { x: 0, y: 0, z: 0 } }));
    this.zones = (def.zones ?? []).map((z) => ({ z, h: null }));
  }

  /** Per frame (after setListener). Starts lazily: the context may only unlock on the first touch. */
  update(dt: number): void {
    const a = this.a;
    if (!a.running) return;
    const l = a.listenerPos;
    this.bed ??= a.loop(this.def.bed);
    for (const m of this.em) {
      const on = m.e.nearest(l, m.p);
      if (on && !m.h) m.h = a.loop(m.e.id, { pos: { ...m.p }, db: m.e.db });
      else if (!on && m.h) { m.h.stop(0.5); m.h = null; }
      m.h?.move(m.p);
    }
    for (const z of this.zones) {
      const on = z.z.when(l);
      if (on && !z.h) { z.h = a.loop(z.z.id, { db: -12 }); z.h?.setDb(0, 0.15); }
      else if (!on && z.h) { z.h.stop(0.3); z.h = null; }
    }
    const shots = this.def.oneshots;
    if (shots?.length && (this.next -= dt) <= 0) {
      this.next = rand(AMB.every[0], AMB.every[1]);
      const ang = Math.random() * Math.PI * 2, d = rand(AMB.dist[0], AMB.dist[1]);
      a.play(shots[Math.floor(Math.random() * shots.length)], { pos: { x: l.x + Math.cos(ang) * d, y: l.y + rand(1, 8), z: l.z + Math.sin(ang) * d } });
    }
  }

  dispose(): void {
    this.bed?.stop(0.4); this.bed = null;
    this.em.forEach((m) => m.h?.stop(0.3));
    this.zones.forEach((z) => z.h?.stop(0.3));
  }
}
