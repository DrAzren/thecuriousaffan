// THE CURIOUS AFFAN — Episode 045: "Macam Mana Petrol Kereta Dihasilkan?"
// Every shot is a pure function of time t (seconds), synced to audio/narration.mp3.
import * as THREE from 'three';
import { makeRenderer, loadEnvelope, toScreen, clamp, lerp, inv, easeOut, easeIn, easeInOut, keys, rng, W, H } from '../../shared/core.js';
import { POSES, blinkAt } from '../../shared/affan.js';
import { Overlay, pop, ICONS, drawLogo } from '../../shared/overlay.js';
import { CAPTIONS, KEYWORDS } from './captions.js';
import {
  buildStation, buildSea, buildLayers, buildRig, buildRefinery, buildOutro,
  A_ST, CAR_AT, TANK, FLOOR_Y, SEABED_Y, POCKET, CUTS, TOWER_H,
} from './worlds.js';

const FPS = 30;
const DURATION = 82.0;
const OUTRO = 78.85;

const stage = document.getElementById('stage');
const canvas = document.createElement('canvas');
stage.appendChild(canvas);
const renderer = makeRenderer(canvas);
const ov = new Overlay(stage);
const st = buildStation();
const sea = buildSea();
const lay = buildLayers();
const rig = buildRig();
const ref = buildRefinery();
const outro = buildOutro();
const cam = new THREE.PerspectiveCamera(50, W / H, 0.02, 6000);
let env = { at: () => 0 };

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const talk = (t) => clamp(env.at(t) * 1.2);
const scr = (p) => toScreen(p, cam);
const mix3 = (a, b, k) => a.map((v, i) => lerp(v, b[i], k));
const BLUE = '#2f9bff', ORANGE = '#ff8a3d', PURPLE = '#7a5cf0', GREEN = '#2fbf5f', PINK = '#ff5c9a', YELLOW = '#e0b400', RED = '#ff4d5e', BROWN = '#8a5a36';
const hex = (c) => '#' + c.toString(16).padStart(6, '0');

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
const FLAME = `<svg width="200" height="240" viewBox="0 0 200 240"><path d="M100 10 C130 60 175 90 170 150 C166 205 130 230 100 230 C70 230 34 205 30 150 C27 110 55 95 62 60 C80 85 82 100 90 108 C92 70 85 40 100 10 Z" fill="#ff7a1a" stroke="#17256b" stroke-width="12" stroke-linejoin="round"/><path d="M100 110 C115 135 135 150 130 182 C127 205 113 215 100 215 C87 215 72 205 70 182 C68 160 85 150 100 110 Z" fill="#ffd23a"/></svg>`;
function rod(m, from, to, r) {
  const d = to.clone().sub(from);
  const len = d.length();
  m.visible = len > 1e-3;
  if (!m.visible) return;
  m.position.copy(from);
  m.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize());
  m.scale.set(r, len, r);
}

