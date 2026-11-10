// THE CURIOUS AFFAN — Episode 027: "Kenapa Kita Menguap?"
// Every shot is a pure function of time t (seconds), synced to audio/narration.mp3.
import * as THREE from 'three';
import { makeRenderer, loadEnvelope, toScreen, clamp, lerp, inv, smooth, easeOut, easeInOut, keys, rng, W, H } from '../../shared/core.js';
import { POSES, blinkAt } from '../../shared/affan.js';
import { Overlay, pop, ICONS, drawLogo } from '../../shared/overlay.js';
import { CAPTIONS, KEYWORDS } from './captions.js';
import { buildBedroom, buildLab, buildOutro } from './worlds.js';
import { buildCover } from './cover.js';

const FPS = 30;
const DURATION = 78.5;

const stage = document.getElementById('stage');
const canvas = document.createElement('canvas');
stage.appendChild(canvas);
const renderer = makeRenderer(canvas);
const ov = new Overlay(stage);
const room = buildBedroom();
const lab = buildLab();
const outro = buildOutro();
const cam = new THREE.PerspectiveCamera(40, W / H, 0.05, 6000);
let env = { at: () => 0 };

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const talk = (t) => clamp(env.at(t) * 1.2);
const scr = (p) => toScreen(p, cam);
const wpos = (o) => o.getWorldPosition(new THREE.Vector3());
const mix = (a, b, k) => a.map((v, i) => lerp(v, b[i], k));

function lookCam(pos, look, fov = 40) {
  cam.position.set(...pos);
  cam.fov = fov;
  cam.aspect = W / H;
  cam.updateProjectionMatrix();
  cam.lookAt(...look);
  cam.updateMatrixWorld(true);
}

// ------------------------------------------------------------------ Affan
// Yawn envelope: opens over `rise`, holds, closes over `fall`.
const yawnEnv = (t, a, b, rise = 0.45, fall = 0.4) => easeInOut(inv(a, a + (b - a) * rise, t)) * (1 - easeInOut(inv(b - (b - a) * fall, b, t)));
const REST_L = [0.72, -0.62, 0.16], REST_R = [-0.72, -0.62, 0.16];
const UP_L = [0.95, 2.05, 0.15], UP_R = [-0.95, 2.05, 0.15];
// Pose Affan for time t. y = yawn amount (0..1); stretch = arms up with the yawn.
function affan(aff, t, p = {}, y = 0, stretch = 0) {
  const s = clamp(stretch) * y;
  const armL = p.armL || { reach: mix(REST_L, UP_L, s), pole: [1, -0.4, -0.6], wz: -0.3 * s };
  const armR = p.armR || { reach: mix(REST_R, UP_R, s), pole: [-1, -0.4, -0.6], wz: 0.3 * s };
  const base = { blink: blinkAt(t, 3), talk: talk(t), smile: 0.85, ...p };
  aff.pose({
    ...base,
    armL,
    armR,
    talk: lerp(base.talk, 1, y),
    smile: lerp(base.smile, 0, y),
    blink: Math.max(base.blink, clamp((y - 0.25) / 0.5) * 0.93),
    headPitch: (base.headPitch || 0) - 0.16 * y,
    brow: lerp(base.brow || 0, 0.9, y),
    bob: (base.bob || 0) + 0.05 * s,
  });
  if (y > 0.01) {
    const o = aff.parts.open;
    o.visible = true;
    o.scale.set(lerp(o.scale.x, 1.05, y), lerp(o.scale.y, 3.0, y), 1);
    aff.parts.smile.visible = false;
  }
  aff.root.updateMatrixWorld(true);
}
const headPos = (aff) => wpos(aff.parts.head);
const mouthPos = (aff) => aff.parts.mouth.localToWorld(new THREE.Vector3(0, -0.06, 0.04));

