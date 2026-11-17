// THE CURIOUS AFFAN — Episode 048: "Macam Mana Kapal Terbang Boleh Terbang?"
// Every shot is a pure function of time t (seconds), synced to audio/narration.mp3.
import * as THREE from 'three';
import { makeRenderer, loadEnvelope, toScreen, clamp, lerp, inv, easeOut, easeIn, easeInOut, keys, W, H } from '../../shared/core.js';
import { POSES, blinkAt } from '../../shared/affan.js';
import { Overlay, pop, ICONS, drawLogo } from '../../shared/overlay.js';
import { CAPTIONS, KEYWORDS } from './captions.js';
import { buildAirport, buildSkyWorld, buildTunnel, buildRoom, buildCabin, buildOutro, makeArrow, streamY, PLANE_S, A_AP, A_RM, A_CB } from './worlds.js';

const FPS = 30;
const DURATION = 75.15;
const OUTRO = 72.0;

const stage = document.getElementById('stage');
const canvas = document.createElement('canvas');
stage.appendChild(canvas);
const renderer = makeRenderer(canvas);
const ov = new Overlay(stage);
const ap = buildAirport();
const skyW = buildSkyWorld();
const tun = buildTunnel();
const room = buildRoom();
const cab = buildCabin();
const outro = buildOutro();
const cam = new THREE.PerspectiveCamera(50, W / H, 0.05, 6000);
let env = { at: () => 0 };

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const talk = (t) => clamp(env.at(t) * 1.2);
const scr = (p) => toScreen(p, cam);
const mix3 = (a, b, k) => a.map((v, i) => lerp(v, b[i], k));
const BLUE = '#2f9bff', ORANGE = '#ff8a3d', PURPLE = '#7a5cf0', GREEN = '#2fbf5f', RED = '#ff4d5e', YELLOW = '#e0b400';

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

// ================================================================= airport
const taxiX = (t) => -14 + 0.9 * t;
const RUN0 = 42.8, ACC = 1.6, X_RUN = -40;
const runX = (t) => X_RUN + 0.5 * ACC * Math.max(0, t - RUN0) ** 2;
const runV = (t) => ACC * Math.max(0, t - RUN0);
const TAKE = 51.86, LIFT = 53.0;
const apLift = makeArrow(0x2fbf5f);
ap.scene.add(apLift.g);
function apPlane(t, { x, pitch = 0, y = 0, gear = 1, flame = 0 }) {
  const p = ap.plane;
  p.root.position.set(x, y, 0);
  p.pitch.rotation.z = pitch;
  p.gear.visible = gear > 0.5;
  p.flames.forEach((f) => (f.material.opacity = flame));
  p.root.updateMatrixWorld(true);
  apLift.g.visible = false;
  ap.key.position.set(x + 30, 60, 40);
  ap.key.target.position.set(x, 0, 0);
}
const affHeadAP = () => ap.aff.parts.head.getWorldPosition(V());
function apAff(t, p = {}) {
  ap.aff.root.position.copy(A_AP);
  ap.aff.pose({ yaw: Math.PI, blink: blinkAt(t, 1), talk: talk(t), smile: 0.9, ...p });
  ap.aff.root.updateMatrixWorld(true);
}
function herd(t, show = 1) {
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
  ap.herdHome.forEach((h, i) => {
    const a = 7.44 + (i / 100) * 1.0;
    const k = show * clamp(easeOut(inv(a, a + 0.25, t)) * 1.08 - 0.08 * inv(a + 0.25, a + 0.4, t));
    const r = Math.floor(i / 10), c = i % 10;
    e.set(0, h.ry, 0);
    q.setFromEuler(e);
    m.compose(V(7 + r * 1.45, 0, -6.3 + c * 1.4), q, V(k, k, k).multiplyScalar(1.15));
    ap.herd.setMatrixAt(i, m);
  });
  ap.herd.instanceMatrix.needsUpdate = true;
  ap.herd.visible = show > 0;
}

