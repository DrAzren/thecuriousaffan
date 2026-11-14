// THE CURIOUS AFFAN — Episode 034: "Kenapa Bayang Kita Jadi Panjang dan Pendek?"
// Every shot is a pure function of time t (seconds), synced to audio/narration.mp3.
import * as THREE from 'three';
import { makeRenderer, loadEnvelope, toScreen, clamp, lerp, inv, easeOut, easeInOut, keys, wobble, W, H } from '../../shared/core.js';
import { POSES, blinkAt } from '../../shared/affan.js';
import { Overlay, pop, ICONS, drawLogo } from '../../shared/overlay.js';
import { CAPTIONS, KEYWORDS } from './captions.js';
import { buildStreet, buildStage, buildRoom, buildOutro, LAMP_HEAD, WALK_Z, STAGE_LAMP, AFF_H } from './worlds.js';

const FPS = 30;
const DURATION = 75.8;
const OUTRO = 72.65;

const stage = document.getElementById('stage');
const canvas = document.createElement('canvas');
stage.appendChild(canvas);
const renderer = makeRenderer(canvas);
const ov = new Overlay(stage);
const street = buildStreet();
const lab = buildStage();
const room = buildRoom();
const outro = buildOutro();
const cam = new THREE.PerspectiveCamera(50, W / H, 0.02, 6000);
let env = { at: () => 0 };

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const talk = (t) => clamp(env.at(t) * 1.2);
const scr = (p) => toScreen(p, cam);
const mix3 = (a, b, k) => a.map((v, i) => lerp(v, b[i], k));
const BLUE = '#2f9bff', YELLOW = '#e0b400', ORANGE = '#ff8a3d', PURPLE = '#7a5cf0', GREEN = '#2fbf5f', PINK = '#ff5c9a';

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

// ------------------------------------------------------------------ walking
// Affan's gait, phase from distance walked so the feet do not slide.
const STEP = 0.36; // world units per step at AFF_SCALE
function gait(dist, amt = 1) {
  const ph = (dist / STEP) * Math.PI;
  const s = Math.sin(ph), c = Math.cos(ph);
  return {
    bob: 0.05 * Math.abs(c) * amt,
    legL: { x: -0.42 * s * amt, knee: Math.max(0, c) * 0.55 * amt },
    legR: { x: 0.42 * s * amt, knee: Math.max(0, -c) * 0.55 * amt },
    armL: { x: 0.45 * s * amt, z: 0.14, el: -0.35 },
    armR: { x: -0.45 * s * amt, z: -0.14, el: -0.35 },
  };
}
// path: [[t, x], ...] -> {x, moving 0..1}
function walkPath(t, path) {
  const x = keys(t, path, (k) => easeInOut(k));
  const dx = keys(t + 0.06, path, (k) => easeInOut(k)) - keys(t - 0.06, path, (k) => easeInOut(k));
  return { x, moving: clamp(Math.abs(dx) / 0.04) };
}
// turn yaw smoothly: walking direction -> facing the camera
function setAff(aff, pos, yaw, p = {}) {
  aff.root.position.copy(pos);
  aff.pose({ yaw, ...p });
  aff.root.updateMatrixWorld(true);
}

// ------------------------------------------------------------------ street
function streetAff(t, x, yaw, p = {}) {
  setAff(street.aff, V(x, 0, WALK_Z), yaw, { blink: blinkAt(t, 2), talk: talk(t), smile: 0.8, ...p });
}
// shadow tip (on the ground) for Affan standing at x on the walking line
const LH = LAMP_HEAD.y - 0.18;
const streetTip = (x) => V(x * LH / (LH - AFF_H), 0.03, WALK_Z);
function horns(k) {
  street.horns.scale.setScalar(Math.max(0.0001, k));
}

// --------------------------------------------------------------- light stage
// Liang–Barsky: where does the segment S->F first enter Affan's box
// [x0, x1] x [0, a] (in the x/y plane)? Returns u in [0,1] or 1 when it misses.
function hitU(S, F, x0, x1, a) {
  const dx = F.x - S.x, dy = F.y - S.y;
  const p = [-dx, dx, -dy, dy];
  const q = [S.x - x0, x1 - S.x, S.y, a - S.y];
  let u1 = 0, u2 = 1;
  for (let i = 0; i < 4; i++) {
    if (Math.abs(p[i]) < 1e-9) {
      if (q[i] < 0) return 1;
    } else {
      const r = q[i] / p[i];
      if (p[i] < 0) u1 = Math.max(u1, r);
      else u2 = Math.min(u2, r);
    }
  }
  return u1 <= u2 && u1 > 0 ? u1 : 1;
}
const _up = V(0, 1, 0), _d = V(), _q = new THREE.Quaternion();
function placeRod(m, from, to, r) {
  _d.subVectors(to, from);
  const len = Math.max(0.0001, _d.length());
  m.position.copy(from);
  m.quaternion.setFromUnitVectors(_up, _d.normalize());
  m.scale.set(r, len, r);
  m.visible = true;
}
const LAB_L = STAGE_LAMP.clone().add(V(0, -0.15, 0));
const labTip = (d) => d * LAB_L.y / (LAB_L.y - AFF_H);
// sun direction (towards the sun) from elevation e (radians), sun on the -x side
const sunDir = (e) => V(-Math.cos(e), Math.sin(e), 0);