// ------------------------------------------------------------------- icons
const SV = (w, h, body) => `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`;
const INK = '#17256b';
const IC = {
  eye: () => SV(220, 140, `<path d="M10 70 Q110 -10 210 70 Q110 150 10 70 Z" fill="#fff" stroke="${INK}" stroke-width="12" stroke-linejoin="round"/><circle cx="110" cy="70" r="36" fill="#4b7bff" stroke="${INK}" stroke-width="10"/><circle cx="110" cy="70" r="16" fill="${INK}"/><circle cx="98" cy="58" r="8" fill="#fff"/>`),
  ear: () => SV(150, 200, `<path d="M40 150 C10 120 10 30 80 18 C140 8 150 80 120 110 C100 130 110 160 80 180 C60 192 45 175 40 150 Z" fill="#f2b089" stroke="${INK}" stroke-width="12" stroke-linejoin="round"/><path d="M70 120 C55 90 62 55 90 52 C112 50 116 78 100 92" fill="none" stroke="#c97b58" stroke-width="12" stroke-linecap="round"/><g stroke="#ffd84a" stroke-width="10" stroke-linecap="round" fill="none"><path d="M-10 60 Q-30 95 -10 130"/><path d="M-40 40 Q-70 95 -40 150"/></g>`),
  book: () => SV(240, 170, `<path d="M120 40 Q70 10 15 22 V150 Q70 138 120 162 Q170 138 225 150 V22 Q170 10 120 40 Z" fill="#fff" stroke="${INK}" stroke-width="12" stroke-linejoin="round"/><line x1="120" y1="40" x2="120" y2="160" stroke="${INK}" stroke-width="10"/><g stroke="#9aa6c8" stroke-width="8" stroke-linecap="round"><line x1="40" y1="55" x2="100" y2="62"/><line x1="40" y1="82" x2="100" y2="89"/><line x1="40" y1="109" x2="90" y2="114"/><line x1="140" y1="62" x2="200" y2="55"/><line x1="140" y1="89" x2="200" y2="82"/></g><ellipse cx="175" cy="118" rx="18" ry="16" fill="#ff7aa8"/>`),
  moonZ: () => SV(220, 200, `<path d="M120 20 A80 80 0 1 0 190 140 A62 62 0 1 1 120 20 Z" fill="#ffe27a" stroke="${INK}" stroke-width="12" stroke-linejoin="round"/><text x="175" y="70" text-anchor="middle" font-family="Baloo 2" font-weight="800" font-size="70" fill="#c9b8ff" stroke="${INK}" stroke-width="10" paint-order="stroke">z</text>`),
  clock: () => SV(200, 200, `<circle cx="100" cy="105" r="80" fill="#fff" stroke="${INK}" stroke-width="12"/><line x1="100" y1="105" x2="100" y2="55" stroke="${INK}" stroke-width="12" stroke-linecap="round"/><line x1="100" y1="105" x2="140" y2="120" stroke="#ff8a3d" stroke-width="12" stroke-linecap="round"/><circle cx="100" cy="105" r="10" fill="${INK}"/><g fill="${INK}"><circle cx="100" cy="40" r="6"/><circle cx="165" cy="105" r="6"/><circle cx="100" cy="170" r="6"/><circle cx="35" cy="105" r="6"/></g>`),
  sun: () => SV(220, 220, `<g stroke="#ffb020" stroke-width="14" stroke-linecap="round">${Array.from({ length: 8 }, (_, i) => { const a = (i / 8) * Math.PI * 2; return `<line x1="${110 + Math.cos(a) * 70}" y1="${110 + Math.sin(a) * 70}" x2="${110 + Math.cos(a) * 100}" y2="${110 + Math.sin(a) * 100}"/>`; }).join('')}</g><circle cx="110" cy="110" r="55" fill="#ffd84a" stroke="${INK}" stroke-width="12"/><path d="M85 118 Q110 140 135 118" fill="none" stroke="${INK}" stroke-width="9" stroke-linecap="round"/><circle cx="92" cy="98" r="7" fill="${INK}"/><circle cx="128" cy="98" r="7" fill="${INK}"/>`),
  brain: (c = '#ff9ec7') => SV(260, 200, `<path d="M70 170 C25 168 8 130 22 100 C5 70 30 30 70 34 C85 10 130 6 150 26 C180 8 228 22 232 60 C258 82 252 130 222 145 C220 175 180 190 150 175 C130 192 92 192 70 170 Z" fill="${c}" stroke="${INK}" stroke-width="12" stroke-linejoin="round"/><g fill="none" stroke="${INK}" stroke-width="8" stroke-linecap="round" opacity="0.55"><path d="M130 30 Q118 70 135 100 Q150 130 132 172"/><path d="M60 70 Q85 60 95 85"/><path d="M45 120 Q70 105 90 125"/><path d="M175 60 Q200 70 195 95"/><path d="M170 130 Q195 120 210 140"/></g>`),
  thermo: (lvl, c) => SV(110, 300, `<rect x="35" y="15" width="40" height="215" rx="20" fill="#fff" stroke="${INK}" stroke-width="11"/><rect x="45" y="${25 + (1 - lvl) * 185}" width="20" height="${15 + lvl * 185}" rx="10" fill="${c}"/><circle cx="55" cy="245" r="42" fill="${c}" stroke="${INK}" stroke-width="11"/>`),
  tick: () => SV(220, 220, `<circle cx="110" cy="110" r="95" fill="#3fd07a" stroke="#fff" stroke-width="14"/><path d="M62 112 L98 148 L162 76" fill="none" stroke="#fff" stroke-width="26" stroke-linecap="round" stroke-linejoin="round"/>`),
  heart: (c = '#ff5c8a') => SV(120, 110, `<path d="M60 100 C10 70 0 40 15 22 C30 5 55 10 60 32 C65 10 90 5 105 22 C120 40 110 70 60 100 Z" fill="${c}" stroke="#fff" stroke-width="8" stroke-linejoin="round"/>`),
  snow: () => SV(140, 140, `<g stroke="#e9f8ff" stroke-width="12" stroke-linecap="round">${[0, 1, 2].map((i) => { const a = (i / 3) * Math.PI; return `<line x1="${70 + Math.cos(a) * 55}" y1="${70 + Math.sin(a) * 55}" x2="${70 - Math.cos(a) * 55}" y2="${70 - Math.sin(a) * 55}"/>`; }).join('')}</g><circle cx="70" cy="70" r="12" fill="#7cd8ff"/>`),
  magnifier: () => SV(190, 190, `<line x1="60" y1="130" x2="20" y2="172" stroke="${INK}" stroke-width="40" stroke-linecap="round"/><line x1="60" y1="130" x2="20" y2="172" stroke="#ffc928" stroke-width="22" stroke-linecap="round"/><circle cx="110" cy="80" r="62" fill="#8fdcff" stroke="${INK}" stroke-width="34"/><circle cx="110" cy="80" r="62" fill="none" stroke="#ffc928" stroke-width="16"/><ellipse cx="92" cy="62" rx="16" ry="22" fill="#fff" opacity="0.85"/>`),
  zzz: (c = '#c9b8ff') => SV(230, 230, [[40, 200, 84], [110, 130, 66], [170, 70, 50]].map(([x, y, s]) => `<text x="${x}" y="${y}" text-anchor="middle" font-family="Baloo 2" font-weight="800" font-size="${s}" fill="${c}" stroke="${INK}" stroke-width="${s * 0.16}" paint-order="stroke" stroke-linejoin="round">Z</text>`).join('')),
};

// Card with an icon and a label, popped in at time a.
function card(id, t, a, b, icon, label, x, y, color, s = 1) {
  const q = pop(t, a, b);
  if (q.o <= 0) return;
  ov.html(id, `<div style="width:300px;height:300px;border-radius:44px;background:#fff;box-shadow:0 12px 0 rgba(0,0,0,0.18), inset 0 0 0 8px ${color};display:flex;align-items:center;justify-content:center">${icon}</div>`, { x, y: y + Math.sin(t * 2.4 + x) * 6, o: q.o, s: q.s * 0.78 * s });
  ov.tag(id + 'L', label, { x, y: y + 150 * s, o: q.o, s: q.s }, { bg: color, small: true });
}

