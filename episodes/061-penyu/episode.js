// THE CURIOUS AFFAN — Episode 061: "Macam Mana Penyu Cari Pantai Tempat Lahir?"
// Every shot is a pure function of time t (seconds), synced to audio/narration.mp3.
import * as THREE from 'three';
import { makeRenderer, loadEnvelope, toScreen, clamp, lerp, inv, easeOut, easeIn, easeInOut, keys, W, H } from '../../shared/core.js';
import { POSES, blinkAt } from '../../shared/affan.js';
import { Overlay, pop, ICONS, drawLogo } from '../../shared/overlay.js';
import { CAPTIONS, KEYWORDS } from './captions.js';
import { buildBeach, buildOcean, buildSand, buildOutro, NEST, A_BEACH, SHORE_Z, GLOBE_R, lonLat, WARM_AT, COOL_AT } from './worlds.js';

const FPS = 30;
const DURATION = 52.95;
const OUTRO = 49.8;

const stage = document.getElementById('stage');
const canvas = document.createElement('canvas');
stage.appendChild(canvas);
const renderer = makeRenderer(canvas);
const ov = new Overlay(stage);
const beach = buildBeach();
const ocean = buildOcean();
const sand = buildSand();
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

// ===================================================================== beach
const affHead = () => beach.aff.parts.head.getWorldPosition(V());
const front = (d, side = 0.35) => affHead().add(V(side, 0.1, d));
const YAW_NEST = Math.atan2(NEST.x - A_BEACH.x, NEST.z - A_BEACH.z);
function affSet(t, p = {}) {
  const a = beach.aff;
  a.root.position.copy(A_BEACH);
  a.pose({ yaw: 0.15, blink: blinkAt(t, 1), talk: talk(t), smile: 0.9, ...p });
  a.root.updateMatrixWorld(true);
}
const MOM_AT = NEST.clone().add(V(0, 0, 1.3));
// mode: 'lay' (eggs drop), 'gone', 'leave' (crawls back to sea)
function beachSet(t, { mode = 'lay', eggs = 1, babies = 0, crawl = -1, bottle = 'sand' } = {}) {
  beach.sea.userData.update(t);
  beach.stars.material.uniforms.uTime.value = t;
  beach.foam.material.opacity = 0.5 + 0.25 * Math.sin(t * 1.5);
  const m = beach.mom;
  m.root.visible = mode !== 'gone';
  if (mode === 'lay') {
    m.root.position.copy(MOM_AT);
    m.root.rotation.set(0, 0, 0);
    m.set(t, { dig: 0.3 });
  } else if (mode === 'leave') {
    const k = clamp(crawl);
    m.root.position.copy(MOM_AT).lerp(V(-2.5, 0, SHORE_Z - 1), k);
    m.root.rotation.set(0, Math.PI + 0.25, 0);
    m.set(t, { swim: 0.8 });
  }
  beach.eggs.forEach((e, i) => {
    const n = beach.eggs.length;
    e.visible = i < eggs * n;
  });
  beach.babies.forEach((b, i) => {
    const u = b.root.userData;
    b.root.visible = babies > 0;
    if (!babies) return;
    const rise = clamp(inv(11.4 + u.ph * 0.6, 11.9 + u.ph * 0.6, t));
    const go = Math.max(0, t - 13.0 - u.ph * 0.5);
    b.root.position.set(NEST.x + u.x * 0.3 + u.lane * go * 0.15, lerp(-0.25, 0, rise), NEST.z - go * 1.1);
    b.root.rotation.set(0, Math.PI + 0.15 * Math.sin(t * 6 + i), 0);
    b.set(t, { swim: go > 0 ? 1 : 0.3 });
  });
  const bt = beach.bottle;
  if (bottle === 'sand') {
    bt.position.set(1.4, 0.07, 3.0);
    bt.rotation.set(0, 0.6, Math.PI / 2);
  } else {
    bt.position.copy(beach.aff.parts.arms.R.hand.getWorldPosition(V())).add(V(0, 0.08, 0.05));
    bt.rotation.set(0, 0, 0);
  }
}

