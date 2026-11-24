// THE CURIOUS AFFAN — Episode 062: "Macam Mana Roti Jadi Gebu?"
// Every shot is a pure function of time t (seconds), synced to audio/narration.mp3.
import * as THREE from 'three';
import { makeRenderer, loadEnvelope, toScreen, clamp, lerp, inv, easeOut, easeIn, easeInOut, keys, W, H } from '../../shared/core.js';
import { POSES, blinkAt } from '../../shared/affan.js';
import { Overlay, pop, ICONS, drawLogo } from '../../shared/overlay.js';
import { CAPTIONS, KEYWORDS } from './captions.js';
import { buildKitchen62, buildDough, buildOutro, LOAF_AT, ING_AT, YEAST_AT, GLUTEN_AT, BOWL_AT, OVEN_AT, SLICE_AT } from './worlds.js';
import { MAMA_POS, AFF_POS, ISLAND_TOP, BOARD } from '../038-bawang-menangis/worlds.js';

const FPS = 30;
const DURATION = 52.7;
const OUTRO = 49.55;

const stage = document.getElementById('stage');
const canvas = document.createElement('canvas');
stage.appendChild(canvas);
const renderer = makeRenderer(canvas);
const ov = new Overlay(stage);
const kit = buildKitchen62();
const dg = buildDough();
const outro = buildOutro();
const cam = new THREE.PerspectiveCamera(50, W / H, 0.02, 6000);
let env = { at: () => 0 };

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const talk = (t) => clamp(env.at(t) * 1.2);
const scr = (p) => toScreen(p, cam);
const mix3 = (a, b, k) => a.map((v, i) => lerp(v, b[i], k));
const BLUE = '#2f9bff', ORANGE = '#ff8a3d', PURPLE = '#7a5cf0', GREEN = '#2fbf5f', PINK = '#ff5c9a', RED = '#ff4d5e', GREY = '#6a7488', GOLD = '#d8a020';

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
// a timer drawn on the overlay
function timer(t, a, b, x, y, label) {
  const q = pop(t, a, b);
  if (q.o <= 0) return;
  const g = ov.g;
  g.save();
  g.globalAlpha = q.o;
  g.translate(x, y);
  g.scale(q.s, q.s);
  g.fillStyle = '#ffffff';
  g.strokeStyle = '#ff8a3d';
  g.lineWidth = 14;
  g.beginPath();
  g.arc(0, 0, 80, 0, Math.PI * 2);
  g.fill();
  g.stroke();
  g.fillStyle = '#ffcf9a';
  g.beginPath();
  g.moveTo(0, 0);
  g.arc(0, 0, 66, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * clamp(inv(a, b, t)));
  g.fill();
  g.restore();
}

// ------------------------------------------------------------------ kitchen
const AFF_YAW_L = Math.atan2(LOAF_AT.x - AFF_POS.x, LOAF_AT.z - AFF_POS.z);
const YAW_CAM = Math.atan2(0.4, 1);
function mamaSet(t, knead = 1, p = {}) {
  const m = kit.mama;
  m.root.position.copy(MAMA_POS);
  const base = { yaw: 0, lean: 0.25, blink: blinkAt(t, 5), smile: 1, brow: 0.2, ...p };
  m.pose(base);
  m.root.updateMatrixWorld(true);
  const push = knead * Math.max(0, Math.sin(t * 5));
  const c = V(BOARD.x - 0.1, ISLAND_TOP + 0.2 - 0.06 * push, BOARD.z + 0.05 + 0.08 * push);
  m.pose({ ...base, armR: { reach: m.toTorso(c.clone().add(V(-0.1, 0, 0))), pole: [-1, -0.6, -0.4] }, armL: { reach: m.toTorso(c.clone().add(V(0.1, 0, 0))), pole: [1, -0.6, -0.4] } });
  m.root.updateMatrixWorld(true);
  kit.dough.scale.set(1 + 0.15 * push, 0.7 - 0.15 * push, 1 + 0.1 * push);
}
function affSet(t, p = {}) {
  const a = kit.aff;
  a.root.position.copy(AFF_POS);
  a.pose({ yaw: AFF_YAW_L, blink: blinkAt(t, 1), talk: talk(t), smile: 0.9, ...p });
  a.root.updateMatrixWorld(true);
}
const affHead = () => kit.aff.parts.head.getWorldPosition(V());
const affFront = (d, side) => affHead().add(V(0.35 + side * 0.2, 0.1, d));
const REV = (d = 0) => V(0.6 - d * 0.2, 2.25, -2.75 - d);
const REV_LOOK = () => V(1.45, 1.55, -0.55);
// press the loaf: squash 0..1
function loafSet(sq) {
  kit.loaf.scale.set(1 + 0.08 * sq, 1 - 0.45 * sq, 1 + 0.08 * sq);
}
const PRESS = (t) => easeInOut(inv(3.74, 4.4, t)) * (1 - easeOut(inv(5.0, 5.5, t)));

