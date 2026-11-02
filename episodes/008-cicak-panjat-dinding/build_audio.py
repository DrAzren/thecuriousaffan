#!/usr/bin/env python3
"""Soundtrack for Episode 008, synthesised from scratch (no samples, no
licensed music) and mixed under the narration.

Layers: gentle original music bed (night music-box in the living room, a
wondering marimba band in the microscopic world, a half-time slow-motion
section for the toe peel, the cheerful outro jingle), soft room/micro
ambience, and sound effects: funny surprise boing, tiny gecko footsteps,
magical shrinking whoosh and sparkles, discovery chimes, shimmering contact
points, gentle peeling and release, realisation pops. Nothing harsh or scary.
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
DUR = 47.4
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "output")
N = int(SR * DUR)
rs = np.random.default_rng(8)


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


# ------------------------------------------------------------------ layers
CUTS = [2.0, 3.6, 5.3, 7.0, 15.5, 19.4, 23.65, 28.0, 31.85, 38.45, 40.45]


def music():
    buf = np.zeros((N, 2))
    bpm = 100
    beat = 60 / bpm
    bar = beat * 4
    # G  Em  C  D  (I vi IV V) in G major
    chords = [(43, [67, 71, 74]), (40, [64, 67, 71]), (36, [64, 67, 72]), (38, [66, 69, 74])]
    arp = [0, 1, 2, 1, 0, 2, 1, 2]

    def section(t0, t1, kind):
        i = 0
        while t0 < t1 - 0.05:
            root, ch = chords[i % 4]
            if kind == "room":
                place(buf, pad([midi(n) for n in ch], bar + 0.6) * 0.14, t0)
                for k, step in enumerate([0, 2, 1, 2]):
                    place(buf, musicbox(midi(ch[step] + 12)) * 0.12, t0 + k * beat, pan=0.3 * ((k % 2) * 2 - 1))
                place(buf, bass(midi(root - 12), 0.8) * 0.2, t0)
            elif kind == "micro":
                place(buf, pad([midi(n) for n in ch], bar + 0.6) * 0.12, t0)
                for k in range(8):
                    place(buf, marimba(midi(ch[arp[k]] + 12)) * 0.17, t0 + k * beat / 2, pan=-0.35 + 0.1 * k)
                place(buf, bass(midi(root - 12), 0.6) * 0.28, t0)
                place(buf, bass(midi(root - 5), 0.6) * 0.22, t0 + 2 * beat)
                for k in range(8):
                    place(buf, shaker() * (0.45 if k % 2 else 0.25), t0 + k * beat / 2, pan=0.4)
            elif kind == "slow":  # half-time for the slow-motion peel
                place(buf, pad([midi(n) for n in ch], bar * 2 + 0.6) * 0.14, t0)
                for k in range(4):
                    place(buf, musicbox(midi(ch[[0, 2, 1, 2][k]] + 12), 2.0) * 0.12, t0 + k * beat * 2, pan=0.25 * ((k % 2) * 2 - 1))
                place(buf, bass(midi(root - 12), 1.6) * 0.22, t0)
                t0 += bar  # each chord lasts two bars
            elif kind == "happy":
                place(buf, pad([midi(n) for n in ch], bar + 0.6) * 0.12, t0)
                for k in range(8):
                    place(buf, marimba(midi(ch[arp[(k + 2) % 8]] + 12)) * 0.16, t0 + k * beat / 2, pan=0.3 * ((k % 2) * 2 - 1))
                place(buf, bass(midi(root - 12), 0.5) * 0.28, t0)
                place(buf, bass(midi(root - 12), 0.5) * 0.22, t0 + 2 * beat)
                for k in range(4):
                    place(buf, shaker() * 0.35, t0 + k * beat + beat / 2, pan=-0.3)
            t0 += bar
            i += 1

    section(0.0, 8.35, "room")
    section(9.7, 31.85, "micro")
    section(31.85, 35.3, "slow")
    section(35.3, 42.75, "happy")
    # outro jingle: a short original bell tune over a final G major chord
    tune = [(0.0, 79), (0.16, 83), (0.32, 86), (0.48, 91), (0.8, 88), (0.96, 86), (1.12, 91)]
    for at, m in tune:
        place(buf, pluck_bell(midi(m), 1.6) * 0.14, 42.85 + at, pan=-0.3 + 0.1 * (m - 79) / 3)
    place(buf, pad([midi(n) for n in (55, 67, 71, 74, 79)], 4.0) * 0.2, 42.75)
    place(buf, bass(midi(43), 2.4) * 0.3, 42.75)
    for k, m in enumerate([79, 83, 86, 91]):
        place(buf, marimba(midi(m)) * 0.16, 44.2 + k * 0.15)
    fade = int(1.3 * SR)
    buf[-fade:] *= np.linspace(1, 0, fade)[:, None]
    return buf


def ambience():
    buf = np.zeros((N, 2))
    t = np.arange(N) / SR
    # soft night crickets outside the living-room window
    cr = np.zeros(N)
    for start in np.arange(0.3, DUR, 1.3):
        for k in range(3):
            a = int((start + k * 0.07) * SR)
            n = int(0.04 * SR)
            if a + n < N:
                tt = np.arange(n) / SR
                cr[a:a + n] += np.sin(2 * np.pi * 4300 * tt) * np.sin(np.pi * tt / 0.04) ** 2
    # airy micro-world shimmer: band-passed noise with a slow swell
    air = svf(rs.standard_normal(N), 2500, 2500, q=0.6)
    air /= np.abs(air).max()
    air *= 0.6 + 0.4 * np.sin(2 * np.pi * 0.15 * t)
    room = np.zeros(N)
    micro = np.zeros(N)
    for a, b in [(0, 8.6), (35.3, 42.75)]:
        room[int(a * SR):int(b * SR)] = 1
    micro[int(9.7 * SR):int(35.3 * SR)] = 1
    room = onepole(room, 4)
    micro = onepole(micro, 3)
    mono = cr * 0.12 * room + air * 0.25 * micro
    buf[:, 0] = mono
    buf[:, 1] = np.roll(mono, 41)
    return buf


def tick(dur=0.03):
    t = T(dur)
    return np.sin(2 * np.pi * 2600 * t) * np.exp(-t * 180) * 0.6 + rs.standard_normal(len(t)) * np.exp(-t * 300) * 0.2


def shimmer(dur, n, f0=3000, f1=7000, seed=1, grow=True):
    """Many tiny soft tinkles; density rises over time when grow=True."""
    r = np.random.default_rng(seed)
    out = np.zeros(int((dur + 0.5) * SR))
    for i in range(n):
        u = r.random()
        at = (u ** 0.5 if grow else u) * dur
        f = f0 + r.random() * (f1 - f0)
        tt = T(0.25)
        s = np.sin(2 * np.pi * f * tt) * np.exp(-tt * 30) * (0.4 + 0.6 * r.random())
        k = int(at * SR)
        out[k:k + len(s)] += s[:len(out) - k]
    return out / (np.abs(out).max() + 1e-9)


def peel_sound(dur=2.7):
    """Gentle sticky peel: soft crackle that rises slightly in pitch, not harsh."""
    n = int(dur * SR)
    x = rs.standard_normal(n) * (rs.random(n) < 0.05)
    y = svf(x, 900, 2600, q=1.2)
    e = np.sin(np.linspace(0, np.pi, n)) ** 0.8
    y = y * e
    return y / (np.abs(y).max() + 1e-9)


def zip_up(dur=0.35, f0=600, f1=2400):
    x = rs.standard_normal(int(dur * SR))
    y = svf(x, f0, f1, q=2.0)
    y *= np.sin(np.linspace(0, np.pi, len(y))) ** 1.5
    return y / (np.abs(y).max() + 1e-9)


def slide(f0, f1, dur):
    t = T(dur)
    f = f0 * (f1 / f0) ** (t / dur)
    y = np.sin(2 * np.pi * np.cumsum(f) / SR) + 0.3 * np.sin(4 * np.pi * np.cumsum(f) / SR)
    return y * np.sin(np.pi * t / dur) ** 0.7


def ease_in_out(k):
    return 4 * k ** 3 if k < 0.5 else 1 - (-2 * k + 2) ** 3 / 2


def peel_times():
    """When each lamella lets go (mirrors buildToe().peel and shot S5b)."""
    out = []
    for i in range(12):
        s = 0.4 + (i / 11) * 0.52
        need = (1 - s + 0.06) / 1.05  # peel amount where the lamella starts lifting
        for j in range(400):
            t = 32.0 + j * (2.7 / 400)
            if ease_in_out((t - 32.0) / 2.7) >= need:
                out.append(t)
                break
    return out


def sfx():
    buf = np.zeros((N, 2))
    for at in CUTS:
        place(buf, whoosh(0.45) * 0.28, at - 0.22)
    # S1: funny surprise and tiny gecko footsteps on the ceiling
    place(buf, boing() * 0.32, 0.18)
    place(buf, pop(1200, 500, 0.15) * 0.3, 0.2)
    tt = 0.15
    while tt < 5.3:
        place(buf, tick() * 0.1, tt, pan=float(rs.uniform(-0.3, 0.3)))
        tt += 0.3 + 0.04 * rs.standard_normal()
    tt = 2.0
    # S2: magnifier out, then magical shrinking
    place(buf, sparkle(0.6, 14, False, 2) * 0.25, 7.2)
    place(buf, sparkle(1.2, 30, True, 3) * 0.3, 8.45)
    place(buf, slide(1400, 260, 1.0) * 0.18, 8.7)
    place(buf, whoosh(1.0, 4000, 250) * 0.3, 8.75)
    place(buf, sparkle(0.7, 22, False, 4) * 0.32, 9.65)
    place(buf, chime((79, 83, 86, 91), 0.08) * 0.32, 9.8)
    # S3: discovery chimes
    place(buf, chime((84, 88, 91)) * 0.26, 12.72)
    place(buf, chime((86, 91, 95)) * 0.24, 13.64)
    place(buf, sparkle(0.8, 18, True, 5) * 0.25, 15.6)
    place(buf, chime((88, 91, 95, 100), 0.07) * 0.3, 16.6)
    # S4: the ceiling comes down, tips touch, tiny attractions
    place(buf, whoosh(1.2, 200, 900) * 0.22, 19.5)
    place(buf, shimmer(0.5, 18, 3500, 6000, 6, False) * 0.28, 20.75)
    place(buf, chime((91, 95)) * 0.22, 21.75)
    place(buf, shimmer(1.4, 26, 4000, 7500, 7, False) * 0.18, 22.2)
    # many tips join in: shimmer grows, meter fills, then the strong-grip moment
    place(buf, shimmer(2.6, 140, 3000, 8000, 8, True) * 0.3, 24.3)
    place(buf, slide(300, 900, 3.0) * 0.08, 24.4)
    place(buf, chime((79, 86, 91, 98), 0.06) * 0.4, 27.36)
    place(buf, boing(0.35) * 0.12, 27.4)
    # S5: puzzled, then the slow-motion peel and release
    place(buf, sparkle(0.6, 14, False, 9) * 0.2, 28.0)
    place(buf, peel_sound(2.7) * 0.22, 32.0)
    for k, at in enumerate(peel_times()):
        place(buf, pop(1800 + 90 * k, 900, 0.08) * 0.18, at, pan=0.3)
    place(buf, zip_up() * 0.25, 33.9)
    place(buf, chime((86, 91)) * 0.22, 34.75)
    # S6: grow back to normal size, realisation, not glue / not magnet
    place(buf, whoosh(0.8, 250, 5000, rev=True) * 0.3, 34.9)
    place(buf, sparkle(0.7, 20, True, 10) * 0.28, 35.3)
    place(buf, pop(700, 300, 0.18) * 0.3, 35.6)
    place(buf, chime((84, 88, 91, 96), 0.07) * 0.3, 35.65)
    place(buf, nope() * 0.26, 36.98)
    place(buf, nope() * 0.26, 37.88)
    place(buf, chime((91, 95, 98)) * 0.3, 38.12)
    # S7: thumbs-up sparkle, curious question marks, outro
    place(buf, sparkle(0.6, 14, False, 11) * 0.22, 38.9)
    place(buf, sparkle(1.0, 24, False, 12) * 0.3, 42.75)
    pops = [0.12, 0.45, 2.15, 2.5, 3.85, 4.2, 4.4, 4.55, 6.1, 6.15, 13.64, 17.66, 17.96, 20.5, 22.18, 23.0, 24.4, 24.6,
            29.0, 29.4, 30.38, 31.95, 32.2, 33.84, 36.54, 36.86, 37.76, 38.0, 38.5, 40.75, 41.05, 41.35, 43.05, 43.25, 43.45, 44.0]
    for at in pops:
        place(buf, pop() * 0.28, at, pan=float(rs.uniform(-0.3, 0.3)))
    return buf


def load_narration():
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", os.path.join(HERE, "audio", "narration.flac"), "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"], check=True, capture_output=True).stdout
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
    mix = v * 1.0 + m * 0.5 + a * 0.1 + s * 0.5
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
