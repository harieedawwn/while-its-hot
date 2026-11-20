import { FEEL } from '../core/feel';
import { AudioGraph, dbToGain, type Area } from './graph';
import { Bank, type Source } from './bank';
import { EVENTS } from './catalog';
import { audioSettings, setAudioSettings, type AudioSettings } from './settings';
import { Spatial, type Vec3 } from './spatial';
import { VoicePool } from './voices';

const A = FEEL.audio;
export interface PlayOpts {
  /** Extra gain in dB on top of the mix snapshot. */
  db?: number;
  /** Playback-rate multiplier (combo step, speed). Random ±4% is added on top. */
  pitch?: number;
  /** World position: the voice is panned, attenuated and low-passed by distance/occlusion. Omit for 2D (own sounds, UI). */
  pos?: Vec3;
  /** Force one take (audition). */
  take?: number;
  area?: Area;
}
/** What a caller keeps for a loop or a moving emitter. */
export interface Handle {
  stop(fade?: number): void;
  /** Loudness in dB relative to the mix level, smoothed. */
  setDb(db: number, tau?: number): void;
  setRate(r: number): void;
  /** Low-pass cutoff in Hz (e.g. the brazier opening up while held). */
  setCutoff(hz: number): void;
  move(pos: Vec3): void;
}
export type OcclusionProbe = (from: Vec3, to: Vec3) => boolean;

export const rand = (a: number, b: number) => a + Math.random() * (b - a);

/** The audio facade the game talks to: `play(eventId, opts)` / `loop(eventId, opts)`. Gameplay never calls it directly (audio/events.ts, phase 12). */
export class AudioEngine {
  readonly graph = new AudioGraph();
  readonly bank = new Bank(this.graph.ctx);
  readonly pool = new VoicePool();
  readonly ready: Promise<void>;
  private spatials = new Map<number, Spatial>();
  private listener: Vec3 = { x: 0, y: 1.6, z: 0 };
  private probe: OcclusionProbe | null = null;
  private probeAcc = 0;

  constructor() {
    this.graph.autoUnlock();
    this.ready = this.bank.load().then(() => this.warmFallbacks());
  }
  get ctx(): AudioContext { return this.graph.ctx; }
  get running(): boolean { return this.ctx.state === 'running'; }
  get listenerPos(): Vec3 { return this.listener; }

  /** Render procedural stand-ins for events without a recording, one per tick so boot never stalls. */
  private async warmFallbacks(): Promise<void> {
    for (const [ev, def] of Object.entries(EVENTS)) {
      if (this.bank.source(ev) === 'sourced' || !def.fb) continue;
      await this.bank.renderFallback(ev, def.fb);
      await new Promise((r) => setTimeout(r, 0));
    }
  }
  source(ev: string): Source { return this.bank.source(ev); }

  setSettings(p: Partial<AudioSettings>): void {
    setAudioSettings(p);
    if (p.output) this.graph.setOutput(p.output);
    this.graph.setVolumes();
  }
  setArea(a: Area): void { this.graph.setArea(a); }
  duck(db?: number, s?: number): void { this.graph.duck(db, s); }
  muffle(on: boolean): void { this.graph.muffle(on); }
  /** App backgrounded (Capacitor pause): stop the clock so nothing plays behind the home screen. */
  pause(paused: boolean): void { void (paused ? this.ctx.suspend() : this.ctx.resume()); }
  setOcclusionProbe(p: OcclusionProbe | null): void { this.probe = p; }

  setListener(pos: Vec3, yaw: number): void {
    this.listener = pos;
    const l = this.ctx.listener, t = this.ctx.currentTime;
    l.positionX.setValueAtTime(pos.x, t); l.positionY.setValueAtTime(pos.y, t); l.positionZ.setValueAtTime(pos.z, t);
    l.forwardX.setValueAtTime(-Math.sin(yaw), t); l.forwardY.setValueAtTime(0, t); l.forwardZ.setValueAtTime(-Math.cos(yaw), t);
    l.upX.setValueAtTime(0, t); l.upY.setValueAtTime(1, t); l.upZ.setValueAtTime(0, t);
  }

