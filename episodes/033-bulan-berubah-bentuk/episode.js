// THE CURIOUS AFFAN — Episode 033: "Kenapa Bulan Berubah Bentuk?"
// Every shot is a pure function of time t (seconds), synced to audio/narration.mp3.
import * as THREE from 'three';
import { makeRenderer, loadEnvelope, toScreen, clamp, lerp, inv, easeOut, easeInOut, keys, wobble, W, H } from '../../shared/core.js';
import { POSES, blinkAt } from '../../shared/affan.js';
import { Overlay, pop, ICONS, drawLogo } from '../../shared/overlay.js';
import { CAPTIONS, KEYWORDS } from './captions.js';
import { buildRoad, buildSpace, buildDarkRoom, buildOutro, carX, CAR_SPEED, EARTH_R, ORBIT_R, SUN_POS } from './worlds.js';

const FPS = 30;
const DURATION = 81.9;
const OUTRO = 78.75;

const stage = document.getElementById('stage');
const canvas = document.createElement('canvas');
stage.appendChild(canvas);
const renderer = makeRenderer(canvas);
const ov = new Overlay(stage);
const road = buildRoad();
const space = buildSpace();
const room = buildDarkRoom();
const outro = buildOutro();
const cam = new THREE.PerspectiveCamera(50, W / H, 0.02, 6000);
const cam2 = new THREE.PerspectiveCamera(22, 1, 0.02, 6000);
let env = { at: () => 0 };
let inset = null; // { k, label } when the "view from Earth" panel is shown

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const UP = V(0, 1, 0);
const talk = (t) => clamp(env.at(t) * 1.2);
const scr = (p) => toScreen(p, cam);
const mix3 = (a, b, k) => a.map((v, i) => lerp(v, b[i], k));
const BLUE = '#2f9bff', YELLOW = '#e0b400', ORANGE = '#ff8a3d', PURPLE = '#7a5cf0', RED = '#ff4d5e', GREEN = '#2fbf5f';

