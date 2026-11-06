#!/usr/bin/env python3
"""Soundtrack for Episode 022, synthesised from scratch (no samples, no
licensed music) and mixed under the narration.

Layers: original music bed (lazy hot-day intro, cheerful marimba band on day
one, a sparse minor-key drought theme, relief when the rain returns, a bright
water-cycle section and the outro sting), ambience (cicadas, dry wind, rain,
running tap), whooshes on cuts, label pops, calendar ticks, cracking ground,
the last drip, sparkles and chimes. The music is ducked under the voice and
the final mix is normalised to -14 LUFS / -1.5 dBTP for social platforms.

    python3 build_audio.py            # -> output/mix.wav (+ stems in output/stems)
Requires numpy and ffmpeg.
"""
import os
import subprocess
import sys

import numpy as np

SR = 44100
DUR = 74.6
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

CUTS = (7.9, 10.8, 16.8, 20.3, 22.0, 23.9, 27.7, 33.2, 38.3, 41.2, 48.2, 52.65, 54.6, 57.9, 63.7, 69.2, 71.6)
POPS = (0.15, 0.5, 5.84, 9.5, 13.0, 13.2, 19.48, 21.2, 26.16, 28.4, 28.6, 33.4, 34.76, 35.36, 36.88, 37.56,
        41.4, 45.3, 45.4, 46.1, 46.3, 48.4, 50.3, 56.24, 57.92, 58.96, 60.16, 61.36, 62.8, 63.8, 66.3, 67.44,
        69.4, 69.7, 70.0, 71.9, 72.1, 72.3)

HAPPY = [(53, [65, 69, 72]), (48, [64, 67, 72]), (50, [65, 69, 74]), (46, [65, 70, 74])]  # F C Dm Bb
DRY = [(50, [62, 65, 69]), (46, [62, 65, 70]), (45, [61, 64, 69]), (50, [62, 65, 69])]   # Dm Bb A Dm


def band(buf, a, b, chords, bpm=104, arp=True, gain=1.0, bell=False):
    beat = 60 / bpm
    bar = beat * 4
    t0, i = a, 0
    pat = [0, 1, 2, 1, 0, 2, 1, 2]
    while t0 < b - 0.05:
        root, ch = chords[i % len(chords)]
        place(buf, pad([midi(n) for n in ch], bar + 0.6) * 0.11 * gain, t0)
        if arp:
            for k in range(8):
                if t0 + k * beat / 2 >= b:
                    break
                n = ch[pat[k]] + 12
                inst = musicbox(midi(n + 12), 1.0) * 0.6 if bell else marimba(midi(n))
                place(buf, inst * 0.2 * gain, t0 + k * beat / 2, pan=-0.35 + 0.1 * k)
            for k in range(8):
                if t0 + k * beat / 2 < b:
                    place(buf, shaker() * (0.5 if k % 2 else 0.3) * gain, t0 + k * beat / 2, pan=0.4)
        for k in (0, 2):
            if t0 + k * beat < b:
                place(buf, bass(midi(root - 12) if k == 0 else midi(root - 5), 0.6) * 0.3 * gain, t0 + k * beat)
        t0 += bar
        i += 1


def sparse(buf, a, b, chords, bpm=84, gain=1.0):
    """Slow minor-key theme: pad, low bass and a lonely music-box line."""
    beat = 60 / bpm
    bar = beat * 4
    t0, i = a, 0
    while t0 < b - 0.05:
        root, ch = chords[i % len(chords)]
        place(buf, pad([midi(n) for n in ch], bar + 0.8) * 0.15 * gain, t0)
        place(buf, bass(midi(root - 12), 1.4) * 0.28 * gain, t0)
        for k, step in enumerate([2, 1, 0, 1]):
            if t0 + k * beat < b:
                place(buf, musicbox(midi(ch[step] + 12), 1.4) * 0.1 * gain, t0 + k * beat, pan=0.25 * ((k % 2) * 2 - 1))
        t0 += bar
        i += 1


def music():
    buf = np.zeros((N, 2))
    # hook: lazy hot afternoon (pad + soft music box), then cheerful build
    sparse(buf, 0.0, 7.9, HAPPY, bpm=92, gain=0.9)
    band(buf, 7.9, 10.8, HAPPY, bpm=104, gain=0.8)
    # day one: full playful band
    band(buf, 10.8, 16.8, HAPPY, bpm=104)
    # drought: week -> month -> tap runs dry (sparse, minor)
    sparse(buf, 16.8, 33.2, DRY, bpm=84)
    band(buf, 33.2, 41.2, DRY, bpm=96, arp=True, gain=0.55, bell=True)
    sparse(buf, 41.2, 54.6, DRY, bpm=80, gain=1.05)
    # relief + water cycle: bright and magical
    band(buf, 54.6, 57.9, HAPPY, bpm=104, gain=0.85)
    band(buf, 57.9, 63.7, HAPPY, bpm=104, bell=True)
    band(buf, 63.7, 71.6, HAPPY, bpm=104, gain=0.9)
    # outro sting: F major chord with bells
    place(buf, pad([midi(n) for n in (53, 65, 69, 72, 77)], 3.2) * 0.2, 71.6)
    for k, m in enumerate([77, 81, 84, 89]):
        place(buf, pluck_bell(midi(m), 2.5) * 0.12, 71.65 + k * 0.12, pan=-0.3 + 0.2 * k)
    place(buf, bass(midi(41), 2.0) * 0.3, 71.6)
    # short crossfades at section changes so nothing clicks
    fade = int(1.2 * SR)
    buf[-fade:] *= np.linspace(1, 0, fade)[:, None]
    return buf


