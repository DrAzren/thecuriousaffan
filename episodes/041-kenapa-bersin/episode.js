// THE CURIOUS AFFAN — Episode 041: "Kenapa Kita Bersin?"
// Every shot is a pure function of time t (seconds), synced to audio/narration.mp3.
import * as THREE from 'three';
import { makeRenderer, loadEnvelope, toScreen, clamp, lerp, inv, easeOut, easeIn, easeInOut, keys, rng, W, H } from '../../shared/core.js';
import { POSES, blinkAt } from '../../shared/affan.js';
import { Overlay, pop, ICONS, drawLogo } from '../../shared/overlay.js';
import { CAPTIONS, KEYWORDS } from './captions.js';
import {
  buildKitchenS, buildNose, buildMind, buildStudio, buildOutro, BRAIN, ISLAND_TOP, BOARD, MAMA_POS, AFF_POS,
  NOSTRIL_Z, TUN_R, BUTTON, M, TAPE_X0, A_ST, K_ST,
} from './worlds.js';

const FPS = 30;
const DURATION = 70.15;
const OUTRO = 67.0;

const stage = document.getElementById('stage');
const canvas = document.createElement('canvas');
stage.appendChild(canvas);
const renderer = makeRenderer(canvas);
const ov = new Overlay(stage);
const kit = buildKitchenS();
const nose = buildNose();
const mind = buildMind();
const studio = buildStudio();
const outro = buildOutro();
const cam = new THREE.PerspectiveCamera(50, W / H, 0.02, 6000);
let env = { at: () => 0 };

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const talk = (t) => clamp(env.at(t) * 1.2);
const scr = (p) => toScreen(p, cam);
const mix3 = (a, b, k) => a.map((v, i) => lerp(v, b[i], k));
const BLUE = '#2f9bff', ORANGE = '#ff8a3d', PURPLE = '#7a5cf0', GREEN = '#2fbf5f', PINK = '#ff5c9a', YELLOW = '#e0b400', RED = '#ff4d5e';

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
  ov.tag(id, text, { x: clamp(p.x, 300, 780), y: clamp(p.y + dy, 300, 1380), o: q.o, s: q.s }, style);
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
// a sneeze: build-up "ah... ah..." then a quick forward snap with the eyes shut
function ach(t, t0, { pre = 1.0, hold = 0.35, slow = 1 } = {}) {
  const b = t < t0 ? easeIn(inv(t0 - pre, t0, t)) : 0;
  const post = t >= t0 ? Math.exp(-(t - t0) / (0.28 * slow)) : 0;
  const shut = t >= t0 - 0.05 && t < t0 + hold;
  return {
    headPitch: -0.38 * b + 0.32 * post,
    lean: -0.08 * b + 0.2 * post,
    wow: 0.7 * b,
    brow: 0.4 * b - 0.6 * post,
    blink: shut ? 1 : 0.55 * b,
    smile: 0.3,
    talk: 0,
  };
}
// a burst of droplets: deterministic per index; returns nothing
const _f = V(), _s = V(), _u2 = V();
function sprayBurst(list, t, t0, origin, dir, { n = list.length, life = 1.2, speed = 3.2, spread = 0.45, size = 0.08, slow = 1, op = 0.85, gravity = 1.2 } = {}) {
  _f.copy(dir).normalize();
  _s.set(-_f.z, 0, _f.x).normalize();
  _u2.crossVectors(_s, _f).normalize();
  for (let i = 0; i < n; i++) {
    const s = list[i];
    const R = rng(i * 13 + 7);
    const dt = (t - t0) * slow - R() * 0.08;
    if (dt < 0 || dt > life) continue;
    const a = R() * Math.PI * 2, r = Math.sqrt(R()) * spread;
    const v = _f.clone().addScaledVector(_s, Math.cos(a) * r).addScaledVector(_u2, Math.sin(a) * r).multiplyScalar(speed * (0.5 + R() * 0.8));
    const drag = (1 - Math.exp(-dt * 2.2)) / 2.2;
    s.position.copy(origin).addScaledVector(v, drag);
    s.position.y -= gravity * dt * dt * 0.5;
    s.visible = true;
    s.scale.setScalar(size * (0.6 + R() * 0.9) * (1 + dt * 0.6));
    s.material.opacity = op * (1 - dt / life);
  }
}

