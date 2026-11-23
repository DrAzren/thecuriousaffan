// THE CURIOUS AFFAN — Episode 058: "Kenapa Kita Tersedu?"
// Every shot is a pure function of time t (seconds), synced to audio/narration.mp3.
import * as THREE from 'three';
import { makeRenderer, loadEnvelope, toScreen, clamp, lerp, inv, easeOut, easeIn, easeInOut, keys, W, H } from '../../shared/core.js';
import { POSES, blinkAt } from '../../shared/affan.js';
import { Overlay, pop, ICONS, drawLogo } from '../../shared/overlay.js';
import { CAPTIONS, KEYWORDS } from './captions.js';
import { buildKitchen58, buildBody, buildOutro, PLATE, THROAT, LUNG_Y, DIA_Y, WOMB_AT, TRIG_AT } from './worlds.js';
import { MAMA_POS, AFF_POS, ISLAND_TOP } from '../038-bawang-menangis/worlds.js';

const FPS = 30;
const DURATION = 57.7;
const OUTRO = 54.55;

const stage = document.getElementById('stage');
const canvas = document.createElement('canvas');
stage.appendChild(canvas);
const renderer = makeRenderer(canvas);
const ov = new Overlay(stage);
const kit = buildKitchen58();
const body = buildBody();
const outro = buildOutro();
const cam = new THREE.PerspectiveCamera(50, W / H, 0.02, 6000);
let env = { at: () => 0 };

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const talk = (t) => clamp(env.at(t) * 1.2);
const scr = (p) => toScreen(p, cam);
const mix3 = (a, b, k) => a.map((v, i) => lerp(v, b[i], k));
const BLUE = '#2f9bff', ORANGE = '#ff8a3d', PURPLE = '#7a5cf0', GREEN = '#2fbf5f', PINK = '#ff5c9a', RED = '#ff4d5e', GREY = '#6a7488';

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
// a "HIK!" burst: a quick jolt that decays
const HIKS = [2.9, 7.74, 33.8];
const jolt = (t, list = HIKS) => list.reduce((m, h) => {
  const x = t - h;
  return Math.max(m, x < 0 ? 0 : x < 0.07 ? x / 0.07 : Math.exp(-(x - 0.07) * 7));
}, 0);
function hikBubble(id, t, h, x, y, size = 110) {
  const q = pop(t, h - 0.02, h + 0.9, { from: 2 });
  if (q.o > 0) ov.bubble(id, 'HIK!', { x, y: Math.max(y, 420), o: q.o, s: q.s, r: -8 + 16 * ((h * 7) % 1) }, { size, top: '#fff0f6', bot: '#ff6a9a' });
}
// a clock drawn on the overlay
function clock(t, a, b, x, y) {
  const q = pop(t, a, b);
  if (q.o <= 0) return;
  const g = ov.g;
  g.save();
  g.globalAlpha = q.o;
  g.translate(x, y);
  g.scale(q.s, q.s);
  g.fillStyle = '#ffffff';
  g.strokeStyle = '#2fbf5f';
  g.lineWidth = 16;
  g.beginPath();
  g.arc(0, 0, 90, 0, Math.PI * 2);
  g.fill();
  g.stroke();
  g.strokeStyle = '#1a2440';
  g.lineCap = 'round';
  g.lineWidth = 10;
  for (const [len, sp] of [[50, 0.6], [70, 4]]) {
    const an = t * sp;
    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(Math.sin(an) * len, -Math.cos(an) * len);
    g.stroke();
  }
  g.restore();
}

