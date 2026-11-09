#!/usr/bin/env python3
"""Soundtrack for Episode 025, synthesised from scratch (no samples, no
licensed music) and mixed under the narration.

Layers: gentle original music bed (cosy music box in the bedroom, playful
marimba band inside the body), room tone and a soft heartbeat inside the
body, whooshes on cuts, magic sparkle, alarm siren, heater-knob clicks,
thermometer rise, battle boings, label pops and discovery chimes. The music is ducked under the voice and the
final mix is normalised to -14 LUFS / -1.5 dBTP for social platforms.

    python3 build_audio.py            # -> output/mix.wav (+ stems in output/stems)
Requires numpy and ffmpeg.
"""
import os
import subprocess
import sys

import numpy as np

SR = 44100
DUR = 70.6
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
BODY = (13.9, 53.3)  # imagination world: inside the body


def music():
    buf = np.zeros((N, 2))
    bpm = 100
    beat = 60 / bpm
    bar = beat * 4
    # C  G  Am  F  (I V vi IV) in C major
    chords = [(48, [60, 64, 67]), (43, [59, 62, 67]), (45, [60, 64, 69]), (41, [60, 65, 69])]
    arp_pat = [0, 1, 2, 1, 0, 2, 1, 2]
    # bedroom: soft pad + music box, a little wistful (0 - 13.9)
    t0, i = 0.0, 0
    while t0 < BODY[0]:
        root, ch = chords[i % 4]
        place(buf, pad([midi(n) for n in ch], bar + 0.6) * 0.15, t0)
        for k, step in enumerate([0, 2, 1, 2]):
            place(buf, musicbox(midi(ch[step] + 12)) * 0.11, t0 + k * beat, pan=0.3 * ((k % 2) * 2 - 1))
        t0 += bar
        i += 1
    # inside the body: playful band (13.9 - 53.3); tense hold under the alarm
    t0, i = BODY[0], 0
    while t0 < BODY[1]:
        root, ch = chords[i % 4]
        alarm = 17.6 <= t0 < 19.6
        place(buf, pad([midi(n) for n in ch], bar + 0.6) * 0.1, t0)
        for k in range(8):
            n = ch[arp_pat[k]] + 12 + (1 if alarm and k % 2 else 0)
            place(buf, marimba(midi(n)) * 0.19, t0 + k * beat / 2, pan=-0.35 + 0.1 * k)
        for k in (0, 2):
            place(buf, bass(midi(root - 12) if k == 0 else midi(root - 5), 0.6) * 0.3, t0 + k * beat)
        for k in range(8):
            place(buf, shaker() * (0.5 if k % 2 else 0.3), t0 + k * beat / 2, pan=0.4)
        t0 += bar
        i += 1
    # back in bed: warm and light (53.3 - 67.45)
    t0, i = BODY[1], 0
    while t0 < 67.45:
        root, ch = chords[i % 4]
        place(buf, pad([midi(n) for n in ch], bar + 0.6) * 0.13, t0)
        for k in range(4):
            place(buf, marimba(midi(ch[[0, 2, 1, 2][k]] + 12)) * 0.14, t0 + k * beat, pan=0.25 * ((k % 2) * 2 - 1))
        place(buf, bass(midi(root - 12), 0.9) * 0.24, t0)
        t0 += bar
        i += 1
    # outro sting: C major chord with bells
    place(buf, pad([midi(n) for n in (48, 60, 64, 67, 72)], 3.2) * 0.2, 67.45)
    for k, m in enumerate([72, 76, 79, 84]):
        place(buf, pluck_bell(midi(m), 2.5) * 0.12, 67.5 + k * 0.12, pan=-0.3 + 0.2 * k)
    place(buf, bass(midi(36), 2.0) * 0.3, 67.45)
    fade = int(1.2 * SR)
    buf[-fade:] *= np.linspace(1, 0, fade)[:, None]
    return buf


def heartbeat():
    t = T(0.18)
    return np.sin(2 * np.pi * (55 + 30 * np.exp(-t * 30)) * t) * np.exp(-t * 22)


def ambience():
    buf = np.zeros((N, 2))
    # bedroom: soft room tone (filtered noise), quiet
    room = onepole(rs.standard_normal(N), 400)
    room /= np.abs(room).max()
    lvl = np.zeros(N)
    for a, b, g in [(0, BODY[0], 0.35), (BODY[1], 67.45, 0.35)]:
        lvl[int(a * SR) : int(b * SR)] = g
    lvl = onepole(lvl, 3)
    buf[:, 0] += room * lvl
    buf[:, 1] += np.roll(room, 53) * lvl
    # inside the body: a gentle heartbeat (lub-dub) and a whooshing blood flow
    flow = svf(rs.standard_normal(N), 180, 180, q=0.9)
    flow /= np.abs(flow).max()
    fl = np.zeros(N)
    fl[int(BODY[0] * SR) : int(BODY[1] * SR)] = 1
    fl = onepole(fl, 2)
    wob = 0.6 + 0.4 * np.sin(2 * np.pi * 1.25 * np.arange(N) / SR)
    buf[:, 0] += flow * fl * wob * 0.5
    buf[:, 1] += np.roll(flow, 71) * fl * wob * 0.5
    tt = BODY[0] + 0.1
    while tt < BODY[1] - 0.3:
        place(buf, heartbeat() * 1.6, tt)
        place(buf, heartbeat() * 1.1, tt + 0.28)
        tt += 0.8
    return buf


