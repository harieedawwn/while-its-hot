# AUDIO — sound direction and pipeline

The player should *feel* every action in their hands. Reference bar: ULTRAKILL / DUSK — loud, punchy,
crunchy, heavy low end on impacts, short controlled tails, every hit layered. The opposite of what to avoid:
thin arcade bleeps, chimes, rising arpeggios, chiptune, soft "ASMR" taps, long washy reverb, generic whooshes.

## 1. Principles
1. **Real recordings are the body of every gameplay sound.** Synthesis only adds weight (sub thump),
   transient snap, or fills gaps. Pure synth is allowed for UI ticks and a few sci-fi bits (shoulder gun).
2. **Three layers per hit:** transient (2–15 ms crack/click, high-passed) + body (the recording) +
   weight (40–90 Hz sine/noise thump with fast pitch drop, ≤ 120 ms). Then a short send to the room reverb.
3. **Variation:** 3–5 takes per frequent sound (round-robin, never the same take twice in a row),
   ±4% pitch, ±1.5 dB volume. Footsteps: 6+ takes per surface.
4. **Readability for PvP:** enemy footsteps, enemy anvil strikes and frenzy are positional and
   audible at gameplay-useful distances. Hearing someone forging 30 m away is information — keep it.
5. **Mix for phone speakers first, headphones second.** "Đầu ra" setting: Loa điện thoại (default on APK)
   = high-pass 140 Hz + a soft harmonic exciter on the weight layer so bass reads as harmonics; Tai nghe =
   full range + HRTF panning for players.
6. Silence matters: duck the ambience 4 dB for 0.4 s under big events; the cage countdown drops ambience
   to near-silent before the doors slam.

## 2. Pipeline
**Offline design (build time, committed output):**
- `tools/audio/fetch.mjs` downloads CC0 sources listed in `tools/audio/sources.json` into `audio-src/`
  (git-ignored). Each source entry: `{ id, url, license: "CC0", page }`. Record every source in
  `client/public/sfx/CREDITS.md` even though CC0 does not require it.
- Sources (all CC0): kenney.nl packs "Impact Sounds", "RPG Audio", "Interface Sounds", "Sci-fi Sounds";
  opengameart.org "Medieval sound effects – Weapon impacts" (real blade/haft clashes), "The Free Firearm
  Sound Library" (Still North Media; use for the shoulder gun, bomb, crossbow mechanics), other OGA entries
  filtered by CC0 (anvil, blacksmith, steam, fire); freesound.org filtered by Creative Commons 0 (needs a
  free API key from the user — ask once, store in `.env`, never commit). Prefer real anvil and quench
  recordings for the forge sounds.
- `tools/audio/design.py` (Python: numpy, scipy, soundfile, `pedalboard`) renders every game sound from a
  declarative recipe file `tools/audio/recipes/*.yaml`: which takes, trims, layer offsets, EQ, saturation,
  transient shaping, synth weight layer parameters, fades, target loudness. Output: mono
  `client/public/sfx/<event>_<n>.ogg` (Vorbis q5) + `.m4a` fallback, 48 kHz.
- Loudness targets (integrated LUFS per file): weapons/impacts/forge results −14 to −16; hits −16 to −18;
  movement −22 to −26; ambience loops −28 to −32; UI −26 to −30. Peak ≤ −1 dBTP.
- `tools/audio/check.py` verifies loudness, peak, length, leading silence (< 3 ms for transients), and writes
  a spectrogram contact sheet `audio-check/sheet.png`. Look at it: no long pure horizontal lines (= chime),
  swings are broadband, impacts have energy below 120 Hz.
- `kit/audio/sfx.js` (procedural engine with calibrated recipes) is the fallback for anything not yet
  sourced and the basis for UI ticks; `kit/audio/prepare_audio.py` is a simpler trim/normalize tool.

**Runtime (`client/src/audio/`):**
- One `AudioContext`, unlocked on first touch. Buses: `sfx`, `world` (ambience/emitters), `ui`, each → master
  → glue compressor (ratio 3, attack 5 ms, release 120 ms) → limiter (−1 dB) → destination.
- Reverb: 2 `ConvolverNode`s with IRs generated at boot (exponential-decay filtered noise): `room_small`
  (0.5 s, training/anvil close) and `hall_foundry` (1.4 s, darker). Per-area send levels.
- 3D: `PannerNode` (`equalpower` on speaker output, `HRTF` on headphones), inverse distance, ref 2 m,
  max 45 m + a per-voice lowpass that closes with distance (air absorption) and when occluded
  (one ray to the listener against the level BVH, 4 Hz update).
