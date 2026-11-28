// THE CURIOUS AFFAN — Episode 072: "Haiwan Paling Besar dan Paling Kecil di Dunia?"
// Every shot is a pure function of time t (seconds), synced to audio/narration.mp3.
import * as THREE from 'three';
import { makeRenderer, loadEnvelope, toScreen, clamp, lerp, inv, easeOut, easeIn, easeInOut, backOut, keys, W, H } from '../../shared/core.js';
import { POSES, blinkAt } from '../../shared/affan.js';
import { Overlay, pop, ICONS, drawLogo } from '../../shared/overlay.js';
import { CAPTIONS, KEYWORDS } from './captions.js';
import { buildRoom, buildOcean, buildScale, buildTiny, buildHandFrog, buildOutro, A_STAND, SEABED } from './worlds.js';

const FPS = 30;
const DURATION = 58.55;
const OUTRO = 55.4;

const stage = document.getElementById('stage');
const canvas = document.createElement('canvas');
stage.appendChild(canvas);
const renderer = makeRenderer(canvas);
const ov = new Overlay(stage);
const room = buildRoom();
const sea = buildOcean();
const sc = buildScale();
const tiny = buildTiny();
const hf = buildHandFrog();
const outro = buildOutro();
const cam = new THREE.PerspectiveCamera(50, W / H, 0.02, 6000);
let env = { at: () => 0 };

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const talk = (t) => clamp(env.at(t) * 1.2);
const scr = (p) => toScreen(p, cam);
const mix3 = (a, b, k) => a.map((v, i) => lerp(v, b[i], k));
const sm = (a, b, t) => easeInOut(inv(a, b, t));
const BLUE = '#2f9bff', ORANGE = '#ff8a3d', PURPLE = '#7a5cf0', GREEN = '#2fbf5f', PINK = '#ff5c9a', TEAL = '#20b8a0', RED = '#ff4d5e', BROWN = '#a0683a';
const SEA = { top: '#eaf6ff', bot: '#2f9bff' };
const TINY = { top: '#fff4e0', bot: '#ff9a3d' };
const GRN = { top: '#f0ffe0', bot: '#4fbf4a' };

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
function hearts(t, x, y, a, b, n = 6, seed = 1) {
  if (t < a || t > b) return;
  const g = ov.g;
  for (let i = 0; i < n; i++) {
    const u = ((t - a) * 0.6 + i / n) % 1;
    const hx = x + Math.sin(i * 2.3 + seed) * 170 + Math.sin(t * 3 + i) * 12;
    const hy = y - u * 300;
    const s = 26 * (0.7 + 0.3 * Math.sin(i * 1.7));
    g.save();
    g.globalAlpha = Math.sin(u * Math.PI) * inv(a, a + 0.3, t) * (1 - inv(b - 0.3, b, t));
    g.fillStyle = ['#ff5c9a', '#ff8ab8', '#ff4d6e'][i % 3];
    g.translate(hx, hy);
    g.beginPath();
    g.moveTo(0, s * 0.35);
    g.bezierCurveTo(-s, -s * 0.4, -s * 0.45, -s * 1.1, 0, -s * 0.5);
    g.bezierCurveTo(s * 0.45, -s * 1.1, s, -s * 0.4, 0, s * 0.35);
    g.fill();
    g.restore();
  }
}
// a measuring line between two screen points with end ticks and a label
function measure(a, b, label, k, color = '#ffffff', bg = BLUE) {
  if (k <= 0.01) return;
  const g = ov.g;
  const e = { x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k) };
  g.save();
  g.strokeStyle = color;
  g.lineWidth = 10;
  g.lineCap = 'round';
  g.shadowColor = 'rgba(0,0,0,0.35)';
  g.shadowBlur = 8;
  g.beginPath();
  g.moveTo(a.x, a.y);
  g.lineTo(e.x, e.y);
  g.stroke();
  const nx = -(b.y - a.y), ny = b.x - a.x, nl = Math.hypot(nx, ny) || 1;
  for (const p of [a, e]) {
    g.beginPath();
    g.moveTo(p.x + (nx / nl) * 26, p.y + (ny / nl) * 26);
    g.lineTo(p.x - (nx / nl) * 26, p.y - (ny / nl) * 26);
    g.stroke();
  }
  g.restore();
  if (k > 0.9) ov.tag('m_' + label, label, { x: clamp((a.x + b.x) / 2, 190, 890), y: (a.y + b.y) / 2, o: inv(0.9, 1, k), s: 1 }, { bg });
}

