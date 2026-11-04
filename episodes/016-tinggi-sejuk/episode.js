// THE CURIOUS AFFAN — Episode 016: "Kenapa Semakin Tinggi Semakin Sejuk?"
// Every shot is a pure function of time t (seconds), synced to audio/narration.mp3.
//
// Science: being on a mountain does not bring us meaningfully closer to the
// Sun (~150 million km away). Sunlight warms the ground first, and the warm
// ground warms the air above it, so the warmest air is near the ground. Air
// that rises expands (there is less air pressing on it higher up), and
// expanding air cools. On average the air gets ~6.5 °C cooler per km of
// height ("lebih kurang 6 darjah"): Kuala Lumpur ~32 °C, Cameron Highlands
// (~1,500 m) ~20 °C, the summit of Gunung Kinabalu (4,095 m) can be near 0 °C.
import * as THREE from 'three';
import { makeRenderer, loadEnvelope, toScreen, clamp, lerp, inv, easeOut, easeInOut, keys, wobble, W, H } from '../../shared/core.js';
import { POSES, blinkAt } from '../../shared/affan.js';
import { Overlay, pop, ICONS, drawLogo } from '../../shared/overlay.js';
import { CAPTIONS, KEYWORDS } from './captions.js';
import { buildTea, buildValley, buildOutro, balloonPos, landY, KM, PEAK, MTN } from './worlds.js';

const FPS = 30;
const DURATION = 68.4;

const stage = document.getElementById('stage');
const canvas = document.createElement('canvas');
stage.appendChild(canvas);
const renderer = makeRenderer(canvas);
const ov = new Overlay(stage);
const tea = buildTea();
const val = buildValley();
const outro = buildOutro();
const cam = new THREE.PerspectiveCamera(50, W / H, 0.05, 6000);
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
const BLUE = '#2f7bff', GREEN = '#2fb35a', ORANGE = '#ff8a3d', RED = '#ff5a3d', ICE = '#1f9bd6', PURPLE = '#8a5cff';

// ----------------------------------------------------------------- icons
const SNOW = (c = '#dff4ff') => `<svg width="160" height="160" viewBox="-80 -80 160 160"><g stroke="#17256b" stroke-width="22" stroke-linecap="round">${[0, 60, 120].map((a) => `<line x1="0" y1="-62" x2="0" y2="62" transform="rotate(${a})"/>`).join('')}</g><g stroke="${c}" stroke-width="11" stroke-linecap="round" fill="none">${[0, 60, 120].map((a) => `<g transform="rotate(${a})"><line x1="0" y1="-62" x2="0" y2="62"/><polyline points="-16,-48 0,-34 16,-48"/><polyline points="-16,48 0,34 16,48"/></g>`).join('')}</g></svg>`;
const SUN_SVG = `<svg width="200" height="200" viewBox="-100 -100 200 200"><g stroke="#ffb21f" stroke-width="14" stroke-linecap="round">${Array.from({ length: 10 }, (_, i) => `<line x1="0" y1="-72" x2="0" y2="-92" transform="rotate(${i * 36})"/>`).join('')}</g><circle r="56" fill="#ffd84a" stroke="#17256b" stroke-width="10"/><circle cx="-18" cy="-6" r="7" fill="#17256b"/><circle cx="18" cy="-6" r="7" fill="#17256b"/><path d="M-20 16 Q0 34 20 16" fill="none" stroke="#17256b" stroke-width="8" stroke-linecap="round"/></svg>`;
const STOVE_SVG = `<svg width="260" height="250" viewBox="0 0 260 250"><g stroke="#17256b" stroke-width="9" stroke-linejoin="round">
  <path d="M60 40 Q80 10 100 40 M115 30 Q135 0 155 30 M170 40 Q190 10 210 40" fill="none" stroke="#bfe8ff" stroke-width="8" stroke-linecap="round"/>
  <rect x="45" y="55" width="170" height="80" rx="14" fill="#9fb3d6"/><rect x="25" y="52" width="210" height="18" rx="9" fill="#7f93b8"/>
  <path d="M90 175 Q100 140 112 160 Q122 130 132 160 Q142 140 152 175 Z" fill="#ff8a3d"/><path d="M110 175 Q120 155 130 175 Z" fill="#ffd84a"/>
  <rect x="20" y="175" width="220" height="60" rx="12" fill="#e8eef8"/><circle cx="70" cy="205" r="12" fill="#ff5a3d"/><circle cx="190" cy="205" r="12" fill="#ff5a3d"/></g></svg>`;
const JACKET_SVG = `<svg width="230" height="220" viewBox="0 0 230 220"><g stroke="#17256b" stroke-width="10" stroke-linejoin="round">
  <path d="M75 20 L115 45 L155 20 L205 45 L222 140 L188 148 L180 95 L180 205 L50 205 L50 95 L42 148 L8 140 L25 45 Z" fill="#26346f"/>
  <path d="M75 20 Q115 70 155 20" fill="#ffb38a"/><line x1="115" y1="45" x2="115" y2="205" stroke="#fff" stroke-width="8"/>
  <path d="M50 120 H180" stroke="#ffb38a" stroke-width="12"/><path d="M50 140 H180" stroke="#ffffff" stroke-width="8"/></g></svg>`;
const COMMENT_SVG = `<svg width="170" height="150" viewBox="0 0 170 150"><path d="M20 15 H150 Q160 15 160 25 V95 Q160 105 150 105 H75 L40 138 V105 H20 Q10 105 10 95 V25 Q10 15 20 15 Z" fill="#ffffff" stroke="#17256b" stroke-width="10" stroke-linejoin="round"/><circle cx="52" cy="60" r="10" fill="#2f7bff"/><circle cx="85" cy="60" r="10" fill="#2f7bff"/><circle cx="118" cy="60" r="10" fill="#2f7bff"/></svg>`;
const DOWN_ARROW = `<svg width="120" height="150" viewBox="0 0 120 150"><path d="M40 10 H80 V80 H110 L60 140 L10 80 H40 Z" fill="#ffd84a" stroke="#17256b" stroke-width="10" stroke-linejoin="round"/></svg>`;
const UP_ARROW = (c) => `<svg width="110" height="150" viewBox="0 0 110 150"><path d="M38 140 H72 V70 H100 L55 10 L10 70 H38 Z" fill="${c}" stroke="#fff" stroke-width="10" stroke-linejoin="round"/></svg>`;
// Thermometer: k = fill 0..1, c = liquid colour.
function THERM(k, c) {
  const top = 30, bot = 190, y = lerp(bot, top + 10, clamp(k));
  return `<svg width="110" height="260" viewBox="0 0 110 260"><rect x="33" y="12" width="44" height="200" rx="22" fill="#ffffff" stroke="#17256b" stroke-width="10"/>
    <rect x="45" y="${y.toFixed(1)}" width="20" height="${(212 - y).toFixed(1)}" rx="10" fill="${c}"/><circle cx="55" cy="215" r="34" fill="${c}" stroke="#17256b" stroke-width="10"/>
    <g stroke="#17256b" stroke-width="5">${[60, 95, 130, 165].map((v) => `<line x1="77" y1="${v}" x2="92" y2="${v}"/>`).join('')}</g><ellipse cx="46" cy="205" rx="8" ry="11" fill="#fff" opacity="0.7"/></svg>`;
}
// temperature -> thermometer colour and fill
const tCol = (c) => (c >= 28 ? RED : c >= 22 ? ORANGE : c >= 12 ? GREEN : ICE);
const tFill = (c) => clamp((c + 5) / 40);

