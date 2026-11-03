// THE CURIOUS AFFAN — Episode 013: "Berapakah Tinggi KLCC?"
// Every shot is a pure function of time t (seconds), synced to audio/narration.mp3.
// Facts used: Petronas Twin Towers 452 m (451.9 m), 88 floors, tallest building
// in the world 1998-2004. Comparisons: single-storey house ~5 m -> ~90 houses;
// adult ~1.7 m -> ~266 adults head-to-toe; Affan (5 y) ~1.1 m -> 411 Affans.
import * as THREE from 'three';
import { makeRenderer, loadEnvelope, toScreen, clamp, lerp, inv, easeOut, easeIn, easeInOut, keys, wobble, W, H } from '../../shared/core.js';
import { POSES, blinkAt } from '../../shared/affan.js';
import { Overlay, pop, ICONS, drawLogo, SAFE } from '../../shared/overlay.js';
import { CAPTIONS, KEYWORDS } from './captions.js';
import { buildCity, buildLab, buildOutro, TOWER_H, TOWER_X, STACK_X, HOUSE_H, ADULT_H, KID_H, N_HOUSE, N_ADULT, N_KID } from './worlds.js';

const FPS = 30;
const DURATION = 73.75;

const stage = document.getElementById('stage');
const canvas = document.createElement('canvas');
stage.appendChild(canvas);
const renderer = makeRenderer(canvas);
const ov = new Overlay(stage);
const city = buildCity(renderer);
const lab = buildLab(renderer);
const outro = buildOutro();
const cam = new THREE.PerspectiveCamera(50, W / H, 0.05, 9000);
let env = { at: () => 0 };

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const talk = (t) => clamp(env.at(t) * 1.2);
const scr = (p) => toScreen(p, cam);
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
  ov.tag(id, text, { x: clamp(p.x, 250, 830), y: clamp(p.y + dy, 300, 1500), o: q.o, s: q.s }, style);
}
const BLUE = '#2f7bff', ORANGE = '#ff8a3d', GREEN = '#22b573', PINK = '#ff5fa2', GOLD = '#f2a91c';

// Vertical measuring tape drawn in screen space from world (x, 0, z) to (x, h, z).
function tape(id, x, z, h, t, a, { step = 100, color = '#ffd84a', labels = true, unit = 'm', top = null } = {}) {
  if (a <= 0) return;
  const p0 = scr(V(x, 0, z)), p1 = scr(V(x, h, z));
  if (!p0.visible || !p1.visible) return;
  ov.line(p0.x, p0.y, p1.x, p1.y, { color, w: 10, a });
  for (let m = step; m < h - step * 0.3; m += step) {
    const p = scr(V(x, m, z));
    ov.line(p.x - 22, p.y, p.x + 22, p.y, { color, w: 7, a });
    if (labels && p.y > 300 && p.y < 1520) ov.tag(id + m, `${m} ${unit}`, { x: p.x + (p.x > W / 2 ? -120 : 120), y: p.y, o: a, s: 0.62 }, { bg: '#17256b', small: true });
  }
  ov.line(p1.x - 34, p1.y, p1.x + 34, p1.y, { color, w: 9, a });
  if (top) ov.tag(id + 'top', top, { x: clamp(p1.x - 130, 190, 900), y: clamp(p1.y, 300, 1500), o: a, s: 0.8 }, { bg: '#e8443a', small: true });
}

// Bracket showing the height of one object (house, adult, Affan) in metres.
function bracket(id, x, z, h, label, t, a0, b0, color = '#ffd84a') {
  const q = pop(t, a0, b0);
  if (q.o <= 0) return;
  const k = easeOut(clamp((t - a0) / 0.45));
  const p0 = scr(V(x, 0, z)), p1 = scr(V(x, h * k, z));
  ov.line(p0.x, p0.y, p1.x, p1.y, { color, w: 9, a: q.o });
  ov.line(p0.x - 20, p0.y, p0.x + 20, p0.y, { color, w: 8, a: q.o });
  ov.line(p1.x - 20, p1.y, p1.x + 20, p1.y, { color, w: 8, a: q.o });
  ov.tag(id, label, { x: p0.x + (p0.x > W / 2 ? -115 : 115), y: (p0.y + p1.y) / 2, o: q.o, s: q.s }, { bg: '#17256b', small: true });
}

function counter(id, n, label, t, a, b, bg, y = 400) {
  const q = pop(t, a, b);
  if (q.o <= 0) return;
  ov.bubble(id, String(n), { x: W / 2, y, o: q.o, s: q.s }, { size: 170 });
  ov.tag(id + 'L', label, { x: W / 2, y: y + 150, o: q.o, s: q.s }, { bg });
}

