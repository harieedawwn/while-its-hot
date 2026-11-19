import { App } from '@capacitor/app';
import type { Director } from '../../app/director';
import { isNative } from '../../app/native';
import type { Screen, ScreenMachine } from '../../app/screens';
import { FEEL } from '../../core/feel';
import type { Smithy } from '../../world/smithy';
import { el, onPress, sfx } from '../kit/dom';
import { tagStrip, toast, type TagStrip } from '../kit/panels';
import { STR } from '../strings.vi';
import '../styles/menu.css';

/** What the menu screens share: the DOM layer, the 3D smithy, the machine and the scene director. */
export interface MenuCtx { layer: HTMLElement; smithy: Smithy; machine: ScreenMachine; app: Director }

const wait = (s: number) => new Promise((r) => setTimeout(r, s * 1000));

/** The small stamped wordmark, top-left (LOOK §8: not a giant logo). Lives across title and menu. */
export function wordmark(layer: HTMLElement): HTMLElement {
  const m = el('div', 'k-stamp m-mark', STR.title.name);
  layer.appendChild(m);
  return m;
}

/** Title: the name stamped large in the left third, one line to start. Any tap / key = a hammer blow → menu. */
export class TitleScreen implements Screen {
  private root: HTMLElement | null = null;
  constructor(private c: MenuCtx) {}
  enter(): void {
    const r = el('div', 'm-layer');
    const t = el('div', 'm-title');
    const big = el('div', 'm-big');
    const [a, b] = STR.title.name.split(' ').reduce<[string[], string[]]>((acc, w, i, all) => { acc[i < all.length - 1 ? 0 : 1].push(w); return acc; }, [[], []]);
    big.append(el('span', '', a.join(' ')), el('span', 'm-hot', b.join(' ')));
    t.append(big, el('div', 'm-go', STR.title.start));
    const hit = el('button', 'm-hit');
    hit.type = 'button';
    hit.setAttribute('aria-label', STR.title.start);
    onPress(hit, () => void this.start(), 'is-x');
    r.append(t, hit);
    this.c.layer.appendChild(r);
    this.root = r;
  }
  private async start(): Promise<void> {
    if (this.c.smithy.busy || this.c.machine.busy) return;
    await this.c.smithy.strike();
    await wait(FEEL.ui.hammer.after);
    await this.c.machine.go('menu', 'cut');
  }
  exit(): void { this.root?.remove(); this.root = null; }
  back(): boolean { if (isNative()) void App.exitApp(); return true; }
}

/** Main menu: the vertical tag strip. Selecting strikes the anvil, then the destination's transition. */
export class MenuScreen implements Screen {
  private root: HTMLElement | null = null;
  private strip: TagStrip | null = null;
  private keys = (e: KeyboardEvent) => {
    if (!this.strip) return;
    if (e.key === 'ArrowDown' || e.key === 's') { e.preventDefault(); this.strip.move(1); }
    if (e.key === 'ArrowUp' || e.key === 'w') { e.preventDefault(); this.strip.move(-1); }
    if ((e.key === 'Enter' || e.key === ' ') && !(document.activeElement instanceof HTMLButtonElement)) { e.preventDefault(); void this.pick(this.strip.focused); }
  };
  constructor(private c: MenuCtx) {}

  enter(from: string | null): void {
    const r = el('div', 'm-layer');
    const items = [
      { id: 'online', label: STR.menu.online },
      { id: 'training', label: STR.menu.training },
      { id: 'armory', label: STR.menu.armory },
      { id: 'settings', label: STR.menu.settings },
      ...(isNative() ? [{ id: 'quit', label: STR.menu.quit }] : []),
    ];
    const s = tagStrip(items, (id) => void this.pick(id));
    s.root.classList.add('m-strip');
    r.appendChild(s.root);
    this.c.layer.appendChild(r);
    this.root = r; this.strip = s;
    if (from === 'title') s.drop();
    addEventListener('keydown', this.keys);
  }

  async pick(id: string): Promise<void> {
    const { smithy, machine, app, layer } = this.c;
    if (!this.strip || smithy.busy || machine.busy) return;
    const origin = this.strip.centerOf(id);
    this.strip.hit(id);
    await smithy.strike();
    await wait(FEEL.ui.hammer.after);
    this.strip?.clear();
    if (id === 'training') await app.go('training', 'stamp', {}, origin);
    else if (id === 'settings' || id === 'armory' || id === 'online') await machine.go(id, 'quench', origin);
    else if (id === 'quit') void App.exitApp();
    else { sfx('error'); toast(layer, STR.menu.closed); }
  }

  exit(): void { removeEventListener('keydown', this.keys); this.root?.remove(); this.root = null; this.strip = null; }
  back(): boolean { sfx('back'); void this.c.machine.go('title', 'quench'); return true; }
}
