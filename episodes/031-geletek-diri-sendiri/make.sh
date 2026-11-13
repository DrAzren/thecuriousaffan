#!/usr/bin/env bash
# Build Episode 031 end to end: picture, soundtrack, final 9:16 MP4.
set -euo pipefail
EP="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$EP/../.." && pwd)"
OUT="$EP/output"
FINAL="$OUT/TheCuriousAffan_E031_Kenapa_Kita_Tak_Boleh_Geletek_Diri_Sendiri.mp4"

cd "$ROOT"
node tools/render.js "episodes/$(basename "$EP")"   # -> output/video_silent.mp4, thumbnail.jpg, description.txt
python3 "$EP/build_audio.py"                         # -> output/mix.wav
ffmpeg -v error -y -i "$OUT/video_silent.mp4" -i "$OUT/mix.wav" \
  -map 0:v -map 1:a -c:v copy -c:a aac -b:a 256k -ar 48000 -shortest \
  -movflags +faststart -metadata title="The Curious Affan — E031: Kenapa Kita Tak Boleh Geletek Diri Sendiri?" "$FINAL"
echo "wrote $FINAL"
echo "wrote $OUT/thumbnail.jpg"
echo "wrote $OUT/description.txt"
