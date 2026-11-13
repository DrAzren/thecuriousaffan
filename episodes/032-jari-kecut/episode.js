// THE CURIOUS AFFAN — Episode 032: "Kenapa Jari Jadi Kecut Bila Lama Main Air?"
// Every shot is a pure function of time t (seconds), synced to audio/narration.mp3.
import * as THREE from 'three';
import { makeRenderer, loadEnvelope, toScreen, clamp, lerp, inv, easeOut, easeIn, easeInOut, keys, wobble, W, H } from '../../shared/core.js';
import { POSES, blinkAt } from '../../shared/affan.js';
import { Overlay, pop, ICONS, drawLogo } from '../../shared/overlay.js';
import { CAPTIONS, KEYWORDS } from './captions.js';
import { buildBackyard, buildSkinLab, buildOutro, POOL, SLAB, SLAB_TOP, SLAB_FRONT, ROAD_X } from './worlds.js';

const FPS = 30;
const DURATION = 70.6;
const OUTRO = 67.45;

const stage = document.getElementById('stage');
const canvas = document.createElement('canvas');
stage.appendChild(canvas);
const renderer = makeRenderer(canvas);
const ov = new Overlay(stage);
const yard = buildBackyard();
const lab = buildSkinLab();
const outro = buildOutro();
const cam = new THREE.PerspectiveCamera(50, W / H, 0.05, 4000);
let env = { at: () => 0 };

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const talk = (t) => clamp(env.at(t) * 1.2);
const scr = (p) => toScreen(p, cam);
const mix3 = (a, b, k) => a.map((v, i) => lerp(v, b[i], k));
const BLUE = '#2f9bff', RED = '#ff4d5e', YELLOW = '#e0b400', PURPLE = '#9a5cf0', ORANGE = '#ff8a3d', GREEN = '#2fbf5f', PINK = '#ff5c9a';

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
  ov.tag(id, text, { x: clamp(p.x, 190, 890), y: clamp(p.y + dy, 300, 1380), o: q.o, s: q.s }, style);
}
const CHECK = `<svg width="200" height="200" viewBox="0 0 200 200"><circle cx="100" cy="100" r="88" fill="#2fbf5f" stroke="#fff" stroke-width="14"/><path d="M55 104 L88 136 L148 70" fill="none" stroke="#fff" stroke-width="24" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

// ------------------------------------------------------------------- backyard
const A_POOL = V(0.4, 0, 0.7);
const A_GRASS = V(4.3, 0, 2.3);
function yardAffan(t, pos, p = {}) {
  yard.aff.root.position.copy(pos);
  yard.aff.pose({ yaw: -0.15, blink: blinkAt(t, 1), talk: talk(t), smile: 0.9, ...p });
}
function yardReset(t) {
  yard.water.userData.update(t, A_POOL.x, A_POOL.z, 1);
  yard.duck.position.y = POOL.water + 0.03 * Math.sin(t * 2.2);
  yard.duck.rotation.z = 0.08 * Math.sin(t * 1.7);
  yard.drops.forEach((d) => (d.visible = false));
  yard.bigHand.visible = yard.raisin.visible = yard.marble.visible = yard.ring.visible = false;
  yard.aff.root.visible = true;
}
// splashes thrown up from the water around (cx, cz) at the given times
function splashes(t, times, cx, cz) {
  let n = 0;
  times.forEach((t0, j) => {
    const u = t - t0;
    if (u < 0 || u > 0.9) return;
    for (let i = 0; i < 8 && n < yard.drops.length; i++, n++) {
      const a = (i / 8) * Math.PI * 2 + j;
      const sp = 1.1 + 0.4 * ((i * 7 + j) % 3);
      const d = yard.drops[n];
      d.visible = true;
      d.position.set(cx + Math.cos(a) * sp * u * 0.9, POOL.water + 3.6 * u - 4.9 * u * u, cz + Math.sin(a) * sp * u * 0.6);
      d.scale.setScalar(1.3 - u);
      if (d.position.y < POOL.water - 0.05) d.visible = false;
    }
  });
}
// The giant hand insert, placed in front of the pool. k = wrinkles 0..1.
const HAND_AT = V(0.0, 1.35, 4.4);
function showHand(k, { pos = HAND_AT, rotY = 0, rotZ = 0, rotX = 0, pinch = 0, bob = 0, t = 0 } = {}) {
  const h = yard.bigHand;
  h.visible = true;
  h.position.copy(pos).add(V(0, bob * Math.sin(t * 1.6), 0));
  h.rotation.set(rotX, rotY, rotZ);
  h.userData.pinch(pinch, 1);
  h.userData.setWrinkle(k);
  h.updateMatrixWorld(true);
}
function fingerTip(i) {
  const f = yard.bigHand.userData.fingers[i];
  return f.localToWorld(V(0, i === 4 ? 0.62 : [0.78, 0.92, 0.86, 0.66][i] + 0.16, 0.12));
}

// ------------------------------------------------------------------ skin lab
const A_LAB = V(-3.9, 0, 2.9);
function labAffan(t, p = {}) {
  lab.aff.root.position.copy(A_LAB);
  lab.aff.pose({ yaw: Math.PI / 2 - 0.35, blink: blinkAt(t, 2), talk: talk(t), smile: 0.9, ...p });
}
// nerve: 0 calm, glow 0..1, broken 0..1; vessels: squeeze 0..1; skin: wrinkle k, dermis drop
function labState(t, { glowK = 0, broken = 0, squeeze = 0, k = 0, drop = 0, water = 0 } = {}) {
  lab.setSkin(k, drop);
  lab.vessels.forEach((v) => v.scale.set(1, 1 - 0.6 * squeeze, 1 - 0.6 * squeeze));
  lab.vesselMat.color.setHex(0xe8343f).lerp(new THREE.Color(0xb02838), squeeze);
  const c = new THREE.Color(0xffd23a).lerp(new THREE.Color(0x8a8a8a), broken);
  lab.nerveMat.color.copy(c);
  lab.nerveMat.emissive.setHex(broken > 0.5 ? 0x111111 : 0xffb000);
  lab.nerveMat.emissiveIntensity = 0.35 + 1.2 * glowK * (0.8 + 0.2 * Math.sin(t * 8));
  lab.nerveGlow.position.set(0, 1.12 * (1 - drop), SLAB_FRONT + 0.3);
  lab.nerveGlow.scale.set(9, 1.6, 1);
  lab.nerveGlow.material.opacity = 0.5 * glowK;
  lab.waterBox.visible = water > 0.01;
  lab.waterBox.position.y = SLAB_TOP - SLAB.dermis * drop + 0.25 + 0.12 * k;
  lab.waterBox.scale.set(1, Math.max(0.01, water), 1);
  lab.waterMat.opacity = 0.35 * water;
  lab.sparks.forEach((s) => (s.visible = false));
  lab.drips.forEach((d) => (d.visible = false));
  // blood cells flowing in the front vessel; they slow down when squeezed
  const v = lab.vessels[0];
  lab.cells.forEach((cc, i) => {
    const x = ((cc.userData.ph + t * (0.25 - 0.17 * squeeze)) % 1) * SLAB.w - SLAB.w / 2;
    cc.position.set(x, v.position.y * (1 - drop), SLAB_FRONT + 0.2);
    cc.scale.setScalar(1 - 0.35 * squeeze);
    cc.visible = true;
    void i;
  });
  lab.road.visible = true;
}
function sparksAt(t, t0, t1, x0 = -4, x1 = 4, drop = 0) {
  if (t < t0 || t > t1) return;
  lab.sparks.forEach((s, i) => {
    const u = ((t - t0) * 0.7 + i / lab.sparks.length) % 1;
    s.visible = true;
    s.position.set(lerp(x0, x1, u), 1.12 * (1 - drop), SLAB_FRONT + 0.15);
    s.scale.setScalar(0.45 + 0.2 * Math.sin(t * 12 + i));
  });
}
function dripsAt(t, t0) {
  lab.drips.forEach((d, i) => {
    const s = t0 + i * 0.22;
    const u = t - s;
    if (u < 0 || u > 0.8) return;
    d.visible = true;
    d.position.set(-3.6 + ((i * 2.3) % 7.2), lerp(SLAB_TOP + 4.5, SLAB_TOP + 0.2, easeIn(clamp(u / 0.8))), -1 + ((i * 1.3) % 2));
    d.scale.set(0.9, 1.25, 0.9);
  });
}
// tyres: bald one slips, treaded one grips; s: road speed, slip 0..1
function tyresAt(t, slip) {
  const r = lab.road;
  r.children.forEach((c) => {
    if (c.geometry && c.geometry.type === 'BoxGeometry' && c.position.y > 0.1 && c.position.y < 0.12) {
      if (c.userData.x0 === undefined) c.userData.x0 = c.position.x;
      c.position.x = ((c.userData.x0 - t * 4 + 70) % 14) - 7;
    }
  });
  lab.tread.rotation.z = -t * 4 / 1.21;
  lab.bald.rotation.z = -t * (4 + 9 * slip) / 1.21;
  lab.bald.position.z = -1.4 + 0.35 * slip * Math.sin(t * 7);
  lab.bald.rotation.y = 0.25 * slip * Math.sin(t * 6);
  lab.bald.position.x = 0.35 * slip * Math.sin(t * 3.3);
  lab.spray.forEach((d, i) => {
    const u = ((t * 1.6 + i / lab.spray.length) % 1);
    d.visible = slip > 0.2;
    d.position.set(lab.bald.position.x + 1.1 + u * 2.4, 0.2 + 1.6 * u - 2.2 * u * u + 0.3 * ((i % 3) / 3), lab.bald.position.z + ((i % 5) - 2) * 0.12);
    d.scale.setScalar(1.2 - u);
  });
}

// ======================================================================= SHOTS
const SHOTS = [
  // S1 — Affan splashing in the pool, calls Papa, then stops: his fingers!
  [0, 5.45, (t) => {
    yardReset(t);
    const slap = (t0) => keys(t, [[t0 - 0.25, 0], [t0 - 0.05, 1], [t0 + 0.15, 0]]);
    const hit = Math.max(slap(0.5), slap(1.3), slap(3.3), slap(4.1));
    const call = keys(t, [[2.1, 0], [2.3, 1], [2.85, 1], [3.1, 0]]);
    const look = keys(t, [[4.75, 0], [5.1, 1], [5.45, 1]]);
    let p = {
      smile: 1, brow: 0.4,
      armL: { reach: mix3([0.85, 1.35, 0.55], [0.8, 0.35, 0.7], hit), pole: [1, -0.5, -0.4] },
      armR: { reach: mix3([-0.85, 1.35, 0.55], [-0.8, 0.35, 0.7], hit), pole: [-1, -0.5, -0.4] },
    };
    if (call > 0) p = { ...p, headYaw: 0.6 * call, lookX: 0.6 * call, armR: { reach: [-0.75, 1.55, 0.35 + Math.sin(t * 10) * 0.12], pole: [-1, -0.5, -0.4] } };
    if (look > 0) p = { ...p, headPitch: 0.3 * look, lookY: -0.5 * look, wow: look, smile: 0.4, armL: { reach: mix3([0.62, 0.25, 0.2], [0.3, 1.1, 0.75], look), pole: [1, -1, 0] }, armR: { reach: mix3([-0.62, 0.25, 0.2], [-0.3, 1.1, 0.75], look), pole: [-1, -1, 0] } };
    yardAffan(t, A_POOL, p);
    splashes(t, [0.45, 1.25, 3.25, 4.05], A_POOL.x, A_POOL.z + 0.6);
    camMove(t, 0, 5.45, [1.2, 3.4, 9.6], [0.3, 2.0, 0.6], [0.9, 3.1, 7.8], [0.35, 2.3, 0.6]);
    const q = pop(t, 0.9, 5.4);
    ov.tag('ep', 'EPISOD 32', { x: W / 2, y: 268, o: q.o, s: q.s }, { bg: '#2f7bff', small: true });
    const pp = pop(t, 2.32, 2.95, { from: 2 });
    ov.bubble('papa', 'PAPA!', { x: 820, y: 470, o: pp.o, s: pp.s * 0.8, r: 6 }, { size: 110 });
    const sp = pop(t, 0.5, 2.2, { from: 2 });
    ov.bubble('splash', 'SPLASH!', { x: W / 2, y: 430, o: sp.o, s: sp.s, r: -4 }, { size: 120, top: '#cfeaff', bot: '#3fa2ff' });
    const ll = pop(t, 4.44, 5.4);
    ov.tag('lama', 'LAMA-LAMA...', { x: W / 2, y: 340, o: ll.o, s: ll.s }, { bg: BLUE, small: true });
    return yard;
  }],
  // S2 — close-up of the giant hand: wrinkly fingers, "like a raisin!"
  [5.45, 10.05, (t) => {
    yardReset(t);
    yard.aff.root.visible = false;
    const k = keys(t, [[5.45, 0.25], [6.9, 1]]);
    showHand(k, { rotY: -0.25 + 0.05 * Math.sin(t * 0.8), rotZ: 0.05, t, bob: 0.03 });
    const rk = easeOut(inv(7.45, 7.9, t));
    yard.raisin.visible = rk > 0;
    yard.raisin.position.set(1.4, 3.6 + 0.05 * Math.sin(t * 2), 5.0);
    yard.raisin.scale.setScalar(0.36 * rk);
    yard.raisin.rotation.set(0.3, t * 0.5, 0.2);
    camMove(t, 5.45, 10.05, [0.6, 3.5, 11.4], [0.35, 3.0, 4.4], [0.5, 3.5, 10.4], [0.4, 3.05, 4.4], 50, easeOut);
    const tip = scr(fingerTip(1));
    pinTag('jari', 'JARI', tip, t, 5.84, 6.9, { bg: ORANGE, pointer: 'down' }, -70);
    const kc = pop(t, 6.9, 8.4, { from: 2 });
    ov.bubble('kecut', 'KECUT!', { x: W / 2, y: 420, o: kc.o, s: kc.s, r: -4 }, { size: 150, top: '#ecd6ff', bot: '#9a5cf0' });
    pinTag('kismis', 'KISMIS', scr(yard.raisin.position), t, 7.56, 8.5, { bg: '#7a2a4a', pointer: 'down', small: true }, -80);
    const kn = pop(t, 8.58, 10.0, { from: 2 });
    ov.bubble('kenapa', 'KENAPA?', { x: W / 2, y: 420, o: kn.o, s: kn.s, r: 3 }, { size: 140 });
    [[8.9, 160, 640, '#ffcf33', -12], [9.2, 900, 600, '#3fa2ff', 10]].forEach(([a, x, y, c, r], i) => {
      const q = pop(t, a, 10.0);
      ov.html('q' + i, ICONS.qmark(c), { x, y: y + Math.sin(t * 3 + i) * 10, o: q.o, s: q.s * 0.8, r });
    });
    return yard;
  }],
  // S3 — "Jom ikut Affan cari jawapan!" + magic swirl
  [10.05, 11.95, (t) => {
    yardReset(t);
    const up = keys(t, [[10.1, 0], [10.35, 1], [11.5, 1], [11.8, 0.6]], easeOut);
    yardAffan(t, A_POOL, { smile: 1, brow: 0.6, armR: { reach: [-0.62, lerp(0.22, 1.95 + 0.06 * Math.sin(t * 14), up), lerp(0.12, 0.35, up)], pole: [-1, -0.3, -0.5] } });
    camMove(t, 10.05, 11.95, [0.9, 3.4, 4.9], [0.4, 3.0, 0.7], [0.7, 3.3, 4.1], [0.4, 3.05, 0.7]);
    ov.swirl(t, W / 2, 820, inv(10.5, 11.9, t));
    ov.flash(inv(11.6, 11.95, t) ** 2);
    return yard;
  }],
  // S4 — the skin lab: not "skin drinking water" — it's the nerve! A broken nerve: no wrinkles.
  [11.95, 23.6, (t) => {
    const glowK = inv(18.1, 18.5, t) * (1 - inv(19.9, 20.3, t));
    const broken = inv(20.5, 20.9, t) * (1 - inv(23.2, 23.55, t));
    const water = inv(13.9, 14.6, t) * (1 - inv(17.6, 18.0, t)) + inv(21.6, 22.0, t) * (1 - inv(23.2, 23.55, t));
    labState(t, { glowK, broken, water });
    const th = keys(t, [[12.0, 0], [12.4, 1], [15.5, 1], [15.9, 0]]);
    labAffan(t, { smile: 0.9, brow: 0.4 + 0.3 * th, headRoll: -0.1 * th, lookX: 0.3, ...(th > 0 ? { armR: { ...POSES.thinkR.armR, reach: mix3([-0.62, 0.22, 0.12], POSES.thinkR.armR.reach, th) } } : {}) });
    if (t < 17.9) camMove(t, 11.95, 17.9, [-2.4, 4.0, 12.6], [-2.1, 2.1, 0.6], [-2.1, 3.8, 11.4], [-1.9, 2.1, 0.6]);
    else camMove(t, 17.9, 23.6, [0.9, 1.9, 7.0], [0.4, 1.25, SLAB_FRONT], [0.5, 2.2, 6.4], [0.2, 1.45, SLAB_FRONT]);
    ov.flash(1 - inv(11.95, 12.3, t));
    ov.sparkles(t, { n: 22, seed: 3, y: 250, h: 1000, a: 0.8 * (1 - inv(12.5, 13.5, t)) });
    pinTag('kulit', 'KULIT', scr(V(1.5, SLAB_TOP, SLAB_FRONT)), t, 14.56, 15.95, { bg: '#e07a4f', pointer: 'down' }, -60);
    const mn = pop(t, 14.88, 17.9, { from: 2 });
    ov.bubble('minum', 'MINUM AIR?', { x: W / 2, y: 430, o: mn.o, s: mn.s, r: -3 }, { size: 130, top: '#cfeaff', bot: '#3fa2ff' });
    const x = pop(t, 16.3, 17.9, { from: 3, fin: 0.2 });
    ov.html('cross', ICONS.cross(), { x: W / 2, y: 430, o: x.o, s: x.s * 1.1, r: 8 });
    pinTag('saraf', 'SARAF', scr(V(-0.8, 1.12, SLAB_FRONT + 0.1)), t, 18.15, 20.1, { bg: YELLOW, pointer: 'down' }, -70);
    const sb = pop(t, 18.42, 20.05, { from: 2 });
    ov.bubble('sarafb', 'SARAF YANG BUAT!', { x: W / 2, y: 430, o: sb.o, s: sb.s, r: -2 }, { size: 104, top: '#fff3a0', bot: '#ffb21f' });
    pinTag('rosak', 'ROSAK', scr(V(0.2, 1.12, SLAB_FRONT + 0.1)), t, 21.06, 23.3, { bg: '#7f8696', pointer: 'down' }, -70);
    const tk = pop(t, 22.0, 23.5, { from: 2 });
    ov.bubble('takkecut', 'TAK KECUT!', { x: W / 2, y: 430, o: tk.o, s: tk.s, r: 2 }, { size: 130, top: '#e6f0ff', bot: '#7aa8ff' });
    return lab;
  }],
  // S5 — water → nerve signal → blood vessels squeeze → the inner skin shrinks → wrinkles!
  [23.6, 37.05, (t) => {
    const water = inv(23.9, 24.6, t) * (1 - inv(34.3, 34.9, t));
    const glowK = inv(25.86, 26.3, t) * (1 - inv(31.6, 32.2, t));
    const squeeze = easeInOut(inv(30.3, 31.8, t));
    const drop = 0.18 * easeInOut(inv(32.8, 34.3, t));
    const k = easeInOut(inv(35.0, 36.5, t));
    labState(t, { glowK, squeeze, drop, k, water });
    dripsAt(t, 23.75);
    sparksAt(t, 26.3, 31.6, -4, 4, drop);
    labAffan(t, { smile: 0.9, brow: 0.3, lookX: 0.2, lookY: -0.2, wow: keys(t, [[35.9, 0], [36.1, 0.8], [36.9, 0.8], [37.05, 0]]) });
    if (t < 26.0) camMove(t, 23.6, 26.0, [-1.8, 4.2, 12.0], [-1.6, 2.0, 0.6], [-0.4, 3.2, 8.6], [-0.2, 1.6, 0.6]);
    else if (t < 32.3) camMove(t, 26.0, 32.3, [0.6, 2.0, 7.6], [0.2, 1.25, SLAB_FRONT], [-0.2, 1.8, 6.9], [-0.4, 1.15, SLAB_FRONT]);
    else camMove(t, 32.3, 37.05, [1.4, 3.0, 7.4], [0.4, 1.4, 0.6], [1.2, 4.2, 5.4], [0.4, 1.7, 0.2]);
    const ld = pop(t, 23.74, 25.7);
    ov.tag('lamaair', 'LAMA DALAM AIR', { x: W / 2, y: 330, o: ld.o, s: ld.s }, { bg: BLUE, small: true });
    const sp = lab.sparks[3];
    pinTag('isyarat', 'ISYARAT!', scr(sp.visible ? sp.position : V(0, 1.12, SLAB_FRONT)), t, 27.1, 28.9, { bg: YELLOW, pointer: 'down', small: true }, -70);
    const sr = pop(t, 28.0, 29.1);
    ov.tag('suruh', 'SARAF SURUH...', { x: W / 2, y: 330, o: sr.o, s: sr.s }, { bg: YELLOW, small: true });
    const v0 = lab.vessels[0];
    pinTag('salur', 'SALUR DARAH', scr(V(1.8, v0.position.y * (1 - drop), SLAB_FRONT)), t, 29.16, 32.3, { bg: RED, pointer: 'down' }, -70);
    const jk = pop(t, 31.0, 32.35, { from: 2 });
    ov.bubble('kecil', 'JADI KECIL!', { x: W / 2, y: 430, o: jk.o, s: jk.s, r: -2 }, { size: 124, top: '#ffd0d0', bot: '#ff4d5e' });
    const mg = pop(t, 33.76, 35.0);
    ov.tag('mengecut', 'BAWAH KULIT MENGECUT', { x: W / 2, y: 330, o: mg.o, s: mg.s }, { bg: PINK, small: true });
    const bk = pop(t, 36.06, 37.0, { from: 2.2 });
    ov.bubble('berkedut', 'BERKEDUT!', { x: W / 2, y: 430, o: bk.o, s: bk.s, r: 3 }, { size: 150, top: '#ecd6ff', bot: '#9a5cf0' });
    return lab;
  }],
  // S6 — why? Scientists think wrinkles may help us grip wet things
  [37.05, 45.1, (t) => {
    labState(t, { k: 1, drop: 0.18, squeeze: 1, water: 0 });
    const th = keys(t, [[37.2, 0], [37.6, 1], [39.4, 1], [39.8, 0]]);
    const grip = keys(t, [[42.6, 0], [43.0, 1], [44.8, 1], [45.1, 0.6]]);
    let p = { smile: 0.9, brow: 0.4, headYaw: -0.6, lookX: -0.2 };
    if (th > 0) p = { ...p, ...POSES.thinkR, armR: { ...POSES.thinkR.armR, reach: mix3([-0.62, 0.22, 0.12], POSES.thinkR.armR.reach, th) }, headRoll: -0.12 * th, lookY: 0.4 * th, brow: 0.6 };
    if (grip > 0) p = { ...p, smile: 1, brow: 0.6, armL: { reach: mix3([0.62, 0.22, 0.12], [0.7, 1.25, 0.75], grip), pole: [1, -1, 0] }, armR: { reach: mix3([-0.62, 0.22, 0.12], [-0.7, 1.25, 0.75], grip), pole: [-1, -1, 0], thumb: grip } };
    labAffan(t, { ...p, yaw: Math.PI / 2 - 0.9 });
    const k = easeInOut(inv(37.05, 45.1, t));
    lookCam(V(A_LAB.x + lerp(3.6, 3.0, k), 3.0, A_LAB.z + lerp(5.4, 4.6, k)), V(A_LAB.x + 0.4, 2.55, A_LAB.z), 50);
    ov.flash((1 - inv(37.05, 37.35, t)) * 0.5);
    const head = scr(V(A_LAB.x, 4.2, A_LAB.z));
    [[37.5, -230, -160, '#ffcf33', -12], [37.9, 240, -200, '#3fa2ff', 10]].forEach(([a, dx, dy, c, r], i) => {
      const q = pop(t, a, 39.7);
      ov.html('q' + i, ICONS.qmark(c), { x: clamp(head.x + dx, 110, 970), y: head.y + dy + Math.sin(t * 3 + i) * 10, o: q.o, s: q.s * 0.8, r });
    });
    const sr = pop(t, 39.84, 41.75);
    ov.tag('saintis', 'SAINTIS RASA...', { x: W / 2, y: 330, o: sr.o, s: sr.s }, { bg: PURPLE, small: true });
    const mk = pop(t, 41.8, 42.7, { from: 2 });
    ov.bubble('mungkin', 'MUNGKIN...', { x: W / 2, y: 430, o: mk.o, s: mk.s, r: -3 }, { size: 120, top: '#ecd6ff', bot: '#9a5cf0' });
    const pg = pop(t, 42.78, 45.05, { from: 2 });
    ov.bubble('pegang', 'PEGANG LEBIH KUAT!', { x: W / 2, y: 430, o: pg.o, s: pg.s, r: 2 }, { size: 96, top: '#d6fff0', bot: '#2fbf8f' });
    const bulb = pop(t, 41.0, 45.0);
    ov.html('bulb', ICONS.bulb(), { x: clamp(head.x + 230, 150, 930), y: clamp(head.y - 120, 300, 900) + Math.sin(t * 5) * 8, o: bulb.o, s: bulb.s * 0.6, r: 10 });
    return lab;
  }],
  // S7 — like tyre treads: the bald tyre slips on the wet road, the treaded one grips
  [45.1, 50.3, (t) => {
    labState(t, { k: 1, drop: 0.18, squeeze: 1 });
    lab.aff.root.position.set(0, -50, 0);
    const slip = inv(47.9, 48.4, t);
    tyresAt(t, slip);
    camMove(t, 45.1, 50.3, [ROAD_X + 7.6, 3.8, 8.2], [ROAD_X - 0.3, 1.0, 0.0], [ROAD_X + 6.8, 3.4, 7.4], [ROAD_X - 0.3, 1.0, 0.0]);
    ov.flash((1 - inv(45.1, 45.4, t)) * 0.6);
    const bw = lab.road.localToWorld(lab.bald.position.clone()).add(V(0, 1.3, 0));
    const tw = lab.road.localToWorld(lab.tread.position.clone()).add(V(0, 1.3, 0));
    const bt = pop(t, 45.38, 47.4);
    ov.tag('bunga', 'BUNGA TAYAR', { x: W / 2, y: 330, o: bt.o, s: bt.s }, { bg: '#5a6478', small: true });
    pinTag('botak', 'TAYAR BOTAK', scr(bw), t, 46.76, 50.25, { bg: '#7f8696', pointer: 'down', small: true }, -40);
    pinTag('adabunga', 'ADA BUNGA', scr(tw), t, 47.5, 50.25, { bg: GREEN, pointer: 'down', small: true }, -40);
    const tg = pop(t, 48.52, 50.2, { from: 2 });
    ov.bubble('slip', 'TERGELINCIR!', { x: W / 2, y: 470, o: tg.o, s: tg.s, r: -4 + 3 * Math.sin(t * 9) }, { size: 112, top: '#ffd6c0', bot: '#ff8a5c' });
    const ck = pop(t, 49.1, 50.25, { from: 2 });
    const tws = scr(tw);
    if (ck.o > 0 && tws.visible) ov.html('check', CHECK, { x: clamp(tws.x + 170, 120, 960), y: tws.y - 40, o: ck.o, s: ck.s * 0.6 });
    return lab;
  }],
  // S8 — marble test: smooth fingers drop the wet marble; wrinkly fingers hold it
  [50.3, 56.45, (t) => {
    yardReset(t);
    yard.aff.root.visible = false;
    const k = easeInOut(inv(53.9, 54.55, t));
    showHand(k, { pos: V(0.3, 1.0, 4.4), rotY: 0.55, rotZ: 0.0, pinch: 1, t, bob: 0.02 });
    const mid = fingerTip(0).add(fingerTip(4)).multiplyScalar(0.5);
    const m = yard.marble;
    m.visible = true;
    const t0 = 53.1;
    if (t < t0) m.position.copy(mid).add(V(0, -0.02 * Math.sin(t * 9) * inv(52.4, 53.0, t), 0));
    else if (t < 53.85) {
      const u = t - t0;
      m.position.copy(mid).add(V(0.15 * u, -4.9 * u * u - 0.4 * u, 0.1 * u));
      if (m.position.y < POOL.water) m.visible = false;
    } else {
      m.visible = t > 54.3;
      m.position.copy(mid).add(V(0, lerp(0.5, 0, easeOut(inv(54.3, 54.6, t))), 0));
    }
    m.rotation.set(t * 0.4, t * 0.6, 0);
    m.scale.setScalar(0.9);
    // splash ring where the marble lands
    const ru = (t - 53.55) / 0.7;
    yard.ring.visible = ru > 0 && ru < 1;
    if (yard.ring.visible) {
      yard.ring.position.set(mid.x + 0.1, POOL.water + 0.03, mid.z + 0.05);
      yard.ring.scale.setScalar(0.2 + ru * 0.9);
      yard.ring.material.opacity = 1 - ru;
    }
    splashes(t, [53.55], mid.x + 0.1, mid.z);
    camMove(t, 50.3, 56.45, [-1.4, 3.3, 10.6], [-0.2, 2.6, 4.4], [-1.2, 3.2, 9.8], [-0.2, 2.6, 4.4], 50, easeOut);
    ov.flash((1 - inv(50.3, 50.6, t)) * 0.6);
    const ms = scr(mid);
    pinTag('guli', 'GULI BASAH', ms, t, 51.18, 52.4, { bg: '#2fbf8f', pointer: 'down', small: true }, -110);
    const lc = pop(t, 52.08, 53.0);
    ov.tag('licin', 'JARI LICIN', { x: W / 2, y: 330, o: lc.o, s: lc.s }, { bg: BLUE, small: true });
    const eh = pop(t, 53.02, 54.3, { from: 2 });
    ov.bubble('tergelincir', 'TERGELINCIR!', { x: W / 2, y: 430, o: eh.o, s: eh.s, r: -4 }, { size: 112, top: '#ffd6c0', bot: '#ff8a5c' });
    const pl = pop(t, 53.6, 54.2, { from: 2, fin: 0.15 });
    ov.bubble('plip', 'PLIP!', { x: clamp(ms.x + 150, 150, 930), y: clamp(ms.y + 260, 400, 1350), o: pl.o, s: pl.s * 0.7, r: 6 }, { size: 110, top: '#cfeaff', bot: '#3fa2ff' });
    const kc = pop(t, 54.58, 55.65);
    ov.tag('jarikecut', 'JARI KECUT', { x: W / 2, y: 330, o: kc.o, s: kc.s }, { bg: PURPLE, small: true });
    const dp = pop(t, 55.72, 56.4, { from: 2.2 });
    ov.bubble('dapat', 'DAPAT!', { x: W / 2, y: 430, o: dp.o, s: dp.s, r: 3 }, { size: 160, top: '#d6fff0', bot: '#2fbf8f' });
    if (dp.o > 0 && ms.visible) {
      ov.html('check2', CHECK, { x: clamp(ms.x + 190, 140, 940), y: ms.y - 60, o: dp.o, s: dp.s * 0.6 });
      ov.sparkles(t, { n: 12, seed: 9, x: ms.x - 200, y: ms.y - 200, w: 400, h: 400, a: dp.o, size: 26 });
    }
    return yard;
  }],
  // S9 — don't worry: once dry, the fingers go smooth again
  [56.45, 61.45, (t) => {
    yardReset(t);
    if (t < 58.9) {
      const rub = Math.sin(t * 12);
      yardAffan(t, A_GRASS, {
        yaw: -0.5, smile: 1, brow: 0.3, headPitch: 0.15, lookY: -0.3,
        armL: { reach: [0.12 + 0.06 * rub, 0.75, 0.62], pole: [1, -1, 0] },
        armR: { reach: [-0.12 + 0.06 * rub, 0.72, 0.65], pole: [-1, -1, 0] },
      });
      camMove(t, 56.45, 58.9, [6.6, 3.0, 8.4], [4.0, 2.3, 2.3], [6.2, 2.9, 7.4], [4.0, 2.4, 2.3]);
      ov.flash((1 - inv(56.45, 56.75, t)) * 0.6);
      const jr = pop(t, 56.52, 58.85, { from: 2 });
      ov.bubble('risau', 'JANGAN RISAU!', { x: W / 2, y: 430, o: jr.o, s: jr.s, r: -2 }, { size: 116 });
      const kr = pop(t, 58.42, 58.85);
      ov.tag('kering', 'DAH KERING', { x: W / 2, y: 330, o: kr.o, s: kr.s }, { bg: ORANGE, small: true });
    } else {
      yard.aff.root.visible = false;
      const k = 1 - easeInOut(inv(59.3, 61.0, t));
      showHand(k, { rotY: -0.25, rotZ: 0.05, t, bob: 0.03 });
      lookCam(V(0.5, 3.5, 10.6), V(0.4, 3.05, 4.4), 50);
      ov.sparkles(t, { n: 20, seed: 14, x: 250, y: 450, w: 600, h: 700, a: inv(59.3, 59.8, t), size: 26 });
      const kr = pop(t, 58.9, 60.1);
      ov.tag('kering', 'DAH KERING', { x: W / 2, y: 330, o: kr.o, s: kr.s }, { bg: ORANGE, small: true });
      const lb = pop(t, 60.22, 61.4, { from: 2 });
      ov.bubble('licinbalik', 'LICIN BALIK!', { x: W / 2, y: 430, o: lb.o, s: lb.s, r: 2 }, { size: 124, top: '#cfeaff', bot: '#3fa2ff' });
    }
    return yard;
  }],
  // S10 — "Waaah, rupanya jari kecut tu kerja saraf kita!" then "what next?"
  [61.45, OUTRO, (t) => {
    yardReset(t);
    const jump = t > 61.55 && t < 62.2 ? Math.sin(((t - 61.55) / 0.65) * Math.PI) * 0.45 : 0;
    const up = keys(t, [[61.4, 0], [61.6, 1], [62.2, 1], [62.5, 0]]);
    const tk = keys(t, [[65.3, 0], [65.65, 1], [OUTRO, 1]]);
    let p = {
      yaw: -0.25, bob: jump, smile: 1, brow: 0.4,
      wow: keys(t, [[61.4, 0], [61.55, 1], [62.2, 1], [62.45, 0]]),
      blink: t > 61.4 && t < 62.4 ? 0 : blinkAt(t, 6),
      legL: { x: -0.25 * jump, knee: 0.6 * jump }, legR: { x: -0.25 * jump, knee: 0.6 * jump },
      armL: { reach: [lerp(0.62, 0.85, up), lerp(0.22, 1.85, up), lerp(0.12, 0.3, up)], pole: [1, -0.4, -0.5] },
      armR: { reach: [lerp(-0.62, -0.85, up), lerp(0.22, 1.85, up), lerp(0.12, 0.3, up)], pole: [-1, -0.4, -0.5] },
    };
    if (tk > 0) p = { ...p, ...POSES.thinkR, armL: { reach: [0.62, 0.22, 0.12] }, armR: { ...POSES.thinkR.armR, reach: mix3([-0.62, 0.22, 0.12], POSES.thinkR.armR.reach, tk) }, headRoll: -0.12 * tk, lookX: 0.35 * tk, lookY: 0.4 * tk, headPitch: -0.08 * tk };
    yardAffan(t, A_GRASS, p);
    camMove(t, 61.45, OUTRO, [5.6, 3.1, 8.6], [4.3, 2.6, 2.3], [5.3, 3.0, 7.4], [4.3, 2.75, 2.3]);
    ov.flash((1 - inv(61.45, 61.75, t)) * 0.8, '230,245,255');
    const head = scr(V(A_GRASS.x, 3.9 + jump, A_GRASS.z));
    const b = pop(t, 61.6, 63.7);
    ov.html('bulb', ICONS.bulb(), { x: clamp(head.x + 250, 150, 920), y: clamp(head.y - 80, 300, 900) + Math.sin(t * 5) * 8, o: b.o, s: b.s * 0.7, r: 10 });
    ov.sparkles(t, { n: 30, seed: 12, y: 250, h: 900, a: inv(61.55, 61.9, t) * (1 - inv(63.2, 63.8, t)) });
    const ks = pop(t, 63.78, 65.3, { from: 2 });
    ov.bubble('kerjasaraf', 'KERJA SARAF!', { x: W / 2, y: 430, o: ks.o, s: ks.s, r: -2 }, { size: 128, top: '#fff3a0', bot: '#ffb21f' });
    [[65.42, -260, -230, '#ffcf33', -12], [65.75, 250, -280, '#3fa2ff', 10], [66.05, 300, -60, '#ffcf33', 14]].forEach(([a, dx, dy, c, r], i) => {
      const q = pop(t, a, OUTRO - 0.05);
      ov.html('qq' + i, ICONS.qmark(c), { x: clamp(head.x + dx, 110, 970), y: head.y + dy + Math.sin(t * 3 + i) * 10, o: q.o, s: q.s * 0.85, r });
    });
    return yard;
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
  lab.stars.userData.update(t);
  const world = shot[2](t);
  if (world.sky) {
    world.sky.position.copy(cam.position);
    world.stars.position.copy(cam.position);
  }
  renderer.render(world.scene, cam);
  if (world !== outro) ov.vignette(0.25);
  ov.captions(t, CAPTIONS, KEYWORDS);
  ov.end();
}

// Cover / thumbnail (9:16): the giant wrinkly hand next to a raisin, Affan's
// surprised face peeking in, a big title, episode badge and the series logo.
// Key elements stay inside the centre 3:4 area (y 240-1680).
const THUMB = { cam: [0.5, 3.3, 10.2], look: [0.4, 2.9, 4.4], fov: 50 };
window.setThumb = (o) => Object.assign(THUMB, o);
function thumbnail() {
  ov.begin();
  cam.aspect = W / H;
  cam.updateProjectionMatrix();
  const t = 8.0;
  yardReset(t);
  yard.aff.root.visible = false;
  showHand(1, { rotY: -0.2, rotZ: 0.08 });
  yard.raisin.visible = true;
  yard.raisin.position.set(1.4, 3.5, 5.0);
  yard.raisin.scale.setScalar(0.36);
  yard.raisin.rotation.set(0.3, 4, 0.2);
  lookCam(V(...THUMB.cam), V(...THUMB.look), THUMB.fov);
  renderer.render(yard.scene, cam);
  const g = ov.g;
  const top = g.createLinearGradient(0, 0, 0, 760);
  top.addColorStop(0, 'rgba(20,50,110,0.75)');
  top.addColorStop(1, 'rgba(20,50,110,0)');
  g.fillStyle = top;
  g.fillRect(0, 0, W, 760);
  const bot = g.createLinearGradient(0, H - 900, 0, H);
  bot.addColorStop(0, 'rgba(20,50,110,0)');
  bot.addColorStop(1, 'rgba(20,50,110,0.75)');
  g.fillStyle = bot;
  g.fillRect(0, H - 900, W, 900);
  ov.vignette(0.3);
  ov.tag('thBadge', 'EPISOD 32', { x: W / 2, y: 300 }, { bg: '#2f7bff', small: true });
  ov.bubble('thTitle', 'JARI KECUT?', { x: W / 2, y: 450, r: -3 }, { size: 140, top: '#ecd6ff', bot: '#9a5cf0' });
  ov.html('thQ', ICONS.qmark('#ffcf33'), { x: 140, y: 760, r: -14, s: 0.9 });
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