// ------------------------------------------------------------------ kitchen
const AFF_YAW_P = Math.atan2(PLATE.x - AFF_POS.x, PLATE.z - AFF_POS.z);
const YAW_CAM = Math.atan2(0.4, 1);
function mamaSet(t, p = {}) {
  const m = kit.mama;
  m.root.position.copy(MAMA_POS);
  m.pose({ yaw: 0.35, lean: 0.1, blink: blinkAt(t, 5), smile: 1, brow: 0.2, ...p });
  m.root.updateMatrixWorld(true);
}
function affSet(t, p = {}, j = 0) {
  const a = kit.aff;
  a.root.position.copy(AFF_POS).add(V(0, 0.05 * j, 0));
  a.pose({ yaw: AFF_YAW_P, blink: blinkAt(t, 1), talk: talk(t), smile: 0.9, ...p, ...(j > 0.01 ? { wow: Math.max(p.wow || 0, 0.8 * j), brow: 0.9 * j + (p.brow || 0) * (1 - j), headPitch: (p.headPitch || 0) - 0.25 * j } : {}) });
  a.root.updateMatrixWorld(true);
}
const affHead = () => kit.aff.parts.head.getWorldPosition(V());
const affFront = (d, side) => affHead().add(V(0.35 + side * 0.2, 0.1, d));
// spoon between the plate and the mouth; speed in cycles per second
const MOUTH = [-0.05, 1.3, 0.62], DISH = [-0.2, 0.45, 0.85];
function eatArm(t, speed) {
  const k = 0.5 - 0.5 * Math.cos(t * speed * Math.PI * 2);
  return { reach: mix3(DISH, MOUTH, k), pole: [-1, -0.6, -0.3], wx: -0.4 };
}
function spoonSet(show = 1, full = 1) {
  kit.spoon.visible = show > 0;
  if (!show) return;
  const h = kit.aff.parts.arms.R.hand;
  kit.spoon.position.copy(h.getWorldPosition(V()));
  kit.spoon.quaternion.copy(h.getWorldQuaternion(new THREE.Quaternion()));
  kit.spoon.rotateX(-1.2);
  kit.scoop.visible = full > 0.5;
}
function glassHold(k) {
  if (k <= 0) {
    kit.glass.position.set(PLATE.x - 0.45, ISLAND_TOP, PLATE.z - 0.1);
    return;
  }
  kit.glass.position.copy(kit.aff.parts.arms.L.hand.getWorldPosition(V())).add(V(0, -0.05, 0.02));
}
// the reverse angle: from behind the counter, looking at Affan
const REV = (d = 0) => V(0.6 - d * 0.2, 2.25, -2.75 - d);
const REV_LOOK = () => V(1.5, 1.6, -0.45);

// =================================================================== body
function breathe(t, k = 0) {
  // k: 0..1 inhale amount (lungs fill, diaphragm flattens down)
  body.lungs.forEach((l) => l.scale.set(1 + 0.12 * k, 1 + 0.12 * k, 1 + 0.08 * k));
  body.dia.position.y = DIA_Y - 0.4 * k;
  body.dome.scale.set(1, 0.42 * (1 - 0.35 * k), 0.62);
}
function diaFace(t, { fright = 0 } = {}) {
  body.diaEyes.forEach((e) => {
    e.g.scale.setScalar(1 + 0.6 * fright);
    e.p.scale.setScalar(1 - 0.4 * fright);
  });
  body.diaMouth.visible = fright < 0.4;
  body.diaO.visible = fright >= 0.4;
}
function airFlow(t, a, b) {
  const on = t > a && t < b;
  body.air.forEach((s, i) => {
    s.visible = on;
    if (!on) return;
    const u = (s.userData.ph + (t - a) * 1.4) % 1;
    const side = i % 2 ? 1 : -1;
    const p = u < 0.65 ? V(0, lerp(6.6, 3.3, u / 0.65), 0.35) : V(side * lerp(0, 1.0, (u - 0.65) / 0.35), lerp(3.3, 2.7, (u - 0.65) / 0.35), 0.35);
    s.position.copy(p);
  });
}
function flapsSet(close) {
  body.flaps.forEach(({ pv, s }) => (pv.rotation.z = s * lerp(1.1, 0, close)));
}
function trigSet(t) {
  const items = [[body.tPlate, 21.0, 22.95], [body.can, 22.98, 24.05], [body.star, 24.08, 25.94]];
  items.forEach(([o, a, b]) => {
    const q = pop(t, a, b);
    o.visible = q.o > 0;
    o.scale.setScalar(Math.max(0.001, q.s * (q.o > 0 ? 1 : 0)));
    o.position.set(0, -0.6, 0);
  });
  body.tPlate.rotation.set(0.5, t * 6, 0);
  body.can.rotation.set(0, t * 0.8, 0.1);
  body.fizz.forEach((b) => {
    const u = (b.userData.ph + t * 0.9) % 1;
    b.position.set(0.25 * Math.sin(b.userData.ph * 20 + t), 1.6 + u * 1.6, 0.2 * Math.cos(b.userData.ph * 13));
    b.scale.setScalar(0.6 + u);
  });
  body.star.position.y = -0.2 + 0.35 * Math.abs(Math.sin(t * 9));
  body.star.rotation.set(0, 0, 0.3 * Math.sin(t * 9));
}

