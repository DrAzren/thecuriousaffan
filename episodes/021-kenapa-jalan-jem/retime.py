#!/usr/bin/env python3
"""Re-time Episode 021 to a new narration take.

The shots, tags and sound effects are written against a fixed "story" timeline:
the word start times in story_words.json (the script's spelling). When the
narration is re-recorded, this script aligns the new take's word timings (an
ElevenLabs Scribe transcript, words.json) to those story words and writes:

  timing.json  piecewise-linear anchors [story_t, narration_t] plus the new
               duration; episode.js and build_audio.py use it to map story
               time onto narration time, so every shot still lands on its word.
  captions.js  word-timed captions on the new narration, script spelling.

    python3 retime.py path/to/words.json
"""
import difflib
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
OUTRO_STORY = 69.5   # outro starts here on the story timeline
TAIL = 3.0           # outro length


def norm(w):
    w = w.lower()
    w = re.sub(r"[^a-z]", "", w)
    w = re.sub(r"(.)\1+", r"\1", w)  # "papaaa" -> "papa", "waaah" -> "wah"
    return w.replace("afan", "afan").replace("affan", "afan")


def main():
    story = json.load(open(os.path.join(HERE, "story_words.json")))
    raw = json.load(open(sys.argv[1]))
    raw = raw["words"] if isinstance(raw, dict) else raw
    new = [w for w in raw if w.get("type", "word") == "word"]
    a = [norm(w) for w, _ in story]
    b = [norm(w["text"]) for w in new]
    sm = difflib.SequenceMatcher(None, a, b, autojunk=False)
    match = {}
    for blk in sm.get_matching_blocks():
        for k in range(blk.size):
            match[blk.a + k] = blk.b + k
    missing = [story[i][0] for i in range(len(story)) if i not in match]
    print(f"matched {len(match)}/{len(story)} words; unmatched: {missing}")
    # anchors: matched word starts, kept strictly increasing
    # Anchor only on the first word of each phrase (after . , ! ? :), so motion
    # inside a phrase keeps an even speed; cue words still land within a beat.
    anchors = [[0.0, 0.0]]
    for i in sorted(match):
        phrase_start = i == 0 or story[i - 1][0][-1] in ".,!?:"
        if not phrase_start:
            continue
        s, n = story[i][1], new[match[i]]["start"]
        if s > anchors[-1][0] + 0.3 and n > anchors[-1][1] + 0.3:
            anchors.append([round(s, 3), round(n, 3)])
    # the very first word, then add anchors at any word that would still be
    # more than 0.25 s off (drawn-out or rushed words), worst first
    if 0 in match:
        anchors.insert(1, [story[0][1], new[match[0]]["start"]])

    def warp(t, A):
        for (s0, n0), (s1, n1) in zip(A, A[1:]):
            if t <= s1:
                return n0 + (n1 - n0) * (t - s0) / max(1e-6, s1 - s0)
        return A[-1][1] + (t - A[-1][0])

    for _ in range(40):
        worst, wi = 0.25, None
        for i in match:
            d = abs(warp(story[i][1], anchors) - new[match[i]]["start"])
            if d > worst:
                worst, wi = d, i
        if wi is None:
            break
        anchors.append([story[wi][1], new[match[wi]]["start"]])
        anchors.sort()
    anchors = [[round(s, 3), round(n, 3)] for s, n in anchors]
    last_end = new[-1]["end"]
    story_end = OUTRO_STORY - 0.34  # last word end on the story timeline
    anchors.append([story_end, round(last_end, 3)])
    anchors.append([OUTRO_STORY, round(last_end + 0.34, 3)])
    duration = round(anchors[-1][1] + TAIL, 2)
    json.dump({"anchors": anchors, "duration": duration}, open(os.path.join(HERE, "timing.json"), "w"), indent=0)
    print(f"{len(anchors)} anchors, duration {duration}s")

    # captions: story chunking, new word times (unmatched words interpolated)
    def to_new(t):
        for (s0, n0), (s1, n1) in zip(anchors, anchors[1:]):
            if t <= s1:
                return n0 + (n1 - n0) * (t - s0) / max(1e-6, s1 - s0)
        return anchors[-1][1] + (t - anchors[-1][0])

    ends = {}
    for i in range(len(story)):
        if i in match:
            ends[i] = new[match[i]]["end"]
    src = open(os.path.join(HERE, "captions.js")).read()
    head, _, rest = src.partition("export const CAPTIONS = [\n")
    body, _, tail = rest.partition("\n];")
    chunks = re.findall(r"\[([0-9.]+), (.*)\],", body)
    out, wi = [], 0
    for end_old, words in chunks:
        ws = re.findall(r"\['([^']+)', ([0-9.]+)\]", words)
        items = []
        for w, _ in ws:
            t = new[match[wi]]["start"] if wi in match else to_new(story[wi][1])
            items.append((w, round(t, 2)))
            last = wi
            wi += 1
        out.append([float(end_old), items, last])
    lines = []
    for k, (end_old, items, last) in enumerate(out):
        nxt = out[k + 1][1][0][1] if k + 1 < len(out) else 1e9
        end = ends.get(last, to_new(end_old)) + 0.15
        end = round(min(end, nxt - 0.02), 2)
        lines.append("  [%s, %s]," % (end, ", ".join("['%s', %s]" % it for it in items)))
    head = head.replace("timed\n// to the narration (word start times measured from audio/narration.mp3).",
                        "timed\n// to the narration (word start times measured from audio/narration.mp3, see retime.py).")
    open(os.path.join(HERE, "captions.js"), "w").write(head + "export const CAPTIONS = [\n" + "\n".join(lines) + "\n];" + tail)
    print("wrote timing.json and captions.js")


if __name__ == "__main__":
    main()
