#!/usr/bin/env python3
"""Soundtrack for Episode 022, synthesised from scratch (no samples, no
licensed music, no paid generation) and mixed under Affan's narration.

Layers: an upbeat original groove (124 bpm: kick, clap, hats, bouncy bass,
marimba riff, bells), a quiet mysterious break for the night/watermark scene,
and SFX that follow the pictures: whooshes on cuts, label pops, cotton plops,
paper-mill rumble, press clanks and layer dings, numbering stamps, guillotine
chops, scanner beeps, the van, and a coin "cha-ching" into the piggy bank.
The music is ducked under the voice and the final mix is normalised to
-14 LUFS / -1.5 dBTP.

    python3 build_audio.py            # -> output/mix.wav (+ stems in output/stems)
Requires numpy and ffmpeg.
"""
import os
import subprocess
import sys

import numpy as np

SR = 44100
DUR = 72.0
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "output")
N = int(SR * DUR)
rs = np.random.default_rng(22)

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

# ------------------------------------------------------------ drums & extra
def kick(dur=0.32):
    t = T(dur)
    f = 50 + 110 * np.exp(-t * 32)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 9) * 1.1


def clap(dur=0.22):
    t = T(dur)
    n = rs.standard_normal(len(t))
    e = np.exp(-t * 28) + 0.6 * np.exp(-np.maximum(t - 0.012, 0) * 40) * (t > 0.012) + 0.4 * np.exp(-np.maximum(t - 0.024, 0) * 30) * (t > 0.024)
    y = svf(n, 1400, 1100, q=1.2) * e
    return y / (np.abs(y).max() + 1e-9)


def hat(dur=0.05, open_=False):
    t = T(0.22 if open_ else dur)
    n = np.diff(rs.standard_normal(len(t)), prepend=0)
    n = np.diff(n, prepend=0)
    return n * np.exp(-t * (16 if open_ else 90)) * 0.18


def pluck_bass(f, dur=0.3):
    t = T(dur)
    y = np.sin(2 * np.pi * f * t) + 0.45 * np.sin(4 * np.pi * f * t) * np.exp(-t * 10) + 0.2 * np.sin(6 * np.pi * f * t) * np.exp(-t * 18)
    return y * np.exp(-t * 7) * env_adsr(len(t), 0.004, 0.03, 1, 0.04)


def thunk(f=90, dur=0.25):
    t = T(dur)
    body = np.sin(2 * np.pi * (f + 60 * np.exp(-t * 40)) * t) * np.exp(-t * 18)
    click = rs.standard_normal(len(t)) * np.exp(-t * 120) * 0.5
    return body + click


def clank(seed=0):
    r = np.random.default_rng(seed)
    t = T(0.4)
    y = np.zeros_like(t)
    for f in (420, 987, 1530, 2290):
        y += np.sin(2 * np.pi * f * (1 + 0.02 * r.standard_normal()) * t) * np.exp(-t * (14 + f / 200))
    return y / 4 + thunk(70, 0.4)[: len(t)] * 0.6


def slice_(dur=0.28):
    t = T(dur)
    n = rs.standard_normal(len(t))
    y = svf(n, 6000, 1800, q=2.5) * np.exp(-t * 14)
    return y / (np.abs(y).max() + 1e-9) + thunk(60, dur)[: len(t)] * 0.7


def beep(f=1760, dur=0.09):
    t = T(dur)
    return np.sign(np.sin(2 * np.pi * f * t)) * 0.3 * env_adsr(len(t), 0.003, 0.01, 1, 0.02)


def plop(f0=500, f1=1100, dur=0.14):
    t = T(dur)
    f = f0 * (f1 / f0) ** (t / dur)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 22)


def horn(dur=0.32):
    t = T(dur)
    y = sum(np.sign(np.sin(2 * np.pi * f * t)) for f in (392, 494))
    return onepole(y, 2200) * env_adsr(len(t), 0.01, 0.02, 0.9, 0.05) * 0.5


