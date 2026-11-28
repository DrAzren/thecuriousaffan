#!/usr/bin/env python3
"""Soundtrack for Episode 070, synthesised from scratch (no samples, no
licensed music) and mixed under the narration.

Reuses the instruments and effects from Episode 005's build_audio.py and adds:
remote button clicks, a TV switching on and off, channel changes, volume
beeps, soft "bip" tones for the infrared blinks (short and long), a cosy
cartoon jingle from the TV, and a phone camera beep.

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

DUR = 53.75
OUTRO = 50.6
OUT = os.path.join(HERE, "output")
N = int(SR * DUR)
rs = np.random.default_rng(70)

# scene boundaries (must match episode.js)
ROOM_A = (0.0, 11.44)
STAGE = (11.44, 41.08)
ROOM_B = (41.08, OUTRO)


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
def noise(dur, lo, hi, decay=0.0):
    t = T(dur)
    x = fftfilt(rs.standard_normal(len(t)), lo, hi)
    if decay:
        x = x * np.exp(-t * decay)
    return norm(x) * np.clip(t / 0.02, 0, 1) * np.clip((dur - t) / 0.05, 0, 1)


def chirp():
    t = T(0.18)
    f = 3200 + 1400 * np.sin(np.pi * t / 0.18)
    return norm(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * t / 0.18))


def huff(dur=0.28):
    return noise(dur, 300, 2500) * np.sin(np.pi * T(dur) / dur)


def step():
    t = T(0.12)
    return norm(noise(0.12, 80, 900, decay=40) + np.sin(2 * np.pi * 90 * t) * np.exp(-t * 40))


def rise(dur, f0=400, f1=1500):
    t = T(dur)
    f = f0 * (f1 / f0) ** (t / dur)
    return norm(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * t / dur))


def gurgle(f=500):
    t = T(0.16)
    return norm(np.sin(2 * np.pi * np.cumsum(f * (1 + 2.5 * t / 0.16)) / SR) * np.sin(np.pi * t / 0.16))


def bark():
    t = T(0.22)
    f = 520 * np.exp(-t * 3)
    x = np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * 0.4 + noise(0.22, 300, 3000) * 0.6
    return norm(x * np.exp(-t * 9))


def tick(f=1800):
    t = T(0.06)
    return norm(np.sin(2 * np.pi * f * t) * np.exp(-t * 80))


def click():
    t = T(0.05)
    return norm(noise(0.05, 1500, 8000, decay=120) * 0.6 + np.sin(2 * np.pi * 900 * t) * np.exp(-t * 90))


def bip(dur, f=2100):
    t = T(dur)
    return norm(np.sin(2 * np.pi * f * t) * np.clip(t / 0.01, 0, 1) * np.clip((dur - t) / 0.01, 0, 1))


def tv_on():
    t = T(0.6)
    f = 180 + 900 * (1 - np.exp(-t * 8))
    return norm(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 4) + noise(0.6, 4000, 12000, decay=6) * 0.3)


def tv_off():
    t = T(0.4)
    f = 900 * np.exp(-t * 7) + 80
    return norm(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 7))


def tune():
    return norm(noise(0.25, 800, 9000) * np.sin(np.pi * T(0.25) / 0.25))


def jingle(a, b, buf, gain=0.03):
    notes = [72, 76, 79, 76, 74, 77, 81, 77]
    at, i = a, 0
    while at < b - 0.2:
        place(buf, marimba(midi(notes[i % 8])) * gain, at, pan=0.2)
        at += 0.3
        i += 1


BLINKS = {"BUKA": [1, 1, 2, 1, 2], "KUAT": [2, 1, 1, 2, 1], "SALURAN": [1, 2, 2, 1, 1]}


def code(buf, t0, pat, gain=0.05, f=2100):
    s = t0
    for p in BLINKS[pat]:
        d = 0.09 if p == 1 else 0.26
        place(buf, bip(d, f) * gain, s)
        s += d + 0.09


def stream(buf, a, b, pat="BUKA", every=0.9, gain=0.04):
    s = a
    while s < b:
        code(buf, s, pat, gain)
        s += every


def music():
    buf = np.zeros((N, 2))
    beat = 60 / 100
    bar = beat * 4
    home = [(48, [60, 64, 67]), (53, [60, 65, 69]), (55, [59, 62, 67]), (48, [60, 64, 67])]
    inner = [(45, [64, 69, 72]), (41, [65, 69, 72]), (43, [62, 67, 71]), (45, [64, 69, 72])]
    arp = [0, 1, 2, 1, 0, 2, 1, 2]

    def loop(a, b, chords, inst, gain=1.0, half=True):
        t0, i = a, 0
        while t0 < b - 0.3:
            root, ch = chords[i % 4]
            place(buf, pad([midi(n) for n in ch], max(1.6, min(bar + 0.6, b - t0 + 0.4))) * 0.11 * gain, t0)
            for k in range(8 if half else 4):
                at = t0 + k * (beat / 2 if half else beat)
                if at < b - 0.1:
                    place(buf, inst(midi(ch[arp[k]] + 12)) * 0.1 * gain, at, pan=-0.3 + 0.08 * k)
            place(buf, bass(midi(root - 12), 0.5) * 0.2 * gain, t0)
            t0 += bar
            i += 1

    loop(*ROOM_A, home, marimba, 1.0)
    loop(*STAGE, inner, musicbox, 0.85)
    loop(*ROOM_B, home, marimba, 1.0)
    place(buf, pad([midi(n) for n in (48, 60, 64, 67, 72)], 3.2) * 0.2, OUTRO)
    for k, m in enumerate([72, 76, 79, 84]):
        place(buf, pluck_bell(midi(m), 2.5) * 0.12, OUTRO + 0.05 + k * 0.12, pan=-0.3 + 0.2 * k)
    place(buf, bass(midi(36), 2.0) * 0.3, OUTRO)
    fade = int(1.2 * SR)
    buf[-fade:] *= np.linspace(1, 0, fade)[:, None]
    return buf


def story_sfx():
    buf = np.zeros((N, 2))
    # the room: remote clicks, the TV comes on with its cartoon jingle
    place(buf, click() * 0.3, 4.3)
    place(buf, tv_on() * 0.2, 4.85)
    jingle(5.4, 11.44, buf)
    # the light stage
    stream(buf, 14.84, 19.5)
    for at, pat in ((19.8, "BUKA"), (20.7, "KUAT"), (21.6, "SALURAN")):
        place(buf, click() * 0.3, at - 0.05)
        code(buf, at, pat, 0.06)
    stream(buf, 22.5, 24.5, "BUKA", 1.0)
    place(buf, bip(0.09, 1900) * 0.08, 24.7)
    place(buf, bip(0.3, 1900) * 0.08, 25.7)
    for at, pat in ((29.55, "BUKA"), (30.6, "KUAT"), (31.5, "SALURAN")):
        place(buf, click() * 0.3, at - 0.05)
        code(buf, at, pat, 0.05)
    place(buf, tv_on() * 0.2, 30.25)
    jingle(30.7, 32.3, buf, 0.025)
    for k in range(7):
        place(buf, bip(0.05, 1200 + 90 * k) * 0.05, 31.35 + k * 0.13)
    place(buf, tune() * 0.12, 32.3)
    # the phone: camera beep, the button, (silent) blinks
    place(buf, bip(0.12, 1500) * 0.06, 33.6)
    place(buf, click() * 0.3, 37.42)
    # the room again: channel change, the TV off
    place(buf, tune() * 0.1, 44.2)
    jingle(41.1, 47.9, buf, 0.02)
    place(buf, click() * 0.3, 47.5)
    place(buf, tv_off() * 0.2, 47.9)
    return buf


def ui_sfx():
    buf = np.zeros((N, 2))
    for at in (2.18, 4.66, 11.44, 16.9, 19.54, 24.56, 26.37, 33.34, 41.08, 42.0, 45.72):
        place(buf, whoosh(0.5) * 0.2, at - 0.25)
    place(buf, sparkle(1.3, 34, True, 2) * 0.32, 7.6)
    place(buf, whoosh(0.9, 300, 6000, rev=True) * 0.25, 10.6)
    place(buf, sparkle(0.6, 22, False, 3) * 0.3, 11.44)
    pops = (0.4, 2.2, 3.7, 4.72, 6.1, 7.55, 7.85, 8.15, 8.3, 11.5, 12.68, 17.62, 18.3, 19.8, 20.7, 21.6, 23.38, 24.75, 25.8,
            26.42, 27.8, 30.14, 31.08, 31.98, 33.4, 34.34, 38.0, 38.58, 39.5, 41.14, 42.6, 45.8, 47.95, 48.4, 48.7, 49.0,
            OUTRO + 0.3, OUTRO + 0.5, OUTRO + 0.7)
    for at in pops:
        place(buf, pop() * 0.22, at, pan=float(rs.uniform(-0.3, 0.3)))
    place(buf, chime((79, 84, 88)) * 0.24, 6.1)  # TERUS MENYALA
    place(buf, chime((84, 88, 91)) * 0.26, 15.4)  # CAHAYA INFRAMERAH
    place(buf, nope() * 0.2, 18.3)  # MATA KITA TAK NAMPAK
    place(buf, chime((79, 84, 88, 91)) * 0.24, 23.38)  # KOD RAHSIA
    place(buf, chime((79, 84, 88)) * 0.22, 27.8)  # MATA KECIL
    place(buf, chime((84, 88, 91)) * 0.26, 38.58)  # KAMERA NAMPAK
    place(buf, boing() * 0.22, 41.12)
    place(buf, chime((79, 84, 88, 91)) * 0.35, 41.16)
    place(buf, sparkle(1.0, 24, False, 8) * 0.28, 41.2)
    place(buf, chime((79, 84, 88)) * 0.24, 42.6)
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