// --------------------------------------------------------- 2D cartoon faces
// For the "family and close friends" beat: simple round faces that yawn in turn.
function face(g, x, y, r, { skin = '#e8a57c', hair = '#22160f', kind = 'papa', yawn = 0, blink = 0, tilt = 0 }) {
  g.save();
  g.translate(x, y);
  g.rotate(tilt - 0.12 * yawn);
  g.lineWidth = r * 0.09;
  g.strokeStyle = INK;
  if (kind === 'mama') {
    // tudung
    g.fillStyle = '#ff8fb8';
    g.beginPath();
    g.ellipse(0, r * 0.05, r * 1.2, r * 1.28, 0, 0, Math.PI * 2);
    g.fill();
    g.stroke();
    g.beginPath();
    g.moveTo(-r * 1.05, r * 0.6);
    g.quadraticCurveTo(0, r * 1.9, r * 1.05, r * 0.6);
    g.lineTo(r * 0.9, r * 1.35);
    g.quadraticCurveTo(0, r * 1.7, -r * 0.9, r * 1.35);
    g.closePath();
    g.fill();
    g.stroke();
  }
  g.fillStyle = skin;
  g.beginPath();
  g.ellipse(0, 0, r * (kind === 'mama' ? 0.86 : 1), r * (kind === 'mama' ? 0.92 : 1), 0, 0, Math.PI * 2);
  g.fill();
  g.stroke();
  if (kind === 'papa') {
    g.fillStyle = hair;
    g.beginPath();
    g.ellipse(0, -r * 0.62, r * 0.95, r * 0.5, 0, Math.PI, Math.PI * 2);
    g.fill();
    g.fillRect(-r * 0.95, -r * 0.66, r * 1.9, r * 0.12);
    g.fillStyle = hair;
    g.beginPath();
    g.ellipse(0, r * 0.3, r * 0.32, r * 0.08, 0, 0, Math.PI * 2);
    g.fill();
  }
  if (kind === 'kawan') {
    g.fillStyle = '#3fa2ff';
    g.beginPath();
    g.ellipse(0, -r * 0.55, r * 1.0, r * 0.55, 0, Math.PI, Math.PI * 2);
    g.closePath();
    g.fill();
    g.stroke();
    g.beginPath();
    g.ellipse(r * 0.75, -r * 0.55, r * 0.6, r * 0.14, 0.1, 0, Math.PI * 2);
    g.fill();
    g.stroke();
  }
  // eyes: dots, or closed arcs while yawning
  const closed = Math.max(blink, clamp((yawn - 0.3) / 0.4));
  for (const s of [-1, 1]) {
    if (closed > 0.5) {
      g.beginPath();
      g.arc(s * r * 0.36, -r * 0.08, r * 0.16, 0.15 * Math.PI, 0.85 * Math.PI);
      g.stroke();
    } else {
      g.fillStyle = INK;
      g.beginPath();
      g.arc(s * r * 0.36, -r * 0.08, r * 0.11, 0, Math.PI * 2);
      g.fill();
    }
  }
  // mouth: smile -> big oval yawn
  if (yawn > 0.05) {
    g.fillStyle = '#5e1f24';
    g.beginPath();
    g.ellipse(0, r * 0.45, r * 0.24, r * 0.06 + r * 0.32 * yawn, 0, 0, Math.PI * 2);
    g.fill();
    g.stroke();
    g.fillStyle = '#e57c7c';
    g.beginPath();
    g.ellipse(0, r * 0.45 + r * 0.22 * yawn, r * 0.14, r * 0.07 * yawn, 0, 0, Math.PI * 2);
    g.fill();
  } else {
    g.beginPath();
    g.arc(0, r * 0.28, r * 0.28, 0.2 * Math.PI, 0.8 * Math.PI);
    g.stroke();
  }
  g.fillStyle = 'rgba(243,136,126,0.45)';
  for (const s of [-1, 1]) {
    g.beginPath();
    g.ellipse(s * r * 0.62, r * 0.25, r * 0.15, r * 0.1, 0, 0, Math.PI * 2);
    g.fill();
  }
  g.restore();
}

// Streaming air particles from (x0,y0) to (x1,y1) along a gentle curve.
function airFlow(t, x0, y0, x1, y1, { a = 1, n = 26, seed = 3, color = '143,216,255', bend = 120, speed = 0.7, size = 14 } = {}) {
  if (a <= 0) return;
  const g = ov.g;
  const R = rng(seed);
  for (let i = 0; i < n; i++) {
    const ph = R(), off = (R() - 0.5) * 70, sz = size * (0.5 + R() * 0.7);
    const k = (ph + t * speed) % 1;
    const mx = (x0 + x1) / 2 + bend, my = (y0 + y1) / 2 + off;
    const x = (1 - k) * (1 - k) * x0 + 2 * (1 - k) * k * mx + k * k * x1;
    const y = (1 - k) * (1 - k) * (y0 + off) + 2 * (1 - k) * k * my + k * k * y1;
    const al = a * Math.sin(k * Math.PI);
    g.fillStyle = `rgba(${color},${al * 0.75})`;
    g.strokeStyle = `rgba(255,255,255,${al * 0.9})`;
    g.lineWidth = 3;
    g.beginPath();
    g.arc(x, y, sz * (1 - 0.4 * k), 0, Math.PI * 2);
    g.fill();
    g.stroke();
  }
}

function hook(t) {
  const p = pop(t, 0.12, 3.35, { fin: 0.45 });
  ov.bubble('hook', 'KENAPA KITA\nMENGUAP?', { x: W / 2, y: 470 + Math.sin(t * 3) * 6, o: p.o, s: p.s }, { size: 120 });
  const q = pop(t, 0.5, 3.35);
  ov.tag('ep', 'EPISOD 27', { x: W / 2, y: 300, o: q.o, s: q.s }, { bg: '#2f7bff', small: true });
}

