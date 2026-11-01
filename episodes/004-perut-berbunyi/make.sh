#!/usr/bin/env bash
# Build Episode 004 end to end: picture, soundtrack, final 9:16 MP4.
set -euo pipefail
EP="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$EP/../.." && pwd)"
OUT="$EP/output"
FINAL="$OUT/TheCuriousAffan_E004_Kenapa_Perut_Kita_Berbunyi_Bila_Lapar.mp4"

cd "$ROOT"
node tools/render.js "episodes/$(basename "$EP")"   # -> output/video_silent.mp4
python3 "$EP/build_audio.py"                         # -> output/mix.wav
ffmpeg -v error -y -i "$OUT/video_silent.mp4" -i "$OUT/mix.wav" \
  -map 0:v -map 1:a -c:v copy -c:a aac -b:a 256k -ar 48000 -shortest \
  -movflags +faststart -metadata title="The Curious Affan — E004: Kenapa Perut Kita Berbunyi Bila Lapar?" "$FINAL"
echo "wrote $FINAL"
