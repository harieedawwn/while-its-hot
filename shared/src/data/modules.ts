/**
 * Armor modules (GDD §7). `sockets` are the armor sockets the module renders on; gameplay effects are
 * data fields read by combat/passive code later (phase 08+), never switch-cased on the id.
 */
export const SOCKET_NAMES = [
  'head', 'chest', 'back', 'shoulder_l', 'shoulder_r', 'forearm_l', 'forearm_r',
  'thigh_l', 'thigh_r', 'shin_l', 'shin_r', 'heel_l', 'heel_r', 'hip',
] as const;
export type SocketName = (typeof SOCKET_NAMES)[number];

export interface ModuleDef { id: string; sockets: readonly SocketName[]; }

export const MODULES = [
  { id: 'phan_luc', sockets: ['back'] },
  { id: 'sung_may_vai', sockets: ['shoulder_r'] },
  { id: 'no_vai', sockets: ['shoulder_l'] },
  { id: 'banh_lan', sockets: ['heel_l', 'heel_r'] },
  { id: 'khien_tay', sockets: ['forearm_l'] },
  { id: 'binh_no', sockets: ['hip'] },
] as const satisfies readonly ModuleDef[];
export type ModuleId = (typeof MODULES)[number]['id'];
export const MODULE_IDS: readonly ModuleId[] = MODULES.map((m) => m.id);