// ===================================================================== ocean
const ROUTE_TOTAL = () => ocean.routeTube.geometry.index.count;
function oceanSet(t, { route = 0, swim = 0, loops = 0, pins = 0, grow = 0, spin = 128 } = {}) {
  ocean.stars.material.uniforms.uTime.value = t;
  ocean.earth.rotation.set(0.15, (-spin * Math.PI) / 180, 0);
  const n = ROUTE_TOTAL();
  ocean.routeTube.geometry.setDrawRange(0, Math.floor((n * clamp(route)) / 6) * 6);
  ocean.loops.forEach((l) => (l.visible = loops > 0));
  ocean.pins.forEach((p, i) => {
    const q = clamp((pins - i * 0.12) * 3);
    p.visible = q > 0;
    p.scale.setScalar(Math.max(0.001, easeOut(q)) * (i === 0 ? 1.4 : 1));
  });
  const s = ocean.swimmer;
  const u = clamp(swim);
  const p = ocean.route.getPointAt(u);
  const tg = ocean.route.getTangentAt(u);
  const up = p.clone().normalize();
  s.root.position.copy(p).add(up.clone().multiplyScalar(0.05));
  const fw = tg.clone().sub(up.clone().multiplyScalar(tg.dot(up))).normalize();
  const xx = new THREE.Vector3().crossVectors(up, fw).normalize();
  s.root.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(xx, up, fw));
  s.root.scale.setScalar(lerp(0.22, 0.34, grow));
  s.set(t, { swim: 1 });
}

// ====================================================================== sand
function sandSet(t, { warmK = 0, coolK = 0 } = {}) {
  const th = (o, h) => {
    o.fluid.scale.y = h;
    o.fluid.position.y = -0.35 + h / 2;
  };
  th(sand.warm, lerp(0.4, 1.5, easeOut(inv(34.8, 35.6, t))));
  th(sand.cool, lerp(0.4, 0.55, easeOut(inv(37.68, 38.4, t))));
  sand.warm.gl.material.opacity = 0.6 * inv(34.8, 35.3, t);
  sand.cool.gl.material.opacity = 0.6 * inv(37.68, 38.2, t);
  sand.warm.babies.forEach((b, i) => {
    const q = pop(t, 36.6 + i * 0.12, 99);
    b.root.visible = q.o > 0;
    b.root.scale.setScalar(0.32 * Math.max(0.001, q.s));
    b.set(t, { swim: 0.5 });
  });
  sand.cool.babies.forEach((b, i) => {
    const q = pop(t, 38.95 + i * 0.12, 99);
    b.root.visible = q.o > 0;
    b.root.scale.setScalar(0.32 * Math.max(0.001, q.s));
    b.set(t, { swim: 0.5 });
  });
}

