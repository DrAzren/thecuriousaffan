#!/usr/bin/env python3
"""Soundtrack for Episode 007, synthesised from scratch (no samples, no
licensed music) and mixed under the narration.

Layers: an original playful music bed (sunny park, dreamy microscopic skin
world, bright bathroom/living room, outro jingle), park and microscopic
ambiences, gentle shower water, and child-friendly SFX: football bounces, a
funny sniff, the magic shrink, bubbles and soap foam, rinsing water, discovery
chimes and sparkles. The music is ducked under the voice and the final mix is
normalised to -14 LUFS / -1.5 dBTP for social platforms.

    python3 build_audio.py            # -> output/mix.wav (+ stems in output/stems)
Requires numpy and ffmpeg.
"""
import os
import subprocess
import sys

import numpy as np

SR = 44100
DUR = 45.5
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "output")
N = int(SR * DUR)
rs = np.random.default_rng(7)


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


def bloop(f0=300, f1=900, dur=0.09):
    """Soft bubble pop: quick upward sine chirp."""
    t = T(dur)
    f = f0 * (f1 / f0) ** (t / dur)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * t / dur) ** 0.6 * np.exp(-t * 18)


def thump(f0=140, f1=55, dur=0.22):
    """Football bounce / soft landing."""
    t = T(dur)
    f = f0 * (f1 / f0) ** (t / dur)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 22)
    click = rs.standard_normal(len(t)) * np.exp(-t * 180) * 0.35
    return body + onepole(click, 2500)


def sniff(dur=0.2):
    x = rs.standard_normal(int(dur * SR))
    y = svf(x, 1800, 4200, q=1.4)
    e = np.sin(np.linspace(0, np.pi, len(y))) ** 1.5
    y = y * e
    return y / (np.abs(y).max() + 1e-9)


def zwoop(f0=1400, f1=140, dur=0.75):
    """Magic shrink (down) or grow (up) slide."""
    t = T(dur)
    f = f0 * (f1 / f0) ** (t / dur) * (1 + 0.02 * np.sin(2 * np.pi * 18 * t))
    ph = 2 * np.pi * np.cumsum(f) / SR
    return (np.sin(ph) + 0.3 * np.sin(2 * ph)) * np.sin(np.pi * t / dur) ** 0.7


def wah(dur=0.7):
    """Comedic 'stinky' low wobble."""
    t = T(dur)
    f = 260 * (0.7 ** (t / dur)) * (1 + 0.06 * np.sin(2 * np.pi * 7 * t))
    ph = 2 * np.pi * np.cumsum(f) / SR
    y = np.sin(ph) + 0.4 * np.sin(2 * ph) + 0.2 * np.sin(3 * ph)
    return y * env_adsr(len(t), 0.02, 0.1, 0.8, 0.25)


def water(dur, f0=700, f1=2600, seed=3):
    r = np.random.default_rng(seed)
    x = r.standard_normal(int(dur * SR))
    y = svf(x, f0, f1, q=0.9)
    y += 0.5 * svf(r.standard_normal(len(x)), 300, 900, q=0.7)
    return y / (np.abs(y).max() + 1e-9)


def chirp_bird(f=3200):
    t = T(0.12)
    ff = f * (1 + 0.35 * np.sin(np.pi * t / 0.12))
    return np.sin(2 * np.pi * np.cumsum(ff) / SR) * np.sin(np.pi * t / 0.12) ** 2


def bubble_field(buf, a, b, rate, gain, seed, f_lo=250, f_hi=700, pan=0.5):
    r = np.random.default_rng(seed)
    tt = a
    while tt < b:
        f0 = f_lo + r.random() * (f_hi - f_lo)
        place(buf, bloop(f0, f0 * (2.2 + r.random()), 0.06 + r.random() * 0.06) * gain * (0.5 + 0.5 * r.random()), tt, pan=float(r.uniform(-pan, pan)))
        tt += r.exponential(1 / rate)


