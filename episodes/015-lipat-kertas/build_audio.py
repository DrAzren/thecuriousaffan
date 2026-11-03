#!/usr/bin/env python3
"""Soundtrack for Episode 015, synthesised from scratch (no samples, no
licensed music) and mixed under the narration.

Layers: playful original marimba band at the desk, a wide-open "wonder" pad
with music box in space, field birds and breeze, paper fold swishes and
crinkles, a rising counter tick for the 42 folds, whooshes on cuts, label pops,
a "nope" for the fold that won't go, and discovery chimes. The music is ducked under the voice and the
final mix is normalised to -14 LUFS / -1.5 dBTP for social platforms.

    python3 build_audio.py            # -> output/mix.wav (+ stems in output/stems)
Requires numpy and ffmpeg.
"""
import os
import subprocess
import sys

import numpy as np

SR = 44100
DUR = 63.7
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
CUTS = (6.22, 8.2, 15.84, 21.0, 26.1, 31.2, 35.2, 40.0, 46.06, 52.62, 56.11, 60.9)
FOLDS = ((8.3, 9.25), (10.9, 11.75), (13.22, 14.1), (21.0, 21.62), (22.48, 23.1), (24.03, 24.65), (26.2, 27.25))


def band(buf, t0, t1, chords, bpm=112, gain=1.0, arp=True, drums=True):
    beat = 60 / bpm
    bar = beat * 4
    arp_pat = [0, 1, 2, 1, 0, 2, 1, 2]
    i = 0
    while t0 < t1 - 0.05:
        root, ch = chords[i % len(chords)]
        place(buf, pad([midi(n) for n in ch], bar + 0.6) * 0.1 * gain, t0)
        if arp:
            for k in range(8):
                if t0 + k * beat / 2 < t1:
                    place(buf, marimba(midi(ch[arp_pat[k]] + 12)) * 0.19 * gain, t0 + k * beat / 2, pan=-0.35 + 0.1 * k)
        for k in (0, 2):
            if t0 + k * beat < t1:
                place(buf, bass(midi(root - 12) if k == 0 else midi(root - 5), 0.6) * 0.3 * gain, t0 + k * beat)
        if drums:
            for k in range(8):
                if t0 + k * beat / 2 < t1:
                    place(buf, shaker() * (0.5 if k % 2 else 0.3) * gain, t0 + k * beat / 2, pan=0.4)
        t0 += bar
        i += 1


def music():
    buf = np.zeros((N, 2))
    # C  G  Am  F (I V vi IV) in C major; brighter key for a daytime room
    C = [(48, [64, 67, 72]), (43, [62, 67, 71]), (45, [64, 69, 72]), (41, [65, 69, 72])]
    # curious hook: music box + soft pad
    beat = 60 / 112
    bar = beat * 4
    t0, i = 0.0, 0
    while t0 < 6.22:
        root, ch = C[i % 4]
        place(buf, pad([midi(n) for n in ch], bar + 0.6) * 0.14, t0)
        for k, step in enumerate([0, 2, 1, 2]):
            place(buf, musicbox(midi(ch[step] + 12)) * 0.12, t0 + k * beat, pan=0.3 * ((k % 2) * 2 - 1))
        t0 += bar
        i += 1
    band(buf, 6.22, 40.0, C)
    band(buf, 40.0, 46.06, C[2:] + C[:2], gain=1.05)
    # space: slow wonder pad + music box, no drums
    t0, i = 46.06, 0
    S = [(45, [64, 69, 72, 76]), (41, [65, 69, 72, 77]), (43, [67, 71, 74, 79]), (48, [64, 67, 72, 79])]
    while t0 < 52.62:
        root, ch = S[i % 4]
        place(buf, pad([midi(n) for n in ch], 2.3) * 0.18, t0)
        for k in range(4):
            place(buf, musicbox(midi(ch[k % len(ch)] + 12), 1.8) * 0.11, t0 + k * 0.4, pan=-0.4 + 0.25 * k)
        place(buf, bass(midi(root - 12), 1.8) * 0.2, t0)
        t0 += 1.6
        i += 1
    band(buf, 52.62, 60.9, C, gain=0.95)
    # outro sting
    place(buf, pad([midi(n) for n in (48, 60, 64, 67, 72)], 3.0) * 0.2, 60.9)
    for k, m in enumerate([72, 76, 79, 84]):
        place(buf, pluck_bell(midi(m), 2.5) * 0.12, 60.95 + k * 0.12, pan=-0.3 + 0.2 * k)
    place(buf, bass(midi(36), 2.0) * 0.3, 60.9)
    fade = int(1.2 * SR)
    buf[-fade:] *= np.linspace(1, 0, fade)[:, None]
    return buf


def chirp(f0=3200, dur=0.09):
    t = T(dur)
    f = f0 * (1 + 0.35 * np.sin(np.pi * t / dur))
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * t / dur) ** 2


