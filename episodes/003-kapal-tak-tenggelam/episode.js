// THE CURIOUS AFFAN — Episode 003: "Kenapa Kapal Besar Tak Tenggelam?"
// Every shot is a pure function of time t (seconds), synced to audio/narration.mp3.
import * as THREE from 'three';
import { makeRenderer, loadEnvelope, toScreen, clamp, lerp, inv, easeOut, easeInOut, keys, wobble, W, H } from '../../shared/core.js';
import { POSES, blinkAt } from '../../shared/affan.js';
import { Overlay, pop, ICONS } from '../../shared/overlay.js';
import { buildOutro, outroShot } from '../../shared/outro.js';
import { CAPTIONS, KEYWORDS } from './captions.js';
import { buildHarbor, buildLab, SUN, SHIP_POS, SHIP_YAW, DECK_Y, TANK } from './worlds.js';
import { seabedY } from './water.js';
import { yBot, yDeck } from './ship.js';

const FPS = 30;
const DURATION = 47.5;
const OUTRO = 44.15;

const stage = document.getElementById('stage');
const canvas = document.createElement('canvas');
stage.appendChild(canvas);
const renderer = makeRenderer(canvas);
renderer.localClippingEnabled = true;
const ov = new Overlay(stage);
const cam = new THREE.PerspectiveCamera(50, W / H, 0.05, 7000);
const camB = new THREE.PerspectiveCamera(50, W / (H / 2), 0.05, 7000);
let env = { at: () => 0 };
let HB, LAB, outro; // built once fonts are loaded (textures draw text)

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const talk = (t) => clamp(env.at(t) * 1.2);
const scr = (p) => toScreen(p, cam);
const SHIP_M = new THREE.Matrix4().compose(SHIP_POS, new THREE.Quaternion().setFromEuler(new THREE.Euler(0, SHIP_YAW, 0)), V(1, 1, 1));
const shipPt = (x, y, z) => V(x, y, z).applyMatrix4(SHIP_M);
const kv = (t, ks, ease) => V(...keys(t, ks, ease));

function lookCam(c, pos, look, fov = 50) {
  c.position.copy(pos);
  c.fov = fov;
  c.updateProjectionMatrix();
  c.lookAt(look);
  c.updateMatrixWorld(true);
}

// Hand target (torso-local) on the line from the shoulder towards a world point.
function aimReach(aff, world, side, len = 0.9) {
  const p = aff.toTorso(world);
  const s = [0.6 * side, 0.86, 0];
  const d = p.map((v, i) => v - s[i]);
  const n = Math.hypot(...d) || 1;
  return s.map((v, i) => v + (d[i] / n) * len);
}
const mixReach = (a, b, k) => a.map((v, i) => lerp(v, b[i], k));

// ------------------------------------------------------------------ overlay bits
const BLUE = '#2f9bff', AQUA = '#12b89a', ORANGE = '#ff7a3d', NAVY = '#1f2b5c', GREY = '#6f7d96';

const arrowSVG = (dir, c = '#ffffff', s = 46) =>
  `<svg width="${s * 0.8}" height="${s}" viewBox="0 0 40 50" style="display:block"><path d="${dir === 'up' ? 'M20 3 L37 24 H27 V47 H13 V24 H3 Z' : 'M20 47 L37 26 H27 V3 H13 V26 H3 Z'}" fill="${c}" stroke-linejoin="round"/></svg>`;

function arrowTag(id, text, dir, p, bg, small = false) {
  return ov.html(id, `<div class="tag${small ? ' sm' : ''}" style="background:${bg};display:flex;align-items:center;gap:12px">${text}${arrowSVG(dir, '#fff', small ? 34 : 46)}</div>`, p);
}

function pinTag(id, text, p, t, a, b, style, dy = -90) {
  const q = pop(t, a, b);
  if (q.o <= 0 || !p.visible) return;
  ov.tag(id, text, { x: clamp(p.x, 180, 900), y: clamp(p.y + dy, 300, 1500), o: q.o, s: q.s }, style);
}

// Fat 2D arrow from (x1, y1) to (x2, y2) with white outline and gradient fill.
function fatArrow(x1, y1, x2, y2, { w = 40, c1 = '#7ff6ff', c2 = '#1fa8ff', a = 1, glow = 0 } = {}) {
  const len = Math.hypot(x2 - x1, y2 - y1);
  if (len < 4 || a <= 0) return;
  const g = ov.g;
  g.save();
  g.globalAlpha = clamp(a);
  g.translate(x1, y1);
  g.rotate(Math.atan2(y2 - y1, x2 - x1));
  const hl = Math.min(w * 1.5, len * 0.6), hw = w * 1.1;
  const path = () => {
    g.beginPath();
    g.moveTo(0, -w / 2);
    g.lineTo(len - hl, -w / 2);
    g.lineTo(len - hl, -hw);
    g.lineTo(len, 0);
    g.lineTo(len - hl, hw);
    g.lineTo(len - hl, w / 2);
    g.lineTo(0, w / 2);
    g.closePath();
  };
  g.lineJoin = 'round';
  path();
  g.shadowColor = glow ? c1 : 'rgba(10,20,60,0.35)';
  g.shadowBlur = glow ? 30 * glow : 14;
  g.shadowOffsetY = glow ? 0 : 6;
  g.strokeStyle = '#ffffff';
  g.lineWidth = Math.max(8, w * 0.28);
  g.stroke();
  g.shadowColor = 'transparent';
  const gr = g.createLinearGradient(0, 0, len, 0);
  gr.addColorStop(0, c2);
  gr.addColorStop(1, c1);
  g.fillStyle = gr;
  g.fill();
  g.restore();
}

function qmarks(t, a, b, cx, cy, list) {
  list.forEach(([dt, dx, dy, c, r, s = 0.85], i) => {
    const q = pop(t, a + dt, b);
    ov.html('qm' + i, ICONS.qmark(c), { x: cx + dx, y: cy + dy + Math.sin(t * 3 + i) * 10, o: q.o, s: q.s * s, r });
  });
}