  /** Per frame: occlusion probes at FEEL.audio.spatial.probeHz and the distance filter of live positional voices. */
  update(dt: number): void {
    this.probeAcc += dt;
    if (this.probeAcc < 1 / A.spatial.probeHz) return;
    this.probeAcc = 0;
    for (const sp of this.spatials.values()) {
      if (this.probe) sp.occluded = this.probe(this.listener, sp.position);
      sp.filter(this.ctx, this.listener);
    }
  }

  play(ev: string, o: PlayOpts = {}): Handle | null { return this.start(ev, o, false); }
  loop(ev: string, o: PlayOpts = {}): Handle | null { return this.start(ev, o, true); }

  private start(ev: string, o: PlayOpts, loop: boolean): Handle | null {
    const def = EVENTS[ev];
    if (!def || !this.running) return null;
    const buf = this.bank.take(ev, o.take);
    if (!buf) return null;
    const ctx = this.ctx, now = ctx.currentTime;
    const db = (A.mix[def.mix] ?? 0) + (o.db ?? 0) + rand(-A.vary.db, A.vary.db);
    const gain = dbToGain(db);
    if (!this.pool.admit(ev, gain, now, def.voices, def.gap)) return null;

    const src = ctx.createBufferSource(); src.buffer = buf; src.loop = loop;
    src.playbackRate.value = (o.pitch ?? 1) * (1 + rand(-A.vary.pitch, A.vary.pitch));
    const env = ctx.createGain(); env.gain.value = gain;
    // the per-voice low-pass is only for loops (setCutoff) and positional voices; a 2D one-shot skips the node
    const lp = loop || o.pos ? ctx.createBiquadFilter() : null;
    if (lp) { lp.type = 'lowpass'; lp.frequency.value = 22000; lp.Q.value = 0.4; }
    const tail: AudioNode = lp ?? env;
    src.connect(env); if (lp) env.connect(lp);
    let sp: Spatial | null = null;
    if (o.pos) { sp = new Spatial(ctx, o.pos, audioSettings.output); sp.filter(ctx, this.listener, true); tail.connect(sp.input); sp.out.connect(this.graph.bus[def.bus]); }
    else tail.connect(this.graph.bus[def.bus]);
    if (def.reverb) { const s = ctx.createGain(); s.gain.value = def.reverb * A.send[o.area ?? this.graph.area]; env.connect(s); s.connect(this.graph.sendFor()); }

    let done = false;
    const rec = this.pool.add(ev, now, gain, () => stop(0.02));
    if (sp) this.spatials.set(rec.id, sp);
    const finish = () => { if (done) return; done = true; this.pool.remove(rec); this.spatials.delete(rec.id); try { env.disconnect(); lp?.disconnect(); } catch { /* already gone */ } };
    const stop = (fade = 0.04) => {
      if (done) return;
      env.gain.cancelScheduledValues(ctx.currentTime); env.gain.setTargetAtTime(0, ctx.currentTime, fade / 3);
      try { src.stop(ctx.currentTime + fade * 2); } catch { /* not started */ }
    };
    src.onended = finish;
    // loops start at a random offset so two instances never phase together (AUDIO §3 slide loop)
    src.start(now + 0.005, loop ? Math.random() * buf.duration : 0);
    return {
      stop,
      setDb: (d, tau = 0.05) => env.gain.setTargetAtTime(dbToGain((A.mix[def.mix] ?? 0) + d), ctx.currentTime, tau),
      setRate: (r) => src.playbackRate.setTargetAtTime(r, ctx.currentTime, 0.05),
      setCutoff: (hz) => lp?.frequency.setTargetAtTime(hz, ctx.currentTime, 0.06),
      move: (pos) => sp?.move(ctx, pos),
    };
  }
}

let engine: AudioEngine | null = null;
/** The shared engine (created on first use; the AudioContext resumes on the first touch/click/key). */
export function getAudio(): AudioEngine { return (engine ??= new AudioEngine()); }
