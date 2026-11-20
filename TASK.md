# TASK — phases

Rules: do the FIRST phase whose status is `TODO` (or `PARTIAL`). One phase per session. When done set
`DONE`, add 2–4 lines to the Phase log (what exists, anything the next phase must know), update the code map
in CLAUDE.md. If a phase is too big, finish a coherent part, set `PARTIAL`, and write exactly what is left.
"Read" lists the only doc sections you need. "Shots" lists the dev scenes to capture with `tools/shot.mjs`.
Model = recommendation for the user (they switch it before pasting the prompt).

---

### Phase 00 — Scaffold and harness · `DONE` · Sonnet 5.5 · medium
Read: CLAUDE.md, TECH §1–3, §9.
- npm workspaces `client/ server/ shared/`, TypeScript strict, Vite, three + three-mesh-bvh (pinned), vitest.
- Move `kit/procgeo.js` → `client/src/render/geo/procgeo.ts` (typed, three-mesh-bvh not needed there),
  `kit/audio/*` → `client/src/audio/vendor/` + `tools/audio/`. Delete `kit/`.
- `client/src/dev/scenes.ts` registry + URL params (TECH §9) + an `empty` scene (spinning test cube on grid)
  that sets `window.__ready`. `__stats` exposed.
- Boot: full-screen canvas, rotation gate (portrait), `nogate=1` bypass, pause on hidden.
- `core/events.ts` (typed bus), empty-but-structured `core/feel.ts` and `shared/src/balance.ts`
  (each later phase adds its own numbers from the docs), `ui/strings.vi.ts` with a typed key structure.
- Install Playwright Chromium; make `tools/shot.mjs` work: `node tools/shot.mjs empty`.
- Scripts: dev, build, typecheck, test, shot. `.gitignore` (node_modules, dist, shots, audio-src, keystore, .env).
Shots: `empty`. Done when: build + typecheck + test pass, contact sheet shows the cube on all devices.

### Phase 01 — The look: render pipeline, PSX material, textures · `DONE` · Opus 5.5 · high
Read: LOOK §1, §2, §5. TECH §8.
- Low-res render target + nearest upscale, resolution setting, adaptive quality.
- `psx.ts` vertex-lit material (hemi + dir + 4 point lights per object, vertex colors, fog, emissive heat,
  optional vertex snap) as one program with defines. `heat.ts` ramp.
- Post pass: ordered dither + color quantize (settings), desaturate hook for later.
- `tools/texbake.mjs`: fetch 8–10 CC0 textures (rusted metal, steel plate, grated floor, brick, concrete,
  wood planks, leather, cloth, slag/gravel, coal) → 64/128 px crunchy PNGs in `client/public/tex/`.
- `lookdev` scene: small foundry corner (brick wall, grated floor, a pillar, a crate, an anvil block-in,
  a glowing ingot cycling through heat steps, 2 point lights: brazier orange + cold window). Must already
  look like a game, not a test.
Shots: `lookdev` (2 cams). Done when it reads as low-res vertex-lit with crisp pixels, no bloom/glow,
and calls/tris are in budget.

### Phase 02 — Movement, collision, first-person camera · `DONE` · Opus 5.5 · high
Read: GDD §4. LOOK §6. TECH §3, §5 (keyboard only).
- Capsule character vs BVH world (three-mesh-bvh), step-up 0.35 m, slopes ≤ 45°, ceiling checks.
- All moves in GDD §4: run, jump (coyote/buffer), dash (+i-frame flag), dash-jump, slide, slide-jump, slam,
  slam bounce, wall cling, 3 wall jumps, stamina pips. Numbers from `feel.ts`/`balance.ts`.
- Camera system (`player/camera.ts`): every effect in LOOK §6 (FOV kick, strafe roll, slide drop, landing
  spring, trauma shake, hit-stop API). Placeholder viewmodel (a grey hammer) with lag/sway/bob.
- `movement` scene: test course (wall-jump shaft, ramps, slam pad, long dash gap, stairs). Keyboard + mouse.
- Unit tests for the movement integrator (pure functions where possible).
Shots: `movement` (start, mid-slide frozen with `t`). Done when moves feel crisp and tests pass; describe
the feel tuning you chose in the log.

### Phase 03 — Touch controls and control settings · `DONE` · Sonnet 5.5 · high
Read: TECH §5, §6. LOOK §8 (touch buttons only).
- Touch input per TECH §5: floating/fixed stick, look drag zone with per-pointer ownership, button cluster,
  slide-off-to-look, SVG pictograms (no emoji, no text on buttons).
- Gyro aim option, sensitivity X/Y, invert, aim-assist flag (used in phase 08), haptics flag.
- Layout editor (drag/resize/opacity, grid snap, reset, 3 presets), saved per device.
- Gamepad mapping. Make the `movement` scene fully playable by touch (`touch=1`).
Shots: `movement&touch=1` on all devices + layout editor open. Done when nothing overlaps on 16:9 or 21:9
and every control is ≥ 48 px.

### Phase 04 — Android APK pipeline · `DONE` · Sonnet 5.5 · medium
Read: TECH §6, §7.
- Capacitor Android project, manifest/orientation/immersive/cutout/keep-awake/back button per TECH §6,
  cutout CSS variable injection, splash until first frame.
- Keystore generation (git-ignored) + secrets via `gh secret set` (ask the user to `gh auth login` if
  needed), `apk.yml` workflow with rolling `latest` release.
- Push, wait for the workflow (`gh run watch`), confirm the APK asset exists.
Done when the release has an APK. Ask the user to install it and test the movement scene
(the APK opens straight into the `movement` scene until the menu exists).

### Phase 05 — Arena 1: Xưởng Đúc · `DONE` · Sonnet 5.5 · high
Read: GDD §3 (ring, cages, racks), §11. LOOK §1 (color per area), §2, §7 (molten, fire ring visuals only).
- Modular kit built with procgeo (walls, pillars, girders, catwalks, stairs, railings, grates, tanks, crane,
  furnace mouth, cages with doors, pedestal, racks), merged per material, baked vertex AO.
- Layout per GDD §11 as data (`world/arenas/foundry.ts`): spawn points, rack points, ring centers,
  safe respawn points, surface tags per collider (for footsteps).
- Molten channels (scrolling emissive), furnace light, cage doors animate open, fire ring placeholder.
- `arena` scene with 4 preset cams. Movement scene can load the arena.
Shots: `arena` 4 cams. Done when the arena reads clearly at 360p, landmarks are distinct, budget holds.

### Phase 06 — Character, armor sockets, animation, third person · `DONE` · Opus 5.5 · high
Read: LOOK §4. GDD §7 (armor tiers, modules list).
- Rigid segmented blacksmith with forge mask (no face), color band, sockets.
- Armor tier sets 0–4 (apron → full plate) and the 6 module attachments as socket meshes.
- Animator: clip data format, blending (crossfade + 8-dir locomotion), all clips in LOOK §4 except the
  per-family attack sets (phase 08 adds them; make the slots).
- Third-person camera option (over-shoulder, collision-aware), FOV setting.
- `character` scene: lineup of 5 armor tiers + module showcase + an animation player (`?clip=run`).
Shots: `character` (lineup, run frozen mid-stride, slide). Done when armor swaps never clip the body.

