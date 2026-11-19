/** Binary State (client->server, 20 Hz) and Snapshot (server->client). Little-endian DataView. */
export interface NetState {
  x: number; y: number; z: number; vx: number; vy: number; vz: number;
  yaw: number; pitch: number; anim: number; animT: number; flags: number; weapon: number; level: number;
  /** Stamina pips (0..3, 1/60 steps). armor/hp are written by the server into snapshots (the client sends 0). */
  stamina: number; armor: number; hp: number;
}
/** swing = parity of the fighter's swing counter (a new swing with the same anim code still restarts the clip). */
export const FLAG = { grounded: 1, sliding: 2, blocking: 4, parrying: 8, forging: 16, dashing: 32, swing: 64, dead: 128 } as const;
export const MSG_STATE = 1, MSG_SNAPSHOT = 2;
const STATE_BYTES = 32;
const clampI16 = (v: number) => Math.max(-32768, Math.min(32767, Math.round(v)));

function putState(dv: DataView, o: number, s: NetState): void {
  dv.setFloat32(o, s.x, true); dv.setFloat32(o + 4, s.y, true); dv.setFloat32(o + 8, s.z, true);
  dv.setInt16(o + 12, clampI16(s.vx * 256), true); dv.setInt16(o + 14, clampI16(s.vy * 256), true); dv.setInt16(o + 16, clampI16(s.vz * 256), true);
  dv.setInt16(o + 18, clampI16((s.yaw / Math.PI) * 32767), true); dv.setInt16(o + 20, clampI16((s.pitch / (Math.PI / 2)) * 32767), true);
  dv.setUint8(o + 22, s.anim); dv.setUint16(o + 23, Math.min(65535, Math.round(s.animT * 1000)), true);
  dv.setUint8(o + 25, s.flags); dv.setUint8(o + 26, s.weapon); dv.setUint8(o + 27, s.level);
  dv.setUint8(o + 28, Math.max(0, Math.min(255, Math.round(s.stamina * 60)))); dv.setUint8(o + 29, s.armor);
  dv.setUint8(o + 30, Math.max(0, Math.min(255, Math.ceil(s.hp))));
}
function getState(dv: DataView, o: number): NetState {
  return {
    x: dv.getFloat32(o, true), y: dv.getFloat32(o + 4, true), z: dv.getFloat32(o + 8, true),
    vx: dv.getInt16(o + 12, true) / 256, vy: dv.getInt16(o + 14, true) / 256, vz: dv.getInt16(o + 16, true) / 256,
    yaw: (dv.getInt16(o + 18, true) / 32767) * Math.PI, pitch: (dv.getInt16(o + 20, true) / 32767) * (Math.PI / 2),
    anim: dv.getUint8(o + 22), animT: dv.getUint16(o + 23, true) / 1000,
    flags: dv.getUint8(o + 25), weapon: dv.getUint8(o + 26), level: dv.getUint8(o + 27),
    stamina: dv.getUint8(o + 28) / 60, armor: dv.getUint8(o + 29), hp: dv.getUint8(o + 30),
  };
}
export function encodeState(s: NetState): ArrayBuffer {
  const b = new ArrayBuffer(1 + STATE_BYTES), dv = new DataView(b);
  dv.setUint8(0, MSG_STATE); putState(dv, 1, s); return b;
}
export function decodeState(b: ArrayBuffer): NetState | null {
  if (b.byteLength !== 1 + STATE_BYTES) return null;
  const dv = new DataView(b); return dv.getUint8(0) === MSG_STATE ? getState(dv, 1) : null;
}
export interface SnapEntry { id: number; state: NetState }
export interface Snapshot { serverTime: number; players: SnapEntry[] }
export function encodeSnapshot(s: Snapshot): ArrayBuffer {
  const b = new ArrayBuffer(6 + s.players.length * (1 + STATE_BYTES)), dv = new DataView(b);
  dv.setUint8(0, MSG_SNAPSHOT); dv.setUint32(1, s.serverTime >>> 0, true); dv.setUint8(5, s.players.length);
  s.players.forEach((p, i) => { const o = 6 + i * (1 + STATE_BYTES); dv.setUint8(o, p.id); putState(dv, o + 1, p.state); });
  return b;
}
export function decodeSnapshot(b: ArrayBuffer): Snapshot | null {
  if (b.byteLength < 6) return null;
  const dv = new DataView(b); if (dv.getUint8(0) !== MSG_SNAPSHOT) return null;
  const n = dv.getUint8(5); if (b.byteLength !== 6 + n * (1 + STATE_BYTES)) return null;
  const players: SnapEntry[] = [];
  for (let i = 0; i < n; i++) { const o = 6 + i * (1 + STATE_BYTES); players.push({ id: dv.getUint8(o), state: getState(dv, o + 1) }); }
  return { serverTime: dv.getUint32(1, true), players };
}
