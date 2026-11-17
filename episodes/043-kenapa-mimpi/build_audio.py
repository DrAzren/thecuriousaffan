#!/usr/bin/env python3
"""Soundtrack for Episode 043, synthesised from scratch (no samples, no
licensed music) and mixed under the narration.

Reuses the instruments and effects from Episode 005's build_audio.py and adds:
a soft dreamy pad for the night scenes, dragon wing whooshes and a happy
roar, a ticking brain (gears), a sleep-cycle "heartbeat" blip, quick eye
flicks, dream-bubble pops, memory boxes landing on the shelf and a
mixed-up swirl, and a big yawn shimmer at bedtime.

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

DUR = 74.05
OUTRO = 70.9
OUT = os.path.join(HERE, "output")
N = int(SR * DUR)
rs = np.random.default_rng(43)

# scene boundaries (must match episode.js)
ROOM_A = (0.0, 13.12)
NIGHT = (13.12, 35.68)
MIND = (35.68, 46.52)
NIGHT_B = (46.52, 60.12)
ROOM_B = (60.12, OUTRO)


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
def shimmer(dur=1.5, seed=4, lo=2200, hi=4200, n=18):
    r = np.random.default_rng(seed)
    m = int(dur * SR)
    out = np.zeros(m)
    for at in np.sort(r.uniform(0, dur - 0.3, n)):
        d = T(0.25)
        s = np.sin(2 * np.pi * r.uniform(lo, hi) * d) * np.exp(-d * 14)
        i = int(at * SR)
        out[i : i + len(s)] += s[: m - i] * r.uniform(0.3, 1)
    return norm(out) * np.sin(np.pi * np.arange(m) / m) ** 0.5


def roar():
    t = T(0.9)
    f = 160 + 80 * np.sin(np.pi * t / 0.9)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) + 0.5 * fftfilt(rs.standard_normal(len(t)), 200, 1500)
    return norm(s) * np.sin(np.pi * t / 0.9) ** 0.7


def tick(f=2600):
    t = T(0.04)
    return norm(np.sin(2 * np.pi * f * t) * np.exp(-t * 150))


def blip(f=880):
    t = T(0.12)
    return norm(np.sin(2 * np.pi * f * t) * np.exp(-t * 25))


def flick():
    t = T(0.06)
    return norm(fftfilt(rs.standard_normal(len(t)), 2500, 7000) * np.exp(-t * 80))


def thunk(f=180):
    t = T(0.2)
    return norm(np.sin(2 * np.pi * np.cumsum(f * (1 - 0.4 * t / 0.2)) / SR) * np.exp(-t * 20) + 0.3 * fftfilt(rs.standard_normal(len(t)), 300, 2000) * np.exp(-t * 60))


# ------------------------------------------------------------------ layers
def music():
    buf = np.zeros((N, 2))
    beat = 60 / 96
    bar = beat * 4
    home = [(48, [60, 64, 67]), (53, [60, 65, 69]), (55, [59, 62, 67]), (48, [60, 64, 67])]
    dream = [(45, [64, 69, 72]), (41, [65, 69, 72]), (43, [62, 67, 71]), (40, [64, 67, 71])]
    arp = [0, 1, 2, 1, 0, 2, 1, 2]

    def loop(a, b, chords, inst, gain=1.0, half=True, padg=0.11):
        t0, i = a, 0
        while t0 < b - 0.3:
            root, ch = chords[i % 4]
            place(buf, pad([midi(n) for n in ch], max(1.6, min(bar + 0.6, b - t0 + 0.4))) * padg * gain, t0)
            for k in range(8 if half else 4):
                at = t0 + k * (beat / 2 if half else beat)
                if at < b - 0.1:
                    place(buf, inst(midi(ch[arp[k]] + 12)) * 0.1 * gain, at, pan=-0.3 + 0.08 * k)
            place(buf, bass(midi(root - 12), 0.5) * 0.2 * gain, t0)
            t0 += bar
            i += 1

    loop(*ROOM_A, home, marimba, 1.0)
    loop(*NIGHT, dream, musicbox, 0.8, half=False, padg=0.16)
    loop(*MIND, dream, musicbox, 0.9)
    loop(*NIGHT_B, dream, musicbox, 0.8, half=False, padg=0.16)
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
    # dream flight: wing whooshes and a happy roar
    for at in np.arange(2.4, 5.8, 1.05):
        place(buf, whoosh(0.6, 200, 2500) * 0.14, float(at), pan=0.2)
    place(buf, roar() * 0.14, 4.7)
    place(buf, shimmer(3.0, 4, 2400, 5000) * 0.1, 2.4)
    # the busy brain: gears tick
    for i, at in enumerate(np.arange(16.3, 20.1, 0.25)):
        place(buf, tick(2400 + 300 * (i % 2)) * 0.06, float(at), pan=0.2)
    # sleep cycles blip
    for i, at in enumerate(np.arange(20.7, 24.4, 0.19)):
        place(buf, blip(660 + 110 * (i % 4)) * 0.05, float(at), pan=-0.2)
    # quick eye flicks during REM
    for at in np.arange(26.7, 32.8, 0.18):
        place(buf, flick() * 0.06, float(at), pan=float(rs.uniform(-0.3, 0.3)))
    place(buf, shimmer(1.6, 7, 1500, 3000) * 0.14, 33.1)
    # memory boxes land on the shelf, then mix
    for i in range(6):
        place(buf, thunk(170 + 20 * i) * 0.16, 39.55 + i * 0.5)
    place(buf, whoosh(1.4, 300, 4000, rev=True) * 0.18, 42.6)
    place(buf, shimmer(1.6, 9, 1800, 3600) * 0.14, 44.4)
    # dreams pop up in the night, then fade at morning
    for at in (47.3, 48.2, 49.0, 49.7):
        place(buf, shimmer(0.7, int(at * 10), 1800, 3800) * 0.1, at)
    place(buf, whoosh(1.2, 400, 3000) * 0.12, 51.0)
    # bedtime: settle down
    place(buf, shimmer(2.0, 11, 900, 1800) * 0.1, 64.6)
    return buf


def ui_sfx():
    buf = np.zeros((N, 2))
    for at in (2.28, 5.84, 9.34, 15.7, 20.2, 24.98, 33.0, 35.68, 38.9, 42.48, 46.52, 50.85, 54.04, 60.12, 64.8, 68.66):
        place(buf, whoosh(0.5) * 0.2, at - 0.25)
    place(buf, sparkle(1.3, 34, True, 2) * 0.32, 11.6)
    place(buf, whoosh(0.9, 300, 6000, rev=True) * 0.25, 12.3)
    place(buf, sparkle(0.6, 22, False, 3) * 0.3, 13.12)
    pops = (0.4, 2.28, 7.56, 9.34, 14.6, 16.2, 17.9, 20.88, 22.66, 24.98, 26.66, 28.28, 35.68, 39.0, 42.48, 46.52,
            47.3, 48.2, 49.0, 49.7, 50.16, 55.12, 55.2, 55.6, 56.0, 56.4, 65.58, 68.7, 69.0, 69.3,
            OUTRO + 0.3, OUTRO + 0.5, OUTRO + 0.7)
    for at in pops:
        place(buf, pop() * 0.22, at, pan=float(rs.uniform(-0.3, 0.3)))
    place(buf, chime((79, 84, 88)) * 0.26, 31.0)  # R.E.M
    place(buf, chime((84, 88, 91)) * 0.24, 34.2)  # MASA BERMIMPI!
    place(buf, chime((79, 84, 88)) * 0.22, 40.92)  # MACAM KEMAS ALMARI!
    place(buf, boing() * 0.2, 44.5)  # MIMPI PELIK-PELIK!
    place(buf, nope() * 0.16, 52.6)  # DAH LUPA!
    place(buf, chime((79, 84, 88)) * 0.24, 58.0)  # MASIH BANYAK RAHSIA!
    place(buf, boing() * 0.22, 60.15)
    place(buf, chime((79, 84, 88, 91)) * 0.35, 60.2)
    place(buf, sparkle(1.0, 24, False, 8) * 0.28, 60.25)
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
