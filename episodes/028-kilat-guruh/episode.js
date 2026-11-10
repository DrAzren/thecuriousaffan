// THE CURIOUS AFFAN — Episode 028: "Kenapa Kilat Sampai Dulu, Guruh Lambat?"
// Every shot is a pure function of time t (seconds), synced to audio/narration.mp3.
import * as THREE from 'three';
import { makeRenderer, loadEnvelope, toScreen, clamp, lerp, inv, easeOut, easeInOut, keys, wobble, W, H } from '../../shared/core.js';
import { POSES, blinkAt } from '../../shared/affan.js';
import { Overlay, pop, ICONS, drawLogo } from '../../shared/overlay.js';
import { CAPTIONS, KEYWORDS } from './captions.js';
import { buildStormRoad, buildStormToy, buildOutro, carX, CAR_SPEED, strikeGlow, STRIKE_X, AFF_X, CLOUD_Y } from './worlds.js';

const FPS = 30;
const DURATION = 63.2;
const OUTRO = 60.0;

const stage = document.getElementById('stage');
const canvas = document.createElement('canvas');
stage.appendChild(canvas);
const renderer = makeRenderer(canvas);
const ov = new Overlay(stage);
const road = buildStormRoad();
const toy = buildStormToy();
const outro = buildOutro();
const cam = new THREE.PerspectiveCamera(50, W / H, 0.02, 6000);
let env = { at: () => 0 };
let clearR = 3; // props closer than this to the camera are hidden (road world)

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const v1 = new THREE.Vector3();
const talk = (t) => clamp(env.at(t) * 1.2);
const scr = (p) => toScreen(p, cam);
const YELLOW = '#f5b300', BLUE = '#2f9bff', ORANGE = '#ff8a3d', PURPLE = '#8a6cf0';

// Lightning strikes (seconds). Thunder follows later, as in real life.
const ROAD_STRIKES = [0.5, 8.3, 53.9];
const TOY_STRIKES = [16.0, 19.0, 24.0, 38.0];
const glowAt = (t, list) => list.reduce((m, s) => Math.max(m, strikeGlow(t - s)), 0);
// decaying wobble used for thunder shakes
const rumble = (t, t0, dur = 0.9) => (t < t0 || t > t0 + dur ? 0 : (1 - (t - t0) / dur) ** 2);

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
  road.moonLight.position.copy(c.position).add(v1.set(0.3, 0.75, 0.6).multiplyScalar(80));
}
// Put the bolt far away along a car-local direction, as seen at time tRef.
function roadBolt(tRef, dl, dist = 170) {
  road.bolt.position.set(carX(tRef) - dl[0] * dist, 0, 1.6 - dl[2] * dist); // car is rotated 180 degrees
}
const carLocal = (x, y, z) => road.car.localToWorld(V(x, y, z));
function interior(on) {
  road.car.userData.body.visible = !on;
  road.car.userData.interior.visible = on;
  road.fill.intensity = on ? 2.4 : 0;
  road.fill.position.set(-0.1, 1.85, -0.1);
}
function lookCam(pos, look, fov = 50, shake = 0, t = 0) {
  cam.position.copy(pos);
  if (shake > 0) cam.position.add(v1.set(Math.sin(t * 71), Math.sin(t * 89 + 1), 0).multiplyScalar(shake));
  cam.fov = fov;
  cam.updateProjectionMatrix();
  cam.lookAt(look);
  cam.updateMatrixWorld(true);
}
const AFF_HEAD_LOCAL = [-0.92, 1.49, -0.45];
const seatedRest = { armL: { reach: [0.55, 0.32, 0.25] }, armR: { reach: [-0.55, 0.32, 0.25] } };
function carAffan(t, p = {}) {
  road.aff.pose({ ...POSES.seated, ...seatedRest, yaw: Math.PI / 2, blink: blinkAt(t, 1), talk: talk(t), ...p, armL: { ...seatedRest.armL, ...(p.armL || {}) }, armR: { ...seatedRest.armR, ...(p.armR || {}) } });
}
const mix3 = (a, b, k) => a.map((v, i) => lerp(v, b[i], k));

