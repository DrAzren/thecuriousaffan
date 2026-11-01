#!/usr/bin/env python3
"""Build the HyperFrames composition (index.html) and the SFX cue sheet (cues.json)
for the reel "Beza Bipolar Type 1 vs Type 2".

Every graphic, B-roll cut and sound effect is anchored to a word in the edited
transcript (words_out.json), so re-cutting the A-roll re-times everything.

    python3 build_comp.py <words_out.json> <project_dir>
"""
import json
import sys
from html import escape

WORDS = json.load(open(sys.argv[1]))
PROJ = sys.argv[2]
SPEECH_END = WORDS[-1]["e"]
END_CARD_AT = round(SPEECH_END - 0.25, 2)
TOTAL = round(SPEECH_END + 3.6, 2)

RED, ORANGE, TEAL, VIOLET, BLUE, YELLOW, GREEN = "#FF3B5C", "#FF8A3D", "#19E3C8", "#8B6CFF", "#3E7BFF", "#FFD84D", "#3EE07A"


def at(word, near):
    """Start time of the transcript word `word` closest to `near` seconds."""
    best = None
    for w in WORDS:
        if w["t"].lower().strip(",.?") == word.lower().strip(",.?"):
            if best is None or abs(w["s"] - near) < abs(best["s"] - near):
                best = w
    if best is None or abs(best["s"] - near) > 3:
        raise SystemExit(f"cue word not found: {word} ~{near}")
    return round(best["s"], 3)


def end_of(word, near):
    for w in WORDS:
        if w["t"].lower().strip(",.?") == word.lower().strip(",.?") and abs(w["s"] - near) < 3:
            return round(w["e"], 3)
    raise SystemExit(f"cue word not found: {word} ~{near}")


SFX = []  # (time, name, gain)


def sfx(t, name, gain=1.0):
    SFX.append({"t": round(t, 3), "name": name, "gain": gain})


html = []  # element markup
js = []  # gsap timeline lines


def el(markup):
    html.append(markup)


def tl(line):
    js.append(line)


# --------------------------------------------------------------- A-roll + zoom
# Hard "camera switch" on every phrase (alternating wide / punch-in), slow drift
# inside a phrase, and quick impact zooms on keywords.
phrases = []
cur = [WORDS[0]]
for w in WORDS[1:]:
    if w["s"] - cur[-1]["e"] > 0.10 or cur[-1]["t"][-1] in ".?":
        phrases.append(cur)
        cur = [w]
    else:
        cur.append(w)
phrases.append(cur)

zoom_levels = [1.0, 1.16, 1.06, 1.22]
for i, ph in enumerate(phrases):
    s = 0 if i == 0 else ph[0]["s"] - 0.04
    e = phrases[i + 1][0]["s"] - 0.04 if i + 1 < len(phrases) else SPEECH_END + 0.4
    z = zoom_levels[i % len(zoom_levels)]
    x = [0, -18, 14, -10][i % 4]
    tl(f'tl.set("#aroll",{{scale:{z},x:{x}}},{s:.3f});')
    tl(f'tl.to("#aroll",{{scale:{z + 0.035:.3f},duration:{max(e - s, 0.1):.3f},ease:"none"}},{s:.3f});')

IMPACT = [("bipolar.", 6.4), ("mania", 19.5), ("hiperaktif,", 25.1), ("bahaya", 42.9), ("hospital.", 45.2),
          ("beribu-ribu,", 52.2), ("Menteri", 57.9), ("hypomania.", 63.5), ("kemurungan", 76.3), ("teruk", 78.4),
          ("down,", 86.2), ("rawatan.", 91.4), ("okey", 93.5), ("berat", 95.5)]
for wd, n in IMPACT:
    t = at(wd, n)
    tl(f'tl.fromTo("#arollPunch",{{scale:1.09}},{{scale:1,duration:0.45,ease:"expo.out"}},{t:.3f});')

el(f'''<div id="arollPunch" class="layer"><video id="aroll" class="clip full" src="assets/aroll.mp4"
  data-start="0" data-duration="{SPEECH_END + 0.4:.2f}" data-track-index="0" muted playsinline></video></div>''')

