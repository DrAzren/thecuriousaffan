// THE CURIOUS AFFAN — Episode 060: "Kenapa Magnet Boleh Tarik Besi?"
// Every shot is a pure function of time t (seconds), synced to audio/narration.mp3.
import * as THREE from 'three';
import { makeRenderer, loadEnvelope, toScreen, clamp, lerp, inv, easeOut, easeIn, easeInOut, keys, W, H } from '../../shared/core.js';
import { POSES, blinkAt } from '../../shared/affan.js';
import { Overlay, pop, ICONS, drawLogo } from '../../shared/overlay.js';
import { CAPTIONS, KEYWORDS } from './captions.js';
import { buildKitchen60, buildLab, buildOutro, CLIPS_AT, LAB_BAR, POLES_AT, IRON_AT, EARTH_AT } from './worlds.js';
import { MAMA_POS, AFF_POS } from '../038-bawang-menangis/worlds.js';

const FPS = 30;
const DURATION = 58.35;
const OUTRO = 55.2;

const stage = document.getElementById('stage');
const canvas = document.createElement('canvas');
stage.appendChild(canvas);
const renderer = makeRenderer(canvas);
const ov = new Overlay(stage);
const kit = buildKitchen60();
const lab = buildLab();
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

// ------------------------------------------------------------------ kitchen
const AFF_YAW_C = Math.atan2(CLIPS_AT.x - AFF_POS.x, CLIPS_AT.z - AFF_POS.z);
const YAW_CAM = Math.atan2(0.4, 1);
function mamaSet(t, p = {}) {
  const m = kit.mama;
  m.root.position.copy(MAMA_POS);
  m.pose({ yaw: 0.35, lean: 0.1, blink: blinkAt(t, 5), smile: 1, brow: 0.2, ...p });
  m.root.updateMatrixWorld(true);
}
function affSet(t, p = {}) {
  const a = kit.aff;
  a.root.position.copy(AFF_POS);
  a.pose({ yaw: AFF_YAW_C, blink: blinkAt(t, 1), talk: talk(t), smile: 0.9, ...p });
  a.root.updateMatrixWorld(true);
}
const affHead = () => kit.aff.parts.head.getWorldPosition(V());
const affFront = (d, side) => affHead().add(V(0.35 + side * 0.2, 0.1, d));
const REV = (d = 0) => V(0.6 - d * 0.2, 2.25, -2.75 - d);
const REV_LOOK = () => V(1.45, 1.55, -0.55);
const HOLD_HIGH = [-0.32, 0.75, 0.6], HOLD_LOW = [-0.25, 1.2, 0.6], HOLD_SHOW = [-0.28, 1.32, 0.6];
const armMag = (reach) => ({ armR: { reach, pole: [-1, -0.6, -0.3] } });
function magSet(show = 1, glowK = 0) {
  kit.mag.visible = show > 0;
  kit.mag.position.copy(kit.aff.parts.arms.R.hand.getWorldPosition(V())).add(V(0, -0.06, 0.02));
  kit.mag.rotation.set(0, AFF_YAW_C, 0);
  kit.magGlow.material.opacity = 0.8 * glowK;
}
// clips jump from the counter to the magnet tips (k: 0 home .. 1 stuck)
function clipsSet(t, jumpAt = 3.84) {
  kit.mag.updateMatrixWorld(true);
  kit.clips.forEach((c, i) => {
    c.visible = true;
    const u = c.userData;
    const k = easeIn(inv(jumpAt + u.ph * 0.35, jumpAt + 0.3 + u.ph * 0.35, t));
    const tip = kit.mag.localToWorld(V(i % 2 ? 0.1 : -0.1, -0.15 - 0.055 * Math.floor(i / 2), 0));
    c.position.copy(u.home).lerp(tip, k);
    c.position.y += 0.12 * Math.sin(Math.PI * k);
    c.rotation.set(lerp(-Math.PI / 2, 0, k), u.rot * (1 - k) + AFF_YAW_C * k, lerp(0, Math.PI / 2, k));
  });
}

