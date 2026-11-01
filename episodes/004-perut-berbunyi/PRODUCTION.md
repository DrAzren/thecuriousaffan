# E004 — Kenapa Perut Kita Berbunyi Bila Lapar?

The final video is `output/TheCuriousAffan_E004_Kenapa_Perut_Kita_Berbunyi_Bila_Lapar.mp4`:

- 9:16, 1080 × 1920, 30 fps.
- 49.0 s long.
- H.264 video with AAC 48 kHz audio.
- Audio normalised to −14 LUFS with a −1.5 dBTP ceiling.

Everything is rendered from code: the 3D sets, the Affan rig shared with E005, the motion graphics, the captions and the soundtrack. Rebuild it with `make.sh`.

## Narration

- **File:** `audio/narration.mp3`, the supplied recording, used unedited. It is 43.65 s long.
- **Placement:** it starts 0.6 s into the video, which gives a short silent beat of Affan playing before the first rumble.
- **Pauses:** none is longer than 0.6 s, so nothing was trimmed and no words were cut.
- **Timing:** word timings come from speech alignment (see `audio/words_asr.json`).

**Note:** the supplied file is named `…Affan_Clone_ivc…`, which marks it as an ElevenLabs Instant Voice Clone. The brief allows only original authorised recordings for Affan's voice and rules out voice clones of a real child. Before publishing, confirm this recording is cleared. If not, replace `audio/narration.mp3` with a genuine Affan take or a permitted adult placeholder voice. Then update the word times in `captions.js` and the shot boundaries in `episode.js`, because both are timed to this file.

### Spoken script (caption text, no delivery tags)

> Kruuukkk! Eh, bunyi apa tu? Ada monster ke dalam perut Affan ni?
> Jom, kita pergi tengok. Wah, Affan dah jadi kecil. Besarnya perut ni.
> Shhh, korang dengar tak? Kruuukkk, kruuukkk.
> Oh, rupa-rupanya otot dalam perut dan usus kita bergerak macam ombak.
> Bila otot bergerak, gas dan cecair dalam perut serta usus pun bergerak sekali.
> Sebab itulah keluar bunyi kruuukkk. Oh, jadi bukan monsterlah.
> Tapi tahu tak, perut berbunyi bukan semestinya sebab lapar tau. Lepas makan pun boleh jadi.
> Ha, sekarang korang dah tahu. Apa lagi Affan nak siasat lepas ni?

## Storyboard as built

Times are video seconds. Narration time is video time minus 0.6.

| Video time | Scene | Picture | On-screen graphics |
|---|---|---|---|
| 0.0–6.2 | 1 Living room | Affan stacks a letter block. His tummy rumbles, he jumps and grabs his tummy, looks down, then imagines a monster. | KRUUUKKK!, rumble lines, "KENAPA PERUT BERBUNYI?" with EPISOD 4, a thought bubble with a cute monster and "?" |
| 6.2–7.7 | 2 Gadget | He holds up the shrinking gadget and presses the star button. Sparkle swirl, then a flash. | — |
| 7.7–10.4 | 2 Tiny Affan | Affan, now tiny, stands among giant toy blocks. A portal opens. | KECIL! |
| 10.4–12.4 | 3 Learning world | The camera cranes up from Affan on the platform to reveal the giant model: oesophagus, stomach, small and large intestine. | BESARNYA! |
| 12.4–14.6 | 3 Listening | Affan says "Shhh", then cups his ear. | SHHH…, sound rings |
| 14.6–16.4 | 3 Rumble | The stomach wobbles, sound waves radiate and Affan jumps. | KRUUUKKK! twice |
| 16.4–20.5 | 4 Peristalsis (model) | Contraction waves run along the stomach and intestines while Affan points. | OTOT BERGERAK, PERUT and USUS pins |
| 20.5–23.5 | 4 Peristalsis (close-up) | Cut-away intestine section. Rings of muscle squeeze in a wave from top to bottom. | OTOT BERGERAK, wave arrow, MACAM OMBAK, OTOT pin |
| 23.5–27.0 | 5 Gas + liquid | Gas bubbles and liquid are pushed along by the squeeze. | GAS and CECAIR pins, GAS + CECAIR banner, motion chevrons |
| 27.0–29.7 | 5 The sound | Sound rings radiate from the squeeze point. | BUNYI PERUT, KRUUUKKK! |
| 29.7–33.2 | 6 Not a monster | The imaginary monster silhouette over the model poofs into sparkles and is replaced by the discovery chain. | BUKAN MONSTER!, cross, OTOT BERGERAK → GAS + CECAIR → BUNYI PERUT |
| 33.2–39.7 | 7 Home | Back to normal size. Affan raises a finger ("tahu tak?"), touches his tummy, wags his finger, then rubs his tummy. | TAHU TAK?, BUNYI PERUT, cards: LAPAR ✓ and LEPAS MAKAN ✓ |
| 39.7–44.05 | 7 Wrap-up | Thumbs-up with a recap, then a thinking pose with question marks. | Recap chain, "?" icons |
| 44.05–49.0 | Outro | Branded stage with Affan giving a thumbs-up. | THE CURIOUS AFFAN logo, "Little Questions. Big Discoveries!", jingle |

