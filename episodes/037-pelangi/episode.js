// THE CURIOUS AFFAN — Episode 037: "Kenapa Pelangi Berwarna-warni dan Melengkung?"
// Every shot is a pure function of time t (seconds), synced to audio/narration.mp3.
import * as THREE from 'three';
import { makeRenderer, loadEnvelope, toScreen, clamp, lerp, inv, easeOut, easeIn, easeInOut, keys, rng, W, H } from '../../shared/core.js';
import { POSES, blinkAt } from '../../shared/affan.js';
import { Overlay, pop, ICONS, drawLogo } from '../../shared/overlay.js';
import { CAPTIONS, KEYWORDS } from './captions.js';
import { buildPark, buildLab, buildField, buildOutro, placeRainbow, PLAY_SCALE, SUN_DIR, COLORS, LAB_SUN, PRISM, SCREEN_X, DROP, DROP_R, FIELD_SUN, FIELD_D, RAIN_ANGLE } from './worlds.js';

const FPS = 30;
const DURATION = 72.55;
const OUTRO = 69.4;

const stage = document.getElementById('stage');
const canvas = document.createElement('canvas');
stage.appendChild(canvas);
const renderer = makeRenderer(canvas);
const ov = new Overlay(stage);
const park = buildPark();
const lab = buildLab();
const field = buildField();
const outro = buildOutro();
const cam = new THREE.PerspectiveCamera(50, W / H, 0.02, 6000);
let env = { at: () => 0 };

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const talk = (t) => clamp(env.at(t) * 1.2);
const scr = (p) => toScreen(p, cam);
const mix3 = (a, b, k) => a.map((v, i) => lerp(v, b[i], k));
const BLUE = '#2f9bff', YELLOW = '#e0b400', ORANGE = '#ff8a3d', PURPLE = '#7a5cf0', GREEN = '#2fbf5f', PINK = '#ff5c9a';
const CNAMES = ['MERAH', 'JINGGA', 'KUNING', 'HIJAU', 'BIRU', 'UNGU'];
const CHEX = ['#ff4a4a', '#ff8a1a', '#d8a800', '#2fbf4a', '#2f7bff', '#8a4aff'];

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
const _up = V(0, 1, 0), _d = V();
function rod(m, from, to, r, op = 0.95) {
  _d.subVectors(to, from);
  const len = _d.length();
  if (len < 1e-4) {
    m.visible = false;
    return;
  }
  m.position.copy(from);
  m.quaternion.setFromUnitVectors(_up, _d.normalize());
  m.scale.set(r, len, r);
  m.material.opacity = op;
  m.visible = op > 0.01;
}
// grow a segment from 'from' towards 'to' with progress k (0..1)
const grow = (m, from, to, k, r, op = 0.95) => rod(m, from, from.clone().lerp(to, clamp(k)), r, k > 0.001 ? op : 0);

