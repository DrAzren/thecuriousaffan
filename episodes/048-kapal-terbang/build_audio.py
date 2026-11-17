#!/usr/bin/env python3
"""Soundtrack for Episode 048, synthesised from scratch (no samples, no
licensed music) and mixed under the narration.

Reuses the instruments and effects from Episode 005's build_audio.py and adds:
jet engine rumble and whine, wind in the sky, wind-tunnel airflow, an
elephant trumpet, the plane rolling faster down the runway and lifting off,
a soft blow over a paper strip, and a seatbelt click.

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

DUR = 75.15
OUTRO = 72.0
OUT = os.path.join(HERE, "output")
N = int(SR * DUR)
rs = np.random.default_rng(48)

# scene boundaries (must match episode.js)
AIRPORT = (0.0, 14.04)
SKY = (14.04, 42.8)
RUNWAY = (42.8, 54.14)
HOME = (54.14, OUTRO)


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
def jet(dur, f0=180, f1=180, gain_ramp=(1, 1)):
    """Engine: band noise rumble plus a whine that can sweep."""
    t = T(dur)
    k = t / dur
    rum = fftfilt(rs.standard_normal(len(t)), 40, 400)
    f = f0 + (f1 - f0) * k
    whine = np.sin(2 * np.pi * np.cumsum(f * 6) / SR) * 0.25
    g = gain_ramp[0] + (gain_ramp[1] - gain_ramp[0]) * k
    return norm(norm(rum) + whine) * g * np.clip(t / 0.5, 0, 1) * np.clip((dur - t) / 0.5, 0, 1)


def wind(dur, lo=200, hi=1500):
    t = T(dur)
    n = fftfilt(rs.standard_normal(len(t)), lo, hi) * (0.7 + 0.3 * np.sin(2 * np.pi * 0.3 * t))
    return norm(n) * np.clip(t / 0.6, 0, 1) * np.clip((dur - t) / 0.6, 0, 1)


def trumpet():
    t = T(0.9)
    f = 420 + 120 * np.sin(np.pi * t / 0.9)
    x = np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * 0.5 + np.sin(2 * np.pi * np.cumsum(f * 2) / SR) * 0.3
    return norm(fftfilt(x, 200, 3000)) * np.sin(np.pi * t / 0.9) ** 0.5


def blow(dur=2.8):
    t = T(dur)
    return norm(fftfilt(rs.standard_normal(len(t)), 500, 4000)) * np.clip(t / 0.15, 0, 1) * np.clip((dur - t) / 0.3, 0, 1)


def click():
    t = T(0.08)
    return norm(fftfilt(rs.standard_normal(len(t)), 1500, 9000) * np.exp(-t * 90) + 0.6 * np.sin(2 * np.pi * 2400 * t) * np.exp(-t * 70))


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

    loop(*AIRPORT, home, marimba, 1.0)
    loop(*SKY, inner, musicbox, 0.85)
    loop(*RUNWAY, home, marimba, 1.0)
    loop(*HOME, home, marimba, 0.95)
    place(buf, pad([midi(n) for n in (48, 60, 64, 67, 72)], 3.2) * 0.2, OUTRO)
    for k, m in enumerate([72, 76, 79, 84]):
        place(buf, pluck_bell(midi(m), 2.5) * 0.12, OUTRO + 0.05 + k * 0.12, pan=-0.3 + 0.2 * k)
    place(buf, bass(midi(36), 2.0) * 0.3, OUTRO)
    fade = int(1.2 * SR)
    buf[-fade:] *= np.linspace(1, 0, fade)[:, None]
    return buf


def story_sfx():
    buf = np.zeros((N, 2))
    place(buf, jet(14.0, 150, 160) * 0.07, 0.0)  # taxiing
    for k, at in enumerate((7.5, 8.0)):
        place(buf, trumpet() * 0.1, at, pan=0.3 - 0.6 * k)
    place(buf, wind(12.9) * 0.08, 14.04)
    place(buf, jet(12.0, 220, 240) * 0.05, 14.5)
    place(buf, wind(2.0, 300, 3000) * 0.12, 25.6)
    place(buf, wind(15.8, 300, 2500) * 0.07, 26.9)  # wind tunnel
    place(buf, jet(11.4, 160, 420, (0.6, 1.2)) * 0.12, 42.8)  # take-off roll
    place(buf, wind(2.0, 400, 4000) * 0.1, 52.0)
    place(buf, blow(3.0) * 0.14, 58.3)
    place(buf, jet(6.0, 200, 200) * 0.03, 65.94)  # cabin hum
    place(buf, click() * 0.35, 68.7)
    return buf


def ui_sfx():
    buf = np.zeros((N, 2))
    for at in (2.08, 4.86, 6.14, 9.3, 26.88, 42.8, 51.86, 61.76, 65.94, 69.86):
        place(buf, whoosh(0.5) * 0.2, at - 0.25)
    place(buf, sparkle(1.3, 34, True, 2) * 0.32, 12.0)
    place(buf, whoosh(0.9, 300, 6000, rev=True) * 0.25, 13.2)
    place(buf, sparkle(0.6, 22, False, 3) * 0.3, 14.04)
    pops = (0.4, 2.14, 3.22, 4.92, 8.44, 10.3, 10.6, 10.9, 14.1, 17.34, 19.28, 22.5, 24.0, 27.0, 30.56, 31.22, 32.6, 34.48,
            36.56, 39.26, 42.84, 46.4, 54.14, 58.3, 63.18, 63.88, 66.0, 68.12, 69.9, 70.2, 70.5, OUTRO + 0.3, OUTRO + 0.5, OUTRO + 0.7)
    for at in pops:
        place(buf, pop() * 0.22, at, pan=float(rs.uniform(-0.3, 0.3)))
    for i, at in enumerate(np.linspace(7.44, 8.44, 10)):
        place(buf, pop() * 0.1, float(at), pan=-0.4 + 0.08 * i)
    place(buf, chime((79, 84, 88)) * 0.24, 38.66)  # SAYAP KE ATAS
    place(buf, chime((79, 84, 88, 91)) * 0.3, 41.56)  # DAYA ANGKAT
    place(buf, chime((84, 88, 91)) * 0.26, 50.1)  # LEBIH KUAT
    place(buf, chime((79, 84, 88, 91, 96)) * 0.3, 53.04)  # TERBANG
    place(buf, chime((79, 84, 88)) * 0.24, 60.6)  # KERTAS NAIK
    place(buf, boing() * 0.22, 61.8)
    place(buf, chime((79, 84, 88, 91)) * 0.35, 61.85)
    place(buf, sparkle(1.0, 24, False, 8) * 0.28, 61.9)
    place(buf, chime((84, 88, 91)) * 0.26, 64.24)  # BEKERJASAMA
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
