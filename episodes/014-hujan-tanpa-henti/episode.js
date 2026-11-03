// THE CURIOUS AFFAN — Episode 014: "Apa Jadi Kalau Hujan Tanpa Henti di Malaysia?"
// Day 1, 3, 5 and 10 of non-stop rain in a Malaysian kampung, then the clouds
// move away. Every shot is a pure function of time t (seconds), synced to
// audio/narration.mp3 (word times in captions.js).
import * as THREE from 'three';
import { makeRenderer, loadEnvelope, toScreen, clamp, lerp, inv, easeOut, easeIn, easeInOut, keys, wobble, rng, W, H } from '../../shared/core.js';
import { POSES, blinkAt } from '../../shared/affan.js';
import { Overlay, pop, ICONS, drawLogo } from '../../shared/overlay.js';
import { CAPTIONS, KEYWORDS } from './captions.js';
import { buildKampung, buildOutro, AFF_SCALE } from './worlds.js';

const FPS = 30;
const DURATION = 60.0;
// phase starts (from the narration)
const D1 = 8.8, D3 = 17.2, D5 = 26.8, D10 = 36.16, RELIEF = 43.9, SAFE = 50.45, THINK = 54.75, OUTRO = 57.25;

const stage = document.getElementById('stage');
const canvas = document.createElement('canvas');
stage.appendChild(canvas);
const renderer = makeRenderer(canvas);
const ov = new Overlay(stage);
const K = buildKampung();
const outro = buildOutro();
const cam = new THREE.PerspectiveCamera(50, W / H, 0.05, 2000);
let env = { at: () => 0 };

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const talk = (t) => clamp(env.at(t) * 1.2);
const scr = (p) => toScreen(p, cam);
function lookCam(pos, look, fov = 50, shake = 0, t = 0) {
  cam.position.copy(pos);
  if (shake) cam.position.add(V(wobble(t * 9, 1) * shake, wobble(t * 11, 2) * shake, wobble(t * 10, 3) * shake));
  cam.fov = fov;
  cam.updateProjectionMatrix();
  cam.lookAt(look);
  cam.updateMatrixWorld(true);
}

// ------------------------------------------------------------ world state
const LEVEL = [[0, -0.6], [10.3, -0.6], [12.4, -0.06], [D3, -0.04], [23.3, -0.02], [25.0, 0.32], [D5, 0.34], [28.4, 0.45], [30.0, 1.2], [D10, 1.25], [37.8, 1.4], [39.5, 2.9], [SAFE, 2.9], [DURATION, 2.8]];
const level = (t) => keys(t, LEVEL);
const rainAmt = (t) => keys(t, [[0, 0.45], [D1, 0.55], [D3, 0.75], [D5, 0.95], [46.6, 1], [48.6, 0.3], [49.6, 0]]);
const mood = (t) => keys(t, [[0, 0], [D3, 0.15], [D5, 1], [D10, 1.4], [37.5, 2], [46.6, 2], [49.6, 3]]);
const cloudX = (t) => keys(t, [[46.7, 0], [49.8, 170]], easeIn);
const home = K.home;
const VERANDA = home.localToWorld(home.userData.veranda.clone());
const HALL = K.hall.position;
const PORCH = V(HALL.x + 1.6, HALL.y, HALL.z + 5.0);


// height of the evacuation hill surface (ellipsoid) at (x, z)
function hillY(x, z) {
  const a = ((x + 40) / 23.4) ** 2 + ((z + 36) / 18) ** 2;
  return a >= 1 ? 0 : -6 + 12.96 * Math.sqrt(1 - a);
}

// grass in front of the evacuation hall, where Affan stands at the end
const LAWN = V(-37.5, 0, -24.0);
LAWN.y = hillY(LAWN.x, LAWN.z);

// camera in front of Affan (who faces +z), a little below, looking up at him
function frontCam(ap, dist, side = 0) {
  lookCam(V(ap.x + side, ap.y + 0.75, ap.z + dist), V(ap.x, ap.y + 1.08, ap.z), 50);
  K.fill.position.set(ap.x + 0.6, ap.y + 1.8, ap.z + 1.6);
  K.fill.intensity = 5;
}

function world(t) {
  K.fill.intensity = 0;
  const L = level(t);
  K.water.position.y = L;
  K.water.material.uniforms.uTime.value = t;
  K.water.material.uniforms.uRain.value = rainAmt(t);
  K.setMood(mood(t));
  K.clouds.position.x = cloudX(t);
  K.sunDisc.material.opacity = inv(48.4, 50.0, t);
  K.rainbow.material.uniforms.uO.value = inv(49.3, 50.6, t);
  // flash-flood puddles on the road (day 1), gone once the land is under water
  const pk = inv(12.9, 15.0, t) * 0.6 + inv(15.85, 16.8, t) * 1.6;
  for (const p of K.puddles) {
    const s = clamp(pk * (0.7 + p.userData.k * 0.6), 0, 2.6);
    p.visible = s > 0.02 && L < 0.0;
    p.scale.set(0.3 + s * 1.4, 0.2 + s, 1);
  }
  // landslide
  const sk = easeIn(inv(32.15, 33.0, t));
  K.slab.position.lerpVectors(K.slab.userData.from, K.slab.userData.to, sk);
  K.slab.rotation.z = 0.35 * sk;
  K.slab.rotation.x = -0.25 * sk;
  // people walking up to the hall
  K.people.forEach((p, i) => {
    const k = clamp((t - 32.6 - i * 0.45) / 4.2);
    const x = lerp(-32.0, -36.6, k) + (i % 2) * 0.9;
    const z = lerp(-20.0, -26.0, k);
    p.position.set(x, Math.max(hillY(x, z), L) + 0.02 * Math.abs(Math.sin((t + i) * 8)), z);
    p.rotation.y = Math.atan2(-5.5, -7.1);
    p.visible = t > D5 && t < 50;
  });
  // parked car slowly goes under; a moving car crosses the road on day 1
  K.movingCar.position.set(lerp(-34, 4, inv(13.0, 16.6, t)), 0, 1.4);
  K.movingCar.visible = t < D3;
  K.movingCar.userData.update?.(t * 8);
  // rescue boat on day 10
  const bk = inv(37.2, 44.0, t);
  K.boat.position.set(lerp(-26, 4, bk), L - 0.25 + 0.06 * Math.sin(t * 3), 3.2);
  K.boat.rotation.y = 0.03 * Math.sin(t * 2);
  K.boat.visible = t > D10 && t < RELIEF;
}

