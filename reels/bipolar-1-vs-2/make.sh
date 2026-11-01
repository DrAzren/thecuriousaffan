#!/usr/bin/env bash
# Rebuild the reel "Beza Bipolar Type 1 vs Type 2" from the raw recording.
#
#   reels/bipolar-1-vs-2/make.sh path/to/"Beza Bipolar 1 dan 2.mp4"
#
# Steps: transcribe -> cut fillers/pauses/retakes -> A-roll -> HyperFrames
# composition -> synthesised SFX + music mix -> HyperFrames render -> mux.
# Needs: python3 (numpy, scipy, faster-whisper), ffmpeg, node 18+, Chrome.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
RAW="${1:?usage: make.sh <raw video>}"
WORK="${WORK:-$HERE/work}"
PROJ="$HERE/project"
HF="npx --yes hyperframes@0.8.225"
mkdir -p "$WORK" "$PROJ/assets/broll" "$HERE/output"
export HYPERFRAMES_TELEMETRY=0 HYPERFRAMES_SKIP_SKILLS=1

cd "$WORK"
ffmpeg -v error -y -i "$RAW" -ac 1 -ar 16000 audio16k.wav
if [ ! -f transcript.json ]; then
  if [ -f "$HERE/edit/transcript.json" ]; then cp "$HERE/edit/transcript.json" .;
  else python3 -I "$HERE/edit/transcribe.py" audio16k.wav medium transcript.json; fi
fi
python3 -I "$HERE/edit/analyze.py" audio16k.wav transcript.json > drawn_out_words.txt
python3 -I "$HERE/edit/cutlist.py"
cp cuts.json words_out.json "$HERE/edit/"
python3 -I "$HERE/edit/render_aroll.py" "$RAW" aroll.mov
ffmpeg -v error -y -i aroll.mov -an -c:v libx264 -crf 15 -preset medium -pix_fmt yuv420p -g 30 "$PROJ/assets/aroll.mp4"
ffmpeg -v error -y -i aroll.mov -vn -c:a pcm_s16le voice_raw.wav

# AI B-roll (Wan 3.0, 480p) upscaled to the 1080x1920 canvas
for f in "$HERE"/broll/b*.mp4; do
  ffmpeg -v error -y -i "$f" -vf "scale=1080:1920:flags=lanczos,unsharp=5:5:0.8,eq=saturation=1.08,fps=30" \
    -an -c:v libx264 -crf 17 -preset medium -pix_fmt yuv420p "$PROJ/assets/broll/$(basename "$f")"
done

python3 "$HERE/build_comp.py" words_out.json "$PROJ"
python3 "$HERE/build_audio.py" voice_raw.wav "$PROJ/cues.json" mix.wav

(cd "$PROJ" && $HF lint && $HF render -f 30 -q high -w 4 -o "$WORK/video_silent.mp4")

OUT="$HERE/output/Beza_Bipolar_Type1_vs_Type2_TikTok.mp4"
ffmpeg -v error -y -i "$WORK/video_silent.mp4" -i mix.wav -map 0:v -map 1:a \
  -c:v libx264 -profile:v high -preset slow -b:v 4500k -maxrate 6M -bufsize 12M -pix_fmt yuv420p \
  -c:a aac -b:a 256k -ar 48000 -shortest -movflags +faststart "$OUT"
echo "done -> $OUT"
