#!/usr/bin/env python3
"""Soundtrack for Episode 020, synthesised from scratch (no samples, no
licensed music) and mixed under the narration.

Layers: playful original music bed (cosy home marimba, adventurous
exploration band), river ambience (babbling water and bird chirps), mine
ambience (engine rumble), pan sloshes, crusher crunches, a rock thud and
crumble, gold shimmers and chimes, coin clinks as the pools fill, label pops
and a cash-register "ka-ching". The music is ducked under the voice and the
final mix is normalised to -14 LUFS / -1.5 dBTP for social platforms.

    python3 build_audio.py            # -> output/mix.wav (+ stems in output/stems)
Requires numpy and ffmpeg.
"""
import os
import subprocess
import sys

import numpy as np

SR = 44100
DUR = 75.5
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "output")
N = int(SR * DUR)
rs = np.random.default_rng(20)


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
HOME = [(0, 7.52), (69.2, 72.0)]
ADVENTURE = (7.52, 69.2)
RIVER = [(11.7, 25.3), (62.74, 69.2)]
MINE = (25.3, 39.08)


def music():
    buf = np.zeros((N, 2))
    bpm = 116
    beat = 60 / bpm
    bar = beat * 4
    # C  Am  F  G  (I vi IV V) in C major
    chords = [(48, [64, 67, 72]), (45, [64, 69, 72]), (41, [65, 69, 72]), (43, [62, 67, 71])]
    arp = [0, 1, 2, 1, 0, 2, 1, 2]
    for a, b in HOME:
        t0, i = a, 0
        while t0 < b:
            root, ch = chords[i % 4]
            place(buf, pad([midi(n) for n in ch], bar + 0.6) * 0.12, t0)
            for k in range(4):
                place(buf, marimba(midi(ch[[0, 2, 1, 2][k]] + 12)) * 0.16, t0 + k * beat, pan=0.25 * ((k % 2) * 2 - 1))
            place(buf, bass(midi(root - 12), 0.8) * 0.26, t0)
            t0 += bar
            i += 1
    t0, i = ADVENTURE[0], 0
    while t0 < ADVENTURE[1]:
        root, ch = chords[i % 4]
        place(buf, pad([midi(n) for n in ch], bar + 0.6) * 0.1, t0)
        for k in range(8):
            place(buf, marimba(midi(ch[arp[k]] + 12)) * 0.18, t0 + k * beat / 2, pan=-0.35 + 0.1 * k)
        for k in (0, 1.5, 2, 3.5):
            place(buf, bass(midi(root - 12) if k in (0, 2) else midi(root - 5), 0.4) * 0.3, t0 + k * beat)
        for k in range(8):
            place(buf, shaker() * (0.5 if k % 2 else 0.3), t0 + k * beat / 2, pan=0.4)
        if i % 2 == 1:
            for k, st in enumerate([2, 1, 0, 1]):
                place(buf, musicbox(midi(ch[st] + 24)) * 0.06, t0 + k * beat, pan=-0.3)
        t0 += bar
        i += 1
    # outro sting: final C major chord with bells
    place(buf, pad([midi(n) for n in (48, 60, 64, 67, 72)], 3.5) * 0.2, 72.0)
    for k, m in enumerate([72, 76, 79, 84]):
        place(buf, pluck_bell(midi(m), 2.5) * 0.12, 72.05 + k * 0.12, pan=-0.3 + 0.2 * k)
    place(buf, bass(midi(36), 2.0) * 0.3, 72.0)
    fade = int(1.2 * SR)
    buf[-fade:] *= np.linspace(1, 0, fade)[:, None]
    return buf


def chirp(f0=3200, f1=4600, dur=0.09):
    t = T(dur)
    f = f0 + (f1 - f0) * np.sin(np.pi * t / dur)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * t / dur) ** 2


def level(spans, rate=3):
    lvl = np.zeros(N)
    for a, b in spans:
        lvl[int(a * SR) : int(b * SR)] = 1.0
    return onepole(lvl, rate)


