// THE CURIOUS AFFAN — Episode 069: "Kenapa Laut Ada Ombak?"
// Every shot is a pure function of time t (seconds), synced to audio/narration.mp3.
import * as THREE from 'three';
import { makeRenderer, loadEnvelope, toScreen, clamp, lerp, inv, easeOut, easeIn, easeInOut, keys, W, H } from '../../shared/core.js';
import { POSES, blinkAt } from '../../shared/affan.js';
import { Overlay, pop, ICONS, drawLogo } from '../../shared/overlay.js';
import { CAPTIONS, KEYWORDS } from './captions.js';
import { buildBeach, buildSeaLab, buildShore, buildOutro, A_BEACH, SHORE_Z, SHORE_AT } from './worlds.js';

const FPS = 30;
const DURATION = 52.05;
const OUTRO = 48.9;

const stage = document.getElementById('stage');
const canvas = document.createElement('canvas');
stage.appendChild(canvas);
const renderer = makeRenderer(canvas);
const ov = new Overlay(stage);
const beach = buildBeach();
const lab = buildSeaLab();
const shore = buildShore();
const outro = buildOutro();
const cam = new THREE.PerspectiveCamera(50, W / H, 0.05, 6000);
let env = { at: () => 0 };
beach.mama.root.scale.setScalar(0.85);

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const talk = (t) => clamp(env.at(t) * 1.2);
const scr = (p) => toScreen(p, cam);
const mix3 = (a, b, k) => a.map((v, i) => lerp(v, b[i], k));
const sm = (a, b, t) => easeInOut(inv(a, b, t));
const BLUE = '#2f9bff', ORANGE = '#ff8a3d', PURPLE = '#7a5cf0', GREEN = '#2fbf5f', PINK = '#ff5c9a', GOLD = '#d8a020', RED = '#ff4d5e';
const SEA = { top: '#eaf6ff', bot: '#2f9bff' };
const WIND = { top: '#ffffff', bot: '#9fd8ff' };

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

// ================================================================== beach
const affHead = () => beach.aff.parts.head.getWorldPosition(V());
const front = (d, side = 0.35) => affHead().add(V(side, 0.1, d));
const MAMA_AT = A_BEACH.clone().add(V(-1.25, 0, -0.25));
function beachSet(t, { mama = 0 } = {}) {
  beach.sea.userData.update(t);
  beach.setFoam(t);
  beach.mama.root.visible = mama > 0;
  if (mama > 0) {
    const m = beach.mama;
    m.root.position.copy(MAMA_AT).add(V(-1.6 * (1 - mama), 0, 0));
    const hand = beach.aff.parts.arms.L.hand.getWorldPosition(V());
    m.pose({ yaw: 0.35, blink: blinkAt(t, 5), smile: 1, brow: 0.2, headYaw: 0.25, armR: { reach: m.toTorso(hand.clone().add(V(-0.05, 0.02, 0))), pole: [-1, -0.6, -0.3] } });
    m.root.updateMatrixWorld(true);
  }
}
function beachAff(t, p = {}) {
  const a = beach.aff;
  a.root.position.copy(A_BEACH);
  a.pose({ yaw: 0.15, blink: blinkAt(t, 1), talk: talk(t), smile: 0.9, ...p });
  a.root.updateMatrixWorld(true);
}

// ==================================================================== lab
function seaSet(t, { ripple = 0, wave = 0, wind = 0, duck = 0, pathK = 0 } = {}) {
  lab.setSea(t, 0.12 * ripple, 0.75 * wave);
  lab.winds.forEach((w, i) => {
    const u = w.userData;
    const ph = (t * 0.35 * u.sp + u.ph) % 1;
    w.visible = wind > 0.02;
    w.position.set(-9 + ph * 18, u.y, u.z);
    w.material.opacity = 0.85 * wind * Math.sin(ph * Math.PI);
  });
  const y = lab.height(0, 1.5, t, 0.12 * ripple, 0.75 * wave);
  lab.duck.visible = duck > 0;
  lab.duck.position.set(0, y - 0.1, 1.5);
  lab.duck.rotation.set(0, -0.4, 0.25 * Math.cos(t * 2.2) * wave);
  lab.path.material.opacity = 0.8 * pathK;
}

