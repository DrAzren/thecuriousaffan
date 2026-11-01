"""Per-frame loudness (rms.npy) and spectral flux (flux.npy) of the raw audio, and a
report of drawn-out words. Usage: python3 analyze.py audio16k.wav transcript.json"""
import json, wave, numpy as np, sys
wf=wave.open(sys.argv[1]); a=np.frombuffer(wf.readframes(wf.getnframes()),dtype=np.int16).astype(np.float32)/32768
sr=16000; hop=160; win=640
n=(len(a)-win)//hop
frames=np.lib.stride_tricks.sliding_window_view(a,win)[::hop][:n]*np.hanning(win)
spec=np.abs(np.fft.rfft(frames,axis=1))[:, :200]+1e-6
ls=np.log(spec)
rms=20*np.log10(np.sqrt((frames**2).mean(1))+1e-9)
flux=np.r_[0,np.sqrt(((ls[1:]-ls[:-1])**2).mean(1))]
# smooth
k=np.ones(5)/5; fs=np.convolve(flux,k,'same')
np.save("rms.npy",rms); np.save("flux.npy",fs)
d=json.load(open(sys.argv[2]))
W=[w for s in d for w in s["words"]]
for w in W:
    dur=w["e"]-w["s"]; L=len(w["w"].strip(" ,.?-'"))
    if dur>0.45 and dur/ max(L,1) > 0.09:
        i0,i1=int(w["s"]*100),int(w["e"]*100)
        r=rms[i0:i1]; f=fs[i0:i1]
        # sustained = voiced (rms>-38) and low flux
        sus=(r>-40)&(f<np.percentile(fs[rms>-40],30))
        # longest run
        best=(0,0,0); run=0
        for j,v in enumerate(sus):
            run=run+1 if v else 0
            if run>best[0]: best=(run,j-run+1,j)
        print(f"{w['w'].strip():16s} {w['s']:7.2f}-{w['e']:7.2f} dur={dur:.2f} sustained={best[0]*0.01:.2f}s @ {w['s']+best[1]*0.01:.2f}-{w['s']+(best[2]+1)*0.01:.2f}  rms:"+" ".join(f"{x:.0f}" for x in r[::5]))
