// THE CURIOUS AFFAN — Episode 017: "Kesan Kalau Tak Makan Sayur"
// Every shot is a pure function of time t (seconds), synced to audio/narration.mp3.
//
// Science (kept simple and accurate for ages 5-12):
// - Vegetables have fibre. Fibre helps food waste move along the gut, so
//   without enough of it, it is harder to poo (constipation: sembelit), and the
//   tummy can ache and feel bloated.
// - Vegetables are full of vitamins. Vitamin C (red capsicum, broccoli,
//   tomatoes) helps the immune system ("askar badan") fight germs; with too few
//   vitamins it works less well and we can fall ill more easily.
// - Carrots give vitamin A (as beta-carotene), which the eyes need to see in
//   dim light.
// - Spinach has iron. The blood needs iron to carry oxygen; too little iron
//   makes us tired quickly.
import * as THREE from 'three';
import { makeRenderer, loadEnvelope, toScreen, clamp, lerp, inv, easeOut, easeInOut, keys, wobble, W, H } from '../../shared/core.js';
import { POSES, blinkAt } from '../../shared/affan.js';
import { Overlay, pop, ICONS, drawLogo } from '../../shared/overlay.js';
import { CAPTIONS, KEYWORDS } from './captions.js';
import { buildDining, buildGarden, buildOutro, SPOT } from './worlds.js';

const FPS = 30;
const DURATION = 59.6;

const stage = document.getElementById('stage');
const canvas = document.createElement('canvas');
stage.appendChild(canvas);
const renderer = makeRenderer(canvas);
const ov = new Overlay(stage);
const din = buildDining();
const gar = buildGarden();
const outro = buildOutro();
const cam = new THREE.PerspectiveCamera(50, W / H, 0.05, 3000);
let env = { at: () => 0 };

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const talk = (t) => clamp(env.at(t) * 1.2);
const scr = (p) => toScreen(p, cam);
function lookCam(pos, look, fov = 50) {
  cam.position.copy(pos);
  cam.fov = fov;
  cam.updateProjectionMatrix();
  cam.lookAt(look);
  cam.updateMatrixWorld(true);
}
const BLUE = '#2f7bff', GREEN = '#2fb35a', ORANGE = '#ff8a3d', RED = '#ff5a3d', PURPLE = '#8a5cff', NAVY = '#26346f', GREY = '#6f7a92';

// ----------------------------------------------------------------- icons
const OUT = 'stroke="#17256b" stroke-width="9" stroke-linejoin="round"';
const BROC_SVG = `<svg width="200" height="220" viewBox="0 0 200 220"><g ${OUT}>
  <path d="M80 210 L88 120 L112 120 L120 210 Z" fill="#a8d868"/>
  <circle cx="60" cy="95" r="42" fill="#3a9a40"/><circle cx="140" cy="95" r="42" fill="#3a9a40"/><circle cx="100" cy="60" r="48" fill="#43a648"/>
  <circle cx="100" cy="112" r="34" fill="#2f8a36"/></g><circle cx="86" cy="48" r="10" fill="#8fdc7a"/><circle cx="50" cy="84" r="8" fill="#8fdc7a"/></svg>`;
const CARROT_SVG = `<svg width="170" height="240" viewBox="0 0 170 240"><g ${OUT}>
  <path d="M70 70 Q40 20 52 10 Q78 30 82 64 M90 64 Q96 18 120 12 Q126 40 100 70" fill="#4fb045"/>
  <path d="M40 80 Q85 55 130 80 Q120 150 88 228 Q80 232 76 226 Q48 150 40 80 Z" fill="#ff8a26"/></g>
  <g stroke="#d9661a" stroke-width="7" stroke-linecap="round"><line x1="60" y1="110" x2="80" y2="112"/><line x1="92" y1="140" x2="112" y2="136"/><line x1="68" y1="168" x2="86" y2="170"/></g></svg>`;
const CAPS_SVG = `<svg width="190" height="210" viewBox="0 0 190 210"><g ${OUT}>
  <path d="M95 50 Q100 20 120 12" fill="none" stroke-width="12"/><path d="M95 50 Q100 20 120 12" fill="none" stroke="#3f9c3a" stroke-width="6"/>
  <path d="M95 52 Q40 30 22 80 Q10 150 50 190 Q72 206 95 188 Q118 206 140 190 Q180 150 168 80 Q150 30 95 52 Z" fill="#e8322a"/>
  <path d="M70 52 Q95 66 120 52 Q110 40 95 46 Q80 40 70 52 Z" fill="#3f9c3a"/></g><ellipse cx="55" cy="95" rx="12" ry="28" fill="#fff" opacity="0.6"/></svg>`;
const SPIN_SVG = `<svg width="190" height="220" viewBox="0 0 190 220"><g ${OUT}>
  <path d="M95 210 Q30 170 30 90 Q30 20 95 12 Q160 20 160 90 Q160 170 95 210 Z" fill="#2f8a3c"/></g>
  <g stroke="#a8d878" stroke-width="8" stroke-linecap="round" fill="none"><path d="M95 205 L95 40"/><path d="M95 150 L60 110 M95 150 L130 110 M95 105 L66 72 M95 105 L124 72"/></g></svg>`;
const TOMATO_SVG = `<svg width="180" height="170" viewBox="0 0 180 170"><g ${OUT}><ellipse cx="90" cy="95" rx="78" ry="66" fill="#f0362c"/>
  <path d="M90 32 L75 18 L88 28 L90 10 L94 28 L108 16 L100 34 L120 34 L96 42 L90 52 L84 42 L60 36 Z" fill="#3f9c3a"/></g><ellipse cx="55" cy="80" rx="14" ry="22" fill="#fff" opacity="0.55"/></svg>`;
const EGG_SVG = `<svg width="210" height="160" viewBox="0 0 210 160"><g ${OUT}><path d="M30 120 Q10 70 60 50 Q110 30 160 50 Q190 70 170 110 Q140 150 80 145 Q45 142 30 120 Z" fill="#6b2d8f"/>
  <path d="M150 44 Q170 20 196 26 Q186 50 166 60 Z" fill="#3f9c3a"/></g><ellipse cx="80" cy="75" rx="26" ry="10" fill="#fff" opacity="0.4"/></svg>`;
const DRUM_SVG = `<svg width="220" height="190" viewBox="0 0 220 190"><g ${OUT}>
  <path d="M120 120 L170 160" stroke-width="30" stroke-linecap="round"/><path d="M120 120 L170 160" stroke="#fff6e6" stroke-width="14" stroke-linecap="round"/>
  <circle cx="182" cy="150" r="14" fill="#fff6e6"/><circle cx="168" cy="172" r="14" fill="#fff6e6"/>
  <path d="M30 70 Q30 15 95 18 Q150 25 140 90 Q130 140 75 130 Q30 120 30 70 Z" fill="#d07a26"/></g>
  <g fill="#f2a24a"><circle cx="70" cy="55" r="9"/><circle cx="100" cy="45" r="7"/><circle cx="90" cy="85" r="8"/><circle cx="60" cy="95" r="6"/><circle cx="115" cy="75" r="6"/></g></svg>`;
const BROOM_SVG = `<svg width="240" height="200" viewBox="0 0 240 200"><g ${OUT}>
  <path d="M120 100 L230 10" stroke-width="22" stroke-linecap="round"/><path d="M120 100 L230 10" stroke="#c98a4a" stroke-width="10" stroke-linecap="round"/>
  <path d="M100 90 L140 120 L100 190 L10 160 Z" fill="#c8f06a"/><path d="M95 92 L138 122 L128 140 L86 108 Z" fill="#ff8a3d"/></g>
  <g stroke="#7fb03a" stroke-width="5"><line x1="80" y1="130" x2="40" y2="160"/><line x1="100" y1="140" x2="70" y2="178"/><line x1="115" y1="140" x2="100" y2="182"/></g></svg>`;
