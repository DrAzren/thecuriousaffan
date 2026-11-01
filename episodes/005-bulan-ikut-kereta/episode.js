// THE CURIOUS AFFAN — Episode 005: "Kenapa Bulan Macam Ikut Kereta Kita?"
// Every shot is a pure function of time t (seconds), synced to audio/narration.mp3.
import * as THREE from 'three';
import { makeRenderer, loadEnvelope, toScreen, clamp, lerp, inv, smooth, easeOut, easeInOut, backOut, keys, wobble, rng, W, H } from '../../shared/core.js';
import { POSES, blinkAt } from '../../shared/affan.js';
import { Overlay, pop, ICONS, bubbleSVG, drawLogo } from '../../shared/overlay.js';
import { makeTree } from '../../shared/props.js';
import { CAPTIONS, KEYWORDS } from './captions.js';
import { buildRoadWorld, buildToyWorld, buildOutro, carX, CAR_SPEED, TOY_SPEED } from './worlds.js';

const FPS = 30;
const DURATION = 58.5;

const stage = document.getElementById('stage');
const canvas = document.createElement('canvas');
stage.appendChild(canvas);
const renderer = makeRenderer(canvas);
const ov = new Overlay(stage);
const road = buildRoadWorld();
const toy = buildToyWorld();
const outro = buildOutro();
const cam = new THREE.PerspectiveCamera(50, W / H, 0.02, 6000);
const cam2 = new THREE.PerspectiveCamera(50, W / (H / 2), 0.02, 6000);
let env = { at: () => 0 };

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const v1 = new THREE.Vector3();
const talk = (t) => clamp(env.at(t) * 1.2);
const scr = (p, c = cam, vp) => toScreen(p, c, vp);

// --------------------------------------------------------------- road helpers
const roadMoonDir = new THREE.Vector3();
function roadCar(t) {
  const c = road.car;
  c.position.set(carX(t), 0.012 * Math.sin(t * 23) + 0.006 * Math.sin(t * 37), 1.6);
  c.userData.update(CAR_SPEED * t);
  c.updateMatrixWorld(true);
  // passing street lamp light
  let best = null, bd = 1e9;
  for (const h of road.lampHeads) {
    const d = Math.abs(h.x - c.position.x);
    if (h.z > 0 && d < bd) (bd = d), (best = h);
  }
  road.lampLight.position.copy(best);
  road.lampLight.intensity = 90 * Math.exp(-((bd / 5) ** 2));
  road.moonLight.target.position.copy(c.position);
  road.moonLight.position.copy(c.position).addScaledVector(roadMoonDir, 80);
}
// Place the moon far away along a car-local direction, as seen at time tRef.
function roadMoon(tRef, dl, dist = 750) {
  roadMoonDir.set(-dl[0], dl[1], -dl[2]).normalize(); // car is rotated 180 degrees
  road.moon.position.set(carX(tRef), 0, 1.6).addScaledVector(roadMoonDir, dist);
}
const carLocal = (x, y, z) => road.car.localToWorld(V(x, y, z));
function interior(on) {
  road.car.userData.body.visible = !on;
  road.car.userData.interior.visible = on;
  road.fill.intensity = on ? 2.4 : 0;
  road.fill.position.set(-0.1, 1.85, -0.1);
}
function lookCam(c, pos, look, fov = 50) {
  c.position.copy(pos);
  c.fov = fov;
  c.updateProjectionMatrix();
  c.lookAt(look);
  c.updateMatrixWorld(true);
}
const AFF_HEAD_LOCAL = [-0.92, 1.49, -0.45];
const seatedRest = { armL: { reach: [0.55, 0.32, 0.25] }, armR: { reach: [-0.55, 0.32, 0.25] } };
function carAffan(t, p = {}) {
  road.aff.pose({ ...POSES.seated, ...seatedRest, yaw: Math.PI / 2, blink: blinkAt(t, 1), talk: talk(t), ...p, armL: { ...seatedRest.armL, ...(p.armL || {}) }, armR: { ...seatedRest.armR, ...(p.armR || {}) } });
}

// ---------------------------------------------------------------- toy helpers
const toyCarX = (t) => 6 - TOY_SPEED * Math.max(0, t - 14.38);
function toyCar(t) {
  const x = toyCarX(t);
  toy.car.position.set(x, 0.004 * Math.sin(t * 25), 0.32);
  toy.car.userData.update(TOY_SPEED * Math.max(0, t - 14.38) / 0.21);
  toy.car.updateMatrixWorld(true);
  return x;
}
function toyMoon(x, y = 215, z = 900) {
  toy.moon.position.set(x, y, z);
}
function nearRow(on) {
  for (const o of toy.near) o.visible = on;
}
function toyShadowAt(p) {
  toy.moonLight.target.position.copy(p);
  toy.moonLight.position.copy(p).add(v1.copy(toy.moon.position).sub(p).normalize().multiplyScalar(80));
}
const MARK_T = 29.0;
let MOON1 = [-0.35, 0.2, -0.97];
window.setMoon1 = (v) => (MOON1 = v);
const markTree = makeTree(rng(5), { scale: 0.36, leaf: [0x5fe07a], trunk: 0x9a6a45, toy: true });
markTree.position.set(toyCarX(MARK_T) - 0.2, 0, 1.25);
toy.scene.add(markTree);
const markTop = () => V(markTree.position.x, 0.55, markTree.position.z);
const walkX = (t) => -26 - 1.25 * clamp(t - 32.15, 0, 37.0 - 32.15);

