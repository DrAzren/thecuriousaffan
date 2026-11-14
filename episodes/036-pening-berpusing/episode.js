// THE CURIOUS AFFAN — Episode 036: "Kenapa Kita Pening Lepas Berpusing?"
// Every shot is a pure function of time t (seconds), synced to audio/narration.mp3.
import * as THREE from 'three';
import { makeRenderer, loadEnvelope, toScreen, clamp, lerp, inv, easeOut, easeIn, easeInOut, keys, wobble, W, H } from '../../shared/core.js';
import { POSES, blinkAt } from '../../shared/affan.js';
import { Overlay, pop, ICONS, drawLogo } from '../../shared/overlay.js';
import { CAPTIONS, KEYWORDS } from './captions.js';
import { buildPlayground, buildEar, buildMindStage, buildOutro, BRAIN, PLAY_SCALE, MGR_R, MGR_TOP, BENCH, CANAL_R, AMP_ANGLE, N_BEADS, CUP } from './worlds.js';

const FPS = 30;
const DURATION = 70.45;
const OUTRO = 67.3;

const stage = document.getElementById('stage');
const canvas = document.createElement('canvas');
stage.appendChild(canvas);
const renderer = makeRenderer(canvas);
const ov = new Overlay(stage);
const play = buildPlayground();
const ear = buildEar();
const mind = buildMindStage();
const outro = buildOutro();
mind.kak.root.visible = false;
mind.guard.group.visible = false;
mind.ring.visible = false;
const cam = new THREE.PerspectiveCamera(50, W / H, 0.02, 6000);
let env = { at: () => 0 };

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const talk = (t) => clamp(env.at(t) * 1.2);
const scr = (p) => toScreen(p, cam);
const mix3 = (a, b, k) => a.map((v, i) => lerp(v, b[i], k));
const BLUE = '#2f9bff', YELLOW = '#e0b400', ORANGE = '#ff8a3d', PURPLE = '#7a5cf0', GREEN = '#2fbf5f', PINK = '#ff5c9a', TEAL = '#20b8a0';

