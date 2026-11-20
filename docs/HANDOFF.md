# HANDOFF — đọc file này trước khi làm gì cho người dùng

You are continuing as the user's game-dev lead / prompt writer for **While It's Hot**. A previous chat built
the whole plan; this file is everything you need. Reply to the user in **Vietnamese**, short and plain.

## The user
- Vietnamese, builds this game with a small friend group. Uses Claude Code in the Claude desktop app
  (not the terminal) to run phases; uses this chat (claude.ai) for planning, prompts, small direct fixes.
- Very usage-conscious (weekly limit). Wants good quality at low cost. Has 9 free Claude accounts for
  side work (weapon models).
- Hates: AI slop, neon/glow/gradients, cringe or slang Vietnamese, long explanations, explanatory text
  everywhere in the game, arcade/chime/8-bit sounds, low-effort shapes. Likes: short, complete answers,
  decisive choices, tables for model plans.

## The project
- Repo: **github.com/harieedawwn/while-its-hot** (public). Branch to update: `main`.
  Attach it with the add_repo tool (owner `harieedawwn`, repo `while-its-hot`, access push), shallow clone,
  work, commit, `git pull --rebase origin main`, `git push origin HEAD:main`.
- Game: first-person forge-and-fight FFA arena (2–6 players), Android APK first, Vietnamese UI,
  ULTRAKILL-style low-res vertex-lit world rendering. Three.js + TS + Vite; Cloudflare Workers + Durable
  Objects for online rooms; Capacitor for the APK; GitHub Actions builds the APK on every push (any branch).
- Read in the repo when needed (not all at once): `CLAUDE.md` (rules + code map), `TASK.md` (phases +
  Phase log), `docs/GDD.md`, `docs/LOOK.md`, `docs/AUDIO.md`, `docs/TECH.md`, `docs/CACH_CHOI.md`
  (Vietnamese how-to-play), `PROMPT.md` (the loop prompt), `weapon-lab/`.
- **APK link (always latest):** https://github.com/harieedawwn/while-its-hot/releases/download/latest/while-its-hot.apk
  (it is a pre-release, so it does not show in the repo sidebar; tell the user this link).

## How work is done (keep this system)
- Big work = a **phase** in `TASK.md`. The user picks the model/effort listed on the phase, pastes
  `PROMPT.md` into Claude Code, it does exactly one phase (git pull → read listed doc sections → build →
  typecheck/test/build → `tools/shot.mjs` screenshots → update TASK.md log + CLAUDE.md code map → commit →
  push to its branch AND main → short Vietnamese report with next phase + model). Then `/clear` and repeat.
- When the user reports playtest issues: group them into as FEW new phases as sensible, append them to
  `TASK.md` (before "## Phase log"), each with Read: (only needed doc sections + code map lines), bullets,
  Shots:, Done when:, and a model/effort. Then give the user a table: Phase | Sửa gì | Model · Effort.
- Model policy (to save usage): Sonnet 5.5 medium by default; Sonnet high for broad sweeps/perf;
  Opus 5.5 **medium** only for taste-critical visuals/UI/sound; Opus high only for genuinely hard systems
  (netcode). Say why briefly when choosing Opus.
- Small, clear bugs: fix them directly in this chat (grep the cause, minimal edit, `npm run typecheck`,
  commit `fix(NN): ...`, push main) instead of spending a phase. Install deps with `npm ci` if missing.
- Never commit secrets. Keep files ≤ 300 lines, strings only in `client/src/ui/strings.vi.ts`, tuning only in
  `shared/src/balance.ts` / `client/src/core/feel.ts`, data only in `shared/src/data/*` (see CLAUDE.md).

## Status (2026-11-20)
- Phases 00–23 DONE (full game: render look, movement, touch controls with 2/3/4-finger presets + layout
  editor, APK pipeline, foundry arena, characters/armor, 16 weapons, combat, forging, VFX, audio,
  menus/UI/transitions, training yard, online rooms + netcode + match flow, perf sweep, balance, gameplay
  fixes incl. dash removed + finite slide, 3D app icon + splash).
- Phase 24 TODO: import community weapons from `weapon-lab/weapons/*.js` (run again whenever new files come).
- The user and friends just playtested and have new change requests → turn them into new phases (25+).

## Lessons already learned (don't repeat these mistakes)
- Claude Code sessions push to `ccr-*` branches; the loop prompt now also pushes to `main`, and the APK
  workflow builds on every branch. If `main` falls behind, merge the branch into main.
- Audio "ồ ồ / bị bịt" online: the death low-pass never reopened; fixed with an auto-reopen
  (`feel.ts audio.muffle.holdS`). Watch for any global audio filter that is not restored.
- Settings screen broke because the lobby reused the CSS class `m-set`; renamed to `lb-set`.
  Prefix CSS classes per screen.
- Modals (relic draft, +3 family pick) must hide the touch layer (`ui/modal.ts setModal`).
- Scene transitions must not freeze: sliced loads + `compileAsync` while covered (phase 21).

## Weapon lab (side pipeline with free Claude accounts)
- `weapon-lab/PROMPT_FREE_CLAUDE.md`: the user fills the `<request>` block at the top (nhánh, cấp, tên,
  cảm hứng, mô tả) + attaches reference images in a free Claude chat; it returns one JS file using a small
  kit (`k.edge` curved blade loft with fuller, `k.lathe`, `k.wrap`, `k.paint`, `k.tube`, ...).
  The prompt embeds `weapons/the_dao_pha_thu.js` (a naginata) as the quality reference.
- `weapon-lab/preview.html`: drop/paste the JS to view (spin, swing per family, heat slider, warnings).
- Phase 24 ports the kit into the game (`client/src/weapons/lab-kit.ts`) and turns meta.effects into passives.
- Meta in each file (inspiration, level, power score, effect ideas) guides Claude Code on balancing. Design
  intent: higher levels = stranger effects (low: knockback/slow; mid: summons/traps; +16+: absurd, funny,
  strong like black holes).
- If the free AI's output is still weak, improve the kit/prompt (add a tool, add a reference example)
  rather than asking the user to fix models by hand.