def ambience():
    buf = np.zeros((N, 2))
    t = np.arange(N) / SR
    # babbling river: band-passed noise with a bubbly amplitude flutter
    water = svf(rs.standard_normal(N), 900, 900, q=0.6)
    water /= np.abs(water).max()
    water *= 0.55 + 0.45 * np.abs(np.sin(2 * np.pi * 3.1 * t) * np.sin(2 * np.pi * 1.7 * t + 1))
    lv = level(RIVER)
    fast = level([(62.74, 69.2)])
    buf[:, 0] += water * lv * (0.5 + 0.4 * fast)
    buf[:, 1] += np.roll(water, 97) * lv * (0.5 + 0.4 * fast)
    r = np.random.default_rng(4)
    for a, b in RIVER + HOME:
        tt = a + 0.4
        while tt < b - 0.5:
            f0 = 2600 + r.random() * 1600
            for k in range(int(2 + r.random() * 3)):
                place(buf, chirp(f0, f0 * (1.25 + 0.2 * r.random())) * 0.28, tt + k * 0.11, pan=float(r.uniform(-0.8, 0.8)))
            tt += 1.6 + r.random() * 1.8
    # mine: low engine rumble with a slow throb
    rum = onepole(rs.standard_normal(N), 140)
    rum /= np.abs(rum).max()
    rum = rum * (0.7 + 0.3 * np.sin(2 * np.pi * 7.5 * t)) + 0.25 * np.sin(2 * np.pi * 52 * t)
    lm = level([MINE])
    buf[:, 0] += rum * lm * 0.6
    buf[:, 1] += rum * lm * 0.6
    return buf


def slosh(dur):
    x = rs.standard_normal(int(dur * SR))
    y = svf(x, 700, 700, q=0.9)
    t = np.arange(len(y)) / SR
    e = (0.4 + 0.6 * np.sin(2 * np.pi * 0.7 * t) ** 2) * np.minimum(1, np.minimum(t / 0.3, (dur - t) / 0.3))
    return y / (np.abs(y).max() + 1e-9) * e


def crunch(dur=0.16, seed=0):
    r = np.random.default_rng(seed)
    t = T(dur)
    n = r.standard_normal(len(t))
    y = svf(n, 1600, 400, q=0.8) * np.exp(-t * 22)
    return y / (np.abs(y).max() + 1e-9)


def thud(dur=0.5):
    t = T(dur)
    f = 90 * np.exp(-t * 4) + 40
    y = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 7)
    y += onepole(rs.standard_normal(len(t)), 600) * np.exp(-t * 18) * 3
    return y / (np.abs(y).max() + 1e-9)


def bloop(f0=500, f1=180, dur=0.3):
    t = T(dur)
    f = f0 * (f1 / f0) ** (t / dur)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * t / dur) ** 0.6


def clink(f=3200, seed=0):
    r = np.random.default_rng(seed)
    t = T(0.35)
    y = sum(np.sin(2 * np.pi * f * k * (1 + 0.01 * r.standard_normal()) * t) * np.exp(-t * (18 + 6 * k)) / k for k in (1, 2.71, 4.2))
    return y / (np.abs(y).max() + 1e-9)


def tick(dur=0.03):
    t = T(dur)
    return np.sin(2 * np.pi * 2400 * t) * np.exp(-t * 160)


