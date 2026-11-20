# Finished phases 00-23 (archive; read only if a phase points here)

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

