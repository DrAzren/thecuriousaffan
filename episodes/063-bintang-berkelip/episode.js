// THE CURIOUS AFFAN — Episode 063: "Kenapa Bintang Berkelip?"
// Every shot is a pure function of time t (seconds), synced to audio/narration.mp3.
import * as THREE from 'three';
import { makeRenderer, loadEnvelope, toScreen, clamp, lerp, inv, easeOut, easeIn, easeInOut, keys, W, H } from '../../shared/core.js';
import { POSES, blinkAt } from '../../shared/affan.js';
import { Overlay, pop, ICONS, drawLogo } from '../../shared/overlay.js';
import { CAPTIONS, KEYWORDS } from './captions.js';
import { buildPark63, buildSkyLab, buildOutro, setRay, twinkle, A_PK, SPACE_AT, AIR_AT, COMP_AT, ASTRO_AT, LAYER_Y } from './worlds.js';

const FPS = 30;
const DURATION = 57.15;
const OUTRO = 54.0;

const stage = document.getElementById('stage');
const canvas = document.createElement('canvas');
stage.appendChild(canvas);
const renderer = makeRenderer(canvas);
const ov = new Overlay(stage);
const park = buildPark63();
const lab = buildSkyLab();
const outro = buildOutro();
const cam = new THREE.PerspectiveCamera(50, W / H, 0.02, 6000);
let env = { at: () => 0 };

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const talk = (t) => clamp(env.at(t) * 1.2);
const scr = (p) => toScreen(p, cam);
const mix3 = (a, b, k) => a.map((v, i) => lerp(v, b[i], k));
const BLUE = '#2f9bff', ORANGE = '#ff8a3d', PURPLE = '#7a5cf0', GREEN = '#2fbf5f', PINK = '#ff5c9a', RED = '#ff4d5e', GREY = '#6a7488', GOLD = '#d8a020';

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
function parkAff(t, p = {}) {
  const a = park.aff;
  a.root.position.copy(A_PK);
  a.pose({ yaw: 0.15, blink: blinkAt(t, 1), talk: talk(t), smile: 0.9, ...p });
  a.root.updateMatrixWorld(true);
}
function parkSet(t, { twk = 1 } = {}) {
  park.setNight(t, 1);
  park.heroes.forEach((s) => {
    const k = twk ? twinkle(t, s.userData.seed) : 0.85;
    s.scale.setScalar(s.userData.base * (0.6 + 0.6 * k));
    s.material.opacity = 0.5 + 0.5 * k;
  });
}
const SKY_LOOK = V(4, 100, -150);

