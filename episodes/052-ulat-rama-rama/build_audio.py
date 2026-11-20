#!/usr/bin/env python3
"""Soundtrack for Episode 052, synthesised from scratch (no samples, no
licensed music) and mixed under the narration.

Reuses the instruments and effects from Episode 005's build_audio.py and adds:
park birdsong, a fluttering butterfly, tiny egg pops and a
hatching crack, munching, a skin-shedding stretch, a soft magic shimmer
inside the chrysalis, a ticking calendar, a cracking shell, wings unfolding,
a sipping slurp, and jungle insects for the Rajah Brooke.

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

DUR = 68.95
OUTRO = 65.8
OUT = os.path.join(HERE, "output")
N = int(SR * DUR)
rs = np.random.default_rng(52)

# scene boundaries (must match episode.js)
PARK_A = (0.0, 12.12)
MACRO = (12.12, 52.28)
JUNGLE = (52.28, 55.66)
PARK_B = (55.66, OUTRO)


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
def chirp(f=3200):
    t = T(0.12)
    return norm(np.sin(2 * np.pi * np.cumsum(f * (1 + 0.4 * np.sin(2 * np.pi * 18 * t))) / SR) * np.sin(np.pi * t / 0.12))


def noise(dur, lo, hi, decay=0.0):
    t = T(dur)
    x = fftfilt(rs.standard_normal(len(t)), lo, hi)
    if decay:
        x = x * np.exp(-t * decay)
    return norm(x) * np.clip(t / 0.02, 0, 1) * np.clip((dur - t) / 0.05, 0, 1)


def flutter(dur=1.0, rate=18):
    t = T(dur)
    return norm(fftfilt(rs.standard_normal(len(t)), 200, 1500)) * (0.5 + 0.5 * np.sin(2 * np.pi * rate * t)) ** 4 * np.sin(np.pi * t / dur)


def munch():
    t = T(0.09)
    return norm(fftfilt(rs.standard_normal(len(t)), 800, 6000) * np.exp(-t * 50))


def shimmer(dur=2.5):
    t = T(dur)
    x = sum(np.sin(2 * np.pi * f * t + k) for k, f in enumerate((1568, 1976, 2349, 2637)))
    return norm(x * (0.5 + 0.5 * np.sin(2 * np.pi * 3 * t))) * np.sin(np.pi * t / dur)


def cicada(dur):
    t = T(dur)
    return norm(np.sin(2 * np.pi * 5200 * t) * (0.5 + 0.5 * np.sin(2 * np.pi * 70 * t))) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.5 * t))


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
    loop(*MACRO, inner, musicbox, 0.85)
    loop(*JUNGLE, inner, marimba, 0.8)
    loop(*PARK_B, home, marimba, 1.0)
    place(buf, pad([midi(n) for n in (48, 60, 64, 67, 72)], 3.2) * 0.2, OUTRO)
    for k, m in enumerate([72, 76, 79, 84]):
        place(buf, pluck_bell(midi(m), 2.5) * 0.12, OUTRO + 0.05 + k * 0.12, pan=-0.3 + 0.2 * k)
    place(buf, bass(midi(36), 2.0) * 0.3, OUTRO)
    fade = int(1.2 * SR)
    buf[-fade:] *= np.linspace(1, 0, fade)[:, None]
    return buf


def story_sfx():
    buf = np.zeros((N, 2))
    for a, b in ((0.0, 12.0), (55.7, OUTRO)):
        for at in np.arange(a + 0.5, b - 0.5, 1.8):
            for k in range(3):
                place(buf, chirp(2800 + 600 * k) * 0.03, float(at + k * 0.13 + rs.uniform(0, 0.4)), pan=float(rs.uniform(-0.6, 0.6)))
    for at in (1.0, 6.0, 57.0):
        place(buf, flutter(1.2) * 0.05, at)
    for k in range(6):
        place(buf, pop() * 0.1, 13.86 + k * 0.12, pan=-0.3 + 0.12 * k)
    place(buf, noise(0.25, 1500, 7000, 20) * 0.15, 16.7)
    for at in np.arange(19.6, 24.0, 0.17):
        place(buf, munch() * 0.08, float(at + rs.uniform(0, 0.04)))
    for at in (26.22, 26.66, 27.2, 27.7):
        place(buf, noise(0.3, 400, 3000, 8) * 0.1, at)
    place(buf, noise(1.2, 600, 3000) * 0.06, 31.1)
    place(buf, shimmer(2.6) * 0.06, 33.9)
    for k in range(10):
        place(buf, noise(0.04, 2000, 8000, 60) * 0.06, 37.8 + k * 0.18)
    place(buf, noise(0.35, 800, 5000, 12) * 0.16, 39.3)
    place(buf, noise(1.8, 300, 1500) * 0.06, 44.3)
    place(buf, flutter(1.0) * 0.08, 46.1)
    place(buf, noise(0.8, 300, 1200) * 0.06, 48.5)
    place(buf, cicada(3.4) * 0.025, 52.28)
    place(buf, flutter(3.2, 14) * 0.06, 52.3)
    return buf


def ui_sfx():
    buf = np.zeros((N, 2))
    for at in (2.68, 6.68, 19.44, 28.24, 36.6, 46.76, 52.28, 63.54):
        place(buf, whoosh(0.5) * 0.2, at - 0.25)
    place(buf, sparkle(1.3, 34, True, 2) * 0.32, 10.2)
    place(buf, whoosh(0.9, 300, 6000, rev=True) * 0.25, 11.2)
    place(buf, sparkle(0.6, 22, False, 3) * 0.3, 12.12)
    pops = (0.4, 2.74, 3.18, 6.8, 7.1, 9.3, 15.16, 16.58, 19.5, 23.86, 25.52, 28.3, 30.24, 32.58, 37.72, 42.26, 45.0,
            46.82, 48.42, 50.04, 52.94, 62.32, 63.6, 63.9, 64.2, OUTRO + 0.3, OUTRO + 0.5, OUTRO + 0.7)
    for at in pops:
        place(buf, pop() * 0.22, at, pan=float(rs.uniform(-0.3, 0.3)))
    place(buf, chime((79, 84, 88)) * 0.24, 5.28)  # TAK ADA
    place(buf, chime((79, 84, 88)) * 0.24, 18.54)  # ULAT LAPAR
    place(buf, chime((79, 84, 88)) * 0.24, 22.64)  # MEMBESAR
    place(buf, chime((84, 88, 91)) * 0.26, 34.94)  # BERUBAH
    place(buf, chime((79, 84, 88, 91, 96)) * 0.3, 41.12)  # RAMA-RAMA
    place(buf, chime((79, 84, 88)) * 0.24, 51.08)  # STRAW
    place(buf, chime((84, 88, 91)) * 0.26, 54.6)  # RAJAH BROOKE
    place(buf, boing() * 0.22, 55.7)
    place(buf, chime((79, 84, 88, 91)) * 0.35, 55.75)
    place(buf, sparkle(1.0, 24, False, 8) * 0.28, 55.8)
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
