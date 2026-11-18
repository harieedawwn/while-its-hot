/** Camera and feel tuning. Each phase adds its own numbers from docs/LOOK.md. Nothing else defines feel. */
export const FEEL = {
  /** Vertical field of view in degrees for the first-person camera. */
  fov: 75,
  /** Fixed simulation step, seconds. */
  simStep: 1 / 60,

  /** Render pipeline (LOOK §1). */
  render: {
    /** "Độ phân giải điểm ảnh": internal render height in pixels; 0 = native. */
    resolutions: [360, 450, 540, 720, 0] as readonly number[],
    defaultResolution: 450,
    /** Adaptive quality: a frame slower than this (ms) counts as slow… */
    adaptiveSlowMs: 18,
    /** …and this many seconds of slow frames in a row steps resolution down one notch. */
    adaptiveHoldS: 2,
    /** Never step below this height. */
    adaptiveFloor: 360,
    /** Seconds to ignore after load or a resolution change (shader compile, texture upload). */
    adaptiveGraceS: 1.5,
    /** "Nén màu": levels per channel after dither. 0 = off. */
    quantize: { off: 0, light: 32, strong: 16 } as const,
    defaultQuantize: 'light' as 'off' | 'light' | 'strong',
    /** Ordered-dither amplitude in quantize steps (1 = full Bayer spread). */
    ditherAmount: 1,
    /** "Rung đỉnh": vertex snap grid as a fraction of the internal resolution (0.5 = every 2 px). */
    snapGrid: 0.5,
    /** Max point lights per object (shader constant; keep in sync with psx-glsl.ts). */
    maxPointLights: 4,
  },
} as const;