// =================================================================== sky
const ARW = { weight: [17.34, 3.0], drag: [19.28, 2.2], thrust: [22.5, 2.6] };
function skySet(t, { fast = 0 } = {}) {
  const P = skyW.plane;
  P.root.position.set(0, 0.15 * Math.sin(t * 1.2), 0);
  P.root.rotation.set(0.04 * Math.sin(t * 0.9), 0, 0.03 * Math.sin(t * 0.7));
  P.gear.visible = false;
  P.root.updateMatrixWorld(true);
  const sp = 6 + 14 * fast;
  skyW.clouds.forEach((c) => {
    const u = c.userData;
    let x = u.x - sp * (t - 14);
    x = ((x + 40) % 80 + 80) % 80 - 40;
    c.position.set(x, u.y, u.z);
  });
  skyW.lines.forEach((l) => {
    const u = l.userData;
    const x = 8 - (((t * 3 + u.ph) % 1)) * 16;
    l.position.set(x, u.y, u.z);
    l.visible = fast > 0.05;
    l.scale.x = 0.5 + 2 * fast;
  });
  const c = P.body.localToWorld(V(0, 0, 0));
  const k = (a) => easeOut(inv(a, a + 0.5, t));
  skyW.arrows.weight.set(ARW.weight[1] * k(ARW.weight[0]), V(0, -1, 0));
  skyW.arrows.weight.g.position.copy(c).add(V(0, -0.5, 0));
  skyW.arrows.drag.set(ARW.drag[1] * k(ARW.drag[0]), V(-1, 0, 0));
  skyW.arrows.drag.g.position.copy(P.body.localToWorld(V(-3.2, 0, 0)));
  skyW.arrows.thrust.set(ARW.thrust[1] * k(ARW.thrust[0]) * (1 + 0.15 * fast), V(1, 0, 0));
  skyW.arrows.thrust.g.position.copy(P.body.localToWorld(V(3.3, 0, 0)));
  skyW.arrows.lift.set(0, V(0, 1, 0));
  P.flames.forEach((f) => (f.material.opacity = 0.9 * k(ARW.thrust[0]) * (0.8 + 0.2 * Math.sin(t * 30))));
  return c;
}

// ================================================================ tunnel
let tunAoa = -1;
function tunSet(t, { aoa = 0, flow = 1, guides = 0, glow = 0, down = 0, lift = 0 }) {
  tun.wingPivot.position.set(0, 0.8, 0);
  tun.wingPivot.rotation.z = -aoa;
  tun.outline.material.opacity = glow;
  tun.guideMat.opacity = 0.28 * guides;
  if (Math.abs(aoa - tunAoa) > 0.004) {
    tunAoa = aoa;
    tun.guides.forEach((g) => {
      const pts = [];
      for (let x = -8; x <= 8; x += 0.25) pts.push(V(x, 0.8 + streamY(g.userData.y0, x, aoa), 0));
      g.geometry.dispose();
      g.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 80, 0.025, 5);
    });
  }
  tun.dots.forEach((d) => {
    const u = ((t * 0.22 + d.userData.ph) % 1);
    const x = -8 + 16 * u;
    d.visible = flow > 0.01;
    d.position.set(x, 0.8 + streamY(d.userData.y0, x, aoa), 0.1);
    d.scale.setScalar(0.32 * flow);
  });
  tun.down.forEach((a, i) => {
    a.set(1.6 * down, V(0, -1, 0), 0.8);
    a.g.position.set(1.7 + i * 0.7, 0.2 - i * 0.2, 0.4);
  });
  tun.lift.set(2.8 * lift, V(0, 1, 0), 1.1);
  tun.lift.g.position.set(-0.2, 1.3, 0.4);
}
function tunAff(t, p = {}) {
  tun.aff.root.position.set(1.8, -4.2, 2.0);
  tun.aff.pose({ yaw: -0.7, blink: blinkAt(t, 3), talk: talk(t) * 0.6, smile: 1, lookX: -0.3, lookY: 0.4, headPitch: -0.15, ...p });
}

