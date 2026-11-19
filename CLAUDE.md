# WHILE IT'S HOT — project rules (read every session)

First-person multiplayer forge-and-fight arena for a small friend group. Mobile (Android APK) first.
Vietnamese UI. Low-res, vertex-lit, crunchy 3D in the spirit of ULTRAKILL's *world rendering* (not its UI).

## Where things are
- `TASK.md` — the phase list. Work on exactly ONE phase per session (see the loop prompt).
- `docs/GDD.md` — game design, rules, numbers. `docs/LOOK.md` — art, camera, VFX, UI, copy.
- `docs/AUDIO.md` — sound direction and pipeline. `docs/TECH.md` — architecture, netcode, build, APK.
- Read only the doc sections a phase lists. Do not read whole docs "just in case".
- `kit/` — vendored helpers (procedural geometry, sound engine + checkers). Moved into packages in phase 00.

## Commands (fill in as they become real)
- `npm run dev` — client dev server (Vite) · `npm run build` · `npm run typecheck` · `npm test`
- `node tools/shot.mjs <scene> [--devices phones|all] [--q "k=v&k=v"]` — screenshots for self-check
- `node tools/texbake.mjs [name…] [--sheet] [--try id,id]` — rebake world textures into `client/public/tex/`
- `node tools/weapon-atlas.mjs [--sheet]` — rebuild the weapon texture atlas `client/public/tex/weapon.png`
- `npm run dev:server` — local Worker + Durable Object (wrangler dev)

## Hard rules
1. Mobile first. Target: mid-range Android 2021+, 60 fps, landscape only. Desktop only needs to work for dev.
2. No neon, no glow/bloom, no gradients on UI, no glassmorphism, no emoji, no chiptune or chime sounds.
3. No explanatory text sprinkled in the game. A label only where a player truly needs it. No tooltips everywhere.
4. Vietnamese strings live ONLY in `client/src/ui/strings.vi.ts`. Never hard-code player-facing text elsewhere.
5. Tuning numbers live ONLY in `shared/src/balance.ts` (rules) and `client/src/core/feel.ts` (camera/feel).
6. Game data (weapons, relics, armor modules) lives ONLY in `shared/src/data/*`. Adding an item = one entry
   (+ one model file). Never switch-case on item ids in gameplay code; use data fields and passive hooks.
7. Files ≤ 300 lines, one responsibility each. Prefer a new small file over growing a big one.
8. Every visual feature must be reachable as a dev scene: `?scene=<name>` (registry: `client/src/dev/scenes.ts`).
   Scenes set `window.__ready = true` when the frame is final, so `tools/shot.mjs` can capture them.
9. Determinism for checks: scenes accept `seed`, `t` (freeze time), `cam` (x,y,z,yaw,pitch).
10. Shared logic (forge outcome, damage, protocol) is pure TS in `shared/` and is unit-tested (vitest).
11. Never commit secrets (keystore, API tokens). They go in GitHub Actions secrets.
12. Do not install a dependency for something that takes < 60 lines to write. Pin versions.

