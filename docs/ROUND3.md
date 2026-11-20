# ROUND 3 — design changes after the second playtest (overrides GDD where they differ)

Each phase that implements a section also rewrites the matching GDD section so GDD stays the truth.
Numbers are starting values; they go to `balance.ts` / `feel.ts`, never inline.

## 1. Forging (overrides GDD §6 strike, outcomes, frenzy; max level)
- **Max level +45.** Armor stays 0–10. No more Gãy: a blade is never destroyed, level clamps at 0.
- **Outcomes:** Trúng (marker inside the white zone) → **Lên +1** with chance `p(L)`, otherwise **Giữ**.
  Trượt (outside) → **Vỡ −2**, always. Tuyệt (+2) is gone (cards may still grant a one-off +2).
- `p(L)` starts 0.75 at +0 and falls linearly to 0.38 at +44. Zone size `zone(L)` 0.22 of the ring at +0 →
  0.10 at +44. Heat: forging band = full zone; dull ×0.8; cold or burning ×0.6. Heat cost per strike 0.12 stays.
- **Ring:** one lap = 1.5 s (was 1.1, slower but still needs timing). After every Trúng the zone jumps ahead
  of the marker by a random gap (never under the marker; tuned in phase 25 to 0.30–0.65 of the ring normally, 0.15–0.45 in Nhập thần with a 0.20 clear). Misses do not move it.
  Zone positions come from a seeded sequence the client and server share.
- **No cadence / no cooldown.** A strike fires on pointer-DOWN (and keydown), stamped with the event time.
  The client decides Trúng/Trượt from the ring phase at that timestamp and shows it at once (marker flash,
  hammer anim); the server re-checks the phase within `strikeTolS` and rolls Lên/Giữ. Strikes queue, input
  never waits for the server, the ring is drawn from the same clock every frame (no drift, no hitch).
- **Nhập thần:** meter +1 per Lên, full at 10. Activated with the eye button in stance. Lasts 4 s:
  lap 0.9 s, zone = half the ring until 2.4 s, then shrinks linearly to 0.12 at 4 s. Trúng → Lên with
  `p(L) − 0.10` (a bit more Giữ). Trượt → Vỡ 30%, Giữ 70%. No heat cost, heat frozen, you cannot be damaged
  at the anvil (as before). Ends cleanly: every camera/audio/post change is restored.
- **Frenzy feel ("dữ dội"):** FOV punch-in 8°, heavier strike shake, sparks ×3, blade at white-hot step,
  a warm dithered edge vignette pulsing with the marker, ambience ducked under a low bellows-like rhythm,
  each Lên a heavier clang. End: quench hiss, 0.4 s ease back. No glow, no chimes.
- **Targets (`tools/forge-sim.mjs`, at +10):** blind spam 7 taps/s → negative; semi-careful → ≈ +4;
  expert (reacts within ~70 ms) → ≈ +6; ≥ +7 in at most ~20% of expert runs. Round targets for normal
  forging: solid smith ends round 1 near +12–15; reaching +45 takes ~4–5 good rounds.
  If too strong, tune in this order: faster frenzy lap → earlier/stronger shrink → lower frenzy `p`.
  If too punishing: lower the frenzy Vỡ chance. (Prototype sim of these values: semi-careful +3.8, expert +6.6.)

## 2. Death and ghost respawn (overrides GDD §3.5)
- Dying costs **no levels**. Lives (host setting) stay.
- 0–2.5 s: "Bạn đã chết" + the death grade, camera low at the death spot. Bone-crack sound (`death_crack_0`),
  loud: local 2D, others hear it 3D a few dB over a normal hit.
- 2.5–6.5 s: **Hồn** (ghost). You stand up where you died. Move, jump and slide (+15% speed); invulnerable;
  no ring damage; no collision with players; cannot attack, guard, forge, place/pick anvil, pick blanks or
  swap (those buttons are hidden). Your screen: white dithered edge vignette, slight desaturation.
  Others see a pale see-through body (Bayer alpha ~40%, no glow).
- At 6.5 s you become solid where you stand. If outside the ring you are moved to the nearest point 2 m
  inside it. 0.5 s spawn protection, broken early by attacking. Out of lives = spectate as now.
- Server: ghost is a state in the player record; hit claims against or from ghosts are rejected.

