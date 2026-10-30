// Shared helpers for The Curious Affan episodes: deterministic maths,
// easing, seeded randomness, narration envelope and screen projection.
import * as THREE from 'three';

export const W = 1080;
export const H = 1920;

export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, k) => a + (b - a) * k;
export const inv = (a, b, x) => clamp((x - a) / (b - a));
export const smooth = (k) => k * k * (3 - 2 * k);
export const easeOut = (k) => 1 - Math.pow(1 - k, 3);
export const easeIn = (k) => k * k * k;
export const easeInOut = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
export const backOut = (k, s = 1.7) => 1 + (s + 1) * Math.pow(k - 1, 3) + s * Math.pow(k - 1, 2);
export const elasticOut = (k) =>
  k <= 0 ? 0 : k >= 1 ? 1 : Math.pow(2, -10 * k) * Math.sin((k * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1;

// Window of activity: 0 before a, ramps in over fin, holds, ramps out over fout before b.
export function win(t, a, b, fin = 0.25, fout = 0.25) {
  if (t < a || t > b) return 0;
  return Math.min(fin > 0 ? clamp((t - a) / fin) : 1, fout > 0 ? clamp((b - t) / fout) : 1);
}

// Keyframe interpolation: keys = [[t, value], ...]; value may be number or array.
export function keys(t, ks, ease = easeInOut) {
  if (t <= ks[0][0]) return ks[0][1];
  for (let i = 0; i < ks.length - 1; i++) {
    const [t0, v0] = ks[i];
    const [t1, v1] = ks[i + 1];
    if (t <= t1) {
      const k = ease(inv(t0, t1, t));
      return Array.isArray(v0) ? v0.map((v, j) => lerp(v, v1[j], k)) : lerp(v0, v1, k);
    }
  }
  return ks[ks.length - 1][1];
}

export function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let r = Math.imul(s ^ (s >>> 15), 1 | s);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

// Smooth pseudo-noise for idle motion (sum of sines, deterministic).
export const wobble = (t, seed = 0) =>
  Math.sin(t * 1.3 + seed) * 0.5 + Math.sin(t * 2.7 + seed * 1.7) * 0.3 + Math.sin(t * 0.7 + seed * 3.1) * 0.2;

// Narration loudness envelope sampled at `fps`, normalised 0..1, used for lip sync.
export async function loadEnvelope(url, fps) {
  const buf = await (await fetch(url)).arrayBuffer();
  const ctx = new OfflineAudioContext(1, 44100, 44100);
  const audio = await ctx.decodeAudioData(buf);
  const data = audio.getChannelData(0);
  const hop = audio.sampleRate / fps;
  const n = Math.ceil(data.length / hop);
  const env = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let s = 0;
    const a = Math.floor(i * hop);
    const b = Math.min(data.length, Math.floor((i + 1) * hop));
    for (let j = a; j < b; j++) s += data[j] * data[j];
    const db = 10 * Math.log10(s / Math.max(1, b - a) + 1e-10);
    env[i] = clamp((db + 42) / 26);
  }
  // light smoothing so the mouth does not chatter
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = (env[Math.max(0, i - 1)] + 2 * env[i] + env[Math.min(n - 1, i + 1)]) / 4;
  return { at: (t) => out[clamp(Math.round(t * fps), 0, n - 1)] || 0, duration: audio.duration };
}

const _v = new THREE.Vector3();
// World position -> CSS pixel position in the 1080x1920 frame (viewport-relative).
export function toScreen(pos, camera, vp = { x: 0, y: 0, w: W, h: H }) {
  _v.copy(pos).project(camera);
  return {
    x: vp.x + (_v.x * 0.5 + 0.5) * vp.w,
    y: vp.y + (-_v.y * 0.5 + 0.5) * vp.h,
    visible: _v.z < 1,
  };
}

export function makeRenderer(canvas) {
  const r = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
  r.setPixelRatio(1);
  r.setSize(W, H, false);
  r.outputColorSpace = THREE.SRGBColorSpace;
  r.toneMapping = THREE.ACESFilmicToneMapping;
  r.toneMappingExposure = 1.05;
  r.shadowMap.enabled = true;
  r.shadowMap.type = THREE.PCFSoftShadowMap;
  return r;
}
