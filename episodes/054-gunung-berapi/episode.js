// THE CURIOUS AFFAN — Episode 054: "Kenapa Gunung Berapi Meletus?"
// Every shot is a pure function of time t (seconds), synced to audio/narration.mp3.
import * as THREE from 'three';
import { makeRenderer, loadEnvelope, toScreen, clamp, lerp, inv, easeOut, easeIn, easeInOut, keys, rng, W, H } from '../../shared/core.js';
import { POSES, blinkAt } from '../../shared/affan.js';
import { Overlay, pop, ICONS, drawLogo } from '../../shared/overlay.js';
import { CAPTIONS, KEYWORDS } from './captions.js';
import { buildPark54, buildEarthCut, buildVolcano, buildMap, buildOutro, A_PK, CHAMBER, CRATER_Y } from './worlds.js';

const FPS = 30;
const DURATION = 72.85;
const OUTRO = 69.7;

const stage = document.getElementById('stage');
const canvas = document.createElement('canvas');
stage.appendChild(canvas);
const renderer = makeRenderer(canvas);
const ov = new Overlay(stage);
const park = buildPark54();
const ec = buildEarthCut();
const vol = buildVolcano();
const map = buildMap();
const outro = buildOutro();
const cam = new THREE.PerspectiveCamera(50, W / H, 0.05, 6000);
let env = { at: () => 0 };

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const talk = (t) => clamp(env.at(t) * 1.2);
const scr = (p) => toScreen(p, cam);
const mix3 = (a, b, k) => a.map((v, i) => lerp(v, b[i], k));
const BLUE = '#2f9bff', ORANGE = '#ff8a3d', PURPLE = '#7a5cf0', GREEN = '#2fbf5f', RED = '#ff4d5e', GREY = '#6a6a7a', BROWN = '#8a5a3a';

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
function shake(amp) {
  cam.position.x += amp * Math.sin(performanceT * 61);
  cam.position.y += amp * Math.sin(performanceT * 47 + 1);
  cam.updateMatrixWorld(true);
}
let performanceT = 0;
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
// thermometer card (k 0..1)
function thermo(k, label, a, x = 930, y = 760) {
  if (a <= 0) return;
  const g = ov.g;
  g.save();
  g.globalAlpha = a;
  g.fillStyle = 'rgba(15,25,50,0.55)';
  g.beginPath();
  g.roundRect(x - 80, y - 300, 160, 470, 40);
  g.fill();
  g.fillStyle = '#ffffff';
  g.beginPath();
  g.roundRect(x - 22, y - 260, 44, 330, 22);
  g.fill();
  g.beginPath();
  g.arc(x, y + 90, 46, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = k > 0.6 ? '#ff3a2a' : '#ff8a3d';
  g.beginPath();
  g.arc(x, y + 90, 34, 0, Math.PI * 2);
  g.fill();
  g.fillRect(x - 12, y + 60 - 310 * k, 24, 310 * k + 30);
  g.font = '800 40px "Baloo 2"';
  g.textAlign = 'center';
  g.fillStyle = '#ffffff';
  g.fillText(label, x, y - 254);
  g.restore();
}
// pressure dial (k 0..1)
function gauge(k, a, x = 540, y = 600) {
  if (a <= 0) return;
  const g = ov.g;
  g.save();
  g.globalAlpha = a;
  g.translate(x, y);
  g.fillStyle = 'rgba(15,25,50,0.6)';
  g.beginPath();
  g.roundRect(-210, -170, 420, 260, 40);
  g.fill();
  const seg = [['#2fbf5f', 0, 0.4], ['#ffcf33', 0.4, 0.7], ['#ff4d5e', 0.7, 1]];
  g.lineWidth = 34;
  for (const [c, a0, a1] of seg) {
    g.strokeStyle = c;
    g.beginPath();
    g.arc(0, 40, 140, Math.PI + a0 * Math.PI, Math.PI + a1 * Math.PI);
    g.stroke();
  }
  const ang = Math.PI + k * Math.PI;
  g.strokeStyle = '#ffffff';
  g.lineWidth = 12;
  g.beginPath();
  g.moveTo(0, 40);
  g.lineTo(Math.cos(ang) * 120, 40 + Math.sin(ang) * 120);
  g.stroke();
  g.fillStyle = '#ffffff';
  g.font = '800 44px "Baloo 2"';
  g.textAlign = 'center';
  g.fillText('TEKANAN', 0, 80);
  g.restore();
}

// ==================================================================== park
const affHead = () => park.aff.parts.head.getWorldPosition(V());
const front = (d, side = 0.35) => affHead().add(V(side, 0.1, d));
const HOLD = { reach: [-0.28, 1.05, 0.62], pole: [-1, -0.5, -0.3] };
function parkAff(t, p = {}) {
  const a = park.aff;
  a.root.position.copy(A_PK);
  a.pose({ yaw: 0.15, blink: blinkAt(t, 1), talk: talk(t), smile: 0.9, armR: HOLD, ...p });
  a.root.updateMatrixWorld(true);
}
const FR = rng(77);
const FOAM = park.foam.map(() => ({ vx: (FR() - 0.5) * 0.7, vz: (FR() - 0.5) * 0.7, vy: 3.2 + FR() * 1.6, ph: FR() }));
function parkSet(t, { bottle = 1, open = 0, spray = 0, sign = 0 } = {}) {
  park.bottle.visible = bottle > 0.5;
  park.cap.visible = open < 0.5;
  park.sign.visible = sign > 0.5;
  park.bottle.updateMatrixWorld(true);
  const mouth = park.bottle.localToWorld(V(0, 0.6, 0));
  park.foam.forEach((p, i) => {
    const f = FOAM[i];
    const age = ((t * 1.1 + f.ph) % 1) * 0.9;
    p.visible = spray > 0.01 && bottle > 0.5;
    p.position.set(mouth.x + f.vx * age, mouth.y + f.vy * age * spray - 4.5 * age * age, mouth.z + f.vz * age);
    p.scale.setScalar((0.12 + 0.2 * age) * spray);
  });
}

// ================================================================= volcano
const VR = rng(91);
const BUB = vol.bubbles.map(() => {
  const a = VR() * Math.PI * 2, r = Math.sqrt(VR());
  return { x: Math.cos(a) * r * 2.6, y: Math.sin(a) * r * 1.1, ph: VR() * 6 };
});
const FTN = vol.fountain.map(() => ({ vx: (VR() - 0.5) * 5, vz: (VR() - 0.5) * 5, vy: 9 + VR() * 6, ph: VR() }));
function volReset() {
  vol.full.visible = true;
  vol.half.visible = false;
  vol.sec.visible = false;
  vol.fountain.forEach((s) => (s.visible = false));
  vol.ash.forEach((m) => (m.visible = false));
  vol.rivers.forEach((r) => (r.visible = false));
  vol.plants.forEach((p) => (p.visible = false));
  vol.lavaLight.intensity = 0;
  vol.lavaRiverM.color.setHex(0xff5a10);
  vol.lavaRiverM.emissive.setHex(0xff4000);
}
function section(t, { blobs = 0, chamber = 0.35, bubbles = 0, grow = 0, vent = 0 }) {
  vol.full.visible = false;
  vol.half.visible = true;
  vol.sec.visible = true;
  vol.blobs.forEach((b, i) => {
    const u = ((t * 0.35 + i / vol.blobs.length) % 1);
    b.visible = blobs > 0.01;
    b.position.set(0.3 * Math.sin(i * 2.1 + t), lerp(-8.0, CHAMBER.y - 0.6, u), 0.12);
    b.scale.set(blobs * (1 - 0.3 * u), blobs * (1 - 0.3 * u), 0.3);
  });
  const sw = 1 + 0.05 * grow * Math.sin(t * 9);
  vol.chamber.scale.set(3.2 * chamber * sw, 1.6 * chamber * sw, 0.05);
  vol.bubbles.forEach((b, i) => {
    const d = BUB[i];
    b.visible = bubbles > 0.01;
    b.position.set(CHAMBER.x + d.x * chamber + 0.08 * Math.sin(t * 5 + d.ph) * grow, CHAMBER.y + d.y * chamber + 0.1 * Math.sin(t * 4 + d.ph), 0.2);
    b.scale.setScalar(bubbles * (0.8 + 1.2 * grow) * (1 + 0.15 * Math.sin(t * 6 + d.ph)));
  });
  const vtop = CHAMBER.y + 1.4 + (CRATER_Y - CHAMBER.y - 1.4) * vent;
  const vh = Math.max(0.01, vtop - (CHAMBER.y + 1.2));
  vol.vent.scale.set(1, vh, 1);
  vol.vent.position.set(0, CHAMBER.y + 1.2 + vh / 2, 0.06);
}
function erupt(t, { fountain = 0, ash = 0, rivers = 0, cool = 0, plants = 0 }) {
  vol.fountain.forEach((s, i) => {
    const f = FTN[i];
    const age = ((t * 0.7 + f.ph) % 1) * 1.6;
    s.visible = fountain > 0.01;
    s.position.set(f.vx * age, CRATER_Y + f.vy * age * fountain - 7 * age * age, f.vz * age);
    s.scale.setScalar(0.9 * fountain * (1 - age * 0.3));
  });
  vol.ash.forEach((m, i) => {
    const d = m.userData;
    const u = ((t * 0.12 + d.ph) % 1);
    m.visible = ash > 0.01;
    m.position.set(d.dx * (1 + u * 3) + u * 6, CRATER_Y + 2 + u * 22, d.dz * (1 + u * 2));
    m.scale.setScalar(d.s * (0.6 + u * 2.6) * ash);
  });
  vol.ashM.opacity = 0.85 * ash;
  vol.rivers.forEach((r, k) => {
    const prog = clamp(rivers * 1.2 - k * 0.04);
    r.visible = prog > 0.01;
    const n = r.geometry.index.count;
    r.geometry.setDrawRange(0, Math.floor(n * prog / 6) * 6);
  });
  vol.lavaRiverM.color.setHex(0xff5a10).lerp(new THREE.Color(0x2a2626), cool);
  vol.lavaRiverM.emissive.setHex(0xff4000).lerp(new THREE.Color(0x000000), cool);
  vol.lavaLight.intensity = 3 * fountain * (1 - cool);
  vol.plants.forEach((p, i) => {
    const k = easeOut(clamp(plants * 1.6 - i / vol.plants.length));
    p.visible = k > 0.01;
    p.scale.setScalar(Math.max(0.01, k));
  });
}

// =================================================================== SHOTS
const SHOTS = [
  // S1 — park: Affan with a bottle of soda
  [0, 2.2, (t) => {
    parkSet(t);
    parkAff(t);
    camMove(t, 0, 2.2, [A_PK.x + 1.2, 2.2, A_PK.z + 6.2], [A_PK.x, 1.2, A_PK.z], [A_PK.x + 1.0, 2.0, A_PK.z + 5.2], [A_PK.x, 1.2, A_PK.z], 50);
    const q = pop(t, 0.4, 2.15);
    ov.tag('ep', 'EPISOD 54', { x: W / 2, y: 268, o: q.o, s: q.s }, { bg: '#2f7bff', small: true });
    return park;
  }],
  // S2 — "Papa! Bila Affan goncang botol soda,"
  [2.2, 5.24, (t) => {
    parkSet(t);
    const sh = keys(t, [[3.5, 0], [3.7, 1], [5.0, 1], [5.15, 0]]);
    parkAff(t, { smile: 1, brow: 0.5, armR: { reach: [-0.28 + 0.18 * sh * Math.sin(t * 30), 1.05 + 0.15 * sh * Math.sin(t * 30 + 1), 0.62], pole: [-1, -0.5, -0.3] } });
    const ah = affHead();
    lookCam(front(3.4), ah.clone().add(V(0, -0.5, 0)), 48);
    const pp = pop(t, 2.26, 3.0, { from: 2 });
    ov.bubble('papa', 'PAPA!', { x: 800, y: 470, o: pp.o, s: pp.s * 0.8, r: 6 }, { size: 110 });
    topTag('goncang', 'GONCANG BOTOL SODA', t, 3.66, 5.22, BLUE);
    return park;
  }],
  // S3 — "airnya memancut tinggi! Macam gunung berapi!"
  [5.24, 8.94, (t) => {
    const sp = easeOut(inv(5.3, 5.6, t)) * (1 - inv(8.2, 8.9, t) * 0.6);
    parkSet(t, { open: 1, spray: sp });
    parkAff(t, { smile: 1, brow: 0.7, wow: 0.7 * inv(5.3, 5.5, t), lean: -0.15 });
    const ah = affHead();
    lookCam(front(4.6).add(V(0.2, 0.6, 0)), ah.clone().add(V(0, 0.4, 0)), 50);
    bubble('pancut', 'MEMANCUT!', t, 5.52, 7.1, 430, 140, { top: '#e0f6ff', bot: '#2fa8d8' });
    bubble('gb', 'MACAM\nGUNUNG BERAPI!', t, 7.2, 8.92, 430, 110, { top: '#fff0d8', bot: '#ff5c2a' });
    return park;
  }],
  // S4 — "Kenapa gunung berapi meletus?"
  [8.94, 11.12, (t) => {
    parkSet(t, { open: 1 });
    parkAff(t, { ...POSES.thinkR, brow: -0.3, smile: 0.5 });
    const ah = affHead();
    lookCam(front(3.3), ah.clone().add(V(0, -0.35, 0)), 46);
    const hd = scr(ah.clone().add(V(0, 0.4, 0)));
    qmarks(t, hd, 9.0, 11.1, [[9.05, -260, 100, '#ffcf33', -12], [9.35, 250, 60, '#3fa2ff', 10], [9.7, 280, 240, '#ffcf33', 14]]);
    bubble('kenapa', 'KENAPA\nMELETUS?', t, 9.0, 11.1, 430, 120, { top: '#fff0d8', bot: '#ff5c2a' });
    return park;
  }],
  // S5 — "Jom ikut Affan cari jawapan!"
  [11.12, 13.18, (t) => {
    parkSet(t, { open: 1 });
    const up = keys(t, [[11.14, 0], [11.38, 1], [12.5, 1], [12.8, 0.6]], easeOut);
    parkAff(t, { smile: 1, brow: 0.6, armL: { reach: [lerp(0.6, 0.55, up), lerp(0.25, 1.95 + 0.06 * Math.sin(t * 14), up), lerp(0.2, 0.35, up)], pole: [1, -0.3, -0.5] } });
    const ah = affHead();
    const k = easeIn(inv(12.2, 13.18, t));
    lookCam(front(3.3).lerp(ah.clone().add(V(0, -1.5, 1.0)), k), ah.clone().add(V(0, -0.35, 0)).lerp(ah.clone().add(V(0, -6, -2)), k), 46);
    ov.swirl(t, W / 2, 820, inv(11.2, 13.1, t));
    ov.flash(inv(12.8, 13.18, t) ** 2, '255,200,150');
    return park;
  }],
  // S6 — deep inside the Earth it is so hot that rock melts: magma
  [13.18, 21.02, (t) => {
    ec.earth.rotation.y = 2.55 + 0.05 * Math.sin(t * 0.4);
    ec.hot.material.opacity = 0.6 + 0.3 * Math.sin(t * 3);
    const melt = easeInOut(inv(17.2, 19.4, t));
    ec.rock.visible = t > 16.9;
    ec.rock.position.set(2.2, -4.2 - 0.5 * melt, 5.0);
    ec.rock.scale.set(1 + 0.4 * melt, 1 - 0.55 * melt, 1 + 0.4 * melt);
    ec.rockM.color.setHex(0x7a6a5a).lerp(new THREE.Color(0xff6a1a), melt);
    ec.rockM.emissiveIntensity = 0.9 * melt;
    camMove(t, 13.18, 21.02, [1.0, 1.5, 15], [0, -0.5, 0], [0.4, -0.5, 13], [-0.4, -1.6, 0], 50);
    ov.flash(1 - inv(13.18, 13.45, t), '255,200,150');
    topTag('jauh', 'JAUH DI DALAM BUMI', t, 13.24, 21.0, BROWN);
    thermo(easeInOut(inv(15.0, 16.8, t)), 'PANAS!', pop(t, 15.06, 21.0).o);
    pinTag('batu', 'BATU PUN CAIR!', scr(V(2.2, -3.2, 5.0)), t, 17.24, 21.0, { bg: ORANGE, pointer: 'down' }, -30);
    bubble('magma', 'MAGMA!', t, 20.18, 21.0, 430, 150, { top: '#fff0d8', bot: '#ff5c2a' });
    return ec;
  }],
  // S7 — magma rises and gathers in a chamber under the mountain; it holds lots of gas
  [21.02, 30.08, (t) => {
    volReset();
    section(t, {
      blobs: easeOut(inv(21.5, 22.6, t)),
      chamber: lerp(0.35, 1, easeInOut(inv(24.6, 26.4, t))),
      bubbles: easeOut(inv(28.4, 29.0, t)),
    });
    camMove(t, 21.02, 30.08, [0.5, -1.0, 19], [0, -1.0, 0], [0.2, -1.6, 16.5], [0, -1.8, 0], 50);
    ov.flash(1 - inv(21.02, 21.3, t));
    topTag('ringan', 'MAGMA LEBIH RINGAN', t, 21.08, 23.3, ORANGE);
    pinTag('naik', 'NAIK PERLAHAN-LAHAN', scr(V(0, -6.2, 0)), t, 23.32, 24.8, { bg: ORANGE, pointer: 'down' }, -30);
    pinTag('kebuk', 'KEBUK MAGMA', scr(V(0, CHAMBER.y + 1.9, 0)), t, 25.56, 30.06, { bg: RED, pointer: 'down' }, -20);
    bubble('gas', 'BANYAK GAS!', t, 29.34, 30.06, 430, 130, { top: '#ffffff', bot: '#9aa4b4' });
    return vol;
  }],
  // S8 — more gas, more pressure... like a shaken soda bottle
  [30.08, 35.31, (t) => {
    volReset();
    const gr = easeIn(inv(30.2, 35.2, t));
    section(t, { blobs: 1, chamber: 1 + 0.15 * gr, bubbles: 1, grow: gr, vent: easeInOut(inv(32.5, 35.3, t)) * 0.9 });
    lookCam(V(0.2 + 0.03 * gr * Math.sin(t * 40), -0.4, 16.5), V(0, 0.4, 0), 50);
    topTag('makin', 'GAS MAKIN BANYAK', t, 30.14, 31.6, PURPLE);
    gauge(easeIn(inv(31.0, 35.0, t)), pop(t, 31.7, 35.3).o, 540, 640);
    bubble('soda', 'MACAM BOTOL SODA\nYANG DIGONCANG!', t, 33.46, 35.3, 1210, 80, { top: '#e0f6ff', bot: '#2fa8d8' });
    return vol;
  }],
  // S9 — BOOM! the volcano erupts
  [35.31, 39.08, (t) => {
    volReset();
    const boom = t > 36.0;
    if (!boom) {
      section(t, { blobs: 1, chamber: 1.15, bubbles: 1, grow: 1, vent: 0.9 + 0.1 * inv(35.4, 35.95, t) });
      lookCam(V(0.2 + 0.06 * Math.sin(t * 50), 2.5, 16), V(0, 3.0, 0), 50);
    } else {
      erupt(t, { fountain: easeOut(inv(36.0, 36.4, t)), ash: easeOut(inv(36.2, 37.6, t)) });
      performanceT = t;
      lookCam(V(0, 5, 30), V(0, 9, 0), 50);
      shake(0.5 * (1 - inv(36.0, 37.5, t)));
    }
    ov.flash(boom ? 1 - inv(36.05, 36.5, t) : 0, '255,220,160');
    bubble('boom', 'BOOM!', t, 36.08, 37.7, 430, 200, { top: '#fff0d0', bot: '#ff3a1a' }, 4);
    bubble('letus', 'MELETUS!', t, 37.8, 39.06, 430, 150, { top: '#fff0d0', bot: '#ff5c2a' });
    return vol;
  }],
  // S10 — lava over 1,000 degrees; ash and smoke fly high into the sky
  [39.08, 46.74, (t) => {
    volReset();
    erupt(t, { fountain: 1, ash: 1, rivers: easeInOut(inv(39.5, 44.5, t)) });
    camMove(t, 39.08, 46.74, [6, 4, 26], [0, 5, 0], [-4, 10, 34], [0, 10, 0], 50);
    pinTag('lava', 'LAVA', scr(V(5.5, 3.2, 3)), t, 40.46, 46.7, { bg: RED, pointer: 'down' }, -20);
    thermo(1, '1,000°C+', pop(t, 42.34, 44.0).o);
    topTag('panas', 'LEBIH SERIBU DARJAH!', t, 42.34, 44.0, ORANGE);
    pinTag('abu', 'ABU & ASAP', scr(V(2, CRATER_Y + 16, 0)), t, 44.06, 46.7, { bg: GREY, pointer: 'down' }, -20);
    return vol;
  }],
  // S11 — Malaysia has no active volcano; Indonesia has many
  [46.74, 53.76, (t) => {
    map.marks.forEach((m, i) => {
      const a = 51.82 + i * 0.05;
      m.scale.setScalar(Math.max(0.001, easeOut(inv(a, a + 0.25, t))));
    });
    camMove(t, 46.74, 53.76, [0.2, 19.5, 8.0], [0.2, 0, 0.6], [0.2, 18.5, 7.2], [0.2, 0, 0.8], 50);
    ov.flash(1 - inv(46.74, 47.0, t));
    topTag('tahu', 'TAHU TAK?', t, 46.8, 48.7, PURPLE);
    topTag('my', 'MALAYSIA: TIADA GUNUNG BERAPI AKTIF', t, 47.82, 53.74, GREEN);
    pinTag('my2', 'MALAYSIA', scr(map.toWorld(102, 4)), t, 47.82, 53.74, { bg: GREEN, pointer: 'down' }, -30);
    pinTag('id', 'INDONESIA: BANYAK!', scr(map.toWorld(110, -8.8)), t, 51.82, 53.74, { bg: RED, pointer: 'up' }, 60);
    return map;
  }],
  // S12 — cooled lava becomes new rock, and the soil becomes fertile
  [53.76, 58.52, (t) => {
    volReset();
    const cool = easeInOut(inv(54.1, 55.6, t));
    erupt(t, { fountain: 1 - cool, ash: 1 - cool, rivers: 1, cool, plants: easeOut(inv(56.6, 58.2, t)) });
    camMove(t, 53.76, 58.52, [8, 6, 20], [0, 3, 0], [6, 5, 17], [1, 3, 0], 50);
    ov.flash(1 - inv(53.76, 54.0, t));
    topTag('sejuk', 'BILA LAVA SEJUK...', t, 53.82, 55.6, BLUE);
    pinTag('batu', 'BATU BARU', scr(V(5.5, 3.0, 3)), t, 55.66, 58.5, { bg: '#4a4a52', pointer: 'down' }, -20);
    bubble('subur', 'TANAH SUBUR!', t, 57.38, 58.5, 430, 130, { top: '#e0ffe8', bot: '#2fbf5f' });
    return vol;
  }],
  // S13 — "Waaah, rupanya gunung berapi macam botol soda gergasi!"
  [58.52, 62.98, (t) => {
    parkSet(t, { open: 1 });
    parkAff(t, { wow: keys(t, [[58.55, 0], [58.7, 0.9], [59.3, 0.9], [59.6, 0]]), smile: 1, brow: 0.5 });
    const ah = affHead();
    lookCam(front(3.3), ah.clone().add(V(0, -0.35, 0)), 46);
    ov.flash((1 - inv(58.52, 58.8, t)) * 0.9, '255,250,235');
    const hd = scr(ah.clone().add(V(0, 0.5, 0)));
    const b = pop(t, 58.55, 62.9);
    ov.html('bulb', ICONS.bulb(), { x: clamp(hd.x + 220, 150, 900), y: clamp(hd.y - 170, 300, 900) + Math.sin(t * 5) * 8, o: b.o, s: b.s * 0.6, r: 10 });
    ov.sparkles(t, { n: 30, seed: 12, y: 250, h: 900, a: inv(58.6, 58.9, t) * (1 - inv(60.6, 61.2, t)) });
    bubble('gergasi', 'BOTOL SODA\nGERGASI!', t, 60.94, 62.96, 430, 116, { top: '#fff0d8', bot: '#ff5c2a' });
    return park;
  }],
  // S14 — warnings: listen to grown-ups and stay away
  [62.98, 67.44, (t) => {
    parkSet(t, { bottle: 0, sign: 1 });
    const pt = keys(t, [[63.2, 0], [63.5, 1], [64.4, 1], [64.7, 0]]);
    parkAff(t, { yaw: 0.15 - 0.5 * pt, smile: 0.8, brow: 0.3, armL: { reach: mix3([0.55, 0.3, 0.2], [0.9, 1.4, 0.6], pt), pole: [1, -0.3, -0.4], point: pt }, armR: { reach: [-0.55, 0.3, 0.2] } });
    lookCam(V(A_PK.x + 0.4, 2.2, A_PK.z + 5.2), V(A_PK.x - 1.0, 1.4, A_PK.z - 0.4), 50);
    const sp = park.sign.localToWorld(V(0, 2.6, 0));
    pinTag('amaran', 'AMARAN!', scr(sp), t, 63.46, 67.4, { bg: RED, pointer: 'down' }, -20);
    topTag('dengar', 'DENGAR CAKAP ORANG DEWASA', t, 64.54, 67.4, BLUE);
    bubble('jauh', 'JAUHKAN DIRI!', t, 66.02, 67.4, 1080, 120, { top: '#fff6d0', bot: '#ffb21f' });
    return park;
  }],
  // S15 — "Apa lagi kita nak belajar lepas ni?"
  [67.44, OUTRO, (t) => {
    parkSet(t, { bottle: 0 });
    const tk = keys(t, [[67.47, 0], [67.85, 1]]);
    const th2 = POSES.thinkR.armR;
    parkAff(t, { smile: 1, brow: 0.3 + 0.4 * tk, headRoll: -0.12 * tk, lookX: 0.35 * tk, lookY: 0.4 * tk, headPitch: -0.08 * tk, armR: { reach: mix3([-0.55, 0.3, 0.2], th2.reach, tk), pole: th2.pole, point: tk, wx: th2.wx * tk } });
    const ah = affHead();
    lookCam(front(3.3), ah.clone().add(V(0, -0.35, 0)), 46);
    const hd = scr(ah.clone().add(V(0, 0.45, 0)));
    qmarks(t, hd, 67.44, OUTRO - 0.05, [[67.5, -260, -100, '#ffcf33', -12], [67.8, 250, -160, '#3fa2ff', 10], [68.1, 300, 60, '#ffcf33', 14]]);
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

// Cover / thumbnail (9:16): the volcano erupting.
function thumbnail() {
  ov.begin();
  cam.aspect = W / H;
  cam.updateProjectionMatrix();
  volReset();
  erupt(40.5, { fountain: 1, ash: 1, rivers: 0.7 });
  lookCam(V(3, 3, 26), V(0, 9, 0), 50);
  vol.sky.position.copy(cam.position);
  renderer.setViewport(0, 0, W, H);
  renderer.render(vol.scene, cam);
  ov.vignette(0.3);
  ov.tag('thBadge', 'EPISOD 54', { x: W / 2, y: 300 }, { bg: '#2f7bff', small: true });
  ov.bubble('thTitle', 'BOTOL SODA', { x: W / 2, y: 445, r: -3 }, { size: 130, top: '#e0f6ff', bot: '#2fa8d8' });
  ov.bubble('thTitle2', 'GERGASI?!', { x: W / 2, y: 600, r: 2 }, { size: 140, top: '#fff0d8', bot: '#ff5c2a' });
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