// --------------------------------------------------------------- overlay bits
function hook(t) {
  const p = pop(t, 0.12, 5.65, { fin: 0.45 });
  const fl = Math.sin(t * 3) * 6;
  ov.bubble('hook', 'KENAPA BULAN IKUT\nKERETA KITA?', { x: W / 2, y: 410 + fl, o: p.o, s: p.s }, { size: 96 });
  const q = pop(t, 0.5, 5.65);
  ov.tag('ep', 'EPISOD 5', { x: W / 2, y: 268, o: q.o, s: q.s }, { bg: '#2f7bff', small: true });
}

function pinTag(id, text, p, t, a, b, style, dy = -90) {
  const q = pop(t, a, b);
  if (q.o <= 0 || !p.visible) return;
  ov.tag(id, text, { x: clamp(p.x, 170, 910), y: clamp(p.y + dy, 300, 1540), o: q.o, s: q.s }, style);
}

const ORANGE = '#ff8a3d', BLUE = '#2f9bff';

// ======================================================================= SHOTS
const SHOTS = [
  // S1 — hook: Affan at the window, then turns to Papa and points at the moon
  [0, 5.8, (t) => {
    roadMoon(0, MOON1);
    roadCar(t);
    interior(true);
    const look = t < 2.3 ? keys(t, [[0, 0.42], [1.9, 0.5]]) : keys(t, [[2.3, 1.05], [2.65, -0.75], [4.6, -0.75], [5.2, 0.6]], easeOut);
    const pt = keys(t, [[2.6, 0], [3.0, 1], [5.4, 1], [5.75, 0]]);
    const moonT = road.aff.toTorso(road.moon.position);
    const rest = seatedRest.armL.reach;
    carAffan(t, {
      headYaw: look, headPitch: t < 2.3 ? -0.22 : -0.05, lookY: t < 2.3 ? 0.55 : 0.1, lookX: t < 2.3 ? 0.85 : 0,
      brow: t > 2.3 ? 0.8 : 0.3, smile: 0.9,
      armL: { reach: rest.map((r, i) => lerp(r, moonT[i] * 0.0 + [0.95, 1.25, 0.55][i], pt)), point: pt, pole: [1, -1, -0.8] },
    });
    // the point target is aimed at the window; fine-tune towards the moon
    const cp = keys(t, [[0, [-0.12, 1.54, 0.74]], [5.8, [-0.32, 1.52, 0.58]]], (k) => k);
    lookCam(cam, carLocal(...cp), carLocal(-0.95, 1.5, -0.5), 50);
    hook(t);
    return road;
  }],
  // S2a — over-the-shoulder POV: nearby lamps and trees rush past, the moon stays
  [5.8, 9.2, (t) => {
    roadMoon(7.5, [-0.12, 0.17, -1]);
    roadCar(t);
    interior(true);
    carAffan(t, { headYaw: 1.25, headPitch: -0.15, lookY: 0.3, talk: talk(t) * 0.6 });
    const k = inv(5.8, 9.2, t);
    lookCam(cam, carLocal(-0.5 + 0.05 * k, 1.62, 0.2), carLocal(-0.8, 1.72, -3), 54);
    ov.speedLines(t, { y0: 700, y1: 1200, n: 10, a: 0.25, dir: 1 });
    return road;
  }],
  // S2b — exterior tracking: car moves, the moon seems to tag along
  [9.2, 12.1, (t) => {
    roadMoon(10.6, [-0.05, 0.37, -1.0]);
    road.moon.position.x = carX(10.6) + 26;
    roadCar(t);
    interior(false);
    carAffan(t, { headYaw: 1.2, headPitch: -0.3, lookY: 0.4 });
    const cx = carX(t);
    lookCam(cam, V(cx + 1.2, 1.7, -9.5), V(cx - 0.3, 3.7, 0), 50);
    const m = scr(road.moon.position);
    pinTag('moonTag', 'BULAN', m, t, 9.35, 12.0, { bg: BLUE, pointer: 'down' }, -120);
    const a = pop(t, 10.3, 12.0);
    if (a.o > 0) for (let i = 0; i < 3; i++) {
      const ph = (t * 2 + i / 3) % 1;
      ov.html('chev' + i, `<svg width="70" height="90" viewBox="0 0 70 90"><path d="M15 10 L55 45 L15 80" fill="none" stroke="#fff" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"/></svg>`, { x: m.x + 110 + i * 55, y: m.y + 10, o: a.o * (0.3 + 0.7 * Math.sin(ph * Math.PI)), s: 0.8 });
    }
    return road;
  }],
  // S2c — "Jom ikut Affan cari jawapan!" + magic sparkle swirl
  [12.1, 13.85, (t) => {
    roadMoon(12, [-1, 0.14, -0.3]);
    roadCar(t);
    interior(true);
    const up = keys(t, [[12.1, 0], [12.35, 1], [13.3, 1], [13.6, 0.6]], easeOut);
    carAffan(t, {
      headYaw: -0.12, smile: 1, brow: 0.6, lookX: 0.05,
      armR: { reach: [lerp(-0.55, -0.6, up), lerp(0.32, 1.95 + 0.06 * Math.sin(t * 14), up), lerp(0.25, 0.35, up)], pole: [-1, -0.3, -0.5] },
    });
    const k = easeInOut(inv(12.1, 13.85, t));
    lookCam(cam, carLocal(lerp(0.3, 0.05, k), 1.56, lerp(-0.25, -0.38, k)), carLocal(...AFF_HEAD_LOCAL), 48);
    const sk = inv(12.6, 13.75, t);
    ov.swirl(t, W / 2, 820, sk);
    ov.flash(inv(13.45, 13.85, t) ** 2);
    return road;
  }],
  // S3 — imagination world reveal
  [13.85, 16.3, (t) => {
    nearRow(true);
    toyMoon(-8);
    const cx = toyCar(t);
    const ax = 2.4;
    toy.aff.root.position.set(ax, 0, 3.4);
    const open = keys(t, [[13.85, 0], [14.3, 1], [14.85, 1], [15.3, 0]]);
    const pt = keys(t, [[14.85, 0], [15.2, 1], [16.3, 1]]);
    toy.aff.pose({ yaw: Math.PI - 0.45 });
    const carT = toy.aff.toTorso(toy.car.position);
    toy.aff.pose({
      yaw: Math.PI - 0.45, blink: blinkAt(t, 2), talk: talk(t), smile: 1, wow: keys(t, [[13.9, 0.8], [14.3, 0]]), brow: 0.6,
      headYaw: keys(t, [[13.85, 0], [15.0, 0], [15.5, -0.25]]), headPitch: 0.15, lookY: -0.2,
      armL: { reach: [lerp(0.55, 1.05, open), lerp(0.25, 1.55, open), lerp(0.1, 0.35, open)], pole: [1, -0.6, -0.4] },
      armR: pt > 0 ? { reach: [lerp(-0.55, carT[0], pt * 0.6), lerp(0.25, Math.max(0.6, carT[1]), pt * 0.6), lerp(0.1, carT[2], pt * 0.6)], point: pt, pole: [-1, -0.5, -0.5] } : { reach: [lerp(-0.55, -1.05, open), lerp(0.25, 1.55, open), lerp(0.1, 0.35, open)], pole: [-1, -0.6, -0.4] },
    });
    const k = easeOut(inv(13.85, 16.3, t));
    lookCam(cam, V(lerp(5.8, 4.6, k), lerp(4.2, 3.0, k), lerp(-8.5, -6.4, k)), V(2.0, lerp(2.4, 2.0, k), 1.2), 50);
    toyShadowAt(V(2.5, 0, 1.5));
    ov.flash(1 - inv(13.85, 14.25, t));
    ov.sparkles(t, { n: 26, seed: 3, y: 250, h: 1100, a: 0.8 });
    return toy;
  }],
  // S4a — toy-level tracking: nearby objects whizz past (DEKAT + arrows)
  [16.3, 20.3, (t) => {
    nearRow(true);
    toyMoon(toyCarX(18.3) - 4);
    const cx = toyCar(t);
    toy.aff.root.position.set(100, 0, 100);
    lookCam(cam, V(cx + 0.12, 0.42, -3.1), V(cx + 0.12, 0.62, 2.2), 50);
    toyShadowAt(V(cx, 0, 0));
    ov.speedLines(t, { y0: 980, y1: 1380, n: 14, a: 0.55, dir: -1 });
    const d = pop(t, 16.7, 20.25);
    ov.tag('dekat', 'DEKAT', { x: 230, y: 960, o: d.o, s: d.s }, { bg: ORANGE });
    for (let i = 0; i < 2; i++) {
      const slide = ((t * 1.6 + i * 0.5) % 1);
      ov.html('arr' + i, `<div style="transform:scaleX(-1)">${ICONS.arrow(ORANGE)}</div>`, { x: 860 - slide * 420, y: 1110 + i * 120, o: d.o * Math.sin(slide * Math.PI), s: 0.9 });
    }
    const items = [['POKOK', 17.62], ['LAMPU', 18.74], ['RUMAH', 19.54]];
    items.forEach(([w, a], i) => {
      const q = pop(t, a - 0.05, 20.25);
      ov.tag('it' + i, w, { x: 230 + i * 300, y: 340, o: q.o, s: q.s }, { bg: ['#43b85c', '#f2a91c', '#e8606a'][i] });
    });
    return toy;
  }],
  // S4b — Affan reacts as the toy car zooms past
  [20.3, 22.0, (t) => {
    nearRow(true);
    toyMoon(-30);
    const cx = toyCar(t);
    const ax = toyCarX(21.15);
    toy.aff.root.position.set(ax, 0, 3.4);
    const follow = clamp((ax - cx) / 1.6, -1, 1);
    toy.aff.pose({
      yaw: Math.PI, blink: 0, talk: talk(t), wow: keys(t, [[20.3, 0], [20.5, 0.9], [21.3, 0.9], [21.6, 0]]), brow: 1,
      headYaw: -follow * 0.55, headPitch: 0.3, lookX: -follow * 0.9, lookY: -0.5, smile: 1,
      armL: { reach: [0.6, 0.6, 0.45] }, armR: { reach: [-0.6, 0.6, 0.45] },
    });
    lookCam(cam, V(ax + 0.5, 1.75, -5.4), V(ax, 1.95, 3.0), 50);
    toyShadowAt(V(ax, 0, 2));
    ov.speedLines(t, { y0: 1150, y1: 1450, n: 10, a: 0.5, dir: 1 });
    const q = pop(t, 20.7, 21.95);
    ov.bubble('laju', 'LAJU!', { x: W / 2 + 20, y: 380, o: q.o, s: q.s, r: -4 }, { size: 150, top: '#ffb36b', bot: '#ff5a3d' });
    return toy;
  }],
  // S5a — crane up: the moon is very, very far away
  [22.0, 25.9, (t) => {
    nearRow(true);
    const cxm = toyCarX(24);
    toyMoon(cxm - 3);
    const cx = toyCar(t);
    toy.aff.root.position.set(100, 0, 100);
    const k = easeInOut(inv(22.0, 25.3, t));
    lookCam(cam, V(lerp(cx + 0.9, cx + 1.4, k), lerp(0.35, 10, k), lerp(-1.3, -30, k)), V(lerp(cx, cx - 1, k), lerp(0.28, 0.6, k), lerp(0.3, 80, k)), lerp(50, 60, k));
    toyShadowAt(V(cx, 0, 0));
    const c = scr(V(cx, 0.25, 0.32));
    const m = scr(toy.moon.position);
    const la = inv(22.5, 23.1, t);
    if (la > 0 && c.visible && m.visible) {
      const e = easeOut(la);
      ov.dashed(c.x, c.y, lerp(c.x, m.x, e), lerp(c.y, m.y + 60, e), t, { color: '#7cc4ff', w: 12, a: la });
      ov.dot(c.x, c.y, 12, ORANGE, la);
    }
    pinTag('jauh', 'JAUH', m, t, 24.3, 25.85, { bg: BLUE, pointer: 'down' }, -140);
    const s1 = pop(t, 23.28, 25.85), s2 = pop(t, 23.98, 25.85);
    ov.bubble('sangat1', 'SANGAT,', { x: W / 2 - 150, y: 760, o: s1.o, s: s1.s, r: -5 }, { size: 110 });
    ov.bubble('sangat2', 'SANGAT JAUH!', { x: W / 2 + 40, y: 890, o: s2.o, s: s2.s, r: 3 }, { size: 120, top: '#bfe8ff', bot: '#3fa2ff' });
    return toy;
  }],
  // S5b — moving viewpoint: the line to a nearby tree swings a lot, the line to the moon hardly moves
  [25.9, 32.15, (t) => {
    const cx0 = toyCarX(29);
    toyMoon(cx0 + 30, 150, 900);
    nearRow(false);
    toyCar(t);
    toy.aff.root.position.set(100, 0, 100);
    const camAt = (tt) => {
      const cx = toyCarX(tt);
      lookCam(cam, V(cx + 0.5, 1.4, -7.5), V(cx, 1.45, 6), 50);
      return cx;
    };
    const ghosts = [];
    for (const dt of [1.8, 1.2, 0.6]) {
      if (t - dt < 26.2) continue;
      const cx = camAt(t - dt);
      ghosts.push({ c: scr(V(cx, 0.22, 0.32)), tr: scr(markTop()), m: scr(toy.moon.position), a: 0.18 + (1.8 - dt) * 0.12 });
    }
    const cx = camAt(t);
    toyShadowAt(V(cx, 0, 0));
    const c = scr(V(cx, 0.22, 0.32));
    const tr = scr(markTop());
    const m = scr(toy.moon.position);
    const la = inv(26.0, 26.5, t) * (1 - inv(31.85, 32.15, t));
    for (const g of ghosts) {
      ov.line(g.c.x, g.c.y, g.tr.x, g.tr.y, { color: ORANGE, w: 6, a: la * g.a });
      ov.line(g.c.x, g.c.y, g.m.x, g.m.y, { color: '#7cc4ff', w: 6, a: la * g.a });
    }
    ov.line(c.x, c.y, tr.x, tr.y, { color: ORANGE, w: 11, a: la });
    ov.dashed(c.x, c.y, m.x, m.y + 50, t, { color: '#7cc4ff', w: 11, a: la });
    ov.dot(c.x, c.y, 13, '#ffd84a', la);
    ov.dot(tr.x, tr.y, 11, ORANGE, la);
    pinTag('dekatT', 'DEKAT', tr, t, 26.6, 31.9, { bg: ORANGE, pointer: 'down', small: true }, -70);
    const gl = pop(t, 27.62, 31.9);
    if (gl.o > 0) ov.html('fastArr', `<div style="transform:scaleX(-1)">${ICONS.arrow(ORANGE)}</div>`, { x: clamp(tr.x, 200, 880), y: clamp(tr.y + 90, 300, 1500), o: gl.o, s: 0.65 * gl.s });
    pinTag('jauhM', 'JAUH', m, t, 28.84, 31.9, { bg: BLUE, pointer: 'down' }, -130);
    const sd = pop(t, 30.62, 31.9);
    ov.tag('sedikit', 'GERAK SEDIKIT', { x: clamp(m.x, 260, 820), y: m.y + 120, o: sd.o, s: sd.s }, { bg: '#1f6fd6', small: true });
    const lj = pop(t, 27.62, 31.9);
    ov.tag('lajuT', 'GERAK LAJU', { x: 300, y: 1290, o: lj.o, s: lj.s }, { bg: ORANGE, small: true });
    return toy;
  }],
  // S6a — Affan walks; the moon seems to follow him
  [32.15, 37.0, (t) => {
    const ax = walkX(t);
    toyMoon(walkX(34.5) + 85, 215, 900);
    toy.car.position.set(200, 0, 0);
    toy.aff.root.position.set(ax, 0, 3.6);
    const ph = (t - 32.15) * 2.25 * Math.PI;
    const s = Math.sin(ph);
    const ptM = 0;
    toy.aff.pose({ yaw: -Math.PI / 2 });
    const mT = toy.aff.toTorso(toy.moon.position);
    toy.aff.pose({
      yaw: -Math.PI / 2, blink: blinkAt(t, 3), talk: talk(t), smile: 0.9, bob: 0.05 * Math.abs(Math.cos(ph)),
      headYaw: keys(t, [[32.15, -0.85], [34.3, -0.85], [34.8, -0.6]]), headPitch: keys(t, [[32.15, -0.1], [34.5, -0.4]]), lookY: keys(t, [[32.15, 0.2], [34.5, 0.7]]), lookX: keys(t, [[32.15, -0.3], [34.5, 0.4]]),
      legL: { x: -0.5 * s, knee: Math.max(0, s) * 0.6 }, legR: { x: 0.5 * s, knee: Math.max(0, -s) * 0.6 },
      armL: { x: 0.45 * s, z: 0.12, el: -0.3 },
      armR: ptM > 0 ? { reach: [lerp(-0.55, mT[0], ptM), lerp(0.25, mT[1], ptM), lerp(0.1, mT[2], ptM)], point: ptM, pole: [-1, -0.5, -0.5] } : { x: -0.45 * s, z: -0.12, el: -0.3 },
    });
    lookCam(cam, V(ax + 0.6, 2.15, -4.6), V(ax - 0.6, 2.75, 6), 50);
    toyShadowAt(V(ax, 0, 3.6));
    const m = scr(toy.moon.position);
    pinTag('ikut', 'IKUT KITA?', m, t, 34.6, 36.95, { bg: BLUE, pointer: 'down' }, -130);
    return toy;
  }],
  // S6b — "Sebenarnya, bulan tak ikut pun."
  [37.0, 40.05, (t) => {
    const ax = walkX(37);
    toyMoon(walkX(34.5) + 85, 215, 900);
    toy.car.position.set(200, 0, 0);
    toy.aff.root.position.set(ax, 0, 3.6);
    const turn = easeInOut(inv(37.0, 37.5, t));
    const wag = keys(t, [[38.0, 0], [38.3, 1], [39.75, 1], [40.05, 0]]);
    const w = POSES.wagR(t).armR;
    toy.aff.pose({
      yaw: lerp(-Math.PI / 2, -Math.PI, turn), blink: blinkAt(t, 4), talk: talk(t), smile: 0.7, brow: 0.4,
      headYaw: wag * 0.16 * Math.sin(t * 8), headRoll: -0.05,
      armR: wag > 0 ? { reach: [lerp(-0.55, w.reach[0], wag), lerp(0.25, w.reach[1], wag), lerp(0.1, w.reach[2], wag)], pole: w.pole, point: wag, wz: w.wz * wag } : {},
    });
    const k = easeInOut(inv(37.0, 38.2, t));
    lookCam(cam, V(ax + lerp(0.6, 0.15, k), lerp(2.15, 2.75, k), lerp(-4.6, -3.0, k)), V(ax - lerp(0.6, 0, k), lerp(2.75, 2.85, k), 6), 50);
    toyShadowAt(V(ax, 0, 3.6));
    const q = pop(t, 38.6, 40.0);
    ov.bubble('takikut', 'TAK IKUT PUN!', { x: W / 2 - 40, y: 400, o: q.o, s: q.s }, { size: 120 });
    const x = pop(t, 38.68, 40.0, { from: 2 });
    ov.html('cross', ICONS.cross(), { x: 850, y: 300, o: x.o, s: x.s * 0.55 });
    return toy;
  }],
  // S6c — split screen: near vs far
  [40.05, 44.0, (t) => {
    nearRow(true);
    const cxm = toyCarX(42);
    toyMoon(cxm - 2, 140, 900);
    const cx = toyCar(t);
    toy.aff.root.position.set(100, 0, 100);
    lookCam(cam, V(cx + 0.12, 0.38, -2.65), V(cx + 0.12, 0.6, 2.2), 52);
    lookCam(cam2, V(cx, 2.0, 0.32), V(cxm - 2, 2.0 + 900 * Math.tan(-0.016), 900), 44);
    toyShadowAt(V(cx, 0, 0));
    ov.speedLines(t, { y0: 560, y1: 900, n: 10, a: 0.5, dir: -1 });
    const a = pop(t, 40.1, 43.95), b = pop(t, 40.3, 43.95);
    ov.tag('sDekat', 'DEKAT', { x: 220, y: 330, o: a.o, s: a.s }, { bg: ORANGE });
    ov.tag('sLaju', 'GERAK LAJU', { x: 720, y: 330, o: a.o, s: a.s }, { bg: ORANGE, small: true });
    for (let i = 0; i < 2; i++) {
      const slide = ((t * 1.6 + i * 0.5) % 1);
      ov.html('sarr' + i, `<div style="transform:scaleX(-1)">${ICONS.arrow(ORANGE)}</div>`, { x: 860 - slide * 420, y: 760 + i * 110, o: a.o * Math.sin(slide * Math.PI), s: 0.85 });
    }
    ov.tag('sJauh', 'JAUH', { x: 220, y: 1045, o: b.o, s: b.s }, { bg: BLUE });
    const m = scr(toy.moon.position, cam2, { x: 0, y: H / 2, w: W, h: H / 2 });
    const sd = pop(t, 40.5, 43.95);
    ov.tag('sSedikit', 'GERAK SEDIKIT', { x: clamp(m.x, 260, 820), y: m.y - 130, o: sd.o, s: sd.s }, { bg: '#1f6fd6', small: true });
    const wob = Math.sin(t * 3) * 6;
    ov.html('tiny', `<svg width="90" height="40" viewBox="0 0 90 40"><path d="M10 20 H70 M58 8 L74 20 L58 32" fill="none" stroke="#fff" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/></svg>`, { x: clamp(m.x, 260, 820) + 230 + wob, y: m.y - 130, o: sd.o, s: 0.45 });
    const kw = pop(t, 42.5, 43.95);
    if (kw.o > 0) ov.star(220, 330, 40 * kw.s, kw.o * 0.8, '#fff6c8', t);
    return { split: true };
  }],
  // S6d — the "aha" moment: JARAK
  [44.0, 47.25, (t) => {
    const ax = walkX(37);
    toyMoon(ax + 40, 215, 900);
    toy.car.position.set(200, 0, 0);
    toy.aff.root.position.set(ax, 0, 3.6);
    const jump = t > 44.18 && t < 44.75 ? Math.sin(((t - 44.18) / 0.57) * Math.PI) * 0.45 : 0;
    const up = keys(t, [[44.1, 0], [44.3, 1], [44.85, 1], [45.15, 0]]);
    const idx = keys(t, [[45.1, 0], [45.4, 1], [47.25, 1]]);
    toy.aff.pose({
      yaw: Math.PI, blink: t > 44.1 && t < 45 ? 0 : blinkAt(t, 6), talk: talk(t), bob: jump,
      wow: keys(t, [[44.1, 0], [44.25, 1], [44.95, 1], [45.2, 0]]), brow: keys(t, [[44.1, 0], [44.25, 1], [46.5, 0.5]]), smile: 1,
      legL: { x: -0.25 * jump, knee: 0.6 * jump }, legR: { x: -0.25 * jump, knee: 0.6 * jump },
      armL: { reach: [lerp(0.55, 0.85, up), lerp(0.25, 1.85, up), lerp(0.1, 0.3, up)], pole: [1, -0.4, -0.5] },
      armR: idx > 0.01 ? { reach: [lerp(-0.85, -0.5, idx), lerp(1.85, 1.6, idx), lerp(0.3, 0.45, idx)], point: idx, pole: [-1, -0.8, -0.3] } : { reach: [lerp(-0.55, -0.85, up), lerp(0.25, 1.85, up), lerp(0.1, 0.3, up)], pole: [-1, -0.4, -0.5] },
    });
    const k = easeOut(inv(44.0, 47.25, t));
    lookCam(cam, V(ax + 0.1, 2.75, lerp(-3.4, -2.6, k)), V(ax, 2.55, 6), 50);
    toyShadowAt(V(ax, 0, 3.6));
    const head = scr(V(ax, 4.4 + jump, 3.6));
    const b = pop(t, 44.3, 47.2);
    ov.html('bulb', ICONS.bulb(), { x: head.x + 250, y: head.y - 60 + Math.sin(t * 5) * 8, o: b.o, s: b.s * 0.75, r: 10 });
    const j = pop(t, 46.12, 47.2, { fin: 0.4, from: 2.2 });
    ov.bubble('jarak', 'JARAK', { x: W / 2, y: 1170, o: j.o, s: j.s }, { size: 190 });
    const r = pop(t, 46.3, 47.2);
    ov.html('ruler', ICONS.ruler(), { x: W / 2, y: 1330, o: r.o, s: r.s * 1.0 });
    ov.tag('rD', 'DEKAT', { x: 230, y: 1255, o: r.o, s: r.s }, { bg: ORANGE, small: true });
    ov.tag('rJ', 'JAUH', { x: 850, y: 1255, o: r.o, s: r.s }, { bg: BLUE, small: true });
    ov.sparkles(t, { n: 30, seed: 12, y: 250, h: 900, a: inv(44.2, 44.6, t) });
    return toy;
  }],
  // S7 — back in the car: thumbs-up, then "what next?"
  [47.25, 55.3, (t) => {
    roadMoon(49, [-1, 0.13, -0.33]);
    roadCar(t);
    interior(true);
    const th = keys(t, [[49.0, 0], [49.35, 1], [52.5, 1], [52.85, 0]]);
    const tk = keys(t, [[52.85, 0], [53.25, 1], [55.3, 1]]);
    const up = POSES.thumbsUpR.armR, th2 = POSES.thinkR.armR;
    const rest = seatedRest.armR.reach;
    let armR = {};
    if (th > 0) armR = { reach: rest.map((r, i) => lerp(r, up.reach[i], th)), pole: up.pole, thumb: th, wy: up.wy * th, wx: up.wx * th };
    else if (tk > 0) armR = { reach: rest.map((r, i) => lerp(r, th2.reach[i], tk)), pole: th2.pole, point: tk, wx: th2.wx * tk };
    carAffan(t, {
      headYaw: -0.12 + 0.05 * wobble(t, 2), smile: 1, brow: t < 48.2 ? 0.8 : 0.3 + 0.4 * tk,
      headRoll: -0.12 * tk, lookX: 0.35 * tk, lookY: 0.4 * tk, headPitch: -0.08 * tk,
      armR,
    });
    const k = easeInOut(inv(47.25, 55.3, t));
    lookCam(cam, carLocal(lerp(0.42, 0.24, k), 1.55, lerp(-0.22, -0.36, k)), carLocal(-0.92, 1.42, -0.45), 50);
    ov.flash((1 - inv(47.25, 47.55, t)) * 0.9, '20,40,120');
    if (th > 0.5) {
      const hand = scr(road.aff.parts.arms.R.hand.getWorldPosition(V(0, 0, 0)));
      ov.sparkles(t, { n: 12, seed: 33, x: hand.x - 160, y: hand.y - 200, w: 320, h: 300, a: inv(49.2, 49.6, t) * (1 - inv(52.3, 52.7, t)), size: 30 });
    }
    const head = scr(carLocal(...AFF_HEAD_LOCAL));
    [[53.05, -260, -230, '#ffcf33', -12], [53.35, 250, -280, '#3fa2ff', 10], [53.65, 300, -60, '#ffcf33', 14]].forEach(([a, dx, dy, c, r], i) => {
      const q = pop(t, a, 55.25);
      ov.html('q' + i, ICONS.qmark(c), { x: head.x + dx, y: head.y + dy + Math.sin(t * 3 + i) * 10, o: q.o, s: q.s * 0.85, r });
    });
    return road;
  }],
  // Outro — The Curious Affan logo
  [55.3, DURATION, (t) => {
    const k = easeOut(inv(55.3, 56.0, t));
    outro.aff.root.position.set(0, 0, 0);
    const th2 = POSES.thinkR.armR;
    outro.aff.pose({ ...POSES.thinkR, armR: { ...th2 }, smile: 1, blink: blinkAt(t, 9), headRoll: -0.08, lookX: 0.25, lookY: 0.15, headYaw: 0.08 });
    lookCam(cam, V(0, 2.6, lerp(7.5, 5.4, k)), V(0, 2.3, 0), 40);
    const hc = scr(V(0, 2.95, 0));
    ov.flash((1 - inv(55.3, 55.65, t)) * 1.0);
    // golden ring + sparkles
    const g = ov.g;
    const ra = inv(55.4, 56.0, t);
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
    const ic = pop(t, 55.9, 99);
    ov.html('oBulb', ICONS.bulb(), { x: 175, y: 470 + Math.sin(t * 2) * 8, o: ic.o, s: ic.s * 0.55, r: -10 });
    ov.html('oQ1', ICONS.qmark('#ffcf33'), { x: 880, y: 420 + Math.sin(t * 2 + 1) * 8, o: ic.o, s: ic.s * 0.9, r: 12 });
    ov.html('oQ2', ICONS.qmark('#2f6fff'), { x: 220, y: 720 + Math.sin(t * 2 + 2) * 8, o: ic.o, s: ic.s * 0.6, r: -12 });
    const l1 = pop(t, 55.6, 99), l2 = pop(t, 55.8, 99), l3 = pop(t, 56.0, 99);
    drawLogo(ov, { k: [l1, l2, l3], star: pop(t, 56.2, 99) });
    return outro;
  }],
];

