#!/usr/bin/env python3
"""Soundtrack for Episode 063, synthesised from scratch (no samples, no
licensed music) and mixed under the narration.

Reuses the instruments and effects from Episode 005's build_audio.py and adds:
night crickets in the park, twinkly glassy pings for the stars, a deep space
drone, a shooting "zing" as starlight travels to the Earth, a soft rushing
wind for the moving air, wobbly glissando sparkles as the light bends, and a
calm shimmering pad for the astronaut floating in space.

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

DUR = 57.15
OUTRO = 54.0
OUT = os.path.join(HERE, "output")
N = int(SR * DUR)
rs = np.random.default_rng(63)

# scene boundaries (must match episode.js)
PARK_A = (0.0, 10.48)
SKY = (10.48, 44.72)
PARK_B = (44.72, OUTRO)


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


def cricket(dur=0.3):
    t = T(dur)
    return norm(np.sin(2 * np.pi * 4300 * t) * (np.sin(2 * np.pi * 30 * t) > 0) * np.sin(np.pi * t / dur))


def ping(f=2600):
    t = T(0.6)
    return norm((np.sin(2 * np.pi * f * t) + 0.4 * np.sin(2 * np.pi * f * 2.01 * t)) * np.exp(-t * 7))


def drone(dur, f=55):
    t = T(dur)
    x = np.sin(2 * np.pi * f * t) + 0.5 * np.sin(2 * np.pi * f * 1.5 * t) + 0.3 * np.sin(2 * np.pi * f * 2 * t)
    return norm(x * (0.8 + 0.2 * np.sin(2 * np.pi * 0.3 * t))) * np.clip(t / 0.8, 0, 1) * np.clip((dur - t) / 0.8, 0, 1)


def zing(dur=1.2):
    t = T(dur)
    return norm(np.sin(2 * np.pi * np.cumsum(3000 - 2200 * t / dur) / SR) * np.exp(-t * 2.5))


def wobble(dur=0.9, f=1400):
    t = T(dur)
    return norm(np.sin(2 * np.pi * np.cumsum(f * (1 + 0.25 * np.sin(2 * np.pi * 7 * t))) / SR) * np.sin(np.pi * t / dur))


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
    loop(*SKY, inner, musicbox, 0.85)
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
    for a, b in ((0.0, 10.4), (44.7, OUTRO)):
        for at in np.arange(a + 0.3, b - 0.4, 1.0):
            place(buf, cricket() * 0.02, float(at + rs.uniform(0, 0.4)), pan=float(rs.uniform(-0.7, 0.7)))
    for at in np.arange(2.3, 6.8, 0.45):
        place(buf, ping(float(rs.uniform(2200, 3400))) * 0.04, float(at), pan=float(rs.uniform(-0.5, 0.5)))
    place(buf, drone(8.8) * 0.06, 10.5)
    place(buf, zing(2.6) * 0.1, 15.3)
    place(buf, noise(8.6, 150, 1200) * 0.045, 19.5)
    for at in np.arange(29.6, 33.3, 0.42):
        place(buf, wobble(0.6, float(rs.uniform(1100, 1800))) * 0.05, float(at), pan=float(rs.uniform(-0.4, 0.4)))
    for at in np.arange(33.6, 40.2, 0.6):
        place(buf, ping(float(rs.uniform(2400, 3200))) * 0.025, float(at), pan=0.5)
    place(buf, pad([midi(n) for n in (60, 67, 72, 76)], 4.4) * 0.08, 40.35)
    return buf


def ui_sfx():
    buf = np.zeros((N, 2))
    for at in (2.12, 6.86, 19.46, 28.2, 33.36, 40.32, 44.72, 51.76):
        place(buf, whoosh(0.5) * 0.2, at - 0.25)
    place(buf, sparkle(1.3, 34, True, 2) * 0.32, 8.5)
    place(buf, whoosh(0.9, 300, 6000, rev=True) * 0.25, 9.45)
    place(buf, sparkle(0.6, 22, False, 3) * 0.3, 10.48)
    pops = (0.4, 2.16, 3.66, 5.36, 6.9, 7.2, 7.5, 13.18, 15.22, 20.76, 23.04, 24.98, 26.08, 29.6, 33.36, 34.44,
            35.02, 35.4, 35.42, 40.32, 51.8, 52.1, 52.4, OUTRO + 0.3, OUTRO + 0.5, OUTRO + 0.7)
    for at in pops:
        place(buf, pop() * 0.22, at, pan=float(rs.uniform(-0.3, 0.3)))
    place(buf, chime((79, 84, 88)) * 0.24, 11.7)  # TAK BERKELIP
    place(buf, chime((84, 88, 91)) * 0.24, 17.14)  # TITIK
    place(buf, chime((79, 84, 88)) * 0.22, 26.9)  # BERALUN
    place(buf, chime((79, 84, 88, 91)) * 0.26, 31.6)  # BERKELIP-KELIP
    place(buf, chime((79, 84, 88)) * 0.22, 38.2)
    place(buf, chime((84, 88, 91)) * 0.24, 42.96)  # LANGSUNG TAK BERKELIP
    place(buf, boing() * 0.22, 44.74)
    place(buf, chime((79, 84, 88, 91)) * 0.35, 44.78)
    place(buf, sparkle(1.0, 24, False, 8) * 0.28, 44.82)
    place(buf, chime((79, 84, 88)) * 0.24, 46.16)  # MENARI
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
