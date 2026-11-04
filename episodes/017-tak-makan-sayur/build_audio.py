#!/usr/bin/env python3
"""Soundtrack for Episode 017, synthesised from scratch (no samples, no
licensed music) and mixed under the narration.

Layers: a bouncy music-box hook at the dinner table, a bright marimba band in
the giant vegetable garden, a comic minor shuffle for the blocked tummy, a
soft night pad when the lights go down for the carrot, a slowing "tired"
pad, then the band again for the happy ending. SFX: whooshes on cuts, a
magic sparkle swirl into the garden, label pops, a broom swish, tummy
rumbles, germ pops, a draining battery, crunchy bites and discovery chimes.
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
DUR = 59.6
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


def boing(dur=0.45):
    t = T(dur)
    f = 220 + 160 * np.sin(2 * np.pi * 9 * t) * np.exp(-t * 6) + 180 * t
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 6)


# ------------------------------------------------------------------ layers
CUTS = (4.7, 8.5, 10.4, 13.4, 19.45, 27.1, 32.35, 36.8, 41.35, 46.55, 51.1, 53.7, 56.95)


def band(buf, t0, t1, chords, bpm=112, gain=1.0, arp=True, drums=True):
    beat = 60 / bpm
    bar = beat * 4
    arp_pat = [0, 1, 2, 1, 0, 2, 1, 2]
    i = 0
    while t0 < t1 - 0.05:
        root, ch = chords[i % len(chords)]
        place(buf, pad([midi(n) for n in ch], max(1.5, min(bar, t1 - t0) + 0.6)) * 0.1 * gain, t0)
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


def slow_pad(buf, t0, t1, chords, step=1.6, gain=0.16, box=0.1):
    i = 0
    while t0 < t1 - 0.05:
        root, ch = chords[i % len(chords)]
        place(buf, pad([midi(n) for n in ch], max(1.5, min(step, t1 - t0) + 0.7)) * gain, t0)
        for k in range(4):
            if box and t0 + k * step / 4 < t1:
                place(buf, musicbox(midi(ch[k % len(ch)] + 12), 1.6) * box, t0 + k * step / 4, pan=-0.4 + 0.25 * k)
        place(buf, bass(midi(root - 12), step) * 0.18, t0)
        t0 += step
        i += 1


def music():
    buf = np.zeros((N, 2))
    C = [(48, [64, 67, 72]), (43, [62, 67, 71]), (45, [64, 69, 72]), (41, [65, 69, 72])]
    Am = [(45, [60, 64, 69]), (40, [59, 64, 68]), (45, [60, 64, 69]), (38, [62, 65, 69])]
    beat = 60 / 112
    bar = beat * 4
    # dinner table hook: bouncy music box + plucked bass
    t0, i = 0.0, 0
    while t0 < 10.4:
        root, ch = C[i % 4]
        place(buf, pad([midi(n) for n in ch], bar + 0.6) * 0.12, t0)
        for k, step in enumerate([0, 2, 1, 2, 0, 2, 1, 2]):
            place(buf, musicbox(midi(ch[step] + 12), 1.0) * 0.1, t0 + k * beat / 2, pan=0.3 * ((k % 2) * 2 - 1))
        for k in (0, 2):
            place(buf, bass(midi(root - 12) if k == 0 else midi(root - 5), 0.4) * 0.26, t0 + k * beat)
        t0 += bar
        i += 1
    band(buf, 10.4, 19.45, C)  # the garden
    band(buf, 19.45, 27.1, Am, bpm=96, gain=0.8, arp=False)  # blocked tummy: comic minor shuffle
    band(buf, 27.1, 32.35, C, gain=1.0)  # vitamin C heroes
    slow_pad(buf, 32.35, 36.8, Am, 1.5, 0.15, 0.0)  # weak soldiers
    slow_pad(buf, 36.8, 41.35, [(45, [64, 69, 72, 76]), (41, [65, 69, 72, 77]), (43, [67, 71, 74, 79]), (48, [64, 67, 72, 79])], 1.4, 0.16, 0.1)  # night vision
    band(buf, 41.35, 43.4, C, gain=0.9)  # spinach
    slow_pad(buf, 43.4, 46.55, Am, 1.6, 0.13, 0.0)  # tired
    band(buf, 46.55, 56.95, C, gain=1.0)  # happy ending
    # outro sting
    place(buf, pad([midi(n) for n in (48, 60, 64, 67, 72)], 3.0) * 0.2, 56.95)
    for k, m in enumerate([72, 76, 79, 84]):
        place(buf, pluck_bell(midi(m), 2.5) * 0.12, 57.0 + k * 0.12, pan=-0.3 + 0.2 * k)
    place(buf, bass(midi(36), 2.0) * 0.3, 56.95)
    fade = int(1.2 * SR)
    buf[-fade:] *= np.linspace(1, 0, fade)[:, None]
    return buf


def chirp(f0=3200, dur=0.09):
    t = T(dur)
    f = f0 * (1 + 0.35 * np.sin(np.pi * t / dur))
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * t / dur) ** 2


def noise_bed(a, b, lo=250, hi=900, gain=0.35, gust=0.4):
    n = int((b - a) * SR)
    w = svf(rs.standard_normal(n), lo, hi, q=0.5)
    w /= np.abs(w).max() + 1e-9
    k = np.linspace(0, 1, n)
    w *= np.minimum(1, np.minimum(k * (b - a) / 0.6, (1 - k) * (b - a) / 0.6)) * (1 - gust + gust * np.sin(np.linspace(0, 9, n)) ** 2)
    return w * gain


def birds(buf, a, b, seed=9, gain=0.18):
    tt = a + 0.3
    r = np.random.default_rng(seed)
    while tt < b - 0.4:
        for j in range(2 + int(r.random() * 2)):
            place(buf, chirp(2800 + 900 * r.random()) * gain, tt + j * 0.12, pan=float(r.uniform(-0.7, 0.7)))
        tt += 0.8 + r.random() * 0.9


def ambience():
    buf = np.zeros((N, 2))
    for a, b in ((0, 10.4), (51.1, 56.95)):  # home: quiet room tone
        place(buf, noise_bed(a, b, 200, 400, 0.12, 0.1), a)
    place(buf, noise_bed(10.4, 51.1, 300, 600, 0.22), 10.4)  # garden breeze
    birds(buf, 10.4, 36.8, 9)
    birds(buf, 41.35, 51.1, 10, 0.14)
    return buf


def rumble(dur=0.9, seed=1):
    """Tummy grumble: a wobbling low tone through a low-pass."""
    t = T(dur)
    f = 70 + 25 * np.sin(2 * np.pi * 7 * t + seed) + 30 * np.sin(2 * np.pi * 1.3 * t)
    y = np.sin(2 * np.pi * np.cumsum(f) / SR) + 0.4 * np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR))
    y = onepole(y, 400) * np.sin(np.pi * t / dur) ** 1.5
    return y / (np.abs(y).max() + 1e-9)


def crunch(dur=0.12):
    x = rs.standard_normal(int(dur * SR))
    y = svf(x, 1800, 900, q=1.2) * np.exp(-np.arange(len(x)) / SR * 30)
    return y / (np.abs(y).max() + 1e-9)


def tick(f=1800):
    t = T(0.05)
    return np.sin(2 * np.pi * f * t) * np.exp(-t * 90)


def sfx():
    buf = np.zeros((N, 2))
    for at in CUTS:
        place(buf, whoosh(0.5) * 0.3, at - 0.25)
    place(buf, boing() * 0.22, 0.16)  # "Eee!"
    place(buf, whoosh(0.35, 600, 2000) * 0.2, 1.0)  # plate pushed away
    place(buf, sparkle(1.2, 30, True, 2) * 0.3, 9.3)  # magic swirl into the garden
    place(buf, sparkle(0.9, 20, False, 3) * 0.22, 10.45)
    # broom sweeping the gut
    for i in range(6):
        place(buf, whoosh(0.22, 1500, 4000) * 0.16, 17.45 + i * 0.3, pan=-0.3 + 0.12 * i)
    # tummy rumbles
    for at, s in ((21.3, 1), (23.6, 2), (24.5, 3)):
        place(buf, rumble(0.9, s) * 0.32, at)
    # germ pops as the soldiers win
    for i in range(3):
        place(buf, pop(1800, 600, 0.1) * 0.35, 31.55 + i * 0.12, pan=0.4)
    # battery draining
    for i in range(5):
        place(buf, tick(1400 * 2 ** (-i * 2 / 12)) * 0.28, 43.6 + i * 0.55, pan=0.1)
    # crunchy broccoli bites
    for i in range(5):
        place(buf, crunch() * 0.22, 51.75 + i * 0.17)
    # label pops
    for at in (0.2, 0.88, 3.04, 3.3, 4.85, 5.1, 6.5, 7.0, 8.55, 8.6, 11.28, 13.9, 15.84, 18.64, 19.57, 21.12, 23.64, 24.4, 25.2,
               28.44, 28.6, 28.75, 30.6, 31.2, 32.43, 33.64, 34.0, 34.5, 35.0, 35.36, 36.87, 37.84, 39.4, 40.0, 41.44, 43.42,
               47.6, 47.76, 47.92, 48.08, 48.24, 48.4, 48.68, 51.6, 51.92, 52.48, 53.9, 54.2, 54.48, 55.6, 57.25, 57.45, 57.65):
        place(buf, pop() * 0.3, at, pan=float(rs.uniform(-0.3, 0.3)))
    # discovery cues
    for at, notes in ((13.9, (79, 84)), (26.2, (72, 67)), (29.2, (84, 88, 91)), (37.84, (81, 86, 89)), (42.44, (84, 88, 91)),
                      (46.64, (84, 88, 91, 96)), (50.24, (79, 84, 88, 91, 96))):
        place(buf, chime(notes, 0.07) * 0.32, at)
    for at, seed in ((11.3, 6), (39.4, 7), (46.6, 8), (56.95, 11)):
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
