// THE CURIOUS AFFAN — Episode 067: "Kenapa Pokok Semalu Kuncup?"
// Every shot is a pure function of time t (seconds), synced to audio/narration.mp3.
import * as THREE from 'three';
import { makeRenderer, loadEnvelope, toScreen, clamp, lerp, inv, easeOut, easeIn, easeInOut, keys, W, H } from '../../shared/core.js';
import { POSES, blinkAt } from '../../shared/affan.js';
import { Overlay, pop, ICONS, drawLogo } from '../../shared/overlay.js';
import { CAPTIONS, KEYWORDS } from './captions.js';
import { buildPark67, buildLeafLab, buildOutro, A_PK, BED_AT, BED_TOP } from './worlds.js';

const FPS = 30;
const DURATION = 50.85;
const OUTRO = 47.7;

const stage = document.getElementById('stage');
const canvas = document.createElement('canvas');
stage.appendChild(canvas);
const renderer = makeRenderer(canvas);
const ov = new Overlay(stage);
const park = buildPark67();
const lab = buildLeafLab();
const outro = buildOutro();
const cam = new THREE.PerspectiveCamera(50, W / H, 0.05, 6000);
let env = { at: () => 0 };

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const talk = (t) => clamp(env.at(t) * 1.2);
const scr = (p) => toScreen(p, cam);
const mix3 = (a, b, k) => a.map((v, i) => lerp(v, b[i], k));
const sm = (a, b, t) => easeInOut(inv(a, b, t));
const BLUE = '#2f9bff', ORANGE = '#ff8a3d', PURPLE = '#7a5cf0', GREEN = '#2fbf5f', PINK = '#ff5c9a', GOLD = '#d8a020';
const LEAFY = { top: '#efffe6', bot: '#4fbf5f' };

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
const YAW_BED = Math.atan2(BED_AT.x - A_PK.x, BED_AT.z - A_PK.z);
const TOUCH = park.leaves[3];
const touchPoint = () => TOUCH.leaflets[TOUCH.leaflets.length - 1].getWorldPosition(V());
function parkAff(t, p = {}) {
  const a = park.aff;
  a.root.position.copy(A_PK);
  a.pose({ yaw: 0.15, blink: blinkAt(t, 1), talk: talk(t), smile: 0.9, ...p });
  a.root.updateMatrixWorld(true);
}
// fold the bed's leaves: the touched one first, the others a moment later (k 0..1)
function bedSet(t, k = 0, slow = 0) {
  park.leaves.forEach((l, i) => {
    const d = l === TOUCH ? 0 : 0.15 + (i % 5) * 0.08 + slow;
    const f = clamp((k - d) / (1 - d));
    l.set({ fold: easeInOut(f), droop: easeInOut(clamp(f * 1.4 - 0.4)) * 0.6 });
  });
}
// Affan reaches out with one finger to the leaf (r 0..1)
function reach(r) {
  const a = park.aff;
  const tp = touchPoint();
  const rest = a.root.localToWorld(V(-0.6, 0.6, 0.5));
  return { armR: { reach: a.toTorso(rest.lerp(tp.clone().add(V(0.05, 0.08, 0.05)), r)), pole: [-1, -0.6, -0.3], point: r } };
}
function parkSet(t) {
  park.setNight(t, 0);
}