// ------------------------------------------------------------------ the park
const A_P = V(3.2, 0, 3.9);
const ANTI_H = V(-SUN_DIR.x, 0, -SUN_DIR.z).normalize(); // horizontal direction to the rainbow
const SIDE_H = V(-ANTI_H.z, 0, ANTI_H.x);
const YAW_RB = Math.atan2(ANTI_H.x, ANTI_H.z); // Affan facing the rainbow
function parkAff(t, pos, yaw, p = {}) {
  const a = park.aff;
  a.root.position.copy(pos);
  a.pose({ yaw, blink: blinkAt(t, 1), talk: talk(t), smile: 0.95, ...p });
  a.root.updateMatrixWorld(true);
}
function parkSet(t, { rain = 0, hose = 0, mini = 0, big = 1 } = {}) {
  park.mgr.rotation.y = 0.4;
  placeRainbow(park.rainbow, cam.position, SUN_DIR, 150);
  park.rainbow.userData.mat.uniforms.op.value = 0.72 * big;
  park.rainbow.visible = big > 0.01;
  park.drops.forEach((d, i) => {
    const R = rng(i * 3 + 1);
    d.visible = rain > 0.01;
    if (!d.visible) return;
    const fall = ((t * (6 + R() * 2) + R() * 10) % 10);
    d.position.set(A_P.x + (R() - 0.5) * 16 + ANTI_H.x * 4, 9 - fall, A_P.z + (R() - 0.5) * 16 + ANTI_H.z * 4);
    d.material.opacity = 0.5 * rain;
  });
  park.hose.visible = hose > 0;
  park.tube.visible = hose > 0;
  park.nozzle.visible = hose > 0;
  park.spray.forEach((s) => (s.visible = false));
  park.mini.visible = mini > 0.01;
  if (mini > 0.01) {
    placeRainbow(park.mini, cam.position, SUN_DIR, 4.6);
    const u = park.mini.userData.mat.uniforms;
    u.op.value = 0.9 * mini;
    u.a0.value = 1.05;
    u.a1.value = 2.1;
  }
}
// hose spray: beads on parabolas from the nozzle towards the rainbow side
function hoseSpray(t, on) {
  const a = park.aff;
  const hand = a.parts.arms.R.hand.getWorldPosition(V());
  const dir = ANTI_H.clone().add(V(0, 1.15, 0)).normalize();
  park.nozzle.position.copy(hand);
  park.nozzle.lookAt(hand.clone().add(dir));
  const coilPos = A_P.clone().addScaledVector(SIDE_H, -1.1).addScaledVector(ANTI_H, -0.4);
  park.coil.position.copy(coilPos);
  park.setTube(coilPos.clone().add(V(0, 0.4, 0)), hand.clone().addScaledVector(dir, -0.05));
  if (on <= 0.01) return;
  const tip = hand.clone().addScaledVector(dir, 0.35);
  park.spray.forEach((s, i) => {
    const R = rng(i * 7 + 2);
    const life = ((t * (0.9 + R() * 0.3) + R()) % 1);
    const v = 6.4 + R() * 1.2;
    const spread = V((R() - 0.5) * 0.5, (R() - 0.5) * 0.25, (R() - 0.5) * 0.5);
    const d = dir.clone().add(spread).normalize();
    const T = life * 1.0;
    s.position.copy(tip).addScaledVector(d, v * T).add(V(0, -4.9 * T * T, 0));
    s.visible = s.position.y > 0.05;
    s.scale.setScalar(0.16 + life * 0.45);
    s.material.opacity = 0.7 * on;
  });
}
// camera behind Affan, looking at the rainbow
const behind = (dist, h, lookH = 9, lookD = 30) => [A_P.clone().addScaledVector(ANTI_H, -dist).add(V(0, h, 0)).toArray(), A_P.clone().addScaledVector(ANTI_H, lookD).add(V(0, lookH, 0)).toArray()];

// --------------------------------------------------------------- light lab
const N_IDX = [1.3, 1.318, 1.336, 1.356, 1.378, 1.4]; // exaggerated dispersion, red..violet
function refract(d, n, eta) {
  const cosi = -n.dot(d);
  const k = 1 - eta * eta * (1 - cosi * cosi);
  if (k < 0) return d.clone().sub(n.clone().multiplyScalar(2 * d.dot(n)));
  return d.clone().multiplyScalar(eta).add(n.clone().multiplyScalar(eta * cosi - Math.sqrt(k)));
}
// rainbow ray through the drop, in the x/y plane (z = 0)
const B_IMPACT = 0.86;
const D_IN = V(1, 0, 0);
const P_IN = DROP.clone().add(V(-Math.sqrt(1 - B_IMPACT * B_IMPACT) * DROP_R, B_IMPACT * DROP_R, 0));
const DROP_PATHS = N_IDX.map((n) => {
  const C = DROP;
  const N1 = P_IN.clone().sub(C).normalize();
  const d1 = refract(D_IN, N1, 1 / n).normalize();
  const t1 = -2 * P_IN.clone().sub(C).dot(d1);
  const P2 = P_IN.clone().addScaledVector(d1, t1);
  const N2 = P2.clone().sub(C).normalize();
  const d2 = d1.clone().sub(N2.clone().multiplyScalar(2 * d1.dot(N2))).normalize();
  const t2 = -2 * P2.clone().sub(C).dot(d2);
  const P3 = P2.clone().addScaledVector(d2, t2);
  const N3 = P3.clone().sub(C).normalize();
  const d3 = refract(d2, N3.clone().negate(), n).normalize();
  return { P2, P3, d3 };
});
const EYE_LAB = (() => {
  const mid = DROP_PATHS[2];
  const s = (mid.P3.y - 1.0) / -mid.d3.y; // where the middle ray reaches eye height
  return mid.P3.clone().addScaledVector(mid.d3, s);
})();
function labReset() {
  [lab.white, lab.white2, lab.white3, lab.white4, ...lab.fan, ...lab.inA, ...lab.inB].forEach((m) => (m.visible = false));
  lab.spots.forEach((s) => (s.visible = false));
  lab.prism.visible = false;
  lab.screen.visible = false;
  lab.drop.visible = false;
  lab.aff.root.visible = false;
}
const PRISM_HIT = PRISM.clone().add(V(-0.45, 0.35, 0));
const PRISM_OUT = PRISM.clone().add(V(0.45, -0.1, 0));
const SCREEN_Y = (i) => lerp(5.2, 1.6, i / 5);

