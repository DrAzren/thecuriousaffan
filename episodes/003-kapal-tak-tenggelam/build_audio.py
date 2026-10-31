#!/usr/bin/env python3
"""Soundtrack for Episode 003, synthesised from scratch (no samples, no
licensed music) and mixed under the narration.

Layers
  music     cheerful soft bed: ukulele-style plucks and marimba at the harbour,
            a sparkly marimba + bell band in the science world, a warm reprise
            and a bright outro sting. Ducked about 7 dB under the voice.
  ambience  harbour water lapping, light breeze, distant gulls; a muffled
            underwater bed for the underwater shots.
  sfx       ship horn, stone splash ("plop"), sinking bubbles, sand thud,
            magic whoosh into the science world and back, cut whooshes,
            label pops, discovery chimes, rising/falling arrow tones.

The final mix is normalised to -14 LUFS / -1.5 dBTP for social platforms.

    python3 build_audio.py            # -> output/mix.wav (+ stems in output/stems)
Requires numpy and ffmpeg. Cue times match episode.js.
"""
import json
import os
import subprocess
import sys

import numpy as np

SR = 44100
DUR = 47.5
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "output")
N = int(SR * DUR)
rs = np.random.default_rng(3)

# section boundaries (seconds), from episode.js
UNDER = (12.2, 16.4)  # underwater shot + split screen (half underwater)
LAB = (18.2, 34.9)  # science world
OUTRO = 44.15
T_SPLASH = 11.945
T_LAND = 13.35


def T(sec):
    return np.arange(int(sec * SR)) / SR


def place(buf, sig, at, gain=1.0, pan=0.0):
    i = int(at * SR)
    if i >= len(buf) or i < 0:
        return
    sig = sig[: len(buf) - i]
    l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    buf[i : i + len(sig), 0] += sig * gain * l * 1.414
    buf[i : i + len(sig), 1] += sig * gain * r * 1.414


def env_adsr(n, a=0.01, d=0.1, s=0.7, r=0.2):
    e = np.ones(n) * s
    na, nd, nr = int(a * SR), int(d * SR), int(r * SR)
    if na:
        e[:na] = np.linspace(0, 1, na, endpoint=False)
    e[na : na + nd] = np.linspace(1, s, len(e[na : na + nd]))
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
    """One-pole low-pass (vectorised in blocks via exponential decay)."""
    a = np.exp(-2 * np.pi * fc / SR)
    y = np.empty_like(x)
    acc = 0.0
    b = 1 - a
    for i in range(len(x)):
        acc = b * x[i] + a * acc
        y[i] = acc
    return y


def midi(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def norm(x):
    return x / (np.abs(x).max() + 1e-9)


# ------------------------------------------------------------- instruments
def pluck(f, dur=0.9, bright=1.0):
    """Ukulele-ish pluck: harmonics with faster decay for higher partials."""
    t = T(dur)
    y = np.zeros_like(t)
    for h in range(1, 9):
        y += np.sin(2 * np.pi * f * h * t + h * 0.7) * np.exp(-t * (3.5 + h * 2.2 / bright)) / h ** 1.1
    y[: int(0.003 * SR)] *= np.linspace(0, 1, int(0.003 * SR))
    return y * 0.6


def marimba(f, dur=0.6):
    t = T(dur)
    y = np.sin(2 * np.pi * f * t) * np.exp(-t * 7) + 0.35 * np.sin(2 * np.pi * 4 * f * t) * np.exp(-t * 28)
    y[: int(0.002 * SR)] *= np.linspace(0, 1, int(0.002 * SR))
    return y


def bell(f, dur=1.4):
    t = T(dur)
    return (np.sin(2 * np.pi * f * t) + 0.5 * np.sin(2 * np.pi * 2.76 * f * t) * np.exp(-t * 2) + 0.25 * np.sin(2 * np.pi * 5.4 * f * t) * np.exp(-t * 5)) * np.exp(-t * 2.6)


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
    n = np.diff(rs.standard_normal(len(t)), prepend=0)
    return n * np.exp(-t * 70) * 0.25


# --------------------------------------------------------------------- sfx
def whoosh(dur=0.55, f0=300, f1=3500, rev=False, q=1.6):
    y = svf(rs.standard_normal(int(dur * SR)), f0, f1, q=q)
    y = y * np.sin(np.linspace(0, np.pi, len(y))) ** 1.6
    return norm(y[::-1] if rev else y)


def tone_sweep(f0, f1, dur, decay=4.0):
    t = T(dur)
    f = f0 * (f1 / f0) ** (t / dur)
    y = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * decay)
    y[: int(0.004 * SR)] *= np.linspace(0, 1, int(0.004 * SR))
    return y


