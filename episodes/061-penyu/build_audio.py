#!/usr/bin/env python3
"""Soundtrack for Episode 061, synthesised from scratch (no samples, no
licensed music) and mixed under the narration.

Reuses the instruments and effects from Episode 005's build_audio.py and adds:
night waves and crickets on the beach, soft plops as eggs drop into the nest,
sand scratches as the hatchlings dig out and scurry, an underwater swell for
the ocean journey, a shimmering magnetic hum, chimes for each "address" pin,
and a warm and a cool tone for the sand thermometers.

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

DUR = 52.95
OUTRO = 49.8
OUT = os.path.join(HERE, "output")
N = int(SR * DUR)
rs = np.random.default_rng(61)

# scene boundaries (must match episode.js)
BEACH_A = (0.0, 10.72)
JOURNEY = (10.72, 40.2)
BEACH_B = (40.2, OUTRO)


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


def wave(dur=3.0):
    t = T(dur)
    env = np.sin(np.pi * t / dur) ** 2
    return norm(fftfilt(rs.standard_normal(len(t)), 120, 2500) * env)


def cricket(dur=0.3):
    t = T(dur)
    return norm(np.sin(2 * np.pi * 4300 * t) * (np.sin(2 * np.pi * 30 * t) > 0) * np.sin(np.pi * t / dur))


def plop():
    t = T(0.2)
    return norm(np.sin(2 * np.pi * np.cumsum(260 * (1 + 2.5 * t)) / SR) * np.exp(-t * 22))


def hum(dur, f=110):
    t = T(dur)
    x = np.sin(2 * np.pi * f * t) + 0.4 * np.sin(2 * np.pi * 2 * f * t) + 0.25 * np.sin(2 * np.pi * 3 * f * t)
    return norm(x * (0.8 + 0.2 * np.sin(2 * np.pi * 4 * t))) * np.clip(t / 0.3, 0, 1) * np.clip((dur - t) / 0.3, 0, 1)


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

    loop(*BEACH_A, home, marimba, 1.0)
    loop(*JOURNEY, inner, musicbox, 0.85)
    loop(*BEACH_B, home, marimba, 1.0)
    place(buf, pad([midi(n) for n in (48, 60, 64, 67, 72)], 3.2) * 0.2, OUTRO)
    for k, m in enumerate([72, 76, 79, 84]):
        place(buf, pluck_bell(midi(m), 2.5) * 0.12, OUTRO + 0.05 + k * 0.12, pan=-0.3 + 0.2 * k)
    place(buf, bass(midi(36), 2.0) * 0.3, OUTRO)
    fade = int(1.2 * SR)
    buf[-fade:] *= np.linspace(1, 0, fade)[:, None]
    return buf


def story_sfx():
    buf = np.zeros((N, 2))
    for a, b in ((0.0, 16.4), (40.2, OUTRO)):
        for at in np.arange(a, b - 1.0, 2.6):
            place(buf, wave(3.2) * 0.07, float(at), pan=float(rs.uniform(-0.3, 0.3)))
        for at in np.arange(a + 0.3, b - 0.5, 1.1):
            place(buf, cricket() * 0.02, float(at + rs.uniform(0, 0.4)), pan=float(rs.uniform(-0.7, 0.7)))
    for k in range(10):
        place(buf, plop() * 0.08, 3.9 + k * 0.25)
    for at in np.arange(11.5, 15.5, 0.12):
        place(buf, noise(0.06, 2000, 7000, 40) * 0.04, float(at + rs.uniform(0, 0.06)), pan=float(rs.uniform(-0.4, 0.4)))
    place(buf, noise(6.0, 80, 600) * 0.06, 16.5)
    place(buf, hum(9.0, 98) * 0.035, 24.6)
    for k in range(6):
        place(buf, pluck_bell(midi(72 + (k * 3) % 12), 0.7) * 0.08, 26.1 + k * 0.25)
    place(buf, pad([midi(n) for n in (60, 64, 67)], 2.2) * 0.06, 34.8)
    place(buf, pad([midi(n) for n in (57, 62, 66)], 2.2) * 0.06, 37.7)
    place(buf, noise(0.5, 300, 2000) * 0.05, 45.1)
    return buf


def ui_sfx():
    buf = np.zeros((N, 2))
    for at in (2.08, 6.6, 16.42, 22.74, 33.82, 40.2, 47.46):
        place(buf, whoosh(0.5) * 0.2, at - 0.25)
    place(buf, sparkle(1.3, 34, True, 2) * 0.32, 8.86)
    place(buf, whoosh(0.9, 300, 6000, rev=True) * 0.25, 9.8)
    place(buf, sparkle(0.6, 22, False, 3) * 0.3, 10.72)
    pops = (0.4, 2.12, 3.18, 3.88, 4.72, 6.65, 6.95, 7.3, 11.56, 13.22, 17.06, 19.24, 24.62, 26.04, 28.7, 29.56,
            33.82, 34.8, 36.7, 37.68, 39.04, 47.5, 47.8, 48.1, OUTRO + 0.3, OUTRO + 0.5, OUTRO + 0.7)
    for at in pops:
        place(buf, pop() * 0.22, at, pan=float(rs.uniform(-0.3, 0.3)))
    place(buf, chime((79, 84, 88)) * 0.24, 14.62)  # CAHAYA
    place(buf, chime((79, 84, 88, 91)) * 0.24, 21.14)  # LAUTAN
    place(buf, chime((84, 88, 91)) * 0.24, 28.7)  # ALAMAT
    place(buf, chime((79, 84, 88, 91)) * 0.26, 32.6)  # PULANG
    place(buf, boing() * 0.22, 40.22)
    place(buf, chime((79, 84, 88, 91)) * 0.35, 40.26)
    place(buf, sparkle(1.0, 24, False, 8) * 0.28, 40.3)
    place(buf, chime((79, 84, 88)) * 0.24, 41.54)  # KOMPAS
    place(buf, nope() * 0.16, 45.1)  # SAMPAH
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
