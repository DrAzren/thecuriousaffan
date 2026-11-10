#!/usr/bin/env python3
"""Soundtrack for Episode 026, synthesised from scratch (no samples, no
licensed music) and mixed under the narration.

Layers: a light park tune, a game-show band for the TOP 3 studio, a drum roll
and fanfare for the No. 1 reveal, a glassy shimmer inside the enamel, a soft
minor turn for "tak boleh tumbuh balik", and a happy finale. SFX: bike bell
and freewheel, the crash, x-ray scan, cover whooshes, label pops, footsteps,
crystal clinks, the crack, tooth brushing and chimes. Park birds as ambience.
The music is ducked under the voice and the final mix is normalised to
-14 LUFS / -1.5 dBTP for social platforms.

    python3 build_audio.py            # -> output/mix.wav (+ stems in output/stems)
Requires numpy and ffmpeg.
"""
import os
import subprocess
import sys

import numpy as np

SR = 44100
DUR = 84.3
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "output")
N = int(SR * DUR)
rs = np.random.default_rng(26)


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



def noise(dur, seed=0):
    return np.random.default_rng(seed).standard_normal(int(dur * SR))


def hit(dur=0.25, f0=120, f1=45, seed=1):
    """Body thump: falling sine + a little noise."""
    t = T(dur)
    f = f0 * (f1 / f0) ** (t / dur)
    y = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 14)
    y += onepole(noise(dur, seed), 900) * np.exp(-t * 30) * 2
    return y / (np.abs(y).max() + 1e-9)


def clatter(dur=0.7, seed=3):
    """Metal bike rattle: a few inharmonic pings."""
    r = np.random.default_rng(seed)
    out = np.zeros(int(dur * SR))
    for i in range(9):
        at = r.random() * dur * 0.6
        f = 900 + r.random() * 2600
        t = T(0.25)
        s = (np.sin(2 * np.pi * f * t) + 0.5 * np.sin(2 * np.pi * f * 2.76 * t)) * np.exp(-t * 18)
        k = int(at * SR)
        out[k : k + len(s)] += s[: len(out) - k] * (0.4 + 0.6 * r.random())
    return out / (np.abs(out).max() + 1e-9)


def bell_ring():
    out = np.zeros(int(0.9 * SR))
    for k in (0, 0.16):
        t = T(0.7)
        s = (np.sin(2 * np.pi * 2350 * t) + 0.6 * np.sin(2 * np.pi * 3110 * t) + 0.3 * np.sin(2 * np.pi * 5200 * t)) * np.exp(-t * 7)
        i = int(k * SR)
        out[i : i + len(s)] += s[: len(out) - i]
    return out / np.abs(out).max()


def tick(f=4200):
    t = T(0.02)
    return np.sin(2 * np.pi * f * t) * np.exp(-t * 400)


def chirp(seed):
    r = np.random.default_rng(seed)
    out = []
    for _ in range(2 + int(r.random() * 3)):
        d = 0.06 + r.random() * 0.06
        t = T(d)
        f0 = 2800 + r.random() * 1800
        f = f0 + (r.random() - 0.3) * 1600 * t / d
        out.append(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * t / d) ** 2)
        out.append(np.zeros(int((0.02 + r.random() * 0.05) * SR)))
    return np.concatenate(out)


def snare(dur=0.12, seed=0):
    t = T(dur)
    n = svf(noise(dur, seed), 2500, 2500, q=0.6)
    n /= np.abs(n).max() + 1e-9
    return (n * 0.8 + 0.3 * np.sin(2 * np.pi * 190 * t)) * np.exp(-t * 28)


def clap(seed=0):
    out = np.zeros(int(0.2 * SR))
    for k, a in ((0, 0.6), (0.012, 0.8), (0.024, 1.0)):
        s = svf(noise(0.15, seed + int(k * 1000)), 1400, 1400, q=1.2) * np.exp(-T(0.15) * 30)
        i = int(k * SR)
        out[i : i + len(s)] += s[: len(out) - i] * a
    return out / (np.abs(out).max() + 1e-9)


