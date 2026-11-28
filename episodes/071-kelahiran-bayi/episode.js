// THE CURIOUS AFFAN — Episode 071: "Berapa Ramai Bayi Lahir di Malaysia?"
// Every shot is a pure function of time t (seconds), synced to audio/narration.mp3.
import * as THREE from 'three';
import { makeRenderer, loadEnvelope, toScreen, clamp, lerp, inv, easeOut, easeIn, easeInOut, backOut, keys, W, H } from '../../shared/core.js';
import { POSES, blinkAt } from '../../shared/affan.js';
import { Overlay, pop, ICONS, drawLogo } from '../../shared/overlay.js';
import { CAPTIONS, KEYWORDS } from './captions.js';
import { buildNursery, buildStats, buildSeesaw, buildOutro, A_NUR, MAMA_NUR, COT } from './worlds.js';

const FPS = 30;
const DURATION = 57.05;
const OUTRO = 53.9;

const stage = document.getElementById('stage');
const canvas = document.createElement('canvas');
stage.appendChild(canvas);
const renderer = makeRenderer(canvas);
const ov = new Overlay(stage);
const nur = buildNursery();
const st = buildStats();
const saw = buildSeesaw();
const outro = buildOutro();
const cam = new THREE.PerspectiveCamera(50, W / H, 0.02, 6000);
let env = { at: () => 0 };

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const talk = (t) => clamp(env.at(t) * 1.2);
const scr = (p) => toScreen(p, cam);
const mix3 = (a, b, k) => a.map((v, i) => lerp(v, b[i], k));
const sm = (a, b, t) => easeInOut(inv(a, b, t));
const BLUE = '#2f9bff', ORANGE = '#ff8a3d', PURPLE = '#7a5cf0', GREEN = '#2fbf5f', PINK = '#ff5c9a', TEAL = '#20b8a0', RED = '#ff4d5e';
const BABY = { top: '#fff0f6', bot: '#ff7aa8' };
const SKY = { top: '#eaf6ff', bot: '#2f9bff' };
const fmt = (n) => Math.round(n).toLocaleString('en-US');

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
function hearts(t, x, y, a, b, n = 6, seed = 1) {
  if (t < a || t > b) return;
  const g = ov.g;
  for (let i = 0; i < n; i++) {
    const u = ((t - a) * 0.6 + i / n) % 1;
    const hx = x + Math.sin(i * 2.3 + seed) * 160 + Math.sin(t * 3 + i) * 12;
    const hy = y - u * 300;
    const s = 26 * (0.7 + 0.3 * Math.sin(i * 1.7));
    g.save();
    g.globalAlpha = Math.sin(u * Math.PI) * inv(a, a + 0.3, t) * (1 - inv(b - 0.3, b, t));
    g.fillStyle = ['#ff5c9a', '#ff8ab8', '#ff4d6e'][i % 3];
    g.translate(hx, hy);
    g.beginPath();
    g.moveTo(0, s * 0.35);
    g.bezierCurveTo(-s, -s * 0.4, -s * 0.45, -s * 1.1, 0, -s * 0.5);
    g.bezierCurveTo(s * 0.45, -s * 1.1, s, -s * 0.4, 0, s * 0.35);
    g.fill();
    g.restore();
  }
}
// a child icon (SVG) filled left-to-right by 'f'
const kidIcon = (f, id) => `<svg width="150" height="210" viewBox="0 0 150 210"><defs><linearGradient id="${id}" x1="0" x2="1" y1="0" y2="0"><stop offset="${f}" stop-color="#ff7aa8"/><stop offset="${f}" stop-color="#ffffff"/></linearGradient></defs>
  <circle cx="75" cy="50" r="38" fill="url(#${id})" stroke="#17256b" stroke-width="9"/><path d="M22 200 L22 140 Q22 98 75 98 Q128 98 128 140 L128 200 Z" fill="url(#${id})" stroke="#17256b" stroke-width="9" stroke-linejoin="round"/></svg>`;
const CALENDAR = `<div style="width:420px;background:#fff;border:8px solid #17256b;border-radius:30px;overflow:hidden;text-align:center"><div style="background:#ff5c9a;color:#fff;font:800 46px 'Baloo 2';padding:6px 0">1 HARI</div><div style="padding:8px 0 14px;color:#17256b;font:800 96px 'Baloo 2';line-height:1.05">1,100+<div style="font:700 44px Fredoka">bayi lahir</div></div></div>`;

