// THE CURIOUS AFFAN — Episode 039: "Macam Mana Kuku Kita Boleh Panjang?"
// Every shot is a pure function of time t (seconds), synced to audio/narration.mp3.
import * as THREE from 'three';
import { makeRenderer, loadEnvelope, toScreen, clamp, lerp, inv, easeOut, easeIn, easeInOut, keys, rng, W, H } from '../../shared/core.js';
import { POSES, blinkAt } from '../../shared/affan.js';
import { Overlay, pop, ICONS, drawLogo } from '../../shared/overlay.js';
import { CAPTIONS, KEYWORDS } from './captions.js';
import { buildRoom, buildHand, buildFingertip, buildOutro, A_LR, MAMA_LR, TIP_Y, ROOT_Y, NAIL_X, TILE, N_TILES } from './worlds.js';

const FPS = 30;
const DURATION = 79.55;
const OUTRO = 76.4;

const stage = document.getElementById('stage');
const canvas = document.createElement('canvas');
stage.appendChild(canvas);
const renderer = makeRenderer(canvas);
const ov = new Overlay(stage);
const room = buildRoom();
const handW = buildHand();
const tip = buildFingertip();
const outro = buildOutro();
const cam = new THREE.PerspectiveCamera(50, W / H, 0.02, 6000);
let env = { at: () => 0 };

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const talk = (t) => clamp(env.at(t) * 1.2);
const scr = (p) => toScreen(p, cam);
const mix3 = (a, b, k) => a.map((v, i) => lerp(v, b[i], k));
const BLUE = '#2f9bff', YELLOW = '#e0b400', ORANGE = '#ff8a3d', PURPLE = '#7a5cf0', GREEN = '#2fbf5f', PINK = '#ff5c9a', TEAL = '#20b8a0';

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
// a calendar card (HTML) with N days and circled cut days every 'every' days
function calendar(id, title, every, days, x, y, t, a, b, color) {
  const q = pop(t, a, b);
  if (q.o <= 0) return;
  const cells = Array.from({ length: days }, (_, i) => {
    const d = i + 1;
    const on = d % every === 0;
    return `<div style="width:56px;height:56px;line-height:56px;border-radius:14px;margin:4px;display:inline-block;background:${on ? color : '#f2f4fa'};color:${on ? '#fff' : '#17256b'};font:800 30px 'Baloo 2'">${on ? '✂' : d}</div>`;
  }).join('');
  ov.html(id, `<div style="width:460px;background:#fff;border:8px solid #17256b;border-radius:28px;overflow:hidden;text-align:center"><div style="background:${color};color:#fff;font:800 38px 'Baloo 2';padding:6px 0">${title}</div><div style="padding:10px 6px">${cells}</div></div>`, { x, y, o: q.o, s: q.s * 0.85 });
}

// ------------------------------------------------------------- living room
const A_STAND = V(0.6, 0, 0.6);
function standAff(t, p = {}) {
  const a = room.aff;
  a.root.position.copy(A_STAND);
  a.pose({ yaw: 0, blink: blinkAt(t, 1), talk: talk(t), smile: 0.9, ...p });
  a.root.updateMatrixWorld(true);
}
const SIT_Y = 0.16;
function sitAff(t, p = {}) {
  const a = room.aff;
  a.root.position.copy(A_LR).add(V(0, SIT_Y, 0));
  a.pose({ ...POSES.seated, yaw: 0, blink: blinkAt(t, 1), talk: talk(t), smile: 0.9, ...p });
  a.root.updateMatrixWorld(true);
}
function mamaHide() {
  room.mama.root.visible = false;
  room.clipper.visible = false;
}
const affHead = () => room.aff.parts.head.getWorldPosition(V());
function roomGerms(t, a, b) {
  room.germs.forEach((g, i) => (g.visible = false));
  if (t < a || t > b) return;
  const hand = room.aff.parts.arms.R.hand.getWorldPosition(V());
  const mouth = room.aff.parts.head.localToWorld(V(0, -0.35, 0.7));
  room.germs.forEach((g, i) => {
    const u = clamp((t - a - i * 0.12) / 1.0);
    g.visible = u > 0 && u < 1;
    g.position.copy(hand).lerp(mouth, easeInOut(u)).add(V(Math.sin(i * 2 + t * 6) * 0.08, Math.sin(u * Math.PI) * 0.25, 0));
    g.scale.setScalar(0.18);
    g.material.opacity = 0.9;
  });
}

