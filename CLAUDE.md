# The Curious Affan: working notes

## Posting a new episode (Metricool, brand "The Curious Affan")

- **Description: short only.** Title line, one teaser line, the tagline
  "Little Questions. Big Discoveries!", then hashtags. That is exactly what
  `tools/package.js` writes to `output/description.txt`; post that file as
  the text. Do **not** retell the episode's story, list what Affan learns,
  or add fact/tip bullets, a call to action, or any other extra line.
  (Owner's instruction, Episode 016 onward; reconfirmed at Episode 017 and
  again at Episode 018 for every video posted from now on.) The same short text goes to every
  network.
- Networks: Facebook Reel, Instagram Reel, TikTok, YouTube Short.
- Titles (Facebook / YouTube): `<TAJUK DALAM HURUF BESAR> | THE CURIOUS AFFAN`.
  TikTok title: the short question with one or two emoji.
- YouTube: type `short`, category `EDUCATION`, `madeForKids: false`, tags
  in plain words.
- Media: the rendered MP4 and `output/thumbnail.jpg`, pushed to this public
  repo and referenced by `raw.githubusercontent.com/<owner>/<repo>/<commit>/...`
  URLs (pin the commit SHA, not a branch).
- Timezone for scheduling: Asia/Kuala_Lumpur.

## Narration

- ElevenLabs, voice "Affan Clone", model `eleven_v4`, with emotion tags
  (`[curious]`, `[excited]`, `[trembling voice]`, `[laughs]` ...) where the
  delivery changes.
- Transcribe the chosen take (Scribe) and save it as `audio/words.json`; the
  captions are timed from it.

## Cast (Episode 064 onward)

- Use the **version 2 cast**: call `setCastStyle('v2')` (from `shared/style.js`)
  at the top of the episode's `episode.js`, before any set is built. Then
  `makeAffan()` and `makeMama()` return the v2 rigs from `shared/cast2.js`.
  Episodes up to 063 keep the original rig (v1).
- References: `assets/characters/affan_v2_*` (the owner's Higgsfield avatar)
  and `assets/characters/mama_v2_*` (generated to match). Check new work
  against them; `tools/cast-preview` renders a turnaround
  (`node tools/render.js tools/cast-preview --stills 0,2,3,4,5,6,7,8 --out <dir>`).
- v2 bodies are taller in the legs (Affan's hips at y 1.5, Mama's at 1.95) but
  keep the v1 torso-local frame, so `POSES` and reach targets still work. When
  seating a v2 character, lower the root by the extra hip height.

