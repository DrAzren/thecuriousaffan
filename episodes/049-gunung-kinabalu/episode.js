// THE CURIOUS AFFAN — Episode 049: "Berapa Tinggi Gunung Kinabalu?"
// Every shot is a pure function of time t (seconds), synced to audio/narration.mp3.
import * as THREE from 'three';
import { makeRenderer, loadEnvelope, toScreen, clamp, lerp, inv, easeOut, easeIn, easeInOut, keys, W, H } from '../../shared/core.js';
import { POSES, blinkAt } from '../../shared/affan.js';
import { Overlay, pop, ICONS, drawLogo } from '../../shared/overlay.js';
import { CAPTIONS, KEYWORDS } from './captions.js';
import { buildKundasang, buildMeasure, buildClimb, buildSummit, buildNight, buildPitcher, buildOutro, SLOPE, M_H, A_KD, HUT } from './worlds.js';

const FPS = 30;
const DURATION = 70.15;
const OUTRO = 67.0;

const stage = document.getElementById('stage');
const canvas = document.createElement('canvas');
stage.appendChild(canvas);
const renderer = makeRenderer(canvas);
const ov = new Overlay(stage);
const kd = buildKundasang();
const ms = buildMeasure();
const cl = buildClimb();
const sm = buildSummit();
const nt = buildNight();
const pc = buildPitcher();
const outro = buildOutro();
const cam = new THREE.PerspectiveCamera(50, W / H, 0.05, 6000);
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
// a thermometer card on the right: temperature T in °C (0..32)
function thermo(T, a, x = 930, y = 760) {
  if (a <= 0) return;
  const g = ov.g;
  g.save();
  g.globalAlpha = a;
  g.fillStyle = 'rgba(15,25,50,0.55)';
  g.beginPath();
  g.roundRect(x - 80, y - 300, 160, 470, 40);
  g.fill();
  g.fillStyle = '#ffffff';
  g.beginPath();
  g.roundRect(x - 22, y - 260, 44, 330, 22);
  g.fill();
  g.beginPath();
  g.arc(x, y + 90, 46, 0, Math.PI * 2);
  g.fill();
  const k = clamp(T / 32);
  const col = k > 0.5 ? '#ff5c4a' : k > 0.2 ? '#ffb347' : '#3fa2ff';
  g.fillStyle = col;
  g.beginPath();
  g.arc(x, y + 90, 34, 0, Math.PI * 2);
  g.fill();
  g.fillRect(x - 12, y + 60 - 310 * k, 24, 310 * k + 30);
  g.font = '800 46px "Baloo 2"';
  g.textAlign = 'center';
  g.fillStyle = '#ffffff';
  g.fillText(`${Math.round(T)}°C`, x, y - 240 - 14);
  g.restore();
}
const walkLegs = (t, k, f = 9) => ({ legL: { x: 0.45 * Math.sin(t * f) * k, knee: 0.35 * Math.max(0, -Math.sin(t * f)) * k }, legR: { x: -0.45 * Math.sin(t * f) * k, knee: 0.35 * Math.max(0, Math.sin(t * f)) * k }, bob: 0.06 * Math.abs(Math.sin(t * f)) * k });

// ============================================================== Kundasang
const affHeadKD = () => kd.aff.parts.head.getWorldPosition(V());
function kdAff(t, p = {}) {
  kd.aff.root.position.copy(A_KD);
  kd.aff.pose({ yaw: Math.PI - 0.15, blink: blinkAt(t, 1), talk: talk(t), smile: 0.9, ...p });
  kd.aff.root.updateMatrixWorld(true);
}
function kdRing(t) {
  kd.ring.rotation.y = 0;
  kd.ring.position.x = 0.6 * Math.sin(t * 0.2);
}
const MT_TOP = V(-10, 62, -190);
const faceCam = (t) => {
  const ah = affHeadKD();
  lookCam(ah.clone().add(V(0.7, 0.05, 3.5)), ah.clone().add(V(-0.15, -0.45, 0)), 46);
  return ah;
};

