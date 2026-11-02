// THE CURIOUS AFFAN — Episode 009: "Kenapa Langit Berwarna Biru?"
// Every shot is a pure function of time t (seconds), synced to audio/narration.mp3.
import * as THREE from 'three';
import { makeRenderer, loadEnvelope, toScreen, clamp, lerp, inv, easeOut, easeIn, easeInOut, keys, wobble, rng, W, H } from '../../shared/core.js';
import { POSES, blinkAt } from '../../shared/affan.js';
import { Overlay, pop, ICONS, drawLogo } from '../../shared/overlay.js';
import { CAPTIONS, KEYWORDS } from './captions.js';
import { buildPark, buildMicro, buildDiagram, buildOutro, SPECTRUM, LAMBDA, ER, AH } from './worlds.js';

const FPS = 30;
const DURATION = 47.5;

const stage = document.getElementById('stage');
const canvas = document.createElement('canvas');
stage.appendChild(canvas);
const renderer = makeRenderer(canvas);
const ov = new Overlay(stage);
const park = buildPark();
const micro = buildMicro();
const dia = buildDiagram();
const outro = buildOutro();
const cam = new THREE.PerspectiveCamera(50, W / H, 0.05, 4000);
const ocam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 200);
park.cam = micro.cam = outro.cam = cam;
dia.cam = ocam;
let env = { at: () => 0 };
window.DBG = { park, micro, dia, outro, THREE }; // handles for --eval tuning

// offscreen copy of the previous shot, for crossfades and iris wipes
const snap = document.createElement('canvas');
snap.width = W;
snap.height = H;
const snapG = snap.getContext('2d');

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const talk = (t) => clamp(env.at(t) * 1.2);
const scr = (p, c = cam) => toScreen(p, c);
const hex = (c) => '#' + c.toString(16).padStart(6, '0');
function lookCam(pos, look, fov = 50) {
  cam.position.copy(pos);
  cam.fov = fov;
  cam.updateProjectionMatrix();
  cam.lookAt(look);
  cam.updateMatrixWorld(true);
}
function setOrtho(cx, cy, h) {
  const w = h * (W / H);
  Object.assign(ocam, { left: -w / 2, right: w / 2, top: h / 2, bottom: -h / 2 });
  ocam.position.set(cx, cy, 50);
  ocam.lookAt(cx, cy, 0);
  ocam.updateProjectionMatrix();
  ocam.updateMatrixWorld(true);
}
const lerpV = (a, b, k) => a.map((v, i) => lerp(v, b[i], k));

const BLUE = '#2f9bff', ORANGE = '#ff8a3d', NAVY = '#17256b';
const DAY_SUN = V(0.45, 0.75, 0.5).normalize();
const SET_SUN = V(-0.72, 0.035, -0.69).normalize();
const GOLD_SUN = V(-0.72, 0.16, -0.69).normalize();
const ROCKET_HOME = [3.4, 0, -2.2];

// ------------------------------------------------------------ overlay bits
function pinTag(id, text, p, t, a, b, style, dy = -90) {
  const q = pop(t, a, b);
  if (q.o <= 0 || !p.visible) return;
  const hw = text.length * (style.small ? 14 : 19) + 50;
  ov.tag(id, text, { x: clamp(p.x, hw + 30, W - hw - 30), y: clamp(p.y + dy, 300, 1380), o: q.o, s: q.s }, style);
}
function arrow(x1, y1, x2, y2, { color = BLUE, w = 10, a = 1, head = 24 } = {}) {
  if (a <= 0) return;
  ov.line(x1, y1, x2, y2, { color, w, a });
  const g = ov.g;
  const ang = Math.atan2(y2 - y1, x2 - x1);
  const tri = (s, c) => {
    g.fillStyle = c;
    g.beginPath();
    g.moveTo(x2 + Math.cos(ang) * s, y2 + Math.sin(ang) * s);
    g.lineTo(x2 + Math.cos(ang + 2.4) * s, y2 + Math.sin(ang + 2.4) * s);
    g.lineTo(x2 + Math.cos(ang - 2.4) * s, y2 + Math.sin(ang - 2.4) * s);
    g.closePath();
    g.fill();
  };
  g.save();
  g.globalAlpha = clamp(a);
  tri(head + 9, 'rgba(255,255,255,0.9)');
  tri(head, color);
  g.restore();
}
// Vertical speed streaks (moving down = we are flying up).
function vstreaks(t, { x0 = 0, x1 = W, n = 16, a = 0.5, seed = 4 } = {}) {
  if (a <= 0) return;
  const g = ov.g;
  const R = rng(seed);
  for (let i = 0; i < n; i++) {
    const x = x0 + R() * (x1 - x0), len = 160 + R() * 260, sp = 2200 + R() * 1500, ph = R() * 3000;
    const y = ((ph + t * sp) % (H + len * 2)) - len;
    const gr = g.createLinearGradient(0, y, 0, y - len);
    gr.addColorStop(0, `rgba(255,255,255,${a})`);
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.strokeStyle = gr;
    g.lineWidth = 3 + R() * 5;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x, y - len);
    g.stroke();
  }
}
// A glowing light beam on the overlay with an optional colour gradient.
function glowBeam(p0, p1, stops, w, a = 1) {
  if (a <= 0) return;
  const g = ov.g;
  const gr = g.createLinearGradient(p0.x, p0.y, p1.x, p1.y);
  for (const [f, c] of stops) gr.addColorStop(f, c);
  g.save();
  g.lineCap = 'round';
  g.strokeStyle = gr;
  g.globalCompositeOperation = 'lighter';
  for (const [lw, al] of [[w * 3.2, 0.12], [w * 1.8, 0.22]]) {
    g.globalAlpha = a * al;
    g.lineWidth = lw;
    g.beginPath();
    g.moveTo(p0.x, p0.y);
    g.lineTo(p1.x, p1.y);
    g.stroke();
  }
  g.globalCompositeOperation = 'source-over';
  g.globalAlpha = a;
  g.lineWidth = w;
  g.beginPath();
  g.moveTo(p0.x, p0.y);
  g.lineTo(p1.x, p1.y);
  g.stroke();
  g.restore();
}
// Soft additive glow; rgb = [r, g, b].
function blob(x, y, r, rgb, a) {
  if (a <= 0) return;
  const g = ov.g;
  const gr = g.createRadialGradient(x, y, 0, x, y, r);
  gr.addColorStop(0, `rgba(${rgb},0.9)`);
  gr.addColorStop(1, `rgba(${rgb},0)`);
  g.save();
  g.globalAlpha = clamp(a);
  g.globalCompositeOperation = 'lighter';
  g.fillStyle = gr;
  g.fillRect(x - r, y - r, r * 2, r * 2);
  g.restore();
}
// Double-headed measuring bracket alongside a segment, offset by `off` px.
function bracket(p0, p1, off, color, a, t) {
  if (a <= 0) return;
  const dx = p1.x - p0.x, dy = p1.y - p0.y, L = Math.hypot(dx, dy) || 1;
  const nx = -dy / L, ny = dx / L;
  const A = { x: p0.x + nx * off, y: p0.y + ny * off }, B = { x: p1.x + nx * off, y: p1.y + ny * off };
  const k = easeOut(clamp(a * 1.4));
  const mid = { x: (A.x + B.x) / 2, y: (A.y + B.y) / 2 };
  const a2 = { x: lerp(mid.x, A.x, k), y: lerp(mid.y, A.y, k) }, b2 = { x: lerp(mid.x, B.x, k), y: lerp(mid.y, B.y, k) };
  arrow(mid.x, mid.y, a2.x, a2.y, { color, w: 8, a, head: 18 });
  arrow(mid.x, mid.y, b2.x, b2.y, { color, w: 8, a, head: 18 });
  return { x: mid.x + nx * 46, y: mid.y + ny * 46 };
}
// Question marks that pop around a point (animated question-mark beats).
function qmarks(t, a, b, cx, cy, seed = 1) {
  const spots = [[-260, -200, '#ffcf33', -12], [250, -250, '#3fa2ff', 10], [300, -40, '#ffcf33', 14]];
  spots.forEach(([dx, dy, c, r], i) => {
    const q = pop(t, a + i * 0.22, b);
    if (q.o > 0) ov.html('q' + seed + i, ICONS.qmark(c), { x: cx + dx, y: cy + dy + Math.sin(t * 3 + i) * 10, o: q.o, s: q.s * 0.8, r });
  });
}
const CARD = (text, bg, icon) => `<div style="display:flex;align-items:center;gap:16px;padding:16px 30px 20px 22px;border-radius:34px;background:${bg};box-shadow:0 10px 0 rgba(0,0,0,0.18),0 0 0 7px #fff;font-family:'Baloo 2';font-weight:800;font-size:52px;color:#fff;line-height:1;white-space:nowrap">${icon}<span>${text}</span></div>`;
const SKY_ICON = (top, bot, sun) => `<svg width="74" height="74" viewBox="0 0 74 74"><defs><linearGradient id="s${top.slice(1)}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bot}"/></linearGradient></defs><rect x="3" y="3" width="68" height="68" rx="18" fill="url(#s${top.slice(1)})" stroke="#fff" stroke-width="5"/><circle cx="${sun[0]}" cy="${sun[1]}" r="11" fill="#fff6c8"/><path d="M3 56 Q37 44 71 56 V71 H3 Z" fill="#3fae5a"/></svg>`;

