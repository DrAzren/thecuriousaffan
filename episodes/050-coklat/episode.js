// THE CURIOUS AFFAN — Episode 050: "Macam Mana Coklat Dihasilkan?"
// Every shot is a pure function of time t (seconds), synced to audio/narration.mp3.
import * as THREE from 'three';
import { makeRenderer, loadEnvelope, toScreen, clamp, lerp, inv, easeOut, easeIn, easeInOut, keys, W, H } from '../../shared/core.js';
import { POSES, blinkAt } from '../../shared/affan.js';
import { Overlay, pop, ICONS, drawLogo } from '../../shared/overlay.js';
import { CAPTIONS, KEYWORDS } from './captions.js';
import { buildKitchenC, buildFarm, buildFactory, buildOutro, TABLE, ST } from './worlds.js';
import { MAMA_POS, AFF_POS } from '../038-bawang-menangis/worlds.js';

const FPS = 30;
const DURATION = 76.05;
const OUTRO = 72.9;

const stage = document.getElementById('stage');
const canvas = document.createElement('canvas');
stage.appendChild(canvas);
const renderer = makeRenderer(canvas);
const ov = new Overlay(stage);
const kit = buildKitchenC();
const farm = buildFarm();
const fac = buildFactory();
const outro = buildOutro();
const cam = new THREE.PerspectiveCamera(50, W / H, 0.03, 6000);
let env = { at: () => 0 };

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const talk = (t) => clamp(env.at(t) * 1.2);
const scr = (p) => toScreen(p, cam);
const mix3 = (a, b, k) => a.map((v, i) => lerp(v, b[i], k));
const BLUE = '#2f9bff', ORANGE = '#ff8a3d', PURPLE = '#7a5cf0', GREEN = '#2fbf5f', PINK = '#ff5c9a', RED = '#ff4d5e', BROWN = '#8a5a3a';

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

// ================================================================= kitchen
const AFF_YAW = Math.atan2(MAMA_POS.x - AFF_POS.x, MAMA_POS.z - AFF_POS.z);
const YAW_CAM = Math.atan2(0.4, 1);
const affHead = () => kit.aff.parts.head.getWorldPosition(V());
const affFront = (d, side) => affHead().add(V(0.35 + side * 0.2, 0.1, d));
function mamaSet(t, p = {}) {
  const m = kit.mama;
  m.root.position.copy(MAMA_POS);
  m.pose({ yaw: 0.6, lean: 0.1, blink: blinkAt(t, 5), smile: 1, brow: 0.2, ...p });
  m.root.updateMatrixWorld(true);
}
function affSet(t, p = {}, { bar = 1, brush = 0 } = {}) {
  const a = kit.aff;
  a.root.position.copy(AFF_POS);
  a.pose({ yaw: YAW_CAM, blink: blinkAt(t, 1), talk: talk(t), smile: 0.9, armR: { reach: [-0.45, 0.75, 0.55], pole: [-1, -0.5, -0.3] }, ...p });
  kit.bar.visible = bar > 0.01;
  kit.bar.scale.setScalar(0.55 * Math.max(0.01, bar));
  kit.brush.visible = brush > 0.5;
  a.root.updateMatrixWorld(true);
}
const BITE = { reach: [-0.08, 1.38, 0.78], pole: [-1, -0.6, -0.3] };
const faceCam = () => {
  const ah = affHead();
  lookCam(affFront(2.3, 0.6), ah.clone().add(V(0, -0.15, 0)), 46);
  return ah;
};

// ==================================================================== farm
const fAffHead = () => farm.aff.parts.head.getWorldPosition(V());
function farmAff(t, pos, p = {}) {
  farm.aff.root.position.copy(pos);
  farm.aff.pose({ yaw: 0.3, blink: blinkAt(t, 2), talk: talk(t), smile: 0.9, ...p });
  farm.aff.root.updateMatrixWorld(true);
}
function podOpen(k) {
  farm.halves[0].rotation.x = 1.2 * k;
  farm.halves[1].rotation.x = -1.2 * k;
  farm.beans.visible = k > 0.05;
}

