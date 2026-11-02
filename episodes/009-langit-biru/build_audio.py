#!/usr/bin/env python3
"""Soundtrack for Episode 009, synthesised from scratch (no samples, no
licensed music) and mixed under the narration.

Layers: original music bed with a sense of wonder (park, flight, micro world,
sunset swell, diagram pulse, golden-hour park, outro jingle), park ambience
with birdsong, rocket launch and wind, micro-world particle ambience, and SFX:
whooshes, label pops, spectrum sparkle, shimmering pings synced to the blue
(and much fainter red) scattering, discovery and reveal chimes. The music is
ducked under the voice and the mix is normalised to -14 LUFS / -1.5 dBTP.

    python3 build_audio.py            # -> output/mix.wav (+ stems in output/stems)
Requires numpy and ffmpeg.
"""
import json
import os
import subprocess
import sys

import numpy as np

SR = 44100
DUR = 47.5
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "output")
N = int(SR * DUR)
rs = np.random.default_rng(9)


def T(sec):
    return np.arange(int(sec * SR)) / SR


def place(buf, sig, at, gain=1.0, pan=0.0):
    i = int(at * SR)
    if i >= len(buf):
        return
    sig = sig[: len(buf) - i]
    l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    buf[i : i + len(sig), 0] += sig * gain * l * 1.414
    buf[i : i + len(sig), 1] += sig * gain * r * 1.414


def env_adsr(n, a=0.01, d=0.1, s=0.7, r=0.2):
    e = np.ones(n) * s
    na, nd, nr = int(a * SR), int(d * SR), int(r * SR)
    e[:na] = np.linspace(0, 1, na, endpoint=False) if na else e[:na]
    e[na : na + nd] = np.linspace(1, s, nd)
    if nr:
        e[-nr:] *= np.linspace(1, 0, nr)
    return e


def svf(x, f0, f1, q=0.7, mode="bp"):
    """Time-varying state-variable filter, cutoff sweeping f0 -> f1 (log)."""
    n = len(x)
    fc = np.exp(np.linspace(np.log(f0), np.log(f1), n))
    g = 2 * np.sin(np.pi * np.minimum(fc, SR / 6) / SR)
    low = band = 0.0
    out = np.zeros(n)
    damp = 1 / q
    for i in range(n):
        high = x[i] - low - damp * band
        band += g[i] * high
        low += g[i] * band
        out[i] = band if mode == "bp" else low
    return out


def onepole(x, fc):
    a = np.exp(-2 * np.pi * fc / SR)
    y = np.zeros_like(x)
    acc = 0.0
    for i in range(len(x)):
        acc = (1 - a) * x[i] + a * acc
        y[i] = acc
    return y


def midi(m):
    return 440.0 * 2 ** ((m - 69) / 12)


# ------------------------------------------------------------- instruments
def marimba(f, dur=0.6):
    t = T(dur)
    y = np.sin(2 * np.pi * f * t) * np.exp(-t * 7) + 0.35 * np.sin(2 * np.pi * 4 * f * t) * np.exp(-t * 28)
    y[: int(0.002 * SR)] *= np.linspace(0, 1, int(0.002 * SR))
    return y


def musicbox(f, dur=1.6):
    t = T(dur)
    y = np.sin(2 * np.pi * f * t) * np.exp(-t * 3.2) + 0.25 * np.sin(2 * np.pi * 3.01 * f * t) * np.exp(-t * 7) + 0.1 * np.sin(2 * np.pi * 5.4 * f * t) * np.exp(-t * 12)
    y[: int(0.003 * SR)] *= np.linspace(0, 1, int(0.003 * SR))
    return y


def pad(freqs, dur):
    t = T(dur)
    y = np.zeros_like(t)
    for f in freqs:
        for det in (-0.004, 0.0, 0.004):
            for h in range(1, 5):
                y += np.sin(2 * np.pi * f * (1 + det) * h * t + h) / (h * h)
    return y / (len(freqs) * 3) * env_adsr(len(t), 0.5, 0.3, 0.8, 0.6)