def sfx():
    buf = np.zeros((N, 2))
    for at in (2.96, 11.7, 14.54, 17.76, 25.3, 29.9, 32.3, 39.08, 43.9, 51.4, 57.08, 62.74, 69.2):
        place(buf, whoosh(0.5) * 0.33, at - 0.25)
    # ring shimmer
    place(buf, sparkle(0.9, 18, False, 1) * 0.28, 2.04)
    place(buf, chime((84, 88, 91)) * 0.25, 2.1)
    # magic swirl into the earth
    place(buf, sparkle(1.3, 34, True, 2) * 0.32, 6.3)
    place(buf, whoosh(0.9, 300, 6000, rev=True) * 0.25, 6.7)
    place(buf, whoosh(1.4, 2500, 250) * 0.3, 7.6)  # dive down through the layers
    place(buf, chime((79, 84, 88, 91)) * 0.33, 10.0)  # gold veins glow
    place(buf, sparkle(1.0, 20, False, 3) * 0.25, 10.1)
    # panning: water sloshes in the dulang
    place(buf, slosh(2.6) * 0.12, 11.9, pan=-0.1)
    place(buf, slosh(7.4) * 0.16, 17.8, pan=0.1)
    place(buf, sparkle(0.8, 14, False, 4) * 0.18, 16.0)
    for k in range(5):
        place(buf, bloop(520 - k * 30, 170, 0.28) * 0.18, 19.6 + k * 0.22, pan=float(rs.uniform(-0.3, 0.3)))
    place(buf, chime((84, 88, 91)) * 0.28, 20.7)
    place(buf, whoosh(1.6, 400, 2200) * 0.3, 23.1)  # sand washed out
    # mine: digger and crusher
    tt = 29.9
    i = 0
    while tt < 32.3:
        place(buf, crunch(0.16, i) * 0.3, tt, pan=float(rs.uniform(-0.2, 0.2)))
        tt += 0.27
        i += 1
    place(buf, thud() * 0.5, 33.05)  # rock lands on the balance
    for k in range(3):
        place(buf, pop(300 - k * 40, 250, 0.2) * 0.12, 33.2 + k * 0.32)  # creak / wobble
    tt = 34.7
    while tt < 35.6:  # crumble
        place(buf, crunch(0.1, int(tt * 100)) * 0.2, tt, pan=float(rs.uniform(-0.5, 0.5)))
        tt += 0.045
    place(buf, thud(0.4) * 0.3, 35.3)
    place(buf, sparkle(1.0, 18, True, 5) * 0.3, 35.9)
    place(buf, chime((84, 88, 91, 96)) * 0.38, 35.95)
    place(buf, chime((79, 83, 86)) * 0.25, 37.16)
    place(buf, chime((76, 79, 84)) * 0.28, 42.6)  # jarang!
    # pools filling with gold: rising sparkle + coin clinks
    place(buf, sparkle(4.8, 60, True, 6) * 0.22, 44.8)
    r = np.random.default_rng(9)
    tt = 44.8
    while tt < 49.7:
        place(buf, clink(2600 + r.random() * 1800, int(tt * 10)) * 0.12, tt, pan=float(r.uniform(-0.6, 0.6)))
        tt += 0.08 + r.random() * 0.12
    for k in range(4):
        place(buf, pop(700 + 120 * k, 400, 0.14) * 0.35, 49.54 + k * 0.18)
    place(buf, chime((84, 88, 91, 96)) * 0.35, 50.3)
    # rust vs gold: a clock ticking through the years
    tt = 53.2
    while tt < 56.4:
        place(buf, tick() * 0.25, tt, pan=0.2)
        tt += 0.16
    place(buf, chime((84, 88, 91)) * 0.3, 53.98)
    # crowd footsteps, then ka-ching
    for k in range(14):
        place(buf, pop(260, 160, 0.08) * 0.14, 57.1 + k * 0.11 + 0.03 * (k % 3), pan=float(rs.uniform(-0.7, 0.7)))
    place(buf, chime((91, 96), 0.06) * 0.4, 61.98)
    place(buf, clink(3400, 3) * 0.3, 61.98)
    place(buf, clink(2800, 4) * 0.25, 62.05)
    # label pops
    for at in (0.12, 0.45, 2.98, 3.9, 4.1, 4.56, 7.52, 9.04, 9.92, 11.7, 12.94, 13.8, 15.9, 17.02, 18.62, 20.14, 22.06, 23.74, 25.32, 26.58, 28.72, 30.14, 31.02,
               32.32, 33.44, 33.84, 37.16, 39.1, 41.5, 45.42, 49.92, 51.5, 52.44, 53.2, 57.08, 58.0, 59.52, 60.76, 62.76, 64.42, 66.38, 67.16, 69.5, 69.8, 70.1, 72.3, 72.5, 72.7):
        place(buf, pop() * 0.3, at, pan=float(rs.uniform(-0.3, 0.3)))
    for at in (53.5, 64.82, 66.5):
        place(buf, nope() * 0.24, at)
    place(buf, sparkle(1.0, 24, False, 8) * 0.3, 72.0)
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
