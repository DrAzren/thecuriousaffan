// THE CURIOUS AFFAN — Episode 030: "Kenapa Hujan Ada Bau?"
// Every shot is a pure function of time t (seconds), synced to audio/narration.mp3.
import * as THREE from 'three';
import { makeRenderer, loadEnvelope, toScreen, clamp, lerp, inv, easeOut, easeIn, easeInOut, keys, wobble, W, H } from '../../shared/core.js';
import { POSES, blinkAt } from '../../shared/affan.js';
import { Overlay, pop, ICONS, drawLogo } from '../../shared/overlay.js';
import { CAPTIONS, KEYWORDS } from './captions.js';
import { buildRainRoad, buildSoilLab, buildOutro, carX, CAR_SPEED, SOIL_TOP, SOIL_FRONT } from './worlds.js';

const FPS = 30;
const DURATION = 65.8;
const OUTRO = 62.6;

const stage = document.getElementById('stage');
const canvas = document.createElement('canvas');
stage.appendChild(canvas);
const renderer = makeRenderer(canvas);
const ov = new Overlay(stage);
const road = buildRainRoad();
const lab = buildSoilLab();
const outro = buildOutro();
const cam = new THREE.PerspectiveCamera(50, W / H, 0.02, 6000);
let env = { at: () => 0 };
let clearR = 3;

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const talk = (t) => clamp(env.at(t) * 1.2);
const scr = (p) => toScreen(p, cam);
const mix3 = (a, b, k) => a.map((v, i) => lerp(v, b[i], k));
const GREEN = '#43b85c', BROWN = '#b0703c', BLUE = '#2f9bff', PURPLE = '#8a6cf0', PINK = '#ff7a8a';

function lookCam(pos, look, fov = 50) {
  cam.position.copy(pos);
  cam.fov = fov;
  cam.updateProjectionMatrix();
  cam.lookAt(look);
  cam.updateMatrixWorld(true);
}
function pinTag(id, text, p, t, a, b, style, dy = -90) {
  const q = pop(t, a, b);
  if (q.o <= 0 || !p.visible) return;
  ov.tag(id, text, { x: clamp(p.x, 190, 890), y: clamp(p.y + dy, 300, 1380), o: q.o, s: q.s }, style);
}

// --------------------------------------------------------------- road helpers
function roadCar(t) {
  const c = road.car;
  c.position.set(carX(t), 0.012 * Math.sin(t * 23) + 0.006 * Math.sin(t * 37), 1.6);
  c.userData.update(CAR_SPEED * t);
  c.updateMatrixWorld(true);
  let best = null, bd = 1e9;
  for (const h of road.lampHeads) {
    const d = Math.abs(h.x - c.position.x);
    if (h.z > 0 && d < bd) (bd = d), (best = h);
  }
  road.lampLight.position.copy(best);
  road.lampLight.intensity = 90 * Math.exp(-((bd / 5) ** 2));
  road.moonLight.target.position.copy(c.position);
  road.moonLight.position.copy(c.position).add(V(0.3, 0.75, 0.6).multiplyScalar(80));
}
const carLocal = (x, y, z) => road.car.localToWorld(V(x, y, z));
function interior(on) {
  road.car.userData.body.visible = !on;
  road.car.userData.interior.visible = on;
  road.fill.intensity = on ? 2.4 : 0;
  road.fill.position.set(-0.1, 1.85, -0.1);
}
const AFF_HEAD_LOCAL = [-0.92, 1.49, -0.45];
const seatedRest = { armL: { reach: [0.55, 0.32, 0.25] }, armR: { reach: [-0.55, 0.32, 0.25] } };
function carAffan(t, p = {}) {
  road.aff.pose({ ...POSES.seated, ...seatedRest, yaw: Math.PI / 2, blink: blinkAt(t, 1), talk: talk(t), ...p, armL: { ...seatedRest.armL, ...(p.armL || {}) }, armR: { ...seatedRest.armR, ...(p.armR || {}) } });
}
// Sniff: head tilts up, eyes close, a happy smile.
const sniffPose = (k) => ({ headPitch: -0.28 * k, blink: Math.max(0, k * 0.95), smile: 0.6 + 0.4 * k });