- Voice limits per event (e.g. footsteps 6, sparks ticks 4, hits 8), priority stealing (oldest quietest).
- `audio/events.ts` maps gameplay events (event bus) → sound + parameters. Gameplay code never plays sounds.
- Haptics (`@capacitor/haptics`) are fired from the same map: light on strike, medium on hit taken,
  heavy on form evolution and death. Setting "Rung phản hồi".

## 3. Sound list (every row must exist before phase 12 ends)
| Event | Sound design |
|---|---|
| footstep (stone, metal grate, wood plank, slag gravel) | real boots, 6 takes/surface, interval from distance travelled, pan ±0.08 alternating |
| jump / land (soft, hard by fall speed) | cloth + boot scuff / boot thud + body weight layer scaled by impact |
| slide start / loop / end | boot grind on surface (loop with random start offset), pitch follows speed |
| slam fall / slam land | rising wind loop / huge thud + debris + sub drop, trauma-synced |
| wall jump / cling | hand slap on metal/stone + grunt-free cloth |
| swing light ×3 per family | real swishes: sword thin & fast, hammer heavy & low, polearm long whoosh; pitch per combo step |
| heavy charge / release | leather creak + rising tension (filtered noise swell, NOT a synth riser) / big swing |
| hit flesh / hit armor / hit blocked | meat thud + cloth / metal plate clank + sparks tick / dull shield thunk |
| parry | the signature: sharp bright steel clang, tight 0.25 s ring, + transient crack + sub punch; very loud |
| stagger / kill | grunt-free body impact + metal drop / heavy hit + short low "boom" + 80 ms hit-stop silence gap before the tail |
| death (own) | muffled world (lowpass sweep 0.4 s) + heartbeat-free low drone fade |
| place anvil / pick up | heavy iron set-down on surface + chain rattle / lift scrape |
| heat (Nung) loop | brazier roar loop that swells while held, coal crackle |
| strike Đạt | clean anvil ping (real anvil), mid-high ring 0.4 s, hammer weight layer |
| strike Tuyệt | double strike, brighter ring, + low thump, + sparks hiss |
| strike Giữ | dull flat clank, no ring |
| strike Hỏng | dead crunchy clack + small crack + metallic buzz |
| Gãy (break) | snap + shatter + 4–6 shard tinkles bouncing on stone (short, physical) |
| form evolution (quench) | water hiss/steam burst (real) + deep iron "thoom" + short metallic shimmer of the new blade |
| Nhập thần start / loop / end | furnace whoosh up / roaring fire bed + rapid strikes / exhale of fire dying |
| refused strike (training cap) | muffled dead hit, no ring |
| swap weapon | blade slide from scabbard / hammer haft grip |
| shoulder gun / bolt / bomb | mechanical clack + compressed thump + explosion with debris tail (Firearm Library + synth sub) |
| fire ring | positional roaring wall loop + crackle; inside-the-fire loop when outside the ring + damage sizzle |
| molten channel | positional bubbling + low rumble emitters |
| cage countdown / doors open | ratchet ticks per second (mechanical, not beeps) / massive iron gate slam + chain run |
| truce end | a single deep foundry horn-like metal drone (one hit, 1.5 s), not a fanfare |
| round win / lose / match win | heavy stamp hit + crowd-free low brass-like metal swell (short) / same, darker / bigger stamp + quench hiss |
| ambience foundry | room tone bed (low roar + distant machinery) + random one-shots (distant clanks, chains, steam vents) every 4–12 s, positional |
| ambience training yard | open-air dusk bed, distant forge, light wind, sparse metal one-shots |
| menu smithy | brazier crackle bed; menu select = real hammer on anvil (the menu's "click") |
| UI: tap / back / toggle / slider notch / open panel / close panel / error | dry tactile: switch click / softer reverse click / latch / detent tick per notch / steel shutter drop (short, low) / shutter up / dull double knock |
| transitions | quench wipe = short hiss sweep; stamp cut = anvil impact + metal tail |

Music: none in this version (sound design carries the game). The bus exists so music can be added later.

## 4. Verification (an AI cannot hear — compensate)
- Run `tools/audio/check.py` and look at the spectrogram sheet every audio phase.
- `?scene=audition` lists every event by category with play buttons, a variation button (plays 4 takes),
  a "context" button (plays the event in a short sequence, e.g. 3-hit combo → parry → kill) and the output
  toggle (phone/headphones). The user listens on their phone and writes notes in `docs/AUDIO_NOTES.md`;
  the next audio pass reads that file first.

## 5. Mix snapshot (starting gains, dB relative to bus)
parry 0 · kill 0 · strike results −2 · hits −3 · swings −6 · own footsteps −14 · enemy footsteps −10 ·
ambience bed −20 · emitters −16 · UI −12. Adjust by listening notes, not by guess.