def pop(f0=900, f1=320, dur=0.12):
    return tone_sweep(f0, f1, dur, 30)


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
    return norm(out)


def chime(notes=(84, 91, 96), gap=0.09):
    out = np.zeros(int((gap * len(notes) + 1.6) * SR))
    for i, m in enumerate(notes):
        s = bell(midi(m), 1.5)
        k = int(i * gap * SR)
        out[k : k + len(s)] += s
    return norm(out)


def boing(dur=0.45):
    t = T(dur)
    f = 220 + 160 * np.sin(2 * np.pi * 9 * t) * np.exp(-t * 6) + 180 * t
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 6)


def ship_horn(dur=1.5):
    """Deep, friendly two-note ship horn (filtered saws with a soft attack)."""
    t = T(dur)
    y = np.zeros_like(t)
    for f, g in ((92.5, 1.0), (116.5, 0.8), (185, 0.25)):
        ph = 2 * np.pi * f * t * (1 + 0.002 * np.sin(2 * np.pi * 5 * t))
        saw = sum(np.sin(ph * h) / h for h in range(1, 14))
        y += g * saw
    y = onepole(y, 700)
    y *= env_adsr(len(t), 0.12, 0.2, 0.85, 0.45)
    return norm(y)


def splash():
    """Stone into water: a resonant 'plop' plus a short noisy splash and droplets."""
    t = T(0.5)
    f = 1100 * np.exp(-t * 18) + 240
    plop = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 16)
    noise = svf(rs.standard_normal(int(0.45 * SR)), 2500, 900, q=0.9) * np.exp(-T(0.45) * 9)
    out = np.zeros(int(1.2 * SR))
    out[: len(plop)] += plop * 1.0
    out[: len(noise)] += norm(noise) * 0.45
    r = np.random.default_rng(9)
    for i in range(14):  # droplets falling back
        k = int((0.18 + r.random() * 0.6) * SR)
        d = tone_sweep(1400 + r.random() * 1600, 600 + r.random() * 500, 0.06, 40) * (0.15 + 0.15 * r.random())
        out[k : k + len(d)] += d
    return norm(out)


def bubble(f0=380, dur=0.09):
    return tone_sweep(f0, f0 * 2.6, dur, 25)


def thud():
    t = T(0.35)
    y = np.sin(2 * np.pi * (70 + 40 * np.exp(-t * 20)) * t) * np.exp(-t * 14)
    y += onepole(rs.standard_normal(len(t)), 400) * np.exp(-t * 18) * 2
    return norm(y)


def gull():
    """Distant seagull: a few gliding 'kee-ow' cries."""
    out = np.zeros(int(1.4 * SR))
    for k, at in enumerate((0.0, 0.38, 0.72)):
        dur = 0.3 if k < 2 else 0.42
        t = T(dur)
        f = 1650 - 650 * (t / dur) ** 1.4 + 40 * np.sin(2 * np.pi * 28 * t)
        ph = 2 * np.pi * np.cumsum(f) / SR
        y = (np.sin(ph) + 0.35 * np.sin(2 * ph) + 0.15 * np.sin(3 * ph)) * np.sin(np.pi * t / dur) ** 0.6
        i = int(at * SR)
        out[i : i + len(y)] += y * (1 - 0.2 * k)
    return norm(out)


def slosh(dur=1.2):
    y = svf(rs.standard_normal(int(dur * SR)), 500, 1800, q=0.8)
    return norm(y * np.sin(np.linspace(0, np.pi, len(y))) ** 2)