// ===================================================================== dough
function doughSet(t) {
  // ingredients pop in one by one
  const at = [12.48, 13.44, 14.06, 14.82];
  dg.items.forEach((it, i) => {
    const q = pop(t, at[i], 99);
    it.scale.setScalar(0.75 * Math.max(0.001, q.s * (q.o > 0 ? 1 : 0)));
  });
  // yeast eats sugar 18.4-20.0, then puffs bubbles
  const chew = t > 18.4 && t < 20.2 ? Math.abs(Math.sin(t * 9)) : 0;
  dg.mouth.scale.set(1.3, 0.4 + 0.9 * chew, 0.4);
  dg.body.scale.set(1 + 0.04 * Math.sin(t * 3), 1.15 + 0.04 * Math.sin(t * 3 + 1), 1);
  dg.sugars.forEach((c, i) => {
    const k = easeIn(inv(18.4 + i * 0.3, 18.9 + i * 0.3, t));
    c.visible = k < 1 && t > 18.0;
    const from = YEAST_AT.clone().add(V(-3 + i * 1.5, 4.5, 1));
    c.position.copy(from.lerp(YEAST_AT.clone().add(V(0, 1.45, 1.2)), k));
    c.rotation.set(t * 3 + i, t * 2, 0);
  });
  dg.co2.forEach((b) => {
    const u = b.userData;
    const age = t - 20.16 - u.ph * 3;
    b.visible = age > 0;
    if (age <= 0) return;
    const d = Math.min(age * 1.1, 3.6);
    b.position.set(YEAST_AT.x + Math.cos(u.a) * (1.3 + d * u.r), 1.6 + Math.sin(u.a) * (1.2 + d * u.r) + age * 0.15, YEAST_AT.z + 1.0 + Math.sin(u.a * 2) * 0.3);
    b.scale.setScalar(0.6 + Math.min(age, 2) * 0.5);
  });
  // gluten bubbles inflate
  const inflate = easeInOut(inv(28.14, 30.0, t));
  dg.glutenBubbles.forEach((g, i) => {
    g.scale.setScalar(0.6 + 0.55 * inflate + 0.04 * Math.sin(t * 4 + i));
    g.rotation.set(t * 0.2, t * 0.3 + i, 0);
  });
  // dough rises to twice its height
  const up = easeInOut(inv(30.04, 31.9, t));
  dg.riseDough.scale.set(1 + 0.08 * up, 0.45 + 0.55 * up, 1 + 0.08 * up);
  // oven glow and baking colour
  const bake = easeInOut(inv(33.0, 34.4, t));
  dg.ovenGlow.material.opacity = 0.9 * bake;
  dg.ovenWin.material.color.setHex(0x3a2010).lerp(new THREE.Color(0xff9a3a), bake);
  dg.slice.rotation.set(0.15, -0.35 + 0.25 * Math.sin(t * 0.6), 0);
}

