#!/usr/bin/env python3
"""Soundtrack for Episode 010, synthesised from scratch (no samples, no
licensed music) and mixed under the narration.

Layers: light cheerful original music (bathroom bounce, dreamy Tooth City,
playful bedtime-routine groove, short brand jingle), bathroom room tone,
gentle microscopic bubbling, and sound effects: label pops, magnifier magic
and shrinking whoosh, soft bacteria boops, sugar tinkles, gentle acid fizz,
soft brushing swish, fluoride shimmer, clock ticks, sun/moon chimes, a tiny
spit plop and a clean-teeth sparkle. Nothing scary, loud or harsh. The music
is ducked under the voice and the mix is normalised to -14 LUFS / -1.5 dBTP.

    python3 build_audio.py            # -> output/mix.wav (+ stems in output/stems)
Requires numpy and ffmpeg.
"""
import os
import subprocess
import sys

import numpy as np

SR = 44100
DUR = 50.4
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "output")
N = int(SR * DUR)
rs = np.random.default_rng(10)


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
CITY = (6.9, 28.8)


def music():
    buf = np.zeros((N, 2))
    bpm = 112
    beat = 60 / bpm
    bar = beat * 4
    # C  Am  F  G  (I vi IV V) in C major
    chords = [(48, [60, 64, 67]), (45, [60, 64, 69]), (41, [60, 65, 69]), (43, [59, 62, 67])]
    # bathroom hook: bouncy marimba + bass (0 - 5.0)
    t0, i = 0.0, 0
    while t0 < 5.0:
        root, ch = chords[i % 4]
        place(buf, pad([midi(n) for n in ch], bar + 0.4) * 0.08, t0)
        for k, step in enumerate([0, 2, 1, 2, 0, 2, 1, 2]):
            place(buf, marimba(midi(ch[step] + 12)) * 0.16, t0 + k * beat / 2, pan=0.3 * ((k % 2) * 2 - 1))
        place(buf, bass(midi(root - 12), 0.5) * 0.28, t0)
        place(buf, bass(midi(root - 5), 0.4) * 0.22, t0 + 2 * beat)
        t0 += bar
        i += 1
    # magic: rising pad into the shrink (5.0 - 6.9)
    place(buf, pad([midi(n) for n in (60, 67, 72, 76)], 2.2) * 0.16, 5.0)
    # Tooth City: dreamy music box + soft pad + light marimba (6.9 - 28.8)
    t0, i = CITY[0], 0
    while t0 < CITY[1]:
        root, ch = chords[i % 4]
        place(buf, pad([midi(n) for n in ch], bar + 0.6) * 0.12, t0)
        for k, step in enumerate([0, 1, 2, 1, 2, 1, 0, 2]):
            place(buf, musicbox(midi(ch[step] + 24)) * 0.08, t0 + k * beat / 2, pan=-0.4 + 0.1 * k)
        if 21.6 <= t0 or t0 < 11.5:
            for k in (0, 2):
                place(buf, bass(midi(root - 12), 0.6) * 0.24, t0 + k * beat)
        t0 += bar
        i += 1
    # back home: playful routine groove with shaker (28.8 - 45.9)
    t0, i = 28.8, 0
    while t0 < 45.9:
        root, ch = chords[i % 4]
        place(buf, pad([midi(n) for n in ch], bar + 0.5) * 0.08, t0)
        for k in range(8):
            place(buf, marimba(midi(ch[[0, 2, 1, 2, 0, 1, 2, 1][k]] + 12)) * 0.14, t0 + k * beat / 2, pan=-0.3 + 0.08 * k)
        for k in (0, 2):
            place(buf, bass(midi(root - 12) if k == 0 else midi(root - 5), 0.5) * 0.26, t0 + k * beat)
        for k in range(8):
            place(buf, shaker() * (0.4 if k % 2 else 0.22), t0 + k * beat / 2, pan=0.4)
        t0 += bar
        i += 1
    # brand jingle: original 5-note motif, then a bright C major chord (45.9 - 50.4)
    for k, (m, d) in enumerate([(67, 0.0), (72, 0.16), (76, 0.32), (74, 0.48), (79, 0.7)]):
        place(buf, pluck_bell(midi(m + 12), 1.6) * 0.16, 45.95 + d, pan=-0.3 + 0.15 * k)
        place(buf, marimba(midi(m)) * 0.2, 45.95 + d)
    place(buf, pad([midi(n) for n in (48, 60, 64, 67, 72)], 3.6) * 0.2, 46.7)
    for k, m in enumerate([84, 88, 91, 96]):
        place(buf, pluck_bell(midi(m), 2.4) * 0.1, 46.75 + k * 0.1, pan=-0.3 + 0.2 * k)
    place(buf, bass(midi(36), 2.2) * 0.3, 46.7)
    fade = int(1.0 * SR)
    buf[-fade:] *= np.linspace(1, 0, fade)[:, None]
    return buf


