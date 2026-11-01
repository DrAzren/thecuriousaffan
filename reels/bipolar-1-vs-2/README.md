# Beza Bipolar Type 1 vs Type 2 (TikTok reel)

A 9:16 reel (1080×1920, about 102 s) cut from Dr. Azren's raw talking-head
recording `Beza Bipolar 1 dan 2.mp4` (Google Drive, 149 s). It has:

- a tight jump-cut edit;
- motion graphics made with HyperFrames;
- 14 AI-generated B-roll clips from Higgsfield;
- word-by-word captions;
- a fully synthesised sound design.

Final video: `output/Beza_Bipolar_Type1_vs_Type2_TikTok.mp4`

TikTok cover: `output/Beza_Bipolar_Type1_vs_Type2_Thumbnail.png` (and `.jpg`),
1080×1920.

## What was done

### Edit

The raw file is 149 s and the edit is 98.2 s of speech. These were removed:

- **Fillers.** Every "err / hmm / aaa / emm" between sentences is cut. So is
  an "aaa" hidden inside "tapi … dia", and the drawn-out ends of words.
- **Pauses.** Each gap between phrases is squeezed to about 0.12 s, and
  silences inside phrases are trimmed.
- **Retakes and stumbles:**
  - "Tapi bipolar jenis yang mana satu, jenis yang satu"
  - "Okay bipolar type 1,"
  - the first "tak tidur tiga hari"
  - "Dia masih,"
  - the first, abandoned "Dua-dua jenis…"

The cut list in `edit/cuts.json` is generated from:

- word timestamps from faster-whisper `medium` (Malay);
- frame loudness;
- spectral flux, which flags sustained "aaa" sounds.

The script is `edit/cutlist.py`. A second transcription of the cut audio
confirmed that every sentence survives intact.

### A-roll

Each phrase alternates between wide and punched-in framing (×1.0, 1.06, 1.16
or 1.22), so the jump cuts read as camera switches. There is also a slow drift
within each phrase and an impact zoom on 14 keywords.

### Captions

Captions run word by word in Montserrat Black with a heavy stroke, kept inside
the TikTok safe area. The active word pops, and keywords are colour coded:

| Colour | Topic |
|---|---|
| Red | mania / Type 1 |
| Teal | hypomania / Type 2 |
| Blue | depression |
| Green | treatment |

The spelling follows the speech. Captions use "hypomania", as spoken, while the
on-screen graphics use the Malay "HIPOMANIA". The intro line is captioned as
"doktor di Jabatan Psikiatri", which was confirmed with whisper `large-v3`.

### Motion graphics

The graphics are a HyperFrames composition (`project/index.html`, GSAP). In
order of appearance:

1. Hook title "BEZA BIPOLAR 1 VS BIPOLAR 2", a name lower-third, and a viewer
   comment bubble.
2. TYPE 1 / TYPE 2 cards, then full-screen section stingers, with a section
   badge and a progress bar throughout.
3. A "TANDA MANIA" checklist whose items appear on cue: hiperaktif, tak cukup
   tidur, bertenaga, cakap laju, idea mencurah-curah, halusinasi.
4. A BAHAYA warning band and a PERLU MASUK HOSPITAL card.
5. Animated mood graphs for Type 1 (one big mania spike) and Type 2 (small
   hypomania bumps with deep, frequent dips).
6. A rolling RM spend counter, a 0→72 JAM counter, and the "Bakal Perdana
   Menteri!" card.
7. A MANIA vs HIPOMANIA bar chart and the "masih berfungsi" chips.
8. A 1 MINGGU vs 2 MINGGU mood timeline.
9. PERLU RAWATAN and HIPOMANIA ≠ OKEY cards, and the comment CTA.
10. A summary-table end card, designed as a frame worth saving.

### AI B-roll

There are 14 clips from Higgsfield **Wan 3.0** (480p, 2 s, no audio). It was
the cheapest model, at about 1 credit per second. For comparison, Kling 3.0
Turbo costs 4.5 credits for 3 s and Seedance 2.5 costs 12 credits for 4 s.

The total spend was **28 credits**, against a cap of 30. The clips are
upscaled to 1080×1920 at build time and enter with zoom, slide, whip or glitch
transitions plus a flash frame.

| Clip | Shot | Line it covers |
|---|---|---|
| b01 | glowing neural brain | "pernah dengar orang kata dia ada bipolar" |
| b02 | scrolling comments on a phone | "ramai tanya dekat komen" |
| b03 | euphoric dancing at night | "full blown mania" |
| b04 | 03:00 clock, wide awake | "tak tidur malam" |
| b05 | frantic notebook scribbling | "idea mencurah-curah" |
| b06 | surreal melting hallway | "berhalusinasi" |
| b07 | hospital stretcher | "dimasukkan ke hospital" |
| b08 | shopping bags and card tap | "shopping beribu-ribu" |
| b09 | podium and confetti | "Perdana Menteri" |
| b10 | cheerful, productive worker | "rajin buat kerja" |
| b11 | lying in bed in the dark | "tak boleh bangun dari katil" |
| b12 | sitting alone, head in hands | "lebih teruk dan lebih kerap" |
| b13 | doctor consultation | "memerlukan rawatan" |
| b14 | calendar pages flipping | "mod elok seminggu" |

### Sound

`build_audio.py` places 98 SFX cues of 29 types, all synthesised with no
samples:

- whooshes, swooshes and whips;
- impacts, booms and risers;
- pops, bubbles, ticks and dings;
- glitch, alarm and siren;
- coin, cha-ching and clock ticks;
- fanfare, crowd and claps;
- stamp, heartbeat, a down-sweep, a buzzer and a chime.

There is also an original A-minor music bed at 100 bpm, ducked under the
voice. The voice gets a high-pass filter, denoising, EQ and compression. The
mix is normalised to −14 LUFS with a −1.5 dBTP ceiling.

## Thumbnail

`thumbnail/thumbnail.html` is the TikTok cover. It shows Dr. Azren cut out
from the raw footage at 1:15, cleaned with a local `rembg` model at no credit
cost, over a red (Type 1) / teal (Type 2) split. The headline reads
"APA BEZANYA? BIPOLAR 1 VS 2", with MANIA / HIPOMANIA tags and mood-wave lines.

The headline and face sit inside the centre 3:4 area (y 240–1680) that TikTok
shows in the profile grid. To re-export it, render the page at 1080×1920 with
headless Chrome, for example Playwright `page.screenshot`.

## Rebuild

```bash
reels/bipolar-1-vs-2/make.sh "path/to/Beza Bipolar 1 dan 2.mp4"
```

Requirements:

- Python 3 with `numpy`, `scipy` and `faster-whisper`;
- `ffmpeg`;
- Node 18+ with Chrome, for `hyperframes@0.8.225`.

`edit/transcript.json` is reused when it is present, so the cut list is
reproducible. To tweak the edit, change `DROP` / `HARD_CUTS` in
`edit/cutlist.py`. Every graphic, B-roll and SFX cue is anchored to a
transcript word in `build_comp.py`, so everything re-times automatically.

To preview while editing:

```bash
cd reels/bipolar-1-vs-2/project && npx hyperframes snapshot --at 1.4,9.4,30,76.6
```
