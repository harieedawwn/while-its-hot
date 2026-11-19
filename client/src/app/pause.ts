import { bus } from '../core/events';
import { PauseMenu } from '../ui/hud/overlays';
import { uiRoot } from '../ui/kit/dom';
import { SettingsScreen } from '../ui/menu/settings-screen';

/** Scenes that are played (not menus): back / Esc / the pause button opens the pause menu instead of leaving. */
export const PLAY_SCENES: ReadonlySet<string> = new Set(['movement', 'combat', 'forge', 'hud']);

/**
 * In-game pause (LOOK §8): freezes the loop through `app:pause`, shows Tiếp tục / Cài đặt / Về menu.
 * Settings opens the same ledger panel as the menu; its back returns here.
 */
export class GamePause {
  private layer: HTMLElement | null = null;
  private menu: PauseMenu | null = null;
  private settings: SettingsScreen | null = null;
  constructor(private host: HTMLElement, private leave: () => void) {}

  get open(): boolean { return !!this.layer; }

  /** Back / Esc: open, or step back one level (settings → pause → game). */
  back(): void {
    if (this.settings) this.closeSettings();
    else if (this.open) this.close();
    else this.show();
  }

  show(): void {
    if (this.open) return;
    this.layer = uiRoot(this.host);
    this.layer.style.zIndex = '30';
    this.menu = new PauseMenu(this.layer, { resume: () => this.close(), settings: () => this.openSettings(), leave: () => { this.close(); this.leave(); } });
    this.menu.show();
    bus.emit('app:pause', { paused: true });
  }

  private openSettings(): void {
    if (!this.layer || this.settings) return;
    this.menu?.hide();
    this.settings = new SettingsScreen(this.layer, () => this.closeSettings());
    this.settings.enter();
  }
  private closeSettings(): void {
    this.settings?.exit();
    this.settings = null;
    this.menu?.show();
  }

  close(): void {
    this.settings?.exit(); this.settings = null;
    this.menu?.hide(); this.menu = null;
    this.layer?.remove(); this.layer = null;
    bus.emit('app:pause', { paused: false });
  }
}
