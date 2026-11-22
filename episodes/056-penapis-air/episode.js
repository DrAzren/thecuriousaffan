// THE CURIOUS AFFAN — Episode 056: "Macam Mana Penapis Air Buat Air Jadi Bersih?"
// Every shot is a pure function of time t (seconds), synced to audio/narration.mp3.
import * as THREE from 'three';
import { makeRenderer, loadEnvelope, toScreen, clamp, lerp, inv, easeOut, easeIn, easeInOut, keys, W, H } from '../../shared/core.js';
import { POSES, blinkAt } from '../../shared/affan.js';
import { Overlay, pop, ICONS, drawLogo } from '../../shared/overlay.js';
import { CAPTIONS, KEYWORDS } from './captions.js';
import { buildKitchen56, buildFilter, buildPlant, buildOutro, FILTER_AT, LAYERS, CARB_AT, MEM_AT } from './worlds.js';
import { MAMA_POS, AFF_POS, ISLAND_TOP } from '../038-bawang-menangis/worlds.js';

const FPS = 30;
const DURATION = 65.15;
const OUTRO = 62.0;

const stage = document.getElementById('stage');
const canvas = document.createElement('canvas');
stage.appendChild(canvas);
const renderer = makeRenderer(canvas);
const ov = new Overlay(stage);
const kit = buildKitchen56();
const flt = buildFilter();
const plant = buildPlant();
const outro = buildOutro();
const cam = new THREE.PerspectiveCamera(50, W / H, 0.02, 6000);
let env = { at: () => 0 };

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const talk = (t) => clamp(env.at(t) * 1.2);
const scr = (p) => toScreen(p, cam);
const mix3 = (a, b, k) => a.map((v, i) => lerp(v, b[i], k));
const BLUE = '#2f9bff', ORANGE = '#ff8a3d', PURPLE = '#7a5cf0', GREEN = '#2fbf5f', PINK = '#ff5c9a', RED = '#ff4d5e', GREY = '#6a7488', BROWN = '#a8743a';

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

// ------------------------------------------------------------------ kitchen
const AFF_YAW_F = Math.atan2(FILTER_AT.x - AFF_POS.x, FILTER_AT.z - AFF_POS.z);
const YAW_CAM = Math.atan2(0.4, 1);
function mamaSet(t, p = {}) {
  const m = kit.mama;
  m.root.position.copy(MAMA_POS);
  m.pose({ yaw: 0.25, lean: 0.1, blink: blinkAt(t, 5), smile: 1, brow: 0.2, ...p });
  m.root.updateMatrixWorld(true);
}
function affSet(t, p = {}) {
  const a = kit.aff;
  a.root.position.copy(AFF_POS);
  a.pose({ yaw: AFF_YAW_F, blink: blinkAt(t, 1), talk: talk(t), smile: 0.9, ...p });
  a.root.updateMatrixWorld(true);
}
const affHead = () => kit.aff.parts.head.getWorldPosition(V());
const affFront = (d, side) => affHead().add(V(0.35 + side * 0.2, 0.1, d));
// clean glass fills (0..1) from the filter spout
function kitSet(t, { fill = 1, pour = 0, carts = 0 } = {}) {
  kit.clean.water.scale.y = Math.max(0.001, fill);
  kit.clean.water.position.y = 0.1 * fill;
  const top = ISLAND_TOP + 0.37, bot = ISLAND_TOP + 0.2 * fill + 0.01;
  kit.stream.visible = pour > 0.02;
  kit.stream.scale.set(pour, top - bot, pour);
  kit.stream.position.y = (top + bot) / 2;
  kit.oldC.visible = kit.newC.visible = carts > 0.01;
  if (carts > 0.01) {
    kit.oldC.position.copy(kit.aff.parts.arms.L.hand.getWorldPosition(V())).add(V(0, 0.06, 0.04));
    kit.newC.position.copy(kit.aff.parts.arms.R.hand.getWorldPosition(V())).add(V(0, 0.06, 0.04));
    kit.oldC.scale.setScalar(0.7 * carts);
    kit.newC.scale.setScalar(0.7 * carts);
  }
}
const SPOUT = V(FILTER_AT.x + 0.3, ISLAND_TOP + 0.37, FILTER_AT.z);
const DIRTY = kit.dirty.g.position, CLEAN = kit.clean.g.position;