// Draw the light rays. opts: { mode: 'lamp'|'sun', d (Affan x), grow (s since start),
// hitGlow 0..1, a (opacity), e (sun elevation), only (array of floor x) }
function labRays(t, { mode = 'lamp', d = 2.6, grow = 99, hitGlow = 0, a = 1, e = 1.3, fan = null } = {}) {
  const R = lab.rays, P = lab.photons;
  R.forEach((m) => (m.visible = false));
  P.forEach((s) => (s.visible = false));
  lab.hits.forEach((s) => (s.visible = false));
  if (a <= 0.01) return;
  const w = 0.17;
  const floorXs = fan || (mode === 'lamp' ? Array.from({ length: R.length }, (_, i) => LAB_L.y * Math.tan(lerp(-1.18, 1.18, i / (R.length - 1)))) : Array.from({ length: R.length }, (_, i) => lerp(-5.5, 10.5, i / (R.length - 1))));
  let hi = 0;
  floorXs.forEach((xf, i) => {
    if (i >= R.length) return;
    const F = V(xf, 0.02, 0);
    const S = mode === 'lamp' ? LAB_L.clone() : F.clone().addScaledVector(sunDir(e), 9);
    const u = hitU(S, F, d - w, d + w, AFF_H * 0.98);
    const end = S.clone().lerp(F, u);
    const full = S.distanceTo(end);
    const len = Math.min(full, grow * 9);
    if (len < 0.01) return;
    const to = S.clone().add(end.clone().sub(S).normalize().multiplyScalar(len));
    placeRod(R[i], S, to, 0.018);
    R[i].material.opacity = 0.75 * a;
    R[i].material.color.setHex(u < 1 && hitGlow > 0 ? 0xffb050 : 0xffe27a);
    for (let k = 0; k < 2; k++) {
      const uu = (t * 0.55 + i * 0.37 + k * 0.5) % 1;
      const pd = uu * full;
      if (pd > len) continue;
      const s = P[i * 2 + k];
      s.position.copy(S).add(end.clone().sub(S).normalize().multiplyScalar(pd));
      s.material.opacity = a;
      s.visible = true;
    }
    if (u < 1 && full <= len + 0.01 && hi < lab.hits.length && hitGlow > 0) {
      const h = lab.hits[hi++];
      h.position.copy(end);
      h.scale.setScalar(0.35 + 0.15 * Math.sin(t * 12 + i));
      h.material.opacity = hitGlow;
      h.visible = true;
    }
  });
}
function labKey(on, from, d, color = 0xff7a2a) {
  const k = lab.keyRay;
  if (on <= 0.01) {
    k.visible = false;
    return null;
  }
  // ray from the light through the top of the head to the floor
  const head = V(d, AFF_H, 0);
  const tip = from.clone().addScaledVector(head.clone().sub(from), (from.y - 0.02) / (from.y - head.y));
  placeRod(k, from, tip, 0.04);
  k.material.opacity = on;
  k.material.color.setHex(color);
  return tip;
}
function labHL(k, x0, x1) {
  const m = lab.shadowHL;
  m.visible = k > 0.01 && x1 - x0 > 0.01;
  if (!m.visible) return;
  m.position.set(x0, 0.025, 0);
  m.scale.set(x1 - x0, 0.75, 1);
  m.material.opacity = 0.42 * k;
}
function labAff(t, d, yaw, p = {}) {
  setAff(lab.aff, V(d, 0, 0), yaw, { blink: blinkAt(t, 4), talk: talk(t), smile: 0.85, ...p });
}
function labReset() {
  lab.setMode(0);
  lab.keyRay.visible = false;
  lab.shadowHL.visible = false;
  lab.sun.visible = false;
}
// screen-space bracket under a stretch of floor, with a label
function bracket(id, x0, x1, t, a, b, label, bg = PURPLE, size = 1) {
  const q = pop(t, a, b);
  if (q.o <= 0) return;
  const p0 = scr(V(x0, 0, 0.7)), p1 = scr(V(x1, 0, 0.7));
  const y = Math.min(1250, Math.max(p0.y, p1.y) + 40);
  ov.line(p0.x, y, p1.x, y, { color: '#ffd84a', w: 10, a: q.o });
  ov.line(p0.x, y - 26, p0.x, y + 26, { color: '#ffd84a', w: 10, a: q.o });
  ov.line(p1.x, y - 26, p1.x, y + 26, { color: '#ffd84a', w: 10, a: q.o });
  if (label) ov.tag(id, label, { x: clamp((p0.x + p1.x) / 2, 200, 880), y: y + 62, o: q.o, s: q.s * size }, { bg, small: true });
}
// angle arc at the lamp between straight down and the key ray
function angleArc(from, tip, k, label, t) {
  if (k <= 0.01) return;
  const c = scr(from), dn = scr(from.clone().add(V(0, -1, 0))), tp = scr(tip);
  const a0 = Math.atan2(dn.y - c.y, dn.x - c.x), a1 = Math.atan2(tp.y - c.y, tp.x - c.x);
  const g = ov.g;
  g.save();
  g.globalAlpha = k;
  g.lineWidth = 14;
  g.strokeStyle = '#ffffff';
  g.beginPath();
  g.arc(c.x, c.y, 150, Math.min(a0, a1), Math.max(a0, a1));
  g.stroke();
  g.lineWidth = 8;
  g.strokeStyle = '#ff7a2a';
  g.stroke();
  g.setLineDash([16, 14]);
  g.lineWidth = 6;
  g.strokeStyle = 'rgba(255,255,255,0.85)';
  g.beginPath();
  g.moveTo(c.x, c.y);
  g.lineTo(dn.x + (dn.x - c.x) * 2.2, c.y + (dn.y - c.y) * 3.2);
  g.stroke();
  g.restore();
  const mid = (a0 + a1) / 2;
  if (label) ov.tag('arcLbl', label, { x: clamp(c.x + Math.cos(mid) * 250, 200, 880), y: c.y + Math.sin(mid) * 240, o: k, s: 0.85 }, { bg: ORANGE, small: true });
}

