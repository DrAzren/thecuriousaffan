#!/usr/bin/env python3
"""Soundtrack for Episode 028, synthesised from scratch (no samples, no
licensed music) and mixed under the narration.

Reuses the instruments and effects from Episode 005's build_audio.py and adds
storm sounds: rain on the car, far and near thunder, lightning cracks, the
light racer's "zip" and the slow rolling hum of the sound racer.

Thunder is kept gentle (it is a children's video) and always lands where the
picture says it does: late after a far strike in the car, together with the
strike at its source, and three seconds after the flash in the count.

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
from_base = ("SR", "T", "place", "env_adsr", "onepole", "midi", "marimba", "musicbox", "pad", "bass", "shaker", "pluck_bell", "whoosh", "pop", "sparkle", "chime", "nope", "boing", "write_wav")
globals().update({k: getattr(B, k) for k in from_base})

DUR = 63.2
OUTRO = 60.0
OUT = os.path.join(HERE, "output")
N = int(SR * DUR)
rs = np.random.default_rng(28)

ROAD = [(0, 14.9), (53.4, OUTRO)]  # in-car sections (rain on the roof)


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


# --------------------------------------------------------------- storm sfx
def thunder(dur=2.6, seed=1, far=False):
    r = np.random.default_rng(seed)
    n = int(dur * SR)
    t = np.arange(n) / SR
    body = fftfilt(r.standard_normal(n), 25, 140 if far else 220)
    # a few rolling bumps instead of one smooth decay
    e = np.zeros(n)
    for k in range(5 if far else 4):
        at = (0.05 + r.random() * 0.25) if k == 0 else r.random() * dur * 0.6
        w = 0.25 + r.random() * 0.5
        e += (0.5 + 0.5 * r.random()) * np.exp(-((t - at) / w) ** 2)
    e *= np.exp(-t * (1.1 if far else 1.6))
    att = 0.35 if far else 0.02
    e *= np.clip(t / att, 0, 1)
    y = norm(body * e)
    if not far:
        crack = fftfilt(r.standard_normal(int(0.25 * SR)), 900, 7000) * np.exp(-np.arange(int(0.25 * SR)) / SR * 22)
        y[: len(crack)] += norm(crack) * 0.45
    return norm(y)


def crack(seed=3):
    """Bright lightning crackle (the flash itself, no rumble)."""
    r = np.random.default_rng(seed)
    n = int(0.45 * SR)
    t = np.arange(n) / SR
    x = fftfilt(r.standard_normal(n), 1500, 9000)
    flick = (np.sin(2 * np.pi * 31 * t) > 0.2).astype(float) * 0.6 + 0.4
    return norm(x * flick * np.exp(-t * 11))


def zip_(dur=0.22):
    """Light racer: a very fast rising sweep."""
    t = T(dur)
    f = 700 * (5200 / 700) ** (t / dur)
    y = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * t / dur) ** 0.6
    return y


def rolling_hum(dur, seed=4):
    """Sound racer: a soft, wobbling low hum (three pulsing arches)."""
    t = T(dur)
    trem = 0.55 + 0.45 * np.sin(2 * np.pi * 3.0 * t) ** 2
    y = (np.sin(2 * np.pi * 110 * t) + 0.5 * np.sin(2 * np.pi * 165 * t + 0.4) + 0.25 * np.sin(2 * np.pi * 220 * t)) * trem
    return y * env_adsr(len(t), 0.4, 0.1, 1.0, 0.4)


def rain_layer():
    """Rain on the car: hiss + scattered drops, only in the in-car sections."""
    buf = np.zeros((N, 2))
    t = np.arange(N) / SR
    for ch, seed in ((0, 11), (1, 12)):
        r = np.random.default_rng(seed)
        hiss = norm(fftfilt(r.standard_normal(N), 1800, 9000)) * 0.35
        hiss *= 0.85 + 0.15 * np.sin(2 * np.pi * 0.13 * t + ch)
        drops = np.zeros(N)
        for at in r.uniform(0, DUR, 2600):
            f = r.uniform(2500, 5500)
            d = T(0.025)
            s = np.sin(2 * np.pi * f * d) * np.exp(-d * 260) * r.uniform(0.2, 1)
            i = int(at * SR)
            drops[i : i + len(s)] += s[: N - i]
        buf[:, ch] = hiss + drops * 0.35
    hum = 0.5 * np.sin(2 * np.pi * 47 * t + 0.3 * np.sin(2 * np.pi * 0.4 * t)) + 0.25 * np.sin(2 * np.pi * 94 * t)
    rumble = norm(fftfilt(rs.standard_normal(N), 20, 160))
    car = rumble * 0.5 + hum * 0.2
    buf += np.stack([car, np.roll(car, 37)], 1) * 0.6
    lvl = np.zeros(N)
    for a, b, g in [(0, 6.1, 0.55), (6.1, 9.7, 1.0), (9.7, 14.9, 0.55), (53.4, OUTRO, 0.5)]:
        lvl[int(a * SR) : int(b * SR)] = g
    lvl = onepole(lvl, 3)
    return buf * lvl[:, None]


# ------------------------------------------------------------------ layers
def music():
    buf = np.zeros((N, 2))
    beat = 60 / 104
    bar = beat * 4
    # Dm Bb F C in the car (a little stormy), F C Dm Bb in the imagination world
    storm = [(50, [62, 65, 69]), (46, [62, 65, 70]), (53, [60, 65, 69]), (48, [60, 64, 67])]
    happy = [(53, [65, 69, 72]), (48, [64, 67, 72]), (50, [65, 69, 74]), (46, [65, 70, 74])]
    arp = [0, 1, 2, 1, 0, 2, 1, 2]
    t0, i = 0.0, 0
    while t0 < 14.9:
        root, ch = storm[i % 4]
        place(buf, pad([midi(n) for n in ch], bar + 0.6) * 0.15, t0)
        for k, step in enumerate([0, 2, 1, 2]):
            place(buf, musicbox(midi(ch[step] + 12)) * 0.11, t0 + k * beat, pan=0.3 * ((k % 2) * 2 - 1))
        place(buf, bass(midi(root - 12), 1.2) * 0.2, t0)
        t0 += bar
        i += 1
    t0, i = 14.9, 0
    while t0 < 53.4:
        root, ch = happy[i % 4]
        place(buf, pad([midi(n) for n in ch], bar + 0.6) * 0.1, t0)
        for k in range(8):
            place(buf, marimba(midi(ch[arp[k]] + 12)) * 0.19, t0 + k * beat / 2, pan=-0.35 + 0.1 * k)
        for k in (0, 2):
            place(buf, bass(midi(root - 12) if k == 0 else midi(root - 5), 0.6) * 0.3, t0 + k * beat)
        for k in range(8):
            place(buf, shaker() * (0.5 if k % 2 else 0.3), t0 + k * beat / 2, pan=0.4)
        t0 += bar
        i += 1
    t0, i = 53.4, 0
    while t0 < OUTRO:
        root, ch = happy[i % 4]
        place(buf, pad([midi(n) for n in ch], bar + 0.6) * 0.13, t0)
        for k in range(4):
            place(buf, marimba(midi(ch[[0, 2, 1, 2][k]] + 12)) * 0.15, t0 + k * beat, pan=0.25 * ((k % 2) * 2 - 1))
        place(buf, bass(midi(root - 12), 0.9) * 0.25, t0)
        t0 += bar
        i += 1
    place(buf, pad([midi(n) for n in (53, 65, 69, 72, 77)], 3.2) * 0.2, OUTRO)
    for k, m in enumerate([77, 81, 84, 89]):
        place(buf, pluck_bell(midi(m), 2.5) * 0.12, OUTRO + 0.05 + k * 0.12, pan=-0.3 + 0.2 * k)
    place(buf, bass(midi(41), 2.0) * 0.3, OUTRO)
    fade = int(1.2 * SR)
    buf[-fade:] *= np.linspace(1, 0, fade)[:, None]
    return buf


def storm_sfx():
    buf = np.zeros((N, 2))
    # car: far strikes -> crack quietly at the flash, thunder rolls in later
    place(buf, crack(1) * 0.12, 0.5, pan=-0.4)
    place(buf, thunder(3.0, 2, far=True) * 0.35, 2.0, pan=-0.3)
    place(buf, crack(3) * 0.2, 8.3, pan=0.2)
    place(buf, thunder(2.8, 4) * 0.8, 11.45)  # "GRUMMM!"
    place(buf, crack(5) * 0.1, 53.9, pan=-0.4)
    place(buf, thunder(3.0, 6, far=True) * 0.3, 56.9, pan=-0.3)
    # imagination world: at the source, both together ("serentak")
    place(buf, crack(7) * 0.35, 16.0)
    place(buf, thunder(2.2, 8) * 0.6, 16.0)
    place(buf, crack(9) * 0.2, 19.0)
    # the race: light arrives at once, the sound rolls along and arrives late
    for t0, t1, seed in ((24.0, 32.9, 10), (38.0, 40.95, 12)):
        place(buf, crack(seed) * 0.3, t0)
        place(buf, zip_() * 0.35, t0 + 0.02, pan=0.3)
        place(buf, sparkle(0.5, 12, True, seed) * 0.2, t0 + 0.15, pan=0.3)
        hum = rolling_hum(t1 - t0, seed)
        hum *= np.linspace(0.35, 1.0, len(hum))  # louder as it nears Affan
        place(buf, hum * 0.16, t0)
        place(buf, thunder(1.8, seed + 1) * 0.65, t1)
    return buf


def ui_sfx():
    buf = np.zeros((N, 2))
    cuts = (6.1, 9.7, 12.6, 18.8, 23.3, 25.9, 27.8, 31.0, 33.7, 37.9, 41.1, 45.2, 49.4)
    for at in cuts:
        place(buf, whoosh(0.5) * 0.3, at - 0.25)
    place(buf, sparkle(1.3, 34, True, 2) * 0.32, 13.55)
    place(buf, whoosh(0.9, 300, 6000, rev=True) * 0.25, 14.0)
    place(buf, sparkle(0.6, 22, False, 3) * 0.3, 14.85)
    place(buf, whoosh(0.6, 2500, 300) * 0.35, 53.15)  # back to the car
    pops = (0.9, 1.2, 8.3, 15.26, 16.02, 20.04, 22.42, 23.4, 24.25, 28.54, 30.2, 31.1, 34.96, 37.5,
            41.32, 42.14, 42.84, 45.74, 47.84, 58.0, 58.3, 58.6, 60.3, 60.5, 60.7)
    for at in pops:
        place(buf, pop() * 0.3, at, pan=float(rs.uniform(-0.3, 0.3)))
    place(buf, chime((84, 88, 91)) * 0.32, 17.7)  # SERENTAK!
    place(buf, chime((88, 91, 96), 0.06) * 0.3, 25.1)  # LAJU!
    place(buf, chime((86, 91)) * 0.25, 26.56)  # dah sampai
    for k, at in enumerate((38.42, 39.52, 40.48)):  # count: one, two, three
        place(buf, marimba(midi(79 + 4 * k), 0.5) * 0.5, at)
    place(buf, chime((84, 88, 91, 96), 0.07) * 0.38, 43.74)  # 1 KM
    place(buf, nope() * 0.3, 48.04)
    place(buf, boing() * 0.22, 49.68)
    place(buf, chime((79, 84, 88, 91)) * 0.35, 49.8)
    place(buf, chime((84, 88, 91, 96), 0.07) * 0.42, 51.26)
    place(buf, sparkle(0.8, 16, False, 6) * 0.25, 51.3)
    place(buf, chime((86, 91)) * 0.28, 55.3)
    place(buf, sparkle(0.6, 14, False, 7) * 0.22, 55.35)
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
    rain = rain_layer() * duck_gain(voice, 0.4)[:, None]
    storm = storm_sfx()
    ui = ui_sfx()
    for name, b in (("music", m), ("rain", rain), ("storm", storm), ("sfx", ui)):
        write_wav(os.path.join(OUT, "stems", name + ".wav"), b)
    v = np.stack([voice, voice], 1)
    mix = v * 1.0 + m * 0.55 + rain * 0.1 + storm * 0.6 + ui * 0.55
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
