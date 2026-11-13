#!/usr/bin/env python3
"""Soundtrack for Episode 031, synthesised from scratch (no samples, no
licensed music) and mixed under the narration.

Reuses the instruments and effects from Episode 005's build_audio.py and adds:
tiptoe plucks for Kakak sneaking up, fast "tiki-tiki" tickle trills, a dull
self-tickle, brain boops and glows, a rising zap for the brain's order and a
soft chime for its copy to the cerebellum, a board flip, a confused wobble,
marker pops, and a gentle cartoon alarm for "Kejutan!".

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

DUR = 76.0
OUTRO = 72.75
OUT = os.path.join(HERE, "output")
N = int(SR * DUR)
rs = np.random.default_rng(31)


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
def pizz(f, dur=0.18):
    """Soft pizzicato pluck (tiptoes)."""
    t = T(dur)
    return (np.sin(2 * np.pi * f * t) + 0.3 * np.sin(4 * np.pi * f * t)) * np.exp(-t * 26)


def tickle(dur=1.6, seed=1, base=1800):
    """Fast 'tiki-tiki' trill: many tiny high blips with a fluttering pitch."""
    r = np.random.default_rng(seed)
    out = np.zeros(int(dur * SR) + SR // 4)
    at = 0.0
    i = 0
    while at < dur:
        f = base * (1 + 0.25 * np.sin(i * 1.7)) * r.uniform(0.9, 1.1)
        d = T(0.045)
        s = np.sin(2 * np.pi * f * d * (1 + 0.6 * d / 0.045)) * np.exp(-d * 70)
        k = int(at * SR)
        out[k : k + len(s)] += s * (0.6 + 0.4 * np.sin(np.pi * at / dur))
        at += r.uniform(0.045, 0.07)
        i += 1
    return norm(out)


def dull_tickle(dur=1.4, seed=2):
    """Muffled scratching for tickling yourself: nothing happens."""
    r = np.random.default_rng(seed)
    n = int(dur * SR)
    t = np.arange(n) / SR
    x = fftfilt(r.standard_normal(n), 300, 1200)
    e = (0.5 + 0.5 * np.sin(2 * np.pi * 9 * t)) ** 2 * np.sin(np.pi * t / dur)
    return norm(x * e)


def zap(dur=1.3, f0=300, f1=1600):
    """Rising sparkly zap: the brain's order travelling to the hand."""
    t = T(dur)
    f = f0 * (f1 / f0) ** (t / dur)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * (0.5 + 0.5 * np.sin(2 * np.pi * 14 * t)) * np.sin(np.pi * t / dur) ** 0.6
    return s


def glow_hum(dur=1.4, f=220):
    t = T(dur)
    s = sum(np.sin(2 * np.pi * f * h * t) / h for h in (1, 2, 3, 5)) * (1 + 0.3 * np.sin(2 * np.pi * 6 * t))
    return norm(s * np.sin(np.pi * t / dur) ** 1.5)


def wobble_snd(dur=0.9, f=420):
    """Confused 'wa-wa-wa' wobble."""
    t = T(dur)
    fm = f * (1 + 0.25 * np.sin(2 * np.pi * 7 * t)) * (1 - 0.3 * t / dur)
    return np.sin(2 * np.pi * np.cumsum(fm) / SR) * np.sin(np.pi * t / dur)


def alarm(dur=1.1):
    """Gentle cartoon alarm: two-tone beeps."""
    t = T(dur)
    f = np.where((t * 6).astype(int) % 2 == 0, 1320, 990)
    s = np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * 0.4 + np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.6
    s = fftfilt(s, 200, 5000)
    return norm(s) * np.clip((dur - t) / 0.2, 0, 1)


def crash(seed=5):
    r = np.random.default_rng(seed)
    n = int(1.2 * SR)
    t = np.arange(n) / SR
    return norm(fftfilt(r.standard_normal(n), 3000, 12000) * np.exp(-t * 4))


