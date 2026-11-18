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
- `client/src/ui/strings.vi.ts` all Vietnamese text · `tools/shot.mjs` screenshots · `tools/audio/*` audio checks

## Conventions
- TypeScript strict, ES modules, npm workspaces: `client/`, `server/`, `shared/`.
- Units: meters, seconds, radians. +Y up. Player eye height 1.62 m.
- Names: files `kebab-case.ts`, classes `PascalCase`, data ids `snake_case`.
- Events: a tiny typed event bus (`client/src/core/events.ts`). Audio and VFX subscribe to gameplay events;
  gameplay never calls audio/VFX directly. This keeps sound and effects passes cheap to change.
- Commit message: `phase NN: <short title>`; small follow-ups: `fix(NN): ...`.