def siren(dur=1.6):
    t = T(dur)
    f = np.where((t * 3.2) % 1 < 0.5, 880, 660)
    y = np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * 0.3 + np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.7
    y = onepole(y, 3000)
    return y * env_adsr(len(t), 0.02, 0.1, 1, 0.3)


def click():
    t = T(0.04)
    return rs.standard_normal(len(t)) * np.exp(-t * 300) * 0.8 + np.sin(2 * np.pi * 2200 * t) * np.exp(-t * 200)


def rise(dur=1.7, f0=400, f1=1400):
    t = T(dur)
    f = f0 * (f1 / f0) ** (t / dur)
    y = np.sin(2 * np.pi * np.cumsum(f) / SR) + 0.3 * np.sin(4 * np.pi * np.cumsum(f) / SR)
    return y * env_adsr(len(t), 0.05, 0.1, 0.8, 0.3)


def brr(dur=1.0):
    t = T(dur)
    return np.sin(2 * np.pi * 180 * t) * (0.5 + 0.5 * np.sign(np.sin(2 * np.pi * 22 * t))) * env_adsr(len(t), 0.05, 0.1, 0.7, 0.3)


def sfx():
    buf = np.zeros((N, 2))
    for at in (5.3, 9.7, 15.95, 19.55, 23.95, 33.45, 38.25, 45.05, 47.95):
        place(buf, whoosh(0.5) * 0.35, at - 0.25)
    place(buf, whoosh(0.6, 2500, 300) * 0.35, 53.05)  # back to the bedroom
    # magic sparkle into the body + reveal
    place(buf, sparkle(1.3, 34, True, 2) * 0.32, 12.4)
    place(buf, sparkle(0.6, 22, False, 3) * 0.3, 13.85)
    place(buf, whoosh(0.9, 300, 6000, rev=True) * 0.25, 13.0)
    # cold: icy sparkle and shivers
    place(buf, sparkle(1.4, 20, False, 9) * 0.18, 9.8)
    place(buf, brr(1.0) * 0.12, 8.5, pan=-0.2)
    place(buf, brr(1.2) * 0.12, 34.4, pan=0.2)
    # nerve signal blips, then the alarm
    for k in range(4):
        place(buf, pop(1400 + 200 * k, 1800 + 200 * k, 0.08) * 0.22, 16.0 + k * 0.28)
    place(buf, siren(1.7) * 0.2, 17.84)
    # heater knob clicks while it turns, then thermometer rising
    tt = 20.35
    while tt < 23.4:
        place(buf, click() * 0.25, tt, pan=0.3)
        tt += 0.22
    place(buf, rise(1.7, 380, 900) * 0.16, 30.3)
    place(buf, rise(0.7, 900, 1200) * 0.12, 32.6)
    # body warmth
    place(buf, sparkle(1.2, 18, False, 11) * 0.2, 37.5)
    # battle: boings and pops as the white blood cells bump the germs
    for k, at in enumerate((43.75, 43.9, 44.05, 44.2)):
        place(buf, boing(0.4) * 0.18, at, pan=-0.3 + 0.2 * k)
    place(buf, whoosh(0.8, 600, 2600) * 0.3, 47.0, pan=0.4)  # germs flee
    place(buf, nope() * 0.2, 46.0)
    # label pops
    for at in (0.12, 0.5, 0.9, 6.94, 8.7, 10.66, 14.24, 14.56, 16.0, 16.56, 20.76, 22.76, 24.02, 26.86, 29.0, 31.0, 32.54,
               34.54, 35.62, 38.3, 39.96, 41.28, 45.2, 45.96, 50.86, 53.32, 54.98, 56.78, 58.94, 65.2, 65.5, 65.8, 67.75, 67.95, 68.15):
        place(buf, pop() * 0.3, at, pan=float(rs.uniform(-0.3, 0.3)))
    place(buf, chime((79, 84)) * 0.3, 43.0)
    # checklist ticks
    for at in (56.3, 58.0, 59.8):
        place(buf, chime((88, 93), 0.06) * 0.25, at)
    # discovery cues
    place(buf, boing() * 0.22, 48.14)
    place(buf, chime((79, 84, 88, 91)) * 0.35, 48.3)
    place(buf, chime((84, 88, 91, 96), 0.07) * 0.42, 51.88)
    place(buf, sparkle(0.8, 16, False, 6) * 0.25, 52.0)
    place(buf, chime((86, 91)) * 0.28, 60.9)
    place(buf, sparkle(0.6, 14, False, 7) * 0.22, 60.95)
    place(buf, sparkle(1.0, 24, False, 8) * 0.3, 67.45)
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
