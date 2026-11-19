#!/usr/bin/env python3
"""Verify client/public/sfx/*.ogg: loudness vs recipe target, true-ish peak, length, leading silence, bass energy,
tonality (chime detector) + a spectrogram contact sheet at audio-check/sheet.png. Exit 1 on any FAIL.
Usage: python3 tools/audio/check.py [event ...]"""
import sys, os, json, glob
import numpy as np, soundfile as sf, yaml
from scipy import signal
import pyloudnorm as pyln
import matplotlib; matplotlib.use('Agg')
import matplotlib.pyplot as plt

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SFX = os.path.join(ROOT, 'client', 'public', 'sfx')
OUT = os.path.join(ROOT, 'audio-check')
LIMITS = {'lufs_tol': 1.5, 'peak_db': -1.0, 'lead_ms': 3.0}

def tonality(x, sr):
    """Longest run (s) where one narrow spectral peak above 1 kHz stays put and towers over the rest = a chime / pure ring."""
    if len(x) < 4096: x = np.concatenate([x, np.zeros(4096 - len(x), dtype=x.dtype)])
    f, t, S = signal.spectrogram(x, sr, nperseg=2048, noverlap=1536)
    S = S[f > 1000]
    if S.shape[1] < 3: return 0.0
    bins = S.argmax(axis=0); tall = 10 * np.log10(S.max(axis=0) / (np.median(S, axis=0) + 1e-14) + 1e-12) > 30
    run = best = 0
    for i in range(1, len(bins)):
        run = run + 1 if (tall[i] and tall[i - 1] and abs(int(bins[i]) - int(bins[i - 1])) <= 1) else 0
        best = max(best, run)
    return best * (t[1] - t[0])

def main():
    want = set(sys.argv[1:])
    recipes = {}
    for f in sorted(glob.glob(os.path.join(ROOT, 'tools', 'audio', 'recipes', '*.yaml'))): recipes.update(yaml.safe_load(open(f))['events'])
    manifest = json.load(open(os.path.join(SFX, 'manifest.json')))
    rows, fail = [], 0
    for ev in manifest:
        if want and ev not in want: continue
        target = recipes.get(ev, {}).get('expect', recipes.get(ev, {}).get('lufs', manifest[ev].get('lufs')))
        for k in range(manifest[ev]['n']):
            path = os.path.join(SFX, f'{ev}_{k}.ogg')
            if not os.path.exists(path): rows.append((ev, k, 'MISSING')); fail += 1; continue
            x, sr = sf.read(path, dtype='float32'); x = x if x.ndim == 1 else x.mean(axis=1)
            pad = np.concatenate([x, np.zeros(max(0, int(0.5 * sr) - len(x)))]) 
            lufs = pyln.Meter(sr).integrated_loudness(np.concatenate([pad, np.zeros(int(0.2 * sr))]))
            peak = 20 * np.log10(np.abs(x).max() + 1e-9)
            lead = (np.argmax(np.abs(x) > 0.005)) / sr * 1000
            S = np.abs(np.fft.rfft(x[: int(0.25 * sr)])) ** 2; fr = np.fft.rfftfreq(len(x[: int(0.25 * sr)]), 1 / sr)
            bass = S[fr < 120].sum() / (S.sum() + 1e-12)
            tone = tonality(x, sr)
            issues = []
            if abs(lufs - target) > LIMITS['lufs_tol']: issues.append(f'LUFS {lufs:.1f} vs {target}')
            if peak > LIMITS['peak_db']: issues.append(f'peak {peak:.1f}')
            if not manifest[ev]['loop'] and recipes.get(ev, {}).get('lead_check', True) and lead > LIMITS['lead_ms']: issues.append(f'lead {lead:.1f}ms')
            ring = recipes.get(ev, {}).get('ring', 0.30)        # a designed metal ring (AUDIO §3: Đạt 0.4 s) declares its length
            if tone > ring: issues.append(f'tonal {tone:.2f}s > {ring}s (chime?)')
            if len(x) / sr > 12: issues.append('long')
            rows.append((ev, k, 'FAIL ' + '; '.join(issues) if issues else 'ok', lufs, peak, len(x) / sr, bass, tone, x, sr))
            fail += bool(issues)
    os.makedirs(OUT, exist_ok=True)
    good = [r for r in rows if len(r) > 3]
    firsts = {}; [firsts.setdefault(r[0], r) for r in good]
    cells = list(firsts.values()); cols = 4; nr = max(1, -(-len(cells) // cols))
    fig, axs = plt.subplots(nr, cols, figsize=(cols * 3.4, nr * 2.2), squeeze=False)
    for a in axs.flat: a.axis('off')
    for a, r in zip(axs.flat, cells):
        f, t, S = signal.spectrogram(r[8], r[9], nperseg=1024, noverlap=768)
        a.pcolormesh(t, f, 10 * np.log10(S + 1e-12), vmin=-110, vmax=-30, cmap='magma', shading='auto'); a.set_yscale('symlog', linthresh=500); a.set_ylim(40, 20000)
        a.set_title(f'{r[0]}  {r[3]:.0f} LUFS', fontsize=8); a.axis('on'); a.tick_params(labelsize=6)
    plt.tight_layout(); plt.savefig(os.path.join(OUT, 'sheet.png'), dpi=70)
    for r in rows: print(f'{r[0]:>16}_{r[1]}  {r[2]}' + (f'   {r[3]:.1f} LUFS  {r[4]:.1f} dB  {r[5]:.2f}s  bass {r[6]:.2f}  tone {r[7]:.2f}s' if len(r) > 3 else ''))
    print('FAIL' if fail else 'ALL OK', f'({len(rows)} files)'); sys.exit(1 if fail else 0)

if __name__ == '__main__': main()
