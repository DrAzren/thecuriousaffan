// THE CURIOUS AFFAN — Episode 035: "Kenapa Semut Jalan Berbaris?"
// Every shot is a pure function of time t (seconds), synced to audio/narration.mp3.
import * as THREE from 'three';
import { makeRenderer, loadEnvelope, toScreen, clamp, lerp, inv, easeOut, easeIn, easeInOut, keys, wobble, rng, W, H } from '../../shared/core.js';
import { POSES, blinkAt } from '../../shared/affan.js';
import { Overlay, pop, ICONS, drawLogo } from '../../shared/overlay.js';
import { CAPTIONS, KEYWORDS } from './captions.js';
import { buildRoom, buildAntWorld, buildOutro, A_ROOM, BISCUIT, CRACK, N_ROOM_ANTS, ROOM_ANT_SCALE, NEST, FOOD, N_WORLD_ANTS, WORLD_ANT_SCALE, MINI } from './worlds.js';

const FPS = 30;
const DURATION = 69.45;
const OUTRO = 66.3;

const stage = document.getElementById('stage');
const canvas = document.createElement('canvas');
stage.appendChild(canvas);
const renderer = makeRenderer(canvas);
const ov = new Overlay(stage);
const room = buildRoom();
const world = buildAntWorld();
const outro = buildOutro();
const cam = new THREE.PerspectiveCamera(50, W / H, 0.02, 6000);
let env = { at: () => 0 };

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const UP = V(0, 1, 0);
const talk = (t) => clamp(env.at(t) * 1.2);
const scr = (p) => toScreen(p, cam);
const mix3 = (a, b, k) => a.map((v, i) => lerp(v, b[i], k));
const BLUE = '#2f9bff', YELLOW = '#e0b400', ORANGE = '#ff8a3d', PURPLE = '#7a5cf0', GREEN = '#2fbf5f', PINK = '#ff5c9a';
const frac = (x) => x - Math.floor(x);

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
  ov.tag(id, text, { x: clamp(p.x, 260, 820), y: clamp(p.y + dy, 300, 1380), o: q.o, s: q.s }, style);
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

// ------------------------------------------------------------- ants on paths
const _p = V(), _tg = V(), _n = V(), _look = V();
// u in [0,1] along the curve; dir +1 = towards the food, -1 = towards the nest
function antOn(ant, curve, u, dir, lateral, phase, t, opts = {}) {
  u = clamp(u, 0, 1);
  curve.getPointAt(u, _p);
  curve.getTangentAt(u, _tg);
  _n.crossVectors(UP, _tg).normalize();
  ant.position.copy(_p).addScaledVector(_n, lateral);
  ant.position.y = 0.02;
  _look.copy(ant.position).addScaledVector(_tg, dir);
  ant.lookAt(_look);
  ant.userData.update(phase, t, opts);
  ant.visible = true;
}

