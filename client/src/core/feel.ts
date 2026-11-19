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
    /** A frame longer than this is a hitch (load, tab switch), not sustained slowness: ignored, restarts the grace. */
    adaptiveHitchMs: 250,
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
    near: 0.05, far: 110,
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

  /** Character animation (LOOK §4). Seconds, meters, m/s. */
  anim: {
    /** Meters travelled per full run cycle (two steps). */
    cycleLen: 3.3,
    /** Ground speed range over which idle blends into the run cycle. */
    locoBlend: [0.4, 3.2] as readonly [number, number],
    /** Ground speed range over which the sprint lean fades in (above run speed). */
    sprintBlend: [9.6, 14] as readonly [number, number],
    /** Crossfade seconds into each base state. */
    fade: { ground: 0.14, jump: 0.05, fall: 0.18, slide: 0.08, dash: 0.04, slam: 0.05, cling: 0.1 },
    /** Default action fade in/out (block, parry, hit-react, forge loops). */
    actionIn: 0.07, actionOut: 0.14,
    /** A landing at least this fast (m/s) plays the land clip; the clip is slowed down for soft landings. */
    landMin: 5,
    /** Rising faster than this (m/s) in the air is the jump clip, otherwise fall. */
    jumpVy: 1.5,
  },

  /** Melee feel (LOOK §6): hit-stop by damage, trauma, viewmodel kicks. Rules live in BALANCE.combat. */
  combat: {
    /** Hit-stop ms scales from minMs at dmgLo to maxMs at dmgHi (FEEL.camera.hitStop range). */
    dmgLo: 9, dmgHi: 45,
    parryStopMs: 90,
    trauma: { hit: 0.12, heavy: 0.32, hurt: 0.3, hurtHeavy: 0.55, parry: 0.22, parried: 0.45, blocked: 0.14 },
    /** Viewmodel kick (0..1) on landing a hit / being blocked / being parried. */
    kick: { hit: 0.35, heavy: 0.9, blocked: 0.6, parried: 1 },
    /** Visual swing time owed after a hit-stop is paid back at this extra speed (1 = double speed). */
    catchUp: 1,
  },

  /** Aim assist (GDD §5): touch default on. Magnetism toward the best target in the reach cone, slower look on it. */
  aim: { coneDeg: 18, extraM: 0.8, slow: 0.3, pullRate: 1.4, pitchRate: 0.8, snapDeg: 6 },

  /** Third-person camera option (over the shoulder, collision-aware). */
  thirdPerson: {
    dist: 2.7, shoulder: 0.42, pivotY: 1.55,
    /** Keep this far from the wall the camera was pulled in front of. */
    margin: 0.28, minDist: 0.55,
    /** Pulled in at once, eased out at this rate (1/s). */
    outRate: 5,
    /** Look pitch limits are the first-person ones; this bias lifts the view a touch so the character sits low. */
    pitchBias: 0.04,
  },

  /** Input feel (TECH §5). Radians per CSS pixel for mouse/touch; sizes are "design px" at a 360 px tall safe rect. */
  input: {
    mouseSens: 0.0022,
    touch: {
      /** Radians per CSS pixel of finger drag at sensitivity 1. */
      lookSens: 0.0038,
      /** Fixed stick answers only inside this multiple of its radius; floating takes the left half. */
      fixedZone: 1.4, floatingZone: 0.5,
      /** Extra px around a button that still counts as a hit. */
      hitSlop: 8,
      /** A finger that began on a button starts looking once it is this far (× radius) from the center. */
      slideOff: 1.25,
      /** Pressed fill stays at least this long (ms). */
      flashMs: 80, hapticMs: 10,
      /** Layout design height and the scale range applied to design px (tablets scale up). */
      refHeight: 360, scaleMin: 1, scaleMax: 1.6,
      minButton: 48, maxButton: 128, minStick: 96, maxStick: 180,
      minOpacity: 0.25, maxOpacity: 1,
      /** Layout editor snap grid, design px. */
      grid: 8,
    },
    gyro: {
      /** Degrees of turn per degree of device rotation at sensitivity 1. */
      gain: 1, maxRate: 360,
    },
    pad: { deadzone: 0.15, curve: 1.6, lookRate: 3.4, triggerAt: 0.35 },
    /** Player-facing defaults and ranges of the control settings (Điều khiển). */
    controls: {
      sens: { def: 1, min: 0.3, max: 3 },
      gyroSens: { def: 1, min: 0.3, max: 3 },
      deadzone: { def: 0.12, min: 0, max: 0.4 },
      stickFixed: false, invertY: false, gyro: false, aimAssist: true, haptics: true, holdParry: true,
    },
  },

  /** Forge stance (LOOK §6/§8). The camera sits behind-above the anvil looking at the working face. */
  forge: {
    /** Stance camera in the anvil frame (+X = horn side, +Z = the smith's side), meters; looks at `look`. */
    cam: { pos: [-0.3, 1.42, 0.82] as readonly [number, number, number], look: [-0.3, 0.52, -0.05] as readonly [number, number, number], vfov: 62 },
    /** Stick length beyond this leaves the stance. */
    exitStick: 0.3,
    /** Hammer swings about the grip (near the smith): head tilt below horizontal (deg, − = raised) at rest and at contact; fall/rise times (s); grip x, height above the face and z, yaw toward the anvil (rad); handle length (m). */
    hammer: { restDeg: -38, hitDeg: 33, fallS: 0.07, riseS: 0.34, raiseDeg: -78, raiseS: 0.12, x: 0.4, gripY: 0.3, gripZ: 0.32, yaw: 0.85, len: 0.5, head: 0.15, idleDeg: 2.5 },
    /** Blade on the anvil: longest length shown (m), and how fast it slides into the brazier (1/s). */
    blade: { showLen: 1.15, maxScale: 1.4, slideRate: 7, brazierX: -0.88 },
    /** Camera trauma and hit-stop on a strike, by outcome. */
    strike: { trauma: { tuyet: 0.5, dat: 0.32, giu: 0.2, hong: 0.4 } as Record<string, number>, hitStopMs: 55, levelStopMs: 60, kickBack: 0.05 },
    /** Anvil appearing/leaving: drop height of the placing animation (m). */
    drop: 0.55,
    /** HUD: seconds a result word stays. */
    flashS: 0.8,
  },

  /** VFX (LOOK §7): few, physical. Counts per event; ≤ 60 live particles and ≤ 2 draw calls per effect. */
  fx: {
    /** Spark pool: gravity (m/s²), floor bounce keep (vertical, horizontal), width (m, never under 1 px), length per m/s, max length. */
    spark: { pool: 400, gravity: 11, bounceY: 0.32, bounceXZ: 0.55, width: 0.012, lenPerSpeed: 0.022, maxLen: 0.24 },
    /** Forge strike: sparks by outcome, speed range (m/s), life range (s). Spawned when the hammer lands. */
    strike: { count: { tuyet: 40, dat: 28, giu: 16, hong: 12 } as Record<string, number>, speed: [2.2, 5.5] as const, life: [0.3, 0.8] as const },
    /** Level up: sparks along the blade, blade pulse up one heat step for pulseS. */
    levelUp: { sparks: 14, pulseS: 0.16 },
    /** Form evolution (quench): white flash, steam column, ground ring, camera punch. */
    evolve: { flashS: 0.25, steam: 8, steamRise: 1.1, steamLife: 1.2, ringR: 1.5, ringS: 0.55, trauma: 0.45 },
    /** Gãy: shard count range, sparks, start heat (dull red) and cooling time (s), how long shards stay. */
    shatter: { shards: [3, 5] as const, sparks: 18, heat: 0.36, coolS: 2.6, stayS: 3.2, hideS: 0.35 },
    /** Melee: clash sparks on a block, hit sparks when Máu is off, puffs + decal when on; parry star. */
    hit: { clash: 6, sparksNoBlood: 6, puffs: 4, puffLife: 0.45, decalR: [0.22, 0.42] as const, decalS: 9 },
    parry: { sparks: 4, speed: 6, life: 0.16 },
    /** Slam landing: ground ring out to BALANCE.move.slam.knockR over ringS, dust puffs. */
    slam: { ringS: 0.32, dust: 8 },
    /** Weapon ribbon: segments, seconds of history it shows, min tip speed (m/s) to draw, opacity. */
    trail: { segments: 8, lifeS: 0.1, minSpeed: 3.5, alpha: 0.42 },
    /** Fire ring: card width/height (m), embers per second and their life, world tint inside (0..1). */
    ring: { cardW: 1.5, cardH: 3.6, rows: 2, embersPerS: 22, emberLife: [1.2, 2.4] as const, tint: 0.22 },
  },
  /** Audio (AUDIO §1/§2/§5). Gains in dB relative to their bus; the mix snapshot is the starting point, adjust by listening notes. */
  audio: {
    /** Glue compressor on master (ratio, attack s, release s, threshold dB) and the limiter after it (ceiling dB). */
    glue: { ratio: 3, attack: 0.005, release: 0.12, threshold: -14, knee: 6 },
    limiter: { threshold: -1, ratio: 20, attack: 0.001, release: 0.06 },
    /** Generated reverbs: length s, decay s, start brightness (0..1 noise smoothing). Per-area send level 0..1 in `send`. */
    reverb: { room_small: { len: 0.5, decay: 0.16, bright: 0.55 }, hall_foundry: { len: 1.4, decay: 0.42, bright: 0.38 } },
    send: { room_small: 0.16, hall_foundry: 0.3 },
    /** 3D: inverse-distance ref and max (m), air-absorption cutoff at ref and at max (Hz), occlusion factor on the cutoff, probe rate (Hz). */
    spatial: { ref: 2, max: 45, lpNear: 20000, lpFar: 2800, occlusion: 0.28, probeHz: 4 },
    /** Variation (AUDIO §1.3): pitch ± fraction, volume ± dB. */
    vary: { pitch: 0.04, db: 1.5 },
    /** "Loa điện thoại": high-pass Hz, exciter band (Hz) re-synthesised as harmonics, exciter drive and mix. Tai nghe bypasses it. */
    phone: { highpass: 140, exciterLp: 150, exciterHp: 230, drive: 6, mix: 0.45 },
    /** Ambience duck under big events: dB and seconds (AUDIO §1.6). */
    duck: { db: -4, s: 0.4 },
    /** Mix snapshot (AUDIO §5), dB. Catalog rows pick one of these keys. */
    mix: { parry: 0, kill: 0, strike: -2, hit: -3, swing: -6, footOwn: -14, footEnemy: -10, dash: -8, ambience: -20, emitter: -16, ui: -12, move: -10 } as Record<string, number>,
    /** audio/events.ts: a footstep every stepLen m of ground travel; landings above landHard m/s are heavy; slide loop rate
     *  at 0 and at slideFast m/s; slam wind rises to slamRate over slamRise s; heat swell time constant s; combo pitch step. */
    react: { stepLen: 1.25, landHard: 9, slideRate: [0.85, 1.15], slideFast: 14, slamRate: 1.5, slamRise: 0.8, heatTau: 0.35, comboPitch: 0.05 },
    /** Ambience one-shots (AUDIO §3): interval s and distance from the listener m. */
    amb: { every: [4, 12] as readonly [number, number], dist: [12, 28] as readonly [number, number] },
    /** Own death: the world muffles to `hz` over `s` seconds. */
    muffle: { hz: 380, s: 0.4, holdS: 3.2 }, // holdS: auto-reopen after death (respawn never left it muffled)
  },
  /** UI motion (LOOK §8–9). Seconds unless noted. */
  ui: {
    /** Transition overlay: internal height in px (low-res, pixelated), quench cover/uncover, edge width px, noise px. */
    wipe: { height: 240, cover: 0.35, uncover: 0.3, edge: 2, noise: 46 },
    /** Stamp cut: bone flash s, halves shear s, gap they open (fraction of width per half), max rotation rad, crack jag. */
    stamp: { flash: 1 / 60, shear: 0.5, open: 0.62, rot: 0.06, jag: 0.035, teeth: 11 },
    /** Reduce-motion replacement: one dithered fade, total s. */
    fade: 0.2,
    /** Round end: time scale to `scale` over `ramp` s, held `hold` s (real time), world desaturates `desat`. */
    roundEnd: { scale: 0.25, ramp: 0.15, hold: 0.6, desat: 0.85 },
    /** Death: desaturate, edge darkening steps, respawn counter s. */
    death: { desat: 0.7, edge: 0.85, steps: 4, ramp: 0.5 },
    /** Menu helve hammer: raise s, fall s, rest angle (held up by the cam) and raised angle (rad), delay after the blow. */
    hammer: { raise: 0.16, fall: 0.08, rest: 0.12, up: 0.62, after: 0.07 },
  },
} as const;
