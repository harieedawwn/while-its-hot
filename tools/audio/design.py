#!/usr/bin/env python3
"""Render every game sound from tools/audio/recipes.yaml into client/public/sfx/<event>_<n>.ogg (+ .m4a).
Usage: python3 tools/audio/design.py [event ...]     (no args = all events)
Layers: {src: glob under audio-src/ | synth: thump|click|swell|noise, at, start, dur, gain(dB), hp, lp, pitch(semitones),
         drive(dB), fade}. A `variants: N` event picks the k-th file of each glob for take k and jitters pitch ±pitch_jitter."""
import sys, glob, json, math, os, subprocess, shutil
import numpy as np, soundfile as sf, yaml
from scipy import signal
import pyloudnorm as pyln
from pedalboard import Pedalboard, Limiter, Compressor

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SRC, OUT = os.path.join(ROOT, 'audio-src'), os.path.join(ROOT, 'client', 'public', 'sfx')
SR = 48000
db = lambda x: 10 ** (x / 20)

def load(path, start=0.0, dur=None):
    x, sr = sf.read(path, dtype='float32', always_2d=True)
    x = x.mean(axis=1)
    if sr != SR: x = signal.resample_poly(x, SR, sr).astype('float32')
    lead = int(np.argmax(np.abs(x) > 0.04 * np.abs(x).max()))   # recordings start with room silence: `start` counts from the onset
    x = x[max(0, lead - int(0.002 * SR)):]
    a = int(start * SR); b = None if dur is None else a + int(dur * SR)
    return x[a:b]

def pitch(x, semis):
    if not semis: return x
    r = 2 ** (semis / 12)                      # resample = pitch + speed, like tape
    n = int(len(x) / r)
    return signal.resample(x, n).astype('float32') if n > 8 else x

def filt(x, kind, f):
    if not f: return x
    sos = signal.butter(2, f / (SR / 2), btype=kind, output='sos')
    return signal.sosfilt(sos, x).astype('float32')

def synth(l, rng):
    kind, dur = l['synth'], l.get('dur', 0.1)
    t = np.arange(int(dur * SR)) / SR
    if kind == 'thump':                          # sine with fast pitch drop: the weight layer
        f = l.get('f1', 45) + (l.get('f0', 90) - l.get('f1', 45)) * np.exp(-t / l.get('drop', 0.03))
        x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / l.get('decay', dur / 3))
    elif kind == 'click':                        # 2-15 ms transient
        x = rng.standard_normal(len(t)) * np.exp(-t / l.get('decay', 0.002))
    elif kind == 'swell':                        # filtered noise tension: rises then cuts
        x = rng.standard_normal(len(t)) * (t / dur) ** l.get('curve', 2.0)
    else:
        x = rng.standard_normal(len(t)) * np.exp(-t / l.get('decay', dur / 2))
    return x.astype('float32')

def build_layer(l, k, rng, jitter):
    if 'src' in l:
        pats = l['src'] if isinstance(l['src'], list) else [l['src']]   # a list keeps the given order
        files = [f for pt in pats for f in sorted(glob.glob(os.path.join(SRC, pt), recursive=True))]
        files = [f for f in files if '__MACOSX' not in f and not f.lower().endswith(('.7z', '.zip'))]
        if not files: raise SystemExit(f"no source for {l['src']} (run tools/audio/fetch.mjs)")
        x = load(files[k % len(files)], l.get('start', 0), l.get('dur'))
    else:
        x = synth(l, rng)
    x = pitch(x, l.get('pitch', 0) + rng.uniform(-jitter, jitter))
    x = filt(filt(x, 'highpass', l.get('hp')), 'lowpass', l.get('lp'))
    if l.get('drive'): x = np.tanh(x * db(l['drive'])) / np.tanh(db(l['drive']))
    n = len(x); fo = int(l.get('fade', 0.01) * SR)
    if fo and n > fo: x[-fo:] *= np.linspace(1, 0, fo, dtype='float32')
    fi = int(l.get('fade_in', 0.0015) * SR)
    if fi and n > fi: x[:fi] *= np.linspace(0, 1, fi, dtype='float32')
    x = x / (np.abs(x).max() + 1e-9)               # gain is relative to the layer's own peak, so recipes read like a mix
    return x * db(l.get('gain', 0))

