# LOOK — art, camera, VFX, UI, copy

The target is ULTRAKILL's *world* look: low-poly shapes with confident silhouettes, small point-sampled
textures, per-vertex lighting, strong per-area color, fog, a crisp full-resolution HUD over a low-res world.
It is NOT neon, NOT bloom, NOT "everything glows", NOT a pile of flat primitive shapes.

## 1. Rendering pipeline (phase 01)
1. **Low internal resolution.** World + viewmodel render into a render target whose height is the
   "Độ phân giải điểm ảnh" setting: 360 / 450 (default) / 540 / 720 / native. Width = height × aspect.
   Upscale to the canvas with nearest filtering. HUD and UI are DOM at native resolution (stay crisp).
2. **Vertex-lit material** (`render/materials/psx.ts`, custom ShaderMaterial, one program for almost
   everything): per-vertex Lambert from a hemisphere ambient + 1 directional + up to 4 point lights
   (chosen per object, nearest first) + vertex colors (baked AO/tint) × texture. Per-pixel only: texture
   sample, fog, emissive. Gouraud banding is the look — subdivide big floors/walls (every ~2 m) so point
   lights read. Optional features (uniform toggles): vertex snapping (setting "Rung đỉnh", default off),
   emissive heat (`uHeat`, uses the blackbody steps in §5).
3. **Textures** are small: 64×64 or 128×128 (never above 256), `magFilter = Nearest`,
   `minFilter = NearestMipmapLinear`, repeat. Make them by downscaling real CC0 photo textures
   (`tools/texbake.mjs`: ambientCG / Poly Haven CC0 → crop → 128 px → boost contrast → reduce to
   24–48 colors → PNG). Hand-tune 3 hero textures (anvil steel, brick, grated floor). No smooth noise
   gradients pretending to be textures.
4. **Post (one cheap fullscreen pass on the low-res target):** color quantize (setting "Nén màu",
   default light = 32 levels/channel) + 4×4 ordered dither before quantize, then gamma. Plus the
   transition/desaturate hooks used by §7. Nothing else: no bloom, no chromatic aberration, no film grain,
   no gradient vignette, no lens flares, no SSAO.
5. **Fog:** linear distance fog per area, color = the area's dominant color. Fog does the depth work.
6. **Color per area** (strong, not rainbow): foundry floor = rust/ember orange in black; catwalks =
   cold steel blue-grey; furnace mouth = the only near-white in the scene; training yard = dusk,
   warm grey stone with one cold sky light. Each area: 1 dominant hue, 1 contrast hue, near-black.
7. **Shadows:** no shadow maps. A dark blob/decal under players, dummies and anvils; baked vertex darkening
   under geometry (AO pass at load or bake script).
8. **Budget (mid phone):** ≤ 120 draw calls, ≤ 150k triangles, ≤ 12 materials, 60 fps at 450p.
   Adaptive quality: if frame time > 18 ms for 2 s, step resolution down one notch (never below 360).

## 2. Modeling rules (all models are built in code; GLB drop-in supported later)
- Use `kit/procgeo.js` (moved to `client/src/render/geo/`): lathe, tube, extrude-with-bevel, rounded box, blob,
  then `bake()` parts into one geometry with vertex colors → 1 draw call per model.
- Silhouette first: 3–5 big shapes, then 5–15 details (rivets, wraps, rims, straps, plates, chains).
- Bevel/chamfer edges slightly. Flat-shaded faces (hard normals) on metal, smooth on cloth/leather.
- Low poly but not crude: a weapon 300–1200 tris, a player 2–4k tris, an anvil 800 tris.
- Every model module exports `build(ctx): THREE.Object3D` and declares sockets/pivots (see §3, §4).

## 3. Weapons (16 at start; more will be added by other agents later)
- Contract: `client/src/weapons/models/<id>.ts` → `build(ctx)` returns a Group with the **grip at origin,
  blade/head along +Y, edge facing +Z**, length in meters, plus `tip` and `base` Object3D markers
  (used for hit sweeps and trails) and `heatMask` vertex attribute (1 = metal that glows when hot).
  If `client/public/models/weapons/<id>.glb` exists it overrides the procedural build (same markers by name).
- Visual progression inside a family: bigger, cleaner, more deliberate. +3 forms look hammered and uneven
  (asymmetric bevels, scale-pitted texture), +18 forms look masterwork (fullers, guards, wraps, inlays).
  Each family's 5 forms must be recognizable as a lineage at a glance.
- Gallery scene `?scene=weapons` shows all forms on a rotating rack with a grid to compare scale.

## 4. Players
- Rigid segmented character (PS1-era technique, no skinning): pelvis, chest, head, upper/lower arms,
  hands (mitten + thumb), upper/lower legs, feet, each a baked mesh parented to a bone `Object3D`.
  Joints hidden by overlapping shapes and armor. Silhouette: a stocky blacksmith.
- **No face.** The head wears a riveted forge mask with a dark visor slit (no nose, no mouth, no eyes drawn).
  Hood or cap over it. Everything else is modeled: neck, hands, belt, apron, boots.