# --------------------------------------------------------------- B-roll
BROLL = [  # file, anchor word, near, offset, transition, label
    ("b02", "ramai", 3.3, -0.06, "slide", None, 1.28),
    ("b01", "Pernah", 4.6, -0.04, "zoom", None),
    ("b03", "full", 21.7, -0.95, "whip", "FULL-BLOWN MANIA"),
    ("b04", "tak", 29.3, -0.1, "zoom", None),
    ("b05", "idea", 39.3, -0.05, "slide", None),
    ("b06", "berhalusinasi,", 41.5, -0.16, "glitch", None, 1.5),
    ("b07", "perlu", 43.7, -0.0, "whip", None),
    ("b08", "pergi", 51.2, -0.05, "zoom", None),
    ("b09", "Perdana", 57.6, -0.6, "whip", None),
    ("b10", "seseorang", 81.5, -0.1, "slide", "RAJIN BUAT KERJA"),
    ("b14", "Mod", 83.9, -0.05, "zoom", None),
    ("b11", "tak", 86.7, -0.05, "zoom", None),
    ("b12", "Kemurungan", 77.2, -0.05, "slide", None),
    ("b13", "Dua-dua", 89.5, 0.3, "whip", None),
]
BROLL_WIN = []
for i, item in enumerate(BROLL):
    f, wd, n, off, tr, label = item[:6]
    d = item[6] if len(item) > 6 else 2.0
    s = round(at(wd, n) + off, 3)
    BROLL_WIN.append((s, s + d))
    vid = f"br{i}"
    el(f'<video id="{vid}" class="clip full broll" src="assets/broll/{f}.mp4" data-start="{s}" data-duration="{d}" data-track-index="1" muted playsinline></video>')
    if tr == "zoom":
        tl(f'tl.fromTo("#{vid}",{{scale:1.35,opacity:0}},{{scale:1.05,opacity:1,duration:0.35,ease:"expo.out"}},{s});')
        tl(f'tl.to("#{vid}",{{scale:1.0,duration:{d - 0.35},ease:"none"}},{s + 0.35});')
        sfx(s - 0.12, "whoosh", 0.55)
    elif tr == "slide":
        tl(f'tl.fromTo("#{vid}",{{x:1080}},{{x:0,duration:0.32,ease:"power4.out"}},{s});')
        tl(f'tl.fromTo("#{vid}",{{scale:1.12}},{{scale:1.0,duration:{d},ease:"none"}},{s});')
        sfx(s - 0.15, "swoosh", 0.6)
    elif tr == "whip":
        tl(f'tl.fromTo("#{vid}",{{y:-1920,rotation:-4}},{{y:0,rotation:0,duration:0.3,ease:"power4.out"}},{s});')
        tl(f'tl.fromTo("#{vid}",{{scale:1.1}},{{scale:1.0,duration:{d},ease:"none"}},{s});')
        sfx(s - 0.12, "whip", 0.7)
    elif tr == "glitch":
        for k, (dx, dt) in enumerate([(40, 0), (-60, .05), (30, .1), (-20, .16), (0, .22), (55, .9), (-35, .95), (0, 1.0)]):
            tl(f'tl.set("#{vid}",{{x:{dx},skewX:{dx / 6:.1f}}},{s + dt:.3f});')
        sfx(s, "glitch", 0.8)
    el(f'<div id="{vid}f" class="clip full flash" data-start="{s}" data-duration="0.2" data-track-index="2"></div>')
    tl(f'tl.fromTo("#{vid}f",{{opacity:0.75}},{{opacity:0,duration:0.18}},{s});')
    if label:
        el(f'<div id="{vid}l" class="clip brollLabel" data-start="{s + 0.15:.3f}" data-duration="{d - 0.2:.2f}" data-track-index="5"><span>{escape(label)}</span></div>')
        tl(f'tl.fromTo("#{vid}l span",{{y:60,opacity:0,scale:0.8}},{{y:0,opacity:1,scale:1,duration:0.35,ease:"back.out(2.4)"}},{s + 0.15:.3f});')
        sfx(s + 0.15, "pop", 0.5)

# --------------------------------------------------------------- captions
def broll_active(t):
    return any(a <= t < b for a, b in BROLL_WIN)


KEYWORDS = {"bipolar": YELLOW, "mania": RED, "penuh.": RED, "hiperaktif,": ORANGE, "tidur.": ORANGE, "tidur": ORANGE,
            "hospital.": RED, "bahaya": RED, "berhalusinasi,": VIOLET, "kemurungan": BLUE, "kemurungan.": BLUE,
            "hypomania.": TEAL, "hypomania": TEAL, "ringan": TEAL, "teruk": BLUE, "kerap": BLUE, "rawatan.": GREEN,
            "shopping": YELLOW, "beribu-ribu,": YELLOW, "berat": BLUE, "down,": BLUE, "1": RED, "2": TEAL,
            "1.": RED, "2.": TEAL, "laju,": ORANGE, "mencurah-curah,": ORANGE}
chunks = []
cur = []
for w in WORDS:
    cur.append(w)
    txt = " ".join(x["t"] for x in cur)
    if w["t"][-1] in ",.?" or len(cur) >= 3 or len(txt) > 16:
        chunks.append(cur)
        cur = []
if cur:
    chunks.append(cur)

for ci, ch in enumerate(chunks):
    s = ch[0]["s"] - 0.03
    nxt = chunks[ci + 1][0]["s"] - 0.03 if ci + 1 < len(chunks) else ch[-1]["e"] + 0.4
    e = min(nxt, ch[-1]["e"] + 0.45)
    if ci + 1 < len(chunks):
        e = nxt if nxt - ch[-1]["e"] < 0.6 else e
    cid = f"cap{ci}"
    spans = []
    for wi, w in enumerate(ch):
        t = w["t"].replace("Dr", "Dr.") if w["t"] == "Dr" else w["t"]
        spans.append(f'<span class="w" id="{cid}w{wi}">{escape(t)}</span>')
    el(f'<div id="{cid}" class="clip cap" data-start="{s:.3f}" data-duration="{e - s:.3f}" data-track-index="9"><div class="capin">{" ".join(spans)}</div></div>')
    tl(f'tl.fromTo("#{cid} .capin",{{scale:0.7,y:30,opacity:0}},{{scale:1,y:0,opacity:1,duration:0.16,ease:"back.out(3)"}},{s:.3f});')
    for wi, w in enumerate(ch):
        key = w["t"].lower()
        col = KEYWORDS.get(key, YELLOW)
        wend = ch[wi + 1]["s"] if wi + 1 < len(ch) else e
        tl(f'tl.set("#{cid}w{wi}",{{color:"{col}",scale:1.13}},{w["s"]:.3f});')
        if key not in KEYWORDS:
            tl(f'tl.set("#{cid}w{wi}",{{color:"#ffffff",scale:1}},{wend:.3f});')
        else:
            tl(f'tl.set("#{cid}w{wi}",{{scale:1}},{wend:.3f});')

# --------------------------------------------------------------- persistent UI
el(f'<div id="progress" class="clip" data-start="0" data-duration="{TOTAL}" data-track-index="12"><div id="progressFill"></div></div>')
tl(f'tl.fromTo("#progressFill",{{scaleX:0}},{{scaleX:1,duration:{TOTAL},ease:"none"}},0);')

