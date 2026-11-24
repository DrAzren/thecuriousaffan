#!/usr/bin/env python3
"""Soundtrack for Episode 062, synthesised from scratch (no samples, no
licensed music) and mixed under the narration.

Reuses the instruments and effects from Episode 005's build_audio.py and adds:
soft dough thumps as Mama kneads, a squishy press on the loaf, munching for
the yeast, bubbly blips as carbon dioxide puffs out, rubbery stretches for the
gluten balloons, a rising whistle for the dough, an oven hum and ding, and a
crusty crunch for the bread slice.

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

DUR = 52.7
OUTRO = 49.55
OUT = os.path.join(HERE, "output")
N = int(SR * DUR)
rs = np.random.default_rng(62)

# scene boundaries (must match episode.js)
KIT_A = (0.0, 11.04)
DOUGH = (11.04, 38.84)
KIT_B = (38.84, OUTRO)


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


def thump(f=80):
    t = T(0.3)
    return norm(np.sin(2 * np.pi * f * t) * np.exp(-t * 16))


def blip(f=500):
    t = T(0.12)
    return norm(np.sin(2 * np.pi * np.cumsum(f * (1 + 2.5 * t / 0.12)) / SR) * np.exp(-t * 30))


def stretch(dur=0.8):
    t = T(dur)
    return norm(np.sin(2 * np.pi * np.cumsum(180 + 260 * t / dur + 20 * np.sin(2 * np.pi * 9 * t)) / SR) * np.sin(np.pi * t / dur))


def ding():
    t = T(1.2)
    return norm((np.sin(2 * np.pi * 1760 * t) + 0.5 * np.sin(2 * np.pi * 2640 * t)) * np.exp(-t * 4))


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
    loop(*DOUGH, inner, musicbox, 0.85)
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
    for a, b in ((0.0, 9.0), (38.9, 43.8)):
        for at in np.arange(a + 0.3, b, 1.26):
            place(buf, thump() * 0.08, float(at))
    place(buf, noise(0.6, 200, 1500) * 0.08, 3.8)
    place(buf, boing(0.5) * 0.12, 5.05)
    for at in np.arange(18.4, 20.1, 0.17):
        place(buf, noise(0.08, 600, 3000, 30) * 0.06, float(at))
    for i in range(22):
        place(buf, blip(float(rs.uniform(400, 900))) * 0.06, 20.2 + i * 0.14, pan=float(rs.uniform(-0.5, 0.5)))
    for at in (26.6, 27.4, 28.2):
        place(buf, stretch() * 0.08, at)
    place(buf, whoosh(1.8, 300, 2500) * 0.1, 30.1)
    place(buf, noise(3.0, 60, 400) * 0.05, 33.2)
    place(buf, ding() * 0.14, 34.4)
    place(buf, noise(0.4, 1500, 6000, 8) * 0.12, 36.35)
    return buf


def ui_sfx():
    buf = np.zeros((N, 2))
    for at in (2.22, 7.22, 15.5, 18.38, 24.52, 29.4, 32.08, 36.3, 38.84, 47.28):
        place(buf, whoosh(0.5) * 0.2, at - 0.25)
    place(buf, sparkle(1.3, 34, True, 2) * 0.32, 9.16)
    place(buf, whoosh(0.9, 300, 6000, rev=True) * 0.25, 10.1)
    place(buf, sparkle(0.6, 22, False, 3) * 0.3, 11.04)
    pops = (0.4, 2.26, 3.74, 5.08, 7.27, 7.55, 7.9, 12.48, 13.44, 14.06, 14.82, 18.38, 20.16, 24.52, 28.14,
            32.08, 33.18, 47.32, 47.6, 47.9, OUTRO + 0.3, OUTRO + 0.5, OUTRO + 0.7)
    for at in pops:
        place(buf, pop() * 0.22, at, pan=float(rs.uniform(-0.3, 0.3)))
    place(buf, chime((79, 84, 88)) * 0.24, 5.82)  # MACAM SPAN
    place(buf, chime((79, 84, 88, 91)) * 0.24, 16.14)  # MAKHLUK HIDUP
    place(buf, chime((79, 84, 88)) * 0.24, 22.06)  # GELEMBUNG
    place(buf, chime((84, 88, 91)) * 0.24, 30.04)  # NAIK 2X
    place(buf, chime((79, 84, 88, 91)) * 0.24, 37.34)  # LUBANG
    place(buf, boing() * 0.22, 38.86)
    place(buf, chime((79, 84, 88, 91)) * 0.35, 38.9)
    place(buf, sparkle(1.0, 24, False, 8) * 0.28, 38.94)
    place(buf, chime((79, 84, 88)) * 0.24, 41.12)  # BERJUTA-JUTA
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
