import { STR } from '../ui/strings.vi';

/** Rotation gate: shown in portrait. `bypass` (nogate=1) never shows it. First tap tries fullscreen + landscape lock. */
export function installGate(el: HTMLElement, bypass: boolean): void {
  el.textContent = STR.gate.rotate;
  const check = () => el.classList.toggle('on', !bypass && innerHeight > innerWidth);
  addEventListener('resize', check);
  check();
  if (bypass) return;
  addEventListener('pointerdown', () => {
    const d = document.documentElement;
    void d.requestFullscreen?.().then(() => (screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> }).lock?.('landscape')).catch(() => {});
  }, { once: true });
}