// ------------------------------------------------------------------- field
const EYE_F = V(0, 3.05, 0);
const ANTI_F = FIELD_SUN.clone().negate();
function fieldSet(t, { ring = 1, ground = 1, lines = 0, axis = 0 } = {}) {
  placeRainbow(field.rainbow, EYE_F, FIELD_SUN, FIELD_D);
  field.rainbow.userData.mat.uniforms.op.value = 0.9 * ring;
  field.rainbow.visible = ring > 0.01;
  field.groundMat.opacity = ground;
  field.groundMat.depthWrite = ground > 0.98;
  field.groundMat.transparent = ground < 0.999;
  field.sun.visible = ground > 0.9;
  const a = field.aff;
  a.root.position.set(0, 0, 0);
  a.pose({ yaw: Math.PI, blink: blinkAt(t, 3), talk: talk(t), smile: 0.95, headPitch: -0.25, lookY: 0.3 });
  a.root.updateMatrixWorld(true);
  // sight lines from the eye to points on the ring
  const C = EYE_F.clone().addScaledVector(ANTI_F, FIELD_D);
  const R = FIELD_D * Math.tan(RAIN_ANGLE) * 0.97;
  const u1 = V(1, 0, 0), u2 = V().crossVectors(ANTI_F, u1).normalize();
  field.lines.forEach((m, i) => {
    const ang = (i / field.lines.length) * Math.PI * 2 + 0.2;
    const p = C.clone().addScaledVector(u1, Math.cos(ang) * R).addScaledVector(u2, Math.sin(ang) * R);
    const showBelow = ground < 0.9 || p.y > 0;
    grow(m, EYE_F, p, lines, 0.05, showBelow ? 0.75 : 0);
  });
  grow(field.axis, EYE_F, C, axis, 0.07, 0.9);
}

