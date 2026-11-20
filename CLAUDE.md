# WHILE IT'S HOT — project rules (read every session)

First-person multiplayer forge-and-fight arena for a small friend group. Mobile (Android APK) first.
Vietnamese UI. Low-res, vertex-lit, crunchy 3D in the spirit of ULTRAKILL's *world rendering* (not its UI).

## Where things are
- `TASK.md` — the phase list. Work on exactly ONE phase per session (see the loop prompt). Old phases: `docs/TASK_DONE.md`.
- `docs/GDD.md` — game design, rules, numbers. `docs/LOOK.md` — art, camera, VFX, UI, copy.
- `docs/ROUND3.md` — round-3 design changes (override GDD until each phase folds them in) · `docs/ROSTER.md` — 60 weapon forms.
- `docs/AUDIO.md` — sound direction and pipeline. `docs/TECH.md` — architecture, netcode, build, APK.
- Read only the doc sections a phase lists. Do not read whole docs "just in case".
- `kit/` — vendored helpers (procedural geometry, sound engine + checkers). Moved into packages in phase 00.

## Commands (fill in as they become real)
- `npm run dev` — client dev server (Vite) · `npm run build` · `npm run typecheck` · `npm test`
- `node tools/shot.mjs <scene> [--devices phones|all] [--q "k=v&k=v"]` — screenshots for self-check
- `node tools/texbake.mjs [name…] [--sheet] [--try id,id]` — rebake world textures into `client/public/tex/`
- `node tools/weapon-atlas.mjs [--sheet]` — rebuild the weapon texture atlas `client/public/tex/weapon.png`
- `node tools/audio/fetch.mjs` then `python3 tools/audio/design.py [event…]` then `python3 tools/audio/check.py` — sources → `client/public/sfx/` → verify (`pip install numpy scipy soundfile pedalboard pyyaml pyloudnorm matplotlib py7zr`)
- `npm run dev:server` — local Worker + Durable Object (wrangler dev)
- `node tools/forge-sim.mjs [--n 4000] [--nofrenzy] [--blade|--armor]` — forge EV / level-by-time sim (balance check)
- `node tools/sweep.mjs [--devices all|a,b] [--only substr]` — every scene x device: stats, errors, DOM fit check → `shots/sweep.json`
- `node tools/leak.mjs [--cycles 4] [--scenes a,b]` — scene-cycling leak check (GPU counts, heap, DOM) · `node tools/aobake.mjs` — rebake `client/public/ao/*.bin` after changing static foundry/smithy geometry

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
- `client/src/player/{move-state,motor,kinematics}.ts` movement state (+ family `traits`) + pure tick rules + collide-and-slide/step/snap · `player/traits.test.ts`
- `client/src/player/{player,camera,viewmodel,feel-bind}.ts` local player → bus, FP camera feel, viewmodel, bus → feel
- `client/src/input/{actions,keyboard-mouse}.ts` action layer, dev KB+mouse · `core/{spring,noise}.ts` spring, 1-D noise
- `client/src/dev/{scene-movement,movement-course,move-hud}.ts` movement course scene, its geometry, dev stamina pips
- `client/src/input/{bind-input,controls-settings,layout-store}.ts` wire all sources, control settings, 3 saved layout slots · `core/store.ts` safe localStorage
- `client/src/input/{touch,touch-view,touch-math,touch-layout,pictograms}.ts` touch controller, DOM layer, pure math, layout model, SVG pictograms
- `client/src/input/{layout-editor,gyro,gamepad}.ts` layout editor, gyro aim, gamepad mapping · `input/input.test.ts`
- `client/src/input/{touch-router,touch-presets,touch-rims,touch-css}.ts` pure pointer ownership (+test), 2/3/4 ngón presets, cooldown/charge rims from the bus, disc styles
- `client/src/app/native.ts` Capacitor glue (back, pause, splash, APK default scene) · `android/` Capacitor project, `tools/android-keystore.sh`, `.github/workflows/apk.yml`
- `shared/src/world/arenas/foundry.ts` Arena 1 layout data (cages, racks, pedestal, ring centers, respawns, helpers) · `client/src/world/region-batch.ts` per-light-region StaticBatch
- `client/src/world/foundry/{index,ctx,floor,shell,furnace,catwalks,crane,landmarks}.ts` arena builders · `foundry/{molten,cages,ring}.ts` animated molten sheet, cage doors, fire ring · `dev/scene-arena.ts`
- `client/src/player/character/{skeleton,skin-batch,body,character}.ts` rigid skeleton + sockets, CPU-skinned batch, base body, assembled Character · `armor-{kit,soft,plate}.ts`, `armor.ts`, `modules.ts` armor tiers + 6 modules
- `client/src/player/character/{pose,animator,drive}.ts` clip sampling/blend, base+action animator, MoveState → anim · `clips/*.ts` clip data + attack slots · `player/third-person.ts` TP camera · `render/geo/cbox.ts` 44-tri box
- `shared/src/data/{armor,modules,colors}.ts` armor tiers, module defs, player colors · `dev/scene-character.ts` lineup / `clip=` player
- `shared/src/data/weapons.ts` 4 families × 15 forms + phoi (ROSTER), formFor/passivesOf/traitsOf/dmgScale/timeMulAt · `shared/src/passives.ts` passive hook registry + folds, `pendingPassives()` no-op ids
- `client/src/weapons/{wkit,shapes,palette,tassel,weapon,hold}.ts` one-mesh builder + atlas UVs/heatMask, blade loft/profile/wrap, colors, tassel, build/load(GLB)/setHeat/`modelFor` (borrowed model)/`mirrorLeft`, `gripInHand`/`holdWeapon` (TP hands) · `weapons/models/*.ts` own builders + index
- `client/src/dev/scene-weapons.ts` rack / `?weapon=&heat=` close-up · `tools/weapon-atlas.mjs` → `public/tex/weapon.png`
- `shared/src/combat/{frames,fighter,damage,sweep}.ts` frame data + attack shapes, melee state machine, hit/defense rules, blade sweep vs hit capsules
- `client/src/combat/{combatant,combat-world,resolver}.ts` body+fighter+hp, per-tick sweeps/events/lunges, HitClaim + LocalResolver + passive effects
- `client/src/combat/{local-fighter,aim-assist,combat-feel,fighter-anim,dummy}.ts` local player melee kit, touch aim assist, hit-stop/trauma, fighter → TP clips, training dummy AI
- `client/src/combat/vm/{vm-pose,vm-clips,vm-fists,vm-driver,vm-arms}.ts` FP pose keys (+ left hand `l`), kiem/bua/dao FP sets from the sweep arcs, tay two-fist set, fighter → viewmodel, FP forearms
- `client/src/player/character/clips/{attacks,strikes,strikes-blade,strikes-short}.ts` TP attack clip engine + pose data (kiem/bua, dao/tay) · `dev/{scene-combat,combat-demo}.ts` combat scene + scripted demos
- `shared/src/forge/{odds,ring,session,anvil-rule,sync}.ts` p(L)/zone(L)/heat zone/ForgeMods, clock-driven ring + seeded zones, ForgeSession (blades/armor/heat/frenzy/pick, `strike(at,tol)`/`predict(at)`), anvil timers, ForgeSync · `forge/forge.test.ts` · `BALANCE.forge`
- `client/src/forge/{anvil,stage,stance-cam,controller}.ts` placed anvil+brazier (solid, lit), blade/hammer on the anvil, stance camera blend + frenzy FOV punch, local forge loop on pointer-down stamps + `ForgeClock` (replaces lf.tick+player.tick) · `physics/blockers.ts` dynamic cylinders in CollisionWorld
- `client/src/ui/{forge-hud,forge-hud-css}.ts` strike ring, heat meter, frenzy pips, result word, +3 family pick · `dev/scene-forge.ts` forge scene (presets in its header)
- `client/src/fx/{sparks,puffs,decals,shards,trail}.ts` spark pool (embers/star), dithered puffs, ground decals/rings, Gãy shards, weapon ribbon · `fx/glsl.ts` Bayer clip + heat ramp + fog
- `client/src/fx/{fx-world,fx-bind,fx-layer,fx-settings}.ts` pools + recipes, bus → effects + ring embers/tint, per-scene FX bundle with trails, Máu setting · `dev/{scene-fx,fx-demo}.ts` fx bench
- `client/src/world/foundry/flame-atlas.ts` 4-frame flame atlas for the fire ring cards (`ring.ts`)
- `client/src/audio/{graph,reverb,settings}.ts` AudioContext + buses/glue/limiter/phone stage/generated reverbs, IR maker, saved volumes+output · `audio/{engine,bank,voices,spatial,catalog}.ts` play/loop facade, manifest+takes+synth fallback, voice stealing, 3D+air filter, event catalog (AUDIO §3)
- `tools/audio/{fetch.mjs,sources.json,design.py,recipes/*.yaml,check.py}` CC0 fetch, recipe renderer → `client/public/sfx/`, loudness/chime checker + spectrogram sheet · `dev/scene-audition.ts` · `client/public/sfx/CREDITS.md`
- `client/src/audio/{events,haptics,ambience,places,scene-audio}.ts` bus → sounds+haptics, Capacitor haptics, beds/emitters/one-shots, per-place ambience defs, per-scene audio glue (listener, occlusion ray)
- `client/src/app/{director,screens}.ts` running scene + transitions between scenes, screen state machine · `core/clock.ts` time scale
- `client/src/ui/kit/{dom,controls,panels}.ts` UI kit (button, ledger, notched slider, segmented, tag strip, shutter, toast) · `ui/styles/{fonts,tokens,components,menu}.css` · `ui/ui-settings.ts`
- `client/src/ui/{transition,transition-gl}.ts` quench/stamp/fade overlay, round-end + death grade · `ui/menu/{menu-screens,settings-screen}.ts` title, menu, settings ledger
- `client/src/world/smithy.ts` night smithy set + helve strike · `render/models/helve.ts` · `dev/{scene-menu,scene-transition}.ts` (`ui-menu`, `transition`, `ui-settings`, `ui-armory`, `hud`)
- `client/src/core/{game-settings,profile}.ts` saved gfx/view settings (live), offline profile · `ui/fps-badge.ts` · `ui/kit/fields.ts` range slider, text field, swatches
- `client/src/ui/menu/{settings-screen,settings-rows,armory-screen}.ts` settings shell + 5 tab row builders, armory rails · `world/turntable.ts` · `ui/styles/armory.css`
- `client/src/ui/hud/{hud,overlays,silhouettes}.ts`+`hud.css` HUD, scoreboard, pause menu, family silhouettes · `app/pause.ts` in-game pause · `dev/{scene-hud,scene-ui-settings,scene-ui-armory}.ts`
- `shared/src/training.ts` rack offers, caps, DPS window, yard modes · `client/src/training/{boards,yard}.ts` canvas signs, yard props/stations · `dev/scene-training.ts` Luyện tập yard (`training`)
- `client/src/ui/strings.vi.ts` all Vietnamese text · `tools/shot.mjs` screenshots · `tools/audio/*` audio checks