// ================================================================== shore
// p: progress of the wave towards the beach (0..1), brk: breaking (0..1)
function shoreSet(t, p, brk) {
  const c = lerp(-7, 3.4, p);
  const h = lerp(0.7, 1.7, sm(0.25, 0.75, p));
  const lean = 1.6 * brk;
  shore.setWave(c, h, lean);
  shore.foam.forEach((f, i) => {
    const on = brk > 0.5;
    f.visible = on;
    if (!on) return;
    const s = f.userData.seed;
    const u = (t * 0.8 + i * 0.13) % 1;
    f.position.set(SHORE_AT.x + c + 0.6 + lean * 0.6 + Math.sin(s) * 0.9 * u + 0.6 * u, h * (0.5 + 0.6 * Math.cos(s)) - u * 0.6 + 0.1, SHORE_AT.z + 1.25 + Math.cos(s * 2) * 0.1);
    f.scale.setScalar(clamp((brk - 0.5) * 2) * (1 - 0.5 * u));
  });
  return { c, h };
}

// ================================================================== SHOTS
const SHOTS = [
  // S1 — the beach: Affan with the sea behind him, waves rolling in
  [0, 2.2, (t) => {
    beachSet(t);
    beachAff(t, { talk: 0, headYaw: -0.2 });
    camMove(t, 0, 2.2, [A_BEACH.x + 1.4, 2.0, A_BEACH.z + 6.2], [A_BEACH.x - 0.3, 1.0, A_BEACH.z - 3], [A_BEACH.x + 1.1, 1.8, A_BEACH.z + 5.2], [A_BEACH.x - 0.3, 1.0, A_BEACH.z - 3], 50);
    const q = pop(t, 0.4, 2.15);
    ov.tag('ep', 'EPISOD 69', { x: W / 2, y: 268, o: q.o, s: q.s }, { bg: '#2f7bff', small: true });
    return beach;
  }],
  // S2 — "Papa! Ombak di pantai ni datang tak berhenti-henti!"
  [2.2, 6.06, (t) => {
    beachSet(t);
    const turn = sm(2.9, 3.5, t);
    beachAff(t, { yaw: lerp(0.15, Math.PI * 0.85, turn), headPitch: -0.1, armR: { reach: [-0.4, lerp(0.75, 1.3, turn), 0.75], pole: [-1, -0.3, -0.3], point: turn } });
    if (t < 3.1) {
      lookCam(front(3.4), affHead().add(V(0, -0.35, 0)), 46);
    } else camMove(t, 3.1, 6.06, [A_BEACH.x + 0.9, 2.3, A_BEACH.z + 3.4], [A_BEACH.x - 0.3, 0.5, SHORE_Z - 3], [A_BEACH.x + 0.7, 2.1, A_BEACH.z + 2.9], [A_BEACH.x - 0.3, 0.45, SHORE_Z - 3], 50);
    const pp = pop(t, 2.22, 3.1, { from: 2 });
    ov.bubble('papa', 'PAPA!', { x: 800, y: 470, o: pp.o, s: pp.s * 0.8, r: 6 }, { size: 110 });
    pinTag('ombak', 'OMBAK', scr(V(A_BEACH.x - 0.8, 0.5, SHORE_Z - 1.5)), t, 3.18, 6.04, { bg: BLUE, pointer: 'down' }, -60);
    bubble('henti', 'TAK BERHENTI-\nHENTI!', t, 4.86, 6.04, 430, 110, SEA);
    return beach;
  }],
  // S3 — "Siapa yang tolak air laut?"
  [6.06, 7.82, (t) => {
    beachSet(t);
    beachAff(t, { ...POSES.thinkR, brow: -0.3, smile: 0.5 });
    const ah = affHead();
    lookCam(front(3.3), ah.clone().add(V(0, -0.35, 0)), 46);
    const hd = scr(ah.clone().add(V(0, 0.45, 0)));
    qmarks(t, hd, 6.08, 7.8, [[6.12, -260, 80, '#ffcf33', -12], [6.42, 250, 40, '#3fa2ff', 10], [6.72, 280, 220, '#ffcf33', 14]]);
    bubble('siapa', 'SIAPA YANG TOLAK\nAIR LAUT?', t, 6.12, 7.8, 430, 104, SEA);
    return beach;
  }],
  // S4 — "Jom ikut Affan cari jawapan!"
  [7.82, 10.04, (t) => {
    beachSet(t);
    const up = keys(t, [[7.84, 0], [8.1, 1], [8.9, 1], [9.2, 0.6]], easeOut);
    beachAff(t, { smile: 1, brow: 0.6, armR: { reach: [lerp(-0.6, -0.55, up), lerp(0.25, 1.95 + 0.06 * Math.sin(t * 14), up), lerp(0.2, 0.35, up)], pole: [-1, -0.3, -0.5] } });
    const ah = affHead();
    const k = easeIn(inv(9.0, 10.04, t));
    lookCam(front(3.3).lerp(V(A_BEACH.x, 1.2, SHORE_Z + 1), k), ah.clone().add(V(0, -0.35, 0)).lerp(V(A_BEACH.x, 0.3, SHORE_Z - 6), k), 46);
    ov.swirl(t, W / 2, 820, inv(7.95, 9.9, t));
    ov.flash(inv(9.65, 10.04, t) ** 2, '236,248,255');
    return beach;
  }],
  // S5 — "Jawapannya, angin! Angin bertiup di atas laut... jadi riak kecil."
  [10.04, 16.96, (t) => {
    seaSet(t, { wind: sm(11.0, 11.8, t), ripple: sm(15.3, 16.4, t) });
    camMove(t, 10.04, 16.96, [0, 3.6, 12.5], [0, 0.8, 0], [0.4, 3.0, 10.5], [0, 0.6, 0], 50);
    ov.flash(1 - inv(10.04, 10.4, t));
    topTag('jawapan', 'JAWAPANNYA...', t, 10.04, 11.1, PURPLE);
    bubble('angin', 'ANGIN!', t, 11.12, 13.8, 430, 150, WIND);
    topTag('tolak', 'ANGIN MENOLAK PERMUKAAN AIR', t, 13.9, 16.94, BLUE);
    bubble('riak', 'RIAK KECIL', t, 15.94, 16.94, 1180, 110, SEA);
    return lab;
  }],
  // S6 — the wind keeps blowing, the ripples grow into waves that travel far across the sea
  [16.96, 23.5, (t) => {
    seaSet(t, { wind: 1, ripple: 1 - 0.5 * sm(19.0, 21.0, t), wave: sm(18.6, 20.8, t) });
    camMove(t, 16.96, 23.5, [0.4, 3.0, 10.5], [0, 0.6, 0], [5.5, 3.4, 11.5], [8, 0.4, 0], 50);
    topTag('terus', 'ANGIN TERUS BERTIUP', t, 17.02, 18.6, PURPLE);
    topTag('besar', 'RIAK MAKIN BESAR', t, 18.64, 20.0, BLUE);
    bubble('ombakB', 'JADI OMBAK!', t, 20.06, 21.3, 1180, 120, SEA);
    bubble('jauh', 'BERGERAK JAUH\nMERENTASI LAUT!', t, 21.3, 23.48, 1180, 100, SEA);
    return lab;
  }],
  // S7 — but the water only goes up and down in the same place, like a floating rubber duck
  [23.5, 29.63, (t) => {
    seaSet(t, { wind: 0.4, ripple: 0.3, wave: 1, duck: 1, pathK: sm(25.6, 26.2, t) });
    camMove(t, 23.5, 29.63, [0.4, 2.2, 7.6], [0, 0.6, 1.5], [0.2, 1.8, 6.4], [0, 0.5, 1.5], 50);
    ov.flash(1 - inv(23.5, 23.8, t));
    topTag('tapi', 'TAPI AIR LAUT SEBENARNYA...', t, 23.56, 25.6, PURPLE);
    const dp = scr(lab.duck.position.clone().add(V(0, 1.1, 0)));
    pinTag('naik', 'NAIK ⬆️', dp, t, 25.74, 26.3, { bg: GREEN, pointer: 'down' }, -20);
    pinTag('turun', 'TURUN ⬇️', dp, t, 26.36, 27.7, { bg: ORANGE, pointer: 'down' }, -20);
    topTag('sama', 'DI TEMPAT YANG SAMA', t, 26.74, 29.61, BLUE);
    bubble('itik', 'MACAM ITIK GETAH\nYANG TERAPUNG!', t, 28.36, 29.61, 1180, 100, { top: '#fffbe6', bot: '#f0c020' });
    return lab;
  }],
  // S8 — at the shallow beach the bottom drags, the top topples: the wave breaks into foam
  [29.63, 39.9, (t) => {
    const p = sm(30.9, 36.4, t) * 0.92 + 0.08 * sm(36.4, 39.5, t);
    const brk = sm(35.4, 37.2, t);
    const { c, h } = shoreSet(t, t < 30.9 ? 0 : p, brk);
    shore.arrows.forEach((a, i) => {
      a.visible = t > 33.4 && t < 35.6;
      a.position.set(SHORE_AT.x + c + (i ? 0.6 : -0.6), shore.floorY(c + (i ? 0.6 : -0.6)) + 0.35, SHORE_AT.z + 1.3);
    });
    const cx = SHORE_AT.x + clamp(c + 0.6, -4, 4.6);
    lookCam(V(cx, 0.4, 9.2), V(cx, -0.9, 0), 50);
    ov.flash(1 - inv(29.63, 29.95, t));
    topTag('tahu', 'TAHU TAK?', t, 29.68, 30.94, ORANGE);
    topTag('cetek', 'PANTAI YANG CETEK', t, 30.96, 33.44, GOLD);
    pinTag('bawah', 'BAWAH TERSEKAT', scr(V(SHORE_AT.x + c, shore.floorY(c) + 0.5, SHORE_AT.z + 1.3)), t, 33.46, 35.4, { bg: RED, pointer: 'down' }, -30);
    pinTag('atas', 'ATAS TUMBANG!', scr(V(SHORE_AT.x + c + 1.0, h + 0.4, SHORE_AT.z + 1.3)), t, 35.42, 37.4, { bg: PURPLE, pointer: 'down' }, -30);
    bubble('pecah', 'OMBAK PECAH\nBERBUIH!', t, 37.46, 39.88, 430, 110, SEA);
    return shore;
  }],
  // S9 — "Waaah, rupanya angin yang buat ombak! Main di pantai, mesti dengan mama dan papa, ya."
  [39.9, 46.58, (t) => {
    const mk = sm(43.0, 44.2, t);
    beachSet(t, { mama: mk });
    beachAff(t, { wow: keys(t, [[39.9, 0], [40.1, 1], [40.6, 1], [40.8, 0]]), smile: 1, brow: 0.6, yaw: lerp(0.15, 0.4, mk), armL: mk > 0 ? { reach: [0.7, 0.45, 0.25], pole: [1, -0.6, -0.2] } : undefined });
    const ah = affHead();
    if (t < 43.1) lookCam(front(3.3), ah.clone().add(V(0, -0.35, 0)), 46);
    else {
      const mid = ah.clone().lerp(beach.mama.parts.head.getWorldPosition(V()), 0.45);
      lookCam(mid.clone().add(V(0.6, -0.3, 5.0)), mid.clone().add(V(0, -0.55, 0)), 50);
    }
    const hd = scr(ah.clone().add(V(0, 0.5, 0)));
    const b = pop(t, 39.95, 43.1);
    if (t < 43.1) ov.html('bulb', ICONS.bulb(), { x: clamp(hd.x + 230, 150, 900), y: clamp(hd.y - 150, 300, 900) + Math.sin(t * 5) * 8, o: b.o, s: b.s * 0.6, r: 10 });
    ov.sparkles(t, { n: 30, seed: 12, y: 250, h: 900, a: inv(39.95, 40.25, t) * (1 - inv(42.6, 43.1, t)) });
    bubble('anginB', 'ANGIN YANG\nBUAT OMBAK!', t, 40.78, 43.2, 430, 110, WIND);
    bubble('mamapapa', 'MAIN DI PANTAI DENGAN\nMAMA & PAPA', t, 43.24, 46.56, 430, 90, { top: '#fff0f6', bot: '#ff7ab0' });
    return beach;
  }],
  // S10 — "Apa lagi kita nak belajar lepas ni?"
  [46.58, OUTRO, (t) => {
    beachSet(t, { mama: 0 });
    const tk = keys(t, [[46.6, 0], [47.0, 1]]);
    const th2 = POSES.thinkR.armR;
    beachAff(t, { smile: 1, brow: 0.3 + 0.4 * tk, headRoll: -0.12 * tk, lookX: 0.35 * tk, lookY: 0.4 * tk, headPitch: -0.08 * tk, armR: { reach: mix3([-0.55, 0.3, 0.2], th2.reach, tk), pole: th2.pole, point: tk, wx: th2.wx * tk } });
    const ah = affHead();
    lookCam(front(3.3), ah.clone().add(V(0, -0.35, 0)), 46);
    const hd = scr(ah.clone().add(V(0, 0.45, 0)));
    qmarks(t, hd, 46.58, OUTRO - 0.05, [[46.63, -260, -100, '#ffcf33', -12], [46.93, 250, -160, '#3fa2ff', 10], [47.23, 300, 60, '#ffcf33', 14]]);
    return beach;
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

// Cover / thumbnail (9:16): the rubber duck riding big waves with the wind blowing.
function thumbnail() {
  ov.begin();
  cam.aspect = W / H;
  cam.updateProjectionMatrix();
  seaSet(27.0, { wind: 1, ripple: 0.4, wave: 1, duck: 1 });
  lookCam(V(0.4, 2.2, 8.0), V(0, 1.0, 1.5), 50);
  lab.sky.position.copy(cam.position);
  renderer.setViewport(0, 0, W, H);
  renderer.render(lab.scene, cam);
  ov.vignette(0.3);
  ov.tag('thBadge', 'EPISOD 69', { x: W / 2, y: 300 }, { bg: '#2f7bff', small: true });
  ov.bubble('thTitle', 'SIAPA TOLAK', { x: W / 2, y: 445, r: -3 }, { size: 130, ...SEA });
  ov.bubble('thTitle2', 'OMBAK?!', { x: W / 2, y: 600, r: 2 }, { size: 150, ...WIND });
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
