// THE CURIOUS AFFAN — Episode 046: "Kenapa Jantung Kita Berdegup?"
// Every shot is a pure function of time t (seconds), synced to audio/narration.mp3.
import * as THREE from 'three';
import { makeRenderer, loadEnvelope, toScreen, clamp, lerp, inv, easeOut, easeIn, easeInOut, keys, rng, W, H } from '../../shared/core.js';
import { POSES, blinkAt } from '../../shared/affan.js';
import { Overlay, pop, ICONS, drawLogo } from '../../shared/overlay.js';
import { CAPTIONS, KEYWORDS } from './captions.js';
import { buildPark, buildBody, buildValves, buildOutro, makeHeart, beat, A_PK, HEART, SPOTS, VALVES } from './worlds.js';

const FPS = 30;
const DURATION = 70.6;
const OUTRO = 67.45;

const stage = document.getElementById('stage');
const canvas = document.createElement('canvas');
stage.appendChild(canvas);
const renderer = makeRenderer(canvas);
const ov = new Overlay(stage);
const park = buildPark();
const body = buildBody();
const valv = buildValves();
const outro = buildOutro();
const mini = makeHeart();
mini.g.scale.setScalar(0.11);
park.scene.add(mini.g);
const cam = new THREE.PerspectiveCamera(50, W / H, 0.02, 6000);
let env = { at: () => 0 };

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const talk = (t) => clamp(env.at(t) * 1.2);
const scr = (p) => toScreen(p, cam);
const mix3 = (a, b, k) => a.map((v, i) => lerp(v, b[i], k));
const BLUE = '#2f9bff', ORANGE = '#ff8a3d', PURPLE = '#7a5cf0', GREEN = '#2fbf5f', PINK = '#ff5c9a', YELLOW = '#e0b400', RED = '#ff4d5e';

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
const HEART_SVG = (c = '#ff4d5e') => `<svg width="200" height="190" viewBox="0 0 200 190"><path d="M100 178 C40 130 8 98 8 58 C8 28 32 8 60 8 C78 8 92 18 100 32 C108 18 122 8 140 8 C168 8 192 28 192 58 C192 98 160 130 100 178 Z" fill="${c}" stroke="#17256b" stroke-width="12" stroke-linejoin="round"/><ellipse cx="62" cy="52" rx="16" ry="24" fill="#fff" opacity="0.7"/></svg>`;
const APPLE = `<svg width="160" height="170" viewBox="0 0 160 170"><path d="M80 40 C60 20 14 28 14 82 C14 130 50 162 80 150 C110 162 146 130 146 82 C146 28 100 20 80 40 Z" fill="#ff4d4d" stroke="#17256b" stroke-width="10"/><path d="M80 40 C80 26 86 14 96 6" stroke="#6b4a32" stroke-width="10" fill="none" stroke-linecap="round"/><path d="M92 22 C110 4 132 10 136 18 C120 30 104 30 92 22 Z" fill="#4fbf4a" stroke="#17256b" stroke-width="6"/></svg>`;
const BANANA = `<svg width="200" height="140" viewBox="0 0 200 140"><path d="M20 30 C40 110 140 130 186 70 C176 64 168 64 162 70 C126 104 70 96 46 28 Z" fill="#ffd23a" stroke="#17256b" stroke-width="10" stroke-linejoin="round"/></svg>`;
const CARROT = `<svg width="180" height="160" viewBox="0 0 180 160"><path d="M30 150 L120 40 C135 28 160 45 150 62 Z" fill="#ff8a2a" stroke="#17256b" stroke-width="10" stroke-linejoin="round"/><path d="M130 44 C130 20 150 8 160 10 M136 50 C160 40 172 50 174 58" stroke="#3fae4a" stroke-width="12" fill="none" stroke-linecap="round"/></svg>`;
// a beating heart icon with a BPM number
function bpmCard(t, a, b, bpm, x = 820, y = 760) {
  const q = pop(t, a, b);
  if (q.o <= 0) return;
  const k = beat(t, bpm);
  ov.html('bpmH', HEART_SVG(), { x, y, o: q.o, s: q.s * (0.55 + 0.08 * k) });
  ov.html('bpmN', `<div style="background:#fff;border:7px solid #17256b;border-radius:24px;padding:4px 18px;font:800 52px 'Baloo 2';color:#ff4d5e;line-height:1.1;text-align:center">${Math.round(bpm)}<div style="font:800 24px 'Baloo 2';color:#17256b">KALI SEMINIT</div></div>`, { x, y: y + 150, o: q.o, s: q.s * 0.85 });
}