// ---------------------------------------------------------------- toy helpers
const START_L = STRIKE_X + 0.2, START_S = STRIKE_X + 1.2;
const END_L = AFF_X - 0.6, END_S = AFF_X - 1.5;
const LIGHT_Y = 3.1, LIGHT_END_Y = 3.5, LIGHT_END_Z = -1.4;
const lightEnd = (t) => [END_L, LIGHT_END_Y + 0.1 * Math.sin(t * 4), LIGHT_END_Z];
const strikeBase = () => V(STRIKE_X, 0.1, 0);
function toyAffan(t, p = {}) {
  toy.aff.root.position.set(AFF_X, 0, 0);
  toy.aff.pose({ yaw: -Math.PI / 2, blink: blinkAt(t, 2), talk: talk(t), smile: 0.9, ...p });
}
// IK reach target that aims an arm at a world point (side: 1 = left, -1 = right).
function aimArm(world, side, len = 0.9) {
  const tt = toy.aff.toTorso(world);
  const s = [0.6 * side, 0.86, 0];
  const d = v1.set(tt[0] - s[0], tt[1] - s[1], tt[2] - s[2]).normalize();
  return [s[0] + d.x * len, s[1] + d.y * len, s[2] + d.z * len];
}
function toyShadowAt(p) {
  toy.moonLight.target.position.copy(p);
  toy.moonLight.position.copy(p).add(v1.set(-0.3, 0.8, -0.52).multiplyScalar(80));
}
// light: instant dash after a strike; returns its x
function lightRun(t, t0) {
  const k = easeOut(inv(t0 + 0.02, t0 + 0.2, t));
  const x = lerp(START_L, END_L, k);
  const hover = t > t0 + 0.2 ? 0.1 * Math.sin(t * 4) : 0;
  toy.setLight(x, lerp(LIGHT_Y, LIGHT_END_Y, k) + hover, lerp(0, LIGHT_END_Z, k), x - START_L, (1 - inv(t0 + 0.2, t0 + 1.0, t)) * (k > 0 ? 1 : 0));
  return x;
}
// sound: steady slow roll from the strike to Affan between t0 and t1
function soundRun(t, t0, t1) {
  const x = lerp(START_S, END_S, inv(t0, t1, t));
  toy.setSound(x, t, 1 - inv(t1, t1 + 0.35, t));
  return x;
}
const RACE = { pos: [AFF_X + 7.2, 5.6, -2.4], look: [-6, 1.0, 0.2], fov: 50 };
window.setRace = (o) => Object.assign(RACE, o);
const raceCam = (t, push = 0, shake = 0) => lookCam(V(RACE.pos[0] - push * 2, RACE.pos[1] - push * 0.6, RACE.pos[2] + push), V(...RACE.look), RACE.fov, shake, t);
const FRONT = { pos: [AFF_X - 6.5, 3.0, 1.0], look: [AFF_X - 0.3, 2.8, -0.5] };
window.setFront = (o) => Object.assign(FRONT, o);

// --------------------------------------------------------------- overlay bits
function pinTag(id, text, p, t, a, b, style, dy = -90) {
  const q = pop(t, a, b);
  if (q.o <= 0 || !p.visible) return;
  ov.tag(id, text, { x: clamp(p.x, 190, 890), y: clamp(p.y + dy, 300, 1380), o: q.o, s: q.s }, style);
}
function boom(id, t, a, b, { x = W / 2, y = 420, size = 150, text = 'GRUMMM!' } = {}) {
  const q = pop(t, a, b, { fin: 0.3, from: 1.8 });
  if (q.o <= 0) return;
  ov.bubble(id, text, { x: x + Math.sin(t * 60) * 7 * rumble(t, a, 1.0), y: y + Math.sin(t * 47) * 7 * rumble(t, a, 1.0), o: q.o, s: q.s, r: -4 }, { size, top: '#cfeaff', bot: '#3fa2ff' });
}
// strike flash on the 2D layer (cool white)
const skyFlash = (k, a = 0.18) => ov.flash(k * a, '214,226,255');

