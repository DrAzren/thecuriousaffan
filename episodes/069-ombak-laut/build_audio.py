#!/usr/bin/env python3
"""Soundtrack for Episode 069, synthesised from scratch (no samples, no
licensed music) and mixed under the narration.

Reuses the instruments and effects from Episode 005's build_audio.py and adds:
rolling surf on the beach with seagulls, whooshing wind over the open sea,
gentle lapping ripples, big swelling waves, a squeaky rubber duck, the deep
drag at the bottom of a breaking wave and a foamy crash.

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

DUR = 52.05
OUTRO = 48.9
OUT = os.path.join(HERE, "output")
N = int(SR * DUR)
rs = np.random.default_rng(69)

# scene boundaries (must match episode.js)
PARK_A = (0.0, 10.04)
LAB = (10.04, 39.9)
PARK_B = (39.9, OUTRO)


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


def chirp():
    t = T(0.18)
    f = 3200 + 1400 * np.sin(np.pi * t / 0.18)
    return norm(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * t / 0.18))


def huff(dur=0.28):
    return noise(dur, 300, 2500) * np.sin(np.pi * T(dur) / dur)


def step():
    t = T(0.12)
    return norm(noise(0.12, 80, 900, decay=40) + np.sin(2 * np.pi * 90 * t) * np.exp(-t * 40))


def rise(dur, f0=400, f1=1500):
    t = T(dur)
    f = f0 * (f1 / f0) ** (t / dur)
    return norm(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * t / dur))


def gurgle(f=500):
    t = T(0.16)
    return norm(np.sin(2 * np.pi * np.cumsum(f * (1 + 2.5 * t / 0.16)) / SR) * np.sin(np.pi * t / 0.16))


def bark():
    t = T(0.22)
    f = 520 * np.exp(-t * 3)
    x = np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * 0.4 + noise(0.22, 300, 3000) * 0.6
    return norm(x * np.exp(-t * 9))


def tick(f=1800):
    t = T(0.06)
    return norm(np.sin(2 * np.pi * f * t) * np.exp(-t * 80))


def surf(dur):
    t = T(dur)
    x = noise(dur, 150, 5000)
    env = 0.35 + 0.65 * np.clip(np.sin(2 * np.pi * t / 2.9), 0, 1) ** 2
    return norm(x * env)


def gull():
    t = T(0.5)
    f = 1400 + 500 * np.sin(np.pi * t / 0.5) - 600 * t
    return norm(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * t / 0.5) * (1 + 0.5 * np.sin(2 * np.pi * 30 * t)))


def squeak():
    t = T(0.25)
    f = 1800 + 900 * np.sin(np.pi * t / 0.25)
    return norm(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * t / 0.25))


def crash(dur=2.0):
    t = T(dur)
    return norm(noise(dur, 200, 9000) * np.clip(t / 0.08, 0, 1) * np.exp(-t * 1.6))


def music():
    buf = np.zeros((N, 2))
    beat = 60 / 100
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
    loop(*LAB, inner, musicbox, 0.85)
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
    for a, b in (PARK_A, PARK_B):
        place(buf, surf(b - a) * 0.07, a)
        for at in np.arange(a + 1.0, b - 0.6, 3.1):
            place(buf, gull() * 0.03, float(at + rs.uniform(0, 0.8)), pan=float(rs.uniform(-0.7, 0.7)))
    # open sea: wind, ripples, swells
    place(buf, noise(18.4, 300, 3000) * 0.05, 11.0)
    for at in np.arange(15.4, 17.0, 0.18):
        place(buf, tick(float(rs.uniform(900, 1500))) * 0.02, float(at), pan=float(rs.uniform(-0.6, 0.6)))
    place(buf, surf(10.8) * 0.05, 18.6)
    for at in (25.7, 27.1, 28.5):
        place(buf, squeak() * 0.12, at)
    # the shore: a deep drag, then the crash and foam
    place(buf, noise(2.0, 60, 300) * 0.12, 33.4)
    place(buf, crash() * 0.3, 35.6)
    place(buf, noise(3.0, 2000, 9000, decay=1.2) * 0.05, 37.0)
    return buf


def ui_sfx():
    buf = np.zeros((N, 2))
    for at in (2.2, 6.06, 16.96, 23.5, 29.63, 39.9, 46.58):
        place(buf, whoosh(0.5) * 0.2, at - 0.25)
    place(buf, sparkle(1.3, 34, True, 2) * 0.32, 6.12)
    place(buf, whoosh(0.9, 300, 6000, rev=True) * 0.25, 9.0)
    place(buf, sparkle(0.6, 22, False, 3) * 0.3, 10.04)
    pops = (0.4, 2.22, 3.18, 6.12, 6.42, 6.72, 10.04, 13.9, 17.02, 18.64, 23.56, 25.74, 26.36, 26.74, 29.68, 30.96,
            33.46, 35.42, 46.63, 46.93, 47.23, OUTRO + 0.3, OUTRO + 0.5, OUTRO + 0.7)
    for at in pops:
        place(buf, pop() * 0.22, at, pan=float(rs.uniform(-0.3, 0.3)))
    place(buf, chime((79, 84, 88)) * 0.24, 4.86)  # TAK BERHENTI-HENTI
    place(buf, chime((84, 88, 91)) * 0.28, 11.12)  # ANGIN
    place(buf, chime((79, 84, 88)) * 0.22, 15.94)  # RIAK KECIL
    place(buf, chime((79, 84, 88, 91)) * 0.24, 20.06)  # JADI OMBAK
    place(buf, chime((79, 84, 88)) * 0.22, 28.36)  # ITIK GETAH
    place(buf, chime((84, 88, 91)) * 0.24, 37.46)  # OMBAK PECAH
    place(buf, boing() * 0.22, 39.92)
    place(buf, chime((79, 84, 88, 91)) * 0.35, 39.96)
    place(buf, sparkle(1.0, 24, False, 8) * 0.28, 40.0)
    place(buf, chime((79, 84, 88)) * 0.24, 40.78)
    place(buf, chime((84, 88, 91)) * 0.2, 43.24)
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
