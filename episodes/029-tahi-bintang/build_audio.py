#!/usr/bin/env python3
"""Soundtrack for Episode 029, synthesised from scratch (no samples, no
licensed music) and mixed under the narration.

Reuses the instruments and effects from Episode 005's build_audio.py and adds
space sounds: a soft "fssh" for every shooting star on screen, a shimmering
comet pass, the sizzle of the dust grain heating up and its burn-out crackle.

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
from_base = ("SR", "T", "place", "env_adsr", "onepole", "midi", "marimba", "musicbox", "pad", "bass", "shaker", "pluck_bell", "whoosh", "pop", "sparkle", "chime", "nope", "boing", "write_wav")
globals().update({k: getattr(B, k) for k in from_base})

DUR = 62.1
OUTRO = 58.9
OUT = os.path.join(HERE, "output")
N = int(SR * DUR)
rs = np.random.default_rng(29)

CAR = [(0, 13.1), (51.45, OUTRO)]  # road sections (car ambience)


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


# --------------------------------------------------------------- space sfx
def fssh(dur=0.7, seed=1, bright=1.0):
    """Shooting star: a soft falling hiss with a shimmer on top."""
    r = np.random.default_rng(seed)
    n = int(dur * SR)
    t = np.arange(n) / SR
    hiss = fftfilt(r.standard_normal(n), 2500, 9000)
    e = np.clip(t / 0.06, 0, 1) * np.exp(-t * 4.5)
    f = 2600 * (900 / 2600) ** (t / dur)
    tone = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 5) * 0.4
    return norm(norm(hiss) * e * 0.8 + tone * bright)


def sizzle(dur=1.6, seed=5):
    """Dust grain heating up in the air: rising crackly sizzle."""
    r = np.random.default_rng(seed)
    n = int(dur * SR)
    t = np.arange(n) / SR
    x = fftfilt(r.standard_normal(n), 1800, 8000)
    crack = (r.random(n) < 0.0025).astype(float) * r.uniform(0.5, 1, n)
    crack = np.convolve(crack, np.exp(-np.arange(200) / 30), mode="same")
    e = (t / dur) ** 1.5
    return norm((norm(x) * 0.6 + norm(crack) * 0.5) * e * np.clip((dur - t) / 0.15, 0, 1))


def car_layer():
    buf = np.zeros((N, 2))
    t = np.arange(N) / SR
    hum = 0.5 * np.sin(2 * np.pi * 47 * t + 0.3 * np.sin(2 * np.pi * 0.4 * t)) + 0.25 * np.sin(2 * np.pi * 94 * t)
    rumble = norm(fftfilt(rs.standard_normal(N), 20, 180))
    tyre = norm(fftfilt(rs.standard_normal(N), 350, 700))
    car = rumble * 0.55 + hum * 0.18 + tyre * 0.12
    buf += np.stack([car, np.roll(car, 37)], 1)
    lvl = np.zeros(N)
    for a, b, g in [(0, 5.3, 0.5), (5.3, 11.0, 1.0), (11.0, 13.1, 0.5), (51.45, 54.85, 1.0), (54.85, OUTRO, 0.5)]:
        lvl[int(a * SR) : int(b * SR)] = g
    lvl = onepole(lvl, 3)
    return buf * lvl[:, None]


# ------------------------------------------------------------------ layers
def music():
    buf = np.zeros((N, 2))
    beat = 60 / 100
    bar = beat * 4
    night = [(53, [65, 69, 72]), (50, [62, 65, 69]), (46, [62, 65, 70]), (48, [60, 64, 67])]
    happy = [(53, [65, 69, 72]), (48, [64, 67, 72]), (50, [65, 69, 74]), (46, [65, 70, 74])]
    arp = [0, 1, 2, 1, 0, 2, 1, 2]
    t0, i = 0.0, 0
    while t0 < 13.1:
        root, ch = night[i % 4]
        place(buf, pad([midi(n) for n in ch], bar + 0.6) * 0.15, t0)
        for k, step in enumerate([0, 2, 1, 2]):
            place(buf, musicbox(midi(ch[step] + 12)) * 0.12, t0 + k * beat, pan=0.3 * ((k % 2) * 2 - 1))
        t0 += bar
        i += 1
    # space: dreamy bells over a soft band
    t0, i = 13.1, 0
    while t0 < 51.45:
        root, ch = happy[i % 4]
        place(buf, pad([midi(n) for n in ch], bar + 0.6) * 0.12, t0)
        for k in range(8):
            place(buf, marimba(midi(ch[arp[k]] + 12)) * 0.15, t0 + k * beat / 2, pan=-0.35 + 0.1 * k)
        for k in (0, 4):
            place(buf, pluck_bell(midi(ch[2] + 24), 1.2) * 0.06, t0 + k * beat / 2 + beat / 4, pan=0.4)
        for k in (0, 2):
            place(buf, bass(midi(root - 12) if k == 0 else midi(root - 5), 0.6) * 0.28, t0 + k * beat)
        for k in range(8):
            place(buf, shaker() * (0.4 if k % 2 else 0.25), t0 + k * beat / 2, pan=0.4)
        t0 += bar
        i += 1
    t0, i = 51.45, 0
    while t0 < OUTRO:
        root, ch = happy[i % 4]
        place(buf, pad([midi(n) for n in ch], bar + 0.6) * 0.13, t0)
        for k in range(4):
            place(buf, marimba(midi(ch[[0, 2, 1, 2][k]] + 12)) * 0.15, t0 + k * beat, pan=0.25 * ((k % 2) * 2 - 1))
        place(buf, bass(midi(root - 12), 0.9) * 0.25, t0)
        t0 += bar
        i += 1
    place(buf, pad([midi(n) for n in (53, 65, 69, 72, 77)], 3.2) * 0.2, OUTRO)
    for k, m in enumerate([77, 81, 84, 89]):
        place(buf, pluck_bell(midi(m), 2.5) * 0.12, OUTRO + 0.05 + k * 0.12, pan=-0.3 + 0.2 * k)
    place(buf, bass(midi(41), 2.0) * 0.3, OUTRO)
    fade = int(1.2 * SR)
    buf[-fade:] *= np.linspace(1, 0, fade)[:, None]
    return buf


def space_sfx():
    buf = np.zeros((N, 2))
    # shooting stars seen from the car
    place(buf, fssh(0.8, 1) * 0.3, 2.55, pan=-0.3)
    place(buf, fssh(0.6, 2) * 0.2, 4.3, pan=-0.5)
    place(buf, fssh(0.5, 3) * 0.18, 5.6, pan=0.4)
    place(buf, fssh(1.6, 4, 1.3) * 0.42, 7.25, pan=0.5)
    place(buf, fssh(0.6, 5) * 0.2, 9.7, pan=-0.2)
    # comet passing the Sun, Earth entering the dust
    place(buf, sparkle(2.5, 40, False, 21) * 0.18, 27.6, pan=0.3)
    place(buf, whoosh(1.4, 300, 2500) * 0.25, 27.9, pan=0.2)
    r = np.random.default_rng(6)
    for i in range(14):
        place(buf, fssh(0.4, 30 + i) * 0.12, 33.3 + i * 0.2, pan=float(r.uniform(-0.6, 0.6)))
    # the grain: falls, heats, burns
    place(buf, whoosh(2.4, 200, 1400) * 0.25, 36.4)
    place(buf, sizzle(1.9, 7) * 0.35, 38.2)
    place(buf, fssh(1.2, 8, 1.4) * 0.4, 39.5)
    # tiny meteors in the air behind Affan
    for i in range(16):
        place(buf, fssh(0.35, 50 + i) * 0.08, 43.0 + i * 0.5, pan=float(r.uniform(-0.6, 0.6)))
    # meteor shower over the car
    for i in range(18):
        place(buf, fssh(0.5, 70 + i) * 0.13, 51.6 + i * 0.2 + float(r.uniform(0, 0.15)), pan=float(r.uniform(-0.6, 0.6)))
    return buf


def ui_sfx():
    buf = np.zeros((N, 2))
    for at in (5.3, 16.2, 20.45, 26.35, 30.55, 36.3, 42.95, 46.75, 54.85):
        place(buf, whoosh(0.5) * 0.28, at - 0.25)
    place(buf, sparkle(1.3, 34, True, 2) * 0.32, 11.6)
    place(buf, whoosh(0.9, 300, 6000, rev=True) * 0.25, 12.2)
    place(buf, sparkle(0.6, 22, False, 3) * 0.3, 13.05)
    place(buf, whoosh(0.6, 2500, 300) * 0.35, 51.2)  # back to the road
    pops = (0.6, 0.9, 7.68, 14.74, 16.3, 19.6, 22.04, 23.56, 24.96, 26.48, 28.2, 29.78, 31.22, 32.14,
            34.26, 35.6, 36.4, 37.0, 41.1, 45.6, 51.58, 53.56, 56.5, 56.8, 57.1, 59.2, 59.4, 59.6)
    for at in pops:
        place(buf, pop() * 0.3, at, pan=float(rs.uniform(-0.3, 0.3)))
    place(buf, nope() * 0.28, 10.0)  # HILANG!
    place(buf, nope() * 0.3, 15.08)  # cross
    place(buf, chime((79, 84, 88)) * 0.3, 16.74)  # SANGAT BESAR
    place(buf, chime((84, 88, 91, 96), 0.07) * 0.3, 43.74)  # TAHI BINTANG
    place(buf, boing() * 0.22, 46.9)
    place(buf, chime((79, 84, 88, 91)) * 0.35, 47.0)
    place(buf, chime((84, 88, 91, 96), 0.07) * 0.42, 49.72)
    place(buf, sparkle(0.8, 16, False, 6) * 0.25, 49.8)
    place(buf, chime((86, 91)) * 0.28, 55.1)
    place(buf, sparkle(0.6, 14, False, 7) * 0.22, 55.15)
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
    car = car_layer() * duck_gain(voice, 0.4)[:, None]
    space = space_sfx()
    ui = ui_sfx()
    for name, b in (("music", m), ("car", car), ("space", space), ("sfx", ui)):
        write_wav(os.path.join(OUT, "stems", name + ".wav"), b)
    v = np.stack([voice, voice], 1)
    mix = v * 1.0 + m * 0.55 + car * 0.1 + space * 0.6 + ui * 0.55
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