# ------------------------------------------------------------------ layers
def music():
    buf = np.zeros((N, 2))
    bpm = 108
    beat = 60 / bpm
    bar = beat * 4
    # C  G  Am  F   (I V vi IV) in C major
    chords = [(48, [60, 64, 67]), (43, [59, 62, 67]), (45, [60, 64, 69]), (41, [60, 65, 69])]
    strum = [0, 1, 2, 1]

    def harbour(t0, t1, lvl=1.0, full=True):
        i = 0
        while t0 < t1 - 0.05:
            root, ch = chords[i % 4]
            place(buf, pad([midi(n) for n in ch], bar + 0.6) * 0.08 * lvl, t0)
            for k in range(8):  # ukulele off-beat strums
                if k % 2 == 1 or k == 0:
                    for j, n in enumerate(ch):
                        place(buf, pluck(midi(n + 12), 0.7) * 0.07 * lvl, t0 + k * beat / 2 + j * 0.012, pan=-0.25 + 0.25 * j)
            if full:
                for k in range(4):
                    place(buf, marimba(midi(ch[strum[k]] + 24)) * 0.1 * lvl, t0 + k * beat + beat / 2, pan=0.35)
                for k in (0, 2):
                    place(buf, bass(midi(root - 12) if k == 0 else midi(root - 5), 0.6) * 0.3 * lvl, t0 + k * beat)
                for k in range(8):
                    place(buf, shaker() * (0.45 if k % 2 else 0.25) * lvl, t0 + k * beat / 2, pan=0.4)
            t0 += bar
            i += 1

    def lab(t0, t1):
        arp = [0, 1, 2, 1, 0, 2, 1, 2]
        i = 0
        while t0 < t1 - 0.05:
            root, ch = chords[i % 4]
            place(buf, pad([midi(n) for n in ch], bar + 0.6) * 0.11, t0)
            for k in range(8):
                place(buf, marimba(midi(ch[arp[k]] + 12)) * 0.18, t0 + k * beat / 2, pan=-0.35 + 0.1 * k)
            for k in (0, 4):
                place(buf, bell(midi(ch[2] + 24), 1.2) * 0.05, t0 + k * beat / 2 + beat / 4, pan=0.4)
            for k in (0, 2):
                place(buf, bass(midi(root - 12) if k == 0 else midi(root - 5), 0.6) * 0.3, t0 + k * beat)
            for k in range(8):
                place(buf, shaker() * (0.5 if k % 2 else 0.3), t0 + k * beat / 2, pan=0.4)
            t0 += bar
            i += 1

    harbour(0.0, UNDER[0], 1.0)
    # underwater: only a soft pad, muffled
    sub = np.zeros((N, 2))
    t0, i = UNDER[0], 0
    while t0 < UNDER[1]:
        root, ch = chords[i % 4]
        place(sub, pad([midi(n - 12) for n in ch], bar + 0.6) * 0.16, t0)
        for k in range(4):
            place(sub, bell(midi(ch[k % 3] + 12), 1.4) * 0.05, t0 + k * beat, pan=0.3 * (k % 2 * 2 - 1))
        t0 += bar
        i += 1
    buf += sub
    harbour(UNDER[1], LAB[0] - 0.4, 0.8, full=False)
    lab(LAB[0], LAB[1])
    harbour(LAB[1], OUTRO, 1.0)
    # outro sting: C major with bells
    place(buf, pad([midi(n) for n in (48, 60, 64, 67, 72)], 3.2) * 0.2, OUTRO)
    for k, m in enumerate([72, 76, 79, 84]):
        place(buf, bell(midi(m), 2.5) * 0.12, OUTRO + 0.05 + k * 0.12, pan=-0.3 + 0.2 * k)
    place(buf, bass(midi(36), 2.0) * 0.3, OUTRO)
    fade = int(1.2 * SR)
    buf[-fade:] *= np.linspace(1, 0, fade)[:, None]
    return buf


