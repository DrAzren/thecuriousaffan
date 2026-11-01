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
| 003 | Kenapa Kapal Besar Tak Tenggelam? | [`episodes/003-kapal-tak-tenggelam`](episodes/003-kapal-tak-tenggelam) | `output/TheCuriousAffan_E003_Kenapa_Kapal_Besar_Tak_Tenggelam.mp4` |
| 005 | Kenapa Bulan Macam Ikut Kereta Kita? | [`episodes/005-bulan-ikut-kereta`](episodes/005-bulan-ikut-kereta) | `output/TheCuriousAffan_E005_Kenapa_Bulan_Macam_Ikut_Kereta_Kita.mp4` |

## Build

Requirements: Node 18+, Python 3 with `numpy`, `ffmpeg`, and Playwright with
Chromium (`npm i -g playwright && npx playwright install chromium`, or set
`CHROMIUM_PATH` to an existing Chrome/Chromium).

```bash
npm install
```

```bash
episodes/003-kapal-tak-tenggelam/make.sh
```

```bash
episodes/005-bulan-ikut-kereta/make.sh
```

`make.sh` renders the picture (`tools/render.js`), synthesises and mixes the
soundtrack (`build_audio.py`), then muxes the final MP4 (H.264 High, AAC
256 kb/s, faststart).

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
  outro.js     branded outro (Affan, golden ring, logo), shared by all episodes
  core.js      easing, keyframes, seeded RNG, narration envelope (lip sync), projection
tools/render.js  deterministic frame renderer (Playwright -> ffmpeg)
episodes/<nnn>/  index.html, episode.js (shots), worlds.js (sets), captions.js,
                 build_audio.py (music + SFX + mix), audio/narration.mp3, make.sh
                 (E003 adds ship.js, the container ship, and water.js, the sea and tank shaders)
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

## Episode 003 at a glance

- **Science.** A ship floats because of buoyancy (*daya apungan*). Its hull
  shape pushes a lot of water aside, and the water pushes back up on the hull.
  When that upward push is strong enough to hold up the ship's weight, the
  ship floats. A small stone pushes aside very little water, so it sinks.
- **Shots.**
  1. A sunny harbour with a giant container ship.
  2. Affan drops a stone off the pier; the splash lands on "plop!".
  3. Underwater, the stone sinks to the sea bed.
  4. Split screen: the ship floats above, the stone lies on the bottom below.
  5. The science world: a cut-away model of the same ship in a water tank.
     It shows the hull shape (BENTUK KAPAL), the water pushed aside as the
     level rises (TOLAK AIR), and the upward pushes merging into one arrow
     (DAYA APUNGAN). Then equal arrows, BERAT ↓ = DAYA APUNGAN ↑, so it
     floats (TERAPUNG).
  6. Back at the harbour: "Waaah!", a thumbs-up, "what next?", then the logo.
- **Publishing.** `output/` also holds the 9:16 cover
  (`TheCuriousAffan_E003_thumbnail.png` / `.jpg`) and ready-to-paste captions
  for TikTok, Reels and YouTube Shorts (`description.md`). The cover is
  rendered from the episode sets:

  ```bash
  node tools/render.js episodes/003-kapal-tak-tenggelam/thumbnail --stills 0 --out /tmp/thumb
  ```

- **Narration.** The supplied voice recording (44.1 s) sets the timing.
  Captions use the words as spoken in the recording and are timed word by word.
- **Audio.** An original synthesised bed and effects:
  - harbour water and gulls, and a ship horn;
  - the stone splash, bubbles and an underwater bed;
  - magic whooshes, discovery chimes and arrow tones.

  The music sits about 15 dB under the voice. The mix is normalised to
  −14 LUFS with a −1.5 dBTP ceiling.

