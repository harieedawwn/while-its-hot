import { getTransition, type WipeKind } from '../ui/transition';
import { num } from './params';
import type { Scene, SceneFactory } from './scenes';

/**
 * Transition bench (LOOK §9): the menu smithy under a frozen transition frame.
 * `kind=quench|stamp|fade|death|round`, `p=<phase>` (quench/fade: 0..1 cover, 1..2 uncover; stamp: 0 = bone frame,
 * 1..2 shear), or `t=<s>` alone: the phase follows real timing (quench cover 0.35 s, stamp shear 0.5 s after the flash).
 * `ox,oy` = wipe origin in 0..1 of the screen (default: the second menu tag). Without `t`, it loops the transition live.
 */
const make: SceneFactory = async (ctx) => {
  const menu = await (await import('./scene-menu')).default({ ...ctx, params: { ...ctx.params, get: (n: string) => (n === 'screen' ? 'menu' : ctx.params.get(n)) } });
  const { params, pipeline } = ctx;
  const kind = (params.get('kind') ?? 'quench') as WipeKind | 'fade' | 'death' | 'round';
  const tr = getTransition();
  const origin = (): [number, number] => [num(params, 'ox', 0.17) * innerWidth, num(params, 'oy', 0.46) * innerHeight];
  const phaseAt = (t: number) => kind === 'stamp' ? (t < 1 / 60 ? 0 : 1 + Math.min(1, (t - 1 / 60) / 0.5)) : t < 0.35 ? t / 0.35 : 1 + Math.min(1, (t - 0.35) / 0.3);
  const p = params.get('p');
  const frozen = params.t !== null;
  const self: Scene = {
    ready: false,
    update(dt, time) { menu.update(dt, time); },
    render(a) {
      menu.render(a);
      const t = params.t ?? 0;
      if (kind === 'death') { pipeline.setGrade({ edge: 0 }); tr.death(pipeline, Math.min(1, frozen ? t / 0.5 + 0.0001 : 1), 4 - (t % 4)); }
      else if (kind === 'round') pipeline.setGrade({ desat: 0.85 * Math.min(1, t / 0.15), keepHot: true });
      else if (frozen || p !== null) tr.pose(kind, p !== null ? Number(p) : phaseAt(t), origin(), ctx.renderer.domElement);
      else if (!tr.active) void tr.run(kind === 'fade' ? 'quench' : kind, origin(), () => new Promise((r) => setTimeout(r, 250)));
      self.ready = true;
    },
    resize(w, h) { menu.resize(w, h); },
    dispose() { pipeline.setGrade({ desat: 0, edge: 0, keepHot: false }); tr.death(pipeline, 0, null); menu.dispose?.(); },
  };
  return self;
};
export default make;
