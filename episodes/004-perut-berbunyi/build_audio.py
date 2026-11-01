#!/usr/bin/env python3
"""Soundtrack for Episode 004, synthesised from scratch (no samples, no
licensed music) and mixed under the narration.

Layers: playful music bed (bouncy marimba at home, curious music-box + pad in
the learning world, warm reprise, original outro jingle), cartoon stomach
rumbles and gurgles, soft bubble ambience, wave swooshes for peristalsis,
gadget beeps, shrink/grow slide whistles, whooshes, pops and discovery
chimes. Nothing harsh or scary. Music is ducked under the voice and the mix
is normalised to -14 LUFS / -1.5 dBTP.

    python3 build_audio.py            # -> output/mix.wav (+ stems in output/stems)
Requires numpy and ffmpeg. Times below are video seconds; v(n) converts a
narration time to video time.
"""
import os
import subprocess
import sys

import numpy as np

SR = 44100
OFF = 0.6  # narration starts this many seconds into the video (see episode.js)
DUR = 49.0
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



def v(n):
    return n + OFF


# ------------------------------------------------------------- new sounds
def rumble(dur=1.0, f0=82, seed=1):
    """Cartoon tummy rumble: wobbly low 'kruuu' growl ending in a bloop."""
    r = np.random.default_rng(seed)
    t = T(dur)
    f = f0 * (1 + 0.22 * np.sin(2 * np.pi * 6.5 * t)) * (1 - 0.25 * t / dur)
    ph = 2 * np.pi * np.cumsum(f) / SR
    y = sum(np.sin(h * ph) / h ** 1.3 for h in range(1, 7))
    am = 0.75 + 0.25 * np.sin(2 * np.pi * 11 * t)
    y = y * am * env_adsr(len(t), 0.04, 0.1, 0.85, 0.18)
    y = onepole(y, 700)
    n = onepole(r.standard_normal(len(t)), 300) * 0.6 * env_adsr(len(t), 0.05, 0.1, 0.7, 0.2)
    out = np.zeros(int((dur + 0.3) * SR))
    out[: len(t)] += y / (np.abs(y).max() + 1e-9) + n
    b = pop(220, 520, 0.14)
    k = int((dur - 0.08) * SR)
    out[k : k + len(b)] += b * 0.6
    return out / (np.abs(out).max() + 1e-9)


def bubble(f0=320, f1=900, dur=0.07):
    t = T(dur)
    f = f0 * (f1 / f0) ** (t / dur)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 35) * np.sin(np.minimum(t / 0.004, 1) * np.pi / 2)


def gurgle(dur=0.9, seed=3, lo=250, hi=700):
    r = np.random.default_rng(seed)
    out = np.zeros(int((dur + 0.2) * SR))
    tt = 0.0
    while tt < dur:
        f0 = lo + r.random() * (hi - lo)
        b = bubble(f0, f0 * (1.8 + r.random()), 0.05 + r.random() * 0.05) * (0.5 + 0.5 * r.random())
        k = int(tt * SR)
        out[k : k + len(b)] += b[: len(out) - k]
        tt += 0.04 + r.random() * 0.09
    return out / (np.abs(out).max() + 1e-9)


def slide(f0, f1, dur=0.6):
    t = T(dur)
    f = f0 * (f1 / f0) ** (t / dur) * (1 + 0.02 * np.sin(2 * np.pi * 9 * t))
    y = np.sin(2 * np.pi * np.cumsum(f) / SR) + 0.2 * np.sin(4 * np.pi * np.cumsum(f) / SR)
    return y * env_adsr(len(t), 0.03, 0.05, 0.9, 0.12)


def beep_boop():
    out = np.zeros(int(0.5 * SR))
    for i, (f, d) in enumerate([(1320, 0.07), (1760, 0.07), (990, 0.1)]):
        t = T(d)
        s = np.sign(np.sin(2 * np.pi * f * t)) * 0.3 + np.sin(2 * np.pi * f * t) * 0.7
        s *= env_adsr(len(t), 0.003, 0.02, 0.8, 0.02)
        k = int(i * 0.1 * SR)
        out[k : k + len(s)] += s
    return out


def swell(dur=1.2, seed=0):
    """Soft wave-like whoosh for a muscle contraction."""
    x = np.random.default_rng(seed).standard_normal(int(dur * SR))
    y = svf(x, 200, 700, q=0.9)
    y = y * np.sin(np.linspace(0, np.pi, len(y))) ** 2
    return y / (np.abs(y).max() + 1e-9)


def poof():
    x = rs.standard_normal(int(0.45 * SR))
    y = svf(x, 3000, 400, q=0.7) * np.exp(-np.arange(len(x)) / SR * 7)
    return y / (np.abs(y).max() + 1e-9)


