// THE CURIOUS AFFAN — Episode 022: "Macam Mana Duit Kertas Terhasil?"
// Preview cut: narration (audio/narration.mp3, Affan's voice), the cover set
// with Affan lip-synced and acting each beat's emotion, word-timed captions
// (audio/narration_words.json) and a step label per beat. The full animated
// shots (cotton, printing press, cutting, bank) are not built yet.
import * as THREE from 'three';
import { makeRenderer, loadEnvelope, toScreen, clamp, lerp, inv, keys, wobble, W, H } from '../../shared/core.js';
import { makeAffan, blinkAt } from '../../shared/affan.js';
import { Overlay, ICONS, drawLogo, pop } from '../../shared/overlay.js';
import { glow } from '../../shared/props.js';

const FPS = 30;
let DURATION = 60;

const stage = document.getElementById('stage');
const canvas = document.createElement('canvas');
stage.appendChild(canvas);
const renderer = makeRenderer(canvas);
const ov = new Overlay(stage);
const cam = new THREE.PerspectiveCamera(40, W / H, 0.05, 200);
let env = { at: () => 0 };
const V = (x, y, z) => new THREE.Vector3(x, y, z);

// ------------------------------------------------------------ banknote art
// A made-up cartoon note (no real currency design): colour field, guilloche
// rosettes, a hibiscus-like flower medallion, a watermark window, a security
// thread, raised value numerals and a serial number.
function noteTexture({ base = '#2fae6b', dark = '#14663d', light = '#bff2d2', value = '10', serial = 'AF 0220221' } = {}) {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 480;
  const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 1024, 480);
  gr.addColorStop(0, light);
  gr.addColorStop(0.45, base);
  gr.addColorStop(1, dark);
  g.fillStyle = gr;
  g.fillRect(0, 0, 1024, 480);
  // fine guilloche waves
  g.lineWidth = 1.6;
  for (let k = 0; k < 26; k++) {
    g.strokeStyle = `rgba(255,255,255,${0.1 + (k % 3) * 0.05})`;
    g.beginPath();
    for (let x = 0; x <= 1024; x += 8) {
      const y = 40 + k * 16 + Math.sin(x / 38 + k * 0.6) * 9 + Math.sin(x / 97 + k) * 6;
      x ? g.lineTo(x, y) : g.moveTo(x, y);
    }
    g.stroke();
  }
  // rosette (spirograph)
  const rosette = (cx, cy, R, r, d, col) => {
    g.strokeStyle = col;
    g.lineWidth = 2;
    g.beginPath();
    for (let i = 0; i <= 1400; i++) {
      const a = (i / 1400) * Math.PI * 2 * r;
      const x = cx + (R - r) * Math.cos(a) + d * Math.cos(((R - r) / r) * a);
      const y = cy + (R - r) * Math.sin(a) - d * Math.sin(((R - r) / r) * a);
      i ? g.lineTo(x, y) : g.moveTo(x, y);
    }
    g.stroke();
  };
  rosette(250, 245, 120, 23, 70, 'rgba(255,255,255,0.55)');
  rosette(250, 245, 85, 17, 40, 'rgba(10,50,30,0.35)');
  // flower medallion
  g.save();
  g.translate(250, 245);
  for (let i = 0; i < 5; i++) {
    g.rotate((Math.PI * 2) / 5);
    g.fillStyle = 'rgba(255,92,110,0.92)';
    g.beginPath();
    g.ellipse(0, -42, 30, 46, 0, 0, Math.PI * 2);
    g.fill();
  }
  g.fillStyle = '#ffd84a';
  g.beginPath();
  g.arc(0, 0, 18, 0, Math.PI * 2);
  g.fill();
  g.restore();
  // border
  g.strokeStyle = 'rgba(255,255,255,0.85)';
  g.lineWidth = 10;
  g.strokeRect(18, 18, 988, 444);
  g.strokeStyle = dark;
  g.lineWidth = 4;
  g.strokeRect(34, 34, 956, 412);
  // watermark window
  const wg = g.createRadialGradient(800, 240, 10, 800, 240, 105);
  wg.addColorStop(0, 'rgba(255,255,255,0.75)');
  wg.addColorStop(1, 'rgba(255,255,255,0.2)');
  g.fillStyle = wg;
  g.beginPath();
  g.ellipse(800, 240, 88, 110, 0, 0, Math.PI * 2);
  g.fill();
  // security thread
  g.fillStyle = 'rgba(40,40,60,0.55)';
  g.fillRect(600, 34, 12, 412);
  g.fillStyle = 'rgba(220,235,255,0.8)';
  for (let y = 44; y < 440; y += 34) g.fillRect(600, y, 12, 14);
  // value numerals (raised ink look)
  g.font = '800 120px "Baloo 2"';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  for (const [x, y, s] of [[520, 140, 1], [890, 395, 0.6], [100, 400, 0.6]]) {
    g.save();
    g.translate(x, y);
    g.scale(s, s);
    g.fillStyle = 'rgba(0,0,0,0.35)';
    g.fillText(value, 4, 6);
    g.fillStyle = '#fffdf2';
    g.strokeStyle = dark;
    g.lineWidth = 8;
    g.strokeText(value, 0, 0);
    g.fillText(value, 0, 0);
    g.restore();
  }
  g.font = '800 54px "Baloo 2"';
  g.fillStyle = '#fffdf2';
  g.fillText('RM', 520, 245);
  g.font = '700 30px Fredoka';
  g.fillStyle = dark;
  g.fillText(serial, 450, 400);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function makeNote(opts, w = 1.5) {
  const geo = new THREE.PlaneGeometry(w, (w * 480) / 1024, 24, 1);
  // gentle curl so the note reads as paper, not a flat card
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) p.setZ(i, 0.06 * Math.sin((p.getX(i) / w) * Math.PI) - 0.04 * (p.getX(i) / w) ** 2);
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: noteTexture(opts), roughness: 0.72, side: THREE.DoubleSide }));
  m.castShadow = true;
  return m;
}

