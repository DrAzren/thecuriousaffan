#!/usr/bin/env python3
"""Soundtrack for Episode 046, synthesised from scratch (no samples, no
licensed music) and mixed under the narration.

Reuses the instruments and effects from Episode 005's build_audio.py and adds:
running footsteps and panting, a soft heartbeat (lub-dub) that speeds up
from 80 to 140 beats a minute, flowing blood whooshes, valve door slams for
"dup!" and "dap!", a pulse beep, and jumping-jack boings.

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

DUR = 70.6
OUTRO = 67.45
OUT = os.path.join(HERE, "output")
N = int(SR * DUR)
rs = np.random.default_rng(46)

# scene boundaries (must match episode.js)
PARK_A = (0.0, 12.68)
BODY = (12.68, 41.94)
PARK_B = (41.94, OUTRO)


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
def thump(f=60, dur=0.16):
    t = T(dur)
    return norm(np.sin(2 * np.pi * np.cumsum(f * (1 - 0.3 * t / dur)) / SR) * np.exp(-t * 22))


def heartbeat(a, b, bpm0, bpm1=None, gain=0.3):
    """lub-dub pairs from a to b; bpm can ramp."""
    out = []
    at = a
    while at < b:
        k = (at - a) / max(1e-6, b - a)
        bpm = bpm0 if bpm1 is None else bpm0 + (bpm1 - bpm0) * k
        out.append(at)
        at += 60 / bpm
    return out


def step(f=180):
    t = T(0.08)
    return norm(fftfilt(rs.standard_normal(len(t)), 150, 1500) * np.exp(-t * 60) + 0.4 * np.sin(2 * np.pi * f * t) * np.exp(-t * 50))


def pant(dur=0.4):
    t = T(dur)
    return norm(fftfilt(rs.standard_normal(len(t)), 500, 3000)) * np.sin(np.pi * t / dur) ** 2


def slam(f=120):
    t = T(0.3)
    return norm(np.sin(2 * np.pi * np.cumsum(f * (1 - 0.5 * t / 0.3)) / SR) * np.exp(-t * 18) + 0.6 * fftfilt(rs.standard_normal(len(t)), 200, 3000) * np.exp(-t * 40))


def flow(dur=3.0):
    t = T(dur)
    n = fftfilt(rs.standard_normal(len(t)), 120, 700) * (0.6 + 0.4 * np.sin(2 * np.pi * 1.25 * t))
    return norm(n) * np.clip(t / 0.4, 0, 1) * np.clip((dur - t) / 0.4, 0, 1)


def beep(f=1200):
    t = T(0.12)
    return norm(np.sin(2 * np.pi * f * t)) * np.clip((0.12 - t) / 0.03, 0, 1) * np.clip(t / 0.01, 0, 1)


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
    loop(*BODY, inner, musicbox, 0.85)
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
    for i, at in enumerate(np.arange(0.1, 2.2, 0.35)):
        place(buf, step(170 + 20 * (i % 2)) * 0.12, float(at), pan=0.2 * (1 if i % 2 else -1))
    for at in np.arange(2.3, 4.4, 0.7):
        place(buf, pant(0.4) * 0.1, float(at))
    # heartbeats: fast after running, calm in the body, valves, faster again while running
    for at in heartbeat(4.6, 8.8, 140):
        place(buf, thump(62) * 0.3, at)
        place(buf, thump(70, 0.12) * 0.2, at + 0.16)
    for at in heartbeat(13.0, 33.0, 75):
        place(buf, thump(60) * 0.22, at)
        place(buf, thump(68, 0.12) * 0.15, at + 0.22)
    place(buf, flow(9.0) * 0.08, 23.8)
    place(buf, slam(110) * 0.32, 38.95)
    place(buf, slam(140) * 0.3, 40.95)
    for i, at in enumerate(np.arange(42.2, 50.1, 0.25)):
        place(buf, step(170 + 20 * (i % 2)) * 0.08, float(at), pan=0.2 * (1 if i % 2 else -1))
    for at in heartbeat(42.4, 50.1, 80, 140):
        place(buf, thump(62) * 0.22, at)
        place(buf, thump(70, 0.12) * 0.15, at + 0.16)
    for at in np.arange(53.4, 56.9, 0.72):
        place(buf, beep(1100) * 0.08, float(at))
    for at in np.arange(60.7, 63.6, 0.62):
        place(buf, boing() * 0.08, float(at))
    return buf


def ui_sfx():
    buf = np.zeros((N, 2))
    for at in (2.24, 4.52, 8.86, 16.94, 22.2, 26.6, 33.02, 41.94, 50.18, 56.94, 60.6, 65.1):
        place(buf, whoosh(0.5) * 0.2, at - 0.25)
    place(buf, sparkle(1.3, 34, True, 2) * 0.32, 10.9)
    place(buf, whoosh(0.9, 300, 6000, rev=True) * 0.25, 11.6)
    place(buf, sparkle(0.6, 22, False, 3) * 0.3, 12.68)
    pops = (0.4, 4.52, 6.48, 6.8, 7.14, 7.36, 12.9, 15.48, 18.74, 20.78, 23.68, 27.54, 28.32, 29.28, 30.24, 31.68,
            34.72, 37.46, 42.4, 43.26, 51.72, 60.66, 61.7, 62.0, 62.3, 65.15, 65.45, 65.75, OUTRO + 0.3, OUTRO + 0.5, OUTRO + 0.7)
    for at in pops:
        place(buf, pop() * 0.22, at, pan=float(rs.uniform(-0.3, 0.3)))
    place(buf, chime((79, 84, 88)) * 0.24, 14.5)  # SAMA BESAR
    place(buf, chime((79, 84, 88)) * 0.22, 17.34)  # OTOT YANG KUAT!
    place(buf, chime((84, 88, 91)) * 0.24, 46.64)  # JANTUNG LEBIH LAJU!
    place(buf, chime((79, 84, 88)) * 0.24, 54.56)  # NADI
    place(buf, boing() * 0.22, 56.95)
    place(buf, chime((79, 84, 88, 91)) * 0.35, 57.0)
    place(buf, sparkle(1.0, 24, False, 8) * 0.28, 57.05)
    place(buf, chime((84, 88, 91)) * 0.26, 63.66)  # JANTUNG KUAT!
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
