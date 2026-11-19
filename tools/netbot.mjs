// Headless fake players: node tools/netbot.mjs [--host http://127.0.0.1:8787] [--code ABCD] [--n 3] [--secs 20] [--match]
import WebSocket from 'ws';
const a = process.argv.slice(2), opt = (k, d) => { const i = a.indexOf('--' + k); return i < 0 ? d : (a[i + 1] ?? true); };
const base = String(opt('host', 'http://127.0.0.1:8787')), n = +opt('n', 3), secs = +opt('secs', 20), match = a.includes('--match');
let code = opt('code', null);
if (!code) { const r = await fetch(base + '/room', { method: 'POST' }); code = (await r.json()).code; console.log('room', code); }
const wsUrl = base.replace(/^http/, 'ws') + `/room/${code}/ws`;
const stats = [];
function state(t, k) {
  const b = new ArrayBuffer(33), dv = new DataView(b); dv.setUint8(0, 1);
  dv.setFloat32(1, Math.cos(t + k) * 8, true); dv.setFloat32(5, 1, true); dv.setFloat32(9, Math.sin(t + k) * 8, true);
  dv.setUint8(23, 1); dv.setUint8(26, 1); dv.setUint8(27, 0); return b;
}
function bot(k) {
  const st = { k, rtt: [], snaps: 0, players: 0, err: null };
  const ws = new WebSocket(wsUrl); ws.binaryType = 'arraybuffer';
  ws.on('open', () => {
    ws.send(JSON.stringify({ t: 'hello', name: 'Bot' + k, color: k }));
    const ping = () => ws.readyState === 1 && ws.send(JSON.stringify({ t: 'ping', c: Date.now() }));
    setInterval(ping, 1000); ping();
    setInterval(() => ws.readyState === 1 && ws.send(state(Date.now() / 1000, k)), 50);
  });
  ws.on('message', (d, bin) => {
    if (bin || typeof d !== 'string' && d instanceof ArrayBuffer) { st.snaps++; return; }
    const m = JSON.parse(d.toString());
    if (m.t === 'pong') st.rtt.push(Date.now() - m.c);
    else if (m.t === 'welcome') { st.id = m.id; ws.send(JSON.stringify({ t: 'ready', v: true })); }
    else if (m.t === 'lobby') st.players = m.players.length;
    else if (m.t === 'err') { if (m.code !== 'host') st.err = m.code; }
  });
  ws.on('error', (e) => { st.err = e.message; });
  stats.push(st); return ws;
}
const socks = Array.from({ length: n }, (_, i) => bot(i));
if (match) setTimeout(() => { /* bot 0 is host: starts once all are ready */ socks.forEach((w) => w.send(JSON.stringify({ t: 'start' }))); }, 3000);
setTimeout(() => {
  for (const s of stats) { const r = s.rtt.sort((x, y) => x - y); console.log(`bot${s.k} id=${s.id} players=${s.players} pings=${r.length} med=${r[r.length >> 1] ?? '-'}ms max=${r.at(-1) ?? '-'}ms snaps=${s.snaps} err=${s.err}`); }
  const ok = stats.every((s) => s.rtt.length >= secs / 2 && !s.err && s.players === n);
  console.log(ok ? 'OK' : 'FAIL'); process.exit(ok ? 0 : 1);
}, secs * 1000);