## Science check

- **Peristalsis.** The stomach and intestine walls are muscle. Rings of muscle contract and relax in a travelling wave that moves contents along. This is shown on the full model and in a cut-away close-up, with circular-muscle bands, a wave arrow and the "macam ombak" analogy.
- **Where the sound comes from.** Gas and liquid squeezed through the gut make the gurgling. The scientific term is *borborygmi*; it is not shown on screen because the audience is 5–12. The close-up shows white gas bubbles and cyan liquid being pushed by the squeeze, and the sound rings start from the squeeze point.
- **Not only hunger.** Rumbling can happen when hungry, when the empty stomach and intestines keep up housekeeping contractions, or after eating, during digestion. The two cards show this. Neither claims that rumbling always means hunger.
- **Anatomy.** The order and placement are plausible and simplified:
  - oesophagus into a J-shaped stomach on the body's left;
  - pylorus into the duodenum, then small-intestine coils;
  - the large intestine framing them (ascending, transverse below the stomach, then descending).
- **Child-friendly look.** Organs are glossy peach and pink with soft rim light. There is no blood and nothing graphic.
- **No real monster.** The monster only appears in Affan's thought bubble and as an imaginary silhouette that is explicitly debunked.

## Sound design

All sound is synthesised in `build_audio.py`, with no samples and no licensed music.

- **Rumbles:** cartoon tummy rumbles (a wobbly low growl ending in a bloop) and bubbly gurgles.
- **Learning world:** soft bubble ambience.
- **Peristalsis:** a gentle swell for each contraction wave.
- **Shrinking:** gadget beeps, a sparkle and a downward slide whistle for shrinking, then an upward slide whistle when Affan grows back.
- **Discovery:** a happy realisation chime.
- **Outro:** an original jingle.
- **Music:** a bouncy marimba bed at home and a curious music box with a pad in the learning world, ducked about 7 dB under the voice.
- **Safety:** no loud, harsh or scary sounds, and no fast flashing (the flashes are single soft fades of 0.2–0.4 s).

## Higgsfield and HyperFrames

- **HyperFrames:** its cloud `compose` and `render_video` tools are disabled for CLI agents. All HyperFrames-style overlays (keywords, waves, bubbles, sound rings, diagrams, captions) were built as code in the overlay layer instead, which is the same approach as E005.
- **Higgsfield:** not used. No official Affan reference image was supplied in this session, and generating without one would break the identity-consistency requirement.

If you want AI-generated plates later, here are per-scene prompts. Attach the official Affan reference image to every shot, generate each shot separately at 9:16, and with no text in frame; the graphics stay in the overlay layer.

1. *Cozy sunlit Malaysian living room, 3D family-animation style. A five-year-old boy with neat black hair, dark rectangular glasses, a peach T-shirt and a navy jacket with white and peach stripes stacks colourful letter blocks on a round cyan rug. He freezes, holds his tummy, and looks down surprised. Warm soft light, shallow depth of field, gentle camera push-in.*
2. *Same boy holds up a small rounded cyan gadget with a glowing yellow star button and presses it. Sparkles swirl around him. Magical, friendly.*
3. *Tiny version of the same boy, toy-sized, standing on a rug among giant letter blocks. Low camera at floor level, wonder expression.*
4. *A dreamy science learning world: a floating white observation platform with yellow railings beside a giant glossy, friendly, simplified model of a stomach and intestines in peach and pink, with cyan hologram rings and soft floating light motes. The boy stands on the platform, arms open in awe. The camera cranes up.*
5. *Macro cut-away of a pink intestine section running top to bottom. Rings of muscle gently squeeze in a travelling wave and push white gas bubbles and cyan liquid along. Clean, educational, non-graphic.*
6. *Back in the living room, the same boy smiles, gives a thumbs-up, then strikes a thinking pose.*

## Quality checks

| Check | Status |
|---|---|
| Duration ≤ 60 s | 49.0 s. The 55–59 s target would need a longer recording; the narration was not stretched or padded with dead air. |
| Affan identity and outfit consistent | One shared rig (`shared/affan.js`) is used in every shot. |
| Narration complete and audible | Every word is present. The voice sits about 10–15 dB above the music in every section. |
| Visuals follow the dialogue | Shot boundaries follow the word timings. |
| Science accurate, no real monster, no graphic anatomy | Yes, see the science check above. |
| Captions free of emotional tags, correct spelling | Captions use the spoken words only. "Kruuukkk" is spelled to match the keyword graphic, and "monsterlah" follows standard Malay for the -lah particle. |
| Mix balanced, no harsh sounds or flashing | −14 LUFS, −1.5 dBTP. |
| Branding | THE CURIOUS AFFAN |
