import * as THREE from 'three';
import { bus } from '../core/events';
import type { FirstPersonCamera } from './camera';
import type { Viewmodel } from './viewmodel';

/** Wire bus events to the local camera and viewmodel. Returns an unbind function. */
export function bindFeel(cam: FirstPersonCamera, vm: Viewmodel): () => void {
  let slammed = false;
  const dir = new THREE.Vector3();
  const offs = [
    bus.on('move:slam', () => { slammed = true; vm.onLand(cam.onSlam()); }),
    // the slam's own land event follows it in the same tick; the slam already dipped
    bus.on('move:land', (e) => { if (slammed) { slammed = false; return; } vm.onLand(cam.onLand(e.speed)); }),
    bus.on('move:dash', (e) => cam.onDash(dir.set(e.x, 0, e.z))),
    bus.on('cam:trauma', (e) => cam.addTrauma(e.amount)),
    bus.on('cam:hitstop', (e) => cam.hitStop(e.ms)),
  ];
  return () => offs.forEach((off) => off());
}
