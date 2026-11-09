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
| 024 | Berapa Ekor Kucing di Dunia Ini? | [`episodes/024-berapa-ekor-kucing`](episodes/024-berapa-ekor-kucing) | `output/TheCuriousAffan_E024_Berapa_Ekor_Kucing_Di_Dunia_Ini.mp4` |

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

`make.sh` renders the picture (`tools/render.js`), synthesises and mixes the
soundtrack (`build_audio.py`), then muxes the final MP4 (H.264 High, AAC
256 kb/s, faststart).

Every full render also writes, next to the video:

- `output/thumbnail.jpg`: a 1080×1920 cover drawn by the episode's
  `EP.thumbnail()` (Affan, big title, episode badge, logo). Key elements stay
  inside the centre 3:4 area that TikTok and Reels profile grids show.
- `output/description.txt`: a short post description (title, one-line teaser,
  hashtags) built from the episode's `meta.json` and the series hashtags in
  `series.json`.

To regenerate only these two files, without re-rendering the video:

```bash
node tools/render.js episodes/005-bulan-ikut-kereta --package
```

For a new episode, add a `meta.json` (`episode`, `title`, `teaser`,
`hashtags`) and an `EP.thumbnail()` function.

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

```bash
# cat breed sheet (all breeds, turnaround, walking, meow, close-ups)
node tools/render.js lab/cat-sheet --stills 0,1,2,3,4,5,6,7,8,9,10,11
```

## Layout

```
shared/
  affan.js     Affan character: model sheet, pose rig, 2-bone arm IK, lip-sync mouth, blinks
  cat.js       procedural cartoon cats: one rig (sit/walk, tail, blink, meow), breed presets, cat-face icon
  props.js     sky, stars, moon, road, car (+ interior), trees, lamp posts, houses
  overlay.js   captions, bubble titles, DEKAT/JAUH tags, arrows, icons, sparkles, flashes
  core.js      easing, keyframes, seeded RNG, narration envelope (lip sync), projection
tools/render.js  deterministic frame renderer (Playwright -> ffmpeg) + thumbnail/description
tools/package.js short description from meta.json + series.json
series.json      series name and hashtags
episodes/<nnn>/  index.html, episode.js (shots + thumbnail), worlds.js (sets), captions.js, meta.json,
                 build_audio.py (music + SFX + mix), audio/narration.mp3, make.sh
lab/model-sheet  Affan turnaround and pose test page
lab/cat-sheet    cat breeds test page
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

## Episode 024 at a glance

- **Narration.** Affan's own voice (the "Affan Clone" voice on ElevenLabs,
  model `eleven_v4`), generated once from the script in
  `audio/script.txt`. Word timings for the captions were measured locally
  with Whisper, so no extra credits were used.
- **Science.** Scientists estimate there are about 600 million cats in the
  world. Some live at home with their owners and some live free outside.
  There are more than 70 recognised breeds. The episode shows seven:
  - kucing kampung, from Malaysia;
  - Parsi, with long, fluffy fur;
  - Siam, with blue eyes, which likes to meow;
  - Maine Coon, one of the biggest house cats;
  - Sphynx, with almost no fur;
  - Scottish Fold, with folded ears;
  - Singapura, one of the smallest breeds.
- **Picture.** All cats come from `shared/cat.js`:
  - a living room with Affan's own kampung cat;
  - a sunny street wall;
  - an imagination globe covered in cat faces, with a counter up to 600 juta;
  - a crowd stand of cats;
  - a spotlight carousel that turns to present each breed.
- **Audio.** The soundtrack is original and synthesised, with a cosy home theme
  and a playful marimba band. It adds birdsong, carousel whooshes, counter
  ticks, pops, chimes and a soft cartoon meow. The mix is normalised to
  −14 LUFS with a −1.5 dBTP ceiling.
