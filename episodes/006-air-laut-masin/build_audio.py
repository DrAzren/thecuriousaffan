#!/usr/bin/env python3
"""Soundtrack for Episode 006, synthesised from scratch (no samples, no
licensed music) and mixed under the narration.

Layers: cheerful original tropical music bed (marimba, steel-pan style bells,
bass, shaker), beach waves, rain, river and underwater ambience, splashes,
magic whooshes and sparkles, bubbles, label pops and discovery chimes. The
music is ducked under the voice and the final mix is normalised to
-14 LUFS / -1.5 dBTP for social platforms.

    python3 build_audio.py            # -> output/mix.wav (+ stems in output/stems)
Requires numpy and ffmpeg.
"""
import os
import subprocess
import sys

import numpy as np

SR = 44100
DUR = 47.5
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "output")
N = int(SR * DUR)
rs = np.random.default_rng(6)


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



def steelpan(f, dur=0.9):
    t = T(dur)
    y = (np.sin(2 * np.pi * f * t) + 0.45 * np.sin(2 * np.pi * 2.0 * f * t) * np.exp(-t * 4) + 0.3 * np.sin(2 * np.pi * 3.02 * f * t) * np.exp(-t * 7)) * np.exp(-t * 4.2)
    y[: int(0.003 * SR)] *= np.linspace(0, 1, int(0.003 * SR))
    return y


def splash_sfx(dur=0.9, big=1.0):
    n = int(dur * SR)
    x = rs.standard_normal(n)
    y = svf(x, 3500, 900, q=0.6) * 0.6 + svf(rs.standard_normal(n), 6000, 2500, q=0.8) * 0.4
    t = np.arange(n) / SR
    e = (1 - np.exp(-t * 80)) * np.exp(-t * (4.5 / big))
    drops = np.zeros(n)
    r = np.random.default_rng(int(big * 100))
    for i in range(int(14 * big)):
        k = int(r.uniform(0.05, dur * 0.8) * SR)
        f = r.uniform(900, 2400)
        d = T(0.05)
        s = np.sin(2 * np.pi * (f + 6000 * d) * d) * np.exp(-d * 70)
        drops[k : k + len(s)] += s[: n - k] * 0.4
    y = y * e + drops
    return y / (np.abs(y).max() + 1e-9)


def bubbles(dur=0.8, n=12, seed=1):
    r = np.random.default_rng(seed)
    out = np.zeros(int((dur + 0.2) * SR))
    for i in range(n):
        at = r.uniform(0, dur)
        f0 = r.uniform(300, 900)
        t = T(0.09)
        s = np.sin(2 * np.pi * np.cumsum(f0 * (1 + 6 * t)) / SR) * np.exp(-t * 40) * np.sin(np.pi * t / 0.09)
        k = int(at * SR)
        out[k : k + len(s)] += s[: len(out) - k]
    return out / (np.abs(out).max() + 1e-9)


def rattle(dur=1.4, rate=14):
    out = np.zeros(int((dur + 0.2) * SR))
    k = 0.0
    while k < dur:
        s = shaker(0.05) * 3
        i = int(k * SR)
        out[i : i + len(s)] += s[: len(out) - i]
        k += 1 / rate
    return out / (np.abs(out).max() + 1e-9)


