// THE CURIOUS AFFAN — Episode 052: "Macam Mana Ulat Jadi Rama-rama?"
// Every shot is a pure function of time t (seconds), synced to audio/narration.mp3.
import * as THREE from 'three';
import { makeRenderer, loadEnvelope, toScreen, clamp, lerp, inv, easeOut, easeIn, easeInOut, keys, W, H } from '../../shared/core.js';
import { POSES, blinkAt } from '../../shared/affan.js';
import { Overlay, pop, ICONS, drawLogo } from '../../shared/overlay.js';
import { CAPTIONS, KEYWORDS } from './captions.js';
import { buildPark52, buildMacro, buildOutro, A_PK, STAGE } from './worlds.js';

const FPS = 30;
const DURATION = 68.95;
const OUTRO = 65.8;

const stage = document.getElementById('stage');
const canvas = document.createElement('canvas');
stage.appendChild(canvas);
const renderer = makeRenderer(canvas);
const ov = new Overlay(stage);
const park = buildPark52();
const mac = buildMacro();
const outro = buildOutro();
const cam = new THREE.PerspectiveCamera(50, W / H, 0.02, 6000);
let env = { at: () => 0 };

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const talk = (t) => clamp(env.at(t) * 1.2);
const scr = (p) => toScreen(p, cam);
const mix3 = (a, b, k) => a.map((v, i) => lerp(v, b[i], k));
const BLUE = '#2f9bff', ORANGE = '#ff8a3d', PURPLE = '#7a5cf0', GREEN = '#2fbf5f', PINK = '#ff5c9a', RED = '#ff4d5e';

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

// ==================================================================== park
const affHead = () => park.aff.parts.head.getWorldPosition(V());
const front = (d, side = 0.35) => affHead().add(V(side, 0.1, d));
const YAW_BUSH = Math.atan2(-1.4, -0.4);
function parkAff(t, p = {}) {
  const a = park.aff;
  a.root.position.copy(A_PK);
  a.pose({ yaw: 0.15, blink: blinkAt(t, 1), talk: talk(t), smile: 0.9, ...p });
  a.root.updateMatrixWorld(true);
}
function parkSet(t, { ghost = 0, cat = 0 } = {}) {
  const f = park.fly;
  const a = t * 0.8;
  f.root.position.set(A_PK.x - 1.4 + Math.cos(a) * 1.0, 1.9 + 0.25 * Math.sin(t * 2.3), A_PK.z - 0.2 + Math.sin(a) * 0.7);
  f.root.rotation.set(0, -a - Math.PI / 2, 0.2 * Math.sin(t * 3));
  f.set(t, { flap: 1 });
  park.ghost.root.visible = ghost > 0.01;
  park.ghost.root.traverse((o) => { if (o.isMesh) o.material.opacity = ghost; });
  park.ghost.set(t, { chew: 1 });
  park.caterpillar.root.visible = cat > 0.01;
  park.caterpillar.set(t, { crawl: 0.6 });
}
const NIB = () => park.nib.position.clone();

// =================================================================== macro
const qLeaf = new THREE.Quaternion(), qA = new THREE.Quaternion(), qB = new THREE.Quaternion();
function leafPt(u, v, h = 0.02) {
  mac.leaf.updateMatrixWorld(true);
  return mac.leaf.localToWorld(V(u, v, h));
}
function placeOnLeaf(obj, u, v, heading = Math.PI / 2, h = 0.02, flip = false) {
  obj.position.copy(leafPt(u, v, h));
  mac.leaf.getWorldQuaternion(qLeaf);
  qA.setFromEuler(new THREE.Euler(flip ? -Math.PI / 2 : Math.PI / 2, 0, 0));
  qB.setFromEuler(new THREE.Euler(0, heading, 0));
  obj.quaternion.copy(qLeaf).multiply(qA).multiply(qB);
}
function macroReset() {
  mac.eggs.forEach((e) => (e.visible = false));
  mac.cat.root.visible = false;
  mac.skins.forEach((s) => (s.visible = false));
  mac.hang.root.visible = false;
  mac.chrys.visible = false;
  mac.swirl.forEach((s) => (s.visible = false));
  mac.fresh.root.visible = false;
  mac.sipper.root.visible = false;
  mac.rajah.root.visible = false;
  mac.shellL.rotation.set(0, 0, 0);
  mac.shellR.rotation.set(0, 0, 0);
  mac.chrysMat.opacity = 1;
  mac.chrysMat.color.setHex(0x5ad87a);
  mac.drawLeaf(0);
}

