#!/usr/bin/env python3
"""Soundtrack for Episode 038, synthesised from scratch (no samples, no
licensed music) and mixed under the narration.

Reuses the instruments and effects from Episode 005's build_audio.py and adds:
knife chops on a board, a sniffle, cell "pops" and a giant-knife swish, bubbly
mixing, a gas fizz, a stinging "zing", tear drips and a washing swoosh, a
fridge door and its cool hum, a knife glint, and little heart pops.

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

DUR = 72.5
OUTRO = 69.35
OUT = os.path.join(HERE, "output")
N = int(SR * DUR)
rs = np.random.default_rng(38)

# scene boundaries (must match episode.js)
KIT_A = (0.0, 16.26)
CELLS = (16.26, 32.94)
EYE = (32.94, 48.58)
KIT_B = (48.58, OUTRO)


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
def chop(seed=0):
    r = np.random.default_rng(seed)
    t = T(0.1)
    thud = np.sin(2 * np.pi * 180 * t) * np.exp(-t * 50)
    crisp = fftfilt(r.standard_normal(len(t)), 1500, 6000) * np.exp(-t * 70)
    return norm(thud + 0.6 * norm(crisp))


def chops(buf, a, b, rate=6.5 / np.pi, gain=0.18):
    # one chop at every downstroke of |sin(t * 6.5)| (period PI / 6.5)
    at = np.ceil(a * 6.5 / np.pi) * np.pi / 6.5
    i = 0
    while at < b:
        place(buf, chop(i) * gain, float(at), pan=-0.2)
        at += np.pi / 6.5
        i += 1


def sniff():
    t = T(0.25)
    return norm(fftfilt(rs.standard_normal(len(t)), 1200, 5000)) * np.sin(np.pi * t / 0.25) ** 2


def popc(f=700):
    t = T(0.12)
    return norm(np.sin(2 * np.pi * np.cumsum(f * (1 - 0.5 * t / 0.12)) / SR) * np.exp(-t * 30))


def swish(dur=1.6):
    t = T(dur)
    n = fftfilt(rs.standard_normal(len(t)), 600, 4000)
    return norm(n) * np.sin(np.pi * t / dur) ** 2


def bubbles(dur=1.6, rate=10, seed=3):
    r = np.random.default_rng(seed)
    n = int(dur * SR)
    out = np.zeros(n)
    for at in np.sort(r.uniform(0, dur - 0.1, int(dur * rate))):
        d = T(0.06)
        s = np.sin(2 * np.pi * np.cumsum(r.uniform(500, 1000) * (1 + 2 * d / 0.06)) / SR) * np.exp(-d * 50)
        i = int(at * SR)
        out[i : i + len(s)] += s[: n - i] * r.uniform(0.4, 1)
    return norm(out)


def fizz(dur=2.0):
    t = T(dur)
    n = fftfilt(rs.standard_normal(len(t)), 3000, 9000)
    crackle = (rs.random(len(t)) > 0.995).astype(float)
    return norm(n * 0.6 + fftfilt(crackle, 2000, 8000)) * np.clip(t / 0.2, 0, 1) * np.clip((dur - t) / 0.5, 0, 1)


def zing():
    t = T(0.6)
    f = 1800 + 900 * np.sin(2 * np.pi * 14 * t)
    return norm(np.sin(2 * np.pi * np.cumsum(f) / SR)) * np.exp(-t * 5)


def drip(f=1300):
    t = T(0.12)
    return norm(np.sin(2 * np.pi * np.cumsum(f * (1 + 1.6 * t / 0.12)) / SR) * np.exp(-t * 35))


def swoosh(dur=1.3):
    t = T(dur)
    n = fftfilt(rs.standard_normal(len(t)), 200, 2000)
    return norm(n) * np.sin(np.pi * t / dur) ** 1.5


def door():
    t = T(0.5)
    s = fftfilt(rs.standard_normal(len(t)), 100, 800) * np.exp(-t * 6)
    click = np.sin(2 * np.pi * 900 * t) * np.exp(-t * 80)
    return norm(s + click)


def cool_hum(dur=1.8):
    t = T(dur)
    return norm(np.sin(2 * np.pi * 110 * t) + 0.4 * np.sin(2 * np.pi * 220 * t)) * np.sin(np.pi * t / dur)


def glint():
    t = T(0.6)
    return norm(sum(np.sin(2 * np.pi * f * t) * np.exp(-t * d) for f, d in ((2637, 6), (3951, 9), (5274, 12))))


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

    loop(*KIT_A, home, marimba, 1.0)
    loop(*CELLS, inner, musicbox, 0.9)
    loop(*EYE, inner, musicbox, 0.8, half=False)
    loop(*KIT_B, home, marimba, 1.1)
    place(buf, pad([midi(n) for n in (48, 60, 64, 67, 72)], 3.2) * 0.2, OUTRO)
    for k, m in enumerate([72, 76, 79, 84]):
        place(buf, pluck_bell(midi(m), 2.5) * 0.12, OUTRO + 0.05 + k * 0.12, pan=-0.3 + 0.2 * k)
    place(buf, bass(midi(36), 2.0) * 0.3, OUTRO)
    fade = int(1.2 * SR)
    buf[-fade:] *= np.linspace(1, 0, fade)[:, None]
    return buf


def story_sfx():
    buf = np.zeros((N, 2))
    chops(buf, 0.0, 6.8)
    chops(buf, 6.8, 9.8, gain=0.1)
    chops(buf, 53.0, 56.0, gain=0.14)
    place(buf, sniff() * 0.16, 1.4)
    place(buf, sniff() * 0.14, 4.0)
    # inside the onion
    place(buf, swish(2.0) * 0.18, 25.9)
    for i, at in enumerate(np.linspace(27.4, 28.4, 8)):
        place(buf, popc(600 + 90 * i) * 0.16, float(at), pan=0.3 * np.sin(i))
    place(buf, bubbles(1.8, 12, 3) * 0.14, 28.8)
    place(buf, fizz(2.2) * 0.12, 30.9)
    # the eye
    place(buf, fizz(1.8) * 0.08, 33.2)
    place(buf, zing() * 0.18, 37.6)
    for i, at in enumerate(np.arange(40.0, 44.0, 0.35)):
        place(buf, drip(1100 + 120 * (i % 4)) * 0.14, float(at), pan=0.25)
    place(buf, swoosh(1.4) * 0.16, 41.7)
    # tips
    place(buf, door() * 0.2, 49.9)
    place(buf, cool_hum(1.8) * 0.08, 50.4)
    place(buf, door() * 0.16, 52.0)
    place(buf, glint() * 0.16, 53.2)
    return buf


def ui_sfx():
    buf = np.zeros((N, 2))
    for at in (2.2, 6.8, 11.84, 21.9, 32.94, 38.62, 43.3, 52.4, 56.0, 60.12, 67.12):
        place(buf, whoosh(0.5) * 0.2, at - 0.25)
    place(buf, sparkle(1.3, 34, True, 2) * 0.32, 14.5)
    place(buf, whoosh(0.9, 300, 6000, rev=True) * 0.25, 15.3)
    place(buf, sparkle(0.6, 22, False, 3) * 0.3, 16.26)
    pops = (0.4, 2.26, 2.96, 3.56, 4.7, 7.64, 10.48, 12.22, 18.6, 23.2, 23.6, 24.16, 25.92, 29.68, 33.46, 35.82,
            39.0, 40.56, 41.62, 44.76, 48.58, 50.4, 52.6, 54.28, 57.28, 60.84, 64.6, 64.85, 65.1, 67.2, 67.5, 67.8,
            OUTRO + 0.3, OUTRO + 0.5, OUTRO + 0.7)
    for at in pops:
        place(buf, pop() * 0.22, at, pan=float(rs.uniform(-0.3, 0.3)))
    place(buf, chime((84, 88, 91)) * 0.26, 21.08)  # SEL!
    place(buf, nope() * 0.15, 37.66)  # PEDIH!
    place(buf, nope() * 0.12, 45.3)  # bukan sedih
    place(buf, chime((79, 84, 88, 91)) * 0.28, 46.1)  # MATA LINDUNGI DIRI!
    place(buf, sparkle(1.0, 24, False, 6) * 0.22, 47.3)
    place(buf, boing() * 0.22, 60.15)
    place(buf, chime((79, 84, 88, 91)) * 0.35, 60.2)
    place(buf, sparkle(1.0, 24, False, 8) * 0.28, 60.3)
    place(buf, chime((84, 88, 91, 96), 0.07) * 0.26, 64.5)  # TERIMA KASIH, MAMA!
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
