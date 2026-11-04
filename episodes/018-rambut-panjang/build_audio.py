#!/usr/bin/env python3
"""Soundtrack for Episode 018, synthesised from scratch (no samples, no
licensed music) and mixed under the narration.

Layers: a bouncy music-box hook in Affan's bedroom, a warm marimba band in the
hair forest and down the follicle, a busy "factory" groove with gear ticks
while the bulb makes new cells, a soft pad for the 1 cm ruler and a wistful
minor pad when the old hair falls out, then the band again for the happy
ending. SFX: whooshes on cuts, a magic sparkle swirl into the scalp, label
pops, bubbly cell blips, a heartbeat thump for the blood, a scissors snip, a
falling-hair swish and soft thud, a rising "grow" bloop and discovery chimes.
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
DUR = 63.8
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
CUTS = (4.15, 8.85, 10.75, 13.3, 19.38, 28.85, 33.0, 38.2, 42.1, 50.5, 54.2, 57.8, 61.0)


def band(buf, t0, t1, chords, bpm=108, gain=1.0, arp=True, drums=True):
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
    F = [(41, [65, 69, 72]), (43, [67, 71, 74]), (45, [64, 69, 72]), (48, [64, 67, 72])]
    C = [(48, [64, 67, 72]), (45, [64, 69, 72]), (41, [65, 69, 72]), (43, [62, 67, 71])]
    Am = [(45, [60, 64, 69]), (41, [60, 65, 69]), (43, [62, 67, 71]), (40, [59, 64, 68])]
    beat = 60 / 108
    bar = beat * 4
    # bedroom hook: bouncy music box + plucked bass
    t0, i = 0.0, 0
    while t0 < 10.75:
        root, ch = F[i % 4]
        place(buf, pad([midi(n) for n in ch], bar + 0.6) * 0.12, t0)
        for k, step in enumerate([0, 2, 1, 2, 0, 2, 1, 2]):
            place(buf, musicbox(midi(ch[step] + 12), 1.0) * 0.1, t0 + k * beat / 2, pan=0.3 * ((k % 2) * 2 - 1))
        for k in (0, 2):
            place(buf, bass(midi(root - 12) if k == 0 else midi(root - 5), 0.4) * 0.26, t0 + k * beat)
        t0 += bar
        i += 1
    band(buf, 10.75, 19.38, C, gain=0.9)  # the hair forest
    band(buf, 19.38, 33.0, C, bpm=116, gain=1.0)  # the busy factory
    band(buf, 33.0, 38.2, F, gain=0.95)  # the haircut
    slow_pad(buf, 38.2, 42.1, [(48, [64, 67, 72, 76]), (41, [65, 69, 72, 77]), (43, [67, 71, 74, 79]), (48, [64, 67, 72, 79])], 1.3, 0.15, 0.1)  # 1 cm a month
    slow_pad(buf, 42.1, 47.5, Am, 1.35, 0.14, 0.07)  # the old hair falls out
    band(buf, 47.5, 61.0, C, gain=1.0)  # it's normal, happy ending
    # outro sting
    place(buf, pad([midi(n) for n in (48, 60, 64, 67, 72)], 3.0) * 0.2, 61.0)
    for k, m in enumerate([72, 76, 79, 84]):
        place(buf, pluck_bell(midi(m), 2.5) * 0.12, 61.05 + k * 0.12, pan=-0.3 + 0.2 * k)
    place(buf, bass(midi(36), 2.0) * 0.3, 61.0)
    fade = int(1.2 * SR)
    buf[-fade:] *= np.linspace(1, 0, fade)[:, None]
    return buf


def noise_bed(a, b, lo=250, hi=900, gain=0.35, gust=0.4):
    n = int((b - a) * SR)
    w = svf(rs.standard_normal(n), lo, hi, q=0.5)
    w /= np.abs(w).max() + 1e-9
    k = np.linspace(0, 1, n)
    w *= np.minimum(1, np.minimum(k * (b - a) / 0.6, (1 - k) * (b - a) / 0.6)) * (1 - gust + gust * np.sin(np.linspace(0, 9, n)) ** 2)
    return w * gain


def ambience():
    buf = np.zeros((N, 2))
    for a, b in ((0, 10.75), (54.2, 61.0)):  # bedroom: quiet room tone
        place(buf, noise_bed(a, b, 200, 400, 0.12, 0.1), a)
    place(buf, noise_bed(10.75, 54.2, 120, 380, 0.22, 0.3), 10.75)  # warm, soft "inside the body" air
    return buf


def tick(f=1800):
    t = T(0.05)
    return np.sin(2 * np.pi * f * t) * np.exp(-t * 90)


def blip(f=900, dur=0.09):
    t = T(dur)
    fr = f * (1 + 0.8 * t / dur)
    return np.sin(2 * np.pi * np.cumsum(fr) / SR) * np.sin(np.pi * t / dur) ** 2


def thump(dur=0.25):
    t = T(dur)
    f = 60 + 40 * np.exp(-t * 20)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 14)


def snip():
    out = np.zeros(int(0.3 * SR))
    for k, (f0, f1) in enumerate(((5200, 2600), (6400, 3000))):
        x = rs.standard_normal(int(0.06 * SR))
        y = svf(x, f0, f1, q=3.0) * np.exp(-np.arange(len(x)) / SR * 60)
        i = int(k * 0.07 * SR)
        out[i : i + len(y)] += y
    return out / (np.abs(out).max() + 1e-9)


def bloop(dur=0.7):
    t = T(dur)
    f = 300 * 2 ** (t / dur * 1.5)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * t / dur) ** 1.5


def sfx():
    buf = np.zeros((N, 2))
    for at in CUTS:
        place(buf, whoosh(0.5) * 0.3, at - 0.25)
    place(buf, boing() * 0.22, 0.1)  # "Alamak!"
    place(buf, sparkle(1.2, 30, True, 2) * 0.3, 9.6)  # magic swirl into the scalp
    place(buf, sparkle(0.9, 20, False, 3) * 0.22, 10.8)
    # gears of the little factory
    tt = 20.96
    while tt < 32.9:
        place(buf, tick(1500 if int(tt * 4) % 2 else 1100) * 0.16, tt, pan=-0.3)
        tt += 0.25
    # bubbly new cells
    for i in range(22):
        place(buf, blip(700 + 60 * (i % 5)) * 0.16, 22.0 + i * 0.3, pan=float(rs.uniform(-0.3, 0.3)))
    # heartbeat for the blood
    for i in range(5):
        place(buf, thump() * 0.45, 29.0 + i * 0.8)
        place(buf, thump() * 0.3, 29.25 + i * 0.8)
    place(buf, snip() * 0.45, 36.45)  # the haircut
    place(buf, whoosh(0.8, 1800, 400) * 0.25, 36.6)  # the cut tip falls away
    place(buf, whoosh(0.6, 400, 1800) * 0.18, 42.6)  # old hair slides up
    place(buf, whoosh(0.9, 2000, 300) * 0.28, 44.2)  # ...and falls
    place(buf, thump(0.35) * 0.35, 45.15)
    place(buf, bloop() * 0.25, 45.4)  # new hair grows
    # ruler growing
    for i in range(6):
        place(buf, tick(1200 * 2 ** (i * 2 / 12)) * 0.25, 39.6 + i * 0.28, pan=0.1)
    # label pops
    for at in (0.2, 2.0, 2.88, 4.22, 5.2, 6.2, 6.5, 7.16, 7.5, 8.9, 8.95, 11.6, 15.92, 16.64, 18.4, 20.96, 22.16, 22.8, 24.72,
               25.2, 27.96, 28.85, 29.9, 31.84, 33.4, 34.6, 35.7, 36.88, 38.4, 39.28, 40.32, 41.04, 42.13, 44.28, 45.6, 47.65,
               49.2, 52.08, 54.25, 54.56, 55.2, 55.84, 56.8, 58.76, 59.2, 59.81, 61.3, 61.5, 61.7):
        place(buf, pop() * 0.3, at, pan=float(rs.uniform(-0.3, 0.3)))
    # discovery cues
    for at, notes in ((18.4, (79, 84)), (27.96, (84, 88, 91)), (36.88, (79, 84, 88)), (40.32, (81, 86, 89)), (49.2, (84, 88, 91)),
                      (50.6, (84, 88, 91, 96)), (52.08, (79, 84, 88, 91, 96)), (56.8, (84, 88, 91))):
        place(buf, chime(notes, 0.07) * 0.32, at)
    for at, seed in ((11.6, 6), (20.9, 7), (50.55, 8), (54.2, 9), (61.0, 11)):
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