// ---------------------------------------------------------------- the room
const roomLen = room.path.getLength();
const ROOM_SPEED = 0.2; // units per second
const ANT_STEP_ROOM = 0.035;
// lid closed at this time; after it the ants turn for home and wander off
const LID = 60.95;
function roomAnts(t, { leave = LID } = {}) {
  room.ants.forEach((a, i) => {
    const out = i % 2 === 0;
    const off = (i / N_ROOM_ANTS) * 2;
    let u = frac(off * 0.5 + (out ? 1 : -1) * (ROOM_SPEED * t) / roomLen);
    let dir = out ? 1 : -1;
    let lat = (out ? 1 : -1) * 0.035 + 0.008 * Math.sin(t * 3 + i);
    if (t > leave) {
      // everybody heads home, spreading out a little
      const dt = t - leave;
      const u0 = frac(off * 0.5 + (out ? 1 : -1) * (ROOM_SPEED * leave) / roomLen);
      u = u0 - (ROOM_SPEED * 1.3 * dt) / roomLen;
      dir = -1;
      lat += (rng(i + 7)() - 0.5) * 0.35 * clamp(dt / 2);
      if (u <= 0.002) {
        a.visible = false;
        return;
      }
    }
    const dist = u * roomLen;
    antOn(a, room.path, u, dir, lat, (dist / ANT_STEP_ROOM) * Math.PI * dir, t, { carrying: dir < 0 && t <= leave, seed: i });
  });
}
const squatLegs = { legL: { x: -1.1, knee: 2.0 }, legR: { x: -1.1, knee: 2.0 } };
const ROOM_YAW = Math.atan2(-1.3, 1.1);
function roomAff(t, p = {}, magOn = 1) {
  const a = room.aff;
  a.root.position.copy(A_ROOM).add(V(0, -0.38 * (p.scale ?? 1), 0));
  a.root.scale.setScalar(p.scale ?? 1);
  const base = { yaw: ROOM_YAW, lean: 0.25, blink: blinkAt(t, 1), talk: talk(t), smile: 0.9, ...squatLegs, armL: { reach: [0.55, 0.4, 0.5], pole: [1, -0.6, -0.3] }, headPitch: 0.35, lookY: -0.3 };
  const q = { ...base, ...p };
  delete q.scale;
  a.pose(q);
  a.root.updateMatrixWorld(true);
  room.mag.visible = magOn > 0.01;
  if (magOn > 0.01) {
    const fwd = V(Math.sin(ROOM_YAW), 0, Math.cos(ROOM_YAW));
    const right = V(-fwd.z, 0, fwd.x).multiplyScalar(-1);
    const target = A_ROOM.clone().addScaledVector(fwd, 0.85).addScaledVector(right, 0.15).add(V(0, 0.85, 0));
    a.pose({ ...q, armR: { reach: a.toTorso(target), pole: [-1, -0.6, -0.3] } });
    a.root.updateMatrixWorld(true);
    const hand = a.parts.arms.R.hand.getWorldPosition(V());
    room.mag.position.copy(hand).add(V(0, 0.28, 0)).addScaledVector(fwd, 0.18);
    room.mag.lookAt(room.mag.position.clone().addScaledVector(fwd, 0.5).add(V(0, -1, 0)));
    room.mag.scale.setScalar(magOn);
  }
}
function roomReset(t) {
  room.trail.set(0, 0, t);
  room.jar.visible = false;
  room.biscuit.visible = true;
  room.biscuit.position.copy(BISCUIT);
  room.biscuit.scale.setScalar(1);
  room.crumbs.forEach((c) => (c.visible = true));
  room.aff.root.visible = true;
}

