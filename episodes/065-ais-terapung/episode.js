// THE CURIOUS AFFAN — Episode 065: "Kenapa Ais Terapung?"
// Every shot is a pure function of time t (seconds), synced to audio/narration.mp3.
import * as THREE from 'three';
import { makeRenderer, loadEnvelope, toScreen, clamp, lerp, inv, easeOut, easeIn, easeInOut, keys, W, H } from '../../shared/core.js';
import { POSES, blinkAt } from '../../shared/affan.js';
import { Overlay, pop, ICONS, drawLogo } from '../../shared/overlay.js';
import { CAPTIONS, KEYWORDS } from './captions.js';
import { buildKitchen65, buildLab, buildOutro, AFF_POS, MAMA_POS, GLASS_AT, ICEBOWL_AT, JUG_AT, SCALE_AT, LAKE_AT } from './worlds.js';

const FPS = 30;
const DURATION = 53.05;
const OUTRO = 49.9;

const stage = document.getElementById('stage');
const canvas = document.createElement('canvas');
stage.appendChild(canvas);
const renderer = makeRenderer(canvas);
const ov = new Overlay(stage);
const kit = buildKitchen65();
const lab = buildLab();
const outro = buildOutro();
const cam = new THREE.PerspectiveCamera(50, W / H, 0.02, 6000);
let env = { at: () => 0 };

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const talk = (t) => clamp(env.at(t) * 1.2);
const scr = (p) => toScreen(p, cam);
const mix3 = (a, b, k) => a.map((v, i) => lerp(v, b[i], k));
const sm = (a, b, t) => easeInOut(inv(a, b, t));
const BLUE = '#2f9bff', ORANGE = '#ff8a3d', PURPLE = '#7a5cf0', GREEN = '#2fbf5f', PINK = '#ff5c9a', ICE = '#38b6e8', GOLD = '#d8a020';
const ICY = { top: '#effbff', bot: '#5ec8f0' };

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

