// THE CURIOUS AFFAN — Episode 051: "Berapa Jumlah Tulang Dalam Badan Kita?"
// Every shot is a pure function of time t (seconds), synced to audio/narration.mp3.
import * as THREE from 'three';
import { makeRenderer, loadEnvelope, toScreen, clamp, lerp, inv, easeOut, easeIn, easeInOut, keys, W, H } from '../../shared/core.js';
import { POSES, blinkAt } from '../../shared/affan.js';
import { Overlay, pop, ICONS, drawLogo } from '../../shared/overlay.js';
import { CAPTIONS, KEYWORDS } from './captions.js';
import { buildXray, buildRoom, buildOutro, A_RM, FOOD_TABLE, MARROW_AT, STAPES_AT } from './worlds.js';

const FPS = 30;
const DURATION = 71.5;
const OUTRO = 68.35;

const stage = document.getElementById('stage');
const canvas = document.createElement('canvas');
stage.appendChild(canvas);
const renderer = makeRenderer(canvas);
const ov = new Overlay(stage);
const xr = buildXray();
const room = buildRoom();
const outro = buildOutro();
const cam = new THREE.PerspectiveCamera(50, W / H, 0.02, 6000);
let env = { at: () => 0 };

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const talk = (t) => clamp(env.at(t) * 1.2);
const scr = (p) => toScreen(p, cam);
const mix3 = (a, b, k) => a.map((v, i) => lerp(v, b[i], k));
const BLUE = '#2f9bff', ORANGE = '#ff8a3d', PURPLE = '#7a5cf0', GREEN = '#2fbf5f', PINK = '#ff5c9a', RED = '#ff4d5e', CYAN = '#1fb8c8';

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
// a big counter number on a dark pill
function counter(text, t, a, b, y = 560, size = 150, col = '#ffffff') {
  const q = pop(t, a, b);
  if (q.o <= 0) return;
  const g = ov.g;
  g.save();
  g.globalAlpha = q.o;
  g.translate(W / 2, y);
  g.scale(q.s, q.s);
  g.font = `800 ${size}px "Baloo 2"`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.lineWidth = 22;
  g.strokeStyle = '#17256b';
  g.lineJoin = 'round';
  g.strokeText(text, 0, 10);
  g.fillStyle = col;
  g.fillText(text, 0, 10);
  g.restore();
}

// ============================================================ living room
const affHead = () => room.aff.parts.head.getWorldPosition(V());
function roomAff(t, p = {}) {
  room.aff.root.position.copy(A_RM);
  room.aff.pose({ yaw: 0.2, blink: blinkAt(t, 1), talk: talk(t), smile: 0.9, ...p });
  room.aff.root.updateMatrixWorld(true);
}
function roomFood(t, on = 0) {
  [[room.milk, 52.66], [room.bilis, 53.56], [room.greens, 54.3]].forEach(([o, a]) => o.scale.setScalar(Math.max(0.001, on * easeOut(inv(a, a + 0.3, t)))));
  room.cup.visible = false;
  room.sun.material.opacity = 0;
}
const faceCam = (d = 3.4) => {
  const ah = affHead();
  lookCam(ah.clone().add(V(0.5, 0.0, d)), ah.clone().add(V(-0.1, -0.45, 0)), 46);
  return ah;
};