function renderSplit() {
  renderer.setScissorTest(true);
  toy.sky.position.copy(cam.position);
  toy.stars.position.copy(cam.position);
  renderer.setViewport(0, H / 2, W, H / 2);
  renderer.setScissor(0, H / 2, W, H / 2);
  cam.aspect = W / (H / 2);
  cam.updateProjectionMatrix();
  renderer.render(toy.scene, cam);
  toy.sky.position.copy(cam2.position);
  toy.stars.position.copy(cam2.position);
  renderer.setViewport(0, 0, W, H / 2);
  renderer.setScissor(0, 0, W, H / 2);
  renderer.render(toy.scene, cam2);
  renderer.setScissorTest(false);
  renderer.setViewport(0, 0, W, H);
  cam.aspect = W / H;
  cam.updateProjectionMatrix();
  // divider
  const g = ov.g;
  g.fillStyle = 'rgba(10,16,50,0.35)';
  g.fillRect(0, H / 2 - 2, W, 16);
  g.fillStyle = '#ffffff';
  g.fillRect(0, H / 2 - 6, W, 12);
}

function frame(t) {
  ov.begin();
  cam.aspect = W / H;
  cam.updateProjectionMatrix();
  const shot = SHOTS.find(([a, b]) => t >= a && t < b) || SHOTS[SHOTS.length - 1];
  for (const w of [road, toy]) {
    w.stars.userData.update(t);
  }
  toy.sparkles.userData.update(t);
  const world = shot[2](t);
  if (world.split) {
    renderSplit();
  } else {
    if (world === road) road.clearAround(cam.position);
    if (world.sky) {
      world.sky.position.copy(cam.position);
      world.stars.position.copy(cam.position);
    }
    renderer.render(world.scene, cam);
  }
  if (world !== outro) ov.vignette(0.32);
  ov.captions(t, CAPTIONS, KEYWORDS);
  ov.end();
}