def bass(f, dur=0.5):
    t = T(dur)
    return (np.sin(2 * np.pi * f * t) + 0.25 * np.sin(4 * np.pi * f * t)) * np.exp(-t * 3) * env_adsr(len(t), 0.005, 0.05, 1, 0.08)


def shaker(dur=0.06):
    t = T(dur)
    n = rs.standard_normal(len(t))
    n = np.diff(n, prepend=0)
    return n * np.exp(-t * 70) * 0.25


def pluck_bell(f, dur=1.4):
    t = T(dur)
    return (np.sin(2 * np.pi * f * t) + 0.5 * np.sin(2 * np.pi * 2.76 * f * t) * np.exp(-t * 2) + 0.25 * np.sin(2 * np.pi * 5.4 * f * t) * np.exp(-t * 5)) * np.exp(-t * 2.6)


# --------------------------------------------------------------------- sfx
def whoosh(dur=0.55, f0=300, f1=3500, rev=False):
    x = rs.standard_normal(int(dur * SR))
    y = svf(x, f0, f1, q=1.6)
    e = np.sin(np.linspace(0, np.pi, len(y))) ** 1.6
    y = y * e
    return (y[::-1] if rev else y) / (np.abs(y).max() + 1e-9)


def pop(f0=900, f1=320, dur=0.12):
    t = T(dur)
    f = f0 * (f1 / f0) ** (t / dur)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) * np.exp(-t * 30)


def sparkle(dur=1.4, n=26, rising=True, seed=1):
    r = np.random.default_rng(seed)
    out = np.zeros(int((dur + 0.6) * SR))
    for i in range(n):
        at = (i / n) * dur if rising else r.random() * dur
        f = (1800 + (i / n) * 3500 if rising else 2000 + r.random() * 4000) * (1 + 0.04 * r.standard_normal())
        t = T(0.5)
        s = np.sin(2 * np.pi * f * t) * np.exp(-t * 14) * (0.6 + 0.4 * r.random())
        k = int(at * SR)
        out[k : k + len(s)] += s[: len(out) - k]
    return out / (np.abs(out).max() + 1e-9)


def chime(notes=(84, 91, 96), gap=0.09):
    out = np.zeros(int((gap * len(notes) + 1.6) * SR))
    for i, m in enumerate(notes):
        s = pluck_bell(midi(m), 1.5)
        k = int(i * gap * SR)
        out[k : k + len(s)] += s
    return out / (np.abs(out).max() + 1e-9)


def nope():
    a = pop(520, 500, 0.14) * 0.9
    b = pop(400, 380, 0.2)
    out = np.zeros(int(0.45 * SR))
    out[: len(a)] += a
    k = int(0.16 * SR)
    out[k : k + len(b)] += b
    return out


def boing(dur=0.45):
    t = T(dur)
    f = 220 + 160 * np.sin(2 * np.pi * 9 * t) * np.exp(-t * 6) + 180 * t
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 6)


def chirp(f0=3200, f1=4600, dur=0.09):
    t = T(dur)
    f = f0 + (f1 - f0) * np.sin(np.pi * t / dur) ** 2
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * t / dur) ** 1.5


def bird(seed):
    """A short phrase of 2-5 chirps."""
    r = np.random.default_rng(seed)
    out = np.zeros(int(0.9 * SR))
    at = 0.0
    base = 2400 + r.random() * 2200
    for _ in range(2 + int(r.random() * 4)):
        c = chirp(base * (0.9 + 0.2 * r.random()), base * (1.2 + 0.4 * r.random()), 0.05 + 0.07 * r.random())
        k = int(at * SR)
        out[k : k + len(c)] += c[: len(out) - k]
        at += 0.08 + 0.1 * r.random()
    return out