def coin():
    out = np.zeros(int(1.2 * SR))
    for k, (f, at) in enumerate(((1975, 0.0), (2637, 0.08))):
        t = T(1.0)
        s = (np.sin(2 * np.pi * f * t) + 0.5 * np.sin(2 * np.pi * f * 2.4 * t)) * np.exp(-t * 6)
        i = int(at * SR)
        out[i : i + len(s)] += s[: len(out) - i]
    t = T(0.05)
    out[: len(t)] += rs.standard_normal(len(t)) * np.exp(-t * 80) * 0.6
    return out / np.abs(out).max()


# ------------------------------------------------------------------ layers
BPM = 124
BEAT = 60 / BPM
BAR = BEAT * 4
# C  G  Am  F
CHORDS = [(48, [60, 64, 67]), (43, [59, 62, 67]), (45, [60, 64, 69]), (41, [60, 65, 69])]
RIFF = [0, 2, 1, 2, 0, 2, 1, 0]
QUIET = (25.7, 31.75)  # night / watermark: mysterious break


def music():
    buf = np.zeros((N, 2))
    nbar = int(DUR / BAR) + 1
    for b in range(nbar):
        t0 = b * BAR
        if t0 > 69.2:
            break
        root, ch = CHORDS[b % 4]
        quiet = QUIET[0] - 0.2 <= t0 < QUIET[1] - 0.2
        intro = t0 < 7.6
        recap = 59.6 <= t0 < 66.7
        if quiet:
            # dark music box + low pad (A minor colour)
            place(buf, pad([midi(n - 3) for n in ch], BAR + 0.6) * 0.14, t0)
            for k, step in enumerate([0, 2, 1, 2]):
                place(buf, musicbox(midi(ch[step] + 9)) * 0.1, t0 + k * BEAT, pan=0.4 * ((k % 2) * 2 - 1))
            place(buf, bass(midi(root - 15), 1.6) * 0.22, t0)
            continue
        place(buf, pad([midi(n) for n in ch], BAR + 0.6) * (0.07 if intro else 0.09), t0)
        # drums
        for k in range(4):
            place(buf, kick() * 0.55, t0 + k * BEAT)
            if k % 2:
                place(buf, clap() * (0.22 if intro else 0.3), t0 + k * BEAT, pan=0.05)
        for k in range(8):
            place(buf, hat(open_=(k % 4 == 3)) * (0.7 if k % 2 else 0.45), t0 + k * BEAT / 2 + (0.012 if k % 2 else 0), pan=0.35)
        # bouncy bass: root, octave, fifth
        for k, (iv, at) in enumerate([(0, 0), (12, 0.75), (0, 1.5), (7, 2.5), (12, 3.0), (7, 3.5)]):
            place(buf, pluck_bass(midi(root - 12 + iv), 0.28) * 0.42, t0 + at * BEAT)
        # marimba riff (skipped for the first two intro bars)
        if t0 >= 2 * BAR or not intro:
            for k in range(8):
                n = ch[RIFF[k]] + 12 + (12 if (b % 2 and k == 7) else 0)
                place(buf, marimba(midi(n)) * 0.17, t0 + k * BEAT / 2, pan=-0.35 + 0.1 * k)
        if recap or b % 4 == 3:
            for k, m in enumerate([ch[2] + 24, ch[1] + 24]):
                place(buf, pluck_bell(midi(m), 1.2) * 0.06, t0 + (2 + k) * BEAT, pan=0.3)
    # outro sting (69.0): C major with bells, then ring out
    st = 69.0
    place(buf, pad([midi(n) for n in (48, 60, 64, 67, 72)], 3.0) * 0.2, st)
    for k, m in enumerate([72, 76, 79, 84]):
        place(buf, pluck_bell(midi(m), 2.5) * 0.12, st + 0.05 + k * 0.1, pan=-0.3 + 0.2 * k)
    place(buf, kick() * 0.6, st)
    place(buf, bass(midi(36), 2.2) * 0.32, st)
    fade = int(1.0 * SR)
    buf[-fade:] *= np.linspace(1, 0, fade)[:, None]
    return buf


