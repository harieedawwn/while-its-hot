import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { audioSettings } from './settings';

/** AUDIO §2 haptics map: light on own strike/hit landed, medium on hit taken, heavy on form evolution and death.
 *  Fired from audio/events.ts (same map as the sounds); off when "Rung phản hồi" is off or on the web build. */
export type Buzz = 'light' | 'medium' | 'heavy';
const STYLE: Record<Buzz, ImpactStyle> = { light: ImpactStyle.Light, medium: ImpactStyle.Medium, heavy: ImpactStyle.Heavy };
const native = Capacitor.isNativePlatform();

export function buzz(kind: Buzz): void {
  if (!audioSettings.haptics) return;
  if (native) { void Haptics.impact({ style: STYLE[kind] }).catch(() => {}); return; }
  // dev / mobile browser: the Vibration API where it exists (ms per strength)
  const nav = navigator as Navigator & { vibrate?: (ms: number) => boolean };
  nav.vibrate?.(kind === 'light' ? 8 : kind === 'medium' ? 18 : 35);
}