def ping(f, dur=0.9):
    t = T(dur)
    return (np.sin(2 * np.pi * f * t) + 0.3 * np.sin(2 * np.pi * 2.0 * f * t) * np.exp(-t * 6)) * np.exp(-t * 5)


# ------------------------------------------------------------------ music
def music():
    buf = np.zeros((N, 2))
    bpm = 100
    beat = 60 / bpm
    bar = beat * 4
    # C  Am  F  G  (I vi IV V) in C major
    chords = [(48, [60, 64, 67]), (45, [57, 60, 64]), (41, [57, 60, 65]), (43, [55, 59, 62])]

    def section(a, b, style):
        t0, i = a, 0
        while t0 < b - 0.05:
            root, ch = chords[i % 4]
            if style == "park":
                place(buf, pad([midi(n) for n in ch], bar + 0.6) * 0.1, t0)
                for k, step in enumerate([0, 2, 1, 2, 0, 2, 1, 2]):
                    if t0 + k * beat / 2 < b:
                        place(buf, marimba(midi(ch[step] + 12)) * 0.15, t0 + k * beat / 2, pan=0.3 * ((k % 2) * 2 - 1))
                place(buf, bass(midi(root - 12), 0.8) * 0.22, t0)
            elif style == "flight":
                place(buf, pad([midi(n) for n in ch], bar + 0.6) * 0.14, t0)
                for k in range(8):
                    if t0 + k * beat / 2 < b:
                        place(buf, marimba(midi(ch[k % 3] + 12 + (12 if k >= 4 else 0))) * 0.17, t0 + k * beat / 2, pan=-0.4 + 0.1 * k)
                for k in (0, 2):
                    place(buf, bass(midi(root - 12), 0.5) * 0.28, t0 + k * beat)
                for k in range(8):
                    place(buf, shaker() * (0.45 if k % 2 else 0.25), t0 + k * beat / 2, pan=0.4)
            elif style == "micro":
                place(buf, pad([midi(n - 12) for n in ch] + [midi(ch[0])], bar + 0.8) * 0.15, t0)
                for k, step in enumerate([0, 1, 2, 1]):
                    place(buf, musicbox(midi(ch[step] + 24), 1.8) * 0.08, t0 + k * beat + beat * 0.5, pan=0.5 * ((k % 2) * 2 - 1))
            elif style == "diagram":
                place(buf, pad([midi(n) for n in ch], bar + 0.6) * 0.12, t0)
                for k in range(8):
                    if t0 + k * beat / 2 < b:
                        place(buf, pluck_bell(midi(ch[k % 3] + 12), 0.8) * 0.07, t0 + k * beat / 2, pan=0.3 * ((k % 2) * 2 - 1))
                place(buf, bass(midi(root - 12), 1.2) * 0.22, t0)
            t0 += bar
            i += 1

    section(0.0, 4.4, "park")
    section(4.4, 11.05, "flight")
    section(11.05, 20.48, "micro")
    # blue-sky resolve: bright C major
    place(buf, pad([midi(n) for n in (60, 64, 67, 72)], 3.4) * 0.18, 20.48)
    for k, m in enumerate([72, 76, 79, 84, 79, 76]):
        place(buf, marimba(midi(m)) * 0.16, 20.6 + k * beat / 2, pan=-0.3 + 0.12 * k)
    place(buf, bass(midi(36), 2.0) * 0.25, 20.48)
    # sunset: warm uplifting swell F -> G -> Am (crescendo)
    for at, ch, g in [(23.5, (53, 57, 60, 65), 0.12), (24.7, (55, 59, 62, 67), 0.16), (25.9, (57, 60, 64, 69), 0.22)]:
        s = pad([midi(n) for n in ch], 1.6)
        s *= np.linspace(0.6, 1.0, len(s))
        place(buf, s * g, at)
        place(buf, bass(midi(ch[0] - 12), 1.2) * 0.25, at)
    section(26.92, 35.75, "diagram")
    section(35.75, 44.5, "park")
    # outro jingle: original "little questions, big discoveries" motif
    motif = [(0.0, 72), (0.18, 76), (0.36, 79), (0.6, 84), (0.95, 83), (1.15, 84)]
    for at, m in motif:
        place(buf, marimba(midi(m), 0.8) * 0.26, 44.5 + at, pan=0.0)
        place(buf, musicbox(midi(m + 12), 1.2) * 0.08, 44.5 + at, pan=0.3)
    place(buf, pad([midi(n) for n in (48, 60, 64, 67, 72)], 3.0) * 0.2, 44.5)
    for k, m in enumerate([84, 88, 91, 96]):
        place(buf, pluck_bell(midi(m), 2.2) * 0.11, 45.75 + k * 0.1, pan=-0.3 + 0.2 * k)
    place(buf, bass(midi(36), 2.4) * 0.3, 45.75)
    fade = int(1.0 * SR)
    buf[-fade:] *= np.linspace(1, 0, fade)[:, None]
    return buf


