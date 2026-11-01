// THE CURIOUS AFFAN — Episode 006: "Kenapa Air Laut Masin?"
// Every shot is a pure function of time t (seconds), synced to audio/narration.mp3.
import * as THREE from 'three';
import { makeRenderer, loadEnvelope, toScreen, clamp, lerp, inv, smooth, easeOut, easeInOut, backOut, keys, wobble, rng, W, H } from '../../shared/core.js';
import { makeAffan, POSES, blinkAt } from '../../shared/affan.js';
import { Overlay, pop, ICONS, bubbleSVG } from '../../shared/overlay.js';
import { waveH, SEATED, seatAffan } from '../../shared/tropical.js';
import { CAPTIONS, KEYWORDS } from './captions.js';
import { buildBeach, buildLand, buildUnder, buildSlice, buildOutro, sandY, ROCKS_AT, SLICE } from './worlds.js';

const FPS = 30;
const DURATION = 47.5;

const stage = document.getElementById('stage');
const canvas = document.createElement('canvas');
stage.appendChild(canvas);
const renderer = makeRenderer(canvas);
const ov = new Overlay(stage);
const capCss = document.createElement('style');
capCss.textContent = '.cap .w { margin: 0 15px !important; }';
document.head.appendChild(capCss);
const beach = buildBeach();
const land = buildLand();
const under = buildUnder();
const slice = buildSlice();
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
const ORANGE = '#ff8a3d', BLUE = '#2f9bff', TEAL = '#14b8c8', PURPLE = '#9b5cff', GREEN = '#2fb86a';

