#!/usr/bin/env python3
"""Soundtrack for Episode 034, synthesised from scratch (no samples, no
licensed music) and mixed under the narration.

Reuses the instruments and effects from Episode 005's build_audio.py and adds:
night crickets, soft footsteps, a cartoon monster "rawr", glowing light-ray
shimmers and tiny "tik" hits where light meets Affan, a sun swell and an
evening glide, and torch / light-switch clicks for the room demo.

    python3 build_audio.py            # -> output/mix.wav (+ stems in output/stems)
Requires numpy and ffmpeg.
"""
import importlib.util
import json
import os
import subprocess
import sys

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
_spec = importlib.util.spec_from_file_location("e005_audio", os.path.join(HERE, "..", "005-bulan-ikut-kereta", "build_audio.py"))
B = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(B)
from_base = ("SR", "T", "place", "onepole", "midi", "marimba", "musicbox", "pad", "bass", "shaker", "pluck_bell", "whoosh", "pop", "sparkle", "chime", "nope", "boing", "write_wav")
globals().update({k: getattr(B, k) for k in from_base})

DUR = 75.8
OUTRO = 72.65
OUT = os.path.join(HERE, "output")
N = int(SR * DUR)
rs = np.random.default_rng(34)

# scene boundaries (must match episode.js)
STREET_A = (0.0, 12.3)
LAB = (12.3, 53.3)
SUN = (43.2, 53.3)
ROOM = (53.3, 63.85)
STREET_B = (63.85, OUTRO)


def fftfilt(x, lo=0.0, hi=None):
    """Band-limit a signal with a soft-edged FFT mask (fast for long noise)."""
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    m = np.ones_like(f)
    if lo > 0:
        m *= 1 / (1 + (lo / np.maximum(f, 1e-3)) ** 4)
    if hi:
        m *= 1 / (1 + (f / hi) ** 4)
    return np.fft.irfft(X * m, len(x))


def norm(x):
    return x / (np.abs(x).max() + 1e-9)


# ------------------------------------------------------------------ sfx
def crickets(dur, seed=1):
    """Night ambience: pulsed cricket chirps over a soft breeze."""
    r = np.random.default_rng(seed)
    n = int(dur * SR)
    t = np.arange(n) / SR
    out = 0.25 * norm(fftfilt(r.standard_normal(n), 150, 900))
    for f0, rate, ph, amp in ((4300, 3.1, 0.0, 1.0), (4700, 2.6, 0.7, 0.7), (3900, 3.6, 1.9, 0.5)):
        gate = (np.sin(2 * np.pi * rate * t + ph) > 0.55).astype(float)
        trill = 0.5 + 0.5 * np.sin(2 * np.pi * 38 * t)
        out += amp * np.sin(2 * np.pi * f0 * t) * onepole(gate, 60) * trill * 0.35
    return norm(out) * np.clip(t / 0.4, 0, 1) * np.clip((dur - t) / 0.4, 0, 1)


def step(seed=0):
    r = np.random.default_rng(seed)
    t = T(0.09)
    thud = np.sin(2 * np.pi * 110 * t) * np.exp(-t * 60)
    scuff = fftfilt(r.standard_normal(len(t)), 600, 3500) * np.exp(-t * 45)
    return norm(thud + 0.35 * norm(scuff))


def footsteps(buf, a, b, n, gain=0.22):
    for i, at in enumerate(np.linspace(a, b, n)):
        place(buf, step(i) * gain, float(at), pan=0.15 * (1 if i % 2 else -1))


def rawr(dur=0.9):
    """Cartoon monster growl: wobbly low saw, filtered, with a rising scoop."""
    t = T(dur)
    f = 95 + 40 * np.sin(np.pi * t / dur) + 8 * np.sin(2 * np.pi * 22 * t)
    ph = np.cumsum(f) / SR
    saw = 2 * (ph % 1) - 1
    grit = fftfilt(rs.standard_normal(len(t)), 200, 1400)
    s = fftfilt(saw, 60, 1200) + 0.3 * norm(grit)
    return norm(s) * np.clip(t / 0.08, 0, 1) * np.clip((dur - t) / 0.3, 0, 1)


