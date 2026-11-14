#!/usr/bin/env python3
"""Soundtrack for Episode 035, synthesised from scratch (no samples, no
licensed music) and mixed under the narration.

Reuses the instruments and effects from Episode 005's build_audio.py and adds:
tiny ant-feet patter, a shrinking glide, cartoon sniffs, a mysterious scent
shimmer, crunchy nibbles, a fading hum, a scurry, and a jar pop and lid clink.

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

DUR = 69.45
OUTRO = 66.3
OUT = os.path.join(HERE, "output")
N = int(SR * DUR)
rs = np.random.default_rng(35)

# scene boundaries (must match episode.js)
ROOM_A = (0.0, 12.55)
WORLD = (12.55, 54.45)
ROOM_B = (54.45, OUTRO)


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
def patter(dur, rate=18.0, seed=1, lo=2500, hi=7000):
    """Many tiny ant feet: dense, soft, random clicks."""
    r = np.random.default_rng(seed)
    n = int(dur * SR)
    out = np.zeros(n)
    k = T(0.012)
    tick = np.sin(2 * np.pi * 3200 * k) * np.exp(-k * 500)
    for at in np.sort(r.uniform(0, dur - 0.02, int(dur * rate))):
        i = int(at * SR)
        out[i : i + len(tick)] += tick[: n - i] * r.uniform(0.3, 1)
    out = fftfilt(out, lo, hi)
    t = np.arange(n) / SR
    return norm(out) * np.clip(t / 0.3, 0, 1) * np.clip((dur - t) / 0.3, 0, 1)


def glide(dur=1.4, f0=1200, f1=250):
    t = T(dur)
    f = f0 * (f1 / f0) ** (t / dur)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) + 0.3 * np.sin(2 * np.pi * np.cumsum(f * 2.01) / SR)
    return norm(s) * np.clip(t / 0.05, 0, 1) * np.clip((dur - t) / 0.2, 0, 1)


def sniff():
    t = T(0.18)
    n = fftfilt(rs.standard_normal(len(t)), 1500, 6000)
    return norm(n) * np.sin(np.pi * t / 0.18) ** 2


def sniffs(buf, a, n=3, gap=0.22, gain=0.18):
    for i in range(n):
        place(buf, sniff() * gain, a + i * gap, pan=0.1)


def shimmer(dur=3.0, seed=4, lo=900, hi=1800, n=30):
    r = np.random.default_rng(seed)
    m = int(dur * SR)
    out = np.zeros(m)
    for at in np.sort(r.uniform(0, dur - 0.5, n)):
        d = T(0.5)
        s = np.sin(2 * np.pi * r.uniform(lo, hi) * d) * np.exp(-d * 6) * np.sin(2 * np.pi * 5 * d)
        i = int(at * SR)
        out[i : i + len(s)] += s[: m - i] * r.uniform(0.3, 1)
    return norm(out) * np.sin(np.pi * np.arange(m) / m) ** 0.5


def crunch(seed=0):
    r = np.random.default_rng(seed)
    t = T(0.12)
    return norm(fftfilt(r.standard_normal(len(t)), 900, 5000) * np.exp(-t * 40) * (0.6 + 0.4 * np.sign(np.sin(2 * np.pi * 60 * t))))


def hum(dur=3.0, f=196.0):
    t = T(dur)
    s = np.sin(2 * np.pi * f * t) + 0.4 * np.sin(2 * np.pi * f * 1.5 * t)
    return norm(s) * np.clip(t / 0.4, 0, 1) * np.clip((dur - t) / 1.2, 0, 1) * (1 - 0.4 * t / dur)


def scurry(dur=1.6):
    t = T(dur)
    return patter(dur, 60, 9, 2000, 8000) * np.clip((dur - t) / dur, 0, 1)


def clink():
    t = T(0.5)
    s = sum(np.sin(2 * np.pi * f * t) * np.exp(-t * d) for f, d in ((1850, 9), (2960, 12), (4410, 16)))
    return norm(s)


def swell(dur=1.4, notes=(60, 64, 67, 72)):
    t = T(dur)
    s = sum(np.sin(2 * np.pi * midi(m) * t) for m in notes) / len(notes)
    return s * np.clip(t / (dur * 0.6), 0, 1) ** 2 * np.clip((dur - t) / 0.3, 0, 1)


# ------------------------------------------------------------------ layers
def music():
    buf = np.zeros((N, 2))
    beat = 60 / 104
    bar = beat * 4
    home = [(48, [60, 64, 67]), (53, [60, 65, 69]), (55, [59, 62, 67]), (48, [60, 64, 67])]
    ants = [(45, [64, 69, 72]), (41, [65, 69, 72]), (43, [62, 67, 71]), (45, [64, 69, 72])]
    arp = [0, 1, 2, 1, 0, 2, 1, 2]

    def home_loop(a, b, gain=1.0):
        t0, i = a, 0
        while t0 < b - 0.3:
            root, ch = home[i % 4]
            place(buf, pad([midi(n) for n in ch], max(1.6, min(bar + 0.6, b - t0 + 0.4))) * 0.1 * gain, t0)
            for k in range(8):
                if t0 + k * beat / 2 < b - 0.1:
                    place(buf, marimba(midi(ch[arp[k]] + 12)) * 0.12 * gain, t0 + k * beat / 2, pan=-0.3 + 0.08 * k)
            place(buf, bass(midi(root - 12), 0.5) * 0.22 * gain, t0)
            t0 += bar
            i += 1

    home_loop(*ROOM_A)
    # ant world: tiptoe music-box over a pad, quieter while the scent fades
    t0, i = WORLD[0], 0
    while t0 < WORLD[1] - 0.3:
        root, ch = ants[i % 4]
        g = 0.55 if 49.5 < t0 < 53.0 else 1.0
        place(buf, pad([midi(n) for n in ch], bar + 0.8) * 0.13 * g, t0)
        for k, st in enumerate([0, 2, 1, 2, 0, 1, 2, 1]):
            place(buf, musicbox(midi(ch[st] + 12)) * 0.08 * g, t0 + k * beat / 2, pan=0.3 * ((k % 2) * 2 - 1))
            place(buf, shaker() * 0.035 * g, t0 + k * beat / 2 + beat / 4)
        place(buf, bass(midi(root - 12), 0.6) * 0.2 * g, t0)
        place(buf, bass(midi(root - 12), 0.4) * 0.12 * g, t0 + beat * 2)
        t0 += bar
        i += 1
    home_loop(*ROOM_B, gain=1.1)
    place(buf, pad([midi(n) for n in (48, 60, 64, 67, 72)], 3.2) * 0.2, OUTRO)
    for k, m in enumerate([72, 76, 79, 84]):
        place(buf, pluck_bell(midi(m), 2.5) * 0.12, OUTRO + 0.05 + k * 0.12, pan=-0.3 + 0.2 * k)
    place(buf, bass(midi(36), 2.0) * 0.3, OUTRO)
    fade = int(1.2 * SR)
    buf[-fade:] *= np.linspace(1, 0, fade)[:, None]
    return buf


def story_sfx():
    buf = np.zeros((N, 2))
    # real-room ant line
    place(buf, patter(ROOM_A[1] - 0.2, 14, 1) * 0.1, 0.0)
    place(buf, patter(8.0, 14, 2) * 0.1, ROOM_B[0])
    place(buf, scurry(1.6) * 0.12, 60.95)
    # shrinking
    place(buf, glide(1.3, 1400, 300) * 0.16, 11.0)
    # ant world
    place(buf, patter(6.5, 8, 3) * 0.12, 12.9)  # scout walking out
    place(buf, crunch(1) * 0.2, 20.6)
    place(buf, patter(5.0, 8, 4) * 0.12, 21.7)  # scout home
    place(buf, shimmer(5.0, 5) * 0.14, 21.8)  # scent being laid
    sniffs(buf, 26.3, 3)  # Affan sniffs: nothing
    place(buf, nope() * 0.14, 27.05)
    sniffs(buf, 30.9, 4, 0.18, 0.14)  # antennae
    place(buf, patter(17.0, 25, 5) * 0.14, 28.6)  # followers, getting busier
    place(buf, patter(9.0, 45, 6) * 0.12, 36.8)
    place(buf, shimmer(3.0, 8, 1200, 2400, 30) * 0.12, 40.4)  # stronger scent
    for i, at in enumerate(np.linspace(46.0, 48.5, 9)):
        place(buf, crunch(i + 3) * 0.16, float(at), pan=0.2 * np.sin(i))
    place(buf, hum(3.2) * 0.1, 49.6)  # scent fading
    place(buf, scurry(1.8) * 0.16, 52.4)
    # room payoff
    place(buf, pop() * 0.35, 58.0)  # jar pops up
    place(buf, boing() * 0.2, 59.6)  # biscuit hops in
    place(buf, clink() * 0.25, 60.95)  # lid
    return buf


def ui_sfx():
    buf = np.zeros((N, 2))
    for at in (2.05, 7.82, 16.6, 26.0, 28.3, 33.3, 42.3, 49.6, 64.02):
        place(buf, whoosh(0.5) * 0.2, at - 0.25)
    place(buf, sparkle(1.3, 34, True, 2) * 0.32, 10.8)
    place(buf, whoosh(0.9, 300, 6000, rev=True) * 0.25, 11.6)
    place(buf, sparkle(0.6, 22, False, 3) * 0.3, 12.55)
    place(buf, whoosh(0.6, 2500, 300) * 0.35, 54.4)
    pops = (0.4, 2.06, 3.82, 4.26, 6.18, 7.9, 8.7, 9.1, 9.5, 12.9, 14.1, 15.36, 17.37, 20.06, 24.34, 26.08, 31.0,
            32.3, 33.3, 35.8, 37.09, 40.52, 44.1, 46.88, 48.13, 50.64, 55.42, 59.36, 61.56, 64.2, 64.5, 64.8,
            OUTRO + 0.3, OUTRO + 0.5, OUTRO + 0.7)
    for at in pops:
        place(buf, pop() * 0.22, at, pan=float(rs.uniform(-0.3, 0.3)))
    place(buf, chime((79, 84, 88, 91)) * 0.3, 19.6)  # JUMPA!
    place(buf, chime((76, 79, 84)) * 0.24, 28.34)  # TAPI SEMUT BOLEH!
    place(buf, chime((84, 88, 91)) * 0.24, 45.06)  # IKUT GARISAN SAMA!
    place(buf, chime((79, 84, 88)) * 0.2, 52.46)  # BERSURAI!
    place(buf, boing() * 0.2, 54.52)
    place(buf, chime((79, 84, 88, 91)) * 0.35, 54.6)
    place(buf, sparkle(1.0, 24, False, 8) * 0.28, 54.7)
    place(buf, chime((84, 88, 91)) * 0.22, 61.0)  # SIMPAN DALAM BEKAS
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
