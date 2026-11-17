#!/usr/bin/env python3
"""Soundtrack for Episode 045, synthesised from scratch (no samples, no
licensed music) and mixed under the narration.

Reuses the instruments and effects from Episode 005's build_audio.py and adds:
a petrol-station ding, a dinosaur rawr and a "poof", underwater bubbles and a
deep hum, sinking plinks, heavy layer thumps, a pressure groan and a fire
roar, a drill whirr and an oil glug, a furnace roar, rising vapour bubbles,
outlet trickles, a lorry engine and air brakes, and the petrol pump.

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

DUR = 82.0
OUTRO = 78.85
OUT = os.path.join(HERE, "output")
N = int(SR * DUR)
rs = np.random.default_rng(45)

# scene boundaries (must match episode.js)
STATION_A = (0.0, 14.56)
SEA = (14.56, 33.7)
RIG = (33.7, 44.64)
REFINERY = (44.64, 62.22)
STATION_B = (62.22, OUTRO)


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


def bubbles(dur=2.0, seed=1):
    r = np.random.default_rng(seed)
    m = int(dur * SR)
    out = np.zeros(m)
    for at in np.sort(r.uniform(0, dur - 0.15, int(dur * 9))):
        d = T(0.08)
        f = r.uniform(400, 1100)
        s = np.sin(2 * np.pi * np.cumsum(f * (1 + 2.5 * d / 0.08)) / SR) * np.exp(-d * 40)
        i = int(at * SR)
        out[i : i + len(s)] += s[: m - i] * r.uniform(0.3, 1)
    return norm(out)


def hum(dur=4.0, f=70):
    t = T(dur)
    return norm(np.sin(2 * np.pi * f * t) + 0.4 * np.sin(2 * np.pi * f * 1.5 * t)) * np.clip(t / 0.6, 0, 1) * np.clip((dur - t) / 0.8, 0, 1)


def thump(f=90):
    t = T(0.35)
    return norm(np.sin(2 * np.pi * np.cumsum(f * (1 - 0.5 * t / 0.35)) / SR) * np.exp(-t * 10) + 0.3 * fftfilt(rs.standard_normal(len(t)), 80, 600) * np.exp(-t * 20))


def roar(dur=2.0, lo=80, hi=900):
    t = T(dur)
    n = fftfilt(rs.standard_normal(len(t)), lo, hi) * (0.7 + 0.3 * np.sin(2 * np.pi * 5 * t))
    return norm(n) * np.clip(t / 0.3, 0, 1) * np.clip((dur - t) / 0.4, 0, 1)


def whirr(dur=1.5, f0=300, f1=900):
    t = T(dur)
    f = f0 + (f1 - f0) * np.clip(t / 0.4, 0, 1)
    return norm(np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * 0.4 + fftfilt(rs.standard_normal(len(t)), 500, 3000) * 0.5) * np.clip((dur - t) / 0.2, 0, 1)


def glug(f=180):
    t = T(0.18)
    return norm(np.sin(2 * np.pi * np.cumsum(f * (1 + 1.5 * t / 0.18)) / SR) * np.sin(np.pi * t / 0.18))


def ding():
    t = T(1.0)
    return norm(np.sin(2 * np.pi * 1318 * t) * np.exp(-t * 4) + 0.6 * np.sin(2 * np.pi * 1046 * t) * np.exp(-np.clip(t - 0.25, 0, None) * 4) * (t > 0.25))


def rawr():
    t = T(0.7)
    f = 220 - 90 * t / 0.7
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * (1 + 0.5 * np.sin(2 * np.pi * 30 * t)) + 0.4 * fftfilt(rs.standard_normal(len(t)), 300, 2000)
    return norm(s) * np.sin(np.pi * t / 0.7) ** 0.6


def engine(dur=3.0):
    t = T(dur)
    f = 55 + 10 * np.sin(2 * np.pi * 0.5 * t)
    s = np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * 0.5 + fftfilt(rs.standard_normal(len(t)), 60, 400)
    return norm(fftfilt(s, 40, 900)) * np.clip(t / 0.4, 0, 1) * np.clip((dur - t) / 0.5, 0, 1)


def hiss(dur=0.5):
    t = T(dur)
    return norm(fftfilt(rs.standard_normal(len(t)), 3000, 9000)) * np.exp(-t * 5)


# ------------------------------------------------------------------ layers
def music():
    buf = np.zeros((N, 2))
    beat = 60 / 104
    bar = beat * 4
    home = [(48, [60, 64, 67]), (53, [60, 65, 69]), (55, [59, 62, 67]), (48, [60, 64, 67])]
    deep = [(45, [64, 69, 72]), (41, [65, 69, 72]), (43, [62, 67, 71]), (45, [64, 69, 72])]
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

    loop(*STATION_A, home, marimba, 1.0)
    loop(*SEA, deep, musicbox, 0.85, half=False)
    loop(*RIG, home, musicbox, 0.9)
    loop(*REFINERY, deep, musicbox, 0.9)
    loop(*STATION_B, home, marimba, 1.05)
    place(buf, pad([midi(n) for n in (48, 60, 64, 67, 72)], 3.2) * 0.2, OUTRO)
    for k, m in enumerate([72, 76, 79, 84]):
        place(buf, pluck_bell(midi(m), 2.5) * 0.12, OUTRO + 0.05 + k * 0.12, pan=-0.3 + 0.2 * k)
    place(buf, bass(midi(36), 2.0) * 0.3, OUTRO)
    fade = int(1.2 * SR)
    buf[-fade:] *= np.linspace(1, 0, fade)[:, None]
    return buf


def story_sfx():
    buf = np.zeros((N, 2))
    place(buf, ding() * 0.14, 0.3)
    place(buf, rawr() * 0.2, 5.15)
    place(buf, whoosh(0.6, 300, 4000) * 0.2, 13.5)  # poof
    # ancient sea
    place(buf, hum(19.0, 60) * 0.1, 14.6)
    place(buf, bubbles(4.5, 2) * 0.1, 14.7)
    for i, at in enumerate(np.arange(21.7, 24.6, 0.16)):
        place(buf, shimmer(0.3, i + 40, 1400, 2600) * 0.05, float(at), pan=float(rs.uniform(-0.4, 0.4)))
    for i in range(4):
        place(buf, thump(80 + 10 * i) * 0.22, 25.4 + i * 0.7)
    place(buf, roar(3.0, 60, 500) * 0.12, 28.2)  # pressure groan
    place(buf, roar(2.6, 200, 1600) * 0.1, 29.1)  # heat
    for at in np.arange(30.2, 33.4, 0.3):
        place(buf, glug(150 + 30 * rs.uniform()) * 0.1, float(at))
    # rig: sea, drill, oil glugs
    place(buf, roar(2.5, 150, 900) * 0.06, 33.8)
    place(buf, whirr(1.6) * 0.14, 36.1)
    for at in np.arange(37.6, 40.0, 0.22):
        place(buf, glug(140 + 40 * rs.uniform()) * 0.12, float(at))
    # refinery
    for at in np.arange(44.8, 46.4, 0.25):
        place(buf, glug(160) * 0.08, float(at))
    place(buf, roar(13.0, 100, 800) * 0.1, 48.6)  # furnace
    place(buf, bubbles(4.0, 7) * 0.08, 51.3)
    for i, at in enumerate((56.4, 57.38, 58.24, 59.0, 60.48)):
        place(buf, shimmer(0.6, i + 50, 900 + 300 * i, 1800 + 400 * i) * 0.1, at)
    # tanker lorry and the pump
    place(buf, engine(3.4) * 0.16, 62.3)
    place(buf, hiss(0.6) * 0.12, 64.7)
    place(buf, roar(1.2, 400, 2400) * 0.08, 66.9)  # pump flow
    place(buf, ding() * 0.1, 67.6)
    return buf


def ui_sfx():
    buf = np.zeros((N, 2))
    for at in (2.18, 4.9, 6.44, 10.4, 19.56, 33.7, 36.0, 40.0, 44.64, 50.6, 62.22, 65.4, 67.9, 72.1, 76.44):
        place(buf, whoosh(0.5) * 0.2, at - 0.25)
    place(buf, sparkle(1.3, 34, True, 2) * 0.32, 8.7)
    place(buf, whoosh(0.9, 300, 6000, rev=True) * 0.25, 13.8)
    place(buf, sparkle(0.6, 22, False, 3) * 0.3, 14.56)
    pops = (0.4, 2.18, 3.14, 15.5, 17.04, 19.56, 21.6, 25.74, 26.74, 27.38, 28.16, 29.06, 30.92, 33.7, 34.66, 36.08, 36.6,
            38.02, 41.98, 43.1, 43.74, 44.7, 46.24, 48.6, 49.68, 51.26, 53.26, 56.4, 57.38, 58.24, 59.0, 60.48, 63.2,
            64.84, 66.68, 74.48, 76.5, 76.8, 77.1, OUTRO + 0.3, OUTRO + 0.5, OUTRO + 0.7)
    for at in pops:
        place(buf, pop() * 0.22, at, pan=float(rs.uniform(-0.3, 0.3)))
    place(buf, nope() * 0.18, 13.46)  # BUKAN DINOSAUR!
    place(buf, chime((79, 84, 88)) * 0.26, 18.42)  # PLANKTON!
    place(buf, chime((79, 84, 88)) * 0.22, 31.86)  # HITAM & PEKAT!
    place(buf, chime((84, 88, 91)) * 0.24, 40.02)  # DI MALAYSIA!
    place(buf, boing() * 0.22, 67.95)
    place(buf, chime((79, 84, 88, 91)) * 0.35, 68.0)
    place(buf, sparkle(1.0, 24, False, 8) * 0.28, 68.05)
    place(buf, nope() * 0.14, 73.18)  # MUDAH TERBAKAR!
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
