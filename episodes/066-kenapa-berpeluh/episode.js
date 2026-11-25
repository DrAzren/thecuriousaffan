// THE CURIOUS AFFAN — Episode 066: "Kenapa Kita Berpeluh?"
// Every shot is a pure function of time t (seconds), synced to audio/narration.mp3.
import * as THREE from 'three';
import { makeRenderer, loadEnvelope, toScreen, clamp, lerp, inv, easeOut, easeIn, easeInOut, keys, W, H } from '../../shared/core.js';
import { POSES, blinkAt } from '../../shared/affan.js';
import { Overlay, pop, ICONS, drawLogo } from '../../shared/overlay.js';
import { CAPTIONS, KEYWORDS } from './captions.js';
import { buildPark66, buildLab, buildOutro, A_PK, BODY_AT, SKIN_AT } from './worlds.js';

const FPS = 30;
const DURATION = 48.15;
const OUTRO = 45.0;

const stage = document.getElementById('stage');
const canvas = document.createElement('canvas');
stage.appendChild(canvas);
const renderer = makeRenderer(canvas);
const ov = new Overlay(stage);
const park = buildPark66();
const lab = buildLab();
const outro = buildOutro();
const cam = new THREE.PerspectiveCamera(50, W / H, 0.05, 6000);
let env = { at: () => 0 };

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const talk = (t) => clamp(env.at(t) * 1.2);
const scr = (p) => toScreen(p, cam);
const mix3 = (a, b, k) => a.map((v, i) => lerp(v, b[i], k));
const sm = (a, b, t) => easeInOut(inv(a, b, t));
const BLUE = '#2f9bff', ORANGE = '#ff8a3d', PURPLE = '#7a5cf0', GREEN = '#2fbf5f', PINK = '#ff5c9a', RED = '#ff4d5e', GOLD = '#d8a020';
const SWEAT = { top: '#eaf6ff', bot: '#4aa8ff' };
const HOT = { top: '#fff0e6', bot: '#ff6b4a' };

function lookCam(pos, look, fov = 50) {
  cam.position.copy(pos);
  cam.fov = fov;
  cam.updateProjectionMatrix();
  cam.lookAt(look);
  cam.updateMatrixWorld(true);
}
function camMove(t, a, b, p0, l0, p1, l1, fov = 50, ease = easeInOut) {
  const k = ease(inv(a, b, t));
  lookCam(V(...mix3(p0, p1, k)), V(...mix3(l0, l1, k)), fov);
}
function pinTag(id, text, p, t, a, b, style, dy = -90) {
  const q = pop(t, a, b);
  if (q.o <= 0 || !p.visible) return;
  ov.tag(id, text, { x: clamp(p.x, 300, 780), y: clamp(p.y + dy, 300, 1380), o: q.o, s: q.s }, style);
}
function bubble(id, text, t, a, b, y = 430, size = 120, style = {}, r = -2) {
  const q = pop(t, a, b, { from: 2 });
  if (q.o > 0) ov.bubble(id, text, { x: W / 2, y, o: q.o, s: q.s, r }, { size, ...style });
}
function topTag(id, text, t, a, b, bg, y = 330) {
  const q = pop(t, a, b);
  if (q.o > 0) ov.tag(id, text, { x: W / 2, y, o: q.o, s: q.s }, { bg, small: true });
}
function qmarks(t, head, a, b, list) {
  list.forEach(([t0, dx, dy, c, r], i) => {
    const q = pop(t, t0, b);
    if (q.o > 0 && t >= a) ov.html('qm' + i, ICONS.qmark(c), { x: clamp(head.x + dx, 110, 970), y: head.y + dy + Math.sin(t * 3 + i) * 10, o: q.o, s: q.s * 0.8, r });
  });
}

