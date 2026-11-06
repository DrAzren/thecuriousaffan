// THE CURIOUS AFFAN — Episode 022: "Apa Jadi di Malaysia Jika Tiada Hujan Langsung?"
// Every shot is a pure function of time t (seconds), synced to audio/narration.mp3.
import * as THREE from 'three';
import { makeRenderer, loadEnvelope, toScreen, clamp, lerp, inv, easeOut, easeIn, easeInOut, keys, wobble, rng, W, H } from '../../shared/core.js';
import { POSES, blinkAt } from '../../shared/affan.js';
import { Overlay, pop, ICONS, drawLogo } from '../../shared/overlay.js';
import { CAPTIONS, KEYWORDS } from './captions.js';
import { buildLand, buildDam, buildCycle, buildBath, buildOutro, landHeight, RIVER_X, PADI, FOREST_VIEW, SOIL } from './worlds.js';

const FPS = 30;
const DURATION = 74.6;

const stage = document.getElementById('stage');
const canvas = document.createElement('canvas');
stage.appendChild(canvas);
const renderer = makeRenderer(canvas);
renderer.toneMappingExposure = 1.0;
const ov = new Overlay(stage);
const land = buildLand();
const dam = buildDam();
const cyc = buildCycle();
const bath = buildBath();
const outro = buildOutro();
const cam = new THREE.PerspectiveCamera(50, W / H, 0.03, 4000);
let env = { at: () => 0 };

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const talk = (t) => clamp(env.at(t) * 1.2);
const scr = (p, c = cam) => toScreen(p, c);
const aff = land.aff;

function lookCam(pos, look, fov = 50) {
  cam.position.copy(pos);
  cam.fov = fov;
  cam.updateProjectionMatrix();
  cam.lookAt(look);
  cam.updateMatrixWorld(true);
}
function placeAff(a, x, z, yaw) {
  a.root.position.set(x, landHeight(x, z), z);
  a.root.rotation.y = yaw;
  a.root.updateMatrixWorld(true);
}
// Torso-local IK target for a world point (pose must already have the yaw).
const reachTo = (a, p) => a.toTorso(p);
const headPos = (a) => a.parts.head.getWorldPosition(V(0, 0, 0));

// Global story state ------------------------------------------------------
// dryness of the land: green -> yellow (week) -> parched (month); rain revives it
const dryAt = (t) => (t < 54.9 ? keys(t, [[17.2, 0], [20.2, 0.62], [22.0, 0.8], [25.5, 1]], easeInOut) : keys(t, [[54.9, 1], [57.9, 0.45]], easeInOut));
const droopAt = (t) => (t < 54.9 ? keys(t, [[20.3, 0], [21.6, 1]], easeInOut) : keys(t, [[54.9, 1], [57.9, 0.4]]));
const dayAt = (t) => Math.round(t < 24 ? keys(t, [[17.0, 1], [17.6, 7]], (k) => k) : keys(t, [[24.2, 7], [25.0, 30]], (k) => k));

// --------------------------------------------------------------- icons (SVG)
const OUT = '#17256b';
const IC = {
  drop: (c = '#5cc8ff', s = 1) => `<svg width="${70 * s}" height="${96 * s}" viewBox="0 0 70 96"><path d="M35 6 C52 34 64 50 64 64 A29 29 0 0 1 6 64 C6 50 18 34 35 6 Z" fill="${c}" stroke="${OUT}" stroke-width="7"/><ellipse cx="24" cy="62" rx="7" ry="11" fill="#fff" opacity="0.75"/></svg>`,
  thermo: (k) => `<svg width="110" height="300" viewBox="0 0 110 300"><rect x="30" y="10" width="50" height="220" rx="25" fill="#fff" stroke="${OUT}" stroke-width="9"/><circle cx="55" cy="245" r="42" fill="#ff4d3d" stroke="${OUT}" stroke-width="9"/>
    <rect x="43" y="${210 - 180 * k}" width="24" height="${40 + 180 * k}" rx="12" fill="#ff4d3d"/>${[0, 1, 2, 3].map((i) => `<line x1="80" y1="${50 + i * 45}" x2="96" y2="${50 + i * 45}" stroke="${OUT}" stroke-width="7" stroke-linecap="round"/>`).join('')}</svg>`,
  calendar: (n) => `<svg width="220" height="230" viewBox="0 0 220 230"><rect x="10" y="22" width="200" height="200" rx="30" fill="#fff" stroke="${OUT}" stroke-width="10"/><path d="M10 52 A30 30 0 0 1 40 22 H180 A30 30 0 0 1 210 52 V82 H10 Z" fill="#ff5a4d" stroke="${OUT}" stroke-width="10" stroke-linejoin="round"/>
    <rect x="52" y="4" width="18" height="40" rx="9" fill="${OUT}"/><rect x="150" y="4" width="18" height="40" rx="9" fill="${OUT}"/>
    <text x="110" y="72" text-anchor="middle" font-family="Baloo 2" font-weight="800" font-size="40" fill="#fff">HARI</text>
    <text x="110" y="${n > 9 ? 190 : 192}" text-anchor="middle" font-family="Baloo 2" font-weight="800" font-size="${n > 9 ? 108 : 118}" fill="${OUT}">${n}</text></svg>`,
  sun: () => `<svg width="220" height="220" viewBox="0 0 220 220"><g stroke="#ffb020" stroke-width="14" stroke-linecap="round">${Array.from({ length: 8 }, (_, i) => { const a = (i / 8) * Math.PI * 2; return `<line x1="${110 + Math.cos(a) * 72}" y1="${110 + Math.sin(a) * 72}" x2="${110 + Math.cos(a) * 100}" y2="${110 + Math.sin(a) * 100}"/>`; }).join('')}</g><circle cx="110" cy="110" r="56" fill="#ffd84a" stroke="${OUT}" stroke-width="9"/></svg>`,
  house: () => `<svg width="230" height="210" viewBox="0 0 230 210"><path d="M20 100 L115 20 L210 100 Z" fill="#e8605a" stroke="${OUT}" stroke-width="10" stroke-linejoin="round"/><rect x="42" y="96" width="146" height="104" rx="8" fill="#ffd9a8" stroke="${OUT}" stroke-width="10"/><rect x="98" y="134" width="40" height="66" rx="6" fill="#a86a3a" stroke="${OUT}" stroke-width="8"/>
    <rect x="56" y="118" width="32" height="30" rx="4" fill="#9fe0ff" stroke="${OUT}" stroke-width="7"/><path d="M160 150 h28 v14 h-10 v12" fill="none" stroke="#9aa6c8" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  dam: () => `<svg width="250" height="190" viewBox="0 0 250 190"><path d="M10 160 L60 70 L110 120 L150 60 L240 160 Z" fill="#5fbf5a" stroke="${OUT}" stroke-width="9" stroke-linejoin="round"/><rect x="14" y="110" width="150" height="54" rx="6" fill="#3fa2ff" stroke="${OUT}" stroke-width="9"/>
    <path d="M160 70 L190 70 L210 170 L150 170 Z" fill="#cfcac0" stroke="${OUT}" stroke-width="9" stroke-linejoin="round"/><path d="M30 130 q14 -8 28 0 t28 0 t28 0" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round"/></svg>`,
  river: () => `<svg width="240" height="170" viewBox="0 0 240 170"><rect x="10" y="20" width="220" height="140" rx="26" fill="#6fd06a" stroke="${OUT}" stroke-width="9"/><path d="M30 150 C80 120 60 90 120 80 S190 40 215 30" fill="none" stroke="${OUT}" stroke-width="42" stroke-linecap="round"/><path d="M30 150 C80 120 60 90 120 80 S190 40 215 30" fill="none" stroke="#3fa2ff" stroke-width="26" stroke-linecap="round"/></svg>`,
  padi: (c = '#e8b23a') => `<svg width="150" height="230" viewBox="0 0 150 230"><path d="M75 225 C75 160 78 90 100 30" fill="none" stroke="#6aa83a" stroke-width="10" stroke-linecap="round"/>${Array.from({ length: 7 }, (_, i) => `<ellipse cx="${96 - i * 4 + (i % 2 ? 16 : -14)}" cy="${40 + i * 20}" rx="13" ry="21" transform="rotate(${i % 2 ? 30 : -30} ${96 - i * 4 + (i % 2 ? 16 : -14)} ${40 + i * 20})" fill="${c}" stroke="${OUT}" stroke-width="6"/>`).join('')}</svg>`,
  bowl: () => `<svg width="250" height="190" viewBox="0 0 250 190"><path d="M40 90 C40 40 210 40 210 90 Z" fill="#fff" stroke="${OUT}" stroke-width="9"/>${[[80, 70], [110, 60], [140, 64], [170, 74], [95, 82], [125, 78], [155, 84]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="9" ry="5" fill="#f3efe4" stroke="#c9c2b0" stroke-width="3"/>`).join('')}
    <path d="M20 90 H230 C226 150 180 180 125 180 C70 180 24 150 20 90 Z" fill="#3fa2ff" stroke="${OUT}" stroke-width="10" stroke-linejoin="round"/><path d="M60 120 H190" stroke="#fff" stroke-width="8" stroke-linecap="round" opacity="0.7"/></svg>`,
  check: () => `<svg width="200" height="200" viewBox="0 0 200 200"><circle cx="100" cy="100" r="86" fill="#3fc46a" stroke="#fff" stroke-width="14"/><path d="M58 104 L88 134 L144 72" fill="none" stroke="#fff" stroke-width="22" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  down: (c = '#ff6a3d') => `<svg width="120" height="150" viewBox="0 0 120 150"><path d="M38 10 H82 V80 H110 L60 140 L10 80 H38 Z" fill="${c}" stroke="#fff" stroke-width="10" stroke-linejoin="round"/></svg>`,
  cough: () => `<svg width="170" height="120" viewBox="0 0 170 120"><g fill="#d8d0c4" stroke="${OUT}" stroke-width="7"><circle cx="40" cy="70" r="30"/><circle cx="85" cy="50" r="36"/><circle cx="130" cy="72" r="28"/></g></svg>`,
};