def flip():
    """Board card flip: quick paper swish + tick."""
    t = T(0.18)
    sw = fftfilt(rs.standard_normal(len(t)), 1500, 7000) * np.sin(np.pi * t / 0.18)
    tick = np.zeros(len(t))
    p = pop(1600, 900, 0.06)
    tick[: len(p)] = p[: len(t)]
    return norm(sw) * 0.7 + tick * 0.5


# ------------------------------------------------------------------ layers
def music():
    buf = np.zeros((N, 2))
    beat = 60 / 108
    bar = beat * 4
    home = [(48, [60, 64, 67]), (53, [60, 65, 69]), (55, [59, 62, 67]), (48, [60, 64, 67])]
    mind = [(53, [65, 69, 72]), (50, [62, 65, 69]), (46, [62, 65, 70]), (48, [64, 67, 72])]
    arp = [0, 1, 2, 1, 0, 2, 1, 2]
    # home: playful, light
    t0, i = 0.0, 0
    while t0 < 16.9:
        root, ch = home[i % 4]
        place(buf, pad([midi(n) for n in ch], bar + 0.6) * 0.09, t0)
        for k in range(8):
            if k % 2 == 0 or k in (3, 7):
                place(buf, marimba(midi(ch[arp[k]] + 12)) * 0.15, t0 + k * beat / 2, pan=-0.3 + 0.08 * k)
        place(buf, bass(midi(root - 12), 0.5) * 0.28, t0)
        place(buf, bass(midi(root - 5), 0.4) * 0.22, t0 + 2 * beat)
        t0 += bar
        i += 1
    # inside the head: dreamy music box over a pad
    t0, i = 16.9, 0
    while t0 < 58.3:
        root, ch = mind[i % 4]
        place(buf, pad([midi(n) for n in ch], bar + 0.6) * 0.12, t0)
        for k, step in enumerate([0, 2, 1, 2, 0, 1, 2, 1]):
            place(buf, musicbox(midi(ch[step] + 12)) * 0.08, t0 + k * beat / 2, pan=0.3 * ((k % 2) * 2 - 1))
        place(buf, bass(midi(root - 12), 0.8) * 0.22, t0)
        for k in range(8):
            place(buf, shaker() * (0.35 if k % 2 else 0.2), t0 + k * beat / 2, pan=0.4)
        t0 += bar
        i += 1
    # the answer and home again: happy
    t0, i = 58.3, 0
    while t0 < OUTRO:
        root, ch = home[i % 4]
        place(buf, pad([midi(n) for n in ch], bar + 0.6) * 0.1, t0)
        for k in range(8):
            place(buf, marimba(midi(ch[arp[k]] + 12)) * 0.16, t0 + k * beat / 2, pan=-0.35 + 0.1 * k)
        place(buf, bass(midi(root - 12), 0.6) * 0.28, t0)
        place(buf, bass(midi(root - 5), 0.5) * 0.22, t0 + 2 * beat)
        t0 += bar
        i += 1
    place(buf, pad([midi(n) for n in (48, 60, 64, 67, 72)], 3.2) * 0.2, OUTRO)
    for k, m in enumerate([72, 76, 79, 84]):
        place(buf, pluck_bell(midi(m), 2.5) * 0.12, OUTRO + 0.05 + k * 0.12, pan=-0.3 + 0.2 * k)
    place(buf, bass(midi(36), 2.0) * 0.3, OUTRO)
    fade = int(1.2 * SR)
    buf[-fade:] *= np.linspace(1, 0, fade)[:, None]
    return buf