// ---------------------------------------------------------------- city Affan
const CA = city.aff;
function cityAffan(t, p = {}) {
  CA.pose({ blink: blinkAt(t, 1), talk: talk(t), smile: 0.9, ...p });
}
const AFF_C = V(0, 0, -200);
const affHeadC = () => V(AFF_C.x, 0.95, AFF_C.z);

// ----------------------------------------------------------------- lab Affan
const LA = lab.aff;
const ADX = STACK_X + 5; // x of the adult/kid stacks
function labAffan(t, pos, p = {}) {
  LA.root.position.copy(pos);
  LA.pose({ blink: blinkAt(t, 2), talk: talk(t), smile: 0.9, ...p });
}

// Stack counts, keyed to the narration ("satu atas satu... sepuluh... tiga puluh...")
const houseK = (t) => keys(t, [[26.1, 1], [26.45, 2], [27.96, 10], [29.08, 30], [30.32, 60], [31.44, 90]], (k) => k);
const adultK = (t) => keys(t, [[44.48, 1], [45.6, 6], [47.0, 60], [48.2, 170], [49.0, 266]], (k) => k);
const kidK = (t) => keys(t, [[53.2, 0], [53.8, 6], [54.6, 90], [55.4, 300], [55.8, 410]], (k) => k);

// Frame a stack of height h standing next to tower A so ground and top are in view.
function frameStack(h, side = 0, fov = 52) {
  const vis = Math.max(14, h * 1.28 + 4);
  const d = vis / (2 * Math.tan((fov * Math.PI) / 360));
  const lx = lerp(STACK_X - 1, 30, clamp(h / 380));
  const y = vis * 0.42;
  lookCam(V(lx - d * 0.18 + side, y * 0.9 + 1.2, -d - 6), V(lx, y, 0), fov);
}
// Follow the top of a thin stack from the side, looking slightly down it.
function followTop(x, top, fov = 50) {
  const d = 5 + top * 0.42;
  lookCam(V(x - d * 0.3, top + 0.6 + d * 0.12, -d), V(x + d * 0.22, top - d * 0.28, 0), fov);
}

function hideLabStacks() {
  lab.houses.show(0);
  lab.adults.show(0);
  lab.kids.show(0);
}

