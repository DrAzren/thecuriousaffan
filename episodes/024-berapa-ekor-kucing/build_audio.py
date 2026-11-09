#!/usr/bin/env python3
"""Soundtrack for Episode 024, synthesised from scratch (no samples, no
licensed music) and mixed under the narration.

Layers: original music bed (cosy home theme, playful marimba band in the
imagination world, bells for the finale), birdsong on the street, whooshes on
cuts and carousel turns, magic sparkle, counter ticks, label pops, discovery
chimes and a soft cartoon meow. The music is ducked under the voice and the
final mix is normalised to -14 LUFS / -1.5 dBTP for social platforms.

    python3 build_audio.py            # -> output/mix.wav (+ stems in output/stems)
Requires numpy and ffmpeg.
"""
import os
import subprocess
import sys

import numpy as np

SR = 44100
DUR = 70.9
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


# ------------------------------------------------------------- extra sfx
def meow(dur=0.5, f0=520, seed=1):
    """Cartoon 'mi-aow': pitch rises then falls, vowel opens i -> a -> u."""
    r = np.random.default_rng(seed)
    t = T(dur)
    u = t / dur
    f = f0 * (1 + 0.45 * np.sin(np.pi * np.clip(u * 1.3, 0, 1)) - 0.2 * u)
    ph = 2 * np.pi * np.cumsum(f * (1 + 0.006 * r.standard_normal(len(t)))) / SR
    src = sum(np.sin(h * ph) / h for h in range(1, 14))
    f1 = np.interp(u, [0, 0.35, 0.75, 1], [500, 1000, 800, 450])
    f2 = np.interp(u, [0, 0.35, 0.75, 1], [2300, 1500, 1100, 900])
    y = np.zeros_like(src)
    for fc, g in ((f1, 1.0), (f2, 0.6)):
        gg = 2 * np.sin(np.pi * np.minimum(fc, SR / 6) / SR)
        low = band = 0.0
        out = np.zeros(len(src))
        for i in range(len(src)):
            high = src[i] - low - 0.25 * band
            band += gg[i] * high
            low += gg[i] * band
            out[i] = band
        y += out * g
    y *= np.sin(np.pi * np.clip(u, 0, 1)) ** 0.7
    return y / (np.abs(y).max() + 1e-9)


def chirp(seed):
    r = np.random.default_rng(seed)
    out = np.zeros(int(0.5 * SR))
    k = 0
    for _ in range(2 + int(r.integers(0, 3))):
        d = 0.05 + 0.04 * r.random()
        t = T(d)
        f = (3200 + 1500 * r.random()) * (1 + 0.5 * np.sin(np.pi * t / d))
        s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * t / d)
        out[k : k + len(s)] += s[: len(out) - k]
        k += int((d + 0.03) * SR)
    return out


def tick(f=2400):
    t = T(0.03)
    return np.sin(2 * np.pi * f * t) * np.exp(-t * 160)


# ------------------------------------------------------------------ layers
def music():
    buf = np.zeros((N, 2))
    bpm = 108
    beat = 60 / bpm
    bar = beat * 4
    # C  G  Am  F  (I V vi IV) in C major
    chords = [(48, [60, 64, 67]), (43, [59, 62, 67]), (45, [60, 64, 69]), (41, [60, 65, 69])]
    arp_pat = [0, 1, 2, 1, 0, 2, 1, 2]

    def home_theme(a, b, g=1.0):
        t0, i = a, 0
        while t0 < b:
            root, ch = chords[i % 4]
            place(buf, pad([midi(n) for n in ch], bar + 0.6) * 0.13 * g, t0)
            for k in range(4):
                place(buf, marimba(midi(ch[[0, 2, 1, 2][k]] + 12)) * 0.16 * g, t0 + k * beat, pan=0.25 * ((k % 2) * 2 - 1))
            for k in (0, 2):
                place(buf, musicbox(midi(ch[2] + 24 if k == 0 else ch[1] + 24)) * 0.07 * g, t0 + k * beat + beat / 2, pan=0.3)
            place(buf, bass(midi(root - 12), 0.9) * 0.25 * g, t0)
            t0 += bar
            i += 1

    def band(a, b, g=1.0):
        t0, i = a, 0
        while t0 < b:
            root, ch = chords[i % 4]
            place(buf, pad([midi(n) for n in ch], bar + 0.6) * 0.1 * g, t0)
            for k in range(8):
                n = ch[arp_pat[k]] + 12
                place(buf, marimba(midi(n)) * 0.2 * g, t0 + k * beat / 2, pan=-0.35 + 0.1 * k)
            for k in (0, 2):
                place(buf, bass(midi(root - 12) if k == 0 else midi(root - 5), 0.6) * 0.32 * g, t0 + k * beat)
            for k in range(8):
                place(buf, shaker() * (0.5 if k % 2 else 0.3) * g, t0 + k * beat / 2, pan=0.4)
            t0 += bar
            i += 1

    home_theme(0.0, 11.1)
    band(11.1, 55.25)
    # finale: band plus bells over the whole carousel
    band(55.25, 58.8, 1.1)
    for k, m in enumerate([72, 76, 79, 84, 88]):
        place(buf, pluck_bell(midi(m), 2.0) * 0.1, 55.3 + k * 0.1, pan=-0.4 + 0.2 * k)
    home_theme(58.8, 67.65, 0.9)
    # outro sting: C major with bells
    place(buf, pad([midi(n) for n in (48, 60, 64, 67, 72)], 3.2) * 0.2, 67.65)
    for k, m in enumerate([72, 76, 79, 84]):
        place(buf, pluck_bell(midi(m), 2.5) * 0.12, 67.7 + k * 0.12, pan=-0.3 + 0.2 * k)
    place(buf, bass(midi(36), 2.0) * 0.3, 67.65)
    fade = int(1.2 * SR)
    buf[-fade:] *= np.linspace(1, 0, fade)[:, None]
    return buf


