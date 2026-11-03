// THE CURIOUS AFFAN — Episode 015: "Berapa Kali Kertas Boleh Dilipat Dua?"
// Every shot is a pure function of time t (seconds), synced to audio/narration.mp3.
//
// Science: each fold doubles the layers (1, 2, 4, 8 ... 128) while the page
// gets half as big, so after about 7 folds an ordinary page is a small, thick,
// stiff block. With a very long strip, the record is 13 folds. A 0.1 mm sheet
// folded 42 times would be ~440,000 km thick: past the Moon (~384,400 km).
import * as THREE from 'three';
import { makeRenderer, loadEnvelope, toScreen, clamp, lerp, inv, easeOut, easeInOut, keys, wobble, W, H } from '../../shared/core.js';
import { POSES, blinkAt } from '../../shared/affan.js';
import { Overlay, pop, ICONS, drawLogo } from '../../shared/overlay.js';
import { CAPTIONS, KEYWORDS } from './captions.js';
import { buildRoom, buildField, buildSpace, buildOutro, paperState, DESK_Y, PAPER_POS, MOON_Y, EARTH_R } from './worlds.js';

const FPS = 30;
const DURATION = 63.7;

const stage = document.getElementById('stage');
const canvas = document.createElement('canvas');
stage.appendChild(canvas);
const renderer = makeRenderer(canvas);
const ov = new Overlay(stage);
const room = buildRoom();
const field = buildField();
const space = buildSpace();
const outro = buildOutro();
const cam = new THREE.PerspectiveCamera(50, W / H, 0.01, 6000);
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
const BLUE = '#2f7bff', GREEN = '#2fb35a', ORANGE = '#ff8a3d', PURPLE = '#8a5cff';

// ------------------------------------------------------------------ folds
// [start, end] of each successful fold, timed to the narration.
const FOLDS = [[8.3, 9.25], [10.9, 11.75], [13.22, 14.1], [21.0, 21.62], [22.48, 23.1], [24.03, 24.65], [26.2, 27.25]];
const FAIL = [31.2, 34.95]; // the 8th fold that will not go
function foldAt(t) {
  let n = 0;
  for (const [a, b] of FOLDS) {
    if (t >= b) n++;
    else if (t > a) return { n, k: easeInOut(inv(a, b, t)), a, b };
  }
  if (n === 7 && t > FAIL[0] && t < FAIL[1]) {
    const u = inv(FAIL[0], FAIL[1], t);
    const k = (0.05 + 0.07 * Math.abs(Math.sin(t * 7))) * Math.sin(Math.PI * clamp(u * 1.4)) + 0.012 * Math.sin(t * 61);
    return { n, k: Math.max(0.001, k), fail: true };
  }
  return { n, k: 0 };
}
// when fold i (1-based) completed, for pop timing
const foldDone = (i) => FOLDS[i - 1][1];

// --------------------------------------------------------------- Affan at the desk
const restW = { L: V(0.72, DESK_Y + 0.08, -0.38), R: V(-0.72, DESK_Y + 0.08, -0.38) };
const _w = new THREE.Vector3();
function deskAffan(t, p = {}, fold = null) {
  const aff = room.aff;
  const base = { blink: blinkAt(t, 2), talk: talk(t), smile: 0.8, lean: 0, ...p };
  aff.pose(base);
  // hands: rest on the desk, or follow the moving flap of the paper
  let L = restW.L.clone(), R = restW.R.clone();
  if (fold && fold.edge) {
    const s = paperState(fold.n);
    const g = fold.grab;
    if (s.axis === 'x') {
      L.lerp(fold.edge.clone().add(V(0.04, 0.05, -0.02)), g);
      R.lerp(V(PAPER_POS.x - s.a * 0.3 + room.paper.group.position.x, DESK_Y + s.h + 0.06, PAPER_POS.z - 0.05), g * 0.8);
    } else {
      const off = Math.min(0.45, s.a * 0.35);
      L.lerp(fold.edge.clone().add(V(off, 0.05, 0.03)), g);
      R.lerp(fold.edge.clone().add(V(-off, 0.05, 0.03)), g);
    }
  }
  if (p.handsOn) {
    const top = V(PAPER_POS.x, DESK_Y + paperState(7).h + 0.05, PAPER_POS.z);
    L.lerp(top.clone().add(V(0.12, 0, 0)), p.handsOn);
    R.lerp(top.clone().add(V(-0.12, 0, 0)), p.handsOn);
  }
  const armL = p.armL || { reach: aff.toTorso(L), pole: [1, -0.6, -0.8] };
  const armR = p.armR || { reach: aff.toTorso(R), pole: [-1, -0.6, -0.8] };
  aff.pose({ ...base, armL, armR });
}
function paperFold(t) {
  const f = foldAt(t);
  const edge = room.paper.set(f.n, f.k);
  let grab = 0;
  if (f.a !== undefined) grab = keys(t, [[f.a - 0.3, 0], [f.a, 1], [lerp(f.a, f.b, 0.62), 1], [f.b + 0.12, 0]]);
  else if (f.fail) grab = 1;
  return { ...f, edge, grab };
}
// next fold's flap edge position at k = 0 (so the hands reach before the fold starts)
function preEdge(t) {
  for (const [a] of FOLDS) {
    if (t > a - 0.32 && t <= a) {
      const f = foldAt(t);
      room.paper.set(f.n, 0.0001);
      const e = room.paper.set(f.n, 0.0001);
      room.paper.set(f.n, 0);
      return { n: f.n, edge: e, grab: keys(t, [[a - 0.3, 0], [a, 1]]) };
    }
  }
  return null;
}
function foldPose(t) {
  const pre = preEdge(t);
  const f = paperFold(t);
  return pre && !f.edge ? pre : f;
}