function lookCam(pos, look, fov = 50, c = cam) {
  c.position.copy(pos);
  c.fov = fov;
  c.updateProjectionMatrix();
  c.lookAt(look);
  c.updateMatrixWorld(true);
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

// --------------------------------------------------------------- road helpers
const roadMoonDir = new THREE.Vector3();
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
  road.moonLight.position.copy(c.position).addScaledVector(roadMoonDir, 80);
}
function roadMoon(tRef, dl, dist = 750) {
  roadMoonDir.set(-dl[0], dl[1], -dl[2]).normalize();
  road.moon.position.set(carX(tRef), 0, 1.6).addScaledVector(roadMoonDir, dist);
}
// phase: 0 = full, PI/2 = half, PI = new (as seen from the camera)
function roadPhase(phase) {
  const v = cam.position.clone().sub(road.moon.position).normalize();
  road.moon.userData.ball.material.uniforms.sunDir.value.copy(v.applyAxisAngle(UP, -phase));
  const lit = 0.5 * (1 + Math.cos(phase));
  road.moonGlows.forEach((g, i) => (g.material.opacity = [0.55, 0.35][i] * (0.25 + 0.75 * lit)));
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

// -------------------------------------------------------------- space helpers
// orbit angle th: PI = new moon (between Earth and Sun), 2PI = full moon
const moonAt = (th) => V(ORBIT_R * Math.cos(th), 0, -ORBIT_R * Math.sin(th));
function spaceState(t, th, { sun = 1, orbit = 1, shadow = 0, red = 0 } = {}) {
  space.moon.position.copy(moonAt(th));
  space.moon.rotation.y = th + Math.PI; // keeps the same face towards Earth
  space.globe.rotation.y = t * 0.4;
  space.sunLight.intensity = 3.2 * sun;
  space.sunGlow1.material.opacity = 0.2 + 0.6 * sun;
  space.sunGlow2.material.opacity = 0.1 + 0.3 * sun;
  space.sun.children[0].material.color.setHex(sun > 0.5 ? 0xffd25a : 0x8a6a2a);
  space.orbit.material.opacity = 0.7 * orbit;
  space.orbit.visible = orbit > 0.01;
  space.shadow.visible = shadow > 0.01;
  space.shadow.material.opacity = 0.3 * shadow;
  space.moonMat.color.setHex(0xfff4da).lerp(new THREE.Color(0xb04a2a), red);
  space.moonMat.emissive.setHex(0x000000).lerp(new THREE.Color(0x3a0a04), red);
  space.term.visible = false;
  space.rays.forEach((r) => (r.visible = false));
  space.aff.pose({ yaw: 0, blink: blinkAt(t, 3), smile: 0.9, headPitch: -0.2, lookY: 0.3 });
  space.earth.visible = true;
  inset = null;
}
// Affan on top of the Earth turns to face the moon
function earthAffan(t, th, p = {}) {
  space.aff.pose({ yaw: Math.atan2(Math.cos(th), -Math.sin(th)), blink: blinkAt(t, 3), smile: 0.9, headPitch: -0.25, lookY: 0.4, ...p });
}
// --------------------------------------------------------------- room helpers
const A_ROOM = V(0.9, 0, 0.9);
// Affan holds the ball in front of his face; yaw turns him on the spot
function roomAffan(t, yaw, hold = 1, p = {}) {
  room.aff.root.position.copy(A_ROOM);
  const a = room.aff;
  a.pose({
    yaw, blink: blinkAt(t, 1), talk: talk(t), smile: 0.9, headPitch: 0.12 * hold, lookY: -0.2 * hold,
    armL: { reach: mix3([0.62, 0.22, 0.12], [0.36, 1.15, 0.86], hold), pole: [1, -0.6, -0.3] },
    armR: { reach: mix3([-0.62, 0.22, 0.12], [-0.36, 1.15, 0.86], hold), pole: [-1, -0.6, -0.3] },
    ...p,
  });
  a.root.updateMatrixWorld(true);
  room.ball.visible = hold > 0.02;
  room.ball.position.copy(a.parts.torso.localToWorld(V(0, 1.2, 1.02)));
  room.ball.scale.setScalar(clamp(hold * 1.4) * 0.86);
}

// a "sunlight comes from here" marker on the left edge for the orbit shots
function sunHint(t, a, b) {
  const q = pop(t, a, b);
  if (q.o <= 0) return;
  ov.html('sunHint', `<div style="transform:rotate(180deg)">${ICONS.arrow('#ffb21f')}</div>`, { x: 190, y: 1000, o: q.o * 0.9, s: 0.55 * q.s });
  ov.tag('sunHintT', 'MATAHARI', { x: 175, y: 920, o: q.o, s: 0.8 * q.s }, { bg: '#e08a00', small: true });
}

// ======================================================================= SHOTS
const SHOTS = [
  // S1 — in the car at night: Affan at the window, then turns to Papa
  [0, 2.95, (t) => {
    roadMoon(0, [-0.35, 0.2, -0.97]);
    roadCar(t);
    interior(true);
    const look = t < 2.0 ? keys(t, [[0, 0.42], [1.9, 0.5]]) : keys(t, [[2.0, 1.05], [2.4, -0.75]], easeOut);
    carAffan(t, { headYaw: look, headPitch: t < 2.0 ? -0.22 : -0.05, lookY: t < 2.0 ? 0.55 : 0.1, lookX: t < 2.0 ? 0.85 : 0, brow: t > 2.0 ? 0.8 : 0.3, smile: 0.9 });
    const cp = keys(t, [[0, [-0.12, 1.54, 0.74]], [2.95, [-0.25, 1.53, 0.64]]], (k) => k);
    lookCam(carLocal(...cp), carLocal(-0.95, 1.5, -0.5), 50);
    roadPhase(Math.PI / 2);
    const q = pop(t, 0.5, 2.9);
    ov.tag('ep', 'EPISOD 33', { x: W / 2, y: 268, o: q.o, s: q.s }, { bg: '#2f7bff', small: true });
    const pp = pop(t, 2.22, 2.9, { from: 2 });
    ov.bubble('papa', 'PAPA!', { x: 820, y: 470, o: pp.o, s: pp.s * 0.8, r: 6 }, { size: 110 });
    return road;
  }],
  // S2 — POV at the moon: "yesterday it was round... tonight only half! Who ate the moon?"
  [2.95, 8.3, (t) => {
    roadMoon(5.5, [-0.05, 0.37, -1.0], 300);
    road.moon.position.x = carX(5.5) - 1;
    roadCar(t);
    interior(false);
    carAffan(t, { headYaw: 1.2, headPitch: -0.3, lookY: 0.4 });
    const k = easeInOut(inv(2.95, 8.3, t));
    const cx = carX(t);
    lookCam(V(cx + lerp(1.4, 0.9, k), 1.6, -9.5), V(cx - 0.2, lerp(4.2, 5.0, k), 0), 50);
    const ph = t < 4.5 ? 0 : Math.PI / 2;
    roadPhase(ph);
    ov.flash(0.8 * (1 - inv(4.5, 4.8, t)) * (t >= 4.5 ? 1 : 0), '20,30,90');
    const m = scr(road.moon.position);
    const sm = pop(t, 2.98, 4.45, { from: 2 });
    ov.bubble('semalam', 'SEMALAM: BULAT!', { x: W / 2, y: 430, o: sm.o, s: sm.s, r: -2 }, { size: 104, top: '#fff6d0', bot: '#ffd84a' });
    const mn = pop(t, 4.54, 6.65, { from: 2 });
    ov.bubble('malam', 'MALAM NI: SEPARUH!', { x: W / 2, y: 430, o: mn.o, s: mn.s, r: 2 }, { size: 96, top: '#e6ecff', bot: '#7aa8ff' });
    pinTag('bulan', 'BULAN', m, t, 3.44, 6.6, { bg: BLUE, pointer: 'down' }, -130);
    const sp = pop(t, 6.76, 8.25, { from: 2 });
    ov.bubble('siapa', 'SIAPA MAKAN BULAN?', { x: W / 2, y: 430, o: sp.o, s: sp.s, r: -3 }, { size: 96 });
    const ch = pop(t, 7.16, 8.25, { from: 2.4 });
    if (ch.o > 0 && m.visible) ov.bubble('chomp', 'NYAM!', { x: clamp(m.x + 200, 160, 930), y: clamp(m.y + 120, 400, 1300), o: ch.o, s: ch.s * 0.7, r: 10 }, { size: 110, top: '#ffd6ec', bot: '#ff5c9a' });
    return road;
  }],
  // S3 — "Jom ikut Affan cari jawapan!" + magic swirl
  [8.3, 10.35, (t) => {
    roadMoon(8, [-1, 0.14, -0.3]);
    roadCar(t);
    interior(true);
    roadPhase(Math.PI / 2);
    const up = keys(t, [[8.35, 0], [8.6, 1], [9.9, 1], [10.2, 0.6]], easeOut);
    carAffan(t, { headYaw: -0.12, smile: 1, brow: 0.6, lookX: 0.05, armR: { reach: [lerp(-0.55, -0.6, up), lerp(0.32, 1.95 + 0.06 * Math.sin(t * 14), up), lerp(0.25, 0.35, up)], pole: [-1, -0.3, -0.5] } });
    const k = easeInOut(inv(8.3, 10.35, t));
    lookCam(carLocal(lerp(0.3, 0.05, k), 1.56, lerp(-0.25, -0.38, k)), carLocal(...AFF_HEAD_LOCAL), 48);
    ov.swirl(t, W / 2, 820, inv(8.8, 10.3, t));
    ov.flash(inv(9.95, 10.35, t) ** 2);
    return road;
  }],
  // S4 — the moon has no light of its own; sunlight lights one half
  [10.35, 21.3, (t) => {
    const th = Math.PI * 1.5;
    const sun = t < 11.6 ? 1 : t < 13.85 ? 0 : easeOut(inv(13.85, 14.3, t));
    spaceState(t, th, { sun, orbit: 0 });
    space.earth.visible = false;
    const mp = space.moon.position;
    // light rays travelling from the Sun to the Moon
    if (t > 14.2 && t < 17.6) {
      const f = inv(14.2, 14.6, t) * (1 - inv(17.2, 17.6, t));
      space.rays.forEach((r, i) => {
        const u = ((t - 14.2) * 0.55 + i / space.rays.length) % 1;
        const from = SUN_POS.clone().add(V(7, ((i * 7) % 5 - 2) * 0.35, ((i * 3) % 5 - 2) * 0.35));
        r.position.copy(from.lerp(mp.clone().add(V(-0.3, ((i * 5) % 3 - 1) * 0.25, ((i * 11) % 3 - 1) * 0.25)), u));
        r.material.opacity = f;
        r.visible = true;
      });
    }
    // terminator ring: the dividing line between the lit and dark halves
    if (t > 18.1) {
      const tr = space.term;
      tr.visible = true;
      tr.position.copy(mp);
      tr.quaternion.setFromUnitVectors(V(0, 0, 1), V(-1, 0, 0));
      tr.scale.setScalar(0.92 + 0.04 * Math.sin(t * 5));
      tr.material.opacity = inv(18.1, 18.6, t) * (1 - inv(20.9, 21.3, t));
    }
    // camera: close on the Moon, the Sun far to the left, orbiting to show the lit half
    const a = lerp(0.35, -0.45, easeInOut(inv(10.35, 21.3, t)));
    const d = 3.4;
    lookCam(mp.clone().add(V(Math.sin(a) * d, 0.6, Math.cos(a) * d)), mp.clone().add(V(-0.45, 0.1, 0)), 50);
    ov.flash(1 - inv(10.35, 10.7, t));
    const ms = scr(mp);
    const sb = pop(t, 10.54, 11.6);
    ov.tag('sebenar', 'SEBENARNYA...', { x: W / 2, y: 330, o: sb.o, s: sb.s }, { bg: PURPLE, small: true });
    const tc = pop(t, 11.72, 13.85, { from: 2 });
    ov.bubble('tiada', 'TAK ADA CAHAYA SENDIRI', { x: W / 2, y: 430, o: tc.o, s: tc.s, r: -2 }, { size: 84, top: '#e6ecff', bot: '#7aa8ff' });
    const cm = pop(t, 15.34, 17.6);
    ov.tag('cahaya', 'CAHAYA MATAHARI', { x: W / 2, y: 330, o: cm.o, s: cm.s }, { bg: YELLOW, small: true });
    const bs = pop(t, 14.22, 17.6, { from: 2 });
    ov.bubble('bersinar', 'BERSINAR!', { x: W / 2, y: 440, o: bs.o, s: bs.s, r: 3 }, { size: 130, top: '#fff6d0', bot: '#ffb21f' });
    const st = pop(t, 19.92, 21.25, { from: 2 });
    ov.bubble('separuh', 'SEPARUH TERANG', { x: W / 2, y: 440, o: st.o, s: st.s, r: -2 }, { size: 104, top: '#fff6d0', bot: '#ffb21f' });
    pinTag('bulanTag', 'BULAN', ms, t, 11.72, 13.8, { bg: BLUE, pointer: 'down' }, -170);
    return space;
  }],
  // S5 — the Moon travels around the Earth; we see a different part of the lit half
  [21.3, 28.65, (t) => {
    const th = Math.PI * 1.5 + (Math.PI * 2) * easeInOut(inv(21.6, 28.2, t));
    spaceState(t, th, { orbit: inv(21.3, 21.9, t) });
    earthAffan(t, th);
    camMove(t, 21.3, 28.65, [1.6, 7.5, 12.5], [0, 0, 0], [0.3, 9.5, 26.5], [0, -1.6, 0], 50);
    ov.flash((1 - inv(21.3, 21.6, t)) * 0.5);
    pinTag('bumi', 'BUMI', scr(V(0, EARTH_R + 0.6, 0)), t, 23.6, 26.5, { bg: '#2f7fe0', pointer: 'down' }, -60);
    pinTag('bulan2', 'BULAN', scr(space.moon.position), t, 21.4, 23.5, { bg: BLUE, pointer: 'down' }, -60);
    const mk = pop(t, 22.9, 24.4);
    ov.tag('keliling', 'MENGELILINGI BUMI', { x: W / 2, y: 330, o: mk.o, s: mk.s }, { bg: GREEN, small: true });
    inset = t > 25.6 ? { k: inv(25.6, 26.1, t), label: 'DARI BUMI', th } : null;
    sunHint(t, 22.0, 28.6);
    const bz = pop(t, 27.78, 28.6, { from: 2 });
    ov.bubble('berbeza', 'BERBEZA!', { x: W / 2, y: 1300, o: bz.o, s: bz.s, r: 3 }, { size: 120 });
    return space;
  }],
  // S6 — the phases one by one: dark → crescent → half → full → smaller again
  [28.65, 48.35, (t) => {
    const th = keys(t, [[28.65, Math.PI * 0.97], [33.0, Math.PI], [35.0, Math.PI], [36.6, Math.PI * 1.22], [37.6, Math.PI * 1.25], [39.5, Math.PI * 1.42], [40.2, Math.PI * 1.5], [41.0, Math.PI * 1.55], [42.5, Math.PI * 2], [44.8, Math.PI * 2], [47.9, Math.PI * 2.62], [48.35, Math.PI * 2.65]]);
    spaceState(t, th, { orbit: 1 });
    earthAffan(t, th, { smile: t > 42.3 ? 1 : 0.9, wow: keys(t, [[42.3, 0], [42.5, 0.8], [43.3, 0.8], [43.6, 0]]) });
    camMove(t, 28.65, 48.35, [0.3, 9.5, 26.5], [0, -1.6, 0], [-0.6, 9.0, 26.0], [0, -1.6, 0], 50);
    inset = { k: 1, label: 'DARI BUMI', th };
    sunHint(t, 28.65, 48.3);
    const names = [['GELAP', 33.24, 34.6, '#3a4466'], ['SABIT', 36.04, 37.55, '#c9a400'], ['SEPARUH', 39.86, 40.6, '#c98a00'], ['PURNAMA!', 43.58, 44.85, '#ff8a00'], ['MAKIN KECIL...', 46.64, 48.3, '#7a5cf0']];
    names.forEach(([n, a, b, c]) => {
      const q = pop(t, a, b, { from: 2 });
      if (q.o > 0) ov.bubble('ph' + n, n, { x: W / 2, y: 1300, o: q.o, s: q.s, r: -2 }, { size: n.length > 8 ? 100 : 130, top: '#fff6d0', bot: c });
    });
    const md = pop(t, 30.94, 32.6);
    ov.tag('jauh', 'TERANG MENGHADAP JAUH', { x: W / 2, y: 330, o: md.o, s: md.s }, { bg: '#3a4466', small: true });
    const mb = pop(t, 37.6, 39.45);
    ov.tag('besar', 'MAKIN BESAR', { x: W / 2, y: 330, o: mb.o, s: mb.s }, { bg: YELLOW, small: true });
    return space;
  }],
  // S7 — one full round takes about 29 and a half days
  [48.35, 53.0, (t) => {
    const th = Math.PI * 2.65 + (Math.PI * 1.35 + Math.PI * 2) * easeInOut(inv(48.4, 52.8, t));
    spaceState(t, th);
    earthAffan(t, th);
    camMove(t, 48.35, 53.0, [-0.6, 9.0, 26.0], [0, -1.6, 0], [0.4, 10.5, 26.0], [0, -1.6, 0], 50);
    inset = { k: 1, label: 'DARI BUMI', th, noDay: true };
    const day = Math.round(clamp((t - 48.6) / (52.4 - 48.6)) * 29);
    const q = pop(t, 48.58, 52.95);
    if (q.o > 0) ov.html('cal', `<div style="width:300px;background:#fff;border:10px solid #17256b;border-radius:28px;text-align:center;font:800 40px 'Baloo 2';color:#17256b;overflow:hidden"><div style="background:#ff5c9a;color:#fff;padding:6px 0">HARI</div><div style="font-size:120px;line-height:1.1">${t > 52.2 ? '29½' : day}</div></div>`, { x: W / 2, y: 1240, o: q.o, s: q.s * 0.7 });
    const ps = pop(t, 48.96, 50.6);
    ov.tag('pusingan', 'SATU PUSINGAN', { x: W / 2, y: 1110, o: ps.o, s: ps.s }, { bg: GREEN, small: true });
    return space;
  }],
  // S8 — not Earth's shadow! That only happens in a lunar eclipse — rarely
  [53.0, 62.05, (t) => {
    const th = keys(t, [[53.0, Math.PI * 1.75], [57.9, Math.PI * 1.8], [59.6, Math.PI * 2], [62.05, Math.PI * 2]]);
    const red = inv(59.0, 59.8, t);
    spaceState(t, th, { shadow: inv(53.9, 54.6, t), red });
    earthAffan(t, th, { wow: keys(t, [[59.4, 0], [59.6, 0.8], [60.4, 0.8], [60.7, 0]]) });
    if (t < 57.9) camMove(t, 53.0, 57.9, [3.2, 7.5, 16.5], [3.6, 0, 0], [3.6, 6.5, 14.5], [3.8, 0, 0]);
    else camMove(t, 57.9, 62.05, [4.4, 3.4, 9.6], [5.4, 0, 0], [5.0, 3.0, 8.4], [5.8, 0, 0]);
    const by = pop(t, 54.3, 56.7);
    ov.tag('bayang', 'BAYANG-BAYANG BUMI', { x: W / 2, y: 330, o: by.o, s: by.s }, { bg: '#3a3f6a', small: true });
    const ri = pop(t, 53.08, 56.7, { from: 2 });
    ov.bubble('ingat', 'TUTUP BULAN?', { x: W / 2, y: 430, o: ri.o, s: ri.s, r: -3 }, { size: 120, top: '#e6ecff', bot: '#7aa8ff' });
    const bk = pop(t, 56.79, 58.0, { from: 3, fin: 0.2 });
    ov.html('cross', ICONS.cross(), { x: W / 2, y: 430, o: bk.o, s: bk.s * 1.1, r: 8 });
    const bk2 = pop(t, 56.79, 58.0, { from: 2 });
    ov.bubble('bukan', 'BUKAN!', { x: W / 2, y: 640, o: bk2.o, s: bk2.s, r: 3 }, { size: 140, top: '#ffd0d0', bot: '#ff4d5e' });
    const gh = pop(t, 59.44, 62.0, { from: 2 });
    ov.bubble('gerhana', 'GERHANA BULAN', { x: W / 2, y: 430, o: gh.o, s: gh.s, r: -2 }, { size: 112, top: '#ffe0c8', bot: '#ff8a5c' });
    const jr = pop(t, 60.72, 62.0);
    ov.tag('jarang', 'JARANG-JARANG JE', { x: W / 2, y: 330, o: jr.o, s: jr.s }, { bg: ORANGE, small: true });
    return space;
  }],
  // S9 — try it at home: a ball in front of your face, a lamp in a dark room, turn slowly
  [62.05, 72.75, (t) => {
    const dark = easeInOut(inv(66.5, 67.3, t));
    room.setDark(dark);
    const hold = easeOut(inv(63.6, 64.2, t));
    const turnK = easeInOut(inv(67.8, 72.4, t));
    const yaw = -0.35 + Math.PI * 2 * turnK;
    roomAffan(t, yaw, hold, { smile: 1, brow: 0.4 });
    camMove(t, 62.05, 67.6, [1.6, 3.1, 8.8], [-0.2, 2.3, 0.6], [1.3, 3.0, 7.9], [-0.2, 2.3, 0.6]);
    if (t > 67.6) inset = { k: inv(67.6, 68.1, t), label: 'DARI MATA AFFAN', room: true, yaw, noDay: true };
    ov.flash(1 - inv(62.05, 62.35, t));
    const cb = pop(t, 62.16, 63.55, { from: 2 });
    ov.bubble('cuba', 'CUBA KAT RUMAH!', { x: W / 2, y: 430, o: cb.o, s: cb.s, r: -2 }, { size: 112, top: '#d6fff0', bot: '#2fbf8f' });
    pinTag('bola', 'BOLA', scr(room.ball.position), t, 63.88, 65.3, { bg: '#ff5c9a', pointer: 'down' }, -70);
    pinTag('lampu', 'LAMPU', scr(room.lamp.localToWorld(V(0, 2.85, 0))), t, 66.04, 68.9, { bg: YELLOW, pointer: 'down' }, -80);
    const bg = pop(t, 66.66, 67.75);
    ov.tag('gelap', 'BILIK GELAP', { x: W / 2, y: 330, o: bg.o, s: bg.s }, { bg: '#3a4466', small: true });
    const pg = pop(t, 67.82, 69.6);
    ov.tag('pusing', 'PUSING PERLAHAN-LAHAN', { x: W / 2, y: 1150, o: pg.o, s: pg.s }, { bg: GREEN, small: true });
    const tg = pop(t, 69.76, 72.7, { from: 2 });
    ov.bubble('tengok', 'MACAM BULAN!', { x: W / 2, y: 1230, o: tg.o, s: tg.s, r: 2 }, { size: 124, top: '#fff6d0', bot: '#ffb21f' });
    return room;
  }],
  // S10 — back in the car: "Waaah, nobody ate the moon!" then "what next?"
  [72.75, OUTRO, (t) => {
    roadMoon(74, [-1, 0.25, -0.35]);
    roadCar(t);
    interior(true);
    const up = keys(t, [[72.85, 0], [73.05, 1], [73.8, 1], [74.1, 0]]);
    const tk = keys(t, [[76.5, 0], [76.85, 1], [OUTRO, 1]]);
    const th2 = POSES.thinkR.armR;
    let armR = {}, armL = {};
    if (up > 0) {
      armR = { reach: [lerp(-0.55, -0.7, up), lerp(0.32, 1.85, up), lerp(0.25, 0.3, up)], pole: [-1, -0.4, -0.5] };
      armL = { reach: [lerp(0.55, 0.7, up), lerp(0.32, 1.85, up), lerp(0.25, 0.3, up)], pole: [1, -0.4, -0.5] };
    } else if (tk > 0) armR = { reach: mix3(seatedRest.armR.reach, th2.reach, tk), pole: th2.pole, point: tk, wx: th2.wx * tk };
    carAffan(t, {
      headYaw: -0.12 + 0.05 * wobble(t, 2), smile: 1, brow: 0.3 + 0.4 * tk,
      wow: keys(t, [[72.8, 0], [72.95, 1], [73.7, 1], [73.95, 0]]),
      headRoll: -0.12 * tk, lookX: 0.35 * tk, lookY: 0.4 * tk, headPitch: -0.08 * tk, armR, armL,
    });
    roadPhase(Math.PI / 2);
    const k = easeInOut(inv(72.75, OUTRO, t));
    lookCam(carLocal(lerp(0.42, 0.24, k), 1.55, lerp(-0.22, -0.36, k)), carLocal(-0.92, 1.42, -0.45), 50);
    ov.flash((1 - inv(72.75, 73.05, t)) * 0.9, '20,40,120');
    const head = scr(carLocal(...AFF_HEAD_LOCAL));
    const b = pop(t, 72.95, 75.0);
    ov.html('bulb', ICONS.bulb(), { x: clamp(head.x + 240, 150, 900), y: clamp(head.y - 60, 300, 900) + Math.sin(t * 5) * 8, o: b.o, s: b.s * 0.7, r: 10 });
    ov.sparkles(t, { n: 30, seed: 12, y: 250, h: 900, a: inv(72.9, 73.2, t) * (1 - inv(74.6, 75.2, t)) });
    const tm = pop(t, 74.0, 76.5, { from: 2 });
    ov.bubble('takmakan', 'TAK ADA SIAPA MAKAN!', { x: W / 2, y: 430, o: tm.o, s: tm.s, r: -2 }, { size: 96 });
    [[76.64, -260, -230, '#ffcf33', -12], [76.95, 250, -280, '#3fa2ff', 10], [77.25, 300, -60, '#ffcf33', 14]].forEach(([a, dx, dy, c, r], i) => {
      const q = pop(t, a, OUTRO - 0.05);
      ov.html('q' + i, ICONS.qmark(c), { x: clamp(head.x + dx, 110, 970), y: head.y + dy + Math.sin(t * 3 + i) * 10, o: q.o, s: q.s * 0.85, r });
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

// "view from Earth" panel: a second camera on the Earth looking at the Moon,
// drawn into a round window near the top of the frame.
const INSET = { x: W / 2, y: 520, r: 175 };
function drawInset(t) {
  if (!inset || inset.k <= 0.01) return;
  const k = inset.k;
  let world = space;
  if (inset.room) {
    // first-person view from Affan's eyes towards the ball
    world = room;
    const yaw = inset.yaw;
    const fwd = V(Math.sin(yaw), 0, Math.cos(yaw));
    const eye = room.aff.parts.head.getWorldPosition(V()).addScaledVector(fwd, 0.8).add(V(0, 0.55, 0));
    lookCam(eye, room.ball.position, 46, cam2);
  } else {
    const dir = space.moon.position.clone().normalize();
    const eye = dir.clone().multiplyScalar(EARTH_R * 1.15).add(V(0, 0.3, 0));
    lookCam(eye, space.moon.position, 17, cam2);
    space.sky.position.copy(eye);
    space.stars.position.copy(eye);
  }
  const s = INSET.r * 2 * (0.6 + 0.4 * easeOut(k));
  const x = INSET.x - s / 2, yTop = INSET.y - s / 2;
  // dark disc behind + border via the overlay; the 3D view goes in a square viewport
  renderer.setScissorTest(true);
  renderer.setScissor(x, H - yTop - s, s, s);
  renderer.setViewport(x, H - yTop - s, s, s);
  cam2.aspect = 1;
  cam2.updateProjectionMatrix();
  space.orbit.visible = false;
  space.term.visible = false;
  renderer.render(world.scene, cam2);
  renderer.setScissorTest(false);
  renderer.setViewport(0, 0, W, H);
  const g = ov.g;
  // a dark frame ring hides the square corners, then a gold rim
  g.save();
  g.globalAlpha = k;
  g.lineWidth = s * 0.16;
  g.strokeStyle = 'rgba(10,14,48,1)';
  g.beginPath();
  g.arc(INSET.x, INSET.y, s / 2 + s * 0.08 - 2, 0, Math.PI * 2);
  g.stroke();
  // fill the square corners outside the frame ring
  g.fillStyle = 'rgba(10,14,48,1)';
  g.beginPath();
  g.rect(x - 1, yTop - 1, s + 2, s + 2);
  g.arc(INSET.x, INSET.y, s / 2 + s * 0.16, 0, Math.PI * 2, true);
  g.fill('evenodd');
  g.lineWidth = 12;
  g.strokeStyle = '#ffe08a';
  g.beginPath();
  g.arc(INSET.x, INSET.y, s / 2 + 2, 0, Math.PI * 2);
  g.stroke();
  g.restore();
  ov.tag('insetLabel', inset.label, { x: INSET.x, y: INSET.y + s / 2 + 40, o: k, s: 0.9 }, { bg: '#2f7fe0', small: true });
  const d = ((((inset.th - Math.PI) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)) / (Math.PI * 2) * 29.5;
  ov.tag('insetDay', `HARI ${Math.min(29, Math.round(d))}`, { x: INSET.x + s / 2 - 20, y: INSET.y - s / 2 + 10, o: inset.noDay ? 0 : k, s: 0.75 }, { bg: '#ff5c9a', small: true });
}

function frame(t) {
  ov.begin();
  cam.aspect = W / H;
  cam.updateProjectionMatrix();
  const shot = SHOTS.find(([a, b]) => t >= a && t < b) || SHOTS[SHOTS.length - 1];
  inset = null;
  const world = shot[2](t);
  if (world.stars && world.stars.userData.update) world.stars.userData.update(t);
  if (world.sky) {
    world.sky.position.copy(cam.position);
    world.stars.position.copy(cam.position);
  }
  if (world === road) road.clearAround(cam.position, 3);
  renderer.setViewport(0, 0, W, H);
  renderer.render(world.scene, cam);
  if (world === space || world === room) drawInset(t);
  if (world !== outro) ov.vignette(0.25);
  ov.captions(t, CAPTIONS, KEYWORDS);
  ov.end();
}

// Cover / thumbnail (9:16): Affan at the car window, a big half moon with a
// "bite", a title, episode badge and the series logo.
const THUMB = { cam: [-0.3, 1.55, 0.62], look: [-0.92, 1.62, -0.45], fov: 50, dl: [-0.55, 0.32, -0.8] };
window.setThumb = (o) => Object.assign(THUMB, o);
function thumbnail() {
  ov.begin();
  cam.aspect = W / H;
  cam.updateProjectionMatrix();
  const t = 1.0;
  roadMoon(t, THUMB.dl, 260);
  roadCar(t);
  interior(true);
  carAffan(t, { headYaw: 0.75, headPitch: -0.25, lookY: 0.6, lookX: 0.6, wow: 0.8, brow: 0.8, talk: 0 });
  lookCam(carLocal(...THUMB.cam), carLocal(...THUMB.look), THUMB.fov);
  roadPhase(Math.PI / 2);
  road.sky.position.copy(cam.position);
  road.stars.position.copy(cam.position);
  road.clearAround(cam.position, 3);
  renderer.setViewport(0, 0, W, H);
  renderer.render(road.scene, cam);
  const g = ov.g;
  const top = g.createLinearGradient(0, 0, 0, 760);
  top.addColorStop(0, 'rgba(8,12,44,0.8)');
  top.addColorStop(1, 'rgba(8,12,44,0)');
  g.fillStyle = top;
  g.fillRect(0, 0, W, 760);
  const bot = g.createLinearGradient(0, H - 900, 0, H);
  bot.addColorStop(0, 'rgba(8,12,44,0)');
  bot.addColorStop(1, 'rgba(8,12,44,0.8)');
  g.fillStyle = bot;
  g.fillRect(0, H - 900, W, 900);
  ov.vignette(0.3);
  ov.tag('thBadge', 'EPISOD 33', { x: W / 2, y: 300 }, { bg: '#2f7bff', small: true });
  ov.bubble('thTitle', 'SIAPA MAKAN', { x: W / 2, y: 445, r: -3 }, { size: 124 });
  ov.bubble('thTitle2', 'BULAN?', { x: W / 2, y: 590, r: 2 }, { size: 150, top: '#fff6d0', bot: '#ffd84a' });
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
