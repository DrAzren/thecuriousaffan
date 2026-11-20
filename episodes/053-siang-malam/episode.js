// THE CURIOUS AFFAN — Episode 053: "Kenapa Ada Siang dan Malam?"
// Every shot is a pure function of time t (seconds), synced to audio/narration.mp3.
import * as THREE from 'three';
import { makeRenderer, loadEnvelope, toScreen, clamp, lerp, inv, easeOut, easeIn, easeInOut, keys, W, H } from '../../shared/core.js';
import { POSES, blinkAt } from '../../shared/affan.js';
import { Overlay, pop, ICONS, drawLogo } from '../../shared/overlay.js';
import { CAPTIONS, KEYWORDS } from './captions.js';
import { buildPark53, buildSpace, buildBedroom, buildOutro, A_PK, EARTH_AT, EARTH_R, BED, MATTRESS_Y, AFF_S } from './worlds.js';

const FPS = 30;
const DURATION = 63.6;
const OUTRO = 60.45;

const stage = document.getElementById('stage');
const canvas = document.createElement('canvas');
stage.appendChild(canvas);
const renderer = makeRenderer(canvas);
const ov = new Overlay(stage);
const park = buildPark53();
const sp = buildSpace();
const room = buildBedroom();
const outro = buildOutro();
const cam = new THREE.PerspectiveCamera(50, W / H, 0.05, 6000);
let env = { at: () => 0 };

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const talk = (t) => clamp(env.at(t) * 1.2);
const scr = (p) => toScreen(p, cam);
const mix3 = (a, b, k) => a.map((v, i) => lerp(v, b[i], k));
const BLUE = '#2f9bff', ORANGE = '#ff8a3d', PURPLE = '#7a5cf0', GREEN = '#2fbf5f', NAVY = '#3a4aa8', RED = '#ff4d5e', YELLOW = '#e0b400';

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
// a clock face on the overlay, hand turning
function clockCard(t, a, b, x = 540, y = 1060) {
  const q = pop(t, a, b);
  if (q.o <= 0) return;
  const g = ov.g;
  g.save();
  g.globalAlpha = q.o;
  g.translate(x, y);
  g.scale(q.s, q.s);
  g.fillStyle = '#ffffff';
  g.strokeStyle = '#17256b';
  g.lineWidth = 12;
  g.beginPath();
  g.arc(0, 0, 110, 0, Math.PI * 2);
  g.fill();
  g.stroke();
  for (let i = 0; i < 12; i++) {
    const a2 = (i / 12) * Math.PI * 2;
    g.beginPath();
    g.moveTo(Math.sin(a2) * 85, -Math.cos(a2) * 85);
    g.lineTo(Math.sin(a2) * 98, -Math.cos(a2) * 98);
    g.stroke();
  }
  const ang = (t - a) * 6;
  g.lineWidth = 10;
  g.strokeStyle = '#ff4d5e';
  g.beginPath();
  g.moveTo(0, 0);
  g.lineTo(Math.sin(ang) * 75, -Math.cos(ang) * 75);
  g.stroke();
  g.strokeStyle = '#17256b';
  g.beginPath();
  g.moveTo(0, 0);
  g.lineTo(Math.sin(ang / 12) * 50, -Math.cos(ang / 12) * 50);
  g.stroke();
  g.font = '800 54px "Baloo 2"';
  g.textAlign = 'center';
  g.fillStyle = '#ffffff';
  g.lineWidth = 12;
  g.strokeText('24 JAM', 0, 175);
  g.fillText('24 JAM', 0, 175);
  g.restore();
}

// ==================================================================== park
const affHead = () => park.aff.parts.head.getWorldPosition(V());
const front = (d, side = 0.35) => affHead().add(V(side, 0.1, d));
function parkAff(t, p = {}) {
  const a = park.aff;
  a.root.position.copy(A_PK);
  a.pose({ yaw: 0.15, blink: blinkAt(t, 1), talk: talk(t), smile: 0.9, armR: { reach: [-0.4, 0.75, 0.55], pole: [-1, -0.5, -0.3] }, ...p });
  a.root.updateMatrixWorld(true);
}

