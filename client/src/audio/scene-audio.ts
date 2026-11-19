import * as THREE from 'three';
import type { CollisionWorld } from '../physics/world';
import { Ambience, type AmbienceDef } from './ambience';
import { getAudio } from './engine';
import { bindAudio, type AudioBinding } from './events';
import type { Area } from './graph';

export interface SceneAudioOpts {
  /** Level geometry for occlusion (one ray listener → voice at 4 Hz). */
  world?: CollisionWorld;
  area?: Area;
  ambience?: AmbienceDef | null;
  /** Local combatant id (own sounds are 2D). */
  localId?: number;
}

/** What a scene owns for sound: the bus binding, its ambience, the occlusion probe, and the listener. */
export class SceneAudio {
  readonly a = getAudio();
  private bind: AudioBinding;
  private amb: Ambience | null;
  private lp = { x: 0, y: 0, z: 0 };
  private ro = new THREE.Vector3();
  private rd = new THREE.Vector3();

  constructor(o: SceneAudioOpts = {}) {
    const a = this.a;
    a.setArea(o.area ?? 'hall_foundry');
    const w = o.world;
    a.setOcclusionProbe(w ? (from, to) => {
      this.rd.set(to.x - from.x, to.y - from.y, to.z - from.z);
      const d = this.rd.length();
      if (d < 1.5) return false;
      const hit = w.raycast(this.ro.set(from.x, from.y, from.z), this.rd.divideScalar(d), d - 0.6);
      return !!hit;
    } : null);
    this.bind = bindAudio(a, o.localId ?? 0);
    this.amb = o.ambience ? new Ambience(a, o.ambience) : null;
  }

  /** Per render frame: listener at the camera (eye position, yaw), loops that follow speed, ambience. */
  frame(dt: number, eye: THREE.Vector3, yaw: number, speed = 0): void {
    this.lp.x = eye.x; this.lp.y = eye.y; this.lp.z = eye.z;
    this.a.setListener(this.lp, yaw);
    this.a.update(dt);
    this.bind.frame(dt, speed);
    this.amb?.update(dt);
  }

  dispose(): void {
    this.bind.dispose(); this.amb?.dispose();
    this.a.setOcclusionProbe(null);
  }
}
