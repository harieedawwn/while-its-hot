import { el, onPress, sfx, stampNo } from './dom';

export interface TagItem { id: string; label: string; disabled?: boolean }
export interface TagStrip {
  root: HTMLDivElement;
  /** Keyboard / gamepad focus: move by ±1, or read the focused id. */
  move(d: number): void;
  readonly focused: string;
  /** Mark a tag as struck (solid iron-hot) until `clear()`. */
  hit(id: string): void;
  clear(): void;
  centerOf(id: string): [number, number];
  /** Tags drop in one after another (shutter motion). */
  drop(): void;
}

/**
 * Vertical tag strip (LOOK §8 main menu): stamped numbers + big condensed words hanging off a riveted spine.
 * `onPick(id)` fires on tap / Enter; disabled tags still answer with the error knock.
 */
export function tagStrip(items: readonly TagItem[], onPick: (id: string) => void): TagStrip {
  const root = el('div', 'k-tags');
  root.setAttribute('role', 'menu');
  let focus = 0;
  const tags = items.map((it, i) => {
    const t = el('button', 'k-tag k-plate k-rivets');
    t.type = 'button';
    t.setAttribute('role', 'menuitem');
    t.setAttribute('aria-label', it.label);
    if (it.disabled) t.setAttribute('aria-disabled', 'true');
    t.append(el('span', 'k-n', stampNo(i)), el('span', 'k-w', it.label));
    onPress(t, () => { setFocus(i); if (it.disabled) { sfx('error'); return; } onPick(it.id); }, 'is-hit');
    t.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') setFocus(i); });
    const hang = el('div', 'k-hang');
    hang.appendChild(t);
    root.appendChild(hang);
    return t;
  });
  const setFocus = (i: number) => {
    focus = i;
    tags.forEach((t, k) => { t.classList.toggle('is-on', k === i); t.parentElement!.classList.toggle('is-on', k === i); });
  };
  setFocus(0);
  return {
    root,
    move(d) { setFocus((focus + d + tags.length) % tags.length); sfx('notch'); },
    get focused() { return items[focus].id; },
    hit(id) { tags[items.findIndex((x) => x.id === id)]?.classList.add('is-hit'); },
    clear() { tags.forEach((t) => t.classList.remove('is-hit')); },
    centerOf(id) {
      const r = tags[Math.max(0, items.findIndex((x) => x.id === id))].getBoundingClientRect();
      return [r.left + r.width / 2, r.top + r.height / 2];
    },
    drop() {
      tags.map((t) => t.parentElement!).forEach((t, i) => {
        t.classList.remove('k-in');
        t.style.animationDelay = '';
        void t.offsetWidth;
        t.classList.add('k-in');
        t.style.animationDelay = `${i * 45}ms, ${160 + i * 45}ms`;
      });
    },
  };
}

export interface Shutter { root: HTMLDivElement; body: HTMLDivElement; close(): Promise<void> }
/** A steel-shutter panel: drops in fast with a two-step settle, lifts out. `onBack` is its close button. */
export function shutter(parent: HTMLElement, title: string, backLabel: string, onBack: () => void, cls = ''): Shutter {
  const root = el('div', `k-shutter k-plate k-in ${cls}`.trim());
  const head = el('div', 'k-head');
  const back = el('button', 'k-btn k-plate', backLabel);
  back.type = 'button';
  onPress(back, () => { sfx('back'); onBack(); });
  head.append(el('div', 'k-title', title), back);
  const body = el('div', 'k-body');
  root.append(head, body);
  parent.appendChild(root);
  sfx('open');
  return {
    root, body,
    close: () => new Promise((res) => {
      sfx('close');
      root.classList.remove('k-in'); root.classList.add('k-out');
      setTimeout(() => { root.remove(); res(); }, 150);
    }),
  };
}

/** One short stamped line at the top edge; `err` = oxide. Replaces the previous toast. */
let last: HTMLElement | null = null;
export function toast(parent: HTMLElement, text: string, err = false, ms = 1600): void {
  last?.remove();
  const t = el('div', `k-toast k-plate${err ? ' is-err' : ''}`, text);
  parent.appendChild(t);
  last = t;
  if (err) sfx('error');
  setTimeout(() => { t.classList.add('is-out'); setTimeout(() => t.remove(), 130); }, ms);
}