// ------------------------------------------------------------ inside filter
const TOP_Y = 11;
// fall from the top at time t0 with speed v, stop at stopY
const fallY = (t, t0, v, stopY) => (t < t0 ? TOP_Y + 3 : Math.max(stopY, TOP_Y - (t - t0) * v));
const GERM_GREY = new THREE.Color(0x8a8a8a);
function filterSet(t, { uv = 0, kill = 0 } = {}) {
  flt.drops.forEach((s, i) => {
    const u = s.userData;
    s.position.set(u.x, TOP_Y - ((t * 2.2 + u.ph * 18) % 18), u.z);
    s.scale.setScalar(0.32);
  });
  flt.dirt.forEach((m, i) => {
    const u = m.userData;
    m.position.set(u.x, fallY(t, 15.4 + u.ph * 3.6, 3.2, LAYERS.sed + 0.5 + (i % 3) * 0.13), u.z);
    m.rotation.set(t * 0.5 + i, i, 0);
  });
  flt.mols.forEach((g, i) => {
    const u = g.userData;
    g.position.set(u.x, fallY(t, 21.0 + u.ph * 4, 3.6, LAYERS.carb + (u.ph - 0.5) * 1.3), u.z);
    g.rotation.set(t + i, i * 2, 0);
  });
  flt.germs.forEach((g, i) => {
    const u = g.userData;
    if (i < 7) {
      // caught on top of the membrane
      g.position.set(u.x, fallY(t, 31.0 + u.ph * 3, 3.4, LAYERS.mem + 0.95) + 0.08 * Math.abs(Math.sin(t * 5 + i)), (i % 2 ? 0.8 : -0.6));
      g.scale.setScalar(0.9);
      g.userData.m.color.setHex(i % 2 ? 0x7ad84a : 0x5ac88a);
    } else {
      // a few left near the UV lamp
      const a = i * 2.1 + t * 0.6;
      g.position.set(Math.cos(a) * 1.3, LAYERS.uv + 0.75 + 0.2 * Math.sin(t * 2 + i), 0.9 + Math.sin(a) * 0.4);
      g.scale.setScalar(0.9 * (1 - 0.85 * kill));
      g.userData.m.color.setHex(0x7ad84a).lerp(GERM_GREY, kill);
      g.userData.m.emissiveIntensity = 0.15 * (1 - kill);
    }
  });
  flt.uvLamp.material.color.setHex(0x6a5a88).lerp(new THREE.Color(0xa860ff), uv);
  flt.uvGlow.material.opacity = 0.9 * uv;
  flt.uvGlow.scale.setScalar(4 + 0.4 * Math.sin(t * 9));
  // granule close-up: molecules fly into its pores
  flt.stuck.forEach((g, i) => {
    const u = g.userData;
    const k = easeInOut(inv(28.2 + i * 0.16, 29.2 + i * 0.16, t));
    const from = CARB_AT.clone().add(u.from).add(V(0, -2, 0));
    const to = CARB_AT.clone().add(u.d.clone().multiplyScalar(2.5));
    g.position.copy(from.lerp(to, k));
    g.rotation.set(t * 2 * (1 - k) + i, i, 0);
    g.scale.setScalar(1.7);
  });
  // membrane close-up: water passes through, germs bounce
  flt.h2o.forEach((s) => {
    const u = s.userData;
    s.position.set(MEM_AT.x + u.x, MEM_AT.y + 5 - ((t * 1.6 + u.ph * 10) % 10), MEM_AT.z + u.z);
    s.scale.setScalar(0.45);
  });
  flt.mGerms.forEach((g, i) => {
    const u = g.userData;
    const z = (i % 2 ? 0.6 : -0.4);
    const rest = MEM_AT.y - 0.255 * z + 0.75;
    const y = t < 33.0 + u.ph ? MEM_AT.y + 9 : Math.max(rest, MEM_AT.y + 6 - (t - 33.0 - u.ph) * 4.5);
    g.position.set(MEM_AT.x + u.x, y + (y <= rest ? 0.3 * Math.abs(Math.sin(t * 4 + i * 1.3)) : 0), MEM_AT.z + z);
  });
}

// -------------------------------------------------------------- the plant
function plantSet(t) {
  plant.flow.forEach((s) => s.position.copy(plant.curve.getPointAt((s.userData.ph + t * 0.1) % 1)).add(V(0, 0.18, 0)));
  plant.tanks.forEach((k, i) => (k.w.rotation.z = t * 0.3 * (i + 1)));
}
const camX = (t) => lerp(-8, 7.5, inv(46.6, 51.55, t));