const GERM = (c = '#9b5cff', mood = 1) => `<svg width="170" height="170" viewBox="-85 -85 170 170"><g stroke="#17256b" stroke-width="8" stroke-linecap="round">
  ${Array.from({ length: 9 }, (_, i) => `<line x1="0" y1="-50" x2="0" y2="-74" transform="rotate(${i * 40})"/>`).join('')}</g>
  <g fill="${c}" stroke="#17256b" stroke-width="7">${Array.from({ length: 9 }, (_, i) => `<circle cx="0" cy="-76" r="9" transform="rotate(${i * 40})"/>`).join('')}<circle r="54"/></g>
  <circle cx="-18" cy="-6" r="13" fill="#fff"/><circle cx="18" cy="-6" r="13" fill="#fff"/><circle cx="-16" cy="-3" r="6" fill="#17256b"/><circle cx="20" cy="-3" r="6" fill="#17256b"/>
  <path d="M-30 -24 L-6 -16 M30 -24 L6 -16" stroke="#17256b" stroke-width="7" stroke-linecap="round"/>
  <path d="${mood > 0 ? 'M-20 22 Q0 36 20 22' : 'M-20 30 Q0 16 20 30'}" fill="none" stroke="#17256b" stroke-width="7" stroke-linecap="round"/></svg>`;
const SOLDIER = (weak = 0) => `<svg width="170" height="200" viewBox="-85 -100 170 200"><g stroke="#17256b" stroke-width="8" stroke-linejoin="round">
  <ellipse cx="0" cy="20" rx="58" ry="62" fill="#ffffff"/>
  <path d="M-52 -14 Q-50 -72 0 -74 Q50 -72 52 -14 Z" fill="#2f7bff"/><rect x="-60" y="-20" width="120" height="16" rx="8" fill="#1f5bd6"/>
  <path d="M40 10 L82 4 L82 56 Q82 80 61 90 Q40 80 40 56 Z" fill="#ffd84a"/><path d="M61 24 L61 70 M48 44 L74 44" stroke="#ff5a3d" stroke-width="8"/></g>
  <circle cx="-20" cy="16" r="8" fill="#17256b"/><circle cx="14" cy="16" r="8" fill="#17256b"/>
  <path d="${weak ? 'M-20 50 Q-3 38 14 50' : 'M-20 42 Q-3 58 14 42'}" fill="none" stroke="#17256b" stroke-width="7" stroke-linecap="round"/>
  ${weak ? '<path d="M-46 -8 Q-56 10 -46 18 Q-36 10 -46 -8 Z" fill="#8fd8ff" stroke="#17256b" stroke-width="4"/>' : ''}</svg>`;
const EYE_SVG = `<svg width="300" height="190" viewBox="0 0 300 190"><g stroke="#17256b" stroke-width="12" stroke-linejoin="round">
  <path d="M15 95 Q150 -25 285 95 Q150 215 15 95 Z" fill="#ffffff"/><circle cx="150" cy="95" r="52" fill="#ff9a3d"/><circle cx="150" cy="95" r="24" fill="#17256b" stroke="none"/></g>
  <circle cx="132" cy="78" r="12" fill="#fff"/></svg>`;
const MOON_SVG = `<svg width="150" height="150" viewBox="0 0 150 150"><path d="M100 15 A62 62 0 1 0 135 105 A50 50 0 1 1 100 15 Z" fill="#fff3a6" stroke="#17256b" stroke-width="9" stroke-linejoin="round"/></svg>`;
const FE_SVG = `<svg width="180" height="180" viewBox="0 0 180 180"><path d="M30 60 L90 25 L150 60 L150 120 L90 155 L30 120 Z" fill="#b8c4d8" stroke="#17256b" stroke-width="10" stroke-linejoin="round"/>
  <path d="M30 60 L90 95 L150 60 M90 95 L90 155" fill="none" stroke="#8a97b0" stroke-width="6"/><text x="90" y="112" text-anchor="middle" font-family="Baloo 2" font-weight="800" font-size="62" fill="#17256b">Fe</text></svg>`;
function BATTERY(k) {
  const c = k > 0.6 ? '#2fb35a' : k > 0.3 ? '#ffb21f' : '#ff4d5e';
  const n = Math.max(0, Math.ceil(k * 4 - 0.01));
  return `<svg width="230" height="120" viewBox="0 0 230 120"><rect x="8" y="10" width="190" height="100" rx="18" fill="#ffffff" stroke="#17256b" stroke-width="10"/>
    <rect x="198" y="38" width="22" height="44" rx="6" fill="#17256b"/>${Array.from({ length: n }, (_, i) => `<rect x="${24 + i * 43}" y="26" width="35" height="68" rx="8" fill="${c}"/>`).join('')}</svg>`;
}
const TUMMY_SVG = (sad) => `<svg width="220" height="220" viewBox="0 0 220 220"><circle cx="110" cy="110" r="96" fill="#ffb38a" stroke="#17256b" stroke-width="10"/>
  <circle cx="110" cy="150" r="8" fill="#d98f68"/><circle cx="78" cy="96" r="10" fill="#17256b"/><circle cx="142" cy="96" r="10" fill="#17256b"/>
  <path d="${sad ? 'M80 136 Q110 116 140 136' : 'M80 126 Q110 150 140 126'}" fill="none" stroke="#17256b" stroke-width="9" stroke-linecap="round"/>
  ${sad ? '<path d="M60 70 L92 82 M160 70 L128 82" stroke="#17256b" stroke-width="8" stroke-linecap="round"/>' : ''}</svg>`;
function THERM(k, c) {
  const top = 30, bot = 190, y = lerp(bot, top + 10, clamp(k));
  return `<svg width="110" height="260" viewBox="0 0 110 260"><rect x="33" y="12" width="44" height="200" rx="22" fill="#ffffff" stroke="#17256b" stroke-width="10"/>
    <rect x="45" y="${y.toFixed(1)}" width="20" height="${(212 - y).toFixed(1)}" rx="10" fill="${c}"/><circle cx="55" cy="215" r="34" fill="${c}" stroke="#17256b" stroke-width="10"/></svg>`;
}
const COMMENT_SVG = `<svg width="170" height="150" viewBox="0 0 170 150"><path d="M20 15 H150 Q160 15 160 25 V95 Q160 105 150 105 H75 L40 138 V105 H20 Q10 105 10 95 V25 Q10 15 20 15 Z" fill="#ffffff" stroke="#17256b" stroke-width="10" stroke-linejoin="round"/><circle cx="52" cy="60" r="10" fill="#2fb35a"/><circle cx="85" cy="60" r="10" fill="#2fb35a"/><circle cx="118" cy="60" r="10" fill="#2fb35a"/></svg>`;
const DOWN_ARROW = `<svg width="120" height="150" viewBox="0 0 120 150"><path d="M40 10 H80 V80 H110 L60 140 L10 80 H40 Z" fill="#ffd84a" stroke="#17256b" stroke-width="10" stroke-linejoin="round"/></svg>`;
const VEG = [BROC_SVG, CARROT_SVG, CAPS_SVG, SPIN_SVG, TOMATO_SVG, EGG_SVG];

function panel(x, y, w, h, a = 0.8, r = 46) {
  const g = ov.g;
  g.save();
  g.globalAlpha = a;
  g.fillStyle = 'rgba(14,20,58,1)';
  g.beginPath();
  g.roundRect(x, y, w, h, r);
  g.fill();
  g.globalAlpha = a * 0.4;
  g.strokeStyle = '#ffffff';
  g.lineWidth = 5;
  g.stroke();
  g.restore();
}
function label(text, x, y, { size = 44, color = '#fff', a = 1, align = 'center' } = {}) {
  const g = ov.g;
  g.save();
  g.globalAlpha = clamp(a);
  g.font = `800 ${size}px "Baloo 2"`;
  g.textAlign = align;
  g.textBaseline = 'middle';
  g.lineJoin = 'round';
  g.strokeStyle = 'rgba(10,14,40,0.85)';
  g.lineWidth = size * 0.22;
  g.strokeText(text, x, y);
  g.fillStyle = color;
  g.fillText(text, x, y);
  g.restore();
}
function tint(color, a) {
  if (a <= 0) return;
  const g = ov.g;
  g.save();
  g.globalAlpha = clamp(a);
  g.fillStyle = color;
  g.fillRect(0, 0, W, H);
  g.restore();
}