def crash(dur=2.2, seed=4):
    n = noise(dur, seed)
    n = n - onepole(n, 3000)
    t = T(dur)
    return n / (np.abs(n).max() + 1e-9) * np.exp(-t * 2.2)


def brass(freqs, dur):
    """Soft synth-brass stab for fanfares."""
    t = T(dur)
    y = np.zeros_like(t)
    for f in freqs:
        for h in range(1, 9):
            y += np.sin(2 * np.pi * f * h * t * (1 + 0.002 * np.sin(2 * np.pi * 5 * t))) / h
    y = onepole(y, 2600)
    return y / (np.abs(y).max() + 1e-9) * env_adsr(len(t), 0.03, 0.15, 0.7, 0.25)


def sweep(dur, f0, f1):
    t = T(dur)
    f = f0 * (f1 / f0) ** (t / dur)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * t / dur)


def scrub(dur):
    t = T(dur)
    n = svf(noise(dur, 9), 3000, 3000, q=0.9)
    n /= np.abs(n).max() + 1e-9
    return n * (0.55 + 0.45 * np.sin(2 * np.pi * 7.0 * t)) * np.clip(np.minimum(t, dur - t) / 0.08, 0, 1)


def crackle():
    out = np.zeros(int(0.5 * SR))
    for i, k in enumerate((0, 0.03, 0.05, 0.11, 0.14)):
        s = onepole(noise(0.03, i), 6000) * np.exp(-T(0.03) * 120)
        j = int(k * SR)
        out[j : j + len(s)] += s
    sw = sweep(0.45, 700, 160)
    out[: len(sw)] += sw * 0.4
    return out / (np.abs(out).max() + 1e-9)



# ------------------------------------------------------------------ layers
def band(buf, a, b, chords, bpm, gain=1.0, full=True, start_bar=0):
    beat = 60 / bpm
    bar = beat * 4
    arp = [0, 1, 2, 1, 0, 2, 1, 2]
    t0 = a
    i = start_bar
    while t0 < b - 0.05:
        root, ch = chords[i % len(chords)]
        place(buf, pad([midi(n) for n in ch], max(1.6, min(bar, b - t0) + 0.4)) * 0.11 * gain, t0)
        for k in range(8):
            at = t0 + k * beat / 2
            if at < b:
                place(buf, marimba(midi(ch[arp[k]] + 12)) * 0.19 * gain, at, pan=-0.35 + 0.1 * k)
        for k in (0, 2):
            if t0 + k * beat < b:
                place(buf, bass(midi(root - 12) if k == 0 else midi(root - 5), 0.55) * 0.3 * gain, t0 + k * beat)
        if full:
            for k in range(8):
                if t0 + k * beat / 2 < b:
                    place(buf, shaker() * (0.5 if k % 2 else 0.3) * gain, t0 + k * beat / 2, pan=0.4)
            for k in (1, 3):
                if t0 + k * beat < b:
                    place(buf, clap(i * 4 + k) * 0.12 * gain, t0 + k * beat, pan=-0.2)
        t0 += bar
        i += 1


