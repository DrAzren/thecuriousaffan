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
| 031 | Kenapa Kita Tak Boleh Geletek Diri Sendiri? | [`episodes/031-geletek-diri-sendiri`](episodes/031-geletek-diri-sendiri) | `output/TheCuriousAffan_E031_Kenapa_Kita_Tak_Boleh_Geletek_Diri_Sendiri.mp4` |
| 032 | Kenapa Jari Jadi Kecut Bila Lama Main Air? | [`episodes/032-jari-kecut`](episodes/032-jari-kecut) | `output/TheCuriousAffan_E032_Kenapa_Jari_Jadi_Kecut_Bila_Lama_Main_Air.mp4` |
| 033 | Kenapa Bulan Berubah Bentuk? | [`episodes/033-bulan-berubah-bentuk`](episodes/033-bulan-berubah-bentuk) | `output/TheCuriousAffan_E033_Kenapa_Bulan_Berubah_Bentuk.mp4` |
| 034 | Kenapa Bayang Kita Jadi Panjang dan Pendek? | [`episodes/034-bayang-panjang-pendek`](episodes/034-bayang-panjang-pendek) | `output/TheCuriousAffan_E034_Kenapa_Bayang_Kita_Jadi_Panjang_Dan_Pendek.mp4` |

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

## Episode 031 at a glance

- **Science.** We can't tickle ourselves because the brain already knows
  where our own hand is going. When the brain sends an order to move the hand,
  the cerebellum (serebelum), a small part at the back of the brain, gets a
  copy and predicts the touch. A touch that was predicted is no surprise, so
  it hardly tickles. When someone else tickles us, the brain can't guess where
  the fingers will land, so the touch is a surprise and it tickles. This
  follows Blakemore, Wolpert and Frith (1998, 2000).
- **Picture.** Two sets:
  - a sunny living room, where Kakak (Affan's big sister, built from the same
    rig with new colours, a ponytail and no glasses) sneaks up and tickles
    Affan, and then Affan tries to tickle himself;
  - a new imagination world "dalam kepala": a big friendly brain floating above
    Affan, a glowing striped cerebellum, and its little guard with a sign
    board. Yellow dots carry the order to the hand and teal dots carry the copy
    to the cerebellum. The board reads "JARI ➜ KETIAK" for Affan's own hand,
    and "? ? ?" while Kakak's fingers dart between armpit, tummy and feet,
    until "KEJUTAN!" sets off a gentle alarm.
- **Audio.** The narration is in Affan's voice, made with ElevenLabs
  (`eleven_v4`, one take). Captions use word timings measured locally with
  faster-whisper (`audio/narration_words.json`), so no extra credits were
  spent. The soundtrack reuses the Episode 005 instruments and adds tiptoe
  plucks, "tiki-tiki" tickle trills, a dull self-tickle, a rising zap for the
  brain's order, a chime for the copy, a board flip, a confused wobble and a
  cartoon alarm. The mix is normalised to −14 LUFS with a peak limiter at
  −1.5 dB.

## Episode 032 at a glance

- **Science.** Fingers wrinkle after a long time in water, but not because the
  skin "drinks" water. The nerves do it: when the fingers stay in water, the
  nerves tell the tiny blood vessels under the fingertip skin to narrow. The
  layer under the skin shrinks a little, so the skin on top wrinkles. Fingers
  with damaged nerves don't wrinkle at all. Scientists think the wrinkles may
  help us grip wet things, like the tread on a tyre. That idea is still being
  tested, so the script says "mungkin" (maybe). Once the fingers dry, they go
  smooth again.
- **Picture.** Two sets:
  - a sunny backyard with a round paddling pool and a rubber duck, plus a
    giant close-up hand whose fingertips crinkle like the raisin beside it;
  - a new imagination world, the "skin lab": a big cut-away block of fingertip
    skin with the outer skin on top, red blood vessels and a glowing yellow
    nerve. Water drips on, sparks run along the nerve, the vessels squeeze,
    the layer below sinks and the top skin wrinkles. A broken (grey) nerve
    shows that no wrinkles appear without it. A wet road strip has a bald tyre
    that slips and a treaded tyre that grips.
  - Back at the pool, smooth fingers drop a wet marble ("plip!") and wrinkly
    fingers hold it.