// Cover / thumbnail (9:16): Affan amazed, pointing at the moon from the car,
// with a big title, episode badge and the series logo. No captions. Key
// elements stay inside the centre 3:4 area (y 240-1680) that profile grids show.
const THUMB = { moon: [-0.35, 0.2, -0.97], cam: [-0.2, 1.5, 0.72], look: [-0.95, 1.62, -0.5], fov: 50 };
window.setThumb = (o) => Object.assign(THUMB, o);
function thumbnail() {
  ov.begin();
  cam.aspect = W / H;
  cam.updateProjectionMatrix();
  const t = 3.6;
  road.stars.userData.update(t);
  roadMoon(0, THUMB.moon);
  roadCar(t);
  interior(true);
  carAffan(t, {
    headYaw: -0.7, headPitch: -0.05, blink: 0, talk: 0, wow: 0.85, brow: 1, lookX: -0.1, lookY: 0.1,
    armL: { reach: [0.95, 1.3, 0.55], point: 1, pole: [1, -1, -0.8] },
  });
  lookCam(cam, carLocal(...THUMB.cam), carLocal(...THUMB.look), THUMB.fov);
  const key = new THREE.PointLight(0xffe2c4, 1.6, 3, 2);
  key.position.copy(carLocal(-0.4, 1.75, 0.25));
  road.scene.add(key);
  road.clearAround(cam.position);
  road.sky.position.copy(cam.position);
  road.stars.position.copy(cam.position);
  renderer.render(road.scene, cam);
  road.scene.remove(key);
  const g = ov.g;
  const top = g.createLinearGradient(0, 0, 0, 760);
  top.addColorStop(0, 'rgba(8,12,44,0.85)');
  top.addColorStop(1, 'rgba(8,12,44,0)');
  g.fillStyle = top;
  g.fillRect(0, 0, W, 760);
  const bot = g.createLinearGradient(0, H - 900, 0, H);
  bot.addColorStop(0, 'rgba(8,12,44,0)');
  bot.addColorStop(1, 'rgba(8,12,44,0.8)');
  g.fillStyle = bot;
  g.fillRect(0, H - 900, W, 900);
  ov.vignette(0.3);
  const m = scr(road.moon.position);
  if (m.visible) ov.sparkles(1.3, { n: 14, seed: 17, x: m.x - 200, y: m.y - 200, w: 400, h: 400, size: 26 });
  ov.tag('thBadge', 'EPISOD 5', { x: W / 2, y: 300 }, { bg: '#2f7bff', small: true });
  ov.bubble('thTitle', 'KENAPA BULAN\nIKUT KITA?', { x: W / 2, y: 475, r: -2 }, { size: 118 });
  ov.html('thQ', ICONS.qmark('#ffcf33'), { x: 120, y: 760, r: -14, s: 0.9 });
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