// ================================================================== kitchen
const AFF_YAW = Math.atan2(MAMA_POS.x - AFF_POS.x, MAMA_POS.z - AFF_POS.z);
const YAW_CAM = Math.atan2(0.4, 1);
const affHead = () => kit.aff.parts.head.getWorldPosition(V());
const affFront = (d, side) => affHead().add(V(0.35 + side * 0.2, 0.1, d));
const affNose = () => kit.aff.parts.head.localToWorld(V(0, -0.12, 0.75));
const affFwd = () => kit.aff.parts.head.localToWorld(V(0, -0.3, 2)).sub(kit.aff.parts.head.getWorldPosition(V()));
function affSet(t, p = {}) {
  const a = kit.aff;
  a.root.position.copy(AFF_POS);
  a.pose({ yaw: AFF_YAW, blink: blinkAt(t, 1), talk: talk(t), smile: 0.9, ...p });
  a.root.updateMatrixWorld(true);
}
function kitReset() {
  kit.spray.forEach((s) => (s.visible = false));
  kit.germs.forEach((g) => (g.visible = false));
  kit.pepper.forEach((m) => (m.visible = false));
  kit.bubbles.forEach((m) => (m.visible = false));
  kit.tissue.visible = false;
}
// Mama shakes pepper into the pan (shake 0..1); 'look' turns her to Affan
function mamaSet(t, { shake = 1, look = 0, wow = 0 } = {}) {
  const m = kit.mama;
  m.root.position.copy(MAMA_POS);
  const base = { yaw: lerp(0, 0.9, look), lean: lerp(0.15, 0.05, look), blink: blinkAt(t, 5), smile: 0.9, wow, brow: wow * 0.6 };
  m.pose(base);
  m.root.updateMatrixWorld(true);
  const up = 0.07 * Math.sin(t * 16) * shake;
  const sTarget = V(BOARD.x + 0.05, ISLAND_TOP + 0.62 + up, BOARD.z + 0.08);
  const rest = V(BOARD.x - 0.5, ISLAND_TOP + 0.15, BOARD.z + 0.2);
  m.pose({ ...base, armR: { reach: m.toTorso(sTarget), pole: [-1, -0.6, -0.4] }, armL: { reach: m.toTorso(rest), pole: [1, -0.6, -0.4] } });
  m.root.updateMatrixWorld(true);
  const hand = m.parts.arms.R.hand.getWorldPosition(V());
  kit.shaker.position.copy(hand).add(V(0, -0.02, 0.04));
  kit.shaker.rotation.set(0, 0, Math.PI * 0.82 + 0.15 * Math.sin(t * 16) * shake);
}
// pepper specks: fall into the pan, and some drift on the air to Affan's nose
function pepperDrift(t, a, b) {
  const from = kit.shaker.localToWorld(V(0, 0.16, 0));
  const to = affNose();
  kit.pepper.forEach((m, i) => {
    const R = rng(i * 3 + 1);
    const period = 1.6 + R() * 0.8;
    const u = ((t - a) / period + R()) % 1;
    m.visible = t > a && t < b;
    if (!m.visible) return;
    if (i % 2 === 0) {
      m.position.copy(from).add(V((R() - 0.5) * 0.1, -u * 0.5, (R() - 0.5) * 0.1));
    } else {
      const mid = from.clone().lerp(to, 0.5).add(V(0, 0.35, 0.2));
      const c = new THREE.QuadraticBezierCurve3(from, mid, to);
      m.position.copy(c.getPoint(u)).add(V(Math.sin(t * 3 + i) * 0.04, Math.cos(t * 2.3 + i) * 0.04, 0));
    }
    m.rotation.set(t * 3 + i, t * 2, 0);
  });
}
function bulbAt(t, a, b) {
  const hd = scr(affHead().add(V(0, 0.5, 0)));
  const q = pop(t, a, b);
  ov.html('bulb', ICONS.bulb(), { x: clamp(hd.x + 200, 150, 900), y: clamp(hd.y - 160, 300, 900) + Math.sin(t * 5) * 8, o: q.o, s: q.s * 0.6, r: 10 });
}

// ============================================================ inside the nose
function noseHairs(t, tickle = 0) {
  nose.hairs.forEach((h, i) => {
    const amp = 0.06 + 0.4 * tickle;
    const e = new THREE.Euler(amp * Math.sin(t * (2 + 10 * tickle) + h.ph), 0, amp * 0.6 * Math.cos(t * (1.7 + 9 * tickle) + h.ph));
    h.g.quaternion.copy(h.q0).multiply(new THREE.Quaternion().setFromEuler(e));
  });
}
function noseReset() {
  [...nose.dust, ...nose.pepper, ...nose.catHair, ...nose.germs].forEach((m) => (m.visible = false));
  nose.sig.forEach((s) => (s.visible = false));
  nose.nerveMat.emissiveIntensity = 0.2;
}
const hairTip = (k) => {
  const h = nose.hairs[k % nose.hairs.length];
  return h.g.localToWorld(V(0, h.len * 0.85, 0));
};
const mucusPt = (k) => {
  const b = nose.blobs[k % nose.blobs.length];
  return b.position.clone().multiplyScalar(0.92);
};
// fly an intruder in from near the camera and stick it at 'stick'
function intrude(obj, t, t0, start, stick, dur = 1.1, spin = 1) {
  if (t < t0) return;
  const u = easeOut(clamp((t - t0) / dur));
  obj.visible = true;
  obj.position.copy(start).lerp(stick, u);
  obj.position.y += Math.sin(u * Math.PI) * 0.4;
  obj.rotation.set((t - t0) * spin * (1 - u) + 0.3, (t - t0) * 1.3 * spin * (1 - u), 0.2);
}
const startPt = (i) => V(Math.sin(i * 2.3) * 1.2, Math.cos(i * 1.7) * 0.9, NOSTRIL_Z + 3.0);

// ================================================================ mind stage
const A_M = V(0.35, 0, 0.6);
function mindAff(t, p = {}) {
  mind.aff.root.position.copy(A_M);
  mind.aff.pose({ yaw: -0.12, blink: blinkAt(t, 2), talk: talk(t), smile: 0.9, ...p });
  mind.aff.root.updateMatrixWorld(true);
}
function mindIdle(t, alarm = 0) {
  mind.brain.position.copy(BRAIN).add(V(0, 0.08 * Math.sin(t * 1.4), 0));
  mind.brain.rotation.set(0, 0.2 * alarm * Math.sin(t * 9), 0.025 * Math.sin(t * 0.9) + 0.1 * alarm * Math.sin(t * 12));
  mind.trail.forEach((m, i) => m.scale.setScalar(1 + 0.12 * Math.sin(t * 3 + i)));
  mind.cerebGlow.material.opacity = 0;
  mind.sig.forEach((s) => (s.visible = false));
  mind.copy.forEach((s) => (s.visible = false));
  mind.alarm.material.opacity = alarm * (0.35 + 0.35 * Math.max(0, Math.sin(t * 14)));
  mind.cortex.material.emissive.setHex(0x5a1030).lerp(new THREE.Color(0xff1a1a), alarm * 0.5 * Math.max(0, Math.sin(t * 14)));
  mind.cap.position.y = 1.4;
  mind.btnGlow.material.opacity = 0;
}
function flow(list, t, a, b, p0, p1, bow = 1.2) {
  if (t < a || t > b) return;
  const k = clamp((t - a) / 0.3) * clamp((b - t) / 0.3);
  list.forEach((s, i) => {
    const u = ((t - a) * 0.8 + i / list.length) % 1;
    const p = p0.clone().lerp(p1, u);
    p.y += Math.sin(u * Math.PI) * bow;
    s.position.copy(p);
    s.material.opacity = k * Math.sin(u * Math.PI) ** 0.5;
    s.visible = true;
  });
}