// ==================================================================== lab
const tipLeaflet = lab.big.leaflets.reduce((best, h) => (h.userData.k > best.userData.k ? h : best), lab.big.leaflets[0]);
const tipWorld = () => tipLeaflet.getWorldPosition(V());
const pillowWorld = () => lab.pillow.getWorldPosition(V());
// fold, droop, swell (pillow 1 full .. 0.6 soft), flow (0..1 water out), night (0..1)
function labSet(t, { fold = 0, droop = 0, swell = 1, flow = 0, night = 0 } = {}) {
  lab.big.set({ fold, droop: 0 });
  lab.pivot.rotation.z = -droop * 0.55;
  lab.cushion.scale.set(1.35 * swell, swell, swell);
  lab.drops.forEach((d) => {
    const u = d.userData;
    const out = clamp(flow * 1.5 - (u.i / lab.drops.length) * 0.5);
    d.position.copy(u.home).lerp(V(-0.6 - u.i * 0.12, -0.8 - u.i * 0.25, 0.2), out);
    d.position.x += 0.03 * Math.sin(t * 4 + u.i);
    d.visible = out < 0.98;
    d.scale.setScalar(1 - 0.5 * out);
  });
  // night
  lab.sky.material.uniforms.top.value.setHex(0xb8e8ff).lerp(new THREE.Color(0x0a1440), night);
  lab.sky.material.uniforms.bot.value.setHex(0xf2fff0).lerp(new THREE.Color(0x2a3a6a), night);
  lab.scene.background.setHex(0xe8f8e0).lerp(new THREE.Color(0x1a2450), night);
  lab.hemi.intensity = 1.15 - 0.6 * night;
  lab.key.intensity = 1.5 - 0.8 * night;
  lab.moon.visible = lab.moonGlow.visible = night > 0.05;
  lab.cat.root.visible = false;
  lab.finger.visible = false;
  lab.signal.material.opacity = 0;
  lab.spark.visible = false;
}
// the signal travels from the tip to the pillow (s 0..1)
function signalSet(t, s) {
  if (s <= 0 || s >= 1) return;
  const p = tipWorld().lerp(pillowWorld(), easeInOut(s));
  p.y += 0.25 * Math.sin(s * Math.PI * 6);
  lab.signal.position.copy(p).add(V(0, 0, 0.3));
  lab.signal.material.opacity = 0.95;
  lab.spark.visible = true;
  lab.spark.position.copy(p).add(V(0, 0, 0.35));
  lab.spark.rotation.set(0, t * 8, 0.4 * Math.sin(t * 20));
}
function fingerSet(t, k) {
  lab.finger.visible = k > 0;
  const tip = tipWorld();
  lab.finger.position.copy(tip).add(V(0.9 + 1.4 * (1 - k), 0.6, 0.6));
  lab.finger.rotation.set(0, 0, -0.6);
  return;
  lab.finger.rotation.set(0, 0, -0.25);
}
function catSet(t, k, fright) {
  const c = lab.cat;
  c.root.visible = true;
  // crawls along the ground towards the drooping leaf, then jumps back
  const x = lerp(3.4, 1.7, k) + 1.2 * easeOut(fright);
  c.root.position.set(x, 0.05 + 0.9 * Math.sin(Math.PI * clamp(fright * 1.5)), 2.2);
  c.root.rotation.set(0, Math.PI, 0.3 * fright);
  c.set(t, { crawl: k < 1 && fright === 0 ? 0.6 : 0 });
}