def knock():
    t = T(0.12)
    return (np.sin(2 * np.pi * 520 * t) + 0.5 * np.sin(2 * np.pi * 1230 * t)) * np.exp(-t * 45)


# ------------------------------------------------------------------ layers
CUT_IN, CUT_HOME, CUT_OUT = v(9.8), v(32.62), v(43.45)


def music():
    buf = np.zeros((N, 2))
    beat = 60 / 112
    bar = beat * 4
    # home: C  Am  F  G, bouncy marimba + bass
    home = [(48, [60, 64, 67]), (45, [57, 60, 64]), (41, [57, 60, 65]), (43, [59, 62, 67])]
    def home_band(t0, t1, lvl=1.0):
        i = 0
        while t0 < t1 - 0.05:
            root, ch = home[i % 4]
            place(buf, pad([midi(n) for n in ch], bar + 0.6) * 0.1 * lvl, t0)
            for k in range(8):
                if t0 + k * beat / 2 >= t1:
                    break
                n = ch[[0, 1, 2, 1, 0, 2, 1, 2][k]] + 12
                place(buf, marimba(midi(n)) * 0.17 * lvl, t0 + k * beat / 2, pan=-0.3 + 0.08 * k)
            for k in (0, 2):
                if t0 + k * beat < t1:
                    place(buf, bass(midi(root - 12 if k == 0 else root - 5), 0.5) * 0.28 * lvl, t0 + k * beat)
            t0 += bar
            i += 1
    home_band(0.0, CUT_IN - 0.1)
    # learning world: curious music box + soft pad (Dm Bb F C), sparse shaker
    world = [(50, [62, 65, 69]), (46, [62, 65, 70]), (41, [60, 65, 69]), (48, [60, 64, 67])]
    t0, i = CUT_IN, 0
    while t0 < CUT_HOME - 0.1:
        root, ch = world[i % 4]
        place(buf, pad([midi(n) for n in ch], bar + 0.8) * 0.14, t0)
        for k, step in enumerate([0, 2, 1, 2, 0, 1, 2, 1]):
            if t0 + k * beat / 2 < CUT_HOME - 0.1:
                place(buf, musicbox(midi(ch[step] + 12), 1.2) * 0.09, t0 + k * beat / 2, pan=0.35 * ((k % 2) * 2 - 1))
        place(buf, bass(midi(root - 12), 1.2) * 0.2, t0)
        for k in range(4):
            place(buf, shaker() * 0.25, t0 + k * beat + beat / 2, pan=0.4)
        t0 += bar
        i += 1
    home_band(CUT_HOME, CUT_OUT - 0.05, 0.9)
    # outro jingle: "Lit-tle ques-tions, big dis-co-ve-ries!" motif, then C major bells
    j0 = CUT_OUT + 0.15
    motif = [(67, 0.0), (72, 0.18), (76, 0.36), (74, 0.6), (72, 0.78), (79, 1.05)]
    for m, dt in motif:
        place(buf, marimba(midi(m), 0.8) * 0.3, j0 + dt, pan=0.1)
        place(buf, musicbox(midi(m + 12), 1.2) * 0.1, j0 + dt, pan=-0.2)
    place(buf, pad([midi(n) for n in (48, 60, 64, 67, 72)], 3.4) * 0.22, j0 + 1.05)
    for k, m in enumerate([72, 76, 79, 84]):
        place(buf, pluck_bell(midi(m), 2.6) * 0.13, j0 + 1.1 + k * 0.1, pan=-0.3 + 0.2 * k)
    place(buf, bass(midi(36), 2.2) * 0.3, j0 + 1.05)
    fade = int(1.0 * SR)
    buf[-fade:] *= np.linspace(1, 0, fade)[:, None]
    return buf


def ambience():
    """Soft bubbly 'inside the body' ambience in the learning world."""
    buf = np.zeros((N, 2))
    r = np.random.default_rng(12)
    tt = CUT_IN + 0.3
    while tt < CUT_HOME - 0.3:
        f0 = 260 + r.random() * 500
        place(buf, bubble(f0, f0 * 2.2, 0.06) * (0.25 + 0.35 * r.random()), tt, pan=float(r.uniform(-0.7, 0.7)))
        tt += 0.18 + r.random() * 0.5
    t = np.arange(N) / SR
    hum = np.sin(2 * np.pi * 55 * t + 0.4 * np.sin(2 * np.pi * 0.3 * t)) * 0.25
    lvl = np.zeros(N)
    lvl[int(CUT_IN * SR) : int(CUT_HOME * SR)] = 1
    lvl = onepole(lvl, 2)
    buf[:, 0] += hum * lvl
    buf[:, 1] += hum * lvl
    return buf


