#!/usr/bin/env bash
# Build the Episode 022 preview cut: picture + Affan narration -> 9:16 MP4.
# (Music/SFX mix and the full animated shots are still to come.)
set -euo pipefail
EP="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$EP/../.." && pwd)"
OUT="$EP/output"
FINAL="$OUT/TheCuriousAffan_E022_Macam_Mana_Duit_Kertas_Terhasil_PREVIEW.mp4"

cd "$ROOT"
node tools/render.js "episodes/$(basename "$EP")"   # -> output/video_silent.mp4, thumbnail.jpg, description.txt
ffmpeg -v error -y -i "$OUT/video_silent.mp4" -i "$EP/audio/narration.mp3" \
  -map 0:v -map 1:a -c:v copy -af apad -c:a aac -b:a 256k -ar 48000 -shortest \
  -movflags +faststart -metadata title="The Curious Affan — E022: Macam Mana Duit Kertas Terhasil? (preview)" "$FINAL"
echo "wrote $FINAL"
