#!/usr/bin/env python3
"""Soundtrack for Episode 040, synthesised from scratch (no samples, no
licensed music) and mixed under the narration.

Reuses the instruments and effects from Episode 005's build_audio.py and adds:
a colour-swap boing for the tree, a prism shimmer, chomping chloroplasts (one
"nom" for each red or blue light ball eaten), "nope" bounces for green light,
water bloops up the stem, airy puffs, sugar sparkles, oxygen bubbles, a big
breath, a fading shimmer for the old leaf and a soft whoosh as it falls.

    python3 build_audio.py            # -> output/mix.wav (+ stems in output/stems)
Requires numpy and ffmpeg.
"""
import importlib.util
import json
import os
import subprocess
import sys

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
_spec = importlib.util.spec_from_file_location("e005_audio", os.path.join(HERE, "..", "005-bulan-ikut-kereta", "build_audio.py"))
B = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(B)
from_base = ("SR", "T", "place", "onepole", "midi", "marimba", "musicbox", "pad", "bass", "shaker", "pluck_bell", "whoosh", "pop", "sparkle", "chime", "nope", "boing", "write_wav")
globals().update({k: getattr(B, k) for k in from_base})

DUR = 77.5
OUTRO = 74.35
OUT = os.path.join(HERE, "output")
N = int(SR * DUR)
rs = np.random.default_rng(40)

# scene boundaries (must match episode.js)
PARK_A = (0.0, 10.62)
LAB = (10.62, 21.74)
LEAF = (21.74, 36.62)
FACTORY = (36.62, 65.08)
PARK_B = (65.08, OUTRO)


def fftfilt(x, lo=0.0, hi=None):
    """Band-limit a signal with a soft-edged FFT mask (fast for long noise)."""
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    m = np.ones_like(f)
    if lo > 0:
        m *= 1 / (1 + (lo / np.maximum(f, 1e-3)) ** 4)
    if hi:
        m *= 1 / (1 + (f / hi) ** 4)
    return np.fft.irfft(X * m, len(x))


def norm(x):
    return x / (np.abs(x).max() + 1e-9)


# ------------------------------------------------------------------ sfx
def bloop(f=420):
    t = T(0.18)
    return norm(np.sin(2 * np.pi * np.cumsum(f * (1 + 1.5 * t / 0.18)) / SR) * np.exp(-t * 18))


def nom(f=300):
    t = T(0.16)
    env = np.sin(np.pi * t / 0.16) ** 2
    return norm(np.sin(2 * np.pi * np.cumsum(f * (1 - 0.4 * t / 0.16)) / SR) * env + 0.25 * fftfilt(rs.standard_normal(len(t)), 300, 1500) * env)


def bounce(f=900):
    t = T(0.22)
    return norm(np.sin(2 * np.pi * np.cumsum(f * (1 + 0.8 * np.sin(np.pi * t / 0.22))) / SR) * np.exp(-t * 10))


def shimmer(dur=1.5, seed=4, lo=2200, hi=4200, n=18):
    r = np.random.default_rng(seed)
    m = int(dur * SR)
    out = np.zeros(m)
    for at in np.sort(r.uniform(0, dur - 0.3, n)):
        d = T(0.25)
        s = np.sin(2 * np.pi * r.uniform(lo, hi) * d) * np.exp(-d * 14)
        i = int(at * SR)
        out[i : i + len(s)] += s[: m - i] * r.uniform(0.3, 1)
    return norm(out) * np.sin(np.pi * np.arange(m) / m) ** 0.5


def puff(dur=0.5):
    t = T(dur)
    return norm(fftfilt(rs.standard_normal(len(t)), 400, 2500)) * np.sin(np.pi * t / dur) ** 2


def breath(dur=1.4):
    t = T(dur)
    return norm(fftfilt(rs.standard_normal(len(t)), 600, 3500)) * np.sin(np.pi * t / dur) ** 1.5


