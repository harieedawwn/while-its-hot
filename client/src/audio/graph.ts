import { FEEL } from '../core/feel';
import { audioSettings, type OutputMode } from './settings';
import { makeIr } from './reverb';

export type BusName = 'sfx' | 'world' | 'ui';
export type Area = 'room_small' | 'hall_foundry';
const A = FEEL.audio;
const dbToGain = (db: number) => Math.pow(10, db / 20);
export { dbToGain };

function shaperCurve(drive: number): Float32Array {
  const n = 1024, c = new Float32Array(n), k = dbToGain(drive);
  for (let i = 0; i < n; i++) { const x = (i / (n - 1)) * 2 - 1; c[i] = Math.tanh(k * x) / Math.tanh(k); }
  return c;
}

/**
 * The one AudioContext and everything after the voices:
 *   voice → bus(sfx|world|ui) → mix → output stage (phone high-pass + bass exciter | bypass) → glue comp → limiter → out
 * plus two generated reverbs that voices send into and that return into `mix`.
 */
export class AudioGraph {
  readonly ctx: AudioContext;
  readonly bus: Record<BusName, GainNode>;
  /** Ambience duck sits after the world bus so one-shot emitters duck with the bed. */
  readonly duckNode: GainNode;
  private master: GainNode;
  private mix: GainNode;
  private verbSend: Record<Area, GainNode>;
  private hp: BiquadFilterNode;
  private exciter: GainNode;
  private muffleLp: BiquadFilterNode;
  area: Area = 'hall_foundry';

  constructor() {
    let ctx: AudioContext;
    try { ctx = new AudioContext({ latencyHint: 'interactive' }); } catch { ctx = new AudioContext(); }
    this.ctx = ctx;
    const g = (v = 1) => { const n = ctx.createGain(); n.gain.value = v; return n; };

    this.master = g(audioSettings.master);
    this.mix = g();
    this.bus = { sfx: g(audioSettings.sfx), world: g(audioSettings.world), ui: g(audioSettings.ui) };
    this.duckNode = g();
    this.bus.sfx.connect(this.mix);
    this.bus.world.connect(this.duckNode); this.duckNode.connect(this.mix);
    this.bus.ui.connect(this.mix);

    this.verbSend = {} as Record<Area, GainNode>;
    (Object.keys(A.reverb) as Area[]).forEach((k, i) => {
      const conv = ctx.createConvolver(); conv.buffer = makeIr(ctx, A.reverb[k], 1234 + i * 31);
      const send = g(); send.connect(conv); conv.connect(this.mix);
      this.verbSend[k] = send;
    });

    // output stage: dry through the (phone) high-pass, plus the exciter: 40-150 Hz weight re-synthesised as harmonics a phone speaker can play
    const P = A.phone;
    this.hp = ctx.createBiquadFilter(); this.hp.type = 'highpass'; this.hp.Q.value = 0.6;
    const exLp = ctx.createBiquadFilter(); exLp.type = 'lowpass'; exLp.frequency.value = P.exciterLp;
    const shaper = ctx.createWaveShaper(); shaper.curve = shaperCurve(P.drive) as Float32Array<ArrayBuffer>; shaper.oversample = '2x';
    const exHp = ctx.createBiquadFilter(); exHp.type = 'highpass'; exHp.frequency.value = P.exciterHp;
    this.exciter = g(0);
    const sum = g();
    this.muffleLp = ctx.createBiquadFilter(); this.muffleLp.type = 'lowpass'; this.muffleLp.frequency.value = 22000; this.muffleLp.Q.value = 0.5;
    this.mix.connect(this.muffleLp);
    this.muffleLp.connect(this.hp); this.hp.connect(sum);
    this.muffleLp.connect(exLp); exLp.connect(shaper); shaper.connect(exHp); exHp.connect(this.exciter); this.exciter.connect(sum);

    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = A.glue.threshold; comp.knee.value = A.glue.knee; comp.ratio.value = A.glue.ratio;
    comp.attack.value = A.glue.attack; comp.release.value = A.glue.release;
    const lim = ctx.createDynamicsCompressor();
    lim.threshold.value = A.limiter.threshold; lim.knee.value = 0; lim.ratio.value = A.limiter.ratio;
    lim.attack.value = A.limiter.attack; lim.release.value = A.limiter.release;
    sum.connect(this.master); this.master.connect(comp); comp.connect(lim); lim.connect(ctx.destination);
    this.setOutput(audioSettings.output, true);
  }

  /** Send node a voice connects to for the current area (gain = send amount × the event's reverb). */
  sendFor(area: Area = this.area): GainNode { return this.verbSend[area]; }

  setOutput(mode: OutputMode, immediate = false): void {
    const t = this.ctx.currentTime, k = immediate ? 0.001 : 0.03;
    this.hp.frequency.setTargetAtTime(mode === 'phone' ? A.phone.highpass : 10, t, k);
    this.exciter.gain.setTargetAtTime(mode === 'phone' ? A.phone.mix : 0, t, k);
  }
  setVolumes(): void {
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(audioSettings.master, t, 0.02);
    (['sfx', 'world', 'ui'] as BusName[]).forEach((b) => this.bus[b].gain.setTargetAtTime(audioSettings[b], t, 0.02));
  }
  /** Duck the ambience/emitters by `db` for `s` seconds (AUDIO §1.6). */
  duck(db: number = A.duck.db, s: number = A.duck.s): void {
    const p = this.duckNode.gain, t = this.ctx.currentTime;
    p.cancelScheduledValues(t); p.setTargetAtTime(dbToGain(db), t, 0.04); p.setTargetAtTime(1, t + s, 0.25);
  }
  /** Own death: sweep the whole mix down to a muffled low-pass (AUDIO §3), or open it again. */
  muffle(on: boolean): void {
    const f = this.muffleLp.frequency, t = this.ctx.currentTime;
    f.cancelScheduledValues(t); f.setValueAtTime(f.value, t);
    f.exponentialRampToValueAtTime(on ? A.muffle.hz : 22000, t + (on ? A.muffle.s : 0.25));
  }
  /** Browsers and the Android WebView start suspended: resume on the first touch/click/key. */
  autoUnlock(target: EventTarget = window): void {
    const go = () => {
      void this.ctx.resume();
      if (this.ctx.state === 'running') for (const e of ['pointerdown', 'touchend', 'keydown']) target.removeEventListener(e, go, true);
    };
    for (const e of ['pointerdown', 'touchend', 'keydown']) target.addEventListener(e, go, true);
  }
}
