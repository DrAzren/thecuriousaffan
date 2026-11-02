#!/usr/bin/env python3
"""Episode 008 narration timeline.

Takes the supplied narration (audio/narration_source.mp3) and writes
audio/narration.flac, the master timeline for picture, captions and mix.
Nothing is cut: a short lead-in and a few beats of silence are inserted only
inside the pauses that already exist between sentences, so the visuals have
room for the shrink transformation, the spatula reveal, the "kuat!" moment and
the return to normal size. A gentle 70 Hz high-pass removes rumble.

    python3 prep_narration.py
"""
import os
import subprocess

import numpy as np

SR = 44100
HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "audio", "narration_source.mp3")
DST = os.path.join(HERE, "audio", "narration.flac")

LEAD = 0.20
# (cut point in the source, seconds of silence inserted). Every cut point sits
# in the middle of a measured pause (ffmpeg silencedetect, -38 dB).
GAPS = [
    (8.13, 1.20),   # after "Jom Affan siasat!"  -> shrink transformation
    (17.21, 0.80),  # after "...lebih kecil."    -> spatula reveal
    (25.80, 0.60),  # after "...jadi kuat!"       -> strong-grip moment
    (32.11, 0.50),  # after "...mengupas pelekat!" -> grow back to normal size
]


def src_to_final(t):
    """Map a time in the source recording to the final narration timeline."""
    return t + LEAD + sum(g for c, g in GAPS if t > c)


def main():
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", SRC, "-af", "highpass=f=70", "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"],
                         check=True, capture_output=True).stdout
    v = np.frombuffer(raw, dtype=np.float32).astype(np.float64)
    parts = [np.zeros(int(LEAD * SR))]
    prev = 0
    fade = int(0.01 * SR)
    for cut, gap in GAPS:
        i = int(cut * SR)
        seg = v[prev:i].copy()
        if prev:
            seg[:fade] *= np.linspace(0, 1, fade)
        seg[-fade:] *= np.linspace(1, 0, fade)
        parts += [seg, np.zeros(int(gap * SR))]
        prev = i
    seg = v[prev:].copy()
    seg[:fade] *= np.linspace(0, 1, fade)
    parts.append(seg)
    out = np.concatenate(parts)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "1", "-i", "-", "-c:a", "flac", "-sample_fmt", "s16", DST],
                   input=out.astype(np.float32).tobytes(), check=True)
    print("wrote", DST, f"({len(out) / SR:.2f} s)")


if __name__ == "__main__":
    main()
