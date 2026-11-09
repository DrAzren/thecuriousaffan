// THE CURIOUS AFFAN — Episode 024: "Berapa Ekor Kucing di Dunia Ini?"
// Every shot is a pure function of time t (seconds), synced to audio/narration.mp3.
import * as THREE from 'three';
import { makeRenderer, loadEnvelope, toScreen, clamp, lerp, inv, easeOut, easeInOut, keys, wobble, W, H } from '../../shared/core.js';
import { POSES, blinkAt } from '../../shared/affan.js';
import { Overlay, pop, ICONS, drawLogo } from '../../shared/overlay.js';
import { CAPTIONS, KEYWORDS } from './captions.js';
import { buildHome, buildStreet, buildGlobeWorld, buildStage, buildOutro, STAGE_ORDER, RING_R, PODIUM_H } from './worlds.js';

const FPS = 30;
const DURATION = 70.9;

const stage = document.getElementById('stage');
const canvas = document.createElement('canvas');
stage.appendChild(canvas);
const renderer = makeRenderer(canvas);
const ov = new Overlay(stage);
const home = buildHome();
const street = buildStreet();
const globeW = buildGlobeWorld();
const show = buildStage();
const outro = buildOutro();
const cam = new THREE.PerspectiveCamera(50, W / H, 0.05, 4000);
let env = { at: () => 0 };

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const talk = (t) => clamp(env.at(t) * 1.2);
const scr = (p, c = cam) => toScreen(p, c);
function lookCam(pos, look, fov = 50) {
  cam.position.copy(pos);
  cam.fov = fov;
  cam.updateProjectionMatrix();
  cam.lookAt(look);
  cam.updateMatrixWorld(true);
}
const catBlink = (t, seed) => blinkAt(t * 0.8, seed + 3);