// ======================================================================= SHOTS
const SHOTS = [
  // S1 — hook: Affan in the park gazes up at the towers, then turns to us
  [0, 5.6, (t) => {
    const turn = easeInOut(inv(2.65, 3.25, t));
    const hop = t > 2.65 && t < 3.25 ? Math.sin(inv(2.65, 3.25, t) * Math.PI) * 0.18 : 0;
    const up = keys(t, [[0.1, 0], [0.5, 1], [2.4, 1], [2.7, 0]]);
    const pt = keys(t, [[3.6, 0], [4.0, 1], [5.6, 1]]);
    CA.root.position.copy(AFF_C);
    cityAffan(t, {
      yaw: lerp(0, Math.PI, turn), bob: hop, wow: keys(t, [[0.1, 0], [0.4, 1], [1.4, 1], [1.8, 0]]), brow: 0.8,
      headPitch: lerp(-0.45, -0.05, turn), lookY: lerp(0.8, 0.1, turn),
      armL: pt > 0 ? { reach: [lerp(0.55, 0.75, pt), lerp(0.25, 2.05, pt), lerp(0.1, -0.35, pt)], point: pt, pole: [1, -0.4, 0.4] } : { reach: [lerp(0.55, 0.95, up), lerp(0.25, 1.75, up), lerp(0.1, 0.25, up)], pole: [1, -0.5, -0.5] },
      armR: { reach: [lerp(-0.55, -0.95, up), lerp(0.25, 1.75, up), lerp(0.1, 0.25, up)], pole: [-1, -0.5, -0.5] },
    });
    const k = easeInOut(inv(0, 5.6, t));
    lookCam(V(lerp(0.55, 0.35, k), lerp(0.5, 0.42, k), lerp(-204.4, -203.4, k)), V(lerp(-2, -1, k), lerp(118, 108, k), 0), lerp(76, 74, k));
    const p = pop(t, 0.12, 5.5, { fin: 0.45 });
    ov.bubble('hook', 'BERAPA TINGGI\nKLCC?', { x: W / 2, y: 430 + Math.sin(t * 3) * 6, o: p.o, s: p.s }, { size: 104 });
    const q = pop(t, 0.5, 5.5);
    ov.tag('ep', 'EPISOD 13', { x: W / 2, y: 280, o: q.o, s: q.s }, { bg: BLUE, small: true });
    if (t > 3.9) {
      const hd = scr(V(AFF_C.x, 1.25, AFF_C.z));
      const qm = pop(t, 4.0, 5.5);
      ov.html('q1', ICONS.qmark('#ffcf33'), { x: hd.x + 230, y: hd.y - 160 + Math.sin(t * 4) * 8, o: qm.o, s: qm.s * 0.8, r: 12 });
    }
    return city;
  }],
  // S2 — crane up tower A: 452 m, 88 floors
  [5.6, 14.45, (t) => {
    CA.root.position.set(0, -100, 0);
    const k = easeInOut(inv(5.6, 11.9, t));
    const y = lerp(25, 430, k);
    const back = keys(t, [[11.6, 0], [14.45, 1]]);
    const d = lerp(150, 330, back);
    lookCam(V(-50 + lerp(55, 90, back), lerp(y, 300, back), -d), V(lerp(-50, -10, back), lerp(y + 40, 330, back), 0), 55);
    const a = pop(t, 5.68, 9.2);
    ov.tag('nm1', 'MENARA BERKEMBAR', { x: W / 2, y: 330, o: a.o, s: a.s }, { bg: BLUE });
    ov.tag('nm2', 'PETRONAS (KLCC)', { x: W / 2, y: 440, o: a.o, s: a.s }, { bg: '#17256b', small: true });
    const m = Math.round(TOWER_H * easeOut(inv(9.52, 11.85, t)));
    const c = pop(t, 9.45, 14.35);
    if (c.o > 0) {
      ov.bubble('mtr', `${m} m`, { x: W / 2, y: 420, o: c.o, s: c.s }, { size: 190, top: '#bfe8ff', bot: '#3fa2ff' });
    }
    tape('tp', -50 + 26, -10, TOWER_H, t, inv(9.3, 9.8, t) * (1 - inv(13.9, 14.4, t)), { step: 100, top: t > 11.85 ? '452 m' : null });
    const f = pop(t, 12.24, 14.35);
    ov.tag('lvl', '88 TINGKAT', { x: W / 2, y: 610, o: f.o, s: f.s }, { bg: ORANGE });
    if (t > 11.8) ov.sparkles(t, { n: 14, seed: 4, x: 200, y: 260, w: 680, h: 420, a: inv(11.8, 12.2, t) * (1 - inv(13.9, 14.4, t)) });
    return city;
  }],
  // S3 — "Tapi, setinggi mana 452 meter tu? Jom ikut Affan ukur!"
  [14.45, 19.95, (t) => {
    CA.root.position.copy(AFF_C);
    const th = keys(t, [[14.6, 0], [15.0, 1], [17.8, 1], [18.2, 0]]);
    const up = keys(t, [[18.3, 0], [18.6, 1], [19.95, 1]], easeOut);
    const t2 = POSES.thinkR.armR;
    cityAffan(t, {
      yaw: Math.PI, brow: 0.3 + 0.5 * th, headRoll: -0.12 * th, lookX: 0.3 * th, lookY: 0.35 * th, smile: 0.7 + 0.3 * up,
      armR: th > 0.01 ? { reach: [lerp(-0.55, t2.reach[0], th), lerp(0.25, t2.reach[1], th), lerp(0.1, t2.reach[2], th)], pole: t2.pole, point: th, wx: t2.wx * th }
        : { reach: [lerp(-0.55, -0.6, up), lerp(0.25, 1.95 + 0.06 * Math.sin(t * 14), up), lerp(0.1, 0.3, up)], pole: [-1, -0.3, -0.5] },
    });
    const k = easeInOut(inv(14.45, 19.95, t));
    lookCam(V(lerp(0.55, 0.35, k), lerp(0.62, 0.7, k), lerp(-202.7, -202.15, k)), V(0, lerp(1.05, 1.0, k), -200), 48);
    const hd = scr(affHeadC());
    [[15.36, -270, -330, '#ffcf33', -12], [15.96, 250, -380, '#3fa2ff', 10], [16.24, 300, -120, '#ffcf33', 14]].forEach(([a, dx, dy, c, r], i) => {
      const q = pop(t, a, 18.2);
      ov.html('tq' + i, ICONS.qmark(c), { x: hd.x + dx, y: hd.y + dy + Math.sin(t * 3 + i) * 10, o: q.o, s: q.s * 0.85, r });
    });
    const b = pop(t, 15.36, 18.2);
    ov.bubble('smana', 'SETINGGI MANA?', { x: W / 2, y: 360, o: b.o, s: b.s, r: -3 }, { size: 112 });
    const j = pop(t, 18.4, 19.9);
    ov.bubble('jom', 'JOM UKUR!', { x: W / 2, y: 380, o: j.o, s: j.s, r: 3 }, { size: 140, top: '#b6ff9a', bot: '#2fbf5f' });
    ov.swirl(t, W / 2, 900, inv(18.8, 19.85, t));
    ov.flash(inv(19.5, 19.95, t) ** 2);
    return city;
  }],
  // S4 — the measuring world: one single-storey house, about 5 m
  [19.95, 24.45, (t) => {
    hideLabStacks();
    const drop = inv(20.4, 20.75, t);
    lab.houses.show(drop > 0 ? lerp(0.01, 1, easeIn(drop)) : 0);
    const ap = V(STACK_X - 5.6, 0, -8);
    const pt = keys(t, [[20.5, 0], [20.85, 1], [23.0, 1], [23.4, 0]]);
    LA.pose({ yaw: Math.PI - 0.5 });
    const hT = LA.toTorso(V(STACK_X - 2, 2.2, -3.5));
    labAffan(t, ap, {
      yaw: Math.PI - 0.5, brow: 0.6, smile: 1, headYaw: keys(t, [[20.3, 0.5], [20.8, -0.5], [23.0, -0.5], [23.5, 0.1]]),
      wow: keys(t, [[20.7, 0], [20.85, 0.8], [21.3, 0]]),
      armL: pt > 0 ? { reach: [lerp(0.55, hT[0], pt * 0.7), lerp(0.25, Math.max(0.8, hT[1]), pt * 0.7), lerp(0.1, hT[2], pt * 0.7)], point: pt, pole: [1, -0.5, -0.4] } : {},
    });
    const k = easeOut(inv(19.95, 24.45, t));
    lookCam(V(lerp(STACK_X - 2.4, STACK_X - 1.6, k), lerp(1.6, 1.9, k), lerp(-29, -26, k)), V(STACK_X - 1.6, 2.2, 0), 54);
    lab.sun.target.position.set(STACK_X - 3, 0, -2);
    lab.sun.position.set(STACK_X - 3 - 120, 260, -2 - 200);
    ov.flash(1 - inv(19.95, 20.35, t));
    const rp = scr(V(STACK_X, 5.6, -3.5));
    pinTag('rumah', 'RUMAH SETINGKAT', rp, t, 20.56, 24.35, { bg: ORANGE, pointer: 'down' }, -70);
    bracket('b5', STACK_X + 4.8, -3.6, HOUSE_H, '≈ 5 m', t, 23.2, 24.35);
    return lab;
  }],
  // S5 — stack the houses: 10... 30... 60... 90! Next to the tower.
  [24.45, 37.7, (t) => {
    hideLabStacks();
    const k = t < 26.1 ? 1 : houseK(t);
    lab.houses.show(k);
    const h = lab.houses.top(k);
    LA.root.position.set(STACK_X - 5.6, 0, -8);
    labAffan(t, LA.root.position.clone(), { yaw: Math.PI - 0.4, headPitch: -0.4, lookY: 0.6, smile: 1 });
    const hold = easeInOut(inv(31.6, 37.7, t));
    if (t < 31.6) {
      frameStack(Math.max(6, h));
      // ease in from the single-house framing of S4
      const w = easeInOut(inv(25.9, 27.4, t));
      if (w < 1) {
        const p = cam.position.clone(), q = new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion).multiplyScalar(30).add(p);
        lookCam(V(STACK_X - 1.6, 1.9, -26).lerp(p, w), V(STACK_X - 1.6, 2.2, 0).lerp(q, w), lerp(54, 52, w));
      }
    }
    else {
      const vis = lerp(N_HOUSE * HOUSE_H * 1.28 + 4, 560, hold);
      const d = vis / (2 * Math.tan((52 * Math.PI) / 360));
      lookCam(V(lerp(30 - d * 0.18, 40, hold), lerp(vis * 0.42 * 0.9, 240, hold), -d - 6), V(lerp(30, 55, hold), vis * 0.42, 0), 52);
    }
    lab.sun.target.position.set(STACK_X, 0, 0);
    lab.sun.position.set(STACK_X - 120, 260, -200);
    const n = Math.min(N_HOUSE, Math.max(1, Math.floor(k)));
    counter('hc', t > 31.4 ? 90 : n, 'RUMAH', t, 26.1, 32.6, ORANGE, 390);
    const b = pop(t, 32.77, 37.6);
    ov.bubble('h90', '≈ 90 RUMAH!', { x: W / 2, y: 330, o: b.o, s: b.s, r: -2 }, { size: 128, top: '#ffd2a8', bot: '#ff7a3d' });
    // the top of the tower: dashed "PUNCAK" line across to the stack
    const la = inv(35.9, 36.4, t);
    if (la > 0) {
      const a = scr(V(STACK_X - 8, TOWER_H, -2)), c = scr(V(TOWER_X[0], TOWER_H, 0));
      ov.dashed(a.x, a.y, c.x, c.y, t, { color: '#ff5f5f', w: 9, a: la });
      ov.tag('pc', 'PUNCAK KLCC', { x: clamp(a.x - 30, 220, 860), y: a.y - 70, o: la, s: 0.8 }, { bg: '#e8443a', small: true });
    }
    tape('tp5', STACK_X - 7, -2, h, t, inv(27.0, 27.5, t) * (1 - inv(37.3, 37.7, t)), { step: h > 160 ? 100 : 50 });
    if (t > 31.44 && t < 33.5) ov.sparkles(t, { n: 22, seed: 9, y: 280, h: 700, a: (1 - inv(32.8, 33.5, t)) });
    return lab;
  }],
  // S6 — now with people: one adult is about 1.7 m
  [37.7, 44.35, (t) => {
    hideLabStacks();
    const pk = inv(40.35, 40.7, t);
    lab.adults.show(pk > 0 ? lerp(0.01, 1, easeIn(pk)) : 0);
    const ap = V(ADX - 1.25, 0, -0.2);
    const look = keys(t, [[37.7, 0], [40.5, 0], [40.9, 0.9], [42.6, 0.9], [43.0, 0]]);
    labAffan(t, ap, {
      yaw: Math.PI - 0.15, smile: 1, brow: 0.5, headYaw: look * 0.8, headPitch: -0.35 * look, lookY: 0.5 * look, lookX: 0.5 * look,
      armR: POSES.waveR(t).armR && t < 39.9 ? POSES.waveR(t).armR : {},
    });
    const k = easeOut(inv(37.7, 44.35, t));
    lookCam(V(lerp(ADX - 1.4, ADX - 1.0, k), lerp(1.05, 1.0, k), lerp(-5.6, -4.6, k)), V(ADX - 0.6, 0.95, 0), 50);
    lab.sun.target.position.set(ADX, 0, 0);
    lab.sun.position.set(ADX - 120, 260, -200);
    ov.flash((1 - inv(37.7, 38.0, t)) * 0.8);
    const q = pop(t, 38.56, 40.3);
    ov.bubble('man', 'MANUSIA PULA!', { x: W / 2, y: 380, o: q.o, s: q.s }, { size: 118, top: '#c8ffd8', bot: '#22b573' });
    const op = scr(V(ADX, 1.95, 0));
    pinTag('od', 'ORANG DEWASA', op, t, 40.4, 44.25, { bg: GREEN, pointer: 'down' }, -80);
    bracket('b17', ADX + 0.55, 0, ADULT_H, '≈ 1.7 m', t, 42.72, 44.25);
    return lab;
  }],
  // S7 — head to toe: 266 adults to reach the top
  [44.35, 51.35, (t) => {
    hideLabStacks();
    const k = adultK(t);
    lab.adults.show(k);
    const top = lab.adults.top(k);
    LA.root.position.set(ADX - 1.25, 0, -0.2);
    labAffan(t, LA.root.position.clone(), { yaw: Math.PI - 0.15, headPitch: -0.6, lookY: 0.9, smile: 1, wow: 0.6 });
    const pull = easeInOut(inv(49.2, 51.35, t));
    if (pull <= 0) followTop(ADX, Math.max(2, top));
    else {
      const d = lerp(5 + top * 0.42, 340, pull);
      lookCam(V(lerp(ADX - d * 0.3, 0, pull), lerp(top + 0.6 + d * 0.12, 300, pull), -d), V(lerp(ADX + d * 0.22, 40, pull), lerp(top - d * 0.28, 260, pull), 0), 50);
    }
    lab.sun.target.position.set(ADX, Math.max(0, top - 10), 0);
    lab.sun.position.set(ADX - 120, Math.max(0, top - 10) + 260, -200);
    const n = Math.min(N_ADULT, Math.max(1, Math.floor(k)));
    counter('ac', n, 'ORANG DEWASA', t, 44.5, 51.25, GREEN, 380);
    const la = inv(48.9, 49.3, t) * (1 - inv(51.0, 51.35, t));
    if (la > 0) {
      const a = scr(V(ADX, TOWER_H, 0)), c = scr(V(TOWER_X[0], TOWER_H, 0));
      if (a.visible && c.visible) ov.dashed(a.x, a.y, c.x, c.y, t, { color: '#ff5f5f', w: 8, a: la });
      ov.sparkles(t, { n: 18, seed: 21, y: 260, h: 600, a: la });
    }
    return lab;
  }],
  // S8 — Affan is shorter: more than 400 Affans! Ramainya!
  [51.35, 58.3, (t) => {
    hideLabStacks();
    lab.adults.show(1);
    const k = kidK(t);
    lab.kids.group.position.set(ADX - 1.25, KID_H, -0.2);
    lab.kids.show(k);
    const top = KID_H + lab.kids.top(k);
    LA.root.position.set(ADX - 1.25, 0, -0.2);
    labAffan(t, LA.root.position.clone(), {
      yaw: Math.PI - 0.15, smile: 1, brow: 0.6, headPitch: t > 53.2 ? -0.15 : 0, wow: keys(t, [[56.9, 0], [57.1, 0.9], [57.9, 0.9], [58.2, 0]]),
      armL: t > 56.8 ? { reach: [0.95, 1.75, 0.3], pole: [1, -0.5, -0.5] } : {}, armR: t > 56.8 ? { reach: [-0.95, 1.75, 0.3], pole: [-1, -0.5, -0.5] } : {},
    });
    if (t < 53.2) {
      const k2 = easeOut(inv(51.35, 53.2, t));
      lookCam(V(lerp(ADX - 0.7, ADX - 0.8, k2), 0.95, lerp(-5.9, -5.5, k2)), V(ADX - 0.6, 0.9, 0), 50);
    } else if (t < 56.0) followTop(ADX - 1.25, Math.max(2.2, top), 50);
    else {
      const p = easeInOut(inv(56.0, 58.3, t));
      const d = lerp(5 + TOWER_H * 0.42, 360, p);
      lookCam(V(lerp(ADX - 1.25 - d * 0.3, 0, p), lerp(TOWER_H + 0.6 + d * 0.12, 310, p), -d), V(lerp(ADX - 1.25 + d * 0.22, 40, p), lerp(TOWER_H - d * 0.28, 260, p), 0), 50);
    }
    lab.sun.target.position.set(ADX, Math.max(0, top - 10), 0);
    lab.sun.position.set(ADX - 120, Math.max(0, top - 10) + 260, -200);
    bracket('b11', ADX - 1.9, -0.2, KID_H, '1.1 m', t, 51.9, 53.15, '#ffb3d1');
    bracket('b17b', ADX + 0.55, 0, ADULT_H, '1.7 m', t, 51.9, 53.15);
    const q = pop(t, 52.2, 53.15);
    ov.bubble('rendah', 'LEBIH RENDAH', { x: W / 2, y: 380, o: q.o, s: q.s, r: -3 }, { size: 112, top: '#ffd6ea', bot: '#ff5fa2' });
    const n = Math.min(N_KID, Math.max(1, Math.floor(k) + 1));
    counter('kc', n, 'AFFAN', t, 53.3, 56.9, PINK, 380);
    const b = pop(t, 54.48, 56.9);
    ov.tag('k400', 'LEBIH 400!', { x: W / 2, y: 690, o: b.o, s: b.s }, { bg: '#17256b' });
    const r = pop(t, 57.0, 58.25, { from: 2 });
    ov.bubble('ramai', 'RAMAINYA!', { x: W / 2, y: 520, o: r.o, s: r.s, r: -4 }, { size: 160, top: '#ffe45c', bot: '#ff7a1f' });
    if (t > 55.8) ov.sparkles(t, { n: 26, seed: 25, y: 260, h: 900, a: inv(55.8, 56.2, t) });
    return lab;
  }],
  // S9 — back in the city: the summary, and "once the tallest in the world"
  [58.3, 64.65, (t) => {
    CA.root.position.set(0, -100, 0);
    const k = easeInOut(inv(58.3, 64.65, t));
    lookCam(V(lerp(-80, -40, k), lerp(40, 70, k), lerp(-700, -620, k)), V(lerp(-110, -90, k), 235, 0), 50);
    ov.flash((1 - inv(58.3, 58.6, t)) * 0.9);
    const rows = [['452 m', 'KLCC', BLUE, 58.45], ['90', 'RUMAH', ORANGE, 58.75], ['266', 'ORANG DEWASA', GREEN, 59.05], ['411', 'AFFAN', PINK, 59.35]];
    rows.forEach(([v, l, c, a], i) => {
      const q = pop(t, a, 61.45);
      const y = 380 + i * 165;
      ov.html('sv' + i, `<div style="display:flex;align-items:center;gap:18px"><div class="tag" style="background:${c};font-size:64px;padding:8px 24px 12px">${i ? '= ' : ''}${v}</div><div class="tag sm" style="background:#17256b">${l}</div></div>`, { x: 410, y, o: q.o, s: q.s });
    });
    const tp = scr(V(-50, TOWER_H + 12, 0));
    const c = pop(t, 61.6, 64.55, { from: 2 });
    if (c.o > 0) {
      ov.html('crown', `<svg width="220" height="160" viewBox="0 0 220 160"><path d="M15 140 L25 40 L75 90 L110 20 L145 90 L195 40 L205 140 Z" fill="#ffd84a" stroke="#17256b" stroke-width="12" stroke-linejoin="round"/><circle cx="110" cy="20" r="14" fill="#ff5f5f" stroke="#17256b" stroke-width="8"/><circle cx="25" cy="40" r="11" fill="#5fc8ff" stroke="#17256b" stroke-width="8"/><circle cx="195" cy="40" r="11" fill="#5fc8ff" stroke="#17256b" stroke-width="8"/></svg>`, { x: clamp(tp.x, 200, 880), y: tp.y - 110 + Math.sin(t * 3) * 6, o: c.o, s: c.s * 0.8, r: -6 });
      ov.bubble('no1', 'PALING TINGGI\nDI DUNIA!', { x: W / 2, y: 1080, o: c.o, s: c.s, r: -2 }, { size: 104 });
      const y = pop(t, 62.3, 64.55);
      ov.tag('yr', 'DULU: 1998 – 2004', { x: W / 2, y: 1300, o: y.o, s: y.s }, { bg: '#17256b', small: true });
      ov.sparkles(t, { n: 16, seed: 31, x: tp.x - 200, y: tp.y - 260, w: 400, h: 300, a: c.o });
    }
    return city;
  }],
  // S10 — Affan: thumbs up, then "what shall we measure next?"
  [64.65, 70.75, (t) => {
    CA.root.position.copy(AFF_C);
    const th = keys(t, [[65.2, 0], [65.55, 1], [67.8, 1], [68.15, 0]]);
    const tk = keys(t, [[68.2, 0], [68.6, 1], [70.75, 1]]);
    const up = POSES.thumbsUpR.armR, t2 = POSES.thinkR.armR;
    let armR = {};
    if (th > 0) armR = { reach: [lerp(-0.55, up.reach[0], th), lerp(0.25, up.reach[1], th), lerp(0.1, up.reach[2], th)], pole: up.pole, thumb: th, wy: up.wy * th, wx: up.wx * th };
    else if (tk > 0) armR = { reach: [lerp(-0.55, t2.reach[0], tk), lerp(0.25, t2.reach[1], tk), lerp(0.1, t2.reach[2], tk)], pole: t2.pole, point: tk, wx: t2.wx * tk };
    cityAffan(t, {
      yaw: Math.PI, smile: 1, brow: 0.3 + 0.4 * tk, headRoll: -0.12 * tk, lookX: 0.35 * tk, lookY: 0.4 * tk, headYaw: 0.05 * wobble(t, 2), armR,
    });
    const k = easeInOut(inv(64.65, 70.75, t));
    lookCam(V(lerp(-0.6, -0.4, k), lerp(0.55, 0.62, k), lerp(-202.9, -202.4, k)), V(0, lerp(1.2, 1.05, k), -200), 52);
    ov.flash((1 - inv(64.65, 64.95, t)) * 0.8);
    const hd = scr(affHeadC());
    if (th > 0.5) ov.sparkles(t, { n: 12, seed: 33, x: hd.x - 380, y: hd.y + 50, w: 360, h: 320, a: inv(65.5, 65.9, t) * (1 - inv(67.6, 68.0, t)), size: 30 });
    const s = pop(t, 65.28, 68.1);
    ov.bubble('tahu', 'DAH TAHU!', { x: W / 2, y: 370, o: s.o, s: s.s, r: -3 }, { size: 130 });
    const m = pop(t, 65.6, 68.1);
    ov.tag('m452', 'KLCC = 452 m', { x: W / 2, y: 540, o: m.o, s: m.s }, { bg: BLUE });
    [[68.4, -270, -300, '#ffcf33', -12], [68.7, 250, -350, '#3fa2ff', 10], [69.0, 300, -100, '#ffcf33', 14]].forEach(([a, dx, dy, c, r], i) => {
      const q = pop(t, a, 70.7);
      ov.html('nq' + i, ICONS.qmark(c), { x: hd.x + dx, y: hd.y + dy + Math.sin(t * 3 + i) * 10, o: q.o, s: q.s * 0.85, r });
    });
    const n = pop(t, 68.32, 70.7);
    ov.bubble('next', 'UKUR APA LEPAS NI?', { x: W / 2, y: 370, o: n.o, s: n.s }, { size: 96 });
    return city;
  }],
  // Outro — The Curious Affan logo
  [70.75, DURATION, (t) => {
    const k = easeOut(inv(70.75, 71.45, t));
    outro.aff.root.position.set(0, 0, 0);
    const th2 = POSES.thinkR.armR;
    outro.aff.pose({ ...POSES.thinkR, armR: { ...th2 }, smile: 1, blink: blinkAt(t, 9), headRoll: -0.08, lookX: 0.25, lookY: 0.15, headYaw: 0.08 });
    lookCam(V(0, 2.6, lerp(7.5, 5.4, k)), V(0, 2.3, 0), 40);
    const hc = scr(V(0, 2.95, 0));
    ov.flash((1 - inv(70.75, 71.1, t)) * 1.0);
    const g = ov.g;
    const ra = inv(70.85, 71.45, t);
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
    const ic = pop(t, 71.35, 99);
    ov.html('oBulb', ICONS.bulb(), { x: 175, y: 470 + Math.sin(t * 2) * 8, o: ic.o, s: ic.s * 0.55, r: -10 });
    ov.html('oQ1', ICONS.qmark('#ffcf33'), { x: 880, y: 420 + Math.sin(t * 2 + 1) * 8, o: ic.o, s: ic.s * 0.9, r: 12 });
    ov.html('oQ2', ICONS.qmark('#2f6fff'), { x: 220, y: 720 + Math.sin(t * 2 + 2) * 8, o: ic.o, s: ic.s * 0.6, r: -12 });
    const l1 = pop(t, 71.05, 99), l2 = pop(t, 71.25, 99), l3 = pop(t, 71.45, 99);
    drawLogo(ov, { k: [l1, l2, l3], star: pop(t, 71.65, 99) });
    return outro;
  }],
];

