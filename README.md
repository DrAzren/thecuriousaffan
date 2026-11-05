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
| 019 | Macam Mana Ular Boleh Bergerak Walaupun Tak Ada Kaki? | [`episodes/019-ular-tanpa-kaki`](episodes/019-ular-tanpa-kaki) | `output/TheCuriousAffan_E019_Macam_Mana_Ular_Bergerak_Tanpa_Kaki.mp4` |

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
  series tagline, hashtags) built from the episode's `meta.json` and the
  tagline and hashtags in `series.json`.

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

## Layout

```
shared/
  affan.js     Affan character: model sheet, pose rig, 2-bone arm IK, lip-sync mouth, blinks
  props.js     sky, stars, moon, road, car (+ interior), trees, lamp posts, houses
  overlay.js   captions, bubble titles, DEKAT/JAUH tags, arrows, icons, sparkles, flashes
  core.js      easing, keyframes, seeded RNG, narration envelope (lip sync), projection
tools/render.js  deterministic frame renderer (Playwright -> ffmpeg) + thumbnail/description
                 (--eval runs JS first, also with --package, e.g. to try thumbnail framings)
tools/package.js short description from meta.json + series.json
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

## Episode 019 at a glance

- **Science.** A snake has no legs but moves with its whole body:
  - hundreds of backbones (vertebrae) with ribs and strong muscles make the
    body very bendy (x-ray shot with the skeleton appearing head to tail);
  - wide belly scales grip the ground so the body does not slip backwards
    (magnified belly close-up);
  - in an S-shape (lateral undulation) the bends push back against rocks and
    grass, and the body slides forward (top-down shot with push arrows);
  - in a narrow gap it bunches up like a spring and then stretches forward
    (concertina: head anchored while gathering, tail anchored while
    stretching).
- **Safety.** If you see a snake: keep away, don't touch, tell a grown-up.
- **The snake** (`snake.js`) is one tube rebuilt every frame from a centre
  line, so the same model can follow an S path, coil up, fold in a channel or
  go x-ray. `Path` gives arc-length sampling; `concertinaPath` solves the fold
  height so the body keeps its true length.
- **Narration** is `audio/narration.mp3` (the Affan voice), with word timings
  in `audio/words.json` used for the captions.
