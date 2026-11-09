// THE CURIOUS AFFAN — Episode 025: "Kenapa Badan Kita Panas Kalau Demam?"
// Every shot is a pure function of time t (seconds), synced to audio/narration.mp3.
import * as THREE from 'three';
import { makeRenderer, loadEnvelope, toScreen, clamp, lerp, inv, easeOut, easeInOut, keys, wobble, rng, W, H } from '../../shared/core.js';
import { POSES, blinkAt } from '../../shared/affan.js';
import { Overlay, pop, ICONS, drawLogo } from '../../shared/overlay.js';
import { CAPTIONS, KEYWORDS } from './captions.js';
import { buildBedroom, buildVessel, buildBodyStage, buildOutro, ZONE } from './worlds.js';

const FPS = 30;
const DURATION = 70.6;

const stage = document.getElementById('stage');
const canvas = document.createElement('canvas');
stage.appendChild(canvas);
const renderer = makeRenderer(canvas);
const ov = new Overlay(stage);
// a little more room between caption words so the popping active word never touches its neighbours
document.head.appendChild(Object.assign(document.createElement('style'), { textContent: '.cap .w { margin: 0 15px; }' }));
const room = buildBedroom();
const vessel = buildVessel();
const body = buildBodyStage();
const outro = buildOutro();
const cam = new THREE.PerspectiveCamera(50, W / H, 0.05, 1200);
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
function pinTag(id, text, p, t, a, b, style, dy = -90) {
  const q = pop(t, a, b);
  if (q.o <= 0 || !p.visible) return;
  ov.tag(id, text, { x: clamp(p.x, 190, 890), y: clamp(p.y + dy, 300, 1360), o: q.o, s: q.s }, style);
}
const RED = '#ff5a3d', BLUE = '#2f9bff', GREEN = '#2fbf71', PURPLE = '#8a5cff', PINK = '#ff5f9e';

