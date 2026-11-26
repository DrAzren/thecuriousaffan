#!/usr/bin/env python3
"""Soundtrack for Episode 067, synthesised from scratch (no samples, no
licensed music) and mixed under the narration.

Reuses the instruments and effects from Episode 005's build_audio.py and adds:
park birdsong, a leafy rustle as the semalu folds, a zippy electric "zap" for
the signal, gurgles as the water flows out of (and back into) the pillow, a
caterpillar's surprised boing, a ticking clock and night crickets.

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

DUR = 50.85
OUTRO = 47.7
OUT = os.path.join(HERE, "output")
N = int(SR * DUR)
rs = np.random.default_rng(67)

# scene boundaries (must match episode.js)
PARK_A = (0.0, 10.56)
LAB = (10.56, 38.52)
PARK_B = (38.52, OUTRO)


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


def rustle(dur=0.8):
    t = T(dur)
    x = noise(dur, 1500, 8000) * (0.5 + 0.5 * np.abs(np.sin(2 * np.pi * 9 * t)))
    return norm(x) * np.sin(np.pi * t / dur)


def zap(dur=1.6):
    t = T(dur)
    f = 900 + 600 * np.sin(2 * np.pi * 13 * t) + 1200 * (1 - t / dur)
    return norm(np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * 0.4 + noise(dur, 2000, 9000) * 0.6) * np.sin(np.pi * t / dur)


def cricket(dur=0.3):
    t = T(dur)
    return norm(np.sin(2 * np.pi * 4300 * t) * (np.sin(2 * np.pi * 30 * t) > 0) * np.sin(np.pi * t / dur))


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
        for at in np.arange(a + 0.4, b - 0.4, 1.3):
            place(buf, chirp() * 0.03, float(at + rs.uniform(0, 0.5)), pan=float(rs.uniform(-0.7, 0.7)))
    # touching the semalu: the leaves fold with a rustle
    place(buf, rustle(1.4) * 0.12, 4.5)
    place(buf, rustle(1.2) * 0.08, 44.4)
    # the lab: tap, signal zap, water out, fold, caterpillar, water back, night
    place(buf, pop() * 0.2, 15.9)
    place(buf, zap() * 0.08, 16.8)
    for at in np.arange(19.7, 21.4, 0.18):
        place(buf, gurgle(float(rs.uniform(300, 600))) * 0.06, float(at), pan=-0.2)
    place(buf, rustle(1.4) * 0.12, 23.4)
    for at in np.arange(25.6, 27.1, 0.4):
        place(buf, step() * 0.03, float(at), pan=0.4)
    place(buf, boing() * 0.2, 27.2, pan=0.4)
    for at in np.arange(30.4, 34.6, 0.5):
        place(buf, pluck_bell(midi(96), 0.08) * 0.03, float(at), pan=0.5)
    for at in np.arange(32.0, 33.2, 0.2):
        place(buf, gurgle(float(rs.uniform(400, 700))) * 0.05, float(at), pan=-0.2)
    place(buf, rustle(1.0) * 0.08, 33.0)
    for at in np.arange(34.9, 38.4, 0.7):
        place(buf, cricket() * 0.025, float(at + rs.uniform(0, 0.3)), pan=float(rs.uniform(-0.6, 0.6)))
    return buf


def ui_sfx():
    buf = np.zeros((N, 2))
    for at in (2.18, 4.89, 6.98, 15.34, 22.1, 28.95, 38.52, 45.3):
        place(buf, whoosh(0.5) * 0.2, at - 0.25)
    place(buf, sparkle(1.3, 34, True, 2) * 0.32, 7.05)
    place(buf, whoosh(0.9, 300, 6000, rev=True) * 0.25, 9.6)
    place(buf, sparkle(0.6, 22, False, 3) * 0.3, 10.56)
    pops = (0.4, 2.2, 4.38, 7.05, 7.35, 7.65, 10.62, 10.78, 12.8, 15.4, 16.82, 20.66, 22.16, 26.68, 29.0, 30.34,
            31.98, 34.72, 45.35, 45.65, 45.95, OUTRO + 0.3, OUTRO + 0.5, OUTRO + 0.7)
    for at in pops:
        place(buf, pop() * 0.22, at, pan=float(rs.uniform(-0.3, 0.3)))
    place(buf, chime((79, 84, 88)) * 0.24, 6.06)  # DAUN KUNCUP
    place(buf, chime((79, 84, 88)) * 0.22, 14.02)  # PENUH DENGAN AIR
    place(buf, chime((84, 88, 91)) * 0.24, 17.96)  # KILAT KECIL
    place(buf, chime((79, 84, 88, 91)) * 0.24, 24.52)  # DAUN TERLIPAT
    place(buf, chime((79, 84, 88)) * 0.22, 33.56)  # DAUN TERBUKA
    place(buf, chime((72, 76, 79)) * 0.22, 37.48)  # TIDUR
    place(buf, boing() * 0.22, 38.56)
    place(buf, chime((79, 84, 88, 91)) * 0.35, 38.6)
    place(buf, sparkle(1.0, 24, False, 8) * 0.28, 38.66)
    place(buf, chime((79, 84, 88)) * 0.24, 39.36)
    place(buf, chime((84, 88, 91)) * 0.2, 43.56)
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
