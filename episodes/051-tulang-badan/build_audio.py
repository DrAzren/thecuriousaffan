#!/usr/bin/env python3
"""Soundtrack for Episode 051, synthesised from scratch (no samples, no
licensed music) and mixed under the narration.

Reuses the instruments and effects from Episode 005's build_audio.py and adds:
an x-ray scanner hum and sweep, a ticking bone counter,
xylophone-like bone clacks, a click as skull plates join, finger taps, a
heartbeat inside the ribs, bubbly blood cells, a milk gulp, and jumping
thumps for star jumps.

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

DUR = 71.5
OUTRO = 68.35
OUT = os.path.join(HERE, "output")
N = int(SR * DUR)
rs = np.random.default_rng(51)

# scene boundaries (must match episode.js)
ROOM_A = (0.0, 11.56)
XRAY = (11.56, 48.1)
ROOM_B = (48.1, OUTRO)


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
def hum(dur, f=120):
    t = T(dur)
    x = np.sin(2 * np.pi * f * t) + 0.5 * np.sin(2 * np.pi * f * 3 * t) * (0.5 + 0.5 * np.sin(2 * np.pi * 2 * t))
    return norm(x) * np.clip(t / 0.3, 0, 1) * np.clip((dur - t) / 0.3, 0, 1)


def sweep(dur=1.0):
    t = T(dur)
    return norm(np.sin(2 * np.pi * np.cumsum(600 + 1800 * t / dur) / SR)) * np.sin(np.pi * t / dur) ** 2


def clack(f=900):
    t = T(0.12)
    return norm((np.sin(2 * np.pi * f * t) + 0.5 * np.sin(2 * np.pi * f * 2.7 * t)) * np.exp(-t * 40))


def thump(f=60, dur=0.16):
    t = T(dur)
    return norm(np.sin(2 * np.pi * np.cumsum(f * (1 - 0.3 * t / dur)) / SR) * np.exp(-t * 22))


def blub(f=500):
    t = T(0.09)
    return norm(np.sin(2 * np.pi * np.cumsum(f * (1 + 2.5 * t / 0.09)) / SR) * np.exp(-t * 45))


def gulp():
    t = T(0.25)
    return norm(np.sin(2 * np.pi * np.cumsum(220 * (1 + t * 3)) / SR) * np.exp(-t * 18))


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
    loop(*XRAY, inner, musicbox, 0.85)
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
    for at in np.arange(3.7, 5.5, 0.35):
        place(buf, clack(500) * 0.06, float(at))
    place(buf, hum(1.4, 110) * 0.06, 6.0)
    place(buf, sweep(1.2) * 0.06, 6.0)
    place(buf, hum(36.5, 100) * 0.03, 11.56)
    place(buf, sweep(1.2) * 0.06, 11.6)
    for k, at in enumerate(np.linspace(12.6, 13.9, 14)):
        place(buf, clack(700 + 30 * k) * 0.06, float(at))
    for k, at in enumerate(np.linspace(16.8, 17.6, 10)):
        place(buf, clack(1000 + 40 * k) * 0.05, float(at))
    place(buf, clack(400) * 0.2, 21.75)
    for at in np.arange(27.4, 29.2, 0.12):
        place(buf, clack(float(rs.uniform(1200, 1800))) * 0.04, float(at), pan=float(rs.uniform(-0.4, 0.4)))
    for at in np.arange(41.7, 44.5, 0.85):
        place(buf, thump(62) * 0.18, float(at))
        place(buf, thump(70, 0.12) * 0.12, float(at + 0.2))
    for at in np.arange(46.3, 48.1, 0.2):
        place(buf, blub(float(rs.uniform(300, 600))) * 0.06, float(at), pan=float(rs.uniform(-0.4, 0.4)))
    for at in (62.3, 62.6):
        place(buf, gulp() * 0.18, at)
    for at in np.arange(63.2, 65.7, 0.4545):
        place(buf, thump(80) * 0.14, float(at + 0.22))
    return buf


def ui_sfx():
    buf = np.zeros((N, 2))
    for at in (2.22, 6.0, 7.34, 14.68, 18.54, 22.24, 29.21, 32.5, 37.8, 44.5, 48.1, 61.76, 66.12):
        place(buf, whoosh(0.5) * 0.2, at - 0.25)
    place(buf, sparkle(1.3, 34, True, 2) * 0.32, 9.8)
    place(buf, whoosh(0.9, 300, 6000, rev=True) * 0.25, 10.7)
    place(buf, sparkle(0.6, 22, False, 3) * 0.3, 11.56)
    pops = (0.4, 2.28, 3.64, 6.2, 7.4, 7.45, 7.75, 8.1, 11.62, 15.24, 18.6, 23.44, 25.26, 25.84, 26.2, 29.96, 31.18,
            32.56, 33.66, 34.6, 34.0, 36.7, 38.62, 40.1, 41.68, 42.5, 44.56, 45.84, 48.16, 52.66, 53.56, 54.3, 62.08, 63.2,
            66.15, 66.45, 66.75, OUTRO + 0.3, OUTRO + 0.5, OUTRO + 0.7)
    for at in pops:
        place(buf, pop() * 0.22, at, pan=float(rs.uniform(-0.3, 0.3)))
    place(buf, chime((79, 84, 88)) * 0.26, 4.96)  # KERAS
    place(buf, chime((79, 84, 88, 91)) * 0.3, 13.82)  # 206 TULANG
    place(buf, chime((79, 84, 88)) * 0.24, 20.62)  # BERCANTUM
    place(buf, chime((84, 88, 91)) * 0.24, 36.44)  # SEBUTIR BERAS
    place(buf, chime((79, 84, 88)) * 0.24, 47.06)  # SEL DARAH
    place(buf, chime((79, 84, 88)) * 0.24, 51.38)  # KALSIUM
    place(buf, chime((84, 88, 91, 96)) * 0.26, 55.88)  # MATAHARI
    place(buf, boing() * 0.22, 57.35)
    place(buf, chime((79, 84, 88, 91)) * 0.35, 57.4)
    place(buf, sparkle(1.0, 24, False, 8) * 0.28, 57.45)
    place(buf, chime((84, 88, 91)) * 0.26, 65.18)  # TULANG KUAT
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