// =================================================================== park
const affHead = () => park.aff.parts.head.getWorldPosition(V());
const front = (d, side = 0.35) => affHead().add(V(side, 0.1, d));
// sweat drops slide down the face (k 0..1 how sweaty)
function sweatSet(t, k) {
  park.drops.forEach((d, i) => {
    const u = d.userData;
    const ph = (t * 0.35 + u.ph) % 1;
    d.visible = k > 0.05 && i < 2 + Math.round(3 * k);
    d.position.y = u.y0 - ph * 0.35;
    d.scale.setScalar(0.26 * (0.6 + 0.5 * k) * (ph < 0.1 ? ph / 0.1 : 1));
  });
}
// run 0..1: running in place (legs and arms swing, body bobs)
function parkAff(t, p = {}, run = 0) {
  const a = park.aff;
  const sw = Math.sin(t * 12) * run;
  a.root.position.copy(A_PK);
  a.pose({
    yaw: 0.15, blink: blinkAt(t, 1), talk: talk(t), smile: 0.9,
    bob: 0.12 * Math.abs(Math.sin(t * 12)) * run, lean: 0.15 * run,
    legL: { x: -0.7 * sw, knee: 0.9 * Math.max(0, sw) }, legR: { x: 0.7 * sw, knee: 0.9 * Math.max(0, -sw) },
    ...(run > 0 ? { armL: { x: 0.8 * sw, z: 0.2, el: -1.2 }, armR: { x: -0.8 * sw, z: -0.2, el: -1.2 } } : {}),
    ...p,
  });
  a.root.updateMatrixWorld(true);
}
function bottleSet(on) {
  park.bottle.visible = on;
  if (!on) return;
  const h = park.aff.parts.arms.R.hand.getWorldPosition(V());
  park.bottle.position.copy(h).add(V(0, 0.15, 0.05));
  park.bottle.rotation.set(-0.9, 0, 0.3);
}
function parkSet(t) {
  park.setNight(t, 0);
  park.sunG.position.copy(cam.position);
  park.dog.pant(t, 1);
}

// ==================================================================== lab
function bodySet(t, { temp = 0.5, hot = 0, cool = 0, sun = 0, run = 0 } = {}) {
  lab.setTemp(temp);
  lab.hot.material.opacity = 0.75 * hot * (0.85 + 0.15 * Math.sin(t * 6));
  lab.cool.material.opacity = 0.7 * cool;
  lab.sun.visible = sun > 0.01;
  lab.sun.scale.setScalar(Math.max(0.01, sun) * (1 + 0.05 * Math.sin(t * 4)));
  lab.rays.rotation.z = t * 0.6;
  const a = lab.aff;
  const sw = Math.sin(t * 12) * run;
  a.pose({
    yaw: 0.25, blink: blinkAt(t, 3), talk: 0, smile: 0.9 - 0.5 * hot, brow: -0.3 * hot,
    bob: 0.15 * Math.abs(Math.sin(t * 12)) * run, lean: 0.15 * run,
    legL: { x: -0.7 * sw, knee: 0.9 * Math.max(0, sw) }, legR: { x: 0.7 * sw, knee: 0.9 * Math.max(0, -sw) },
    ...(run > 0 ? { armL: { x: 0.8 * sw, z: 0.2, el: -1.2 }, armR: { x: -0.8 * sw, z: -0.2, el: -1.2 } } : {}),
  });
}
// sweat: up (0..1 sweat climbs the ducts and pools on the skin), dry (0..1 drops shrink, vapour and heat rise)
function skinSet(t, { up = 0, dry = 0 } = {}) {
  lab.glands.forEach((g, gi) => {
    g.blobs.forEach((b, i) => {
      const ph = (t * 0.6 + i / 3 + gi * 0.2) % 1;
      b.visible = up > 0.02 && up < 1.0;
      b.position.copy(g.duct.getPoint(ph));
    });
    const s = clamp(up * 1.2) * (1 - dry);
    g.drop.visible = s > 0.02;
    g.drop.scale.setScalar(0.5 * Math.max(0.01, s));
  });
  lab.vapour.forEach((v, i) => {
    const u = v.userData;
    const g = lab.glands[u.g];
    const ph = (t * 0.45 + u.ph) % 1;
    const on = dry > 0.02;
    v.visible = on;
    v.position.set(g.gx + 0.3 + 0.3 * Math.sin(ph * 6 + i), 4.7 + ph * 2.8, 1.5);
    v.scale.setScalar(0.4 + ph * 0.8);
    v.material.opacity = 0.8 * Math.sin(ph * Math.PI) * clamp(dry * 2);
    const h = lab.heat[i];
    h.visible = on && dry < 1.2;
    h.position.copy(v.position).add(V(0.25, -0.3, 0.1));
    h.scale.setScalar(Math.sin(ph * Math.PI) * clamp(dry * 2));
  });
}