// ================================================================== SHOTS
const SHOTS = [
  // S1 — the park: Affan beside a garden bed of semalu
  [0, 2.18, (t) => {
    parkSet(t);
    bedSet(t, 0);
    parkAff(t, { yaw: YAW_BED * 0.6, headPitch: 0.3, talk: 0 });
    camMove(t, 0, 2.18, [A_PK.x + 1.4, 2.2, A_PK.z + 6.0], [A_PK.x - 0.5, 1.2, A_PK.z], [A_PK.x + 1.1, 2.0, A_PK.z + 5.0], [A_PK.x - 0.5, 1.2, A_PK.z], 50);
    const q = pop(t, 0.4, 2.15);
    ov.tag('ep', 'EPISOD 67', { x: W / 2, y: 268, o: q.o, s: q.s }, { bg: '#2f7bff', small: true });
    return park;
  }],
  // S2 — "Papa! Affan sentuh daun pokok semalu..."
  [2.18, 4.89, (t) => {
    parkSet(t);
    const r = sm(3.3, 4.3, t);
    bedSet(t, sm(4.4, 6.2, t) * 0.3);
    parkAff(t, { yaw: YAW_BED, headPitch: 0.45, lean: 0.25 * r, ...reach(r) });
    const mid = touchPoint().lerp(affHead(), 0.5);
    camMove(t, 2.18, 4.89, mid.clone().add(V(0.6, 0.3, 4.4)).toArray(), mid.clone().add(V(0, -0.15, 0)).toArray(), mid.clone().add(V(0.5, 0.2, 3.7)).toArray(), mid.clone().add(V(0, -0.15, 0)).toArray(), 50);
    const pp = pop(t, 2.2, 3.1, { from: 2 });
    ov.bubble('papa', 'PAPA!', { x: 800, y: 470, o: pp.o, s: pp.s * 0.8, r: 6 }, { size: 110 });
    pinTag('semalu', 'POKOK SEMALU', scr(BED_AT.clone().add(V(-0.3, BED_TOP + 0.35, 0))), t, 4.38, 4.87, { bg: GREEN, pointer: 'down' }, -40);
    return park;
  }],
  // S3 — "terus daun tu kuncup!" close on the bed
  [4.89, 6.98, (t) => {
    parkSet(t);
    bedSet(t, sm(4.4, 6.2, t));
    parkAff(t, { yaw: YAW_BED, headPitch: 0.45, wow: keys(t, [[5.5, 0], [5.7, 1], [6.9, 1]]), ...reach(1 - sm(5.6, 6.4, t)) });
    const b = BED_AT.clone().add(V(0, BED_TOP + 0.1, 0));
    camMove(t, 4.89, 6.98, b.clone().add(V(0.3, 0.8, 1.7)).toArray(), b.toArray(), b.clone().add(V(0.2, 0.65, 1.4)).toArray(), b.toArray(), 50);
    bubble('kuncup', 'DAUN KUNCUP!', t, 6.06, 6.96, 430, 120, LEAFY);
    return park;
  }],
  // S4 — "Pokok ni malu ke?"
  [6.98, 8.58, (t) => {
    parkSet(t);
    bedSet(t, 1);
    parkAff(t, { ...POSES.thinkR, brow: -0.3, smile: 0.5 });
    const ah = affHead();
    lookCam(front(3.3), ah.clone().add(V(0, -0.35, 0)), 46);
    const hd = scr(ah.clone().add(V(0, 0.45, 0)));
    qmarks(t, hd, 7.0, 8.56, [[7.05, -260, 80, '#ffcf33', -12], [7.35, 250, 40, '#3fa2ff', 10], [7.65, 280, 220, '#ffcf33', 14]]);
    bubble('malu', 'POKOK NI\nMALU KE?', t, 7.04, 8.56, 430, 120, { top: '#fff0f6', bot: '#ff7ab0' });
    return park;
  }],
  // S5 — "Jom ikut Affan cari jawapan!"
  [8.58, 10.56, (t) => {
    parkSet(t);
    bedSet(t, 1);
    const up = keys(t, [[8.6, 0], [8.85, 1], [9.6, 1], [9.9, 0.6]], easeOut);
    parkAff(t, { smile: 1, brow: 0.6, armR: { reach: [lerp(-0.6, -0.55, up), lerp(0.25, 1.95 + 0.06 * Math.sin(t * 14), up), lerp(0.2, 0.35, up)], pole: [-1, -0.3, -0.5] } });
    const ah = affHead();
    const k = easeIn(inv(9.6, 10.56, t));
    const b = BED_AT.clone().add(V(0, BED_TOP + 0.1, 0));
    lookCam(front(3.3).lerp(b.clone().add(V(0, 0.15, 0.3)), k), ah.clone().add(V(0, -0.35, 0)).lerp(b, k), 46);
    ov.swirl(t, W / 2, 820, inv(8.7, 10.4, t));
    ov.flash(inv(10.2, 10.56, t) ** 2, '240,255,236');
    return park;
  }],
  // S6 — at the base of every leaf there is a little pillow full of water
  [10.56, 15.34, (t) => {
    labSet(t);
    lab.drops.forEach((d, i) => d.scale.setScalar(1 + 0.25 * sm(14.0, 14.4, t) * Math.abs(Math.sin(t * 5 + i))));
    const pw = pillowWorld();
    camMove(t, 10.56, 15.34, [0.6, 3.4, 14.5], [0.5, 2.9, 0], pw.clone().add(V(1.0, 0.2, 5.2)).toArray(), pw.clone().add(V(0.6, -0.1, 0)).toArray(), 50);
    ov.flash(1 - inv(10.56, 10.9, t));
    topTag('daun', 'DAUN SEMALU (DIBESARKAN)', t, 10.62, 12.76, GREEN);
    pinTag('pangkal', 'PANGKAL DAUN', scr(pw.clone().add(V(0, 0.5, 0))), t, 10.78, 12.76, { bg: GREEN, pointer: 'down' }, -40);
    pinTag('bantal', 'BANTAL KECIL', scr(pw.clone().add(V(0, 0.5, 0))), t, 12.8, 15.32, { bg: '#6ab040', pointer: 'down' }, -40);
    bubble('penuh', 'PENUH\nDENGAN AIR!', t, 14.02, 15.32, 1180, 110, { top: '#eaf6ff', bot: '#4aa8ff' });
    return lab;
  }],
  // S7 — touch: a fast signal like a little lightning bolt; the water flows out
  [15.34, 22.1, (t) => {
    labSet(t, { flow: sm(19.6, 21.4, t), swell: 1 - 0.15 * sm(20.0, 21.6, t) });
    fingerSet(t, keys(t, [[15.4, 0], [15.9, 1], [16.4, 1], [16.9, 0]]));
    signalSet(t, inv(16.7, 18.5, t));
    if (t < 19.3) camMove(t, 15.34, 19.3, [0.6, 3.4, 14.5], [0.5, 2.9, 0], [0.5, 3.3, 13.8], [0.5, 2.9, 0], 50);
    else {
      const pw = pillowWorld();
      lookCam(pw.clone().add(V(0.9, 0.0, 5.2)), pw.clone().add(V(0.5, -0.4, 0)), 50);
    }
    topTag('sentuh', 'BILA DISENTUH...', t, 15.4, 16.8, PURPLE);
    topTag('isyarat', 'ISYARAT LAJU ⚡', t, 16.82, 19.5, GOLD);
    bubble('kilat', 'MACAM KILAT\nKECIL!', t, 17.96, 19.5, 1180, 110, { top: '#fffbe6', bot: '#e8c84a' });
    topTag('alir', 'AIR MENGALIR KELUAR', t, 20.66, 22.08, BLUE);
    return lab;
  }],
  // S8 — the pillow goes soft, the leaf folds; a caterpillar gets a fright
  [22.1, 28.95, (t) => {
    const fold = sm(23.4, 24.8, t);
    labSet(t, { flow: 1, swell: 0.85 - 0.25 * sm(22.2, 22.9, t), fold, droop: sm(24.4, 25.3, t) });
    const fright = inv(27.2, 27.9, t);
    catSet(t, sm(25.5, 27.1, t), fright);
    if (t < 25.4) {
      const pw = pillowWorld();
      camMove(t, 22.1, 25.4, pw.clone().add(V(0.9, 0.0, 5.2)).toArray(), pw.clone().add(V(0.5, -0.4, 0)).toArray(), [0.5, 2.8, 14.0], [0.5, 2.0, 0], 50);
    } else lookCam(V(0.5, 2.8, 14.0), V(0.5, 2.0, 0), 50);
    pinTag('lembik', 'BANTAL JADI LEMBIK', scr(pillowWorld().add(V(0, 0.5, 0))), t, 22.16, 23.4, { bg: ORANGE, pointer: 'down' }, -40);
    bubble('lipat', 'DAUN\nTERLIPAT!', t, 24.52, 25.58, 1180, 120, LEAFY);
    topTag('takut', 'TAKUTKAN SERANGGA 🐛', t, 26.68, 28.93, PURPLE);
    const cp = scr(lab.cat.root.position.clone().add(V(0, 1.2, 0)));
    const ex = pop(t, 27.2, 28.9, { from: 2 });
    if (ex.o > 0) ov.bubble('ex', '!', { x: cp.x, y: cp.y, o: ex.o, s: ex.s * 0.8, r: 8 }, { size: 150, top: '#fff0f0', bot: '#ff6b6b' });
    return lab;
  }],
  // S9 — after a few minutes the water flows back and the leaf opens; at night it folds to sleep
  [28.95, 38.52, (t) => {
    const back = sm(31.9, 33.2, t);
    const open = sm(33.0, 34.4, t);
    const night = sm(34.6, 35.6, t);
    const sleep = sm(35.8, 37.4, t);
    labSet(t, { flow: 1 - back, swell: 0.6 + 0.4 * back, fold: Math.max(1 - open, sleep), droop: Math.max(1 - open, sleep * 0.7), night });
    lookCam(V(0.5, 3.0, 14.2), V(0.5, 2.7, 0), 50);
    ov.flash(1 - inv(28.95, 29.25, t));
    topTag('tahu', 'TAHU TAK?', t, 29.0, 30.3, ORANGE);
    topTag('minit', 'LEPAS BEBERAPA MINIT ⏱️', t, 30.34, 34.66, PURPLE);
    pinTag('balik', 'AIR MASUK SEMULA', scr(pillowWorld().add(V(0, 0.5, 0))), t, 31.98, 33.5, { bg: BLUE, pointer: 'down' }, -40);
    bubble('buka', 'DAUN\nTERBUKA!', t, 33.56, 34.66, 1180, 120, LEAFY);
    topTag('malam', 'WAKTU MALAM 🌙', t, 34.72, 38.5, '#3a4a9a');
    bubble('tidur', 'SEMALU TIDUR!\nZzz...', t, 37.48, 38.5, 1180, 110, { top: '#eef0ff', bot: '#7a8aff' });
    return lab;
  }],
  // S10 — "Waaah, semalu bukan malu, tapi pandai lindungi diri! Sentuh perlahan-lahan, ya."
  [38.52, 45.3, (t) => {
    parkSet(t);
    const g = sm(43.6, 44.6, t);
    bedSet(t, t < 43.5 ? 1 - sm(38.6, 39.6, t) : sm(44.4, 45.6, t), 0);
    const r = t > 43.5 ? Math.min(g, 1 - sm(44.8, 45.3, t)) : 0;
    parkAff(t, { wow: keys(t, [[38.52, 0], [38.7, 1], [39.2, 1], [39.4, 0]]), smile: 1, brow: 0.6, ...(t > 43.4 ? { yaw: YAW_BED * 0.7, headPitch: 0.4, ...reach(r) } : {}) });
    const ah = affHead();
    if (t < 43.4) lookCam(front(3.3), ah.clone().add(V(0, -0.35, 0)), 46);
    else {
      const mid = touchPoint().lerp(affHead(), 0.5);
      lookCam(mid.clone().add(V(0.5, 0.2, 3.8)), mid.clone().add(V(0, -0.15, 0)), 50);
    }
    const hd = scr(ah.clone().add(V(0, 0.5, 0)));
    const b = pop(t, 38.6, 43.3);
    if (t < 43.4) ov.html('bulb', ICONS.bulb(), { x: clamp(hd.x + 230, 150, 900), y: clamp(hd.y - 150, 300, 900) + Math.sin(t * 5) * 8, o: b.o, s: b.s * 0.6, r: 10 });
    ov.sparkles(t, { n: 30, seed: 12, y: 250, h: 900, a: inv(38.6, 38.9, t) * (1 - inv(42.8, 43.3, t)) });
    bubble('bukan', 'BUKAN MALU,\nPANDAI LINDUNGI DIRI!', t, 39.36, 43.5, 430, 92, LEAFY);
    bubble('perlahan', 'SENTUH\nPERLAHAN-LAHAN', t, 43.56, 45.28, 430, 104, { top: '#fff0f6', bot: '#ff7ab0' });
    return park;
  }],
  // S11 — "Apa lagi kita nak belajar lepas ni?"
  [45.3, OUTRO, (t) => {
    parkSet(t);
    bedSet(t, 1 - sm(45.3, 47, t));
    const tk = keys(t, [[45.32, 0], [45.7, 1]]);
    const th2 = POSES.thinkR.armR;
    parkAff(t, { smile: 1, brow: 0.3 + 0.4 * tk, headRoll: -0.12 * tk, lookX: 0.35 * tk, lookY: 0.4 * tk, headPitch: -0.08 * tk, armR: { reach: mix3([-0.55, 0.3, 0.2], th2.reach, tk), pole: th2.pole, point: tk, wx: th2.wx * tk } });
    const ah = affHead();
    lookCam(front(3.3), ah.clone().add(V(0, -0.35, 0)), 46);
    const hd = scr(ah.clone().add(V(0, 0.45, 0)));
    qmarks(t, hd, 45.3, OUTRO - 0.05, [[45.35, -260, -100, '#ffcf33', -12], [45.65, 250, -160, '#3fa2ff', 10], [45.95, 300, 60, '#ffcf33', 14]]);
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
  renderer.setViewport(0, 0, W, H);
  renderer.render(w.scene, cam);
  if (w !== outro) ov.vignette(0.2);
  ov.captions(t, CAPTIONS, KEYWORDS);
  ov.end();
}

// Cover / thumbnail (9:16): the giant leaf folding with the signal zipping down.
function thumbnail() {
  ov.begin();
  cam.aspect = W / H;
  cam.updateProjectionMatrix();
  labSet(24.0, { flow: 0.6, swell: 0.75, fold: 0.45, droop: 0.15 });
  lookCam(V(0.5, 3.0, 13.6), V(0.5, 3.0, 0), 50);
  lab.sky.position.copy(cam.position);
  renderer.setViewport(0, 0, W, H);
  renderer.render(lab.scene, cam);
  ov.vignette(0.3);
  ov.tag('thBadge', 'EPISOD 67', { x: W / 2, y: 300 }, { bg: '#2f7bff', small: true });
  ov.bubble('thTitle', 'SEMALU', { x: W / 2, y: 445, r: -3 }, { size: 150, ...LEAFY });
  ov.bubble('thTitle2', 'MALU KE?!', { x: W / 2, y: 610, r: 2 }, { size: 140, top: '#fff0f6', bot: '#ff7ab0' });
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