t1, t2, tr_ = at("bipolar", 14.1), at("Kalau", 60.4), at("Dua-dua", 89.5)
for bid, s, e, col, txt in [("badge1", t1 + 0.9, t2 - 0.1, RED, "BIPOLAR TYPE 1"),
                            ("badge2", t2 + 0.9, tr_ - 0.1, TEAL, "BIPOLAR TYPE 2"),
                            ("badge3", tr_ + 0.1, END_CARD_AT, GREEN, "RAWATAN")]:
    el(f'<div id="{bid}" class="clip badge" data-start="{s:.3f}" data-duration="{e - s:.3f}" data-track-index="11" style="--c:{col}"><i></i>{txt}</div>')
    tl(f'tl.fromTo("#{bid}",{{x:-420}},{{x:0,duration:0.45,ease:"expo.out"}},{s:.3f});')
    sfx(s, "tick", 0.5)

# --------------------------------------------------------------- HOOK (0-3.2)
el('''<div id="hook" class="clip" data-start="0" data-duration="3.3" data-track-index="6">
  <div id="hookTop">BEZA</div>
  <div id="hookRow"><div class="hk hk1">BIPOLAR<b>1</b></div><div id="hookVs">VS</div><div class="hk hk2">BIPOLAR<b>2</b></div></div>
  <div id="hookSub">Apa bezanya sebenarnya?</div>
</div>''')
tl('tl.fromTo("#hookTop",{scale:3,opacity:0},{scale:1,opacity:1,duration:0.35,ease:"expo.out"},0.05);')
tl('tl.fromTo(".hk1",{x:-900,rotation:-8},{x:0,rotation:-3,duration:0.45,ease:"back.out(1.6)"},0.25);')
tl('tl.fromTo(".hk2",{x:900,rotation:8},{x:0,rotation:3,duration:0.45,ease:"back.out(1.6)"},0.45);')
tl('tl.fromTo("#hookVs",{scale:0,rotation:-180},{scale:1,rotation:0,duration:0.5,ease:"back.out(2.5)"},0.75);')
tl('tl.fromTo("#hookSub",{y:40,opacity:0},{y:0,opacity:1,duration:0.4,ease:"power3.out"},1.1);')
tl('tl.to("#hookRow",{y:-12,duration:0.08,yoyo:true,repeat:5,ease:"none"},0.75);')
tl('tl.to("#hook",{y:-1200,duration:0.35,ease:"power3.in"},2.95);')
sfx(0.0, "riser_short", 0.6)
sfx(0.05, "impact", 0.9)
sfx(0.25, "whoosh", 0.6)
sfx(0.45, "whoosh", 0.6)
sfx(0.75, "boom", 0.8)
sfx(1.1, "pop", 0.5)
sfx(2.95, "swoosh", 0.5)

el('''<div id="lower3" class="clip" data-start="0.7" data-duration="2.6" data-track-index="7">
  <div class="l3bar"></div><div class="l3name">Dr. Azren</div><div class="l3role">Jabatan Psikiatri</div></div>''')
tl('tl.fromTo("#lower3 .l3bar",{scaleY:0},{scaleY:1,duration:0.3,ease:"expo.out"},0.7);')
tl('tl.fromTo("#lower3 .l3name",{x:-500,opacity:0},{x:0,opacity:1,duration:0.4,ease:"expo.out"},0.8);')
tl('tl.fromTo("#lower3 .l3role",{x:-500,opacity:0},{x:0,opacity:1,duration:0.4,ease:"expo.out"},0.92);')
tl('tl.to("#lower3",{x:-900,duration:0.3,ease:"power3.in"},3.0);')
sfx(0.8, "tick", 0.4)

# comment bubble during "ramai tanya dekat komen"
c0 = at("ramai", 3.3)
el(f'''<div id="cmt" class="clip" data-start="{c0 + 0.1:.3f}" data-duration="1.25" data-track-index="7">
  <div class="cmtAv"></div><div><div class="cmtName">@pengikut</div><div class="cmtTxt">Doktor, bipolar 1 dengan 2 apa beza?</div></div></div>''')
tl(f'tl.fromTo("#cmt",{{scale:0,opacity:0}},{{scale:1,opacity:1,duration:0.35,ease:"back.out(2.2)"}},{c0 + 0.1:.3f});')
sfx(c0 + 0.1, "bubble", 0.7)

# ----------------------------------------------------- TYPE 1 vs TYPE 2 cards
ta, tb = at("type", 8.5), at("type", 9.2)
q_end = at("bipolar", 14.1) - 0.05
el(f'''<div id="vsCards" class="clip" data-start="{ta - 0.05:.3f}" data-duration="{q_end - ta + 0.05:.3f}" data-track-index="6">
  <div class="vc vc1"><small>BIPOLAR</small>TYPE 1</div><div class="vc vc2"><small>BIPOLAR</small>TYPE 2</div><div id="vcQ">?</div></div>''')
