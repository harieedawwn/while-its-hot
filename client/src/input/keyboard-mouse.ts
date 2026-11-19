import { FEEL } from '../core/feel';
import type { Actions, Button } from './actions';

/** Dev keyboard + mouse (LOOK §6). C is a second slide key: Ctrl+W closes the browser tab. V / X = Đánh / Đỡ without pointer lock (headless checks). */
const KEYS: Record<string, Button> = {
  Space: 'jump', ShiftLeft: 'slide', ShiftRight: 'slide', ControlLeft: 'slide', ControlRight: 'slide', KeyC: 'slide',
  KeyE: 'forge', KeyF: 'anvil', KeyQ: 'swap', KeyV: 'attack', KeyX: 'parry', Tab: 'scoreboard', Escape: 'pause',
};
const MOVE = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD']);

/** Binds keyboard + pointer-locked mouse to the action layer. Returns an unbind function. */
export function bindKeyboardMouse(actions: Actions, target: HTMLElement, sens: number = FEEL.input.mouseSens): () => void {
  const keys = new Set<string>();
  const syncMove = () => actions.setMove(
    (keys.has('KeyD') ? 1 : 0) - (keys.has('KeyA') ? 1 : 0),
    (keys.has('KeyW') ? 1 : 0) - (keys.has('KeyS') ? 1 : 0));
  const kd = (e: KeyboardEvent) => {
    if (e.repeat) return;
    if (MOVE.has(e.code)) { keys.add(e.code); syncMove(); e.preventDefault(); return; }
    const b = KEYS[e.code];
    if (b) { actions.down(b); if (e.code !== 'Escape') e.preventDefault(); }
  };
  const ku = (e: KeyboardEvent) => {
    if (MOVE.has(e.code)) { keys.delete(e.code); syncMove(); return; }
    const b = KEYS[e.code];
    if (b) actions.up(b);
  };
  const locked = () => document.pointerLockElement === target;
  const md = (e: MouseEvent) => {
    if (!locked()) { void target.requestPointerLock?.(); return; }
    if (e.button === 0) actions.down('attack');
    if (e.button === 2) actions.down('parry');
  };
  const mu = (e: MouseEvent) => {
    if (e.button === 0) actions.up('attack');
    if (e.button === 2) actions.up('parry');
  };
  const mm = (e: MouseEvent) => { if (locked()) actions.look(e.movementX * sens, -e.movementY * sens); };
  const blur = () => { keys.clear(); actions.clear(); };
  const ctx = (e: Event) => e.preventDefault();
  addEventListener('keydown', kd);
  addEventListener('keyup', ku);
  addEventListener('blur', blur);
  target.addEventListener('mousedown', md);
  addEventListener('mouseup', mu);
  addEventListener('mousemove', mm);
  target.addEventListener('contextmenu', ctx);
  return () => {
    removeEventListener('keydown', kd); removeEventListener('keyup', ku); removeEventListener('blur', blur);
    target.removeEventListener('mousedown', md); removeEventListener('mouseup', mu); removeEventListener('mousemove', mm);
    target.removeEventListener('contextmenu', ctx);
  };
}
