import { BALANCE } from '../balance';

/** Ping/pong clock sync: keep the N lowest-RTT samples, offset = median (TECH §4). serverNow = local + offset. */
export class ClockSync {
  private samples: { rtt: number; off: number }[] = [];
  offset = 0; rtt = 0; ready = false;
  /** c = local send time, s = server time at reply, now = local receive time (all ms). */
  add(c: number, s: number, now: number): void {
    const rtt = now - c; if (rtt < 0) return;
    this.samples.push({ rtt, off: s + rtt / 2 - now });
    this.samples.sort((a, b) => a.rtt - b.rtt);
    this.samples.length = Math.min(this.samples.length, BALANCE.net.clockKeep);
    const offs = this.samples.map((x) => x.off).sort((a, b) => a - b);
    this.offset = offs[Math.floor(offs.length / 2)];
    this.rtt = this.samples[0].rtt; this.ready = true;
  }
  serverNow(local: number): number { return local + this.offset; }
}