- `shared/src/net/{protocol,codec,clock}.ts` lobby msgs, binary State/Snapshot, clock sync · `server/src/{worker,room,lobby}.ts` routes, Room DO, pure roster rules · `wrangler.jsonc` · `tools/netbot.mjs`
- `client/src/net/{config,client}.ts` server URL, RoomClient + `room.current` · `ui/menu/lobby-screen.ts` + `styles/lobby.css` Chơi mạng lobby
- `shared/src/match/{authority,mplayer,hits,effects,forge-auth,pickups,anim-code}.ts` server MatchAuthority, player record, hit-claim checks, passive effects, server forge rolls, blanks, anim byte · `net/{match-msgs,bot}.ts` · `forge/sync.ts`
- `client/src/net/{net-match,net-combat,net-forge,net-anvils,pickups}.ts` match session + uplink, predicted hits/verdicts, server-rolled forging, others' anvils, blanks
- `client/src/net/{remote,remotes,interp,pack,link-sim,loopback,net-debug}.ts` remote player, roster, snapshot interp, local State, lag sim, in-process room, dev overlay · `dev/scene-net.ts` (`net`)
- `shared/src/match/{flow,rules}.ts` RoundFlow (cage/fight/result/end, lives, ring burn, draft, scoring) + pure rules · `shared/src/data/relics.ts` 14 relics + `foldRelics` · `shared/src/unlocks.ts` match-end unlocks · `match/{flow,bots}.test.ts`
- `client/src/net/net-flow.ts` round machine presentation (HUD, doors, ring, draft, result, end) · `ui/hud/{draft,match-end}.ts` + `styles/match.css` draft cards, banner, end screen · `dev/net-preview.ts`
- `client/src/render/{dispose,geo/ao-cache}.ts` `disposeTree` (geometry-only; call it on any model you replace/drop), pre-baked vertex AO files `public/ao/*.bin` · `tools/{sweep,leak,aobake}.mjs`
- `client/src/ui/modal.ts` setModal (hides touch layer while a choice is open) · `ui/menu/lobby-settings.ts` host/read-only match settings grid · `core/slice.ts` yieldTask/settleFrames for sliced scene loads
- `client/src/dev/scene-icon.ts` app icon scene (`icon`) · `tools/icon-gen.mjs` + `tools/icon-src.png` → Android icon mipmaps + splash

