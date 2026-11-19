# Sound credits

All source recordings are CC0 (public domain); credit is not required but recorded here. Rendered takes in this folder are
produced by `tools/audio/design.py` from `tools/audio/recipes.yaml`; raw sources are fetched by `tools/audio/fetch.mjs`
(list: `tools/audio/sources.json`) into `audio-src/` (git-ignored).

| Source id | Pack | Used for |
|---|---|---|
| oga_weapon_clash_1, oga_weapon_clash_2 | OpenGameArt, "Medieval sound effects – Weapon impacts" — https://opengameart.org/content/medieval-sound-effects-weapon-impacts | parry, blocked hits |
| oga_hammer_anvil | OpenGameArt, "Hammer on anvil" — https://opengameart.org/content/hammer-on-anvil | anvil strikes |
| oga_blacksmith_hammer | OpenGameArt, "Blacksmith's hammer" — https://opengameart.org/content/blacksmiths-hammer | dead forge strikes |
| oga_swishes | OpenGameArt, "Swishes sound pack" — https://opengameart.org/content/swishes-sound-pack | weapon swings |
| oga_footsteps | OpenGameArt, "Fantozzi's Footsteps (Grass/Sand & Stone)" — https://opengameart.org/content/fantozzis-footsteps-grasssand-stone | footsteps |
| oga_steam | OpenGameArt, "Steam release sounds" — https://opengameart.org/content/steam-release-sounds | quench, vents |
| oga_fire | OpenGameArt, "Fireplace sound loop" — https://opengameart.org/content/fireplace-sound-loop | brazier / fire loops |
| oga_firearms | OpenGameArt, "The Free Firearm Sound Library" — https://opengameart.org/content/the-free-firearm-sound-library | fetched for phase 12 (shoulder gun, bomb) |

Not available to automated clients: kenney.nl answers 403 (packs there can be added by hand: put the files in `audio-src/<id>/`).
Procedural stand-ins come from `client/src/audio/vendor/sfx.js` (own code).