// ------------------------------------------------------------------- set
const scene = new THREE.Scene();
{
  const c = document.createElement('canvas');
  c.width = 540;
  c.height = 960;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(270, 420, 30, 270, 460, 720);
  gr.addColorStop(0, '#b9f5c9');
  gr.addColorStop(0.42, '#3cc47c');
  gr.addColorStop(1, '#0f6a52');
  g.fillStyle = gr;
  g.fillRect(0, 0, 540, 960);
  // big faint rosette rings, like banknote line-work
  g.strokeStyle = 'rgba(255,255,255,0.10)';
  g.lineWidth = 2;
  for (let r = 60; r < 900; r += 26) {
    g.beginPath();
    for (let i = 0; i <= 240; i++) {
      const a = (i / 240) * Math.PI * 2;
      const rr = r + 7 * Math.sin(a * 12 + r * 0.05);
      i ? g.lineTo(270 + rr * Math.cos(a), 470 + rr * Math.sin(a)) : g.moveTo(270 + rr * Math.cos(a), 470 + rr * Math.sin(a));
    }
    g.stroke();
  }
  const bg = new THREE.CanvasTexture(c);
  bg.colorSpace = THREE.SRGBColorSpace;
  scene.background = bg;
}
scene.add(new THREE.HemisphereLight(0xf2fff4, 0x4f7d6a, 1.5));
const key = new THREE.DirectionalLight(0xfff2e0, 2.5);
key.position.set(3, 6, 8);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
Object.assign(key.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5, near: 1, far: 30 });
key.shadow.normalBias = 0.03;
scene.add(key);
const rim = new THREE.DirectionalLight(0xd8ffe8, 2.0);
rim.position.set(-6, 5, -6);
scene.add(rim);
const halo = glow(0xfff2b0, 9, 0.4);
halo.position.set(0, 2.6, -2);
scene.add(halo);

const aff = makeAffan();
scene.add(aff.root);

