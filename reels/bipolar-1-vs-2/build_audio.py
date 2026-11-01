#!/usr/bin/env python3
"""Soundtrack for the reel: cleaned-up voice + original synthesised music bed
(ducked under the voice) + ~100 sound effects placed from cues.json.
Everything is synthesised here; no samples or licensed music.

    python3 build_audio.py <voice.wav> <cues.json> <out.wav>
Requires numpy, scipy and ffmpeg. Output: 48 kHz stereo, -14 LUFS, -1.5 dBTP.
"""
import json
import os
import subprocess
import sys
import tempfile

import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, sosfilt, sosfiltfilt

SR = 48000
VOICE, CUES, OUT = sys.argv[1:4]
cues = json.load(open(CUES))
DUR = cues["total"] + 0.3
N = int(DUR * SR)
rng = np.random.default_rng(7)
TMP = tempfile.mkdtemp()


def T(sec):
    return np.arange(int(sec * SR)) / SR


def norm(x):
    return x / (np.abs(x).max() + 1e-9)


def bp(x, lo, hi, order=2):
    return sosfilt(butter(order, [lo, hi], btype="band", fs=SR, output="sos"), x)


def lp(x, fc, order=2):
    return sosfilt(butter(order, fc, btype="low", fs=SR, output="sos"), x)


def hp(x, fc, order=2):
    return sosfilt(butter(order, fc, btype="high", fs=SR, output="sos"), x)


def sweep_filter(x, f0, f1, q=3.0, blocks=64):
    """Band-pass whose centre glides f0 -> f1 (log), processed in overlapping blocks."""
    out = np.zeros_like(x)
    n = len(x)
    L = n // blocks + 1
    win = np.hanning(2 * L)
    for b in range(blocks):
        s = max(0, b * L - L // 2)
        e = min(n, s + 2 * L)
        fc = f0 * (f1 / f0) ** (b / max(blocks - 1, 1))
        bw = fc / q
        seg = bp(x[s:e], max(30, fc - bw), min(SR / 2 - 100, fc + bw))
        out[s:e] += seg * win[: e - s]
    return out


def env(n, a=0.005, r=0.1, curve=1.0):
    e = np.ones(n)
    na, nr = int(a * SR), int(r * SR)
    if na:
        e[:na] = np.linspace(0, 1, na)
    if nr:
        e[-nr:] *= np.linspace(1, 0, nr) ** curve
    return e


def tone(f, dur, decay=6.0, harm=((1, 1.0),)):
    t = T(dur)
    y = sum(a * np.sin(2 * np.pi * f * h * t) for h, a in harm)
    return y * np.exp(-t * decay) * env(len(t), 0.002, 0.02)


def glide(f0, f1, dur, decay=8.0, shape="sin"):
    t = T(dur)
    f = f0 * (f1 / f0) ** (t / dur)
    ph = 2 * np.pi * np.cumsum(f) / SR
    y = np.sin(ph) if shape == "sin" else np.sign(np.sin(ph)) * 0.6
    return y * np.exp(-t * decay)


def midi(m):
    return 440.0 * 2 ** ((m - 69) / 12)


# ------------------------------------------------------------------ SFX bank
def s_whoosh(dur=0.5, f0=250, f1=4000):
    x = rng.standard_normal(int(dur * SR))
    y = sweep_filter(x, f0, f1, q=2.5)
    return norm(y * np.sin(np.linspace(0, np.pi, len(y))) ** 1.8)


def s_swoosh():
    return s_whoosh(0.35, 600, 6000)


def s_whoosh_big():
    a = s_whoosh(0.9, 120, 3000)
    b = glide(90, 40, 0.9, 3) * 0.6
    return norm(a + b[: len(a)])


def s_whip():
    a = s_whoosh(0.22, 1500, 300)
    c = np.zeros(int(0.3 * SR))
    c[: len(a)] = a
    snap = hp(rng.standard_normal(int(0.03 * SR)), 2500) * np.exp(-T(0.03) * 120)
    k = int(0.2 * SR)
    c[k:k + len(snap)] += snap * 1.2
    return norm(c)


def s_pop():
    return norm(glide(1100, 380, 0.11, 32))


def s_bubble():
    y = glide(300, 1400, 0.09, 18)
    y[: int(0.07 * SR)] += 0.5 * glide(600, 1800, 0.07, 30)
    return norm(y)


def s_tick():
    t = T(0.05)
    return norm(hp(rng.standard_normal(len(t)), 3000) * np.exp(-t * 160) + 0.5 * np.sin(2 * np.pi * 2200 * t) * np.exp(-t * 90))


def s_clock():
    t = T(0.08)
    a = np.sin(2 * np.pi * 3100 * t) * np.exp(-t * 120) + 0.6 * bp(rng.standard_normal(len(t)), 1500, 5000) * np.exp(-t * 200)
    return norm(a)


def s_ding():
    return norm(tone(midi(88), 0.9, 5, ((1, 1), (2.76, 0.4), (5.4, 0.15))))


def s_chime():
    out = np.zeros(int(1.8 * SR))
    for i, m in enumerate((79, 84, 88, 91)):
        s = tone(midi(m), 1.4, 3.5, ((1, 1), (2.76, 0.35), (5.4, 0.1)))
        k = int(i * 0.08 * SR)
        out[k:k + len(s)] += s
    return norm(out)


def s_impact():
    t = T(1.2)
    sub = np.sin(2 * np.pi * (55 + 60 * np.exp(-t * 18)) * t) * np.exp(-t * 3.2)
    crack = lp(rng.standard_normal(len(t)), 5000) * np.exp(-t * 22)
    body = bp(rng.standard_normal(len(t)), 80, 600) * np.exp(-t * 6)
    return norm(sub * 1.2 + crack * 0.5 + body * 0.6)


def s_boom():
    t = T(1.6)
    sub = np.sin(2 * np.pi * (42 + 40 * np.exp(-t * 10)) * t) * np.exp(-t * 2.2)
    rum = lp(rng.standard_normal(len(t)), 300) * np.exp(-t * 3) * 0.8
    return norm(sub + rum)


def s_riser(dur=1.0):
    x = rng.standard_normal(int(dur * SR))
    y = sweep_filter(x, 300, 7000, q=4)
    t = T(dur)
    tonal = np.sin(2 * np.pi * np.cumsum(200 * (8 ** (t / dur))) / SR) * 0.3
    return norm((y + tonal) * (t / dur) ** 2.2)


def s_riser_short():
    return s_riser(0.45)


def s_boing():
    t = T(0.45)
    f = 220 + 160 * np.sin(2 * np.pi * 9 * t) * np.exp(-t * 6) + 180 * t
    return norm(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 6))


