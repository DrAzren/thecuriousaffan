#!/usr/bin/env python3
"""Soundtrack for Episode 042, synthesised from scratch (no samples, no
licensed music) and mixed under the narration.

Reuses the instruments and effects from Episode 005's build_audio.py and adds:
bee buzzes (a wobbly sawtooth hum that follows the bees), sips and slurps up
the tongue, a filling gurgle, mouth-to-mouth "plips", enzyme sparkles, a
fanning whirr from many wings, honey drips into the teaspoon (one per bee),
and wax caps clicking shut.

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

DUR = 81.0
OUTRO = 77.85
OUT = os.path.join(HERE, "output")
N = int(SR * DUR)
rs = np.random.default_rng(42)

# scene boundaries (must match episode.js)
PARK_A = (0.0, 11.6)
FLOWER = (11.6, 27.02)
HIVE = (27.02, 55.7)
SPOON = (55.7, 68.14)
PARK_B = (68.14, OUTRO)


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
def buzz(dur=1.5, f0=190, seed=0):
    r = np.random.default_rng(seed)
    t = T(dur)
    f = f0 * (1 + 0.06 * np.sin(2 * np.pi * (3 + r.uniform(0, 2)) * t) + 0.03 * np.sin(2 * np.pi * 11 * t))
    ph = 2 * np.pi * np.cumsum(f) / SR
    s = 2 * ((ph / (2 * np.pi)) % 1) - 1  # sawtooth
    s = fftfilt(s, 120, 2500)
    return norm(s) * np.clip(t / 0.15, 0, 1) * np.clip((dur - t) / 0.2, 0, 1) * (0.8 + 0.2 * np.sin(2 * np.pi * 4 * t))


def sip(f=600):
    t = T(0.14)
    return norm(np.sin(2 * np.pi * np.cumsum(f * (1 + 1.2 * t / 0.14)) / SR) * np.sin(np.pi * t / 0.14))


def plip(f=900):
    t = T(0.1)
    return norm(np.sin(2 * np.pi * np.cumsum(f * (1 - 0.5 * t / 0.1)) / SR) * np.exp(-t * 35))


def gurgle(dur=2.5):
    out = np.zeros(int(dur * SR))
    r = np.random.default_rng(7)
    for at in np.sort(r.uniform(0, dur - 0.2, 14)):
        s = plip(r.uniform(300, 600)) * r.uniform(0.4, 1)
        i = int(at * SR)
        out[i : i + len(s)] += s[: len(out) - i]
    return norm(out)


def whirr(dur=3.0):
    t = T(dur)
    n = fftfilt(rs.standard_normal(len(t)), 150, 1200) * (0.6 + 0.4 * np.sin(2 * np.pi * 28 * t))
    return norm(n) * np.clip(t / 0.4, 0, 1) * np.clip((dur - t) / 0.5, 0, 1)


def drip(f=520):
    t = T(0.22)
    return norm(np.sin(2 * np.pi * np.cumsum(f * (1 + 1.8 * (t / 0.22) ** 2)) / SR) * np.exp(-t * 16))


def click(f=1800):
    t = T(0.05)
    return norm(np.sin(2 * np.pi * f * t) * np.exp(-t * 120) + 0.3 * fftfilt(rs.standard_normal(len(t)), 1500, 6000) * np.exp(-t * 150))


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
    loop(*FLOWER, home, musicbox, 0.9)
    loop(*HIVE, inner, musicbox, 0.85)
    loop(*SPOON, home, musicbox, 0.9, half=False)
    loop(*PARK_B, home, marimba, 1.05)
    place(buf, pad([midi(n) for n in (48, 60, 64, 67, 72)], 3.2) * 0.2, OUTRO)
    for k, m in enumerate([72, 76, 79, 84]):
        place(buf, pluck_bell(midi(m), 2.5) * 0.12, OUTRO + 0.05 + k * 0.12, pan=-0.3 + 0.2 * k)
    place(buf, bass(midi(36), 2.0) * 0.3, OUTRO)
    fade = int(1.2 * SR)
    buf[-fade:] *= np.linspace(1, 0, fade)[:, None]
    return buf


def story_sfx():
    buf = np.zeros((N, 2))
    # the park bee and the far hive
    place(buf, buzz(0.8, 240, 1) * 0.05, 0.2, pan=0.6)
    place(buf, buzz(3.0, 230, 2) * 0.12, 4.7, pan=0.4)
    place(buf, buzz(2.0, 230, 3) * 0.08, 9.5, pan=-0.3)
    # giant flowers: the bee flies in, sips nectar, fills its honey stomach, flies off
    place(buf, buzz(3.0, 170, 4) * 0.16, 11.6)
    place(buf, whoosh(0.6, 300, 3000, rev=True) * 0.12, 14.4)
    for i, at in enumerate(np.arange(16.6, 20.4, 0.3)):
        place(buf, sip(550 + 40 * (i % 3)) * 0.08, float(at), pan=-0.1)
    place(buf, gurgle(3.0) * 0.1, 21.0)
    place(buf, buzz(2.0, 180, 5) * 0.16, 25.2, pan=0.4)
    # hive: background hum, mouth-to-mouth, enzymes, cells, fanning, caps
    place(buf, buzz(28.0, 150, 6) * 0.04, 27.1)
    for at in (28.4, 30.0, 31.6, 33.2, 34.8):
        place(buf, plip(1000) * 0.14, at)
    place(buf, shimmer(4.0, 9, 2000, 4200) * 0.12, 32.3)
    for i, at in enumerate(np.arange(39.6, 41.4, 0.18)):
        place(buf, plip(600 + 50 * (i % 4)) * 0.08, float(at), pan=0.2)
    place(buf, whirr(4.2) * 0.2, 42.6)
    place(buf, buzz(4.0, 210, 7) * 0.12, 42.6)
    place(buf, shimmer(1.4, 11, 900, 2000) * 0.12, 47.0)
    for i in range(CAPS := 30):
        place(buf, click(1600 + 100 * (i % 4)) * 0.08, 51.7 + i * (2.5 / CAPS), pan=float(rs.uniform(-0.3, 0.3)))
    # teaspoon: one bee, then twelve drips
    place(buf, buzz(7.5, 200, 8) * 0.06, 56.0, pan=0.4)
    place(buf, buzz(4.4, 210, 9) * 0.1, 63.7)
    for i in range(12):
        place(buf, drip(480 + 25 * i) * 0.14, 63.9 + i * 0.3, pan=-0.4 + 0.07 * i)
    place(buf, buzz(2.0, 240, 10) * 0.04, 73.6, pan=0.6)  # the hive far away
    return buf


def ui_sfx():
    buf = np.zeros((N, 2))
    for at in (2.26, 4.7, 7.68, 14.3, 20.58, 25.2, 31.0, 36.62, 39.0, 42.6, 49.94, 55.7, 63.66, 68.14, 72.6, 75.62):
        place(buf, whoosh(0.5) * 0.2, at - 0.25)
    place(buf, sparkle(1.3, 34, True, 2) * 0.32, 9.8)
    place(buf, whoosh(0.9, 300, 6000, rev=True) * 0.25, 10.6)
    place(buf, sparkle(0.6, 22, False, 3) * 0.3, 11.6)
    pops = (0.4, 2.26, 3.12, 6.76, 7.68, 12.6, 14.56, 16.6, 21.64, 24.2, 25.34, 27.02, 28.36, 32.26, 40.2, 41.62, 42.8,
            44.08, 45.22, 47.1, 49.94, 52.12, 55.7, 56.32, 59.26, 63.66, 72.62, 74.26, 75.7, 76.0, 76.3,
            OUTRO + 0.3, OUTRO + 0.5, OUTRO + 0.7)
    for at in pops:
        place(buf, pop() * 0.22, at, pan=float(rs.uniform(-0.3, 0.3)))
    place(buf, chime((79, 84, 88)) * 0.24, 15.36)  # MACAM STRAW!
    place(buf, chime((84, 88, 91)) * 0.26, 19.02)  # NEKTAR!
    place(buf, chime((79, 84, 88)) * 0.24, 22.92)  # PERUT MADU!
    place(buf, chime((79, 84, 88, 91)) * 0.3, 48.76)  # JADILAH MADU!
    place(buf, sparkle(1.0, 24, False, 6) * 0.25, 48.8)
    place(buf, chime((84, 88, 91)) * 0.26, 61.22)  # 1/12
    place(buf, chime((79, 84, 88, 91)) * 0.3, 66.08)  # 12 EKOR LEBAH!
    place(buf, boing() * 0.22, 68.15)
    place(buf, chime((79, 84, 88, 91)) * 0.35, 68.2)
    place(buf, sparkle(1.0, 24, False, 8) * 0.28, 68.25)
    place(buf, nope() * 0.16, 73.74)  # JANGAN KACAU!
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