# ------------------------------------------------------------------ layers
def music():
    buf = np.zeros((N, 2))
    bpm = 108
    beat = 60 / bpm
    bar = beat * 4
    # C  G  Am  F  (I V vi IV) in C major, bright and sunny
    chords = [(48, [64, 67, 72]), (43, [62, 67, 71]), (45, [64, 69, 72]), (41, [65, 69, 72])]
    arp_pat = [0, 1, 2, 1, 0, 2, 1, 2]
    melody = [79, 76, 77, 79, 81, 79, 76, 74, 76, 72, 74, 76, 77, 76, 74, 72]

    def section(a, b, full=1.0, mel=True, under=False):
        t0, i = a, 0
        while t0 < b - 0.05:
            root, ch = chords[i % 4]
            place(buf, pad([midi(n) for n in ch], bar + 0.6) * (0.1 if not under else 0.16), t0)
            for k in range(8):
                n = ch[arp_pat[k]] + 12
                place(buf, marimba(midi(n)) * 0.17 * full, t0 + k * beat / 2, pan=-0.35 + 0.1 * k)
            if full > 0.6:
                for k in (0, 2):
                    place(buf, bass(midi(root - 12) if k == 0 else midi(root - 5), 0.6) * 0.3, t0 + k * beat)
                if not under:
                    for k in range(8):
                        place(buf, shaker() * (0.5 if k % 2 else 0.3), t0 + k * beat / 2, pan=0.4)
            if mel:
                for k in range(4):
                    m = melody[(i * 4 + k) % len(melody)]
                    place(buf, steelpan(midi(m)) * 0.09, t0 + k * beat + (beat / 2 if k % 2 else 0), pan=0.2)
            t0 += bar
            i += 1

    section(0.0, 7.75, full=0.5, mel=False)       # beach intro: light
    section(7.75, 20.4, full=1.0)                 # adventure: mountain + river
    section(20.4, 24.45, full=0.4, mel=False, under=True)  # underwater: soft
    section(24.45, 38.2, full=1.0)                # surface + diagram
    section(38.2, 42.75, full=0.7, mel=True)      # back on the beach
    # outro sting: C major with bells
    place(buf, pad([midi(n) for n in (48, 60, 64, 67, 72)], 3.4) * 0.2, 42.75)
    for k, m in enumerate([72, 76, 79, 84]):
        place(buf, pluck_bell(midi(m), 2.5) * 0.12, 42.8 + k * 0.12, pan=-0.3 + 0.2 * k)
    place(buf, bass(midi(36), 2.0) * 0.3, 42.75)
    fade = int(1.2 * SR)
    buf[-fade:] *= np.linspace(1, 0, fade)[:, None]
    return buf


def ambience():
    buf = np.zeros((N, 2))
    t = np.arange(N) / SR
    # beach waves: slow swells of filtered noise
    wn = rs.standard_normal(N)
    waves = onepole(wn, 700) - onepole(wn, 120)
    waves *= 0.35 + 0.65 * (0.5 + 0.5 * np.sin(2 * np.pi * 0.16 * t)) ** 2
    waves /= np.abs(waves).max()
    # rain: bright hiss with random drop ticks
    rn = rs.standard_normal(N)
    rain = rn - onepole(rn, 2500)
    rain /= np.abs(rain).max()
    # river: bubbly band-passed noise with fast modulation
    rv = svf(rs.standard_normal(N), 900, 900, q=0.9)
    rv *= 0.6 + 0.4 * np.sin(2 * np.pi * 5.3 * t) * np.sin(2 * np.pi * 1.7 * t)
    rv /= np.abs(rv).max()
    # underwater: deep muffled rumble
    uw = onepole(rs.standard_normal(N), 160)
    uw /= np.abs(uw).max()

    def level(spans):
        lvl = np.zeros(N)
        for a, b, g in spans:
            lvl[int(a * SR) : int(b * SR)] = g
        return onepole(lvl, 3)

    mix = waves[:, None] * level([(0, 7.75, 1.0), (24.45, 27.0, 0.9), (27.0, 38.2, 0.25), (38.2, 47.5, 0.9)])[:, None]
    mix += rain[:, None] * level([(7.75, 14.4, 0.55), (14.4, 17.0, 0.25), (17.7, 20.4, 0.15)])[:, None] * 0.6
    mix += rv[:, None] * level([(10.15, 14.4, 0.3), (14.4, 20.4, 1.0)])[:, None] * 0.7
    mix += uw[:, None] * level([(20.4, 24.45, 1.0)])[:, None] * 1.2
    buf += mix
    buf[:, 1] = np.roll(buf[:, 1], 41)
    # rain drops on rocks
    tt = 8.0
    r = np.random.default_rng(3)
    while tt < 14.4:
        place(buf, pop(r.uniform(1800, 3200), 900, 0.03) * 0.25, tt, pan=float(r.uniform(-0.6, 0.6)))
        tt += r.uniform(0.05, 0.16)
    # underwater bubble trickles
    for at in np.arange(20.6, 24.3, 0.7):
        place(buf, bubbles(0.5, 6, int(at * 10)) * 0.25, at, pan=float(rs.uniform(-0.5, 0.5)))
    return buf


