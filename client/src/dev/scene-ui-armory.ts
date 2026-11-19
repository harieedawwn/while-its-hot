import menu from './scene-menu';
import type { SceneFactory } from './scenes';

/** `?scene=ui-armory` — the weapon rails over the smithy with the turntable. `sel=<weapon id>`. */
const make: SceneFactory = (ctx) => {
  const p = ctx.params, get = p.get;
  return menu({ ...ctx, params: { ...p, get: (k) => (k === 'screen' ? 'armory' : get(k)) } });
};
export default make;