tl(f'tl.fromTo(".vc1",{{x:-700,rotation:-20}},{{x:0,rotation:-4,duration:0.4,ease:"back.out(1.8)"}},{ta:.3f});')
tl(f'tl.fromTo(".vc2",{{x:700,rotation:20}},{{x:0,rotation:4,duration:0.4,ease:"back.out(1.8)"}},{tb:.3f});')
tl(f'tl.fromTo("#vcQ",{{scale:0}},{{scale:1,duration:0.45,ease:"elastic.out(1,0.4)"}},{tb + 0.35:.3f});')
tl(f'tl.to("#vcQ",{{scale:0,duration:0.2}},{at("Jadi", 9.9):.3f});')
tl(f'tl.to(".vc1",{{x:-60,scale:0.8,duration:0.5,ease:"power3.inOut"}},{at("perbezaan", 10.8):.3f});')
tl(f'tl.to(".vc2",{{x:60,scale:0.8,duration:0.5,ease:"power3.inOut"}},{at("perbezaan", 10.8):.3f});')
tl(f'tl.to(".vc1",{{y:-40,duration:0.12,yoyo:true,repeat:1}},{at("1", 12.7):.3f});')
tl(f'tl.to(".vc2",{{y:-40,duration:0.12,yoyo:true,repeat:1}},{at("2.", 13.6):.3f});')
tl(f'tl.to("#vsCards",{{opacity:0,scale:1.4,duration:0.2}},{q_end - 0.2:.3f});')
sfx(ta, "whoosh", 0.6)
sfx(tb, "whoosh", 0.6)
sfx(tb + 0.35, "boing", 0.5)
sfx(at("1", 12.7), "pop", 0.45)
sfx(at("2.", 13.6), "pop", 0.45)


# --------------------------------------------------------------- stingers
def stinger(sid, t, col, col2, small, big):
    el(f'''<div id="{sid}" class="clip stinger" data-start="{t:.3f}" data-duration="1.25" data-track-index="10">
      <div class="stA" style="background:{col}"></div><div class="stB" style="background:{col2}"></div>
      <div class="stTxt"><small>{small}</small>{big}</div></div>''')
    tl(f'tl.fromTo("#{sid} .stA",{{x:-1300}},{{x:0,duration:0.28,ease:"expo.out"}},{t:.3f});')
    tl(f'tl.fromTo("#{sid} .stB",{{x:1300}},{{x:0,duration:0.32,ease:"expo.out"}},{t + 0.06:.3f});')
    tl(f'tl.fromTo("#{sid} .stTxt",{{scale:2.6,opacity:0}},{{scale:1,opacity:1,duration:0.35,ease:"expo.out"}},{t + 0.12:.3f});')
    tl(f'tl.to("#{sid} .stTxt",{{scale:1.08,duration:0.6,ease:"none"}},{t + 0.47:.3f});')
    tl(f'tl.to("#{sid} .stA",{{y:-2000,duration:0.3,ease:"power3.in"}},{t + 0.95:.3f});')
    tl(f'tl.to("#{sid} .stB",{{y:2000,duration:0.3,ease:"power3.in"}},{t + 0.95:.3f});')
    tl(f'tl.to("#{sid} .stTxt",{{opacity:0,scale:0.6,duration:0.2}},{t + 0.95:.3f});')
    sfx(t - 0.45, "riser", 0.6)
    sfx(t + 0.1, "impact", 1.0)
    sfx(t + 0.95, "whoosh", 0.6)


stinger("st1", t1 - 0.02, RED, ORANGE, "BIPOLAR", "TYPE 1")
stinger("st2", t2 - 0.02, TEAL, VIOLET, "BIPOLAR", "TYPE 2")


# --------------------------------------------------------------- keyword slams
def slam(kid, t, text, col, dur=1.6, sub=None, sound="impact", y=560, size=150):
    subh = f'<div class="slamSub">{escape(sub)}</div>' if sub else ""
    el(f'<div id="{kid}" class="clip slam" data-start="{t:.3f}" data-duration="{dur}" data-track-index="8" style="--c:{col};top:{y}px"><div class="slamT" style="font-size:{size}px">{escape(text)}</div>{subh}</div>')
    tl(f'tl.fromTo("#{kid} .slamT",{{scale:3.2,opacity:0,rotation:-6}},{{scale:1,opacity:1,rotation:-3,duration:0.28,ease:"expo.out"}},{t:.3f});')
    tl(f'tl.to("#{kid}",{{x:14,duration:0.04,yoyo:true,repeat:5}},{t + 0.26:.3f});')
    if sub:
        tl(f'tl.fromTo("#{kid} .slamSub",{{y:30,opacity:0}},{{y:0,opacity:1,duration:0.3,ease:"power3.out"}},{t + 0.3:.3f});')
    tl(f'tl.to("#{kid}",{{opacity:0,scale:0.85,duration:0.2}},{t + dur - 0.2:.3f});')
    sfx(t, sound, 0.9)


slam("kwMania", at("mania", 19.5), "MANIA PENUH", RED, 1.3, "episod mania sepenuhnya")
slam("kwHypo", at("hypomania.", 63.5), "HIPOMANIA", TEAL, 1.15, "versi lebih ringan", sound="impact")
slam("kwKem", at("kemurungan", 76.3), "KEMURUNGAN", BLUE, 0.95, None, sound="boom")
slam("kwOk", at("okey", 93.5), "HIPOMANIA ≠ OKEY", RED, 1.9, "kemurungan boleh jadi sangat berat", sound="buzz", size=112)
sfx(at("berat", 95.5), "boom", 0.7)

# ------------------------------------------------------ symptom checklist (type 1)
ICONS = {
    "bolt": '<path d="M13 2L4 14h7l-1 8 10-12h-7z"/>',
    "moon": '<path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.6 6.6 0 0 0 10.5 10.5z"/>',
    "batt": '<rect x="2" y="7" width="17" height="10" rx="2"/><path d="M22 10v4"/><path d="M6 10v4M10 10v4M14 10v4"/>',
    "talk": '<path d="M4 4h16v11H9l-5 4z"/><path d="M8 9h8M8 12h5"/>',
    "bulb": '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/>',
    "eye": '<path d="M1.5 12S5.5 5 12 5s10.5 7 10.5 7-4 7-10.5 7S1.5 12 1.5 12z"/><circle cx="12" cy="12" r="3"/>',
    "check": '<path d="M4 12l5 5L20 6"/>',
}


