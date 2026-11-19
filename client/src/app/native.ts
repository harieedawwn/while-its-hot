import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { SplashScreen } from '@capacitor/splash-screen';
import { bus } from '../core/events';

export const isNative = (): boolean => Capacitor.isNativePlatform();

/** In the APK there is no URL: open the combat scene (dummies, Arena 1 corner) with touch controls until the menu exists (phase 13). */
export function nativeSearch(search = location.search): string {
  if (!isNative()) return search;
  const p = new URLSearchParams(search);
  if (!p.has('scene')) p.set('scene', 'combat');
  if (!p.has('touch')) p.set('touch', '1');
  if (!p.has('nogate')) p.set('nogate', '1'); // sensorLandscape is locked natively
  return '?' + p.toString();
}

/** Back button, app pause/resume, splash. Call once after the first frame is ready via the returned function. */
export function installNative(): { firstFrame(): void } {
  if (!isNative()) return { firstFrame() {} };
  void App.addListener('backButton', () => bus.emit('app:back', {}));
  void App.addListener('appStateChange', ({ isActive }) => bus.emit('app:pause', { paused: !isActive }));
  let done = false;
  return { firstFrame() { if (!done) { done = true; void SplashScreen.hide({ fadeOutDuration: 150 }); } } };
}
