#!/usr/bin/env python3
"""Soundtrack for Episode 072, synthesised from scratch (no samples, no
licensed music) and mixed under the narration.

Reuses the instruments and effects from Episode 005's build_audio.py and adds:
page turns, a deep underwater ambience with bubbles, a whale song, bus horn
pops as the school buses stack up, a heavy wobbling balance and an elephant
trumpet, tiny squeaks for the shrew, a coin clink, frog hops and ribbits,
and a cat's meow.

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

DUR = 58.55
OUTRO = 55.4
OUT = os.path.join(HERE, "output")
N = int(SR * DUR)
rs = np.random.default_rng(72)

# scene boundaries (must match episode.js)
ROOM_A = (0.0, 12.8)
SEA = (12.8, 31.38)
TINY = (31.38, 46.66)
ROOM_B = (46.66, OUTRO)


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


def whalesong(dur=2.4, f0=180, f1=90):
    t = T(dur)
    f = f0 * (f1 / f0) ** (t / dur) * (1 + 0.04 * np.sin(2 * np.pi * 3 * t))
    return norm(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * t / dur) ** 2)


def bubbles(dur, rate=6):
    buf = np.zeros(int(SR * dur))
    t = T(0.08)
    for at in np.sort(rs.uniform(0, dur - 0.1, int(dur * rate))):
        f = float(rs.uniform(500, 1400))
        x = np.sin(2 * np.pi * np.cumsum(f * (1 + 3 * t)) / SR) * np.exp(-t * 40)
        i = int(at * SR)
        buf[i:i + len(x)] += x * float(rs.uniform(0.3, 1))
    return norm(buf)


def horn(f=330):
    t = T(0.3)
    x = np.sign(np.sin(2 * np.pi * f * t)) * 0.5 + np.sin(2 * np.pi * f * 1.26 * t) * 0.5
    return norm(onepole(x, 3000) * np.sin(np.pi * t / 0.3) ** 0.5)


def trumpet():
    t = T(0.9)
    f = 420 + 260 * np.sin(np.pi * t / 0.9) + 30 * np.sin(2 * np.pi * 9 * t)
    x = np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * 0.4 + noise(0.9, 800, 4000) * 0.3
    return norm(x * np.sin(np.pi * t / 0.9))


def thud():
    t = T(0.5)
    return norm(np.sin(2 * np.pi * 60 * t) * np.exp(-t * 8) + noise(0.5, 40, 300, decay=10) * 0.5)


def squeak(f=3200):
    t = T(0.12)
    ff = f + 900 * np.sin(np.pi * t / 0.12)
    return norm(np.sin(2 * np.pi * np.cumsum(ff) / SR) * np.sin(np.pi * t / 0.12))


def clink():
    t = T(0.5)
    return norm(sum(np.sin(2 * np.pi * f * t) * np.exp(-t * d) for f, d in ((2600, 9), (4100, 12), (5600, 15))))


def ribbit():
    t = T(0.3)
    x = np.sin(2 * np.pi * 900 * t) * (0.5 + 0.5 * np.sign(np.sin(2 * np.pi * 28 * t)))
    return norm(x * np.sin(np.pi * t / 0.3))


def page():
    return norm(noise(0.35, 1500, 9000) * np.sin(np.pi * T(0.35) / 0.35) ** 2)


def meow():
    t = T(0.6)
    f = 650 + 350 * np.sin(np.pi * t / 0.6) - 200 * t
    return norm(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * t / 0.6) * (1 + 0.3 * np.sin(2 * np.pi * 6 * t)))


def music():
    buf = np.zeros((N, 2))
    beat = 60 / 100
    bar = beat * 4
    home = [(48, [60, 64, 67]), (53, [60, 65, 69]), (55, [59, 62, 67]), (48, [60, 64, 67])]
    deep = [(45, [57, 60, 64]), (41, [57, 60, 65]), (43, [55, 59, 62]), (45, [57, 60, 64])]
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

    loop(*ROOM_A, home, marimba, 1.0)
    loop(*SEA, deep, musicbox, 0.85, half=False)
    loop(*TINY, home, pluck_bell, 0.8)
    loop(*ROOM_B, home, marimba, 1.0)
    place(buf, pad([midi(n) for n in (48, 60, 64, 67, 72)], 3.2) * 0.2, OUTRO)
    for k, m in enumerate([72, 76, 79, 84]):
        place(buf, pluck_bell(midi(m), 2.5) * 0.12, OUTRO + 0.05 + k * 0.12, pan=-0.3 + 0.2 * k)
    place(buf, bass(midi(36), 2.0) * 0.3, OUTRO)
    fade = int(1.2 * SR)
    buf[-fade:] *= np.linspace(1, 0, fade)[:, None]
    return buf


def story_sfx():
    buf = np.zeros((N, 2))
    place(buf, page() * 0.15, 3.2)
    # the ocean
    place(buf, noise(SEA[1] - SEA[0] - 2.6, 60, 500) * 0.08, SEA[0])
    place(buf, noise(2.6, 60, 500) * 0.08, 28.78)
    place(buf, bubbles(SEA[1] - SEA[0]) * 0.05, SEA[0])
    place(buf, whalesong() * 0.14, 13.4)
    place(buf, whalesong(2.0, 220, 120) * 0.12, 21.2)
    for at, f in ((19.26, 330), (19.72, 370), (20.18, 415)):
        place(buf, horn(f) * 0.12, at)
    place(buf, thud() * 0.2, 23.95)
    place(buf, trumpet() * 0.12, 25.75)
    place(buf, whalesong(2.4, 160, 80) * 0.12, 27.0)
    # the tiny table
    for at in (31.9, 32.6, 34.2):
        place(buf, squeak() * 0.07, at)
    place(buf, clink() * 0.12, 37.6)
    place(buf, boing() * 0.15, 40.15)
    for at in (40.75, 43.3, 45.4):
        place(buf, ribbit() * 0.1, at)
    # the cat
    place(buf, meow() * 0.14, 51.2)
    return buf


def ui_sfx():
    buf = np.zeros((N, 2))
    for at in (2.26, 3.16, 7.7, 15.82, 20.92, 23.7, 26.6, 35.06, 38.94, 46.66, 47.56, 49.84, 53.12):
        place(buf, whoosh(0.5) * 0.2, at - 0.25)
    place(buf, whoosh(0.9, 300, 6000, rev=True) * 0.25, 12.0)
    place(buf, sparkle(0.6, 22, False, 3) * 0.3, 12.8)
    pops = (0.4, 2.28, 4.2, 6.08, 7.8, 8.1, 8.4, 12.85, 14.32, 16.5, 17.6, 19.36, 19.82, 20.28, 21.6, 23.75, 25.72, 26.65,
            29.26, 29.9, 31.42, 33.26, 35.9, 37.06, 38.98, 39.92, 42.9, 44.2, 46.7, 47.6, 49.9, 53.2, 53.5, 53.8,
            OUTRO + 0.3, OUTRO + 0.5, OUTRO + 0.7)
    for at in pops:
        place(buf, pop() * 0.22, at, pan=float(rs.uniform(-0.3, 0.3)))
    place(buf, chime((84, 88, 91)) * 0.3, 14.32)  # PAUS BIRU
    place(buf, chime((79, 84, 88)) * 0.24, 17.6)  # 30 METER
    place(buf, chime((79, 84, 88, 91)) * 0.24, 21.6)  # 200 TAN
    place(buf, chime((79, 84, 88)) * 0.24, 25.75)  # SAMA BERAT
    place(buf, chime((84, 88, 91)) * 0.26, 29.9)  # DINOSAUR
    place(buf, chime((88, 91, 96)) * 0.22, 33.26)  # CENCURUT
    place(buf, chime((79, 84, 88)) * 0.22, 37.4)  # LEBIH RINGAN
    place(buf, chime((88, 91, 96)) * 0.24, 42.9)  # 7 MM
    place(buf, boing() * 0.22, 46.68)
    place(buf, chime((79, 84, 88, 91)) * 0.35, 46.72)
    place(buf, sparkle(1.0, 24, False, 8) * 0.28, 46.76)
    place(buf, chime((79, 84, 88)) * 0.24, 47.6)
    place(buf, chime((84, 88, 91)) * 0.2, 51.6)
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
