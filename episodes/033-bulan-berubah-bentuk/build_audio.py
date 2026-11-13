#!/usr/bin/env python3
"""Soundtrack for Episode 033, synthesised from scratch (no samples, no
licensed music) and mixed under the narration.

Reuses the instruments and effects from Episode 005's build_audio.py and adds:
the night-drive hum, a cartoon "nyam" bite, a light-switch click and a warm
sun swell, shimmering light rays, a slow space pad with an orbit "whirr", a
day-counter tick, a hollow eclipse drone, and a lamp click for the room demo.

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

DUR = 81.9
OUTRO = 78.75
OUT = os.path.join(HERE, "output")
N = int(SR * DUR)
rs = np.random.default_rng(33)


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
def car_hum(dur):
    n = int(dur * SR)
    t = np.arange(n) / SR
    x = 0.5 * np.sin(2 * np.pi * 47 * t + 0.3 * np.sin(2 * np.pi * 0.4 * t)) + 0.25 * np.sin(2 * np.pi * 94 * t)
    x = x + 0.6 * norm(fftfilt(rs.standard_normal(n), 20, 180))
    return norm(x) * np.clip(t / 0.3, 0, 1) * np.clip((dur - t) / 0.3, 0, 1)


def chomp():
    t = T(0.25)
    f = 300 * (1 - 0.5 * t / 0.25)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 18)
    n = fftfilt(rs.standard_normal(len(t)), 800, 4000) * np.exp(-t * 30)
    return norm(s + 0.5 * norm(n))


def click():
    t = T(0.05)
    return fftfilt(rs.standard_normal(len(t)), 1500, 8000) * np.exp(-t * 160)


def swell(dur=1.4, notes=(60, 64, 67, 72)):
    t = T(dur)
    s = sum(np.sin(2 * np.pi * midi(m) * t) for m in notes) / len(notes)
    return s * np.clip(t / (dur * 0.6), 0, 1) ** 2 * np.clip((dur - t) / 0.3, 0, 1)


def shimmer(dur=3.0, seed=4):
    r = np.random.default_rng(seed)
    n = int(dur * SR)
    out = np.zeros(n)
    for at in np.sort(r.uniform(0, dur - 0.3, 40)):
        d = T(0.25)
        s = np.sin(2 * np.pi * r.uniform(2000, 4200) * d) * np.exp(-d * 14)
        i = int(at * SR)
        out[i : i + len(s)] += s[: n - i] * r.uniform(0.3, 1)
    return norm(out) * np.sin(np.pi * np.arange(n) / n) ** 0.5


def whirr(dur=6.5):
    t = T(dur)
    f = 220 + 60 * np.sin(2 * np.pi * t / dur)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * (0.6 + 0.4 * np.sin(2 * np.pi * 3 * t))
    return s * np.sin(np.pi * t / dur) ** 0.8


def tick():
    t = T(0.04)
    return np.sin(2 * np.pi * 2400 * t) * np.exp(-t * 120)


def drone(dur=3.0, f=73.4):
    t = T(dur)
    s = np.sin(2 * np.pi * f * t) + 0.5 * np.sin(2 * np.pi * f * 1.5 * t) + 0.3 * np.sin(2 * np.pi * f * 2.01 * t)
    return norm(s) * np.clip(t / 0.6, 0, 1) * np.clip((dur - t) / 0.6, 0, 1)


# ------------------------------------------------------------------ layers
def music():
    buf = np.zeros((N, 2))
    beat = 60 / 100
    bar = beat * 4
    night = [(50, [62, 65, 69]), (46, [62, 65, 70]), (53, [60, 65, 69]), (48, [60, 64, 67])]
    space = [(45, [64, 69, 72]), (41, [65, 69, 72]), (43, [62, 67, 71]), (40, [64, 67, 71])]
    home = [(48, [60, 64, 67]), (53, [60, 65, 69]), (55, [59, 62, 67]), (48, [60, 64, 67])]
    arp = [0, 1, 2, 1, 0, 2, 1, 2]
    t0, i = 0.0, 0
    while t0 < 10.35:
        root, ch = night[i % 4]
        place(buf, pad([midi(n) for n in ch], bar + 0.6) * 0.14, t0)
        for k, step in enumerate([0, 2, 1, 2]):
            place(buf, musicbox(midi(ch[step] + 12)) * 0.1, t0 + k * beat, pan=0.3 * ((k % 2) * 2 - 1))
        t0 += bar
        i += 1
    t0, i = 10.35, 0
    while t0 < 62.05:
        root, ch = space[i % 4]
        place(buf, pad([midi(n) for n in ch], bar + 0.8) * 0.15, t0)
        for k, step in enumerate([0, 2, 1, 2, 0, 1, 2, 1]):
            place(buf, musicbox(midi(ch[step] + 12)) * 0.07, t0 + k * beat / 2, pan=0.3 * ((k % 2) * 2 - 1))
        place(buf, bass(midi(root - 12), 1.2) * 0.2, t0)
        t0 += bar
        i += 1
    t0, i = 62.05, 0
    while t0 < OUTRO:
        root, ch = home[i % 4]
        place(buf, pad([midi(n) for n in ch], bar + 0.6) * 0.1, t0)
        for k in range(8):
            place(buf, marimba(midi(ch[arp[k]] + 12)) * 0.15, t0 + k * beat / 2, pan=-0.3 + 0.08 * k)
        place(buf, bass(midi(root - 12), 0.5) * 0.26, t0)
        t0 += bar
        i += 1
    place(buf, pad([midi(n) for n in (48, 60, 64, 67, 72)], 3.2) * 0.2, OUTRO)
    for k, m in enumerate([72, 76, 79, 84]):
        place(buf, pluck_bell(midi(m), 2.5) * 0.12, OUTRO + 0.05 + k * 0.12, pan=-0.3 + 0.2 * k)
    place(buf, bass(midi(36), 2.0) * 0.3, OUTRO)
    fade = int(1.2 * SR)
    buf[-fade:] *= np.linspace(1, 0, fade)[:, None]
    return buf


def story_sfx():
    buf = np.zeros((N, 2))
    for a, b in ((0, 10.35), (72.75, OUTRO)):
        place(buf, car_hum(b - a) * 0.12, a)
    place(buf, chomp() * 0.35, 7.16)
    place(buf, chomp() * 0.25, 7.5)
    place(buf, click() * 0.4, 11.6)  # sun off
    place(buf, click() * 0.4, 13.85)  # sun on
    place(buf, swell(1.4) * 0.2, 13.9)
    place(buf, shimmer(3.2, 4) * 0.12, 14.2)
    place(buf, sparkle(1.0, 20, True, 9) * 0.18, 18.2)
    place(buf, whirr(6.6) * 0.07, 21.6)
    for i, at in enumerate(np.linspace(48.6, 52.4, 30)):
        place(buf, tick() * 0.18, float(at), pan=0.2 * np.sin(i))
    place(buf, drone(4.0) * 0.12, 54.0)
    place(buf, swell(1.6, (55, 58, 62)) * 0.15, 59.0)
    place(buf, click() * 0.45, 66.6)  # room lights off
    place(buf, whirr(4.6) * 0.05, 67.8)
    return buf


def ui_sfx():
    buf = np.zeros((N, 2))
    for at in (2.95, 21.3, 28.65, 48.35, 53.0, 57.9):
        place(buf, whoosh(0.5) * 0.25, at - 0.25)
    place(buf, whoosh(0.5, 2500, 300) * 0.25, 4.5)
    place(buf, sparkle(1.3, 34, True, 2) * 0.32, 8.8)
    place(buf, whoosh(0.9, 300, 6000, rev=True) * 0.25, 9.4)
    place(buf, sparkle(0.6, 22, False, 3) * 0.3, 10.3)
    place(buf, whoosh(0.6, 2500, 300) * 0.35, 62.0)
    place(buf, whoosh(0.6, 2500, 300) * 0.35, 72.7)
    pops = (0.5, 2.22, 2.98, 3.44, 4.54, 6.76, 10.54, 11.72, 14.22, 15.34, 19.92, 22.9, 23.6, 25.6, 27.78, 30.94, 33.24, 36.04,
            37.6, 39.86, 43.58, 46.64, 48.58, 48.96, 53.08, 54.3, 56.79, 59.44, 60.72, 62.16, 63.88, 66.04, 66.66, 67.82,
            69.76, 74.0, 76.64, 76.95, 77.25, OUTRO + 0.3, OUTRO + 0.5, OUTRO + 0.7)
    for at in pops:
        place(buf, pop() * 0.26, at, pan=float(rs.uniform(-0.3, 0.3)))
    place(buf, nope() * 0.2, 6.8)  # SIAPA MAKAN BULAN?
    place(buf, chime((79, 84, 88)) * 0.25, 36.04)  # SABIT
    place(buf, chime((84, 88, 91, 96), 0.07) * 0.4, 43.58)  # PURNAMA
    place(buf, sparkle(1.0, 24, False, 5) * 0.28, 43.6)
    place(buf, chime((84, 88, 91)) * 0.3, 52.2)  # 29½
    place(buf, nope() * 0.25, 56.8)  # BUKAN!
    place(buf, chime((79, 84, 88)) * 0.25, 69.76)
    place(buf, boing() * 0.22, 72.9)
    place(buf, chime((79, 84, 88, 91)) * 0.35, 72.95)
    place(buf, sparkle(1.0, 24, False, 8) * 0.3, OUTRO)
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