// ================================================================== x-ray
const HI = new THREE.Color(0xffd84a), BASE = new THREE.Color(0x4a6a9a);
function xrReset(t) {
  const sk = xr.sk;
  for (const { mat } of Object.values(sk.groups)) {
    mat.emissive.copy(BASE);
    mat.emissiveIntensity = 0.35;
    mat.transparent = false;
    mat.opacity = 1;
  }
  sk.plates.forEach((p) => p.position.set(0, 0, 0));
  sk.brain.visible = false;
  sk.organs.visible = false;
  sk.root.visible = true;
  xr.ghost.root.visible = true;
  xr.ghost.pose({ blink: 0 });
  xr.ghost.ghostMat.opacity = 0.16;
  xr.baby.root.visible = false;
  xr.scan.visible = false;
  for (const side of ['L', 'R']) sk.hands[side].fingers.forEach((f) => f.forEach((j) => (j.rotation.x = 0)));
  xr.cells.forEach((c) => (c.visible = false));
  sk.root.rotation.y = 0;
  xr.ghost.root.rotation.y = 0;
}
function glowGroup(names, k, color = HI) {
  names.forEach((n) => {
    const m = xr.sk.groups[n].mat;
    m.emissive.copy(BASE).lerp(color, k);
    m.emissiveIntensity = 0.35 + 0.5 * k;
  });
}
function scanLine(t, a, b) {
  const u = inv(a, b, t);
  xr.scan.visible = u > 0 && u < 1;
  xr.scan.position.y = lerp(3.4, 0, u);
}

