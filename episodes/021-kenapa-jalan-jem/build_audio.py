#!/usr/bin/env python3
"""Soundtrack for Episode 021, synthesised from scratch (no samples, no
licensed music) and mixed under the narration.

Layers: gentle original music bed (soft music-box in the jammed car, cheerful
marimba band in the toy-traffic world), traffic-jam ambience (idling engine,
far-off horns), whooshes on cuts, magic sparkle, brake squeaks for the braking
wave, a toy horn, bus hiss, LRT glide, label pops and discovery chimes. The
music is ducked under the voice and the final mix is normalised to
-14 LUFS / -1.5 dBTP for social platforms.

    python3 build_audio.py            # -> output/mix.wav (+ stems in output/stems)
Requires numpy and ffmpeg.
"""
import os
import subprocess
import sys

import numpy as np

SR = 44100
DUR = 72.5
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "output")
N = int(SR * DUR)
rs = np.random.default_rng(21)


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


# ------------------------------------------------------------------ extra sfx
def horn(f=420, dur=0.35, toy=False):
    t = T(dur)
    y = np.zeros_like(t)
    for ff in (f, f * 1.26):
        ph = 2 * np.pi * ff * t
        y += np.sign(np.sin(ph)) * 0.5 + np.sin(ph) * 0.5
    y = onepole(y, 2200 if toy else 1400)
    return y / (np.abs(y).max() + 1e-9) * env_adsr(len(t), 0.01, 0.05, 0.85, 0.08)


def squeak(dur=0.55, f=2600):
    t = T(dur)
    fm = f * (1 + 0.03 * np.sin(2 * np.pi * 23 * t)) * (1 - 0.12 * t / dur)
    y = np.sin(2 * np.pi * np.cumsum(fm) / SR) * 0.7 + svf(rs.standard_normal(len(t)), 3000, 2200, q=3) * 0.15
    return y * env_adsr(len(t), 0.02, 0.1, 0.8, 0.2)


def hiss(dur=0.8):
    x = svf(rs.standard_normal(int(dur * SR)), 4000, 2500, q=0.9)
    x /= np.abs(x).max() + 1e-9
    return x * env_adsr(len(x), 0.01, 0.15, 0.6, 0.4)


def tick():
    t = T(0.03)
    return np.sin(2 * np.pi * 3200 * t) * np.exp(-t * 300)


def thump(dur=0.3):
    t = T(dur)
    return np.sin(2 * np.pi * (90 - 40 * t / dur) * t) * np.exp(-t * 14)


# ------------------------------------------------------------------ layers
CAR_A = (0.0, 12.6)  # in the car, start
TOYW = (12.6, 63.6)  # imagination world
CAR_B = (63.6, 69.5)  # in the car, end
OUTRO = 69.5


def music():
    buf = np.zeros((N, 2))
    bpm = 104
    beat = 60 / bpm
    bar = beat * 4
    # F  C  Dm  Bb  (I V vi IV) in F major
    chords = [(53, [65, 69, 72]), (48, [64, 67, 72]), (50, [65, 69, 74]), (46, [65, 70, 74])]
    arp_pat = [0, 1, 2, 1, 0, 2, 1, 2]
    # stuck in the car: soft pad + music box
    t0, i = CAR_A[0], 0
    while t0 < CAR_A[1]:
        root, ch = chords[i % 4]
        place(buf, pad([midi(n) for n in ch], bar + 0.6) * 0.16, t0)
        for k, step in enumerate([0, 2, 1, 2]):
            place(buf, musicbox(midi(ch[step] + 12)) * 0.12, t0 + k * beat, pan=0.3 * ((k % 2) * 2 - 1))
        t0 += bar
        i += 1
    # toy-traffic world: playful band, a little sparser during the braking wave
    t0, i = TOYW[0], 0
    while t0 < TOYW[1]:
        root, ch = chords[i % 4]
        calm = 34.5 <= t0 < 47.6
        place(buf, pad([midi(n) for n in ch], bar + 0.6) * 0.11, t0)
        for k in range(8):
            if calm and k % 2:
                continue
            n = ch[arp_pat[k]] + 12
            place(buf, marimba(midi(n)) * 0.2, t0 + k * beat / 2, pan=-0.35 + 0.1 * k)
        for k in (0, 2):
            place(buf, bass(midi(root - 12) if k == 0 else midi(root - 5), 0.6) * 0.32, t0 + k * beat)
        for k in range(8):
            place(buf, shaker() * (0.5 if k % 2 else 0.3), t0 + k * beat / 2, pan=0.4)
        t0 += bar
        i += 1
    # back in the car: warm, lighter
    t0, i = CAR_B[0], 0
    while t0 < CAR_B[1]:
        root, ch = chords[i % 4]
        place(buf, pad([midi(n) for n in ch], bar + 0.6) * 0.13, t0)
        for k in range(4):
            place(buf, marimba(midi(ch[[0, 2, 1, 2][k]] + 12)) * 0.15, t0 + k * beat, pan=0.25 * ((k % 2) * 2 - 1))
        place(buf, bass(midi(root - 12), 0.9) * 0.25, t0)
        t0 += bar
        i += 1
    # outro sting: final F major chord with bells
    place(buf, pad([midi(n) for n in (53, 65, 69, 72, 77)], 3.2) * 0.2, OUTRO)
    for k, m in enumerate([77, 81, 84, 89]):
        place(buf, pluck_bell(midi(m), 2.5) * 0.12, OUTRO + 0.05 + k * 0.12, pan=-0.3 + 0.2 * k)
    place(buf, bass(midi(41), 2.0) * 0.3, OUTRO)
    fade = int(1.2 * SR)
    buf[-fade:] *= np.linspace(1, 0, fade)[:, None]
    return buf


