// THE CURIOUS AFFAN — Episode 026: "Organ Apa Paling Keras Dalam Badan Kita?"
// Hook story -> TOP 3 countdown (femur, temporal bone) -> reveal: teeth (enamel)
// and why. Every shot is a pure function of time t (seconds), synced to
// audio/narration.mp3.
import * as THREE from 'three';
import { makeRenderer, loadEnvelope, toScreen, clamp, lerp, inv, easeOut, easeIn, easeInOut, backOut, keys, wobble, rng, W, H } from '../../shared/core.js';
import { POSES, blinkAt } from '../../shared/affan.js';
import { Overlay, pop, ICONS, drawLogo } from '../../shared/overlay.js';
import { CAPTIONS, KEYWORDS } from './captions.js';
import { buildPark, buildStudio, buildCrystals, buildOutro, PODIUM } from './worlds.js';

const FPS = 30;
const DURATION = 84.3;

const stage = document.getElementById('stage');
const canvas = document.createElement('canvas');
stage.appendChild(canvas);
const renderer = makeRenderer(canvas);
renderer.localClippingEnabled = true;
const ov = new Overlay(stage);
// fonts first: podium numbers and labels are drawn into textures at build time
const FONTS = ['800 60px "Baloo 2"', '700 60px "Baloo 2"', '700 60px Fredoka', '600 60px Fredoka'];
await Promise.all(FONTS.map((f) => document.fonts.load(f)));
const park = buildPark();
const studio = buildStudio();
const crys = buildCrystals();
const outro = buildOutro();
const cam = new THREE.PerspectiveCamera(50, W / H, 0.05, 2000);
let env = { at: () => 0 };

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const talk = (t) => clamp(env.at(t) * 1.2);
const scr = (p) => toScreen(p, cam);
function lookCam(pos, look, fov = 50, roll = 0) {
  cam.position.copy(pos);
  cam.fov = fov;
  cam.updateProjectionMatrix();
  cam.up.set(Math.sin(roll), Math.cos(roll), 0);
  cam.lookAt(look);
  cam.updateMatrixWorld(true);
}
const shake = (t, a, b, amp = 0.15) => {
  const k = inv(a, b, t);
  if (k <= 0 || k >= 1) return V(0, 0, 0);
  const d = amp * (1 - k);
  return V(Math.sin(t * 61) * d, Math.sin(t * 47 + 1) * d, 0);
};

const ORANGE = '#ff8a3d', BLUE = '#2f9bff', PINK = '#ff5fa2', GREEN = '#2fbf5a', PURPLE = '#7a5cff', TEAL = '#16b3c4';