// ================================================================== space
// spin angle so that Malaysia (lon 102) sits at angle ang in the xz plane
const MY_ANG0 = Math.atan2(-0.978, -0.208);
const spinFor = (ang) => MY_ANG0 - ang;
function spaceSet(t, theta, { aff = 1, pins = 0, sleeper = 0, top = 0, air = 0 } = {}) {
  sp.spin.rotation.y = theta;
  sp.stars.userData.update(t);
  sp.aff.root.visible = aff > 0.5;
  sp.aff.pose({ blink: blinkAt(t, 2), smile: 1, talk: talk(t) * 0.5 });
  sp.pinMY.visible = sp.pinUS.visible = pins > 0.5;
  sp.sleeper.visible = sleeper > 0.5;
  sp.top.visible = top > 0.01;
  sp.top.rotation.y = t * 14;
  sp.top.rotation.z = 0.08 * Math.sin(t * 3);
  sp.air.forEach((a) => (a.visible = air > 0.01));
  sp.corona.material.opacity = 0.85 + 0.1 * Math.sin(t * 2);
}
const affOnEarth = () => sp.aff.parts.head.getWorldPosition(V());

// ================================================================ bedroom
const bHead = () => room.aff.parts.head.getWorldPosition(V());
function sitAff(t, p = {}) {
  room.outer.position.set(BED.x - 0.95, MATTRESS_Y - 0.98 * AFF_S + 0.02, BED.z + 0.1);
  room.outer.rotation.set(0, 0, 0);
  room.inner.rotation.set(0, 0, 0);
  room.blanket.scale.set(1, 1, 1);
  room.blanket.position.y = 1.02;
  room.aff.pose({ yaw: 0.85, blink: blinkAt(t, 1), talk: talk(t), smile: 0.9, legL: { x: -1.5, knee: 0 }, legR: { x: -1.5, knee: 0 }, armL: { reach: [0.5, 0.45, 0.45] }, armR: { reach: [-0.5, 0.45, 0.45] }, ...p });
  room.outer.updateMatrixWorld(true);
}
function lieAff(t, p = {}) {
  room.outer.position.set(BED.x + 1.15, MATTRESS_Y + 0.16, BED.z);
  room.outer.rotation.set(0, Math.PI / 2, 0);
  room.inner.rotation.set(-Math.PI / 2, 0, 0);
  room.blanket.scale.set(1, 1.7, 1);
  room.blanket.position.y = 1.12;
  room.aff.pose({ yaw: 0, blink: 1, talk: 0, smile: 0.7, headPitch: -0.15, armL: { reach: [0.45, 0.4, 0.35] }, armR: { reach: [-0.45, 0.4, 0.35] }, ...p });
  room.outer.updateMatrixWorld(true);
}
function roomReset() {
  room.brain.visible = false;
  room.dream.g.visible = false;
  if (room.toyDragon) room.toyDragon.visible = false;
}