### Phase 07 — Weapons: data and 16 models · `DONE` · Sonnet 5.5 · high
Read: GDD §5 (families), §6 (roster, data shape). LOOK §2, §3.
- `shared/src/data/weapons.ts` (16 rows), `shared/src/passives.ts` (hook registry; implement the hooks
  needed by the roster, stubs where gameplay doesn't exist yet), unit tests for data integrity
  (unique ids, sorted minLevels, every model exists).
- 16 procedural models following the contract (grip at origin, `tip`/`base`, `heatMask`), GLB override path.
- `weapons` scene: rack grouped by family with scale grid; `?weapon=<id>&heat=0.7` close-up.
Shots: `weapons` (rack + 3 close-ups). Done when each family reads as a lineage and +18 forms look masterwork.

### Phase 08 — Melee combat core and the dummy · `DONE` · Opus 5.5 · high
Read: GDD §5. LOOK §4 (attack clips), §6 (viewmodel, hit-stop). TECH §4 (only "Melee hits" — design the
local code so a network hit-claim can plug in later).
- Viewmodel arms (first person) with per-family attack sets: light ×3 combo, heavy charge/release, dash
  attack, block, parry. Third-person clips for the same.
- Hit detection: sub-stepped segment sweep vs hit capsules (head/torso/legs, same damage), one hit per
  target per swing, hit-stop, knockback, stagger, parry/block rules, i-frames.
- `shared/damage.ts` (pure, tested). Aim assist for touch.
- Dummy (modes: idle, block, parry, counter, move), damage events on the bus.
- `combat` scene: arena corner with dummies; feel must be weighty.
Shots: `combat` (mid-swing frozen per family, parry moment). Done when tests pass and swing timing per family
matches GDD; log the frame data you chose.

### Phase 09 — Forging system · `DONE` · Sonnet 5.5 · high
Read: GDD §6, §7, §9 (cap rule). LOOK §8 (forge HUD only).
- `shared/forge.ts`: outcome roll with all shifts (heat, timing, level row, notoriety, relic/passive hooks),
  frenzy, break rule, highest-level memory, armor variant. Exhaustive unit tests incl. distributions
  (10k rolls within ±2% of the table).
- Anvil entity (place/pickup/cooldown/solid), forge stance camera blend, heat hold, strike ring UI,
  family pick at +3, form swap on milestones, armor target toggle, module slots, 2 weapon slots + swap.
- `forge` scene: anvil + blade; `?level=9&heat=0.6` presets.
Shots: `forge` (stance view, strike ring, family pick). Done when the loop is playable end to end offline.

### Phase 10 — VFX pass · `DONE` · Opus 5.5 · high
Read: LOOK §5, §7. CLAUDE.md rule on events.
- Spark system (instanced, physical, heat ramp cooling), blade heat glow, level-up, form evolution (quench),
  break shards, trails, hit puffs/decals, parry star, slam ring, fire ring wall + embers, molten polish.
- All driven by bus events; budgets per LOOK §7. Setting "Máu".
- `fx` scene: buttons/URL to trigger each effect; `?fx=evolve&t=0.2` freezes mid-effect.
Shots: `fx` (evolve mid, sparks mid, break mid, parry). Done when effects are few, physical, and in budget.

### Phase 11 — Audio A: engine, sources, pipeline · `DONE` · Sonnet 5.5 · medium
Read: AUDIO §1, §2.
- Runtime engine (buses, compressor/limiter, generated IR reverbs, 3D panner + distance/occlusion filter,
  voice limits, round-robin, output mode phone/headphones), unlock, settings volumes.
- `tools/audio/fetch.mjs` + `sources.json`: download the CC0 packs/files (AUDIO §2). Ask the user for a
  freesound API key only if needed. CREDITS.md.
- `tools/audio/design.py` + `recipes.yaml` skeleton + `check.py` (pip install numpy scipy soundfile pedalboard).
- `audition` scene listing every event in AUDIO §3 (missing ones marked).
Done when the engine plays sourced test sounds in the audition scene and check.py runs.

### Phase 12 — Audio B: design and mix every sound · `DONE` · Opus 5.5 · medium
Read: AUDIO (all), `docs/AUDIO_NOTES.md` if it exists.
- Write recipes for every row in AUDIO §3 (layers, EQ, saturation, weight layer, takes), render, check,
  iterate with the spectrogram sheet. Wire `audio/events.ts` for every gameplay event that exists.
  Ambience beds + positional emitters in the arena, footsteps by surface tag, haptics map.
- Mix snapshot from AUDIO §5. Ducking. Phone speaker mode.
Done when every row exists, check.py passes, and the log tells the user exactly what to listen to on the phone.

### Phase 13 — UI A: design system, main menu, transitions · `DONE` · Opus 5.5 · medium
Read: LOOK §8, §9, §10. If skills `frontend-design` or `web-ui-multidevice` are available, load them.
- Fonts self-hosted (Big Shoulders Display, Be Vietnam Pro; latin + vietnamese subsets; verify the
  vietnamese subset exists), tokens.css, components (stamped button, tag strip, ledger row, notched slider,
  segmented toggle, panel shutter, toast).
- Title + diegetic main menu scene (smithy, anvil, hammer-strike selection), screen state machine.
- `ui/transition.ts`: quench wipe, stamp cut, round-end and death hooks, reduce-motion fallback.
Shots: `ui-menu`, `transition&t=0.15`. Done when the menu looks designed (not a template) on 16:9 and 21:9
and diacritics never clip.

### Phase 14 — UI B: settings, armory, HUD, pause · `DONE` · Sonnet 5.5 · medium
Read: LOOK §8, §10. TECH §5 (settings list). GDD §9.
- Settings ledger with all settings (graphics, audio, controls incl. layout editor entry, view, profile:
  name + color), live apply, persistence.
- Armory (three lineage rails, locked silhouettes, turntable), HUD (everything in LOOK §8, nothing more),
  pause menu, scoreboard overlay.
Shots: `ui-settings`, `ui-armory`, `hud` on all devices. Done when no overlap/clip on any device.

### Phase 15 — Training yard and profile · `DONE` · Sonnet 5.5 · medium
Read: GDD §9, §10.
- Profile storage (localStorage + Capacitor Preferences), unlock rules, cap at bestLevel with the refused
  strike, weapon rack + armor stand of unlocked items, dummy mode switch (diegetic lever/board), movement
  course, chalkboard damage/DPS, works fully offline. Menu → Luyện tập → yard with the stamp cut.
- APK now opens to the title/menu.
Shots: `training` (2 cams). Done when the yard is complete offline in the APK.

### Phase 16 — Server: rooms, protocol, clock, deploy · `DONE` · Sonnet 5.5 · medium
Read: TECH §1, §4 (rooms, protocol, clock), §7 (deploy).
- Worker routes + Room DO (SQLite-backed class, `locationHint: "apac"`), create/join by code, host
  handling, reconnect tokens, lobby hibernation, match tick, empty-room alarm.
- `shared/net/protocol.ts` + binary codec with round-trip tests. Client `net/client.ts`, clock sync, ping.
- Lobby UI (Tạo phòng / Vào phòng / code entry / ready list / host settings). `tools/netbot.mjs`.
- `deploy.yml` + ask the user for the Cloudflare token (once), deploy, test bots against production.
Done when 3 netbots + 1 client sit in a lobby on the deployed Worker with stable ping.
REMAINING (needs the user): set secrets `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID`, run deploy, put the real workers.dev URL in `client/src/net/config.ts` `DEPLOY_URL`, then `node tools/netbot.mjs --host <url> --n 3` against production.

### Phase 17 — Netplay: players, hits, authority · `DONE` · Opus 5.5 · high
Read: TECH §4 (all). GDD §3 (lives/respawn), §5.
- Remote players with interpolation buffer, animation replication, weapon/armor visuals from state.
- Hit claims + server validation + parry/block resolution, damage/kill events, i-frames, respawn.
- Server-authoritative forge rolls with hidden latency, pickups, anvils as replicated entities.
- Net debug overlay (dev only): ping, jitter, buffer, rejected claims. Simulated latency/loss flags.
Done when 2 browser clients + 2 netbots fight and forge with 150 ms simulated latency and it still feels fair;
log the tuning.

### Phase 18 — Match flow · `DONE` · Sonnet 5.5 · medium
Read: GDD §3, §8.
- Cages + countdown, doors, blank spawns, truce, fire ring (server-driven), lives, round end rules,
  scoring incl. bounty, slow-mo end + scoreboard, relic draft UI and rules, notoriety, match end screen,
  unlock writes to profile, return to lobby.
Done when a full match (first to 3) runs with bots and the end screen shows unlocks.

### Phase 19 — Performance, device fit, bug sweep · `DONE` · Sonnet 5.5 · high
Read: TECH §6, §8. LOOK §1.8.
- Measure with `__stats`, fix budget overruns, adaptive quality, memory leaks between rounds, loading time.
- shot.mjs on all devices for every scene; fix every overlap/clip/cut. APK cold-start check.
Done when every scene passes on all devices and the log lists measured numbers.

### Phase 20 — Balance and playtest kit · `DONE` · Sonnet 5.5 · medium
Read: GDD (all). `docs/PLAYTEST_NOTES.md` if it exists.
- Simulation script for forge EV per level band and expected round outcomes; adjust `balance.ts`.
- Write `docs/PLAYTEST.md` (Vietnamese, short): what to try in the first session with friends and how to
  report feedback in `docs/PLAYTEST_NOTES.md`.
Done when the sim results are in the log and the APK release is current.

---

## Round 2 — playtest fixes (cheap: read only what each phase names; shots on `phones` only)

### Phase 21 — Gameplay and flow fixes · `DONE` · Sonnet 5.5 · medium
Read: GDD §3, §4, §7, §8 (only rows that mention dash). Code map lines for player/, net/, ui/menu, app/.
- **Remove dash completely** (action, button, stamina use, dash-jump, i-frames, dash attack, dash sounds/fx
  bindings). Replace dash dependencies: `phan_luc` = double jump + hover; `binh_no` drops its bomb on slide
  start; `dai_dao` passive = slide attack lunge +50%; `gang_da` stays. Update GDD §4/§5/§7 and strings.
- **Finite slide:** slide lasts at most 0.8 s (feel.ts), speed eases down to run speed, then the player stands
  up even if the button is held; 0.35 s cooldown. Slide-jump keeps momentum. Update movement tests.
- **Cage bars are walk-through:** give cage bars/doors colliders in the CollisionWorld (closed = solid,
  open = removed), same for any other visual-only blocker found in the arena data. Add a test.
- **First choice blocked by joystick** (the relic draft in the cage, and the +3 family pick): while any modal
  choice is open, hide/disable the touch control layer (pointer-events none), put modals above it, make
  cards large tap targets. Check every overlay screen for the same bug.
- **Lobby roster:** show each player's name + color swatch, host mark, ready state, and "n/6" count; join/leave
  updates live; a short join/leave sound via the bus.
- **Match settings (host):** rounds to win (2/3/5), round time (120/180/240 s), lives (1/3/5), truce
  (0/30/60), fire ring speed (chậm/vừa/nhanh), max players (2–6). Server-validated in `RoomSettings`,
  numbers in balance.ts, shown read-only to non-hosts.
- **Transition hitch:** the cover animation must never freeze. Run the cover on its own time, hold the
  covered state until the next scene reports ready, build the next scene in slices across frames, and warm
  shaders with `renderer.compileAsync` while covered; uncover only after 2 good frames. Same for Chơi mạng.
Shots: `ui-menu`, `lobby`, `net` (draft open with `touch=1`). Done when tests pass and the draft is tappable.

### Phase 22 — Touch controls redesign, full layout freedom, 3–4 finger play · `DONE` · Opus 5.5 · medium
Read: TECH §5. LOOK §8 ("Touch buttons" and palette only). Code map lines for input/.
- Redesign every gameplay control (stick, Đánh, Đỡ, Nhảy, Trượt, Rèn, Đặt đe, Đổi, pause, scoreboard) as one
  coherent set: machined steel discs with a bevel ring, crisp custom SVG pictograms drawn to one grid and
  stroke weight, clear pressed state (inset + --iron-hot fill 80 ms), cooldown/charge shown on the rim,
  contextual buttons fade in place instead of popping. Nothing generic, no text labels.
- Layout editor: move, resize and set opacity of EVERY control individually (stick base too), snap grid,
  per-control reset, presets **2 ngón / 3 ngón / 4 ngón (claw)**, plus the 3 custom slots.
- Real multi-touch: any number of simultaneous pointers; a finger can hold Đỡ or charge Đánh while another
  looks and another moves; any touch not on a control looks; a button press can slide into looking.
  The claw presets put Nhảy/Trượt/Đánh on index fingers (top corners).
- Tests for pointer ownership with 4 simultaneous pointers.
Shots: `movement&touch=1` and the layout editor, `phones`. Done when all presets work and nothing overlaps on 16:9 and 21:9.

### Phase 23 — App icon and splash · `DONE` · Sonnet 5.5 · medium
Read: LOOK §1, §5. TECH §6 (splash).
- `?scene=icon`: a cinematic in-engine render built for the icon: the anvil close-up, a blade at forging heat
  on it, hammer frozen mid-strike with a few sparks, one strong warm key light from the blade/brazier,
  deep black surroundings, rim light on the hammer. Render at native resolution (not the low-res target) so it
  stays readable; textures keep nearest filtering. Composition must read at 48 px: one big silhouette, the hot
  blade as the brightest shape, centered in the adaptive-icon safe circle.
- Capture 1024×1024 with shot.mjs (add a square `icon` device), check a 48 px downscale side by side.
- Generate Android adaptive icon (foreground + solid soot background layer, monochrome layer for themed icons)
  and all mipmaps + splash with a small script (sharp), wired into `android/`. Commit the PNGs.
Done when the APK built by CI shows the new icon and splash.

### Phase 24 — Import community weapons from weapon-lab · `WAIT` (set to TODO after phase 28, when lab files exist) · Sonnet 5.5 · medium
Run only after phase 28. Read: `weapon-lab/PROMPT_FREE_CLAUDE.md` (the kit contract), `docs/ROSTER.md`. Code map lines for weapons/, shared/src/data/weapons.ts, passives.ts.
Run this phase again every time the user drops new files into `weapon-lab/weapons/*.js`.
- Once: `client/src/weapons/lab-kit.ts` implements the same `k` API as `weapon-lab/preview.html` (incl. `edge` loft + fuller, `wrap`, `paint`; port the code from that file) on top of the
  game's one-mesh builder (`wkit`): merges all parts into one geometry, maps slots → weapon atlas palette,
  metal slots → heatMask, flat normals, keeps `tip`/`base` markers. A loader registers each lab file as a
  model by `meta.id`. `tay` files are a right gauntlet; the game mirrors it for the left fist.
  Also give `preview.html` swing previews for `dao` and `tay`, and drop `thuong`.
- For each lab file whose `meta.id` is a ROSTER id: it becomes that row's model (mark the row `có`); effects
  stay as ROSTER says (ignore `meta.effects`). A file with a new id: add a row only if it fits a free level
  slot, else report it. Files of the old `thuong` family (e.g. `the_dao_pha_thu.js`) are skipped.
  Keep the lab file unchanged; put any fix in an override next to it.
- Unit test: every lab file builds, tris ≤ 1500, markers present, ids unique.
Shots: `weapons` (rack). Done when the new models appear in the rack, armory and training.

## Round 3 — second playtest (design: `docs/ROUND3.md`, forms: `docs/ROSTER.md`; shots on `phones` only)
Order: 25 → 26 → 27 → 28 → 28b → 29 → 30 → 31 → 32. Phase 24 any time after 28 when lab files exist.
Every phase rewrites the GDD sections it changes so GDD stays the truth.

### Phase 25 — Controls, HUD, weapon swap, smooth ring · `TODO` · Sonnet 5.5 · medium
Read: ROUND3 §6 and §3 (only the "Ring closes smoothly" bullet). Code map lines for input/, ui/hud, ui/menu (settings), app/pause.ts, net/net-flow.ts, world/foundry/ring.ts, forge/controller.ts.
- Already done in chat: look sens max 6, gyro sens max 5. Do the rest of ROUND3 §6: top speed −25% (with
  the reach/course/arena check),
  audit every settings row (each one must change the game live; fix the dead ones), remove the
  third-person setting, solid black layout-editor backdrop in a match, HP bar position, exit button,
  2-slot weapon swap with slot digit, forge-stance icons (flame strike, eye Nhập thần grayed until full).
- Ring: per-frame scale/uniform from the fight clock, never rebuilt; remove the 0.25 m quantize in
  `net-flow.ts` (it causes the jumps) and any rebuild in `setRing`.
- Tests: settings round-trip, swap rules (empty slot, auto-switch on stance), ring radius continuity.
Shots: `hud&touch=1`, layout editor over `net`, forge stance with frenzy empty and full. Done when no
dead setting is left, swap works online, and the ring moves without steps.

### Phase 26 — Forging rework: precise strikes, new outcomes, new Nhập thần · `TODO` · Sonnet 5.5 · high
Read: ROUND3 §1, GDD §6 (rewrite it). Code map lines for shared/src/forge, forge/, ui/forge-hud*, match/forge-auth, net/net-forge, tools/forge-sim, audio/events, fx/.
- Shared ForgeSession: Lên/Giữ/Vỡ outcomes, `p(L)`/`zone(L)` curves, heat zone multipliers, seeded zone
  sequence + jump-ahead gap, no cadence, max +45, no Gãy, new frenzy (meter 10, 4 s, half-ring zone that
  shrinks, its own odds). Keep relic hooks working through ForgeMods (cards replace relics in phase 31;
  rename/extend mods to fit ROUND3 §5 weapon cards: zoneMul, heatMul, decayMul, costMul, frenzyFillMul,
  frenzyPlusS, guardVo, plus2Once, sureAfterVo).
- Client: strike on pointer-down with the event timestamp, local Trúng/Trượt verdict shown at once,
  queued strikes, ring drawn from the shared clock every frame; server checks phase within `strikeTolS`.
  Find and remove the current delay (tap discrimination, release-based input, cooldown, waiting on server).
- Frenzy feel per ROUND3 §1, everything restored at the end (lesson: audio filters must reopen).
- `tools/forge-sim.mjs`: add blind-spam / semi-careful / expert player models for frenzy and the round
  targets; tune with it and write the numbers in the Phase log.
- Tests: outcomes, gap never under the marker, frenzy shrink, server/client verdict agreement at ±tol.
Shots: `forge` normal, frenzy start, frenzy end (zone small). Done when the sim hits the ROUND3 targets.

### Phase 27 — Ghost respawn, rounds carry over, fire-ring pain · `TODO` · Sonnet 5.5 · high
Read: ROUND3 §2 and §3, GDD §3 (rewrite it). Code map lines for shared/src/match, net/ (net-flow, net-match, remote), player/camera, render/post.ts, audio/{events,catalog,bank}, fx/fx-bind, ui/transition.
- Death costs no level (remove `deathLevelLoss`). Ghost phase exactly as ROUND3 §2, server-authoritative,
  synced in State/Snapshot (one flag), pale dithered remote body, hidden attack/guard/forge/swap buttons.
- Carry-over: blades (both slots, family, level), armor; end-of-round loss 2k / k; form resets at round
  change; pedestal blank count; result screen shows the loss. `match.carry` numbers in balance.ts.
- Outside the ring: 0.5 s ticks, `ring_hurt_0` each tick, hurt-cam roll + dip, dithered red edge vignette
  in `post.ts` (shared with the white ghost vignette). Death: `death_crack_0` loud.
- Both sound files are already in `client/public/sfx/` (ogg + m4a); add them to the manifest/catalog and
  CREDITS; they are user-supplied, so `tools/audio/design.py` must not overwrite or delete them.
- Tests: ghost rejects hits both ways, ghost end inside ring, carry-over math for 5 rounds, tick damage sum.
Shots: `net` dead text, ghost view, outside ring (red edge), round result with losses. Done when an
online bot match plays 3 rounds with carried blades and no death level loss.

### Phase 28 — Families: Kiếm, Búa, Dao, Tay (remove Thương) · `TODO` · Opus 5.5 · medium
Why Opus: new first- and third-person knife and fist animations decide how the game feels.
Read: ROUND3 §4, `docs/ROSTER.md` (columns + ids only), GDD §5 and §6 roster (rewrite them). Code map lines for data/weapons, passives, weapons/, combat/ (incl. vm/), character/clips, forge-hud (family pick), core/profile.
- Remove thương everywhere; old profiles load (drop unknown ids). Family pick shows 4.
- `weapons.ts`: 60 ROSTER rows (+ phoi), forms every 3 levels to +45, per-family stat/scaling formulas and
  move traits from ROUND3 §4 (numbers in balance.ts), `passivesOf` = row's own list. Kiếm/búa keep their
  existing passives on their new levels; effects not built yet are listed ids that are no-ops until phases
  29/30 (a test lists which ids are still no-op).
- Movesets: dao (alternating slashes + stab, heavy lunge stab) and tay (jab, jab, hook, uppercut, charged
  straight) with FP viewmodel + TP clips + sweep arcs; gauntlet mirrored for the left fist; fists hidden in
  forge stance with the gauntlet on the anvil.
- Placeholder in-game models for `dao_gam` and `gang_sat` (decent, family style) + the missing-model
  fallback rule; bua/kiem existing models move to their new levels.
- DPS table test (ROUND3 §4).
Shots: `combat` with each family (FP mid-swing), `weapons` rack. Done when all 4 families fight online.

### Phase 28b — High-level weapon models (+30 to +45, 16 forms) · `TODO` · Sonnet 5.5 · medium
Read: `weapon-lab/PROMPT_FREE_CLAUDE.md` (rules + kit), ROSTER rows +30..+45 only. Code map lines for weapons/.
- Build the 16 rows as weapon-lab JS files in `weapon-lab/weapons/` (same contract, so phase 24 imports them),
  following the prompt's "new idea, never just bigger" rule. Render each in `preview.html` or the game
  rack, look at it, fix proportions and floating parts, max 2 fix rounds per model. tris ≤ 1500.
- If a free-chat model from +3..+27 is already in `weapon-lab/weapons/` and clearly broken, note it in the log
  (do not rebuild it here).
Shots: `weapons` close-up of each new model. Done when 16 files exist and each passes the preview warnings.

### Phase 29 — Form effects A: effect toolkit + Kiếm and Búa rows · `TODO` · Sonnet 5.5 · high
Read: ROSTER kiem + bua rows, ROUND3 §4. Code map lines for passives, match/effects, combat/resolver, net/ (snapshot), fx/, audio/events, physics/blockers.
- One data-driven effect toolkit (server-authoritative, every active effect has a cd in balance.ts):
  statuses (burn, slow, freeze/root, pin-to-ground), knock/launch/wall-bounce, pull, projectiles (flying
  slash, fire column, thrown anchor + grapple, meteor), ground fields (lava crack/pool, ice floor, gong
  wave, black hole with a hard cap on hold time), chain lightning, orbiting blades, crack line.
  Projectiles and fields are small server entities in the snapshot (compact, pooled on the client).
- Map every kiem/bua row 18–45 to toolkit entries; no switch-case on ids.
- VFX and sound per atom through the bus: dithered, crunchy, readable, no glow; reuse fx pools.
- Tests: every kiem/bua row resolves; cds hold; black hole cannot pin anyone longer than its cap.
Shots: `fx` bench for each new atom. Done when each row's effect is visible in `training` at its level.

### Phase 30 — Form effects B: Dao and Tay rows · `TODO` · Sonnet 5.5 · high
Read: ROSTER dao + tay rows. Code map lines as phase 29 + the toolkit files it added.
- Add the missing atoms: backstab bonus, invisibility (dithered, breaks on attack), blink/teleport (behind
  attacker, aimed 12 m slash-dash with a safe-landing probe), hook lunge to target, decoy clone, blade
  storm, time-slow field, speed stacks, extra jumps, heal on hit/kill, stone wall (dynamic collider), rocket
  fist, giant hand slam (incl. from the sky), meteor rain, returning thrown knife, fire trail on slide.
- Map every dao/tay row; then a test that no ROSTER effect id is a no-op any more.
Shots: `fx` bench for each new atom. Done when each row's effect is visible in `training` at its level.

### Phase 31 — Card draft (Lá bài) replaces relics · `TODO` · Sonnet 5.5 · medium
Read: ROUND3 §5, GDD §7 and §8 (rewrite them), LOOK §8 palette only. Code map lines for data/relics, data/modules, match/flow, net/net-flow, ui/hud/draft, ui/modal.ts, input/pictograms.
- `cards.ts` (all cards of ROUND3 §5, effects through existing hooks/ForgeMods), server draft rules
  (≥ 1 of each kind, last place reroll + rare, timeout = first card), delete relics.ts and its uses.
- Card UI: black cards, pictograms on the touch grid, name + one line, rare double border, big tap targets,
  `setModal` hides the touch layer. Strings in strings.vi.ts.
- Tests: offers always mix kinds, no duplicates unless stackable, every card id has an effect.
Shots: draft with `touch=1` (normal and last place). Done when cards are picked every round online.

### Phase 32 — Performance, audio stutter, gyro · `TODO` · Sonnet 5.5 · high
Read: TECH §5 (gyro) and the perf/quality section, LOOK nothing. Code map lines for main.ts, render/pipeline, render/geo/static-batch, character/skin-batch, fx/, audio/{graph,engine,voices,bank}, input/gyro, tools/sweep.
- Measure first: a 6-bot fight scene with effects, CPU throttled ×4 in `tools/sweep.mjs`; write frame-time
  split (JS / render / GC) before and after in the Phase log.
- Render: no per-frame allocations, pooled fx, fewer draw calls (instancing / merged batches), lower-rate
  or GPU skinning for far characters, LOD for remote weapons, warm every effect material at load
  (no shader compile mid-fight), faster adaptive resolution.
- Audio stutter: `latencyHint: 'playback'` on Android, one shared reverb send, voice cap, node pooling,
  decode at load only, no voice stacking for repeating ticks (`ring_hurt`), nothing heavy on the audio path.
- Gyro: `devicemotion.rotationRate` at sensor rate, axes remapped by `screen.orientation.angle` for both
  landscapes, yaw = rotation around gravity (works upright or flat), pitch around the screen's horizontal
  axis, tiny deadzone + One-Euro filter, applied per render frame. Pure mapping function with a test:
  tilting the phone up never turns the view sideways, in both landscape orientations.
Done when the throttled 6-bot scene holds ≥ 55 fps and a 3-minute run has no audio dropouts.

---

## Phase log
(newest last)
- Phase 00: workspaces client/server/shared, Vite 8 + three 0.187 + three-mesh-bvh 0.9.18 (pinned), vitest 4.0.18 (4.1.x breaks npm's resolver here). `kit/` removed: procgeo is typed TS, sfx engine is the untyped vendor `client/src/audio/vendor/sfx.js`, audio tools in `tools/audio/`.
- Scenes: add a line to `client/src/dev/scenes.ts` + a `scene-<name>.ts` default-exporting a SceneFactory; loop in `main.ts` sets `__ready`/`__stats`, honours `t` (frozen), `seed`, `cam`. Fixed 60 Hz sim step (`FEEL.simStep`), canvas pixel ratio 1.
- Not installed locally: playwright (shot.mjs uses the preinstalled global one). Rotation gate + fullscreen/landscape lock done; Capacitor pause hook comes in phase 04. Branch needed `git branch --set-upstream-to` for pull.
- Phase 01: `render/pipeline.ts` renders the world into an sRGB target at the internal height (URL `res=360|450|540|720|native`, `quant=off|light|strong`, `snap=1`, `adaptive=0` until settings exist); the canvas backbuffer IS the low-res size and CSS `pixelated` upscales (no native-res fill). Post (dither+quantize) runs after sRGB encode, not before gamma as LOOK §1.4 reads — darks keep their steps. Shots: `lookdev&t=3` and `lookdev&t=3&view=1` → 13 calls, 19k tris, 2 programs.
- PSX: ONE program for everything (`psxMaterial`): untextured surfaces bind a 1×1 white map, heat is a per-object `userData.heat` (0..1) × optional `heatMask` vertex attribute; nearest 4 point lights picked per object in `onBeforeRender` from a `LightRig`. A StaticBatch mesh spans its whole area, so later arenas must batch per region if they have > 4 lights.
- World surfaces = `MaterialLib` keys (`render/materials/library.ts`: tex, tile meters, footstep tag). Textured parts want vertex colors near white (≥ #c0) — texture × dark vertex color goes black. Static geometry: `StaticBatch` (world box UVs) → `bakeAO()` (BVH rays, ~0.3 s). `tools/texbake.mjs` (sharp 0.34.5, own median-cut: sharp's palette writer caps at 16 colors) bakes 10 Poly Haven CC0 textures; `--try id,id` previews sources; grate is drawn procedurally over rust.
- Lookdev has a 3rd low warm light (off-screen furnace) besides brazier + window: backlit-only left the anvil a silhouette. Judge the dither/pixel crunch on the phone at 450p; headless shots are 360 css px tall.
- Phase 02: `physics/world.ts` (one merged BVH, capsule resolve/probe/overlaps) + `player/motor.ts` `stepMove(state, input, dt, kin)` is the whole GDD §4 rule set, pure per tick; `kinematics.ts` = collide-and-slide (≤15 cm substeps, 40 m/s slam can't tunnel), step-up, ground snap, wall probe. 18 vitest cases incl. `reach.test.ts` (shaft/gap/bounce stay beatable only with the intended move). `movement` scene: click to lock, R respawn, H = hit-stop+shake test; `t=0.75` replays `demo=slide|dash|slam` and freezes. `Scene.render(alpha)` now gets render interpolation.
- Decisions: movement numbers live in `BALANCE.move` (server can validate speeds; i-frames are combat), camera/viewmodel in `FEEL.camera/viewmodel`. Gravity is split half before/half after the move (exact v²/2g apex). Dash has no gravity and exits clamped to 9 m/s; slam = a fresh slide press in the air (holding slide through a slide-jump never slams); slide from standstill goes where you face and keeps going under low ceilings until there is room. Ground contacts only stop the fall (no speed lost landing on ramps); >45° faces clip horizontally and never lift you. Hit-stop freezes camera/viewmodel animation only. C = second slide key (Ctrl+W closes the tab). Ramps must be real wedges: rotated boxes leave a lip that reads as an overhang.
- Feel chosen: landing spring k170/c21 (slightly under-damped, ~0.07 s to the bottom, impulse calibrated so the dip in meters is exact, viewmodel ×1.7); roll spring k140/c24; eye drop rate 25/s; bob stride 2.4 m (vertical only); dash FOV kick eased-out in, smoothstep out; viewmodel hammer in a lower-right 3/4 hold. Camera/viewmodel feel and events go through the bus (`move:*`, `cam:trauma`, `cam:hitstop`) — combat in phase 08 emits the cam events.

- Phase 03: `input/bind-input.ts` wires every source (touch, KB+mouse, gamepad, gyro) to the one `Actions` layer; `touch=1` swaps KB+mouse for `TouchControls` (a mouse acts as a finger on desktop), `editor=1` opens the layout editor. One capture layer owns all pointers (stick: floating = left half / fixed = ring zone; look = any other finger; a finger that starts on a button holds it and looks once it slides off 1.25× radius). Layouts are anchored design-px (360 px tall safe rect, scaled ≤1.6× on tablets), min 48 px real, 3 slots per device in localStorage (`wih.touch.layout.v1`), factory slots = right-hand / mirrored / compact; unit tests assert no overlap and ≥48 px on 640/736/780/800/840×360 and 1024×768. Settings in `input/controls-settings.ts` (`Controls.v`, persisted; sens X/Y, invert, dead zone, fixed stick, gyro + sens, aimAssist, haptics, holdParry — the last two only stored; phase 08 reads aimAssist/holdParry, phase 14 builds the ledger UI). Defaults/ranges/feel numbers: `FEEL.input`.
- Gyro uses `devicemotion` rotationRate with the landscape axis mapping derived on paper (`gyroLook`, unit-tested for symmetry only) — signs need a real phone. Gamepad: standard mapping, A jump, B/LS slide, X forge, Y swap, LB anvil, RB dash, LT parry, RT attack, Select/Start. Forge/anvil buttons are contextual (`touch.setContext`); the movement scene shows them always. `openLayoutEditor(touch)` returns a promise: phase 14 settings calls it. Editor panel text lives in `STR.layout`.

- Phase 04 (PARTIAL): Capacitor 8.6.2 project in `android/` (sensorLandscape, immersive sticky, shortEdges cutout -> `--cut-l/r/t/b` injected from `MainActivity`, keep-screen-on, black splash hidden by `app/native.ts` on first `__ready` frame, back button -> bus `app:back`, app state -> `app:pause`). In the APK `nativeSearch()` defaults to `scene=movement&touch=1&nogate=1`. `.github/workflows/apk.yml` (push to main, rolling release `latest`, asset `while-its-hot.apk`) falls back to a debug-signed APK when keystore secrets are missing.
- NOT done here: this sandbox's proxy blocks `gh secret set`/Actions, there is no Android SDK, and work is on a feature branch, so the workflow has not run and no APK exists yet. Remaining: run `gh auth login` then `tools/android-keystore.sh` locally (sets the 4 secrets), merge to `main`, check Actions, confirm release `latest` has the APK. Secrets must exist before the first real build, or friends must uninstall once when the signed key arrives.
- Phase 04 follow-up: the first CI run on `main` failed at `android-actions/setup-android@v3` (sdkmanager "Failed to find package 'tools'"). The step is replaced by a license-accept on the SDK preinstalled on `ubuntu-latest`. Not verified (no Actions access from the sandbox): merge to `main`, check the run, and confirm release `latest` has `while-its-hot.apk`. If Gradle then fails on a missing platform/build-tools, add `sdkmanager "platforms;android-36" "build-tools;36.0.0"` (match `android/variables.gradle`).
- Phase 04 follow-up 2: CI run 2 passed the SDK/npm/build/cap steps and failed in Gradle: `versionCode (expr).toInteger()` parses as `versionCode(expr).toInteger()` -> "Value is null". Fixed with explicit parens. Gradle config can only be verified by CI here (no Android SDK in the sandbox).
- Phase 04 DONE: CI run 3 on `main` (commit c2aa70a) succeeded with the 4 keystore secrets present (signed release build, no debug-signing warning path); release `latest` (prerelease, so `releases/latest` API 404s — use the tag URL) holds `while-its-hot.apk` (3.4 MB). Download: `https://github.com/harieedawwn/while-its-hot/releases/download/latest/while-its-hot.apk`. Not yet tested on a phone: user should install it and check the movement scene (immersive, landscape, cutout, back button, touch controls, gyro signs). Later phases only need to push to `main` for a new build.

- Phase 05: Arena 1 is data + builders. Layout (cages, racks, pedestal slots, ring centers, safe respawns, molten/dais/heap/tank tests, `wallPoint/wallYaw`) in `shared/src/world/arenas/foundry.ts`; geometry in `client/src/world/foundry/*` (floor, shell+cages, furnace, catwalks, crane, landmarks, molten, cages doors, fire ring) via `createFoundry(rig)` → `{root, world, update, setDoors/openCages, setRing}`; `applyFoundryLook(rig)` sets hemi/dir/fog. Scenes: `arena&view=0..3` (`doors=0..1`, `ring=m&rc=0..2`) and `movement&arena=1&sp=0..5` (walk it). Footsteps: `CollisionWorld.footAt(raycastHit)` returns the surface tag (metal/stone/grate/gravel/wood) from each mesh's `userData.foot`.
- Budget: 71–77 calls, 60–82k tris, 11 materials (10 from MaterialLib + molten), 2 programs. `RegionBatch` splits statics into 20 m light regions (the PSX program lights each mesh with its nearest 4 point lights; ~20 lights in `foundry/index.ts`). Vertex AO bake is ~100k verts ≈ 2.6 s in node — slow on a phone: phase 19 should cache/trim it. Camera far plane raised 60 → 110 (arena is 85 m across).
- FIXED a phase-02 bug found here: head-on ledges above ~0.2 m blocked the body (step-up advanced only one tick of clipped speed and slid back off the edge). `Kinematics.stepUp` now advances ≥ 0.9 r while lifted; reach.test.ts covers a 0.3 m curb, a 0.25 m-riser stair flight and a 0.4 m wall. Tread rise 0.25 / run 0.45 is fine now. foundry.test.ts walks the real collision: cage exits, bridges, stairs, dais, upper flights, all 4 wall-jump shafts.
- Not in the arena yet: cage-door collision (doors are visual only; match flow in phase 18 needs a dynamic collider), blank/relic meshes on pedestal and racks (slots are data: `pedestalSlots()`, `rackSlots(i)`), fire ring is a stepped placeholder (phase 10 = real flame cards), molten damage (zones = `inMolten`, phase 08/17). Upper crane layer is reached by two stair flights from the ring catwalk; the 4 wall-jump shafts lead from the floor to the mid catwalk. User should walk it on the phone: `movement&arena=1` (build the APK default scene if wanted) and judge scale, brightness and the stairs.

- Phase 06: the blacksmith is `player/character/*`: 15-bone rigid skeleton (`skeleton.ts`: BONES, sockets table, `Pose` = flat Float32Array, character faces −Z so `root.rotation.y = yaw`), baked parts per bone merged into ONE dynamic mesh per surface and re-posed on the CPU (`skin-batch.ts`; no skinning shader, still 2 programs). `Character` = body (cloth, ~1.8k tris) + armor/modules (one steel-textured mesh, ≤ 2.1k): 2 draw calls, ≤ 4k tris at full plate. `setArmor(level, modules)` rebuilds only the armor mesh; `setColor` tints the waist sash/tail/armband (tag 1). Held items: `character.hold.hand_r/hand_l` (grip at origin, blade +Y).
- Data: `shared/src/data/{armor,modules,colors}.ts` (5 tiers by armor level 0–1/2–3/4–5/6–7/8–10 → apron, da, da_dinh, giap_nua, giap_toan_than; 6 module defs with sockets; 6 player colors); client builders `armor-{kit,soft,plate}.ts`, `modules.ts`. Added sockets `shin_l/r` (greaves) to the LOOK list. New cheap box `render/geo/cbox.ts` (44 tris vs 108–300 for procgeo `rounded`) — use it for anything small. Textured parts use tile 0.3 m (`SkinBatch.build(mat, tile)`); the base textures are dark, so character vertex colors are near white.
- Animation: clips are data (`clips/{locomotion,movement,work,combat}.ts`, degrees, per-key ease or Catmull-Rom for cycles, `mirrorClip/cycle` helpers), compiled to typed arrays (`pose.ts`). `Animator.update(dt, AnimInput)`: base state (ground = idle ↔ 8-direction run blend by move direction in the body frame ↔ additive sprint lean; jump/fall/slide/dash/slam/cling crossfaded) + one action layer (`play(id, {hold, loop, fadeIn/Out, speed})`, `upper` clips only drive chest/head/arms so block/parry/hit-react work while running). `onLand(speed)` plays `land`. `drive.ts`: `animInputFromMove`, `bindCharacterEvents` (bus `move:land`). Death = collapse onto its back and hold; the physics-lite tumble is left to phase 10/17.
- Attack slots for phase 08: `clips/index.ts` `ATTACK_SLOTS` (`atk_<sword|hammer|polearm>_<light1|light2|light3|heavy_charge|heavy_release>`), fill with `registerClip()`; `animator.play(attackId(...))`. Tuning in `FEEL.anim` / `FEEL.thirdPerson`.
- Third person: `player/third-person.ts` `ThirdPersonCamera.apply(cam.camera, viewState, dt, world)` runs after `FirstPersonCamera.update` (keeps FOV kicks/roll/shake), over-the-shoulder, ray-pulled in front of walls, eased back out. FOV setting = the existing `cam.hfov`. Scenes: `character` (view=0 tier lineup, `view=1` modules, `clip=<id>` + `armor=0..10` `mods=a,b` `color=0..5`, `t` replays then freezes, `cam` override), `movement&tp=1[&armor=n][&arena=1]` = walk with the body and TP camera. Not wired into a settings UI yet (phase 14: "góc nhìn" toggle + FOV).
- Judge on a phone: run cycle speed/leg sliding at 9 m/s (no IK: feet float/slide a few cm), slide/dash silhouettes from the TP camera, and whether the player colors separate in the orange-lit arena. Armor-clip check was done visually from front/side/back in several poses (no automated penetration test).
- Phase 07: `shared/src/data/weapons.ts` (16 rows; `stats` spread from `BALANCE.weapons.family`, phôi = sword moveset with light 9 / heavy 20; `formFor(family, level)`, `passivesOf(def)` stacks the family's lower forms — rows list only their own passive) + `shared/src/passives.ts` (12 passives as pure hooks `modifyAttack/modifyParryWindow/onHit/onParry/onSlamLand/modifyForgeOdds`, folded by `applyAttack/parryWindow/hitEffects/slamEffects/forgeOdds`; numbers in `BALANCE.weapons.passive`). Decision: no `name` field in data (rule 4) — names are `STR.weapon[id]`, families `STR.family[f]`.
- Models: `client/src/weapons/models/<id>.ts` via `WeaponBuilder` (`wkit.ts`) → ONE mesh, ONE material (`forged` surface, atlas `tex/weapon.png` from `tools/weapon-atlas.mjs`: bright steel / forged scale / wood / leather quads, no mipmaps) = 1 draw call, 380–1190 tris. Contract: grip at origin, +Y, edge +Z, markers `tip`/`base` (+ `grip_l` on two-handers), `heatMask` (blade 1, fittings 0.25–0.6, wood/leather 0); `setHeat(root, h)`. `loadWeapon()` uses `public/models/weapons/<model>.glb` when it is a real glTF (`_HEATMASK` attr), else procedural.
- Scene `weapons`: rack grouped phôi|kiếm|búa|thương on a 0.5/1 m scale board, each turning ±0.5 rad about broadside; `?weapon=<id>&heat=&yaw=` diagonal close-up (polearms frame their top 1.3 m). Phase 08 should hold weapons on `character.hold.hand_r` and sweep `base→tip`.
- Judge on a phone: at 450p the rack is small (that's the scale check); heat ≥ 0.6 turns the blade a flat ramp color by the phase-01 shader (detail lost) — revisit in phase 10 if it reads as a cutout.

- Phase 08: melee rules are pure in `shared/src/combat/` — `frames.ts` (frame data + `attackShape` = base shape folded through passives), `fighter.ts` (state machine: idle/windup/active/recover/charge/parry/parry_recover/block/stagger/flinch/dead; emits swing/lunge/charge/parry/block/feint; `sweep` = {id,u0,u1} per tick), `damage.ts` (`resolveHit`: i-frames → parry (front ±100°) → block (front ±80°, −70%, 1 pip; guard break if < 1 pip or breaksBlock; pierce if ignoresBlock) → hit), `sweep.ts` (blade = data arc in the attacker's view frame, sub-stepped segment vs head/torso/legs capsules). All numbers in `BALANCE.combat`.
- Frame data (w/a/r s, light total = GDD combo time): kiếm light 0.11/0.09/0.18 (0.38), heavy thrust 0.10/0.12/0.34, lunge 1.3 m · búa light 0.22/0.12/0.28 (0.62), heavy overhead 0.15/0.12/0.45, stagger 0.6, breaks block · thương light 0.12/0.10/0.20 (0.42; thrust/sweep/thrust), heavy sweep 160° 0.13/0.16/0.36. Heavy charge 0.45–1.0 s. Decision: a light starts on press; still held at 0.10 s (tapS ≤ every windup) it turns into the charge, so taps have no latency. Buffer 0.22 s, combo gap 0.32 s, parry 0.16 s window / 0.34 s total, Đỡ during a charge = feint into parry. Dash attack = press ≤ 0.25 s after a dash: light 1, ×1.2, 2 m lunge.
- Client: `combat/{combatant,combat-world,resolver}` (order per tick: combatant.tick → body moves → world.tick; hits go through `HitResolver.claim(HitClaim{attacker,target,attackId,kind,combo,zone,dist,point,clientTime})` — phase 17 swaps LocalResolver for a network one), `local-fighter.ts` (Combatant + viewmodel + arms + aim assist + feel, reusable), `dummy.ts` (modes idle/block/parry/counter/move + dev `attack`), `fighter-anim.ts` (fighter → TP clips; `clips/attacks.ts` keyed to frame data). The FP strike keys are generated from the same arcs as the hit sweep (`vm/vm-clips.ts`), with a squeeze/lead cheat so the steel crosses the target when it hits. Hit-stop is visual only: the rules clock runs on, the viewmodel pays back the owed time at 2×. MoveState got `speedMul`/`pushT` (+ `pushMove`) for block slow, lunges and knockback; `Player(…, emit=false)` for non-local bodies.
- Scene `combat` (APK default now): corner of Arena 1, 5 dummies; Q cycles all 16 forms, R resets; `demo=light1|light2|light3|heavy|charge|dash|parry|riposte|block&t=` freezes (also `weapon=`, `dw=`, `modes=`, `tp=1`). `character&clip=atk_<sword|hammer|polearm>_<part>&weapon=<id>&t=` previews TP clips. Not done: molten damage (phase 17/18), dummy hit-react is clip-only (no ragdoll), TP two-handers have no left-hand IK. User should test on the phone: tap/hold feel, parry timing vs the `parry`/`counter` dummies, aim assist with touch, whether the forearms feel too big.

- Phase 09: forge rules are pure in `shared/src/forge/` — `odds.ts` (base row by level → heat band → ring timing → passive `modifyForgeOdds` → Tiếng tăm → Mối hàn; `oddsFor`, `rollOutcome`, `ForgeMods` = relic numbers as plain data so phase 18 adds no branches), `session.ts` (`ForgeSession`: 2 blades `{family, level, best}`, armor 0–10, heat, ring marker/zone, frenzy, break rule, +3 `pendingPick`, caps, `equip` modules into slots opened at armor +3/+7), `anvil-rule.ts` (place 0.6 s / lift 0.6 s / 5 s cooldown, `instant` for Đe nhẹ). Numbers in `BALANCE.forge`; 57 shared tests incl. 10k-roll distributions within ±2%. Decisions: Perfect = 15 pts Hỏng → Đạt 10 : Tuyệt 5 (GDD "2:1" read as Đạt:Tuyệt); heat/miss shifts come proportionally out of Tuyệt+Đạt+Giữ; frenzy auto-strikes use no timing shift and no cadence cooldown; after a Gãy the slot is a fresh phôi; the sweet zone re-rolls to a random place after every strike.
- Client: `forge/{anvil,stage,stance-cam,controller}.ts` + `ui/forge-hud{,-css}.ts`. `ForgeController.tick(dt, actions)` REPLACES `lf.tick`+`player.tick` (it hands the body no input while in stance); `frame()` runs after `cam.update`; `showViewmodel` says when to hide the viewmodel. Buttons: Rèn (`forge`) enters the stance at your anvil and strikes inside it; **hold Đánh (`attack`) = Nung** and Đỡ (`parry`) = Nhập thần when the meter is full, Đổi (`swap`) = blade↔armor in stance / weapon-slot swap outside it, `anvil` = place/lift. DECISION vs GDD ("Nung = the same button as Rèn"): tap-vs-hold on one button would delay every strike by the hold threshold, and a timing game can't afford that. Stick > 0.3 / Lướt / Nhảy / Trượt leave the stance (the press is swallowed). Getting hit (any non-blocked `combat:hit` on you, not during frenzy: `Combatant.invuln`) kicks you out and costs 0.2 heat.
- Solid anvil: `CollisionWorld.blockers` (vertical cylinders: anvil r 0.42 + brazier r 0.34) are pushed out in `resolve`/`overlaps` (not `probe`, so no wall-cling on them; you can stand on top); `blockers.test.ts`. The brazier stands at the anvil's left (`FEEL.forge.blade.brazierX`) with its own point light (`rig.add` per anvil — phase 17 will have up to 6; the PSX program still picks the nearest 4). Bus events for phase 10/12: `forge:anvil{place|placed|lift}`, `forge:stance`, `forge:strike{outcome,perfect,auto,heat,x,y,z}`, `forge:evolve`, `forge:frenzy`, `forge:heating` (+ `cam:trauma`/`cam:hitstop` from the strike).
- Scene `forge` (not the APK default): see the header of `dev/scene-forge.ts` for presets (`level fam heat armor mods target frenzy caps dummy stance placed pick ring zone hit`). Dev keys: F anvil, E Rèn, hold V = Đánh (no pointer lock needed), X = Đỡ, Q Đổi, 1/2/3 family pick. Not done / for later phases: family pick has no gamepad input; modules only equip via `session.equip` (the relic draft UI is phase 18; the body shows them via `Character.setArmor`); the training cap `session.caps` is wired but profile/bestLevel arrives in phase 15; the HUD uses fallback fonts until phase 13. User should test on the phone: strike-ring timing feel at 1.1 s/lap, whether Nung on Đánh is reachable with the thumb, the stance camera framing, hammer arm look, the 3 s pick.

- Phase 10: effects live in `client/src/fx/` — `sparks.ts` (the one 400-spark pool: velocity-stretched quads, ≥ 1 px wide at any res, gravity + 1 floor bounce, heat ramp cooling; kind 1 = embers, 2 = parry star), `puffs.ts` (dithered sprites: blood/steam/dust), `decals.ts` (ground splats + stepped rings), `shards.ts` (Gãy slabs, one dynamic mesh), `trail.ts` (base→tip ribbon sampled in the parent's space: world for bodies, the viewmodel eye for FP), `fx-world.ts` (pools + recipes, seeded), `fx-bind.ts` (bus → recipes, + `ringFx`), `fx-layer.ts` (what a scene adds: `new FxLayer({scene,rig,pipeline,world,combat?,stage?,ring?})`, `.trail(getModel, active, attach)`, `.update(dt, camera)` per frame, dt 0 during hit-stop). Every effect ≤ 2 draws / ≤ 60 live (unit-tested). All numbers in `FEEL.fx`; transparency is Bayer screen-door in the low-res pass (no blending anywhere).
- Hooks the next phases use: `ForgeStage.boost(heat, s)` / `hideBlade(s)` / `bladeSegment(a, b)` (presentation only); `Pipeline.setHeatTint(k)` (post: lean toward the heat ramp inside the fire ring); `FoundryView.ring` (cx, cz, radius). Fire ring = 4-frame procedural flame atlas on 2 staggered card rows (one draw); molten = 2 noise layers at different speeds/scales cut into heat steps (offsets wrapped on the CPU for mediump). Level-up strikes now use 60 ms hit-stop (`FEEL.forge.strike.levelStopMs`); evolution adds `cam:trauma` from the fx binding. Setting Máu = `fxSettings.blood` (`fx/fx-settings.ts`, saved; label `STR.gfx.blood`; UI in phase 14), `blood=0` URL override in scenes.
- Scene `fx`: `?fx=strike|levelup|evolve|break|hit|heavy|clash|parry|slam|trail|ring|molten` (fires through the real bus events every 1.8 s, buttons switch), `&t=` freezes mid-effect, `blood=0`, `view=stance`. `combat`, `forge` and `arena&ring=` now have effects. Note: `tools/shot.mjs` runs back-to-back sometimes hit the previous run's dying dev server (ERR_CONNECTION_REFUSED) — wait a few seconds between runs.
- User should test on the phone: spark density at 450p on a real strike rhythm, whether the FP trail sheet is too visible (`FEEL.fx.trail.alpha`), blood readability on dark armor, and frame time inside the fire ring.

- Phase 11: runtime = `client/src/audio/` — `getAudio()` → `play(id, {db,pitch,pos,take,area})` / `loop(id)` (returns a Handle: setDb/setRate/setCutoff/move/stop), `setListener(pos,yaw)`, `update(dt)` (occlusion probes at 4 Hz via `setOcclusionProbe(fn)` — the BVH ray is NOT wired yet, phase 12 passes `CollisionWorld` in), `duck()`, `setArea('hall_foundry'|'room_small')`, `setSettings({master,sfx,world,ui,output})` (saved; labels `STR.audio`, UI in phase 14). Graph: voice → bus → mix → [phone: HP 140 + 40–150 Hz exciter | headphones: bypass] → glue comp → limiter; two generated convolver reverbs; PannerNode equalpower (phone) / HRTF (headphones); catalog rows in `audio/catalog.ts` hold bus, mix key (`FEEL.audio.mix` = AUDIO §5), voice limit, reverb send and a procedural fallback (`vendor/sfx.js` rendered offline at boot into extra takes). A recording replaces its fallback automatically when `public/sfx/manifest.json` has the id. `audio/events.ts` (bus → sounds, haptics) is NOT written: that is phase 12.
- Pipeline: `tools/audio/fetch.mjs` pulls 9 CC0 OGA packs (all verified CC0 on their pages) → `audio-src/`; `design.py` renders `recipes.yaml` (layers: real source + `click`/`thump`/`swell`/`noise` synth, gain relative to each layer's own peak, per-take source rotation via `variants`, compress → bisected gain through a limiter → Vorbis+AAC, re-trimmed so the DECODED file holds −1 dB) → `client/public/sfx/<ev>_<n>.ogg/.m4a` + `manifest.json`; `check.py` = LUFS vs target, peak, lead silence, chime detector (stable narrow peak > 0.3 s), spectrogram sheet `audio-check/sheet.png`. Routing/mix/voices live ONLY in `catalog.ts`; recipes only describe the audio. 11 events recorded so far (strike_dat/hong, parry, hit_blocked, swing_sword/hammer, footstep_stone/slag, quench, steam_vent, heat_loop); the other ~45 audition rows are synth stand-ins or missing. Decisions: crest-heavy sounds (parry, blocked) aim 2 dB hot (`lufs` vs `expect`) because the encoder trim eats it; parry lands −17 not −14 (a 0.6 s clang can't reach −14 without crushing). The swishes pack is only 0.07–0.2 s long, so swings are pitched down and may feel short; kenney.nl returns 403 to automated clients (not worked around), so Kenney packs and freesound are not used — phase 12 should find more OGA CC0 (anvil rings, quench, impacts) or ask the user for packs.
- `?scene=audition`: every §3 event by category with a source dot (green recording / amber synth / brown missing), play · x4 (round-robin) · loop, context sequences (combat, forge, move, space = pan/distance, ui), occluded toggle, area (hall/room), duck, output phone/headphones, master volume. User should listen on the phone: phone-speaker bass (exciter), parry level vs swings, whether swings are too short, distance low-pass in `space`.
- Phase 12: every AUDIO §3 row is a designed recording (68 events, 152 takes, 4.1 MB, `check.py` ALL OK). 22 more CC0 OGA packs in `sources.json` (fetch.mjs now takes `urls`): metal/wood footsteps, punches, metal/wood hits, chains/winch, iron door, breaking, shield blocks, StarNinjas sword swings, Kenney Interface Sounds via its OGA mirror. Recipes split into `tools/audio/recipes/{core,move,melee,forge,world,ui}.yaml`; new layer opts `reverse`, `pick`, `start: [per take]`, synths `bed`/`crackle`/`bubbles`. Decision: `check.py` chime limit stays 0.3 s, but a recipe may declare `ring:` for a designed metal ring (strike_dat 0.42, strike_tuyet 0.45, ui_select 0.3 — AUDIO §3 asks for a 0.4 s anvil ring).
- Runtime: `audio/events.ts` maps every existing bus event (new: `move:step` from Player every 1.25 m with the ground's `foot` tag, `world:cages` from `openCages()`); own sounds 2D, others positional; haptics (`@capacitor/haptics` 8.0.2, setting `haptics` = STR.audio.haptics) light on strike/hit landed, medium on hit taken/parry/slam, heavy on evolve/death; own death muffles the mix (lowpass sweep). `SceneAudio` (listener, BVH occlusion ray, ambience) is wired into movement/combat/forge/arena scenes (not when `t=` is frozen). Foundry ambience = bed + molten emitter at the nearest channel point + fire-ring wall emitter + `fire_inside` when outside the ring + distant one-shots every 4–12 s. `amb_yard`/`menu_smithy` defs exist in `audio/places.ts` for phases 13/15; match-flow sounds (cage_tick, truce_horn, round_*) wait for phase 18 events. Tuning: `FEEL.audio.react/amb/muffle`.
- Listen on the phone (APK opens `movement`): walk on stone/grate/planks/slag (course), slide, slam from the crane tower; `?scene=combat` for swings→hits→parry→kill (gap before the kill boom); `?scene=forge` for Đạt/Tuyệt/Giữ/Hỏng, Gãy, quench, frenzy; `?scene=audition` → output phone vs headphones. Write what's too loud/thin/long in `docs/AUDIO_NOTES.md`; the next audio pass reads it.
- Phase 13: UI kit = `ui/kit/{dom,controls,panels}.ts` + `ui/styles/{fonts,tokens,components,menu}.css` (fonts self-hosted in `public/fonts`, latin+vietnamese subsets verified incl. Ấ Ữ Ỗ Ệ; Big Shoulders 800/900, Be Vietnam Pro 500/600). Components: stampedButton, tagStrip, ledger rows, notchedSlider, segmented, shutter, toast; chamfer = clip-path plate (outline is the element bg, fill is ::before). UI sounds go through bus `ui:sound` / `ui:strike` / `ui:wipe` (audio/events.ts, fx-bind). `app/director.ts` now owns the running scene (`ctx.app.go(scene, 'quench'|'stamp', params, origin)`); `app/screens.ts` = screen machine; the app (and the APK) starts at `ui-menu` (title → menu). Luyện tập → stamp cut → `combat` until phase 15; Chơi mạng / Kho vũ khí toast "Chưa mở"; back from a scene returns to the menu until phase 14's pause menu.
- `ui/transition.ts`: one low-res WebGL1 overlay (`transition-gl.ts`): quench wipe, stamp cut (snapshot via `afterRender` in the main loop, crack near center leaning to the tap), dithered 0.2 s fade when Giảm chuyển động is on (`ui/ui-settings.ts`), `roundEnd(pipeline, swap)` (`core/clock.ts` timeScale + desaturate keeping heat colors/oxide) and `death(pipeline, k, secs)` (post `uEdge` stepped darkening + stamped numeral). Phase 18 calls roundEnd/death; tuning in `FEEL.ui`.
- Decision: the menu blow is a helve (trip) hammer on a post beside the anvil (`render/models/helve.ts`, `world/smithy.ts`) instead of a floating hand hammer: diegetic, readable in profile. Settings is a first cut (Hình ảnh: Máu, Giảm chuyển động; Âm thanh: volume, output, haptics); phase 14 adds the other tabs/rows into the same `m-set` ledger.
- Test on the phone: title tap → hammer blow + sparks + sound; menu taps; Cài đặt quench wipe in/out; Luyện tập stamp cut into combat; Android back returns to the menu; check the fonts/diacritics and that nothing sits under the notch.
- Phase 14: settings = 5 tabs (`ui/menu/settings-rows.ts`; every row live + saved): Hình ảnh (độ phân giải, nén màu, rung đỉnh, FPS cap, Máu, hiện FPS, giảm chuyển động), Âm thanh (4 volumes, output, haptics), Điều khiển (layout editor entry via a throw-away TouchControls, stick, stick size, deadzone, sens X/Y, invert, gyro, aim assist, tap/hold parry), Góc nhìn (FOV, 1st/3rd person, bob, shake), Hồ sơ (name, color, clear data). Stores: `core/game-settings.ts` (gfx+view; `game` is read live by `FirstPersonCamera`, `onGameSettings` applies pipeline in main), `core/profile.ts` (GDD §9 profile: name/color/unlocked/bestLevel/stats; phase 15 reads it).
- Armory (`ui/menu/armory-screen.ts`, `world/turntable.ts`): 3 rails, forms placed by minLevel, locked = dark tile + black silhouette on the anvil turntable, passive line from `STR.armory.passive`. Menu "Kho vũ khí" now opens it (view shifts right in armory). HUD (`ui/hud/{hud,overlays,silhouettes}.ts`, `hud.css`): HP segments, stamina chevrons, lives pips, +N level with family silhouette (under swap/pause, top-right), timer + ring countdown, kill feed, `Scoreboard`, `PauseMenu`. Nothing feeds the HUD in combat/movement yet: phase 15/18 must call `hud.set(...)` / `hud.kill(...)` (see `dev/scene-hud.ts`).
- Pause: `app/pause.ts` `GamePause` (Director-owned) opens on `app:back` in PLAY_SCENES (movement, combat, forge, hud); the touch/KB pause button now emits `app:back` from `InputRig.poll`; loop freezes via `app:pause`. Cài đặt inside pause reuses the settings ledger. Third person (`game.thirdPerson`) is honored by `combat` only (`tp=` overrides). Hidden-by-default FPS badge `ui/fps-badge.ts`.
- Test on the phone: pause button → Tiếp tục/Cài đặt/Về menu; Cài đặt → Điều khiển → Mở (layout editor) and back; Hiện FPS + Giới hạn FPS; Góc nhìn FOV/shake in `combat`; menu → Kho vũ khí tap each tile. Harness note: `tools/shot.mjs` sometimes loses its dev server mid-run (ERR_CONNECTION_REFUSED); start `npm run dev` first.
- Phase 15: `?scene=training` (menu Luyện tập → stamp cut → it; pause works there). Foundry NW corner: 3 dummies, your anvil with caps = `profile.bestLevel` (the phase-09 refused strike applies), weapon rack of `rackOffers(profile)`, armor stand, lever board (Đứng yên/Đỡ đòn/Phản đòn/Di chuyển), chalkboard (last hit + 5 s DPS) — all painted canvas signs (`training/{boards,yard}.ts`), rules in `shared/src/training.ts` (+test). Rèn (E / touch Rèn button) near a station cycles it; at the anvil it forges as before. HUD is live there (`hud.set` each frame, no timer/lives).
- Decisions: the movement course is Arena 1's own wall-jump shafts + crane tower (no separate geometry); the armor stand cycles tiers 0–10 freely, modules wait for phase 18's draft (profile has no drafted list yet); profile stays localStorage only (Android WebView persists it, Capacitor Preferences not needed); the 'attack' dummy mode is not on the lever (Phản đòn covers it). Menu "Kho vũ khí" unchanged.
- Test on the phone: Luyện tập → walk to the board row north of the dummies, tap Rèn at rack/armor/lever; hit dummies and read the chalkboard; place the anvil (Đe) and strike past +3 — it must refuse; the APK already opens to the menu.
- Phase 16 (PARTIAL): `shared/src/net/{protocol,codec,clock}.ts` (+test): JSON lobby msgs, binary 33-byte State / Snapshot, ClockSync (5 lowest-RTT median), `BALANCE.net`. `server/src/{worker,room,lobby}.ts` + `wrangler.jsonc`: POST /room -> code, /room/CODE/ws, /exists; Room DO (SQLite class, hibernating lobby, 30 s reconnect token, host handoff, 5 min empty alarm, 20 Hz snapshot relay once a match starts); `Lobby` is pure and unit-tested. Verified locally with `wrangler dev` + `tools/netbot.mjs` (3 bots, match start, snapshots, ping ~2 ms).
- Client: `net/{config,client}.ts` (RoomClient, `room.current` shared with the match), `ui/menu/lobby-screen.ts` + `lobby.css` (menu -> Chơi mạng: Tạo phòng / code field / roster / Sẵn sàng / host truce 0-30-60 / Bắt đầu; scene `ui-menu&screen=online&code=XXXX&server=URL`). `start` message is received but no match scene yet (phase 17/18). `.github/workflows/deploy.yml` skips deploy until the token secret exists. Dev: `npm run dev:server` + `?server=http://127.0.0.1:8787`.
- Phase 16 done: deployed at https://while-its-hot.nguyenlehaidang2k10.workers.dev (DEPLOY_URL set); 3 netbots + match start + snapshots verified on production (ping ~160 ms from the sandbox). Test: open the APK -> Chơi mạng -> Tạo phòng, join from a second phone.
- Phase 17: `shared/src/match/` = the pure server MatchAuthority (+test): hit claims (swing must be announced by `atk`, land in its active frames −60/+160 ms, ≤ reach + 2 m, fresh < 1 s, one hit per target per swing, rate ≥ 0.6 × previous swing), parry = press within window ± min(80 ms, rtt/2), dash i-frames at hit time or the attacker's render time, frenzy-at-anvil and truce immunity, damage/knock/passive effects, kill (−2 levels) and 4 s respawn at the safest SAFE_RESPAWN point, server-rolled forging (strike ok if cooldown ≤ 0.15 s), anvils, blanks (pedestal players+1, +2 on racks every 40 s; taking one = second blade, `ForgeSession.carried`). `server/src/room.ts` runs it at 20 Hz; snapshots carry the server's weapon/level/armor/hp. Messages in `shared/src/net/match-msgs.ts`; State grew stamina/armor/hp bytes and dashing/swing-parity/dead flags.
- Client: `?scene=net` (lobby Bắt đầu → stamp → it; or `code=ABCD` joins a real room; else an in-process `net/loopback.ts` room with `bots=2` NetBots, `near=1`, `passive=1`). Remotes = interpolation buffer (delay 2×jitter+50 clamped 80–200 ms, extrapolate ≤ 100 ms then hold) + mirrored Fighter (`mirrorFighter`) + TP character; our hits are predicted then confirmed (`net/net-combat.ts`); forging online raises the hammer at the press and lets it fall when the roll arrives (`stage.raise/lower`, `net/net-forge.ts`). Event times use the sim-tick clock (`NetMatch.simMs`), not wall time: catch-up ticks after a frame hitch kept failing the rate limit. Dev overlay `net/net-debug.ts` (dev builds or `netdebug=1`), bad network `lag=150&jitter=20&loss=0.05`.
- Verified: wrangler dev + 2 browsers (`code=`, lag 150±10) + 2 netbots (`node tools/netbot.mjs --code X --n 2 --match --wait 4 --truce 0 --lag 150`): browsers 27/21 hits accepted, 3/1 rejected (target already dead in flight), bots 0 rejected, forging mid-fight; lobby → match handoff (queued `match` msg) works. Not done here (phase 18/19): rounds/lives/score/cages, pause still freezes our sim online, no molten damage, remote smiths have no hammering clip (sparks only).
- Test on phones (after merging to main so deploy.yml ships the new Worker): two phones → Chơi mạng → same room → Bắt đầu; fight (parry a swing, block, dash through one), place the anvil (Đe) and forge while the other attacks, grab a blank from the pedestal (Rèn near it), die and respawn. Tell me if hits feel late or parries unfair.
- Phase 18: server `shared/src/match/flow.ts` `RoundFlow` (+`rules.ts`, `data/relics.ts` 14 relics folded by `foldRelics`, `BALANCE.match` cage/ring/draft numbers): cage 10 s (draft: 1 of 3, last place = rare pool + early armor modules, rerolls for non-winners) → fight (truce, ring 60→170 s with burn + 3× heat loss, 3 lives, 180 s) → 5 s result → … first to 3 round wins → `end` (rows, best level per family, relics). Kill = 1 pt + 1 per victim stack; winner stacks Tiếng tăm (2 if lead ≥ 3). Cage/result/end = everyone immune, client State ignored in the cage. Room returns to the lobby phase the moment the match ends (the end screen stays up; "Về sảnh" → menu online screen with the code). `MatchAuthority(…, skipCage)` starts in the fight (tests, `?scene=net&cage=0`).
- Client: `net/net-flow.ts` (HUD lives/timers, doors, ring size, pins the player in the cage, draft, result beat = `roundEnd` + scoreboard, end screen + profile unlocks via `shared/unlocks.ts`, profile.drafted), `ui/hud/{draft,match-end}.ts` + `styles/match.css`, strings `STR.match` / `STR.relic`. Previews: `?scene=net&cage=0&preview=result|end`. Default `?scene=net` now starts with the cage + draft (older shot presets need `cage=0`).
- Tests: `bots.test.ts` plays a whole 3-bot match in virtual time (5 rounds → end); `flow.test.ts` covers rules, flow, bounty, relic folds. Known gaps: armor modules from the draft are stored/synced (own list, profile.drafted) but their combat effects stay display-only; eliminated players just stay down (no spectate cam); the round-end slow-mo scales the local sim clock only.
- User should test on phones: 2+ phones, Chơi mạng → Bắt đầu → draft 3 cards (tap), doors slam open, truce timer, ring appears at 1:00, die 3 times (stay down), round banner + scoreboard, play to 3 wins → end screen + unlocked forms → Về sảnh.
- Phase 19: harnesses `tools/sweep.mjs` (every scene x 6 devices: __stats, console errors, DOM fit check = text/buttons outside the viewport outside scroll containers, clipped text, overlapping buttons; writes shots/sweep.json), `tools/leak.mjs` (cycles scenes through `__app.load`, GC, prints geos/textures/programs/heap/DOM; fails on growth), `tools/aobake.mjs`. Sweep result after fixes: 30 scene presets x 6 devices = 180 runs, 0 errors, 0 fit flags (only fix needed: Kho vũ khí tiles overlapped 11 px at 640x360, tile width is now clamp(33px, 9.2vmin, 58px)).
- Measured (SwiftShader, so GPU time is not meaningful; calls/tris are): worst scene `net` with 4 players = 86-98 calls, 76-83k tris, 6-9 programs, ≤ 13 textures (budget 120 / 150k / 12 materials); arena 76 calls / 69k tris; menu 18 calls / 17k tris; JS frame cost (`__stats.frameMs`) 1-3 ms. Heap stable at ~39 MB over a 2 min bot match, geos plateau ~100-128.
- Fixed leaks (scene A -> B -> A grew +18 geos / +6 textures per cycle): detached subtrees were never disposed (held/replaced weapons, pickups, remote characters, viewmodel + FP arms (own overlay scene), forge stage blade, armory turntable, molten noise texture + material). New `render/dispose.ts` `disposeTree(root)` = geometry-only (materials/textures are shared). Rule for new code: when you replace or drop a model, `disposeTree` it. leak.mjs 4 cycles over 8 scenes is flat (geos 18, tex 12, prog 2).
- Loading: the vertex-AO bake was 80% of scene load (arena 2.4 s, menu 1.3 s on a desktop CPU, several times that on a phone). It is now pre-baked: `node tools/aobake.mjs` writes `client/public/ao/{foundry,smithy}.bin` (u8/vertex + geometry fingerprint); `bakeAO(..., { key })` + `preloadAO(key)` (`render/geo/ao-cache.ts`) load it and fall back to computing (dev console warns "stale") if the geometry changed. RE-RUN aobake.mjs AFTER ANY CHANGE to static foundry/smithy geometry (the committed files are what ships in the APK). Arena load 2.4 s -> 0.27 s, menu 1.3 s -> 0.1 s. Cold start of the production build to first menu frame: 0.46 s, or 1.3 s with the CPU throttled 4x.
- Hitches: `Pipeline.render` now warms each scene once (shows hidden objects, `renderer.compile`, hides them again): the fx pools (sparks/puffs/shards/decals), fire ring and trails used to compile their shaders on the first hit of a match. Adaptive quality fixes: a >250 ms frame (scene load, tab switch) no longer counts as slow (it used to drop resolution right after every load), and the FPS cap's frame time is the baseline (a 30 fps cap used to read as slow and stepped down to 360p). Test on the phone: APK cold start to the menu, first scene load (Luyện tập), first hit in `combat` should not stutter, 5 min in a `net` match for heat/fps (Hiện FPS in Cài đặt).
- Phase 20: `tools/forge-sim.mjs` plays `ForgeSession` with a scripted smith (heats to 0.5–0.62, strikes with sweet-zone accuracy p, uses frenzy; `--nofrenzy`, `--blade|--armor`, `--n`). The old table made +18 reachable in ~25 s even at 35% accuracy (frenzy alone was worth ~+5 levels). New `BALANCE.forge.rows` 12/55/18/15 · 6/38/20/36 · 4/25/22/49 · 2/16/22/60, frenzy full 12 and 3.5 s (GDD updated; forge tests re-derived). Result, blade, current level p10/p50/p90 at 60 s: 35% → 8/11/15, 60% → 10/13/17, 85% → 12/15/19; Gãy ≈ 0.44/0.19/0.07 per 120 s; armor medians 7/8/8 (10 needs luck). Without frenzy: medians 9/13/16 at 60 s.
- `docs/PLAYTEST.md` (Vietnamese) is the first-session script and note template; notes go to `docs/PLAYTEST_NOTES.md` (create on first use). Round-outcome balance was not simulated beyond the existing bot match test (`match/bots.test.ts` ends a 3-bot match); combat numbers (damage, armor, ring) are unchanged and need real hands. APK release `latest` rebuilds on push to `main` — merge this branch to ship it.
- Phase 21: dash is gone everywhere (motor/state/input/touch/gamepad/KB, camera kick, audio `dash` sound + recipe, net msg + FLAG bit, i-frame dodge check). The old dash attack is now the **slide attack** (`AttackKind 'slide'`, `BALANCE.combat.slideAtk`, `sinceSlide`, clip slot `atk_<fam>_slide`, passive `slide_lunge_plus` for dai_dao); phan_luc / binh_no GDD text updated (module effects are still display-only). Slide: `BALANCE.move.slide` {speed 14 → run speed 9 over maxS 0.8, cooldown 0.35}; a timed-out slide needs the button released before the next (decision: rules live in balance.ts, not feel.ts, so the server can check them). Movement course gap is now 7.5 m (slide-jump only); `reach.test.ts` re-derived.
- Cage doors are solid: `Blocker` got slab form (`hx/hz`), `CageDoors` registers one per cage and switches it off at t>=0.4 of the open animation; test in `foundry.test.ts`. No other visual-only blockers found (ring/molten/fx are intentionally non-solid).
- `ui/modal.ts` `setModal(key,on)`: draft, +3 pick and match-end set it; `.modal-open .tc` hides the touch layer and `TouchControls` drops held fingers. Draft cards are 120 px tall.
- Match settings: `RoomSettings` = truce, rounds, roundS, lives, ring (0/1/2), maxPlayers (`BALANCE.net.choices/defaults/ringTime`, `sanitizeSettings`); `RoundFlow`/`MatchAuthority` take rules (number = truce only, for tests), the `match` init msg carries `rules`, client `NetFlow.rules`. Lobby room screen = roster (swatch, host/ready tags, ping) + n/max + 6-cell settings grid (host taps to cycle, others read-only) + join/leave sound; preview `?scene=ui-menu&screen=online&code=DEMO&host=0|1`.
- Transitions: scene load is sliced (`core/slice.ts` `yieldTask`, foundry builds one builder per slice), `Pipeline.warm` uses `compileAsync` (world is not drawn and `__ready` waits while `pipeline.warming`), and `Director.go` keeps the cover shut until 2 consecutive frames <= 34 ms (`settleFrames`). Feel on the phone is the real test.
- User should test on phone: slide (ends by itself at 0.8 s), walking into a closed cage, tapping the draft cards with the stick under your thumb, host changing the six settings, then a start of Luyện tập and Chơi mạng for wipe smoothness.
- Phase 22: touch controls are one machined-steel set (`input/touch-css.ts`: bone outline + hard inset bevel rings, no gradients; pressed = sunk + --iron-hot >= 80 ms; contextual Rèn/Đặt đe fade/scale in place) with redrawn pictograms on one 24-grid/2 px stroke (`pictograms.ts`, + scoreboard ledger, notched stick base, capped knob). Rims (`touch-rims.ts`, bus-only): Trượt shows slide time left then cooldown, Đánh fills during a heavy charge and turns hot when ready, Đỡ shows parry recovery. New touch control `scoreboard` (hold = `NetFlow.peek`).
- Pointer ownership moved to pure `input/touch-router.ts` (any pointer count, per-button hold count, stick owned by one pointer, everything else looks, button finger slides into look) with `touch-router.test.ts` (4 simultaneous pointers). Factory presets `two/three/four` live in `input/touch-presets.ts` (claw: Nhảy+Trượt top-left, Đánh+Đỡ top-right; 3 ngón: Đánh top-left); tests check no overlap for every preset and its mirror at 16:9..21:9 and 4:3.
- Layout store v2 (`wih.touch.layout.v2`, v1 slots migrate as 2 ngón): 3 custom slots, each remembers its base preset; editor = slots + Mẫu 2/3/4 ngón (loads into the active slot) + Lưới, Đảo tay (mirror), Đặt lại hết, per-control Cỡ/Độ mờ/Đặt lại nút; panel auto-docks top/bottom/middle where it covers least and goes see-through while dragging. `?preset=two|three|four` previews a preset unsaved in any touch scene.
- Test on phone: 4 ngón with both index fingers on the top corners while moving and looking; hold Đánh for a heavy (rim fills, turns orange); slide and watch the Trượt rim; hold the scoreboard button in Chơi mạng.
- Phase 23: `?scene=icon` (`dev/scene-icon.ts`; params weapon/heat/fov/cam) = anvil + hot kiem_tho + hammer mid-strike + sparks, one warm key, black around; shot.mjs got an `icon` device (1024², `res=native` added per device via `q`). Capture is committed as `tools/icon-src.png`; `node tools/icon-gen.mjs` (sharp) writes adaptive foreground (soot keyed to alpha), monochrome, legacy square/round mipmaps, `#050302` background color and every splash.png (art at 62 % on soot black) into `android/`. Re-run both after changing the scene.
- Test on phone after CI: new launcher icon (also themed icon on Android 13+) and the splash before the first frame.