// --------------------------------------------------------------- park helpers
function parkBase({ k = 0, green = 0, alt = 0, dir = DAY_SUN } = {}) {
  park.setSky({ k, green, alt, dir });
  park.sea.visible = false;
  park.prism.visible = false;
  park.white.visible = false;
  park.fan.forEach((b) => (b.visible = false));
  park.aff.root.visible = true;
  park.aff.root.position.set(0, 0, 0);
  const r = park.rocket;
  r.visible = true;
  r.position.set(...ROCKET_HOME);
  r.rotation.set(0, -0.35, 0);
  r.userData.setFlame(0, 0);
  r.userData.pilot.root.visible = false;
}
function affPose(t, p = {}, seed = 1) {
  park.aff.pose({ blink: blinkAt(t, seed), talk: talk(t), ...p });
}
function pilotPose(t, p = {}) {
  park.rocket.userData.pilot.pose({ blink: blinkAt(t, 5), talk: talk(t), armL: { reach: [0.55, 0.3, 0.3] }, armR: { reach: [-0.55, 0.3, 0.3] }, ...p });
}
const headW = () => park.aff.parts.head.getWorldPosition(V(0, 0, 0));

// ======================================================================= SHOTS
// [start, end, fn, transition-in]
const SHOTS = [
  // S1 — hook: close-up of Affan's curious face, then he looks up at the sky
  [0, 4.4, (t) => {
    const g = keys(t, [[3.25, 0], [3.6, 0.85], [3.95, 0.85], [4.3, 0]]);
    parkBase({ green: g });
    const up = easeInOut(inv(1.25, 2.1, t));
    const think = keys(t, [[1.7, 0], [2.05, 1], [2.85, 1], [3.15, 0]]);
    const shrug = keys(t, [[3.1, 0], [3.4, 1], [4.0, 1], [4.35, 0.3]]);
    const th = POSES.thinkR.armR;
    affPose(t, {
      headPitch: lerp(0.02, -0.42, up) + 0.03 * wobble(t, 1), headYaw: lerp(0.0, -0.25, up) + 0.04 * wobble(t, 3), headRoll: lerp(0, -0.1, think),
      lookY: lerp(0.05, 0.75, up), lookX: lerp(0, -0.35, up), brow: lerp(0.6, 0.9, up), smile: 0.85,
      armR: shrug > 0.01 ? { reach: lerpV([-0.55, 0.3, 0.25], [-1.0, 0.8, 0.55], shrug), pole: [-1, -1, -0.4], wz: 0.6 * shrug } : think > 0.01 ? { reach: lerpV([-0.55, 0.3, 0.25], th.reach, think), pole: th.pole, point: think, wx: th.wx * think } : {},
      armL: shrug > 0.01 ? { reach: lerpV([0.55, 0.3, 0.25], [1.0, 0.8, 0.55], shrug), pole: [1, -1, -0.4], wz: -0.6 * shrug } : {},
    });
    const k = easeInOut(inv(1.15, 2.6, t));
    lookCam(V(...lerpV([0.3, 3.0, 3.8], [1.3, 1.75, 7.2], k)).add(V(0, 0, 0.15 * inv(0, 1.2, t))), V(...lerpV([0, 2.92, 0], [-0.2, 3.5, -1.2], k)), lerp(40, 50, k));
    park.aim(V(0, 1, 0), cam.position);
    const p = pop(t, 1.3, 4.35, { fin: 0.45 });
    ov.bubble('hook', 'KENAPA LANGIT\nBIRU?', { x: W / 2, y: 430 + Math.sin(t * 3) * 6, o: p.o, s: p.s }, { size: 116, top: '#bff0ff', bot: '#2f9bff' });
    const q = pop(t, 1.6, 4.35);
    ov.tag('ep', 'EPISOD 9', { x: W / 2, y: 268, o: q.o, s: q.s }, { bg: '#2f7bff', small: true });
    const gq = pop(t, 3.62, 4.3);
    ov.tag('hijau', 'HIJAU?', { x: 290, y: 1200, o: gq.o, s: gq.s, r: -6 }, { bg: '#3fae5a' });
    const x = pop(t, 3.85, 4.3, { from: 2 });
    ov.html('cross', ICONS.cross(), { x: 470, y: 1150, o: x.o, s: x.s * 0.45 });
    const hp = scr(headW());
    qmarks(t, 2.15, 4.35, clamp(hp.x, 300, 780), clamp(hp.y, 600, 1100), 1);
    return park;
  }],
  // S2 — "Jom ikut Affan terbang ke langit!": into the rocket and lift-off through the clouds
  [4.4, 6.72, (t) => {
    parkBase({ alt: 0.6 * easeIn(inv(5.6, 6.72, t)) });
    park.aff.root.visible = false;
    const r = park.rocket;
    const ry = 52 * Math.pow(inv(5.2, 6.72, t), 2.2);
    r.position.set(ROCKET_HOME[0], ry + 0.03 * Math.sin(t * 50) * inv(4.95, 5.2, t), ROCKET_HOME[2]);
    r.rotation.set(0, -0.35 + 0.25 * inv(5.2, 6.72, t), 0);
    r.userData.setFlame(keys(t, [[4.95, 0], [5.15, 0.55], [5.4, 1]]), t);
    r.userData.pilot.root.visible = true;
    park.sea.visible = t > 5.6;
    const up = keys(t, [[4.46, 0], [4.7, 1], [5.6, 1], [5.9, 0.4]]);
    pilotPose(t, {
      smile: 1, brow: 0.7, headPitch: lerp(0, -0.25, up), lookY: 0.2 * up,
      armL: { reach: lerpV([0.55, 0.3, 0.3], [0.75, 1.95 + 0.06 * Math.sin(t * 14), 0.45], up), pole: [1, -0.3, -0.5], point: up },
    });
    const k = easeInOut(inv(4.4, 6.72, t));
    const cx = ROCKET_HOME[0], cz = ROCKET_HOME[2];
    lookCam(V(cx + lerp(3.6, 4.6, k), lerp(4.4, 1.6, k) + ry * 0.82, cz + lerp(8.2, 9.5, k)), V(cx, ry + lerp(2.9, 3.4, k), cz), lerp(44, 56, k));
    park.aim(V(cx, ry + 2, cz), cam.position);
    const rp = scr(V(cx, ry + 0.2, cz));
    vstreaks(t, { a: 0.55 * inv(5.4, 5.9, t) });
    if (t > 5.1) ov.sparkles(t, { n: 18, seed: 22, x: rp.x - 180, y: rp.y, w: 360, h: 420, a: inv(5.1, 5.5, t), size: 24 });
    // soft white-out as the camera passes through the cloud layer
    ov.flash(easeIn(inv(6.15, 6.72, t)) * 0.92, '255,255,255');
    return park;
  }],
  // S3 — above the clouds: sunlight through Affan's prism shows its colours
  [6.72, 11.05, (t) => {
    const LIGHT = V(-0.86, 0.5, 0).normalize();
    parkBase({ alt: 1, dir: LIGHT });
    park.aff.root.visible = false;
    park.sea.visible = true;
    const r = park.rocket;
    r.position.set(0, 58 + 0.18 * Math.sin(t * 1.8), 0);
    r.rotation.set(0.03 * Math.sin(t * 1.3), 0.25, 0.04 * Math.sin(t * 1.1));
    r.userData.setFlame(0.32, t);
    r.userData.pilot.root.visible = true;
    // prism + beams
    const pp = V(1.25, 64.7, 1.5);
    const pr = park.prism;
    const ps = easeOut(clamp((t - 6.95) / 0.45));
    pr.visible = ps > 0;
    pr.position.copy(pp).add(V(0, 0.12 * Math.sin(t * 2), 0));
    pr.rotation.set(0.1, 0.25 + 0.05 * Math.sin(t), 0.18);
    pr.scale.setScalar(Math.max(0.001, ps * (1 + 0.15 * Math.sin(Math.min(1, (t - 6.95) / 0.45) * Math.PI))));
    const src = pp.clone().addScaledVector(LIGHT, 22);
    park.white.userData.set(src, pp, easeOut(inv(7.15, 7.75, t)), 1);
    const exit = pp.clone().add(V(0.25, -0.1, 0));
    const fk = easeOut(inv(7.7, 8.7, t));
    park.fan.forEach((b, i) => {
      const a = -(36 + 5.2 * i) * Math.PI / 180; // red bends least, violet most
      const d = V(Math.cos(a), Math.sin(a), 0.12);
      b.userData.set(exit, exit.clone().addScaledVector(d, 6.4), fk, 1);
    });
    const ex = r.userData.pilot.toTorso(pp);
    const fanMid = exit.clone().addScaledVector(V(0.64, -0.77, 0.1), 3.5);
    const fanT = r.userData.pilot.toTorso(fanMid);
    const pt = keys(t, [[8.7, 0], [9.05, 1], [10.6, 1], [10.95, 0.4]]);
    const wow = keys(t, [[6.76, 0], [6.9, 1], [7.55, 1], [7.8, 0]]);
    pilotPose(t, {
      smile: 1, brow: lerp(0.6, 1, wow), wow, talk: talk(t) * (1 - wow),
      headYaw: keys(t, [[6.72, 0.15], [7.2, 0.55], [8.6, 0.6], [9.2, 0.85]]), headPitch: keys(t, [[6.72, -0.15], [7.4, -0.35], [8.6, -0.3], [9.2, -0.05]]),
      lookX: 0.45, lookY: keys(t, [[6.72, 0.2], [7.4, 0.5], [9.2, 0.1]]),
      armL: pt > 0.01 ? { reach: lerpV([0.55, 0.3, 0.3], [lerp(0.6, fanT[0], 0.3), Math.max(1.6, fanT[1] * 0.3), 0.75], pt), pole: [1, -0.6, -0.4], point: pt } : { reach: [0.55, 0.3, 0.3] },
      armR: { reach: lerpV([-0.55, 0.3, 0.3], [-0.85, 1.75, 0.45], wow), pole: [-1, -0.4, -0.5] },
    });
    void ex;
    const k = easeInOut(inv(6.72, 11.05, t));
    lookCam(V(lerp(2.6, 1.8, k), lerp(62.2, 62.6, k), lerp(12.5, 11.2, k)), V(lerp(1.0, 0.9, k), 62.3, 0.5), 50);
    park.aim(V(0, 61, 0), cam.position);
    ov.flash((1 - easeOut(inv(6.72, 7.25, t))) * 0.92, '255,255,255');
    const wb = scr(pp.clone().addScaledVector(LIGHT, 6));
    pinTag('cm', 'CAHAYA MATAHARI', wb, t, 8.04, 11.0, { bg: '#f2a91c', pointer: 'down' }, -110);
    const fe = scr(exit.clone().addScaledVector(V(0.64, -0.77, 0.1), 5.6));
    const q = pop(t, 9.7, 11.0);
    if (q.o > 0) ov.tag('pw', 'PELBAGAI WARNA', { x: clamp(fe.x, 600, 750), y: clamp(fe.y + 110, 300, 1340), o: q.o, s: q.s }, { bg: '#8a4dff', pointer: 'up' });
    ov.sparkles(t, { n: 16, seed: 31, x: 380, y: 420, w: 640, h: 700, a: fk * 0.8, size: 20 });
    return park;
  }],
  // S4 — micro world: white light (all colours) meets the tiny air molecules
  [11.05, 15.9, (t) => {
    micro.update(t);
    for (const m of micro.mols) m.visible = true;
    micro.laneB.visible = micro.laneR.visible = false;
    micro.waveB.visible = micro.waveR.visible = false;
    for (const k of ['B', 'R']) {
      micro.rings[k].forEach((m) => (m.visible = false));
      micro.photons[k].forEach((s) => (s.visible = false));
    }
    const c = 6;
    const head = -7 + c * (t - 11.05);
    micro.braid.forEach((w, i) => {
      w.position.set(0, 0.1, 1.0);
      w.userData.set({ ph: (2 * Math.PI * c * t) / LAMBDA[i], amp: 0.5, head, op: 1 });
    });
    micro.hero.visible = micro.heroO.visible = true;
    micro.hero.position.set(-1.0, 0.25, 1.4);
    micro.heroO.position.set(1.7, -1.35, 0.6);
    const r = micro.rocket;
    r.visible = true;
    r.position.set(3.6 - 0.3 * inv(11.05, 15.9, t), -5.2 + 0.15 * Math.sin(t * 1.7), 2.5);
    r.rotation.set(0, -0.9, 0.08 * Math.sin(t * 1.2));
    r.userData.setFlame(0.25, t);
    r.userData.pilot.pose({ blink: blinkAt(t, 7), talk: talk(t), smile: 1, brow: 0.8, headYaw: -0.35, headPitch: -0.25, lookY: 0.5, lookX: -0.3, armL: { reach: [0.55, 0.3, 0.3] }, armR: { reach: [-0.55, 0.3, 0.3] } });
    const k = easeInOut(inv(13.0, 14.6, t));
    lookCam(V(...lerpV([0.6, 0.3, 21], [-0.5, 0.7, 9.6], k)), V(...lerpV([0.3, -0.6, 0], [-0.4, -0.2, 1.0], k)), lerp(50, 46, k));
    const hp = scr(micro.hero.position);
    pinTag('mu', 'MOLEKUL UDARA', hp, t, 13.94, 15.85, { bg: '#ff8a5b', pointer: 'down' }, -150);
    const op = scr(micro.heroO.position);
    const n1 = pop(t, 14.2, 15.85), n2 = pop(t, 14.4, 15.85);
    if (hp.visible) ov.html('n2', `<div style="font-family:'Baloo 2';font-weight:800;font-size:68px;color:#dcd6ff;text-shadow:0 3px 0 ${NAVY}">N₂</div>`, { x: hp.x + 120, y: hp.y + 90, o: n1.o, s: n1.s });
    if (op.visible) ov.html('o2', `<div style="font-family:'Baloo 2';font-weight:800;font-size:68px;color:#ffb894;text-shadow:0 3px 0 ${NAVY}">O₂</div>`, { x: clamp(op.x + 110, 120, 960), y: clamp(op.y + 80, 300, 1350), o: n2.o, s: n2.s });
    const sk = pop(t, 15.14, 15.85);
    ov.tag('sk', 'SANGAT KECIL!', { x: W / 2, y: 1270, o: sk.o, s: sk.s }, { bg: '#1f6fd6', small: true });
    const lt = pop(t, 11.3, 13.2);
    ov.tag('wl', 'CAHAYA PUTIH = SEMUA WARNA', { x: W / 2, y: 330, o: lt.o, s: lt.s }, { bg: '#f2a91c', small: true });
    // iris (magnifier) edge while we zoom in from the sky
    return micro;
  }, { d: 0.75, type: 'iris' }],
  // S5a — Rayleigh scattering: blue scatters much more than red
  [15.9, 20.48, (t) => {
    micro.update(t);
    for (const m of micro.mols) m.visible = m.userData.home.z < -9;
    micro.hero.visible = micro.heroO.visible = false;
    micro.rocket.visible = false;
    micro.braid.forEach((w) => (w.visible = false));
    const c = 3.2;
    const yB = 3.3, yR = -1.7;
    micro.laneB.visible = micro.laneR.visible = true;
    micro.laneB.position.set(0, yB, 0);
    micro.laneR.position.set(0, yR, 0);
    const t0 = 15.95;
    const head = -4.6 + c * (t - t0);
    const hit = t0 + 4.6 / c; // wave front reaches the molecule
    micro.waveB.position.set(0, yB, 0);
    micro.waveR.position.set(0, yR, 0);
    micro.waveB.userData.set({ ph: (2 * Math.PI * c * t) / LAMBDA[4], amp: 0.62, amp2: 0.34, cut: 0, head, op: 1 });
    micro.waveR.userData.set({ ph: (2 * Math.PI * c * t) / LAMBDA[0], amp: 0.62, amp2: 0.58, cut: 0, head, op: 1 });
    // scattered wavelets: one ring per wave period; red rings ~1/6 as strong (Rayleigh ~ 1/wavelength^4)
    const rmax = 6.5;
    for (const [key, lane, lam, strength, nPh] of [['B', yB, LAMBDA[4], 0.9, 14], ['R', yR, LAMBDA[0], 0.15, 2]]) {
      const per = lam / c;
      const rings = micro.rings[key], phs = micro.photons[key];
      rings.forEach((m) => (m.visible = false));
      phs.forEach((s) => (s.visible = false));
      if (t < hit) continue;
      const nEm = Math.floor((t - hit) / per);
      let ri = 0, pi = 0;
      for (let e = nEm; e >= 0 && e > nEm - 8; e--) {
        const te = hit + e * per;
        const rr = c * (t - te);
        if (rr > rmax || rr < 0) continue;
        const fade = 1 - rr / rmax;
        if (ri < rings.length) {
          const m = rings[ri++];
          m.visible = true;
          m.position.set(0, lane, 0);
          m.scale.setScalar(Math.max(0.01, rr));
          m.material.opacity = strength * fade;
        }
        const R = rng(1000 + e * 7 + (key === 'B' ? 0 : 500));
        for (let j = 0; j < nPh && pi < phs.length; j++) {
          const ang = (key === 'B' ? (j / nPh) * Math.PI * 2 : R() * Math.PI * 2) + R() * 0.3;
          const s = phs[pi++];
          s.visible = true;
          s.position.set(Math.cos(ang) * rr, lane + Math.sin(ang) * rr, 0.3);
          s.material.opacity = (key === 'B' ? 0.95 : 0.8) * fade;
          s.scale.setScalar(key === 'B' ? 0.62 : 0.55);
        }
      }
      const glowM = key === 'B' ? micro.laneB : micro.laneR;
      glowM.userData.halo.material.opacity = 0.25 + (key === 'B' ? 0.5 : 0.08) * Math.max(0, Math.cos(((t - hit) / per) * Math.PI * 2));
    }
    const k = easeInOut(inv(15.9, 17.0, t));
    lookCam(V(lerp(-1.2, 0, k), lerp(1.4, 0.9, k), lerp(11, 15.2, k)), V(0, 0.9, 0), 50);
    const lb = scr(V(-3.0, yB, 0)), lr = scr(V(-3.0, yR, 0));
    const tb = pop(t, 16.38, 20.45), tr = pop(t, 16.6, 20.45);
    ov.tag('tB', 'BIRU', { x: 175, y: lb.y - 120, o: tb.o, s: tb.s }, { bg: BLUE });
    const pulse = t > 19.98 && t < 20.4 ? 1 + 0.12 * Math.sin(((t - 19.98) / 0.42) * Math.PI) : 1;
    ov.tag('tR', 'MERAH', { x: 195, y: lr.y - 120, o: tr.o, s: tr.s * pulse }, { bg: '#e8484a' });
    void lr;
    const cb = pop(t, 17.48, 20.45, { fin: 0.4 });
    ov.bubble('cbt', 'CAHAYA BIRU\nTERSEBAR', { x: W / 2, y: 300, o: cb.o, s: cb.s * 0.85 }, { size: 100, top: '#bff0ff', bot: '#2f9bff' });
    const sr = pop(t, 18.7, 20.45);
    ov.tag('ray', 'SERAKAN RAYLEIGH', { x: W / 2, y: scr(V(0, (yB + yR) / 2 - 0.2, 0)).y, o: sr.o, s: sr.s }, { bg: NAVY, small: true });
    return micro;
  }, { d: 0.45, type: 'fade' }],
  // S5b — zoom out: scattered blue light reaches us from every part of the sky
  [20.48, 23.5, (t) => {
    parkBase({ dir: DAY_SUN });
    park.rocket.visible = true;
    const open = keys(t, [[22.1, 0], [22.5, 1], [23.5, 1]]);
    affPose(t, {
      yaw: 0.2, headPitch: -0.55, headYaw: -0.1, lookY: 0.8, lookX: -0.1, smile: 1, brow: 0.8,
      armL: { reach: lerpV([0.55, 0.3, 0.25], [1.1, 1.55, 0.3], open), pole: [1, -0.6, -0.4] },
      armR: { reach: lerpV([-0.55, 0.3, 0.25], [-1.1, 1.55, 0.3], open), pole: [-1, -0.6, -0.4] },
    }, 2);
    const k = easeOut(inv(20.48, 23.5, t));
    lookCam(V(lerp(1.6, 2.4, k), lerp(1.0, 1.2, k), lerp(5.2, 7.4, k)), V(-0.4, lerp(4.2, 5.2, k), -4), lerp(52, 58, k));
    park.aim(V(0, 1, 0), cam.position);
    const hp = scr(headW().add(V(0, 0.1, 0)));
    // sunlight crossing the sky (sun itself is off-screen, behind the camera)
    const a = inv(20.6, 21.1, t);
    const s0 = { x: W + 40, y: 470 }, s1 = { x: -40, y: 860 };
    glowBeam(s0, s1, [[0, 'rgba(255,250,230,0.95)'], [1, 'rgba(255,250,230,0.7)']], 16, a * 0.9);
    // blue light scattered towards Affan's eyes from many directions
    const R = rng(77);
    for (let i = 0; i < 9; i++) {
      const f = 0.08 + (i / 8) * 0.84;
      const p0 = { x: lerp(s0.x, s1.x, f), y: lerp(s0.y, s1.y, f) };
      const delay = 21.0 + R() * 0.8;
      const kk = easeOut(inv(delay, delay + 0.6, t));
      const tip = { x: lerp(p0.x, hp.x, kk * 0.62), y: lerp(p0.y, hp.y - 30, kk * 0.62) };
      arrow(p0.x, p0.y, tip.x, tip.y, { color: '#3fa2ff', w: 8, a: kk * (1 - inv(23.2, 23.5, t)), head: 18 });
      blob(p0.x, p0.y, 40, [94, 200, 255], kk);
    }
    ov.sparkles(t, { n: 40, seed: 9, x: 40, y: 250, w: 1000, h: 650, a: 0.8 * inv(20.6, 21.4, t), size: 16, colors: ['#bfe8ff', '#6cc0ff', '#ffffff'] });
    const lb = pop(t, 22.12, 23.48, { fin: 0.4 });
    ov.bubble('lb', 'LANGIT BIRU', { x: W / 2, y: 330, o: lb.o, s: lb.s }, { size: 140, top: '#bff0ff', bot: '#2f9bff' });
    return park;
  }, { d: 0.5, type: 'fade' }],
  // S6 — "Tapi... kenapa waktu senja jadi oren?": the sky turns to sunset
  [23.5, 26.92, (t) => {
    const k = easeInOut(inv(23.9, 26.2, t));
    const dir = DAY_SUN.clone().lerp(SET_SUN, k).normalize();
    parkBase({ k, dir });
    const th = POSES.thinkR.armR;
    const think = keys(t, [[23.5, 0], [23.8, 1], [25.0, 1], [25.3, 0]]);
    const wow = keys(t, [[25.9, 0], [26.15, 1], [26.92, 1]]);
    affPose(t, {
      yaw: 0.25, headPitch: lerp(-0.2, -0.5, k), headYaw: lerp(-0.1, 0.15, k), headRoll: -0.1 * think, lookY: lerp(0.3, 0.75, k), lookX: 0.2,
      smile: 0.9, brow: 0.6 + 0.4 * wow, wow: wow * 0.8, talk: talk(t) * (1 - wow * 0.6),
      armR: think > 0.01 ? { reach: lerpV([-0.55, 0.3, 0.25], th.reach, think), pole: th.pole, point: think, wx: th.wx * think } : { reach: lerpV([-0.55, 0.3, 0.25], [-0.85, 1.2, 0.6], wow), pole: [-1, -0.6, -0.4] },
      armL: { reach: lerpV([0.55, 0.3, 0.25], [0.85, 1.2, 0.6], wow), pole: [1, -0.6, -0.4] },
    }, 3);
    const c = easeInOut(inv(23.5, 26.92, t));
    lookCam(V(lerp(2.6, 1.9, c), lerp(1.4, 1.2, c), lerp(7.0, 6.2, c)), V(lerp(-1.6, -1.2, c), lerp(3.6, 3.9, c), -6), 54);
    park.aim(V(0, 1, 0), cam.position);
    const hp = scr(headW());
    qmarks(t, 23.6, 26.9, clamp(hp.x, 300, 780), clamp(hp.y, 600, 1000), 2);
    const so = pop(t, 25.44, 26.9, { fin: 0.4 });
    ov.bubble('so', 'SENJA OREN?', { x: W / 2, y: 360, o: so.o, s: so.s }, { size: 130, top: '#ffe08a', bot: '#ff7a3d' });
    ov.sparkles(t, { n: 18, seed: 61, x: 60, y: 260, w: 960, h: 500, a: 0.6 * k, size: 18, colors: ['#ffe0a0', '#ffb36b', '#ffffff'] });
    return park;
  }, { d: 0.45, type: 'fade' }],
  // S7 — Earth/atmosphere cutaway: at sunset sunlight crosses far more air
  [26.92, 35.75, (t) => {
    const theta = (Math.PI / 2) * easeInOut(inv(27.6, 28.75, t));
    const d = V(-Math.sin(theta), Math.cos(theta), 0);
    const P = V(0, ER, 0);
    const sPos = P.clone().addScaledVector(d, 7.6);
    dia.sunG.position.set(sPos.x, sPos.y, 1);
    dia.sun.position.copy(d).multiplyScalar(60);
    dia.sun.target.position.set(0, 0, 0);
    const pd = P.dot(d);
    const sAtm = -pd + Math.sqrt(pd * pd - (ER * ER - (ER + AH) * (ER + AH)));
    const E = P.clone().addScaledVector(d, sAtm);
    const zk = easeInOut(inv(32.9, 34.2, t));
    setOrtho(lerp(-3.3, -0.9, zk), lerp(12.2, 12.9, zk), lerp(19, 8.2, zk));
    // Affan on top of the Earth: looks at us (never at the sun)
    dia.aff.pose({ blink: blinkAt(t, 8), talk: talk(t), smile: 1, brow: 0.6 + 0.4 * zk, wow: keys(t, [[34.75, 0], [34.95, 0.7], [35.6, 0.7]]), headPitch: -0.05, lookY: 0.05 });
    dia.dots.forEach((s, i) => (s.material.opacity = 0.35 + 0.35 * Math.sin(t * 3 + i)));
    const sp = scr(sPos, ocam), ep = scr(E, ocam), pp = scr(P.clone().add(V(0, 0.35, 0)), ocam);
    // noon ghost (short path), shown once the sun has moved
    const noonE = scr(P.clone().add(V(0, AH, 0)), ocam);
    const ghost = inv(28.6, 29.0, t) * (1 - inv(32.6, 33.0, t));
    glowBeam(noonE, pp, [[0, 'rgba(255,250,235,1)'], [1, 'rgba(255,246,215,1)']], 14, ghost * 0.6);
    // the beam: outside the atmosphere it is white; inside, blue is scattered out along the way
    const colour = inv(31.2, 32.5, t);
    const TAU = [0.091, 0.177, 0.395]; // per unit of air, for red, green, blue (~ 1/wavelength^4)
    const stops = [];
    for (let i = 0; i <= 8; i++) {
      const x = (i / 8) * sAtm;
      const c = TAU.map((tau) => Math.exp(-tau * x));
      const m = Math.max(...c);
      const rgb = c.map((v) => Math.round(lerp(255, (v / m) * 255, colour)));
      stops.push([i / 8, `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`]);
    }
    const ba = inv(27.0, 27.35, t);
    glowBeam(sp, ep, [[0, '#fff8de'], [1, '#fffaf0']], 18, ba);
    glowBeam(ep, pp, stops, 18, ba);
    // blue light peeling out of the long sunset path
    const peel = inv(31.1, 31.6, t) * (1 - inv(35.4, 35.75, t));
    if (peel > 0) {
      const R = rng(19);
      for (let i = 0; i < 70; i++) {
        const f = Math.pow(R(), 1.4);
        const ang = R() * Math.PI * 2;
        const per = 1.1 + R() * 0.6;
        const life = ((t - 31.1 + R() * per) % per) / per;
        const base = E.clone().lerp(P, f);
        const q = base.add(V(Math.cos(ang), Math.sin(ang), 0).multiplyScalar(life * 2.6));
        const s = scr(q, ocam);
        const blue = R() < 0.82;
        ov.dot(s.x, s.y, (blue ? 9 : 7) * (1 - life * 0.5), blue ? '#3fa2ff' : '#8a4dff', peel * (1 - life) * 0.95);
      }
    }
    // labels
    pinTag('siang', 'SIANG', sp, t, 26.96, 27.9, { bg: '#f2a91c', small: true }, 110);
    pinTag('senja', 'SENJA', sp, t, 28.5, 33.0, { bg: ORANGE, small: true }, -120);
    const pd1 = pop(t, 28.75, 32.9);
    if (pd1.o > 0) {
      const lp = bracket(noonE, pp, -70, '#ffd84a', pd1.o, t);
      ov.tag('pendek', 'PENDEK', { x: clamp(lp.x + 50, 200, 900), y: lp.y - 40, o: pd1.o, s: pd1.s }, { bg: '#f2a91c', small: true });
    }
    const pj = pop(t, 29.18, 32.9);
    if (pj.o > 0) {
      const lp = bracket(ep, pp, 70, '#7cdcff', pj.o, t);
      ov.tag('panjang', 'PANJANG', { x: clamp(lp.x, 200, 880), y: lp.y + 20, o: pj.o, s: pj.s }, { bg: '#1f6fd6', small: true });
    }
    const lu = pop(t, 29.98, 31.6);
    ov.tag('lbu', 'LEBIH BANYAK UDARA', { x: W / 2, y: 330, o: lu.o, s: lu.s }, { bg: NAVY });
    const bt = pop(t, 31.74, 35.7);
    ov.tag('bt', 'BIRU TERSERAK', { x: W / 2, y: 330, o: bt.o, s: bt.s }, { bg: BLUE });
    const o1 = pop(t, 33.46, 35.7), o2 = pop(t, 34.16, 35.7);
    ov.tag('oren', 'OREN', { x: 300, y: 1180, o: o1.o, s: o1.s, r: -5 }, { bg: '#ff8a1f' });
    ov.tag('merah', 'MERAH', { x: 720, y: 1180, o: o2.o, s: o2.s, r: 5 }, { bg: '#e8484a' });
    if (zk > 0) blob(pp.x, pp.y - 60, 420, [255, 150, 60], 0.6 * zk * colour);
    if (t > 34.8) ov.sparkles(t, { n: 20, seed: 71, x: pp.x - 300, y: pp.y - 420, w: 600, h: 500, a: inv(34.8, 35.1, t), size: 22, colors: ['#ffe0a0', '#ffb36b', '#ff7a5a'] });
    return dia;
  }, { d: 0.5, type: 'fade' }],
  // S8 — back in the park at golden hour: "Ooooh!", thumbs-up, what next?
  [35.75, 44.5, (t) => {
    parkBase({ k: 0.55, dir: GOLD_SUN });
    park.rocket.position.set(3.0, 0, -2.6);
    const wow = keys(t, [[35.8, 0], [35.95, 1], [36.85, 1], [37.1, 0]]);
    const ptU = keys(t, [[37.6, 0], [37.95, 1], [40.1, 1], [40.4, 0]]);
    const th = keys(t, [[40.45, 0], [40.85, 1], [42.25, 1], [42.55, 0]]);
    const tk = keys(t, [[42.55, 0], [42.95, 1], [44.5, 1]]);
    const up = POSES.thumbsUpR.armR, th2 = POSES.thinkR.armR;
    const rest = [-0.55, 0.3, 0.25];
    let armR = { reach: lerpV(rest, [-0.62, 1.62, 0.72], wow), pole: [-1, -0.6, -0.3] };
    if (th > 0) armR = { reach: lerpV(rest, up.reach, th), pole: up.pole, thumb: th, wy: up.wy * th, wx: up.wx * th };
    else if (tk > 0) armR = { reach: lerpV(rest, th2.reach, tk), pole: th2.pole, point: tk, wx: th2.wx * tk };
    affPose(t, {
      yaw: 0.12, smile: 1, wow: wow * 0.95, talk: talk(t) * (1 - wow),
      brow: lerp(0.5, 1, wow) + 0.3 * tk, headPitch: -0.32 * ptU - 0.06 * tk + 0.02 * wobble(t, 2), headYaw: 0.2 * ptU + 0.06 * wobble(t, 4), headRoll: -0.12 * tk,
      lookX: 0.35 * tk + 0.3 * ptU, lookY: 0.4 * tk + 0.6 * ptU,
      armL: ptU > 0.01 ? { reach: lerpV([0.55, 0.3, 0.25], [0.95, 2.05, 0.35], ptU), pole: [1, -0.6, -0.3], point: ptU } : { reach: lerpV([0.55, 0.3, 0.25], [0.62, 1.62, 0.72], wow), pole: [1, -0.6, -0.3] },
      armR,
    }, 4);
    const k = easeInOut(inv(35.75, 44.5, t));
    const push = easeInOut(inv(40.3, 41.2, t));
    lookCam(V(lerp(1.3, 0.6, k), lerp(2.6, 2.75, push), lerp(8.4, 6.6, push)), V(-0.15, lerp(2.7, 2.55, push), 0), 50);
    park.aim(V(0, 1, 0), cam.position);
    const ud = pop(t, 37.78, 40.35, { fin: 0.4 });
    ov.bubble('ud', 'UDARA', { x: W / 2, y: 340 + Math.sin(t * 3) * 6, o: ud.o, s: ud.s }, { size: 150, top: '#d6f6ff', bot: '#4fc3ff' });
    const c1 = pop(t, 39.14, 40.35), c2 = pop(t, 39.46, 40.35);
    ov.html('cardB', CARD('LANGIT BIRU', BLUE, SKY_ICON('#2a7de1', '#bfe6ff', [52, 20])), { x: W / 2 - 10, y: 1110, o: c1.o, s: c1.s * 0.85, r: -3 });
    ov.html('cardO', CARD('SENJA OREN', '#ff7a3d', SKY_ICON('#2a3a8a', '#ffa347', [22, 50])), { x: W / 2 + 10, y: 1260, o: c2.o, s: c2.s * 0.85, r: 3 });
    if (th > 0.5) {
      const hand = scr(park.aff.parts.arms.R.hand.getWorldPosition(V(0, 0, 0)));
      ov.sparkles(t, { n: 14, seed: 33, x: hand.x - 170, y: hand.y - 220, w: 340, h: 320, a: inv(40.8, 41.1, t) * (1 - inv(42.1, 42.4, t)), size: 30 });
    }
    const hp = scr(headW());
    qmarks(t, 43.0, 44.5, clamp(hp.x, 300, 780), clamp(hp.y, 600, 1000), 3);
    return park;
  }, { d: 0.5, type: 'fade' }],
  // Outro — The Curious Affan logo + tagline
  [44.5, DURATION, (t) => {
    const k = easeOut(inv(44.5, 45.3, t));
    const up = POSES.thumbsUpR.armR;
    const th = keys(t, [[44.6, 0], [45.0, 1]]);
    outro.aff.pose({ smile: 1, blink: blinkAt(t, 9), headRoll: -0.06, lookX: 0.1, headYaw: 0.08, armR: { reach: lerpV([-0.55, 0.3, 0.25], up.reach, th), pole: up.pole, thumb: th, wy: up.wy * th, wx: up.wx * th } });
    lookCam(V(0, 2.9, lerp(7.4, 5.7, k)), V(0, 2.1, 0), 40);
    const hc = scr(V(0, 2.95, 0));
    const g = ov.g;
    const ra = inv(44.6, 45.2, t);
    g.save();
    g.globalAlpha = ra;
    g.strokeStyle = '#ffe58a';
    g.shadowColor = '#fff3b0';
    g.shadowBlur = 40;
    g.lineWidth = 14;
    g.beginPath();
    g.arc(W / 2, hc.y, 380 * (0.85 + 0.15 * easeOut(ra)), 0, Math.PI * 2);
    g.stroke();
    g.restore();
    ov.sparkles(t, { n: 30, seed: 41, y: 260, h: 1150, a: ra });
    const ic = pop(t, 45.0, 99);
    ov.html('oQ1', ICONS.qmark('#ffcf33'), { x: 880, y: 360 + Math.sin(t * 2 + 1) * 8, o: ic.o, s: ic.s * 0.85, r: 12 });
    ov.html('oQ2', ICONS.qmark('#2f6fff'), { x: 190, y: 560 + Math.sin(t * 2 + 2) * 8, o: ic.o, s: ic.s * 0.6, r: -12 });
    const l1 = pop(t, 44.75, 99), l2 = pop(t, 44.95, 99), l3 = pop(t, 45.15, 99);
    drawLogo(ov, { y: 1010, scale: 0.92, k: [l1, l2, l3], star: pop(t, 45.35, 99) });
    const tg = pop(t, 45.6, 99, { from: 0.6 });
    ov.html('tagline', `<div style="font-family:'Baloo 2';font-weight:800;font-size:64px;color:#fff;white-space:nowrap;text-shadow:0 5px 0 ${NAVY},0 0 18px rgba(23,37,107,0.6);-webkit-text-stroke:3px ${NAVY};paint-order:stroke fill">Little Questions. Big Discoveries!</div>`, { x: W / 2, y: 1490, o: tg.o, s: tg.s });
    return outro;
  }, { d: 0.4, type: 'fade' }],
];

