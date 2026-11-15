#!/usr/bin/env python3
"""Soundtrack for Episode 041, synthesised from scratch (no samples, no
licensed music) and mixed under the narration.

Reuses the instruments and effects from Episode 005's build_audio.py and adds:
pepper shakes, a nose-tickle shimmer, two cartoon "ah... ah..." build-up
risers, sneeze bursts (a noisy "choo" with a spray hiss), sticky catches in
the nose, a nerve zap, an alarm, a big button clunk, a deep breath in, a
squeeze rumble, a slow-motion sneeze, germ giggles, and soap bubbles.

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

DUR = 70.15
OUTRO = 67.0
OUT = os.path.join(HERE, "output")
N = int(SR * DUR)
rs = np.random.default_rng(41)

# scene boundaries (must match episode.js)
KIT_A = (0.0, 12.8)
NOSE = (12.8, 25.18)
MIND = (25.18, 31.64)
STUDIO = (31.64, 54.62)
KIT_B = (54.62, OUTRO)


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
def shake_rattle():
    t = T(0.09)
    return norm(fftfilt(rs.standard_normal(len(t)), 3000, 9000) * np.exp(-t * 60))


def riser(dur=0.7, f0=300, f1=700):
    t = T(dur)
    f = f0 + (f1 - f0) * (t / dur) ** 2
    return norm(np.sin(2 * np.pi * np.cumsum(f) / SR)) * np.clip(t / 0.05, 0, 1) * np.clip((dur - t) / 0.08, 0, 1)


def sneeze(dur=0.7, slow=1.0):
    d = dur * slow
    t = T(d)
    noise = fftfilt(rs.standard_normal(len(t)), 800 / slow, 7000 / slow)
    tone = np.sin(2 * np.pi * np.cumsum(260 / slow * (1 - 0.4 * t / d)) / SR)
    env = np.minimum(1, t / (0.015 * slow)) * np.exp(-t / (0.22 * slow))
    hiss = fftfilt(rs.standard_normal(len(t)), 4000 / slow, 11000) * np.exp(-t / (0.5 * slow)) * 0.5
    return norm((noise + 0.5 * tone) * env + hiss)


def shimmer(dur=1.5, seed=4, lo=2200, hi=4200, n=18):
    r = np.random.default_rng(seed)
    m = int(dur * SR)
    out = np.zeros(m)
    for at in np.sort(r.uniform(0, dur - 0.3, n)):
        d = T(0.25)
        s = np.sin(2 * np.pi * r.uniform(lo, hi) * d) * np.exp(-d * 14)
        i = int(at * SR)
        out[i : i + len(s)] += s[: m - i] * r.uniform(0.3, 1)
    return norm(out) * np.sin(np.pi * np.arange(m) / m) ** 0.5


def splat():
    t = T(0.12)
    return norm(np.sin(2 * np.pi * np.cumsum(500 * (1 - 0.6 * t / 0.12)) / SR) * np.exp(-t * 30) + 0.3 * fftfilt(rs.standard_normal(len(t)), 300, 2000) * np.exp(-t * 40))


def zap(dur=0.6):
    t = T(dur)
    f = 900 + 600 * np.sin(2 * np.pi * 7 * t)
    return norm(np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * 0.3 + np.sin(2 * np.pi * np.cumsum(f * 2) / SR)) * np.sin(np.pi * t / dur)


def alarm(dur=1.1):
    t = T(dur)
    f = np.where((t * 4) % 1 < 0.5, 880, 660)
    return norm(np.sin(2 * np.pi * np.cumsum(f) / SR)) * np.clip((dur - t) / 0.1, 0, 1)


def clunk():
    t = T(0.3)
    return norm(np.sin(2 * np.pi * np.cumsum(140 * (1 - 0.5 * t / 0.3)) / SR) * np.exp(-t * 14) + 0.4 * fftfilt(rs.standard_normal(len(t)), 200, 2500) * np.exp(-t * 50))


def breath(dur=1.4, rev=False):
    t = T(dur)
    s = norm(fftfilt(rs.standard_normal(len(t)), 600, 3500)) * np.sin(np.pi * t / dur) ** 1.5
    return s[::-1] if rev else s


def rumble(dur=1.4):
    t = T(dur)
    f = 70 + 25 * np.sin(2 * np.pi * 3 * t)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * (0.6 + 0.4 * np.sin(2 * np.pi * 7 * t))
    return norm(s) * np.sin(np.pi * t / dur)


def giggle(seed=0):
    r = np.random.default_rng(seed)
    n = int(0.8 * SR)
    out = np.zeros(n)
    for k in range(5):
        d = T(0.08)
        f = r.uniform(900, 1300) * (1 + 0.4 * np.sin(np.pi * d / 0.08))
        s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * d / 0.08)
        i = int(k * 0.13 * SR)
        out[i : i + len(s)] += s[: n - i]
    return norm(out)


# ------------------------------------------------------------------ layers
def music():
    buf = np.zeros((N, 2))
    beat = 60 / 104
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

    loop(*KIT_A, home, marimba, 1.0)
    loop(*NOSE, inner, musicbox, 0.9)
    loop(*MIND, inner, musicbox, 0.8, half=False)
    loop(*STUDIO, home, musicbox, 0.9)
    loop(*KIT_B, home, marimba, 1.05)
    place(buf, pad([midi(n) for n in (48, 60, 64, 67, 72)], 3.2) * 0.2, OUTRO)
    for k, m in enumerate([72, 76, 79, 84]):
        place(buf, pluck_bell(midi(m), 2.5) * 0.12, OUTRO + 0.05 + k * 0.12, pan=-0.3 + 0.2 * k)
    place(buf, bass(midi(36), 2.0) * 0.3, OUTRO)
    fade = int(1.2 * SR)
    buf[-fade:] *= np.linspace(1, 0, fade)[:, None]
    return buf


def story_sfx():
    buf = np.zeros((N, 2))
    # Mama shakes pepper
    for at in np.arange(0.3, 4.0, 0.39):
        place(buf, shake_rattle() * 0.12, float(at), pan=-0.4)
    place(buf, shimmer(1.4, 4, 3000, 5000) * 0.1, 3.6)  # itchy nose
    place(buf, riser(0.7, 300, 600) * 0.1, 5.3)
    place(buf, riser(0.55, 400, 800) * 0.12, 6.25)
    place(buf, sneeze() * 0.45, 6.9)
    # nose: things get caught
    for i in range(6):
        place(buf, splat() * 0.12, 18.1 + i * 0.28, pan=0.2 * (i % 2 * 2 - 1))
    for i in range(8):
        place(buf, splat() * 0.1, 19.0 + i * 0.22, pan=-0.2)
    for at in (22.0, 22.9, 23.6):
        place(buf, splat() * 0.12, at)
    place(buf, shimmer(1.4, 6, 2600, 4800) * 0.14, 23.8)  # tickle
    place(buf, zap(0.8) * 0.1, 24.3)
    place(buf, zap(1.2) * 0.08, 25.4)  # message to the brain
    place(buf, alarm(1.1) * 0.13, 28.22)
    place(buf, clunk() * 0.3, 30.3)
    # the big sneeze
    place(buf, breath(1.9, rev=True) * 0.22, 31.75)
    place(buf, rumble(2.0) * 0.18, 33.8)
    place(buf, sneeze(0.9) * 0.55, 36.0)
    place(buf, whoosh(1.4, 300, 6000) * 0.25, 36.05)
    place(buf, whoosh(0.9, 400, 5000) * 0.15, 39.3)
    # slow-motion sneeze
    place(buf, sneeze(0.7, 4.0) * 0.35, 43.55)
    # droplets travel; germs to Kakak
    place(buf, sneeze(0.6) * 0.4, 48.1)
    place(buf, whoosh(2.4, 200, 3000) * 0.12, 48.2)
    place(buf, sneeze(0.6) * 0.4, 52.3)
    place(buf, giggle(1) * 0.12, 52.6)
    place(buf, giggle(2) * 0.1, 53.3)
    # good habits: muffled sneeze into the elbow, soap bubbles
    place(buf, fftfilt(sneeze(0.5), 0, 900) * 0.4, 61.25)
    for i, at in enumerate(np.arange(63.4, 64.5, 0.14)):
        place(buf, pop() * 0.06, float(at), pan=float(rs.uniform(-0.4, 0.4)))
    return buf


def ui_sfx():
    buf = np.zeros((N, 2))
    for at in (2.06, 6.86, 8.8, 14.5, 16.5, 19.6, 21.1, 25.18, 29.38, 31.64, 35.9, 41.7, 47.72, 51.0, 54.62, 58.98, 64.56):
        place(buf, whoosh(0.5) * 0.2, at - 0.25)
    place(buf, sparkle(1.3, 34, True, 2) * 0.32, 11.3)
    place(buf, whoosh(0.9, 300, 6000, rev=True) * 0.25, 11.9)
    place(buf, sparkle(0.6, 22, False, 3) * 0.3, 12.8)
    pops = (0.4, 3.58, 5.36, 6.26, 8.8, 9.5, 12.8, 14.54, 15.76, 17.3, 18.9, 20.28, 22.0, 22.86, 23.56, 25.18, 27.68,
            30.3, 32.04, 37.14, 41.7, 43.3, 44.1, 48.5, 49.25, 50.0, 51.5, 53.0, 62.04, 62.78, 63.64, 64.6, 64.9, 65.2,
            OUTRO + 0.3, OUTRO + 0.5, OUTRO + 0.7)
    for at in pops:
        place(buf, pop() * 0.22, at, pan=float(rs.uniform(-0.3, 0.3)))
    place(buf, boing() * 0.2, 23.76)  # GELETEK!
    place(buf, nope() * 0.16, 28.22)  # ADA PENCEROBOH!
    place(buf, chime((79, 84, 88)) * 0.24, 38.42)  # LAJU-LAJU!
    place(buf, nope() * 0.14, 46.06)  # TAK BOLEH BUKA PUN!
    place(buf, chime((84, 88, 91)) * 0.22, 50.06)  # BEBERAPA METER!
    place(buf, boing() * 0.22, 54.65)
    place(buf, chime((79, 84, 88, 91)) * 0.35, 54.7)
    place(buf, sparkle(1.0, 24, False, 8) * 0.28, 54.75)
    place(buf, chime((79, 84, 88)) * 0.22, 58.98)  # INGAT!
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