// ================================================================== station
const affHead = () => st.aff.parts.head.getWorldPosition(V());
function stAff(t, p = {}) {
  const a = st.aff;
  a.root.position.copy(A_ST);
  a.pose({ yaw: 0.25, blink: blinkAt(t, 1), talk: talk(t), smile: 0.9, ...p });
  a.root.updateMatrixWorld(true);
}
const HOLSTER = V(0.55, 1.35, 0.4);
const CAP = () => st.car.localToWorld(V(-1.5, 1.05, -1.0));
function stReset(t, { nozzle = 0, dino = 0, tanker = -1 } = {}) {
  // nozzle: 0 in the pump holster .. 1 in the car's fuel cap
  const np = HOLSTER.clone().lerp(CAP().add(V(0.05, 0.12, -0.05)), easeInOut(nozzle));
  if (nozzle > 0) np.y += Math.sin(nozzle * Math.PI) * 0.3;
  st.nozzle.position.copy(np);
  st.nozzle.rotation.set(0, 0, lerp(0, -0.6, nozzle));
  st.setHose(V(0.35, 1.6, 0.3), np.clone().add(V(0, 0.15, 0)));
  // dinosaur (imagined) beside the car
  const d = st.dino;
  d.root.visible = dino > 0.01;
  d.root.position.set(-2.8, 0.75 * 0.85 + 0.02, 3.8);
  d.root.rotation.y = 0.9 + 0.15 * Math.sin(t * 1.5);
  d.root.scale.setScalar(0.85 * easeOut(clamp(dino)));
  d.head.rotation.x = 0.15 * Math.sin(t * 2.5);
  // tanker lorry: tanker 0..1 drives in along the road and onto the forecourt
  st.tanker.g.visible = tanker >= 0;
  if (tanker >= 0) {
    const k = easeOut(clamp(tanker));
    const x = lerp(-34, -6.5, Math.min(1, k * 1.25));
    const z = k < 0.8 ? 11.0 : lerp(11.0, 5.4, (k - 0.8) / 0.2);
    st.tanker.g.position.set(x, 0, z);
    st.tanker.g.rotation.y = k < 0.8 ? 0 : -0.5 * Math.sin(((k - 0.8) / 0.2) * Math.PI);
    st.tanker.wheels.forEach((w) => (w.rotation.y = -x * 1.5));
  }
}

// ====================================================================== sea
function seaSet(t, sink = 0) {
  sea.tiny.forEach((s, i) => {
    const d = s.userData;
    const fall = clamp(sink * 1.5 - (i % 7) * 0.08);
    s.position.set(d.x + 0.3 * Math.sin(t * 0.7 + d.ph), lerp(d.y + 0.3 * Math.sin(t + d.ph), -2.9, easeIn(fall)), d.z);
    s.scale.setScalar(d.sz * 3 * (0.8 + 0.2 * Math.sin(t * 3 + d.ph)));
  });
  sea.pMat.color.setHex(0x9affc0).lerp(new THREE.Color(0x5a7a5a), sink);
  sea.big.forEach((g, i) => {
    g.position.y = 1.0 + (i % 2) * 0.9 + 0.15 * Math.sin(t * 1.3 + i) - sink * 4;
    g.rotation.set(0.2 * Math.sin(t + i), 0.4 * Math.sin(t * 0.7 + i), t * 0.4 * (i % 2 ? 1 : -1));
  });
}

// ================================================================== layers
const W2 = TANK.w - 0.1;
function layersSet(t, { settle = 0, pile = 0, oil = 0, heat = 0 } = {}) {
  // plankton specks sink through the water into the dark layer
  lay.specks.forEach((s) => {
    const d = s.userData;
    const u = clamp(settle * 1.4 - d.ph * 0.4);
    s.visible = settle > 0.01 && u < 0.999;
    s.position.set(d.x, lerp(TANK.h - 0.6, FLOOR_Y + 0.1, u), d.z);
  });
  // the plankton layer thickens as they settle
  const orgH = lerp(0.15, 0.6, clamp(settle));
  lay.org.scale.y = orgH / 0.6;
  lay.org.position.y = 3.4 + orgH / 2;
  const top0 = 3.4 + orgH;
  lay.orgMat.color.setHex(0x4a6a3a).lerp(new THREE.Color(0x15110e), oil);
  lay.orgMat.roughness = lerp(0.6, 0.12, oil);
  lay.blobs.forEach((b, i) => {
    b.visible = oil > 0.05;
    b.position.y = 3.4 + orgH / 2;
    b.scale.set(1.2 * clamp(oil * 1.3 - i * 0.05), 0.45 * clamp(oil * 1.3 - i * 0.05), 0.4);
  });
  // layers pile on top
  let y = top0;
  lay.layers.forEach((m, i) => {
    const k = clamp(pile * 4 - i);
    const h = m.userData.h * easeOut(k);
    m.visible = h > 0.01;
    m.scale.y = Math.max(0.001, h);
    m.position.y = y + h / 2;
    y += h;
  });
  // water fills the rest
  const wh = TANK.h - y;
  lay.water.scale.y = wh;
  lay.water.position.y = y + wh / 2;
  lay.heat.forEach((h, i) => (h.material.opacity = heat * (0.55 + 0.25 * Math.sin(t * 6 + i))));
  return y;
}

