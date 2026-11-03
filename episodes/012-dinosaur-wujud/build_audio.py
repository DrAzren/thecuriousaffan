#!/usr/bin/env python3
"""Soundtrack for Episode 012, synthesised from scratch (no samples, no
licensed music) and mixed under the narration.

Layers: gentle original music bed (sunny music-box intro in the bedroom, an
adventurous marimba + tom band in the prehistoric imagination world),
jungle birds and insects, friendly dinosaur rumbles and footsteps, brush
scratches, bone clicks as the skeleton is pieced together, the space rock
whoosh and a soft distant boom, a chicken cluck, a bird chirp, whooshes on
cuts, magic sparkle, label pops and discovery chimes. The music is ducked
under the voice and the final mix is normalised to -14 LUFS / -1.5 dBTP.

    python3 build_audio.py            # -> output/mix.wav (+ stems in output/stems)
Requires numpy and ffmpeg.
"""
import os
import subprocess
import sys

import numpy as np

SR = 44100
DUR = 70.0
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "output")
N = int(SR * DUR)
rs = np.random.default_rng(12)


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
CUTS = (3.72, 10.95, 18.45, 20.94, 24.38, 30.46, 35.62, 37.74, 39.72, 43.24, 46.38, 53.01, 56.54, 60.22, 64.59)
JUNGLE = [(10.95, 18.45), (35.62, 39.72), (46.38, 60.22)]
IMAG = (10.95, 60.22)   # imagination world (valley + dig site)
END = 66.93             # outro starts


def tom(f=110, dur=0.35):
    t = T(dur)
    fi = f * (1 + 0.6 * np.exp(-t * 30))
    return np.sin(2 * np.pi * np.cumsum(fi) / SR) * np.exp(-t * 9)


def music():
    buf = np.zeros((N, 2))
    bpm = 104
    beat = 60 / bpm
    bar = beat * 4
    # F  C  Dm  Bb (I V vi IV) in F major
    chords = [(41, [65, 69, 72]), (36, [64, 67, 72]), (38, [65, 69, 74]), (34, [65, 70, 74])]
    arp_pat = [0, 1, 2, 1, 0, 2, 1, 2]
    # sunny bedroom intro: pad + music box (0 - 10.95)
    t0, i = 0.0, 0
    while t0 < IMAG[0]:
        root, ch = chords[i % 4]
        place(buf, pad([midi(n) for n in ch], bar + 0.6) * 0.15, t0)
        for k, step in enumerate([0, 2, 1, 2]):
            place(buf, musicbox(midi(ch[step] + 12)) * 0.11, t0 + k * beat, pan=0.3 * ((k % 2) * 2 - 1))
        t0 += bar
        i += 1
    # imagination world: adventurous band with marimba arps, toms, shaker
    t0, i = IMAG[0], 0
    while t0 < IMAG[1]:
        root, ch = chords[i % 4]
        # gentler, sparser bar while the space rock falls (46.4 - 53.0)
        calm = 46.0 <= t0 < 52.9
        place(buf, pad([midi(n) for n in ch], bar + 0.6) * (0.16 if calm else 0.1), t0)
        if not calm:
            for k in range(8):
                place(buf, marimba(midi(ch[arp_pat[k]] + 12)) * 0.18, t0 + k * beat / 2, pan=-0.35 + 0.1 * k)
            for k in range(8):
                place(buf, shaker() * (0.5 if k % 2 else 0.3), t0 + k * beat / 2, pan=0.4)
            for k in (0, 3):
                place(buf, tom(95 if k == 0 else 130) * 0.32, t0 + k * beat, pan=-0.1)
        for k in (0, 2):
            place(buf, bass(midi(root - 12) if k == 0 else midi(root - 5), 0.6) * 0.3, t0 + k * beat)
        t0 += bar
        i += 1
    # back in the bedroom: warm, lighter
    t0, i = IMAG[1], 0
    while t0 < END:
        root, ch = chords[i % 4]
        place(buf, pad([midi(n) for n in ch], bar + 0.6) * 0.13, t0)
        for k in range(4):
            place(buf, marimba(midi(ch[[0, 2, 1, 2][k]] + 12)) * 0.15, t0 + k * beat, pan=0.25 * ((k % 2) * 2 - 1))
        place(buf, bass(midi(root - 12), 0.9) * 0.25, t0)
        t0 += bar
        i += 1
    # outro sting: F major chord with bells
    place(buf, pad([midi(n) for n in (41, 53, 57, 60, 65)], 3.2) * 0.2, END)
    for k, m in enumerate([77, 81, 84, 89]):
        place(buf, pluck_bell(midi(m), 2.5) * 0.12, END + 0.05 + k * 0.12, pan=-0.3 + 0.2 * k)
    place(buf, bass(midi(29), 2.0) * 0.3, END)
    fade = int(1.4 * SR)
    buf[-fade:] *= np.linspace(1, 0, fade)[:, None]
    return buf


