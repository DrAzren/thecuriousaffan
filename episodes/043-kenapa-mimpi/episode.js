// THE CURIOUS AFFAN — Episode 043: "Kenapa Kita Mimpi Bila Tidur?"
// Every shot is a pure function of time t (seconds), synced to audio/narration.mp3.
import * as THREE from 'three';
import { makeRenderer, loadEnvelope, toScreen, clamp, lerp, inv, easeOut, easeIn, easeInOut, keys, rng, W, H } from '../../shared/core.js';
import { POSES, blinkAt } from '../../shared/affan.js';
import { Overlay, pop, ICONS, drawLogo } from '../../shared/overlay.js';
import { CAPTIONS, KEYWORDS } from './captions.js';
import { buildBedroom, buildDreamSky, buildMind, buildOutro, BRAIN, BED, MATTRESS_Y, AFF_S, SHELF, KINDS } from './worlds.js';

const FPS = 30;
const DURATION = 74.05;
const OUTRO = 70.9;

const stage = document.getElementById('stage');
const canvas = document.createElement('canvas');
stage.appendChild(canvas);
const renderer = makeRenderer(canvas);
const ov = new Overlay(stage);
const room = buildBedroom();
const sky = buildDreamSky();
const mind = buildMind();
const outro = buildOutro();
const cam = new THREE.PerspectiveCamera(50, W / H, 0.02, 6000);
let env = { at: () => 0 };

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const talk = (t) => clamp(env.at(t) * 1.2);
const scr = (p) => toScreen(p, cam);
const mix3 = (a, b, k) => a.map((v, i) => lerp(v, b[i], k));
const BLUE = '#2f9bff', ORANGE = '#ff8a3d', PURPLE = '#7a5cf0', GREEN = '#2fbf5f', PINK = '#ff5c9a', YELLOW = '#e0b400';

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
function zzz(t, p, a, b) {
  if (t < a || t > b) return;
  for (let i = 0; i < 3; i++) {
    const u = ((t - a) * 0.45 + i / 3) % 1;
    const o = Math.sin(u * Math.PI) * clamp((t - a) / 0.4) * clamp((b - t) / 0.3);
    ov.html('z' + i, `<div style="font:800 ${60 + i * 18}px 'Baloo 2';color:#cfe0ff;-webkit-text-stroke:6px #17256b;paint-order:stroke">Z</div>`, { x: p.x + 60 + u * 120 + i * 20, y: p.y - 40 - u * 220, o, s: 0.8 + u * 0.4, r: -10 + i * 8 });
  }
}