# --------------------------------------------------------------- ambience
def ambience():
    buf = np.zeros((N, 2))
    # gentle breeze bed for the park
    breeze = svf(rs.standard_normal(N), 700, 700, q=0.5)
    breeze /= np.abs(breeze).max()
    lvl = np.zeros(N)
    for a, b, g in [(0, 4.6, 0.35), (4.6, 5.4, 0.25), (20.48, 26.92, 0.3), (35.75, 44.6, 0.3)]:
        lvl[int(a * SR) : int(b * SR)] = g
    lvl = onepole(lvl, 2)
    buf[:, 0] += breeze * lvl
    buf[:, 1] += np.roll(breeze, 61) * lvl
    # birdsong
    for a, b, gap, g in [(0.2, 4.4, 0.9, 0.22), (20.6, 23.5, 1.0, 0.2), (23.5, 26.6, 1.4, 0.12), (35.9, 44.3, 1.1, 0.16)]:
        tt, k = a, 0
        while tt < b:
            place(buf, bird(int(tt * 100) + k) * g, tt, pan=float(rs.uniform(-0.8, 0.8)))
            tt += gap * (0.6 + 0.8 * rs.random())
            k += 1
    # altitude wind (flight + above the clouds)
    wind = svf(rs.standard_normal(int(7.2 * SR)), 300, 1400, q=0.7)
    wind /= np.abs(wind).max()
    wenv = np.interp(np.arange(len(wind)) / SR, [0, 0.6, 2.2, 5.6, 7.2], [0, 0.9, 0.55, 0.4, 0])
    place(buf, wind * wenv * 0.6, 4.9)
    # micro world: soft airy bed + bubbly particle blips
    bed = svf(rs.standard_normal(int(9.6 * SR)), 1800, 900, q=0.9)
    bed /= np.abs(bed).max()
    benv = np.interp(np.arange(len(bed)) / SR, [0, 0.6, 9.0, 9.6], [0, 0.3, 0.3, 0])
    place(buf, bed * benv, 11.0)
    tt = 11.2
    while tt < 20.3:
        place(buf, pop(1400 + 900 * rs.random(), 700, 0.07) * 0.1, tt, pan=float(rs.uniform(-0.7, 0.7)))
        tt += 0.18 + 0.3 * rs.random()
    return buf


# --------------------------------------------------------------------- sfx
def rumble(dur):
    x = np.cumsum(rs.standard_normal(int(dur * SR)))
    x -= onepole(x, 1.0)
    x = onepole(x, 160)
    x /= np.abs(x).max() + 1e-9
    hiss = svf(rs.standard_normal(len(x)), 600, 2200, q=0.8)
    hiss /= np.abs(hiss).max() + 1e-9
    return x * 0.8 + hiss * 0.25