def chirp(f0=3200, f1=4600, dur=0.09):
    t = T(dur)
    f = f0 + (f1 - f0) * (t / dur)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * t / dur)


def ambience():
    buf = np.zeros((N, 2))
    # jungle: distant bird calls and an insect hum
    for a, b in JUNGLE:
        tt = a + 0.2
        while tt < b - 0.4:
            f = float(rs.uniform(2200, 3600))
            for k in range(int(rs.integers(2, 4))):
                place(buf, chirp(f, f * 1.35) * 0.18, tt + k * 0.13, pan=float(rs.uniform(-0.8, 0.8)))
            tt += 0.9 + rs.random() * 0.9
        n = int((b - a) * SR)
        hum = svf(rs.standard_normal(n), 5200, 5200, q=4) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.4 * T(b - a)))
        hum *= env_adsr(n, 0.3, 0.01, 1, 0.3)
        place(buf, hum / (np.abs(hum).max() + 1e-9) * 0.05, a)
    # dig site: light breeze
    for a, b in [(18.45, 35.62), (39.72, 46.38)]:
        n = int((b - a) * SR)
        w = onepole(rs.standard_normal(n), 500) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.15 * T(b - a)))
        w *= env_adsr(n, 0.3, 0.01, 1, 0.3)
        place(buf, w / (np.abs(w).max() + 1e-9) * 0.12, a)
    return buf


def rumble(dur=1.1, f=70):
    """Friendly dinosaur hum/roar: low wobbling tone with a growly edge."""
    t = T(dur)
    fi = f * (1 + 0.25 * np.sin(2 * np.pi * 2.5 * t) + 0.3 * t)
    ph = 2 * np.pi * np.cumsum(fi) / SR
    y = sum(np.sin(k * ph) / k for k in range(1, 7)) * (0.8 + 0.2 * np.sin(2 * np.pi * 31 * t))
    return y * env_adsr(len(t), 0.08, 0.2, 0.8, 0.35) / 2


def kid_roar(dur=0.75):
    t = T(dur)
    fi = 260 + 120 * np.sin(np.pi * t / dur)
    ph = 2 * np.pi * np.cumsum(fi) / SR
    y = sum(np.sin(k * ph) / k for k in range(1, 6)) * (0.75 + 0.25 * np.sin(2 * np.pi * 37 * t))
    return y * env_adsr(len(t), 0.03, 0.1, 0.8, 0.25) / 2


def thump(dur=0.3):
    t = T(dur)
    return (np.sin(2 * np.pi * 48 * t) + 0.4 * np.sin(2 * np.pi * 75 * t)) * np.exp(-t * 14)


def scratch(dur=1.4):
    out = np.zeros(int(dur * SR))
    k = 0.0
    while k < dur - 0.08:
        x = svf(rs.standard_normal(int(0.07 * SR)), 1800, 1200, q=1.0)
        x *= np.hanning(len(x))
        i = int(k * SR)
        out[i:i + len(x)] += x
        k += 0.16
    return out / (np.abs(out).max() + 1e-9)


def click(f=2400):
    t = T(0.05)
    return np.sin(2 * np.pi * f * t) * np.exp(-t * 90) + 0.5 * np.sin(2 * np.pi * f * 1.6 * t) * np.exp(-t * 120)


def boom(dur=2.6):
    t = T(dur)
    n = svf(rs.standard_normal(len(t)), 300, 60, q=0.8, mode="lp")
    n = n / (np.abs(n).max() + 1e-9)
    y = (np.sin(2 * np.pi * 42 * t) * 0.8 + n) * np.exp(-t * 1.6) * (1 - np.exp(-t * 40))
    return y / (np.abs(y).max() + 1e-9)


