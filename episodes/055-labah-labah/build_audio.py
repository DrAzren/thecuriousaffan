#!/usr/bin/env python3
"""Soundtrack for Episode 055, synthesised from scratch (no samples, no
licensed music) and mixed under the narration.

Reuses the instruments and effects from Episode 005's build_audio.py and adds:
morning birds and dew drips, a squishy silk "factory" hum,
a thin stretching twang as the silk hardens, a breezy whoosh carrying the
bridge thread, plucky harp-like notes as frame and spokes go up, a spinning
whirr for the sticky spiral, a buzzing mosquito and a sticky splat, and a
metal ping as the steel wire snaps.

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

DUR = 67.9
OUTRO = 64.75
OUT = os.path.join(HERE, "output")
N = int(SR * DUR)
rs = np.random.default_rng(55)

# scene boundaries (must match episode.js)
PARK_A = (0.0, 12.16)
MACRO = (12.16, 54.28)
PARK_B = (54.28, OUTRO)


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


def twang(f=600, dur=0.6):
    t = T(dur)
    return norm(np.sin(2 * np.pi * np.cumsum(f * (1 + 0.5 * t / dur)) / SR) * np.exp(-t * 6))


def buzz(dur):
    t = T(dur)
    x = np.sign(np.sin(2 * np.pi * 520 * t + 3 * np.sin(2 * np.pi * 7 * t))) * 0.5
    return norm(fftfilt(x, 300, 4000)) * np.clip(t / 0.1, 0, 1) * np.clip((dur - t) / 0.1, 0, 1)


def ping(f=2400):
    t = T(0.8)
    return norm((np.sin(2 * np.pi * f * t) + 0.5 * np.sin(2 * np.pi * f * 2.76 * t)) * np.exp(-t * 6))


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
    loop(*MACRO, inner, musicbox, 0.85)
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
    for a, b in ((0.0, 12.0), (54.3, OUTRO)):
        for at in np.arange(a + 0.5, b - 0.5, 1.8):
            for k in range(3):
                place(buf, chirp(2800 + 600 * k) * 0.03, float(at + k * 0.13 + rs.uniform(0, 0.4)), pan=float(rs.uniform(-0.6, 0.6)))
    place(buf, pad([midi(n) for n in (48, 55, 60)], 4.0) * 0.06, 13.2)
    place(buf, noise(2.0, 300, 1500) * 0.05, 15.3)
    place(buf, twang(500, 0.8) * 0.12, 19.5)
    place(buf, whoosh(2.2, 300, 3000) * 0.12, 24.2)
    place(buf, pop() * 0.2, 26.24)
    for k, at in enumerate(np.linspace(30.7, 31.7, 8)):
        place(buf, pluck_bell(midi(67 + k % 5), 0.6) * 0.06, float(at))
    for k, at in enumerate(np.linspace(31.9, 33.9, 16)):
        place(buf, pluck_bell(midi(72 + (k * 2) % 12), 0.5) * 0.05, float(at), pan=-0.6 + 0.08 * k)
    place(buf, noise(5.0, 1500, 6000) * 0.03, 37.4)
    place(buf, buzz(0.7) * 0.08, 42.3)
    place(buf, noise(0.25, 300, 2000, 15) * 0.18, 43.0)
    place(buf, buzz(1.4) * 0.04, 43.1)
    place(buf, ping() * 0.2, 47.9)
    place(buf, noise(0.4, 60, 600, 10) * 0.2, 48.5)
    return buf


def ui_sfx():
    buf = np.zeros((N, 2))
    for at in (2.26, 7.3, 21.06, 29.21, 36.04, 44.74, 49.74, 62.48):
        place(buf, whoosh(0.5) * 0.2, at - 0.25)
    place(buf, sparkle(1.3, 34, True, 2) * 0.32, 10.2)
    place(buf, whoosh(0.9, 300, 6000, rev=True) * 0.25, 11.2)
    place(buf, sparkle(0.6, 22, False, 3) * 0.3, 12.16)
    pops = (0.4, 2.32, 3.08, 7.4, 7.7, 8.1, 13.2, 15.86, 18.04, 21.84, 24.28, 30.86, 31.92, 34.34, 37.48, 39.74,
            44.8, 45.86, 47.0, 48.34, 49.8, 52.68, 53.4, 58.26, 62.5, 62.8, 63.1, OUTRO + 0.3, OUTRO + 0.5, OUTRO + 0.7)
    for at in pops:
        place(buf, pop() * 0.22, at, pan=float(rs.uniform(-0.3, 0.3)))
    place(buf, chime((79, 84, 88)) * 0.24, 5.44)  # SARANG BESAR
    place(buf, chime((79, 84, 88)) * 0.24, 19.5)  # KERAS
    place(buf, chime((79, 84, 88, 91)) * 0.26, 28.06)  # JAMBATAN
    place(buf, chime((84, 88, 91)) * 0.24, 43.96)  # TERLEKAT
    place(buf, chime((79, 84, 88, 91)) * 0.26, 47.2)  # LEBIH KUAT
    place(buf, boing() * 0.22, 54.3)
    place(buf, chime((79, 84, 88, 91)) * 0.35, 54.35)
    place(buf, sparkle(1.0, 24, False, 8) * 0.28, 54.4)
    place(buf, chime((79, 84, 88)) * 0.24, 56.58)  # JURUTERA
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