// ------------------------------------------------------------ overlay bits
const ORANGE = '#ff8a3d', BLUE = '#2f9bff', GREEN = '#35b85a', BROWN = '#b87a3a';

function tagAt(id, text, x, y, t, a, b, style) {
  const q = pop(t, a, b);
  if (q.o > 0) ov.tag(id, text, { x, y, o: q.o, s: q.s }, style);
}
function iconAt(id, svg, x, y, t, a, b, s = 1, r = 0) {
  const q = pop(t, a, b);
  if (q.o > 0) ov.html(id, svg, { x, y, o: q.o, s: q.s * s, r });
}
function pinTag(id, text, p, t, a, b, style, dy = -90) {
  const q = pop(t, a, b);
  if (q.o <= 0 || !p.visible) return;
  ov.tag(id, text, { x: clamp(p.x, 170, 910), y: clamp(p.y + dy, 300, 1500), o: q.o, s: q.s }, style);
}

// Rising heat shimmer lines.
function heat(t, a, { y0 = 700, y1 = 1500, n = 12, seed = 4 } = {}) {
  if (a <= 0) return;
  const g = ov.g;
  const R = rng(seed);
  g.save();
  g.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const x = 60 + R() * (W - 120), sp = 120 + R() * 120, ph = R() * 10, len = 140 + R() * 120;
    const y = y1 - ((t * sp + ph * 200) % (y1 - y0));
    const fade = Math.sin(((y1 - y) / (y1 - y0)) * Math.PI);
    g.globalAlpha = a * 0.45 * fade;
    g.strokeStyle = i % 2 ? '#fff1c8' : '#ffd08a';
    g.lineWidth = 6;
    g.beginPath();
    for (let k = 0; k <= 12; k++) {
      const yy = y - (k / 12) * len;
      g.lineTo(x + Math.sin(yy * 0.05 + t * 6 + ph) * 12, yy);
    }
    g.stroke();
  }
  g.restore();
}

// Falling rain streaks (screen space), deterministic.
function rain(t, a, { x0 = 0, x1 = W, y0 = 0, y1 = H, n = 160, seed = 7, len = 70, slant = 0.18 } = {}) {
  if (a <= 0) return;
  const g = ov.g;
  const R = rng(seed);
  g.save();
  g.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const x = x0 + R() * (x1 - x0), sp = 1600 + R() * 900, ph = R(), l = len * (0.6 + R() * 0.8);
    const span = y1 - y0 + l;
    const y = y0 + ((ph * span + t * sp) % span) - l;
    g.globalAlpha = a * (0.35 + R() * 0.45);
    g.strokeStyle = '#dff3ff';
    g.lineWidth = 2.5 + R() * 2.5;
    g.beginPath();
    g.moveTo(x + (y - y0) * slant, Math.max(y0, y));
    g.lineTo(x + (y + l - y0) * slant, Math.min(y1, y + l));
    g.stroke();
  }
  g.restore();
}

function hazeTint(a) {
  if (a <= 0) return;
  const g = ov.g;
  const gr = g.createLinearGradient(0, 0, 0, H);
  gr.addColorStop(0, `rgba(196,170,132,${0.38 * a})`);
  gr.addColorStop(1, `rgba(160,138,110,${0.24 * a})`);
  g.fillStyle = gr;
  g.fillRect(0, 0, W, H);
}

// Persistent day counter (calendar) during the drought.
function calendarHUD(t) {
  if (t < 10.85 || t > 54.6) return;
  const q = pop(t, 10.85, 54.55);
  const n = dayAt(t);
  const flip = t > 17.0 && t < 17.7 ? Math.sin(inv(17.0, 17.7, t) * Math.PI * 4) * 0.06 : t > 24.2 && t < 25.1 ? Math.sin(inv(24.2, 25.1, t) * Math.PI * 6) * 0.06 : 0;
  ov.html('cal', IC.calendar(n), { x: 165, y: 345, o: q.o, s: q.s * (0.78 + flip), r: -6 });
}

// Dam water gauge (canvas).
function gauge(x, y, frac, a) {
  if (a <= 0) return;
  const g = ov.g;
  const w = 120, h = 430;
  g.save();
  g.globalAlpha = a;
  const rr = (x0, y0, ww, hh, r) => {
    g.beginPath();
    g.moveTo(x0 + r, y0);
    g.arcTo(x0 + ww, y0, x0 + ww, y0 + hh, r);
    g.arcTo(x0 + ww, y0 + hh, x0, y0 + hh, r);
    g.arcTo(x0, y0 + hh, x0, y0, r);
    g.arcTo(x0, y0, x0 + ww, y0, r);
    g.closePath();
  };
  rr(x - w / 2 - 10, y - 10, w + 20, h + 20, 34);
  g.fillStyle = '#ffffff';
  g.fill();
  rr(x - w / 2, y, w, h, 26);
  g.fillStyle = '#e4edf5';
  g.fill();
  g.save();
  g.clip();
  const fh = h * frac;
  const col = frac > 0.5 ? '#2f9bff' : frac > 0.3 ? '#ffb020' : '#ff5a3d';
  g.fillStyle = col;
  g.fillRect(x - w / 2, y + h - fh, w, fh);
  g.restore();
  rr(x - w / 2, y, w, h, 26);
  g.lineWidth = 8;
  g.strokeStyle = OUT;
  g.stroke();
  g.font = '800 58px "Baloo 2"';
  g.textAlign = 'center';
  g.lineWidth = 12;
  g.strokeStyle = OUT;
  g.lineJoin = 'round';
  const label = `${Math.round(frac * 100)}%`;
  g.strokeText(label, x, y + h + 80);
  g.fillStyle = '#fff';
  g.fillText(label, x, y + h + 80);
  g.restore();
}