- Clothing base is plain work clothes; the player color shows as a cloth band (sash + armband) only.
- Armor tiers and modules attach to named sockets: `head, chest, back, shoulder_l/r, forearm_l/r,
  thigh_l/r, heel_l/r, hip`. Changing armor = swap socket children, never touch the base body.
- Animation: keyframe clips as data (`player/character/clips/*.ts`, bone rotations + root offset, cubic
  easing), blended by an animator: idle, run (8-dir blend), sprint-lean, jump/fall/land, dash, slide,
  slam, wall-cling, forge-strike loop, heat-hold, block, parry, 3 attack sets × (light ×3, heavy charge,
  heavy release), hit-react (front/back), stagger, death (collapse into rigid physics-lite tumble).
- Local player in first person sees only the viewmodel (arms + weapon). Third-person option shows the body.

## 5. Heat colors (one source of truth: `render/heat.ts`)
Stepped blackbody palette, used for blades, sparks, molten metal and the UI heat meter:
`#1a0b08 → #4a140b → #7d1d0d → #b32d10 → #e0521a → #f2862e → #ffc061 → #ffe9b8 → #fffaf0`.
Use discrete steps (no smooth gradient). Metal cools along this ramp; sparks are born at the top and fall
down it as they cool. This is the game's signature color logic — use it, don't invent glows.

## 6. Camera and feel (constants in `client/src/core/feel.ts`)
- Default FOV 90° horizontal at 16:9 (setting 75–110). Hor+ on wider screens, capped at the 21:9 value so
  long phones get no unfair advantage. Viewmodel uses its own camera at 62° vertical (never distorts).
- Head bob: very subtle vertical only (amplitude 0.015 m at run, setting can disable). No roll bob.
- Strafe roll: ±1.2° toward strafe direction, spring-smoothed. Wall cling roll ±4°.
- Dash: FOV +7° kick in 0.06 s, back over 0.25 s; tiny backward-forward camera pull.
- Slide: eye drops to 0.9 m over 0.12 s with a 2° roll; FOV +4°.
- Landing: spring dip scaled by fall speed (max 0.18 m), viewmodel dips more than the camera.
- Slam landing: hard dip + trauma 0.5.
- Screen shake = trauma model (Eiserloh, "Juicing Your Cameras With Math"): trauma 0–1 decays 1.6/s,
  shake = trauma², smooth noise on yaw/pitch/roll (max 2.5°/2.5°/3°), no positional shake in first person.
  Setting "Rung màn hình": 0–100%.
- Hit-stop: freeze local animation 50–90 ms on landed hits/parries (never freezes the network clock).
- Viewmodel: spring lag on look (stiffness 220, damping 22), sway with movement, recoil kick on heavy,
  idle breathing 0.004 m. Attack animations drive the viewmodel arms with anticipation → strike → follow-through.
- Mouse/keyboard dev controls: WASD, mouse look (pointer lock), Space jump, Shift dash, Ctrl slide/slam,
  LMB attack, RMB parry/block, E forge/interact, F place anvil, Q swap, Tab scoreboard.

## 7. VFX (phase 10) — few, physical, deliberate
- **Sparks:** stretched quads aligned to velocity (length ∝ speed), gravity, 1 bounce on floor with energy loss,
  color falls down the heat ramp over 0.3–0.8 s. 12–40 per forge strike depending on result; 6 on blade clash.
  Pool size 400 total. One instanced draw call.
- **Hot blade:** emissive from `uHeat` × `heatMask`, stepped on the heat ramp. No heat-haze distortion.
- **Level up (Đạt/Tuyệt):** spark burst along the blade, a short blade pulse up one heat step, hit-stop 60 ms.
- **Form evolution:** the blade is quenched — 0.25 s white-hot flash on the blade only, a column of 6–10
  dithered steam sprites rising and fading, a ground ring decal that expands and fades in steps, camera punch,
  the new model swaps at the flash frame. No screen-wide flash.
- **Gãy (break):** the blade splits into 3–5 shard meshes with simple physics, sparks, dull red cooling.
- **Weapon trails:** a ribbon mesh from `base` to `tip`, 6–10 segments, rendered in the low-res pass with
  dithered alpha (no additive glow), color = steel grey; heat tint when blade is hot.
- **Hits:** small dark-red dithered puffs + floor decals (setting "Máu": on/off; off = sparks only).
- **Parry:** short white star of 4 sparks at the contact point + hit-stop 90 ms + metal ring sound.
- **Fire ring:** a wall of animated low-res flame cards (texture atlas 4 frames, 8 fps, stepped), heat haze NO,
  embers drifting up (shared spark pool). Inside the wall the world tints toward the heat ramp.
- **Molten channels:** scrolling texture with two layers at different speeds, emissive, crust islands.
- Per effect budget: ≤ 2 draw calls, ≤ 60 live particles. Particles are never the main effect; motion,
  timing, sound and hit-stop are.