// ======================================================================= SHOTS
const SHOTS = [
  // S1 — the playground after rain; a big rainbow across the sky
  [0, 2.18, (t) => {
    const [p0, l0] = behind(6.5, 2.6, 8);
    const [p1, l1] = behind(5.5, 2.3, 9);
    camMove(t, 0, 2.18, p0, l0, p1, l1, 50);
    parkSet(t, { rain: 1 - inv(0.3, 2.0, t) });
    parkAff(t, A_P, YAW_RB, { headPitch: -0.35, lookY: 0.4 });
    const q = pop(t, 0.4, 2.15);
    ov.tag('ep', 'EPISOD 37', { x: W / 2, y: 268, o: q.o, s: q.s }, { bg: '#2f7bff', small: true });
    return park;
  }],
  // S2 — "Papa! Tengok langit! Ada jambatan warna-warni! Boleh panjat tak?"
  [2.18, 6.8, (t) => {
    const k = easeInOut(inv(2.18, 6.8, t));
    const side = SIDE_H.clone().multiplyScalar(1.8);
    lookCam(A_P.clone().addScaledVector(ANTI_H, -4.2).add(side).add(V(0, 1.7, 0)), A_P.clone().addScaledVector(ANTI_H, 30).add(V(0, lerp(8, 10, k), 0)), 50);
    parkSet(t);
    const pt = easeOut(inv(2.7, 3.1, t));
    const jump = Math.max(0, Math.sin(Math.PI * inv(5.6, 6.3, t)));
    parkAff(t, A_P.clone().add(V(0, jump * 0.45, 0)), YAW_RB, {
      headPitch: -0.4, lookY: 0.5, smile: 1,
      armR: { reach: mix3([-0.5, 0.3, 0.2], [-0.4, 2.0, 0.6], pt), pole: [-1, -0.4, -0.3], point: pt },
      ...(jump > 0 ? { armL: { reach: [0.4, 2.0, 0.4], pole: [1, -0.4, -0.3] }, legL: { x: -0.4, knee: 0.8 * jump }, legR: { x: -0.3, knee: 0.7 * jump } } : {}),
    });
    const pp = pop(t, 2.18, 2.9, { from: 2 });
    ov.bubble('papa', 'PAPA!', { x: 800, y: 470, o: pp.o, s: pp.s * 0.8, r: 6 }, { size: 110 });
    bubble('jambatan', 'JAMBATAN WARNA-WARNI!', t, 3.88, 5.55, 430, 86, { top: '#ffe0f0', bot: '#ff5c9a' });
    bubble('panjat', 'BOLEH PANJAT?', t, 5.64, 6.75, 430, 118, { top: '#d6fff0', bot: '#2fbf8f' }, 3);
    return park;
  }],
  // S3 — "Kenapa pelangi muncul lepas hujan?"
  [6.8, 9.1, (t) => {
    const look = A_P.clone().add(V(0, 1.6, 0));
    lookCam(A_P.clone().addScaledVector(ANTI_H, 3.4).addScaledVector(SIDE_H, 1.6).add(V(0, 1.9, 0)), look, 46);
    parkSet(t);
    parkAff(t, A_P, YAW_RB + 0.6, { headPitch: -0.1, brow: -0.4, smile: 0.5, ...POSES.thinkR });
    const hd = scr(A_P.clone().add(V(0, 2.3, 0)));
    qmarks(t, hd, 6.8, 9.05, [[6.9, -260, -80, '#ffcf33', -12], [7.3, 250, -150, '#3fa2ff', 10], [7.7, 270, 60, '#ffcf33', 14]]);
    bubble('kenapa', 'KENAPA PELANGI?', t, 7.26, 9.05, 430, 112, { top: '#fff6d0', bot: '#ffb21f' });
    return park;
  }],
  // S4 — "Jom ikut Affan cari jawapan!"
  [9.1, 10.98, (t) => {
    const look = A_P.clone().add(V(0, 1.6, 0));
    const k = easeIn(inv(9.4, 10.98, t));
    lookCam(A_P.clone().addScaledVector(ANTI_H, lerp(3.4, 1.8, k)).addScaledVector(SIDE_H, 1.6).add(V(0, 1.9, 0)), look, 46);
    parkSet(t);
    const up = keys(t, [[9.12, 0], [9.35, 1], [10.6, 1], [10.9, 0.6]], easeOut);
    parkAff(t, A_P, YAW_RB + 0.6, { smile: 1, brow: 0.6, armR: { reach: [lerp(-0.6, -0.55, up), lerp(0.25, 1.95 + 0.06 * Math.sin(t * 14), up), lerp(0.2, 0.35, up)], pole: [-1, -0.3, -0.5] } });
    ov.swirl(t, W / 2, 820, inv(9.3, 10.9, t));
    ov.flash(inv(10.6, 10.98, t) ** 2);
    return park;
  }],
  // S5 — light lab: sunlight looks white, but it's a mix of six colours (prism)
  [10.98, 21.55, (t) => {
    labReset();
    lab.sun.position.copy(LAB_SUN);
    lab.screen.visible = true;
    const onScreen = V(SCREEN_X - 0.1, 3.6, 0);
    const pin = easeOut(inv(13.44, 14.3, t));
    lab.prism.visible = t > 13.4;
    lab.prism.position.copy(PRISM).add(V(0, (1 - pin) * 6, 0));
    if (pin < 0.98) {
      grow(lab.white, LAB_SUN, onScreen, inv(11.1, 11.9, t), 0.16);
      const sp = lab.spots[0];
      sp.visible = t > 11.9;
      sp.position.copy(onScreen).add(V(-0.15, 0, 0.1));
      sp.material.color.setHex(0xffffff);
      sp.material.opacity = 0.9 * inv(11.9, 12.2, t) * (1 - pin);
      sp.scale.setScalar(1.8);
    } else {
      grow(lab.white, LAB_SUN, PRISM_HIT, 1, 0.16);
      lab.fan.forEach((m, i) => {
        const to = V(SCREEN_X - 0.1, SCREEN_Y(i), 0);
        const ti = [16.78, 17.62, 18.44, 19.24, 19.96, 20.68][i];
        grow(m, PRISM_OUT, to, inv(14.4, 15.4, t), i === Math.round(clamp((t - 16.5) / 0.8, 0, 5)) && t > 16.7 && t < 21.4 ? 0.13 : 0.09, 0.9);
        const s = lab.spots[i];
        s.visible = t > 15.3;
        s.position.copy(to).add(V(-0.15, 0, 0.1));
        s.material.color.setHex(COLORS[i]);
        s.material.opacity = 0.9 * inv(15.3, 15.6, t);
        s.scale.setScalar(1.1 + 0.6 * Math.max(0, 1 - Math.abs(t - ti - 0.3) / 0.6));
      });
    }
    camMove(t, 10.98, 21.55, [-0.2, 6.0, 18.0], [0.0, 5.6, 0], [0.2, 5.6, 16.5], [0.1, 5.3, 0], 50);
    ov.flash(1 - inv(10.98, 11.3, t));
    bubble('putih', 'CAHAYA PUTIH?', t, 11.8, 13.4, 420, 120, { top: '#ffffff', bot: '#d8e0f0' });
    pinTag('prisma', 'PRISMA', scr(PRISM.clone().add(V(0, 1.4, 0))), t, 14.3, 16.6, { bg: BLUE, pointer: 'down' }, -40);
    bubble('campuran', 'CAMPURAN WARNA!', t, 14.92, 16.7, 420, 112, { top: '#ffe0f0', bot: '#ff5c9a' });
    [16.78, 17.62, 18.44, 19.24, 19.96, 20.68].forEach((a, i) => {
      const q = pop(t, a, 21.5, { from: 2 });
      if (q.o > 0) ov.tag('cn' + i, CNAMES[i], { x: 250 + (i % 2) * 300, y: 1080 + Math.floor(i / 2) * 95, o: q.o, s: q.s * 0.95 }, { bg: CHEX[i], small: true });
    });
    return lab;
  }],
  // S6 — inside a raindrop: bend, bounce, bend again; each colour bends a bit differently
  [21.55, 34.2, (t) => {
    labReset();
    lab.drop.visible = true;
    lab.sun.position.set(DROP.x - 11, P_IN.y + 0.6, 0);
    const sunHit = P_IN.clone();
    grow(lab.white, V(DROP.x - 10, P_IN.y, 0), sunHit, inv(21.7, 23.3, t), 0.14);
    const split = inv(28.4, 29.4, t); // colours separate
    const mid = DROP_PATHS[2];
    // phase 1: one white path; phase 2: six coloured paths
    if (split < 1) {
      const wop = 1 - split;
      grow(lab.white2, P_IN, mid.P2, inv(24.7, 25.6, t), 0.1, 0.95 * wop);
      grow(lab.white3, mid.P2, mid.P3, inv(25.7, 26.6, t), 0.1, 0.95 * wop);
      grow(lab.white4, mid.P3, mid.P3.clone().addScaledVector(mid.d3, 7.5), inv(26.7, 27.9, t), 0.1, 0.95 * wop);
    }
    if (split > 0) {
      DROP_PATHS.forEach((p, i) => {
        grow(lab.inA[i], P_IN, p.P2, 1, 0.06, 0.95 * split);
        grow(lab.inB[i], p.P2, p.P3, 1, 0.06, 0.95 * split);
        grow(lab.fan[i], p.P3, p.P3.clone().addScaledVector(p.d3, 7.5), easeOut(inv(29.0, 31.5, t)), 0.08, 0.95 * split);
      });
    }
    // tiny Affan where the colours arrive
    const a = lab.aff;
    a.root.visible = true;
    a.root.position.set(EYE_LAB.x - 0.2, 0, 0.6);
    a.pose({ yaw: Math.PI / 2 - 0.2, blink: blinkAt(t, 2), talk: talk(t), smile: 1, headPitch: -0.3, lookY: 0.4, wow: keys(t, [[31.6, 0], [31.8, 0.8], [32.6, 0.8], [32.9, 0]]) });
    a.root.updateMatrixWorld(true);
    if (t < 28.3) camMove(t, 21.55, 28.3, [-1.6, 5.8, 17.5], [-0.6, 5.3, 0], [-0.4, 5.4, 14.0], [0.2, 5.0, 0], 50);
    else camMove(t, 28.3, 34.2, [-0.4, 5.4, 14.0], [0.2, 5.0, 0], [-2.2, 4.2, 15.5], [-2.0, 3.9, 0], 50);
    ov.flash((1 - inv(21.55, 21.85, t)) * 0.5);
    pinTag('titisan', 'TITISAN HUJAN', scr(DROP.clone().add(V(0, DROP_R + 1.8, 0))), t, 23.0, 24.6, { bg: '#2f8fff', pointer: 'down' }, -30);
    pinTag('bengkok1', 'BENGKOK!', scr(P_IN), t, 24.8, 25.75, { bg: '#20b8a0', pointer: 'down' }, -60);
    pinTag('pantul', 'PANTUL!', scr(mid.P2), t, 25.8, 26.7, { bg: PURPLE, pointer: 'down' }, -60);
    pinTag('bengkok2', 'BENGKOK LAGI!', scr(mid.P3), t, 26.72, 28.3, { bg: '#20b8a0', pointer: 'down' }, -60);
    topTag('berbeza', 'SETIAP WARNA BENGKOK BERBEZA', t, 28.46, 31.5, ORANGE);
    bubble('berpisah', 'WARNA BERPISAH!', t, 31.6, 34.15, 420, 112, { top: '#ffe0f0', bot: '#ff5c9a' }, 3);
    return lab;
  }],
  // S7 — why curved: the same angle all round makes a ring; the ground hides the bottom half
  [34.2, 45.2, (t) => {
    const ground = t < 38.6 ? 1 : t < 41.3 ? 1 - 0.85 * easeInOut(inv(38.6, 39.6, t)) : 0.15 + 0.85 * easeInOut(inv(41.3, 42.3, t));
    fieldSet(t, { ring: 1, ground, lines: inv(34.6, 35.8, t) * (1 - inv(37.6, 38.2, t)), axis: inv(34.3, 34.9, t) * (1 - inv(37.6, 38.2, t)) });
    if (t < 38.0) camMove(t, 34.2, 38.0, [6.5, 7.5, 13.0], [0, 6, -25], [7.0, 8.5, 12.0], [0, 6, -25], 50);
    else if (t < 41.2) camMove(t, 38.0, 41.2, [7.0, 8.5, 12.0], [0, 6, -25], [0, 48, 95], [0, -9, -31], 50);
    else camMove(t, 41.2, 45.2, [0, 48, 95], [0, -9, -31], [2.0, 3.6, 7.5], [0, 7, -30], 50);
    ov.flash((1 - inv(34.2, 34.5, t)) * 0.6);
    topTag('sudut', 'SUDUT SAMA (42°)', t, 36.3, 38.0, ORANGE);
    pinTag('bayang', 'ARAH BAYANG KITA', scr(EYE_F.clone().addScaledVector(ANTI_F, 9)), t, 34.6, 37.9, { bg: YELLOW, pointer: 'down' }, -40);
    bubble('cincin', 'BULAT MACAM CINCIN!', t, 38.9, 41.15, 420, 100, { top: '#fff6d0', bot: '#ffb21f' });
    bubble('tanah', 'TANAH TUTUP SEPARUH!', t, 41.4, 43.1, 420, 92, { top: '#d6fff0', bot: '#2fbf8f' }, 2);
    bubble('lengkung', 'NAMPAK LENGKUNG!', t, 43.16, 45.15, 420, 108);
    return field;
  }],
  // S8 — "pelangi cuma nampak bila matahari di belakang kita, dan hujan di depan kita"
  [45.2, 50.8, (t) => {
    // pivot near Affan: look at the sun (behind), then turn to the rain (ahead)
    const turn = easeInOut(inv(48.6, 49.4, t));
    const toSun = V(SUN_DIR.x, 0, SUN_DIR.z).normalize();
    const lookDir = toSun.clone().lerp(ANTI_H, turn).normalize();
    const camPos = A_P.clone().addScaledVector(lookDir, -5).add(V(0, 2.2, 0)).addScaledVector(SIDE_H, 1.2);
    const lookAt = A_P.clone().addScaledVector(lookDir, 30).add(V(0, lerp(10, 9, turn), 0));
    if (t < 46.8) camMove(t, 45.2, 46.8, behind(5, 2.3)[0], behind(5, 2.3)[1], camPos.toArray(), lookAt.toArray(), 50);
    else lookCam(camPos, lookAt, 50);
    parkSet(t, { rain: 0.6 * inv(48.9, 49.4, t) });
    parkAff(t, A_P, YAW_RB, { headPitch: -0.3, lookY: 0.3, ...(turn < 0.5 ? { armL: { reach: [0.55, 1.2, -0.6], pole: [1, -0.4, 0], point: 1 } } : { armR: { reach: [-0.4, 1.9, 0.6], pole: [-1, -0.4, -0.3], point: 1 } }) });
    const q1 = pop(t, 47.26, 48.7);
    if (q1.o > 0) ov.tag('mb', 'MATAHARI DI BELAKANG', { x: W / 2, y: 520, o: q1.o, s: q1.s }, { bg: '#ff9a1a' });
    const q2 = pop(t, 49.16, 50.75);
    if (q2.o > 0) ov.tag('hd', 'HUJAN DI DEPAN', { x: W / 2, y: 520, o: q2.o, s: q2.s }, { bg: '#2f8fff' });
    topTag('ingat', 'INGAT!', t, 45.24, 47.2, PINK);
    return park;
  }],
  // S9 — try at home: back to the sun, spray water with a hose, a little rainbow
  [50.8, 59.4, (t) => {
    const on = inv(55.8, 56.2, t);
    const p0 = A_P.clone().addScaledVector(ANTI_H, -4.4).addScaledVector(SIDE_H, 1.2).add(V(0, 1.6, 0));
    const l0 = A_P.clone().addScaledVector(ANTI_H, 5).add(V(0, 2.8, 0));
    camMove(t, 50.8, 59.4, p0.toArray(), l0.toArray(), p0.clone().addScaledVector(ANTI_H, 0.6).toArray(), l0.clone().add(V(0, 0.4, 0)).toArray(), 50);
    parkSet(t, { hose: 1, mini: inv(56.6, 57.6, t), big: 0 });
    const hold = easeOut(inv(54.0, 54.6, t));
    parkAff(t, A_P, YAW_RB, { headPitch: -0.1, lookY: 0.2, smile: 1, armR: { reach: mix3([-0.55, 0.3, 0.2], [-0.25, 1.05, 0.75], hold), pole: [-1, -0.6, -0.2] }, armL: { reach: mix3([0.55, 0.3, 0.2], [0.1, 0.95, 0.65], hold), pole: [1, -0.6, -0.2] } });
    hoseSpray(t, on);
    ov.flash((1 - inv(50.8, 51.1, t)) * 0.6);
    bubble('cuba', 'CUBA KAT RUMAH!', t, 50.82, 51.95, 430, 112, { top: '#d6fff0', bot: '#2fbf8f' });
    topTag('pagi', 'PAGI ATAU PETANG', t, 52.02, 53.6, ORANGE);
    topTag('belakang', 'MATAHARI DI BELAKANG', t, 53.7, 55.7, '#ff9a1a');
    topTag('sembur', 'SEMBUR AIR GUNA HOS', t, 55.8, 57.1, '#2f8fff');
    bubble('kecil', 'PELANGI KECIL!', t, 57.98, 59.35, 430, 118, { top: '#ffe0f0', bot: '#ff5c9a' }, 3);
    return park;
  }],
  // S10 — "Waaah ... dipecahkan oleh titisan hujan! Tapi tak boleh panjat, ya!"
  [59.4, 67.0, (t) => {
    const k = easeInOut(inv(59.4, 67.0, t));
    lookCam(A_P.clone().addScaledVector(ANTI_H, -5.4).addScaledVector(SIDE_H, lerp(1.2, 0.8, k)).add(V(0, 1.7, 0)), A_P.clone().addScaledVector(ANTI_H, 20).add(V(0, 6.0, 0)), 52);
    parkSet(t);
    const jump = Math.max(0, Math.sin(Math.PI * inv(65.6, 66.3, t)));
    parkAff(t, A_P.clone().add(V(0, jump * 0.5, 0)), YAW_RB + (t > 64.9 ? 0 : 0.5), {
      wow: keys(t, [[59.45, 0], [59.6, 0.9], [60.3, 0.9], [60.6, 0]]), smile: 1, headPitch: -0.3, lookY: 0.4,
      ...(jump > 0 ? { armL: { reach: [0.4, 2.05, 0.4], pole: [1, -0.4, -0.3] }, armR: { reach: [-0.4, 2.05, 0.4], pole: [-1, -0.4, -0.3] }, legL: { x: -0.4, knee: 0.8 * jump }, legR: { x: -0.3, knee: 0.7 * jump } } : {}),
    });
    ov.flash((1 - inv(59.4, 59.7, t)) * 0.9, '255,250,235');
    const hd = scr(A_P.clone().add(V(0, 2.3, 0)));
    const b = pop(t, 59.5, 64.9);
    ov.html('bulb', ICONS.bulb(), { x: clamp(hd.x + 200, 150, 900), y: clamp(hd.y - 180, 300, 900) + Math.sin(t * 5) * 8, o: b.o, s: b.s * 0.65, r: 10 });
    ov.sparkles(t, { n: 30, seed: 12, y: 250, h: 900, a: inv(59.5, 59.8, t) * (1 - inv(61.6, 62.2, t)) });
    bubble('dipecah', 'CAHAYA DIPECAHKAN\nOLEH TITISAN HUJAN!', t, 61.4, 64.9, 440, 84, { top: '#fff6d0', bot: '#ffb21f' });
    bubble('takboleh', 'TAK BOLEH PANJAT!', t, 65.68, 66.95, 430, 108, { top: '#ffd0d0', bot: '#ff4d5e' }, 3);
    return park;
  }],
  // S11 — "Apa lagi kita nak belajar lepas ni?"
  [67.0, OUTRO, (t) => {
    const look = A_P.clone().add(V(0, 1.75, 0));
    lookCam(A_P.clone().addScaledVector(ANTI_H, 2.9).addScaledVector(SIDE_H, 1.3).add(V(0, 1.95, 0)), look, 44);
    parkSet(t);
    const tk = keys(t, [[67.05, 0], [67.45, 1]]);
    const th2 = POSES.thinkR.armR;
    parkAff(t, A_P, YAW_RB + 0.6, { smile: 1, brow: 0.3 + 0.4 * tk, headRoll: -0.12 * tk, lookX: 0.35 * tk, lookY: 0.4 * tk, headPitch: -0.08 * tk, armR: { reach: mix3([-0.55, 0.3, 0.2], th2.reach, tk), pole: th2.pole, point: tk, wx: th2.wx * tk } });
    const hd = scr(A_P.clone().add(V(0, 2.3, 0)));
    qmarks(t, hd, 67.0, OUTRO - 0.05, [[67.1, -260, -160, '#ffcf33', -12], [67.4, 250, -220, '#3fa2ff', 10], [67.7, 300, 20, '#ffcf33', 14]]);
    return park;
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
  if (w === park) placeRainbow(park.rainbow, cam.position, SUN_DIR, 150);
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

// Cover / thumbnail (9:16): Affan in the playground pointing at a big rainbow.
function thumbnail() {
  ov.begin();
  cam.aspect = W / H;
  cam.updateProjectionMatrix();
  const t = 4.0;
  lookCam(A_P.clone().addScaledVector(ANTI_H, -3.4).addScaledVector(SIDE_H, -0.5).add(V(0, 1.0, 0)), A_P.clone().addScaledVector(ANTI_H, 20).addScaledVector(SIDE_H, 2.0).add(V(0, 6.8, 0)), 54);
  parkSet(t);
  parkAff(t, A_P, YAW_RB + 2.3, { talk: 0, wow: 0.8, brow: 0.7, headPitch: -0.3, lookY: 0.4, armR: { reach: [-0.4, 2.0, 0.6], pole: [-1, -0.4, -0.3], point: 1 } });
  placeRainbow(park.rainbow, cam.position, SUN_DIR, 150);
  park.sky.position.copy(cam.position);
  renderer.setViewport(0, 0, W, H);
  renderer.render(park.scene, cam);
  const g = ov.g;
  const top = g.createLinearGradient(0, 0, 0, 700);
  top.addColorStop(0, 'rgba(20,30,70,0.55)');
  top.addColorStop(1, 'rgba(20,30,70,0)');
  g.fillStyle = top;
  g.fillRect(0, 0, W, 700);
  const bot = g.createLinearGradient(0, H - 900, 0, H);
  bot.addColorStop(0, 'rgba(20,40,30,0)');
  bot.addColorStop(1, 'rgba(20,40,30,0.65)');
  g.fillStyle = bot;
  g.fillRect(0, H - 900, W, 900);
  ov.vignette(0.3);
  ov.tag('thBadge', 'EPISOD 37', { x: W / 2, y: 300 }, { bg: '#2f7bff', small: true });
  ov.bubble('thTitle', 'BOLEH PANJAT', { x: W / 2, y: 445, r: -3 }, { size: 120 });
  ov.bubble('thTitle2', 'PELANGI?', { x: W / 2, y: 590, r: 2 }, { size: 156, top: '#ffe0f0', bot: '#ff5c9a' });
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
