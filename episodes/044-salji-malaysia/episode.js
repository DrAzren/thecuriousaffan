// THE CURIOUS AFFAN — Episode 044: "Apa Jadi Kalau Malaysia Ada Salji?"
// Every shot is a pure function of time t (seconds), synced to audio/narration.mp3.
import * as THREE from 'three';
import { makeRenderer, loadEnvelope, toScreen, clamp, lerp, inv, easeOut, easeIn, easeInOut, keys, rng, W, H } from '../../shared/core.js';
import { POSES, blinkAt } from '../../shared/affan.js';
import { Overlay, pop, ICONS, drawLogo } from '../../shared/overlay.js';
import { CAPTIONS, KEYWORDS } from './captions.js';
import { buildPark, buildCloud, buildGlobe, buildMountain, buildSnowLand, buildOutro, setSnowfall, A_PK, EARTH_R, SUN_G, PEAK_Y, SPOT } from './worlds.js';

const FPS = 30;
const DURATION = 73.75;
const OUTRO = 70.6;

const stage = document.getElementById('stage');
const canvas = document.createElement('canvas');
stage.appendChild(canvas);
const renderer = makeRenderer(canvas);
const ov = new Overlay(stage);
const park = buildPark();
const cloud = buildCloud();
const globe = buildGlobe();
const mtn = buildMountain();
const land = buildSnowLand();
const outro = buildOutro();
const cam = new THREE.PerspectiveCamera(50, W / H, 0.02, 6000);
let env = { at: () => 0 };

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const talk = (t) => clamp(env.at(t) * 1.2);
const scr = (p) => toScreen(p, cam);
const mix3 = (a, b, k) => a.map((v, i) => lerp(v, b[i], k));
const BLUE = '#2f9bff', ORANGE = '#ff8a3d', PURPLE = '#7a5cf0', GREEN = '#2fbf5f', PINK = '#ff5c9a', YELLOW = '#e0b400', RED = '#ff4d5e', ICEB = '#4ab8e8';

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
// a thermometer card (HTML) showing a temperature
function thermo(id, temp, x, y, t, a, b) {
  const q = pop(t, a, b);
  if (q.o <= 0) return;
  const k = clamp((temp + 15) / 50);
  const col = temp <= 0 ? '#3a9cff' : temp < 20 ? '#2fbf8f' : '#ff5a3a';
  ov.html(id, `<div style="width:170px;background:#fff;border:8px solid #17256b;border-radius:30px;padding:14px 0;text-align:center">
    <div style="margin:0 auto;width:40px;height:260px;border-radius:20px;background:#e8eef8;border:5px solid #17256b;position:relative;overflow:hidden">
      <div style="position:absolute;bottom:0;left:0;right:0;height:${Math.round(k * 100)}%;background:${col}"></div></div>
    <div style="font:800 52px 'Baloo 2';color:${col};margin-top:6px">${Math.round(temp)}°C</div></div>`, { x, y, o: q.o, s: q.s * 0.8 });
}

// ===================================================================== park
const affHead = () => park.aff.parts.head.getWorldPosition(V());
const FAN = (t) => ({ reach: [-0.35, 1.25 + 0.06 * Math.sin(t * 14), 0.55], pole: [-1, -0.4, -0.2], wz: 0.6 * Math.sin(t * 14) });
function parkAff(t, p = {}) {
  const a = park.aff;
  a.root.position.copy(A_PK);
  a.pose({ yaw: 0.15, blink: blinkAt(t, 1), talk: talk(t), smile: 0.9, ...p });
  a.root.updateMatrixWorld(true);
}
function sweat(t, on) {
  park.sweat.forEach((d, i) => {
    const u = ((t * 0.6 + i / 3) % 1);
    d.visible = on;
    if (!on) return;
    d.position.copy(park.aff.parts.head.localToWorld(V(i === 1 ? -0.55 : 0.55, 0.3 - u * 0.6, 0.35)));
  });
}
const front = (d, side = 0.35) => affHead().add(V(side, 0.1, d));

