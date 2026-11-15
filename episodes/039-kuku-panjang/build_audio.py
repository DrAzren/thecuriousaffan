#!/usr/bin/env python3
"""Soundtrack for Episode 039, synthesised from scratch (no samples, no
licensed music) and mixed under the narration.

Reuses the instruments and effects from Episode 005's build_audio.py and adds:
soft cell "bloops" at the nail root, a stacking click for each flat tile, a
growing stretch, a nerve shimmer, nail-clipper snips, giggling germs, a tummy
rumble, a nail crack and snap, and a scratch.

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

DUR = 79.55
OUTRO = 76.4
OUT = os.path.join(HERE, "output")
N = int(SR * DUR)
rs = np.random.default_rng(39)

# scene boundaries (must match episode.js)
ROOM_A = (0.0, 11.46)
TIP = (11.46, 39.58)
HAND = (39.58, 55.98)
ROOM_B = (55.98, OUTRO)


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
def bloop(f=420):
    t = T(0.18)
    return norm(np.sin(2 * np.pi * np.cumsum(f * (1 + 1.5 * t / 0.18)) / SR) * np.exp(-t * 18))


def click(f=2400):
    t = T(0.05)
    return norm(np.sin(2 * np.pi * f * t) * np.exp(-t * 120) + 0.3 * fftfilt(rs.standard_normal(len(t)), 2000, 8000) * np.exp(-t * 150))


def stretch(dur=1.2, f0=300, f1=600):
    t = T(dur)
    f = f0 + (f1 - f0) * (t / dur) ** 1.5
    s = np.sin(2 * np.pi * np.cumsum(f * (1 + 0.03 * np.sin(2 * np.pi * 9 * t))) / SR)
    return s * np.clip(t / 0.05, 0, 1) * np.clip((dur - t) / 0.25, 0, 1)


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


def snip():
    t = T(0.12)
    s = np.sin(2 * np.pi * 3200 * t) * np.exp(-t * 60) + fftfilt(rs.standard_normal(len(t)), 3000, 9000) * np.exp(-t * 90)
    return norm(s)


def giggle(seed=0):
    r = np.random.default_rng(seed)
    n = int(0.8 * SR)
    out = np.zeros(n)
    for k in range(5):
        d = T(0.08)
        f = r.uniform(900, 1300) * (1 + 0.4 * np.sin(np.pi * d / 0.08))
        s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * d / 0.08)
        i = int(k * 0.13 * SR)
        out[i : i + len(s)] += s[: n - i]
    return norm(out)


def rumble(dur=1.4):
    t = T(dur)
    f = 70 + 25 * np.sin(2 * np.pi * 3 * t)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * (0.6 + 0.4 * np.sin(2 * np.pi * 7 * t))
    return norm(s) * np.sin(np.pi * t / dur)


def crack():
    t = T(0.25)
    n = fftfilt(rs.standard_normal(len(t)), 1500, 7000)
    return norm(n * np.exp(-t * 30) + np.sin(2 * np.pi * 1800 * t) * np.exp(-t * 40))


def scratch(dur=0.5):
    t = T(dur)
    f = 2400 - 1200 * t / dur
    s = np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * 0.3 + fftfilt(rs.standard_normal(len(t)), 2000, 7000)
    return norm(s) * np.sin(np.pi * t / dur)


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
    loop(*TIP, inner, musicbox, 0.9)
    loop(*HAND, home, musicbox, 0.9, half=False)
    loop(*ROOM_B, home, marimba, 1.05)
    place(buf, pad([midi(n) for n in (48, 60, 64, 67, 72)], 3.2) * 0.2, OUTRO)
    for k, m in enumerate([72, 76, 79, 84]):
        place(buf, pluck_bell(midi(m), 2.5) * 0.12, OUTRO + 0.05 + k * 0.12, pan=-0.3 + 0.2 * k)
    place(buf, bass(midi(36), 2.0) * 0.3, OUTRO)
    fade = int(1.2 * SR)
    buf[-fade:] *= np.linspace(1, 0, fade)[:, None]
    return buf


def story_sfx():
    buf = np.zeros((N, 2))
    # nail root makes cells; tiles stack; the nail grows
    place(buf, shimmer(1.4, 4, 1500, 3000) * 0.12, 18.0)
    for i, at in enumerate(np.arange(21.8, 33.0, 0.55)):
        place(buf, bloop(380 + 40 * (i % 4)) * 0.1, float(at), pan=0.2)
    for i, at in enumerate(np.arange(24.8, 32.8, 0.42)):
        place(buf, click(2200 + 150 * (i % 3)) * 0.07, float(at), pan=0.3)
    place(buf, stretch(1.4, 280, 620) * 0.1, 32.3)
    # nerves, then the clipper snip
    place(buf, shimmer(1.6, 6, 2600, 4400) * 0.12, 34.3)
    place(buf, snip() * 0.3, 37.9)
    # germs, tummy, crack, scratch
    place(buf, giggle(1) * 0.12, 53.4)
    place(buf, giggle(2) * 0.1, 54.3)
    place(buf, giggle(3) * 0.1, 57.0)
    place(buf, rumble(1.6) * 0.2, 59.2)
    place(buf, crack() * 0.24, 61.7)
    place(buf, crack() * 0.2, 62.7)
    place(buf, scratch(0.5) * 0.14, 63.84)
    # Mama snips Affan's nails
    for at in np.arange(71.4 + np.pi / 12, 73.4, np.pi / 6):
        place(buf, snip() * 0.22, float(at), pan=-0.2)
    return buf


def ui_sfx():
    buf = np.zeros((N, 2))
    for at in (3.0, 7.08, 17.5, 27.2, 33.98, 39.58, 51.24, 55.98, 61.3, 65.4, 68.9, 74.14):
        place(buf, whoosh(0.5) * 0.2, at - 0.25)
    place(buf, sparkle(1.3, 34, True, 2) * 0.32, 9.7)
    place(buf, whoosh(0.9, 300, 6000, rev=True) * 0.25, 10.5)
    place(buf, sparkle(0.6, 22, False, 3) * 0.3, 11.46)
    pops = (0.4, 3.08, 3.62, 5.1, 11.86, 15.5, 18.04, 18.98, 22.24, 25.2, 27.98, 30.14, 34.3, 35.78, 41.0, 43.42,
            45.64, 47.4, 48.68, 49.64, 51.24, 52.66, 53.28, 57.22, 62.3, 63.84, 69.94, 72.28, 74.2, 74.5, 74.8,
            OUTRO + 0.3, OUTRO + 0.5, OUTRO + 0.7)
    for at in pops:
        place(buf, pop() * 0.22, at, pan=float(rs.uniform(-0.3, 0.3)))
    place(buf, chime((79, 84, 88)) * 0.26, 13.22)  # KERATIN
    place(buf, chime((84, 88, 91)) * 0.26, 32.3)  # MAKIN PANJANG!
    place(buf, chime((79, 84, 88, 91)) * 0.28, 38.2)  # TAK SAKIT!
    place(buf, nope() * 0.16, 59.6)  # SAKIT PERUT!
    place(buf, boing() * 0.22, 65.45)
    place(buf, chime((79, 84, 88, 91)) * 0.35, 65.5)
    place(buf, sparkle(1.0, 24, False, 8) * 0.28, 65.6)
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