function affanAt(p, yaw) {
  K.aff.root.position.copy(p);
  K.aff.root.rotation.set(0, 0, 0);
  return { yaw };
}

// ---------------------------------------------------------------- overlay
const RED = '#ff4d5e', BLUE = '#2f9bff', ORANGE = '#ff8a3d', NAVY = '#17256b';
const calendarSVG = (n) => `<svg width="360" height="390" viewBox="0 0 360 390">
  <rect x="14" y="44" width="332" height="332" rx="44" fill="#ffffff" stroke="${NAVY}" stroke-width="14"/>
  <path d="M14 150 V88 a44 44 0 0 1 44 -44 h244 a44 44 0 0 1 44 44 V150 Z" fill="${RED}" stroke="${NAVY}" stroke-width="14" stroke-linejoin="round"/>
  <rect x="88" y="14" width="30" height="66" rx="15" fill="#d9e2f2" stroke="${NAVY}" stroke-width="10"/><rect x="242" y="14" width="30" height="66" rx="15" fill="#d9e2f2" stroke="${NAVY}" stroke-width="10"/>
  <text x="180" y="130" text-anchor="middle" font-family="Baloo 2" font-weight="800" font-size="64" fill="#fff" letter-spacing="4">HARI</text>
  <text x="180" y="${n >= 10 ? 330 : 340}" text-anchor="middle" font-family="Baloo 2" font-weight="800" font-size="${n >= 10 ? 190 : 220}" fill="${NAVY}">${n}</text></svg>`;