// ================================================================= summit
const NIGHT = { top: new THREE.Color(0x0a1a3a), bot: new THREE.Color(0x1a2a5a) };
const DAY = { top: new THREE.Color(0x4a7ad0), bot: new THREE.Color(0xdfe8f4) };
const DAWN = { top: new THREE.Color(0x2a3a8a), bot: new THREE.Color(0xffa860) };
function skyMix(a, b, k) {
  sm.sky.material.uniforms.top.value.copy(a.top).lerp(b.top, k);
  sm.sky.material.uniforms.bot.value.copy(a.bot).lerp(b.bot, k);
}
function summitSet(t, { mode = 'day', dawn = 0 } = {}) {
  if (mode === 'day') {
    skyMix(DAY, DAY, 0);
    sm.stars.visible = false;
    sm.hemi.intensity = 1.2;
    sm.key.intensity = 1.2;
    sm.key.color.setHex(0xfff4e0);
    sm.key.position.set(10, 20, 10);
    sm.sun.visible = false;
    sm.sunDisc.visible = false;
  } else {
    skyMix(NIGHT, DAWN, dawn);
    sm.stars.visible = dawn < 0.7;
    sm.stars.material.uniforms.uAlpha.value = 1 - dawn / 0.7;
    sm.stars.userData.update(t);
    sm.hemi.intensity = lerp(0.5, 1.0, dawn);
    sm.key.intensity = lerp(0.3, 1.6, dawn);
    sm.key.color.setHex(0xffc890);
    sm.key.position.set(-10, 6, -40);
    const sy = lerp(-14, 3, dawn);
    sm.sun.visible = sm.sunDisc.visible = true;
    sm.sun.position.set(-8, sy, -70);
    sm.sun.material.opacity = clamp(dawn * 1.4);
    sm.sunDisc.position.set(-8, sy, -69);
  }
  sm.frost.forEach((f) => (f.material.opacity = (mode === 'day' ? 0.9 : 0.5) * (0.5 + 0.5 * Math.sin(t * 4 + f.userData.ph))));
  sm.breath.forEach((b) => (b.visible = false));
  sm.oxy.forEach((o) => (o.visible = false));
}
const affHeadSM = () => sm.aff.parts.head.getWorldPosition(V());

// ================================================================== climb
const climbX = (t) => keys(t, [[22.82, -2], [28.2, 13], [29.8, 21], [32.0, 30], [34.16, 37]], (k) => k);

