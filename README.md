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
| 008 | Kenapa Cicak Boleh Panjat Dinding Tanpa Jatuh? | [`episodes/008-cicak-panjat-dinding`](episodes/008-cicak-panjat-dinding) | `output/TheCuriousAffan_E008_Kenapa_Cicak_Boleh_Panjat_Dinding_Tanpa_Jatuh.mp4` |

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
episodes/008-cicak-panjat-dinding/make.sh
```

`make.sh` renders the picture (`tools/render.js`), synthesises and mixes the
soundtrack (`build_audio.py`), then muxes the final MP4 (H.264 High, AAC
256 kb/s, faststart).

Every full render also writes, next to the video:

- `output/thumbnail.jpg`: a 1080×1920 cover drawn by the episode's
  `EP.thumbnail()` (Affan, big title, episode badge, logo). Key elements stay
  inside the centre 3:4 area that TikTok and Reels profile grids show.
- `output/description.txt`: a short post description (title, one-line teaser,
  an optional one-paragraph `summary`, hashtags) built from the episode's
  `meta.json` and the series hashtags in `series.json`.

To regenerate only these two files, without re-rendering the video:

```bash
node tools/render.js episodes/005-bulan-ikut-kereta --package
```

For a new episode, add a `meta.json` (`episode`, `title`, `teaser`,
`hashtags`, optional `summary`) and an `EP.thumbnail()` function.

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
  gecko.js     house gecko (cicak): lofted body, toe pads with lamellae, distance-driven gait, toe peel
  props.js     sky, stars, moon, road, car (+ interior), trees, lamp posts, houses
  overlay.js   captions, bubble titles, DEKAT/JAUH tags, arrows, icons, sparkles, flashes
  core.js      easing, keyframes, seeded RNG, narration envelope (lip sync), projection
tools/render.js  deterministic frame renderer (Playwright -> ffmpeg) + thumbnail/description
tools/package.js short description from meta.json + series.json
series.json      series name and hashtags
episodes/<nnn>/  index.html, episode.js (shots + thumbnail), worlds.js (sets), captions.js, meta.json,
                 build_audio.py (music + SFX + mix), audio/narration.mp3, make.sh
lab/model-sheet  Affan turnaround and pose test page
lab/gecko-sheet  gecko turnaround (top, side, underside, walk cycle, toe and eye close-ups)
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

## Episode 008 at a glance

- **Science (dry adhesion).** A gecko's toe pads carry lamellae covered in
  setae, hair-like stalks that branch at the top into tiny flat spatulae.
  When the spatulae touch a surface very closely, weak attractions between
  molecules (van der Waals forces) pull a little at each tip. Millions of
  tips together give a strong grip. To let go, the gecko curls its toes up
  from the tips, so the setae peel off at an angle, like peeling a sticker.
  There is no glue, no suction and no magnetism. The molecular inset shows
  soft pulses between neighbouring molecules, not sparks or electricity.
- **Narration.** The supplied recording is the master timeline. Nothing is
  cut. `prep_narration.py` adds a 0.2 s lead-in and four short beats of
  silence, each inside an existing pause between sentences, to make room for
  the shrink, the spatula reveal, the strong-grip moment and the return to
  normal size. It writes `audio/narration.flac`.
- **Captions.** They use the script's spelling with the emotion tags removed.
  Word times were measured on the source recording (Whisper word timestamps
  plus silence detection) and mapped onto the final timeline.
- **Sets.** The living room at night (ceiling gecko near the lamp, wall gecko
  at the end), the microscopic toe-pad world (setae field, a hero seta with
  12 spatulae, the ceiling slab that comes down onto the tips, contact
  glows that spread as a wave), and a giant toe lying on a wall that peels up
  from the tip in slow motion.
- **Audio.** Original music: a music box in the room, a marimba band in the
  micro world, a half-time section for the slow-motion peel and an outro
  jingle. Effects: surprise boing, tiny footsteps, shrinking whoosh,
  discovery chimes, contact shimmer, gentle peel, release pops, "not glue /
  not magnet" buzzers. Mixed to −14 LUFS with a −1.5 dBTP ceiling.