def story_sfx():
    buf = np.zeros((N, 2))
    r = np.random.default_rng(3)
    # Kakak tiptoes in
    for i, at in enumerate(np.arange(0.35, 2.9, 0.36)):
        place(buf, pizz(midi(67 + (i % 2) * 5)) * 0.22, float(at), pan=-0.5 + 0.08 * i)
    # Kakak tickles Affan (home), self-tickle (nothing), Kakak again (mind)
    place(buf, tickle(2.2, 1) * 0.16, 3.15, pan=-0.2)
    place(buf, tickle(2.4, 2, 2000) * 0.1, 5.4, pan=-0.2)
    place(buf, dull_tickle(3.2, 3) * 0.12, 9.9, pan=0.2)
    place(buf, dull_tickle(1.6, 4) * 0.1, 37.2, pan=0.2)
    place(buf, dull_tickle(1.6, 5) * 0.1, 67.8, pan=0.2)
    for i in range(5):  # Kakak's fingers wiggle in the air
        place(buf, tickle(0.5, 10 + i, 2400) * 0.07, 45.9 + i * 1.15, pan=0.3)
    place(buf, tickle(2.6, 6) * 0.16, 52.65, pan=0.2)
    place(buf, tickle(2.6, 7, 2100) * 0.12, 55.3, pan=0.2)
    # brain & cerebellum
    place(buf, boing() * 0.2, 18.6)
    place(buf, glow_hum(1.6, 196) * 0.18, 21.8)
    place(buf, boing(0.35) * 0.25, 24.7)  # the guard pops out
    for i in range(3):
        place(buf, pizz(midi(79 + 3 * i), 0.12) * 0.15, 25.0 + i * 0.12, pan=-0.4)
    place(buf, zap(1.5) * 0.18, 30.9, pan=0.3)
    place(buf, chime((79, 84, 88), 0.1) * 0.22, 32.6, pan=-0.3)
    place(buf, glow_hum(1.4, 220) * 0.15, 32.7, pan=-0.3)
    place(buf, flip() * 0.4, 34.62, pan=-0.3)
    place(buf, flip() * 0.4, 46.84, pan=-0.3)
    place(buf, wobble_snd(1.0) * 0.2, 47.0, pan=-0.3)
    for at in (49.97, 50.76, 51.5):
        place(buf, pop(1300, 600, 0.1) * 0.3, at, pan=float(r.uniform(-0.2, 0.2)))
    place(buf, alarm(1.1) * 0.13, 52.6)
    place(buf, crash() * 0.2, 52.6)
    place(buf, boing() * 0.25, 52.65)
    return buf


def ui_sfx():
    buf = np.zeros((N, 2))
    for at in (8.6, 28.2, 33.9, 36.4, 39.8, 44.1, 52.3, 53.75, 58.3):
        place(buf, whoosh(0.5) * 0.25, at - 0.25)
    place(buf, sparkle(1.3, 34, True, 2) * 0.32, 15.2)
    place(buf, whoosh(0.9, 300, 6000, rev=True) * 0.25, 16.0)
    place(buf, sparkle(0.6, 22, False, 3) * 0.3, 16.85)
    place(buf, whoosh(0.6, 2500, 300) * 0.35, 63.4)  # back home
    pops = (0.9, 2.28, 3.66, 5.3, 10.04, 18.58, 20.12, 22.26, 23.46, 25.82, 27.2, 30.0, 31.5, 32.46, 36.45, 41.14, 43.12,
            44.24, 48.04, 53.56, 55.5, 60.84, 62.3, 64.58, 66.58, 70.6, 70.9, 71.2, OUTRO + 0.3, OUTRO + 0.5, OUTRO + 0.7)
    for at in pops:
        place(buf, pop() * 0.26, at, pan=float(rs.uniform(-0.3, 0.3)))
    place(buf, nope() * 0.25, 12.5)  # TAK GELI?!
    place(buf, chime((84, 88, 91)) * 0.28, 23.46)  # SEREBELUM
    place(buf, chime((84, 88, 91, 96), 0.07) * 0.3, 37.6)  # check mark
    place(buf, sparkle(0.6, 14, False, 4) * 0.22, 37.65)
    place(buf, nope() * 0.2, 69.3)  # TAK JADI, KAN?
    place(buf, chime((79, 84, 88, 91)) * 0.3, 62.3)  # = GELI!
    place(buf, boing() * 0.22, 63.95)
    place(buf, chime((84, 88, 91, 96), 0.07) * 0.4, 64.0)  # bulb
    place(buf, sparkle(0.8, 16, False, 6) * 0.25, 64.1)
    place(buf, sparkle(1.0, 24, False, 8) * 0.3, OUTRO)
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
