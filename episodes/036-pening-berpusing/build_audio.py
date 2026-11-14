#!/usr/bin/env python3
"""Soundtrack for Episode 036, synthesised from scratch (no samples, no
licensed music) and mixed under the narration.

Reuses the instruments and effects from Episode 005's build_audio.py and adds:
a merry-go-round whirr and creak, a dizzy wobble with tweeting stars, watery
bubbles and sloshes inside the ear, a hair shimmer, signal zaps, a sudden-stop
skid, spoon clinks in a tea cup, a confused brain warble, and a bench thump.

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

DUR = 70.45
OUTRO = 67.3
OUT = os.path.join(HERE, "output")
N = int(SR * DUR)
rs = np.random.default_rng(36)

# scene boundaries (must match episode.js)
PLAY_A = (0.0, 14.6)
EAR = (14.6, 43.22)
MIND = (43.22, 52.8)
EAR_B = (52.8, 58.1)
PLAY_B = (58.1, OUTRO)


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
def whirr(dur, f0=180, f1=180, wobble=3.2):
    t = T(dur)
    f = f0 + (f1 - f0) * t / dur
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * (0.6 + 0.4 * np.sin(2 * np.pi * wobble * t))
    n = fftfilt(rs.standard_normal(len(t)), 300, 1500) * 0.4
    return norm(s + n) * np.clip(t / 0.2, 0, 1) * np.clip((dur - t) / 0.3, 0, 1)


def creak():
    t = T(0.35)
    f = 420 + 120 * np.sin(2 * np.pi * 9 * t)
    s = np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * np.exp(-t * 6)
    return norm(fftfilt(s, 300, 3000))


def tweets(dur=2.0, seed=2):
    """Cartoon dizzy birds: quick rising chirps."""
    r = np.random.default_rng(seed)
    n = int(dur * SR)
    out = np.zeros(n)
    for at in np.arange(0.0, dur - 0.2, 0.28):
        d = T(0.12)
        f = r.uniform(2400, 3200) * (1 + 0.6 * d / 0.12)
        s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * d / 0.12)
        i = int(at * SR)
        out[i : i + len(s)] += s[: n - i]
    return norm(out)


def wobble_tone(dur=1.2, f=330):
    t = T(dur)
    s = np.sin(2 * np.pi * np.cumsum(f * (1 + 0.08 * np.sin(2 * np.pi * 7 * t))) / SR)
    return norm(s) * np.clip(t / 0.05, 0, 1) * np.clip((dur - t) / 0.4, 0, 1)


def bubbles(dur=3.0, rate=7.0, seed=3):
    r = np.random.default_rng(seed)
    n = int(dur * SR)
    out = np.zeros(n)
    for at in np.sort(r.uniform(0, dur - 0.15, int(dur * rate))):
        d = T(0.08)
        f0 = r.uniform(500, 1100)
        s = np.sin(2 * np.pi * np.cumsum(f0 * (1 + 2.5 * d / 0.08)) / SR) * np.exp(-d * 40)
        i = int(at * SR)
        out[i : i + len(s)] += s[: n - i] * r.uniform(0.4, 1)
    return norm(out)


def slosh(dur=2.0, rate=1.6):
    t = T(dur)
    n = fftfilt(rs.standard_normal(len(t)), 200, 1400)
    return norm(n * (0.5 + 0.5 * np.sin(2 * np.pi * rate * t) ** 2)) * np.clip(t / 0.3, 0, 1) * np.clip((dur - t) / 0.5, 0, 1)


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


def zap(dur=0.4):
    t = T(dur)
    f = 500 + 1800 * (t / dur)
    return norm(np.sin(2 * np.pi * np.cumsum(f) / SR)) * np.exp(-t * 6)


def skid(dur=0.45):
    t = T(dur)
    f = 900 * (1 - 0.5 * t / dur)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) + 0.5 * fftfilt(rs.standard_normal(len(t)), 1500, 6000)
    return norm(s) * np.clip((dur - t) / dur, 0, 1)


def clink(f=2600):
    t = T(0.35)
    s = sum(np.sin(2 * np.pi * ff * t) * np.exp(-t * d) for ff, d in ((f, 12), (f * 1.6, 16), (f * 2.4, 22)))
    return norm(s)


def thump():
    t = T(0.2)
    return norm(np.sin(2 * np.pi * 90 * t) * np.exp(-t * 25))


# ------------------------------------------------------------------ layers
def music():
    buf = np.zeros((N, 2))
    beat = 60 / 108
    bar = beat * 4
    park = [(48, [60, 64, 67]), (53, [60, 65, 69]), (55, [59, 62, 67]), (48, [60, 64, 67])]
    inner = [(45, [64, 69, 72]), (41, [65, 69, 72]), (43, [62, 67, 71]), (45, [64, 69, 72])]
    mindc = [(50, [62, 65, 69]), (46, [62, 65, 70]), (53, [60, 65, 69]), (48, [60, 64, 67])]
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

    loop(*PLAY_A, park, marimba, 1.1)
    loop(*EAR, inner, musicbox, 0.9)
    loop(*MIND, mindc, musicbox, 0.8, half=False)
    loop(*EAR_B, inner, musicbox, 0.7, half=False)
    loop(*PLAY_B, park, marimba, 1.1)
    place(buf, pad([midi(n) for n in (48, 60, 64, 67, 72)], 3.2) * 0.2, OUTRO)
    for k, m in enumerate([72, 76, 79, 84]):
        place(buf, pluck_bell(midi(m), 2.5) * 0.12, OUTRO + 0.05 + k * 0.12, pan=-0.3 + 0.2 * k)
    place(buf, bass(midi(36), 2.0) * 0.3, OUTRO)
    fade = int(1.2 * SR)
    buf[-fade:] *= np.linspace(1, 0, fade)[:, None]
    return buf


def story_sfx():
    buf = np.zeros((N, 2))
    # merry-go-round
    place(buf, whirr(5.6, 200, 200) * 0.14, 0.0)
    place(buf, whirr(0.9, 200, 90) * 0.12, 5.6)
    for at in (0.9, 2.6, 4.3):
        place(buf, creak() * 0.08, at, pan=0.3)
    place(buf, thump() * 0.25, 6.6)  # hop off
    place(buf, tweets(2.6, 2) * 0.1, 7.3)
    place(buf, wobble_tone(1.4, 330) * 0.1, 8.2)
    place(buf, tweets(2.0, 5) * 0.08, 10.4)
    # inside the ear
    place(buf, bubbles(3.0, 6, 3) * 0.12, 22.6)
    place(buf, shimmer(1.6, 4) * 0.12, 24.4)
    place(buf, whirr(9.8, 140, 150, 5) * 0.08, 27.6)  # labyrinth spinning
    place(buf, slosh(9.0, 1.4) * 0.14, 28.0)
    place(buf, shimmer(1.4, 7) * 0.12, 31.6)
    for i, at in enumerate(np.arange(33.45, 36.2, 0.3)):
        place(buf, zap() * 0.08, float(at), pan=0.15 * np.sin(i))
    place(buf, skid(0.45) * 0.2, 37.3)
    place(buf, slosh(3.3, 1.8) * 0.16, 37.5)
    place(buf, bubbles(2.5, 8, 4) * 0.1, 38.5)
    # tea cup
    for i, at in enumerate(np.arange(40.8, 41.6, 0.2)):
        place(buf, clink(2600 + 200 * (i % 2)) * 0.12, float(at), pan=0.2 * (i % 2 * 2 - 1))
    place(buf, slosh(1.6, 2.2) * 0.12, 41.6)
    # brain confusion
    place(buf, wobble_tone(2.6, 262) * 0.1, 49.2)
    place(buf, tweets(1.5, 8) * 0.07, 51.4)
    # ear calms down
    place(buf, bubbles(2.0, 4, 6) * 0.08, 53.0)
    # bench
    place(buf, thump() * 0.22, 62.4)
    return buf


def ui_sfx():
    buf = np.zeros((N, 2))
    for at in (3.0, 6.45, 10.27, 24.2, 27.4, 31.4, 33.3, 36.35, 43.22, 49.0, 52.8):
        place(buf, whoosh(0.5) * 0.2, at - 0.25)
    place(buf, sparkle(1.3, 34, True, 2) * 0.32, 12.9)
    place(buf, whoosh(0.9, 300, 6000, rev=True) * 0.25, 13.6)
    place(buf, sparkle(0.6, 22, False, 3) * 0.3, 14.6)
    place(buf, whoosh(0.6, 2500, 300) * 0.35, 40.7)
    place(buf, whoosh(0.6, 2500, 300) * 0.35, 58.05)
    pops = (0.4, 0.8, 3.06, 5.3, 6.96, 8.12, 11.0, 14.88, 19.5, 22.66, 24.42, 28.06, 29.14, 32.4, 33.42, 34.56,
            37.32, 38.88, 39.3, 40.78, 41.9, 43.26, 45.84, 49.2, 52.82, 55.24, 58.98, 61.4, 62.12, 65.1, 65.4,
            65.7, OUTRO + 0.3, OUTRO + 0.5, OUTRO + 0.7)
    for at in pops:
        place(buf, pop() * 0.22, at, pan=float(rs.uniform(-0.3, 0.3)))
    place(buf, nope() * 0.15, 11.0)  # PENING!
    place(buf, chime((79, 84, 88)) * 0.26, 14.9)  # RAHSIA DALAM TELINGA!
    place(buf, chime((76, 79, 84)) * 0.22, 39.0)  # AIR MASIH BERPUSING!
    place(buf, nope() * 0.18, 51.96)  # PENING!
    place(buf, chime((84, 88, 91)) * 0.26, 56.44)  # PENING HILANG!
    place(buf, boing() * 0.22, 58.15)
    place(buf, chime((79, 84, 88, 91)) * 0.35, 58.2)
    place(buf, sparkle(1.0, 24, False, 8) * 0.28, 58.3)
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
