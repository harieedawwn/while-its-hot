import type { PassiveId } from '../passives';
import type { AtomFx, EBody, ESink, StatusKind } from './atoms';
import { EffectWorld } from './world';

/** A sink that records everything; bodies are plain objects the test moves. */
export class Rec implements ESink {
  dmg: { t: number; d: number; k: string }[] = [];
  knocks: { t: number; v: number[]; b?: boolean }[] = [];
  st: { t: number; k: StatusKind; s: number; v: number }[] = [];
  burns: number[] = [];
  burnDps: number[] = [];
  heals: { t: number; hp: number }[] = [];
  tps: { t: number; p: number[]; yaw: number }[] = [];
  fxs: AtomFx[] = [];
  constructor(public list: EBody[]) {}
  bodies() { return this.list; }
  hurtable(t: EBody) { return t.alive; }
  damage(t: EBody, d: number, _by: number, k: string) { this.dmg.push({ t: t.id, d, k }); }
  knock(t: EBody, v: number[], _ps?: number, b?: boolean) { this.knocks.push({ t: t.id, v, b }); }
  status(t: EBody, k: StatusKind, s: number, v = 0) { this.st.push({ t: t.id, k, s, v }); }
  burn(t: EBody, dps = 0) { this.burns.push(t.id); this.burnDps.push(dps); }
  heal(t: EBody, hp: number) { this.heals.push({ t: t.id, hp }); }
  teleport(t: EBody, p: number[], yaw: number) { this.tps.push({ t: t.id, p, yaw }); }
  fx(a: AtomFx) { this.fxs.push(a); }
  get total() { return this.dmg.length + this.knocks.length + this.st.length + this.burns.length + this.fxs.length + this.heals.length + this.tps.length; }
}

export const body = (id: number, x: number, z: number, passives: readonly PassiveId[] = []): EBody =>
  ({ id, team: id, x, y: 0, z, yaw: 0, pitch: 0, alive: true, passives });

/** Attacker at the origin facing -Z; foes at 2 m and 4.5 m in front. */
export function arena(passives: readonly PassiveId[]) {
  const me = body(1, 0, 0, passives), a = body(2, 0, -2), b = body(3, 0.6, -4.5);
  const sink = new Rec([me, a, b]);
  return { me, a, b, sink, w: new EffectWorld(sink) };
}
export const run = (w: EffectWorld, s: number) => { for (let t = 0; t < s; t += 0.05) w.tick(0.05); };
