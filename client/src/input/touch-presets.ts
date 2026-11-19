import type { Ctl, Layout } from './touch-layout';

/**
 * Factory touch layouts (TECH §5), named by how many fingers play. Design px at a 360 px tall safe rect;
 * the narrowest safe rect is 640 design px wide, so nothing here may collide at 640×360 (tested).
 * - two: thumbs only (CoD/PUBG style): stick left, big Đánh with Nhảy/Đỡ/Trượt on an arc right.
 * - three: left index takes Đánh in the top-left corner; the right thumb looks and works Đỡ/Nhảy/Trượt.
 * - four (claw): left index Nhảy + Trượt, right index Đánh + Đỡ, both in the top corners; thumbs move and look.
 */
export type PresetId = 'two' | 'three' | 'four';
export const PRESET_IDS: readonly PresetId[] = ['two', 'three', 'four'];

const c = (ax: 'l' | 'r', ay: 't' | 'b', dx: number, dy: number, size: number, opacity = 0.9): Ctl => ({ ax, ay, dx, dy, size, opacity });

export const PRESETS: Record<PresetId, Layout> = {
  two: {
    stick: c('l', 'b', 104, 100, 128, 0.8),
    attack: c('r', 'b', 82, 88, 88),
    jump: c('r', 'b', 180, 62, 56),
    parry: c('r', 'b', 152, 138, 56),
    slide: c('r', 'b', 224, 122, 56),
    forge: c('r', 'b', 84, 250, 52),
    anvil: c('r', 'b', 160, 210, 52),
    swap: c('r', 't', 40, 40, 48, 0.8),
    pause: c('r', 't', 100, 40, 48, 0.8),
    scoreboard: c('r', 't', 160, 40, 48, 0.8),
  },
  three: {
    stick: c('l', 'b', 112, 100, 128, 0.8),
    attack: c('l', 't', 72, 76, 88),
    parry: c('r', 'b', 84, 92, 80),
    jump: c('r', 'b', 178, 70, 60),
    slide: c('r', 'b', 160, 160, 60),
    forge: c('r', 'b', 250, 120, 52),
    anvil: c('r', 't', 84, 150, 52),
    swap: c('r', 't', 40, 40, 48, 0.8),
    pause: c('r', 't', 100, 40, 48, 0.8),
    scoreboard: c('r', 't', 160, 40, 48, 0.8),
  },
  four: {
    stick: c('l', 'b', 112, 100, 128, 0.8),
    jump: c('l', 't', 64, 72, 76),
    slide: c('l', 't', 156, 56, 60),
    attack: c('r', 't', 72, 80, 88),
    parry: c('r', 't', 166, 60, 64),
    pause: c('r', 't', 40, 150, 48, 0.8),
    scoreboard: c('r', 't', 40, 210, 48, 0.8),
    anvil: c('r', 'b', 110, 150, 52),
    forge: c('r', 'b', 190, 100, 56),
    swap: c('r', 'b', 100, 70, 56, 0.85),
  },
};

export const DEFAULT_LAYOUT = PRESETS.two;
export const isPresetId = (v: unknown): v is PresetId => PRESET_IDS.includes(v as PresetId);