// ==================================================================== cloud
function cloudSet(t, freeze = 0, big = 0) {
  cloud.drops.forEach((o, i) => {
    const u = clamp(freeze * 1.4 - (i % 5) * 0.08);
    o.g.position.y += 0;
    o.g.rotation.z = t * 0.3 * o.g.userData.rot;
    o.g.position.x += 0;
    o.d.scale.setScalar(Math.max(0.001, 1 - u));
    o.f.scale.setScalar(Math.max(0.001, u * 0.45));
    o.g.visible = big < 0.95;
  });
  const b = cloud.big;
  b.visible = big > 0.01;
  b.position.set(0, 2.0, 2.0);
  b.scale.setScalar(easeOut(big) * 1.6);
  b.rotation.set(0.15 * Math.sin(t * 0.7), 0.25 * Math.sin(t * 0.5), t * 0.25);
  cloud.bigGlow.position.copy(b.position).add(V(0, 0, -0.5));
  cloud.bigGlow.material.opacity = 0.6 * big;
}

// ==================================================================== globe
const MY_DIR = V(0.18, 0.04, 1).normalize();
function globeSet(t, beams = 0) {
  globe.earth.rotation.set(0.0, 0.25 * Math.sin(t * 0.2) - 0.2, 0);
  globe.pin.position.copy(MY_DIR).multiplyScalar(EARTH_R);
  globe.pin.quaternion.setFromUnitVectors(V(0, 1, 0), MY_DIR);
  globe.earth.updateMatrixWorld(true);
  // parallel beams from the Sun (to the left): one to the equator, one near each pole
  const targets = [V(-EARTH_R, 0, 0), V(-EARTH_R * Math.cos(1.15), EARTH_R * Math.sin(1.15), 0), V(-EARTH_R * Math.cos(1.15), -EARTH_R * Math.sin(1.15), 0)];
  globe.beams.forEach((m, i) => {
    const to = targets[i];
    const from = V(SUN_G.x + 2.4, to.y, 0);
    const k = easeOut(inv(0, 1, beams - i * 0.25));
    if (k <= 0) {
      m.visible = false;
      return;
    }
    const end = from.clone().lerp(to, k);
    const d = end.clone().sub(from);
    m.position.copy(from);
    m.quaternion.setFromUnitVectors(V(0, 1, 0), d.clone().normalize());
    m.scale.set(i === 0 ? 0.35 : 0.22, d.length(), i === 0 ? 0.35 : 0.22);
    m.visible = true;
  });
}

// ================================================================= mountain
function mtnSet(t, ice = 0) {
  mtn.ice.forEach((m) => (m.visible = ice > 0.02));
  mtn.sparks.forEach((s, i) => {
    const m = mtn.ice[i * 2];
    s.position.copy(m.position).add(V(0, 0.2, 0.3));
    s.material.opacity = ice * Math.max(0, Math.sin(t * 5 + i * 1.7));
    s.scale.setScalar(0.6 + 0.4 * Math.sin(t * 4 + i));
  });
  mtn.aff.pose({ yaw: -0.4, blink: blinkAt(t, 2), smile: 0.9, headPitch: -0.45, lookY: 0.6, armR: { reach: [-0.55, 1.6, 0.4], pole: [-1, -0.5, -0.3], point: 1 } });
}

// ============================================================== snowy land
function landSet(t, { wilt = 0 } = {}) {
  land.wilt(wilt);
  setSnowfall(land.sf, t, 1, V(8, 0, 0), 10);
  land.sf.flakes.forEach((s) => (s.userData.x = s.userData.x));
  // orang utan shivers; the bear is comfy
  land.ou.position.copy(SPOT.animals).add(V(-1.6 + 0.03 * Math.sin(t * 50), 0, 0.5));
  land.bear.position.copy(SPOT.animals).add(V(1.9, 0.03 * Math.sin(t * 2), -0.6));
  // the car: drives in then skids and spins
  const sk = inv(55.4, 56.5, t);
  land.car.position.set(SPOT.road.x + 0.9 * Math.sin(sk * 3) * sk, 0, lerp(8, 0.5, easeOut(inv(54.9, 55.6, t))) - sk * 2);
  land.car.rotation.y = Math.PI + sk * 2.6;
  // Affan shivers with frosty breath
  const a = land.aff;
  a.pose({ yaw: -0.2, blink: blinkAt(t, 1), talk: talk(t), smile: 0.5, brow: -0.3, tilt: 0.03 * Math.sin(t * 40), armL: { reach: [0.2, 0.75, 0.45], pole: [1, -0.5, 0] }, armR: { reach: [-0.2, 0.75, 0.45], pole: [-1, -0.5, 0] } });
  a.root.updateMatrixWorld(true);
  const mouth = a.parts.head.localToWorld(V(0, -0.35, 0.75));
  land.breath.forEach((s, i) => {
    const u = ((t * 0.8 + i / land.breath.length) % 1);
    s.visible = true;
    s.position.copy(mouth).add(V(0.15 * u, 0.25 * u, 0.5 * u));
    s.scale.setScalar(0.15 + 0.35 * u);
    s.material.opacity = 0.6 * (1 - u);
  });
}