# ------------------------------------------------------------------ layers
# Scene boundaries (seconds), matching episode.js
PARK0, SKIN0, SOAP0, RINSE0, GOOD0, BATH0, LIVE0, OUT0 = 0.0, 9.5, 22.1, 25.62, 27.6, 30.55, 38.02, 42.3


def music():
    buf = np.zeros((N, 2))
    bpm = 112
    beat = 60 / bpm
    bar = beat * 4
    # C  G  Am  F  (I V vi IV) in C major
    chords = [(48, [60, 64, 67]), (43, [59, 62, 67]), (45, [57, 60, 64]), (41, [57, 60, 65])]
    arp = [0, 1, 2, 1, 0, 2, 1, 2]

    def band(t0, t1, style):
        i = 0
        t = t0
        while t < t1 - 0.05:
            root, ch = chords[i % 4]
            if style == "park":  # bright, bouncy
                place(buf, pad([midi(n) for n in ch], bar + 0.5) * 0.09, t)
                for k in range(8):
                    if t + k * beat / 2 < t1:
                        place(buf, marimba(midi(ch[arp[k]] + 12)) * 0.2, t + k * beat / 2, pan=-0.3 + 0.08 * k)
                for k in (0, 2):
                    place(buf, bass(midi(root - 12) if k == 0 else midi(root - 5), 0.5) * 0.32, t + k * beat)
                for k in range(8):
                    place(buf, shaker() * (0.5 if k % 2 else 0.3), t + k * beat / 2, pan=0.4)
            elif style == "micro":  # dreamy, curious
                place(buf, pad([midi(n) for n in ch], bar + 0.6) * 0.15, t)
                for k, step in enumerate([0, 2, 1, 2]):
                    place(buf, musicbox(midi(ch[step] + 12)) * 0.12, t + k * beat, pan=0.3 * ((k % 2) * 2 - 1))
                place(buf, bass(midi(root - 12), 1.2) * 0.2, t)
            elif style == "soap":  # bubbly, busier
                place(buf, pad([midi(n) for n in ch], bar + 0.5) * 0.11, t)
                for k in range(8):
                    place(buf, marimba(midi(ch[arp[k]] + 12)) * 0.17, t + k * beat / 2, pan=-0.35 + 0.1 * k)
                    place(buf, musicbox(midi(ch[arp[(k + 2) % 8]] + 24), 0.6) * 0.05, t + k * beat / 2 + beat / 4, pan=0.4)
                for k in (0, 2):
                    place(buf, bass(midi(root - 12) if k == 0 else midi(root - 5), 0.5) * 0.3, t + k * beat)
                for k in range(8):
                    place(buf, shaker() * (0.45 if k % 2 else 0.25), t + k * beat / 2, pan=0.4)
            else:  # "home": warm and bright
                place(buf, pad([midi(n) for n in ch], bar + 0.5) * 0.12, t)
                for k in range(4):
                    place(buf, marimba(midi(ch[[0, 2, 1, 2][k]] + 12)) * 0.16, t + k * beat, pan=0.25 * ((k % 2) * 2 - 1))
                    place(buf, pluck_bell(midi(ch[[2, 1, 0, 1][k]] + 24), 0.8) * 0.035, t + k * beat + beat / 2, pan=-0.3)
                place(buf, bass(midi(root - 12), 0.9) * 0.26, t)
                for k in range(4):
                    place(buf, shaker() * 0.3, t + k * beat + beat / 2, pan=0.4)
            t += bar
            i += 1

    band(PARK0, SKIN0, "park")
    band(SKIN0, SOAP0, "micro")
    band(SOAP0, GOOD0, "soap")
    band(GOOD0, BATH0, "micro")
    band(BATH0, OUT0, "home")
    # outro jingle: a short original motif on bells, then the home chord
    motif = [72, 76, 79, 81, 79, 84]
    for k, m in enumerate(motif):
        place(buf, pluck_bell(midi(m), 1.6) * 0.17, OUT0 + 0.15 + k * 0.16, pan=-0.3 + 0.12 * k)
        place(buf, marimba(midi(m - 12)) * 0.12, OUT0 + 0.15 + k * 0.16)
    place(buf, pad([midi(n) for n in (48, 60, 64, 67, 72)], 3.0) * 0.22, OUT0 + 1.1)
    place(buf, bass(midi(36), 2.2) * 0.3, OUT0 + 1.1)
    for k, m in enumerate([84, 88, 91, 96]):
        place(buf, pluck_bell(midi(m), 2.0) * 0.08, OUT0 + 1.15 + k * 0.09, pan=0.3 - 0.2 * k)
    fade = int(1.0 * SR)
    buf[-fade:] *= np.linspace(1, 0, fade)[:, None]
    return buf