// =================================================================== lab
function spaceSet(t, travel = 0) {
  lab.stars.material.uniforms.uTime.value = 0; // steady in space
  const a = lab.farStar.position, b = lab.earth.position.clone().add(V(0, 2.6, 0));
  const k = clamp(travel);
  const mid = a.clone().lerp(b, 0.5);
  lab.rayLine.position.copy(mid);
  lab.rayLine.lookAt(b);
  lab.rayLine.rotateX(Math.PI / 2);
  lab.rayLine.scale.set(1, a.distanceTo(b), 1);
  lab.rayLine.visible = travel > 0;
  lab.photon.visible = travel > 0 && travel < 1.05;
  lab.photon.position.copy(a.clone().lerp(b, k));
  lab.photon.scale.setScalar(lerp(1.6, 0.5, k));
}
// bend: 0 straight .. 1 wobbly; returns the apparent offset of the star
function airSet(t, bend = 0) {
  lab.layers.forEach((m, i) => {
    const p = m.geometry.attributes.position, base = m.userData.base;
    for (let j = 0; j < p.count; j++) p.setY(j, base[j * 3 + 1] + 0.14 * Math.sin(base[j * 3] * 1.3 + t * (1.4 + i * 0.4) + i));
    p.needsUpdate = true;
    m.position.x = 0.8 * Math.sin(t * 0.7 + i * 1.3);
  });
  const eye = V(0, 0.6 + 0.42 * 3.1, 0.6);
  const off = LAYER_Y.map((y, i) => bend * 0.45 * (Math.sin(t * (3.1 + i * 1.7) + i * 2) + 0.5 * Math.sin(t * (7.3 + i) + i)));
  const pts = [V(0, 9.6, 0), ...LAYER_Y.map((y, i) => V(off[i], y, 0)), eye];
  setRay(lab.ray, pts, 0.05);
  const apparent = off.reduce((s, v) => s + v, 0) * 0.5;
  lab.airStar.position.set(apparent * bend, 9.8, 0);
  const k = bend > 0 ? twinkle(t, 1) : 0.9;
  lab.airStar.scale.setScalar(2.2 * (0.6 + 0.6 * k * (bend > 0 ? 1 : 0.8)));
  lab.littleAff.pose({ yaw: 0, headPitch: -0.45, lookY: 0.6, blink: blinkAt(t, 3), smile: 0.8 });
}
function compSet(t) {
  const rays = lab.compRays;
  rays.forEach(({ m, src, k }) => {
    let x0, y0 = 6.0;
    if (src === 'moon') x0 = -3.1 + k * 0.3;
    else if (src === 'planet') x0 = -0.35 + k * 0.23;
    else x0 = 2.3;
    const amp = src === 'star' ? 0.35 : 0.25;
    const jit = (y, i) => amp * Math.sin(t * (4 + i * 2.3 + k * 0.7) + k * 1.3 + i);
    setRay(m, [V(x0, y0 - 0.6, 0), V(x0 + jit(3.8, 0), 3.8, 0), V(x0 + jit(2.8, 1), 2.8, 0), V(x0 * 0.6, 0.6, 0)], 0.025);
  });
  lab.cStar.scale.setScalar(1.6 * (0.5 + 0.7 * twinkle(t, 4)));
  lab.planet.rotation.y = t * 0.3;
}
function astroSet(t) {
  const a = lab.astroAff;
  a.root.position.set(0, 0.4 * Math.sin(t * 0.8), 0);
  a.root.rotation.set(0.1 * Math.sin(t * 0.6), 0.2, 0.08 * Math.sin(t * 0.7));
  a.pose({ smile: 1, blink: blinkAt(t, 7), talk: talk(t), armL: { reach: [0.75, 0.9, 0.2], pole: [1, -0.5, 0] }, armR: { reach: [-0.75, 0.9, 0.2], pole: [-1, -0.5, 0] }, legL: { x: -0.3, knee: 0.5 }, legR: { x: 0.2, knee: 0.3 } });
  a.root.updateMatrixWorld(true);
  lab.helmet.position.copy(lab.astro.worldToLocal(a.parts.head.getWorldPosition(V())));
  lab.steady.forEach((s, i) => s.scale.setScalar(1.2 + (i % 3) * 0.4));
}