def ambience():
    buf = np.zeros((N, 2))
    # bathroom room tone: very soft airy noise
    room = onepole(rs.standard_normal(N), 900)
    room /= np.abs(room).max()
    # Tooth City: gentle microscopic bubbling
    bub = np.zeros(N)
    r = np.random.default_rng(3)
    tt = CITY[0]
    while tt < CITY[1]:
        f0 = 300 + r.random() * 500
        b = pop(f0, f0 * 1.8, 0.07) * (0.3 + 0.7 * r.random())
        k = int(tt * SR)
        bub[k:k + len(b)] += b[: N - k]
        tt += 0.05 + r.random() * 0.18
    lvl_room = np.zeros(N)
    lvl_city = np.zeros(N)
    for a, b in [(0, 6.9), (28.8, 45.9)]:
        lvl_room[int(a * SR):int(b * SR)] = 1
    lvl_city[int(CITY[0] * SR):int(CITY[1] * SR)] = 1
    lvl_room = onepole(lvl_room, 3)
    lvl_city = onepole(lvl_city, 3)
    mono = room * 0.25 * lvl_room + bub * 0.35 * lvl_city
    buf[:, 0] = mono
    buf[:, 1] = np.roll(mono, 41)
    return buf


def fizz(dur=2.5, seed=4):
    """Soft, tiny effervescence (acid), kept gentle and high."""
    r = np.random.default_rng(seed)
    out = np.zeros(int(dur * SR))
    for _ in range(int(dur * 60)):
        t = T(0.012)
        s = np.sin(2 * np.pi * (3000 + r.random() * 4000) * t) * np.exp(-t * 400) * r.random()
        k = int(r.random() * (len(out) - len(s)))
        out[k:k + len(s)] += s
    out *= np.sin(np.linspace(0, np.pi, len(out))) ** 0.5
    return out / (np.abs(out).max() + 1e-9)


def brushing(dur, rate=1.7, seed=6):
    """Soft bristle swish: band-passed noise breathing at the brushing rate."""
    r = np.random.default_rng(seed)
    x = svf(r.standard_normal(int(dur * SR)), 3500, 3500, q=1.2)
    t = T(dur)
    env = 0.25 + 0.75 * np.abs(np.sin(np.pi * rate * t)) ** 2
    y = x * env * np.minimum(1, t / 0.15) * np.minimum(1, (dur - t) / 0.2)
    return y / (np.abs(y).max() + 1e-9)


def tick():
    t = T(0.03)
    return np.sin(2 * np.pi * 2400 * t) * np.exp(-t * 300)


def boop(f=520):
    return pop(f * 0.8, f * 1.25, 0.16)


def plop():
    t = T(0.18)
    f = 900 * np.exp(-t * 18) + 250
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 22)


def squeeze():
    x = svf(rs.standard_normal(int(0.5 * SR)), 300, 900, q=2.0)
    return x * np.sin(np.linspace(0, np.pi, len(x))) / (np.abs(x).max() + 1e-9)