// ================================================================== SHOTS
const SHOTS = [
  // S1 — the park on a hot day: Affan, out of breath and sweaty
  [0, 2.14, (t) => {
    parkSet(t);
    sweatSet(t, 0.8);
    parkAff(t, { talk: 0, headPitch: -0.05, mouth: 0 }, 0);
    camMove(t, 0, 2.14, [A_PK.x + 1.2, 2.2, A_PK.z + 6.2], [A_PK.x, 1.4, A_PK.z], [A_PK.x + 1.0, 2.0, A_PK.z + 5.2], [A_PK.x, 1.4, A_PK.z], 50);
    const q = pop(t, 0.4, 2.1);
    ov.tag('ep', 'EPISOD 66', { x: W / 2, y: 268, o: q.o, s: q.s }, { bg: '#2f7bff', small: true });
    return park;
  }],
  // S2 — "Papa! Lepas main kejar-kejar, baju Affan basah dengan peluh!"
  [2.14, 6.72, (t) => {
    parkSet(t);
    const run = keys(t, [[3.0, 0], [3.2, 1], [4.6, 1], [4.8, 0]]);
    sweatSet(t, 0.6 + 0.4 * sm(4.7, 5.3, t));
    parkAff(t, { headPitch: 0.05, wow: t > 4.8 ? 0 : 0 }, run);
    camMove(t, 2.14, 6.72, front(3.6).toArray(), affHead().add(V(0, -0.5, 0)).toArray(), front(2.9).toArray(), affHead().add(V(0, -0.4, 0)).toArray(), 46);
    const pp = pop(t, 2.16, 3.04, { from: 2 });
    ov.bubble('papa', 'PAPA!', { x: 800, y: 470, o: pp.o, s: pp.s * 0.8, r: 6 }, { size: 110 });
    topTag('kejar', 'MAIN KEJAR-KEJAR 🏃', t, 3.1, 4.7, ORANGE);
    bubble('basah', 'BASAH DENGAN\nPELUH!', t, 5.2, 6.7, 430, 110, SWEAT);
    return park;
  }],
  // S3 — "Kenapa kita berpeluh?"
  [6.72, 8.28, (t) => {
    parkSet(t);
    sweatSet(t, 1);
    parkAff(t, { ...POSES.thinkR, brow: -0.3, smile: 0.5 });
    const ah = affHead();
    lookCam(front(3.3), ah.clone().add(V(0, -0.35, 0)), 46);
    const hd = scr(ah.clone().add(V(0, 0.45, 0)));
    qmarks(t, hd, 6.74, 8.26, [[6.8, -260, 80, '#ffcf33', -12], [7.1, 250, 40, '#3fa2ff', 10], [7.4, 280, 220, '#ffcf33', 14]]);
    bubble('kenapa', 'KENAPA KITA\nBERPELUH?', t, 6.8, 8.26, 430, 110, SWEAT);
    return park;
  }],
  // S4 — "Jom ikut Affan cari jawapan!"
  [8.28, 10.14, (t) => {
    parkSet(t);
    sweatSet(t, 1);
    const up = keys(t, [[8.3, 0], [8.55, 1], [9.3, 1], [9.6, 0.6]], easeOut);
    parkAff(t, { smile: 1, brow: 0.6, armR: { reach: [lerp(-0.6, -0.55, up), lerp(0.25, 1.95 + 0.06 * Math.sin(t * 14), up), lerp(0.2, 0.35, up)], pole: [-1, -0.3, -0.5] } });
    const ah = affHead();
    const k = easeIn(inv(9.4, 10.14, t));
    lookCam(front(3.3).lerp(ah.clone().add(V(0.6, 0.1, 0.5)), k), ah.clone().add(V(0, -0.35, 0)).lerp(ah.clone().add(V(0.6, 0.15, -0.5)), k), 46);
    ov.swirl(t, W / 2, 820, inv(8.4, 10.0, t));
    ov.flash(inv(9.8, 10.14, t) ** 2, '255,246,236');
    return park;
  }],
  // S5 — our body likes a steady temperature, about 37 degrees
  [10.14, 15.0, (t) => {
    bodySet(t, { temp: 0.5 });
    camMove(t, 10.14, 15.0, BODY_AT.clone().add(V(0.5, 2.6, 9.4)).toArray(), BODY_AT.clone().add(V(0.5, 2.2, 0)).toArray(), BODY_AT.clone().add(V(0.4, 2.5, 8.6)).toArray(), BODY_AT.clone().add(V(0.5, 2.2, 0)).toArray(), 50);
    ov.flash(1 - inv(10.14, 10.5, t));
    topTag('badan', 'BADAN KITA', t, 10.2, 11.3, ORANGE);
    topTag('tetap', 'SUKA SUHU YANG TETAP', t, 11.34, 15.0, GREEN);
    pinTag('t37', '37°C', scr(lab.thermo.localToWorld(lab.mark37.clone())), t, 12.62, 14.98, { bg: GREEN, pointer: 'left' }, 0);
    return lab;
  }],
  // S6 — running or hot weather: the body gets too hot
  [15.0, 19.84, (t) => {
    const k = sm(15.1, 18.2, t);
    bodySet(t, { temp: 0.5 + 0.4 * k, hot: k, sun: sm(16.2, 16.9, t), run: keys(t, [[15.1, 0], [15.4, 1], [16.1, 1], [16.4, 0]]) });
    lookCam(BODY_AT.clone().add(V(0.4, 3.0, 9.6)), BODY_AT.clone().add(V(0.2, 2.6, 0)), 50);
    topTag('lari', 'BERLARI 🏃', t, 15.04, 16.16, ORANGE);
    topTag('cuaca', 'CUACA PANAS ☀️', t, 16.18, 17.76, ORANGE);
    bubble('panas', 'TERLALU\nPANAS!', t, 17.8, 19.82, 1180, 110, HOT);
    return lab;
  }],
  // S7 — sweat glands in the skin push water out onto the skin
  [19.84, 23.48, (t) => {
    skinSet(t, { up: sm(21.3, 22.9, t) });
    camMove(t, 19.84, 23.48, SKIN_AT.clone().add(V(0, 3.6, 13.2)).toArray(), SKIN_AT.clone().add(V(0, 2.8, 0)).toArray(), SKIN_AT.clone().add(V(0.3, 3.6, 12.0)).toArray(), SKIN_AT.clone().add(V(0, 2.9, 0)).toArray(), 50);
    ov.flash(1 - inv(19.84, 20.15, t));
    topTag('kulitT', 'KULIT KITA (DIBESARKAN)', t, 19.9, 23.46, ORANGE);
    pinTag('kelenjar', 'KELENJAR PELUH', scr(SKIN_AT.clone().add(V(0, 1.6, 1.6))), t, 19.9, 23.46, { bg: PURPLE, pointer: 'down' }, -40);
    pinTag('airK', 'AIR KE ATAS KULIT', scr(SKIN_AT.clone().add(V(2.5, 4.9, 1.5))), t, 21.94, 23.46, { bg: BLUE, pointer: 'down' }, -40);
    return lab;
  }],
  // S8 — when sweat dries it carries heat away
  [23.48, 27.32, (t) => {
    skinSet(t, { up: 1, dry: sm(23.8, 26.8, t) });
    lookCam(SKIN_AT.clone().add(V(0.3, 4.4, 12.0)), SKIN_AT.clone().add(V(0, 4.0, 0)), 50);
    topTag('kering', 'PELUH KERING...', t, 23.52, 25.36, GOLD);
    bubble('haba', 'BAWA HABA\nKELUAR!', t, 25.38, 27.3, 1180, 110, HOT);
    return lab;
  }],
  // S9 — the body cools back down
  [27.32, 29.3, (t) => {
    const k = sm(27.4, 28.6, t);
    bodySet(t, { temp: 0.9 - 0.4 * k, hot: 1 - k, cool: k });
    lookCam(BODY_AT.clone().add(V(0.4, 2.6, 8.8)), BODY_AT.clone().add(V(0.4, 2.3, 0)), 50);
    ov.flash(1 - inv(27.32, 27.6, t));
    bubble('sejuk', 'SEJUK\nSEMULA!', t, 27.4, 29.28, 1180, 110, SWEAT);
    return lab;
  }],
  // S10 — "Tahu tak? Anjing tak banyak berpeluh... menjelirkan lidah"
  [29.3, 36.56, (t) => {
    parkSet(t);
    parkAff(t, { yaw: -0.5, talk: 0, headYaw: -0.3 });
    sweatSet(t, 0.3);
    const dh = park.dog.head.getWorldPosition(V());
    camMove(t, 29.3, 36.56, dh.clone().add(V(0.9, 0.35, 2.6)).toArray(), dh.clone().add(V(0, -0.35, 0)).toArray(), dh.clone().add(V(0.6, 0.2, 2.0)).toArray(), dh.clone().add(V(0, -0.25, 0)).toArray(), 46);
    ov.flash(1 - inv(29.3, 29.6, t));
    topTag('tahu', 'TAHU TAK?', t, 29.34, 30.6, ORANGE);
    topTag('anjing', 'ANJING TAK BANYAK BERPELUH', t, 30.64, 32.6, PURPLE);
    pinTag('lidah', 'MENJELIRKAN LIDAH 👅', scr(park.dog.tongue.getWorldPosition(V())), t, 33.22, 36.54, { bg: PINK, pointer: 'up' }, 110);
    bubble('sejukkan', 'UNTUK SEJUKKAN\nBADAN!', t, 34.8, 36.54, 430, 100, SWEAT);
    return park;
  }],
  // S11 — "Waaah, rupanya peluh tu penyejuk badan kita! Jangan lupa minum banyak air, ya."
  [36.56, 42.8, (t) => {
    parkSet(t);
    sweatSet(t, 0.4);
    const dk = keys(t, [[40.5, 0], [41.0, 1], [42.2, 1], [42.7, 0]]);
    const ah0 = affHead();
    const mouth = ah0.clone().add(V(0.15, -0.35, 0.75));
    const rest = park.aff.root.localToWorld(V(-0.5, 0.8, 0.6));
    const p = dk > 0 ? { armR: { reach: park.aff.toTorso(rest.clone().lerp(mouth, dk)), pole: [-1, -0.6, -0.3] }, headPitch: -0.15 * dk } : {};
    parkAff(t, { wow: keys(t, [[36.56, 0], [36.7, 1], [37.2, 1], [37.4, 0]]), smile: 1, brow: 0.6, talk: dk > 0.7 ? 0 : talk(t), ...p });
    bottleSet(t > 40.3);
    const ah = affHead();
    lookCam(front(3.3), ah.clone().add(V(0, -0.35, 0)), 46);
    const hd = scr(ah.clone().add(V(0, 0.5, 0)));
    const b = pop(t, 36.6, 40.4);
    ov.html('bulb', ICONS.bulb(), { x: clamp(hd.x + 230, 150, 900), y: clamp(hd.y - 150, 300, 900) + Math.sin(t * 5) * 8, o: b.o, s: b.s * 0.6, r: 10 });
    ov.sparkles(t, { n: 30, seed: 12, y: 250, h: 900, a: inv(36.6, 36.9, t) * (1 - inv(39.9, 40.4, t)) });
    bubble('penyejuk', 'PELUH = PENYEJUK\nBADAN KITA!', t, 37.5, 40.46, 430, 98, SWEAT);
    bubble('minum', 'MINUM BANYAK\nAIR, YA!', t, 40.52, 42.78, 430, 110, { top: '#eaf6ff', bot: '#2f9bff' });
    return park;
  }],
  // S12 — "Apa lagi kita nak belajar lepas ni?"
  [42.8, OUTRO, (t) => {
    parkSet(t);
    sweatSet(t, 0.2);
    bottleSet(false);
    const tk = keys(t, [[42.82, 0], [43.2, 1]]);
    const th2 = POSES.thinkR.armR;
    parkAff(t, { smile: 1, brow: 0.3 + 0.4 * tk, headRoll: -0.12 * tk, lookX: 0.35 * tk, lookY: 0.4 * tk, headPitch: -0.08 * tk, armR: { reach: mix3([-0.55, 0.3, 0.2], th2.reach, tk), pole: th2.pole, point: tk, wx: th2.wx * tk } });
    const ah = affHead();
    lookCam(front(3.3), ah.clone().add(V(0, -0.35, 0)), 46);
    const hd = scr(ah.clone().add(V(0, 0.45, 0)));
    qmarks(t, hd, 42.8, OUTRO - 0.05, [[42.85, -260, -100, '#ffcf33', -12], [43.15, 250, -160, '#3fa2ff', 10], [43.45, 300, 60, '#ffcf33', 14]]);
    return park;
  }],
  // Outro — The Curious Affan logo
  [OUTRO, DURATION, (t) => {
    const k = easeOut(inv(OUTRO, OUTRO + 0.7, t));
    outro.aff.root.position.set(0, 0, 0);
    outro.aff.pose({ ...POSES.thinkR, smile: 1, blink: blinkAt(t, 9), headRoll: -0.08, lookX: 0.25, lookY: 0.15, headYaw: 0.08 });
    lookCam(V(0, 2.6, lerp(7.5, 5.4, k)), V(0, 2.3, 0), 40);
    const hc = scr(V(0, 2.95, 0));
    ov.flash(1 - inv(OUTRO, OUTRO + 0.35, t));
    const g = ov.g;
    const ra = inv(OUTRO + 0.1, OUTRO + 0.7, t);
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
    const ic = pop(t, OUTRO + 0.6, 99);
    ov.html('oBulb', ICONS.bulb(), { x: 175, y: 470 + Math.sin(t * 2) * 8, o: ic.o, s: ic.s * 0.55, r: -10 });
    ov.html('oQ1', ICONS.qmark('#ffcf33'), { x: 880, y: 420 + Math.sin(t * 2 + 1) * 8, o: ic.o, s: ic.s * 0.9, r: 12 });
    ov.html('oQ2', ICONS.qmark('#2f6fff'), { x: 220, y: 720 + Math.sin(t * 2 + 2) * 8, o: ic.o, s: ic.s * 0.6, r: -12 });
    drawLogo(ov, { k: [pop(t, OUTRO + 0.3, 99), pop(t, OUTRO + 0.5, 99), pop(t, OUTRO + 0.7, 99)], star: pop(t, OUTRO + 0.9, 99) });
    return outro;
  }],
];

