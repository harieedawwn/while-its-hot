import { FEEL } from '../core/feel';
import type * as THREE from 'three';
import { FLAG, mirrorFighter, type NetState, WEAPONS, weaponById } from '@wih/shared';
import { Combatant } from '../combat/combatant';
import { holdWeapon } from '../weapons/hold';
import { FighterAnim } from '../combat/fighter-anim';
import { bus } from '../core/events';
import type { CollisionWorld } from '../physics/world';
import { IDLE_INPUT } from '../player/character/animator';
import { Character } from '../player/character/character';
import { animInputFromMove } from '../player/character/drive';
import { Player } from '../player/player';
import type { MaterialLib } from '../render/materials/library';
import { InterpBuffer, type SampleMode } from './interp';
import { emptyState } from './pack';
import { disposeTree } from '../render/dispose';

/**
 * Another player as this client sees them: an interpolated body (TECH §4), a mirrored Fighter (so blade
 * sweeps, aim assist and the hit prediction read real parry/block/dead state), the third-person character
 * with its clips, armor tier and held form from the server's snapshot. Never simulated here.
 */
export class RemotePlayer {
  readonly c: Combatant;
  readonly ch: Character;
  readonly buf = new InterpBuffer();
  mode: SampleMode = 'none';
  /** Server ms of the last snapshot that carried this player. */
  seenAt = 0;
  private st = emptyState();
  private anim: FighterAnim;
  private animIn = { ...IDLE_INPUT };
  private parity = false;
  private weapon = -1;
  private models: THREE.Object3D[] = [];
  private token = 0;
  private phase = 'idle';

  constructor(readonly id: number, world: CollisionWorld, lib: MaterialLib, color: string, private load: (id: string) => Promise<THREE.Object3D>) {
    this.c = new Combatant(id, new Player(world, [0, -50, 0], 0, false), weaponById(WEAPONS[0].id), { team: id });
    this.c.netOwned = true;
    this.ch = new Character(lib, { color });
    this.ch.root.visible = false;
    this.anim = new FighterAnim(this.ch);
  }

  /** Sample the buffer at render time rt (match ms) and mirror it onto body + fighter. */
  apply(rt: number): void {
    this.mode = this.buf.sample(rt, this.st);
    if (this.mode === 'none') return;
    const st = this.st, s = this.c.body.s, f = this.c.fighter;
    s.pos.set(st.x, st.y, st.z); s.vel.set(st.vx, st.vy, st.vz);
    s.grounded = (st.flags & FLAG.grounded) !== 0;
    s.sliding = s.low = (st.flags & FLAG.sliding) !== 0;
    s.stamina = st.stamina;
    this.c.body.yaw = st.yaw; this.c.body.pitch = st.pitch;
    this.c.hp = st.hp; this.c.level = st.level; this.c.armor = st.armor;
    if (st.weapon !== this.weapon) this.setWeapon(st.weapon);
    if (st.armor !== this.ch.armorLevel) this.ch.setArmor(st.armor);
    const dead = (st.flags & FLAG.dead) !== 0, ghost = (st.flags & FLAG.ghost) !== 0, parity = (st.flags & FLAG.swing) !== 0;
    if (dead) { if (!f.dead) f.kill(); }
    else {
      if (f.dead) this.c.revive();
      if (mirrorFighter(f, st.anim, st.animT, parity, this.parity)) {
        bus.emit('combat:swing', { id: this.id, kind: f.kind, combo: f.combo, family: f.weapon.stats.moveset, x: st.x, y: st.y + 1.5, z: st.z });
      }
    }
    this.parity = parity;
    this.c.ghost = ghost;
    if (ghost !== this.ch.ghost) this.ch.setGhost(ghost);
    this.ch.setVeil(this.c.invisT > 0 && !ghost);
    if (f.phase !== this.phase) {
      if (f.phase === 'parry') bus.emit('combat:guard', { id: this.id, act: 'parry' });
      else if (f.phase === 'block') bus.emit('combat:guard', { id: this.id, act: 'block_on' });
      else if (this.phase === 'block') bus.emit('combat:guard', { id: this.id, act: 'block_off' });
      this.phase = f.phase;
    }
    this.anim.sync(f);
  }

  /** Per render frame, after apply(). */
  render(dt: number, frozen: boolean, viewer?: { x: number; z: number }): void {
    this.c.invisT = Math.max(0, this.c.invisT - dt);
    this.ch.root.visible = this.mode !== 'none'; // 'hold' = frozen in place (TECH §4), still drawn
    if (!this.ch.root.visible) return;
    const s = this.c.body.s;
    this.ch.root.position.copy(s.pos);
    this.ch.root.rotation.y = this.c.body.yaw;
    const d = viewer ? Math.hypot(s.pos.x - viewer.x, s.pos.z - viewer.z) : 0;
    const L = FEEL.render.lod; // far bodies are a few pixels at this resolution: re-skin them less often
    this.ch.update(frozen ? 0 : dt, animInputFromMove(s, this.c.body.yaw, this.animIn), d > L.farM ? L.farEvery : d > L.midM ? L.midEvery : 1);
  }

  /** A respawn or teleport: forget the path so it does not slide across the map. */
  teleport(): void { this.buf.clear(); }

  private setWeapon(idx: number): void {
    this.weapon = idx;
    const def = WEAPONS[idx] ?? WEAPONS[0];
    this.c.fighter.setWeapon(def);
    const t = ++this.token;
    void this.load(def.id).then((m) => {
      if (t !== this.token) return;
      for (const o of this.models) { o.removeFromParent(); disposeTree(o); }
      this.models = holdWeapon(this.ch.hold, m, def);
    });
  }

  dispose(): void { this.token++; this.ch.root.removeFromParent(); this.ch.dispose(); }
}
