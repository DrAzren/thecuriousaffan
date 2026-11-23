#!/usr/bin/env python3
"""Soundtrack for Episode 060, synthesised from scratch (no samples, no
licensed music) and mixed under the narration.

Reuses the instruments and effects from Episode 005's build_audio.py and adds:
metallic "zip-clink" snaps as paper clips jump to the magnet, a low magnetic
hum, a shimmering wave as tiny magnets line up, a heavy "clack" when opposite
poles snap together and a bouncy "boing" when like poles push apart, a
sliding scrape for the iron block, a deep planetary drone for the Earth and a
spinning compass rattle.

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

DUR = 58.35
OUTRO = 55.2
OUT = os.path.join(HERE, "output")
N = int(SR * DUR)
rs = np.random.default_rng(60)

# scene boundaries (must match episode.js)
KIT_A = (0.0, 11.76)
LAB = (11.76, 44.98)
KIT_B = (44.98, OUTRO)


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


def clink(f=3400):
    t = T(0.25)
    return norm((np.sin(2 * np.pi * f * t) + 0.5 * np.sin(2 * np.pi * f * 1.7 * t)) * np.exp(-t * 25))


def zip_(dur=0.18):
    t = T(dur)
    return norm(np.sin(2 * np.pi * np.cumsum(500 + 3000 * t / dur) / SR) * np.sin(np.pi * t / dur))


def hum(dur, f=110):
    t = T(dur)
    x = np.sin(2 * np.pi * f * t) + 0.4 * np.sin(2 * np.pi * 2 * f * t) + 0.25 * np.sin(2 * np.pi * 3 * f * t)
    return norm(x * (0.8 + 0.2 * np.sin(2 * np.pi * 4 * t))) * np.clip(t / 0.3, 0, 1) * np.clip((dur - t) / 0.3, 0, 1)


def clack():
    t = T(0.3)
    return norm(fftfilt(rs.standard_normal(len(t)), 300, 3000) * np.exp(-t * 30) + 0.8 * np.sin(2 * np.pi * 90 * t) * np.exp(-t * 15))


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

    loop(*KIT_A, home, marimba, 1.0)
    loop(*LAB, inner, musicbox, 0.85)
    loop(*KIT_B, home, marimba, 1.0)
    place(buf, pad([midi(n) for n in (48, 60, 64, 67, 72)], 3.2) * 0.2, OUTRO)
    for k, m in enumerate([72, 76, 79, 84]):
        place(buf, pluck_bell(midi(m), 2.5) * 0.12, OUTRO + 0.05 + k * 0.12, pan=-0.3 + 0.2 * k)
    place(buf, bass(midi(36), 2.0) * 0.3, OUTRO)
    fade = int(1.2 * SR)
    buf[-fade:] *= np.linspace(1, 0, fade)[:, None]
    return buf


def story_sfx():
    buf = np.zeros((N, 2))
    for i in range(7):
        at = 3.84 + (i / 7) * 0.35
        place(buf, zip_() * 0.07, at, pan=float(rs.uniform(-0.4, 0.4)))
        place(buf, clink(float(rs.uniform(3000, 4200))) * 0.1, at + 0.28)
    place(buf, hum(3.0) * 0.04, 3.5)
    place(buf, hum(5.8, 98) * 0.035, 12.0)
    place(buf, clack() * 0.3, 22.38)
    place(buf, boing() * 0.22, 23.75)
    place(buf, noise(1.2, 200, 1500) * 0.05, 29.7)
    for k in range(15):
        place(buf, clink(2200 + 90 * k) * 0.035, 31.4 + k * 0.08)
    place(buf, noise(0.6, 200, 1200) * 0.08, 33.6)
    place(buf, clack() * 0.25, 34.2)
    place(buf, hum(6.4, 55) * 0.05, 38.4)
    for at in np.arange(42.2, 43.6, 0.07):
        place(buf, clink(float(rs.uniform(4500, 6000))) * 0.02, float(at))
    place(buf, hum(2.0) * 0.03, 47.4)
    return buf


def ui_sfx():
    buf = np.zeros((N, 2))
    for at in (2.14, 7.78, 18.04, 21.56, 23.3, 25.44, 37.66, 44.98, 52.96):
        place(buf, whoosh(0.5) * 0.2, at - 0.25)
    place(buf, sparkle(1.3, 34, True, 2) * 0.32, 10.0)
    place(buf, whoosh(0.9, 300, 6000, rev=True) * 0.25, 10.9)
    place(buf, sparkle(0.6, 22, False, 3) * 0.3, 11.76)
    pops = (0.4, 2.18, 3.08, 3.9, 7.85, 8.15, 8.5, 16.1, 19.16, 20.24, 25.5, 27.6, 29.7, 31.36, 35.26, 35.7, 36.24,
            37.66, 42.22, 43.66, 50.2, 51.96, 53.0, 53.3, 53.6, OUTRO + 0.3, OUTRO + 0.5, OUTRO + 0.7)
    for at in pops:
        place(buf, pop() * 0.22, at, pan=float(rs.uniform(-0.3, 0.3)))
    place(buf, chime((79, 84, 88)) * 0.24, 12.94)  # BERJUTA-JUTA
    place(buf, chime((79, 84, 88)) * 0.24, 21.82)  # BERTARIKAN
    place(buf, nope() * 0.16, 23.66)  # BERTOLAKAN
    place(buf, chime((79, 84, 88, 91)) * 0.24, 33.58)  # TERTARIK
    place(buf, chime((84, 88, 91)) * 0.24, 38.64)  # BUMI
    place(buf, boing() * 0.22, 45.0)
    place(buf, chime((79, 84, 88, 91)) * 0.35, 45.04)
    place(buf, sparkle(1.0, 24, False, 8) * 0.28, 45.08)
    place(buf, chime((79, 84, 88)) * 0.24, 47.42)  # DAYA MAGNET
    place(buf, nope() * 0.18, 48.92)  # JANGAN
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