def icon(name, col="#fff"):
    return f'<svg viewBox="0 0 24 24" fill="none" stroke="{col}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">{ICONS[name]}</svg>'


cl_items = [("bolt", "Hiperaktif", at("hiperaktif,", 25.1)), ("moon", "Tak cukup tidur", at("cukup", 26.4)),
            ("batt", "Masih bertenaga", at("bertenaga", 31.2)), ("talk", "Cakap laju", at("laju,", 38.7)),
            ("bulb", "Idea mencurah-curah", at("mencurah-curah,", 39.8)), ("eye", "Halusinasi", at("berhalusinasi,", 41.5))]
cl_s, cl_e = at("Di mana", 23.1), at("boleh", 42.3) - 0.05
items = "".join(f'<div class="cli" id="cli{i}">{icon(ic, RED if ic == "eye" else ORANGE)}<span>{escape(tx)}</span></div>' for i, (ic, tx, _) in enumerate(cl_items))
el(f'<div id="checklist" class="clip" data-start="{cl_s:.3f}" data-duration="{cl_e - cl_s:.3f}" data-track-index="8"><div class="clHead">TANDA MANIA</div>{items}</div>')
tl(f'tl.fromTo("#checklist",{{x:-700}},{{x:0,duration:0.45,ease:"expo.out"}},{cl_s:.3f});')
sfx(cl_s, "swoosh", 0.5)
for i, (_, _, t) in enumerate(cl_items):
    tl(f'tl.fromTo("#cli{i}",{{x:-300,opacity:0,scale:0.6}},{{x:0,opacity:1,scale:1,duration:0.35,ease:"back.out(2.4)"}},{t:.3f});')
    tl(f'tl.fromTo("#cli{i} svg",{{rotation:-90,scale:0}},{{rotation:0,scale:1,duration:0.4,ease:"back.out(3)"}},{t + 0.05:.3f});')
    sfx(t, "ding" if i % 2 == 0 else "pop", 0.55)
tl(f'tl.to("#checklist",{{x:-800,duration:0.3,ease:"power3.in"}},{cl_e - 0.3:.3f});')

# ------------------------------------------------------ danger / hospital
d0 = at("bahaya", 42.9)
el(f'<div id="danger" class="clip" data-start="{d0 - 0.05:.3f}" data-duration="{at("perlu", 43.7) - d0 + 0.05:.3f}" data-track-index="8"><div class="dgStripe"></div><div class="dgTxt">⚠ BAHAYA</div></div>')
tl(f'tl.fromTo("#danger .dgTxt",{{scale:2.5,opacity:0}},{{scale:1,opacity:1,duration:0.25,ease:"expo.out"}},{d0 - 0.05:.3f});')
tl(f'tl.fromTo("#danger .dgStripe",{{x:-200}},{{x:0,duration:0.8,ease:"none"}},{d0 - 0.05:.3f});')
sfx(d0 - 0.05, "alarm", 0.6)
h0 = at("perlu", 43.7)
el(f'<div id="hosp" class="clip" data-start="{h0 + 0.2:.3f}" data-duration="1.8" data-track-index="8"><div class="hospCross">+</div><div class="hospTxt">PERLU MASUK<br>HOSPITAL</div></div>')
tl(f'tl.fromTo("#hosp",{{scale:0,rotation:-10}},{{scale:1,rotation:0,duration:0.4,ease:"back.out(2)"}},{h0 + 0.2:.3f});')
tl(f'tl.fromTo("#hosp .hospCross",{{rotation:-180}},{{rotation:0,duration:0.5,ease:"back.out(2)"}},{h0 + 0.25:.3f});')
sfx(h0 + 0.1, "siren", 0.45)


# ------------------------------------------------------ mood graphs
def polyline(points):
    import math
    L = sum(math.dist(points[i], points[i + 1]) for i in range(len(points) - 1))
    return " ".join(f"{x:.0f},{y:.0f}" for x, y in points), L


def mood_graph(gid, t, dur, pts, col, title, labels):
    pstr, L = polyline(pts)
    lab = "".join(f'<div class="mgLab" style="left:{x}px;top:{y}px;color:{c}">{escape(s)}</div>' for x, y, s, c in labels)
    el(f'''<div id="{gid}" class="clip mg" data-start="{t:.3f}" data-duration="{dur:.3f}" data-track-index="8">
      <div class="mgTitle">{escape(title)}</div>
      <svg width="900" height="520" viewBox="0 0 900 520"><line x1="20" y1="260" x2="880" y2="260" class="mgBase"/>
      <text x="24" y="40" class="mgAx">MOOD TINGGI</text><text x="24" y="505" class="mgAx">MOOD RENDAH</text>
      <polyline points="{pstr}" fill="none" stroke="{col}" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"
        stroke-dasharray="{L:.0f}" stroke-dashoffset="{L:.0f}" class="mgLine"/></svg>{lab}</div>''')
    tl(f'tl.fromTo("#{gid}",{{y:-900,opacity:0}},{{y:0,opacity:1,duration:0.4,ease:"expo.out"}},{t:.3f});')
    tl(f'tl.to("#{gid} .mgLine",{{strokeDashoffset:0,duration:{dur * 0.6:.2f},ease:"power1.inOut"}},{t + 0.3:.3f});')
    for i, (_, _, _, _) in enumerate(labels):
        tl(f'tl.fromTo("#{gid} .mgLab:nth-of-type({i + 2})",{{scale:0}},{{scale:1,duration:0.3,ease:"back.out(2.5)"}},{t + 0.4 + (i + 1) * dur * 0.6 / (len(labels) + 1):.3f});')
    tl(f'tl.to("#{gid}",{{y:-900,opacity:0,duration:0.3,ease:"power3.in"}},{t + dur - 0.3:.3f});')
    sfx(t, "swoosh", 0.55)
    sfx(t + 0.3, "draw", 0.5)