// --------------------------------------------------------------- svg icons
const SVG = {
  shaker: (t) => `<svg width="260" height="380" viewBox="0 0 260 380">
    <g transform="rotate(${Math.sin(t * 14) * 14} 130 200)">
    <path d="M60 120 Q60 100 80 96 L180 96 Q200 100 200 120 L214 330 Q214 360 184 360 L76 360 Q46 360 46 330 Z" fill="#e9f8ff" stroke="#17256b" stroke-width="12"/>
    <path d="M58 220 L202 220 L212 330 Q212 352 184 352 L76 352 Q48 352 48 330 Z" fill="#ffffff"/>
    <g fill="#d6e4f4">${Array.from({ length: 22 }, (_, i) => `<rect x="${62 + (i * 37) % 136}" y="${232 + ((i * 53) % 110)}" width="12" height="12" rx="2" transform="rotate(${i * 23} ${68 + (i * 37) % 136} ${238 + ((i * 53) % 110)})"/>`).join('')}</g>
    <path d="M70 100 Q70 30 130 30 Q190 30 190 100 Z" fill="#c9d3e6" stroke="#17256b" stroke-width="12"/>
    <g fill="#17256b"><circle cx="110" cy="62" r="7"/><circle cx="130" cy="50" r="7"/><circle cx="150" cy="62" r="7"/><circle cx="130" cy="76" r="7"/></g>
    <ellipse cx="88" cy="190" rx="12" ry="40" fill="#fff" opacity="0.85"/>
    </g></svg>`,
  burst: (text, c1 = '#ffe45c', c2 = '#ff6b3d') => {
    const pts = Array.from({ length: 24 }, (_, i) => {
      const a = (i / 24) * Math.PI * 2, r = i % 2 ? 150 : 205;
      return `${230 + Math.cos(a) * r * 1.15},${210 + Math.sin(a) * r * 0.85}`;
    }).join(' ');
    return `<svg width="460" height="420" viewBox="0 0 460 420"><defs><linearGradient id="bu" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs>
      <polygon points="${pts}" fill="#fff" stroke="#fff" stroke-width="26" stroke-linejoin="round"/><polygon points="${pts}" fill="url(#bu)" stroke="#17256b" stroke-width="10" stroke-linejoin="round"/>
      <text x="230" y="250" text-anchor="middle" font-family="Baloo 2" font-weight="800" font-size="104" fill="#fff" stroke="#17256b" stroke-width="16" paint-order="stroke" stroke-linejoin="round">${text}</text></svg>`;
  },
  clock: (t) => {
    const a1 = t * 900, a2 = t * 75;
    return `<svg width="230" height="230" viewBox="0 0 230 230"><circle cx="115" cy="115" r="100" fill="#fff" stroke="#17256b" stroke-width="14"/><circle cx="115" cy="115" r="86" fill="none" stroke="#ffd84a" stroke-width="8"/>
      <g stroke="#17256b" stroke-width="8" stroke-linecap="round">${Array.from({ length: 12 }, (_, i) => `<line x1="115" y1="34" x2="115" y2="${i % 3 ? 44 : 52}" transform="rotate(${i * 30} 115 115)"/>`).join('')}</g>
      <line x1="115" y1="115" x2="115" y2="66" stroke="#17256b" stroke-width="13" stroke-linecap="round" transform="rotate(${a2} 115 115)"/>
      <line x1="115" y1="115" x2="115" y2="44" stroke="#ff6b3d" stroke-width="9" stroke-linecap="round" transform="rotate(${a1} 115 115)"/>
      <circle cx="115" cy="115" r="12" fill="#17256b"/></svg>`;
  },
  arrowV: (up, c = '#fff') => `<svg width="56" height="64" viewBox="0 0 56 64" style="display:block"><path d="${up ? 'M28 4 L52 32 H37 V60 H19 V32 H4 Z' : 'M28 60 L52 32 H37 V4 H19 V32 H4 Z'}" fill="${c}" stroke="rgba(0,0,0,0.15)" stroke-width="3" stroke-linejoin="round"/></svg>`,
  badge: (kind) => {
    const inner = {
      batu: `<path d="M30 92 L48 52 L70 62 L84 40 L104 70 L110 92 Z" fill="#a0948a" stroke="#17256b" stroke-width="7" stroke-linejoin="round"/><circle cx="62" cy="78" r="6" fill="#ff7ad9"/><circle cx="88" cy="72" r="5" fill="#52e0ff"/><circle cx="50" cy="84" r="5" fill="#ffd34a"/>`,
      sungai: `<path d="M44 26 C90 40 30 70 70 82 C100 92 86 104 96 112" fill="none" stroke="#17256b" stroke-width="26" stroke-linecap="round"/><path d="M44 26 C90 40 30 70 70 82 C100 92 86 104 96 112" fill="none" stroke="#3fc6f2" stroke-width="14" stroke-linecap="round"/>`,
      laut: `<path d="M18 70 Q36 54 54 70 T90 70 T126 70 V112 H18 Z" fill="#2f9bff" stroke="#17256b" stroke-width="7" stroke-linejoin="round"/><path d="M26 88 Q40 78 54 88 T82 88 T110 88" fill="none" stroke="#bff0ff" stroke-width="6" stroke-linecap="round"/><g fill="#fff" stroke="#17256b" stroke-width="3"><rect x="40" y="94" width="11" height="11" rx="2"/><rect x="72" y="98" width="11" height="11" rx="2"/><rect x="98" y="92" width="11" height="11" rx="2"/></g>`,
    }[kind];
    return `<svg width="144" height="144" viewBox="0 0 144 144"><circle cx="72" cy="72" r="64" fill="#fff" stroke="#17256b" stroke-width="8"/>${inner}</svg>`;
  },
  chev: (c = '#fff') => `<svg width="70" height="90" viewBox="0 0 70 90"><path d="M15 10 L55 45 L15 80" fill="none" stroke="${c}" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
};

function arrowTag(id, text, up, p, bg) {
  return ov.html(id, `<div class="tag" style="background:${bg};display:flex;align-items:center;gap:14px">${text}${SVG.arrowV(up)}</div>`, p);
}
function pinTag(id, text, p, t, a, b, style, dy = -90) {
  const q = pop(t, a, b);
  if (q.o <= 0 || !p.visible) return;
  ov.tag(id, text, { x: clamp(p.x, 190, 890), y: clamp(p.y + dy, 300, 1360), o: q.o, s: q.s }, style);
}

// --------------------------------------------------------------- canvas fx
function squiggles(cx, cy, t, a, n = 3, color = '#7be07b') {
  const g = ov.g;
  g.save();
  g.globalAlpha = clamp(a);
  g.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const ang = -Math.PI / 2 + (i - (n - 1) / 2) * 0.55;
    const r0 = 230, r1 = 330;
    g.beginPath();
    for (let k = 0; k <= 20; k++) {
      const r = lerp(r0, r1, k / 20) + ((t * 120) % 20);
      const wob = Math.sin(k * 0.9 + t * 12 + i) * 14;
      const x = cx + Math.cos(ang) * r - Math.sin(ang) * wob, y = cy + Math.sin(ang) * r + Math.cos(ang) * wob;
      k ? g.lineTo(x, y) : g.moveTo(x, y);
    }
    g.strokeStyle = '#ffffff';
    g.lineWidth = 20;
    g.stroke();
    g.strokeStyle = color;
    g.lineWidth = 10;
    g.stroke();
  }
  g.restore();
}

function saltGrains(x, y0, y1, t, a, seed = 3) {
  const g = ov.g;
  const R = rng(seed);
  g.save();
  g.globalAlpha = clamp(a);
  for (let i = 0; i < 40; i++) {
    const ph = R(), dx = (R() - 0.5) * 110, s = 8 + R() * 8;
    const k = (ph + t * 1.4) % 1;
    const px = x + dx * k, py = lerp(y0, y1, k);
    g.fillStyle = '#ffffff';
    g.strokeStyle = '#17256b';
    g.lineWidth = 3;
    g.save();
    g.translate(px, py);
    g.rotate(ph * 6 + t * 3);
    g.fillRect(-s / 2, -s / 2, s, s);
    g.strokeRect(-s / 2, -s / 2, s, s);
    g.restore();
  }
  g.restore();
}

function bubbleWipe(k, seed = 4) {
  if (k <= 0 || k >= 1) return;
  const g = ov.g;
  const R = rng(seed);
  for (let i = 0; i < 70; i++) {
    const x = R() * W, r = 40 + R() * 120, d = R() * 0.35;
    const kk = clamp((k - d) / 0.65);
    if (kk <= 0 || kk >= 1) continue;
    const y = lerp(H + r, -r, kk);
    g.fillStyle = 'rgba(210,245,255,0.85)';
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = 'rgba(255,255,255,0.95)';
    g.lineWidth = 6;
    g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.9)';
    g.beginPath();
    g.arc(x - r * 0.35, y - r * 0.35, r * 0.18, 0, Math.PI * 2);
    g.fill();
  }
  const mid = Math.sin(k * Math.PI);
  g.fillStyle = `rgba(160,230,255,${0.85 * clamp(mid * 1.6 - 0.4)})`;
  g.fillRect(0, 0, W, H);
}

function heatWaves(sx, sy, ex, ey, t, a) {
  const g = ov.g;
  g.save();
  g.globalAlpha = clamp(a);
  g.lineCap = 'round';
  for (let i = 0; i < 3; i++) {
    const off = (i - 1) * 70;
    g.beginPath();
    for (let k = 0; k <= 30; k++) {
      const u = k / 30;
      const x = lerp(sx + off, ex + off * 1.6, u) + Math.sin(u * 14 - t * 9 + i) * 16;
      const y = lerp(sy, ey, u);
      k ? g.lineTo(x, y) : g.moveTo(x, y);
    }
    g.setLineDash([26, 22]);
    g.lineDashOffset = -t * 160;
    g.strokeStyle = 'rgba(255,255,255,0.9)';
    g.lineWidth = 16;
    g.stroke();
    g.strokeStyle = '#ffb02e';
    g.lineWidth = 8;
    g.stroke();
  }
  g.restore();
}

// Arrow along a list of screen points, revealed up to fraction k, flowing dashes.
function pathArrow(pts, k, t, { color = '#5fe0ff', w = 16, a = 1 } = {}) {
  if (k <= 0 || pts.length < 2) return;
  const g = ov.g;
  let total = 0;
  const seg = [];
  for (let i = 1; i < pts.length; i++) {
    const d = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    seg.push(d);
    total += d;
  }
  const L = total * clamp(k);
  const out = [pts[0]];
  let acc = 0;
  for (let i = 1; i < pts.length; i++) {
    if (acc + seg[i - 1] >= L) {
      const f = (L - acc) / seg[i - 1];
      out.push({ x: lerp(pts[i - 1].x, pts[i].x, f), y: lerp(pts[i - 1].y, pts[i].y, f) });
      break;
    }
    out.push(pts[i]);
    acc += seg[i - 1];
  }
  g.save();
  g.globalAlpha = clamp(a);
  g.lineCap = 'round';
  g.lineJoin = 'round';
  const stroke = (style, lw, dash) => {
    g.beginPath();
    out.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)));
    g.setLineDash(dash || []);
    g.lineDashOffset = -t * 140;
    g.strokeStyle = style;
    g.lineWidth = lw;
    g.stroke();
  };
  stroke('rgba(23,37,107,0.55)', w + 16);
  stroke('#ffffff', w + 8);
  stroke(color, w);
  stroke('rgba(255,255,255,0.9)', w * 0.35, [18, 30]);
  // arrowhead
  const p1 = out[out.length - 1], p0 = out[Math.max(0, out.length - 2)];
  const ang = Math.atan2(p1.y - p0.y, p1.x - p0.x);
  g.translate(p1.x, p1.y);
  g.rotate(ang);
  g.setLineDash([]);
  g.beginPath();
  g.moveTo(34, 0);
  g.lineTo(-18, -30);
  g.lineTo(-18, 30);
  g.closePath();
  g.fillStyle = color;
  g.strokeStyle = '#ffffff';
  g.lineWidth = 8;
  g.stroke();
  g.fill();
  g.restore();
}

// ---------------------------------------------------------------- helpers
function hook(t) {
  const p = pop(t, 0.12, 5.75, { fin: 0.45 });
  const fl = Math.sin(t * 3) * 6;
  ov.bubble('hook', 'KENAPA AIR LAUT\nMASIN?', { x: W / 2, y: 410 + fl, o: p.o, s: p.s }, { size: 104, top: '#8ff0ff', bot: '#1d9bf0' });
  const q = pop(t, 0.5, 5.75);
  ov.tag('ep', 'EPISOD 6', { x: W / 2, y: 268, o: q.o, s: q.s }, { bg: ORANGE, small: true });
}

function sunAt(light, focus, dir = V(0.45, 0.8, 0.55), dist = 30) {
  light.target.position.copy(focus);
  light.position.copy(focus).addScaledVector(dir.clone().normalize(), dist);
}

function beachSea(t) {
  beach.sea.userData.update(t, 1);
  beach.glints.userData.update(t);
  beach.sub.userData.update(t);
  beach.splash.userData.update(t, -99, V(0, 0, 0));
  beach.splash2.userData.update(t, -99, V(0, 0, 0));
}
const affanY = (x, z) => sandY(x, z);
function crabAt(c, x, z, rotY = 0) {
  c.position.set(x, sandY(x, z), z);
  c.rotation.y = rotY;
}
function subAffan(aff, t, p = {}) {
  const { armL = {}, armR = {}, ...rest } = p;
  aff.pose({ ...SEATED, blink: blinkAt(t, 2), talk: talk(t), smile: 0.9, ...rest, armL: { reach: [0.55, 0.62, 0.4], ...armL }, armR: { reach: [-0.55, 0.62, 0.4], ...armR } });
}

// mouth position (torso-local) for the "taste" finger
const MOUTH = [-0.04, 1.44, 0.74];

// ======================================================================= SHOTS
const SHOTS = [
  // A — hook: Affan tastes the sea water. "Eee! Masinnya air laut ni!"
  [0, 2.85, (t) => {
    beachSea(t);
    const A = beach.aff;
    A.root.position.set(0, affanY(0, 2), 2);
    beach.crab.position.set(0, -10, 0);
    beach.sub.position.set(0, -20, -30);
    const away = keys(t, [[0.32, 0], [0.62, 1]]);
    const fan = keys(t, [[0.85, 0], [1.05, 1], [2.3, 1], [2.6, 0]]);
    const shake = t > 0.9 && t < 2.4 ? Math.sin((t - 0.9) * 13) * 0.22 * Math.sin(inv(0.9, 2.4, t) * Math.PI) : 0;
    const rest = [-0.62, 0.32, 0.25];
    const fanR = [-0.32 + 0.12 * Math.sin(t * 18), 1.32, 0.78];
    const armR = fan > 0 ? { reach: rest.map((r, i) => lerp(r, fanR[i], fan)), pole: [-1, -0.6, -0.4], wz: 0.4 * Math.sin(t * 18) * fan }
      : { reach: MOUTH.map((m, i) => lerp(m, rest[i], easeOut(away))), point: 1 - away, pole: [-1, -0.6, -0.2], wx: -0.4 * (1 - away) };
    A.pose({
      yaw: 0.05, blink: t < 0.85 ? 0.6 : 0.25 + 0.15 * Math.sin(t * 6), brow: -0.7, smile: 0.1, talk: talk(t),
      headYaw: shake, headRoll: 0.06 + 0.05 * Math.sin(t * 9) * fan, headPitch: -0.02,
      lean: -0.05, bob: 0.03 * Math.sin(t * 9) * fan,
      armR, armL: { reach: [0.5, 0.55, 0.55], pole: [1, -1, -0.2] },
    });
    beach.splash.userData.update(t, -0.45, V(0.2, 0.1, 2.9), 6.5);
    const k = easeOut(inv(0, 2.85, t));
    lookCam(V(lerp(0.4, 0.2, k), 3.1, lerp(7.7, 6.8, k)), V(0, 3.05, 2), 50);
    sunAt(beach.sun, V(0, 1.5, 2));
    hook(t);
    const head = scr(V(0, 3.0, 2));
    squiggles(head.x, head.y, t, 1 - inv(0.75, 0.95, t), 3);
    const b = pop(t, 0.95, 2.75, { from: 0.2 });
    ov.html('masin', SVG.burst('MASIN!'), { x: 790, y: 980 + Math.sin(t * 7) * 6, o: b.o, s: b.s * 0.75, r: 8 });
    return beach;
  }],
  // B — "Tapi... siapa letak garam dalam laut?" (salt-shaker gag, crab peeks out)
  [2.85, 5.85, (t) => {
    beachSea(t);
    const A = beach.aff;
    A.root.position.set(0, affanY(0, 2), 2);
    beach.sub.position.set(0, -20, -30);
    const th = keys(t, [[2.9, 0], [3.3, 1]]);
    const tr = POSES.thinkR.armR;
    const rest = [-0.62, 0.32, 0.25];
    A.pose({
      yaw: 0.25, blink: blinkAt(t, 3), talk: talk(t), smile: 0.35, brow: 0.9,
      headRoll: -0.14 * th, headYaw: -0.25, lookX: -0.6 * th, lookY: 0.5 * th, headPitch: -0.1,
      armR: { reach: rest.map((r, i) => lerp(r, tr.reach[i], th)), pole: tr.pole, point: th, wx: tr.wx * th },
    });
    const peek = easeOut(inv(4.95, 5.4, t));
    crabAt(beach.crab, -2.3, 3.4, 0.35);
    beach.crab.position.y -= (1 - peek) * 1.3;
    beach.crab.userData.pose({ t, blink: t < 5.3 ? 1 - inv(5.2, 5.3, t) : blinkAt(t, 5), look: [0.6, 0.1], wave: 0, claw: 0.2 });
    const k = easeInOut(inv(2.85, 5.85, t));
    lookCam(V(lerp(-1.3, -1.7, k), 3.2, lerp(10.8, 10.2, k)), V(-0.9, 2.7, -2), 50);
    sunAt(beach.sun, V(-1, 1.5, 2));
    // salt shaker over the sea
    const s = pop(t, 4.3, 5.8);
    if (s.o > 0) {
      ov.html('shaker', SVG.shaker(t), { x: 300, y: 560 + Math.sin(t * 4) * 8, o: s.o, s: s.s * 0.95, r: 150 });
      ov.html('shq', ICONS.qmark('#ff8a3d'), { x: 470, y: 430 + Math.sin(t * 3) * 8, o: s.o, s: s.s * 0.7, r: 14 });
      saltGrains(300, 700, 960, t, s.o * inv(4.5, 4.7, t));
    }
    const q = pop(t, 3.94, 5.8);
    const hd = scr(V(0, 3.4, 2));
    ov.html('q1', ICONS.qmark('#ffcf33'), { x: hd.x + 180, y: hd.y - 210 + Math.sin(t * 3) * 10, o: q.o, s: q.s * 0.85, r: 12 });
    const q2 = pop(t, 4.66, 5.8);
    ov.html('q2', ICONS.qmark('#2f9bff'), { x: hd.x + 330, y: hd.y - 70 + Math.sin(t * 3 + 1) * 10, o: q2.o, s: q2.s * 0.6, r: 18 });
    return beach;
  }],
  // C — the crab summons the magic mini submarine. "Jom ikut Affan cari jawapan!"
  [5.85, 7.75, (t) => {
    beachSea(t);
    const A = beach.aff;
    A.root.position.set(0.9, affanY(0.9, 2), 2);
    const rise = backOut(clamp(inv(5.9, 6.6, t)), 1.4);
    const sx = -3.8, sz = -12;
    beach.sub.position.set(sx, lerp(-8, waveH(sx, sz, t) - 0.9, rise), sz);
    beach.sub.rotation.set(0.04 * Math.sin(t * 2), 0.35 + 0.05 * Math.sin(t * 1.3), 0.05 * Math.sin(t * 1.7));
    beach.splash2.userData.update(t, 6.05, V(sx, 0, sz), 9, -0.2);
    const jump = t > 6.24 && t < 6.75 ? Math.sin(((t - 6.24) / 0.51) * Math.PI) * 0.5 : 0;
    const up = keys(t, [[6.1, 0], [6.3, 1], [7.4, 1]]);
    A.pose({
      yaw: -0.25, blink: blinkAt(t, 4), talk: talk(t), smile: 1, brow: 0.6, wow: keys(t, [[5.9, 0], [6.05, 0.8], [6.25, 0]]),
      bob: jump, legL: { x: -0.3 * jump, knee: 0.7 * jump }, legR: { x: -0.3 * jump, knee: 0.7 * jump },
      headYaw: keys(t, [[5.85, -0.5], [6.2, -0.1]]), lookX: keys(t, [[5.85, -0.8], [6.2, 0]]),
      armR: { reach: [lerp(-0.62, -0.65, up), lerp(0.32, 1.95 + 0.06 * Math.sin(t * 14), up), lerp(0.25, 0.35, up)], pole: [-1, -0.3, -0.5] },
      armL: { reach: [0.55, 0.45, 0.4] },
    });
    crabAt(beach.crab, -2.0, 3.8, 0.5);
    beach.crab.userData.pose({ t, wave: 1, wave2: keys(t, [[5.85, 0], [6.1, 1]]), bounce: Math.abs(Math.sin(t * 8)) * 0.25, look: [-0.3, 0.3], claw: 0.4 });
    const k = easeInOut(inv(5.85, 7.75, t));
    lookCam(V(lerp(-0.4, 0.2, k), lerp(2.6, 2.9, k), lerp(10.5, 9.0, k)), V(-0.5, lerp(2.9, 3.0, k), -1), 50);
    sunAt(beach.sun, V(-1, 1.5, 0), V(0.45, 0.8, 0.55), 30);
    const sk = inv(6.7, 7.7, t);
    ov.swirl(t, W / 2, 900, sk);
    ov.flash(inv(7.35, 7.75, t) ** 2);
    const m = scr(V(sx, 4.6, sz));
    const q = pop(t, 6.2, 7.4);
    ov.tag('kapal', 'KAPAL SELAM AJAIB!', { x: clamp(m.x, 300, 780), y: clamp(m.y - 120, 320, 900), o: q.o, s: q.s }, { bg: '#ffb020', small: true });
    return beach;
  }],
  // D — magic flight to the mountain: rain clouds. "Bila hujan turun atas gunung..."
  [7.75, 10.15, (t) => {
    land.update(t);
    land.updateMinerals(t, { release: 0, alpha: 0 });
    land.rainMat.uniforms.uAlpha.value = clamp(inv(7.9, 8.6, t));
    const sp = V(21.5, 36.0, 33.5);
    const k = easeInOut(inv(7.75, 10.15, t));
    land.sub.position.set(sp.x - k * 0.8, sp.y + 0.2 * Math.sin(t * 2), sp.z - k * 1.2);
    land.sub.rotation.set(0.05 * Math.sin(t * 1.5), -0.9, 0.06 * Math.sin(t * 1.9));
    const ptD = keys(t, [[8.4, 0], [8.8, 1]]);
    subAffan(land.aff, t, { headYaw: -0.35, headPitch: -0.25, lookY: 0.6, lookX: -0.5, wow: keys(t, [[7.8, 0], [8.1, 0.7], [8.9, 0.7], [9.2, 0]]), brow: 0.8, armR: { reach: [lerp(-0.55, -0.9, ptD), lerp(0.62, 1.3, ptD), lerp(0.4, 0.45, ptD)], point: ptD, pole: [-1, -1, -0.5] } });
    lookCam(V(lerp(24.5, 23.5, k), lerp(38.5, 39.5, k), lerp(44, 41, k)), V(lerp(2, 0, k), lerp(40, 42, k), -112), 50);
    sunAt(land.sun, V(sp.x, sp.y - 10, sp.z), V(0.5, 0.75, 0.5), 80);
    ov.flash(1 - inv(7.75, 8.15, t));
    const cl = scr(V(-6, 76, -96));
    pinTag('hujan', 'HUJAN', cl, t, 8.54, 10.1, { bg: BLUE, pointer: 'down' }, -110);
    const mt = scr(V(0, 58, -122));
    pinTag('gunung', 'GUNUNG', mt, t, 9.62, 10.1, { bg: GREEN, pointer: 'down', small: true }, -60);
    return land;
  }],
  // E — rain on the rocks frees glowing minerals. "...dan batu-batu, air akan bawa mineral halus dari batu."
  [10.15, 14.4, (t) => {
    land.update(t);
    land.rainMat.uniforms.uAlpha.value = 1;
    const rel = inv(11.6, 14.4, t) * 0.035;
    land.updateMinerals(t, { release: rel, alpha: clamp(inv(11.55, 11.9, t)), scale: 1.7, cycle: 16 });
    const R0 = ROCKS_AT;
    land.sub.position.set(R0.x + 9.5, R0.y + 4.6 + 0.15 * Math.sin(t * 2), R0.z + 5.5);
    land.sub.rotation.set(0, 0.2, 0.05 * Math.sin(t * 1.6));
    const ptE = keys(t, [[12.2, 0], [12.5, 1]]);
    subAffan(land.aff, t, { headYaw: -0.45, headPitch: -0.3, lookY: -0.4, lookX: -0.8, smile: 1, wow: keys(t, [[12.3, 0], [12.6, 0.8], [13.6, 0.8], [13.9, 0]]), armR: { reach: [lerp(-0.55, -0.95, ptE), lerp(0.62, 1.05, ptE), lerp(0.4, 0.6, ptE)], point: ptE, pole: [-1, -1, -0.5] } });
    const k = easeInOut(inv(10.15, 14.4, t));
    lookCam(V(R0.x + lerp(19, 17, k), R0.y + lerp(9.5, 8.5, k), R0.z + lerp(21.5, 19.5, k)), V(R0.x + lerp(2.5, 3, k), R0.y + lerp(1.2, 0.8, k), R0.z + 3), 50);
    sunAt(land.sun, R0, V(0.5, 0.8, 0.4), 60);
    const rock = scr(land.rockTops[2].clone().add(V(0, 0.4, 0)));
    pinTag('batu', 'BATU', rock, t, 10.22, 14.35, { bg: '#8a6a52', pointer: 'down' }, -110);
    const head = land.riverAt(0.004).p;
    const mn = scr(head.clone().add(V(0, 1.0, 0)));
    pinTag('mineral', 'MINERAL', mn, t, 12.32, 14.35, { bg: PURPLE, pointer: 'down' }, -120);
    ov.sparkles(t, { n: 14, seed: 21, x: mn.x - 220, y: mn.y - 160, w: 440, h: 280, a: inv(12.3, 12.8, t) * 0.8, size: 22 });
    return land;
  }],
  // F — riding the river with the minerals. "Mineral itu masuk ke dalam sungai..."
  [14.4, 17.7, (t) => {
    land.update(t);
    land.rainMat.uniforms.uAlpha.value = 1 - inv(15.5, 16.5, t) * 0.6;
    land.updateMinerals(t, { release: lerp(0.04, 0.42, inv(14.4, 17.7, t)), spill: 0.04, scale: 1.0, cycle: 16 });
    const s = lerp(0.035, 0.27, easeInOut(inv(14.4, 17.7, t)) * 0.4 + inv(14.4, 17.7, t) * 0.6);
    const r = land.riverAt(s);
    const sub = land.sub;
    sub.position.copy(r.p).add(V(0, -0.32 + 0.06 * Math.sin(t * 5), 0));
    sub.rotation.set(0.03 * Math.sin(t * 4), Math.atan2(r.t.x, r.t.z), 0.05 * Math.sin(t * 3));
    subAffan(land.aff, t, { smile: 1, headPitch: 0.05, armR: { reach: [-0.75, 1.75 + 0.05 * Math.sin(t * 12), 0.35], pole: [-1, -0.3, -0.5] }, armL: { reach: [0.8, 1.0, 0.6], point: 1, pole: [1, -1, -0.5] }, headYaw: 0.15 * Math.sin(t * 1.5) });
    const ahead = land.riverAt(s + 0.045);
    const c = ahead.p.clone().add(V(-ahead.t.z * 2.5, 3.6, ahead.t.x * 2.5));
    lookCam(c, sub.position.clone().add(V(0, 0.8, 0)).addScaledVector(r.t, -1.5), 54);
    sunAt(land.sun, sub.position, V(0.5, 0.8, 0.4), 60);
    // flow chevrons on the water ahead of the sub
    const fa = pop(t, 14.6, 17.65);
    for (let i = 0; i < 4; i++) {
      const u = s + 0.006 + (((t * 0.6 + i / 4) % 1) * 0.035);
      const q = land.riverAt(u);
      const p = scr(q.p.clone().add(V(0, 0.15, 0)));
      const p2 = scr(land.riverAt(u + 0.004).p.clone().add(V(0, 0.15, 0)));
      if (!p.visible) continue;
      const ang = (Math.atan2(p2.y - p.y, p2.x - p.x) * 180) / Math.PI;
      ov.html('fch' + i, SVG.chev('#ffffff'), { x: p.x, y: p.y, o: fa.o * Math.sin((((t * 0.6 + i / 4) % 1)) * Math.PI) * 0.9, s: 0.75, r: ang });
    }
    const sg = scr(land.riverAt(s + 0.012).p.clone().add(V(0, 0.4, 0)));
    pinTag('sungai', 'SUNGAI', sg, t, 16.14, 17.65, { bg: TEAL, pointer: 'down' }, -110);
    return land;
  }],
  // G — map view: arrow from the mountain, down the river, to the sea. "...sampai ke laut!"
  [17.7, 20.4, (t) => {
    land.update(t);
    land.rainMat.uniforms.uAlpha.value = 0.55;
    land.updateMinerals(t, { release: lerp(0.45, 1, inv(17.7, 19.9, t)), scale: 2.6, minPx: 5, cycle: 16 });
    const r = land.riverAt(lerp(0.3, 0.34, inv(17.7, 20.4, t)));
    land.sub.position.copy(r.p).add(V(0, -0.32, 0));
    land.sub.rotation.set(0, Math.atan2(r.t.x, r.t.z), 0);
    subAffan(land.aff, t, {});
    const k = easeOut(inv(17.7, 20.4, t));
    lookCam(V(lerp(30, 36, k), lerp(168, 188, k), lerp(126, 136, k)), V(0, 0, lerp(-12, -6, k)), 50);
    sunAt(land.sun, V(0, 0, -20), V(0.5, 0.8, 0.4), 200);
    land.sun.shadow.camera.left = land.sun.shadow.camera.bottom = -140;
    land.sun.shadow.camera.right = land.sun.shadow.camera.top = 140;
    land.sun.shadow.camera.updateProjectionMatrix();
    ov.flash((1 - inv(17.7, 17.95, t)) * 0.8);
    const pts = [];
    for (let i = 0; i <= 50; i++) pts.push(scr(land.riverAt((i / 50) * 0.99).p.clone().add(V(0, 1.5, 0))));
    pathArrow(pts, easeInOut(inv(17.85, 19.85, t)), t, { color: '#5fe0ff', w: 18 });
    const mtn = scr(V(0, 60, -122));
    pinTag('gG', 'GUNUNG', mtn, t, 17.8, 20.35, { bg: GREEN, pointer: 'down', small: true }, -60);
    const cl = scr(V(-6, 82, -96));
    const hj = pop(t, 17.8, 20.35);
    ov.tag('gH', 'HUJAN', { x: clamp(cl.x - 230, 190, 890), y: clamp(cl.y, 300, 1300), o: hj.o, s: hj.s }, { bg: BLUE, small: true });
    const sg = scr(land.riverAt(0.45).p);
    pinTag('gS', 'SUNGAI', sg, t, 18.6, 20.35, { bg: TEAL, small: true }, -10);
    const sea = scr(V(8, 0, 118));
    pinTag('gL', 'LAUT', sea, t, 19.72, 20.35, { bg: BLUE }, -40);
    return land;
  }],
  // H — underwater: minerals dissolve and pile up as salt. "Lama-lama, makin banyak garam terkumpul dalam air laut."
  [20.4, 24.45, (t) => {
    under.update(t);
    const prog = lerp(0.04, 1, smooth(inv(20.4, 24.4, t)) * 0.7 + inv(20.4, 24.4, t) * 0.3);
    under.updateSalt(t, prog, { rate: 0.18 });
    under.sub.position.set(0.5, 4.2 + 0.15 * Math.sin(t * 1.6), 1);
    under.sub.rotation.set(0.04 * Math.sin(t), -0.55 + 0.05 * Math.sin(t * 0.7), 0.04 * Math.sin(t * 1.3));
    subAffan(under.aff, t, {
      wow: keys(t, [[21.4, 0], [21.7, 0.9], [22.3, 0.9], [22.6, 0]]), brow: 0.8, smile: 1,
      headYaw: keys(t, [[20.4, 0.5], [21.5, 0.35], [23, -0.2]]), lookX: keys(t, [[20.4, 0.7], [23, -0.4]]), lookY: 0.3,
      armL: { reach: [0.85, 1.15, 0.7], point: keys(t, [[22.2, 0], [22.5, 1]]), pole: [1, -1, -0.5] },
    });
    const k = easeInOut(inv(20.4, 24.45, t));
    lookCam(V(lerp(6.8, 5.6, k), lerp(5.6, 5.2, k), lerp(7.2, 8.4, k)), V(lerp(-1.5, -3.0, k), lerp(4.8, 5.4, k), -1), 54);
    bubbleWipe(inv(20.15, 20.75, t), 7);
    const c = pop(t, 20.5, 22.2);
    ov.html('clock', SVG.clock(t), { x: 840, y: 400, o: c.o, s: c.s * 0.9 });
    const g = scr(V(-6.5, 6.8, -4));
    pinTag('terlarut', 'GARAM TERLARUT', g, t, 22.34, 24.4, { bg: '#1f6fd6', pointer: 'down' }, -110);
    return under;
  }],
  // I — back at the surface, Affan wonders. "Tapi kenapa laut kekal masin?"
  [24.45, 27.0, (t) => {
    beachSea(t);
    const sx = -3, sz = -42;
    const pp = backOut(clamp(inv(24.45, 24.95, t)), 1.6);
    beach.sub.position.set(sx, lerp(-6, waveH(sx, sz, t) - 0.85, pp), sz);
    beach.sub.rotation.set(0.05 * Math.sin(t * 2), 0.7, 0.06 * Math.sin(t * 1.5));
    beach.splash2.userData.update(t, 24.55, V(sx, 0, sz), 8, -0.3);
    beach.crab.position.set(0, -10, 0);
    beach.aff.root.position.set(0, -20, 0);
    beachSubAffan.root.visible = true;
    const th = keys(t, [[24.8, 0], [25.2, 1]]);
    const tr = POSES.thinkR.armR;
    subAffan(beachSubAffan, t, { brow: 0.9, smile: 0.4, headRoll: -0.12 * th, headYaw: -0.35, lookX: 0.5, lookY: 0.6, headPitch: -0.15, armR: { reach: [-0.55 + 0.53 * th, 0.62 + 0.74 * th, 0.4 + 0.22 * th], pole: tr.pole, point: th, wx: tr.wx * th } });
    const k = easeInOut(inv(24.45, 27.0, t));
    lookCam(V(sx + lerp(7.4, 6.2, k), lerp(3.4, 3.7, k), sz + lerp(12.5, 10.8, k)), V(sx - 0.4, 3.5, sz - 1), 50);
    sunAt(beach.sun, V(sx, 0, sz), V(0.45, 0.8, 0.55), 30);
    bubbleWipe(1 - inv(24.3, 24.75, t), 9);
    const hd = scr(V(sx, 5.2, sz));
    [[24.86, -250, -170, '#ffcf33', -12], [25.6, 240, -230, '#3fa2ff', 10], [26.18, 330, 10, '#ffcf33', 14]].forEach(([a, dx, dy, c, r], i) => {
      const q = pop(t, a, 26.95);
      ov.html('iq' + i, ICONS.qmark(c), { x: hd.x + dx, y: hd.y + dy + Math.sin(t * 3 + i) * 10, o: q.o, s: q.s * 0.8, r });
    });
    return beach;
  }],
  // J — the evaporation diagram. "Sebab bila air laut tersejat jadi wap, air sahaja yang naik ke langit. Garam tak ikut naik!"
  [27.0, 33.85, (t) => {
    slice.update(t);
    slice.updateVapour(t, { on: clamp(inv(28.4, 29.1, t)) });
    slice.updateSalt(t, { glowK: clamp(inv(32.3, 32.7, t)), jumpAt: 32.5 });
    slice.cloud.scale.setScalar(lerp(0.75, 1.15, smooth(inv(28.5, 33.8, t))));
    slice.sub.position.set(-2.4, -5.1 + 0.1 * Math.sin(t * 1.4), 1.2);
    slice.sub.rotation.set(0, 0.55, 0.04 * Math.sin(t));
    const upA = keys(t, [[30.9, 0], [31.2, 1], [32.2, 1], [32.45, 0]]);
    const dnA = keys(t, [[32.4, 0], [32.7, 1], [33.85, 1]]);
    slice.aff.root.visible = true;
    subAffan(slice.aff, t, {
      smile: 1, brow: 0.5, headYaw: -0.2, lookY: lerp(0.2, 0.8, upA) - 0.6 * dnA, headPitch: -0.2 * upA + 0.2 * dnA,
      armR: upA > 0 ? { reach: [-0.6, lerp(0.62, 2.0, upA), 0.45], point: upA, pole: [-1, -0.3, -0.5] } : { reach: [-0.75, lerp(0.62, 0.95, dnA), lerp(0.4, 0.85, dnA)], point: dnA, pole: [-1, 0.6, -0.5], wx: 1.6 * dnA },
    });
    const k = easeInOut(inv(27.0, 29.0, t));
    lookCam(V(lerp(-1.2, 0, k), lerp(1.6, 1.0, k), lerp(14.5, 20.5, k)), V(lerp(0.6, 0, k), lerp(1.6, 0.6, k), 0), 50);
    ov.flash((1 - inv(27.0, 27.35, t)) * 0.9);
    const sun = scr(slice.sun.position);
    const surf = scr(V(1.0, 0.3, 1.5));
    heatWaves(sun.x - 30, sun.y + 130, surf.x - 30, surf.y - 30, t, inv(27.2, 27.8, t) * 0.85);
    const sp = pop(t, 27.08, 29.3);
    ov.tag('panas', 'PANAS!', { x: clamp(sun.x, 200, 880), y: sun.y - 170, o: sp.o, s: sp.s }, { bg: '#ff9b1f', small: true });
    const vp = scr(V(-0.4, 3.8, 0));
    pinTag('wap', 'WAP', vp, t, 29.38, 31.0, { bg: '#5ab4ff', pointer: 'down' }, -40);
    const naik = pop(t, 31.0, 33.8);
    arrowTag('airNaik', 'AIR NAIK', true, { x: clamp(vp.x - 40, 270, 810), y: vp.y - 20 + Math.sin(t * 4) * 8, o: naik.o, s: naik.s }, GREEN);
    const gt = pop(t, 32.34, 33.8);
    const sb = scr(V(1.4, -3.3, 2.5));
    arrowTag('garamTinggal', 'GARAM TINGGAL', false, { x: clamp(sb.x, 330, 750), y: clamp(sb.y, 600, 1230), o: gt.o, s: gt.s }, ORANGE);
    // little "no!" crosses where the jumping salt bumps the surface
    for (let i = 0; i < 3; i++) {
      const x = pop(t, 33.0 + i * 0.15, 33.8, { from: 2 });
      if (x.o <= 0) continue;
      const jp = scr(slice.jumperPos(i).add(V(0, 0.6, 0)));
      ov.html('jx' + i, ICONS.cross(), { x: jp.x, y: jp.y - 30, o: x.o, s: x.s * 0.32 });
    }
    return slice;
  }],
  // K — recap: salt stays, so the sea stays salty. "Sebab tu garam tinggal dalam laut, dan laut pun jadi masin!"
  [33.85, 38.2, (t) => {
    slice.update(t);
    slice.updateVapour(t, { on: 1 - inv(37.6, 38.2, t) * 0.3 });
    slice.updateSalt(t, { glowK: 0.5 + 0.5 * clamp(inv(37.2, 37.5, t)), scale: 1 + 0.25 * clamp(inv(37.2, 37.5, t)) });
    slice.cloud.scale.setScalar(1.15);
    slice.sub.position.set(-2.4, -5.1 + 0.1 * Math.sin(t * 1.4), 1.2);
    slice.sub.rotation.set(0, 0.55, 0.04 * Math.sin(t));
    const th = keys(t, [[37.2, 0], [37.5, 1]]);
    const up = POSES.thumbsUpR.armR;
    subAffan(slice.aff, t, { smile: 1, brow: 0.6, headYaw: 0.1, lookY: 0.1, armR: th > 0 ? { reach: [lerp(-0.55, up.reach[0], th), lerp(0.62, up.reach[1] + 0.25, th), lerp(0.4, up.reach[2], th)], pole: up.pole, thumb: th, wy: up.wy * th, wx: up.wx * th } : {} });
    const k = easeInOut(inv(33.85, 37.0, t));
    lookCam(V(lerp(0, -1.1, k), lerp(1.0, -1.4, k), lerp(20.5, 15.5, k)), V(lerp(0, -0.7, k), lerp(0.6, -1.8, k), 0), 50);
    const badges = [['batu', 'BATU', 33.95], ['sungai', 'SUNGAI', 34.3], ['laut', 'LAUT', 34.65]];
    badges.forEach(([kind, label, a], i) => {
      const q = pop(t, a, 38.15);
      const x = 230 + i * 310;
      ov.html('bd' + i, `<div style="text-align:center">${SVG.badge(kind)}<div class="tag sm" style="background:${[ '#8a6a52', TEAL, BLUE][i]};display:inline-block;margin-top:-10px">${label}</div></div>`, { x, y: 380, o: q.o, s: q.s * 0.9 });
      if (i < 2) {
        const qa = pop(t, a + 0.2, 38.15);
        ov.html('ba' + i, `<div style="transform:scale(0.45)">${ICONS.arrow('#ffd84a')}</div>`, { x: x + 155, y: 350, o: qa.o, s: qa.s });
      }
    });
    const gt = pop(t, 34.5, 36.9);
    const sb = scr(V(1.2, -3.0, 2.5));
    arrowTag('kGaram', 'GARAM TINGGAL', false, { x: clamp(sb.x, 330, 750), y: clamp(sb.y, 600, 1230), o: gt.o, s: gt.s }, ORANGE);
    const m = pop(t, 37.26, 38.15, { fin: 0.4, from: 2.0 });
    ov.bubble('masin2', 'LAUT MASIN!', { x: W / 2, y: 760, o: m.o, s: m.s, r: -3 }, { size: 150, top: '#ffe45c', bot: '#ff9f1c' });
    ov.sparkles(t, { n: 34, seed: 44, y: 600, h: 800, a: inv(37.25, 37.6, t), size: 26 });
    return slice;
  }],
  // L — back on the beach: thumbs up, then the next mystery. "Haa, sekarang korang dah tahu! Apa lagi misteri Affan nak siasat lepas ni?"
  [38.2, 42.75, (t) => {
    beachSea(t);
    beachSubAffan.root.visible = false;
    const A = beach.aff;
    A.root.position.set(0.5, affanY(0.5, 2.2), 2.2);
    beach.sub.position.set(-4.5, waveH(-4.5, -9, t) - 1.0, -9);
    beach.sub.rotation.set(0.04 * Math.sin(t * 1.5), 0.5, 0.05 * Math.sin(t * 1.2));
    const hop = t > 38.3 && t < 38.75 ? Math.sin(((t - 38.3) / 0.45) * Math.PI) * 0.35 : 0;
    const th = keys(t, [[38.85, 0], [39.15, 1], [40.2, 1], [40.45, 0]]);
    const tk = keys(t, [[40.45, 0], [40.8, 1], [42.75, 1]]);
    const up = POSES.thumbsUpR.armR, th2 = POSES.thinkR.armR;
    const rest = [-0.62, 0.32, 0.25];
    let armR = {};
    if (th > 0) armR = { reach: rest.map((r, i) => lerp(r, up.reach[i], th)), pole: up.pole, thumb: th, wy: up.wy * th, wx: up.wx * th };
    else if (tk > 0) armR = { reach: rest.map((r, i) => lerp(r, th2.reach[i], tk)), pole: th2.pole, point: tk, wx: th2.wx * tk };
    A.pose({
      yaw: -0.12, blink: blinkAt(t, 7), talk: talk(t), smile: 1, brow: 0.5 + 0.4 * tk, bob: hop,
      legL: { x: -0.2 * hop, knee: 0.5 * hop }, legR: { x: -0.2 * hop, knee: 0.5 * hop },
      headRoll: -0.12 * tk + 0.04 * wobble(t, 1), lookX: 0.35 * tk, lookY: 0.4 * tk, headPitch: -0.06 * tk, headYaw: 0.05 * wobble(t, 2),
      armR, armL: { reach: [0.55, 0.42, 0.45] },
    });
    crabAt(beach.crab, -2.1, 3.3, 0.45);
    beach.crab.userData.pose({ t, wave: th > 0 ? 1 : 0.3, wave2: th > 0 ? 1 : 0, bounce: th > 0 ? Math.abs(Math.sin(t * 7)) * 0.2 : 0, look: tk > 0 ? [0.7, 0.3] : [0.2, 0.2], blink: blinkAt(t, 3) });
    const k = easeInOut(inv(38.2, 42.75, t));
    lookCam(V(lerp(0.4, 0.7, k), lerp(3.2, 3.1, k), lerp(10.2, 8.4, k)), V(-0.15, lerp(2.5, 2.7, k), 1.5), 50);
    sunAt(beach.sun, V(-0.5, 1.5, 2));
    ov.flash((1 - inv(38.2, 38.5, t)) * 0.95);
    if (th > 0.5) {
      const hand = scr(A.parts.arms.R.hand.getWorldPosition(V(0, 0, 0)));
      ov.sparkles(t, { n: 12, seed: 33, x: hand.x - 160, y: hand.y - 200, w: 320, h: 300, a: inv(39.0, 39.4, t) * (1 - inv(40.1, 40.4, t)), size: 30 });
    }
    const tahu = pop(t, 39.68, 40.4);
    ov.bubble('tahu', 'DAH TAHU!', { x: W / 2, y: 420, o: tahu.o, s: tahu.s, r: -3 }, { size: 130 });
    const head = scr(V(0.5, 3.1, 2.2));
    [[40.62, -270, -240, '#ffcf33', -12], [40.96, 250, -300, '#3fa2ff', 10], [41.44, 320, -80, '#ffcf33', 14]].forEach(([a, dx, dy, c, r], i) => {
      const q = pop(t, a, 42.7);
      ov.html('lq' + i, ICONS.qmark(c), { x: head.x + dx, y: head.y + dy + Math.sin(t * 3 + i) * 10, o: q.o, s: q.s * 0.85, r });
    });
    return beach;
  }],
  // M — outro: The Curious Affan logo
  [42.75, DURATION, (t) => {
    const k = easeOut(inv(42.75, 43.5, t));
    outro.aff.root.position.set(0, 0, 0);
    const th2 = POSES.thinkR.armR;
    outro.aff.pose({ ...POSES.thinkR, armR: { ...th2 }, smile: 1, blink: blinkAt(t, 9), headRoll: -0.08, lookX: 0.25, lookY: 0.15, headYaw: 0.08 });
    outro.crab.scale.setScalar(0.24);
    outro.crab.position.set(0.05, 3.55, 0.1);
    outro.crab.rotation.set(0, 0.15, -0.08);
    outro.crab.userData.pose({ t, wave: 1, wave2: 0.3, look: [0.4, 0.2], blink: blinkAt(t, 4), bounce: 0.05 * Math.abs(Math.sin(t * 5)) });
    lookCam(V(0, 2.6, lerp(7.5, 5.4, k)), V(0, 2.3, 0), 40);
    const hc = scr(V(0, 2.95, 0));
    ov.flash((1 - inv(42.75, 43.1, t)) * 1.0);
    const g = ov.g;
    const ra = inv(42.85, 43.45, t);
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
    const ic = pop(t, 43.35, 99);
    ov.html('oBulb', ICONS.bulb(), { x: 175, y: 470 + Math.sin(t * 2) * 8, o: ic.o, s: ic.s * 0.55, r: -10 });
    ov.html('oQ1', ICONS.qmark('#ffcf33'), { x: 880, y: 420 + Math.sin(t * 2 + 1) * 8, o: ic.o, s: ic.s * 0.9, r: 12 });
    ov.html('oQ2', ICONS.qmark('#2f6fff'), { x: 900, y: 760 + Math.sin(t * 2 + 2) * 8, o: ic.o, s: ic.s * 0.6, r: 12 });
    const l1 = pop(t, 43.05, 99), l2 = pop(t, 43.25, 99), l3 = pop(t, 43.45, 99);
    ov.html('lThe', bubbleSVG('The', { size: 120, top: '#ffffff', bot: '#e8eefc' }), { x: W / 2 + 10, y: 1110, o: l1.o, s: l1.s });
    ov.html('lCur', bubbleSVG('Curious', { size: 200, top: '#9fe8ff', bot: '#1d9bf0' }), { x: W / 2 + 40, y: 1270, o: l2.o, s: l2.s });
    ov.html('lMag', `<svg width="190" height="190" viewBox="0 0 190 190"><line x1="60" y1="130" x2="20" y2="172" stroke="#17256b" stroke-width="40" stroke-linecap="round"/><line x1="60" y1="130" x2="20" y2="172" stroke="#ffc928" stroke-width="22" stroke-linecap="round"/><circle cx="110" cy="80" r="62" fill="#8fdcff" stroke="#17256b" stroke-width="34"/><circle cx="110" cy="80" r="62" fill="none" stroke="#ffc928" stroke-width="16"/><ellipse cx="92" cy="62" rx="16" ry="22" fill="#fff" opacity="0.85"/></svg>`, { x: 165, y: 1300, o: l2.o, s: l2.s * 0.9, r: -8 });
    ov.html('lAff', bubbleSVG('Affan', { size: 220, top: '#ffe45c', bot: '#ff9f1c' }), { x: W / 2, y: 1450, o: l3.o, s: l3.s });
    const st = pop(t, 43.65, 99);
    ov.star(612, 1150, 34 * st.s, st.o, '#ffd84a', 0.3);
    const ep = pop(t, 43.9, 99);
    ov.tag('oEp', 'EPISOD 6 · KENAPA AIR LAUT MASIN?', { x: W / 2, y: 290, o: ep.o, s: ep.s }, { bg: ORANGE, small: true });
    return outro;
  }],
];

// A second Affan rig seated in the beach submarine (shot I)
const beachSubAffan = makeAffan();
seatAffan(beach.sub, beachSubAffan);
beachSubAffan.root.visible = false;

function frame(t) {
  ov.begin();
  cam.aspect = W / H;
  cam.updateProjectionMatrix();
  const shot = SHOTS.find(([a, b]) => t >= a && t < b) || SHOTS[SHOTS.length - 1];
  if (shot !== SHOTS[8]) beachSubAffan.root.visible = false;
  const world = shot[2](t);
  if (world.sky) world.sky.position.copy(cam.position);
  renderer.render(world.scene, cam);
  if (world !== outro) ov.vignette(0.22);
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
    frame(0);
    return true;
  })(),
};