// ================================================================== room
const PY = 0.9;
const affHeadRM = () => room.aff.parts.head.getWorldPosition(V());
function roomAff(t, p = {}) {
  room.aff.root.position.copy(A_RM);
  room.aff.pose({ yaw: PY, blink: blinkAt(t, 5), talk: talk(t), smile: 0.9, ...p });
  room.aff.root.updateMatrixWorld(true);
}
function paperSet(t, { show = 0, lift = 0, blow = 0 }) {
  const a = room.aff;
  room.paper.visible = show > 0.01;
  const lip = a.parts.head.localToWorld(V(0, -0.5, 0.78));
  room.paper.position.copy(lip);
  room.paper.rotation.set(0, PY, 0);
  room.paper.scale.setScalar(Math.max(0.01, show) * 1.3);
  room.segs.forEach((s, i) => {
    const droop = 0.14;
    s.rotation.x = lerp(droop, -0.015, lift) + 0.05 * blow * lift * Math.sin(t * 22 + i);
  });
  const fwd = V(Math.sin(PY), 0, Math.cos(PY));
  room.puffs.forEach((p, i) => {
    const u = ((t * 1.6 + i / room.puffs.length) % 1);
    p.visible = blow > 0.01;
    p.position.copy(lip).addScaledVector(fwd, 0.15 + u * 1.3).add(V(0, 0.06 + 0.05 * Math.sin(i * 2.1), 0.05 * Math.cos(i * 1.7)));
    p.scale.setScalar(0.12 * (0.6 + u) * blow);
    p.material.opacity = 0.55 * (1 - u);
  });
}

// ================================================================= cabin
const affHeadCB = () => cab.aff.parts.head.getWorldPosition(V());
function cabSet(t, { belt = 0, p = {} } = {}) {
  cab.tex.offset.x = t * 0.06;
  const a = cab.aff;
  a.root.position.copy(A_CB);
  a.pose({ yaw: Math.PI, ...POSES.seated, blink: blinkAt(t, 7), talk: talk(t), smile: 1, ...p });
  a.root.updateMatrixWorld(true);
  cab.belt.position.copy(a.root.localToWorld(V(0, 1.12, 0.5)));
  cab.belt.rotation.set(0, Math.PI, 0);
  cab.belt.visible = belt > 0.01;
  const k = easeInOut(clamp(belt));
  cab.halfL.position.x = -0.16 - 0.3 * (1 - k);
  cab.halfR.position.x = 0.16 + 0.3 * (1 - k);
  cab.buckle.visible = k > 0.98;
}