// --------------------------------------------------------------- overlay pieces
function hud(t, n, o = 1) {
  if (o <= 0) return;
  const tc = n > 0 ? foldDone(n) : -9;
  const bump = 1 + 0.28 * Math.exp(-((t - tc - 0.12) ** 2) / 0.012) * (t > tc ? 1 : 0);
  ov.tag('hudF', `LIPATAN: ${n}`, { x: 300, y: 300, o, s: bump * 0.95 }, { bg: BLUE, small: true });
  ov.tag('hudL', `${2 ** n} LAPIS`, { x: 790, y: 300, o, s: bump }, { bg: GREEN });
}

const BOOK_SVG = `<svg width="200" height="170" viewBox="0 0 200 170"><path d="M100 30 C70 10 30 10 10 20 V150 C30 140 70 140 100 160 Z" fill="#ffc23b" stroke="#17256b" stroke-width="10" stroke-linejoin="round"/><path d="M100 30 C130 10 170 10 190 20 V150 C170 140 130 140 100 160 Z" fill="#ffd96b" stroke="#17256b" stroke-width="10" stroke-linejoin="round"/><g stroke="#17256b" stroke-width="6" stroke-linecap="round" opacity="0.5"><line x1="30" y1="50" x2="80" y2="56"/><line x1="30" y1="75" x2="80" y2="81"/><line x1="120" y1="56" x2="170" y2="50"/><line x1="120" y1="81" x2="170" y2="75"/></g></svg>`;
const TROPHY_SVG = `<svg width="200" height="230" viewBox="0 0 200 230"><path d="M45 30 H155 V80 C155 125 130 145 100 145 C70 145 45 125 45 80 Z" fill="#ffd23b" stroke="#17256b" stroke-width="10" stroke-linejoin="round"/><path d="M45 45 H15 C15 85 30 100 52 100 M155 45 H185 C185 85 170 100 148 100" fill="none" stroke="#17256b" stroke-width="10" stroke-linecap="round"/><rect x="85" y="145" width="30" height="35" fill="#ffb21f" stroke="#17256b" stroke-width="10"/><rect x="55" y="178" width="90" height="30" rx="8" fill="#ff8a3d" stroke="#17256b" stroke-width="10"/><ellipse cx="78" cy="65" rx="10" ry="20" fill="#fff" opacity="0.7"/><text x="100" y="112" text-anchor="middle" font-family="Baloo 2" font-weight="800" font-size="58" fill="#17256b">13</text></svg>`;
const PAPER_SVG = `<svg width="170" height="200" viewBox="0 0 170 200"><path d="M15 15 H115 L155 55 V185 H15 Z" fill="#fffdf6" stroke="#17256b" stroke-width="10" stroke-linejoin="round"/><path d="M115 15 V55 H155" fill="#dfe8ff" stroke="#17256b" stroke-width="10" stroke-linejoin="round"/><g stroke="#7fb0ea" stroke-width="7" stroke-linecap="round"><line x1="35" y1="85" x2="135" y2="85"/><line x1="35" y1="115" x2="135" y2="115"/><line x1="35" y1="145" x2="110" y2="145"/></g></svg>`;
const COMMENT_SVG = `<svg width="170" height="150" viewBox="0 0 170 150"><path d="M20 15 H150 Q160 15 160 25 V95 Q160 105 150 105 H75 L40 138 V105 H20 Q10 105 10 95 V25 Q10 15 20 15 Z" fill="#ffffff" stroke="#17256b" stroke-width="10" stroke-linejoin="round"/><circle cx="52" cy="60" r="10" fill="#2f7bff"/><circle cx="85" cy="60" r="10" fill="#2f7bff"/><circle cx="118" cy="60" r="10" fill="#2f7bff"/></svg>`;
const DOWN_ARROW = `<svg width="120" height="150" viewBox="0 0 120 150"><path d="M40 10 H80 V80 H110 L60 140 L10 80 H40 Z" fill="#ffd84a" stroke="#17256b" stroke-width="10" stroke-linejoin="round"/></svg>`;
const UP_ARROW = (c) => `<svg width="110" height="150" viewBox="0 0 110 150"><path d="M38 140 H72 V70 H100 L55 10 L10 70 H38 Z" fill="${c}" stroke="#fff" stroke-width="10" stroke-linejoin="round"/></svg>`;