def sfx():
    buf = np.zeros((N, 2))
    place(buf, splash_sfx(0.9, 1.0) * 0.55, 0.0)               # hook splash
    place(buf, boing() * 0.2, 0.95)                             # MASIN! burst
    place(buf, rattle(1.4) * 0.22, 4.36, pan=-0.4)              # salt shaker
    place(buf, pop(500, 900, 0.18) * 0.3, 4.98, pan=-0.3)       # crab pops up
    place(buf, sparkle(0.5, 12, True, 9) * 0.2, 5.9)
    place(buf, splash_sfx(1.3, 1.6) * 0.55, 6.0, pan=-0.3)     # sub rises
    place(buf, sparkle(1.1, 30, True, 2) * 0.32, 6.65)          # magic swirl
    place(buf, whoosh(1.0, 300, 6000, rev=True) * 0.3, 6.95)    # magic transition
    place(buf, sparkle(0.6, 20, False, 3) * 0.3, 7.7)
    for at in (10.15, 14.4, 27.0, 38.2):
        place(buf, whoosh(0.5) * 0.33, at - 0.25)
    place(buf, whoosh(1.1, 200, 5000) * 0.33, 17.5)             # crane up to the map
    place(buf, bubbles(0.7, 26, 5) * 0.4, 20.15)                # dive
    place(buf, whoosh(0.6, 2500, 300) * 0.3, 20.1)
    place(buf, bubbles(0.5, 14, 6) * 0.35, 24.3)                # surface
    place(buf, splash_sfx(1.0, 1.3) * 0.5, 24.5)
    # label pops
    for at in (0.12, 0.5, 3.94, 4.66, 6.2, 8.54, 9.62, 10.22, 12.32, 16.14, 17.8, 18.6, 19.72, 22.34, 27.1, 29.38, 31.0, 32.34,
               33.95, 34.3, 34.65, 39.68, 40.62, 40.96, 41.44, 43.05, 43.25, 43.45, 43.9):
        place(buf, pop() * 0.3, at, pan=float(rs.uniform(-0.3, 0.3)))
    # tick-tock of the time-lapse clock
    for k, at in enumerate(np.arange(20.55, 22.1, 0.18)):
        place(buf, pop(2400 if k % 2 else 1900, 1500, 0.04) * 0.18, at)
    # salt tries to rise and is stopped
    for i, at in enumerate((32.95, 33.1, 33.25)):
        place(buf, boing(0.3) * 0.12, at, pan=-0.3 + 0.3 * i)
    place(buf, nope() * 0.28, 33.0)
    # rising vapour shimmer
    place(buf, sparkle(1.6, 24, True, 11) * 0.16, 28.6)
    # discovery chimes
    place(buf, chime((84, 88, 91)) * 0.3, 12.32)
    place(buf, chime((79, 84, 88, 91)) * 0.3, 22.34)
    place(buf, chime((84, 88, 91, 96), 0.07) * 0.32, 31.08)
    place(buf, chime((84, 88, 91, 96), 0.07) * 0.42, 37.26)
    place(buf, sparkle(0.9, 22, False, 6) * 0.28, 37.3)
    place(buf, chime((86, 91)) * 0.28, 39.7)
    place(buf, sparkle(0.6, 14, False, 7) * 0.22, 39.1)
    place(buf, whoosh(0.6, 400, 4000) * 0.25, 42.55)
    place(buf, sparkle(1.0, 24, False, 8) * 0.3, 42.8)
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
    mix = v * 1.0 + m * 0.55 + a * 0.18 + s * 0.55
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