// =================================================================== SHOTS
const SHOTS = [
  // S1 — Kundasang, Kinabalu in the distance
  [0, 2.62, (t) => {
    kdRing(t);
    kdAff(t, { headPitch: -0.15 });
    camMove(t, 0, 2.62, [1.5, 3.1, 9.8], [-9, 18, -190], [1.3, 3.0, 9.0], [-9, 18, -190], 50);
    const q = pop(t, 0.4, 2.6);
    ov.tag('ep', 'EPISOD 49', { x: W / 2, y: 268, o: q.o, s: q.s }, { bg: '#2f7bff', small: true });
    return kd;
  }],
  // S2 — "Papa! Tengok gunung tu, tingginya sampai cecah awan!"
  [2.62, 6.58, (t) => {
    kdRing(t);
    const pt = keys(t, [[3.0, 0], [3.3, 1]], easeOut);
    kdAff(t, { headYaw: 0.5 * (1 - pt), headPitch: -0.2 * pt, smile: 1, brow: 0.5, armR: { reach: mix3([-0.55, 0.3, 0.2], [-0.75, 1.9, 0.75], pt), pole: [-1, -0.3, -0.4], point: pt } });
    camMove(t, 2.62, 6.58, [1.3, 2.7, 7.8], [-9, 21, -190], [1.2, 2.5, 7.2], [-9, 24, -190], 50);
    const pp = pop(t, 2.68, 3.4, { from: 2 });
    ov.bubble('papa', 'PAPA!', { x: 800, y: 470, o: pp.o, s: pp.s * 0.8, r: 6 }, { size: 110 });
    pinTag('awan', 'CECAH AWAN!', scr(V(-10, 30, -150)), t, 5.28, 6.55, { bg: BLUE, pointer: 'down' }, -40);
    return kd;
  }],
  // S3 — "Berapa tinggi Gunung Kinabalu, dan ada apa di atas tu?"
  [6.58, 10.4, (t) => {
    kdRing(t);
    kdAff(t, { yaw: 0.35, ...POSES.thinkR, brow: -0.3, smile: 0.5 });
    const ah = faceCam(t);
    const hd = scr(ah.clone().add(V(0, 0.4, 0)));
    qmarks(t, hd, 6.6, 10.38, [[6.7, -260, 100, '#ffcf33', -12], [7.0, 250, 60, '#3fa2ff', 10], [8.6, 280, 240, '#ffcf33', 14]]);
    bubble('tinggi', 'BERAPA TINGGI?', t, 6.64, 8.5, 430, 110, { top: '#fff6d0', bot: '#ffb21f' });
    bubble('atas', 'ADA APA DI ATAS?', t, 8.54, 10.38, 430, 104, { top: '#e0f6ff', bot: '#2fa8d8' });
    return kd;
  }],
  // S4 — "Jom ikut Affan cari jawapan!"
  [10.4, 12.36, (t) => {
    kdRing(t);
    const up = keys(t, [[10.42, 0], [10.65, 1], [11.8, 1], [12.1, 0.6]], easeOut);
    kdAff(t, { yaw: 0.35, smile: 1, brow: 0.6, armR: { reach: [lerp(-0.6, -0.55, up), lerp(0.25, 1.95 + 0.06 * Math.sin(t * 14), up), lerp(0.2, 0.35, up)], pole: [-1, -0.3, -0.5] } });
    const ah = affHeadKD();
    const k = easeIn(inv(11.2, 12.36, t));
    lookCam(ah.clone().add(V(0.7, 0.05 + 3 * k, 3.5 + 2 * k)), ah.clone().add(V(-0.15, -0.45 + 6 * k, -4 * k)), 46);
    ov.swirl(t, W / 2, 820, inv(10.5, 12.3, t));
    ov.flash(inv(11.95, 12.36, t) ** 2, '220,240,255');
    return kd;
  }],
  // S5 — 4,095 m: the ruler and nine twin towers
  [12.36, 22.82, (t) => {
    const grow = easeInOut(inv(14.0, 17.4, t));
    ms.ruler.scale.y = Math.max(0.001, grow);
    ms.line.visible = t > 17.2;
    ms.towers.forEach((tw, i) => {
      const a = 20.6 + i * 0.14;
      const k = easeOut(inv(a, a + 0.25, t));
      tw.visible = k > 0.01;
      tw.scale.setScalar(Math.max(0.001, k) * (M_H * (452 / 4095)));
    });
    camMove(t, 12.36, 22.82, [-1.8, 6.0, 27], [-1.4, 6.0, 0], [-1.0, 6.4, 25], [-1.0, 6.2, 0], 50);
    ov.flash(1 - inv(12.36, 12.7, t), '220,240,255');
    topTag('sabah', 'GUNUNG KINABALU, SABAH', t, 12.42, 17.3, GREEN);
    const top = scr(V(4.3, M_H * grow, 0.5));
    const q = pop(t, 14.0, 20.5);
    if (q.o > 0) {
      const m = Math.round(4095 * grow);
      ov.tag('meter', `${m.toLocaleString('en-US')} m`, { x: clamp(top.x - 40, 300, 780), y: top.y - 70, o: q.o, s: q.s }, { bg: ORANGE });
    }
    bubble('tinggi', 'PALING TINGGI\nDI MALAYSIA!', t, 17.5, 20.0, 1060, 96, { top: '#e0ffe8', bot: '#2fbf5f' });
    const tq = pop(t, 20.64, 22.8);
    if (tq.o > 0) {
      const p = scr(V(2.4, M_H * 0.45, 0.6));
      ov.tag('x9', '9 MENARA BERKEMBAR', { x: clamp(p.x, 300, 780), y: 430, o: tq.o, s: tq.s }, { bg: PURPLE });
    }
    return ms;
  }],
  // S6 — the climb: rainforest, mossy forest, low shrubs, granite; colder and colder
  [22.82, 34.16, (t) => {
    const x = climbX(t);
    const y = SLOPE(x);
    cl.aff.root.position.set(x, y, 1.5);
    cl.aff.pose({ yaw: Math.PI / 2 - 0.25, blink: blinkAt(t, 2), talk: talk(t) * 0.6, smile: 0.8, lean: 0.25, ...walkLegs(t, 1, 10), armL: { reach: [0.55, 0.3 + 0.15 * Math.sin(t * 10), 0.2] }, armR: { reach: [-0.55, 0.3 - 0.15 * Math.sin(t * 10), 0.2] } });
    cl.mist.forEach((m, i) => (m.material.opacity = 0.35));
    lookCam(V(x + 2.5, y + 2.8, 11.5), V(x + 2.0, y + 1.6, 0), 50);
    ov.flash(1 - inv(22.82, 23.1, t));
    const T = lerp(30, 4, easeInOut(inv(23.5, 33.3, t)));
    thermo(T, pop(t, 24.6, 34.15).o);
    topTag('sejuk', 'MAKIN TINGGI, MAKIN SEJUK!', t, 24.0, 26.0, BLUE);
    topTag('z1', 'HUTAN HUJAN', t, 26.06, 28.2, GREEN);
    topTag('z2', 'HUTAN BERLUMUT', t, 28.22, 29.4, '#6a8a4a');
    topTag('z3', 'POKOK RENDAH', t, 29.42, 32.0, '#8a7a4a');
    topTag('z4', 'BATU GRANIT', t, 32.06, 34.15, '#7a7a80');
    return cl;
  }],
  // S7 — the summit: almost 0 °C and thin air, breathe faster
  [34.16, 41.12, (t) => {
    summitSet(t, { mode: 'day' });
    const a = sm.aff;
    const sh = t > 35.0 ? 0.02 * Math.sin(t * 40) : 0;
    a.root.position.set(-0.6 + sh, -0.4, 0.6);
    a.pose({ yaw: 0.25, blink: blinkAt(t, 3), talk: talk(t), smile: 0.4, brow: -0.2, armL: { reach: [0.25, 0.85, 0.5], pole: [1, -0.5, -0.3] }, armR: { reach: [-0.25, 0.85, 0.5], pole: [-1, -0.5, -0.3] } });
    a.root.updateMatrixWorld(true);
    const ah = affHeadSM();
    // breath puffs, faster after "bernafas lebih laju"
    const rate = t > 39.28 ? 2.4 : 0.9;
    const mouth = a.parts.head.localToWorld(V(0, -0.45, 0.9));
    sm.breath.forEach((b, i) => {
      const u = ((t * rate + i / sm.breath.length) % 1);
      b.visible = u < 0.5;
      b.position.copy(mouth).add(V(0.1 + u * 0.8, 0.1 + u * 0.4, u * 0.6));
      b.scale.setScalar(0.25 + u * 0.8);
      b.material.opacity = 0.5 * (1 - u * 2);
    });
    const thin = inv(37.8, 38.3, t);
    sm.oxy.forEach((o) => {
      const d = o.userData;
      o.visible = thin > 0.01 && t < 39.2;
      o.position.set(d.x + 0.2 * Math.sin(t + d.ph), d.y, d.z);
      o.scale.setScalar(0.35 * thin);
    });
    camMove(t, 34.16, 41.12, [1.2, 1.8, 6.0], [-0.4, 1.3, 0], [0.9, 1.6, 5.0], [-0.5, 1.4, 0], 50);
    ov.flash(1 - inv(34.16, 34.45, t));
    topTag('puncak', 'DI PUNCAK', t, 34.22, 36.0, ORANGE);
    thermo(lerp(6, 0, easeInOut(inv(35.6, 36.6, t))), pop(t, 34.6, 41.1).o);
    topTag('nipis', 'UDARA NIPIS: KURANG OKSIGEN', t, 37.86, 39.2, BLUE);
    bubble('laju', 'BERNAFAS\nLEBIH LAJU!', t, 39.28, 41.1, 430, 110, { top: '#e0f6ff', bot: '#2fa8d8' });
    void ah;
    return sm;
  }],
  // S8a — Laban Rata at night; climbers set off at 2 a.m. with headlamps
  [41.12, 46.12, (t) => {
    nt.stars.userData.update(t);
    const go = inv(44.3, 44.9, t);
    nt.lamps.forEach((l, i) => {
      const u = clamp(((t - 44.3) * 0.045 + 0.02 - i * 0.012));
      l.visible = go > 0 && u > 0;
      l.position.copy(nt.trail.getPoint(u)).add(V(0, 0.15, 0.05));
      l.material.opacity = 0.7 + 0.3 * Math.sin(t * 8 + i);
    });
    camMove(t, 41.12, 46.12, [1.0, 6.5, 24], [0, 6.2, 0], [0.6, 7.5, 22], [0, 7.5, 0], 50);
    ov.flash(1 - inv(41.12, 41.4, t), '20,30,60');
    pinTag('lr', 'LABAN RATA', scr(HUT.clone().add(V(0, 1.8, 0))), t, 42.42, 46.1, { bg: ORANGE, pointer: 'down' }, -20);
    const cq = pop(t, 44.92, 46.1);
    if (cq.o > 0) ov.tag('clock', '2:00 PAGI', { x: W / 2, y: 430, o: cq.o, s: cq.s }, { bg: PURPLE });
    return nt;
  }],
  // S8b — sunrise at Low's Peak
  [46.12, 49.6, (t) => {
    const dawn = easeOut(inv(46.12, 49.4, t));
    summitSet(t, { mode: 'dawn', dawn });
    const a = sm.aff;
    const cheer = keys(t, [[48.5, 0], [48.8, 1]], easeOut);
    a.root.position.set(0.2, -0.4, 1.0);
    a.pose({ yaw: Math.PI + 0.3, blink: blinkAt(t, 4), smile: 1, wow: 0.5 * cheer, armL: { reach: mix3([0.55, 0.3, 0.2], [0.75, 1.95, 0.35], cheer), pole: [1, -0.3, -0.5] }, armR: { reach: mix3([-0.55, 0.3, 0.2], [-0.75, 1.95, 0.35], cheer), pole: [-1, -0.3, -0.5] } });
    a.root.updateMatrixWorld(true);
    camMove(t, 46.12, 49.6, [2.6, 1.3, 10.0], [-4, 1.8, -20], [2.4, 1.4, 9.4], [-4, 2.3, -20], 50);
    ov.flash(1 - inv(46.12, 46.4, t), '255,200,150');
    topTag('low', 'PUNCAK LOW', t, 47.23, 49.55, ORANGE);
    bubble('terbit', 'MATAHARI TERBIT!', t, 48.56, 49.58, 430, 116, { top: '#fff0d0', bot: '#ff9a3d' });
    return sm;
  }],
  // S9 — the biggest pitcher plant in the world, and hundreds of orchids
  [49.6, 56.12, (t) => {
    const a = pc.aff;
    a.root.position.set(-0.75, 0, 0.9);
    const sh = keys(t, [[49.7, 0], [50.0, 1], [51.3, 1], [51.6, 0]]);
    a.pose({ yaw: 0.6, blink: blinkAt(t, 5), talk: talk(t), smile: 0.9, brow: 0.4, armR: { reach: mix3([-0.55, 0.3, 0.2], [-0.05, 1.32, 0.66], sh), pole: [-1, -0.6, -0.3], point: sh } });
    pc.lid.rotation.x = -0.9 + 0.05 * Math.sin(t * 1.3);
    pc.orchids.forEach((o, i) => {
      const k = easeOut(inv(54.5 + i * 0.1, 54.9 + i * 0.1, t));
      o.scale.setScalar(Math.max(0.001, k));
      o.rotation.z = 0.05 * Math.sin(t * 2 + i);
    });
    if (t < 54.3) camMove(t, 49.6, 54.3, [-0.7, 1.9, 7.2], [0.2, 1.3, 0], [-0.5, 1.8, 6.6], [0.2, 1.4, 0], 50);
    else camMove(t, 54.3, 56.12, [-0.5, 1.8, 6.6], [0.2, 1.4, 0], [-2.0, 1.6, 5.0], [-1.8, 0.9, 0.4], 50);
    ov.flash(1 - inv(49.6, 49.9, t));
    topTag('tahu', 'TAHU TAK?', t, 49.66, 51.4, PURPLE);
    pinTag('pk', 'PERIUK KERA', scr(V(0.9, 2.9, 0)), t, 51.54, 54.3, { bg: RED, pointer: 'down' }, -20);
    bubble('besar', 'PALING BESAR\nDI DUNIA!', t, 52.82, 54.3, 430, 104, { top: '#ffe0e8', bot: '#ff4d5e' });
    bubble('orkid', 'BERATUS JENIS ORKID!', t, 54.58, 56.1, 430, 96, { top: '#ffe0f6', bot: '#ff5cc8' });
    return pc;
  }],
  // S10 — "Waaah, rupanya Kinabalu macam banyak dunia dalam satu gunung!"
  [56.12, 64.78, (t) => {
    kdRing(t);
    kdAff(t, { yaw: 0.35, wow: keys(t, [[56.15, 0], [56.3, 0.9], [56.9, 0.9], [57.2, 0]]), smile: 1, brow: 0.5 });
    const ah = faceCam(t);
    ov.flash((1 - inv(56.12, 56.4, t)) * 0.9, '255,250,235');
    const hd = scr(ah.clone().add(V(0, 0.5, 0)));
    const b = pop(t, 56.15, 60.8);
    ov.html('bulb', ICONS.bulb(), { x: clamp(hd.x + 220, 150, 900), y: clamp(hd.y - 170, 300, 900) + Math.sin(t * 5) * 8, o: b.o, s: b.s * 0.6, r: 10 });
    ov.sparkles(t, { n: 30, seed: 12, y: 250, h: 900, a: inv(56.2, 56.5, t) * (1 - inv(58.4, 59.0, t)) });
    [['HUTAN HUJAN', GREEN], ['HUTAN BERLUMUT', '#6a8a4a'], ['BATU GRANIT', '#7a7a80'], ['PUNCAK SEJUK', BLUE]].forEach(([txt, bg], i) => {
      const q = pop(t, 58.68 + i * 0.25, 60.85);
      if (q.o > 0) ov.tag('w' + i, txt, { x: i % 2 ? 760 : 320, y: 1060 + Math.floor(i / 2) * 110, o: q.o, s: q.s }, { bg, small: true });
    });
    bubble('dunia', 'BANYAK DUNIA\nDALAM SATU GUNUNG!', t, 58.6, 60.85, 430, 92, { top: '#e0ffe8', bot: '#2fbf5f' });
    topTag('baju', 'BAWA BAJU TEBAL', t, 62.24, 64.75, RED);
    topTag('alam', 'JAGA ALAM', t, 63.52, 64.75, GREEN, 410);
    return kd;
  }],
  // S11 — "Apa lagi kita nak belajar lepas ni?"
  [64.78, OUTRO, (t) => {
    kdRing(t);
    const tk = keys(t, [[64.8, 0], [65.2, 1]]);
    const th2 = POSES.thinkR.armR;
    kdAff(t, { yaw: 0.35, smile: 1, brow: 0.3 + 0.4 * tk, headRoll: -0.12 * tk, lookX: 0.35 * tk, lookY: 0.4 * tk, headPitch: -0.08 * tk, armR: { reach: mix3([-0.55, 0.3, 0.2], th2.reach, tk), pole: th2.pole, point: tk, wx: th2.wx * tk } });
    const ah = faceCam(t);
    const hd = scr(ah.clone().add(V(0, 0.45, 0)));
    qmarks(t, hd, 64.78, OUTRO - 0.05, [[64.8, -260, -100, '#ffcf33', -12], [65.1, 250, -160, '#3fa2ff', 10], [65.4, 300, 60, '#ffcf33', 14]]);
    return kd;
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

// Cover / thumbnail (9:16): Affan cheering at Low's Peak at sunrise.
function thumbnail() {
  ov.begin();
  cam.aspect = W / H;
  cam.updateProjectionMatrix();
  const t = 49.3;
  summitSet(t, { mode: 'dawn', dawn: 0.95 });
  const a = sm.aff;
  a.root.position.set(-1.0, -0.4, -0.6);
  a.pose({ yaw: 0.5, smile: 1, wow: 0.4, brow: 0.6, armL: { reach: [0.75, 1.95, 0.35], pole: [1, -0.3, -0.5] }, armR: { reach: [-0.75, 1.95, 0.35], pole: [-1, -0.3, -0.5] } });
  a.root.updateMatrixWorld(true);
  lookCam(V(2.2, 1.3, 8.6), V(-0.4, 2.9, -2), 50);
  sm.sky.position.copy(cam.position);
  sm.stars.position.copy(cam.position);
  renderer.setViewport(0, 0, W, H);
  renderer.render(sm.scene, cam);
  const g = ov.g;
  const top = g.createLinearGradient(0, 0, 0, 760);
  top.addColorStop(0, 'rgba(10,20,60,0.5)');
  top.addColorStop(1, 'rgba(10,20,60,0)');
  g.fillStyle = top;
  g.fillRect(0, 0, W, 760);
  const bot = g.createLinearGradient(0, H - 900, 0, H);
  bot.addColorStop(0, 'rgba(20,10,30,0)');
  bot.addColorStop(1, 'rgba(20,10,30,0.55)');
  g.fillStyle = bot;
  g.fillRect(0, H - 900, W, 900);
  ov.vignette(0.3);
  ov.tag('thBadge', 'EPISOD 49', { x: W / 2, y: 300 }, { bg: '#2f7bff', small: true });
  ov.bubble('thTitle', '4,095 METER?!', { x: W / 2, y: 460, r: -3 }, { size: 140, top: '#fff0d0', bot: '#ff9a3d' });
  ov.bubble('thTitle2', 'GUNUNG KINABALU', { x: W / 2, y: 615, r: 2 }, { size: 96, top: '#e0ffe8', bot: '#2fbf5f' });
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