def cluck():
    out = np.zeros(int(0.7 * SR))
    for k, (f, d) in enumerate([(620, 0.07), (640, 0.07), (900, 0.16)]):
        t = T(d)
        fi = f * (1 - 0.3 * t / d)
        s = np.sin(2 * np.pi * np.cumsum(fi) / SR) * np.sin(np.pi * t / d)
        s = np.sign(s) * np.abs(s) ** 0.6
        i = int([0, 0.11, 0.24][k] * SR)
        out[i:i + len(s)] += s
    return out * 0.6


def sfx():
    buf = np.zeros((N, 2))
    for at in CUTS:
        place(buf, whoosh(0.5) * 0.28, at - 0.25)
    # "Raaawr!" toy roar
    place(buf, kid_roar() * 0.18, 0.1, pan=-0.2)
    # magic sparkle into the valley + reveal
    place(buf, sparkle(1.3, 34, True, 2) * 0.32, 9.45)
    place(buf, sparkle(0.6, 22, False, 3) * 0.3, 10.9)
    place(buf, whoosh(0.9, 300, 6000, rev=True) * 0.25, 10.2)
    # long-neck walks in (footsteps) and hums
    for k in range(6):
        place(buf, thump() * 0.45, 11.1 + k * 0.49, pan=-0.4 + 0.08 * k)
    place(buf, rumble(1.2, 72) * 0.28, 13.9, pan=-0.3)
    place(buf, rumble(0.9, 70) * 0.2, 36.0, pan=-0.4)
    # brushing sand
    place(buf, scratch(2.2) * 0.22, 22.2, pan=0.1)
    place(buf, scratch(1.8) * 0.22, 30.5, pan=0.1)
    # bones turn to stone
    place(buf, sparkle(0.7, 14, True, 4) * 0.2, 29.5)
    # skeleton pieces snapping together like a puzzle
    for k in range(26):
        place(buf, click(2000 + 90 * (k % 7)) * 0.22, 33.2 + k * 0.075, pan=float(rs.uniform(-0.5, 0.5)))
    place(buf, chime((84, 88, 91, 96), 0.07) * 0.3, 35.0)
    # bus horn toot (soft)
    t = T(0.35)
    horn = (np.sin(2 * np.pi * 392 * t) + np.sin(2 * np.pi * 494 * t)) * env_adsr(len(t), 0.02, 0.05, 0.8, 0.08) * 0.5
    place(buf, horn * 0.16, 37.4, pan=0.4)
    # chicken clucks + bird chirps
    place(buf, cluck() * 0.3, 38.9, pan=0.3)
    place(buf, cluck() * 0.25, 58.0, pan=0.3)
    for k in range(4):
        place(buf, chirp(3400, 4800, 0.08) * 0.25, 54.3 + k * 0.14, pan=0.3)
    # Malaysia tooth: discovery chime
    place(buf, chime((79, 84, 88)) * 0.28, 39.9)
    # space rock: rising whoosh, soft distant boom and rumble
    place(buf, whoosh(3.2, 200, 2500) * 0.3, 47.0)
    place(buf, boom() * 0.55, 50.1)
    # discovery cues
    place(buf, chime((79, 84, 88, 91)) * 0.35, 56.6)
    place(buf, sparkle(0.8, 16, False, 6) * 0.25, 56.65)
    place(buf, chime((86, 91)) * 0.28, 60.75)
    place(buf, sparkle(0.6, 14, False, 7) * 0.22, 60.8)
    place(buf, sparkle(1.0, 24, False, 8) * 0.3, END)
    # label pops
    for at in (0.15, 0.5, 3.8, 5.3, 7.12, 7.96, 12.04, 15.28, 16.8, 16.9, 17.36, 18.6, 19.0, 19.8, 23.2, 23.4, 25.44, 26.16, 26.88,
               29.16, 29.35, 29.52, 31.12, 33.2, 34.64, 36.4, 37.44, 38.16, 38.6, 38.88, 39.84, 40.8, 41.76, 43.4, 44.1, 45.2,
               47.36, 50.3, 53.6, 54.16, 54.5, 55.0, 58.64, 62.29, 64.7, 65.0, 65.3, 67.2, 67.4, 67.6):
        place(buf, pop() * 0.3, at, pan=float(rs.uniform(-0.3, 0.3)))
    place(buf, nope() * 0.28, 52.05)
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
    mix = v * 1.0 + m * 0.55 + a * 0.25 + s * 0.55
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
