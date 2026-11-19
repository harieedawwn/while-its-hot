# TECH — architecture, netcode, build, APK

## 1. Stack (decided; do not re-debate)
- **Client:** TypeScript + Vite + three.js (latest stable, pinned) + `three-mesh-bvh` (capsule collision,
  raycasts). DOM + CSS for UI/HUD/touch controls. No game framework, no React.
- **Server:** Cloudflare Workers + one **Durable Object per room** (WebSocket, SQLite-backed class — the only
  kind allowed on the free plan). The same Worker serves the web build via Workers Static Assets.
- **Shared:** pure TS package used by both (rules, data, forge rolls, protocol codec). Tests: vitest.
- **Android:** Capacitor (latest major) wrapping the Vite build; all assets bundled in the APK → training
  works offline; online play connects to `wss://<worker>/room/<CODE>`.
- **CI:** GitHub Actions builds the signed APK and deploys the Worker. The user never needs Android Studio.

### Why Cloudflare Durable Objects (and not Firebase or P2P)
- One DO instance per room = a single authoritative place for forge rolls, HP, kills, round state, with real
  server code. Firebase Realtime DB/Firestore has no server-side game loop on the free plan (Cloud Functions
  need the paid plan) and every update goes through database writes — fine for turn-based, wrong for melee.
- WebRTC P2P is lowest latency on paper but Vietnamese mobile networks are often behind carrier NAT;
  without a TURN relay many pairs fail to connect. A DO is a relay that always works.
- Cost: DOs are on the free Workers plan. Free plan = 100,000 requests/day and 13,000 GB-s/day duration.
  Incoming WebSocket messages bill at 20:1, outgoing are free. Our budget: 4 players × 20 msg/s =
  80 msg/s = 4 billed req/s ≈ 14,400/hour → ~6.5 hours of 4-player play per day; duration ≈ 28 room-hours/day.
  If the group ever plays more, Workers Paid ($5/month) removes the worry. Use the DO `locationHint: "apac"`
  when creating a room so it lands near Vietnam.

## 2. Repo layout
```
client/  src/{app,core,render,world,player,combat,forge,weapons,armor,fx,audio,input,ui,net,modes,dev}
         public/{tex,sfx,fonts,models}
server/  src/{worker.ts, room.ts, rules/*.ts}   wrangler.jsonc
shared/  src/{balance.ts, data/*, passives.ts, forge.ts, damage.ts, rng.ts, net/{protocol.ts,codec.ts}}
android/ (Capacitor project; native tweaks in MainActivity)
tools/   shot.mjs, texbake.mjs, netbot.mjs, audio/{fetch.mjs,design.py,check.py,recipes/*.yaml,sources.json}
kit/     vendored helpers (procgeo, sfx engine) — moved into client in phase 00
```
`client/src/app/` owns the screen state machine: `Boot → Title → Menu → {Training | Lobby → Match} ↔ Settings`.
Every screen implements `enter(ctx) / exit() / update(dt)`; transitions go through `ui/transition.ts`.

## 3. Game loop and time
- Fixed-step simulation at 60 Hz for the local player (movement, combat timers), render interpolated.
- `requestAnimationFrame` loop with a frame cap setting (30/60/90/120), pause on `visibilitychange`
  and on Capacitor `appStateChange`.
- One `Clock` exposes `simTime`, `renderTime`, `serverTime` (from net clock sync), and `timeScale`
  (slow-mo affects local visuals only).

## 4. Netcode (phases 16–17)
**Model: client-authoritative movement, server-authoritative everything that matters.** Right for a
friend group (no anti-cheat needed) and it makes melee feel instant.
- **Client → server** at 20 Hz: compact binary `State` (pos, vel, yaw, pitch, anim state id, anim time,
  flags: grounded/sliding/blocking/parrying/forging, weapon id+level) + any queued `Event`s
  (attack start, hit claim, parry press time, forge strike request, anvil place/pickup, pickup request,
  heat start/stop, frenzy request).
