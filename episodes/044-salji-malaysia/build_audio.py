#!/usr/bin/env python3
"""Soundtrack for Episode 044, synthesised from scratch (no samples, no
licensed music) and mixed under the narration.

Reuses the instruments and effects from Episode 005's build_audio.py and adds:
summer cicadas for the hot days, a soft wind and sleigh-bell sparkle for the
snow, icy crystal tinkles as droplets freeze, warm sunbeam swells on the
globe, a whistling mountain wind, a sad wilting slide, a shivering chatter,
a tyre skid, and frosty breaths.

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

DUR = 73.75
OUTRO = 70.6
OUT = os.path.join(HERE, "output")
N = int(SR * DUR)
rs = np.random.default_rng(44)

# scene boundaries (must match episode.js)
PARK_A = (0.0, 12.74)
CLOUD = (12.74, 22.38)
GLOBE = (22.38, 35.04)
MOUNT = (35.04, 45.28)
SNOW = (45.28, 59.06)
PARK_B = (59.06, OUTRO)


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


def cicadas(dur=3.0):
    t = T(dur)
    s = np.sin(2 * np.pi * 4200 * t) * (0.5 + 0.5 * np.sign(np.sin(2 * np.pi * 38 * t))) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.7 * t))
    return norm(fftfilt(s, 2500, 7000)) * np.clip(t / 0.3, 0, 1) * np.clip((dur - t) / 0.4, 0, 1)


def wind(dur=3.0, lo=200, hi=1200):
    t = T(dur)
    n = fftfilt(rs.standard_normal(len(t)), lo, hi) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.4 * t))
    return norm(n) * np.clip(t / 0.5, 0, 1) * np.clip((dur - t) / 0.6, 0, 1)


def bells(dur=2.0, seed=5):
    r = np.random.default_rng(seed)
    m = int(dur * SR)
    out = np.zeros(m)
    for at in np.arange(0, dur - 0.2, 0.12):
        d = T(0.18)
        s = np.sin(2 * np.pi * r.choice([2637, 3136, 3520]) * d) * np.exp(-d * 18)
        i = int(at * SR)
        out[i : i + len(s)] += s[: m - i] * r.uniform(0.4, 1)
    return norm(out) * np.sin(np.pi * np.arange(m) / m) ** 0.5


def slide_down(dur=1.2, f0=600, f1=180):
    t = T(dur)
    f = f0 + (f1 - f0) * t / dur
    return norm(np.sin(2 * np.pi * np.cumsum(f) / SR)) * np.clip(t / 0.05, 0, 1) * np.clip((dur - t) / 0.2, 0, 1)


def chatter(dur=1.2):
    out = np.zeros(int(dur * SR))
    for at in np.arange(0, dur - 0.05, 0.06):
        d = T(0.03)
        s = fftfilt(rs.standard_normal(len(d)), 1500, 5000) * np.exp(-d * 120)
        i = int(at * SR)
        out[i : i + len(s)] += s
    return norm(out)


def skid(dur=1.1):
    t = T(dur)
    f = 900 + 300 * np.sin(2 * np.pi * 9 * t)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.4 + fftfilt(rs.standard_normal(len(t)), 1500, 6000)
    return norm(s) * np.clip(t / 0.05, 0, 1) * np.clip((dur - t) / 0.3, 0, 1)


def swell(dur=1.6):
    t = T(dur)
    return norm(pad([midi(n) for n in (60, 64, 67, 72)], dur)[: len(t)] if False else np.sin(2 * np.pi * 220 * t) + 0.5 * np.sin(2 * np.pi * 330 * t)) * np.sin(np.pi * t / dur)


# ------------------------------------------------------------------ layers
def music():
    buf = np.zeros((N, 2))
    beat = 60 / 104
    bar = beat * 4
    home = [(48, [60, 64, 67]), (53, [60, 65, 69]), (55, [59, 62, 67]), (48, [60, 64, 67])]
    cold = [(45, [64, 69, 72]), (41, [65, 69, 72]), (43, [62, 67, 71]), (45, [64, 69, 72])]
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
    loop(*CLOUD, cold, musicbox, 0.9)
    loop(*GLOBE, home, musicbox, 0.9)
    loop(*MOUNT, cold, musicbox, 0.9, half=False)
    loop(*SNOW, cold, musicbox, 0.9)
    loop(*PARK_B, home, marimba, 1.05)
    place(buf, pad([midi(n) for n in (48, 60, 64, 67, 72)], 3.2) * 0.2, OUTRO)
    for k, m in enumerate([72, 76, 79, 84]):
        place(buf, pluck_bell(midi(m), 2.5) * 0.12, OUTRO + 0.05 + k * 0.12, pan=-0.3 + 0.2 * k)
    place(buf, bass(midi(36), 2.0) * 0.3, OUTRO)
    fade = int(1.2 * SR)
    buf[-fade:] *= np.linspace(1, 0, fade)[:, None]
    return buf


def story_sfx():
    buf = np.zeros((N, 2))
    place(buf, cicadas(5.6) * 0.07, 0.1)
    place(buf, wind(3.0, 300, 1500) * 0.12, 5.7)
    place(buf, bells(2.6, 5) * 0.12, 5.8)
    place(buf, cicadas(2.2) * 0.06, 9.2)
    place(buf, wind(9.0, 200, 1000) * 0.08, 12.9)
    for i, at in enumerate(np.arange(18.2, 20.2, 0.14)):
        place(buf, shimmer(0.4, i, 3000, 6000) * 0.08, float(at), pan=float(rs.uniform(-0.4, 0.4)))
    place(buf, shimmer(1.8, 21, 2400, 5200) * 0.16, 20.2)
    place(buf, swell(1.8) * 0.08, 26.5)
    place(buf, wind(9.0, 400, 2600) * 0.1, 36.0)
    place(buf, shimmer(1.4, 33, 3000, 6000) * 0.14, 40.8)
    place(buf, wind(13.0, 250, 1400) * 0.08, 45.3)
    place(buf, bells(1.6, 7) * 0.08, 45.4)
    place(buf, slide_down(1.3) * 0.12, 49.7)
    place(buf, chatter(2.4) * 0.12, 52.2)
    place(buf, skid(1.2) * 0.18, 55.4)
    place(buf, chatter(1.8) * 0.1, 56.7)
    for at in (57.0, 57.9, 58.7):
        place(buf, wind(0.6, 600, 3000) * 0.1, at)
    place(buf, cicadas(9.0) * 0.05, 59.1)
    return buf


def ui_sfx():
    buf = np.zeros((N, 2))
    for at in (2.22, 5.68, 8.64, 20.2, 26.3, 30.5, 36.3, 39.0, 42.0, 45.28, 48.02, 51.96, 55.08, 56.54, 59.06, 62.1, 68.3):
        place(buf, whoosh(0.5) * 0.2, at - 0.25)
    place(buf, sparkle(1.3, 34, True, 2) * 0.32, 10.9)
    place(buf, whoosh(0.9, 300, 6000, rev=True) * 0.25, 11.6)
    place(buf, sparkle(0.6, 22, False, 3) * 0.3, 12.74)
    pops = (0.4, 0.6, 2.22, 3.28, 7.3, 9.84, 12.74, 14.0, 18.22, 21.3, 21.42, 21.54, 21.66, 21.78, 21.9, 23.96, 25.1,
            27.0, 27.6, 28.28, 30.62, 31.96, 35.04, 36.3, 38.84, 40.94, 48.02, 49.06, 52.0, 53.26, 56.6, 68.35, 68.65, 68.95,
            OUTRO + 0.3, OUTRO + 0.5, OUTRO + 0.7)
    for at in pops:
        place(buf, pop() * 0.22, at, pan=float(rs.uniform(-0.3, 0.3)))
    place(buf, chime((84, 88, 91)) * 0.24, 5.68)  # SERONOKNYA!
    place(buf, nope() * 0.12, 9.84)  # BOLEH KE?
    place(buf, chime((79, 84, 88)) * 0.24, 16.08)  # BAWAH 0°C!
    place(buf, chime((79, 84, 88, 91)) * 0.28, 21.22)  # BERBUCU ENAM!
    place(buf, chime((79, 84, 88)) * 0.22, 36.02)  # MAKIN TINGGI
    place(buf, nope() * 0.14, 51.02)  # LAYU!
    place(buf, boing() * 0.22, 59.1)
    place(buf, chime((79, 84, 88, 91)) * 0.35, 59.15)
    place(buf, sparkle(1.0, 24, False, 8) * 0.28, 59.2)
    place(buf, chime((84, 88, 91)) * 0.26, 66.0)  # BERSYUKUR!
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
