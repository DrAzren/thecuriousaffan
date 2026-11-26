// THE CURIOUS AFFAN — Episode 068: "Kenapa Epal Jadi Perang?"
// Every shot is a pure function of time t (seconds), synced to audio/narration.mp3.
import * as THREE from 'three';
import { makeRenderer, loadEnvelope, toScreen, clamp, lerp, inv, easeOut, easeIn, easeInOut, keys, W, H } from '../../shared/core.js';
import { POSES, blinkAt } from '../../shared/affan.js';
import { Overlay, pop, ICONS, drawLogo } from '../../shared/overlay.js';
import { CAPTIONS, KEYWORDS } from './captions.js';
import { buildKitchen68, buildCellLab, buildOutro, ISLAND_TOP, BOARD, AFF_POS, MAMA_POS, PLATE_AT, FLESH, BROWN } from './worlds.js';

const FPS = 30;
const DURATION = 51.15;
const OUTRO = 48.0;

const stage = document.getElementById('stage');
const canvas = document.createElement('canvas');
stage.appendChild(canvas);
const renderer = makeRenderer(canvas);
const ov = new Overlay(stage);
const kit = buildKitchen68();
const lab = buildCellLab();
const outro = buildOutro();
const cam = new THREE.PerspectiveCamera(50, W / H, 0.02, 6000);
let env = { at: () => 0 };

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const talk = (t) => clamp(env.at(t) * 1.2);
const scr = (p) => toScreen(p, cam);
const mix3 = (a, b, k) => a.map((v, i) => lerp(v, b[i], k));
const sm = (a, b, t) => easeInOut(inv(a, b, t));
const BLUE = '#2f9bff', ORANGE = '#ff8a3d', PURPLE = '#7a5cf0', GREEN = '#2fbf5f', PINK = '#ff5c9a', RED = '#e0302a', GOLD = '#d8a020', BRN = '#a8682a';
const APPLE = { top: '#fff0ec', bot: '#ff6b5a' };
const BROWNY = { top: '#fff4e6', bot: '#c8864a' };

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
const AFF_YAW = Math.atan2(PLATE_AT.x - AFF_POS.x, PLATE_AT.z - AFF_POS.z);
const YAW_CAM = Math.atan2(0.4, 1);
const CUT = 4.0;
const affHead = () => kit.aff.parts.head.getWorldPosition(V());
const mamaHead = () => kit.mama.parts.head.getWorldPosition(V());
const affFace = (yaw, d) => affHead().add(V(Math.sin(yaw) * d, 0.12, Math.cos(yaw) * d));
const brownAt = (k) => FLESH.clone().lerp(BROWN, clamp(k));
// Mama: chop (knife up/down at the apple), lime (squeeze over the board slices)
function mamaSet(t, { chop = 0, cut = 1, lime = 0, p = {} } = {}) {
  const m = kit.mama;
  m.root.position.copy(MAMA_POS);
  const base = { yaw: 0, lean: 0.2, blink: blinkAt(t, 5), smile: 1, brow: 0.2, ...p };
  m.pose(base);
  m.root.updateMatrixWorld(true);
  const up = 0.14 * Math.max(0, Math.sin((t - CUT) * 4 + Math.PI / 2)) * chop;
  const kT = V(BOARD.x - 0.42 + 0.25 * (1 - cut), ISLAND_TOP + 0.26 + up, BOARD.z + 0.05);
  const hold = V(BOARD.x + 0.05, ISLAND_TOP + 0.2, BOARD.z + 0.08);
  const limeAt = V(BOARD.x + 0.25, ISLAND_TOP + 0.45, BOARD.z + 0.15);
  const armR = lime > 0 ? { reach: m.toTorso(limeAt), pole: [-1, -0.6, -0.4] } : { reach: m.toTorso(kT), pole: [-1, -0.6, -0.4] };
  m.pose({ ...base, armR, armL: { reach: m.toTorso(hold), pole: [1, -0.6, -0.4] } });
  m.root.updateMatrixWorld(true);
  const hand = m.parts.arms.R.hand.getWorldPosition(V());
  kit.knife.visible = lime <= 0;
  kit.knife.position.copy(hand);
  kit.knife.rotation.set(0, -0.35, -0.25 - 0.3 * (up / 0.14));
  kit.shine.material.opacity = 0;
  kit.lime.visible = lime > 0;
  if (lime > 0) kit.lime.position.copy(hand).add(V(0, -0.08, 0.05));
}
// the apple: whole before the cut, two halves after (open 0..1), browning faces
function appleSet(t, brown = 0) {
  const done = t >= CUT;
  kit.apple.visible = !done;
  kit.halves.forEach((h, i) => {
    h.visible = done;
    const sd = i ? 1 : -1;
    const o = easeOut(clamp((t - CUT) / 0.4));
    h.position.set(BOARD.x - 0.15 + sd * (0.02 + 0.08 * o), ISLAND_TOP + 0.07 + 0.165, BOARD.z + 0.02);
    h.rotation.z = sd * 0.15 * o;
    h.userData.face.material.color.copy(brownAt(brown));
  });
}
function plateSet(k) {
  kit.slices.forEach((s, i) => s.userData.flesh.color.copy(brownAt(k * (0.85 + 0.15 * (i % 2)))));
}
function boardSlices(on, plainK, limeK) {
  kit.boardSlices.forEach((s, i) => {
    s.visible = on;
    s.userData.flesh.color.copy(brownAt(i < 2 ? plainK : limeK));
  });
}
function juiceSet(t, on) {
  kit.juice.forEach((d, i) => {
    const ph = (t * 1.6 + i / kit.juice.length) % 1;
    d.visible = on;
    if (!on) return;
    const from = kit.lime.position;
    d.position.set(from.x + 0.03 * Math.sin(i * 2), from.y - ph * 0.35, from.z + 0.02 * Math.cos(i * 3));
  });
}
function affSet(t, p = {}) {
  const a = kit.aff;
  a.root.position.copy(AFF_POS);
  a.pose({ yaw: AFF_YAW, blink: blinkAt(t, 1), talk: talk(t), smile: 0.9, ...p });
  a.root.updateMatrixWorld(true);
}
function eat(t, e, yaw) {
  const a = kit.aff;
  const from = PLATE_AT.clone().add(V(-0.05, 0.18, 0.08));
  const mouth = affFace(yaw, 0.6).add(V(0, -0.3, 0));
  return { armR: { reach: a.toTorso(from.lerp(mouth, e)), pole: [-1, -0.6, -0.3] } };
}
function snackFollow(e) {
  kit.snack.visible = e > 0.05 && e < 0.97;
  if (kit.snack.visible) {
    kit.snack.position.copy(kit.aff.parts.arms.R.hand.getWorldPosition(V())).add(V(0, 0.04, 0.04));
    kit.snack.rotation.set(-0.6, 0.3, 0);
  }
}
function kitReset() {
  kit.snack.visible = false;
  kit.lime.visible = false;
  kit.juice.forEach((d) => (d.visible = false));
  boardSlices(false, 0, 0);
}

