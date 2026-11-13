#!/usr/bin/env python3
"""Soundtrack for Episode 032, synthesised from scratch (no samples, no
licensed music) and mixed under the narration.

Reuses the instruments and effects from Episode 005's build_audio.py and adds:
pool splashes and a backyard breeze, water drips, a buzzing nerve signal, a
squeeze for the blood vessels and a crinkle for the wrinkles, a rolling tyre
and a skid on the wet road, a glass marble's tink, slip and plip, and a grip
squeak.

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

DUR = 70.6
OUTRO = 67.45
OUT = os.path.join(HERE, "output")
N = int(SR * DUR)
rs = np.random.default_rng(32)


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
def splash_snd(seed=1, dur=0.6):
    r = np.random.default_rng(seed)
    n = int(dur * SR)
    t = np.arange(n) / SR
    x = fftfilt(r.standard_normal(n), 400, 6000) * np.exp(-t * 7)
    blips = np.zeros(n)
    for at in r.uniform(0.02, dur * 0.7, 8):
        d = T(0.04)
        f = r.uniform(900, 2200)
        s = np.sin(2 * np.pi * f * d * (1 + 2 * d / 0.04)) * np.exp(-d * 60)
        i = int(at * SR)
        blips[i : i + len(s)] += s[: n - i]
    return norm(norm(x) * 0.7 + blips * 0.5)


def plink(f=1500):
    t = T(0.18)
    return np.sin(2 * np.pi * f * t * (1 + 1.5 * t)) * np.exp(-t * 30)


def buzz(dur=1.0, f=180):
    t = T(dur)
    s = np.sign(np.sin(2 * np.pi * f * t)) * 0.3 + np.sin(2 * np.pi * 2 * f * t) * 0.5
    s = fftfilt(s, 150, 3000) * (0.6 + 0.4 * np.sin(2 * np.pi * 9 * t))
    return norm(s) * np.sin(np.pi * t / dur) ** 0.5


def zap(dur=1.3, f0=300, f1=1600):
    t = T(dur)
    f = f0 * (f1 / f0) ** (t / dur)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * (0.5 + 0.5 * np.sin(2 * np.pi * 14 * t)) * np.sin(np.pi * t / dur) ** 0.6


def squeeze(dur=0.9):
    """Rubbery squish: falling pitch with a wobble."""
    t = T(dur)
    f = 260 * (0.55 ** (t / dur)) * (1 + 0.08 * np.sin(2 * np.pi * 11 * t))
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * t / dur)


def crinkle_snd(dur=1.3, seed=7):
    r = np.random.default_rng(seed)
    n = int(dur * SR)
    out = np.zeros(n)
    for at in np.sort(r.uniform(0, dur - 0.03, 70)):
        d = T(0.012)
        s = fftfilt(r.standard_normal(len(d)), 2500, 9000) * np.exp(-d * 300)
        i = int(at * SR)
        out[i : i + len(s)] += s[: n - i] * r.uniform(0.3, 1)
    return norm(out) * np.sin(np.pi * np.arange(n) / n) ** 0.4


def fizz(dur=0.8, seed=8):
    r = np.random.default_rng(seed)
    n = int(dur * SR)
    t = np.arange(n) / SR
    return norm(fftfilt(r.standard_normal(n), 2000, 8000) * (0.5 + 0.5 * np.sign(np.sin(2 * np.pi * 23 * t))) * np.exp(-t * 2.5))


def skid(dur=2.0):
    t = T(dur)
    f = 900 + 120 * np.sin(2 * np.pi * 3 * t)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) + 0.4 * np.sin(2 * np.pi * np.cumsum(f * 1.5) / SR)
    s = fftfilt(s + 0.4 * rs.standard_normal(len(t)), 500, 4000)
    return norm(s) * np.clip(t / 0.15, 0, 1) * np.clip((dur - t) / 0.3, 0, 1)


def road_hum(dur=5.2):
    n = int(dur * SR)
    t = np.arange(n) / SR
    x = fftfilt(rs.standard_normal(n), 60, 600) + 0.4 * np.sin(2 * np.pi * 55 * t)
    return norm(x) * np.clip(t / 0.3, 0, 1) * np.clip((dur - t) / 0.3, 0, 1)


def tink(f=2600):
    t = T(0.4)
    return (np.sin(2 * np.pi * f * t) + 0.5 * np.sin(2 * np.pi * f * 2.76 * t)) * np.exp(-t * 14)


def slip_whistle(dur=0.6):
    t = T(dur)
    f = 1800 * (400 / 1800) ** (t / dur)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.clip(t / 0.05, 0, 1) * np.clip((dur - t) / 0.05, 0, 1)


def squeak(dur=0.25):
    t = T(dur)
    f = 1300 + 500 * np.sin(np.pi * t / dur)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * t / dur)


def breeze(dur, seed=6):
    r = np.random.default_rng(seed)
    n = int(dur * SR)
    t = np.arange(n) / SR
    x = fftfilt(r.standard_normal(n), 250, 1600)
    return norm(x * (0.8 + 0.2 * np.sin(2 * np.pi * 0.3 * t)))


# ------------------------------------------------------------------ layers
def music():
    buf = np.zeros((N, 2))
    beat = 60 / 108
    bar = beat * 4
    home = [(48, [60, 64, 67]), (53, [60, 65, 69]), (55, [59, 62, 67]), (48, [60, 64, 67])]
    lab = [(50, [62, 66, 69]), (55, [62, 67, 71]), (52, [64, 67, 71]), (57, [64, 69, 73])]
    arp = [0, 1, 2, 1, 0, 2, 1, 2]

    def happy(a, b, prog, mar=0.15):
        t0, i = a, 0
        while t0 < b:
            root, ch = prog[i % 4]
            place(buf, pad([midi(n) for n in ch], bar + 0.6) * 0.09, t0)
            for k in range(8):
                place(buf, marimba(midi(ch[arp[k]] + 12)) * mar, t0 + k * beat / 2, pan=-0.3 + 0.08 * k)
            place(buf, bass(midi(root - 12), 0.5) * 0.28, t0)
            place(buf, bass(midi(root - 5), 0.4) * 0.22, t0 + 2 * beat)
            t0 += bar
            i += 1

    happy(0.0, 11.95, home)
    t0, i = 11.95, 0
    while t0 < 50.3:
        root, ch = lab[i % 4]
        place(buf, pad([midi(n) for n in ch], bar + 0.6) * 0.12, t0)
        for k, step in enumerate([0, 2, 1, 2, 0, 1, 2, 1]):
            place(buf, musicbox(midi(ch[step] + 12)) * 0.08, t0 + k * beat / 2, pan=0.3 * ((k % 2) * 2 - 1))
        place(buf, bass(midi(root - 12), 0.8) * 0.22, t0)
        for k in range(8):
            place(buf, shaker() * (0.35 if k % 2 else 0.2), t0 + k * beat / 2, pan=0.4)
        t0 += bar
        i += 1
    happy(50.3, OUTRO, home, 0.16)
    place(buf, pad([midi(n) for n in (48, 60, 64, 67, 72)], 3.2) * 0.2, OUTRO)
    for k, m in enumerate([72, 76, 79, 84]):
        place(buf, pluck_bell(midi(m), 2.5) * 0.12, OUTRO + 0.05 + k * 0.12, pan=-0.3 + 0.2 * k)
    place(buf, bass(midi(36), 2.0) * 0.3, OUTRO)
    fade = int(1.2 * SR)
    buf[-fade:] *= np.linspace(1, 0, fade)[:, None]
    return buf


def story_sfx():
    buf = np.zeros((N, 2))
    r = np.random.default_rng(3)
    # backyard air, only in the backyard shots
    amb = np.zeros((N, 2))
    for a, b in ((0, 11.95), (50.3, OUTRO)):
        place(amb, breeze(b - a, 6) * 0.12, a)
    buf += amb
    for i, at in enumerate((0.45, 1.25, 3.25, 4.05)):
        place(buf, splash_snd(i + 1) * 0.35, at - 0.05, pan=float(r.uniform(-0.3, 0.3)))
    place(buf, pop(1200, 500, 0.12) * 0.3, 7.5)  # raisin pops in
    # lab
    place(buf, nope() * 0.22, 16.35)  # cross stamp
    place(buf, buzz(1.6) * 0.12, 18.15)
    place(buf, fizz(0.9) * 0.18, 20.5)
    for i in range(12):
        place(buf, plink(1300 + 90 * (i % 5)) * 0.18, 23.75 + i * 0.22 + 0.8, pan=float(r.uniform(-0.4, 0.4)))
    place(buf, zap(1.4) * 0.15, 26.3)
    place(buf, zap(1.4, 400, 1900) * 0.13, 28.0)
    place(buf, buzz(3.0, 220) * 0.07, 26.4)
    place(buf, squeeze(1.0) * 0.3, 30.4)
    place(buf, squeeze(1.2) * 0.22, 32.9)
    place(buf, crinkle_snd(1.4) * 0.3, 35.0)
    # tyres
    place(buf, road_hum(5.2) * 0.2, 45.1)
    place(buf, skid(2.3) * 0.12, 47.95, pan=-0.3)
    for i in range(6):
        place(buf, splash_snd(10 + i, 0.4) * 0.12, 48.0 + i * 0.35, pan=-0.3)
    # marble
    place(buf, tink() * 0.25, 51.2)
    place(buf, slip_whistle() * 0.18, 53.1)
    place(buf, splash_snd(20, 0.5) * 0.4, 53.55)
    place(buf, plink(900) * 0.3, 53.6)
    place(buf, tink(3000) * 0.2, 54.35)
    place(buf, squeak() * 0.25, 55.7)
    return buf


def ui_sfx():
    buf = np.zeros((N, 2))
    for at in (5.45, 17.9, 23.6, 26.0, 32.3, 37.05, 45.1, 50.3, 56.45, 58.9):
        place(buf, whoosh(0.5) * 0.25, at - 0.25)
    place(buf, sparkle(1.3, 34, True, 2) * 0.32, 10.5)
    place(buf, whoosh(0.9, 300, 6000, rev=True) * 0.25, 11.1)
    place(buf, sparkle(0.6, 22, False, 3) * 0.3, 11.9)
    place(buf, whoosh(0.6, 2500, 300) * 0.35, 61.2)
    pops = (0.5, 0.9, 2.32, 4.44, 5.84, 6.9, 7.56, 8.58, 14.56, 14.88, 18.15, 18.42, 21.06, 22.0, 23.74, 27.1, 28.0, 29.16, 31.0,
            33.76, 39.84, 41.8, 42.78, 45.38, 46.76, 47.5, 48.52, 51.18, 52.08, 53.02, 54.58, 56.52, 58.42, 60.22, 63.78,
            65.42, 65.75, 66.05, OUTRO + 0.3, OUTRO + 0.5, OUTRO + 0.7)
    for at in pops:
        place(buf, pop() * 0.26, at, pan=float(rs.uniform(-0.3, 0.3)))
    place(buf, chime((79, 84, 88)) * 0.3, 4.9)  # gasp: look at the fingers
    place(buf, nope() * 0.2, 8.65)  # KENAPA?
    place(buf, chime((84, 88, 91)) * 0.28, 18.2)  # SARAF
    place(buf, chime((84, 88, 91, 96), 0.07) * 0.32, 36.06)  # BERKEDUT
    place(buf, sparkle(0.8, 16, False, 5) * 0.22, 36.1)
    place(buf, chime((79, 84, 88)) * 0.28, 41.0)  # bulb
    place(buf, chime((84, 88, 91, 96), 0.07) * 0.3, 49.1)  # check
    place(buf, chime((84, 88, 91, 96), 0.07) * 0.4, 55.72)  # DAPAT!
    place(buf, sparkle(0.8, 16, False, 6) * 0.28, 55.75)
    place(buf, sparkle(1.4, 30, True, 7) * 0.25, 59.3)  # drying
    place(buf, boing() * 0.22, 61.55)
    place(buf, chime((79, 84, 88, 91)) * 0.35, 61.6)
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