const NOTE_STYLES = [
  { base: '#2fae6b', dark: '#14663d', light: '#c4f5d6', value: '10' },
  { base: '#3f7ee8', dark: '#1d3f8f', light: '#c9dcff', value: '1' },
  { base: '#e8584f', dark: '#8f2420', light: '#ffd0c9', value: '20' },
  { base: '#9a5fd8', dark: '#4b2585', light: '#e6d2ff', value: '5' },
  { base: '#f0a43a', dark: '#99520e', light: '#ffe6b8', value: '50' },
];
const hero = makeNote({ ...NOTE_STYLES[0], serial: 'AF 0220221' }, 1.25);
scene.add(hero);
// floating notes around Affan: [style, x, y, z, rx, ry, rz, size]
const FLOAT = [
  [1, -2.05, 4.35, -1.2, 0.2, 0.5, 0.45, 1.0],
  [2, 2.1, 3.65, -0.9, -0.25, -0.6, -0.35, 1.05],
  [3, -2.0, 1.25, 0.2, 0.3, 0.7, -0.25, 0.95],
  [4, 2.0, 1.5, 0.1, -0.2, -0.55, 0.3, 1.0],
  [2, -2.6, 6.2, -2.4, 0.1, 0.4, -0.2, 0.9],
  [3, 2.7, 6.0, -2.4, -0.1, -0.4, 0.25, 0.9],
];
const floaters = FLOAT.map(([s, x, y, z, rx, ry, rz, w], i) => {
  const n = makeNote({ ...NOTE_STYLES[s], serial: 'AF ' + String(1000000 + i * 7919) }, w);
  n.position.set(x, y, z);
  n.rotation.set(rx, ry, rz);
  n.userData.base = [x, y, z, rx, ry, rz];
  scene.add(n);
  return n;
});
// soft ground shadow catcher
const ground = new THREE.Mesh(new THREE.CircleGeometry(3, 48), new THREE.ShadowMaterial({ opacity: 0.25 }));
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// ------------------------------------------------------------------ pose
const _h = new THREE.Vector3();
const COVER_POSE = {
  yaw: 0.12, headYaw: -0.32, headPitch: 0.08, headRoll: 0.06, lookX: -0.55, lookY: 0.25, wow: 0.9, brow: 1,
  armL: { reach: [0.62, 0.95, 0.5], pole: [1, -0.8, -0.3], thumb: 1, wy: 1.2, wx: 0.15 },
};
function poseCover(t, p = COVER_POSE, camK = 0) {
  aff.root.position.set(0, 0, 0);
  aff.pose({
    blink: blinkAt(t, 22), bob: 0.02 * wobble(t, 2), ...p,
    armR: { reach: [-0.95, 1.3, 0.38], pole: [-1, -0.9, 0.1], wx: -0.2 },
  });
  aff.root.updateMatrixWorld(true);
  aff.parts.arms.R.hand.getWorldPosition(_h);
  hero.position.copy(_h).add(V(-0.36, 0.2, 0.14));
  hero.rotation.set(-0.05, 0.3, 0.32 + 0.03 * Math.sin(t * 2));
  for (const [i, n] of floaters.entries()) {
    const [x, y, z, rx, ry, rz] = n.userData.base;
    n.position.set(x, y + 0.06 * Math.sin(t * 1.4 + i), z);
    n.rotation.set(rx + 0.08 * Math.sin(t * 1.1 + i * 2), ry, rz + 0.06 * Math.sin(t * 0.9 + i));
  }
  cam.position.set(0.25 * Math.sin(t * 0.21), 2.6, lerp(12, 10.2, camK));
  cam.lookAt(0, lerp(2.9, 2.75, camK), 0);
  cam.updateMatrixWorld(true);
}