def s_buzz():
    t = T(0.55)
    y = np.sign(np.sin(2 * np.pi * 110 * t)) * 0.5 + np.sign(np.sin(2 * np.pi * 116 * t)) * 0.5
    y = lp(y, 2500) * env(len(t), 0.005, 0.08)
    y[int(0.24 * SR):int(0.3 * SR)] *= 0.1
    return norm(y)


def s_alarm():
    out = np.zeros(int(0.9 * SR))
    for i in range(3):
        s = glide(880, 880, 0.18, 4, "sq")
        k = int(i * 0.28 * SR)
        out[k:k + len(s)] += lp(s, 3500)
    return norm(out)


def s_siren():
    t = T(1.6)
    f = 700 + 250 * (np.sin(2 * np.pi * 1.6 * t) > 0)
    y = np.sin(2 * np.pi * np.cumsum(f) / SR) * env(len(t), 0.1, 0.5)
    return norm(lp(y, 2000))


def s_glitch():
    out = np.zeros(int(0.5 * SR))
    k = 0
    while k < len(out) - 2000:
        L = int(rng.uniform(0.01, 0.05) * SR)
        kind = rng.integers(3)
        t = np.arange(L) / SR
        if kind == 0:
            seg = np.sign(np.sin(2 * np.pi * rng.uniform(80, 1600) * t))
        elif kind == 1:
            seg = rng.standard_normal(L)
        else:
            seg = np.round(np.sin(2 * np.pi * rng.uniform(200, 900) * t) * 3) / 3
        out[k:k + L] += seg[: len(out) - k] * rng.uniform(0.3, 1)
        k += L + int(rng.uniform(0, 0.015) * SR)
    return norm(out)