// ------------------------------------------------------------- extra icons
const SVG = {
  thermo: (lvl = 0.6) => `<svg width="90" height="230" viewBox="0 0 90 230"><rect x="27" y="8" width="36" height="160" rx="18" fill="#fff" stroke="#17256b" stroke-width="9"/>
    <rect x="37" y="${18 + 140 * (1 - lvl)}" width="16" height="${150 * lvl}" rx="8" fill="#ff3b3b"/><circle cx="45" cy="185" r="34" fill="#ff3b3b" stroke="#17256b" stroke-width="9"/>
    <circle cx="35" cy="175" r="8" fill="#fff" opacity="0.7"/></svg>`,
  snow: (c = '#ffffff') => `<svg width="120" height="120" viewBox="-60 -60 120 120"><g stroke="#2f6fd6" stroke-width="20" stroke-linecap="round">${[0, 60, 120].map((a) => `<line x1="0" y1="-46" x2="0" y2="46" transform="rotate(${a})"/>`).join('')}</g>
    <g stroke="${c}" stroke-width="10" stroke-linecap="round" fill="none">${[0, 60, 120, 180, 240, 300].map((a) => `<g transform="rotate(${a})"><line x1="0" y1="0" x2="0" y2="-46"/><polyline points="-13,-38 0,-26 13,-38"/></g>`).join('')}</g></svg>`,
  shield: () => `<svg width="220" height="250" viewBox="0 0 220 250"><path d="M110 12 L200 45 C200 140 165 200 110 238 C55 200 20 140 20 45 Z" fill="#7cf0a8" stroke="#17256b" stroke-width="12" stroke-linejoin="round"/>
    <path d="M110 40 L172 62 C170 132 146 176 110 204 Z" fill="#fff" opacity="0.35"/><path d="M68 122 L100 154 L156 92" fill="none" stroke="#17256b" stroke-width="18" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  heart: () => `<svg width="96" height="90" viewBox="0 0 96 90"><path d="M48 82 C20 60 6 44 6 26 C6 13 16 5 28 5 C37 5 44 10 48 18 C52 10 59 5 68 5 C80 5 90 13 90 26 C90 44 76 60 48 82 Z" fill="#ff5f7e" stroke="#17256b" stroke-width="8"/></svg>`,
  glass: () => `<svg width="80" height="96" viewBox="0 0 80 96"><path d="M10 8 H70 L62 88 H18 Z" fill="#eaf6ff" stroke="#17256b" stroke-width="8" stroke-linejoin="round"/><path d="M15 38 H65 L61 82 H19 Z" fill="#5ab8ff"/></svg>`,
  zzz: () => `<svg width="96" height="90" viewBox="0 0 96 90"><path d="M50 10 A36 36 0 1 0 86 60 A28 28 0 1 1 50 10 Z" fill="#ffd84a" stroke="#17256b" stroke-width="8" stroke-linejoin="round"/><text x="12" y="40" font-family="Baloo 2" font-weight="800" font-size="34" fill="#8a5cff" stroke="#fff" stroke-width="6" paint-order="stroke">z</text></svg>`,
  check: (k = 1) => `<svg width="70" height="70" viewBox="0 0 70 70"><circle cx="35" cy="35" r="30" fill="${k > 0.5 ? '#2fbf71' : '#d9def0'}" stroke="#fff" stroke-width="6"/><path d="M20 36 L31 47 L51 24" fill="none" stroke="#fff" stroke-width="9" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="50" stroke-dashoffset="${50 * (1 - k)}"/></svg>`,
  bolt: () => `<svg width="90" height="140" viewBox="0 0 90 140"><path d="M55 5 L12 78 H42 L32 135 L80 55 H50 Z" fill="#ffd84a" stroke="#17256b" stroke-width="9" stroke-linejoin="round"/></svg>`,
  up: (c = RED) => `<svg width="110" height="150" viewBox="0 0 110 150"><path d="M55 8 L102 62 H72 V142 H38 V62 H8 Z" fill="${c}" stroke="#fff" stroke-width="10" stroke-linejoin="round"/></svg>`,
  sweat: () => `<svg width="50" height="70" viewBox="0 0 50 70"><path d="M25 4 C35 24 45 36 45 48 C45 60 36 66 25 66 C14 66 5 60 5 48 C5 36 15 24 25 4 Z" fill="#8fd8ff" stroke="#17256b" stroke-width="6"/></svg>`,
};

// Wavy heat lines rising from (x, y).
function heatWaves(t, x, y, a = 1, { n = 3, h = 170, spread = 70, color = '#ff7a3d', w = 12 } = {}) {
  if (a <= 0) return;
  const g = ov.g;
  g.save();
  g.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const cx = x + (i - (n - 1) / 2) * spread;
    const ph = (t * 1.2 + i * 0.37) % 1;
    const yy = y - ph * 40;
    g.globalAlpha = clamp(a) * Math.sin(ph * Math.PI);
    g.beginPath();
    for (let k = 0; k <= 24; k++) {
      const v = k / 24;
      const px = cx + Math.sin(v * Math.PI * 2.2 + t * 6 + i) * 14;
      const py = yy - v * h;
      k ? g.lineTo(px, py) : g.moveTo(px, py);
    }
    g.strokeStyle = 'rgba(255,255,255,0.9)';
    g.lineWidth = w + 8;
    g.stroke();
    g.strokeStyle = color;
    g.lineWidth = w;
    g.stroke();
  }
  g.restore();
}
// Little "brr" shiver marks either side of a point.
function shiverMarks(t, x, y, a, spread = 190) {
  if (a <= 0) return;
  const g = ov.g;
  g.save();
  g.lineCap = 'round';
  for (const s of [-1, 1]) for (let i = 0; i < 3; i++) {
    const j = Math.sin(t * 40 + i * 2 + s) * 6;
    const cx = x + s * (spread + i * 34) + j, cy = y - 50 + i * 50;
    g.globalAlpha = clamp(a) * (0.6 + 0.4 * Math.sin(t * 20 + i));
    g.beginPath();
    g.arc(cx - s * 30, cy, 34, s > 0 ? -0.7 : Math.PI - 0.7, s > 0 ? 0.7 : Math.PI + 0.7);
    g.strokeStyle = '#ffffff';
    g.lineWidth = 16;
    g.stroke();
    g.strokeStyle = '#4fb4ff';
    g.lineWidth = 9;
    g.stroke();
  }
  g.restore();
}
function snowfall(t, a, seed = 4) {
  if (a <= 0) return;
  const R = rng(seed);
  for (let i = 0; i < 22; i++) {
    const x = R() * W, sp = 120 + R() * 160, ph = R() * H, s = 0.35 + R() * 0.45;
    const y = ((ph + t * sp) % (H + 200)) - 100;
    ov.html('snow' + i, SVG.snow(), { x: x + Math.sin(t * 1.5 + i) * 30, y, o: a * 0.9, s, r: t * 40 + i * 20 });
  }
}
function tint(color, a) {
  if (a <= 0) return;
  ov.g.fillStyle = `rgba(${color},${clamp(a)})`;
  ov.g.fillRect(0, 0, W, H);
}
// Checklist card for the "what to do when you have a fever" tips.
function card(id, icon, text, y, t, a, done) {
  const q = pop(t, a, 99, { from: 0.6 });
  if (q.o <= 0) return;
  const k = clamp((t - done) / 0.35);
  const slide = (1 - easeOut(clamp((t - a) / 0.4))) * 260;
  ov.html(id, `<div style="display:flex;align-items:center;gap:22px;width:760px;padding:14px 26px;border-radius:34px;background:rgba(255,255,255,0.94);box-shadow:0 10px 0 rgba(23,37,107,0.25),0 0 0 6px #17256b;font-family:'Baloo 2';font-weight:800;font-size:54px;color:#17256b;line-height:1">
    <div style="width:96px;display:flex;justify-content:center">${icon}</div><div style="flex:1;padding-top:6px">${text}</div>${SVG.check(k)}</div>`, { x: W / 2 + slide, y, o: q.o, s: q.s });
}

// ------------------------------------------------------------ bedroom bits
const BED = { legL: { x: -1.5, knee: 0.08 }, legR: { x: -1.5, knee: 0.08 }, lean: -0.1 };
const restArms = { armL: { reach: [0.6, 0.3, 0.55], pole: [1, -0.6, -0.4] }, armR: { reach: [-0.6, 0.3, 0.55], pole: [-1, -0.6, -0.4] } };
const cheeks = { armL: { reach: [0.32, 1.32, 0.62], pole: [1, -0.6, 0.2] }, armR: { reach: [-0.32, 1.32, 0.62], pole: [-1, -0.6, 0.2] } };
const hug = { armL: { reach: [-0.22, 0.78, 0.62], pole: [1, -0.3, 0.6] }, armR: { reach: [0.22, 0.68, 0.66], pole: [-1, -0.3, 0.6] } };
const mixArm = (a, b, k) => ({ reach: a.reach.map((v, i) => lerp(v, b.reach[i], k)), pole: (k < 0.5 ? a : b).pole, point: lerp(a.point || 0, b.point || 0, k), thumb: lerp(a.thumb || 0, b.thumb || 0, k), wx: lerp(a.wx || 0, b.wx || 0, k), wy: lerp(a.wy || 0, b.wy || 0, k), wz: lerp(a.wz || 0, b.wz || 0, k) });
const mixArms = (a, b, k) => ({ armL: mixArm(a.armL, b.armL, k), armR: mixArm(a.armR, b.armR, k) });
function bedAffan(t, p = {}) {
  room.aff.pose({ ...BED, ...restArms, blink: blinkAt(t, 2), talk: talk(t), smile: 0.6, ...p });
}
const HEAD = V(0, 3.55, -1.25);
const shiver = (t, k) => ({ tilt: k * 0.035 * Math.sin(t * 47), headRoll: k * 0.04 * Math.sin(t * 39 + 1) });

// ----------------------------------------------------------- body helpers
function stageLight(x, z = 0) {
  body.key.target.position.set(x, 1.5, z);
  body.key.position.set(x + 5, 12, z + 8);
}
function hideStage() {
  for (const o of [...body.germs, ...body.wbcs]) o.position.set(0, -50, 0);
  body.aff.root.position.set(0, -50, 0);
  body.motes.userData.update(0, 0);
  body.panel.userData.set(0, {});
  body.brain.userData.update(0, 0);
  for (const p of body.pulses) p.material.opacity = 0;
  body.hemi.color.setHex(0xfff0f0);
  body.blush(0);
}
function stand(t, p = {}) {
  body.aff.pose({ blink: blinkAt(t, 5), talk: talk(t), smile: 0.8, ...p });
}
const walkLegs = (ph, k = 1) => ({ legL: { x: -0.45 * Math.sin(ph) * k, knee: Math.max(0, Math.sin(ph)) * 0.5 * k }, legR: { x: 0.45 * Math.sin(ph) * k, knee: Math.max(0, -Math.sin(ph)) * 0.5 * k } });
const KNOB = new THREE.Vector3();
function knobWorld() {
  body.panel.updateMatrixWorld(true);
  return body.panel.userData.knob.getWorldPosition(KNOB).clone();
}

// Battle zone choreography: WBCs on the left, germs on the right.
const B = ZONE.battle;
const GERM_HOME = [[1.3, 2.4, 0.4], [2.2, 4.0, -0.8], [1.8, 1.2, 1.0], [2.6, 2.7, -1.6]];
const WBC_HOME = [[-1.6, 2.6, 0.6], [-2.2, 4.2, -0.8], [-2.0, 1.3, 1.2]];
function battle(t, { charge = 0, hot = 0, flee = 0, cheer = 0 } = {}) {
  body.germs.forEach((gm, i) => {
    const h = GERM_HOME[i];
    const hit = clamp((charge - 0.55) / 0.45);
    const kx = hit * (1.4 + i * 0.3) + flee * (5 + i);
    gm.position.set(B + h[0] + kx + 0.15 * Math.sin(t * 1.7 + i), h[1] + 0.25 * Math.sin(t * 2.1 + i * 2) + flee * 1.5, h[2]);
    gm.rotation.set(0, -0.5 + hit * Math.sin(t * 10 + i) * 0.6, hit * 0.6 * Math.sin(t * 8 + i));
    gm.scale.setScalar((1 - 0.35 * hot * clamp((t - 46.6) / 0.8)) * (1 - flee * 0.6));
    gm.userData.update(t, { hot, squash: hit * Math.max(0, Math.sin((charge - 0.55) * 12)) });
  });
  body.wbcs.forEach((w, i) => {
    const h = WBC_HOME[i];
    const go = easeInOut(clamp(charge / 0.6));
    const tgt = GERM_HOME[i];
    w.position.set(B + lerp(h[0], tgt[0] - 1.4, go), lerp(h[1], tgt[1], go) + 0.2 * Math.sin(t * 2 + i), lerp(h[2], tgt[2], go));
    w.rotation.set(0, 0.5 - go * 0.2, -go * 0.25);
    w.userData.update(t, { cheer, squash: charge > 0.55 && charge < 0.9 ? 0.6 * Math.sin((charge - 0.55) * 9) : 0 });
  });
}

// ------------------------------------------------------------------- hook
function hook(t) {
  const p = pop(t, 0.12, 5.25, { fin: 0.45 });
  const fl = Math.sin(t * 3) * 6;
  ov.bubble('hook', 'KENAPA BADAN PANAS\nKALAU DEMAM?', { x: W / 2, y: 430 + fl, o: p.o, s: p.s }, { size: 92, top: '#ffe45c', bot: '#ff7a3d' });
  const q = pop(t, 0.5, 5.25);
  ov.tag('ep', 'EPISOD 25', { x: W / 2, y: 268, o: q.o, s: q.s }, { bg: '#2f7bff', small: true });
  const th = pop(t, 0.9, 5.25);
  ov.html('hThermo', SVG.thermo(0.85), { x: 900, y: 700 + Math.sin(t * 2.5) * 10, o: th.o, s: th.s * 0.8, r: 14 });
}

// ======================================================================= SHOTS
const SHOTS = [
  // S1 — hook: feverish Affan in bed, cheeks hot, then calls Mama
  [0, 5.3, (t) => {
    room.handGlass.visible = false;
    room.tableGlass.visible = true;
    room.tableGlass.position.set(2.55, 1.5, -1.95);
    room.tableGlass.rotation.x = 0;
    room.blush(1);
    const ch = keys(t, [[0.2, 0], [0.7, 1], [1.9, 1], [2.3, 0]]);
    const call = keys(t, [[2.0, 0], [2.4, 1], [4.9, 1], [5.3, 0.4]]);
    bedAffan(t, {
      ...mixArms(restArms, cheeks, ch), smile: 0.3, brow: 0.9 - call * 0.4,
      headYaw: call * 0.55, headPitch: lerp(0.12, -0.05, call), headRoll: -0.06 * (1 - call), lookX: call * 0.6, lookY: lerp(-0.25, 0.1, call),
    });
    const k = easeInOut(inv(0, 5.3, t));
    lookCam(V(lerp(2.4, 1.4, k), lerp(4.6, 4.05, k), lerp(6.4, 4.4, k)), V(0.15, lerp(2.7, 3.0, k), -1.0), 46);
    hook(t);
    return room;
  }],
  // S2 — "Korang pernah rasa tak? Dahi panas... badan menggigil..."
  [5.3, 9.7, (t) => {
    room.blush(1);
    const ch = keys(t, [[6.8, 0], [7.15, 1], [8.1, 1], [8.4, 0]]);
    const hg = keys(t, [[8.2, 0], [8.55, 1]]);
    const shv = keys(t, [[8.3, 0], [8.5, 1]]);
    let arms = mixArms(restArms, cheeks, ch);
    if (hg > 0) arms = mixArms(restArms, hug, hg);
    bedAffan(t, {
      ...arms, ...shiver(t, shv), smile: 0.4, brow: 0.6 + 0.4 * hg, headPitch: 0.05,
      headYaw: keys(t, [[5.3, 0.3], [5.6, 0.05]]), lookX: 0, lookY: 0,
    });
    const k = easeOut(inv(5.3, 9.7, t));
    lookCam(V(lerp(1.0, 0.8, k), 3.85, lerp(3.5, 3.0, k)), V(0.05, 3.3, -1.3), 44);
    const head = scr(V(0, 4.55, -1.25));
    const hp = pop(t, 6.94, 9.65);
    heatWaves(t, head.x, head.y, hp.o * (1 - 0.6 * hg), { n: 3, h: 150, spread: 80 });
    ov.tag('dahi', 'DAHI PANAS', { x: 300, y: 420, o: hp.o, s: hp.s, r: -4 }, { bg: RED });
    ov.html('th2', SVG.thermo(0.9), { x: 860, y: 520 + Math.sin(t * 3) * 8, o: hp.o, s: hp.s * 0.75, r: 12 });
    const sp = pop(t, 8.7, 9.65);
    ov.tag('gigil', 'MENGGIGIL', { x: 760, y: 1240, o: sp.o, s: sp.s, r: 3 }, { bg: BLUE });
    const torso = scr(V(0, 2.45, -1.2));
    shiverMarks(t, torso.x, torso.y, sp.o, 260);
    return room;
  }],
  // S3 — "tapi rasa sejuk pulak!" snowflakes, still shivering
  [9.7, 11.65, (t) => {
    room.blush(1);
    bedAffan(t, {
      ...hug, ...shiver(t, 1), smile: 0.2, brow: 1, wow: keys(t, [[10.5, 0], [10.7, 0.5], [11.4, 0.5], [11.6, 0]]),
      headYaw: -0.15, headPitch: -0.1, lookY: 0.5, lookX: -0.3,
    });
    const k = easeOut(inv(9.7, 11.65, t));
    lookCam(V(lerp(-1.7, -1.3, k), lerp(4.3, 4.1, k), lerp(3.6, 3.1, k)), V(0, 3.1, -1.3), 46);
    tint('120,190,255', 0.18 * pop(t, 9.75, 11.6).o);
    snowfall(t, pop(t, 9.85, 11.6).o);
    const q = pop(t, 10.66, 11.6);
    ov.bubble('sejuk', 'SEJUK?!', { x: W / 2, y: 420, o: q.o, s: q.s, r: -3 }, { size: 150, top: '#d8f2ff', bot: '#3fa2ff' });
    const torso = scr(V(0, 2.45, -1.2));
    shiverMarks(t, torso.x, torso.y, 1, 260);
    return room;
  }],
  // S4 — "Jom ikut Affan cari jawapan!" arm up, magic swirl
  [11.65, 13.9, (t) => {
    room.blush(0.7);
    const up = keys(t, [[11.65, 0], [11.95, 1], [13.3, 1], [13.6, 0.6]], easeOut);
    bedAffan(t, {
      armL: restArms.armL,
      armR: { reach: [lerp(-0.6, -0.62, up), lerp(0.3, 1.95 + 0.06 * Math.sin(t * 14), up), lerp(0.55, 0.35, up)], pole: [-1, -0.3, -0.5] },
      smile: 1, brow: 0.7, headYaw: 0.05, lookX: 0, lookY: 0.05,
    });
    const k = easeInOut(inv(11.65, 13.9, t));
    lookCam(V(lerp(0.5, 0.3, k), 3.8, lerp(3.4, 2.7, k)), V(0, 3.45, -1.3), 46);
    ov.swirl(t, W / 2, 820, inv(12.3, 13.75, t));
    ov.flash(inv(13.5, 13.9, t) ** 2);
    return room;
  }],
  // S5 — inside a blood vessel: germs sneak in
  [13.9, 15.95, (t) => {
    vessel.cells.userData.update(t);
    const pos = [[9 - 3.0 * (t - 13.9), 0.6, -0.9], [12 - 3.4 * (t - 13.9), -1.2, 1.3], [15 - 3.2 * (t - 13.9), 1.8, 1.6]];
    vessel.germs.forEach((g, i) => {
      g.position.set(...pos[i]);
      g.rotation.set(0, -Math.PI / 2 + 0.6, 0.2 * Math.sin(t * 2 + i));
      g.scale.setScalar(1.3);
      g.userData.update(t);
    });
    const k = easeOut(inv(13.9, 15.95, t));
    lookCam(V(lerp(-6.5, -4.5, k), 0.2, 0.2), V(6, 0.4, 0.1), 58);
    ov.flash(1 - inv(13.9, 14.3, t));
    const g0 = scr(vessel.germs[0].position.clone().add(V(0, 0.4, 0)));
    pinTag('kuman', 'KUMAN', g0, t, 14.24, 15.9, { bg: GREEN, pointer: 'down' }, -130);
    const m = pop(t, 14.56, 15.9);
    ov.bubble('masuk', 'MASUK!', { x: W / 2 + 40, y: 1250, o: m.o, s: m.s, r: -4 }, { size: 120, top: '#c8ff9a', bot: '#4fc43a' });
    return vessel;
  }],
  // S6 — the brain gets a signal... "Ada penceroboh!"
  [15.95, 19.55, (t) => {
    hideStage();
    stageLight(0);
    const alarm = keys(t, [[17.7, 0], [17.85, 1]]);
    body.brain.userData.update(t, alarm);
    body.panel.userData.set(t, { heat: 0, alarm });
    // signal pulses travel up the nerve to the brain
    body.pulses.forEach((p, i) => {
      const u = clamp((t - 15.95 - i * 0.28) / 1.2);
      const on = u > 0 && u < 1 ? 1 : 0;
      p.position.copy(body.cable.getPoint(u));
      p.material.opacity = on * 0.95;
      p.scale.setScalar(1.6 + 0.4 * Math.sin(t * 20 + i));
    });
    const k = easeInOut(inv(15.95, 19.55, t));
    const shake = alarm * 0.05 * Math.sin(t * 50);
    lookCam(V(lerp(0.0, -0.6, k) + shake, lerp(5.0, 5.4, k), lerp(11.5, 9.8, k)), V(-0.7, 4.6 + shake, 0), 50);
    const br = scr(V(-1.6, 6.4, -0.6));
    const sg = pop(t, 16.56, 17.75);
    ov.tag('isyarat', 'ISYARAT!', { x: clamp(br.x + 260, 200, 880), y: br.y - 10, o: sg.o, s: sg.s, r: 6 }, { bg: '#ffb020' });
    ov.html('bolt', SVG.bolt(), { x: clamp(br.x + 60, 200, 880), y: br.y - 40 + Math.sin(t * 12) * 6, o: sg.o, s: sg.s * 0.8, r: -10 });
    const otak = scr(V(-1.6, 3.0, 1.2));
    pinTag('otak', 'OTAK', otak, t, 16.0, 17.75, { bg: PINK, pointer: 'up' }, 110);
    if (alarm > 0) {
      const fl = 0.5 + 0.5 * Math.sin(t * 18);
      tint('255,40,40', 0.16 * fl);
      const q = pop(t, 17.84, 19.5, { from: 2 });
      ov.bubble('pencer', 'ADA\nPENCEROBOH!', { x: W / 2, y: 420 + Math.sin(t * 30) * 4, o: q.o, s: q.s, r: -3 }, { size: 120, top: '#ffd0c4', bot: '#ff3b3b' });
      ov.vignette(0.45 * fl);
    }
    return body;
  }],
  // S7 — the brain turns up the body's heater
  [19.55, 23.95, (t) => {
    hideStage();
    stageLight(2);
    const heat = easeInOut(clamp((t - 20.3) / 3.1));
    body.brain.userData.update(t, keys(t, [[19.55, 0.6], [20.2, 0]]));
    body.panel.userData.set(t, { heat, alarm: keys(t, [[19.55, 1], [20.0, 0]]) });
    const kw = knobWorld();
    const f = V(Math.sin(body.panel.rotation.y), 0, Math.cos(body.panel.rotation.y));
    const r = V(Math.cos(body.panel.rotation.y), 0, -Math.sin(body.panel.rotation.y));
    const pos = kw.clone().addScaledVector(f, 0.55).addScaledVector(r, 0.85);
    pos.y = 0;
    body.aff.root.position.copy(pos);
    const yaw = -0.9;
    body.aff.pose({ yaw });
    const kt = body.aff.toTorso(kw.clone().addScaledVector(f, 0.15));
    const reach = keys(t, [[19.9, 0], [20.3, 1], [23.5, 1], [23.9, 0]]);
    const turn = heat * 1.4;
    stand(t, {
      yaw, smile: 1, brow: 0.5, headYaw: keys(t, [[19.55, -0.6], [20.3, -0.2], [22.5, -0.2], [23.0, 0.5]]), headPitch: 0.05, lookX: 0.2,
      armR: reach > 0 ? { reach: [lerp(-0.55, kt[0] + 0.12 * Math.cos(turn), reach), lerp(0.25, kt[1] + 0.12 * Math.sin(turn), reach), lerp(0.2, kt[2], reach)], pole: [-1, -0.8, 0.2] } : {},
      armL: { reach: [0.6, 0.6 + 0.6 * clamp((t - 22.6) / 0.3), 0.4], pole: [1, -0.5, -0.3], point: clamp((t - 22.6) / 0.3) },
    });
    body.hemi.color.setRGB(1, lerp(0.94, 0.8, heat), lerp(0.94, 0.7, heat));
    const k = easeInOut(inv(19.55, 23.95, t));
    lookCam(V(kw.x + lerp(2.2, 1.6, k), lerp(4.0, 3.6, k), kw.z + lerp(9.6, 8.0, k)), V(kw.x + lerp(0.2, 0.5, k), 2.4, kw.z), 48);
    tint('255,120,40', 0.14 * heat);
    const su = pop(t, 20.76, 23.9);
    ov.tag('suhu', 'SUHU NAIK', { x: 330, y: 380, o: su.o, s: su.s, r: -3 }, { bg: RED });
    ov.html('upA', SVG.up(), { x: 600, y: 370 + Math.sin(t * 6) * 10, o: su.o, s: su.s * 0.7 });
    const bt = pop(t, 22.76, 23.9);
    ov.bubble('pemanas', 'BUTANG PEMANAS!', { x: W / 2, y: 560, o: bt.o, s: bt.s, r: 2 }, { size: 100, top: '#ffd36b', bot: '#ff5a3d' });
    return body;
  }],
  // S8 — giant thermometer: 37 °C is normal, fever goes to 38 °C or more
  [23.95, 33.45, (t) => {
    hideStage();
    const X = ZONE.thermo;
    stageLight(X);
    const lvl = keys(t, [[23.95, 36.3], [25.6, 37.0], [30.3, 37.0], [32.0, 38.4], [32.6, 38.4], [33.3, 39.0]]);
    body.thermo.userData.set(lvl);
    const fever = clamp((lvl - 37.2) / 1.2);
    body.blush(fever);
    body.aff.root.position.set(X - 2.5, 0, 1.4);
    const pt = keys(t, [[24.3, 0], [24.7, 1], [28.0, 1], [28.4, 0], [30.3, 0], [30.7, 1]]);
    const wowK = keys(t, [[31.7, 0], [31.9, 0.8], [32.7, 0.8], [33.0, 0]]);
    stand(t, {
      yaw: 0.35, smile: 1 - 0.3 * fever, brow: 0.4 + 0.6 * fever, wow: wowK, headYaw: 0.25, headPitch: -0.12, lookX: 0.4, lookY: 0.4,
      armL: { reach: [lerp(0.6, 0.95, pt), lerp(0.4, 1.25, pt), lerp(0.25, 0.45, pt)], pole: [1, -0.6, -0.4], point: pt },
      armR: { reach: [-0.6, 0.35, 0.3] },
    });
    const k = easeInOut(inv(23.95, 33.45, t));
    lookCam(V(X + lerp(-1.6, -0.9, k), lerp(4.6, 5.0, k), lerp(12.0, 10.4, k)), V(X - 0.9, 4.4, 0), 50);
    const y37 = scr(V(X + 0.5, body.thermo.userData.yOf(37), 0.3));
    const y38 = scr(V(X + 0.5, body.thermo.userData.yOf(38), 0.3));
    const n = pop(t, 26.86, 33.4);
    ov.tag('t37', '37°C', { x: y37.x + 140, y: y37.y, o: n.o, s: n.s }, { bg: GREEN });
    const b = pop(t, 24.02, 28.3);
    ov.tag('biasa', 'BIASA', { x: y37.x + 140, y: y37.y + 95, o: b.o, s: b.s }, { bg: GREEN, small: true });
    const d = pop(t, 31.0, 33.4, { from: 2 });
    ov.tag('t38', '38°C', { x: y38.x + 140, y: y38.y - 20, o: d.o, s: d.s }, { bg: RED });
    const dm = pop(t, 29.0, 33.4);
    ov.bubble('demam', 'DEMAM!', { x: W / 2, y: 380, o: dm.o, s: dm.s, r: -3 }, { size: 130, top: '#ffd0a0', bot: '#ff5a3d' });
    const lb = pop(t, 32.54, 33.4);
    ov.html('lebih', SVG.up(), { x: y38.x + 300, y: y38.y - 40 + Math.sin(t * 8) * 8, o: lb.o, s: lb.s * 0.6 });
    heatWaves(t, y38.x, y38.y - 160, fever * 0.8, { n: 2, spread: 70, h: 120 });
    return body;
  }],
  // S9 — shivering makes heat: muscles move to warm the body
  [33.45, 38.25, (t) => {
    hideStage();
    const X = ZONE.heat;
    stageLight(X);
    body.blush(1);
    body.aff.root.position.set(X, 0, 0);
    const shv = keys(t, [[33.5, 0], [33.8, 1], [37.4, 1], [37.9, 0.3]]);
    const hg = keys(t, [[33.45, 0], [33.8, 1], [37.3, 1], [37.7, 0]]);
    const yay = keys(t, [[37.4, 0], [37.8, 1]]);
    stand(t, {
      ...(hg > 0 ? mixArms({ armL: { reach: [0.6, 0.35, 0.3], pole: [1, -0.6, -0.4] }, armR: { reach: [-0.6, 0.35, 0.3], pole: [-1, -0.6, -0.4] } }, hug, hg)
        : { armL: { reach: [0.95, lerp(0.35, 1.5, yay), 0.35], pole: [1, -0.4, -0.5] }, armR: { reach: [-0.95, lerp(0.35, 1.5, yay), 0.35], pole: [-1, -0.4, -0.5] } }),
      ...shiver(t, shv * 1.3), smile: 0.4 + 0.6 * yay, brow: 0.8, headPitch: 0.05,
      legL: { x: 0.04 * Math.sin(t * 45) * shv }, legR: { x: -0.04 * Math.sin(t * 45) * shv },
    });
    body.motes.position.set(X, 0.2, 0);
    body.motes.userData.update(t, clamp((t - 35.6) / 0.8) * 1.0);
    body.hemi.color.setRGB(1, lerp(0.94, 0.82, inv(35.6, 37.5, t)), lerp(0.94, 0.72, inv(35.6, 37.5, t)));
    const k = easeOut(inv(33.45, 38.25, t));
    lookCam(V(X + lerp(1.4, 0.8, k), lerp(3.4, 3.2, k), lerp(7.6, 6.4, k)), V(X, 2.35, 0), 48);
    const torso = scr(V(X, 1.7, 0.2));
    shiverMarks(t, torso.x, torso.y, shv * pop(t, 33.6, 37.9).o, 250);
    const mg = pop(t, 34.54, 38.2);
    ov.tag('mg', 'MENGGIGIL', { x: 290, y: 400, o: mg.o, s: mg.s, r: -4 }, { bg: BLUE });
    const ot = pop(t, 35.62, 38.2);
    ov.tag('otot', 'OTOT BERGERAK', { x: 640, y: 540, o: ot.o, s: ot.s, r: 3 }, { bg: PURPLE, small: true });
    const hb = pop(t, 37.54, 38.2, { from: 2 });
    ov.bubble('haba', 'HABA!', { x: W / 2, y: 1210, o: hb.o, s: hb.s, r: -4 }, { size: 160, top: '#ffd36b', bot: '#ff5a3d' });
    const glowA = clamp((t - 35.8) / 1.0);
    if (glowA > 0) {
      const g = ov.g;
      const c = scr(V(X, 2.0, 0));
      const gr = g.createRadialGradient(c.x, c.y, 50, c.x, c.y, 620);
      gr.addColorStop(0, `rgba(255,150,60,${0.32 * glowA})`);
      gr.addColorStop(1, 'rgba(255,150,60,0)');
      g.fillStyle = gr;
      g.fillRect(0, 0, W, H);
      heatWaves(t, c.x, c.y - 470, glowA, { n: 3, spread: 120, h: 160 });
    }
    return body;
  }],
  // S10 — warm body helps the white blood cells (body's soldiers) fight germs
  [38.25, 45.05, (t) => {
    hideStage();
    stageLight(B);
    const charge = clamp((t - 42.9) / 1.6);
    battle(t, { charge, cheer: keys(t, [[39.9, 0], [40.2, 1], [41.4, 1], [41.8, 0]]) });
    body.hemi.color.setRGB(1, 0.84, 0.74);
    const k = easeInOut(inv(38.25, 45.05, t));
    lookCam(V(B + lerp(-0.9, -0.1, k), lerp(3.4, 3.0, k), lerp(12.5, 10.8, k)), V(B - 0.3, 2.7, 0), 50);
    tint('255,130,50', 0.1);
    const w0 = scr(body.wbcs[0].position.clone().add(V(0, 1.1, 0)));
    const ap = pop(t, 39.96, 41.2);
    ov.tag('askar', 'ASKAR BADAN', { x: clamp(w0.x, 260, 820), y: w0.y - 90, o: ap.o, s: ap.s }, { bg: '#4f7a3a' });
    const sd = pop(t, 41.28, 44.95);
    ov.tag('sdp', 'SEL DARAH PUTIH', { x: 330, y: 360, o: sd.o, s: sd.s, r: -3 }, { bg: PURPLE });
    const g0 = scr(body.germs[0].position.clone().add(V(0, 1.0, 0)));
    pinTag('kuman2', 'KUMAN', g0, t, 38.6, 42.9, { bg: GREEN, pointer: 'down', small: true }, -40);
    const lw = pop(t, 42.98, 44.95, { from: 2 });
    ov.bubble('lawan', 'LAWAN!', { x: W / 2, y: 520, o: lw.o, s: lw.s, r: -5 }, { size: 150, top: '#e2d9ff', bot: '#8a5cff' });
    if (charge > 0.5) {
      body.germs.forEach((gm, i) => {
        const p = scr(gm.position);
        const a = clamp((charge - 0.5) / 0.1) * (1 - clamp((charge - 0.85) / 0.15));
        ov.star(p.x - 40, p.y - 20, 70 * a, a, ['#fff6c8', '#ffd84a', '#9fe0ff', '#ffb3d1'][i], t * 3);
      });
    }
    const hp = pop(t, 38.3, 40.0);
    ov.html('th3', SVG.thermo(0.9), { x: 900, y: 360, o: hp.o, s: hp.s * 0.7, r: 10 });
    ov.tag('panas2', 'BADAN PANAS', { x: 600, y: 360, o: hp.o, s: hp.s }, { bg: RED, small: true });
    return body;
  }],
  // S11 — germs don't like the heat: they sweat, shrink and flee
  [45.05, 47.95, (t) => {
    hideStage();
    stageLight(B + 2.5);
    const hot = clamp((t - 45.2) / 0.6);
    battle(t, { charge: 1, hot, flee: easeInOut(clamp((t - 47.0) / 0.9)) });
    body.wbcs.forEach((w) => w.position.set(0, -50, 0));
    body.hemi.color.setRGB(1, 0.8, 0.68);
    const k = easeOut(inv(45.05, 47.95, t));
    lookCam(V(B + 2.3, lerp(3.0, 2.8, k), lerp(8.0, 6.8, k)), V(B + 2.1, 2.5, 0), 48);
    tint('255,110,40', 0.16);
    body.germs.forEach((gm, i) => {
      const p = scr(gm.position.clone().add(V(0, 0.9, 0)));
      heatWaves(t + i * 0.3, p.x, p.y, hot * 0.8, { n: 2, spread: 50, h: 90, w: 9 });
    });
    const q = pop(t, 45.96, 47.9);
    ov.bubble('taksuka', 'KUMAN TAK\nSUKA PANAS!', { x: W / 2, y: 430, o: q.o, s: q.s, r: -3 }, { size: 110, top: '#c8ff9a', bot: '#ff7a3d' });
    const th = pop(t, 45.2, 47.9);
    ov.html('th4', SVG.thermo(1), { x: 150, y: 1130 + Math.sin(t * 3) * 8, o: th.o, s: th.s * 0.8, r: -10 });
    return body;
  }],
  // S12 — the aha: a fever is a sign the body is fighting!
  [47.95, 53.3, (t) => {
    hideStage();
    stageLight(B);
    battle(t, { charge: 0, cheer: 1 });
    body.germs.forEach((g) => g.position.set(0, -50, 0));
    const wb = [[-2.6, 2.6, -1.4], [2.6, 2.9, -1.6], [-0.2, 4.6, -2.6]];
    body.wbcs.forEach((w, i) => {
      w.position.set(B + wb[i][0], wb[i][1] + 0.2 * Math.sin(t * 2 + i), wb[i][2]);
      w.rotation.set(0, -wb[i][0] * 0.12, 0);
    });
    const ax = B;
    body.aff.root.position.set(ax, 0, 0.8);
    const jump = t > 48.14 && t < 48.75 ? Math.sin(((t - 48.14) / 0.61) * Math.PI) * 0.5 : 0;
    const up = keys(t, [[48.05, 0], [48.25, 1], [48.85, 1], [49.2, 0]]);
    const fist = keys(t, [[51.7, 0], [52.0, 1], [53.3, 1]]);
    stand(t, {
      blink: t > 48.1 && t < 49 ? 0 : blinkAt(t, 6), bob: jump, smile: 1,
      wow: keys(t, [[48.1, 0], [48.25, 1], [48.95, 1], [49.2, 0]]), brow: keys(t, [[48.1, 0], [48.25, 1], [50.5, 0.5]]),
      legL: { x: -0.25 * jump, knee: 0.6 * jump }, legR: { x: -0.25 * jump, knee: 0.6 * jump },
      armL: { reach: [lerp(0.6, 0.85, Math.max(up, fist)), lerp(0.3, 1.85, Math.max(up, fist)), lerp(0.2, 0.3, Math.max(up, fist))], pole: [1, -0.4, -0.5], thumb: 0 },
      armR: { reach: [lerp(-0.6, -0.85, up), lerp(0.3, 1.85, up), lerp(0.2, 0.3, up)], pole: [-1, -0.4, -0.5] },
    });
    body.hemi.color.setRGB(1, 0.92, 0.9);
    const k = easeOut(inv(47.95, 53.3, t));
    lookCam(V(ax + 0.1, lerp(3.2, 3.0, k), lerp(8.6, 7.2, k)), V(ax, 2.7, 0), 50);
    const head = scr(V(ax, 4.5 + jump, 0.8));
    const bl = pop(t, 48.3, 53.25);
    ov.html('bulb', ICONS.bulb(), { x: head.x + 260, y: head.y - 70 + Math.sin(t * 5) * 8, o: bl.o, s: bl.s * 0.7, r: 10 });
    const sh = pop(t, 50.86, 53.25, { from: 2 });
    ov.html('shield', SVG.shield(), { x: 190, y: 640 + Math.sin(t * 3) * 8, o: sh.o, s: sh.s * 0.75, r: -8 });
    const bb = pop(t, 51.88, 53.25, { fin: 0.4, from: 2 });
    ov.bubble('berlawan', 'BADAN SEDANG\nBERLAWAN!', { x: W / 2, y: 1130, o: bb.o, s: bb.s }, { size: 120, top: '#c9ffe0', bot: '#2fbf71' });
    ov.sparkles(t, { n: 30, seed: 12, y: 250, h: 900, a: inv(48.2, 48.6, t) });
    return body;
  }],
  // S13 — back in bed: tell Mama & Papa, drink water, rest
  [53.3, 60.4, (t) => {
    room.blush(0.6);
    const sip = keys(t, [[56.6, 0], [57.0, 1], [58.4, 1], [58.75, 0]]);
    room.handGlass.visible = false;
    const wave = keys(t, [[54.9, 0], [55.2, 1], [56.2, 1], [56.5, 0]]);
    const rest = keys(t, [[58.8, 0], [59.4, 1]]);
    const w = POSES.waveR(t).armR;
    const drink = { reach: [-0.18, 1.28, 0.7], pole: [-1, -0.6, 0], wx: -0.3 };
    let armR = restArms.armR;
    if (wave > 0) armR = mixArm(restArms.armR, { ...w, reach: [w.reach[0] * -1 + 0.0, w.reach[1], w.reach[2]] }, wave);
    if (sip > 0) armR = mixArm(restArms.armR, drink, sip);
    bedAffan(t, {
      armR, armL: wave > 0 ? mixArm(restArms.armL, { reach: [0.75, 1.55, 0.35 + Math.sin(t * 10) * 0.12], pole: [1, -0.5, -0.4] }, wave) : restArms.armL,
      lean: lerp(-0.1, -0.3, rest), smile: 0.9, brow: 0.3,
      headYaw: wave * 0.5, headPitch: lerp(0, -0.12, rest) - sip * 0.15, lookX: wave * 0.6,
      talk: sip > 0.6 ? 0 : talk(t),
    });
    // the glass travels from the bedside table to Affan's hand and back
    room.aff.root.updateMatrixWorld(true);
    const hw = room.aff.parts.arms.R.hand.getWorldPosition(V(0, 0, 0));
    const lift = clamp(sip * 1.6 - 0.3);
    room.tableGlass.position.copy(V(2.55, 1.5, -1.95).lerp(hw.add(V(0.05, -0.1, 0.22)), lift));
    room.tableGlass.rotation.x = 0.35 * lift;
    const k = easeInOut(inv(53.3, 60.4, t));
    lookCam(V(lerp(1.8, 1.2, k), lerp(4.6, 4.3, k), lerp(5.4, 4.6, k)), V(0.1, 2.8, -1.0), 46);
    ov.flash((1 - inv(53.3, 53.6, t)) * 0.9, '255,230,200');
    const tp = pop(t, 53.32, 60.35);
    ov.tag('tips', 'KALAU DEMAM:', { x: W / 2, y: 900, o: tp.o, s: tp.s }, { bg: '#2f7bff', small: true });
    card('c1', SVG.heart(), 'BERITAHU MAMA PAPA', 1010, t, 54.98, 56.3);
    card('c2', SVG.glass(), 'MINUM AIR', 1145, t, 56.78, 58.0);
    card('c3', SVG.zzz(), 'REHAT CUKUP', 1280, t, 58.94, 59.8);
    return room;
  }],
  // S14 — thumbs-up, then "what shall we learn next?"
  [60.4, 67.45, (t) => {
    room.blush(0.35);
    room.handGlass.visible = false;
    room.tableGlass.visible = true;
    room.tableGlass.position.set(2.55, 1.5, -1.95);
    room.tableGlass.rotation.x = 0;
    const th = keys(t, [[60.5, 0], [60.85, 1], [64.6, 1], [64.95, 0]]);
    const tk = keys(t, [[64.95, 0], [65.35, 1], [67.45, 1]]);
    const upA = POSES.thumbsUpR.armR, th2 = POSES.thinkR.armR;
    let armR = restArms.armR;
    if (th > 0) armR = mixArm(restArms.armR, upA, th);
    else if (tk > 0) armR = mixArm(restArms.armR, th2, tk);
    bedAffan(t, {
      armR, smile: 1, brow: 0.3 + 0.4 * tk, headYaw: 0.05 * wobble(t, 2),
      headRoll: -0.12 * tk, lookX: 0.35 * tk, lookY: 0.4 * tk, headPitch: -0.08 * tk,
    });
    const k = easeInOut(inv(60.4, 67.45, t));
    lookCam(V(lerp(0.9, 0.6, k), lerp(3.9, 3.75, k), lerp(3.4, 2.4, k)), V(0, 3.15, -1.3), 46);
    if (th > 0.5) {
      const hand = scr(room.aff.parts.arms.R.hand.getWorldPosition(V(0, 0, 0)));
      ov.sparkles(t, { n: 12, seed: 33, x: hand.x - 160, y: hand.y - 200, w: 320, h: 300, a: inv(60.9, 61.3, t) * (1 - inv(64.3, 64.7, t)), size: 30 });
    }
    const head = scr(HEAD);
    [[65.2, -260, -230, '#ffcf33', -12], [65.5, 250, -280, '#3fa2ff', 10], [65.8, 300, -60, '#ffcf33', 14]].forEach(([a, dx, dy, c, r], i) => {
      const q = pop(t, a, 67.4);
      ov.html('q' + i, ICONS.qmark(c), { x: head.x + dx, y: head.y + dy + Math.sin(t * 3 + i) * 10, o: q.o, s: q.s * 0.85, r });
    });
    return room;
  }],
  // Outro — The Curious Affan logo
  [67.45, DURATION, (t) => {
    const k = easeOut(inv(67.45, 68.15, t));
    const th2 = POSES.thinkR.armR;
    outro.aff.pose({ ...POSES.thinkR, armR: { ...th2 }, smile: 1, blink: blinkAt(t, 9), headRoll: -0.08, lookX: 0.25, lookY: 0.15, headYaw: 0.08 });
    lookCam(V(0, 2.6, lerp(7.5, 5.4, k)), V(0, 2.3, 0), 40);
    const hc = scr(V(0, 2.95, 0));
    ov.flash((1 - inv(67.45, 67.8, t)) * 1.0);
    const g = ov.g;
    const ra = inv(67.55, 68.15, t);
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
    const ic = pop(t, 68.05, 99);
    ov.html('oBulb', ICONS.bulb(), { x: 175, y: 470 + Math.sin(t * 2) * 8, o: ic.o, s: ic.s * 0.55, r: -10 });
    ov.html('oQ1', ICONS.qmark('#ffcf33'), { x: 880, y: 420 + Math.sin(t * 2 + 1) * 8, o: ic.o, s: ic.s * 0.9, r: 12 });
    ov.html('oTh', SVG.thermo(0.75), { x: 200, y: 740 + Math.sin(t * 2 + 2) * 8, o: ic.o, s: ic.s * 0.6, r: -12 });
    const l1 = pop(t, 67.75, 99), l2 = pop(t, 67.95, 99), l3 = pop(t, 68.15, 99);
    drawLogo(ov, { k: [l1, l2, l3], star: pop(t, 68.35, 99) });
    return outro;
  }],
];

function frame(t) {
  ov.begin();
  cam.aspect = W / H;
  cam.updateProjectionMatrix();
  const shot = SHOTS.find(([a, b]) => t >= a && t < b) || SHOTS[SHOTS.length - 1];
  body.cells.userData.update(t);
  const world = shot[2](t);
  if (world.sky) world.sky.position.copy(cam.position);
  renderer.render(world.scene, cam);
  if (world !== outro) ov.vignette(0.28);
  ov.captions(t, CAPTIONS, KEYWORDS);
  ov.end();
}

// Cover / thumbnail (9:16): feverish Affan in bed, hands on hot cheeks, with
// a big title, thermometer, episode badge and the series logo. No captions.
// Key elements stay inside the centre 3:4 area (y 240-1680).
const THUMB = { cam: [0.7, 4.1, 4.6], look: [0, 2.85, -1.3], fov: 46 };
window.setThumb = (o) => Object.assign(THUMB, o);
function thumbnail() {
  ov.begin();
  cam.aspect = W / H;
  cam.updateProjectionMatrix();
  const t = 7.5;
  room.blush(1);
  room.handGlass.visible = false;
  room.tableGlass.visible = true;
  bedAffan(t, { ...cheeks, blink: 0, talk: 0, wow: 0.8, brow: 1, smile: 0.2, headYaw: 0.05, headPitch: 0.02, lookX: 0, lookY: 0.05 });
  lookCam(V(...THUMB.cam), V(...THUMB.look), THUMB.fov);
  renderer.render(room.scene, cam);
  const g = ov.g;
  const top = g.createLinearGradient(0, 0, 0, 760);
  top.addColorStop(0, 'rgba(23,37,107,0.75)');
  top.addColorStop(1, 'rgba(23,37,107,0)');
  g.fillStyle = top;
  g.fillRect(0, 0, W, 760);
  const bot = g.createLinearGradient(0, H - 900, 0, H);
  bot.addColorStop(0, 'rgba(23,37,107,0)');
  bot.addColorStop(1, 'rgba(23,37,107,0.75)');
  g.fillStyle = bot;
  g.fillRect(0, H - 900, W, 900);
  ov.vignette(0.25);
  ov.tag('thBadge', 'EPISOD 25', { x: W / 2, y: 300 }, { bg: '#2f7bff', small: true });
  ov.bubble('thTitle', 'KENAPA BADAN\nPANAS KALAU DEMAM?', { x: W / 2, y: 470, r: -2 }, { size: 86, top: '#ffe45c', bot: '#ff7a3d' });
  ov.html('thT', SVG.thermo(0.9), { x: 900, y: 860, r: 14, s: 1.0 });
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
