/** Rule tuning numbers. Each phase adds its own block from docs/GDD.md. Nothing else defines tuning. */
export const BALANCE = {
  /** Player eye height in meters (CLAUDE.md conventions). */
  eyeHeight: 1.62,

  /**
   * Movement (GDD §4). Kinematics live here (not feel.ts) because they are rules: the server will
   * sanity-check speeds and i-frames are a combat rule. Camera reactions to them live in FEEL.camera.
   */
  move: {
    runSpeed: 6.75,
    groundAccel: 80,
    airAccel: 30,
    gravity: 30,
    jumpVel: 10,
    coyoteS: 0.1,
    jumpBufferS: 0.12,
    stamina: { pips: 3, regenS: 1.4 },
    /** Slide (Trượt): speed eases from speed down to endSpeed (= run speed) over maxS, then the player stands
     *  up even if the button is still held; cooldownS before the next one. steer = rad/s toward stick. */
    slide: { speed: 10.5, endSpeed: 6.75, maxS: 0.8, cooldownS: 0.35, steer: 2.2 },
    /** Slam: straight down; jump within bounceS of landing jumps ×bounceMul. knockR used by phase 08/17. */
    slam: { speed: 40, bounceS: 0.15, bounceMul: 1.5, knockR: 3 },
    /** Wall jump/cling. probe = extra radius that counts as touching a wall; graceS keeps contact that long. */
    wall: { jumps: 3, clingFall: 3, jumpUp: 10, jumpOut: 6, probe: 0.12, graceS: 0.1, minPush: 0.3 },
    /** Capsule body. height is the full standing capsule; low = sliding hitbox. */
    body: { radius: 0.35, height: 1.8, lowHeight: 1.0, stepUp: 0.35, maxSlopeDeg: 45, skin: 0.002 },
  },

  /**
   * Weapons (GDD §5, §6). Family movesets are read through shared/src/data/weapons.ts; passive numbers
   * through shared/src/passives.ts. Damage = base × (1 + levelDmg × level) × armor × passives.
   */
  weapons: {
    levelDmg: 0.06,
    maxLevel: 45,
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
    /** Trúng → Lên with p(L): linear from p0 at +0 to pEnd at +(maxLevel−1). Trượt → Vỡ (−voLoss), always. ROUND3 §1. */
    p: { p0: 0.75, pEnd: 0.38, voLoss: 2 },
    /** Sweet zone (fraction of the ring) at +0 → at +(maxLevel−1), times the heat multiplier for the band. */
    zone: { z0: 0.22, zEnd: 0.10, dullMul: 0.8, offMul: 0.6, maxFrac: 0.8 },
    armor: { maxLevel: 10, levelMul: 4.4 },
    /** Heat bands (upper edges); heat 0..1: hold Nung +holdPerS, decay, each strike costs strikeCost. */
    heat: { cold: 0.25, dull: 0.5, burning: 0.9, holdPerS: 0.55, decayPerS: 0.05, strikeCost: 0.12, hitCost: 0.2 },
    /** Ring: one lap per lapS; after a Trúng the zone center jumps gapMin..gapMax ahead of the marker (at least half the zone + clear). */
    ring: { lapS: 1.5, gapMin: 0.30, gapMax: 0.65, clear: 0.04, minGapS: 0.05 },
    /** Tiếng tăm: p(L) lowered by this per stack. */
    notorietyP: 0.04,
    /** Nhập thần: meter +fill per Lên, full at `full`; lasts durS: lap lapS, zone zoneFull of the ring until shrinkAtS, then linear to zoneEnd at durS.
     *  Trúng → Lên with p(L) − pMinus; Trượt → Vỡ with voChance else Giữ. Heat frozen, no heat cost.
     *  clear = how far ahead of the marker the zone's near edge is after a Trúng (the zone is half the ring: without it a tap rhythm chains hits). */
    frenzy: { fill: 1, full: 10, durS: 4, lapS: 0.9, zoneFull: 0.5, shrinkAtS: 2.4, zoneEnd: 0.12, pMinus: 0.1, voChance: 0.3, gapMin: 0.15, gapMax: 0.45, clear: 0.2 },
    /** Anvil (Đe): place / pick-up time, cooldown after picking up, how far in front it is placed, interaction reach. */
    anvil: { placeS: 0.6, pickupS: 0.6, cooldownS: 5, placeDist: 1.15, useRadius: 2.2, radius: 0.42, height: 0.86 },
    /** Đổi: time to switch the held blade; no attack during it. */
    swapS: 0.3,
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
    slideAtk: { windowS: 0.25, lungeM: 2, dmgMul: 1.2 },
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
  net: {
    maxPlayers: 6, codeLen: 4, codeAlphabet: 'ABCDEFGHJKLMNPQRSTUVWXYZ',
    tickHz: 20, reconnectS: 30, emptyRoomS: 300, pingEveryS: 2, clockKeep: 5,
    nameMax: 16, truceChoices: [0, 30, 60], truceDefault: 30, roundsToWin: 3,
    /** Host match settings (Chơi mạng): the allowed values (first of each row is NOT the default; see defaults) and their defaults.
     *  ring = closing speed index (chậm/vừa/nhanh): ringTime scales the closing time (closedS - startS). */
    choices: { rounds: [2, 3, 5], roundS: [120, 180, 240], lives: [1, 3, 5], ring: [0, 1, 2], maxPlayers: [2, 3, 4, 5, 6] },
    defaults: { rounds: 3, roundS: 180, lives: 3, ring: 1, maxPlayers: 6 },
    ringTime: [1.5, 1, 0.65],
    /** Remote players (TECH §4): buffer = 2 × jitter + base, clamped; extrapolate at most extrapMs, then freeze. */
    interp: { baseMs: 50, minMs: 80, maxMs: 200, startMs: 100, extrapMs: 100, jitterK: 0.1 },
    /**
     * Server checks of a hit claim (TECH §4). reachTol = extra meters between server-known positions; the swing's
     * hit must land inside its active frames ± early/lateMs; claims older than maxAgeMs are stale; an attack may not
     * start sooner than rateMul × the previous swing's length; the parry window widens by min(parryMaxMs, rtt/2).
     */
    auth: { reachTol: 2, earlyMs: 60, lateMs: 160, maxAgeMs: 1000, rateMul: 0.6, parryMaxMs: 80, anvilTol: 1.5, pickupTol: 1, strikeTolS: 0.08 },
  },
  /** Match rules that phase 17 enforces on the server (GDD §3). Rounds/lives/scoring arrive in phase 18. */
  match: {
    respawnS: 4, deathLevelLoss: 2, maxCarry: 2,
    /** Blanks: one per player + 1 on the pedestal at the start; rackEach more on the side racks every rackEveryS. */
    rackEveryS: 40, rackEach: 2, maxLying: 11, pickupR: 1.6,
    /** Round flow (GDD §3, §8): cage countdown (relic draft), the fight clock, result beat, lives, first to winsToWin rounds. */
    cageS: 10, roundS: 180, resultS: 5, lives: 3, winsToWin: 3, endHoldS: 25,
    /** Fire ring: appears at startS, closes to minR by closedS (fight clock). Outside: dps + step per everyS since startS; blade heat decays heatMul×. */
    ring: { startS: 60, closedS: 170, maxR: 38, minR: 2.5, dps: 6, step: 2, everyS: 10, heatMul: 3 },
    /** Draft: offers per player, rerolls for those below the round winner, kills lead that earns the second Tiếng tăm stack. */
    draft: { offers: 3, rerolls: 1, bigWin: 3, moduleOffers: 2 },
  },
} as const;
