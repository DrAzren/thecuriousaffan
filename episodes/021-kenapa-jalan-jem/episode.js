// THE CURIOUS AFFAN — Episode 021: "Kenapa Jalan Jem?"
// Every shot is a pure function of time t (seconds), synced to audio/narration.mp3.
// The toy-traffic demos are driven by the models in sim.js (precomputed once).
import * as THREE from 'three';
import { makeRenderer, loadEnvelope, toScreen, clamp, lerp, inv, easeOut, easeInOut, keys, wobble, W, H } from '../../shared/core.js';
import { POSES, blinkAt } from '../../shared/affan.js';
import { Overlay, pop, ICONS, drawLogo } from '../../shared/overlay.js';
import { CAPTIONS, KEYWORDS } from './captions.js';
import { buildCityWorld, buildToyWorld, buildOutro, TOY, ZONES, AFF_SPOTS, neckLaneZ } from './worlds.js';
import { brakeWave, crowding, bottleneck } from './sim.js';
import TIMING from './timing.json' with { type: 'json' };

// Shots are written on the fixed "story" timeline (the first narration take).
// timing.json maps story time to the current narration (see retime.py), so the
// picture follows the voice: frame(t) draws story time storyAt(t).
const A = TIMING.anchors;
function storyAt(t) {
  for (let i = 1; i < A.length; i++) {
    const [s0, n0] = A[i - 1], [s1, n1] = A[i];
    if (t <= n1) return s0 + ((s1 - s0) * (t - n0)) / Math.max(1e-6, n1 - n0);
  }
  return A[A.length - 1][0] + (t - A[A.length - 1][1]);
}
let REAL_T = 0; // narration time of the frame being drawn (lip sync uses it)

const FPS = 30;
const DURATION = TIMING.duration;
const STORY_END = 72.5;

const stage = document.getElementById('stage');
const canvas = document.createElement('canvas');
stage.appendChild(canvas);
const renderer = makeRenderer(canvas);
const ov = new Overlay(stage);
const city = buildCityWorld();
const toy = buildToyWorld();
const outro = buildOutro();
const cam = new THREE.PerspectiveCamera(50, W / H, 0.02, 6000);
let env = { at: () => 0 };

const CROWD = crowding();
const WAVE = brakeWave();
const NECK = bottleneck();

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const talk = () => clamp(env.at(REAL_T) * 1.2);
const scr = (p, c = cam) => toScreen(p, c);
const ORANGE = '#ff8a3d', BLUE = '#2f9bff', RED = '#ff4d4d', GREEN = '#35b85a';

function lookCam(c, pos, look, fov = 50) {
  c.position.copy(pos);
  c.fov = fov;
  c.updateProjectionMatrix();
  c.lookAt(look);
  c.updateMatrixWorld(true);
}

// ----------------------------------------------------------------- city bits
const carLocal = (x, y, z) => city.car.localToWorld(V(x, y, z));
function interior(on) {
  city.car.userData.body.visible = !on;
  city.car.userData.interior.visible = on;
  city.fill.intensity = on ? 2.2 : 0;
  city.fill.position.set(-0.1, 1.85, -0.1);
}
const AFF_HEAD_LOCAL = [-0.92, 1.49, -0.45];
const seatedRest = { armL: { reach: [0.55, 0.32, 0.25] }, armR: { reach: [-0.55, 0.32, 0.25] } };
function carAffan(t, p = {}) {
  city.aff.pose({ ...POSES.seated, ...seatedRest, yaw: Math.PI / 2, blink: blinkAt(t, 1), talk: talk(t), ...p, armL: { ...seatedRest.armL, ...(p.armL || {}) }, armR: { ...seatedRest.armR, ...(p.armR || {}) } });
}
function cityAt(t) {
  city.update(t);
  city.car.updateMatrixWorld(true);
}

// ------------------------------------------------------------------ toy bits
const toyCar = (i) => toy.cars[i];
function showCar(i, x, z, { brake = 0, dist = x, rider = false, s = 1 } = {}) {
  const c = toy.cars[i];
  c.visible = s > 0.01;
  c.position.set(x, 0.004 * Math.sin(dist * 7 + i), z);
  c.scale.setScalar(TOY * s);
  c.userData.update(dist / TOY);
  c.userData.brake(brake);
  c.userData.rider.visible = rider;
  return c;
}
const brakeOf = (rec, t, i) => clamp(Math.max(-rec.a_at(t, i) / 2.6, rec.v_at(t, i) < 0.4 ? 1 : 0));
function toyAffan(x, z, p = {}) {
  toy.aff.root.position.set(x, 0, z);
  toy.aff.root.scale.setScalar(1);
  toy.aff.pose(p);
}
const hideAffan = () => toy.aff.root.position.set(1000, 0, 1000);

// crowd demo: first car is at toy x = CX0 at the moment the road fills up
const CX0 = 30;
const crowdX = (t, i) => CX0 + (CROWD.x_at(t, i) - CROWD.head(15.3)) * TOY;
// brake wave demo: car 0 at toy x = 0 at the moment it brakes
const WX0 = WAVE.x_at(35.66, 0);
const waveX = (t, i) => (WAVE.x_at(t, i) - WX0) * TOY;

