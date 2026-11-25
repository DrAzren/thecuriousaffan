#!/usr/bin/env python3
"""Soundtrack for Episode 066, synthesised from scratch (no samples, no
licensed music) and mixed under the narration.

Reuses the instruments and effects from Episode 005's build_audio.py and adds:
park birdsong, puffing breaths and running footsteps, a rising whistle as the
thermometer climbs, a hot shimmer for the sun, bubbly gurgles as sweat comes up
the glands, a soft hiss and rising sparkle as it dries, a cool whoosh, a
panting dog with a happy bark, and a glug of water from the bottle.

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

DUR = 48.15
OUTRO = 45.0
OUT = os.path.join(HERE, "output")
N = int(SR * DUR)
rs = np.random.default_rng(66)

# scene boundaries (must match episode.js)
PARK_A = (0.0, 10.14)
LAB = (10.14, 29.3)
PARK_B = (29.3, OUTRO)


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


# ------------------------------------------------------------------ layers
def music():
    buf = np.zeros((N, 2))
    beat = 60 / 112
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
    # out of breath, then running in place
    for at in np.arange(0.2, 2.0, 0.55):
        place(buf, huff() * 0.05, float(at))
    for at in np.arange(3.15, 4.7, 0.26):
        place(buf, step() * 0.12, float(at), pan=0.2 if int(at * 4) % 2 else -0.2)
    for at in np.arange(15.1, 16.2, 0.26):
        place(buf, step() * 0.1, float(at))
    # the body heating up: rising whistle and a hot shimmer under the sun
    place(buf, rise(3.0, 380, 1300) * 0.05, 15.2)
    place(buf, noise(3.5, 2000, 7000) * 0.025, 16.3)
    # sweat glands gurgle, then the sweat dries with a hiss
    for at in np.arange(21.3, 23.0, 0.2):
        place(buf, gurgle(float(rs.uniform(350, 700))) * 0.06, float(at), pan=float(rs.uniform(-0.5, 0.5)))
    place(buf, noise(3.2, 3000, 9000) * 0.03, 23.8)
    place(buf, sparkle(2.0, 26, True, 5) * 0.12, 24.2)
    place(buf, whoosh(1.0, 2000, 300) * 0.15, 27.4)
    # the dog pants, wags and barks
    for at in np.arange(29.4, 36.4, 0.3):
        place(buf, huff(0.18) * 0.05, float(at), pan=-0.3)
    place(buf, bark() * 0.16, 31.9, pan=-0.3)
    place(buf, bark() * 0.14, 32.15, pan=-0.3)
    # a glug of water
    for at in np.arange(41.0, 42.2, 0.3):
        place(buf, gurgle(float(rs.uniform(250, 400))) * 0.08, float(at))
    return buf


def ui_sfx():
    buf = np.zeros((N, 2))
    for at in (2.14, 6.72, 15.0, 19.84, 23.48, 27.32, 29.3, 36.56, 42.8):
        place(buf, whoosh(0.5) * 0.2, at - 0.25)
    place(buf, sparkle(1.3, 34, True, 2) * 0.32, 6.8)
    place(buf, whoosh(0.9, 300, 6000, rev=True) * 0.25, 9.4)
    place(buf, sparkle(0.6, 22, False, 3) * 0.3, 10.14)
    pops = (0.4, 2.16, 3.1, 6.8, 7.1, 7.4, 10.2, 11.34, 12.62, 15.04, 16.18, 19.9, 21.94, 23.52, 29.34, 30.64,
            33.22, 42.85, 43.15, 43.45, OUTRO + 0.3, OUTRO + 0.5, OUTRO + 0.7)
    for at in pops:
        place(buf, pop() * 0.22, at, pan=float(rs.uniform(-0.3, 0.3)))
    place(buf, chime((79, 84, 88)) * 0.24, 5.2)  # BASAH DENGAN PELUH
    place(buf, chime((84, 88, 91)) * 0.24, 17.8)  # TERLALU PANAS
    place(buf, chime((79, 84, 88)) * 0.24, 25.38)  # BAWA HABA KELUAR
    place(buf, chime((79, 84, 88, 91)) * 0.26, 27.4)  # SEJUK SEMULA
    place(buf, chime((79, 84, 88)) * 0.22, 34.8)  # UNTUK SEJUKKAN BADAN
    place(buf, boing() * 0.22, 36.6)
    place(buf, chime((79, 84, 88, 91)) * 0.35, 36.64)
    place(buf, sparkle(1.0, 24, False, 8) * 0.28, 36.7)
    place(buf, chime((79, 84, 88)) * 0.24, 37.5)  # PENYEJUK
    place(buf, chime((84, 88, 91)) * 0.2, 40.52)  # MINUM BANYAK AIR
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