def shimmer(dur=3.0, seed=4, lo=2000, hi=4200, n=40):
    r = np.random.default_rng(seed)
    m = int(dur * SR)
    out = np.zeros(m)
    for at in np.sort(r.uniform(0, dur - 0.3, n)):
        d = T(0.25)
        s = np.sin(2 * np.pi * r.uniform(lo, hi) * d) * np.exp(-d * 14)
        i = int(at * SR)
        out[i : i + len(s)] += s[: m - i] * r.uniform(0.3, 1)
    return norm(out) * np.sin(np.pi * np.arange(m) / m) ** 0.5


def zap(dur=0.7):
    """Light rays shooting out: a bright upward glide."""
    t = T(dur)
    f = 600 + 2400 * (t / dur) ** 0.6
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) + 0.4 * np.sin(2 * np.pi * np.cumsum(f * 1.5) / SR)
    return norm(s) * np.exp(-t * 3) * np.clip(t / 0.02, 0, 1)


def tik(f=2600):
    t = T(0.06)
    return np.sin(2 * np.pi * f * t) * np.exp(-t * 90)


def click():
    t = T(0.05)
    return fftfilt(rs.standard_normal(len(t)), 1500, 8000) * np.exp(-t * 160)


def swell(dur=1.4, notes=(60, 64, 67, 72)):
    t = T(dur)
    s = sum(np.sin(2 * np.pi * midi(m) * t) for m in notes) / len(notes)
    return s * np.clip(t / (dur * 0.6), 0, 1) ** 2 * np.clip((dur - t) / 0.3, 0, 1)


def glide_down(dur=1.6, f0=880, f1=330):
    t = T(dur)
    f = f0 * (f1 / f0) ** (t / dur)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) + 0.3 * np.sin(2 * np.pi * np.cumsum(f * 2) / SR)
    return norm(s) * np.sin(np.pi * t / dur) ** 0.7


def stretch(dur=1.2, f0=300, f1=700):
    """Rubbery 'boiing' stretch for the shadow growing longer."""
    t = T(dur)
    f = f0 + (f1 - f0) * (t / dur) ** 1.5
    vib = 1 + 0.03 * np.sin(2 * np.pi * 9 * t)
    s = np.sin(2 * np.pi * np.cumsum(f * vib) / SR)
    return s * np.clip(t / 0.05, 0, 1) * np.clip((dur - t) / 0.25, 0, 1)


# ------------------------------------------------------------------ layers
def music():
    buf = np.zeros((N, 2))
    beat = 60 / 100
    bar = beat * 4
    night = [(50, [62, 65, 69]), (46, [62, 65, 70]), (53, [60, 65, 69]), (48, [60, 64, 67])]
    lab = [(48, [64, 67, 72]), (45, [64, 69, 72]), (41, [65, 69, 72]), (43, [62, 67, 71])]
    sun = [(48, [64, 67, 72]), (53, [65, 69, 72]), (55, [62, 67, 71]), (48, [64, 67, 72])]
    home = [(48, [60, 64, 67]), (53, [60, 65, 69]), (55, [59, 62, 67]), (48, [60, 64, 67])]
    arp = [0, 1, 2, 1, 0, 2, 1, 2]

    def night_loop(a, b, gain=1.0):
        t0, i = a, 0
        while t0 < b - 0.2:
            root, ch = night[i % 4]
            place(buf, pad([midi(n) for n in ch], max(1.6, min(bar + 0.6, b - t0 + 0.4))) * 0.13 * gain, t0)
            for k, st in enumerate([0, 2, 1, 2]):
                if t0 + k * beat < b - 0.1:
                    place(buf, musicbox(midi(ch[st] + 12)) * 0.1 * gain, t0 + k * beat, pan=0.3 * ((k % 2) * 2 - 1))
            t0 += bar
            i += 1

    night_loop(*STREET_A)
    # light stage: bouncy marimba over a bright pad
    t0, i = LAB[0], 0
    while t0 < SUN[0] - 0.2:
        root, ch = lab[i % 4]
        place(buf, pad([midi(n) for n in ch], bar + 0.8) * 0.13, t0)
        for k in range(8):
            place(buf, marimba(midi(ch[arp[k]] + 12)) * 0.12, t0 + k * beat / 2, pan=-0.3 + 0.08 * k)
        place(buf, bass(midi(root - 12), 0.6) * 0.22, t0)
        place(buf, bass(midi(root - 12), 0.4) * 0.14, t0 + beat * 2)
        t0 += bar
        i += 1
    # sun: warmer, with shaker
    t0, i = SUN[0], 0
    while t0 < SUN[1] - 0.2:
        root, ch = sun[i % 4]
        place(buf, pad([midi(n) for n in ch], bar + 0.8) * 0.15, t0)
        for k in range(8):
            place(buf, musicbox(midi(ch[arp[k]] + 12)) * 0.08, t0 + k * beat / 2, pan=0.3 - 0.08 * k)
            place(buf, shaker() * 0.05, t0 + k * beat / 2 + beat / 4)
        place(buf, bass(midi(root - 12), 1.0) * 0.2, t0)
        t0 += bar
        i += 1
    # home demo
    t0, i = ROOM[0], 0
    while t0 < ROOM[1] - 0.2:
        root, ch = home[i % 4]
        place(buf, pad([midi(n) for n in ch], bar + 0.6) * 0.1, t0)
        for k in range(8):
            place(buf, marimba(midi(ch[arp[k]] + 12)) * 0.13, t0 + k * beat / 2, pan=-0.3 + 0.08 * k)
        place(buf, bass(midi(root - 12), 0.5) * 0.24, t0)
        t0 += bar
        i += 1
    night_loop(*STREET_B, gain=1.1)
    place(buf, pad([midi(n) for n in (48, 60, 64, 67, 72)], 3.2) * 0.2, OUTRO)
    for k, m in enumerate([72, 76, 79, 84]):
        place(buf, pluck_bell(midi(m), 2.5) * 0.12, OUTRO + 0.05 + k * 0.12, pan=-0.3 + 0.2 * k)
    place(buf, bass(midi(36), 2.0) * 0.3, OUTRO)
    fade = int(1.2 * SR)
    buf[-fade:] *= np.linspace(1, 0, fade)[:, None]
    return buf