// ---------------------------------------------------------------- lab helpers
const AFF_LAB = V(-5.4, 0, 1.0);
const NOSE = V(-4.62, 2.78, 1.0);
const DROP_AT = V(0, SOIL_TOP, 0.7);
const DROP_FALL = [26.4, 28.1]; // falls between these times (slow motion)
const POPS = [36.2, 36.55, 37.0, 37.38, 37.74, 38.0, 38.25, 38.55, 38.8];
function labAffan(t, p = {}) {
  lab.aff.root.position.copy(AFF_LAB);
  lab.aff.pose({ yaw: Math.PI / 2, blink: blinkAt(t, 2), talk: talk(t), smile: 0.9, ...p });
}
function bacteriaAt(t, active = 1) {
  lab.bacteria.forEach((b, i) => {
    const ph = b.userData.ph;
    b.position.copy(b.userData.home);
    b.position.x += 0.06 * Math.sin(t * 2.2 + ph) * active;
    b.position.y += 0.04 * Math.sin(t * 3.1 + ph * 1.3) * active;
    b.rotation.z = 0.25 * Math.sin(t * 2.6 + ph) * active;
    const sq = 1 + 0.08 * Math.sin(t * 6 + ph) * active;
    b.scale.set(1.6 * sq, 1.6 / sq, 1.6);
  });
}
// the drop: falls, squashes on landing, stays as a dome
function dropAt(t) {
  const [a, b] = DROP_FALL;
  const d = lab.drop;
  d.visible = t >= a - 0.01;
  if (!d.visible) return;
  if (t < b) {
    const k = easeIn(inv(a, b, t));
    d.position.set(DROP_AT.x, lerp(SOIL_TOP + 7.5, SOIL_TOP + 0.62, k), DROP_AT.z);
    d.scale.set(0.95, 1.08, 0.95);
    d.rotation.set(0, 0, 0);
  } else {
    const k = clamp((t - b) / 0.35);
    const wob = Math.sin((t - b) * 18) * Math.exp(-(t - b) * 4) * 0.12;
    const sy = lerp(1.0, 0.55, easeOut(k)) + wob;
    const sx = lerp(1.0, 1.45, easeOut(k)) - wob * 0.6;
    d.scale.set(sx, sy, sx);
    d.position.set(DROP_AT.x, SOIL_TOP + 0.6 * sy * 0.92, DROP_AT.z);
  }
  // splash crown on landing
  const sk = (t - b) / 0.6;
  lab.splash.visible = sk > 0 && sk < 1;
  if (lab.splash.visible) {
    lab.splash.children.forEach((s) => {
      const dd = s.userData.dir;
      s.position.set(DROP_AT.x + dd.x * 1.3 * sk, SOIL_TOP + dd.y * 1.1 * sk - 2.4 * sk * sk, DROP_AT.z + dd.z * 1.3 * sk);
      s.scale.setScalar(1 - sk * 0.6);
    });
  }
}
const domeTop = () => lab.drop.position.y + 0.6 * lab.drop.scale.y * 0.95;
// bubbles: trapped at the bottom from 29.6, rise from ~33, pop at POPS[i]
function bubblesAt(t) {
  const out = [];
  lab.bubbles.forEach((bb, i) => {
    const tp = POPS[i];
    const start = 29.6 + i * 0.12;
    const rise0 = 32.9 + i * 0.25;
    const vis = t >= start && t < tp;
    bb.b.visible = vis;
    const y0 = SOIL_TOP + 0.08, y1 = domeTop() - 0.05;
    const k = easeInOut(inv(rise0, tp, t));
    const p = V(DROP_AT.x + bb.x * (1 - 0.4 * k), lerp(y0, y1, k), DROP_AT.z + bb.z * 0.8);
    if (vis) {
      bb.b.position.copy(p);
      const grow = clamp((t - start) / 0.4);
      bb.b.scale.setScalar(grow * (0.7 + 0.4 * k));
    }
    // burst ring
    const rk = (t - tp) / 0.35;
    bb.ring.visible = rk >= 0 && rk < 1;
    if (bb.ring.visible) {
      bb.ring.position.set(p.x, y1 + 0.05, p.z);
      bb.ring.rotation.x = -Math.PI / 2;
      const s = 0.15 + rk * 0.5;
      bb.ring.scale.set(s, s, s);
      bb.ring.material.opacity = 1 - rk;
    }
    out.push({ p: V(p.x, y1 + 0.1, p.z), tp });
  });
  return out;
}
function hideLabBits() {
  lab.drop.visible = false;
  lab.splash.visible = false;
  lab.bubbles.forEach((bb) => (bb.b.visible = bb.ring.visible = false));
  lab.setAero(0, 0, 0);
  lab.ribbons.forEach((r) => r.userData.set(V(), V(), 0, 0));
  lab.wind.visible = false;
}
// little 2D twinkles around a screen point (the nose)
function noseTwinkle(t, p, a, n = 7) {
  if (a <= 0 || !p.visible) return;
  ov.sparkles(t, { n, seed: 77, x: p.x - 110, y: p.y - 110, w: 220, h: 200, size: 22, a });
}

