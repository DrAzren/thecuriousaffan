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
| 006 | Kenapa Air Laut Masin? | [`episodes/006-air-laut-masin`](episodes/006-air-laut-masin) | `output/TheCuriousAffan_E006_Kenapa_Air_Laut_Masin.mp4` |

## Build

Requirements: Node 18+, Python 3 with `numpy`, `ffmpeg`, and Playwright with
Chromium (`npm i -g playwright && npx playwright install chromium`, or set
`CHROMIUM_PATH` to an existing Chrome/Chromium).

```bash
npm install
```

```bash
episodes/006-air-laut-masin/make.sh
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
  tropical.js  animated sea, sun glints, palms, clouds, crab sidekick, magic mini submarine
  overlay.js   captions, bubble titles, DEKAT/JAUH tags, arrows, icons, sparkles, flashes
  core.js      easing, keyframes, seeded RNG, narration envelope (lip sync), projection
tools/render.js  deterministic frame renderer (Playwright -> ffmpeg)
episodes/<nnn>/  index.html, episode.js (shots), worlds.js (sets), captions.js,
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

## Episode 006 at a glance

- **Science.** Rain falls on mountains and rocks and dissolves tiny amounts of
  minerals. Rivers carry these dissolved minerals to the sea, where salts build
  up over a very long time. When sea water evaporates, only the water rises as
  vapour; the salt stays behind, so the sea stays salty. The cross-section
  diagram shows vapour rising to a cloud while salt crystals try to follow and
  fall back.
- **Shots** (timed to the 42.8 s narration; 47.5 s with the logo outro):
  beach hook (Affan tastes the sea) → salt-shaker gag and the crab → magic mini
  submarine → rain on the mountain → minerals leave the rocks → river ride →
  map view with an arrow from mountain to sea → underwater, salt dissolving
  and building up → surface question → evaporation diagram (AIR NAIK ↑,
  GARAM TINGGAL ↓) → recap → beach thumbs-up → logo.
- **Audio.** An original tropical music bed (marimba, steel-pan bells, bass,
  shaker), ducked under the voice. Ambience layers: beach waves, rain, river and
  underwater. Effects: splashes, magic whooshes and sparkles, bubbles, label pops
  and discovery chimes. The mix is normalised to −14 LUFS with a −1.5 dBTP
  ceiling.
