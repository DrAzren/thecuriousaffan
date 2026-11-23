#!/usr/bin/env python3
"""Soundtrack for Episode 059, synthesised from scratch (no samples, no
licensed music) and mixed under the narration.

Reuses the instruments and effects from Episode 005's build_audio.py and adds:
a cat's meow and a soft thump as it lands, a shimmering "balance" tone for the
inner ear, a rushing wind for slow-motion falling, three rising plucks as the
head, front and back turn the right way up, a parachute "fwump", springy
boings for the bendy legs and a cushiony landing.

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

DUR = 58.25
OUTRO = 55.1
OUT = os.path.join(HERE, "output")
N = int(SR * DUR)
rs = np.random.default_rng(59)

# scene boundaries (must match episode.js)
ROOM_A = (0.0, 12.32)
STAGE = (12.32, 43.82)
ROOM_B = (43.82, OUTRO)


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


def meow():
    t = T(0.55)
    f = 520 + 260 * np.sin(np.pi * t / 0.55)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) + 0.4 * np.sin(4 * np.pi * np.cumsum(f) / SR)
    return norm(fftfilt(x, 300, 4000) * np.sin(np.pi * t / 0.55) ** 0.7)


def thump(f=70):
    t = T(0.35)
    return norm(np.sin(2 * np.pi * f * t) * np.exp(-t * 14))


def shimmer(dur=1.2):
    t = T(dur)
    x = sum(np.sin(2 * np.pi * f * t + k) for k, f in enumerate((1568, 1976, 2349)))
    return norm(x * (0.6 + 0.4 * np.sin(2 * np.pi * 6 * t)) * np.sin(np.pi * t / dur))


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
    loop(*STAGE, inner, musicbox, 0.85)
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
    place(buf, whoosh(0.6, 400, 4000) * 0.12, 3.6)
    place(buf, thump() * 0.25, 4.55)
    place(buf, meow() * 0.14, 6.2)
    place(buf, shimmer(1.6) * 0.06, 13.0)
    place(buf, whoosh(0.8, 300, 3000) * 0.1, 18.0)
    for a, b in ((18.4, 30.0), (30.0, 34.2)):
        for at in np.arange(a, b, 2.0):
            place(buf, noise(2.2, 200, 1800) * 0.035, float(at))
    for k, at in enumerate((21.64, 23.24, 25.26)):
        place(buf, pluck_bell(midi(72 + 4 * k), 0.8) * 0.12, at)
    for at in np.arange(26.8, 28.8, 0.5):
        place(buf, boing(0.3) * 0.05, float(at))
    place(buf, whoosh(0.7, 150, 1500) * 0.16, 30.1)  # parachute fwump
    place(buf, thump(60) * 0.3, 34.25)
    for k in range(3):
        place(buf, boing(0.4) * (0.12 - 0.03 * k), 34.3 + k * 0.35)
    place(buf, shimmer(1.0) * 0.05, 37.4)
    place(buf, meow() * 0.12, 44.4)
    place(buf, meow() * 0.1, 53.3)
    return buf


def ui_sfx():
    buf = np.zeros((N, 2))
    for at in (2.18, 7.74, 15.4, 19.8, 28.94, 36.42, 43.82, 52.88):
        place(buf, whoosh(0.5) * 0.2, at - 0.25)
    place(buf, sparkle(1.3, 34, True, 2) * 0.32, 10.45)
    place(buf, whoosh(0.9, 300, 6000, rev=True) * 0.25, 11.45)
    place(buf, sparkle(0.6, 22, False, 3) * 0.3, 12.32)
    pops = (0.4, 2.2, 3.6, 5.92, 7.8, 8.1, 8.5, 12.66, 13.94, 14.4, 16.4, 17.24, 19.8, 30.1, 32.88, 35.06,
            36.42, 37.6, 38.3, 39.16, 50.58, 52.9, 53.2, 53.5, OUTRO + 0.3, OUTRO + 0.5, OUTRO + 0.7)
    for at in pops:
        place(buf, pop() * 0.22, at, pan=float(rs.uniform(-0.3, 0.3)))
    place(buf, chime((79, 84, 88)) * 0.24, 5.92)  # MENDARAT
    place(buf, chime((79, 84, 88)) * 0.24, 26.72)  # LENTUR
    place(buf, chime((79, 84, 88, 91)) * 0.24, 31.2)  # PAYUNG TERJUN
    place(buf, chime((84, 88, 91)) * 0.24, 41.9)  # BERPUSING
    place(buf, boing() * 0.22, 43.84)
    place(buf, chime((79, 84, 88, 91)) * 0.35, 43.88)
    place(buf, sparkle(1.0, 24, False, 8) * 0.28, 43.92)
    place(buf, chime((79, 84, 88)) * 0.24, 45.66)  # AKROBAT
    place(buf, nope() * 0.18, 47.82)  # JANGAN
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