# ------------------------------------------------------------------ layers
def music():
    buf = np.zeros((N, 2))
    beat = 60 / 104
    bar = beat * 4
    home = [(48, [60, 64, 67]), (53, [60, 65, 69]), (55, [59, 62, 67]), (48, [60, 64, 67])]
    inner = [(45, [64, 69, 72]), (41, [65, 69, 72]), (43, [62, 67, 71]), (45, [64, 69, 72])]
    arp = [0, 1, 2, 1, 0, 2, 1, 2]

    def loop(a, b, chords, inst, gain=1.0, half=True):
        t0, i = a, 0
        while t0 < b - 0.3:
            root, ch = chords[i % 4]
            place(buf, pad([midi(n) for n in ch], max(1.6, min(bar + 0.6, b - t0 + 0.4))) * 0.11 * gain, t0)
            for k in range(8 if half else 4):
                at = t0 + k * (beat / 2 if half else beat)
                if at < b - 0.1:
                    place(buf, inst(midi(ch[arp[k]] + 12)) * 0.1 * gain, at, pan=-0.3 + 0.08 * k)
            place(buf, bass(midi(root - 12), 0.5) * 0.2 * gain, t0)
            t0 += bar
            i += 1

    loop(*PARK_A, home, marimba, 1.0)
    loop(*LAB, inner, musicbox, 0.9)
    loop(*LEAF, inner, musicbox, 0.9, half=False)
    loop(*FACTORY, home, musicbox, 0.9)
    loop(*PARK_B, home, marimba, 1.05)
    place(buf, pad([midi(n) for n in (48, 60, 64, 67, 72)], 3.2) * 0.2, OUTRO)
    for k, m in enumerate([72, 76, 79, 84]):
        place(buf, pluck_bell(midi(m), 2.5) * 0.12, OUTRO + 0.05 + k * 0.12, pan=-0.3 + 0.2 * k)
    place(buf, bass(midi(36), 2.0) * 0.3, OUTRO)
    fade = int(1.2 * SR)
    buf[-fade:] *= np.linspace(1, 0, fade)[:, None]
    return buf


def balls():
    """Same schedule as episode.js: a light ball every 0.2 s from 24.9 s."""
    out, i, tl = [], 0, 24.9
    while tl < 34.0:
        c = (2 if i % 2 else 0) if tl < 28.0 else [1, 0, 1, 2, 1][i % 5]
        out.append((tl + 0.85, c))
        tl += 0.2
        i += 1
    return out


def story_sfx():
    buf = np.zeros((N, 2))
    # the tree tries other colours
    place(buf, boing() * 0.2, 5.8)
    place(buf, boing() * 0.2, 7.45)
    place(buf, boing() * 0.15, 8.5)
    # light lab: white beam, prism fan
    place(buf, shimmer(1.0, 3, 1500, 3000) * 0.12, 10.7)
    place(buf, shimmer(1.4, 5, 2000, 4200) * 0.14, 13.9)
    # inside the leaf: noms for red/blue, bounces for green
    for k, (ta, c) in enumerate(balls()):
        if c == 1:
            place(buf, bounce(800 + 60 * (k % 4)) * 0.07, ta, pan=0.2)
        else:
            place(buf, nom(260 + 30 * (k % 3)) * 0.1, ta, pan=-0.2)
    # factory: rays, water, air, sugar, growth, oxygen, breath
    place(buf, shimmer(1.2, 7, 1800, 3600) * 0.12, 36.7)
    for i, at in enumerate(np.arange(40.5, 43.4, 0.22)):
        place(buf, bloop(500 + 50 * (i % 4)) * 0.09, float(at), pan=0.1)
    for i, at in enumerate(np.arange(42.8, 45.4, 0.3)):
        place(buf, puff(0.4) * 0.08, float(at), pan=-0.4)
    place(buf, sparkle(1.4, 20, False, 4) * 0.2, 45.6)
    place(buf, whoosh(1.0, 200, 3000, rev=True) * 0.15, 47.4)
    for i, at in enumerate(np.arange(51.9, 55.6, 0.28)):
        place(buf, bloop(700 + 80 * (i % 3)) * 0.07, float(at), pan=0.3)
    place(buf, breath(1.5) * 0.2, 54.1)
    # the old leaf fades yellow and falls
    place(buf, shimmer(3.5, 9, 900, 1800) * 0.1, 58.8)
    place(buf, whoosh(1.6, 300, 2500) * 0.18, 63.3)
    return buf