// ------------------------------------------------------------ the ant world
const TL = world.trailCurve.getLength();
const SL = world.searchCurve.getLength();
const ANT_STEP = 0.32;
const A_MINI = V(-1.6, 0, -1.9); // tiny Affan's spot beside the trail
// scout: search out, then come home along the trail laying scent
const SCOUT_OUT = [12.9, 19.4];
const SCOUT_HOME = [21.7, 26.6];
function scout(t) {
  const a = world.ants[0];
  if (t < SCOUT_OUT[0]) {
    a.visible = false;
    return null;
  }
  if (t < SCOUT_HOME[0]) {
    const u = keys(t, [[SCOUT_OUT[0], 0], [16.4, 0.42], [17.4, 0.5], [SCOUT_OUT[1], 1]], (k) => easeInOut(k) * 0.3 + k * 0.7);
    const pause = t > 19.4;
    antOn(a, world.searchCurve, u, 1, 0, (u * SL) / ANT_STEP * Math.PI, t, { walk: pause ? 0 : 1, sniff: t > 19.5 ? 0.6 : 0.15, carrying: t > 20.6, seed: 1 });
    if (pause) {
      // turn round to face the crumb, then pick a piece up
      a.lookAt(FOOD.clone().setY(0.02));
    }
    return { u: 0, home: false };
  }
  if (t < SCOUT_HOME[1] + 0.6) {
    const u = 1 - easeInOut(inv(SCOUT_HOME[0], SCOUT_HOME[1], t));
    antOn(a, world.trailCurve, u, -1, -0.15, ((1 - u) * TL) / ANT_STEP * Math.PI, t, { carrying: true, walk: t < SCOUT_HOME[1] ? 1 : 0, seed: 1 });
    return { u, home: true };
  }
  a.visible = false;
  return { u: 0, home: true };
}
// followers: ant k leaves the nest at FOLLOW0 + k*GAP and shuttles nest<->food
const FOLLOW0 = 28.6, GAP = 0.62, LOOP = 7.5; // seconds for one way
const EMPTY = 48.6; // food is gone
const FADE = [49.6, 52.6]; // scent fades
const SCATTER = 52.4;
function followerState(k, t) {
  const t0 = FOLLOW0 + k * GAP;
  if (t < t0) return null;
  const p = (t - t0) / LOOP;
  const q = p % 2;
  return q < 1 ? { u: easeInOut(q) * 0.15 + q * 0.85, dir: 1, carrying: false } : { u: 1 - (q - 1), dir: -1, carrying: t - t0 > LOOP && t < EMPTY + 1.5 };
}
function followers(t, { count = N_WORLD_ANTS - 1 } = {}) {
  for (let k = 1; k < N_WORLD_ANTS; k++) {
    const a = world.ants[k];
    if (k > count) {
      a.visible = false;
      continue;
    }
    const tt = Math.min(t, SCATTER);
    const s = followerState(k, tt);
    if (!s) {
      a.visible = false;
      continue;
    }
    const lat = s.dir > 0 ? 0.42 : -0.42;
    const ph = ((t - FOLLOW0 - k * GAP) * TL) / LOOP / ANT_STEP * Math.PI;
    antOn(a, world.trailCurve, s.u, s.dir, lat + 0.05 * Math.sin(t * 2 + k), ph, t, { carrying: s.carrying, sniff: 0.35, seed: k });
    if (t > SCATTER) {
      // wander off in its own direction
      const R = rng(k * 13 + 5);
      const ang = R() * Math.PI * 2;
      const d = V(Math.cos(ang), 0, Math.sin(ang));
      const dt = t - SCATTER;
      a.position.addScaledVector(d, dt * (1.6 + R()));
      a.lookAt(a.position.clone().add(d));
      a.userData.update(ph + dt * 12, t, { seed: k });
    }
  }
}
// number of ants that have walked the trail so far (for the scent strength)
const walkers = (t) => clamp((t - FOLLOW0) / GAP + 1, 0, N_WORLD_ANTS - 1);
function scentStrength(t) {
  if (t < SCOUT_HOME[0]) return 0;
  const base = 0.45 + 0.55 * clamp(walkers(t) / (N_WORLD_ANTS - 1));
  return base * (1 - easeInOut(inv(FADE[0], FADE[1], t)));
}
function worldTrail(t, reveal) {
  const s = scentStrength(t);
  world.trail.set(reveal, s, t);
  // rising scent wisps
  world.wisps.forEach((w, i) => {
    const R = rng(i * 7 + 3);
    const u = R();
    const show = s > 0.02 && u >= 1 - reveal;
    w.visible = show;
    if (!show) return;
    const life = frac(t * (0.35 + R() * 0.3) + R());
    const p = world.trailCurve.getPointAt(u);
    w.position.set(p.x + (R() - 0.5) * 0.8, 0.2 + life * 2.4, p.z + (R() - 0.5) * 0.8);
    w.scale.setScalar(0.6 + 0.8 * life);
    w.material.opacity = Math.sin(life * Math.PI) * 0.55 * s;
  });
}
function foodScale(t) {
  return 1 - easeIn(inv(46.0, EMPTY, t)) * 0.999;
}
function miniAff(t, p = {}) {
  const a = world.aff;
  a.root.position.copy(p.pos || A_MINI);
  a.root.scale.setScalar(MINI);
  const q = { yaw: 0.6, blink: blinkAt(t, 4), talk: talk(t), smile: 0.95, ...p };
  delete q.pos;
  a.pose(q);
  a.root.updateMatrixWorld(true);
  a.root.visible = true;
}
function worldReset(t) {
  world.ants.forEach((a) => (a.visible = false));
  world.food.scale.setScalar(foodScale(t));
  world.bits.forEach((b, i) => (b.visible = t < 46.5 + i * 0.25));
}
// heading from Affan to a point (yaw)
const yawTo = (from, to) => Math.atan2(to.x - from.x, to.z - from.z);

// meter: how strong the scent is
function scentMeter(t, a, b) {
  const q = pop(t, a, b);
  if (q.o <= 0) return;
  const s = scentStrength(t);
  const g = ov.g;
  const x = 930, y0 = 1180, h = 520;
  g.save();
  g.globalAlpha = q.o;
  g.fillStyle = '#ffffff';
  g.beginPath();
  g.roundRect(x - 44, y0 - h - 14, 88, h + 28, 44);
  g.fill();
  g.fillStyle = '#e8e0ff';
  g.beginPath();
  g.roundRect(x - 30, y0 - h, 60, h, 30);
  g.fill();
  const fh = h * clamp(s);
  const gr = g.createLinearGradient(0, y0, 0, y0 - h);
  gr.addColorStop(0, '#b48cff');
  gr.addColorStop(1, '#6a3cff');
  g.fillStyle = gr;
  g.beginPath();
  g.roundRect(x - 30, y0 - fh, 60, fh, 30);
  g.fill();
  g.restore();
  ov.tag('meterLbl', 'BAU', { x, y: y0 + 60, o: q.o, s: 0.85 * q.s }, { bg: PURPLE, small: true });
  ov.tag('meterN', `${Math.round(walkers(t)) + 1} SEMUT`, { x: x - 60, y: y0 - h - 60, o: q.o * (t < EMPTY ? 1 : 0), s: 0.75 * q.s }, { bg: ORANGE, small: true });
}