def ambience():
    buf = np.zeros((N, 2))
    t = np.arange(N) / SR
    brown = np.cumsum(rs.standard_normal(N))
    brown -= onepole(brown, 0.5)
    brown /= np.abs(brown).max()
    rumble = onepole(brown, 160)
    rumble /= np.abs(rumble).max()
    idle = 0.5 * np.sin(2 * np.pi * 31 * t + 0.4 * np.sin(2 * np.pi * 0.3 * t)) + 0.25 * np.sin(2 * np.pi * 62 * t)
    car = rumble * 0.5 + idle * 0.22
    lvl = np.zeros(N)
    for a, b, g in [(0, 7.4, 0.5), (7.4, 10.45, 0.9), (10.45, 12.6, 0.5), (63.6, 69.5, 0.45)]:
        lvl[int(a * SR) : int(b * SR)] = g
    lvl = onepole(lvl, 3)
    buf[:, 0] = car * lvl
    buf[:, 1] = np.roll(car, 37) * lvl
    # far-off horns in the jam
    for at, f, pan, g in [(1.6, 380, 0.6, 0.18), (4.1, 450, -0.5, 0.14), (8.3, 400, 0.3, 0.3), (9.0, 470, -0.4, 0.22), (65.2, 420, 0.5, 0.12)]:
        place(buf, horn(f, 0.28), at, gain=g, pan=pan)
    return buf


def sfx():
    buf = np.zeros((N, 2))
    for at in (7.4, 15.3, 22.6, 32.0, 34.5, 43.0, 47.6, 51.0, 55.8):
        place(buf, whoosh(0.5) * 0.33, at - 0.25)
    place(buf, whoosh(1.2, 200, 5000) * 0.3, 7.6)  # crane up over the jam
    place(buf, whoosh(1.0, 200, 4000) * 0.3, 43.2)  # pull back over the wave
    place(buf, whoosh(0.6, 2500, 300) * 0.35, 63.35)  # back to the car
    # magic sparkle into the imagination world + reveal
    place(buf, sparkle(1.3, 34, True, 2) * 0.32, 11.1)
    place(buf, sparkle(0.6, 22, False, 3) * 0.3, 12.55)
    place(buf, whoosh(0.9, 300, 6000, rev=True) * 0.25, 11.6)
    # clock ticks on "Lama kan?"
    for k in range(8):
        place(buf, tick() * 0.25, 9.3 + k * 0.14, pan=0.5)
    # toy cars zooming past at the start of the toy world
    for at in (12.9, 13.9, 14.8):
        place(buf, whoosh(0.35, 700, 2400) * 0.2, at, pan=0.3)
    # braking wave: squeaks get stronger car by car, then a stop thump and a toy horn
    for at, g, f in [(35.66, 0.18, 2500), (37.65, 0.24, 2350), (39.55, 0.3, 2200), (41.5, 0.22, 2050), (43.45, 0.16, 1900)]:
        place(buf, squeak(0.6, f) * g, at, pan=0.1)
    place(buf, thump() * 0.45, 41.44)
    place(buf, horn(520, 0.22, toy=True) * 0.22, 46.06)
    place(buf, horn(520, 0.3, toy=True) * 0.22, 46.36)
    # bus pulls in (air hiss) and the LRT glides by
    place(buf, hiss(0.9) * 0.18, 49.5, pan=0.3)
    place(buf, whoosh(2.4, 300, 1800) * 0.3, 52.3, pan=-0.3)
    place(buf, whoosh(0.7, 600, 3000) * 0.22, 54.4)
    # label pops
    for at in (0.12, 0.5, 5.9, 9.26, 14.44, 15.4, 16.1, 19.4, 24.28, 25.54, 28.44, 33.82, 35.66, 37.88, 39.72, 43.0, 47.7, 48.98, 49.88, 52.02, 52.72, 54.06, 67.3, 67.6, 67.9, 69.8, 70.0, 70.2):
        place(buf, pop() * 0.3, at, pan=float(rs.uniform(-0.3, 0.3)))
    place(buf, nope() * 0.3, 41.44)
    place(buf, boing() * 0.22, 55.98)
    # discovery cues
    place(buf, chime((79, 84, 88, 91)) * 0.32, 30.58)
    place(buf, chime((79, 84, 88, 91)) * 0.35, 56.1)
    for at, notes in [(59.48, (84, 88)), (61.26, (86, 91)), (62.36, (88, 93, 96))]:
        place(buf, chime(notes, 0.07) * 0.34, at)
    place(buf, chime((86, 91)) * 0.28, 55.02)
    place(buf, sparkle(0.8, 16, False, 6) * 0.25, 56.2)
    place(buf, chime((86, 91)) * 0.28, 64.5)
    place(buf, sparkle(0.6, 14, False, 7) * 0.22, 64.55)
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