// ======================================================================= SHOTS
const SHOTS = [
  // S1 — airport viewing deck, a big plane taxiing
  [0, 2.08, (t) => {
    apPlane(t, { x: taxiX(t) });
    herd(t, 0);
    apAff(t, { headYaw: -0.2 });
    camMove(t, 0, 2.08, [8, 3.0, 24], [-6, 3.4, 2], [7, 2.8, 22.5], [-6, 3.4, 2], 50);
    const q = pop(t, 0.4, 2.0);
    ov.tag('ep', 'EPISOD 48', { x: W / 2, y: 268, o: q.o, s: q.s }, { bg: '#2f7bff', small: true });
    return ap;
  }],
  // S2 — "Papa! Tengok kapal terbang tu!"
  [2.08, 4.86, (t) => {
    apPlane(t, { x: taxiX(t) });
    herd(t, 0);
    const pt = keys(t, [[2.9, 0], [3.2, 1]], easeOut);
    apAff(t, { yaw: Math.PI + 0.35, headYaw: -0.5 * (1 - pt) - 0.15, smile: 1, brow: 0.5, armR: { reach: mix3([-0.55, 0.3, 0.2], [-0.95, 1.55, 0.75], pt), pole: [-1, -0.3, -0.4], point: pt } });
    camMove(t, 2.08, 4.86, [6.5, 2.6, 21.5], [-3, 3.0, 4], [6.0, 2.6, 20.5], [-4, 3.2, 3], 48);
    const pp = pop(t, 2.14, 2.95, { from: 2 });
    ov.bubble('papa', 'PAPA!', { x: 800, y: 470, o: pp.o, s: pp.s * 0.8, r: 6 }, { size: 110 });
    pinTag('kt', 'KAPAL TERBANG', scr(ap.plane.body.localToWorld(V(0, 1.6, 0))), t, 3.22, 4.85, { bg: BLUE, pointer: 'down' }, -30);
    return ap;
  }],
  // S3 — "Besarnya..." low angle under the nose
  [4.86, 6.14, (t) => {
    apPlane(t, { x: taxiX(t) });
    herd(t, 0);
    apAff(t);
    const x = taxiX(t);
    camMove(t, 4.86, 6.14, [x + 12, 0.8, 11], [x + 1, 4.5, 0], [x + 11, 0.7, 10], [x + 0.5, 5.0, 0], 55);
    bubble('besar', 'BESARNYA!', t, 4.92, 6.12, 430, 140, { top: '#e0f6ff', bot: '#2fa8d8' });
    return ap;
  }],
  // S4 — as heavy as 100 elephants
  [6.14, 9.3, (t) => {
    apPlane(t, { x: taxiX(t) });
    herd(t, 1);
    apAff(t);
    camMove(t, 6.14, 9.3, [34, 13, 15], [0, 2, -1], [31, 12, 13.5], [0, 2, -1], 50);
    topTag('berat', 'BERATNYA...', t, 6.2, 7.4, ORANGE);
    bubble('gajah', '100 EKOR GAJAH!', t, 8.44, 9.28, 430, 116, { top: '#f0f2f6', bot: '#9aa0ae' });
    return ap;
  }],
  // S5 — "Macam mana benda seberat tu boleh terbang?"
  [9.3, 11.9, (t) => {
    apPlane(t, { x: taxiX(t) });
    herd(t, 0);
    apAff(t, { yaw: 0.25, ...POSES.thinkR, brow: -0.3, smile: 0.5 });
    const ah = affHeadAP();
    lookCam(ah.clone().add(V(0.9, 0.1, 3.6)), ah.clone().add(V(-0.2, -0.5, 0)), 46);
    const hd = scr(ah.clone().add(V(0, 0.4, 0)));
    qmarks(t, hd, 10.28, 11.88, [[10.3, -260, 100, '#ffcf33', -12], [10.6, 250, 60, '#3fa2ff', 10], [10.9, 280, 240, '#ffcf33', 14]]);
    bubble('macam', 'MACAM MANA\nBOLEH TERBANG?', t, 9.36, 11.88, 430, 100, { top: '#fff6d0', bot: '#ffb21f' });
    return ap;
  }],
  // S6 — "Jom ikut Affan cari jawapan!"
  [11.9, 14.04, (t) => {
    apPlane(t, { x: taxiX(t) });
    herd(t, 0);
    const up = keys(t, [[11.92, 0], [12.15, 1], [13.3, 1], [13.6, 0.6]], easeOut);
    apAff(t, { yaw: 0.25, smile: 1, brow: 0.6, armR: { reach: [lerp(-0.6, -0.55, up), lerp(0.25, 1.95 + 0.06 * Math.sin(t * 14), up), lerp(0.2, 0.35, up)], pole: [-1, -0.3, -0.5] } });
    const ah = affHeadAP();
    const k = easeIn(inv(12.8, 14.04, t));
    lookCam(ah.clone().add(V(0.9, 0.1 + 2 * k, 3.6 + 2 * k)), ah.clone().add(V(-0.2, -0.5 + 4 * k, 0)), 46);
    ov.swirl(t, W / 2, 820, inv(12.0, 13.9, t));
    ov.flash(inv(13.6, 14.04, t) ** 2, '220,240,255');
    return ap;
  }],
  // S7 — the four forces in the sky
  [14.04, 26.88, (t) => {
    const fast = easeInOut(inv(25.6, 26.3, t));
    skySet(t, { fast });
    camMove(t, 14.04, 26.88, [6.5, 2.6, 15], [0, 0.4, 0], [8.5, 1.2, 13], [0.3, 0.6, 0], 50);
    ov.flash(1 - inv(14.04, 14.4, t), '220,240,255');
    topTag('empat', '4 KUASA', t, 14.1, 17.2, PURPLE);
    const P = skyW.plane;
    pinTag('wt', 'BERAT', scr(P.body.localToWorld(V(0, -4.0, 0))), t, ARW.weight[0], 26.85, { bg: RED, pointer: 'up' }, 60);
    pinTag('dg', 'UDARA MENAHAN', scr(P.body.localToWorld(V(-5.2, 0.6, 0))), t, ARW.drag[0], 26.85, { bg: ORANGE, pointer: 'down' }, -40);
    pinTag('th', 'ENJIN MENOLAK', scr(P.body.localToWorld(V(5.8, 0.6, 0))), t, ARW.thrust[0], 26.85, { bg: BLUE, pointer: 'down' }, -40);
    const ql = pop(t, 24.0, 26.85);
    if (ql.o > 0) {
      const p = scr(P.body.localToWorld(V(0, 2.4, 0)));
      ov.html('q4', ICONS.qmark('#2fbf5f'), { x: p.x, y: p.y - 40 + Math.sin(t * 4) * 8, o: ql.o, s: ql.s * 0.8 });
    }
    bubble('laju', 'LAJU-LAJU!', t, 25.74, 26.85, 430, 130, { top: '#e0f0ff', bot: '#2f7bff' });
    return skyW;
  }],
  // S8 — wind tunnel: air flows over and under the wing; tilt pushes air down, air pushes the wing up
  [26.88, 42.8, (t) => {
    const aoa = 0.17 * easeInOut(inv(34.2, 35.2, t));
    tunSet(t, {
      aoa,
      flow: inv(27.0, 27.5, t),
      guides: inv(29.0, 29.8, t),
      glow: keys(t, [[32.5, 0], [32.8, 1], [34.2, 1], [34.6, 0]]) * (0.6 + 0.4 * Math.sin(t * 10)),
      down: easeOut(inv(36.5, 37.1, t)),
      lift: easeOut(inv(38.6, 39.4, t)),
    });
    tunAff(t, { wow: keys(t, [[39.85, 0], [40.0, 0.8], [40.6, 0.8], [40.9, 0]]) });
    camMove(t, 26.88, 42.8, [0.5, 0.3, 13.5], [0, 0.0, 0], [-0.3, 0.4, 12.5], [0, 0.1, 0], 50);
    ov.flash(1 - inv(26.88, 27.2, t));
    topTag('tw', 'TEROWONG ANGIN', t, 27.0, 29.0, PURPLE);
    pinTag('atas', 'ATAS', scr(V(-0.3, 2.4, 0)), t, 30.56, 32.5, { bg: BLUE, pointer: 'down' }, -20);
    pinTag('bawah', 'BAWAH', scr(V(-0.3, -0.6, 0)), t, 31.22, 32.5, { bg: BLUE, pointer: 'up' }, 40);
    pinTag('khas', 'BENTUK KHAS', scr(V(0, 1.6, 0)), t, 32.6, 34.3, { bg: YELLOW, pointer: 'down' }, -30);
    pinTag('condong', 'SEDIKIT CONDONG', scr(V(-1.2, 1.7, 0)), t, 34.48, 36.4, { bg: YELLOW, pointer: 'down' }, -30);
    pinTag('ud', 'UDARA KE BAWAH', scr(V(3.3, -1.4, 0.4)), t, 36.56, 42.75, { bg: BLUE, pointer: 'up' }, 50);
    pinTag('sy', 'SAYAP KE ATAS!', scr(V(-0.2, 4.4, 0.4)), t, 39.26, 42.75, { bg: GREEN, pointer: 'down' }, -30);
    bubble('angkat', 'DAYA ANGKAT!', t, 41.56, 42.78, 430, 130, { top: '#e0ffe8', bot: '#2fbf5f' });
    return tun;
  }],
  // S9 — faster and faster down the runway: lift grows until it beats weight
  [42.8, TAKE, (t) => {
    const x = runX(t);
    apPlane(t, { x, flame: 0.8 });
    herd(t, 0);
    apAff(t);
    const v = runV(t), vmax = runV(LIFT);
    const L = (v / vmax) ** 2;
    apLift.set(1.0 + 9 * L, V(0, 1, 0), 2.2);
    apLift.g.position.set(x - 0.5, 5.2, 0);
    lookCam(V(x + 5, 4.0, 36), V(x + 2, 5.5, 0), 45);
    // gauge: weight vs lift bars and speed
    const g = ov.g;
    const ga = pop(t, 42.9, 99).o;
    g.save();
    g.globalAlpha = ga;
    g.fillStyle = 'rgba(15,25,50,0.55)';
    g.beginPath();
    g.roundRect(W / 2 - 300, 520, 600, 380, 36);
    g.fill();
    const lw = Math.min(1.15, L) / 1.15;
    const bars = [['BERAT', '#ff4d5e', 0.82], ['DAYA ANGKAT', '#2fbf5f', lw]];
    g.font = '800 40px "Baloo 2"';
    g.textAlign = 'center';
    bars.forEach(([lab, col, k], i) => {
      const bx = W / 2 - 150 + i * 300;
      g.fillStyle = 'rgba(255,255,255,0.15)';
      g.fillRect(bx - 55, 590, 110, 230);
      g.fillStyle = col;
      g.fillRect(bx - 55, 590 + 230 * (1 - k), 110, 230 * k);
      g.fillStyle = '#fff';
      g.fillText(lab, bx, 870);
    });
    g.font = '800 46px "Baloo 2"';
    g.fillText(`${Math.round(v * 18)} km/j`, W / 2, 575);
    g.restore();
    topTag('makin', 'MAKIN LAJU, MAKIN KUAT!', t, 42.84, 47.8, GREEN);
    topTag('landasan', 'BERLARI DI LANDASAN', t, 46.4, 50.0, BLUE);
    bubble('lebih', 'DAYA ANGKAT\nLEBIH KUAT!', t, 50.08, TAKE, 1060, 90, { top: '#e0ffe8', bot: '#2fbf5f' });
    return ap;
  }],
  // S10 — "Dan... ia pun terbang!"
  [TAKE, 54.14, (t) => {
    const x = runX(t);
    const pk = easeInOut(inv(TAKE + 0.1, 52.9, t));
    const up = Math.max(0, t - LIFT);
    apPlane(t, { x, pitch: 0.17 * pk, y: 1.6 * up * up + 2.2 * up, gear: t < 53.7 ? 1 : 0, flame: 0.9 });
    herd(t, 0);
    apAff(t);
    apLift.set(0, V(0, 1, 0));
    const xc = runX(52.9) + 6;
    lookCam(V(xc, 1.6, 30), V(x - 1, 4 + 0.6 * (1.6 * up * up + 2.2 * up), 0), 52);
    bubble('terbang', 'TERBANG!', t, 53.04, 54.12, 430, 150, { top: '#e0f0ff', bot: '#2f7bff' });
    return ap;
  }],
  // S11 — try at home: blow over a paper strip
  [54.14, 61.76, (t) => {
    const hold = easeOut(inv(55.4, 56.0, t));
    const blow = keys(t, [[58.25, 0], [58.45, 1], [61.2, 1], [61.5, 0]]);
    roomAff(t, {
      smile: 0.9 - 0.6 * blow,
      wow: 0.55 * blow,
      armR: { reach: mix3([-0.55, 0.3, 0.2], [-0.2, 1.22, 0.72], hold), pole: [-1, -0.6, -0.3] },
      armL: { reach: mix3([0.55, 0.3, 0.2], [0.2, 1.22, 0.72], hold), pole: [1, -0.6, -0.3] },
      ...(blow > 0.5 ? { talk: 0 } : {}),
    });
    paperSet(t, { show: hold, lift: easeOut(inv(59.8, 60.7, t)), blow });
    const ah = affHeadRM();
    camMove(t, 54.14, 61.76, [-1.6, 3.3, 6.6], [0.9, 1.7, 0.6], [-1.3, 3.2, 6.0], [0.9, 1.75, 0.6], 46);
    ov.flash(1 - inv(54.14, 54.4, t));
    topTag('cuba', 'CUBA DI RUMAH!', t, 54.14, 61.7, PURPLE);
    pinTag('tiup', 'TIUP DI ATAS', scr(ah.clone().add(V(0.9, 0.2, 0.7))), t, 58.3, 59.8, { bg: BLUE, pointer: 'down' }, -30);
    bubble('naik', 'KERTAS NAIK!', t, 60.6, 61.74, 1080, 120, { top: '#e0ffe8', bot: '#2fbf5f' });
    return room;
  }],
  // S12 — "Waaah, rupanya sayap dan enjin bekerjasama!"
  [61.76, 65.94, (t) => {
    roomAff(t, { yaw: -0.2, wow: keys(t, [[61.8, 0], [61.95, 0.9], [62.5, 0.9], [62.8, 0]]), smile: 1, brow: 0.5 });
    paperSet(t, { show: 0 });
    const ah = affHeadRM();
    lookCam(ah.clone().add(V(0.5, 0.0, 3.4)), ah.clone().add(V(-0.1, -0.45, 0)), 46);
    ov.flash((1 - inv(61.76, 62.05, t)) * 0.9, '255,250,235');
    const hd = scr(ah.clone().add(V(0, 0.5, 0)));
    const b = pop(t, 61.8, 65.9);
    ov.html('bulb', ICONS.bulb(), { x: clamp(hd.x + 220, 150, 900), y: clamp(hd.y - 170, 300, 900) + Math.sin(t * 5) * 8, o: b.o, s: b.s * 0.6, r: 10 });
    ov.sparkles(t, { n: 30, seed: 12, y: 250, h: 900, a: inv(61.8, 62.1, t) * (1 - inv(63.4, 64.0, t)) });
    const s1 = pop(t, 63.18, 65.9), s2 = pop(t, 63.88, 65.9);
    if (s1.o > 0) ov.tag('sayap', 'SAYAP', { x: 300, y: 1130, o: s1.o, s: s1.s }, { bg: GREEN });
    if (s2.o > 0) ov.tag('enjin', 'ENJIN', { x: 780, y: 1130, o: s2.o, s: s2.s }, { bg: BLUE });
    bubble('kerja', 'BEKERJASAMA!', t, 64.24, 65.9, 430, 120, { top: '#fff6d0', bot: '#ffb21f' });
    return room;
  }],
  // S13 — in the cabin: fasten the seatbelt
  [65.94, 69.86, (t) => {
    const reach = keys(t, [[67.6, 0], [68.0, 1], [69.1, 1], [69.5, 0]]);
    const belt = easeInOut(inv(68.1, 68.7, t));
    cabSet(t, {
      belt: Math.max(belt, inv(67.9, 68.1, t) * 0.01 + (t > 68.0 ? 0.02 : 0)),
      p: {
        armR: { reach: mix3([-0.55, 0.3, 0.3], [-0.12 + 0.25 * (1 - belt), 0.12, 0.42], reach), pole: [-1, -0.5, -0.3] },
        armL: { reach: mix3([0.55, 0.3, 0.3], [0.12 - 0.25 * (1 - belt), 0.12, 0.42], reach), pole: [1, -0.5, -0.3] },
        headPitch: 0.25 * reach,
      },
    });
    camMove(t, 65.94, 69.86, [0.7, 2.3, -4.2], [-0.9, 1.5, 0.2], [0.5, 2.1, -3.7], [-0.9, 1.4, 0.2], 52);
    ov.flash(1 - inv(65.94, 66.2, t));
    topTag('naik', 'NAIK KAPAL TERBANG', t, 66.0, 68.0, BLUE);
    pinTag('tali', 'TALI PINGGANG KELEDAR', scr(cab.belt.position.clone()), t, 68.12, 69.84, { bg: RED, pointer: 'up' }, 140);
    const kq = pop(t, 68.7, 69.6, { from: 2 });
    if (kq.o > 0) ov.bubble('klik', 'KLIK!', { x: 780, y: 1000, o: kq.o, s: kq.s * 0.8, r: 8 }, { size: 100 });
    return cab;
  }],
  // S14 — "Apa lagi kita nak belajar lepas ni?"
  [69.86, OUTRO, (t) => {
    const tk = keys(t, [[69.9, 0], [70.3, 1]]);
    const th2 = POSES.thinkR.armR;
    cabSet(t, { belt: 1, p: { brow: 0.3 + 0.4 * tk, headRoll: -0.12 * tk, lookX: 0.35 * tk, lookY: 0.4 * tk, armR: { reach: mix3([-0.55, 0.3, 0.3], th2.reach, tk), pole: th2.pole, point: tk, wx: th2.wx * tk } } });
    const ah = affHeadCB();
    lookCam(ah.clone().add(V(0.7, 0.0, -3.6)), ah.clone().add(V(0.1, -0.55, 0)), 48);
    const hd = scr(ah.clone().add(V(0, 0.45, 0)));
    qmarks(t, hd, 69.86, OUTRO - 0.05, [[69.9, -260, -100, '#ffcf33', -12], [70.2, 250, -160, '#3fa2ff', 10], [70.5, 300, 60, '#ffcf33', 14]]);
    return cab;
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
  cam.up.set(0, 1, 0);
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

// Cover / thumbnail (9:16): the plane in the sky, three-quarter view.
function thumbnail() {
  ov.begin();
  cam.aspect = W / H;
  cam.updateProjectionMatrix();
  const t = 23.5;
  skySet(t);
  Object.values(skyW.arrows).forEach((a) => (a.g.visible = false));
  lookCam(V(6.5, -1.2, 8.5), V(0.4, 0.2, 0), 50);
  skyW.sky.position.copy(cam.position);
  renderer.setViewport(0, 0, W, H);
  renderer.render(skyW.scene, cam);
  const g = ov.g;
  const top = g.createLinearGradient(0, 0, 0, 760);
  top.addColorStop(0, 'rgba(0,30,90,0.45)');
  top.addColorStop(1, 'rgba(0,30,90,0)');
  g.fillStyle = top;
  g.fillRect(0, 0, W, 760);
  const bot = g.createLinearGradient(0, H - 900, 0, H);
  bot.addColorStop(0, 'rgba(0,20,60,0)');
  bot.addColorStop(1, 'rgba(0,20,60,0.5)');
  g.fillStyle = bot;
  g.fillRect(0, H - 900, W, 900);
  ov.vignette(0.3);
  ov.tag('thBadge', 'EPISOD 48', { x: W / 2, y: 300 }, { bg: '#2f7bff', small: true });
  ov.bubble('thTitle', 'SEBERAT 100 GAJAH', { x: W / 2, y: 445, r: -3 }, { size: 92 });
  ov.bubble('thTitle2', 'BOLEH TERBANG?!', { x: W / 2, y: 590, r: 2 }, { size: 118, top: '#e0f0ff', bot: '#2f7bff' });
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