// ------------------------------------------------------------------ icons
const HEART = (c = '#ff4f7b') => `<svg width="120" height="110" viewBox="0 0 120 110"><path d="M60 100 C20 70 6 50 10 30 C14 10 40 4 60 26 C80 4 106 10 110 30 C114 50 100 70 60 100 Z" fill="${c}" stroke="#fff" stroke-width="10" stroke-linejoin="round"/><ellipse cx="36" cy="34" rx="10" ry="7" fill="#fff" opacity="0.7"/></svg>`;
const HOUSE = `<svg width="150" height="140" viewBox="0 0 150 140"><path d="M15 70 L75 15 L135 70 L118 70 L118 128 L32 128 L32 70 Z" fill="#ff8a7a" stroke="#17256b" stroke-width="10" stroke-linejoin="round"/><rect x="62" y="84" width="28" height="44" rx="6" fill="#ffd84a" stroke="#17256b" stroke-width="8"/></svg>`;
const TREE = `<svg width="130" height="150" viewBox="0 0 130 150"><rect x="55" y="90" width="20" height="52" rx="6" fill="#9a6a45" stroke="#17256b" stroke-width="8"/><circle cx="65" cy="62" r="50" fill="#5fd36a" stroke="#17256b" stroke-width="10"/></svg>`;
const COMMENT = `<svg width="190" height="170" viewBox="0 0 190 170"><path d="M20 20 H170 Q180 20 180 30 V110 Q180 120 170 120 H80 L42 155 L50 120 H20 Q10 120 10 110 V30 Q10 20 20 20 Z" fill="#ffffff" stroke="#17256b" stroke-width="10" stroke-linejoin="round"/><circle cx="58" cy="70" r="11" fill="#ff8a3d"/><circle cx="95" cy="70" r="11" fill="#3fa2ff"/><circle cx="132" cy="70" r="11" fill="#43b85c"/></svg>`;
const DOWN = (c = '#ffd84a') => `<svg width="110" height="130" viewBox="0 0 110 130"><path d="M35 10 H75 V68 H100 L55 120 L10 68 H35 Z" fill="${c}" stroke="#17256b" stroke-width="9" stroke-linejoin="round"/></svg>`;
const PAW = (c = '#ff9ac8') => `<svg width="120" height="120" viewBox="0 0 120 120"><g fill="${c}" stroke="#fff" stroke-width="7"><ellipse cx="60" cy="78" rx="30" ry="25"/><ellipse cx="24" cy="48" rx="13" ry="16"/><ellipse cx="46" cy="26" rx="13" ry="16"/><ellipse cx="74" cy="26" rx="13" ry="16"/><ellipse cx="96" cy="48" rx="13" ry="16"/></g></svg>`;
const MAGNI = `<svg width="150" height="150" viewBox="0 0 190 190"><line x1="60" y1="130" x2="20" y2="172" stroke="#17256b" stroke-width="40" stroke-linecap="round"/><line x1="60" y1="130" x2="20" y2="172" stroke="#ffc928" stroke-width="22" stroke-linecap="round"/><circle cx="110" cy="80" r="62" fill="#8fdcff" stroke="#17256b" stroke-width="34"/><circle cx="110" cy="80" r="62" fill="none" stroke="#ffc928" stroke-width="16"/><ellipse cx="92" cy="62" rx="16" ry="22" fill="#fff" opacity="0.85"/></svg>`;
function bracket(h, c = '#ffd84a') {
  return `<svg width="90" height="${h + 20}" viewBox="0 0 90 ${h + 20}"><path d="M45 14 V${h + 6} M20 14 H70 M20 ${h + 6} H70 M30 34 L45 14 L60 34 M30 ${h - 14} L45 ${h + 6} L60 ${h - 14}" fill="none" stroke="#fff" stroke-width="20" stroke-linecap="round" stroke-linejoin="round"/><path d="M45 14 V${h + 6} M20 14 H70 M20 ${h + 6} H70 M30 34 L45 14 L60 34 M30 ${h - 14} L45 ${h + 6} L60 ${h - 14}" fill="none" stroke="${c}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

function pinTag(id, text, p, t, a, b, style, dy = -90) {
  const q = pop(t, a, b);
  if (q.o <= 0 || !p.visible) return;
  ov.tag(id, text, { x: clamp(p.x, 190, 890), y: clamp(p.y + dy, 300, 1360), o: q.o, s: q.s }, style);
}
function hearts(t, a, b, x, y, seed = 1) {
  if (t < a || t > b) return;
  for (let i = 0; i < 5; i++) {
    const ph = ((t - a) * 0.7 + i / 5) % 1;
    const o = Math.sin(ph * Math.PI) * clamp((b - t) / 0.3) * clamp((t - a) / 0.3);
    ov.html(`heart${seed}_${i}`, HEART(['#ff4f7b', '#ff8ab0', '#ff6f91'][i % 3]), { x: x + Math.sin(i * 2.3 + t * 2) * 70 + (i - 2) * 40, y: y - ph * 260, o, s: 0.45 + 0.25 * Math.sin(i), r: (i - 2) * 8 });
  }
}

const ORANGE = '#ff8a3d', BLUE = '#2f9bff', PINK = '#ff5fa2', GREEN = '#2fb45a', PURPLE = '#8a5cff';

// ================================================================ HOME helpers
const HOME_AFF = V(-0.15, 0, 1.0);
function homeCat(t, p = {}) {
  home.cat.pose({ t, sit: 1, blink: catBlink(t, 1), tail: 1, ...p });
}
// Affan at home: optional stroking of the cat's head with his right hand.
function homeAffan(t, p = {}, pet = 0) {
  const aff = home.aff;
  aff.root.position.copy(HOME_AFF);
  const base = { yaw: -0.25, blink: blinkAt(t, 1), talk: talk(t), smile: 0.9 };
  aff.pose({ ...base, ...p });
  if (pet > 0) {
    const head = home.cat.headWorld();
    const st = Math.sin(t * 6);
    const target = head.add(V(0.05 + 0.12 * st, 0.32 - 0.03 * Math.abs(st), -0.05));
    const tt = aff.toTorso(target);
    const rest = [-0.55, 0.25, 0.1];
    aff.pose({ ...base, ...p, armR: { reach: rest.map((r, i) => lerp(r, tt[i], pet)), pole: [-1, -0.6, -0.4], ...(p.armR || {}) } });
  }
}

// ================================================================== SHOTS
const SEGS = [[27.75, 'kampung'], [30.95, 'parsi'], [34.5, 'siam'], [38.6, 'maineCoon'], [42.8, 'sphynx'], [46.05, 'scottishFold'], [50.35, 'singapura']];
const STEP = (Math.PI * 2) / STAGE_ORDER.length;
// Carousel position as a (fractional) breed index: turns at each segment cut.
function carouselIdx(t) {
  let idx = -0.6 + 0.6 * easeOut(inv(27.55, 28.25, t));
  for (let i = 1; i < SEGS.length; i++) idx += easeInOut(inv(SEGS[i][0] - 0.35, SEGS[i][0] + 0.4, t));
  if (t > 55.0) idx += 0.18 * (t - 55.0);
  return idx;
}
function poseStage(t, { allMeow = 0 } = {}) {
  const idx = carouselIdx(t);
  show.carousel.rotation.y = -idx * STEP;
  show.carousel.updateMatrixWorld(true);
  show.cats.forEach((c, i) => {
    const front = clamp(1 - Math.abs(idx - i) * 1.2);
    const extra = {};
    if (c.key === 'siam') extra.meow = keys(t, [[37.62, 0], [37.75, 1], [38.25, 1], [38.45, 0]]);
    if (c.key === 'scottishFold') extra.headRoll = keys(t, [[48.9, 0], [49.3, 0.22], [50.2, 0.22], [50.5, 0]]);
    c.cat.root.rotation.y = -(c.a + show.carousel.rotation.y) * 0.85;
    c.cat.pose({
      t: t + i * 1.7, sit: 1, blink: catBlink(t, i), tail: 1,
      headYaw: 0.35 * Math.sin(t * 0.6 + i) * (1 - front) + 0.12 * wobble(t, i) * front,
      headPitch: -0.1 * front,
      earTwitch: (i === 2 || i === 4) ? 0.5 : 0,
      meow: allMeow * clamp(Math.sin(t * 5 + i * 1.3)),
      ...extra,
    });
  });
  return idx;
}
// world position of the front podium's cat head
const frontHead = (i) => show.cats[i].cat.headWorld();

// ---------------------------------------------------------- hook overlay
function hook(t) {
  const p = pop(t, 0.12, 5.5, { fin: 0.45 });
  const fl = Math.sin(t * 3) * 6;
  ov.bubble('hook', 'BERAPA EKOR KUCING\nDI DUNIA?', { x: W / 2, y: 430 + fl, o: p.o, s: p.s }, { size: 98 });
  const q = pop(t, 0.5, 5.5);
  ov.tag('ep', 'EPISOD 24', { x: W / 2, y: 270, o: q.o, s: q.s }, { bg: '#2f7bff', small: true });
}

const SHOTS = [
  // S1 — hook: Affan pets his kampung cat, then calls Mama with the big question
  [0, 5.6, (t) => {
    const pet = keys(t, [[0, 1], [2.05, 1], [2.35, 0]]);
    const ask = keys(t, [[3.3, 0], [3.65, 1], [5.4, 1], [5.6, 0.6]]);
    homeAffan(t, {
      headYaw: t < 2.3 ? -0.45 : keys(t, [[2.3, 0.75], [3.3, 0.75], [3.6, 0.15]]), headPitch: t < 2.3 ? 0.25 : 0,
      lookX: t < 2.3 ? -0.5 : keys(t, [[2.3, 0.6], [3.3, 0.6], [3.6, 0]]), lookY: t < 2.3 ? -0.4 : 0,
      smile: 1, brow: 0.3 + 0.6 * ask, headRoll: -0.08 * ask,
      armL: ask > 0 ? { reach: [lerp(0.55, 0.85, ask), lerp(0.25, 1.1, ask), lerp(0.1, 0.65, ask)], pole: [1, -0.6, -0.3] } : {},
    }, pet);
    homeCat(t, { headYaw: t < 2.2 ? 0.55 : 0.1, headPitch: t < 2.2 ? -0.25 : 0, blink: t < 2.1 ? 0.85 : catBlink(t, 1), headRoll: t < 2.1 ? 0.15 : 0 });
    const k = easeInOut(inv(0, 5.6, t));
    lookCam(V(lerp(-0.4, -0.2, k), lerp(2.75, 2.85, k), lerp(7.6, 6.7, k)), V(-0.55, 2.2, 0.7), 50);
    hearts(t, 0.4, 2.2, 330, 1040, 1);
    hook(t);
    return home;
  }],
  // S2 — "Korang rasa berapa? Seratus? Sejuta?"
  [5.6, 9.25, (t) => {
    const open = keys(t, [[5.7, 0], [6.0, 1], [7.0, 1], [7.25, 0]]);
    const th = keys(t, [[7.1, 0], [7.45, 1], [9.25, 1]]);
    const th2 = POSES.thinkR.armR;
    homeAffan(t, {
      yaw: -0.12, headYaw: 0.05, smile: 0.9, brow: 0.5 + 0.4 * th, headRoll: -0.1 * th, lookX: 0.4 * th, lookY: 0.45 * th, lean: 0.06 * open,
      armL: { reach: [lerp(0.55, 0.95, open), lerp(0.25, 1.15, open), lerp(0.1, 0.75, open)], pole: [1, -0.6, -0.3] },
      armR: th > 0.01 ? { reach: [lerp(-0.55, th2.reach[0], th), lerp(0.25, th2.reach[1], th), lerp(0.1, th2.reach[2], th)], pole: th2.pole, point: th, wx: th2.wx * th } : { reach: [lerp(-0.55, -0.95, open), lerp(0.25, 1.15, open), lerp(0.1, 0.75, open)], pole: [-1, -0.6, -0.3] },
    });
    homeCat(t, { headYaw: 0.25, headPitch: -0.05 });
    const k = easeOut(inv(5.6, 9.25, t));
    lookCam(V(lerp(0.1, 0.0, k), 3.05, lerp(6.4, 5.7, k)), V(-0.2, 2.65, 0.9), 50);
    const a = pop(t, 7.28, 9.2, { from: 1.8 }), b = pop(t, 8.18, 9.2, { from: 1.8 });
    ov.bubble('g100', '100?', { x: 250, y: 470, o: a.o, s: a.s, r: -8 }, { size: 150, top: '#bff3c8', bot: '#3fcf6a' });
    ov.bubble('g1j', '1 JUTA?', { x: 720, y: 640, o: b.o, s: b.s, r: 6 }, { size: 140, top: '#ffd0e4', bot: '#ff5fa2' });
    const q = pop(t, 6.3, 9.2);
    ov.html('q1', ICONS.qmark('#ffcf33'), { x: 860, y: 330 + Math.sin(t * 3) * 10, o: q.o, s: q.s * 0.8, r: 12 });
    ov.html('q2', ICONS.qmark('#3fa2ff'), { x: 170, y: 760 + Math.sin(t * 3 + 1) * 10, o: q.o, s: q.s * 0.6, r: -12 });
    return home;
  }],
  // S3 — "Jom ikut Affan cari jawapan!" + magic swirl into the imagination world
  [9.25, 11.1, (t) => {
    const up = keys(t, [[9.3, 0], [9.55, 1], [10.6, 1], [10.9, 0.6]], easeOut);
    homeAffan(t, {
      yaw: -0.1, smile: 1, brow: 0.7, headRoll: 0.06,
      armR: { reach: [lerp(-0.55, -0.6, up), lerp(0.25, 1.95 + 0.06 * Math.sin(t * 14), up), lerp(0.1, 0.35, up)], pole: [-1, -0.3, -0.5] },
    });
    homeCat(t, { headYaw: 0.4, headPitch: -0.35, earTwitch: 1 });
    const k = easeInOut(inv(9.25, 11.1, t));
    lookCam(V(lerp(0.2, 0.0, k), lerp(3.0, 3.15, k), lerp(5.9, 4.6, k)), V(-0.1, 2.8, 0.9), 50);
    ov.swirl(t, W / 2, 900, inv(9.8, 11.0, t));
    ov.flash(inv(10.7, 11.1, t) ** 2);
    return home;
  }],
  // S4 — imagination: a world full of cats, counter to 600 juta
  [11.1, 17.5, (t) => {
    const G = globeW;
    G.spin.rotation.y = -2.95 + (t - 11.1) * 0.12;
    G.spin.rotation.x = 0.18;
    const grow = inv(12.9, 15.4, t);
    const n = G.markers.length;
    G.markers.forEach((s, i) => {
      const born = 12.9 + (i / n) * 2.5;
      const k = clamp((t - born) / 0.25);
      const sc = s.userData.size * (k <= 0 ? 0.0001 : 1 + 0.6 * Math.sin(k * Math.PI) * (1 - k) + 0.04 * Math.sin(t * 4 + i));
      s.scale.setScalar(sc);
    });
    const aff = G.aff;
    aff.root.rotation.set(0, 0, 0);
    const pt = keys(t, [[13.6, 0], [14.0, 1], [17.5, 1]]);
    aff.pose({ yaw: 0.35 });
    const gT = aff.toTorso(G.globe.position);
    const wow = keys(t, [[14.1, 0], [14.3, 1], [15.0, 1], [15.4, 0]]);
    aff.pose({
      yaw: 0.35, blink: blinkAt(t, 2), talk: talk(t), smile: 1, wow, brow: 0.5 + 0.5 * wow,
      headYaw: 0.15, headPitch: -0.35, lookY: 0.6,
      armL: pt > 0.01 ? { reach: [lerp(0.55, 0.9, pt), lerp(0.25, 1.7, pt), lerp(0.1, 0.7, pt)], point: pt, pole: [1, -1, -0.6] } : {},
      armR: { reach: [-0.6, lerp(0.25, 0.9, wow), 0.35], pole: [-1, -0.6, -0.4] },
    });
    void gT;
    G.cat.pose({ t, sit: 1, headPitch: -0.5, headYaw: -0.3, blink: catBlink(t, 2), tail: 1 });
    const k = easeInOut(inv(11.1, 17.5, t));
    const orbit = lerp(-0.25, 0.3, k);
    const d = lerp(27, 23.5, easeOut(inv(11.1, 15, t)));
    lookCam(V(Math.sin(orbit) * d, lerp(4.6, 3.8, k), -1 + Math.cos(orbit) * d), V(-0.4, 3.9, -1), 50);
    ov.flash(1 - inv(11.1, 11.5, t));
    ov.sparkles(t, { n: 24, seed: 3, y: 250, h: 1100, a: 0.7 });
    // "Saintis anggarkan..."
    const sa = pop(t, 11.35, 12.95);
    ov.tag('saintis', 'SAINTIS ANGGARKAN...', { x: W / 2 + 40, y: 300, o: sa.o, s: sa.s }, { bg: PURPLE, small: true });
    ov.html('magni', MAGNI, { x: 230, y: 300, o: sa.o, s: sa.s * 0.6, r: -10 });
    // counter -> 600 JUTA
    const cnt = Math.round(600000000 * easeOut(inv(12.95, 14.3, t)));
    const c = pop(t, 12.95, 14.45, { fout: 0.12 });
    if (c.o > 0) ov.bubble('counter', cnt.toLocaleString('en-US'), { x: W / 2, y: 360, o: c.o, s: c.s }, { size: 118, top: '#ffffff', bot: '#ffe08a' });
    const j = pop(t, 14.3, 17.45, { from: 2 });
    ov.bubble('600', '600 JUTA', { x: W / 2, y: 350 + Math.sin(t * 3) * 6, o: j.o, s: j.s }, { size: 170 });
    const e = pop(t, 15.28, 17.45);
    ov.tag('ekor', 'EKOR KUCING!', { x: W / 2, y: 530, o: e.o, s: e.s }, { bg: ORANGE });
    const sd = pop(t, 16.18, 17.45);
    ov.tag('dunia', 'DI SELURUH DUNIA', { x: W / 2, y: 1290, o: sd.o, s: sd.s }, { bg: BLUE, small: true });
    return G;
  }],
  // S5a — some live at home with their owners
  [17.5, 20.1, (t) => {
    homeAffan(t, { yaw: -0.55, headYaw: -0.35, headPitch: 0.3, lookX: -0.4, lookY: -0.5, smile: 1 }, 1);
    homeCat(t, { headYaw: 0.6, headPitch: -0.3, blink: 0.9, headRoll: 0.2 + 0.08 * Math.sin(t * 3) });
    const k = easeInOut(inv(17.5, 20.1, t));
    lookCam(V(lerp(-0.2, -0.5, k), lerp(2.55, 2.45, k), lerp(4.2, 3.6, k)), V(-1.2, 2.1, 0.6), 48);
    const c = scr(home.cat.headWorld());
    hearts(t, 17.8, 20.05, c.x, c.y - 80, 2);
    const r = pop(t, 18.7, 20.05);
    ov.tag('rumah', 'DI RUMAH', { x: W / 2 + 70, y: 330, o: r.o, s: r.s }, { bg: PINK });
    ov.html('house', HOUSE, { x: W / 2 - 230, y: 320, o: r.o, s: r.s * 0.7, r: -6 });
    const tu = pop(t, 19.32, 20.05);
    ov.tag('tuan', 'DENGAN TUANNYA', { x: W / 2, y: 470, o: tu.o, s: tu.s }, { bg: '#ff8ab0', small: true });
    return home;
  }],
  // S5b — some live free outside
  [20.1, 22.7, (t) => {
    const S = street;
    const x = lerp(-2.6, 1.4, inv(20.1, 22.7, t));
    S.cat.root.position.set(x, 1.96, 0.2);
    S.cat.root.rotation.y = Math.PI / 2;
    S.cat.pose({ t, sit: 0, walk: (t - 20.1) * 7.5, headYaw: keys(t, [[20.1, 0.2], [21.3, 0.2], [21.7, 0.9], [22.7, 0.9]]), headPitch: 0.05, blink: catBlink(t, 4), tail: 0.6 });
    S.stray.root.position.set(3.2, 0, 1.6);
    S.stray.root.rotation.y = -0.6;
    S.stray.pose({ t, sit: 1, headYaw: keys(t, [[20.1, 0.2], [21.0, 0.2], [21.4, -0.6]]), headPitch: -0.15, blink: catBlink(t, 5) });
    S.sun.target.position.set(x, 0, 0);
    S.sun.position.set(x + 8, 14, 10);
    lookCam(V(x + 0.9, 2.9, 7.6), V(x + 1.1, 1.75, 0.4), 50);
    S.sky.position.copy(cam.position);
    const b = pop(t, 21.48, 22.65);
    ov.tag('bebas', 'BEBAS', { x: W / 2 + 180, y: 330, o: b.o, s: b.s }, { bg: GREEN });
    const l = pop(t, 21.9, 22.65);
    ov.tag('luar', 'DI LUAR', { x: W / 2 - 60, y: 470, o: l.o, s: l.s }, { bg: BLUE });
    return S;
  }],
  // S6 — so many kinds: a crowd of cats, "lebih 70 baka"
  [22.7, 27.75, (t) => {
    show.crowdCats.forEach((c, i) => {
      const ph = c.root.userData.ph;
      c.pose({ t: t + ph, sit: 1, blink: catBlink(t + ph, i), headYaw: 0.3 * Math.sin(t * 0.8 + ph), headPitch: -0.1 + 0.1 * Math.sin(t * 0.6 + ph), tail: 1, meow: t > 26.74 ? 0.7 * clamp(Math.sin(t * 6 + ph * 3)) : 0 });
    });
    const k = easeInOut(inv(22.7, 27.0, t));
    lookCam(V(lerp(59.5, 60, k), lerp(1.9, 4.6, k), lerp(4.0, 15.0, k)), V(lerp(59.6, 60, k), lerp(1.3, 3.0, k), lerp(0, -2.2, k)), 50);
    ov.flash(1 - inv(22.7, 22.95, t));
    const bj = pop(t, 23.72, 25.5, { from: 1.8 });
    ov.bubble('jenis', 'BANYAK JENIS!', { x: W / 2, y: 380 + Math.sin(t * 3) * 6, o: bj.o, s: bj.s, r: -3 }, { size: 130, top: '#bff3c8', bot: '#2fb45a' });
    const n = Math.round(70 * easeOut(inv(25.6, 26.7, t)));
    const c = pop(t, 25.6, 26.8, { fout: 0.1 });
    if (c.o > 0) ov.bubble('c70', String(n), { x: W / 2, y: 380, o: c.o, s: c.s }, { size: 200, top: '#ffffff', bot: '#bfffd0' });
    const b = pop(t, 26.74, 27.7, { from: 2 });
    ov.bubble('70', 'LEBIH 70\nBAKA!', { x: W / 2, y: 400, o: b.o, s: b.s }, { size: 150, top: '#bff3c8', bot: '#2fb45a' });
    ov.sparkles(t, { n: 16, seed: 9, y: 250, h: 600, a: inv(26.7, 27.0, t) });
    return { scene: show.scene, crowd: true };
  }],
  // S7 — breed carousel: one breed at a time on the spotlight podium
  [27.75, 55.25, (t) => {
    const idx = poseStage(t);
    const seg = SEGS.reduce((a, s, i) => (t >= s[0] ? i : a), 0);
    const [t0, key] = SEGS[seg];
    const t1 = seg + 1 < SEGS.length ? SEGS[seg + 1][0] : 55.25;
    const k = easeInOut(inv(t0, t1, t));
    const side = seg % 2 ? 1 : -1;
    const ci = STAGE_ORDER.indexOf(key);
    const bsz = show.cats[ci].cat.breed.size;
    const big = key === 'maineCoon';
    // Affan only joins for the size comparison
    const affOn = false;
    show.aff.root.visible = affOn;
    if (affOn) {
      show.aff.root.position.set(-1.75, 0, RING_R + 1.9);
      const wow = keys(t, [[41.1, 0], [41.3, 1], [42.3, 1], [42.6, 0.3]]);
      const pt = keys(t, [[39.0, 0], [39.4, 1], [42.8, 1]]);
      show.aff.pose({ yaw: 0.55 });
      const hT = show.aff.toTorso(frontHead(ci));
      show.aff.pose({
        yaw: 0.55, blink: blinkAt(t, 5), talk: talk(t), smile: 1, wow, brow: 0.4 + 0.6 * wow, headYaw: 0.35, headPitch: 0.05, lookX: 0.6, lookY: 0.1,
        armL: { reach: [lerp(0.55, hT[0] * 0.55, pt), lerp(0.25, Math.max(0.9, hT[1] * 0.7), pt), lerp(0.1, hT[2] * 0.55, pt)], point: pt, pole: [1, -1, -0.5] },
      });
    }
    const hy = PODIUM_H + 0.32 + 0.75 * bsz;
    const dist = 3.5 + 1.0 * bsz;
    const camX = side * lerp(0.9, 0.3, k);
    lookCam(V(camX, hy + lerp(0.55, 0.35, k), RING_R + lerp(dist + 0.5, dist, k)), V(0, hy - 0.05, RING_R), 48);
    // spotlight dims during the turn
    const turning = Math.abs(idx - Math.round(idx));
    show.beam.material.opacity = 0.11 * (1 - clamp(turning * 3));
    show.spot.intensity = 260 * (0.55 + 0.45 * (1 - clamp(turning * 3)));
    ov.speedLines(t, { y0: 900, y1: 1400, n: 12, a: 0.5 * clamp(turning * 4) * (t > 28.3 ? 1 : 0), dir: seg % 2 ? 1 : -1 });
    const head = scr(frontHead(ci));
    const titles = {
      kampung: ['KUCING\nKAMPUNG', 27.88, '#ffd89c', '#ff8a3d'], parsi: ['PARSI', 31.2, '#ffffff', '#ffb8d8'], siam: ['SIAM', 34.7, '#cfeaff', '#3fa2ff'],
      maineCoon: ['MAINE COON', 38.78, '#e8d2ff', '#9b6bff'], sphynx: ['SPHYNX', 42.98, '#ffe0d4', '#ff8a6a'], scottishFold: ['SCOTTISH\nFOLD', 46.26, '#e0e8ff', '#7f93c8'], singapura: ['SINGAPURA', 50.54, '#fff0c8', '#e0a040'],
    };
    const [name, at, top, bot] = titles[key];
    const nb = pop(t, at, t1 - 0.05, { from: 1.8 });
    ov.bubble('name' + key, name, { x: W / 2, y: name.includes('\n') ? 400 : 360, o: nb.o, s: nb.s }, { size: name.length > 9 && !name.includes('\n') ? 120 : 140, top, bot });
    if (key === 'kampung') {
      const m = pop(t, 30.2, 30.9);
      ov.tag('my', 'DARI MALAYSIA', { x: W / 2, y: 1300, o: m.o, s: m.s }, { bg: '#e8343f', small: true });
      const kw = pop(t, 29.44, 30.9);
      ov.html('pawK', PAW('#ffb36b'), { x: 880, y: 640, o: kw.o, s: kw.s * 0.7, r: 12 });
    }
    if (key === 'parsi') {
      pinTag('bulu', 'BULU PANJANG', head, t, 33.0, 34.45, { bg: PINK, pointer: 'down' }, -230);
      const g = pop(t, 33.86, 34.45, { from: 2 });
      ov.bubble('gebu', 'GEBU!', { x: 850, y: 1180, o: g.o, s: g.s, r: 8 }, { size: 110, top: '#ffffff', bot: '#ffd0e4' });
      ov.sparkles(t, { n: 14, seed: 21, x: head.x - 260, y: head.y - 200, w: 520, h: 560, a: inv(33.0, 33.4, t) * (1 - inv(34.3, 34.5, t)), size: 26 });
    }
    if (key === 'siam') {
      pinTag('biru', 'MATA BIRU', head, t, 36.44, 37.65, { bg: BLUE, pointer: 'down' }, -220);
      const a = inv(36.44, 36.8, t) * (1 - inv(37.5, 37.7, t));
      if (a > 0) for (const s of [-1, 1]) ov.star(head.x + s * 46, head.y - 8, 26, a, '#bfe8ff', t * 2);
      const mw = pop(t, 37.72, 38.5, { from: 2 });
      ov.bubble('miau', 'MIAU!', { x: clamp(head.x + 250, 300, 880), y: head.y - 120, o: mw.o, s: mw.s, r: 10 }, { size: 120, top: '#ffffff', bot: '#9fd8ff' });
    }
    if (big) {
      const b = pop(t, 41.22, 42.75, { from: 2 });
      ov.bubble('besar', 'PALING BESAR!', { x: W / 2, y: 1200, o: b.o, s: b.s, r: -3 }, { size: 120, top: '#e8d2ff', bot: '#9b6bff' });
      const pod = show.cats[ci].pod;
      const base = scr(pod.localToWorld(V(0.95, PODIUM_H, 0)));
      const top = scr(frontHead(ci).add(V(0, 0.45 * bsz, 0)));
      const br = pop(t, 41.0, 42.75);
      if (br.o > 0) ov.html('brk', bracket(Math.max(80, base.y - top.y)), { x: base.x + 70, y: (base.y + top.y) / 2, o: br.o, s: 1 });
    }
    if (key === 'sphynx') {
      pinTag('bulu2', 'HAMPIR TAK BERBULU', head, t, 44.22, 46.0, { bg: '#ff8a6a', pointer: 'down' }, -240);
      const x = pop(t, 44.56, 46.0, { from: 2 });
      ov.html('crossS', ICONS.cross(), { x: 850, y: 1170, o: x.o, s: x.s * 0.75 });
      ov.html('combS', `<svg width="160" height="80" viewBox="0 0 160 80"><rect x="6" y="6" width="148" height="26" rx="10" fill="#ffc928" stroke="#17256b" stroke-width="8"/>${Array.from({ length: 9 }, (_, i) => `<rect x="${14 + i * 16}" y="30" width="8" height="40" rx="4" fill="#ffc928" stroke="#17256b" stroke-width="5"/>`).join('')}</svg>`, { x: 850, y: 1170, o: x.o, s: x.s * 1.3, r: -12 });
    }
    if (key === 'scottishFold') {
      pinTag('lipat', 'TELINGA TERLIPAT', head, t, 47.62, 49.0, { bg: '#5f7fd0', pointer: 'down' }, -230);
      hearts(t, 49.1, 50.3, head.x - 200, head.y + 120, 3);
      const c = pop(t, 49.12, 50.3, { from: 2 });
      ov.bubble('comel', 'COMEL!', { x: 820, y: 1170, o: c.o, s: c.s, r: 8 }, { size: 120, top: '#ffd0e4', bot: '#ff5fa2' });
    }
    if (key === 'singapura') {
      const s = pop(t, 53.62, 55.2, { from: 2 });
      ov.bubble('kecil', 'PALING KECIL!', { x: W / 2, y: 1200, o: s.o, s: s.s, r: 3 }, { size: 120, top: '#fff0c8', bot: '#e0a040' });
      const pod = show.cats[ci].pod;
      const base = scr(pod.localToWorld(V(0.85, PODIUM_H, 0)));
      const top = scr(frontHead(ci).add(V(0, 0.45 * bsz, 0)));
      const br = pop(t, 53.5, 55.2);
      if (br.o > 0) ov.html('brk2', bracket(Math.max(60, base.y - top.y), '#ffb347'), { x: base.x + 60, y: (base.y + top.y) / 2, o: br.o, s: 1 });
    }
    ov.flash(1 - inv(27.75, 28.0, t));
    return { scene: show.scene, stage: true };
  }],
  // S8 — "Waaah, banyaknya kawan berbulu kita!": every breed around Affan
  [55.25, 58.8, (t) => {
    poseStage(t, { allMeow: t > 56.3 ? 0.5 : 0 });
    show.aff.root.visible = true;
    const jump = t > 55.5 && t < 56.1 ? Math.sin(((t - 55.5) / 0.6) * Math.PI) * 0.5 : 0;
    const up = keys(t, [[55.35, 0], [55.55, 1], [56.4, 1], [56.8, 0.55]]);
    show.aff.root.position.set(0, 0.62, 0);
    show.aff.pose({
      yaw: 0, blink: t > 55.4 && t < 56.3 ? 0 : blinkAt(t, 7), talk: talk(t), bob: jump, smile: 1,
      wow: keys(t, [[55.4, 0], [55.55, 1], [56.2, 1], [56.5, 0]]), brow: 0.8,
      legL: { x: -0.25 * jump, knee: 0.6 * jump }, legR: { x: -0.25 * jump, knee: 0.6 * jump },
      armL: { reach: [lerp(0.55, 1.05, up), lerp(0.25, 1.75, up), lerp(0.1, 0.35, up)], pole: [1, -0.6, -0.4] },
      armR: { reach: [lerp(-0.55, -1.05, up), lerp(0.25, 1.75, up), lerp(0.1, 0.35, up)], pole: [-1, -0.6, -0.4] },
    });
    show.beam.material.opacity = 0.0;
    show.spot.intensity = 200;
    const k = easeOut(inv(55.25, 58.8, t));
    lookCam(V(lerp(1.5, 0, k), lerp(4.2, 7.2, k), lerp(9.0, 14.0, k)), V(0, lerp(2.4, 1.7, k), 0), 52);
    ov.flash((1 - inv(55.25, 55.5, t)) * 0.8);
    const w = pop(t, 55.52, 57.0, { from: 2 });
    ov.bubble('waah', 'WAAAH!', { x: W / 2, y: 380, o: w.o, s: w.s, r: -4 }, { size: 170 });
    const b = pop(t, 56.4, 58.75);
    ov.bubble('kawan', 'KAWAN BERBULU!', { x: W / 2, y: 400 + Math.sin(t * 3) * 6, o: b.o * (t > 56.9 ? 1 : 0), s: b.s }, { size: 110, top: '#ffd0e4', bot: '#ff5fa2' });
    ov.sparkles(t, { n: 34, seed: 12, y: 250, h: 1100, a: inv(55.3, 55.7, t) });
    return { scene: show.scene, stage: true };
  }],
  // S9 — back home: thumbs up + recap
  [58.8, 64.45, (t) => {
    const th = keys(t, [[59.0, 0], [59.35, 1], [61.0, 1], [61.35, 0]]);
    const up = POSES.thumbsUpR.armR;
    const rest = [-0.55, 0.25, 0.1];
    const pet = keys(t, [[61.4, 0], [61.8, 1], [64.45, 1]]);
    homeAffan(t, {
      yaw: -0.15, headYaw: 0.02 + 0.04 * wobble(t, 2), smile: 1, brow: 0.5,
      armR: th > 0 ? { reach: rest.map((r, i) => lerp(r, up.reach[i], th)), pole: up.pole, thumb: th, wy: up.wy * th, wx: up.wx * th } : {},
    }, th > 0 ? 0 : pet);
    homeCat(t, { headYaw: lerp(0.15, 0.5, pet), headPitch: lerp(0, -0.25, pet), blink: pet > 0.5 ? 0.85 : catBlink(t, 1) });
    const k = easeInOut(inv(58.8, 64.45, t));
    lookCam(V(lerp(-0.1, -0.35, k), lerp(2.95, 2.85, k), lerp(6.0, 5.4, k)), V(-0.6, 2.35, 0.8), 50);
    ov.flash((1 - inv(58.8, 59.1, t)) * 0.9);
    if (th > 0.5) ov.sparkles(t, { n: 12, seed: 33, x: 560, y: 560, w: 360, h: 360, a: inv(59.2, 59.6, t) * (1 - inv(60.8, 61.2, t)), size: 30 });
    const a = pop(t, 61.18, 64.4), b = pop(t, 63.28, 64.4);
    ov.tag('r1', '600 JUTA EKOR', { x: W / 2, y: 330, o: a.o, s: a.s }, { bg: ORANGE });
    ov.tag('r2', 'LEBIH 70 BAKA', { x: W / 2, y: 470, o: b.o, s: b.s }, { bg: GREEN });
    return home;
  }],
  // S10 — "Kucing apa yang korang paling suka? Komen kat bawah!"
  [64.45, 67.65, (t) => {
    const tk = keys(t, [[64.5, 0], [64.85, 1], [66.3, 1], [66.55, 0]]);
    const dn = keys(t, [[66.45, 0], [66.75, 1], [67.65, 1]]);
    const th2 = POSES.thinkR.armR;
    homeAffan(t, {
      yaw: -0.1, smile: 1, brow: 0.4 + 0.4 * tk, headRoll: -0.12 * tk, lookX: 0.35 * tk - 0.1 * dn, lookY: 0.4 * tk - 0.5 * dn, headPitch: -0.08 * tk + 0.25 * dn,
      armR: tk > 0.01 ? { reach: [lerp(-0.55, th2.reach[0], tk), lerp(0.25, th2.reach[1], tk), lerp(0.1, th2.reach[2], tk)], pole: th2.pole, point: tk, wx: th2.wx * tk } : {},
      armL: dn > 0 ? { reach: [lerp(0.55, 0.75, dn), lerp(0.25, 0.25, dn), lerp(0.1, 0.85, dn)], point: dn, pole: [1, 0.5, -0.5] } : {},
    });
    homeCat(t, { headYaw: 0.1, headPitch: 0.0, meow: keys(t, [[66.55, 0], [66.7, 0.9], [67.1, 0.9], [67.3, 0]]) });
    const k = easeInOut(inv(64.45, 67.65, t));
    lookCam(V(lerp(-0.25, -0.1, k), lerp(2.9, 2.8, k), lerp(5.4, 5.0, k)), V(-0.5, 2.4, 0.8), 50);
    const q = pop(t, 64.64, 67.6);
    ov.bubble('suka', 'KUCING APA\nKORANG SUKA?', { x: W / 2, y: 410 + Math.sin(t * 3) * 6, o: q.o, s: q.s }, { size: 110 });
    [[64.9, 140, 760, '#ffcf33', -12], [65.2, 930, 720, '#3fa2ff', 10]].forEach(([a, x, y, c, r], i) => {
      const p = pop(t, a, 67.6);
      ov.html('sq' + i, ICONS.qmark(c), { x, y: y + Math.sin(t * 3 + i) * 10, o: p.o, s: p.s * 0.7, r });
    });
    const cm = pop(t, 66.6, 67.6, { from: 2 });
    ov.html('cmt', COMMENT, { x: 800, y: 1090, o: cm.o, s: cm.s * 1.1, r: 6 });
    for (let i = 0; i < 2; i++) ov.html('dn' + i, DOWN(i ? '#ff8a3d' : '#ffd84a'), { x: 140 + i * 800, y: 1260 + Math.abs(Math.sin(t * 6 + i)) * 30, o: cm.o, s: cm.s * 0.85 });
    return home;
  }],
  // Outro — logo with Affan and his cat
  [67.65, DURATION, (t) => {
    const k = easeOut(inv(67.65, 68.35, t));
    outro.aff.root.position.set(0, 0, 0);
    const th2 = POSES.thinkR.armR;
    outro.aff.pose({ ...POSES.thinkR, armR: { ...th2 }, smile: 1, blink: blinkAt(t, 9), headRoll: -0.08, lookX: 0.25, lookY: 0.15, headYaw: 0.08 });
    lookCam(V(0, 2.6, lerp(7.5, 5.4, k)), V(0, 2.3, 0), 40);
    const hc = scr(V(0, 2.95, 0));
    ov.flash((1 - inv(67.65, 68.0, t)) * 1.0);
    const g = ov.g;
    const ra = inv(67.75, 68.35, t);
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
    const ic = pop(t, 68.25, 99);
    ov.html('oPaw', PAW('#ff9ac8'), { x: 175, y: 470 + Math.sin(t * 2) * 8, o: ic.o, s: ic.s * 0.7, r: -10 });
    ov.html('oQ1', ICONS.qmark('#ffcf33'), { x: 880, y: 420 + Math.sin(t * 2 + 1) * 8, o: ic.o, s: ic.s * 0.9, r: 12 });
    ov.html('oQ2', ICONS.qmark('#2f6fff'), { x: 220, y: 720 + Math.sin(t * 2 + 2) * 8, o: ic.o, s: ic.s * 0.6, r: -12 });
    const l1 = pop(t, 67.95, 99), l2 = pop(t, 68.15, 99), l3 = pop(t, 68.35, 99);
    drawLogo(ov, { k: [l1, l2, l3], star: pop(t, 68.55, 99) });
    return outro;
  }],
];

function frame(t) {
  ov.begin();
  cam.aspect = W / H;
  cam.updateProjectionMatrix();
  const shot = SHOTS.find(([a, b]) => t >= a && t < b) || SHOTS[SHOTS.length - 1];
  globeW.stars.userData.update(t);
  show.sparkles.userData.update(t);
  show.crowd.visible = false;
  show.carousel.visible = true;
  const world = shot[2](t);
  if (world.crowd) {
    show.crowd.visible = true;
    show.carousel.visible = false;
    show.aff.root.visible = false;
  }
  if (world.sky) {
    world.sky.position.copy(cam.position);
    if (world.stars) world.stars.position.copy(cam.position);
  }
  renderer.render(world.scene, cam);
  if (world !== outro) ov.vignette(0.28);
  ov.captions(t, CAPTIONS, KEYWORDS);
  ov.end();
}

// Cover / thumbnail (9:16): Affan amazed among the breed carousel, big title,
// episode badge and the series logo. No captions. Key elements stay inside the
// centre 3:4 area (y 240-1680) that profile grids show.
function thumbnail() {
  ov.begin();
  cam.aspect = W / H;
  cam.updateProjectionMatrix();
  const t = 56.0;
  show.sparkles.userData.update(t);
  show.crowd.visible = false;
  show.carousel.visible = true;
  poseStage(55.25);
  show.cats.forEach((c, i) => c.cat.pose({ t: i, sit: 1, blink: 0, headPitch: -0.12, headYaw: 0.15 * Math.sin(i * 2), tail: 1 }));
  show.aff.root.visible = true;
  show.aff.root.position.set(0, 0.62, 0);
  show.aff.pose({ yaw: 0, blink: 0, talk: 0, wow: 0.9, brow: 1, smile: 1, armL: { reach: [1.05, 1.75, 0.35], pole: [1, -0.6, -0.4] }, armR: { reach: [-1.05, 1.75, 0.35], pole: [-1, -0.6, -0.4] } });
  show.beam.material.opacity = 0;
  show.spot.intensity = 220;
  lookCam(V(0, 5.6, 11.6), V(0, 1.3, 0), 50);
  renderer.render(show.scene, cam);
  const g = ov.g;
  const top = g.createLinearGradient(0, 0, 0, 760);
  top.addColorStop(0, 'rgba(14,10,52,0.85)');
  top.addColorStop(1, 'rgba(14,10,52,0)');
  g.fillStyle = top;
  g.fillRect(0, 0, W, 760);
  const bot = g.createLinearGradient(0, H - 900, 0, H);
  bot.addColorStop(0, 'rgba(14,10,52,0)');
  bot.addColorStop(1, 'rgba(14,10,52,0.8)');
  g.fillStyle = bot;
  g.fillRect(0, H - 900, W, 900);
  ov.vignette(0.3);
  ov.sparkles(1.3, { n: 18, seed: 17, y: 600, h: 700, size: 26 });
  ov.tag('thBadge', 'EPISOD 24', { x: W / 2, y: 300 }, { bg: '#2f7bff', small: true });
  ov.bubble('thTitle', 'BERAPA EKOR\nKUCING DI DUNIA?', { x: W / 2, y: 480, r: -2 }, { size: 108 });
  ov.html('thPaw', PAW('#ff9ac8'), { x: 130, y: 790, r: -14, s: 0.7 });
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