// =================================================================== room
const affHead = () => room.aff.parts.head.getWorldPosition(V());
const ARM_BOOK_L = { reach: [0.42, 0.42, 0.66], pole: [1, -0.6, -0.3] };
const ARM_BOOK_R = { reach: [-0.42, 0.42, 0.66], pole: [-1, -0.6, -0.3] };
function roomAff(t, p = {}, book = 1) {
  const a = room.aff;
  a.root.position.copy(A_STAND);
  a.pose({ yaw: 0, blink: blinkAt(t, 1), talk: talk(t), smile: 0.9, ...(book ? { armL: ARM_BOOK_L, armR: ARM_BOOK_R } : {}), ...p });
  a.root.updateMatrixWorld(true);
  room.book.visible = book > 0;
  if (book) {
    const l = a.parts.arms.L.hand.getWorldPosition(V()), r = a.parts.arms.R.hand.getWorldPosition(V());
    room.book.position.copy(l).add(r).multiplyScalar(0.5).add(V(0, 0.1, 0.12));
    room.book.rotation.set(-0.12, 0, 0);
  }
  room.cat.root.visible = false;
}
const closeCam = (dz = 4.0, dx = 0.15) => {
  const ah = affHead();
  lookCam(ah.clone().add(V(dx, 0.25, dz + 0.9)), ah.clone().add(V(0, -0.6, 0)), 48);
};

// ================================================================= ocean
function whaleAt(x, y, z, rz = 0, ry = 0) {
  const w = sea.whale;
  w.visible = true;
  w.position.set(x, y, z);
  w.rotation.set(0, ry, rz);
  w.updateMatrixWorld(true);
}
function oceanSet(t, { buses = null, dino = false } = {}) {
  sea.update(t);
  sea.buses.forEach((b, i) => {
    const k = buses ? backOut(inv(buses[i], buses[i] + 0.35, t)) : 0;
    b.visible = k > 0.01;
    b.position.set(5.6, -10 + i * 10.1, 0);
    b.rotation.set(0, 0, Math.PI / 2);
    b.scale.setScalar(Math.max(0.001, k));
  });
  sea.dino.visible = dino;
  if (dino) {
    sea.dino.position.set(-3, SEABED, -6);
    sea.dino.rotation.set(0, 0.15, 0);
  }
}

// =========================================================== the balance
function scaleSet(t, tilt) {
  const b = sc.bal.userData;
  b.set(tilt);
  const [pl, pr] = b.pans;
  sc.tongue.position.copy(pl.position).add(V(0, 0.1, 0));
  sc.tongue.rotation.set(0, 0.3, 0);
  sc.elephant.position.copy(pr.position).add(V(-0.25, 0.08, 0));
  sc.elephant.rotation.set(0, -0.35, 0);
  sc.elephant.userData.head.rotation.z = 0.08 * Math.sin(t * 2);
}

// ========================================================= the tiny table
function tinySet(t, { tilt = 0 } = {}) {
  const s = tiny.shrew;
  s.position.set(-0.8, 0, 0);
  s.rotation.set(0, 0.35, 0);
  s.userData.head.rotation.set(0.1 * Math.sin(t * 9), 0.25 * Math.sin(t * 2.1), 0.15 * Math.sin(t * 13) * 0.3);
  tiny.coin.position.set(3.3, 0, 1.4);
  const B = V(22, 0, 0);
  tiny.bal.position.copy(B);
  tiny.bal.userData.set(tilt);
  const [pl, pr] = tiny.bal.userData.pans;
  tiny.shrew2.position.copy(pl.position).add(B).add(V(0.3, 0.06, 0));
  tiny.shrew2.rotation.set(0, 0.5, 0);
  tiny.shrew2.scale.setScalar(0.55);
  tiny.shrew2.userData.head.rotation.set(0, 0.25 * Math.sin(t * 2.3), 0);
  tiny.coin2.position.copy(pr.position).add(B).add(V(0, 0.06, 0));
  tiny.coin2.scale.setScalar(1.0);
}