// Rounded panel on the fx canvas.
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
function label(text, x, y, { size = 44, color = '#fff', a = 1, align = 'center', font = 'Baloo 2' } = {}) {
  const g = ov.g;
  g.save();
  g.globalAlpha = clamp(a);
  g.font = `800 ${size}px "${font}"`;
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
// Paper layers drawn as a little stack of sheets (side view).
function sheetStack(cx, by, n, w, a, lh = 14, col = '#fffdf6') {
  const g = ov.g;
  g.save();
  g.globalAlpha = clamp(a);
  for (let i = 0; i < n; i++) {
    const y = by - (i + 1) * lh;
    g.fillStyle = col;
    g.strokeStyle = '#17256b';
    g.lineWidth = 4;
    g.beginPath();
    g.roundRect(cx - w / 2, y, w, lh - 2, 4);
    g.fill();
    g.stroke();
  }
  g.restore();
}

// "kertas jadi dua kali ganda tebal, tapi makin kecil" explainer panels
function explainer(t) {
  const o = clamp(inv(15.9, 16.3, t)) * (1 - inv(20.85, 21.05, t));
  if (o <= 0) return;
  panel(70, 380, 940, 560, 0.8 * o);
  // thicker: 1, 2, 4, 8 sheets
  const xs = [190, 400, 620, 860];
  [1, 2, 4, 8].forEach((n, i) => {
    const q = pop(t, 16.2 + i * 0.45, 21.0);
    if (q.o <= 0) return;
    sheetStack(xs[i], 690, n, 140 * q.s, q.o * o, 24);
    label(`${n}`, xs[i], 730, { size: 46, color: '#8fe39a', a: q.o * o });
    if (i > 0) label('×2', (xs[i] + xs[i - 1]) / 2, 570, { size: 44, color: '#ffd84a', a: q.o * o });
  });
  const tb = pop(t, 19.12, 21.0);
  if (tb.o > 0) {
    ov.tag('exTebal', 'TEBAL ×2', { x: 300, y: 455, o: tb.o * o, s: tb.s }, { bg: ORANGE, small: true });
    ov.html('exUp', UP_ARROW(ORANGE), { x: 120, y: 530, o: tb.o * o, s: tb.s * 0.55 });
  }
  // smaller: nested pages
  const kc = pop(t, 20.32, 21.0);
  if (kc.o > 0) {
    const g = ov.g;
    g.save();
    g.globalAlpha = kc.o * o;
    const cx = 760, cy = 850;
    let w = 300, h = 120;
    for (let i = 0; i < 4; i++) {
      g.setLineDash(i ? [14, 10] : []);
      g.strokeStyle = i ? '#8fd8ff' : '#ffffff';
      g.lineWidth = 6;
      g.strokeRect(cx - w / 2, cy - h / 2, w * kc.s, h);
      if (i % 2) h /= 2;
      else w /= 2;
    }
    g.restore();
    ov.tag('exKecil', 'KECIL ÷2', { x: 760, y: 770, o: kc.o * o, s: kc.s }, { bg: '#1f9bd6', small: true });
  }
}

// bar chart: layers after each fold, 1 .. 128
function chart(t) {
  const o = clamp(inv(35.2, 35.55, t)) * (1 - inv(39.75, 40.0, t));
  if (o <= 0) return;
  panel(70, 280, 940, 640, 0.82 * o);
  label('BILANGAN LAPIS', W / 2, 345, { size: 54, color: '#ffd84a', a: o });
  const g = ov.g;
  const x0 = 150, bw = 86, gap = 30, base = 820, maxH = 360;
  for (let i = 0; i <= 7; i++) {
    const k = easeOut(inv(35.45 + i * 0.22, 35.85 + i * 0.22, t));
    if (k <= 0) continue;
    const v = 2 ** i;
    const h = Math.max(6, (v / 128) * maxH) * k;
    const x = x0 + i * (bw + gap);
    g.save();
    g.globalAlpha = o;
    const gr = g.createLinearGradient(0, base - h, 0, base);
    gr.addColorStop(0, i === 7 ? '#ffd84a' : '#8fe39a');
    gr.addColorStop(1, i === 7 ? '#ff9f1c' : '#2fb35a');
    g.fillStyle = gr;
    g.strokeStyle = '#ffffff';
    g.lineWidth = 5;
    g.beginPath();
    g.roundRect(x, base - h, bw, h, 10);
    g.fill();
    g.stroke();
    g.restore();
    label(`${v}`, x + bw / 2, base - h - 34, { size: i > 5 ? 46 : 40, a: o * k });
    label(`${i}`, x + bw / 2, base + 42, { size: 40, color: '#8fd8ff', a: o * k });
  }
  label('LIPATAN', W / 2, base + 92, { size: 34, color: '#8fd8ff', a: o });
}

// thickness of a 0.1 mm sheet after n folds, in friendly units
function fmtThick(n) {
  const mm = 0.1 * 2 ** n;
  const grp = (v) => Math.round(v).toLocaleString('en-US');
  if (mm < 10) return `${mm.toFixed(1)} mm`;
  if (mm < 1000) return `${grp(mm / 10)} cm`;
  if (mm < 1e6) return `${grp(mm / 1000)} m`;
  return `${grp(mm / 1e6)} km`;
}

// ================================================================== SHOTS
const SHOTS = [
  // R1 — hook: Affan at his desk with a sheet of paper, wondering
  [0, 6.22, (t) => {
    room.note.visible = false;
    room.paper.set(0, 0);
    const think = keys(t, [[3.6, 0], [4.0, 1], [6.22, 1]]);
    const th = POSES.thinkR.armR;
    deskAffan(t, {
      headYaw: keys(t, [[0, 0.1], [2.0, 0.05], [3.6, -0.12]]), headPitch: keys(t, [[0, 0.25], [2.4, 0.18], [3.4, -0.05]]),
      lookY: keys(t, [[0, -0.6], [2.6, -0.4], [3.4, 0.1]]), lookX: keys(t, [[3.4, 0], [4.2, 0.35]]),
      brow: 0.5 + 0.4 * think, smile: 0.7, headRoll: -0.1 * think,
      armR: think > 0.01 ? { reach: [lerp(-0.6, th.reach[0], think), lerp(0.4, th.reach[1], think), lerp(0.5, th.reach[2], think)], pole: th.pole, point: think, wx: th.wx * think } : undefined,
    });
    const k = easeInOut(inv(0, 6.22, t));
    lookCam(V(lerp(0.6, 0.25, k), lerp(3.25, 3.05, k), lerp(4.6, 3.9, k)), V(0, lerp(2.05, 2.25, k), -0.2), 46);
    const p = pop(t, 0.12, 6.1, { fin: 0.45 });
    ov.bubble('hook', 'BERAPA KALI KERTAS\nBOLEH DILIPAT?', { x: W / 2, y: 470 + Math.sin(t * 3) * 6, o: p.o, s: p.s }, { size: 92 });
    const q = pop(t, 0.5, 6.1);
    ov.tag('ep', 'EPISOD 15', { x: W / 2, y: 300, o: q.o, s: q.s }, { bg: BLUE, small: true });
    const a = pop(t, 3.92, 6.1), b = pop(t, 5.04, 6.1);
    ov.bubble('q10', '10?', { x: 230, y: 830 + Math.sin(t * 4) * 8, o: a.o, s: a.s, r: -8 }, { size: 120, top: '#bfe8ff', bot: '#3fa2ff' });
    ov.bubble('q100', '100?', { x: 850, y: 800 + Math.sin(t * 4 + 1) * 8, o: b.o, s: b.s, r: 7 }, { size: 120, top: '#ffd0e6', bot: '#ff5fa2' });
    return room;
  }],
  // R2 — "Jom ikut Affan cari jawapan!"
  [6.22, 8.2, (t) => {
    room.paper.set(0, 0);
    const up = keys(t, [[6.22, 0], [6.5, 1], [7.7, 1], [8.15, 0]], easeOut);
    deskAffan(t, {
      smile: 1, brow: 0.7, headYaw: -0.05, headPitch: -0.08, lookY: 0.1,
      armR: { reach: [lerp(-0.6, -0.62, up), lerp(0.35, 1.95 + 0.06 * Math.sin(t * 14), up), lerp(0.45, 0.35, up)], pole: [-1, -0.3, -0.5] },
    });
    const k = easeInOut(inv(6.22, 8.2, t));
    lookCam(V(lerp(-0.4, -0.2, k), lerp(3.1, 3.0, k), lerp(3.4, 2.9, k)), V(0, 2.6, -0.8), 46);
    ov.sparkles(t, { n: 22, seed: 4, y: 300, h: 900, a: inv(6.3, 6.7, t) });
    const q = pop(t, 6.24, 8.15);
    ov.bubble('jom', 'JOM CUBA!', { x: W / 2, y: 420, o: q.o, s: q.s, r: -3 }, { size: 130 });
    return room;
  }],
  // R3 — folds 1-3: 2, 4, 8 layers
  [8.2, 15.84, (t) => {
    const f = foldPose(t);
    const lean = 0.22;
    deskAffan(t, { lean, headPitch: 0.15, lookY: -0.55, smile: 0.9, brow: 0.4, headYaw: 0.05 * wobble(t, 1) }, f);
    const k = easeInOut(inv(8.2, 15.84, t));
    lookCam(V(lerp(1.25, 0.95, k), lerp(2.45, 2.3, k), lerp(3.1, 2.6, k)), V(0, lerp(1.95, 1.85, k), -0.35), 48);
    hud(t, f.n, pop(t, 8.3, 15.8).o);
    [[9.44, '2 LAPIS'], [11.84, '4 LAPIS'], [14.24, '8 LAPIS']].forEach(([a, s], i) => {
      const q = pop(t, a, a + 1.35);
      ov.bubble('lp' + i, s, { x: W / 2, y: 520, o: q.o, s: q.s, r: [-4, 3, -2][i] }, { size: 120, top: '#c8ffd0', bot: '#2fb35a' });
    });
    return room;
  }],
  // R4 — explainer: twice as thick, but smaller
  [15.84, 21.0, (t) => {
    room.paper.set(3, 0);
    deskAffan(t, { lean: 0.15, headPitch: 0.05, lookY: -0.3, smile: 0.8, brow: 0.5, lookX: 0.1 });
    const k = easeInOut(inv(15.84, 21.0, t));
    lookCam(V(lerp(0.75, 0.6, k), lerp(1.75, 1.7, k), lerp(1.25, 1.05, k)), V(0, DESK_Y + 0.02, 0.05), 40);
    explainer(t);
        return room;
  }],
  // R5 — quick folds 4-6: 16, 32, 64
  [21.0, 26.1, (t) => {
    const f = foldPose(t);
    deskAffan(t, { lean: 0.24, headPitch: 0.2, lookY: -0.6, smile: 1, brow: 0.6, headYaw: 0.06 * Math.sin(t * 2) }, f);
    const k = easeInOut(inv(21.0, 26.1, t));
    lookCam(V(lerp(0.85, 0.6, k), lerp(2.2, 2.05, k), lerp(2.1, 1.7, k)), V(0, lerp(1.85, 1.75, k), -0.25), 44);
    hud(t, f.n);
    [[21.6, '16', '#ffd84a', '#ff9f1c'], [23.09, '32', '#ffd0e6', '#ff5fa2'], [24.64, '64', '#bfe8ff', '#3fa2ff']].forEach(([a, s2, c1, c2], i) => {
      const q = pop(t, a, a + 1.4, { from: 1.8 });
      ov.bubble('big' + i, s2, { x: [300, 780, 540][i], y: [700, 760, 640][i], o: q.o, s: q.s, r: [-6, 6, -3][i] }, { size: 230, top: c1, bot: c2 });
    });
    return room;
  }],
  // R6 — fold 7: 128 layers, as thick as a book
  [26.1, 31.2, (t) => {
    const f = foldPose(t);
    const bookIn = keys(t, [[29.3, 0], [29.75, 1]], easeOut);
    room.note.visible = bookIn > 0;
    room.note.scale.setScalar(Math.max(0.001, bookIn));
    deskAffan(t, { lean: lerp(0.3, 0.12, inv(27.3, 27.8, t)), headPitch: lerp(0.2, 0.05, inv(27.3, 27.8, t)), lookY: -0.45, smile: 1, brow: 0.8, wow: keys(t, [[27.3, 0], [27.5, 0.7], [28.4, 0.7], [28.7, 0]]) }, f);
    const k = easeInOut(inv(26.1, 31.2, t));
    lookCam(V(lerp(0.45, 0.3, k), DESK_Y + lerp(0.5, 0.7, k), PAPER_POS.z + lerp(0.95, 1.6, k)), V(lerp(0, 0.22, inv(29.0, 30.0, t)), DESK_Y + lerp(0.12, 0.22, k), PAPER_POS.z - 0.05), 42);
    hud(t, f.n);
    const q = pop(t, 27.36, 31.1, { from: 2 });
    ov.bubble('l128', '128 LAPIS!', { x: W / 2, y: 470, o: q.o, s: q.s, r: -3 }, { size: 140, top: '#fff3a0', bot: '#ffb21f' });
    const b = pop(t, 29.44, 31.1);
    if (b.o > 0) {
      const bp = scr(V(0.45, DESK_Y + 0.35, -0.05));
      ov.tag('bTag', 'MACAM BUKU!', { x: clamp(bp.x, 230, 850), y: bp.y - 150, o: b.o, s: b.s }, { bg: ORANGE, pointer: 'down' });
      ov.html('bIcon', BOOK_SVG, { x: 190, y: 760, o: b.o, s: b.s * 0.9, r: -8 });
    }
    ov.sparkles(t, { n: 16, seed: 21, x: 200, y: 600, w: 680, h: 500, a: inv(27.3, 27.7, t) * (1 - inv(29.0, 29.4, t)) });
    return room;
  }],
  // R7 — the 8th fold won't go: "Alamak, keras sangat!"
  [31.2, 35.2, (t) => {
    const f = paperFold(t);
    room.note.visible = false;
    const strain = keys(t, [[31.2, 0], [31.5, 1], [34.6, 1], [35.0, 0]]);
    const shake = Math.sin(t * 38) * 0.03 * strain;
    deskAffan(t, {
      lean: 0.28, headPitch: 0.05, headRoll: shake, tilt: shake * 0.5, lookY: -0.5,
      smile: 0.1, brow: -0.6 * strain + 0.8 * (1 - strain), talk: talk(t), wow: keys(t, [[33.3, 0], [33.45, 0.4], [34.0, 0]]),
      handsOn: strain,
    }, f);
    const k = easeInOut(inv(31.2, 35.2, t));
    lookCam(V(lerp(1.3, 1.1, k) + Math.sin(t * 40) * 0.006 * strain, lerp(2.35, 2.3, k), lerp(3.1, 2.8, k)), V(0, lerp(1.95, 2.0, k), -0.4), 46);
    hud(t, 7);
    const q = pop(t, 32.24, 35.1);
    ov.bubble('keras', 'KERAS SANGAT!', { x: W / 2 + Math.sin(t * 30) * 4 * q.o, y: 470, o: q.o, s: q.s, r: -4 }, { size: 120, top: '#ffd0c0', bot: '#ff5a3d' });
    const x = pop(t, 33.48, 35.1, { from: 2 });
    const bp = scr(V(0, DESK_Y + 0.12, PAPER_POS.z));
    ov.html('cross', ICONS.cross(), { x: clamp(bp.x + 200, 200, 880), y: clamp(bp.y - 140, 600, 1280), o: x.o, s: x.s * 0.55 });
    return room;
  }],
  // R8 — "ordinary paper: about 7 folds" with the layer chart
  [35.2, 40.0, (t) => {
    room.paper.set(7, 0);
    deskAffan(t, { lean: 0, headPitch: -0.05, lookY: 0.1, smile: 0.9, brow: 0.4, headYaw: 0.05 * wobble(t, 3) });
    const k = easeInOut(inv(35.2, 40.0, t));
    lookCam(V(lerp(-0.6, -0.3, k), lerp(2.7, 2.8, k), lerp(4.8, 4.4, k)), V(0, 3.15, -0.3), 46);
    chart(t);
    const q = pop(t, 38.88, 39.95, { from: 2 });
    ov.bubble('tujuh', 'LEBIH KURANG\n7 KALI', { x: W / 2, y: 1170, o: q.o, s: q.s, r: -2 }, { size: 110 });
    return room;
  }],
  // F1 — a very, very long strip: world record 13 folds
  [40.0, 46.06, (t) => {
    const aff = field.aff;
    const ax = -1.2;
    aff.root.position.set(ax, 0, 2.6);
    const look = keys(t, [[40.0, 0], [41.4, 1], [43.4, 1], [44.0, 0]]);
    const pt = keys(t, [[41.3, 0], [41.7, 1], [43.3, 1], [43.8, 0]]);
    aff.pose({ yaw: lerp(0.5, -2.6, look) });
    const far = aff.toTorso(V(0, 1.5, -60));
    const cheer = keys(t, [[44.5, 0], [44.8, 1], [46.06, 1]], easeOut);
    aff.pose({
      yaw: lerp(0.5, -2.6, look), blink: blinkAt(t, 5), talk: talk(t), smile: 1, brow: 0.6, headYaw: 0.15 * look, lookY: 0.1,
      wow: keys(t, [[41.6, 0], [41.9, 0.6], [42.8, 0.6], [43.1, 0]]),
      armL: pt > 0.01 ? { reach: [lerp(0.55, far[0], pt * 0.9), lerp(0.25, far[1], pt * 0.9), lerp(0.1, far[2], pt * 0.9)], point: pt, pole: [1, -0.5, -0.5] } : { reach: [lerp(0.55, 0.85, cheer), lerp(0.25, 1.9, cheer), lerp(0.15, 0.3, cheer)], pole: [1, -0.4, -0.5] },
      armR: { reach: [lerp(-0.55, -0.85, cheer), lerp(0.25, 1.9, cheer), lerp(0.15, 0.3, cheer)], pole: [-1, -0.4, -0.5] },
      legL: { x: 0, knee: 0 }, legR: { x: 0, knee: 0 },
    });
    const k = easeInOut(inv(40.0, 44.4, t));
    lookCam(V(lerp(1.4, 1.2, k), lerp(2.8, 9, k), lerp(8.6, 9.5, k)), V(lerp(-1.0, 0, k), lerp(2.1, 0.5, k), lerp(0, -60, k)), lerp(48, 55, k));
    field.sky.position.copy(cam.position);
    ov.flash(1 - inv(40.0, 40.35, t));
    const sp = pop(t, 41.6, 44.4);
    ov.tag('panjang', 'SANGAT PANJANG!', { x: W / 2, y: 520, o: sp.o, s: sp.s }, { bg: PURPLE });
    if (sp.o > 0) {
      for (let i = 0; i < 3; i++) {
        const ph = (t * 1.2 + i / 3) % 1;
        ov.html('far' + i, UP_ARROW('#8a5cff'), { x: W / 2, y: 760 - ph * 160, o: sp.o * Math.sin(ph * Math.PI), s: 0.5 * (1 - ph * 0.5) });
      }
    }
    const r = pop(t, 43.28, 46.0);
    ov.tag('rekod', 'REKOD DUNIA', { x: W / 2, y: 330, o: r.o, s: r.s }, { bg: ORANGE });
    const q = pop(t, 44.56, 46.0, { from: 2 });
    ov.bubble('tigabelas', '13 KALI!', { x: W / 2 + 60, y: 500, o: q.o, s: q.s, r: 3 }, { size: 170 });
    ov.html('trophy', TROPHY_SVG, { x: 210, y: 560 + Math.sin(t * 4) * 8, o: q.o, s: q.s * 0.85, r: -8 });
    ov.sparkles(t, { n: 20, seed: 44, y: 300, h: 600, a: q.o });
    return field;
  }],
  // SP — fold 42 times: a paper tower from Earth to the Moon
  [46.06, 52.62, (t) => {
    const n = t < 47.3 ? 8 : Math.min(42, 8 + Math.floor(((t - 47.3) / (50.0 - 47.3)) * 34.999));
    const nSmooth = t < 47.3 ? 8 : lerp(8, 42, clamp((t - 47.3) / (50.0 - 47.3)));
    const D = MOON_Y; // the Moon sits at the top of a 41.8-fold tower
    space.setTower(D * 2 ** (nSmooth - 41.8));
    const aff = space.aff;
    const lookUp = keys(t, [[47.6, 0], [48.6, 1]]);
    const wow = keys(t, [[50.3, 0], [50.6, 1], [52.4, 1]]);
    aff.pose({
      yaw: 0.15, blink: blinkAt(t, 8), talk: talk(t), smile: 1, brow: 0.6 + 0.4 * wow, wow: wow * 0.8,
      headPitch: -0.55 * lookUp, lookY: 0.8 * lookUp, headYaw: 0.25,
      armR: { reach: [-0.75, lerp(0.4, 1.7, lookUp), 0.55], point: lookUp, pole: [-1, -0.5, -0.4] },
      armL: { reach: [0.6, 0.3, 0.3] },
    });
    // camera: on little Earth, tilt up with the tower, then the wide Earth-Moon reveal
    const c1 = { p: [10, 3.2, 13], l: [1, 2.6, 0], f: 46 };
    const c2 = { p: [12, 6, 20], l: [0, 22, 0], f: 52 };
    const c3 = { p: [0, 200, 480], l: [0, 200, 0], f: 52 };
    let p, l, f;
    if (t < 50.15) {
      const k = easeInOut(inv(47.9, 50.1, t));
      p = c1.p.map((v, i) => lerp(v, c2.p[i], k));
      l = c1.l.map((v, i) => lerp(v, c2.l[i], k));
      f = lerp(c1.f, c2.f, k);
    } else {
      const k = easeInOut(inv(50.15, 51.6, t));
      p = c2.p.map((v, i) => lerp(v, c3.p[i], k));
      l = c2.l.map((v, i) => lerp(v, c3.l[i], k));
      f = lerp(c2.f, c3.f, k);
    }
    lookCam(V(...p), V(...l), f);
    space.sky.position.copy(cam.position);
    space.stars.position.copy(cam.position);
    space.stars2.position.copy(cam.position);
    ov.flash(1 - inv(46.06, 46.4, t), '235,240,255');
    const h = pop(t, 46.1, 52.55);
    const bump = 1 + 0.12 * Math.max(0, Math.sin(nSmooth * Math.PI * 2)) * (t > 47.3 && t < 50 ? 1 : 0);
    ov.tag('sF', `LIPATAN: ${n}`, { x: 300, y: 300, o: h.o, s: h.s * bump }, { bg: BLUE, small: true });
    ov.tag('sT', `TEBAL: ${fmtThick(n)}`, { x: 720, y: 300, o: h.o, s: h.s }, { bg: n >= 42 ? ORANGE : GREEN, small: true });
    const m = scr(space.moon.position);
    const ml = pop(t, 51.2, 52.55);
    if (m.visible) ov.tag('mTag', 'BULAN', { x: clamp(m.x, 200, 880), y: clamp(m.y - 140, 380, 1500), o: ml.o, s: ml.s }, { bg: '#1f6fd6', pointer: 'down' });
    const e = scr(V(0, -EARTH_R * 0.6, 0));
    if (e.visible) ov.tag('eTag', 'BUMI', { x: clamp(e.x + 260, 200, 880), y: clamp(e.y, 380, 1380), o: ml.o, s: ml.s }, { bg: GREEN, small: true });
    const q = pop(t, 51.95, 52.6, { from: 2 });
    ov.bubble('bulan', 'SAMPAI KE BULAN!', { x: W / 2, y: 1000, o: q.o, s: q.s, r: -3 }, { size: 118, top: '#d8f0ff', bot: '#3fa2ff' });
    if (t > 50.3) ov.sparkles(t, { n: 26, seed: 52, y: 280, h: 1100, a: inv(50.3, 50.8, t) });
    return space;
  }],
  // R9 — "Waaah, rupanya rahsianya gandaan dua!"
  [52.62, 56.11, (t) => {
    room.paper.set(7, 0);
    const jump = t > 52.66 && t < 53.2 ? Math.sin(((t - 52.66) / 0.54) * Math.PI) * 0.4 : 0;
    const up = keys(t, [[52.62, 0], [52.8, 1], [53.4, 1], [53.7, 0]]);
    deskAffan(t, {
      bob: jump, smile: 1, brow: keys(t, [[52.62, 1], [55, 0.5]]), wow: keys(t, [[52.62, 0], [52.75, 1], [53.4, 1], [53.6, 0]]),
      headPitch: -0.08, lookY: 0.1,
      armL: { reach: [lerp(0.55, 0.85, up), lerp(0.35, 1.85, up), lerp(0.45, 0.3, up)], pole: [1, -0.4, -0.5] },
      armR: { reach: [lerp(-0.55, -0.85, up), lerp(0.35, 1.85, up), lerp(0.45, 0.3, up)], pole: [-1, -0.4, -0.5] },
    });
    const k = easeOut(inv(52.62, 56.11, t));
    lookCam(V(lerp(0.25, 0.1, k), 2.85, lerp(4.6, 4.0, k)), V(0, 2.75, -1), 48);
    ov.flash((1 - inv(52.62, 52.9, t)) * 0.9, '20,40,120');
    const head = scr(V(0, 3.8 + jump, AFF_HEAD_Z));
    const b = pop(t, 53.6, 56.0);
    ov.html('bulb', ICONS.bulb(), { x: head.x + 270, y: head.y - 40 + Math.sin(t * 5) * 8, o: b.o, s: b.s * 0.7, r: 10 });
    const q = pop(t, 54.8, 56.05, { from: 2.2 });
    ov.bubble('ganda', 'GANDAAN DUA!', { x: W / 2, y: 1240, o: q.o, s: q.s }, { size: 150 });
    const seq = ['1', '2', '4', '8', '16', '32', '64', '128'];
    seq.forEach((s, i) => {
      const c = pop(t, 53.6 + i * 0.13, 56.05);
      const x = 110 + i * 123, y = 360 + (i % 2) * 70;
      ov.tag('sq' + i, s, { x, y, o: c.o, s: c.s * 0.95 }, { bg: i === 7 ? ORANGE : GREEN, small: true });
    });
    ov.sparkles(t, { n: 28, seed: 12, y: 250, h: 900, a: inv(52.7, 53.1, t) });
    return room;
  }],
  // R10 — "Cuba korang lipat kertas di rumah... Komen kat bawah!"
  [56.11, 60.9, (t) => {
    room.paper.set(0, 0);
    const ptV = keys(t, [[58.0, 0], [58.35, 1], [59.6, 1], [59.95, 0]]);
    const down = keys(t, [[59.75, 0], [60.1, 1]]);
    deskAffan(t, {
      smile: 1, brow: 0.6, headPitch: -0.05 + 0.15 * down, lookY: 0.1 - 0.5 * down, headRoll: -0.08 * ptV, headYaw: 0.04 * wobble(t, 6),
      armR: ptV > 0.01 ? { reach: [lerp(-0.6, -0.3, ptV), lerp(0.4, 1.05, ptV), lerp(0.5, 0.95, ptV)], point: ptV, pole: [-1, -0.6, -0.3] }
        : down > 0.01 ? { reach: [lerp(-0.6, -0.55, down), lerp(0.4, 0.2, down), lerp(0.5, 0.8, down)], point: down, pole: [-1, -0.6, -0.3], wx: 0.9 * down } : undefined,
    });
    const k = easeInOut(inv(56.11, 60.9, t));
    lookCam(V(lerp(0.5, 0.2, k), lerp(3.0, 2.9, k), lerp(4.0, 3.3, k)), V(0, 2.35, -0.6), 46);
    const a = pop(t, 56.2, 60.85);
    ov.html('pIcon', PAPER_SVG, { x: 180, y: 700 + Math.sin(t * 3) * 8, o: a.o, s: a.s * 0.85, r: -10 });
    ov.tag('cuba', 'CUBA DI RUMAH!', { x: W / 2, y: 340, o: a.o, s: a.s }, { bg: GREEN });
    const head = scr(V(0, 3.7, AFF_HEAD_Z));
    [[58.1, -280, -200, '#ffcf33', -12], [58.4, 280, -230, '#3fa2ff', 10]].forEach(([at, dx, dy, c, r], i) => {
      const q = pop(t, at, 60.85);
      ov.html('qq' + i, ICONS.qmark(c), { x: head.x + dx, y: head.y + dy + Math.sin(t * 3 + i) * 10, o: q.o, s: q.s * 0.85, r });
    });
    const c = pop(t, 59.73, 60.88);
    ov.html('cIcon', COMMENT_SVG, { x: 870, y: 1040, o: c.o, s: c.s * 0.9, r: 6 });
    ov.tag('komen', 'KOMEN DI BAWAH!', { x: W / 2, y: 1180, o: c.o, s: c.s }, { bg: ORANGE });
    if (c.o > 0) ov.html('dArr', DOWN_ARROW, { x: W / 2, y: 1300 + Math.abs(Math.sin(t * 6)) * 20, o: c.o, s: 0.6 * c.s });
    return room;
  }],
  // Outro — The Curious Affan logo
  [60.9, DURATION, (t) => {
    const k = easeOut(inv(60.9, 61.6, t));
    outro.aff.root.position.set(0, 0, 0);
    const th2 = POSES.thinkR.armR;
    outro.aff.pose({ ...POSES.thinkR, armR: { ...th2 }, smile: 1, blink: blinkAt(t, 9), headRoll: -0.08, lookX: 0.25, lookY: 0.15, headYaw: 0.08 });
    lookCam(V(0, 2.6, lerp(7.5, 5.4, k)), V(0, 2.3, 0), 40);
    const hc = scr(V(0, 2.95, 0));
    ov.flash((1 - inv(60.9, 61.25, t)) * 1.0);
    const g = ov.g;
    const ra = inv(61.0, 61.6, t);
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
    const ic = pop(t, 61.5, 99);
    ov.html('oPaper', PAPER_SVG, { x: 170, y: 470 + Math.sin(t * 2) * 8, o: ic.o, s: ic.s * 0.6, r: -10 });
    ov.html('oQ1', ICONS.qmark('#ffcf33'), { x: 880, y: 420 + Math.sin(t * 2 + 1) * 8, o: ic.o, s: ic.s * 0.9, r: 12 });
    ov.html('oQ2', ICONS.qmark('#2f6fff'), { x: 220, y: 760 + Math.sin(t * 2 + 2) * 8, o: ic.o, s: ic.s * 0.6, r: -12 });
    const l1 = pop(t, 61.2, 99), l2 = pop(t, 61.4, 99), l3 = pop(t, 61.6, 99);
    drawLogo(ov, { k: [l1, l2, l3], star: pop(t, 61.8, 99) });
    return outro;
  }],
];
const AFF_HEAD_Z = -1.15;

function frame(t) {
  ov.begin();
  cam.aspect = W / H;
  cam.updateProjectionMatrix();
  const shot = SHOTS.find(([a, b]) => t >= a && t < b) || SHOTS[SHOTS.length - 1];
  space.stars.userData.update(t);
  space.stars2.userData.update(t);
  room.note.visible = false;
  const world = shot[2](t);
  renderer.render(world.scene, cam);
  if (world !== outro) ov.vignette(world === space ? 0.4 : 0.22);
  ov.captions(t, CAPTIONS, KEYWORDS);
  ov.end();
}

// Cover / thumbnail (9:16): Affan amazed as the paper flap folds over, a big
// title, episode badge and the series logo. No captions. Key elements stay
// inside the centre 3:4 area (y 240-1680) that profile grids show.
const THUMB = { cam: [0.9, 2.7, 4.9], look: [0, 2.75, -0.3], fov: 50 };
window.setThumb = (o) => Object.assign(THUMB, o);
function thumbnail() {
  ov.begin();
  cam.aspect = W / H;
  cam.updateProjectionMatrix();
  const t = 9.0;
  room.note.visible = false;
  const edge = room.paper.set(0, 0.5);
  room.aff.pose({ lean: 0.12 });
  deskAffan(t, { lean: 0.12, blink: 0, talk: 0, wow: 0.9, brow: 1, headPitch: -0.12, headYaw: 0.15, lookY: -0.1, lookX: 0.2 }, { n: 0, k: 0.5, edge, grab: 1 });
  lookCam(V(THUMB.cam[0], THUMB.cam[1], THUMB.cam[2]), V(...THUMB.look), THUMB.fov);
  renderer.render(room.scene, cam);
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
  ov.vignette(0.25);
  ov.sparkles(1.3, { n: 16, seed: 17, x: 240, y: 820, w: 600, h: 420, size: 26 });
  ov.tag('thBadge', 'EPISOD 15', { x: W / 2, y: 300 }, { bg: BLUE, small: true });
  ov.bubble('thTitle', 'BERAPA KALI\nKERTAS BOLEH\nDILIPAT?', { x: W / 2, y: 520, r: -2 }, { size: 108 });
  ov.html('thQ', ICONS.qmark('#ffcf33'), { x: 120, y: 880, r: -14, s: 0.9 });
  ov.bubble('th7', '7?', { x: 930, y: 900, r: 10 }, { size: 130, top: '#c8ffd0', bot: '#2fb35a' });
  drawLogo(ov, { y: 1430, scale: 0.58 });
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
