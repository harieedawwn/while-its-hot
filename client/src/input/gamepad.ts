import { FEEL } from '../core/feel';
import type { Actions, Button } from './actions';
import type { Controls } from './controls-settings';

const P = FEEL.input.pad;

/** Standard-mapping button index → action. A jump, B slide, X forge, Y swap, RB dash, LB anvil, RT attack, LT parry. */
export const PAD_BUTTONS: Readonly<Record<number, Button>> = {
  0: 'jump', 1: 'slide', 2: 'forge', 3: 'swap', 4: 'anvil', 5: 'dash', 6: 'parry', 7: 'attack', 8: 'scoreboard', 9: 'pause', 10: 'slide',
};

/** Radial dead zone + response curve: 0 inside the zone, then a power curve up to 1 at the rim. */
export function padAxis(x: number, y: number, dead: number, curve: number): { x: number; y: number } {
  const l = Math.hypot(x, y);
  if (l <= dead) return { x: 0, y: 0 };
  const m = Math.pow(Math.min(1, (l - dead) / (1 - dead)), curve);
  return { x: (x / l) * m, y: (y / l) * m };
}

/** Polls the first connected pad each frame. Left stick moves, right stick looks (rate, so it needs dt). */
export function bindGamepad(actions: Actions, controls: Controls): { poll(dt: number): void; dispose(): void } {
  const held = new Set<Button>();
  let wasPad = false;
  return {
    poll(dt) {
      const pad = (navigator.getGamepads?.() ?? []).find((g) => g && g.connected && g.mapping === 'standard');
      if (!pad) { if (wasPad) { wasPad = false; for (const b of held) actions.up(b); held.clear(); actions.setMove(0, 0); } return; }
      wasPad = true;
      const m = padAxis(pad.axes[0] ?? 0, pad.axes[1] ?? 0, P.deadzone, 1);
      actions.setMove(m.x, -m.y);
      const l = padAxis(pad.axes[2] ?? 0, pad.axes[3] ?? 0, P.deadzone, P.curve);
      const c = controls.v;
      actions.look(l.x * P.lookRate * dt * c.sensX, -l.y * P.lookRate * dt * c.sensY * (c.invertY ? -1 : 1));
      const now = new Set<Button>();
      pad.buttons.forEach((b, i) => {
        const a = PAD_BUTTONS[i];
        if (a && (b.pressed || b.value > P.triggerAt)) now.add(a);
      });
      for (const b of now) if (!held.has(b)) actions.down(b);
      for (const b of held) if (!now.has(b)) actions.up(b);
      held.clear();
      for (const b of now) held.add(b);
    },
    dispose() { for (const b of held) actions.up(b); held.clear(); },
  };
}