// ================================================================== bedroom
const affHead = () => room.aff.parts.head.getWorldPosition(V());
// sitting up in bed, legs under the blanket, turned towards the camera
function sitAff(t, p = {}) {
  room.outer.position.set(BED.x - 0.95, MATTRESS_Y - 0.98 * AFF_S + 0.02, BED.z + 0.1);
  room.outer.rotation.set(0, 0, 0);
  room.inner.rotation.set(0, 0, 0);
  room.blanket.scale.set(1, 1, 1);
  room.blanket.position.y = 1.02;
  const a = room.aff;
  a.pose({ yaw: 0.85, blink: blinkAt(t, 1), talk: talk(t), smile: 0.9, legL: { x: -1.5, knee: 0 }, legR: { x: -1.5, knee: 0 }, armL: { reach: [0.5, 0.45, 0.45] }, armR: { reach: [-0.5, 0.45, 0.45] }, ...p });
  room.outer.updateMatrixWorld(true);
}
// lying asleep on his back, head on the pillow
function lieAff(t, p = {}) {
  room.outer.position.set(BED.x + 1.15, MATTRESS_Y + 0.16, BED.z);
  room.outer.rotation.set(0, Math.PI / 2, 0);
  room.inner.rotation.set(-Math.PI / 2, 0, 0);
  room.blanket.scale.set(1, 1.7, 1);
  room.blanket.position.y = 1.12;
  const a = room.aff;
  a.pose({ yaw: 0, blink: 1, talk: 0, smile: 0.7, headPitch: -0.15, armL: { reach: [0.45, 0.4, 0.35] }, armR: { reach: [-0.45, 0.4, 0.35] }, ...p });
  room.outer.updateMatrixWorld(true);
}
function roomReset() {
  room.brain.visible = false;
  room.dream.g.visible = false;
}
// the dream bubble above the sleeping head (k 0..1 grows)
function dreamAbove(t, k, { y = 1.25, x = 0.15 } = {}) {
  const d = room.dream;
  d.g.visible = k > 0.01;
  if (!d.g.visible) return;
  const h = affHead();
  d.g.position.copy(h).add(V(x, y, 0.2));
  d.g.scale.setScalar(easeOut(clamp(k)));
  d.trail.forEach((s, i) => s.position.set(-x * (0.25 + i * 0.25), -y * (0.25 + i * 0.28) - 0.6, -0.1));
  room.dd.root.position.set(0.0, -0.05 + 0.06 * Math.sin(t * 3), 0);
  room.dd.root.rotation.y = 0.9 + 0.3 * Math.sin(t);
  room.dd.setWings(t * 7);
  room.da.root.position.set(-0.03, 0.06 + 0.06 * Math.sin(t * 3), -0.02);
  room.da.root.rotation.y = 0.9 + 0.3 * Math.sin(t);
  room.da.pose({ ...POSES.seated, smile: 1, armR: { reach: [-0.6, 1.4, 0.3] } });
}
// a sleep-cycle chart (hypnogram), drawn on the overlay
const STAGE_Y = { R: 0, L: 1, D: 2 };
const CYCLE = ['L', 'D', 'L', 'R'];
function hypno(t, a, b, prog, { y0 = 560, hl = -1 } = {}) {
  const q = pop(t, a, b);
  if (q.o <= 0) return;
  const g = ov.g;
  const x0 = 360, w = 590, h = 260;
  g.save();
  g.globalAlpha = q.o;
  g.fillStyle = 'rgba(255,255,255,0.92)';
  g.strokeStyle = '#17256b';
  g.lineWidth = 8;
  g.beginPath();
  g.roundRect(90, y0 - 70, 900, h + 150, 30);
  g.fill();
  g.stroke();
  g.font = "800 28px 'Baloo 2'";
  g.textAlign = 'left';
  ['MIMPI (REM)', 'TIDUR RINGAN', 'TIDUR NYENYAK'].forEach((s, i) => {
    g.fillStyle = i === 0 ? '#ff5c9a' : '#17256b';
    g.fillText(s, 120, y0 + 30 + i * (h / 2 - 10));
  });
  // the line
  const N = 5, segW = w / (N * 4);
  const pts = [];
  for (let c = 0; c < N; c++) CYCLE.forEach((s, k) => pts.push([x0 + (c * 4 + k) * segW, y0 + 20 + STAGE_Y[s] * (h / 2 - 10), s]));
  pts.push([x0 + w, y0 + 20 + STAGE_Y.L * (h / 2 - 10), 'L']);
  const px = x0 + w * clamp(prog);
  for (let i = 0; i < pts.length - 1; i++) {
    const [xa, ya, s] = pts[i];
    const [xb] = pts[i + 1];
    if (xa > px) break;
    const xe = Math.min(xb, px);
    g.strokeStyle = s === 'R' ? '#ff5c9a' : '#4a7aff';
    g.lineWidth = s === 'R' ? 18 : 12;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(xa, ya);
    g.lineTo(xe, ya);
    if (xe === xb) g.lineTo(xb, pts[i + 1][1]);
    g.stroke();
  }
  // first cycle bracket
  if (hl >= 0) {
    const ha = pop(t, hl, b);
    g.globalAlpha = q.o * ha.o;
    g.strokeStyle = '#2fbf5f';
    g.lineWidth = 8;
    g.beginPath();
    g.moveTo(x0, y0 + h + 40);
    g.lineTo(x0, y0 + h + 60);
    g.lineTo(x0 + 4 * segW, y0 + h + 60);
    g.lineTo(x0 + 4 * segW, y0 + h + 40);
    g.stroke();
    g.fillStyle = '#2fbf5f';
    g.font = "800 34px 'Baloo 2'";
    g.textAlign = 'left';
    g.fillText('90 MINIT', x0 + 4 * segW + 16, y0 + h + 68);
  }
  g.restore();
}