// ================================================================ kitchen
const AFF_YAW = Math.atan2(GLASS_AT.x - AFF_POS.x, GLASS_AT.z - AFF_POS.z);
const YAW_CAM = Math.atan2(0.4, 1);
const DROP = 4.5; // the ice cube leaves Affan's hand
const affHead = () => kit.aff.parts.head.getWorldPosition(V());
const mamaHead = () => kit.mama.parts.head.getWorldPosition(V());
const affFace = (yaw, d) => affHead().add(V(Math.sin(yaw) * d, 0.12, Math.cos(yaw) * d));
function mamaSet(t, p = {}) {
  const m = kit.mama;
  m.root.position.copy(MAMA_POS);
  const base = { yaw: 0, lean: 0.18, blink: blinkAt(t, 5), smile: 1, brow: 0.2, ...p };
  m.pose(base);
  m.root.updateMatrixWorld(true);
  const c = JUG_AT.clone().add(V(0, 0.3, 0));
  m.pose({ ...base, armR: { reach: m.toTorso(c.clone().add(V(-0.21, 0, 0.02))), pole: [-1, -0.6, -0.4] }, armL: { reach: m.toTorso(c.clone().add(V(0.24, -0.02, 0.02))), pole: [1, -0.6, -0.4] } });
  m.root.updateMatrixWorld(true);
}
// ice in the glass: n cubes floating (bobbing), plus the one Affan drops at DROP
function iceSet(t, n = 3) {
  const top = kit.glass.top();
  kit.floats.forEach((c, i) => {
    const show = i < n;
    c.visible = show;
    const bob = 0.008 * Math.sin(t * 2.3 + c.userData.ph);
    c.position.set(c.userData.off.x, top - 0.02 + bob, c.userData.off.z);
    c.rotation.set(0.2 * Math.sin(t * 0.9 + i), t * 0.2 + i, 0.15 * Math.cos(t * 1.1 + i));
  });
}
function affSet(t, p = {}) {
  const a = kit.aff;
  a.root.position.copy(AFF_POS);
  a.pose({ yaw: AFF_YAW, blink: blinkAt(t, 1), talk: talk(t), smile: 0.9, ...p });
  a.root.updateMatrixWorld(true);
}
// Affan picks a cube from the bowl and holds it over the glass; it drops at DROP
function dropIce(t) {
  const a = kit.aff;
  const k1 = sm(3.26, 3.9, t), k2 = sm(3.9, 4.35, t);
  const bowl = ICEBOWL_AT.clone().add(V(0, 0.2, 0.05));
  const over = GLASS_AT.clone().add(V(0.02, 0.75, 0.05));
  const rest = a.root.localToWorld(V(-0.6, 1.0, 0.6));
  const target = t < 3.9 ? rest.clone().lerp(bowl, k1) : bowl.clone().lerp(over, k2);
  const arm = t < DROP + 0.3 ? { armR: { reach: a.toTorso(target), pole: [-1, -0.6, -0.3] } } : {};
  affSet(t, { ...arm, headPitch: 0.15 });
  const held = kit.held;
  const glassTop = GLASS_AT.y + kit.glass.top();
  if (t < 3.6) held.visible = false;
  else if (t < DROP) {
    held.visible = true;
    held.position.copy(a.parts.arms.R.hand.getWorldPosition(V())).add(V(0, -0.06, 0.04));
  } else {
    const u = t - DROP;
    held.visible = true;
    const y = Math.max(glassTop - 0.03 + 0.01 * Math.sin(u * 8) * Math.exp(-u * 3), over.y - 0.06 - 4.9 * u * u);
    held.position.set(GLASS_AT.x - 0.04, y, GLASS_AT.z + 0.04);
    held.rotation.set(u * 2, u, 0);
  }
  // splash
  const u = t - (DROP + 0.27);
  kit.splash.forEach((d, i) => {
    d.visible = u > 0 && u < 0.5;
    if (!d.visible) return;
    const ang = i * 1.05;
    d.position.set(GLASS_AT.x + Math.cos(ang) * 0.25 * u, glassTop + 1.4 * u - 5 * u * u, GLASS_AT.z + Math.sin(ang) * 0.25 * u);
  });
}
// drinking: the right hand lifts the glass to the mouth (k 0..1)
function drink(t, k, yaw) {
  const a = kit.aff;
  const g = kit.glass.g;
  const mouth = affFace(yaw, 0.55).add(V(0, -0.42, 0));
  const hand = GLASS_AT.clone().add(V(0, 0.22, 0.05)).lerp(mouth, k);
  g.position.copy(GLASS_AT).lerp(mouth.clone().add(V(0, -0.24, -0.02)), k);
  g.rotation.set(-0.5 * k, 0, 0);
  return { armR: { reach: a.toTorso(hand), pole: [-1, -0.6, -0.3] } };
}
function kitReset() {
  kit.glass.g.position.copy(GLASS_AT);
  kit.glass.g.rotation.set(0, 0, 0);
  kit.held.visible = false;
  kit.splash.forEach((d) => (d.visible = false));
}