- **Server → clients** at 20 Hz: one batched `Snapshot` (all players' latest states with server timestamps)
  + reliable `Event`s (damage applied, kill, forge result, level change, pickup granted, round phase, ring
  radius/center, relic offers). JSON for rare events, binary (`DataView`) for State/Snapshot.
- **Clock sync:** ping/pong every 2 s, keep the 5 lowest-RTT samples, offset = median. Show ping in scoreboard.
- **Remote players:** snapshot interpolation with a buffer of `100 ms` (adapt: 2 × jitter + 50 ms, clamp
  80–200 ms). Extrapolate at most 100 ms when packets are late, then freeze.
- **Melee hits:** the attacker's client sweeps the weapon segment (base→tip, sub-stepped) against remote
  players' hit capsules *at their interpolated (rendered) time* and sends `HitClaim{target, attackId,
  clientTime}`. The server validates: attacker alive and attack active, attack id fresh, target alive, not
  invulnerable (frenzy at anvil, truce), distance between server-known positions ≤ reach +
  2.0 m tolerance, rate limit per weapon timing. Then it checks the **target's parry/block**: a parry press is
  successful if its server time is within the parry window around the hit time, widened by the target's
  RTT/2 (max +80 ms). Server applies damage and broadcasts. The attacker plays hit feedback immediately
  (predicted) and gets a correction only if rejected (rare; then just no damage number).
- **Forge:** the client plays the strike animation immediately; the server rolls the outcome with its own RNG
  (`shared/forge.ts`, seeded per room) and returns the result in ~RTT; the client delays the result reveal
  (spark burst + sound) until the result arrives, hidden inside the hammer's downswing (~0.15 s). Training
  mode uses the same `shared/forge.ts` locally.
- **Rooms:** `POST /room` creates a 4-letter code (letters without I/O), `GET /room/:code/ws` upgrades.
  Max 6 players. Host = first joiner; if the host leaves, the next player becomes host. Reconnect within
  30 s keeps your slot (token in localStorage). Empty room self-destructs after 5 min (alarm).
- While a match runs the DO keeps a `setInterval` tick (20 Hz) for snapshots/ring/timers (no hibernation
  during matches; hibernate in the lobby). CPU per tick must stay tiny: no physics on the server.
- `tools/netbot.mjs`: headless fake players (Node WebSocket) that join a room, move in circles, attack,
  forge — to test rooms alone. Run 3 bots + 1 real client.

## 5. Input
- One action layer (`input/actions.ts`): `move(x,y)`, `look(dx,dy)`, buttons `attack, parry, jump,
  slide, forge, anvil, swap, pause, scoreboard`. Sources: touch, keyboard+mouse, gamepad (Gamepad API).
- **Touch defaults** (the common mobile-FPS layout, e.g. CoD Mobile / PUBG Mobile): left half = movement
  stick (floating by default, fixed optional), right half = drag to look (any touch not on a button),
  right cluster = big Đánh button + Nhảy, Trượt, Đỡ around it; Rèn/Đặt đe contextual near the top of
  the cluster; Đổi and pause top-right. Multi-touch with per-pointer ownership; a finger that starts on a
  button can slide off and still look (CoD-style "fire + aim" with one thumb).
- Look: sensitivity X/Y separate, acceleration curve off by default, optional gyro aiming (on Android via
  `deviceorientation`/Generic Sensor), invert Y, aim assist toggle.
- **Layout editor** in settings: drag/resize/opacity per control, snap grid, reset, 3 saved presets.
  Stored per device in profile storage. Joystick fixed/floating, joystick size, dead zone.
- Haptics on button press optional.
- **Full settings list** (Vietnamese labels in strings.vi.ts):
  Hình ảnh: độ phân giải điểm ảnh, nén màu, rung đỉnh, giới hạn FPS, máu, hiện FPS, giảm chuyển động.
  Âm thanh: tổng, hiệu ứng, môi trường, giao diện, đầu ra (loa điện thoại / tai nghe), rung phản hồi.
  Điều khiển: chỉnh bố cục, cần điều khiển cố định/nổi, cỡ cần, vùng chết, độ nhạy ngang/dọc, đảo trục dọc,
  con quay hồi chuyển + độ nhạy, hỗ trợ ngắm, giữ để đỡ/chạm để đỡ.
  Góc nhìn: FOV, góc nhìn thứ nhất/thứ ba, lắc đầu khi chạy, rung màn hình.
  Hồ sơ: tên, màu, xóa dữ liệu.

## 6. Screens, fit and orientation
- Canvas fills the full screen. CSS uses `100dvh`/`100dvw` and safe-area variables; HUD anchors to the safe
  rect, never to raw edges. Test aspects: 16:9 (old phones), 19.5:9, 20:9, 21:9 (long Oppo/Xiaomi), 4:3 tablet.
- Web: if portrait, show the rotation gate; on first tap request fullscreen + `screen.orientation.lock
  ('landscape')` where supported.
- APK (`android/`): `android:screenOrientation="sensorLandscape"`, `configChanges` includes
  `orientation|screenSize|screenLayout|smallestScreenSize|keyboardHidden|uiMode`, no action bar,
  immersive sticky via `WindowInsetsControllerCompat` (hide system bars, `BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE`,
  re-applied in `onWindowFocusChanged` and `onResume`), `layoutInDisplayCutoutMode = shortEdges`,
  `FLAG_KEEP_SCREEN_ON` during play. Read the real cutout insets natively and inject them as CSS variables
  (`--cut-l/r/t/b`) via `evaluateJavascript` on start and on configuration change, because WebView
  `env(safe-area-inset-*)` is unreliable across Android versions. Back button opens the pause menu.
- Assets load from the APK (no network). The splash screen stays until the first frame is ready.

## 7. APK and deploy (phase 04 sets this up; every later push gets a fresh APK)
- `.github/workflows/apk.yml`: on push to `main` (paths client/shared/android) → Node 22, Java 21,
  `npm ci`, `npm run build`, `npx cap sync android`, `./gradlew assembleRelease` signed with a keystore
  from secrets (`ANDROID_KEYSTORE_B64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`,
  `ANDROID_KEY_PASSWORD`), `versionCode = github.run_number`, upload to a rolling GitHub Release `latest`.
  A fixed keystore matters: friends can install updates over the old version without uninstalling.
  Concurrency group cancels older runs.
- The keystore is generated once locally with `keytool`, base64'd into secrets with `gh secret set`, and the
  file itself is git-ignored. If `gh` is not authenticated, ask the user to run `gh auth login` once.
- `.github/workflows/deploy.yml`: on push to `main` (paths server/shared/client) → `wrangler deploy` with
  `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` secrets. The user creates the token once
  (template "Edit Cloudflare Workers"); ask for it when phase 16 needs it.
- The web build is also playable from the Worker URL on a phone browser for quick tests.

## 8. Performance rules
- Merge static level geometry by material; instanced meshes for repeats (bolts, rails, crates, sparks).
- No per-frame allocations in hot paths (reuse vectors), no `new THREE.*` inside update loops.
- One shader program for most of the world (PSX material variants via defines, not separate materials).
- Remote players: ≤ 3 draw calls each (body, weapon, armor/modules merged per change).
- Expose `window.__stats = { calls, tris, programs, frameMs }` in dev for checks.

## 9. Dev scenes and screenshots
- `client/src/dev/scenes.ts` registry: `lookdev, arena, movement, weapons, character, combat, forge, fx,
  training, ui-menu, ui-settings, ui-armory, hud, transition, audition, lobby`.
- URL params: `scene, seed, t (freeze time), cam=x,y,z,yaw,pitch, nogate=1 (skip rotation gate),
  touch=1 (show touch controls), q=<quality>`.
- `node tools/shot.mjs <scene> --devices phones` (default) → `shots/<scene>__<device>.png` +
  `shots/<scene>__contact.png` + `shots/report.json` (console errors, `__stats`). It starts the Vite dev
  server itself if nothing answers on the port. Headless Chromium uses SwiftShader: judge fps on a real
  phone; use calls/tris from the report as the budget check.
- To save tokens: look at the contact sheet first; open a single device image only when needed;
  at most 3 shoot-fix cycles per phase.
