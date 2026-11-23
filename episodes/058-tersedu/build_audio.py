#!/usr/bin/env python3
"""Soundtrack for Episode 058, synthesised from scratch (no samples, no
licensed music) and mixed under the narration.

Reuses the instruments and effects from Episode 005's build_audio.py and adds:
quick spoon clinks, a boingy "hik" jolt for every hiccup, a soft breathing
whoosh as the lungs fill and empty, a fizzing can, a startled squeak and a
thud as the diaphragm jerks, a snapping door in the throat, a muffled womb
heartbeat and a ticking clock.

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

DUR = 57.7
OUTRO = 54.55
OUT = os.path.join(HERE, "output")
N = int(SR * DUR)
rs = np.random.default_rng(58)

# scene boundaries (must match episode.js)
KIT_A = (0.0, 12.02)
BODY = (12.02, 44.12)
KIT_B = (44.12, OUTRO)


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


def clink(f=3400):
    t = T(0.25)
    return norm((np.sin(2 * np.pi * f * t) + 0.5 * np.sin(2 * np.pi * f * 1.7 * t)) * np.exp(-t * 25))


def hik():
    t = T(0.22)
    f = 700 * (1 - 0.5 * t / 0.22)
    return norm(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 18))


def thump(f=60):
    t = T(0.35)
    return norm(np.sin(2 * np.pi * f * t) * np.exp(-t * 14))


def squeak():
    t = T(0.25)
    return norm(np.sin(2 * np.pi * np.cumsum(1200 + 1400 * t / 0.25) / SR) * np.sin(np.pi * t / 0.25))


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
    loop(*BODY, inner, musicbox, 0.85)
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
    for at in np.arange(0.2, 1.9, 0.45):
        place(buf, clink(float(rs.uniform(3000, 3800))) * 0.08, float(at))
    for at in np.arange(3.7, 5.9, 0.42):
        place(buf, clink(float(rs.uniform(3000, 3800))) * 0.08, float(at))
    for at in (2.9, 7.74, 33.8):
        place(buf, hik() * 0.25, at)
        place(buf, boing() * 0.12, at + 0.02)
    for at in (12.9, 15.8):
        place(buf, noise(1.3, 300, 2000) * 0.035, at)
    place(buf, noise(0.9, 300, 2500) * 0.06, 18.44)  # inhale
    place(buf, noise(1.0, 200, 1500) * 0.05, 19.62)  # exhale
    place(buf, noise(1.0, 3000, 9000) * 0.05, 23.0)  # fizz
    for k in range(6):
        place(buf, pop() * 0.05, 23.1 + k * 0.15)
    place(buf, squeak() * 0.14, 26.42)
    place(buf, thump() * 0.3, 27.18)
    place(buf, whoosh(2.2, 300, 3000) * 0.12, 28.3)
    place(buf, thump(90) * 0.25, 32.42)
    place(buf, noise(0.08, 1500, 5000, 30) * 0.15, 32.42)
    for at in np.arange(36.4, 44.0, 0.85):  # womb heartbeat
        place(buf, thump(55) * 0.12, float(at))
        place(buf, thump(55) * 0.08, float(at + 0.22))
    for at in (38.9, 39.7):
        place(buf, hik() * 0.12, at)
    for at in np.arange(42.2, 44.1, 0.25):
        place(buf, noise(0.04, 2000, 6000, 60) * 0.08, float(at))
    for at in np.arange(48.0, 50.2, 1.1):
        place(buf, clink() * 0.07, float(at))
    return buf


def ui_sfx():
    buf = np.zeros((N, 2))
    for at in (2.05, 8.38, 21.0, 25.94, 28.24, 36.2, 44.12, 52.32):
        place(buf, whoosh(0.5) * 0.2, at - 0.25)
    place(buf, sparkle(1.3, 34, True, 2) * 0.32, 10.1)
    place(buf, whoosh(0.9, 300, 6000, rev=True) * 0.25, 11.1)
    place(buf, sparkle(0.6, 22, False, 3) * 0.3, 12.02)
    pops = (0.4, 2.1, 4.3, 6.08, 8.45, 8.75, 9.1, 12.54, 14.4, 18.44, 19.62, 21.8, 22.98, 24.08, 28.3, 31.4,
            34.72, 36.2, 40.12, 42.6, 48.86, 50.36, 52.35, 52.65, 52.95, OUTRO + 0.3, OUTRO + 0.5, OUTRO + 0.7)
    for at in pops:
        place(buf, pop() * 0.22, at, pan=float(rs.uniform(-0.3, 0.3)))
    place(buf, chime((79, 84, 88)) * 0.24, 16.26)  # DIAFRAGMA
    place(buf, chime((79, 84, 88, 91)) * 0.24, 37.38)  # BAYI PUN TERSEDU
    place(buf, boing() * 0.22, 44.14)
    place(buf, chime((79, 84, 88, 91)) * 0.35, 44.18)
    place(buf, sparkle(1.0, 24, False, 8) * 0.28, 44.22)
    place(buf, chime((79, 84, 88)) * 0.24, 45.38)  # DIAFRAGMA TERKEJUT
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
