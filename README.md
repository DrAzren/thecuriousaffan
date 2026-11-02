# The Curious Affan

Code-driven 3D animated science shorts for children (ages 5–12), in Bahasa
Melayu, made for TikTok, Reels and Shorts (9:16, 1080×1920).

Every frame is rendered from code with [three.js](https://threejs.org) in
headless Chromium. Affan, the sets, the motion graphics and the soundtrack are
all original and procedural. There are no stock models, samples or licensed
music. Each shot is a pure function of time, so a render is identical every
time and can be re-timed to new narration.

## Episodes

| # | Title | Folder | Final video |
|---|---|---|---|
| 005 | Kenapa Bulan Macam Ikut Kereta Kita? | [`episodes/005-bulan-ikut-kereta`](episodes/005-bulan-ikut-kereta) | `output/TheCuriousAffan_E005_Kenapa_Bulan_Macam_Ikut_Kereta_Kita.mp4` |
| 009 | Kenapa Langit Berwarna Biru? | [`episodes/009-langit-biru`](episodes/009-langit-biru) | `output/TheCuriousAffan_E009_Kenapa_Langit_Berwarna_Biru.mp4` |

## Build

Requirements: Node 18+, Python 3 with `numpy`, `ffmpeg`, and Playwright with
Chromium (`npm i -g playwright && npx playwright install chromium`, or set
`CHROMIUM_PATH` to an existing Chrome/Chromium).

```bash
npm install
```

```bash
episodes/005-bulan-ikut-kereta/make.sh
```

```bash
episodes/009-langit-biru/make.sh
```

`make.sh` renders the picture (`tools/render.js`), synthesises and mixes the
soundtrack (`build_audio.py`), then muxes the final MP4 (H.264 High, AAC
256 kb/s, faststart).

Every full render also writes, next to the video:

- `output/thumbnail.jpg`: a 1080×1920 cover drawn by the episode's
  `EP.thumbnail()` (Affan, big title, episode badge, logo). Key elements stay
  inside the centre 3:4 area that TikTok and Reels profile grids show.
- `output/description.txt`: a post description (title, one-line teaser,
  optional `body` lines, hashtags) built from the episode's `meta.json` and the
  series hashtags in `series.json`.

Episode 009's `make.sh` also writes `output/subtitles.srt` (`tools/srt.js`), a
caption file with the same timing as the burned-in captions.

To regenerate only these two files, without re-rendering the video:

```bash
node tools/render.js episodes/005-bulan-ikut-kereta --package
```

For a new episode, add a `meta.json` (`episode`, `title`, `teaser`,
`hashtags`, optionally `body`) and an `EP.thumbnail()` function.

Useful while editing:

```bash
# PNG stills at chosen times (seconds)
node tools/render.js episodes/005-bulan-ikut-kereta --stills 1,12.5,46.5
```

```bash
# render only a section
node tools/render.js episodes/005-bulan-ikut-kereta --from 20 --to 30 --out part.mp4
```

```bash
# Affan model sheet (front, 3/4, side, back, poses)
node tools/render.js lab/model-sheet --stills 0,1,2,3,4,5,6
```

## Layout

```
shared/
  affan.js     Affan character: model sheet, pose rig, 2-bone arm IK, lip-sync mouth, blinks
  props.js     sky, stars, moon, road, car (+ interior), trees, lamp posts, houses
  overlay.js   captions, bubble titles, DEKAT/JAUH tags, arrows, icons, sparkles, flashes
  core.js      easing, keyframes, seeded RNG, narration envelope (lip sync), projection
tools/render.js  deterministic frame renderer (Playwright -> ffmpeg) + thumbnail/description
tools/package.js post description from meta.json + series.json
tools/srt.js     subtitles.srt from an episode's captions.js
series.json      series name and hashtags
episodes/<nnn>/  index.html, episode.js (shots + thumbnail), worlds.js (sets), captions.js, meta.json,
                 build_audio.py (music + SFX + mix), audio/narration.mp3, make.sh
lab/model-sheet  Affan turnaround and pose test page
```

## Affan model sheet

He matches the approved avatar reference:

- A 5-year-old Malaysian boy with warm tan skin.
- Neat dark hair with a side-swept fringe.
- Dark rectangular glasses.
- A peach T-shirt under a navy hooded jacket with white and peach stripes.

Colours live in `AFFAN` in `shared/affan.js`. Change them there and every
episode stays consistent.

## Episode 005 at a glance

- **Science.** The moon seems to follow the car because it is very far away.
  Nearby trees, lamp posts and houses change direction quickly as we move, but
  the direction to the moon hardly changes (parallax). The sight-line shot
  shows this directly: the line to a nearby tree swings widely, while the line
  to the moon stays nearly fixed.
- **Captions.** They use the script's spelling and are timed word by word to
  the narration. They sit inside a mobile-safe area, clear of platform UI.
- **Audio.** Narration stays dominant over the other layers:
  - an original music bed, ducked under the voice;
  - car ambience;
  - whooshes;
  - a sparkle as the imagination world opens;
  - label pops and discovery chimes.

  The mix is normalised to −14 LUFS with a −1.5 dBTP ceiling.

## Episode 009 at a glance

- **Science.** Sunlight contains many colours (shown with Affan's prism
  gadget, never as the atmosphere being a prism). Air molecules (about four
  N₂ for every O₂) are far smaller than a light wave. Blue light is scattered
  much more than red (Rayleigh scattering, about 1/wavelength⁴): in the
  side-by-side lanes, blue and red travel at the same speed, blue has the
  shorter wavelength, and the red wavelets are drawn about 1/6 as strong as
  the blue ones. Scattered blue light reaches us from every part of the sky,
  so the sky looks blue. At sunset the Earth/atmosphere cutaway (space stays
  black) shows sunlight crossing far more air. Blue scatters out along the way,
  and the beam colour is computed from that loss, so it turns orange near
  Affan.
- **Safety.** Affan never looks at the Sun. The rocket ride is clearly
  imaginary, and the transitions are soft fades and an iris wipe, with no
  strobing.
- **Captions.** They use the script's spelling (emotion tags are not shown)
  and are timed word by word to the narration.
- **Audio.** The supplied narration runs unedited. Under it there is:
  - original music, ducked with look-ahead;
  - park birdsong and breeze;
  - a gentle rocket launch and wind;
  - micro-world particles;
  - shimmering pings on every blue scattering wavelet (red ones much fainter);
  - discovery chimes and an outro jingle.

  The mix is −14 LUFS with a −1.5 dBTP ceiling.