## 3. Rounds carry over; fire ring (overrides GDD §3.4, §3.7)
- Weapons (both slots, with family) and armor **carry over**. At the end of round k (1-based) every carried
  blade loses 2k levels (round 1 −2, round 2 −4, round 3 −6, ...), armor loses k; min 0.
  The result screen shows the loss next to each weapon icon. Forms follow the highest level reached since
  the round started, so a form never drops mid-round, only at the round change.
- Pedestal blanks: one per player who has an empty slot, +1.
- **Ring closes smoothly:** the radius is a pure function of the fight clock (already in `rules.ts`); the
  ring mesh is scaled/updated every frame, never rebuilt or stepped. Server uses the same function.
- **Outside the ring:** damage ticks every 0.5 s (dps/2 per tick). Each tick: `ring_hurt_0` (local 2D,
  pitch ±5%; others hear it quietly 3D), Minecraft-style hurt cam: roll kick ~6° that eases back in 0.35 s
  plus a 1.5° pitch dip (scaled by the camera-shake setting), and a red flash on a **soft dithered red
  edge vignette** that stays while you are outside (fades in 0.3 s, out 0.5 s, stronger as dps rises).

## 4. Weapon families (overrides GDD §5 families, §6 roster)
Families: **kiem, bua, dao, tay**. Thương is removed (ids, models, passives, clips, strings, unlocks; old
saved profiles must still load). Family pick at +3 offers the 4 (default = last used).
Movement and defense traits apply only while that weapon is held:

| Family | Light | Combo | Heavy | Reach | Move | Traits / scaling |
|---|---|---|---|---|---|---|
| kiem | 12 | 3 × 0.40 s | thrust 30 | 2.3 | ×1.0 | balanced, light knock 2.2 (3rd 3.5); dmg ×(1 + 0.045 L) |
| bua | 15 | 2 × 0.70 s | overhead 40 | 2.0 | ×0.92 | knock 4–7; dmg ×(1 + 0.02 L + 0.0012 L²); attack time ×(1 − 0.3·smoothstep(12, 30, L)) |
| dao | 7 | 4 × 0.24 s | lunge stab 18 (3 m) | 1.6 | ×1.2 | double jump; slide speed ×1.25, length ×1.3, cooldown ×0.6; dmg ×(1 + 0.035 L) |
| tay | 6 | 4 × 0.26 s | charged punch 20 | 1.5 | ×1.12 | light knock 2 (room to survive); takes +10% damage; dmg ×(1 + 0.03 L); power comes from forms |

- Dao swings: fast short alternating slashes + a stab, reverse-grip feel (study FPS knife animations).
- Tay: two fists, jab L, jab R, hook, uppercut; the forged item is the gauntlet (one right-hand model,
  mirrored for the left). In forge stance the gauntlet lies on the anvil and the player's fists are hidden.
- Forms every 3 levels: `docs/ROSTER.md` (60 rows). Each row's effect list is complete (not cumulative).
- Missing model: use the nearest lower form of the same family that has one, tinted one tier darker or
  brighter, so every row works before the weapon-lab models arrive.
- DPS test: a vitest table of light DPS per family at +3/+15/+30/+45 must keep bua lowest at +3 and highest
  at +45, kiem steady, dao fastest swings, tay lowest raw DPS before effects.

## 5. Card draft — Lá bài (replaces the relic draft, GDD §8)
Every round in the cage: 3 black cards, at least one **Vũ khí** (weapon/forge card, shows a family icon
or the anvil icon) and one **Cơ thể** (body card, shows a body icon). Pick 1; on timeout the first card.
Picked cards last the whole match; no duplicates unless the card says "cộng dồn". Last place gets one
reroll and one card from the rare pool; Tiếng tăm stays. Data: `shared/src/data/cards.ts` (replaces
relics.ts; modules become body cards, no armor-slot requirement; module models still mount on sockets).
Card look: near-black card, thin off-white inset border, big off-white line pictogram drawn on the touch
pictogram grid, name, one short effect line. Rare = a second inner border. No color, no light, no glow.