// ===================================================================== rig
function rigSet(t, drill = 0, pump = 0) {
  const top = V(0, 3.9, 0), bottom = V(0, lerp(3.9, POCKET.y + 1.4, easeInOut(drill)), 0);
  rod(rig.pipe, bottom, top, 0.14);
  rig.pipe.visible = drill > 0.01;
  rig.drops.forEach((d, i) => {
    const u = ((t * 0.5 + i / rig.drops.length) % 1);
    d.visible = pump > 0.01;
    if (!d.visible) return;
    d.position.set(0.0, lerp(POCKET.y + 1.4, 3.9, u), 0.0);
    d.scale.setScalar(pump);
  });
}

// ================================================================ refinery
function refSet(t, { crude = 0, fire = 0, vapour = 0, fill = 0, outs = 0 } = {}) {
  ref.flames.forEach((f, i) => {
    f.scale.set(1, (0.4 + fire) * (0.8 + 0.3 * Math.sin(t * 12 + i * 2)), 1);
    f.material.opacity = 0.9 * fire;
    f.visible = fire > 0.02;
  });
  ref.fireGlow.material.opacity = 0.6 * fire;
  ref.crude.forEach((d, i) => {
    const u = ((t * 0.6 + i / ref.crude.length) % 1);
    d.visible = crude > 0.01;
    d.position.set(lerp(-3.2, -1.6, u), 1.4, 0);
    d.scale.setScalar(crude);
  });
  ref.vapour.forEach((s, i) => {
    const R = rng(i * 7 + 3);
    const u = ((t * 0.35 + R()) % 1);
    s.visible = vapour > 0.01;
    if (!s.visible) return;
    const maxY = 1.4 + R() * (TOWER_H - 0.6);
    s.position.set((R() - 0.5) * 2.2, lerp(1.2, maxY, u), (R() - 0.5) * 1.6 + 0.4);
    s.scale.setScalar(0.25 + 0.35 * u);
    const c = CUTS[Math.min(4, Math.floor((1 - (s.position.y - 1.2) / TOWER_H) * 5))];
    s.material.color.setHex(c.color === 0x2a2420 ? 0x8a7a6a : c.color);
    s.material.opacity = 0.6 * vapour * Math.sin(u * Math.PI);
  });
  ref.trays.forEach((m, i) => (m.scale.y = Math.max(0.001, clamp(fill * 1.2 - (i === 4 ? 0 : 0.1 * (4 - i))))));
  ref.out.forEach((list, i) => list.forEach((d, j) => {
    const u = ((t * 0.7 + j / list.length) % 1);
    d.visible = outs > i + 0.01;
    d.position.set(lerp(1.6, 4.8, u), CUTS[i].y - 0.25, 0);
  }));
}