g1 = at("Mungkin", 45.8)
mood_graph("mg1", g1 - 0.05, at("Contohnya,", 48.8) - g1, [(30, 260), (180, 260), (260, 250), (330, 40), (400, 30), (460, 250), (560, 262), (640, 330), (700, 360), (760, 300), (870, 262)],
           RED, "BIPOLAR TYPE 1", [(300, 70, "MANIA", RED), (520, 420, "kemurungan? mungkin", "#9fb3ff")])
g2 = at("Yang", 73.0)
mood_graph("mg2", g2 - 0.05, at("kemurungan", 76.3) - g2 - 0.1,
           [(30, 260), (110, 200), (180, 262), (250, 440), (330, 470), (390, 262), (450, 205), (510, 262), (580, 450), (660, 480), (730, 455), (790, 262), (870, 262)],
           TEAL, "BIPOLAR TYPE 2", [(70, 120, "hipomania", TEAL), (330, 470, "kemurungan teruk & kerap", "#7FA4FF")])

# ------------------------------------------------------ examples (type 1)
for cid, word, near in [("ex1", "Contohnya,", 48.8), ("ex2", "Contoh", 80.4)]:
    t = at(word, near)
    el(f'<div id="{cid}" class="clip exTag" data-start="{t:.3f}" data-duration="1.5" data-track-index="8">CONTOH SITUASI</div>')
    tl(f'tl.fromTo("#{cid}",{{scaleX:0}},{{scaleX:1,duration:0.3,ease:"expo.out"}},{t:.3f});')
    tl(f'tl.to("#{cid}",{{scaleX:0,duration:0.2,ease:"power2.in"}},{t + 1.3:.3f});')
    sfx(t, "tick", 0.6)

# money counter over shopping B-roll
m0 = at("shopping", 51.7)
vals = ["RM 500", "RM 1,200", "RM 3,800", "RM 7,500", "RM 12,000", "RM 20,000+"]
spans = "".join(f'<span id="money{i}">{v}</span>' for i, v in enumerate(vals))
el(f'<div id="money" class="clip" data-start="{m0 - 0.1:.3f}" data-duration="{at("tak", 53.2) - m0 + 0.1:.3f}" data-track-index="8"><div class="moneyBox">{spans}</div><div class="moneyLab">BELANJA BERIBU-RIBU</div></div>')
tl(f'tl.fromTo("#money",{{scale:0,rotation:8}},{{scale:1,rotation:-2,duration:0.35,ease:"back.out(2.2)"}},{m0 - 0.1:.3f});')
step = (at("tak", 53.2) - m0 - 0.4) / len(vals)
for i in range(len(vals)):
    tt = m0 + i * step
    tl(f'tl.set("#money{i}",{{display:"block"}},{tt:.3f});')
    if i:
        tl(f'tl.set("#money{i - 1}",{{display:"none"}},{tt:.3f});')
    sfx(tt, "coin", 0.45)
sfx(at("beribu-ribu,", 52.2), "chaching", 0.8)

# 72 hours counter
k0 = at("tak", 53.2)
hours = [0, 12, 24, 36, 48, 60, 72]
spans = "".join(f'<span id="hr{i}">{h}</span>' for i, h in enumerate(hours))
el(f'<div id="hours" class="clip" data-start="{k0:.3f}" data-duration="{at("Yakin", 56.7) - k0 - 0.4:.3f}" data-track-index="8"><div class="hrNum">{spans}<em>JAM</em></div><div class="hrLab">TAK TIDUR... MASIH BERTENAGA</div></div>')
tl(f'tl.fromTo("#hours",{{y:-500,opacity:0}},{{y:0,opacity:1,duration:0.35,ease:"expo.out"}},{k0:.3f});')
for i in range(len(hours)):
    tt = k0 + 0.1 + i * 0.2
    tl(f'tl.set("#hr{i}",{{display:"inline"}},{tt:.3f});')
    if i:
        tl(f'tl.set("#hr{i - 1}",{{display:"none"}},{tt:.3f});')
    sfx(tt, "clock", 0.5)
tl(f'tl.fromTo("#hours .hrNum",{{scale:1.25}},{{scale:1,duration:0.4,ease:"back.out(3)"}},{k0 + 1.3:.3f});')
sfx(k0 + 1.3, "pop", 0.6)

# Prime minister
p0 = at("Perdana", 57.6)
el(f'<div id="pm" class="clip" data-start="{p0:.3f}" data-duration="{at("Itu", 59.2) - p0:.3f}" data-track-index="8"><div class="pmCrown">♛</div><div class="pmTxt">"BAKAL PERDANA<br>MENTERI!"</div></div>')
tl(f'tl.fromTo("#pm",{{scale:0,rotation:-15}},{{scale:1,rotation:-4,duration:0.45,ease:"elastic.out(1,0.5)"}},{p0:.3f});')
tl(f'tl.fromTo("#pm .pmCrown",{{y:-200}},{{y:0,duration:0.4,ease:"bounce.out"}},{p0 + 0.2:.3f});')
sfx(p0, "fanfare", 0.6)
sfx(p0 + 0.2, "cheer", 0.5)

# Type 1 summary stamp
s1 = at("Itu", 59.2)
el(f'<div id="stamp1" class="clip stamp" data-start="{s1:.3f}" data-duration="{at("Kalau", 60.4) - s1:.3f}" data-track-index="8" style="--c:{RED}">TYPE 1 ✓</div>')
tl(f'tl.fromTo("#stamp1",{{scale:3,opacity:0,rotation:10}},{{scale:1,opacity:1,rotation:-8,duration:0.22,ease:"power4.in"}},{s1:.3f});')
sfx(s1 + 0.2, "stamp", 0.9)

