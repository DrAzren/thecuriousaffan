#!/usr/bin/env python3
"""Soundtrack for Episode 013 (Berapakah Tinggi KLCC?), synthesised from scratch
(no samples, no licensed music) and mixed under the narration.

Layers: bright original music bed (sunny city, playful marimba band in the
measuring world), light park ambience (breeze + synthetic bird chirps),
whooshes on cuts, a magic sparkle into the measuring world, rising "stack"
plinks while houses / people / Affans pile up, label pops and discovery
chimes. The music is ducked under the voice and the final mix is normalised to
-14 LUFS / -1.5 dBTP for social platforms.

    python3 build_audio.py            # -> output/mix.wav (+ stems in output/stems)
Requires numpy and ffmpeg.
"""
import os
import subprocess
import sys

import numpy as np

SR = 44100
DUR = 73.75
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "output")
N = int(SR * DUR)
rs = np.random.default_rng(5)


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
CITY = [(0.0, 19.95), (58.3, 70.75)]
LAB = (19.95, 58.3)


def plink(f, dur=0.18):
    t = T(dur)
    return (np.sin(2 * np.pi * f * t) + 0.3 * np.sin(2 * np.pi * 2 * f * t)) * np.exp(-t * 28)


def music():
    buf = np.zeros((N, 2))
    bpm = 112
    beat = 60 / bpm
    bar = beat * 4
    # G  D  Em  C  (I V vi IV) in G major
    chords = [(55, [67, 71, 74]), (50, [66, 69, 74]), (52, [67, 71, 76]), (48, [67, 72, 76])]
    arp_pat = [0, 1, 2, 1, 0, 2, 1, 2]
    # sunny city sections: pad + bells + light bass
    for a, b in CITY:
        t0, i = a, 0
        while t0 < b - 0.2:
            root, ch = chords[i % 4]
            place(buf, pad([midi(n) for n in ch], bar + 0.6) * 0.14, t0)
            for k, step in enumerate([0, 2, 1, 2]):
                if t0 + k * beat < b:
                    place(buf, musicbox(midi(ch[step] + 12)) * 0.11, t0 + k * beat, pan=0.3 * ((k % 2) * 2 - 1))
            place(buf, bass(midi(root - 12), 0.9) * 0.22, t0)
            t0 += bar
            i += 1
    # measuring world: full playful band
    t0, i = LAB[0], 0
    while t0 < LAB[1] - 0.2:
        root, ch = chords[i % 4]
        place(buf, pad([midi(n) for n in ch], bar + 0.6) * 0.1, t0)
        for k in range(8):
            if t0 + k * beat / 2 < LAB[1]:
                place(buf, marimba(midi(ch[arp_pat[k]] + 12)) * 0.2, t0 + k * beat / 2, pan=-0.35 + 0.1 * k)
        for k in (0, 2):
            place(buf, bass(midi(root - 12) if k == 0 else midi(root - 5), 0.6) * 0.3, t0 + k * beat)
        for k in range(8):
            place(buf, shaker() * (0.5 if k % 2 else 0.3), t0 + k * beat / 2, pan=0.4)
        t0 += bar
        i += 1
    # outro sting: G major chord with bells
    place(buf, pad([midi(n) for n in (55, 67, 71, 74, 79)], 3.0) * 0.2, 70.75)
    for k, m in enumerate([79, 83, 86, 91]):
        place(buf, pluck_bell(midi(m), 2.5) * 0.12, 70.8 + k * 0.12, pan=-0.3 + 0.2 * k)
    place(buf, bass(midi(43), 2.0) * 0.3, 70.75)
    fade = int(1.2 * SR)
    buf[-fade:] *= np.linspace(1, 0, fade)[:, None]
    return buf


def ambience():
    """Park ambience for the city scenes: soft breeze and synthetic bird chirps."""
    buf = np.zeros((N, 2))
    wind = onepole(rs.standard_normal(N), 400)
    wind /= np.abs(wind).max()
    t = np.arange(N) / SR
    wind *= 0.6 + 0.4 * np.sin(2 * np.pi * 0.13 * t)
    lvl = np.zeros(N)
    for a, b in CITY:
        lvl[int(a * SR) : int(b * SR)] = 1.0
    lvl = onepole(lvl, 3)
    buf[:, 0] = wind * lvl * 0.5
    buf[:, 1] = np.roll(wind, 91) * lvl * 0.5
    r = np.random.default_rng(12)
    for a, b in CITY:
        tt = a + 0.6
        while tt < b - 0.5:
            n = r.integers(2, 4)
            f0 = 2600 + r.random() * 1600
            for j in range(n):
                d = 0.07 + r.random() * 0.05
                tc = T(d)
                f = f0 * (1 + 0.35 * np.sin(np.pi * tc / d)) * (1 + 0.1 * j)
                chirp = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * tc / d) ** 2
                place(buf, chirp * 0.18, tt + j * 0.11, pan=float(r.uniform(-0.8, 0.8)))
            tt += 1.2 + r.random() * 2.2
    return buf


