import * as THREE from 'three';
import type { WeaponDef } from '@wih/shared';
import { IDLE_INPUT } from '../player/character/animator';
import { Character } from '../player/character/character';
import { flat, mesh, slab, cyl } from '../render/models/kit';
import type { LightRig } from '../render/lights';
import type { MaterialLib } from '../render/materials/library';
import { STR } from '../ui/strings.vi';
import { TextBoard } from './boards';

/** Where each station stands (arena corner north-west of the dais, in front of the cage wall) and how close you must be. */
export const YARD = {
  z: -26.4,
  rack: { x: -25.5, w: 2.6 }, armor: { x: -22.2 }, chalk: { x: -18 }, lever: { x: -13.6 },
  reach: 1.9,
} as const;

export type StationId = 'rack' | 'armor' | 'lever';
export interface Station { id: StationId; pos: THREE.Vector3 }

/**
 * The yard's props (GDD §10): weapon rack with the unlocked forms standing in it, an armor stand wearing the chosen
 * tier, the dummy-mode lever board and the chalkboard (last hit + 5 s DPS). All painted/world-space, no panels.
 * Every station faces south (+Z) toward the dummies; `nearest` is what the Rèn press acts on.
 */
export class Yard {
  readonly root = new THREE.Group();
  readonly stations: Station[] = [];
  private chalk: TextBoard;
  private sign: TextBoard;
  private arm = new THREE.Group();
  private stand: Character;
  private standLabel: TextBoard;
  private rackRoot = new THREE.Group();
  private rackModels = new Map<string, THREE.Object3D>();
  private lever = new THREE.Group();
  private leverK = 0;
  private leverTo = 0;

  constructor(private lib: MaterialLib, rig: LightRig) {
    const wood = lib.get('wood'), steel = lib.get('steel'), rust = lib.get('rust');
    const at = (g: THREE.Object3D, x: number, y: number, z = YARD.z) => { g.position.set(x, y, z); this.root.add(g); return g; };
    const add = (p: THREE.Object3D, m: THREE.Material, w: number, h: number, d: number, x: number, y: number, z: number) => {
      const b = mesh(slab(w, h, d, 1), m); b.position.set(x, y, z); p.add(b); return b;
    };

    // chalkboard: dark slate on two posts, wood frame
    const c = new THREE.Group();
    add(c, wood, 3.5, 1.9, 0.12, 0, 1.75, 0);
    for (const s of [-1, 1]) add(c, steel, 0.14, 2.8, 0.14, s * 1.7, 1.4, 0);
    this.chalk = new TextBoard(rig, 3.2, 1.6, 56, '#262a2a', '#d8d4c4');
    this.chalk.mesh.position.set(0, 1.75, 0.07); c.add(this.chalk.mesh);
    at(c, YARD.chalk.x, 0);

    // lever board: a sign with the mode word and a hand lever beside it
    const l = new THREE.Group();
    add(l, wood, 1.9, 1.3, 0.1, 0, 1.55, 0);
    for (const s of [-1, 1]) add(l, steel, 0.1, 2.2, 0.1, s * 0.95, 1.1, 0);
    this.sign = new TextBoard(rig, 1.7, 0.9, 64, '#3a3128', '#f0cd7a');
    this.sign.mesh.position.set(0, 1.75, 0.06); l.add(this.sign.mesh);
    add(l, rust, 0.34, 0.5, 0.16, 0, 0.9, 0.1); // lever box
    const arm = mesh(flat(cyl(0.035, 0.035, 0.55, 6)), steel); arm.position.y = 0.27;
    const knob = mesh(flat(new THREE.SphereGeometry(0.075, 6, 5)), rust); knob.position.y = 0.58;
    this.lever.add(arm, knob); this.lever.position.set(0, 0.95, 0.2);
    l.add(this.lever);
    at(l, YARD.lever.x, 0);

    // armor stand: post, cross-bar, the worn tier and a small painted tag
    const a = new THREE.Group();
    add(a, rust, 1.2, 0.12, 1.0, 0, 0.06, 0);
    add(a, wood, 0.1, 1.5, 0.1, 0, 0.8, -0.38);
    this.stand = new Character(lib, { color: '#8a8a82' });
    this.stand.root.position.set(0, 0.12, 0); this.stand.root.rotation.y = 0; this.stand.update(0, IDLE_INPUT);
    a.add(this.stand.root);
    this.standLabel = new TextBoard(rig, 0.8, 0.4, 40, '#3a3128', '#e8c070');
    this.standLabel.mesh.position.set(0, 2.2, -0.38); a.add(this.standLabel.mesh);
    at(a, YARD.armor.x, 0);

    // weapon rack: back board, two posts, floor rail; the weapons are added by setRack
    this.rackRoot.position.set(YARD.rack.x, 0, YARD.z);
    this.root.add(this.rackRoot);

    this.stations.push(
      { id: 'rack', pos: new THREE.Vector3(YARD.rack.x, 0, YARD.z + 1.2) },
      { id: 'armor', pos: new THREE.Vector3(YARD.armor.x, 0, YARD.z + 1.2) },
      { id: 'lever', pos: new THREE.Vector3(YARD.lever.x, 0, YARD.z + 1.2) },
    );
    this.setMode('idle', false);
  }

