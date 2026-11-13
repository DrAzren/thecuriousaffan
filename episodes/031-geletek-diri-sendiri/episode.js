// THE CURIOUS AFFAN — Episode 031: "Kenapa Kita Tak Boleh Geletek Diri Sendiri?"
// Every shot is a pure function of time t (seconds), synced to audio/narration.mp3.
import * as THREE from 'three';
import { makeRenderer, loadEnvelope, toScreen, clamp, lerp, inv, easeOut, easeInOut, keys, wobble, W, H } from '../../shared/core.js';
import { POSES, blinkAt } from '../../shared/affan.js';
import { Overlay, pop, ICONS, drawLogo } from '../../shared/overlay.js';
import { CAPTIONS, KEYWORDS } from './captions.js';
import { buildLivingRoom, buildMindStage, buildOutro, BRAIN, CEREB } from './worlds.js';

const FPS = 30;
const DURATION = 76.0;
const OUTRO = 72.75;

const stage = document.getElementById('stage');
const canvas = document.createElement('canvas');
stage.appendChild(canvas);
const renderer = makeRenderer(canvas);
const ov = new Overlay(stage);
const room = buildLivingRoom();
const mind = buildMindStage();
const outro = buildOutro();
const cam = new THREE.PerspectiveCamera(50, W / H, 0.05, 4000);
let env = { at: () => 0 };

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const talk = (t) => clamp(env.at(t) * 1.2);
const scr = (p) => toScreen(p, cam);
const mix3 = (a, b, k) => a.map((v, i) => lerp(v, b[i], k));
const PINK = '#ff5c9a', GREEN = '#2fbf5f', BLUE = '#2f9bff', RED = '#ff4d5e', PURPLE = '#7a5cf0', ORANGE = '#ff8a3d';

