#!/usr/bin/env python3
"""Soundtrack for Episode 014, synthesised from scratch (no samples, no
licensed music) and mixed under the narration.

Layers: original music bed (soft music box for the hook, a gentle marimba
band through the rainy days that turns darker on days 5 and 10, then a bright
reprise when the rain stops), rain ambience that follows the storm, soft
thunder, a landslide rumble, mosquito buzz, birdsong when the sun returns,
whooshes on cuts, calendar flips, label pops and discovery chimes. The music
is ducked under the voice and the final mix is normalised to -14 LUFS /
-1.5 dBTP for social platforms.

    python3 build_audio.py            # -> output/mix.wav (+ stems in output/stems)
Requires numpy and ffmpeg.
"""
import os
import subprocess
import sys

import numpy as np

SR = 44100
DUR = 60.0
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
CUTS = (6.0, 8.75, 10.2, 12.75, 17.15, 18.65, 23.2, 25.15, 26.75, 28.3, 30.3, 33.35, 36.2, 37.75, 40.35, 42.05, 43.95, 46.65, 49.45, 50.45, 54.75)
DAYS = (8.8, 17.2, 26.8, 36.16)
RELIEF, OUTRO = 43.9, 57.25


def keys(t, ks):
    return np.interp(t, [k[0] for k in ks], [k[1] for k in ks])


def band_noise(n, lo, hi, seed=0, tilt=0.0):
    """White noise band-limited in the frequency domain (fast, no loops)."""
    r = np.random.default_rng(seed)
    x = r.standard_normal(n)
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(n, 1 / SR)
    shape = ((f > lo) & (f < hi)).astype(float)
    shape = np.convolve(shape, np.hanning(401) / np.hanning(401).sum(), mode="same")
    shape *= (np.maximum(f, 20) / 1000.0) ** tilt
    y = np.fft.irfft(X * shape, n)
    return y / (np.abs(y).max() + 1e-9)


def music():
    buf = np.zeros((N, 2))
    bpm = 100
    beat = 60 / bpm
    bar = beat * 4
    bright = [(53, [65, 69, 72]), (48, [64, 67, 72]), (50, [65, 69, 74]), (46, [65, 70, 74])]  # F C Dm Bb
    dark = [(50, [62, 65, 69]), (46, [62, 65, 70]), (53, [60, 65, 69]), (48, [60, 64, 67])]  # Dm Bb F C
    arp_pat = [0, 1, 2, 1, 0, 2, 1, 2]
    # hook: soft pad + music box
    t0, i = 0.0, 0
    while t0 < 8.75:
        root, ch = bright[i % 4]
        place(buf, pad([midi(n) for n in ch], bar + 0.6) * 0.15, t0)
        for k, step in enumerate([0, 2, 1, 2]):
            place(buf, musicbox(midi(ch[step] + 12)) * 0.12, t0 + k * beat, pan=0.3 * ((k % 2) * 2 - 1))
        t0 += bar
        i += 1
    # the rainy days: marimba band, darker from day 5
    t0, i = 8.75, 0
    while t0 < RELIEF:
        chords = bright if t0 < 26.75 else dark
        root, ch = chords[i % 4]
        place(buf, pad([midi(n) for n in ch], bar + 0.6) * 0.11, t0)
        for k in range(8):
            n = ch[arp_pat[k]] + 12
            place(buf, marimba(midi(n)) * (0.18 if t0 < 26.75 else 0.14), t0 + k * beat / 2, pan=-0.35 + 0.1 * k)
        for k in (0, 2):
            place(buf, bass(midi(root - 12) if k == 0 else midi(root - 5), 0.6) * 0.3, t0 + k * beat)
        for k in range(8):
            place(buf, shaker() * (0.45 if k % 2 else 0.25), t0 + k * beat / 2, pan=0.4)
        t0 += bar
        i += 1
    # relief: warm pad, then a bright reprise once the rain stops
    t0, i = RELIEF, 0
    while t0 < OUTRO:
        root, ch = bright[i % 4]
        place(buf, pad([midi(n) for n in ch], bar + 0.6) * 0.14, t0)
        if t0 >= 49.0:
            for k in range(8):
                place(buf, marimba(midi(ch[arp_pat[k]] + 12)) * 0.16, t0 + k * beat / 2, pan=0.25 * ((k % 2) * 2 - 1))
        else:
            for k in range(4):
                place(buf, musicbox(midi(ch[[0, 2, 1, 2][k]] + 12)) * 0.1, t0 + k * beat)
        place(buf, bass(midi(root - 12), 0.9) * 0.25, t0)
        t0 += bar
        i += 1
    # outro sting
    place(buf, pad([midi(n) for n in (53, 65, 69, 72, 77)], 3.0) * 0.2, OUTRO)
    for k, m in enumerate([77, 81, 84, 89]):
        place(buf, pluck_bell(midi(m), 2.5) * 0.12, OUTRO + 0.05 + k * 0.12, pan=-0.3 + 0.2 * k)
    place(buf, bass(midi(41), 2.0) * 0.3, OUTRO)
    fade = int(1.2 * SR)
    buf[-fade:] *= np.linspace(1, 0, fade)[:, None]
    return buf