def story_sfx():
    buf = np.zeros((N, 2))
    for (a, b), seed in ((STREET_A, 1), (STREET_B, 2)):
        place(buf, crickets(b - a, seed) * 0.1, a)
    # walks (see walkPath() calls in episode.js)
    footsteps(buf, 5.95, 7.55, 13)
    footsteps(buf, 21.8, 23.15, 7, 0.16)
    footsteps(buf, 30.15, 31.95, 6, 0.16)
    footsteps(buf, 38.15, 39.65, 6, 0.16)
    place(buf, stretch(1.2, 280, 620) * 0.12, 6.0)  # shadow stretching
    place(buf, rawr(0.9) * 0.3, 7.2)
    # light stage
    place(buf, zap(0.8) * 0.18, 12.4)
    place(buf, shimmer(3.0, 4) * 0.12, 12.5)
    for i, at in enumerate(np.linspace(14.45, 15.6, 7)):
        place(buf, tik(2200 + 150 * i) * 0.12, float(at), pan=0.2)
    place(buf, swell(1.4, (55, 58, 62)) * 0.12, 16.7)  # "tak sampai" (darker)
    place(buf, shimmer(1.6, 7, 3000, 5000, 20) * 0.1, 24.4)  # straight-down ray
    place(buf, stretch(1.0, 300, 560) * 0.12, 35.2)
    place(buf, stretch(1.0, 360, 720) * 0.12, 41.3)
    # sun
    place(buf, swell(1.6) * 0.2, 43.3)
    place(buf, shimmer(2.5, 9) * 0.1, 44.0)
    place(buf, glide_down(1.7) * 0.1, 49.2)
    place(buf, stretch(1.0, 300, 600) * 0.1, 51.7)
    # room
    place(buf, click() * 0.45, 56.5)  # room lights off
    place(buf, click() * 0.5, 56.78)  # torch on
    place(buf, swell(0.8, (67, 72)) * 0.1, 56.8)
    place(buf, stretch(1.0, 320, 640) * 0.1, 61.0)
    return buf