// =================================================================== SHOTS
const SHOTS = [
  // S1 — kitchen: Affan gobbles a plate of nasi lemak
  [0, 2.05, (t) => {
    mamaSet(t);
    affSet(t, { armR: eatArm(t, 2.2), talk: 0, smile: 0.8 });
    spoonSet(1);
    glassHold(0);
    camMove(t, 0, 2.05, [1.6, 2.7, 5.0], [1.1, 1.6, -0.8], [1.5, 2.6, 4.4], [1.1, 1.6, -0.8], 50);
    const q = pop(t, 0.4, 2.03);
    ov.tag('ep', 'EPISOD 58', { x: W / 2, y: 268, o: q.o, s: q.s }, { bg: '#2f7bff', small: true });
    return kit;
  }],
  // S2 — "Papa! Hik! Lepas makan nasi lemak laju-laju, Affan tersedu tak berhenti! Hik!"
  [2.05, 8.38, (t) => {
    mamaSet(t, { brow: t > 3 ? 0.5 : 0.2 });
    const eating = t > 3.6 && t < 5.9;
    affSet(t, { armR: eating ? eatArm(t, 2.4) : { reach: [-0.35, 0.5, 0.55], pole: [-1, -0.6, -0.3] }, brow: 0.3 }, jolt(t));
    spoonSet(1, eating ? 1 : 0);
    glassHold(0);
    camMove(t, 2.05, 8.38, REV(0.4).toArray(), REV_LOOK().toArray(), REV(0).toArray(), REV_LOOK().toArray(), 46);
    const pp = pop(t, 2.1, 2.85, { from: 2 });
    ov.bubble('papa', 'PAPA!', { x: 800, y: 470, o: pp.o, s: pp.s * 0.8, r: 6 }, { size: 110 });
    const hd = scr(affHead().add(V(0, 0.3, 0)));
    hikBubble('h1', t, 2.9, clamp(hd.x - 230, 230, 850), hd.y - 160);
    hikBubble('h2', t, 7.74, clamp(hd.x + 230, 230, 850), hd.y - 140);
    pinTag('laju', 'MAKAN LAJU-LAJU!', scr(PLATE.clone().add(V(0, 0.15, 0))), t, 4.3, 6.0, { bg: ORANGE, pointer: 'down' }, -50);
    topTag('tak', 'TERSEDU TAK BERHENTI!', t, 6.08, 8.36, PINK);
    return kit;
  }],
  // S3 — "Kenapa kita tersedu?"
  [8.38, 10.04, (t) => {
    mamaSet(t);
    affSet(t, { yaw: YAW_CAM, ...POSES.thinkR, brow: -0.3, smile: 0.5 });
    spoonSet(0);
    const ah = affHead();
    lookCam(affFront(2.3, 0.6), ah.clone().add(V(0, -0.15, 0)), 46);
    const hd = scr(ah.clone().add(V(0, 0.4, 0)));
    qmarks(t, hd, 8.4, 10.02, [[8.45, -260, 100, '#ffcf33', -12], [8.75, 250, 60, '#3fa2ff', 10], [9.1, 280, 240, '#ffcf33', 14]]);
    bubble('kenapa', 'KENAPA KITA\nTERSEDU?', t, 8.42, 10.02, 430, 112, { top: '#fff0f6', bot: '#ff7ab0' });
    return kit;
  }],
  // S4 — "Jom ikut Affan cari jawapan!"
  [10.04, 12.02, (t) => {
    mamaSet(t);
    spoonSet(0);
    const up = keys(t, [[10.06, 0], [10.3, 1], [11.3, 1], [11.6, 0.6]], easeOut);
    affSet(t, { yaw: YAW_CAM, smile: 1, brow: 0.6, armR: { reach: [lerp(-0.6, -0.55, up), lerp(0.25, 1.95 + 0.06 * Math.sin(t * 14), up), lerp(0.2, 0.35, up)], pole: [-1, -0.3, -0.5] } });
    const ah = affHead();
    const k = easeIn(inv(11.1, 12.02, t));
    const chest = kit.aff.parts.torso.getWorldPosition(V());
    lookCam(affFront(2.3, 0.6).lerp(chest.clone().add(V(0.1, 0.05, 0.3)), k), ah.clone().add(V(0, -0.15, 0)).lerp(chest, k), 46);
    ov.swirl(t, W / 2, 820, inv(10.08, 11.95, t));
    ov.flash(inv(11.65, 12.02, t) ** 2, '255,240,246');
    return kit;
  }],
  // S5 — lungs and the dome-shaped diaphragm: it helps us breathe in and out
  [12.02, 21.0, (t) => {
    const inh = t < 18.4 ? 0.5 + 0.5 * Math.sin(t * 2.2) : t < 19.5 ? easeInOut(inv(18.44, 19.3, t)) : 1 - easeInOut(inv(19.62, 20.6, t));
    breathe(t, inh * (t < 18.4 ? 0.5 : 1));
    diaFace(t);
    flapsSet(0);
    airFlow(t, 18.4, 19.6);
    if (t < 14.3) camMove(t, 12.02, 14.3, [0, 4.0, 15.5], [0, 3.6, 0], [0, 3.4, 13.5], [0, 3.2, 0], 50, easeOut);
    else camMove(t, 14.3, 16.4, [0, 3.4, 13.5], [0, 3.2, 0], [0.3, 2.3, 8.6], [0, 1.9, 0], 50);
    ov.flash(1 - inv(12.02, 12.4, t));
    pinTag('paru', 'PARU-PARU', scr(V(1.1, LUNG_Y + 1.25, 0.4)), t, 12.54, 14.3, { bg: PINK, pointer: 'down' }, -50);
    pinTag('kubah', 'OTOT BERBENTUK KUBAH', scr(V(0, DIA_Y - 0.25, 1.3)), t, 14.4, 16.2, { bg: RED, pointer: 'up' }, 110);
    bubble('dia', 'DIAFRAGMA', t, 16.26, 18.4, 440, 120, { top: '#fff0f2', bot: '#e0485a' });
    topTag('tarik', 'TARIK NAFAS', t, 18.44, 19.55, BLUE);
    topTag('hembus', 'HEMBUS NAFAS', t, 19.62, 20.98, PURPLE);
    return body;
  }],
  // S6 — eating too fast, fizzy drinks, too excited...
  [21.0, 25.94, (t) => {
    breathe(t, 0.3);
    trigSet(t);
    airFlow(t, 0, 0);
    lookCam(TRIG_AT.clone().add(V(0, 0.6, 6.2)), TRIG_AT.clone().add(V(0, 0.1, 0)), 46);
    ov.flash(1 - inv(21.0, 21.3, t));
    topTag('cepat', 'MAKAN TERLALU CEPAT', t, 21.8, 22.95, ORANGE);
    topTag('gas', 'AIR BERGAS', t, 22.98, 24.05, BLUE);
    topTag('teruja', 'TERLALU TERUJA', t, 24.08, 25.92, '#e0a000');
    return body;
  }],
  // S6b — the diaphragm gets a fright and jerks by itself!
  [25.94, 28.24, (t) => {
    const jerk = jolt(t, [27.18]);
    breathe(t, 0.2 + 0.8 * jerk);
    diaFace(t, { fright: easeOut(inv(26.3, 26.5, t)) });
    airFlow(t, 0, 0);
    const sh = 0.12 * jerk;
    lookCam(V(0.2 + sh * Math.sin(t * 90), 2.0 + sh * Math.cos(t * 70), 7.0), V(0, 1.4, 0), 50);
    ov.flash((1 - inv(25.94, 26.2, t)) * 0.8);
    bubble('kejut', 'TERKEJUT!', t, 26.42, 27.15, 440, 120, { top: '#fff0f2', bot: '#e0485a' });
    bubble('sentak', 'TERSENTAK!', t, 27.18, 28.22, 440, 130, { top: '#fff6d0', bot: '#ffb21f' }, 4);
    return body;
  }],
  // S7 — air rushes in; the door in the throat snaps shut: HIK!
  [28.24, 36.2, (t) => {
    breathe(t, t < 31 ? easeOut(inv(28.24, 29.5, t)) : 1 - easeInOut(inv(34.5, 36.0, t)));
    diaFace(t, { fright: t < 33.0 ? 1 : 0 });
    airFlow(t, 28.3, 32.45);
    flapsSet(easeIn(inv(32.4, 32.55, t)) * (1 - easeInOut(inv(35.4, 36.1, t))));
    const j = jolt(t);
    const sh = 0.08 * j;
    if (t < 31.0) camMove(t, 28.24, 31.0, [2.4, 5.2, 9.5], [0, 4.0, 0.3], [2.0, 5.0, 8.6], [0, 4.2, 0.3], 50);
    else camMove(t, 31.0, 32.3, [2.0, 5.0, 8.6], [0, 4.2, 0.3], [0.5 + sh, THROAT.y + 1.5, THROAT.z + 1.9], THROAT.toArray(), 46);
    if (t >= 32.3) lookCam(V(0.5 + sh * Math.sin(t * 90), THROAT.y + 1.5 + sh * Math.cos(t * 80), THROAT.z + 1.9), THROAT, 46);
    topTag('udara', 'UDARA TERSEDUT MASUK!', t, 28.3, 31.0, BLUE);
    pinTag('pintu', 'PINTU KERONGKONG', scr(THROAT.clone().add(V(0, 0.4, 0))), t, 31.4, 33.7, { bg: GREEN, pointer: 'down' }, -50);
    topTag('tutup', 'TERTUTUP CEPAT!', t, 32.4, 33.75, RED);
    hikBubble('h3', t, 33.8, W / 2, 470, 150);
    topTag('itulah', 'ITULAH BUNYI SEDU!', t, 34.72, 36.18, PINK);
    return body;
  }],
  // S8 — babies in the womb hiccup too; hiccups usually stop by themselves
  [36.2, 44.12, (t) => {
    breathe(t, 0);
    airFlow(t, 0, 0);
    const bj = jolt(t, [38.9, 39.7]);
    body.baby.position.set(0, 0.12 * bj, 0);
    body.baby.rotation.set(0, 0.2 * Math.sin(t * 0.8), 0.1 * Math.sin(t * 1.3) - 0.15 * bj);
    camMove(t, 36.2, 44.12, WOMB_AT.clone().add(V(0.3, 0.4, 8.6)).toArray(), WOMB_AT.toArray(), WOMB_AT.clone().add(V(0.1, 0.2, 7.4)).toArray(), WOMB_AT.toArray(), 50);
    ov.flash(1 - inv(36.2, 36.5, t));
    topTag('tahu', 'TAHU TAK?', t, 36.2, 37.36, ORANGE);
    bubble('bayi', 'BAYI PUN\nTERSEDU!', t, 37.38, 40.08, 430, 112, { top: '#fff0f6', bot: '#ff7ab0' });
    const bp = scr(WOMB_AT.clone().add(V(0.6, 1.4, 1)));
    hikBubble('hb1', t, 38.9, 800, 780, 80);
    hikBubble('hb2', t, 39.7, 280, 860, 80);
    topTag('henti', 'BIASANYA BERHENTI SENDIRI', t, 40.12, 44.1, GREEN);
    clock(t, 42.18, 44.1, 230, 1160);
    topTag('minit', 'SELEPAS BEBERAPA MINIT', t, 42.6, 44.1, GREEN, 410);
    return body;
  }],
  // S9 — "Waaah, rupanya sedu tu diafragma yang terkejut! Makan perlahan-lahan, minum air sikit-sikit"
  [44.12, 52.32, (t) => {
    mamaSet(t);
    const slow = t > 47.9 && t < 50.2;
    const drink = easeOut(inv(50.3, 50.8, t));
    const armL = drink > 0 ? { armL: { reach: mix3([0.35, 0.3, 0.3], [0.08, 1.22, 0.6], drink), pole: [1, -0.6, -0.3] } } : {};
    affSet(t, { yaw: t < 47.84 ? YAW_CAM : AFF_YAW_P, wow: keys(t, [[44.12, 0], [44.3, 0.9], [44.9, 0.9], [45.2, 0]]), smile: 1, brow: 0.5, ...(slow ? { armR: eatArm(t - 47.9, 0.45), talk: 0 } : {}), ...armL });
    spoonSet(slow ? 1 : 0);
    glassHold(drink);
    const ah = affHead();
    if (t < 47.84) lookCam(affFront(2.3, 0.6), ah.clone().add(V(0, -0.15, 0)), 46);
    else lookCam(REV(0.1), REV_LOOK(), 46);
    const hd = scr(ah.clone().add(V(0, 0.5, 0)));
    if (t < 47.84) {
      const b = pop(t, 44.2, 47.8);
      ov.html('bulb', ICONS.bulb(), { x: clamp(hd.x + 220, 150, 900), y: clamp(hd.y - 170, 300, 900) + Math.sin(t * 5) * 8, o: b.o, s: b.s * 0.6, r: 10 });
      ov.sparkles(t, { n: 30, seed: 12, y: 250, h: 900, a: inv(44.2, 44.5, t) * (1 - inv(47.2, 47.8, t)) });
    }
    bubble('kejut2', 'DIAFRAGMA\nTERKEJUT!', t, 45.38, 47.8, 430, 112, { top: '#fff0f2', bot: '#e0485a' });
    topTag('perlahan', 'MAKAN PERLAHAN-LAHAN', t, 48.86, 50.3, GREEN);
    topTag('minum', 'MINUM AIR SIKIT-SIKIT', t, 50.36, 52.3, BLUE);
    return kit;
  }],
  // S10 — "Apa lagi kita nak belajar lepas ni?"
  [52.32, OUTRO, (t) => {
    mamaSet(t);
    spoonSet(0);
    glassHold(0);
    const tk = keys(t, [[52.34, 0], [52.7, 1]]);
    const th2 = POSES.thinkR.armR;
    affSet(t, { yaw: YAW_CAM, smile: 1, brow: 0.3 + 0.4 * tk, headRoll: -0.12 * tk, lookX: 0.35 * tk, lookY: 0.4 * tk, headPitch: -0.08 * tk, armR: { reach: mix3([-0.55, 0.3, 0.2], th2.reach, tk), pole: th2.pole, point: tk, wx: th2.wx * tk } });
    const ah = affHead();
    lookCam(affFront(2.4, 0.6), ah.clone().add(V(0, -0.2, 0)), 46);
    const hd = scr(ah.clone().add(V(0, 0.45, 0)));
    qmarks(t, hd, 52.32, OUTRO - 0.05, [[52.35, -260, -100, '#ffcf33', -12], [52.65, 250, -160, '#3fa2ff', 10], [52.95, 300, 60, '#ffcf33', 14]]);
    return kit;
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

// Cover / thumbnail (9:16): Affan mid-hiccup over his nasi lemak.
function thumbnail() {
  ov.begin();
  cam.aspect = W / H;
  cam.updateProjectionMatrix();
  mamaSet(0, { brow: 0.5 });
  affSet(0, { armR: { reach: [-0.35, 0.5, 0.55], pole: [-1, -0.6, -0.3] }, talk: 0, smile: 0.6 }, 1);
  spoonSet(1, 0);
  glassHold(0);
  lookCam(REV(0.1), REV_LOOK(), 46);
  renderer.setViewport(0, 0, W, H);
  renderer.render(kit.scene, cam);
  ov.vignette(0.3);
  ov.tag('thBadge', 'EPISOD 58', { x: W / 2, y: 300 }, { bg: '#2f7bff', small: true });
  ov.bubble('thTitle', 'HIK!', { x: W / 2, y: 460, r: -6 }, { size: 170, top: '#fff0f6', bot: '#ff6a9a' });
  ov.bubble('thTitle2', 'KENAPA NI?!', { x: W / 2, y: 640, r: 2 }, { size: 130, top: '#fff6d0', bot: '#ffb21f' });
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