function renderWorld(world) {
  const c = world.cam || cam;
  if (c.isPerspectiveCamera) {
    c.aspect = W / H;
    c.updateProjectionMatrix();
  }
  if (world.sky) world.sky.position.copy(c.position);
  renderer.render(world.scene, c);
}

function shotAt(t) {
  let i = SHOTS.findIndex(([a, b]) => t >= a && t < b);
  return i < 0 ? SHOTS.length - 1 : i;
}

function frame(t) {
  const i = shotAt(t);
  const [a, , fn, tr] = SHOTS[i];
  ov.begin();
  let mix = null;
  if (tr && i > 0 && t < a + tr.d) {
    const prev = SHOTS[i - 1][2](t);
    renderWorld(prev);
    if (prev !== outro && prev !== dia) ov.vignette(0.28);
    snapG.clearRect(0, 0, W, H);
    snapG.drawImage(canvas, 0, 0);
    snapG.drawImage(ov.fx, 0, 0);
    mix = { k: easeInOut((t - a) / tr.d), type: tr.type };
    ov.begin();
  }
  if (mix) {
    const g = ov.g;
    g.save();
    if (mix.type === 'iris') {
      const rr = lerp(30, 1250, mix.k);
      g.beginPath();
      g.rect(0, 0, W, H);
      g.arc(W / 2, 880, rr, 0, Math.PI * 2, true);
      g.clip('evenodd');
      g.drawImage(snap, 0, 0);
      g.restore();
      g.save();
      g.strokeStyle = 'rgba(191,240,255,0.95)';
      g.shadowColor = '#7fd8ff';
      g.shadowBlur = 30;
      g.lineWidth = 22;
      g.beginPath();
      g.arc(W / 2, 880, rr, 0, Math.PI * 2);
      g.stroke();
    } else {
      g.globalAlpha = 1 - mix.k;
      g.drawImage(snap, 0, 0);
    }
    g.restore();
  }
  // draw the current shot underneath the snapshot: render to WebGL canvas, overlay fx above
  const world = fn(t);
  renderWorld(world);
  if (world !== outro && world !== dia) ov.vignette(0.28);
  ov.captions(t, CAPTIONS, KEYWORDS);
  ov.end();
}