// ===================================================================== park
const affHead = () => park.aff.parts.head.getWorldPosition(V());
function parkAff(t, p = {}) {
  const a = park.aff;
  a.root.position.copy(A_PK).add(V(0, p.bobY ?? 0, 0));
  a.pose({ yaw: 0.15, blink: blinkAt(t, 1), talk: talk(t), smile: 0.9, ...p });
  a.root.updateMatrixWorld(true);
}
function sweat(t, on) {
  park.sweat.forEach((d, i) => {
    const u = ((t * 0.6 + i / 3) % 1);
    d.visible = on;
    if (!on) return;
    d.position.copy(park.aff.parts.head.localToWorld(V(i === 1 ? -0.55 : 0.55, 0.3 - u * 0.6, 0.35)));
  });
}
function parkReset(t) {
  park.setSnow(t, 0);
  park.winter(false);
  mini.g.visible = false;
  sweat(t, false);
}
// jogging in place
function jog(t, speed = 9) {
  const s = Math.sin(t * speed);
  return {
    bobY: 0.05 * Math.abs(Math.sin(t * speed)),
    legL: { x: -0.7 * Math.max(0, s), knee: 1.2 * Math.max(0, s) },
    legR: { x: -0.7 * Math.max(0, -s), knee: 1.2 * Math.max(0, -s) },
    armL: { x: 0.7 * s, z: 0.15, el: -1.3 },
    armR: { x: -0.7 * s, z: -0.15, el: -1.3 },
    lean: 0.08, talk: 0, smile: 0.8,
  };
}
const CHEST = { reach: [0.12, 0.95, 0.42], pole: [-1, -0.6, 0], wx: -0.6 };
const front = (d, side = 0.35) => affHead().add(V(side, 0.1, d));

// ============================================================== body stage
function bodySet(t, { bpm = 70, flow = 0 } = {}) {
  body.heart.pulse(beat(t, bpm));
  const routes = ['otak', 'otot', 'kaki'];
  body.cells.forEach((c, i) => {
    const r = routes[i % 3];
    const u = ((t * 0.28 + Math.floor(i / 3) / 12) % 1);
    c.g.visible = flow > 0.01;
    if (!c.g.visible) return;
    c.g.position.copy(body.curves[r].getPoint(u));
    c.g.rotation.set(t * 2 + i, t + i, 0);
    c.g.scale.setScalar(flow);
    c.load.visible = u < 0.88;
  });
  body.brain.scale.setScalar(1 + 0.03 * Math.sin(t * 3));
  body.aff.pose({ yaw: 0.35, blink: blinkAt(t, 3), talk: talk(t) * 0.5, smile: 1, lookX: 0.4, lookY: 0.2 });
}

// ================================================================== valves
// doors: open 0..1 for each valve (1 = open, 0 = shut)
function valveSet(t, open = [1, 1], flow = 1) {
  valv.valves.forEach((v, i) => v.flaps.forEach((f) => (f.pv.rotation.z = -f.sd * (Math.PI / 2 - 0.15) * open[i])));
  valv.cells.forEach((c, i) => {
    const R = rng(i * 11 + 5);
    const u = ((t * 0.22 * flow + R()) % 1);
    c.visible = true;
    // cells move up; they wait below a shut valve
    let y = lerp(-0.4, 8.0, u);
    if (open[0] < 0.3 && y > VALVES[0].y - 0.4 && y < VALVES[0].y + 0.6) y = VALVES[0].y - 0.4 - R() * 0.4;
    if (open[1] < 0.3 && y > VALVES[1].y - 0.4 && y < VALVES[1].y + 0.6) y = VALVES[1].y - 0.4 - R() * 0.4;
    c.position.set((R() - 0.5) * 2.0, y, 0.4 + R() * 0.6);
    c.rotation.set(t + i, t * 1.3 + i, 0);
  });
}

