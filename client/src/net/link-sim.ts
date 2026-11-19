/**
 * The socket surface RoomClient needs (a browser WebSocket fits), plus a dev-only bad-network simulator:
 * `?lag=150` (round trip ms, half each way), `?jitter=20` (± ms per message), `?loss=0.05` (drops binary
 * State/Snapshot only: JSON events ride a reliable stream). Order is kept per direction, like TCP.
 */
export interface SockLike {
  readyState: number;
  binaryType: string;
  onopen: ((e?: unknown) => void) | null;
  onmessage: ((e: { data: string | ArrayBuffer }) => void) | null;
  onclose: ((e?: unknown) => void) | null;
  onerror: ((e?: unknown) => void) | null;
  send(d: string | ArrayBuffer): void;
  close(code?: number, reason?: string): void;
}
export interface LinkSim { lag: number; jitter: number; loss: number }
export const NO_SIM: LinkSim = { lag: 0, jitter: 0, loss: 0 };

export function simFromParams(q: URLSearchParams): LinkSim {
  const n = (k: string) => Math.max(0, Number(q.get(k)) || 0);
  return { lag: n('lag'), jitter: n('jitter'), loss: Math.min(0.9, n('loss')) };
}

/** One direction of a delayed pipe: FIFO, each item no earlier than now + lag/2 ± jitter. */
class Pipe {
  private last = 0;
  constructor(private s: LinkSim) {}
  push(bin: boolean, f: () => void): void {
    if (bin && this.s.loss > 0 && Math.random() < this.s.loss) return;
    const now = performance.now();
    const at = Math.max(this.last, now + this.s.lag / 2 + (Math.random() * 2 - 1) * this.s.jitter);
    this.last = at;
    setTimeout(f, Math.max(0, at - now));
  }
}

/** Wrap a socket so both directions see the simulated link. Without a sim the socket is returned as is. */
export function simulate(ws: SockLike, s: LinkSim): SockLike {
  if (!s.lag && !s.jitter && !s.loss) return ws;
  const up = new Pipe(s), down = new Pipe(s);
  const w: SockLike = {
    get readyState() { return ws.readyState; },
    get binaryType() { return ws.binaryType; }, set binaryType(v: string) { ws.binaryType = v; },
    onopen: null, onmessage: null, onclose: null, onerror: null,
    send: (d) => up.push(typeof d !== 'string', () => { if (ws.readyState === 1) ws.send(d); }),
    close: (c, r) => ws.close(c, r),
  };
  ws.onopen = (e) => w.onopen?.(e);
  ws.onmessage = (e) => down.push(typeof e.data !== 'string', () => w.onmessage?.(e));
  ws.onclose = (e) => down.push(false, () => w.onclose?.(e));
  ws.onerror = (e) => w.onerror?.(e);
  return w;
}