const WEIGHT = `<svg width="170" height="160" viewBox="0 0 170 160"><path d="M60 40 A25 25 0 1 1 110 40" fill="none" stroke="#17256b" stroke-width="26"/><path d="M60 40 A25 25 0 1 1 110 40" fill="none" stroke="#5d6b8f" stroke-width="12"/>
  <path d="M35 50 H135 L160 150 H10 Z" fill="#5d6b8f" stroke="#17256b" stroke-width="10" stroke-linejoin="round"/><text x="85" y="122" text-anchor="middle" font-family="Baloo 2" font-weight="800" font-size="58" fill="#fff">TAN</text></svg>`;
const CHECK = `<svg width="150" height="150" viewBox="0 0 150 150"><circle cx="75" cy="75" r="66" fill="#2fcf7b" stroke="#fff" stroke-width="12"/><path d="M42 78 L66 102 L110 52" fill="none" stroke="#fff" stroke-width="18" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

// ---------------------------------------------------------------- harbour bits
const AFF_SPOT = V(2, DECK_Y, 1.4);
const RAIL_SPOT = V(2, DECK_Y, 0.78);
let G = 33.8; // gravity in scene units (1 unit ~ 0.29 m); fitted at start-up so the splash lands on "plop"
const T_RELEASE = 11.45;
const T_SPLASH = 11.945;
const AIM = V(2.42, 3.75, -0.5); // where Affan holds the stone
const SPLASH = AIM.clone().setY(0); // refined at start-up to the hand position at release
let BED_Y = seabedY(SPLASH.z) + 0.14;

function harborAffan(t, pos, yaw, p = {}, seed = 1) {
  const a = HB.aff;
  a.root.position.copy(pos);
  a.pose({ yaw, blink: blinkAt(t, seed), talk: talk(t), ...p });
}
function sunShadowAt(p) {
  HB.sunLight.target.position.copy(p);
  HB.sunLight.position.copy(p).addScaledVector(SUN, 80);
}
// stone path after release: free fall, then a damped plunge to the sea bed
function stoneY(t, y0) {
  if (t <= T_RELEASE) return y0;
  if (t <= T_SPLASH) return y0 - 0.5 * G * (t - T_RELEASE) ** 2;
  const s = t - T_SPLASH, v0 = G * (T_SPLASH - T_RELEASE), vt = 3.3, tau = 0.11;
  return Math.max(BED_Y, -(vt * s + (v0 - vt) * tau * (1 - Math.exp(-s / tau))));
}
let STONE_Y0 = 4.2;
function hideFx() {
  HB.drops.visible = false;
  HB.crown.visible = false;
  HB.bubbles.visible = false;
  HB.puff.visible = false;
  HB.sea.material.uniforms.uRip.value.set(SPLASH.x, SPLASH.z, T_SPLASH, 0.05);
}
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new THREE.Vector3();
const NDROP = 90;
function splashFx(t) {
  const a = t - T_SPLASH;
  // droplets
  HB.drops.visible = a > 0 && a < 1.4;
  if (HB.drops.visible) {
    for (let i = 0; i < NDROP; i++) {
      const jet = i >= 60; // central jet that rises a moment after impact
      const ang = (i / 60) * Math.PI * 2 + Math.sin(i * 7.1) * 0.3;
      const sp = jet ? 0.25 * (((i * 13) % 7) / 7) : 1.4 + ((i * 37) % 11) / 11 * 2.2;
      const vy = jet ? 6.5 + ((i * 17) % 9) / 9 * 3.5 : 4.5 + ((i * 53) % 13) / 13 * 4.5;
      const aa = jet ? a - 0.12 - ((i * 7) % 5) * 0.02 : a;
      const y = vy * aa - 0.5 * 33.8 * aa * aa;
      const sc = aa < 0 || y < -0.05 ? 0 : (jet ? 1.1 : 0.5) + ((i * 29) % 7) / 7 * 0.8;
      _m.compose(V(SPLASH.x + Math.cos(ang) * sp * Math.max(0, aa), Math.max(0, y), SPLASH.z + Math.sin(ang) * sp * Math.max(0, aa)), _q, _s.set(sc, sc * 1.3, sc));
      HB.drops.setMatrixAt(i, _m);
    }
    HB.drops.instanceMatrix.needsUpdate = true;
  }
  // crown
  HB.crown.visible = false && a > 0 && a < 0.6;
  if (HB.crown.visible) {
    const k = a / 0.6;
    HB.crown.position.set(SPLASH.x, 0.45 * Math.sin(k * Math.PI) * 0.5, SPLASH.z);
    HB.crown.scale.set(0.25 + 1.1 * easeOut(k), 0.05 + 1.3 * Math.sin(k * Math.PI), 0.25 + 1.1 * easeOut(k));
    HB.crown.material.opacity = 0.55 * (1 - k);
  }
  // bubbles: a burst at entry and a trail behind the sinking stone
  HB.bubbles.visible = a > 0;
  if (HB.bubbles.visible) {
    for (let i = 0; i < 60; i++) {
      const born = T_SPLASH + (i < 18 ? 0.02 * (i % 6) : 0.05 + (i - 18) * 0.03);
      const age = t - born;
      let sc = 0;
      const p = V(0, 0, 0);
      if (age > 0) {
        const y0 = i < 18 ? -0.3 - (i % 5) * 0.12 : stoneY(born, STONE_Y0);
        const y = y0 + age * (1.6 + (i % 4) * 0.35);
        const jx = Math.sin(i * 12.9) * 0.25, jz = Math.cos(i * 7.3) * 0.25;
        p.set(SPLASH.x + jx + Math.sin(age * 6 + i) * 0.08, Math.min(y, -0.05), SPLASH.z + jz);
        sc = y < -0.05 ? (0.5 + (i % 5) * 0.25) * clamp(age * 4) : 0;
      }
      _m.compose(p, _q, _s.set(sc, sc, sc));
      HB.bubbles.setMatrixAt(i, _m);
    }
    HB.bubbles.instanceMatrix.needsUpdate = true;
  }
  // sand puff when the stone lands
  const land = landTime();
  HB.puff.visible = t > land && t < land + 1.5;
  if (HB.puff.visible) {
    const k = (t - land) / 1.5;
    HB.puff.position.set(SPLASH.x, BED_Y + 0.1 + 0.4 * k, SPLASH.z);
    HB.puff.scale.setScalar(0.6 + 2.2 * easeOut(k));
    HB.puff.material.opacity = 0.75 * (1 - k);
  }
}
let _land = null;
function landTime() {
  if (_land === null) {
    for (let t = T_SPLASH; t < T_SPLASH + 5; t += 0.005) if (stoneY(t, STONE_Y0) <= BED_Y + 1e-4) return (_land = t);
    _land = 99;
  }
  return _land;
}

// ---------------------------------------------------------------- lab helpers
const LV0 = TANK.level0, S = TANK.shipScale, KEEL = -12 * S;
const T_DROP0 = 19.95, T_DROP1 = 21.05;
// ship height (origin = design waterline) in the science world
function labShipY(t) {
  const hover = 6.9 + 0.12 * Math.sin(t * 2.2);
  let y;
  if (t < T_DROP0) y = hover;
  else if (t < T_DROP1) y = lerp(6.9 + 0.12 * Math.sin(T_DROP0 * 2.2), LV0 + TANK.rise - 0.16, easeInOut(inv(T_DROP0, T_DROP1, t)));
  else {
    const s = t - T_DROP1;
    y = LV0 + TANK.rise - 0.16 * Math.exp(-s * 2.2) * Math.cos(s * 6.5);
  }
  // nudge upwards on "menolak kapal semula ke atas"
  y += 0.14 * Math.sin(Math.PI * clamp((t - 24.25) / 1.0)) * (t > 24.25 && t < 25.25 ? 1 : 0);
  return y + (t > T_DROP1 ? 0.03 * Math.sin(t * 1.8) : 0);
}
function labLevel(shipY) {
  let lvl = LV0;
  for (let i = 0; i < 40; i++) lvl = LV0 + TANK.rise * clamp((lvl - (shipY + KEEL)) / -KEEL, 0, 1.15);
  return lvl;
}
function labFrame(t, opts = {}) {
  const y = labShipY(t);
  const lvl = labLevel(y);
  LAB.update(t, lvl, y, opts);
  return { y, lvl, keel: y + KEEL };
}

// ======================================================================= SHOTS
const SHOTS = [
  // S1 — hook: Affan waves at us, turns and points at the giant ship; camera cranes up
  [0, 5.0, (t) => {
    HB.update(t);
    hideFx();
    HB.stone.visible = false;
    const yaw = keys(t, [[0, 0.2], [1.0, 0.2], [1.6, 0.32]], easeInOut);
    const pt = keys(t, [[1.15, 0], [1.6, 1], [4.6, 1], [4.95, 0.6]]);
    const wave = keys(t, [[0.0, 0], [0.15, 1], [0.85, 1], [1.15, 0]]);
    const rest = [-0.55, 0.3, 0.12];
    const w = POSES.waveR(t).armR;
    const armR = { reach: mixReach(rest, w.reach, wave), pole: w.pole };
    const armL = { reach: mixReach([0.55, 0.3, 0.12], [1.15, 1.38, -0.45], pt), point: pt, pole: [1, -0.5, -0.6], wz: 0.15 * pt };
    harborAffan(t, AFF_SPOT, yaw, {
      smile: 1, brow: 0.7, wow: keys(t, [[2.0, 0], [2.3, 0.7], [2.85, 0]]),
      headPitch: keys(t, [[0, 0], [1.3, 0], [1.9, -0.3], [2.85, -0.3], [3.3, -0.05]]), lookY: keys(t, [[0, 0.05], [1.3, 0.05], [1.9, 0.6], [2.85, 0.6], [3.3, 0.1]]),
      headYaw: keys(t, [[0, 0], [1.2, 0], [1.9, 0.75], [2.85, 0.75], [3.3, 0.1]]), lookX: keys(t, [[1.2, 0], [1.9, 0.6], [2.85, 0.6], [3.3, 0]]),
      armR, armL,
    });
    lookCam(cam, kv(t, [[0, [3.1, 4.55, 7.6]], [1.0, [3.2, 4.6, 7.9]], [4.95, [3.2, 3.3, 11.0]]]), kv(t, [[0, [2.0, 4.35, 1.4]], [1.0, [2.1, 4.5, 1.2]], [4.95, [6, 15, -60]]]), keys(t, [[0, 44], [1, 44], [4.95, 56]]));
    sunShadowAt(AFF_SPOT);
    const p = pop(t, 0.12, 4.85, { fin: 0.45 });
    ov.bubble('hook', 'KENAPA KAPAL BESAR\nTAK TENGGELAM?', { x: W / 2, y: 410 + Math.sin(t * 3) * 6, o: p.o, s: p.s }, { size: 92 });
    const q = pop(t, 0.5, 4.85);
    ov.tag('ep', 'EPISOD 3', { x: W / 2, y: 268, o: q.o, s: q.s }, { bg: BLUE, small: true });
    const b = pop(t, 3.42, 4.95);
    if (b.o > 0) {
      const c = scr(shipPt(10, 30, 17));
      ov.tag('berat', 'BERAT!', { x: clamp(c.x, 200, 880), y: clamp(c.y - 30, 640, 1300), o: b.o, s: b.s * (1 + 0.06 * Math.sin((t - 3.42) * 14) * Math.exp(-(t - 3.42) * 3)) }, { bg: ORANGE, pointer: 'down' });
      const tx = clamp(c.x, 200, 880);
      ov.html('wt', WEIGHT, { x: tx + (tx < 540 ? 230 : -230), y: clamp(c.y - 30, 640, 1300) + 10, o: b.o, s: b.s * 0.8, r: -8 });
    }
    return HB;
  }],
  // S2 — "Tapi kenapa dia tak tenggelam?" low along the hull at the waterline
  [5.0, 7.3, (t) => {
    HB.update(t);
    hideFx();
    HB.stone.visible = false;
    HB.aff.root.position.set(500, 0, 500);
    const k = easeInOut(inv(5.0, 7.3, t));
    lookCam(cam, shipPt(lerp(70, 62, k), lerp(1.4, 2.0, k), 30), shipPt(lerp(10, 4, k), lerp(5, 8, k), 16), 52);
    const p = pop(t, 6.38, 7.25);
    ov.bubble('tak', 'TAK TENGGELAM?', { x: W / 2, y: 420 + Math.sin(t * 3) * 6, o: p.o, s: p.s }, { size: 104, top: '#bfe8ff', bot: '#3fa2ff' });
    qmarks(t, 5.5, 7.25, W / 2, 860, [[0.12, -300, -60, '#ffcf33', -12], [0.56, 290, -130, '#3fa2ff', 10], [0.88, 230, 140, '#ffcf33', 14, 0.65]]);
    return HB;
  }],
  // S3 — "Jom ikut Affan cari jawapan!"
  [7.3, 9.3, (t) => {
    HB.update(t);
    hideFx();
    HB.stone.visible = false;
    const up = keys(t, [[7.3, 0], [7.55, 1], [8.75, 1], [9.2, 0.4]], easeOut);
    const hop = t > 8.3 && t < 8.75 ? Math.sin(((t - 8.3) / 0.45) * Math.PI) * 0.35 : 0;
    harborAffan(t, AFF_SPOT, 0.28, {
      smile: 1, brow: 0.7, bob: hop, headYaw: -0.1, lookX: 0.1,
      armR: { reach: [lerp(-0.55, -0.62, up), lerp(0.3, 1.95 + 0.05 * Math.sin(t * 14), up), lerp(0.12, 0.3, up)], pole: [-1, -0.3, -0.5] },
      armL: { reach: [0.55, 0.32, 0.18] },
      legL: { x: -0.3 * hop, knee: 0.6 * hop }, legR: { x: -0.3 * hop, knee: 0.6 * hop },
    }, 2);
    const k = easeInOut(inv(7.3, 9.3, t));
    lookCam(cam, V(lerp(3.3, 3.0, k), lerp(4.6, 4.75, k), lerp(7.0, 6.2, k)), V(2.2, lerp(4.35, 4.55, k), 1.2), 46);
    sunShadowAt(AFF_SPOT);
    ov.sparkles(t, { n: 22, seed: 5, x: 150, y: 300, w: 780, h: 700, a: inv(7.5, 7.9, t) * (1 - inv(9.0, 9.3, t)) });
    return HB;
  }],
  // S4a — Affan holds a small stone over the water and lets go: plop!
  [9.3, 12.2, (t) => {
    HB.update(t);
    const yaw = Math.PI;
    HB.aff.root.position.copy(RAIL_SPOT);
    HB.aff.pose({ yaw });
    const hold = aimReach(HB.aff, AIM, -1, 0.92);
    const lift = keys(t, [[9.3, 0.7], [9.7, 1]]);
    const after = keys(t, [[T_RELEASE, 0], [T_RELEASE + 0.5, 1]]);
    harborAffan(t, RAIL_SPOT, yaw, {
      smile: keys(t, [[9.3, 0.8], [T_SPLASH, 0.8], [T_SPLASH + 0.1, 1]]), brow: 0.5,
      headPitch: keys(t, [[9.3, 0.25], [T_RELEASE, 0.3], [T_SPLASH, 0.55]]), lookY: keys(t, [[9.3, -0.35], [T_SPLASH, -0.6]]), headYaw: 0.15, lookX: 0.3,
      wow: keys(t, [[T_SPLASH, 0], [T_SPLASH + 0.08, 0.8], [12.2, 0.8]]),
      armR: { reach: mixReach([-0.55, 0.3, 0.12], hold, lift), pole: [-1, -0.8, -0.2], wx: -0.3 * (1 - after) },
      armL: { reach: [0.45, 0.55, 0.42], pole: [1, -1, -0.3] },
    }, 3);
    const hand = HB.aff.parts.arms.R.hand.localToWorld(V(0, -0.2, 0.05));
    HB.stone.visible = true;
    if (t < T_RELEASE) HB.stone.position.copy(hand);
    else HB.stone.position.set(SPLASH.x, stoneY(t, STONE_Y0), SPLASH.z);
    HB.stone.rotation.set(t * 3, t * 2, 0);
    splashFx(t);
    const k = easeInOut(inv(9.3, 12.2, t));
    lookCam(cam, V(lerp(13.2, 12.2, k), lerp(3.7, 3.4, k), lerp(-3.6, -3.2, k)), V(2.0, lerp(2.3, 1.9, k), -0.4), 48);
    sunShadowAt(RAIL_SPOT);
    const s = scr(HB.stone.position);
    pinTag('batu', 'BATU KECIL', s, t, 9.72, T_RELEASE + 0.1, { bg: GREY, pointer: 'down', small: true }, -95);
    const pl = pop(t, T_SPLASH, 12.2, { from: 1.8, fin: 0.25 });
    ov.bubble('plop', 'PLOP!', { x: 700, y: 1000, o: pl.o, s: pl.s, r: 8 }, { size: 150, top: '#bff4ff', bot: '#2fa8ff' });
    return HB;
  }],
  // S4b — underwater: the stone sinks straight to the bottom
  [12.2, 13.84, (t) => {
    HB.update(t, { under: true });
    HB.aff.root.position.set(500, 0, 500);
    HB.stone.visible = true;
    HB.stone.position.set(SPLASH.x, stoneY(t, STONE_Y0), SPLASH.z);
    HB.stone.rotation.set(t * 3, t * 2, 0);
    splashFx(t);
    const sy = HB.stone.position.y;
    const k = easeInOut(inv(12.2, 13.84, t));
    lookCam(cam, V(lerp(6.0, 6.4, k), lerp(-2.4, -3.6, k), -4.6), V(SPLASH.x - 0.4, lerp(sy, -4.2, 0.45), SPLASH.z - 0.8), 50);
    const b = pop(t, 12.5, 13.84);
    arrowBubble(t, b);
    pinTag('tgl', 'BATU', scr(HB.stone.position), t, 12.4, 13.84, { bg: GREY, pointer: 'down', small: true }, -80);
    return HB;
  }],
  // S5 — split screen: the heavy ship floats (top), the little stone sank (bottom)
  [13.84, 16.4, (t) => {
    HB.update(t);
    HB.aff.root.position.set(500, 0, 500);
    HB.stone.visible = true;
    HB.stone.position.set(SPLASH.x, BED_Y, SPLASH.z);
    HB.stone.rotation.set(0.4, 1.2, 0);
    splashFx(t);
    const k = easeInOut(inv(13.84, 16.4, t));
    cam.aspect = camB.aspect = W / (H / 2);
    lookCam(cam, V(lerp(12, 10, k), lerp(2.8, 2.4, k), lerp(-12, -15, k)), shipPt(lerp(30, 20, k), 9, 0), 52);
    lookCam(camB, V(lerp(4.6, 4.1, k), lerp(-4.4, -4.9, k), lerp(-3.4, -2.9, k)), V(SPLASH.x - 0.2, BED_Y + 0.25, SPLASH.z - 0.3), 46);
    const TOP = { x: 0, y: 0, w: W, h: H / 2 }, BOT = { x: 0, y: H / 2, w: W, h: H / 2 };
    const sh = toScreen(shipPt(60, 30, 0), cam, TOP);
    const q1 = pop(t, 14.25, 16.35);
    ov.tag('kapal', 'KAPAL', { x: clamp(sh.x, 220, 860), y: clamp(sh.y - 60, 280, 600), o: q1.o, s: q1.s }, { bg: NAVY, pointer: 'down', small: true });
    const q2 = pop(t, 15.54, 16.35);
    ov.tag('lb', 'JAUH LEBIH BERAT', { x: W / 2, y: 820, o: q2.o, s: q2.s }, { bg: ORANGE, small: true });
    const tp = pop(t, 16.0, 16.4);
    if (tp.o > 0) arrowTag('tp', 'TERAPUNG', 'up', { x: 760, y: 700, o: tp.o, s: tp.s }, AQUA);
    const st = toScreen(HB.stone.position, camB, BOT);
    const q3 = pop(t, 13.9, 16.35);
    ov.tag('batu2', 'BATU', { x: clamp(st.x, 200, 880), y: clamp(st.y - 90, 1000, 1500), o: q3.o, s: q3.s }, { bg: GREY, pointer: 'down', small: true });
    const q4 = pop(t, 14.1, 16.35);
    if (q4.o > 0) arrowTag('tg', 'TENGGELAM', 'down', { x: 290, y: 1060, o: q4.o, s: q4.s }, GREY, true);
    ov.flash((1 - inv(13.84, 14.0, t)) * 0.3);
    return { split: [{ cam, under: false }, { cam: camB, under: true }] };
  }],
  // S6 — Affan is puzzled: the stone sinks but the ship floats?
  [16.4, 18.2, (t) => {
    HB.update(t);
    hideFx();
    HB.stone.visible = false;
    const sc = keys(t, [[16.4, 0], [16.7, 1], [17.75, 1], [18.1, 0.3]]);
    harborAffan(t, AFF_SPOT, 0.45, {
      smile: 0.25, brow: -0.6, headRoll: 0.16 * sc, headYaw: -0.35, lookX: -0.7, lookY: 0.25, headPitch: -0.08,
      armL: { reach: mixReach([0.55, 0.3, 0.12], [0.62, 1.85, 0.05], sc), pole: [1, -0.3, -0.6], point: 0.4 * sc, wz: 0.3 * Math.sin(t * 18) * sc },
      armR: { reach: [-0.4, 0.55, 0.45], pole: [-1, -1, 0] },
    }, 4);
    const k = easeInOut(inv(16.4, 18.2, t));
    lookCam(cam, V(lerp(3.6, 3.3, k), lerp(4.8, 4.9, k), lerp(6.4, 5.6, k)), V(2.0, 4.6, 1.2), 46);
    sunShadowAt(AFF_SPOT);
    qmarks(t, 16.5, 18.0, W / 2, 900, [[0.0, -310, -160, '#ffcf33', -12], [0.2, 300, -220, '#3fa2ff', 10], [0.4, 330, 40, '#ffcf33', 14, 0.6]]);
    // magic transition into the science world
    ov.swirl(t, W / 2, 900, inv(17.35, 18.2, t));
    ov.flash(inv(17.85, 18.2, t) ** 2);
    return HB;
  }],
  // S7a — science world: the ship's shape pushes water aside (TOLAK AIR)
  [18.2, 22.6, (t) => {
    const f = labFrame(t);
    const k = easeInOut(inv(18.2, 22.6, t));
    lookCam(cam, V(lerp(1.4, 0.7, k), lerp(5.6, 4.6, k), lerp(33, 28.5, k)), V(0, lerp(4.6, 3.9, k), -1), 40);
    hullEdge(f, win(t, 19.2, 20.7) * (0.75 + 0.25 * Math.sin(t * 10)));
    ov.flash(1 - inv(18.2, 18.6, t));
    ov.sparkles(t, { n: 24, seed: 3, y: 250, h: 1100, a: 0.7 });
    const bt = pop(t, 19.28, 20.5);
    const top = scr(V(0, f.y + 3.0, 0));
    ov.tag('bentuk', 'BENTUK KAPAL', { x: W / 2, y: clamp(top.y - 50, 300, 1400), o: bt.o, s: bt.s }, { bg: NAVY, pointer: 'down' });
    // the old water level and the push-aside arrows
    displaceArrows(t, f);
    const ta = pop(t, 20.62, 22.6);
    ov.bubble('tolak', 'TOLAK AIR', { x: W / 2, y: 420 + Math.sin(t * 3) * 6, o: ta.o, s: ta.s }, { size: 130, top: '#bff4ff', bot: '#2fa8ff' });
    return LAB;
  }],
  // S7b — closer on the hull bottom: the water pushes the ship back up
  [22.6, 25.85, (t) => {
    const f = labFrame(t);
    const k = easeInOut(inv(22.6, 25.85, t));
    lookCam(cam, V(lerp(-2.0, -1.2, k), lerp(2.6, 2.7, k), lerp(17, 15.5, k)), V(0, lerp(3.0, 3.2, k), -1), 40);
    hullEdge(f);
    ov.flash((1 - inv(22.6, 22.8, t)) * 0.25);
    pushArrows(t, f, 0);
    const a = pop(t, 23.7, 25.85);
    arrowTag('keatas', 'TOLAK KE ATAS', 'up', { x: W / 2, y: 380, o: a.o, s: a.s }, AQUA);
    return LAB;
  }],
  // S8 — the push has a name: DAYA APUNGAN
  [25.85, 29.5, (t) => {
    const f = labFrame(t);
    const k = easeOut(inv(25.85, 29.5, t));
    lookCam(cam, V(lerp(1.5, 0.8, k), lerp(3.4, 3.7, k), lerp(21, 18.5, k)), V(0, lerp(3.4, 3.5, k), -1), 40);
    hullEdge(f);
    ov.flash((1 - inv(25.85, 26.05, t)) * 0.25);
    const merge = easeInOut(inv(25.95, 26.9, t));
    pushArrows(t, f, merge);
    const big = easeOut(inv(26.5, 27.3, t));
    bigUp(t, f, big, 1.55 * big, 0);
    const d = pop(t, 27.93, 29.5, { fin: 0.4, from: 2 });
    ov.bubble('daya', 'DAYA APUNGAN', { x: W / 2, y: 420 + Math.sin(t * 3) * 6, o: d.o, s: d.s }, { size: 118, top: '#b6ffe9', bot: '#14c79f' });
    ov.sparkles(t, { n: 26, seed: 12, y: 300, h: 900, a: inv(27.9, 28.3, t) * (1 - inv(29.2, 29.5, t)) });
    return LAB;
  }],
  // S9 — balance: weight down, buoyancy up; strong enough -> it floats
  [29.5, 34.9, (t) => {
    const f = labFrame(t);
    const k = easeInOut(inv(29.5, 34.9, t));
    lookCam(cam, V(lerp(3.0, 1.8, k), lerp(4.6, 4.3, k), lerp(26, 24, k)), V(0, 3.6, -1), 40);
    hullEdge(f);
    ov.flash((1 - inv(29.5, 29.7, t)) * 0.25);
    const grow = keys(t, [[29.5, 0.55], [30.8, 0.6], [31.7, 1.0]], easeOut) * (1 + 0.04 * Math.sin(Math.max(0, t - 30.8) * 18) * Math.exp(-Math.max(0, t - 30.8) * 2));
    bigUp(t, f, 1, 2.7 * grow, 1.25);
    const up = pop(t, 30.04, 34.9);
    const cM = scr(V(1.25, f.keel - 1.3 * grow, 0));
    if (up.o > 0) arrowTag('dUp', 'DAYA APUNGAN', 'up', { x: clamp(cM.x + 250, 280, 800), y: clamp(cM.y, 300, 1300), o: up.o, s: up.s }, AQUA, true);
    const dn = easeOut(inv(32.52, 33.1, t));
    if (dn > 0) {
      const a = scr(V(-1.25, f.y + 0.25, 0)), b = scr(V(-1.25, f.y + 0.25 - 2.7 * dn, 0));
      fatArrow(a.x, a.y, b.x, b.y, { w: 70, c1: '#ffb36b', c2: '#ff5a3d', a: clamp(dn * 3) });
    }
    const bq = pop(t, 32.52, 34.9);
    const cB = scr(V(-1.25, f.y + 2.4, 0));
    if (bq.o > 0) arrowTag('dDn', 'BERAT', 'down', { x: clamp(cB.x - 40, 220, 800), y: clamp(cB.y - 40, 300, 1360), o: bq.o, s: bq.s }, ORANGE);
    const eq = pop(t, 33.1, 34.9);
    const mid = scr(V(0, f.keel - 1.3, 0.3));
    ov.html('eq', `<div class="tag" style="background:#ffffff;color:${NAVY};box-shadow:0 8px 0 rgba(0,0,0,0.22),0 0 0 6px ${NAVY}">=</div>`, { x: mid.x, y: mid.y, o: eq.o, s: eq.s });
    const tp = pop(t, 33.6, 34.9, { from: 1.8 });
    ov.bubble('terapung', 'TERAPUNG!', { x: W / 2 - 40, y: 420 + Math.sin(t * 3) * 6, o: tp.o, s: tp.s }, { size: 128, top: '#b6ffe9', bot: '#14c79f' });
    ov.html('chk', CHECK, { x: 900, y: 430, o: tp.o, s: tp.s * 0.75 });
    ov.sparkles(t, { n: 26, seed: 21, y: 260, h: 900, a: inv(33.6, 34.0, t) });
    return LAB;
  }],
  // S10a — back at the harbour: "Waaah!"
  [34.9, 36.15, (t) => {
    HB.update(t);
    hideFx();
    HB.stone.visible = false;
    const jump = t > 35.0 && t < 35.6 ? Math.sin(((t - 35.0) / 0.6) * Math.PI) * 0.5 : 0;
    const up = keys(t, [[34.95, 0], [35.15, 1], [35.85, 1], [36.15, 0.5]]);
    harborAffan(t, AFF_SPOT, 0.3, {
      bob: jump, wow: keys(t, [[34.95, 0], [35.08, 1], [35.8, 1], [36.0, 0]]), brow: 1, smile: 1, blink: 0, headPitch: -0.1, lookY: 0.2,
      armL: { reach: [lerp(0.55, 0.9, up), lerp(0.3, 1.85, up), lerp(0.12, 0.3, up)], pole: [1, -0.4, -0.5] },
      armR: { reach: [lerp(-0.55, -0.9, up), lerp(0.3, 1.85, up), lerp(0.12, 0.3, up)], pole: [-1, -0.4, -0.5] },
      legL: { x: -0.25 * jump, knee: 0.6 * jump }, legR: { x: -0.25 * jump, knee: 0.6 * jump },
    }, 6);
    lookCam(cam, V(3.1, 4.5, lerp(6.6, 6.1, inv(34.9, 36.15, t))), V(2.1, 4.5, 1.2), 46);
    sunShadowAt(AFF_SPOT);
    ov.flash((1 - inv(34.9, 35.2, t)) * 0.9);
    ov.sparkles(t, { n: 30, seed: 8, y: 250, h: 900, a: inv(35.0, 35.3, t) });
    return HB;
  }],
  // S10b — "Rupanya air boleh angkat kapal yang berat!"
  [36.15, 39.15, (t) => {
    HB.update(t);
    hideFx();
    HB.stone.visible = false;
    harborAffan(t, AFF_SPOT, 2.95, { smile: 1, brow: 0.6, headPitch: -0.3, lookY: 0.5, armL: { reach: [0.55, 0.3, 0.12] }, armR: { reach: [-0.55, 0.3, 0.12] } }, 7);
    const k = easeInOut(inv(36.15, 39.15, t));
    lookCam(cam, V(lerp(0.2, 0.5, k), lerp(5.2, 5.4, k), lerp(8.2, 7.4, k)), shipPt(lerp(55, 50, k), lerp(4, 7, k), 0), 54);
    sunShadowAt(AFF_SPOT);
    // buoyancy arrows along the real ship's waterline
    const a = inv(36.8, 37.2, t);
    for (let i = 0; i < 5; i++) {
      const x = -40 + i * 30;
      const b = scr(shipPt(x, -9, 18)), c = scr(shipPt(x, -1.2, 18));
      const ph = (t * 1.2 + i * 0.21) % 1;
      const lift = 30 * Math.sin(ph * Math.PI * 2);
      if (b.visible) fatArrow(b.x, b.y + 70 - lift, c.x, c.y - 10 - lift, { w: 34, c1: '#a6fff0', c2: '#14c79f', a: a * 0.95 });
    }
    const q = pop(t, 37.54, 39.1);
    ov.bubble('angkat', 'AIR ANGKAT KAPAL!', { x: W / 2, y: 420 + Math.sin(t * 3) * 6, o: q.o, s: q.s }, { size: 92, top: '#b6ffe9', bot: '#14c79f' });
    return HB;
  }],
  // S11 — thumbs up, then "what shall we investigate next?"
  [39.15, OUTRO, (t) => {
    HB.update(t);
    hideFx();
    HB.stone.visible = false;
    const th = keys(t, [[39.25, 0], [39.6, 1], [41.2, 1], [41.5, 0]]);
    const tk = keys(t, [[41.5, 0], [41.9, 1], [OUTRO, 1]]);
    const upA = POSES.thumbsUpR.armR, thA = POSES.thinkR.armR;
    const rest = [-0.55, 0.3, 0.12];
    let armR = { reach: rest };
    if (th > 0) armR = { reach: mixReach(rest, [-0.45, 1.0, 0.62], th), pole: upA.pole, thumb: th, wy: upA.wy * th, wx: upA.wx * th };
    else if (tk > 0) armR = { reach: mixReach(rest, thA.reach, tk), pole: thA.pole, point: tk, wx: thA.wx * tk };
    harborAffan(t, AFF_SPOT, 0.22, {
      smile: 1, brow: 0.4 + 0.4 * tk, headRoll: -0.12 * tk, headYaw: -0.05 + 0.05 * wobble(t, 2), lookX: 0.35 * tk, lookY: 0.4 * tk, headPitch: -0.08 * tk,
      armR, armL: { reach: [0.55, 0.3, 0.12] },
    }, 9);
    const k = easeInOut(inv(39.15, OUTRO, t));
    lookCam(cam, V(lerp(3.2, 2.85, k), lerp(4.75, 4.85, k), lerp(6.6, 5.6, k)), V(2.05, 4.55, 1.2), 46);
    sunShadowAt(AFF_SPOT);
    ov.flash((1 - inv(39.15, 39.3, t)) * 0.3);
    if (th > 0.5) {
      const hand = scr(HB.aff.parts.arms.R.hand.getWorldPosition(V(0, 0, 0)));
      ov.sparkles(t, { n: 14, seed: 33, x: hand.x - 170, y: hand.y - 210, w: 340, h: 320, a: inv(39.5, 39.8, t) * (1 - inv(41.1, 41.4, t)), size: 30 });
    }
    const head = scr(V(AFF_SPOT.x, AFF_SPOT.y + 2.9, AFF_SPOT.z));
    qmarks(t, 41.7, OUTRO, head.x, head.y, [[0.0, -270, -240, '#ffcf33', -12], [0.3, 260, -290, '#3fa2ff', 10], [0.6, 310, -70, '#ffcf33', 14, 0.7]]);
    return HB;
  }],
  // Outro — The Curious Affan logo
  [OUTRO, DURATION, (t) => outroShot(t, OUTRO, { ov, cam, outro, lookCam })],
];

function win(t, a, b, f = 0.25) {
  if (t < a || t > b) return 0;
  return Math.min(clamp((t - a) / f), clamp((b - t) / f));
}

function arrowBubble(t, b) {
  if (b.o <= 0) return;
  ov.bubble('bt', 'BATU = TENGGELAM', { x: W / 2, y: 420 + Math.sin(t * 3) * 6, o: b.o, s: b.s }, { size: 100, top: '#e6ecf5', bot: '#8b9bb8' });
}

// Science world: water pushed aside as the hull goes in (plus the old level).
function displaceArrows(t, f) {
  const a = inv(20.35, 20.7, t) * (1 - inv(22.35, 22.6, t));
  if (a <= 0) return;
  const g = ov.g;
  // old water level: dashed line across the tank
  const l0 = scr(V(TANK.x0, LV0, 0.02)), l1 = scr(V(TANK.x1, LV0, 0.02));
  g.save();
  g.globalAlpha = a;
  g.setLineDash([22, 16]);
  g.lineDashOffset = -t * 60;
  g.strokeStyle = 'rgba(255,255,255,0.95)';
  g.lineWidth = 6;
  g.beginPath();
  g.moveTo(l0.x, l0.y);
  g.lineTo(l1.x, l1.y);
  g.stroke();
  g.restore();
  // outward arrows at both ends of the hull, sliding with the flow
  const half = 100 * S;
  for (const s of [-1, 1]) {
    for (let i = 0; i < 2; i++) {
      const ph = (t * 0.9 + i * 0.5) % 1;
      const y = f.lvl - 0.12 - i * 0.24;
      const x0 = s * (half + 0.15 + ph * 0.5), x1 = s * (half + 1.25 + ph * 0.5);
      const p0 = scr(V(x0, y, 0.05)), p1 = scr(V(x1, y + 0.04, 0.05));
      fatArrow(p0.x, p0.y, p1.x, p1.y, { w: 26, c1: '#ffe680', c2: '#ffb21f', a: a * Math.min(1, Math.sin(ph * Math.PI) * 1.6) });
    }
  }
  // level-rise chevrons by the side wall
  for (const x of [TANK.x0 + 0.5, TANK.x1 - 0.5]) {
    const p = scr(V(x, f.lvl + 0.55, 0.05));
    ov.html('lv' + (x > 0 ? 1 : 0), `<svg width="60" height="60" viewBox="0 0 60 60"><path d="M10 40 L30 18 L50 40" fill="none" stroke="#fff" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/></svg>`, { x: p.x, y: p.y - 10 * Math.sin(t * 6), o: a, s: 0.8 });
  }
}

// The cut edge of the cutaway hull (red below the design waterline, navy
// above), plus an optional glowing outline of the whole hull shape.
function hullEdge(f, glowA = 0) {
  const P = (x, y) => scr(V(x * S, f.y + y * S, 0.04));
  const pts = [];
  pts.push([-100, yDeck(-1)]);
  for (let i = 0; i <= 60; i++) {
    const xn = -1 + (2 * i) / 60;
    pts.push([xn * 100, yBot(xn)]);
  }
  pts.push([100, yDeck(1)]);
  const g = ov.g;
  if (glowA > 0) {
    g.save();
    g.globalAlpha = clamp(glowA);
    g.strokeStyle = '#ffe45c';
    g.shadowColor = '#ffe45c';
    g.shadowBlur = 30;
    g.lineWidth = 16;
    g.lineJoin = g.lineCap = 'round';
    g.beginPath();
    [...pts, ...Array.from({ length: 21 }, (_, i) => [100 - i * 10, yDeck(1 - i / 10)])].forEach(([x, y], i) => {
      const p = P(x, y);
      if (i) g.lineTo(p.x, p.y);
      else g.moveTo(p.x, p.y);
    });
    g.closePath();
    g.stroke();
    g.restore();
  }
  g.save();
  g.lineCap = 'round';
  g.lineWidth = 9;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
    const a = P(x0, y0), b = P(x1, y1);
    g.strokeStyle = (y0 + y1) / 2 < -0.55 ? '#d8443a' : '#1f2b5c';
    g.beginPath();
    g.moveTo(a.x, a.y);
    g.lineTo(b.x, b.y);
    g.stroke();
  }
  g.restore();
}

// Small upward pressure arrows under the hull; merge (0..1) pulls them together.
function pushArrows(t, f, merge) {
  const a = inv(22.75, 23.1, t) * (1 - merge);
  if (a <= 0) return;
  const pulse = 1 + 0.25 * Math.sin(Math.PI * clamp((t - 23.7) / 0.6)) * (t > 23.7 && t < 24.3 ? 1 : 0);
  for (let i = 0; i < 7; i++) {
    const x = lerp(-2.7 + i * 0.9, 0, merge);
    const grow = easeOut(inv(22.8 + i * 0.06, 23.2 + i * 0.06, t));
    const ph = (t * 1.4 + i * 0.13) % 1;
    const yTop = f.y + yBot(x / (100 * S)) * S - 0.05;
    const len = (0.75 + 0.1 * Math.sin(ph * Math.PI * 2)) * grow * pulse;
    const b = scr(V(x, yTop - len, 0.05)), c = scr(V(x, yTop, 0.05));
    fatArrow(b.x, b.y, c.x, c.y, { w: 26, c1: '#a6fff0', c2: '#14c79f', a });
  }
}

// One big buoyancy arrow under the hull (length in world units).
function bigUp(t, f, a, len, x = 0) {
  if (a <= 0 || len <= 0.05) return;
  const yTop = f.keel - 0.05;
  const b = scr(V(x, yTop - len, 0.05)), c = scr(V(x, yTop, 0.05));
  fatArrow(b.x, b.y, c.x, c.y, { w: 70, c1: '#b6fff4', c2: '#0fb48f', a: clamp(a * 2), glow: 0.6 + 0.4 * Math.sin(t * 5) });
}

function renderHarbor(c, under) {
  HB.update(curT, { under });
  HB.sky.visible = !under;
  HB.scene.background = under ? UNDER_BG : null;
  HB.sky.position.copy(c.position);
  renderer.render(HB.scene, c);
}
const UNDER_BG = new THREE.Color(0x0e6f8f);
let curT = 0;

function frame(t) {
  curT = t;
  ov.begin();
  cam.aspect = W / H;
  cam.updateProjectionMatrix();
  const shot = SHOTS.find(([a, b]) => t >= a && t < b) || SHOTS[SHOTS.length - 1];
  const world = shot[2](t);
  if (world.split) {
    renderer.setScissorTest(true);
    world.split.forEach(({ cam: c, under }, i) => {
      const y = i === 0 ? H / 2 : 0;
      renderer.setViewport(0, y, W, H / 2);
      renderer.setScissor(0, y, W, H / 2);
      renderHarbor(c, under);
    });
    renderer.setScissorTest(false);
    renderer.setViewport(0, 0, W, H);
    const g = ov.g;
    g.fillStyle = 'rgba(10,16,50,0.35)';
    g.fillRect(0, H / 2 - 2, W, 16);
    g.fillStyle = '#ffffff';
    g.fillRect(0, H / 2 - 6, W, 12);
  } else if (world === HB) {
    renderHarbor(cam, cam.position.y < 0);
  } else {
    if (world.sky) world.sky.position.copy(cam.position);
    renderer.render(world.scene, cam);
  }
  if (world !== outro) ov.vignette(world === HB && cam.position.y < 0 ? 0.5 : 0.28);
  ov.captions(t, CAPTIONS, KEYWORDS);
  ov.end();
}

window.EP = {
  fps: FPS,
  duration: DURATION,
  frame,
  ready: (async () => {
    env = await loadEnvelope('./audio/narration.mp3', FPS);
    await Promise.all(['800 60px "Baloo 2"', '700 60px "Baloo 2"', '700 60px Fredoka', '600 60px Fredoka'].map((f) => document.fonts.load(f)));
    HB = buildHarbor();
    LAB = buildLab();
    outro = buildOutro();
    // where the stone leaves Affan's hand (fixes the fall path for every frame)
    SHOTS[3][2](T_RELEASE - 1e-4);
    STONE_Y0 = HB.stone.position.y;
    G = (2 * STONE_Y0) / (T_SPLASH - T_RELEASE) ** 2;
    SPLASH.set(HB.stone.position.x, 0, HB.stone.position.z);
    BED_Y = seabedY(SPLASH.z) + 0.14;
    _land = null;
    frame(0);
    return true;
  })(),
};
