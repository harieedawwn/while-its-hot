# GDD — While It's Hot

All numbers here are starting values. They live in `shared/src/balance.ts`; change them there, not in code.

## 1. Pitch
Free-for-all arena (2–6 players, built for 4). Everyone enters a round empty-handed, rushes for raw steel,
plants a portable anvil and forges while the others hunt them. Forging is a gamble: hot steel and good timing
raise the odds, bad luck knocks levels off. A higher blade wins fights, but movement, parries, armor builds and
relics let a lower blade beat a higher one. A ring of fire closes in so nobody can forge forever.

Inspiration: ForgeTax (single-player forge roguelite: strike results Great / Success / Hold / Damage / Break,
Frenzy, relics, swords that evolve by grade and remember their highest grade). We keep the forging gamble and
evolution, and build a fast PvP shooter-style arena around it (ULTRAKILL-like movement).

## 2. Modes
- **Chơi mạng** (online): private rooms by 4-letter code. Matches are first to 3 round wins.
- **Luyện tập** (training, works fully offline): the training yard. Anvil, weapon rack, dummies, movement course.
  You can only forge and pick forms you have already unlocked online (see §9).

## 3. Round flow (online)
1. **Lồng** (cage, 10 s): players stand in spawn cages around the arena edge. Relic draft happens here (§8).
2. **Mở lồng**: doors slam open. Raw blanks (`phoi`) lie on the central pedestal: one per player with a free hand, +1.
   Two more blanks appear on side racks every 40 s (max 2 carried per player).
3. **Hưu chiến** (truce, default 30 s, host can set 0/30/60): no player damage. Grab steel, place anvils.
4. **Đấu**: free fight. The **vòng lửa** (fire ring) starts closing at 60 s and is fully closed at 170 s; its radius is a pure
   function of the fight clock (the mesh is updated every frame, never stepped). Outside the ring damage lands in **ticks every
   0.5 s** (6 dmg/s, +2 dmg/s every 10 s, so 3 → 4 → 5 … per tick), each tick plays `ring_hurt` with a hurt-cam kick and keeps a red
   dithered edge vignette up while you stand outside; blades also lose heat 3× faster.
5. Each player has **3 lives** per round (host setting). **Death costs no level.** 0–2.5 s you are dead ("Bạn đã chết", death grade, camera low,
   `death_crack` loud). 2.5–6.5 s you are a **Hồn** (ghost): you stand where you died, move/jump/slide 15% faster, are invulnerable and
   ignore the ring, but cannot attack, guard, forge, place/lift the anvil, take blanks or swap (those buttons are hidden); your screen has
   a white dithered edge vignette and slight desaturation, others see you pale and see-through (Bayer ~40%). At 6.5 s you turn solid where
   you stand (outside the ring: moved to the nearest point 2 m inside it) with 0.5 s of protection, broken early by attacking. The server
   keeps this state (`ghost` flag in State/Snapshot); hit claims from or against a ghost are rejected. Your anvil stays where it is.
   Out of lives you stay down.
6. Round ends when the timer hits 180 s or only one player has lives left.
   **Round winner = most kills**; tiebreak: lives left, then damage dealt.
7. 5 s result beat (slow-mo end, scoreboard), back to cages. **Weapons (both slots, family, level) and armor carry over.** At the end of
   round k (1-based) every carried blade loses 2k levels and armor loses k (min 0); the result screen shows the loss next to each blade
   icon and the armor. The form follows the level at the round change (it never drops mid-round). Heat, Nhập thần and the anvil reset.
   The pedestal gets one blank per player with a free hand, +1. Relics and armor modules persist for the whole match.

Scoring: kill = 1 point; killing the player with Tiếng tăm (§8) = +1 bonus per stack.

## 4. Movement (fast, skill-based; feel constants in `client/src/core/feel.ts`)
| Move | Value |
|---|---|
| Run speed | 6.75 m/s (round 3: −25%), ground accel 80 m/s², air accel 30 m/s² (strong air control) |
| Gravity / jump | 30 m/s² / jump velocity 10 m/s; coyote time 0.1 s; jump buffer 0.12 s |
| Stamina | 3 pips (guard only: block / parry), regen 1 pip / 1.4 s, no regen while sliding |
| Slide (Trượt) | on ground while moving: 10.5 m/s easing down to run speed over 0.8 s max, then you stand up even if held (release before the next one); 0.35 s cooldown; lower hitbox; slide-jump keeps speed. There is no dash. |
| Slam | slide/crouch in air: 40 m/s down; landing knocks nearby players up (r 3 m, no damage); jump within 0.15 s of landing = slam bounce (jump ×1.5) |
| Wall jump | up to 3 before landing; wall cling slows falling to 3 m/s while pushing into a wall |

