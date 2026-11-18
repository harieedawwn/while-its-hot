/**
 * Bare dev readout for the movement scene until the real HUD (phase 14): a center dot and the stamina
 * pips, no text. Flat fills, no gradients or glow.
 */
export function createMoveHud(host: HTMLElement, pips: number): { update(stamina: number): void; dispose(): void } {
  const root = document.createElement('div');
  root.style.cssText = 'position:absolute;inset:0;pointer-events:none;';
  const dot = document.createElement('div');
  dot.style.cssText = 'position:absolute;left:50%;top:50%;width:4px;height:4px;margin:-2px 0 0 -2px;background:#e8e0d4;box-shadow:0 0 0 1px #1a1410;';
  const bar = document.createElement('div');
  bar.style.cssText = 'position:absolute;left:50%;bottom:22px;transform:translateX(-50%);display:flex;gap:6px;';
  const cells = Array.from({ length: pips }, () => {
    const c = document.createElement('div');
    c.style.cssText = 'width:34px;height:7px;background:#1a1410;outline:1px solid #6a5a4c;position:relative;overflow:hidden;';
    const fill = document.createElement('div');
    fill.style.cssText = 'position:absolute;inset:0;background:#d8cdbd;transform-origin:left;';
    c.appendChild(fill);
    bar.appendChild(c);
    return fill;
  });
  root.append(dot, bar);
  host.appendChild(root);
  let last = -1;
  return {
    update(stamina) {
      const q = Math.round(stamina * 50) / 50;
      if (q === last) return;
      last = q;
      cells.forEach((f, i) => {
        const k = Math.max(0, Math.min(1, stamina - i));
        f.style.transform = `scaleX(${k})`;
        f.style.background = k >= 1 ? '#d8cdbd' : '#7a6a5a';
      });
    },
    dispose() { root.remove(); },
  };
}
