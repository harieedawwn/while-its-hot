#!/usr/bin/env python3
"""prepare_audio.py — turn raw CC0 recordings into small, clean, game-ready files.

    python3 prepare_audio.py <input files or folders...> --out sounds/ [--group weapon|impact|move|ui] [--name sword_slash]

For each file: mono, trim leading/trailing silence (-55 dB), 5 ms fade-in / 40 ms fade-out,
loudness-normalize to the group target, cap length (weapon 1.6 s, impact 1.2 s, move 0.8 s, ui 0.4 s),
then write <name>_<n>.mp3 (96 kbps, plays everywhere incl. iOS) and .ogg. Prints a ready-to-paste
sfx.loadSamples({...}) map. Needs ffmpeg (present in the sandbox; otherwise `pip install imageio-ffmpeg`).
Pick 2-4 takes per sound for variation. Keep originals out of the shipped game.
"""
import argparse, os, shutil, subprocess, sys, json

TARGET = {'weapon': -14, 'impact': -16, 'move': -22, 'ui': -26}     # integrated loudness, LUFS
MAXLEN = {'weapon': 1.6, 'impact': 1.2, 'move': 0.8, 'ui': 0.4}
EXT = ('.wav', '.ogg', '.mp3', '.flac', '.aif', '.aiff', '.m4a', '.opus')

def ffmpeg():
    f = shutil.which('ffmpeg')
    if f: return f
    try:
        import imageio_ffmpeg; return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        sys.exit('ffmpeg not found: pip install imageio-ffmpeg')

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('inputs', nargs='+'); ap.add_argument('--out', default='sounds')
    ap.add_argument('--group', default='impact', choices=TARGET); ap.add_argument('--name', default=None)
    a = ap.parse_args(); ff = ffmpeg(); os.makedirs(a.out, exist_ok=True)
    files = []
    for p in a.inputs:
        if os.path.isdir(p): files += sorted(os.path.join(r, f) for r, _, fs in os.walk(p) for f in fs if f.lower().endswith(EXT))
        elif p.lower().endswith(EXT): files.append(p)
    if not files: sys.exit('no audio files found')
    out_map = {}
    for i, f in enumerate(files):
        base = a.name or os.path.splitext(os.path.basename(f))[0].lower().replace(' ', '_').replace('-', '_')
        stem = f'{base}_{i + 1}' if a.name else base
        af = (f"silenceremove=start_periods=1:start_threshold=-55dB:start_silence=0.005,"
              f"areverse,silenceremove=start_periods=1:start_threshold=-55dB:start_silence=0.02,areverse,"
              f"atrim=0:{MAXLEN[a.group]},afade=t=in:d=0.005,areverse,afade=t=in:d=0.04,areverse,"
              f"loudnorm=I={TARGET[a.group]}:TP=-1.0:LRA=11")
        for ext, codec in (('mp3', ['-c:a', 'libmp3lame', '-b:a', '96k']), ('ogg', ['-c:a', 'libvorbis', '-q:a', '4'])):
            dst = os.path.join(a.out, f'{stem}.{ext}')
            r = subprocess.run([ff, '-y', '-v', 'error', '-i', f, '-ac', '1', '-ar', '44100', '-af', af, *codec, dst], capture_output=True, text=True)
            if r.returncode: print('FAILED', f, r.stderr[:300]); break
        else:
            key = a.name or base
            out_map.setdefault(key, []).append(f'{a.out.rstrip("/")}/{stem}.mp3')
            print(f'ok  {f} -> {stem}.mp3/.ogg ({os.path.getsize(os.path.join(a.out, stem + ".mp3")) // 1024} KB)')
    print('\nsfx.loadSamples(' + json.dumps(out_map, indent=2) + ');')

if __name__ == '__main__':
    main()