// =================================================================== SHOTS
const SHOTS = [
  // S1 — kitchen: Affan on his stool beside the water filter, Mama behind the counter
  [0, 1.8, (t) => {
    kitSet(t, { fill: 0 });
    mamaSet(t);
    affSet(t, { headPitch: 0.05 });
    camMove(t, 0, 1.8, [1.4, 2.6, 5.2], [0.9, 1.6, -0.8], [1.3, 2.5, 4.6], [0.9, 1.6, -0.8], 50);
    const q = pop(t, 0.4, 1.78);
    ov.tag('ep', 'EPISOD 56', { x: W / 2, y: 268, o: q.o, s: q.s }, { bg: '#2f7bff', small: true });
    return kit;
  }],
  // S2 — "Papa! Air paip ni nampak kekuningan, tapi bila keluar dari penapis, terus jernih!"
  [1.8, 8.28, (t) => {
    const fill = easeInOut(inv(5.6, 7.6, t));
    kitSet(t, { fill, pour: keys(t, [[5.4, 0], [5.6, 1], [7.5, 1], [7.7, 0]]) });
    mamaSet(t);
    affSet(t, { headPitch: 0.15, brow: t < 5.1 ? -0.3 : 0.5, wow: keys(t, [[7.1, 0], [7.3, 0.8], [8.0, 0.8], [8.2, 0]]) });
    if (t < 5.1) camMove(t, 1.8, 5.1, [0.38, 1.85, 1.0], [0.22, 1.45, -0.8], [0.32, 1.8, 0.8], [0.22, 1.45, -0.82], 44);
    else camMove(t, 5.1, 8.28, [1.35, 1.85, 0.8], [0.95, 1.5, -0.9], [1.3, 1.8, 0.65], [0.95, 1.5, -0.95], 44);
    const pp = pop(t, 1.85, 3.0, { from: 2 });
    ov.bubble('papa', 'PAPA!', { x: 800, y: 470, o: pp.o, s: pp.s * 0.8, r: 6 }, { size: 110 });
    pinTag('paip', 'AIR PAIP: KEKUNINGAN', { ...scr(DIRTY.clone().add(V(0, 0.3, 0))), x: 400 }, t, 3.04, 5.08, { bg: BROWN, pointer: 'down' }, -50);
    pinTag('jernih', 'LEPAS DITAPIS: JERNIH!', scr(CLEAN.clone().add(V(0, 0.3, 0))), t, 6.9, 8.26, { bg: BLUE, pointer: 'down' }, -50);
    return kit;
  }],
  // S3 — "Macam mana penapis air buat air jadi bersih?"
  [8.28, 11.0, (t) => {
    kitSet(t, { fill: 1 });
    mamaSet(t);
    affSet(t, { yaw: YAW_CAM, ...POSES.thinkR, brow: -0.3, smile: 0.5 });
    const ah = affHead();
    lookCam(affFront(2.3, 0.6), ah.clone().add(V(0, -0.15, 0)), 46);
    const hd = scr(ah.clone().add(V(0, 0.4, 0)));
    qmarks(t, hd, 8.3, 10.98, [[8.35, -260, 100, '#ffcf33', -12], [8.7, 250, 60, '#3fa2ff', 10], [9.1, 280, 240, '#ffcf33', 14]]);
    bubble('macam', 'MACAM MANA\nAIR JADI BERSIH?', t, 8.32, 10.98, 430, 104, { top: '#e6f8ff', bot: '#4ab8f0' });
    return kit;
  }],
  // S4 — "Jom ikut Affan cari jawapan!" then dive into the filter
  [11.0, 12.92, (t) => {
    kitSet(t, { fill: 1 });
    mamaSet(t);
    const up = keys(t, [[11.02, 0], [11.26, 1], [12.3, 1], [12.6, 0.6]], easeOut);
    affSet(t, { yaw: YAW_CAM, smile: 1, brow: 0.6, armR: { reach: [lerp(-0.6, -0.55, up), lerp(0.25, 1.95 + 0.06 * Math.sin(t * 14), up), lerp(0.2, 0.35, up)], pole: [-1, -0.3, -0.5] } });
    const ah = affHead();
    const k = easeIn(inv(12.0, 12.92, t));
    const ft = FILTER_AT.clone().add(V(0, 0.5, 0));
    lookCam(affFront(2.3, 0.6).lerp(ft.clone().add(V(0, 0.05, 0.3)), k), ah.clone().add(V(0, -0.15, 0)).lerp(ft, k), 46);
    ov.swirl(t, W / 2, 820, inv(11.05, 12.85, t));
    ov.flash(inv(12.55, 12.92, t) ** 2, '230,248,255');
    return kit;
  }],
  // S5 — inside: layers; the first one is a fine filter that catches sand, rust and dirt
  [12.92, 21.66, (t) => {
    filterSet(t);
    if (t < 15.76) camMove(t, 12.92, 15.76, [0, 1.5, 26], [0, 1.0, 0], [0, 1.2, 22], [0, 1.0, 0], 50, easeOut);
    else camMove(t, 15.76, 17.0, [0, 1.2, 22], [0, 1.0, 0], [0.6, LAYERS.sed + 1.3, 8.2], [0, LAYERS.sed + 0.6, 0], 48);
    ov.flash(1 - inv(12.92, 13.3, t));
    topTag('lapisan', 'BEBERAPA LAPISAN', t, 14.2, 15.74, PURPLE);
    if (t < 15.76) {
      const ls = [['1  PENAPIS HALUS', LAYERS.sed, '#c8a070'], ['2  KARBON', LAYERS.carb, '#4a4a58'], ['3  MEMBRAN', LAYERS.mem, '#3a8ae0'], ['4  LAMPU UV', LAYERS.uv, PURPLE]];
      ls.forEach(([txt, y, bg], i) => {
        const q = pop(t, 14.8 + i * 0.18, 15.7);
        const p = scr(V(2.4, y, 0));
        if (q.o > 0) ov.tag('ly' + i, txt, { x: clamp(p.x + 160, 300, 800), y: p.y, o: q.o, s: q.s }, { bg, small: true });
      });
    }
    topTag('pertama', 'LAPISAN 1: PENAPIS HALUS', t, 15.8, 21.6, '#c8a070');
    const dp = (i) => scr(flt.dirt[i].position.clone().add(V(0, 0.2, 0)));
    pinTag('pasir', 'PASIR', dp(0), t, 18.9, 21.6, { bg: '#c8a040', pointer: 'down' }, -70);
    pinTag('karat', 'KARAT', dp(1), t, 19.76, 21.6, { bg: '#c8602a', pointer: 'down' }, -70);
    pinTag('kotor', 'KOTORAN', dp(5), t, 20.44, 21.6, { bg: '#7a5a3a', pointer: 'down' }, -70);
    return flt;
  }],
  // S6 — activated carbon: full of tiny holes, like a sponge; smells and chemicals stick
  [21.66, 32.58, (t) => {
    filterSet(t);
    if (t < 25.2) camMove(t, 21.66, 23.0, [0.6, LAYERS.sed + 1.3, 8.2], [0, LAYERS.sed + 0.6, 0], [0.4, LAYERS.carb + 1.1, 7.2], [0, LAYERS.carb, 0], 48);
    else camMove(t, 25.2, 32.5, CARB_AT.clone().add(V(0.6, 1.2, 9.2)).toArray(), CARB_AT.clone().add(V(0, -0.4, 0)).toArray(), CARB_AT.clone().add(V(0.3, 0.8, 7.6)).toArray(), CARB_AT.clone().add(V(0, -0.3, 0)).toArray(), 48);
    ov.flash((1 - inv(25.2, 25.5, t)) * (t > 25.2 ? 0.8 : 0));
    topTag('kedua', 'LAPISAN 2: KARBON TERAKTIF', t, 21.7, 25.18, '#4a4a58');
    topTag('lubang', 'PENUH LUBANG SANGAT KECIL', t, 25.4, 28.1, '#4a4a58');
    bubble('span', 'MACAM SPAN!', t, 27.56, 29.4, 430, 116, { top: '#fff6d0', bot: '#ffb21f' });
    topTag('bau', 'BAU', t, 28.14, 32.5, PINK, 1150);
    topTag('rasa', 'RASA PELIK', t, 29.46, 32.5, PURPLE, 1235);
    topTag('kimia', 'BAHAN KIMIA', t, 30.44, 32.5, ORANGE, 1320);
    topTag('melekat', 'SEMUA MELEKAT!', t, 31.08, 32.5, GREEN);
    return flt;
  }],
  // S7 — a membrane with holes smaller than germs: germs can't pass, only water
  [32.58, 40.14, (t) => {
    filterSet(t);
    camMove(t, 32.58, 40.1, MEM_AT.clone().add(V(0.4, 5.2, 8.0)).toArray(), MEM_AT.clone().add(V(0, 0.2, 0)).toArray(), MEM_AT.clone().add(V(0.2, 4.2, 6.6)).toArray(), MEM_AT.clone().add(V(0, 0, 0)).toArray(), 48);
    ov.flash(1 - inv(32.58, 32.9, t));
    topTag('membran', 'MEMBRAN', t, 33.9, 40.1, '#3a8ae0');
    const hole = scr(MEM_AT.clone().add(V(-0.56, 0.02, 1.6)));
    pinTag('kecil', 'LUBANG LEBIH KECIL DARI KUMAN!', { ...hole, x: W / 2 }, t, 35.3, 37.0, { bg: '#3a8ae0', pointer: 'up' }, 90);
    const g = flt.mGerms[2].position.clone();
    const gp = scr(g.clone().add(V(0, 0.9, 0)));
    pinTag('kuman', 'KUMAN TAK BOLEH LALU!', gp, t, 37.1, 40.1, { bg: RED, pointer: 'down' }, -40);
    const cq = pop(t, 37.2, 40.1);
    const gc = scr(g);
    if (cq.o > 0) ov.html('cross', ICONS.cross(), { x: gc.x, y: gc.y, o: cq.o, s: cq.s * 0.55 });
    const wp = scr(MEM_AT.clone().add(V(1.2, -2.2, 0.5)));
    pinTag('airsaja', 'AIR SAJA YANG BOLEH', wp, t, 38.7, 40.1, { bg: BLUE, pointer: 'up' }, 90);
    return flt;
  }],
  // S8 — some filters use an ultraviolet lamp to kill the germs that are left
  [40.14, 45.8, (t) => {
    const uv = easeOut(inv(41.6, 42.2, t));
    filterSet(t, { uv, kill: easeInOut(inv(43.4, 44.6, t)) });
    camMove(t, 40.14, 45.8, [0.3, LAYERS.uv + 1.6, 7.4], [0, LAYERS.uv + 0.4, 0], [0.2, LAYERS.uv + 1.2, 6.0], [0, LAYERS.uv + 0.4, 0], 48);
    ov.flash(1 - inv(40.14, 40.45, t));
    topTag('uv', 'LAMPU ULTRAUNGU (UV)', t, 41.66, 45.75, PURPLE);
    bubble('mati', 'KUMAN MATI!', t, 43.4, 45.75, 470, 110, { top: '#f2e6ff', bot: '#a070ff' });
    return flt;
  }],
  // S9 — "Tahu tak? ... air sungai pun dah dibersihkan di loji rawatan air!"
  [45.8, 51.64, (t) => {
    plantSet(t);
    const x = camX(t);
    lookCam(V(x, 4.8, 8.6), V(x, 1.0, 0), 50);
    ov.flash(1 - inv(45.8, 46.1, t));
    topTag('tahu', 'TAHU TAK?', t, 45.8, 47.0, ORANGE);
    pinTag('sungai', 'AIR SUNGAI', scr(V(-9, 0.3, 1.5)), t, 46.7, 47.6, { bg: BROWN, pointer: 'down' }, -60);
    const tankTag = (i, a, b, bg) => pinTag('tk' + i, plant.tanks[i].label, scr(plant.tanks[i].g.position.clone().add(V(0, 1.3, 0))), t, a, b, { bg, pointer: 'down' }, -50);
    tankTag(0, 47.2, 48.3, '#a8946a');
    tankTag(1, 48.3, 49.4, '#4a98b0');
    tankTag(2, 49.4, 50.5, BLUE);
    pinTag('rumah', 'RUMAH KITA', scr(plant.house.position.clone().add(V(0, 2.1, 0))), t, 50.9, 51.62, { bg: GREEN, pointer: 'down' }, -40);
    topTag('loji', 'LOJI RAWATAN AIR', t, 50.2, 51.62, GREEN);
    return plant;
  }],
  // S10 — "Waaah, rupanya penapis air macam pengawal..." + "jangan lupa tukar penapis ikut masa"
  [51.64, 59.78, (t) => {
    mamaSet(t);
    const hold = easeOut(inv(56.6, 57.2, t));
    kitSet(t, { fill: 1, carts: hold });
    const armsUp = hold > 0 ? { armL: { reach: mix3([0.3, 0.2, 0.2], [0.42, 0.62, 0.55], hold), pole: [1, -0.6, -0.3] }, armR: { reach: mix3([-0.3, 0.2, 0.2], [-0.42, 0.62, 0.55], hold), pole: [-1, -0.6, -0.3] } } : {};
    affSet(t, { yaw: YAW_CAM, wow: keys(t, [[51.64, 0], [51.8, 0.9], [52.5, 0.9], [52.8, 0]]), smile: 1, brow: 0.6, ...armsUp });
    const ah = affHead();
    lookCam(affFront(t < 56.42 ? 2.3 : 2.6, 0.6), ah.clone().add(V(0, t < 56.42 ? -0.15 : -0.3, 0)), 46);
    const hd = scr(ah.clone().add(V(0, 0.5, 0)));
    const b = pop(t, 51.7, 56.3);
    ov.html('bulb', ICONS.bulb(), { x: clamp(hd.x + 220, 150, 900), y: clamp(hd.y - 170, 300, 900) + Math.sin(t * 5) * 8, o: b.o, s: b.s * 0.6, r: 10 });
    ov.sparkles(t, { n: 30, seed: 12, y: 250, h: 900, a: inv(51.7, 52.0, t) * (1 - inv(55.8, 56.4, t)) });
    bubble('pengawal', 'PENGAWAL\nAIR KITA!', t, 53.9, 56.36, 430, 116, { top: '#e6f8ff', bot: '#4ab8f0' });
    if (hold > 0.3) {
      pinTag('lama', 'LAMA', scr(kit.oldC.position.clone().add(V(0, 0.2, 0))), t, 57.0, 59.76, { bg: BROWN, pointer: 'down' }, -50);
      pinTag('baru', 'BARU', scr(kit.newC.position.clone().add(V(0, 0.2, 0))), t, 57.2, 59.76, { bg: GREEN, pointer: 'down' }, -50);
    }
    topTag('tukar', 'TUKAR PENAPIS IKUT MASA', t, 57.68, 59.76, ORANGE);
    return kit;
  }],
  // S11 — "Apa lagi kita nak belajar lepas ni?"
  [59.78, OUTRO, (t) => {
    mamaSet(t);
    kitSet(t, { fill: 1 });
    const tk = keys(t, [[59.8, 0], [60.2, 1]]);
    const th2 = POSES.thinkR.armR;
    affSet(t, { yaw: YAW_CAM, smile: 1, brow: 0.3 + 0.4 * tk, headRoll: -0.12 * tk, lookX: 0.35 * tk, lookY: 0.4 * tk, headPitch: -0.08 * tk, armR: { reach: mix3([-0.55, 0.3, 0.2], th2.reach, tk), pole: th2.pole, point: tk, wx: th2.wx * tk } });
    const ah = affHead();
    lookCam(affFront(2.4, 0.6), ah.clone().add(V(0, -0.2, 0)), 46);
    const hd = scr(ah.clone().add(V(0, 0.45, 0)));
    qmarks(t, hd, 59.78, OUTRO - 0.05, [[59.8, -260, -100, '#ffcf33', -12], [60.1, 250, -160, '#3fa2ff', 10], [60.4, 300, 60, '#ffcf33', 14]]);
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

// Cover / thumbnail (9:16): the yellowish glass beside the clear one, under the filter.
function thumbnail() {
  ov.begin();
  cam.aspect = W / H;
  cam.updateProjectionMatrix();
  kitSet(0, { fill: 1 });
  mamaSet(0);
  affSet(0, { yaw: YAW_CAM, wow: 0.8, smile: 1, brow: 0.6, talk: 0 });
  lookCam(V(0.5, 1.95, 1.85), V(0.5, 1.4, -0.85), 46);
  renderer.setViewport(0, 0, W, H);
  renderer.render(kit.scene, cam);
  ov.vignette(0.3);
  ov.tag('thBadge', 'EPISOD 56', { x: W / 2, y: 300 }, { bg: '#2f7bff', small: true });
  ov.bubble('thTitle', 'AIR KERUH', { x: W / 2, y: 445, r: -3 }, { size: 130, top: '#fff2c8', bot: '#c8a040' });
  ov.bubble('thTitle2', 'JADI JERNIH?!', { x: W / 2, y: 600, r: 2 }, { size: 130, top: '#e6f8ff', bot: '#4ab8f0' });
  drawLogo(ov, { y: 1460, scale: 0.55 });
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