// ======================================================================= SHOTS
const AFF_ROOM = [0.2, 0, 0.4];
const SHOTS = [
  // A — bedroom hook: Affan gets sleepy, then a huge stretchy yawn
  [0, 7.05, (t) => {
    const a = room.aff;
    a.root.position.set(...AFF_ROOM);
    a.root.rotation.y = 0.12;
    room.dog.root.visible = false;
    const sleepy = inv(1.95, 3.2, t) * (1 - inv(5.4, 5.8, t));
    const y = yawnEnv(t, 3.4, 5.55, 0.4, 0.35);
    affan(a, t, { blink: Math.max(blinkAt(t, 3), 0.55 * sleepy), headRoll: 0.1 * sleepy, brow: -0.3 * sleepy, smile: lerp(0.9, 0.4, sleepy) }, y, 1);
    const k = easeInOut(inv(0, 7.05, t));
    lookCam([lerp(0.9, 0.55, k), lerp(3.1, 3.0, k), lerp(12.5, 10.2, k)], [0.3, lerp(3.05, 2.85, k), 0], 40);
    hook(t);
    const h = scr(headPos(a));
    const z = pop(t, 3.6, 6.9);
    ov.html('zzz', IC.zzz(), { x: h.x + 260, y: h.y - 260 - (t - 3.6) * 25, o: z.o, s: z.s, r: 8 });
    const m = pop(t, 5.95, 7.0);
    ov.tag('mgp', 'MENGUAP!', { x: W / 2, y: 470, o: m.o, s: m.s, r: -3 }, { bg: '#8a5cff' });
    return room;
  }],
  // B — close-up: "macam mana? kenapa?" then the magic swirl into the science stage
  [7.05, 12.9, (t) => {
    const a = room.aff;
    a.root.position.set(...AFF_ROOM);
    a.root.rotation.y = 0.05;
    room.dog.root.visible = false;
    const think = keys(t, [[9.4, 0], [9.8, 1], [10.6, 1], [10.95, 0]]);
    const pt = keys(t, [[10.7, 0], [11.05, 1], [12.9, 1]]);
    const p = { headYaw: 0.05, lookX: 0.1, lookY: 0.05, brow: 0.6, smile: 1 };
    if (think > 0.01) Object.assign(p, { armR: { ...POSES.thinkR.armR, reach: mix(REST_R, POSES.thinkR.armR.reach, think) }, headRoll: -0.12 * think, lookX: 0.3 * think, lookY: 0.35 * think });
    if (pt > 0.01) Object.assign(p, { armL: { reach: mix(REST_L, [0.85, 2.05, 0.45], pt), pole: [1, -1, -0.5], point: pt }, lookY: 0.3 * pt, brow: 1 });
    affan(a, t, p);
    const k = easeOut(inv(7.05, 8.0, t));
    lookCam([lerp(0.9, 0.45, k), 3.0, lerp(9.0, 7.6, k)], [0.3, 2.85, 0], 40);
    const h = scr(headPos(a));
    [[7.65, -250, -250, '#ffcf33', -12], [8.7, 250, -300, '#3fa2ff', 10], [9.8, 290, -40, '#ffcf33', 14]].forEach(([s, dx, dy, c, r], i) => {
      const q = pop(t, s, 11.4);
      ov.html('qB' + i, ICONS.qmark(c), { x: h.x + dx, y: h.y + dy + Math.sin(t * 3 + i) * 10, o: q.o, s: q.s * 0.85, r });
    });
    const j = pop(t, 10.78, 12.6);
    ov.tag('jom', 'JOM CARI JAWAPAN!', { x: W / 2, y: 330, o: j.o, s: j.s, r: -2 }, { bg: '#ff8a3d' });
    const sw = inv(11.6, 12.9, t);
    if (sw > 0) ov.swirl(t, h.x, h.y, sw, 5);
    ov.flash(inv(12.5, 12.9, t) * 1.0);
    return room;
  }],
  // C — science stage: the four steps of a yawn, in slow motion
  [12.9, 24.7, (t) => {
    const a = lab.aff;
    a.root.position.set(0, 0, 0);
    a.root.rotation.y = 0.1;
    // demo yawn: opens 14.4 -> 16.4, stretches wider 16.7, inhale 18.3-21.2, exhale 21.7-24.3
    const open = easeInOut(inv(14.4, 16.2, t)) * 0.7 + 0.3 * easeInOut(inv(16.7, 17.6, t));
    const close = easeInOut(inv(21.7, 24.4, t));
    const y = open * (1 - close);
    const inhale = inv(18.3, 21.2, t) * (1 - inv(21.4, 21.8, t));
    const p = { smile: 0.8, bob: 0.06 * Math.sin(inhale * Math.PI / 2) * (1 - close), lean: -0.06 * inhale * (1 - close), headYaw: 0.05 };
    if (t < 14.3) Object.assign(p, { brow: 0.6, smile: 1 });
    affan(a, t, p, y, 0.25);
    const k = easeInOut(inv(12.9, 24.7, t));
    lookCam([lerp(0.6, 0.35, k), lerp(3.0, 2.95, k), lerp(8.6, 7.2, k)], [0.1, 2.8, 0], 40);
    ov.flash((1 - inv(12.9, 13.35, t)) * 1.0);
    const h = scr(headPos(a));
    const m = scr(mouthPos(a));
    const slow = pop(t, 13.2, 24.5);
    ov.tag('slow', 'GERAK PERLAHAN', { x: W / 2, y: 290, o: slow.o * 0.95, s: slow.s }, { bg: '#2f7bff', small: true });
    const steps = [[14.44, 16.65, '1  MULUT TERBUKA LUAS', '#ff8a3d'], [16.72, 18.2, '2  RAHANG MEREGANG', '#ff5c8a'], [18.26, 21.6, '3  TARIK NAFAS DALAM', '#2fb3ff'], [21.66, 24.7, '4  HEMBUS PERLAHAN', '#3fc07a']];
    steps.forEach(([s, e, label, c], i) => {
      const q = pop(t, s, e);
      ov.tag('st' + i, label, { x: W / 2, y: 400, o: q.o, s: q.s }, { bg: c });
    });
    // arrows / guides
    const qa = pop(t, 14.6, 16.6);
    if (qa.o > 0) ov.html('arM', ICONS.arrow('#ff8a3d'), { x: m.x - 215, y: m.y, o: qa.o, s: qa.s * 0.8 });
    const qj = pop(t, 16.8, 18.2);
    if (qj.o > 0) {
      ov.html('arJ1', ICONS.arrow('#ff5c8a'), { x: m.x - 230, y: m.y + 110, o: qj.o, s: qj.s * 0.7, r: -20 });
      ov.html('arJ2', ICONS.arrow('#ff5c8a'), { x: m.x + 230, y: m.y + 110, o: qj.o, s: qj.s * 0.7, r: 200 });
    }
    // air in (blue) and out (soft white)
    airFlow(t, m.x - 500, m.y + 140, m.x - 10, m.y + 10, { a: inv(18.3, 18.7, t) * (1 - inv(21.2, 21.6, t)), seed: 4, speed: 0.9, bend: -40, size: 22, n: 34 });
    airFlow(t, m.x + 10, m.y + 10, m.x + 480, m.y + 160, { a: inv(21.8, 22.2, t) * (1 - inv(24.0, 24.6, t)), seed: 6, speed: 0.5, color: '255,255,255', bend: 40 });
    return lab;
  }],
  // D1 — why? scientists are still studying it; one popular idea
  [24.7, 31.6, (t) => {
    const a = lab.aff;
    a.root.position.set(0, 0, 0);
    a.root.rotation.y = -0.15;
    const think = keys(t, [[24.75, 0], [25.2, 1], [29.4, 1], [29.8, 0]]);
    const idea = keys(t, [[29.6, 0], [30.0, 1]]);
    const p = { brow: 0.7, smile: 0.9, headRoll: -0.1 * think, lookX: 0.25 * think, lookY: 0.3 * think + 0.4 * idea, headPitch: -0.12 * idea };
    p.armR = { ...POSES.thinkR.armR, reach: mix(REST_R, POSES.thinkR.armR.reach, think) };
    if (idea > 0.01) p.armL = { reach: mix(REST_L, [0.75, 2.1, 0.5], idea), pole: [1, -1, -0.5], point: idea };
    affan(a, t, p);
    const k = easeOut(inv(24.7, 26.0, t));
    lookCam([lerp(-1.4, -0.9, k), 2.6, lerp(12.5, 11.0, k)], [0, 2.4, 0], 40);
    const h = scr(headPos(a));
    const q = pop(t, 25.0, 27.1);
    ov.html('qD', ICONS.qmark('#ffcf33'), { x: h.x + 230, y: h.y - 260 + Math.sin(t * 3) * 10, o: q.o, s: q.s, r: 12 });
    const s = pop(t, 27.3, 31.5);
    ov.html('mag', IC.magnifier(), { x: 230, y: 470 + Math.sin(t * 2) * 8, o: s.o, s: s.s * 0.8, r: -8 });
    ov.tag('sci', 'SAINTIS MASIH MENGKAJI', { x: W / 2 + 60, y: 340, o: s.o, s: s.s, r: -2 }, { bg: '#2f7bff', small: true });
    const b = pop(t, 29.6, 31.5);
    ov.html('bulb', ICONS.bulb(), { x: h.x + 10, y: h.y - 330 + Math.sin(t * 3) * 8, o: b.o, s: b.s * 0.75 });
    ov.tag('idea', 'SATU IDEA...', { x: h.x + 280, y: h.y - 120, o: b.o, s: b.s, r: 4 }, { bg: '#ffb020', small: true });
    return lab;
  }],
  // D2 — close-up, x-ray view: cool air reaches the brain, the brain cools down
  [31.6, 35.25, (t) => {
    const a = lab.aff;
    a.root.position.set(0, 0, 0);
    a.root.rotation.y = 0.0;
    const y = yawnEnv(t, 31.7, 34.9, 0.3, 0.3) * 0.75;
    affan(a, t, { headYaw: 0, smile: 0.8 }, y, 0);
    lookCam([0.15, 3.0, lerp(7.4, 6.8, easeInOut(inv(31.6, 35.25, t)))], [0.1, 2.95, 0], 40);
    ov.flash((1 - inv(31.6, 31.9, t)) * 0.6);
    const h = scr(headPos(a));
    const m = scr(mouthPos(a));
    const xr = easeOut(inv(31.75, 32.2, t));
    const cool = easeInOut(inv(33.8, 34.6, t));
    const bx = h.x, by = h.y - 150;
    const g = ov.g;
    g.save();
    g.globalAlpha = 0.55 * xr;
    g.fillStyle = '#0b1a5c';
    g.beginPath();
    g.ellipse(bx, by, 230 * xr, 180 * xr, 0, 0, Math.PI * 2);
    g.fill();
    g.globalAlpha = xr;
    g.strokeStyle = '#8fd8ff';
    g.lineWidth = 8;
    g.setLineDash([22, 14]);
    g.lineDashOffset = -t * 60;
    g.stroke();
    g.restore();
    const col = cool > 0.5 ? '#8fd8ff' : '#ff9ec7';
    ov.html('brain', IC.brain(col), { x: bx, y: by, o: xr, s: 1.1 * xr * (1 + 0.04 * Math.sin(t * 6)) });
    // cool air: mouth up to the brain
    airFlow(t, m.x, m.y, bx, by + 30, { a: inv(32.0, 32.4, t) * (1 - inv(33.9, 34.3, t)), seed: 9, speed: 0.8, bend: 230, n: 30 });
    // thermometer drops from warm to cool
    const lvl = lerp(0.85, 0.25, cool);
    const tc = cool > 0.5 ? '#3fb3ff' : '#ff5c5c';
    const th = pop(t, 32.6, 35.3);
    ov.html('thermo', IC.thermo(lvl, tc), { x: 905, y: 780, o: th.o, s: th.s * 0.95 });
    const sn = pop(t, 34.0, 35.3);
    ov.html('snow', IC.snow(), { x: 180, y: 520 + Math.sin(t * 3) * 8, o: sn.o, s: sn.s, r: t * 20 });
    ov.tag('otak', cool > 0.5 ? 'OTAK SEJUK!' : 'UDARA SEJUK MASUK', { x: W / 2, y: 330, o: pop(t, 31.8, 35.3).o, s: 1 }, { bg: cool > 0.5 ? '#2fb3ff' : '#ff8a3d' });
    return lab;
  }],
  // D3 — fresh and ready: thumbs up with sparkles
  [35.25, 39.05, (t) => {
    const a = lab.aff;
    a.root.position.set(0, 0, 0);
    a.root.rotation.y = 0.18;
    const th = keys(t, [[36.4, 0], [36.9, 1]]);
    affan(a, t, { ...(th > 0.01 ? { armR: { ...POSES.thumbsUpR.armR, reach: mix(REST_R, POSES.thumbsUpR.armR.reach, th), thumb: th } } : {}), smile: 1, brow: 0.8, bob: 0.05 * Math.abs(Math.sin(t * 5)) * th });
    const k = easeOut(inv(35.25, 36.2, t));
    lookCam([lerp(1.6, 1.0, k), 2.6, lerp(13.0, 11.2, k)], [0.1, 2.35, 0], 40);
    ov.flash((1 - inv(35.25, 35.5, t)) * 0.5);
    const h = scr(headPos(a));
    ov.sparkles(t, { n: 22, seed: 13, x: h.x - 380, y: h.y - 420, w: 760, h: 700, a: inv(37.3, 37.7, t), size: 30 });
    const s1 = pop(t, 37.4, 39.05), s2 = pop(t, 38.16, 39.05);
    ov.tag('segar', 'SEGAR!', { x: 300, y: 380, o: s1.o, s: s1.s, r: -6 }, { bg: '#3fc07a' });
    ov.tag('sedia', 'BERSEDIA!', { x: 760, y: 470, o: s2.o, s: s2.s, r: 5 }, { bg: '#2f7bff' });
    return lab;
  }],
  // E — when do we yawn? sleepy, bored, just woke up
  [39.05, 45.4, (t) => {
    const a = lab.aff;
    a.root.position.set(0, 0, 0);
    a.root.rotation.y = 0;
    const y = Math.max(yawnEnv(t, 41.2, 42.4) * 0.6, yawnEnv(t, 42.6, 43.5) * 0.4, yawnEnv(t, 44.4, 45.4) * 0.8);
    affan(a, t, { smile: 0.8 }, y, 0.8);
    const k = easeOut(inv(39.05, 40.2, t));
    lookCam([0.4, lerp(2.0, 2.2, k), lerp(14.5, 13.0, k)], [0, lerp(3.1, 3.3, k), 0], 40);
    ov.flash((1 - inv(39.05, 39.3, t)) * 0.5);
    card('cA', t, 41.18, 99, IC.moonZ(), 'MENGANTUK', 200, 520, '#8a5cff', 0.95);
    card('cB', t, 42.5, 99, IC.clock(), 'BOSAN', 540, 470, '#ff8a3d', 0.95);
    card('cC', t, 44.4, 99, IC.sun(), 'BANGUN TIDUR', 880, 520, '#ffb020', 0.95);
    const s = pop(t, 39.3, 45.4);
    ov.tag('bila', 'BILA KITA MENGUAP?', { x: W / 2, y: 300, o: s.o, s: s.s }, { bg: '#2f7bff', small: true });
    return lab;
  }],
  // F — "the big question": can yawns spread? ... "Betul!"
  [45.4, 51.6, (t) => {
    const a = lab.aff;
    a.root.position.set(0, 0, 0);
    a.root.rotation.y = -0.1;
    const lean = keys(t, [[45.5, 0], [46.1, 1], [50.6, 1], [50.9, 0.2]]);
    const yes = keys(t, [[50.7, 0], [51.0, 1]]);
    const p = { lean: 0.1 * lean, headPitch: 0.06 * lean, headRoll: 0.1 * lean, smile: 1, brow: lerp(0.4, 1, yes), lookX: -0.1 * lean, bob: 0.08 * Math.abs(Math.sin(t * 7)) * yes };
    if (lean > 0.01 && yes < 0.5) p.armR = { reach: mix(REST_R, [-0.25, 1.2, 0.75], lean), pole: [-1, -1, 0], point: lean, wx: -0.3 };
    if (yes > 0.01) {
      p.armR = { reach: mix(REST_R, UP_R, yes), pole: [-1, -0.4, -0.6] };
      p.armL = { reach: mix(REST_L, UP_L, yes), pole: [1, -0.4, -0.6] };
      p.wow = 0.6 * (1 - inv(51.2, 51.5, t));
    }
    affan(a, t, p);
    const k = easeOut(inv(45.4, 46.4, t));
    lookCam([lerp(-0.5, -0.2, k), lerp(2.4, 2.6, k), lerp(9.5, 8.0, k)], [0, lerp(2.7, 2.8, k), 0], 40);
    ov.flash((1 - inv(45.4, 45.65, t)) * 0.5);
    const b = pop(t, 48.06, 50.7, { fin: 0.45 });
    ov.bubble('bj', 'BOLEH\nBERJANGKIT?', { x: W / 2, y: 420 + Math.sin(t * 3) * 6, o: b.o, s: b.s }, { size: 118, top: '#ffb3d1', bot: '#ff5c8a' });
    const sq = pop(t, 45.6, 47.9);
    ov.tag('soalan', 'SOALAN BESAR!', { x: W / 2, y: 360, o: sq.o, s: sq.s, r: -3 }, { bg: '#8a5cff' });
    const y1 = pop(t, 50.78, 51.6);
    ov.html('tick', IC.tick(), { x: W / 2 - 250, y: 460, o: y1.o, s: y1.s });
    ov.tag('betul', 'BETUL!', { x: W / 2 + 90, y: 460, o: y1.o, s: y1.s * 1.3, r: -4 }, { bg: '#3fc07a' });
    if (yes > 0) ov.sparkles(t, { n: 20, seed: 51, y: 300, h: 900, a: yes * (1 - inv(51.3, 51.6, t)), size: 30 });
    return lab;
  }],
  // G1 — see, hear or even read about a yawn ... and we catch it
  [51.6, 59.5, (t) => {
    const a = lab.aff;
    a.root.position.set(0, 0, 0);
    a.root.rotation.y = 0.05;
    const y = yawnEnv(t, 57.75, 59.45, 0.4, 0.3);
    const look = keys(t, [[52.1, 0], [52.5, 1], [53.9, 1], [54.3, -1], [55.5, -1], [55.9, 0]]);
    affan(a, t, { smile: 0.9, headYaw: 0.25 * look, lookX: 0.4 * look, lookY: 0.25 }, y, 1);
    lookCam([0.3, 2.3, lerp(12.2, 11.2, inv(51.6, 59.5, t))], [0, 3.15, 0], 40);
    ov.flash((1 - inv(51.6, 51.85, t)) * 0.5);
    card('gA', t, 52.14, 59.3, IC.eye(), 'NAMPAK', 200, 520, '#2f7bff', 0.95);
    card('gB', t, 53.96, 59.3, IC.ear(), 'DENGAR', 540, 470, '#ff8a3d', 0.95);
    card('gC', t, 55.6, 59.3, IC.book(), 'BACA', 880, 520, '#ff5c8a', 0.95);
    const h = scr(headPos(a));
    const z = pop(t, 58.0, 59.45);
    ov.html('zG', IC.zzz(), { x: h.x + 250, y: h.y - 230, o: z.o, s: z.s * 0.9, r: 8 });
    const c = pop(t, 58.0, 59.45);
    ov.tag('ikut', 'TERIKUT MENGUAP!', { x: W / 2, y: 300, o: c.o, s: c.s, r: -2 }, { bg: '#8a5cff' });
    return lab;
  }],
  // G2 — family and close friends: yawns pass along the row
  [59.5, 64.1, (t) => {
    const a = lab.aff;
    a.root.position.set(0, 0, 0);
    a.root.rotation.y = 0;
    const y = yawnEnv(t, 62.9, 64.1, 0.4, 0.3);
    affan(a, t, { smile: 0.9, lookY: 0.4, headPitch: -0.1 }, y, 0.6);
    lookCam([0, 2.0, 12.4], [0, 3.35, 0], 40);
    ov.flash((1 - inv(59.5, 59.75, t)) * 0.5);
    const g = ov.g;
    // white panel
    const pa = easeOut(inv(59.55, 59.9, t));
    g.save();
    g.globalAlpha = 0.92 * pa;
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.roundRect(80, 330, W - 160, 470, 60);
    g.fill();
    g.restore();
    const ppl = [
      { kind: 'mama', x: 260, a: 59.9, yA: 60.3 },
      { kind: 'papa', x: 540, a: 60.3, yA: 61.0, skin: '#d99168' },
      { kind: 'kawan', x: 820, a: 61.6, yA: 61.75, skin: '#f0b892' },
    ];
    ppl.forEach((pp, i) => {
      const q = pop(t, pp.a, 99);
      if (q.o <= 0) return;
      const yw = yawnEnv(t, pp.yA, pp.yA + 1.5, 0.4, 0.35);
      g.save();
      g.globalAlpha = q.o * pa;
      face(g, pp.x, 540, 110 * q.s, { kind: pp.kind, skin: pp.skin, yawn: yw, blink: blinkAt(t, i + 4), tilt: 0.05 * Math.sin(t * 2 + i) });
      g.restore();
    });
    // hearts linking them, and labels
    const hq = pop(t, 61.62, 99);
    ov.html('h1', IC.heart(), { x: 400, y: 470, o: hq.o, s: hq.s * 0.7 });
    ov.html('h2', IC.heart('#ff8fb8'), { x: 680, y: 470, o: pop(t, 62.54, 99).o, s: pop(t, 62.54, 99).s * 0.7 });
    const k1 = pop(t, 61.62, 99), k2 = pop(t, 62.54, 99);
    ov.tag('kel', 'KELUARGA', { x: 400, y: 735, o: k1.o, s: k1.s }, { bg: '#ff5c8a', small: true });
    ov.tag('kwn', 'KAWAN RAPAT', { x: 800, y: 735, o: k2.o, s: k2.s }, { bg: '#2f7bff', small: true });
    const top = pop(t, 59.6, 64.1);
    ov.tag('lagi', 'LAGI SENANG BERJANGKIT', { x: W / 2, y: 290, o: top.o, s: top.s }, { bg: '#8a5cff', small: true });
    return lab;
  }],
  // H — bedroom: the puppy watches Affan yawn, then yawns too
  [64.1, 68.0, (t) => {
    const a = room.aff, d = room.dog;
    a.root.position.set(0.9, 0, 0.2);
    a.root.rotation.y = -0.35;
    d.root.visible = true;
    d.root.position.set(-1.0, 0, 1.0);
    d.root.rotation.y = 0.75;
    const ya = yawnEnv(t, 64.2, 65.7, 0.4, 0.3);
    affan(a, t, { headYaw: -0.35 * (1 - ya), lookX: -0.4, smile: 1 }, ya, 1);
    const yd = yawnEnv(t, 65.9, 67.6, 0.4, 0.3);
    const tilt = keys(t, [[64.3, 0], [64.7, 1], [65.6, 1], [65.9, 0]]);
    d.pose({ yawn: yd, headTilt: 0.3 * tilt, headYaw: 0.3 * (1 - yd), headPitch: -0.2 * tilt, tail: t * 9, blink: blinkAt(t, 7) });
    const k = easeInOut(inv(64.1, 68.0, t));
    lookCam([lerp(-0.6, -0.4, k), 2.6, lerp(11.8, 10.6, k)], [-0.1, 2.0, 0.5], 40);
    ov.flash((1 - inv(64.1, 64.35, t)) * 0.5, '20,20,80');
    const dh = scr(wpos(d.parts.head));
    const q = pop(t, 64.26, 68.0);
    ov.tag('anj', 'ANJING PUN BOLEH!', { x: W / 2, y: 330, o: q.o, s: q.s, r: -2 }, { bg: '#ff8a3d' });
    const z = pop(t, 66.2, 68.0);
    ov.html('zD', IC.zzz(), { x: dh.x - 140, y: dh.y - 220, o: z.o, s: z.s * 0.7, r: -8 });
    return room;
  }],
  // I — "did you yawn watching this?" Affan points at the viewer
  [68.0, 71.0, (t) => {
    const a = room.aff;
    a.root.position.set(...AFF_ROOM);
    a.root.rotation.y = 0;
    room.dog.root.visible = false;
    const pt = keys(t, [[68.7, 0], [69.1, 1]]);
    affan(a, t, { armL: { reach: mix(REST_L, [0.35, 1.25, 1.0], pt), pole: [1, -1, -0.3], point: pt, wx: -0.2 }, smile: 1, brow: 0.7, lookX: 0, lookY: 0, headPitch: 0.04 * Math.sin(t * 9) * (1 - inv(68.0, 68.8, t)) });
    lookCam([0.3, 3.0, lerp(7.6, 7.0, easeOut(inv(68.0, 71.0, t)))], [0.2, 2.8, 0], 40);
    ov.flash((1 - inv(68.0, 68.25, t)) * 0.5, '20,20,80');
    const q = pop(t, 68.86, 71.0);
    ov.bubble('kmt', 'KORANG MENGUAP\nTAK?', { x: W / 2, y: 400 + Math.sin(t * 3) * 6, o: q.o, s: q.s }, { size: 100, top: '#e4d6ff', bot: '#a77bff' });
    return room;
  }],
  // J — "now you know!" thumbs up in the bedroom
  [71.0, 73.95, (t) => {
    const a = room.aff;
    a.root.position.set(...AFF_ROOM);
    a.root.rotation.y = 0.15;
    room.dog.root.visible = true;
    room.dog.root.position.set(-1.6, 0, 1.2);
    room.dog.root.rotation.y = 0.45;
    room.dog.pose({ tail: t * 10, headTilt: 0.15 * Math.sin(t * 2), blink: blinkAt(t, 8) });
    const th = keys(t, [[71.4, 0], [71.85, 1]]);
    affan(a, t, { armR: { ...POSES.thumbsUpR.armR, reach: mix(REST_R, POSES.thumbsUpR.armR.reach, th), thumb: th }, smile: 1, brow: 0.6 });
    lookCam([lerp(0.3, 0.0, inv(71, 74, t)), 2.7, 12.0], [-0.3, 2.3, 0.4], 40);
    ov.flash((1 - inv(71.0, 71.25, t)) * 0.5, '20,20,80');
    const h = scr(headPos(a));
    ov.sparkles(t, { n: 20, seed: 71, x: h.x - 400, y: h.y - 400, w: 800, h: 700, a: inv(72.0, 72.4, t), size: 28 });
    const q = pop(t, 72.18, 73.95);
    ov.tag('tahu', 'DAH TAHU!', { x: W / 2, y: 360, o: q.o, s: q.s * 1.2, r: -3 }, { bg: '#3fc07a' });
    return room;
  }],
  // Outro — The Curious Affan logo
  [73.95, DURATION, (t) => {
    const k = easeOut(inv(73.95, 74.65, t));
    outro.aff.root.position.set(0, 0, 0);
    outro.aff.pose({ ...POSES.thinkR, talk: talk(t), smile: 1, blink: blinkAt(t, 9), headRoll: -0.08, lookX: 0.25, lookY: 0.15, headYaw: 0.08 });
    lookCam([0, 2.6, lerp(7.5, 5.4, k)], [0, 2.3, 0], 40);
    const hc = scr(V(0, 2.95, 0));
    ov.flash((1 - inv(73.95, 74.3, t)) * 1.0);
    const g = ov.g;
    const ra = inv(74.05, 74.65, t);
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
    const ic = pop(t, 74.24, 99);
    ov.html('oBulb', ICONS.bulb(), { x: 175, y: 470 + Math.sin(t * 2) * 8, o: ic.o, s: ic.s * 0.55, r: -10 });
    ov.html('oQ1', ICONS.qmark('#ffcf33'), { x: 880, y: 420 + Math.sin(t * 2 + 1) * 8, o: ic.o, s: ic.s * 0.9, r: 12 });
    ov.html('oQ2', ICONS.qmark('#2f6fff'), { x: 220, y: 720 + Math.sin(t * 2 + 2) * 8, o: ic.o, s: ic.s * 0.6, r: -12 });
    const l1 = pop(t, 74.3, 99), l2 = pop(t, 74.5, 99), l3 = pop(t, 74.7, 99);
    drawLogo(ov, { k: [l1, l2, l3], star: pop(t, 74.9, 99) });
    return outro;
  }],
];