// =================================================================== SHOTS
const SHOTS = [
  // S1 — park: Affan by the hibiscus bush
  [0, 2.68, (t) => {
    parkSet(t);
    parkAff(t, { yaw: YAW_BUSH + 0.6, headPitch: 0.1 });
    camMove(t, 0, 2.68, [A_PK.x + 1.0, 2.2, A_PK.z + 6.2], [A_PK.x - 0.6, 1.2, A_PK.z], [A_PK.x + 0.8, 2.0, A_PK.z + 5.2], [A_PK.x - 0.6, 1.2, A_PK.z], 50);
    const q = pop(t, 0.4, 2.6);
    ov.tag('ep', 'EPISOD 52', { x: W / 2, y: 268, o: q.o, s: q.s }, { bg: '#2f7bff', small: true });
    return park;
  }],
  // S2 — "Semalam ada ulat kat daun ni, hari ni dah tak ada!"
  [2.68, 6.68, (t) => {
    const g = keys(t, [[3.4, 0], [3.8, 1], [4.8, 1], [5.3, 0]]);
    parkSet(t, { ghost: g * 0.85 });
    parkAff(t, { yaw: YAW_BUSH + 0.6 });
    const n = NIB();
    lookCam(n.clone().add(V(0.2, 0.2, 1.0)), n.clone().add(V(0, -0.02, 0)), 45);
    const pp = pop(t, 2.74, 3.4, { from: 2 });
    ov.bubble('papa', 'PAPA!', { x: 800, y: 470, o: pp.o, s: pp.s * 0.8, r: 6 }, { size: 110 });
    pinTag('semalam', 'SEMALAM: ADA ULAT', scr(n.clone().add(V(0, 0.25, 0))), t, 3.18, 5.2, { bg: GREEN, pointer: 'down' }, -30);
    bubble('takada', 'HARI NI\nDAH TAK ADA!', t, 5.28, 6.66, 430, 110, { top: '#fff0d8', bot: '#ff8a3d' });
    return park;
  }],
  // S3 — "Betul ke ulat boleh jadi rama-rama? Macam mana?"
  [6.68, 10.1, (t) => {
    parkSet(t);
    parkAff(t, { ...POSES.thinkR, brow: -0.3, smile: 0.5 });
    const ah = affHead();
    lookCam(front(3.3), ah.clone().add(V(0, -0.35, 0)), 46);
    const hd = scr(ah.clone().add(V(0, 0.4, 0)));
    qmarks(t, hd, 6.7, 10.08, [[6.8, -260, 100, '#ffcf33', -12], [7.1, 250, 60, '#3fa2ff', 10], [9.3, 280, 240, '#ffcf33', 14]]);
    bubble('betul', 'ULAT JADI\nRAMA-RAMA?', t, 6.74, 10.08, 430, 110, { top: '#fff6d0', bot: '#ffb21f' });
    return park;
  }],
  // S4 — "Jom ikut Affan cari jawapan!"
  [10.1, 12.12, (t) => {
    parkSet(t);
    const up = keys(t, [[10.12, 0], [10.35, 1], [11.5, 1], [11.8, 0.6]], easeOut);
    parkAff(t, { smile: 1, brow: 0.6, armR: { reach: [lerp(-0.6, -0.55, up), lerp(0.25, 1.95 + 0.06 * Math.sin(t * 14), up), lerp(0.2, 0.35, up)], pole: [-1, -0.3, -0.5] } });
    const ah = affHead();
    const k = easeIn(inv(11.2, 12.12, t));
    const n = NIB();
    lookCam(front(3.3).lerp(n.clone().add(V(0.1, 0.1, 0.4)), k), ah.clone().add(V(0, -0.35, 0)).lerp(n, k), 46);
    ov.swirl(t, W / 2, 820, inv(10.2, 12.0, t));
    ov.flash(inv(11.75, 12.12, t) ** 2, '220,255,220');
    return park;
  }],
  // S5 — eggs under the leaf; a hungry caterpillar hatches
  [12.12, 19.44, (t) => {
    macroReset();
    const ePos = [[-0.9, -0.6], [-0.4, -0.3], [0.1, -0.7], [0.5, -0.2], [0.9, -0.55], [0.2, 0.2]];
    mac.eggs.forEach((e, i) => {
      const a = 13.86 + i * 0.12;
      const k = easeOut(inv(a, a + 0.3, t));
      const hatch = i === 2 ? inv(16.6, 17.2, t) : 0;
      e.visible = k > 0.01 && hatch < 1;
      e.position.copy(leafPt(ePos[i][0], ePos[i][1], -0.1));
      e.scale.set(k * (1 + 0.2 * hatch), k * (1.25 - 0.6 * hatch), k);
    });
    const born = easeOut(inv(17.0, 17.7, t));
    mac.cat.root.visible = born > 0.01;
    placeOnLeaf(mac.cat.root, 0.1 + 0.3 * born, -0.7, Math.PI / 2, -0.03, true);
    mac.cat.root.scale.setScalar(0.22 * born);
    mac.cat.set(t, { crawl: born, chew: 0 });
    const P = leafPt(0, -0.4, 0);
    camMove(t, 12.12, 19.44, [P.x + 0.5, P.y - 2.6, P.z + 2.8], P.toArray(), [P.x + 0.3, P.y - 1.9, P.z + 2.2], P.toArray(), 48);
    ov.flash(1 - inv(12.12, 12.4, t), '220,255,220');
    topTag('telur', 'TELUR RAMA-RAMA', t, 13.86, 16.3, ORANGE);
    topTag('bawah', 'DI BAWAH DAUN', t, 15.16, 16.3, GREEN, 410);
    topTag('menetas', 'MENETAS!', t, 16.58, 19.42, PURPLE);
    bubble('lapar', 'ULAT LAPAR!', t, 18.54, 19.42, 1080, 120, { top: '#e8ffd8', bot: '#5ab83a' });
    return mac;
  }],
  // S6 — eats and eats, grows, and sheds its skin several times
  [19.44, 28.24, (t) => {
    macroReset();
    const eaten = easeInOut(inv(19.9, 24.0, t));
    mac.drawLeaf(eaten);
    const grow = lerp(0.3, 0.75, easeInOut(inv(19.9, 23.8, t)));
    const molts = [26.22, 26.66, 27.2, 27.7];
    const shift = molts.reduce((s, a) => s + 0.35 * easeOut(inv(a, a + 0.3, t)), 0);
    mac.cat.root.visible = true;
    placeOnLeaf(mac.cat.root, 1.5, lerp(-2.6, 0.4, eaten) + shift, Math.PI / 2);
    mac.cat.root.scale.setScalar(grow + 0.08 * molts.filter((a) => t > a).length);
    const tight = keys(t, [[23.86, 0], [24.2, 1], [25.4, 1], [25.6, 0]]);
    mac.cat.set(t, { crawl: t > 24 ? 0.5 : 0.2, chew: t < 24 ? 1 : 0, squash: tight * (0.5 + 0.5 * Math.sin(t * 10)) });
    mac.skins.forEach((s, i) => {
      s.visible = t > molts[i];
      placeOnLeaf(s, 1.5, lerp(-2.6, 0.4, eaten) - 0.9 + i * 0.35, Math.PI / 2);
      s.scale.setScalar(0.9 + 0.15 * i);
    });
    const P = leafPt(1.2, -0.6, 0);
    camMove(t, 19.44, 28.24, [P.x - 0.4, P.y + 2.8, P.z + 4.4], P.toArray(), [P.x + 0.8, P.y + 2.2, P.z + 3.6], leafPt(1.3, 0.2, 0).toArray(), 48);
    topTag('makan', 'MAKAN DAUN BANYAK SANGAT!', t, 19.5, 22.6, GREEN);
    bubble('besar', 'MEMBESAR!', t, 22.64, 23.82, 430, 130, { top: '#e8ffd8', bot: '#5ab83a' });
    topTag('sempit', 'KULIT JADI SEMPIT', t, 23.86, 25.5, RED);
    const n = molts.filter((a) => t > a).length;
    const q = pop(t, 25.52, 28.22);
    if (q.o > 0) ov.tag('molt', `TUKAR KULIT ×${Math.max(1, n)}`, { x: W / 2, y: 430, o: q.o, s: q.s }, { bg: PURPLE });
    return mac;
  }],
  // S7 — hangs from a twig and wraps itself into a chrysalis; inside, everything changes
  [28.24, 36.6, (t) => {
    macroReset();
    const T = STAGE.twig;
    const wrap = easeInOut(inv(31.1, 32.6, t));
    mac.hang.root.visible = wrap < 0.98;
    mac.hang.root.position.set(T.x, 3.0, 0.05);
    mac.hang.root.rotation.set(0, 0, -Math.PI / 2 + 0.25 * Math.sin(Math.min(t, 30.2) * 2) * (t < 30.2 ? 1 : 0.2));
    mac.hang.root.scale.setScalar(0.62 * (1 - 0.6 * wrap));
    mac.hang.set(t, { crawl: t < 30 ? 0.4 : 0, squash: 0.3 * wrap });
    mac.chrys.visible = wrap > 0.02;
    mac.chrys.scale.setScalar(Math.max(0.01, wrap));
    mac.chrys.rotation.z = 0.05 * Math.sin(t * 1.5);
    const inside = inv(33.7, 34.3, t);
    mac.chrysMat.opacity = 1 - 0.65 * inside;
    mac.swirl.forEach((s, i) => {
      s.visible = inside > 0.01;
      const a = t * 3 + i * 0.7;
      const y = -0.25 - ((i * 0.13 + t * 0.2) % 1.5);
      s.position.set(0.25 * Math.cos(a), y, 0.25 * Math.sin(a));
      s.scale.setScalar(0.14 * inside);
    });
    camMove(t, 28.24, 36.6, [T.x + 0.6, 2.6, 4.6], [T.x, 2.3, 0], [T.x + 0.2, 2.4, 3.4], [T.x, 2.1, 0], 48);
    ov.flash(1 - inv(28.24, 28.5, t), '220,255,220');
    topTag('cukup', 'DAH CUKUP BESAR', t, 28.3, 30.2, GREEN);
    topTag('gantung', 'BERGANTUNG', t, 30.24, 32.5, BLUE);
    pinTag('kepompong', 'KEPOMPONG', scr(V(T.x, 2.0, 0.4)), t, 32.58, 36.58, { bg: GREEN, pointer: 'down' }, -20);
    bubble('ubah', 'BERUBAH\nSEPENUHNYA!', t, 34.94, 36.58, 430, 110, { top: '#fff6d0', bot: '#ffb21f' });
    return mac;
  }],
  // S8 — about two weeks later it opens; wet, crumpled wings dry and spread
  [36.6, 46.76, (t) => {
    macroReset();
    const T = STAGE.twig;
    mac.chrys.visible = true;
    mac.chrys.scale.setScalar(1);
    mac.chrys.rotation.z = 0;
    mac.chrysMat.color.setHex(0x5ad87a).lerp(new THREE.Color(0xb88a4a), inv(37.8, 39.0, t));
    mac.chrysMat.opacity = 1 - 0.4 * inv(38.0, 39.0, t);
    const split = easeOut(inv(39.3, 39.9, t));
    mac.shellL.rotation.z = 0.35 * split;
    mac.shellR.rotation.z = -0.35 * split;
    const out = easeOut(inv(40.4, 41.3, t));
    const f = mac.fresh;
    f.root.visible = out > 0.01;
    f.root.position.set(T.x, lerp(2.4, 1.9, out), 0.2);
    f.root.rotation.set(0, 0, Math.PI / 2);
    f.root.scale.setScalar(lerp(0.5, 1.0, out));
    const dry = easeInOut(inv(44.3, 46.1, t));
    const fly = inv(46.0, 46.5, t);
    f.set(t, { flap: fly, open: fly, crumple: 1 - dry });
    camMove(t, 36.6, 46.76, [T.x + 0.4, 2.3, 4.0], [T.x, 2.1, 0], [T.x + 0.3, 1.8, 4.6], [T.x, 1.6, 0], 48);
    const d = pop(t, 37.72, 40.0);
    if (d.o > 0) ov.tag('hari', `HARI ${1 + Math.floor(clamp(inv(37.8, 39.6, t)) * 13.99)}`, { x: W / 2, y: 430, o: d.o, s: d.s }, { bg: ORANGE });
    topTag('minggu', '± 2 MINGGU', t, 37.72, 40.0, PURPLE);
    bubble('keluar', 'RAMA-RAMA!', t, 41.12, 42.2, 430, 140, { top: '#fff0d8', bot: '#ff8a3d' });
    topTag('basah', 'SAYAP BASAH & BERKEDUT', t, 42.26, 44.9, BLUE);
    topTag('kering', 'TUNGGU SAYAP KERING', t, 45.0, 46.74, ORANGE);
    return mac;
  }],
  // S9 — sipping nectar with a proboscis like a straw; then Rajah Brooke
  [46.76, 55.66, (t) => {
    macroReset();
    if (t < 52.28) {
      const Fp = STAGE.flower;
      const s = mac.sipper;
      s.root.visible = true;
      s.root.position.set(Fp.x - 1.05, 1.15, 0.25);
      s.root.rotation.set(0, 0.1, -0.3);
      s.root.scale.setScalar(1.3);
      s.set(t, { flap: 0.25, open: 0.55 });
      mac.probe(easeInOut(inv(48.4, 49.4, t)));
      camMove(t, 46.76, 52.28, [Fp.x + 0.6, 2.2, 5.2], [Fp.x - 0.5, 1.0, 0], [Fp.x + 0.3, 1.9, 4.2], [Fp.x - 0.5, 0.95, 0], 48);
      ov.flash(1 - inv(46.76, 47.05, t));
      topTag('tahu', 'TAHU TAK?', t, 46.82, 48.4, PURPLE);
      topTag('madu', 'HISAP MADU BUNGA', t, 48.42, 52.26, ORANGE);
      pinTag('belalai', 'BELALAI', scr(s.root.localToWorld(V(0.9, -0.3, 0))), t, 50.04, 52.26, { bg: PINK, pointer: 'down' }, -30);
      bubble('straw', 'MACAM STRAW!', t, 51.08, 52.26, 1080, 120, { top: '#ffe0f2', bot: '#ff5cb0' });
    } else {
      const J = STAGE.rajah;
      const r = mac.rajah;
      r.root.visible = true;
      const u = t - 52.28;
      r.root.position.set(J.x - 2.0 + u * 0.7, 0.4 + 0.5 * Math.sin(u * 1.8), 0.6 + 0.3 * Math.sin(u));
      r.root.rotation.set(0.3, -0.3, 0.15 * Math.sin(u * 3));
      r.set(t, { flap: 1 });
      lookCam(V(J.x + 0.2 + u * 0.3, 0.9, 5.4), r.root.position.clone().add(V(0.3, 0, 0)), 48);
      ov.flash(1 - inv(52.28, 52.55, t));
      topTag('kebangsaan', 'RAMA-RAMA KEBANGSAAN', t, 52.94, 55.64, GREEN);
      bubble('rajah', 'RAJAH BROOKE!', t, 54.6, 55.64, 430, 130, { top: '#e0ffe8', bot: '#2fbf5f' });
    }
    return mac;
  }],
  // S10 — "Waaah, rupanya ulat tu tak hilang..." / "Kalau jumpa ulat, jangan kacau, ya."
  [55.66, 63.54, (t) => {
    parkSet(t, { cat: t > 60.8 ? 1 : 0 });
    const look = t > 60.8;
    parkAff(t, look ? { yaw: YAW_BUSH + 0.8, smile: 1, brow: 0.4, headPitch: 0.15, armL: { reach: [0.25, 0.25, -0.35], pole: [1, -0.5, 0.3] }, armR: { reach: [-0.25, 0.25, -0.35], pole: [-1, -0.5, 0.3] } } : { wow: keys(t, [[55.7, 0], [55.85, 0.9], [56.4, 0.9], [56.7, 0]]), smile: 1, brow: 0.5 });
    const ah = affHead();
    if (!look) lookCam(front(3.3), ah.clone().add(V(0, -0.35, 0)), 46);
    else lookCam(V(A_PK.x + 0.6, 2.0, A_PK.z + 3.4), V(A_PK.x - 0.6, 1.25, A_PK.z), 48);
    ov.flash((1 - inv(55.66, 55.95, t)) * 0.9, '255,250,235');
    const hd = scr(ah.clone().add(V(0, 0.5, 0)));
    const b = pop(t, 55.7, 60.7);
    if (!look) ov.html('bulb', ICONS.bulb(), { x: clamp(hd.x + 220, 150, 900), y: clamp(hd.y - 170, 300, 900) + Math.sin(t * 5) * 8, o: b.o, s: b.s * 0.6, r: 10 });
    ov.sparkles(t, { n: 30, seed: 12, y: 250, h: 900, a: inv(55.7, 56.0, t) * (1 - inv(58.0, 58.6, t)) });
    bubble('tukar', 'TAK HILANG,\nBERTUKAR!', t, 57.9, 60.8, 430, 110, { top: '#fff0d8', bot: '#ff8a3d' });
    topTag('kacau', 'TENGOK SAJA, JANGAN KACAU', t, 62.32, 63.52, GREEN);
    return park;
  }],
  // S11 — "Apa lagi kita nak belajar lepas ni?"
  [63.54, OUTRO, (t) => {
    parkSet(t);
    const tk = keys(t, [[63.56, 0], [63.95, 1]]);
    const th2 = POSES.thinkR.armR;
    parkAff(t, { smile: 1, brow: 0.3 + 0.4 * tk, headRoll: -0.12 * tk, lookX: 0.35 * tk, lookY: 0.4 * tk, headPitch: -0.08 * tk, armR: { reach: mix3([-0.55, 0.3, 0.2], th2.reach, tk), pole: th2.pole, point: tk, wx: th2.wx * tk } });
    const ah = affHead();
    lookCam(front(3.3), ah.clone().add(V(0, -0.35, 0)), 46);
    const hd = scr(ah.clone().add(V(0, 0.45, 0)));
    qmarks(t, hd, 63.54, OUTRO - 0.05, [[63.6, -260, -100, '#ffcf33', -12], [63.9, 250, -160, '#3fa2ff', 10], [64.2, 300, 60, '#ffcf33', 14]]);
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

// Cover / thumbnail (9:16): the caterpillar on its leaf and the butterfly it becomes.
function thumbnail() {
  ov.begin();
  cam.aspect = W / H;
  cam.updateProjectionMatrix();
  const t = 22.0;
  macroReset();
  mac.drawLeaf(0.4);
  mac.cat.root.visible = true;
  placeOnLeaf(mac.cat.root, 1.2, -0.8, Math.PI / 2);
  mac.cat.root.scale.setScalar(0.9);
  mac.cat.set(t, { chew: 0.5 });
  const f = mac.fresh;
  f.root.visible = true;
  const P = leafPt(1.2, -0.4, 0);
  f.root.position.copy(P).add(V(0.4, 1.6, 0.4));
  f.root.rotation.set(0.6, -0.4, 0.2);
  f.set(0.05, { flap: 0.7, open: 1 });
  lookCam(P.clone().add(V(0.2, 1.6, 3.6)), P.clone().add(V(0.1, 0.9, 0)), 50);
  mac.sky.position.copy(cam.position);
  renderer.setViewport(0, 0, W, H);
  renderer.render(mac.scene, cam);
  ov.vignette(0.3);
  ov.tag('thBadge', 'EPISOD 52', { x: W / 2, y: 300 }, { bg: '#2f7bff', small: true });
  ov.bubble('thTitle', 'ULAT JADI', { x: W / 2, y: 445, r: -3 }, { size: 130, top: '#e8ffd8', bot: '#5ab83a' });
  ov.bubble('thTitle2', 'RAMA-RAMA?!', { x: W / 2, y: 600, r: 2 }, { size: 130, top: '#fff0d8', bot: '#ff8a3d' });
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
