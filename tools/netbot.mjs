// Headless fake players (shared/src/net/bot.ts): join a room, chase, swing with real hit claims, forge.
// node tools/netbot.mjs [--host http://127.0.0.1:8787] [--code ABCD] [--n 3] [--secs 20] [--match] [--wait 4] [--truce 0] [--lag 0]
//   --match: bot 0 (host if it created the room) starts once --wait players are in and ready; --truce sets the host truce.
import { build } from 'esbuild';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import WebSocket from 'ws';

const root = fileURLToPath(new URL('..', import.meta.url));
const out = join(tmpdir(), 'wih-netbot.mjs');
await build({ stdin: { contents: "export { NetBot, encodeState, decodeSnapshot } from './shared/src/index.ts';", resolveDir: root, loader: 'ts' }, bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'error' });
const { NetBot, encodeState, decodeSnapshot } = await import(pathToFileURL(out).href);

const a = process.argv.slice(2), opt = (k, d) => { const i = a.indexOf('--' + k); return i < 0 ? d : (a[i + 1] ?? true); };
const base = String(opt('host', 'http://127.0.0.1:8787')), n = +opt('n', 3), secs = +opt('secs', 20), match = a.includes('--match');
const wait = +opt('wait', n), truce = opt('truce', null), lag = +opt('lag', 0);
let code = opt('code', null);
if (!code) { const r = await fetch(base + '/room', { method: 'POST' }); code = (await r.json()).code; }
console.log('room', code);
const wsUrl = base.replace(/^http/, 'ws') + `/room/${code}/ws`;
const later = (f) => (lag > 0 ? setTimeout(f, lag / 2) : f());
const stats = [];

function bot(k) {
  const st = { k, rtt: [], snaps: 0, players: 0, err: null, started: false };
  const ws = new WebSocket(wsUrl); ws.binaryType = 'arraybuffer';
  const send = (m) => later(() => ws.readyState === 1 && ws.send(typeof m === 'string' || m instanceof ArrayBuffer ? m : JSON.stringify(m)));
  let t0 = 0, off = 0;
  const b = new NetBot({ send, state: (s) => send(encodeState(s)) }, k);
  st.bot = b;
  const now = () => Date.now() + off - t0;
  ws.on('open', () => {
    send({ t: 'hello', name: 'Bot' + k, color: (k + 1) % 6 });
    const ping = () => send({ t: 'ping', c: Date.now() });
    setInterval(ping, 1000); ping();
    setInterval(() => { if (st.started && t0) b.tick(0.05, now()); }, 50);
  });
  ws.on('message', (d, bin) => later(() => {
    if (bin) { st.snaps++; const s = decodeSnapshot(new Uint8Array(d).buffer); if (s) b.onSnapshot(s); return; }
    const m = JSON.parse(d.toString());
    if (m.t === 'pong') { const r = Date.now() - m.c; st.rtt.push(r); off = m.s + r / 2 - Date.now(); send({ t: 'rtt', v: r }); }
    else if (m.t === 'welcome') { st.id = m.id; send({ t: 'ready', v: true }); if (k === 0 && truce !== null) send({ t: 'settings', s: { truce: +truce } }); }
    else if (m.t === 'lobby') {
      st.players = m.players.length;
      if (match && k === 0 && !st.started && m.players.filter((p) => p.online && p.ready).length >= wait) send({ t: 'start' });
    } else if (m.t === 'start') st.started = true;
    else if (m.t === 'match') { t0 = m.t0; st.started = true; }
    else if (m.t === 'err') { if (m.code !== 'host' && m.code !== 'bad') st.err = m.code; }
    b.onMsg(m);
  }));
  ws.on('error', (e) => { st.err = e.message; });
  stats.push(st); return ws;
}
for (let i = 0; i < n; i++) bot(i);
setTimeout(() => {
  for (const s of stats) {
    const r = s.rtt.sort((x, y) => x - y);
    console.log(`bot${s.k} id=${s.id} players=${s.players} pings=${r.length} med=${r[r.length >> 1] ?? '-'}ms max=${r.at(-1) ?? '-'}ms snaps=${s.snaps} hits=${s.bot.hits} rejects=${s.bot.rejects} strikes=${s.bot.strikes} err=${s.err}`);
  }
  const ok = stats.every((s) => s.rtt.length >= secs / 2 && !s.err && s.players >= n && (!match || s.snaps > 0));
  console.log(ok ? 'OK' : 'FAIL'); process.exit(ok ? 0 : 1);
}, secs * 1000);