def sfx():
    buf = np.zeros((N, 2))
    place(buf, knock() * 0.5, v(-0.15), pan=0.3)                 # block placed on the tower
    place(buf, rumble(1.0, 82, 1) * 0.5, v(0.0))                 # KRUUUKKK!
    for at in (1.65, 1.9, 3.35, 3.6, 8.85, 10.05, 11.85, 17.86, 18.82, 19.42, 20.7, 22.92, 23.56, 27.66,
               31.1, 31.7, 31.98, 32.26, 32.75, 34.66, 36.3, 37.16, 39.3, 39.58, 39.86, 41.4, 41.7, 41.95):
        place(buf, pop() * 0.3, v(at), pan=float(rs.uniform(-0.3, 0.3)))
    # gadget + shrinking
    place(buf, beep_boop() * 0.22, v(5.9), pan=-0.1)
    place(buf, pop(1500, 700, 0.08) * 0.35, v(6.6))
    place(buf, sparkle(0.6, 22, True, 2) * 0.3, v(6.55))
    place(buf, slide(1500, 260, 0.75) * 0.22, v(6.95))
    place(buf, whoosh(0.6, 3000, 400) * 0.3, v(6.9))
    place(buf, sparkle(0.5, 14, False, 3) * 0.22, v(7.15))
    # portal into the learning world
    place(buf, sparkle(0.7, 26, True, 4) * 0.28, v(9.2))
    place(buf, whoosh(0.8, 300, 6000) * 0.3, v(9.35))
    place(buf, chime((79, 84, 88)) * 0.28, v(9.85))
    place(buf, sparkle(0.9, 20, False, 5) * 0.22, v(9.9))
    for at in (11.8, 13.98, 15.84, 19.86, 29.06):
        place(buf, whoosh(0.45, 400, 2400) * 0.18, v(at) - 0.22)
    # the big rumble inside the learning world
    place(buf, rumble(0.75, 78, 2) * 0.4, v(14.02))
    place(buf, gurgle(0.6, 4) * 0.25, v(14.2), pan=0.3)
    place(buf, rumble(0.95, 74, 3) * 0.4, v(14.74))
    place(buf, gurgle(0.7, 5) * 0.25, v(15.0), pan=-0.3)
    place(buf, chime((84, 88)) * 0.22, v(15.9))
    # peristalsis: a soft swell for every contraction wave
    tt, i = v(16.3), 0
    while tt < v(29.0):
        place(buf, swell(1.3, i) * 0.22, tt - 0.4, pan=0.2 * ((i % 2) * 2 - 1))
        tt += 1.72
        i += 1
    # gas + liquid on the move: gurgles
    for at, d, s in ((23.0, 0.8, 6), (24.6, 0.7, 7), (25.5, 0.9, 8), (26.5, 1.0, 9), (27.6, 0.6, 10)):
        place(buf, gurgle(d, s) * 0.3, v(at), pan=float(rs.uniform(-0.4, 0.4)))
    place(buf, rumble(0.85, 80, 4) * 0.4, v(28.18))
    # not a monster: poof + happy realisation
    place(buf, poof() * 0.3, v(31.08))
    place(buf, nope() * 0.22, v(31.12))
    place(buf, chime((79, 84, 88, 91)) * 0.36, v(31.3))
    place(buf, sparkle(0.8, 18, False, 6) * 0.25, v(31.15))
    # grow back home
    place(buf, slide(260, 1400, 0.55) * 0.2, v(32.4))
    place(buf, sparkle(0.7, 20, True, 7) * 0.26, v(32.5))
    place(buf, rumble(0.6, 90, 5) * 0.3, v(34.1))
    place(buf, chime((84, 91)) * 0.25, v(36.32))
    place(buf, chime((86, 93)) * 0.25, v(37.18))
    place(buf, chime((84, 88, 91, 96), 0.07) * 0.3, v(39.2))
    place(buf, sparkle(0.6, 14, False, 8) * 0.22, v(39.3))
    place(buf, boing() * 0.15, v(41.25))
    # outro
    place(buf, whoosh(0.6, 500, 5000) * 0.25, CUT_OUT - 0.2)
    place(buf, sparkle(1.2, 28, False, 9) * 0.28, CUT_OUT + 0.1)
    return buf


def load_narration():
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", os.path.join(HERE, "audio", "narration.mp3"), "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"], check=True, capture_output=True).stdout
    vo = np.frombuffer(raw, dtype=np.float32).astype(np.float64)
    out = np.zeros(N)
    k = int(OFF * SR)
    m = min(N - k, len(vo))
    out[k : k + m] = vo[:m]
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
    vv = np.stack([voice, voice], 1)
    for name, b in (("music", m), ("ambience", a), ("sfx", s)):
        write_wav(os.path.join(OUT, "stems", name + ".wav"), b)
    mix = vv * 1.0 + m * 0.5 + a * 0.12 + s * 0.6
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
