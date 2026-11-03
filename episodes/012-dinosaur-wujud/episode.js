// THE CURIOUS AFFAN — Episode 012: "Betul ke Dinosaur Wujud?"
// Every shot is a pure function of time t (seconds), synced to audio/narration.mp3.
import * as THREE from 'three';
import { makeRenderer, loadEnvelope, toScreen, clamp, lerp, inv, easeOut, easeInOut, keys, wobble, W, H } from '../../shared/core.js';
import { POSES, blinkAt } from '../../shared/affan.js';
import { Overlay, pop, ICONS, drawLogo } from '../../shared/overlay.js';
import { CAPTIONS, KEYWORDS } from './captions.js';
import { buildBedroom, buildJungle, buildDig, buildOutro } from './worlds.js';

const FPS = 30;
const DURATION = 70.0;

const stage = document.getElementById('stage');
const canvas = document.createElement('canvas');
stage.appendChild(canvas);
const renderer = makeRenderer(canvas);
const ov = new Overlay(stage);
const room = buildBedroom();
const jungle = buildJungle();
const dig = buildDig();
const outro = buildOutro();
const cam = new THREE.PerspectiveCamera(50, W / H, 0.05, 2000);
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
const ORANGE = '#ff8a3d', BLUE = '#2f9bff', PINK = '#ff5fa2', GREEN = '#36b86a', RED = '#e8404f', BROWN = '#a8703e';

const SVG = {
  tv: () => `<svg width="300" height="260" viewBox="0 0 300 260"><line x1="110" y1="30" x2="150" y2="62" stroke="#17256b" stroke-width="9" stroke-linecap="round"/><line x1="195" y1="22" x2="150" y2="62" stroke="#17256b" stroke-width="9" stroke-linecap="round"/>
    <rect x="18" y="58" width="264" height="180" rx="34" fill="#ff8a3d" stroke="#17256b" stroke-width="10"/><rect x="40" y="78" width="190" height="140" rx="22" fill="#bfeaff" stroke="#17256b" stroke-width="7"/>
    <ellipse cx="120" cy="170" rx="44" ry="26" fill="#5fd06a" stroke="#17256b" stroke-width="5"/><path d="M150 160 Q185 140 180 105" stroke="#17256b" stroke-width="27" fill="none" stroke-linecap="round"/><path d="M150 160 Q185 140 180 105" stroke="#5fd06a" stroke-width="17" fill="none" stroke-linecap="round"/>
    <ellipse cx="183" cy="100" rx="17" ry="12" fill="#5fd06a" stroke="#17256b" stroke-width="5"/><circle cx="188" cy="96" r="3.5" fill="#17256b"/><path d="M78 175 Q60 185 52 198" stroke="#17256b" stroke-width="16" fill="none" stroke-linecap="round"/><path d="M78 175 Q60 185 52 198" stroke="#5fd06a" stroke-width="8" fill="none" stroke-linecap="round"/>
    <rect x="95" y="186" width="12" height="22" fill="#5fd06a" stroke="#17256b" stroke-width="4"/><rect x="132" y="186" width="12" height="22" fill="#5fd06a" stroke="#17256b" stroke-width="4"/>
    <circle cx="256" cy="110" r="12" fill="#ffd84a" stroke="#17256b" stroke-width="6"/><circle cx="256" cy="150" r="12" fill="#ffd84a" stroke="#17256b" stroke-width="6"/></svg>`,
  puzzle: (c = '#ff8fc0') => `<svg width="190" height="190" viewBox="0 0 190 190"><path d="M30 55 H72 C66 40 70 22 92 22 C114 22 118 40 112 55 H155 V98 C170 92 186 96 186 118 C186 140 170 144 155 138 V170 H30 Z" fill="${c}" stroke="#17256b" stroke-width="10" stroke-linejoin="round"/><ellipse cx="70" cy="95" rx="14" ry="20" fill="#fff" opacity="0.6"/></svg>`,
  bone: () => `<svg width="220" height="110" viewBox="0 0 220 110"><path d="M45 38 C30 10 0 22 12 48 C0 70 30 92 45 70 H175 C190 92 220 70 208 48 C220 22 190 10 175 38 Z" fill="#fff1c9" stroke="#17256b" stroke-width="9" stroke-linejoin="round"/></svg>`,
  rock: () => `<svg width="210" height="150" viewBox="0 0 210 150"><path d="M20 130 L35 60 L80 25 L140 30 L185 70 L195 130 Z" fill="#b9a48a" stroke="#17256b" stroke-width="9" stroke-linejoin="round"/><path d="M60 80 L95 70 L120 95" stroke="#8a7458" stroke-width="7" fill="none" stroke-linecap="round"/><ellipse cx="75" cy="55" rx="14" ry="9" fill="#fff" opacity="0.5"/></svg>`,
  dino: (c = '#5fd06a') => `<svg width="200" height="150" viewBox="0 0 200 150"><ellipse cx="85" cy="95" rx="52" ry="32" fill="${c}" stroke="#17256b" stroke-width="7"/><path d="M120 85 Q160 65 155 25" stroke="#17256b" stroke-width="30" fill="none" stroke-linecap="round"/><path d="M120 85 Q160 65 155 25" stroke="${c}" stroke-width="18" fill="none" stroke-linecap="round"/><ellipse cx="160" cy="22" rx="20" ry="14" fill="${c}" stroke="#17256b" stroke-width="6"/><circle cx="165" cy="18" r="4" fill="#17256b"/><path d="M38 100 Q15 110 5 128" stroke="#17256b" stroke-width="20" fill="none" stroke-linecap="round"/><path d="M38 100 Q15 110 5 128" stroke="${c}" stroke-width="10" fill="none" stroke-linecap="round"/><rect x="58" y="115" width="14" height="26" fill="${c}" stroke="#17256b" stroke-width="5"/><rect x="100" y="115" width="14" height="26" fill="${c}" stroke="#17256b" stroke-width="5"/></svg>`,
  kid: () => `<svg width="120" height="170" viewBox="0 0 120 170"><circle cx="60" cy="42" r="32" fill="#e8a57c" stroke="#17256b" stroke-width="7"/><path d="M30 35 Q40 5 75 12 Q95 18 92 38 Q70 22 30 35 Z" fill="#22160f"/><rect x="28" y="78" width="64" height="58" rx="18" fill="#1c2752" stroke="#17256b" stroke-width="6"/><rect x="36" y="134" width="18" height="30" rx="6" fill="#2f3b5e"/><rect x="66" y="134" width="18" height="30" rx="6" fill="#2f3b5e"/></svg>`,
  bird: () => `<svg width="170" height="140" viewBox="0 0 170 140"><ellipse cx="75" cy="80" rx="48" ry="38" fill="#3fa8ff" stroke="#17256b" stroke-width="7"/><circle cx="118" cy="48" r="26" fill="#3fa8ff" stroke="#17256b" stroke-width="7"/><path d="M140 44 L165 52 L140 60 Z" fill="#ffa21f" stroke="#17256b" stroke-width="5" stroke-linejoin="round"/><circle cx="124" cy="42" r="5" fill="#17256b"/><path d="M30 70 L2 55 L10 90 Z" fill="#2f86d8" stroke="#17256b" stroke-width="6" stroke-linejoin="round"/><ellipse cx="70" cy="78" rx="24" ry="14" fill="#2f86d8"/></svg>`,
};