// ============================================================ hand + frog
function handSet(t, hop) {
  hf.hand.rotation.set(-1.2, 0, 0);
  hf.hand.position.set(0, 0, 0);
  hf.hand.updateMatrixWorld(true);
  const n = hf.nails[1];
  const nail = n.bed.localToWorld(V(0, 0.08, 0.05));
  const start = nail.clone().add(V(2.2, 0.4, -0.6));
  const k = easeInOut(hop);
  const p = start.clone().lerp(nail, k);
  p.y += Math.sin(k * Math.PI) * 1.2;
  hf.frog.position.copy(p);
  hf.frog.rotation.set(0, -Math.PI / 2 + 0.6 * (1 - k), 0);
  const breathe = 1 + 0.06 * Math.sin(t * 6);
  hf.frog.scale.set(0.24, 0.24 * breathe, 0.24);
  return nail;
}

// ================================================================== SHOTS
const SHOTS = [
  // S1 — Affan with his animal book
  [0, 2.26, (t) => {
    roomAff(t, { talk: 0 });
    const ah = affHead();
    camMove(t, 0, 2.26, [ah.x + 0.6, ah.y + 0.2, ah.z + 7.2], [ah.x, ah.y - 1.3, ah.z], [ah.x + 0.4, ah.y + 0.2, ah.z + 6.2], [ah.x, ah.y - 1.2, ah.z], 48);
    const q = pop(t, 0.4, 2.2);
    ov.tag('ep', 'EPISOD 72', { x: W / 2, y: 268, o: q.o, s: q.s }, { bg: '#2f7bff', small: true });
    return room;
  }],
  // S2 — "Papa!"
  [2.26, 3.16, (t) => {
    roomAff(t, { brow: 0.6, smile: 1 });
    closeCam(4.6);
    const pp = pop(t, 2.28, 3.14, { from: 2 });
    ov.bubble('papa', 'PAPA!', { x: 800, y: 470, o: pp.o, s: pp.s * 0.8, r: 6 }, { size: 110 });
    return room;
  }],
  // S3 — "Dalam buku ni ada paus yang besar sangat, dan semut yang kecil!"
  [3.16, 7.7, (t) => {
    roomAff(t, { headPitch: 0.3, lookY: -0.5 });
    const b = room.book.position.clone();
    camMove(t, 3.16, 7.7, [b.x + 0.1, b.y + 0.9, b.z + 3.4], [b.x, b.y + 0.35, b.z], [b.x - 0.05, b.y + 0.85, b.z + 3.0], [b.x, b.y + 0.35, b.z], 46);
    pinTag('paus', 'PAUS: BESAR SANGAT!', scr(b.clone().add(V(-0.5, 0.55, 0))), t, 4.2, 7.68, { bg: BLUE, pointer: 'down' }, -40);
    pinTag('semut', 'SEMUT: KECIL!', scr(b.clone().add(V(0.5, -0.55, 0))), t, 6.08, 7.68, { bg: BROWN, pointer: 'up' }, 60);
    return room;
  }],
  // S4 — "Haiwan apa paling besar dan paling kecil di dunia?"
  [7.7, 10.94, (t) => {
    roomAff(t, { ...POSES.thinkR, armL: ARM_BOOK_L, brow: -0.3, smile: 0.5 }, 0);
    closeCam(4.4);
    const hd = scr(affHead().add(V(0, 0.45, 0)));
    qmarks(t, hd, 7.75, 10.92, [[7.8, -260, 80, '#ffcf33', -12], [8.1, 250, 40, '#3fa2ff', 10], [8.4, 280, 220, '#ffcf33', 14]]);
    bubble('apa', 'PALING BESAR &\nPALING KECIL?', t, 7.8, 10.92, 430, 104, GRN);
    return room;
  }],
  // S5 — "Jom ikut Affan cari jawapan!"
  [10.94, 12.8, (t) => {
    const up = keys(t, [[10.96, 0], [11.2, 1], [12.0, 1], [12.3, 0.6]], easeOut);
    roomAff(t, { smile: 1, brow: 0.6, armR: { reach: [lerp(-0.6, -0.55, up), lerp(0.25, 1.95 + 0.06 * Math.sin(t * 14), up), lerp(0.2, 0.35, up)], pole: [-1, -0.3, -0.5] }, armL: { reach: [0.55, 0.3, 0.2] } }, 0);
    const ah = affHead();
    const k = easeIn(inv(12.0, 12.8, t));
    lookCam(ah.clone().add(V(0.15, 0.25, 5.3)).lerp(ah.clone().add(V(0.05, -0.2, 0.9)), k), ah.clone().add(V(0, -0.6, 0)), 48);
    ov.swirl(t, W / 2, 820, inv(11.05, 12.7, t));
    ov.flash(inv(12.45, 12.8, t) ** 2, '220,240,255');
    return room;
  }],
  // S6 — "Haiwan paling besar ialah paus biru!"
  [12.8, 15.82, (t) => {
    oceanSet(t);
    const wx = lerp(-18, -2, inv(12.8, 15.82, t));
    whaleAt(wx, 0.5, 0, 0.05, 0);
    lookCam(V(wx + 14, 1.5, 26), V(wx + 10, 0.2, 0), 50);
    ov.flash(1 - inv(12.8, 13.15, t));
    topTag('besar', 'HAIWAN PALING BESAR', t, 12.85, 15.8, BLUE);
    bubble('paus', 'PAUS BIRU!', t, 14.32, 15.8, 1180, 140, SEA);
    return sea;
  }],
  // S7 — "Panjangnya kira-kira 30 meter, hampir macam tiga bas sekolah!"
  [15.82, 20.92, (t) => {
    oceanSet(t, { buses: [19.26, 19.72, 20.18] });
    whaleAt(-4.2, 0.2 + 0.3 * Math.sin(t * 0.8), 0, Math.PI / 2, 0);
    camMove(t, 15.82, 20.92, [0.6, 0, 36], [0.6, 0, 0], [0.8, 0, 41], [0.8, 0, 0], 50);
    ov.flash(1 - inv(15.82, 16.1, t));
    const tail = scr(V(-7.3, -15, 0)), head = scr(V(-7.3, 15.2, 0));
    measure(tail, head, '30 METER', easeOut(inv(16.5, 17.6, t)));
    sea.buses.forEach((b, i) => {
      const q = pop(t, [19.26, 19.72, 20.18][i] + 0.1, 20.9);
      if (q.o > 0) {
        const p = scr(b.position.clone().add(V(-1.6, 0, 1.3)));
        ov.tag('bus' + i, String(i + 1), { x: p.x, y: p.y, o: q.o, s: q.s }, { bg: ORANGE });
      }
    });
    return sea;
  }],
  // S8 — "Beratnya hampir 200 tan."
  [20.92, 23.7, (t) => {
    oceanSet(t);
    whaleAt(lerp(-3, 1, inv(20.92, 23.7, t)), 0, 0, 0.04, -0.25);
    camMove(t, 20.92, 23.7, [26, -4, 22], [2, 0, 0], [24, -3.5, 19], [2, 0, 0], 50);
    ov.flash(1 - inv(20.92, 21.2, t));
    bubble('tan', 'HAMPIR\n200 TAN!', t, 21.6, 23.68, 430, 130, SEA);
    return sea;
  }],
  // S9 — "Lidahnya saja seberat seekor gajah!"
  [23.7, 26.6, (t) => {
    const wob = 0.22 * Math.exp(-2.2 * Math.max(0, t - 24.6)) * Math.cos((t - 24.6) * 6) * inv(23.9, 24.6, t);
    scaleSet(t, t < 24.6 ? lerp(0.0, 0.22, inv(23.9, 24.6, t)) : wob);
    camMove(t, 23.7, 26.6, [0, 7.0, 38], [0, 5.6, 0], [0, 6.8, 35], [0, 5.5, 0], 50);
    ov.flash(1 - inv(23.7, 24.0, t));
    pinTag('lidah', 'LIDAH PAUS', scr(sc.tongue.position.clone().add(V(0, 2.2, 0))), t, 23.75, 26.58, { bg: PINK, pointer: 'down' }, -40);
    pinTag('gajah', 'SEEKOR GAJAH', scr(sc.elephant.position.clone().add(V(0.5, 4.2, 0))), t, 25.72, 26.58, { bg: '#6a7a8a', pointer: 'down' }, -40);
    bubble('sama', 'SAMA BERAT!', t, 25.75, 26.58, 1180, 120, TINY);
    return sc;
  }],
  // S10 — "Ia haiwan paling besar pernah hidup, lebih besar daripada dinosaur!"
  [26.6, 31.38, (t) => {
    oceanSet(t, { dino: true });
    whaleAt(lerp(-6, -2, inv(26.6, 31.38, t)), 3.5, -2, 0.03, 0.12);
    camMove(t, 26.6, 31.38, [24, -3, 34], [-2, -3.5, -2], [22, -2.5, 31], [-2, -3.2, -2], 50);
    ov.flash(1 - inv(26.6, 26.9, t));
    topTag('pernah', 'PALING BESAR PERNAH HIDUP!', t, 26.65, 29.2, BLUE);
    pinTag('dino', 'DINOSAUR', scr(V(5, SEABED + 12.5, -6)), t, 29.26, 31.36, { bg: GREEN, pointer: 'down' }, -40);
    bubble('dinosaur', 'LEBIH BESAR DARIPADA\nDINOSAUR!', t, 29.9, 31.36, 1180, 88, SEA);
    return sea;
  }],
  // S11 — "Mamalia paling kecil pula ialah cencurut Etruscan."
  [31.38, 35.06, (t) => {
    tinySet(t);
    camMove(t, 31.38, 35.06, [1.6, 4.6, 15.5], [1.2, 0.8, 0], [1.3, 4.0, 13.0], [1.1, 0.8, 0], 46);
    ov.flash(1 - inv(31.38, 31.7, t));
    topTag('kecil', 'MAMALIA PALING KECIL', t, 31.42, 35.04, ORANGE);
    pinTag('cencurut', 'CENCURUT ETRUSCAN', scr(tiny.shrew.position.clone().add(V(0.6, 2.2, 0))), t, 33.26, 35.04, { bg: BROWN, pointer: 'down' }, -30);
    return tiny;
  }],
  // S12 — "Beratnya cuma 2 gram, lebih ringan daripada syiling!"
  [35.06, 38.94, (t) => {
    tinySet(t, { tilt: lerp(0, -0.2, easeOut(inv(36.9, 37.7, t))) + 0.03 * Math.sin(t * 5) * Math.exp(-2 * Math.max(0, t - 37.7)) * inv(37.7, 37.9, t) });
    lookCam(V(22.6, 4.0, 29), V(22.6, 2.9, 0), 46);
    ov.flash(1 - inv(35.06, 35.35, t));
    const [pl, pr] = tiny.bal.userData.pans;
    pinTag('gram', 'CUMA 2 GRAM', scr(pl.position.clone().add(V(22, 1.6, 0))), t, 35.9, 38.9, { bg: BROWN, pointer: 'down' }, -30);
    pinTag('syiling', 'SYILING', scr(pr.position.clone().add(V(22, 0.6, 0))), t, 37.06, 38.9, { bg: '#7a8292', pointer: 'down' }, -30);
    bubble('ringan', 'LEBIH RINGAN!', t, 37.4, 38.9, 1180, 120, TINY);
    return tiny;
  }],
  // S13 — "Tahu tak? Ada katak yang lebih kecil lagi, cuma 7 milimeter.
  //        Boleh duduk atas kuku jari kita!"
  [38.94, 46.66, (t) => {
    const nail = handSet(t, inv(40.1, 40.7, t));
    camMove(t, 38.94, 46.66, [nail.x + 1.0, nail.y + 2.4, nail.z + 4.6], [nail.x, nail.y - 0.2, nail.z - 0.6], [nail.x + 0.5, nail.y + 1.2, nail.z + 2.4], [nail.x, nail.y, nail.z - 0.3], 46);
    hf.sky.position.copy(cam.position);
    ov.flash(1 - inv(38.94, 39.25, t));
    topTag('tahu', 'TAHU TAK?', t, 38.98, 39.9, ORANGE);
    topTag('katak', 'ADA KATAK LEBIH KECIL!', t, 39.92, 42.2, GREEN);
    const f = hf.frog.position;
    const a = scr(f.clone().add(V(-0.16, 0.0, 0.1))), b = scr(f.clone().add(V(0.16, 0.0, 0.1)));
    if (t > 42.24) measure({ x: a.x, y: a.y + 90 }, { x: b.x, y: b.y + 90 }, '7 MM', easeOut(inv(42.24, 42.9, t)), '#ffffff', GREEN);
    bubble('kuku', 'BOLEH DUDUK ATAS\nKUKU JARI KITA!', t, 44.2, 46.64, 430, 96, GRN);
    return hf;
  }],
  // S14 — "Waaah,"
  [46.66, 47.56, (t) => {
    roomAff(t, { wow: keys(t, [[46.68, 0], [46.86, 1], [47.3, 1], [47.5, 0.3]]), brow: 0.8, talk: 0 });
    closeCam(4.6);
    ov.flash(1 - inv(46.66, 46.95, t));
    bubble('waah', 'WAAAH!', t, 46.7, 47.54, 430, 140);
    return room;
  }],
  // S15 — "dunia haiwan memang hebat!"
  [47.56, 49.84, (t) => {
    roomAff(t, { smile: 1, brow: 0.6, armL: { reach: [0.85, 1.55, 0.3], pole: [1, -0.6, -0.3] }, armR: { reach: [-0.85, 1.55, 0.3], pole: [-1, -0.6, -0.3] } }, 0);
    const ah = affHead();
    camMove(t, 47.56, 49.84, [ah.x + 0.4, ah.y + 0.1, ah.z + 7.4], [ah.x, ah.y - 0.9, ah.z], [ah.x + 0.3, ah.y + 0.1, ah.z + 6.6], [ah.x, ah.y - 0.9, ah.z], 48);
    ov.sparkles(t, { n: 26, seed: 72, y: 500, h: 900, a: inv(47.6, 48.0, t) });
    bubble('hebat', 'DUNIA HAIWAN\nMEMANG HEBAT!', t, 47.6, 49.82, 430, 104, GRN);
    return room;
  }],
  // S16 — "Sayangi semua haiwan, besar atau kecil, ya."
  [49.84, 53.12, (t) => {
    const cat = room.cat;
    const walk = clamp((t - 49.84) / 1.2);
    const CAT = A_STAND.clone().add(V(lerp(-3.2, -1.25, easeOut(walk)), 0, 0.75));
    roomAff(t, { yaw: -0.35, smile: 1, headPitch: 0.25, headYaw: -0.2, lean: 0.12 }, 0);
    cat.root.visible = true;
    cat.root.position.copy(CAT);
    cat.root.rotation.y = Math.PI / 2 + 0.3;
    cat.pose({ t, sit: walk >= 1 ? sm(51.0, 51.4, t) : 0, walk: walk < 1 ? t * 9 : null, headYaw: 0.2, headPitch: -0.25 * sm(51.4, 51.8, t), blink: t > 51.8 ? 0.85 : blinkAt(t, 4), tail: 1 });
    cat.root.updateMatrixWorld(true);
    const a = room.aff;
    const head = cat.headWorld().add(V(0, 0.35, 0));
    a.pose({ yaw: -0.35, blink: blinkAt(t, 1), talk: talk(t), smile: 1, headPitch: 0.3, headYaw: -0.15, lean: 0.12, armR: t > 51.2 ? { reach: a.toTorso(head.clone().add(V(Math.sin(t * 6) * 0.08, 0, 0))), pole: [-1, -0.6, -0.3] } : { reach: [-0.55, 0.3, 0.25] }, armL: { reach: [0.55, 0.3, 0.2] } });
    a.root.updateMatrixWorld(true);
    lookCam(V(-0.6, 2.4, 7.4), V(-0.6, 1.5, 0.6), 50);
    hearts(t, 420, 1000, 51.6, 53.1, 7, 2);
    bubble('sayangi', 'SAYANGI SEMUA\nHAIWAN!', t, 49.9, 53.1, 430, 110, GRN);
    return room;
  }],
  // S17 — "Apa lagi kita nak belajar lepas ni?"
  [53.12, OUTRO, (t) => {
    roomAff(t, { ...POSES.thinkR, brow: -0.2, smile: 0.7 }, 0);
    closeCam(4.4);
    const hd = scr(affHead().add(V(0, 0.45, 0)));
    qmarks(t, hd, 53.16, OUTRO - 0.05, [[53.2, -260, -100, '#ffcf33', -12], [53.5, 250, -160, '#3fa2ff', 10], [53.8, 300, 60, '#ffcf33', 14]]);
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

// Cover / thumbnail (9:16): the blue whale beside three stacked school buses.
function thumbnail() {
  ov.begin();
  cam.aspect = W / H;
  cam.updateProjectionMatrix();
  const t = 21.0;
  oceanSet(t, { buses: [0, 0, 0] });
  whaleAt(-4.2, 0.2, 0, Math.PI / 2, 0);
  lookCam(V(0.8, -3, 40), V(0.8, -3, 0), 52);
  sea.sky.position.copy(cam.position);
  renderer.setViewport(0, 0, W, H);
  renderer.render(sea.scene, cam);
  ov.vignette(0.3);
  ov.tag('thBadge', 'EPISOD 72', { x: W / 2, y: 300 }, { bg: '#2f7bff', small: true });
  ov.bubble('thTitle', 'HAIWAN PALING', { x: W / 2, y: 440, r: -3 }, { size: 108 });
  ov.bubble('thTitle2', 'BESAR & KECIL?', { x: W / 2, y: 580, r: 2 }, { size: 116, ...SEA });
  drawLogo(ov, { y: 1460, scale: 0.5 });
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