// Cover / thumbnail (9:16): Affan amazed under a bright blue sky, pointing up,
// with the rocket, scattering sparkles, big title, episode badge and logo.
const THUMB = { cam: [1.6, 1.3, 6.6], look: [-0.3, 3.9, -2], fov: 54 };
window.setThumb = (o) => Object.assign(THUMB, o);
function thumbnail() {
  ov.begin();
  const t = 2;
  parkBase({ dir: DAY_SUN });
  park.rocket.visible = false;
  park.aff.pose({
    yaw: 0.15, blink: 0, talk: 0, wow: 0.9, brow: 1, headPitch: -0.35, headYaw: -0.05, lookY: 0.7, lookX: -0.1,
    armL: { reach: [0.95, 2.05, 0.35], pole: [1, -0.6, -0.3], point: 1 },
    armR: { reach: [-1.0, 1.4, 0.45], pole: [-1, -0.6, -0.4] },
  });
  lookCam(V(...THUMB.cam), V(...THUMB.look), THUMB.fov);
  park.aim(V(0, 1, 0), cam.position);
  renderWorld(park);
  const g = ov.g;
  const top = g.createLinearGradient(0, 0, 0, 700);
  top.addColorStop(0, 'rgba(8,30,90,0.55)');
  top.addColorStop(1, 'rgba(8,30,90,0)');
  g.fillStyle = top;
  g.fillRect(0, 0, W, 700);
  const bot = g.createLinearGradient(0, H - 820, 0, H);
  bot.addColorStop(0, 'rgba(8,12,44,0)');
  bot.addColorStop(1, 'rgba(8,12,44,0.75)');
  g.fillStyle = bot;
  g.fillRect(0, H - 820, W, 820);
  ov.vignette(0.25);
  // sunlight beam and scattered blue light
  const o = { x: W + 30, y: 640 };
  glowBeam({ x: W + 30, y: 610 }, { x: W - 20, y: 625 }, [[0, '#ffffff'], [1, '#ffffff']], 20, 0.9);
  SPECTRUM.forEach((c, i) => {
    const a = Math.PI - (0.12 + (5 - i) * 0.075); // red on top, as in the prism shot
    glowBeam(o, { x: o.x + Math.cos(a) * 520, y: o.y - Math.sin(a) * 520 + 260 }, [[0, hex(c)], [1, hex(c)]], 16, 0.85);
  });
  const R = rng(5);
  for (let i = 0; i < 9; i++) blob(80 + R() * 920, 640 + R() * 220, 50 + R() * 40, [94, 200, 255], 0.9);
  ov.sparkles(1.3, { n: 22, seed: 17, x: 60, y: 560, w: 960, h: 500, size: 22, colors: ['#bfe8ff', '#6cc0ff', '#ffffff'] });
  ov.tag('thBadge', 'EPISOD 9', { x: W / 2, y: 290 }, { bg: '#2f7bff', small: true });
  ov.bubble('thTitle', 'KENAPA LANGIT\nBIRU?', { x: W / 2, y: 470, r: -2 }, { size: 132, top: '#ffe45c', bot: '#ff9f1c' });
  ov.html('thQ', ICONS.qmark('#ffcf33'), { x: 140, y: 760, r: -14, s: 0.9 });
  ov.html('thQ2', ICONS.qmark('#3fa2ff'), { x: 950, y: 820, r: 12, s: 0.7 });
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