def sfx():
    buf = np.zeros((N, 2))
    # transitions
    for at in (4.4, 15.9, 20.48, 23.5, 26.92, 35.75, 44.5):
        place(buf, whoosh(0.5) * 0.32, at - 0.25)
    # S1 curious discovery pop + labels + "green?" nope
    place(buf, chime((79, 84), 0.08) * 0.22, 0.05)
    for at in (1.3, 1.6, 2.15, 2.37, 2.59, 3.62):
        place(buf, pop() * 0.3, at, pan=float(rs.uniform(-0.3, 0.3)))
    place(buf, nope() * 0.28, 3.85)
    # S2 magical rocket launch
    place(buf, sparkle(0.5, 12, True, 4) * 0.22, 4.55)
    place(buf, whoosh(0.4, 2000, 6000) * 0.15, 4.95)  # ignition fizz
    r = rumble(1.9)
    renv = np.interp(np.arange(len(r)) / SR, [0, 0.3, 1.4, 1.9], [0, 1, 0.8, 0])
    place(buf, r * renv * 0.25, 4.95)
    place(buf, whoosh(1.5, 200, 3000) * 0.22, 5.2)
    place(buf, whoosh(0.7, 4000, 400) * 0.2, 6.15)  # through the clouds
    # S3 spectrum reveal
    place(buf, sparkle(0.6, 16, False, 5) * 0.25, 6.95)
    place(buf, whoosh(0.6, 1500, 7000) * 0.18, 7.15)  # beam shimmer
    place(buf, sparkle(1.1, 30, True, 6) * 0.3, 7.7)
    place(buf, chime((84, 88, 91, 96), 0.08) * 0.3, 7.8)
    for at in (8.04, 9.7):
        place(buf, pop() * 0.3, at)
    # S4 magnifier zoom into the micro world
    place(buf, whoosh(0.9, 300, 6000, rev=True) * 0.28, 10.5)
    place(buf, sparkle(0.8, 20, False, 7) * 0.25, 11.0)
    for at in (11.3, 13.94, 14.2, 14.4, 15.14):
        place(buf, pop() * 0.28, at, pan=float(rs.uniform(-0.3, 0.3)))
    # S5 Rayleigh scattering: shimmering pings on every blue wavelet, far fainter red
    c = 3.2
    hit = 15.95 + 4.6 / c
    perB, perR = 3.0 / c, 4.67 / c
    tt, k = hit, 0
    while tt < 20.4:
        place(buf, ping(midi(91 + [0, 4, 7, 12][k % 4])) * 0.16, tt, pan=float(rs.uniform(-0.7, 0.7)))
        place(buf, sparkle(0.35, 8, False, 20 + k) * 0.12, tt + 0.02, pan=float(rs.uniform(-0.8, 0.8)))
        tt += perB
        k += 1
    tt = hit
    while tt < 20.4:
        place(buf, ping(midi(67)) * 0.04, tt, pan=-0.2)
        tt += perR
    for at in (16.38, 16.6, 17.48, 18.7):
        place(buf, pop() * 0.28, at)
    # S5b blue sky discovery
    place(buf, sparkle(1.0, 24, True, 9) * 0.25, 21.0)
    place(buf, chime((79, 84, 88, 91)) * 0.32, 22.12)
    # S6 sunset
    for at in (23.6, 23.82, 24.04, 25.44):
        place(buf, pop() * 0.26, at)
    place(buf, sparkle(1.4, 22, True, 10) * 0.16, 24.6)
    # S7 diagram
    for at in (26.96, 28.5, 28.75, 29.18, 29.98, 31.74, 33.46, 34.16):
        place(buf, pop() * 0.28, at, pan=float(rs.uniform(-0.3, 0.3)))
    place(buf, whoosh(1.2, 2500, 400) * 0.2, 27.6)  # the sun sinks
    fizz = sparkle(4.0, 60, False, 11)
    fenv = np.interp(np.arange(len(fizz)) / SR, [0, 0.5, 3.6, 4.6], [0, 1, 1, 0])
    place(buf, fizz * fenv * 0.12, 31.15)  # blue light scattering out of the beam
    place(buf, chime((84, 88, 91, 96), 0.07) * 0.38, 34.8)  # meaningful reveal
    place(buf, sparkle(0.8, 16, False, 12) * 0.22, 34.85)
    # S8 golden park
    place(buf, sparkle(0.8, 18, True, 13) * 0.2, 35.84)
    place(buf, pop() * 0.3, 37.78)
    for at in (39.14, 39.46):
        place(buf, pop(1100, 450) * 0.3, at)
    place(buf, chime((86, 91)) * 0.28, 40.8)
    place(buf, sparkle(0.6, 14, False, 14) * 0.22, 40.85)
    for at in (43.0, 43.22, 43.44):
        place(buf, pop() * 0.26, at)
    # outro
    place(buf, sparkle(1.0, 24, False, 15) * 0.28, 44.55)
    for at in (44.75, 44.95, 45.15, 45.6):
        place(buf, pop() * 0.28, at)
    return buf