// ======================================================================= SHOTS
const SHOTS = [
  // S1 — hook: Affan sniffs the air in the car: "Bau apa ni? Bau hujan!"
  [0, 6.6, (t) => {
    roadCar(t);
    interior(true);
    const turned = t >= 2.25 && t < 3.1;
    const sn = keys(t, [[3.1, 0], [3.6, 1], [4.0, 1], [4.3, 0.3], [5.3, 0.3], [5.6, 1], [6.5, 1]]);
    carAffan(t, {
      headYaw: turned ? -0.6 : keys(t, [[0, 0.42], [1.9, 0.5], [3.1, 0.1]]), lookX: turned ? -0.3 : 0.4, lookY: 0.2,
      brow: 0.5, ...sniffPose(sn), blink: sn > 0.05 ? sn * 0.95 : blinkAt(t, 1),
      armL: { reach: [0.45, 0.55 + 0.1 * Math.sin(t * 4), 0.6] },
    });
    const cp = keys(t, [[0, [-0.1, 1.56, 0.74]], [6.6, [-0.25, 1.54, 0.62]]], (x) => x);
    lookCam(carLocal(...cp), carLocal(-0.92, 1.55, -0.45), 48);
    const nose = scr(carLocal(-0.92 + 0.0, 1.43, -0.45 + 0.24));
    noseTwinkle(t, nose, inv(3.4, 3.8, t) * (1 - inv(6.2, 6.5, t)));
    const p = pop(t, 0.6, 6.5, { fin: 0.45 });
    ov.bubble('hook', 'BAU HUJAN?', { x: W / 2, y: 420 + Math.sin(t * 3) * 6, o: p.o, s: p.s }, { size: 120, top: '#d9ffc8', bot: '#43b85c' });
    const q = pop(t, 0.9, 6.5);
    ov.tag('ep', 'EPISOD 30', { x: W / 2, y: 268, o: q.o, s: q.s }, { bg: '#2f7bff', small: true });
    return road;
  }],
  // S2 — outside in the rain: "Tapi, air mana ada bau?"
  [6.6, 14.1, (t) => {
    roadCar(t);
    interior(false);
    carAffan(t, { headYaw: 1.2, headPitch: -0.3, lookY: 0.4 });
    const cx = carX(t);
    const k = easeInOut(inv(6.6, 14.1, t));
    lookCam(V(cx + lerp(1.4, 0.6, k), lerp(1.4, 1.2, k), -9.5), V(cx - 0.3, 2.4, 0), 50);
    clearR = 7;
    const w = pop(t, 12.7, 14.05, { from: 2 });
    ov.bubble('air', 'AIR ADA BAU?', { x: W / 2, y: 430, o: w.o, s: w.s, r: -3 }, { size: 116, top: '#cfeaff', bot: '#3fa2ff' });
    const q = pop(t, 13.38, 14.05, { from: 2 });
    ov.html('qq', ICONS.qmark('#ffcf33'), { x: 900, y: 330, o: q.o, s: q.s * 0.8, r: 12 });
    const h = pop(t, 8.82, 12.6);
    ov.tag('hujan', 'LEPAS HUJAN...', { x: W / 2, y: 330, o: h.o, s: h.s }, { bg: BLUE, small: true });
    return road;
  }],
  // S2c — "Jom ikut Affan cari jawapan!" + magic sparkle swirl
  [14.1, 16.2, (t) => {
    roadCar(t);
    interior(true);
    const up = keys(t, [[14.2, 0], [14.45, 1], [15.7, 1], [16.0, 0.6]], easeOut);
    carAffan(t, {
      headYaw: -0.12, smile: 1, brow: 0.6, lookX: 0.05,
      armR: { reach: [lerp(-0.55, -0.6, up), lerp(0.32, 1.95 + 0.06 * Math.sin(t * 14), up), lerp(0.25, 0.35, up)], pole: [-1, -0.3, -0.5] },
    });
    const k = easeInOut(inv(14.1, 16.2, t));
    lookCam(carLocal(lerp(0.3, 0.05, k), 1.56, lerp(-0.25, -0.38, k)), carLocal(...AFF_HEAD_LOCAL), 48);
    ov.swirl(t, W / 2, 820, inv(14.7, 16.1, t));
    ov.flash(inv(15.8, 16.2, t) ** 2);
    return road;
  }],
  // S3 — the soil lab: inside the soil live tiny bacteria
  [16.2, 21.6, (t) => {
    hideLabBits();
    bacteriaAt(t);
    const pt = keys(t, [[16.6, 0], [17.0, 1], [18.8, 1], [19.2, 0]]);
    labAffan(t, { smile: 1, brow: 0.6, armR: { reach: mix3([-0.55, 0.25, 0.1], [-0.6, 0.9, 0.95], pt), point: pt, pole: [-1, -0.5, -0.5] } });
    const k = easeInOut(inv(17.4, 20.3, t));
    lookCam(V(lerp(-3.0, -0.6, k), lerp(5.6, 1.75, k), lerp(14, 5.6, k)), V(lerp(-2.9, -0.6, k), lerp(2.0, 1.45, k), lerp(0, SOIL_FRONT, k)), 50);
    ov.flash(1 - inv(16.2, 16.6, t));
    ov.sparkles(t, { n: 22, seed: 3, y: 250, h: 1000, a: 0.8 * (1 - inv(17, 18, t)) });
    pinTag('tanah', 'TANAH', scr(V(0, SOIL_TOP, SOIL_FRONT)), t, 16.72, 18.8, { bg: BROWN, pointer: 'down' }, -70);
    const kc = pop(t, 18.82, 20.3, { from: 2 });
    ov.bubble('kecil', 'SANGAT KECIL!', { x: W / 2, y: 430, o: kc.o, s: kc.s }, { size: 112 });
    pinTag('bakteria', 'BAKTERIA', scr(lab.bacteria[2].getWorldPosition(V())), t, 20.38, 21.55, { bg: GREEN, pointer: 'down' }, -80);
    return lab;
  }],
  // S4 — bacteria make a smelly substance called geosmin
  [21.6, 26.2, (t) => {
    hideLabBits();
    bacteriaAt(t, 1.4);
    labAffan(t, {});
    lookCam(V(-0.4, lerp(1.75, 2.4, easeInOut(inv(21.6, 26.2, t))), lerp(5.6, 6.6, easeInOut(inv(21.6, 26.2, t)))), V(-0.5, lerp(1.45, 2.3, easeInOut(inv(21.6, 26.2, t))), SOIL_FRONT), 50);
    [1, 3, 5, 8, 10].forEach((bi, i) => {
      const r = lab.ribbons[i];
      const b = lab.bacteria[bi].getWorldPosition(V());
      const t0 = 22.7 + i * 0.25;
      r.userData.set(b.clone().add(V(0, 0.15, 0.05)), b.clone().add(V(0.2 * (i - 2), 2.6, 0.2)), t, easeOut(inv(t0, t0 + 1.2, t)), 1, 0.12, 0.035);
    });
    const bb = pop(t, 23.38, 24.85);
    ov.tag('berbau', 'BAHAN BERBAU', { x: W / 2, y: 330, o: bb.o, s: bb.s }, { bg: GREEN, small: true });
    const g = pop(t, 24.88, 26.15, { from: 2 });
    ov.bubble('geosmin', 'GEOSMIN', { x: W / 2, y: 440, o: g.o, s: g.s, r: -3 }, { size: 150, top: '#d9ffc8', bot: '#43b85c' });
    return lab;
  }],
  // S5 — a raindrop lands on the soil and traps air
  [26.2, 31.7, (t) => {
    hideLabBits();
    bacteriaAt(t);
    labAffan(t, { headPitch: -0.1, lookY: 0.3, wow: keys(t, [[28.1, 0], [28.25, 0.7], [28.9, 0.7], [29.2, 0]]) });
    dropAt(t);
    bubblesAt(t);
    const k = easeInOut(inv(29.0, 31.7, t));
    lookCam(V(lerp(2.0, 1.6, k), lerp(4.4, 3.7, k), lerp(8.6, 6.4, k)), V(0, lerp(3.8, 2.9, k), 0.7), 50);
    pinTag('titis', 'TITISAN HUJAN', scr(lab.drop.position), t, 26.64, 28.5, { bg: BLUE, pointer: 'down' }, -110);
    const sp = pop(t, 28.12, 29.4, { from: 2 });
    ov.bubble('splash', 'PLAP!', { x: W / 2 + 160, y: 430, o: sp.o, s: sp.s, r: 6 }, { size: 140, top: '#cfeaff', bot: '#3fa2ff' });
    const air = scr(V(DROP_AT.x, SOIL_TOP + 0.12, DROP_AT.z));
    pinTag('udara', 'UDARA', air, t, 30.3, 31.65, { bg: '#5fb8ff', pointer: 'down', small: true }, -70);
    const pr = pop(t, 29.58, 31.65);
    ov.tag('perangkap', 'TERPERANGKAP!', { x: W / 2, y: 330, o: pr.o, s: pr.s }, { bg: PURPLE, small: true });
    return lab;
  }],
  // S6 — bubbles rise and pop: pop, pop, pop!
  [31.7, 38.3, (t) => {
    hideLabBits();
    bacteriaAt(t);
    labAffan(t, {});
    dropAt(t);
    const bs = bubblesAt(t);
    const k = easeInOut(inv(31.7, 38.3, t));
    lookCam(V(lerp(1.6, 1.2, k), lerp(3.7, 3.6, k), lerp(6.4, 5.4, k)), V(0, lerp(2.9, 3.1, k), 0.7), 50);
    const g = bs[1];
    pinTag('gelembung', 'GELEMBUNG UDARA', scr(lab.bubbles[1].b.position), t, 32.96, 35.9, { bg: '#5fb8ff', pointer: 'down' }, -90);
    const naik = pop(t, 34.24, 35.9);
    if (naik.o > 0) ov.html('up', `<div style="transform:rotate(-90deg)">${ICONS.arrow('#5fb8ff')}</div>`, { x: 880, y: 760 - 40 * Math.sin(t * 4), o: naik.o, s: 0.6 * naik.s });
    bs.forEach((b, i) => {
      const q = pop(t, b.tp, b.tp + 0.55, { fin: 0.12, from: 2 });
      if (q.o <= 0) return;
      const sp = scr(b.p);
      ov.bubble('pop' + i, 'POP!', { x: clamp(sp.x + (i % 2 ? 120 : -120), 180, 900), y: clamp(sp.y - 140 - (i % 3) * 50, 320, 1300), o: q.o, s: q.s * 0.75, r: (i % 2 ? 8 : -8) }, { size: 130, top: '#fff3a0', bot: '#ffb21f' });
    });
    lab.setAero(t, inv(36.2, 37.0, t), 0.25 * inv(36.2, 38.3, t), 0, V(DROP_AT.x, domeTop(), DROP_AT.z));
    void g;
    return lab;
  }],
  // S7 — the pops throw the soil smell into the air; the wind carries it to Affan's nose
  [38.3, 46.0, (t) => {
    hideLabBits();
    bacteriaAt(t);
    dropAt(t);
    const sn = keys(t, [[44.0, 0], [44.5, 1], [46.0, 1]]);
    labAffan(t, { headYaw: 0.15, ...sniffPose(sn), blink: sn > 0.05 ? sn : blinkAt(t, 2) });
    const spread = 0.25 + 0.75 * easeOut(inv(38.3, 42.0, t));
    const wind = easeInOut(inv(42.4, 45.2, t));
    lab.setAero(t, 1, spread, wind, V(DROP_AT.x, domeTop(), DROP_AT.z));
    const k = easeInOut(inv(38.3, 42.6, t));
    lookCam(V(lerp(1.2, -3.3, k), lerp(3.6, 4.4, k), lerp(5.4, 12.5, k)), V(lerp(0, -2.9, k), lerp(3.2, 3.0, k), 0.6), 50);
    // wind arcs
    lab.wind.visible = wind > 0.01 && t < 45.6;
    lab.wind.position.set(lerp(-0.5, -3.2, wind), 4.2, 0.8);
    lab.windMat.opacity = 0.8 * Math.sin(Math.PI * clamp(wind * 1.1));
    // smell ribbons to the nose
    [0, 1, 2].forEach((i) => {
      const from = V(DROP_AT.x - 0.4 + i * 0.3, domeTop() + 1.2 + i * 0.3, DROP_AT.z);
      lab.ribbons[i].userData.set(from, NOSE.clone().add(V(0.15, 0.05 * i, 0)), t, easeOut(inv(43.0 + i * 0.2, 44.6 + i * 0.2, t)), 1 - inv(45.6, 46.0, t), 0.25, 0.05);
    });
    const lt = pop(t, 40.14, 42.3);
    ov.tag('bautanah', 'BAU TANAH', { x: W / 2, y: 330, o: lt.o, s: lt.s }, { bg: GREEN });
    const an = pop(t, 42.38, 44.0, { from: 2 });
    ov.bubble('angin', 'ANGIN!', { x: W / 2 - 100, y: 440, o: an.o, s: an.s, r: -4 }, { size: 140, top: '#ffffff', bot: '#9fd8ff' });
    pinTag('hidung', 'HIDUNG', scr(NOSE), t, 44.76, 45.95, { bg: PINK, pointer: 'down' }, -100);
    noseTwinkle(t, scr(NOSE), inv(44.5, 44.9, t));
    return lab;
  }],
  // S8 — our nose is very good at smelling it: even a tiny bit!
  [46.0, 52.0, (t) => {
    hideLabBits();
    bacteriaAt(t);
    lab.setAero(t, 0.7, 1, 1, V(DROP_AT.x, SOIL_TOP + 1.2, DROP_AT.z));
    const sn = keys(t, [[46.0, 1], [47.4, 1], [47.8, 0], [49.3, 0], [49.6, 1], [50.8, 1], [51.1, 0]]);
    const pt = keys(t, [[46.3, 0], [46.6, 1], [48.9, 1], [49.2, 0]]);
    labAffan(t, {
      yaw: Math.PI / 2 - 0.6, ...sniffPose(sn), blink: sn > 0.05 ? sn : blinkAt(t, 3), brow: 0.6,
      armR: { reach: mix3([-0.55, 0.25, 0.1], [-0.2, 1.75, 0.75], pt), point: pt, pole: [-1, -0.6, 0], wx: -0.3 * pt },
    });
    const k = easeOut(inv(46.0, 52.0, t));
    lookCam(V(AFF_LAB.x + lerp(1.8, 1.5, k), 3.1, lerp(5.6, 5.0, k)), V(AFF_LAB.x, 2.75, 1.0), 50);
    noseTwinkle(t, scr(NOSE), 0.9, 10);
    const pd = pop(t, 47.5, 49.2, { from: 2 });
    ov.bubble('pandai', 'PANDAI HIDU!', { x: W / 2, y: 430, o: pd.o, s: pd.s, r: -2 }, { size: 116, top: '#ffd6cc', bot: '#ff7a8a' });
    const sk = pop(t, 49.28, 51.95, { from: 2 });
    ov.bubble('sikit', 'SIKIT JE PUN!', { x: W / 2, y: 430, o: sk.o, s: sk.s, r: 2 }, { size: 116 });
    return lab;
  }],
  // S9 — the "aha" moment: the smell of rain comes from the soil
  [52.0, 56.5, (t) => {
    hideLabBits();
    bacteriaAt(t);
    const jump = t > 52.1 && t < 52.75 ? Math.sin(((t - 52.1) / 0.65) * Math.PI) * 0.45 : 0;
    const up = keys(t, [[52.0, 0], [52.2, 1], [52.8, 1], [53.1, 0]]);
    const idx = keys(t, [[53.05, 0], [53.35, 1], [56.5, 1]]);
    labAffan(t, {
      yaw: Math.PI / 2 - 0.5, bob: jump, smile: 1,
      blink: t > 52.0 && t < 53.0 ? 0 : blinkAt(t, 6),
      wow: keys(t, [[52.0, 0], [52.15, 1], [52.85, 1], [53.1, 0]]), brow: keys(t, [[52.0, 0], [52.15, 1], [54, 0.5]]),
      legL: { x: -0.25 * jump, knee: 0.6 * jump }, legR: { x: -0.25 * jump, knee: 0.6 * jump },
      armL: { reach: [lerp(0.55, 0.85, up), lerp(0.25, 1.85, up), lerp(0.1, 0.3, up)], pole: [1, -0.4, -0.5] },
      armR: idx > 0.01 ? { reach: mix3([-0.55, 0.25, 0.1], [-0.5, 0.6, 0.95], idx), point: idx, pole: [-1, -0.6, -0.3] } : { reach: [lerp(-0.55, -0.85, up), lerp(0.25, 1.85, up), lerp(0.1, 0.3, up)], pole: [-1, -0.4, -0.5] },
    });
    const k = easeOut(inv(52.0, 56.5, t));
    lookCam(V(AFF_LAB.x + lerp(2.4, 2.1, k), 3.3, lerp(6.6, 7.2, k)), V(AFF_LAB.x + 0.5, 2.6, 1.0), 50);
    const head = scr(V(AFF_LAB.x, 4.3 + jump, AFF_LAB.z));
    const b = pop(t, 52.2, 56.45);
    ov.html('bulb', ICONS.bulb(), { x: clamp(head.x + 240, 150, 900), y: clamp(head.y - 60, 300, 900) + Math.sin(t * 5) * 8, o: b.o, s: b.s * 0.75, r: 10 });
    const j = pop(t, 54.92, 56.45, { fin: 0.4, from: 2.2 });
    ov.bubble('aha', 'DARI TANAH!', { x: W / 2, y: 420, o: j.o, s: j.s, r: -2 }, { size: 128, top: '#ffe0b8', bot: '#c07a3c' });
    ov.sparkles(t, { n: 30, seed: 12, y: 250, h: 900, a: inv(52.1, 52.5, t) });
    return lab;
  }],
  // S10 — back in the car: "cuba hidu dalam-dalam!", then "what next?"
  [56.5, OUTRO, (t) => {
    roadCar(t);
    interior(true);
    const th = keys(t, [[57.2, 0], [57.55, 1], [58.5, 1], [58.8, 0]]);
    const sn = keys(t, [[58.9, 0], [59.3, 1], [60.1, 1], [60.4, 0]]);
    const tk = keys(t, [[60.4, 0], [60.8, 1], [OUTRO, 1]]);
    const up = POSES.thumbsUpR.armR, th2 = POSES.thinkR.armR;
    const rest = seatedRest.armR.reach;
    let armR = {};
    if (th > 0) armR = { reach: mix3(rest, up.reach, th), pole: up.pole, thumb: th, wy: up.wy * th, wx: up.wx * th };
    else if (tk > 0) armR = { reach: mix3(rest, th2.reach, tk), pole: th2.pole, point: tk, wx: th2.wx * tk };
    carAffan(t, {
      headYaw: -0.12 + 0.05 * wobble(t, 2), smile: 1, brow: 0.3 + 0.4 * tk,
      headRoll: -0.12 * tk, lookX: 0.35 * tk, lookY: 0.4 * tk, headPitch: -0.08 * tk,
      ...(sn > 0.02 ? sniffPose(sn) : {}),
      armR,
    });
    const k = easeInOut(inv(56.5, OUTRO, t));
    lookCam(carLocal(lerp(0.42, 0.24, k), 1.55, lerp(-0.22, -0.36, k)), carLocal(-0.92, 1.42, -0.45), 50);
    ov.flash((1 - inv(56.5, 56.8, t)) * 0.9, '20,40,120');
    const nose = scr(carLocal(-0.92 + 0.24, 1.43, -0.45));
    noseTwinkle(t, nose, inv(59.2, 59.5, t) * (1 - inv(60.2, 60.5, t)));
    const ch = pop(t, 58.74, 60.35, { from: 2 });
    ov.bubble('cuba', 'CUBA HIDU!', { x: W / 2, y: 430, o: ch.o, s: ch.s, r: -2 }, { size: 120, top: '#d9ffc8', bot: '#43b85c' });
    if (th > 0.5) {
      const hand = scr(road.aff.parts.arms.R.hand.getWorldPosition(V()));
      ov.sparkles(t, { n: 12, seed: 33, x: hand.x - 160, y: hand.y - 200, w: 320, h: 300, a: inv(57.5, 57.8, t) * (1 - inv(58.4, 58.7, t)), size: 30 });
    }
    const head = scr(carLocal(...AFF_HEAD_LOCAL));
    [[60.5, -260, -230, '#ffcf33', -12], [60.8, 250, -280, '#3fa2ff', 10], [61.1, 300, -60, '#ffcf33', 14]].forEach(([a, dx, dy, c, r], i) => {
      const q = pop(t, a, OUTRO - 0.05);
      ov.html('q' + i, ICONS.qmark(c), { x: head.x + dx, y: head.y + dy + Math.sin(t * 3 + i) * 10, o: q.o, s: q.s * 0.85, r });
    });
    return road;
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
  road.stars.userData.update(t);
  lab.stars.userData.update(t);
  clearR = 3;
  const world = shot[2](t);
  if (world === road) {
    road.clearAround(cam.position, clearR);
    road.rainAt(t, cam.position, road.car.position);
  }
  if (world.sky) {
    world.sky.position.copy(cam.position);
    world.stars.position.copy(cam.position);
  }
  renderer.render(world.scene, cam);
  if (world !== outro) ov.vignette(0.3);
  ov.captions(t, CAPTIONS, KEYWORDS);
  ov.end();
}

// Cover / thumbnail (9:16): Affan sniffing happily in the rain-soaked car,
// with a big title, episode badge and the series logo. Key elements stay
// inside the centre 3:4 area (y 240-1680) that profile grids show.
const THUMB = { cam: [-0.2, 1.52, 0.7], look: [-0.92, 1.58, -0.45], fov: 48, nose: [870, 1072] };
window.setThumb = (o) => Object.assign(THUMB, o);
function thumbnail() {
  ov.begin();
  cam.aspect = W / H;
  cam.updateProjectionMatrix();
  const t = 3.6;
  road.stars.userData.update(t);
  roadCar(t);
  interior(true);
  carAffan(t, { headYaw: -0.35, ...sniffPose(1), talk: 0, brow: 0.6, armL: { reach: [0.45, 0.6, 0.6] } });
  lookCam(carLocal(...THUMB.cam), carLocal(...THUMB.look), THUMB.fov);
  const key = new THREE.PointLight(0xffe2c4, 1.6, 3, 2);
  key.position.copy(carLocal(-0.4, 1.75, 0.25));
  road.scene.add(key);
  road.clearAround(cam.position);
  road.rainAt(t, cam.position, road.car.position);
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
  // smell swirls drifting towards the nose
  g.save();
  g.lineCap = 'round';
  g.shadowColor = '#d9ffc8';
  g.shadowBlur = 18;
  [[1062, 700, 0], [1068, 840, 1], [1060, 975, 2]].forEach(([x0, y0, i]) => {
    g.strokeStyle = ['#b8f59a', '#9be07a', '#d9ffc8'][i];
    g.lineWidth = 12;
    g.beginPath();
    for (let s = 0; s <= 30; s++) {
      const k = s / 30;
      g.lineTo(lerp(x0, THUMB.nose[0], k), lerp(y0, THUMB.nose[1], k) + Math.sin(k * 9 + i) * 34 * (1 - k * 0.7));
    }
    g.stroke();
  });
  g.restore();
  ov.tag('thBadge', 'EPISOD 30', { x: W / 2, y: 300 }, { bg: '#2f7bff', small: true });
  ov.bubble('thTitle', 'BAU HUJAN?', { x: W / 2, y: 470, r: -2 }, { size: 136, top: '#d9ffc8', bot: '#43b85c' });
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