// --------------------------------------------------------------------- room
const A_ROOM = V(0.6, 0, 0.7);
const SQUAT = -0.38; // root drop while squatting
const TOY = A_ROOM.clone().add(V(-0.8, 0, 0.55));
// torch lens positions and where they point
const LENS_REST = { p: A_ROOM.clone().add(V(-0.45, 0.75, 0.65)), at: TOY.clone().add(V(0.3, 0, 0.3)) };
const LENS_TOP = { p: TOY.clone().add(V(0.0, 1.65, 0.02)), at: TOY.clone() };
const LENS_SIDE = { p: TOY.clone().add(V(0.62, 1.28, 0.04)), at: TOY.clone().add(V(-0.75, 0, 0)) };
const squatLegs = { legL: { x: -1.1, knee: 2.0 }, legR: { x: -1.1, knee: 2.0 } };
function roomAff(t, lens, p = {}) {
  const a = room.aff;
  a.root.position.copy(A_ROOM).add(V(0, SQUAT, 0));
  // torch body sits 0.3 behind the lens, along the aim
  const dir = lens.at.clone().sub(lens.p).normalize();
  room.torch.position.copy(lens.p).addScaledVector(dir, -0.3);
  room.torch.lookAt(lens.p.clone().add(dir));
  room.torch.updateMatrixWorld(true);
  room.spot.target.position.copy(lens.at);
  room.spot.target.updateMatrixWorld(true);
  const base = { yaw: 0, lean: 0.22, blink: blinkAt(t, 1), talk: talk(t), smile: 0.9, ...squatLegs, armL: { reach: [0.55, 0.35, 0.55], pole: [1, -0.6, -0.3] } };
  a.pose({ ...base, ...p });
  a.root.updateMatrixWorld(true);
  const grip = room.torch.position.clone().addScaledVector(dir, -0.12);
  a.pose({ ...base, ...p, armR: { reach: a.toTorso(grip), pole: [-1, -0.6, -0.4] } });
  a.root.updateMatrixWorld(true);
}
const lensMix = (A, B, k) => ({ p: A.p.clone().lerp(B.p, k), at: A.at.clone().lerp(B.at, k) });