// ----------------------------------------------------------------- 2D icons
const SVG = {
  check: () => `<svg width="200" height="200" viewBox="0 0 200 200"><circle cx="100" cy="100" r="88" fill="#2fbf5a" stroke="#fff" stroke-width="14"/><path d="M55 104 L88 136 L148 70" fill="none" stroke="#fff" stroke-width="24" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  medal: (n, c1, c2) => `<svg width="260" height="300" viewBox="0 0 260 300"><path d="M70 0 L110 110 L150 110 L110 0 Z" fill="#ff5f6d"/><path d="M190 0 L150 110 L110 110 L150 0 Z" fill="#2f9bff"/>
    <circle cx="130" cy="185" r="105" fill="#fff"/><circle cx="130" cy="185" r="92" fill="${c1}" stroke="${c2}" stroke-width="12"/>
    <text x="130" y="236" text-anchor="middle" font-family="Baloo 2" font-weight="800" font-size="150" fill="#fff" stroke="#17256b" stroke-width="14" paint-order="stroke" stroke-linejoin="round">${n}</text></svg>`,
  shield: () => `<svg width="220" height="250" viewBox="0 0 220 250"><path d="M110 12 L200 46 C200 140 160 205 110 236 C60 205 20 140 20 46 Z" fill="#ffb13b" stroke="#fff" stroke-width="14" stroke-linejoin="round"/><path d="M110 40 L172 64 C170 132 144 178 110 202 Z" fill="#ffd36b"/></svg>`,
  sun: () => `<svg width="220" height="220" viewBox="0 0 220 220"><g stroke="#ffb000" stroke-width="16" stroke-linecap="round">${Array.from({ length: 8 }, (_, i) => { const a = (i / 8) * Math.PI * 2; return `<line x1="${110 + Math.cos(a) * 72}" y1="${110 + Math.sin(a) * 72}" x2="${110 + Math.cos(a) * 100}" y2="${110 + Math.sin(a) * 100}"/>`; }).join('')}</g><circle cx="110" cy="110" r="56" fill="#ffd84a" stroke="#fff" stroke-width="10"/></svg>`,
  moon: () => `<svg width="200" height="200" viewBox="0 0 200 200"><path d="M130 18 A86 86 0 1 0 182 138 A70 70 0 1 1 130 18 Z" fill="#ffe9a8" stroke="#fff" stroke-width="10" stroke-linejoin="round"/><circle cx="60" cy="40" r="7" fill="#fff"/><circle cx="168" cy="40" r="5" fill="#fff"/></svg>`,
  crown: () => `<svg width="240" height="180" viewBox="0 0 240 180"><path d="M20 150 L30 40 L80 95 L120 20 L160 95 L210 40 L220 150 Z" fill="#ffd84a" stroke="#17256b" stroke-width="12" stroke-linejoin="round"/><rect x="20" y="138" width="200" height="30" rx="8" fill="#ffb000" stroke="#17256b" stroke-width="12"/><circle cx="120" cy="96" r="14" fill="#ff5f6d"/><circle cx="70" cy="122" r="10" fill="#2f9bff"/><circle cx="170" cy="122" r="10" fill="#2fbf5a"/></svg>`,
  bolt: () => `<svg width="160" height="220" viewBox="0 0 160 220"><path d="M95 8 L20 120 L74 120 L56 212 L140 90 L84 90 Z" fill="#ffd84a" stroke="#17256b" stroke-width="12" stroke-linejoin="round"/></svg>`,
  down: (c = '#ff5f6d') => `<svg width="160" height="230" viewBox="0 0 160 230"><path d="M52 10 H108 V130 H148 L80 220 L12 130 H52 Z" fill="${c}" stroke="#fff" stroke-width="12" stroke-linejoin="round"/></svg>`,
  vruler: (h) => `<svg width="90" height="${h}" viewBox="0 0 90 ${h}"><path d="M45 6 L82 50 H58 V${h - 50} H82 L45 ${h - 6} L8 ${h - 50} H32 V50 H8 Z" fill="#ffd84a" stroke="#17256b" stroke-width="8" stroke-linejoin="round"/></svg>`,
  bump: () => `<svg width="200" height="200" viewBox="0 0 200 200"><g fill="#ff5f6d" stroke="#fff" stroke-width="8" stroke-linejoin="round"><path d="M100 10 L118 70 L180 60 L135 105 L175 155 L112 135 L100 192 L86 135 L24 155 L66 105 L20 60 L82 70 Z"/></g></svg>`,
};

function confetti(t, t0, { n = 70, seed = 3, dur = 3.2 } = {}) {
  const k = t - t0;
  if (k < 0 || k > dur) return;
  const g = ov.g;
  const R = rng(seed);
  const cols = ['#ffd84a', '#ff5f6d', '#2f9bff', '#2fbf5a', '#b36bff', '#ff9f1c'];
  for (let i = 0; i < n; i++) {
    const x0 = W / 2 + (R() - 0.5) * 300, vx = (R() - 0.5) * 1500, vy = -900 - R() * 1100, sp = 4 + R() * 8, sz = 14 + R() * 16;
    const x = x0 + vx * k * Math.exp(-k * 0.6);
    const y = 700 + vy * k + 900 * k * k;
    if (y > H + 40) continue;
    g.save();
    g.globalAlpha = clamp((dur - k) / 0.6);
    g.translate(x, y);
    g.rotate(k * sp + i);
    g.scale(1, Math.cos(k * sp * 1.3 + i));
    g.fillStyle = cols[i % cols.length];
    g.fillRect(-sz / 2, -sz / 4, sz, sz / 2);
    g.restore();
  }
}

function foam(t, cx, cy, a) {
  if (a <= 0) return;
  const g = ov.g;
  const R = rng(77);
  for (let i = 0; i < 26; i++) {
    const ph = R() * 10, sp = 0.6 + R();
    const life = (t * sp + ph) % 1.6;
    const x = cx + (R() - 0.5) * 220 + Math.sin(t * 3 + i) * 12;
    const y = cy + (R() - 0.3) * 120 - life * 140;
    const r = (6 + R() * 18) * Math.min(1, life * 3);
    g.save();
    g.globalAlpha = a * clamp(1.6 - life) * 0.9;
    g.fillStyle = 'rgba(255,255,255,0.55)';
    g.strokeStyle = '#ffffff';
    g.lineWidth = 3;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
    g.stroke();
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.arc(x - r * 0.35, y - r * 0.35, r * 0.22, 0, Math.PI * 2);
    g.fill();
    g.restore();
  }
}

// Hardness comparison bars: bone vs enamel.
function hardBars(t, a0) {
  const a = pop(t, a0, 59.4);
  if (a.o <= 0) return;
  const g = ov.g;
  const x0 = 150, y0 = 860, w = 780, h = 300;
  g.save();
  g.globalAlpha = a.o;
  g.fillStyle = 'rgba(14,20,58,0.82)';
  g.strokeStyle = '#ffffff';
  g.lineWidth = 8;
  g.beginPath();
  g.roundRect(x0, y0, w, h, 36);
  g.fill();
  g.stroke();
  const rows = [['TULANG', 0.55, '#ffb36b', 56.9], ['ENAMEL', 1.0, '#7fe6ff', 57.84]];
  rows.forEach(([lab, v, c, at], i) => {
    const y = y0 + 70 + i * 120;
    g.font = '800 46px "Baloo 2"';
    g.fillStyle = '#ffffff';
    g.textBaseline = 'middle';
    g.fillText(lab, x0 + 36, y + 20);
    const bw = (w - 300) * v * easeOut(inv(at, at + 0.6, t));
    g.fillStyle = 'rgba(255,255,255,0.15)';
    g.beginPath();
    g.roundRect(x0 + 250, y, w - 300, 44, 22);
    g.fill();
    if (bw > 4) {
      g.fillStyle = c;
      g.beginPath();
      g.roundRect(x0 + 250, y, bw, 44, 22);
      g.fill();
    }
  });
  g.restore();
}

function xrayScan(t, a, b) {
  const k = inv(a, b, t);
  if (k <= 0 || k >= 1) return;
  const g = ov.g;
  const y = lerp(260, 1500, easeInOut(k));
  const gr = g.createLinearGradient(0, y - 60, 0, y + 60);
  gr.addColorStop(0, 'rgba(120,200,255,0)');
  gr.addColorStop(0.5, 'rgba(170,230,255,0.85)');
  gr.addColorStop(1, 'rgba(120,200,255,0)');
  g.fillStyle = gr;
  g.fillRect(0, y - 60, W, 120);
}

function tint(rgb, a) {
  if (a <= 0) return;
  ov.g.fillStyle = `rgba(${rgb},${a})`;
  ov.g.fillRect(0, 0, W, H);
}

function pinTag(id, text, p, t, a, b, style, dy = -90) {
  const q = pop(t, a, b);
  if (q.o <= 0 || !p.visible) return;
  ov.tag(id, text, { x: clamp(p.x, 190, 890), y: clamp(p.y + dy, 300, 1360), o: q.o, s: q.s }, style);
}

function medal(t, n, a, b, x = 190, y = 390) {
  const c = { 1: ['#ffc93c', '#f08c00'], 2: ['#b8c8e6', '#6f86b3'], 3: ['#f0a36b', '#c0602a'] }[n];
  const q = pop(t, a, b, { from: 0.1, fin: 0.5 });
  ov.html('medal' + n, SVG.medal(n, c[0], c[1]), { x, y: y + Math.sin(t * 2.4) * 6, o: q.o, s: q.s * 0.85, r: -8 + Math.sin(t * 1.7) * 3 });
}

// ------------------------------------------------------------------- park
const BIKE_V = 2.6;
const rideX = (t) => -6.4 + BIKE_V * Math.min(t, 2.55) + (t > 2.55 ? BIKE_V * 0.35 * easeOut(inv(2.55, 2.92, t)) : 0);
park.rock.position.set(0.38 + 0.88 + 0.1, 0.08, 0.12);

function bikeRider(t, { tip = 0, wob = 0, flail = 0 } = {}) {
  const { rig, bike, aff } = park;
  for (const d of park.dust) d.visible = false;
  rig.position.set(rideX(t), 0, 0);
  rig.rotation.set(-tip * 1.35, 0, wob);
  bike.position.set(0, 0, 0);
  bike.rotation.set(0, 0, 0);
  const dist = rideX(t) + 6.4;
  for (const w of bike.userData.wheels) w.rotation.z = -dist / 0.5;
  const ph = -dist / 0.62;
  bike.userData.crank.rotation.z = ph;
  aff.root.visible = true;
  aff.root.position.set(-0.36, 0.42, 0);
  aff.root.rotation.set(0, 0, 0);
  aff.pose({ yaw: Math.PI / 2 });
  const gL = aff.toTorso(bike.localToWorld(V(...bike.userData.grips[0])));
  const gR = aff.toTorso(bike.localToWorld(V(...bike.userData.grips[1])));
  const sL = Math.sin(ph), sR = Math.sin(ph + Math.PI);
  aff.pose({
    yaw: Math.PI / 2, lean: 0.22, blink: blinkAt(t, 1), talk: talk(t), smile: 1 - flail, wow: flail, brow: flail,
    headPitch: -0.08, headYaw: -0.55 - flail * 0.2, lookX: -0.3,
    legL: { x: -1.05 + 0.38 * sL, knee: 1.25 - 0.5 * sL }, legR: { x: -1.05 + 0.38 * sR, knee: 1.25 - 0.5 * sR },
    armL: flail > 0 ? { reach: gL.map((v, i) => lerp(v, [0.85, 1.9, 0.3][i], flail)), pole: [1, -0.4, -0.5] } : { reach: gL, pole: [1, -0.6, -0.6] },
    armR: flail > 0 ? { reach: gR.map((v, i) => lerp(v, [-0.85, 1.9, 0.3][i], flail)), pole: [-1, -0.4, -0.5] } : { reach: gR, pole: [-1, -0.6, -0.6] },
  });
}

function dust(t, t0, at) {
  park.dust.forEach((d, i) => {
    const k = (t - t0) / 1.2;
    d.visible = k > 0 && k < 1;
    if (!d.visible) return;
    const a = (i / park.dust.length) * Math.PI * 2;
    const r = 0.3 + 1.2 * easeOut(k);
    d.position.set(at.x + Math.cos(a) * r * 1.4, 0.15 + 0.3 * easeOut(k) + 0.1 * Math.sin(i * 3), at.z - 0.6 + Math.sin(a) * r * 0.5);
    d.scale.setScalar(0.4 + 0.8 * easeOut(k));
  });
  park.dustMat.opacity = 0.6 * (1 - clamp((t - t0) / 1.2));
}

// Affan sitting on the path after the fall, bike lying beside him.
const FALL_X = 1.0;
function fallenScene(t) {
  const { rig, bike, aff } = park;
  for (const d of park.dust) d.visible = false;
  rig.position.set(FALL_X, 0, 0);
  rig.rotation.set(0, 0, 0);
  bike.position.set(0.4, 0.07, -1.3);
  bike.rotation.set(-Math.PI / 2 + 0.06, 0.2, 0);
  bike.userData.wheels[1].rotation.z = -t * 5;
  bike.userData.wheels[0].rotation.z = -t * 2;
}

// ------------------------------------------------------------------ studio
function studioReset() {
  for (const n of [1, 2, 3]) {
    const p = studio.podiums[n];
    p.cover.visible = true;
    p.cover.position.y = PODIUM[n].h;
    p.cover.scale.setScalar(1);
    p.cover.rotation.y = 0;
    p.spot.intensity = 0;
    p.beam.material.opacity = 0;
  }
  studio.femur.visible = false;
  studio.head.visible = false;
  studio.tooth.visible = false;
  studio.tooth.userData.full.visible = true;
  studio.tooth.userData.cut.visible = false;
  studio.tooth.userData.crack.visible = false;
  studio.tooth.userData.face.visible = true;
  studio.aff.root.visible = false;
  studio.setXray(false);
  studio.brush.visible = false;
  studio.hemi.intensity = 1.3;
  studio.key.intensity = 2.2;
  studio.halo.material.opacity = 0;
  const h = studio.head.userData;
  h.ivory.transparent = false;
  h.ivory.opacity = 1;
  h.ivory.depthWrite = true;
  h.plateMat.opacity = 1;
  h.coch.visible = false;
  h.plateMat.emissiveIntensity = 0.6;
}
function spotOn(n, k) {
  const p = studio.podiums[n];
  p.spot.intensity = 130 * k;
  p.beam.material.opacity = 0.12 * k;
}
// Lift the cover off podium n (k = 0 covered, 1 gone).
function uncover(n, k) {
  const c = studio.podiums[n].cover;
  c.visible = k < 1;
  c.position.y = PODIUM[n].h + 6 * easeIn(k);
  c.rotation.y = k * 6;
  c.scale.setScalar(1 - 0.5 * k);
}
const topOf = (n) => PODIUM[n].h + 0.3;
function studioAffan(t, x, z, p = {}) {
  const a = studio.aff;
  a.root.visible = true;
  a.root.position.set(x, 0.3, z);
  a.pose({ blink: blinkAt(t, 3), talk: talk(t), ...p });
}

// ======================================================================= SHOTS
const SHOTS = [
  // S1 — riding the bike in the park, front wheel hits a stone, tips over
  [0, 2.92, (t) => {
    const wob = t > 2.4 ? Math.sin((t - 2.4) * 30) * 0.1 * inv(2.4, 2.55, t) : 0;
    const tip = easeIn(inv(2.55, 2.92, t));
    bikeRider(t, { tip, wob, flail: easeOut(inv(2.5, 2.75, t)) });
    const x = rideX(t);
    lookCam(V(x + 3.6, 2.9, 8.6), V(x + 0.6, 2.7, 0), 46);
    const p = pop(t, 0.15, 2.85, { fin: 0.45 });
    ov.bubble('hook', 'ORGAN APA\nPALING KERAS?', { x: W / 2, y: 470 + Math.sin(t * 3) * 6, o: p.o, s: p.s }, { size: 104 });
    const q = pop(t, 0.45, 2.85);
    ov.tag('ep', 'EPISOD 26', { x: W / 2, y: 300, o: q.o, s: q.s }, { bg: '#2f7bff', small: true });
    const ex = pop(t, 2.45, 2.92, { from: 1.6 });
    const hd = scr(park.aff.parts.head.getWorldPosition(V(0, 0, 0)));
    ov.html('excl', `<svg width="80" height="160" viewBox="0 0 80 160"><text x="40" y="140" text-anchor="middle" font-family="Baloo 2" font-weight="800" font-size="170" fill="#ff5f6d" stroke="#fff" stroke-width="14" paint-order="stroke">!</text></svg>`, { x: hd.x + 150, y: hd.y - 170, o: ex.o, s: ex.s * 0.9, r: 10 });
    return park;
  }],
  // S2 — BEDEBUK! Affan sits on the path holding his sore knee
  [2.92, 6.05, (t) => {
    fallenScene(t);
    const a = park.aff;
    a.root.position.set(-0.2, -0.74, 0.1);
    const kneeHold = { reach: [-0.32, 0.12, 0.62], pole: [-1, -0.5, 0.2] };
    a.pose({
      yaw: 0.35, lean: 0.12, blink: keys(t, [[2.92, 1], [3.3, 0.55], [5.3, 0.55], [5.6, 0]]), talk: talk(t), smile: 0, wow: keys(t, [[2.92, 0.9], [3.6, 0.3]]), brow: 1,
      headPitch: 0.15, headYaw: keys(t, [[2.92, 0], [4.0, 0.25]]), headRoll: 0.12, lookY: -0.4,
      legL: { x: -1.45, knee: 0.15 }, legR: { x: -2.15, knee: 2.0 },
      armL: { reach: [-0.05, 0.2, 0.72], pole: [1, -0.5, 0.2] }, armR: kneeHold,
    });
    const sh = shake(t, 2.92, 3.5, 0.2);
    lookCam(V(FALL_X + 0.6 + sh.x, 2.3 + sh.y, 6.6), V(FALL_X - 0.2, 1.1, 0), 46);
    dust(t, 2.92, V(FALL_X, 0, 0));
    const b = pop(t, 2.94, 4.1, { from: 2.4, fin: 0.25 });
    ov.bubble('bedebuk', 'BEDEBUK!', { x: W / 2, y: 520, o: b.o, s: b.s, r: -6 }, { size: 150, top: '#ffe45c', bot: '#ff7a1c' });
    ov.html('bump', SVG.bump(), { x: W / 2 + 330, y: 380, o: b.o, s: b.s * 0.7, r: t * 40 });
    const knee = scr(a.parts.legs.R.knee.getWorldPosition(V(0, 0, 0)));
    const ad = pop(t, 4.1, 6.0);
    ov.bubble('aduh', 'ADUH!', { x: knee.x + 40, y: clamp(knee.y - 330, 380, 1200), o: ad.o, s: ad.s, r: 5 }, { size: 120, top: '#ffb3c1', bot: '#ff4d6a' });
    if (ad.o > 0) for (let i = 0; i < 3; i++) ov.star(knee.x + Math.cos(t * 4 + i * 2.1) * 70, knee.y - 40 + Math.sin(t * 4 + i * 2.1) * 30, 22, ad.o, '#ffd84a', t * 3);
    return park;
  }],
  // S3 — "tapi tulang Affan tak patah pun!": he hops up, all good
  [6.05, 8.85, (t) => {
    fallenScene(t);
    const a = park.aff;
    const up = easeOut(inv(6.1, 6.7, t));
    const hop = t > 7.85 && t < 8.35 ? Math.sin(((t - 7.85) / 0.5) * Math.PI) * 0.35 : 0;
    a.root.position.set(-0.2, lerp(-0.74, 0, up), 0.1);
    const th = keys(t, [[7.7, 0], [8.0, 1]]);
    const tu = POSES.thumbsUpR.armR;
    a.pose({
      yaw: lerp(0.35, 0.15, up), bob: hop, blink: blinkAt(t, 2), talk: talk(t), smile: 1, brow: 0.6,
      headYaw: -0.1, headPitch: lerp(0.15, 0, up), lookY: 0.05,
      legL: { x: lerp(-1.45, 0, up) - 0.2 * hop, knee: lerp(0.15, 0, up) + 0.5 * hop }, legR: { x: lerp(-2.15, 0, up) - 0.2 * hop, knee: lerp(2.0, 0, up) + 0.5 * hop },
      armL: { reach: [0.55, lerp(0.2, 0.3, up), 0.4], pole: [1, -0.6, -0.4] },
      armR: th > 0 ? { reach: [-0.55, 0.3, 0.4].map((r, i) => lerp(r, tu.reach[i], th)), pole: tu.pole, thumb: th, wy: tu.wy * th, wx: tu.wx * th } : { reach: [-0.55, 0.3, 0.4], pole: [-1, -0.6, -0.4] },
    });
    const k = easeInOut(inv(6.05, 8.85, t));
    lookCam(V(FALL_X + 0.2, lerp(2.3, 2.9, k), lerp(6.6, 7.6, k)), V(FALL_X - 0.3, lerp(1.2, 2.1, k), 0), 46);
    const q = pop(t, 7.83, 8.83);
    ov.bubble('takpatah', 'TAK PATAH PUN!', { x: W / 2, y: 430, o: q.o, s: q.s, r: -3 }, { size: 112, top: '#c6ff8a', bot: '#2fbf5a' });
    const c = pop(t, 7.9, 8.83, { from: 2 });
    ov.html('check', SVG.check(), { x: 860, y: 640, o: c.o, s: c.s * 0.75 });
    return park;
  }],
  // S4 — "Doktor kata, tulang kita memang kuat": x-ray legs, strong pose
  [8.85, 12.2, (t) => {
    fallenScene(t);
    const a = park.aff;
    a.root.position.set(-0.2, 0, 0.1);
    const xr = t > 9.25;
    park.setXray(xr, xr ? 0.5 + 0.5 * Math.sin(t * 6) : 0);
    const fl = keys(t, [[10.5, 0], [10.9, 1]]);
    a.pose({
      yaw: 0.05, blink: blinkAt(t, 4), talk: talk(t), smile: 1, brow: 0.7 * fl,
      headPitch: -0.05,
      armL: { reach: [lerp(0.55, 0.95, fl), lerp(0.3, 1.25, fl), lerp(0.35, 0.15, fl)], pole: [1, -0.9, 0.2] },
      armR: { reach: [lerp(-0.55, -0.95, fl), lerp(0.3, 1.25, fl), lerp(0.35, 0.15, fl)], pole: [-1, -0.9, 0.2] },
    });
    const k = easeOut(inv(8.85, 12.2, t));
    lookCam(V(FALL_X - 0.2, 2.1, lerp(8.4, 7.2, k)), V(FALL_X - 0.2, 1.75, 0), 50);
    tint('20,60,140', 0.18 * inv(9.0, 9.4, t));
    xrayScan(t, 8.95, 9.6);
    const d = pop(t, 8.9, 12.15);
    ov.tag('dr', 'KATA DOKTOR:', { x: W / 2, y: 300, o: d.o, s: d.s }, { bg: TEAL, small: true });
    const hip = scr(a.parts.legs.L.hip.getWorldPosition(V(0, 0, 0)));
    pinTag('tulangT', 'TULANG', hip, t, 10.01, 12.15, { bg: BLUE, pointer: 'down' }, -10);
    const kq = pop(t, 11.4, 12.15, { from: 2.2 });
    ov.bubble('kuat', 'KUAT!', { x: W / 2, y: 470, o: kq.o, s: kq.s, r: -4 }, { size: 160 });
    if (kq.o > 0) ov.sparkles(t, { n: 14, seed: 4, y: 300, h: 500, a: kq.o });
    return park;
  }],
  // S5 — the big question; magic swirl into the studio
  [12.2, 17.45, (t) => {
    fallenScene(t);
    park.setXray(false);
    const a = park.aff;
    a.root.position.set(-0.2, 0, 0.1);
    const tk = keys(t, [[12.3, 0], [12.75, 1], [16.5, 1], [16.9, 0]]);
    const th = POSES.thinkR.armR;
    const up = keys(t, [[16.6, 0], [16.9, 1]]);
    a.pose({
      yaw: 0.1, blink: blinkAt(t, 5), talk: talk(t), smile: 0.8, brow: 0.4 + 0.5 * tk,
      headRoll: -0.12 * tk, headYaw: 0.1, lookX: 0.35 * tk, lookY: 0.45 * tk, headPitch: -0.1 * tk,
      armR: tk > 0 ? { reach: [-0.55, 0.3, 0.4].map((r, i) => lerp(r, th.reach[i], tk)), pole: th.pole, point: tk, wx: th.wx * tk } : { reach: [lerp(-0.55, -0.8, up), lerp(0.3, 1.9, up), 0.35], pole: [-1, -0.4, -0.4] },
      armL: { reach: [lerp(0.55, 0.8, up), lerp(0.3, 1.9, up), 0.35], pole: [1, -0.4, -0.4] },
    });
    const k = easeInOut(inv(12.2, 17.45, t));
    lookCam(V(FALL_X - 0.1, lerp(2.9, 2.8, k), lerp(5.4, 4.6, k)), V(FALL_X - 0.2, lerp(2.7, 2.6, k), 0), 46);
    const hd = scr(a.parts.head.getWorldPosition(V(0, 0, 0)));
    [[12.9, -280, -260, '#ffcf33', -12], [13.3, 270, -300, '#3fa2ff', 10], [13.7, 320, -80, '#ff5fa2', 14]].forEach(([at, dx, dy, c, r], i) => {
      const q = pop(t, at, 14.4);
      ov.html('q' + i, ICONS.qmark(c), { x: hd.x + dx, y: hd.y + dy + Math.sin(t * 3 + i) * 10, o: q.o, s: q.s * 0.8, r });
    });
    const b = pop(t, 14.43, 17.4, { fin: 0.4 });
    ov.bubble('bigq', 'ORGAN APA\nPALING KERAS?', { x: W / 2, y: 430 + Math.sin(t * 3) * 6, o: b.o, s: b.s }, { size: 112 });
    ov.swirl(t, W / 2, 900, inv(16.4, 17.4, t));
    ov.flash(inv(17.15, 17.45, t) ** 2);
    return park;
  }],
  // S6 — the TOP 3 studio: three covered podiums. "Jom kita kira, top 3!"
  [17.45, 19.8, (t) => {
    studioReset();
    for (const n of [1, 2, 3]) spotOn(n, 0.6 + 0.4 * Math.sin(t * 5 + n * 2));
    const jump = t > 18.74 && t < 19.3 ? Math.sin(((t - 18.74) / 0.56) * Math.PI) * 0.45 : 0;
    const up = keys(t, [[17.5, 0], [17.8, 1]]);
    studioAffan(t, 0, 3.6, {
      bob: jump, smile: 1, brow: 0.8, wow: keys(t, [[18.7, 0], [18.85, 0.8], [19.4, 0.8], [19.6, 0]]),
      legL: { x: -0.25 * jump, knee: 0.6 * jump }, legR: { x: -0.25 * jump, knee: 0.6 * jump },
      armL: { reach: [lerp(0.55, 0.85, up), lerp(0.25, 1.85 + 0.05 * Math.sin(t * 12), up), 0.3], pole: [1, -0.4, -0.5] },
      armR: { reach: [lerp(-0.55, -0.85, up), lerp(0.25, 1.85 + 0.05 * Math.sin(t * 12 + 1), up), 0.3], pole: [-1, -0.4, -0.5] },
    });
    const k = easeOut(inv(17.45, 19.8, t));
    lookCam(V(lerp(3, 0, k), lerp(8, 3.6, k), lerp(16, 12.5, k)), V(0, lerp(1.5, 2.6, k), 0), 50);
    ov.flash((1 - inv(17.45, 17.8, t)) * 0.95);
    const q = pop(t, 18.74, 19.78, { from: 2.4, fin: 0.3 });
    ov.bubble('top3', 'TOP 3!', { x: W / 2, y: 470, o: q.o, s: q.s, r: -4 }, { size: 200 });
    confetti(t, 18.74);
    return studio;
  }],
  // S7 — No. 3: the thigh bone (femur)
  [19.8, 26.95, (t) => {
    studioReset();
    spotOn(1, 0.15);
    spotOn(2, 0.15);
    spotOn(3, easeOut(inv(19.9, 20.4, t)));
    uncover(3, easeIn(inv(20.3, 20.9, t)));
    const f = studio.femur;
    f.visible = t > 20.5;
    const g = easeOut(inv(20.5, 21.0, t));
    f.scale.setScalar(0.42 * (0.3 + 0.7 * backOut(g)));
    f.rotation.set(0, t * 0.9, 0.12);
    f.position.set(PODIUM[3].x, topOf(3) + 1.3 + 0.08 * Math.sin(t * 2), 0);
    const k = easeInOut(inv(19.8, 21.3, t));
    lookCam(V(lerp(0, PODIUM[3].x - 0.4, k), lerp(3.6, 2.6, k), lerp(12.5, 6.4, k)), V(lerp(0, PODIUM[3].x, k), lerp(2.4, 2.2, k), 0), 50);
    medal(t, 3, 19.84, 26.9);
    if (t > 20.45 && t < 21.5) ov.sparkles(t, { n: 20, seed: 13, y: 400, h: 900, a: 1 - inv(21.0, 21.5, t) });
    const top = scr(V(PODIUM[3].x, topOf(3) + 2.5, 0));
    const bot = scr(V(PODIUM[3].x, topOf(3) + 0.1, 0));
    const tp = pop(t, 21.32, 26.9);
    ov.tag('paha', 'TULANG PAHA', { x: W / 2, y: 330, o: tp.o, s: tp.s }, { bg: ORANGE });
    const fm = pop(t, 21.6, 26.9);
    ov.tag('femur', '(FEMUR)', { x: W / 2, y: 430, o: fm.o, s: fm.s }, { bg: '#c0602a', small: true });
    const pj = pop(t, 24.5, 26.9);
    if (pj.o > 0) {
      const h = Math.abs(bot.y - top.y);
      ov.html('vr', SVG.vruler(Math.round(h)), { x: top.x - 300, y: (top.y + bot.y) / 2, o: pj.o, s: 0.4 + 0.6 * pj.s });
      ov.tag('panjang', 'PALING PANJANG', { x: 300, y: 1230, o: pj.o, s: pj.s }, { bg: BLUE, small: true });
    }
    const ku = pop(t, 25.8, 26.9);
    ov.tag('kuatT', 'PALING KUAT', { x: 760, y: 1230, o: ku.o, s: ku.s }, { bg: '#e8404f', small: true });
    ov.html('bolt', SVG.bolt(), { x: 900, y: 1060, o: ku.o, s: ku.s * 0.6, r: 12 });
    return studio;
  }],
  // S8 — the femur carries our weight: walk, run, jump (x-ray legs)
  [26.95, 32.75, (t) => {
    studioReset();
    spotOn(3, 0.4);
    uncover(3, 1);
    studio.femur.visible = true;
    studio.femur.rotation.set(0, t * 0.9, 0.12);
    studio.femur.scale.setScalar(0.42);
    const a = studio.aff;
    studio.setXray(true, 0.4 + 0.6 * Math.abs(Math.sin(t * 4)));
    // standing (27-29.7), walk (29.7-30.9), run (30.9-31.85), jump (31.88-32.75)
    const walkT = clamp(t - 29.7, 0, 1.2), runT = clamp(t - 30.9, 0, 0.95);
    const x = -2.6 + walkT * 1.2 + runT * 2.6 + (t > 31.85 ? (t - 31.85) * 1.6 : 0);
    const moving = t > 29.7;
    const freq = t < 30.9 ? 2.2 : 3.6;
    const ph = (t - 29.7) * freq * Math.PI;
    const amp = !moving ? 0 : t < 30.9 ? 0.5 : t < 31.85 ? 0.85 : 0;
    const s = Math.sin(ph);
    const jt = inv(31.88, 32.6, t);
    const jump = jt > 0 && jt < 1 ? Math.sin(jt * Math.PI) * 0.6 : 0;
    const crouch = t > 31.7 && t < 31.92 ? Math.sin(inv(31.7, 31.92, t) * Math.PI) : 0;
    const yaw = moving ? lerp(0.3, Math.PI / 2, inv(29.6, 29.9, t)) : 0.3;
    studioAffan(t, x, 3.4, {
      yaw, bob: jump - 0.12 * crouch + (amp > 0 ? 0.05 * Math.abs(Math.cos(ph)) : 0), lean: t > 30.9 && t < 31.85 ? 0.2 : 0, smile: 1, brow: 0.5,
      headYaw: moving ? -0.6 : 0, lookX: moving ? -0.4 : 0,
      legL: { x: -amp * s - 0.6 * crouch - 0.4 * jump, knee: Math.max(0, s) * amp * 1.1 + 1.0 * crouch + 0.8 * jump },
      legR: { x: amp * s - 0.6 * crouch - 0.4 * jump, knee: Math.max(0, -s) * amp * 1.1 + 1.0 * crouch + 0.8 * jump },
      armL: jump > 0.05 ? { reach: [0.85, 1.85, 0.3], pole: [1, -0.4, -0.5] } : { x: 0.6 * amp * s, z: 0.12, el: -0.3 - amp * 0.8 },
      armR: jump > 0.05 ? { reach: [-0.85, 1.85, 0.3], pole: [-1, -0.4, -0.5] } : { x: -0.6 * amp * s, z: -0.12, el: -0.3 - amp * 0.8 },
    });
    const k = easeInOut(inv(26.95, 29.7, t));
    if (t < 29.7) lookCam(V(lerp(-1.2, -2.2, k), lerp(2.8, 2.5, k), lerp(13.5, 12.0, k)), V(-2.6, 2.2, 3.4), 50);
    else lookCam(V(x + 0.6, 2.6, 12.6), V(x + 0.4, 2.3, 3.4), 50);
    const hipL = scr(a.parts.legs.L.hip.getWorldPosition(V(0, 0, 0)));
    const hd = scr(a.parts.head.getWorldPosition(V(0, 0, 0)));
    const w = pop(t, 27.13, 29.65);
    if (w.o > 0) {
      ov.html('down', SVG.down(), { x: hd.x, y: hd.y - 360 + Math.sin(t * 6) * 20, o: w.o, s: w.s * 0.8 });
      ov.tag('berat', 'BERAT BADAN', { x: W / 2, y: 330, o: w.o, s: w.s }, { bg: '#e8404f' });
      ov.html('femurPin', `<svg width="10" height="10"></svg>`, { x: hipL.x, y: hipL.y, o: 0 });
    }
    pinTag('femurT', 'TULANG PAHA', hipL, t, 28.0, 29.65, { bg: ORANGE, pointer: 'down', small: true }, -40);
    const acts = [['BERJALAN', 30.02, 30.88, GREEN], ['BERLARI', 30.9, 31.85, BLUE], ['MELOMPAT', 31.88, 32.72, PINK]];
    acts.forEach(([w2, a2, b2, c], i) => {
      const q = pop(t, a2, b2 + (i === 2 ? 0 : 0.0));
      ov.bubble('act' + i, w2, { x: W / 2, y: 330, o: q.o, s: q.s, r: [-4, 3, -3][i] }, { size: 120, top: '#ffffff', bot: c === GREEN ? '#9ff0a8' : c === BLUE ? '#9fd4ff' : '#ffb3d8' });
    });
    if (t > 30.9 && t < 31.85) ov.speedLines(t, { y0: 800, y1: 1300, n: 10, a: 0.4, dir: -1 });
    return studio;
  }],
  // S9 — No. 2: x-ray head on podium 2, bone near the ear
  [32.75, 37.0, (t) => {
    studioReset();
    spotOn(1, 0.15);
    spotOn(3, 0.15);
    uncover(3, 1);
    studio.femur.visible = true;
    studio.femur.rotation.set(0, t * 0.9, 0.12);
    studio.femur.scale.setScalar(0.42);
    spotOn(2, easeOut(inv(32.85, 33.3, t)));
    uncover(2, easeIn(inv(33.3, 33.9, t)));
    const h = studio.head;
    h.visible = t > 33.5;
    const g = easeOut(inv(33.5, 34.0, t));
    h.scale.setScalar(0.85 * (0.3 + 0.7 * backOut(g)));
    h.position.set(PODIUM[2].x, topOf(2) + 1.35 + 0.06 * Math.sin(t * 2), 0);
    h.rotation.set(0, keys(t, [[33.5, -0.6], [34.6, 0.3], [35.6, 1.05]], easeInOut), 0);
    const k = easeInOut(inv(32.75, 34.3, t));
    lookCam(V(lerp(PODIUM[3].x - 0.4, PODIUM[2].x + 0.3, k), lerp(2.6, 2.75, k), lerp(6.4, 6.6, k)), V(lerp(PODIUM[3].x, PODIUM[2].x, k), 2.55, 0), 50);
    medal(t, 2, 32.85, 36.95);
    if (t > 33.5 && t < 34.6) ov.sparkles(t, { n: 20, seed: 14, y: 400, h: 900, a: 1 - inv(34.1, 34.6, t) });
    const ear = scr(h.localToWorld(V(1.25, -0.25, 0.05)));
    pinTag('telinga', 'DEKAT TELINGA', ear, t, 34.54, 36.95, { bg: BLUE, pointer: 'down', small: true }, -120);
    if (t > 34.5 && ear.visible) ov.dot(ear.x, ear.y, 14, '#ffd84a', pop(t, 34.5, 36.95).o);
    const dk = pop(t, 35.51, 36.95);
    ov.tag('kepala', 'DALAM KEPALA', { x: W / 2, y: 1260, o: dk.o, s: dk.s }, { bg: PURPLE, small: true });
    return studio;
  }],
  // S10 — close-up: the temporal bone, dense and hard
  [37.0, 41.55, (t) => {
    studioReset();
    spotOn(2, 1);
    uncover(2, 1);
    uncover(3, 1);
    const h = studio.head;
    h.visible = true;
    h.scale.setScalar(0.85);
    h.position.set(PODIUM[2].x, topOf(2) + 1.35, 0);
    h.rotation.set(0, 1.05 + 0.1 * Math.sin(t * 0.8), 0);
    const hu = h.userData;
    hu.plateMat.emissiveIntensity = 0.6 + 0.5 * Math.max(0, Math.sin(t * 5));
    const k = easeOut(inv(37.0, 41.55, t));
    const c = h.localToWorld(V(0.75, 0.2, 0.15));
    const dir = h.localToWorld(V(0.75 + 1.0, 0.2 + 0.18, 0.15 + 0.55)).sub(c).normalize();
    lookCam(c.clone().add(dir.multiplyScalar(lerp(4.4, 3.4, k))), c, 46);
    const p = scr(h.localToWorld(V(0.92, 0.32, 0)));
    pinTag('temporal', 'TULANG TEMPORAL', p, t, 37.75, 41.5, { bg: ORANGE, pointer: 'down' }, -230);
    const pd = pop(t, 40.48, 41.5), kr = pop(t, 41.04, 41.5);
    ov.tag('padat', 'PADAT', { x: 290, y: 1230, o: pd.o, s: pd.s }, { bg: PURPLE });
    ov.tag('keras2', 'KERAS', { x: 790, y: 1230, o: kr.o, s: kr.s }, { bg: '#e8404f' });
    if (pd.o > 0) ov.sparkles(t, { n: 10, seed: 21, x: p.x - 200, y: p.y - 150, w: 400, h: 300, a: pd.o, colors: ['#ffd36b', '#fff6c8'] });
    return studio;
  }],
  // S11 — it guards the tiny, delicate inner ear
  [41.55, 46.1, (t) => {
    studioReset();
    spotOn(2, 1);
    uncover(2, 1);
    uncover(3, 1);
    const h = studio.head;
    h.visible = true;
    h.scale.setScalar(0.85);
    h.position.set(PODIUM[2].x, topOf(2) + 1.35, 0);
    h.rotation.set(0, 1.05 + 0.1 * Math.sin(t * 0.8), 0);
    const hu = h.userData;
    const see = easeInOut(inv(41.7, 42.5, t));
    hu.plateMat.opacity = lerp(1, 0.3, see);
    hu.plateMat.emissiveIntensity = 0.5;
    hu.ivory.transparent = true;
    hu.ivory.opacity = lerp(1, 0.35, see);
    hu.ivory.depthWrite = see < 0.5;
    hu.coch.rotation.x = t * 0.6;
    hu.coch.visible = see > 0.05;
    const c = h.localToWorld(V(0.6, 0.12, 0.0));
    const dir = h.localToWorld(V(0.6 + 1.0, 0.12 + 0.18, 0.55)).sub(c).normalize();
    const k = easeInOut(inv(41.55, 44.0, t));
    lookCam(c.clone().add(dir.multiplyScalar(lerp(3.6, 2.8, k))), c, 46);
    const ce = scr(c);
    const sh = pop(t, 42.6, 46.05);
    ov.html('shield', SVG.shield(), { x: ce.x + 240, y: ce.y - 260 + Math.sin(t * 3) * 8, o: sh.o, s: sh.s * 0.75, r: 8 });
    ov.tag('lindungi', 'LINDUNGI', { x: ce.x + 240, y: ce.y - 70, o: sh.o, s: sh.s }, { bg: '#f08c00', small: true });
    pinTag('telDalam', 'TELINGA DALAM', ce, t, 43.08, 46.05, { bg: PINK, pointer: 'up' }, 170);
    const kh = pop(t, 44.71, 46.05);
    ov.tag('kecil', 'KECIL & HALUS', { x: W / 2, y: 1270, o: kh.o, s: kh.s }, { bg: TEAL, small: true });
    if (see > 0) ov.sparkles(t, { n: 10, seed: 31, x: ce.x - 150, y: ce.y - 150, w: 300, h: 300, a: see * 0.8, colors: ['#ffb3d1', '#fff6c8'] });
    return studio;
  }],
  // S12 — No. 1 ... drum roll ... GIGI!
  [46.1, 52.15, (t) => {
    studioReset();
    uncover(2, 1);
    uncover(3, 1);
    studio.femur.visible = studio.head.visible = true;
    studio.femur.rotation.set(0, t * 0.9, 0.12);
    studio.femur.scale.setScalar(0.42);
    studio.head.scale.setScalar(0.85);
    studio.head.rotation.set(0, 0.3 + t * 0.5, 0);
    studio.head.position.set(PODIUM[2].x, topOf(2) + 1.35, 0);
    const dim = 1 - 0.75 * inv(46.1, 46.6, t) * (1 - inv(50.93, 51.2, t));
    studio.hemi.intensity = 1.3 * dim;
    studio.key.intensity = 2.2 * dim;
    spotOn(1, t < 50.93 ? 0.7 + 0.3 * Math.sin(t * 9) : 1.3);
    const rev = inv(50.93, 51.35, t);
    uncover(1, easeIn(rev));
    const tooth = studio.tooth;
    tooth.visible = t > 51.0;
    const g = easeOut(inv(51.0, 51.6, t));
    tooth.scale.setScalar(0.75 * (0.2 + 0.8 * backOut(g, 2.4)));
    tooth.position.set(0, topOf(1) + 2.0 + 0.1 * Math.sin(t * 2.2), 0);
    tooth.rotation.set(0, 0.25 * Math.sin(t * 1.3), 0.05 * Math.sin(t * 1.7));
    tooth.userData.mood(1, blinkAt(t, 7));
    studio.halo.material.opacity = 0.6 * g;
    studio.halo.position.set(0, topOf(1) + 2.0, -1.2);
    const pre = easeInOut(inv(46.1, 50.9, t));
    const sh = t < 50.93 ? shake(t, 49.6, 50.93, 0.04 * inv(49.6, 50.9, t) * 3) : shake(t, 50.93, 51.6, 0.12);
    if (t < 50.93) lookCam(V(lerp(0, 0, pre) + sh.x, lerp(4.2, 3.3, pre) + sh.y, lerp(14, 8.5, pre)), V(0, lerp(2.6, 2.4, pre), 0), 50);
    else lookCam(V(sh.x, 3.4 + sh.y, lerp(8.5, 9.4, easeOut(inv(50.93, 52.15, t)))), V(0, 3.0, 0), 50);
    medal(t, 1, 46.62, 50.95, W / 2, 360);
    const qq = pop(t, 47.8, 50.9);
    ov.html('qq', ICONS.qmark('#ffd84a'), { x: W / 2 + Math.sin(t * 7) * 8, y: 760, o: qq.o * 0.9, s: qq.s * 1.2 });
    ov.flash(Math.max(0, 1 - inv(50.93, 51.35, t)) * (t >= 50.93 ? 1 : 0));
    const gq = pop(t, 50.95, 52.1, { from: 2.6, fin: 0.3 });
    ov.bubble('gigi', 'GIGI!', { x: W / 2, y: 1160, o: gq.o, s: gq.s, r: -3 }, { size: 230, top: '#ffffff', bot: '#9ff0ff' });
    const cr = pop(t, 51.2, 52.1);
    const tp = scr(V(0, topOf(1) + 3.4, 0));
    ov.html('crown', SVG.crown(), { x: tp.x, y: tp.y - 40 + Math.sin(t * 3) * 6, o: cr.o, s: cr.s * 0.7, r: -6 });
    confetti(t, 50.95, { n: 90, seed: 9 });
    if (t > 51.0) ov.sparkles(t, { n: 26, seed: 15, y: 350, h: 800, a: 1 });
    return studio;
  }],
  // S13 — "Kenapa gigi paling keras?"
  [52.15, 54.1, (t) => {
    studioReset();
    uncover(1, 1);
    uncover(2, 1);
    uncover(3, 1);
    spotOn(1, 1);
    const tooth = studio.tooth;
    tooth.visible = true;
    tooth.scale.setScalar(0.75);
    tooth.position.set(0, topOf(1) + 2.0 + 0.1 * Math.sin(t * 2.2), 0);
    tooth.rotation.set(0, 0.25 * Math.sin(t * 1.3), 0);
    tooth.userData.mood(1, blinkAt(t, 7));
    studio.halo.material.opacity = 0.5;
    const th = POSES.thinkR.armR;
    const tk = keys(t, [[52.2, 0], [52.55, 1]]);
    studioAffan(t, -1.9, 3.0, {
      yaw: 0.35, smile: 0.8, brow: 0.9, headPitch: -0.25, headYaw: 0.2, lookY: 0.8, lookX: 0.4, headRoll: -0.1 * tk,
      armR: { reach: [-0.55, 0.3, 0.4].map((r, i) => lerp(r, th.reach[i], tk)), pole: th.pole, point: tk, wx: th.wx * tk },
    });
    lookCam(V(-1.0, 2.7, 11.2), V(-0.8, 2.75, 0), 50);
    const q = pop(t, 52.19, 54.05);
    ov.bubble('kenapa', 'KENAPA?', { x: W / 2, y: 400, o: q.o, s: q.s, r: -3 }, { size: 150 });
    [[52.4, -300, 760, '#ffcf33', -12], [52.7, 330, 700, '#3fa2ff', 10]].forEach(([at, dx, y, c, r], i) => {
      const p = pop(t, at, 54.05);
      ov.html('kq' + i, ICONS.qmark(c), { x: W / 2 + dx, y: y + Math.sin(t * 3 + i) * 10, o: p.o, s: p.s * 0.75, r });
    });
    return studio;
  }],
  // S14 — cut-away: the outer layer is ENAMEL; harder than bone
  [54.1, 59.45, (t) => {
    studioReset();
    uncover(1, 1);
    uncover(2, 1);
    uncover(3, 1);
    spotOn(1, 1);
    studio.hemi.intensity = 1.6;
    spotOn(1, 0.35);
    const tooth = studio.tooth;
    const u = tooth.userData;
    tooth.visible = true;
    tooth.scale.setScalar(0.75);
    tooth.position.set(0, topOf(1) + 2.0, 0);
    const cutOn = t > 54.55;
    u.full.visible = !cutOn;
    u.cut.visible = cutOn;
    tooth.rotation.set(0, cutOn ? 0.18 * Math.sin((t - 54.55) * 0.7) : (t - 54.1) * 6, 0);
    u.updateClip();
    const k = easeInOut(inv(54.1, 55.6, t));
    lookCam(V(lerp(0, 0.2, k), lerp(3.2, 3.15, k), lerp(9.0, 6.4, k)), V(0, 3.05, 0), 50);
    ov.flash((1 - inv(54.5, 54.9, t)) * (t > 54.5 ? 1 : 0));
    const lp = pop(t, 54.18, 55.85);
    ov.tag('lapisan', 'LAPISAN LUAR', { x: W / 2, y: 320, o: lp.o, s: lp.s }, { bg: TEAL, small: true });
    const crown = scr(tooth.localToWorld(V(-0.95, 0.9, 0.0)));
    const en = pop(t, 55.9, 59.4);
    if (en.o > 0) {
      ov.tag('enamel', 'ENAMEL', { x: 260, y: 420, o: en.o, s: en.s }, { bg: '#16a6d9' });
      ov.line(300, 470, crown.x, crown.y, { color: '#9ff0ff', w: 9, a: en.o });
      ov.dot(crown.x, crown.y, 12, '#9ff0ff', en.o);
    }
    hardBars(t, 56.79);
    const cr = pop(t, 58.78, 59.4);
    ov.html('crown2', SVG.crown(), { x: 880, y: 1000, o: cr.o, s: cr.s * 0.4, r: 10 });
    return studio;
  }],
  // S15 — inside enamel: mineral calcium crystals, packed tight
  [59.45, 68.0, (t) => {
    const pack = easeInOut(inv(63.44, 64.9, t));
    crys.update(t, pack);
    const k = easeInOut(inv(59.45, 68.0, t));
    const a = 0.3 + t * 0.05;
    lookCam(V(Math.sin(a) * lerp(15, 11, k), lerp(11, 7.5, k), Math.cos(a) * lerp(15, 11, k)), V(0, lerp(1.2, 0.6, k), 0), 50);
    ov.flash((1 - inv(59.45, 59.9, t)) * 1.0);
    const m = pop(t, 62.1, 67.95);
    ov.tag('mineral', 'MINERAL KALSIUM', { x: W / 2, y: 330, o: m.o, s: m.s }, { bg: PURPLE });
    const r = pop(t, 63.98, 67.95, { from: 2 });
    ov.bubble('rapat', 'RAPAT-RAPAT!', { x: W / 2, y: 520, o: r.o, s: r.s, r: -3 }, { size: 120, top: '#e6f8ff', bot: '#6fd0ff' });
    const kr = pop(t, 65.5, 67.95);
    ov.tag('kristal', 'KRISTAL', { x: 290, y: 1240, o: kr.o, s: kr.s }, { bg: '#16a6d9' });
    const kk = pop(t, 66.56, 67.95);
    ov.tag('kecilKuat', 'KECIL & KUAT', { x: 770, y: 1240, o: kk.o, s: kk.s }, { bg: '#e8404f' });
    if (t > 64.6) ov.sparkles(t, { n: 30, seed: 41, y: 500, h: 800, a: inv(64.6, 65.2, t), colors: ['#ffffff', '#9ff0ff', '#fff6c8'] });
    return { scene: crys.scene };
  }],
  // S16 — "Tapi... enamel tak boleh tumbuh balik kalau dah rosak."
  [68.0, 72.2, (t) => {
    studioReset();
    uncover(1, 1);
    uncover(2, 1);
    uncover(3, 1);
    spotOn(1, 1);
    const tooth = studio.tooth;
    const u = tooth.userData;
    tooth.visible = true;
    tooth.scale.setScalar(0.75);
    const cr = t > 69.3;
    u.crack.visible = cr;
    const sh = shake(t, 69.3, 69.8, 0.12);
    tooth.position.set(sh.x, topOf(1) + 2.0 + (cr ? 0 : 0.08 * Math.sin(t * 2.2)), 0);
    tooth.rotation.set(0, 0.12 * Math.sin(t * 0.9), cr ? -0.05 : 0);
    u.mood(cr ? -keys(t, [[69.3, 0.3], [69.7, 1]]) : 1, t < 69.3 ? blinkAt(t, 2) : 0);
    studio.halo.material.opacity = cr ? 0.1 : 0.4;
    studio.hemi.intensity = cr ? 0.9 : 1.3;
    const k = easeOut(inv(68.0, 72.2, t));
    lookCam(V(0, 3.4, lerp(7.6, 6.6, k)), V(0, 3.2, 0), 50);
    ov.flash((1 - inv(68.0, 68.3, t)) * 0.9);
    tint('30,30,70', 0.25 * inv(69.3, 69.8, t));
    const tb = pop(t, 69.56, 72.15);
    ov.bubble('tumbuh', 'TAK BOLEH\nTUMBUH BALIK', { x: W / 2, y: 430, o: tb.o, s: tb.s }, { size: 104, top: '#ffd0d6', bot: '#ff5f6d' });
    const x = pop(t, 70.0, 72.15, { from: 2 });
    ov.html('cross', ICONS.cross(), { x: 880, y: 760, o: x.o, s: x.s * 0.5 });
    const rs = pop(t, 71.22, 72.15);
    ov.tag('rosak', 'KALAU DAH ROSAK', { x: W / 2, y: 1250, o: rs.o, s: rs.s }, { bg: '#5a4a7a', small: true });
    return studio;
  }],
  // S17 — "Jadi, jangan lupa gosok gigi pagi dan malam, ya!"
  [72.2, 75.5, (t) => {
    studioReset();
    uncover(1, 1);
    uncover(2, 1);
    uncover(3, 1);
    spotOn(1, 0.6);
    studio.tooth.visible = true;
    studio.tooth.scale.setScalar(0.75);
    studio.tooth.position.set(0, topOf(1) + 2.0, 0);
    studio.tooth.userData.mood(1, 0);
    studio.brush.visible = true;
    studio.tooth.visible = false;
    const br = keys(t, [[72.3, 0], [72.7, 1]]);
    const scrub = Math.sin(t * 22) * 0.1 * br;
    const brushing = t > 72.8;
    studioAffan(t, 0, 4.8, {
      smile: 1, brow: 0.5, talk: Math.max(talk(t), brushing ? 0.55 : 0), headYaw: -0.08, headPitch: 0.02,
      armR: { reach: [lerp(-0.6, -0.3 + scrub, br), lerp(0.4, 1.3, br), lerp(0.4, 1.02, br)], pole: [-1, -1, 0.3] },
      armL: { reach: [0.55, 0.32, 0.35], pole: [1, -0.6, -0.4] },
    });
    lookCam(V(0.15, 3.3, 11.6), V(0, 3.05, 4.8), 40);
    const m = scr(studio.aff.parts.mouth.getWorldPosition(V(0, 0, 0)));
    foam(t, m.x, m.y - 30, brushing ? inv(72.8, 73.2, t) : 0);
    const gg = pop(t, 72.24, 75.45);
    ov.bubble('gosok', 'GOSOK GIGI!', { x: W / 2, y: 320, o: gg.o, s: gg.s, r: -3 }, { size: 120, top: '#e6fbff', bot: '#4fd0e0' });
    const pg = pop(t, 74.14, 75.45), ml = pop(t, 74.58, 75.45);
    ov.html('sun', SVG.sun(), { x: 200, y: 1060, o: pg.o, s: pg.s * 0.8, r: t * 20 });
    ov.tag('pagi', 'PAGI', { x: 200, y: 1230, o: pg.o, s: pg.s }, { bg: '#f08c00', small: true });
    ov.html('moon', SVG.moon(), { x: 880, y: 1060, o: ml.o, s: ml.s * 0.8, r: -10 });
    ov.tag('malam', 'MALAM', { x: 880, y: 1230, o: ml.o, s: ml.s }, { bg: '#3a3f9a', small: true });
    if (t > 74.9) ov.sparkles(t, { n: 10, seed: 51, x: m.x - 160, y: m.y - 160, w: 320, h: 260, a: inv(74.9, 75.2, t), size: 28 });
    return studio;
  }],
  // S18 — "Waaah, rupanya gigi kita yang paling keras!"
  [75.5, 78.72, (t) => {
    studioReset();
    uncover(1, 1);
    uncover(2, 1);
    uncover(3, 1);
    for (const n of [1, 2, 3]) spotOn(n, n === 1 ? 1.2 : 0.5);
    studio.femur.visible = studio.head.visible = true;
    studio.femur.rotation.set(0, t * 0.9, 0.12);
    studio.femur.scale.setScalar(0.42);
    studio.head.scale.setScalar(0.85);
    studio.head.rotation.set(0, 0.4 + t * 0.4, 0);
    studio.head.position.set(PODIUM[2].x, topOf(2) + 1.35, 0);
    const tooth = studio.tooth;
    tooth.visible = true;
    tooth.scale.setScalar(0.75);
    tooth.position.set(0, topOf(1) + 2.0 + 0.12 * Math.sin(t * 3), 0);
    tooth.rotation.set(0, 0.2 * Math.sin(t * 1.5), 0.06 * Math.sin(t * 2.4));
    tooth.userData.mood(1, blinkAt(t, 6));
    studio.halo.material.opacity = 0.7;
    studio.halo.position.set(0, topOf(1) + 2.0, -1.2);
    const jump = t > 75.56 && t < 76.2 ? Math.sin(((t - 75.56) / 0.64) * Math.PI) * 0.5 : 0;
    const up = keys(t, [[75.5, 0], [75.7, 1], [77.2, 1], [77.5, 0.0]]);
    const tu = POSES.thumbsUpR.armR;
    const th = keys(t, [[77.5, 0], [77.8, 1]]);
    studioAffan(t, -2.0, 3.6, {
      yaw: 0.3, bob: jump, smile: 1, brow: 1, wow: keys(t, [[75.5, 0], [75.62, 0.9], [76.4, 0.9], [76.6, 0]]),
      legL: { x: -0.25 * jump, knee: 0.6 * jump }, legR: { x: -0.25 * jump, knee: 0.6 * jump },
      armL: { reach: [lerp(0.55, 0.85, up), lerp(0.25, 1.85, up), 0.3], pole: [1, -0.4, -0.5] },
      armR: th > 0 ? { reach: [-0.55, 0.3, 0.4].map((r, i) => lerp(r, tu.reach[i], th)), pole: tu.pole, thumb: th, wy: tu.wy * th, wx: tu.wx * th } : { reach: [lerp(-0.55, -0.85, up), lerp(0.25, 1.85, up), 0.3], pole: [-1, -0.4, -0.5] },
    });
    const k = easeOut(inv(75.5, 78.72, t));
    lookCam(V(lerp(-0.9, -1.3, k), 3.4, lerp(12.0, 10.8, k)), V(-0.9, 3.3, 0), 50);
    ov.flash((1 - inv(75.5, 75.8, t)) * 0.7);
    const q = pop(t, 76.6, 78.68, { from: 2 });
    ov.bubble('final', 'GIGI\nPALING KERAS!', { x: W / 2, y: 360, o: q.o, s: q.s, r: -3 }, { size: 120 });
    const tp = scr(V(0, topOf(1) + 3.45, 0));
    const cr = pop(t, 76.98, 78.68);
    ov.html('crown3', SVG.crown(), { x: tp.x, y: tp.y - 30 + Math.sin(t * 3) * 6, o: cr.o, s: cr.s * 0.55, r: -6 });
    confetti(t, 75.6, { n: 70, seed: 21 });
    ov.sparkles(t, { n: 16, seed: 19, y: 600, h: 600, a: 0.8 });
    return studio;
  }],
  // S19 — "Apa lagi kita nak belajar lepas ni?"
  [78.72, 80.85, (t) => {
    studioReset();
    uncover(1, 1);
    uncover(2, 1);
    uncover(3, 1);
    spotOn(1, 0.8);
    studio.tooth.visible = true;
    studio.tooth.scale.setScalar(0.75);
    studio.tooth.position.set(0, topOf(1) + 2.0 + 0.1 * Math.sin(t * 2.2), 0);
    studio.tooth.userData.mood(1, blinkAt(t, 4));
    const th2 = POSES.thinkR.armR;
    const tk = keys(t, [[78.75, 0], [79.1, 1]]);
    studioAffan(t, 0, 5.0, {
      smile: 1, brow: 0.3 + 0.4 * tk, headRoll: -0.12 * tk, lookX: 0.35 * tk, lookY: 0.4 * tk, headPitch: -0.08 * tk, headYaw: 0.05 * wobble(t, 2),
      armR: { reach: [-0.55, 0.3, 0.4].map((r, i) => lerp(r, th2.reach[i], tk)), pole: th2.pole, point: tk, wx: th2.wx * tk },
    });
    const k = easeInOut(inv(78.72, 80.85, t));
    lookCam(V(0.1, 3.0, lerp(9.6, 9.0, k)), V(0, 2.75, 5.0), 40);
    const hd = scr(studio.aff.parts.head.getWorldPosition(V(0, 0, 0)));
    [[78.9, -260, -230, '#ffcf33', -12], [79.2, 250, -280, '#3fa2ff', 10], [79.5, 300, -60, '#ff5fa2', 14]].forEach(([a, dx, dy, c, r], i) => {
      const q = pop(t, a, 80.8);
      ov.html('eq' + i, ICONS.qmark(c), { x: hd.x + dx, y: hd.y + dy + Math.sin(t * 3 + i) * 10, o: q.o, s: q.s * 0.85, r });
    });
    return studio;
  }],
  // Outro — The Curious Affan logo
  [80.85, DURATION, (t) => {
    const k = easeOut(inv(80.85, 81.55, t));
    const th2 = POSES.thinkR.armR;
    outro.aff.pose({ ...POSES.thinkR, armR: { ...th2 }, smile: 1, blink: blinkAt(t, 9), headRoll: -0.08, lookX: 0.25, lookY: 0.15, headYaw: 0.08 });
    lookCam(V(0, 2.6, lerp(7.5, 5.4, k)), V(0, 2.3, 0), 40);
    const hc = scr(V(0, 2.95, 0));
    ov.flash((1 - inv(80.85, 81.2, t)) * 1.0);
    const g = ov.g;
    const ra = inv(80.95, 81.55, t);
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
    const ic = pop(t, 81.45, 99);
    ov.html('oBulb', ICONS.bulb(), { x: 175, y: 470 + Math.sin(t * 2) * 8, o: ic.o, s: ic.s * 0.55, r: -10 });
    ov.html('oQ1', ICONS.qmark('#ffcf33'), { x: 880, y: 420 + Math.sin(t * 2 + 1) * 8, o: ic.o, s: ic.s * 0.9, r: 12 });
    ov.html('oQ2', ICONS.qmark('#2f6fff'), { x: 220, y: 720 + Math.sin(t * 2 + 2) * 8, o: ic.o, s: ic.s * 0.6, r: -12 });
    const l1 = pop(t, 81.15, 99), l2 = pop(t, 81.35, 99), l3 = pop(t, 81.55, 99);
    drawLogo(ov, { k: [l1, l2, l3], star: pop(t, 81.75, 99) });
    return outro;
  }],
];

function frame(t) {
  ov.begin();
  cam.aspect = W / H;
  cam.updateProjectionMatrix();
  const shot = SHOTS.find(([a, b]) => t >= a && t < b) || SHOTS[SHOTS.length - 1];
  park.setXray(false);
  const world = shot[2](t);
  if (world.sky) world.sky.position.copy(cam.position);
  renderer.render(world.scene, cam);
  if (world !== outro) ov.vignette(0.28);
  ov.captions(t, CAPTIONS, KEYWORDS);
  ov.end();
}

// Cover / thumbnail (9:16): Affan amazed beside the giant crowned tooth on the
// No. 1 podium, big title, episode badge and the series logo. Key elements stay
// inside the centre 3:4 area (y 240-1680) that profile grids show.
function thumbnail() {
  ov.begin();
  cam.aspect = W / H;
  cam.updateProjectionMatrix();
  const t = 77.0;
  studioReset();
  uncover(1, 1);
  uncover(2, 1);
  uncover(3, 1);
  for (const n of [1, 2, 3]) spotOn(n, n === 1 ? 1.3 : 0.5);
  studio.femur.visible = studio.head.visible = true;
  studio.femur.scale.setScalar(0.42);
  studio.femur.rotation.set(0, 0.6, 0.12);
  studio.head.scale.setScalar(0.85);
  studio.head.rotation.set(0, 0.9, 0);
  studio.head.position.set(PODIUM[2].x, topOf(2) + 1.35, 0);
  const tooth = studio.tooth;
  tooth.visible = true;
  tooth.scale.setScalar(0.75);
  tooth.position.set(0.5, topOf(1) + 2.0, 0);
  tooth.rotation.set(0, -0.15, 0.04);
  tooth.userData.mood(1, 0);
  studio.halo.material.opacity = 0.8;
  studio.halo.position.set(0.5, topOf(1) + 2.0, -1.2);
  const tu = POSES.thumbsUpR.armR;
  studioAffan(t, -1.9, 3.6, {
    yaw: 0.35, smile: 1, brow: 1, wow: 0.85, talk: 0, blink: 0, lookX: 0.2, lookY: 0.2,
    armL: { reach: [0.95, 1.3, 0.55], point: 1, pole: [1, -1, -0.8] },
    armR: { reach: tu.reach, pole: tu.pole, thumb: 1, wy: tu.wy, wx: tu.wx },
  });
  lookCam(V(-0.7, 3.5, 12.0), V(-0.6, 3.75, 0), 50);
  renderer.render(studio.scene, cam);
  const g = ov.g;
  const top = g.createLinearGradient(0, 0, 0, 760);
  top.addColorStop(0, 'rgba(20,12,70,0.85)');
  top.addColorStop(1, 'rgba(20,12,70,0)');
  g.fillStyle = top;
  g.fillRect(0, 0, W, 760);
  const bot = g.createLinearGradient(0, H - 900, 0, H);
  bot.addColorStop(0, 'rgba(20,12,70,0)');
  bot.addColorStop(1, 'rgba(20,12,70,0.8)');
  g.fillStyle = bot;
  g.fillRect(0, H - 900, W, 900);
  ov.vignette(0.3);
  ov.sparkles(1.3, { n: 18, seed: 17, y: 600, h: 500, size: 26 });
  ov.tag('thBadge', 'EPISOD 26', { x: W / 2, y: 300 }, { bg: '#2f7bff', small: true });
  ov.bubble('thTitle', 'ORGAN PALING\nKERAS?', { x: W / 2, y: 475, r: -2 }, { size: 118 });
  const tp = scr(V(0.5, topOf(1) + 3.45, 0));
  ov.html('thCrown', SVG.crown(), { x: tp.x, y: tp.y - 30, s: 0.55, r: -6 });
  ov.html('thQ', ICONS.qmark('#ffcf33'), { x: 950, y: 1180, r: 14, s: 0.7 });
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
    frame(0);
    return true;
  })(),
};