// ================================================================ dream sky
function skyFly(t, base = 0) {
  const d = sky.dragon;
  const x = (t - base) * 3.2;
  d.root.position.set(x, 1.2 * Math.sin(t * 1.3), 0);
  d.root.rotation.set(0.1 * Math.sin(t * 1.3 + 1), Math.PI / 2, 0.12 * Math.sin(t * 0.9));
  d.setWings(t * 6);
  d.head.rotation.set(0.1 * Math.sin(t * 2), 0, 0);
  sky.aff.pose({ ...POSES.seated, yaw: -0.9, blink: blinkAt(t, 2), talk: talk(t), smile: 1, wow: 0.3, armR: { reach: [-0.7, 1.5, 0.3 + 0.1 * Math.sin(t * 9)], pole: [-1, -0.5, -0.4] }, armL: { reach: [0.35, 0.45, 0.5] } });
  d.root.updateMatrixWorld(true);
  return d.root.position.clone();
}

// =============================================================== mind stage
const A_M = V(0.35, 0, 0.6);
function mindAff(t, p = {}) {
  mind.aff.root.position.copy(A_M);
  mind.aff.pose({ yaw: 0.25, blink: blinkAt(t, 2), talk: talk(t), smile: 0.9, ...p });
  mind.aff.root.updateMatrixWorld(true);
}
function mindIdle(t) {
  mind.brain.position.copy(BRAIN).add(V(0, 0.08 * Math.sin(t * 1.4), 0));
  mind.brain.rotation.set(0, 0.1 * Math.sin(t * 0.7), 0.025 * Math.sin(t * 0.9));
  mind.trail.forEach((m, i) => m.scale.setScalar(1 + 0.12 * Math.sin(t * 3 + i)));
  mind.cerebGlow.material.opacity = 0;
  mind.sig.forEach((s) => (s.visible = false));
  mind.copy.forEach((s) => (s.visible = false));
  mind.dream.g.visible = false;
}
const DREAM_AT = V(-0.9, 4.6, 1.6);
// boxes: orbit the brain, fly to the shelf in order, then jump out and mix into a dream
function boxes(t) {
  mind.boxes.forEach((b, i) => {
    const a = t * 0.6 + (i / KINDS.length) * Math.PI * 2;
    const orbit = BRAIN.clone().add(V(Math.cos(a) * 3.0, -1.9 + 0.5 * Math.sin(a * 1.7), Math.sin(a) * 1.4 + 0.6));
    const slot = mind.slots[i];
    const ts = 38.9 + i * 0.5;
    const toShelf = easeInOut(inv(ts, ts + 0.7, t));
    const out = easeInOut(inv(42.48 + i * 0.12, 43.6 + i * 0.12, t));
    const mixC = DREAM_AT.clone().add(V(Math.cos(t * 3 + i) * 0.7, Math.sin(t * 2.4 + i * 2) * 0.5, Math.sin(t * 3 + i) * 0.4));
    let p = orbit.clone().lerp(slot, toShelf);
    if (out > 0) p = slot.clone().lerp(mixC, out);
    b.g.position.copy(p);
    b.g.rotation.set(0.2 * Math.sin(t + i) * (1 - toShelf + out), (1 - toShelf) * (t + i) + out * t * 2, 0);
    b.g.visible = t < 44.6;
    b.mem.rotation.y = t * 1.5;
    b.mem.position.y = 0.62 + out * 0.4;
  });
  // the dream bubble with mixed-up memories
  const k = easeOut(inv(44.3, 45.0, t));
  const d = mind.dream;
  d.g.visible = k > 0.01;
  if (d.g.visible) {
    d.g.position.copy(DREAM_AT);
    d.g.scale.setScalar(k);
    d.trail.forEach((s, i) => s.position.set(0.5 + i * 0.4, -1.6 - i * 0.5, -0.2));
    mind.boxes.forEach((b, i) => {
      b.g.visible = true;
      const a = t * 1.6 + (i / KINDS.length) * Math.PI * 2;
      b.g.position.copy(DREAM_AT).add(V(Math.cos(a) * 0.75, Math.sin(a * 1.3) * 0.5, Math.sin(a) * 0.5));
      b.g.scale.setScalar(0.65);
      b.g.rotation.set(t, t * 1.3, 0);
    });
  } else mind.boxes.forEach((b) => b.g.scale.setScalar(1));
}