def s_draw():
    x = rng.standard_normal(int(0.9 * SR))
    y = bp(x, 2000, 6000) * (0.6 + 0.4 * np.sin(2 * np.pi * 14 * T(0.9)))
    return norm(y * env(len(y), 0.05, 0.3))


def s_coin():
    a = tone(midi(95), 0.25, 14, ((1, 1), (2.0, 0.3)))
    b = tone(midi(100), 0.4, 9, ((1, 1), (2.0, 0.3)))
    out = np.zeros(int(0.5 * SR))
    out[: len(a)] += a
    k = int(0.06 * SR)
    out[k:k + len(b)] += b
    return norm(out)


def s_chaching():
    out = np.zeros(int(1.2 * SR))
    mech = bp(rng.standard_normal(int(0.08 * SR)), 1500, 6000) * np.exp(-T(0.08) * 60)
    out[: len(mech)] += mech
    k = int(0.12 * SR)
    bell = tone(midi(96), 1.0, 4, ((1, 1), (2.4, 0.5), (3.9, 0.3), (5.1, 0.2)))
    out[k:k + len(bell)] += bell
    return norm(out)


def s_fanfare():
    out = np.zeros(int(1.4 * SR))
    for i, (m, d) in enumerate([(72, 0.14), (76, 0.14), (79, 0.14), (84, 0.8)]):
        t = T(d + 0.2)
        f = midi(m)
        y = sum(np.sin(2 * np.pi * f * h * t) / h for h in range(1, 7)) * env(len(t), 0.01, 0.15) * np.exp(-t * 1.5)
        k = int(i * 0.13 * SR)
        out[k:k + len(y)] += lp(y, 4000)
    return norm(out)


def s_cheer():
    t = T(1.6)
    claps = np.zeros(len(t))
    for _ in range(120):
        k = int(rng.uniform(0, 1.4) * SR)
        c = bp(rng.standard_normal(int(0.02 * SR)), 900, 4000) * np.exp(-T(0.02) * 200)
        claps[k:k + len(c)] += c * rng.uniform(0.3, 1)
    crowd = bp(rng.standard_normal(len(t)), 300, 1800) * 0.25
    return norm((claps + crowd) * env(len(t), 0.2, 0.6))


def s_stamp():
    t = T(0.5)
    thud = np.sin(2 * np.pi * (90 + 120 * np.exp(-t * 40)) * t) * np.exp(-t * 14)
    slap = bp(rng.standard_normal(len(t)), 400, 3500) * np.exp(-t * 45)
    return norm(thud + slap * 0.8)


def s_rise_small():
    return norm(glide(300, 900, 0.35, 3) * env(int(0.35 * SR), 0.01, 0.1))


def s_rise_big():
    a = glide(200, 1400, 0.6, 1.5) * env(int(0.6 * SR), 0.01, 0.15)
    return norm(a + 0.4 * s_whoosh(0.6, 400, 5000)[: len(a)])


def s_down():
    a = glide(700, 120, 0.8, 2.5) * env(int(0.8 * SR), 0.01, 0.2)
    return norm(lp(a, 3000))


def s_heartbeat():
    out = np.zeros(int(2.0 * SR))
    for k0 in (0.0, 0.85):
        for dk, g in ((0.0, 1.0), (0.22, 0.7)):
            t = T(0.25)
            beat = np.sin(2 * np.pi * (45 + 25 * np.exp(-t * 30)) * t) * np.exp(-t * 18) * g
            k = int((k0 + dk) * SR)
            out[k:k + len(beat)] += beat
    return norm(out)


BANK = {k[2:]: v for k, v in globals().items() if k.startswith("s_")}

