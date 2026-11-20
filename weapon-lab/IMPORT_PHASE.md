# Import phase template (the user asks to bring it back into TASK.md when needed)

### Phase NN — Import community weapons from weapon-lab · `TODO` · Sonnet 5.5 · medium
Run only after the families phase (27) is done. Number it as the next free phase when added back. Read: `weapon-lab/PROMPT_FREE_CLAUDE.md` (the kit contract), `docs/ROSTER.md`. Code map lines for weapons/, shared/src/data/weapons.ts, passives.ts.
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