// =================================================================== SHOTS
const SHOTS = [
  // S1 — moonlit beach: Affan watches a mother turtle at her nest
  [0, 2.08, (t) => {
    beachSet(t, { eggs: 0.2 });
    affSet(t, { yaw: YAW_NEST, headPitch: 0.15, talk: 0 });
    camMove(t, 0, 2.08, [-1.6, 3.0, 11.6], [1.7, 1.0, 2.2], [-1.4, 2.8, 10.8], [1.7, 1.0, 2.2], 50);
    const q = pop(t, 0.4, 2.06);
    ov.tag('ep', 'EPISOD 61', { x: W / 2, y: 268, o: q.o, s: q.s }, { bg: '#2f7bff', small: true });
    return beach;
  }],
  // S2 — "Papa! Ibu penyu ni bertelur di pantai tempat ia menetas dulu!"
  [2.08, 6.6, (t) => {
    beachSet(t, { eggs: lerp(0.2, 1, inv(3.9, 6.4, t)) });
    affSet(t, { yaw: YAW_NEST, headPitch: 0.15, wow: keys(t, [[2.1, 0], [2.3, 0.8], [3.0, 0.8], [3.2, 0]]) });
    camMove(t, 2.08, 6.6, [4.4, 2.6, 2.4], [0, 0.3, 1.5], [3.8, 2.3, 2.2], [0, 0.3, 1.4], 46);
    const pp = pop(t, 2.12, 3.1, { from: 2 });
    ov.bubble('papa', 'PAPA!', { x: 800, y: 470, o: pp.o, s: pp.s * 0.8, r: 6 }, { size: 110 });
    pinTag('ibu', 'IBU PENYU', scr(MOM_AT.clone().add(V(0, 1.0, 0.4))), t, 3.18, 6.55, { bg: GREEN, pointer: 'down' }, -30);
    pinTag('telur', 'BERTELUR', scr(NEST.clone().add(V(0, 0.2, 0))), t, 3.88, 6.55, { bg: '#e0a000', pointer: 'up' }, 90);
    topTag('tempat', 'DI PANTAI TEMPAT IA MENETAS!', t, 4.72, 6.58, BLUE);
    return beach;
  }],
  // S3 — "Macam mana penyu cari jalan pulang?"
  [6.6, 8.82, (t) => {
    beachSet(t);
    affSet(t, { ...POSES.thinkR, brow: -0.3, smile: 0.5 });
    const ah = affHead();
    lookCam(front(3.3), ah.clone().add(V(0, -0.35, 0)), 46);
    const hd = scr(ah.clone().add(V(0, 0.4, 0)));
    qmarks(t, hd, 6.62, 8.8, [[6.65, -260, 100, '#ffcf33', -12], [6.95, 250, 60, '#3fa2ff', 10], [7.3, 280, 240, '#ffcf33', 14]]);
    bubble('macam', 'MACAM MANA CARI\nJALAN PULANG?', t, 6.64, 8.8, 430, 104, { top: '#eafff2', bot: '#2fbf8f' });
    return beach;
  }],
  // S4 — "Jom ikut Affan cari jawapan!"
  [8.82, 10.72, (t) => {
    beachSet(t);
    const up = keys(t, [[8.84, 0], [9.08, 1], [10.0, 1], [10.3, 0.6]], easeOut);
    affSet(t, { smile: 1, brow: 0.6, armR: { reach: [lerp(-0.6, -0.55, up), lerp(0.25, 1.95 + 0.06 * Math.sin(t * 14), up), lerp(0.2, 0.35, up)], pole: [-1, -0.3, -0.5] } });
    const ah = affHead();
    const k = easeIn(inv(9.8, 10.72, t));
    lookCam(front(3.3).lerp(NEST.clone().add(V(0.2, 0.6, 1.0)), k), ah.clone().add(V(0, -0.35, 0)).lerp(NEST, k), 46);
    ov.swirl(t, W / 2, 820, inv(8.86, 10.65, t));
    ov.flash(inv(10.35, 10.72, t) ** 2, '230,240,255');
    return beach;
  }],
  // S5 — hatchlings dig out and crawl to the sea, following the light on the horizon
  [10.72, 16.42, (t) => {
    beachSet(t, { mode: 'gone', eggs: 0, babies: 1 });
    affSet(t, { yaw: YAW_NEST });
    if (t < 13.0) camMove(t, 10.72, 13.0, [1.4, 2.2, 4.2], [0, 0, 1.0], [1.2, 2.0, 3.8], [0, 0, 0.9], 46);
    else camMove(t, 13.0, 16.4, [1.2, 2.0, 3.8], [0, 0, 0.9], [1.6, 1.5, 2.6], [-0.8, 1.6, -12], 46);
    ov.flash(1 - inv(10.72, 11.05, t));
    topTag('anak', 'ANAK PENYU MENETAS!', t, 11.56, 13.2, GREEN);
    topTag('laut', 'MERANGKAK KE LAUT', t, 13.22, 14.6, BLUE);
    bubble('cahaya', 'IKUT CAHAYA DI\nKAKI LANGIT', t, 14.62, 16.4, 430, 100, { top: '#fffbe6', bot: '#e8c84a' });
    return beach;
  }],
  // S6 — swims thousands of kilometres, for years, across the ocean
  [16.42, 22.74, (t) => {
    const out = easeInOut(inv(16.6, 22.4, t));
    oceanSet(t, { route: out * 0.56, swim: out * 0.55, spin: lerp(112, 138, out) });
    camMove(t, 16.42, 22.74, [0, 1.4, 14.0], [0, 0.3, 0], [0, 1.0, 12.5], [0, 0.4, 0], 50);
    ov.flash(1 - inv(16.42, 16.75, t));
    const km = Math.round(lerp(0, 10000, easeOut(inv(17.06, 19.1, t))) / 100) * 100;
    if (t > 17.06) topTag('km', `${km.toLocaleString('en-US')} KM`, t, 17.06, 22.72, ORANGE);
    const yr = Math.max(1, Math.round(lerp(1, 20, inv(19.24, 21.0, t))));
    if (t > 19.24) topTag('yr', `${yr} TAHUN`, t, 19.24, 22.72, PURPLE, 410);
    bubble('rentas', 'MERENTAS\nLAUTAN!', t, 21.14, 22.72, 1150, 100, { top: '#eaf6ff', bot: '#4aa8ff' });
    return ocean;
  }],
  // S7 — the secret: turtles can feel the Earth's magnetism; every beach has its own address
  [22.74, 33.82, (t) => {
    const back = easeInOut(inv(31.3, 33.6, t));
    oceanSet(t, { route: lerp(0.56, 1, back), swim: lerp(0.55, 1, back), loops: t > 24.5 ? 1 : 0, pins: inv(26.04, 27.6, t), grow: easeInOut(inv(29.6, 30.6, t)), spin: lerp(138, 112, easeInOut(inv(28.4, 31.0, t))) });
    const zoom = easeInOut(inv(24.5, 25.3, t)) * (1 - easeInOut(inv(28.4, 29.4, t)));
    lookCam(V(0, lerp(1.0, 2.0, zoom), lerp(12.5, 19, zoom)), V(0, lerp(0.4, 0.2, zoom), 0), 50);
    bubble('rahsia', 'RAHSIANYA...', t, 22.74, 24.5, 440, 120, { top: '#f2e6ff', bot: '#a070ff' });
    topTag('magnet', 'PENYU BOLEH RASA MAGNET BUMI!', t, 24.62, 26.0, '#d8a020');
    topTag('tanda', 'SETIAP PANTAI ADA TANDA MAGNET SENDIRI', t, 26.04, 28.66, PURPLE);
    ocean.earth.updateMatrixWorld(true);
    const home = scr(ocean.pins[0].localToWorld(V(0, 0, 0.6)));
    pinTag('alamat', 'ALAMAT RUMAH!', home, t, 28.7, 31.3, { bg: PINK, pointer: 'down' }, -40);
    topTag('dewasa', 'BILA DEWASA...', t, 29.56, 31.4, GREEN);
    bubble('pulang', 'PULANG!', t, 32.6, 33.8, 440, 130, { top: '#fff0f6', bot: '#ff7ab0' });
    return ocean;
  }],
  // S8 — "Tahu tak? Pasir panas jadi betina, pasir sejuk jadi jantan!"
  [33.82, 40.2, (t) => {
    sandSet(t);
    camMove(t, 33.82, 40.2, [0, 3.0, 13.6], [0, 1.2, 0], [0, 2.8, 12.6], [0, 1.2, 0], 50);
    ov.flash(1 - inv(33.82, 34.15, t));
    topTag('tahu', 'TAHU TAK?', t, 33.82, 34.78, ORANGE);
    pinTag('panas', 'PASIR PANAS', scr(WARM_AT.clone().add(V(0, 3.6, 0.9))), t, 34.8, 40.18, { bg: ORANGE, pointer: 'down' }, -20);
    pinTag('betina', 'BETINA', scr(WARM_AT.clone().add(V(0, -0.3, 1.3))), t, 36.7, 40.18, { bg: PINK, pointer: 'up' }, 70);
    pinTag('sejuk', 'PASIR SEJUK', scr(COOL_AT.clone().add(V(0, 3.6, 0.9))), t, 37.68, 40.18, { bg: BLUE, pointer: 'down' }, -20);
    pinTag('jantan', 'JANTAN', scr(COOL_AT.clone().add(V(0, -0.3, 1.3))), t, 39.04, 40.18, { bg: '#2a6ad0', pointer: 'up' }, 70);
    return sand;
  }],
  // S9 — "Waaah, rupanya penyu ada kompas dalam badan! Jangan ganggu penyu..."
  [40.2, 47.46, (t) => {
    const pick = easeOut(inv(45.0, 45.6, t));
    beachSet(t, { mode: 'leave', crawl: inv(40.2, 47.4, t), eggs: 0, bottle: pick > 0.5 ? 'hand' : 'sand' });
    affSet(t, { wow: keys(t, [[40.2, 0], [40.4, 0.9], [41.0, 0.9], [41.3, 0]]), smile: 1, brow: 0.6, ...(pick > 0 ? { armR: { reach: mix3([-0.5, 0.2, 0.3], [-0.3, 1.0, 0.65], pick), pole: [-1, -0.6, -0.3] } } : {}) });
    const ah = affHead();
    lookCam(front(t < 43.9 ? 3.3 : 4.4, 0.6), ah.clone().add(V(0, t < 43.9 ? -0.35 : -0.7, 0)), 46);
    const hd = scr(ah.clone().add(V(0, 0.5, 0)));
    const b = pop(t, 40.25, 43.8);
    ov.html('bulb', ICONS.bulb(), { x: clamp(hd.x + 220, 150, 900), y: clamp(hd.y - 170, 300, 900) + Math.sin(t * 5) * 8, o: b.o, s: b.s * 0.6, r: 10 });
    ov.sparkles(t, { n: 30, seed: 12, y: 250, h: 900, a: inv(40.25, 40.55, t) * (1 - inv(43.2, 43.8, t)) });
    bubble('kompas', 'KOMPAS DALAM\nBADAN!', t, 41.54, 43.88, 430, 112, { top: '#fff6d0', bot: '#ffb21f' });
    bubble('ganggu', 'JANGAN GANGGU\nPENYU', t, 43.92, 45.06, 430, 104, { top: '#eafff2', bot: '#2fbf8f' });
    bubble('sampah', 'JANGAN BUANG\nSAMPAH!', t, 45.1, 47.44, 430, 108, { top: '#fff0f0', bot: '#ff6a6a' });
    return beach;
  }],
  // S10 — "Apa lagi kita nak belajar lepas ni?"
  [47.46, OUTRO, (t) => {
    beachSet(t, { mode: 'gone', eggs: 0, bottle: 'hand' });
    beach.bottle.visible = false;
    const tk = keys(t, [[47.48, 0], [47.9, 1]]);
    const th2 = POSES.thinkR.armR;
    affSet(t, { smile: 1, brow: 0.3 + 0.4 * tk, headRoll: -0.12 * tk, lookX: 0.35 * tk, lookY: 0.4 * tk, headPitch: -0.08 * tk, armR: { reach: mix3([-0.55, 0.3, 0.2], th2.reach, tk), pole: th2.pole, point: tk, wx: th2.wx * tk } });
    const ah = affHead();
    lookCam(front(3.3), ah.clone().add(V(0, -0.35, 0)), 46);
    const hd = scr(ah.clone().add(V(0, 0.45, 0)));
    qmarks(t, hd, 47.46, OUTRO - 0.05, [[47.5, -260, -100, '#ffcf33', -12], [47.8, 250, -160, '#3fa2ff', 10], [48.1, 300, 60, '#ffcf33', 14]]);
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
  beach.bottle.visible = true;
  const w = shot[2](t);
  if (w.sky) w.sky.position.copy(cam.position);
  if (w.stars) w.stars.position.copy(cam.position);
  renderer.setViewport(0, 0, W, H);
  renderer.render(w.scene, cam);
  if (w !== outro) ov.vignette(0.2);
  ov.captions(t, CAPTIONS, KEYWORDS);
  ov.end();
}

// Cover / thumbnail (9:16): the globe with the glowing turtle route and magnet loops.
function thumbnail() {
  ov.begin();
  cam.aspect = W / H;
  cam.updateProjectionMatrix();
  oceanSet(30, { route: 1, swim: 0.62, loops: 1, pins: 1, grow: 1, spin: 125 });
  ocean.swimmer.root.scale.setScalar(0.45);
  lookCam(V(0, 0.6, 11.0), V(0, 0.2, 0), 50);
  ocean.sky.position.copy(cam.position);
  ocean.stars.position.copy(cam.position);
  renderer.setViewport(0, 0, W, H);
  renderer.render(ocean.scene, cam);
  ov.vignette(0.3);
  ov.tag('thBadge', 'EPISOD 61', { x: W / 2, y: 300 }, { bg: '#2f7bff', small: true });
  ov.bubble('thTitle', 'PENYU', { x: W / 2, y: 445, r: -3 }, { size: 140, top: '#eafff2', bot: '#2fbf8f' });
  ov.bubble('thTitle2', 'ADA GPS?!', { x: W / 2, y: 600, r: 2 }, { size: 140, top: '#fff6d0', bot: '#ffb21f' });
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