// ======================================================================= SHOTS
const SHOTS = [
  // S1 — at the petrol station with Papa (the camera)
  [0, 2.18, (t) => {
    stReset(t);
    stAff(t, { headYaw: -0.4, lookX: -0.5 });
    camMove(t, 0, 2.18, [6.5, 3.2, 12.5], [0, 1.6, 1], [5.5, 2.8, 10.5], [0.4, 1.6, 1], 50);
    const q = pop(t, 0.4, 2.15);
    ov.tag('ep', 'EPISOD 45', { x: W / 2, y: 268, o: q.o, s: q.s }, { bg: '#2f7bff', small: true });
    return st;
  }],
  // S2 — "Papa! Petrol kereta ni... dibuat dari dinosaur ke?"
  [2.18, 6.44, (t) => {
    stReset(t, { dino: inv(5.0, 5.5, t) });
    const point = easeInOut(inv(3.0, 3.5, t));
    stAff(t, { brow: 0.4, smile: 0.7, ...(point > 0 ? { armR: { reach: mix3([-0.55, 0.3, 0.2], [-0.9, 1.0, 0.55], point), pole: [-1, -0.4, -0.3], point }, headYaw: -0.4 * point } : {}) });
    const ah = affHead();
    if (t < 4.9) camMove(t, 2.18, 4.9, [ah.x + 0.6, ah.y + 0.1, ah.z + 3.6], [ah.x - 0.4, ah.y - 0.4, ah.z], [ah.x + 0.3, ah.y + 0.1, ah.z + 4.0], [ah.x - 0.9, ah.y - 0.5, ah.z], 46);
    else camMove(t, 4.9, 6.44, [ah.x + 0.3, ah.y + 0.1, ah.z + 4.0], [ah.x - 0.9, ah.y - 0.5, ah.z], [1.0, 2.6, 11.5], [-1.4, 1.4, 2.2], 50);
    const pp = pop(t, 2.18, 2.95, { from: 2 });
    ov.bubble('papa', 'PAPA!', { x: 800, y: 470, o: pp.o, s: pp.s * 0.8, r: 6 }, { size: 110 });
    pinTag('petrol', 'PETROL', scr(V(0, 2.6, 0)), t, 3.14, 4.9, { bg: YELLOW, pointer: 'down' }, -30);
    bubble('dino', 'DARI DINOSAUR?', t, 5.1, 6.4, 430, 116, { top: '#d8ffe8', bot: '#2fbf7f' });
    return st;
  }],
  // S3 — "Macam mana petrol dihasilkan?"
  [6.44, 8.54, (t) => {
    stReset(t, { dino: 1 });
    stAff(t, { ...POSES.thinkR, brow: -0.3, smile: 0.5 });
    const ah = affHead();
    lookCam(V(ah.x + 0.4, ah.y + 0.1, ah.z + 3.6), V(ah.x, ah.y - 0.35, ah.z), 46);
    const hd = scr(ah.clone().add(V(0, 0.4, 0)));
    qmarks(t, hd, 6.44, 8.5, [[6.5, -260, 120, '#ffcf33', -12], [6.8, 250, 80, '#3fa2ff', 10], [7.1, 280, 260, '#ffcf33', 14]]);
    bubble('macam', 'MACAM MANA?', t, 6.44, 8.5, 430, 120, { top: '#fff6d0', bot: '#ffb21f' });
    return st;
  }],
  // S4 — "Jom ikut Affan cari jawapan! Sebenarnya, kebanyakan minyak bukan dari dinosaur."
  [8.54, 14.56, (t) => {
    const poof = inv(13.5, 14.0, t);
    stReset(t, { dino: 1 - poof });
    const up = keys(t, [[8.56, 0], [8.8, 1], [10.0, 1], [10.3, 0]], easeOut);
    stAff(t, { smile: 1, brow: 0.6, ...(up > 0 ? { armR: { reach: [lerp(-0.6, -0.55, up), lerp(0.25, 1.95 + 0.06 * Math.sin(t * 14), up), lerp(0.2, 0.35, up)], pole: [-1, -0.3, -0.5] } } : { headYaw: -0.5, lookX: -0.5 }) });
    const ah = affHead();
    if (t < 10.4) lookCam(V(ah.x + 0.4, ah.y + 0.1, ah.z + 3.6), V(ah.x, ah.y - 0.35, ah.z), 46);
    else camMove(t, 10.4, 11.2, [ah.x + 0.4, ah.y + 0.1, ah.z + 3.6], [ah.x, ah.y - 0.35, ah.z], [0.4, 2.8, 12.0], [-1.6, 1.4, 2.4], 50);
    const dp = scr(V(-2.8, 2.6, 3.8));
    const cq = pop(t, 13.46, 14.5, { from: 2 });
    if (cq.o > 0) ov.html('cross', ICONS.cross(), { x: dp.x, y: dp.y + 120, o: cq.o, s: cq.s * 1.2 });
    bubble('bukan', 'BUKAN DINOSAUR!', t, 12.72, 14.5, 430, 112, { top: '#ffe0e0', bot: '#ff4d5e' });
    ov.swirl(t, W / 2, 820, inv(13.7, 14.5, t));
    ov.flash(inv(14.2, 14.56, t) ** 2, '200,240,255');
    return st;
  }],
  // S5 — tiny sea creatures called plankton
  [14.56, 19.56, (t) => {
    seaSet(t, 0);
    camMove(t, 14.56, 19.56, [0, 1.6, 8.5], [0, 1.2, 0], [-0.3, 1.5, 5.8], [-0.4, 1.4, 1.4], 50);
    ov.flash(1 - inv(14.56, 14.9, t), '200,240,255');
    topTag('laut', 'HIDUPAN LAUT', t, 15.5, 17.0, BLUE);
    topTag('kecil', 'SANGAT KECIL!', t, 17.04, 19.5, PURPLE, 410);
    bubble('plankton', 'PLANKTON!', t, 18.42, 19.5, 430, 150, { top: '#d8ffe8', bot: '#2fbf8f' });
    return sea;
  }],
  // S6 — millions of years ago: plankton sank, got buried under mud and rock; pressure and heat made crude oil
  [19.56, 33.7, (t) => {
    const top = layersSet(t, {
      settle: easeInOut(inv(21.6, 24.6, t)),
      pile: easeInOut(inv(25.3, 28.1, t)),
      heat: inv(28.9, 29.5, t),
      oil: easeInOut(inv(30.1, 32.4, t)),
    });
    camMove(t, 19.56, 33.7, [0.6, 7.0, 23.5], [0, 6.4, 0], [0.4, 6.4, 21.5], [0, 5.8, 0], 50);
    ov.flash(1 - inv(19.56, 19.9, t));
    const q = pop(t, 19.56, 21.5);
    if (q.o > 0) ov.tag('juta', 'BERJUTA-JUTA TAHUN DULU', { x: W / 2, y: 330, o: q.o, s: q.s }, { bg: PINK });
    topTag('mati', 'PLANKTON MATI & TENGGELAM', t, 21.6, 24.6, GREEN);
    pinTag('lumpur', 'LUMPUR', scr(V(-2.8, FLOOR_Y + 1.0, TANK.d / 2)), t, 26.74, 28.1, { bg: BROWN, pointer: 'down' }, -30);
    pinTag('batu', 'BATU', scr(V(2.6, top - 0.6, TANK.d / 2)), t, 27.38, 28.1, { bg: '#6a6a7a', pointer: 'down' }, -30);
    topTag('timbus', 'TERTIMBUS!', t, 25.74, 28.1, BROWN, 410);
    // pressure arrows on top, heat at the bottom
    const pa = pop(t, 28.16, 33.6);
    if (pa.o > 0) {
      for (let i = 0; i < 3; i++) {
        const p = scr(V(-3 + i * 3, top + 1.6 + 0.2 * Math.sin(t * 6 + i), TANK.d / 2));
        ov.html('pa' + i, `<div style="transform:rotate(90deg)">${ICONS.arrow('#ff8a3d')}</div>`, { x: p.x, y: p.y, o: pa.o, s: pa.s * 0.5 });
      }
      ov.tag('tekanan', 'TEKANAN', { x: W / 2, y: 330, o: pa.o, s: pa.s }, { bg: ORANGE, small: true });
    }
    pinTag('haba', 'HABA', scr(V(0, 0.4, TANK.d / 2 + 0.3)), t, 29.06, 33.6, { bg: RED, pointer: 'down' }, 70);
    pinTag('mentah', 'MINYAK MENTAH', scr(V(0, 3.8, TANK.d / 2)), t, 30.92, 33.6, { bg: '#2a2420', pointer: 'down' }, -40);
    bubble('hitam', 'HITAM & PEKAT!', t, 31.86, 33.65, 430, 120, { top: '#e0e0e0', bot: '#3a3a3a' });
    return lay;
  }],
  // S7 — an oil rig drills deep and pumps the crude up; rigs off Terengganu, Sabah and Sarawak
  [33.7, 44.64, (t) => {
    rigSet(t, inv(36.08, 37.5, t), inv(37.5, 38.0, t));
    if (t < 36.0) camMove(t, 33.7, 36.0, [14, 9, 34], [0, 1, 0], [10, -1.0, 30], [0, -5, 0], 50);
    else if (t < 40.0) camMove(t, 36.0, 40.0, [10, -1.0, 30], [0, -5, 0], [7, -1.5, 27], [0, -6, 0], 50);
    else camMove(t, 40.0, 44.64, [7, -1.5, 27], [0, -6, 0], [4, 13, 36], [3, 2, -30], 50);
    ov.flash(1 - inv(33.7, 34.0, t));
    topTag('hari', 'HARI NI...', t, 33.7, 34.6, PURPLE);
    pinTag('pelantar', 'PELANTAR MINYAK', scr(V(0, 12, 0)), t, 34.66, 36.0, { bg: ORANGE, pointer: 'down' }, -30);
    topTag('gerudi', 'GERUDI DALAM-DALAM!', t, 36.08, 37.5, ORANGE);
    pinTag('poket', 'MINYAK MENTAH', scr(POCKET.clone().add(V(0, 1.8, 3))), t, 36.6, 39.9, { bg: '#2a2420', pointer: 'down' }, -30);
    topTag('pam', 'PAM KELUAR!', t, 38.02, 39.9, BLUE);
    pinTag('t', 'TERENGGANU', scr(V(0, 12, 0)), t, 41.98, 44.6, { bg: BLUE, pointer: 'down' }, -30);
    pinTag('s', 'SABAH', scr(V(22, 12, -48)), t, 43.1, 44.6, { bg: GREEN, pointer: 'down' }, -30);
    pinTag('w', 'SARAWAK', scr(V(-12, 12, -38)), t, 43.74, 44.6, { bg: PINK, pointer: 'down' }, -30);
    bubble('my', 'DI MALAYSIA!', t, 40.02, 41.9, 430, 130, { top: '#fff6d0', bot: '#ffb21f' });
    return rig;
  }],
  // S8 — the refinery: heated in a tall tower; light parts rise, heavy stay low; split into gas, petrol, diesel, jet fuel and tar
  [44.64, 62.22, (t) => {
    refSet(t, {
      crude: inv(44.7, 45.2, t),
      fire: inv(48.5, 49.2, t),
      vapour: inv(51.2, 51.8, t),
      fill: easeInOut(inv(53.3, 56.2, t)),
      outs: clamp((t - 56.2) / 0.9) * 5,
    });
    if (t < 50.6) camMove(t, 44.64, 50.6, [-2.5, 2.8, 10.5], [-2.0, 1.8, 0], [1.6, 6.4, 21], [1.4, 6.4, 0], 50);
    else camMove(t, 50.6, 62.22, [1.6, 6.4, 21], [1.4, 6.4, 0], [2.4, 6.6, 19.5], [2.2, 6.6, 0], 50);
    ov.flash(1 - inv(44.64, 44.95, t));
    pinTag('crude', 'MINYAK MENTAH', scr(V(-2.4, 1.9, 0)), t, 44.7, 46.2, { bg: '#2a2420', pointer: 'down' }, -40);
    topTag('kilang', 'KILANG PENAPISAN', t, 46.24, 48.5, PURPLE);
    pinTag('panas', 'DIPANASKAN!', scr(V(-3.6, 2.6, 1)), t, 48.6, 50.5, { bg: RED, pointer: 'down' }, -40);
    pinTag('menara', 'MENARA TINGGI', scr(V(0, TOWER_H + 1.8, 0)), t, 49.68, 51.2, { bg: BLUE, pointer: 'down' }, -30);
    topTag('ringan', 'RINGAN NAIK KE ATAS', t, 51.26, 53.2, '#2fa8d8');
    topTag('berat', 'BERAT TINGGAL DI BAWAH', t, 53.26, 55.1, BROWN, 410);
    const T5 = [56.4, 57.38, 59.0, 58.24, 60.48];
    CUTS.forEach((c, i) => {
      const p = scr(V(5.3, c.y + 0.5, 0));
      const q = pop(t, T5[i], 62.2);
      if (q.o > 0) ov.tag('cut' + i, c.name, { x: clamp(p.x - 40, 300, 780), y: p.y - 30, o: q.o, s: q.s * 0.9 }, { bg: c.name === 'TAR' ? '#3a3430' : hex(c.color === 0x9adfff ? 0x2fa8d8 : c.color === 0xffd23a ? 0xd8a800 : c.color === 0x7ad85a ? 0x3fae4a : 0xff8a3d), small: true });
    });
    bubble('jalan', 'TAR UNTUK JALAN RAYA!', t, 60.72, 62.2, 430, 100, { top: '#e0e0e0', bot: '#4a4a4a' });
    return ref;
  }],
  // S9 — a tanker lorry brings petrol to the station, and it goes into our car
  [62.22, 67.9, (t) => {
    stReset(t, { tanker: inv(62.3, 64.8, t), nozzle: easeInOut(inv(65.7, 66.9, t)) });
    stAff(t, { headYaw: -0.6, lookX: -0.6, smile: 1 });
    if (t < 65.4) camMove(t, 62.22, 65.4, [-2, 4.5, 22], [-10, 1.5, 8], [0.5, 4.0, 18], [-5, 1.5, 5], 50);
    else camMove(t, 65.4, 67.9, [0.5, 4.0, 18], [-5, 1.5, 5], [1.6, 2.4, 6.5], [-0.6, 1.2, 1.6], 50);
    ov.flash((1 - inv(62.22, 62.5, t)) * 0.6);
    pinTag('lori', 'LORI TANGKI', scr(st.tanker.g.position.clone().add(V(0, 3.4, 0))), t, 63.2, 65.6, { bg: BLUE, pointer: 'down' }, -30);
    topTag('stesen', 'STESEN MINYAK', t, 64.84, 66.3, RED);
    pinTag('kereta', 'KERETA KITA!', scr(CAP().add(V(0, 0.6, 0))), t, 66.68, 67.85, { bg: ORANGE, pointer: 'down' }, -40);
    return st;
  }],
  // S10 — "Waaah, rupanya petrol datang dari plankton purba!"
  [67.9, 72.1, (t) => {
    stReset(t, { nozzle: 1 });
    stAff(t, { wow: keys(t, [[67.95, 0], [68.1, 0.9], [68.7, 0.9], [69.0, 0]]), smile: 1, brow: 0.5 });
    const ah = affHead();
    lookCam(V(ah.x + 0.4, ah.y + 0.1, ah.z + 3.6), V(ah.x, ah.y - 0.35, ah.z), 46);
    ov.flash((1 - inv(67.9, 68.2, t)) * 0.9, '255,250,235');
    const hd = scr(ah.clone().add(V(0, 0.5, 0)));
    const b = pop(t, 67.95, 72.0);
    ov.html('bulb', ICONS.bulb(), { x: clamp(hd.x + 200, 150, 900), y: clamp(hd.y - 160, 300, 900) + Math.sin(t * 5) * 8, o: b.o, s: b.s * 0.6, r: 10 });
    ov.sparkles(t, { n: 30, seed: 12, y: 250, h: 900, a: inv(68.0, 68.3, t) * (1 - inv(70.3, 70.9, t)) });
    bubble('purba', 'DARI PLANKTON\nPURBA!', t, 69.28, 72.05, 440, 110, { top: '#d8ffe8', bot: '#2fbf8f' });
    return st;
  }],
  // S11 — "Ingat, petrol mudah terbakar, jangan main dekat pam minyak, ya."
  [72.1, 76.44, (t) => {
    stReset(t, { nozzle: 1 });
    const wag = t > 74.4;
    stAff(t, { smile: 0.7, brow: 0.4, ...(wag ? POSES.wagR(t) : {}) });
    const ah = affHead();
    camMove(t, 72.1, 76.44, [ah.x + 0.8, ah.y + 0.4, ah.z + 5.2], [ah.x - 0.5, ah.y - 0.6, ah.z], [ah.x + 0.6, ah.y + 0.3, ah.z + 4.6], [ah.x - 0.5, ah.y - 0.6, ah.z], 48);
    const fq = pop(t, 72.9, 76.4, { from: 2 });
    if (fq.o > 0) ov.html('flame', FLAME, { x: 230, y: 760 + 8 * Math.sin(t * 6), o: fq.o, s: fq.s * 0.7, r: -6 });
    bubble('bakar', 'MUDAH TERBAKAR!', t, 73.18, 76.4, 430, 112, { top: '#fff0d0', bot: '#ff5a1a' });
    topTag('jangan', 'JANGAN MAIN DEKAT PAM MINYAK!', t, 74.48, 76.4, RED, 620);
    return st;
  }],
  // S12 — "Apa lagi kita nak belajar lepas ni?"
  [76.44, OUTRO, (t) => {
    stReset(t, { nozzle: 1 });
    const tk = keys(t, [[76.5, 0], [76.9, 1]]);
    const th2 = POSES.thinkR.armR;
    stAff(t, { smile: 1, brow: 0.3 + 0.4 * tk, headRoll: -0.12 * tk, lookX: 0.35 * tk, lookY: 0.4 * tk, headPitch: -0.08 * tk, armR: { reach: mix3([-0.55, 0.3, 0.2], th2.reach, tk), pole: th2.pole, point: tk, wx: th2.wx * tk } });
    const ah = affHead();
    lookCam(V(ah.x + 0.4, ah.y + 0.1, ah.z + 3.5), V(ah.x, ah.y - 0.35, ah.z), 46);
    const hd = scr(ah.clone().add(V(0, 0.45, 0)));
    qmarks(t, hd, 76.44, OUTRO - 0.05, [[76.5, -260, -100, '#ffcf33', -12], [76.8, 250, -160, '#3fa2ff', 10], [77.1, 300, 60, '#ffcf33', 14]]);
    return st;
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

// Cover / thumbnail (9:16): Affan at the pump with the (imagined) dinosaur.
function thumbnail() {
  ov.begin();
  cam.aspect = W / H;
  cam.updateProjectionMatrix();
  const t = 6.0;
  stReset(t, { dino: 1 });
  stAff(t, { brow: 0.6, smile: 0.7, wow: 0.6, headYaw: -0.4, armR: { reach: [-0.9, 1.0, 0.55], pole: [-1, -0.4, -0.3], point: 1 } });
  lookCam(V(1.4, 2.3, 9.4), V(-0.6, 1.6, 2.0), 50);
  st.sky.position.copy(cam.position);
  renderer.setViewport(0, 0, W, H);
  renderer.render(st.scene, cam);
  const g = ov.g;
  const top = g.createLinearGradient(0, 0, 0, 720);
  top.addColorStop(0, 'rgba(20,30,60,0.5)');
  top.addColorStop(1, 'rgba(20,30,60,0)');
  g.fillStyle = top;
  g.fillRect(0, 0, W, 720);
  const bot = g.createLinearGradient(0, H - 900, 0, H);
  bot.addColorStop(0, 'rgba(20,20,30,0)');
  bot.addColorStop(1, 'rgba(20,20,30,0.55)');
  g.fillStyle = bot;
  g.fillRect(0, H - 900, W, 900);
  ov.vignette(0.3);
  ov.tag('thBadge', 'EPISOD 45', { x: W / 2, y: 300 }, { bg: '#2f7bff', small: true });
  ov.bubble('thTitle', 'PETROL DARI', { x: W / 2, y: 445, r: -3 }, { size: 116 });
  ov.bubble('thTitle2', 'DINOSAUR?!', { x: W / 2, y: 600, r: 2 }, { size: 140, top: '#d8ffe8', bot: '#2fbf7f' });
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