def load_narration():
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", os.path.join(HERE, "audio", "narration.mp3"), "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"], check=True, capture_output=True).stdout
    v = np.frombuffer(raw, dtype=np.float32).astype(np.float64)
    out = np.zeros(N)
    out[: min(N, len(v))] = v[:N]
    return out


def duck_gain(voice):
    # envelope follower on the narration -> gain curve for music/ambience
    e = np.abs(voice)
    e = onepole(e, 8)
    talking = np.clip((20 * np.log10(e + 1e-6) + 42) / 12, 0, 1)
    talking = onepole(talking, 2.5)
    # look ahead 0.25 s so the bed is already down when a phrase starts
    hop = SR // 100
    c = talking[::hop]
    w = 25
    pad_c = np.concatenate([c, np.zeros(w)])
    ahead = np.max(np.stack([pad_c[i : i + len(c)] for i in range(w)]), axis=0)
    talking = np.interp(np.arange(len(voice)), np.arange(len(c)) * hop, ahead)
    return 1 - 0.6 * talking  # about -8 dB under speech


def write_wav(path, buf):
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "2", "-i", "-", "-c:a", "pcm_s24le", path], input=buf.astype(np.float32).tobytes(), check=True)


def main():
    os.makedirs(os.path.join(OUT, "stems"), exist_ok=True)
    voice = load_narration()
    duck = duck_gain(voice)[:, None]
    m = music() * duck
    a = ambience() * (0.5 + 0.5 * duck)
    s = sfx() * (0.55 + 0.45 * duck)  # effects dip a little under the voice too
    v = np.stack([voice, voice], 1)
    for name, b in (("music", m), ("ambience", a), ("sfx", s)):
        write_wav(os.path.join(OUT, "stems", name + ".wav"), b)
    mix = v * 1.0 + m * 0.5 + a * 0.16 + s * 0.5
    mix /= max(1.0, np.abs(mix).max() / 0.95)
    pre = os.path.join(OUT, "stems", "premix.wav")
    write_wav(pre, mix)
    # two-pass EBU R128 loudness normalisation to -14 LUFS, -1.5 dBTP
    r = subprocess.run(["ffmpeg", "-hide_banner", "-i", pre, "-af", "loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json", "-f", "null", "-"], capture_output=True, text=True)
    js = json.loads(r.stderr[r.stderr.rindex("{") :])
    af = (f"loudnorm=I=-14:TP=-1.5:LRA=11:measured_I={js['input_i']}:measured_TP={js['input_tp']}:"
          f"measured_LRA={js['input_lra']}:measured_thresh={js['input_thresh']}:offset={js['target_offset']}:linear=true")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", pre, "-af", af + ",aresample=48000", "-c:a", "pcm_s24le", os.path.join(OUT, "mix.wav")], check=True)
    print("wrote", os.path.join(OUT, "mix.wav"))


if __name__ == "__main__":
    sys.exit(main())