// ===================================================================== lab
function domainsSet(t) {
  lab.big.visible = lab.plastic.visible = lab.wood.visible = false;
  lab.domains.forEach((a, i) => (a.rotation.z = 0.08 * Math.sin(t * 3 + i)));
}
function polesSet(t, mode, gap) {
  // mode 'one': only A centred; 'pull': A + B (S faces A's U); 'push': B flipped (U faces U)
  const L = 2.6 / 2;
  lab.pA.visible = true;
  lab.pB.visible = mode !== 'one';
  if (mode === 'one') {
    lab.pA.position.copy(POLES_AT);
    lab.pA.rotation.set(0.25, -0.3, 0);
    return;
  }
  lab.pA.rotation.set(0.25, 0, 0);
  lab.pA.position.copy(POLES_AT).add(V(-L - gap / 2, 0, 0));
  lab.pB.position.copy(POLES_AT).add(V(L + gap / 2, 0, 0));
  lab.pB.rotation.set(mode === 'push' ? -0.25 : 0.25, mode === 'push' ? Math.PI : 0, 0);
}
function ironSet(t) {
  lab.big.visible = lab.plastic.visible = lab.wood.visible = true;
  const near = easeInOut(inv(29.7, 31.0, t));
  const align = easeInOut(inv(31.36, 32.6, t));
  const slide = easeIn(inv(33.58, 34.2, t));
  lab.big.position.copy(IRON_AT).add(V(lerp(6.2, 2.75, near), 0, 0));
  lab.big.rotation.set(0.25, Math.PI, 0);
  lab.iron.position.copy(IRON_AT).add(V(lerp(0, 0.18, slide), 0, 0));
  lab.ironArrows.forEach((a, i) => (a.rotation.z = lerp(a.userData.rand + 0.15 * Math.sin(t * 2 + i), 0, align)));
  lab.plastic.position.copy(IRON_AT).add(V(-0.2, -2.3, 0));
  lab.wood.position.copy(IRON_AT).add(V(2.6, -2.3, 0));
}
function earthSet(t) {
  lab.globe.rotation.y = t * 0.3;
  const k = inv(38.64, 40.6, t);
  lab.loops.forEach((l, i) => {
    const n = l.geometry.index ? l.geometry.index.count : l.geometry.attributes.position.count;
    l.geometry.setDrawRange(0, Math.floor((n * clamp(k * 1.3 - (i % 6) * 0.05)) / 6) * 6);
  });
  const settle = easeOut(inv(42.22, 43.6, t));
  lab.needle.rotation.z = lerp(2.2 + t * 5, 0, settle) + (settle >= 1 ? 0.05 * Math.sin(t * 6) : 0);
}