// ==================================================================== lab
// freeze 0..1 moves molecules from the packed liquid spots to the honeycomb
function molSet(t, { freeze = 0, bonds = 0, holes = 0 } = {}) {
  const jig = 1 - freeze;
  lab.mols.forEach((m, i) => {
    const u = m.userData;
    const f = easeInOut(clamp(freeze * 1.25 - (i % 6) * 0.04));
    const p = u.liq.clone().lerp(u.ice, f);
    p.x += jig * 0.16 * Math.sin(t * 5.3 + u.seed) + (1 - jig) * 0.02 * Math.sin(t * 9 + u.seed);
    p.y += jig * 0.16 * Math.cos(t * 4.7 + u.seed * 1.3) + (1 - jig) * 0.02 * Math.cos(t * 8 + u.seed);
    m.position.copy(p);
    m.rotation.set(0.3 * jig * Math.sin(t * 3 + u.seed), 0.4 * jig * Math.cos(t * 2.5 + u.seed), u.rot * jig + (1 - jig) * (i % 2 ? 0 : Math.PI) + t * 2.2 * jig);
  });
  lab.bonds.forEach((b) => {
    b.visible = bonds > 0.02;
    b.scale.set(1, Math.max(0.01, bonds), 1);
  });
  lab.holes.forEach((h, i) => (h.material.opacity = 0.55 * holes * (0.75 + 0.25 * Math.sin(t * 4 + i))));
  lab.frost.material.opacity = 0.55 * freeze;
  lab.snow.forEach((f) => {
    f.material.opacity = 0.9 * freeze;
    f.position.y = 7 - ((t * 0.8 + f.userData.seed) % 7);
    f.rotation.y = t + f.userData.seed;
  });
}
function balSet(t, tip = 0) {
  lab.bal.visible = true;
  lab.tank.visible = false;
  const ang = 0.28 * tip;
  lab.beam.rotation.z = ang; // positive: the left (water) side goes down
  lab.pans.forEach((p) => (p.hang.rotation.z = -ang));
}
function tankSet(t) {
  lab.bal.visible = false;
  lab.tank.visible = true;
  lab.tankIce.position.y = 1.82 - 0.45 + 0.09 + 0.04 * Math.sin(t * 2);
  lab.tankIce.rotation.set(0.05 * Math.sin(t * 1.3), t * 0.3, 0.05 * Math.cos(t * 1.1));
}
function lakeSet(t, grow = 1) {
  lab.iceLayer.scale.set(1, Math.max(0.03, grow), 1);
  lab.iceLayer.position.y = 3.6 - 0.35 * Math.max(0.03, grow);
  lab.fishes.forEach((f, i) => {
    const u = f.root.userData;
    const x = 3.2 * Math.sin(t * u.sp + u.ph);
    const dx = Math.cos(t * u.sp + u.ph);
    f.root.position.set(x, u.y + 0.1 * Math.sin(t * 2 + i), 1.0 - i * 0.25);
    f.root.rotation.y = dx >= 0 ? 0 : Math.PI;
    f.set(t + i, 1);
  });
  lab.lakeSnow.forEach((f) => {
    f.position.y = 4 + ((10 - ((t * 0.7 + f.userData.seed) % 6)) % 6);
    f.rotation.y = t + f.userData.seed;
  });
}
const C0 = lab.C0;