# ------------------------------------------------------ type 2: mania vs hypomania bars
b0 = at("Hypomania", 64.7)
el(f'''<div id="bars" class="clip" data-start="{b0 - 0.05:.3f}" data-duration="{at("seseorang", 67.3) - b0 + 0.05:.3f}" data-track-index="8">
  <div class="barsTitle">KEKUATAN EPISOD</div>
  <div class="barCol"><div class="barFill" id="barM" style="height:440px;background:{RED}"></div><div class="barLab">MANIA<small>Type 1</small></div></div>
  <div class="barCol"><div class="barFill" id="barH" style="height:200px;background:{TEAL}"></div><div class="barLab">HIPOMANIA<small>Type 2</small></div></div></div>''')
tl(f'tl.fromTo("#bars",{{y:-800,opacity:0}},{{y:0,opacity:1,duration:0.4,ease:"expo.out"}},{b0 - 0.05:.3f});')
tl(f'tl.fromTo("#barH",{{scaleY:0}},{{scaleY:1,duration:0.5,ease:"back.out(1.6)"}},{at("ringan", 65.8):.3f});')
tl(f'tl.fromTo("#barM",{{scaleY:0}},{{scaleY:1,duration:0.6,ease:"back.out(1.4)"}},{at("mania.", 66.8) - 0.1:.3f});')
tl(f'tl.to("#bars",{{y:-800,opacity:0,duration:0.3,ease:"power3.in"}},{at("seseorang", 67.3) - 0.3:.3f});')
sfx(b0 - 0.05, "swoosh", 0.5)
sfx(at("ringan", 65.8), "rise_small", 0.6)
sfx(at("mania.", 66.8) - 0.1, "rise_big", 0.7)

# chips: still functioning
chips = [("✓ Masih berfungsi", at("berfungsi", 68.7), GREEN), ("Lebih aktif", at("aktif,", 71.1), TEAL),
         ("Lebih ceria", at("ceria,", 71.9), YELLOW), ("Banyak bercakap", at("bercakap.", 72.6), VIOLET)]
c_s, c_e = chips[0][1] - 0.05, at("Yang", 73.0) - 0.05
inner = "".join(f'<div class="chip" id="chip{i}" style="--c:{c}">{escape(t)}</div>' for i, (t, _, c) in enumerate(chips))
el(f'<div id="chips" class="clip" data-start="{c_s:.3f}" data-duration="{c_e - c_s:.3f}" data-track-index="8">{inner}</div>')
for i, (_, t, _) in enumerate(chips):
    tl(f'tl.fromTo("#chip{i}",{{scale:0,rotation:{(-1) ** i * 12}}},{{scale:1,rotation:{(-1) ** i * 3},duration:0.35,ease:"back.out(2.6)"}},{t:.3f});')
    sfx(t, "bubble", 0.55)
tl(f'tl.to("#chips",{{opacity:0,duration:0.2}},{c_e - 0.2:.3f});')

# worse & more frequent (over b12)
w0 = at("teruk", 78.4)
el(f'<div id="worse" class="clip" data-start="{w0:.3f}" data-duration="{at("Contoh", 80.4) - w0:.3f}" data-track-index="8"><div class="wsRow" id="ws1">LEBIH TERUK</div><div class="wsRow" id="ws2">LEBIH KERAP</div></div>')
tl(f'tl.fromTo("#ws1",{{x:-900}},{{x:0,duration:0.35,ease:"expo.out"}},{w0:.3f});')
tl(f'tl.fromTo("#ws2",{{x:900}},{{x:0,duration:0.35,ease:"expo.out"}},{at("kerap", 79.4):.3f});')
sfx(w0, "boom", 0.6)
sfx(at("kerap", 79.4), "boom", 0.6)
sfx(at("Kemurungan", 77.2), "heartbeat", 0.6)

# week timeline: 1 week good, 2 weeks down
k1 = at("Mod", 83.9)
el(f'''<div id="weeks" class="clip" data-start="{k1:.3f}" data-duration="{at("Dua-dua", 89.5) - k1:.3f}" data-track-index="8">
  <div class="wkRow"><div class="wkBar" id="wkUp" style="width:300px;background:{YELLOW}"></div><div class="wkLab" id="wkUpL">1 MINGGU<small>mood elok</small></div></div>
  <div class="wkRow"><div class="wkBar" id="wkDn" style="width:600px;background:{BLUE}"></div><div class="wkLab" id="wkDnL">2 MINGGU<small>down, tak bangun dari katil</small></div></div></div>''')
tl(f'tl.fromTo("#weeks",{{y:-600,opacity:0}},{{y:0,opacity:1,duration:0.35,ease:"expo.out"}},{k1:.3f});')
tl(f'tl.fromTo("#wkUp",{{scaleX:0}},{{scaleX:1,duration:0.6,ease:"power2.out"}},{at("seminggu", 84.5):.3f});')
tl(f'tl.fromTo("#wkUpL",{{opacity:0,x:-40}},{{opacity:1,x:0,duration:0.3}},{at("seminggu", 84.5) + 0.3:.3f});')
tl(f'tl.fromTo("#wkDn",{{scaleX:0}},{{scaleX:1,duration:1.4,ease:"power1.inOut"}},{at("down,", 86.2):.3f});')
tl(f'tl.fromTo("#wkDnL",{{opacity:0,x:-40}},{{opacity:1,x:0,duration:0.3}},{at("dua", 88.2):.3f});')
tl(f'tl.to("#weeks",{{opacity:0,duration:0.25}},{at("Dua-dua", 89.5) - 0.25:.3f});')
sfx(at("seminggu", 84.5), "rise_small", 0.6)
sfx(at("down,", 86.2), "down", 0.8)
sfx(at("dua", 88.2), "pop", 0.5)

