/** Rule tuning numbers. Each phase adds its own block from docs/GDD.md. Nothing else defines tuning. */
export const BALANCE = {
  /** Player eye height in meters (CLAUDE.md conventions). */
  eyeHeight: 1.62,

  /**
   * Movement (GDD §4). Kinematics live here (not feel.ts) because they are rules: the server will
   * sanity-check speeds and i-frames are a combat rule. Camera reactions to them live in FEEL.camera.
   */
  move: {
    runSpeed: 9,
    groundAccel: 80,
    airAccel: 30,
    gravity: 30,
    jumpVel: 10,
    coyoteS: 0.1,
    jumpBufferS: 0.12,
    stamina: { pips: 3, regenS: 1.4 },
    /** Dash (Lướt): speed for durS, then horizontal speed is clamped to exitSpeed. No gravity while dashing. */
    dash: { cost: 1, speed: 24, durS: 0.17, iframeS: 0.12, exitSpeed: 9 },
    /** Jump during a ground dash: costs this many extra pips (2 total) and keeps the dash speed. */
    dashJump: { cost: 1 },
    /** Slide (Trượt): speed decays from speed to endSpeed over decayS, then holds. steer = rad/s toward stick. */
    slide: { speed: 14, endSpeed: 10, decayS: 1.5, steer: 2.2 },
    /** Slam: straight down; jump within bounceS of landing jumps ×bounceMul. knockR used by phase 08/17. */
    slam: { speed: 40, bounceS: 0.15, bounceMul: 1.5, knockR: 3 },
    /** Wall jump/cling. probe = extra radius that counts as touching a wall; graceS keeps contact that long. */
    wall: { jumps: 3, clingFall: 3, jumpUp: 10, jumpOut: 7.5, probe: 0.12, graceS: 0.1, minPush: 0.3 },
    /** Capsule body. height is the full standing capsule; low = sliding hitbox. */
    body: { radius: 0.35, height: 1.8, lowHeight: 1.0, stepUp: 0.35, maxSlopeDeg: 45, skin: 0.002 },
  },

  /**
   * Weapons (GDD §5, §6). Family movesets are read through shared/src/data/weapons.ts; passive numbers
   * through shared/src/passives.ts. Damage = base × (1 + levelDmg × level) × armor × passives.
   */
  weapons: {
    levelDmg: 0.06,
    maxLevel: 20,
    /** Level at which the blank becomes a family form (the 3-way pick). */
    familyPick: 3,
    family: {
      kiem: { light: 12, comboHits: 3, comboS: 0.38, heavy: 30, heavyKind: 'thrust', reach: 2.3 },
      bua: { light: 18, comboHits: 2, comboS: 0.62, heavy: 45, heavyKind: 'overhead', reach: 2.0 },
      thuong: { light: 10, comboHits: 3, comboS: 0.42, heavy: 26, heavyKind: 'sweep', reach: 3.2 },
    },
    /** The blank fights like a weak sword. */
    phoi: { light: 9, heavy: 20 },
    passive: {
      combo3Mul: 1.2,
      parryPlusS: 0.03,
      burn: { dps: 3, durS: 2 },
      staggerPlusS: 0.4,
      slamAoe: { dmg: 20, r: 3 },
      /** "max reach" = the outer (1 − maxReachFrac) of the reach. */
      maxReach: { frac: 0.85, mul: 1.25 },
      sweepArcDeg: 220,
      lungeMul: 1.5,
      pullM: 2,
      /** bua_de: the target is launched upward; the shockwave only pushes (no damage) everyone else near. */
      launch: { upVel: 9, shockR: 2.5, shockPush: 6 },
    },
  },
} as const;