// --------------------------------------------------------------- the hand
function handGerms(t, show) {
  handW.germs.forEach((g, i) => {
    g.visible = show > 0.01;
    if (!g.visible) return;
    const n = handW.nails[i % handW.nails.length];
    const tip = n.free.localToWorld(V(0, 0, 0));
    g.position.copy(tip).add(V((i % 3 - 1) * 0.16, -0.05 + Math.floor(i / 4) * 0.12 + 0.03 * Math.sin(t * 5 + i), 0.12));
    g.scale.setScalar(show * (0.8 + 0.2 * Math.sin(t * 6 + i)));
    g.rotation.z = 0.3 * Math.sin(t * 3 + i);
  });
}
function handReset() {
  handW.scratch.visible = false;
  handW.clipper.visible = false;
  handW.germs.forEach((g) => (g.visible = false));
}

// ---------------------------------------------------------- the fingertip
// g: growth (y units); top: hide tiles above this y (unless falling); cut: tiles above cutY fall
function tipSet(t, { g = 0, top = TIP_Y + 0.9, cutY = 99, fall = 0, cells = 0, nerve = 0.4, matrix = 0.6 } = {}) {
  tip.tiles.forEach((m, i) => {
    const y = ROOT_Y - 1.0 + i * TILE + g;
    const born = inv(ROOT_Y + 0.05, ROOT_Y + 0.75, y);
    const falling = y > cutY && fall > 0;
    m.visible = y > ROOT_Y + 0.05 && (y <= top || falling);
    m.position.set(NAIL_X, y, 0);
    m.rotation.set(0, 0, 0);
    if (falling) {
      m.position.x += 0.4 + fall * 2.2;
      m.position.y += -fall * fall * 6 + fall * 0.6;
      m.rotation.z = -fall * 2.5;
    }
    // freshly made cells are puffy; older ones are flattened and hard
    m.scale.set(lerp(2.0, 1, born), lerp(0.7, 1, born), 1);
    m.material.color.setHex(0xffc8e8).lerp(new THREE.Color(y > TIP_Y ? 0xffffff : 0xfff0e2), born);
  });
  tip.cells.forEach((c, i) => {
    const u = ((t * 0.7 + i / tip.cells.length) % 1);
    c.visible = cells > 0.01;
    if (!c.visible) return;
    const from = V(1.2, ROOT_Y - 0.35, tip.FZ + 0.12), to = V(NAIL_X, ROOT_Y + 0.3, tip.FZ + 0.12);
    c.position.copy(from).lerp(to, easeInOut(u));
    c.scale.set(cells * lerp(1.1, 0.6, u), cells * lerp(1.1, 0.4, u), cells);
  });
  tip.nerveMat.emissiveIntensity = nerve;
  tip.matrixMesh.material.emissiveIntensity = matrix;
  tip.matrixGlow.material.opacity = 0.25 + 0.5 * matrix;
  tip.clipper.visible = false;
  tip.aff.root.visible = false;
}