// ======================================================================= SHOTS
const SHOTS = [
  // S1 — a quiet street at night; Affan under a street lamp
  [0, 2.6, (t) => {
    horns(0);
    streetAff(t, 0.15, Math.PI, { ...(t > 1.2 ? POSES.waveR(t) : {}), headPitch: -0.05, smile: 1 });
    camMove(t, 0, 2.6, [2.4, 2.6, 0.6], [0.2, 2.5, 8.2], [1.7, 2.2, 2.0], [0.2, 2.1, 8.2], 50);
    const q = pop(t, 0.4, 2.55);
    ov.tag('ep', 'EPISOD 34', { x: W / 2, y: 268, o: q.o, s: q.s }, { bg: '#2f7bff', small: true });
    pinTag('lampuJ', 'LAMPU JALAN', scr(LAMP_HEAD), t, 0.6, 2.5, { bg: YELLOW, pointer: 'down' }, -110);
    return street;
  }],
  // S2 — "Papa! Tengok bayang Affan! Tadi pendek je..." (under the lamp)
  [2.6, 5.9, (t) => {
    horns(0);
    const pt = easeOut(inv(3.0, 3.4, t));
    streetAff(t, 0.15, Math.PI, {
      headPitch: lerp(0, 0.45, pt), lookY: -0.5 * pt, brow: 0.6, smile: 1,
      armR: { reach: mix3([-0.55, 0.2, 0.2], [-0.45, 0.55, 0.85], pt), pole: [-1, -0.5, -0.2], point: pt, wx: 0.6 * pt },
    });
    camMove(t, 2.6, 5.9, [1.8, 2.7, 3.9], [0.25, 0.7, 8.2], [1.5, 2.5, 4.4], [0.25, 0.65, 8.2], 50);
    const pp = pop(t, 2.67, 3.4, { from: 2 });
    ov.bubble('papa', 'PAPA!', { x: 790, y: 470, o: pp.o, s: pp.s * 0.8, r: 6 }, { size: 110 });
    bubble('tengok', 'TENGOK BAYANG!', t, 3.0, 4.3, 440, 108);
    pinTag('pendek0', 'PENDEK', scr(V(0.15, 0, WALK_Z)), t, 4.55, 5.88, { bg: ORANGE, pointer: 'down' }, -60);
    return street;
  }],
  // S3 — he walks away from the lamp: "sekarang dah panjang macam raksasa!"
  [5.9, 8.5, (t) => {
    const w = walkPath(t, [[5.9, 1.2], [7.6, 6.2]]);
    horns(easeOut(inv(7.1, 7.6, t)));
    const g = gait(w.x, w.moving);
    streetAff(t, w.x, Math.PI / 2, { ...g, talk: talk(t) * 0.6, headPitch: 0.25 * inv(7.4, 7.9, t), lookY: -0.3 * inv(7.4, 7.9, t) });
    const ck = easeInOut(inv(5.9, 8.5, t));
    const sx = w.x + 0.5 + 0.8 * ck;
    lookCam(V(sx + 0.3, 5.6, 0.6), V(sx, 0.3, 8.5), 50);
    const tip = streetTip(w.x);
    pinTag('panjang0', 'PANJANG!', scr(tip), t, 6.56, 7.2, { bg: BLUE, pointer: 'down' }, -60);
    bubble('raksasa', 'MACAM RAKSASA!', t, 7.2, 8.45, 430, 112, { top: '#ffd0e0', bot: '#ff4d7a' }, 3);
    return street;
  }],
  // S4 — "Affan membesar ke?" close on Affan, puzzled, the horned shadow behind
  [8.5, 10.25, (t) => {
    horns(1 - easeInOut(inv(9.7, 10.2, t)));
    const lk = easeOut(inv(8.55, 8.95, t));
    streetAff(t, 6.2, lerp(Math.PI / 2, Math.PI * 0.92, lk), {
      headPitch: 0.35 * lk, lookY: -0.35 * lk, brow: -0.5, smile: 0.3, headRoll: 0.08 * Math.sin(t * 3),
      armL: { reach: [0.35, 0.75, 0.75], pole: [1, -0.5, -0.3] }, armR: { reach: [-0.35, 0.75, 0.75], pole: [-1, -0.5, -0.3] },
    });
    camMove(t, 8.5, 10.25, [7.7, 1.9, 5.0], [6.5, 1.0, 8.6], [7.5, 1.75, 5.5], [6.6, 1.0, 8.6], 48);
    const hd = scr(V(6.2, AFF_H + 0.2, WALK_Z));
    [[8.62, -230, -60, '#ffcf33', -12], [8.95, 230, -120, '#3fa2ff', 10]].forEach(([a, dx, dy, c, r], i) => {
      const q = pop(t, a, 10.2);
      ov.html('qq' + i, ICONS.qmark(c), { x: clamp(hd.x + dx, 110, 970), y: hd.y + dy + Math.sin(t * 3 + i) * 10, o: q.o, s: q.s * 0.75, r });
    });
    bubble('membesar', 'AFFAN MEMBESAR?', t, 8.96, 10.2, 430, 104, { top: '#e6ecff', bot: '#7aa8ff' });
    return street;
  }],
  // S5 — "Jom ikut Affan cari jawapan!" + magic swirl
  [10.25, 12.3, (t) => {
    horns(0);
    const up = keys(t, [[10.3, 0], [10.55, 1], [11.9, 1], [12.2, 0.6]], easeOut);
    streetAff(t, 6.2, Math.PI * 0.92, { smile: 1, brow: 0.6, armR: { reach: [lerp(-0.6, -0.55, up), lerp(0.25, 1.95 + 0.06 * Math.sin(t * 14), up), lerp(0.2, 0.35, up)], pole: [-1, -0.3, -0.5] } });
    camMove(t, 10.25, 12.3, [7.4, 1.8, 5.6], [6.4, 1.15, 8.2], [7.0, 1.6, 6.4], [6.3, 1.2, 8.2], 46);
    ov.swirl(t, W / 2, 820, inv(10.7, 12.2, t));
    ov.flash(inv(11.9, 12.3, t) ** 2);
    return street;
  }],
  // S6 — light stage: light travels straight; Affan blocks it; the dark place is the shadow
  [12.3, 21.65, (t) => {
    labReset();
    const d = 2.6;
    labAff(t, d, 0, { smile: 0.9, headYaw: -0.3 * inv(14.4, 15.0, t) * (1 - inv(18.8, 19.3, t)) });
    labRays(t, { d, grow: t - 12.4, hitGlow: inv(14.4, 15.0, t) * (1 - inv(19.0, 19.6, t)) });
    const tip = labTip(d);
    labHL(inv(16.6, 17.2, t) * (0.7 + 0.3 * Math.sin(t * 6)), d + 0.05, tip);
    camMove(t, 12.3, 21.65, [1.9, 3.4, 13.2], [1.9, 2.3, 0], [2.6, 2.6, 11.0], [2.7, 1.6, 0], 50);
    ov.flash(1 - inv(12.3, 12.65, t));
    bubble('lurus', 'CAHAYA BERGERAK LURUS', t, 12.36, 14.3, 400, 86, { top: '#fff6d0', bot: '#ffd84a' });
    topTag('halang', 'BADAN HALANG CAHAYA', t, 15.2, 16.6, ORANGE);
    pinTag('taksampai', 'CAHAYA TAK SAMPAI', scr(V((d + tip) / 2, 0, 0.4)), t, 16.66, 18.9, { bg: PURPLE, pointer: 'down' }, -70);
    bubble('bayang', 'BAYANG-BAYANG!', t, 20.1, 21.6, 400, 124, { top: '#e8dcff', bot: '#8a5cff' });
    pinTag('bayangT', 'GELAP', scr(V((d + tip) / 2, 0, 0.4)), t, 19.3, 21.6, { bg: '#3a3f6a', pointer: 'down' }, -70);
    return lab;
  }],
  // S7 — lamp right above the head: light falls straight down, the shadow is short
  [21.65, 29.15, (t) => {
    labReset();
    const w = walkPath(t, [[21.75, 2.6], [23.2, 0.0]]);
    const g = gait(2.6 - w.x, w.moving);
    const turn = easeInOut(inv(21.7, 21.95, t)) * (1 - easeInOut(inv(23.1, 23.5, t)));
    labAff(t, w.x, -Math.PI / 2 * turn, { ...g, smile: 1, headPitch: t > 27 ? 0.35 * inv(27.0, 27.4, t) : 0, lookY: t > 27 ? -0.4 * inv(27.0, 27.4, t) : 0 });
    const fan = [-0.9, -0.6, -0.35, -0.18, -0.06, 0.06, 0.18, 0.35, 0.6, 0.9].map((x) => x * 1.0 + w.x * 0);
    labRays(t, { d: w.x, fan: t < 23.3 ? null : fan, hitGlow: 0, a: 1 });
    labKey(inv(24.4, 24.9, t), LAB_L, w.x, 0x2fbf5f);
    labHL(inv(27.1, 27.5, t) * (0.7 + 0.3 * Math.sin(t * 6)), w.x - 0.25, w.x + 0.25);
    if (t < 26.2) camMove(t, 21.65, 26.2, [2.6, 2.6, 11.0], [2.7, 1.6, 0], [0.6, 3.0, 9.0], [0.1, 2.4, 0], 50);
    else camMove(t, 26.2, 29.15, [0.6, 3.0, 9.0], [0.1, 2.4, 0], [1.2, 2.2, 4.3], [0.0, 0.5, 0], 50);
    const lp = scr(LAB_L);
    pinTag('atas', 'ATAS KEPALA', lp, t, 22.36, 24.3, { bg: YELLOW, pointer: 'down' }, -100);
    topTag('tegak', 'CAHAYA JATUH TEGAK', t, 25.2, 26.6, GREEN);
    bubble('pendek', 'PENDEK!', t, 27.15, 29.1, 420, 140, { top: '#fff0d0', bot: '#ff9a3d' });
    const ft = scr(V(w.x, 0, 0.3));
    const qa = pop(t, 28.2, 29.1);
    if (qa.o > 0) ov.html('arrowKaki', `<div style="transform:rotate(90deg)">${ICONS.arrow(PURPLE)}</div>`, { x: ft.x, y: ft.y - 230 + Math.sin(t * 8) * 10, o: qa.o, s: qa.s * 0.5 });
    return lab;
  }],
  // S8 — walk away: the light comes in at a slant and the shadow lies long; further = longer
  [29.15, 43.2, (t) => {
    labReset();
    const w = walkPath(t, [[30.1, 0.0], [32.0, 2.0], [38.1, 2.0], [39.7, 4.0]]);
    const walking = w.moving;
    const g = gait(w.x, walking);
    labAff(t, w.x, lerp(0, Math.PI / 2, walking > 0.05 ? 1 : 0) * 1, { ...g, smile: 1, headYaw: walking > 0.05 ? 0 : -0.5, lookX: walking > 0.05 ? 0 : -0.4 });
    labRays(t, { d: w.x, a: 0.55 });
    const kOn = inv(32.7, 33.2, t);
    const tip = labKey(kOn, LAB_L, w.x);
    const tx = labTip(w.x);
    labHL(inv(35.1, 35.6, t), w.x + 0.05, tx);
    const cz = lerp(10.5, 13.5, easeInOut(inv(37.8, 40.0, t)));
    const cx = lerp(1.6, 2.8, easeInOut(inv(37.8, 40.0, t)));
    camMove(t, 29.15, 30.3, [1.2, 2.2, 4.3], [0.0, 0.5, 0], [1.6, 3.2, 10.5], [1.6, 2.0, 0], 50);
    if (t >= 30.3) lookCam(V(cx, 3.2 + (cz - 10.5) * 0.2, cz), V(cx, 2.0, 0), 50);
    if (tip) angleArc(LAB_L, tip, kOn * (1 - inv(42.9, 43.2, t)), t > 39.8 ? 'LAGI SENGET' : t > 33.5 ? 'SENGET' : null, t);
    ov.flash((1 - inv(29.15, 29.4, t)) * 0.3);
    topTag('jauh', 'JALAN JAUH DARI LAMPU', t, 30.12, 32.5, BLUE);
    bracket('panjangB', w.x, tx, t, 35.6, 43.15, t > 41.4 ? 'LAGI PANJANG!' : 'PANJANG', PURPLE);
    bubble('terbaring', 'BAYANG PANJANG!', t, 36.0, 38.0, 420, 112, { top: '#e6ecff', bot: '#4f8bff' });
    bubble('lagijauh', 'LAGI JAUH...', t, 38.08, 39.5, 420, 112);
    bubble('lagipanjang', 'LAGI PANJANG!', t, 41.42, 43.15, 420, 120, { top: '#e6ecff', bot: '#4f8bff' }, 2);
    return lab;
  }],
  // S9 — the Sun too: high at noon (short shadow), low in the evening (long shadow)
  [43.2, 53.3, (t) => {
    const k = easeInOut(inv(43.25, 44.2, t));
    const eve = easeInOut(inv(49.2, 50.9, t));
    lab.setMode(k, eve);
    const e = lerp(1.42, 0.5, eve);
    const d = 1.2;
    const sd = sunDir(e);
    lab.sun.position.set(d, 0, 0).addScaledVector(sd, lerp(6.4, 4.2, eve));
    lab.sun.rotation.set(0, 0, 0);
    lab.sunLight.position.set(d, 0, 0).addScaledVector(sd, 30);
    lab.sunLight.target.position.set(d, 0, 0);
    lab.sunLight.target.updateMatrixWorld(true);
    lab.keyRay.visible = false;
    labAff(t, d, 0, { smile: 1, headPitch: -0.2 + 0.4 * eve, lookY: 0.3 - 0.5 * eve, lookX: -0.3, headYaw: -0.25 });
    labRays(t, { mode: 'sun', d, e, a: k * 0.6 });
    const tipX = d + AFF_H / Math.tan(e);
    labHL(inv(47.8, 48.2, t) * (1 - inv(49.0, 49.3, t)) + inv(51.6, 52.0, t), d + 0.05, tipX);
    camMove(t, 43.2, 49.2, [1.4, 3.6, 15.5], [1.4, 3.0, 0], [1.5, 3.4, 15.2], [1.5, 2.8, 0], 50);
    if (t >= 49.2) camMove(t, 49.2, 51.0, [1.5, 3.4, 15.2], [1.5, 2.8, 0], [0.9, 3.0, 16.0], [0.9, 2.0, 0], 50);
    bubble('mataharipun', 'MATAHARI PUN SAMA!', t, 43.24, 44.85, 400, 96, { top: '#fff6d0', bot: '#ffb21f' });
    topTag('tengahhari', 'TENGAH HARI: MATAHARI TINGGI', t, 44.9, 48.9, YELLOW, 330);
    bracket('pendekS', d, Math.max(tipX, d + 0.15), t, 48.0, 49.1, 'PENDEK', ORANGE, 0.9);
    topTag('petang', 'PETANG: MATAHARI RENDAH', t, 49.18, 53.25, '#ff7a3d', 330);
    bracket('panjangS', d, tipX, t, 51.8, 53.25, 'PANJANG!', PURPLE, 1);
    return lab;
  }],
  // S10 — try it at home: a toy on the floor, a torch from above (short) then from the side (long)
  [53.3, 63.85, (t) => {
    const dark = easeInOut(inv(56.5, 57.1, t));
    room.setDark(dark);
    room.setTorch(inv(56.75, 56.95, t) * (1 + 1.5 * easeInOut(inv(60.9, 61.9, t))));
    room.beam.material.opacity *= 1 - 0.7 * easeInOut(inv(60.9, 61.9, t));
    room.toy.position.copy(TOY);
    room.toy.scale.setScalar(Math.max(0.001, easeOut(inv(54.8, 55.2, t))));
    const up = easeInOut(inv(58.3, 59.1, t));
    const side = easeInOut(inv(60.9, 61.9, t));
    const lens = lensMix(lensMix(LENS_REST, LENS_TOP, up), LENS_SIDE, side);
    room.torch.visible = t > 56.3;
    roomAff(t, lens, { headPitch: 0.3, lookX: -0.5, lookY: -0.35, headYaw: -0.4, smile: 1 });
    camMove(t, 53.3, 57.0, [-0.2, 2.7, 6.4], [0.0, 1.0, 1.0], [-0.7, 2.1, 5.0], [-0.4, 0.75, 1.1], 50);
    if (t >= 57.0) camMove(t, 57.0, 63.85, [-0.7, 2.1, 5.0], [-0.4, 0.75, 1.1], [-1.1, 1.8, 4.7], [-0.75, 0.55, 1.15], 50);
    ov.flash(1 - inv(53.3, 53.6, t));
    bubble('cuba', 'CUBA KAT RUMAH!', t, 53.32, 54.75, 430, 112, { top: '#d6fff0', bot: '#2fbf8f' });
    pinTag('mainan', 'MAINAN', scr(TOY.clone().add(V(0, 1.0, 0))), t, 55.0, 56.6, { bg: PINK, pointer: 'down' }, -40);
    pinTag('suluh', 'LAMPU SULUH', scr(room.torch.position.clone().add(V(0, 0.15, 0))), t, 57.4, 58.4, { bg: YELLOW, pointer: 'down' }, -80);
    topTag('dariatas', 'SULUH DARI ATAS', t, 58.5, 60.9, GREEN);
    bubble('pendekR', 'PENDEK!', t, 60.13, 60.9, 430, 130, { top: '#fff0d0', bot: '#ff9a3d' });
    topTag('daritepi', 'SULUH DARI TEPI', t, 60.96, 63.8, ORANGE);
    bubble('panjangR', 'PANJANG!', t, 62.56, 63.8, 430, 130, { top: '#e6ecff', bot: '#4f8bff' });
    return room;
  }],
  // S11 — back on the street: "Jadi, Affan tak membesar pun! Waaah, bayang ikut arah cahaya!"
  [63.85, 70.25, (t) => {
    horns(0);
    const dance = inv(66.7, 67.0, t);
    const hop = dance > 0 ? Math.max(0, Math.sin((t - 66.7) * 7)) * 0.12 : 0;
    const sw = Math.sin((t - 66.7) * 5);
    const p = dance > 0
      ? { bob: hop, smile: 1, wow: keys(t, [[66.7, 0], [66.85, 0.9], [67.4, 0.9], [67.7, 0]]), armL: { reach: [0.75, 1.5 + 0.2 * sw, 0.3], pole: [1, -0.5, -0.4] }, armR: { reach: [-0.75, 1.5 - 0.2 * sw, 0.3], pole: [-1, -0.5, -0.4] }, tilt: 0.12 * sw }
      : { smile: 0.9, armL: { reach: [0.35, 0.3, 0.15] }, armR: { ...POSES.wagR(t).armR } };
    street.aff.root.position.y = hop * 0.42;
    streetAff(t, 6.2, Math.PI * 0.85, { ...p });
    street.aff.root.position.y = hop * 0.42;
    street.aff.root.updateMatrixWorld(true);
    camMove(t, 63.85, 70.25, [3.0, 4.6, 3.2], [7.6, 0.6, 8.4], [2.6, 4.9, 3.0], [7.8, 0.5, 8.4], 50);
    ov.flash((1 - inv(63.85, 64.15, t)) * 0.9, '20,40,120');
    bubble('takbesar', 'TAK MEMBESAR PUN!', t, 64.95, 66.6, 420, 100);
    const hd = scr(V(6.2, AFF_H + 0.2, WALK_Z));
    const b = pop(t, 66.74, 70.2);
    ov.html('bulb', ICONS.bulb(), { x: clamp(hd.x + 230, 150, 900), y: clamp(hd.y - 120, 300, 900) + Math.sin(t * 5) * 8, o: b.o, s: b.s * 0.65, r: 10 });
    ov.sparkles(t, { n: 30, seed: 12, y: 250, h: 900, a: inv(66.7, 67.0, t) * (1 - inv(68.8, 69.4, t)) });
    bubble('ikutarah', 'BAYANG IKUT\nARAH CAHAYA!', t, 67.74, 70.2, 470, 100, { top: '#fff6d0', bot: '#ffb21f' });
    return street;
  }],
  // S12 — "Apa lagi kita nak belajar lepas ni?"
  [70.25, OUTRO, (t) => {
    horns(0);
    const tk = keys(t, [[70.3, 0], [70.7, 1]]);
    const th2 = POSES.thinkR.armR;
    streetAff(t, 6.2, Math.PI * 0.92, { smile: 1, brow: 0.3 + 0.4 * tk, headRoll: -0.12 * tk, lookX: 0.35 * tk, lookY: 0.4 * tk, headPitch: -0.08 * tk, armR: { reach: mix3([-0.6, 0.25, 0.2], th2.reach, tk), pole: th2.pole, point: tk, wx: th2.wx * tk } });
    camMove(t, 70.25, OUTRO, [7.3, 1.75, 5.6], [6.3, 1.25, 8.2], [7.0, 1.7, 6.2], [6.25, 1.3, 8.2], 46);
    const hd = scr(V(6.2, AFF_H + 0.1, WALK_Z));
    [[70.4, -260, -230, '#ffcf33', -12], [70.7, 250, -280, '#3fa2ff', 10], [71.0, 300, -60, '#ffcf33', 14]].forEach(([a, dx, dy, c, r], i) => {
      const q = pop(t, a, OUTRO - 0.05);
      ov.html('q' + i, ICONS.qmark(c), { x: clamp(hd.x + dx, 110, 970), y: hd.y + dy + Math.sin(t * 3 + i) * 10, o: q.o, s: q.s * 0.85, r });
    });
    return street;
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
  const world = shot[2](t);
  if (world.stars && world.stars.userData.update) world.stars.userData.update(t);
  if (world.sky) {
    world.sky.position.copy(cam.position);
    if (world.stars) world.stars.position.copy(cam.position);
  }
  renderer.setViewport(0, 0, W, H);
  renderer.render(world.scene, cam);
  if (world !== outro) ov.vignette(0.25);
  ov.captions(t, CAPTIONS, KEYWORDS);
  ov.end();
}

// Cover / thumbnail (9:16): Affan on the night street with his long, horned
// "monster" shadow, a title, episode badge and the series logo.
function thumbnail() {
  ov.begin();
  cam.aspect = W / H;
  cam.updateProjectionMatrix();
  const t = 8.0;
  horns(1);
  streetAff(t, 6.2, Math.PI * 0.8, { talk: 0, wow: 0.9, brow: 0.8, headPitch: 0.1, armL: { reach: [0.55, 1.0, 0.55], pole: [1, -0.5, -0.3] }, armR: { reach: [-0.55, 1.0, 0.55], pole: [-1, -0.5, -0.3] } });
  lookCam(V(2.6, 5.0, 3.0), V(7.6, 0.4, 8.4), 50);
  street.sky.position.copy(cam.position);
  street.stars.position.copy(cam.position);
  renderer.setViewport(0, 0, W, H);
  renderer.render(street.scene, cam);
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
  ov.tag('thBadge', 'EPISOD 34', { x: W / 2, y: 300 }, { bg: '#2f7bff', small: true });
  ov.bubble('thTitle', 'BAYANG JADI', { x: W / 2, y: 445, r: -3 }, { size: 124 });
  ov.bubble('thTitle2', 'RAKSASA?!', { x: W / 2, y: 590, r: 2 }, { size: 150, top: '#ffd0e0', bot: '#ff4d7a' });
  ov.html('thQ', ICONS.qmark('#ffcf33'), { x: 930, y: 790, r: 14, s: 0.9 });
  drawLogo(ov, { y: 1425, scale: 0.58 });
  ov.end();
  horns(0);
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