const DROP = (fill, stroke = '#ffffff') => `<path d="M0 -34 C 14 -14 24 0 24 12 A24 24 0 0 1 -24 12 C -24 0 -14 -14 0 -34 Z" fill="${fill}" stroke="${stroke}" stroke-width="6"/>`;
const progressSVG = (n) => `<svg width="800" height="90" viewBox="-40 -50 800 90">${Array.from({ length: 10 }, (_, i) => `<g transform="translate(${i * 80} 0)">${DROP(i < n ? '#3fa2ff' : 'rgba(255,255,255,0.25)')}</g>`).join('')}</svg>`;
const SPONGE = `<svg width="300" height="230" viewBox="0 0 300 230"><rect x="20" y="40" width="260" height="150" rx="34" fill="#ffd84a" stroke="${NAVY}" stroke-width="12"/>
  <g fill="#e8a91c">${[[70, 90, 16], [130, 75, 11], [200, 95, 18], [100, 140, 13], [170, 145, 10], [235, 150, 14], [60, 160, 8]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}"/>`).join('')}</g>
  <rect x="20" y="40" width="260" height="40" rx="20" fill="#5fd06a" stroke="${NAVY}" stroke-width="12"/></svg>`;
const WARN = `<svg width="240" height="215" viewBox="0 0 240 215"><path d="M120 14 L228 200 H12 Z" fill="#ffd23f" stroke="${NAVY}" stroke-width="14" stroke-linejoin="round"/><rect x="108" y="70" width="24" height="76" rx="12" fill="${NAVY}"/><circle cx="120" cy="172" r="14" fill="${NAVY}"/></svg>`;
const SUN = `<svg width="240" height="240" viewBox="-120 -120 240 240"><g stroke="#ffc928" stroke-width="16" stroke-linecap="round">${Array.from({ length: 8 }, (_, i) => { const a = (i / 8) * Math.PI * 2; return `<line x1="${Math.cos(a) * 72}" y1="${Math.sin(a) * 72}" x2="${Math.cos(a) * 104}" y2="${Math.sin(a) * 104}"/>`; }).join('')}</g><circle r="56" fill="#ffd84a" stroke="${NAVY}" stroke-width="12"/></svg>`;
const WAVE = `<svg width="300" height="190" viewBox="0 0 300 190"><path d="M10 110 Q 45 70 80 110 T 150 110 T 220 110 T 290 110 V180 H10 Z" fill="#b08a58" stroke="${NAVY}" stroke-width="12" stroke-linejoin="round"/><path d="M40 70 Q 75 30 110 70 T 180 70 T 250 70" fill="none" stroke="#ffffff" stroke-width="12" stroke-linecap="round"/></svg>`;
const CLOUD = (c = '#9aa3b0') => `<svg width="320" height="180" viewBox="0 0 320 180"><path d="M70 160 a50 50 0 0 1 -10 -98 a70 70 0 0 1 130 -20 a55 55 0 0 1 90 60 a45 45 0 0 1 -10 58 Z" fill="${c}" stroke="${NAVY}" stroke-width="12" stroke-linejoin="round"/></svg>`;
const RAINBOW = `<svg width="420" height="230" viewBox="0 0 420 230"><g fill="none" stroke-width="22">${['#ff4d5e', '#ff9f1c', '#ffd23f', '#5fd06a', '#3fa2ff', '#7a5cff'].map((c, i) => `<path d="M${30 + i * 22} 220 A ${180 - i * 22} ${180 - i * 22} 0 0 1 ${390 - i * 22} 220" stroke="${c}"/>`).join('')}</g></svg>`;

function hook(t) {
  const p = pop(t, 0.12, 5.95, { fin: 0.45 });
  const fl = Math.sin(t * 3) * 6;
  ov.bubble('hook', 'HUJAN\nTANPA HENTI?', { x: W / 2, y: 430 + fl, o: p.o, s: p.s }, { size: 118, top: '#bfe8ff', bot: '#3fa2ff' });
  const q = pop(t, 0.5, 5.95);
  ov.tag('ep', 'EPISOD 14', { x: W / 2, y: 262, o: q.o, s: q.s }, { bg: '#2f7bff', small: true });
}

// big calendar card at the start of a day, then a corner badge for the rest of it
function dayCard(t, a, n, end) {
  const c = pop(t, a, a + 1.45, { fin: 0.4, from: 0.2 });
  const flip = Math.max(0, 1 - (t - a) / 0.35);
  ov.html('cal', calendarSVG(n), { x: W / 2, y: 760, o: c.o, s: c.s * 1.25, r: -6 * flip + Math.sin(t * 2.5) * 2 });
  const pr = pop(t, a + 0.15, a + 1.45);
  ov.html('prog', progressSVG(n), { x: W / 2, y: 1060, o: pr.o, s: pr.s });
  const b = pop(t, a + 1.3, end - 0.05);
  ov.html('calSm', calendarSVG(n), { x: 150, y: 330, o: b.o, s: b.s * 0.42, r: -5 });
}

// water gauge on the right edge
function gauge(t, a = D1 + 0.2, b = RELIEF - 0.1) {
  const o = pop(t, a, b).o;
  if (o <= 0) return;
  const g = ov.g;
  const x = 958, y0 = 1180, y1 = 600, w = 64;
  const L = level(t);
  const f = clamp((L + 0.6) / 3.6);
  g.save();
  g.globalAlpha = o;
  g.fillStyle = 'rgba(14,20,58,0.55)';
  g.strokeStyle = '#ffffff';
  g.lineWidth = 8;
  g.beginPath();
  g.roundRect(x - w / 2, y1, w, y0 - y1, 32);
  g.fill();
  g.stroke();
  g.save();
  g.beginPath();
  g.roundRect(x - w / 2 + 8, y1 + 8, w - 16, y0 - y1 - 16, 24);
  g.clip();
  const yy = y0 - 8 - f * (y0 - y1 - 16);
  const gr = g.createLinearGradient(0, yy, 0, y0);
  gr.addColorStop(0, '#6fc3ff');
  gr.addColorStop(1, '#1f6fd6');
  g.fillStyle = gr;
  g.beginPath();
  g.moveTo(x - w, y0);
  for (let i = 0; i <= 20; i++) g.lineTo(x - w / 2 + (i / 20) * w, yy + Math.sin(t * 6 + i * 0.8) * 4);
  g.lineTo(x + w, y0);
  g.closePath();
  g.fill();
  g.restore();
  g.fillStyle = '#ffffff';
  for (let i = 1; i < 6; i++) g.fillRect(x - w / 2 - 14, y0 - (i / 6) * (y0 - y1) - 3, 22, 6);
  g.restore();
  ov.tag('gLbl', 'PARAS AIR', { x: x - 40, y: y1 - 52, o, s: 0.62 }, { bg: '#1f6fd6', small: true });
}

function pinTag(id, text, p, t, a, b, style, dy = -90) {
  const q = pop(t, a, b);
  if (q.o <= 0 || !p.visible) return;
  ov.tag(id, text, { x: clamp(p.x, 190, 890), y: clamp(p.y + dy, 300, 1360), o: q.o, s: q.s }, style);
}

function mosquitoes(t, a, b, n = 9) {
  const o = pop(t, a, b).o;
  if (o <= 0) return;
  const g = ov.g;
  const R = rng(91);
  for (let i = 0; i < n; i++) {
    const cx = 180 + R() * 720, cy = 520 + R() * 620, rx = 60 + R() * 120, ry = 40 + R() * 90, sp = 1.5 + R() * 2, ph = R() * 9;
    const x = cx + Math.sin(t * sp + ph) * rx + Math.sin(t * 7.3 + ph) * 14;
    const y = cy + Math.sin(t * sp * 1.7 + ph * 2) * ry + Math.cos(t * 9.1 + ph) * 10;
    const dir = Math.cos(t * sp + ph) > 0 ? 1 : -1;
    const sc = 1.1 + R() * 0.5;
    g.save();
    g.globalAlpha = o;
    g.translate(x, y);
    g.scale(dir * sc, sc);
    const flap = Math.sin(t * 90 + i) * 0.5;
    g.fillStyle = 'rgba(220,235,255,0.75)';
    g.strokeStyle = '#ffffff';
    g.lineWidth = 2;
    for (const s of [-1, 1]) {
      g.save();
      g.rotate(-0.6 + flap * s * 0.6);
      g.beginPath();
      g.ellipse(-4, -14, 9, 18, -0.3, 0, Math.PI * 2);
      g.fill();
      g.stroke();
      g.restore();
    }
    g.strokeStyle = '#2b2b3a';
    g.lineWidth = 3;
    for (const k of [-8, 0, 8]) {
      g.beginPath();
      g.moveTo(k, 4);
      g.lineTo(k - 6, 22);
      g.stroke();
    }
    g.fillStyle = '#2b2b3a';
    g.beginPath();
    g.ellipse(0, 0, 16, 6, -0.15, 0, Math.PI * 2);
    g.fill();
    g.beginPath();
    g.arc(18, -2, 6, 0, Math.PI * 2);
    g.fill();
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(22, 0);
    g.lineTo(36, 8);
    g.stroke();
    g.restore();
  }
}

// soil-as-a-sponge cross-section panel (day 3)
function soilPanel(t, a, b) {
  const o = pop(t, a, b, { fin: 0.3 }).o;
  if (o <= 0) return;
  const g = ov.g;
  g.save();
  g.globalAlpha = o * 0.55;
  g.fillStyle = '#0b1230';
  g.fillRect(0, 0, W, H);
  g.restore();
  g.save();
  g.globalAlpha = o;
  const x0 = 150, x1 = 930, top = 760, bot = 1250;
  const fill = easeInOut(inv(a + 0.2, 20.5, t));
  // soil block
  g.fillStyle = '#8a5a32';
  g.strokeStyle = '#ffffff';
  g.lineWidth = 10;
  g.beginPath();
  g.roundRect(x0, top, x1 - x0, bot - top, 40);
  g.fill();
  g.save();
  g.clip();
  const R = rng(4);
  for (let i = 0; i < 60; i++) {
    g.fillStyle = 'rgba(60,35,18,0.45)';
    g.beginPath();
    g.arc(x0 + R() * (x1 - x0), top + 40 + R() * (bot - top - 40), 6 + R() * 16, 0, Math.PI * 2);
    g.fill();
  }
  // water soaking up from the bottom
  const wy = bot - fill * (bot - top - 40);
  const gr = g.createLinearGradient(0, wy, 0, bot);
  gr.addColorStop(0, 'rgba(90,170,255,0.55)');
  gr.addColorStop(1, 'rgba(40,110,230,0.7)');
  g.fillStyle = gr;
  g.beginPath();
  g.moveTo(x0, bot);
  for (let i = 0; i <= 30; i++) g.lineTo(x0 + (i / 30) * (x1 - x0), wy + Math.sin(t * 5 + i) * 5);
  g.lineTo(x1, bot);
  g.closePath();
  g.fill();
  g.fillStyle = '#5fbf4a';
  g.fillRect(x0, top, x1 - x0, 40);
  g.restore();
  // falling drops: soak in at first, then pile up and run off
  const full = fill > 0.98;
  for (let i = 0; i < 14; i++) {
    const ph = (t * 1.3 + i / 14) % 1;
    const dx = x0 + 60 + ((i * 53) % (x1 - x0 - 120));
    const dy = 560 + ph * (top - 560);
    g.fillStyle = '#7cc4ff';
    g.beginPath();
    g.moveTo(dx, dy - 22);
    g.quadraticCurveTo(dx + 13, dy, dx, dy + 8);
    g.quadraticCurveTo(dx - 13, dy, dx, dy - 22);
    g.fill();
  }
  if (full) {
    const k = inv(20.5, 21.0, t);
    g.fillStyle = 'rgba(90,170,255,0.85)';
    g.beginPath();
    g.roundRect(x0 - 10, top - 26 * k, x1 - x0 + 20, 30 * k, 14);
    g.fill();
    for (const s of [-1, 1]) {
      const ph = (t * 1.6) % 1;
      const ax = s < 0 ? x0 - 20 - ph * 60 : x1 + 20 + ph * 60;
      g.strokeStyle = `rgba(124,196,255,${k * (1 - ph)})`;
      g.lineWidth = 14;
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(s < 0 ? x0 + 40 : x1 - 40, top - 16);
      g.quadraticCurveTo(ax, top - 10, ax, top + 80 + ph * 90);
      g.stroke();
    }
  }
  g.restore();
  const tl = pop(t, a + 0.1, b);
  ov.tag('tanah', 'TANAH', { x: 300, y: 1310, o: tl.o, s: tl.s }, { bg: '#8a5a32' });
  const fl = pop(t, 20.4, b);
  ov.tag('penuh', 'PENUH AIR!', { x: 690, y: 1310, o: fl.o, s: fl.s }, { bg: '#1f6fd6' });
  const sp = pop(t, 21.36, b, { from: 1.8 });
  ov.html('sponge', SPONGE, { x: W / 2 + 120, y: 440 + Math.sin(t * 3) * 8, o: sp.o, s: sp.s * 1.0, r: 6 });
  const eq = pop(t, 21.36, b);
  ov.tag('eqSpan', 'MACAM SPAN!', { x: W / 2 - 170, y: 440, o: eq.o, s: eq.s }, { bg: '#e8a91c', small: true });
}

// ======================================================================= SHOTS
const SHOTS = [
  // S1 — hook: Affan on the veranda catches raindrops, then asks Papa
  [0, 6.0, (t) => {
    const ap = VERANDA.clone().add(V(0.6, 0, -0.35));
    affanAt(ap);
    const catchK = keys(t, [[0, 0.6], [0.4, 1], [1.5, 1], [1.9, 0]]);
    const ask = keys(t, [[1.5, 0], [1.9, 1]]);
    K.aff.pose({
      yaw: Math.PI + lerp(0.35, 0, ask), blink: blinkAt(t, 1), talk: talk(t), smile: 0.9, brow: lerp(0.3, 0.8, ask), wow: keys(t, [[0, 0.5], [0.5, 0]]),
      headPitch: lerp(-0.35, 0.02, ask), lookY: lerp(0.6, 0, ask), headYaw: lerp(0.2, 0, ask), headRoll: 0.08 * ask * Math.sin(t * 1.4),
      armL: { reach: [lerp(0.55, 0.65, catchK), lerp(0.25, 1.0, catchK), lerp(0.1, 0.8, catchK)], pole: [1, -1, -0.5], wx: -1.2 * catchK },
      armR: ask > 0 ? { reach: [lerp(-0.55, -0.62, ask), lerp(0.25, 0.95, ask * keys(t, [[4.0, 1], [4.5, 0.4]])), lerp(0.1, 0.7, ask)], pole: [-1, -1, -0.4] } : {},
    });
    const k = easeInOut(inv(0, 6, t));
    const head = V(ap.x, ap.y + 0.95, ap.z);
    lookCam(V(ap.x + lerp(0.9, 0.45, k), ap.y + lerp(0.55, 0.85, k), ap.z - lerp(3.4, 2.4, k)), V(head.x, head.y + 0.18, head.z), 50);
    K.fill.position.set(ap.x - 0.5, ap.y + 1.6, ap.z - 1.4);
    K.fill.intensity = 4;
    hook(t);
    // raindrop sparkle on his palm
    if (catchK > 0.5) {
      const hand = scr(K.aff.parts.arms.L.hand.getWorldPosition(V(0, 0, 0)));
      for (let i = 0; i < 3; i++) {
        const ph = (t * 2.2 + i / 3) % 1;
        ov.dot(hand.x + (i - 1) * 26, hand.y - 90 + ph * 80, 9 * (1 - ph), '#9fe0ff', (catchK - 0.5) * 2 * (1 - ph));
      }
    }
  }],
  // S2 — "Jom kita tengok, hari demi hari!": crane up over the kampung
  [6.0, 8.75, (t) => {
    const ap = VERANDA.clone().add(V(0.6, 0, -0.35));
    affanAt(ap);
    K.aff.pose({ yaw: Math.PI, blink: blinkAt(t, 2), talk: talk(t), smile: 1, brow: 0.7, ...POSES.waveR(t) });
    const k = easeInOut(inv(6.0, 8.7, t));
    lookCam(V(lerp(ap.x + 0.4, 18, k), lerp(ap.y + 1.0, 30, k), lerp(ap.z - 2.6, -36, k)), V(lerp(ap.x, 0, k), lerp(ap.y + 1.0, 0, k), lerp(ap.z, 4, k)), lerp(50, 55, k));
    const q = pop(t, 7.36, 8.7, { from: 1.6 });
    ov.bubble('hdh', 'HARI DEMI HARI!', { x: W / 2, y: 470, o: q.o, s: q.s, r: -3 }, { size: 112 });
    ov.swirl(t, W / 2, 900, inv(7.4, 8.6, t) * 0.8);
    ov.flash(inv(8.45, 8.75, t) ** 2);
  }],
  // ---------------- HARI 1
  [8.75, 10.2, (t) => {
    K.aff.root.position.set(0, -50, 0);
    const k = easeOut(inv(8.75, 10.2, t));
    lookCam(V(lerp(14, 10, k), lerp(26, 20, k), lerp(-34, -28, k)), V(0, 0, 3), 55);
    ov.flash(1 - inv(8.75, 9.1, t));
    dayCard(t, D1, 1, D3);
  }],
  // drains filling up
  [10.2, 12.75, (t) => {
    const k = easeInOut(inv(10.2, 12.75, t));
    lookCam(V(lerp(-3.5, -2.5, k), 1.7, -3.8), V(2.5, -0.7, -3.8), 50);
    const d = scr(V(-1.5, level(t), -3.8));
    pinTag('lk', 'LONGKANG PENUH', d, t, 10.35, 12.7, { bg: BLUE, pointer: 'down' }, -110);
    const a = pop(t, 11.0, 12.7);
    if (a.o > 0) for (let i = 0; i < 2; i++) {
      const ph = (t * 1.4 + i / 2) % 1;
      ov.html('up' + i, `<div style="transform:rotate(-90deg)">${ICONS.arrow('#3fa2ff')}</div>`, { x: 860, y: 1100 - ph * 160 - i * 10, o: a.o * Math.sin(ph * Math.PI), s: 0.55 });
    }
    dayCard(t, D1, 1, D3);
    gauge(t);
  }],
  // puddles on the road, a car splashes through, then a flash flood
  [12.75, 17.15, (t) => {
    const k = easeInOut(inv(12.75, 17.15, t));
    lookCam(V(-26 + 3 * k, 2.2, -5.0), V(-8, 0, 0.8), 46);
    const q = pop(t, 13.12, 15.7);
    ov.tag('bertakung', 'AIR BERTAKUNG', { x: 330, y: 1000, o: q.o, s: q.s }, { bg: BLUE, small: true });
    const b = pop(t, 15.88, 17.1, { from: 2 });
    ov.bubble('kilat', 'BANJIR KILAT!', { x: W / 2, y: 470, o: b.o, s: b.s, r: -3 }, { size: 120, top: '#ffd0a0', bot: '#ff7a3d' });
    const f = pop(t, 16.0, 17.1);
    ov.tag('cepat', 'AIR NAIK CEPAT', { x: W / 2, y: 640, o: f.o, s: f.s }, { bg: ORANGE, small: true });
    ov.speedLines(t, { y0: 980, y1: 1180, n: 6, a: 0.35 * inv(13.0, 13.6, t) * (1 - inv(16.2, 16.6, t)), dir: 1 });
    dayCard(t, D1, 1, D3);
    gauge(t);
  }],
  // ---------------- HARI 3
  [17.15, 18.65, (t) => {
    const k = easeOut(inv(17.15, 18.65, t));
    lookCam(V(lerp(-12, -8, k), lerp(24, 19, k), lerp(-32, -27, k)), V(0, 0, 4), 55);
    ov.flash((1 - inv(17.15, 17.45, t)) * 0.8);
    dayCard(t, D3, 3, D5);
    gauge(t);
  }],
  // soil is a full sponge
  [18.65, 23.2, (t) => {
    lookCam(V(6, 1.3, 4.6), V(8, 0.4, 9), 50);
    soilPanel(t, 18.7, 23.15);
    dayCard(t, D3, 3, D5);
  }],
  // the river overflows its banks
  [23.2, 25.15, (t) => {
    const k = easeInOut(inv(23.2, 25.15, t));
    lookCam(V(lerp(-8, -5, k), 3.0, 30), V(-2, -0.4, 15), 50);
    const r = scr(V(-3, level(t), 19));
    pinTag('sungai', 'SUNGAI MELIMPAH', r, t, 23.3, 25.1, { bg: BLUE, pointer: 'down' }, -140);
    const a = pop(t, 23.7, 25.1);
    if (a.o > 0) for (let i = 0; i < 3; i++) {
      const ph = (t * 1.5 + i / 3) % 1;
      ov.html('ov' + i, `<div style="transform:rotate(-90deg)">${ICONS.arrow('#3fa2ff')}</div>`, { x: 260 + i * 280, y: 1150 - ph * 140, o: a.o * Math.sin(ph * Math.PI), s: 0.5 });
    }
    dayCard(t, D3, 3, D5);
    gauge(t);
  }],
  // the school is closed
  [25.15, 26.75, (t) => {
    const k = easeOut(inv(25.15, 26.75, t));
    lookCam(V(-16 + 2 * k, 3.2, lerp(2.5, 1.5, k)), V(-16, 5.2, -11), 52);
    const s = scr(V(-16, 8.2, -10.9));
    const q = pop(t, 25.92, 26.7, { from: 2.4, fin: 0.25 });
    ov.tag('tutup', 'TUTUP', { x: s.x, y: s.y + 150, o: q.o, s: q.s * 1.4, r: -12 }, { bg: RED });
    dayCard(t, D3, 3, D5);
    gauge(t);
  }],
  // ---------------- HARI 5
  [26.75, 28.3, (t) => {
    const k = easeOut(inv(26.75, 28.3, t));
    lookCam(V(lerp(16, 12, k), lerp(26, 21, k), lerp(-30, -25, k)), V(0, 0, 4), 55);
    ov.flash((1 - inv(26.75, 27.05, t)) * 0.7);
    dayCard(t, D5, 5, D10);
    gauge(t);
  }],
  // deep water around the stilt houses
  [28.3, 30.3, (t) => {
    const k = easeInOut(inv(28.3, 30.3, t));
    lookCam(V(lerp(-12, -10, k), 4.4, lerp(-4.5, -3.5, k)), V(1, 1.6, 9), 50);
    const top = scr(V(-1, level(t), 6.2));
    const q = pop(t, 29.52, 30.25, { from: 2 });
    ov.bubble('dalam', 'MAKIN DALAM!', { x: W / 2, y: 470, o: q.o, s: q.s, r: 3 }, { size: 118, top: '#bfe8ff', bot: '#3fa2ff' });
    pinTag('kereta', 'AIR NAIK!', top, t, 28.5, 30.25, { bg: BLUE, pointer: 'down', small: true }, -120);
    dayCard(t, D5, 5, D10);
    gauge(t);
  }],
  // a soggy hill slides
  [30.3, 33.35, (t) => {
    const sh = 0.12 * inv(32.2, 32.4, t) * (1 - inv(33.0, 33.3, t));
    lookCam(V(12, 7.5, -6.5), V(23, 3.0, -23), 55, sh, t);
    const h = scr(V(22.5, 6.5, -24));
    pinTag('lembik', 'TANAH LEMBIK', h, t, 31.52, 33.3, { bg: '#8a5a32', pointer: 'down' }, -150);
    const w = pop(t, 32.44, 33.3, { from: 2 });
    ov.html('warn', WARN, { x: 200, y: 1150, o: w.o, s: w.s * 0.85, r: -8 });
    ov.bubble('runtuh', 'RUNTUH!', { x: W / 2 + 100, y: 1180, o: w.o, s: w.s, r: 4 }, { size: 130, top: '#ffd0a0', bot: '#ff5a3d' });
    dayCard(t, D5, 5, D10);
    gauge(t);
  }],
  // everyone moves to the evacuation hall on high ground
  [33.35, 36.2, (t) => {
    const ap = V(-40.2, hillY(-40.2, -24.2), -24.2);
    affanAt(ap);
    K.aff.pose({ yaw: 0.35, blink: blinkAt(t, 3), talk: talk(t) * 0.3, smile: 1, brow: 0.5, ...POSES.waveR(t) });
    const k = easeInOut(inv(33.35, 36.2, t));
    lookCam(V(ap.x + 0.4, ap.y + 1.25, ap.z + lerp(4.8, 4.2, k)), V(ap.x + 0.4, ap.y + 1.2, ap.z), 55);
    K.fill.position.set(ap.x + 1, ap.y + 2, ap.z + 2);
    K.fill.intensity = 4;
    const s = scr(V(HALL.x, HALL.y + 4.6, HALL.z + 3.6));
    { const q = pop(t, 34.64, 36.15); ov.tag("pp", "TEMPAT SELAMAT", { x: W / 2, y: 470, o: q.o, s: q.s }, { bg: "#2f8f6a" }); }
    dayCard(t, D5, 5, D10);
    gauge(t);
  }],
  // ---------------- HARI 10
  [36.2, 37.75, (t) => {
    K.aff.root.position.set(0, -50, 0);
    const k = easeOut(inv(36.2, 37.75, t));
    lookCam(V(lerp(10, 6, k), lerp(30, 26, k), lerp(-36, -30, k)), V(-2, 0, 4), 55);
    ov.flash((1 - inv(36.2, 36.5, t)) * 0.6, '200,215,255');
    dayCard(t, D10, 10, RELIEF);
    gauge(t);
  }],
  // the kampung looks like a sea
  [37.75, 40.35, (t) => {
    const k = easeInOut(inv(37.75, 40.35, t));
    lookCam(V(lerp(22, 15, k), lerp(17, 21, k), lerp(-18, -24, k)), V(lerp(-2, 2, k), 1.5, 8), 52);
    const q = pop(t, 39.36, 40.3, { from: 2 });
    ov.bubble('lautan', 'MACAM LAUTAN!', { x: W / 2, y: 470, o: q.o, s: q.s, r: -3 }, { size: 118, top: '#bfe8ff', bot: '#3fa2ff' });
    const bt = scr(K.boat.position.clone().add(V(0, 1.6, 0)));
    pinTag('bomba', 'BOT PENYELAMAT', bt, t, 38.0, 40.3, { bg: ORANGE, pointer: 'down', small: true }, -70);
    dayCard(t, D10, 10, RELIEF);
    gauge(t);
  }],
  // no sun
  [40.35, 42.05, (t) => {
    const k = easeInOut(inv(40.35, 42.05, t));
    lookCam(V(-36, 9.5, -22), V(-20, lerp(26, 30, k), 20), 55);
    const s = pop(t, 40.4, 42.0, { from: 0.5 });
    ov.html('sun', SUN, { x: W / 2, y: 760 + Math.sin(t * 2) * 6, o: s.o, s: s.s * 1.3 });
    const x = pop(t, 41.0, 42.0, { from: 2 });
    ov.html('sunX', ICONS.cross(), { x: W / 2, y: 760, o: x.o, s: x.s * 0.9 });
    const c1 = pop(t, 40.6, 42.0), c2 = pop(t, 40.8, 42.0);
    ov.html('cl1', CLOUD('#7d8696'), { x: W / 2 - 200 + Math.sin(t) * 10, y: 610, o: c1.o, s: c1.s * 0.9 });
    ov.html('cl2', CLOUD('#6a7383'), { x: W / 2 + 220 - Math.sin(t) * 10, y: 880, o: c2.o, s: c2.s * 0.8 });
    const tg = pop(t, 41.16, 42.0);
    ov.tag('gelap', 'MATAHARI TAK MUNCUL', { x: W / 2, y: 1080, o: tg.o, s: tg.s }, { bg: '#4f5766', small: true });
    dayCard(t, D10, 10, RELIEF);
    gauge(t);
  }],
  // mosquitoes over stagnant water
  [42.05, 43.95, (t) => {
    const k = easeInOut(inv(42.05, 43.95, t));
    lookCam(V(lerp(6, 5, k), 4.4, 1.5), V(1, 3.4, 9), 48);
    mosquitoes(t, 42.1, 43.9);
    const q = pop(t, 42.16, 43.9);
    ov.tag('nyamuk', 'NYAMUK!', { x: W / 2, y: 470, o: q.o, s: q.s }, { bg: '#e0559f' });
    const b = pop(t, 42.84, 43.9);
    ov.tag('airTenang', 'SUKA AIR BERTAKUNG', { x: W / 2, y: 1240, o: b.o, s: b.s }, { bg: '#1f6fd6', small: true });
    dayCard(t, D10, 10, RELIEF);
    gauge(t);
  }],
  // relief: "Tapi jangan risau!"
  [43.95, 46.65, (t) => {
    const ap = LAWN.clone();
    affanAt(ap);
    const up = keys(t, [[44.0, 0], [44.35, 1], [46.2, 1], [46.6, 0.3]]);
    K.aff.pose({
      yaw: 0, blink: blinkAt(t, 5), talk: talk(t), smile: 1, brow: 0.6, headYaw: 0.05 * wobble(t, 4),
      armL: { reach: [lerp(0.55, 0.8, up), lerp(0.25, 0.8, up), lerp(0.1, 0.55, up)], pole: [1, -0.6, -0.4], wx: -0.9 * up },
      armR: { reach: [lerp(-0.55, -0.8, up), lerp(0.25, 0.8, up), lerp(0.1, 0.55, up)], pole: [-1, -0.6, -0.4], wx: -0.9 * up },
    });
    frontCam(ap, lerp(2.9, 2.3, easeOut(inv(43.95, 46.65, t))), 0.4);
    const q = pop(t, 44.0, 46.6, { from: 1.8 });
    ov.bubble('risau', 'JANGAN RISAU!', { x: W / 2, y: 450, o: q.o, s: q.s, r: -3 }, { size: 118, top: '#d6ffb0', bot: '#5fd06a' });
    ov.flash((1 - inv(43.95, 44.2, t)) * 0.5);
  }],
  // the clouds move away (over the flooded kampung) and the rain stops
  [46.65, 49.45, (t) => {
    const k = easeInOut(inv(46.65, 49.45, t));
    lookCam(V(-34, lerp(11, 12, k), -22), V(-22, lerp(13, 17, k), 30), 58);
    const a = pop(t, 46.76, 49.4);
    for (let i = 0; i < 2; i++) {
      const sx = 250 + i * 420 + ((t - 46.76) * 160) % 200;
      ov.html('mv' + i, ICONS.arrow('#ffffff'), { x: sx, y: 560 + i * 170, o: a.o * 0.9, s: 0.55 });
    }
    ov.tag('awanG', 'AWAN BERGERAK PERGI', { x: W / 2, y: 360, o: a.o, s: a.s }, { bg: '#4f8cff', small: true });
  }],
  // "...hujan akan berhenti!" Affan cheers in the sunshine
  [49.45, 50.45, (t) => {
    const ap = LAWN.clone();
    affanAt(ap);
    const cheer = keys(t, [[49.45, 0.3], [49.7, 1]]);
    K.aff.pose({
      yaw: 0, blink: 0, talk: talk(t) * 0.6, smile: 1, wow: keys(t, [[49.45, 0.6], [49.9, 0]]), brow: 1, headPitch: -0.12, lookY: 0.3,
      bob: Math.max(0, Math.sin((t - 49.45) * 9)) * 0.06,
      armL: { reach: [lerp(0.55, 0.85, cheer), lerp(0.25, 1.85, cheer), lerp(0.1, 0.3, cheer)], pole: [1, -0.4, -0.5] },
      armR: { reach: [lerp(-0.55, -0.85, cheer), lerp(0.25, 1.85, cheer), lerp(0.1, 0.3, cheer)], pole: [-1, -0.4, -0.5] },
    });
    frontCam(ap, 2.9, 0.2);
    const h = pop(t, 49.52, 50.45, { from: 2 });
    ov.bubble('henti', 'HUJAN BERHENTI!', { x: W / 2, y: 460, o: h.o, s: h.s, r: -3 }, { size: 112, top: '#d6ffb0', bot: '#5fd06a' });
    ov.sparkles(t, { n: 24, seed: 31, y: 250, h: 900, a: inv(49.5, 49.9, t) });
    ov.flash((1 - inv(49.45, 49.65, t)) * 0.6);
  }],
  // safety: don't play in flood water
  [50.45, 54.75, (t) => {
    const ap = LAWN.clone();
    affanAt(ap);
    const wag = keys(t, [[51.2, 0], [51.5, 1], [52.7, 1], [53.0, 0]]);
    const w = POSES.wagR(t).armR;
    const nod = keys(t, [[52.9, 0], [53.2, 1]]);
    K.aff.pose({
      yaw: 0, blink: blinkAt(t, 7), talk: talk(t), smile: lerp(0.5, 1, nod), brow: lerp(0.8, 0.3, nod),
      headYaw: wag * 0.14 * Math.sin(t * 8), headPitch: 0.06 * nod * Math.sin(t * 6),
      armR: wag > 0 ? { reach: [lerp(-0.55, w.reach[0], wag), lerp(0.25, w.reach[1], wag), lerp(0.1, w.reach[2], wag)], pole: w.pole, point: wag, wz: w.wz * wag } : nod > 0 ? { ...POSES.thumbsUpR.armR, thumb: nod } : {},
    });
    frontCam(ap, lerp(2.5, 2.1, easeOut(inv(50.45, 54.75, t))), -0.2);
    const q = pop(t, 51.36, 52.85);
    ov.html('wave', WAVE, { x: W / 2, y: 340, o: q.o, s: q.s * 0.9 });
    ov.html('waveX', ICONS.cross(), { x: W / 2, y: 340, o: q.o, s: q.s * 0.9 });
    ov.bubble('jangan', 'JANGAN MAIN\nAIR BANJIR!', { x: W / 2, y: 600, o: q.o, s: q.s }, { size: 96, top: '#ffd0a0', bot: '#ff5a3d' });
    const d = pop(t, 52.88, 54.7);
    ov.bubble('dewasa', 'IKUT CAKAP\nORANG DEWASA', { x: W / 2, y: 520, o: d.o, s: d.s }, { size: 96, top: '#d6ffb0', bot: '#5fd06a' });
  }],
  // "Apa lagi kita nak belajar lepas ni?"
  [54.75, OUTRO, (t) => {
    const ap = LAWN.clone();
    affanAt(ap);
    const tk = keys(t, [[54.75, 0], [55.15, 1]]);
    const th = POSES.thinkR.armR;
    K.aff.pose({
      yaw: 0, blink: blinkAt(t, 8), talk: talk(t), smile: 1, brow: 0.3 + 0.4 * tk, headRoll: -0.12 * tk, lookX: 0.35 * tk, lookY: 0.4 * tk, headPitch: -0.08 * tk,
      armR: { reach: [lerp(-0.55, th.reach[0], tk), lerp(0.25, th.reach[1], tk), lerp(0.1, th.reach[2], tk)], pole: th.pole, point: tk, wx: th.wx * tk },
    });
    frontCam(ap, lerp(2.3, 1.8, easeInOut(inv(54.75, OUTRO, t))), 0.15);
    const head = scr(V(ap.x, ap.y + 1.0, ap.z));
    [[54.95, -260, -260, '#ffcf33', -12], [55.3, 250, -300, '#3fa2ff', 10], [55.65, 300, -60, '#ffcf33', 14]].forEach(([a, dx, dy, c, r], i) => {
      const q = pop(t, a, OUTRO - 0.05);
      ov.html('q' + i, ICONS.qmark(c), { x: head.x + dx, y: head.y + dy + Math.sin(t * 3 + i) * 10, o: q.o, s: q.s * 0.85, r });
    });
  }],
  // Outro — The Curious Affan logo
  [OUTRO, DURATION + 1, (t) => {
    const k = easeOut(inv(OUTRO, OUTRO + 0.7, t));
    outro.aff.root.position.set(0, 0, 0);
    outro.aff.pose({ ...POSES.thinkR, armR: { ...POSES.thinkR.armR }, smile: 1, blink: blinkAt(t, 9), headRoll: -0.08, lookX: 0.25, lookY: 0.15, headYaw: 0.08 });
    lookCam(V(0, 2.6, lerp(7.5, 5.4, k)), V(0, 2.3, 0), 40);
    const hc = scr(V(0, 2.95, 0));
    ov.flash((1 - inv(OUTRO, OUTRO + 0.35, t)) * 1.0);
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
    ov.html('oRb', RAINBOW, { x: 200, y: 470 + Math.sin(t * 2) * 8, o: ic.o, s: ic.s * 0.45, r: -10 });
    ov.html('oQ1', ICONS.qmark('#ffcf33'), { x: 880, y: 420 + Math.sin(t * 2 + 1) * 8, o: ic.o, s: ic.s * 0.9, r: 12 });
    ov.html('oQ2', ICONS.qmark('#2f6fff'), { x: 220, y: 760 + Math.sin(t * 2 + 2) * 8, o: ic.o, s: ic.s * 0.6, r: -12 });
    const l1 = pop(t, OUTRO + 0.3, 99), l2 = pop(t, OUTRO + 0.5, 99), l3 = pop(t, OUTRO + 0.7, 99);
    drawLogo(ov, { k: [l1, l2, l3], star: pop(t, OUTRO + 0.9, 99) });
    return outro;
  }],
];

function frame(t) {
  ov.begin();
  cam.aspect = W / H;
  cam.updateProjectionMatrix();
  K.aff.root.position.set(0, -50, 0);
  world(t);
  const shot = SHOTS.find(([a, b]) => t >= a && t < b) || SHOTS[SHOTS.length - 1];
  const w = shot[2](t) || K;
  if (w === K) {
    K.rain.userData.update(t, cam, rainAmt(t));
    K.sky.position.copy(cam.position);
    renderer.render(K.scene, cam);
    ov.vignette(0.3);
  } else {
    renderer.render(w.scene, cam);
  }
  ov.captions(t, CAPTIONS, KEYWORDS);
  ov.end();
}

// Cover / thumbnail (9:16): Affan on the veranda in heavy rain with flood water
// rising below, big title, day badges and the logo. Key elements stay inside
// the centre 3:4 area (y 240-1680) that profile grids show.
const THUMB = { cam: [1.0, -0.45, -4.2], look: [0.1, 0.55, 0], fov: 42, level: 1.0 };
window.setThumb = (o) => Object.assign(THUMB, o);
function thumbnail() {
  ov.begin();
  cam.aspect = W / H;
  cam.updateProjectionMatrix();
  const t = 30;
  world(t);
  K.water.position.y = THUMB.level;
  K.setMood(1.2);
  for (const p of K.people) p.visible = false;
  const ap = VERANDA.clone().add(V(0.6, 0, -0.35));
  affanAt(ap);
  K.aff.pose({
    yaw: Math.PI + 0.2, blink: 0, talk: 0, wow: 0.9, brow: 1, smile: 0.6, headPitch: -0.2, lookY: 0.5, lookX: 0.2,
    armL: { reach: [0.65, 1.0, 0.8], pole: [1, -1, -0.5], wx: -1.2 },
    armR: { reach: [-0.75, 1.55, 0.35], pole: [-1, -0.5, -0.4] },
  });
  lookCam(V(ap.x + THUMB.cam[0], ap.y + THUMB.cam[1], ap.z + THUMB.cam[2]), V(ap.x + THUMB.look[0], ap.y + THUMB.look[1], ap.z + THUMB.look[2]), THUMB.fov);
  K.rain.userData.update(12.3, cam, 1);
  K.sky.position.copy(cam.position);
  renderer.render(K.scene, cam);
  const g = ov.g;
  const top = g.createLinearGradient(0, 0, 0, 820);
  top.addColorStop(0, 'rgba(8,12,44,0.8)');
  top.addColorStop(1, 'rgba(8,12,44,0)');
  g.fillStyle = top;
  g.fillRect(0, 0, W, 820);
  const bot = g.createLinearGradient(0, H - 900, 0, H);
  bot.addColorStop(0, 'rgba(8,12,44,0)');
  bot.addColorStop(1, 'rgba(8,12,44,0.8)');
  g.fillStyle = bot;
  g.fillRect(0, H - 900, W, 900);
  ov.vignette(0.3);
  ov.tag('thBadge', 'EPISOD 14', { x: W / 2, y: 300 }, { bg: '#2f7bff', small: true });
  ov.bubble('thTitle', 'HUJAN\nTANPA HENTI?', { x: W / 2, y: 500, r: -2 }, { size: 124, top: '#bfe8ff', bot: '#3fa2ff' });
  [['1', 210], ['3', 430], ['5', 650], ['10', 870]].forEach(([n, x], i) => ov.html('thCal' + i, calendarSVG(n), { x, y: 1300, s: 0.4, r: [-6, 4, -4, 6][i] }));
  drawLogo(ov, { y: 1440, scale: 0.46 });
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
