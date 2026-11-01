"""Build a tight cut list from word timings: drop fillers/retakes, squeeze pauses,
trim silences inside words, shorten drawn-out vowels. Writes cuts.json + words_out.json."""
import json, numpy as np, sys
W=[w for s in json.load(open("transcript.json")) for w in s["words"]]
rms=np.load("rms.npy"); flux=np.load("flux.npy")
from numpy.lib.stride_tricks import sliding_window_view as _sw
rms_med=np.median(_sw(np.pad(rms,4,mode="edge"),9),axis=1)
# --- retakes / fillers removed by source time (inclusive word start ranges)
DROP=[(13.30,18.70),   # "Tapi bipolar jenis yang mana satu, jenis yang satu," (stumble)
      (25.70,27.75),   # "Okay bipolar type 1," (filler + repeat)
      (85.80,87.70),   # first "tak tidur tiga hari," (repeat)
      (106.25,106.70), # "Dia masih," (false start)
      (136.30,138.60)] # first "Dua-dua jenis" (restarted)
HARD_CUTS=[(109.10,109.42),(110.14,110.79)]  # "aaa" filler between "tapi" and "dia"
ADD=[{"t":"Dua-dua","s":138.72,"e":139.06},{"t":"jenis","s":139.06,"e":139.40}]
FIX={"dejabat":"di Jabatan","sekatri,":"Psikiatri,","berribu":"beribu","tanyainya":"tanya","Dimana":"Di mana","hyper":"hiper","shopping":"shopping","Azren,":"Azren,"}
words=[]
for w in W:
    if any(a<=w["s"]<b for a,b in DROP): continue
    t=w["w"].strip(); t=FIX.get(t,t)
    if 3.7<w["s"]<3.8 and t=="dan": continue
    words.append({"t":t,"s":w["s"],"e":w["e"]})
words=sorted(words+[dict(x) for x in ADD],key=lambda x:x['s'])
for w in words:
    for a,b in HARD_CUTS:
        if a<=w['s']<b: w['s']=b
        if a<w['e']<=b: w['e']=a
# merge hyphen continuations into previous word ("tiba" "-tiba")
m=[]
for w in words:
    if w["t"].startswith("-") and m: m[-1]["t"]+=w["t"]; m[-1]["e"]=w["e"]
    else: m.append(dict(w))
words=m
# fix "hiper" + "aktif," -> "hiperaktif,"
m=[]
for w in words:
    if m and m[-1]["t"]=="hiper": m[-1]["t"]="hiperaktif"+w["t"][5:]; m[-1]["e"]=w["e"]
    else: m.append(w)
words=m
def voiced_bounds(s,e):
    i0,i1=int(s*100),int(e*100); r=rms[i0:i1]
    v=np.where(r>-40)[0]
    if len(v)==0: return s,e
    return s+v[0]*0.01, s+(v[-1]+1)*0.01
# tighten each word to voiced region (fixes whisper over-long words)
for w in words:
    a,b=voiced_bounds(w["s"],w["e"]); w["s"],w["e"]=max(w["s"],a-0.03),min(w["e"],b+0.05)
PRE,POST,GAP_KEEP=0.05,0.07,0.12
# group words into phrases: break when gap > 0.18
segs=[]; cur=None
for w in words:
    if cur and w["s"]-cur["e"]<=0.18: cur["e"]=w["e"]; cur["w"].append(w)
    else:
        cur={"s":w["s"],"e":w["e"],"w":[w]}; segs.append(cur)
# pieces with padding
pieces=[]
for g in segs:
    pieces.append([g["s"]-PRE,g["e"]+POST,g])
# split pieces at internal silences > 0.16s and long sustained vowels > 0.26s
def internal_cuts(a,b):
    cuts=[]
    i0,i1=int(a*100),int(b*100); r=rms_med[i0:i1]
    sil=r<-31; run=0
    for j,v in enumerate(list(sil)+[False]):
        if v: run+=1
        else:
            if run>=18: st=a+(j-run)*0.01; en=a+j*0.01; cuts.append((st+0.06,en-0.06))
            run=0
    thr=np.percentile(flux[rms>-40],30)
    sus=(r>-40)&(flux[i0:i1]<thr); run=0
    for j,v in enumerate(list(sus)+[False]):
        if v: run+=1
        else:
            if run>=26: st=a+(j-run)*0.01; en=a+j*0.01; mid=(st+en)/2; cuts.append((st+0.07,en-0.07))
            run=0
    return sorted(cuts)
final=[]
for a,b,g in pieces:
    cur=a
    for c0,c1 in internal_cuts(a,b):
        if c1-c0<0.06 or c0<cur: continue
        final.append((cur,c0)); cur=c1
    final.append((cur,b))
# remove overlaps
out=[]
for a,b in final:
    if out and a<out[-1][1]: a=out[-1][1]
    if b-a>0.04: out.append((round(a,3),round(b,3)))
def subtract(iv,cuts):
    res=[]
    for a,b in iv:
        segs=[(a,b)]
        for c0,c1 in cuts:
            nxt=[]
            for x,y in segs:
                if c1<=x or c0>=y: nxt.append((x,y))
                else:
                    if c0>x: nxt.append((x,c0))
                    if c1<y: nxt.append((c1,y))
            segs=nxt
        res+= [s for s in segs if s[1]-s[0]>0.04]
    return res
out=subtract(out,HARD_CUTS)
# map words to output timeline
def map_t(t):
    acc=0
    for a,b in out:
        if t<a: return acc
        if t<=b: return acc+(t-a)
        acc+=b-a
    return acc
wo=[{"t":w["t"],"s":round(map_t(w["s"]),3),"e":round(map_t(w["e"]),3),"src":w["s"]} for w in words]
json.dump(out,open("cuts.json","w")); json.dump(wo,open("words_out.json","w"),ensure_ascii=False,indent=0)
tot=sum(b-a for a,b in out)
print(f"{len(out)} pieces, output {tot:.2f}s (from 148.97s)")
print(" ".join(w["t"] for w in wo))
