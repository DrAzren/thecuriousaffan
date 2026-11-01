import sys, json
from faster_whisper import WhisperModel
import wave, numpy as np
m = WhisperModel(sys.argv[2], device="cpu", compute_type="int8")
wf=wave.open(sys.argv[1]); a=np.frombuffer(wf.readframes(wf.getnframes()),dtype=np.int16).astype(np.float32)/32768
segs, info = m.transcribe(a, language="ms", word_timestamps=True, vad_filter=False, beam_size=5,
    initial_prompt="Bipolar jenis 1, bipolar jenis 2, mania, hipomania, kemurungan, Dr Azren.")
out=[]
for s in segs:
    out.append({"start":s.start,"end":s.end,"text":s.text,"words":[{"w":w.word,"s":w.start,"e":w.end,"p":w.probability} for w in s.words]})
    print(f"[{s.start:6.2f}-{s.end:6.2f}] {s.text}", flush=True)
json.dump(out, open(sys.argv[3],"w"), ensure_ascii=False, indent=1)
