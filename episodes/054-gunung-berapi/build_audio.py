#!/usr/bin/env python3
"""Soundtrack for Episode 054, synthesised from scratch (no samples, no
licensed music) and mixed under the narration.

Reuses the instruments and effects from Episode 005's build_audio.py and adds:
park birdsong, a sloshing shaken bottle, a cap pop and a
fizzing foam fountain, a deep earth rumble, bubbling magma, a rising pressure
whine, a huge BOOM with crackling rocks and a long roar, sizzling lava, a
hissing cool-down, and wind on the warning sign.

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

DUR = 72.85
OUTRO = 69.7
OUT = os.path.join(HERE, "output")
N = int(SR * DUR)
rs = np.random.default_rng(54)

# scene boundaries (must match episode.js)
PARK_A = (0.0, 13.18)
EARTH = (13.18, 58.52)
PARK_B = (58.52, OUTRO)


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


def rumble(dur, lo=25, hi=160):
    t = T(dur)
    return norm(fftfilt(rs.standard_normal(len(t)), lo, hi)) * np.clip(t / 0.6, 0, 1) * np.clip((dur - t) / 0.6, 0, 1)


def blub(f=300):
    t = T(0.12)
    return norm(np.sin(2 * np.pi * np.cumsum(f * (1 + 2 * t / 0.12)) / SR) * np.exp(-t * 35))


def whine(dur, f0=200, f1=900):
    t = T(dur)
    return norm(np.sin(2 * np.pi * np.cumsum(f0 + (f1 - f0) * (t / dur) ** 2) / SR)) * np.clip(t / 0.3, 0, 1)


def boom():
    t = T(2.2)
    x = np.sin(2 * np.pi * np.cumsum(70 * np.exp(-t * 1.2) + 25) / SR) * np.exp(-t * 1.6)
    x = x + 0.8 * fftfilt(rs.standard_normal(len(t)), 30, 900) * np.exp(-t * 1.4)
    return norm(x)


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
    loop(*EARTH, inner, musicbox, 0.8)
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
    for at in np.arange(0.4, 3.0, 1.4):
        for k in range(3):
            place(buf, chirp(2800 + 600 * k) * 0.03, float(at + k * 0.13), pan=float(rs.uniform(-0.6, 0.6)))
    for at in np.arange(3.7, 5.1, 0.14):
        place(buf, noise(0.1, 300, 2000, 25) * 0.08, float(at))
    place(buf, pop() * 0.3, 5.3)
    place(buf, noise(3.4, 2000, 9000) * 0.12, 5.3)  # fizz
    place(buf, rumble(7.8) * 0.12, 13.2)
    for at in np.arange(21.5, 30.0, 0.35):
        place(buf, blub(float(rs.uniform(180, 380))) * 0.08, float(at + rs.uniform(0, 0.15)), pan=float(rs.uniform(-0.3, 0.3)))
    for at in np.arange(28.4, 35.3, 0.18):
        place(buf, blub(float(rs.uniform(300, 600))) * 0.06, float(at))
    place(buf, whine(5.0) * 0.06, 30.4)
    place(buf, rumble(5.0, 20, 120) * 0.15, 30.4)
    place(buf, boom() * 0.6, 36.05)
    for at in np.arange(36.3, 46.6, 0.11):
        place(buf, noise(0.05, 1500, 7000, 60) * 0.05, float(at + rs.uniform(0, 0.05)), pan=float(rs.uniform(-0.6, 0.6)))
    place(buf, rumble(10.4, 30, 300) * 0.18, 36.3)
    place(buf, noise(6.0, 800, 4000) * 0.04, 39.5)  # lava sizzle
    place(buf, noise(1.8, 2000, 8000) * 0.08, 54.1)  # cool hiss
    for at in np.arange(58.6, 62.9, 1.4):
        for k in range(3):
            place(buf, chirp(2800 + 600 * k) * 0.03, float(at + k * 0.13), pan=float(rs.uniform(-0.6, 0.6)))
    return buf


def ui_sfx():
    buf = np.zeros((N, 2))
    for at in (2.2, 5.24, 8.94, 21.02, 30.08, 39.08, 46.74, 53.76, 58.52, 62.98, 67.44):
        place(buf, whoosh(0.5) * 0.2, at - 0.25)
    place(buf, sparkle(1.3, 34, True, 2) * 0.32, 11.3)
    place(buf, whoosh(0.9, 300, 6000, rev=True) * 0.25, 12.3)
    place(buf, sparkle(0.6, 22, False, 3) * 0.3, 13.18)
    pops = (0.4, 2.26, 3.66, 9.05, 9.35, 9.7, 13.24, 15.06, 17.24, 21.08, 23.32, 25.56, 30.14, 31.7, 40.46, 42.34, 44.06,
            46.8, 47.82, 53.82, 55.66, 63.46, 64.54, 67.5, 67.8, 68.1, OUTRO + 0.3, OUTRO + 0.5, OUTRO + 0.7)
    for at in pops:
        place(buf, pop() * 0.22, at, pan=float(rs.uniform(-0.3, 0.3)))
    for k in range(26):
        place(buf, pop() * 0.08, 51.82 + k * 0.05, pan=-0.4 + 0.03 * k)
    place(buf, chime((79, 84, 88)) * 0.24, 5.52)  # MEMANCUT
    place(buf, chime((79, 84, 88)) * 0.26, 20.18)  # MAGMA
    place(buf, chime((79, 84, 88)) * 0.24, 29.34)  # BANYAK GAS
    place(buf, chime((79, 84, 88, 91)) * 0.26, 57.38)  # TANAH SUBUR
    place(buf, boing() * 0.22, 58.55)
    place(buf, chime((79, 84, 88, 91)) * 0.35, 58.6)
    place(buf, sparkle(1.0, 24, False, 8) * 0.28, 58.65)
    place(buf, nope() * 0.18, 63.46)
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