function frame(t) {
  ov.begin();
  cam.aspect = W / H;
  cam.updateProjectionMatrix();
  lab.update(t);
  const shot = SHOTS.find(([a, b]) => t >= a && t < b) || SHOTS[SHOTS.length - 1];
  const world = shot[2](t);
  renderer.render(world.scene, cam);
  if (world !== outro) ov.vignette(0.3);
  ov.captions(t, CAPTIONS, KEYWORDS);
  ov.end();
}

// Cover / thumbnail (9:16): Affan mid-yawn under a night sky, big title,
// episode badge, "boleh berjangkit?" hook and the series logo. Key elements
// stay inside the centre 3:4 area (y 240-1680) that profile grids show.
const cover = buildCover();
const THUMB = { cam: [0.4, 2.9, 11.2], look: [0.05, 2.86, 0], mouth: [1.05, 3.0], fov: 30 };
window.setThumb = (o) => Object.assign(THUMB, o);
function thumbnail() {
  ov.begin();
  cover.aff.pose({
    yaw: 0.2, headPitch: -0.14, headRoll: 0.12, headYaw: 0.08, tilt: 0.05,
    blink: 0.92, brow: 0.9, talk: 1, smile: 0, wow: 0,
    armL: { reach: [0.95, 2.05, 0.15], pole: [1, -0.4, -0.6], wz: -0.3 },
    armR: { reach: [-0.8, 1.1, 0.45], pole: [-1, -1, -0.2], wx: -0.6 },
  });
  cover.aff.parts.open.scale.set(THUMB.mouth[0], THUMB.mouth[1], 1);
  lookCam(THUMB.cam, THUMB.look, THUMB.fov);
  cover.sky.position.copy(cam.position);
  cover.stars.position.copy(cam.position);
  cover.stars.userData.update(4.2);
  renderer.render(cover.scene, cam);
  const g = ov.g;
  const top = g.createLinearGradient(0, 0, 0, 760);
  top.addColorStop(0, 'rgba(14,8,46,0.85)');
  top.addColorStop(1, 'rgba(14,8,46,0)');
  g.fillStyle = top;
  g.fillRect(0, 0, W, 760);
  const bot = g.createLinearGradient(0, H - 900, 0, H);
  bot.addColorStop(0, 'rgba(14,8,46,0)');
  bot.addColorStop(1, 'rgba(14,8,46,0.85)');
  g.fillStyle = bot;
  g.fillRect(0, H - 900, W, 900);
  ov.vignette(0.3);
  ov.sparkles(1.3, { n: 16, seed: 27, x: 60, y: 620, w: 960, h: 700, size: 22 });
  ov.tag('thBadge', 'EPISOD 27', { x: W / 2, y: 300 }, { bg: '#2f7bff', small: true });
  ov.bubble('thTitle', 'KENAPA KITA\nMENGUAP?', { x: W / 2, y: 475, r: -2 }, { size: 124 });
  ov.html('thZ', IC.zzz(), { x: 860, y: 760, r: 8, s: 0.95 });
  ov.tag('thHook', 'BOLEH BERJANGKIT?', { x: W / 2 + 10, y: 1290, r: -3 }, { bg: '#ff4d8d' });
  drawLogo(ov, { y: 1420, scale: 0.5 });
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