function hook(t) {
  const p = pop(t, 0.15, 8.95, { fin: 0.45 });
  const fl = Math.sin(t * 3) * 6;
  ov.bubble('hook', 'BETUL KE DINOSAUR\nWUJUD?', { x: W / 2, y: 430 + fl, o: p.o, s: p.s }, { size: 100, top: '#c8ff7a', bot: '#36b86a' });
  const q = pop(t, 0.5, 8.95);
  ov.tag('ep', 'EPISOD 12', { x: W / 2, y: 278, o: q.o, s: q.s }, { bg: '#2f7bff', small: true });
}
function pinTag(id, text, p, t, a, b, style, dy = -90) {
  const q = pop(t, a, b);
  if (q.o <= 0 || !p.visible) return;
  ov.tag(id, text, { x: clamp(p.x, 190, 890), y: clamp(p.y + dy, 300, 1360), o: q.o, s: q.s }, style);
}
function qmarks(id, t, head, list, b) {
  list.forEach(([a, dx, dy, c, r], i) => {
    const q = pop(t, a, b);
    ov.html(id + i, ICONS.qmark(c), { x: head.x + dx, y: head.y + dy + Math.sin(t * 3 + i) * 10, o: q.o, s: q.s * 0.8, r });
  });
}

// --------------------------------------------------------- Affan pose bits
const sitRest = { armL: { reach: [0.62, 0.3, 0.42], pole: [1, -1, -0.3] }, armR: { reach: [-0.62, 0.3, 0.42], pole: [-1, -1, -0.3] } };
function roomAffan(t, p = {}) {
  room.aff.pose({ ...POSES.seated, blink: blinkAt(t, 1), talk: talk(t), ...p, armL: { ...sitRest.armL, ...(p.armL || {}) }, armR: { ...sitRest.armR, ...(p.armR || {}) } });
}
const AFF_HEAD = V(0, 3.14, 0.5); // bedroom
function lookAt(target, from = AFF_HEAD) {
  const d = target.clone().sub(from);
  return { headYaw: clamp(Math.atan2(d.x, d.z) * 0.8, -0.9, 0.9), headPitch: clamp(-Math.atan2(d.y, Math.hypot(d.x, d.z)) * 0.6, -0.45, 0.4), lookX: clamp(d.x * 0.35, -0.8, 0.8), lookY: clamp(d.y * 0.5, -0.6, 0.7) };
}
function standAffan(world, t, pos, yaw, p = {}) {
  world.aff.root.position.copy(pos);
  world.aff.pose({ yaw, blink: blinkAt(t, 2), talk: talk(t), smile: 0.8, ...p });
}
const handPos = (aff, side = 'R') => aff.parts.arms[side].hand.getWorldPosition(V(0, 0, 0));

// Toy dinosaur: held in Affan's hand, or resting on the bed.
function toyInHand(t, side = 'R', yaw = -0.5) {
  room.aff.root.updateMatrixWorld(true);
  const h = handPos(room.aff, side);
  room.toy.position.copy(h).add(V(0, -0.2, 0.06));
  room.toy.rotation.set(0, yaw, 0.15 * Math.sin(t * 6));
  room.toy.userData.update(t, { walk: 0.6, lift: 0.9, blink: blinkAt(t, 4) });
}
function toyOnBed(t) {
  room.toy.position.set(1.7, 1.31, -0.25);
  room.toy.rotation.set(0, -0.7, 0);
  room.toy.userData.update(t, { lift: 0.9 });
}

// -------------------------------------------------------------- jungle bits
const GA = V(0, 0, 5); // Affan's spot in the valley
const BIG_HOME = V(-3.5, 0, -7);
function hideJungleExtras() {
  for (const k of ['bus', 'bird', 'rock']) jungle[k].position.set(0, -80, 0);
  jungle.trail.forEach((s) => s.position.set(0, -80, 0));
  jungle.impact.material.opacity = 0;
  jungle.dust.forEach((d) => (d.material.opacity = 0));
  jungle.setMood(0, 0);
}
function placeBig(t, pos, yaw, o = {}) {
  jungle.big.position.copy(pos);
  jungle.big.rotation.y = yaw;
  jungle.big.userData.update(t, { blink: blinkAt(t, 3), ...o });
}
function placeBaby(t, pos, yaw, o = {}) {
  jungle.baby.position.copy(pos);
  jungle.baby.rotation.y = yaw;
  jungle.baby.userData.update(t + 1.3, { blink: blinkAt(t, 5), ...o });
}
function placeRunner(r, t, pos, yaw, o = {}) {
  r.position.copy(pos);
  r.rotation.y = yaw;
  r.userData.update(t, { blink: blinkAt(t, 7), ...o });
}
// default valley life: the big long-neck grazing at the back, the baby
// nearby and the two runners scampering around
function valleyLife(t) {
  placeBig(t, BIG_HOME, 0.55, { lift: 0.85 });
  placeBaby(t, V(4.5, 0, -3), -0.4, { lift: 0.6 + 0.2 * Math.sin(t) });
  const a = t * 0.8;
  placeRunner(jungle.runner, t, V(6 + 2.2 * Math.cos(a), 0, 1 + 1.4 * Math.sin(a)), a + Math.PI, { run: 1 });
  placeRunner(jungle.runner2, t, V(-7 + 1.6 * Math.cos(-a * 1.2), 0, 0.5 + 1.0 * Math.sin(-a * 1.2)), -a * 1.2, { run: 1 });
  jungle.chicken.position.set(0, -80, 0);
}

// ------------------------------------------------------------ dig site bits
const DA = V(-5.6, 0, 2.6); // Affan's spot at the dig
const STONE = new THREE.Color(0xbfa88a), BONE = new THREE.Color(0xf3e6c8);
const _q0 = new THREE.Quaternion(), _q1 = new THREE.Quaternion();
const SKULL = 20;
dig.pieces[SKULL].userData.dig.p.set(0.6, 0.35, 1.2);
dig.pieces[SKULL].userData.dig.r.set(0, 0.4, 0);
// Skeleton pieces: buried in the pit before 32.6 s, fly into place 32.6-35.2 s.
function digState(t) {
  const st = 32.6;
  dig.pieces.forEach((p) => {
    const d = p.userData.dig, h = p.userData.home;
    const a = st + d.delay * 1.5;
    const k = easeInOut(inv(a, a + 0.9, t));
    p.position.lerpVectors(d.p, h.p, k);
    p.position.y += Math.sin(k * Math.PI) * 2.2;
    _q0.setFromEuler(d.r);
    _q1.setFromEuler(h.r);
    p.quaternion.slerpQuaternions(_q0, _q1, k);
  });
  const stone = easeInOut(inv(29.5, 30.3, t));
  dig.skel.userData.mat.color.copy(BONE).lerp(STONE, stone);
  dig.brush.position.set(0, -50, 0);
  dig.puffs.forEach((p) => (p.material.opacity = 0));
  dig.toothGlow.material.opacity = 0;
}
// Affan brushes sand off a fossil: brush in his right hand.
function brushing(t, amt) {
  dig.aff.root.updateMatrixWorld(true);
  const h = handPos(dig.aff);
  dig.brush.position.copy(h);
  dig.brush.rotation.set(Math.PI - 0.5, 0.5, 0.25 * Math.sin(t * 12) * amt);
  dig.brush.scale.setScalar(1.25);
  dig.brush.updateMatrixWorld(true);
  const tip = dig.brush.localToWorld(V(0, 1.15, 0));
  dig.puffs.forEach((p, i) => {
    const ph = (t * 1.6 + i / dig.puffs.length) % 1;
    p.position.set(tip.x + Math.sin(i * 2.1) * ph * 0.9, Math.max(0.1, tip.y) + ph * 0.9, tip.z + Math.cos(i * 1.7) * ph * 0.6);
    p.scale.setScalar(0.12 + ph * 0.35);
    p.material.opacity = amt * 0.7 * (1 - ph);
  });
}
const lowReach = (t, amt) => ({ reach: [lerp(-0.6, -0.1, amt), lerp(0.25, 0.2, amt), lerp(0.1, 0.95 + 0.12 * Math.sin(t * 12), amt)], pole: [-1, -0.6, 0.2] });

