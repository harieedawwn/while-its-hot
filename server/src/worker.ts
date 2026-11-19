import { BALANCE, normalizeCode, randomCode, validCode } from '@wih/shared';
export { Room } from './room';

export interface Env { ROOMS: DurableObjectNamespace; ASSETS: Fetcher }
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'content-type' };
const stub = (env: Env, code: string) => env.ROOMS.get(env.ROOMS.idFromName(code), { locationHint: 'apac' });
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json', ...CORS } });

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
    if (url.pathname === '/room' && req.method === 'POST') {
      for (let i = 0; i < 12; i++) {
        const code = randomCode();
        const r = await stub(env, code).fetch(`https://room/init?code=${code}`);
        if (r.ok) return json({ code });
      }
      return json({ err: 'busy' }, 503);
    }
    const m = url.pathname.match(/^\/room\/([A-Za-z]{4})\/(ws|exists)$/);
    if (m) {
      const code = normalizeCode(m[1]);
      if (!validCode(code) || code.length !== BALANCE.net.codeLen) return json({ err: 'notfound' }, 404);
      if (m[2] === 'ws') return stub(env, code).fetch(new Request(`https://room/ws`, req));
      const r = await stub(env, code).fetch(`https://room/probe`);
      return json({ ok: r.status === 426 }, r.status === 426 ? 200 : 404);
    }
    return env.ASSETS.fetch(req);
  },
} satisfies ExportedHandler<Env>;