// =================================================================== SHOTS
const SHOTS = [
  // S1 — park at dusk, playing ball
  [0, 2.28, (t) => {
    park.setNight(t, 0.45);
    parkAff(t, { headPitch: -0.1 });
    camMove(t, 0, 2.28, [A_PK.x + 1.2, 2.2, A_PK.z + 6.2], [A_PK.x, 1.4, A_PK.z], [A_PK.x + 1.0, 2.0, A_PK.z + 5.2], [A_PK.x, 1.4, A_PK.z], 50);
    const q = pop(t, 0.4, 2.2);
    ov.tag('ep', 'EPISOD 53', { x: W / 2, y: 268, o: q.o, s: q.s }, { bg: '#2f7bff', small: true });
    return park;
  }],
  // S2 — "Tadi terang, sekarang dah gelap. Matahari pergi mana?"
  [2.28, 6.96, (t) => {
    const k = keys(t, [[2.3, 0], [3.5, 0], [4.9, 1]], easeInOut);
    park.setNight(t, k);
    parkAff(t, { smile: 1 - 0.5 * k, brow: 0.5 - 0.6 * k, lookY: 0.4, headPitch: -0.25 });
    lookCam(front(3.4).add(V(0, -0.4, 0)), affHead().add(V(0, 0.4, -2)), 50);
    const pp = pop(t, 2.34, 3.1, { from: 2 });
    ov.bubble('papa', 'PAPA!', { x: 800, y: 470, o: pp.o, s: pp.s * 0.8, r: 6 }, { size: 110 });
    topTag('terang', 'TADI TERANG', t, 3.48, 4.7, YELLOW);
    topTag('gelap', 'SEKARANG GELAP', t, 4.8, 6.94, NAVY);
    bubble('mana', 'MATAHARI\nPERGI MANA?', t, 5.62, 6.94, 1070, 104, { top: '#fff6d0', bot: '#ffb21f' });
    return park;
  }],
  // S3 — "Kenapa ada siang dan malam?"
  [6.96, 9.04, (t) => {
    park.setNight(t, 1);
    parkAff(t, { ...POSES.thinkR, brow: -0.3, smile: 0.5 });
    const ah = affHead();
    lookCam(front(3.3), ah.clone().add(V(0, -0.35, 0)), 46);
    const hd = scr(ah.clone().add(V(0, 0.4, 0)));
    qmarks(t, hd, 7.0, 9.02, [[7.05, -260, 100, '#ffcf33', -12], [7.35, 250, 60, '#3fa2ff', 10], [7.7, 280, 240, '#ffcf33', 14]]);
    bubble('kenapa', 'KENAPA ADA\nSIANG & MALAM?', t, 7.02, 9.02, 430, 100, { top: '#e8eeff', bot: '#5a6ad8' });
    return park;
  }],
  // S4 — "Jom ikut Affan cari jawapan!"
  [9.04, 11.2, (t) => {
    park.setNight(t, 1);
    const up = keys(t, [[9.06, 0], [9.3, 1], [10.4, 1], [10.7, 0.6]], easeOut);
    parkAff(t, { smile: 1, brow: 0.6, armL: { reach: [lerp(0.6, 0.55, up), lerp(0.25, 1.95 + 0.06 * Math.sin(t * 14), up), lerp(0.2, 0.35, up)], pole: [1, -0.3, -0.5] } });
    const ah = affHead();
    const k = easeIn(inv(10.2, 11.2, t));
    lookCam(front(3.3).lerp(ah.clone().add(V(0, 6, 2)), k), ah.clone().add(V(0, -0.35, 0)).lerp(ah.clone().add(V(0, 14, -4)), k), 46);
    ov.swirl(t, W / 2, 820, inv(9.15, 11.1, t));
    ov.flash(inv(10.8, 11.2, t) ** 2, '200,210,255');
    return park;
  }],
  // S5 — the Sun stays put; the Earth spins like a top, once every 24 hours
  [11.2, 19.88, (t) => {
    const theta = spinFor(2.2) + (t - 11.2) * 0.25;
    const tp = inv(15.9, 16.5, t);
    spaceSet(t, theta, { top: tp });
    if (t < 14.0) camMove(t, 11.2, 14.0, [-30, 3, 34], [-34, 0, -6], [-28, 2, 32], [-34, 0, -6], 50);
    else if (t < 15.8) camMove(t, 14.0, 15.8, [EARTH_AT.x - 2, 2, 18], EARTH_AT.toArray(), [EARTH_AT.x, 1, 15], EARTH_AT.toArray(), 50);
    else camMove(t, 15.8, 19.88, [EARTH_AT.x, 1, 15], EARTH_AT.toArray(), [EARTH_AT.x, -1.2, 16], [EARTH_AT.x, -1.5, 0], 50);
    ov.flash(Math.max(1 - inv(11.2, 11.5, t), (1 - inv(14.0, 14.3, t)) * (t >= 14.0 ? 1 : 0)), '200,210,255');
    pinTag('sun', 'MATAHARI TAK KE MANA-MANA', scr(V(-34, 10, -6)), t, 11.26, 14.0, { bg: ORANGE, pointer: 'down' }, 20);
    topTag('putar', 'BUMI YANG BERPUTAR!', t, 15.06, 19.86, BLUE);
    pinTag('gasing', 'MACAM GASING', scr(sp.top.position.clone().add(V(1.6, 1.0, 0))), t, 16.14, 19.86, { bg: PURPLE, pointer: 'down' }, -20);
    clockCard(t, 17.4, 19.86, 540, 520);
    return sp;
  }],
  // S6 — the side facing the Sun is day; the side facing away is night
  [19.88, 26.14, (t) => {
    const theta = lerp(spinFor(2.5), spinFor(0.3), easeInOut(inv(20.4, 25.6, t)));
    spaceSet(t, theta);
    camMove(t, 19.88, 26.14, [EARTH_AT.x - 1.5, 1.5, 13.5], EARTH_AT.toArray(), [EARTH_AT.x + 0.5, 1.0, 12.0], EARTH_AT.toArray(), 50);
    pinTag('siang', 'SIANG', scr(EARTH_AT.clone().add(V(-2.2, 1.2, 1.8))), t, 21.86, 26.12, { bg: YELLOW, pointer: 'down' }, -20);
    pinTag('malam', 'MALAM', scr(EARTH_AT.clone().add(V(2.2, 1.2, 1.8))), t, 24.94, 26.12, { bg: NAVY, pointer: 'down' }, -20);
    const ah = affOnEarth();
    pinTag('affan', 'AFFAN', scr(ah.clone().add(V(0, 0.3, 0))), t, 20.4, 23.0, { bg: GREEN, pointer: 'down' }, -20);
    return sp;
  }],
  // S7 — Malaysia in daytime while friends in America sleep at night
  [26.14, 32.76, (t) => {
    spaceSet(t, spinFor(2.6), { pins: 1, sleeper: 1, aff: 1 });
    const orb = easeInOut(inv(29.0, 30.3, t));
    const ca = lerp(Math.PI / 2 + 0.35, -0.1, orb);
    lookCam(EARTH_AT.clone().add(V(Math.cos(ca) * 11.5, 2.0, Math.sin(ca) * 11.5)), EARTH_AT, 50);
    sp.pinMY.updateMatrixWorld(true);
    sp.pinUS.updateMatrixWorld(true);
    pinTag('my', 'MALAYSIA: SIANG', scr(sp.pinMY.localToWorld(V(0, 0.7, 0))), t, 26.48, 29.0, { bg: YELLOW, pointer: 'down' }, -20);
    const us = sp.pinUS.localToWorld(V(0, 0.7, 0));
    pinTag('us', 'AMERIKA: MALAM', scr(us), t, 30.28, 32.74, { bg: NAVY, pointer: 'down' }, -20);
    zzz(t, scr(us), 31.1, 32.74);
    return sp;
  }],
  // S8 — spinning towards the east, the Sun seems to rise in the east and set in the west
  [32.76, 38.9, (t) => {
    spaceSet(t, 0, { aff: 0 });
    const T = sp.toy.position;
    const ang = keys(t, [[32.8, 0.35], [36.1, 1.62], [38.9, 4.7]], (k) => k);
    sp.toy.rotation.z = ang - Math.PI / 2;
    sp.toyAff.pose({ yaw: -Math.PI / 2, blink: blinkAt(t, 3), smile: 1, lookX: 0.3 });
    const sunP = T.clone().add(V(-10, 1.5, -6));
    sp.toySun.position.copy(sunP);
    sp.toyGlow.position.copy(sunP);
    sp.toyLight.position.copy(sunP);
    sp.toyLight.target.position.copy(T);
    lookCam(T.clone().add(V(-2.5, 1.5, 28)), T.clone().add(V(-2.5, 0.5, 0)), 50);
    ov.flash(1 - inv(32.76, 33.05, t), '200,210,255');
    topTag('timur', 'BUMI BERPUTAR KE TIMUR', t, 32.82, 36.1, BLUE);
    bubble('terbit', 'TERBIT DI TIMUR', t, 36.2, 37.5, 430, 104, { top: '#fff0d0', bot: '#ff9a3d' });
    bubble('terbenam', 'TERBENAM DI BARAT', t, 37.58, 38.88, 430, 100, { top: '#ffe0d8', bot: '#ff5c4a' });
    return sp;
  }],
  // S9 — the Earth spins very fast, but we and the air spin along with it
  [38.9, 49.98, (t) => {
    const fast = t < 45.5 ? (t - 38.9) * 0.8 : 5.3 + (t - 45.5) * 0.1;
    const theta = spinFor(1.2) + fast;
    spaceSet(t, theta, { air: inv(45.5, 46.0, t) });
    if (t < 45.5) camMove(t, 38.9, 45.5, [EARTH_AT.x, 1.5, 13], EARTH_AT.toArray(), [EARTH_AT.x - 0.5, 1.2, 11.5], EARTH_AT.toArray(), 50);
    else {
      const ah = affOnEarth();
      const n = ah.clone().sub(EARTH_AT).normalize();
      lookCam(ah.clone().add(n.multiplyScalar(2.6)).add(V(0, 0.6, 2.2)), ah, 50);
    }
    ov.flash(1 - inv(38.9, 39.2, t), '200,210,255');
    topTag('tahu', 'TAHU TAK?', t, 38.96, 40.7, PURPLE);
    const sq = pop(t, 42.06, 45.5);
    if (sq.o > 0) ov.tag('kmj', `${Math.round(1670 * easeOut(inv(42.06, 44.3, t))).toLocaleString('en-US')} km/j`, { x: W / 2, y: 470, o: sq.o, s: sq.s }, { bg: RED });
    topTag('rasa', 'TAPI KITA TAK RASA', t, 45.52, 49.96, GREEN);
    bubble('sekali', 'KITA & UDARA\nBERPUTAR SEKALI!', t, 47.5, 49.96, 1080, 92, { top: '#e0f6ff', bot: '#2fa8d8' });
    return sp;
  }],
  // S10 — "Waaah, rupanya Bumi kita macam gasing gergasi!" / "Bila malam, masa untuk tidur"
  [49.98, 57.59, (t) => {
    roomReset();
    room.setTime(1);
    const lie = t > 55.3;
    if (!lie) sitAff(t, { wow: keys(t, [[50.0, 0], [50.15, 0.9], [50.7, 0.9], [51.0, 0]]), smile: 1, brow: 0.5 });
    else lieAff(t);
    const h = bHead();
    if (!lie) lookCam(V(h.x + 1.6, h.y + 0.4, h.z + 2.9), V(h.x, h.y - 0.35, h.z), 46);
    else lookCam(V(0.6, 3.0, 5.4), V(-0.4, 1.3, -0.6), 50);
    ov.flash((1 - inv(49.98, 50.25, t)) * 0.9, '255,250,235');
    const hd = scr(h.clone().add(V(0, 0.4, 0)));
    const b = pop(t, 50.0, 54.0);
    if (!lie) ov.html('bulb', ICONS.bulb(), { x: clamp(hd.x + 220, 150, 900), y: clamp(hd.y - 170, 300, 900) + Math.sin(t * 5) * 8, o: b.o, s: b.s * 0.6, r: 10 });
    ov.sparkles(t, { n: 30, seed: 12, y: 250, h: 900, a: inv(50.0, 50.3, t) * (1 - inv(52.6, 53.2, t)) });
    bubble('gasing', 'GASING GERGASI!', t, 52.04, 54.0, 430, 120, { top: '#efe0ff', bot: '#8a5cff' });
    topTag('tidur', 'BILA MALAM, MASA UNTUK TIDUR', t, 54.04, 57.57, NAVY);
    if (lie) zzz(t, scr(h), 55.6, 57.57);
    return room;
  }],
  // S11 — "Apa lagi kita nak belajar lepas ni?"
  [57.59, OUTRO, (t) => {
    roomReset();
    room.setTime(1);
    const tk = keys(t, [[57.62, 0], [58.0, 1]]);
    const th2 = POSES.thinkR.armR;
    sitAff(t, { smile: 1, brow: 0.3 + 0.4 * tk, headRoll: -0.12 * tk, lookX: 0.35 * tk, lookY: 0.4 * tk, armR: { reach: mix3([-0.5, 0.45, 0.45], th2.reach, tk), pole: th2.pole, point: tk, wx: th2.wx * tk } });
    const h = bHead();
    lookCam(V(h.x + 1.6, h.y + 0.4, h.z + 2.9), V(h.x, h.y - 0.35, h.z), 46);
    const hd = scr(h.clone().add(V(0, 0.4, 0)));
    qmarks(t, hd, 57.59, OUTRO - 0.05, [[57.62, -260, -100, '#ffcf33', -12], [57.9, 250, -160, '#3fa2ff', 10], [58.2, 300, 60, '#ffcf33', 14]]);
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

// Cover / thumbnail (9:16): the Earth half in day and half in night, the Sun blazing.
function thumbnail() {
  ov.begin();
  cam.aspect = W / H;
  cam.updateProjectionMatrix();
  spaceSet(21, spinFor(1.4));
  lookCam(V(EARTH_AT.x - 0.6, -1.6, 14.5), V(EARTH_AT.x - 0.6, -1.4, 0), 50);
  sp.stars.position.copy(cam.position);
  renderer.setViewport(0, 0, W, H);
  renderer.render(sp.scene, cam);
  ov.vignette(0.3);
  ov.tag('thBadge', 'EPISOD 53', { x: W / 2, y: 300 }, { bg: '#2f7bff', small: true });
  ov.bubble('thTitle', 'MATAHARI', { x: W / 2, y: 445, r: -3 }, { size: 130, top: '#fff0d0', bot: '#ff9a3d' });
  ov.bubble('thTitle2', 'PERGI MANA?!', { x: W / 2, y: 600, r: 2 }, { size: 120, top: '#e8eeff', bot: '#5a6ad8' });
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