def ambience():
    buf = np.zeros((N, 2))
    # park: gentle breeze + distant birds
    breeze = onepole(rs.standard_normal(int((SKIN0 + 0.5) * SR)), 400)
    breeze /= np.abs(breeze).max()
    breeze *= np.linspace(1, 0.2, len(breeze)) ** 0.5
    place(buf, breeze * 0.35, 0.0, pan=-0.2)
    r = np.random.default_rng(12)
    tt = 0.4
    while tt < SKIN0 - 0.6:
        f = 2600 + r.random() * 1600
        for k in range(1 + int(r.random() * 3)):
            place(buf, chirp_bird(f * (1 + 0.08 * k)) * 0.12, tt + k * 0.13, pan=float(r.uniform(-0.8, 0.8)))
        tt += 0.9 + r.random() * 1.3
    # micro world: soft bubbly ambience
    bubble_field(buf, SKIN0, BATH0 - 0.3, 3.5, 0.12, 21)
    # bathroom: shower water bed (softer on the soap close-up)
    shower = water(LIVE0 - BATH0 + 0.4, 1800, 2200, seed=9)
    shower = shower - onepole(shower, 300)
    lvl = np.ones(len(shower))
    t = np.arange(len(shower)) / SR + BATH0
    lvl *= np.clip((t - BATH0) / 0.4, 0, 1) * np.clip((LIVE0 + 0.4 - t) / 0.4, 0, 1)
    lvl *= np.where((t > 32.75) & (t < 34.95), 0.55, 1.0)
    place(buf, shower * lvl * 0.3, BATH0, pan=-0.3)
    return buf