// ------------------------------------------------------------ preview cut
// Beats from script.md (take 1 timings): [start, step label, emotion pose]
const MOOD = {
  curious: { smile: 0.4, brow: 0.6, headRoll: 0.14, lookX: -0.4, lookY: 0.3, headYaw: -0.25 },
  excited: { smile: 1, brow: 1, headRoll: -0.05, lookX: 0, lookY: 0, headYaw: 0.05, armL: { reach: [0.62, 0.95, 0.5], pole: [1, -0.8, -0.3], thumb: 1, wy: 1.2, wx: 0.15 } },
  surprised: { wow: 0.9, brow: 1, lookX: -0.55, lookY: 0.25, headYaw: -0.32 },
  happy: { smile: 1, brow: 0.5, headRoll: 0.06, lookX: 0, headYaw: 0 },
  whisper: { smile: 0.5, brow: -0.2, headPitch: 0.15, headYaw: 0.15, lookX: 0.2, armL: { reach: [0.12, 1.42, 0.62], pole: [1, -1, 0.1], point: 1, wx: -0.4 } },
  warm: { smile: 1, brow: 0.3, headRoll: -0.1, headYaw: 0 },
};
const BEATS = [
  [0.0, null, 'curious'], [4.1, null, 'excited'],
  [7.7, '1  BUKAN KERTAS BIASA', 'curious'], [12.6, '1  DIBUAT DARIPADA KAPAS', 'surprised'],
  [16.0, '2  KERTAS KHAS YANG KUAT', 'happy'], [21.4, 'RM1 & RM5: PLASTIK KHAS', 'excited'],
  [25.7, '3  GAMBAR TERSEMBUNYI', 'whisper'], [30.0, '3  BENANG KESELAMATAN', 'excited'],
  [31.7, '4  CETAK LAPIS DEMI LAPIS', 'excited'], [38.3, '4  DAKWAT TIMBUL', 'surprised'],
  [43.6, '5  NOMBOR SIRI', 'curious'], [47.6, '6  POTONG & PERIKSA', 'excited'],
  [53.9, '7  BANK NEGARA → BANK → KITA', 'happy'], [59.6, null, 'surprised'], [63.5, null, 'warm'], [66.7, null, 'excited'],
];
const KEYWORDS = { kapas: '#7cf0b0', plastik: '#8fd8ff', rahsia: '#ffb3d1', tersembunyi: '#ffb3d1', keselamatan: '#ffb3d1', timbul: '#ffa149', siri: '#ffd84a', 'kertas': '#ffffff', duit: '#9df2c0', bank: '#8fd8ff' };
let CAPTIONS = [];
let SPEECH_END = 69;
function buildCaptions(words) {
  const w = words.filter((x) => !/^\[.*\]$/.test(x.text));
  const out = [];
  let cur = [];
  const flush = (end) => {
    if (cur.length) out.push([end, ...cur]);
    cur = [];
  };
  w.forEach((x, i) => {
    cur.push([x.text.replace(/…/g, '').replace(/,$/, ','), x.start]);
    const next = w[i + 1];
    const brk = /[.!?…]$/.test(x.text) || (/,$/.test(x.text) && cur.length >= 2) || cur.length >= 3 || !next || next.start - x.end > 0.45;
    if (brk) flush(next ? Math.min(next.start - 0.02, x.end + 0.6) : x.end + 0.6);
  });
  return out;
}
function poseFor(t) {
  let i = 0;
  while (i + 1 < BEATS.length && t >= BEATS[i + 1][0]) i++;
  const a = { ...COVER_POSE, ...MOOD[BEATS[i][2]] };
  if (i === 0 || t - BEATS[i][0] > 0.35) return { p: a, i };
  // short blend from the previous beat's mood
  const b = { ...COVER_POSE, ...MOOD[BEATS[i - 1][2]] };
  const k = inv(BEATS[i][0], BEATS[i][0] + 0.35, t);
  const mix = {};
  for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const va = a[key] ?? 0, vb = b[key] ?? 0;
    mix[key] = typeof va === 'number' && typeof vb === 'number' ? lerp(vb, va, k) : k < 0.5 ? b[key] : a[key];
  }
  return { p: mix, i };
}
function frame(t) {
  ov.begin();
  const { p, i } = poseFor(t);
  const talk = clamp(env.at(t) * 1.2);
  const wow = (p.wow || 0) * (1 - clamp(talk * 2.5));
  poseCover(t, { ...p, talk, wow }, keys(t, [[0, 0], [8, 1], [SPEECH_END, 1], [SPEECH_END + 1.5, 0.3]]));
  renderer.render(scene, cam);
  // intro title over the hook
  const ti = pop(t, 0.15, 7.4);
  if (ti.o > 0) {
    ov.tag('inBadge', 'EPISOD 22', { x: W / 2, y: 300, o: ti.o, s: ti.s }, { bg: '#2f7bff', small: true });
    ov.bubble('inTitle', 'MACAM MANA\nDUIT KERTAS\nTERHASIL?', { x: W / 2, y: 540, r: -2, o: ti.o, s: ti.s }, { size: 112 });
  }
  // step label for the current beat
  const label = BEATS[i][1];
  if (label) {
    const st = pop(t, BEATS[i][0], (BEATS[i + 1] || [SPEECH_END])[0]);
    ov.tag('step' + i, label, { x: W / 2, y: 360, o: st.o, s: st.s, r: -2 }, { bg: ['#2fae6b', '#ff8a3d', '#9a5fd8', '#2f7bff'][i % 4] });
  }
  if (BEATS[i][2] === 'surprised' || (t > 12.6 && t < 15.7)) {
    const n = toScreen(hero.position, cam);
    ov.sparkles(t, { n: 14, seed: 22 + i, x: n.x - 220, y: n.y - 200, w: 440, h: 400, size: 24 });
  }
  ov.captions(t, CAPTIONS, KEYWORDS);
  // outro: logo
  const lo = pop(t, SPEECH_END + 0.3);
  if (lo.o > 0) drawLogo(ov, { y: 400, scale: 0.72, k: [lo, lo, lo], star: lo });
  ov.flash(clamp(1 - t / 0.35) * 0.8);
  ov.end();
}