Vũ khí (icon) | Name | Effect | Rare
---|---|---|---
anvil | Mắt thợ | vùng trắng +25% | 
anvil | Ống bễ | nung nhanh gấp đôi | 
anvil | Kìm giữ nhiệt | nhiệt nguội chậm 50%, mỗi nhát tốn nhiệt ít hơn 30% | 
anvil | Đá niêm | 3 lần Vỡ đầu tiên mỗi round thành Giữ | 
anvil | Hòn than đỏ | mỗi round một lần Lên +2 | 
anvil | Mối hàn | sau mỗi lần Vỡ, lần Trúng kế tiếp chắc chắn Lên | 
anvil | Bễ lớn | thanh nhập thần đầy nhanh hơn 30% | 
anvil | Lửa lâu | nhập thần dài thêm 1 s | hiếm
anvil | Giữ lửa | phạt cấp cuối round giảm một nửa | hiếm
anvil | Sắt vụn | hạ gục: vũ khí đang cầm +1 | hiếm
anvil | Búa nện | mỗi lần Vỡ đẩy văng người quanh đe 4 m | 
anvil | Đe nhẹ | đặt và nhặt đe tức thì | 
anvil | Ấn sắt | sát thương vũ khí +10%, cộng dồn | 
kiem | Lưỡi tôi | đỡ chuẩn khi cầm kiếm phản lại 50% sát thương | 
bua | Đầu nặng | búa sạc đòn nặng nhanh 30% | 
dao | Bước nhẹ | cầm dao: nhảy thêm 1 lần | 
tay | Đốt ngón | cầm găng: đòn 4 đẩy văng gấp đôi | 

Cơ thể (icon) | Name | Effect | Rare
---|---|---|---
heart | Tim sắt | máu tối đa +20, cộng dồn | 
foot | Chân nhanh | tốc chạy +8% | 
lungs | Phổi bễ | thêm 1 ô thể lực | 
pulse | Hồi sức | 4 s không bị đánh: hồi 2 máu/s | 
skin | Da lửa | sát thương vòng lửa −50% | 
ghost | Hồn nhanh | trạng thái hồn chạy nhanh hơn 50% và dài thêm 1 s | 
fang | Hút máu | hạ gục hồi 25 máu | 
fist | Gan lì | dưới 30 máu: sát thương +20% | 
shield | Dầu tôi | đỡ chuẩn hồi 1 thể lực và 5 máu | 
spring | Lò xo | slam nảy cao gấp đôi | 
wing | Bộ phản lực | nhảy 2 lần + lơ lửng (module phan_luc) | hiếm
wheel | Bánh lăn gót | tốc +12%, trượt dài 50% (module) | 
gun | Súng máy vai | tự bắn địch gần mỗi 6 s (module) | hiếm
bow | Nỏ vai | chạm Đổi 2 lần bắn tên (module) | 
arm | Khiên tay | vòng đỡ 180°, đỡ chuẩn +40 ms (module) | 
bomb | Bình nổ | bắt đầu trượt thả bom (module) | 
plate | Giáp dày | mỗi round bắt đầu với giáp +2 | 

## 6. Controls, settings, HUD (phase 24)
- Look sensitivity max 6, gyro sensitivity max 5 (both done in feel.ts). Every settings row must change the game
  live; remove the third-person view setting (keep `third-person.ts` only if a dev scene uses it).
- Layout editor opened in a match: solid black backdrop over the game, so the live controls never show
  through the edited ones.
- Top speed −25%: run 6.75 (was 9), slide 10.5 → 6.75, wall jump out 6. This breaks `reach.test.ts` (the
  7.5 m slide-jump gap) and the 30° ramp test: rescale the movement course gaps, and check every gap/ledge in
  the foundry arena data is still reachable (adjust geometry, not jump height).
- HP bar: move to a clean spot (bottom-left above the stick zone or top-left under the lives), check 16:9
  and 21:9 with the 2/3/4-finger presets so nothing overlaps.
- The in-game exit button (pause → Thoát) works online and offline, cleans up the room and returns to menu.
- Weapon swap: 2 slots, Đổi toggles in 0.3 s (no attack during), the button shows the held slot digit 1 / 2
  in the pictogram style, dims when the other slot is empty. A picked blank fills the empty slot. Entering
  forge stance with an empty hand auto-switches to the slot that has a blade. Server knows the held slot.
- Forge stance buttons: Đánh shows a flame icon (strike), Đỡ shows an eye (Nhập thần) grayed out until the
  meter is full, then normal. Rèn (hold) = Nung.