## 8. UI direction (phases 13–14)
**Concept: "stamped steel and soot."** Like spec plates and tool tags in a foundry: hard edges, chamfered
corners (8 px 45° cut), rivet dots, stamped numbering (01, 02, 03), thick rules, high contrast. Solid flat
fills only. Motion has weight: panels drop in like steel shutters (fast in, 2-step settle), never float.

Palette (tokens in `client/src/ui/styles/tokens.css`):
| token | hex | use |
|---|---|---|
| --soot | #0d0b0a | background |
| --slag | #1c1917 | panels |
| --ash | #3a3430 | rules, disabled, idle borders |
| --bone | #e9e1d3 | main text |
| --iron-hot | #f26a1b | the ONE accent: selection, active, your own player |
| --brass | #c9a15a | relics, rarity, points |
| --steel | #7f93a1 | secondary info, cool states |
| --oxide | #b3261e | damage, danger, loss |
The heat ramp (§5) is used only for the heat meter and forge results.

Typography (self-hosted woff2, latin + vietnamese subsets, verified Vietnamese support):
- Display: **Big Shoulders Display** 800/900, uppercase, tight tracking — titles, numbers, buttons.
- Text: **Be Vietnam Pro** 500/600 — settings labels, descriptions.
- Line-height ≥ 1.3 on any Vietnamese text (stacked diacritics: Ấ, Ữ, Ỗ must never clip). Tabular numerals.

Layouts (creative but usable):
- **Main menu:** a live 3D shot of a dark smithy at night, an anvil lit by the brazier. The menu is a vertical
  steel tag strip on the left third: stamped numbers + big condensed words. Selecting = a hammer strike on
  the anvil in the 3D scene (spark, clank), then the transition. Title "WHILE IT'S HOT" stamped small top-left,
  not a giant logo.
- **Settings:** a two-pane ledger. Vertical stamped tabs on the left (Hình ảnh / Âm thanh / Điều khiển /
  Góc nhìn / Hồ sơ), rows on the right with custom sliders (a notched steel bar, square thumb) and segmented
  toggles. Changes apply live.
- **Armory (Kho vũ khí):** the weapon lineage as three horizontal rails (Kiếm / Búa / Thương), forms placed by
  minLevel, locked ones as dark silhouettes. Tap one → 3D turntable of that weapon + its passive in one line.
- **HUD** (only what is needed): HP as a segmented bar bottom-left above the joystick zone, 3 stamina chevrons
  next to it, weapon level as a large stamped "+12" with the form silhouette near the attack cluster, round
  timer + fire-ring countdown top-center, compact kill feed top-right (names + tiny weapon icon), lives as pips.
  The heat meter and strike ring appear only in forge stance, centered low. No minimap.
- Touch buttons: dark translucent steel discs with a 2 px bone outline and a pictogram (drawn SVG, not emoji,
  not text). Pressed = filled --iron-hot for 80 ms.
- Rotation gate (portrait on web): a single pictogram of a phone turning + "Xoay ngang để chơi".

## 9. Transitions (make them feel expensive)
Implemented once in `ui/transition.ts` as a fullscreen WebGL overlay (cover → swap DOM/scene → uncover):
- **Quench wipe** (menu ↔ menu): an ordered-dither dissolve driven by a noise field spreading from the tapped
  element; the advancing edge is 2 low-res pixels wide and steps down the heat ramp (hot edge cooling to soot).
  0.35 s cover, 0.3 s uncover.
- **Stamp cut** (menu → match/training): hammer impact frame (anvil sound, 1 frame of --bone), the screen
  splits along a jagged crack and the halves shear apart with slight rotation, revealing the cage view.
- **Round end:** time scale ramps to 0.25 over 0.15 s for 0.6 s, world desaturates except heat colors
  and --oxide, then the quench wipe to the scoreboard.
- **Death:** desaturate + darken in dither steps toward the edges (not a gradient), 4 s respawn counter as a
  single big stamped numeral.
Every transition has a matching sound (AUDIO §3, "transitions"). Reduce-motion setting replaces them with a 0.2 s fade.

## 10. Vietnamese copy rules
- Standard, short game Vietnamese, like a well-localized console game. Sentence case for descriptions,
  uppercase only for display words. No slang ("bá đạo", "quẩy", "đỉnh", "siêu cấp"), no forced Hán-Việt epics
  ("thần binh", "chí tôn"), no puns, no exclamation marks in UI, no emoji.
- Core vocabulary: Chơi mạng · Luyện tập · Kho vũ khí · Cài đặt · Thoát · Tạo phòng · Vào phòng · Mã phòng ·
  Sẵn sàng · Bắt đầu · Chủ phòng · Mất kết nối · Đang kết nối lại · Vòng 2 · Hưu chiến · Vòng lửa ·
  Hạ gục · Bị hạ · Thắng vòng · Thắng trận · Bảng điểm · Đặt đe · Rèn · Nung · Nhập thần ·
  Tuyệt · Đạt · Giữ · Hỏng · Gãy · Giáp · Phụ kiện · Di vật · Tiếng tăm · Treo thưởng.
- Buttons use pictograms; their names exist for the layout editor and accessibility only.