// ======================================================================= SHOTS
const SHOTS = [
  // S1 — the living room: a line of ants on the floor, Affan with a magnifying glass
  [0, 2.05, (t) => {
    roomReset(t);
    roomAnts(t);
    roomAff(t, { headPitch: 0.4, lookY: -0.4 });
    camMove(t, 0, 2.05, [0.6, 3.0, 8.4], [-0.1, 1.15, 0.6], [0.4, 2.8, 7.8], [0.0, 1.1, 0.6], 50);
    const q = pop(t, 0.4, 2.0);
    ov.tag('ep', 'EPISOD 35', { x: W / 2, y: 268, o: q.o, s: q.s }, { bg: '#2f7bff', small: true });
    return room;
  }],
  // S2 — floor level: "Papa! Tengok ni, semut jalan berbaris panjang... macam kereta api!"
  [2.05, 7.82, (t) => {
    roomReset(t);
    roomAnts(t);
    roomAff(t, { headPitch: 0.4, lookY: -0.4 });
    camMove(t, 2.05, 7.82, [0.45, 0.32, 1.85], [-2.6, 0.05, 1.1], [0.1, 0.26, 1.9], [-3.0, 0.03, 1.05], 46);
    const pp = pop(t, 2.06, 2.9, { from: 2 });
    ov.bubble('papa', 'PAPA!', { x: 800, y: 470, o: pp.o, s: pp.s * 0.8, r: 6 }, { size: 110 });
    bubble('berbaris', 'BERBARIS PANJANG!', t, 4.26, 6.1, 430, 104);
    bubble('kereta', 'MACAM KERETA API!', t, 6.18, 7.8, 430, 104, { top: '#d6fff0', bot: '#2fbf8f' }, 2);
    pinTag('semutR', 'SEMUT', scr(room.path.getPointAt(0.55)), t, 3.82, 5.9, { bg: ORANGE, pointer: 'down' }, -70);
    return room;
  }],
  // S3 — "Macam mana diorang tahu nak jalan ikut mana?"
  [7.82, 10.42, (t) => {
    roomReset(t);
    roomAnts(t);
    roomAff(t, { headPitch: 0.1, lookY: 0.05, brow: -0.4, headRoll: 0.1, smile: 0.4 });
    camMove(t, 7.82, 10.42, [-0.9, 2.5, 4.9], [0.75, 2.0, 0.1], [-0.7, 2.45, 4.6], [0.75, 2.05, 0.1], 46);
    const hd = scr(A_ROOM.clone().add(V(0, 2.3, 0)));
    qmarks(t, hd, 7.82, 10.4, [[7.9, -250, -120, '#ffcf33', -12], [8.7, 220, -200, '#3fa2ff', 10], [9.5, 260, 40, '#ffcf33', 14]]);
    bubble('ikutmana', 'IKUT MANA?', t, 9.1, 10.4, 430, 120, { top: '#e6ecff', bot: '#7aa8ff' });
    return room;
  }],
  // S4 — "Jom ikut Affan cari jawapan!" Affan shrinks down to ant size
  [10.42, 12.55, (t) => {
    roomReset(t);
    roomAnts(t);
    const k = easeIn(inv(11.0, 12.2, t));
    const up = keys(t, [[10.45, 0], [10.7, 1], [11.0, 1]], easeOut);
    roomAff(t, { scale: Math.max(0.02, 1 - k * 0.98), smile: 1, brow: 0.6, headPitch: 0, lookY: 0, armR: up > 0 && k < 0.05 ? { reach: [-0.55, lerp(0.3, 1.95, up), 0.35], pole: [-1, -0.3, -0.5] } : undefined }, k < 0.05 ? 0 : 0);
    if (up > 0 && k < 0.05) room.mag.visible = false;
    camMove(t, 10.42, 12.55, [-0.7, 2.45, 4.6], [0.75, 2.05, 0.1], [0.4, 1.3, 3.0], [0.95, 0.1, 0.05], 46);
    ov.swirl(t, W / 2, 860, inv(10.8, 12.4, t));
    ov.flash(inv(12.1, 12.55, t) ** 2);
    return room;
  }],
  // S5 — ant world: a scout goes out searching, wanders, finds the biscuit crumb
  [12.55, 21.62, (t) => {
    worldReset(t);
    worldTrail(t, 0);
    const sc = scout(t);
    const ap = world.ants[0].position;
    const look = t > 13 ? ap : NEST;
    miniAff(t, { yaw: yawTo(A_MINI, look), headPitch: 0.05, lookX: 0.2, armR: t > 14.2 && t < 16.4 ? { reach: [-0.75, 1.35, 0.55], pole: [-1, -0.5, 0], point: 1 } : undefined });
    if (t < 16.6) camMove(t, 12.55, 16.6, [1.5, 3.4, 1.8], [-6.0, 0.4, -12.5], [0.2, 3.6, -1.0], [-6.2, 0.3, -11.0], 50);
    else {
      const k = easeInOut(inv(16.6, 21.62, t));
      const tgt = ap.clone().lerp(FOOD, k * 0.5);
      lookCam(tgt.clone().add(V(4.5 + 1.5 * k, 4.2 + 1.2 * k, 7.5)), tgt.clone().add(V(0, 0.6, 0)), 50);
    }
    ov.flash(1 - inv(12.55, 12.9, t));
    pinTag('pengakap', 'SEMUT PENGAKAP', scr(ap.clone().add(V(0, 1.2, 0))), t, 14.1, 16.6, { bg: GREEN, pointer: 'down' }, -50);
    pinTag('sarang', 'SARANG', scr(NEST.clone().add(V(0, 3.4, 0))), t, 12.9, 14.0, { bg: '#8a5a36', pointer: 'down' }, -40);
    topTag('cari', 'CARI MAKANAN', t, 15.36, 16.6, ORANGE);
    topTag('sanasini', 'KE SANA KE MARI...', t, 17.37, 19.0, BLUE);
    bubble('jumpa', 'JUMPA!', t, 19.6, 21.55, 420, 150, { top: '#fff6d0', bot: '#ffb21f' }, 3);
    pinTag('biskut', 'SERBUK BISKUT', scr(FOOD.clone().add(V(0, 2.6, 0))), t, 20.06, 21.55, { bg: '#c97a2a', pointer: 'down' }, 40);
    void sc;
    return world;
  }],
  // S6 — the scout goes home laying a scent trail; "we can't smell it... but ants can!"
  [21.62, 30.3, (t) => {
    worldReset(t);
    const sc = scout(t);
    const reveal = sc && sc.home ? 1 - sc.u : 0;
    worldTrail(t, t > SCOUT_HOME[1] ? 1 : reveal);
    followers(t, { count: 4 });
    const ap = world.ants[0].visible ? world.ants[0].position.clone() : NEST.clone();
    if (t < 26.0) {
      const k = easeInOut(inv(21.62, 26.0, t));
      lookCam(ap.clone().add(V(5.5 - 2 * k, 5.5 + 1.5 * k, 6.5)), ap.clone().add(V(1.5, 0.3, 2)), 50);
      miniAff(t, { yaw: yawTo(A_MINI, ap) });
    } else if (t < 28.3) {
      // Affan sniffs the air: nothing
      const sn = Math.sin((t - 26.0) * 9) * 0.06;
      miniAff(t, { yaw: 0.2, headPitch: -0.25 + sn, lookY: 0.4, brow: -0.4, smile: 0.4, armR: { reach: [-0.3, 1.7, 0.75], pole: [-1, -0.6, 0], point: 1 } });
      camMove(t, 26.0, 28.3, [-0.6, 1.3, 1.6], [-1.6, 1.0, -1.9], [-0.9, 1.2, 1.2], [-1.6, 1.0, -1.9], 46);
    } else {
      miniAff(t, { yaw: yawTo(A_MINI, NEST), smile: 1 });
      camMove(t, 28.3, 30.3, [-4.0, 2.2, -10.8], [-7.6, 0.6, -15.0], [-4.6, 2.0, -11.6], [-7.6, 0.5, -15.2], 46);
    }
    ov.flash((1 - inv(21.62, 21.9, t)) * 0.4);
    pinTag('jejak', 'JEJAK BAU', scr(world.trailCurve.getPointAt(clamp(1 - reveal + 0.12, 0, 1))), t, 24.34, 26.0, { bg: PURPLE, pointer: 'down' }, -40);
    bubble('kitatak', 'KITA TAK BOLEH HIDU', t, 26.08, 28.25, 430, 92, { top: '#e6ecff', bot: '#7aa8ff' });
    if (t > 26.0 && t < 28.3) {
      const q = pop(t, 27.0, 28.25, { from: 3, fin: 0.2 });
      const hd = scr(world.aff.parts.head.getWorldPosition(V()));
      ov.html('cross', ICONS.cross(), { x: clamp(hd.x + 230, 150, 930), y: hd.y - 40, o: q.o, s: q.s * 0.55, r: 8 });
    }
    bubble('semutboleh', 'TAPI SEMUT BOLEH!', t, 28.34, 30.25, 430, 104, { top: '#e8dcff', bot: '#8a5cff' }, 2);
    return world;
  }],
  // S7 — antennae sniff the trail; the others follow it to the food
  [30.3, 35.7, (t) => {
    worldReset(t);
    worldTrail(t, 1);
    followers(t);
    miniAff(t, { yaw: yawTo(A_MINI, NEST) });
    const lead = world.ants[1];
    if (t < 33.3) {
      // close on the lead follower's head, antennae tapping the trail
      const hp = lead.position.clone();
      const fwd = V(0, 0, 1).applyQuaternion(lead.quaternion);
      const side = V(-fwd.z, 0, fwd.x);
      lookCam(hp.clone().addScaledVector(fwd, 2.6).addScaledVector(side, 1.6).add(V(0, 1.1, 0)), hp.clone().addScaledVector(fwd, 0.9).add(V(0, 0.5, 0)), 44);
      lead.userData.update((t * 20) % 100, t, { sniff: 1, seed: 1 });
      const hd = scr(hp.clone().addScaledVector(fwd, 1.35).add(V(0, 0.9, 0)));
      pinTag('sesungut', 'SESUNGUT', hd, t, 32.3, 33.3, { bg: '#20b8a0', pointer: 'down' }, -40);
    } else {
      camMove(t, 33.3, 35.7, [2.5, 6.5, 2.0], [0.5, 0, -4.5], [3.5, 7.5, 4.0], [2.0, 0, -2.0], 50);
      topTag('ikut', 'IKUT SAMPAI KE MAKANAN', t, 33.3, 35.65, ORANGE);
    }
    bubble('hidu', 'HIDU GUNA SESUNGUT', t, 31.0, 33.25, 430, 96, { top: '#d6fff0', bot: '#20b8a0' });
    return world;
  }],
  // S8 — every ant adds scent: more ants, stronger trail; so they all follow the same line
  [35.7, 45.9, (t) => {
    worldReset(t);
    worldTrail(t, 1);
    followers(t);
    miniAff(t, { yaw: yawTo(A_MINI, world.ants[3].position), smile: 1 });
    if (t < 42.3) camMove(t, 35.7, 42.3, [-9.5, 6.5, -1.5], [0.5, 0.2, -5.5], [-10.5, 9.0, -0.5], [0.5, 0.0, -5.0], 50);
    else camMove(t, 42.3, 45.9, [0.6, 30.0, -2.6], [0.6, 0, -5.2], [0.6, 33.0, -2.9], [0.6, 0, -5.4], 50);
    scentMeter(t, 35.8, 42.25);
    topTag('tambah', 'SETIAP SEMUT TAMBAH BAU', t, 37.09, 40.5, PURPLE);
    bubble('kuat', 'LAGI KUAT!', t, 40.52, 42.25, 430, 130, { top: '#e8dcff', bot: '#8a5cff' }, 2);
    bubble('sama', 'IKUT GARISAN SAMA!', t, 44.1, 45.85, 430, 104);
    return world;
  }],
  // S9 — the food runs out, the scent fades, the line breaks up
  [45.9, 54.45, (t) => {
    worldReset(t);
    worldTrail(t, 1);
    followers(t);
    miniAff(t, { yaw: yawTo(A_MINI, FOOD), smile: t > 52.3 ? 0.7 : 0.9 });
    if (t < 49.6) camMove(t, 45.9, 49.6, [14.5, 6.5, 13.0], [8.5, 0.8, 4.5], [15.5, 7.0, 14.0], [8.0, 0.6, 3.5], 50);
    else camMove(t, 49.6, 54.45, [0.6, 30.0, -2.6], [0.6, 0, -5.2], [0.6, 26.0, -1.5], [0.6, 0, -5.0], 50);
    scentMeter(t, 49.7, 52.6);
    bubble('habis', 'MAKANAN HABIS!', t, 46.88, 49.5, 430, 110, { top: '#ffe0c8', bot: '#ff8a5c' });
    topTag('taktambah', 'TAK TAMBAH BAU LAGI', t, 48.13, 49.9, ORANGE);
    bubble('hilang', 'BAU HILANG...', t, 50.64, 52.25, 430, 110, { top: '#e6ecff', bot: '#9fb4ff' });
    bubble('bersurai', 'BERSURAI!', t, 52.46, 54.4, 430, 130, { top: '#fff0d0', bot: '#ff9a3d' }, 3);
    return world;
  }],
  // S10 — back in the room: "Waaah, rupanya semut ikut jejak bau!" (we glimpse the trail)
  [54.45, 57.75, (t) => {
    roomReset(t);
    roomAnts(t);
    room.trail.set(1, 0.85 * inv(54.6, 55.4, t), t);
    roomAff(t, { wow: keys(t, [[54.5, 0], [54.65, 0.9], [55.3, 0.9], [55.6, 0]]), smile: 1, headPitch: 0.25, lookY: -0.2, brow: 0.6 });
    camMove(t, 54.45, 57.75, [0.3, 2.8, 7.8], [-0.2, 1.05, 0.7], [0.1, 2.7, 7.4], [-0.3, 1.0, 0.7], 50);
    ov.flash((1 - inv(54.45, 54.75, t)) * 0.9, '255,250,235');
    const hd = scr(A_ROOM.clone().add(V(0, 2.3, 0)));
    const b = pop(t, 54.55, 57.7);
    ov.html('bulb', ICONS.bulb(), { x: clamp(hd.x + 200, 150, 900), y: clamp(hd.y - 160, 300, 900) + Math.sin(t * 5) * 8, o: b.o, s: b.s * 0.65, r: 10 });
    ov.sparkles(t, { n: 30, seed: 12, y: 250, h: 900, a: inv(54.5, 54.8, t) * (1 - inv(56.6, 57.2, t)) });
    bubble('ikutbau', 'SEMUT IKUT JEJAK BAU!', t, 55.42, 57.7, 430, 92, { top: '#e8dcff', bot: '#8a5cff' });
    return room;
  }],
  // S11 — "Jadi, jangan tinggal makanan merata-rata, nanti semut datang beratur!" Into the jar.
  [57.75, 64.02, (t) => {
    roomReset(t);
    roomAnts(t);
    room.trail.set(1, 0.85 * (1 - inv(57.8, 58.4, t)), t);
    // the jar pops up beside the biscuit; the biscuit hops in; the lid drops
    const JAR = BISCUIT.clone().add(V(-0.9, 0, 1.15));
    room.jar.visible = true;
    room.jar.position.copy(JAR);
    room.jar.scale.setScalar(Math.max(0.001, easeOut(inv(58.0, 58.5, t)) * (1 + 0.1 * Math.sin(inv(58.0, 58.6, t) * Math.PI))));
    const hop = inv(59.6, 60.4, t);
    const bp = BISCUIT.clone().lerp(JAR.clone().add(V(0, 0.12, 0)), easeInOut(hop));
    bp.y += Math.sin(hop * Math.PI) * 1.3;
    room.biscuit.position.copy(bp);
    room.biscuit.rotation.z = hop * Math.PI * 2;
    room.crumbs.forEach((c, i) => (c.visible = t < 59.9 + i * 0.05));
    const lidY = lerp(1.6, 0.8, easeIn(inv(60.6, LID, t)));
    room.lid.position.y = lidY;
    room.lid.visible = t > 60.4;
    const pt = easeOut(inv(58.6, 59.0, t)) * (1 - inv(61.6, 62.0, t));
    roomAff(t, { smile: 1, headPitch: 0.25, lookY: -0.2, ...(pt > 0 ? { armL: { reach: [0.6, 0.9, 0.85], pole: [1, -0.5, 0], point: pt } } : {}), ...(t > 62.0 ? POSES.thumbsUpR : {}) }, t > 62.0 ? 0 : 1);
    camMove(t, 57.75, 64.02, [0.2, 2.8, 8.2], [0.0, 1.05, 1.0], [0.3, 2.7, 7.9], [0.05, 1.05, 1.0], 50);
    bubble('jangan', 'JANGAN TINGGAL\nMERATA-RATA!', t, 59.36, 61.5, 460, 96, { top: '#ffd0d0', bot: '#ff5c7a' });
    pinTag('bekas', 'SIMPAN DALAM BEKAS', scr(JAR.clone().add(V(0, 1.3, 0))), t, 60.95, 63.95, { bg: GREEN, pointer: 'down' }, -40);
    bubble('beratur', 'NANTI SEMUT BERATUR!', t, 61.56, 63.95, 430, 92);
    return room;
  }],
  // S12 — "Apa lagi kita nak belajar lepas ni?"
  [64.02, OUTRO, (t) => {
    roomReset(t);
    room.biscuit.visible = false;
    room.crumbs.forEach((c) => (c.visible = false));
    room.jar.visible = true;
    room.jar.position.copy(BISCUIT.clone().add(V(-0.9, 0, 1.15)));
    room.jar.scale.setScalar(1);
    room.lid.position.y = 0.8;
    room.lid.visible = true;
    room.ants.forEach((a) => (a.visible = false));
    const tk = keys(t, [[64.05, 0], [64.45, 1]]);
    const th2 = POSES.thinkR.armR;
    roomAff(t, { smile: 1, brow: 0.3 + 0.4 * tk, headRoll: -0.12 * tk, lookX: 0.35 * tk, lookY: 0.4 * tk, headPitch: -0.08 * tk, lean: 0.1, armR: { reach: mix3([-0.55, 0.4, 0.5], th2.reach, tk), pole: th2.pole, point: tk, wx: th2.wx * tk } }, 0);
    camMove(t, 64.02, OUTRO, [-0.7, 2.45, 4.6], [0.75, 2.05, 0.1], [-0.5, 2.4, 4.3], [0.75, 2.1, 0.1], 44);
    const hd = scr(A_ROOM.clone().add(V(0, 2.25, 0)));
    qmarks(t, hd, 64.0, OUTRO - 0.05, [[64.2, -260, -230, '#ffcf33', -12], [64.5, 250, -280, '#3fa2ff', 10], [64.8, 300, -60, '#ffcf33', 14]]);
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
  cam.aspect = W / H;
  cam.updateProjectionMatrix();
  const shot = SHOTS.find(([a, b]) => t >= a && t < b) || SHOTS[SHOTS.length - 1];
  const w = shot[2](t);
  if (w.sky) w.sky.position.copy(cam.position);
  renderer.setViewport(0, 0, W, H);
  renderer.render(w.scene, cam);
  if (w !== outro) ov.vignette(0.22);
  ov.captions(t, CAPTIONS, KEYWORDS);
  ov.end();
}

// Cover / thumbnail (9:16): the ant world with a big friendly ant marching on
// the glowing trail, tiny Affan beside it, a title, badge and the logo.
function thumbnail() {
  ov.begin();
  cam.aspect = W / H;
  cam.updateProjectionMatrix();
  const t = 40.0;
  worldReset(t);
  worldTrail(t, 1);
  followers(t);
  const cp = V(-3.4, 1.9, 2.6);
  miniAff(t, { yaw: yawTo(A_MINI, cp), talk: 0, wow: 0.9, brow: 0.8, armL: { reach: [0.85, 1.45, 0.3], pole: [1, -0.5, 0], point: 1 } });
  lookCam(cp, V(-1.2, 0.9, -3.4), 48);
  world.sky.position.copy(cam.position);
  renderer.setViewport(0, 0, W, H);
  renderer.render(world.scene, cam);
  const g = ov.g;
  const top = g.createLinearGradient(0, 0, 0, 760);
  top.addColorStop(0, 'rgba(60,30,10,0.55)');
  top.addColorStop(1, 'rgba(60,30,10,0)');
  g.fillStyle = top;
  g.fillRect(0, 0, W, 760);
  const bot = g.createLinearGradient(0, H - 900, 0, H);
  bot.addColorStop(0, 'rgba(40,20,8,0)');
  bot.addColorStop(1, 'rgba(40,20,8,0.7)');
  g.fillStyle = bot;
  g.fillRect(0, H - 900, W, 900);
  ov.vignette(0.3);
  ov.tag('thBadge', 'EPISOD 35', { x: W / 2, y: 300 }, { bg: '#2f7bff', small: true });
  ov.bubble('thTitle', 'KENAPA SEMUT', { x: W / 2, y: 445, r: -3 }, { size: 118 });
  ov.bubble('thTitle2', 'BERATUR?', { x: W / 2, y: 590, r: 2 }, { size: 150, top: '#e8dcff', bot: '#8a5cff' });
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