  /** (Re)build the rack for the given forms. `models` are fresh weapon models, one per offer. */
  setRack(offers: WeaponDef[], models: THREE.Object3D[]): void {
    const { lib, rackRoot } = this;
    for (const o of [...rackRoot.children]) { rackRoot.remove(o); o.traverse((n) => { if (n instanceof THREE.Mesh) n.geometry.dispose(); }); }
    this.rackModels.clear();
    const gap = 0.52, w = Math.max(1.4, offers.length * gap + 0.4);
    const wood = lib.get('wood'), steel = lib.get('steel');
    const add = (m: THREE.Material, bw: number, bh: number, bd: number, x: number, y: number, z: number) => {
      const b = mesh(slab(bw, bh, bd, 1), m); b.position.set(x, y, z); rackRoot.add(b);
    };
    add(lib.get('coal'), w, 1.9, 0.08, 0, 1.2, -0.36);
    for (const s of [-1, 1]) add(steel, 0.12, 2.3, 0.12, s * (w / 2 + 0.05), 1.15, -0.3);
    add(steel, w + 0.3, 0.1, 0.1, 0, 2.2, -0.3);
    add(wood, w, 0.12, 0.5, 0, 0.06, -0.1);
    offers.forEach((o, i) => {
      const m = models[i], x = (i - (offers.length - 1) / 2) * gap;
      m.rotation.set(0, -Math.PI / 2, 0); m.position.set(x, 0.12, -0.12);
      rackRoot.add(m); this.rackModels.set(o.id, m);
    });
  }
  /** The form in hand leaves its cradle. */
  setHeld(id: string): void { for (const [k, m] of this.rackModels) m.visible = k !== id; }

  setArmor(level: number): void {
    this.stand.setArmor(level, []);
    this.standLabel.draw([{ text: STR.yard.armor, size: 14 }, { text: STR.armory.level(level), size: 20 }]);
  }

  setMode(mode: keyof typeof STR.yard.modes, pull = true): void {
    this.sign.draw([{ text: STR.yard.dummies, size: 15, color: '#c0b090' }, { text: STR.yard.modes[mode], size: 24 }]);
    this.leverTo = pull ? 1 : 0;
    if (!pull) { this.leverK = 0; this.lever.rotation.z = 0.5; }
  }

  chalkboard(last: number, dps: number): void {
    this.chalk.draw([
      { text: STR.yard.lastHit, size: 11, color: '#a8a494' }, { text: last > 0 ? last.toFixed(0) : '-', size: 22 },
      { text: STR.yard.dps, size: 11, color: '#a8a494' }, { text: dps > 0 ? dps.toFixed(1) : '-', size: 22 },
    ]);
  }

  /** The station within reach of `p` (nearest wins), or null. */
  nearest(p: THREE.Vector3): StationId | null {
    let best: StationId | null = null, bd: number = YARD.reach;
    for (const s of this.stations) { const d = Math.hypot(p.x - s.pos.x, p.z - s.pos.z); if (d < bd) { bd = d; best = s.id; } }
    return best;
  }

  update(dt: number): void {
    this.leverK += (this.leverTo - this.leverK) * Math.min(1, dt * 14);
    this.lever.rotation.z = 0.5 - this.leverK * 1.0;
    if (this.leverK > 0.95) this.leverTo = 0;
  }

  dispose(): void {
    this.chalk.dispose(); this.sign.dispose(); this.standLabel.dispose(); this.stand.dispose();
    this.root.traverse((n) => { if (n instanceof THREE.Mesh) n.geometry.dispose(); });
  }
}