# ------------------------------------------------------------------- music
def music():
    """Original pulse/lo-fi bed in A minor (Am-F-C-G), 100 bpm."""
    buf = np.zeros(N)
    bpm = 100
    beat = 60 / bpm
    bar = beat * 4
    chords = [(57, [69, 72, 76]), (53, [69, 72, 77]), (48, [67, 72, 76]), (55, [67, 71, 74])]
    t0, i = 0.0, 0
    while t0 < DUR:
        root, ch = chords[i % 4]
        # pad
        t = T(bar + 0.4)
        pad = np.zeros(len(t))
        for m in ch:
            for det in (-0.003, 0.003):
                f = midi(m - 12) * (1 + det)
                pad += sum(np.sin(2 * np.pi * f * h * t + h) / (h * h) for h in range(1, 5))
        pad = lp(pad, 1800) * env(len(t), 0.4, 0.5) * 0.05
        k = int(t0 * SR)
        buf[k:k + len(pad)] += pad[: N - k]
        # bass + kick + hats + pluck arp
        for b in range(4):
            tb = t0 + b * beat
            kb = int(tb * SR)
            kick = np.sin(2 * np.pi * (48 + 90 * np.exp(-T(0.3) * 35)) * T(0.3)) * np.exp(-T(0.3) * 9) * 0.32
            buf[kb:kb + len(kick)] += kick[: N - kb]
            bass = tone(midi(root - 12), beat * 0.9, 3, ((1, 1), (2, 0.25))) * 0.16
            buf[kb:kb + len(bass)] += bass[: N - kb]
            for hh in (0.5,):
                kh = int((tb + hh * beat) * SR)
                hat = hp(rng.standard_normal(int(0.04 * SR)), 7000) * np.exp(-T(0.04) * 110) * 0.05
                buf[kh:kh + len(hat)] += hat[: max(0, N - kh)]
            for s8 in range(2):
                m = ch[(b * 2 + s8) % 3] + 12
                kp = int((tb + s8 * beat / 2) * SR)
                pl = tone(midi(m), 0.35, 9, ((1, 1), (2, 0.2), (3, 0.08))) * 0.035
                buf[kp:kp + len(pl)] += pl[: max(0, N - kp)]
        t0 += bar
        i += 1
    return buf


# ------------------------------------------------------------------- voice
def load_voice():
    clean = os.path.join(TMP, "voice_clean.wav")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", VOICE, "-af",
                    "highpass=f=85,afftdn=nf=-28:nt=w,equalizer=f=3200:t=q:w=1.2:g=2.5,equalizer=f=250:t=q:w=1:g=-2,"
                    "acompressor=threshold=-20dB:ratio=3:attack=8:release=120:makeup=3,alimiter=limit=0.95",
                    "-ac", "1", "-ar", str(SR), clean], check=True)
    sr, v = wavfile.read(clean)
    v = v.astype(np.float64) / 32768.0
    out = np.zeros(N)
    out[: min(N, len(v))] = v[:N]
    return out


voice = load_voice()

# duck music under voice (smoothed envelope)
venv = np.sqrt(sosfiltfilt(butter(1, 4, fs=SR, output="sos"), voice ** 2).clip(0))
venv = venv / (venv.max() + 1e-9)
duck = 1.0 - 0.55 * np.clip(venv * 6, 0, 1)
mus = music() * duck
# music swells on the end card, out with a fade
endc = int((cues["speech_end"]) * SR)
mus[endc:] *= np.linspace(1.0, 2.2, N - endc) ** 0.5
fade = int(1.2 * SR)
mus[-fade:] *= np.linspace(1, 0, fade)

fx = np.zeros((N, 2))
cache = {}
for i, c in enumerate(cues["sfx"]):
    name = c["name"]
    if name not in cache:
        cache[name] = BANK[name]()
    s = cache[name] * c["gain"] * 0.32
    k = max(0, int(c["t"] * SR))
    s = s[: N - k]
    pan = ((i * 37) % 11 - 5) / 12.0
    fx[k:k + len(s), 0] += s * np.cos((pan + 1) * np.pi / 4) * 1.414
    fx[k:k + len(s), 1] += s * np.sin((pan + 1) * np.pi / 4) * 1.414

mix = np.zeros((N, 2))
mix[:, 0] = voice + mus * 0.9
mix[:, 1] = voice + mus * 0.9
mix += fx
raw = os.path.join(TMP, "mix_raw.wav")
wavfile.write(raw, SR, (np.clip(mix / max(1.0, np.abs(mix).max()), -1, 1) * 32767).astype(np.int16))
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", raw, "-af", "loudnorm=I=-14:TP=-1.5:LRA=11", "-ar", str(SR), OUT], check=True)
print(f"mix -> {OUT} ({DUR:.1f}s, {len(cues['sfx'])} sfx, {len(cache)} sfx types)")
