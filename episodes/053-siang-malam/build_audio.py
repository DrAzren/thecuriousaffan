#!/usr/bin/env python3
"""Soundtrack for Episode 053, synthesised from scratch (no samples, no
licensed music) and mixed under the narration.

Reuses the instruments and effects from Episode 005's build_audio.py and adds:
evening birds fading into night crickets, a bouncing ball,
a deep space hum, a spinning-top whirr, a ticking clock, a sunrise swell and
a sunset fall, a rushing whoosh for the Earth's speed, and a sleepy lullaby
twinkle in the bedroom.

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

DUR = 63.6
OUTRO = 60.45
OUT = os.path.join(HERE, "output")
N = int(SR * DUR)
rs = np.random.default_rng(53)

# scene boundaries (must match episode.js)
PARK = (0.0, 11.2)
SPACE = (11.2, 49.98)
BEDROOM = (49.98, OUTRO)


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
def chirp(f=3200):
    t = T(0.12)
    return norm(np.sin(2 * np.pi * np.cumsum(f * (1 + 0.4 * np.sin(2 * np.pi * 18 * t))) / SR) * np.sin(np.pi * t / 0.12))


def noise(dur, lo, hi, decay=0.0):
    t = T(dur)
    x = fftfilt(rs.standard_normal(len(t)), lo, hi)
    if decay:
        x = x * np.exp(-t * decay)
    return norm(x) * np.clip(t / 0.02, 0, 1) * np.clip((dur - t) / 0.05, 0, 1)


def cricket(dur):
    t = T(dur)
    env = (np.sin(2 * np.pi * 14 * t) > 0.3) * (np.sin(2 * np.pi * 0.7 * t) > -0.2)
    return norm(np.sin(2 * np.pi * 4300 * t) * onepole(env.astype(float), 600))


def hum(dur, f=55):
    t = T(dur)
    x = np.sin(2 * np.pi * f * t) + 0.5 * np.sin(2 * np.pi * f * 1.5 * t) + 0.3 * fftfilt(rs.standard_normal(len(t)), 40, 300)
    return norm(x) * np.clip(t / 0.8, 0, 1) * np.clip((dur - t) / 0.8, 0, 1)


def whirr(dur, f=180):
    t = T(dur)
    return norm(np.sin(2 * np.pi * f * t) * (0.6 + 0.4 * np.sin(2 * np.pi * 25 * t)) + 0.3 * fftfilt(rs.standard_normal(len(t)), 500, 3000)) * np.clip(t / 0.2, 0, 1) * np.clip((dur - t) / 0.4, 0, 1)


def tick():
    t = T(0.04)
    return norm(np.sin(2 * np.pi * 2500 * t) * np.exp(-t * 120))


def bounce():
    t = T(0.15)
    return norm(np.sin(2 * np.pi * np.cumsum(140 * (1 - 0.4 * t / 0.15)) / SR) * np.exp(-t * 30))


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

    loop(*PARK, home, marimba, 1.0)
    loop(*SPACE, inner, musicbox, 0.85)
    loop(*BEDROOM, home, musicbox, 0.8)
    place(buf, pad([midi(n) for n in (48, 60, 64, 67, 72)], 3.2) * 0.2, OUTRO)
    for k, m in enumerate([72, 76, 79, 84]):
        place(buf, pluck_bell(midi(m), 2.5) * 0.12, OUTRO + 0.05 + k * 0.12, pan=-0.3 + 0.2 * k)
    place(buf, bass(midi(36), 2.0) * 0.3, OUTRO)
    fade = int(1.2 * SR)
    buf[-fade:] *= np.linspace(1, 0, fade)[:, None]
    return buf


def story_sfx():
    buf = np.zeros((N, 2))
    for at in np.arange(0.4, 3.5, 1.5):
        for k in range(3):
            place(buf, chirp(2800 + 600 * k) * 0.03, float(at + k * 0.13), pan=float(rs.uniform(-0.6, 0.6)))
    for at in (0.6, 1.4, 2.1):
        place(buf, bounce() * 0.1, at)
    place(buf, cricket(6.8) * 0.025, 4.4)
    place(buf, hum(38.8) * 0.06, 11.2)
    place(buf, whirr(3.7) * 0.06, 16.1)
    for at in np.arange(17.4, 19.8, 0.25):
        place(buf, tick() * 0.06, float(at))
    place(buf, pad([midi(n) for n in (60, 64, 67, 72)], 1.8) * 0.12, 36.1)
    place(buf, pad([midi(n) for n in (57, 60, 64)], 1.6) * 0.1, 37.5)
    place(buf, whoosh(3.0, 200, 3000) * 0.12, 42.0)
    place(buf, noise(4.0, 300, 1500) * 0.04, 45.5)
    place(buf, cricket(10.0) * 0.02, 50.0)
    return buf


def ui_sfx():
    buf = np.zeros((N, 2))
    for at in (2.28, 6.96, 14.0, 19.88, 26.14, 29.0, 32.76, 38.9, 57.59):
        place(buf, whoosh(0.5) * 0.2, at - 0.25)
    place(buf, sparkle(1.3, 34, True, 2) * 0.32, 9.2)
    place(buf, whoosh(0.9, 300, 6000, rev=True) * 0.25, 10.2)
    place(buf, sparkle(0.6, 22, False, 3) * 0.3, 11.2)
    pops = (0.4, 2.34, 3.48, 4.8, 7.05, 7.35, 7.7, 11.26, 15.06, 16.14, 17.4, 21.86, 24.94, 26.48, 30.28, 32.82, 38.96,
            42.06, 45.52, 54.04, 57.62, 57.9, 58.2, OUTRO + 0.3, OUTRO + 0.5, OUTRO + 0.7)
    for at in pops:
        place(buf, pop() * 0.22, at, pan=float(rs.uniform(-0.3, 0.3)))
    place(buf, chime((79, 84, 88)) * 0.24, 5.62)  # MATAHARI PERGI MANA
    place(buf, chime((79, 84, 88, 91)) * 0.26, 36.2)  # TERBIT
    place(buf, chime((84, 79, 76)) * 0.22, 37.58)  # TERBENAM
    place(buf, chime((79, 84, 88)) * 0.24, 47.5)  # BERPUTAR SEKALI
    place(buf, boing() * 0.22, 50.0)
    place(buf, chime((79, 84, 88, 91)) * 0.35, 50.05)
    place(buf, sparkle(1.0, 24, False, 8) * 0.28, 50.1)
    for k, m in enumerate((84, 88, 91, 96)):
        place(buf, pluck_bell(midi(m), 1.2) * 0.06, 55.4 + k * 0.4)
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