def ambience():
    buf = np.zeros((N, 2))
    t = np.arange(N) / SR
    amt = keys(t, [(0, 0.45), (8.8, 0.55), (17.2, 0.75), (26.8, 0.95), (46.6, 1.0), (48.6, 0.3), (49.6, 0.0)])
    hiss = [band_noise(N, 1500, 11000, s, -0.3) for s in (1, 2)]
    body = [band_noise(N, 250, 2500, s) for s in (3, 4)]
    # individual drops pattering on roofs and water
    drops = np.zeros(N)
    r = np.random.default_rng(9)
    for k in r.uniform(0, DUR, 3200):
        f = r.uniform(1800, 5200)
        s = np.sin(2 * np.pi * f * T(0.02)) * np.exp(-T(0.02) * 300) * r.uniform(0.2, 1)
        i = int(k * SR)
        if amt[min(i, N - 1)] > r.random():
            drops[i : i + len(s)] += s[: N - i]
    drops /= np.abs(drops).max() + 1e-9
    for c in (0, 1):
        buf[:, c] = (hiss[c] * 0.55 + body[c] * 0.45) * amt + drops * 0.25 * amt
    # birdsong once the sun is out
    for k in np.arange(49.9, 57.0, 0.55):
        d = 0.12 + r.random() * 0.1
        tt = T(d)
        f = 3200 + 900 * np.sin(2 * np.pi * (6 + r.random() * 6) * tt) + 1200 * tt / d
        s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * tt / d)
        place(buf, s * 0.18, k + r.random() * 0.2, pan=float(r.uniform(-0.7, 0.7)))
    return buf


def thunder(dur=2.6, seed=0):
    n = int(dur * SR)
    y = band_noise(n, 25, 260, seed)
    t = T(dur)
    e = (1 - np.exp(-t * 30)) * np.exp(-t * 1.7) * (1 + 0.5 * np.sin(2 * np.pi * 3 * t))
    return y * e


def rumble(dur=1.6, seed=5):
    n = int(dur * SR)
    t = T(dur)
    y = band_noise(n, 30, 500, seed) * np.sin(np.pi * t / dur) ** 0.6
    y += band_noise(n, 600, 2500, seed + 1) * 0.25 * (np.random.default_rng(seed).random(n) < 0.002).astype(float).cumsum() % 2
    return y / (np.abs(y).max() + 1e-9)


def buzz(dur, seed=0):
    t = T(dur)
    f = 620 + 60 * np.sin(2 * np.pi * 3.3 * t) + 40 * np.sin(2 * np.pi * 7.1 * t + seed)
    ph = 2 * np.pi * np.cumsum(f) / SR
    y = 2 * (ph / (2 * np.pi) % 1) - 1
    y = np.convolve(y, np.ones(6) / 6, mode="same")
    return y * (0.5 + 0.5 * np.sin(2 * np.pi * 0.9 * t + seed)) * np.sin(np.pi * t / dur) ** 0.3


def flip():
    out = whoosh(0.22, 1200, 4000) * 0.6
    tick = pop(1800, 900, 0.05)
    out[: len(tick)] += tick * 0.5
    return out


def sfx():
    buf = np.zeros((N, 2))
    for at in CUTS:
        place(buf, whoosh(0.5) * 0.3, at - 0.25)
    place(buf, whoosh(1.4, 200, 5000) * 0.3, 6.6)  # crane up
    place(buf, sparkle(1.2, 30, True, 2) * 0.28, 7.4)
    for d in DAYS:
        place(buf, flip() * 0.5, d - 0.05)
        place(buf, chime((79, 84, 88)) * 0.3, d + 0.1)
    # car through puddles
    place(buf, whoosh(2.4, 400, 1600) * 0.35, 13.6, pan=-0.2)
    place(buf, whoosh(0.9, 2000, 600) * 0.3, 15.88)  # flash flood surge
    place(buf, thunder(2.8, 1) * 0.6, 26.9)
    place(buf, thunder(3.0, 2) * 0.75, 36.25)
    place(buf, thunder(2.4, 3) * 0.5, 40.5)
    place(buf, rumble(1.5) * 0.7, 32.1)  # landslide
    for k, s in enumerate((0, 2, 4)):
        place(buf, buzz(1.7, s) * 0.08, 42.15 + k * 0.05, pan=(-0.6, 0.0, 0.6)[k])
    for at in (0.12, 0.5, 7.36, 10.35, 13.12, 15.88, 16.0, 18.8, 20.4, 21.36, 23.3, 28.5, 29.52, 31.52, 32.44, 34.64, 38.0, 39.36, 40.4, 41.16, 42.16, 42.84, 44.0, 46.76, 52.88, 54.95, 55.3, 55.65, 57.55, 57.75, 57.95):
        place(buf, pop() * 0.3, at, pan=float(rs.uniform(-0.3, 0.3)))
    for at in (25.92, 41.0, 51.36):
        place(buf, nope() * 0.3, at)
    place(buf, boing() * 0.2, 44.05)
    place(buf, chime((84, 88, 91, 96), 0.07) * 0.42, 49.52)
    place(buf, sparkle(0.9, 20, False, 6) * 0.25, 49.55)
    place(buf, sparkle(1.0, 24, False, 8) * 0.3, OUTRO)
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
    mix = v * 1.0 + m * 0.5 + a * 0.1 + s * 0.55
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