// =================================================================== SHOTS
const SHOTS = [
  // S1 — living room
  [0, 2.22, (t) => {
    roomFood(t, 0);
    roomAff(t);
    camMove(t, 0, 2.22, [1.8, 2.6, 6.6], [-0.2, 1.6, 0], [1.6, 2.5, 5.9], [-0.1, 1.6, 0], 50);
    const q = pop(t, 0.4, 2.2);
    ov.tag('ep', 'EPISOD 51', { x: W / 2, y: 268, o: q.o, s: q.s }, { bg: '#2f7bff', small: true });
    return room;
  }],
  // S2 — "Papa! Bila Affan tekan lengan, rasa keras."
  [2.22, 6.0, (t) => {
    roomFood(t, 0);
    const k = keys(t, [[3.2, 0], [3.6, 1]], easeOut);
    const press = 0.04 * Math.max(0, Math.sin((t - 3.6) * 9)) * k;
    roomAff(t, { brow: 0.4, smile: 1, headPitch: 0.2 * k, lookY: -0.4 * k, armL: { reach: mix3([0.55, 0.3, 0.2], [0.28, 0.85, 0.62], k), pole: [1, -0.5, -0.3] }, armR: { reach: mix3([-0.55, 0.3, 0.2], [0.18, 0.9 - press, 0.7], k), pole: [-1, -0.5, -0.3] } });
    faceCam(3.0);
    const pp = pop(t, 2.28, 3.1, { from: 2 });
    ov.bubble('papa', 'PAPA!', { x: 800, y: 470, o: pp.o, s: pp.s * 0.8, r: 6 }, { size: 110 });
    pinTag('tekan', 'TEKAN LENGAN', scr(room.aff.parts.arms.R.hand.getWorldPosition(V())), t, 3.64, 6.0, { bg: ORANGE, pointer: 'down' }, -60);
    bubble('keras', 'KERAS!', t, 4.96, 5.98, 430, 150, { top: '#fff0d8', bot: '#ff8a3d' });
    return room;
  }],
  // S3 — "Ini tulang ke?" — x-ray of the forearm
  [6.0, 7.34, (t) => {
    xrReset(t);
    scanLine(t, 6.0, 7.2);
    const sk = xr.sk;
    lookCam(V(1.5, 1.35, 1.8), V(0.7, 1.15, 0.05), 45);
    ov.flash(1 - inv(6.0, 6.25, t), '120,220,255');
    pinTag('tulang', 'TULANG!', scr(V(0.7, 1.15, 0.1)), t, 6.2, 7.32, { bg: CYAN, pointer: 'down' }, -60);
    void sk;
    return xr;
  }],
  // S4 — "Berapa banyak tulang dalam badan kita?"
  [7.34, 9.62, (t) => {
    roomFood(t, 0);
    roomAff(t, { ...POSES.thinkR, brow: -0.3, smile: 0.5 });
    const ah = faceCam();
    const hd = scr(ah.clone().add(V(0, 0.4, 0)));
    qmarks(t, hd, 7.4, 9.6, [[7.45, -260, 100, '#ffcf33', -12], [7.75, 250, 60, '#3fa2ff', 10], [8.1, 280, 240, '#ffcf33', 14]]);
    bubble('berapa', 'BERAPA BANYAK\nTULANG?', t, 7.4, 9.6, 430, 108, { top: '#fff6d0', bot: '#ffb21f' });
    return room;
  }],
  // S5 — "Jom ikut Affan cari jawapan!"
  [9.62, 11.56, (t) => {
    roomFood(t, 0);
    const up = keys(t, [[9.64, 0], [9.88, 1], [11.0, 1], [11.3, 0.6]], easeOut);
    roomAff(t, { smile: 1, brow: 0.6, armR: { reach: [lerp(-0.6, -0.55, up), lerp(0.25, 1.95 + 0.06 * Math.sin(t * 14), up), lerp(0.2, 0.35, up)], pole: [-1, -0.3, -0.5] } });
    const k = easeIn(inv(10.6, 11.56, t));
    faceCam(3.4 - 2.4 * k);
    ov.swirl(t, W / 2, 820, inv(9.7, 11.5, t));
    ov.flash(inv(11.15, 11.56, t) ** 2, '120,220,255');
    return room;
  }],
  // S6 — 206 bones
  [11.56, 14.68, (t) => {
    xrReset(t);
    scanLine(t, 11.6, 12.8);
    xr.sk.root.rotation.y = xr.ghost.root.rotation.y = 0.3 * Math.sin(t * 0.6);
    camMove(t, 11.56, 14.68, [0.4, 1.9, 6.4], [0, 1.55, 0], [0.2, 1.8, 5.8], [0, 1.55, 0], 50);
    ov.flash(1 - inv(11.56, 11.85, t), '120,220,255');
    topTag('dewasa', 'ORANG DEWASA', t, 11.62, 14.66, BLUE);
    const n = Math.round(206 * easeOut(inv(12.58, 13.9, t)));
    counter(String(n), t, 12.58, 14.66, 1170, 170);
    bubble('206', '206 TULANG!', t, 13.82, 14.66, 1080, 120, { top: '#fff6d0', bot: '#ffb21f' });
    return xr;
  }],
  // S7 — a baby is born with almost 300 bones
  [14.68, 18.54, (t) => {
    xrReset(t);
    const b = easeOut(inv(14.8, 15.4, t));
    xr.baby.root.visible = b > 0.01;
    xr.baby.root.scale.setScalar(0.5 * Math.max(0.01, b));
    xr.ghost.root.visible = false;
    camMove(t, 14.68, 18.54, [-0.4, 1.6, 6.6], [-0.7, 1.3, 0], [-0.6, 1.5, 6.0], [-0.8, 1.25, 0], 50);
    pinTag('bayi', 'BAYI', scr(V(-1.6, 1.75, 0.3)), t, 15.24, 18.5, { bg: PINK, pointer: 'down' }, -30);
    const n = Math.round(300 * easeOut(inv(16.76, 17.6, t)));
    counter('±' + n, t, 16.76, 18.5, 1170, 160, '#ffb3d1');
    return xr;
  }],
  // S8 — some bones join into one as we grow (skull plates close up)
  [18.54, 22.24, (t) => {
    xrReset(t);
    const gap = 1 - easeInOut(inv(20.62, 21.8, t));
    xr.sk.plates.forEach((p) => p.position.copy(p.userData.dir).multiplyScalar(0.16 * gap));
    glowGroup(['skull'], inv(20.6, 21.0, t) * (1 - inv(21.9, 22.2, t)));
    xr.ghost.ghostMat.opacity = 0.08;
    camMove(t, 18.54, 22.24, [1.8, 4.5, 4.0], [0, 2.7, 0], [1.5, 4.2, 3.4], [0, 2.65, 0], 48);
    topTag('besar', 'BILA MEMBESAR...', t, 18.6, 20.6, PURPLE);
    bubble('cantum', 'BERCANTUM\nJADI SATU!', t, 20.62, 22.2, 430, 108, { top: '#efe0ff', bot: '#8a5cff' });
    return xr;
  }],
  // S9 — more than half our bones are in the hands and feet; fingers wiggle
  [22.24, 29.21, (t) => {
    xrReset(t);
    const hk = inv(24.6, 25.2, t);
    glowGroup(['handL', 'handR', 'footL', 'footR'], hk);
    const wig = inv(27.3, 27.6, t);
    for (const side of ['L', 'R']) xr.sk.hands[side].fingers.forEach((f, i) => f.forEach((j) => (j.rotation.x = wig * 0.5 * (0.5 + 0.5 * Math.sin(t * 12 + i)))));
    if (t < 27.2) camMove(t, 22.24, 27.2, [0.3, 1.6, 6.4], [0, 1.3, 0], [0.2, 1.4, 5.6], [0, 1.2, 0], 50);
    else camMove(t, 27.2, 29.21, [1.6, 1.1, 1.6], [0.72, 0.85, 0.06], [1.4, 1.0, 1.3], [0.72, 0.85, 0.06], 46);
    topTag('separuh', 'LEBIH SEPARUH TULANG!', t, 23.44, 27.2, BLUE);
    const q1 = pop(t, 25.26, 27.2), q2 = pop(t, 25.84, 27.2);
    if (q1.o > 0) ov.tag('tg', 'TANGAN: 54', { x: 300, y: 1060, o: q1.o, s: q1.s }, { bg: ORANGE });
    if (q2.o > 0) ov.tag('kk', 'KAKI: 52', { x: 780, y: 1060, o: q2.o, s: q2.s }, { bg: ORANGE });
    counter('106 / 206', t, 26.2, 27.2, 1190, 120, '#ffd84a');
    bubble('cekap', 'JARI BERGERAK\nDENGAN CEKAP!', t, 27.88, 29.2, 430, 100, { top: '#e0f6ff', bot: '#2fa8d8' });
    return xr;
  }],
  // S10 — the longest bone: the thigh bone
  [29.21, 32.5, (t) => {
    xrReset(t);
    glowGroup(['femurL', 'femurR'], inv(30.8, 31.3, t), new THREE.Color(0x5fe08a));
    camMove(t, 29.21, 32.5, [0.6, 1.2, 4.4], [0, 0.85, 0], [0.4, 1.1, 3.8], [0, 0.8, 0], 50);
    topTag('panjang', 'PALING PANJANG', t, 29.96, 32.48, GREEN);
    pinTag('paha', 'TULANG PAHA', scr(V(0.24, 0.78, 0.1)), t, 31.18, 32.48, { bg: GREEN, pointer: 'down' }, -40);
    return xr;
  }],
  // S11 — the smallest: the stirrup bone in the ear, smaller than a grain of rice
  [32.5, 37.8, (t) => {
    xrReset(t);
    camMove(t, 32.5, 37.8, [STAPES_AT.x + 0.2, STAPES_AT.y + 0.8, 6.0], [STAPES_AT.x + 0.15, STAPES_AT.y + 0.2, 0], [STAPES_AT.x + 0.2, STAPES_AT.y + 0.7, 5.3], [STAPES_AT.x + 0.15, STAPES_AT.y + 0.2, 0], 48);
    ov.flash(1 - inv(32.5, 32.8, t), '120,220,255');
    topTag('kecil', 'PALING KECIL', t, 32.56, 37.78, ORANGE);
    pinTag('sang', 'TULANG SANGGURDI', scr(STAPES_AT.clone().add(V(-0.55, 0.9, 0))), t, 33.66, 37.78, { bg: ORANGE, pointer: 'down' }, -30);
    topTag('telinga', 'DALAM TELINGA', t, 34.6, 37.78, PURPLE, 410);
    pinTag('beras', 'BERAS', scr(STAPES_AT.clone().add(V(0.9, 1.2, 0))), t, 36.7, 37.78, { bg: '#8a8a9a', pointer: 'down' }, -30);
    const mq = pop(t, 34.0, 37.78);
    if (mq.o > 0) {
      const p = scr(STAPES_AT.clone().add(V(-0.55, -0.55, 0.3)));
      ov.tag('mm', '3 mm', { x: p.x, y: p.y + 40, o: mq.o, s: mq.s }, { bg: '#c8a000', small: true });
    }
    bubble('beras2', 'LEBIH KECIL DARI\nSEBUTIR BERAS!', t, 36.44, 37.78, 1080, 90, { top: '#fff6d0', bot: '#ffb21f' });
    return xr;
  }],
  // S12 — bones protect: skull guards the brain, ribs guard heart and lungs
  [37.8, 44.5, (t) => {
    xrReset(t);
    const sk = xr.sk;
    const br = inv(40.0, 40.4, t);
    sk.brain.visible = br > 0;
    const skm = sk.groups.skull.mat;
    skm.transparent = br > 0;
    skm.opacity = 1 - 0.65 * br;
    glowGroup(['skull'], br * (1 - inv(41.5, 41.8, t)), new THREE.Color(0xc39aff));
    const rk = inv(41.6, 42.0, t);
    sk.organs.visible = rk > 0;
    sk.heart.scale.setScalar(1 + 0.12 * Math.max(0, Math.sin(t * 7)));
    glowGroup(['ribs'], rk, new THREE.Color(0xc39aff));
    xr.ghost.ghostMat.opacity = 0.08;
    if (t < 41.5) camMove(t, 37.8, 41.5, [0.5, 2.6, 4.6], [0, 2.1, 0], [0.4, 2.8, 3.6], [0, 2.5, 0], 50);
    else camMove(t, 41.5, 44.5, [0.4, 2.8, 3.6], [0, 2.5, 0], [0.3, 1.8, 3.4], [0, 1.5, 0], 50);
    topTag('lindung', 'TULANG MELINDUNGI BADAN', t, 38.62, 44.48, BLUE);
    pinTag('otak', 'TENGKORAK JAGA OTAK', scr(V(0, 3.3, 0)), t, 40.1, 41.6, { bg: PURPLE, pointer: 'down' }, -20);
    pinTag('rusuk', 'TULANG RUSUK', scr(V(0, 1.85, 0.3)), t, 41.68, 44.48, { bg: PURPLE, pointer: 'down' }, -40);
    pinTag('jantung', 'JANTUNG & PARU-PARU', scr(V(0.1, 1.2, 0.3)), t, 42.5, 44.48, { bg: RED, pointer: 'up' }, 60);
    return xr;
  }],
  // S13 — inside the bone, marrow makes blood cells
  [44.5, 48.1, (t) => {
    xrReset(t);
    const fl = inv(46.3, 46.7, t);
    xr.cells.forEach((c, i) => {
      const u = ((t * 0.4 + i / xr.cells.length) % 1);
      c.visible = fl > 0.01;
      c.position.set(MARROW_AT.x - 1.8 + u * 3.6, MARROW_AT.y + 0.1 + 0.3 * Math.sin(i * 2.1), 0.75 + 0.6 * u + 0.2 * Math.cos(i * 1.7));
      c.rotation.set(t * 2 + i, t + i, 0);
      c.scale.setScalar(fl);
    });
    camMove(t, 44.5, 48.1, [MARROW_AT.x + 0.4, MARROW_AT.y + 1.6, 6.0], MARROW_AT.toArray(), [MARROW_AT.x + 0.2, MARROW_AT.y + 1.2, 5.0], MARROW_AT.toArray(), 50);
    ov.flash(1 - inv(44.5, 44.8, t), '120,220,255');
    topTag('dalam', 'DI DALAM TULANG', t, 44.56, 48.08, BLUE);
    pinTag('sumsum', 'SUMSUM', scr(MARROW_AT.clone().add(V(0, 0.75, 0.3))), t, 45.84, 48.08, { bg: RED, pointer: 'down' }, -30);
    bubble('sel', 'BUAT SEL DARAH!', t, 47.06, 48.08, 1080, 110, { top: '#ffe0e0', bot: '#ff4d5e' });
    return xr;
  }],
  // S14 — bones are alive: calcium from milk, ikan bilis, greens, and morning sun
  [48.1, 57.31, (t) => {
    roomFood(t, 1);
    room.sun.material.opacity = 0.9 * inv(55.8, 56.3, t);
    roomAff(t, { yaw: -0.4, smile: 1, brow: 0.3, lookX: -0.3 * inv(52.4, 52.8, t) });
    camMove(t, 48.1, 57.31, [0.6, 2.4, 5.4], [-0.6, 1.3, 0.6], [0.2, 2.2, 4.6], [-0.7, 1.2, 0.7], 50);
    ov.flash(1 - inv(48.1, 48.4, t));
    topTag('hidup', 'TULANG KITA HIDUP & MEMBESAR', t, 48.16, 51.3, GREEN);
    bubble('kalsium', 'PERLUKAN KALSIUM!', t, 51.38, 55.8, 430, 104, { top: '#ffffff', bot: '#9aa4b4' });
    const P = FOOD_TABLE.clone().add(V(0, 1.15, 0));
    pinTag('susu', 'SUSU', scr(P.clone().add(V(-0.4, 0, 0))), t, 52.66, 57.28, { bg: BLUE, pointer: 'down' }, -30);
    pinTag('bilis', 'IKAN BILIS', scr(P.clone().add(V(0.05, -0.1, 0))), t, 53.56, 57.28, { bg: '#6a7488', pointer: 'down' }, -110);
    pinTag('sayur', 'SAYUR HIJAU', scr(P.clone().add(V(0.42, -0.2, 0))), t, 54.3, 57.28, { bg: GREEN, pointer: 'down' }, -30);
    bubble('sun', 'CAHAYA\nMATAHARI PAGI!', t, 55.88, 57.28, 430, 96, { top: '#fff6d0', bot: '#ffb21f' });
    return room;
  }],
  // S15 — "Waaah, rupanya badan kita ada rangka yang hebat!"
  [57.31, 61.76, (t) => {
    roomFood(t, 1);
    roomAff(t, { wow: keys(t, [[57.35, 0], [57.5, 0.9], [58.1, 0.9], [58.4, 0]]), smile: 1, brow: 0.5 });
    const ah = faceCam();
    ov.flash((1 - inv(57.31, 57.6, t)) * 0.9, '255,250,235');
    const hd = scr(ah.clone().add(V(0, 0.5, 0)));
    const b = pop(t, 57.35, 61.7);
    ov.html('bulb', ICONS.bulb(), { x: clamp(hd.x + 220, 150, 900), y: clamp(hd.y - 170, 300, 900) + Math.sin(t * 5) * 8, o: b.o, s: b.s * 0.6, r: 10 });
    ov.sparkles(t, { n: 30, seed: 12, y: 250, h: 900, a: inv(57.4, 57.7, t) * (1 - inv(59.6, 60.2, t)) });
    bubble('rangka', 'RANGKA\nYANG HEBAT!', t, 60.18, 61.74, 430, 116, { top: '#fff6d0', bot: '#ffb21f' });
    return room;
  }],
  // S16 — drink milk and move a lot
  [61.76, 66.12, (t) => {
    roomFood(t, 1);
    room.milk.scale.setScalar(t < 62.0 ? 1 : 0.001);
    const drink = keys(t, [[61.9, 0], [62.2, 1], [62.8, 1], [63.0, 0]]);
    room.cup.visible = t > 61.95 && t < 63.1;
    const jj = inv(63.2, 63.4, t) * (1 - inv(65.6, 65.9, t));
    const ph = Math.max(0, Math.sin((t - 63.2) * Math.PI * 2.2));
    const star = jj * ph;
    roomAff(t, {
      smile: 1,
      brow: 0.4,
      headPitch: -0.25 * drink,
      ...(t < 63.1 ? { armR: { reach: mix3([-0.55, 0.3, 0.2], [-0.12, 1.32, 0.72], drink), pole: [-1, -0.6, -0.3] } } : {
        armL: { reach: mix3([0.55, 0.3, 0.2], [0.85, 1.9, 0.2], star), pole: [1, -0.3, -0.5] },
        armR: { reach: mix3([-0.55, 0.3, 0.2], [-0.85, 1.9, 0.2], star), pole: [-1, -0.3, -0.5] },
        legL: { x: 0, z: 0.35 * star }, legR: { x: 0, z: -0.35 * star },
      }),
    });
    room.aff.root.position.y = 0.35 * jj * Math.abs(Math.sin((t - 63.2) * Math.PI * 2.2));
    camMove(t, 61.76, 66.12, [0.9, 2.4, 5.6], [0.1, 1.6, 0.6], [0.7, 2.3, 5.2], [0.1, 1.6, 0.6], 50);
    topTag('minum', 'MINUM SUSU', t, 62.08, 63.2, BLUE);
    topTag('gerak', 'BANYAK BERGERAK!', t, 63.2, 66.1, GREEN);
    bubble('kuat', 'TULANG KUAT!', t, 65.18, 66.1, 430, 130, { top: '#fff6d0', bot: '#ffb21f' });
    return room;
  }],
  // S17 — "Apa lagi kita nak belajar lepas ni?"
  [66.12, OUTRO, (t) => {
    roomFood(t, 1);
    const tk = keys(t, [[66.15, 0], [66.55, 1]]);
    const th2 = POSES.thinkR.armR;
    roomAff(t, { smile: 1, brow: 0.3 + 0.4 * tk, headRoll: -0.12 * tk, lookX: 0.35 * tk, lookY: 0.4 * tk, headPitch: -0.08 * tk, armR: { reach: mix3([-0.55, 0.3, 0.2], th2.reach, tk), pole: th2.pole, point: tk, wx: th2.wx * tk } });
    const ah = faceCam();
    const hd = scr(ah.clone().add(V(0, 0.45, 0)));
    qmarks(t, hd, 66.12, OUTRO - 0.05, [[66.15, -260, -100, '#ffcf33', -12], [66.45, 250, -160, '#3fa2ff', 10], [66.75, 300, 60, '#ffcf33', 14]]);
    return room;
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

// Cover / thumbnail (9:16): the x-ray skeleton inside a glowing Affan.
function thumbnail() {
  ov.begin();
  cam.aspect = W / H;
  cam.updateProjectionMatrix();
  xrReset(13);
  xr.sk.root.rotation.y = xr.ghost.root.rotation.y = 0.25;
  glowGroup(['handL', 'handR'], 0.5);
  lookCam(V(0.4, 1.7, 5.2), V(0, 1.75, 0), 50);
  xr.sky.position.copy(cam.position);
  renderer.setViewport(0, 0, W, H);
  renderer.render(xr.scene, cam);
  ov.vignette(0.3);
  ov.tag('thBadge', 'EPISOD 51', { x: W / 2, y: 300 }, { bg: '#2f7bff', small: true });
  ov.bubble('thTitle', '206 TULANG?!', { x: W / 2, y: 455, r: -3 }, { size: 150, top: '#fff6d0', bot: '#ffb21f' });
  drawLogo(ov, { y: 1500, scale: 0.55 });
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
