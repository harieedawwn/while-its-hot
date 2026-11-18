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

### Phase 05 — Arena 1: Xưởng Đúc · `TODO` · Sonnet 5.5 · high
Read: GDD §3 (ring, cages, racks), §11. LOOK §1 (color per area), §2, §7 (molten, fire ring visuals only).
- Modular kit built with procgeo (walls, pillars, girders, catwalks, stairs, railings, grates, tanks, crane,
  furnace mouth, cages with doors, pedestal, racks), merged per material, baked vertex AO.
- Layout per GDD §11 as data (`world/arenas/foundry.ts`): spawn points, rack points, ring centers,
  safe respawn points, surface tags per collider (for footsteps).
- Molten channels (scrolling emissive), furnace light, cage doors animate open, fire ring placeholder.
- `arena` scene with 4 preset cams. Movement scene can load the arena.
Shots: `arena` 4 cams. Done when the arena reads clearly at 360p, landmarks are distinct, budget holds.

### Phase 06 — Character, armor sockets, animation, third person · `TODO` · Opus 5.5 · high
Read: LOOK §4. GDD §7 (armor tiers, modules list).
- Rigid segmented blacksmith with forge mask (no face), color band, sockets.
- Armor tier sets 0–4 (apron → full plate) and the 6 module attachments as socket meshes.
- Animator: clip data format, blending (crossfade + 8-dir locomotion), all clips in LOOK §4 except the
  per-family attack sets (phase 08 adds them; make the slots).
- Third-person camera option (over-shoulder, collision-aware), FOV setting.
- `character` scene: lineup of 5 armor tiers + module showcase + an animation player (`?clip=run`).
Shots: `character` (lineup, run frozen mid-stride, slide). Done when armor swaps never clip the body.

