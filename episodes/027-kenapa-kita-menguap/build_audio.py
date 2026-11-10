#!/usr/bin/env python3
"""Soundtrack for Episode 027, synthesised from scratch (no samples, no
licensed music) and mixed under the narration.

Layers: gentle original music bed (night music box in the bedroom, playful
marimba band on the science stage), night-time crickets, whooshes on cuts,
magic sparkle, airy breath swells, label pops and discovery chimes. The music is ducked under the voice and the
final mix is normalised to -14 LUFS / -1.5 dBTP for social platforms.

    python3 build_audio.py            # -> output/mix.wav (+ stems in output/stems)
Requires numpy and ffmpeg.
"""
import os
import subprocess
import sys

import numpy as np

SR = 44100
DUR = 78.5
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "output")
N = int(SR * DUR)
rs = np.random.default_rng(27)


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
BEDROOM = [(0.0, 12.9), (64.1, 73.95)]
LAB = (12.9, 64.1)
OUTRO = 73.95
CUTS = (7.05, 24.7, 31.6, 35.25, 39.05, 45.4, 51.6, 59.5, 64.1, 68.0, 71.0)


def music():
    buf = np.zeros((N, 2))
    bpm = 100
    beat = 60 / bpm
    bar = beat * 4
    # F  Dm  Bb  C  (I vi IV V) in F major
    chords = [(53, [65, 69, 72]), (50, [65, 69, 74]), (46, [65, 70, 74]), (48, [64, 67, 72])]
    arp_pat = [0, 1, 2, 1, 0, 2, 1, 2]
    # bedroom intro: soft pad + music box (lullaby feel)
    t0, i = 0.0, 0
    while t0 < 12.9:
        root, ch = chords[i % 4]
        place(buf, pad([midi(n) for n in ch], bar + 0.6) * 0.15, t0)
        for k, step in enumerate([0, 2, 1, 2]):
            place(buf, musicbox(midi(ch[step] + 12)) * 0.12, t0 + k * beat, pan=0.3 * ((k % 2) * 2 - 1))
        t0 += bar
        i += 1
    # science stage: playful marimba band
    t0, i = 12.9, 0
    while t0 < 64.1:
        root, ch = chords[i % 4]
        place(buf, pad([midi(n) for n in ch], bar + 0.6) * 0.1, t0)
        for k in range(8):
            n = ch[arp_pat[k]] + 12
            place(buf, marimba(midi(n)) * 0.19, t0 + k * beat / 2, pan=-0.35 + 0.1 * k)
        for k in (0, 2):
            place(buf, bass(midi(root - 12) if k == 0 else midi(root - 5), 0.6) * 0.3, t0 + k * beat)
        for k in range(8):
            place(buf, shaker() * (0.5 if k % 2 else 0.3), t0 + k * beat / 2, pan=0.4)
        t0 += bar
        i += 1
    # back in the bedroom: warm, lighter
    t0, i = 64.1, 0
    while t0 < 73.95:
        root, ch = chords[i % 4]
        place(buf, pad([midi(n) for n in ch], bar + 0.6) * 0.13, t0)
        for k in range(4):
            place(buf, musicbox(midi(ch[[0, 2, 1, 2][k]] + 12)) * 0.11, t0 + k * beat, pan=0.25 * ((k % 2) * 2 - 1))
            place(buf, marimba(midi(ch[[0, 2, 1, 2][k]] + 12)) * 0.1, t0 + k * beat)
        place(buf, bass(midi(root - 12), 0.9) * 0.24, t0)
        t0 += bar
        i += 1
    # outro sting: final F major chord with bells
    place(buf, pad([midi(n) for n in (53, 65, 69, 72, 77)], 4.0) * 0.2, OUTRO)
    for k, m in enumerate([77, 81, 84, 89]):
        place(buf, pluck_bell(midi(m), 2.5) * 0.12, OUTRO + 0.05 + k * 0.12, pan=-0.3 + 0.2 * k)
    place(buf, bass(midi(41), 2.0) * 0.3, OUTRO)
    fade = int(1.5 * SR)
    buf[-fade:] *= np.linspace(1, 0, fade)[:, None]
    return buf