def ambience():
    buf = np.zeros((N, 2))
    # field: soft breeze + a few birds
    a, b = 40.0, 46.06
    n = int((b - a) * SR)
    breeze = svf(rs.standard_normal(n), 300, 600, q=0.6)
    breeze /= np.abs(breeze).max()
    breeze *= np.sin(np.linspace(0, np.pi, n)) * (0.6 + 0.4 * np.sin(np.linspace(0, 7, n)))
    place(buf, breeze * 0.35, a)
    tt = a + 0.3
    r = np.random.default_rng(9)
    while tt < b - 0.4:
        for j in range(2 + int(r.random() * 2)):
            place(buf, chirp(2800 + 900 * r.random()) * 0.18, tt + j * 0.12, pan=float(r.uniform(-0.7, 0.7)))
        tt += 0.8 + r.random() * 0.9
    # room tone: very low, warm
    for a, b in ((0, 40.0), (52.62, 60.9)):
        n = int((b - a) * SR)
        rt = onepole(rs.standard_normal(n), 250)
        rt /= np.abs(rt).max()
        place(buf, rt * 0.08, a)
    return buf


def fold_sfx(dur=0.8):
    # paper: a soft swish of the flap plus crinkle ticks and a crease "press"
    x = rs.standard_normal(int(dur * SR))
    sw = svf(x, 1500, 5000, q=1.2)
    sw *= np.sin(np.linspace(0, np.pi, len(sw))) ** 2
    sw /= np.abs(sw).max() + 1e-9
    out = sw * 0.6
    r = np.random.default_rng(int(dur * 1000))
    for _ in range(14):
        k = int(r.random() * (len(out) - 2000))
        c = rs.standard_normal(600) * np.exp(-np.arange(600) / 60)
        out[k : k + 600] += svf(c, 3000, 3000, q=2) * 0.8
    press = svf(rs.standard_normal(int(0.12 * SR)), 900, 400, q=0.8) * np.exp(-T(0.12) * 30)
    k = int(0.8 * len(out)) - len(press)
    out[k : k + len(press)] += press / (np.abs(press).max() + 1e-9) * 0.5
    return out / (np.abs(out).max() + 1e-9)


def tick(f=1800):
    t = T(0.05)
    return np.sin(2 * np.pi * f * t) * np.exp(-t * 90)


def creak(dur=3.2):
    t = T(dur)
    f = 95 + 25 * np.sin(2 * np.pi * 0.9 * t)
    y = np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * 0.5
    y = svf(y, 700, 700, q=3)
    y *= (0.5 + 0.5 * np.sin(2 * np.pi * 7 * t) ** 2) * np.sin(np.pi * t / dur)
    return y / (np.abs(y).max() + 1e-9)


def sfx():
    buf = np.zeros((N, 2))
    for at in CUTS:
        place(buf, whoosh(0.5) * 0.3, at - 0.25)
    place(buf, whoosh(0.9, 300, 6000, rev=True) * 0.25, 39.6)  # into the field
    place(buf, whoosh(1.1, 200, 5000) * 0.3, 45.7)  # into space
    place(buf, whoosh(0.6, 2500, 300) * 0.3, 52.4)  # back to the room
    place(buf, sparkle(1.0, 24, True, 2) * 0.25, 6.3)
    for a, b in FOLDS:
        place(buf, fold_sfx(b - a + 0.15) * 0.42, a, pan=float(rs.uniform(-0.2, 0.2)))
    # the fold that won't go: creaky strain + "nope"
    place(buf, creak(3.4) * 0.12, 31.4)
    place(buf, nope() * 0.3, 33.48)
    # label pops
    for at in (0.12, 0.5, 3.92, 5.04, 6.24, 9.44, 11.84, 14.24, 16.2, 16.65, 17.1, 17.55, 19.12, 20.32, 21.6, 23.09, 24.64, 29.44, 32.24,
               41.6, 43.28, 51.2, 53.6, 53.73, 53.86, 53.99, 54.12, 54.25, 54.38, 54.51, 56.2, 58.1, 58.4, 59.73, 61.2, 61.4, 61.6):
        place(buf, pop() * 0.3, at, pan=float(rs.uniform(-0.3, 0.3)))
    # chart bars rising
    for i in range(8):
        place(buf, marimba(midi(72 + [0, 2, 4, 5, 7, 9, 11, 12][i]), 0.4) * 0.22, 35.45 + i * 0.22)
    # counter ticks while folding 8 -> 42 times, rising in pitch
    for i in range(35):
        at = 47.3 + i * (50.0 - 47.3) / 34
        place(buf, tick(900 * 2 ** (i / 24)) * 0.28, at, pan=0.2)
    place(buf, whoosh(1.4, 200, 7000) * 0.3, 49.4)  # tower shoots to the Moon
    # discovery cues
    place(buf, boing() * 0.2, 52.66)
    for at, notes in ((9.5, (79, 84)), (11.9, (81, 86)), (14.3, (84, 88)), (27.36, (79, 84, 88, 91)), (38.88, (84, 88, 91)), (44.56, (79, 84, 88, 91, 96)), (52.0, (84, 88, 91, 96)), (54.8, (84, 88, 91, 96))):
        place(buf, chime(notes, 0.07) * 0.32, at)
    for at, seed in ((27.4, 6), (44.6, 7), (50.3, 8), (52.0, 9), (54.85, 10), (60.9, 11)):
        place(buf, sparkle(0.8, 18, False, seed) * 0.24, at)
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
    mix = v * 1.0 + m * 0.55 + a * 0.12 + s * 0.55
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