def sfx():
    buf = np.zeros((N, 2))
    P = lambda at, g=0.3: place(buf, pop() * g, at, pan=float(rs.uniform(-0.3, 0.3)))
    # S1 hook
    for at in (0.12, 0.5, 3.2, 3.45):
        P(at)
    place(buf, sparkle(0.5, 12, False, 2) * 0.3, 1.4)
    # S2 magnifier + shrink
    place(buf, whoosh(0.35, 600, 2400) * 0.25, 5.05)
    place(buf, sparkle(0.9, 22, True, 3) * 0.28, 5.4)
    place(buf, whoosh(1.0, 5000, 250) * 0.3, 5.85)
    place(buf, sparkle(1.0, 30, True, 4) * 0.3, 5.9)
    # S3 Tooth City reveal
    place(buf, sparkle(0.8, 20, False, 5) * 0.3, 6.9)
    place(buf, whoosh(1.4, 200, 2500) * 0.22, 7.0)
    place(buf, chime((79, 84, 88)) * 0.25, 7.05)
    P(10.92, 0.35)
    # bacteria pop out (soft boops), tag
    for i in range(8):
        place(buf, boop(480 + 60 * i) * 0.13, 12.45 + i * 0.06, pan=-0.5 + 0.13 * i)
    P(12.8)
    # sugar tinkles, munching, fizz
    for i in range(9):
        place(buf, pluck_bell(midi(96 + (i % 3) * 2), 0.5) * 0.07, 14.15 + i * 0.11, pan=-0.4 + 0.1 * i)
    for i in range(10):
        place(buf, pop(700, 600, 0.05) * 0.12, 15.55 + i * 0.09, pan=float(rs.uniform(-0.4, 0.4)))
    place(buf, fizz(3.3) * 0.12, 16.5)
    P(15.3)
    P(15.7)
    P(16.8)
    P(17.16)
    P(17.8)
    for i in range(12):
        place(buf, tick() * 0.25, 18.0 + i * 0.1)
    # S6 alamak
    place(buf, boing() * 0.18, 19.4)
    P(19.45, 0.32)
    P(20.5)
    P(20.7)
    # S7 idea + brush arrives
    place(buf, chime((84, 88, 91, 96), 0.06) * 0.3, 21.7)
    place(buf, whoosh(1.4, 3000, 400) * 0.28, 21.8)
    P(22.6)
    # S8 gentle brushing
    place(buf, brushing(1.55) * 0.22, 23.3)
    for i in range(10):
        place(buf, pop(1200, 1500, 0.04) * 0.08, 23.5 + i * 0.13, pan=float(rs.uniform(-0.5, 0.5)))
    # S9 fluoride shimmer
    place(buf, sparkle(2.5, 40, False, 9) * 0.16, 25.0)
    P(25.48)
    P(26.1)
    place(buf, chime((86, 91)) * 0.22, 27.1)
    # back to the bathroom
    place(buf, sparkle(0.7, 22, True, 10) * 0.25, 28.2)
    place(buf, whoosh(0.7, 300, 4000, rev=True) * 0.25, 28.3)
    place(buf, brushing(5.2, 1.7, 11) * 0.12, 28.95)
    for i in range(int((34.1 - 30.3) / 0.5)):
        place(buf, tick() * 0.2, 30.3 + i * 0.5)
    P(30.3)
    place(buf, chime((84, 91)) * 0.22, 31.1)
    place(buf, chime((79, 86)) * 0.22, 31.35)
    P(31.15)
    place(buf, chime((76, 83, 88)) * 0.2, 33.18)
    P(33.18)
    # pea-sized paste
    place(buf, whoosh(0.4, 500, 1500) * 0.18, 34.1)
    place(buf, squeeze() * 0.12, 34.5)
    place(buf, pop(300, 500, 0.12) * 0.2, 35.25)
    P(35.32)
    P(35.6)
    # parents
    place(buf, whoosh(0.4, 500, 1500) * 0.18, 36.6)
    P(37.04)
    P(37.3)
    # spit (tiny, soft) and no rinsing
    place(buf, whoosh(0.35, 500, 1500) * 0.16, 38.35)
    place(buf, plop() * 0.2, 39.4)
    P(39.08)
    place(buf, nope() * 0.22, 39.75)
    # yeay + clean sparkle + thumbs up
    P(40.95, 0.32)
    place(buf, sparkle(0.9, 20, False, 12) * 0.25, 40.95)
    place(buf, sparkle(0.5, 14, True, 13) * 0.32, 42.05)
    place(buf, chime((88, 91, 96), 0.07) * 0.28, 42.95)
    for at in (44.0, 44.3, 44.6):
        P(at)
    # outro
    place(buf, sparkle(1.2, 26, False, 14) * 0.25, 45.9)
    for at in (46.2, 46.4, 46.6, 47.2):
        P(at, 0.26)
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
