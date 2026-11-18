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

  /** First-person camera (LOOK §6). Angles in degrees, distances in meters, times in seconds. */
  camera: {
    /** Horizontal FOV at 16:9 (setting 75–110). Hor+ on wider screens, capped at the 21:9 width. */
    hfov: 90, hfovMin: 75, hfovMax: 110, maxAspect: 21 / 9,
    near: 0.05, far: 60,
    eye: 1.62, lowEye: 0.9,
    /** Eye height follows the body at this rate (1/s): 0.12 s to settle when dropping into a slide. */
    eyeRate: 25,
    bob: { amp: 0.015, stride: 2.4 },
    strafeRoll: 1.2, clingRoll: 4, slideRoll: 2,
    rollSpring: { k: 140, c: 24 },
    dashKick: { fov: 7, inS: 0.06, outS: 0.25, pull: 0.06 },
    slideFov: 4, fovRate: 18,
    /** Landing dip: spring impulse scaled by fall speed between minSpeed and fullSpeed; slam = full + trauma. */
    land: { maxDip: 0.18, minSpeed: 4, fullSpeed: 28, k: 170, c: 21, slamTrauma: 0.5 },
    /** Trauma shake (Eiserloh): decays per second, shake = trauma², noise frequency in Hz. */
    shake: { decay: 1.6, yaw: 2.5, pitch: 2.5, roll: 3, freq: 16 },
    hitStop: { minMs: 50, maxMs: 90 },
    maxPitch: 89,
  },

  /** Viewmodel (LOOK §6): own camera, springs, sway. */
  viewmodel: {
    vfov: 62, near: 0.01,
    /** Rest position of the hand in view space. */
    rest: [0.27, -0.31, -0.44] as readonly [number, number, number],
    lag: { k: 220, c: 22, max: 0.12, gain: 0.9 },
    sway: { k: 120, c: 18, side: 0.014, fwd: 0.012, fall: 0.006 },
    bob: { x: 0.009, y: 0.011 },
    breath: { amp: 0.004, rate: 1.7 },
    /** Landing: the viewmodel dips this many times more than the camera. */
    landMul: 1.7,
    recoil: { k: 260, c: 20 },
    slideTilt: 0.22,
  },

  /** Keyboard + mouse dev controls. Mouse sensitivity in radians per pixel. */
  input: { mouseSens: 0.0022 },
} as const;