- `client/src/input/controls-settings.ts` `sharedControls()` the one live Controls · `layout-store.ts` `reload()` · `pictograms.ts` flame/eye/slot variants, `TouchControls.setIcon/setDim` · `ForgeSession.swapSlot/filled/swapT`
- `shared/src/match/rules.ts` also `ghostLanding/ringTickDmg/bladeLoss/armorLoss` · `match/ghost.test.ts` · `ForgeSession.newRound/carryLoss` · msgs `ghost/rtick/carry` (`net/match-msgs.ts`), `FLAG.ghost`
- `client/src/net/net-ghost.ts` local dead/Hồn presentation + ring pain vignette · `render/materials/ghost.ts` Bayer pale ghost body (`Character.setGhost`) · `Pipeline.setVignette` (`uVig`), `FirstPersonCamera.hurt/dead`, `TouchControls.setGhost`

## Conventions
- TypeScript strict, ES modules, npm workspaces: `client/`, `server/`, `shared/`.
- Units: meters, seconds, radians. +Y up. Player eye height 1.62 m.
- Names: files `kebab-case.ts`, classes `PascalCase`, data ids `snake_case`.
- Events: a tiny typed event bus (`client/src/core/events.ts`). Audio and VFX subscribe to gameplay events;
  gameplay never calls audio/VFX directly. This keeps sound and effects passes cheap to change.
- Commit message: `phase NN: <short title>`; small follow-ups: `fix(NN): ...`.