CUTS = [4.1, 7.7, 12.6, 15.95, 21.4, 25.7, 28.3, 31.75, 38.3, 41.55, 43.65, 47.65, 53.95, 59.65, 63.5, 66.75]
POPS = [0.15, 0.4, 9.95, 10.9, 14.24, 16.3, 17.2, 19.5, 21.5, 21.7, 22.45, 22.56, 24.5, 28.6, 30.25, 32.6, 33.7, 35.7, 37.0,
        38.5, 42.25, 44.0, 46.4, 49.45, 51.9, 55.1, 57.15, 58.85, 64.0, 67.0, 67.1, 67.3, 67.5]
POPS += [59.85 + 0.4 * i for i in range(6)]
POPS += [7.8, 12.7, 25.8, 31.85, 43.75, 47.75, 54.05]  # step chips


def sfx():
    buf = np.zeros((N, 2))
    for at in CUTS:
        place(buf, whoosh(0.45) * 0.3, at - 0.22, pan=float(rs.uniform(-0.3, 0.3)))
    for at in POPS:
        place(buf, pop() * 0.3, at, pan=float(rs.uniform(-0.3, 0.3)))
    place(buf, nope() * 0.3, 9.97)
    # cotton!
    place(buf, sparkle(0.7, 18, False, 3) * 0.3, 14.24)
    place(buf, boing() * 0.18, 15.15)
    # cotton balls falling into the vat
    for i in range(12):
        t0 = 15.95 + i * 0.16
        place(buf, plop(380 + 30 * (i % 4), 900) * 0.22, t0 + np.sqrt((3.75 - 1.45) / 3.2), pan=-0.2)
    # paper-mill rollers: soft rhythmic rumble
    t = np.arange(int(5.4 * SR)) / SR
    rumble = onepole(rs.standard_normal(len(t)), 220) * 6 * (0.6 + 0.4 * np.sin(2 * np.pi * 4.13 * t) ** 2)
    rumble *= np.minimum(1, np.minimum(t / 0.3, (5.4 - t) / 0.3))
    place(buf, rumble * 0.18, 15.95)
    # polymer notes: shiny swishes
    place(buf, sparkle(0.6, 14, True, 5) * 0.22, 21.5)
    place(buf, sparkle(0.6, 14, True, 6) * 0.22, 22.45)
    place(buf, whoosh(0.6, 1500, 5000) * 0.15, 23.3)
    # watermark + thread reveal shimmer
    place(buf, sparkle(1.2, 30, True, 7) * 0.32, 28.45)
    place(buf, chime((79, 84, 88, 91)) * 0.25, 28.6)
    place(buf, sparkle(0.6, 16, False, 8) * 0.28, 30.1)
    # printing press: clanks on the beat + a ding for each new layer
    tt = 31.95
    k = 0
    while tt < 38.2:
        place(buf, clank(k) * 0.16, tt, pan=0.2 * ((k % 2) * 2 - 1))
        tt += BEAT
        k += 1
    for at in (33.7, 35.7, 37.0):
        place(buf, chime((84, 91), 0.06) * 0.28, at)
    # raised ink: tiny bumpy ticks as the finger slides
    for i in range(14):
        place(buf, pop(2400, 1500, 0.03) * 0.12, 40.15 + i * 0.095)
    place(buf, boing() * 0.2, 42.3)
    # numbering stamps
    for k in range(4):
        place(buf, thunk(110, 0.3) * 0.45, 43.8 + k)
        place(buf, beep(1320, 0.07) * 0.25, 43.86 + k)
    place(buf, chime((84, 88, 91), 0.06) * 0.26, 46.45)
    # guillotine
    place(buf, whoosh(0.5, 4000, 400) * 0.2, 48.5)
    for at in (49.45, 49.75, 50.05, 50.45, 50.8):
        place(buf, slice_() * 0.32, at - 0.03)
    place(buf, whoosh(0.5, 600, 3000) * 0.2, 50.95)
    # scanner: hum + a beep per row
    t = np.arange(int(1.8 * SR)) / SR
    place(buf, np.sin(2 * np.pi * 220 * t) * 0.15 * np.minimum(1, np.minimum(t / 0.1, (1.8 - t) / 0.1)), 51.85)
    for r in range(4):
        place(buf, beep(1760 + r * 220) * 0.4, 51.95 + r * 0.43)
    place(buf, chime((84, 88, 91, 96), 0.07) * 0.3, 53.65)
    # notes into the van, the drive, the horn, a note to Affan
    for i in range(4):
        place(buf, whoosh(0.3, 1200, 3000) * 0.12, 54.15 + i * 0.18)
    t = np.arange(int(2.4 * SR)) / SR
    eng = (np.sin(2 * np.pi * (70 + 18 * np.sin(np.pi * t / 2.4)) * t) + 0.4 * np.sin(2 * np.pi * 140 * t)) * np.minimum(1, np.minimum(t / 0.3, (2.4 - t) / 0.4))
    place(buf, eng * 0.12, 54.95)
    place(buf, horn() * 0.25, 57.2, pan=0.3)
    place(buf, whoosh(0.9, 800, 3000) * 0.2, 57.95)
    place(buf, chime((86, 91)) * 0.28, 58.9)
    place(buf, sparkle(0.6, 14, False, 9) * 0.22, 58.9)
    # piggy bank
    place(buf, whoosh(0.5, 2000, 600) * 0.15, 64.85)
    place(buf, coin() * 0.45, 65.42)
    place(buf, sparkle(0.8, 18, False, 10) * 0.25, 65.45)
    place(buf, sparkle(1.0, 24, False, 11) * 0.28, 69.0)
    return buf


