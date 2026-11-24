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

- Use the **real 3D avatars**: the owner's Higgsfield Affan
  (`assets/characters/affan_v2_*`) and the Mama made to match
  (`mama_v2_*`), turned into rigged, textured models by Higgsfield
  "Multi-Image to 3D": `assets/characters/affan_v2.glb` and `mama_v2.glb`.
  Do not replace them with procedural lookalikes (the owner asked for the
  actual avatar).
- At the top of the episode's `episode.js`, before any set is built (so import
  `worlds.js` after it, with a dynamic `await import(...)`):
  `import { useGlbCast } from '../../shared/glbcast.js'; await useGlbCast();`.
  Then `makeAffan()` and `makeMama()` return the GLB rigs (`shared/glbcast.js`)
  with the usual `{ root, parts, pose, toTorso }`. Episodes up to 063 keep the
  original rig (v1). `shared/cast2.js` (procedural v2) is superseded.
- `pose()` takes the v1 parameters. Arms: `reach` targets in the v1 torso frame
  (shoulders at y 0.86; targets above the shoulders are pulled in because the
  GLB head is smaller) or `{ x, z, el }`. Legs `{ x, knee }`. Face: `talk`,
  `wow` (the open mouth is drawn exactly over the painted smile, so it never
  shows two mouths) and `blink` (lid decals); the decals are skinned to the
  same bones as the face. `smile`, `brow`, `look`, `point` and `thumb` have no
  effect (painted face, no finger bones).
- `glbcast.js` fixes two things in the GLBs as they load; keep them: the
  auto-rig's arm weights on the chest and Mama's head weights down the whole
  tudung and baju are moved to the chest bone (`fixWeights`, check with
  `tools/glb-weights`), otherwise raising an arm or turning the head drags the
  clothes sideways; and the models' full-strength emissive map is turned down
  (`GLOW`) so they are shaded by the set's lights instead of looking flat.
  Also on load: `smoothMesh` (smooth shading normals and bone weights; the
  generated meshes are lumpy and tore the sleeves) and `cleanBaju`: Mama's
  generated baju texture is smeared on the sleeves and sides (it looked torn),
  so the baju is re-printed in the shader (reference teal, white flowers,
  plain kain below the hem). Keep these.
- Heights: Affan 3.8 units, Mama 3.3 (sets scale them as before). To seat a
  character on a surface at height h: `root.position.y = h - parts.seatY * scale`
  and pose `POSES.seated`.
- Checks: `tools/glb-cast-test` (poses and face close-ups) and
  `tools/glb-cast-demo` (the Episode 038 kitchen, animated);
  `node tools/render.js tools/glb-cast-test --stills 0,1,2,3,4,5,6,7 --out <dir>`.