function lookCam(pos, look, fov = 50, roll = 0) {
  cam.position.copy(pos);
  cam.fov = fov;
  cam.updateProjectionMatrix();
  cam.lookAt(look);
  if (roll) cam.rotateZ(roll);
  cam.updateMatrixWorld(true);
}
function camMove(t, a, b, p0, l0, p1, l1, fov = 50, ease = easeInOut, roll = 0) {
  const k = ease(inv(a, b, t));
  lookCam(V(...mix3(p0, p1, k)), V(...mix3(l0, l1, k)), fov, roll);
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
// cartoon "dizzy stars" circling over a head (screen space)
function dizzyStars(t, head, k, r = 120) {
  if (k <= 0.01 || !head.visible) return;
  for (let i = 0; i < 5; i++) {
    const a = t * 4 + (i / 5) * Math.PI * 2;
    ov.star(head.x + Math.cos(a) * r, head.y - 40 + Math.sin(a) * r * 0.3, 26 * k, k * (0.6 + 0.4 * Math.sin(a)), ['#ffd84a', '#fff6c8', '#9fe0ff', '#ffb3d1', '#ffd84a'][i], a);
  }
}

// ------------------------------------------------------------- playground
// merry-go-round angle: fast spin until it slows to a stop at 6.5 s
const MGR_W = 3.2;
function mgrAngle(t) {
  if (t < 5.6) return MGR_W * t;
  const T = 0.9; // decelerate over T seconds
  const u = clamp((t - 5.6) / T);
  return MGR_W * 5.6 + MGR_W * T * (u - (u * u) / 2);
}
const RIDE = { r: MGR_R * 0.72, a: 0.0 };
function rideAff(t, p = {}) {
  const a = play.aff;
  const ang = mgrAngle(t) + RIDE.a;
  play.mgr.rotation.y = mgrAngle(t);
  const pos = V(Math.cos(ang) * RIDE.r, MGR_TOP, -Math.sin(ang) * RIDE.r);
  a.root.position.copy(pos);
  // face along the spin (tangent), lean out a little
  const yaw = Math.atan2(-Math.sin(ang + Math.PI / 2), Math.cos(ang + Math.PI / 2)) + Math.PI / 2;
  a.pose({ yaw: ang + Math.PI, blink: blinkAt(t, 1), talk: talk(t), smile: 1, tilt: 0.12, armL: { reach: [0.45, 1.3, 0.55], pole: [1, -0.5, -0.3] }, armR: { reach: [-0.45, 1.3, 0.55], pole: [-1, -0.5, -0.3] }, ...p });
  void yaw;
  a.root.updateMatrixWorld(true);
}
const A_OFF = V(2.95, 0, 1.25); // where Affan stands after getting off
function standAff(t, pos, yaw, p = {}) {
  const a = play.aff;
  a.root.position.copy(pos);
  a.pose({ yaw, blink: blinkAt(t, 1), talk: talk(t), smile: 0.9, ...p });
  a.root.updateMatrixWorld(true);
}
// wobbly dizzy body
const dizzy = (t, k) => ({
  tilt: 0.16 * k * Math.sin(t * 3.1),
  lean: 0.06 * k * Math.sin(t * 2.3 + 1),
  headRoll: 0.22 * k * Math.sin(t * 3.1 + 0.6),
  lookX: 0.6 * k * Math.sin(t * 6),
  lookY: 0.4 * k * Math.cos(t * 6),
  armL: { x: 0, z: 0.12 + 0.7 * k + 0.2 * k * Math.sin(t * 3), el: -0.3 },
  armR: { x: 0, z: -0.12 - 0.7 * k - 0.2 * k * Math.sin(t * 3 + 1), el: -0.3 },
});
const BENCH_SEAT = BENCH.clone().add(V(0.1, 0.62 - 0.24, 0.05));
function benchAff(t, p = {}) {
  const a = play.aff;
  a.root.position.copy(BENCH_SEAT).add(V(0, -0.98 * PLAY_SCALE + 0.24, 0));
  a.pose({ ...POSES.seated, yaw: -0.6, blink: blinkAt(t, 1), talk: talk(t), smile: 1, armL: { reach: [0.55, 0.35, 0.3] }, armR: { reach: [-0.55, 0.35, 0.3] }, ...p });
  a.root.updateMatrixWorld(true);
}

// ------------------------------------------------------------ inside the ear
// head (tube) spin speed and the lagging water: dw_f/dt = (w_h - w_f) / TAU
const SPIN_ON = 27.6, SPIN_FULL = 28.5, SPIN_OFF = 37.4, OMEGA = 3.6, TAU = 3.0;
const omegaH = (t) => (t < SPIN_ON ? 0 : t < SPIN_FULL ? OMEGA * easeInOut(inv(SPIN_ON, SPIN_FULL, t)) : t < SPIN_OFF ? OMEGA : t < SPIN_OFF + 0.15 ? OMEGA * (1 - inv(SPIN_OFF, SPIN_OFF + 0.15, t)) : 0);
const DT = 1 / 120;
const T0 = 20, T1 = 44;
const TAB = (() => {
  const n = Math.ceil((T1 - T0) / DT) + 1;
  const ph = new Float64Array(n), pf = new Float64Array(n), wf = new Float64Array(n), wh = new Float64Array(n);
  let w = 0, a = 0, b = 0;
  for (let i = 0; i < n; i++) {
    const t = T0 + i * DT;
    const h = omegaH(t);
    wh[i] = h;
    wf[i] = w;
    ph[i] = a;
    pf[i] = b;
    w += ((h - w) / TAU) * DT;
    a += h * DT;
    b += w * DT;
  }
  return { ph, pf, wf, wh, n };
})();
function earState(t) {
  const i = clamp(Math.round((t - T0) / DT), 0, TAB.n - 1);
  return { phH: TAB.ph[i], phF: TAB.pf[i], wH: TAB.wh[i], wF: TAB.wf[i] };
}
// set the labyrinth: head angle phH, water angle phF, flow (wH - wF) bends the hairs
function earSet(t, { phH = 0, phF = 0, flow = 0, water = 1, glowHair = 0 } = {}) {
  ear.lab.rotation.y = phH;
  ear.lab.updateMatrixWorld(true);
  ear.hairs.rotation.x = clamp(flow * 0.55, -0.95, 0.95);
  ear.hairs.children.forEach((h, i) => (h.rotation.x = 0.06 * Math.sin(t * 5 + i) * (1 - Math.abs(flow) * 0.2)));
  ear.cap.material.opacity = 0.35 + 0.25 * glowHair;
  // beads in the horizontal loop: local angle = base + (phH - phF)
  const rel = phH - phF;
  ear.beads.forEach((b, i) => {
    let th = (i / N_BEADS) * Math.PI * 2 + rel;
    th = ((th % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    const inTube = th > 0.08 && th < Math.PI * 1.7 - 0.08;
    b.visible = water > 0.01 && inTube;
    if (!b.visible) return;
    const lp = V(CANAL_R * Math.cos(th), 0.03 * Math.sin(i * 1.7 + t * 3), CANAL_R * Math.sin(th));
    b.position.copy(ear.hor.localToWorld(lp));
    b.scale.setScalar(water * (0.85 + 0.25 * ((i * 7) % 3) / 2));
  });
  ear.sideBeads.forEach((arr, k) =>
    arr.forEach((b, i) => {
      const th = 0.15 + (i / arr.length) * (Math.PI * 1.7 - 0.3) + 0.04 * Math.sin(t * 2 + i + k);
      b.visible = water > 0.01;
      b.position.set(CANAL_R * Math.cos(th), 0, CANAL_R * Math.sin(th));
      b.scale.setScalar(water);
    })
  );
  ear.sig.forEach((s) => (s.visible = false));
}
const ampWorld = () => ear.amp.getWorldPosition(V());
// glowing signal dots from the hairs up to "the brain" (off the top of the frame)
function earSignal(t, a, b, color = 0x7affd8) {
  if (t < a || t > b) return;
  const from = ampWorld();
  const to = from.clone().add(V(-0.5, 7, 0));
  ear.sig.forEach((s, i) => {
    const u = ((t - a) * 0.7 + i / ear.sig.length) % 1;
    s.position.copy(from).lerp(to, u);
    s.position.x += 0.25 * Math.sin(u * 9 + i);
    s.material.color.setHex(color);
    s.material.opacity = Math.sin(u * Math.PI) * clamp((b - t) / 0.3);
    s.visible = true;
  });
}
function earAff(t, p = {}) {
  const a = ear.aff;
  a.root.position.set(3.4, 0, 2.6);
  a.pose({ yaw: -0.9, blink: blinkAt(t, 3), talk: talk(t), smile: 0.95, headPitch: -0.15, lookY: 0.2, ...p });
  a.root.updateMatrixWorld(true);
}
// cup of tea: stir angle (the spoon goes round until 41.6, then is lifted out)
const STIR_A = 40.7, STIR_B = 41.65, LIFT = 42.15;
function cupSet(t) {
  const w = (tt) => (tt < STIR_B ? 6.5 * easeOut(inv(STIR_A, STIR_A + 0.4, tt)) : 6.5 * Math.exp(-(tt - STIR_B) / 2.4));
  // integrate the swirl angle (closed form is fine piecewise)
  let ang;
  if (t < STIR_B) ang = 6.5 * Math.max(0, t - STIR_A - 0.2);
  else ang = 6.5 * (STIR_B - STIR_A - 0.2) + 6.5 * 2.4 * (1 - Math.exp(-(t - STIR_B) / 2.4));
  ear.tea.rotation.z = -ang * 0.8;
  ear.leaves.forEach((l, i) => {
    const a = l.userData.a + ang * (1.2 - l.userData.r * 0.5);
    l.position.set(Math.cos(a) * l.userData.r, 1.47 + 0.01 * Math.sin(t * 4 + i), Math.sin(a) * l.userData.r);
    l.rotation.y = -a;
  });
  const sa = STIR_A + 0.0 < t ? ang * 1.0 : 0;
  const lift = easeInOut(inv(STIR_B, LIFT, t));
  ear.spoon.position.set(Math.cos(sa) * 0.6 * (1 - lift), 1.25 + lift * 2.4, Math.sin(sa) * 0.6 * (1 - lift));
  ear.spoon.rotation.set(Math.sin(sa) * 0.25, 0, -Math.cos(sa) * 0.25 - lift * 0.3);
  return w(t);
}

// --------------------------------------------------------------- mind stage
const A_M = V(0.35, 0, 0.6);
function mindAff(t, p = {}) {
  mind.aff.root.position.copy(A_M);
  mind.aff.pose({ yaw: -0.12, blink: blinkAt(t, 2), talk: talk(t), smile: 0.9, ...p });
  mind.aff.root.updateMatrixWorld(true);
}
function mindIdle(t, conf = 0) {
  mind.brain.position.copy(BRAIN).add(V(0, 0.08 * Math.sin(t * 1.4), 0));
  mind.brain.rotation.set(0, 0.35 * conf * Math.sin(t * 4.5), 0.025 * Math.sin(t * 0.9) + 0.18 * conf * Math.sin(t * 6));
  mind.trail.forEach((m, i) => m.scale.setScalar(1 + 0.12 * Math.sin(t * 3 + i)));
  mind.cerebGlow.material.opacity = 0;
  mind.sig.forEach((s) => (s.visible = false));
  mind.copy.forEach((s) => (s.visible = false));
}
// dots flowing along a curve from p0 to p1 (bowed upwards)
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

// ======================================================================= SHOTS
const SHOTS = [
  // S1 — playground: Affan on the spinning merry-go-round, laughing
  [0, 3.0, (t) => {
    rideAff(t, { headYaw: 0.3 });
    camMove(t, 0, 3.0, [5.6, 3.6, 8.0], [0, 1.0, 0], [4.8, 3.2, 7.0], [0, 1.0, 0], 50);
    const q = pop(t, 0.4, 2.95);
    ov.tag('ep', 'EPISOD 36', { x: W / 2, y: 268, o: q.o, s: q.s }, { bg: '#2f7bff', small: true });
    pinTag('pusing', 'PUSING-PUSING', scr(V(0, MGR_TOP + 1.9, 0)), t, 0.8, 2.9, { bg: ORANGE, pointer: 'down' }, -40);
    return play;
  }],
  // S2 — "Papa! Tadi Affan main pusing-pusing laju-laju..."
  [3.0, 6.45, (t) => {
    rideAff(t, { headYaw: 0.25, wow: 0 });
    camMove(t, 3.0, 6.45, [3.9, 2.6, 5.0], [0, 1.25, 0], [3.6, 2.5, 4.6], [0, 1.2, 0], 50);
    const sl = clamp(1 - inv(5.6, 6.4, t));
    ov.speedLines(t, { y0: 500, y1: 1300, n: 16, a: 0.45 * sl, dir: 1, seed: 4 });
    const pp = pop(t, 3.06, 3.8, { from: 2 });
    ov.bubble('papa', 'PAPA!', { x: 800, y: 470, o: pp.o, s: pp.s * 0.8, r: 6 }, { size: 110 });
    bubble('laju', 'LAJU-LAJU!', t, 5.3, 6.4, 430, 140, { top: '#fff6d0', bot: '#ffb21f' }, 3);
    return play;
  }],
  // S3 — off the ride: "eh, dah berhenti, tapi dunia macam masih berpusing!" (gentle wobble)
  [6.45, 10.27, (t) => {
    play.mgr.rotation.y = mgrAngle(t);
    const k = clamp(inv(6.6, 7.0, t));
    standAff(t, A_OFF, -0.9, { ...dizzy(t, k), smile: 0.5, wow: keys(t, [[6.5, 0], [6.6, 0.7], [7.0, 0.7], [7.3, 0]]) });
    // the camera sways a little (kept short and soft)
    const sway = 0.06 * Math.sin(t * 2.6) * inv(8.1, 8.5, t) * (1 - inv(9.9, 10.25, t));
    camMove(t, 6.45, 10.27, [1.0, 2.4, 6.0], [2.7, 1.5, 1.2], [1.2, 2.3, 5.5], [2.75, 1.5, 1.2], 46, easeInOut, sway);
    const hd = scr(A_OFF.clone().add(V(0, 2.05, 0)));
    dizzyStars(t, hd, inv(7.2, 7.6, t), 120);
    bubble('berhenti', 'DAH BERHENTI...', t, 6.96, 8.05, 430, 112, { top: '#e6ecff', bot: '#7aa8ff' });
    bubble('dunia', 'DUNIA MASIH\nBERPUSING?!', t, 8.12, 10.22, 450, 104, { top: '#fff6d0', bot: '#ffb21f' }, 2);
    return play;
  }],
  // S4 — "Kenapa kita pening lepas berpusing?"
  [10.27, 12.6, (t) => {
    play.mgr.rotation.y = mgrAngle(t);
    const k = 1 - 0.6 * inv(10.3, 12.4, t);
    standAff(t, A_OFF, -0.9, { ...dizzy(t, k), smile: 0.4, brow: -0.4 });
    camMove(t, 10.27, 12.6, [1.9, 2.15, 3.9], [2.85, 1.75, 1.25], [2.0, 2.1, 3.6], [2.85, 1.8, 1.25], 46);
    const hd = scr(A_OFF.clone().add(V(0, 2.05, 0)));
    dizzyStars(t, hd, k, 150);
    bubble('pening', 'PENING!', t, 11.0, 12.55, 430, 150, { top: '#ffd0e0', bot: '#ff5c7a' }, 3);
    qmarks(t, hd, 10.3, 12.55, [[10.4, -280, -60, '#ffcf33', -12], [10.8, 270, -120, '#3fa2ff', 10]]);
    return play;
  }],
  // S5 — "Jom ikut Affan cari jawapan!" + swirl into the ear
  [12.6, 14.6, (t) => {
    play.mgr.rotation.y = mgrAngle(t);
    const up = keys(t, [[12.62, 0], [12.85, 1], [14.1, 1], [14.4, 0.6]], easeOut);
    standAff(t, A_OFF, -0.9, { smile: 1, brow: 0.6, armR: { reach: [lerp(-0.6, -0.55, up), lerp(0.25, 1.95 + 0.06 * Math.sin(t * 14), up), lerp(0.2, 0.35, up)], pole: [-1, -0.3, -0.5] } });
    // push in towards the ear
    const head = play.aff.parts.head.getWorldPosition(V());
    const side = V(Math.cos(-0.9), 0, -Math.sin(-0.9)).multiplyScalar(-1);
    const k = easeIn(inv(13.2, 14.6, t));
    lookCam(V(2.0, 2.1, 3.6).lerp(head.clone().addScaledVector(side, 0.6), k), V(2.85, 1.8, 1.25).lerp(head, k), 46);
    ov.swirl(t, W / 2, 820, inv(12.9, 14.5, t));
    ov.flash(inv(14.2, 14.6, t) ** 2);
    return play;
  }],
  // S6 — inside the ear: three looped tubes full of water, with tiny hairs
  [14.6, 27.4, (t) => {
    earSet(t, { water: easeOut(inv(22.6, 23.2, t)), flow: 0.08 * Math.sin(t * 2), glowHair: inv(24.4, 24.9, t) * (1 - inv(27.0, 27.4, t)) });
    earAff(t);
    if (t < 24.2) camMove(t, 14.6, 24.2, [0.4, 5.5, 9.5], [0.2, 2.4, 0], [1.4, 4.6, 7.6], [0.2, 2.6, 0], 50);
    else {
      const ap = ampWorld();
      camMove(t, 24.2, 27.4, [1.4, 4.6, 7.6], [0.2, 2.6, 0], [ap.x + 1.6, ap.y + 0.7, ap.z + 2.4], [ap.x, ap.y - 0.15, ap.z], 46);
    }
    ov.flash(1 - inv(14.6, 14.95, t));
    bubble('rahsia', 'RAHSIA DALAM TELINGA!', t, 14.88, 17.25, 430, 92, { top: '#d6fff0', bot: '#2fbf8f' });
    topTag('tiga', 'TIGA TIUB GELUNG', t, 19.5, 22.0, BLUE);
    pinTag('air', 'PENUH DENGAN AIR', scr(ear.hor.localToWorld(V(CANAL_R * Math.cos(0.6), 0.5, CANAL_R * Math.sin(0.6)))), t, 22.66, 24.1, { bg: '#2f8fff', pointer: 'down' }, -50);
    pinTag('bulu', 'BULU-BULU HALUS', scr(ampWorld().add(V(0, 0.5, 0))), t, 24.42, 27.35, { bg: PINK, pointer: 'down' }, -60);
    return ear;
  }],
  // S7 — the head spins: the water spins too, the hairs lean and tell the brain
  [27.4, 36.35, (t) => {
    const s = earState(t);
    earSet(t, { phH: s.phH, phF: s.phF, flow: s.wH - s.wF, glowHair: inv(31.6, 32.0, t) });
    earAff(t, { headYaw: 0.3 * Math.sin(t * 3), smile: 1 });
    if (t < 31.4) camMove(t, 27.4, 31.4, [0.6, 6.2, 8.5], [0.2, 2.4, 0], [0.4, 6.6, 8.8], [0.2, 2.3, 0], 50);
    else if (t < 33.3) {
      const ap = ampWorld();
      lookCam(V(ap.x * 0.6 + 1.2, ap.y + 1.6, ap.z * 0.6 + 3.0), ap.clone().add(V(0, -0.2, 0)), 46);
    } else camMove(t, 33.3, 36.35, [0.6, 4.6, 9.5], [0.2, 4.0, 0], [0.6, 5.2, 10.5], [0.2, 4.6, 0], 50);
    earSignal(t, 33.4, 36.3);
    bubble('berpusing', 'BERPUSING!', t, 28.06, 29.1, 430, 130, { top: '#fff6d0', bot: '#ffb21f' }, 3);
    topTag('ikut', 'AIR PUN IKUT BERPUSING', t, 29.14, 31.5, '#2f8fff');
    pinTag('condong', 'CONDONG!', scr(ampWorld().add(V(0, 0.55, 0))), t, 32.4, 33.3, { bg: PINK, pointer: 'down' }, -60);
    topTag('otak', 'ISYARAT KE OTAK', t, 33.42, 36.3, PURPLE);
    bubble('tengah', 'KITA TENGAH BERPUSING!', t, 34.56, 36.3, 1200, 84, { top: '#d6fff0', bot: '#20b8a0' });
    return ear;
  }],
  // S8 — stop suddenly: the water keeps spinning
  [36.35, 40.75, (t) => {
    const s = earState(t);
    earSet(t, { phH: s.phH, phF: s.phF, flow: s.wH - s.wF, glowHair: inv(37.6, 38.0, t) });
    earAff(t, { wow: keys(t, [[38.8, 0], [39.0, 0.8], [39.8, 0.8], [40.1, 0]]) });
    camMove(t, 36.35, 40.75, [0.8, 6.4, 7.6], [0.2, 2.4, 0], [1.2, 6.0, 7.0], [0.2, 2.3, 0], 50);
    bubble('stop', 'BERHENTI!', t, 37.32, 38.8, 430, 140, { top: '#ffd0d0', bot: '#ff4d5e' }, -3);
    bubble('masih', 'AIR MASIH BERPUSING!', t, 38.88, 40.7, 430, 92, { top: '#d6f0ff', bot: '#2f8fff' }, 2);
    pinTag('condong2', 'CONDONG KE ARAH LAIN', scr(ampWorld().add(V(0, 0.55, 0))), t, 39.3, 40.7, { bg: PINK, pointer: 'down' }, -60);
    return ear;
  }],
  // S9 — like stirred tea in a cup: lift the spoon and the tea keeps turning
  [40.75, 43.22, (t) => {
    earSet(t, { water: 0 });
    cupSet(t);
    camMove(t, 40.75, 43.22, [CUP.x + 0.4, 4.6, 3.6], [CUP.x, 1.2, 0], [CUP.x + 0.2, 4.9, 3.0], [CUP.x, 1.3, 0], 46);
    ov.flash((1 - inv(40.75, 41.0, t)) * 0.5);
    bubble('cawan', 'MACAM AIR\nDALAM CAWAN', t, 40.78, 43.18, 450, 104, { top: '#fff0d0', bot: '#ff9a3d' });
    topTag('kacau', 'KACAU... ANGKAT SUDU... MASIH BERPUSING!', t, 41.9, 43.18, ORANGE, 1240);
    return ear;
  }],
  // S10 — mind stage: the ear says "still spinning!", the eyes say "stopped!", the brain is confused
  [43.22, 52.8, (t) => {
    const conf = inv(49.0, 49.6, t);
    mindIdle(t, conf);
    mindAff(t, { ...dizzy(t, 0.4 + 0.6 * conf), smile: 0.6, brow: -0.3 });
    const head = mind.aff.parts.head.getWorldPosition(V());
    const earP = head.clone().add(V(-1.1, 0.0, 0.2));
    const eyeP = head.clone().add(V(0.25, 0.25, 1.0));
    const top = BRAIN.clone().add(V(0, -1.4, 0.8));
    flow(mind.copy, t, 43.26, 49.0, earP, top, 1.0);
    flow(mind.sig, t, 45.84, 49.0, eyeP, top.clone().add(V(0.6, 0, 0)), 1.2);
    if (t < 49.0) camMove(t, 43.22, 49.0, [0.4, 4.7, 13.4], [-0.3, 4.6, -0.3], [0.2, 4.6, 12.6], [-0.4, 4.6, -0.3], 50);
    else camMove(t, 49.0, 52.8, [0.2, 4.6, 12.6], [-0.4, 4.6, -0.3], [0.6, 6.0, 9.6], [0.0, 6.2, -0.6], 50, easeInOut, 0.03 * Math.sin(t * 3) * conf);
    const ep = pop(t, 43.26, 49.0);
    if (ep.o > 0) ov.tag('tel', 'TELINGA: MASIH BERPUSING!', { x: W / 2, y: 330, o: ep.o, s: ep.s }, { bg: TEAL, small: true });
    const mp = pop(t, 45.84, 49.0);
    if (mp.o > 0) ov.tag('mata', 'MATA: DAH BERHENTI!', { x: W / 2, y: 410, o: mp.o, s: mp.s }, { bg: '#e08a00', small: true });
    const bp = scr(BRAIN.clone().add(V(0, 0.4, 0)));
    qmarks(t, bp, 49.0, 52.75, [[49.2, -300, -40, '#ffcf33', -12], [49.5, 290, -120, '#3fa2ff', 10], [49.9, -220, 260, '#ff5c9a', 8], [50.3, 260, 230, '#ffcf33', -10]]);
    bubble('keliru', 'OTAK KELIRU!', t, 49.2, 51.9, 330, 120, { top: '#e8dcff', bot: '#8a5cff' });
    bubble('peningB', 'PENING!', t, 51.96, 52.75, 330, 150, { top: '#ffd0e0', bot: '#ff5c7a' }, 3);
    return mind;
  }],
  // S11 — after a few seconds the water stops, the hairs stand up, and the dizziness goes
  [52.8, 58.1, (t) => {
    // the water slows from a gentle spin to rest
    const w0 = 1.6, tau = 0.9, a = 52.9;
    const phF = -w0 * tau * (1 - Math.exp(-Math.max(0, t - a) / tau));
    const wF = w0 * Math.exp(-Math.max(0, t - a) / tau);
    earSet(t, { phH: 0, phF, flow: -wF * 1.4, glowHair: 0 });
    earAff(t, { smile: 1 });
    camMove(t, 52.8, 58.1, [1.2, 5.2, 7.0], [0.2, 2.4, 0], [0.8, 5.6, 8.4], [0.2, 2.5, 0], 50);
    ov.flash((1 - inv(52.8, 53.1, t)) * 0.5);
    topTag('saat', 'BEBERAPA SAAT...', t, 52.82, 54.7, BLUE);
    pinTag('tegak', 'BULU TEGAK SEMULA', scr(ampWorld().add(V(0, 0.55, 0))), t, 55.24, 57.0, { bg: PINK, pointer: 'down' }, -60);
    bubble('hilang', 'PENING HILANG!', t, 56.44, 58.05, 430, 110, { top: '#d6fff0', bot: '#2fbf8f' });
    return ear;
  }],
  // S12 — back in the playground: "Waaah! ... kalau pening, duduk dulu sampai hilang, ya!"
  [58.1, 64.95, (t) => {
    play.mgr.rotation.y = mgrAngle(t);
    const sit = easeInOut(inv(61.6, 62.6, t));
    if (sit < 0.5 && t < 62.1) {
      standAff(t, A_OFF.clone().lerp(BENCH.clone().add(V(0.2, 0, 0.7)), easeInOut(inv(61.4, 62.1, t))), -0.9 + 0.3 * inv(61.4, 62.1, t), { wow: keys(t, [[58.15, 0], [58.3, 0.9], [58.9, 0.9], [59.2, 0]]), smile: 1, brow: 0.6 });
    } else benchAff(t, { smile: 1, ...(t > 63.0 ? POSES.thumbsUpR : {}) });
    camMove(t, 58.1, 64.95, [0.2, 2.6, 7.6], [2.6, 1.3, 1.6], [0.8, 2.4, 7.4], [3.6, 1.0, 2.1], 50);
    ov.flash((1 - inv(58.1, 58.4, t)) * 0.9, '255,250,235');
    const hd = scr(play.aff.parts.head.getWorldPosition(V()));
    const b = pop(t, 58.2, 61.4);
    ov.html('bulb', ICONS.bulb(), { x: clamp(hd.x + 200, 150, 900), y: clamp(hd.y - 160, 300, 900) + Math.sin(t * 5) * 8, o: b.o, s: b.s * 0.65, r: 10 });
    ov.sparkles(t, { n: 30, seed: 12, y: 250, h: 900, a: inv(58.2, 58.5, t) * (1 - inv(60.4, 61.0, t)) });
    bubble('airtelinga', 'SEBAB AIR\nDALAM TELINGA!', t, 58.98, 61.45, 450, 100, { top: '#d6f0ff', bot: '#2f8fff' });
    bubble('duduk', 'PENING? DUDUK DULU!', t, 62.12, 64.9, 430, 96, { top: '#d6fff0', bot: '#2fbf8f' }, 2);
    pinTag('bangku', 'BANGKU', scr(BENCH.clone().add(V(0, 1.6, 0))), t, 61.4, 62.6, { bg: ORANGE, pointer: 'down' }, -40);
    return play;
  }],
  // S13 — "Apa lagi kita nak belajar lepas ni?"
  [64.95, OUTRO, (t) => {
    play.mgr.rotation.y = mgrAngle(t);
    const tk = keys(t, [[65.0, 0], [65.4, 1]]);
    const th2 = POSES.thinkR.armR;
    benchAff(t, { smile: 1, brow: 0.3 + 0.4 * tk, headRoll: -0.12 * tk, lookX: 0.35 * tk, lookY: 0.4 * tk, headPitch: -0.08 * tk, armR: { reach: mix3([-0.55, 0.35, 0.3], th2.reach, tk), pole: th2.pole, point: tk, wx: th2.wx * tk } });
    const head = play.aff.parts.head.getWorldPosition(V());
    const fwd = V(Math.sin(-0.6), 0, Math.cos(-0.6));
    camMove(t, 64.95, OUTRO, head.clone().addScaledVector(fwd, 3.2).add(V(-0.4, 0.2, 0)).toArray(), head.clone().add(V(0, -0.15, 0)).toArray(), head.clone().addScaledVector(fwd, 2.7).add(V(-0.3, 0.15, 0)).toArray(), head.clone().add(V(0, -0.1, 0)).toArray(), 44);
    const hd = scr(head.clone().add(V(0, 0.5, 0)));
    qmarks(t, hd, 64.95, OUTRO - 0.05, [[65.1, -260, -160, '#ffcf33', -12], [65.4, 250, -220, '#3fa2ff', 10], [65.7, 300, 20, '#ffcf33', 14]]);
    return play;
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
  if (w.stars && w.stars.userData.update) w.stars.userData.update(t);
  if (w.sky) {
    w.sky.position.copy(cam.position);
    if (w.stars) w.stars.position.copy(cam.position);
  }
  renderer.setViewport(0, 0, W, H);
  renderer.render(w.scene, cam);
  if (w !== outro) ov.vignette(0.22);
  ov.captions(t, CAPTIONS, KEYWORDS);
  ov.end();
}

// Cover / thumbnail (9:16): dizzy Affan beside the merry-go-round with stars
// circling his head, a title, badge and the logo.
function thumbnail() {
  ov.begin();
  cam.aspect = W / H;
  cam.updateProjectionMatrix();
  const t = 8.6;
  play.mgr.rotation.y = 1.2;
  standAff(t, A_OFF, -0.9, { ...dizzy(t, 1), talk: 0, wow: 0.8, brow: 0.6 });
  lookCam(V(1.4, 2.3, 5.2), V(2.6, 1.55, 1.2), 46);
  play.sky.position.copy(cam.position);
  renderer.setViewport(0, 0, W, H);
  renderer.render(play.scene, cam);
  const g = ov.g;
  const top = g.createLinearGradient(0, 0, 0, 760);
  top.addColorStop(0, 'rgba(20,40,90,0.55)');
  top.addColorStop(1, 'rgba(20,40,90,0)');
  g.fillStyle = top;
  g.fillRect(0, 0, W, 760);
  const bot = g.createLinearGradient(0, H - 900, 0, H);
  bot.addColorStop(0, 'rgba(20,40,30,0)');
  bot.addColorStop(1, 'rgba(20,40,30,0.65)');
  g.fillStyle = bot;
  g.fillRect(0, H - 900, W, 900);
  ov.vignette(0.3);
  const hd = scr(A_OFF.clone().add(V(0, 2.05, 0)));
  dizzyStars(1.3, hd, 1.3, 170);
  ov.tag('thBadge', 'EPISOD 36', { x: W / 2, y: 300 }, { bg: '#2f7bff', small: true });
  ov.bubble('thTitle', 'KENAPA KITA', { x: W / 2, y: 445, r: -3 }, { size: 124 });
  ov.bubble('thTitle2', 'PENING?', { x: W / 2, y: 590, r: 2 }, { size: 160, top: '#ffd0e0', bot: '#ff5c7a' });
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