- **Audio.** The narration is in Affan's voice, made with ElevenLabs
  (`eleven_v4`, one take). Captions use word timings measured locally with
  faster-whisper (`audio/narration_words.json`). The soundtrack reuses the
  Episode 005 instruments and adds splashes, drips, a nerve buzz, a squeeze
  and a crinkle, a tyre hum and skid, and the marble's tink, slip, plip and
  grip squeak. The mix is normalised to −14 LUFS with a peak limiter at
  −1.5 dB.

## Episode 033 at a glance

- **Science.** The Moon has no light of its own; it shines because sunlight
  falls on it, and the Sun always lights one half of it. As the Moon travels
  around the Earth, we see different amounts of that lit half: dark (new
  moon), a thin crescent, a half, then a full moon, and then it shrinks again.
  One cycle takes about 29 and a half days. It is not Earth's shadow; that only
  happens during a lunar eclipse, which is rare.
- **Picture.** It follows on from Episode 005:
  - the night road and car from Episode 005, where the moon shader can show any
    phase ("yesterday round, tonight half: who ate the moon?");
  - a new "toy space" imagination world: a smiling Sun, the Earth with a tiny
    Affan on top, and the Moon on a dashed orbit, lit by real directional
    sunlight. A round "DARI BUMI" window, rendered by a second camera standing
    on the Earth, shows the phase Affan would see, with a day counter.
    Earth's shadow cone appears only for the eclipse, when the Moon turns red;
  - the Episode 031 living room with the lights off and a floor lamp, where
    Affan turns slowly holding a ball, with a "DARI MATA AFFAN" window.
- **Audio.** The narration is in Affan's voice, made with ElevenLabs
  (`eleven_v4`, one take). Captions use word timings measured locally with
  faster-whisper (`audio/narration_words.json`). The soundtrack reuses the
  Episode 005 instruments and adds the car hum, a cartoon bite, light-switch
  clicks, a sun swell and shimmering rays, an orbit whirr, day-counter ticks
  and an eclipse drone. The mix is normalised to −14 LUFS with a peak limiter
  at −1.5 dB.

## Episode 034 at a glance

- **Science.** Light travels in straight lines. A shadow is the place behind
  us that the light can't reach because our body blocks it. Its length
  depends on the angle of the light, not on our size. When the lamp is right
  above our head, the light falls straight down and the shadow is short.
  When we walk away from the lamp, the light comes in at a slant and the
  shadow lies long on the ground. The further we walk, the more slanted the
  light and the longer the shadow. For a lamp at height h and a child of
  height a standing a distance d away, the shadow length is a·d / (h − a).
  The Sun works the same way: at noon it is high in the sky (in Malaysia
  almost straight overhead), so shadows are short; in the evening it is low,
  so shadows are long.
- **Picture.** Three sets:
  - a new night street in a housing estate. One street lamp's point light
    casts Affan's real shadow on a pale tiled pavement: short under the lamp,
    long as he walks away. Invisible horns on his head show up only in the
    shadow for the "raksasa" (monster) gag;
  - a new imagination world, the "pentas cahaya" (light stage): a cream grid
    floor with a toy street lamp. Glowing light rays travel in straight
    lines, and the ones that hit Affan stop at his body. A purple highlight
    marks the shadow. An orange ray from the bulb over his head to the tip
    of the shadow shows the slant, with an angle arc and a bracket that
    measures the length. The lamp then turns into a smiling Sun with a
    directional light, high at noon and low in an orange evening sky;
  - the Episode 031 living room with the lights off. Affan squats by a toy
    robot and shines a torch (spot light) from above for a short shadow,
    then from the side for a long one.
- **Audio.** The narration is in Affan's voice, made with ElevenLabs
  (`eleven_v4`, take B of 2). Captions use word timings measured locally with
  faster-whisper (`audio/narration_words.json`). The soundtrack reuses the
  Episode 005 instruments and adds night crickets, footsteps, a stretchy
  "boiing" as the shadow grows, a cartoon monster "rawr", a light-ray zap and
  shimmer, tiny "tik" hits where light meets Affan, a sun swell, an evening
  glide down, and light-switch and torch clicks. The mix is normalised to
  −14 LUFS with a peak limiter at −1.5 dB.
