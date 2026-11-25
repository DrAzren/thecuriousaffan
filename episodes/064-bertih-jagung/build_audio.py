#!/usr/bin/env python3
"""Soundtrack for Episode 064, synthesised from scratch (no samples, no
licensed music) and mixed under the narration.

Reuses the instruments and effects from Episode 005's build_audio.py and adds:
a gas burner's soft roar, corn popping in the pot (sharp pops and a rattling
lid), a crackling fire under the giant kernel, hissing steam, a rising
pressure whine with a ticking gauge, a big boomy POP with a fluffy whoosh as
the starch puffs out, and steam leaking from the ordinary kernel.

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

DUR = 55.65
OUTRO = 52.5
OUT = os.path.join(HERE, "output")
N = int(SR * DUR)
rs = np.random.default_rng(64)

# scene boundaries (must match episode.js)
KITCHEN_A = (0.0, 12.12)
LAB = (12.12, 42.44)
KITCHEN_B = (42.44, OUTRO)
POPS = (5.96, 6.28, 6.6)
BURST = 30.4


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


def corn_pop(f=900):
    """A sharp little pop: a click of bright noise over a short low thump."""
    t = T(0.18)
    click = noise(0.18, 1500, 9000, decay=60)
    thump = np.sin(2 * np.pi * np.cumsum(f * np.exp(-t * 20) + 120) / SR) * np.exp(-t * 30)
    return norm(click * 0.8 + thump)


def rattle(dur=0.25):
    t = T(dur)
    x = np.zeros(len(t))
    for k in range(6):
        at = int(rs.uniform(0, dur - 0.03) * SR)
        tt = T(0.03)
        x[at:at + len(tt)] += np.sin(2 * np.pi * 3200 * tt) * np.exp(-tt * 140)
    return norm(x)


def hiss(dur, lo=2500, hi=9000):
    return noise(dur, lo, hi) * np.clip(T(dur) / 0.3, 0, 1)


def crackle(dur):
    x = noise(dur, 200, 2500) * 0.4
    for at in np.arange(0, dur - 0.05, 0.07):
        if rs.uniform() < 0.5:
            c = noise(0.04, 1500, 7000, decay=120)
            i = int((at + rs.uniform(0, 0.05)) * SR)
            x[i:i + len(c)] += c[: len(x) - i] * rs.uniform(0.3, 0.9)
    return norm(x)


def rise(dur, f0=300, f1=1400):
    t = T(dur)
    f = f0 * (f1 / f0) ** (t / dur)
    return norm(np.sin(2 * np.pi * np.cumsum(f) / SR) * (0.3 + 0.7 * t / dur) * np.clip((dur - t) / 0.05, 0, 1))


def boom(dur=1.4):
    t = T(dur)
    low = np.sin(2 * np.pi * np.cumsum(90 * np.exp(-t * 3) + 35) / SR) * np.exp(-t * 3.5)
    crack = noise(dur, 300, 8000, decay=9)
    return norm(low * 1.2 + crack * 0.7)


# ------------------------------------------------------------------ layers
def music():
    buf = np.zeros((N, 2))
    beat = 60 / 108
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
    loop(LAB[0], BURST - 0.1, inner, musicbox, 0.85)
    loop(BURST + 1.2, LAB[1], home, musicbox, 0.8)
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
    # the gas burner, softly, whenever we are in the kitchen
    for a, b in (KITCHEN_A, KITCHEN_B):
        place(buf, noise(b - a, 80, 700) * 0.035, a)
    # popping corn: the three big pops, a scatter of small ones after, the rattling lid
    for at in POPS:
        place(buf, corn_pop(float(rs.uniform(700, 1100))) * 0.3, at, pan=float(rs.uniform(-0.4, 0.4)))
        place(buf, rattle() * 0.08, at + 0.02, pan=-0.2)
    for at in np.arange(6.9, 12.0, 0.33):
        place(buf, corn_pop(float(rs.uniform(800, 1300))) * 0.08, float(at + rs.uniform(0, 0.2)), pan=float(rs.uniform(-0.6, 0.6)))
    for at in np.arange(42.6, 49.5, 0.6):
        place(buf, corn_pop(float(rs.uniform(800, 1300))) * 0.04, float(at + rs.uniform(0, 0.3)), pan=float(rs.uniform(-0.6, 0.6)))
    # the giant kernel: fire from 19.5, steam hiss from 21, rising pressure, ticking gauge, POP
    place(buf, crackle(BURST + 0.8 - 19.5) * 0.06, 19.5)
    place(buf, hiss(BURST - 21.0) * 0.035, 21.0)
    place(buf, rise(BURST - 27.2, 260, 1300) * 0.05, 27.2)
    for at in np.arange(27.3, BURST - 0.1, 0.25):
        place(buf, pluck_bell(midi(96), 0.08) * 0.03, float(at), pan=0.5)
    place(buf, boom() * 0.45, BURST)
    place(buf, whoosh(1.2, 200, 3000) * 0.2, BURST + 0.15)
    # the ordinary kernel leaking steam
    place(buf, hiss(6.6, 3000, 10000) * 0.03, 35.8)
    place(buf, crackle(6.6) * 0.025, 35.8)
    return buf


def ui_sfx():
    buf = np.zeros((N, 2))
    for at in (2.04, 5.12, 7.12, 8.44, 19.44, 27.16, 35.42, 42.44, 50.2):
        place(buf, whoosh(0.5) * 0.2, at - 0.25)
    place(buf, sparkle(1.3, 34, True, 2) * 0.32, 8.5)
    place(buf, whoosh(0.9, 300, 6000, rev=True) * 0.25, 11.2)
    place(buf, sparkle(0.6, 22, False, 3) * 0.3, 12.12)
    pops = (0.4, 2.06, 3.0, 3.72, 5.18, 8.5, 8.8, 9.1, 14.02, 15.28, 17.3, 19.5, 21.02, 22.5, 27.22, 31.24, 32.5,
            35.48, 36.0, 36.6, 39.36, 47.5, 50.25, 50.55, 50.85, OUTRO + 0.3, OUTRO + 0.5, OUTRO + 0.7)
    for at in pops:
        place(buf, pop() * 0.22, at, pan=float(rs.uniform(-0.3, 0.3)))
    place(buf, chime((79, 84, 88)) * 0.24, 7.18)  # JADI BERTIH
    place(buf, chime((79, 84, 88)) * 0.22, 24.44)  # TAK BAGI KELUAR
    place(buf, chime((84, 88, 91)) * 0.26, 33.44)  # BUIH PUTIH YANG GEBU
    place(buf, nope() * 0.2, 37.42)  # TAK BOLEH JADI BERTIH
    place(buf, boing() * 0.22, 42.46)
    place(buf, chime((79, 84, 88, 91)) * 0.35, 42.5)
    place(buf, sparkle(1.0, 24, False, 8) * 0.28, 42.55)
    place(buf, chime((79, 84, 88)) * 0.24, 43.46)  # WAP AIR
    place(buf, chime((84, 88, 91)) * 0.2, 46.36)  # MINTA TOLONG MAMA
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