Players do not collide hard with each other (soft push). Fall into molten channel = 40 dmg + bounce out.

## 5. Combat
- HP 100. No regen in a round, except relics/passives.
- **Đánh** (tap): light attack, 3-hit combo per family. **Hold**: charge heavy (0.45–1.0 s), release to strike.
- **Đỡ** (tap): parry window 0.16 s. A parried attacker is staggered 0.6 s and takes nothing; the parrier gets
  hit-stop + 1 stamina. Holding Đỡ = block: −70% front damage, drains 1 stamina per blocked hit, slows you 40%.
- Slide attack: attacking while sliding or within 0.25 s after a slide lunges 2 m (counts as light, +20% dmg).
- Damage = `base × scale(family, level) × armorFactor × passives × taken` (scale per family below; taken = the
  defender's family, tay ×1.1). Hit-stop 50–90 ms (local feel only).
- Aim assist (setting, default on for touch): slight magnetism + 30% look slowdown on enemies within reach cone.

### Weapon families (pick at +3, see §6; ROUND3 §4)
Traits apply only while that weapon is held. Numbers: `BALANCE.weapons.family` + `BALANCE.combat.family`.

| Family | Light | Combo | Heavy | Reach | Move | Traits / scaling |
|---|---|---|---|---|---|---|
| **Kiếm** (sword) | 12 | 3 × 0.40 s | thrust 30 | 2.3 m | ×1.0 | balanced, best parry; knock 2.2 (3rd 3.5); dmg ×(1 + 0.045 L) |
| **Búa** (hammer) | 15 | 2 × 0.70 s | overhead 40, breaks block | 2.0 m | ×0.92 | knock 4–7; dmg ×(1 + 0.02 L + 0.0012 L²); attack time ×(1 − 0.3·smoothstep(12, 30, form level)) |
| **Dao** (knife) | 7 | 4 × 0.24 s | lunge stab 18 (3 m) | 1.6 m | ×1.2 | one extra air jump; slide speed ×1.25, length ×1.3, cooldown ×0.6; dmg ×(1 + 0.035 L) |
| **Tay** (fists) | 6 | 4 × 0.26 s | charged straight 20 | 1.5 m | ×1.12 | knock 2; takes +10% damage; dmg ×(1 + 0.03 L); power comes from forms |

- Kiếm: forehand, backhand, overhead diagonal; Búa: two heavy cuts. Dao: short forward-grip slashes R→L,
  L→R, a low rising cross, a stab; heavy = a lunge stab. Tay: jab L, jab R (cross), hook R, uppercut L; heavy =
  a charged straight R. Light windups are all ≥ 0.1 s (tap vs hold decision); the rest of the rhythm is in recovery.
- Tay's forged item is a right gauntlet; the left is its mirror. In the forge stance the gauntlet lies palm down
  on the anvil and the fists are hidden.
- DPS check (`weapons.test.ts`, light hits only, no form effects): búa lowest at +3 and highest at +45, tay lowest
  from +15 on, kiếm linear and never lowest, dao the fastest swing at every level.

The blank `phoi` fights like a weak sword: light 9, heavy 20.

## 6. Forging (the core)
**Anvil (Đe):** every player carries one. "Đặt đe" places it in 0.6 s (pick up again: 0.6 s, 5 s cooldown).
Anvils are solid, visible to all, show the owner's color band. Only the owner can use it.

**Forge stance:** at your anvil press Rèn. Camera blends to an over-the-anvil view; you are vulnerable.
Moving the stick or pressing Nhảy or Trượt exits instantly (0.2 s blend). Getting hit kicks you out and costs 0.2 heat.

**Heat (nhiệt) 0–1.** Hold Nung (the same button while in stance) to push the blade into the anvil's brazier:
+0.55/s. Heat decays 0.05/s, each strike costs 0.12. The blade glows with real blackbody steps (LOOK §5). Heat does not
change the odds, it changes the size of the sweet zone:
| Heat | Band | Zone size |
|---|---|---|
| < 0.25 | cold | ×0.6 |
| 0.25–0.5 | dull red | ×0.8 |
| 0.5–0.9 | forging heat | ×1 (the target band: "strike while it's hot") |
| > 0.9 | burning | ×0.6 |

**Strike (ROUND3 §1, phase 25):** one lap of the ring takes 1.5 s. A strike fires on pointer-DOWN (keydown), no
cadence, no cooldown; presses queue and are never lost. The marker is a pure function of the shared clock, so the
client draws it every frame and the server re-checks the phase at the press's timestamp (`strikeTolS` 0.08 s).
- **Trúng** (marker inside the sweet zone) → **Lên +1** with chance `p(L)`, otherwise **Giữ**.
  `p(L)` falls linearly from 0.75 at +0 to 0.38 at +44. Zone `zone(L)` 0.22 of the ring at +0 → 0.10 at +44.
- **Trượt** (outside) → **Vỡ −2**, always (level clamps at 0: **a blade is never destroyed**, no Gãy).
- After every Trúng the zone jumps 0.30–0.65 of the ring ahead of the marker (never under it, at least half a zone
  + 0.04 clear); a Trượt does not move it. Zone positions come from a seeded sequence the client and server share.
- The local Trúng/Trượt verdict shows at once (hammer, word); online the server's Lên/Giữ roll follows.
- Max level **+45** (`BALANCE.weapons.maxLevel`). Armor stays 0–10 and runs the same curves stretched over 0..44.
  A blade remembers its highest level (its form never goes backwards, like ForgeTax).
- Heat cost per strike 0.12 (not in Nhập thần). Cards/relics change the numbers through `ForgeMods` only
  (zoneMul, heatMul, decayMul, costMul, frenzyFillMul, frenzyPlusS, guardVo, plus2Once, sureAfterVo, notoriety).

**Nhập thần (Frenzy):** meter +1 per Lên, full at 10. The eye button in stance starts 4 s: lap 0.9 s, the zone is half
the ring until 2.4 s then shrinks linearly to 0.12 at 4 s; after a Trúng it jumps 0.15–0.45 ahead (near edge ≥ 0.20
clear). Trúng → Lên with `p(L) − 0.10`; Trượt → **30% Vỡ, 70% Giữ**. No heat cost, heat frozen, and you
cannot be damaged while at the anvil (everyone can see the effect). FOV punch-in, heavier shake, sparks ×3, blade
white-hot, warm dithered edge vignette pulsing with the marker; it ends with a 0.4 s ease back, everything restored.
Leaving the stance ends it early.

**Numbers (`tools/forge-sim.mjs`, phase 25).** Nhập thần from +10: blind spam (7 taps/s) −1.2 · careless +2.7 ·
semi-careful +4.3 · solid +4.9 · expert (reacts in ~70 ms) +5.3, and ≥ +7 in ~22% of expert runs. Normal forging from
+0, level after 15 / 30 / 45 / 90 s at the anvil: semi 11 / 17 / 21 / 26 · solid 14 / 23 / 28 / 36 · expert 15 / 28 /
37 / 45. With ~15–20 s at the anvil per round a solid smith ends round 1 near +12–15 and an expert needs ~4–5 rounds
for +45; a smith with 100 ms of timing noise plateaus in the mid +20s (the −2 on a Trượt outweighs a falling p).

**Evolution:** reaching +3 opens a quick 4-way pick (Kiếm / Búa / Dao / Tay, 3 s, defaults to last used).
Forms change at the milestones below. Each form adds its passive (passives stack within a family).

### Weapon roster (4 families × 15 forms + phôi; full table with shapes and effects: `docs/ROSTER.md`)
A form every 3 levels from +3 to +45 (`minLevel = 3 + 3·i`). Each row's effect list is COMPLETE (not cumulative):
`passivesOf(def)` returns the row's own list. Ids never change; the blank `phoi` is level 0.

| Family | +3 | +6 | +9 | +12 | +15 | +18 … +45 |
|---|---|---|---|---|---|---|
| kiem | kiem_tho | kiem_thep | kiem_ban_rong | truong_kiem | kiem_toi_lua | kiem_rang_cua … kiem_mat_troi |
| bua | bua_ren | bua_ta | chuy_gai | bua_chien | bua_de | bua_piston … bua_sao_lun |
| dao | dao_gam | dao_phay | dao_moc | dao_hai_luoi | dao_nem | dao_doc … dao_khe_nut |
| tay | gang_sat | gang_dinh | gang_xich | gang_piston | gang_lua | gang_bang … gang_troi |

Built effects (phase 27): combo3/combo4 bonus, after-slide bonus, parry window, heavy pierce, burn (3/s, 4/s), light
breaks block, stagger +0.4 s, slam AoE, heavy launch + shockwave. Every other listed effect id is a no-op until
phase 28 (kiem/bua) / 29 (dao/tay); `pendingPassives()` lists them and a test pins the list.
Missing model: a form without its own model borrows the nearest lower form of its family that has one, tinted one
tier brighter (`client/src/weapons/weapon.ts` `modelFor`).

Data shape (`shared/src/data/weapons.ts`): `{ id, name, family, minLevel, stats, passives: PassiveId[], model: id }`.
Passives are small functions registered by id in `shared/src/passives.ts` with hooks
(`modifyAttack`, `modifyParryWindow`, `onHit`, `onParry`, `onSlamLand`). New weapon = new row (+ maybe new passive).

## 7. Armor (Giáp) and body cards
Forge target toggle at the anvil: blade or armor. Armor level 0–10 uses the same outcome table (level × 2 for
the row lookup) but never breaks. Each level: +3% damage reduction (max 30%). Visual tiers: apron → leather →
studded → half plate → full plate (LOOK §4).
Armor has NO module slots any more (ROUND3 §5). The six modules are **Cơ thể** cards that mount on the
armor sockets as soon as they are picked: Bộ phản lực (back), Súng máy vai (shoulder), Nỏ vai (shoulder),
Bánh lăn gót (heels), Khiên tay (forearm), Bình nổ (back). Numbers: `BALANCE.cards`; effects:
`shared/src/data/cards.ts` (`CardFx`, `foldCards`).

## 8. Between rounds: Lá bài (cards) and anti-snowball
- **Card draft** during the cage: 3 black cards, at least one **Vũ khí** (weapon/forge) and one **Cơ thể**
  (body). Pick 1; on timeout the first card is taken. Cards last the whole match; no duplicates unless the
  card is "cộng dồn". The last-place player gets one reroll and one card from the rare pool.
- **Tiếng tăm** (notoriety): the round winner starts the next round with 1 stack (2 if they won by 3+ kills).
  Each stack lowers p(L) by 0.04 on their forge rolls, and killing them gives +1 point per stack.
  Stacks are recalculated every round (never accumulate forever).
- Full card table (34 cards: 17 Vũ khí incl. 4 family-only, 17 Cơ thể): `docs/ROUND3.md` §5 and
  `shared/src/data/cards.ts` — the code is the source of truth for numbers.

## 9. Profile and unlocks (offline, `localStorage` + Capacitor Preferences)
`profile = { name, color, unlocked: { phoi: true, <formId>: true }, bestLevel: { kiem, bua, dao, tay }, stats }`.
- A form unlocks when you reach it in an online match. Starting profile: `phoi` + the four +3 forms. Old profiles load; unknown ids (the removed thương forms) are dropped.
- Training yard: the anvil caps each family at your `bestLevel`; a strike past the cap plays a dull "refused"
  hit with no level gain. The weapon rack offers every unlocked form at its minLevel.

## 10. Training yard (Luyện tập)
Small diegetic courtyard of the foundry: anvil, weapon rack, armor stand (unlocked armor tiers + modules you
have ever drafted), 3 dummies with modes (Đứng yên / Đỡ đòn / Phản đòn / Di chuyển), a movement course with
wall-jump shafts and a slam pad. Damage numbers on dummies are a setting (default on in training only).
A chalkboard in the world shows last-hit damage and 5 s DPS — no floating UI panel.

## 11. Arena 1 — Xưởng Đúc (the foundry)
~60 × 60 m, three height layers: floor with molten channels (cross shape, 2 bridges each), mid catwalks on
girders (wall-jump between pillars), upper crane rail (risky, open). Central pedestal on a raised dais.
6 spawn cages in the outer wall. Side weapon racks at 4 points. Fire ring is centered on one of 3 preset
points chosen per round. Readable landmarks: the furnace mouth (north, bright), the cooling tanks (east),
the slag heap (west, uneven ground), the crane (south).

## 12. Out of scope for now
Bots, matchmaking with strangers, chat, cosmetics shop, more arenas (design leaves room), iOS build.
