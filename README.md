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
| 016 | Kenapa Semakin Tinggi Semakin Sejuk? | [`episodes/016-tinggi-sejuk`](episodes/016-tinggi-sejuk) | `output/TheCuriousAffan_E016_Kenapa_Semakin_Tinggi_Semakin_Sejuk.mp4` |
| 017 | Kesan Kalau Tak Makan Sayur | [`episodes/017-tak-makan-sayur`](episodes/017-tak-makan-sayur) | `output/TheCuriousAffan_E017_Kesan_Kalau_Tak_Makan_Sayur.mp4` |

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
  the series tagline, hashtags) built from the episode's `meta.json` and
  `series.json`. Keep it short: it never retells the episode or lists facts.

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

## Episode 016 at a glance

- **Science.** Being on a mountain hardly brings us closer to the Sun (about
  150 million km away). Sunlight warms the ground first, and the warm ground
  warms the air above it (like a stove warming a pot), so the warmest air is
  near the ground. Rising air expands, and expanding air cools: on average
  about 6 °C cooler for every 1 km up. Kuala Lumpur ~32 °C, Cameron Highlands
  (~1,500 m) ~20 °C, the summit of Gunung Kinabalu (4,095 m) can be near 0 °C.
- **Sets.** A misty Cameron Highlands tea estate with contour rows of tea
  bushes; a big mountain above a lowland town, coloured by height (rainforest,
  tea terraces, granite, frost), with Affan's hot-air balloon flying up its
  flank; the branded outro.
- **Narration.** `audio/narration.mp3` uses the series' Affan voice on
  ElevenLabs `eleven_v4` with emotion tags; `audio/words.json` is its
  word-level transcript, used to time the captions.
- **Audio.** Music-box hook, original marimba band for the flight, a wonder
  pad at the summit, breeze and birds down low, cold wind up high, burner
  roars, pops, shiver rattles and chimes. The mix is normalised to −14 LUFS
  with a −1.5 dBTP ceiling.

## Episode 017 at a glance

- **Science.** Vegetables give fibre, vitamins and minerals:
  - Fibre works like a broom in the gut and moves food waste along. With too
    little of it, poo is hard to pass (sembelit): the tummy aches and feels
    bloated.
  - Vitamin C (red capsicum, broccoli, tomatoes) helps the body's defences
    ("askar badan") fight germs. With too few vitamins they work less well,
    and we fall ill more easily.
  - Carrots give vitamin A, which the eyes need to see in dim light.
  - Spinach has iron. Without enough iron the body tires quickly.
- **Sets.**
  - Affan's dining table at home, where he pushes his broccoli away and
    later eats it.
  - A sunny garden of giant vegetables, with one stop each for broccoli,
    red capsicum and tomatoes, carrots and spinach.
  - The branded outro.
- **Motion graphics.**
  - A gut diagram with a broom sweeping food along; when it gets blocked, the
    gut swells.
  - Shielded "askar badan" soldiers popping germs, then weak soldiers
    outnumbered.
  - A night-vision eye.
  - A draining battery.
- **Narration.** Same Affan voice and `eleven_v4` emotion tags as E016;
  captions timed from `audio/words.json`.
- **Audio.**
  - Music: a bouncy music-box hook, an original marimba band, a comic minor
    shuffle for the blocked tummy, and night and "tired" pads.
  - Sound effects: broom swishes, tummy rumbles, germ pops, battery ticks,
    crunchy bites and chimes.
  - The mix is normalised to −14 LUFS with a −1.5 dBTP ceiling.