function vapour(t, x0, x1, ySea, yTop, a, seed = 3) {
  if (a <= 0) return;
  const g = ov.g;
  const R = rng(seed);
  g.save();
  for (let i = 0; i < 40; i++) {
    const x = x0 + R() * (x1 - x0), sp = 0.35 + R() * 0.3, ph = R();
    const k = (ph + t * sp) % 1;
    const y = lerp(ySea, yTop, k);
    const r = 16 + k * 26;
    g.globalAlpha = a * 0.75 * Math.sin(k * Math.PI);
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.arc(x + Math.sin(k * 9 + i) * 26, y, r, 0, Math.PI * 2);
    g.fill();
  }
  g.restore();
}

// ---------------------------------------------------------------- Affan helpers
function standPose(t, seed, p = {}) {
  return { blink: blinkAt(t, seed), talk: talk(t), headYaw: 0.06 * wobble(t, seed), ...p };
}

// =========================================================================== SHOTS
const SHOTS = [
  // S1 — hook: blazing sun over the kampung yard; Affan wipes sweat, wonders
  [0, 7.9, (t) => {
    land.setDry(0, 0);
    land.setSky({ hot: 1 });
    placeAff(aff, 0, 1.5, Math.PI);
    const wipe = keys(t, [[0.2, 0], [0.55, 1], [1.5, 1], [1.9, 0]]);
    const fan = keys(t, [[0.8, 0], [1.1, 1], [2.5, 1], [2.8, 0]]);
    const think = keys(t, [[2.75, 0], [3.1, 1], [4.6, 1], [4.9, 0]]);
    const shrug = keys(t, [[4.9, 0], [5.3, 1], [7.5, 1], [7.85, 0]]);
    const armR = think > 0 ? { ...POSES.thinkR.armR, reach: [lerp(-0.55, -0.02, think), lerp(0.25, 1.36, think), lerp(0.1, 0.62, think)], point: think }
      : shrug > 0 ? { reach: [lerp(-0.55, -0.85, shrug), lerp(0.25, 0.85, shrug), lerp(0.1, 0.55, shrug)], pole: [-1, -0.6, -0.3], wy: 0.8 * shrug }
      : { reach: [lerp(-0.55, -0.12, wipe) + 0.12 * Math.sin(t * 9) * wipe, lerp(0.25, 1.85, wipe), lerp(0.1, 0.7, wipe)], pole: [-1, -0.2, -0.6] };
    const armL = shrug > 0 ? { reach: [lerp(0.55, 0.85, shrug), lerp(0.25, 0.85, shrug), lerp(0.1, 0.55, shrug)], pole: [1, -0.6, -0.3], wy: -0.8 * shrug }
      : { reach: [lerp(0.55, 0.62, fan), lerp(0.25, 1.45, fan), lerp(0.1, 0.75 + 0.12 * Math.sin(t * 16), fan)], pole: [1, -0.6, -0.4], wz: 0.4 * Math.sin(t * 16) * fan };
    aff.pose(standPose(t, 1, {
      yaw: Math.PI, smile: think > 0 ? 0.4 : 0.2, brow: 0.7 + 0.3 * think, headRoll: -0.12 * think, headPitch: -0.12 * think - 0.05,
      lookX: 0.3 * think, lookY: 0.55 * think, wow: keys(t, [[0.0, 0.5], [0.5, 0]]), armL, armR,
      tilt: 0.05 * shrug * Math.sin(t * 3),
    }));
    const k = easeOut(inv(0, 7.9, t));
    lookCam(V(lerp(0.55, 0.3, k), 0.58, lerp(-2.6, -2.1, k)), V(0, lerp(1.2, 1.1, k), 2.5), 50);
    land.placeSun(cam.position, V(-0.3, 0.42, 1).normalize());
    land.light(V(0, 0.6, 1.5));
    heat(t, 1);
    const p = pop(t, 0.15, 7.85, { fin: 0.45 });
    ov.bubble('hook', 'APA JADI JIKA\nTIADA HUJAN\nLANGSUNG?', { x: W / 2, y: 520 + Math.sin(t * 3) * 6, o: p.o, s: p.s }, { size: 104, top: '#ffe45c', bot: '#ff8a1f' });
    tagAt('ep', 'EPISOD 22', W / 2, 272, t, 0.5, 7.85, { bg: '#2f7bff', small: true });
    tagAt('my', 'DI MALAYSIA', W / 2, 815, t, 5.84, 7.85, { bg: '#e8443a', small: true });
    const h = scr(headPos(aff));
    [[0.4, -150, -40], [0.9, 160, -80], [1.5, -120, 60]].forEach(([a, dx, dy], i) => {
      const q = pop(t, a, 2.7);
      if (q.o > 0) ov.html('sw' + i, IC.drop('#7fd6ff', 0.7), { x: h.x + dx, y: h.y + dy + ((t - a) * 60) % 50, o: q.o, s: q.s, r: dx > 0 ? 15 : -15 });
    });
    iconAt('thermo', IC.thermo(clamp(inv(1.0, 2.4, t) * 0.85 + 0.1)), 905, 1040, t, 1.0, 2.75, 0.75, 8);
    [[3.25, -230, -230, '#ffcf33', -12], [3.55, 230, -280, '#3fa2ff', 10], [3.85, 270, -60, '#ffcf33', 14]].forEach(([a, dx, dy, c, r], i) => {
      const q = pop(t, a, 4.75);
      if (q.o > 0) ov.html('q' + i, ICONS.qmark(c), { x: h.x + dx, y: h.y + dy + Math.sin(t * 3 + i) * 10, o: q.o, s: q.s * 0.75, r });
    });
    return land;
  }],
  // S2 — "Jom ikut Affan tengok, hari demi hari!"
  [7.9, 10.8, (t) => {
    land.setDry(0, 0);
    land.setSky({ hot: 0.6 });
    placeAff(aff, 0, 1.5, Math.PI);
    const wv = keys(t, [[7.95, 0], [8.25, 1], [9.4, 1], [9.7, 0]]);
    const w = POSES.waveR(t).armR;
    aff.pose(standPose(t, 2, {
      yaw: Math.PI, smile: 1, brow: 0.6, bob: Math.abs(Math.sin((t - 7.9) * 6)) * 0.03,
      armR: wv > 0 ? { reach: [lerp(-0.55, w.reach[0], wv), lerp(0.25, w.reach[1], wv), lerp(0.1, w.reach[2], wv)], pole: w.pole } : {},
      armL: { reach: [0.55, 0.3, 0.3] },
    }));
    const k = easeInOut(inv(7.9, 10.8, t));
    lookCam(V(lerp(0.4, 0.1, k), 0.85, lerp(-1.7, -1.25, k)), V(0, 0.9, 1.5), 50);
    land.placeSun(cam.position, V(-0.45, 0.5, 1).normalize());
    land.light(V(0, 0.6, 1.5));
    const n = Math.max(1, Math.floor(inv(9.6, 10.6, t) * 30));
    iconAt('calBig', IC.calendar(n), W / 2, 560, t, 9.5, 10.78, 1.3, Math.sin(t * 8) * 3);
    ov.flash(inv(10.45, 10.8, t) ** 2);
    return land;
  }],
  // S3 — HARI 1: sunny and fun; Affan jumps, then kicks a ball
  [10.8, 16.8, (t) => {
    land.setDry(0, 0);
    land.setSky({ hot: 0.2 });
    const yaw = Math.PI + 0.55;
    placeAff(aff, 0.4, 1.0, yaw);
    const jump = t > 12.15 && t < 12.75 ? Math.sin(((t - 12.15) / 0.6) * Math.PI) * 0.32 : 0;
    const up = keys(t, [[12.0, 0], [12.25, 1], [13.4, 1], [13.8, 0]]);
    const kick = keys(t, [[14.1, 0], [14.4, 0.45], [14.62, -1.1], [15.1, -0.2], [15.4, 0]]);
    aff.pose(standPose(t, 3, {
      yaw, smile: 1, brow: 0.5, bob: jump, wow: keys(t, [[12.1, 0], [12.3, 0.6], [12.8, 0]]),
      legL: { x: -0.4 * jump * 3, knee: 0.8 * jump * 3 }, legR: { x: t > 14 ? kick : -0.4 * jump * 3, knee: t > 14 ? Math.max(0, kick) * 1.2 : 0.8 * jump * 3 },
      armL: { reach: [lerp(0.55, 0.75, up), lerp(0.25, 1.9, up), lerp(0.1, 0.3, up)], pole: [1, -0.4, -0.5] },
      armR: { reach: [lerp(-0.55, -0.75, up), lerp(0.25, 1.9, up), lerp(0.1, 0.3, up)], pole: [-1, -0.4, -0.5] },
      headPitch: t > 14 ? 0.25 : -0.05, lookY: t > 14 ? -0.4 : 0,
    }));
    // ball: rests by the right foot, then rolls away after the kick
    const fwd = V(Math.sin(yaw), 0, Math.cos(yaw));
    const right = V(-Math.cos(yaw), 0, Math.sin(yaw));
    const start = aff.root.position.clone().addScaledVector(fwd, 0.32).addScaledVector(right, 0.09);
    const kt = Math.max(0, t - 14.6);
    const dist = 7 * (1 - Math.exp(-kt * 0.9));
    const b = start.clone().addScaledVector(fwd, dist);
    b.y = 0.16 + (kt > 0 ? Math.abs(Math.sin(kt * 5)) * 0.35 * Math.exp(-kt * 2) : 0);
    land.ball.position.copy(b);
    land.ball.rotation.set(dist / 0.16, yaw, 0);
    land.ball.visible = true;
    const k = easeInOut(inv(10.8, 16.8, t));
    lookCam(V(lerp(-2.8, -3.4, k), lerp(1.3, 1.1, k), lerp(-4.6, -5.2, k)), V(lerp(0.2, -0.8, k), 0.7, 1.2), 50);
    land.placeSun(cam.position, V(-0.1, 0.55, 1).normalize());
    land.light(V(0, 0.6, 0));
    tagAt('cerah', 'LANGIT CERAH!', W / 2 + 120, 560, t, 13.2, 16.7, { bg: BLUE });
    iconAt('sun1', IC.sun(), W / 2 - 230, 560, t, 13.0, 16.7, 0.7, t * 20);
    ov.flash(1 - inv(10.8, 11.2, t));
    ov.sparkles(t, { n: 14, seed: 6, y: 600, h: 500, a: inv(12.1, 12.4, t) * (1 - inv(13.6, 14, t)), size: 26 });
    return land;
  }],
  // S4a — SEMINGGU: grass turns yellow
  [16.8, 20.3, (t) => {
    land.setDry(dryAt(t), droopAt(t));
    land.setSky({ hot: 0.7 });
    land.ball.visible = false;
    placeAff(aff, -1.4, 0.3, Math.PI - 0.35);
    const look = keys(t, [[16.8, 0], [18.6, 0], [19.0, 1]]);
    aff.pose(standPose(t, 4, {
      yaw: Math.PI - 0.35, smile: lerp(0.6, 0.15, look), brow: 0.4 + 0.5 * look, headPitch: 0.35 * look, lookY: -0.6 * look,
      armL: { reach: [0.55, 0.32, 0.3] }, armR: { reach: [-0.55, 0.32, 0.3] },
    }));
    const k = easeInOut(inv(16.8, 20.3, t));
    lookCam(V(lerp(1.6, 1.0, k), lerp(2.2, 1.6, k), lerp(-4.2, -3.4, k)), V(-1.2, lerp(0.3, 0.5, k), 1.4), 52);
    land.placeSun(cam.position, V(-0.5, 0.6, 1).normalize());
    land.light(V(-1, 0.4, 0.5));
    heat(t, inv(17, 19, t) * 0.6, { y0: 900, y1: 1500, n: 8 });
    tagAt('kuning', 'RUMPUT KUNING', W / 2, 1180, t, 19.48, 20.25, { bg: '#e0a21c' });
    return land;
  }],
  // S4b — flowers wilt (bunga raya droop)
  [20.3, 22.0, (t) => {
    land.setDry(dryAt(t), droopAt(t));
    land.setSky({ hot: 0.8 });
    placeAff(aff, 100, 100, 0);
    const k = easeOut(inv(20.3, 22.0, t));
    lookCam(V(lerp(-0.7, -1.0, k), lerp(1.25, 1.1, k), lerp(1.2, 1.7, k)), V(-1.5, 0.55, 5.5), 40);
    land.placeSun(cam.position, V(0.3, 0.5, 1).normalize());
    land.light(V(-1, 0.4, 5.5), [0.2, 0.9, -0.8]);
    tagAt('layu', 'BUNGA LAYU', W / 2, 520, t, 21.2, 21.98, { bg: '#d2465a' });
    heat(t, 0.5, { y0: 800, y1: 1500, n: 8, seed: 9 });
    return land;
  }],
  // S5 — the ground cracks
  [22.0, 23.9, (t) => {
    land.setDry(dryAt(t), droopAt(t));
    land.setSky({ hot: 0.9 });
    placeAff(aff, 100, 100, 0);
    land.soilCracks.userData.set(easeOut(inv(22.05, 23.6, t)));
    const k = easeInOut(inv(22.0, 23.9, t));
    lookCam(V(SOIL.x + 0.3, lerp(3.4, 2.6, k), SOIL.z - lerp(2.4, 1.6, k)), V(SOIL.x, 0, SOIL.z + 0.3), 50);
    land.placeSun(cam.position, V(0.3, 0.8, 1).normalize());
    land.light(V(SOIL.x, 0, SOIL.z), [0.6, 0.9, -0.3]);
    const q = pop(t, 23.12, 23.88, { from: 1.8 });
    ov.bubble('retak', 'RETAK!', { x: W / 2, y: 520, o: q.o, s: q.s, r: -4 }, { size: 150, top: '#ffd08a', bot: '#c9772a' });
    heat(t, 0.7, { y0: 500, y1: 1500, n: 10, seed: 2 });
    return land;
  }],
  // S6 — SEBULAN: the river shrinks and gets shallow
  [23.9, 27.7, (t) => {
    land.setDry(dryAt(t), 1);
    land.setSky({ hot: 1 });
    land.soilCracks.userData.set(1);
    const lvl = keys(t, [[24.4, -0.3], [27.3, -1.45]], easeInOut);
    land.water.position.y = lvl;
    const ax = RIVER_X - 8.6, az = -3;
    placeAff(aff, ax, az, Math.PI / 2 - 0.35);
    aff.pose(standPose(t, 5, {
      yaw: Math.PI / 2 - 0.35, smile: 0.1, brow: 1, headPitch: 0.25, lookY: -0.4, headYaw: -0.25,
      armL: { reach: [0.5, 0.95, 0.55], pole: [1, -0.6, -0.4] }, armR: { reach: [-0.5, 0.95, 0.55], pole: [-1, -0.6, -0.4] },
    }));
    const k = easeInOut(inv(23.9, 27.7, t));
    lookCam(V(ax - lerp(3.6, 4.6, k), lerp(2.2, 3.0, k), az - lerp(4.2, 5.0, k)), V(RIVER_X - 1, -0.6, az + 7), 52);
    land.placeSun(cam.position, V(0.6, 0.45, 1).normalize());
    land.light(V(ax + 4, 0, az + 3), [-0.5, 0.9, -0.6]);
    tagAt('sungai', 'SUNGAI', 760, 640, t, 26.16, 27.65, { bg: BLUE });
    const c = pop(t, 26.96, 27.65, { from: 1.6 });
    ov.bubble('cetek', 'CETEK!', { x: W / 2 - 40, y: 820, o: c.o, s: c.s, r: 3 }, { size: 130, top: '#bfe8ff', bot: '#3fa2ff' });
    heat(t, 0.5, { y0: 600, y1: 1300, n: 8, seed: 5 });
    return land;
  }],
  // S7 — the dam's water level drops: turun... turun... dan terus turun
  [27.7, 33.2, (t) => {
    const lvl = keys(t, [[29.3, dam.FULL], [29.9, -6.5], [30.5, -6.5], [31.1, -11.5], [32.35, -11.5], [33.0, -16.5]], easeInOut);
    dam.water.position.y = lvl;
    const frac = clamp(keys(t, [[29.3, 1], [29.9, 0.7], [30.5, 0.7], [31.1, 0.45], [32.35, 0.45], [33.0, 0.18]], easeInOut));
    const k = easeInOut(inv(27.7, 33.2, t));
    lookCam(V(lerp(110, 80, k), lerp(64, 58, k), lerp(-200, -185, k)), V(lerp(-6, 0, k), -10, 10), 50);
    dam.sky.position.copy(cam.position);
    tagAt('emp', 'EMPANGAN', W / 2 - 90, 470, t, 28.4, 33.15, { bg: BLUE });
    const ga = pop(t, 28.6, 33.15);
    gauge(920, 620, frac, ga.o);
    if (ga.o > 0) ov.tag('paras', 'PARAS AIR', { x: 880, y: 560, o: ga.o, s: ga.s }, { bg: '#1f6fd6', small: true });
    [[29.36, 0], [30.56, 1], [32.4, 2]].forEach(([a, i]) => iconAt('dn' + i, IC.down(), 760, 700 + i * 150, t, a, 33.15, 0.75 + i * 0.1));
    return dam;
  }],
  // S8 — where tap water comes from (sungai + empangan -> rumah)
  [33.2, 38.3, (t) => {
    land.setDry(1, 1);
    land.setSky({ hot: 1 });
    land.soilCracks.userData.set(1);
    const ax = 2.55, az = 2.65;
    placeAff(aff, ax, az, -0.25);
    const up = keys(t, [[33.3, 0], [33.6, 1], [35.0, 1], [35.3, 0]]);
    const pt = keys(t, [[35.3, 0], [35.6, 1], [38.2, 1]]);
    aff.pose(standPose(t, 6, {
      yaw: -0.25, smile: 0.5, brow: 0.6, lookY: 0.3 * pt,
      armR: up > 0 ? { reach: [lerp(-0.55, -0.55, up), lerp(0.25, 1.85, up), lerp(0.1, 0.35, up)], point: up, pole: [-1, -0.6, -0.4] }
        : { reach: [lerp(-0.55, -0.9, pt), lerp(0.25, 1.6, pt), lerp(0.1, 0.45, pt)], point: pt, pole: [-1, -0.7, -0.3] },
      armL: { reach: [0.55, 0.3, 0.3] },
    }));
    const k = easeInOut(inv(33.2, 38.3, t));
    lookCam(V(lerp(3.0, 2.95, k), 1.0, lerp(5.6, 5.3, k)), V(2.7, lerp(1.2, 1.25, k), 2.6), 50);
    land.placeSun(cam.position, V(0.8, 0.55, -1).normalize());
    land.light(V(ax, 0.5, az), [0.4, 0.9, 0.8]);
    // infographic: SUNGAI + EMPANGAN -> RUMAH
    const g = ov.g;
    const panel = pop(t, 33.4, 38.25);
    if (panel.o > 0) {
      g.save();
      g.globalAlpha = panel.o * 0.85;
      g.fillStyle = 'rgba(255,255,255,0.88)';
      g.beginPath();
      g.roundRect(70, 300, 940, 560, 48);
      g.fill();
      g.restore();
    }
    iconAt('iSg', IC.river(), 250, 450, t, 36.88, 38.25, 0.95);
    tagAt('tSg', 'SUNGAI', 250, 560, t, 36.88, 38.25, { bg: BLUE, small: true });
    iconAt('iDm', IC.dam(), 250, 690, t, 37.56, 38.25, 0.95);
    tagAt('tDm', 'EMPANGAN', 250, 800, t, 37.56, 38.25, { bg: '#1f6fd6', small: true });
    iconAt('iHs', IC.house(), 820, 560, t, 35.36, 38.25, 1.1);
    tagAt('tHs', 'AIR PAIP', 820, 700, t, 34.76, 38.25, { bg: GREEN, small: true });
    const fl = inv(37.0, 37.5, t) * panel.o;
    if (fl > 0) {
      ov.dashed(380, 450, 690, 560, t, { color: '#2f9bff', w: 12, a: fl });
      ov.dashed(380, 690, 690, 580, t, { color: '#2f9bff', w: 12, a: inv(37.6, 38.0, t) * panel.o });
      for (let i = 0; i < 3; i++) {
        const ph = (t * 0.9 + i / 3) % 1;
        ov.html('fd' + i, IC.drop('#5cc8ff', 0.45), { x: lerp(380, 690, ph), y: lerp(450, 560, ph), o: fl * Math.sin(ph * Math.PI), s: 1 });
      }
    }
    return land;
  }],
  // S9 — the tap runs dry
  [38.3, 41.2, (t) => {
    land.setDry(1, 1);
    land.setSky({ hot: 1 });
    land.soilCracks.userData.set(1);
    const ax = 3.06, az = 3.0;
    placeAff(aff, ax, az, 0.35);
    aff.pose({ yaw: 0.35 });
    const tap = land.tap.userData;
    const hp = tap.handle.getWorldPosition(V(0, 0, 0)).add(V(0.0, 0.06, 0));
    const reach = keys(t, [[38.35, 0], [38.75, 1], [40.3, 1], [40.7, 0]]);
    const turn = keys(t, [[38.8, 0], [39.3, 1.5]]);
    tap.handle.rotation.y = turn;
    const tgt = reachTo(aff, hp);
    aff.pose(standPose(t, 7, {
      yaw: 0.35, smile: keys(t, [[38.3, 0.5], [39.6, 0.5], [40.0, 0]]), brow: keys(t, [[38.3, 0.4], [39.8, 0.4], [40.2, 1]]),
      wow: keys(t, [[39.7, 0], [39.95, 0.6], [40.3, 0]]), headPitch: 0.1, lookY: -0.1, lookX: 0.5, headYaw: keys(t, [[38.3, 0], [39.9, 0], [40.3, 0.55]]),
      armL: { reach: [lerp(0.55, tgt[0], reach), lerp(0.3, tgt[1], reach), lerp(0.25, tgt[2], reach)], pole: [1, -0.8, -0.2], wy: -0.5 * turn * reach },
      armR: { reach: [-0.55, 0.3, 0.3] },
    }));
    tap.stream.visible = false;
    const dt = t - 39.45;
    tap.drop.visible = dt > -0.2 && dt < 0.75;
    tap.drop.position.y = tap.spoutY - (dt > 0 ? 4.9 * dt * dt : 0);
    tap.drop.scale.setScalar(dt < 0 ? clamp((dt + 0.2) / 0.2) : 1);
    if (tap.drop.position.y < tap.floorY) tap.drop.visible = false;
    const k = easeInOut(inv(38.3, 41.2, t));
    lookCam(V(lerp(3.3, 3.25, k), lerp(1.05, 1.0, k), lerp(5.45, 5.25, k)), V(3.1, 0.72, 3.35), 44);
    land.placeSun(cam.position, V(0.8, 0.55, -1).normalize());
    land.light(V(3, 0.5, 3), [0.4, 0.9, 0.8]);
    const q = pop(t, 40.32, 41.18, { from: 1.8 });
    ov.bubble('kering', 'PAIP KERING!', { x: W / 2, y: 470, o: q.o, s: q.s, r: -3 }, { size: 120, top: '#ffd08a', bot: '#ff7a3d' });
    iconAt('xx', ICONS.cross(), 880, 640, t, 40.4, 41.18, 0.5);
    return land;
  }],
  // S10 — padi fields dry out; rice comes from padi
  [41.2, 48.2, (t) => {
    land.setDry(1, 1);
    land.setSky({ hot: 1 });
    const wk = keys(t, [[41.3, 0.15], [43.0, 1]], easeInOut);
    const pk = keys(t, [[41.3, 0.2], [43.0, 0.75], [43.6, 0.75], [44.9, 1]], easeInOut);
    land.setPadi(pk, wk);
    const ax = -64, az = -19;
    placeAff(aff, ax, az, Math.PI - 0.5);
    aff.root.position.y = 0.23;
    const sad = keys(t, [[41.5, 0], [42.2, 1]]);
    const cheek = keys(t, [[43.6, 0], [44.0, 1], [45.2, 1], [45.6, 0]]);
    const pt = keys(t, [[46.0, 0], [46.4, 1], [48.1, 1]]);
    aff.pose(standPose(t, 8, {
      yaw: Math.PI - 0.5, smile: lerp(0.5, 0.0, sad), brow: lerp(0.3, 1, sad), headRoll: 0.12 * cheek, headPitch: 0.15 * sad,
      armL: cheek > 0 ? { reach: [lerp(0.55, 0.28, cheek), lerp(0.3, 1.32, cheek), lerp(0.25, 0.6, cheek)], pole: [1, -0.8, 0] } : { reach: [0.55, 0.3, 0.3] },
      armR: pt > 0 ? { reach: [lerp(-0.55, -0.9, pt), lerp(0.3, 1.1, pt), lerp(0.25, 0.6, pt)], point: pt, pole: [-1, -0.6, -0.3] } : { reach: [-0.55, 0.3, 0.3] },
    }));
    const k = easeInOut(inv(41.2, 48.2, t));
    lookCam(V(ax + lerp(2.4, 2.0, k), lerp(2.0, 1.5, k), az - lerp(5.2, 4.0, k)), V(ax - 1.2, lerp(0.2, 0.6, k), az + 5), 50);
    land.placeSun(cam.position, V(0.4, 0.5, 1).normalize());
    land.light(V(ax, 0, az + 2));
    tagAt('sawah', 'SAWAH PADI', W / 2, 470, t, 41.4, 45.1, { bg: GREEN });
    const kk = pop(t, 42.76, 45.1, { from: 1.6 });
    ov.bubble('kontang', 'KERING KONTANG!', { x: W / 2, y: 610, o: kk.o, s: kk.s, r: -3 }, { size: 96, top: '#ffd08a', bot: '#c9772a' });
    iconAt('padiI', IC.padi(), 290, 620, t, 45.3, 48.15, 1.15, -8);
    const ar = pop(t, 46.1, 48.15);
    if (ar.o > 0) ov.html('arrN', ICONS.arrow('#ffb020'), { x: W / 2 + 10, y: 640, o: ar.o, s: ar.s * 0.9 });
    iconAt('bowl', IC.bowl(), 790, 640, t, 46.3, 48.15, 1.15);
    tagAt('nasi', 'NASI', 790, 790, t, 46.3, 48.15, { bg: ORANGE });
    tagAt('padiT', 'PADI', 290, 790, t, 45.4, 48.15, { bg: '#c9952a' });
    return land;
  }],
  // S11 — dry forest, fire risk and haze; Affan coughs
  [48.2, 54.6, (t) => {
    land.setDry(1, 1);
    const hz = keys(t, [[50.2, 0.0], [52.4, 1]], easeInOut);
    land.setSky({ hot: 1 - hz, haze: hz });
    land.setPlumes(t, keys(t, [[49.6, 0], [50.6, 1]]));
    const ax = FOREST_VIEW.x, az = FOREST_VIEW.z;
    const front = t >= 52.65;
    const yaw = front ? Math.PI - 0.35 : -0.15;
    placeAff(aff, ax, az, yaw);
    const cough = t > 53.45 && t < 54.45 ? Math.max(0, Math.sin((t - 53.45) * Math.PI * 4)) : 0;
    const cover = keys(t, [[53.0, 0], [53.35, 1], [54.35, 1], [54.6, 0.6]]);
    aff.pose(standPose(t, 9, {
      yaw, smile: 0, brow: 1, headPitch: front ? 0.15 + 0.2 * cough : -0.1, lean: 0.12 * cough, lookX: front ? 0.2 : 0,
      armR: cover > 0 ? { reach: [lerp(-0.55, -0.06, cover), lerp(0.3, 1.2, cover), lerp(0.25, 0.68, cover)], pole: [-1, -0.8, 0], wx: -0.6 * cover } : { reach: [-0.55, 0.3, 0.3] },
      armL: { reach: [0.55, 0.3, 0.3] },
      blink: cough > 0.5 ? 0.85 : blinkAt(t, 9),
    }));
    if (!front) {
      const k = easeInOut(inv(48.2, 52.65, t));
      lookCam(V(ax + lerp(0.9, 1.1, k), lerp(2.0, 2.3, k), az - lerp(4.4, 5.2, k)), V(ax - 3, lerp(2.5, 4.5, k), az + 40), 54);
      land.placeSun(cam.position, V(0.5, 0.35, 1).normalize());
    } else {
      const k = easeOut(inv(52.65, 54.6, t));
      lookCam(V(ax + 0.65, 1.0, az - lerp(1.7, 1.45, k)), V(ax, 0.9, az), 50);
      land.placeSun(cam.position, V(0.5, 0.35, -1).normalize());
    }
    land.light(V(ax, 0.6, az), front ? [0.3, 0.9, -0.8] : [0.5, 0.9, -0.7]);
    hazeTint(hz);
    tagAt('hutan', 'HUTAN KERING', W / 2, 470, t, 48.4, 52.6, { bg: BROWN });
    tagAt('bakar', 'MUDAH TERBAKAR', W / 2, 590, t, 50.3, 52.6, { bg: '#e8443a', small: true });
    const jb = pop(t, 51.48, 54.55, { from: 1.6 });
    ov.bubble('jerebu', 'JEREBU!', { x: W / 2, y: front ? 470 : 760, o: jb.o, s: jb.s }, { size: 140, top: '#e9e2d6', bot: '#9a8f80' });
    if (front) {
      const h = scr(headPos(aff));
      [[53.55, -200, 10], [54.05, 210, -30]].forEach(([a, dx, dy], i) => {
        const q = pop(t, a, 54.55);
        if (q.o > 0) ov.html('cg' + i, IC.cough(), { x: h.x + dx - (t - a) * 60 * Math.sign(dx), y: h.y + dy, o: q.o * 0.9, s: q.s * 0.7 });
      });
    }
    return land;
  }],
  // S12 — the rain comes back
  [54.6, 57.9, (t) => {
    land.setDry(dryAt(t), droopAt(t));
    const hz = 1 - easeOut(inv(54.6, 56.0, t));
    const rn = keys(t, [[54.6, 0.4], [55.2, 0.85], [57.9, 0.6]]);
    land.setSky({ haze: hz * 0.6, rain: rn });
    land.setPlumes(t, hz * 0.4);
    const ax = FOREST_VIEW.x, az = FOREST_VIEW.z;
    placeAff(aff, ax, az, Math.PI - 0.2);
    const open = keys(t, [[54.75, 0], [55.2, 1]]);
    const jump = t > 55.35 && t < 55.9 ? Math.sin(((t - 55.35) / 0.55) * Math.PI) * 0.12 : 0;
    aff.pose(standPose(t, 10, {
      yaw: Math.PI - 0.2, smile: 1, brow: 0.6, bob: jump, headPitch: -0.3 * open, lookY: 0.5 * open,
      wow: keys(t, [[54.65, 0], [54.85, 0.7], [55.25, 0]]),
      armL: { reach: [lerp(0.55, 0.9, open), lerp(0.3, 1.05, open), lerp(0.25, 0.55, open)], pole: [1, -0.7, -0.2], wy: -0.9 * open },
      armR: { reach: [lerp(-0.55, -0.9, open), lerp(0.3, 1.05, open), lerp(0.25, 0.55, open)], pole: [-1, -0.7, -0.2], wy: 0.9 * open },
    }));
    const k = easeInOut(inv(54.6, 57.9, t));
    lookCam(V(ax + lerp(0.6, 0.9, k), lerp(0.9, 0.75, k), az - lerp(1.9, 2.6, k)), V(ax, lerp(0.85, 1.0, k), az + 2), 52);
    land.placeSun(cam.position, V(0.5, 0.35, -1).normalize());
    land.light(V(ax, 0.6, az), [0.3, 0.9, -0.8]);
    hazeTint(hz * 0.6);
    rain(t, rn, { n: 190 });
    const q = pop(t, 54.9, 57.85, { from: 1.8 });
    ov.bubble('hujan', 'HUJAN!', { x: W / 2, y: 470 + Math.sin(t * 4) * 6, o: q.o, s: q.s, r: -3 }, { size: 170, top: '#bfe8ff', bot: '#3fa2ff' });
    tagAt('my2', 'MALAYSIA SELALU HUJAN', W / 2, 650, t, 56.24, 57.85, { bg: BLUE, small: true });
    return land;
  }],
  // S13 — the water cycle: sun heats the sea -> vapour -> cloud -> rain
  [57.9, 63.7, (t) => {
    const k = easeInOut(inv(57.9, 63.7, t));
    lookCam(V(lerp(1.5, 0.5, k), lerp(9, 9.5, k), lerp(-40, -38, k)), V(0, 12.5, 0), 56);
    cyc.sky.position.copy(cam.position);
    const pulse = 1 + 0.08 * Math.sin(t * 6) * inv(57.9, 58.3, t);
    cyc.sun.scale.setScalar(pulse * (1 + 0.15 * (pop(t, 57.92, 99).s - 0.3) * (t < 58.6 ? 1 : 0)));
    const form = easeOut(inv(60.9, 61.9, t));
    const drift = easeInOut(inv(61.7, 62.6, t));
    cyc.cloud.position.set(lerp(6, -9, drift), 24, 8);
    cyc.cloud.scale.setScalar(Math.max(0.001, form) * (1 + 0.04 * Math.sin(t * 2)));
    const grey = inv(62.2, 62.8, t);
    cyc.cloudMat.color.setRGB(lerp(1, 0.72, grey), lerp(1, 0.76, grey), lerp(1, 0.84, grey));
    cyc.cloudMat.emissiveIntensity = lerp(0.35, 0.1, grey);
    const sun = scr(cyc.sun.position);
    const sea = scr(V(11, 0, 2));
    const cl = scr(cyc.cloud.position);
    const hill = scr(V(-9, 6, 8));
    pinTag('cMat', 'MATAHARI', sun, t, 57.92, 63.65, { bg: '#ffb020', pointer: 'up' }, 190);
    // heat rays from the sun to the sea
    const hr = inv(58.4, 58.9, t) * (1 - inv(60.3, 60.8, t));
    for (let i = 0; i < 3; i++) {
      const a = hr * clamp((t - 58.4 - i * 0.15) * 3);
      if (a > 0) ov.dashed(sun.x + 70, sun.y + 60 + i * 30, sea.x - 140 + i * 120, sea.y - 120, t, { color: '#ffb020', w: 10, a, dash: [26, 20] });
    }
    tagAt('cLaut', 'AIR LAUT', clamp(sea.x, 200, 880), Math.min(sea.y + 60, 1320), t, 58.96, 63.65, { bg: BLUE });
    vapour(t, sea.x - 200, sea.x + 200, sea.y - 30, lerp(sea.y - 380, scr(V(6, 24, 8)).y + 80, inv(59.8, 61.2, t)), inv(59.8, 60.3, t) * (1 - inv(62.0, 62.4, t)));
    tagAt('cWap', 'WAP', clamp(sea.x + 250, 200, 900), sea.y - 300, t, 60.16, 63.65, { bg: '#7fb8d8' });
    pinTag('cAwan', 'AWAN', cl, t, 61.36, 63.65, { bg: '#5f7fa8', pointer: 'down' }, -200);
    const ra = inv(62.75, 63.0, t);
    if (ra > 0) rain(t, ra, { x0: cl.x - 260, x1: cl.x + 240, y0: cl.y + 70, y1: hill.y + 90, n: 120, len: 60, slant: 0.05, seed: 12 });
    pinTag('cHujan', 'HUJAN', hill, t, 62.8, 63.65, { bg: BLUE }, 150);
    ov.flash(1 - inv(57.9, 58.2, t));
    return cyc;
  }],
  // S14 — save water: close the tap while brushing
  [63.7, 69.2, (t) => {
    const a = bath.aff;
    a.root.rotation.y = 0;
    a.root.updateMatrixWorld(true);
    a.pose({ yaw: 0 });
    const hp = bath.tapHandle.getWorldPosition(V(0, 0, 0)).add(V(0, 0.03, 0.08));
    const tgt = a.toTorso(hp);
    const brushK = keys(t, [[63.7, 1], [66.9, 1], [67.15, 0.6], [68.0, 0.6], [68.3, 1]]);
    const reach = keys(t, [[66.95, 0], [67.3, 1], [67.9, 1], [68.2, 0]]);
    const off = keys(t, [[67.35, 0], [67.75, 1]]);
    bath.tapHandle.rotation.y = lerp(0.9, 0, off);
    bath.stream.scale.set(1, Math.max(0.001, 1 - off), 1);
    bath.stream.position.y = 0.1 - 0.1 * off;
    bath.stream.visible = off < 0.98;
    const sc = Math.sin(t * 15) * 0.1 * (t < 66.9 || t > 68.2 ? 1 : 0);
    const thumbs = keys(t, [[68.3, 0], [68.6, 1], [69.2, 1]]);
    a.pose({
      yaw: 0, blink: blinkAt(t, 11), talk: talk(t) * 0.5, smile: 0.9, brow: 0.5, headYaw: 0.05 * Math.sin(t * 15) * brushK,
      armR: { reach: [lerp(-0.6, -0.12 + sc, brushK), lerp(0.4, 1.32, brushK), lerp(0.4, 0.75, brushK)], pole: [-1, -0.6, -0.2], wx: 0.2, wy: 0.3 },
      armL: thumbs > 0 ? { ...POSES.thumbsUpR.armR, reach: [0.32, 0.62, 0.62], pole: [1, -0.6, -0.3], thumb: thumbs, wy: 1.2 } : { reach: [lerp(0.55, tgt[0], reach), lerp(0.4, tgt[1], reach), lerp(0.4, tgt[2], reach)], pole: [1, -0.8, -0.1], wy: -0.6 * off * reach },
    });
    const k = easeInOut(inv(63.7, 69.2, t));
    lookCam(V(lerp(0.4, 0.3, k), lerp(1.4, 1.35, k), lerp(2.3, 2.05, k)), V(0.0, 0.78, 0), 46);
    const q = pop(t, 66.08, 69.15, { from: 1.6 });
    ov.bubble('jimat', 'JIMAT AIR!', { x: W / 2, y: 470 + Math.sin(t * 3) * 6, o: q.o, s: q.s, r: -3 }, { size: 140, top: '#c8ffd2', bot: '#35b85a' });
    iconAt('dropJ', IC.drop('#5cc8ff', 1.2), 870, 600, t, 66.3, 69.15, 1, 10);
    tagAt('tutup', 'TUTUP PAIP', W / 2 - 40, 1190, t, 67.44, 69.15, { bg: BLUE });
    iconAt('ok', IC.check(), 830, 1180, t, 67.8, 69.15, 0.55);
    tagAt('penting', 'HUJAN PENTING!', W / 2, 1190, t, 63.8, 66.0, { bg: BLUE });
    return bath;
  }],
  // S15 — green again, rainbow; "Apa lagi Affan nak siasat lepas ni?"
  [69.2, 71.6, (t) => {
    land.setDry(0, 0);
    land.setSky({});
    land.setPlumes(t, 0);
    land.water.position.y = -0.3;
    land.rainbow.visible = true;
    placeAff(aff, 0, 1.5, Math.PI);
    const tk = keys(t, [[69.25, 0], [69.6, 1], [71.6, 1]]);
    const th = POSES.thinkR.armR;
    aff.pose(standPose(t, 12, {
      yaw: Math.PI, smile: 1, brow: 0.3 + 0.4 * tk, headRoll: -0.12 * tk, lookX: 0.35 * tk, lookY: 0.4 * tk, headPitch: -0.08 * tk,
      armR: { reach: [lerp(-0.55, th.reach[0], tk), lerp(0.25, th.reach[1], tk), lerp(0.1, th.reach[2], tk)], pole: th.pole, point: tk, wx: th.wx * tk },
    }));
    const k = easeInOut(inv(69.2, 71.6, t));
    lookCam(V(lerp(0.45, 0.3, k), 0.75, lerp(-1.9, -1.6, k)), V(0, 1.0, 2.5), 50);
    land.placeSun(cam.position, V(-0.7, 0.5, -1).normalize());
    land.light(V(0, 0.6, 1.5));
    ov.flash((1 - inv(69.2, 69.5, t)) * 0.9);
    const h = scr(headPos(aff));
    [[69.4, -260, -230, '#ffcf33', -12], [69.7, 250, -280, '#3fa2ff', 10], [70.0, 300, -60, '#ffcf33', 14]].forEach(([a, dx, dy, c, r], i) => {
      const q = pop(t, a, 71.55);
      if (q.o > 0) ov.html('qq' + i, ICONS.qmark(c), { x: h.x + dx, y: h.y + dy + Math.sin(t * 3 + i) * 10, o: q.o, s: q.s * 0.85, r });
    });
    return land;
  }],
  // Outro — The Curious Affan logo
  [71.6, DURATION, (t) => {
    const k = easeOut(inv(71.6, 72.3, t));
    outro.aff.root.position.set(0, 0, 0);
    const th2 = POSES.thinkR.armR;
    outro.aff.pose({ ...POSES.thinkR, armR: { ...th2 }, smile: 1, blink: blinkAt(t, 9), headRoll: -0.08, lookX: 0.25, lookY: 0.15, headYaw: 0.08 });
    lookCam(V(0, 2.6, lerp(7.5, 5.4, k)), V(0, 2.3, 0), 40);
    const hc = scr(V(0, 2.95, 0));
    ov.flash((1 - inv(71.6, 71.95, t)) * 1.0);
    const g = ov.g;
    const ra = inv(71.7, 72.3, t);
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
    const ic = pop(t, 72.2, 99);
    ov.html('oDrop', IC.drop('#5cc8ff', 1.1), { x: 175, y: 470 + Math.sin(t * 2) * 8, o: ic.o, s: ic.s * 0.9, r: -10 });
    ov.html('oQ1', ICONS.qmark('#ffcf33'), { x: 880, y: 420 + Math.sin(t * 2 + 1) * 8, o: ic.o, s: ic.s * 0.9, r: 12 });
    ov.html('oQ2', ICONS.qmark('#2f6fff'), { x: 220, y: 720 + Math.sin(t * 2 + 2) * 8, o: ic.o, s: ic.s * 0.6, r: -12 });
    const l1 = pop(t, 71.9, 99), l2 = pop(t, 72.1, 99), l3 = pop(t, 72.3, 99);
    drawLogo(ov, { k: [l1, l2, l3], star: pop(t, 72.5, 99) });
    return outro;
  }],
];