### Phase 07 — Weapons: data and 16 models · `TODO` · Sonnet 5.5 · high
Read: GDD §5 (families), §6 (roster, data shape). LOOK §2, §3.
- `shared/src/data/weapons.ts` (16 rows), `shared/src/passives.ts` (hook registry; implement the hooks
  needed by the roster, stubs where gameplay doesn't exist yet), unit tests for data integrity
  (unique ids, sorted minLevels, every model exists).
- 16 procedural models following the contract (grip at origin, `tip`/`base`, `heatMask`), GLB override path.
- `weapons` scene: rack grouped by family with scale grid; `?weapon=<id>&heat=0.7` close-up.
Shots: `weapons` (rack + 3 close-ups). Done when each family reads as a lineage and +18 forms look masterwork.

### Phase 08 — Melee combat core and the dummy · `TODO` · Opus 5.5 · high
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

### Phase 09 — Forging system · `TODO` · Sonnet 5.5 · high
Read: GDD §6, §7, §9 (cap rule). LOOK §8 (forge HUD only).
- `shared/forge.ts`: outcome roll with all shifts (heat, timing, level row, notoriety, relic/passive hooks),
  frenzy, break rule, highest-level memory, armor variant. Exhaustive unit tests incl. distributions
  (10k rolls within ±2% of the table).
- Anvil entity (place/pickup/cooldown/solid), forge stance camera blend, heat hold, strike ring UI,
  family pick at +3, form swap on milestones, armor target toggle, module slots, 2 weapon slots + swap.
- `forge` scene: anvil + blade; `?level=9&heat=0.6` presets.
Shots: `forge` (stance view, strike ring, family pick). Done when the loop is playable end to end offline.

### Phase 10 — VFX pass · `TODO` · Opus 5.5 · high
Read: LOOK §5, §7. CLAUDE.md rule on events.
- Spark system (instanced, physical, heat ramp cooling), blade heat glow, level-up, form evolution (quench),
  break shards, trails, hit puffs/decals, parry star, slam ring, fire ring wall + embers, molten polish.
- All driven by bus events; budgets per LOOK §7. Setting "Máu".
- `fx` scene: buttons/URL to trigger each effect; `?fx=evolve&t=0.2` freezes mid-effect.
Shots: `fx` (evolve mid, sparks mid, break mid, parry). Done when effects are few, physical, and in budget.

### Phase 11 — Audio A: engine, sources, pipeline · `TODO` · Sonnet 5.5 · high
Read: AUDIO §1, §2.
- Runtime engine (buses, compressor/limiter, generated IR reverbs, 3D panner + distance/occlusion filter,
  voice limits, round-robin, output mode phone/headphones), unlock, settings volumes.
- `tools/audio/fetch.mjs` + `sources.json`: download the CC0 packs/files (AUDIO §2). Ask the user for a
  freesound API key only if needed. CREDITS.md.
- `tools/audio/design.py` + `recipes.yaml` skeleton + `check.py` (pip install numpy scipy soundfile pedalboard).
- `audition` scene listing every event in AUDIO §3 (missing ones marked).
Done when the engine plays sourced test sounds in the audition scene and check.py runs.

### Phase 12 — Audio B: design and mix every sound · `TODO` · Opus 5.5 · high
Read: AUDIO (all), `docs/AUDIO_NOTES.md` if it exists.
- Write recipes for every row in AUDIO §3 (layers, EQ, saturation, weight layer, takes), render, check,
  iterate with the spectrogram sheet. Wire `audio/events.ts` for every gameplay event that exists.
  Ambience beds + positional emitters in the arena, footsteps by surface tag, haptics map.
- Mix snapshot from AUDIO §5. Ducking. Phone speaker mode.
Done when every row exists, check.py passes, and the log tells the user exactly what to listen to on the phone.

### Phase 13 — UI A: design system, main menu, transitions · `TODO` · Opus 5.5 · high
Read: LOOK §8, §9, §10. If skills `frontend-design` or `web-ui-multidevice` are available, load them.
- Fonts self-hosted (Big Shoulders Display, Be Vietnam Pro; latin + vietnamese subsets; verify the
  vietnamese subset exists), tokens.css, components (stamped button, tag strip, ledger row, notched slider,
  segmented toggle, panel shutter, toast).
- Title + diegetic main menu scene (smithy, anvil, hammer-strike selection), screen state machine.
- `ui/transition.ts`: quench wipe, stamp cut, round-end and death hooks, reduce-motion fallback.
Shots: `ui-menu`, `transition&t=0.15`. Done when the menu looks designed (not a template) on 16:9 and 21:9
and diacritics never clip.

### Phase 14 — UI B: settings, armory, HUD, pause · `TODO` · Sonnet 5.5 · high
Read: LOOK §8, §10. TECH §5 (settings list). GDD §9.
- Settings ledger with all settings (graphics, audio, controls incl. layout editor entry, view, profile:
  name + color), live apply, persistence.
- Armory (three lineage rails, locked silhouettes, turntable), HUD (everything in LOOK §8, nothing more),
  pause menu, scoreboard overlay.
Shots: `ui-settings`, `ui-armory`, `hud` on all devices. Done when no overlap/clip on any device.

### Phase 15 — Training yard and profile · `TODO` · Sonnet 5.5 · medium
Read: GDD §9, §10.
- Profile storage (localStorage + Capacitor Preferences), unlock rules, cap at bestLevel with the refused
  strike, weapon rack + armor stand of unlocked items, dummy mode switch (diegetic lever/board), movement
  course, chalkboard damage/DPS, works fully offline. Menu → Luyện tập → yard with the stamp cut.
- APK now opens to the title/menu.
Shots: `training` (2 cams). Done when the yard is complete offline in the APK.

### Phase 16 — Server: rooms, protocol, clock, deploy · `TODO` · Sonnet 5.5 · high
Read: TECH §1, §4 (rooms, protocol, clock), §7 (deploy).
- Worker routes + Room DO (SQLite-backed class, `locationHint: "apac"`), create/join by code, host
  handling, reconnect tokens, lobby hibernation, match tick, empty-room alarm.
- `shared/net/protocol.ts` + binary codec with round-trip tests. Client `net/client.ts`, clock sync, ping.
- Lobby UI (Tạo phòng / Vào phòng / code entry / ready list / host settings). `tools/netbot.mjs`.
- `deploy.yml` + ask the user for the Cloudflare token (once), deploy, test bots against production.
Done when 3 netbots + 1 client sit in a lobby on the deployed Worker with stable ping.

### Phase 17 — Netplay: players, hits, authority · `TODO` · Opus 5.5 · high
Read: TECH §4 (all). GDD §3 (lives/respawn), §5.
- Remote players with interpolation buffer, animation replication, weapon/armor visuals from state.
- Hit claims + server validation + parry/block resolution, damage/kill events, i-frames, respawn.
- Server-authoritative forge rolls with hidden latency, pickups, anvils as replicated entities.
- Net debug overlay (dev only): ping, jitter, buffer, rejected claims. Simulated latency/loss flags.
Done when 2 browser clients + 2 netbots fight and forge with 150 ms simulated latency and it still feels fair;
log the tuning.

### Phase 18 — Match flow · `TODO` · Sonnet 5.5 · high
Read: GDD §3, §8.
- Cages + countdown, doors, blank spawns, truce, fire ring (server-driven), lives, round end rules,
  scoring incl. bounty, slow-mo end + scoreboard, relic draft UI and rules, notoriety, match end screen,
  unlock writes to profile, return to lobby.
Done when a full match (first to 3) runs with bots and the end screen shows unlocks.

### Phase 19 — Performance, device fit, bug sweep · `TODO` · Sonnet 5.5 · high
Read: TECH §6, §8. LOOK §1.8.
- Measure with `__stats`, fix budget overruns, adaptive quality, memory leaks between rounds, loading time.
- shot.mjs on all devices for every scene; fix every overlap/clip/cut. APK cold-start check.
Done when every scene passes on all devices and the log lists measured numbers.

### Phase 20 — Balance and playtest kit · `TODO` · Sonnet 5.5 · medium
Read: GDD (all). `docs/PLAYTEST_NOTES.md` if it exists.
- Simulation script for forge EV per level band and expected round outcomes; adjust `balance.ts`.
- Write `docs/PLAYTEST.md` (Vietnamese, short): what to try in the first session with friends and how to
  report feedback in `docs/PLAYTEST_NOTES.md`.
Done when the sim results are in the log and the APK release is current.

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