function lookCam(pos, look, fov = 50) {
  cam.position.copy(pos);
  cam.fov = fov;
  cam.updateProjectionMatrix();
  cam.lookAt(look);
  cam.updateMatrixWorld(true);
}
// camera move between two [pos, look] keys
function camMove(t, a, b, p0, l0, p1, l1, fov = 50, ease = easeInOut) {
  const k = ease(inv(a, b, t));
  lookCam(V(...mix3(p0, p1, k)), V(...mix3(l0, l1, k)), fov);
}
function shake(t, a, amp = 0.12) {
  const k = Math.exp(-Math.max(0, t - a) * 5) * (t >= a ? 1 : 0);
  cam.position.x += Math.sin(t * 61) * amp * k;
  cam.position.y += Math.sin(t * 47 + 1) * amp * k;
  cam.updateMatrixWorld(true);
}
function pinTag(id, text, p, t, a, b, style, dy = -90) {
  const q = pop(t, a, b);
  if (q.o <= 0 || !p.visible) return;
  ov.tag(id, text, { x: clamp(p.x, 190, 890), y: clamp(p.y + dy, 300, 1380), o: q.o, s: q.s }, style);
}
const CHECK = `<svg width="200" height="200" viewBox="0 0 200 200"><circle cx="100" cy="100" r="88" fill="#2fbf5f" stroke="#fff" stroke-width="14"/><path d="M55 104 L88 136 L148 70" fill="none" stroke="#fff" stroke-width="24" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const BANG = `<svg width="160" height="220" viewBox="0 0 160 220"><text x="80" y="190" text-anchor="middle" font-family="Baloo 2" font-weight="800" font-size="230" fill="#ff4d5e" stroke="#fff" stroke-width="14" paint-order="stroke" stroke-linejoin="round">!</text></svg>`;
const sweat = (c = '#9fd8ff') => `<svg width="60" height="90" viewBox="0 0 60 90"><path d="M30 5 C30 5 55 45 55 60 A25 25 0 0 1 5 60 C5 45 30 5 30 5 Z" fill="${c}" stroke="#17256b" stroke-width="6"/></svg>`;

// ---------------------------------------------------------------- poses
// Wiggly tickling fingers (both rigs share the hand model).
const wiggle = (t, k = 1, ph = 0) => ({ point: 0.55 + 0.45 * Math.sin(t * 32 + ph) * k, wz: 0.35 * Math.sin(t * 24 + ph) * k, wx: -0.3 + 0.2 * Math.sin(t * 19 + ph) * k });
// Giggling: squints, squirms, hugs the tummy.
function laughPose(t, k, extra = {}) {
  if (k <= 0) return extra;
  const sq = Math.sin(t * 15);
  return {
    smile: 1, blink: 0.93 * k, brow: 0.7 * k, talk: (0.75 + 0.25 * Math.abs(Math.sin(t * 13))) * k,
    tilt: 0.12 * sq * k, lean: -0.08 * k, bob: 0.05 * Math.abs(sq) * k,
    headRoll: 0.14 * Math.sin(t * 9) * k, headPitch: -0.12 * k,
    armL: { reach: mix3([0.62, 0.22, 0.12], [0.38, 0.42, 0.5], k), pole: [1, -0.5, 0.2] },
    armR: { reach: mix3([-0.62, 0.22, 0.12], [-0.38, 0.42, 0.5], k), pole: [-1, -0.5, 0.2] },
    ...extra,
  };
}
// Affan tickles his own left armpit with his right hand. k: 0 rest → 1 at armpit.
function selfTickle(t, k, wig = 1) {
  return {
    armL: { reach: mix3([0.62, 0.22, 0.12], [1.15, 1.5, -0.12], easeOut(clamp(k * 1.6))), pole: [1, 0.3, -0.6], wz: 0.3 * k },
    armR: { reach: mix3([-0.62, 0.22, 0.12], [0.44, 0.8, 0.3], k), pole: [-0.5, -1, 0.6], ...(k > 0.6 ? wiggle(t, wig) : { point: k }) },
    shR: k,
  };
}
const walkLegs = (t, k, f = 9) => ({ legL: { x: 0.45 * Math.sin(t * f) * k, knee: 0.35 * Math.max(0, -Math.sin(t * f)) * k }, legR: { x: -0.45 * Math.sin(t * f) * k, knee: 0.35 * Math.max(0, Math.sin(t * f)) * k }, bob: 0.06 * Math.abs(Math.sin(t * f)) * k });
// Kakak reaches both hands to world points on Affan.
function kakTickle(w, t, targetL, targetR, k = 1, wig = 1, extra = {}) {
  const kak = w.kak;
  kak.pose({ ...extra, armL: { reach: [0.6, 0.25, 0.15] }, armR: { reach: [-0.6, 0.25, 0.15] } });
  const tl = kak.toTorso(targetL), tr = kak.toTorso(targetR);
  kak.pose({
    smile: 1, brow: 0.4, blink: blinkAt(t, 4), ...extra,
    armL: { reach: mix3([0.62, 0.25, 0.15], tl, k), pole: [1, -0.6, -0.3], ...wiggle(t, wig) },
    armR: { reach: mix3([-0.62, 0.25, 0.15], tr, k), pole: [-1, -0.6, -0.3], ...wiggle(t, wig, 1.7) },
  });
}
// Affan torso-local points → world
const affPt = (w, x, y, z) => { w.aff.root.updateMatrixWorld(true); return w.aff.parts.torso.localToWorld(V(x, y, z)); };

// ------------------------------------------------------------ living room
const A_LR = V(0.9, 0, 0.9);
const K_LR = V(-0.95, 0, 0.55);
// Self-tickle cheat: the right shoulder slides inward (a hunch) so the short
// cartoon arm can reach across to the left armpit. p.shR: 0..1.
function shoulder(aff, k = 0) {
  aff.parts.arms.R.shoulder.position.set(-0.6 + 0.2 * k, 0.86 - 0.04 * k, 0.06 * k);
}
function roomAffan(t, p = {}) {
  shoulder(room.aff, p.shR || 0);
  room.aff.root.position.copy(A_LR);
  room.aff.root.rotation.set(0, 0, 0);
  room.aff.pose({ yaw: -0.25, blink: blinkAt(t, 1), talk: talk(t), smile: 0.9, ...p });
}
function roomKakak(pos, yaw) {
  room.kak.root.position.copy(pos);
  room.kak.root.rotation.y = 0;
  room.kak.pose({ yaw });
  room.kak.root.rotation.y = yaw;
}

// --------------------------------------------------------------- mind stage
const A_M = V(0.35, 0, 0.6);
const K_M = V(2.3, 0, 0.75);
function mindAffan(t, p = {}) {
  shoulder(mind.aff, p.shR || 0);
  mind.aff.root.position.copy(A_M);
  mind.aff.pose({ yaw: -0.12, blink: blinkAt(t, 2), talk: talk(t), smile: 0.9, ...p });
}
function mindIdle(t, glowK = 0, alarm = 0) {
  mind.brain.position.copy(BRAIN).add(V(0, 0.08 * Math.sin(t * 1.4), 0));
  mind.brain.rotation.z = 0.025 * Math.sin(t * 0.9);
  mind.trail.forEach((m, i) => m.scale.setScalar(1 + 0.12 * Math.sin(t * 3 + i)));
  mind.puffs.children.forEach((m) => (m.position.y += 0.002 * Math.sin(t + m.userData.ph)));
  const pulse = 0.5 + 0.5 * Math.sin(t * 6);
  const e = 0.15 + 1.1 * glowK * (0.75 + 0.25 * pulse);
  mind.cerebMat.emissive.setHex(alarm > 0.5 ? 0xff2a2a : 0xff3d7f);
  mind.cerebMat.emissiveIntensity = e + alarm * (0.6 + 0.6 * Math.abs(Math.sin(t * 18)));
  mind.cerebGlow.material.color.setHex(alarm > 0.5 ? 0xff3030 : 0xff5c9a);
  mind.cerebGlow.material.opacity = clamp(0.55 * glowK + 0.8 * alarm * Math.abs(Math.sin(t * 18)));
  mind.cerebGlow.position.copy(CEREB).add(V(0, 0.08 * Math.sin(t * 1.4), 0.6));
  mind.sig.forEach((s) => (s.visible = false));
  mind.copy.forEach((s) => (s.visible = false));
  mind.ring.visible = false;
  mind.kak.root.visible = false;
}
// guard: show 0..1 (pop in), mood: 0 calm, 1 confused, look: [x, y]
function guardAt(t, show, { confused = 0, jump = 0, look = [0, 0], wow = 0 } = {}) {
  const g = mind.guard;
  g.group.visible = show > 0.01;
  const s = 1.15 * easeOut(clamp(show)) * (1 + 0.15 * Math.sin(Math.PI * clamp(show)));
  g.group.scale.setScalar(Math.max(0.001, s));
  g.group.position.set(-2.55, 5.0 + 0.06 * Math.sin(t * 3) + jump, 0.75);
  g.group.rotation.set(0, 0.25 + 0.2 * confused * Math.sin(t * 7), 0.12 * confused * Math.sin(t * 5));
  g.eyes.forEach((e) => e.children[0].position.set(0.035 * look[0], 0.035 * look[1], 0.07));
  g.smile.visible = wow < 0.5;
  g.oMouth.visible = wow >= 0.5;
  g.board.rotation.z = 0.04 * Math.sin(t * 2.5);
}
// screen placement for text on the guard's board
function boardText(id, html, t, a, b) {
  const q = pop(t, a, b, { from: 0.6 });
  if (q.o <= 0) return;
  const bw = mind.guard.board;
  bw.updateMatrixWorld(true);
  const c = scr(bw.localToWorld(V(0, 0, 0.05)));
  const l = scr(bw.localToWorld(V(-0.6, 0, 0.05))), r = scr(bw.localToWorld(V(0.6, 0, 0.05)));
  const s = Math.abs(r.x - l.x) / 300;
  ov.html(id, `<div style="width:300px;height:190px;display:flex;align-items:center;justify-content:center;font:800 58px 'Baloo 2';color:#17256b;line-height:1;text-align:center">${html}</div>`, { x: c.x, y: c.y, o: q.o, s: s * q.s });
}
// glowing dots flowing along a quadratic curve a → c → b
function flow(sprites, t, a, b, t0, t1, p0, pc, p1, speed = 1.1) {
  const on = t >= t0 && t < t1;
  const fade = inv(t0, t0 + 0.3, t) * (1 - inv(t1 - 0.3, t1, t));
  sprites.forEach((s, i) => {
    const u = ((t - t0) * speed - i / sprites.length * 0.9);
    s.visible = on && u > 0 && u < 1;
    if (!s.visible) return;
    const k = u;
    const q = V(...mix3(mix3(p0, pc, k), mix3(pc, p1, k), k));
    s.position.copy(q);
    s.material.opacity = fade;
    s.scale.setScalar((0.35 + 0.25 * Math.sin(t * 10 + i)) * 1.1);
  });
  void a; void b;
}
function ringAt(t, p, a, b, color = 0x5cff8a, size = 1) {
  const k = inv(a, a + 0.25, t) * (1 - inv(b - 0.2, b, t));
  if (k <= 0) return;
  const r = mind.ring;
  r.visible = true;
  r.position.copy(p);
  r.lookAt(cam.position);
  const s = size * (0.9 + 0.15 * Math.sin(t * 10)) * easeOut(k);
  r.scale.setScalar(s);
  mind.ringMat.color.setHex(color);
  mind.ringMat.opacity = k;
}

// ======================================================================= SHOTS
const SHOTS = [
  // S1 — at home: Affan calls Papa; Kakak sneaks up and tickles him: "geli sangat!"
  [0, 8.6, (t) => {
    const tk = keys(t, [[2.9, 0], [3.25, 1], [8.3, 1], [8.6, 0.6]]);
    const lk = keys(t, [[3.3, 0], [3.7, 1], [8.3, 1]]);
    const call = keys(t, [[2.1, 0], [2.3, 1], [2.9, 1], [3.2, 0]]);
    roomAffan(t, {
      headYaw: lerp(0.0, 0.7, call) + 0.05 * wobble(t, 1), lookX: 0.6 * call, brow: 0.5 * call,
      ...(call > 0 ? { armR: { reach: [-0.75, 1.55, 0.35 + Math.sin(t * 10) * 0.12], pole: [-1, -0.5, -0.4] } } : {}),
      ...laughPose(t, lk, { yaw: -0.25 + 0.1 * lk }),
    });
    // Kakak tiptoes in from behind-left, then tickles
    const w = easeInOut(inv(0.2, 2.9, t));
    const pos = V(...mix3([-3.4, 0, -1.4], [K_LR.x, 0, K_LR.z], w));
    roomKakak(pos, lerp(0.9, 1.25, w));
    room.kak.root.position.copy(pos);
    if (tk > 0) kakTickle(room, t, affPt(room, -0.5, 0.72, 0.1), affPt(room, -0.45, 0.32, 0.3), tk, 1, { yaw: 1.25, ...walkLegs(t, 0) });
    else room.kak.pose({ yaw: lerp(0.9, 1.25, w), smile: 1, brow: -0.2, lookX: 0.5, ...walkLegs(t, w > 0 && w < 1 ? 1 : 0, 7), armL: { reach: [0.55, 1.15, 0.6], pole: [1, -0.6, -0.2], ...wiggle(t, 0.6) }, armR: { reach: [-0.55, 1.15, 0.6], pole: [-1, -0.6, -0.2], ...wiggle(t, 0.6, 2) } });
    room.kak.tail.rotation.x = 0.15 * Math.sin(t * 7);
    camMove(t, 0, 8.6, [0.5, 2.8, 9.0], [0.1, 2.35, 0.6], [0.35, 2.65, 8.0], [0.0, 2.3, 0.7]);
    const q = pop(t, 0.9, 8.5);
    ov.tag('ep', 'EPISOD 31', { x: W / 2, y: 268, o: q.o, s: q.s }, { bg: '#2f7bff', small: true });
    const pp = pop(t, 2.28, 3.05, { from: 2 });
    ov.bubble('papa', 'PAPA!', { x: 820, y: 470, o: pp.o, s: pp.s * 0.8, r: 6 }, { size: 110 });
    const hk = pop(t, 3.66, 5.25, { from: 2 });
    ov.bubble('geletek', 'GELETEK!', { x: W / 2, y: 440 + Math.sin(t * 9) * 8, o: hk.o, s: hk.s, r: -4 }, { size: 130, top: '#ffd6ec', bot: '#ff5c9a' });
    const ha = pop(t, 5.3, 8.5, { from: 2 });
    ov.bubble('haha', 'HAHAHA!', { x: W / 2 + 40 * Math.sin(t * 6), y: 440, o: ha.o, s: ha.s * (1 + 0.04 * Math.sin(t * 14)), r: 4 * Math.sin(t * 5) }, { size: 140 });
    ov.sparkles(t, { n: 14, seed: 5, x: 200, y: 700, w: 700, h: 700, a: 0.8 * lk, size: 26 });
    return room;
  }],
  // S2 — Affan tickles himself: "eh, tak geli langsung! Kenapa ya?"
  [8.6, 14.8, (t) => {
    const st = keys(t, [[8.9, 0], [9.9, 1], [13.3, 1], [13.75, 0]]);
    const th = keys(t, [[13.7, 0], [14.1, 1], [14.8, 1]]);
    const eh = keys(t, [[11.8, 0], [12.1, 1], [13.6, 1], [13.9, 0.4]]);
    let p = { yaw: -0.25, smile: lerp(0.9, 0.25, eh), brow: lerp(0, -0.4, eh), headRoll: 0.18 * eh, headPitch: 0.12 * eh, lookY: -0.35 * eh, lookX: 0.25 * eh, ...selfTickle(t, st, 0.8) };
    if (th > 0) p = { ...p, ...POSES.thinkR, armR: { ...POSES.thinkR.armR, reach: mix3([-0.62, 0.22, 0.12], POSES.thinkR.armR.reach, th) }, headRoll: -0.12 * th, lookX: 0.3, lookY: 0.35 * th, smile: 0.5, brow: 0.6 * th };
    roomAffan(t, p);
    // Kakak stands back, arms folded, amused
    roomKakak(V(-1.7, 0, 0.1), 0.75);
    room.kak.pose({ yaw: 0.75, smile: 1, brow: 0.3, lookX: 0.6, blink: blinkAt(t, 5), headRoll: 0.08, armL: { reach: [-0.25, 0.62, 0.48], pole: [1, -0.8, 0] }, armR: { reach: [0.25, 0.52, 0.52], pole: [-1, -0.8, 0] } });
    room.kak.tail.rotation.x = 0.05 * Math.sin(t * 2);
    camMove(t, 8.6, 14.8, [2.3, 3.0, 6.6], [1.0, 2.45, 0.9], [2.0, 3.0, 5.6], [1.0, 2.6, 0.9]);
    const gs = pop(t, 10.04, 12.4);
    ov.tag('sendiri', 'GELETEK SENDIRI...', { x: W / 2, y: 330, o: gs.o, s: gs.s }, { bg: PINK, small: true });
    const tg = pop(t, 12.46, 14.75, { from: 2 });
    ov.bubble('takgeli', 'TAK GELI?!', { x: W / 2, y: 450, o: tg.o, s: tg.s, r: -3 }, { size: 140, top: '#e6f0ff', bot: '#7aa8ff' });
    const head = scr(affPt(room, 0, 2.0, 0));
    [[13.88, 260, -150, '#ffcf33', 12], [14.2, -250, -200, '#3fa2ff', -10]].forEach(([a, dx, dy, c, r], i) => {
      const q = pop(t, a, 14.75);
      ov.html('q' + i, ICONS.qmark(c), { x: clamp(head.x + dx, 120, 960), y: head.y + dy + Math.sin(t * 3 + i) * 10, o: q.o, s: q.s * 0.8, r });
    });
    return room;
  }],
  // S3 — "Jom ikut Affan cari jawapan!" + magic swirl into the mind stage
  [14.8, 16.9, (t) => {
    const up = keys(t, [[14.85, 0], [15.1, 1], [16.4, 1], [16.7, 0.6]], easeOut);
    roomAffan(t, { yaw: -0.1, smile: 1, brow: 0.6, armR: { reach: [lerp(-0.62, -0.62, up), lerp(0.22, 1.95 + 0.06 * Math.sin(t * 14), up), lerp(0.12, 0.35, up)], pole: [-1, -0.3, -0.5] } });
    roomKakak(V(-1.7, 0, 0.1), 0.75);
    room.kak.pose({ yaw: 0.75, smile: 1, lookX: 0.6, armL: { reach: [-0.25, 0.62, 0.48], pole: [1, -0.8, 0] }, armR: { reach: [0.25, 0.52, 0.52], pole: [-1, -0.8, 0] } });
    camMove(t, 14.8, 16.9, [1.4, 3.2, 4.6], [0.9, 2.95, 0.9], [1.1, 3.1, 3.8], [0.9, 3.0, 0.9]);
    ov.swirl(t, W / 2, 820, inv(15.3, 16.8, t));
    ov.flash(inv(16.5, 16.9, t) ** 2);
    return room;
  }],
  // S4 — inside the head: the brain, the cerebellum at the back, and its guard who guesses
  [16.9, 28.2, (t) => {
    const glowK = inv(21.8, 22.6, t);
    mindIdle(t, glowK);
    const pt = keys(t, [[19.4, 0], [19.8, 1], [23.3, 1], [23.7, 0]]);
    mindAffan(t, { smile: 1, brow: 0.5, headPitch: -0.35 * inv(17.5, 18.5, t), lookY: 0.6 * inv(17.5, 18.5, t), lookX: -0.2 * pt, armR: { reach: mix3([-0.62, 0.22, 0.12], [-0.85, 1.75, 0.4], pt), point: pt, pole: [-1, -0.3, -0.4] } });
    guardAt(t, inv(24.66, 25.2, t), { look: [0.6, -0.4] });
    if (t < 18.4) camMove(t, 16.9, 18.4, [0.6, 2.4, 7.0], [0.3, 2.5, 0.6], [0.6, 3.2, 8.6], [0.3, 3.6, 0.6], 50, easeOut);
    else if (t < 21.0) camMove(t, 18.4, 21.0, [0.6, 3.2, 8.6], [0.3, 3.6, 0.6], [0.0, 4.9, 12.6], [-0.5, 5.0, -0.5]);
    else camMove(t, 21.0, 28.2, [0.0, 4.9, 12.6], [-0.5, 5.0, -0.5], [-1.0, 5.5, 8.6], [-1.75, 5.6, -0.4]);
    ov.flash(1 - inv(16.9, 17.3, t));
    ov.sparkles(t, { n: 22, seed: 3, y: 250, h: 1000, a: 0.8 * (1 - inv(17.5, 18.5, t)) });
    pinTag('otak', 'OTAK', scr(V(0.6, BRAIN.y + 1.7, BRAIN.z)), t, 18.58, 21.0, { bg: PINK, pointer: 'down' }, -60);
    const bk = pop(t, 20.12, 22.7);
    ov.tag('belakang', 'BAHAGIAN BELAKANG', { x: W / 2, y: 330, o: bk.o, s: bk.s }, { bg: PURPLE, small: true });
    pinTag('kecil', 'KECIL', scr(CEREB.clone().add(V(0, -0.6, 0.9))), t, 22.26, 23.4, { bg: PINK, pointer: 'up', small: true }, 90);
    const sb = pop(t, 23.46, 25.5, { from: 2 });
    ov.bubble('serebelum', 'SEREBELUM', { x: W / 2, y: 440, o: sb.o, s: sb.s, r: -3 }, { size: 136, top: '#ffd6ec', bot: '#ff5c9a' });
    pinTag('penjaga', 'PENJAGA', scr(mind.guard.group.getWorldPosition(V()).add(V(0, 0.75, 0))), t, 25.82, 27.1, { bg: '#2f6fff', pointer: 'down', small: true }, -50);
    const pm = pop(t, 27.2, 28.15, { from: 2 });
    ov.bubble('meneka', 'PANDAI MENEKA!', { x: W / 2, y: 440, o: pm.o, s: pm.s, r: 2 }, { size: 116, top: '#d6fff0', bot: '#2fbf8f' });
    return mind;
  }],
  // S5 — own hand: the brain sends the order, the cerebellum gets a copy and predicts: no surprise
  [28.2, 44.1, (t) => {
    const glowK = 0.3 + 0.7 * inv(32.6, 33.4, t) * (1 - inv(43.5, 44.1, t));
    mindIdle(t, glowK);
    const lift = keys(t, [[29.4, 0], [30.4, 0.45], [36.5, 0.45], [37.3, 1]]);
    const flat = inv(38.4, 38.8, t);
    mindAffan(t, { smile: lerp(0.9, 0.35, flat), brow: lerp(0.3, -0.2, flat), lookX: 0.35, lookY: -0.2 * flat, headYaw: 0.15, ...selfTickle(t, lift, 0.8) });
    guardAt(t, 1, { look: t < 34 ? [0.2, 0.6] : [1, -0.8], jump: 0.15 * Math.max(0, Math.sin(Math.PI * inv(34.6, 35.1, t))) });
    const top = [0.35, BRAIN.y + 1.55, BRAIN.z + 0.4];
    const hand = mind.aff.parts.arms.R.hand.getWorldPosition(V()).toArray();
    flow(mind.sig, t, 0, 0, 30.85, 32.6, top, [2.4, 5.6, 0.6], hand, 1.0);
    flow(mind.copy, t, 0, 0, 32.45, 34.2, top, [-1.0, BRAIN.y + 1.9, 0.2], [CEREB.x + 0.3, CEREB.y + 0.4, CEREB.z + 0.9], 1.0);
    const pit = affPt(mind, 0.42, 0.66, 0.38);
    ringAt(t, pit, 34.66, 39.6, 0x5cff8a, 0.9);
    if (t < 33.9) camMove(t, 28.2, 33.9, [0.4, 4.7, 13.4], [-0.3, 4.6, -0.3], [0.2, 4.6, 12.6], [-0.4, 4.6, -0.3]);
    else if (t < 36.4) camMove(t, 33.9, 36.4, [-1.2, 5.0, 7.6], [-1.9, 4.9, -0.2], [-1.1, 4.9, 7.0], [-1.8, 4.9, -0.2]);
    else if (t < 39.8) camMove(t, 36.4, 39.8, [2.4, 2.75, 6.9], [0.55, 2.35, 0.6], [2.2, 2.75, 6.3], [0.55, 2.4, 0.6]);
    else camMove(t, 39.8, 44.1, [2.8, 6.9, 7.4], [0.9, 7.0, -0.6], [2.6, 6.9, 6.6], [0.9, 7.0, -0.6]);
    pinTag('tangan', 'TANGAN', scr(V(...hand)), t, 30.0, 30.85, { bg: ORANGE, pointer: 'down', small: true }, -80);
    const ar = pop(t, 31.5, 32.45);
    ov.tag('arahan', 'ARAHAN', { x: W / 2, y: 330, o: ar.o, s: ar.s }, { bg: '#e0b400', small: true });
    const sl = pop(t, 32.46, 34.6);
    ov.tag('salinan', 'SEREBELUM DAH TAHU!', { x: W / 2, y: 330, o: sl.o, s: sl.s }, { bg: PINK, small: true });
    boardText('board1', 'JARI ➜<br>KETIAK', t, 34.66, 39.8);
    pinTag('ketiak', 'KETIAK', scr(pit), t, 36.45, 38.4, { bg: BLUE, pointer: 'down', small: true }, -70);
    const ck = pop(t, 37.6, 39.8, { from: 2 });
    const ps = scr(pit);
    if (ck.o > 0 && ps.visible) ov.html('check', CHECK, { x: clamp(ps.x + 170, 150, 930), y: ps.y - 120, o: ck.o, s: ck.s * 0.7 });
    const tk = pop(t, 38.52, 39.8, { from: 2 });
    ov.bubble('takkejut', 'TAK ADA KEJUTAN', { x: W / 2, y: 440, o: tk.o, s: tk.s, r: -2 }, { size: 104, top: '#d6ffe0', bot: '#2fbf5f' });
    const ts = pop(t, 41.14, 43.0, { from: 2 });
    ov.bubble('sendiri2', '"TANGAN SENDIRI!"', { x: W / 2, y: 450, o: ts.o, s: ts.s, r: -2 }, { size: 104, top: '#ffffff', bot: '#ffd0e4' });
    const tp = pop(t, 43.12, 44.05, { from: 2 });
    ov.bubble('takpayah', 'TAK PAYAH GELI', { x: W / 2, y: 450, o: tp.o, s: tp.s, r: 2 }, { size: 110 });
    return mind;
  }],
  // S6 — Kakak tickles: the guard can't guess where the fingers will go → surprise → giggles
  [44.1, 58.3, (t) => {
    const alarm = inv(52.55, 52.7, t) * (1 - inv(54.6, 55.2, t));
    mindIdle(t, 0.35, alarm);
    const kin = easeInOut(inv(44.2, 45.9, t));
    const kp = V(...mix3([5.6, 0, 1.6], K_M.toArray(), kin));
    mind.kak.root.visible = true;
    mind.kak.root.position.copy(kp);
    const kyaw = -Math.PI / 2 + 0.6;
    const strike = keys(t, [[52.4, 0], [52.65, 1], [58.0, 1]]);
    // hovering hands that dart around, then the strike
    const hov = (ph) => V(K_M.x - 0.9 + 0.25 * Math.sin(t * 2.3 + ph), 2.2 + 0.35 * Math.sin(t * 1.7 + ph * 2), 1.4 + 0.2 * Math.cos(t * 2.1 + ph));
    const lk = keys(t, [[52.7, 0], [53.1, 1], [57.9, 1], [58.3, 0.5]]);
    mindAffan(t, {
      headYaw: 0.45 * kin * (1 - lk), lookX: 0.6 * kin, brow: 0.4, smile: 0.9,
      wow: keys(t, [[52.55, 0], [52.7, 1], [53.3, 1], [53.6, 0]]),
      ...laughPose(t, lk, { yaw: -0.12 + 0.3 * lk }),
    });
    if (lk < 0.05) mind.aff.pose({ yaw: -0.12, blink: blinkAt(t, 2), talk: talk(t), headYaw: 0.45 * kin, lookX: 0.6 * kin, brow: 0.4, smile: 0.9, wow: keys(t, [[52.55, 0], [52.7, 1], [53.3, 1], [53.6, 0]]), bob: 0.25 * Math.max(0, Math.sin(Math.PI * inv(52.6, 53.0, t))) });
    mind.kak.root.rotation.y = 0;
    const tgtL = strike > 0 ? affPt(mind, 0.48, lerp(0.75, 0.62, 0.5 + 0.5 * Math.sin(t * 9)), 0.1) : hov(0);
    const tgtR = strike > 0 ? affPt(mind, 0.25, 0.3 + 0.08 * Math.sin(t * 11), 0.45) : hov(2.1);
    kakTickle(mind, t, tgtL, tgtR, kin, 1, { yaw: kyaw, ...walkLegs(t, kin > 0 && kin < 1 ? 1 : 0, 8), lookX: -0.5, brow: 0.3 + 0.3 * Math.sin(t * 3) });
    mind.kak.tail.rotation.x = 0.15 * Math.sin(t * 7);
    const conf = inv(46.88, 47.3, t) * (1 - inv(52.4, 52.6, t));
    guardAt(t, 1, { confused: conf, look: [Math.sin(t * 6) * conf, Math.cos(t * 5) * 0.6 * conf], wow: alarm, jump: 0.35 * Math.max(0, Math.sin(Math.PI * inv(52.6, 53.1, t))) });
    // markers jump between body parts as the narrator names them
    const pts = [affPt(mind, 0.45, 0.68, 0.38), affPt(mind, 0.0, 0.32, 0.55), mind.aff.root.localToWorld(V(0.24, 0.12, 0.45))];
    ringAt(t, pts[0], 49.97, 50.76, 0xffb020, 1.0);
    ringAt(t, pts[1], 50.76, 51.5, 0xffb020, 1.2);
    ringAt(t, pts[2], 51.5, 52.5, 0xffb020, 1.1);
    if (t < 52.3) camMove(t, 44.1, 52.3, [1.0, 4.6, 13.6], [0.1, 4.4, -0.2], [0.8, 3.9, 11.6], [0.2, 3.6, 0.2]);
    else if (t < 53.75) { camMove(t, 52.3, 53.75, [0.3, 4.4, 11.6], [-0.2, 4.4, 0.0], [0.3, 4.4, 11.0], [-0.2, 4.4, 0.0]); shake(t, 52.6, 0.18); }
    else camMove(t, 53.75, 58.3, [-0.9, 2.7, 7.4], [1.05, 2.45, 0.6], [-0.7, 2.7, 6.6], [1.05, 2.5, 0.6]);
    const kk = pop(t, 44.24, 46.8);
    ov.tag('kakak', 'KAKAK GELETEK...', { x: W / 2, y: 330, o: kk.o, s: kk.s }, { bg: PINK, small: true });
    boardText('board2', '? ? ?', t, 46.88, 52.55);
    boardText('board2b', '<span style="color:#ff4d5e;font-size:76px">! ! !</span>', t, 52.55, 53.75);
    const gw = mind.guard.group.getWorldPosition(V());
    if (conf > 0.2) {
      const gp = scr(gw.clone().add(V(0.45, 0.45, 0)));
      ov.html('sweat', sweat(), { x: gp.x, y: gp.y + 12 * Math.sin(t * 6), o: conf, s: 0.6 });
    }
    const mn = pop(t, 48.04, 49.9);
    ov.tag('mana', 'NAK PERGI MANA?', { x: W / 2, y: 330, o: mn.o, s: mn.s }, { bg: ORANGE, small: true });
    [['KETIAK?', 0, 49.97, 50.76], ['PERUT?', 1, 50.76, 51.5], ['TAPAK KAKI?', 2, 51.5, 52.5]].forEach(([txt, i, a, b]) => {
      const p = scr(pts[i]);
      pinTag('m' + i, txt, p, t, a, b, { bg: ORANGE, pointer: 'down' }, -80);
    });
    const kj = pop(t, 52.6, 54.1, { from: 2.4 });
    ov.bubble('kejutan', 'KEJUTAN!', { x: W / 2, y: 450 + 6 * Math.sin(t * 30), o: kj.o, s: kj.s, r: -4 }, { size: 160, top: '#ffd0d0', bot: '#ff4d5e' });
    if (kj.o > 0) {
      ov.html('bang1', BANG, { x: 150, y: 760, o: kj.o, s: kj.s * 0.6, r: -14 });
      ov.html('bang2', BANG, { x: 930, y: 700, o: kj.o, s: kj.s * 0.6, r: 14 });
    }
    ov.flash(0.5 * (1 - inv(52.6, 52.9, t)) * (t >= 52.6 ? 1 : 0), '255,90,90');
    const tj = pop(t, 53.56, 55.4);
    ov.tag('terkejut', 'BADAN TERKEJUT!', { x: W / 2, y: 330, o: tj.o, s: tj.s }, { bg: RED, small: true });
    const gl = pop(t, 55.5, 58.25, { from: 2 });
    ov.bubble('geli', 'GELI! HAHAHA!', { x: W / 2 + 30 * Math.sin(t * 6), y: 450, o: gl.o, s: gl.s * (1 + 0.04 * Math.sin(t * 14)), r: 3 * Math.sin(t * 5) }, { size: 124 });
    ov.sparkles(t, { n: 16, seed: 8, x: 200, y: 800, w: 700, h: 700, a: 0.8 * lk, size: 26 });
    return mind;
  }],
  // S7 — the rule: we feel ticklish when the brain can't guess the touch
  [58.3, 63.65, (t) => {
    mindIdle(t, 0.5);
    mind.kak.root.visible = true;
    mind.kak.root.position.copy(K_M);
    mind.kak.root.rotation.y = 0;
    mind.kak.pose({ yaw: -Math.PI / 2 + 0.6, smile: 1, lookX: -0.4, blink: blinkAt(t, 4), armL: { reach: [0.55, 0.3, 0.3] }, armR: { reach: [-0.55, 0.3, 0.3] } });
    const pt = keys(t, [[58.6, 0], [59.0, 1], [62.9, 1], [63.3, 0]]);
    mindAffan(t, { smile: 1, brow: 0.5, headPitch: -0.3, lookY: 0.55, lookX: -0.3, armR: { reach: mix3([-0.62, 0.22, 0.12], [-0.85, 1.75, 0.4], pt), point: pt, pole: [-1, -0.3, -0.4] } });
    guardAt(t, 1, { confused: 0.5, look: [0.4, -0.5] });
    camMove(t, 58.3, 63.65, [0.4, 4.4, 12.8], [-0.4, 4.6, -0.3], [0.2, 4.8, 11.6], [-0.4, 4.9, -0.3]);
    ov.flash((1 - inv(58.3, 58.6, t)) * 0.6);
    boardText('board3', '?', t, 58.3, 63.65);
    const r1 = pop(t, 60.84, 63.6, { from: 2 });
    ov.bubble('rule1', 'TAK DAPAT TEKA', { x: W / 2, y: 400, o: r1.o, s: r1.s, r: -2 }, { size: 100, top: '#e6f0ff', bot: '#7aa8ff' });
    const r2 = pop(t, 62.3, 63.6, { from: 2 });
    ov.bubble('rule2', '= GELI!', { x: W / 2, y: 560, o: r2.o, s: r2.s, r: 3 }, { size: 130 });
    return mind;
  }],
  // S8 — home again: "Waaah, otak kita memang pandai! Cuba sekarang... tak jadi, kan?"
  [63.65, OUTRO, (t) => {
    const jump = t > 63.95 && t < 64.6 ? Math.sin(((t - 63.95) / 0.65) * Math.PI) * 0.45 : 0;
    const up = keys(t, [[63.8, 0], [64.0, 1], [64.6, 1], [64.9, 0]]);
    const st = keys(t, [[67.2, 0], [67.9, 1], [69.0, 1], [69.3, 0]]);
    const shrug = keys(t, [[69.2, 0], [69.45, 1], [70.3, 1], [70.55, 0]]);
    const tk = keys(t, [[70.5, 0], [70.85, 1], [OUTRO, 1]]);
    let p = {
      yaw: -0.15, bob: jump, smile: 1, brow: 0.4,
      wow: keys(t, [[63.8, 0], [63.95, 1], [64.6, 1], [64.85, 0]]),
      blink: t > 63.8 && t < 64.8 ? 0 : blinkAt(t, 6),
      legL: { x: -0.25 * jump, knee: 0.6 * jump }, legR: { x: -0.25 * jump, knee: 0.6 * jump },
      armL: { reach: [lerp(0.62, 0.85, up), lerp(0.22, 1.85, up), lerp(0.12, 0.3, up)], pole: [1, -0.4, -0.5] },
      armR: { reach: [lerp(-0.62, -0.85, up), lerp(0.22, 1.85, up), lerp(0.12, 0.3, up)], pole: [-1, -0.4, -0.5] },
    };
    if (st > 0) p = { ...p, ...selfTickle(t, st, 0.8), smile: 1, headRoll: 0.1 * st, lookX: 0 };
    if (shrug > 0) p = { ...p, armL: { reach: mix3([0.62, 0.22, 0.12], [0.95, 0.75, 0.45], shrug), pole: [1, -1, -0.2], wx: -0.6 * shrug }, armR: { reach: mix3([-0.62, 0.22, 0.12], [-0.95, 0.75, 0.45], shrug), pole: [-1, -1, -0.2], wx: -0.6 * shrug }, headRoll: 0.18 * shrug, brow: 0.8 };
    if (tk > 0) p = { ...p, ...POSES.thinkR, armL: { reach: [0.62, 0.22, 0.12] }, armR: { ...POSES.thinkR.armR, reach: mix3([-0.62, 0.22, 0.12], POSES.thinkR.armR.reach, tk) }, headRoll: -0.12 * tk, lookX: 0.35 * tk, lookY: 0.4 * tk, headPitch: -0.08 * tk };
    roomAffan(t, p);
    roomKakak(V(-1.7, 0, 0.1), 0.75);
    room.kak.pose({ yaw: 0.75, smile: 1, lookX: 0.6, blink: blinkAt(t, 5), bob: 0.03 * Math.abs(Math.sin(t * 12)) * shrug, armL: { reach: [-0.25, 0.62, 0.48], pole: [1, -0.8, 0] }, armR: { reach: [0.25, 0.52, 0.52], pole: [-1, -0.8, 0] } });
    camMove(t, 63.65, OUTRO, [1.8, 3.0, 7.0], [0.75, 2.6, 0.9], [1.5, 2.9, 5.8], [0.8, 2.75, 0.9]);
    ov.flash((1 - inv(63.65, 63.95, t)) * 0.9, '255,230,245');
    const head = scr(affPt(room, 0, 2.0 + jump, 0));
    const b = pop(t, 63.98, 66.3);
    ov.html('bulb', ICONS.bulb(), { x: clamp(head.x + 250, 150, 920), y: clamp(head.y - 80, 300, 900) + Math.sin(t * 5) * 8, o: b.o, s: b.s * 0.7, r: 10 });
    ov.sparkles(t, { n: 30, seed: 12, y: 250, h: 900, a: inv(63.95, 64.3, t) * (1 - inv(65.6, 66.3, t)) });
    const op = pop(t, 64.58, 66.4, { from: 2 });
    ov.bubble('pandai', 'OTAK PANDAI!', { x: W / 2, y: 440, o: op.o, s: op.s, r: -2 }, { size: 124, top: '#ffd6ec', bot: '#ff5c9a' });
    const cb = pop(t, 66.58, 69.2, { from: 2 });
    ov.bubble('cuba', 'CUBA!', { x: W / 2, y: 440, o: cb.o, s: cb.s, r: 3 }, { size: 150, top: '#d6fff0', bot: '#2fbf8f' });
    const tj = pop(t, 69.26, 70.55, { from: 2 });
    ov.bubble('takjadi', 'TAK JADI, KAN?', { x: W / 2, y: 440, o: tj.o, s: tj.s, r: -2 }, { size: 116 });
    [[70.6, -260, -230, '#ffcf33', -12], [70.9, 250, -280, '#3fa2ff', 10], [71.2, 300, -60, '#ffcf33', 14]].forEach(([a, dx, dy, c, r], i) => {
      const q = pop(t, a, OUTRO - 0.05);
      ov.html('qq' + i, ICONS.qmark(c), { x: clamp(head.x + dx, 110, 970), y: head.y + dy + Math.sin(t * 3 + i) * 10, o: q.o, s: q.s * 0.85, r });
    });
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
  mind.stars.userData.update(t);
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

// Cover / thumbnail (9:16): Kakak tickles a giggling Affan at home, with a big
// title, episode badge and the series logo. Key elements stay inside the
// centre 3:4 area (y 240-1680) that profile grids show.
const THUMB = { cam: [0.35, 2.75, 6.6], look: [0.1, 2.55, 0.7], fov: 50 };
window.setThumb = (o) => Object.assign(THUMB, o);
function thumbnail() {
  ov.begin();
  cam.aspect = W / H;
  cam.updateProjectionMatrix();
  const t = 5.6;
  roomAffan(t, { ...laughPose(t, 1, { yaw: -0.45 }), talk: 0.6, blink: 0.6 });
  roomKakak(K_LR, 1.25);
  kakTickle(room, t, affPt(room, -0.5, 0.72, 0.1), affPt(room, -0.45, 0.32, 0.3), 1, 1, { yaw: 1.25, smile: 1 });
  lookCam(V(...THUMB.cam), V(...THUMB.look), THUMB.fov);
  renderer.render(room.scene, cam);
  const g = ov.g;
  const top = g.createLinearGradient(0, 0, 0, 760);
  top.addColorStop(0, 'rgba(60,20,80,0.75)');
  top.addColorStop(1, 'rgba(60,20,80,0)');
  g.fillStyle = top;
  g.fillRect(0, 0, W, 760);
  const bot = g.createLinearGradient(0, H - 900, 0, H);
  bot.addColorStop(0, 'rgba(60,20,80,0)');
  bot.addColorStop(1, 'rgba(60,20,80,0.75)');
  g.fillStyle = bot;
  g.fillRect(0, H - 900, W, 900);
  ov.vignette(0.3);
  ov.sparkles(2.0, { n: 16, seed: 5, x: 150, y: 650, w: 780, h: 650, size: 28 });
  ov.tag('thBadge', 'EPISOD 31', { x: W / 2, y: 300 }, { bg: '#2f7bff', small: true });
  ov.bubble('thTitle', 'GELETEK', { x: W / 2, y: 445, r: -3 }, { size: 140, top: '#ffd6ec', bot: '#ff5c9a' });
  ov.bubble('thTitle2', 'DIRI SENDIRI?', { x: W / 2, y: 600, r: 2 }, { size: 112 });
  ov.html('thQ', ICONS.qmark('#ffcf33'), { x: 930, y: 820, r: 14, s: 0.9 });
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