// =================================================================== SHOTS
const SHOTS = [
  // S1 — kitchen: Affan with a horseshoe magnet; paper clips on the counter
  [0, 2.14, (t) => {
    mamaSet(t);
    affSet(t, { ...armMag(HOLD_HIGH), talk: 0 });
    magSet(1);
    clipsSet(t, 99);
    camMove(t, 0, 2.14, [1.6, 2.7, 5.0], [1.1, 1.6, -0.8], [1.5, 2.6, 4.4], [1.1, 1.6, -0.8], 50);
    const q = pop(t, 0.4, 2.12);
    ov.tag('ep', 'EPISOD 60', { x: W / 2, y: 268, o: q.o, s: q.s }, { bg: '#2f7bff', small: true });
    return kit;
  }],
  // S2 — "Papa! Klip kertas ni melompat sendiri ke magnet! Macam ada tangan halimunan!"
  [2.14, 7.78, (t) => {
    mamaSet(t, { brow: t > 4 ? 0.5 : 0.2 });
    const low = easeInOut(inv(2.8, 3.7, t)) * (1 - easeInOut(inv(5.0, 5.8, t)));
    affSet(t, { ...armMag(mix3(mix3(HOLD_HIGH, HOLD_SHOW, inv(5.0, 5.8, t)), HOLD_LOW, low)), wow: keys(t, [[4.1, 0], [4.3, 0.9], [5.2, 0.9], [5.5, 0]]), brow: 0.5 });
    magSet(1, inv(3.6, 3.9, t) * (1 - inv(5.5, 6.0, t)));
    clipsSet(t);
    if (t > 2.9 && t < 5.8) lookCam(V(0.75, 2.1, -2.45), V(1.35, 1.45, -0.6), 42);
    else camMove(t, 2.14, 7.78, REV(0.4).toArray(), REV_LOOK().toArray(), REV(0).toArray(), REV_LOOK().toArray(), 46);
    const pp = pop(t, 2.18, 3.1, { from: 2 });
    ov.bubble('papa', 'PAPA!', { x: 800, y: 470, o: pp.o, s: pp.s * 0.8, r: 6 }, { size: 110 });
    pinTag('klip', 'KLIP KERTAS', scr(CLIPS_AT.clone().add(V(0, 0.05, 0))), t, 3.08, 3.84, { bg: GREY, pointer: 'down' }, -40);
    pinTag('lompat', 'MELOMPAT SENDIRI!', scr(kit.mag.position.clone().add(V(0, 0.1, 0))), t, 3.9, 5.75, { bg: ORANGE, pointer: 'down' }, -50);
    bubble('halimunan', 'TANGAN\nHALIMUNAN?!', t, 5.82, 7.76, 440, 116, { top: '#f2e6ff', bot: '#a070ff' });
    return kit;
  }],
  // S3 — "Kenapa magnet boleh tarik besi?"
  [7.78, 9.96, (t) => {
    mamaSet(t);
    affSet(t, { yaw: YAW_CAM, ...POSES.thinkR, brow: -0.3, smile: 0.5 });
    magSet(0);
    kit.clips.forEach((c) => (c.visible = false));
    const ah = affHead();
    lookCam(affFront(2.3, 0.6), ah.clone().add(V(0, -0.15, 0)), 46);
    const hd = scr(ah.clone().add(V(0, 0.4, 0)));
    qmarks(t, hd, 7.8, 9.94, [[7.85, -260, 100, '#ffcf33', -12], [8.15, 250, 60, '#3fa2ff', 10], [8.5, 280, 240, '#ffcf33', 14]]);
    bubble('kenapa', 'KENAPA MAGNET\nTARIK BESI?', t, 7.82, 9.94, 430, 108, { top: '#fff0f0', bot: '#e8404a' });
    return kit;
  }],
  // S4 — "Jom ikut Affan cari jawapan!" then into the magnet
  [9.96, 11.76, (t) => {
    mamaSet(t);
    kit.clips.forEach((c) => (c.visible = true));
    const up = keys(t, [[9.98, 0], [10.22, 1], [11.0, 1], [11.3, 0.6]], easeOut);
    affSet(t, { yaw: YAW_CAM, smile: 1, brow: 0.6, armR: { reach: [lerp(-0.6, -0.55, up), lerp(0.25, 1.95 + 0.06 * Math.sin(t * 14), up), lerp(0.2, 0.35, up)], pole: [-1, -0.3, -0.5] } });
    magSet(1, 1);
    clipsSet(t, -10);
    const ah = affHead();
    const k = easeIn(inv(10.9, 11.76, t));
    const mp = kit.mag.position.clone();
    lookCam(affFront(2.3, 0.6).lerp(mp.clone().add(V(0.05, 0, 0.3)), k), ah.clone().add(V(0, -0.15, 0)).lerp(mp, k), 46);
    ov.swirl(t, W / 2, 820, inv(10.0, 11.7, t));
    ov.flash(inv(11.4, 11.76, t) ** 2, '240,232,255');
    return kit;
  }],
  // S5 — millions of tiny magnets inside, all pointing the same way
  [11.76, 18.04, (t) => {
    domainsSet(t);
    lab.pA.visible = lab.pB.visible = false;
    camMove(t, 11.76, 18.04, LAB_BAR.clone().add(V(0.8, 2.8, 10.4)).toArray(), LAB_BAR.toArray(), LAB_BAR.clone().add(V(0.3, 2.0, 9.2)).toArray(), LAB_BAR.toArray(), 50);
    ov.flash(1 - inv(11.76, 12.1, t));
    bubble('juta', 'BERJUTA-JUTA\nMAGNET KECIL!', t, 12.94, 16.0, 450, 108, { top: '#fff6d0', bot: '#ffb21f' });
    bubble('sama', 'SEMUA MENGHALA\nKE ARAH SAMA', t, 16.06, 18.0, 450, 100, { top: '#eafff2', bot: '#2fbf8f' });
    const q = pop(t, 16.1, 18.0);
    if (q.o > 0) ov.html('arrowR', ICONS.arrow(), { x: W / 2, y: 1240, o: q.o, s: q.s * 0.8, r: 0 });
    return lab;
  }],
  // S6 — north and south poles; opposite poles pull, the same poles push
  [18.04, 25.44, (t) => {
    let mode = 'one', gap = 0;
    if (t >= 21.56 && t < 23.3) {
      mode = 'pull';
      gap = lerp(2.4, 0.02, easeIn(inv(21.9, 22.4, t)));
    } else if (t >= 23.3) {
      mode = 'push';
      gap = lerp(0.15, 1.5, easeOut(inv(23.7, 24.3, t)));
    }
    polesSet(t, mode, gap);
    lookCam(POLES_AT.clone().add(V(0, 2.4, mode === 'one' ? 8.0 : 13.0)), POLES_AT.clone().add(V(0, 0.1, 0)), 50);
    ov.flash((1 - inv(18.04, 18.35, t)) + (t > 21.56 && t < 21.8 ? 0.6 * (1 - inv(21.56, 21.8, t)) : 0) + (t > 23.3 && t < 23.55 ? 0.6 * (1 - inv(23.3, 23.55, t)) : 0));
    if (mode === 'one') {
      pinTag('utara', 'KUTUB UTARA (U)', scr(lab.pA.localToWorld(V(0.65, 0.5, 0))), t, 19.16, 21.5, { bg: '#e8404a', pointer: 'down' }, -40);
      pinTag('selatan', 'KUTUB SELATAN (S)', scr(lab.pA.localToWorld(V(-0.65, -0.5, 0))), t, 20.24, 21.5, { bg: '#3a7ae8', pointer: 'up' }, 60);
    }
    bubble('tarik', 'U + S = BERTARIKAN!', t, 21.82, 23.28, 450, 96, { top: '#eafff2', bot: '#2fbf8f' });
    bubble('tolak', 'U + U = BERTOLAKAN!', t, 23.66, 25.42, 450, 96, { top: '#fff0f0', bot: '#ff6a6a' });
    return lab;
  }],
  // S7 — iron has tiny magnets too, all jumbled; near a magnet they line up and iron is pulled
  [25.44, 37.66, (t) => {
    ironSet(t);
    const down = easeInOut(inv(35.0, 35.8, t));
    lookCam(IRON_AT.clone().add(V(1.6, lerp(0.8, -0.4, down), lerp(11.2, 11.6, down))), IRON_AT.clone().add(V(1.5, lerp(0, -1.0, down), 0)), 50);
    ov.flash(1 - inv(25.44, 25.75, t));
    pinTag('besi', 'BESI', scr(IRON_AT.clone().add(V(0, 1.0, 0))), t, 25.5, 29.0, { bg: GREY, pointer: 'down' }, -40);
    topTag('selerak', 'MAGNET KECIL BERSELERAK', t, 27.6, 31.3, ORANGE);
    pinTag('datang', 'MAGNET DATANG DEKAT', scr(lab.big.position.clone().add(V(0, 0.6, 0))), t, 29.7, 31.3, { bg: '#e8404a', pointer: 'down' }, -40);
    topTag('baris', 'BERPUSING & BERBARIS!', t, 31.36, 33.5, GREEN);
    bubble('tertarik', 'BESI TERTARIK!', t, 33.58, 35.2, 450, 110, { top: '#eafff2', bot: '#2fbf8f' });
    pinTag('plastik', 'PLASTIK', scr(lab.plastic.position.clone().add(V(0, 0.55, 0))), t, 35.26, 37.64, { bg: '#2fbf5f', pointer: 'down' }, -30);
    pinTag('kayu', 'KAYU', scr(lab.wood.position.clone().add(V(0, 0.55, 0))), t, 35.7, 37.64, { bg: '#a8743a', pointer: 'down' }, -30);
    const xq = pop(t, 36.24, 37.64);
    if (xq.o > 0) {
      const a = scr(lab.plastic.position), b = scr(lab.wood.position);
      ov.html('x1', ICONS.cross(), { x: a.x, y: a.y, o: xq.o, s: xq.s * 0.4 });
      ov.html('x2', ICONS.cross(), { x: b.x, y: b.y, o: xq.o, s: xq.s * 0.4 });
    }
    return lab;
  }],
  // S8 — "Tahu tak? Bumi kita sendiri ialah magnet gergasi! ... kompas sentiasa tunjuk ke utara."
  [37.66, 44.98, (t) => {
    earthSet(t);
    camMove(t, 37.66, 44.98, EARTH_AT.clone().add(V(1.8, 0.2, 12.0)).toArray(), EARTH_AT.clone().add(V(1.0, -0.4, 0)).toArray(), EARTH_AT.clone().add(V(1.6, 0.0, 10.8)).toArray(), EARTH_AT.clone().add(V(1.1, -0.5, 0)).toArray(), 50);
    ov.flash(1 - inv(37.66, 37.95, t));
    topTag('tahu', 'TAHU TAK?', t, 37.66, 38.62, ORANGE);
    bubble('bumi', 'BUMI =\nMAGNET GERGASI!', t, 38.64, 42.1, 440, 110, { top: '#eaf6ff', bot: '#4aa8ff' });
    pinTag('kompas', 'KOMPAS', scr(lab.compass.position.clone().add(V(0, 1.0, 0))), t, 42.22, 44.96, { bg: '#d8a020', pointer: 'down' }, -30);
    topTag('utara', 'SENTIASA TUNJUK KE UTARA', t, 43.66, 44.96, '#e8404a');
    return lab;
  }],
  // S9 — "Waaah, rupanya tangan halimunan tu daya magnet! Tapi jangan masukkan magnet kecil dalam mulut"
  [44.98, 52.96, (t) => {
    mamaSet(t);
    const warn = t > 48.92;
    affSet(t, { yaw: YAW_CAM, wow: keys(t, [[44.98, 0], [45.15, 0.9], [45.8, 0.9], [46.1, 0]]), smile: warn ? 0.4 : 1, brow: warn ? -0.2 : 0.6, ...armMag(HOLD_SHOW), headYaw: warn && t < 51.0 ? 0.25 * Math.sin(t * 9) : 0 });
    magSet(1, 0.6);
    clipsSet(t, -10);
    const ah = affHead();
    lookCam(affFront(2.6, 0.6), ah.clone().add(V(0, -0.3, 0)), 46);
    const hd = scr(ah.clone().add(V(0, 0.5, 0)));
    const b = pop(t, 45.05, 48.8);
    ov.html('bulb', ICONS.bulb(), { x: clamp(hd.x + 220, 150, 900), y: clamp(hd.y - 170, 300, 900) + Math.sin(t * 5) * 8, o: b.o, s: b.s * 0.6, r: 10 });
    ov.sparkles(t, { n: 30, seed: 12, y: 250, h: 900, a: inv(45.05, 45.35, t) * (1 - inv(48.2, 48.8, t)) });
    bubble('daya', 'DAYA MAGNET!', t, 47.42, 48.88, 430, 120, { top: '#f2e6ff', bot: '#a070ff' });
    bubble('mulut', 'JANGAN MASUKKAN\nMAGNET KE MULUT!', t, 48.92, 52.94, 430, 96, { top: '#fff0f0', bot: '#ff6a6a' });
    const xq = pop(t, 50.2, 52.94);
    if (xq.o > 0) ov.html('xm', ICONS.cross(), { x: 830, y: 1150, o: xq.o, s: xq.s * 0.5 });
    topTag('bahaya', 'BAHAYA!', t, 51.96, 52.94, RED, 1280);
    return kit;
  }],
  // S10 — "Apa lagi kita nak belajar lepas ni?"
  [52.96, OUTRO, (t) => {
    mamaSet(t);
    magSet(0);
    kit.clips.forEach((c) => (c.visible = false));
    const tk = keys(t, [[52.98, 0], [53.4, 1]]);
    const th2 = POSES.thinkR.armR;
    affSet(t, { yaw: YAW_CAM, smile: 1, brow: 0.3 + 0.4 * tk, headRoll: -0.12 * tk, lookX: 0.35 * tk, lookY: 0.4 * tk, headPitch: -0.08 * tk, armR: { reach: mix3([-0.55, 0.3, 0.2], th2.reach, tk), pole: th2.pole, point: tk, wx: th2.wx * tk } });
    const ah = affHead();
    lookCam(affFront(2.4, 0.6), ah.clone().add(V(0, -0.2, 0)), 46);
    const hd = scr(ah.clone().add(V(0, 0.45, 0)));
    qmarks(t, hd, 52.96, OUTRO - 0.05, [[53.0, -260, -100, '#ffcf33', -12], [53.3, 250, -160, '#3fa2ff', 10], [53.6, 300, 60, '#ffcf33', 14]]);
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

// Cover / thumbnail (9:16): Affan amazed, paper clips hanging from his magnet.
function thumbnail() {
  ov.begin();
  cam.aspect = W / H;
  cam.updateProjectionMatrix();
  mamaSet(0, { brow: 0.5 });
  kit.clips.forEach((c) => (c.visible = true));
  affSet(0, { ...armMag(HOLD_SHOW), wow: 0.9, brow: 0.6, talk: 0 });
  magSet(1, 1);
  clipsSet(10, -10);
  lookCam(REV(0.6), REV_LOOK(), 46);
  renderer.setViewport(0, 0, W, H);
  renderer.render(kit.scene, cam);
  ov.vignette(0.3);
  ov.tag('thBadge', 'EPISOD 60', { x: W / 2, y: 300 }, { bg: '#2f7bff', small: true });
  ov.bubble('thTitle', 'TANGAN', { x: W / 2, y: 445, r: -3 }, { size: 140, top: '#f2e6ff', bot: '#a070ff' });
  ov.bubble('thTitle2', 'HALIMUNAN?!', { x: W / 2, y: 600, r: 2 }, { size: 130, top: '#fff0f0', bot: '#e8404a' });
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