// ------------------------------------------------- gut diagram (2D, canvas)
// A winding gut drawn as a thick tube; u in 0..1 runs from the top-left
// entrance to the exit at the bottom right.
const GUT = [[170, 450], [900, 450], [900, 580], [180, 580], [180, 710], [880, 710], [880, 830]];
const GUT_LEN = (() => {
  let s = 0;
  const L = [0];
  for (let i = 1; i < GUT.length; i++) {
    s += Math.hypot(GUT[i][0] - GUT[i - 1][0], GUT[i][1] - GUT[i - 1][1]);
    L.push(s);
  }
  return L;
})();
function gutAt(u) {
  const d = clamp(u) * GUT_LEN[GUT_LEN.length - 1];
  for (let i = 1; i < GUT.length; i++) {
    if (d <= GUT_LEN[i]) {
      const k = (d - GUT_LEN[i - 1]) / (GUT_LEN[i] - GUT_LEN[i - 1]);
      return { x: lerp(GUT[i - 1][0], GUT[i][0], k), y: lerp(GUT[i - 1][1], GUT[i][1], k) };
    }
  }
  return { x: GUT[GUT.length - 1][0], y: GUT[GUT.length - 1][1] };
}
function drawGut(a, { swell = 0, t = 0 } = {}) {
  if (a <= 0) return;
  const g = ov.g;
  g.save();
  g.globalAlpha = a;
  g.lineJoin = 'round';
  g.lineCap = 'round';
  const path = () => {
    g.beginPath();
    GUT.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
  };
  path();
  g.strokeStyle = '#17256b';
  g.lineWidth = 104;
  g.stroke();
  path();
  g.strokeStyle = '#ff9fb0';
  g.lineWidth = 86;
  g.stroke();
  path();
  g.strokeStyle = '#ffc6cf';
  g.lineWidth = 40;
  g.stroke();
  if (swell > 0) {
    // bloated middle loop
    const p = gutAt(0.5);
    const r = 70 + 34 * swell + 5 * Math.sin(t * 6);
    g.fillStyle = '#17256b';
    g.beginPath();
    g.ellipse(p.x, p.y, r * 1.45 + 9, r + 9, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#ff8fa3';
    g.beginPath();
    g.ellipse(p.x, p.y, r * 1.45, r, 0, 0, Math.PI * 2);
    g.fill();
  }
  g.restore();
}
// food bits: deterministic colours/sizes; pos(i) -> u along the gut
const BITS = Array.from({ length: 9 }, (_, i) => ({ c: ['#c98a4a', '#e0b070', '#9a6a3a', '#d8a060'][i % 4], r: 22 + ((i * 37) % 13) }));
function drawBits(a, posU, jitter = 0, t = 0) {
  if (a <= 0) return;
  const g = ov.g;
  g.save();
  g.globalAlpha = a;
  BITS.forEach((b, i) => {
    const u = posU(i);
    if (u > 1.02) return;
    const p = gutAt(u);
    const jx = jitter * Math.sin(t * 9 + i * 2), jy = jitter * Math.cos(t * 7 + i);
    g.fillStyle = '#17256b';
    g.beginPath();
    g.arc(p.x + jx, p.y + jy, b.r + 6, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = b.c;
    g.beginPath();
    g.arc(p.x + jx, p.y + jy, b.r, 0, Math.PI * 2);
    g.fill();
  });
  g.restore();
}

// ------------------------------------------------------------- Affan poses
const _hw = new THREE.Vector3();
function handW(aff, side = 'R') {
  aff.root.updateMatrixWorld(true);
  return aff.parts.arms[side].index.getWorldPosition(_hw);
}
const cheer = (k) => ({
  armL: { reach: [lerp(0.55, 0.85, k), lerp(0.3, 1.9, k), lerp(0.1, 0.3, k)], pole: [1, -0.4, -0.5] },
  armR: { reach: [lerp(-0.55, -0.85, k), lerp(0.3, 1.9, k), lerp(0.1, 0.3, k)], pole: [-1, -0.4, -0.5] },
});
// hands on the tummy
const tummy = (k) => ({
  armL: { reach: [lerp(0.55, 0.12, k), lerp(0.3, 0.32, k), lerp(0.1, 0.62, k)], pole: [1, -0.8, 0.2] },
  armR: { reach: [lerp(-0.55, -0.14, k), lerp(0.3, 0.42, k), lerp(0.1, 0.62, k)], pole: [-1, -0.8, 0.2] },
});
function dinAffan(t, p = {}) {
  const aff = din.aff;
  aff.root.position.set(0, 0, 0);
  aff.pose({ blink: blinkAt(t, 2), talk: talk(t), smile: 0.7, ...p });
}
function garAffan(spot, t, p = {}) {
  const aff = gar.aff;
  aff.root.position.copy(spot);
  gar.focus(spot);
  aff.pose({ blink: blinkAt(t, 4), talk: talk(t), smile: 0.8, ...p });
}
// camera relative to a garden spot (giant veg stands behind, toward -z)
function spotCam(P, { x = 3, y = 3.2, z = 10, lx = 0, ly = 3.0, lz = 0, fov = 48 } = {}) {
  lookCam(V(P.x + x, P.y + y, P.z + z), V(P.x + lx, P.y + ly, P.z + lz), fov);
}
const headAt = (P) => V(P.x, 2.95, P.z);
function animFlies(t) {
  gar.flies.forEach((b, i) => {
    const { wl, wr, seed, r } = b.userData;
    const c = SPOT[['hub', 'broc', 'caps', 'carrot', 'spin', 'hub', 'broc', 'spin'][i]];
    b.position.set(c.x + Math.cos(t * 0.6 + seed) * r, 3 + Math.sin(t * 1.3 + seed) * 1.2 + 2, c.z - 3 + Math.sin(t * 0.5 + seed) * r * 0.6);
    b.rotation.set(0.3, t * 0.6 + seed, 0);
    const f = Math.sin(t * 22 + seed) * 0.9;
    wl.rotation.y = f;
    wr.rotation.y = -f;
  });
}

// ================================================================== SHOTS
const SHOTS = [
  // H1 — "Eee, sayur lagi? Affan nak makan ayam goreng je!"
  [0, 4.7, (t) => {
    const push = keys(t, [[0.9, 0], [1.35, 1], [2.1, 1], [2.5, 0]]);
    const yuck = keys(t, [[0.1, 0], [0.35, 1], [2.2, 1], [2.6, 0]]);
    const yum = keys(t, [[2.9, 0], [3.3, 1]]);
    din.plate.position.z = lerp(-0.15, 0.55, keys(t, [[1.0, 0], [1.5, 1]], easeOut));
    din.plate.rotation.y = 0.4 * keys(t, [[1.0, 0], [1.5, 1]]);
    dinAffan(t, {
      brow: lerp(0, -0.6, yuck) + 0.6 * yum, smile: lerp(0.6, 0.1, yuck) + 0.6 * yum, headYaw: lerp(0, -0.35, yuck), headRoll: 0.08 * yuck, lean: -0.08 * yuck,
      armR: push > 0.01 ? { reach: [lerp(-0.55, -0.25, push), lerp(0.3, 0.5, push), lerp(0.1, 1.3, push)], pole: [-1, -0.6, -0.2], wx: -0.6 * push } : undefined,
      ...(yum > 0.01 ? { armL: { reach: [lerp(0.55, 0.28, yum), lerp(0.3, 0.55, yum), lerp(0.1, 0.62, yum)], pole: [1, -0.8, 0.2] } } : {}),
      lookX: 0.25 * yum, lookY: 0.2 * yum,
    });
    const k = easeInOut(inv(0, 4.7, t));
    lookCam(V(lerp(1.4, 0.6, k), lerp(3.4, 3.2, k), lerp(9.2, 7.6, k)), V(0, lerp(2.3, 2.5, k), 0), 46);
    const q = pop(t, 0.2, 4.65);
    ov.tag('ep', 'EPISOD 17', { x: W / 2, y: 300, o: q.o, s: q.s }, { bg: GREEN, small: true });
    const e = pop(t, 0.16, 2.6, { from: 2 });
    ov.bubble('eee', 'EEE!', { x: 300 + Math.sin(t * 30) * 4 * e.o, y: 560, o: e.o, s: e.s, r: -8 }, { size: 160, top: '#e8ffd8', bot: '#5fbf4a' });
    const b = pop(t, 0.88, 2.6);
    ov.html('brocA', BROC_SVG, { x: 820, y: 620, o: b.o, s: b.s * 0.95, r: 8 });
    ov.html('brocX', ICONS.cross(), { x: 820, y: 620, o: b.o, s: b.s * 0.75 });
    const d = pop(t, 3.04, 4.65);
    ov.html('drum', DRUM_SVG, { x: 790, y: 600 + Math.sin(t * 4) * 10, o: d.o, s: d.s * 1.05, r: -8 });
    ov.tag('ayam', 'AYAM GORENG!', { x: 760, y: 780, o: d.o, s: d.s }, { bg: ORANGE, small: true });
    if (d.o > 0) ov.sparkles(t, { n: 10, seed: 3, x: 620, y: 470, w: 340, h: 300, a: d.o });
    return din;
  }],
  // H2 — "Tapi... apa jadi kalau kita tak makan sayur langsung?"
  [4.7, 8.5, (t) => {
    din.plate.position.z = 0.55;
    din.plate.rotation.y = 0.4;
    const think = keys(t, [[4.8, 0], [5.2, 1]]);
    const th = POSES.thinkR.armR;
    dinAffan(t, {
      brow: 0.7, smile: 0.5, headRoll: -0.12 * think, lookX: 0.35, lookY: 0.3, headYaw: 0.1,
      armR: think > 0.01 ? { reach: th.reach.map((v, i) => lerp([-0.55, 0.3, 0.1][i], v, think)), pole: th.pole, point: think, wx: th.wx * think } : undefined,
    });
    const k = easeInOut(inv(4.7, 8.5, t));
    lookCam(V(lerp(-1.4, -0.6, k), lerp(3.2, 2.9, k), lerp(6.4, 5.6, k)), V(0.2, 2.75, 0), 46);
    const head = scr(V(0, 2.95, 0));
    [[4.85, -270, -240, '#ffcf33', -12], [5.1, 260, -270, '#3fa2ff', 10], [6.5, 300, -40, '#ff8a3d', 14]].forEach(([at, dx, dy, c, r], i) => {
      const q = pop(t, at, 8.45);
      ov.html('qq' + i, ICONS.qmark(c), { x: head.x + dx, y: head.y + dy + Math.sin(t * 3 + i) * 10, o: q.o, s: q.s * 0.85, r });
    });
    const s = pop(t, 7.0, 8.45, { from: 2 });
    ov.bubble('tak', 'TAK MAKAN\nSAYUR?', { x: W / 2, y: 1130, o: s.o, s: s.s, r: -3 }, { size: 120, top: '#e8ffd8', bot: '#5fbf4a' });
    return din;
  }],
  // T — title + "Jom ikut Affan cari jawapan!" (swirl into the garden)
  [8.5, 10.4, (t) => {
    din.plate.position.z = 0.55;
    const up = keys(t, [[8.6, 0], [8.95, 1]], easeOut);
    dinAffan(t, { smile: 1, brow: 0.8, ...cheer(up), lookY: 0.15 });
    const k = easeOut(inv(8.5, 10.4, t));
    lookCam(V(0, lerp(3.4, 3.8, k), lerp(9.5, 11.5, k)), V(0, 2.6, 0), 46);
    const p = pop(t, 8.55, 10.35, { fin: 0.45 });
    ov.bubble('title', 'KESAN KALAU\nTAK MAKAN\nSAYUR', { x: W / 2, y: 560 + Math.sin(t * 3) * 6, o: p.o, s: p.s }, { size: 116, top: '#e8ffd8', bot: '#3fb34a' });
    const q = pop(t, 8.6, 10.35);
    ov.tag('ep2', 'EPISOD 17', { x: W / 2, y: 300, o: q.o, s: q.s }, { bg: GREEN, small: true });
    const sw = inv(9.3, 10.4, t);
    ov.swirl(t, W / 2, 900, sw, 7);
    ov.flash(Math.pow(inv(10.0, 10.4, t), 2));
    return din;
  }],
  // G1 — "Waaah, kebun sayur gergasi!"
  [10.4, 13.4, (t) => {
    const P = SPOT.hub;
    const wow = keys(t, [[10.5, 0], [10.7, 0.9], [11.3, 0.9], [11.5, 0]]);
    const up = keys(t, [[11.6, 0], [12.0, 1], [13.0, 1], [13.4, 0.4]], easeOut);
    const jump = t > 12.0 && t < 12.6 ? Math.sin(((t - 12.0) / 0.6) * Math.PI) * 0.35 : 0;
    garAffan(P, t, { wow, brow: 1, smile: 1, bob: jump, ...cheer(up), headPitch: -0.12, lookY: 0.3, yaw: 0.15 });
    animFlies(t);
    const k = easeInOut(inv(10.4, 13.4, t));
    lookCam(V(lerp(3, -2, k), lerp(2.2, 9, k), lerp(9, 20, k)), V(0, lerp(3.4, 4.5, k), lerp(0, -6, k)), lerp(48, 56, k));
    ov.flash(1 - inv(10.4, 10.75, t));
    ov.sparkles(t, { n: 24, seed: 4, y: 300, h: 800, a: inv(10.5, 10.9, t) * (1 - inv(12.8, 13.4, t)) });
    const q = pop(t, 11.28, 13.35, { from: 2 });
    ov.bubble('keb', 'KEBUN SAYUR\nGERGASI!', { x: W / 2, y: 470, o: q.o, s: q.s, r: -3 }, { size: 118, top: '#e8ffd8', bot: '#3fb34a' });
    return gar;
  }],
  // F1 — fibre: "Sayur ada serat. Serat ni macam penyapu dalam perut. Dia tolak sisa makanan keluar."
  [13.4, 19.45, (t) => {
    const P = SPOT.broc;
    garAffan(P, t, { smile: 0.95, brow: 0.5, yaw: -0.25, headYaw: 0.15 * wobble(t, 1), lookX: 0.2, ...(t > 16.4 ? tummy(keys(t, [[16.4, 0], [16.8, 0.7]])) : {}) });
    animFlies(t);
    const k = easeInOut(inv(13.4, 19.45, t));
    spotCam(P, { x: lerp(-5, -3, k), y: lerp(3.0, 3.6, k), z: lerp(11, 13, k), lx: -1.5, ly: lerp(4.5, 5.2, k), lz: -3, fov: 52 });
    ov.flash((1 - inv(13.4, 13.7, t)) * 0.8);
    const s = pop(t, 13.9, 15.0, { from: 2 });
    ov.bubble('serat', 'SERAT!', { x: 700, y: 560, o: s.o, s: s.s, r: 4 }, { size: 150, top: '#f4ffc8', bot: '#8fcf3a' });
    // gut diagram with the broom pushing food along
    const o = clamp(inv(14.9, 15.3, t)) * (1 - inv(19.2, 19.45, t));
    if (o > 0) {
      panel(70, 330, 940, 620, 0.86 * o);
      label('PERUT & USUS', W / 2, 395, { size: 46, color: '#ffc6cf', a: o });
      drawGut(o);
      const sweep = easeInOut(inv(17.4, 19.2, t));
      drawBits(o, (i) => 0.06 + i * 0.045 + sweep * 0.62 + (i < 3 ? 0 : 0), 0, t);
      const bu = 0.02 + sweep * 0.62;
      const bp = gutAt(bu);
      const bo = pop(t, 15.84, 19.4);
      ov.html('broom', BROOM_SVG, { x: bp.x - 40, y: bp.y - 70, o: bo.o * o, s: bo.s * 0.8, r: -8 + Math.sin(t * 12) * 8 * clamp(inv(17.4, 17.6, t)) });
      const pe = pop(t, 15.84, 18.6);
      ov.tag('peny', 'MACAM PENYAPU!', { x: W / 2, y: 900, o: pe.o * o, s: pe.s }, { bg: '#7fb03a' });
      const ke = pop(t, 18.64, 19.4, { from: 2 });
      const ep = gutAt(1);
      ov.html('outArr', DOWN_ARROW, { x: ep.x, y: ep.y + 30 + Math.abs(Math.sin(t * 7)) * 14, o: ke.o * o, s: ke.s * 0.55 });
      ov.tag('kel', 'KELUAR!', { x: W / 2, y: 900, o: ke.o * o, s: ke.s }, { bg: GREEN });
    }
    return gar;
  }],
  // F2 — constipation: "Kalau tak makan sayur, susah nak buang air besar. Perut rasa sakit dan kembung. Itu namanya sembelit!"
  [19.45, 27.1, (t) => {
    const P = SPOT.broc;
    const hold = keys(t, [[21.0, 0], [21.5, 1]]);
    const ache = keys(t, [[23.5, 0], [23.9, 1]]);
    garAffan(P, t, {
      ...tummy(hold), smile: lerp(0.5, 0.05, hold), brow: lerp(0.3, -0.5, hold), lean: 0.12 * ache, headPitch: 0.15 * ache, tilt: Math.sin(t * 30) * 0.015 * ache,
      bob: -0.05 * ache, yaw: 0.1, lookY: -0.15 * ache, wow: keys(t, [[26.1, 0], [26.3, 0.5], [26.8, 0.5], [27.0, 0]]),
    });
    animFlies(t);
    const k = easeInOut(inv(19.45, 27.1, t));
    spotCam(P, { x: lerp(3, 2, k), y: lerp(3.4, 3.3, k), z: lerp(10, 8.6, k), lx: 0, ly: 3.4, fov: 50 });
    ov.flash((1 - inv(19.45, 19.7, t)) * 0.7);
    const no = pop(t, 19.57, 21.0);
    ov.html('noBroc', BROC_SVG, { x: 230, y: 470, o: no.o, s: no.s * 0.8, r: -8 });
    ov.html('noX', ICONS.cross(), { x: 230, y: 470, o: no.o, s: no.s * 0.65 });
    // clogged gut: bits bunch up and stop in the middle
    const o = clamp(inv(21.0, 21.4, t)) * (1 - inv(25.1, 25.4, t));
    if (o > 0) {
      panel(70, 330, 940, 620, 0.86 * o);
      label('USUS TERSUMBAT', W / 2, 395, { size: 46, color: '#ffb38a', a: o });
      const sw = clamp(inv(24.4, 24.9, t));
      drawGut(o, { swell: sw, t });
      const crawl = easeOut(inv(21.0, 22.6, t));
      drawBits(o, (i) => 0.3 + crawl * 0.12 + i * 0.022, 4 * (1 - crawl * 0.5), t);
      const su = pop(t, 21.12, 25.3);
      ov.tag('susah', 'SUSAH NAK KELUAR!', { x: W / 2, y: 900, o: su.o * o, s: su.s }, { bg: RED });
      const sk = pop(t, 23.64, 25.3);
      ov.tag('sakit', 'SAKIT PERUT', { x: 230, y: 1010, o: sk.o * o, s: sk.s }, { bg: '#e0563a', small: true });
      const kb = pop(t, 24.4, 25.3, { from: 2 });
      ov.tag('kemb', 'KEMBUNG!', { x: 870, y: 1010, o: kb.o * o, s: kb.s }, { bg: ORANGE, small: true });
    }
    const tm = pop(t, 25.2, 27.05);
    ov.html('tum', TUMMY_SVG(true), { x: 830, y: 760 + Math.sin(t * 20) * 4, o: tm.o, s: tm.s * 0.9, r: 6 });
    const sb = pop(t, 26.2, 27.05, { from: 2.2 });
    ov.bubble('semb', 'SEMBELIT!', { x: W / 2, y: 470, o: sb.o, s: sb.s, r: -4 }, { size: 150, top: '#ffe0b0', bot: '#ff7a2d' });
    return gar;
  }],
  // V1 — vitamin C: "Sayur juga penuh vitamin. Vitamin C bantu askar badan lawan kuman."
  [27.1, 32.35, (t) => {
    const P = SPOT.caps;
    const pt = keys(t, [[29.1, 0], [29.5, 1], [30.4, 1], [30.8, 0]]);
    const up = keys(t, [[31.2, 0], [31.5, 1]], easeOut);
    garAffan(P, t, {
      smile: 1, brow: 0.6, yaw: 0.2, headYaw: -0.1, lookY: 0.2,
      armL: pt > 0.01 ? { reach: [lerp(0.55, 0.9, pt), lerp(0.3, 1.5, pt), lerp(0.1, 0.0, pt)], point: pt, pole: [1, -0.5, -0.3] } : up > 0.01 ? cheer(up).armL : undefined,
      armR: up > 0.01 ? cheer(up).armR : undefined,
    });
    animFlies(t);
    const k = easeInOut(inv(27.1, 32.35, t));
    spotCam(P, { x: lerp(-4, -2, k), y: lerp(2.4, 3.2, k), z: lerp(12, 14, k), lx: 1.5, ly: lerp(5.2, 5.6, k), lz: -3, fov: 52 });
    ov.flash((1 - inv(27.1, 27.4, t)) * 0.8);
    // vitamins pop out of the veg
    [[28.44, 200, 430, '#ffd84a', 'VIT'], [28.6, 880, 520, '#ff9a3d', 'VIT'], [28.75, 560, 380, '#8fe39a', 'VIT']].forEach(([at, x, y, c], i) => {
      const q = pop(t, at, 29.3);
      ov.tag('vit' + i, 'VITAMIN', { x, y: y + Math.sin(t * 4 + i) * 10, o: q.o, s: q.s }, { bg: c === '#8fe39a' ? GREEN : c === '#ff9a3d' ? ORANGE : '#e0a400', small: true });
    });
    const vc = pop(t, 29.2, 32.3, { from: 2 });
    ov.bubble('vc', 'VITAMIN C', { x: W / 2, y: 400, o: vc.o, s: vc.s, r: -3 }, { size: 130, top: '#fff3a0', bot: '#ff9a1f' });
    ov.html('vcCaps', CAPS_SVG, { x: 150, y: 470, o: vc.o, s: vc.s * 0.62, r: -10 });
    ov.html('vcBroc', BROC_SVG, { x: 940, y: 470, o: vc.o, s: vc.s * 0.6, r: 10 });
    // soldiers vs germs
    const fight = clamp(inv(30.4, 30.7, t));
    if (fight > 0) {
      panel(70, 520, 940, 480, 0.84 * fight * (1 - inv(32.1, 32.35, t)));
      const adv = easeInOut(inv(31.0, 31.8, t));
      [0, 1, 2].forEach((i) => {
        const q = pop(t, 30.6 + i * 0.1, 32.3);
        ov.html('sol' + i, SOLDIER(0), { x: lerp(220, 430, adv) + (i % 2) * 40, y: 640 + i * 125 + Math.sin(t * 8 + i) * 6, o: q.o, s: q.s * 0.72 });
      });
      [0, 1, 2].forEach((i) => {
        const hit = 31.55 + i * 0.12;
        const q = pop(t, 30.8 + i * 0.08, hit + 0.15, { fout: 0.15 });
        const gx = 820 - (i % 2) * 60, gy = 640 + i * 125;
        ov.html('germ' + i, GERM(['#9b5cff', '#5fc24a', '#ff6ab0'][i], 1), { x: gx + Math.sin(t * 11 + i) * 8, y: gy, o: q.o, s: q.s * 0.7, r: Math.sin(t * 5 + i) * 10 });
        const pf = inv(hit, hit + 0.35, t);
        if (pf > 0 && pf < 1) ov.star(gx, gy, 70 * pf, 1 - pf, '#fff6c8', t);
      });
      const as = pop(t, 30.6, 32.3);
      ov.tag('askar', 'ASKAR BADAN', { x: 300, y: 560, o: as.o * fight, s: as.s }, { bg: BLUE, small: true });
      const km = pop(t, 31.2, 32.3);
      ov.tag('kuman', 'LAWAN KUMAN!', { x: 760, y: 560, o: km.o * fight, s: km.s }, { bg: PURPLE, small: true });
    }
    return gar;
  }],
  // V2 — "Kurang sayur, askar badan jadi lemah. Senang jatuh sakit!"
  [32.35, 36.8, (t) => {
    const P = SPOT.caps;
    const sick = keys(t, [[35.2, 0], [35.6, 1]]);
    const sneeze = t > 36.0 && t < 36.5 ? Math.sin(((t - 36.0) / 0.5) * Math.PI) : 0;
    garAffan(P, t, {
      ...tummy(0.4 * sick), smile: lerp(0.5, 0.05, sick), brow: lerp(0.2, -0.5, sick), headPitch: 0.1 * sick - 0.25 * sneeze, lean: 0.1 * sick - 0.12 * sneeze, blink: Math.max(blinkAt(t, 4), 0.35 * sick, sneeze),
      yaw: 0.05, lookY: -0.2 * sick,
    });
    animFlies(t);
    const k = easeInOut(inv(32.35, 36.8, t));
    spotCam(P, { x: lerp(2.4, 1.6, k), y: lerp(3.2, 3.0, k), z: lerp(9.5, 8.6, k), ly: 2.4, fov: 46 });
    tint('rgb(40,50,90)', 0.28 * clamp(inv(32.5, 33.5, t)));
    ov.flash((1 - inv(32.35, 32.6, t)) * 0.6);
    const lv = pop(t, 32.43, 36.75);
    ov.html('lvC', CAPS_SVG, { x: 150, y: 900, o: lv.o, s: lv.s * 0.6, r: -8 });
    ov.html('lvX', ICONS.cross(), { x: 150, y: 900, o: lv.o, s: lv.s * 0.5 });
    // tired soldiers, more and more germs
    const o = clamp(inv(33.5, 33.8, t)) * (1 - inv(36.55, 36.8, t));
    if (o > 0) {
      panel(70, 300, 940, 470, 0.84 * o);
      [0, 1].forEach((i) => {
        const q = pop(t, 33.64 + i * 0.1, 36.7);
        ov.html('wsol' + i, SOLDIER(1), { x: 220 + i * 90, y: 450 + i * 130, o: q.o * o, s: q.s * 0.72, r: -12 + Math.sin(t * 2 + i) * 4 });
      });
      for (let i = 0; i < 6; i++) {
        const q = pop(t, 34.0 + i * 0.25, 36.7);
        const gx = 560 + (i % 3) * 150, gy = 440 + Math.floor(i / 3) * 170;
        ov.html('wg' + i, GERM(['#9b5cff', '#5fc24a', '#ff6ab0'][i % 3], 1), { x: gx + Math.sin(t * 6 + i) * 10, y: gy + Math.cos(t * 5 + i) * 8, o: q.o * o, s: q.s * 0.72 });
      }
      const lm = pop(t, 34.6, 36.7);
      ov.tag('lemah', 'LEMAH...', { x: 270, y: 330, o: lm.o * o, s: lm.s }, { bg: GREY, small: true });
    }
    const th = pop(t, 35.36, 36.75);
    ov.html('thS', THERM(0.85, RED), { x: 930, y: 920, o: th.o, s: th.s * 0.8, r: 8 });
    const sk = pop(t, 35.36, 36.75, { from: 2 });
    ov.bubble('sakit2', 'SENANG SAKIT!', { x: W / 2, y: 1200, o: sk.o, s: sk.s, r: -3 }, { size: 112, top: '#ffe0d6', bot: '#ff5a3d' });
    if (sneeze > 0.2) ov.bubble('hachoo', 'HACHUM!', { x: 700, y: 860, o: sneeze, s: 0.7 + 0.3 * sneeze, r: 6 }, { size: 100, top: '#ffffff', bot: '#9fe0ff' });
    return gar;
  }],
  // A — "Lobak merah bagi vitamin A. Bantu mata kita nampak dalam gelap."
  [36.8, 41.35, (t) => {
    const P = SPOT.carrot;
    const pt = keys(t, [[37.0, 0], [37.4, 1], [38.6, 1], [38.9, 0]]);
    const dark = clamp(inv(38.96, 39.5, t));
    const see = keys(t, [[39.9, 0], [40.2, 1]]);
    garAffan(P, t, {
      smile: 1, brow: 0.6 + 0.4 * see, wow: 0.0, yaw: -0.2, headYaw: lerp(0.25, -0.15, see), lookX: lerp(0.4, -0.2, see), lookY: 0.15,
      armR: pt > 0.01 ? { reach: [lerp(-0.55, -0.95, pt), lerp(0.3, 1.45, pt), lerp(0.1, 0.0, pt)], point: pt, pole: [-1, -0.5, -0.3] } : see > 0.01 ? { reach: [lerp(-0.55, -0.28, see), lerp(0.3, 1.3, see), lerp(0.1, 0.75, see)], pole: [-1, -0.6, -0.2], point: 0 } : undefined,
    });
    animFlies(t);
    const k = easeInOut(inv(36.8, 41.35, t));
    spotCam(P, { x: lerp(4, 3, k), y: lerp(2.6, 3.0, k), z: lerp(12, 10, k), lx: -1, ly: lerp(4.5, 3.4, k), lz: -3, fov: 52 });
    ov.flash((1 - inv(36.8, 37.1, t)) * 0.8);
    tint('rgb(10,14,50)', 0.62 * dark);
    const va = pop(t, 37.84, 41.3, { from: 2 });
    ov.bubble('va', 'VITAMIN A', { x: W / 2, y: 400, o: va.o, s: va.s, r: -3 }, { size: 130, top: '#ffd9a8', bot: '#ff7a1f' });
    const ca = pop(t, 36.87, 41.3);
    ov.html('carS', CARROT_SVG, { x: 150, y: 600 + Math.sin(t * 3) * 8, o: ca.o, s: ca.s * 0.75, r: -12 });
    const ey = pop(t, 39.4, 41.3);
    ov.html('eye', EYE_SVG, { x: W / 2, y: 690, o: ey.o, s: ey.s * (1 + 0.04 * Math.sin(t * 5)) });
    if (dark > 0) {
      ov.html('moon', MOON_SVG, { x: 900, y: 560, o: dark * ey.o, s: 0.8, r: 10 });
      ov.sparkles(t, { n: 18, seed: 23, y: 450, h: 500, a: dark * 0.9, colors: ['#fff6c8', '#ffd84a'] });
    }
    const np = pop(t, 40.0, 41.3);
    ov.tag('nampak', 'NAMPAK DALAM GELAP!', { x: W / 2, y: 900, o: np.o, s: np.s }, { bg: PURPLE });
    return gar;
  }],
  // I — "Bayam pula ada zat besi. Kurang zat besi, badan cepat penat."
  [41.35, 46.55, (t) => {
    const P = SPOT.spin;
    const flex = keys(t, [[42.4, 0], [42.75, 1], [43.2, 1], [43.5, 0]]);
    const tired = keys(t, [[43.5, 0], [44.4, 1]]);
    garAffan(P, t, {
      smile: lerp(1, 0.15, tired), brow: lerp(0.6, -0.3, tired), lean: 0.1 * tired, headPitch: 0.16 * tired, headRoll: 0.14 * tired, bob: -0.12 * tired,
      blink: Math.max(blinkAt(t, 4), 0.55 * tired), yaw: 0.15, lookY: -0.3 * tired,
      ...(flex > 0.01 ? {
        armL: { reach: [lerp(0.55, 0.95, flex), lerp(0.3, 1.25, flex), lerp(0.1, 0.1, flex)], pole: [1, -1, 0] },
        armR: { reach: [lerp(-0.55, -0.95, flex), lerp(0.3, 1.25, flex), lerp(0.1, 0.1, flex)], pole: [-1, -1, 0] },
      } : {}),
    });
    animFlies(t);
    const k = easeInOut(inv(41.35, 46.55, t));
    if (t < 43.4) spotCam(P, { x: lerp(-4, -3, inv(41.35, 43.4, t)), y: 3.0, z: 12, lx: 0.5, ly: 4.2, lz: -3, fov: 52 });
    else spotCam(P, { x: lerp(2.2, 1.6, k), y: lerp(3.0, 2.8, k), z: lerp(8.6, 7.6, k), ly: 2.5, fov: 46 });
    ov.flash((1 - inv(41.35, 41.65, t)) * 0.8 + (1 - inv(43.4, 43.6, t)) * (t > 43.4 ? 0.5 : 0));
    const by = pop(t, 41.44, 43.35);
    ov.html('spin', SPIN_SVG, { x: 170, y: 520, o: by.o, s: by.s * 0.8, r: -10 });
    ov.tag('bayam', 'BAYAM', { x: 170, y: 680, o: by.o, s: by.s }, { bg: GREEN, small: true });
    const fe = pop(t, 42.44, 43.35, { from: 2 });
    ov.html('fe', FE_SVG, { x: 880, y: 520, o: fe.o, s: fe.s * 0.95, r: 8 });
    ov.bubble('zat', 'ZAT BESI!', { x: W / 2, y: 400, o: fe.o, s: fe.s, r: -3 }, { size: 130, top: '#eef2fa', bot: '#8a97b0' });
    // tired: the battery drains
    const bt = pop(t, 43.42, 46.5);
    const lvl = 1 - easeInOut(inv(43.6, 45.9, t)) * 0.85;
    ov.html('bat', BATTERY(lvl), { x: W / 2, y: 470 + Math.sin(t * 2) * 6, o: bt.o, s: bt.s * 1.2 });
    const pn = pop(t, 45.84, 46.5, { from: 2 });
    ov.bubble('penat', 'PENAT...', { x: W / 2, y: 1220, o: pn.o, s: pn.s, r: -3 }, { size: 120, top: '#eef2fa', bot: '#8a97b0' });
    return gar;
  }],
  // R — "Waaah, rupanya sayur ni kecil, tapi kuasanya besar!"
  [46.55, 51.1, (t) => {
    const P = SPOT.hub;
    const up = keys(t, [[46.6, 0], [46.95, 1], [48.4, 1], [48.8, 0]], easeOut);
    const flex = keys(t, [[50.1, 0], [50.45, 1]]);
    const jump = t > 46.7 && t < 47.3 ? Math.sin(((t - 46.7) / 0.6) * Math.PI) * 0.35 : 0;
    garAffan(P, t, {
      smile: 1, brow: 0.9, bob: jump, wow: keys(t, [[46.6, 0], [46.8, 0.8], [47.3, 0.8], [47.5, 0]]), yaw: 0.1, lookY: 0.1,
      ...(flex > 0.01 ? {
        armL: { reach: [lerp(0.55, 0.95, flex), lerp(0.3, 1.25, flex), 0.1], pole: [1, -1, 0] },
        armR: { reach: [lerp(-0.55, -0.95, flex), lerp(0.3, 1.25, flex), 0.1], pole: [-1, -1, 0] },
      } : cheer(up)),
    });
    animFlies(t);
    const k = easeOut(inv(46.55, 51.1, t));
    spotCam(P, { x: lerp(0, 1.5, k), y: lerp(2.8, 3.4, k), z: lerp(9, 12, k), ly: lerp(2.8, 3.4, k), fov: 48 });
    ov.flash((1 - inv(46.55, 46.85, t)) * 0.9);
    ov.sparkles(t, { n: 26, seed: 31, y: 260, h: 700, a: inv(46.6, 47.0, t) });
    // ring of vegetable icons
    VEG.forEach((svg, i) => {
      const q = pop(t, 47.6 + i * 0.16, 51.05);
      const a = Math.PI * (1.08 + (i / (VEG.length - 1)) * 0.84);
      const x = W / 2 + Math.cos(a) * 400, y = 860 + Math.sin(a) * 430;
      ov.html('rv' + i, svg, { x, y: y + Math.sin(t * 3 + i) * 10, o: q.o, s: q.s * 0.62, r: Math.sin(t * 2 + i) * 8 });
    });
    const kc = pop(t, 48.68, 51.05);
    ov.tag('kecil', 'KECIL...', { x: 300, y: 1000, o: kc.o, s: kc.s }, { bg: GREEN, small: true });
    const kb = pop(t, 50.24, 51.05, { from: 2.2 });
    ov.bubble('kuasa', 'KUASANYA\nBESAR!', { x: W / 2, y: 1120, o: kb.o, s: kb.s, r: -3 }, { size: 130 });
    return gar;
  }],
  // E — "Makan sayur warna-warni setiap hari, ya!" (back home, eating broccoli)
  [51.1, 53.7, (t) => {
    din.plate.position.z = -0.15;
    din.plate.rotation.y = 0;
    const eat = keys(t, [[51.2, 0], [51.6, 1], [52.6, 1], [52.9, 0]]);
    const chew = eat > 0.9 ? 0.5 + 0.5 * Math.sin(t * 18) : 0;
    const th = keys(t, [[52.9, 0], [53.2, 1]]);
    dinAffan(t, {
      smile: 1, brow: 0.7, talk: Math.max(talk(t), chew * 0.4), headPitch: 0.05, lookY: 0.15 * eat,
      armR: th > 0.01 ? { ...POSES.thumbsUpR.armR, thumb: th } : { reach: [lerp(-0.55, -0.2, eat), lerp(0.3, 1.32, eat), lerp(0.1, 0.78, eat)], pole: [-1, -0.6, -0.2], wx: -0.3 * eat },
      armL: { reach: [0.5, 0.75, 0.75], pole: [1, -0.8, 0.2] },
    });
    din.bite.visible = eat > 0.05 && th < 0.5;
    if (din.bite.visible) {
      const h = handW(din.aff);
      din.bite.position.set(h.x + 0.05, h.y + 0.05, h.z + 0.08);
    }
    const k = easeInOut(inv(51.1, 53.7, t));
    lookCam(V(lerp(-1.2, -0.5, k), lerp(3.2, 3.0, k), lerp(7.0, 6.2, k)), V(0, 2.55, 0), 46);
    ov.flash((1 - inv(51.1, 51.4, t)) * 0.9);
    const yum = pop(t, 51.6, 53.65, { from: 2 });
    ov.bubble('sedap', 'SEDAP!', { x: 300, y: 560, o: yum.o, s: yum.s, r: -6 }, { size: 120, top: '#e8ffd8', bot: '#3fb34a' });
    const ww = pop(t, 51.92, 53.65);
    [BROC_SVG, CARROT_SVG, CAPS_SVG, SPIN_SVG, EGG_SVG].forEach((svg, i) => {
      const q = pop(t, 51.92 + i * 0.08, 53.65);
      ov.html('ww' + i, svg, { x: 170 + i * 185, y: 1180 + Math.sin(t * 4 + i) * 8, o: q.o, s: q.s * 0.5 });
    });
    ov.bubble('warna', 'WARNA-WARNI!', { x: W / 2, y: 390, o: ww.o, s: ww.s, r: -2 }, { size: 112, top: '#ffe0f0', bot: '#ff5aa8' });
    const sh = pop(t, 52.48, 53.65);
    ov.tag('hari', 'SETIAP HARI!', { x: 760, y: 560, o: sh.o, s: sh.s }, { bg: ORANGE });
    return din;
  }],
  // C — "Sayur apa yang korang paling suka? Komen kat bawah!"
  [53.7, 56.95, (t) => {
    const ptV = keys(t, [[53.8, 0], [54.15, 1], [55.3, 1], [55.6, 0]]);
    const down = keys(t, [[55.5, 0], [55.85, 1]]);
    dinAffan(t, {
      smile: 1, brow: 0.6, headRoll: -0.08 * ptV, headPitch: 0.15 * down, lookY: 0.1 - 0.5 * down,
      armR: ptV > 0.01 ? { reach: [lerp(-0.55, -0.3, ptV), lerp(0.3, 1.05, ptV), lerp(0.1, 1.0, ptV)], point: ptV, pole: [-1, -0.6, -0.3] }
        : down > 0.01 ? { reach: [lerp(-0.55, -0.5, down), lerp(0.3, 0.45, down), lerp(0.1, 1.05, down)], point: down, pole: [-1, -0.6, -0.3], wx: 0.9 * down } : undefined,
    });
    din.bite.visible = false;
    const k = easeInOut(inv(53.7, 56.95, t));
    lookCam(V(lerp(1.0, 0.6, k), lerp(3.1, 3.0, k), lerp(6.6, 5.8, k)), V(0, 2.65, 0), 46);
    const head = scr(V(0, 2.95, 0));
    [[53.9, -290, -230, '#ffcf33', -12], [54.2, 290, -250, '#3fa2ff', 10]].forEach(([at, dx, dy, c, r], i) => {
      const q = pop(t, at, 56.9);
      ov.html('qk' + i, ICONS.qmark(c), { x: head.x + dx, y: head.y + dy + Math.sin(t * 3 + i) * 10, o: q.o, s: q.s * 0.85, r });
    });
    VEG.slice(0, 4).forEach((svg, i) => {
      const q = pop(t, 54.48 + i * 0.1, 56.9);
      ov.html('cv' + i, svg, { x: [150, 930, 150, 930][i], y: [700, 700, 940, 940][i] + Math.sin(t * 3 + i) * 8, o: q.o, s: q.s * 0.5, r: (i % 2 ? 8 : -8) });
    });
    const c = pop(t, 55.6, 56.92);
    ov.html('cIcon', COMMENT_SVG, { x: 870, y: 1110, o: c.o, s: c.s * 0.9, r: 6 });
    ov.tag('komen', 'KOMEN DI BAWAH!', { x: W / 2, y: 1220, o: c.o, s: c.s }, { bg: ORANGE });
    if (c.o > 0) ov.html('dArr', DOWN_ARROW, { x: W / 2, y: 1330 + Math.abs(Math.sin(t * 6)) * 20, o: c.o, s: 0.55 * c.s });
    return din;
  }],
  // Outro — The Curious Affan logo
  [56.95, DURATION, (t) => {
    const k = easeOut(inv(56.95, 57.65, t));
    outro.aff.root.position.set(0, 0, 0);
    const th2 = POSES.thinkR.armR;
    outro.aff.pose({ ...POSES.thinkR, armR: { ...th2 }, smile: 1, blink: blinkAt(t, 9), headRoll: -0.08, lookX: 0.25, lookY: 0.15, headYaw: 0.08,
      armL: { reach: [0.9, 0.55, 0.45], pole: [1, -0.8, 0], wx: -0.3 } });
    const hl = handW(outro.aff, 'L');
    outro.held.position.set(hl.x - 0.05, hl.y + 0.05, hl.z + 0.05);
    lookCam(V(0, 2.6, lerp(7.5, 5.4, k)), V(0, 2.3, 0), 40);
    const hc = scr(V(0, 2.95, 0));
    ov.flash((1 - inv(56.95, 57.3, t)) * 1.0);
    const g = ov.g;
    const ra = inv(57.05, 57.65, t);
    g.save();
    g.globalAlpha = ra;
    g.strokeStyle = '#ffe58a';
    g.shadowColor = '#fff3b0';
    g.shadowBlur = 40;
    g.lineWidth = 14;
    g.beginPath();
    g.arc(W / 2, hc.y, 420 * (0.85 + 0.15 * easeOut(ra)), 0, Math.PI * 2);
    g.stroke();
    g.restore();
    ov.sparkles(t, { n: 30, seed: 41, y: 260, h: 1150, a: ra });
    const ic = pop(t, 57.55, 99);
    ov.html('oCar', CARROT_SVG, { x: 170, y: 470 + Math.sin(t * 2) * 8, o: ic.o, s: ic.s * 0.6, r: -14 });
    ov.html('oQ1', ICONS.qmark('#ffcf33'), { x: 880, y: 420 + Math.sin(t * 2 + 1) * 8, o: ic.o, s: ic.s * 0.9, r: 12 });
    ov.html('oTom', TOMATO_SVG, { x: 220, y: 760 + Math.sin(t * 2 + 2) * 8, o: ic.o, s: ic.s * 0.5, r: -12 });
    const l1 = pop(t, 57.25, 99), l2 = pop(t, 57.45, 99), l3 = pop(t, 57.65, 99);
    drawLogo(ov, { k: [l1, l2, l3], star: pop(t, 57.85, 99) });
    return outro;
  }],
];

function frame(t) {
  ov.begin();
  cam.aspect = W / H;
  cam.updateProjectionMatrix();
  const shot = SHOTS.find(([a, b]) => t >= a && t < b) || SHOTS[SHOTS.length - 1];
  const world = shot[2](t);
  renderer.render(world.scene, cam);
  if (world !== outro) ov.vignette(0.22);
  ov.captions(t, CAPTIONS, KEYWORDS);
  ov.end();
}

// Cover / thumbnail (9:16): Affan holding his tummy in front of the giant
// broccoli, a big title, crossed-out veg, episode badge and the series logo.
// No captions. Key elements stay inside the centre 3:4 area (y 240-1680).
const THUMB = { x: 2.6, y: 2.8, z: 10.5, ly: 3.6, fov: 50 };
window.setThumb = (o) => Object.assign(THUMB, o);
function thumbnail() {
  ov.begin();
  cam.aspect = W / H;
  cam.updateProjectionMatrix();
  const P = SPOT.broc;
  garAffan(P, 0, { blink: 0, talk: 0, ...tummy(1), wow: 0.8, brow: 1, smile: 0, headPitch: -0.05, headYaw: 0.12, lookX: 0.25, lookY: 0.05, yaw: 0.05 });
  gar.flies.forEach((b) => (b.visible = false));
  spotCam(P, { x: THUMB.x, y: THUMB.y, z: THUMB.z, ly: THUMB.ly, lx: -0.6, lz: -2, fov: THUMB.fov });
  renderer.render(gar.scene, cam);
  gar.flies.forEach((b) => (b.visible = true));
  const g = ov.g;
  const top = g.createLinearGradient(0, 0, 0, 900);
  top.addColorStop(0, 'rgba(8,30,20,0.75)');
  top.addColorStop(1, 'rgba(8,30,20,0)');
  g.fillStyle = top;
  g.fillRect(0, 0, W, 900);
  const bot = g.createLinearGradient(0, H - 900, 0, H);
  bot.addColorStop(0, 'rgba(8,30,20,0)');
  bot.addColorStop(1, 'rgba(8,30,20,0.8)');
  g.fillStyle = bot;
  g.fillRect(0, H - 900, W, 900);
  ov.vignette(0.25);
  ov.tag('thBadge', 'EPISOD 17', { x: W / 2, y: 300 }, { bg: GREEN, small: true });
  ov.bubble('thTitle', 'KESAN KALAU\nTAK MAKAN\nSAYUR', { x: W / 2, y: 560, r: -2 }, { size: 116, top: '#e8ffd8', bot: '#3fb34a' });
  ov.html('thBroc', BROC_SVG, { x: 150, y: 1000, r: -10, s: 0.75 });
  ov.html('thX', ICONS.cross(), { x: 150, y: 1000, s: 0.6 });
  ov.html('thGerm', GERM('#9b5cff', 1), { x: 930, y: 960, r: 10, s: 0.8 });
  ov.html('thGerm2', GERM('#5fc24a', 1), { x: 960, y: 1160, r: -8, s: 0.55 });
  drawLogo(ov, { y: 1470, scale: 0.55 });
  ov.end();
}

window.EP = {
  fps: FPS,
  duration: DURATION,
  frame,
  thumbnail,
  ready: (async () => {
    env = await loadEnvelope('./audio/narration.mp3', FPS);
    await Promise.all(['800 60px "Baloo 2"', '700 60px "Baloo 2"', '700 60px Fredoka', '600 60px Fredoka'].map((f) => document.fonts.load(f)));
    frame(0);
    return true;
  })(),
};