// ================================================================= factory
function facAff(t, sx, p = {}) {
  fac.aff.root.position.set(sx + 0.95, 0, 1.4);
  fac.aff.pose({ yaw: -0.9, blink: blinkAt(t, 3), talk: talk(t) * 0.6, smile: 0.9, lookY: 0.2, ...p });
}
const facCam = (t, sx, a, b) => camMove(t, a, b, [sx + 0.5, 2.6, 7.2], [sx, 1.2, 0], [sx + 0.2, 2.4, 6.4], [sx, 1.2, 0], 50);
const WHITE = new THREE.Color(0xfaf6f0), BEAN = new THREE.Color(0x7a4a2a);
const DARK = new THREE.Color(0x5a3220), MILKC = new THREE.Color(0x8a5a3a);
function facSet(t) {
  // fermenting: beans turn brown under the leaves
  fac.fBeans.material.color.copy(WHITE).lerp(BEAN, inv(29.6, 31.0, t));
  const cover = keys(t, [[28.85, 0], [29.3, 1], [31.2, 1], [31.7, 0]]);
  fac.leaves.forEach((l, i) => {
    l.position.y = 1.22 + (1 - cover) * (2.5 + i * 0.3);
    l.rotation.z = (1 - cover) * (0.6 - i * 0.4);
    l.visible = cover > 0.01;
  });
  // drying
  fac.sunRays.forEach((r, i) => (r.material.opacity = 0.25 + 0.15 * Math.sin(t * 3 + i)));
  // roasting
  fac.drum.rotation.x = t * 3;
  fac.flame.material.opacity = 0.6 + 0.3 * Math.sin(t * 17);
  const ar = inv(36.4, 36.9, t);
  fac.aroma.forEach((s, i) => {
    const u = ((t * 0.5 + i / fac.aroma.length) % 1);
    s.visible = ar > 0.01;
    s.position.set(Math.sin(u * 6 + i) * 0.4, 2.3 + u * 2.4, 0.3);
    s.scale.setScalar((0.3 + u * 0.8) * ar);
    s.material.opacity = 0.5 * (1 - u);
  });
  // sheller
  fac.falling.forEach((b, i) => {
    const u = ((t * 1.2 + i / fac.falling.length) % 1);
    b.position.set((i % 3 - 1) * 0.15, 2.8 - u * 1.0, (i % 2 - 0.5) * 0.2);
  });
  fac.flakes.forEach((f, i) => {
    const u = ((t * 0.9 + i / fac.flakes.length) % 1);
    const side = i % 2 ? 1 : -1;
    f.position.set(side * (0.5 + u * 1.2), 1.7 + u * 0.6 - u * u * 1.6, 0.3 + (i % 3) * 0.1);
    f.rotation.set(t * 5 + i, t * 3, 0);
  });
  // grinder
  fac.rollers.forEach((r, i) => (r.rotation.x = (i ? -1 : 1) * t * 6));
  const flow = inv(42.1, 42.4, t);
  fac.stream.visible = flow > 0.01;
  fac.stream.scale.set(1, flow, 1);
  fac.tankLevel.position.y = 0.05 + 0.6 * easeInOut(inv(42.3, 44.2, t));
  // mixer
  const drop = (obj, a, x) => {
    const u = inv(a, a + 0.5, t);
    obj.visible = u > 0 && u < 1;
    obj.position.set(x, lerp(3.4, 1.3, easeIn(u)), 0);
  };
  fac.sugar.forEach((s, i) => drop(s, 45.42 + i * 0.1, -0.4 + i * 0.2));
  const ct = keys(t, [[46.0, 0], [46.3, 1], [47.0, 1], [47.3, 0]]);
  fac.carton.visible = t > 45.9 && t < 47.5;
  fac.carton.position.set(0.7, 2.6, 0);
  fac.carton.rotation.z = 1.9 * ct;
  fac.milk.visible = ct > 0.8;
  fac.milk.position.set(0.25, 1.85, 0);
  drop(fac.butter, 47.08, -0.2);
  fac.surface.material.color.copy(DARK).lerp(MILKC, inv(46.4, 47.4, t));
  const spin = inv(48.1, 48.6, t);
  fac.paddle.rotation.y = spin * (t - 48.1) * 4;
  fac.swirl.rotation.z = -spin * (t - 48.1) * 3;
  fac.swirl.visible = spin > 0.01;
  // moulding
  const pu = inv(52.3, 53.8, t);
  fac.pour.visible = pu > 0 && pu < 1;
  fac.nozzle.position.x = fac.pour.position.x = lerp(-0.62, 0.62, pu);
  fac.cav.forEach((c, i) => {
    const col = Math.floor(i / 2);
    const k = inv(52.3 + col * 0.5, 52.8 + col * 0.5, t);
    c.scale.y = Math.max(0.01, k);
    c.visible = k > 0.01 && t < 55.3;
  });
  const cold = inv(54.2, 54.5, t) * (1 - inv(55.2, 55.5, t));
  fac.cold.forEach((s, i) => {
    const u = ((t * 0.8 + i / fac.cold.length) % 1);
    s.visible = cold > 0.01;
    s.position.set(-1.0 + (i % 8) * 0.28, 2.0 - u * 0.9, -0.3 + (i % 2) * 0.6);
    s.scale.setScalar(0.4 * cold);
  });
  fac.bars.forEach((b, i) => {
    const k = easeOut(inv(55.3 + i * 0.12, 55.6 + i * 0.12, t));
    b.visible = k > 0.01;
    b.scale.setScalar(1.4 * Math.max(0.01, k));
  });
}