def stack_plinks(buf, t0, t1, count_at, n_max, f0=500, f1=1800, gain=0.16):
    """One rising plink each time the stack count goes up (at most every 60 ms)."""
    last, tt, prev = -1, t0, 0
    while tt < t1:
        c = count_at(tt)
        if c > prev and tt - last > 0.06:
            f = f0 * (f1 / f0) ** (min(c, n_max) / n_max)
            place(buf, plink(f) * gain, tt, pan=float(rs.uniform(-0.3, 0.3)))
            last, prev = tt, c
        tt += 0.01


def interp(ks):
    xs, ys = zip(*ks)
    return lambda t: int(np.interp(t, xs, ys))


def sfx():
    buf = np.zeros((N, 2))
    for at in (5.6, 14.45, 24.45, 37.7, 44.35, 51.35, 64.65):
        place(buf, whoosh(0.5) * 0.32, at - 0.25)
    place(buf, whoosh(1.4, 200, 5000) * 0.32, 6.0)  # crane up the tower
    place(buf, whoosh(0.8, 2500, 300) * 0.3, 58.1)  # back to the city
    # magic sparkle into the measuring world + reveal
    place(buf, sparkle(1.2, 34, True, 2) * 0.32, 18.75)
    place(buf, sparkle(0.6, 22, False, 3) * 0.3, 19.9)
    place(buf, whoosh(0.9, 300, 6000, rev=True) * 0.25, 19.1)
    # 452 m counter ticks, then a ding
    tt = 9.52
    while tt < 11.8:
        place(buf, plink(1200 + 900 * (tt - 9.52) / 2.3, 0.08) * 0.1, tt)
        tt += 0.07
    place(buf, chime((84, 88, 91, 96), 0.07) * 0.36, 11.85)
    # first house drops, first adult appears
    place(buf, boing() * 0.22, 20.6)
    place(buf, boing() * 0.18, 40.45)
    # stacks
    stack_plinks(buf, 26.1, 31.5, interp([(26.1, 1), (26.45, 2), (27.96, 10), (29.08, 30), (30.32, 60), (31.44, 90)]), 90)
    stack_plinks(buf, 44.48, 49.05, interp([(44.48, 1), (45.6, 6), (47.0, 60), (48.2, 170), (49.0, 266)]), 266, 450, 2000, 0.13)
    stack_plinks(buf, 53.2, 55.85, interp([(53.2, 0), (53.8, 6), (54.6, 90), (55.4, 300), (55.8, 410)]), 410, 700, 2600, 0.11)
    # label pops
    for at in (0.12, 0.5, 4.0, 5.68, 9.45, 12.24, 15.36, 15.96, 16.24, 18.4, 20.56, 23.2, 26.1, 38.56, 40.4, 42.72, 44.5, 51.9, 52.2, 53.3, 54.48, 58.45, 58.75, 59.05, 59.35, 62.3, 65.28, 65.6, 68.32, 68.4, 68.7, 69.0, 71.05, 71.25, 71.45):
        place(buf, pop() * 0.3, at, pan=float(rs.uniform(-0.3, 0.3)))
    # discovery cues
    place(buf, chime((79, 84, 88, 91)) * 0.36, 31.44)
    place(buf, sparkle(0.8, 16, False, 6) * 0.25, 31.5)
    place(buf, chime((84, 88, 91, 96), 0.07) * 0.34, 36.0)
    place(buf, chime((79, 84, 88, 91)) * 0.36, 49.0)
    place(buf, sparkle(0.8, 16, False, 9) * 0.25, 49.05)
    place(buf, chime((84, 88, 91, 96), 0.07) * 0.36, 55.8)
    place(buf, sparkle(1.0, 24, False, 10) * 0.3, 57.0)
    place(buf, chime((79, 83, 86, 91, 95), 0.08) * 0.38, 61.6)  # once the tallest in the world
    place(buf, sparkle(0.8, 18, False, 11) * 0.25, 61.65)
    place(buf, chime((86, 91)) * 0.28, 65.4)
    place(buf, sparkle(0.6, 14, False, 7) * 0.22, 65.45)
    place(buf, sparkle(1.0, 24, False, 8) * 0.3, 70.75)
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
    mix = v * 1.0 + m * 0.55 + a * 0.1 + s * 0.55
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