// ================================================================== SHOTS
const SHOTS = [
  // S1 — kitchen: a glass of pink sirap on the counter, Mama with the jug
  [0, 2.2, (t) => {
    kitReset();
    iceSet(t, 0);
    mamaSet(t);
    affSet(t, { talk: 0, headPitch: 0.1 });
    camMove(t, 0, 2.2, [1.4, 2.5, 5.4], [0.9, 1.6, -0.9], [1.25, 2.4, 4.8], [0.95, 1.6, -0.9], 50);
    const q = pop(t, 0.4, 2.15);
    ov.tag('ep', 'EPISOD 65', { x: W / 2, y: 268, o: q.o, s: q.s }, { bg: '#2f7bff', small: true });
    return kit;
  }],
  // S2 — "Papa! Affan masukkan ais dalam air sirap..."
  [2.2, 5.7, (t) => {
    kitReset();
    iceSet(t, t > DROP + 0.35 ? 1 : 0);
    mamaSet(t, { headYaw: 0.3 });
    dropIce(t);
    const g = GLASS_AT.clone().add(V(0, 0.35, 0));
    camMove(t, 2.2, 5.7, [0.55, 2.3, -2.9], [1.4, 1.55, -0.55], [0.75, 2.2, -2.5], [1.4, 1.6, -0.55], 50);
    const pp = pop(t, 2.22, 3.2, { from: 2 });
    ov.bubble('papa', 'PAPA!', { x: 800, y: 470, o: pp.o, s: pp.s * 0.8, r: 6 }, { size: 110 });
    pinTag('ais', 'AIS', scr(kit.held.position.clone().add(V(0, 0.1, 0))), t, 4.04, 5.68, { bg: ICE, pointer: 'down' }, -50);
    pinTag('sirap', 'AIR SIRAP', scr(GLASS_AT.clone().add(V(0.15, 0.2, 0))), t, 4.78, 5.68, { bg: PINK, pointer: 'left' }, 0);
    return kit;
  }],
  // S3 — "tapi ais tu terapung!" close on the glass
  [5.7, 7.44, (t) => {
    kitReset();
    iceSet(t, 3);
    mamaSet(t, { headYaw: 0.3 });
    affSet(t, { wow: keys(t, [[6.2, 0], [6.4, 0.9], [7.3, 0.9]]), headPitch: 0.2 });
    const g = GLASS_AT.clone().add(V(0, kit.glass.top(), 0));
    camMove(t, 5.7, 7.44, g.clone().add(V(-0.45, 0.4, 0.85)).toArray(), g.clone().add(V(0, -0.03, 0)).toArray(), g.clone().add(V(-0.36, 0.32, 0.7)).toArray(), g.clone().add(V(0, -0.03, 0)).toArray(), 46);
    bubble('apung', 'AIS TERAPUNG!', t, 6.32, 7.42, 430, 120, ICY);
    return kit;
  }],
  // S4 — "Kenapa ais tak tenggelam?"
  [7.44, 9.28, (t) => {
    kitReset();
    iceSet(t, 3);
    mamaSet(t, { headYaw: 0.3 });
    affSet(t, { yaw: YAW_CAM, ...POSES.thinkR, brow: -0.3, smile: 0.5 });
    const ah = affHead();
    lookCam(ah.clone().add(V(0.6, 0.05, 3.0)), ah.clone().add(V(0, -0.4, 0)), 46);
    const hd = scr(ah.clone().add(V(0, 0.5, 0)));
    qmarks(t, hd, 7.46, 9.26, [[7.5, -260, 80, '#ffcf33', -12], [7.8, 250, 40, '#3fa2ff', 10], [8.1, 280, 220, '#ffcf33', 14]]);
    bubble('kenapa', 'KENAPA AIS TAK\nTENGGELAM?', t, 7.5, 9.26, 430, 110, ICY);
    return kit;
  }],
  // S5 — "Jom ikut Affan cari jawapan!" then dive into the glass
  [9.28, 11.24, (t) => {
    kitReset();
    iceSet(t, 3);
    mamaSet(t, { headYaw: 0.3 });
    const up = keys(t, [[9.3, 0], [9.55, 1], [10.3, 1], [10.6, 0.5]], easeOut);
    affSet(t, { yaw: YAW_CAM, smile: 1, brow: 0.6, armR: { reach: [-0.6, lerp(0.3, 1.9 + 0.06 * Math.sin(t * 14), up), lerp(0.25, 0.35, up)], pole: [-1, -0.3, -0.5] } });
    const ah = affHead();
    const k = easeIn(inv(10.2, 11.24, t));
    const g = GLASS_AT.clone().add(V(0, kit.glass.top() - 0.05, 0));
    lookCam(ah.clone().add(V(0.6, 0.05, 3.0)).lerp(g.clone().add(V(0, 0.05, 0.25)), k), ah.clone().add(V(0, -0.4, 0)).lerp(g, k), 46);
    ov.swirl(t, W / 2, 820, inv(9.4, 11.1, t));
    ov.flash(inv(10.85, 11.24, t) ** 2, '230,248,255');
    return kit;
  }],
  // S6 — water is made of tiny particles; in water they move and squeeze close together
  [11.24, 18.58, (t) => {
    molSet(t);
    camMove(t, 11.24, 18.58, C0.clone().add(V(0.8, 0.6, 9.5)).toArray(), C0.toArray(), C0.clone().add(V(0.3, 0.3, 8.6)).toArray(), C0.toArray(), 50);
    ov.flash(1 - inv(11.24, 11.6, t));
    topTag('air', 'AIR (DIBESARKAN)', t, 11.3, 18.56, BLUE);
    pinTag('zarah', 'ZARAH SANGAT KECIL', scr(lab.mols[0].position.clone().add(V(0, 0.5, 0))), t, 12.48, 14.66, { bg: GOLD, pointer: 'down' }, -40);
    bubble('rapat', 'BERGERAK &\nBERHIMPIT RAPAT', t, 16.48, 18.56, 1180, 100, { top: '#eaf6ff', bot: '#4aa8ff' });
    return lab;
  }],
  // S7 — as ice they hold hands in a honeycomb, with empty space in the middle
  [18.58, 25.9, (t) => {
    const fr = sm(19.3, 21.0, t);
    molSet(t, { freeze: fr, bonds: sm(21.0, 21.6, t), holes: sm(24.3, 24.9, t) });
    camMove(t, 18.58, 22.6, C0.clone().add(V(0.3, 0.3, 8.6)).toArray(), C0.toArray(), C0.clone().add(V(0, -0.2, 13.8)).toArray(), C0.clone().add(V(0, 0.4, 0)).toArray(), 50);
    topTag('jadiais', 'AIR ➜ AIS ❄️', t, 18.64, 25.88, ICE);
    topTag('tangan', 'BERPEGANG TANGAN', t, 21.04, 22.9, PURPLE, 410);
    bubble('lebah', 'MACAM SARANG\nLEBAH!', t, 22.96, 24.36, 1180, 104, { top: '#fffbe6', bot: '#e8c84a' });
    bubble('kosong', 'ADA RUANG\nKOSONG!', t, 24.38, 25.88, 1180, 104, { top: '#eafff2', bot: '#2fbf8f' });
    return lab;
  }],
  // S8 — so ice is lighter than the same size of water
  [25.9, 29.33, (t) => {
    balSet(t, sm(26.3, 27.3, t) + 0.06 * Math.sin(t * 3) * sm(27.3, 27.8, t));
    camMove(t, 25.9, 29.33, SCALE_AT.clone().add(V(0, 2.2, 12.6)).toArray(), SCALE_AT.clone().add(V(0, 1.6, 0)).toArray(), SCALE_AT.clone().add(V(0, 2.1, 11.8)).toArray(), SCALE_AT.clone().add(V(0, 1.6, 0)).toArray(), 50);
    ov.flash(1 - inv(25.9, 26.2, t));
    pinTag('bAir', 'AIR', scr(lab.waterBlock.getWorldPosition(V()).add(V(0, 0.75, 0))), t, 26.0, 29.31, { bg: BLUE, pointer: 'down' }, -20);
    pinTag('bAis', 'AIS', scr(lab.iceBlock.getWorldPosition(V()).add(V(0, 0.75, 0))), t, 26.0, 29.31, { bg: ICE, pointer: 'down' }, -20);
    topTag('ringan', 'AIS LEBIH RINGAN', t, 27.24, 29.31, GREEN);
    bubble('sama', 'SAMA BESAR!', t, 28.7, 29.31, 1180, 104, { top: '#fffbe6', bot: '#e8c84a' });
    return lab;
  }],
  // S9 — "Sebab tu ais terapung!" an ice cube floating in a tank
  [29.33, 31.82, (t) => {
    tankSet(t);
    lookCam(SCALE_AT.clone().add(V(0.3, 2.3, 6.4)), SCALE_AT.clone().add(V(0, 1.3, 0)), 50);
    ov.flash(1 - inv(29.33, 29.6, t));
    bubble('sebab', 'SEBAB TU AIS\nTERAPUNG!', t, 29.38, 31.8, 430, 110, ICY);
    return lab;
  }],
  // S10 — a frozen lake: ice only on top, fish still swimming below
  [31.82, 40.16, (t) => {
    lakeSet(t, 0.05 + 0.95 * sm(34.4, 35.8, t));
    camMove(t, 31.82, 40.16, LAKE_AT.clone().add(V(0, 3.4, 13.0)).toArray(), LAKE_AT.clone().add(V(0, 2.3, 0)).toArray(), LAKE_AT.clone().add(V(0.4, 3.0, 11.6)).toArray(), LAKE_AT.clone().add(V(0, 2.2, 0)).toArray(), 50);
    ov.flash(1 - inv(31.82, 32.15, t));
    topTag('tahu', 'TAHU TAK?', t, 31.88, 34.3, ORANGE);
    topTag('beku', 'TASIK MEMBEKU', t, 34.36, 35.9, ICE);
    pinTag('atas', 'AIS HANYA DI ATAS', scr(LAKE_AT.clone().add(V(0, 3.9, 1.5))), t, 35.96, 40.14, { bg: ICE, pointer: 'down' }, -20);
    bubble('ikan', 'IKAN MASIH BOLEH\nBERENANG!', t, 37.52, 40.14, 1180, 100, { top: '#fff3e6', bot: '#ff9a40' });
    return lab;
  }],
  // S11 — "Waaah, rupanya ruang kosong..." then "Lepas main panas, minum air sejuk, ya."
  [40.16, 47.5, (t) => {
    kitReset();
    iceSet(t, 3);
    mamaSet(t, { headYaw: 0.35, headRoll: 0.05 * Math.sin(t * 2) });
    const dk = keys(t, [[44.9, 0], [45.5, 1], [46.6, 1], [47.2, 0]]);
    const yaw = YAW_CAM;
    affSet(t, { yaw, wow: keys(t, [[40.16, 0], [40.3, 1], [40.8, 1], [41.0, 0]]), smile: 1, brow: 0.6, talk: dk > 0.8 ? 0 : talk(t), ...(dk > 0 ? drink(t, dk, yaw) : {}) });
    const ah = affHead();
    lookCam(ah.clone().add(V(0.6, 0.05, 3.0)), ah.clone().add(V(0, -0.4, 0)), 46);
    const hd = scr(ah.clone().add(V(0, 0.5, 0)));
    const b = pop(t, 40.25, 44.8);
    ov.html('bulb', ICONS.bulb(), { x: clamp(hd.x + 230, 150, 900), y: clamp(hd.y - 150, 300, 900) + Math.sin(t * 5) * 8, o: b.o, s: b.s * 0.6, r: 10 });
    ov.sparkles(t, { n: 30, seed: 12, y: 250, h: 900, a: inv(40.25, 40.55, t) * (1 - inv(44.3, 44.8, t)) });
    bubble('ruang', 'RUANG KOSONG BUAT\nAIS TERAPUNG!', t, 41.14, 44.82, 430, 96, ICY);
    bubble('minum', 'MINUM AIR\nSEJUK, YA!', t, 44.88, 47.48, 430, 110, { top: '#fff0f6', bot: '#ff7ab0' });
    return kit;
  }],
  // S12 — "Apa lagi kita nak belajar lepas ni?"
  [47.5, OUTRO, (t) => {
    kitReset();
    iceSet(t, 3);
    mamaSet(t, { headYaw: 0.35 });
    const tk = keys(t, [[47.52, 0], [47.9, 1]]);
    const th2 = POSES.thinkR.armR;
    affSet(t, { yaw: YAW_CAM, smile: 1, brow: 0.3 + 0.4 * tk, headRoll: -0.12 * tk, lookX: 0.35 * tk, lookY: 0.4 * tk, headPitch: -0.08 * tk, armR: { reach: mix3([-0.55, 0.3, 0.2], th2.reach, tk), pole: th2.pole, point: tk, wx: th2.wx * tk } });
    const ah = affHead();
    lookCam(ah.clone().add(V(0.6, 0.05, 3.0)), ah.clone().add(V(0, -0.4, 0)), 46);
    const hd = scr(ah.clone().add(V(0, 0.5, 0)));
    qmarks(t, hd, 47.5, OUTRO - 0.05, [[47.55, -260, -100, '#ffcf33', -12], [47.85, 250, -160, '#3fa2ff', 10], [48.15, 300, 60, '#ffcf33', 14]]);
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

// Cover / thumbnail (9:16): the honeycomb of ice with its empty spaces glowing.
function thumbnail() {
  ov.begin();
  cam.aspect = W / H;
  cam.updateProjectionMatrix();
  molSet(25.0, { freeze: 1, bonds: 1, holes: 1 });
  lookCam(C0.clone().add(V(0, -0.6, 11.5)), C0.clone().add(V(0, 0.3, 0)), 50);
  lab.sky.position.copy(cam.position);
  renderer.setViewport(0, 0, W, H);
  renderer.render(lab.scene, cam);
  ov.vignette(0.3);
  ov.tag('thBadge', 'EPISOD 65', { x: W / 2, y: 300 }, { bg: '#2f7bff', small: true });
  ov.bubble('thTitle', 'AIS', { x: W / 2, y: 445, r: -3 }, { size: 150, ...ICY });
  ov.bubble('thTitle2', 'TERAPUNG?!', { x: W / 2, y: 610, r: 2 }, { size: 140, top: '#eafff2', bot: '#2fbf8f' });
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
