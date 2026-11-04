// THE CURIOUS AFFAN — Episode 018: "Kenapa Rambut Kita Makin Tumbuh Panjang?"
// Every shot is a pure function of time t (seconds), synced to audio/narration.mp3.
//
// Science (kept simple and accurate for ages 5-12):
// - Each hair grows out of a tiny pocket in the skin, the hair follicle.
// - At the bottom of the follicle, the hair bulb makes new cells all the time.
//   New cells push the older cells up; they harden (keratin) into the hair
//   shaft, so the hair gets longer.
// - Blood vessels bring food (nutrients and oxygen) to the bulb so it keeps
//   working.
// - The hair we can see above the skin is no longer alive (no nerves), so a
//   haircut does not hurt.
// - Scalp hair grows about 1 cm a month.
// - After a few years an old hair falls out and a new one grows from the same
//   follicle. Losing some hairs every day is normal.
// - A balanced diet (protein like eggs and fish, plus vegetables) helps keep
//   hair healthy.
import * as THREE from 'three';
import { makeRenderer, loadEnvelope, toScreen, clamp, lerp, inv, easeOut, easeIn, easeInOut, keys, wobble, W, H } from '../../shared/core.js';
import { POSES, blinkAt } from '../../shared/affan.js';
import { Overlay, pop, ICONS, drawLogo } from '../../shared/overlay.js';
import { CAPTIONS, KEYWORDS } from './captions.js';
import { buildRoom, buildScalp, buildOutro } from './worlds.js';

const FPS = 30;
const DURATION = 63.8;

const stage = document.getElementById('stage');
const canvas = document.createElement('canvas');
stage.appendChild(canvas);
const renderer = makeRenderer(canvas);
const ov = new Overlay(stage);
const room = buildRoom();
const sc = buildScalp();
const outro = buildOutro();
const cam = new THREE.PerspectiveCamera(50, W / H, 0.05, 3000);
let env = { at: () => 0 };

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const talk = (t) => clamp(env.at(t) * 1.2);
const scr = (p) => toScreen(p, cam);
function lookCam(pos, look, fov = 50) {
  cam.position.copy(pos);
  cam.fov = fov;
  cam.updateProjectionMatrix();
  cam.lookAt(look);
  cam.updateMatrixWorld(true);
}
const BLUE = '#2f7bff', GREEN = '#2fb35a', ORANGE = '#ff8a3d', RED = '#ff4d5e', PURPLE = '#8a5cff', PINK = '#ff5aa8', BROWN = '#8a5a2b', GREY = '#6f7a92';

// ----------------------------------------------------------------- icons
const OUT = 'stroke="#17256b" stroke-width="9" stroke-linejoin="round"';
const SCISSORS = (open = 1) => {
  const a = 6 + 22 * clamp(open);
  return `<svg width="260" height="200" viewBox="-130 -100 260 200"><g ${OUT}>
  <g transform="rotate(${-a})"><path d="M-10 -6 L120 -14 Q128 0 120 6 L-10 6 Z" fill="#dfe7f5"/><circle cx="-62" cy="0" r="34" fill="#ff5a3d"/><circle cx="-62" cy="0" r="15" fill="#fff6e6"/></g>
  <g transform="rotate(${a})"><path d="M-10 -6 L120 -6 Q128 0 120 14 L-10 6 Z" fill="#c8d2e6"/><circle cx="-62" cy="0" r="34" fill="#ff5a3d"/><circle cx="-62" cy="0" r="15" fill="#fff6e6"/></g>
  </g><circle cx="0" cy="0" r="9" fill="#17256b"/></svg>`;
};
const CAL_SVG = (label = '1', sub = 'BULAN') => `<svg width="200" height="210" viewBox="0 0 200 210"><g ${OUT}>
  <rect x="14" y="30" width="172" height="166" rx="22" fill="#ffffff"/><path d="M14 52 Q14 30 36 30 H164 Q186 30 186 52 V84 H14 Z" fill="#ff5a3d"/>
  <line x1="60" y1="14" x2="60" y2="50" stroke-width="14" stroke-linecap="round"/><line x1="140" y1="14" x2="140" y2="50" stroke-width="14" stroke-linecap="round"/></g>
  <text x="100" y="150" text-anchor="middle" font-family="Baloo 2" font-weight="800" font-size="78" fill="#17256b">${label}</text>
  <text x="100" y="186" text-anchor="middle" font-family="Baloo 2" font-weight="800" font-size="28" fill="#ff5a3d">${sub}</text></svg>`;
const GEAR = (rot = 0, c = '#ffb347') => `<svg width="180" height="180" viewBox="-90 -90 180 180"><g transform="rotate(${rot})" ${OUT}>
  <path d="${Array.from({ length: 8 }, (_, i) => {
    const a0 = (i / 8) * Math.PI * 2, a1 = a0 + 0.3, a2 = a0 + 0.48, a3 = a0 + 0.78;
    const P = (a, r) => `${(Math.cos(a) * r).toFixed(1)} ${(Math.sin(a) * r).toFixed(1)}`;
    return `${i ? 'L' : 'M'}${P(a0, 58)} L${P(a1, 78)} L${P(a2, 78)} L${P(a3, 58)}`;
  }).join(' ')} Z" fill="${c}"/><circle r="22" fill="#fff6e6"/></g></svg>`;
const FACTORY = `<svg width="260" height="210" viewBox="0 0 260 210"><g ${OUT}>
  <rect x="176" y="20" width="40" height="80" fill="#c8d2e6"/><path d="M20 200 V100 L80 70 V100 L140 70 V100 L200 70 V200 Z" fill="#ffb347"/>
  <rect x="44" y="130" width="34" height="34" rx="6" fill="#fff3a6"/><rect x="104" y="130" width="34" height="34" rx="6" fill="#fff3a6"/><rect x="160" y="150" width="30" height="50" rx="4" fill="#8a5a2b"/></g>
  <circle cx="200" cy="12" r="12" fill="#ffffff" opacity="0.8"/><circle cx="222" cy="-4" r="9" fill="#ffffff" opacity="0.6"/></svg>`;
const EGG_SVG = `<svg width="170" height="200" viewBox="0 0 170 200"><path d="M85 12 Q140 12 152 110 Q158 188 85 190 Q12 188 18 110 Q30 12 85 12 Z" fill="#fff6e6" stroke="#17256b" stroke-width="10"/><ellipse cx="60" cy="70" rx="14" ry="24" fill="#fff" opacity="0.9"/></svg>`;
const FISH_SVG = `<svg width="240" height="150" viewBox="0 0 240 150"><g ${OUT}><path d="M190 75 L232 30 L232 120 Z" fill="#ff8a3d"/>
  <path d="M20 75 Q70 10 150 30 Q200 50 200 75 Q200 100 150 120 Q70 140 20 75 Z" fill="#5fb6ff"/></g><circle cx="60" cy="64" r="10" fill="#17256b"/>
  <path d="M110 45 Q125 75 110 105" fill="none" stroke="#2f7bd6" stroke-width="7" stroke-linecap="round"/></svg>`;
