#!/usr/bin/env python3
"""Soundtrack for Episode 056, synthesised from scratch (no samples, no
licensed music) and mixed under the narration.

Reuses the instruments and effects from Episode 005's build_audio.py and adds:
running tap water and a filling glass, a bubbly underwater bed inside the
filter, gritty taps as sand and rust land on the pleats, soft "thup" sticks as
smell molecules lock into the carbon, rubbery bounces of germs on the
membrane, a humming UV lamp and a fizzle as the germs are zapped, and a
flowing river past the water treatment plant.

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

DUR = 65.15
OUTRO = 62.0
OUT = os.path.join(HERE, "output")
N = int(SR * DUR)
rs = np.random.default_rng(56)

# scene boundaries (must match episode.js)
KIT_A = (0.0, 12.92)
INSIDE = (12.92, 51.64)
KIT_B = (51.64, OUTRO)


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
def noise(dur, lo, hi, decay=0.0):
    t = T(dur)
    x = fftfilt(rs.standard_normal(len(t)), lo, hi)
    if decay:
        x = x * np.exp(-t * decay)
    return norm(x) * np.clip(t / 0.02, 0, 1) * np.clip((dur - t) / 0.05, 0, 1)


def bubble(f=500):
    t = T(0.12)
    return norm(np.sin(2 * np.pi * np.cumsum(f * (1 + 2.5 * t / 0.12)) / SR) * np.exp(-t * 30))


def hum(dur, f=120):
    t = T(dur)
    x = np.sin(2 * np.pi * f * t) + 0.4 * np.sin(2 * np.pi * 2 * f * t) + 0.2 * np.sin(2 * np.pi * 3 * f * t)
    return norm(x) * np.clip(t / 0.3, 0, 1) * np.clip((dur - t) / 0.3, 0, 1)


def tick(f=1800):
    t = T(0.06)
    return norm(fftfilt(rs.standard_normal(len(t)), f * 0.5, f * 2) * np.exp(-t * 80))


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

    loop(*KIT_A, home, marimba, 1.0)
    loop(*INSIDE, inner, musicbox, 0.85)
    loop(*KIT_B, home, marimba, 1.0)
    place(buf, pad([midi(n) for n in (48, 60, 64, 67, 72)], 3.2) * 0.2, OUTRO)
    for k, m in enumerate([72, 76, 79, 84]):
        place(buf, pluck_bell(midi(m), 2.5) * 0.12, OUTRO + 0.05 + k * 0.12, pan=-0.3 + 0.2 * k)
    place(buf, bass(midi(36), 2.0) * 0.3, OUTRO)
    fade = int(1.2 * SR)
    buf[-fade:] *= np.linspace(1, 0, fade)[:, None]
    return buf


def story_sfx():
    buf = np.zeros((N, 2))
    place(buf, noise(2.1, 800, 5000) * 0.05, 5.55)  # water pouring
    for k in range(8):
        place(buf, bubble(600 + 60 * k) * 0.05, 5.7 + k * 0.24)
    for at in np.arange(13.0, 51.4, 0.37):  # bubbly bed inside the filter
        place(buf, bubble(float(rs.uniform(350, 900))) * 0.035, float(at + rs.uniform(0, 0.2)), pan=float(rs.uniform(-0.6, 0.6)))
    for at in np.arange(16.6, 21.4, 0.21):  # sand and rust landing
        place(buf, tick(float(rs.uniform(1200, 3000))) * 0.07, float(at + rs.uniform(0, 0.1)), pan=float(rs.uniform(-0.5, 0.5)))
    for i in range(18):  # molecules stick in the carbon pores
        place(buf, pop() * 0.07, 29.1 + i * 0.16, pan=float(rs.uniform(-0.4, 0.4)))
    for at in np.arange(34.3, 40.0, 0.5):  # germs bounce on the membrane
        place(buf, boing() * 0.05, float(at + rs.uniform(0, 0.2)), pan=float(rs.uniform(-0.5, 0.5)))
    place(buf, hum(4.0, 110) * 0.05, 41.7)
    place(buf, noise(1.2, 2000, 8000, 3) * 0.07, 43.4)  # fizzle
    place(buf, noise(5.6, 200, 1500) * 0.05, 45.9)  # river
    place(buf, noise(0.6, 1500, 5000) * 0.04, 56.8)
    return buf


def ui_sfx():
    buf = np.zeros((N, 2))
    for at in (1.8, 8.28, 21.66, 25.2, 32.58, 40.14, 45.8, 51.64, 59.78):
        place(buf, whoosh(0.5) * 0.2, at - 0.25)
    place(buf, sparkle(1.3, 34, True, 2) * 0.32, 11.05)
    place(buf, whoosh(0.9, 300, 6000, rev=True) * 0.25, 12.0)
    place(buf, sparkle(0.6, 22, False, 3) * 0.3, 12.92)
    pops = (0.4, 1.85, 3.04, 8.35, 8.7, 9.1, 14.2, 14.8, 14.98, 15.16, 15.34, 15.8, 18.9, 19.76, 20.44, 21.7, 25.4,
            28.14, 29.46, 30.44, 31.08, 33.9, 35.3, 37.1, 38.7, 41.66, 45.8, 46.7, 47.2, 48.3, 49.4, 50.2, 50.9,
            57.0, 57.2, 57.68, 59.8, 60.1, 60.4, OUTRO + 0.3, OUTRO + 0.5, OUTRO + 0.7)
    for at in pops:
        place(buf, pop() * 0.22, at, pan=float(rs.uniform(-0.3, 0.3)))
    place(buf, chime((79, 84, 88)) * 0.24, 6.9)  # JERNIH
    place(buf, chime((79, 84, 88, 91)) * 0.24, 27.56)  # MACAM SPAN
    place(buf, nope() * 0.2, 37.2)  # germ blocked
    place(buf, chime((84, 88, 91)) * 0.24, 43.4)  # KUMAN MATI
    place(buf, boing() * 0.22, 51.66)
    place(buf, chime((79, 84, 88, 91)) * 0.35, 51.7)
    place(buf, sparkle(1.0, 24, False, 8) * 0.28, 51.75)
    place(buf, chime((79, 84, 88)) * 0.24, 53.9)  # PENGAWAL
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
