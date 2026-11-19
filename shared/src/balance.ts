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
      launch: { upVel: 9, push: 2, shockR: 2.5, shockPush: 6 },
    },
  },
  /**
   * Forging (GDD §6, §7). Odds are points out of 100. Rows by level band; armor looks up level × armorRowMul.
   * Heat bands/shifts, ring timing and frenzy numbers all live here; relics only change them through
   * ForgeMods (shared/src/forge/odds.ts).
   */
  forge: {
    rows: [
      { upTo: 4, tuyet: 15, dat: 60, giu: 15, hong: 10 },
      { upTo: 9, tuyet: 10, dat: 45, giu: 20, hong: 25 },
      { upTo: 14, tuyet: 7, dat: 33, giu: 25, hong: 35 },
      { upTo: 99, tuyet: 5, dat: 25, giu: 25, hong: 45 },
    ],
    armor: { maxLevel: 10, rowMul: 2 },
    /** Heat bands (upper edges) and the points each moves from success to Hỏng. */
    heat: { cold: 0.25, dull: 0.5, burning: 0.9, coldShift: 20, dullShift: 8, burnShift: 10,
      holdPerS: 0.55, decayPerS: 0.05, strikeCost: 0.12, hitCost: 0.2 },
    /** Ring: sweet zone = zoneFrac of the circle, one lap per ringS. Perfect moves perfectShift points Hỏng → Đạt:Tuyệt 2:1; a miss moves missShift to Hỏng. */
    strike: { cadenceS: 0.5, ringS: 1.1, zoneFrac: 0.18, perfectShift: 15, perfectDatShare: 2 / 3, missShift: 15 },
    /** Tiếng tăm: points per stack moved from Đạt to Hỏng. */
    notorietyShift: 6,
    frenzy: { perDat: 1, perTuyet: 2, full: 10, durS: 4, cadenceMul: 0.5 },
    /** Anvil (Đe): place / pick-up time, cooldown after picking up, how far in front it is placed, interaction reach. */
    anvil: { placeS: 0.6, pickupS: 0.6, cooldownS: 5, placeDist: 1.15, useRadius: 2.2, radius: 0.42, height: 0.86 },
    stance: { blendInS: 0.35, blendOutS: 0.2, pickS: 3 },
    /** Armor level at which each module slot opens (GDD §7). */
    moduleSlotAt: [3, 7],
  },
  /**
   * Melee (GDD §5). Seconds, meters, m/s, degrees. Frame data per family: w = windup, a = active, r = recover;
   * a light swing's w+a+r equals the family's comboS (the chain rhythm of GDD §5). Arcs are in the attacker's
   * view frame: slash = blade sweeps from→to degrees (+ = right / up) in a plane rolled by `roll`; thrust =
   * blade extends from→to (fraction of reach) straight ahead.
   */
  combat: {
    hp: 100,
    /** Attack still held this long into a windup turns it into a heavy charge (≤ every light windup). */
    tapS: 0.1,
    /** A press this long before a swing ends is buffered into the next combo hit. */
    bufferS: 0.22,
    /** After a light ends, the chain continues if the next press comes within this. */
    comboGapS: 0.32,
    heavy: { minS: 0.45, maxS: 1.0 },
    parry: { windowS: 0.16, recoverS: 0.34, staggerS: 0.6, stamina: 1, frontDeg: 100 },
    block: { reduce: 0.7, stamina: 1, slow: 0.4, frontDeg: 80, guardBreakS: 0.7, knockMul: 0.35 },
    dash: { windowS: 0.25, lungeM: 2, dmgMul: 1.2 },
    /** Armor: +3% reduction per level, max 30% (GDD §7). */
    armor: { perLevel: 0.03, max: 0.3 },
    /** Any hit interrupts a windup or charge; light hits flinch this long. */
    flinchS: 0.2,
    /** Move speed multipliers while charging / swinging a heavy. Blocking uses block.slow. */
    slow: { charge: 0.8, heavy: 0.55, stagger: 0.45, flinch: 0.7 },
    /** Slam landing pushes bodies within BALANCE.move.slam.knockR at this speed (no damage without slam_aoe). */
    slamKnock: 7, slamLift: 3,
    /** Seconds a dummy (or later: a player) lies dead before standing up again. */
    respawnS: 2.5,
    /** Knockback pushes are applied with weak ground control for this long. */
    pushS: 0.16,
    /** Fraction of move acceleration kept while pushed. */
    pushControl: 0.12,
    /** Hit capsules on a 1.8 m body (scaled with posture height), y from the feet. Same damage everywhere. */
    capsules: { head: { y0: 1.52, y1: 1.7, r: 0.15 }, torso: { y0: 0.95, y1: 1.42, r: 0.3 }, legs: { y0: 0.12, y1: 0.92, r: 0.22 } },
    /** Blade segment starts this far from the eye; sub-steps keep the tip travel ≤ maxStepM. */
    sweep: { baseM: 0.3, maxStepM: 0.12, pitchMaxDeg: 40, eyeDrop: 0.12 },
    family: {
      kiem: {
        light: [
          { w: 0.11, a: 0.09, r: 0.18, arc: { kind: 'slash', from: 62, to: -58, roll: 14 }, knock: 2.2, lungeM: 0.3 },
          { w: 0.11, a: 0.09, r: 0.18, arc: { kind: 'slash', from: -60, to: 60, roll: 16 }, knock: 2.2, lungeM: 0.3 },
          { w: 0.11, a: 0.09, r: 0.18, arc: { kind: 'slash', from: 52, to: -40, roll: 62 }, knock: 3.5, lungeM: 0.4 },
        ],
        heavy: { w: 0.1, a: 0.12, r: 0.34, arc: { kind: 'thrust', from: 0.35, to: 1, roll: 0 }, knock: 5, lungeM: 1.3, staggerS: 0.3 },
      },
      bua: {
        light: [
          { w: 0.22, a: 0.12, r: 0.28, arc: { kind: 'slash', from: 58, to: -50, roll: 32 }, knock: 4, lungeM: 0.3 },
          { w: 0.22, a: 0.12, r: 0.28, arc: { kind: 'slash', from: -54, to: 52, roll: 28 }, knock: 4.5, lungeM: 0.3 },
        ],
        heavy: { w: 0.15, a: 0.12, r: 0.45, arc: { kind: 'slash', from: 70, to: -36, roll: 88 }, knock: 7, lungeM: 0.6, staggerS: 0.6, breaksBlock: true },
      },
      thuong: {
        light: [
          { w: 0.12, a: 0.1, r: 0.2, arc: { kind: 'thrust', from: 0.4, to: 1, roll: 0 }, knock: 2.5, lungeM: 0.25 },
          { w: 0.12, a: 0.1, r: 0.2, arc: { kind: 'slash', from: 50, to: -50, roll: -6 }, knock: 3, lungeM: 0.2 },
          { w: 0.12, a: 0.1, r: 0.2, arc: { kind: 'thrust', from: 0.4, to: 1, roll: 0 }, knock: 4, lungeM: 0.35 },
        ],
        heavy: { w: 0.13, a: 0.16, r: 0.36, arc: { kind: 'slash', from: 80, to: -80, roll: -4 }, knock: 6, lungeM: 0.5, staggerS: 0.3 },
      },
    },
  },
} as const;
