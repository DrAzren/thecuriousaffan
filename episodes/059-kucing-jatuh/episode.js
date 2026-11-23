// THE CURIOUS AFFAN — Episode 059: "Kenapa Kucing Selalu Jatuh Atas Kakinya?"
// Every shot is a pure function of time t (seconds), synced to audio/narration.mp3.
import * as THREE from 'three';
import { makeRenderer, loadEnvelope, toScreen, clamp, lerp, inv, easeOut, easeIn, easeInOut, keys, W, H } from '../../shared/core.js';
import { POSES, blinkAt } from '../../shared/affan.js';
import { Overlay, pop, ICONS, drawLogo } from '../../shared/overlay.js';
import { CAPTIONS, KEYWORDS } from './captions.js';
import { buildRoom59, buildStage59, buildOutro, catLegs, A_LR, ALMARI, ALMARI_TOP, CAT_AT, FLOOR_Y, CLAV_AT } from './worlds.js';

const FPS = 30;
const DURATION = 58.25;
const OUTRO = 55.1;

const stage = document.getElementById('stage');
const canvas = document.createElement('canvas');
stage.appendChild(canvas);
const renderer = makeRenderer(canvas);
const ov = new Overlay(stage);
const room = buildRoom59();
const st = buildStage59();
const outro = buildOutro();
const cam = new THREE.PerspectiveCamera(50, W / H, 0.02, 6000);
let env = { at: () => 0 };
const roomLegs = catLegs(room.cat);
st.bones.forEach((b) => {
  b.material.depthTest = false;
  b.renderOrder = 5;
});

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
// a spirit level drawn on the overlay (the bubble finds "up")
function level(t, a, b, x, y, tilt) {
  const q = pop(t, a, b);
  if (q.o <= 0) return;
  const g = ov.g;
  g.save();
  g.globalAlpha = q.o;
  g.translate(x, y);
  g.scale(q.s, q.s);
  g.rotate(tilt);
  g.fillStyle = '#ffcf33';
  g.strokeStyle = '#1a2440';
  g.lineWidth = 8;
  g.beginPath();
  g.roundRect(-150, -42, 300, 84, 30);
  g.fill();
  g.stroke();
  g.fillStyle = '#d8f6ff';
  g.beginPath();
  g.roundRect(-100, -24, 200, 48, 22);
  g.fill();
  g.stroke();
  g.fillStyle = '#7ad84a';
  g.beginPath();
  g.ellipse(-Math.sin(tilt) * 70, 0, 26, 17, 0, 0, Math.PI * 2);
  g.fill();
  g.restore();
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
const YAW_ALM = Math.atan2(ALMARI.x - A_LR.x, ALMARI.z - A_LR.z);
const TOP = ALMARI.clone().add(V(0, ALMARI_TOP, 0.15));
const LAND = V(3.1, 0, -0.3);
const SIDE = V(2.0, 0, 1.7);
// the room cat: on the cupboard, jumping down, landing, then beside Affan
function roomCat(t, mode = 'auto') {
  const c = room.cat;
  let pos, sit = 1, yaw = 0.25, pitch = 0, legsBend = 0;
  if (mode === 'side') {
    pos = SIDE.clone();
    yaw = -0.35;
  } else if (t < 3.6) {
    pos = TOP.clone();
    sit = keys(t, [[3.0, 1], [3.5, 0]]);
    yaw = Math.atan2(LAND.x - TOP.x, LAND.z - TOP.z);
  } else if (t < 4.55) {
    const u = inv(3.6, 4.55, t);
    pos = TOP.clone().lerp(LAND, u);
    pos.y = lerp(TOP.y, LAND.y, u * u) + 0.6 * Math.sin(Math.PI * u) * (1 - u);
    sit = 0;
    yaw = Math.atan2(LAND.x - TOP.x, LAND.z - TOP.z);
    pitch = lerp(-0.3, 0.45, u);
  } else {
    pos = LAND.clone();
    const land = inv(4.55, 4.75, t) * (1 - inv(4.8, 5.3, t));
    legsBend = land;
    sit = easeInOut(inv(5.6, 6.3, t));
    yaw = lerp(Math.atan2(LAND.x - TOP.x, LAND.z - TOP.z), -0.5, easeInOut(inv(4.9, 5.8, t)));
  }
  c.root.position.copy(pos);
  c.root.rotation.set(pitch, yaw, 0);
  c.pose({ t, sit, blink: blinkAt(t, 4), tail: 1, headYaw: 0.2 * Math.sin(t * 0.7), meow: keys(t, [[6.2, 0], [6.35, 0.8], [6.7, 0]]) });
  roomLegs.forEach((l) => (l.scale.y *= 1 - 0.3 * legsBend));
  c.root.position.y -= 0.12 * legsBend;
}

// =================================================================== stage
const C_OFF = V(0, 1.5, 0); // the body centre above the cat's feet (scaled)
// roll: body roll angle; head: head world roll; legsOut: parachute spread; squash: landing
function stageCat(t, { center = CAT_AT.clone().add(C_OFF), roll = 0, head = null, sit = 0, legsOut = 0, squash = 0, flex = 0, yaw = 0.5 } = {}) {
  const c = st.cat;
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, roll, 'YZX'));
  const off = C_OFF.clone().applyQuaternion(q);
  c.root.position.copy(center).sub(off);
  c.root.quaternion.copy(q);
  const hr = head === null ? 0 : head - roll;
  c.pose({ t, sit, blink: blinkAt(t, 6), tail: 1, headRoll: hr, earTwitch: 0 });
  st.legs.forEach((l, i) => {
    const s = l.position.x > 0 ? 1 : -1;
    l.rotation.z += s * 0.9 * legsOut;
    l.rotation.x += (l.position.z > 0 ? -0.5 : 0.5) * legsOut;
    l.scale.y *= 1 - 0.32 * squash;
  });
  c.torso.rotation.y = 0.35 * flex * Math.sin(t * 3);
  c.head.rotation.y += 0.4 * flex * Math.sin(t * 3 + 1);
  c.root.updateMatrixWorld(true);
}
function streaks(t, on, speed = 6) {
  st.streaks.forEach((m) => {
    m.visible = on > 0;
    const u = (m.userData.ph + t * speed / 10) % 1;
    m.position.set(CAT_AT.x + m.userData.x, cam.position.y - 7 + u * 14, m.userData.z);
    m.material.opacity = 0.5 * on;
  });
}
function spine(t, a, b) {
  const q = pop(t, a, b);
  if (q.o <= 0) return;
  const g = ov.g;
  g.save();
  g.globalAlpha = q.o;
  for (let i = 0; i <= 10; i++) {
    const p = scr(st.cat.torso.localToWorld(V(0, 0.13, -0.42 + i * 0.084)));
    g.fillStyle = '#fff6c8';
    g.strokeStyle = '#c8a040';
    g.lineWidth = 4;
    g.beginPath();
    g.ellipse(p.x, p.y, 15 * q.s, 11 * q.s, 0, 0, Math.PI * 2);
    g.fill();
    g.stroke();
  }
  g.restore();
}
const catCenter = () => st.cat.torso.getWorldPosition(V());