## Code map (update this when you add/move modules — keep it to one line each)
- `client/src/main.ts` boot, renderer, fixed-step loop, `__ready/__stats` · `app/gate.ts` rotation gate
- `client/src/core/{events,feel}.ts` typed bus, feel tuning · `shared/src/balance.ts` rules tuning
- `client/src/dev/{params,scenes,scene-empty}.ts` URL params, scene registry, test cube scene
- `client/src/render/geo/procgeo.ts` procedural geometry + bake · `client/src/audio/vendor/sfx.js` sfx engine
- `client/src/render/pipeline.ts` low-res target, resolution, adaptive quality · `render/post.ts` dither/quantize/fade pass
- `client/src/render/materials/{psx,psx-glsl,library}.ts` the one PSX program, surface → material library
- `client/src/render/{lights,heat,textures}.ts` LightRig (hemi/dir/fog/point pick), heat ramp, texture loader
- `client/src/render/geo/{uv,static-batch,ao}.ts` box UVs, merge-per-material batch, baked vertex AO
- `client/src/render/models/{kit,anvil,brazier,props}.ts` model helpers + anvil, brazier, crate/tub/tools/chain/ingot
- `client/src/dev/{scene-lookdev,lookdev-room}.ts` lookdev foundry corner · `tools/texbake.mjs` CC0 → crunchy PNGs
- `client/src/physics/world.ts` CollisionWorld: merged BVH, capsule resolve/probe/overlaps, raycast
- `client/src/player/{move-state,motor,kinematics}.ts` movement state + pure tick rules + collide-and-slide/step/snap
- `client/src/player/{player,camera,viewmodel,feel-bind}.ts` local player → bus, FP camera feel, viewmodel, bus → feel
- `client/src/input/{actions,keyboard-mouse}.ts` action layer, dev KB+mouse · `core/{spring,noise}.ts` spring, 1-D noise
- `client/src/dev/{scene-movement,movement-course,move-hud}.ts` movement course scene, its geometry, dev stamina pips
- `client/src/input/{bind-input,controls-settings,layout-store}.ts` wire all sources, control settings, 3 saved layout slots · `core/store.ts` safe localStorage
- `client/src/input/{touch,touch-view,touch-math,touch-layout,pictograms}.ts` touch controller, DOM layer, pure math, layout model, SVG pictograms
- `client/src/input/{layout-editor,gyro,gamepad}.ts` layout editor, gyro aim, gamepad mapping · `input/input.test.ts`
- `client/src/app/native.ts` Capacitor glue (back, pause, splash, APK default scene) · `android/` Capacitor project, `tools/android-keystore.sh`, `.github/workflows/apk.yml`
- `shared/src/world/arenas/foundry.ts` Arena 1 layout data (cages, racks, pedestal, ring centers, respawns, helpers) · `client/src/world/region-batch.ts` per-light-region StaticBatch
- `client/src/world/foundry/{index,ctx,floor,shell,furnace,catwalks,crane,landmarks}.ts` arena builders · `foundry/{molten,cages,ring}.ts` animated molten sheet, cage doors, fire ring · `dev/scene-arena.ts`
- `client/src/player/character/{skeleton,skin-batch,body,character}.ts` rigid skeleton + sockets, CPU-skinned batch, base body, assembled Character · `armor-{kit,soft,plate}.ts`, `armor.ts`, `modules.ts` armor tiers + 6 modules
- `client/src/player/character/{pose,animator,drive}.ts` clip sampling/blend, base+action animator, MoveState → anim · `clips/*.ts` clip data + attack slots · `player/third-person.ts` TP camera · `render/geo/cbox.ts` 44-tri box
- `shared/src/data/{armor,modules,colors}.ts` armor tiers, module defs, player colors · `dev/scene-character.ts` lineup / `clip=` player
- `shared/src/data/weapons.ts` 16 forms, formFor/passivesOf · `shared/src/passives.ts` passive hook registry + folds
- `client/src/weapons/{wkit,shapes,palette,tassel,weapon}.ts` one-mesh builder + atlas UVs/heatMask, blade loft/profile/wrap, colors, tassel, build/load(GLB)/setHeat · `weapons/models/*.ts` 16 builders + index
- `client/src/dev/scene-weapons.ts` rack / `?weapon=&heat=` close-up · `tools/weapon-atlas.mjs` → `public/tex/weapon.png`
- `client/src/ui/strings.vi.ts` all Vietnamese text · `tools/shot.mjs` screenshots · `tools/audio/*` audio checks

## Conventions
- TypeScript strict, ES modules, npm workspaces: `client/`, `server/`, `shared/`.
- Units: meters, seconds, radians. +Y up. Player eye height 1.62 m.
- Names: files `kebab-case.ts`, classes `PascalCase`, data ids `snake_case`.
- Events: a tiny typed event bus (`client/src/core/events.ts`). Audio and VFX subscribe to gameplay events;
  gameplay never calls audio/VFX directly. This keeps sound and effects passes cheap to change.
- Commit message: `phase NN: <short title>`; small follow-ups: `fix(NN): ...`.
