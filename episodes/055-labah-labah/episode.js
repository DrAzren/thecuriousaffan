// THE CURIOUS AFFAN — Episode 055: "Macam Mana Labah-labah Buat Sarang?"
// Every shot is a pure function of time t (seconds), synced to audio/narration.mp3.
import * as THREE from 'three';
import { makeRenderer, loadEnvelope, toScreen, clamp, lerp, inv, easeOut, easeIn, easeInOut, keys, W, H } from '../../shared/core.js';
import { POSES, blinkAt } from '../../shared/affan.js';
import { Overlay, pop, ICONS, drawLogo } from '../../shared/overlay.js';
import { CAPTIONS, KEYWORDS } from './captions.js';
import { buildPark55, buildMacro, buildOutro, onWeb, A_PK, WEB_AT, MW, MR, BIG_AT, TEST_AT } from './worlds.js';

const FPS = 30;
const DURATION = 67.9;
const OUTRO = 64.75;

const stage = document.getElementById('stage');
const canvas = document.createElement('canvas');
stage.appendChild(canvas);
const renderer = makeRenderer(canvas);
const ov = new Overlay(stage);
const park = buildPark55();
const mac = buildMacro();
const outro = buildOutro();
const cam = new THREE.PerspectiveCamera(50, W / H, 0.02, 6000);
let env = { at: () => 0 };

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const talk = (t) => clamp(env.at(t) * 1.2);
const scr = (p) => toScreen(p, cam);
const mix3 = (a, b, k) => a.map((v, i) => lerp(v, b[i], k));
const BLUE = '#2f9bff', ORANGE = '#ff8a3d', PURPLE = '#7a5cf0', GREEN = '#2fbf5f', PINK = '#ff5c9a', RED = '#ff4d5e', GREY = '#6a7488';

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
// a bicycle wheel drawn on the overlay
function wheel(t, a, b, x = 820, y = 1120) {
  const q = pop(t, a, b);
  if (q.o <= 0) return;
  const g = ov.g;
  g.save();
  g.globalAlpha = q.o;
  g.translate(x, y);
  g.scale(q.s, q.s);
  g.rotate(t * 0.8);
  g.fillStyle = 'rgba(15,25,50,0.55)';
  g.beginPath();
  g.arc(0, 0, 150, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = '#1a1a22';
  g.lineWidth = 22;
  g.beginPath();
  g.arc(0, 0, 118, 0, Math.PI * 2);
  g.stroke();
  g.strokeStyle = '#d8dce4';
  g.lineWidth = 4;
  for (let i = 0; i < 16; i++) {
    const an = (i / 16) * Math.PI * 2;
    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(Math.cos(an) * 108, Math.sin(an) * 108);
    g.stroke();
  }
  g.fillStyle = '#9aa4b4';
  g.beginPath();
  g.arc(0, 0, 16, 0, Math.PI * 2);
  g.fill();
  g.restore();
}

// ==================================================================== park
const affHead = () => park.aff.parts.head.getWorldPosition(V());
const front = (d, side = 0.35) => affHead().add(V(side, 0.1, d));
const YAW_WEB = Math.atan2(WEB_AT.x - A_PK.x, WEB_AT.z - A_PK.z);
function parkAff(t, p = {}) {
  const a = park.aff;
  a.root.position.copy(A_PK);
  a.pose({ yaw: 0.15, blink: blinkAt(t, 1), talk: talk(t), smile: 0.9, ...p });
  a.root.updateMatrixWorld(true);
}
function parkSet(t) {
  park.dew.forEach((d) => (d.material.opacity = 0.7 + 0.3 * Math.sin(t * 3 + d.userData.ph)));
  park.spider.set(t, { walk: 0 });
}

// =================================================================== macro
function tubeBetween(mesh, pts, r = 0.02) {
  mesh.geometry.dispose();
  mesh.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 48, r, 5);
}
const WHITE = new THREE.Color(0xf6faff);
function macroReset() {
  mac.web.set({ frame: 0, radials: 0, spiral: 0 });
  mac.bridge.visible = false;
  mac.wind.forEach((w) => (w.visible = false));
  mac.mosq.visible = false;
  mac.thread.visible = false;
  mac.drop.visible = false;
  mac.radMat.color.copy(WHITE);
  mac.radMat.emissive.setHex(0xffffff);
  mac.spiralMat.color.copy(WHITE);
  mac.spiralMat.emissive.setHex(0xffffff);
  mac.big.abdMat.opacity = 1;
  mac.spider.root.visible = true;
}
const L_TOP = V(-3.1, 4.6, 0.05), R_TOP = V(3.2, 4.6, 0.05);