// ======================================================================= SHOTS
const SHOTS = [
  // S1 — "Raaawr! Affan dinosaur paling garang!" toy dino raised, claw hand
  [0, 3.72, (t) => {
    const up = keys(t, [[0, 0.6], [0.25, 1], [3.4, 1], [3.72, 0.8]]);
    const claw = keys(t, [[0, 0], [0.2, 1], [1.2, 1], [1.6, 0.6], [3.72, 0.6]]);
    roomAffan(t, {
      headYaw: 0.15, headPitch: -0.05, smile: 1, brow: -0.6 * claw + 0.3, wow: t < 1.0 ? 0.6 : 0,
      armR: { reach: [lerp(-0.62, -0.75, up), lerp(0.3, 1.35 + 0.06 * Math.sin(t * 9), up), lerp(0.42, 0.55, up)], pole: [-1, -0.5, -0.4] },
      armL: { reach: [lerp(0.62, 0.55, claw), lerp(0.3, 0.95, claw), lerp(0.42, 0.8, claw)], pole: [1, -0.6, -0.3], wx: -0.6 * claw },
    });
    toyInHand(t, 'R', -0.9);
    const k = easeInOut(inv(0, 3.72, t));
    lookCam(V(lerp(0.9, 0.4, k), lerp(3.1, 3.0, k), lerp(7.4, 6.4, k)), V(0.0, 2.85, 0.4), 46);
    hook(t);
    const r = pop(t, 0.13, 1.7, { fin: 0.25 });
    ov.bubble('rawr', 'RAAAWR!', { x: 300, y: 820 + Math.sin(t * 20) * 4, o: r.o, s: r.s, r: -8 }, { size: 120, top: '#c8ff7a', bot: '#36b86a' });
    return room;
  }],
  // S2 — "Eh, tapi... betul ke dinosaur wujud? Ke cuma dalam kartun je?"
  [3.72, 9.0, (t) => {
    const th = keys(t, [[3.72, 0], [4.2, 1], [8.7, 1], [9.0, 0.6]]);
    const tr = POSES.thinkR.armR;
    const toyP = V(-0.55, 2.55, 1.3);
    roomAffan(t, {
      ...lookAt(toyP), brow: 0.7, smile: 0.35, headRoll: 0.1 * th,
      armL: { reach: [lerp(0.62, -0.2, th), lerp(0.3, 0.95, th), lerp(0.42, 0.85, th)], pole: [1, -1, -0.3] },
      armR: { reach: sitRest.armR.reach.map((r, i) => lerp(r, tr.reach[i], th)), pole: tr.pole, point: th, wx: tr.wx * th },
    });
    toyInHand(t, 'L', 0.5);
    const k = easeInOut(inv(3.72, 9.0, t));
    lookCam(V(lerp(-0.5, -0.1, k), lerp(3.3, 3.15, k), lerp(6.3, 5.4, k)), V(0.0, 2.85, 0.4), 46);
    hook(t);
    const head = scr(AFF_HEAD);
    qmarks('q', t, head, [[3.8, -310, -120, '#ffcf33', -12], [5.3, 300, -150, '#3fa2ff', 10]], 8.95);
    const tv = pop(t, 7.12, 8.95);
    ov.html('tv', SVG.tv(), { x: 790, y: 1060 + Math.sin(t * 3) * 6, o: tv.o, s: tv.s * 0.9, r: 6 });
    const kt = pop(t, 7.96, 8.95);
    ov.tag('kartun', 'KARTUN JE?', { x: 790, y: 1225, o: kt.o, s: kt.s }, { bg: ORANGE, small: true });
    return room;
  }],
  // S3 — "Jom ikut Affan cari jawapan!" + magic swirl
  [9.0, 10.95, (t) => {
    const up = keys(t, [[9.0, 0], [9.25, 1], [10.5, 1], [10.85, 0.6]], easeOut);
    roomAffan(t, {
      headYaw: -0.05, smile: 1, brow: 0.7, lookX: 0.05,
      armR: { reach: [lerp(-0.62, -0.6, up), lerp(0.3, 1.95 + 0.06 * Math.sin(t * 14), up), lerp(0.42, 0.35, up)], pole: [-1, -0.3, -0.5] },
    });
    toyOnBed(t);
    const k = easeInOut(inv(9.0, 10.95, t));
    lookCam(V(0.2, 3.1, lerp(5.6, 4.9, k)), V(0, 2.9, 0.4), 46);
    ov.swirl(t, W / 2, 820, inv(9.4, 10.9, t));
    ov.flash(inv(10.55, 10.95, t) ** 2);
    return room;
  }],
  // S4 — prehistoric valley: "Dinosaur memang betul-betul wujud! ... berjuta-juta tahun sebelum manusia ada."
  [10.95, 18.45, (t) => {
    hideJungleExtras();
    valleyLife(t);
    const walk = 1 - inv(13.0, 14.0, t);
    const bp = V(lerp(-14, BIG_HOME.x, easeOut(inv(10.95, 14.0, t))), 0, BIG_HOME.z);
    placeBig(t, bp, lerp(1.4, 0.55, inv(12.5, 14.5, t)), { walk, lift: lerp(0.6, 1, inv(12, 13.5, t)) });
    const wow = keys(t, [[10.95, 0], [11.3, 1], [12.4, 1], [12.9, 0]]);
    const look = keys(t, [[10.95, 0], [11.6, 1], [14.5, 1], [15.0, 0]]);
    standAffan(jungle, t, GA, 0.05, {
      wow: wow * 0.9, smile: 0.9, brow: 0.6 + 0.4 * wow,
      headYaw: lerp(0.05, -0.55, look), headPitch: -0.25 * look, lookX: -0.6 * look, lookY: 0.5 * look,
      armL: { reach: [lerp(0.6, 0.95, look), lerp(0.25, 1.45, look), lerp(0.1, 0.45, look)], pole: [1, -0.6, -0.4], point: look },
      armR: t > 15.2 ? { reach: [-0.5, keys(t, [[15.2, 0.25], [15.6, 1.1], [18.45, 1.1]]), 0.55], pole: [-1, -0.8, -0.3] } : {},
    });
    const k = easeOut(inv(10.95, 18.45, t));
    lookCam(V(lerp(3.0, 1.2, k), lerp(4.6, 4.0, k), lerp(19, 15.5, k)), V(-1.0, lerp(4.4, 3.8, k), -1.0), 50);
    ov.flash(1 - inv(10.95, 11.35, t));
    ov.sparkles(t, { n: 22, seed: 3, y: 250, h: 1000, a: 0.6 * (1 - inv(12, 13, t)) });
    const b = pop(t, 12.04, 15.2);
    ov.bubble('wujud', 'BETUL-BETUL\nWUJUD!', { x: W / 2, y: 420, o: b.o, s: b.s, r: -3 }, { size: 112, top: '#c8ff7a', bot: '#36b86a' });
    const j = pop(t, 15.28, 18.4);
    ov.bubble('juta', 'BERJUTA-JUTA\nTAHUN DULU', { x: W / 2, y: 400, o: j.o, s: j.s, r: 2 }, { size: 100 });
    const tl = pop(t, 16.8, 18.4);
    ov.html('tline', ICONS.ruler(), { x: W / 2, y: 790, o: tl.o, s: tl.s * 1.1 });
    const d = pop(t, 16.9, 18.4), m = pop(t, 17.36, 18.4);
    ov.html('tlD', SVG.dino(), { x: 190, y: 660, o: d.o, s: d.s * 0.7 });
    ov.tag('tlDt', 'DINOSAUR', { x: 210, y: 890, o: d.o, s: d.s }, { bg: GREEN, small: true });
    ov.html('tlM', SVG.kid(), { x: 880, y: 650, o: m.o, s: m.s * 0.6 });
    ov.tag('tlMt', 'MANUSIA', { x: 870, y: 890, o: m.o, s: m.s }, { bg: BLUE, small: true });
    return jungle;
  }],
  // S5 — fossil dig site: "Habis tu, macam mana kita tahu?"
  [18.45, 20.94, (t) => {
    digState(t);
    const th = keys(t, [[18.45, 0], [18.8, 1], [20.94, 1]]);
    const tr = POSES.thinkR.armR;
    standAffan(dig, t, DA, 0.55, { smile: 0.4, brow: 0.8, headRoll: -0.1 * th, headPitch: -0.12, lookY: 0.35, armR: { reach: [lerp(-0.6, tr.reach[0], th), lerp(0.25, tr.reach[1], th), lerp(0.1, tr.reach[2], th)], pole: tr.pole, point: th, wx: tr.wx * th } });
    const k = easeInOut(inv(18.45, 20.94, t));
    lookCam(V(lerp(-2.6, -3.2, k), lerp(4.2, 4.0, k), lerp(13.5, 12.2, k)), V(-4.0, 2.2, 1.2), 50);
    ov.flash((1 - inv(18.45, 18.8, t)) * 0.9);
    const head = scr(DA.clone().add(V(0, 3.4, 0)));
    qmarks('dq', t, head, [[18.6, -270, -260, '#ffcf33', -12], [19.0, 260, -300, '#3fa2ff', 10], [19.8, 320, -80, '#ffcf33', 14]], 20.9);
    return dig;
  }],
  // S6 — "Shhh... sebab saintis jumpa fosil!" Affan shushes, then brushes off a skull
  [20.94, 24.38, (t) => {
    digState(t);
    const sh = keys(t, [[20.94, 0], [21.15, 1], [21.75, 1], [22.0, 0]]);
    const br = keys(t, [[22.0, 0], [22.4, 1], [24.38, 1]]);
    const brush = br > 0.02 ? lowReach(t, br) : {};
    standAffan(dig, t, DA.clone().add(V(lerp(0, 3.6, easeInOut(inv(21.8, 22.5, t))), 0, lerp(0, -0.3, inv(21.8, 22.5, t)))), lerp(0.4, 1.1, inv(21.8, 22.5, t)), {
      smile: 0.6 + 0.4 * inv(23.2, 23.5, t), brow: 0.5, lean: 0.3 * br, headPitch: 0.3 * br, lookY: -0.5 * br, wow: keys(t, [[23.1, 0], [23.3, 0.8], [23.9, 0.8], [24.2, 0]]),
      armR: sh > 0.01 ? { reach: [lerp(-0.6, -0.05, sh), lerp(0.25, 1.82, sh), lerp(0.1, 1.0, sh)], point: sh, pole: [-1, -0.8, 0.2], wx: -1.4 * sh } : brush,
      legL: { x: -0.35 * br, knee: 0.5 * br }, legR: { x: 0.2 * br, knee: 0.3 * br },
    });
    if (br > 0.02) brushing(t, br);
    const k = easeInOut(inv(20.94, 24.38, t));
    const kc = easeInOut(inv(21.8, 22.8, t));
    lookCam(V(lerp(-4.6, 3.6, kc), lerp(3.6, 3.8, kc), lerp(8.5, 10.0, kc)), V(lerp(-5.4, -0.6, kc), lerp(3.0, 1.3, kc), lerp(2.4, 1.4, kc)), 46);
    const q = pop(t, 23.2, 24.33);
    ov.bubble('fosil', 'FOSIL!', { x: W / 2, y: 420, o: q.o, s: q.s, r: -4 }, { size: 150, top: '#ffd27a', bot: '#ff9a3d' });
    pinTag('tengkorak', 'TENGKORAK', scr(dig.pieces[SKULL].position.clone().add(V(0, 0.4, 0))), t, 23.4, 24.33, { bg: BROWN, pointer: 'down', small: true }, -110);
    return dig;
  }],
  // S7 — "Fosil ialah tulang, gigi dan tapak kaki dinosaur yang dah lama bertukar jadi batu."
  [24.38, 30.46, (t) => {
    digState(t);
    standAffan(dig, t, V(-6.5, 0, -1.5), 0.9, { smile: 0.8, headYaw: 0.3, lookX: 0.4, headPitch: 0.2, lookY: -0.3 });
    const k = easeInOut(inv(24.38, 28.6, t));
    const k2 = easeInOut(inv(28.8, 30.4, t));
    lookCam(V(lerp(0.6, 0.3, k) - 0.2 * k2, lerp(9.6, 8.6, k) - 1.2 * k2, lerp(15.0, 13.6, k) - 2.6 * k2), V(0.1, lerp(0.4, 0.6, k), lerp(2.4, 2.2, k) - 1.2 * k2), 50);
    const bone = dig.pieces[37].position.clone().add(V(0, 0.3, 0));
    pinTag('tulang', 'TULANG', scr(bone), t, 25.44, 28.7, { bg: '#c9a46a', pointer: 'down' }, -90);
    pinTag('gigi', 'GIGI', scr(dig.stand.position.clone().add(V(0, 2.9, 0))), t, 26.16, 28.7, { bg: BLUE, pointer: 'down' }, -50);
    pinTag('tapak', 'TAPAK KAKI', scr(dig.slab.position.clone().add(V(0, 0.8, 0))), t, 26.88, 28.7, { bg: ORANGE, pointer: 'down' }, -80);
    dig.toothGlow.material.opacity = 0.6 * pop(t, 26.16, 28.7).o;
    const b = pop(t, 29.16, 30.42), r = pop(t, 29.5, 30.42), a = pop(t, 29.35, 30.42);
    ov.html('iBone', SVG.bone(), { x: 220, y: 480, o: b.o, s: b.s * 1.15, r: -8 });
    ov.html('iArr', ICONS.arrow(ORANGE), { x: W / 2, y: 480, o: a.o, s: a.s * 0.95 });
    ov.html('iRock', SVG.rock(), { x: 860, y: 480, o: r.o, s: r.s * 1.2 });
    const jb = pop(t, 29.52, 30.42);
    ov.tag('jbatu', 'JADI BATU!', { x: W / 2, y: 640, o: jb.o, s: jb.s }, { bg: '#8a7458' });
    return dig;
  }],
  // S8 — "Saintis gali perlahan-lahan, lepas tu cantumkan tulang macam main puzzle!"
  [30.46, 35.62, (t) => {
    digState(t);
    const br = keys(t, [[30.46, 1], [32.3, 1], [32.6, 0]]);
    const pos = DA.clone().add(V(3.6, 0, -0.3));
    const back = easeInOut(inv(32.4, 33.2, t));
    const ap = pos.clone().add(V(-2.6 * back, 0, 3.2 * back));
    standAffan(dig, t, ap, lerp(1.1, 0.6, back), {
      smile: 0.8 + 0.2 * back, brow: 0.5, lean: 0.3 * br, headPitch: lerp(0.3 * br, -0.25, back), lookY: lerp(-0.5 * br, 0.5, back), headYaw: 0.25 * back, lookX: 0.4 * back,
      wow: keys(t, [[33.4, 0], [33.7, 0.8], [34.8, 0.8], [35.2, 0]]),
      armR: br > 0.02 ? lowReach(t, br) : {},
      legL: { x: -0.35 * br, knee: 0.5 * br }, legR: { x: 0.2 * br, knee: 0.3 * br },
    });
    if (br > 0.02) brushing(t, br);
    const k = easeInOut(inv(32.3, 34.6, t));
    lookCam(V(lerp(3.6, -0.6, k), lerp(3.8, 4.8, k), lerp(10.0, 22.5, k)), V(lerp(-0.6, -0.9, k), lerp(1.3, 3.0, k), lerp(1.4, 0, k)), 50);
    const g = pop(t, 31.12, 32.5);
    ov.tag('gali', 'GALI PERLAHAN-LAHAN', { x: W / 2, y: 400, o: g.o, s: g.s }, { bg: BROWN, small: true });
    const c = pop(t, 33.2, 35.58);
    ov.tag('cantum', 'CANTUM TULANG', { x: W / 2, y: 380, o: c.o, s: c.s }, { bg: '#c9a46a' });
    const pz = pop(t, 34.64, 35.58);
    ov.bubble('puzzle', 'MACAM PUZZLE!', { x: W / 2 - 40, y: 530, o: pz.o, s: pz.s, r: -3 }, { size: 104, top: '#ffc2dd', bot: '#ff5fa2' });
    ov.html('pz1', SVG.puzzle('#ff8fc0'), { x: 900, y: 520 + Math.sin(t * 3) * 6, o: pz.o, s: pz.s * 0.6, r: 12 });
    ov.html('pz2', SVG.puzzle('#7cc4ff'), { x: 160, y: 700 + Math.sin(t * 3 + 1) * 6, o: pz.o, s: pz.s * 0.5, r: -14 });
    if (t > 34.9) ov.sparkles(t, { n: 18, seed: 21, x: 140, y: 650, w: 800, h: 600, a: inv(34.9, 35.2, t) });
    return dig;
  }],
  // S9a — "Ada dinosaur yang besar macam bas,"
  [35.62, 37.74, (t) => {
    hideJungleExtras();
    valleyLife(t);
    placeBig(t, V(-4.2, 0, -1.5), Math.PI / 2, { lift: 0.95, sway: 0.2, look: -0.3 });
    jungle.bus.position.set(5.2, 0, -1.0);
    jungle.bus.rotation.y = -Math.PI / 2;
    jungle.aff.root.position.set(0, -80, 0);
    const k = easeInOut(inv(35.62, 37.74, t));
    lookCam(V(lerp(0.6, 0.2, k), lerp(5.0, 5.2, k), lerp(27, 25, k)), V(0.4, 4.2, -1.2), 50);
    ov.flash((1 - inv(35.62, 35.95, t)) * 0.8);
    const b = pop(t, 36.4, 37.7);
    ov.bubble('besar', 'BESAR!', { x: W / 2, y: 420, o: b.o, s: b.s, r: -3 }, { size: 140, top: '#bfe6ff', bot: '#2f9bff' });
    pinTag('bas', 'BAS', scr(V(5.2, 4.4, -1.0)), t, 37.44, 37.7, { bg: '#f2a91c', pointer: 'down' }, -50);
    return jungle;
  }],
  // S9b — "ada yang kecil macam ayam!"
  [37.74, 39.72, (t) => {
    hideJungleExtras();
    valleyLife(t);
    placeRunner(jungle.runner, t, V(-1.0, 0, 6.2), 0.5, { run: 0, look: 0.6, hop: 0.12 * Math.max(0, Math.sin(t * 9)) });
    jungle.chicken.position.set(1.0, 0, 6.3);
    jungle.chicken.rotation.y = -0.5;
    jungle.chicken.userData.update(t, { peck: Math.max(0, Math.sin(t * 5)) ** 4 });
    standAffan(jungle, t, V(0, 0, 3.4), 0, { smile: 1, headPitch: 0.35, lookY: -0.6, wow: 0.3 });
    const k = easeInOut(inv(37.74, 39.72, t));
    lookCam(V(lerp(0.3, 0.0, k), lerp(2.0, 1.8, k), lerp(15.0, 14.0, k)), V(0, 1.7, 5.0), 46);
    const b = pop(t, 38.16, 39.68);
    ov.bubble('kecil', 'KECIL!', { x: W / 2, y: 420, o: b.o, s: b.s, r: 3 }, { size: 140, top: '#ffd27a', bot: '#ff8a3d' });
    pinTag('ayam', 'AYAM', scr(V(1.0, 1.55, 6.3)), t, 38.88, 39.68, { bg: RED, pointer: 'down', small: true }, -60);
    pinTag('dinok', 'DINOSAUR', scr(V(-1.0, 1.7, 6.2)), t, 38.6, 39.68, { bg: GREEN, pointer: 'down', small: true }, -60);
    return jungle;
  }],
  // S10 — "Di Malaysia pun, saintis pernah jumpa gigi dinosaur tau!"
  [39.72, 43.24, (t) => {
    digState(t);
    const th = keys(t, [[40.2, 0], [40.6, 1], [43.0, 1], [43.24, 0.6]]);
    const sp = dig.stand.position;
    const up = { ...POSES.thumbsUpR.armR, reach: [-0.45, 0.98, 0.68] };
    standAffan(dig, t, sp.clone().add(V(-2.0, 0, 0.4)), 0.35, {
      smile: 1, brow: 0.6, headYaw: 0.25, lookX: 0.3,
      armR: { reach: [lerp(-0.6, up.reach[0], th), lerp(0.25, up.reach[1], th), lerp(0.1, up.reach[2], th)], pole: up.pole, thumb: th, wy: up.wy * th, wx: up.wx * th },
    });
    dig.toothGlow.material.opacity = 0.5 + 0.2 * Math.sin(t * 4);
    dig.stand.children[2].rotation.y = t * 0.8;
    const k = easeInOut(inv(39.72, 43.24, t));
    lookCam(V(sp.x + lerp(0.2, -0.4, k), lerp(3.3, 3.1, k), sp.z + lerp(11.0, 9.8, k)), V(sp.x - 1.0, 2.1, sp.z), 46);
    ov.flash((1 - inv(39.72, 40.05, t)) * 0.8);
    const m = pop(t, 39.84, 43.2);
    ov.bubble('my', 'MALAYSIA PUN ADA!', { x: W / 2, y: 410, o: m.o, s: m.s, r: -2 }, { size: 96, top: '#ffe45c', bot: '#ff9f1c' });
    const ph = pop(t, 40.8, 43.2);
    ov.tag('pahang', 'PAHANG', { x: W / 2, y: 560, o: ph.o, s: ph.s }, { bg: RED, small: true });
    pinTag('gigiD', 'GIGI DINOSAUR', scr(sp.clone().add(V(0, 2.75, 0))), t, 41.76, 43.2, { bg: BLUE, pointer: 'down' }, -40);
    ov.sparkles(t, { n: 10, seed: 15, x: scr(sp.clone().add(V(0, 2.1, 0))).x - 160, y: scr(sp.clone().add(V(0, 2.1, 0))).y - 160, w: 320, h: 280, a: 0.8, size: 20, colors: ['#fff6c8', '#ffe08a'] });
    return dig;
  }],
  // S11 — "Tapi, kenapa sekarang kita tak nampak dinosaur?" under the skeleton
  [43.24, 46.38, (t) => {
    digState(t);
    const th = keys(t, [[43.3, 0], [43.7, 1], [46.38, 1]]);
    const tr = POSES.thinkR.armR;
    const ap = V(1.6, 0, 3.6);
    standAffan(dig, t, ap, -0.25, { smile: 0.3, brow: 0.9, headPitch: -0.35, lookY: 0.7, headYaw: -0.25, lookX: -0.3, headRoll: 0.08 * th, armR: { reach: [lerp(-0.6, tr.reach[0], th), lerp(0.25, tr.reach[1], th), lerp(0.1, tr.reach[2], th)], pole: tr.pole, point: th, wx: tr.wx * th } });
    const k = easeInOut(inv(43.24, 46.38, t));
    lookCam(V(lerp(3.8, 3.0, k), lerp(1.4, 1.6, k), lerp(11.5, 10.5, k)), V(0.8, lerp(3.4, 3.2, k), 1.0), 54);
    ov.flash((1 - inv(43.24, 43.55, t)) * 0.8);
    const head = scr(ap.clone().add(V(0, 3.5, 0)));
    qmarks('kq', t, head, [[43.4, -280, -250, '#ffcf33', -12], [44.1, 270, -280, '#3fa2ff', 10]], 46.33);
    const n = pop(t, 45.2, 46.33);
    ov.bubble('mana', 'MANA DINOSAUR?', { x: W / 2, y: 410, o: n.o, s: n.s, r: 2 }, { size: 104, top: '#c8ff7a', bot: '#36b86a' });
    return dig;
  }],
  // S12 — the space rock: "Lama dulu, batu angkasa ... jatuh ke Bumi. Kebanyakan dinosaur pun pupus."
  [46.38, 53.01, (t) => {
    hideJungleExtras();
    const doom = easeInOut(inv(46.6, 48.4, t));
    jungle.setMood(doom, t);
    const look = keys(t, [[46.38, 0], [47.6, 1], [53, 1]]);
    placeBig(t, BIG_HOME, 0.55, { lift: 0.85 + 0.15 * look, nod: -0.35 * look, look: 0.3 * look });
    placeBaby(t, V(4.5, 0, -3), -0.4, { lift: 0.9, nod: -0.3 * look });
    placeRunner(jungle.runner, t, V(5.5, 0, 1.5), -0.3, { run: 0, look: 0.3 });
    placeRunner(jungle.runner2, t, V(-6.5, 0, 1.0), 0.4, { run: 0, look: -0.3 });
    jungle.chicken.position.set(0, -80, 0);
    // asteroid path: high top-right -> impact far behind the mountains
    const k = inv(47.0, 50.12, t);
    const A = V(-2, 45, -70), B = V(-40, 3, -140);
    if (k > 0 && k < 1) {
      const p = A.clone().lerp(B, k * k * 0.3 + k * 0.7);
      jungle.rock.position.copy(p);
      jungle.rock.rotation.set(t * 2, t * 1.3, 0);
      const dir = A.clone().sub(B).normalize();
      jungle.trail.forEach((s, i) => s.position.copy(p).addScaledVector(dir, 5 + i * 5.5));
    }
    const im = inv(50.1, 50.4, t) * (1 - 0.6 * inv(51.0, 53.0, t));
    jungle.impact.material.opacity = im;
    jungle.dust.forEach((d) => {
      const u = clamp((t - 50.2) / 2.8);
      d.position.set(d.userData.x0 + d.userData.v[0] * u, 2 + d.userData.v[1] * easeOut(u), d.position.z);
      d.scale.setScalar(8 + 18 * u);
      d.material.opacity = 0.55 * inv(50.2, 50.8, t);
    });
    standAffan(jungle, t, GA, -0.15, {
      smile: lerp(0.6, 0.0, look), brow: 0.9, wow: keys(t, [[49.9, 0], [50.2, 1], [51.6, 1], [52.0, 0.2]]),
      headYaw: -0.4 * look, headPitch: -0.45 * look, lookX: -0.4 * look, lookY: 0.7 * look,
    });
    const shake = t > 50.15 && t < 51.2 ? (1 - inv(50.15, 51.2, t)) * 0.18 : 0;
    const kk = easeInOut(inv(46.38, 53.01, t));
    lookCam(V(lerp(4.0, 3.0, kk) + shake * Math.sin(t * 70), lerp(2.6, 2.2, kk) + shake * Math.cos(t * 63), lerp(14.0, 15.5, kk)), V(-3, lerp(6, 9, kk), -12), 56);
    ov.flash(inv(50.1, 50.25, t) * (1 - inv(50.25, 51.0, t)) * 0.85, '255,220,170');
    if (k > 0 && k < 1) {
      const rp = scr(jungle.rock.position);
      pinTag('batuA', 'BATU ANGKASA', rp, t, 47.36, 50.0, { bg: ORANGE, pointer: 'up', small: true }, 120);
    }
    const j = pop(t, 50.12, 53.0);
    ov.tag('juta66', '66 JUTA TAHUN DULU', { x: W / 2, y: 380, o: j.o, s: j.s }, { bg: '#7a5ad8', small: true });
    const p = pop(t, 52.04, 52.98);
    ov.bubble('pupus', 'PUPUS!', { x: W / 2, y: 530, o: p.o, s: p.s, r: -3 }, { size: 150, top: '#ffb36b', bot: '#ff5a3d' });
    return jungle;
  }],
  // S13 — "Tapi tahu tak? Burung ialah keturunan dinosaur!"
  [53.01, 56.54, (t) => {
    hideJungleExtras();
    valleyLife(t);
    const rp = V(-1.2, 0, 6.0);
    placeRunner(jungle.runner, t, rp, 0.55, { run: 0, look: 0.5 });
    const land = easeOut(inv(53.2, 54.3, t));
    const bp = V(lerp(6, 1.2, land), lerp(4.5, 0.0, land) + 0.6 * Math.sin(land * Math.PI), 6.0);
    jungle.bird.position.copy(bp);
    jungle.bird.rotation.y = -0.6;
    jungle.bird.scale.setScalar(1.15);
    jungle.bird.userData.update(t, { flap: 1 - inv(54.1, 54.4, t), hop: t > 54.4 ? 0.1 * Math.max(0, Math.sin(t * 8)) : 0 });
    jungle.aff.root.position.set(0, -80, 0);
    const k = easeInOut(inv(53.01, 56.54, t));
    lookCam(V(lerp(0.3, 0.0, k), lerp(2.0, 1.8, k), lerp(16.5, 15.0, k)), V(0, 1.3, 6.0), 44);
    ov.flash((1 - inv(53.01, 53.35, t)) * 0.9);
    pinTag('dinoT', 'DINOSAUR', scr(V(-1.2, 1.8, 6.0)), t, 53.6, 56.5, { bg: GREEN, pointer: 'down', small: true }, -60);
    pinTag('burung', 'BURUNG', scr(V(1.2, 1.6, 6.0)), t, 54.16, 56.5, { bg: BLUE, pointer: 'down', small: true }, -60);
    const a = pop(t, 54.5, 56.5);
    const s0 = scr(V(-0.5, 1.0, 6.0)), s1 = scr(V(0.7, 1.0, 6.0));
    ov.html('arrB', ICONS.arrow(ORANGE), { x: (s0.x + s1.x) / 2, y: s0.y - 30, o: a.o, s: a.s * 0.6 });
    const b = pop(t, 55.0, 56.5);
    ov.bubble('ket', 'KETURUNAN\nDINOSAUR!', { x: W / 2, y: 430, o: b.o, s: b.s, r: -2 }, { size: 108, top: '#bfe6ff', bot: '#2f9bff' });
    return jungle;
  }],
  // S14 — "Waaah, rupanya ayam pun cucu-cicit dinosaur!"
  [56.54, 60.22, (t) => {
    hideJungleExtras();
    valleyLife(t);
    placeRunner(jungle.runner, t, V(-1.3, 0, 6.2), 0.4, { run: 0, look: 0.4, hop: 0.12 * Math.max(0, Math.sin(t * 9 + 1)) });
    jungle.chicken.position.set(1.3, 0, 6.2);
    jungle.chicken.rotation.y = -0.4;
    jungle.chicken.userData.update(t, { peck: Math.max(0, Math.sin(t * 4)) ** 4, look: -0.3 });
    const jump = t > 56.6 && t < 57.2 ? Math.sin(((t - 56.6) / 0.6) * Math.PI) * 0.45 : 0;
    const up = keys(t, [[56.54, 0], [56.75, 1], [57.3, 1], [57.6, 0]]);
    const idx = keys(t, [[57.9, 0], [58.2, 1], [60.22, 1]]);
    standAffan(jungle, t, V(0, 0, 4.2), 0, {
      blink: t < 57.4 ? 0 : blinkAt(t, 6), bob: jump, smile: 1,
      wow: keys(t, [[56.54, 0], [56.7, 1], [57.3, 1], [57.6, 0]]), brow: keys(t, [[56.54, 0], [56.7, 1], [58.3, 0.5]]),
      legL: { x: -0.25 * jump, knee: 0.6 * jump }, legR: { x: -0.25 * jump, knee: 0.6 * jump },
      armL: { reach: [lerp(0.55, 0.85, up), lerp(0.25, 1.85, up), lerp(0.1, 0.3, up)], pole: [1, -0.4, -0.5] },
      armR: idx > 0.01 ? { reach: [lerp(-0.6, -0.75, idx), lerp(0.25, 0.75, idx), lerp(0.1, 0.75, idx)], point: idx, pole: [-1, -0.8, -0.3] } : { reach: [lerp(-0.55, -0.85, up), lerp(0.25, 1.85, up), lerp(0.1, 0.3, up)], pole: [-1, -0.4, -0.5] },
      headYaw: -0.35 * idx, headPitch: 0.2 * idx, lookX: -0.5 * idx, lookY: -0.3 * idx,
    });
    const k = easeOut(inv(56.54, 60.22, t));
    lookCam(V(0.2, lerp(3.0, 2.6, k), lerp(16.0, 15.0, k)), V(0, 2.0, 4.8), 48);
    const head = scr(V(0, 4.3 + jump, 4.2));
    const b = pop(t, 56.6, 58.0);
    ov.html('bulb', ICONS.bulb(), { x: head.x + 260, y: head.y - 60 + Math.sin(t * 5) * 8, o: b.o, s: b.s * 0.7, r: 10 });
    ov.sparkles(t, { n: 30, seed: 12, y: 250, h: 900, a: inv(56.6, 57.0, t) * (1 - inv(57.8, 58.3, t)) });
    const w = pop(t, 56.56, 58.0);
    ov.bubble('waah', 'WAAAH!', { x: W / 2, y: 420, o: w.o, s: w.s, r: -4 }, { size: 140 });
    const c = pop(t, 58.64, 60.18);
    ov.bubble('cucu', 'CUCU-CICIT\nDINOSAUR!', { x: W / 2, y: 430, o: c.o, s: c.s, r: 2 }, { size: 104, top: '#ffc2dd', bot: '#ff5fa2' });
    pinTag('ayam2', 'AYAM', scr(V(1.3, 1.55, 6.2)), t, 58.0, 60.18, { bg: RED, pointer: 'down', small: true }, -60);
    return jungle;
  }],
  // S15 — back in the bedroom: thumbs up, "dinosaur memang betul-betul wujud!"
  [60.22, 64.59, (t) => {
    const th = keys(t, [[60.4, 0], [60.75, 1], [64.3, 1], [64.59, 0.6]]);
    const up = { ...POSES.thumbsUpR.armR, reach: [-0.45, 0.98, 0.68] };
    roomAffan(t, {
      headYaw: -0.08 + 0.05 * wobble(t, 2), smile: 1, brow: 0.6,
      armR: { reach: sitRest.armR.reach.map((r, i) => lerp(r, up.reach[i], th)), pole: up.pole, thumb: th, wy: up.wy * th, wx: up.wx * th },
      armL: { reach: [0.62, lerp(0.3, 0.75, th), lerp(0.42, 0.75, th)], pole: [1, -1, -0.3] },
    });
    toyInHand(t, 'L', 0.6);
    const k = easeInOut(inv(60.22, 64.59, t));
    lookCam(V(lerp(0.9, 0.4, k), 3.1, lerp(6.6, 5.6, k)), V(0, 2.7, 0.4), 46);
    ov.flash((1 - inv(60.22, 60.55, t)) * 0.9);
    if (th > 0.5) {
      const hand = scr(handPos(room.aff));
      ov.sparkles(t, { n: 12, seed: 33, x: hand.x - 160, y: hand.y - 200, w: 320, h: 300, a: inv(60.7, 61.1, t), size: 30 });
    }
    const b = pop(t, 62.29, 64.55);
    ov.bubble('wujud2', 'BETUL-BETUL\nWUJUD!', { x: W / 2, y: 420, o: b.o, s: b.s, r: -3 }, { size: 112, top: '#c8ff7a', bot: '#36b86a' });
    return room;
  }],
  // S16 — "Apa lagi kita nak belajar lepas ni?"
  [64.59, 66.93, (t) => {
    const tk = keys(t, [[64.59, 0], [64.95, 1], [66.93, 1]]);
    const th2 = POSES.thinkR.armR;
    roomAffan(t, {
      smile: 1, brow: 0.3 + 0.4 * tk, headRoll: -0.12 * tk, lookX: 0.35 * tk, lookY: 0.4 * tk, headPitch: -0.08 * tk, headYaw: 0.05,
      armR: { reach: sitRest.armR.reach.map((r, i) => lerp(r, th2.reach[i], tk)), pole: th2.pole, point: tk, wx: th2.wx * tk },
    });
    toyOnBed(t);
    lookCam(V(0.3, 3.2, 4.4), V(0, 3.0, 0.4), 46);
    const head = scr(AFF_HEAD);
    qmarks('eq', t, head, [[64.7, -290, -300, '#ffcf33', -12], [65.0, 280, -340, '#3fa2ff', 10], [65.3, 320, -90, '#ffcf33', 14]], 66.9);
    return room;
  }],
  // Outro — The Curious Affan logo
  [66.93, DURATION, (t) => {
    const k = easeOut(inv(66.93, 67.6, t));
    outro.aff.root.position.set(0, 0, 0);
    const th2 = POSES.thinkR.armR;
    outro.aff.pose({ ...POSES.thinkR, armR: { ...th2 }, smile: 1, blink: blinkAt(t, 9), headRoll: -0.08, lookX: 0.25, lookY: 0.15, headYaw: 0.08 });
    const a = t * 1.4;
    placeRunner(outro.runner, t, V(2.2 * Math.sin(a), 0, 1.4 * Math.cos(a)), a + Math.PI / 2, { run: 1 });
    lookCam(V(0, 2.6, lerp(7.5, 5.4, k)), V(0, 2.3, 0), 40);
    const hc = scr(V(0, 2.95, 0));
    ov.flash((1 - inv(66.93, 67.3, t)) * 1.0);
    const g = ov.g;
    const ra = inv(67.0, 67.6, t);
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
    const ic = pop(t, 67.5, 99);
    ov.html('oBulb', ICONS.bulb(), { x: 175, y: 470 + Math.sin(t * 2) * 8, o: ic.o, s: ic.s * 0.55, r: -10 });
    ov.html('oQ1', ICONS.qmark('#ffcf33'), { x: 880, y: 420 + Math.sin(t * 2 + 1) * 8, o: ic.o, s: ic.s * 0.9, r: 12 });
    ov.html('oQ2', ICONS.qmark('#2f6fff'), { x: 220, y: 720 + Math.sin(t * 2 + 2) * 8, o: ic.o, s: ic.s * 0.6, r: -12 });
    const l1 = pop(t, 67.2, 99), l2 = pop(t, 67.4, 99), l3 = pop(t, 67.6, 99);
    drawLogo(ov, { k: [l1, l2, l3], star: pop(t, 67.8, 99) });
    return outro;
  }],
];

