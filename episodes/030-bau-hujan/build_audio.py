#!/usr/bin/env python3
"""Soundtrack for Episode 030, synthesised from scratch (no samples, no
licensed music) and mixed under the narration.

Reuses the instruments and effects from Episode 005's build_audio.py and the
rain-on-the-car layer from Episode 028, and adds: sniffs, happy bacteria
"boops", a falling raindrop and its splash, rising "blub" bubbles that pop on
the narrator's "pop, pop, pop", a puff of sparkles and a breeze.

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
from_base = ("SR", "T", "place", "env_adsr", "onepole", "midi", "marimba", "musicbox", "pad", "bass", "shaker", "pluck_bell", "whoosh", "pop", "sparkle", "chime", "nope", "boing", "write_wav")
globals().update({k: getattr(B, k) for k in from_base})

DUR = 65.8
OUTRO = 62.6
OUT = os.path.join(HERE, "output")
N = int(SR * DUR)
rs = np.random.default_rng(30)



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


# --------------------------------------------------------------- lab sfx
def sniff(dur=0.55, seed=1):
    """A happy inhale through the nose: rising band of breathy noise."""
    r = np.random.default_rng(seed)
    n = int(dur * SR)
    t = np.arange(n) / SR
    x = fftfilt(r.standard_normal(n), 900, 4200)
    e = np.sin(np.pi * t / dur) ** 1.5 * (0.6 + 0.4 * t / dur)
    return norm(x * e)


def boop(f0=520, dur=0.16):
    t = T(dur)
    f = f0 * (1 + 0.5 * t / dur)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 14)


def blub(f0=300, dur=0.22):
    """Underwater bubble: quick rising sine with a wobble."""
    t = T(dur)
    f = f0 * (1 + 2.2 * t / dur) * (1 + 0.04 * np.sin(2 * np.pi * 40 * t))
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * t / dur)


def drop_fall(dur=1.6):
    """Cartoon falling whistle for the giant raindrop."""
    t = T(dur)
    f = 1500 * (500 / 1500) ** (t / dur)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.clip(t / 0.2, 0, 1) * np.clip((dur - t) / 0.05, 0, 1) * 0.6


def splat(seed=4):
    r = np.random.default_rng(seed)
    n = int(0.5 * SR)
    t = np.arange(n) / SR
    body = fftfilt(r.standard_normal(n), 300, 3500) * np.exp(-t * 12)
    thump = np.sin(2 * np.pi * 120 * t * (1 - 0.4 * t)) * np.exp(-t * 18)
    return norm(norm(body) * 0.7 + thump * 0.8)


def breeze(dur=3.0, seed=6):
    r = np.random.default_rng(seed)
    n = int(dur * SR)
    t = np.arange(n) / SR
    x = fftfilt(r.standard_normal(n), 250, 1600)
    e = np.sin(np.pi * t / dur) ** 1.2 * (0.8 + 0.2 * np.sin(2 * np.pi * 0.9 * t))
    return norm(x * e)


def rain_layer():
    """Rain on the car: hiss + scattered drops, only in the in-car sections."""
    buf = np.zeros((N, 2))
    t = np.arange(N) / SR
    for ch, seed in ((0, 11), (1, 12)):
        r = np.random.default_rng(seed)
        hiss = norm(fftfilt(r.standard_normal(N), 1800, 9000)) * 0.35
        hiss *= 0.85 + 0.15 * np.sin(2 * np.pi * 0.13 * t + ch)
        drops = np.zeros(N)
        for at in r.uniform(0, DUR, 2600):
            f = r.uniform(2500, 5500)
            d = T(0.025)
            s = np.sin(2 * np.pi * f * d) * np.exp(-d * 260) * r.uniform(0.2, 1)
            i = int(at * SR)
            drops[i : i + len(s)] += s[: N - i]
        buf[:, ch] = hiss + drops * 0.35
    hum = 0.5 * np.sin(2 * np.pi * 47 * t + 0.3 * np.sin(2 * np.pi * 0.4 * t)) + 0.25 * np.sin(2 * np.pi * 94 * t)
    rumble = norm(fftfilt(rs.standard_normal(N), 20, 160))
    car = rumble * 0.5 + hum * 0.2
    buf += np.stack([car, np.roll(car, 37)], 1) * 0.6
    lvl = np.zeros(N)
    for a, b, g in [(0, 6.6, 0.5), (6.6, 14.1, 1.0), (14.1, 16.2, 0.5), (56.5, OUTRO, 0.45)]:
        lvl[int(a * SR) : int(b * SR)] = g
    lvl = onepole(lvl, 3)
    return buf * lvl[:, None]


# ------------------------------------------------------------------ layers
def music():
    buf = np.zeros((N, 2))
    beat = 60 / 102
    bar = beat * 4
    rainy = [(50, [62, 65, 69]), (46, [62, 65, 70]), (53, [60, 65, 69]), (48, [60, 64, 67])]
    happy = [(53, [65, 69, 72]), (48, [64, 67, 72]), (50, [65, 69, 74]), (46, [65, 70, 74])]
    arp = [0, 1, 2, 1, 0, 2, 1, 2]
    t0, i = 0.0, 0
    while t0 < 16.2:
        root, ch = rainy[i % 4]
        place(buf, pad([midi(n) for n in ch], bar + 0.6) * 0.15, t0)
        for k, step in enumerate([0, 2, 1, 2]):
            place(buf, musicbox(midi(ch[step] + 12)) * 0.11, t0 + k * beat, pan=0.3 * ((k % 2) * 2 - 1))
        t0 += bar
        i += 1
    t0, i = 16.2, 0
    while t0 < 56.5:
        root, ch = happy[i % 4]
        place(buf, pad([midi(n) for n in ch], bar + 0.6) * 0.1, t0)
        for k in range(8):
            place(buf, marimba(midi(ch[arp[k]] + 12)) * 0.18, t0 + k * beat / 2, pan=-0.35 + 0.1 * k)
        for k in (0, 2):
            place(buf, bass(midi(root - 12) if k == 0 else midi(root - 5), 0.6) * 0.3, t0 + k * beat)
        for k in range(8):
            place(buf, shaker() * (0.5 if k % 2 else 0.3), t0 + k * beat / 2, pan=0.4)
        t0 += bar
        i += 1
    t0, i = 56.5, 0
    while t0 < OUTRO:
        root, ch = happy[i % 4]
        place(buf, pad([midi(n) for n in ch], bar + 0.6) * 0.13, t0)
        for k in range(4):
            place(buf, marimba(midi(ch[[0, 2, 1, 2][k]] + 12)) * 0.15, t0 + k * beat, pan=0.25 * ((k % 2) * 2 - 1))
        place(buf, bass(midi(root - 12), 0.9) * 0.25, t0)
        t0 += bar
        i += 1
    place(buf, pad([midi(n) for n in (53, 65, 69, 72, 77)], 3.2) * 0.2, OUTRO)
    for k, m in enumerate([77, 81, 84, 89]):
        place(buf, pluck_bell(midi(m), 2.5) * 0.12, OUTRO + 0.05 + k * 0.12, pan=-0.3 + 0.2 * k)
    place(buf, bass(midi(41), 2.0) * 0.3, OUTRO)
    fade = int(1.2 * SR)
    buf[-fade:] *= np.linspace(1, 0, fade)[:, None]
    return buf


def lab_sfx():
    buf = np.zeros((N, 2))
    for at, sd in ((3.3, 1), (5.55, 2), (44.2, 3), (46.1, 4), (49.4, 5), (59.1, 6)):
        place(buf, sniff(0.6, sd) * 0.3, at)
    r = np.random.default_rng(3)
    for i in range(7):  # bacteria say hello
        place(buf, boop(float(r.uniform(480, 820))) * 0.25, 20.4 + i * 0.12, pan=float(r.uniform(-0.5, 0.5)))
    for i in range(5):  # geosmin ribbons rise
        place(buf, sparkle(0.6, 8, True, 40 + i) * 0.1, 22.7 + i * 0.25, pan=float(r.uniform(-0.4, 0.4)))
    place(buf, drop_fall(1.6) * 0.25, 26.5)
    place(buf, splat() * 0.5, 28.1)
    place(buf, sparkle(0.4, 10, False, 9) * 0.15, 28.15)
    for i, at in enumerate((33.0, 33.3, 33.6, 34.0, 34.3, 34.7, 35.0, 35.4, 35.8)):  # bubbles rising
        place(buf, blub(260 + 30 * i) * 0.22, at, pan=float(r.uniform(-0.3, 0.3)))
    pops = (36.2, 36.55, 37.0, 37.38, 37.74, 38.0, 38.25, 38.55, 38.8)
    for i, at in enumerate(pops):
        loud = 0.45 if at in (37.0, 37.38, 37.74) else 0.22
        place(buf, pop(1400 - 60 * i, 500, 0.1) * loud, at, pan=float(r.uniform(-0.3, 0.3)))
    place(buf, sparkle(1.2, 30, True, 11) * 0.25, 38.4)
    place(buf, breeze(3.2) * 0.35, 42.2, pan=-0.3)
    place(buf, chime((86, 91)) * 0.25, 44.8)  # nose
    return buf


def ui_sfx():
    buf = np.zeros((N, 2))
    for at in (6.6, 21.6, 26.2, 31.7, 38.3, 46.0, 52.0):
        place(buf, whoosh(0.5) * 0.28, at - 0.25)
    place(buf, sparkle(1.3, 34, True, 2) * 0.32, 14.65)
    place(buf, whoosh(0.9, 300, 6000, rev=True) * 0.25, 15.3)
    place(buf, sparkle(0.6, 22, False, 3) * 0.3, 16.15)
    place(buf, whoosh(0.6, 2500, 300) * 0.35, 56.25)  # back to the car
    pops = (0.6, 0.9, 8.82, 12.7, 16.72, 18.82, 23.38, 26.64, 29.58, 30.3, 32.96, 40.14, 46.6, 47.5, 58.74, 60.5, 60.8, 61.1, 62.9, 63.1, 63.3)
    for at in pops:
        place(buf, pop() * 0.28, at, pan=float(rs.uniform(-0.3, 0.3)))
    place(buf, nope() * 0.25, 13.38)  # AIR ADA BAU?
    place(buf, chime((84, 88, 91)) * 0.3, 24.88)  # GEOSMIN
    place(buf, chime((84, 88, 91, 96), 0.07) * 0.3, 49.3)  # SIKIT JE PUN
    place(buf, boing() * 0.22, 52.1)
    place(buf, chime((79, 84, 88, 91)) * 0.35, 52.2)
    place(buf, chime((84, 88, 91, 96), 0.07) * 0.42, 54.92)
    place(buf, sparkle(0.8, 16, False, 6) * 0.25, 55.0)
    place(buf, chime((86, 91)) * 0.28, 57.6)
    place(buf, sparkle(0.6, 14, False, 7) * 0.22, 57.65)
    place(buf, sparkle(1.0, 24, False, 8) * 0.3, OUTRO)
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
    rain = rain_layer() * duck_gain(voice, 0.4)[:, None]
    labfx = lab_sfx()
    ui = ui_sfx()
    for name, b in (("music", m), ("rain", rain), ("lab", labfx), ("sfx", ui)):
        write_wav(os.path.join(OUT, "stems", name + ".wav"), b)
    v = np.stack([voice, voice], 1)
    mix = v * 1.0 + m * 0.55 + rain * 0.1 + labfx * 0.6 + ui * 0.55
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