def sfx():
    buf = np.zeros((N, 2))
    # S1: football bounces, hop landing, sweat drops, sniff, surprise
    for at, g in ((0.35, 0.5), (0.95, 0.35), (1.38, 0.22), (1.64, 0.12), (1.8, 0.07)):
        place(buf, thump() * g, at, pan=0.35)
    place(buf, thump(110, 50, 0.18) * 0.25, 0.6)
    for at in (3.2, 3.4, 3.6):
        place(buf, bloop(600, 1500, 0.08) * 0.22, at, pan=float(rs.uniform(-0.3, 0.3)))
    place(buf, sniff(0.18) * 0.32, 4.98)
    place(buf, sniff(0.24) * 0.36, 5.2)
    place(buf, boing() * 0.22, 5.55)
    place(buf, pop(1200, 600, 0.1) * 0.3, 5.58)
    # S2: magnifier appears, magic swirl, shrink
    place(buf, sparkle(0.5, 12, True, 4) * 0.25, 6.45)
    place(buf, sparkle(1.1, 30, True, 5) * 0.28, 8.15)
    place(buf, zwoop(1400, 140, 0.8) * 0.2, 8.55)
    place(buf, whoosh(0.9, 300, 6000, rev=True) * 0.25, 8.6)
    place(buf, sparkle(0.6, 20, False, 6) * 0.3, 9.45)
    # S3-S4: labels, friendly bacteria, odour
    for at in (9.56, 11.0, 11.76, 12.42, 14.92, 16.14, 16.9, 17.18, 19.0, 21.22, 22.18, 22.6, 23.68, 24.24, 25.1, 26.6):
        place(buf, pop() * 0.3, at, pan=float(rs.uniform(-0.3, 0.3)))
    for k, at in enumerate((13.45, 13.62, 13.8, 14.0)):
        place(buf, bloop(500 + 120 * k, 1300 + 200 * k, 0.1) * 0.22, at, pan=-0.4 + 0.25 * k)
    for at in (13.3, 15.6, 19.85, 22.1):
        place(buf, whoosh(0.45) * 0.25, at - 0.22)
    bubble_field(buf, 17.6, 19.5, 7, 0.16, 31, 150, 350)  # munching sweat
    place(buf, wah() * 0.22, 19.15)
    # S5: soap bubbles, foam, micelles lifting, rinse
    bubble_field(buf, 19.95, 21.6, 5, 0.22, 41, 220, 500)
    bubble_field(buf, 22.2, 25.6, 9, 0.18, 42, 400, 1100)
    for at in (23.7, 24.4, 25.3):
        place(buf, chime((88, 93), 0.06) * 0.2, at)
    rinse = water(2.6, 500, 2600, seed=5)
    place(buf, rinse * np.sin(np.linspace(0, np.pi, len(rinse))) ** 0.8 * 0.4, RINSE0 - 0.1)
    place(buf, whoosh(1.2, 300, 3000) * 0.3, RINSE0)
    bubble_field(buf, 25.8, 27.6, 12, 0.14, 43, 300, 800)
    # S6: discovery chime + hearts
    place(buf, chime((79, 84, 88, 91)) * 0.35, 27.7)
    place(buf, chime((84, 88, 91, 96), 0.07) * 0.3, 29.3)
    place(buf, sparkle(0.8, 16, False, 7) * 0.22, 29.35)
    # back to normal size
    place(buf, sparkle(0.6, 20, True, 8) * 0.25, 29.95)
    place(buf, zwoop(200, 1300, 0.55) * 0.18, 30.15)
    place(buf, whoosh(0.6, 2500, 300) * 0.3, 30.35)
    # S7: bathroom foam bubbles, checklist dings
    bubble_field(buf, 32.8, 34.9, 4, 0.16, 51, 350, 800)
    place(buf, sparkle(0.6, 12, False, 9) * 0.18, 33.4)
    for at in (32.75, 34.95, 36.05, 37.2):
        place(buf, whoosh(0.4, 400, 2500) * 0.18, at - 0.18)
    for at in (34.98, 35.76, 37.14):
        place(buf, pop(900, 500, 0.08) * 0.25, at)
        place(buf, chime((91, 96), 0.05) * 0.18, at + 0.04)
    # S8: fresh and clean, thumbs-up, what next?
    place(buf, whoosh(0.6, 2500, 300) * 0.25, LIVE0 - 0.3)
    place(buf, sparkle(1.0, 24, False, 10) * 0.3, LIVE0 + 0.05)
    place(buf, thump(110, 50, 0.18) * 0.22, 38.5)
    place(buf, chime((86, 91)) * 0.28, 38.9)
    place(buf, pop() * 0.3, 39.86)
    place(buf, chime((84, 88, 91, 96), 0.06) * 0.25, 39.9)
    for at in (40.6, 40.9, 41.2):
        place(buf, pop() * 0.28, at, pan=float(rs.uniform(-0.3, 0.3)))
    # outro
    place(buf, sparkle(1.0, 24, False, 11) * 0.3, OUT0)
    for at in (42.6, 42.8, 43.0, 43.5):
        place(buf, pop() * 0.28, at)
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
    mix = v * 1.0 + m * 0.55 + a * 0.45 + s * 0.55
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
