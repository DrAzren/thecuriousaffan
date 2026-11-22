#!/usr/bin/env python3
"""Soundtrack for Episode 057, synthesised from scratch (no samples, no
licensed music) and mixed under the narration.

Reuses the instruments and effects from Episode 005's build_audio.py and adds:
an apple crunch and a tiny "tink" as the tooth comes out, a soft glassy shimmer
inside the x-ray mouth, gentle tinks as the teeth are counted, a low creaking
push as the permanent tooth rises, a rattling wobble and a pop when the milk
tooth falls out, a milk "plop", a ticking clock, and toothbrush scrubs.

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

DUR = 65.6
OUTRO = 62.45
OUT = os.path.join(HERE, "output")
N = int(SR * DUR)
rs = np.random.default_rng(57)

# scene boundaries (must match episode.js)
ROOM_A = (0.0, 11.86)
MOUTH = (11.86, 52.34)
ROOM_B = (52.34, OUTRO)


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


def tink(f=3000):
    t = T(0.5)
    return norm((np.sin(2 * np.pi * f * t) + 0.4 * np.sin(2 * np.pi * f * 2.4 * t)) * np.exp(-t * 12))


def creak(dur, f=90):
    t = T(dur)
    x = np.sign(np.sin(2 * np.pi * np.cumsum(f * (1 + 0.3 * np.sin(2 * np.pi * 1.5 * t))) / SR)) * 0.5
    return norm(fftfilt(x, 60, 900)) * np.clip(t / 0.3, 0, 1) * np.clip((dur - t) / 0.3, 0, 1)


def plop():
    t = T(0.3)
    return norm(np.sin(2 * np.pi * np.cumsum(300 * (1 + 3 * t)) / SR) * np.exp(-t * 18))


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
    loop(*MOUTH, inner, musicbox, 0.85)
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
    for at in (0.35, 1.0, 1.65):
        place(buf, noise(0.18, 1500, 7000, 18) * 0.12, at)  # apple crunch
    place(buf, tink(3200) * 0.15, 2.4)
    place(buf, pad([midi(n) for n in (57, 64, 69)], 5.5) * 0.05, 12.0)
    for i in range(20):
        place(buf, tink(2000 + 60 * i) * 0.05, 15.8 + i * 0.075, pan=-0.5 + 0.05 * i)
    place(buf, creak(4.0, 70) * 0.05, 23.3)
    for at in np.arange(28.6, 29.9, 0.08):
        place(buf, noise(0.05, 800, 3000, 40) * 0.06, float(at), pan=float(rs.uniform(-0.3, 0.3)))
    place(buf, pop() * 0.3, 29.96)
    place(buf, creak(3.6, 60) * 0.04, 31.4)
    for i in range(32):
        place(buf, tink(2200 + 40 * i) * 0.04, 37.3 + i * 0.05, pan=-0.6 + 0.04 * i)
    place(buf, plop() * 0.25, 49.4)
    for at in np.arange(50.2, 52.3, 0.25):
        place(buf, noise(0.04, 2000, 6000, 60) * 0.1, float(at))  # clock ticks
    for at in np.arange(56.7, 60.1, 0.21):
        place(buf, noise(0.15, 2500, 9000) * 0.05, float(at), pan=float(rs.uniform(-0.2, 0.2)))  # brushing
    return buf


def ui_sfx():
    buf = np.zeros((N, 2))
    for at in (2.28, 8.08, 17.96, 35.88, 43.38, 52.34, 60.26):
        place(buf, whoosh(0.5) * 0.2, at - 0.25)
    place(buf, sparkle(1.3, 34, True, 2) * 0.32, 10.1)
    place(buf, whoosh(0.9, 300, 6000, rev=True) * 0.25, 10.95)
    place(buf, sparkle(0.6, 22, False, 3) * 0.3, 11.86)
    pops = (0.4, 2.32, 3.66, 8.15, 8.5, 8.9, 13.7, 15.8, 18.4, 19.22, 20.98, 23.36, 25.04, 28.6, 32.3, 34.2, 35.9,
            37.3, 41.3, 43.38, 45.0, 46.88, 47.36, 47.6, 48.68, 50.2, 56.42, 60.3, 60.6, 60.9,
            OUTRO + 0.3, OUTRO + 0.5, OUTRO + 0.7)
    for at in pops:
        place(buf, pop() * 0.22, at, pan=float(rs.uniform(-0.3, 0.3)))
    place(buf, chime((79, 84, 88)) * 0.24, 17.3)  # 20
    place(buf, chime((79, 84, 88, 91)) * 0.26, 29.98)  # TERCABUT
    place(buf, chime((79, 84, 88)) * 0.24, 38.9)  # 32
    place(buf, nope() * 0.22, 40.94)  # TAK AKAN TUMBUH LAGI
    place(buf, chime((84, 88, 91)) * 0.24, 50.2)  # DOKTOR GIGI
    place(buf, boing() * 0.22, 52.36)
    place(buf, chime((79, 84, 88, 91)) * 0.35, 52.4)
    place(buf, sparkle(1.0, 24, False, 8) * 0.28, 52.45)
    place(buf, chime((79, 84, 88)) * 0.24, 55.06)  # MEMBESAR
    place(buf, chime((79, 84, 88)) * 0.22, 58.36)  # GOSOK
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