def ui_sfx():
    buf = np.zeros((N, 2))
    for at in (2.3, 5.28, 21.74, 25.2, 30.8, 36.62, 40.4, 43.4, 45.5, 47.4, 51.36, 56.62, 63.0, 65.08, 68.7, 72.06):
        place(buf, whoosh(0.5) * 0.2, at - 0.25)
    place(buf, sparkle(1.3, 34, True, 2) * 0.32, 8.9)
    place(buf, whoosh(0.9, 300, 6000, rev=True) * 0.25, 9.7)
    place(buf, sparkle(0.6, 22, False, 3) * 0.3, 10.62)
    pops = (0.4, 2.3, 3.8, 5.84, 7.5, 11.56, 13.96, 15.66, 16.98, 17.96, 18.76, 19.64, 20.32, 21.0, 21.74, 23.98,
            26.28, 31.68, 33.68, 36.62, 38.82, 41.16, 41.8, 42.7, 43.56, 45.9, 47.46, 53.18, 57.26, 58.78, 60.44,
            68.86, 72.1, 72.4, 72.7, OUTRO + 0.3, OUTRO + 0.5, OUTRO + 0.7)
    for at in pops:
        place(buf, pop() * 0.22, at, pan=float(rs.uniform(-0.3, 0.3)))
    place(buf, nope() * 0.16, 29.4)  # HIJAU TAK DIMAKAN!
    place(buf, chime((79, 84, 88)) * 0.26, 34.8)  # DAUN NAMPAK HIJAU!
    place(buf, chime((79, 84, 88, 91)) * 0.3, 49.7)  # FOTOSINTESIS!
    place(buf, sparkle(1.0, 24, False, 6) * 0.25, 49.8)
    place(buf, chime((84, 88, 91)) * 0.24, 54.16)  # UDARA BERSIH!
    place(buf, boing() * 0.22, 65.1)
    place(buf, chime((79, 84, 88, 91)) * 0.35, 65.15)
    place(buf, sparkle(1.0, 24, False, 8) * 0.28, 65.2)
    place(buf, sparkle(1.0, 24, False, 9) * 0.3, OUTRO)
    return buf


def load_narration():
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", os.path.join(HERE, "audio", "narration.mp3"), "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"], check=True, capture_output=True).stdout
    v = np.frombuffer(raw, dtype=np.float32).astype(np.float64)
    out = np.zeros(N)
    out[: min(N, len(v))] = v[:N]
    return out


def duck_gain(voice, depth=0.55):
    e = onepole(np.abs(voice), 8)
    talking = np.clip((20 * np.log10(e + 1e-6) + 42) / 12, 0, 1)
    talking = onepole(talking, 2.5)
    return 1 - depth * talking


def main():
    os.makedirs(os.path.join(OUT, "stems"), exist_ok=True)
    voice = load_narration()
    m = music() * duck_gain(voice)[:, None]
    story = story_sfx() * duck_gain(voice, 0.35)[:, None]
    ui = ui_sfx()
    for name, b in (("music", m), ("story", story), ("sfx", ui)):
        write_wav(os.path.join(OUT, "stems", name + ".wav"), b)
    v = np.stack([voice, voice], 1)
    mix = v * 1.0 + m * 0.55 + story * 0.6 + ui * 0.55
    mix /= max(1.0, np.abs(mix).max() / 0.95)
    pre = os.path.join(OUT, "stems", "premix.wav")
    write_wav(pre, mix)
    r = subprocess.run(["ffmpeg", "-hide_banner", "-i", pre, "-af", "loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json", "-f", "null", "-"], capture_output=True, text=True)
    js = json.loads(r.stderr[r.stderr.rindex("{") :])
    af = (f"loudnorm=I=-14:TP=-1.5:LRA=11:measured_I={js['input_i']}:measured_TP={js['input_tp']}:"
          f"measured_LRA={js['input_lra']}:measured_thresh={js['input_thresh']}:offset={js['target_offset']}:linear=true")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", pre, "-af", af + ",aresample=48000,alimiter=limit=0.84:level=false:attack=1:release=60", "-c:a", "pcm_s24le", os.path.join(OUT, "mix.wav")], check=True)
    print("wrote", os.path.join(OUT, "mix.wav"))


if __name__ == "__main__":
    sys.exit(main())
