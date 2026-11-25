#!/usr/bin/env python3
"""Soundtrack for Episode 065, synthesised from scratch (no samples, no
licensed music) and mixed under the narration.

Reuses the instruments and effects from Episode 005's build_audio.py and adds:
ice cubes clinking, a little splash into the glass, soft bubbly ticks for the
jiggling water molecules, a crystalline shimmer as the water freezes, a creak
and clunk for the balance, underwater bubbles for the lake and a cold wind.

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

DUR = 53.05
OUTRO = 49.9
OUT = os.path.join(HERE, "output")
N = int(SR * DUR)
rs = np.random.default_rng(65)

# scene boundaries (must match episode.js)
KITCHEN_A = (0.0, 11.24)
LAB = (11.24, 40.16)
KITCHEN_B = (40.16, OUTRO)
DROP = 4.77  # the ice cube hits the sirap


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


def clink(f=3200):
    t = T(0.5)
    x = np.sin(2 * np.pi * f * t) + 0.6 * np.sin(2 * np.pi * f * 2.76 * t) + 0.3 * np.sin(2 * np.pi * f * 5.4 * t)
    return norm(x * np.exp(-t * 14))


def splash(dur=0.6):
    t = T(dur)
    x = noise(dur, 300, 6000, decay=7)
    for k in range(8):
        at = int(rs.uniform(0.02, 0.35) * SR)
        tt = T(0.05)
        f = rs.uniform(600, 1400)
        x[at:at + len(tt)] += 0.5 * np.sin(2 * np.pi * np.cumsum(f * (1 + 2 * tt / 0.05)) / SR) * np.exp(-tt * 60)
    return norm(x)


def tick(f=1800):
    t = T(0.06)
    return norm(np.sin(2 * np.pi * f * t) * np.exp(-t * 80))


def shimmer(dur=2.0):
    t = T(dur)
    x = np.zeros(len(t))
    for k in range(18):
        at = int(rs.uniform(0, dur - 0.4) * SR)
        tt = T(0.4)
        f = rs.uniform(2500, 5200)
        x[at:at + len(tt)] += np.sin(2 * np.pi * f * tt) * np.exp(-tt * 9)
    return norm(x) * np.clip(t / 0.3, 0, 1)


def creak(dur=0.9):
    t = T(dur)
    f = 180 + 60 * np.sin(2 * np.pi * 3 * t)
    return norm(np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * np.exp(-((t - dur / 2) / (dur / 3)) ** 2)) * 0.5


def thud():
    t = T(0.4)
    return norm(np.sin(2 * np.pi * np.cumsum(110 * np.exp(-t * 6) + 50) / SR) * np.exp(-t * 9))


def bubble(f=600):
    t = T(0.12)
    return norm(np.sin(2 * np.pi * np.cumsum(f * (1 + 3 * t / 0.12)) / SR) * np.sin(np.pi * t / 0.12))


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

    loop(*KITCHEN_A, home, marimba, 1.0)
    loop(*LAB, inner, musicbox, 0.85)
    loop(*KITCHEN_B, home, marimba, 1.0)
    place(buf, pad([midi(n) for n in (48, 60, 64, 67, 72)], 3.2) * 0.2, OUTRO)
    for k, m in enumerate([72, 76, 79, 84]):
        place(buf, pluck_bell(midi(m), 2.5) * 0.12, OUTRO + 0.05 + k * 0.12, pan=-0.3 + 0.2 * k)
    place(buf, bass(midi(36), 2.0) * 0.3, OUTRO)
    fade = int(1.2 * SR)
    buf[-fade:] *= np.linspace(1, 0, fade)[:, None]
    return buf


def story_sfx():
    buf = np.zeros((N, 2))
    # ice: picked from the bowl, dropped into the glass, bobbing clinks
    place(buf, clink(2900) * 0.18, 3.7, pan=0.3)
    place(buf, clink(3300) * 0.12, 3.85, pan=0.3)
    place(buf, splash() * 0.25, DROP)
    for at in (5.9, 6.4, 6.9, 7.6, 41.0, 45.6, 46.3):
        place(buf, clink(float(rs.uniform(2800, 3600))) * 0.07, at, pan=float(rs.uniform(-0.4, 0.4)))
    # molecules jiggling (liquid), then freezing
    for at in np.arange(11.4, 19.6, 0.11):
        place(buf, tick(float(rs.uniform(1200, 2600))) * 0.025, float(at + rs.uniform(0, 0.08)), pan=float(rs.uniform(-0.7, 0.7)))
    place(buf, shimmer(3.0) * 0.08, 19.2)
    place(buf, noise(6.8, 400, 3000) * 0.02, 19.0)
    for at in np.arange(21.0, 21.7, 0.06):
        place(buf, tick(2600) * 0.03, float(at), pan=float(rs.uniform(-0.5, 0.5)))
    # balance
    place(buf, creak() * 0.12, 26.3)
    place(buf, thud() * 0.25, 27.3)
    # tank: a soft plop and bubbles
    place(buf, splash(0.4) * 0.1, 29.4)
    # the lake: cold wind above, bubbles below
    place(buf, noise(8.3, 200, 1500) * 0.045, 31.85)
    for at in np.arange(32.2, 40.0, 0.35):
        place(buf, bubble(float(rs.uniform(400, 900))) * 0.05, float(at + rs.uniform(0, 0.2)), pan=float(rs.uniform(-0.5, 0.5)))
    place(buf, shimmer(1.6) * 0.06, 34.4)
    return buf


def ui_sfx():
    buf = np.zeros((N, 2))
    for at in (2.2, 5.7, 7.44, 25.9, 29.33, 31.82, 40.16, 47.5):
        place(buf, whoosh(0.5) * 0.2, at - 0.25)
    place(buf, sparkle(1.3, 34, True, 2) * 0.32, 7.5)
    place(buf, whoosh(0.9, 300, 6000, rev=True) * 0.25, 10.3)
    place(buf, sparkle(0.6, 22, False, 3) * 0.3, 11.24)
    pops = (0.4, 2.22, 4.04, 4.78, 7.5, 7.8, 8.1, 11.3, 12.48, 18.64, 21.04, 26.0, 27.24, 31.88, 34.36, 35.96,
            47.55, 47.85, 48.15, OUTRO + 0.3, OUTRO + 0.5, OUTRO + 0.7)
    for at in pops:
        place(buf, pop() * 0.22, at, pan=float(rs.uniform(-0.3, 0.3)))
    place(buf, chime((79, 84, 88)) * 0.24, 6.32)  # AIS TERAPUNG
    place(buf, chime((79, 84, 88)) * 0.22, 16.48)  # BERHIMPIT RAPAT
    place(buf, chime((84, 88, 91)) * 0.24, 22.96)  # SARANG LEBAH
    place(buf, chime((79, 84, 88, 91)) * 0.26, 24.38)  # RUANG KOSONG
    place(buf, chime((79, 84, 88)) * 0.22, 28.7)  # SAMA BESAR
    place(buf, chime((84, 88, 91)) * 0.24, 29.38)  # SEBAB TU AIS TERAPUNG
    place(buf, chime((79, 84, 88)) * 0.24, 37.52)  # IKAN
    place(buf, boing() * 0.22, 40.2)
    place(buf, chime((79, 84, 88, 91)) * 0.35, 40.24)
    place(buf, sparkle(1.0, 24, False, 8) * 0.28, 40.3)
    place(buf, chime((79, 84, 88)) * 0.24, 41.14)
    place(buf, chime((84, 88, 91)) * 0.2, 44.88)  # MINUM AIR SEJUK
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
