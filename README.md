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
| 028 | Kenapa Kilat Sampai Dulu, Guruh Lambat? | [`episodes/028-kilat-guruh`](episodes/028-kilat-guruh) | `output/TheCuriousAffan_E028_Kenapa_Kilat_Sampai_Dulu_Guruh_Lambat.mp4` |
| 029 | Tahi Bintang Tu Bintang Jatuh Ke? | [`episodes/029-tahi-bintang`](episodes/029-tahi-bintang) | `output/TheCuriousAffan_E029_Tahi_Bintang_Tu_Bintang_Jatuh_Ke.mp4` |

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

## Episode 028 at a glance

- **Science.** Lightning and thunder happen at the same moment. Lightning is
  light and thunder is sound. Light arrives almost instantly, but sound is much
  slower, so the thunder comes later. Counting the seconds between the flash
  and the thunder tells you roughly how far away the lightning was: about three
  seconds for every kilometre. The episode also reminds children to stay
  indoors when there is lightning.
- **Picture.** It reuses the Episode 005 sets, dressed for a storm: rain, storm
  clouds and lightning bolts on the night road. In the imagination world, a
  "race" on the toy road shows the light (a glowing ball) arriving at once,
  while the sound (three rolling arches) arrives late. A ruler marks the
  three-seconds-per-kilometre rule.
- **Audio.** The narration is in Affan's voice, made with ElevenLabs. Every
  thunderclap lands where the picture puts it: late after a far flash, together
  with the strike at its source, and on "tiga" in the count. The soundtrack
  reuses the Episode 005 instruments and adds rain, thunder, crackles and the
  racers' sounds. Thunder is kept gentle, below the voice. The mix is normalised
  to −14 LUFS with a peak limiter at −1.5 dB.

## Episode 029 at a glance

- **Science.** A shooting star is not a star. Stars are huge and very far
  away. What we see is a speck of space dust, about the size of a grain of
  sand, left behind by a comet that passed near the Sun. When the Earth passes
  through that dust, the specks rush into the air very fast, get hot and burn
  up. That line of light is a shooting star, or meteor. The episode ends by
  inviting children to watch the meteor shower on 17 November (the Leonids).
- **Picture.** The night road from Episode 005 gets shooting stars and a meteor
  shower. A new imagination world is a storybook solar system:
  - the Sun;
  - a comet whose tail points away from the Sun, laying a sparkling dust trail
    along its orbit;
  - the Earth crossing that trail;
  - a close-up of a big curved Earth, where one grain of dust heats from grey
    to orange and burns into a streak of light.
- **Audio.** The narration is in Affan's voice, made with ElevenLabs. The
  soundtrack reuses the Episode 005 instruments and adds:
  - a soft "fssh" for each shooting star on screen;
  - a comet shimmer;
  - the grain's sizzle and burn-out.

  The mix is normalised to −14 LUFS with a peak limiter at −1.5 dB.