// =================================================================== SHOTS
const SHOTS = [
  // S1 — park on a misty morning
  [0, 2.26, (t) => {
    parkSet(t);
    parkAff(t, { yaw: YAW_WEB + 0.5, headPitch: 0.05 });
    camMove(t, 0, 2.26, [A_PK.x + 0.8, 2.1, A_PK.z + 5.6], [A_PK.x - 0.7, 1.3, A_PK.z], [A_PK.x + 0.6, 1.9, A_PK.z + 4.8], [A_PK.x - 0.7, 1.3, A_PK.z], 50);
    const q = pop(t, 0.4, 2.2);
    ov.tag('ep', 'EPISOD 55', { x: W / 2, y: 268, o: q.o, s: q.s }, { bg: '#2f7bff', small: true });
    return park;
  }],
  // S2 — "Semalam tak ada apa-apa, pagi ni ada sarang labah-labah besar!"
  [2.26, 7.3, (t) => {
    parkSet(t);
    parkAff(t, { yaw: YAW_WEB + 0.5 });
    camMove(t, 2.26, 7.3, [WEB_AT.x + 0.3, WEB_AT.y + 0.1, WEB_AT.z + 2.0], WEB_AT.toArray(), [WEB_AT.x + 0.15, WEB_AT.y + 0.05, WEB_AT.z + 1.55], WEB_AT.toArray(), 46);
    const pp = pop(t, 2.32, 3.0, { from: 2 });
    ov.bubble('papa', 'PAPA!', { x: 800, y: 470, o: pp.o, s: pp.s * 0.8, r: 6 }, { size: 110 });
    topTag('semalam', 'SEMALAM: TAK ADA APA-APA', t, 3.08, 5.4, GREY);
    bubble('besar', 'PAGI NI:\nSARANG BESAR!', t, 5.44, 7.28, 430, 108, { top: '#f0f6ff', bot: '#8a9ab4' });
    return park;
  }],
  // S3 — "Macam mana labah-labah buat sarang secantik ni?"
  [7.3, 10.12, (t) => {
    parkSet(t);
    parkAff(t, { ...POSES.thinkR, brow: -0.3, smile: 0.5 });
    const ah = affHead();
    lookCam(front(3.3), ah.clone().add(V(0, -0.35, 0)), 46);
    const hd = scr(ah.clone().add(V(0, 0.4, 0)));
    qmarks(t, hd, 7.35, 10.1, [[7.4, -260, 100, '#ffcf33', -12], [7.7, 250, 60, '#3fa2ff', 10], [8.1, 280, 240, '#ffcf33', 14]]);
    bubble('macam', 'MACAM MANA\nDIBUAT?', t, 7.36, 10.1, 430, 116, { top: '#fff6d0', bot: '#ffb21f' });
    return park;
  }],
  // S4 — "Jom ikut Affan cari jawapan!"
  [10.12, 12.16, (t) => {
    parkSet(t);
    const up = keys(t, [[10.14, 0], [10.38, 1], [11.5, 1], [11.8, 0.6]], easeOut);
    parkAff(t, { smile: 1, brow: 0.6, armR: { reach: [lerp(-0.6, -0.55, up), lerp(0.25, 1.95 + 0.06 * Math.sin(t * 14), up), lerp(0.2, 0.35, up)], pole: [-1, -0.3, -0.5] } });
    const ah = affHead();
    const k = easeIn(inv(11.2, 12.16, t));
    lookCam(front(3.3).lerp(WEB_AT.clone().add(V(0, 0, 0.4)), k), ah.clone().add(V(0, -0.35, 0)).lerp(WEB_AT, k), 46);
    ov.swirl(t, W / 2, 820, inv(10.2, 12.05, t));
    ov.flash(inv(11.75, 12.16, t) ** 2, '240,250,255');
    return park;
  }],
  // S5 — a silk factory in its belly: liquid silk that hardens when pulled
  [12.16, 21.06, (t) => {
    macroReset();
    mac.spider.root.visible = false;
    const B = mac.big;
    B.set(t, { walk: 0 });
    B.abdMat.opacity = 1 - 0.65 * inv(13.1, 13.6, t);
    B.glands.children.forEach((g, i) => (g.material.emissiveIntensity = 0.6 + 0.4 * Math.sin(t * 5 + i)));
    B.root.updateMatrixWorld(true);
    const tip = B.spin.getWorldPosition(V());
    const pull = easeOut(inv(15.3, 17.4, t));
    const taut = easeInOut(inv(19.4, 20.2, t));
    if (pull > 0.01) {
      const end = tip.clone().add(V(-0.4 - 2.4 * pull, -1.2 * pull - 0.3 * pull * (1 - taut), 0.8 * pull));
      const mid = tip.clone().lerp(end, 0.5).add(V(0, -0.5 * (1 - taut) * pull, 0));
      mac.thread.visible = true;
      tubeBetween(mac.thread, [tip, mid, end], 0.025);
      mac.drop.visible = t > 17.8 && t < 19.6;
      mac.drop.position.copy(end);
      mac.drop.scale.setScalar(easeOut(inv(17.8, 18.2, t)));
    }
    camMove(t, 12.16, 21.06, [BIG_AT.x + 2.5, 4.2, 10.5], [BIG_AT.x - 0.6, 1.0, 0], [BIG_AT.x + 0.8, 3.6, 10.5], [BIG_AT.x - 1.0, 0.8, 0], 50);
    ov.flash(1 - inv(12.16, 12.45, t), '240,250,255');
    pinTag('kilang', 'KILANG BENANG!', scr(BIG_AT.clone().add(V(-0.8, 2.2, 0.4))), t, 13.2, 17.5, { bg: BLUE, pointer: 'down' }, -30);
    pinTag('hujung', 'HUJUNG PERUT', scr(tip), t, 15.86, 17.6, { bg: PURPLE, pointer: 'down' }, -40);
    topTag('cair', 'MULA-MULA CAIR', t, 18.04, 19.4, BLUE);
    bubble('keras', 'JADI KERAS\nBILA DITARIK!', t, 19.5, 21.04, 430, 108, { top: '#f0f6ff', bot: '#8a9ab4' });
    return mac;
  }],
  // S6 — the first thread floats on the wind to the far branch: the first bridge
  [21.06, 29.21, (t) => {
    macroReset();
    const S = mac.spider;
    const fly = easeInOut(inv(24.2, 26.3, t));
    const walk = easeInOut(inv(27.6, 29.2, t));
    const sp = L_TOP.clone().lerp(R_TOP, walk).add(V(0, 0.2, 0.05));
    onWeb(S, sp, walk > 0.001 && walk < 0.999 ? 0 : Math.PI / 2);
    S.set(t, { walk: walk > 0.001 && walk < 0.999 ? 1 : 0 });
    if (t > 22.1) {
      const out = easeOut(inv(22.1, 23.4, t));
      const pts = [];
      for (let i = 0; i <= 12; i++) {
        const u = i / 12;
        const x = lerp(L_TOP.x, lerp(L_TOP.x + 1.0 * out, R_TOP.x, fly), u);
        const sag = (1 - fly) * 0.6 * Math.sin(u * Math.PI * 2 + t * 4) * u + (t > 26.3 ? -0.08 * Math.sin(u * Math.PI) : 0);
        pts.push(V(x, L_TOP.y + 0.1 + sag + (1 - fly) * 0.4 * u, 0.05));
      }
      mac.bridge.visible = true;
      tubeBetween(mac.bridge, pts, 0.02);
    }
    mac.wind.forEach((w, i) => {
      const u = ((t * 0.6 + i / mac.wind.length) % 1);
      w.visible = t > 24.0 && t < 26.8;
      w.position.set(-5 + u * 10, 3.6 + 1.6 * Math.sin(i * 1.7), 0.6);
      w.scale.set(0.9, 0.06, 1);
    });
    lookCam(V(0.2, 3.6, 10.5), V(0, 3.6, 0), 50);
    ov.flash(1 - inv(21.06, 21.35, t));
    topTag('seutas', 'LEPASKAN SEUTAS BENANG', t, 21.84, 24.2, PURPLE);
    topTag('angin', 'ANGIN TERBANGKAN!', t, 24.28, 26.2, BLUE);
    pinTag('lekat', 'MELEKAT!', scr(R_TOP.clone().add(V(-0.3, 0.3, 0))), t, 26.24, 28.0, { bg: GREEN, pointer: 'down' }, -30);
    bubble('jambatan', 'JAMBATAN\nPERTAMA!', t, 28.06, 29.19, 1080, 110, { top: '#fff6d0', bot: '#ffb21f' });
    return mac;
  }],
  // S7 — the frame, then straight spokes from the middle like bicycle wheel spokes
  [29.21, 36.04, (t) => {
    macroReset();
    mac.bridge.visible = false;
    const fk = easeInOut(inv(30.7, 31.7, t));
    const rk = easeInOut(inv(31.9, 33.9, t));
    mac.web.set({ frame: fk, radials: rk, spiral: 0 });
    const S = mac.spider;
    onWeb(S, MW.clone().add(V(0, 0, 0.05)), Math.PI / 2 + t * 0.6 * (rk > 0 && rk < 1 ? 1 : 0));
    S.set(t, { walk: rk > 0 && rk < 1 ? 1 : 0 });
    lookCam(V(0.2, 2.3, 9.6), V(0, 2.1, 0), 50);
    topTag('bingkai', 'BINGKAI', t, 30.86, 31.9, BLUE);
    topTag('lurus', 'BENANG LURUS DARI TENGAH', t, 31.92, 36.02, PURPLE);
    wheel(t, 34.34, 36.02, 540, 1120);
    pinTag('jejari', 'MACAM JEJARI RODA BASIKAL', { x: 540, y: 1300, visible: true }, t, 34.34, 36.02, { bg: ORANGE }, -350);
    return mac;
  }],
  // S8 — the sticky spiral, round and round to the middle; an insect gets stuck
  [36.04, 44.74, (t) => {
    macroReset();
    const sk = easeInOut(inv(37.4, 42.4, t));
    mac.web.set({ frame: 1, radials: 1, spiral: sk });
    const S = mac.spider;
    const sp = mac.web.spiralPoint(Math.max(0.001, sk));
    onWeb(S, (sk > 0.001 ? sp.clone() : MW.clone()).add(V(0, 0, 0.06)), Math.atan2(sp.y - MW.y, sp.x - MW.x) - Math.PI / 2);
    S.set(t, { walk: sk > 0 && sk < 1 ? 1 : 0 });
    const hit = V(1.2, 1.2, 0.06);
    const m = mac.mosq;
    const fl = easeIn(inv(42.4, 43.0, t));
    m.visible = t > 42.3;
    m.position.copy(V(6, 3.2, 1.5).lerp(hit, fl));
    m.rotation.set(0, Math.PI, 0.3 * (1 - fl));
    m.userData.wings.forEach((w, i) => (w.rotation.z = (i ? 1 : -1) * (0.3 + 0.6 * Math.sin(t * (fl < 1 ? 60 : 25)))));
    const shake = t > 43.0 ? 0.04 * Math.sin(t * 30) * Math.exp(-(t - 43.0) * 1.5) : 0;
    mac.web.frame.position.set(shake, 0, 0);
    lookCam(V(0.2 + shake, 2.3, 9.4), V(0, 2.1, 0), 50);
    topTag('lingkaran', 'LINGKARAN MELEKIT', t, 37.48, 42.4, PINK);
    topTag('pusing', 'PUSING... SAMPAI KE TENGAH!', t, 39.74, 42.4, PURPLE, 410);
    bubble('lekat', 'TERLEKAT!', t, 43.96, 44.72, 430, 140, { top: '#ffe0f2', bot: '#ff5cb0' });
    return mac;
  }],
  // S9 — silk is stronger than steel of the same thickness
  [44.74, 49.74, (t) => {
    macroReset();
    mac.spider.root.visible = false;
    const snap = t > 47.9;
    mac.steelS.visible = !snap;
    mac.steelTop.visible = snap;
    const fall = easeIn(inv(47.9, 48.5, t));
    mac.wSteel.position.y = 1.65 - 1.3 * fall;
    mac.wSilk.position.y = 1.65 - 0.05 * Math.sin(t * 3) * inv(46, 47, t);
    lookCam(V(TEST_AT.x, 3.6, 11.5), V(TEST_AT.x, 3.6, 0), 50);
    ov.flash(1 - inv(44.74, 45.0, t));
    topTag('tahu', 'TAHU TAK?', t, 44.8, 46.0, PURPLE);
    pinTag('labah', 'BENANG LABAH-LABAH', scr(TEST_AT.clone().add(V(-1.2, 5.6, 0))), t, 45.86, 49.72, { bg: BLUE, pointer: 'down' }, -20);
    pinTag('besi', 'BESI', scr(TEST_AT.clone().add(V(1.2, 5.6, 0))), t, 47.0, 49.72, { bg: GREY, pointer: 'down' }, -20);
    topTag('sama', 'SAMA BESAR', t, 48.34, 49.72, ORANGE, 410);
    bubble('kuat', 'LEBIH KUAT\nDARI BESI!', t, 47.2, 49.72, 1080, 110, { top: '#fff6d0', bot: '#ffb21f' });
    return mac;
  }],
  // S10 — the spider doesn't get stuck: it walks on the non-sticky threads
  [49.74, 54.28, (t) => {
    macroReset();
    mac.web.set({ frame: 1, radials: 1, spiral: 1 });
    const c = inv(51.5, 52.2, t);
    mac.radMat.color.copy(WHITE).lerp(new THREE.Color(0x5ab8ff), c);
    mac.radMat.emissive.setHex(0xffffff).lerp(new THREE.Color(0x2a7ad8), c);
    mac.spiralMat.color.copy(WHITE).lerp(new THREE.Color(0xff7ab0), c);
    mac.spiralMat.emissive.setHex(0xffffff).lerp(new THREE.Color(0xa83a6a), c);
    const S = mac.spider;
    const u = easeInOut(inv(50.0, 54.0, t));
    onWeb(S, MW.clone().add(V(0, MR * 0.8 * u, 0.06)), Math.PI / 2);
    S.set(t, { walk: u > 0 && u < 1 ? 1 : 0 });
    lookCam(V(0.6, 3.4, 6.6), V(0, 3.2, 0), 50);
    topTag('tak', 'LABAH-LABAH TAK TERLEKAT', t, 49.8, 54.26, GREEN);
    pinTag('biru', 'TAK MELEKIT', scr(MW.clone().add(V(-0.12, MR * 0.55, 0))), t, 52.68, 54.26, { bg: BLUE, pointer: 'down' }, -30);
    pinTag('pink', 'MELEKIT', scr(MW.clone().add(V(1.1, 1.0, 0))), t, 53.4, 54.26, { bg: PINK, pointer: 'down' }, -30);
    return mac;
  }],
  // S11 — "Waaah, rupanya labah-labah jurutera yang hebat!" / "tengok saja, jangan rosakkan"
  [54.28, 62.48, (t) => {
    parkSet(t);
    const look = t > 58.2;
    parkAff(t, look ? { yaw: YAW_WEB + 0.3, smile: 1, brow: 0.4, headPitch: 0.05, armL: { reach: [0.25, 0.25, -0.35], pole: [1, -0.5, 0.3] }, armR: { reach: [-0.25, 0.25, -0.35], pole: [-1, -0.5, 0.3] } } : { wow: keys(t, [[54.3, 0], [54.45, 0.9], [55.0, 0.9], [55.3, 0]]), smile: 1, brow: 0.5 });
    const ah = affHead();
    if (!look) lookCam(front(3.3), ah.clone().add(V(0, -0.35, 0)), 46);
    else lookCam(V(A_PK.x + 0.8, 1.9, A_PK.z + 3.6), V(A_PK.x - 0.8, 1.35, A_PK.z + 0.2), 50);
    ov.flash((1 - inv(54.28, 54.55, t)) * 0.9, '255,250,235');
    const hd = scr(ah.clone().add(V(0, 0.5, 0)));
    const b = pop(t, 54.3, 58.1);
    if (!look) ov.html('bulb', ICONS.bulb(), { x: clamp(hd.x + 220, 150, 900), y: clamp(hd.y - 170, 300, 900) + Math.sin(t * 5) * 8, o: b.o, s: b.s * 0.6, r: 10 });
    ov.sparkles(t, { n: 30, seed: 12, y: 250, h: 900, a: inv(54.3, 54.6, t) * (1 - inv(56.4, 57.0, t)) });
    bubble('jurutera', 'JURUTERA\nYANG HEBAT!', t, 56.58, 58.2, 430, 116, { top: '#fff6d0', bot: '#ffb21f' });
    topTag('tengok', 'TENGOK SAJA, JANGAN ROSAKKAN', t, 58.26, 62.46, GREEN);
    return park;
  }],
  // S12 — "Apa lagi kita nak belajar lepas ni?"
  [62.48, OUTRO, (t) => {
    parkSet(t);
    const tk = keys(t, [[62.5, 0], [62.9, 1]]);
    const th2 = POSES.thinkR.armR;
    parkAff(t, { smile: 1, brow: 0.3 + 0.4 * tk, headRoll: -0.12 * tk, lookX: 0.35 * tk, lookY: 0.4 * tk, headPitch: -0.08 * tk, armR: { reach: mix3([-0.55, 0.3, 0.2], th2.reach, tk), pole: th2.pole, point: tk, wx: th2.wx * tk } });
    const ah = affHead();
    lookCam(front(3.3), ah.clone().add(V(0, -0.35, 0)), 46);
    const hd = scr(ah.clone().add(V(0, 0.45, 0)));
    qmarks(t, hd, 62.48, OUTRO - 0.05, [[62.5, -260, -100, '#ffcf33', -12], [62.8, 250, -160, '#3fa2ff', 10], [63.1, 300, 60, '#ffcf33', 14]]);
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

// Cover / thumbnail (9:16): the finished web with the spider in the middle.
function thumbnail() {
  ov.begin();
  cam.aspect = W / H;
  cam.updateProjectionMatrix();
  macroReset();
  mac.web.set({ frame: 1, radials: 1, spiral: 1 });
  onWeb(mac.spider, MW.clone().add(V(0, 0, 0.06)), Math.PI / 2);
  mac.spider.root.scale.setScalar(0.8);
  lookCam(V(0.4, 1.4, 7.8), V(0, 1.5, 0), 50);
  mac.sky.position.copy(cam.position);
  renderer.setViewport(0, 0, W, H);
  renderer.render(mac.scene, cam);
  mac.spider.root.scale.setScalar(0.5);
  ov.vignette(0.3);
  ov.tag('thBadge', 'EPISOD 55', { x: W / 2, y: 300 }, { bg: '#2f7bff', small: true });
  ov.bubble('thTitle', 'LEBIH KUAT', { x: W / 2, y: 445, r: -3 }, { size: 130, top: '#fff6d0', bot: '#ffb21f' });
  ov.bubble('thTitle2', 'DARI BESI?!', { x: W / 2, y: 600, r: 2 }, { size: 130, top: '#f0f6ff', bot: '#8a9ab4' });
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