// ==================================================================== studio
function stReset() {
  [...studio.spray, ...studio.air].forEach((s) => (s.visible = false));
  studio.dust.forEach((m) => (m.visible = false));
  studio.germs.forEach((g) => (g.visible = false));
}
function stAff(t, pos, p = {}) {
  const a = studio.aff;
  a.root.position.copy(pos);
  a.pose({ yaw: 1.05, blink: blinkAt(t, 1), talk: talk(t), smile: 0.9, ...p });
  a.root.updateMatrixWorld(true);
}
const stNose = () => studio.aff.parts.head.localToWorld(V(0, -0.12, 0.75));
function stKak(t, p = {}) {
  const k = studio.kak;
  k.root.position.copy(K_ST);
  k.pose({ yaw: -Math.PI / 2, blink: blinkAt(t, 6), smile: 0.8, ...p });
  k.root.updateMatrixWorld(true);
}

// ======================================================================= SHOTS
const SHOTS = [
  // S1 — kitchen: Mama peppers the soup; Affan watches from his stool
  [0, 2.06, (t) => {
    kitReset();
    mamaSet(t, { shake: 1 });
    affSet(t, { headPitch: 0.05 });
    pepperDrift(t, 0.2, 99);
    camMove(t, 0, 2.06, [1.0, 2.6, 6.0], [0.75, 1.7, -1.0], [0.9, 2.5, 5.4], [0.75, 1.7, -1.0], 50);
    const q = pop(t, 0.4, 2.0);
    ov.tag('ep', 'EPISOD 41', { x: W / 2, y: 268, o: q.o, s: q.s }, { bg: '#2f7bff', small: true });
    return kit;
  }],
  // S2 — "Hmm... hidung Affan gatal... ah... ah..."
  [2.06, 6.86, (t) => {
    kitReset();
    mamaSet(t, { shake: 0.7 });
    const itch = inv(3.5, 4.0, t);
    const a1 = keys(t, [[5.2, 0], [5.5, 1], [5.9, 0.7], [6.2, 0.75], [6.5, 1.25], [6.86, 1.3]]);
    affSet(t, {
      yaw: YAW_CAM, smile: 0.4, brow: -0.2 + 0.5 * a1,
      headPitch: -0.3 * a1, headRoll: 0.06 * Math.sin(t * 9) * itch * (1 - a1),
      blink: clamp(0.25 * itch + 0.4 * a1), wow: 0.55 * a1, talk: 0,
      armR: t < 4.9 ? { reach: [-0.05, 1.18, 0.62], pole: [-1, -0.6, -0.2], point: 1, wx: -0.6 } : undefined,
    });
    pepperDrift(t, 2.06, 99);
    const ah = affHead();
    camMove(t, 2.06, 6.86, affFront(3.1, 0.6).toArray(), ah.clone().add(V(0, -0.2, 0)).toArray(), affFront(2.6, 0.5).toArray(), ah.clone().add(V(0, -0.1, 0)).toArray(), 46);
    pinTag('gatal', 'GATAL!', scr(affNose().add(V(0, 0.15, 0))), t, 3.58, 5.3, { bg: YELLOW, pointer: 'down' }, -60);
    bubble('ah1', 'AH...', t, 5.36, 6.2, 430, 130, { top: '#ffffff', bot: '#bfe8ff' }, -4);
    bubble('ah2', 'AH...!', t, 6.26, 6.86, 430, 150, { top: '#ffffff', bot: '#9fd8ff' }, 4);
    return kit;
  }],
  // S3 — "ACHOO!"
  [6.86, 8.8, (t) => {
    kitReset();
    mamaSet(t, { shake: 0, look: easeOut(inv(7.0, 7.6, t)), wow: keys(t, [[7.0, 0], [7.3, 0.8], [8.2, 0.8], [8.6, 0]]) });
    affSet(t, { yaw: YAW_CAM, ...ach(t, 6.9) });
    sprayBurst(kit.spray, t, 6.9, affNose(), affFwd(), { speed: 2.6, size: 0.07, spread: 0.5 });
    const ah = affHead();
    camMove(t, 6.86, 8.8, affFront(2.8, 0.5).add(V(0, -0.15, 0)).toArray(), ah.clone().add(V(0, -0.15, 0)).toArray(), affFront(3.4, 0.8).toArray(), ah.clone().add(V(-0.1, -0.2, 0)).toArray(), 48);
    ov.flash((1 - inv(6.9, 7.2, t)) * 0.6, '235,248,255');
    const q = pop(t, 6.88, 8.75, { from: 3 });
    if (q.o > 0) ov.bubble('achoo', 'ACHOO!', { x: W / 2 + 12 * Math.sin(t * 40) * (1 - inv(6.9, 7.4, t)), y: 450, o: q.o, s: q.s, r: -4 }, { size: 170, top: '#ffffff', bot: '#4ab8ff' });
    return kit;
  }],
  // S4 — "Papa! Kenapa kita bersin?"
  [8.8, 11.12, (t) => {
    kitReset();
    mamaSet(t, { shake: 0, look: 1 });
    affSet(t, { yaw: YAW_CAM, ...POSES.thinkR, brow: -0.3, smile: 0.5 });
    const ah = affHead();
    lookCam(affFront(2.9, 0.6), ah.clone().add(V(0, -0.2, 0)), 46);
    const pp = pop(t, 8.8, 9.6, { from: 2 });
    ov.bubble('papa', 'PAPA!', { x: 800, y: 470, o: pp.o, s: pp.s * 0.8, r: 6 }, { size: 110 });
    const hd = scr(ah.clone().add(V(0, 0.45, 0)));
    qmarks(t, hd, 9.5, 11.1, [[9.6, -260, 120, '#ffcf33', -12], [9.9, 250, 80, '#3fa2ff', 10], [10.2, 280, 260, '#ffcf33', 14]]);
    bubble('kenapa', 'KENAPA BERSIN?', t, 9.5, 11.1, 430, 112, { top: '#fff6d0', bot: '#ffb21f' });
    return kit;
  }],
  // S5 — "Jom ikut Affan cari jawapan!" swirl into the nose
  [11.12, 12.8, (t) => {
    kitReset();
    mamaSet(t, { shake: 0, look: 1 });
    const up = keys(t, [[11.14, 0], [11.35, 1], [12.4, 1], [12.7, 0.6]], easeOut);
    affSet(t, { yaw: YAW_CAM, smile: 1, brow: 0.6, armR: { reach: [lerp(-0.6, -0.55, up), lerp(0.25, 1.95 + 0.06 * Math.sin(t * 14), up), lerp(0.2, 0.35, up)], pole: [-1, -0.3, -0.5] } });
    const n = affNose();
    const k = easeIn(inv(11.5, 12.8, t));
    lookCam(affFront(2.9, 0.6).lerp(n.clone().add(V(0.02, 0.0, 0.25)), k), affHead().add(V(0, -0.15, 0)).lerp(n, k), 46);
    ov.swirl(t, W / 2, 820, inv(11.3, 12.7, t));
    ov.flash(inv(12.4, 12.8, t) ** 2);
    return kit;
  }],
  // S6 — inside the nose: fine hairs and mucus catch dust and germs before they reach the lungs
  [12.8, 21.1, (t) => {
    noseReset();
    noseHairs(t, 0);
    nose.dust.slice(0, 6).forEach((d, i) => intrude(d, t, 17.0 + i * 0.28, startPt(i), i % 2 ? hairTip(i * 11 + 3) : mucusPt(i), 1.1));
    nose.germs.forEach((g, i) => intrude(g, t, 17.9 + i * 0.22, startPt(i + 7), i % 2 ? mucusPt(i * 3 + 2) : hairTip(i * 7 + 20), 1.1, 0.5));
    if (t < 14.5) camMove(t, 12.8, 14.5, [0, 0.2, 10.5], [0, 0, -6], [0.2, 0.4, 6.8], [0, 0, -6], 52);
    else if (t < 16.5) camMove(t, 14.5, 16.5, [0.2, 0.4, 6.8], [0, 0, -6], [0.6, 0.8, 3.6], [-0.6, -0.8, -2], 52);
    else if (t < 19.6) camMove(t, 16.5, 19.6, [0.6, 0.8, 3.6], [-0.6, -0.8, -2], [0.3, 0.6, 4.8], [0, -0.4, -4], 54);
    else camMove(t, 19.6, 21.1, [0.3, 0.6, 4.8], [0, -0.4, -4], [0.1, 0.3, 2.0], [0, 0, -20], 54);
    ov.flash(1 - inv(12.8, 13.15, t));
    topTag('dalam', 'DALAM HIDUNG', t, 12.8, 14.5, PINK);
    pinTag('bulu', 'BULU HALUS', scr(hairTip(5)), t, 14.54, 17.2, { bg: '#8a5a36', pointer: 'down' }, -50);
    pinTag('lendir', 'LENDIR', scr(mucusPt(2).add(V(0, 0.2, 0))), t, 15.76, 17.6, { bg: '#7aa82a', pointer: 'down' }, -50);
    topTag('tangkap', 'TANGKAP HABUK & KUMAN!', t, 17.3, 19.6, ORANGE);
    pinTag('paru', 'PARU-PARU', scr(V(0, 0, -24)), t, 20.28, 21.05, { bg: PINK, pointer: 'down' }, -40);
    topTag('takmasuk', 'SUPAYA TAK MASUK', t, 18.9, 21.05, PURPLE, 410);
    return nose;
  }],
  // S7 — dust, pepper and cat hair tickle the hairs; the nerve lights up
  [21.1, 25.18, (t) => {
    noseReset();
    const tk = inv(23.6, 24.0, t) * (1 - inv(24.9, 25.18, t));
    noseHairs(t, tk);
    nose.dust.slice(0, 6).forEach((d, i) => intrude(d, t, 0, startPt(i), i % 2 ? hairTip(i * 11 + 3) : mucusPt(i), 1.1));
    nose.dust.slice(6).forEach((d, i) => intrude(d, t, 21.5 + i * 0.2, startPt(i + 3), hairTip(i * 9 + 1), 0.9));
    nose.pepper.forEach((p, i) => intrude(p, t, 22.36 + i * 0.12, startPt(i + 12), hairTip(i * 6 + 30), 0.9, 3));
    nose.catHair.forEach((c, i) => intrude(c, t, 23.06 + i * 0.15, startPt(i + 20), hairTip(i * 13 + 8), 0.9, 0.7));
    nose.nerveMat.emissiveIntensity = 0.2 + 1.4 * inv(24.3, 24.7, t) * (0.7 + 0.3 * Math.sin(t * 12));
    if (t > 24.3) {
      nose.sig.forEach((s, i) => {
        const u = ((t - 24.3) * 0.9 + i / nose.sig.length) % 1;
        s.position.copy(nose.nerve.getPoint(u));
        s.scale.setScalar(0.5);
        s.material.opacity = Math.sin(u * Math.PI);
        s.visible = true;
      });
    }
    camMove(t, 21.1, 25.18, [0.2, 0.3, 8.4], [0, 0, 0], [0.5, 0.5, 6.6], [0.2, 0.2, 0], 52);
    ov.flash(1 - inv(21.1, 21.4, t));
    const tagAt = (id, txt, obj, a, bg) => pinTag(id, txt, scr(obj.position.clone().add(V(0, 0.3, 0))), t, a + 0.5, 25.1, { bg, pointer: 'down' }, -40);
    tagAt('habuk', 'HABUK', nose.dust[6], 21.5, '#7a7a8a');
    tagAt('lada', 'LADA', nose.pepper[0], 22.36, '#5a3a22');
    tagAt('kucing', 'BULU KUCING', nose.catHair[1], 23.06, ORANGE);
    bubble('geletek', 'GELETEK!', t, 23.76, 25.1, 420, 140, { top: '#fff0d0', bot: '#ff9a3d' }, 3);
    return nose;
  }],
  // S8 — the nerve sends a message to the brain: "Ada penceroboh!"
  [25.18, 29.38, (t) => {
    const alarm = inv(28.2, 28.4, t);
    mindIdle(t, alarm);
    mindAff(t, { smile: 0.7, brow: 0.2 + 0.5 * alarm, wow: 0.6 * alarm, lookY: 0.4, headPitch: -0.15 });
    const nz = mind.aff.parts.head.localToWorld(V(0, -0.12, 0.75));
    flow(mind.sig, t, 25.18, 28.4, nz, BRAIN.clone().add(V(0.3, -1.4, 0.8)), 0.9);
    camMove(t, 25.18, 29.38, [0.6, 4.8, 13.4], [0.0, 4.7, -0.3], [0.5, 5.2, 12.2], [0.0, 5.0, -0.3], 50);
    ov.flash(1 - inv(25.18, 25.5, t));
    topTag('saraf', 'SARAF HANTAR MESEJ', t, 25.18, 28.1, YELLOW);
    pinTag('otak', 'OTAK', scr(BRAIN.clone().add(V(0, 1.9, 0))), t, 27.68, 28.15, { bg: PINK, pointer: 'down' }, -30);
    bubble('pencer', 'ADA PENCEROBOH!', t, 28.22, 29.35, 400, 112, { top: '#ffe0e0', bot: '#ff3a4a' }, -3);
    if (alarm > 0) ov.flash(0.12 * Math.max(0, Math.sin(t * 14)), '255,60,60');
    return mind;
  }],
  // S9 — "Otak tekan butang bersin!"
  [29.38, 31.64, (t) => {
    mindIdle(t, 1 - inv(30.6, 31.2, t));
    mindAff(t, { smile: 0.7, brow: 0.6, lookX: 0.4, lookY: 0.3, headYaw: 0.25 });
    flow(mind.sig, t, 29.4, 30.5, BRAIN.clone().add(V(1.2, -0.9, 0.8)), BUTTON.clone().add(V(0, 1.7, 0)), 0.5);
    const press = keys(t, [[30.25, 0], [30.4, 1], [30.9, 1], [31.2, 0.3]]);
    mind.cap.position.y = 1.4 - 0.18 * press;
    mind.btnGlow.material.opacity = 0.9 * press;
    camMove(t, 29.38, 31.64, [1.4, 4.4, 12.8], [1.2, 3.6, 0], [1.8, 3.6, 10.2], [1.8, 3.0, 0], 50);
    pinTag('butang', 'BUTANG BERSIN', scr(BUTTON.clone().add(V(0, 2.0, 0))), t, 30.3, 31.6, { bg: RED, pointer: 'down' }, -40);
    if (press > 0.5) ov.flash(0.25 * (1 - inv(30.4, 30.8, t)), '255,80,80');
    return mind;
  }],
  // S10 — the big sneeze in slow steps: breathe in deep, squeeze the chest, ACHOO! air shoots out
  [31.64, 41.7, (t) => {
    stReset();
    const inhale = easeInOut(inv(31.7, 33.6, t));
    const squeeze = inv(33.8, 34.3, t) * (t < 36.0 ? 1 : 0);
    const A = V(-1.2, 0, 0.6);
    const sn = ach(t, 36.0, { pre: 0.2, hold: 0.45 });
    stAff(t, A, {
      ...(t > 35.6 ? sn : {}),
      lean: t > 35.6 ? sn.lean : -0.12 * inhale * (1 - squeeze) + 0.04 * squeeze,
      headPitch: t > 35.6 ? sn.headPitch : -0.25 * inhale,
      tilt: 0.03 * squeeze * Math.sin(t * 40),
      blink: t > 35.6 ? sn.blink : 0.3 * squeeze,
      brow: t > 35.6 ? sn.brow : 0.3 * inhale - 0.5 * squeeze,
      talk: 0, wow: t < 35.6 ? 0.5 * inhale * (1 - squeeze) : 0,
    });
    studio.aff.parts.torso.scale.setScalar(t < 36.0 ? 1 + 0.08 * inhale - 0.1 * squeeze : 1);
    const nz = stNose();
    // air flowing in
    if (t < 33.8) {
      studio.air.forEach((s, i) => {
        const u = ((t - 31.7) * 0.9 + i / studio.air.length) % 1;
        const from = nz.clone().add(V(2.4 + Math.sin(i * 2.1) * 0.8, Math.cos(i * 1.3) * 0.9, Math.sin(i) * 0.6));
        s.position.copy(from).lerp(nz, easeIn(u));
        s.scale.setScalar(0.18 * (1 - u * 0.7));
        s.material.opacity = 0.7 * Math.sin(u * Math.PI) * inv(31.7, 32.0, t);
        s.visible = true;
      });
    }
    // the blast
    sprayBurst(studio.spray, t, 36.0, nz, V(1, -0.15, 0), { speed: 5.5, life: 2.4, spread: 0.35, size: 0.2, gravity: 0.4 });
    sprayBurst(studio.air, t, 36.0, nz, V(1, -0.05, 0), { speed: 7, life: 1.6, spread: 0.2, size: 0.35, op: 0.6, gravity: 0 });
    studio.dust.forEach((d, i) => {
      const u = (t - 39.3 - i * 0.08) / 1.6;
      d.visible = u > 0 && u < 1;
      if (d.visible) {
        d.position.copy(nz).add(V(u * 4 + i * 0.1, Math.sin(i * 1.9) * 0.4 * u - u * u * 0.6, Math.cos(i) * 0.3 * u));
        d.rotation.set(t * 4, t * 3, 0);
        d.scale.setScalar(1.6);
      }
    });
    studio.kak.root.visible = false;
    const ah = studio.aff.parts.head.getWorldPosition(V());
    if (t < 35.9) camMove(t, 31.64, 35.9, [A.x + 0.5, 1.9, 6.6], [A.x + 0.5, 1.5, 0.6], [A.x + 0.4, ah.y - 0.1, 4.6], [A.x + 0.4, ah.y - 0.4, 0.6], 48);
    else camMove(t, 35.9, 37.0, [A.x + 0.4, ah.y - 0.1, 4.6], [A.x + 0.4, ah.y - 0.4, 0.6], [A.x + 1.5, 1.9, 9.2], [A.x + 1.5, 1.3, 0.6], 50);
    ov.flash(1 - inv(31.64, 31.95, t));
    topTag('tarik', 'TARIK NAFAS DALAM-DALAM', t, 32.04, 33.7, BLUE);
    bubble('tekan', 'DADA TEKAN KUAT!', t, 33.76, 35.9, 420, 104, { top: '#ffe0e0', bot: '#ff5c7a' });
    const q = pop(t, 36.0, 37.2, { from: 3 });
    if (q.o > 0) ov.bubble('achoo2', 'ACHOO!', { x: W / 2 + 12 * Math.sin(t * 40) * (1 - inv(36.0, 36.5, t)), y: 430, o: q.o, s: q.s, r: -4 }, { size: 170, top: '#ffffff', bot: '#4ab8ff' });
    if (t > 36.0) ov.flash(0.4 * (1 - inv(36.0, 36.3, t)), '235,248,255');
    topTag('keluar', 'UDARA MENEMBAK KELUAR', t, 37.14, 39.2, BLUE, 1240);
    bubble('laju', 'LAJU-LAJU!', t, 38.42, 39.25, 420, 140, { top: '#e0f6ff', bot: '#2fa8d8' }, 3);
    bubble('halau', 'HALAU PENCEROBOH!', t, 39.3, 41.65, 420, 104, { top: '#fff0d0', bot: '#ff9a3d' });
    return studio;
  }],
  // S11 — "Tahu tak? Setiap kali bersin, mata kita tertutup sendiri. Tak boleh buka pun!" (slow motion)
  [41.7, 47.72, (t) => {
    kitReset();
    mamaSet(t, { shake: 0, look: 1 });
    const slowT = 43.55;
    const sn = ach(t, slowT, { pre: 0.9, hold: 3.6, slow: 6 });
    const strain = inv(46.0, 46.4, t) * (t < 47.2 ? 1 : 0);
    affSet(t, { yaw: YAW_CAM, ...(t > 42.5 ? sn : {}), brow: t > 46.0 && t < 47.2 ? 0.8 * strain + 0.2 * Math.sin(t * 20) * strain : t > 42.5 ? sn.brow : 0.3 });
    sprayBurst(kit.spray, t, slowT, affNose(), affFwd(), { speed: 2.4, size: 0.06, spread: 0.5, slow: 0.18, life: 1.2 });
    const ah = affHead();
    lookCam(affFront(2.5, 0.45), ah.clone().add(V(0, -0.15, 0)), 44);
    topTag('tahu', 'TAHU TAK?', t, 41.7, 43.2, PURPLE);
    topTag('perlahan', 'GERAK PERLAHAN', t, 43.3, 47.6, '#3a4466');
    pinTag('mata', 'MATA TERTUTUP SENDIRI', scr(ah.clone().add(V(0, 0.3, 0))), t, 44.1, 46.0, { bg: BLUE, pointer: 'down' }, -80);
    bubble('takboleh', 'TAK BOLEH BUKA PUN!', t, 46.06, 47.68, 420, 100, { top: '#e0ecff', bot: '#4a7aff' });
    return kit;
  }],
  // S12 — droplets fly a few metres; with a cold, germs can reach other people
  [47.72, 54.62, (t) => {
    stReset();
    studio.kak.root.visible = t > 51.0;
    const s1 = ach(t, 48.1, { pre: 0.35 });
    const s2 = ach(t, 52.3, { pre: 0.5 });
    const p = t < 50.8 ? s1 : t > 51.6 ? s2 : {};
    stAff(t, A_ST, { ...p, brow: t > 50.9 && t < 51.8 ? -0.4 : p.brow ?? 0.2, smile: t > 50.9 && t < 51.8 ? 0.2 : p.smile ?? 0.9 });
    const nz = stNose();
    // a slow drifting droplet cloud (first sneeze) reaching ~3 m
    const half = Math.floor(studio.spray.length / 2);
    sprayBurst(studio.spray.slice(0, half), t, 48.1, nz, V(1, -0.1, 0), { speed: 7.5, life: 3.4, spread: 0.3, size: 0.24, gravity: 0.15, op: 0.95 });
    sprayBurst(studio.spray.slice(half), t, 52.3, nz, V(1, -0.1, 0), { speed: 7.5, life: 2.4, spread: 0.3, size: 0.24, gravity: 0.15, op: 0.95 });
    // germs ride the second sneeze to Kakak
    const kh = studio.kak.parts.head.getWorldPosition(V()).add(V(-0.45, -0.1, 0));
    studio.germs.forEach((g, i) => {
      const u = (t - 52.35 - i * 0.07) / 1.5;
      g.visible = u > 0 && u < 1.25;
      if (!g.visible) return;
      const R = rng(i * 5 + 3);
      g.position.copy(nz).lerp(kh, easeOut(Math.min(1, u))).add(V(0, Math.sin(u * Math.PI) * (0.3 + R() * 0.5) + (R() - 0.5) * 0.5, (R() - 0.5) * 0.6));
      g.rotation.set(t * 2 + i, t * 3, 0);
    });
    const hit = inv(53.6, 53.9, t);
    stKak(t, { wow: 0.8 * hit, lean: -0.15 * hit, brow: 0.6 * hit - 0.2, smile: 0.9 - 0.7 * hit, armR: hit > 0 ? { reach: [-0.2, 0.9, 0.6], pole: [-1, -0.5, 0] } : undefined });
    // camera follows the cloud along the tape, then frames both
    if (t < 51.0) {
      const cx = lerp(A_ST.x + 1.2, TAPE_X0 + 3 * M - 1.2, easeInOut(inv(48.4, 50.9, t)));
      lookCam(V(cx, 2.4, 8.6), V(cx, 1.2, 0.6), 50);
    } else camMove(t, 51.0, 54.62, [(A_ST.x + K_ST.x) / 2, 2.7, 13.6], [(A_ST.x + K_ST.x) / 2, 1.3, 0.6], [(A_ST.x + K_ST.x) / 2, 2.6, 13.2], [(A_ST.x + K_ST.x) / 2, 1.3, 0.6], 50);
    ov.flash(1 - inv(47.72, 48.0, t));
    [1, 2, 3].forEach((m, i) => {
      const at = 48.5 + i * 0.75;
      pinTag('m' + m, m + ' METER', scr(V(TAPE_X0 + m * M, 0.3, 1.8)), t, at, 51.0, { bg: YELLOW, pointer: 'down' }, -40);
    });
    bubble('meter', 'BEBERAPA METER!', t, 50.06, 51.0, 420, 112, { top: '#fff6d0', bot: '#ffb21f' });
    pinTag('selsema', 'SELSEMA', scr(studio.aff.parts.head.getWorldPosition(V()).add(V(0, 0.75, 0))), t, 51.5, 52.9, { bg: ORANGE, pointer: 'down' }, -30);
    pinTag('kuman', 'KUMAN!', scr(kh.clone().add(V(0, 0.5, 0))), t, 53.0, 54.6, { bg: GREEN, pointer: 'down' }, -40);
    bubble('orang', 'KE ORANG LAIN!', t, 53.82, 54.6, 420, 112, { top: '#e0ffd8', bot: '#3fbf4a' });
    return studio;
  }],
  // S13 — "Waaah, rupanya bersin tu cara hidung bersihkan diri!"
  [54.62, 58.98, (t) => {
    kitReset();
    mamaSet(t, { shake: 0, look: 1 });
    affSet(t, { yaw: YAW_CAM, wow: keys(t, [[54.65, 0], [54.8, 0.9], [55.4, 0.9], [55.7, 0]]), smile: 1, brow: 0.5 });
    const ah = affHead();
    lookCam(affFront(2.9, 0.6), ah.clone().add(V(0, -0.2, 0)), 46);
    ov.flash((1 - inv(54.62, 54.95, t)) * 0.9, '255,250,235');
    bulbAt(t, 54.65, 58.9);
    ov.sparkles(t, { n: 30, seed: 12, y: 250, h: 900, a: inv(54.7, 55.0, t) * (1 - inv(57.0, 57.6, t)) });
    bubble('bersih', 'HIDUNG BERSIHKAN\nDIRI SENDIRI!', t, 57.0, 58.95, 440, 96, { top: '#e0f6ff', bot: '#2fa8d8' });
    return kit;
  }],
  // S14 — "Ingat, bila nak bersin, tutup mulut dengan siku atau tisu, dan cuci tangan, ya."
  [58.98, 64.56, (t) => {
    kitReset();
    mamaSet(t, { shake: 0, look: 1 });
    const elbow = keys(t, [[60.2, 0], [60.6, 1], [61.9, 1], [62.3, 0]]);
    const tis = keys(t, [[62.3, 0], [62.6, 1], [63.1, 1], [63.35, 0]]);
    const wash = inv(63.3, 63.6, t);
    const sn = ach(t, 61.25, { pre: 0.6 });
    let armR, armL;
    if (elbow > 0) armR = { reach: mix3([-0.55, 0.3, 0.25], [0.32, 1.22, 0.42], elbow), pole: mix3([-1, -0.6, -0.3], [-0.2, 0.3, 1], elbow) };
    else if (tis > 0) armR = { reach: mix3([-0.55, 0.3, 0.25], [-0.04, 1.2, 0.66], tis), pole: [-1, -0.6, -0.2] };
    else if (wash > 0) {
      const rub = 0.07 * Math.sin(t * 14);
      armR = { reach: [-0.06 + rub, 0.55, 0.62], pole: [-1, -0.6, 0] };
      armL = { reach: [0.06 + rub, 0.52, 0.62], pole: [1, -0.6, 0] };
    }
    affSet(t, { yaw: YAW_CAM, ...(t > 60.4 && t < 62.0 ? sn : {}), armR, armL });
    if (t > 61.25 && t < 62.0) sprayBurst(kit.spray, t, 61.25, affNose(), affFwd(), { n: 20, speed: 0.6, size: 0.05, spread: 0.6, life: 0.4 });
    if (tis > 0.2) {
      kit.tissue.visible = true;
      kit.tissue.position.copy(kit.aff.parts.arms.R.hand.getWorldPosition(V())).add(V(0, 0.05, 0.06));
    }
    if (wash > 0) {
      const hc = kit.aff.parts.arms.R.hand.getWorldPosition(V()).lerp(kit.aff.parts.arms.L.hand.getWorldPosition(V()), 0.5);
      kit.bubbles.forEach((b, i) => {
        const u = ((t - 63.3) * 0.6 + i / kit.bubbles.length) % 1;
        b.visible = true;
        b.position.copy(hc).add(V(Math.sin(i * 2.3) * 0.18, u * 0.5, Math.cos(i * 1.7) * 0.12));
        b.scale.setScalar(wash * (0.6 + 0.8 * Math.sin(i) ** 2) * (1 - u * 0.4));
      });
    }
    const ah = affHead();
    lookCam(affFront(3.1, 0.6), ah.clone().add(V(0, -0.35, 0)), 48);
    bubble('ingat', 'INGAT!', t, 58.98, 60.2, 430, 140, { top: '#fff6d0', bot: '#ffb21f' });
    const ticks = [['SIKU ✓', 62.04, 62.75], ['TISU ✓', 62.78, 63.25], ['CUCI TANGAN ✓', 63.64, 64.55]];
    ticks.forEach(([txt, a, b], i) => {
      const q = pop(t, a, 64.55);
      if (q.o > 0) ov.tag('tk' + i, txt, { x: W / 2, y: 330 + i * 86, o: q.o, s: q.s }, { bg: [ORANGE, BLUE, GREEN][i], small: true });
    });
    topTag('tutup', 'TUTUP MULUT', t, 61.22, 62.0, PURPLE, 330);
    return kit;
  }],
  // S15 — "Apa lagi kita nak belajar lepas ni?"
  [64.56, OUTRO, (t) => {
    kitReset();
    mamaSet(t, { shake: 0, look: 1 });
    const tk = keys(t, [[64.6, 0], [65.0, 1]]);
    const th2 = POSES.thinkR.armR;
    affSet(t, { yaw: YAW_CAM, smile: 1, brow: 0.3 + 0.4 * tk, headRoll: -0.12 * tk, lookX: 0.35 * tk, lookY: 0.4 * tk, headPitch: -0.08 * tk, armR: { reach: mix3([-0.55, 0.3, 0.2], th2.reach, tk), pole: th2.pole, point: tk, wx: th2.wx * tk } });
    const ah = affHead();
    lookCam(affFront(2.9, 0.6), ah.clone().add(V(0, -0.25, 0)), 46);
    const hd = scr(ah.clone().add(V(0, 0.45, 0)));
    qmarks(t, hd, 64.56, OUTRO - 0.05, [[64.6, -260, -100, '#ffcf33', -12], [64.9, 250, -160, '#3fa2ff', 10], [65.2, 300, 60, '#ffcf33', 14]]);
    return kit;
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
  if (w !== outro) ov.vignette(0.2);
  ov.captions(t, CAPTIONS, KEYWORDS);
  ov.end();
}

// Cover / thumbnail (9:16): Affan mid-sneeze with a spray of droplets.
function thumbnail() {
  ov.begin();
  cam.aspect = W / H;
  cam.updateProjectionMatrix();
  const t = 7.02;
  kitReset();
  mamaSet(t, { shake: 0, look: 1, wow: 0.8 });
  affSet(t, { yaw: YAW_CAM, ...ach(t, 6.9) });
  sprayBurst(kit.spray, t, 6.9, affNose(), affFwd(), { speed: 2.6, size: 0.08, spread: 0.55 });
  const ah = affHead();
  lookCam(affFront(2.5, 0.4).add(V(0, -0.25, 0)), ah.clone().add(V(0, 0.05, 0)), 50);
  renderer.setViewport(0, 0, W, H);
  renderer.render(kit.scene, cam);
  const g = ov.g;
  const top = g.createLinearGradient(0, 0, 0, 720);
  top.addColorStop(0, 'rgba(20,40,70,0.5)');
  top.addColorStop(1, 'rgba(20,40,70,0)');
  g.fillStyle = top;
  g.fillRect(0, 0, W, 720);
  const bot = g.createLinearGradient(0, H - 900, 0, H);
  bot.addColorStop(0, 'rgba(20,30,50,0)');
  bot.addColorStop(1, 'rgba(20,30,50,0.55)');
  g.fillStyle = bot;
  g.fillRect(0, H - 900, W, 900);
  ov.vignette(0.3);
  ov.tag('thBadge', 'EPISOD 41', { x: W / 2, y: 300 }, { bg: '#2f7bff', small: true });
  ov.bubble('thTitle', 'ACHOO!', { x: W / 2, y: 455, r: -4 }, { size: 190, top: '#ffffff', bot: '#4ab8ff' });
  ov.bubble('thTitle2', 'KENAPA BERSIN?', { x: W / 2, y: 625, r: 2 }, { size: 104 });
  ov.html('thQ', ICONS.qmark('#ffcf33'), { x: 930, y: 800, r: 14, s: 0.9 });
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