// ======================================================================= SHOTS
const SHOTS = [
  // S1 — living room: Affan looks at his fingers
  [0, 3.0, (t) => {
    mamaHide();
    standAff(t, { headPitch: 0.3, lookY: -0.3, armL: { reach: [0.35, 1.3, 0.75], pole: [1, -0.5, -0.2], wx: -1.2 }, armR: { reach: [-0.35, 1.3, 0.75], pole: [-1, -0.5, -0.2], wx: -1.2 } });
    camMove(t, 0, 3.0, [1.2, 2.6, 6.2], [0.6, 1.8, 0.6], [1.0, 2.5, 5.2], [0.6, 1.9, 0.6], 50);
    const q = pop(t, 0.4, 2.95);
    ov.tag('ep', 'EPISOD 39', { x: W / 2, y: 268, o: q.o, s: q.s }, { bg: '#2f7bff', small: true });
    return room;
  }],
  // S2 — giant hand: "Papa! Kuku Affan dah panjang lagi! Minggu lepas baru potong..."
  [3.0, 7.08, (t) => {
    handReset();
    handW.setNails(lerp(0.35, 0.55, inv(3.0, 7.0, t)), 0.15);
    handW.hand.rotation.set(0, 0.08 * Math.sin(t * 0.8), 0.04 * Math.sin(t));
    camMove(t, 3.0, 7.08, [0.3, 1.8, 6.4], [0, 1.4, 0], [0.2, 2.0, 5.2], [0, 1.7, 0], 50);
    ov.flash((1 - inv(3.0, 3.25, t)) * 0.5);
    const pp = pop(t, 3.08, 3.8, { from: 2 });
    ov.bubble('papa', 'PAPA!', { x: 800, y: 470, o: pp.o, s: pp.s * 0.8, r: 6 }, { size: 110 });
    bubble('panjang', 'KUKU DAH PANJANG!', t, 3.62, 5.0, 430, 100, { top: '#ffe0f0', bot: '#ff5c9a' });
    calendar('cal1', 'MINGGU LEPAS', 7, 7, W / 2, 1180, t, 5.1, 7.0, PINK);
    return handW;
  }],
  // S3 — "Macam mana kuku boleh panjang sendiri?"
  [7.08, 9.48, (t) => {
    mamaHide();
    standAff(t, { ...POSES.thinkR, brow: -0.3, smile: 0.5, headPitch: 0.05 });
    const ah = affHead();
    lookCam(ah.clone().add(V(0.4, 0.0, 3.9)), ah.clone().add(V(0, -0.5, 0)), 46);
    const hd = scr(ah.clone().add(V(0, 0.45, 0)));
    qmarks(t, hd, 7.08, 9.45, [[7.15, -260, 120, '#ffcf33', -12], [7.5, 250, 80, '#3fa2ff', 10], [7.9, 280, 260, '#ffcf33', 14]]);
    bubble('macam', 'MACAM MANA?', t, 7.08, 9.45, 430, 120, { top: '#fff6d0', bot: '#ffb21f' });
    return room;
  }],
  // S4 — "Jom ikut Affan cari jawapan!" swirl into a fingertip
  [9.48, 11.46, (t) => {
    mamaHide();
    const up = keys(t, [[9.5, 0], [9.75, 1], [11.0, 1], [11.3, 0.6]], easeOut);
    standAff(t, { smile: 1, brow: 0.6, armR: { reach: [lerp(-0.6, -0.55, up), lerp(0.25, 1.95 + 0.06 * Math.sin(t * 14), up), lerp(0.2, 0.35, up)], pole: [-1, -0.3, -0.5] } });
    const ah = affHead();
    const fingertip = room.aff.parts.arms.R.hand.getWorldPosition(V());
    const k = easeIn(inv(10.0, 11.46, t));
    lookCam(ah.clone().add(V(0.4, 0.0, 3.9)).lerp(fingertip.clone().add(V(0, 0.1, 0.4)), k), ah.clone().add(V(0, -0.5, 0)).lerp(fingertip, k), 46);
    ov.swirl(t, W / 2, 820, inv(9.7, 11.4, t));
    ov.flash(inv(11.05, 11.46, t) ** 2);
    return room;
  }],
  // S5 — inside the fingertip: keratin, like hair; the secret is the nail root under the skin
  [11.46, 20.72, (t) => {
    tipSet(t, { g: 0, top: TIP_Y + 0.5, matrix: 0.4 + 0.9 * inv(18.0, 18.5, t) * (0.7 + 0.3 * Math.sin(t * 6)) });
    if (t < 17.5) camMove(t, 11.46, 17.5, [0.4, -0.6, 13.5], [0.2, -0.8, 0], [0.8, 0.4, 10.5], [0.7, 0.4, 0], 50);
    else camMove(t, 17.5, 20.72, [0.8, 0.4, 10.5], [0.7, 0.4, 0], [1.6, ROOT_Y + 0.2, 5.0], [1.2, ROOT_Y, 0], 48);
    ov.flash(1 - inv(11.46, 11.8, t));
    pinTag('kuku', 'KUKU', scr(V(NAIL_X, 1.2, 1.3)), t, 11.86, 13.1, { bg: PINK, pointer: 'down' }, -40);
    bubble('keratin', 'KERATIN', t, 13.22, 16.7, 400, 150, { top: '#d6fff0', bot: '#20b8a0' });
    const q = pop(t, 15.5, 16.7);
    if (q.o > 0) ov.tag('rambut', 'SAMA MACAM RAMBUT', { x: W / 2, y: 540, o: q.o, s: q.s }, { bg: '#8a5a36', small: true });
    pinTag('akar', 'AKAR KUKU', scr(V(1.25, ROOT_Y - 0.25, tip.FZ)), t, 18.04, 20.7, { bg: PURPLE, pointer: 'down' }, -60);
    topTag('bawahkulit', 'TERSOROK BAWAH KULIT', t, 18.98, 20.7, ORANGE);
    return tip;
  }],
  // S6 — new cells every day push old ones forward; old ones go hard and flat; the nail grows
  [20.72, 33.98, (t) => {
    const g = 0.8 * easeInOut(inv(24.6, 32.8, t));
    tipSet(t, { g, top: TIP_Y + 0.5 + g, cells: inv(21.6, 22.3, t), matrix: 0.9 + 0.3 * Math.sin(t * 6) });
    if (t < 27.2) camMove(t, 20.72, 27.2, [1.6, ROOT_Y + 0.2, 5.0], [1.2, ROOT_Y, 0], [2.0, ROOT_Y + 1.0, 5.6], [1.4, ROOT_Y + 0.8, 0], 48);
    else if (t < 31.6) camMove(t, 27.2, 31.6, [2.0, ROOT_Y + 1.0, 5.6], [1.4, ROOT_Y + 0.8, 0], [2.4, 0.6, 7.0], [1.5, 0.6, 0], 48);
    else camMove(t, 31.6, 33.98, [2.4, 0.6, 7.0], [1.5, 0.6, 0], [1.2, 1.2, 11.5], [0.6, 1.2, 0], 50);
    topTag('baru', 'SEL BARU SETIAP HARI', t, 22.24, 24.5, PINK);
    pinTag('tolak', 'TOLAK KE DEPAN ↑', scr(V(NAIL_X, ROOT_Y + 1.0, 1.3)), t, 25.2, 27.3, { bg: ORANGE, pointer: 'down' }, -40);
    topTag('keras', 'KERAS DAN RATA', t, 27.98, 29.9, '#8a5a36');
    bubble('kepingan', 'KEPINGAN BERSUSUN', t, 30.14, 31.7, 400, 96, { top: '#fff0e2', bot: '#e8a06a' });
    bubble('makin', 'MAKIN PANJANG!', t, 32.3, 33.95, 400, 120, { top: '#fff6d0', bot: '#ffb21f' }, 3);
    return tip;
  }],
  // S7 — the long part has no nerves, so cutting it doesn't hurt
  [33.98, 39.58, (t) => {
    const cutT = 37.9;
    const fall = inv(cutT, cutT + 1.2, t);
    const cutY = TIP_Y + 0.25;
    tipSet(t, { g: 0.8, top: t < cutT ? TIP_Y + 1.3 : cutY, cutY, fall, nerve: 0.4 + 1.2 * inv(34.3, 34.8, t) * (0.7 + 0.3 * Math.sin(t * 7)) });
    // the clipper comes in from the right and snips
    const c = tip.clipper;
    c.visible = t > 36.4;
    const inK = easeOut(inv(36.4, 37.4, t));
    c.position.set(lerp(6.5, NAIL_X - 0.75, inK) + (t > 38.6 ? (t - 38.6) * 4 : 0), cutY - 0.15, 1.4);
    c.rotation.set(0, 0, 0);
    c.userData.set(1 - inv(37.6, cutT, t) + inv(cutT + 0.2, cutT + 0.5, t));
    camMove(t, 33.98, 39.58, [1.4, 1.6, 9.5], [0.8, 1.4, 0], [1.8, 2.4, 7.5], [1.2, 2.2, 0], 50);
    pinTag('saraf', 'SARAF', scr(V(-1.0, -1.0, tip.FZ)), t, 34.3, 37.3, { bg: '#e0b400', pointer: 'down' }, -40);
    pinTag('tiada', 'TAK ADA SARAF', scr(V(NAIL_X, TIP_Y + 1.4, 1.3)), t, 35.78, 37.8, { bg: '#3a4466', pointer: 'down' }, -40);
    bubble('taksakit', 'TAK SAKIT!', t, 38.2, 39.55, 420, 140, { top: '#d6fff0', bot: '#2fbf8f' }, 3);
    return tip;
  }],
  // S8 — how fast: about 3 mm a month (toenails slower); cut fingernails weekly, toenails every two weeks
  [39.58, 51.24, (t) => {
    handReset();
    handW.setNails(lerp(0.05, 0.3, inv(40.0, 43.2, t)), 0);
    handW.hand.rotation.set(0, 0.05 * Math.sin(t * 0.8), 0.03 * Math.sin(t));
    camMove(t, 39.58, 45.4, [0.2, 2.1, 5.0], [0, 1.8, 0], [0.4, 1.9, 6.2], [0, 1.4, 0], 50);
    if (t > 45.4) lookCam(V(0.4, 1.9, 6.2), V(0, 1.4, 0), 50);
    ov.flash((1 - inv(39.58, 39.9, t)) * 0.5);
    // ruler next to the middle finger
    const q = pop(t, 41.0, 45.3);
    if (q.o > 0) {
      const n = handW.nails[1];
      const a0 = scr(n.free.localToWorld(V(0, 0, 0))), a1 = scr(n.free.localToWorld(V(0, Math.max(0.05, lerp(0.05, 0.3, inv(40.0, 43.2, t))), 0)));
      ov.line(a0.x + 120, a0.y, a1.x + 120, a1.y, { color: '#ffd84a', w: 10, a: q.o });
      ov.line(a0.x + 95, a0.y, a0.x + 145, a0.y, { color: '#ffd84a', w: 10, a: q.o });
      ov.line(a1.x + 95, a1.y, a1.x + 145, a1.y, { color: '#ffd84a', w: 10, a: q.o });
      ov.tag('mm', '3 MM SEBULAN', { x: clamp(a1.x + 140, 300, 780), y: a1.y - 70, o: q.o, s: q.s }, { bg: GREEN, small: true });
    }
    topTag('kaki', 'KUKU KAKI LEBIH PERLAHAN', t, 43.42, 45.5, '#8a5a36');
    calendar('calT', 'KUKU TANGAN', 7, 14, W / 2, 760, t, 45.64, 51.2, PINK);
    calendar('calK', 'KUKU KAKI', 14, 14, W / 2, 1150, t, 48.68, 51.2, BLUE);
    bubble('seminggu', 'SEMINGGU SEKALI', t, 47.4, 48.6, 330, 84, { top: '#ffe0f0', bot: '#ff5c9a' });
    bubble('duaminggu', 'DUA MINGGU SEKALI', t, 49.64, 51.2, 330, 84, { top: '#d6f0ff', bot: '#2f8fff' });
    return handW;
  }],
  // S9 — if you don't cut them: dirt and germs hide under the nails
  [51.24, 55.98, (t) => {
    handReset();
    handW.setNails(0.75, 1);
    handGerms(t, inv(53.2, 53.8, t));
    handW.hand.rotation.set(0, 0.06 * Math.sin(t * 0.8), 0.03 * Math.sin(t));
    camMove(t, 51.24, 55.98, [0.4, 2.6, 5.4], [0, 2.4, 0], [0.2, 2.6, 4.0], [0, 2.5, 0], 46);
    ov.flash((1 - inv(51.24, 51.5, t)) * 0.4);
    bubble('taktpotong', 'KALAU TAK POTONG...', t, 51.24, 52.6, 400, 100, { top: '#ffe0c8', bot: '#ff8a5c' });
    pinTag('kotoran', 'KOTORAN', scr(handW.nails[0].free.localToWorld(V(0, 0.3, 0))), t, 52.66, 55.9, { bg: '#8a5a36', pointer: 'down' }, -60);
    pinTag('kuman', 'KUMAN', scr(handW.nails[3].free.localToWorld(V(0, 0.4, 0))), t, 53.28, 55.9, { bg: GREEN, pointer: 'down' }, -60);
    return handW;
  }],
  // S10 — eating with dirty hands: germs into the tummy, tummy ache
  [55.98, 61.3, (t) => {
    mamaHide();
    const reach = easeInOut(inv(56.0, 56.6, t)) * (1 - easeInOut(inv(58.6, 59.0, t)));
    const ache = easeOut(inv(59.0, 59.5, t));
    const mouth = V(-0.32, 0.95, 0.55);
    sitAff(t, {
      smile: lerp(1, 0.1, ache), brow: lerp(0.3, -0.8, ache), headPitch: 0.25 * ache,
      armR: ache > 0 ? { reach: [-0.15, 0.25, 0.55], pole: [-1, -0.6, 0] } : { reach: mix3([-0.55, 0.3, 0.25], mouth, reach), pole: [-1, -0.6, -0.3] },
      armL: ache > 0 ? { reach: [0.15, 0.2, 0.55], pole: [1, -0.6, 0] } : { reach: [0.55, 0.3, 0.25] },
      tilt: 0.06 * ache * Math.sin(t * 9),
    });
    room.kuih[0].visible = t < 56.4;
    roomGerms(t, 56.9, 58.8);
    const ah = affHead();
    lookCam(ah.clone().add(V(0.8, -0.3, 4.4)), ah.clone().add(V(0, -0.9, 0)), 48);
    pinTag('kumanm', 'KUMAN MASUK!', scr(ah.clone().add(V(0, -0.35, 0.7))), t, 57.22, 58.9, { bg: GREEN, pointer: 'down' }, -50);
    bubble('sakitperut', 'SAKIT PERUT!', t, 59.6, 61.25, 430, 130, { top: '#ffd0d0', bot: '#ff4d5e' }, 3);
    if (ache > 0) {
      const belly = scr(room.aff.parts.torso.localToWorld(V(0, 0.5, 0.6)));
      for (let i = 0; i < 3; i++) {
        const a = t * 5 + i * 2.1;
        ov.line(belly.x + Math.cos(a) * 90, belly.y + Math.sin(a) * 40, belly.x + Math.cos(a + 0.5) * 120, belly.y + Math.sin(a + 0.5) * 55, { color: '#ff4d5e', w: 8, a: ache });
      }
    }
    return room;
  }],
  // S11 — long nails break easily and can scratch the skin
  [61.3, 65.4, (t) => {
    handReset();
    handW.setNails(0.75, 0.2, { crackK: inv(61.6, 62.0, t), broken: inv(62.64, 63.4, t) });
    handW.scratch.visible = t > 63.84;
    handW.scratch.scale.x = easeOut(inv(63.84, 64.2, t));
    handW.hand.rotation.set(0, 0.05 * Math.sin(t * 0.8), 0.03 * Math.sin(t));
    camMove(t, 61.3, 65.4, [0.3, 1.8, 5.2], [0, 1.5, 0], [0.2, 1.0, 5.6], [0, 0.6, 0], 48);
    pinTag('patah', 'PATAH!', scr(handW.nails[1].free.localToWorld(V(0, 0.3, 0))), t, 62.3, 63.4, { bg: '#ff4d5e', pointer: 'down' }, -60);
    pinTag('calar', 'TERCAKAR!', scr(V(0.15, -0.6, 0.45)), t, 63.84, 65.35, { bg: '#ff4d5e', pointer: 'down' }, -50);
    return handW;
  }],
  // S12 — "Waaah ... Ingat, minta mama atau papa tolong potong guna pengetip kuku, ya."
  [65.4, 74.14, (t) => {
    const k = easeOut(inv(69.0, 70.0, t));
    const handOut = easeInOut(inv(70.6, 71.3, t));
    sitAff(t, {
      wow: keys(t, [[65.45, 0], [65.6, 0.9], [66.2, 0.9], [66.5, 0]]), smile: 1, brow: 0.5,
      armR: handOut > 0 ? { reach: mix3([-0.55, 0.3, 0.25], [-0.25, 0.75, 0.75], handOut), pole: [-1, -0.6, -0.3], wx: -0.4 } : { reach: [-0.55, 0.3, 0.25] },
      ...(t > 73.2 ? { armL: POSES.thumbsUpR.armR ? { reach: [0.32, 0.62, 0.62], pole: [1, -0.6, -0.3], thumb: 1, wy: 1.2, wx: 0.15 } : {} } : {}),
    });
    // Mama walks in and kneels a little to snip
    const m = room.mama;
    m.root.visible = t > 68.8;
    m.root.position.copy(MAMA_LR).add(V(0, (1 - k) * 0.4, 0));
    const fing = room.aff.parts.arms.R.hand.getWorldPosition(V());
    const base = { ...POSES.seated, yaw: 0.7, lean: 0.08, blink: blinkAt(t, 5), smile: 1 };
    m.pose(base);
    m.root.updateMatrixWorld(true);
    const target = fing.clone().add(V(0.12, 0.08, 0.12));
    m.pose({ ...base, armR: { reach: m.toTorso(target), pole: [-1, -0.6, -0.4] }, armL: { reach: m.toTorso(fing.clone().add(V(0.1, -0.08, 0.05))), pole: [1, -0.6, -0.4] } });
    m.root.updateMatrixWorld(true);
    const cl = room.clipper;
    cl.visible = t > 70.8;
    cl.position.copy(m.parts.arms.R.hand.getWorldPosition(V()));
    cl.rotation.set(0, 0.85, 0);
    const snip = Math.abs(Math.sin((t - 71.4) * 6)) * (t > 71.4 && t < 73.4 ? 1 : 0);
    cl.userData.set(1 - snip);
    if (t < 68.9) {
      const ah = affHead();
      lookCam(ah.clone().add(V(0.4, 0.0, 3.9)), ah.clone().add(V(0, -0.5, 0)), 48);
    } else camMove(t, 68.9, 74.14, [-1.3, 3.1, 7.8], [-2.25, 2.0, -1.8], [-1.4, 3.0, 7.0], [-2.25, 1.95, -1.8], 50);
    ov.flash((1 - inv(65.4, 65.7, t)) * 0.9, '255,250,235');
    const hd = scr(affHead().add(V(0, 0.5, 0)));
    const b = pop(t, 65.5, 68.8);
    ov.html('bulb', ICONS.bulb(), { x: clamp(hd.x + 200, 150, 900), y: clamp(hd.y - 160, 300, 900) + Math.sin(t * 5) * 8, o: b.o, s: b.s * 0.6, r: 10 });
    ov.sparkles(t, { n: 30, seed: 12, y: 250, h: 900, a: inv(65.5, 65.8, t) * (1 - inv(67.6, 68.2, t)) });
    bubble('akarnya', 'KUKU TUMBUH\nDARI AKARNYA!', t, 66.36, 68.8, 440, 100, { top: '#efe0ff', bot: '#8a5cff' });
    bubble('minta', 'MINTA MAMA ATAU\nPAPA TOLONG!', t, 69.94, 72.2, 440, 92, { top: '#ffe0f0', bot: '#ff5c9a' });
    pinTag('pengetip', 'PENGETIP KUKU', scr(room.clipper.position.clone().add(V(0, 0.15, 0))), t, 72.28, 74.1, { bg: '#8a98b8', pointer: 'down' }, -50);
    return room;
  }],
  // S13 — "Apa lagi kita nak belajar lepas ni?"
  [74.14, OUTRO, (t) => {
    room.mama.root.visible = true;
    room.clipper.visible = false;
    const tk = keys(t, [[74.2, 0], [74.6, 1]]);
    const th2 = POSES.thinkR.armR;
    sitAff(t, { smile: 1, brow: 0.3 + 0.4 * tk, headRoll: -0.12 * tk, lookX: 0.35 * tk, lookY: 0.4 * tk, headPitch: -0.08 * tk, armR: { reach: mix3([-0.55, 0.3, 0.25], th2.reach, tk), pole: th2.pole, point: tk, wx: th2.wx * tk } });
    room.mama.root.position.copy(MAMA_LR);
    room.mama.pose({ ...POSES.seated, yaw: 0.6, lean: 0.05, blink: blinkAt(t, 5), smile: 1, armL: { reach: [0.5, 0.25, 0.3] }, armR: { reach: [-0.5, 0.25, 0.3] } });
    const ah = affHead();
    lookCam(ah.clone().add(V(0.4, 0.0, 3.7)), ah.clone().add(V(0, -0.5, 0)), 46);
    const hd = scr(ah.clone().add(V(0, 0.45, 0)));
    qmarks(t, hd, 74.14, OUTRO - 0.05, [[74.2, -260, -100, '#ffcf33', -12], [74.5, 250, -160, '#3fa2ff', 10], [74.8, 300, 60, '#ffcf33', 14]]);
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

// Cover / thumbnail (9:16): the giant hand with long, dirty nails and germs.
function thumbnail() {
  ov.begin();
  cam.aspect = W / H;
  cam.updateProjectionMatrix();
  const t = 54.0;
  handReset();
  handW.setNails(0.75, 1);
  handGerms(t, 1);
  handW.hand.rotation.set(0, 0.1, 0.03);
  lookCam(V(0.3, 1.0, 6.4), V(0, 1.2, 0), 50);
  handW.sky.position.copy(cam.position);
  renderer.setViewport(0, 0, W, H);
  renderer.render(handW.scene, cam);
  const g = ov.g;
  const top = g.createLinearGradient(0, 0, 0, 720);
  top.addColorStop(0, 'rgba(50,30,20,0.55)');
  top.addColorStop(1, 'rgba(50,30,20,0)');
  g.fillStyle = top;
  g.fillRect(0, 0, W, 720);
  const bot = g.createLinearGradient(0, H - 900, 0, H);
  bot.addColorStop(0, 'rgba(40,25,20,0)');
  bot.addColorStop(1, 'rgba(40,25,20,0.6)');
  g.fillStyle = bot;
  g.fillRect(0, H - 900, W, 900);
  ov.vignette(0.3);
  ov.tag('thBadge', 'EPISOD 39', { x: W / 2, y: 300 }, { bg: '#2f7bff', small: true });
  ov.bubble('thTitle', 'KUKU PANJANG', { x: W / 2, y: 445, r: -3 }, { size: 116 });
  ov.bubble('thTitle2', 'BAHAYA?!', { x: W / 2, y: 590, r: 2 }, { size: 150, top: '#efffd0', bot: '#5fbf2a' });
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
