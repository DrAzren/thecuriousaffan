#!/usr/bin/env python3
"""Soundtrack for Episode 037, synthesised from scratch (no samples, no
licensed music) and mixed under the narration.

Reuses the instruments and effects from Episode 005's build_audio.py and adds:
last raindrops and birdsong after the rain, a light-beam hum, a glassy prism
chime and one note per colour, a drop "bloop", bend/bounce pings, a ring
shimmer, a whoosh for the airplane view, a hose spray hiss, and a jump boing.

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

DUR = 72.55
OUTRO = 69.4
OUT = os.path.join(HERE, "output")
N = int(SR * DUR)
rs = np.random.default_rng(37)

# scene boundaries (must match episode.js)
PARK_A = (0.0, 10.98)
LAB = (10.98, 34.2)
FIELD = (34.2, 45.2)
PARK_B = (45.2, OUTRO)


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
def drips(dur, rate=6.0, seed=1):
    r = np.random.default_rng(seed)
    n = int(dur * SR)
    out = np.zeros(n)
    for at in np.sort(r.uniform(0, dur - 0.15, int(dur * rate))):
        d = T(0.07)
        f0 = r.uniform(900, 1700)
        s = np.sin(2 * np.pi * np.cumsum(f0 * (1 + 1.8 * d / 0.07)) / SR) * np.exp(-d * 45)
        i = int(at * SR)
        out[i : i + len(s)] += s[: n - i] * r.uniform(0.3, 1)
    t = np.arange(n) / SR
    return norm(out) * np.clip((dur - t) / dur, 0, 1)


def birds(dur, seed=2):
    r = np.random.default_rng(seed)
    n = int(dur * SR)
    out = np.zeros(n)
    at = 0.3
    while at < dur - 0.6:
        for k in range(r.integers(2, 5)):
            d = T(0.09)
            f = r.uniform(2600, 3600) * (1 + 0.35 * np.sin(np.pi * d / 0.09))
            s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * d / 0.09)
            i = int((at + k * 0.12) * SR)
            out[i : i + len(s)] += s[: n - i]
        at += r.uniform(1.0, 2.2)
    return norm(out)


def hum(dur=2.0, f=440.0):
    t = T(dur)
    s = np.sin(2 * np.pi * f * t) + 0.5 * np.sin(2 * np.pi * f * 2 * t) + 0.25 * np.sin(2 * np.pi * f * 3.01 * t)
    return norm(s) * np.clip(t / 0.3, 0, 1) * np.clip((dur - t) / 0.4, 0, 1) * (0.8 + 0.2 * np.sin(2 * np.pi * 5 * t))


def glass(f=1760):
    t = T(1.2)
    s = sum(np.sin(2 * np.pi * f * k * t) * np.exp(-t * (2 + 2 * k)) / k for k in (1, 2.76, 5.4))
    return norm(s)


def bloop():
    t = T(0.3)
    f = 220 * (1 + 2.0 * t / 0.3)
    return norm(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 10))


def ping(f=1320):
    t = T(0.35)
    return norm(np.sin(2 * np.pi * f * t) * np.exp(-t * 12) + 0.3 * np.sin(2 * np.pi * f * 2 * t) * np.exp(-t * 18))


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


def hiss(dur=3.0):
    t = T(dur)
    n = fftfilt(rs.standard_normal(len(t)), 2500, 9000)
    return norm(n) * np.clip(t / 0.15, 0, 1) * np.clip((dur - t) / 0.4, 0, 1)


# ------------------------------------------------------------------ layers
def music():
    buf = np.zeros((N, 2))
    beat = 60 / 104
    bar = beat * 4
    park = [(48, [60, 64, 67]), (53, [60, 65, 69]), (55, [59, 62, 67]), (48, [60, 64, 67])]
    lab = [(45, [64, 69, 72]), (41, [65, 69, 72]), (43, [62, 67, 71]), (45, [64, 69, 72])]
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

    loop(*PARK_A, park, marimba, 1.0)
    loop(*LAB, lab, musicbox, 0.9)
    loop(*FIELD, park, musicbox, 0.9, half=False)
    loop(*PARK_B, park, marimba, 1.1)
    place(buf, pad([midi(n) for n in (48, 60, 64, 67, 72)], 3.2) * 0.2, OUTRO)
    for k, m in enumerate([72, 76, 79, 84]):
        place(buf, pluck_bell(midi(m), 2.5) * 0.12, OUTRO + 0.05 + k * 0.12, pan=-0.3 + 0.2 * k)
    place(buf, bass(midi(36), 2.0) * 0.3, OUTRO)
    fade = int(1.2 * SR)
    buf[-fade:] *= np.linspace(1, 0, fade)[:, None]
    return buf


def story_sfx():
    buf = np.zeros((N, 2))
    place(buf, drips(3.0, 8, 1) * 0.12, 0.0)
    place(buf, birds(PARK_A[1] - 1.0, 2) * 0.06, 1.0)
    place(buf, birds(PARK_B[1] - PARK_B[0] - 0.5, 3) * 0.05, PARK_B[0])
    place(buf, boing() * 0.18, 5.65)  # little jump
    # light lab
    place(buf, hum(1.4, 330) * 0.12, 11.1)  # white beam
    place(buf, glass(1568) * 0.22, 14.2)  # prism lands
    for i, (at, m) in enumerate(zip((16.78, 17.62, 18.44, 19.24, 19.96, 20.68), (72, 74, 76, 79, 81, 84))):
        place(buf, pluck_bell(midi(m), 1.2) * 0.14, at, pan=-0.4 + 0.16 * i)
    place(buf, hum(1.6, 330) * 0.1, 21.7)
    place(buf, bloop() * 0.2, 23.4)  # into the drop
    place(buf, ping(1320) * 0.18, 24.8)  # bend
    place(buf, ping(1760) * 0.18, 25.8)  # bounce
    place(buf, ping(1320) * 0.18, 26.72)  # bend again
    place(buf, shimmer(2.4, 5) * 0.14, 28.6)  # colours separate
    # field
    place(buf, shimmer(2.0, 6, 1800, 3600) * 0.12, 34.6)
    place(buf, whoosh(1.2, 300, 6000, rev=True) * 0.18, 38.6)  # up to the airplane view
    place(buf, whoosh(1.0, 3000, 300) * 0.16, 41.3)
    # hose
    place(buf, hiss(3.4) * 0.12, 55.8)
    place(buf, shimmer(1.6, 8) * 0.14, 57.2)
    place(buf, boing() * 0.2, 65.6)  # jump for the rainbow
    return buf


def ui_sfx():
    buf = np.zeros((N, 2))
    for at in (2.18, 6.8, 21.55, 28.3, 38.0, 45.2, 48.6, 50.8, 59.4, 67.0):
        place(buf, whoosh(0.5) * 0.2, at - 0.25)
    place(buf, sparkle(1.3, 34, True, 2) * 0.32, 9.3)
    place(buf, whoosh(0.9, 300, 6000, rev=True) * 0.25, 10.1)
    place(buf, sparkle(0.6, 22, False, 3) * 0.3, 10.98)
    pops = (0.4, 2.18, 3.88, 5.64, 7.26, 11.8, 14.3, 14.92, 23.0, 24.8, 25.8, 26.72, 28.46, 34.6, 36.3, 41.4, 43.16,
            45.24, 47.26, 49.16, 50.82, 52.02, 53.7, 55.8, 61.4, 65.68, 67.1, 67.4, 67.7, OUTRO + 0.3, OUTRO + 0.5, OUTRO + 0.7)
    for at in pops:
        place(buf, pop() * 0.22, at, pan=float(rs.uniform(-0.3, 0.3)))
    place(buf, chime((79, 84, 88)) * 0.24, 31.6)  # WARNA BERPISAH!
    place(buf, chime((84, 88, 91)) * 0.26, 38.9)  # BULAT MACAM CINCIN!
    place(buf, chime((79, 84, 88, 91)) * 0.28, 57.98)  # PELANGI KECIL!
    place(buf, boing() * 0.22, 59.5)
    place(buf, chime((79, 84, 88, 91)) * 0.35, 59.55)
    place(buf, sparkle(1.0, 24, False, 8) * 0.28, 59.6)
    place(buf, nope() * 0.15, 65.7)  # TAK BOLEH PANJAT!
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