function frame(t) {
  ov.begin();
  cam.aspect = W / H;
  cam.updateProjectionMatrix();
  land.rainbow.visible = false;
  land.ball.visible = false;
  land.setPlumes(t, 0);
  land.water.position.y = -0.3;
  land.soilCracks.userData.set(0);
  land.setPadi(0, 0);
  land.tap.userData.stream.visible = false;
  land.tap.userData.drop.visible = false;
  land.tap.userData.handle.rotation.y = 0;
  const shot = SHOTS.find(([a, b]) => t >= a && t < b) || SHOTS[SHOTS.length - 1];
  const world = shot[2](t);
  if (world.sky) world.sky.position.copy(cam.position);
  renderer.render(world.scene, cam);
  if (world !== outro) ov.vignette(0.28);
  if (world !== outro) calendarHUD(t);
  ov.captions(t, CAPTIONS, KEYWORDS);
  ov.end();
}

// Cover / thumbnail (9:16): Affan sweating under a blazing sun on cracked,
// parched ground, with the title, episode badge and series logo. Key elements
// stay inside the centre 3:4 area (y 240-1680) that profile grids show.
const THUMB = { cam: [0.5, 0.5, -2.05], look: [0, 1.2, 2.5], fov: 50 };
window.setThumb = (o) => Object.assign(THUMB, o);
function thumbnail() {
  ov.begin();
  cam.aspect = W / H;
  cam.updateProjectionMatrix();
  land.setDry(1, 1);
  land.setSky({ hot: 1 });
  land.setPadi(1, 1);
  land.setPlumes(0, 0);
  land.rainbow.visible = false;
  land.ball.visible = false;
  land.soilCracks.userData.set(1);
  placeAff(aff, 0, 1.5, Math.PI);
  aff.pose({
    yaw: Math.PI, blink: 0, talk: 0, wow: 0.9, brow: 1, lookY: 0.35, lookX: -0.2, headPitch: -0.12, headYaw: -0.1,
    armR: { reach: [-0.12, 1.85, 0.7], pole: [-1, -0.2, -0.6] },
    armL: { reach: [0.62, 1.45, 0.8], pole: [1, -0.6, -0.4], wz: 0.3 },
  });
  lookCam(V(...THUMB.cam), V(...THUMB.look), THUMB.fov);
  land.placeSun(cam.position, V(-0.3, 0.42, 1).normalize());
  land.light(V(0, 0.6, 1.5));
  land.sky.position.copy(cam.position);
  renderer.render(land.scene, cam);
  const g = ov.g;
  const top = g.createLinearGradient(0, 0, 0, 760);
  top.addColorStop(0, 'rgba(120,40,10,0.55)');
  top.addColorStop(1, 'rgba(120,40,10,0)');
  g.fillStyle = top;
  g.fillRect(0, 0, W, 760);
  const bot = g.createLinearGradient(0, H - 900, 0, H);
  bot.addColorStop(0, 'rgba(60,24,8,0)');
  bot.addColorStop(1, 'rgba(60,24,8,0.75)');
  g.fillStyle = bot;
  g.fillRect(0, H - 900, W, 900);
  ov.vignette(0.3);
  heat(2.2, 0.9, { y0: 700, y1: 1450, n: 10 });
  ov.tag('thBadge', 'EPISOD 22', { x: W / 2, y: 300 }, { bg: '#2f7bff', small: true });
  ov.bubble('thTitle', 'TIADA HUJAN\nLANGSUNG?', { x: W / 2, y: 480, r: -2 }, { size: 122, top: '#ffe45c', bot: '#ff8a1f' });
  ov.tag('thMy', 'APA JADI DI MALAYSIA?', { x: W / 2, y: 735 }, { bg: '#e8443a', small: true });
  ov.html('thTh', IC.thermo(0.95), { x: 905, y: 1000, r: 8, s: 0.75 });
  ov.html('thD', IC.drop('#7fd6ff', 0.8), { x: 175, y: 980, r: -14, s: 1 });
  drawLogo(ov, { y: 1425, scale: 0.58 });
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