// ================================================================= nursery
const affHead = () => nur.aff.parts.head.getWorldPosition(V());
const babyHead = () => nur.baby.userData.head.getWorldPosition(V());
function nurAff(t, p = {}) {
  const a = nur.aff;
  a.root.position.copy(A_NUR);
  a.pose({ yaw: -0.55, blink: blinkAt(t, 1), talk: talk(t), smile: 0.9, ...p });
  a.root.updateMatrixWorld(true);
}
function nurSet(t, { mama = true, mamaP = {}, flag = false, smile = 0.4 } = {}) {
  nur.baby.userData.breathe(t);
  nur.mobile.rotation.y = t * 0.35;
  nur.baby.userData.mouth.scale.set(1, 1, 1 + smile);
  const m = nur.mama;
  m.root.visible = mama;
  if (mama) {
    m.root.position.copy(MAMA_NUR);
    m.pose({ yaw: 0.6, blink: blinkAt(t, 5), smile: 1, headPitch: 0.15, ...mamaP });
    m.root.updateMatrixWorld(true);
  }
  nur.flag.visible = flag;
}
function holdFlag(t) {
  const hand = nur.aff.parts.arms.L.hand.getWorldPosition(V());
  nur.flag.position.copy(hand).add(V(0, -0.15, 0.05));
  nur.flag.rotation.set(0, 0.15, -0.1 + 0.15 * Math.sin(t * 4));
  nur.flag.scale.setScalar(1.3);
  nur.flag.userData.setWave(t);
}
const closeCam = (dz = 4.0) => {
  const ah = affHead();
  lookCam(ah.clone().add(V(0.15, 0.25, dz + 0.9)), ah.clone().add(V(0, -0.55, 0)), 48);
};

// ============================================================ stats stage
function statsSet(t, { grid = 0, gridA = 0, gridB = 1, bars = 0, mama = false, kidsK = 0, jobs = null, town = false, line = 0 } = {}) {
  st.bundles.forEach((b, i) => {
    const k = grid ? backOut(inv(gridA + b.userData.d * (gridB - gridA), gridA + b.userData.d * (gridB - gridA) + 0.3, t)) : 0;
    b.visible = k > 0.01;
    b.scale.setScalar(Math.max(0.001, k) * (1 + 0.04 * Math.sin(t * 4 + i)));
    b.position.y = 0;
  });
  st.bars.visible = bars > 0;
  st.barA.scale.y = Math.max(0.01, 4.56 * bars);
  st.barA.position.y = st.barA.scale.y / 2;
  st.barB.scale.y = Math.max(0.01, 4.15 * clamp(bars * 1.15 - 0.15));
  st.barB.position.y = st.barB.scale.y / 2;
  const m = st.mama;
  m.root.visible = mama;
  if (mama) {
    m.root.position.set(-0.6, 0, 0);
    m.pose({ yaw: 0.25, blink: blinkAt(t, 5), smile: 1, armR: { reach: [-0.45, 0.6, 0.45], pole: [-1, -0.6, -0.3] } });
  }
  st.kids.forEach((k, i) => {
    k.visible = mama;
    const q = backOut(inv(22.9 + i * 0.6, 23.3 + i * 0.6, t));
    k.position.set(0.6 + i * 0.95, 0, 0.6);
    k.scale.setScalar(Math.max(0.001, q * 1.35));
    if (i === 1) k.traverse((o) => o.isMesh && (o.material.opacity = 0.35 + 0.15 * Math.sin(t * 4)));
  });
  // jobs: three babies that grow into a doctor, a teacher and a firefighter
  const kids = [st.doctor, st.teacher, st.bomba];
  kids.forEach((k, i) => {
    const g = jobs ? backOut(inv(jobs[i], jobs[i] + 0.45, t)) : 0;
    k.root.visible = jobs !== null && g > 0.01;
    k.root.position.set((i - 1) * 1.75, 0, 0.4);
    k.root.scale.setScalar(Math.max(0.001, 0.8 * g));
    k.pose({ yaw: (1 - i) * 0.2, blink: blinkAt(t, 3 + i), smile: 1, brow: 0.3, ...(i === 0 ? { armR: { reach: [-0.3, 0.9, 0.5], pole: [-1, -0.6, -0.3], thumb: 1, wy: -1.2 } } : i === 1 ? { armL: { reach: [0.25, 0.85, 0.55], pole: [1, -0.6, -0.3] } } : POSES.thumbsUpR) });
    k.root.updateMatrixWorld(true);
  });
  st.book.visible = jobs !== null && st.teacher.root.visible;
  if (st.book.visible) {
    const h = st.teacher.parts.arms.L.hand.getWorldPosition(V());
    st.book.position.copy(h).add(V(0.1, 0.12, 0.08));
    st.book.rotation.set(-0.2, 0.3, 0.1);
    st.book.scale.setScalar(st.teacher.root.scale.x);
  }
  st.school.visible = st.hospital.visible = town;
  if (town) {
    st.school.position.set(-2.1, 0, -1.4);
    st.hospital.position.set(2.2, 0, -1.4);
    st.school.userData.flag.userData.setWave(t);
  }
  // a line of babies marching towards the town
  if (line > 0) {
    st.bundles.slice(0, 8).forEach((b, i) => {
      b.visible = true;
      const u = (t * 0.35 + i / 8) % 1;
      const side = i % 2 ? 1 : -1;
      b.position.set(side * lerp(0.3, 2.0, u), 0.12 * Math.abs(Math.sin(t * 8 + i)), lerp(3.4, 0.2, u));
      b.scale.setScalar(0.9 * Math.min(1, Math.sin(u * Math.PI) * 3) * line);
      b.rotation.y = side * -0.6;
    });
  }
}

