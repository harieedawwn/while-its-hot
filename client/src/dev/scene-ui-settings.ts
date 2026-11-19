import menu from './scene-menu';
import type { SceneFactory } from './scenes';

/** `?scene=ui-settings` — the settings ledger over the smithy. `tab=gfx|audio|controls|view|profile`. */
const make: SceneFactory = (ctx) => {
  const p = ctx.params, get = p.get;
  return menu({ ...ctx, params: { ...p, get: (k) => (k === 'screen' ? 'settings' : get(k)) } });
};
export default make;
