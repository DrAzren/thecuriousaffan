#!/usr/bin/env python3
"""Soundtrack for Episode 050, synthesised from scratch (no samples, no
licensed music) and mixed under the narration.

Reuses the instruments and effects from Episode 005's build_audio.py and adds:
a crunchy chocolate bite, farm birdsong, a pod cracking open,
a "yuck" bitter sting, leaf rustles, a roasting drum rumble with crackles,
a sheller rattle, grinding rollers, a liquid pour, a mixer whirr, a cold
hiss for cooling, and a toothbrush scrub.

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

DUR = 76.05
OUTRO = 72.9
OUT = os.path.join(HERE, "output")
N = int(SR * DUR)
rs = np.random.default_rng(50)

# scene boundaries (must match episode.js)
KITCHEN_A = (0.0, 10.54)
FARM = (10.54, 27.99)
FACTORY = (27.99, 56.41)
KITCHEN_B = (56.41, OUTRO)


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


def hum(dur, f=90):
    t = T(dur)
    x = np.sin(2 * np.pi * f * t) + 0.4 * np.sin(2 * np.pi * f * 2 * t) + 0.3 * fftfilt(rs.standard_normal(len(t)), 60, 400)
    return norm(x) * np.clip(t / 0.3, 0, 1) * np.clip((dur - t) / 0.3, 0, 1)


def scrub(dur, rate=11):
    t = T(dur)
    return norm(fftfilt(rs.standard_normal(len(t)), 2000, 8000)) * (0.5 + 0.5 * np.sin(2 * np.pi * rate * t)) ** 2


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

    loop(*KITCHEN_A, home, marimba, 1.0)
    loop(*FARM, home, marimba, 0.9)
    loop(*FACTORY, inner, musicbox, 0.85)
    loop(*KITCHEN_B, home, marimba, 1.0)
    place(buf, pad([midi(n) for n in (48, 60, 64, 67, 72)], 3.2) * 0.2, OUTRO)
    for k, m in enumerate([72, 76, 79, 84]):
        place(buf, pluck_bell(midi(m), 2.5) * 0.12, OUTRO + 0.05 + k * 0.12, pan=-0.3 + 0.2 * k)
    place(buf, bass(midi(36), 2.0) * 0.3, OUTRO)
    fade = int(1.2 * SR)
    buf[-fade:] *= np.linspace(1, 0, fade)[:, None]
    return buf


def story_sfx():
    buf = np.zeros((N, 2))
    place(buf, noise(0.25, 500, 6000, 18) * 0.25, 2.85)  # bite
    place(buf, noise(0.25, 500, 6000, 18) * 0.2, 60.6)
    for a, b in ((10.6, 27.9),):
        for at in np.arange(a + 0.3, b - 0.5, 1.6):
            for k in range(3):
                place(buf, chirp(2800 + 500 * k) * 0.03, float(at + k * 0.13 + rs.uniform(0, 0.4)), pan=float(rs.uniform(-0.6, 0.6)))
    place(buf, noise(0.4, 300, 3000, 10) * 0.25, 21.2)  # pod crack
    place(buf, nope() * 0.2, 27.3)
    place(buf, noise(0.6, 1500, 6000, 6) * 0.1, 28.9)  # leaves
    place(buf, noise(0.6, 1500, 6000, 6) * 0.1, 31.3)
    place(buf, hum(4.2, 70) * 0.08, 34.95)  # roaster
    for at in np.arange(35.2, 39.0, 0.23):
        place(buf, noise(0.03, 2000, 9000, 120) * 0.08, float(at + rs.uniform(0, 0.1)), pan=float(rs.uniform(-0.4, 0.4)))
    for at in np.arange(39.2, 41.3, 0.09):
        place(buf, noise(0.04, 1000, 6000, 80) * 0.06, float(at))
    place(buf, hum(3.0, 110) * 0.08, 41.3)  # grinder
    place(buf, noise(2.0, 200, 1200) * 0.08, 42.2)  # pour into tank
    for k in range(5):
        place(buf, pop() * 0.12, 45.9 + k * 0.1)
    place(buf, noise(1.0, 300, 1500) * 0.08, 46.3)  # milk
    place(buf, noise(0.3, 100, 800, 12) * 0.2, 47.55)  # butter plop
    place(buf, hum(2.8, 140) * 0.07, 48.1)  # mixer
    place(buf, noise(1.5, 200, 1200) * 0.07, 52.3)  # pour into moulds
    place(buf, noise(1.0, 3000, 9000) * 0.06, 54.2)  # cold hiss
    place(buf, scrub(1.4) * 0.1, 69.2)
    return buf


def ui_sfx():
    buf = np.zeros((N, 2))
    for at in (2.54, 4.6, 20.42, 24.7, 27.99, 32.36, 34.94, 39.18, 41.3, 44.3, 50.96, 56.41, 62.18, 67.22, 70.62):
        place(buf, whoosh(0.5) * 0.2, at - 0.25)
    place(buf, sparkle(1.3, 34, True, 2) * 0.32, 8.8)
    place(buf, whoosh(0.9, 300, 6000, rev=True) * 0.25, 9.7)
    place(buf, sparkle(0.6, 22, False, 3) * 0.3, 10.54)
    pops = (0.4, 4.66, 4.8, 5.2, 7.02, 7.1, 11.74, 14.58, 16.66, 18.86, 21.26, 22.88, 24.76, 28.88, 29.4, 33.04, 35.38,
            39.24, 41.44, 42.94, 45.42, 46.32, 47.08, 48.18, 52.36, 54.28, 56.46, 57.36, 58.62, 67.28, 70.65, 70.95, 71.25,
            OUTRO + 0.3, OUTRO + 0.5, OUTRO + 0.7)
    for at in pops:
        place(buf, pop() * 0.22, at, pan=float(rs.uniform(-0.3, 0.3)))
    for i in range(6):
        place(buf, pop() * 0.12, 63.5 + i * 0.22, pan=-0.4 + 0.16 * i)
    place(buf, chime((79, 84, 88)) * 0.26, 2.6)  # SEDAPNYA
    place(buf, chime((79, 84, 88)) * 0.24, 31.82)  # JADI PERANG
    place(buf, chime((84, 88, 91)) * 0.24, 37.36)  # WANGINYA
    place(buf, chime((79, 84, 88)) * 0.24, 50.1)  # LICIN
    place(buf, chime((79, 84, 88, 91, 96)) * 0.3, 55.36)  # KEPINGAN COKLAT
    place(buf, chime((79, 84, 88)) * 0.24, 60.48)  # CAIR DALAM MULUT
    place(buf, boing() * 0.22, 62.2)
    place(buf, chime((79, 84, 88, 91)) * 0.35, 62.25)
    place(buf, sparkle(1.0, 24, False, 8) * 0.28, 62.3)
    place(buf, chime((84, 88, 91)) * 0.24, 69.5)  # GOSOK GIGI
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