def ambience():
    buf = np.zeros((N, 2))
    # soft outdoor air + birdsong on the street (20.1 - 22.7)
    a, b = 20.1, 22.7
    n = int((b - a) * SR)
    air = onepole(rs.standard_normal(n), 900)
    air /= np.abs(air).max()
    env = np.minimum(1, np.minimum(np.arange(n) / (0.2 * SR), (n - np.arange(n)) / (0.2 * SR)))
    place(buf, air * env * 0.25, a)
    tt, s = a + 0.15, 1
    while tt < b - 0.4:
        place(buf, chirp(s) * 0.25, tt, pan=float(rs.uniform(-0.6, 0.6)))
        tt += 0.45 + 0.3 * rs.random()
        s += 1
    return buf


def sfx():
    buf = np.zeros((N, 2))
    for at in (5.6, 9.25, 17.5, 20.1, 22.7, 58.8, 64.45):
        place(buf, whoosh(0.5) * 0.3, at - 0.25)
    # carousel turns
    for at in (27.75, 30.95, 34.5, 38.6, 42.8, 46.05, 50.35):
        place(buf, whoosh(0.8, 300, 2600) * 0.32, at - 0.4, pan=0.2)
    place(buf, whoosh(1.0, 200, 5000) * 0.3, 55.0)
    # magic sparkle into the imagination world + reveal
    place(buf, sparkle(1.2, 34, True, 2) * 0.32, 9.85)
    place(buf, whoosh(0.9, 300, 6000, rev=True) * 0.25, 10.3)
    place(buf, sparkle(0.6, 22, False, 3) * 0.3, 11.1)
    # cats popping up all over the globe + counter ticks
    tt, i = 12.9, 0
    while tt < 15.4:
        place(buf, pop(1400 + 600 * ((i * 7) % 5) / 5, 700, 0.07) * 0.12, tt, pan=float(rs.uniform(-0.6, 0.6)))
        tt += 0.11 - 0.04 * (tt - 12.9) / 2.5
        i += 1
    tt = 12.95
    while tt < 14.3:
        place(buf, tick(2000 + 1200 * (tt - 12.95)) * 0.18, tt)
        tt += 0.06
    tt = 25.6
    while tt < 26.7:
        place(buf, tick(1800 + 900 * (tt - 25.6)) * 0.18, tt)
        tt += 0.07
    # label pops
    for at in (0.12, 0.5, 6.3, 7.28, 8.18, 11.35, 15.28, 16.18, 18.7, 19.32, 21.48, 21.9, 23.72,
               27.88, 30.2, 31.2, 33.0, 34.7, 36.44, 38.78, 42.98, 44.22, 46.26, 47.62, 50.54,
               56.4, 61.18, 63.28, 64.64, 64.9, 65.2, 66.6, 67.95, 68.15, 68.35):
        place(buf, pop() * 0.3, at, pan=float(rs.uniform(-0.3, 0.3)))
    place(buf, boing() * 0.2, 7.28)
    place(buf, boing() * 0.2, 8.18)
    place(buf, boing() * 0.22, 55.5)
    # discovery cues
    place(buf, chime((79, 84, 88, 91)) * 0.36, 14.3)
    place(buf, chime((84, 88, 91, 96), 0.07) * 0.4, 26.74)
    place(buf, sparkle(0.6, 14, False, 4) * 0.22, 26.8)
    place(buf, sparkle(0.8, 16, False, 5) * 0.2, 33.86)
    place(buf, chime((86, 91)) * 0.26, 41.22)
    place(buf, chime((84, 88)) * 0.24, 44.56)
    place(buf, sparkle(0.8, 14, False, 6) * 0.22, 49.12)
    place(buf, chime((91, 86)) * 0.24, 53.62)
    place(buf, chime((79, 84, 88, 91, 96), 0.08) * 0.38, 55.52)
    place(buf, sparkle(1.0, 24, False, 7) * 0.28, 55.6)
    place(buf, sparkle(0.6, 14, False, 8) * 0.22, 59.2)
    place(buf, sparkle(1.0, 24, False, 9) * 0.3, 67.65)
    # little hearts twinkle
    for at in (0.4, 17.8):
        place(buf, sparkle(0.9, 10, False, int(at * 10)) * 0.14, at)
    # meows: the Siamese after "suka mengiau", the crowd at "70 baka"
    place(buf, meow(0.45, 560, 1) * 0.16, 38.32, pan=0.1)
    for k, (at, f) in enumerate([(26.85, 600), (27.1, 470), (27.3, 680)]):
        place(buf, meow(0.35, f, 10 + k) * 0.08, at, pan=-0.4 + 0.4 * k)
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
    mix = v * 1.0 + m * 0.55 + a * 0.3 + s * 0.55
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