# treatment
r0 = at("rawatan.", 91.4)
el(f'<div id="rx" class="clip" data-start="{r0 - 0.1:.3f}" data-duration="{at("Jangan", 92.2) - r0 + 0.1:.3f}" data-track-index="8"><div class="rxTop"><span style="background:{RED}">TYPE 1</span><span style="background:{TEAL}">TYPE 2</span></div><div class="rxTxt">PERLU RAWATAN</div></div>')
tl(f'tl.fromTo("#rx",{{scale:0.2,opacity:0}},{{scale:1,opacity:1,duration:0.35,ease:"back.out(2)"}},{r0 - 0.1:.3f});')
sfx(r0 - 0.1, "chime", 0.8)

# CTA
q0 = at("Apa-apa", 96.2)
el(f'<div id="cta" class="clip" data-start="{q0:.3f}" data-duration="{END_CARD_AT - q0 + 0.2:.3f}" data-track-index="8"><div class="ctaBub">ADA SOALAN?<small>Tanya di komen ↓</small></div></div>')
tl(f'tl.fromTo("#cta .ctaBub",{{scale:0,rotation:-10}},{{scale:1,rotation:-2,duration:0.4,ease:"back.out(2.5)"}},{q0:.3f});')
tl(f'tl.to("#cta .ctaBub",{{y:-16,duration:0.25,yoyo:true,repeat:3,ease:"sine.inOut"}},{q0 + 0.45:.3f});')
sfx(q0, "bubble", 0.8)

# --------------------------------------------------------------- END CARD
rows = [("Episod", "MANIA PENUH", "HIPOMANIA"), ("Tahap", "Teruk, boleh perlu wad", "Lebih ringan, masih berfungsi"),
        ("Kemurungan", "Mungkin ada, tak semestinya", "Lebih teruk & lebih kerap"), ("Rawatan", "PERLU", "PERLU")]
rh = "".join(f'<div class="ecRow" id="ecr{i}"><div class="ecK">{escape(k)}</div><div class="ecA">{escape(a)}</div><div class="ecB">{escape(b)}</div></div>' for i, (k, a, b) in enumerate(rows))
el(f'''<div id="endcard" class="clip full" data-start="{END_CARD_AT}" data-duration="{TOTAL - END_CARD_AT:.2f}" data-track-index="13">
  <div class="ecTitle">BIPOLAR <span style="color:{RED}">1</span> vs <span style="color:{TEAL}">2</span></div>
  <div class="ecHead"><div></div><div style="background:{RED}">TYPE 1</div><div style="background:{TEAL}">TYPE 2</div></div>
  {rh}
  <div class="ecFoot">Dr. Azren · Jabatan Psikiatri<br><small>Simpan &amp; kongsi video ini</small></div></div>''')
tl(f'tl.fromTo("#endcard",{{clipPath:"circle(0% at 50% 50%)"}},{{clipPath:"circle(75% at 50% 50%)",duration:0.5,ease:"power3.inOut"}},{END_CARD_AT});')
tl(f'tl.fromTo("#endcard .ecTitle",{{y:-200,opacity:0}},{{y:0,opacity:1,duration:0.4,ease:"expo.out"}},{END_CARD_AT + 0.3:.2f});')
tl(f'tl.fromTo("#endcard .ecHead",{{scaleX:0}},{{scaleX:1,duration:0.35,ease:"expo.out"}},{END_CARD_AT + 0.5:.2f});')
sfx(END_CARD_AT, "whoosh_big", 0.8)
for i in range(len(rows)):
    t = END_CARD_AT + 0.75 + i * 0.28
    tl(f'tl.fromTo("#ecr{i}",{{x:1080}},{{x:0,duration:0.35,ease:"expo.out"}},{t:.2f});')
    sfx(t, "tick", 0.5)
tl(f'tl.fromTo("#endcard .ecFoot",{{opacity:0}},{{opacity:1,duration:0.4}},{END_CARD_AT + 2.0:.2f});')
sfx(END_CARD_AT + 2.0, "chime", 0.6)

# --------------------------------------------------------------- page
CSS = open(__file__.replace("build_comp.py", "style.css")).read()
page = f'''<!doctype html>
<html lang="ms" data-resolution="portrait">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=1080, height=1920" />
<script src="assets/gsap.min.js"></script>
<style>
{CSS}
</style>
</head>
<body>
<div id="root" data-composition-id="main" data-start="0" data-duration="{TOTAL}" data-width="1080" data-height="1920">
<div id="bg" class="clip full" data-start="0" data-duration="{TOTAL}" data-track-index="0"></div>
{chr(10).join(html)}
<div id="vignette" class="clip full" data-start="0" data-duration="{TOTAL}" data-track-index="3"></div>
</div>
<script>
const tl = gsap.timeline({{ paused: true }});
{chr(10).join(js)}
window.__timelines = window.__timelines || {{}};
window.__timelines["main"] = tl;
tl.seek(0);
</script>
</body>
</html>
'''
open(f"{PROJ}/index.html", "w").write(page)
json.dump({"total": TOTAL, "speech_end": SPEECH_END, "sfx": sorted(SFX, key=lambda x: x["t"])}, open(f"{PROJ}/cues.json", "w"), indent=1)
print(f"index.html written: {len(html)} elements, {len(js)} tweens, {len(SFX)} sfx cues, total {TOTAL}s")