function panel(x, y, w, h, a = 0.78, r = 46) {
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
function label(text, x, y, { size = 44, color = '#fff', a = 1, align = 'center' } = {}) {
  const g = ov.g;
  g.save();
  g.globalAlpha = clamp(a);
  g.font = `800 ${size}px "Baloo 2"`;
  g.textAlign = align;
  g.textBaseline = 'middle';
  g.lineJoin = 'round';
  g.strokeStyle = 'rgba(10,14,40,0.85)';
  g.lineWidth = size * 0.22;
  g.strokeText(text, x, y);
  g.fillStyle = color;
  g.fillText(text, x, y);
  g.restore();
}
// falling snowflakes on the fx canvas
function snowfall(t, a, n = 40, seed = 3) {
  if (a <= 0) return;
  const g = ov.g;
  g.save();
  for (let i = 0; i < n; i++) {
    const r1 = Math.sin(i * 12.9898 + seed) * 43758.5453, r = r1 - Math.floor(r1);
    const r2 = Math.sin(i * 78.233 + seed) * 12543.13, q = r2 - Math.floor(r2);
    const x = (r * W + Math.sin(t * 1.3 + i) * 30) % W;
    const y = ((q * H + t * (90 + 80 * r)) % (H + 40)) - 20;
    g.globalAlpha = a * (0.55 + 0.45 * q);
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.arc(x, y, 4 + 7 * q, 0, Math.PI * 2);
    g.fill();
  }
  g.restore();
}
// cold-breath puffs in front of the mouth (screen space)
function breath(t, head, a, phase = 0) {
  if (a <= 0) return;
  const g = ov.g;
  g.save();
  for (let i = 0; i < 3; i++) {
    const ph = (t * 0.8 + i / 3 + phase) % 1;
    const r = 18 + ph * 60;
    const gr = g.createRadialGradient(0, 0, 0, 0, 0, r);
    gr.addColorStop(0, 'rgba(255,255,255,0.75)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.globalAlpha = a * Math.sin(ph * Math.PI);
    g.translate(head.x + 40 + ph * 120, head.y + 90 - ph * 40);
    g.fillStyle = gr;
    g.beginPath();
    g.arc(0, 0, r, 0, Math.PI * 2);
    g.fill();
    g.setTransform(1, 0, 0, 1, 0, 0);
  }
  g.restore();
}
// hot air: wavy rising lines from a screen-space ground line
function heatWaves(t, y0, a, { x0 = 60, x1 = 1020, n = 9, h = 420, color = '255,140,60' } = {}) {
  if (a <= 0) return;
  const g = ov.g;
  g.save();
  g.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const x = lerp(x0, x1, (i + 0.5) / n);
    const ph = (t * 0.6 + i * 0.37) % 1;
    g.globalAlpha = a * Math.sin(ph * Math.PI) * 0.9;
    g.strokeStyle = `rgba(${color},1)`;
    g.lineWidth = 9;
    g.beginPath();
    for (let k = 0; k <= 20; k++) {
      const yy = y0 - ph * h * 0.5 - (k / 20) * h * 0.45;
      const xx = x + Math.sin(k * 0.9 + t * 5 + i) * 14;
      k ? g.lineTo(xx, yy) : g.moveTo(xx, yy);
    }
    g.stroke();
  }
  g.restore();
}

// ------------------------------------------------------------- Affan poses
const _hw = new THREE.Vector3();
// world position of Affan's right index fingertip (tea set)
function handW() {
  tea.aff.root.updateMatrixWorld(true);
  return tea.aff.parts.arms ? tea.aff.parts.arms.R.index.getWorldPosition(_hw) : _hw.set(0, 3, 0);
}
function teaAffan(t, p = {}) {
  const aff = tea.aff;
  aff.root.position.set(0, 0, 0);
  aff.pose({ yaw: p.yaw ?? 0 });
  const shiver = p.shiver || 0;
  const shake = Math.sin(t * 42) * 0.035 * shiver;
  const hug = p.hug || 0;
  const base = { blink: blinkAt(t, 2), talk: talk(t), smile: 0.7, ...p, tilt: (p.tilt || 0) + shake, headRoll: (p.headRoll || 0) + shake * 0.8 };
  let armL = p.armL, armR = p.armR;
  if (!armL && hug > 0) armL = { reach: [lerp(0.55, -0.28, hug), lerp(0.3, 0.72, hug), lerp(0.1, 0.5, hug)], pole: [1, -0.8, 0.2] };
  if (!armR && hug > 0) armR = { reach: [lerp(-0.55, 0.3, hug), lerp(0.3, 0.6, hug), lerp(0.1, 0.55, hug)], pole: [-1, -0.8, 0.2] };
  aff.pose({ ...base, armL, armR });
}
// Affan in the balloon basket: hands on the rim unless told otherwise.
function placeBalloon(h, t) {
  const B = balloonPos(h);
  val.bal.group.position.copy(B);
  val.bal.group.rotation.set(0.015 * Math.sin(t * 0.9), 0.1 * Math.sin(t * 0.25), 0.02 * Math.sin(t * 1.1));
  val.bal.group.updateMatrixWorld(true);
  val.follow(B);
  val.setAlt(h);
  return B;
}
function balAffan(t, p = {}) {
  const aff = val.aff;
  const shiver = p.shiver || 0;
  const shake = Math.sin(t * 42) * 0.035 * shiver;
  const hug = p.hug || 0;
  const rimL = { reach: [0.62, 0.62, 0.9], pole: [1, -0.6, -0.3] };
  const rimR = { reach: [-0.62, 0.62, 0.9], pole: [-1, -0.6, -0.3] };
  let armL = p.armL || rimL, armR = p.armR || rimR;
  if (hug > 0 && !p.armL) armL = { reach: [lerp(0.62, -0.28, hug), lerp(0.62, 0.72, hug), lerp(0.9, 0.5, hug)], pole: [1, -0.8, 0.2] };
  if (hug > 0 && !p.armR) armR = { reach: [lerp(-0.62, 0.3, hug), lerp(0.62, 0.6, hug), lerp(0.9, 0.55, hug)], pole: [-1, -0.8, 0.2] };
  aff.pose({ blink: blinkAt(t, 4), talk: talk(t), smile: 0.8, ...p, tilt: (p.tilt || 0) + shake, headRoll: (p.headRoll || 0) + shake * 0.8, armL, armR });
}
const cheer = (k) => ({
  armL: { reach: [lerp(0.62, 0.85, k), lerp(0.62, 1.9, k), lerp(0.9, 0.3, k)], pole: [1, -0.4, -0.5] },
  armR: { reach: [lerp(-0.62, -0.85, k), lerp(0.62, 1.9, k), lerp(0.9, 0.3, k)], pole: [-1, -0.4, -0.5] },
});
// camera relative to the balloon (mountain is behind, toward -z)
function balCam(B, { x = 4, y = 3.2, z = 15, lx = 0, ly = 3.0, lz = 0, fov = 46 } = {}) {
  lookCam(V(B.x + x, B.y + y, B.z + z), V(B.x + lx, B.y + ly, B.z + lz), fov);
}
const headW = (B, dy = 2.9) => V(B.x, B.y + 0.12 + dy, B.z);

// altitude / temperature HUD
function hud(t, km, o, temp = null) {
  if (o <= 0) return;
  ov.tag('hudA', `KETINGGIAN: ${km.toFixed(1)} KM`, { x: 330, y: 300, o, s: 0.95 }, { bg: BLUE, small: true });
  if (temp !== null) {
    ov.tag('hudT', `SUHU: ${Math.round(temp)}°C`, { x: 790, y: 300, o }, { bg: tCol(temp), small: true });
    ov.html('hudTh', THERM(tFill(temp), tCol(temp)), { x: 960, y: 520, o, s: 0.75 });
  }
}

// ================================================================== SHOTS
const SHOTS = [
  // T1 — "Korang pernah pergi Cameron Highlands? Sejuk, kan!"
  [0, 4.6, (t) => {
    const hug = keys(t, [[2.4, 0], [2.85, 1]], easeOut);
    teaAffan(t, { hug, shiver: hug, smile: lerp(0.9, 0.35, hug), brow: lerp(0.4, -0.2, hug), headPitch: -0.05, lookX: keys(t, [[0, 0.3], [1.2, 0]]), headYaw: keys(t, [[0, 0.25], [1.3, 0]]) });
    const k = easeInOut(inv(0, 4.6, t));
    lookCam(V(lerp(-1.6, 0.6, k), lerp(3.6, 3.1, k), lerp(9.5, 7.0, k)), V(-0.6 * (1 - k), 2.45, 0), 46);
    const head = scr(V(0, 2.9, 0));
    const q = pop(t, 0.3, 4.5);
    ov.tag('ep', 'EPISOD 16', { x: W / 2, y: 300, o: q.o, s: q.s }, { bg: BLUE, small: true });
    const c = pop(t, 1.2, 4.5);
    ov.tag('cam', 'CAMERON HIGHLANDS', { x: W / 2, y: 410, o: c.o, s: c.s }, { bg: GREEN });
    const s = pop(t, 2.72, 4.5, { from: 2 });
    ov.bubble('sejuk', 'SEJUK!', { x: 330 + Math.sin(t * 30) * 4 * s.o, y: 640, o: s.o, s: s.s, r: -6 }, { size: 140, top: '#e6f7ff', bot: '#3fa2ff' });
    ov.html('th1', THERM(tFill(20), tCol(20)), { x: 880, y: 700, o: s.o, s: s.s * 0.9, r: 6 });
    ov.tag('th1t', '20°C', { x: 880, y: 880, o: s.o, s: s.s }, { bg: GREEN, small: true });
    ov.html('sf1', SNOW(), { x: 150, y: 860 + Math.sin(t * 2) * 10, o: s.o, s: s.s * 0.6, r: t * 20 });
    breath(t, head, hug);
    return tea;
  }],
  // T2 — "Tapi... atas gunung kan lebih dekat dengan matahari?"
  [4.6, 8.3, (t) => {
    const pt = keys(t, [[5.4, 0], [5.9, 1], [8.0, 1], [8.3, 0.6]]);
    tea.aff.root.position.set(0, 0, 0);
    tea.aff.pose({ yaw: -0.2 });
    const far = tea.aff.toTorso(V(-8, 14, 6));
    const think = keys(t, [[4.6, 0], [5.0, 1], [5.5, 0]]);
    teaAffan(t, {
      yaw: -0.2, hug: 0.6 * (1 - think) * (1 - pt), shiver: 0.2, brow: 0.6, smile: 0.6,
      headPitch: -0.3 * pt, headYaw: -0.25 * pt, lookY: 0.6 * pt, lookX: -0.45 * pt, headRoll: 0.12 * think,
      armR: pt > 0.01 ? { reach: far.map((v, i) => lerp([-0.55, 0.3, 0.1][i], v, pt)), point: pt, pole: [-1, -0.5, -0.3] } : undefined,
    });
    const k = easeInOut(inv(4.6, 8.3, t));
    lookCam(V(lerp(1.6, 2.2, k), lerp(2.7, 2.2, k), lerp(7.4, 7.9, k)), V(lerp(0.2, -0.3, k), lerp(3.0, 3.9, k), 0), 48);
    const sx = 830, sy = 420 + Math.sin(t * 2) * 6;
    const m = pop(t, 5.6, 8.25);
    ov.html('sunI', SUN_SVG, { x: sx, y: sy, o: m.o, s: m.s * 1.2, r: Math.sin(t) * 5 });
    const d = pop(t, 6.56, 8.25);
    const hp = scr(handW());
    if (d.o > 0) ov.dashed(hp.x, hp.y, sx - 70, sy + 60, t, { color: '#ffd84a', w: 12, a: d.o });
    ov.tag('dekat', 'LEBIH DEKAT?', { x: 520, y: 660, o: d.o, s: d.s }, { bg: ORANGE });
    [[5.0, -260, -170, '#ffcf33', -12], [5.25, 250, -210, '#3fa2ff', 10]].forEach(([at, dx, dy, c, r], i) => {
      const q = pop(t, at, 6.6);
      const head = scr(V(0, 2.9, 0));
      ov.html('qq' + i, ICONS.qmark(c), { x: head.x + dx, y: head.y + dy + Math.sin(t * 3 + i) * 10, o: q.o, s: q.s * 0.8, r });
    });
    return tea;
  }],
  // T3 — title: "Kenapa semakin tinggi, semakin sejuk?"
  [8.3, 11.25, (t) => {
    const think = keys(t, [[8.3, 0], [8.7, 1]]);
    const th = POSES.thinkR.armR;
    teaAffan(t, {
      hug: 0.7 * (1 - think) + 0.0, shiver: 0.25, brow: 0.7, smile: 0.6, headRoll: -0.1 * think, lookX: 0.3, lookY: 0.2,
      armR: think > 0.01 ? { reach: th.reach.map((v, i) => lerp([-0.55, 0.3, 0.1][i], v, think)), pole: th.pole, point: think, wx: th.wx * think } : undefined,
      armL: { reach: [0.45, 0.55, 0.45], pole: [1, -0.8, 0.2] },
    });
    const k = easeOut(inv(8.3, 11.25, t));
    lookCam(V(lerp(0.4, 0.2, k), lerp(3.3, 4.4, k), lerp(6.0, 10.5, k)), V(0, lerp(2.6, 3.3, k), 0), 46);
    const p = pop(t, 8.45, 11.2, { fin: 0.45 });
    ov.bubble('title', 'KENAPA SEMAKIN\nTINGGI, SEMAKIN\nSEJUK?', { x: W / 2, y: 540 + Math.sin(t * 3) * 6, o: p.o, s: p.s }, { size: 104 });
    const q = pop(t, 8.5, 11.2);
    ov.tag('ep2', 'EPISOD 16', { x: W / 2, y: 300, o: q.o, s: q.s }, { bg: BLUE, small: true });
    const a = pop(t, 9.28, 11.2);
    ov.html('upA', UP_ARROW(ORANGE), { x: 140, y: 1000 + Math.sin(t * 4) * 10, o: a.o, s: a.s * 0.8 });
    const b = pop(t, 10.52, 11.2);
    ov.html('sf3', SNOW(), { x: 930, y: 1000, o: b.o, s: b.s * 0.75, r: t * 30 });
    return tea;
  }],
  // V1 — "Jom ikut Affan cari jawapan!": lift-off in the balloon
  [11.25, 13.1, (t) => {
    const h = keys(t, [[11.25, 0], [11.9, 0], [13.1, 2.2]], (k) => k * k);
    const B = placeBalloon(h, t);
    val.bal.flame.visible = true;
    val.bal.flame.scale.setScalar(t > 11.6 ? 1 + 0.15 * Math.sin(t * 30) : 0.001);
    const up = keys(t, [[11.3, 0], [11.6, 1], [12.8, 1], [13.1, 0.3]], easeOut);
    balAffan(t, { smile: 1, brow: 0.7, ...cheer(up), lookY: 0.15, headPitch: -0.1 });
    const k = easeInOut(inv(11.25, 13.1, t));
    balCam(B, { x: lerp(5, 3, k), y: lerp(2.5, 3.4, k), z: lerp(15, 18, k), ly: lerp(3.6, 6.0, k), fov: 50 });
    ov.flash(1 - inv(11.25, 11.6, t));
    ov.sparkles(t, { n: 22, seed: 4, y: 300, h: 900, a: inv(11.4, 11.8, t) });
    const q = pop(t, 11.36, 13.05);
    ov.bubble('jom', 'JOM TERBANG!', { x: W / 2, y: 400, o: q.o, s: q.s, r: -3 }, { size: 124 });
    return val;
  }],
  // D1 — "Sebenarnya, matahari sangat, SANGAT jauh. Naik gunung pun, tak beza."
  [13.1, 19.55, (t) => {
    const h = lerp(2.2, 9, inv(13.1, 19.55, t));
    const B = placeBalloon(h, t);
    val.bal.flame.scale.setScalar(0.6 + 0.1 * Math.sin(t * 30));
    const ch = keys(t, [[16.6, 0], [16.9, 1], [17.4, 0]]);
    balAffan(t, { smile: 0.9 + 0.1 * ch, brow: 0.5, headPitch: -0.15, lookY: 0.3, lookX: 0.3, headRoll: 0.08 * ch, bob: 0.03 * ch });
    const k = easeInOut(inv(13.1, 19.55, t));
    balCam(B, { x: lerp(-4, -6, k), y: lerp(1.0, 0.0, k), z: lerp(24, 30, k), ly: 5.5, fov: 50 });
    // distance diagram: Earth with a tiny mountain, a long dashed line to the Sun
    const o = clamp(inv(13.2, 13.6, t)) * (1 - inv(19.3, 19.55, t));
    if (o > 0) {
      panel(60, 330, 960, 520, 0.84 * o);
      const g = ov.g;
      const ex = 190, ey = 640, er = 90;
      g.save();
      g.globalAlpha = o;
      const eg = g.createRadialGradient(ex - 30, ey - 30, 10, ex, ey, er);
      eg.addColorStop(0, '#7fd0ff');
      eg.addColorStop(1, '#1f6fd6');
      g.fillStyle = eg;
      g.beginPath();
      g.arc(ex, ey, er, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#5fbf4a';
      g.beginPath();
      g.ellipse(ex - 20, ey - 20, 40, 26, 0.4, 0, Math.PI * 2);
      g.ellipse(ex + 35, ey + 35, 28, 18, -0.3, 0, Math.PI * 2);
      g.fill();
      // the mountain bump
      const mb = pop(t, 17.32, 19.4);
      g.globalAlpha = o * mb.o;
      g.fillStyle = '#8a7a6a';
      g.strokeStyle = '#17256b';
      g.lineWidth = 5;
      g.beginPath();
      g.moveTo(ex + 60, ey - 66);
      g.lineTo(ex + 74, ey - 88 - 6 * mb.s);
      g.lineTo(ex + 86, ey - 56);
      g.closePath();
      g.fill();
      g.stroke();
      g.restore();
      const sx = 880;
      const lk = easeOut(inv(14.3, 16.0, t));
      ov.dashed(ex + er + 10, ey, lerp(ex + er + 10, sx - 100, lk), ey, t, { color: '#ffd84a', w: 10, a: o });
      const su = pop(t, 14.32, 19.4);
      ov.html('sunD', SUN_SVG, { x: sx, y: ey, o: su.o * o, s: su.s * 1.05 });
      label('BUMI', ex, ey + 140, { size: 44, color: '#8fd8ff', a: o });
      label('MATAHARI', sx, ey + 140, { size: 44, color: '#ffd84a', a: su.o * o });
      const j = pop(t, 15.1, 19.4);
      ov.tag('jauh', '150 JUTA KM!', { x: 520, y: 560, o: j.o * o, s: j.s }, { bg: ORANGE });
      ov.tag('gun', 'GUNUNG: 4 KM SAHAJA', { x: 360, y: 440, o: mb.o * o, s: mb.s }, { bg: '#6d5a4a', small: true });
      const tb = pop(t, 18.72, 19.45, { from: 2.2 });
      ov.bubble('tbeza', 'TAK BEZA!', { x: W / 2, y: 980, o: tb.o, s: tb.s, r: -4 }, { size: 140, top: '#ffe0d6', bot: '#ff5a3d' });
    }
    return val;
  }],
  // V2 — sunlight warms the ground; the warm ground warms the air (stove & pot)
  [19.55, 29.1, (t) => {
    const B = placeBalloon(lerp(9, 12, inv(19.55, 29.1, t)), t);
    val.bal.flame.scale.setScalar(0.5);
    balAffan(t, { smile: 0.9, brow: 0.5, headPitch: 0.25, lookY: -0.5, headYaw: 0.15 * wobble(t, 2) });
    const k = easeInOut(inv(19.55, 29.1, t));
    // wide, low view: the town ground fills the bottom, balloon upper left
    lookCam(V(B.x + lerp(34, 28, k), lerp(13, 11, k), B.z + lerp(58, 50, k)), V(B.x + 4, lerp(7, 6.5, k), B.z), 52);
    const G = V(B.x + 20, 0, B.z + 28);
    ov.flash(1 - inv(19.55, 19.85, t));
    const gy = scr(V(G.x, 0, G.z + 18)).y; // a ground line on screen
    // 1) sunlight comes down to the ground
    const r = clamp(inv(20.8, 21.4, t));
    if (r > 0) {
      const g = ov.g;
      g.save();
      for (let i = 0; i < 6; i++) {
        const ph = (t * 0.9 + i / 6) % 1;
        const x0 = 1000 - i * 40, y0 = 260;
        const x1 = 260 + i * 130, y1 = gy;
        const px = lerp(x0, x1, ph), py = lerp(y0, y1, ph);
        g.globalAlpha = r * 0.9;
        g.strokeStyle = 'rgba(255,216,74,0.55)';
        g.lineWidth = 14;
        g.setLineDash([26, 22]);
        g.beginPath();
        g.moveTo(x0, y0);
        g.lineTo(x1, y1);
        g.stroke();
        g.setLineDash([]);
        g.fillStyle = '#fff3a0';
        g.beginPath();
        g.arc(px, py, 12, 0, Math.PI * 2);
        g.fill();
      }
      g.restore();
      ov.html('sunV', SUN_SVG, { x: 960, y: 300, o: r, s: 0.9 + 0.03 * Math.sin(t * 4) });
    }
    // ground glows warm (3D glow discs on the ground)
    val.heat.userData.mat.opacity = 0.85 * clamp(inv(22.48, 23.3, t));
    const s1 = pop(t, 21.2, 29.0);
    ov.tag('s1', '1. MATAHARI → TANAH', { x: W / 2, y: 330, o: s1.o, s: s1.s * 0.95 }, { bg: ORANGE });
    const tn = pop(t, 22.48, 29.0);
    ov.tag('tTanah', 'TANAH PANAS!', { x: 300, y: clamp(gy + 90, 900, 1330), o: tn.o, s: tn.s }, { bg: RED, small: true });
    // 2) the warm ground warms the air above it
    const air = clamp(inv(25.36, 26.2, t));
    heatWaves(t, clamp(gy + 40, 1000, 1400), air, { h: 520 });
    const s2 = pop(t, 25.36, 29.0);
    ov.tag('s2', '2. TANAH → UDARA', { x: W / 2, y: 430, o: s2.o, s: s2.s * 0.95 }, { bg: '#e0563a' });
    const st = pop(t, 27.28, 29.0);
    ov.html('stove', STOVE_SVG, { x: 800, y: 1010 + Math.sin(t * 4) * 6, o: st.o, s: st.s * 0.95, r: 4 });
    ov.tag('stL', 'MACAM DAPUR!', { x: 800, y: 1190, o: st.o, s: st.s }, { bg: PURPLE, small: true });
    return val;
  }],
  // V3 — "Jadi, udara paling panas ada dekat tanah."
  [29.1, 32.45, (t) => {
    const B = placeBalloon(lerp(12, 14, inv(29.1, 32.45, t)), t);
    val.bal.flame.scale.setScalar(0.5);
    balAffan(t, { smile: 0.9, brow: 0.4, headPitch: 0.1, lookY: -0.2, lookX: 0.3 });
    const k = easeInOut(inv(29.1, 32.45, t));
    balCam(B, { x: lerp(-14, -18, k), y: lerp(-3, -6, k), z: lerp(40, 52, k), lx: 8, ly: lerp(-2, 2, k), fov: 54 });
    ov.flash((1 - inv(29.1, 29.35, t)) * 0.7);
    // temperature column: hot at the bottom, cool at the top
    const o = pop(t, 29.2, 32.4);
    if (o.o > 0) {
      const g = ov.g;
      const x = 900, y0 = 420, y1 = 1330, w = 70;
      g.save();
      g.globalAlpha = o.o;
      const gr = g.createLinearGradient(0, y0, 0, y1);
      gr.addColorStop(0, '#3fa2ff');
      gr.addColorStop(0.5, '#8fe39a');
      gr.addColorStop(1, '#ff5a3d');
      g.fillStyle = gr;
      g.strokeStyle = '#ffffff';
      g.lineWidth = 8;
      g.beginPath();
      g.roundRect(x - w / 2, y0, w, (y1 - y0) * easeOut(o.o), 35);
      g.fill();
      g.stroke();
      g.restore();
      ov.html('snV3', SNOW(), { x, y: y0 - 70, o: o.o, s: o.s * 0.55, r: t * 25 });
      ov.html('sunV3', SUN_SVG, { x, y: y1 + 80, o: o.o, s: o.s * 0.5 });
    }
    const pp = pop(t, 30.28, 32.4, { from: 2 });
    ov.bubble('paling', 'PALING PANAS\nDEKAT TANAH!', { x: 440, y: 1170, o: pp.o, s: pp.s, r: -3 }, { size: 96, top: '#ffe0b0', bot: '#ff7a2d' });
    heatWaves(t, 1420, 0.7 * pp.o, { x0: 80, x1: 760, n: 7, h: 360 });
    return val;
  }],
  // V4 — "Bila udara naik tinggi, ia mengembang macam belon. Udara yang mengembang, jadi sejuk!"
  [32.45, 38.6, (t) => {
    const B = placeBalloon(lerp(14, 22, inv(32.45, 38.6, t)), t);
    val.bal.flame.scale.setScalar(0.5);
    const sh = keys(t, [[37.6, 0], [37.9, 1]]);
    balAffan(t, { smile: 0.9, brow: 0.6, wow: keys(t, [[35.3, 0], [35.5, 0.6], [36.0, 0]]), headPitch: -0.2, lookY: 0.4, lookX: -0.4, hug: sh * 0.8, shiver: sh * 0.5 });
    const k = easeInOut(inv(32.45, 38.6, t));
    balCam(B, { x: lerp(9, 11, k), y: lerp(4, 7, k), z: lerp(22, 26, k), lx: -4, ly: lerp(4, 9, k), fov: 54 });
    ov.flash((1 - inv(32.45, 32.7, t)) * 0.7);
    // a parcel of air rises, swells and cools
    const u = easeInOut(inv(32.6, 36.3, t));
    const o = clamp(inv(32.5, 32.8, t)) * (1 - inv(38.4, 38.6, t));
    if (o > 0) {
      const cool = clamp(inv(34.5, 37.8, t));
      const cx = 300 + Math.sin(t * 1.4) * 20, cy = lerp(1300, 620, u);
      const r = lerp(70, 175, easeOut(inv(34.1, 36.6, t))) * (1 + 0.03 * Math.sin(t * 6));
      const warm = new THREE.Color('#ff8a3d'), cold = new THREE.Color('#7fd0ff');
      const c = warm.clone().lerp(cold, cool);
      const g = ov.g;
      g.save();
      g.globalAlpha = o * 0.92;
      const gr = g.createRadialGradient(cx - r * 0.3, cy - r * 0.3, r * 0.1, cx, cy, r);
      gr.addColorStop(0, '#ffffff');
      gr.addColorStop(0.35, `#${c.getHexString()}`);
      gr.addColorStop(1, `#${c.clone().multiplyScalar(0.75).getHexString()}`);
      g.fillStyle = gr;
      g.strokeStyle = '#ffffff';
      g.lineWidth = 8;
      g.beginPath();
      g.arc(cx, cy, r, 0, Math.PI * 2);
      g.fill();
      g.stroke();
      // face
      g.fillStyle = '#17256b';
      for (const s of [-1, 1]) {
        g.beginPath();
        g.ellipse(cx + s * r * 0.28, cy - r * 0.08, r * 0.08, r * 0.12 * (1 - 0.9 * (Math.sin(t * 2.5) > 0.97)), 0, 0, Math.PI * 2);
        g.fill();
      }
      g.strokeStyle = '#17256b';
      g.lineWidth = Math.max(4, r * 0.06);
      g.lineCap = 'round';
      g.beginPath();
      if (cool < 0.8) g.arc(cx, cy + r * 0.12, r * 0.22, 0.15 * Math.PI, 0.85 * Math.PI);
      else for (let i = 0; i <= 8; i++) g[i ? 'lineTo' : 'moveTo'](cx - r * 0.24 + i * r * 0.06, cy + r * 0.25 + (i % 2 ? -1 : 1) * r * 0.04);
      g.stroke();
      // outward arrows while it expands
      const ex = clamp(inv(34.2, 34.6, t)) * (1 - inv(36.8, 37.2, t));
      if (ex > 0) {
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2 + 0.3;
          const d = r + 30 + 14 * Math.sin(t * 8);
          g.globalAlpha = o * ex;
          g.strokeStyle = '#8fe39a';
          g.lineWidth = 12;
          g.beginPath();
          g.moveTo(cx + Math.cos(a) * d, cy + Math.sin(a) * d);
          g.lineTo(cx + Math.cos(a) * (d + 50), cy + Math.sin(a) * (d + 50));
          g.stroke();
        }
      }
      g.restore();
      label('UDARA', cx, cy + r + 50, { size: 46, color: '#ffffff', a: o });
      const up = clamp(inv(32.6, 33.0, t)) * (1 - inv(35.8, 36.2, t));
      if (up > 0) ov.html('upAir', UP_ARROW(ORANGE), { x: cx + r + 90, y: cy + 40, o: up, s: 0.7 });
      const mg = pop(t, 34.24, 38.5);
      ov.tag('meng', 'MENGEMBANG!', { x: 700, y: 520, o: mg.o, s: mg.s }, { bg: GREEN });
      const sj = pop(t, 37.68, 38.55, { from: 2 });
      ov.bubble('sj', 'JADI SEJUK!', { x: 640, y: 1150, o: sj.o, s: sj.s, r: -3 }, { size: 130, top: '#e6f7ff', bot: '#3fa2ff' });
      [[37.7, 120, 420], [37.8, 520, 360], [37.9, 900, 700]].forEach(([at, x, y], i) => {
        const q = pop(t, at, 38.55);
        ov.html('sfa' + i, SNOW(), { x, y: y + Math.sin(t * 3 + i) * 10, o: q.o, s: q.s * 0.55, r: t * 40 + i * 20 });
      });
    }
    return val;
  }],
  // V5 — "Setiap kali naik 1 kilometer, suhu turun lebih kurang 6 darjah!"
  [38.6, 43.72, (t) => {
    const km = keys(t, [[38.8, 0.45], [42.6, 1.0]]);
    const B = placeBalloon(km * KM, t);
    val.bal.flame.scale.setScalar(1 + 0.15 * Math.sin(t * 30));
    const wow = keys(t, [[42.3, 0], [42.5, 0.7], [43.4, 0.7], [43.7, 0]]);
    balAffan(t, { smile: 1, brow: 0.6 + 0.4 * wow, wow, headPitch: 0.15, lookY: -0.35 });
    const k = easeInOut(inv(38.6, 43.72, t));
    balCam(B, { x: lerp(6, 4, k), y: lerp(-2, -5, k), z: lerp(17, 15, k), ly: 4.5, fov: 50 });
    ov.flash((1 - inv(38.6, 38.85, t)) * 0.8);
    const temp = 32 - 6 * keys(t, [[38.8, 0], [42.6, 1]]);
    hud(t, km, pop(t, 38.7, 43.7).o, temp);
    const q1 = pop(t, 39.6, 43.65, { from: 2 });
    ov.bubble('km1', 'NAIK 1 KM', { x: W / 2, y: 470, o: q1.o, s: q1.s, r: -3 }, { size: 120, top: '#fff3a0', bot: '#ffb21f' });
    const q2 = pop(t, 42.32, 43.65, { from: 2 });
    ov.bubble('m6', 'TURUN ±6°C', { x: W / 2, y: 1150, o: q2.o, s: q2.s, r: 3 }, { size: 130, top: '#e6f7ff', bot: '#3fa2ff' });
    ov.speedLines(t, { a: 0.35 * clamp(inv(38.7, 39.2, t)) * (1 - inv(42.4, 42.8, t)), dir: 1, seed: 5 });
    return val;
  }],
  // V6 — "Kuala Lumpur, 32 darjah." (looking down at the warm town below)
  [43.72, 45.97, (t) => {
    const B = placeBalloon(1.05 * KM, t);
    val.bal.flame.scale.setScalar(0.5);
    balAffan(t, { smile: 1, brow: 0.5, headPitch: 0.45, lookY: -0.7, headYaw: -0.2, armR: { reach: [-0.75, 0.55, 1.15], point: 1, pole: [-1, -0.6, -0.2], wx: 0.6 } });
    const k = easeInOut(inv(43.72, 45.97, t));
    lookCam(V(B.x - 16, B.y + lerp(6, 7, k), B.z + lerp(6, 10, k)), V(B.x + 8, 0, 160), 54);
    val.heat.userData.mat.opacity = 0.35;
    const a = pop(t, 43.75, 45.92);
    ov.tag('kl', 'KUALA LUMPUR', { x: W / 2 + 80, y: 700, o: a.o, s: a.s }, { bg: RED, pointer: 'down' });
    const b = pop(t, 44.64, 45.92, { from: 2 });
    ov.html('thKL', THERM(tFill(32), RED), { x: 920, y: 1000, o: b.o, s: b.s * 0.95, r: 6 });
    ov.bubble('t32', '32°C', { x: 760, y: 1180, o: b.o, s: b.s }, { size: 140, top: '#ffd0c0', bot: '#ff5a3d' });
    heatWaves(t, 1400, 0.6 * a.o, { x0: 300, x1: 1000, n: 6, h: 380 });
    return val;
  }],
  // V7 — "Cameron Highlands, 20 darjah." (tea terraces in the mist)
  [45.97, 48.27, (t) => {
    const km = keys(t, [[45.97, 1.4], [48.27, 1.55]]);
    const B = placeBalloon(km * KM, t);
    val.bal.flame.scale.setScalar(0.6);
    balAffan(t, { smile: 0.9, brow: 0.5, headYaw: -0.4, lookX: -0.5, headPitch: 0.05, armL: { reach: [0.9, 0.8, 0.9], point: 1, pole: [1, -0.5, -0.3] } });
    const k = easeInOut(inv(45.97, 48.27, t));
    balCam(B, { x: lerp(14, 10, k), y: lerp(2, 3, k), z: lerp(18, 16, k), lx: -10, ly: 1, lz: -10, fov: 52 });
    ov.flash((1 - inv(45.97, 46.25, t)) * 0.7, '235,255,240');
    hud(t, km, pop(t, 46.0, 48.25).o);
    const a = pop(t, 46.0, 48.22);
    ov.tag('ch', 'CAMERON HIGHLANDS', { x: W / 2, y: 430, o: a.o, s: a.s }, { bg: GREEN });
    ov.tag('ch2', '± 1,500 m', { x: W / 2, y: 530, o: a.o, s: a.s }, { bg: '#2f6b3a', small: true });
    const b = pop(t, 47.09, 48.22, { from: 2 });
    ov.html('thCH', THERM(tFill(20), GREEN), { x: 180, y: 860, o: b.o, s: b.s * 0.95, r: -6 });
    ov.bubble('t20', '20°C', { x: 260, y: 1090, o: b.o, s: b.s }, { size: 140, top: '#d8ffd8', bot: '#2fb35a' });
    return val;
  }],
  // V8 — "Puncak Gunung Kinabalu, boleh hampir 0 darjah! Brrr!"
  [48.27, 53.25, (t) => {
    const km = keys(t, [[48.27, 1.55], [49.7, 4.02]], easeInOut);
    const B = placeBalloon(km * KM, t);
    val.bal.flame.scale.setScalar(t < 49.7 ? 1.2 + 0.2 * Math.sin(t * 30) : 0.4);
    const sh = keys(t, [[50.9, 0], [51.4, 1]]);
    const brr = keys(t, [[52.4, 0], [52.55, 1], [53.1, 1]]);
    balAffan(t, { smile: lerp(1, 0.2, sh), brow: lerp(0.6, -0.3, sh), wow: keys(t, [[49.6, 0], [49.8, 0.6], [50.4, 0.6], [50.7, 0]]), hug: sh, shiver: sh * (0.6 + 0.6 * brr), headPitch: -0.05, lookY: 0.1, lookX: 0.2 });
    const k = easeInOut(inv(48.27, 53.25, t));
    if (t < 49.8) balCam(B, { x: 6, y: -3, z: 18, ly: 6, fov: 54 });
    else balCam(B, { x: lerp(-7, -5, k), y: lerp(3.5, 2.8, k), z: lerp(18, 14, k), lx: -1.5, ly: lerp(4, 3.4, k), lz: -2, fov: 50 });
    ov.speedLines(t, { a: 0.5 * clamp(inv(48.3, 48.6, t)) * (1 - inv(49.4, 49.8, t)), dir: 1, seed: 7 });
    ov.flash((1 - inv(49.7, 50.0, t)) * 0.8, '235,245,255');
    hud(t, km, pop(t, 48.3, 53.2).o);
    const a = pop(t, 49.04, 53.2);
    ov.tag('kin', 'GUNUNG KINABALU', { x: W / 2, y: 430, o: a.o, s: a.s }, { bg: PURPLE });
    ov.tag('kin2', '4,095 m', { x: W / 2, y: 530, o: a.o, s: a.s }, { bg: '#5a3fb0', small: true });
    const b = pop(t, 50.96, 53.2, { from: 2 });
    ov.html('thK', THERM(tFill(0), ICE), { x: 900, y: 840, o: b.o, s: b.s * 0.95, r: 6 });
    ov.bubble('t0', '± 0°C', { x: 820, y: 1080, o: b.o, s: b.s }, { size: 140, top: '#e6f7ff', bot: '#3fa2ff' });
    const c = pop(t, 52.48, 53.2, { from: 2 });
    ov.bubble('brr', 'BRRR!', { x: 300 + Math.sin(t * 40) * 6 * c.o, y: 760, o: c.o, s: c.s, r: -8 }, { size: 150, top: '#ffffff', bot: '#8fd8ff' });
    snowfall(t, clamp(inv(49.8, 50.4, t)), 46);
    breath(t, scr(headW(B)), sh);
    return val;
  }],
  // V9 — "Waaah, rupanya makin jauh dari tanah yang panas, makin sejuk!"
  [53.25, 58.7, (t) => {
    const B = placeBalloon(4.02 * KM, t);
    val.bal.flame.scale.setScalar(0.4);
    const up = keys(t, [[53.3, 0], [53.6, 1], [55.2, 1], [55.6, 0]], easeOut);
    const jump = t > 53.3 && t < 53.9 ? Math.sin(((t - 53.3) / 0.6) * Math.PI) * 0.25 : 0;
    balAffan(t, { smile: 1, brow: 0.8, bob: jump, wow: keys(t, [[54.0, 0], [54.15, 0.8], [54.8, 0.8], [55.0, 0]]), ...cheer(up), headPitch: -0.1, lookY: 0.1 });
    const k = easeOut(inv(53.25, 58.7, t));
    balCam(B, { x: lerp(2, 1, k), y: lerp(3.0, 4.0, k), z: lerp(12, 20, k), lx: lerp(0, -3.6, easeInOut(inv(54.6, 55.4, t))), ly: lerp(3.2, 2.6, k), fov: 48 });
    snowfall(t, 0.7, 30, 9);
    ov.sparkles(t, { n: 24, seed: 12, y: 250, h: 700, a: inv(53.3, 53.7, t) * (1 - inv(55.5, 56, t)) });
    // recap ladder: three stops, hot at the bottom, cold at the top
    const o = clamp(inv(55.0, 55.4, t));
    if (o > 0) {
      panel(60, 360, 520, 780, 0.82 * o);
      const rows = [[0, 'KL', 32, 1010], [1, 'CAMERON', 20, 770], [2, 'KINABALU', 0, 530]];
      ov.html('ladA', UP_ARROW('#8a5cff'), { x: 125, y: 770, o, s: 2.6 });
      rows.forEach(([i, nm, c, y]) => {
        const q = pop(t, 55.3 + i * 0.3, 58.65);
        ov.html('lt' + i, THERM(tFill(c), tCol(c)), { x: 245, y, o: q.o * o, s: q.s * 0.62 });
        label(nm, 420, y - 30, { size: 46, a: q.o * o });
        label(`${c}°C`, 420, y + 30, { size: 54, color: tCol(c) === ICE ? '#8fd8ff' : tCol(c), a: q.o * o });
      });
    }
    const q = pop(t, 57.49, 58.65, { from: 2.2 });
    ov.bubble('mt', 'MAKIN TINGGI,\nMAKIN SEJUK!', { x: W / 2, y: 1270, o: q.o, s: q.s, r: -2 }, { size: 112 });
    return val;
  }],
  // V10 — "Kalau pergi tempat tinggi, jangan lupa bawa baju sejuk, ya!"
  [58.7, 62.22, (t) => {
    const B = placeBalloon(4.02 * KM, t);
    val.bal.flame.scale.setScalar(0.4);
    const hug = keys(t, [[58.8, 0], [59.2, 1], [60.9, 1], [61.2, 0]]);
    const th = keys(t, [[61.1, 0], [61.45, 1]]);
    balAffan(t, {
      smile: 1, brow: 0.5, hug, headRoll: 0.1 * hug, headYaw: 0.1 * wobble(t, 3), lookX: 0.1,
      armR: th > 0.01 ? { ...POSES.thumbsUpR.armR, thumb: th } : undefined,
    });
    const k = easeInOut(inv(58.7, 62.22, t));
    balCam(B, { x: lerp(-2, -1, k), y: lerp(3.0, 2.8, k), z: lerp(9.5, 8.0, k), ly: 2.9, fov: 46 });
    snowfall(t, 0.5, 26, 11);
    const a = pop(t, 59.2, 62.18);
    ov.html('jk', JACKET_SVG, { x: 200, y: 760 + Math.sin(t * 3) * 8, o: a.o, s: a.s * 0.95, r: -8 });
    const b = pop(t, 60.92, 62.18);
    ov.tag('baju', 'BAWA BAJU SEJUK!', { x: W / 2, y: 380, o: b.o, s: b.s }, { bg: '#26346f' });
    return val;
  }],
  // V11 — "Tempat paling sejuk korang pernah pergi? Komen kat bawah!"
  [62.22, 65.4, (t) => {
    const B = placeBalloon(4.02 * KM, t);
    val.bal.flame.scale.setScalar(0.4);
    const ptV = keys(t, [[62.4, 0], [62.75, 1], [64.0, 1], [64.3, 0]]);
    const down = keys(t, [[64.2, 0], [64.55, 1]]);
    balAffan(t, {
      smile: 1, brow: 0.6, headRoll: -0.08 * ptV, headPitch: 0.15 * down, lookY: 0.1 - 0.5 * down,
      armR: ptV > 0.01 ? { reach: [lerp(-0.62, -0.3, ptV), lerp(0.62, 1.05, ptV), lerp(0.9, 1.0, ptV)], point: ptV, pole: [-1, -0.6, -0.3] }
        : down > 0.01 ? { reach: [lerp(-0.62, -0.55, down), lerp(0.62, 0.4, down), lerp(0.9, 1.05, down)], point: down, pole: [-1, -0.6, -0.3], wx: 0.9 * down } : undefined,
    });
    const k = easeInOut(inv(62.22, 65.4, t));
    balCam(B, { x: lerp(1.5, 0.8, k), y: lerp(2.9, 2.8, k), z: lerp(10, 8.6, k), ly: 2.75, fov: 46 });
    snowfall(t, 0.35, 20, 13);
    const head = scr(headW(B));
    [[62.4, -280, -200, '#ffcf33', -12], [62.7, 280, -230, '#3fa2ff', 10]].forEach(([at, dx, dy, c, r], i) => {
      const q = pop(t, at, 65.35);
      ov.html('qk' + i, ICONS.qmark(c), { x: head.x + dx, y: head.y + dy + Math.sin(t * 3 + i) * 10, o: q.o, s: q.s * 0.85, r });
    });
    const s = pop(t, 62.72, 65.35);
    ov.html('sfk', SNOW(), { x: 170, y: 1000, o: s.o, s: s.s * 0.6, r: t * 30 });
    const c = pop(t, 64.23, 65.38);
    ov.html('cIcon', COMMENT_SVG, { x: 870, y: 1040, o: c.o, s: c.s * 0.9, r: 6 });
    ov.tag('komen', 'KOMEN DI BAWAH!', { x: W / 2, y: 1180, o: c.o, s: c.s }, { bg: ORANGE });
    if (c.o > 0) ov.html('dArr', DOWN_ARROW, { x: W / 2, y: 1300 + Math.abs(Math.sin(t * 6)) * 20, o: c.o, s: 0.6 * c.s });
    return val;
  }],
  // Outro — The Curious Affan logo
  [65.4, DURATION, (t) => {
    const k = easeOut(inv(65.4, 66.1, t));
    outro.aff.root.position.set(0, 0, 0);
    const th2 = POSES.thinkR.armR;
    outro.aff.pose({ ...POSES.thinkR, armR: { ...th2 }, smile: 1, blink: blinkAt(t, 9), headRoll: -0.08, lookX: 0.25, lookY: 0.15, headYaw: 0.08 });
    lookCam(V(0, 2.6, lerp(7.5, 5.4, k)), V(0, 2.3, 0), 40);
    const hc = scr(V(0, 2.95, 0));
    ov.flash((1 - inv(65.4, 65.75, t)) * 1.0);
    const g = ov.g;
    const ra = inv(65.5, 66.1, t);
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
    const ic = pop(t, 66.0, 99);
    ov.html('oSnow', SNOW(), { x: 170, y: 470 + Math.sin(t * 2) * 8, o: ic.o, s: ic.s * 0.6, r: t * 20 });
    ov.html('oQ1', ICONS.qmark('#ffcf33'), { x: 880, y: 420 + Math.sin(t * 2 + 1) * 8, o: ic.o, s: ic.s * 0.9, r: 12 });
    ov.html('oQ2', ICONS.qmark('#2f6fff'), { x: 220, y: 760 + Math.sin(t * 2 + 2) * 8, o: ic.o, s: ic.s * 0.6, r: -12 });
    const l1 = pop(t, 65.7, 99), l2 = pop(t, 65.9, 99), l3 = pop(t, 66.1, 99);
    drawLogo(ov, { k: [l1, l2, l3], star: pop(t, 66.3, 99) });
    return outro;
  }],
];

function frame(t) {
  ov.begin();
  cam.aspect = W / H;
  cam.updateProjectionMatrix();
  const shot = SHOTS.find(([a, b]) => t >= a && t < b) || SHOTS[SHOTS.length - 1];
  val.heat.userData.mat.opacity = 0;
  for (const m of tea.mists.children) m.position.x = m.userData.x + Math.sin(t * 0.2 * m.userData.v) * 6;
  const world = shot[2](t);
  renderer.render(world.scene, cam);
  if (world !== outro) ov.vignette(0.22);
  ov.captions(t, CAPTIONS, KEYWORDS);
  ov.end();
}

// Cover / thumbnail (9:16): Affan shivering in his balloon by the frosty
// summit, a big title, a cold thermometer, episode badge and the series logo.
// No captions. Key elements stay inside the centre 3:4 area (y 240-1680).
const THUMB = { x: -4, y: 2.6, z: 16, ly: 3.4, fov: 50 };
window.setThumb = (o) => Object.assign(THUMB, o);
function thumbnail() {
  ov.begin();
  cam.aspect = W / H;
  cam.updateProjectionMatrix();
  const t = 51.6;
  const B = placeBalloon(4.02 * KM, 0);
  val.bal.flame.scale.setScalar(0.5);
  balAffan(t, { blink: 0, talk: 0, wow: 0.85, brow: 1, hug: 1, shiver: 0, headPitch: -0.08, headYaw: 0.12, lookX: 0.25, lookY: 0.05 });
  balCam(B, { x: THUMB.x, y: THUMB.y, z: THUMB.z, ly: THUMB.ly, lx: 0, fov: THUMB.fov });
  renderer.render(val.scene, cam);
  const g = ov.g;
  const top = g.createLinearGradient(0, 0, 0, 900);
  top.addColorStop(0, 'rgba(8,12,44,0.8)');
  top.addColorStop(1, 'rgba(8,12,44,0)');
  g.fillStyle = top;
  g.fillRect(0, 0, W, 900);
  const bot = g.createLinearGradient(0, H - 900, 0, H);
  bot.addColorStop(0, 'rgba(8,12,44,0)');
  bot.addColorStop(1, 'rgba(8,12,44,0.8)');
  g.fillStyle = bot;
  g.fillRect(0, H - 900, W, 900);
  ov.vignette(0.25);
  snowfall(3.0, 0.8, 40, 21);
  breath(0.35, scr(headW(B)), 1);
  ov.tag('thBadge', 'EPISOD 16', { x: W / 2, y: 300 }, { bg: BLUE, small: true });
  ov.bubble('thTitle', 'KENAPA SEMAKIN\nTINGGI, SEMAKIN\nSEJUK?', { x: W / 2, y: 540, r: -2 }, { size: 104 });
  ov.html('thTh', THERM(tFill(0), ICE), { x: 930, y: 980, r: 8, s: 0.9 });
  ov.bubble('th0', '0°C', { x: 900, y: 1190, r: 6 }, { size: 110, top: '#e6f7ff', bot: '#3fa2ff' });
  ov.html('thUp', UP_ARROW(ORANGE), { x: 130, y: 1020, s: 0.85 });
  drawLogo(ov, { y: 1470, scale: 0.55 });
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