// =================================================================== SHOTS
const SHOTS = [
  // S1 — kitchen: Mama kneads dough; a loaf of bread in front of Affan
  [0, 2.22, (t) => {
    mamaSet(t);
    affSet(t, { talk: 0 });
    loafSet(0);
    camMove(t, 0, 2.22, [1.6, 2.7, 5.0], [0.7, 1.6, -0.9], [1.5, 2.6, 4.4], [0.7, 1.6, -0.9], 50);
    const q = pop(t, 0.4, 2.2);
    ov.tag('ep', 'EPISOD 62', { x: W / 2, y: 268, o: q.o, s: q.s }, { bg: '#2f7bff', small: true });
    return kit;
  }],
  // S2 — "Papa! Bila Affan tekan roti ni, ia kembang semula macam span!"
  [2.22, 7.22, (t) => {
    mamaSet(t, 0.6);
    const pr = PRESS(t);
    const reach = t > 3.3 && t < 5.6 ? { armR: { reach: [-0.15, lerp(0.75, 0.48, pr), 0.85], pole: [-1, -0.6, -0.3], point: 1 } } : {};
    affSet(t, { ...reach, wow: keys(t, [[5.0, 0], [5.2, 0.9], [5.8, 0.9], [6.1, 0]]), brow: 0.5 });
    loafSet(pr);
    camMove(t, 2.22, 7.22, [0.6, 2.3, -2.85], [1.35, 1.45, -0.6], [0.65, 2.2, -2.7], [1.35, 1.42, -0.6], 44);
    const pp = pop(t, 2.26, 3.2, { from: 2 });
    ov.bubble('papa', 'PAPA!', { x: 800, y: 470, o: pp.o, s: pp.s * 0.8, r: 6 }, { size: 110 });
    pinTag('tekan', 'TEKAN...', scr(LOAF_AT.clone().add(V(0, 0.4, 0))), t, 3.74, 5.0, { bg: GREY, pointer: 'down' }, -40);
    pinTag('kembang', 'KEMBANG SEMULA!', scr(LOAF_AT.clone().add(V(0, 0.45, 0))), t, 5.08, 7.2, { bg: ORANGE, pointer: 'down' }, -40);
    bubble('span', 'MACAM SPAN!', t, 5.82, 7.2, 430, 120, { top: '#fff6d0', bot: '#ffb21f' });
    return kit;
  }],
  // S3 — "Macam mana roti jadi gebu?"
  [7.22, 9.12, (t) => {
    mamaSet(t, 0.4);
    affSet(t, { yaw: YAW_CAM, ...POSES.thinkR, brow: -0.3, smile: 0.5 });
    loafSet(0);
    const ah = affHead();
    lookCam(affFront(2.3, 0.6), ah.clone().add(V(0, -0.15, 0)), 46);
    const hd = scr(ah.clone().add(V(0, 0.4, 0)));
    qmarks(t, hd, 7.24, 9.1, [[7.27, -260, 100, '#ffcf33', -12], [7.55, 250, 60, '#3fa2ff', 10], [7.9, 280, 240, '#ffcf33', 14]]);
    bubble('macam', 'MACAM MANA ROTI\nJADI GEBU?', t, 7.26, 9.1, 430, 108, { top: '#fff6d0', bot: '#d8903e' });
    return kit;
  }],
  // S4 — "Jom ikut Affan cari jawapan!" then into the bread
  [9.12, 11.04, (t) => {
    mamaSet(t, 0.4);
    loafSet(0);
    const up = keys(t, [[9.14, 0], [9.38, 1], [10.3, 1], [10.6, 0.6]], easeOut);
    affSet(t, { yaw: YAW_CAM, smile: 1, brow: 0.6, armR: { reach: [lerp(-0.6, -0.55, up), lerp(0.25, 1.95 + 0.06 * Math.sin(t * 14), up), lerp(0.2, 0.35, up)], pole: [-1, -0.3, -0.5] } });
    const ah = affHead();
    const k = easeIn(inv(10.1, 11.04, t));
    const lp = LOAF_AT.clone().add(V(0, 0.2, 0));
    lookCam(affFront(2.3, 0.6).lerp(lp.clone().add(V(0.05, 0.05, 0.3)), k), ah.clone().add(V(0, -0.15, 0)).lerp(lp, k), 46);
    ov.swirl(t, W / 2, 820, inv(9.16, 10.98, t));
    ov.flash(inv(10.68, 11.04, t) ** 2, '255,246,230');
    return kit;
  }],
  // S5 — flour, water, sugar and yeast; yeast is a tiny living thing
  [11.04, 18.38, (t) => {
    doughSet(t);
    if (t < 15.5) camMove(t, 11.04, 15.5, ING_AT.clone().add(V(0, 3.0, 12.5)).toArray(), ING_AT.clone().add(V(0, 0.6, 0)).toArray(), ING_AT.clone().add(V(0, 2.8, 11.4)).toArray(), ING_AT.clone().add(V(0, 0.6, 0)).toArray(), 50);
    else camMove(t, 15.5, 16.3, ING_AT.clone().add(V(0, 2.8, 11.4)).toArray(), ING_AT.clone().add(V(0, 0.6, 0)).toArray(), YEAST_AT.clone().add(V(0, 2.2, 7.5)).toArray(), YEAST_AT.clone().add(V(0, 1.8, 0)).toArray(), 50);
    ov.flash(1 - inv(11.04, 11.4, t));
    const lab = (i, txt, bg, a) => {
      const q = pop(t, a, 15.4);
      const p = scr(dg.items[i].getWorldPosition(V()).add(V(0, 1.4, 0)));
      if (q.o > 0) ov.tag('ing' + i, txt, { x: p.x, y: p.y - 30 - (i % 2) * 70, o: q.o, s: q.s }, { bg, pointer: 'down', small: true });
    };
    lab(0, 'TEPUNG', '#c8a070', 12.48);
    lab(1, 'AIR', BLUE, 13.44);
    lab(2, 'GULA', '#9aa4b4', 14.06);
    lab(3, 'YIS', PURPLE, 14.82);
    bubble('hidup', 'YIS = MAKHLUK HIDUP\nYANG SANGAT KECIL!', t, 16.14, 18.36, 430, 90, { top: '#f2e6ff', bot: '#a070ff' });
    return dg;
  }],
  // S6 — yeast eats sugar and breathes out carbon dioxide bubbles into the dough
  [18.38, 24.52, (t) => {
    doughSet(t);
    camMove(t, 18.38, 24.52, YEAST_AT.clone().add(V(0, 2.2, 7.5)).toArray(), YEAST_AT.clone().add(V(0, 1.8, 0)).toArray(), YEAST_AT.clone().add(V(0.5, 2.4, 9.0)).toArray(), YEAST_AT.clone().add(V(0, 2.0, 0)).toArray(), 50);
    topTag('makan', 'YIS MAKAN GULA', t, 18.38, 20.1, PURPLE);
    topTag('hembus', 'HEMBUS GAS KARBON DIOKSIDA', t, 20.16, 22.0, BLUE);
    bubble('gelembung', 'GELEMBUNG GAS\nDALAM DOH!', t, 22.06, 24.5, 430, 104, { top: '#eaf6ff', bot: '#4aa8ff' });
    return dg;
  }],
  // S7 — gluten is like balloon rubber: it traps the gas and the dough doubles
  [24.52, 32.08, (t) => {
    doughSet(t);
    if (t < 29.4) camMove(t, 24.52, 29.4, GLUTEN_AT.clone().add(V(0, 2.0, 8.5)).toArray(), GLUTEN_AT.clone().add(V(0, 1.5, 0)).toArray(), GLUTEN_AT.clone().add(V(0.3, 1.8, 7.4)).toArray(), GLUTEN_AT.clone().add(V(0, 1.5, 0)).toArray(), 50);
    else lookCam(BOWL_AT.clone().add(V(0, 3.2, 7.6)), BOWL_AT.clone().add(V(0, 0.9, 0)), 50);
    ov.flash((1 - inv(24.52, 24.85, t)) + (t > 29.4 && t < 29.7 ? 0.7 * (1 - inv(29.4, 29.7, t)) : 0));
    topTag('gluten', 'TEPUNG ADA GLUTEN', t, 24.52, 26.45, GOLD);
    bubble('belon', 'MACAM BELON\nGETAH!', t, 26.5, 28.1, 430, 112, { top: '#fff6d0', bot: '#e8b84a' });
    topTag('perangkap', 'PERANGKAP GELEMBUNG GAS', t, 28.14, 29.38, GOLD);
    bubble('naik', 'DOH NAIK\nDUA KALI GANDA!', t, 30.04, 32.06, 430, 108, { top: '#eafff2', bot: '#2fbf8f' });
    timer(t, 29.6, 32.0, 860, 760);
    return dg;
  }],
  // S8 — baked: the bubbles set hard, so bread is full of little holes
  [32.08, 38.84, (t) => {
    doughSet(t);
    if (t < 36.3) camMove(t, 32.08, 36.3, OVEN_AT.clone().add(V(0, 2.4, 9.5)).toArray(), OVEN_AT.clone().add(V(0, 1.8, 0)).toArray(), OVEN_AT.clone().add(V(0, 2.0, 8.0)).toArray(), OVEN_AT.clone().add(V(0, 1.6, 0)).toArray(), 50);
    else lookCam(SLICE_AT.clone().add(V(0, 2.0, 7.2)), SLICE_AT.clone().add(V(0, 1.7, 0)), 46);
    ov.flash((1 - inv(32.08, 32.4, t)) + (t > 36.3 && t < 36.6 ? 0.7 * (1 - inv(36.3, 36.6, t)) : 0));
    topTag('tahu', 'TAHU TAK?', t, 32.08, 33.1, ORANGE);
    topTag('bakar', 'BILA DIBAKAR...', t, 33.18, 34.4, ORANGE);
    bubble('keras', 'GELEMBUNG\nJADI KERAS!', t, 34.44, 36.28, 430, 112, { top: '#fff0e0', bot: '#ff8a3d' });
    bubble('lubang', 'LUBANG-LUBANG\nKECIL!', t, 37.34, 38.82, 430, 112, { top: '#fff6d0', bot: '#d8903e' });
    return dg;
  }],
  // S9 — "Waaah, rupanya roti gebu sebab berjuta-juta gelembung kecil! Minta tolong orang dewasa."
  [38.84, 47.28, (t) => {
    mamaSet(t, t > 43.8 ? 0 : 0.5, { headRoll: t > 45.3 ? 0.08 * Math.sin(t * 3) : 0 });
    affSet(t, { yaw: YAW_CAM, wow: keys(t, [[38.84, 0], [39.0, 0.9], [39.6, 0.9], [39.9, 0]]), smile: 1, brow: 0.6, ...(t > 45.3 ? POSES.thumbsUpR : {}) });
    loafSet(0);
    const ah = affHead();
    if (t < 43.86) lookCam(affFront(2.3, 0.6), ah.clone().add(V(0, -0.15, 0)), 46);
    else camMove(t, 43.86, 47.28, [1.6, 2.6, 4.6], [0.8, 1.7, -1.0], [1.5, 2.5, 4.2], [0.8, 1.7, -1.0], 50);
    const hd = scr(ah.clone().add(V(0, 0.5, 0)));
    if (t < 43.86) {
      const b = pop(t, 38.9, 43.8);
      ov.html('bulb', ICONS.bulb(), { x: clamp(hd.x + 220, 150, 900), y: clamp(hd.y - 170, 300, 900) + Math.sin(t * 5) * 8, o: b.o, s: b.s * 0.6, r: 10 });
      ov.sparkles(t, { n: 30, seed: 12, y: 250, h: 900, a: inv(38.9, 39.2, t) * (1 - inv(43.2, 43.8, t)) });
    }
    bubble('juta', 'BERJUTA-JUTA\nGELEMBUNG KECIL!', t, 41.12, 43.84, 430, 100, { top: '#eaf6ff', bot: '#4aa8ff' });
    bubble('dewasa', 'MINTA TOLONG\nORANG DEWASA', t, 45.38, 47.26, 430, 104, { top: '#fff0f6', bot: '#ff7ab0' });
    return kit;
  }],
  // S10 — "Apa lagi kita nak belajar lepas ni?"
  [47.28, OUTRO, (t) => {
    mamaSet(t, 0.3);
    loafSet(0);
    const tk = keys(t, [[47.3, 0], [47.7, 1]]);
    const th2 = POSES.thinkR.armR;
    affSet(t, { yaw: YAW_CAM, smile: 1, brow: 0.3 + 0.4 * tk, headRoll: -0.12 * tk, lookX: 0.35 * tk, lookY: 0.4 * tk, headPitch: -0.08 * tk, armR: { reach: mix3([-0.55, 0.3, 0.2], th2.reach, tk), pole: th2.pole, point: tk, wx: th2.wx * tk } });
    const ah = affHead();
    lookCam(affFront(2.4, 0.6), ah.clone().add(V(0, -0.2, 0)), 46);
    const hd = scr(ah.clone().add(V(0, 0.45, 0)));
    qmarks(t, hd, 47.28, OUTRO - 0.05, [[47.32, -260, -100, '#ffcf33', -12], [47.6, 250, -160, '#3fa2ff', 10], [47.9, 300, 60, '#ffcf33', 14]]);
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

// Cover / thumbnail (9:16): the giant yeast puffing bubbles.
function thumbnail() {
  ov.begin();
  cam.aspect = W / H;
  cam.updateProjectionMatrix();
  doughSet(22.5);
  lookCam(YEAST_AT.clone().add(V(0.4, 2.0, 8.4)), YEAST_AT.clone().add(V(0, 1.6, 0)), 50);
  dg.sky.position.copy(cam.position);
  renderer.setViewport(0, 0, W, H);
  renderer.render(dg.scene, cam);
  ov.vignette(0.3);
  ov.tag('thBadge', 'EPISOD 62', { x: W / 2, y: 300 }, { bg: '#2f7bff', small: true });
  ov.bubble('thTitle', 'ROTI ADA', { x: W / 2, y: 445, r: -3 }, { size: 140, top: '#fff6d0', bot: '#d8903e' });
  ov.bubble('thTitle2', 'BELON?!', { x: W / 2, y: 600, r: 2 }, { size: 150, top: '#eaf6ff', bot: '#4aa8ff' });
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
