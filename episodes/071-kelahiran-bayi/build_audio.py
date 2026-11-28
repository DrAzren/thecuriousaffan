#!/usr/bin/env python3
"""Soundtrack for Episode 071, synthesised from scratch (no samples, no
licensed music) and mixed under the narration.

Reuses the instruments and effects from Episode 005's build_audio.py and adds:
a tinkling cot mobile (lullaby) in the nursery, soft baby coos, popping
bubbles as the babies appear, a ticking counter, a sad slide for the shrinking
bars, magic grow-up shimmers for the future jobs, a creaky seesaw and a gentle
heart chime.

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

DUR = 57.05
OUTRO = 53.9
OUT = os.path.join(HERE, "output")
N = int(SR * DUR)
rs = np.random.default_rng(71)

# scene boundaries (must match episode.js)
NURSERY_A = (0.0, 11.12)
STATS = (11.12, 37.06)
SEESAW = (37.06, 45.24)
NURSERY_B = (45.24, OUTRO)


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


def coo():
    t = T(0.45)
    f = 420 + 160 * np.sin(np.pi * t / 0.45)
    return norm(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * t / 0.45) ** 2 * (1 + 0.3 * np.sin(2 * np.pi * 7 * t)))


def lullaby(a, b, buf, gain=0.05):
    notes = [79, 76, 72, 76, 79, 81, 79, 76]
    at, i = a, 0
    while at < b - 0.3:
        place(buf, musicbox(midi(notes[i % 8] + 5)) * gain, at, pan=-0.2)
        at += 0.45
        i += 1


def tick(f=1800):
    t = T(0.04)
    return norm(np.sin(2 * np.pi * f * t) * np.exp(-t * 90))


def slide(dur=0.9, f0=700, f1=250):
    t = T(dur)
    f = f0 * (f1 / f0) ** (t / dur)
    return norm(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * t / dur))


def creak():
    t = T(0.5)
    f = 180 + 60 * np.sin(2 * np.pi * 3 * t)
    x = np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * 0.3 + noise(0.5, 400, 2500) * 0.7
    return norm(x * np.sin(np.pi * t / 0.5))


def music():
    buf = np.zeros((N, 2))
    beat = 60 / 96
    bar = beat * 4
    home = [(48, [60, 64, 67]), (53, [60, 65, 69]), (55, [59, 62, 67]), (48, [60, 64, 67])]
    inner = [(53, [65, 69, 72]), (48, [64, 67, 72]), (50, [65, 69, 74]), (55, [62, 67, 71])]
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

    loop(*NURSERY_A, home, musicbox, 0.9)
    loop(STATS[0], SEESAW[1], inner, marimba, 1.0)
    loop(*NURSERY_B, home, musicbox, 0.9)
    place(buf, pad([midi(n) for n in (48, 60, 64, 67, 72)], 3.2) * 0.2, OUTRO)
    for k, m in enumerate([72, 76, 79, 84]):
        place(buf, pluck_bell(midi(m), 2.5) * 0.12, OUTRO + 0.05 + k * 0.12, pan=-0.3 + 0.2 * k)
    place(buf, bass(midi(36), 2.0) * 0.3, OUTRO)
    fade = int(1.2 * SR)
    buf[-fade:] *= np.linspace(1, 0, fade)[:, None]
    return buf


def story_sfx():
    buf = np.zeros((N, 2))
    lullaby(0.2, 11.0, buf)
    lullaby(45.3, OUTRO - 0.2, buf, 0.04)
    for at in (3.4, 5.3, 6.0, 50.0, 50.9):
        place(buf, coo() * 0.12, at)
    # babies popping up in the grid
    for k in range(40):
        place(buf, pop() * 0.07, 11.3 + 3.9 * k / 40 + float(rs.uniform(0, 0.05)), pan=float(rs.uniform(-0.6, 0.6)))
    for k in range(22):
        place(buf, tick() * 0.06, 13.4 + k * 0.1)
    place(buf, slide() * 0.14, 21.2)
    for at in (29.7, 30.6, 31.3):
        place(buf, sparkle(0.7, 18, True, int(at)) * 0.2, at)
    for k in range(16):
        place(buf, tick(1500) * 0.05, 33.4 + k * 0.11)
    place(buf, creak() * 0.14, 40.3)
    place(buf, creak() * 0.14, 41.3)
    for at in (40.2, 40.7, 41.2):
        place(buf, boing() * 0.12, at)
    return buf


def ui_sfx():
    buf = np.zeros((N, 2))
    for at in (2.18, 3.15, 5.12, 6.66, 16.5, 19.8, 22.44, 26.92, 32.88, 37.06, 45.24, 46.24, 49.78, 51.7):
        place(buf, whoosh(0.5) * 0.2, at - 0.25)
    place(buf, whoosh(0.9, 300, 6000, rev=True) * 0.25, 10.2)
    place(buf, sparkle(0.6, 22, False, 3) * 0.3, 11.12)
    pops = (0.4, 2.2, 3.2, 4.1, 5.2, 6.75, 7.05, 7.35, 11.2, 13.4, 14.7, 16.9, 18.5, 19.85, 20.1, 20.5, 21.54, 22.5, 24.3,
            25.68, 26.96, 29.75, 30.65, 31.35, 31.72, 32.95, 35.24, 36.0, 37.1, 37.9, 40.2, 42.2, 45.3, 46.8, 49.9, 51.8, 52.1, 52.4,
            OUTRO + 0.3, OUTRO + 0.5, OUTRO + 0.7)
    for at in pops:
        place(buf, pop() * 0.22, at, pan=float(rs.uniform(-0.3, 0.3)))
    place(buf, chime((79, 84, 88)) * 0.24, 5.2)  # COMEL SANGAT
    place(buf, chime((84, 88, 91)) * 0.3, 15.6)  # 414,918
    place(buf, chime((79, 84, 88)) * 0.24, 18.5)  # SETIAP HARI
    place(buf, nope() * 0.18, 21.6)  # TURUN 9%
    place(buf, chime((79, 84, 88)) * 0.22, 24.3)  # 1.6
    place(buf, chime((79, 84, 88, 91)) * 0.26, 31.72)  # MASA DEPAN
    place(buf, chime((84, 88, 91)) * 0.22, 35.24)  # SEKOLAH, HOSPITAL
    place(buf, boing() * 0.22, 45.28)
    place(buf, chime((79, 84, 88, 91)) * 0.35, 45.32)
    place(buf, sparkle(1.0, 24, False, 8) * 0.28, 45.36)
    place(buf, chime((79, 84, 88, 91)) * 0.26, 46.8)
    place(buf, chime((84, 88, 91)) * 0.2, 49.9)
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