// ==================================================================== lab
const cutX = lab.x0 + 1.5 * lab.CW;
const midY = (lab.ROWS * lab.CH) / 2;
// cut (0..1 knife through), open (0..1 cut cells break), meet (0..1 oxygen to enzymes), brown (0..1)
function labSet(t, { cut = 0, open = 0, meet = 0, brown = 0, oxy = 0 } = {}) {
  lab.knife.visible = cut > 0 && cut < 1.05;
  lab.knife.position.set(cutX, lerp(lab.ROWS * lab.CH + 3.5, -1.0, easeInOut(clamp(cut))), 0.1);
  lab.cells.forEach((c, i) => {
    const o = c.cut ? open : 0;
    c.wall.material.opacity = 0.9 * (1 - 0.75 * o);
    c.wall.scale.set(1 + 0.08 * o, 1 - 0.06 * o, 1);
    c.g.position.x = lab.x0 + c.c * lab.CW + (c.cut ? (c.c === 1 ? -1 : 1) * 0.2 * o : 0);
    const e = c.enz;
    const bob = 0.05 * Math.sin(t * 3 + c.seed);
    e.position.set(c.home.x, c.home.y + bob, c.home.z + 0.35 * o);
    e.rotation.z = 0.15 * Math.sin(t * 2 + c.seed);
    c.inside.material.color.copy(c.cut ? brownAt(brown * 0.8) : FLESH);
    c.brown.material.opacity = c.cut ? 0.9 * brown : 0;
    c.brown.scale.set(0.5 + 0.5 * brown, 0.4 + 0.4 * brown, 1);
  });
  // oxygen pairs drift down to the cut cells' enzymes
  const targets = lab.cells.filter((c) => c.cut);
  lab.oxy.forEach((g, i) => {
    g.visible = oxy > 0.01;
    const c = targets[i % targets.length];
    const end = c.g.localToWorld(c.enz.position.clone()).add(V(0.25, 0.15, 0.3));
    const start = V(cutX + (i % 2 ? 1 : -1) * (0.5 + (i % 5) * 0.3), lab.ROWS * lab.CH + 1.5 + (i % 3) * 0.5, 0.9);
    const k = easeInOut(clamp(meet * 1.3 - (i / lab.oxy.length) * 0.3));
    const p = start.clone().lerp(end, k);
    p.x += (1 - k) * 0.3 * Math.sin(t * 2 + g.userData.seed);
    g.position.copy(p);
    g.rotation.z = t * 1.5 + g.userData.seed;
    g.scale.setScalar(oxy);
  });
}