function frame(t) {
  ov.begin();
  cam.aspect = W / H;
  cam.updateProjectionMatrix();
  const shot = SHOTS.find(([a, b]) => t >= a && t < b) || SHOTS[SHOTS.length - 1];
  const world = shot[2](t);
  if (world.sky) world.sky.position.copy(cam.position);
  renderer.render(world.scene, cam);
  if (world !== outro) ov.vignette(0.28);
  ov.captions(t, CAPTIONS, KEYWORDS);
  ov.end();
}

// Cover / thumbnail (9:16): Affan in the prehistoric valley, amazed, with
// the big long-neck dinosaur leaning in behind him and a little runner at
// his feet; big title, episode badge and the series logo. Key elements stay
// inside the centre 3:4 area (y 240-1680) that profile grids show.
const THUMB = { big: [-4.5, 0, -3.5], yaw: 1.05, lift: 0.5, sway: 1.6, nod: 0.35, cam: [0.4, 3.3, 16.5], look: [0.2, 4.5, 0], fov: 50 };
window.setThumb = (o) => Object.assign(THUMB, o);
function thumbnail() {
  ov.begin();
  cam.aspect = W / H;
  cam.updateProjectionMatrix();
  const t = 12.3;
  hideJungleExtras();
  valleyLife(t);
  placeBig(t, V(...THUMB.big), THUMB.yaw, { lift: THUMB.lift, nod: THUMB.nod, sway: THUMB.sway, look: -0.6, blink: 0 });
  placeRunner(jungle.runner, t, V(1.9, 0, 7.0), -0.5, { run: 0, look: -0.3, blink: 0 });
  placeRunner(jungle.runner2, t, V(-7, 0, 3), 0.6, { run: 0 });
  standAffan(jungle, t, V(0, 0, 4.8), 0.15, {
    blink: 0, talk: 0, wow: 0.9, brow: 1, smile: 0.9, headYaw: -0.25, headPitch: -0.2, lookX: -0.5, lookY: 0.5,
    armL: { reach: [0.9, 1.5, 0.45], pole: [1, -0.6, -0.4], point: 1 },
    armR: { reach: [-0.85, 1.85, 0.3], pole: [-1, -0.4, -0.5] },
  });
  lookCam(V(...THUMB.cam), V(...THUMB.look), THUMB.fov);
  jungle.sky.position.copy(cam.position);
  renderer.render(jungle.scene, cam);
  const g = ov.g;
  const top = g.createLinearGradient(0, 0, 0, 780);
  top.addColorStop(0, 'rgba(8,30,20,0.75)');
  top.addColorStop(1, 'rgba(8,30,20,0)');
  g.fillStyle = top;
  g.fillRect(0, 0, W, 780);
  const bot = g.createLinearGradient(0, H - 900, 0, H);
  bot.addColorStop(0, 'rgba(8,30,20,0)');
  bot.addColorStop(1, 'rgba(8,30,20,0.8)');
  g.fillStyle = bot;
  g.fillRect(0, H - 900, W, 900);
  ov.vignette(0.3);
  ov.tag('thBadge', 'EPISOD 12', { x: W / 2, y: 300 }, { bg: '#2f7bff', small: true });
  ov.bubble('thTitle', 'BETUL KE DINOSAUR\nWUJUD?', { x: W / 2, y: 485, r: -2 }, { size: 98, top: '#c8ff7a', bot: '#36b86a' });
  ov.html('thQ', ICONS.qmark('#ffcf33'), { x: 140, y: 800, r: -14, s: 0.9 });
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