// ======================================================================= SHOTS
const SHOTS = [
  // S1 — a hot, sunny day at the playground
  [0, 2.22, (t) => {
    park.setSnow(t, 0);
    park.winter(false);
    parkAff(t, { armR: FAN(t), brow: -0.2, smile: 0.5, talk: 0 });
    sweat(t, true);
    camMove(t, 0, 2.22, [A_PK.x + 1.2, 2.2, A_PK.z + 6.2], [A_PK.x, 1.2, A_PK.z], [A_PK.x + 1.0, 2.0, A_PK.z + 5.2], [A_PK.x, 1.2, A_PK.z], 50);
    const q = pop(t, 0.4, 2.2);
    ov.tag('ep', 'EPISOD 44', { x: W / 2, y: 268, o: q.o, s: q.s }, { bg: '#2f7bff', small: true });
    topTag('panas', 'PANASNYA!', t, 0.6, 2.2, ORANGE, 410);
    return park;
  }],
  // S2 — "Papa! Kalau Malaysia ada salji, apa jadi?"
  [2.22, 5.68, (t) => {
    park.setSnow(t, 0);
    park.winter(false);
    parkAff(t, { ...POSES.thinkR, brow: 0.4, smile: 0.6 });
    sweat(t, true);
    const ah = affHead();
    camMove(t, 2.22, 5.68, front(3.4).toArray(), ah.clone().add(V(0, -0.35, 0)).toArray(), front(3.0).toArray(), ah.clone().add(V(0, -0.3, 0)).toArray(), 46);
    const pp = pop(t, 2.22, 3.0, { from: 2 });
    ov.bubble('papa', 'PAPA!', { x: 800, y: 470, o: pp.o, s: pp.s * 0.8, r: 6 }, { size: 110 });
    bubble('salji', 'MALAYSIA ADA SALJI?', t, 3.28, 5.65, 430, 100, { top: '#e8f6ff', bot: '#4ab8e8' });
    return park;
  }],
  // S3 — imagine: snow falls on the playground, a snowman with a songkok
  [5.68, 8.64, (t) => {
    const k = easeInOut(inv(5.7, 6.5, t));
    park.setSnow(t, k);
    park.winter(t > 6.1);
    parkAff(t, { smile: 1, brow: 0.6, wow: keys(t, [[5.75, 0], [6.0, 0.8], [6.6, 0.8], [6.9, 0]]), yaw: 0.35, armR: { reach: [-0.75, 1.55, 0.35 + Math.sin(t * 10) * 0.1], pole: [-1, -0.5, -0.4] }, armL: { reach: [0.75, 1.55, 0.35], pole: [1, -0.5, -0.4] } });
    sweat(t, false);
    camMove(t, 5.68, 8.64, [A_PK.x + 0.6, 2.4, A_PK.z + 6.6], [A_PK.x - 0.8, 1.3, A_PK.z], [A_PK.x + 0.2, 2.2, A_PK.z + 5.6], [A_PK.x - 0.9, 1.3, A_PK.z], 50);
    ov.flash((1 - inv(5.68, 6.0, t)) * 0.9, '235,245,255');
    bubble('seronok', 'SERONOKNYA!', t, 5.68, 7.2, 430, 130, { top: '#e8f6ff', bot: '#4ab8e8' });
    pinTag('snowman', 'ORANG SALJI!', scr(park.snowman.position.clone().add(V(0, 2.7, 0))), t, 7.3, 8.6, { bg: ICEB, pointer: 'down' }, -30);
    return park;
  }],
  // S4 — "Tapi... boleh ke?" back to the heat
  [8.64, 10.7, (t) => {
    const k = 1 - easeInOut(inv(8.7, 9.4, t));
    park.setSnow(t, k);
    park.winter(k > 0.5);
    parkAff(t, { ...POSES.thinkR, brow: -0.3, smile: 0.4 });
    sweat(t, k < 0.3);
    const ah = affHead();
    lookCam(front(3.3), ah.clone().add(V(0, -0.35, 0)), 46);
    const hd = scr(ah.clone().add(V(0, 0.4, 0)));
    qmarks(t, hd, 9.2, 10.65, [[9.3, -260, 100, '#ffcf33', -12], [9.6, 250, 60, '#3fa2ff', 10], [9.9, 280, 240, '#ffcf33', 14]]);
    bubble('bolehke', 'BOLEH KE?', t, 9.84, 10.65, 430, 130, { top: '#fff6d0', bot: '#ffb21f' });
    return park;
  }],
  // S5 — "Jom ikut Affan cari jawapan!" swirl up into a cloud
  [10.7, 12.74, (t) => {
    park.setSnow(t, 0);
    park.winter(false);
    sweat(t, false);
    const up = keys(t, [[10.72, 0], [10.95, 1], [12.2, 1], [12.5, 0.6]], easeOut);
    parkAff(t, { smile: 1, brow: 0.6, armR: { reach: [lerp(-0.6, -0.55, up), lerp(0.25, 1.95 + 0.06 * Math.sin(t * 14), up), lerp(0.2, 0.35, up)], pole: [-1, -0.3, -0.5] } });
    const ah = affHead();
    const k = easeIn(inv(11.2, 12.74, t));
    lookCam(front(3.3).lerp(ah.clone().add(V(0, 6, 1.5)), k), ah.clone().add(V(0, -0.35, 0)).lerp(ah.clone().add(V(0, 12, -6)), k), 46);
    ov.swirl(t, W / 2, 820, inv(10.9, 12.6, t));
    ov.flash(inv(12.3, 12.74, t) ** 2, '235,245,255');
    return park;
  }],
  // S6 — in a cold cloud: below 0°C, water droplets freeze into six-armed crystals
  [12.74, 22.38, (t) => {
    const freeze = easeInOut(inv(18.2, 20.0, t));
    const big = easeOut(inv(20.2, 21.0, t));
    cloudSet(t, freeze, big);
    if (t < 20.2) camMove(t, 12.74, 20.2, [0, 1.0, 14], [0, 0.6, 0], [0.2, 1.2, 11.5], [0, 0.8, 0], 50);
    else camMove(t, 20.2, 22.38, [0.2, 1.2, 11.5], [0, 0.8, 0], [0, 2.0, 7.4], [0, 2.0, 2.0], 50);
    ov.flash(1 - inv(12.74, 13.05, t), '235,245,255');
    topTag('awan', 'DALAM AWAN', t, 12.74, 14.5, BLUE);
    const temp = lerp(12, -12, easeInOut(inv(14.4, 17.3, t)));
    thermo('th', temp, 860, 820, t, 14.0, 20.1);
    bubble('bawah0', 'BAWAH 0°C!', t, 16.08, 18.15, 420, 130, { top: '#e8f6ff', bot: '#3a9cff' });
    topTag('kristal', 'TITISAN AIR → KRISTAL AIS', t, 18.22, 20.15, ICEB);
    bubble('enam', 'BERBUCU ENAM!', t, 21.22, 22.35, 420, 124, { top: '#e8f6ff', bot: '#4ab8e8' });
    if (big > 0.5) {
      for (let i = 0; i < 6; i++) {
        const a = cloud.big.rotation.z + (i / 6) * Math.PI * 2 + Math.PI / 2;
        const p = scr(cloud.big.position.clone().add(V(Math.cos(a) * 1.95, Math.sin(a) * 1.95, 0)));
        const q = pop(t, 21.3 + i * 0.12, 22.35);
        if (q.o > 0) ov.html('n' + i, `<div style="width:64px;height:64px;border-radius:32px;background:#ffd84a;border:6px solid #17256b;font:800 40px/52px 'Baloo 2';color:#17256b;text-align:center">${i + 1}</div>`, { x: p.x, y: p.y, o: q.o, s: q.s * 0.8 });
      }
    }
    return cloud;
  }],
  // S7 — Malaysia is near the equator; the Sun shines straight down all year, ~30°C
  [22.38, 35.04, (t) => {
    globeSet(t, inv(26.4, 27.4, t) * 1.6);
    if (t < 26.3) camMove(t, 22.38, 26.3, [1.5, 1.6, 26], [0, 0, 0], [0.8, 0.8, 21], [0, 0.1, 0], 50);
    else if (t < 30.5) camMove(t, 26.3, 30.5, [0.8, 0.8, 21], [0, 0.1, 0], [-6.5, 0.8, 30], [-7.0, 0, 0], 50);
    else camMove(t, 30.5, 35.04, [-6.5, 0.8, 30], [-7.0, 0, 0], [1.2, 0.6, 10.5], [0.5, 0.2, 2.5], 48);
    ov.flash(1 - inv(22.38, 22.7, t));
    pinTag('khat', 'KHATULISTIWA', scr(V(-EARTH_R * 0.55, 0, EARTH_R * 0.83)), t, 23.96, 26.3, { bg: RED, pointer: 'down' }, -40);
    topTag('garisan', 'GARISAN TENGAH BUMI', t, 25.1, 26.4, RED);
    pinTag('tegak', 'TEGAK', scr(V(-EARTH_R - 1.5, 0.35, 0)), t, 27.0, 30.4, { bg: YELLOW, pointer: 'down' }, -30);
    pinTag('condong', 'CONDONG', scr(V(-EARTH_R - 1.2, EARTH_R * Math.sin(1.15) + 0.3, 0)), t, 27.6, 30.4, { bg: BLUE, pointer: 'down' }, -30);
    topTag('tahun', 'HAMPIR SEPANJANG TAHUN', t, 28.28, 30.4, ORANGE);
    pinTag('my', 'MALAYSIA', scr(globe.pin.getWorldPosition(V()).add(V(0, 0.3, 0))), t, 30.62, 35.0, { bg: ORANGE, pointer: 'down' }, -40);
    thermo('th2', 30, 860, 860, t, 31.96, 35.0);
    bubble('panas', 'PANAS!', t, 30.94, 32.5, 420, 150, { top: '#fff0d0', bot: '#ff8a3d' });
    return globe;
  }],
  // S8 — the higher, the colder: thin ice at the top of Gunung Kinabalu, but not enough for thick snow
  [35.04, 45.28, (t) => {
    mtnSet(t, inv(40.7, 41.3, t));
    if (t < 36.3) camMove(t, 35.04, 36.3, [6, 2.2, 20], [2.0, 1.4, 4], [6, 2.6, 20], [1.5, 2.4, 2], 50);
    else if (t < 39.0) camMove(t, 36.3, 39.0, [6, 2.6, 20], [1.5, 2.4, 2], [3.5, 8.0, 15], [0.5, 6.5, -2], 50);
    else if (t < 42.0) camMove(t, 39.0, 42.0, [3.5, 8.0, 15], [0.5, 6.5, -2], [1.6, 11.0, 6.5], [0.0, 8.8, -4], 48);
    else camMove(t, 42.0, 45.28, [1.6, 11.0, 6.5], [0.0, 8.8, -4], [3.0, 8.5, 19], [0.6, 5.0, -2], 50);
    ov.flash(1 - inv(35.04, 35.35, t));
    topTag('ingat', 'INGAT LAGI? EPISOD 16', t, 35.04, 36.3, PURPLE);
    bubble('tinggi', 'MAKIN TINGGI,\nMAKIN SEJUK!', t, 36.02, 38.2, 430, 104, { top: '#e8f6ff', bot: '#3a9cff' });
    const temp = lerp(30, 2, easeInOut(inv(36.4, 41.0, t)));
    thermo('th3', temp, 880, 900, t, 36.3, 44.9);
    pinTag('kinabalu', 'GUNUNG KINABALU', scr(V(0, PEAK_Y + 1.6, -4)), t, 38.84, 42.0, { bg: GREEN, pointer: 'down' }, -30);
    pinTag('ais', 'AIS NIPIS', scr(V(0.8, PEAK_Y * 0.93, -2.6)), t, 40.94, 42.05, { bg: ICEB, pointer: 'down' }, -40);
    bubble('tebal', 'TAK CUKUP UNTUK\nSALJI TEBAL', t, 42.58, 45.25, 430, 96, { top: '#e8f6ff', bot: '#4ab8e8' });
    return mtn;
  }],
  // S9 — imagine snow over Malaysia: padi fields, forest, a kampung house
  [45.28, 48.02, (t) => {
    landSet(t, { wilt: 0 });
    camMove(t, 45.28, 48.02, [SPOT.padi.x + 1, 4.6, 15], [SPOT.padi.x, 2.0, -2], [SPOT.padi.x + 0.6, 4.0, 13], [SPOT.padi.x, 1.8, -2], 50);
    ov.flash((1 - inv(45.28, 45.6, t)) * 0.9, '235,245,255');
    bubble('kalau', 'KALAU SALJI TURUN\nDI MALAYSIA...', t, 45.28, 48.0, 430, 96, { top: '#e8f6ff', bot: '#4ab8e8' });
    return land;
  }],
  // S10 — forest trees and padi can't take the cold: they wilt
  [48.02, 51.96, (t) => {
    landSet(t, { wilt: easeInOut(inv(49.6, 51.1, t)) });
    camMove(t, 48.02, 51.96, [SPOT.padi.x + 0.6, 4.0, 13], [SPOT.padi.x, 1.8, -2], [SPOT.padi.x - 0.4, 2.6, 6.8], [SPOT.padi.x, 0.8, -1], 50);
    pinTag('hutan', 'POKOK HUTAN', scr(V(SPOT.padi.x - 1, 4.4, -6)), t, 48.02, 49.6, { bg: GREEN, pointer: 'down' }, -30);
    pinTag('padi', 'PADI', scr(V(SPOT.padi.x, 1.2, 0)), t, 49.06, 51.9, { bg: '#7ab83a', pointer: 'down' }, -30);
    bubble('layu', 'LAYU!', t, 51.02, 51.94, 430, 150, { top: '#f6e8d0', bot: '#a87a3a' }, 3);
    return land;
  }],
  // S11 — orang utans have no thick fur like polar bears
  [51.96, 55.08, (t) => {
    landSet(t, { wilt: 1 });
    camMove(t, 51.96, 55.08, [SPOT.animals.x + 0.2, 3.0, 11.8], [SPOT.animals.x, 1.4, 0], [SPOT.animals.x + 0.2, 2.9, 11.0], [SPOT.animals.x, 1.4, 0], 50);
    pinTag('ou', 'ORANG UTAN: BRRR!', scr(land.ou.position.clone().add(V(0, 2.8, 0))), t, 52.0, 55.0, { bg: ORANGE, pointer: 'down' }, -30);
    pinTag('bear', 'BULU TEBAL!', scr(land.bear.position.clone().add(V(0, 2.6, 0))), t, 53.26, 55.0, { bg: ICEB, pointer: 'down' }, -30);
    return land;
  }],
  // S12 — roads turn slippery
  [55.08, 56.54, (t) => {
    landSet(t, { wilt: 1 });
    lookCam(V(SPOT.road.x + 3.5, 3.6, 7.5), V(SPOT.road.x, 0.6, 1.0), 50);
    bubble('licin', 'JALAN LICIN!', t, 55.08, 56.5, 430, 130, { top: '#e8f6ff', bot: '#3a9cff' }, 3);
    return land;
  }],
  // S13 — and we'd need thick clothes every day
  [56.54, 59.06, (t) => {
    landSet(t, { wilt: 1 });
    const ah = land.aff.parts.head.getWorldPosition(V());
    lookCam(ah.clone().add(V(0.3, 0.1, 3.8)), ah.clone().add(V(0, -0.5, 0)), 46);
    bubble('baju', 'BAJU TEBAL\nSETIAP HARI!', t, 57.36, 59.0, 430, 104, { top: '#ffe0f0', bot: '#ff5ca8' });
    topTag('brr', 'BRRR... SEJUKNYA!', t, 56.6, 59.0, ICEB, 1240);
    return land;
  }],
  // S14 — "Waaah, rupanya cuaca panas Malaysia sesuai untuk pokok, haiwan dan kita! Jadi, kita bersyukur, ya."
  [59.06, 68.3, (t) => {
    park.setSnow(t, 0);
    park.winter(false);
    sweat(t, false);
    parkAff(t, { wow: keys(t, [[59.1, 0], [59.25, 0.9], [59.9, 0.9], [60.2, 0]]), smile: 1, brow: 0.5, ...(t > 66.0 ? POSES.thumbsUpR : {}) });
    const ah = affHead();
    if (t < 62.1) lookCam(front(3.3), ah.clone().add(V(0, -0.35, 0)), 46);
    else camMove(t, 62.1, 68.3, [A_PK.x + 1.4, 2.4, A_PK.z + 6.8], [A_PK.x - 0.4, 1.6, A_PK.z - 1], [A_PK.x + 0.9, 2.0, A_PK.z + 4.6], [A_PK.x, 1.3, A_PK.z], 50);
    ov.flash((1 - inv(59.06, 59.4, t)) * 0.9, '255,250,235');
    const hd = scr(ah.clone().add(V(0, 0.5, 0)));
    const b = pop(t, 59.1, 62.0);
    if (t < 62.1) ov.html('bulb', ICONS.bulb(), { x: clamp(hd.x + 200, 150, 900), y: clamp(hd.y - 160, 300, 900) + Math.sin(t * 5) * 8, o: b.o, s: b.s * 0.6, r: 10 });
    ov.sparkles(t, { n: 30, seed: 12, y: 250, h: 900, a: inv(59.1, 59.4, t) * (1 - inv(61.5, 62.0, t)) });
    bubble('sesuai', 'SESUAI UNTUK POKOK,\nHAIWAN & KITA!', t, 62.2, 65.9, 440, 92, { top: '#e0ffd8', bot: '#3fbf4a' });
    bubble('syukur', 'BERSYUKUR!', t, 66.0, 68.25, 440, 140, { top: '#fff6d0', bot: '#ffb21f' }, 3);
    return park;
  }],
  // S15 — "Apa lagi kita nak belajar lepas ni?"
  [68.3, OUTRO, (t) => {
    park.setSnow(t, 0);
    park.winter(false);
    sweat(t, false);
    const tk = keys(t, [[68.35, 0], [68.75, 1]]);
    const th2 = POSES.thinkR.armR;
    parkAff(t, { smile: 1, brow: 0.3 + 0.4 * tk, headRoll: -0.12 * tk, lookX: 0.35 * tk, lookY: 0.4 * tk, headPitch: -0.08 * tk, armR: { reach: mix3([-0.55, 0.3, 0.2], th2.reach, tk), pole: th2.pole, point: tk, wx: th2.wx * tk } });
    const ah = affHead();
    lookCam(front(3.2), ah.clone().add(V(0, -0.35, 0)), 46);
    const hd = scr(ah.clone().add(V(0, 0.45, 0)));
    qmarks(t, hd, 68.3, OUTRO - 0.05, [[68.35, -260, -100, '#ffcf33', -12], [68.65, 250, -160, '#3fa2ff', 10], [68.95, 300, 60, '#ffcf33', 14]]);
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
  renderer.setViewport(0, 0, W, H);
  renderer.render(w.scene, cam);
  if (w !== outro) ov.vignette(0.2);
  ov.captions(t, CAPTIONS, KEYWORDS);
  ov.end();
}

// Cover / thumbnail (9:16): the playground under snow, Affan with a snowman.
function thumbnail() {
  ov.begin();
  cam.aspect = W / H;
  cam.updateProjectionMatrix();
  const t = 7.6;
  park.setSnow(t, 1);
  park.winter(true);
  sweat(t, false);
  parkAff(t, { smile: 1, brow: 0.6, wow: 0.7, yaw: 0.35, armR: { reach: [-0.75, 1.55, 0.35], pole: [-1, -0.5, -0.4] }, armL: { reach: [0.75, 1.55, 0.35], pole: [1, -0.5, -0.4] } });
  lookCam(V(A_PK.x + 0.3, 2.0, A_PK.z + 5.2), V(A_PK.x - 0.8, 1.6, A_PK.z), 50);
  park.sky.position.copy(cam.position);
  renderer.setViewport(0, 0, W, H);
  renderer.render(park.scene, cam);
  const g = ov.g;
  const top = g.createLinearGradient(0, 0, 0, 720);
  top.addColorStop(0, 'rgba(20,40,80,0.5)');
  top.addColorStop(1, 'rgba(20,40,80,0)');
  g.fillStyle = top;
  g.fillRect(0, 0, W, 720);
  const bot = g.createLinearGradient(0, H - 900, 0, H);
  bot.addColorStop(0, 'rgba(20,40,80,0)');
  bot.addColorStop(1, 'rgba(20,40,80,0.5)');
  g.fillStyle = bot;
  g.fillRect(0, H - 900, W, 900);
  ov.vignette(0.3);
  ov.tag('thBadge', 'EPISOD 44', { x: W / 2, y: 300 }, { bg: '#2f7bff', small: true });
  ov.bubble('thTitle', 'MALAYSIA', { x: W / 2, y: 445, r: -3 }, { size: 130 });
  ov.bubble('thTitle2', 'ADA SALJI?!', { x: W / 2, y: 600, r: 2 }, { size: 140, top: '#e8f6ff', bot: '#4ab8e8' });
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