// ================================================================== SHOTS
const SHOTS = [
  // S1 — kitchen: Mama about to cut an apple, Affan watches
  [0, 2.18, (t) => {
    kitReset();
    mamaSet(t, { chop: 0, cut: 0 });
    appleSet(0);
    plateSet(0);
    affSet(t, { talk: 0, headPitch: 0.1 });
    camMove(t, 0, 2.18, [1.2, 2.6, 5.6], [0.6, 1.75, -1.0], [1.05, 2.5, 5.0], [0.6, 1.75, -1.0], 50);
    const q = pop(t, 0.4, 2.15);
    ov.tag('ep', 'EPISOD 68', { x: W / 2, y: 268, o: q.o, s: q.s }, { bg: '#2f7bff', small: true });
    return kit;
  }],
  // S2 — "Papa! Mama potong epal untuk Affan..."
  [2.18, 5.12, (t) => {
    kitReset();
    mamaSet(t, { chop: t < CUT + 0.4 ? sm(3.2, 3.5, t) : 0, cut: sm(3.3, CUT, t) });
    appleSet(t, 0);
    plateSet(0);
    affSet(t, { yaw: YAW_CAM * 0.4 });
    const mh = mamaHead();
    camMove(t, 2.18, 5.12, mh.clone().add(V(1.2, -0.2, 3.6)).toArray(), mh.clone().add(V(0.05, -0.55, 0)).toArray(), mh.clone().add(V(1.0, -0.25, 3.2)).toArray(), mh.clone().add(V(0.05, -0.6, 0)).toArray(), 46);
    const pp = pop(t, 2.2, 3.1, { from: 2 });
    ov.bubble('papa', 'PAPA!', { x: 800, y: 470, o: pp.o, s: pp.s * 0.8, r: 6 }, { size: 110 });
    pinTag('mama', 'MAMA', scr(mh.clone().add(V(0, 0.6, 0))), t, 3.22, 5.1, { bg: PINK, pointer: 'down' }, -40);
    pinTag('epal', 'EPAL', scr(V(BOARD.x - 0.15, ISLAND_TOP + 0.4, BOARD.z)), t, 3.8, 5.1, { bg: RED, pointer: 'down' }, -40);
    return kit;
  }],
  // S3 — "tapi sekejap je, epal tu jadi perang!" close on the plate
  [5.12, 8.18, (t) => {
    kitReset();
    mamaSet(t, { cut: 1 });
    appleSet(t, sm(5.4, 7.8, t) * 0.8);
    plateSet(sm(5.4, 7.6, t));
    affSet(t, { wow: keys(t, [[6.9, 0], [7.1, 0.9], [8.1, 0.9]]) });
    const p = PLATE_AT.clone().add(V(0, 0.08, 0));
    camMove(t, 5.12, 8.18, p.clone().add(V(-0.3, 0.75, 1.0)).toArray(), p.toArray(), p.clone().add(V(-0.2, 0.6, 0.8)).toArray(), p.toArray(), 46);
    topTag('sekejap', 'SEKEJAP JE... ⏱️', t, 5.18, 7.1, PURPLE);
    bubble('perang', 'JADI PERANG!', t, 7.16, 8.16, 430, 120, BROWNY);
    return kit;
  }],
  // S4 — "Epal ni dah busuk ke?"
  [8.18, 10.16, (t) => {
    kitReset();
    mamaSet(t, { cut: 1 });
    appleSet(t, 0.8);
    plateSet(1);
    affSet(t, { yaw: YAW_CAM, ...POSES.thinkR, brow: -0.3, smile: 0.4 });
    const ah = affHead();
    lookCam(ah.clone().add(V(0.6, 0.05, 3.0)), ah.clone().add(V(0, -0.4, 0)), 46);
    const hd = scr(ah.clone().add(V(0, 0.5, 0)));
    qmarks(t, hd, 8.2, 10.14, [[8.25, -260, 80, '#ffcf33', -12], [8.55, 250, 40, '#3fa2ff', 10], [8.85, 280, 220, '#ffcf33', 14]]);
    bubble('busuk', 'EPAL NI DAH\nBUSUK KE?', t, 8.24, 10.14, 430, 110, BROWNY);
    return kit;
  }],
  // S5 — "Jom ikut Affan cari jawapan!" then into a slice
  [10.16, 12.14, (t) => {
    kitReset();
    mamaSet(t, { cut: 1 });
    appleSet(t, 0.8);
    plateSet(1);
    const up = keys(t, [[10.18, 0], [10.45, 1], [11.2, 1], [11.5, 0.5]], easeOut);
    affSet(t, { yaw: YAW_CAM, smile: 1, brow: 0.6, armR: { reach: [-0.6, lerp(0.3, 1.9 + 0.06 * Math.sin(t * 14), up), lerp(0.25, 0.35, up)], pole: [-1, -0.3, -0.5] } });
    const ah = affHead();
    const k = easeIn(inv(11.1, 12.14, t));
    const p = PLATE_AT.clone().add(V(0, 0.08, 0));
    lookCam(ah.clone().add(V(0.6, 0.05, 3.0)).lerp(p.clone().add(V(0, 0.12, 0.18)), k), ah.clone().add(V(0, -0.4, 0)).lerp(p, k), 46);
    ov.swirl(t, W / 2, 820, inv(10.3, 12.0, t));
    ov.flash(inv(11.75, 12.14, t) ** 2, '255,246,236');
    return kit;
  }],
  // S6 — apples are made of little cells; inside each a little helper, the enzyme
  [12.14, 18.8, (t) => {
    labSet(t);
    camMove(t, 12.14, 18.8, [0, midY + 0.6, 15.5], [0, midY, 0], [0, midY + 0.4, 13.8], [0, midY, 0], 50);
    ov.flash(1 - inv(12.14, 12.5, t));
    topTag('dalam', 'DALAM EPAL (DIBESARKAN)', t, 12.2, 18.78, RED);
    bubble('sel', 'SEL-SEL KECIL', t, 13.72, 16.1, 1180, 110, APPLE);
    const c = lab.cells[17];
    pinTag('enzim', 'PENOLONG KECIL: ENZIM', scr(c.g.localToWorld(c.enz.position.clone()).add(V(0, 0.25, 0))), t, 16.34, 18.78, { bg: PURPLE, pointer: 'down' }, -40);
    return lab;
  }],
  // S7 — cut: the cells break; the enzymes meet the air, oxygen
  [18.8, 25.06, (t) => {
    labSet(t, { cut: inv(19.2, 20.4, t), open: sm(20.2, 21.2, t), meet: sm(22.6, 25.0, t) * 0.75, oxy: sm(22.3, 22.8, t) });
    lookCam(V(0, midY + 0.4, 13.8), V(0, midY, 0), 50);
    topTag('potong', 'BILA EPAL DIPOTONG...', t, 18.86, 20.7, ORANGE);
    bubble('pecah', 'SEL-SEL\nPECAH!', t, 20.72, 22.4, 1180, 110, APPLE);
    topTag('udara', 'ENZIM BERTEMU UDARA', t, 22.54, 25.04, BLUE);
    pinTag('oksigen', 'OKSIGEN', scr(lab.oxy[0].position.clone().add(V(0, 0.4, 0))), t, 24.02, 25.04, { bg: BLUE, pointer: 'down' }, -30);
    return lab;
  }],
  // S8 — enzyme + oxygen make brown; the apple isn't rotten, still good to eat
  [25.06, 32.32, (t) => {
    labSet(t, { cut: 2, open: 1, meet: 0.75 + 0.25 * sm(25.2, 26.6, t), oxy: 1 - 0.3 * sm(28.2, 29, t), brown: sm(26.6, 28.6, t) });
    camMove(t, 25.06, 32.32, [0, midY + 0.4, 13.8], [0, midY, 0], [0.2, midY + 0.2, 12.6], [0, midY - 0.2, 0], 50);
    topTag('tambah', 'ENZIM + OKSIGEN', t, 25.12, 28.3, PURPLE);
    bubble('perangL', 'WARNA\nPERANG!', t, 28.32, 28.74, 1180, 120, BROWNY);
    bubble('makan', 'TAK BUSUK!\nMASIH BOLEH DIMAKAN', t, 28.76, 32.3, 1180, 98, { top: '#eafff2', bot: '#2fbf8f' });
    return lab;
  }],
  // S9 — "Tahu tak? perah air limau... jadi perang lebih lambat. Mama selalu buat macam tu!"
  [32.32, 39.94, (t) => {
    kitReset();
    const lime = keys(t, [[33.6, 0], [33.9, 1], [35.6, 1], [35.9, 0]]);
    mamaSet(t, { cut: 1, lime, p: { headPitch: 0.25 * (t < 37.8 ? 1 : 0), headYaw: t > 37.8 ? 0.3 : 0 } });
    appleSet(t, 0.8);
    kit.halves.forEach((h) => (h.visible = false));
    plateSet(1);
    affSet(t, { yaw: YAW_CAM * 0.4 });
    boardSlices(true, sm(35.6, 37.6, t) * 0.95, sm(35.6, 37.6, t) * 0.15);
    juiceSet(t, lime > 0.8);
    const b = V(BOARD.x, ISLAND_TOP + 0.1, BOARD.z + 0.12);
    if (t < 37.9) camMove(t, 32.32, 37.9, b.clone().add(V(0.15, 1.05, 1.6)).toArray(), b.clone().add(V(0, 0.1, 0)).toArray(), b.clone().add(V(0.1, 0.95, 1.4)).toArray(), b.clone().add(V(0, 0.1, 0)).toArray(), 50);
    else {
      const mh = mamaHead();
      lookCam(mh.clone().add(V(1.0, -0.25, 3.4)), mh.clone().add(V(0.05, -0.6, 0)), 46);
    }
    ov.flash(1 - inv(32.32, 32.6, t));
    topTag('tahu', 'TAHU TAK?', t, 32.38, 33.86, ORANGE);
    pinTag('limau', 'AIR LIMAU', scr(kit.lime.position.clone().add(V(0, 0.08, 0))), t, 34.46, 35.8, { bg: '#7ab828', pointer: 'down' }, -40);
    if (t < 37.9) {
      pinTag('tanpa', 'TANPA LIMAU', scr(kit.boardSlices[0].position.clone().add(V(0.1, 0.12, 0))), t, 36.0, 37.88, { bg: BRN, pointer: 'down' }, -30);
      pinTag('dengan', 'DENGAN LIMAU', scr(kit.boardSlices[3].position.clone().add(V(-0.05, 0.12, 0))), t, 36.0, 37.88, { bg: GREEN, pointer: 'down' }, -30);
    }
    bubble('lambat', 'PERANG LEBIH\nLAMBAT!', t, 36.66, 37.88, 430, 110, { top: '#f6ffe0', bot: '#8acb3a' });
    bubble('mamaBuat', 'MAMA SELALU\nBUAT MACAM TU!', t, 38.06, 39.92, 430, 104, { top: '#fff0f6', bot: '#ff7ab0' });
    return kit;
  }],
  // S10 — "Waaah, rupanya oksigen... Makan buah setiap hari, ya."
  [39.94, 45.62, (t) => {
    kitReset();
    mamaSet(t, { cut: 1, p: { headYaw: 0.35 } });
    appleSet(t, 0.8);
    plateSet(1);
    const e = keys(t, [[41.0, 0], [41.6, 1], [42.3, 1], [42.7, 0], [43.9, 0], [44.5, 1], [45.2, 1], [45.6, 0]]);
    affSet(t, { yaw: YAW_CAM, wow: keys(t, [[39.94, 0], [40.1, 1], [40.6, 1], [40.8, 0]]), smile: 1, brow: 0.6, talk: e > 0.8 ? 0 : talk(t), ...eat(t, e, YAW_CAM) });
    snackFollow(e);
    const ah = affHead();
    lookCam(ah.clone().add(V(0.6, 0.05, 3.0)), ah.clone().add(V(0, -0.4, 0)), 46);
    const hd = scr(ah.clone().add(V(0, 0.5, 0)));
    const b = pop(t, 40.0, 43.8);
    ov.html('bulb', ICONS.bulb(), { x: clamp(hd.x + 230, 150, 900), y: clamp(hd.y - 150, 300, 900) + Math.sin(t * 5) * 8, o: b.o, s: b.s * 0.6, r: 10 });
    ov.sparkles(t, { n: 30, seed: 12, y: 250, h: 900, a: inv(40.0, 40.3, t) * (1 - inv(43.3, 43.8, t)) });
    bubble('oks', 'OKSIGEN BUAT\nEPAL PERANG!', t, 40.84, 43.86, 430, 104, BROWNY);
    bubble('buah', 'MAKAN BUAH\nSETIAP HARI!', t, 43.92, 45.6, 430, 110, APPLE);
    return kit;
  }],
  // S11 — "Apa lagi kita nak belajar lepas ni?"
  [45.62, OUTRO, (t) => {
    kitReset();
    mamaSet(t, { cut: 1, p: { headYaw: 0.35 } });
    appleSet(t, 0.8);
    plateSet(1);
    const tk = keys(t, [[45.64, 0], [46.0, 1]]);
    const th2 = POSES.thinkR.armR;
    affSet(t, { yaw: YAW_CAM, smile: 1, brow: 0.3 + 0.4 * tk, headRoll: -0.12 * tk, lookX: 0.35 * tk, lookY: 0.4 * tk, headPitch: -0.08 * tk, armR: { reach: mix3([-0.55, 0.3, 0.2], th2.reach, tk), pole: th2.pole, point: tk, wx: th2.wx * tk } });
    const ah = affHead();
    lookCam(ah.clone().add(V(0.6, 0.05, 3.0)), ah.clone().add(V(0, -0.4, 0)), 46);
    const hd = scr(ah.clone().add(V(0, 0.5, 0)));
    qmarks(t, hd, 45.62, OUTRO - 0.05, [[45.67, -260, -100, '#ffcf33', -12], [45.97, 250, -160, '#3fa2ff', 10], [46.27, 300, 60, '#ffcf33', 14]]);
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

// Cover / thumbnail (9:16): the cut apple cells turning brown with oxygen around.
function thumbnail() {
  ov.begin();
  cam.aspect = W / H;
  cam.updateProjectionMatrix();
  labSet(27.5, { cut: 2, open: 1, meet: 0.85, oxy: 1, brown: 0.7 });
  lookCam(V(0.2, midY - 0.4, 12.4), V(0, midY - 0.4, 0), 50);
  lab.sky.position.copy(cam.position);
  renderer.setViewport(0, 0, W, H);
  renderer.render(lab.scene, cam);
  ov.vignette(0.3);
  ov.tag('thBadge', 'EPISOD 68', { x: W / 2, y: 300 }, { bg: '#2f7bff', small: true });
  ov.bubble('thTitle', 'EPAL JADI', { x: W / 2, y: 445, r: -3 }, { size: 140, ...APPLE });
  ov.bubble('thTitle2', 'PERANG?!', { x: W / 2, y: 600, r: 2 }, { size: 150, ...BROWNY });
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