function frame(t) {
  ov.begin();
  cam.aspect = W / H;
  cam.updateProjectionMatrix();
  const shot = SHOTS.find(([a, b]) => t >= a && t < b) || SHOTS[SHOTS.length - 1];
  lab.sparkles.userData.update(t);
  const world = shot[2](t);
  if (world.sky) world.sky.position.copy(cam.position);
  if (world === city) {
    city.sun.target.position.copy(cam.position).setY(0);
    city.sun.position.copy(city.sun.target.position).add(V(-180, 320, -260));
  }
  renderer.render(world.scene, cam);
  if (world !== outro) ov.vignette(0.28);
  ov.captions(t, CAPTIONS, KEYWORDS);
  ov.end();
}

// Cover / thumbnail (9:16): Affan in the park, amazed, under the towers, with a
// big title, the 452 m answer teaser, the episode badge and the series logo.
// Key elements stay inside the centre 3:4 area (y 240-1680) that profile grids show.
const THUMB = { cam: [0.42, 0.32, -202.1], look: [1.2, 110, 0], fov: 80 };
window.setThumb = (o) => Object.assign(THUMB, o);
function thumbnail() {
  ov.begin();
  cam.aspect = W / H;
  cam.updateProjectionMatrix();
  const t = 4.2;
  CA.root.position.copy(AFF_C);
  CA.pose({
    yaw: Math.PI, blink: 0, talk: 0, wow: 0.9, brow: 1, headPitch: -0.05, lookY: 0.15, lookX: 0.1,
    armL: { reach: [0.75, 2.05, -0.35], point: 1, pole: [1, -0.4, 0.4] },
    armR: { reach: [-0.8, 1.2, 0.45], pole: [-1, -0.5, -0.5] },
  });
  lookCam(V(...THUMB.cam), V(...THUMB.look), THUMB.fov);
  city.sky.position.copy(cam.position);
  city.sun.target.position.copy(cam.position).setY(0);
  city.sun.position.copy(city.sun.target.position).add(V(-180, 320, -260));
  renderer.render(city.scene, cam);
  const g = ov.g;
  const top = g.createLinearGradient(0, 0, 0, 760);
  top.addColorStop(0, 'rgba(10,30,90,0.6)');
  top.addColorStop(1, 'rgba(10,30,90,0)');
  g.fillStyle = top;
  g.fillRect(0, 0, W, 760);
  const bot = g.createLinearGradient(0, H - 900, 0, H);
  bot.addColorStop(0, 'rgba(8,12,44,0)');
  bot.addColorStop(1, 'rgba(8,12,44,0.75)');
  g.fillStyle = bot;
  g.fillRect(0, H - 900, W, 900);
  ov.vignette(0.25);
  ov.tag('thBadge', 'EPISOD 13', { x: W / 2, y: 300 }, { bg: BLUE, small: true });
  ov.bubble('thTitle', 'BERAPA TINGGI\nKLCC?', { x: W / 2, y: 485, r: -2 }, { size: 124 });
  ov.html('thQ', ICONS.qmark('#ffcf33'), { x: 120, y: 790, r: -14, s: 0.9 });
  ov.tag('thH1', 'RUMAH × ?', { x: W / 2 - 170, y: 760, r: -4 }, { bg: ORANGE, small: true });
  ov.tag('thH2', 'ORANG × ?', { x: W / 2 + 180, y: 770, r: 4 }, { bg: GREEN, small: true });
  drawLogo(ov, { cx: 330, y: 1300, scale: 0.46 });
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