// =================================================================== SHOTS
const SHOTS = [
  // S1 — living room: the cat sits on top of the cupboard
  [0, 2.18, (t) => {
    affSet(t, { yaw: YAW_ALM, headPitch: -0.25 });
    roomCat(t);
    camMove(t, 0, 2.18, [2.3, 2.6, 10.2], [2.4, 1.9, -0.8], [2.2, 2.5, 9.6], [2.4, 1.9, -0.8], 50);
    const q = pop(t, 0.4, 2.16);
    ov.tag('ep', 'EPISOD 59', { x: W / 2, y: 268, o: q.o, s: q.s }, { bg: '#2f7bff', small: true });
    return room;
  }],
  // S2 — "Papa! Kucing tu lompat dari atas almari, tapi terus mendarat atas kaki!"
  [2.18, 7.74, (t) => {
    const look = Math.atan2(room.cat.root.position.x - A_LR.x, room.cat.root.position.z - A_LR.z);
    affSet(t, { yaw: lerp(YAW_ALM, look, inv(3.6, 4.6, t)), headPitch: t < 4.0 ? -0.25 : 0.05, wow: keys(t, [[4.6, 0], [4.8, 0.9], [5.6, 0.9], [5.9, 0]]), brow: 0.5 });
    roomCat(t);
    camMove(t, 2.18, 7.74, [2.2, 2.5, 9.6], [2.4, 1.9, -0.8], [2.1, 1.9, 7.6], [2.2, 1.3, -0.4], 50);
    const pp = pop(t, 2.2, 3.2, { from: 2 });
    ov.bubble('papa', 'PAPA!', { x: 800, y: 470, o: pp.o, s: pp.s * 0.8, r: 6 }, { size: 110 });
    pinTag('lompat', 'LOMPAT!', scr(room.cat.root.position.clone().add(V(0, 1.2, 0))), t, 3.6, 4.6, { bg: ORANGE, pointer: 'down' }, -30);
    pinTag('darat', 'MENDARAT ATAS KAKI!', scr(LAND.clone().add(V(0, 1.4, 0))), t, 5.92, 7.72, { bg: GREEN, pointer: 'down' }, -30);
    return room;
  }],
  // S3 — "Kenapa kucing selalu jatuh atas kakinya?"
  [7.74, 10.4, (t) => {
    affSet(t, { ...POSES.thinkR, brow: -0.3, smile: 0.5 });
    roomCat(t);
    const ah = affHead();
    lookCam(front(3.3), ah.clone().add(V(0, -0.35, 0)), 46);
    const hd = scr(ah.clone().add(V(0, 0.4, 0)));
    qmarks(t, hd, 7.76, 10.38, [[7.8, -260, 100, '#ffcf33', -12], [8.1, 250, 60, '#3fa2ff', 10], [8.5, 280, 240, '#ffcf33', 14]]);
    bubble('kenapa', 'KENAPA SELALU\nATAS KAKI?', t, 7.78, 10.38, 430, 110, { top: '#fff6d0', bot: '#ffb21f' });
    return room;
  }],
  // S4 — "Jom ikut Affan cari jawapan!" then zoom to the cat
  [10.4, 12.32, (t) => {
    roomCat(t);
    const up = keys(t, [[10.42, 0], [10.66, 1], [11.6, 1], [11.9, 0.6]], easeOut);
    affSet(t, { smile: 1, brow: 0.6, armR: { reach: [lerp(-0.6, -0.55, up), lerp(0.25, 1.95 + 0.06 * Math.sin(t * 14), up), lerp(0.2, 0.35, up)], pole: [-1, -0.3, -0.5] } });
    const ah = affHead();
    const k = easeIn(inv(11.4, 12.32, t));
    const ch = room.cat.head.getWorldPosition(V());
    lookCam(front(3.3).lerp(ch.clone().add(V(0.1, 0.05, 0.6)), k), ah.clone().add(V(0, -0.35, 0)).lerp(ch, k), 46);
    ov.swirl(t, W / 2, 820, inv(10.45, 12.25, t));
    ov.flash(inv(11.95, 12.32, t) ** 2, '255,248,236');
    return room;
  }],
  // S5 — a balance sensor in the cat's ear knows up from down, even upside down
  [12.32, 19.8, (t) => {
    const flip = easeInOut(inv(18.0, 18.9, t));
    const sit = 1 - easeInOut(inv(15.3, 16.0, t));
    stageCat(t, { roll: Math.PI * flip, head: Math.PI * flip, sit, yaw: 0.45 });
    streaks(t, inv(18.0, 18.5, t));
    const hp = st.cat.head.getWorldPosition(V());
    const ear = st.cat.head.localToWorld(V(0.13, 0.17, 0.02));
    st.earGlow.position.copy(ear);
    st.earGlow.material.opacity = 0.9 * inv(13.0, 13.5, t) * (1 - inv(15.2, 15.6, t));
    st.earGlow.scale.setScalar(1.4 + 0.2 * Math.sin(t * 8));
    st.hiGlow.material.opacity = 0;
    if (t < 15.4) camMove(t, 12.32, 15.4, hp.clone().add(V(1.6, 0.4, 3.6)).toArray(), hp.clone().add(V(0, -0.2, 0)).toArray(), hp.clone().add(V(1.0, 0.3, 2.8)).toArray(), hp.clone().add(V(0, -0.1, 0)).toArray(), 46);
    else camMove(t, 15.4, 16.4, [CAT_AT.x + 2.2, CAT_AT.y + 3.0, 7.2], [CAT_AT.x, CAT_AT.y + 1.2, 0], [CAT_AT.x + 3.0, CAT_AT.y + 2.2, 8.4], [CAT_AT.x, CAT_AT.y + 1.4, 0], 50);
    ov.flash(1 - inv(12.32, 12.65, t));
    pinTag('telinga', 'DALAM TELINGA', scr(ear.clone().add(V(0, 0.25, 0))), t, 12.66, 15.3, { bg: PURPLE, pointer: 'down' }, -50);
    topTag('imbang', 'PENGESAN IMBANGAN', t, 13.94, 16.35, PURPLE);
    level(t, 14.4, 19.78, W / 2, 1390, Math.PI * flip * 0.15 * Math.sin(t * 4) * (flip > 0 && flip < 1 ? 1 : 0));
    const c = catCenter();
    pinTag('atas', 'ATAS', scr(c.clone().add(V(0, 2.4, 0))), t, 16.4, 19.78, { bg: BLUE, pointer: 'down' }, -20);
    pinTag('bawah', 'BAWAH', scr(c.clone().add(V(0, -2.0, 0))), t, 17.24, 19.78, { bg: ORANGE, pointer: 'up' }, 30);
    bubble('balik', 'WALAUPUN\nTERBALIK!', t, 18.4, 19.78, 470, 104, { top: '#fff0f2', bot: '#ff7a8a' });
    return st;
  }],
  // S6 — head first, then the front body, then the back body; a very bendy spine
  [19.8, 28.94, (t) => {
    const hK = easeInOut(inv(21.64, 22.4, t));
    const fK = easeInOut(inv(23.24, 24.1, t));
    const bK = easeInOut(inv(25.26, 26.1, t));
    const roll = Math.PI * (1 - 0.5 * fK - 0.5 * bK);
    const head = Math.PI * (1 - hK);
    stageCat(t, { roll, head, yaw: 0.45, flex: inv(26.7, 27.0, t), legsOut: 0 });
    streaks(t, 1);
    lookCam(V(CAT_AT.x + 3.0, CAT_AT.y + 2.2, 8.4), V(CAT_AT.x, CAT_AT.y + 1.4, 0), 50);
    const spots = [[21.64, 23.2, () => st.cat.head.getWorldPosition(V())], [23.24, 25.2, () => st.cat.torso.localToWorld(V(0, 0, 0.3))], [25.26, 26.7, () => st.cat.torso.localToWorld(V(0, 0, -0.35))]];
    const sp = spots.find(([a, b]) => t >= a && t < b);
    st.hiGlow.material.opacity = sp ? 0.85 : 0;
    if (sp) st.hiGlow.position.copy(sp[2]());
    st.earGlow.material.opacity = 0;
    topTag('jatuh', 'BILA JATUH...', t, 19.8, 21.6, ORANGE);
    const tagAt = (fn) => scr(fn().add(V(0, 1.1, 0)));
    pinTag('t1', '1  KEPALA DULU', tagAt(spots[0][2]), t, 21.64, 23.2, { bg: '#e0a000', pointer: 'down' }, -30);
    pinTag('t2', '2  BADAN DEPAN', tagAt(spots[1][2]), t, 23.24, 25.2, { bg: '#e0a000', pointer: 'down' }, -30);
    pinTag('t3', '3  BADAN BELAKANG', tagAt(spots[2][2]), t, 25.26, 26.7, { bg: '#e0a000', pointer: 'down' }, -30);
    spine(t, 26.72, 28.92);
    bubble('lentur', 'TULANG BELAKANG\nSANGAT LENTUR!', t, 26.72, 28.92, 440, 96, { top: '#fff6d0', bot: '#ffb21f' });
    return st;
  }],
  // S7 — spread out like a parachute, then bendy legs like springs soak up the landing
  [28.94, 36.42, (t) => {
    const fall = easeIn(inv(30.0, 34.25, t));
    const cy = lerp(CAT_AT.y + 1.5, FLOOR_Y + 1.5, fall);
    const legsOut = easeOut(inv(30.1, 30.8, t)) * (1 - easeInOut(inv(33.2, 33.9, t)));
    const squash = t > 34.25 ? Math.exp(-(t - 34.25) * 4) * Math.abs(Math.cos((t - 34.25) * 9)) : 0;
    stageCat(t, { center: V(CAT_AT.x, cy - 0.32 * 2.6 * 0.35 * squash, CAT_AT.z), legsOut, squash, yaw: 0.45 });
    streaks(t, 1 - inv(34.0, 34.3, t), 3);
    st.hiGlow.material.opacity = 0;
    lookCam(V(CAT_AT.x + 3.0, cy + 0.9, 8.4), V(CAT_AT.x, cy - 0.1, 0), 50);
    bubble('payung', 'MACAM PAYUNG\nTERJUN!', t, 31.2, 32.85, 440, 108, { top: '#eaf6ff', bot: '#4aa8ff' });
    topTag('kembang', 'KEMBANGKAN BADAN', t, 30.1, 32.85, BLUE);
    topTag('spring', 'KAKI MACAM SPRING', t, 32.88, 36.4, GREEN);
    pinTag('serap', 'SERAP HENTAKAN!', scr(V(CAT_AT.x, FLOOR_Y + 0.3, 1.5)), t, 35.06, 36.4, { bg: ORANGE, pointer: 'up' }, 90);
    return st;
  }],
  // S8 — "Tahu tak? Tulang selangka kucing kecil dan tak bersambung..."
  [36.42, 43.82, (t) => {
    const c = st.cat2;
    const tw = inv(41.9, 42.3, t);
    c.root.rotation.set(0, 0.25 * tw * Math.sin(t * 4), 0);
    c.pose({ t, sit: 0, blink: blinkAt(t, 3), tail: 1 });
    c.torso.rotation.z = 0.35 * tw * Math.sin(t * 4);
    const glowOn = inv(37.3, 37.7, t);
    st.boneGlow.material.opacity = 0.9 * glowOn;
    st.bones.forEach((b, i) => {
      b.visible = glowOn > 0;
      b.position.y = CLAV_AT.y + 1.45 + 0.06 * Math.sin(t * 3 + i);
    });
    streaks(t, 0);
    camMove(t, 36.42, 43.82, CLAV_AT.clone().add(V(0.6, 2.4, 7.2)).toArray(), CLAV_AT.clone().add(V(0, 1.6, 0)).toArray(), CLAV_AT.clone().add(V(0.3, 2.2, 6.2)).toArray(), CLAV_AT.clone().add(V(0, 1.7, 0)).toArray(), 46);
    ov.flash(1 - inv(36.42, 36.75, t));
    topTag('tahu', 'TAHU TAK?', t, 36.42, 37.34, ORANGE);
    pinTag('selangka', 'TULANG SELANGKA', scr(V(CLAV_AT.x, CLAV_AT.y + 1.2, CLAV_AT.z + 1.0)), t, 37.6, 41.3, { bg: '#e0a000', pointer: 'up' }, 60);
    topTag('kecil', 'KECIL', t, 38.3, 41.3, PURPLE);
    topTag('sambung', 'TAK BERSAMBUNG DENGAN TULANG LAIN', t, 39.16, 41.3, PURPLE, 400);
    bubble('pusing', 'MUDAH\nBERPUSING!', t, 41.9, 43.8, 440, 116, { top: '#f2e6ff', bot: '#a070ff' });
    return st;
  }],
  // S9 — "Waaah, rupanya kucing ni ahli akrobat semula jadi! Tapi jangan sesekali jatuhkan kucing..."
  [43.82, 52.88, (t) => {
    roomCat(t, 'side');
    const no = t > 47.8 && t < 50.5;
    affSet(t, { wow: keys(t, [[43.82, 0], [44.0, 0.9], [44.6, 0.9], [44.9, 0]]), smile: no ? 0.4 : 1, brow: no ? -0.2 : 0.6, ...(no ? { armR: { reach: [-0.32, 1.25, 0.62], pole: [-1, -0.6, -0.3], point: 1, wz: 0.4 * Math.sin(t * 12) } } : {}) });
    const ah = affHead();
    lookCam(front(5.4, 0.9), ah.clone().add(V(0.6, -1.25, 0)), 46);
    const hd = scr(ah.clone().add(V(0, 0.5, 0)));
    const b = pop(t, 43.9, 47.7);
    ov.html('bulb', ICONS.bulb(), { x: clamp(hd.x + 220, 150, 900), y: clamp(hd.y - 170, 300, 900) + Math.sin(t * 5) * 8, o: b.o, s: b.s * 0.6, r: 10 });
    ov.sparkles(t, { n: 30, seed: 12, y: 250, h: 900, a: inv(43.9, 44.2, t) * (1 - inv(47.2, 47.8, t)) });
    bubble('akrobat', 'AHLI AKROBAT\nSEMULA JADI!', t, 45.66, 47.8, 430, 108, { top: '#fff6d0', bot: '#ffb21f' });
    bubble('jangan', 'JANGAN JATUHKAN\nKUCING!', t, 47.82, 50.5, 430, 100, { top: '#fff0f0', bot: '#ff6a6a' });
    topTag('bahaya', 'TEMPAT TINGGI TETAP BAHAYA', t, 50.58, 52.86, RED);
    return room;
  }],
  // S10 — "Apa lagi kita nak belajar lepas ni?"
  [52.88, OUTRO, (t) => {
    roomCat(t, 'side');
    const tk = keys(t, [[52.9, 0], [53.3, 1]]);
    const th2 = POSES.thinkR.armR;
    affSet(t, { smile: 1, brow: 0.3 + 0.4 * tk, headRoll: -0.12 * tk, lookX: 0.35 * tk, lookY: 0.4 * tk, headPitch: -0.08 * tk, armR: { reach: mix3([-0.55, 0.3, 0.2], th2.reach, tk), pole: th2.pole, point: tk, wx: th2.wx * tk } });
    const ah = affHead();
    lookCam(front(3.3), ah.clone().add(V(0, -0.35, 0)), 46);
    const hd = scr(ah.clone().add(V(0, 0.45, 0)));
    qmarks(t, hd, 52.88, OUTRO - 0.05, [[52.9, -260, -100, '#ffcf33', -12], [53.2, 250, -160, '#3fa2ff', 10], [53.5, 300, 60, '#ffcf33', 14]]);
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

// Cover / thumbnail (9:16): the cat mid-fall, halfway turned the right way up.
function thumbnail() {
  ov.begin();
  cam.aspect = W / H;
  cam.updateProjectionMatrix();
  stageCat(24.0, { roll: Math.PI * 0.6, head: 0.1, yaw: 0.45 });
  streaks(24.0, 1);
  st.hiGlow.material.opacity = 0;
  st.earGlow.material.opacity = 0;
  lookCam(V(CAT_AT.x + 2.6, CAT_AT.y + 1.6, 7.2), V(CAT_AT.x, CAT_AT.y + 1.0, 0), 50);
  st.sky.position.copy(cam.position);
  renderer.setViewport(0, 0, W, H);
  renderer.render(st.scene, cam);
  ov.vignette(0.3);
  ov.tag('thBadge', 'EPISOD 59', { x: W / 2, y: 300 }, { bg: '#2f7bff', small: true });
  ov.bubble('thTitle', 'TAK PERNAH', { x: W / 2, y: 445, r: -3 }, { size: 130, top: '#fff6d0', bot: '#ffb21f' });
  ov.bubble('thTitle2', 'JATUH TERBALIK?!', { x: W / 2, y: 600, r: 2 }, { size: 112, top: '#eaf6ff', bot: '#4aa8ff' });
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
