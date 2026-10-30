#!/usr/bin/env python3
"""Soundtrack for Episode 005, synthesised from scratch (no samples, no
licensed music) and mixed under the narration.

Layers: gentle original music bed (night music-box intro, cheerful marimba
band in the imagination world), car ambience, whooshes on cuts, magic sparkle,
label pops and discovery chimes. The music is ducked under the voice and the
final mix is normalised to -14 LUFS / -1.5 dBTP for social platforms.

    python3 build_audio.py            # -> output/mix.wav (+ stems in output/stems)
Requires numpy and ffmpeg.
"""
import os
import subprocess
import sys

import numpy as np

SR = 44100
DUR = 58.5
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
def music():
    buf = np.zeros((N, 2))
    bpm = 104
    beat = 60 / bpm
    bar = beat * 4
    # F  C  Dm  Bb  (I V vi IV) in F major
    chords = [(53, [65, 69, 72]), (48, [64, 67, 72]), (50, [65, 69, 74]), (46, [65, 70, 74])]
    arp_pat = [0, 1, 2, 1, 0, 2, 1, 2]
    # night intro / car scenes: soft pad + music box (0 - 13.85)
    t0 = 0.0
    i = 0
    while t0 < 13.85:
        root, ch = chords[i % 4]
        place(buf, pad([midi(n) for n in ch], bar + 0.6) * 0.16, t0, pan=0)
        for k, step in enumerate([0, 2, 1, 2]):
            place(buf, musicbox(midi(ch[step] + 12)) * 0.12, t0 + k * beat, pan=0.3 * ((k % 2) * 2 - 1))
        t0 += bar
        i += 1
    # imagination world: full playful band (13.85 - 47.25)
    t0 = 13.85
    i = 0
    while t0 < 47.25:
        root, ch = chords[i % 4]
        place(buf, pad([midi(n) for n in ch], bar + 0.6) * 0.11, t0)
        for k in range(8):
            n = ch[arp_pat[k]] + 12
            place(buf, marimba(midi(n)) * 0.2, t0 + k * beat / 2, pan=-0.35 + 0.1 * k)
        for k in (0, 2):
            place(buf, bass(midi(root - 12) if k == 0 else midi(root - 5), 0.6) * 0.32, t0 + k * beat)
        for k in range(8):
            place(buf, shaker() * (0.5 if k % 2 else 0.3), t0 + k * beat / 2, pan=0.4)
        t0 += bar
        i += 1
    # back in the car: warm, lighter (47.25 - 55.3)
    t0 = 47.25
    i = 0
    while t0 < 55.3:
        root, ch = chords[i % 4]
        place(buf, pad([midi(n) for n in ch], bar + 0.6) * 0.13, t0)
        for k in range(4):
            place(buf, marimba(midi(ch[[0, 2, 1, 2][k]] + 12)) * 0.15, t0 + k * beat, pan=0.25 * ((k % 2) * 2 - 1))
        place(buf, bass(midi(root - 12), 0.9) * 0.25, t0)
        t0 += bar
        i += 1
    # outro sting: final F major chord with bells
    place(buf, pad([midi(n) for n in (53, 65, 69, 72, 77)], 3.2) * 0.2, 55.3)
    for k, m in enumerate([77, 81, 84, 89]):
        place(buf, pluck_bell(midi(m), 2.5) * 0.12, 55.35 + k * 0.12, pan=-0.3 + 0.2 * k)
    place(buf, bass(midi(41), 2.0) * 0.3, 55.3)
    # gentle fade at the very end
    fade = int(1.2 * SR)
    buf[-fade:] *= np.linspace(1, 0, fade)[:, None]
    return buf


def ambience():
    buf = np.zeros((N, 2))
    t = np.arange(N) / SR
    brown = np.cumsum(rs.standard_normal(N))
    brown -= onepole(brown, 0.5)  # remove drift
    brown /= np.abs(brown).max()
    rumble = onepole(brown, 180)
    rumble /= np.abs(rumble).max()
    hum = 0.5 * np.sin(2 * np.pi * 47 * t + 0.3 * np.sin(2 * np.pi * 0.4 * t)) + 0.25 * np.sin(2 * np.pi * 94 * t)
    tyre = svf(rs.standard_normal(N), 500, 500, q=0.8)
    tyre /= np.abs(tyre).max()
    car = rumble * 0.55 + hum * 0.18 + tyre * 0.12
    # level per section: inside (soft), exterior (louder), none in imagination world
    lvl = np.zeros(N)
    for a, b, g in [(0, 5.8, 0.5), (5.8, 9.2, 0.6), (9.2, 12.1, 1.0), (12.1, 13.85, 0.5), (47.25, 55.3, 0.5), (55.3, 56.3, 0.0)]:
        lvl[int(a * SR) : int(b * SR)] = g
    lvl = onepole(lvl, 3)  # smooth section changes
    buf[:, 0] = car * lvl
    buf[:, 1] = np.roll(car, 37) * lvl
    # passing lamp posts outside (every 0.75 s while driving)
    for a, b, g in [(5.8, 9.2, 0.25), (9.2, 12.1, 0.45)]:
        tt = a + 0.3
        while tt < b - 0.3:
            place(buf, whoosh(0.35, 400, 1200) * g, tt, pan=0.5)
            tt += 0.75
    return buf


def sfx():
    buf = np.zeros((N, 2))
    for at in (5.8, 9.2, 12.1, 16.3, 20.3, 25.9, 32.15, 40.05, 44.0):
        place(buf, whoosh(0.5) * 0.35, at - 0.25)
    place(buf, whoosh(1.1, 200, 5000) * 0.35, 22.0)  # crane up
    place(buf, whoosh(0.6, 2500, 300) * 0.35, 47.0)  # back to the car
    # magic sparkle into the imagination world + reveal
    place(buf, sparkle(1.3, 34, True, 2) * 0.32, 12.55)
    place(buf, sparkle(0.6, 22, False, 3) * 0.3, 13.8)
    place(buf, whoosh(0.9, 300, 6000, rev=True) * 0.25, 13.0)
    # toy level: quick passing ticks of nearby objects
    tt = 16.45
    while tt < 20.2:
        place(buf, whoosh(0.18, 900, 2500) * 0.18, tt, pan=-0.5)
        tt += 0.42
    place(buf, whoosh(0.7, 500, 3000) * 0.3, 20.75, pan=0.3)  # toy car zooms past Affan
    # label pops
    for at in (0.12, 9.35, 16.7, 17.62, 18.74, 19.54, 20.7, 23.28, 23.98, 24.3, 26.6, 27.62, 28.84, 30.62, 34.6, 38.6, 40.1, 40.3, 40.5, 53.05, 53.35, 53.65, 55.6, 55.8, 56.0):
        place(buf, pop() * 0.32, at, pan=float(rs.uniform(-0.3, 0.3)))
    place(buf, nope() * 0.3, 38.68)
    place(buf, boing() * 0.22, 44.18)
    # discovery cues
    place(buf, chime((79, 84, 88, 91)) * 0.35, 44.3)
    place(buf, chime((84, 88, 91, 96), 0.07) * 0.42, 46.12)
    place(buf, sparkle(0.8, 16, False, 6) * 0.25, 46.2)
    place(buf, chime((86, 91)) * 0.28, 49.2)
    place(buf, sparkle(0.6, 14, False, 7) * 0.22, 49.25)
    place(buf, sparkle(1.0, 24, False, 8) * 0.3, 55.3)
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
