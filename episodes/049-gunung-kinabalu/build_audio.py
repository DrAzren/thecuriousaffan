#!/usr/bin/env python3
"""Soundtrack for Episode 049, synthesised from scratch (no samples, no
licensed music) and mixed under the narration.

Reuses the instruments and effects from Episode 005's build_audio.py and adds:
birdsong and a breeze on the Kundasang hillside, a pop-up
counter for the ruler, crunchy hiking footsteps, chilly wind and breath at
the summit, night crickets at Laban Rata, a warm sunrise swell, and forest
drips around the pitcher plant.

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

DUR = 70.15
OUTRO = 67.0
OUT = os.path.join(HERE, "output")
N = int(SR * DUR)
rs = np.random.default_rng(49)

# scene boundaries (must match episode.js)
HILL_A = (0.0, 12.36)
MOUNTAIN = (12.36, 49.6)
FOREST = (49.6, 56.12)
HILL_B = (56.12, OUTRO)


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


def wind(dur, lo=200, hi=1500):
    t = T(dur)
    n = fftfilt(rs.standard_normal(len(t)), lo, hi) * (0.7 + 0.3 * np.sin(2 * np.pi * 0.25 * t))
    return norm(n) * np.clip(t / 0.6, 0, 1) * np.clip((dur - t) / 0.6, 0, 1)


def crunch():
    t = T(0.1)
    return norm(fftfilt(rs.standard_normal(len(t)), 600, 6000) * np.exp(-t * 45))


def cricket(dur):
    t = T(dur)
    env = (np.sin(2 * np.pi * 14 * t) > 0.3) * (np.sin(2 * np.pi * 0.7 * t) > -0.2)
    return norm(np.sin(2 * np.pi * 4300 * t) * onepole(env.astype(float), 600))


def drip(f=1400):
    t = T(0.15)
    return norm(np.sin(2 * np.pi * np.cumsum(f * (1 + 1.5 * t / 0.15)) / SR) * np.exp(-t * 35))


def breath(dur=0.5):
    t = T(dur)
    return norm(fftfilt(rs.standard_normal(len(t)), 400, 2500)) * np.sin(np.pi * t / dur) ** 2


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

    loop(*HILL_A, home, marimba, 1.0)
    loop(*MOUNTAIN, inner, musicbox, 0.85)
    loop(*FOREST, inner, marimba, 0.8)
    loop(*HILL_B, home, marimba, 1.0)
    place(buf, pad([midi(n) for n in (48, 60, 64, 67, 72)], 3.2) * 0.2, OUTRO)
    for k, m in enumerate([72, 76, 79, 84]):
        place(buf, pluck_bell(midi(m), 2.5) * 0.12, OUTRO + 0.05 + k * 0.12, pan=-0.3 + 0.2 * k)
    place(buf, bass(midi(36), 2.0) * 0.3, OUTRO)
    fade = int(1.2 * SR)
    buf[-fade:] *= np.linspace(1, 0, fade)[:, None]
    return buf


def story_sfx():
    buf = np.zeros((N, 2))
    for a, b in ((0.0, 12.0), (56.2, OUTRO)):
        place(buf, wind(b - a, 150, 900) * 0.05, a)
        for at in np.arange(a + 0.5, b - 0.5, 1.7):
            for k in range(3):
                place(buf, chirp(2800 + 600 * k) * 0.03, float(at + k * 0.13 + rs.uniform(0, 0.4)), pan=float(rs.uniform(-0.6, 0.6)))
    for i, at in enumerate(np.arange(23.0, 34.1, 0.31)):
        place(buf, crunch() * 0.07, float(at), pan=0.15 * (1 if i % 2 else -1))
    place(buf, wind(7.0, 200, 2500) * 0.12, 34.16)
    for at in np.arange(34.6, 39.2, 1.1):
        place(buf, breath(0.5) * 0.06, float(at))
    for at in np.arange(39.3, 41.1, 0.42):
        place(buf, breath(0.3) * 0.08, float(at))
    place(buf, cricket(5.0) * 0.025, 41.12)
    place(buf, pad([midi(n) for n in (55, 62, 67, 71)], 3.6) * 0.12, 46.1)
    for at in np.arange(49.8, 56.0, 0.9):
        place(buf, drip(float(rs.uniform(1100, 1800))) * 0.06, float(at + rs.uniform(0, 0.4)), pan=float(rs.uniform(-0.5, 0.5)))
    return buf


def ui_sfx():
    buf = np.zeros((N, 2))
    for at in (2.62, 6.58, 22.82, 34.16, 41.12, 46.12, 49.6, 64.78):
        place(buf, whoosh(0.5) * 0.2, at - 0.25)
    place(buf, sparkle(1.3, 34, True, 2) * 0.32, 10.5)
    place(buf, whoosh(0.9, 300, 6000, rev=True) * 0.25, 11.5)
    place(buf, sparkle(0.6, 22, False, 3) * 0.3, 12.36)
    pops = (0.4, 2.68, 5.28, 6.64, 6.7, 7.0, 8.54, 8.6, 12.42, 20.64, 24.0, 26.06, 28.22, 29.42, 32.06, 34.22, 37.86,
            42.42, 44.92, 47.23, 49.66, 51.54, 62.24, 63.52, 64.8, 65.1, 65.4, OUTRO + 0.3, OUTRO + 0.5, OUTRO + 0.7)
    for at in pops:
        place(buf, pop() * 0.22, at, pan=float(rs.uniform(-0.3, 0.3)))
    for k, at in enumerate(np.linspace(14.0, 17.4, 12)):
        place(buf, pluck_bell(midi(67 + k), 0.4) * 0.06, float(at))
    for i in range(9):
        place(buf, pop() * 0.14, 20.6 + i * 0.14, pan=-0.3 + 0.07 * i)
    place(buf, chime((79, 84, 88)) * 0.26, 17.5)  # PALING TINGGI
    place(buf, chime((79, 84, 88, 91, 96)) * 0.3, 48.56)  # MATAHARI TERBIT
    place(buf, chime((79, 84, 88)) * 0.24, 52.82)  # PALING BESAR
    for k in range(9):
        place(buf, pop() * 0.1, 54.5 + k * 0.1, pan=-0.4 + 0.1 * k)
    place(buf, boing() * 0.22, 56.15)
    place(buf, chime((79, 84, 88, 91)) * 0.35, 56.2)
    place(buf, sparkle(1.0, 24, False, 8) * 0.28, 56.25)
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