def mix(layers):
    n = max(int(l[0] * SR) + len(l[1]) for l in layers)
    y = np.zeros(n, dtype='float32')
    for at, x in layers: y[int(at * SR): int(at * SR) + len(x)] += x
    return y

def loopify(y, xf):
    n = int(xf * SR)
    if len(y) <= 2 * n: return y
    head, tail = y[:n].copy(), y[-n:].copy()
    ramp = np.linspace(0, 1, n, dtype='float32')
    body = y[:-n].copy(); body[:n] = tail * (1 - ramp) + head * ramp   # tail fades into the head: seamless wrap
    return body

def loudness(y):
    pad = np.concatenate([y, np.zeros(max(0, int(0.5 * SR) - len(y)) + int(0.2 * SR), dtype='float32')])
    return pyln.Meter(SR).integrated_loudness(pad)

def normalise(y, lufs, squash=0, ceil=-2.2):
    """Compress (more with `squash` for crest-heavy sources), then find the gain whose limited result hits the target
    (limiter at -2.2 dB: Vorbis overshoot is trimmed again in encode())."""
    y = Pedalboard([Compressor(threshold_db=-22 - squash, ratio=3 + squash / 4, attack_ms=2, release_ms=90)])(y[None, :].astype('float32'), SR)[0]
    lim = Pedalboard([Limiter(threshold_db=ceil, release_ms=60)])
    run = lambda g: lim(np.ascontiguousarray(y * db(g))[None, :].astype('float32'), SR)[0]
    base = loudness(y)
    if not math.isfinite(base): return y
    lo, hi = lufs - base - 12, lufs - base + 30
    for _ in range(16):
        mid = (lo + hi) / 2
        if loudness(run(mid)) < lufs: lo = mid
        else: hi = mid
    return np.clip(run((lo + hi) / 2), -db(-1.0), db(-1.0)).astype('float32')

def trim_lead(y):
    idx = np.argmax(np.abs(y) > 0.003)
    return y[idx:] if idx > 0 else y

def encode(name, y):
    """Write Vorbis (+ AAC fallback). Lossy coding overshoots the limiter on dense low end, so read the .ogg back and
    trim until the decoded file holds -1 dB. (Recipes aim ~2 dB hot on crest-heavy sounds to pay for that.)"""
    ogg = os.path.join(OUT, name + '.ogg')
    for _ in range(4):
        sf.write(ogg, y, SR, format='OGG', subtype='VORBIS')
        peak = float(np.abs(sf.read(ogg, dtype='float32')[0]).max())
        if peak <= db(-1.0): break
        y = y * (db(-1.3) / peak)
    wav = os.path.join(OUT, name + '.wav'); sf.write(wav, y, SR, subtype='PCM_16')
    if shutil.which('ffmpeg'):
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', wav, '-c:a', 'aac', '-b:a', '96k', os.path.join(OUT, name + '.m4a')], check=False)
    os.remove(wav)

def main():
    want = set(sys.argv[1:])
    recipes = yaml.safe_load(open(os.path.join(os.path.dirname(__file__), 'recipes.yaml')))
    os.makedirs(OUT, exist_ok=True)
    mpath = os.path.join(OUT, 'manifest.json')
    manifest = json.load(open(mpath)) if os.path.exists(mpath) else {}
    for ev, r in recipes['events'].items():
        if want and ev not in want: continue
        n = r.get('variants', 1); rng = np.random.default_rng(sum(map(ord, ev)))
        for k in range(n):
            ls = [(l.get('at', 0), build_layer(l, k, rng, r.get('pitch_jitter', 0.3))) for l in r['layers']]
            y = mix(ls)
            if r.get('loop'): y = loopify(y, r['loop'])
            y = trim_lead(y)
            if r.get('tail'): y *= np.concatenate([np.ones(max(0, len(y) - int(r['tail'] * SR))), np.linspace(1, 0, min(len(y), int(r['tail'] * SR)))]).astype('float32')
            encode(f'{ev}_{k}', normalise(y, r['lufs'], r.get('squash', 0)))
        manifest[ev] = {'n': n, 'loop': bool(r.get('loop')), 'lufs': r['lufs']}
        print(f'ok {ev} x{n}')
    json.dump(dict(sorted(manifest.items())), open(mpath, 'w'), indent=1)

if __name__ == '__main__': main()