const BROC_SVG = `<svg width="200" height="220" viewBox="0 0 200 220"><g ${OUT}>
  <path d="M80 210 L88 120 L112 120 L120 210 Z" fill="#a8d868"/>
  <circle cx="60" cy="95" r="42" fill="#3a9a40"/><circle cx="140" cy="95" r="42" fill="#3a9a40"/><circle cx="100" cy="60" r="48" fill="#43a648"/>
  <circle cx="100" cy="112" r="34" fill="#2f8a36"/></g><circle cx="86" cy="48" r="10" fill="#8fdc7a"/><circle cx="50" cy="84" r="8" fill="#8fdc7a"/></svg>`;
const CHECK = `<svg width="180" height="180" viewBox="0 0 180 180"><circle cx="90" cy="90" r="80" fill="#2fb35a" stroke="#ffffff" stroke-width="12"/><path d="M50 92 L80 122 L132 62" fill="none" stroke="#ffffff" stroke-width="20" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const COMMENT_SVG = `<svg width="170" height="150" viewBox="0 0 170 150"><path d="M20 15 H150 Q160 15 160 25 V95 Q160 105 150 105 H75 L40 138 V105 H20 Q10 105 10 95 V25 Q10 15 20 15 Z" fill="#ffffff" stroke="#17256b" stroke-width="10" stroke-linejoin="round"/><circle cx="52" cy="60" r="10" fill="#ff5aa8"/><circle cx="85" cy="60" r="10" fill="#ff5aa8"/><circle cx="118" cy="60" r="10" fill="#ff5aa8"/></svg>`;
const DOWN_ARROW = `<svg width="120" height="150" viewBox="0 0 120 150"><path d="M40 10 H80 V80 H110 L60 140 L10 80 H40 Z" fill="#ffd84a" stroke="#17256b" stroke-width="10" stroke-linejoin="round"/></svg>`;
const UP_ARROW = (c = '#8fe39a') => `<svg width="120" height="150" viewBox="0 0 120 150"><path d="M40 140 H80 V70 H110 L60 10 L10 70 H40 Z" fill="${c}" stroke="#17256b" stroke-width="10" stroke-linejoin="round"/></svg>`;
const DROP_SVG = `<svg width="120" height="160" viewBox="0 0 120 160"><path d="M60 10 Q110 80 104 106 Q98 150 60 150 Q22 150 16 106 Q10 80 60 10 Z" fill="#ff4d5e" stroke="#17256b" stroke-width="10"/><ellipse cx="42" cy="100" rx="10" ry="18" fill="#fff" opacity="0.7"/></svg>`;
const SPARK_FOOD = `<svg width="200" height="120" viewBox="0 0 200 120"><g ${OUT}><path d="M50 15 Q85 15 90 62 Q92 105 50 106 Q8 105 10 62 Q15 15 50 15 Z" fill="#fff6e6"/>
  <path d="M110 60 Q140 20 170 50 Q190 60 170 70 Q140 100 110 60 Z" fill="#5fb6ff"/></g></svg>`;
// a hair strand coming out of skin, with a ruler beside it (the 1 cm beat)
function RULER_PANEL(grow) {
  const top = 330 - 120 * clamp(grow);
  return `<svg width="560" height="520" viewBox="0 0 560 520">
    <rect x="0" y="380" width="560" height="140" fill="#f2b48e" stroke="#17256b" stroke-width="10"/>
    <path d="M200 520 V380" stroke="#e8916a" stroke-width="10"/>
    <path d="M226 ${top.toFixed(1)} Q236 ${(top + 100).toFixed(1)} 230 392" fill="none" stroke="#17256b" stroke-width="34" stroke-linecap="round"/>
    <path d="M226 ${top.toFixed(1)} Q236 ${(top + 100).toFixed(1)} 230 392" fill="none" stroke="#3a2416" stroke-width="20" stroke-linecap="round"/>
    <ellipse cx="230" cy="392" rx="40" ry="12" fill="#b8664a" stroke="#17256b" stroke-width="8"/>
    <rect x="330" y="60" width="90" height="330" rx="12" fill="#ffd84a" stroke="#17256b" stroke-width="10"/>
    ${Array.from({ length: 12 }, (_, i) => `<line x1="330" y1="${90 + i * 25}" x2="${i % 2 ? 360 : 380}" y2="${90 + i * 25}" stroke="#17256b" stroke-width="6"/>`).join('')}
    <line x1="290" y1="330" x2="540" y2="330" stroke="#ff5a3d" stroke-width="8" stroke-dasharray="18 12"/>
    <line x1="290" y1="210" x2="540" y2="210" stroke="#2fb35a" stroke-width="8" stroke-dasharray="18 12" opacity="${clamp(grow * 3 - 2).toFixed(2)}"/></svg>`;
}

function panel(x, y, w, h, a = 0.8, r = 46) {
  if (a <= 0) return;
  const g = ov.g;
  g.save();
  g.globalAlpha = a;
  g.fillStyle = 'rgba(14,20,58,1)';
  g.beginPath();
  g.roundRect(x, y, w, h, r);
  g.fill();
  g.globalAlpha = a * 0.4;
  g.strokeStyle = '#ffffff';
  g.lineWidth = 5;
  g.stroke();
  g.restore();
}
function ring(x, y, r, a, color = '#ffe58a', w = 12) {
  if (a <= 0) return;
  const g = ov.g;
  g.save();
  g.globalAlpha = clamp(a);
  g.strokeStyle = color;
  g.shadowColor = color;
  g.shadowBlur = 30;
  g.lineWidth = w;
  g.setLineDash([26, 16]);
  g.beginPath();
  g.ellipse(x, y, r, r * 1.0, 0, 0, Math.PI * 2);
  g.stroke();
  g.restore();
}

// ------------------------------------------------------------- Affan poses
const _hw = new THREE.Vector3();
function handW(aff, side = 'R') {
  aff.root.updateMatrixWorld(true);
  return aff.parts.arms[side].index.getWorldPosition(_hw);
}
const cheer = (k) => ({
  armL: { reach: [lerp(0.55, 0.85, k), lerp(0.3, 1.9, k), lerp(0.1, 0.3, k)], pole: [1, -0.4, -0.5] },
  armR: { reach: [lerp(-0.55, -0.85, k), lerp(0.3, 1.9, k), lerp(0.1, 0.3, k)], pole: [-1, -0.4, -0.5] },
});
// both hands up at the forehead, pushing the long fringe aside
const fringe = (k, t = 0) => ({
  armL: { reach: [lerp(0.55, 0.32, k), lerp(0.3, 1.62, k) + 0.04 * Math.sin(t * 9) * k, lerp(0.1, 0.62, k)], pole: [1, -0.6, -0.2] },
  armR: { reach: [lerp(-0.55, -0.32, k), lerp(0.3, 1.62, k) - 0.04 * Math.sin(t * 9) * k, lerp(0.1, 0.62, k)], pole: [-1, -0.6, -0.2] },
});
const pointAt = (k, side = 'R', [x, y, z] = [0.95, 1.45, 0.1]) => {
  const s = side === 'R' ? -1 : 1;
  return { ['arm' + side]: { reach: [lerp(0.55 * s, x * s, k), lerp(0.3, y, k), lerp(0.1, z, k)], point: k, pole: [s, -0.5, -0.3] } };
};
function roomAffan(t, p = {}) {
  room.aff.root.position.set(0, 0, 0);
  room.aff.pose({ blink: blinkAt(t, 2), talk: talk(t), smile: 0.7, ...p });
}
// Affan stands on the scalp at P
const STAND = V(-4.2, 0, -2.6);
function scAffan(t, P = STAND, p = {}) {
  sc.aff.root.position.copy(P);
  sc.focus(P);
  sc.aff.pose({ blink: blinkAt(t, 4), talk: talk(t), smile: 0.8, ...p });
}
function animMotes(t) {
  sc.motes.forEach((m) => {
    const { x, y, z, s } = m.userData;
    m.position.set(x + Math.sin(t * 0.3 + s) * 3, y + Math.sin(t * 0.5 + s * 2) * 1.5, z + Math.cos(t * 0.4 + s) * 2);
  });
}

// ---------------------------------------------------- follicle animation state
const DEPTH = sc.DEPTH;
const SHAFT0 = -DEPTH + 1.2; // bottom of the shaft (top of the bulb)
// hero hair top height above the surface, grows during the "factory" beat
function heroTop(t) {
  return 25 + 5 * easeInOut(inv(24.2, 28.6, t)) + 1.5 * easeInOut(inv(39.3, 41.8, t));
}
function setHero(t, { snip = -1 } = {}) {
  const top = heroTop(t);
  const cutAt = sc.cutY;
  const h = sc.hero;
  h.shaft.position.y = SHAFT0;
  if (snip >= 0) {
    // after the snip the standing hair ends at the cut line; the top falls away
    h.shaft.scale.y = cutAt - SHAFT0;
    sc.snipped.visible = snip < 1;
    const fall = easeIn(clamp(snip));
    sc.snipped.position.set(lerp(0, 5, fall), cutAt - 2 * fall * fall * 30, lerp(0, 4, fall));
    sc.snipped.rotation.set(0.25 * fall, 0, -1.25 * fall);
    sc.snipTop.scale.y = top - cutAt;
  } else {
    h.shaft.scale.y = top - SHAFT0;
    sc.snipped.visible = false;
  }
}
// cells leave the bulb and travel up the hero shaft
function setCells(t, a, rate = 1) {
  const L = DEPTH - 4; // they blend into the hair before the surface
  sc.cells.forEach((c, i) => {
    const k = ((t * 1.6 * rate + i * (L / sc.cells.length)) % L) / L;
    c.visible = a > 0.02;
    c.position.set(Math.sin(i * 2.1) * 0.35, SHAFT0 + 0.3 + k * L, 1.15);
    const s = (0.4 + 0.6 * clamp(k * 6)) * (1 - 0.6 * k) * clamp(a);
    c.scale.set(s, s * 0.8, s);
  });
}
function setBlood(t, a = 1) {
  sc.rbc.forEach((c, i) => {
    const u = (t * 0.045 + i / sc.rbc.length) % 1;
    const p = sc.vPath.getPointAt(u);
    c.position.set(p.x, p.y, p.z + 0.75);
    c.rotation.set(0.4 + i, t * 1.5 + i, 0);
    c.visible = a > 0.02;
  });
}
function setFood(t, a) {
  sc.food.forEach((c, i) => {
    const k = ((t * 0.7 + i / sc.food.length) % 1);
    c.visible = a > 0.02;
    c.position.set(Math.sin(i * 1.9) * 1.2 * (1 - k), lerp(-DEPTH - 4.2, -DEPTH - 1.2, k), 2.4);
    c.rotation.set(t * 2 + i, t * 3, 0);
    c.scale.setScalar(clamp(a) * (1 - 0.5 * k));
  });
}
function setSecond(t) {
  const s = sc.second;
  // old hair rises out of its follicle, then tips over and falls (gugur)
  const rise = easeInOut(inv(42.6, 43.9, t));
  const fall = easeIn(inv(44.2, 45.2, t));
  s.shaft.scale.y = 26 + DEPTH;
  s.shaft.position.set(lerp(0, 3, fall), SHAFT0 + 6 * rise + DEPTH * 0.8 * fall - 20 * fall * fall, lerp(0, 3, fall));
  s.shaft.rotation.set(0.2 * fall, 0, -1.3 * fall);
  s.shaft.visible = fall < 0.98;
  // new hair grows in from the same bulb
  const grow = easeOut(inv(45.4, 47.4, t));
  s.fresh.visible = grow > 0.001;
  s.fresh.scale.y = 0.01 + grow * (DEPTH + 5);
  s.bulbGlow.material.opacity = 0.9 * (inv(45.0, 45.4, t) * (1 - inv(47.4, 48.0, t)));
}
function resetScalp() {
  sc.cells.forEach((c) => (c.visible = false));
  sc.food.forEach((c) => (c.visible = false));
  sc.hero.bulbGlow.material.opacity = 0;
  sc.second.bulbGlow.material.opacity = 0;
  sc.second.shaft.visible = true;
  sc.second.shaft.position.set(0, SHAFT0, 0);
  sc.second.shaft.rotation.set(0, 0, 0);
  sc.second.shaft.scale.y = 26 + DEPTH;
  sc.second.fresh.visible = false;
}
function scalpFrame(t) {
  resetScalp();
  animMotes(t);
  setBlood(t);
  sc.shaggy(1);
}

// ================================================================== SHOTS
const SHOTS = [
  // H1 — "Alamak, rambut Affan dah panjang! Cucuk mata!"
  [0, 4.15, (t) => {
    const up = keys(t, [[0.15, 0], [0.5, 1], [2.6, 1], [2.9, 0.2]]);
    const poke = keys(t, [[2.85, 0], [3.1, 1], [3.9, 1], [4.15, 0.3]]);
    room.shaggy(1);
    roomAffan(t, {
      ...fringe(up, t), brow: lerp(0.2, -0.6, poke), smile: lerp(0.3, 0.05, poke), wow: keys(t, [[0.05, 0], [0.2, 0.7], [0.8, 0.7], [1.0, 0]]),
      blink: Math.max(blinkAt(t, 2), 0.75 * poke), headPitch: -0.08 * up + 0.08 * poke, headRoll: 0.06 * Math.sin(t * 4) * poke, lean: -0.05 * poke,
      ...(poke > 0.01 ? { armR: { reach: [lerp(-0.55, -0.22, poke), lerp(0.3, 1.5, poke), lerp(0.1, 0.85, poke)], pole: [-1, -0.6, -0.2], point: poke } } : {}),
    });
    const k = easeInOut(inv(0, 4.15, t));
    lookCam(V(lerp(1.2, 0.5, k), lerp(3.3, 3.15, k), lerp(8.0, 5.6, k)), V(0, lerp(2.6, 2.85, k), 0), 44);
    const q = pop(t, 0.2, 4.1);
    ov.tag('ep', 'EPISOD 18', { x: W / 2, y: 300, o: q.o, s: q.s }, { bg: PINK, small: true });
    const a = pop(t, 0.1, 2.0, { from: 2 });
    ov.bubble('alamak', 'ALAMAK!', { x: W / 2 + Math.sin(t * 30) * 4 * a.o, y: 520, o: a.o, s: a.s, r: -5 }, { size: 150, top: '#ffe0f0', bot: '#ff5aa8' });
    const p = pop(t, 2.0, 2.95);
    ov.bubble('panjang', 'PANJANG!', { x: W / 2, y: 520, o: p.o, s: p.s, r: 4 }, { size: 140 });
    const c = pop(t, 2.88, 4.1, { from: 2 });
    ov.bubble('cucuk', 'CUCUK MATA!', { x: W / 2, y: 520, o: c.o, s: c.s, r: -3 }, { size: 120, top: '#ffe0d6', bot: '#ff5a3d' });
    if (c.o > 0) ov.sparkles(t, { n: 8, seed: 3, x: 300, y: 650, w: 480, h: 200, a: c.o, colors: ['#ffffff', '#ffd84a'] });
    return room;
  }],
  // H2 — "Bulan lepas baru potong. Kenapa rambut kita makin tumbuh panjang, ya?"
  [4.15, 8.85, (t) => {
    const think = keys(t, [[6.0, 0], [6.4, 1]]);
    const th = POSES.thinkR.armR;
    room.shaggy(1);
    roomAffan(t, {
      brow: 0.6, smile: 0.5, headRoll: -0.12 * think, lookX: lerp(0.5, 0.35, think), lookY: 0.3, headYaw: lerp(0.35, 0.1, think),
      armR: think > 0.01 ? { reach: th.reach.map((v, i) => lerp([-0.55, 0.3, 0.1][i], v, think)), pole: th.pole, point: think, wx: th.wx * think } : undefined,
    });
    const k = easeInOut(inv(4.15, 8.85, t));
    lookCam(V(lerp(-1.6, -0.6, k), lerp(3.3, 3.0, k), lerp(7.0, 5.8, k)), V(0.3, 2.75, 0), 46);
    const cal = pop(t, 4.22, 6.1);
    ov.html('cal', CAL_SVG('1', 'BULAN LEPAS'), { x: 260, y: 560 + Math.sin(t * 3) * 8, o: cal.o, s: cal.s * 0.95, r: -8 });
    const sn = pop(t, 5.2, 6.1);
    ov.html('snip0', SCISSORS(0.5 + 0.5 * Math.sin(t * 14)), { x: 760, y: 560, o: sn.o, s: sn.s * 0.85, r: 20 });
    ov.tag('potong', 'BARU POTONG!', { x: 760, y: 700, o: sn.o, s: sn.s }, { bg: ORANGE, small: true });
    const head = scr(V(0, 2.95, 0));
    [[6.2, -280, -260, '#ffcf33', -12], [6.5, 270, -280, '#3fa2ff', 10], [7.5, 310, -60, '#ff8a3d', 14]].forEach(([at, dx, dy, c, r], i) => {
      const q = pop(t, at, 8.8);
      ov.html('qq' + i, ICONS.qmark(c), { x: head.x + dx, y: head.y + dy + Math.sin(t * 3 + i) * 10, o: q.o, s: q.s * 0.85, r });
    });
    const s = pop(t, 7.16, 8.8, { from: 2 });
    ov.bubble('kenapa', 'KENAPA MAKIN\nPANJANG?', { x: W / 2, y: 1140, o: s.o, s: s.s, r: -3 }, { size: 112, top: '#ffe0f0', bot: '#ff5aa8' });
    return room;
  }],
  // T — title + "Jom ikut Affan cari jawapan!" (swirl into the scalp)
  [8.85, 10.75, (t) => {
    const up = keys(t, [[8.95, 0], [9.3, 1]], easeOut);
    room.shaggy(1);
    roomAffan(t, { smile: 1, brow: 0.8, ...cheer(up), lookY: 0.15 });
    const k = easeOut(inv(8.85, 10.75, t));
    lookCam(V(0, lerp(3.4, 3.8, k), lerp(9.5, 11.5, k)), V(0, 2.6, 0), 46);
    const p = pop(t, 8.9, 10.7, { fin: 0.45 });
    ov.bubble('title', 'KENAPA RAMBUT\nKITA MAKIN\nTUMBUH PANJANG?', { x: W / 2, y: 580 + Math.sin(t * 3) * 6, o: p.o, s: p.s }, { size: 100, top: '#ffe0f0', bot: '#ff5aa8' });
    const q = pop(t, 8.95, 10.7);
    ov.tag('ep2', 'EPISOD 18', { x: W / 2, y: 300, o: q.o, s: q.s }, { bg: PINK, small: true });
    ov.swirl(t, W / 2, 900, inv(9.6, 10.75, t), 7);
    ov.flash(Math.pow(inv(10.35, 10.75, t), 2));
    return room;
  }],
  // G1 — "Waaah, hutan rambut!"
  [10.75, 13.3, (t) => {
    scalpFrame(t);
    setHero(t);
    const P = V(0, 0, -30);
    const wow = keys(t, [[10.8, 0], [11.0, 0.9], [11.5, 0.9], [11.7, 0]]);
    const up = keys(t, [[11.7, 0], [12.1, 1], [13.0, 1], [13.3, 0.4]], easeOut);
    const jump = t > 12.1 && t < 12.7 ? Math.sin(((t - 12.1) / 0.6) * Math.PI) * 0.35 : 0;
    scAffan(t, P, { wow, brow: 1, smile: 1, bob: jump, ...cheer(up), headPitch: -0.2, lookY: 0.45, yaw: 0.1 });
    const k = easeInOut(inv(10.75, 13.3, t));
    lookCam(V(lerp(2.5, -2.5, k), lerp(2.2, 3.4, k), lerp(-22.5, -19.5, k)), V(0, lerp(3.0, 6.5, k), -32), lerp(50, 60, k));
    ov.flash(1 - inv(10.75, 11.1, t));
    ov.sparkles(t, { n: 24, seed: 4, y: 300, h: 800, a: inv(10.8, 11.2, t) * (1 - inv(12.8, 13.3, t)) });
    const q = pop(t, 11.6, 13.25, { from: 2 });
    ov.bubble('hutan', 'HUTAN\nRAMBUT!', { x: W / 2, y: 470, o: q.o, s: q.s, r: -3 }, { size: 140, top: '#fff0d6', bot: '#c07a3a' });
    return sc;
  }],
  // F1 — "Setiap helai rambut tumbuh dari satu lubang kecil bawah kulit. Namanya folikel."
  [13.3, 19.38, (t) => {
    scalpFrame(t);
    setHero(t);
    const pt = keys(t, [[14.0, 0], [14.4, 1], [16.2, 1], [16.5, 0]]);
    scAffan(t, STAND, { smile: 0.9, brow: 0.5, yaw: 0.7, headYaw: 0.1, lookX: 0.3, lookY: 0.1, ...pointAt(pt, 'L', [0.9, 0.9, 0.5]) });
    // close on the pore, then crane down the cut face to reveal the follicle
    const d = easeInOut(inv(16.5, 18.2, t));
    const k = easeInOut(inv(13.3, 16.5, t));
    const pos = V(lerp(-1.5, 1.5, k), lerp(4.0, 3.2, k), lerp(11, 9.5, k));
    const look = V(-2.0, lerp(2.4, 1.4, k), -1.5);
    lookCam(pos.lerp(V(1, -6.5, 30), d), look.lerp(V(0, -7.5, 0), d), lerp(50, 52, d));
    ov.flash((1 - inv(13.3, 13.6, t)) * 0.8);
    const pore = scr(V(0, 0.2, 0));
    const lb = pop(t, 15.92, 17.5);
    ring(pore.x, pore.y, 70 + 6 * Math.sin(t * 6), lb.o);
    ov.tag('lubang', 'LUBANG KECIL', { x: pore.x - 40, y: pore.y - 150, o: lb.o, s: lb.s }, { bg: ORANGE, pointer: 'down' });
    const bw = pop(t, 16.64, 19.33);
    const sk = scr(V(14, -0.7, 0));
    ov.tag('kulit', 'KULIT', { x: Math.min(930, sk.x), y: sk.y + 70, o: bw.o * d, s: bw.s }, { bg: '#e8916a', small: true });
    // the follicle: dashed outline round the pocket
    const fol = scr(V(0, -8, 1));
    const fo = pop(t, 18.4, 19.33, { from: 2 });
    const g = ov.g;
    if (fo.o > 0) {
      const a = scr(V(-2.6, 0, 2)), b = scr(V(2.6, -DEPTH - 3.8, 2));
      g.save();
      g.globalAlpha = fo.o;
      g.strokeStyle = '#ff9ad0';
      g.shadowColor = '#ff9ad0';
      g.shadowBlur = 30;
      g.lineWidth = 12;
      g.setLineDash([26, 16]);
      g.beginPath();
      g.roundRect(a.x, a.y, b.x - a.x, b.y - a.y, 80);
      g.stroke();
      g.restore();
    }
    ov.bubble('folikel', 'FOLIKEL!', { x: W / 2, y: 470, o: fo.o, s: fo.s, r: -3 }, { size: 150, top: '#ffe6f4', bot: '#ff5aa8' });
    ov.tag('fol2', '← FOLIKEL', { x: fol.x + 270, y: fol.y, o: fo.o, s: fo.s }, { bg: PINK, small: true });
    return sc;
  }],
  // F2 — "Kat bawah folikel, ada kilang kecil yang buat sel baru setiap hari.
  //       Sel baru tolak sel lama ke atas. Sebab tu rambut makin panjang!"
  [19.38, 28.85, (t) => {
    scalpFrame(t);
    setHero(t);
    const cellsOn = inv(21.9, 22.4, t);
    setCells(t, cellsOn, 1 + inv(24, 25, t));
    sc.hero.bulbGlow.material.opacity = 0.9 * inv(20.6, 21.2, t) * (0.85 + 0.15 * Math.sin(t * 6));
    const watch = keys(t, [[26.6, 0], [27.0, 1]]);
    scAffan(t, STAND, { smile: 1, brow: 0.7, yaw: 0.6, headPitch: lerp(0.35, -0.3, watch), lookY: lerp(-0.6, 0.6, watch), lookX: 0.3, wow: keys(t, [[27.9, 0], [28.1, 0.6], [28.6, 0.6], [28.85, 0]]),
      ...(watch > 0.01 ? cheer(keys(t, [[27.9, 0], [28.3, 1]])) : {}) });
    // down to the bulb, follow the cells up, then tilt up to the hair above the skin
    const k1 = easeInOut(inv(19.38, 21.0, t));
    const k2 = easeInOut(inv(24.0, 26.4, t));
    const k3 = easeInOut(inv(26.4, 27.8, t));
    let pos = V(1, -6.5, 30).lerp(V(2.5, -DEPTH + 1, 17), k1);
    let look = V(0, -7.5, 0).lerp(V(0, -DEPTH + 0.5, 0), k1);
    pos.lerp(V(2.5, -6, 19), k2);
    look.lerp(V(0, -6, 0), k2);
    pos.lerp(V(-2, -3, 32), k3);
    look.lerp(V(0, 7, 0), k3);
    lookCam(pos, look, 50);
    const bulb = scr(V(0, -DEPTH - 0.8, 2.6));
    const kl = pop(t, 20.96, 24.0, { from: 2 });
    const fx = Math.min(W - 210, bulb.x + 300);
    ov.html('factory', FACTORY, { x: fx, y: bulb.y - 200, o: kl.o, s: kl.s * 0.75, r: 6 });
    ov.tag('kilang', 'KILANG KECIL', { x: fx, y: bulb.y - 60, o: kl.o, s: kl.s }, { bg: ORANGE });
    ov.html('gear1', GEAR(t * 120), { x: bulb.x - 250, y: bulb.y - 130, o: kl.o, s: kl.s * 0.7 });
    ov.html('gear2', GEAR(-t * 160, '#8fe39a'), { x: bulb.x - 160, y: bulb.y - 220, o: kl.o, s: kl.s * 0.45 });
    const sb = pop(t, 22.16, 24.0);
    ov.tag('selbaru', 'SEL BARU!', { x: bulb.x - 210, y: bulb.y + 120, o: sb.o, s: sb.s }, { bg: GREEN });
    const sh = pop(t, 22.8, 24.0);
    ov.html('cal2', CAL_SVG('✓', 'SETIAP HARI'), { x: fx, y: bulb.y + 120, o: sh.o, s: sh.s * 0.6, r: -6 });
    // "push up": arrows beside the shaft
    const tl = pop(t, 24.72, 26.5);
    for (let i = 0; i < 3; i++) {
      const p = scr(V(2.8, -DEPTH + 4 + i * 3.4 + ((t * 2.2) % 3.4), 1));
      ov.html('up' + i, UP_ARROW(), { x: p.x + 40, y: p.y, o: tl.o, s: tl.s * 0.45 });
    }
    ov.tag('tolak', 'TOLAK KE ATAS!', { x: W / 2, y: 470, o: tl.o, s: tl.s }, { bg: GREEN });
    const lm = pop(t, 25.2, 26.5);
    const old = scr(V(-1.2, -3, 1));
    ov.tag('lama', 'SEL LAMA', { x: old.x - 170, y: old.y, o: lm.o, s: lm.s }, { bg: BROWN, small: true });
    // the hair above the skin gets longer
    const mp = pop(t, 27.96, 28.8, { from: 2 });
    const tip = scr(V(0, heroTop(t), 0));
    ov.bubble('makin', 'MAKIN\nPANJANG!', { x: W / 2, y: 1150, o: mp.o, s: mp.s, r: -3 }, { size: 130 });
    if (k3 > 0.5) ov.html('upTip', UP_ARROW('#ffd84a'), { x: tip.x + 120, y: Math.max(330, tip.y + 120 + Math.sin(t * 6) * 10), o: inv(27.0, 27.4, t) * (1 - inv(28.6, 28.85, t)), s: 0.6 });
    return sc;
  }],
  // B — "Darah pula hantar makanan, supaya kilang ni terus bekerja."
  [28.85, 33.0, (t) => {
    scalpFrame(t);
    setHero(t);
    setCells(t, 1, 1.4);
    setFood(t, inv(29.6, 30.2, t));
    sc.hero.bulbGlow.material.opacity = 0.95 * (0.85 + 0.15 * Math.sin(t * 8));
    const k = easeInOut(inv(28.85, 33.0, t));
    lookCam(V(lerp(-5, 3, k), lerp(-DEPTH + 1, -DEPTH + 2, k), lerp(27, 24, k)), V(0, -DEPTH - 2.5, 0), 50);
    ov.flash((1 - inv(28.85, 29.15, t)) * 0.7);
    const dr = pop(t, 28.85, 32.95, { from: 2 });
    const ves = scr(V(-9, -21.2, 1.5));
    ov.html('drop', DROP_SVG, { x: 230, y: 430 + Math.sin(t * 4) * 8, o: dr.o, s: dr.s * 0.8 });
    ov.tag('darah', 'DARAH', { x: 230, y: 570, o: dr.o, s: dr.s }, { bg: RED });
    ring(ves.x, ves.y, 60 + 5 * Math.sin(t * 6), dr.o * (1 - inv(30.6, 31.0, t)), '#ff8a8a');
    const mk = pop(t, 29.9, 32.95);
    ov.html('foodI', SPARK_FOOD, { x: 800, y: 430 + Math.sin(t * 4 + 1) * 8, o: mk.o, s: mk.s * 0.9 });
    ov.tag('makanan', 'HANTAR MAKANAN', { x: 800, y: 570, o: mk.o, s: mk.s }, { bg: ORANGE });
    const tb = pop(t, 31.84, 32.95, { from: 2 });
    ov.html('gear3', GEAR(t * 220), { x: 180, y: 1120, o: tb.o, s: tb.s * 0.8 });
    ov.html('gear4', GEAR(-t * 260, '#8fe39a'), { x: 900, y: 1120, o: tb.o, s: tb.s * 0.7 });
    ov.bubble('kerja', 'TERUS\nBEKERJA!', { x: W / 2, y: 1150, o: tb.o, s: tb.s, r: -3 }, { size: 120, top: '#fff3a0', bot: '#ff9a1f' });
    return sc;
  }],
  // K — "Rambut yang kita nampak tu dah tak hidup. Sebab tu potong rambut tak sakit langsung!"
  [33.0, 38.2, (t) => {
    scalpFrame(t);
    const snip = inv(36.45, 37.6, t);
    setHero(t, { snip: t > 36.45 ? snip : -1 });
    sc.hero.bulbGlow.material.opacity = 0.8 * inv(33.2, 33.6, t) * (1 - inv(35.5, 35.9, t));
    const laugh = keys(t, [[37.0, 0], [37.3, 1]]);
    scAffan(t, STAND, { smile: 1, brow: 0.6 + 0.3 * laugh, yaw: 0.5, headYaw: 0.15, lookX: 0.3, lookY: 0.3, bob: 0.05 * Math.abs(Math.sin(t * 12)) * laugh,
      ...(laugh > 0.01 ? { armR: { ...POSES.thumbsUpR.armR, thumb: laugh } } : {}) });
    const k = easeInOut(inv(33.0, 38.2, t));
    lookCam(V(lerp(3, -1, k), lerp(-3, 2.5, k), lerp(34, 26, k)), V(0, lerp(-3, 4, k), 0), 52);
    ov.flash((1 - inv(33.0, 33.3, t)) * 0.7);
    const shaft = scr(V(0, 13, 0));
    const th = pop(t, 34.6, 36.4);
    ov.tag('takhidup', 'TAK HIDUP', { x: shaft.x + 200, y: shaft.y, o: th.o, s: th.s }, { bg: GREY });
    const bulb = scr(V(0, -DEPTH - 0.6, 2.6));
    const hd = pop(t, 33.4, 35.9);
    ov.tag('hidup', 'HIDUP', { x: bulb.x + 180, y: bulb.y, o: hd.o, s: hd.s }, { bg: GREEN, small: true });
    // scissors close on the hair at the cut line
    const cutP = scr(V(0, sc.cutY, 0));
    const sc1 = pop(t, 35.7, 37.4);
    const close = keys(t, [[35.7, 1], [36.2, 1], [36.45, 0], [36.8, 0.6]]);
    ov.html('snip', SCISSORS(close), { x: cutP.x + lerp(330, 100, easeOut(inv(35.7, 36.3, t))), y: cutP.y, o: sc1.o, s: sc1.s * 1.3, r: 180 });
    const st = inv(36.45, 36.85, t);
    if (st > 0 && st < 1) ov.star(cutP.x, cutP.y, 90 * st, 1 - st, '#fff6c8', t);
    const ts = pop(t, 36.88, 38.15, { from: 2.2 });
    ov.bubble('taksakit', 'TAK SAKIT!', { x: W / 2, y: 470, o: ts.o, s: ts.s, r: -3 }, { size: 150, top: '#e8ffd8', bot: '#3fb34a' });
    return sc;
  }],
  // S — "Rambut tumbuh lebih kurang satu sentimeter setiap bulan."
  [38.2, 42.1, (t) => {
    scalpFrame(t);
    setHero(t);
    const pt = keys(t, [[38.4, 0], [38.8, 1]]);
    scAffan(t, STAND, { smile: 1, brow: 0.7, yaw: 0.4, lookX: 0.2, lookY: 0.15, ...pointAt(pt, 'L', [0.85, 1.6, 0.3]) });
    const k = easeInOut(inv(38.2, 42.1, t));
    lookCam(V(lerp(-10, -8, k), lerp(4.5, 4.0, k), lerp(14, 12, k)), V(-2, lerp(4.2, 3.6, k), -2), 50);
    ov.flash((1 - inv(38.2, 38.5, t)) * 0.7);
    const o = clamp(inv(38.4, 38.8, t));
    panel(170, 560, 740, 640, 0.85 * o);
    ov.html('ruler', RULER_PANEL(easeInOut(inv(39.6, 41.2, t))), { x: W / 2, y: 900, o, s: 0.8 + 0.2 * o });
    const cm = pop(t, 40.32, 42.05, { from: 2 });
    ov.bubble('cm', '1 CM', { x: W / 2, y: 420, o: cm.o, s: cm.s, r: -3 }, { size: 160, top: '#e6f4ff', bot: '#2f9bff' });
    const lk = pop(t, 39.28, 42.05);
    ov.tag('lk', 'LEBIH KURANG', { x: W / 2, y: 290, o: lk.o, s: lk.s }, { bg: PURPLE, small: true });
    const sb = pop(t, 41.04, 42.05);
    ov.html('cal3', CAL_SVG('1', 'BULAN'), { x: 830, y: 1110, o: sb.o, s: sb.s * 0.7, r: 8 });
    ov.tag('setiap', 'SETIAP BULAN', { x: W / 2, y: 1270, o: sb.o, s: sb.s }, { bg: BLUE });
    return sc;
  }],
  // G — "Lepas beberapa tahun, rambut lama gugur, dan rambut baru tumbuh ganti.
  //      Gugur sikit setiap hari tu normal, tau!"
  [42.1, 50.5, (t) => {
    scalpFrame(t);
    setHero(t);
    setSecond(t);
    const laugh = keys(t, [[47.0, 0], [47.4, 1]]);
    scAffan(t, V(10, 0, -2.8), { smile: 1, brow: 0.6, yaw: lerp(-0.3, 0.1, laugh), headYaw: -0.1, lookX: -0.2, lookY: 0.3, bob: 0.05 * Math.abs(Math.sin(t * 13)) * keys(t, [[47.6, 0], [47.8, 1], [48.6, 1], [48.8, 0]]),
      wow: keys(t, [[44.3, 0], [44.5, 0.7], [44.9, 0.7], [45.1, 0]]), ...(laugh > 0.01 ? { armR: { ...POSES.thumbsUpR.armR, thumb: laugh } } : {}) });
    const k = easeInOut(inv(42.1, 47.5, t));
    const k2 = easeInOut(inv(47.5, 48.6, t));
    const pos = V(lerp(19, 18, k), lerp(-4, -2, k), lerp(33, 30, k)).lerp(V(15, 3.6, 9), k2);
    const look = V(17, lerp(-4, -1, k), 0).lerp(V(10, 2.6, -2.8), k2);
    lookCam(pos, look, 52);
    ov.flash((1 - inv(42.1, 42.4, t)) * 0.7);
    const bt = pop(t, 42.13, 44.2);
    const yr = Math.min(5, 1 + Math.floor(inv(42.3, 43.8, t) * 5));
    ov.html('years', CAL_SVG(String(yr), 'TAHUN'), { x: 230, y: 470, o: bt.o, s: bt.s * 0.8, r: -8 });
    ov.tag('beberapa', 'BEBERAPA TAHUN', { x: 230, y: 610, o: bt.o, s: bt.s }, { bg: PURPLE, small: true });
    const gg = pop(t, 44.28, 45.6, { from: 2 });
    ov.bubble('gugur', 'GUGUR!', { x: 700, y: 470, o: gg.o, s: gg.s, r: 6 }, { size: 140, top: '#f0e6ff', bot: '#8a5cff' });
    const nb = pop(t, 45.6, 47.4);
    const fb = scr(V(17, -DEPTH + 3, 1));
    ov.tag('baru', 'RAMBUT BARU!', { x: fb.x - 220, y: fb.y, o: nb.o, s: nb.s }, { bg: GREEN });
    if (nb.o > 0) ov.html('upNew', UP_ARROW(), { x: fb.x + 120, y: fb.y - 40 + Math.sin(t * 6) * 10, o: nb.o, s: nb.s * 0.5 });
    // "it's normal"
    const nm = pop(t, 49.2, 50.45, { from: 2 });
    ov.html('check', CHECK, { x: 230, y: 470, o: nm.o, s: nm.s * 0.85 });
    ov.bubble('normal', 'NORMAL!', { x: 640, y: 470, o: nm.o, s: nm.s, r: -3 }, { size: 140, top: '#e8ffd8', bot: '#3fb34a' });
    const sk = pop(t, 47.65, 50.45);
    ov.tag('sikit', 'GUGUR SIKIT SETIAP HARI', { x: W / 2, y: 320, o: sk.o, s: sk.s }, { bg: PURPLE, small: true });
    return sc;
  }],
  // R — "Waaah, rupanya ada kilang rambut atas kepala kita!"
  [50.5, 54.2, (t) => {
    scalpFrame(t);
    setHero(t);
    setCells(t, 1, 1.2);
    sc.hero.bulbGlow.material.opacity = 0.9;
    const up = keys(t, [[50.6, 0], [50.95, 1], [53.6, 1], [54.0, 0.5]], easeOut);
    const jump = t > 50.7 && t < 51.3 ? Math.sin(((t - 50.7) / 0.6) * Math.PI) * 0.35 : 0;
    scAffan(t, STAND, { smile: 1, brow: 0.9, bob: jump, wow: keys(t, [[50.6, 0], [50.8, 0.8], [51.3, 0.8], [51.5, 0]]), yaw: 0.3, lookY: 0.2, ...cheer(up) });
    const k = easeOut(inv(50.5, 54.2, t));
    lookCam(V(lerp(-2, 4, k), lerp(-1, -4, k), lerp(26, 36, k)), V(-1, lerp(-1, -4, k), 0), 52);
    ov.flash((1 - inv(50.5, 50.8, t)) * 0.9);
    ov.sparkles(t, { n: 26, seed: 31, y: 260, h: 700, a: inv(50.6, 51.0, t) });
    const kf = pop(t, 52.08, 54.15, { from: 2 });
    ov.html('factory2', FACTORY, { x: 230, y: 1080, o: kf.o, s: kf.s * 0.75, r: -6 });
    ov.html('gear5', GEAR(t * 140), { x: 880, y: 1060, o: kf.o, s: kf.s * 0.75 });
    ov.bubble('kilangR', 'KILANG\nRAMBUT!', { x: W / 2, y: 470, o: kf.o, s: kf.s, r: -3 }, { size: 140, top: '#fff3a0', bot: '#ff9a1f' });
    return sc;
  }],
  // E — "Makan telur, ikan dan sayur, supaya rambut sihat!" (home, hair cut neat)
  [54.2, 57.8, (t) => {
    room.shaggy(0);
    const th = keys(t, [[56.4, 0], [56.75, 1]]);
    roomAffan(t, { smile: 1, brow: 0.7, headPitch: 0.03, lookY: 0.1, ...(th > 0.01 ? { armR: { ...POSES.thumbsUpR.armR, thumb: th } } : {}),
      ...(t < 55.0 ? { armL: { reach: [0.4, 1.55, 0.5], pole: [1, -0.6, -0.2] } } : {}) });
    const k = easeInOut(inv(54.2, 57.8, t));
    lookCam(V(lerp(-1.0, -0.4, k), lerp(3.2, 3.0, k), lerp(7.2, 6.2, k)), V(0, 2.55, 0), 46);
    ov.flash((1 - inv(54.2, 54.5, t)) * 0.9);
    ov.sparkles(t, { n: 14, seed: 12, x: 280, y: 380, w: 520, h: 400, a: 1 - inv(54.6, 55.3, t) });
    const km = pop(t, 54.25, 55.3);
    ov.tag('kemas', 'DAH KEMAS!', { x: 780, y: 420, o: km.o, s: km.s }, { bg: BLUE, small: true });
    [[54.56, EGG_SVG, 'TELUR', 165, 760, 0.8], [55.2, FISH_SVG, 'IKAN', 915, 900, 0.8], [55.84, BROC_SVG, 'SAYUR', 165, 1080, 0.8]].forEach(([at, svg, name, x, y, sz], i) => {
      const q = pop(t, at, 57.75);
      ov.html('food' + i, svg, { x, y: y + Math.sin(t * 4 + i) * 8, o: q.o, s: q.s * sz * 1.4, r: (i - 1) * 8 });
      ov.tag('foodT' + i, name, { x, y: y + 120, o: q.o, s: q.s }, { bg: [ORANGE, BLUE, GREEN][i], small: true });
    });
    const rs = pop(t, 56.8, 57.75, { from: 2 });
    ov.bubble('sihat', 'RAMBUT\nSIHAT!', { x: W / 2, y: 470, o: rs.o, s: rs.s, r: -3 }, { size: 130, top: '#e8ffd8', bot: '#3fb34a' });
    return room;
  }],
  // C — "Rambut korang panjang ke pendek? Komen kat bawah!"
  [57.8, 61.0, (t) => {
    room.shaggy(0);
    const ptV = keys(t, [[57.9, 0], [58.25, 1], [59.5, 1], [59.8, 0]]);
    const down = keys(t, [[59.7, 0], [60.05, 1]]);
    roomAffan(t, {
      smile: 1, brow: 0.6, headRoll: -0.08 * ptV, headPitch: 0.15 * down, lookY: 0.1 - 0.5 * down,
      armR: ptV > 0.01 ? { reach: [lerp(-0.55, -0.3, ptV), lerp(0.3, 1.05, ptV), lerp(0.1, 1.0, ptV)], point: ptV, pole: [-1, -0.6, -0.3] }
        : down > 0.01 ? { reach: [lerp(-0.55, -0.5, down), lerp(0.3, 0.45, down), lerp(0.1, 1.05, down)], point: down, pole: [-1, -0.6, -0.3], wx: 0.9 * down } : undefined,
    });
    const k = easeInOut(inv(57.8, 61.0, t));
    lookCam(V(lerp(1.0, 0.6, k), lerp(3.1, 3.0, k), lerp(6.6, 5.8, k)), V(0, 2.65, 0), 46);
    const pj = pop(t, 58.76, 60.9);
    ov.tag('pj', 'PANJANG?', { x: 250, y: 620, o: pj.o, s: pj.s, r: -6 }, { bg: PINK });
    const pd = pop(t, 59.2, 60.9);
    ov.tag('pd', 'PENDEK?', { x: 830, y: 620, o: pd.o, s: pd.s, r: 6 }, { bg: BLUE });
    const c = pop(t, 59.81, 60.95);
    ov.html('cIcon', COMMENT_SVG, { x: 870, y: 1110, o: c.o, s: c.s * 0.9, r: 6 });
    ov.tag('komen', 'KOMEN DI BAWAH!', { x: W / 2, y: 1220, o: c.o, s: c.s }, { bg: ORANGE });
    if (c.o > 0) ov.html('dArr', DOWN_ARROW, { x: W / 2, y: 1330 + Math.abs(Math.sin(t * 6)) * 20, o: c.o, s: 0.55 * c.s });
    return room;
  }],
  // Outro — The Curious Affan logo
  [61.0, DURATION, (t) => {
    const k = easeOut(inv(61.0, 61.7, t));
    outro.aff.root.position.set(0, 0, 0);
    const th2 = POSES.thinkR.armR;
    outro.aff.pose({ ...POSES.thinkR, armR: { ...th2 }, smile: 1, blink: blinkAt(t, 9), headRoll: -0.08, lookX: 0.25, lookY: 0.15, headYaw: 0.08,
      armL: { reach: [0.9, 0.55, 0.45], pole: [1, -0.8, 0], wx: -0.3 } });
    const hl = handW(outro.aff, 'L');
    outro.held.position.set(hl.x - 0.02, hl.y + 0.12, hl.z + 0.05);
    lookCam(V(0, 2.6, lerp(7.5, 5.4, k)), V(0, 2.3, 0), 40);
    const hc = scr(V(0, 2.95, 0));
    ov.flash((1 - inv(61.0, 61.35, t)) * 1.0);
    const g = ov.g;
    const ra = inv(61.1, 61.7, t);
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
    const ic = pop(t, 61.6, 99);
    ov.html('oSnip', SCISSORS(0.6), { x: 190, y: 470 + Math.sin(t * 2) * 8, o: ic.o, s: ic.s * 0.6, r: -24 });
    ov.html('oQ1', ICONS.qmark('#ffcf33'), { x: 880, y: 420 + Math.sin(t * 2 + 1) * 8, o: ic.o, s: ic.s * 0.9, r: 12 });
    ov.html('oEgg', EGG_SVG, { x: 210, y: 760 + Math.sin(t * 2 + 2) * 8, o: ic.o, s: ic.s * 0.45, r: -12 });
    const l1 = pop(t, 61.3, 99), l2 = pop(t, 61.5, 99), l3 = pop(t, 61.7, 99);
    drawLogo(ov, { k: [l1, l2, l3], star: pop(t, 61.9, 99) });
    return outro;
  }],
];

function frame(t) {
  ov.begin();
  cam.aspect = W / H;
  cam.updateProjectionMatrix();
  const shot = SHOTS.find(([a, b]) => t >= a && t < b) || SHOTS[SHOTS.length - 1];
  const world = shot[2](t);
  renderer.render(world.scene, cam);
  if (world !== outro) ov.vignette(0.22);
  ov.captions(t, CAPTIONS, KEYWORDS);
  ov.end();
}

// Cover / thumbnail (9:16): Affan in his room with his long fringe poking his
// eyes, pushing it up in surprise, under a big title; scissors, a ruler-style
// growth arrow, question marks, the episode badge and the series logo. No
// captions. Key elements stay inside the centre 3:4 area (y 240-1680).
const THUMB = { x: 0.5, y: 3.15, z: 5.4, ly: 2.75, fov: 44 };
window.setThumb = (o) => Object.assign(THUMB, o);
function thumbnail() {
  ov.begin();
  cam.aspect = W / H;
  cam.updateProjectionMatrix();
  room.shaggy(1.08);
  roomAffan(0, { blink: 0, talk: 0, ...fringe(1), wow: 0.85, brow: 1, smile: 0, headPitch: -0.06, headRoll: 0.05, lookY: 0.35, lookX: 0.1 });
  lookCam(V(THUMB.x, THUMB.y, THUMB.z), V(0, THUMB.ly, 0), THUMB.fov);
  renderer.render(room.scene, cam);
  const g = ov.g;
  const top = g.createLinearGradient(0, 0, 0, 900);
  top.addColorStop(0, 'rgba(40,20,60,0.65)');
  top.addColorStop(1, 'rgba(40,20,60,0)');
  g.fillStyle = top;
  g.fillRect(0, 0, W, 900);
  const bot = g.createLinearGradient(0, H - 800, 0, H);
  bot.addColorStop(0, 'rgba(40,20,60,0)');
  bot.addColorStop(1, 'rgba(40,20,60,0.75)');
  g.fillStyle = bot;
  g.fillRect(0, H - 800, W, 800);
  ov.vignette(0.25);
  ov.tag('thBadge', 'EPISOD 18', { x: W / 2, y: 300 }, { bg: PINK, small: true });
  ov.bubble('thTitle', 'KENAPA RAMBUT\nMAKIN PANJANG?', { x: W / 2, y: 500, r: -2 }, { size: 112, top: '#ffe0f0', bot: '#ff5aa8' });
  ov.html('thSnip', SCISSORS(0.8), { x: 160, y: 1060, r: -30, s: 0.9 });
  ov.html('thUp', UP_ARROW('#ffd84a'), { x: 930, y: 1000, s: 0.8, r: 8 });
  ov.html('thQ', ICONS.qmark('#3fa2ff'), { x: 930, y: 800, s: 0.75, r: 12 });
  drawLogo(ov, { y: 1440, scale: 0.5 });
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
