// THE CURIOUS AFFAN — Episode 029: "Tahi Bintang Tu Bintang Jatuh Ke?"
// Every shot is a pure function of time t (seconds), synced to audio/narration.mp3.
import * as THREE from 'three';
import { makeRenderer, loadEnvelope, toScreen, clamp, lerp, inv, easeOut, easeInOut, keys, wobble, rng, W, H } from '../../shared/core.js';
import { POSES, blinkAt } from '../../shared/affan.js';
import { Overlay, pop, ICONS, drawLogo } from '../../shared/overlay.js';
import { CAPTIONS, KEYWORDS } from './captions.js';
import { buildMeteorRoad, buildSpace, buildOutro, flyMeteor, carX, CAR_SPEED, cometAt, earthOnOrbit, CROSS_THETA, BIG } from './worlds.js';

const FPS = 30;
const DURATION = 62.1;
const OUTRO = 58.9;

const stage = document.getElementById('stage');
const canvas = document.createElement('canvas');
stage.appendChild(canvas);
const renderer = makeRenderer(canvas);
const ov = new Overlay(stage);
const road = buildMeteorRoad();
const sp = buildSpace();
const outro = buildOutro();
const cam = new THREE.PerspectiveCamera(50, W / H, 0.02, 6000);
let env = { at: () => 0 };
let clearR = 3; // props closer than this to the camera are hidden (road world)

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const talk = (t) => clamp(env.at(t) * 1.2);
const scr = (p) => toScreen(p, cam);
const mix3 = (a, b, k) => a.map((v, i) => lerp(v, b[i], k));
const YELLOW = '#f5b300', BLUE = '#2f9bff', ORANGE = '#ff8a3d', PURPLE = '#8a6cf0', RED = '#ff5a3d';

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
}
// A point far away in the sky, along a car-local direction, as seen at time tRef.
function skyPt(tRef, dl, dist = 500) {
  const d = V(-dl[0], dl[1], -dl[2]).normalize(); // car is rotated 180 degrees
  return V(carX(tRef), 0, 1.6).addScaledVector(d, dist);
}
function roadMoon(tRef, dl) {
  road.moon.position.copy(skyPt(tRef, dl, 750));
  const c = road.car.position;
  road.moonLight.target.position.copy(c);
  road.moonLight.position.copy(c).addScaledVector(road.moon.position.clone().sub(c).normalize(), 80);
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
const MOON1 = [-0.35, 0.2, -0.97];
// Shooting stars seen from the car: [start, duration, from (car-local dir), to]
const SKY_METEORS = [
  [2.55, 0.75, [-0.05, 0.42, -0.9], [-0.5, 0.26, -0.83]],
  [4.3, 0.6, [-0.6, 0.45, -0.66], [-0.85, 0.3, -0.45]],
];
// Meteor shower radiating from one point, for the "17 November" shot
const R0 = rng(17);
const RADIANT = [-0.25, 0.55, -0.8];
const SHOWER = Array.from({ length: 30 }, (_, i) => {
  const a = R0() * Math.PI * 2, s = 0.06 + R0() * 0.12;
  const from = [RADIANT[0] + Math.cos(a) * s, RADIANT[1] + Math.sin(a) * s * 0.7, RADIANT[2]];
  const to = [from[0] + Math.cos(a) * 0.22, from[1] + Math.sin(a) * 0.16, from[2]];
  return [51.6 + i * 0.2 + R0() * 0.15, 0.45 + R0() * 0.25, from, to];
});
function skyMeteors(t, list, tRef, maxLen = 95) {
  road.meteors.forEach((m, i) => m.userData.update(V(), V(0, 1, 0), 0, 0));
  let n = 0;
  for (const [t0, dur, a, b] of list) {
    if (t < t0 - 0.01 || t > t0 + dur * 1.4) continue;
    if (n >= road.meteors.length) break;
    flyMeteor(road.meteors[n++], t, t0, dur, skyPt(tRef, a), skyPt(tRef, b), maxLen);
  }
}

// --------------------------------------------------------------- space helpers
const AFF_SPACE = V(0, -1.8, 60);
function spaceAffan(t, pos, p = {}) {
  sp.aff.root.position.copy(pos);
  sp.aff.root.position.y += 0.12 * Math.sin(t * 1.6); // floating
  sp.aff.pose({ blink: blinkAt(t, 2), talk: talk(t), smile: 0.9, legL: { x: -0.25, knee: 0.4 }, legR: { x: 0.15, knee: 0.25 }, tilt: 0.04 * Math.sin(t * 1.1), ...p });
}
const cometTheta = (t) => keys(t, [[26.3, -1.45], [28.6, 0.0], [30.5, 2.25], [37, 2.75]], (k) => easeInOut(k) * 0.6 + k * 0.4);
// The Earth reaches the comet's dusty path at t = 32.6
const earthPhi = (t) => CROSS_THETA - 0.09 * (32.6 - t);
function diorama(t) {
  const th = cometTheta(t);
  sp.comet.visible = true;
  sp.dustMat.uniforms.uAlpha.value = 1;
  sp.setComet(th);
  sp.dustMat.uniforms.uTheta.value = th;
  sp.dustMat.uniforms.uTime.value = t;
  const e = earthOnOrbit(earthPhi(t));
  sp.earth.position.copy(e);
  sp.earth.rotation.y = t * 0.4;
  return e;
}
function hideSpaceBits() {
  sp.aff.root.visible = true;
  sp.comet.visible = false;
  sp.dustMat.uniforms.uAlpha.value = 0;
  sp.grain.visible = false;
  sp.grainTrail.userData.update(V(), V(0, 1, 0), 0, 0);
  sp.meteors.forEach((m) => m.userData.update(V(), V(0, 1, 0), 0, 0));
}
// Tiny meteors in the big Earth's air, behind Affan (for the "meteor" shots)
const R1 = rng(31);
const AIR_METEORS = Array.from({ length: 40 }, (_, i) => {
  const x = BIG.x - 11 + R1() * 13, z = -4 - R1() * 9, y = 3.6 + R1() * 2.2;
  return [42.9 + i * 0.21 + R1() * 0.1, 0.4 + R1() * 0.2, V(x, y, z), V(x + 2.0 + R1(), y - 2.6 - R1(), z)];
});
function airMeteors(t, list = AIR_METEORS, maxLen = 4) {
  let n = 0;
  for (const [t0, dur, a, b] of list) {
    if (t < t0 - 0.01 || t > t0 + dur * 1.4) continue;
    if (n >= sp.meteors.length) break;
    flyMeteor(sp.meteors[n++], t, t0, dur, a, b, maxLen);
  }
}

// Grain of dust for the close-up: falls into the air, heats up, burns away.
const G0 = V(BIG.x - 14, 15, 1.5), G1 = V(BIG.x + 5, 2.0, 0);
const GT0 = 36.3, GT1 = 40.6;
const grainPos = (t) => G0.clone().lerp(G1, clamp((t - GT0) / (GT1 - GT0), 0, 1.05));
const alt = (p) => p.distanceTo(V(BIG.x, -BIG.r, 0)) - BIG.r;
function grainHeat(t) {
  return clamp((BIG.air - BIG.r - alt(grainPos(t))) / 2.6) * (1 - inv(40.3, 40.6, t));
}

// --------------------------------------------------------------- overlay bits
const MAGNIFIED = `<svg width="380" height="380" viewBox="0 0 380 380">
  <circle cx="190" cy="190" r="170" fill="#1d1450" stroke="#ffffff" stroke-width="18"/>
  <circle cx="190" cy="190" r="170" fill="none" stroke="#17256b" stroke-width="6"/>
  <path d="M120 210 L150 150 L210 130 L262 165 L270 222 L232 268 L160 270 Z" fill="#9a8a78" stroke="#4a3e33" stroke-width="8" stroke-linejoin="round"/>
  <path d="M150 150 L195 190 L262 165 M195 190 L232 268 M195 190 L120 210" fill="none" stroke="#6e6052" stroke-width="5"/>
  <circle cx="300" cy="96" r="9" fill="#fff6c8"/><circle cx="84" cy="120" r="6" fill="#fff6c8"/><circle cx="96" cy="292" r="7" fill="#9fe0ff"/></svg>`;
const CALENDAR = `<svg width="260" height="270" viewBox="0 0 260 270">
  <rect x="14" y="30" width="232" height="226" rx="30" fill="#ffffff" stroke="#17256b" stroke-width="12"/>
  <path d="M14 60 Q14 30 44 30 H216 Q246 30 246 60 V100 H14 Z" fill="#ff5a6e" stroke="#17256b" stroke-width="12" stroke-linejoin="round"/>
  <rect x="62" y="8" width="20" height="48" rx="10" fill="#17256b"/><rect x="178" y="8" width="20" height="48" rx="10" fill="#17256b"/>
  <text x="130" y="88" text-anchor="middle" font-family="Baloo 2" font-weight="800" font-size="40" fill="#ffffff">NOV</text>
  <text x="130" y="222" text-anchor="middle" font-family="Baloo 2" font-weight="800" font-size="118" fill="#17256b">17</text></svg>`;

// ======================================================================= SHOTS
const SHOTS = [
  // S1 — hook: a shooting star outside the window, Affan points and calls Papa
  [0, 5.3, (t) => {
    roadMoon(0, MOON1);
    roadCar(t);
    interior(true);
    skyMeteors(t, SKY_METEORS, 0);
    const turned = t >= 2.15;
    const look = !turned ? keys(t, [[0, 0.42], [1.9, 0.5]]) : keys(t, [[2.15, 0.6], [2.5, -0.75], [3.9, -0.75], [4.4, 0.55]], easeOut);
    const pt = keys(t, [[2.45, 0], [2.85, 1], [5.0, 1], [5.28, 0]]);
    carAffan(t, {
      headYaw: look, headPitch: turned ? -0.05 : -0.22, lookY: turned ? 0.1 : 0.55, lookX: turned ? 0 : 0.85,
      wow: keys(t, [[2.6, 0], [2.75, 0.9], [3.2, 0.9], [3.5, 0]]), brow: turned ? 0.9 : 0.3, smile: 0.9,
      armL: { reach: mix3(seatedRest.armL.reach, [0.95, 1.25, 0.55], pt), point: pt, pole: [1, -1, -0.8] },
    });
    const cp = keys(t, [[0, [-0.12, 1.54, 0.74]], [5.3, [-0.3, 1.52, 0.6]]], (x) => x);
    lookCam(carLocal(...cp), carLocal(-0.95, 1.5, -0.5), 50);
    const p = pop(t, 0.6, 5.2, { fin: 0.45 });
    ov.bubble('hook', 'BINTANG\nJATUH?', { x: W / 2, y: 420 + Math.sin(t * 3) * 6, o: p.o, s: p.s }, { size: 118 });
    const q = pop(t, 0.9, 5.2);
    ov.tag('ep', 'EPISOD 29', { x: W / 2, y: 268, o: q.o, s: q.s }, { bg: '#2f7bff', small: true });
    return road;
  }],
  // S2 — outside: a bright streak crosses the sky fast, then it is gone
  [5.3, 11.0, (t) => {
    roadMoon(8, [-0.05, 0.3, -1.0]);
    road.moon.position.x = carX(8) + 60;
    roadCar(t);
    interior(false);
    carAffan(t, { headYaw: 1.2, headPitch: -0.35, lookY: 0.5 });
    const cx = carX(t);
    lookCam(V(cx + 1.2, 1.6, -9.5), V(cx - 0.3, 5.2, 0), 52);
    clearR = 7;
    const big = [7.25, 1.6, [0.55, 0.62, -0.58], [-0.6, 0.38, -0.7]];
    skyMeteors(t, [[5.6, 0.5, [0.3, 0.7, -0.65], [0.05, 0.58, -0.8]], big, [9.7, 0.5, [-0.1, 0.55, -0.8], [-0.4, 0.42, -0.8]]], 8, 190);
    const head = road.meteors.find((m) => m.visible);
    const q = pop(t, 7.68, 9.4, { from: 2 });
    ov.bubble('laju', 'LAJU!', { x: W / 2 + 160, y: 820, o: q.o, s: q.s, r: -6 }, { size: 150, top: '#fff3a0', bot: '#ffb21f' });
    const h = pop(t, 10.0, 10.95, { from: 2 });
    ov.bubble('hilang', 'HILANG!', { x: W / 2, y: 430, o: h.o, s: h.s, r: 3 }, { size: 140, top: '#e6dcff', bot: '#8a6cf0' });
    void head;
    return road;
  }],
  // S2c — "Jom ikut Affan cari jawapan!" + magic sparkle swirl
  [11.0, 13.1, (t) => {
    roadMoon(11, [-1, 0.14, -0.3]);
    roadCar(t);
    interior(true);
    skyMeteors(t, [], 11);
    const up = keys(t, [[11.1, 0], [11.35, 1], [12.55, 1], [12.85, 0.6]], easeOut);
    carAffan(t, {
      headYaw: -0.12, smile: 1, brow: 0.6, lookX: 0.05,
      armR: { reach: [lerp(-0.55, -0.6, up), lerp(0.32, 1.95 + 0.06 * Math.sin(t * 14), up), lerp(0.25, 0.35, up)], pole: [-1, -0.3, -0.5] },
    });
    const k = easeInOut(inv(11.0, 13.1, t));
    lookCam(carLocal(lerp(0.3, 0.05, k), 1.56, lerp(-0.25, -0.38, k)), carLocal(...AFF_HEAD_LOCAL), 48);
    ov.swirl(t, W / 2, 820, inv(11.6, 13.0, t));
    ov.flash(inv(12.7, 13.1, t) ** 2);
    return road;
  }],
  // S3a — space: "that is not a star"
  [13.1, 16.2, (t) => {
    hideSpaceBits();
    const wag = keys(t, [[14.7, 0], [15.0, 1], [15.95, 1], [16.2, 0]]);
    const w = POSES.wagR(t).armR;
    spaceAffan(t, AFF_SPACE, {
      smile: 0.8, brow: 0.5, headYaw: wag * 0.14 * Math.sin(t * 8),
      armR: wag > 0 ? { reach: mix3([-0.55, 0.25, 0.1], w.reach, wag), pole: w.pole, point: wag, wz: w.wz * wag } : { reach: [-0.6, 0.3, 0.2] },
    });
    const k = easeOut(inv(13.1, 16.2, t));
    lookCam(V(lerp(2.6, 1.4, k), lerp(3.2, 2.7, k), lerp(68.5, 66.2, k)), V(0.3, 2.0, 60), 50);
    ov.flash(1 - inv(13.1, 13.5, t));
    ov.sparkles(t, { n: 22, seed: 3, y: 250, h: 1000, a: 0.8 * (1 - inv(14, 15, t)) });
    const b = pop(t, 14.74, 16.15, { from: 2 });
    ov.bubble('bukan', 'BUKAN BINTANG!', { x: W / 2 - 30, y: 420, o: b.o, s: b.s, r: -2 }, { size: 112 });
    const x = pop(t, 15.08, 16.15, { from: 2 });
    ov.html('cross', ICONS.cross(), { x: 930, y: 300, o: x.o, s: x.s * 0.5 });
    return sp;
  }],
  // S3b — a star is huge... and very, very far away
  [16.2, 20.45, (t) => {
    hideSpaceBits();
    spaceAffan(t, AFF_SPACE, { yaw: Math.PI, headPitch: -0.1 });
    const k = easeInOut(inv(17.9, 20.2, t));
    const z = lerp(17, 76, k);
    lookCam(V(lerp(1.5, 4.5, k), lerp(1, 4.5, k), z), V(0, lerp(0.5, 1.5, k), 0), lerp(56, 46, k));
    const s = scr(V(0, 0, 0));
    const b = pop(t, 16.74, 17.95, { from: 2 });
    ov.bubble('besar', 'SANGAT BESAR!', { x: W / 2, y: 420, o: b.o, s: b.s }, { size: 116 });
    const a = scr(V(0, 1.6, 60));
    const la = inv(19.3, 19.8, t);
    if (la > 0 && a.visible) {
      const e = easeOut(la);
      ov.dashed(a.x, a.y, lerp(a.x, s.x, e), lerp(a.y, s.y, e), t, { color: '#ffd84a', w: 11, a: la });
    }
    pinTag('bintang', 'BINTANG', s, t, 16.3, 20.4, { bg: YELLOW, pointer: 'down' }, -120);
    const j = pop(t, 19.6, 20.4, { from: 2 });
    ov.bubble('jauh', 'SANGAT JAUH!', { x: W / 2, y: 420, o: j.o, s: j.s }, { size: 116, top: '#bfe8ff', bot: '#3fa2ff' });
    return sp;
  }],
  // S4 — what we see is a speck of space dust, as small as a grain of sand
  [20.45, 26.35, (t) => {
    hideSpaceBits();
    const hold = keys(t, [[20.5, 0], [21.2, 1], [26.35, 1]]);
    spaceAffan(t, AFF_SPACE, {
      smile: 1, brow: 0.5, headPitch: 0.28 * hold, lookY: -0.5 * hold, lookX: -0.25 * hold,
      wow: keys(t, [[23.5, 0], [23.7, 0.7], [24.4, 0.7], [24.7, 0]]),
      armR: { reach: mix3([-0.6, 0.3, 0.2], [-0.25, 0.85, 0.8], hold), pole: [-1, -0.6, -0.4], wx: -0.6 * hold },
    });
    sp.aff.root.updateMatrixWorld(true);
    const hand = sp.aff.parts.arms.R.hand.getWorldPosition(V());
    const g = hand.clone().add(V(0, 0.32 + 0.04 * Math.sin(t * 3), 0.05));
    sp.setGrain(g, 0.25 * hold);
    sp.grain.scale.setScalar(0.5);
    const k = easeInOut(inv(20.45, 26.35, t));
    lookCam(V(lerp(1.8, 1.0, k), lerp(3.4, 3.0, k), lerp(67.5, 65.6, k)), V(0, 2.4, 60), 50);
    const gs = scr(g);
    pinTag('debu', 'DEBU ANGKASA', gs, t, 22.04, 26.3, { bg: ORANGE, pointer: 'down' }, -110);
    if (hold > 0.5) ov.sparkles(t, { n: 8, seed: 5, x: gs.x - 90, y: gs.y - 90, w: 180, h: 180, size: 18, a: hold });
    const kc = pop(t, 23.56, 24.7, { from: 2 });
    ov.bubble('kecil', 'KECIL JE!', { x: W / 2, y: 420, o: kc.o, s: kc.s, r: -3 }, { size: 130 });
    const m = pop(t, 24.96, 26.3, { fin: 0.4 });
    ov.html('mag', MAGNIFIED, { x: 800, y: 430, o: m.o, s: m.s * 0.8 });
    ov.tag('pasir', 'SEBUTIR PASIR', { x: 800, y: 620, o: m.o, s: m.s }, { bg: PURPLE, small: true });
    return sp;
  }],
  // S5 — the dust is left behind by a comet passing close to the Sun
  [26.35, 30.55, (t) => {
    hideSpaceBits();
    sp.aff.root.visible = false;
    const e = diorama(t);
    const k = easeInOut(inv(26.35, 30.55, t));
    lookCam(V(lerp(6, 10, k), lerp(46, 40, k), lerp(30, 34, k)), V(lerp(1, 4, k), 0, lerp(-3, -6, k)), 50);
    pinTag('komet', 'KOMET', scr(sp.comet.position), t, 28.2, 30.5, { bg: '#28b3d6', pointer: 'down' }, -80);
    pinTag('mthr', 'MATAHARI', scr(V(0, 4, 0)), t, 29.78, 30.5, { bg: YELLOW, pointer: 'down' }, -60);
    pinTag('jejak', 'DEBU', scr(cometAt(cometTheta(t) - 0.9)), t, 26.48, 30.5, { bg: ORANGE, pointer: 'down', small: true }, -60);
    void e;
    return sp;
  }],
  // S6 — the Earth passes through the dust; dust rushes into the air
  [30.55, 36.3, (t) => {
    hideSpaceBits();
    sp.aff.root.visible = false;
    const e = diorama(t);
    const k = easeInOut(inv(30.55, 36.0, t));
    const off = V(lerp(8, 4.4, k), lerp(6.5, 2.2, k), lerp(9, 5.6, k));
    lookCam(e.clone().add(off), e.clone().add(V(lerp(-1.5, 0, k), 0, lerp(-1, 0, k))), 50);
    // little streaks hitting the Earth's air from the direction of travel
    const R = rng(4);
    const list = [];
    for (let i = 0; i < 14; i++) {
      const d = V(-0.6 + R() * 1.2, -0.5 + R(), 1).normalize().applyAxisAngle(V(0, 1, 0), earthPhi(t) + Math.PI / 2 + Math.PI);
      list.push([33.3 + i * 0.2 + R() * 0.1, 0.35, e.clone().addScaledVector(d, 3.2), e.clone().addScaledVector(d, 1.52)]);
    }
    airMeteors(t, list, 0.9);
    pinTag('bumi', 'BUMI', scr(e.clone().add(V(0, 1.4, 0))), t, 31.22, 36.25, { bg: '#2f9bff', pointer: 'down' }, -70);
    pinTag('debu2', 'DEBU', scr(cometAt(CROSS_THETA)), t, 32.14, 33.4, { bg: ORANGE, pointer: 'down', small: true }, -60);
    const u = pop(t, 34.26, 36.25);
    const edge = scr(e.clone().add(V(0, 1.55, 0)));
    ov.tag('udara', 'UDARA', { x: clamp(edge.x + 230, 200, 880), y: edge.y + 40, o: u.o, s: u.s }, { bg: '#5fb8ff', small: true });
    const l = pop(t, 35.6, 36.25, { from: 2 });
    ov.bubble('laju2', 'SANGAT LAJU!', { x: W / 2, y: 420, o: l.o, s: l.s, r: -3 }, { size: 116, top: '#fff3a0', bot: '#ffb21f' });
    return sp;
  }],
  // S7 — close-up: the grain falls through the air, gets hot and burns: a line of light
  [36.3, 42.95, (t) => {
    hideSpaceBits();
    sp.aff.root.visible = false;
    const p = grainPos(t);
    const heat = grainHeat(t);
    const dir = G1.clone().sub(G0).normalize();
    if (t < 40.6) {
      sp.setGrain(p, heat);
      sp.grain.scale.setScalar(1);
      sp.grain.rotation.set(t * 3, t * 2.3, 0);
    }
    const trailA = t < 40.6 ? clamp(heat * 1.4) : 1 - inv(41.9, 42.9, t);
    const head = t < 40.6 ? p : grainPos(40.6);
    const len = 14 * clamp(heat * 1.2);
    sp.grainTrail.userData.update(head, dir, t < 40.6 ? len : 14 * clamp(grainHeat(40.29) * 1.2), trailA);
    // camera: follows the grain, then pulls back to show the whole streak
    const kb = easeInOut(inv(38.9, 40.2, t));
    const near = p.clone().add(V(-0.6, 0.7, 3.4));
    const wide = V(BIG.x - 3, 9.5, 24);
    const lookNear = p.clone();
    const lookWide = V(BIG.x - 4, 6.5, 0);
    lookCam(near.lerp(wide, kb), lookNear.lerp(lookWide, kb), 50);
    const gs = scr(p);
    const a = pop(t, 36.4, 38.5);
    if (t < 38.6) ov.tag('debu3', 'DEBU', { x: clamp(gs.x + 160, 200, 880), y: gs.y - 120, o: a.o, s: a.s }, { bg: ORANGE, small: true });
    const air = scr(V(BIG.x - 4, BIG.air - BIG.r - 0.4, 0));
    const u = pop(t, 37.0, 38.6);
    ov.tag('udara2', 'UDARA', { x: 230, y: clamp(air.y, 600, 1300), o: u.o, s: u.s }, { bg: '#5fb8ff', small: true });
    const hp = pop(t, 38.82, 39.55, { from: 2 });
    ov.bubble('panas', 'PANAS!', { x: W / 2 - 80, y: 430, o: hp.o, s: hp.s, r: -4 }, { size: 150, top: '#ffd08a', bot: '#ff7a2f' });
    const tb = pop(t, 39.6, 41.0, { from: 2 });
    ov.bubble('terbakar', 'TERBAKAR!', { x: W / 2 + 40, y: 430, o: tb.o, s: tb.s, r: 3 }, { size: 140, top: '#ffb36b', bot: '#ff3d2e' });
    const mid = scr(grainPos(39.4));
    pinTag('garis', 'GARIS CAHAYA', mid, t, 41.1, 42.9, { bg: YELLOW, pointer: 'down' }, -90);
    return sp;
  }],
  // S8 — that is a shooting star, also called a meteor
  [42.95, 46.75, (t) => {
    hideSpaceBits();
    airMeteors(t);
    const pt = keys(t, [[43.1, 0], [43.5, 1], [46.75, 1]]);
    spaceAffan(t, V(BIG.x - 2.5, 7.4, 3), {
      yaw: 0.25, smile: 1, brow: 0.6, headPitch: 0.15, lookX: -0.4, lookY: -0.3,
      armR: { reach: mix3([-0.6, 0.3, 0.2], [-0.95, 0.75, -0.55], pt), point: pt, pole: [-1, -0.4, 0.4] },
    });
    lookCam(V(BIG.x - 0.2, 10.4, 15.5), V(BIG.x - 3.2, 6.4, -1), 50);
    const tb = pop(t, 43.74, 46.7, { from: 2 });
    ov.bubble('tahi', 'TAHI BINTANG', { x: W / 2, y: 410, o: tb.o, s: tb.s, r: -2 }, { size: 120 });
    const mt = pop(t, 45.6, 46.7, { from: 2 });
    ov.tag('meteor', '= METEOR', { x: W / 2, y: 560, o: mt.o, s: mt.s }, { bg: PURPLE });
    return sp;
  }],
  // S9 — the "aha" moment: a shooting star is burning dust
  [46.75, 51.45, (t) => {
    hideSpaceBits();
    airMeteors(t);
    const jump = t > 46.9 && t < 47.6 ? Math.sin(((t - 46.9) / 0.7) * Math.PI) * 0.5 : 0;
    const up = keys(t, [[46.8, 0], [47.0, 1], [47.6, 1], [47.9, 0]]);
    const idx = keys(t, [[47.85, 0], [48.15, 1], [51.45, 1]]);
    spaceAffan(t, V(BIG.x - 2.5, 7.4 + jump, 3), {
      blink: t > 46.8 && t < 47.8 ? 0 : blinkAt(t, 6), smile: 1,
      wow: keys(t, [[46.8, 0], [46.95, 1], [47.7, 1], [47.95, 0]]), brow: keys(t, [[46.8, 0], [46.95, 1], [49, 0.5]]),
      legL: { x: -0.25 - 0.3 * jump, knee: 0.4 + 0.6 * jump }, legR: { x: -0.25 * jump, knee: 0.6 * jump },
      armL: { reach: [lerp(0.55, 0.85, up), lerp(0.25, 1.85, up), lerp(0.1, 0.3, up)], pole: [1, -0.4, -0.5] },
      armR: idx > 0.01 ? { reach: [lerp(-0.85, -0.5, idx), lerp(1.85, 1.6, idx), lerp(0.3, 0.45, idx)], point: idx, pole: [-1, -0.8, -0.3] } : { reach: [lerp(-0.55, -0.85, up), lerp(0.25, 1.85, up), lerp(0.1, 0.3, up)], pole: [-1, -0.4, -0.5] },
    });
    const k = easeOut(inv(46.75, 51.45, t));
    lookCam(V(BIG.x - 2.3, 10.4, lerp(10.5, 9.4, k)), V(BIG.x - 2.5, 9.3, 3), 50);
    const head = scr(V(BIG.x - 2.5, 11.4 + jump, 3));
    const b = pop(t, 47.0, 51.4);
    ov.html('bulb', ICONS.bulb(), { x: clamp(head.x + 250, 150, 900), y: clamp(head.y - 60, 300, 900) + Math.sin(t * 5) * 8, o: b.o, s: b.s * 0.75, r: 10 });
    const j = pop(t, 49.72, 51.4, { fin: 0.4, from: 2.2 });
    ov.bubble('aha', 'DEBU\nTERBAKAR!', { x: W / 2 - 60, y: 420, o: j.o, s: j.s, r: -2 }, { size: 120, top: '#ffd08a', bot: '#ff7a2f' });
    ov.sparkles(t, { n: 30, seed: 12, y: 250, h: 900, a: inv(46.9, 47.3, t) });
    return sp;
  }],
  // S10a — back in the car: a meteor shower on 17 November
  [51.45, 54.85, (t) => {
    roadMoon(52, [0.45, 0.3, -0.85]);
    roadCar(t);
    interior(false);
    skyMeteors(t, SHOWER, 52, 150);
    carAffan(t, { headYaw: 1.2, headPitch: -0.35, lookY: 0.5 });
    const cx = carX(t);
    const k = easeInOut(inv(51.45, 54.85, t));
    lookCam(V(cx + 1.2, 1.6, lerp(-9.5, -10.5, k)), V(cx - 0.3, lerp(5.6, 6.4, k), 0), 54);
    clearR = 7;
    ov.flash((1 - inv(51.45, 51.75, t)) * 0.9, '20,40,120');
    const c = pop(t, 51.58, 54.8, { fin: 0.4 });
    ov.html('cal', CALENDAR, { x: 200, y: 330, o: c.o, s: c.s * 0.75, r: -8 });
    const h = pop(t, 53.56, 54.8, { from: 2 });
    ov.bubble('hujan', 'HUJAN\nTAHI BINTANG!', { x: W / 2 + 90, y: 440, o: h.o, s: h.s, r: 2 }, { size: 100 });
    return road;
  }],
  // S10b — "Jom tengok sama-sama!" thumbs-up, then "what next?"
  [54.85, OUTRO, (t) => {
    roadMoon(55, [-1, 0.13, -0.33]);
    roadCar(t);
    interior(true);
    skyMeteors(t, [], 55);
    const th = keys(t, [[54.9, 0], [55.25, 1], [56.1, 1], [56.4, 0]]);
    const tk = keys(t, [[56.4, 0], [56.8, 1], [OUTRO, 1]]);
    const up = POSES.thumbsUpR.armR, th2 = POSES.thinkR.armR;
    const rest = seatedRest.armR.reach;
    let armR = {};
    if (th > 0) armR = { reach: mix3(rest, up.reach, th), pole: up.pole, thumb: th, wy: up.wy * th, wx: up.wx * th };
    else if (tk > 0) armR = { reach: mix3(rest, th2.reach, tk), pole: th2.pole, point: tk, wx: th2.wx * tk };
    carAffan(t, {
      headYaw: -0.12 + 0.05 * wobble(t, 2), smile: 1, brow: 0.3 + 0.4 * tk,
      headRoll: -0.12 * tk, lookX: 0.35 * tk, lookY: 0.4 * tk, headPitch: -0.08 * tk,
      armR,
    });
    const k = easeInOut(inv(54.85, OUTRO, t));
    lookCam(carLocal(lerp(0.42, 0.26, k), 1.55, lerp(-0.22, -0.36, k)), carLocal(-0.92, 1.42, -0.45), 50);
    if (th > 0.5) {
      const hand = scr(road.aff.parts.arms.R.hand.getWorldPosition(V()));
      ov.sparkles(t, { n: 12, seed: 33, x: hand.x - 160, y: hand.y - 200, w: 320, h: 300, a: inv(55.1, 55.4, t) * (1 - inv(56.0, 56.3, t)), size: 30 });
    }
    const head = scr(carLocal(...AFF_HEAD_LOCAL));
    [[56.5, -260, -230, '#ffcf33', -12], [56.8, 250, -280, '#3fa2ff', 10], [57.1, 300, -60, '#ffcf33', 14]].forEach(([a, dx, dy, c, r], i) => {
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
  sp.stars.userData.update(t);
  clearR = 3;
  const world = shot[2](t);
  if (world === road) road.clearAround(cam.position, clearR);
  if (world.sky) {
    world.sky.position.copy(cam.position);
    world.stars.position.copy(cam.position);
  }
  renderer.render(world.scene, cam);
  if (world !== outro) ov.vignette(0.32);
  ov.captions(t, CAPTIONS, KEYWORDS);
  ov.end();
}

// Cover / thumbnail (9:16): Affan amazed in the car, pointing at a shooting
// star, with a big title, episode badge and the series logo. Key elements stay
// inside the centre 3:4 area (y 240-1680) that profile grids show.
const THUMB = { cam: [-0.2, 1.5, 0.72], look: [-0.95, 1.62, -0.5], fov: 50, t: 2.95 };
window.setThumb = (o) => Object.assign(THUMB, o);
function thumbnail() {
  ov.begin();
  cam.aspect = W / H;
  cam.updateProjectionMatrix();
  const t = 3.6;
  road.stars.userData.update(t);
  roadMoon(0, MOON1);
  roadCar(t);
  interior(true);
  skyMeteors(THUMB.t, SKY_METEORS, 0);
  carAffan(t, {
    headYaw: -0.7, headPitch: -0.05, blink: 0, talk: 0, wow: 0.85, brow: 1, lookX: -0.1, lookY: 0.1,
    armL: { reach: [0.95, 1.3, 0.55], point: 1, pole: [1, -1, -0.8] },
  });
  lookCam(carLocal(...THUMB.cam), carLocal(...THUMB.look), THUMB.fov);
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
  // a bright shooting star across the window sky
  const sx0 = 1060, sy0 = 600, sx1 = 700, sy1 = 690;
  const sg = g.createLinearGradient(sx0, sy0, sx1, sy1);
  sg.addColorStop(0, 'rgba(255,248,215,0)');
  sg.addColorStop(1, 'rgba(255,248,215,1)');
  g.save();
  g.strokeStyle = sg;
  g.lineCap = 'round';
  g.lineWidth = 14;
  g.shadowColor = '#ffe9a8';
  g.shadowBlur = 30;
  g.beginPath();
  g.moveTo(sx0, sy0);
  g.lineTo(sx1, sy1);
  g.stroke();
  g.restore();
  ov.star(sx1, sy1, 34, 1, '#fff6c8', 0.3);
  ov.tag('thBadge', 'EPISOD 29', { x: W / 2, y: 300 }, { bg: '#2f7bff', small: true });
  ov.bubble('thTitle', 'BINTANG\nJATUH?', { x: W / 2, y: 475, r: -2 }, { size: 128 });
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