def level(sections, smooth=3):
    lvl = np.zeros(N)
    for a, b, g in sections:
        lvl[int(a * SR): int(b * SR)] = g
    return onepole(lvl, smooth)


def cicadas():
    t = np.arange(N) / SR
    carrier = np.sin(2 * np.pi * 4300 * t) * 0.6 + np.sin(2 * np.pi * 5200 * t + 1) * 0.4
    am = 0.5 + 0.5 * np.sign(np.sin(2 * np.pi * 38 * t))
    swell = 0.6 + 0.4 * np.sin(2 * np.pi * 0.21 * t) ** 2
    return carrier * am * swell


def ambience():
    buf = np.zeros((N, 2))
    t = np.arange(N) / SR
    cic = cicadas()
    c_lvl = level([(0, 22.0, 0.10), (22.0, 41.2, 0.13), (41.2, 48.2, 0.08), (69.2, 71.6, 0.06)])
    wind = svf(rs.standard_normal(N), 300, 300, q=0.6)
    wind /= np.abs(wind).max()
    wind *= 0.6 + 0.4 * np.sin(2 * np.pi * 0.13 * t)
    w_lvl = level([(16.8, 33.2, 0.35), (38.3, 54.6, 0.4)])
    rain = onepole(rs.standard_normal(N), 5000) - onepole(rs.standard_normal(N), 600) * 0.5
    rain /= np.abs(rain).max()
    r_lvl = level([(54.6, 57.9, 0.75), (62.8, 63.7, 0.4)], smooth=2)
    tap = svf(rs.standard_normal(N), 1800, 1800, q=1.2)
    tap /= np.abs(tap).max()
    t_lvl = level([(63.7, 67.6, 0.35)], smooth=6)
    mono = cic * c_lvl + wind * w_lvl + rain * r_lvl + tap * t_lvl
    buf[:, 0] = mono
    buf[:, 1] = np.roll(mono, 41)
    # soft distant thunder as the rain arrives
    th = onepole(rs.standard_normal(int(2.5 * SR)), 120)
    th = th / np.abs(th).max() * np.exp(-np.linspace(0, 4, len(th)))
    place(buf, th * 0.7, 54.5)
    return buf


def crackle(dur=1.5, n=30, seed=4):
    r = np.random.default_rng(seed)
    out = np.zeros(int((dur + 0.2) * SR))
    for i in range(n):
        at = (i / n) ** 0.8 * dur
        click = rs.standard_normal(int(0.012 * SR)) * np.exp(-np.linspace(0, 8, int(0.012 * SR)))
        k = int(at * SR)
        out[k: k + len(click)] += click * (0.4 + 0.6 * r.random())
    return out / (np.abs(out).max() + 1e-9)


def drip():
    t = T(0.25)
    f = 900 * (2.2 ** (t / 0.25))
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 22)


def tick():
    t = T(0.05)
    return np.sin(2 * np.pi * 2400 * t) * np.exp(-t * 90)


def sfx():
    buf = np.zeros((N, 2))
    for at in CUTS:
        place(buf, whoosh(0.5) * 0.3, at - 0.25)
    for at in POPS:
        place(buf, pop() * 0.3, at, pan=float(rs.uniform(-0.3, 0.3)))
    # big bubbles get a deeper pop
    for at in (23.12, 26.96, 40.32, 42.76, 51.48, 54.9, 66.08):
        place(buf, pop(700, 220, 0.18) * 0.38, at)
    # calendar ticks while the days roll on
    for a, b, n in ((9.6, 10.6, 12), (17.0, 17.6, 6), (24.2, 25.0, 12)):
        for i in range(n):
            place(buf, tick() * 0.25, a + (b - a) * i / n, pan=-0.4)
    place(buf, crackle(1.5, 34, 4) * 0.35, 22.1)
    place(buf, crackle(1.6, 28, 5) * 0.25, 41.4)
    for at in (29.36, 30.56, 32.4):
        place(buf, whoosh(0.6, 2400, 250) * 0.3, at)  # water level drops
    place(buf, nope() * 0.15, 38.9)  # tap squeak
    place(buf, drip() * 0.5, 39.95)
    place(buf, nope() * 0.28, 40.4)
    place(buf, crackle(3.5, 40, 9) * 0.12, 50.0)  # distant fire
    place(buf, chime((79, 84, 88, 91)) * 0.32, 54.9)
    place(buf, sparkle(0.9, 20, False, 3) * 0.22, 55.0)
    place(buf, sparkle(1.3, 30, True, 2) * 0.28, 57.9)
    place(buf, sparkle(1.2, 26, True, 5) * 0.22, 59.8)   # vapour rises
    place(buf, chime((84, 88, 91)) * 0.28, 61.36)        # cloud forms
    place(buf, chime((86, 91)) * 0.3, 67.8)              # tap closed: check
    place(buf, sparkle(0.6, 14, False, 7) * 0.22, 67.85)
    place(buf, sparkle(1.0, 24, False, 8) * 0.3, 71.6)
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