def cricket(seed):
    r = np.random.default_rng(seed)
    f = 4200 + 300 * r.random()
    out = np.zeros(int(0.5 * SR))
    for k in range(3):
        t = T(0.045)
        s = np.sin(2 * np.pi * f * t) * np.sin(np.pi * t / 0.045) ** 2
        i = int(k * 0.07 * SR)
        out[i : i + len(s)] += s
    return out


def ambience():
    # quiet night crickets + soft room tone in the bedroom
    buf = np.zeros((N, 2))
    room = onepole(rs.standard_normal(N), 300)
    room /= np.abs(room).max()
    lvl = np.zeros(N)
    for a, b in BEDROOM:
        lvl[int(a * SR) : int(b * SR)] = 1.0
    lvl = onepole(lvl, 3)
    buf[:, 0] += room * lvl * 0.25
    buf[:, 1] += np.roll(room, 41) * lvl * 0.25
    r = np.random.default_rng(3)
    for a, b in BEDROOM:
        tt = a + 0.4
        while tt < b - 0.5:
            place(buf, cricket(int(tt * 10)) * 0.35, tt, pan=float(r.uniform(-0.8, 0.8)))
            tt += 0.55 + r.random() * 0.6
    return buf


def breath(dur, rising=True):
    # airy swell for inhale (rising) / exhale (falling)
    x = rs.standard_normal(int(dur * SR))
    y = svf(x, 500, 1600, q=0.9) if rising else svf(x, 1500, 400, q=0.9)
    e = np.sin(np.linspace(0, np.pi, len(y))) ** 1.2
    y = y * e
    return y / (np.abs(y).max() + 1e-9)


def cool_down(dur=0.9):
    # descending glassy tone for the brain cooling down
    t = T(dur)
    f = 1800 * (600 / 1800) ** (t / dur)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return (np.sin(ph) + 0.3 * np.sin(2.01 * ph)) * np.exp(-t * 2.5) * env_adsr(len(t), 0.01, 0.1, 1, 0.2)


def sfx():
    buf = np.zeros((N, 2))
    for at in CUTS:
        place(buf, whoosh(0.5) * 0.32, at - 0.25)
    # magic swirl into the science stage + reveal
    place(buf, sparkle(1.3, 34, True, 2) * 0.32, 11.6)
    place(buf, whoosh(0.9, 300, 6000, rev=True) * 0.25, 12.0)
    place(buf, sparkle(0.6, 22, False, 3) * 0.3, 12.9)
    # zzz and the big yawn stretch
    place(buf, boing(0.5) * 0.12, 3.7)
    # inhale / exhale in the slow-motion demo
    place(buf, breath(2.9, True) * 0.2, 18.3)
    place(buf, breath(2.6, False) * 0.18, 21.7)
    # brain cools
    place(buf, cool_down() * 0.22, 33.8)
    place(buf, sparkle(0.7, 14, False, 5) * 0.22, 34.0)
    # label / card pops
    for at in (0.12, 0.5, 5.95, 7.65, 8.7, 9.8, 10.78, 13.2, 14.44, 16.72, 18.26, 21.66, 25.0, 27.3, 29.6, 31.8, 32.6, 37.4, 38.16,
               39.3, 41.18, 42.5, 44.4, 45.6, 48.06, 52.14, 53.96, 55.6, 58.0, 59.6, 59.9, 60.3, 61.6, 61.62, 62.54, 64.26, 66.2, 68.86, 72.18,
               74.24, 74.3, 74.5, 74.7):
        place(buf, pop() * 0.3, at, pan=float(rs.uniform(-0.3, 0.3)))
    # discovery cues
    place(buf, chime((79, 84, 88, 91)) * 0.32, 29.65)
    place(buf, chime((84, 88, 91, 96), 0.07) * 0.38, 37.4)
    place(buf, sparkle(0.8, 16, False, 6) * 0.25, 37.45)
    place(buf, chime((84, 88, 91, 96), 0.06) * 0.42, 50.78)
    place(buf, sparkle(1.0, 20, False, 7) * 0.28, 50.8)
    place(buf, boing() * 0.18, 66.0)
    place(buf, chime((86, 91)) * 0.28, 72.18)
    place(buf, sparkle(0.6, 14, False, 8) * 0.22, 72.2)
    place(buf, sparkle(1.0, 24, False, 9) * 0.3, OUTRO)
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