// ---------------------------------------------------------------- overlay art
const ART = {
  clock: (a) => `<svg width="200" height="200" viewBox="0 0 200 200"><circle cx="100" cy="100" r="84" fill="#ffffff" stroke="#17256b" stroke-width="12"/>
    <g stroke="#17256b" stroke-width="8" stroke-linecap="round">${Array.from({ length: 12 }, (_, i) => { const r = (i / 12) * Math.PI * 2; return `<line x1="${100 + Math.sin(r) * 64}" y1="${100 - Math.cos(r) * 64}" x2="${100 + Math.sin(r) * 72}" y2="${100 - Math.cos(r) * 72}"/>`; }).join('')}</g>
    <line x1="100" y1="100" x2="${100 + Math.sin(a / 12) * 38}" y2="${100 - Math.cos(a / 12) * 38}" stroke="#17256b" stroke-width="12" stroke-linecap="round"/>
    <line x1="100" y1="100" x2="${100 + Math.sin(a) * 58}" y2="${100 - Math.cos(a) * 58}" stroke="#ff4d5e" stroke-width="8" stroke-linecap="round"/><circle cx="100" cy="100" r="10" fill="#17256b"/></svg>`,
  gauge: (k) => {
    const ang = Math.PI * (1 - k);
    const nx = 130 + Math.cos(ang) * 92, ny = 130 - Math.sin(ang) * 92;
    const arc = (a0, a1, c) => `<path d="M ${130 + Math.cos(a0) * 104} ${130 - Math.sin(a0) * 104} A 104 104 0 0 1 ${130 + Math.cos(a1) * 104} ${130 - Math.sin(a1) * 104}" fill="none" stroke="${c}" stroke-width="26"/>`;
    return `<svg width="260" height="170" viewBox="0 0 260 170"><path d="M 12 136 A 118 118 0 0 1 248 136 Z" fill="#ffffff" stroke="#17256b" stroke-width="10" stroke-linejoin="round"/>
      ${arc(Math.PI, Math.PI * 0.66, '#ff6b5e')}${arc(Math.PI * 0.66, Math.PI * 0.34, '#ffcf33')}${arc(Math.PI * 0.34, 0.001, '#43c46b')}
      <line x1="130" y1="130" x2="${nx}" y2="${ny}" stroke="#17256b" stroke-width="12" stroke-linecap="round"/><circle cx="130" cy="130" r="16" fill="#17256b"/></svg>`;
  },
  bottle: () => `<svg width="170" height="300" viewBox="0 0 170 300"><path d="M62 14 H108 V40 H100 V84 C100 104 150 116 150 160 V268 C150 282 140 290 126 290 H44 C30 290 20 282 20 268 V160 C20 116 70 104 70 84 V40 H62 Z" fill="#bff0d2" stroke="#17256b" stroke-width="10" stroke-linejoin="round"/>
    <path d="M28 186 H142 V266 C142 276 136 282 126 282 H44 C34 282 28 276 28 266 Z" fill="#59c98a"/><rect x="58" y="6" width="54" height="22" rx="6" fill="#ff8a3d" stroke="#17256b" stroke-width="8"/>
    <ellipse cx="52" cy="150" rx="10" ry="26" fill="#fff" opacity="0.8"/></svg>`,
  check: () => `<svg width="150" height="150" viewBox="0 0 150 150"><circle cx="75" cy="75" r="66" fill="#35b85a" stroke="#fff" stroke-width="12"/><path d="M42 78 L66 102 L110 52" fill="none" stroke="#fff" stroke-width="18" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  car: (c = '#ff8a3d') => `<svg width="150" height="100" viewBox="0 0 150 100"><path d="M18 62 C18 48 26 44 38 42 L52 22 C56 16 62 14 70 14 H96 C104 14 110 18 114 24 L126 42 C138 44 142 50 142 62 V72 H18 Z" fill="${c}" stroke="#17256b" stroke-width="8" stroke-linejoin="round"/>
    <path d="M58 26 H82 V42 H48 Z M90 26 H104 L114 42 H90 Z" fill="#cfe9ff" stroke="#17256b" stroke-width="5" stroke-linejoin="round"/><circle cx="44" cy="74" r="14" fill="#2b2f3a" stroke="#17256b" stroke-width="6"/><circle cx="116" cy="74" r="14" fill="#2b2f3a" stroke="#17256b" stroke-width="6"/></svg>`,
  funnel: () => `<svg width="150" height="100" viewBox="0 0 150 100"><path d="M8 14 H70 L104 40 H142 V60 H104 L70 86 H8 Z" fill="#5b6290" stroke="#17256b" stroke-width="8" stroke-linejoin="round"/><path d="M14 40 H66 M14 60 H66" stroke="#fff1a8" stroke-width="6" stroke-dasharray="12 10"/><path d="M110 50 H136" stroke="#fff" stroke-width="6" stroke-linecap="round"/></svg>`,
  brake: () => `<svg width="150" height="110" viewBox="0 0 150 110"><rect x="10" y="22" width="130" height="66" rx="30" fill="#2b2f3a" stroke="#17256b" stroke-width="8"/><circle cx="44" cy="55" r="20" fill="#ff3a2a"/><circle cx="106" cy="55" r="20" fill="#ff3a2a"/><circle cx="44" cy="55" r="30" fill="#ff3a2a" opacity="0.35"/><circle cx="106" cy="55" r="30" fill="#ff3a2a" opacity="0.35"/></svg>`,
  person: (c) => `<svg width="60" height="90" viewBox="0 0 60 90"><circle cx="30" cy="22" r="16" fill="#e8a57c" stroke="#17256b" stroke-width="5"/><path d="M8 86 C8 58 16 46 30 46 C44 46 52 58 52 86 Z" fill="${c}" stroke="#17256b" stroke-width="5" stroke-linejoin="round"/></svg>`,
};
function card(id, icon, text, color, p) {
  ov.html(id, `<div style="display:flex;align-items:center;gap:22px;padding:14px 34px 14px 18px;border-radius:44px;background:#ffffff;box-shadow:0 10px 0 rgba(0,0,0,0.2),0 0 0 7px ${color};">
    <div style="width:150px;display:flex;justify-content:center">${icon}</div><div style="font-family:'Baloo 2';font-weight:800;font-size:64px;color:${color};line-height:1;white-space:nowrap">${text}</div></div>`, p);
}
function pinTag(id, text, p, t, a, b, style, dy = -90) {
  const q = pop(t, a, b);
  if (q.o <= 0 || !p.visible) return;
  ov.tag(id, text, { x: clamp(p.x, 170, 910), y: clamp(p.y + dy, 300, 1360), o: q.o, s: q.s }, style);
}
function hook(t) {
  const p = pop(t, 0.12, 5.1, { fin: 0.45 });
  const fl = Math.sin(t * 3) * 6;
  ov.bubble('hook', 'KENAPA\nJALAN JEM?', { x: W / 2, y: 440 + fl, o: p.o, s: p.s }, { size: 118 });
  const q = pop(t, 0.5, 5.1);
  ov.tag('ep', 'EPISOD 21', { x: W / 2, y: 268, o: q.o, s: q.s }, { bg: '#2f7bff', small: true });
}

// ======================================================================= SHOTS
const SHOTS = [
  // S1 — stuck in the jam; "Papa! Kenapa jalan jem?"; "Kereta tak bergerak langsung!"
  [0, 7.4, (t) => {
    cityAt(t);
    interior(true);
    const look = t < 2.6 ? keys(t, [[0, 0.5], [2.2, 0.58]]) : keys(t, [[2.6, 0.58], [2.95, -0.75], [5.1, -0.75], [5.6, 0.1]], easeOut);
    const shrug = keys(t, [[5.3, 0], [5.75, 1], [6.9, 1], [7.3, 0.2]]);
    carAffan(t, {
      headYaw: look, headPitch: t < 2.6 ? -0.12 : -0.02, lookY: t < 2.6 ? 0.2 : 0.1, lookX: t < 2.6 ? 0.85 : 0,
      brow: t > 2.6 ? 0.9 : -0.2, smile: t < 2.6 ? 0.15 : 0.5, headRoll: t < 2.6 ? 0.1 : 0,
      armL: { reach: [lerp(0.55, 0.8, shrug), lerp(0.32, 0.95, shrug), lerp(0.25, 0.5, shrug)], pole: [1, -1, -0.6] },
      armR: { reach: [lerp(-0.55, -0.8, shrug), lerp(0.32, 0.95, shrug), lerp(0.25, 0.5, shrug)], pole: [-1, -1, -0.6] },
    });
    const cp = keys(t, [[0, [-0.1, 1.55, 0.74]], [7.4, [-0.28, 1.53, 0.6]]], (k) => k);
    lookCam(cam, carLocal(...cp), carLocal(-0.95, 1.5, -0.5), 50);
    hook(t);
    const q = pop(t, 5.9, 7.3);
    ov.tag('stuck', 'TAK BERGERAK!', { x: W / 2, y: 380, o: q.o, s: q.s }, { bg: RED });
    return city;
  }],
  // S2 — crane up over the endless jam: "Korang pernah kena jem tak? Lama kan?"
  [7.4, 10.45, (t) => {
    cityAt(t);
    interior(false);
    carAffan(t, { headYaw: 0.4, lookX: 0.6 });
    const cx = city.car.position.x;
    const k = easeInOut(inv(7.4, 10.3, t));
    lookCam(cam, V(cx + lerp(9, 30, k), lerp(2.6, 30, k), lerp(5.5, 16, k)), V(cx - lerp(8, 50, k), lerp(1.0, 0, k), lerp(0.5, -1, k)), lerp(50, 55, k));
    const m = scr(V(cx - 26, 1, 0));
    const j = pop(t, 7.56, 10.4);
    ov.bubble('jem', 'JEM!', { x: W / 2, y: 470 + Math.sin(t * 3) * 6, o: j.o, s: j.s, r: -4 }, { size: 170, top: '#ffb36b', bot: '#ff5a3d' });
    const c = pop(t, 9.26, 10.4);
    ov.html('clock', ART.clock(t * 7), { x: 820, y: 760, o: c.o, s: c.s * 0.9, r: 8 });
    ov.tag('lama', 'LAMA...', { x: 820, y: 900, o: c.o, s: c.s }, { bg: '#7b5cff', small: true });
    void m;
    return city;
  }],
  // S3 — "Jom ikut Affan cari jawapan!" + magic sparkle swirl
  [10.45, 12.6, (t) => {
    cityAt(t);
    interior(true);
    const up = keys(t, [[10.6, 0], [10.9, 1], [12.0, 1], [12.4, 0.6]], easeOut);
    carAffan(t, {
      headYaw: -0.12, smile: 1, brow: 0.6, lookX: 0.05,
      armR: { reach: [lerp(-0.55, -0.6, up), lerp(0.32, 1.95 + 0.06 * Math.sin(t * 14), up), lerp(0.25, 0.35, up)], pole: [-1, -0.3, -0.5] },
    });
    const k = easeInOut(inv(10.45, 12.6, t));
    lookCam(cam, carLocal(lerp(0.3, 0.05, k), 1.56, lerp(-0.25, -0.38, k)), carLocal(...AFF_HEAD_LOCAL), 48);
    ov.swirl(t, W / 2, 820, inv(11.1, 12.45, t));
    ov.flash(inv(12.2, 12.6, t) ** 2);
    return city;
  }],
  // S4a — toy world: "Jalan raya ada ruang yang terhad"
  [12.6, 15.3, (t) => {
    toy.hideCars();
    for (let i = 0; i < 3; i++) showCar(i, crowdX(t, i), ZONES.crowd, { dist: crowdX(t, i) });
    const ax = AFF_SPOTS.reveal[0];
    const open = keys(t, [[12.6, 0], [13.0, 1], [13.7, 1], [14.1, 0.2]]);
    const press = keys(t, [[13.9, 0], [14.3, 1], [15.3, 1]]);
    const spread = lerp(1.05, 0.62, press);
    toyAffan(ax, AFF_SPOTS.reveal[1], {
      yaw: Math.PI, blink: blinkAt(t, 2), talk: talk(t), smile: 1, brow: 0.6, wow: keys(t, [[12.65, 0.8], [13.0, 0]]),
      headPitch: 0.2, lookY: -0.3, headYaw: 0.15 * Math.sin(t * 1.5),
      armL: { reach: [lerp(0.55, spread, open + press), lerp(0.25, 1.35, Math.max(open, press)), lerp(0.1, 0.45, Math.max(open, press))], pole: [1, -0.6, -0.4] },
      armR: { reach: [lerp(-0.55, -spread, open + press), lerp(0.25, 1.35, Math.max(open, press)), lerp(0.1, 0.45, Math.max(open, press))], pole: [-1, -0.6, -0.4] },
    });
    const k = easeOut(inv(12.6, 15.3, t));
    lookCam(cam, V(ax + lerp(3.5, 1.2, k), lerp(4.6, 3.4, k), ZONES.crowd - lerp(9.5, 7.2, k)), V(ax + 0.2, lerp(2.4, 2.0, k), ZONES.crowd + 0.8), 50);
    toy.shadowAt(V(ax, 0, ZONES.crowd));
    ov.flash(1 - inv(12.6, 13.0, t));
    ov.sparkles(t, { n: 22, seed: 3, y: 250, h: 1000, a: 0.7 * (1 - inv(14.0, 15.0, t)) });
    const q = pop(t, 14.44, 15.25);
    ov.tag('terhad', 'RUANG TERHAD', { x: W / 2, y: 1240, o: q.o, s: q.s }, { bg: '#e0a400' });
    if (q.o > 0) ov.html('wide', `<svg width="620" height="60" viewBox="0 0 620 60"><path d="M40 30 H580 M40 30 L70 10 M40 30 L70 50 M580 30 L550 10 M580 30 L550 50 M10 6 V54 M610 6 V54" stroke="#fff" stroke-width="12" stroke-linecap="round" fill="none"/></svg>`, { x: W / 2, y: 1130, o: q.o, s: q.s * 0.9 });
    return toy;
  }],
  // S4b — more and more cars on the same road: gaps shrink, everybody slows down
  [15.3, 22.6, (t) => {
    toy.hideCars();
    hideAffan();
    for (let i = 0; i < CROWD.n; i++) {
      const x = crowdX(t, i);
      if (x < CX0 - 60) continue;
      showCar(i, x, ZONES.crowd, { dist: x, brake: clamp((CROWD.speed(t - 0.25) - CROWD.speed(t)) * 2.2 + (CROWD.speed(t) < 4 ? 0.5 : 0)) });
    }
    const hx = crowdX(t, 0);
    const ck = easeInOut(inv(15.3, 20.8, t));
    const back = lerp(6, 19, ck);
    lookCam(cam, V(hx - back - 3.2, lerp(2.6, 5.2, ck), ZONES.crowd - lerp(0.9, 1.3, ck)), V(hx - back * 0.35, 0, ZONES.crowd), 50);
    toy.shadowAt(V(hx - back * 0.5, 0, ZONES.crowd));
    // speed gauge
    const gk = (CROWD.speed(t) - 1.5) / 14;
    const gp = pop(t, 15.4, 22.55);
    ov.html('gauge', ART.gauge(clamp(gk)), { x: 800, y: 420, o: gp.o, s: gp.s * 0.95 });
    const fast = CROWD.speed(t) > 9;
    ov.tag('gLabel', fast ? 'LAJU' : 'PERLAHAN', { x: 800, y: 540, o: gp.o, s: gp.s * (fast ? 1 : 1 + 0.08 * pop(t, 21.82, 22.55).s) }, { bg: fast ? GREEN : BLUE, small: true });
    const b = pop(t, 16.1, 22.55);
    ov.tag('banyak', 'BANYAK KERETA', { x: 300, y: 330, o: b.o, s: b.s }, { bg: ORANGE });
    const mid = scr(V((crowdX(t, 6) + crowdX(t, 7)) / 2, 0.45, ZONES.crowd));
    pinTag('rapat', 'RAPAT!', mid, t, 19.4, 22.55, { bg: '#ff6b3d', pointer: 'down' }, -80);
    return toy;
  }],
  // S5 — three lanes squeeze into one: "satu demi satu", "macam leher botol"
  [22.6, 32.0, (t) => {
    toy.hideCars();
    hideAffan();
    let servedCount = 0;
    for (let i = 0; i < NECK.n; i++) {
      const x = NECK.x_at(t, i) * TOY;
      const served = NECK.isServed(t, i);
      if (served) servedCount++;
      showCar(i, x, neckLaneZ(NECK.lane_at(t, i)), { dist: x, brake: served ? 0 : 0.85 });
    }
    const k = easeInOut(inv(22.6, 29.9, t));
    const top = easeInOut(inv(29.9, 31.2, t));
    const pos = V(lerp(lerp(-15, -12, k), -2.5, top), lerp(lerp(7.5, 9.5, k), 21, top), ZONES.neck + lerp(-0.6, -0.05, top));
    lookCam(cam, pos, V(lerp(lerp(0.5, 1.5, k), -2.2, top), 0, ZONES.neck), 50);
    toy.shadowAt(V(-3, 0, ZONES.neck));
    const L3 = scr(V(-6, 0.3, ZONES.neck)), L1 = scr(V(4.5, 0.3, ZONES.neck));
    const a = pop(t, 24.28, 29.85), b = pop(t, 25.54, 29.85);
    if (a.o > 0 && L3.visible) ov.tag('l3', '3 LORONG', { x: clamp(L3.x, 200, 880), y: clamp(L3.y + 40, 300, 1360), o: a.o, s: a.s }, { bg: BLUE });
    if (b.o > 0 && L1.visible) ov.tag('l1', '1 LORONG', { x: clamp(L1.x, 200, 880), y: clamp(L1.y - 110, 300, 1360), o: b.o, s: b.s }, { bg: RED, pointer: 'down' });
    const sd = pop(t, 28.44, 29.85);
    ov.tag('sds', 'SATU DEMI SATU', { x: W / 2, y: 330, o: sd.o, s: sd.s }, { bg: '#7b5cff' });
    const lb = pop(t, 30.58, 31.95, { fin: 0.4, from: 2 });
    ov.bubble('leher', 'LEHER BOTOL!', { x: W / 2, y: 400, o: lb.o, s: lb.s, r: -3 }, { size: 130, top: '#c9ffd8', bot: '#3fc77a' });
    ov.html('bottle', ART.bottle(), { x: 860, y: 640, o: lb.o, s: lb.s * 0.75, r: 12 + Math.sin(t * 4) * 4 });
    void servedCount;
    return toy;
  }],
  // S6a — "Satu lagi rahsia: brek."
  [32.0, 34.5, (t) => {
    toy.hideCars();
    for (let i = 0; i < WAVE.n; i++) {
      const x = waveX(t, i) - 6;
      showCar(i, x, ZONES.wave, { dist: x, brake: brakeOf(WAVE, t, i) });
    }
    const ax = AFF_SPOTS.secret[0];
    const up = keys(t, [[32.1, 0], [32.45, 1], [33.6, 1], [33.9, 0]]);
    const sh = keys(t, [[33.75, 0], [33.95, 1], [34.5, 1]]);
    toyAffan(ax, AFF_SPOTS.secret[1], {
      yaw: Math.PI + 0.25, blink: blinkAt(t, 5), talk: talk(t), smile: 0.8, brow: 0.5 + 0.5 * sh, wow: sh * 0.7,
      headYaw: 0.1, headPitch: 0.05, lookX: 0.1,
      armR: up > 0.01 ? { reach: [lerp(-0.55, -0.42, up), lerp(0.25, 1.78, up), lerp(0.1, 0.42, up)], point: up, pole: [-1, -0.8, -0.3], wx: -0.2 } : { reach: [lerp(-0.55, -0.85, sh), lerp(0.25, 1.1, sh), lerp(0.1, 0.55, sh)], pole: [-1, -0.6, -0.4] },
      armL: { reach: [lerp(0.55, 0.85, sh), lerp(0.25, 1.1, sh), lerp(0.1, 0.55, sh)], pole: [1, -0.6, -0.4] },
    });
    const k = easeOut(inv(32.0, 34.5, t));
    lookCam(cam, V(ax + 0.6, 3.1, ZONES.wave - lerp(4.8, 4.0, k)), V(ax, lerp(2.9, 2.7, k), ZONES.wave + 4), 50);
    toy.shadowAt(V(ax, 0, ZONES.wave));
    const q = pop(t, 33.82, 34.48, { fin: 0.3, from: 2 });
    ov.bubble('brek', 'BREK!', { x: W / 2 + 40, y: 420, o: q.o, s: q.s, r: -5 }, { size: 180, top: '#ff9d8a', bot: '#ff3a2a' });
    ov.html('brakeIcon', ART.brake(), { x: 250, y: 600, o: q.o, s: q.s * 1.1, r: -8 });
    return toy;
  }],
  // S6b — behind the line of cars: the first car brakes, the next brakes harder, the third stops
  [34.5, 43.0, (t) => {
    toy.hideCars();
    hideAffan();
    for (let i = 0; i < WAVE.n; i++) {
      const x = waveX(t, i);
      showCar(i, x, ZONES.wave, { dist: x, brake: brakeOf(WAVE, t, i) });
    }
    hideAffan();
    // camera rides behind car 3 (it stops too, so the camera stops with it)
    const fx = waveX(t, 3);
    const k = easeInOut(inv(34.5, 36.0, t));
    lookCam(cam, V(fx - lerp(5.5, 4.6, k), lerp(2.3, 2.0, k), ZONES.wave - 0.55), V(fx + 11, 0.2, ZONES.wave), lerp(30, 27, k));
    toy.shadowAt(V(fx + 4, 0, ZONES.wave));
    const labels = [['b0', 'BREK!', 0, 35.66, ORANGE], ['b1', 'BREK!', 1, 37.88, '#ff6b3d'], ['b2', 'BREK KUAT!', 2, 39.72, RED]];
    for (const [id, txt, i, a, c] of labels) pinTag(id, txt, scr(V(waveX(t, i), 0.55, ZONES.wave)), t, a, i === 2 ? 41.3 : 42.95, { bg: c, pointer: 'down', small: i === 0 }, -80);
    pinTag('stop', 'BERHENTI!', scr(V(waveX(t, 2), 0.55, ZONES.wave)), t, 41.44, 42.95, { bg: '#c81e2a', pointer: 'down' }, -80);
    const lk = pop(t, 39.96, 42.95);
    if (lk.o > 0) ov.html('bang', `<svg width="120" height="120" viewBox="0 0 120 120"><path d="M60 6 L72 42 L112 40 L80 64 L94 104 L60 80 L26 104 L40 64 L8 40 L48 42 Z" fill="#ffd84a" stroke="#17256b" stroke-width="8" stroke-linejoin="round"/></svg>`, { x: 860, y: 1180, o: lk.o, s: lk.s * 0.8, r: t * 30 });
    return toy;
  }],
  // S6c — pull back: the braking wave travels backwards and the jam begins
  [43.0, 47.6, (t) => {
    toy.hideCars();
    hideAffan();
    for (let i = 0; i < WAVE.n; i++) {
      const x = waveX(t, i);
      showCar(i, x, ZONES.wave, { dist: x, brake: brakeOf(WAVE, t, i) });
    }
    const fx = waveX(43.0, 3);
    const k = easeInOut(inv(43.0, 45.6, t));
    lookCam(cam, V(fx - lerp(4.6, 17, k), lerp(2.0, 13, k), ZONES.wave - lerp(0.55, 2.2, k)), V(fx + lerp(11, -2, k), lerp(0.2, 0, k), ZONES.wave), lerp(27, 52, k));
    toy.shadowAt(V(fx - 4, 0, ZONES.wave));
    // wave front = the car that is starting to brake now
    const front = clamp((t - 35.66) / 1.95, 0, WAVE.n - 2);
    const i0 = Math.floor(front);
    const p0 = scr(V(waveX(t, i0) - 0.6, 0.6, ZONES.wave)), p1 = scr(V(waveX(t, i0 + 1) - 0.6, 0.6, ZONES.wave));
    const fk = front - i0;
    const ax = lerp(p0.x, p1.x, fk), ay = lerp(p0.y, p1.y, fk);
    const ang = (Math.atan2(p1.y - p0.y, p1.x - p0.x) * 180) / Math.PI;
    const g = pop(t, 43.0, 47.55);
    if (g.o > 0 && p0.visible && p1.visible) {
      ov.html('waveArr', ICONS.arrow(RED), { x: clamp(ax + 150, 160, 920), y: clamp(ay, 320, 1360), o: g.o, s: g.s * 0.8, r: ang });
      ov.tag('waveTag', 'GELOMBANG BREK', { x: clamp(ax + 150, 280, 800), y: clamp(ay - 120, 300, 1300), o: g.o, s: g.s }, { bg: RED, small: true });
    }
    const j = pop(t, 46.06, 47.55, { fin: 0.4, from: 2.2 });
    ov.bubble('jem2', 'JEM!', { x: W / 2, y: 420, o: j.o, s: j.s, r: 3 }, { size: 190, top: '#ffb36b', bot: '#ff5a3d' });
    return toy;
  }],
  // S7a — one bus carries many people: 10 cars, 10 people vs 1 bus
  [47.6, 51.0, (t) => {
    toy.hideCars();
    hideAffan();
    const z0 = ZONES.bus - 0.38, z1 = ZONES.bus + 0.38;
    const crawl = 0.35 * (t - 47.6);
    for (let i = 0; i < 10; i++) {
      const x = 4 - i * 1.35 + crawl;
      showCar(i, x, z0, { dist: x, rider: true, brake: 0.6 });
    }
    const bk = easeOut(inv(48.4, 49.6, t));
    const bus = toy.bus;
    bus.visible = true;
    bus.position.set(lerp(-14, 0.6, bk) + crawl, 0, z1);
    bus.userData.update(bus.position.x / TOY);
    bus.userData.people.forEach((p, i) => (p.position.y = 2.25 + 0.12 * Math.abs(Math.sin(t * 6 + i))));
    const k = easeInOut(inv(47.6, 51.0, t));
    lookCam(cam, V(lerp(-13, -11, k), lerp(5.2, 6.2, k), ZONES.bus - lerp(2.2, 1.8, k)), V(lerp(1.5, 2.5, k), 0, ZONES.bus + 0.3), 50);
    toy.shadowAt(V(-2, 0, ZONES.bus));
    const c = pop(t, 47.7, 50.95);
    const mid = scr(V(-2, 0.5, z0));
    if (c.o > 0) {
      ov.tag('cars10', '10 KERETA', { x: clamp(mid.x - 210, 200, 880), y: clamp(mid.y, 320, 1350), o: c.o, s: c.s }, { bg: ORANGE, small: true });
      ov.html('p10', `<div style="display:flex;gap:2px">${Array.from({ length: 10 }, () => ART.person('#ff8a3d')).join('')}</div>`, { x: clamp(mid.x - 210, 320, 760), y: clamp(mid.y + 90, 320, 1350), o: c.o, s: c.s * 0.75 });
    }
    const bt = scr(V(bus.position.x + 0.4, 0.8, z1));
    pinTag('bus1', '1 BAS', bt, t, 48.98, 50.95, { bg: BLUE, pointer: 'down' }, -110);
    const r = pop(t, 49.88, 50.95);
    ov.tag('ramai', 'RAMAI ORANG!', { x: W / 2, y: 340, o: r.o, s: r.s }, { bg: BLUE });
    return toy;
  }],
  // S7b — LRT glides overhead; fewer cars on the road, traffic flows
  [51.0, 55.8, (t) => {
    toy.hideCars();
    hideAffan();
    const z0 = ZONES.bus - 0.38, z1 = ZONES.bus + 0.38;
    const flow = (tt) => 0.35 * (tt - 47.6) + 2.6 * Math.max(0, tt - 54.0) ** 1.2;
    for (let i = 0; i < 10; i++) {
      const keep = i % 3 === 0;
      const gone = keep ? 1 : 1 - easeInOut(inv(53.7 + (i % 3) * 0.12, 54.3 + (i % 3) * 0.12, t));
      const x = 4 - i * 1.35 + flow(t);
      showCar(i, x, z0, { dist: x, rider: true, brake: t < 54 ? 0.6 : 0, s: gone });
    }
    const bus = toy.bus;
    bus.visible = true;
    bus.position.set(0.6 + flow(t), 0, z1);
    bus.userData.update(bus.position.x / TOY);
    const tr = toy.train;
    tr.position.x = 3.5 + (t - 53.0) * 7.5; // first car passes the middle of the frame as "LRT" is said
    const k = easeInOut(inv(51.0, 52.6, t));
    const fx = 0.5 * flow(t);
    lookCam(cam, V(lerp(-11, -4.5, k) + fx, lerp(6.2, 2.8, k), ZONES.bus - lerp(1.8, 8.5, k)), V(lerp(2.5, 1.0, k) + fx, lerp(0, 1.9, k), ZONES.bus + lerp(0.3, 1.0, k)), 52);
    toy.shadowAt(V(flow(t), 0, ZONES.bus));
    const trainScr = scr(V(tr.position.x - 4.4, 4.9, ZONES.bus + 2.2));
    pinTag('lrt', 'LRT', trainScr, t, 52.72, 55.75, { bg: '#1f6fd6', pointer: 'down' }, -90);
    const busScr = scr(V(bus.position.x + 0.4, 0.8, z1));
    pinTag('bas2', 'BAS', busScr, t, 52.02, 55.75, { bg: BLUE, pointer: 'down', small: true }, -100);
    const kk = pop(t, 54.06, 55.75);
    ov.tag('kurang', 'KURANG KERETA', { x: 440, y: 1240, o: kk.o, s: kk.s }, { bg: GREEN });
    ov.html('chk', ART.check(), { x: 850, y: 1240, o: pop(t, 55.02, 55.75).o, s: pop(t, 55.02, 55.75).s * 0.8 });
    if (t > 54.2) ov.speedLines(t, { y0: 1050, y1: 1350, n: 10, a: 0.35 * inv(54.2, 54.6, t), dir: 1 });
    return toy;
  }],
  // S8 — the "aha" moment: three reasons
  [55.8, 63.6, (t) => {
    toy.hideCars();
    for (let i = 0; i < 9; i++) {
      const x = CX0 + 6 - i * 1.25 + 0.3 * Math.sin(t * 0.6 + i);
      showCar(i, x, ZONES.crowd, { dist: x, brake: 0.8 });
    }
    const ax = AFF_SPOTS.aha[0];
    const jump = t > 55.98 && t < 56.55 ? Math.sin(((t - 55.98) / 0.57) * Math.PI) * 0.45 : 0;
    const up = keys(t, [[55.9, 0], [56.1, 1], [56.7, 1], [57.0, 0]]);
    const cnt = t > 59.4 ? keys(t, [[59.4, 0], [59.7, 1], [63.6, 1]]) : 0;
    toyAffan(ax, AFF_SPOTS.aha[1], {
      yaw: Math.PI, blink: t > 55.9 && t < 56.8 ? 0 : blinkAt(t, 6), talk: talk(t), bob: jump,
      wow: keys(t, [[55.9, 0], [56.05, 1], [56.8, 1], [57.1, 0]]), brow: keys(t, [[55.9, 0], [56.05, 1], [58, 0.5]]), smile: 1,
      legL: { x: -0.25 * jump, knee: 0.6 * jump }, legR: { x: -0.25 * jump, knee: 0.6 * jump },
      headYaw: 0.08 * wobble(t, 4), lookX: 0.1,
      armL: { reach: [lerp(0.55, 0.85, up), lerp(0.25, 1.85, up), lerp(0.1, 0.3, up)], pole: [1, -0.4, -0.5] },
      armR: cnt > 0 ? { reach: [lerp(-0.55, -0.62, cnt), lerp(0.25, 1.45, cnt), lerp(0.1, 0.5, cnt)], point: cnt, pole: [-1, -0.8, -0.3] } : { reach: [lerp(-0.55, -0.85, up), lerp(0.25, 1.85, up), lerp(0.1, 0.3, up)], pole: [-1, -0.4, -0.5] },
    });
    const k = easeOut(inv(55.8, 63.6, t));
    lookCam(cam, V(ax + 0.2, 3.3, ZONES.crowd - lerp(5.6, 6.6, k)), V(ax, lerp(1.6, 1.25, k), ZONES.crowd + 6), 50);
    toy.shadowAt(V(ax, 0, ZONES.crowd));
    const head = scr(V(ax, 4.4 + jump, AFF_SPOTS.aha[1]));
    const b = pop(t, 56.1, 63.55);
    ov.html('bulb', ICONS.bulb(), { x: clamp(head.x + 260, 200, 900), y: clamp(head.y - 80, 330, 900) + Math.sin(t * 5) * 8, o: b.o, s: b.s * 0.7, r: 10 });
    ov.sparkles(t, { n: 30, seed: 12, y: 250, h: 900, a: inv(56.0, 56.4, t) * (1 - inv(58.5, 59.2, t)) });
    const c1 = pop(t, 59.48, 63.55), c2 = pop(t, 61.26, 63.55), c3 = pop(t, 62.36, 63.55);
    card('r1', ART.car(), 'BANYAK KERETA', ORANGE, { x: W / 2, y: 1010, o: c1.o, s: c1.s * 0.95 });
    card('r2', ART.funnel(), 'JALAN SEMPIT', '#7b5cff', { x: W / 2, y: 1150, o: c2.o, s: c2.s * 0.95 });
    card('r3', ART.brake(), 'BREK MENGEJUT', RED, { x: W / 2, y: 1290, o: c3.o, s: c3.s * 0.95 });
    return toy;
  }],
  // S9 — back in the car: thumbs-up, then "what next?"
  [63.6, 69.5, (t) => {
    cityAt(t);
    interior(true);
    const th = keys(t, [[64.3, 0], [64.65, 1], [66.6, 1], [66.95, 0]]);
    const tk = keys(t, [[66.95, 0], [67.35, 1], [69.5, 1]]);
    const upP = POSES.thumbsUpR.armR, th2 = POSES.thinkR.armR;
    const rest = seatedRest.armR.reach;
    let armR = {};
    if (th > 0) armR = { reach: rest.map((r, i) => lerp(r, upP.reach[i], th)), pole: upP.pole, thumb: th, wy: upP.wy * th, wx: upP.wx * th };
    else if (tk > 0) armR = { reach: rest.map((r, i) => lerp(r, th2.reach[i], tk)), pole: th2.pole, point: tk, wx: th2.wx * tk };
    carAffan(t, {
      headYaw: -0.12 + 0.05 * wobble(t, 2), smile: 1, brow: 0.3 + 0.4 * tk,
      headRoll: -0.12 * tk, lookX: 0.35 * tk, lookY: 0.4 * tk, headPitch: -0.08 * tk,
      armR,
    });
    const k = easeInOut(inv(63.6, 69.5, t));
    lookCam(cam, carLocal(lerp(0.42, 0.24, k), 1.55, lerp(-0.22, -0.36, k)), carLocal(-0.92, 1.42, -0.45), 50);
    ov.flash((1 - inv(63.6, 63.9, t)) * 0.9);
    if (th > 0.5) {
      const hand = scr(city.aff.parts.arms.R.hand.getWorldPosition(V(0, 0, 0)));
      ov.sparkles(t, { n: 12, seed: 33, x: hand.x - 160, y: hand.y - 200, w: 320, h: 300, a: inv(64.5, 64.9, t) * (1 - inv(66.4, 66.8, t)), size: 30 });
    }
    const head = scr(carLocal(...AFF_HEAD_LOCAL));
    [[67.3, -260, -230, '#ffcf33', -12], [67.6, 250, -280, '#3fa2ff', 10], [67.9, 300, -60, '#ffcf33', 14]].forEach(([a, dx, dy, c, r], i) => {
      const q = pop(t, a, 69.45);
      ov.html('q' + i, ICONS.qmark(c), { x: head.x + dx, y: head.y + dy + Math.sin(t * 3 + i) * 10, o: q.o, s: q.s * 0.85, r });
    });
    return city;
  }],
  // Outro — The Curious Affan logo
  [69.5, STORY_END, (t) => {
    const k = easeOut(inv(69.5, 70.2, t));
    outro.aff.root.position.set(0, 0, 0);
    outro.aff.pose({ ...POSES.thinkR, armR: { ...POSES.thinkR.armR }, smile: 1, blink: blinkAt(t, 9), headRoll: -0.08, lookX: 0.25, lookY: 0.15, headYaw: 0.08 });
    lookCam(cam, V(0, 2.6, lerp(7.5, 5.4, k)), V(0, 2.3, 0), 40);
    const hc = scr(V(0, 2.95, 0));
    ov.flash(1 - inv(69.5, 69.85, t));
    const g = ov.g;
    const ra = inv(69.6, 70.2, t);
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
    const ic = pop(t, 70.1, 99);
    ov.html('oBulb', ICONS.bulb(), { x: 175, y: 470 + Math.sin(t * 2) * 8, o: ic.o, s: ic.s * 0.55, r: -10 });
    ov.html('oQ1', ICONS.qmark('#ffcf33'), { x: 880, y: 420 + Math.sin(t * 2 + 1) * 8, o: ic.o, s: ic.s * 0.9, r: 12 });
    ov.html('oQ2', ICONS.qmark('#2f6fff'), { x: 220, y: 720 + Math.sin(t * 2 + 2) * 8, o: ic.o, s: ic.s * 0.6, r: -12 });
    const l1 = pop(t, 69.8, 99), l2 = pop(t, 70.0, 99), l3 = pop(t, 70.2, 99);
    drawLogo(ov, { k: [l1, l2, l3], star: pop(t, 70.4, 99) });
    return outro;
  }],
];

function renderWorld(world) {
  if (world.sky) world.sky.position.copy(cam.position);
  if (world === city) city.placeSun(cam);
  renderer.render(world.scene, cam);
}

function frame(t) {
  ov.begin();
  cam.aspect = W / H;
  cam.updateProjectionMatrix();
  REAL_T = t;
  const u = storyAt(t);
  const shot = SHOTS.find(([a, b]) => u >= a && u < b) || SHOTS[SHOTS.length - 1];
  toy.bus.visible = false;
  const world = shot[2](u);
  renderWorld(world);
  if (world !== outro) ov.vignette(0.28);
  ov.captions(t, CAPTIONS, KEYWORDS);
  ov.end();
}

// Cover / thumbnail (9:16): Affan in the car, fed up with the jam outside
// (brake lights everywhere), big title, episode badge and the series logo.
// Key elements stay inside the centre 3:4 area (y 240-1680) that grids show.
const THUMB = { cam: [0.12, 1.58, 0.5], look: [-0.98, 1.43, -0.52], fov: 50, yaw: -0.95 };
window.setThumb = (o) => Object.assign(THUMB, o);
function thumbnail() {
  ov.begin();
  cam.aspect = W / H;
  cam.updateProjectionMatrix();
  const t = 6.2;
  cityAt(t);
  interior(true);
  carAffan(t, {
    headYaw: THUMB.yaw, headPitch: -0.04, blink: 0, talk: 0.35, wow: 0.0, brow: 1, lookX: -0.3, lookY: 0.05, smile: 0.3,
    armL: { reach: [0.8, 0.95, 0.5], pole: [1, -1, -0.6] },
    armR: { reach: [-0.8, 0.95, 0.5], pole: [-1, -1, -0.6] },
  });
  lookCam(cam, carLocal(...THUMB.cam), carLocal(...THUMB.look), THUMB.fov);
  const key = new THREE.PointLight(0xffe2c4, 1.6, 3, 2);
  key.position.copy(carLocal(-0.4, 1.75, 0.25));
  city.scene.add(key);
  renderWorld(city);
  city.scene.remove(key);
  const g = ov.g;
  const top = g.createLinearGradient(0, 0, 0, 780);
  top.addColorStop(0, 'rgba(10,20,60,0.8)');
  top.addColorStop(1, 'rgba(10,20,60,0)');
  g.fillStyle = top;
  g.fillRect(0, 0, W, 780);
  const bot = g.createLinearGradient(0, H - 900, 0, H);
  bot.addColorStop(0, 'rgba(10,20,60,0)');
  bot.addColorStop(1, 'rgba(10,20,60,0.8)');
  g.fillStyle = bot;
  g.fillRect(0, H - 900, W, 900);
  ov.vignette(0.3);
  ov.tag('thBadge', 'EPISOD 21', { x: W / 2, y: 300 }, { bg: '#2f7bff', small: true });
  ov.bubble('thTitle', 'KENAPA\nJALAN JEM?', { x: W / 2, y: 490, r: -2 }, { size: 132 });
  ov.html('thClock', ART.clock(2.2), { x: 150, y: 820, r: -12, s: 0.75 });
  ov.html('thQ', ICONS.qmark('#ffcf33'), { x: 930, y: 800, r: 14, s: 0.8 });
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