// ======================================================================= SHOTS
const SHOTS = [
  // S1 — jogging at the playground
  [0, 2.24, (t) => {
    parkReset(t);
    parkAff(t, jog(t));
    camMove(t, 0, 2.24, [A_PK.x + 1.2, 2.2, A_PK.z + 6.4], [A_PK.x, 1.2, A_PK.z], [A_PK.x + 1.0, 2.0, A_PK.z + 5.4], [A_PK.x, 1.2, A_PK.z], 50);
    const q = pop(t, 0.4, 2.2);
    ov.tag('ep', 'EPISOD 46', { x: W / 2, y: 268, o: q.o, s: q.s }, { bg: '#2f7bff', small: true });
    return park;
  }],
  // S2 — "Fuh, penatnya berlari!"
  [2.24, 4.52, (t) => {
    parkReset(t);
    sweat(t, true);
    const pant = 0.5 + 0.5 * Math.sin(t * 9);
    parkAff(t, { lean: 0.18, headPitch: 0.1, wow: 0.5 * pant, smile: 0.4, brow: -0.2, armL: { reach: [0.35, 0.05, 0.45], pole: [1, -0.4, 0] }, armR: { reach: [-0.35, 0.05, 0.45], pole: [-1, -0.4, 0] }, bobY: -0.04 * pant });
    camMove(t, 2.24, 4.52, front(4.2).toArray(), affHead().add(V(0, -0.5, 0)).toArray(), front(3.6).toArray(), affHead().add(V(0, -0.45, 0)).toArray(), 46);
    bubble('penat', 'PENATNYA!', t, 2.86, 4.5, 430, 140, { top: '#fff0d0', bot: '#ff9a3d' });
    return park;
  }],
  // S3 — "Papa! Dada Affan berbunyi dup-dap, dup-dap, laju-laju!"
  [4.52, 8.86, (t) => {
    parkReset(t);
    sweat(t, true);
    parkAff(t, { armR: CHEST, brow: 0.5, smile: 0.6, headPitch: 0.15, lookY: -0.3 });
    const ah = affHead();
    lookCam(front(3.2), ah.clone().add(V(0, -0.45, 0)), 46);
    const pp = pop(t, 4.52, 5.3, { from: 2 });
    ov.bubble('papa', 'PAPA!', { x: 800, y: 470, o: pp.o, s: pp.s * 0.8, r: 6 }, { size: 110 });
    const chest = scr(park.aff.parts.torso.localToWorld(V(0.15, 0.9, 0.5)));
    const hq = pop(t, 5.4, 8.8);
    if (hq.o > 0) ov.html('hrt', HEART_SVG(), { x: chest.x - 160, y: chest.y - 40, o: hq.o, s: hq.s * (0.45 + 0.1 * beat(t, 140)) });
    [[6.48, 'DUP!', -230, -150], [6.8, 'DAP!', 160, -120], [7.14, 'DUP!', -210, 60], [7.36, 'DAP!', 190, 80]].forEach(([a, txt, dx, dy], i) => {
      const q = pop(t, a, a + 1.4, { from: 2 });
      if (q.o > 0) ov.tag('dd' + i, txt, { x: clamp(chest.x + dx, 200, 880), y: chest.y + dy, o: q.o, s: q.s }, { bg: RED });
    });
    bubble('laju', 'LAJU-LAJU!', t, 7.8, 8.82, 430, 140, { top: '#ffe0e0', bot: '#ff4d5e' }, 3);
    return park;
  }],
  // S4 — "Kenapa jantung kita berdegup?"
  [8.86, 10.78, (t) => {
    parkReset(t);
    parkAff(t, { ...POSES.thinkR, brow: -0.3, smile: 0.5 });
    const ah = affHead();
    lookCam(front(3.4), ah.clone().add(V(0, -0.4, 0)), 46);
    const hd = scr(ah.clone().add(V(0, 0.4, 0)));
    qmarks(t, hd, 8.86, 10.75, [[8.9, -260, 100, '#ffcf33', -12], [9.2, 250, 60, '#3fa2ff', 10], [9.5, 280, 240, '#ffcf33', 14]]);
    bubble('kenapa', 'KENAPA BERDEGUP?', t, 8.86, 10.75, 430, 108, { top: '#ffe0e8', bot: '#ff5c7a' });
    return park;
  }],
  // S5 — "Jom ikut Affan cari jawapan!" swirl
  [10.78, 12.68, (t) => {
    parkReset(t);
    const up = keys(t, [[10.8, 0], [11.0, 1], [12.2, 1], [12.5, 0.6]], easeOut);
    parkAff(t, { smile: 1, brow: 0.6, armR: { reach: [lerp(-0.6, -0.55, up), lerp(0.25, 1.95 + 0.06 * Math.sin(t * 14), up), lerp(0.2, 0.35, up)], pole: [-1, -0.3, -0.5] } });
    const ah = affHead();
    const chest = park.aff.parts.torso.localToWorld(V(0.15, 0.9, 0.4));
    const k = easeIn(inv(11.2, 12.68, t));
    lookCam(front(3.4).lerp(chest.clone().add(V(0, 0, 0.6)), k), ah.clone().add(V(0, -0.4, 0)).lerp(chest, k), 46);
    ov.swirl(t, W / 2, 820, inv(10.9, 12.6, t));
    ov.flash(inv(12.25, 12.68, t) ** 2, '255,220,230');
    return park;
  }],
  // S6 — the heart is about as big as your fist
  [12.68, 16.94, (t) => {
    parkReset(t);
    const fistUp = easeOut(inv(13.4, 14.0, t));
    parkAff(t, { smile: 1, brow: 0.4, lookX: -0.3, armR: { reach: mix3([-0.55, 0.3, 0.2], [-0.45, 1.3, 0.6], fistUp), pole: [-1, -0.5, -0.3], point: 0 } });
    const hand = park.aff.parts.arms.R.hand.getWorldPosition(V());
    mini.g.visible = t > 12.9;
    mini.g.position.copy(hand).add(V(-0.38, 0.05, 0.1));
    mini.pulse(beat(t, 80));
    mini.g.scale.setScalar(0.11 * (easeOut(inv(12.9, 13.5, t)) + 0.001));
    const ah = affHead();
    lookCam(front(3.0, 0.1).add(V(-0.25, -0.2, 0)), ah.clone().add(V(-0.25, -0.35, 0)), 46);
    ov.flash(1 - inv(12.68, 12.95, t), '255,220,230');
    pinTag('jantung', 'JANTUNG', scr(mini.g.position.clone().add(V(0, 0.2, 0))), t, 12.9, 16.9, { bg: RED, pointer: 'down' }, -50);
    pinTag('fist', 'PENUMBUK', scr(hand.clone().add(V(0, -0.25, 0))), t, 15.48, 16.9, { bg: ORANGE, pointer: 'up' }, 90);
    bubble('sama', 'SAMA BESAR\nMACAM PENUMBUK!', t, 14.5, 16.9, 430, 92, { top: '#fff0d0', bot: '#ff9a3d' });
    return park;
  }],
  // S7 — a strong muscle that works non-stop, day and night
  [16.94, 22.2, (t) => {
    bodySet(t, { bpm: 75, flow: 0 });
    camMove(t, 16.94, 22.2, [0.3, 4.8, 8.0], [0, 4.5, 0], [0.2, 4.7, 7.0], [0, 4.5, 0], 48);
    ov.flash(1 - inv(16.94, 17.25, t), '255,220,230');
    bubble('otot', 'OTOT YANG KUAT!', t, 17.34, 18.7, 430, 116, { top: '#ffe0e0', bot: '#ff4d5e' });
    topTag('henti', 'BEKERJA TANPA BERHENTI', t, 18.74, 22.15, PINK);
    const q = pop(t, 20.78, 22.15);
    if (q.o > 0) ov.tag('siang', 'SIANG & MALAM', { x: W / 2, y: 410, o: q.o, s: q.s }, { bg: PURPLE, small: true });
    return body;
  }],
  // S8 — every beat pumps blood with oxygen and food to the brain, muscles and toes
  [22.2, 33.02, (t) => {
    bodySet(t, { bpm: 75, flow: inv(23.6, 24.4, t) });
    if (t < 26.6) camMove(t, 22.2, 26.6, [0.2, 4.7, 7.0], [0, 4.5, 0], [0.8, 4.8, 15.5], [0.6, 4.7, 0], 50);
    else camMove(t, 26.6, 33.02, [0.8, 4.8, 15.5], [0.6, 4.7, 0], [0.6, 4.6, 16.5], [0.6, 4.6, 0], 50);
    topTag('pam', 'JANTUNG MENGEPAM DARAH', t, 23.68, 26.6, RED);
    pinTag('oks', 'OKSIGEN', scr(body.curves.otot.getPoint(0.45).add(V(0, 0.4, 0))), t, 27.54, 33.0, { bg: BLUE, pointer: 'down' }, -40);
    pinTag('makan', 'MAKANAN', scr(body.curves.kaki.getPoint(0.5).add(V(0.4, 0, 0))), t, 28.32, 33.0, { bg: YELLOW, pointer: 'down' }, -40);
    pinTag('otak', 'OTAK', scr(SPOTS.otak.clone().add(V(0, 1.2, 0))), t, 29.28, 33.0, { bg: PINK, pointer: 'down' }, -30);
    pinTag('ototT', 'OTOT', scr(SPOTS.otot.clone().add(V(0, 1.2, 0))), t, 30.24, 33.0, { bg: ORANGE, pointer: 'down' }, -30);
    pinTag('kaki', 'HUJUNG JARI KAKI', scr(SPOTS.kaki.clone().add(V(0, 0.6, 0))), t, 31.68, 33.0, { bg: '#c8885a', pointer: 'down' }, -30);
    return body;
  }],
  // S9 — the dup-dap comes from little doors in the heart, called valves
  [33.02, 41.94, (t) => {
    const shut0 = inv(38.9, 39.15, t), shut1 = inv(40.9, 41.15, t);
    const open0 = t < 38.9 ? 0.5 + 0.5 * Math.sin(t * 3) : 1 - shut0;
    const open1 = t < 38.9 ? 0.5 + 0.5 * Math.sin(t * 3 + 2) : 1 - shut1;
    valveSet(t, [open0, open1], 1);
    camMove(t, 33.02, 41.94, [0.6, 4.2, 12.5], [0, 3.8, 0], [0.4, 3.8, 10.5], [0, 3.8, 0], 50);
    ov.flash(1 - inv(33.02, 33.3, t), '255,200,210');
    topTag('pintu', 'PINTU-PINTU KECIL', t, 34.72, 37.4, PINK);
    pinTag('injap', 'INJAP', scr(VALVES[1].clone().add(V(0.8, 0.5, 0.8))), t, 37.46, 41.9, { bg: RED, pointer: 'down' }, -30);
    bubble('dup', 'DUP!', t, 39.6, 40.7, 430, 170, { top: '#ffe0e0', bot: '#ff4d5e' }, -4);
    bubble('dap', 'DAP!', t, 41.45, 41.92, 430, 170, { top: '#ffe0e8', bot: '#ff5c9a' }, 4);
    if (t > 39.0 && t < 39.5) ov.flash(0.25 * (1 - inv(39.0, 39.5, t)), '255,80,90');
    if (t > 41.0 && t < 41.5) ov.flash(0.25 * (1 - inv(41.0, 41.5, t)), '255,80,90');
    return valv;
  }],
  // S10 — running: muscles need more oxygen, so the heart beats faster
  [41.94, 50.18, (t) => {
    parkReset(t);
    sweat(t, t > 46);
    parkAff(t, jog(t, lerp(9, 13, inv(42.5, 46.5, t))));
    camMove(t, 41.94, 50.18, [A_PK.x + 1.8, 2.3, A_PK.z + 7.0], [A_PK.x + 0.4, 1.4, A_PK.z], [A_PK.x + 1.4, 2.1, A_PK.z + 6.0], [A_PK.x + 0.4, 1.4, A_PK.z], 50);
    ov.flash((1 - inv(41.94, 42.2, t)) * 0.6);
    const bpm = lerp(80, 140, easeInOut(inv(45.8, 47.6, t)));
    bpmCard(t, 42.4, 50.1, bpm);
    topTag('perlu', 'OTOT PERLUKAN LEBIH OKSIGEN', t, 43.26, 45.7, BLUE);
    bubble('lebihlaju', 'JANTUNG LEBIH LAJU!', t, 46.64, 50.1, 430, 104, { top: '#ffe0e0', bot: '#ff4d5e' });
    return park;
  }],
  // S11 — feel your pulse with two fingers on your wrist
  [50.18, 56.94, (t) => {
    parkReset(t);
    const k = easeInOut(inv(50.4, 51.4, t));
    parkAff(t, {
      smile: 0.9, brow: 0.3, headPitch: 0.3 * k, lookY: -0.5 * k,
      armL: { reach: mix3([0.55, 0.3, 0.2], [0.05, 0.75, 0.55], k), pole: [1, -0.6, 0], wx: -0.4, wz: 1.2 * k },
      armR: { reach: mix3([-0.55, 0.3, 0.2], [0.12, 0.82, 0.62], k), pole: [-1, -0.5, 0], point: k },
    });
    const ah = affHead();
    const wrist = park.aff.parts.arms.L.hand.getWorldPosition(V());
    lookCam(ah.clone().add(V(0.3, -0.5, 2.8)), wrist.clone().add(V(0, 0.25, 0)), 44);
    pinTag('pergelangan', 'PERGELANGAN TANGAN', scr(wrist.clone().add(V(0, -0.2, 0))), t, 51.72, 54.5, { bg: ORANGE, pointer: 'up' }, 100);
    // a pulse line (ECG-like)
    const pq = pop(t, 53.2, 56.9);
    if (pq.o > 0) {
      const g = ov.g;
      g.save();
      g.globalAlpha = pq.o;
      g.fillStyle = 'rgba(255,255,255,0.9)';
      g.strokeStyle = '#17256b';
      g.lineWidth = 8;
      g.beginPath();
      g.roundRect(120, 1000, 840, 220, 28);
      g.fill();
      g.stroke();
      g.strokeStyle = '#ff4d5e';
      g.lineWidth = 10;
      g.lineJoin = 'round';
      g.beginPath();
      for (let x = 150; x <= 930; x += 6) {
        const tt = t * 1.4 - (930 - x) / 300;
        const ph = ((tt % 1) + 1) % 1;
        const y = 1110 - 70 * Math.exp(-(((ph - 0.1) / 0.03) ** 2)) + 30 * Math.exp(-(((ph - 0.16) / 0.03) ** 2)) - 20 * Math.exp(-(((ph - 0.35) / 0.06) ** 2));
        if (x === 150) g.moveTo(x, y);
        else g.lineTo(x, y);
      }
      g.stroke();
      g.restore();
    }
    bubble('nadi', 'ITULAH NADI KITA!', t, 54.56, 56.9, 430, 108, { top: '#ffe0e8', bot: '#ff5c7a' });
    return park;
  }],
  // S12 — "Waaah ... Jom bersenam dan makan makanan sihat, supaya jantung kuat, ya."
  [56.94, 65.1, (t) => {
    parkReset(t);
    const jj = t > 60.6 && t < 63.6;
    const ph = Math.abs(Math.sin((t - 60.6) * 5));
    parkAff(t, jj ? {
      smile: 1, brow: 0.5, bobY: 0.12 * ph,
      armL: { reach: mix3([0.55, 0.3, 0.2], [0.75, 1.9, 0.1], ph), pole: [1, 0, -0.5] },
      armR: { reach: mix3([-0.55, 0.3, 0.2], [-0.75, 1.9, 0.1], ph), pole: [-1, 0, -0.5] },
      legL: { z: 0.25 * ph }, legR: { z: -0.25 * ph },
    } : { wow: keys(t, [[56.95, 0], [57.1, 0.9], [57.7, 0.9], [58.0, 0]]), smile: 1, brow: 0.5, ...(t > 63.6 ? POSES.thumbsUpR : {}) });
    const ah = affHead();
    if (t < 60.5) lookCam(front(3.3), ah.clone().add(V(0, -0.4, 0)), 46);
    else lookCam(V(A_PK.x + 0.8, 2.0, A_PK.z + 5.6), V(A_PK.x, 1.4, A_PK.z), 50);
    ov.flash((1 - inv(56.94, 57.25, t)) * 0.9, '255,250,235');
    const hd = scr(ah.clone().add(V(0, 0.5, 0)));
    const b = pop(t, 57.0, 60.4);
    if (t < 60.5) ov.html('bulb', ICONS.bulb(), { x: clamp(hd.x + 200, 150, 900), y: clamp(hd.y - 160, 300, 900) + Math.sin(t * 5) * 8, o: b.o, s: b.s * 0.6, r: 10 });
    ov.sparkles(t, { n: 30, seed: 12, y: 250, h: 900, a: inv(57.0, 57.3, t) * (1 - inv(59.4, 60.0, t)) });
    bubble('pam', 'PAM YANG HEBAT!', t, 58.48, 60.5, 440, 112, { top: '#ffe0e0', bot: '#ff4d5e' });
    topTag('senam', 'BERSENAM!', t, 60.66, 65.0, GREEN);
    [[APPLE, 200, 61.7], [BANANA, 540, 62.0], [CARROT, 880, 62.3]].forEach(([svg, x, a], i) => {
      const q = pop(t, a, 65.0, { from: 2 });
      if (q.o > 0) ov.html('food' + i, svg, { x, y: 1180 + 10 * Math.sin(t * 3 + i), o: q.o, s: q.s * 0.75 });
    });
    bubble('kuat', 'JANTUNG KUAT!', t, 63.66, 65.05, 440, 130, { top: '#ffe0e0', bot: '#ff4d5e' }, 3);
    return park;
  }],
  // S13 — "Apa lagi kita nak belajar lepas ni?"
  [65.1, OUTRO, (t) => {
    parkReset(t);
    const tk = keys(t, [[65.15, 0], [65.55, 1]]);
    const th2 = POSES.thinkR.armR;
    parkAff(t, { smile: 1, brow: 0.3 + 0.4 * tk, headRoll: -0.12 * tk, lookX: 0.35 * tk, lookY: 0.4 * tk, headPitch: -0.08 * tk, armR: { reach: mix3([-0.55, 0.3, 0.2], th2.reach, tk), pole: th2.pole, point: tk, wx: th2.wx * tk } });
    const ah = affHead();
    lookCam(front(3.2), ah.clone().add(V(0, -0.4, 0)), 46);
    const hd = scr(ah.clone().add(V(0, 0.45, 0)));
    qmarks(t, hd, 65.1, OUTRO - 0.05, [[65.15, -260, -100, '#ffcf33', -12], [65.45, 250, -160, '#3fa2ff', 10], [65.75, 300, 60, '#ffcf33', 14]]);
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

// Cover / thumbnail (9:16): the big friendly heart beating, Affan beside it.
function thumbnail() {
  ov.begin();
  cam.aspect = W / H;
  cam.updateProjectionMatrix();
  const t = 20.0;
  bodySet(t, { bpm: 75, flow: 1 });
  body.heart.pulse(1);
  lookCam(V(-0.6, 4.4, 9.6), V(-0.6, 4.2, 0), 50);
  body.sky.position.copy(cam.position);
  renderer.setViewport(0, 0, W, H);
  renderer.render(body.scene, cam);
  const g = ov.g;
  const top = g.createLinearGradient(0, 0, 0, 720);
  top.addColorStop(0, 'rgba(80,10,30,0.45)');
  top.addColorStop(1, 'rgba(80,10,30,0)');
  g.fillStyle = top;
  g.fillRect(0, 0, W, 720);
  const bot = g.createLinearGradient(0, H - 900, 0, H);
  bot.addColorStop(0, 'rgba(60,10,20,0)');
  bot.addColorStop(1, 'rgba(60,10,20,0.5)');
  g.fillStyle = bot;
  g.fillRect(0, H - 900, W, 900);
  ov.vignette(0.3);
  ov.tag('thBadge', 'EPISOD 46', { x: W / 2, y: 300 }, { bg: '#2f7bff', small: true });
  ov.bubble('thTitle', 'DUP-DAP?!', { x: W / 2, y: 460, r: -3 }, { size: 170, top: '#ffe0e0', bot: '#ff4d5e' });
  ov.bubble('thTitle2', 'KENAPA JANTUNG BERDEGUP?', { x: W / 2, y: 610, r: 2 }, { size: 74 });
  ov.html('thQ', ICONS.qmark('#ffcf33'), { x: 930, y: 800, r: 14, s: 0.9 });
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
