# Sound credits

All source recordings are CC0 (public domain); credit is not required but recorded here. Rendered takes in this folder are
produced by `tools/audio/design.py` from `tools/audio/recipes/*.yaml`; raw sources are fetched by `tools/audio/fetch.mjs`
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
| oga_firearms | OpenGameArt, "The Free Firearm Sound Library" — https://opengameart.org/content/the-free-firearm-sound-library | shoulder gun, bomb |
| oga_rpg_pack | OpenGameArt — https://opengameart.org/content/rpg-sound-pack | cloth, metal gear, doors, battle (artisticdude) |
| oga_steps_kdd | OpenGameArt — https://opengameart.org/content/different-steps-on-wood-stone-leaves-gravel-and-mud | boots on wood, stone, gravel |
| oga_metal_steps | OpenGameArt — https://opengameart.org/content/metal-footsteps-on-concrete | metal footsteps |
| oga_hits_punches | OpenGameArt — https://opengameart.org/content/37-hitspunches | body hits and punches |
| oga_sfx100 | OpenGameArt — https://opengameart.org/content/100-cc0-sfx | general impacts, explosions |
| oga_sfx100_2 | OpenGameArt — https://opengameart.org/content/100-cc0-sfx-2 | general impacts |
| oga_rpg80 | OpenGameArt — https://opengameart.org/content/80-cc0-rpg-sfx | rpg foley |
| oga_metal_wood | OpenGameArt — https://opengameart.org/content/100-cc0-metal-and-wood-sfx | metal and wood hits |
| oga_wood_metal_2 | OpenGameArt — https://opengameart.org/content/wood-and-metal-sound-effects-volume-2 | wood and metal hits |
| oga_metal_interact | OpenGameArt — https://opengameart.org/content/metal-interactions | metal handling, drops |
| oga_metal_impact | OpenGameArt — https://opengameart.org/content/metal-impact-sounds | metal impacts |
| oga_mechanical | OpenGameArt — https://opengameart.org/content/mechanical-sounds | clanks, ratchets, rattles |
| oga_chain_winch | OpenGameArt — https://opengameart.org/content/chain-winch-sounds | chain run |
| oga_iron_door | OpenGameArt — https://opengameart.org/content/iron-door | iron gate slam |
| oga_breaking | OpenGameArt — https://opengameart.org/content/75-cc0-breaking-falling-hit-sfx | shatter, falling debris |
| oga_shield | OpenGameArt — https://opengameart.org/content/10-impactshield-blocks | shield blocks |
| oga_swords_sn | OpenGameArt — https://opengameart.org/content/20-sword-sound-effects-attacks-and-clashes | sword swings and clashes |
| oga_wind | OpenGameArt — https://opengameart.org/content/short-wind-sound | wind |
| oga_whoosh | OpenGameArt — https://opengameart.org/content/air-whoosh | air whoosh |
| oga_dungeon_amb | OpenGameArt — https://opengameart.org/content/loopable-dungeon-ambience | low room tone loop |
| oga_ui_kenney | OpenGameArt — https://opengameart.org/content/interface-sounds | Kenney Interface Sounds (OGA mirror) |
| oga_ui_51 | OpenGameArt — https://opengameart.org/content/51-ui-sound-effects-buttons-switches-and-clicks | switches and clicks |

kenney.nl answers 403 to automated clients; Kenney's Interface Sounds come from its OpenGameArt mirror (CC0).
Procedural stand-ins come from `client/src/audio/vendor/sfx.js` (own code).

## User-supplied (not from the pipeline; `design.py` must not overwrite)
- `ring_hurt_0` (outside the fire ring, every damage tick) and `death_crack_0` (death): supplied by the project owner (trimmed, mono). The hurt sound is a Minecraft sound (Mojang) — fine for private play with friends; replace it before any public release.