// =================================================================== SHOTS
const SHOTS = [
  // S1 — the park at night: Affan looks up at the stars
  [0, 2.12, (t) => {
    parkSet(t);
    parkAff(t, { yaw: 0.4, headPitch: -0.3, lookY: 0.5, talk: 0 });
    camMove(t, 0, 2.12, [A_PK.x + 1.4, 2.4, A_PK.z + 6.4], [A_PK.x, 1.9, A_PK.z], [A_PK.x + 1.2, 2.2, A_PK.z + 5.4], [A_PK.x, 2.0, A_PK.z], 50);
    const q = pop(t, 0.4, 2.1);
    ov.tag('ep', 'EPISOD 63', { x: W / 2, y: 268, o: q.o, s: q.s }, { bg: '#2f7bff', small: true });
    return park;
  }],
  // S2 — "Papa! Bintang tu berkelip-kelip, tapi bulan tak berkelip pun!"
  [2.12, 6.86, (t) => {
    parkSet(t);
    parkAff(t, { headPitch: -0.3, lookY: 0.5 });
    const ah = affHead();
    lookCam(ah.clone().add(V(0.3, 0.2, 1.0)), ah.clone().add(SKY_LOOK), 50);
    park.skyG.position.copy(cam.position);
    park.skyG.updateMatrixWorld(true);
    const pp = pop(t, 2.16, 3.1, { from: 2 });
    ov.bubble('papa', 'PAPA!', { x: 800, y: 470, o: pp.o, s: pp.s * 0.8, r: 6 }, { size: 110 });
    pinTag('kelip', 'BERKELIP-KELIP!', scr(park.heroes[0].getWorldPosition(V())), t, 3.66, 6.84, { bg: GOLD, pointer: 'down' }, -110);
    pinTag('bulan', 'BULAN: TAK BERKELIP', scr(park.moon.getWorldPosition(V())), t, 5.36, 6.84, { bg: GREY, pointer: 'up' }, 140);
    return park;
  }],
  // S3 — "Kenapa bintang berkelip?"
  [6.86, 8.44, (t) => {
    parkSet(t);
    parkAff(t, { ...POSES.thinkR, brow: -0.3, smile: 0.5 });
    const ah = affHead();
    lookCam(front(3.3), ah.clone().add(V(0, -0.35, 0)), 46);
    const hd = scr(ah.clone().add(V(0, 0.4, 0)));
    qmarks(t, hd, 6.88, 8.42, [[6.9, -260, 100, '#ffcf33', -12], [7.2, 250, 60, '#3fa2ff', 10], [7.5, 280, 240, '#ffcf33', 14]]);
    bubble('kenapa', 'KENAPA BINTANG\nBERKELIP?', t, 6.9, 8.42, 430, 110, { top: '#fffbe6', bot: '#e8c84a' });
    return park;
  }],
  // S4 — "Jom ikut Affan cari jawapan!" then up into the sky
  [8.44, 10.48, (t) => {
    parkSet(t);
    const up = keys(t, [[8.46, 0], [8.7, 1], [9.6, 1], [9.9, 0.6]], easeOut);
    parkAff(t, { smile: 1, brow: 0.6, armR: { reach: [lerp(-0.6, -0.55, up), lerp(0.25, 1.95 + 0.06 * Math.sin(t * 14), up), lerp(0.2, 0.35, up)], pole: [-1, -0.3, -0.5] } });
    const ah = affHead();
    const k = easeIn(inv(9.4, 10.48, t));
    const p0 = front(3.3), l0 = ah.clone().add(V(0, -0.35, 0));
    lookCam(p0.clone().lerp(ah.clone().add(V(0, 1.5, 0)), k), l0.lerp(ah.clone().add(SKY_LOOK), k), 46);
    park.skyG.position.copy(cam.position);
    ov.swirl(t, W / 2, 820, inv(8.5, 10.4, t));
    ov.flash(inv(10.1, 10.48, t) ** 2, '255,250,230');
    return park;
  }],
  // S5 — stars don't really twinkle; very far away, their light arrives as one tiny point
  [10.48, 19.46, (t) => {
    spaceSet(t, easeInOut(inv(15.22, 18.4, t)));
    camMove(t, 10.48, 19.46, [SPACE_AT.x + 3.2, SPACE_AT.y + 1.2, SPACE_AT.z + 9.5], [SPACE_AT.x + 1.6, SPACE_AT.y + 4.6, SPACE_AT.z - 20], [SPACE_AT.x + 3.0, SPACE_AT.y + 1.0, SPACE_AT.z + 8.2], [SPACE_AT.x + 1.2, SPACE_AT.y + 2.6, SPACE_AT.z - 20], 50);
    ov.flash(1 - inv(10.48, 10.8, t));
    bubble('sebenar', 'SEBENARNYA BINTANG\nTAK BERKELIP!', t, 11.7, 13.16, 430, 96, { top: '#fffbe6', bot: '#e8c84a' });
    pinTag('jauh', 'SANGAT JAUH', scr(lab.farStar.position.clone()), t, 13.18, 15.2, { bg: PURPLE, pointer: 'up' }, 90);
    topTag('sampai', 'CAHAYANYA SAMPAI...', t, 15.22, 17.1, GOLD);
    bubble('titik', 'SATU TITIK\nYANG SANGAT HALUS', t, 17.14, 19.44, 430, 100, { top: '#fffbe6', bot: '#e8c84a' });
    return lab;
  }],
  // S6 — the light must pass through Earth's air: always moving, warm and cool, like rippling water
  [19.46, 28.2, (t) => {
    airSet(t, 0);
    camMove(t, 19.46, 28.2, AIR_AT.clone().add(V(0, 5.6, 13.0)).toArray(), AIR_AT.clone().add(V(0, 5.0, 0)).toArray(), AIR_AT.clone().add(V(0, 5.4, 12.0)).toArray(), AIR_AT.clone().add(V(0, 5.0, 0)).toArray(), 50);
    ov.flash(1 - inv(19.46, 19.8, t));
    topTag('udara', 'UDARA BUMI', t, 20.76, 23.0, BLUE);
    topTag('gerak', 'SENTIASA BERGERAK', t, 23.04, 28.18, BLUE);
    pinTag('panas', 'PANAS', scr(AIR_AT.clone().add(V(-4.2, LAYER_Y[0], 0))), t, 24.98, 28.18, { bg: ORANGE, pointer: 'down' }, -30);
    pinTag('sejuk', 'SEJUK', scr(AIR_AT.clone().add(V(4.2, LAYER_Y[1], 0))), t, 26.08, 28.18, { bg: BLUE, pointer: 'down' }, -30);
    bubble('alun', 'MACAM AIR\nYANG BERALUN', t, 26.9, 28.18, 1180, 96, { top: '#eaf6ff', bot: '#4aa8ff' });
    return lab;
  }],
  // S7 — the starlight bends this way and that, so it seems to twinkle
  [28.2, 33.36, (t) => {
    airSet(t, easeOut(inv(28.4, 29.6, t)));
    lookCam(AIR_AT.clone().add(V(0, 5.4, 12.0)), AIR_AT.clone().add(V(0, 5.0, 0)), 50);
    topTag('bengkok', 'CAHAYA TERBENGKOK KE SANA SINI', t, 29.6, 33.34, PURPLE);
    bubble('kelip', 'NAMPAK\nBERKELIP-KELIP!', t, 31.6, 33.34, 1180, 104, { top: '#fffbe6', bot: '#e8c84a' });
    return lab;
  }],
  // S8 — "Tahu tak? Bulan dan planet lebih dekat dan nampak lebih besar..."
  [33.36, 40.32, (t) => {
    compSet(t);
    camMove(t, 33.36, 40.32, COMP_AT.clone().add(V(0, 3.6, 15.0)).toArray(), COMP_AT.clone().add(V(0, 3.4, 0)).toArray(), COMP_AT.clone().add(V(0, 3.6, 14.2)).toArray(), COMP_AT.clone().add(V(0, 3.4, 0)).toArray(), 50);
    ov.flash(1 - inv(33.36, 33.7, t));
    topTag('tahu', 'TAHU TAK?', t, 33.36, 34.42, ORANGE);
    pinTag('bulanP', 'BULAN', scr(COMP_AT.clone().add(V(-2.2, 4.6, 0))), t, 34.44, 40.3, { bg: GREY, pointer: 'up' }, 30);
    pinTag('planet', 'PLANET', scr(COMP_AT.clone().add(V(0, 7.2, 0))), t, 35.02, 40.3, { bg: '#c8902a', pointer: 'down' }, -10);
    pinTag('bintang', 'BINTANG', scr(COMP_AT.clone().add(V(2.3, 4.9, 0))), t, 35.4, 40.3, { bg: GOLD, pointer: 'up' }, 30);
    topTag('dekat', 'LEBIH DEKAT & NAMPAK LEBIH BESAR', t, 35.42, 38.18, GREEN, 1280);
    bubble('tak', 'TAK BANYAK\nBERKELIP!', t, 38.2, 40.3, 1180, 104, { top: '#eafff2', bot: '#2fbf8f' });
    return lab;
  }],
  // S9 — astronauts in space see the stars not twinkling at all
  [40.32, 44.72, (t) => {
    astroSet(t);
    camMove(t, 40.32, 44.72, ASTRO_AT.clone().add(V(0.6, 1.6, 7.6)).toArray(), ASTRO_AT.clone().add(V(0, 1.4, 0)).toArray(), ASTRO_AT.clone().add(V(0.3, 1.4, 6.6)).toArray(), ASTRO_AT.clone().add(V(0, 1.5, 0)).toArray(), 50);
    ov.flash(1 - inv(40.32, 40.65, t));
    topTag('angkasa', 'DI ANGKASA (TIADA UDARA)', t, 40.32, 44.7, PURPLE);
    bubble('langsung', 'LANGSUNG\nTAK BERKELIP!', t, 42.96, 44.7, 1150, 104, { top: '#fffbe6', bot: '#e8c84a' });
    return lab;
  }],
  // S10 — "Waaah, rupanya udara yang buat bintang menari! Malam ni, cuba tengok bintang dengan keluarga."
  [44.72, 51.76, (t) => {
    parkSet(t);
    const point = t > 48.4;
    parkAff(t, { wow: keys(t, [[44.72, 0], [44.9, 0.9], [45.5, 0.9], [45.8, 0]]), smile: 1, brow: 0.6, ...(point ? { armR: { reach: [-0.45, 1.9, 0.55], pole: [-1, -0.3, -0.4], point: 1 }, headPitch: -0.15, lookY: 0.4 } : {}) });
    const ah = affHead();
    lookCam(front(point ? 4.2 : 3.3), ah.clone().add(V(0, point ? -0.3 : -0.35, 0)), 46);
    const hd = scr(ah.clone().add(V(0, 0.5, 0)));
    const b = pop(t, 44.8, 48.3);
    ov.html('bulb', ICONS.bulb(), { x: clamp(hd.x + 220, 150, 900), y: clamp(hd.y - 170, 300, 900) + Math.sin(t * 5) * 8, o: b.o, s: b.s * 0.6, r: 10 });
    ov.sparkles(t, { n: 30, seed: 12, y: 250, h: 900, a: inv(44.8, 45.1, t) * (1 - inv(47.8, 48.4, t)) });
    bubble('menari', 'UDARA BUAT\nBINTANG MENARI!', t, 46.16, 48.4, 430, 104, { top: '#fffbe6', bot: '#e8c84a' });
    bubble('keluarga', 'TENGOK BINTANG\nDENGAN KELUARGA', t, 48.44, 51.74, 430, 100, { top: '#fff0f6', bot: '#ff7ab0' });
    return park;
  }],
  // S11 — "Apa lagi kita nak belajar lepas ni?"
  [51.76, OUTRO, (t) => {
    parkSet(t);
    const tk = keys(t, [[51.78, 0], [52.2, 1]]);
    const th2 = POSES.thinkR.armR;
    parkAff(t, { smile: 1, brow: 0.3 + 0.4 * tk, headRoll: -0.12 * tk, lookX: 0.35 * tk, lookY: 0.4 * tk, headPitch: -0.08 * tk, armR: { reach: mix3([-0.55, 0.3, 0.2], th2.reach, tk), pole: th2.pole, point: tk, wx: th2.wx * tk } });
    const ah = affHead();
    lookCam(front(3.3), ah.clone().add(V(0, -0.35, 0)), 46);
    const hd = scr(ah.clone().add(V(0, 0.45, 0)));
    qmarks(t, hd, 51.76, OUTRO - 0.05, [[51.8, -260, -100, '#ffcf33', -12], [52.1, 250, -160, '#3fa2ff', 10], [52.4, 300, 60, '#ffcf33', 14]]);
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
  if (w.stars) w.stars.position.copy(cam.position);
  if (w.skyG) w.skyG.position.copy(cam.position);
  renderer.setViewport(0, 0, W, H);
  renderer.render(w.scene, cam);
  if (w !== outro) ov.vignette(0.2);
  ov.captions(t, CAPTIONS, KEYWORDS);
  ov.end();
}

// Cover / thumbnail (9:16): the air bending the starlight above little Affan.
function thumbnail() {
  ov.begin();
  cam.aspect = W / H;
  cam.updateProjectionMatrix();
  airSet(31.0, 1);
  lookCam(AIR_AT.clone().add(V(0, 5.2, 11.0)), AIR_AT.clone().add(V(0, 4.6, 0)), 50);
  lab.sky.position.copy(cam.position);
  lab.stars.position.copy(cam.position);
  renderer.setViewport(0, 0, W, H);
  renderer.render(lab.scene, cam);
  ov.vignette(0.3);
  ov.tag('thBadge', 'EPISOD 63', { x: W / 2, y: 300 }, { bg: '#2f7bff', small: true });
  ov.bubble('thTitle', 'BINTANG', { x: W / 2, y: 445, r: -3 }, { size: 140, top: '#fffbe6', bot: '#e8c84a' });
  ov.bubble('thTitle2', 'MENARI?!', { x: W / 2, y: 600, r: 2 }, { size: 140, top: '#f2e6ff', bot: '#a070ff' });
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
