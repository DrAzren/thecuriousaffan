#!/usr/bin/env bash
# Build Episode 007 end to end: picture, soundtrack, final 9:16 MP4.
set -euo pipefail
EP="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$EP/../.." && pwd)"
OUT="$EP/output"
FINAL="$OUT/TheCuriousAffan_E007_Kenapa_Kita_Kena_Mandi.mp4"

cd "$ROOT"
node tools/render.js "episodes/$(basename "$EP")"   # -> output/video_silent.mp4, thumbnail.jpg, description.txt
python3 "$EP/build_audio.py"                         # -> output/mix.wav
ffmpeg -v error -y -i "$OUT/video_silent.mp4" -i "$OUT/mix.wav" \
  -map 0:v -map 1:a -c:v copy -c:a aac -b:a 256k -ar 48000 -shortest \
  -movflags +faststart -metadata title="The Curious Affan — E007: Kenapa Kita Kena Mandi?" "$FINAL"
echo "wrote $FINAL"
echo "wrote $OUT/thumbnail.jpg"
echo "wrote $OUT/description.txt"