def section_gain(spans, smooth=3.0):
    lvl = np.zeros(N)
    for a, b, g in spans:
        lvl[int(a * SR) : int(b * SR)] = g
    return onepole(lvl, smooth)


def ambience():
    buf = np.zeros((N, 2))
    t = np.arange(N) / SR
    # water lapping: low-passed noise with slow swells
    base = onepole(rs.standard_normal(N), 650)
    base = norm(base - onepole(base, 60))
    swell = 0.55 + 0.45 * (0.5 * np.sin(2 * np.pi * 0.31 * t) + 0.3 * np.sin(2 * np.pi * 0.53 * t + 1) + 0.2 * np.sin(2 * np.pi * 0.83 * t + 2))
    lap = base * swell
    wind = norm(onepole(rs.standard_normal(N), 250)) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.07 * t))
    air = section_gain([(0, UNDER[0], 1.0), (UNDER[1], LAB[0], 1.0), (LAB[1], OUTRO, 1.0)])
    buf[:, 0] = (lap * 0.8 + wind * 0.25) * air
    buf[:, 1] = (np.roll(lap, 211) * 0.8 + np.roll(wind, 97) * 0.25) * air
    for at, g, p in ((0.6, 0.5, -0.4), (4.3, 0.35, 0.5), (8.6, 0.4, 0.3), (16.8, 0.3, -0.5), (36.5, 0.45, -0.3), (41.0, 0.3, 0.5)):
        place(buf, gull() * g, at, pan=p)
    for at in (1.5, 3.9, 6.3, 9.8, 17.0, 35.6, 38.4, 42.2):  # occasional sloshes against the pilings
        place(buf, slosh(1.0) * 0.18, at, pan=float(rs.uniform(-0.5, 0.5)))
    # underwater bed: deep muffled rumble + slow bubbles
    deep = norm(onepole(onepole(rs.standard_normal(N), 160), 160))
    uw = section_gain([UNDER + (1.0,)], 6.0)
    buf[:, 0] += deep * uw * 0.9
    buf[:, 1] += np.roll(deep, 300) * uw * 0.9
    r = np.random.default_rng(12)
    tt = UNDER[0] + 0.3
    while tt < UNDER[1] - 0.3:
        place(buf, bubble(250 + r.random() * 400, 0.08) * 0.12, tt, pan=float(r.uniform(-0.6, 0.6)))
        tt += 0.18 + r.random() * 0.5
    return buf


def sfx():
    buf = np.zeros((N, 2))
    place(buf, ship_horn(1.25) * 0.3, 2.42)
    # cut whooshes
    for at in (5.0, 7.3, 9.3, 13.84, 16.4, 22.6, 25.85, 29.5, 39.15):
        place(buf, whoosh(0.5) * 0.3, at - 0.25)
    # the stone
    place(buf, splash() * 0.55, T_SPLASH - 0.01)
    place(buf, whoosh(0.5, 2500, 250, q=1.2) * 0.35, 12.0)  # plunge under the surface
    r = np.random.default_rng(4)
    tt = T_SPLASH + 0.05
    while tt < T_LAND:  # bubble trail
        place(buf, bubble(320 + r.random() * 500, 0.07) * 0.22, tt, pan=float(r.uniform(-0.3, 0.3)))
        tt += 0.05 + r.random() * 0.08
    place(buf, thud() * 0.5, T_LAND)
    # magic transition into the science world, and back
    place(buf, sparkle(1.1, 30, True, 2) * 0.32, 17.3)
    place(buf, whoosh(1.0, 300, 6000, rev=True) * 0.3, 17.3)
    place(buf, sparkle(0.6, 22, False, 3) * 0.28, 18.15)
    place(buf, whoosh(0.6, 2500, 300) * 0.35, 34.65)
    place(buf, sparkle(0.7, 18, False, 5) * 0.25, 34.95)
    # science world
    place(buf, sparkle(1.0, 16, False, 6) * 0.18, 19.3)  # "bentuk" glow
    place(buf, whoosh(0.9, 1200, 250, q=1.0) * 0.25, 19.95)  # ship lowers
    place(buf, splash() * 0.35, 20.7)  # hull meets the water
    place(buf, tone_sweep(300, 700, 0.35, 5) * 0.18, 24.3)  # nudge up
    place(buf, tone_sweep(220, 880, 0.8, 2.5) * 0.2, 26.5)  # arrows merge into one
    place(buf, tone_sweep(330, 990, 0.9, 2.5) * 0.18, 30.82)  # buoyancy grows
    place(buf, tone_sweep(700, 220, 0.6, 3) * 0.2, 32.52)  # weight arrow down
    place(buf, boing(0.4) * 0.15, 35.0)
    # label pops
    for at in (0.12, 0.5, 3.42, 5.62, 6.06, 6.38, 9.72, 12.4, 12.5, 13.9, 14.1, 14.25, 15.54, 16.0, 16.5, 16.7, 16.9,
               19.28, 20.62, 23.7, 30.04, 32.52, 33.1, 37.54, 41.7, 42.0, 42.3, OUTRO + 0.3, OUTRO + 0.5, OUTRO + 0.7):
        place(buf, pop() * 0.28, at, pan=float(rs.uniform(-0.3, 0.3)))
    # discovery chimes
    place(buf, chime((79, 84, 88)) * 0.28, 20.62)
    place(buf, chime((84, 88, 91, 96), 0.08) * 0.36, 27.93)
    place(buf, sparkle(0.8, 16, False, 7) * 0.25, 28.0)
    place(buf, chime((79, 84, 88, 91, 96), 0.07) * 0.4, 33.6)
    place(buf, chime((86, 91)) * 0.25, 39.5)
    place(buf, sparkle(0.6, 14, False, 8) * 0.22, 39.55)
    place(buf, sparkle(1.0, 24, False, 9) * 0.3, OUTRO)
    return buf