// =================================================================== SHOTS
const SHOTS = [
  // S1 — kitchen: Affan with a chocolate bar
  [0, 2.54, (t) => {
    mamaSet(t);
    affSet(t, { lookY: 0.1 });
    camMove(t, 0, 2.54, [1.9, 2.5, 4.4], [0.9, 1.5, -0.8], [1.8, 2.4, 3.9], [1.0, 1.5, -0.8], 50);
    const q = pop(t, 0.4, 2.5);
    ov.tag('ep', 'EPISOD 50', { x: W / 2, y: 268, o: q.o, s: q.s }, { bg: '#2f7bff', small: true });
    return kit;
  }],
  // S2 — "Sedapnya coklat ni!"
  [2.54, 4.6, (t) => {
    mamaSet(t);
    const b = keys(t, [[2.6, 0], [2.85, 1], [3.3, 1], [3.6, 0]]);
    affSet(t, { armR: { reach: mix3([-0.45, 0.75, 0.55], BITE.reach, b), pole: BITE.pole }, smile: 1, brow: 0.6, wow: b * 0.3, headPitch: -0.1 * b });
    faceCam();
    const ah = affHead();
    ov.sparkles(t, { n: 24, seed: 7, y: 300, h: 700, a: inv(3.3, 3.6, t) });
    bubble('sedap', 'SEDAPNYA!', t, 2.6, 4.58, 430, 140, { top: '#fff0d8', bot: '#c8783a' });
    void ah;
    return kit;
  }],
  // S3 — "Papa, coklat ni datang dari mana? Macam mana ia dihasilkan?"
  [4.6, 8.64, (t) => {
    mamaSet(t);
    affSet(t, { armL: { reach: [0.02, 1.36, 0.62], pole: [0.6, -1, 0.1], point: 1, wx: -0.4 }, brow: -0.3, smile: 0.5 });
    const ah = faceCam();
    const hd = scr(ah.clone().add(V(0, 0.25, 0)));
    qmarks(t, hd, 4.7, 8.62, [[4.8, -240, 60, '#ffcf33', -12], [5.2, 240, 30, '#3fa2ff', 10], [7.1, 260, 200, '#ffcf33', 14]]);
    bubble('mana', 'DARI MANA?', t, 4.66, 6.98, 430, 130, { top: '#fff6d0', bot: '#ffb21f' });
    bubble('macam', 'MACAM MANA\nDIHASILKAN?', t, 7.02, 8.62, 430, 104, { top: '#fff0d8', bot: '#c8783a' });
    return kit;
  }],
  // S4 — "Jom ikut Affan cari jawapan!"
  [8.64, 10.54, (t) => {
    mamaSet(t);
    const up = keys(t, [[8.66, 0], [8.9, 1], [10.0, 1], [10.3, 0.6]], easeOut);
    affSet(t, { smile: 1, brow: 0.6, armL: { reach: [lerp(0.6, 0.55, up), lerp(0.25, 1.95 + 0.06 * Math.sin(t * 14), up), lerp(0.2, 0.35, up)], pole: [1, -0.3, -0.5] } });
    const ah = affHead();
    const k = easeIn(inv(9.6, 10.54, t));
    lookCam(affFront(2.3 - 1.8 * k, 0.6), ah.clone().add(V(0, -0.15 + 0.2 * k, 0)), 46);
    ov.swirl(t, W / 2, 820, inv(8.8, 10.5, t));
    ov.flash(inv(10.15, 10.54, t) ** 2, '255,240,220');
    return kit;
  }],
  // S5 — the cocoa farm: pods grow straight on the trunk
  [10.54, 20.42, (t) => {
    podOpen(0);
    farmAff(t, V(0.7, 0, 1.4), { yaw: -0.5, lookY: 0.3, ...(t > 14.4 && t < 16.8 ? { armR: { reach: [-0.8, 1.2, 0.6], pole: [-1, -0.3, -0.4], point: 1 } } : {}) });
    if (t < 14.3) camMove(t, 10.54, 14.3, [2.6, 3.0, 8.5], [-0.4, 2.0, 0], [2.2, 2.6, 7.2], [-0.4, 1.8, 0], 50);
    else if (t < 18.6) camMove(t, 14.3, 18.6, [1.4, 1.7, 3.6], [-0.5, 1.3, 0], [1.1, 1.6, 3.2], [-0.5, 1.3, 0], 50);
    else camMove(t, 18.6, 20.42, [3.0, 3.4, 9.0], [0, 2.0, -1], [3.4, 3.8, 10], [0, 2.0, -1], 50);
    ov.flash(1 - inv(10.54, 10.8, t), '255,240,220');
    topTag('pokok', 'POKOK KOKO', t, 11.74, 14.3, GREEN);
    pinTag('batang', 'BUAH TUMBUH PADA BATANG!', scr(V(-0.6, 2.2, 0.3)), t, 14.58, 18.6, { bg: ORANGE, pointer: 'down' }, -40);
    topTag('ladang', 'LADANG KOKO DI MALAYSIA', t, 16.66, 20.4, GREEN);
    topTag('sabah', 'SABAH & PAHANG', t, 18.86, 20.4, BLUE, 410);
    return farm;
  }],
  // S6 — the pod is split open: white, pulp-covered beans
  [20.42, 24.7, (t) => {
    podOpen(easeOut(inv(21.2, 21.9, t)));
    farmAff(t, V(TABLE.x + 1.3, 0, TABLE.z + 0.5), { yaw: -1.2, lookY: 0.4, wow: 0.5 * inv(21.9, 22.2, t) });
    const P = V(TABLE.x, TABLE.y + 0.2, TABLE.z);
    camMove(t, 20.42, 24.7, [P.x + 0.4, P.y + 1.1, P.z + 2.4], P.toArray(), [P.x + 0.3, P.y + 0.9, P.z + 1.9], P.toArray(), 48);
    ov.flash(1 - inv(20.42, 20.7, t));
    topTag('belah', 'BUAH DIBELAH', t, 21.26, 24.68, ORANGE);
    pinTag('biji', 'BIJI BERSELAPUT PUTIH', scr(P.clone().add(V(0, 0.25, 0))), t, 22.88, 24.68, { bg: PURPLE, pointer: 'down' }, -30);
    return farm;
  }],
  // S7 — raw cocoa beans taste bitter!
  [24.7, 27.99, (t) => {
    podOpen(1);
    farm.tasteBean.visible = t < 27.0;
    const b = keys(t, [[25.6, 0], [26.0, 1], [26.6, 1], [26.9, 0]]);
    const yuck = inv(27.0, 27.3, t);
    farmAff(t, V(TABLE.x + 1.3, 0, TABLE.z + 0.5), { yaw: 0.2, smile: 0.9 - 0.9 * yuck, brow: -0.8 * yuck, wow: 0.3 * yuck, headRoll: 0.12 * yuck, armR: { reach: mix3([-0.45, 0.75, 0.55], [-0.08, 1.38, 0.78], b), pole: [-1, -0.6, -0.3] } });
    const ah = fAffHead();
    lookCam(ah.clone().add(V(0.25, 0.0, 2.0)), ah.clone().add(V(0, -0.3, 0)), 46);
    topTag('mentah', 'BIJI KOKO MENTAH', t, 24.76, 27.2, BROWN);
    bubble('pahit', 'PAHIT!', t, 27.3, 27.98, 430, 170, { top: '#ffe0e0', bot: '#ff4d5e' }, 4);
    return farm;
  }],
  // S8 — fermenting: under banana leaves for a few days, until brown
  [27.99, 32.36, (t) => {
    facSet(t);
    facAff(t, ST.ferment, { brow: 0.3 });
    facCam(t, ST.ferment, 27.99, 32.36);
    ov.flash(1 - inv(27.99, 28.3, t));
    topTag('peram', 'DIPERAM', t, 28.88, 32.34, PURPLE);
    const d = pop(t, 29.34, 31.3);
    if (d.o > 0) ov.tag('hari', `HARI ${1 + Math.floor(clamp(inv(29.4, 31.2, t)) * 5.99)}`, { x: W / 2, y: 430, o: d.o, s: d.s }, { bg: ORANGE });
    bubble('perang', 'JADI PERANG!', t, 31.82, 32.34, 430, 120, { top: '#fff0d8', bot: '#a86a3a' });
    return fac;
  }],
  // S9 — drying in the sun
  [32.36, 34.94, (t) => {
    facSet(t);
    facAff(t, ST.dry, { smile: 1 });
    camMove(t, 32.36, 34.94, [ST.dry + 0.5, 2.6, 7.2], [ST.dry, 1.6, 0], [ST.dry + 0.2, 2.6, 6.6], [ST.dry, 1.8, 0], 50);
    topTag('jemur', 'DIJEMUR DI BAWAH MATAHARI', t, 33.04, 34.92, ORANGE);
    return fac;
  }],
  // S10 — roasting: the smell of chocolate
  [34.94, 39.18, (t) => {
    facSet(t);
    facAff(t, ST.roast, { wow: 0.4 * inv(37.3, 37.6, t), smile: 1, headPitch: -0.1 * inv(36.6, 37, t) });
    facCam(t, ST.roast, 34.94, 39.18);
    topTag('panggang', 'DIPANGGANG', t, 35.38, 39.15, RED);
    bubble('wangi', 'WANGINYA!', t, 37.36, 39.15, 430, 130, { top: '#ffe0f2', bot: '#ff5cb0' });
    return fac;
  }],
  // S11 — shelling
  [39.18, 41.3, (t) => {
    facSet(t);
    facAff(t, ST.shell);
    facCam(t, ST.shell, 39.18, 41.3);
    topTag('kulit', 'KULIT BIJI DIBUANG', t, 39.24, 41.28, ORANGE);
    return fac;
  }],
  // S12 — grinding into liquid chocolate paste
  [41.3, 44.3, (t) => {
    facSet(t);
    facAff(t, ST.grind, { wow: 0.4 * inv(42.9, 43.2, t) });
    facCam(t, ST.grind, 41.3, 44.3);
    topTag('kisar', 'DIKISAR', t, 41.44, 44.28, PURPLE);
    pinTag('pes', 'PES COKLAT CAIR', scr(V(ST.grind + 0.75, 0.9, 0)), t, 42.94, 44.28, { bg: BROWN, pointer: 'down' }, -40);
    return fac;
  }],
  // S13 — mixing with sugar, milk and cocoa butter, stirred until smooth
  [44.3, 50.96, (t) => {
    facSet(t);
    facAff(t, ST.mix, { smile: 1 });
    camMove(t, 44.3, 50.96, [ST.mix + 0.4, 3.4, 6.6], [ST.mix, 1.5, 0], [ST.mix + 0.2, 3.0, 5.6], [ST.mix, 1.3, 0], 50);
    [['GULA', 45.42, -0.5], ['SUSU', 46.32, 0.6], ['LEMAK KOKO', 47.08, -0.1]].forEach(([txt, a, x], i) => {
      pinTag('in' + i, txt, scr(V(ST.mix + x, 2.6, 0)), t, a, 48.1, { bg: ['#6a7488', BLUE, '#c8a03a'][i], pointer: 'down' }, -40 - i * 70);
    });
    topTag('kacau', 'DIKACAU LAMA-LAMA', t, 48.18, 50.94, PURPLE);
    bubble('licin', 'SAMPAI LICIN!', t, 50.1, 50.94, 430, 120, { top: '#fff0d8', bot: '#a86a3a' });
    return fac;
  }],
  // S14 — poured into moulds and cooled into bars
  [50.96, 56.41, (t) => {
    facSet(t);
    facAff(t, ST.mold, { wow: 0.5 * inv(55.4, 55.7, t), smile: 1 });
    camMove(t, 50.96, 56.41, [ST.mold + 0.4, 3.0, 6.6], [ST.mold, 1.2, 0], [ST.mold + 0.2, 2.6, 5.8], [ST.mold, 1.3, 0.3], 50);
    topTag('tuang', 'DITUANG KE DALAM ACUAN', t, 52.36, 54.2, BROWN);
    topTag('sejuk', 'DISEJUKKAN', t, 54.28, 55.3, BLUE);
    bubble('keping', 'KEPINGAN COKLAT!', t, 55.36, 56.38, 430, 116, { top: '#fff0d8', bot: '#a86a3a' });
    return fac;
  }],
  // S15 — cocoa butter melts at body temperature, so chocolate melts in the mouth
  [56.41, 62.18, (t) => {
    mamaSet(t);
    const b = keys(t, [[60.3, 0], [60.6, 1], [61.2, 1], [61.5, 0]]);
    const melt = inv(60.5, 61.6, t);
    affSet(t, { armR: { reach: mix3([-0.45, 0.75, 0.55], BITE.reach, b), pole: BITE.pole }, smile: 1, brow: 0.4, wow: 0.3 * melt, lookY: 0.2 }, { bar: 1 - 0.4 * melt });
    faceCam();
    ov.flash(1 - inv(56.41, 56.7, t));
    topTag('tahu', 'TAHU TAK?', t, 56.46, 57.3, PURPLE);
    const q1 = pop(t, 57.36, 62.15), q2 = pop(t, 58.62, 62.15);
    if (q1.o > 0) ov.tag('cb', 'LEMAK KOKO CAIR: 34°C', { x: W / 2, y: 330, o: q1.o, s: q1.s }, { bg: '#c8a03a' });
    if (q2.o > 0) ov.tag('bd', 'SUHU BADAN: 37°C', { x: W / 2, y: 440, o: q2.o, s: q2.s }, { bg: RED });
    bubble('cair', 'CAIR DALAM MULUT!', t, 60.48, 62.15, 1080, 100, { top: '#fff0d8', bot: '#a86a3a' });
    return kit;
  }],
  // S16 — "Waaah, rupanya sekeping coklat datang dari perjalanan yang panjang!"
  [62.18, 67.22, (t) => {
    mamaSet(t);
    affSet(t, { wow: keys(t, [[62.2, 0], [62.35, 0.9], [62.9, 0.9], [63.2, 0]]), smile: 1, brow: 0.5 });
    const ah = faceCam();
    ov.flash((1 - inv(62.18, 62.45, t)) * 0.9, '255,250,235');
    const hd = scr(ah.clone().add(V(0, 0.3, 0)));
    const b = pop(t, 62.2, 64.4);
    ov.html('bulb', ICONS.bulb(), { x: clamp(hd.x + 220, 150, 900), y: clamp(hd.y - 170, 300, 900) + Math.sin(t * 5) * 8, o: b.o, s: b.s * 0.6, r: 10 });
    ov.sparkles(t, { n: 30, seed: 12, y: 250, h: 900, a: inv(62.2, 62.5, t) * (1 - inv(64.0, 64.6, t)) });
    ['BUAH', 'PERAM', 'JEMUR', 'PANGGANG', 'KISAR', 'ACUAN'].forEach((txt, i) => {
      const q = pop(t, 63.5 + i * 0.22, 67.2);
      if (q.o > 0) ov.tag('st' + i, `${i + 1}. ${txt}`, { x: [200, 540, 880][i % 3], y: 1040 + Math.floor(i / 3) * 100, o: q.o, s: q.s }, { bg: [GREEN, PURPLE, ORANGE, RED, BROWN, BLUE][i], small: true });
    });
    bubble('jalan', 'PERJALANAN\nYANG PANJANG!', t, 65.04, 67.2, 430, 104, { top: '#fff6d0', bot: '#ffb21f' });
    return kit;
  }],
  // S17 — "Tapi jangan makan banyak sangat, dan gosok gigi, ya."
  [67.22, 70.62, (t) => {
    mamaSet(t, { armR: { reach: [-0.7, 1.4, 0.5], pole: [-1, -0.5, -0.3], point: 1 } });
    const br = t > 69.2;
    affSet(t, { smile: 1, brow: 0.3, ...(br ? { talk: 0, armL: { reach: [0.12 + 0.06 * Math.sin(t * 22), 1.36, 0.8], pole: [1, -0.6, -0.3] } } : {}) }, { bar: t < 68.2 ? 1 - inv(67.9, 68.2, t) : 0, brush: br ? 1 : 0 });
    faceCam();
    topTag('jangan', 'JANGAN MAKAN BANYAK SANGAT', t, 67.28, 70.6, RED);
    bubble('gigi', 'GOSOK GIGI!', t, 69.5, 70.6, 1080, 120, { top: '#e0f6ff', bot: '#2fa8d8' });
    return kit;
  }],
  // S18 — "Apa lagi kita nak belajar lepas ni?"
  [70.62, OUTRO, (t) => {
    mamaSet(t);
    const tk = keys(t, [[70.65, 0], [71.0, 1]]);
    affSet(t, { smile: 1, brow: 0.3 + 0.4 * tk, headRoll: -0.12 * tk, lookX: 0.35 * tk, lookY: 0.4 * tk, armL: { reach: mix3([0.55, 0.3, 0.2], [0.02, 1.36, 0.62], tk), pole: [0.6, -1, 0.1], point: tk } }, { bar: 0 });
    const ah = faceCam();
    const hd = scr(ah.clone().add(V(0, 0.25, 0)));
    qmarks(t, hd, 70.62, OUTRO - 0.05, [[70.65, -240, -80, '#ffcf33', -12], [70.95, 240, -130, '#3fa2ff', 10], [71.25, 280, 60, '#ffcf33', 14]]);
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

// Cover / thumbnail (9:16): a split cocoa pod and a chocolate bar on the farm table.
function thumbnail() {
  ov.begin();
  cam.aspect = W / H;
  cam.updateProjectionMatrix();
  const t = 23.0;
  podOpen(1);
  farm.bar.visible = true;
  farmAff(t, V(TABLE.x - 0.9, 0, TABLE.z - 0.7), { yaw: 0.4, smile: 1, wow: 0.5, brow: 0.6, lookY: 0.2 });
  const P = V(TABLE.x + 0.1, TABLE.y + 0.25, TABLE.z);
  lookCam(P.clone().add(V(0.5, 1.3, 2.7)), P.clone().add(V(-0.2, 0.55, 0)), 50);
  farm.sky.position.copy(cam.position);
  renderer.setViewport(0, 0, W, H);
  renderer.render(farm.scene, cam);
  farm.bar.visible = false;
  const g = ov.g;
  const top = g.createLinearGradient(0, 0, 0, 760);
  top.addColorStop(0, 'rgba(40,20,10,0.45)');
  top.addColorStop(1, 'rgba(40,20,10,0)');
  g.fillStyle = top;
  g.fillRect(0, 0, W, 760);
  ov.vignette(0.3);
  ov.tag('thBadge', 'EPISOD 50', { x: W / 2, y: 300 }, { bg: '#2f7bff', small: true });
  ov.bubble('thTitle', 'COKLAT', { x: W / 2, y: 455, r: -3 }, { size: 150, top: '#fff0d8', bot: '#a86a3a' });
  ov.bubble('thTitle2', 'DARI BUAH?!', { x: W / 2, y: 615, r: 2 }, { size: 120, top: '#fff6d0', bot: '#ffb21f' });
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