def music():
    buf = np.zeros((N, 2))
    C = [(48, [64, 67, 72]), (43, [62, 67, 71]), (45, [64, 69, 72]), (41, [65, 69, 72])]   # C G Am F
    F = [(53, [65, 69, 72]), (48, [64, 67, 72]), (50, [65, 69, 74]), (46, [65, 70, 74])]   # F C Dm Bb
    # park: light marimba + music box, no drums (0 - 12.2), softer while thinking (12.2 - 17.45)
    band(buf, 0.0, 12.2, C, 112, 0.9, full=False)
    beat = 60 / 112
    for k in range(int(12.2 / beat)):
        if k % 2 == 0:
            place(buf, musicbox(midi([76, 79, 84, 79][(k // 2) % 4])) * 0.08, k * beat, pan=0.3)
    t0 = 12.2
    while t0 < 17.45:
        place(buf, pad([midi(n) for n in (64, 67, 72)], 2.4) * 0.12, t0)
        place(buf, musicbox(midi(84)) * 0.07, t0 + 0.6, pan=-0.3)
        place(buf, musicbox(midi(79)) * 0.07, t0 + 1.4, pan=0.3)
        t0 += 2.1
    # studio: game-show band (17.45 - 46.1)
    band(buf, 17.45, 46.1, F, 120, 1.0, full=True)
    # suspense bed under the drum roll (46.1 - 50.93)
    place(buf, pad([midi(n) for n in (41, 48, 53, 56)], 4.9) * 0.18, 46.1)
    # reveal fanfare and band again (50.93 - 59.45)
    place(buf, brass([midi(n) for n in (65, 69, 72, 77)], 1.4) * 0.35, 50.93)
    place(buf, brass([midi(n) for n in (67, 71, 74, 79)], 0.25) * 0.25, 50.66)
    band(buf, 51.9, 59.45, F, 120, 0.8, full=True)
    # inside enamel: glassy shimmer (59.45 - 68.0)
    t0 = 59.45
    k = 0
    while t0 < 68.0:
        ch = [(65, 69, 72, 76), (62, 65, 69, 72)][k % 2]
        place(buf, pad([midi(n) for n in ch], 2.6) * 0.14, t0)
        for j, n in enumerate(ch):
            place(buf, musicbox(midi(n + 24), 1.8) * 0.06, t0 + j * 0.27, pan=-0.5 + j * 0.33)
        t0 += 2.13
        k += 1
    # sad turn (68.0 - 72.2): slow minor pad + music box
    place(buf, pad([midi(n) for n in (57, 60, 64)], 2.2) * 0.16, 68.0)
    place(buf, pad([midi(n) for n in (53, 57, 60)], 2.2) * 0.16, 70.1)
    for j, n in enumerate((76, 72, 69, 72, 74, 72, 69, 65)):
        place(buf, musicbox(midi(n), 1.4) * 0.07, 68.1 + j * 0.52, pan=0.2)
    # brushing + finale: cheerful band (72.2 - 80.85)
    band(buf, 72.2, 78.72, C, 120, 0.85, full=True)
    place(buf, brass([midi(n) for n in (60, 64, 67, 72)], 0.9) * 0.25, 75.56)
    band(buf, 78.72, 80.85, C, 120, 0.6, full=False, start_bar=1)
    # outro sting: C major chord with bells
    place(buf, pad([midi(n) for n in (48, 60, 64, 67, 72)], 3.4) * 0.2, 80.85)
    for k, m in enumerate([72, 76, 79, 84]):
        place(buf, pluck_bell(midi(m), 2.5) * 0.12, 80.9 + k * 0.12, pan=-0.3 + 0.2 * k)
    place(buf, bass(midi(36), 2.0) * 0.3, 80.85)
    fade = int(1.3 * SR)
    buf[-fade:] *= np.linspace(1, 0, fade)[:, None]
    return buf


def ambience():
    buf = np.zeros((N, 2))
    # park birds (0 - 17.45)
    r = np.random.default_rng(12)
    at = 0.3
    while at < 17.0:
        place(buf, chirp(int(r.random() * 1e6)) * 0.25, at, pan=float(r.uniform(-0.8, 0.8)))
        at += 0.8 + r.random() * 1.6
    # gentle breeze
    br = onepole(noise(17.45, 5), 400)
    br /= np.abs(br).max()
    e = np.clip(np.minimum(T(17.45), 17.45 - T(17.45)) / 0.5, 0, 1)
    place(buf, br * e * 0.15, 0.0)
    return buf


def sfx():
    buf = np.zeros((N, 2))
    # bike: bell, freewheel ticks, crash
    place(buf, bell_ring() * 0.35, 0.35, pan=0.2)
    tt = 0.05
    while tt < 2.55:
        place(buf, tick() * 0.25, tt, pan=0.1)
        tt += 0.09
    place(buf, hit(0.2, 400, 200, 2) * 0.25, 2.42)                 # wheel hits the stone
    place(buf, whoosh(0.45, 1500, 300) * 0.25, 2.5)
    place(buf, hit(0.35, 110, 40, 3) * 0.7, 2.92)                  # BEDEBUK
    place(buf, clatter(0.8, 4) * 0.3, 2.95, pan=-0.2)
    place(buf, boing(0.4) * 0.15, 3.15)
    # stand up, ok
    place(buf, whoosh(0.35, 400, 2400) * 0.2, 6.1)
    place(buf, chime((84, 88, 91)) * 0.3, 7.83)
    # x-ray scan and KUAT
    place(buf, sweep(0.7, 300, 2400) * 0.25, 8.95)
    place(buf, chime((79, 84, 88, 91), 0.07) * 0.35, 11.4)
    # magic swirl into the studio
    place(buf, sparkle(1.2, 34, True, 2) * 0.32, 16.3)
    place(buf, whoosh(0.9, 300, 6000, rev=True) * 0.25, 16.6)
    place(buf, sparkle(0.6, 22, False, 3) * 0.3, 17.4)
    # TOP 3 fanfare
    place(buf, brass([midi(n) for n in (65, 69, 72)], 0.35) * 0.35, 18.74)
    place(buf, brass([midi(n) for n in (65, 69, 72, 77)], 0.9) * 0.35, 19.1)
    place(buf, crash(1.6, 1) * 0.12, 18.74)
    # cover lifts + reveals
    for at in (20.3, 33.3):
        place(buf, whoosh(0.6, 400, 4000) * 0.3, at)
        place(buf, chime((84, 88, 91, 96), 0.06) * 0.3, at + 0.2)
        place(buf, sparkle(0.6, 18, False, int(at)) * 0.22, at + 0.25)
    # weight thump, footsteps, run, jump
    place(buf, hit(0.3, 90, 50, 5) * 0.3, 27.15)
    tt = 29.75
    while tt < 30.9:
        place(buf, hit(0.08, 300, 140, int(tt * 10)) * 0.18, tt, pan=-0.2)
        tt += 0.45
    tt = 30.95
    while tt < 31.85:
        place(buf, hit(0.07, 320, 150, int(tt * 10)) * 0.18, tt, pan=0.2)
        tt += 0.27
    place(buf, boing(0.5) * 0.25, 31.88)
    place(buf, hit(0.15, 200, 90, 8) * 0.3, 32.55)
    # temporal bone glow, shield
    place(buf, sparkle(0.9, 16, False, 31) * 0.2, 37.75)
    place(buf, pluck_bell(midi(79), 1.4) * 0.25, 42.6)
    place(buf, pluck_bell(midi(86), 1.4) * 0.18, 42.66)
    # drum roll -> crash + sparkle on GIGI
    tt, gap = 46.6, 0.075
    while tt < 50.85:
        k = (tt - 46.6) / 4.25
        place(buf, snare(0.1, int(tt * 100)) * (0.08 + 0.25 * k), tt, pan=float(rs.uniform(-0.2, 0.2)))
        tt += gap * (1 - 0.35 * k)
    place(buf, crash(2.4, 2) * 0.3, 50.93)
    place(buf, hit(0.4, 80, 40, 9) * 0.5, 50.93)
    place(buf, sparkle(1.2, 30, False, 8) * 0.3, 51.0)
    # cut-away laser, bars, crown
    place(buf, sweep(0.5, 2400, 600) * 0.22, 54.4)
    place(buf, sweep(0.6, 400, 900) * 0.15, 56.9)
    place(buf, sweep(0.6, 500, 1600) * 0.18, 57.84)
    place(buf, chime((88, 91, 96)) * 0.3, 58.78)
    # into the crystals
    place(buf, whoosh(0.8, 300, 5000, rev=True) * 0.25, 59.0)
    r = np.random.default_rng(64)
    tt = 63.44
    while tt < 64.95:
        place(buf, pluck_bell(midi(int(84 + r.integers(0, 12))), 0.4) * 0.12, tt, pan=float(r.uniform(-0.6, 0.6)))
        tt += 0.05 + r.random() * 0.06
    place(buf, sparkle(1.0, 24, False, 11) * 0.3, 64.6)
    # crack
    place(buf, crackle() * 0.35, 69.3)
    place(buf, nope() * 0.25, 70.0)
    # brushing
    place(buf, scrub(2.6) * 0.18, 72.8)
    place(buf, pluck_bell(midi(84), 1.2) * 0.3, 74.14)
    place(buf, pluck_bell(midi(76), 1.2) * 0.3, 74.58)
    place(buf, sparkle(0.6, 14, False, 12) * 0.22, 74.9)
    # finale
    place(buf, crash(1.5, 3) * 0.12, 75.56)
    place(buf, sparkle(1.0, 24, False, 13) * 0.3, 75.6)
    place(buf, sparkle(1.0, 24, False, 14) * 0.3, 80.85)
    # cut whooshes
    for at in (17.45, 26.95, 32.75, 37.0, 41.55, 46.1, 52.15, 68.0, 72.2, 78.72):
        place(buf, whoosh(0.5) * 0.25, at - 0.25)
    # label pops
    for at in (0.15, 0.45, 4.1, 7.83, 8.9, 10.01, 12.9, 13.3, 13.7, 14.43, 19.84, 21.32, 21.6, 24.5, 25.8, 27.13, 28.0, 30.02, 30.9,
               32.85, 34.54, 35.51, 37.75, 40.48, 41.04, 43.08, 44.71, 46.62, 47.8, 52.19, 52.4, 52.7, 54.18, 55.9, 62.1, 63.98, 65.5,
               66.56, 69.56, 71.22, 72.24, 76.6, 76.98, 78.9, 79.2, 79.5, 81.15, 81.35, 81.55):
        place(buf, pop() * 0.3, at, pan=float(rs.uniform(-0.3, 0.3)))
    return buf


def load_narration():
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", os.path.join(HERE, "audio", "narration.mp3"), "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"], check=True, capture_output=True).stdout
    v = np.frombuffer(raw, dtype=np.float32).astype(np.float64)
    out = np.zeros(N)
    out[: min(N, len(v))] = v[:N]
    return out


def duck_gain(voice):
    # envelope follower on the narration -> gain curve for the music
    e = np.abs(voice)
    e = onepole(e, 8)
    talking = np.clip((20 * np.log10(e + 1e-6) + 42) / 12, 0, 1)
    talking = onepole(talking, 2.5)
    return 1 - 0.55 * talking  # about -7 dB under speech


def write_wav(path, buf):
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "2", "-i", "-", "-c:a", "pcm_s24le", path], input=buf.astype(np.float32).tobytes(), check=True)


def main():
    os.makedirs(os.path.join(OUT, "stems"), exist_ok=True)
    voice = load_narration()
    m = music() * duck_gain(voice)[:, None]
    a = ambience()
    s = sfx()
    v = np.stack([voice, voice], 1)
    for name, b in (("music", m), ("ambience", a), ("sfx", s)):
        write_wav(os.path.join(OUT, "stems", name + ".wav"), b)
    mix = v * 1.0 + m * 0.55 + a * 0.5 + s * 0.55
    mix /= max(1.0, np.abs(mix).max() / 0.95)
    pre = os.path.join(OUT, "stems", "premix.wav")
    write_wav(pre, mix)
    # two-pass EBU R128 loudness normalisation to -14 LUFS, -1.5 dBTP
    import json
    r = subprocess.run(["ffmpeg", "-hide_banner", "-i", pre, "-af", "loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json", "-f", "null", "-"], capture_output=True, text=True)
    js = json.loads(r.stderr[r.stderr.rindex("{") :])
    af = (f"loudnorm=I=-14:TP=-1.5:LRA=11:measured_I={js['input_i']}:measured_TP={js['input_tp']}:"
          f"measured_LRA={js['input_lra']}:measured_thresh={js['input_thresh']}:offset={js['target_offset']}:linear=true")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", pre, "-af", af + ",aresample=48000", "-c:a", "pcm_s24le", os.path.join(OUT, "mix.wav")], check=True)
    print("wrote", os.path.join(OUT, "mix.wav"))


if __name__ == "__main__":
    sys.exit(main())