// ======================================================================= SHOTS
const SHOTS = [
  // S1 — hook: lightning outside the window, Affan turns to Papa and asks
  [0, 6.1, (t) => {
    roadBolt(0.5, [-0.4, 0, -0.92]);
    roadCar(t);
    interior(true);
    const k = glowAt(t, ROAD_STRIKES);
    const turned = t >= 2.3;
    const look = !turned ? keys(t, [[0, 0.42], [1.9, 0.5]]) : keys(t, [[2.3, 1.05], [2.65, -0.75], [4.9, -0.75], [5.5, 0.6]], easeOut);
    const pt = keys(t, [[2.6, 0], [3.0, 1], [5.7, 1], [6.05, 0]]);
    const rest = seatedRest.armL.reach;
    carAffan(t, {
      headYaw: look, headPitch: turned ? -0.05 : -0.22, lookY: turned ? 0.1 : 0.55, lookX: turned ? 0 : 0.85,
      wow: keys(t, [[0.5, 0], [0.62, 1], [1.5, 1], [1.9, 0]]), brow: turned ? 0.8 : 0.3 + 0.7 * inv(0.5, 0.7, t), smile: 0.9,
      blink: t > 0.45 && t < 1.6 ? 0 : blinkAt(t, 1),
      armL: { reach: mix3(rest, [0.95, 1.25, 0.55], pt), point: pt, pole: [1, -1, -0.8] },
    });
    const cp = keys(t, [[0, [-0.12, 1.54, 0.74]], [6.1, [-0.32, 1.52, 0.58]]], (x) => x);
    lookCam(carLocal(...cp), carLocal(-0.95, 1.5, -0.5), 50);
    skyFlash(k);
    const p = pop(t, 0.9, 5.95, { fin: 0.45 });
    ov.bubble('hook', 'KENAPA GURUH\nLAMBAT?', { x: W / 2, y: 410 + Math.sin(t * 3) * 6, o: p.o, s: p.s }, { size: 104 });
    const q = pop(t, 1.2, 5.95);
    ov.tag('ep', 'EPISOD 28', { x: W / 2, y: 268, o: q.o, s: q.s }, { bg: '#2f7bff', small: true });
    return road;
  }],
  // S2a — outside: the bolt strikes first...
  [6.1, 9.7, (t) => {
    roadBolt(8.3, [0.1, 0, -1], 175);
    roadCar(t);
    interior(false);
    carAffan(t, { headYaw: 1.2, headPitch: -0.3, lookY: 0.4 });
    const cx = carX(t);
    lookCam(V(cx + 1.2, 1.7, -9.5), V(cx - 0.3, 4.3, 0), 50);
    clearR = 7;
    const k = glowAt(t, ROAD_STRIKES);
    skyFlash(k);
    const m = scr(v1.copy(road.bolt.position).setY(80));
    pinTag('kilatTag', 'KILAT!', m, t, 8.3, 9.65, { bg: YELLOW, pointer: 'down' }, -110);
    return road;
  }],
  // S2b — ...and only later Affan hears the thunder
  [9.7, 12.6, (t) => {
    roadBolt(8.3, [0.1, 0, -1], 175);
    roadCar(t);
    interior(true);
    const ear = keys(t, [[9.8, 0], [10.2, 1], [11.45, 1], [11.7, 0]]);
    const boomK = rumble(t, 11.45, 1.0);
    carAffan(t, {
      headYaw: -0.12, headRoll: 0.16 * ear, lookX: 0.6 * ear, lookY: 0.3 * ear, brow: 0.5 + 0.5 * boomK, smile: 0.7,
      wow: keys(t, [[11.45, 0], [11.6, 1], [12.25, 1], [12.5, 0]]), bob: 0.03 * boomK * Math.sin(t * 50),
      armL: { reach: mix3(seatedRest.armL.reach, [0.95, 1.7, 0.15], ear), pole: [1, -0.4, -0.6] },
    });
    const kk = easeInOut(inv(9.7, 12.6, t));
    lookCam(carLocal(lerp(0.34, 0.2, kk), 1.56, lerp(-0.25, -0.32, kk)), carLocal(...AFF_HEAD_LOCAL), 48, 0.012 * boomK, t);
    for (let i = 0; i < 3; i++) {
      const d = pop(t, 10.0 + i * 0.42, 11.4);
      ov.dot(W / 2 - 90 + i * 90, 420, 20 * d.s, '#8fd8ff', d.o);
    }
    boom('boom1', t, 11.45, 12.55);
    return road;
  }],
  // S2c — "Jom ikut Affan cari jawapan!" + magic sparkle swirl
  [12.6, 14.9, (t) => {
    roadBolt(8.3, [0.1, 0, -1], 175);
    roadCar(t);
    interior(true);
    const up = keys(t, [[12.75, 0], [13.0, 1], [14.3, 1], [14.6, 0.6]], easeOut);
    carAffan(t, {
      headYaw: -0.12, smile: 1, brow: 0.6, lookX: 0.05,
      armR: { reach: [lerp(-0.55, -0.6, up), lerp(0.32, 1.95 + 0.06 * Math.sin(t * 14), up), lerp(0.25, 0.35, up)], pole: [-1, -0.3, -0.5] },
    });
    const k = easeInOut(inv(12.6, 14.9, t));
    lookCam(carLocal(lerp(0.3, 0.05, k), 1.56, lerp(-0.25, -0.38, k)), carLocal(...AFF_HEAD_LOCAL), 48);
    ov.swirl(t, W / 2, 820, inv(13.5, 14.8, t));
    ov.flash(inv(14.5, 14.9, t) ** 2);
    return road;
  }],
  // S3 — imagination world: lightning and thunder are born at the same moment
  [14.9, 18.8, (t) => {
    const open = keys(t, [[14.9, 0], [15.3, 1], [15.75, 1], [16.1, 0]]);
    const pt = keys(t, [[15.8, 0], [16.15, 1], [18.8, 1]]);
    toyAffan(t);
    const aim = aimArm(V(STRIKE_X, CLOUD_Y - 1.5, 0), -1);
    toyAffan(t, {
      smile: 1, brow: 0.6, wow: keys(t, [[16.0, 0], [16.12, 0.9], [16.7, 0.9], [17.0, 0]]), headPitch: -0.12, lookY: 0.2,
      armL: { reach: [lerp(0.55, 1.05, open), lerp(0.25, 1.55, open), lerp(0.1, 0.35, open)], pole: [1, -0.6, -0.4] },
      armR: pt > 0 ? { reach: mix3([-0.55, 0.25, 0.1], aim, pt), point: pt, pole: [-1, -0.5, -0.5] } : { reach: [lerp(-0.55, -1.05, open), lerp(0.25, 1.55, open), lerp(0.1, 0.35, open)], pole: [-1, -0.6, -0.4] },
    });
    const k = easeOut(inv(14.9, 17.4, t));
    lookCam(V(lerp(RACE.pos[0] + 5, RACE.pos[0], k), lerp(RACE.pos[1] + 3.5, RACE.pos[1], k), lerp(RACE.pos[2] - 3, RACE.pos[2], k)), V(...RACE.look), RACE.fov);
    toyShadowAt(V(AFF_X, 0, 0));
    ov.flash(1 - inv(14.9, 15.3, t));
    ov.sparkles(t, { n: 26, seed: 3, y: 250, h: 1000, a: 0.8 * (1 - inv(16.5, 17.5, t)) });
    const b = scr(V(STRIKE_X, CLOUD_Y - 3, 0));
    const a1 = pop(t, 15.26, 18.75), a2 = pop(t, 16.02, 18.75);
    ov.tag('s3k', 'KILAT', { x: clamp(b.x - 150, 180, 900), y: b.y - 40, o: a1.o, s: a1.s }, { bg: YELLOW });
    ov.tag('s3g', 'GURUH', { x: clamp(b.x + 170, 180, 900), y: b.y + 70, o: a2.o, s: a2.s }, { bg: BLUE });
    const s = pop(t, 17.7, 18.75, { from: 2 });
    ov.bubble('serentak', 'SERENTAK!', { x: W / 2, y: 420, o: s.o, s: s.s, r: -3 }, { size: 140, top: '#d6ffd0', bot: '#39c46a' });
    return toy;
  }],
  // S4 — at the strike: lightning is light, thunder is sound (the two racers)
  [18.8, 23.3, (t) => {
    toyAffan(t, {});
    const la = pop(t, 19.68, 99, { fin: 0.4 }), sa = pop(t, 21.08, 99, { fin: 0.4 });
    toy.setLight(START_L, LIGHT_Y + 0.12 * Math.sin(t * 4), 0, 0, 0, la.o > 0 ? la.s : 0);
    toy.setSound(START_S + 0.6, t, sa.o);
    const k = easeInOut(inv(18.8, 23.3, t));
    lookCam(V(STRIKE_X + lerp(9.5, 8.2, k), 3.3, lerp(-8.5, -7.2, k)), V(STRIKE_X + 1.2, 2.5, 0), 50, 0.04 * rumble(t, 21.08, 0.7), t);
    toyShadowAt(V(STRIKE_X, 0, 0));
    const lp = scr(V(START_L, LIGHT_Y, 0)), sp = scr(V(START_S + 0.6, 1.5, 0));
    const t1 = pop(t, 20.04, 23.25), t2 = pop(t, 22.42, 23.25);
    ov.tag('s4c', 'KILAT = CAHAYA', { x: clamp(lp.x, 250, 830), y: 420, o: t1.o, s: t1.s }, { bg: YELLOW, small: true });
    ov.tag('s4b', 'GURUH = BUNYI', { x: clamp(sp.x + 40, 250, 830), y: 1250, o: t2.o, s: t2.s }, { bg: BLUE, small: true });
    return toy;
  }],
  // S5a — the race starts: light is there in the blink of an eye
  [23.3, 25.9, (t) => {
    const hit = keys(t, [[24.18, 0], [24.32, 1], [25.0, 1], [25.4, 0]]);
    toyAffan(t, {
      wow: hit, brow: hit, headPitch: -0.1,
      armL: { reach: [lerp(0.55, 0.95, hit), lerp(0.25, 1.5, hit), lerp(0.1, 0.4, hit)], pole: [1, -0.6, -0.4] },
      armR: { reach: [lerp(-0.55, -0.95, hit), lerp(0.25, 1.5, hit), lerp(0.1, 0.4, hit)], pole: [-1, -0.6, -0.4] },
    });
    if (t < 24.0) {
      toy.setLight(START_L, LIGHT_Y + 0.12 * Math.sin(t * 4));
      toy.setSound(START_S, t, 1);
    } else {
      lightRun(t, 24.0);
      soundRun(t, 24.0, 32.9);
    }
    raceCam(t, 0, 0.05 * rumble(t, 24.0, 0.35));
    toyShadowAt(V(AFF_X, 0, 0));
    const a = scr(V(START_L, LIGHT_Y, 0)), b = scr(V(END_L, LIGHT_END_Y, LIGHT_END_Z));
    const dash = inv(24.02, 24.2, t) * (1 - inv(24.25, 24.9, t));
    if (dash > 0) ov.line(a.x, a.y, b.x, b.y, { color: '#ffe45c', w: 16, a: dash * 0.85 });
    const go = pop(t, 23.4, 24.0);
    ov.tag('go', 'SEDIA...', { x: W / 2, y: 420, o: go.o, s: go.s }, { bg: PURPLE });
    const q = pop(t, 25.1, 25.85, { from: 2 });
    ov.bubble('laju', 'LAJU!', { x: W / 2, y: 420, o: q.o, s: q.s, r: -4 }, { size: 170, top: '#fff3a0', bot: '#ffb21f' });
    pinTag('s5c', 'CAHAYA', scr(V(END_L, LIGHT_END_Y, LIGHT_END_Z)), t, 24.25, 25.85, { bg: YELLOW, small: true, pointer: 'down' }, -110);
    return toy;
  }],
  // S5b — light has arrived; Affan greets it
  [25.9, 27.8, (t) => {
    toyAffan(t, { smile: 1, brow: 0.6, headYaw: -0.3, lookX: -0.5, lookY: 0.1, armR: POSES.waveR(t).armR });
    toy.setLight(...lightEnd(t));
    soundRun(t, 24.0, 32.9);
    const k = easeOut(inv(25.9, 27.8, t));
    lookCam(V(FRONT.pos[0] - 1.2 + 0.5 * k, FRONT.pos[1], FRONT.pos[2] + 1.2), V(FRONT.look[0] - 0.6, FRONT.look[1], FRONT.look[2]), 50);
    toyShadowAt(V(AFF_X, 0, 0));
    const q = pop(t, 26.56, 27.75, { from: 2 });
    ov.bubble('sampai', 'DAH SAMPAI!', { x: W / 2, y: 420, o: q.o, s: q.s, r: -3 }, { size: 120, top: '#fff3a0', bot: '#ffb21f' });
    ov.sparkles(t, { n: 14, seed: 8, x: 60, y: 620, w: 520, h: 520, a: 0.7, size: 24 });
    return toy;
  }],
  // S6a — sound is still on its way, rolling along slowly
  [27.8, 31.0, (t) => {
    toyAffan(t, {});
    toy.setLight(...lightEnd(t));
    const xs = soundRun(t, 24.0, 32.9);
    lookCam(V(xs + 7.2, 2.5, -6.2), V(xs + 0.8, 1.35, 0), 50);
    toyShadowAt(V(xs, 0, 0));
    const p = scr(V(xs, 2.3, 0));
    pinTag('s6b', 'BUNYI', p, t, 28.54, 30.95, { bg: BLUE, pointer: 'down' }, -80);
    const q = pop(t, 30.2, 30.95);
    ov.bubble('perlahan', 'PERLAHAN...', { x: W / 2, y: 420, o: q.o, s: q.s }, { size: 120, top: '#e6dcff', bot: '#8a6cf0' });
    return toy;
  }],
  // S6b — the thunder finally reaches Affan: late!
  [31.0, 33.7, (t) => {
    const b = rumble(t, 32.9, 0.8);
    toyAffan(t, {
      smile: 0.8, headYaw: -0.2, lookX: -0.4 * (1 - inv(32.8, 33.0, t)), brow: 0.4 + 0.6 * b,
      wow: keys(t, [[32.9, 0], [33.02, 1], [33.5, 1], [33.7, 0.3]]), bob: 0.06 * b * Math.abs(Math.sin(t * 30)), tilt: 0.05 * b * Math.sin(t * 40),
    });
    toy.setLight(...lightEnd(t));
    soundRun(t, 24.0, 32.9);
    lookCam(V(AFF_X - 6, 3.3, 4.5), V(AFF_X - 1.2, 2.2, 0), 50, 0.05 * b, t);
    toyShadowAt(V(AFF_X, 0, 0));
    const w = pop(t, 31.1, 32.85);
    ov.tag('tunggu', 'BARU NAK SAMPAI...', { x: W / 2, y: 420, o: w.o, s: w.s }, { bg: PURPLE, small: true });
    boom('boom2', t, 32.9, 33.65);
    return toy;
  }],
  // S7a — how far away was the lightning?
  [33.7, 37.9, (t) => {
    const tk = keys(t, [[33.8, 0], [34.2, 1], [37.9, 1]]);
    const th = POSES.thinkR.armR;
    toyAffan(t, { headRoll: -0.1 * tk, lookY: 0.3 * tk, brow: 0.5, armR: { reach: mix3([-0.55, 0.25, 0.1], th.reach, tk), pole: th.pole, point: tk, wx: th.wx * tk } });
    const k = easeInOut(inv(33.7, 37.9, t));
    lookCam(V(lerp(17, 15.5, k), lerp(13.5, 12.5, k), -11), V(-10.5, 0, 0.5), 50);
    toyShadowAt(V(AFF_X, 0, 0));
    const a = scr(strikeBase()), b = scr(V(AFF_X - 1.2, 0.1, 0));
    const la = inv(34.4, 35.0, t), e = easeOut(la);
    if (la > 0) {
      ov.dashed(a.x, a.y, lerp(a.x, b.x, e), lerp(a.y, b.y, e), t, { color: '#ffd84a', w: 12, a: la });
      ov.dot(a.x, a.y, 13, YELLOW, la);
      ov.dot(b.x, b.y, 13, ORANGE, inv(34.9, 35.1, t));
    }
    const q = pop(t, 34.96, 37.0);
    ov.bubble('jauhmana', 'JAUH MANA?', { x: W / 2, y: 420, o: q.o, s: q.s, r: -2 }, { size: 120 });
    ov.html('jq', ICONS.qmark('#ffcf33'), { x: (a.x + b.x) / 2 + 130, y: (a.y + b.y) / 2 - 40 + Math.sin(t * 3) * 8, o: q.o, s: q.s * 0.8, r: 12 });
    const kq = pop(t, 37.5, 37.88, { from: 2 });
    ov.bubble('kira', 'KIRA!', { x: W / 2, y: 420, o: kq.o, s: kq.s }, { size: 160, top: '#fff3a0', bot: '#ffb21f' });
    return toy;
  }],
  // S7b — count: one, two, three! (lightning seen at 38.0, thunder lands on "tiga")
  [37.9, 41.1, (t) => {
    const cnt = [38.42, 39.52, 40.48];
    const n = cnt.filter((c) => t >= c).length;
    const beat = n ? Math.sin(clamp((t - cnt[n - 1]) / 0.3) * Math.PI) : 0;
    const b = rumble(t, 40.95, 0.6);
    toyAffan(t, {
      brow: 0.6, smile: 1, bob: 0.05 * beat + 0.04 * b * Math.abs(Math.sin(t * 30)),
      armR: { reach: [-0.75, 1.5 + 0.18 * beat, 0.4], point: 1, pole: [-1, -0.6, -0.3] },
    });
    if (t < 38.0) {
      toy.setLight(START_L, LIGHT_Y);
      toy.setSound(START_S, t, 1);
    } else {
      lightRun(t, 38.0);
      soundRun(t, 38.0, 40.95);
    }
    raceCam(t, 0, 0.05 * rumble(t, 38.0, 0.35) + 0.05 * b);
    toyShadowAt(V(AFF_X, 0, 0));
    const a = scr(V(START_L, LIGHT_Y, 0)), e = scr(V(END_L, LIGHT_END_Y, LIGHT_END_Z));
    const dash = inv(38.02, 38.2, t) * (1 - inv(38.25, 38.9, t));
    if (dash > 0) ov.line(a.x, a.y, e.x, e.y, { color: '#ffe45c', w: 16, a: dash * 0.85 });
    cnt.forEach((c, i) => {
      const q = pop(t, c, i < 2 ? cnt[i + 1] - 0.05 : 41.05, { fin: 0.3, from: 2.2 });
      ov.bubble('n' + i, String(i + 1), { x: W / 2, y: 430, o: q.o, s: q.s }, { size: 300, top: '#fff3a0', bot: '#ffb21f', width: 500 });
    });
    return toy;
  }],
  // S7c — three seconds is about one kilometre
  [41.1, 45.2, (t) => {
    toyAffan(t, { smile: 1, brow: 0.4 });
    toy.setLight(...lightEnd(t));
    raceCam(t, easeInOut(inv(41.1, 45.2, t)) * 0.6);
    toyShadowAt(V(AFF_X, 0, 0));
    const a = scr(strikeBase()), b = scr(V(AFF_X - 3.2, 0.1, 0));
    const s3 = pop(t, 41.32, 45.15);
    ov.tag('saat', '3 SAAT', { x: W / 2, y: 330, o: s3.o, s: s3.s }, { bg: PURPLE });
    const r = pop(t, 42.14, 45.15);
    const len = Math.hypot(b.x - a.x, b.y - a.y), ang = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
    ov.html('ruler', ICONS.ruler(), { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, o: r.o, s: (r.s * len) / 740, r: ang });
    const lk = pop(t, 42.84, 45.15);
    ov.tag('lk', 'LEBIH KURANG', { x: W / 2, y: 450, o: lk.o, s: lk.s }, { bg: ORANGE, small: true });
    const km = pop(t, 43.74, 45.15, { fin: 0.4, from: 2.2 });
    ov.bubble('km', '1 KM', { x: W / 2, y: 610, o: km.o, s: km.s }, { size: 200 });
    return toy;
  }],
  // S8 — safety: stay indoors when there is lightning
  [45.2, 49.4, (t) => {
    const wag = keys(t, [[46.4, 0], [46.75, 1], [49.1, 1], [49.4, 0]]);
    const w = POSES.wagR(t).armR;
    toyAffan(t, {
      smile: 0.6, brow: 0.5, headYaw: wag * 0.14 * Math.sin(t * 8), headRoll: -0.05,
      armR: wag > 0 ? { reach: mix3([-0.55, 0.25, 0.1], w.reach, wag), pole: w.pole, point: wag, wz: w.wz * wag } : {},
    });
    toy.setLight(...lightEnd(t), 0, 0, 1 - inv(45.2, 45.6, t));
    const k = easeInOut(inv(45.2, 46.6, t));
    lookCam(V(lerp(FRONT.pos[0] - 1, FRONT.pos[0] + 0.6, k), FRONT.pos[1], lerp(FRONT.pos[2], FRONT.pos[2] - 1.2, k)), V(...FRONT.look), 50);
    toyShadowAt(V(AFF_X, 0, 0));
    const i = pop(t, 45.74, 47.8);
    ov.tag('ingat', 'INGAT!', { x: W / 2, y: 400, o: i.o, s: i.s }, { bg: '#ff4d5e' });
    const q = pop(t, 47.84, 49.35);
    ov.bubble('jangan', 'JANGAN MAIN\nKAT LUAR!', { x: W / 2 - 30, y: 420, o: q.o, s: q.s }, { size: 104 });
    const x = pop(t, 48.04, 49.35, { from: 2 });
    ov.html('cross', ICONS.cross(), { x: 930, y: 290, o: x.o, s: x.s * 0.5 });
    return toy;
  }],
  // S9 — the "aha" moment: light is faster than sound
  [49.4, 53.4, (t) => {
    const jump = t > 49.68 && t < 50.25 ? Math.sin(((t - 49.68) / 0.57) * Math.PI) * 0.45 : 0;
    const up = keys(t, [[49.6, 0], [49.8, 1], [50.35, 1], [50.65, 0]]);
    const idx = keys(t, [[50.6, 0], [50.9, 1], [53.4, 1]]);
    toyAffan(t, {
      blink: t > 49.6 && t < 50.5 ? 0 : blinkAt(t, 6), bob: jump, smile: 1,
      wow: keys(t, [[49.6, 0], [49.75, 1], [50.45, 1], [50.7, 0]]), brow: keys(t, [[49.6, 0], [49.75, 1], [52, 0.5]]),
      legL: { x: -0.25 * jump, knee: 0.6 * jump }, legR: { x: -0.25 * jump, knee: 0.6 * jump },
      armL: { reach: [lerp(0.55, 0.85, up), lerp(0.25, 1.85, up), lerp(0.1, 0.3, up)], pole: [1, -0.4, -0.5] },
      armR: idx > 0.01 ? { reach: [lerp(-0.85, -0.5, idx), lerp(1.85, 1.6, idx), lerp(0.3, 0.45, idx)], point: idx, pole: [-1, -0.8, -0.3] } : { reach: [lerp(-0.55, -0.85, up), lerp(0.25, 1.85, up), lerp(0.1, 0.3, up)], pole: [-1, -0.4, -0.5] },
    });
    const k = easeOut(inv(49.4, 53.4, t));
    lookCam(V(FRONT.pos[0] + 0.6 + 0.7 * k, FRONT.pos[1] - 0.1, FRONT.pos[2] - 1.2 - 0.3 * k), V(...FRONT.look), 50);
    toyShadowAt(V(AFF_X, 0, 0));
    const head = scr(V(AFF_X, 4.4 + jump, 0));
    const b = pop(t, 49.8, 53.35);
    ov.html('bulb', ICONS.bulb(), { x: clamp(head.x + 250, 150, 900), y: head.y - 60 + Math.sin(t * 5) * 8, o: b.o, s: b.s * 0.75, r: 10 });
    const j = pop(t, 51.26, 53.35, { fin: 0.4, from: 2.2 });
    ov.bubble('aha', 'CAHAYA\nLEBIH LAJU!', { x: W / 2 - 60, y: 420, o: j.o, s: j.s, r: -2 }, { size: 116 });
    ov.sparkles(t, { n: 30, seed: 12, y: 250, h: 900, a: inv(49.7, 50.1, t) });
    return toy;
  }],
  // S10 — back in the car: thumbs-up, then "what next?" (a far flash, thunder 3 s later)
  [53.4, OUTRO, (t) => {
    roadBolt(53.9, [-1, 0, -0.33]);
    roadCar(t);
    interior(true);
    const th = keys(t, [[55.1, 0], [55.45, 1], [57.5, 1], [57.8, 0]]);
    const tk = keys(t, [[57.8, 0], [58.2, 1], [OUTRO, 1]]);
    const up = POSES.thumbsUpR.armR, th2 = POSES.thinkR.armR;
    const rest = seatedRest.armR.reach;
    let armR = {};
    if (th > 0) armR = { reach: mix3(rest, up.reach, th), pole: up.pole, thumb: th, wy: up.wy * th, wx: up.wx * th };
    else if (tk > 0) armR = { reach: mix3(rest, th2.reach, tk), pole: th2.pole, point: tk, wx: th2.wx * tk };
    carAffan(t, {
      headYaw: -0.12 + 0.05 * wobble(t, 2), smile: 1, brow: t < 54.4 ? 0.8 : 0.3 + 0.4 * tk,
      headRoll: -0.12 * tk, lookX: 0.35 * tk, lookY: 0.4 * tk, headPitch: -0.08 * tk,
      armR,
    });
    const k = easeInOut(inv(53.4, OUTRO, t));
    lookCam(carLocal(lerp(0.42, 0.24, k), 1.55, lerp(-0.22, -0.36, k)), carLocal(-0.92, 1.42, -0.45), 50, 0.006 * rumble(t, 56.9, 1.2), t);
    ov.flash((1 - inv(53.4, 53.7, t)) * 0.9, '20,40,120');
    skyFlash(glowAt(t, ROAD_STRIKES), 0.2);
    if (th > 0.5) {
      const hand = scr(road.aff.parts.arms.R.hand.getWorldPosition(V(0, 0, 0)));
      ov.sparkles(t, { n: 12, seed: 33, x: hand.x - 160, y: hand.y - 200, w: 320, h: 300, a: inv(55.3, 55.7, t) * (1 - inv(57.3, 57.7, t)), size: 30 });
    }
    const head = scr(carLocal(...AFF_HEAD_LOCAL));
    [[58.0, -260, -230, '#ffcf33', -12], [58.3, 250, -280, '#3fa2ff', 10], [58.6, 300, -60, '#ffcf33', 14]].forEach(([a, dx, dy, c, r], i) => {
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
  for (const w of [road, toy]) w.stars.userData.update(t);
  toy.sparkles.userData.update(t);
  road.flash(glowAt(t, ROAD_STRIKES));
  toy.flash(glowAt(t, TOY_STRIKES));
  toy.setLight(0, 0, 0, 0, 0, 0);
  toy.setSound(0, t, 0);
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
  if (world !== outro) ov.vignette(0.32);
  ov.captions(t, CAPTIONS, KEYWORDS);
  ov.end();
}

// Cover / thumbnail (9:16): Affan amazed in the car, pointing at the lightning,
// with a big title, episode badge and the series logo. Key elements stay
// inside the centre 3:4 area (y 240-1680) that profile grids show.
const THUMB = { bolt: [-0.42, 0, -0.9], cam: [-0.2, 1.5, 0.72], look: [-0.95, 1.62, -0.5], fov: 50, glow: 0.55 };
window.setThumb = (o) => Object.assign(THUMB, o);
function thumbnail() {
  ov.begin();
  cam.aspect = W / H;
  cam.updateProjectionMatrix();
  const t = 3.6;
  road.stars.userData.update(t);
  roadBolt(t, THUMB.bolt);
  roadCar(t);
  interior(true);
  road.flash(THUMB.glow);
  road.bolt.userData.set(1);
  carAffan(t, {
    headYaw: -0.7, headPitch: -0.05, blink: 0, talk: 0, wow: 0.85, brow: 1, lookX: -0.1, lookY: 0.1,
    armL: { reach: [0.95, 1.3, 0.55], point: 1, pole: [1, -1, -0.8] },
  });
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
  ov.tag('thBadge', 'EPISOD 28', { x: W / 2, y: 300 }, { bg: '#2f7bff', small: true });
  ov.bubble('thTitle', 'KENAPA GURUH\nLAMBAT?', { x: W / 2, y: 475, r: -2 }, { size: 118 });
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
