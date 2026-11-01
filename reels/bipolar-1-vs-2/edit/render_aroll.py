import json, subprocess, sys
cuts=json.load(open("cuts.json")); src=sys.argv[1]; out=sys.argv[2]
fc=[]; F=0.006
for i,(a,b) in enumerate(cuts):
    d=b-a
    fc.append(f"[0:v]trim={a}:{b},setpts=PTS-STARTPTS[v{i}]")
    fc.append(f"[0:a]atrim={a}:{b},asetpts=PTS-STARTPTS,afade=t=in:d={F},afade=t=out:st={d-F:.4f}:d={F}[a{i}]")
fc.append("".join(f"[v{i}][a{i}]" for i in range(len(cuts)))+f"concat=n={len(cuts)}:v=1:a=1[vc][ac]")
fc.append("[vc]scale=1080:1920:flags=lanczos,unsharp=5:5:0.6,eq=contrast=1.06:saturation=1.12:brightness=0.01,fps=30[vo]")
open("aroll_fc.txt","w").write(";\n".join(fc))
subprocess.run(["ffmpeg","-v","error","-y","-i",src,"-filter_complex_script","aroll_fc.txt","-map","[vo]","-map","[ac]",
  "-c:v","libx264","-preset","medium","-crf","16","-pix_fmt","yuv420p","-c:a","pcm_s16le","-ar","48000",out],check=True)
