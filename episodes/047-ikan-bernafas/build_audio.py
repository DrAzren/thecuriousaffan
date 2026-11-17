#!/usr/bin/env python3
"""Soundtrack for Episode 047, synthesised from scratch (no samples, no
licensed music) and mixed under the narration.

Reuses the instruments and effects from Episode 005's build_audio.py and adds:
aquarium bubbling, fish-mouth "blup" pops, an underwater ambience with a
water-flow swoosh through the gills, a dry crackle when the gills clump out
of water, splashy gulps at the pond surface, and water pouring from a jug.

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

DUR = 71.05
OUTRO = 67.9
OUT = os.path.join(HERE, "output")
N = int(SR * DUR)
rs = np.random.default_rng(47)

# scene boundaries (must match episode.js)
ROOM_A = (0.0, 14.3)
WATER = (14.3, 47.12)
POND = (47.12, 56.1)
ROOM_B = (56.1, OUTRO)


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
def blup(f=500):
    """A small bubble: rising sine chirp."""
    t = T(0.09)
    return norm(np.sin(2 * np.pi * np.cumsum(f * (1 + 2.5 * t / 0.09)) / SR) * np.exp(-t * 45))


def bubbling(a, b, rate=7, gain=0.05, f0=600):
    out = []
    at = a
    while at < b:
        out.append((at, float(f0 * rs.uniform(0.7, 1.6)), gain * float(rs.uniform(0.5, 1.0))))
        at += float(rs.exponential(1 / rate))
    return out


def ambience(dur, lo=80, hi=500):
    t = T(dur)
    n = fftfilt(rs.standard_normal(len(t)), lo, hi) * (0.7 + 0.3 * np.sin(2 * np.pi * 0.2 * t))
    return norm(n) * np.clip(t / 0.6, 0, 1) * np.clip((dur - t) / 0.6, 0, 1)


def swoosh(dur=1.2):
    t = T(dur)
    return norm(fftfilt(rs.standard_normal(len(t)), 300, 2500)) * np.sin(np.pi * t / dur) ** 2


def crackle(dur=1.0):
    t = T(dur)
    x = np.zeros(len(t))
    for _ in range(60):
        i = int(rs.uniform(0, len(t) - 400))
        x[i : i + 400] += rs.standard_normal(400) * np.exp(-np.arange(400) / 60)
    return norm(fftfilt(x, 1500, 8000)) * np.clip((dur - t) / 0.2, 0, 1)


def gulp_splash():
    t = T(0.35)
    return norm(fftfilt(rs.standard_normal(len(t)), 400, 4000) * np.exp(-t * 14) + 0.8 * np.sin(2 * np.pi * np.cumsum(300 * (1 + 3 * t)) / SR) * np.exp(-t * 25))


def pour(dur=2.0):
    t = T(dur)
    return norm(fftfilt(rs.standard_normal(len(t)), 600, 5000) * (0.8 + 0.2 * np.sin(2 * np.pi * 9 * t))) * np.clip(t / 0.15, 0, 1) * np.clip((dur - t) / 0.3, 0, 1)


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

    loop(*ROOM_A, home, marimba, 1.0)
    loop(*WATER, inner, musicbox, 0.85)
    loop(*POND, home, marimba, 0.9)
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
    # aquarium air stone in the living room
    for a, b in ((0.0, 14.3), (56.1, OUTRO)):
        for at, f, g in bubbling(a, b, 6, 0.04):
            place(buf, blup(f) * g, at, pan=-0.3)
    # fish mouth: buka / tutup
    for at in (3.88, 4.38, 4.98, 5.44):
        place(buf, blup(380) * 0.18, at)
    # underwater ambience and bubbles
    place(buf, ambience(32.82) * 0.12, 14.3)
    for at, f, g in bubbling(14.3, 38.4, 4, 0.05, 450):
        place(buf, blup(f) * g, at, pan=float(rs.uniform(-0.5, 0.5)))
    # water through the gills
    for at in np.arange(23.1, 28.4, 1.4):
        place(buf, swoosh(1.3) * 0.1, float(at))
    for at in np.arange(34.3, 38.2, 1.3):
        place(buf, swoosh(1.2) * 0.09, float(at))
    place(buf, crackle(1.2) * 0.1, 40.8)
    # pond: ambience, gulps at the surface
    place(buf, ambience(9.0, 200, 1500) * 0.05, 47.12)
    for at in (49.1, 50.0, 50.7, 54.3, 54.6, 54.9, 55.3):
        place(buf, gulp_splash() * 0.16, at, pan=float(rs.uniform(-0.4, 0.4)))
    place(buf, pour(2.4) * 0.12, 61.2)
    return buf


def ui_sfx():
    buf = np.zeros((N, 2))
    for at in (2.84, 7.88, 20.6, 28.62, 38.22, 43.74, 47.12, 60.6, 65.68):
        place(buf, whoosh(0.5) * 0.2, at - 0.25)
    place(buf, sparkle(1.3, 34, True, 2) * 0.32, 12.0)
    place(buf, whoosh(0.9, 300, 6000, rev=True) * 0.25, 13.2)
    place(buf, sparkle(0.6, 22, False, 3) * 0.3, 14.3)
    pops = (0.4, 2.84, 3.88, 4.38, 4.98, 5.44, 6.3, 10.34, 10.6, 10.85, 16.12, 17.92, 18.98, 21.88, 23.18, 26.38,
            29.74, 31.12, 32.56, 34.34, 38.4, 43.74, 48.46, 49.34, 50.0, 61.26, 65.7, 66.0, 66.3, OUTRO + 0.3, OUTRO + 0.5, OUTRO + 0.7)
    for at in pops:
        place(buf, pop() * 0.22, at, pan=float(rs.uniform(-0.3, 0.3)))
    place(buf, chime((79, 84, 88)) * 0.24, 21.9)  # GUNA INSANG
    place(buf, chime((79, 84, 88, 91)) * 0.26, 36.06)  # OKSIGEN MASUK DARAH
    place(buf, nope() * 0.25, 42.58)
    place(buf, nope() * 0.25, 45.34)
    place(buf, chime((79, 84, 88)) * 0.24, 51.16)  # ORGAN NAFAS TAMBAHAN
    place(buf, boing() * 0.22, 56.15)
    place(buf, chime((79, 84, 88, 91)) * 0.35, 56.2)
    place(buf, sparkle(1.0, 24, False, 8) * 0.28, 56.25)
    place(buf, chime((84, 88, 91)) * 0.26, 63.86)  # OKSIGEN CUKUP
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