// ======================================================================= SHOTS
const SHOTS = [
  // S1 — morning: Affan sits up in bed, wide awake
  [0, 2.28, (t) => {
    roomReset();
    room.setTime(0);
    sitAff(t, { smile: 1, brow: 0.3 });
    camMove(t, 0, 2.28, [1.6, 2.6, 5.8], [-0.5, 1.4, -0.6], [1.4, 2.4, 5.0], [-0.5, 1.5, -0.6], 50);
    const q = pop(t, 0.4, 2.2);
    ov.tag('ep', 'EPISOD 43', { x: W / 2, y: 268, o: q.o, s: q.s }, { bg: '#2f7bff', small: true });
    return room;
  }],
  // S2 — "Papa! Malam tadi Affan terbang naik naga!" (the dream)
  [2.28, 5.84, (t) => {
    const p = skyFly(t, 2.28);
    camMove(t, 2.28, 5.84, [p.x - 2.0, p.y + 1.6, 8.5], [p.x, p.y + 0.6, 0], [p.x - 1.0, p.y + 1.3, 7.2], [p.x + 0.4, p.y + 0.7, 0], 50);
    ov.flash((1 - inv(2.28, 2.6, t)) * 0.8, '240,220,255');
    ov.sparkles(t, { n: 30, seed: 43, y: 250, h: 1100, a: 0.8, colors: ['#ffffff', '#ffe8a8', '#ffc8f0'] });
    const pp = pop(t, 2.28, 3.0, { from: 2 });
    ov.bubble('papa', 'PAPA!', { x: 800, y: 470, o: pp.o, s: pp.s * 0.8, r: 6 }, { size: 110 });
    bubble('naga', 'NAIK NAGA!', t, 4.6, 5.8, 430, 140, { top: '#d8ffe8', bot: '#2fbf7f' }, -3);
    return sky;
  }],
  // S3 — "Tapi... bila bangun, Affan atas katil je."
  [5.84, 9.34, (t) => {
    roomReset();
    room.setTime(0);
    const look = Math.sin((t - 6.3) * 2.2) * inv(6.3, 6.6, t) * (1 - inv(7.4, 7.7, t));
    sitAff(t, { brow: 0.6, smile: 0.4, wow: keys(t, [[5.9, 0], [6.1, 0.8], [6.8, 0.8], [7.1, 0]]), headYaw: 0.5 * look, lookX: 0.6 * look });
    const ah = affHead();
    camMove(t, 5.84, 9.34, [ah.x + 1.9, ah.y + 0.5, ah.z + 3.3], [ah.x, ah.y - 0.35, ah.z], [ah.x + 1.6, ah.y + 0.4, ah.z + 2.8], [ah.x, ah.y - 0.3, ah.z], 46);
    ov.flash((1 - inv(5.84, 6.2, t)) * 0.9, '255,250,235');
    bubble('katil', 'ATAS KATIL JE?', t, 7.56, 9.3, 430, 116, { top: '#e0ecff', bot: '#4a7aff' });
    return room;
  }],
  // S4 — "Kenapa kita mimpi bila tidur?"
  [9.34, 11.38, (t) => {
    roomReset();
    room.setTime(0);
    sitAff(t, { ...POSES.thinkR, brow: -0.3, smile: 0.5 });
    const ah = affHead();
    lookCam(V(ah.x + 1.6, ah.y + 0.4, ah.z + 2.8), V(ah.x, ah.y - 0.3, ah.z), 46);
    const hd = scr(ah.clone().add(V(0, 0.3, 0)));
    qmarks(t, hd, 9.34, 11.35, [[9.4, -260, 120, '#ffcf33', -12], [9.7, 250, 80, '#3fa2ff', 10], [10.0, 280, 260, '#ffcf33', 14]]);
    bubble('kenapa', 'KENAPA MIMPI?', t, 9.34, 11.35, 430, 116, { top: '#efe0ff', bot: '#8a5cff' });
    return room;
  }],
  // S5 — "Jom ikut Affan cari jawapan!" swirl
  [11.38, 13.12, (t) => {
    roomReset();
    const night = easeInOut(inv(12.2, 13.1, t));
    room.setTime(night);
    const up = keys(t, [[11.4, 0], [11.6, 1], [12.7, 1], [13.0, 0.6]], easeOut);
    sitAff(t, { smile: 1, brow: 0.6, armR: { reach: [lerp(-0.6, -0.55, up), lerp(0.25, 1.95 + 0.06 * Math.sin(t * 14), up), lerp(0.2, 0.35, up)], pole: [-1, -0.3, -0.5] } });
    const ah = affHead();
    const k = easeIn(inv(11.8, 13.12, t));
    lookCam(V(ah.x + 1.6, ah.y + 0.4, ah.z + 2.8).lerp(ah.clone().add(V(0.2, 0.1, 0.5)), k), V(ah.x, ah.y - 0.3, ah.z).lerp(ah, k), 46);
    ov.swirl(t, W / 2, 820, inv(11.6, 13.0, t));
    ov.flash(inv(12.7, 13.12, t) ** 2, '30,30,80');
    return room;
  }],
  // S6 — night: the body rests, but the brain keeps working
  [13.12, 20.2, (t) => {
    roomReset();
    room.setTime(1);
    lieAff(t);
    const b = room.brain;
    const k = easeOut(inv(15.8, 16.4, t));
    b.visible = k > 0.01;
    const h = affHead();
    b.position.copy(h).add(V(0.1, 0.85 + 0.05 * Math.sin(t * 2), 0.1));
    b.scale.setScalar(k * (1 + 0.04 * Math.sin(t * 6)));
    room.gears.forEach((g, i) => (g.rotation.z = t * (i % 2 ? -3 : 3) * (t > 17.9 ? 2 : 1)));
    if (t < 15.7) camMove(t, 13.12, 15.7, [0.6, 2.7, 5.8], [-0.2, 1.1, -0.6], [0.2, 2.6, 4.6], [-0.5, 1.2, -0.6], 50);
    else camMove(t, 15.7, 20.2, [0.2, 2.6, 4.6], [-0.5, 1.2, -0.6], [-0.4, 2.7, 3.4], [-0.8, 1.6, -0.6], 48);
    ov.flash(1 - inv(13.12, 13.5, t), '30,30,80');
    zzz(t, scr(h.clone().add(V(0, 0.3, 0))), 13.3, 15.6);
    topTag('rehat', 'BADAN BEREHAT', t, 14.6, 15.7, BLUE);
    pinTag('otak', 'OTAK TAK TIDUR!', scr(b.position.clone().add(V(0, 0.5, 0))), t, 16.2, 17.85, { bg: PINK, pointer: 'down' }, -40);
    topTag('kerja', 'OTAK BEKERJA SEPANJANG MALAM', t, 17.9, 20.15, PURPLE);
    return room;
  }],
  // S7 — sleep comes in cycles of about 90 minutes
  [20.2, 24.98, (t) => {
    roomReset();
    room.setTime(1);
    lieAff(t);
    camMove(t, 20.2, 24.98, [0.8, 3.4, 7.2], [0, 1.0, -0.6], [0.6, 3.2, 6.6], [0, 0.9, -0.6], 50);
    hypno(t, 20.3, 24.95, easeInOut(inv(20.6, 24.4, t)), { hl: 22.66 });
    topTag('pusing', 'PUSINGAN TIDUR', t, 20.88, 24.9, BLUE, 330);
    return room;
  }],
  // S8 — REM: the eyes move fast under the eyelids, and that's when we usually dream
  [24.98, 35.68, (t) => {
    lieAff(t);
    room.setTime(1);
    room.brain.visible = false;
    dreamAbove(t, inv(33.1, 33.7, t));
    const h = affHead();
    if (t < 33.0) {
      cam.up.set(-1, 0, 0);
      camMove(t, 24.98, 33.0, [h.x + 0.45, h.y + 2.7, h.z + 0.4], h.clone().add(V(0.45, 0, 0.05)).toArray(), [h.x + 0.4, h.y + 2.4, h.z + 0.35], h.clone().add(V(0.4, 0, 0.05)).toArray(), 46);
    } else camMove(t, 33.0, 35.68, [h.x + 0.4, h.y + 2.2, h.z + 1.6], h.clone().add(V(0.15, 0, 0)).toArray(), [h.x + 0.6, h.y + 1.6, h.z + 3.6], h.clone().add(V(0.3, 1.0, 0)).toArray(), 50);
    ov.flash((1 - inv(24.98, 25.25, t)) * 0.5, '30,30,80');
    // fast eye movement marks over the closed eyes
    const rem = inv(26.6, 26.9, t) * (1 - inv(32.8, 33.1, t));
    if (rem > 0) {
      for (const s of [-1, 1]) {
        const e = scr(room.aff.parts.head.localToWorld(V(0.2 * s, 0.15, 0.62)));
        const dx = 26 * Math.sin(t * 22 + s);
        ov.line(e.x - 36 + dx, e.y - 44, e.x + 36 + dx, e.y - 44, { color: '#ff8ac8', w: 8, a: rem });
        ov.line(e.x + 36 + dx, e.y - 44, e.x + 22 + dx, e.y - 56, { color: '#ff8ac8', w: 8, a: rem });
        ov.line(e.x - 36 + dx, e.y - 44, e.x - 22 + dx, e.y - 32, { color: '#ff8ac8', w: 8, a: rem });
      }
    }
    topTag('bahagian', 'SATU BAHAGIAN TIDUR', t, 24.98, 26.6, BLUE);
    topTag('laju', 'MATA BERGERAK LAJU-LAJU!', t, 26.66, 30.35, PINK);
    pinTag('kelopak', 'BAWAH KELOPAK MATA', scr(h.clone().add(V(0, 0.2, 0.3))), t, 28.28, 30.35, { bg: BLUE, pointer: 'down' }, -110);
    bubble('rem', 'R.E.M', t, 31.0, 33.05, 430, 170, { top: '#ffe0f0', bot: '#ff5ca8' });
    bubble('mimpi', 'MASA BERMIMPI!', t, 34.2, 35.65, 430, 116, { top: '#efe0ff', bot: '#8a5cff' });
    return room;
  }],
  // S9 — the brain sorts the day's memories like tidying a wardrobe; they mix into odd dreams
  [35.68, 46.52, (t) => {
    mindIdle(t);
    boxes(t);
    mindAff(t, { lookY: 0.5, headPitch: -0.2, lookX: 0.3, wow: keys(t, [[44.5, 0], [44.8, 0.7], [45.6, 0.7], [45.9, 0]]) });
    if (t < 38.9) camMove(t, 35.68, 38.9, [0.8, 4.8, 13.6], [0.6, 4.6, -0.5], [1.4, 4.4, 13.0], [1.2, 4.2, -0.5], 50);
    else if (t < 42.48) camMove(t, 38.9, 42.48, [1.4, 4.4, 13.0], [1.2, 4.2, -0.5], [2.6, 3.0, 9.6], [3.0, 2.0, -0.6], 50);
    else camMove(t, 42.48, 46.52, [2.6, 3.0, 9.6], [3.0, 2.0, -0.6], [0.0, 4.6, 10.4], [-0.6, 4.4, 0.6], 50);
    ov.flash(1 - inv(35.68, 36.0, t));
    topTag('saintis', 'SAINTIS PERCAYA...', t, 35.68, 38.85, PURPLE);
    pinTag('ingatan', 'INGATAN HARI TU', scr(mind.boxes[2].g.position.clone().add(V(0, 1.0, 0))), t, 39.0, 40.9, { bg: ORANGE, pointer: 'down' }, -30);
    bubble('almari', 'MACAM KEMAS ALMARI!', t, 40.92, 42.45, 420, 100, { top: '#fff0d8', bot: '#ff9a3d' });
    topTag('campur', 'KOTAK-KOTAK INGATAN BERCAMPUR...', t, 42.48, 44.45, PURPLE);
    bubble('pelik', 'MIMPI PELIK-PELIK!', t, 44.5, 46.48, 420, 108, { top: '#efe0ff', bot: '#8a5cff' }, 3);
    return mind;
  }],
  // S10 — we dream several times a night, but forget most of them when we wake
  [46.52, 54.04, (t) => {
    roomReset();
    const morning = easeInOut(inv(50.1, 50.8, t));
    room.setTime(1 - morning);
    const awake = t > 50.85;
    if (!awake) {
      lieAff(t);
      // four short dreams pop up and fade during the night
      let k = 0;
      [47.3, 48.2, 49.0, 49.7].forEach((a) => {
        k = Math.max(k, Math.sin(clamp((t - a) / 0.75) * Math.PI));
      });
      dreamAbove(t, k);
    } else {
      sitAff(t, { brow: 0.4, smile: 0.5, headRoll: 0.1 * Math.sin(t * 2), lookY: 0.4 });
      const fade = 1 - inv(51.0, 52.6, t);
      dreamAbove(t, fade * 0.9, { y: 1.4, x: 0.5 });
      if (room.dream.g.visible) room.dream.g.scale.setScalar(0.9 * fade + 0.1 * Math.sin(t * 20) * fade);
    }
    const h = affHead();
    if (!awake) camMove(t, 46.52, 50.85, [0.6, 3.1, 6.2], [-0.4, 1.4, -0.6], [0.4, 3.0, 5.6], [-0.4, 1.6, -0.6], 50);
    else lookCam(V(h.x + 1.8, h.y + 0.6, h.z + 3.4), V(h.x + 0.2, h.y + 0.1, h.z), 48);
    ov.flash((1 - inv(46.52, 46.8, t)) * 0.5, '30,30,80');
    topTag('tahu', 'TAHU TAK?', t, 46.52, 47.3, PURPLE);
    const n = [47.3, 48.2, 49.0, 49.7].filter((a) => t >= a).length;
    if (n > 0 && t < 50.4) {
      const q = pop(t, 47.3, 50.3);
      ov.tag('count', `MIMPI KE-${n}`, { x: W / 2, y: 410, o: q.o, s: q.s }, { bg: PURPLE });
    }
    bubble('beberapa', 'BEBERAPA KALI SEMALAM!', t, 48.24, 50.1, 520, 96, { top: '#efe0ff', bot: '#8a5cff' });
    topTag('pagi', 'PAGI...', t, 50.16, 51.6, ORANGE);
    bubble('lupa', 'DAH LUPA!', t, 52.6, 54.0, 430, 140, { top: '#ffe0e0', bot: '#ff6a7a' }, 3);
    if (awake) qmarks(t, scr(h.clone().add(V(0, 0.4, 0))), 51.6, 54.0, [[51.7, -240, -40, '#ffcf33', -12], [52.0, 240, -100, '#3fa2ff', 10]]);
    return room;
  }],
  // S11 — scientists are still studying why we dream: lots of secrets
  [54.04, 60.12, (t) => {
    mindIdle(t);
    mind.boxes.forEach((b) => (b.g.visible = false));
    mindAff(t, { ...POSES.thinkR, lookY: 0.6, headPitch: -0.25, brow: 0.4 });
    camMove(t, 54.04, 60.12, [0.4, 5.4, 12.0], [0.0, 5.6, -0.6], [0.2, 6.0, 10.4], [0.0, 6.1, -0.8], 50);
    ov.flash(1 - inv(54.04, 54.35, t));
    const bp = scr(BRAIN.clone().add(V(0, 0.4, 0)));
    qmarks(t, bp, 55.1, 60.0, [[55.2, -300, -40, '#ffcf33', -12], [55.6, 290, -120, '#3fa2ff', 10], [56.0, -220, 260, '#ff5c9a', 8], [56.4, 260, 230, '#ffcf33', -10]]);
    topTag('kaji', 'SAINTIS MASIH MENGKAJI', t, 55.12, 57.95, BLUE);
    bubble('rahsia', 'MASIH BANYAK RAHSIA!', t, 58.0, 60.05, 420, 104, { top: '#efe0ff', bot: '#8a5cff' });
    return mind;
  }],
  // S12 — "Waaah, rupanya otak kita sibuk... Ingat, tidur awal dan cukup"
  [60.12, 68.66, (t) => {
    roomReset();
    const night = easeInOut(inv(64.0, 64.8, t));
    room.setTime(night);
    const lie = t > 64.8;
    if (!lie) sitAff(t, { wow: keys(t, [[60.15, 0], [60.3, 0.9], [60.9, 0.9], [61.2, 0]]), smile: 1, brow: 0.5 });
    else lieAff(t, { blink: t < 66.6 ? blinkAt(t, 1) : 1, smile: 1 });
    const h = affHead();
    if (!lie) lookCam(V(h.x + 1.6, h.y + 0.4, h.z + 2.9), V(h.x, h.y - 0.35, h.z), 46);
    else camMove(t, 64.8, 68.66, [0.6, 3.0, 5.6], [-0.4, 1.3, -0.6], [0.3, 2.8, 4.8], [-0.6, 1.3, -0.6], 50);
    ov.flash((1 - inv(60.12, 60.45, t)) * 0.9, '255,250,235');
    const hd = scr(h.clone().add(V(0, 0.5, 0)));
    const b = pop(t, 60.15, 63.95);
    if (!lie) ov.html('bulb', ICONS.bulb(), { x: clamp(hd.x + 200, 150, 900), y: clamp(hd.y - 160, 300, 900) + Math.sin(t * 5) * 8, o: b.o, s: b.s * 0.6, r: 10 });
    ov.sparkles(t, { n: 30, seed: 12, y: 250, h: 900, a: inv(60.2, 60.5, t) * (1 - inv(62.4, 63.0, t)) });
    bubble('sibuk', 'OTAK SIBUK\nWALAUPUN TIDUR!', t, 61.5, 63.95, 440, 100, { top: '#ffe0f0', bot: '#ff5ca8' });
    bubble('awal', 'TIDUR AWAL\n& CUKUP!', t, 64.04, 68.6, 440, 110, { top: '#e0ecff', bot: '#4a7aff' });
    topTag('jam', 'KANAK-KANAK: 9–12 JAM SEMALAM', t, 65.58, 68.6, PURPLE, 640);
    if (lie) zzz(t, scr(h.clone().add(V(0, 0.3, 0))), 66.7, 68.6);
    return room;
  }],
  // S13 — "Apa lagi kita nak belajar lepas ni?"
  [68.66, OUTRO, (t) => {
    roomReset();
    room.setTime(0);
    const tk = keys(t, [[68.7, 0], [69.1, 1]]);
    const th2 = POSES.thinkR.armR;
    sitAff(t, { smile: 1, brow: 0.3 + 0.4 * tk, headRoll: -0.12 * tk, lookX: 0.35 * tk, lookY: 0.4 * tk, headPitch: -0.08 * tk, armR: { reach: mix3([-0.5, 0.45, 0.45], th2.reach, tk), pole: th2.pole, point: tk, wx: th2.wx * tk } });
    const h = affHead();
    lookCam(V(h.x + 1.6, h.y + 0.4, h.z + 2.8), V(h.x, h.y - 0.35, h.z), 46);
    ov.flash((1 - inv(68.66, 68.95, t)) * 0.7, '255,250,235');
    const hd = scr(h.clone().add(V(0, 0.4, 0)));
    qmarks(t, hd, 68.66, OUTRO - 0.05, [[68.7, -260, -100, '#ffcf33', -12], [69.0, 250, -160, '#3fa2ff', 10], [69.3, 300, 60, '#ffcf33', 14]]);
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
  if (w.stars) w.stars.position.copy(cam.position);
  renderer.setViewport(0, 0, W, H);
  renderer.render(w.scene, cam);
  if (w !== outro) ov.vignette(0.2);
  ov.captions(t, CAPTIONS, KEYWORDS);
  ov.end();
}

// Cover / thumbnail (9:16): Affan riding the dragon in the dream sky.
function thumbnail() {
  ov.begin();
  cam.aspect = W / H;
  cam.updateProjectionMatrix();
  const t = 4.4;
  const p = skyFly(t, 2.28);
  lookCam(V(p.x - 1.4, p.y + 1.0, 6.6), V(p.x + 0.2, p.y + 0.2, 0), 50);
  sky.sky.position.copy(cam.position);
  sky.stars.position.copy(cam.position);
  renderer.setViewport(0, 0, W, H);
  renderer.render(sky.scene, cam);
  const g = ov.g;
  const top = g.createLinearGradient(0, 0, 0, 720);
  top.addColorStop(0, 'rgba(20,10,50,0.5)');
  top.addColorStop(1, 'rgba(20,10,50,0)');
  g.fillStyle = top;
  g.fillRect(0, 0, W, 720);
  const bot = g.createLinearGradient(0, H - 900, 0, H);
  bot.addColorStop(0, 'rgba(20,10,50,0)');
  bot.addColorStop(1, 'rgba(20,10,50,0.55)');
  g.fillStyle = bot;
  g.fillRect(0, H - 900, W, 900);
  ov.vignette(0.3);
  ov.sparkles(4.4, { n: 30, seed: 43, y: 250, h: 1100, a: 0.8, colors: ['#ffffff', '#ffe8a8', '#ffc8f0'] });
  ov.tag('thBadge', 'EPISOD 43', { x: W / 2, y: 300 }, { bg: '#2f7bff', small: true });
  ov.bubble('thTitle', 'AFFAN NAIK', { x: W / 2, y: 445, r: -3 }, { size: 120 });
  ov.bubble('thTitle2', 'NAGA?!', { x: W / 2, y: 600, r: 2 }, { size: 170, top: '#d8ffe8', bot: '#2fbf7f' });
  ov.html('thQ', ICONS.qmark('#ffcf33'), { x: 930, y: 790, r: 14, s: 0.9 });
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
