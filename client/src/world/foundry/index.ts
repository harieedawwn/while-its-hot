import * as THREE from 'three';
import { FOUNDRY } from '@wih/shared';
import { bakeAO } from '../../render/geo/ao';
import type { LightRig } from '../../render/lights';
import { MaterialLib } from '../../render/materials/library';
import { CollisionWorld } from '../../physics/world';
import { RegionBatch } from '../region-batch';
import { buildCatwalks } from './catwalks';
import { PAL, type Ctx } from './ctx';
import { CageDoors } from './cages';
import { buildCrane } from './crane';
import { buildFloor } from './floor';
import { buildFurnace } from './furnace';
import { buildLandmarks } from './landmarks';
import { Molten } from './molten';
import { FireRing } from './ring';
import { buildShell } from './shell';

/** Light region size in meters (3×3 over the 60 m floor). Smaller = more draw calls, better local lights. */
const REGION = 20;
const SURFACES = ['brick', 'concrete', 'rust', 'steel', 'grate', 'slag', 'coal', 'wood', 'paint', 'glow'] as const;

/** Ember-dark scene lighting for the foundry (LOOK §1.6). */
export function applyFoundryLook(rig: LightRig): void {
  rig.setHemi('#6a5650', '#8a4820', 2.5);
  rig.setDir([0.2, 1, 0.35], '#7a9ab8', 1.1);
  rig.setFog('#22100a', 44, 128);
}

export interface FoundryView {
  root: THREE.Group;
  /** Static meshes (collision source). */
  statics: THREE.Mesh[];
  world: CollisionWorld;
  update(dt: number, time: number): void;
  /** 0 closed … 1 open, instantly. */
  setDoors(p: number): void;
  openCages(): void;
  closeCages(): void;
  /** Show the fire ring around ring center `i` with `radius` m (0 hides it). */
  setRing(i: number, radius: number): void;
  /** The live fire ring (radius 0 = none), for embers and the inside tint. */
  readonly ring: { readonly cx: number; readonly cz: number; readonly radius: number };
  dispose(): void;
}

/** Build the whole arena: statics (batched per light region), molten sheet, cage doors, fire ring, lights. */
export async function createFoundry(rig: LightRig, seed = 1): Promise<FoundryView> {
  const lib = await MaterialLib.load(rig, SURFACES);
  const c: Ctx = { lib, seed, b: new RegionBatch(FOUNDRY.half, REGION), pal: PAL };
  buildFloor(c); buildShell(c); buildFurnace(c); buildCatwalks(c); buildCrane(c); buildLandmarks(c);
  const statics = c.b.build();
  bakeAO(statics.filter((m) => m.material !== lib.get('glow')), { rays: 6, dist: 2.2, strength: 0.7 });

  const root = new THREE.Group();
  statics.forEach((m) => root.add(m));
  const world = CollisionWorld.fromMeshes(statics);

  const molten = new Molten(rig, lib.get('coal'));
  const doors = new CageDoors(lib);
  const ring = new FireRing(rig);
  root.add(molten.sheet, molten.crust, doors.group, ring.mesh);
  addLights(rig);

  return {
    root, statics, world, ring,
    update(dt, time) { molten.update(time); doors.update(dt); ring.update(time); },
    setDoors: (p) => doors.set(p),
    openCages: () => doors.open(),
    closeCages: () => doors.close(),
    setRing(i, radius) { const [x, z] = FOUNDRY.ringCenters[i % FOUNDRY.ringCenters.length]; ring.set(x, z, radius); },
    dispose() { statics.forEach((m) => m.geometry.dispose()); molten.dispose(); doors.dispose(); ring.dispose(); },
  };
}

/** The foundry's point lights: furnace, molten channels, dais, cold catwalk lamps, crane. */
function addLights(rig: LightRig): void {
  const warm = '#ff7a30';
  rig.add([0, 6, -27], '#ffd9a0', 5.5, 28);
  rig.add([0, 4.5, -33], '#ff9a50', 3, 13);
  for (const d of [14, 24]) for (const [x, z] of [[d, 0], [-d, 0], [0, d], [0, -d]]) rig.add([x, 0.7, z], warm, 3.2, 14);
  rig.add([0, 6.5, 0], '#ff9a58', 2, 16);
  rig.add([-22, 2.6, -11], '#ff7a30', 2.8, 13); // glowing slag heap
  for (const [x, z] of [[9, 0], [-9, 0], [9, 17], [-9, -17], [9, -17], [-9, 17]]) rig.add([x, 7.4, z], '#7ea4cc', 1.5, 13);
  rig.add([6, 9, 20], '#ffb070', 1.8, 14);
  rig.add([-18, 12.5, 6], '#7ea4cc', 1.3, 16);
  rig.add([18, 12.5, -6], '#7ea4cc', 1.3, 16);
}