function frame(t) {
  ov.begin();
  cam.up.set(0, 1, 0);
  cam.aspect = W / H;
  cam.updateProjectionMatrix();
  const shot = SHOTS.find(([a, b]) => t >= a && t < b) || SHOTS[SHOTS.length - 1];
  const w = shot[2](t);
  if (w.sky) w.sky.position.copy(cam.position);
  if (w.sunG) w.sunG.position.copy(cam.position);
  renderer.setViewport(0, 0, W, H);
  renderer.render(w.scene, cam);
  if (w !== outro) ov.vignette(0.2);
  ov.captions(t, CAPTIONS, KEYWORDS);
  ov.end();
}

// Cover / thumbnail (9:16): the skin slice with sweat drying and heat leaving.
function thumbnail() {
  ov.begin();
  cam.aspect = W / H;
  cam.updateProjectionMatrix();
  skinSet(25.6, { up: 1, dry: 0.45 });
  lookCam(SKIN_AT.clone().add(V(0.3, 3.4, 10.2)), SKIN_AT.clone().add(V(0, 3.6, 0)), 50);
  lab.sky.position.copy(cam.position);
  renderer.setViewport(0, 0, W, H);
  renderer.render(lab.scene, cam);
  ov.vignette(0.3);
  ov.tag('thBadge', 'EPISOD 66', { x: W / 2, y: 300 }, { bg: '#2f7bff', small: true });
  ov.bubble('thTitle', 'KENAPA KITA', { x: W / 2, y: 445, r: -3 }, { size: 130, ...SWEAT });
  ov.bubble('thTitle2', 'BERPELUH?!', { x: W / 2, y: 600, r: 2 }, { size: 140, ...HOT });
  drawLogo(ov, { y: 1460, scale: 0.55 });
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
