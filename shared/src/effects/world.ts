import { BALANCE } from '../balance';
import type { AttackKind } from '../passives';
import { auraOf, isInline, swingAtoms } from '../passives';
import type { Atom, EBody, Ent, EntKind, ESink } from './atoms';
import { castAtom } from './cast';
import { tickEnt } from './ents';
import { tickSlide } from './slides';

const E = BALANCE.effects;

/** Server/offline-only data of a live entity (never on the wire). */
export interface Live extends Ent {
  dmg: number; hits: Set<number>; held: Set<number>;
  /** Seconds to the next periodic step (orbit hits, ice drops, field refresh). */
  tick: number;
  /** Distance travelled (projectiles); floor = the owner's feet height at the cast (anchor landing). */
  went: number; floor: number; done: boolean;
}

/**
 * The effect world (phase 28): cooldowns, delayed casts, live entities and their rules. Pure: time comes from
 * `tick(dt)`, bodies and results go through the ESink. One per match on the server, one per offline CombatWorld.
 */
export class EffectWorld {
  time = 0;
  readonly live: Live[] = [];
  private nextId = 1;
  private cds = new Map<string, number>();
  private later: { at: number; fn: () => void }[] = [];
  private stacks = new Map<string, { n: number; until: number }>();
  /** Per-body scratch of the slide rules (slides.ts) and invisible-until times. */
  readonly mem = new Map<string, number>();
  private veil = new Map<number, number>();

  constructor(readonly sink: ESink) {}

  body(id: number): EBody | undefined { return this.sink.bodies().find((b) => b.id === id); }

  /** Enemies of `o` that can be hurt now (alive, other team, not immune). */
  foes(o: EBody): EBody[] {
    return this.sink.bodies().filter((b) => b.id !== o.id && b.team !== o.team && b.alive && this.sink.hurtable(b));
  }

  /** True (and the cooldown starts) when `key` is ready. */
  ready(key: string, cdS: number): boolean {
    const at = this.cds.get(key) ?? -1e9;
    if (this.time < at) return false;
    this.cds.set(key, this.time + cdS);
    return true;
  }

  /** A stackable timed counter (poison, haste): +1 up to max, expiring s after the latest add. Returns the new count. */
  stack(key: string, max: number, s: number): number {
    const e = this.stacks.get(key), n = e && e.until > this.time ? Math.min(max, e.n + 1) : 1;
    this.stacks.set(key, { n, until: this.time + s });
    return n;
  }

  /** Invisible for s seconds (a new call keeps the longer); `unveil` ends it (an attack, damage dealt). */
  hide(b: EBody, s: number): void {
    this.veil.set(b.id, Math.max(this.veil.get(b.id) ?? 0, this.time + s));
    this.sink.status(b, 'invis', s, 1);
  }
  unveil(b: EBody): void {
    if ((this.veil.get(b.id) ?? 0) <= this.time) return;
    this.veil.delete(b.id);
    this.sink.status(b, 'invis', 0, 0);
    this.sink.fx({ k: 'vanish', o: b.id, p: [b.x, b.y + 1, b.z] });
  }

  /** Seconds left on a cooldown (tests, HUD). */
  cdLeft(key: string): number { return Math.max(0, (this.cds.get(key) ?? -1e9) - this.time); }

  /** An attack starts: its swing atoms fire at the strike moment (delayS = windup). */
  swing(src: EBody, kind: AttackKind, combo: number, delayS: number): void {
    this.unveil(src);
    const atoms = swingAtoms(src.passives, { kind, combo, dist: 0, reach: 0 }).filter((a): a is Atom => !isInline(a));
    if (!atoms.length) return;
    const id = src.id;
    this.after(delayS, () => {
      const b = this.body(id);
      if (b?.alive) for (const a of atoms) castAtom(this, b, null, a);
    });
  }

  /** A toolkit atom from an on-hit / parry / slam hook: t = the body hit (or the attacker for parries). */
  apply(src: EBody, t: EBody | null, a: Atom): void { castAtom(this, src, t, a); }

  after(s: number, fn: () => void): void { if (s <= 0) fn(); else this.later.push({ at: this.time + s, fn }); }

  spawn(k: EntKind, o: number, x: number, y: number, z: number, yaw: number, life: number, r: number, v: [number, number, number] = [0, 0, 0], dmg = 0): Live | null {
    if (this.live.length >= E.maxEnts) return null;
    if (k !== 'orbit' && this.live.filter((e) => e.o === o).length >= E.maxPerOwner) return null;
    const e: Live = { id: this.nextId, k, o, x, y, z, yaw, age: 0, life, r, vx: v[0], vy: v[1], vz: v[2], dmg, hits: new Set(), held: new Set(), tick: 0, went: 0, floor: y, done: false };
    this.nextId = (this.nextId % 65535) + 1;
    this.live.push(e);
    return e;
  }

  tick(dt: number): void {
    this.time += dt;
    if (this.later.length) {
      const due = this.later.filter((l) => l.at <= this.time);
      this.later = this.later.filter((l) => l.at > this.time);
      for (const l of due) l.fn();
    }
    this.auras(dt);
    for (const e of this.live) { e.age += dt; tickEnt(this, e, dt); }
    for (let i = this.live.length - 1; i >= 0; i--) if (this.live[i].age >= this.live[i].life) this.live.splice(i, 1);
  }

  /** Orbiting blades follow every living owner whose form has them; slide effects (slides.ts). */
  private auras(dt: number): void {
    for (const b of this.sink.bodies()) {
      tickSlide(this, b, dt);
      const want = b.alive && auraOf(b.passives) === 'orbit';
      const has = this.live.find((e) => e.k === 'orbit' && e.o === b.id);
      if (want && !has) this.spawn('orbit', b.id, b.x, b.y, b.z, 0, 1e6, E.orbit.ring);
      else if (!want && has) has.life = 0;
    }
  }

  /** Drop everything (round reset, scene reset). */
  clear(): void { this.live.length = 0; this.later.length = 0; this.cds.clear(); this.stacks.clear(); this.mem.clear(); this.veil.clear(); }

  /** Wire view: the shared Ent fields only. */
  ents(): Ent[] {
    return this.live.filter((e) => e.age < e.life).map(({ id, k, o, x, y, z, vx, vy, vz, yaw, age, life, r }) => ({ id, k, o, x, y, z, vx, vy, vz, yaw, age, life, r }));
  }
}

/** Unit aim vector of a body (yaw/pitch, pitch up positive) and its eye height. */
export function aimOf(b: EBody): [number, number, number] {
  const cp = Math.cos(b.pitch);
  return [-Math.sin(b.yaw) * cp, Math.sin(b.pitch), -Math.cos(b.yaw) * cp];
}
export const fwdOf = (yaw: number): [number, number] => [-Math.sin(yaw), -Math.cos(yaw)];
export const eyeY = (b: EBody): number => b.y + BALANCE.eyeHeight;
export const flat = (ax: number, az: number, bx: number, bz: number): number => Math.hypot(ax - bx, az - bz);