// Cover / thumbnail (9:16): Affan amazed, holding up a banknote among flying
// notes, with a big title, episode badge and the series logo. Key elements
// stay inside the centre 3:4 area (y 240-1680) that profile grids show.
function thumbnail() {
  ov.begin();
  poseCover(0.6);
  renderer.render(scene, cam);
  const g = ov.g;
  const top = g.createLinearGradient(0, 0, 0, 820);
  top.addColorStop(0, 'rgba(6,48,36,0.78)');
  top.addColorStop(1, 'rgba(6,48,36,0)');
  g.fillStyle = top;
  g.fillRect(0, 0, W, 820);
  const bot = g.createLinearGradient(0, H - 760, 0, H);
  bot.addColorStop(0, 'rgba(6,48,36,0)');
  bot.addColorStop(1, 'rgba(6,48,36,0.75)');
  g.fillStyle = bot;
  g.fillRect(0, H - 760, W, 760);
  ov.vignette(0.28);
  const n = toScreen(hero.position, cam);
  ov.sparkles(1.3, { n: 16, seed: 22, x: n.x - 230, y: n.y - 200, w: 460, h: 400, size: 26 });
  ov.tag('thBadge', 'EPISOD 22', { x: W / 2, y: 300 }, { bg: '#2f7bff', small: true });
  ov.bubble('thTitle', 'MACAM MANA\nDUIT KERTAS\nTERHASIL?', { x: W / 2, y: 540, r: -2 }, { size: 112 });
  ov.html('thQ', ICONS.qmark('#ffcf33'), { x: 955, y: 1015, r: 14, s: 0.8 });
  drawLogo(ov, { y: 1430, scale: 0.55 });
  ov.end();
}

window.EP = {
  fps: FPS,
  get duration() {
    return DURATION;
  },
  frame,
  thumbnail,
  ready: (async () => {
    try {
      env = await loadEnvelope('./audio/narration.mp3', FPS);
      DURATION = Math.ceil(env.duration + 3);
      SPEECH_END = env.duration;
      CAPTIONS = buildCaptions((await (await fetch('./audio/narration_words.json')).json()).words);
    } catch (e) {
      console.warn('no narration yet');
    }
    await Promise.all(['800 60px "Baloo 2"', '700 60px "Baloo 2"', '700 60px Fredoka', '600 60px Fredoka'].map((f) => document.fonts.load(f)));
    // note textures were drawn before the fonts loaded; redraw them now
    for (const m of [hero, ...floaters]) m.material.map.dispose();
    hero.material.map = noteTexture({ ...NOTE_STYLES[0], serial: 'AF 0220221' });
    FLOAT.forEach(([s], i) => (floaters[i].material.map = noteTexture({ ...NOTE_STYLES[s], serial: 'AF ' + String(1000000 + i * 7919) })));
    frame(0);
    return true;
  })(),
};