// ============================================================ the seesaw
function sawSet(t, n, tilt) {
  saw.plank.rotation.z = tilt;
  saw.elders.forEach((e, i) => {
    const k = backOut(inv(n[i], n[i] + 0.35, t));
    e.root.visible = k > 0.01;
    e.root.scale.setScalar(Math.max(0.001, 0.56 * k));
    e.root.rotation.z = -tilt;
    e.pose({ ...POSES.seated, yaw: 0.15, blink: blinkAt(t, 7 + i), smile: 1, headYaw: 0.15 });
  });
  saw.young.root.rotation.z = -tilt;
  const worried = clamp(tilt / 0.2);
  saw.young.pose({ ...POSES.seated, yaw: -0.15, blink: blinkAt(t, 12), smile: 1 - worried, brow: -0.6 * worried, wow: 0.4 * worried, armL: { reach: [0.45, 0.5, 0.35], pole: [1, -1, 0] }, armR: { reach: [-0.45, 0.5, 0.35], pole: [-1, -1, 0] } });
}

// ================================================================== SHOTS
const SHOTS = [
  // S1 — Affan beside the cot
  [0, 2.18, (t) => {
    nurSet(t);
    nurAff(t, { talk: 0, headYaw: 0.25 });
    const ah0 = affHead();
    camMove(t, 0, 2.18, [ah0.x + 0.3, ah0.y + 0.4, ah0.z + 6.6], [ah0.x - 0.6, ah0.y - 0.9, ah0.z], [ah0.x + 0.2, ah0.y + 0.3, ah0.z + 5.6], [ah0.x - 0.5, ah0.y - 0.8, ah0.z], 48);
    const q = pop(t, 0.4, 2.15);
    ov.tag('ep', 'EPISOD 71', { x: W / 2, y: 268, o: q.o, s: q.s }, { bg: '#2f7bff', small: true });
    return nur;
  }],
  // S2 — "Papa! Adik sepupu Affan baru lahir,"
  [2.18, 5.12, (t) => {
    nurSet(t);
    nurAff(t, { brow: 0.5, smile: 1, armR: { reach: [-0.45, 1.0, 0.6], pole: [-1, -0.6, -0.3], point: sm(3.1, 3.4, t) } });
    if (t < 3.15) closeCam(4.0);
    else camMove(t, 3.15, 5.12, [COT.x - 1.0, 3.7, COT.z + 3.9], [COT.x - 0.4, 1.3, COT.z], [COT.x - 0.9, 3.6, COT.z + 3.2], [COT.x - 0.5, 1.2, COT.z], 48);
    const pp = pop(t, 2.2, 3.12, { from: 2 });
    ov.bubble('papa', 'PAPA!', { x: 800, y: 470, o: pp.o, s: pp.s * 0.8, r: 6 }, { size: 110 });
    pinTag('adik', 'ADIK SEPUPU', scr(babyHead()), t, 3.2, 5.1, { bg: PINK, pointer: 'down' }, -120);
    bubble('lahir', 'BARU LAHIR!', t, 4.1, 5.1, 430, 116, BABY);
    return nur;
  }],
  // S3 — "comel sangat!" (close on the baby)
  [5.12, 6.66, (t) => {
    nurSet(t, { smile: 0.6 + 0.4 * Math.sin(t * 3) });
    nurAff(t, { talk: 0 });
    const bh = babyHead();
    lookCam(bh.clone().add(V(0.9, 1.5, 1.6)), bh.clone().add(V(0.25, 0, 0)), 46);
    ov.flash(1 - inv(5.12, 5.4, t));
    hearts(t, W / 2, 900, 5.2, 6.64, 7, 2);
    bubble('comel', 'COMEL SANGAT!', t, 5.2, 6.64, 430, 120, BABY);
    return nur;
  }],
  // S4 — "Berapa ramai bayi lahir di Malaysia?"
  [6.66, 9.04, (t) => {
    nurSet(t);
    nurAff(t, { ...POSES.thinkR, brow: -0.3, smile: 0.5 });
    closeCam(4.0);
    const hd = scr(affHead().add(V(0, 0.45, 0)));
    qmarks(t, hd, 6.7, 9.02, [[6.75, -260, 80, '#ffcf33', -12], [7.05, 250, 40, '#ff7aa8', 10], [7.35, 280, 220, '#ffcf33', 14]]);
    bubble('berapa', 'BERAPA RAMAI BAYI\nLAHIR DI MALAYSIA?', t, 6.75, 9.02, 430, 92, BABY);
    return nur;
  }],
  // S5 — "Jom ikut Affan cari jawapan!"
  [9.04, 11.12, (t) => {
    nurSet(t);
    const up = keys(t, [[9.06, 0], [9.3, 1], [10.1, 1], [10.4, 0.6]], easeOut);
    nurAff(t, { smile: 1, brow: 0.6, armR: { reach: [lerp(-0.6, -0.55, up), lerp(0.25, 1.95 + 0.06 * Math.sin(t * 14), up), lerp(0.2, 0.35, up)], pole: [-1, -0.3, -0.5] } });
    const ah = affHead();
    const k = easeIn(inv(10.2, 11.12, t));
    lookCam(ah.clone().add(V(0.15, 0.1, 4.0)).lerp(ah.clone().add(V(0.05, -0.2, 0.9)), k), ah.clone().add(V(0, -0.4, 0)), 48);
    ov.swirl(t, W / 2, 820, inv(9.15, 11.0, t));
    ov.flash(inv(10.75, 11.12, t) ** 2, '255,240,248');
    return nur;
  }],
  // S6 — "Pada tahun 2024, lebih 400,000 bayi lahir di Malaysia."
  [11.12, 16.5, (t) => {
    statsSet(t, { grid: 1, gridA: 11.3, gridB: 15.2 });
    camMove(t, 11.12, 16.5, [0, 6.8, 9.6], [0, 0.2, 0], [0, 6.0, 8.4], [0, 0.4, 0], 50);
    ov.flash(1 - inv(11.12, 11.45, t));
    topTag('tahun', 'TAHUN 2024', t, 11.2, 16.48, BLUE);
    const n = 414918 * easeOut(inv(13.4, 15.6, t));
    const q = pop(t, 13.4, 16.48, { from: 2 });
    if (q.o > 0) ov.bubble('count', fmt(n), { x: W / 2, y: 470, o: q.o, s: q.s }, { size: 150, ...BABY });
    topTag('bayi', 'BAYI LAHIR DI MALAYSIA', t, 14.7, 16.48, PINK, 610);
    return st;
  }],
  // S7 — "Itu lebih 1,100 bayi setiap hari!"
  [16.5, 19.8, (t) => {
    statsSet(t, { grid: 1, gridA: 0, gridB: 0.1 });
    camMove(t, 16.5, 19.8, [0, 6.0, 8.4], [0, 0.4, 0], [1.2, 3.2, 5.6], [0, 0.6, 0], 50);
    const q = pop(t, 16.9, 19.78);
    if (q.o > 0) ov.html('cal', CALENDAR, { x: W / 2, y: 520, o: q.o, s: q.s });
    bubble('setiap', 'SETIAP HARI!', t, 18.5, 19.78, 1180, 110, BABY);
    return st;
  }],
  // S8 — "Tapi jumlah ni makin berkurang."
  [19.8, 22.44, (t) => {
    statsSet(t, { bars: easeOut(inv(20.0, 21.2, t)) });
    lookCam(V(0, 3.2, 10.5), V(0, 2.4, 0), 50);
    ov.flash(1 - inv(19.8, 20.1, t));
    topTag('tapi', 'TAPI...', t, 19.85, 21.0, PURPLE);
    pinTag('y23', '2023: ' + fmt(455761 * easeOut(inv(20.0, 21.0, t))), scr(V(-1.0, 4.56 * easeOut(inv(20.0, 21.2, t)), 0.5)), t, 20.1, 22.42, { bg: BLUE }, -70);
    pinTag('y24', '2024: ' + fmt(414918 * easeOut(inv(20.4, 21.4, t))), scr(V(1.0, 4.15 * easeOut(inv(20.0, 21.2, t)), 0.5)), t, 20.5, 22.42, { bg: ORANGE }, 70);
    const qa = pop(t, 21.54, 22.42);
    if (qa.o > 0) {
      ov.html('down', ICONS.arrow(RED), { x: 870, y: 980, o: qa.o, s: qa.s * 0.8, r: 60 });
      ov.tag('turun', 'TURUN 9%', { x: 820, y: 1140, o: qa.o, s: qa.s }, { bg: RED });
    }
    return st;
  }],
  // S9 — "Purata setiap ibu kini ada 1.6 anak sahaja."
  [22.44, 26.92, (t) => {
    statsSet(t, { mama: true });
    camMove(t, 22.44, 26.92, [0.4, 2.7, 9.6], [0.35, 1.9, 0], [0.4, 2.6, 8.9], [0.35, 1.85, 0], 50);
    ov.flash(1 - inv(22.44, 22.7, t));
    topTag('purata', 'PURATA SETIAP IBU', t, 22.5, 26.9, PURPLE);
    const q1 = pop(t, 24.3, 26.9);
    if (q1.o > 0) {
      ov.html('k1', kidIcon(1, 'g1'), { x: 300, y: 520, o: q1.o, s: q1.s * 0.7 });
      ov.html('k2', kidIcon(0.6, 'g2'), { x: 440, y: 520, o: q1.o, s: q1.s * 0.7 });
      ov.bubble('satu6', '= 1.6', { x: 700, y: 515, o: q1.o, s: q1.s, r: 4 }, { size: 130, ...BABY });
    }
    bubble('anak', 'ANAK SAHAJA', t, 25.68, 26.9, 1200, 104, BABY);
    return st;
  }],
  // S10 — "Kenapa penting? Bayi hari ni akan jadi..."
  [26.92, 29.66, (t) => {
    statsSet(t, { jobs: [99, 99, 99] });
    st.bundles.slice(0, 3).forEach((b, i) => {
      b.visible = true;
      b.position.set((i - 1) * 1.75, 0, 0.4);
      b.scale.setScalar(1.3 * backOut(inv(27.9 + i * 0.2, 28.3 + i * 0.2, t)) + 0.001);
    });
    lookCam(V(0, 2.3, 8.6), V(0, 1.2, 0), 50);
    ov.flash(1 - inv(26.92, 27.2, t));
    bubble('penting', 'KENAPA PENTING?', t, 26.96, 29.64, 430, 112, SKY);
    return st;
  }],
  // S11 — "doktor, cikgu dan bomba masa depan!"
  [29.66, 32.88, (t) => {
    const J = [29.7, 30.6, 31.3];
    statsSet(t, { jobs: J });
    st.bundles.slice(0, 3).forEach((b, i) => {
      const k = 1 - inv(J[i] - 0.1, J[i] + 0.2, t);
      b.visible = k > 0.01;
      b.position.set((i - 1) * 1.75, 0, 0.4);
      b.scale.setScalar(1.3 * k + 0.001);
    });
    lookCam(V(0, 2.4, 8.8), V(0, 1.3, 0), 50);
    ['DOKTOR', 'CIKGU', 'BOMBA'].forEach((n, i) => {
      const p = scr(V((i - 1) * 1.75, 2.45, 0.4));
      const q = pop(t, J[i] + 0.05, 32.86);
      if (q.o > 0) ov.tag('job' + i, n, { x: clamp(p.x, 160, 920), y: p.y - 60 - (i % 2) * 70, o: q.o, s: q.s * 0.85 }, { bg: [BLUE, PURPLE, RED][i], small: true });
    });
    ov.sparkles(t, { n: 24, seed: 30, y: 600, h: 700, a: inv(29.7, 30.0, t) * (1 - inv(32.5, 32.86, t)) });
    bubble('masa', 'MASA DEPAN!', t, 31.72, 32.86, 430, 120, SKY);
    return st;
  }],
  // S12 — "Kerajaan pun perlu kira, supaya cukup sekolah dan hospital."
  [32.88, 37.06, (t) => {
    statsSet(t, { town: true, line: easeOut(inv(32.9, 33.4, t)) });
    camMove(t, 32.88, 37.06, [0, 3.8, 12.8], [0, 1.5, 0], [0, 3.5, 12.0], [0, 1.6, 0], 52);
    ov.flash(1 - inv(32.88, 33.15, t));
    topTag('kira', 'KERAJAAN PERLU KIRA', t, 32.95, 35.2, PURPLE);
    const n = Math.floor(clamp((t - 33.4) * 9, 0, 99));
    const q = pop(t, 33.4, 35.2);
    if (q.o > 0) ov.bubble('kiraN', String(n), { x: W / 2, y: 520, o: q.o, s: q.s }, { size: 140, ...BABY });
    pinTag('sek', 'CUKUP SEKOLAH', scr(V(-2.1, 3.6, -1.4)), t, 35.24, 37.04, { bg: BLUE, pointer: 'down' }, -30);
    pinTag('hos', 'CUKUP HOSPITAL', scr(V(2.2, 3.6, -1.4)), t, 36.0, 37.04, { bg: TEAL, pointer: 'down' }, -130);
    return st;
  }],
  // S13 — "Tahu tak? Kalau bayi terlalu sedikit, nanti ramai atuk dan nenek,
  //        tapi kurang orang muda untuk jaga mereka."
  [37.06, 45.24, (t) => {
    const N = [99, 40.2, 40.7, 41.2];
    const tilt = lerp(-0.06, 0.24, sm(40.2, 41.9, t));
    sawSet(t, t < 40.2 ? [37.9, 99, 99, 99] : [0, ...N.slice(1)], tilt);
    if (t < 40.1) camMove(t, 37.06, 40.1, [0, 3.6, 19.5], [0, 2.3, 0], [0, 3.4, 18.5], [0, 2.2, 0], 50);
    else if (t < 42.1) camMove(t, 40.1, 42.1, [0, 3.4, 18.5], [0, 2.2, 0], [-1.6, 2.6, 10.5], [-2.0, 1.5, 0], 50);
    else camMove(t, 42.1, 45.24, [-1.6, 2.6, 10.5], [-2.0, 1.5, 0], [2.4, 3.9, 11.5], [2.9, 2.6, 0], 50);
    ov.flash(1 - inv(37.06, 37.4, t));
    topTag('tahu', 'TAHU TAK?', t, 37.1, 37.88, ORANGE);
    bubble('sikit', 'BAYI TERLALU\nSEDIKIT...', t, 37.9, 40.12, 430, 104, BABY);
    pinTag('atuk', 'RAMAI ATUK & NENEK', scr(V(-2.5, 2.2, 0)), t, 40.2, 45.2, { bg: PURPLE }, -170);
    pinTag('muda', 'KURANG ORANG MUDA', scr(saw.young.root.getWorldPosition(V()).add(V(0, 1.6, 0))), t, 42.2, 45.2, { bg: ORANGE, pointer: 'down' }, -40);
    return saw;
  }],
  // S14 — "Waaah,"
  [45.24, 46.24, (t) => {
    nurSet(t);
    nurAff(t, { wow: keys(t, [[45.26, 0], [45.45, 1], [46.0, 1], [46.2, 0.3]]), brow: 0.8, talk: 0 });
    closeCam(4.0);
    ov.flash(1 - inv(45.24, 45.55, t));
    bubble('waah', 'WAAAH!', t, 45.3, 46.22, 430, 140);
    return nur;
  }],
  // S15 — "rupanya setiap bayi penting untuk negara!"
  [46.24, 49.78, (t) => {
    nurSet(t, { flag: true });
    nurAff(t, { smile: 1, brow: 0.5, armL: { reach: [0.8, 1.55, 0.35], pole: [1, -0.6, -0.3] }, yaw: -0.2 });
    holdFlag(t);
    camMove(t, 46.24, 49.78, [1.5, 3.0, 7.8], [1.5, 2.1, -0.3], [1.6, 2.9, 7.0], [1.6, 2.1, -0.3], 50);
    bubble('negara', 'SETIAP BAYI PENTING\nUNTUK NEGARA!', t, 46.8, 49.76, 430, 92, BABY);
    return nur;
  }],
  // S16 — "Sayang adik-adik kita, ya."
  [49.78, 51.7, (t) => {
    nurSet(t, { smile: 1, mamaP: { headYaw: -0.2 } });
    nurAff(t, { smile: 1, lean: 0.3, headPitch: 0.3, yaw: -0.9, talk: talk(t) * 0.6, armR: { reach: [-0.2, 0.75, 0.7], pole: [-1, -0.6, -0.3] } });
    const bh = babyHead();
    const mid = bh.clone().lerp(affHead(), 0.5);
    lookCam(mid.clone().add(V(-0.6, 1.1, 6.0)), mid.clone().add(V(0.35, -0.2, 0)), 50);
    hearts(t, W / 2, 1000, 49.9, 51.68, 8, 5);
    bubble('sayang', 'SAYANG ADIK-ADIK!', t, 49.9, 51.68, 430, 110, BABY);
    return nur;
  }],
  // S17 — "Apa lagi kita nak belajar lepas ni?"
  [51.7, OUTRO, (t) => {
    nurSet(t);
    nurAff(t, { ...POSES.thinkR, brow: -0.2, smile: 0.7 });
    closeCam(4.0);
    const hd = scr(affHead().add(V(0, 0.45, 0)));
    qmarks(t, hd, 51.74, OUTRO - 0.05, [[51.8, -260, -100, '#ffcf33', -12], [52.1, 250, -160, '#3fa2ff', 10], [52.4, 300, 60, '#ffcf33', 14]]);
    return nur;
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
  if (w.sky) w.sky.position.copy(cam.position);
  renderer.setViewport(0, 0, W, H);
  renderer.render(w.scene, cam);
  if (w !== outro) ov.vignette(0.2);
  ov.captions(t, CAPTIONS, KEYWORDS);
  ov.end();
}

// Cover / thumbnail (9:16): Affan and the sleeping baby cousin in the cot.
function thumbnail() {
  ov.begin();
  cam.aspect = W / H;
  cam.updateProjectionMatrix();
  const t = 50.5;
  nurSet(t, { smile: 1 });
  nurAff(t, { smile: 1, brow: 0.6, wow: 0.4, talk: 0, yaw: -0.7, armR: { reach: [-0.45, 1.0, 0.6], pole: [-1, -0.6, -0.3], point: 1 } });
  const bh = babyHead();
  const mid = bh.clone().lerp(affHead(), 0.5);
  lookCam(mid.clone().add(V(-0.3, 2.4, 7.4)), mid.clone().add(V(0.25, 1.0, 0)), 50);
  renderer.setViewport(0, 0, W, H);
  renderer.render(nur.scene, cam);
  ov.vignette(0.3);
  ov.tag('thBadge', 'EPISOD 71', { x: W / 2, y: 300 }, { bg: '#2f7bff', small: true });
  ov.bubble('thTitle', 'BERAPA RAMAI', { x: W / 2, y: 445, r: -3 }, { size: 110 });
  ov.bubble('thTitle2', 'BAYI LAHIR?', { x: W / 2, y: 590, r: 2 }, { size: 140, ...BABY });
  ov.html('thQ', ICONS.qmark('#ffcf33'), { x: 150, y: 760, r: -14, s: 0.9 });
  hearts(1.0, 260, 1330, 0, 99, 5, 3);
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
