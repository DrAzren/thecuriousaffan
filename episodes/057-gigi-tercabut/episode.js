// THE CURIOUS AFFAN — Episode 057: "Apa Jadi Kalau Gigi Tercabut?"
// Every shot is a pure function of time t (seconds), synced to audio/narration.mp3.
import * as THREE from 'three';
import { makeRenderer, loadEnvelope, toScreen, clamp, lerp, inv, easeOut, easeIn, easeInOut, keys, W, H } from '../../shared/core.js';
import { POSES, blinkAt } from '../../shared/affan.js';
import { Overlay, pop, ICONS, drawLogo } from '../../shared/overlay.js';
import { CAPTIONS, KEYWORDS } from './captions.js';
import { buildRoom57, buildStage, buildOutro, A_LR, BABY_AT, SEC_AT, ADULT_AT, DEMO_AT, GUM_TOP } from './worlds.js';

const FPS = 30;
const DURATION = 65.6;
const OUTRO = 62.45;

const stage = document.getElementById('stage');
const canvas = document.createElement('canvas');
stage.appendChild(canvas);
const renderer = makeRenderer(canvas);
const ov = new Overlay(stage);
const room = buildRoom57();
const st = buildStage();
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
// a green tick drawn on the overlay
function tick(t, a, b, p, size = 70) {
  const q = pop(t, a, b);
  if (q.o <= 0) return;
  const g = ov.g;
  g.save();
  g.globalAlpha = q.o;
  g.translate(p.x, p.y);
  g.scale(q.s, q.s);
  g.fillStyle = '#2fbf5f';
  g.beginPath();
  g.arc(0, 0, size, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = '#fff';
  g.lineWidth = size * 0.22;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.beginPath();
  g.moveTo(-size * 0.45, 0);
  g.lineTo(-size * 0.1, size * 0.35);
  g.lineTo(size * 0.5, -size * 0.35);
  g.stroke();
  g.restore();
}
// a clock drawn on the overlay (hands spin fast: hurry!)
function clock(t, a, b, x, y) {
  const q = pop(t, a, b);
  if (q.o <= 0) return;
  const g = ov.g;
  g.save();
  g.globalAlpha = q.o;
  g.translate(x, y);
  g.scale(q.s, q.s);
  g.fillStyle = '#ffffff';
  g.strokeStyle = '#ff4d5e';
  g.lineWidth = 16;
  g.beginPath();
  g.arc(0, 0, 90, 0, Math.PI * 2);
  g.fill();
  g.stroke();
  g.strokeStyle = '#1a2440';
  g.lineCap = 'round';
  g.lineWidth = 10;
  for (const [len, sp] of [[50, 2], [70, 12]]) {
    const an = t * sp;
    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(Math.sin(an) * len, -Math.cos(an) * len);
    g.stroke();
  }
  g.restore();
}
// big counter number in the lower middle
function counter(t, a, b, n, label, bg) {
  const q = pop(t, a, b, { from: 2 });
  if (q.o > 0) ov.bubble('cnt', `${n}`, { x: W / 2, y: 1160, o: q.o, s: q.s, r: -2 }, { size: 170, ...bg });
  topTag('cntL', label, t, a, b, bg.tag, 1280);
}

// ==================================================================== room
const affHead = () => room.aff.parts.head.getWorldPosition(V());
const front = (d, side = 0.35) => affHead().add(V(side, 0.1, d));
function affSet(t, p = {}) {
  const a = room.aff;
  a.root.position.copy(A_LR);
  a.pose({ yaw: 0.15, blink: blinkAt(t, 1), talk: talk(t), smile: 0.9, ...p });
  a.root.updateMatrixWorld(true);
}
// the apple / toothbrush follow Affan's right hand
function holdApple(show = 1) {
  room.apple.visible = show > 0;
  if (!show) return;
  room.apple.position.copy(room.aff.parts.arms.R.hand.getWorldPosition(V())).add(V(0.02, 0.12, 0.12));
  room.apple.rotation.set(0, -0.4, 0);
}
function holdBrush(t, show = 0) {
  room.brush.visible = show > 0;
  if (!show) return;
  room.brush.position.copy(room.aff.parts.arms.R.hand.getWorldPosition(V())).add(V(0.0, 0.0, 0.05));
  room.brush.rotation.set(0, 0, -Math.PI / 2 + 0.1);
}

// =================================================================== stage
function stageSet(t, { count = 0, countA = 0, rise = 0, root = 1, wobble = 0, out = 0, grow = 0, demo = 0 } = {}) {
  st.babyTeeth.forEach((tt, i) => (tt.mat.emissiveIntensity = i < count ? 0.35 + 0.25 * Math.max(0, 1 - (count - i) * 0.4) : 0));
  st.adultTeeth.forEach((tt, i) => (tt.mat.emissiveIntensity = i < countA ? 0.35 + 0.25 * Math.max(0, 1 - (countA - i) * 0.4) : 0));
  // cross-section: the middle milk tooth and the permanent tooth below it
  const mid = st.secTeeth[1];
  mid.root.scale.y = lerp(1, 0.2, root);
  mid.g.visible = out < 1;
  mid.g.position.set(out * 0.8, GUM_TOP - 0.15 + 4.5 * easeIn(out), 0);
  mid.g.rotation.set(0, 0, wobble * 0.14 * Math.sin(t * 26) - out * 1.5);
  const p = st.perm;
  const y0 = -3.9, y1 = -2.0, y2 = GUM_TOP - 0.25;
  p.g.position.set(0, lerp(lerp(y0, y1, rise), y2, grow), 0);
  p.root.scale.y = Math.max(0.01, 0.15 + 0.35 * rise + 0.5 * grow);
  p.mat.emissiveIntensity = 0.25 * (rise > 0 && grow < 1 ? 1 : 0);
  // first-aid demo: the tooth dips into the glass of milk
  const big = st.big;
  const k = easeInOut(demo);
  big.g.position.set(lerp(-0.8, 1.6, k), lerp(0.2, -1.35, k), 0);
  big.g.rotation.set(0.15, t * 0.6 * (1 - k), lerp(0.25, 0, k));
  big.g.scale.setScalar(lerp(1.5, 0.75, k));
}
const secP = (x, y) => SEC_AT.clone().add(V(x, y, 0.9));

// =================================================================== SHOTS
const SHOTS = [
  // S1 — living room: Affan munches an apple
  [0, 2.28, (t) => {
    const bite = Math.abs(Math.sin(t * 3.2));
    affSet(t, { talk: 0, smile: 0.7, armR: { reach: [-0.08, 1.12 - 0.08 * bite, 0.62], pole: [-1, -0.6, -0.3] } });
    holdApple(1);
    holdBrush(t, 0);
    camMove(t, 0, 2.28, front(5.2, 0.6).toArray(), affHead().add(V(0, -0.7, 0)).toArray(), front(4.4, 0.5).toArray(), affHead().add(V(0, -0.6, 0)).toArray(), 46);
    const q = pop(t, 0.4, 2.26);
    ov.tag('ep', 'EPISOD 57', { x: W / 2, y: 268, o: q.o, s: q.s }, { bg: '#2f7bff', small: true });
    return room;
  }],
  // S2 — "Papa! Gigi Affan tercabut masa makan epal! Nanti ada gigi baru ke?"
  [2.28, 8.08, (t) => {
    const show = easeOut(inv(2.3, 2.8, t));
    affSet(t, { wow: keys(t, [[2.3, 0], [2.45, 0.9], [3.1, 0.9], [3.3, 0]]), brow: t > 5.8 ? -0.4 : 0.5, smile: t > 5.8 ? 0.4 : 0.8, armR: { reach: mix3([-0.08, 1.1, 0.62], [-0.3, 0.95, 0.75], show), pole: [-1, -0.6, -0.3] } });
    holdApple(1);
    holdBrush(t, 0);
    const ap = room.apple.position.clone();
    if (t < 5.8) camMove(t, 2.28, 5.8, ap.clone().add(V(0.5, 0.35, 2.4)).toArray(), ap.clone().add(V(0, 0.3, 0)).toArray(), ap.clone().add(V(0.3, 0.25, 1.6)).toArray(), ap.clone().add(V(0, 0.15, 0)).toArray(), 44);
    else lookCam(front(3.0), affHead().add(V(0, -0.45, 0)), 46);
    const pp = pop(t, 2.32, 3.2, { from: 2 });
    ov.bubble('papa', 'PAPA!', { x: 800, y: 470, o: pp.o, s: pp.s * 0.8, r: 6 }, { size: 110 });
    if (t < 5.8) pinTag('cabut', 'GIGI TERCABUT!', scr(room.bitTooth.g.getWorldPosition(V()).add(V(0, 0.04, 0))), t, 3.66, 5.78, { bg: RED, pointer: 'down' }, -60);
    bubble('baru', 'NANTI ADA\nGIGI BARU KE?', t, 5.84, 8.06, 430, 108, { top: '#ffffff', bot: '#9ad8ff' });
    return room;
  }],
  // S3 — "Apa jadi kalau gigi tercabut?"
  [8.08, 10.06, (t) => {
    affSet(t, { ...POSES.thinkR, brow: -0.3, smile: 0.5 });
    holdApple(0);
    const ah = affHead();
    lookCam(front(3.3), ah.clone().add(V(0, -0.35, 0)), 46);
    const hd = scr(ah.clone().add(V(0, 0.4, 0)));
    qmarks(t, hd, 8.1, 10.04, [[8.15, -260, 100, '#ffcf33', -12], [8.5, 250, 60, '#3fa2ff', 10], [8.9, 280, 240, '#ffcf33', 14]]);
    bubble('apa', 'APA JADI KALAU\nGIGI TERCABUT?', t, 8.12, 10.04, 430, 104, { top: '#fff6d0', bot: '#ffb21f' });
    return room;
  }],
  // S4 — "Jom ikut Affan cari jawapan!" then zoom into his mouth
  [10.06, 11.86, (t) => {
    holdApple(0);
    const up = keys(t, [[10.08, 0], [10.32, 1], [11.2, 1], [11.5, 0.6]], easeOut);
    affSet(t, { smile: 1, brow: 0.6, armR: { reach: [lerp(-0.6, -0.55, up), lerp(0.25, 1.95 + 0.06 * Math.sin(t * 14), up), lerp(0.2, 0.35, up)], pole: [-1, -0.3, -0.5] } });
    const ah = affHead();
    const k = easeIn(inv(10.95, 11.86, t));
    const mouth = room.aff.parts.head.localToWorld(V(0, -0.35, 0.6));
    lookCam(front(3.3).lerp(mouth.clone().add(V(0, 0, 0.25)), k), ah.clone().add(V(0, -0.35, 0)).lerp(mouth, k), 46);
    ov.swirl(t, W / 2, 820, inv(10.1, 11.8, t));
    ov.flash(inv(11.5, 11.86, t) ** 2, '255,245,250');
    return room;
  }],
  // S5 — "Gigi pertama kita dipanggil gigi susu. Budak ada dua puluh batang gigi susu."
  [11.86, 17.96, (t) => {
    const n = Math.floor(clamp(inv(15.8, 17.3, t)) * 20 + (t >= 17.3 ? 0 : 0));
    stageSet(t, { count: t >= 15.8 ? Math.max(1, n) : 0 });
    camMove(t, 11.86, 17.96, BABY_AT.clone().add(V(0, 1.9, 11.5)).toArray(), BABY_AT.clone().add(V(0, 1.8, -1.0)).toArray(), BABY_AT.clone().add(V(0.3, 1.9, 10.2)).toArray(), BABY_AT.clone().add(V(0, 1.8, -1.0)).toArray(), 48);
    ov.flash(1 - inv(11.86, 12.2, t));
    topTag('susu', 'GIGI SUSU', t, 13.7, 17.94, PINK);
    if (t >= 15.8) counter(t, 15.8, 17.94, Math.max(1, n), 'BATANG GIGI SUSU', { top: '#fff0f6', bot: '#ff7ab0', tag: PINK });
    return st;
  }],
  // S6 — under the gum the permanent tooth waits, pushes up; the milk root gets shorter
  [17.96, 27.46, (t) => {
    stageSet(t, { rise: easeInOut(inv(23.3, 27.3, t)), root: easeInOut(inv(25.0, 27.4, t)) });
    camMove(t, 17.96, 27.46, SEC_AT.clone().add(V(0, -0.7, 10.2)).toArray(), SEC_AT.clone().add(V(0, -1.0, 0)).toArray(), SEC_AT.clone().add(V(0.2, -0.6, 9.0)).toArray(), SEC_AT.clone().add(V(0, -0.9, 0)).toArray(), 50);
    ov.flash(1 - inv(17.96, 18.3, t));
    pinTag('gusi', 'GUSI', scr(secP(-2.6, GUM_TOP - 0.3)), t, 18.4, 21.7, { bg: PINK, pointer: 'down' }, -60);
    pinTag('kekal', 'GIGI KEKAL (LEBIH BESAR)', scr(st.perm.g.getWorldPosition(V()).add(V(0, -0.3, 1))), t, 19.22, 23.2, { bg: BLUE, pointer: 'up' }, 110);
    topTag('tunggu', 'SEDANG MENUNGGU...', t, 20.98, 23.3, GREY);
    const aq = pop(t, 23.36, 27.4);
    const ap = scr(st.perm.g.getWorldPosition(V()).add(V(1.7, 0.3, 0.9)));
    if (aq.o > 0) ov.html('arrow', ICONS.arrow(), { x: ap.x, y: ap.y + 20 * Math.sin(t * 6), o: aq.o, s: aq.s * 0.7, r: -90 });
    topTag('tolak', 'MENOLAK KE ATAS!', t, 23.36, 25.0, BLUE);
    pinTag('akar', 'AKAR MAKIN PENDEK', scr(secP(0, -0.55)), t, 25.04, 27.44, { bg: ORANGE, pointer: 'up' }, 100);
    return st;
  }],
  // S7 — the milk tooth wobbles... and comes out! Then the permanent tooth grows in
  [27.46, 35.88, (t) => {
    stageSet(t, { rise: 1, root: 1, wobble: t > 28.5 && t < 30.0 ? 1 : 0, out: inv(29.96, 30.8, t), grow: easeInOut(inv(31.3, 35.2, t)) });
    camMove(t, 27.46, 35.88, SEC_AT.clone().add(V(0.2, -0.4, 9.0)).toArray(), SEC_AT.clone().add(V(0, -0.6, 0)).toArray(), SEC_AT.clone().add(V(0, 0.0, 9.4)).toArray(), SEC_AT.clone().add(V(0, -0.2, 0)).toArray(), 50);
    topTag('goyang', 'GOYANG...', t, 28.6, 29.94, ORANGE);
    bubble('tercabut', 'TERCABUT!', t, 29.96, 31.1, 470, 120, { top: '#fff0f6', bot: '#ff7ab0' });
    if (t > 29.96 && t < 31.2) ov.sparkles(t, { n: 24, seed: 5, x: 300, y: 500, w: 480, h: 500, a: inv(29.96, 30.2, t) * (1 - inv(30.9, 31.2, t)) });
    topTag('tumbuh', 'GIGI KEKAL TUMBUH', t, 32.3, 35.86, BLUE);
    pinTag('kosong', 'DI TEMPAT YANG KOSONG', scr(secP(0, 2.0)), t, 34.2, 35.86, { bg: GREEN, pointer: 'down' }, -40);
    return st;
  }],
  // S8 — "Orang dewasa ada sampai tiga puluh dua batang gigi kekal ... tak akan tumbuh lagi"
  [35.88, 43.38, (t) => {
    const n = Math.floor(clamp(inv(37.3, 38.9, t)) * 32);
    stageSet(t, { countA: t >= 37.3 ? Math.max(1, n) : 0 });
    camMove(t, 35.88, 43.38, ADULT_AT.clone().add(V(0, 2.1, 14.0)).toArray(), ADULT_AT.clone().add(V(0, 2.0, -1.3)).toArray(), ADULT_AT.clone().add(V(0.3, 2.1, 12.6)).toArray(), ADULT_AT.clone().add(V(0, 2.0, -1.3)).toArray(), 48);
    ov.flash(1 - inv(35.88, 36.2, t));
    topTag('dewasa', 'ORANG DEWASA', t, 35.9, 39.8, BLUE);
    if (t >= 37.3 && t < 39.84) counter(t, 37.3, 39.8, Math.max(1, n), 'BATANG GIGI KEKAL', { top: '#eaf6ff', bot: '#4aa8ff', tag: BLUE });
    bubble('lagi', 'TAK AKAN\nTUMBUH LAGI!', t, 40.94, 43.36, 450, 112, { top: '#fff0f0', bot: '#ff6a6a' });
    const cq = pop(t, 41.3, 43.36);
    if (cq.o > 0) ov.html('cross', ICONS.cross(), { x: W / 2, y: 1150, o: cq.o, s: cq.s * 0.9 });
    return st;
  }],
  // S9 — first aid: hold the top, keep it in milk, see the dentist fast
  [43.38, 52.34, (t) => {
    stageSet(t, { demo: inv(48.7, 49.7, t) });
    camMove(t, 43.38, 52.34, DEMO_AT.clone().add(V(0.4, -0.3, 8.6)).toArray(), DEMO_AT.clone().add(V(0.4, -0.7, 0)).toArray(), DEMO_AT.clone().add(V(0.6, -0.5, 7.8)).toArray(), DEMO_AT.clone().add(V(0.6, -0.8, 0)).toArray(), 50);
    ov.flash(1 - inv(43.38, 43.7, t));
    topTag('tahu', 'TAHU TAK?', t, 43.38, 45.8, ORANGE);
    topTag('jatuh', 'GIGI KEKAL TERCABUT SEBAB JATUH?', t, 45.0, 46.84, RED);
    const bp = st.big.g.getWorldPosition(V());
    const s = st.big.g.scale.x;
    if (t < 48.7) {
      tick(t, 46.88, 48.66, scr(bp.clone().add(V(0.95 * s, 0.55 * s, 0.6))));
      const L = (q) => ({ ...q, x: Math.max(q.x, 430) });
      pinTag('atas', 'PEGANG BAHAGIAN ATAS', L(scr(bp.clone().add(V(0, 0.9 * s, 0)))), t, 47.36, 48.66, { bg: GREEN, pointer: 'down' }, -40);
      const xq = pop(t, 47.6, 48.66);
      const rp = scr(bp.clone().add(V(0.8 * s, -0.7 * s, 0.6)));
      if (xq.o > 0) ov.html('xroot', ICONS.cross(), { x: rp.x, y: rp.y, o: xq.o, s: xq.s * 0.45 });
      pinTag('akar', 'JANGAN PEGANG AKAR', L(scr(bp.clone().add(V(0, -1.25 * s, 0)))), t, 47.6, 48.66, { bg: RED, pointer: 'up' }, 80);
    }
    pinTag('susu', 'SIMPAN DALAM SUSU', scr(DEMO_AT.clone().add(V(1.6, -0.5, 0))), t, 48.68, 52.3, { bg: BLUE, pointer: 'down' }, -50);
    clock(t, 50.2, 52.3, 250, 1130);
    bubble('doktor', 'CEPAT JUMPA\nDOKTOR GIGI!', t, 50.2, 52.3, 450, 108, { top: '#eafff2', bot: '#2fbf8f' });
    return st;
  }],
  // S10 — "Waaah, rupanya gigi tercabut tu tanda kita membesar! Jaga gigi baru, gosok dua kali sehari, ya."
  [52.34, 60.26, (t) => {
    const br = t > 56.6;
    const sw = Math.sin(t * 15);
    affSet(t, { wow: keys(t, [[52.34, 0], [52.5, 0.9], [53.2, 0.9], [53.5, 0]]), smile: 1, brow: 0.6, ...(br ? { armR: { reach: [-0.42 + 0.07 * sw, 1.5, 0.72], pole: [-1, -0.6, -0.3] }, talk: 0 } : {}) });
    holdApple(0);
    holdBrush(t, br ? 1 : 0);
    const ah = affHead();
    lookCam(front(br ? 3.0 : 3.3), ah.clone().add(V(0, br ? -0.4 : -0.35, 0)), 46);
    const hd = scr(ah.clone().add(V(0, 0.5, 0)));
    const b = pop(t, 52.4, 56.3);
    ov.html('bulb', ICONS.bulb(), { x: clamp(hd.x + 220, 150, 900), y: clamp(hd.y - 170, 300, 900) + Math.sin(t * 5) * 8, o: b.o, s: b.s * 0.6, r: 10 });
    ov.sparkles(t, { n: 30, seed: 12, y: 250, h: 900, a: inv(52.4, 52.7, t) * (1 - inv(55.8, 56.4, t)) });
    bubble('besar', 'TANDA KITA\nMEMBESAR!', t, 55.06, 56.4, 430, 116, { top: '#fff6d0', bot: '#ffb21f' });
    topTag('jaga', 'JAGA GIGI BARU', t, 56.42, 58.3, GREEN);
    bubble('gosok', 'GOSOK GIGI\n2 KALI SEHARI', t, 58.36, 60.24, 430, 104, { top: '#eaf6ff', bot: '#4aa8ff' });
    return room;
  }],
  // S11 — "Apa lagi kita nak belajar lepas ni?"
  [60.26, OUTRO, (t) => {
    holdApple(0);
    holdBrush(t, 0);
    const tk = keys(t, [[60.28, 0], [60.7, 1]]);
    const th2 = POSES.thinkR.armR;
    affSet(t, { smile: 1, brow: 0.3 + 0.4 * tk, headRoll: -0.12 * tk, lookX: 0.35 * tk, lookY: 0.4 * tk, headPitch: -0.08 * tk, armR: { reach: mix3([-0.55, 0.3, 0.2], th2.reach, tk), pole: th2.pole, point: tk, wx: th2.wx * tk } });
    const ah = affHead();
    lookCam(front(3.3), ah.clone().add(V(0, -0.35, 0)), 46);
    const hd = scr(ah.clone().add(V(0, 0.45, 0)));
    qmarks(t, hd, 60.26, OUTRO - 0.05, [[60.3, -260, -100, '#ffcf33', -12], [60.6, 250, -160, '#3fa2ff', 10], [60.9, 300, 60, '#ffcf33', 14]]);
    return room;
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

// Cover / thumbnail (9:16): surprised Affan showing the apple with his tooth stuck in it.
function thumbnail() {
  ov.begin();
  cam.aspect = W / H;
  cam.updateProjectionMatrix();
  affSet(0, { wow: 0.9, brow: 0.6, smile: 1, talk: 0, armR: { reach: [-0.3, 0.95, 0.75], pole: [-1, -0.6, -0.3] } });
  holdApple(1);
  holdBrush(0, 0);
  lookCam(front(3.2, 0.2), affHead().add(V(0, -0.75, 0)), 46);
  renderer.setViewport(0, 0, W, H);
  renderer.render(room.scene, cam);
  ov.vignette(0.3);
  ov.tag('thBadge', 'EPISOD 57', { x: W / 2, y: 300 }, { bg: '#2f7bff', small: true });
  ov.bubble('thTitle', 'GIGI AFFAN', { x: W / 2, y: 445, r: -3 }, { size: 130, top: '#ffffff', bot: '#9ad8ff' });
  ov.bubble('thTitle2', 'HILANG?!', { x: W / 2, y: 600, r: 2 }, { size: 140, top: '#fff0f6', bot: '#ff7ab0' });
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