def ui_sfx():
    buf = np.zeros((N, 2))
    for at in (5.9, 8.5, 21.65, 29.15, 43.2, 70.25):
        place(buf, whoosh(0.5) * 0.22, at - 0.25)
    place(buf, sparkle(1.3, 34, True, 2) * 0.32, 10.7)
    place(buf, whoosh(0.9, 300, 6000, rev=True) * 0.25, 11.4)
    place(buf, sparkle(0.6, 22, False, 3) * 0.3, 12.3)
    place(buf, whoosh(0.6, 2500, 300) * 0.35, 53.25)
    place(buf, whoosh(0.6, 2500, 300) * 0.35, 63.8)
    pops = (0.4, 0.6, 2.67, 3.0, 4.55, 6.56, 7.2, 8.62, 8.95, 12.36, 15.2, 16.66, 19.3, 22.36, 25.2, 28.2, 30.12,
            33.2, 35.6, 38.08, 39.8, 43.24, 44.9, 48.0, 49.18, 51.8, 53.32, 55.0, 57.4, 58.5, 60.96, 64.95,
            70.4, 70.7, 71.0, OUTRO + 0.3, OUTRO + 0.5, OUTRO + 0.7)
    for at in pops:
        place(buf, pop() * 0.24, at, pan=float(rs.uniform(-0.3, 0.3)))
    place(buf, nope() * 0.16, 9.0)  # AFFAN MEMBESAR?
    place(buf, chime((79, 84, 88)) * 0.3, 20.1)  # BAYANG-BAYANG!
    place(buf, chime((84, 88, 91)) * 0.28, 27.15)  # PENDEK!
    place(buf, chime((76, 79, 84)) * 0.26, 36.0)  # BAYANG PANJANG!
    place(buf, chime((79, 84, 88, 91)) * 0.3, 41.42)  # LAGI PANJANG!
    place(buf, chime((84, 88, 91)) * 0.22, 60.13)  # PENDEK!
    place(buf, chime((76, 79, 84)) * 0.22, 62.56)  # PANJANG!
    place(buf, boing() * 0.22, 66.74)
    place(buf, chime((79, 84, 88, 91)) * 0.35, 66.8)
    place(buf, sparkle(1.0, 24, False, 8) * 0.28, 66.9)
    place(buf, sparkle(1.0, 24, False, 9) * 0.3, OUTRO)
    return buf


def load_narration():
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", os.path.join(HERE, "audio", "narration.mp3"), "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"], check=True, capture_output=True).stdout
    v = np.frombuffer(raw, dtype=np.float32).astype(np.float64)
    out = np.zeros(N)
    out[: min(N, len(v))] = v[:N]
    return out


def duck_gain(voice, depth=0.55):
    e = onepole(np.abs(voice), 8)
    talking = np.clip((20 * np.log10(e + 1e-6) + 42) / 12, 0, 1)
    talking = onepole(talking, 2.5)
    return 1 - depth * talking


def main():
    os.makedirs(os.path.join(OUT, "stems"), exist_ok=True)
    voice = load_narration()
    m = music() * duck_gain(voice)[:, None]
    story = story_sfx() * duck_gain(voice, 0.35)[:, None]
    ui = ui_sfx()
    for name, b in (("music", m), ("story", story), ("sfx", ui)):
        write_wav(os.path.join(OUT, "stems", name + ".wav"), b)
    v = np.stack([voice, voice], 1)
    mix = v * 1.0 + m * 0.55 + story * 0.6 + ui * 0.55
    mix /= max(1.0, np.abs(mix).max() / 0.95)
    pre = os.path.join(OUT, "stems", "premix.wav")
    write_wav(pre, mix)
    r = subprocess.run(["ffmpeg", "-hide_banner", "-i", pre, "-af", "loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json", "-f", "null", "-"], capture_output=True, text=True)
    js = json.loads(r.stderr[r.stderr.rindex("{") :])
    af = (f"loudnorm=I=-14:TP=-1.5:LRA=11:measured_I={js['input_i']}:measured_TP={js['input_tp']}:"
          f"measured_LRA={js['input_lra']}:measured_thresh={js['input_thresh']}:offset={js['target_offset']}:linear=true")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", pre, "-af", af + ",aresample=48000,alimiter=limit=0.84:level=false:attack=1:release=60", "-c:a", "pcm_s24le", os.path.join(OUT, "mix.wav")], check=True)
    print("wrote", os.path.join(OUT, "mix.wav"))


if __name__ == "__main__":
    sys.exit(main())