def load_narration():
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", os.path.join(HERE, "audio", "narration.mp3"), "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"], check=True, capture_output=True).stdout
    v = np.frombuffer(raw, dtype=np.float32).astype(np.float64)
    out = np.zeros(N)
    out[: min(N, len(v))] = v[:N]
    return out


def duck_gain(voice):
    e = onepole(np.abs(voice), 8)
    talking = np.clip((20 * np.log10(e + 1e-6) + 42) / 12, 0, 1)
    talking = onepole(talking, 2.5)
    return 1 - 0.55 * talking  # about -7 dB under speech


def write_wav(path, buf):
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "2", "-i", "-", "-c:a", "pcm_s24le", path], input=buf.astype(np.float32).tobytes(), check=True)


def main():
    os.makedirs(os.path.join(OUT, "stems"), exist_ok=True)
    voice = load_narration()
    duck = duck_gain(voice)[:, None]
    m = music() * duck
    a = ambience() * (0.6 + 0.4 * duck)
    s = sfx()
    v = np.stack([voice, voice], 1)
    for name, b in (("music", m), ("ambience", a), ("sfx", s)):
        write_wav(os.path.join(OUT, "stems", name + ".wav"), b)
    mix = v * 1.0 + m * 0.5 + a * 0.13 + s * 0.55
    mix /= max(1.0, np.abs(mix).max() / 0.95)
    pre = os.path.join(OUT, "stems", "premix.wav")
    write_wav(pre, mix)
    # two-pass EBU R128 loudness normalisation to -14 LUFS, -1.5 dBTP
    r = subprocess.run(["ffmpeg", "-hide_banner", "-i", pre, "-af", "loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json", "-f", "null", "-"], capture_output=True, text=True)
    js = json.loads(r.stderr[r.stderr.rindex("{") :])
    af = (f"loudnorm=I=-14:TP=-1.5:LRA=11:measured_I={js['input_i']}:measured_TP={js['input_tp']}:"
          f"measured_LRA={js['input_lra']}:measured_thresh={js['input_thresh']}:offset={js['target_offset']}:linear=true")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", pre, "-af", af + ",aresample=48000", "-c:a", "pcm_s24le", os.path.join(OUT, "mix.wav")], check=True)
    print("wrote", os.path.join(OUT, "mix.wav"))


if __name__ == "__main__":
    sys.exit(main())