def load_narration():
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", os.path.join(HERE, "audio", "narration.mp3"), "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"], check=True, capture_output=True).stdout
    v = np.frombuffer(raw, dtype=np.float32).astype(np.float64)
    out = np.zeros(N)
    out[: min(N, len(v))] = v[:N]
    return out


def duck_gain(voice):
    e = np.abs(voice)
    e = onepole(e, 8)
    talking = np.clip((20 * np.log10(e + 1e-6) + 42) / 12, 0, 1)
    talking = onepole(talking, 2.5)
    return 1 - 0.5 * talking  # about -6 dB under speech


def write_wav(path, buf):
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "2", "-i", "-", "-c:a", "pcm_s24le", path], input=buf.astype(np.float32).tobytes(), check=True)


def main():
    os.makedirs(os.path.join(OUT, "stems"), exist_ok=True)
    voice = load_narration()
    m = music() * duck_gain(voice)[:, None]
    s = sfx()
    v = np.stack([voice, voice], 1)
    for name, b in (("music", m), ("sfx", s)):
        write_wav(os.path.join(OUT, "stems", name + ".wav"), b)
    mix = v * 1.0 + m * 0.5 + s * 0.5
    mix /= max(1.0, np.abs(mix).max() / 0.95)
    pre = os.path.join(OUT, "stems", "premix.wav")
    write_wav(pre, mix)
    import json
    r = subprocess.run(["ffmpeg", "-hide_banner", "-i", pre, "-af", "loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json", "-f", "null", "-"], capture_output=True, text=True)
    js = json.loads(r.stderr[r.stderr.rindex("{") :])
    af = (f"loudnorm=I=-14:TP=-1.5:LRA=11:measured_I={js['input_i']}:measured_TP={js['input_tp']}:"
          f"measured_LRA={js['input_lra']}:measured_thresh={js['input_thresh']}:offset={js['target_offset']}:linear=true")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", pre, "-af", af + ",aresample=48000", "-c:a", "pcm_s24le", os.path.join(OUT, "mix.wav")], check=True)
    print("wrote", os.path.join(OUT, "mix.wav"))


if __name__ == "__main__":
    sys.exit(main())
