// THE CURIOUS AFFAN — Episode 019: "Macam Mana Ular Boleh Bergerak Walaupun Tak Ada Kaki?"
// Every shot is a pure function of time t (seconds), synced to audio/narration.mp3.
import * as THREE from 'three';
import { makeRenderer, loadEnvelope, toScreen, clamp, lerp, inv, smooth, easeOut, easeInOut, keys, wobble, W, H } from '../../shared/core.js';
import { POSES, blinkAt } from '../../shared/affan.js';
import { Overlay, pop, ICONS, drawLogo } from '../../shared/overlay.js';
import { CAPTIONS, KEYWORDS } from './captions.js';
import { pathSpine, concertinaPath, coilPoints, sPath } from './snake.js';
import { buildGarden, buildLab, buildField, buildOutro, GARDEN_PATH, FIELD_PATH, CH, CH_Z, AFF_FIELD } from './worlds.js';

const FPS = 30;
const DURATION = 57.5;

const stage = document.getElementById('stage');
const canvas = document.createElement('canvas');
stage.appendChild(canvas);
const renderer = makeRenderer(canvas);
const ov = new Overlay(stage);
const garden = buildGarden();
const lab = buildLab();
const field = buildField();
const outro = buildOutro();
const cam = new THREE.PerspectiveCamera(50, W / H, 0.02, 3000);
let env = { at: () => 0 };

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const talk = (t) => clamp(env.at(t) * 1.2);
const scr = (p, c = cam) => toScreen(p, c);
const deg = (r) => (r * 180) / Math.PI;

function lookCam(c, pos, look, fov = 50, up = [0, 1, 0]) {
  c.position.copy(pos);
  c.up.set(...up);
  c.fov = fov;
  c.updateProjectionMatrix();
  c.lookAt(look);
  c.updateMatrixWorld(true);
}

// Tongue flicks every ~1.6 s; eyes blink now and then.
const flick = (t, seed = 0) => {
  const ph = (t + seed * 0.53) % 1.7;
  return ph < 0.45 ? Math.sin((ph / 0.45) * Math.PI) : 0;
};
const sBlink = (t, seed = 0) => blinkAt(t, seed + 5);

// Affan points his right hand at a world point.
const SH_R = [-0.5, 1.3, 0.05];
function reachTo(aff, target, len = 1.05) {
  const p = aff.toTorso(target);
  const d = p.map((v, i) => v - SH_R[i]);
  const n = Math.hypot(...d) || 1;
  return d.map((v, i) => SH_R[i] + (v / n) * len);
}
const mixArm = (a, b, k) => a.map((v, i) => lerp(v, b[i], k));
const REST_R = [-0.55, 0.25, 0.1];

// ------------------------------------------------------------------ garden
const AFF_G = V(1.7, 0, 2.8);
const gHeadX = (t) => keys(t, [[0, 2.0], [5.75, -1.6]], (k) => k); // snake slides to -x (screen right)
function gardenSnake(t, x, o = {}) {
  const s = garden.snake;
  const h = GARDEN_PATH.lenAtX(x);
  s.update(pathSpine(GARDEN_PATH, h, s.length, s.NR), { t, tongue: flick(t), blink: sBlink(t), ...o });
}

function hook(t) {
  const p = pop(t, 0.15, 5.7, { fin: 0.45 });
  const fl = Math.sin(t * 3) * 6;
  ov.bubble('hook', 'MACAM MANA ULAR\nBERGERAK?', { x: W / 2, y: 430 + fl, o: p.o, s: p.s }, { size: 98, top: '#c8ff8a', bot: '#3fcf5a' });
  const q = pop(t, 0.5, 5.7);
  ov.tag('ep', 'EPISOD 19', { x: W / 2, y: 268, o: q.o, s: q.s }, { bg: '#2f7bff', small: true });
}

const ORANGE = '#ff8a3d', GREEN = '#2fbf5a', BLUE = '#2f9bff', RED = '#ff4d5e';

function arrowAt(id, x, y, ang, { color = ORANGE, s = 0.7, o = 1 } = {}) {
  ov.html(id, ICONS.arrow(color), { x, y, o, s, r: deg(ang) });
}
const SPRING = `<svg width="300" height="90" viewBox="0 0 300 90"><path d="M10 45 L40 10 L70 80 L100 10 L130 80 L160 10 L190 80 L220 10 L250 80 L290 45" fill="none" stroke="#17256b" stroke-width="22" stroke-linejoin="round" stroke-linecap="round"/><path d="M10 45 L40 10 L70 80 L100 10 L130 80 L160 10 L190 80 L220 10 L250 80 L290 45" fill="none" stroke="#ffd84a" stroke-width="11" stroke-linejoin="round" stroke-linecap="round"/></svg>`;
const SCALES = `<svg width="260" height="110" viewBox="0 0 260 110">${[0, 1, 2, 3].map((i) => `<path d="M${20 + i * 55} 20 h70 l-18 70 h-70 z" fill="#ffe28e" stroke="#17256b" stroke-width="9" stroke-linejoin="round"/>`).join('')}</svg>`;
const BONE = `<svg width="200" height="90" viewBox="0 0 200 90"><g fill="#ffffff" stroke="#17256b" stroke-width="9"><circle cx="30" cy="28" r="20"/><circle cx="30" cy="62" r="20"/><circle cx="170" cy="28" r="20"/><circle cx="170" cy="62" r="20"/><rect x="30" y="30" width="140" height="30" rx="12"/></g><rect x="26" y="34" width="148" height="22" fill="#ffffff"/></svg>`;
const HAND = `<svg width="170" height="200" viewBox="0 0 170 200"><path d="M45 190 C30 160 20 120 20 95 C20 80 40 78 45 95 L48 112 L48 35 C48 20 68 20 68 35 L68 95 L72 20 C72 5 92 5 92 20 L92 95 L98 28 C98 13 118 13 118 28 L116 100 L124 55 C126 40 146 42 144 58 L136 130 C132 165 115 190 100 190 Z" fill="#ffd2b0" stroke="#17256b" stroke-width="9" stroke-linejoin="round"/></svg>`;

// ===================================================================== lab
const LAB_PATH = sPath({ x0: -30, x1: 30, amp: 0.75, wave: 3.6 });
const labHeadX = (t) => lerp(0.6, 3.6, inv(7.6, 18.15, t));
function labSnake(t, o = {}) {
  const s = lab.snake;
  const hx = labHeadX(t);
  const h = LAB_PATH.lenAtX(hx);
  const base = pathSpine(LAB_PATH, h, s.length, s.NR);
  const ck = o.coil ?? 0;
  let coil = null;
  if (ck > 0) coil = coilPoints(s.NR, s.length, { cx: hx - 1.3, cz: 0.15, r0: 0.34, grow: 0.085, start: 2.2 });
  const tmp = new THREE.Vector3();
  s.update((i, out) => {
    base(i, out);
    if (coil) out.lerp(coil[i], smooth(clamp(ck * 1.25 - (i / s.NR) * 0.25)));
    return out;
  }, { t, tongue: flick(t, 2), blink: sBlink(t, 2), headLift: 0.25 * ck, headPitch: 0.25 * ck, ...o });
  return hx;
}

// =================================================================== field
const fieldHeadX = (t) => lerp(-6, 2.6, inv(25.4, 34.6, t));
function fieldSnakeS(t, hx) {
  const s = field.snake;
  const h = FIELD_PATH.lenAtX(hx);
  s.update(pathSpine(FIELD_PATH, h, s.length, s.NR), { t, tongue: flick(t, 3), blink: sBlink(t, 3) });
  return h;
}
// concertina timeline: rest, gather (head fixed), extend (tail fixed)
function chState(t) {
  const E = keys(t, [[34.6, CH.emax], [36.5, CH.emax], [38.5, CH.emin], [38.8, CH.emin], [40.6, CH.emax]]);
  const xh = t < 38.65 ? 0 : -CH.emin + E;
  return { E, xh };
}
function fieldSnakeC(t) {
  const s = field.snake2;
  const { E, xh } = chState(t);
  const p = concertinaPath(xh, E, s.length, CH.folds, CH_Z);
  s.update((i, out) => p.at((i / (s.NR - 1)) * s.length, out), { t, tongue: flick(t, 4), blink: sBlink(t, 4) });
  return { E, xh, p };
}
function hideField(which) {
  field.snake.root.visible = which.includes('s');
  field.snake2.root.visible = which.includes('c');
  field.aff.root.visible = which.includes('a');
}

// ======================================================================= SHOTS
const SHOTS = [
  // S1a — garden: Affan spots a snake sliding across the grass and points
  [0, 2.5, (t) => {
    const hx = gHeadX(t);
    gardenSnake(t, hx);
    const a = garden.aff;
    a.root.position.copy(AFF_G);
    a.pose({ yaw: Math.PI + 0.35 });
    const pt = keys(t, [[0.1, 0], [0.55, 1], [2.5, 1]]);
    const tgt = garden.snake.headPos();
    a.pose({
      yaw: Math.PI + 0.35, blink: blinkAt(t, 1), talk: talk(t), wow: keys(t, [[0, 0.6], [0.6, 0]]), smile: 1, brow: 0.9,
      headYaw: 0.35, headPitch: 0.3, lookY: -0.5, lookX: 0.3, lean: 0.05,
      armR: { reach: mixArm(REST_R, reachTo(a, tgt), pt), point: pt, pole: [-1, -0.6, -0.4] },
      armL: { reach: [0.6, 0.55, 0.35], pole: [1, -0.5, -0.4] },
    });
    const k = easeInOut(inv(0, 2.5, t));
    lookCam(cam, V(lerp(0.1, 0.4, k), 4.6, lerp(-6.6, -6.1, k)), V(0.7, 0.9, 1.6), 50);
    hook(t);
    return garden;
  }],
  // S1b — ground level: no legs at all!
  [2.5, 5.75, (t) => {
    const hx = gHeadX(t);
    gardenSnake(t, hx, { look: [-0.4, 0.2] });
    const a = garden.aff;
    a.root.position.copy(AFF_G);
    a.pose({ yaw: Math.PI + 0.5, talk: talk(t), blink: blinkAt(t, 1), headPitch: 0.35, lookY: -0.6, brow: 0.8, smile: 0.6 });
    const k = easeInOut(inv(2.5, 5.75, t));
    const hp = garden.snake.headPos();
    lookCam(cam, V(hp.x - lerp(1.2, 0.9, k), 0.5, lerp(-1.9, -1.6, k)), V(hp.x + 0.55, 0.2, 0.05), 44);
    hook(t);
    // "no legs" marks along the belly
    const q = pop(t, 2.95, 5.6);
    const mid = scr(garden.snake.ringPos(60));
    ov.tag('nolegs', 'TAK ADA KAKI?', { x: W / 2, y: 720, o: q.o, s: q.s }, { bg: RED });
    [[3.1, -230, -40], [3.35, 0, 30], [3.6, 220, -40]].forEach(([a0, dx, dy], i) => {
      const r = pop(t, a0, 5.6, { from: 2 });
      ov.html('nx' + i, ICONS.cross(), { x: W / 2 + dx * 1.3, y: 850 + dy, o: r.o, s: r.s * 0.32 });
    });
    const m = pop(t, 3.92, 5.6);
    ov.html('qm', ICONS.qmark('#ffcf33'), { x: 880, y: 780 + Math.sin(t * 3) * 10, o: m.o, s: m.s * 0.8, r: 12 });
    return garden;
  }],
  // S2 — "Jom ikut Affan siasat!" magnifier swirl into the science world
  [5.75, 7.6, (t) => {
    gardenSnake(t, gHeadX(t));
    const a = garden.aff;
    a.root.position.copy(AFF_G);
    const up = keys(t, [[5.75, 0], [6.0, 1], [7.2, 1], [7.5, 0.6]], easeOut);
    a.pose({
      yaw: Math.PI, blink: blinkAt(t, 2), talk: talk(t), smile: 1, brow: 0.7,
      armR: { reach: [lerp(-0.55, -0.6, up), lerp(0.25, 1.95 + 0.06 * Math.sin(t * 14), up), lerp(0.1, 0.3, up)], pole: [-1, -0.3, -0.5] },
    });
    const k = easeInOut(inv(5.75, 7.6, t));
    lookCam(cam, V(AFF_G.x + lerp(0.2, 0.05, k), lerp(2.9, 3.0, k), AFF_G.z - lerp(4.8, 4.0, k)), V(AFF_G.x, 2.55, AFF_G.z), 46);
    const sk = inv(6.2, 7.45, t);
    ov.swirl(t, W / 2, 820, sk);
    ov.flash(inv(7.2, 7.6, t) ** 2);
    return garden;
  }],
  // S3 — Rahsia 1: x-ray of the backbone, ribs and muscles; then it coils up
  [7.6, 18.15, (t) => {
    const xr = inv(9.0, 9.8, t);
    const bones = smooth(inv(10.1, 12.4, t));
    const mus = inv(13.5, 14.2, t) * (1 - inv(15.6, 16.4, t));
    const ck = easeInOut(inv(15.5, 17.6, t));
    const hx = labSnake(t, { xray: xr, bones, muscle: mus, coil: ck });
    // camera: behind the tail and above, the snake runs up the screen; crane up for the coil
    const k = easeInOut(inv(7.6, 15.0, t));
    const c2 = easeInOut(inv(15.3, 17.6, t));
    const pos = V(lerp(hx - 7.6, hx - 6.2, k), lerp(4.6, 3.9, k), lerp(-1.4, -0.9, k)).lerp(V(hx - 4.4, 6.6, -0.6), c2);
    const look = V(lerp(hx - 1.6, hx - 1.9, k), 0.15, 0).lerp(V(hx - 1.4, 0, 0.1), c2);
    lookCam(cam, pos, look, 50);
    ov.flash(1 - inv(7.6, 8.0, t));
    const r1 = pop(t, 7.68, 10.0);
    ov.bubble('r1', 'RAHSIA 1', { x: W / 2, y: 360, o: r1.o, s: r1.s, r: -3 }, { size: 120 });
    const tg = pop(t, 9.04, 18.1);
    ov.tag('tulang', 'TULANG', { x: W / 2, y: 300, o: tg.o * (t > 10 ? 1 : 1), s: tg.s }, { bg: '#1f6fd6' });
    if (tg.o > 0) ov.html('bone', BONE, { x: W / 2 - 250, y: 300, o: tg.o, s: tg.s * 0.6, r: -12 });
    // scan line
    if (t > 8.9 && t < 9.9) {
      const y = lerp(-80, H + 80, inv(8.95, 9.85, t));
      const g = ov.g;
      const gr = g.createLinearGradient(0, y - 90, 0, y + 90);
      gr.addColorStop(0, 'rgba(120,230,255,0)');
      gr.addColorStop(0.5, 'rgba(160,240,255,0.75)');
      gr.addColorStop(1, 'rgba(120,230,255,0)');
      g.fillStyle = gr;
      g.fillRect(0, y - 90, W, 180);
    }
    const br = pop(t, 11.2, 13.3);
    const mid = scr(lab.snake.ringPos(70));
    ov.tag('beratus', 'BERATUS-RATUS TULANG!', { x: W / 2, y: clamp(mid.y + 260, 1000, 1330), o: br.o, s: br.s }, { bg: '#1f6fd6', pointer: 'up' });
    const ot = pop(t, 14.32, 15.9);
    ov.tag('otot', 'OTOT KUAT', { x: W / 2, y: clamp(mid.y + 260, 1000, 1330), o: ot.o, s: ot.s }, { bg: RED, pointer: 'up' });
    const le = pop(t, 17.2, 18.1, { from: 2.2 });
    ov.bubble('lentur', 'LENTUR!', { x: W / 2, y: 520, o: le.o, s: le.s, r: 4 }, { size: 150 });
    if (le.o > 0) ov.sparkles(t, { n: 18, seed: 8, y: 400, h: 700, a: le.o });
    return lab;
  }],
  // S4 — Rahsia 2: belly scales grip the ground
  [18.15, 25.4, (t) => {
    lab.snake.root.visible = false;
    const fwd = 0.35 * clamp(t - 19.0, 0, 3.6);
    const back = t > 23.0 ? -0.07 * Math.sin(Math.min(1, (t - 23.0) / 0.5) * Math.PI) * (t < 23.5 ? 1 : 0) : 0;
    const jig = t > 23.6 && t < 24.6 ? -0.025 * Math.abs(Math.sin((t - 23.6) * 9)) * (1 - (t - 23.6)) : 0;
    lab.slab.position.set(-1.2 + fwd + back + jig, -0.08, 0);
    // belly edges glow while gripping
    const grip = inv(21.4, 21.8, t) * (1 - inv(24.9, 25.3, t));
    lab.plates.forEach((p, i) => {
      const e = p.userData.edge.material;
      const w = 0.5 + 0.5 * Math.sin(t * 8 - i * 0.7);
      e.emissive.setRGB(1.0 * grip * w, 0.45 * grip * w, 0.05 * grip * w);
    });
    const k = easeInOut(inv(18.15, 25.4, t));
    const cx = lab.slab.position.x + 0.6;
    lookCam(cam, V(cx + lerp(-0.6, 0.2, k), lerp(0.62, 0.55, k), 30 + lerp(6.4, 5.4, k)), V(cx, 0.72, 30), 50);
    ov.flash((1 - inv(18.15, 18.45, t)) * 0.9, '160,230,255');
    const r2 = pop(t, 18.24, 20.6);
    ov.bubble('r2', 'RAHSIA 2', { x: W / 2, y: 360, o: r2.o, s: r2.s, r: 3 }, { size: 120 });
    const sp = pop(t, 19.44, 25.35);
    const pl = scr(lab.plates[5].getWorldPosition(V(0, 0, 0)));
    ov.tag('sisik', 'SISIK PERUT', { x: W / 2, y: pl.y - 190, o: sp.o, s: sp.s }, { bg: '#e0941c', pointer: 'down' });
    if (sp.o > 0) ov.html('scales', SCALES, { x: W / 2, y: 470, o: sp.o * (t > 20.7 ? 1 - inv(20.7, 21.0, t) : 1), s: sp.s * 0.9 });
    const plate = scr(lab.plates[6].getWorldPosition(V(0, 0, 0)).add(V(0, -0.2, 0)));
    const cg = pop(t, 21.52, 25.35);
    ov.tag('cengkam', 'CENGKAM!', { x: clamp(plate.x, 220, 860), y: clamp(plate.y + 190, 900, 1360), o: cg.o, s: cg.s }, { bg: ORANGE, pointer: 'up' });
    // forward is fine, backward is blocked
    const fa = pop(t, 19.6, 22.6);
    if (fa.o > 0) arrowAt('fwd', W / 2 + 120 + ((t * 120) % 60), 560, 0, { color: GREEN, s: 0.8 * fa.s, o: fa.o });
    const ba = pop(t, 22.72, 25.35);
    if (ba.o > 0) {
      arrowAt('back', W / 2 - 120, 560, Math.PI, { color: RED, s: 0.8 * ba.s, o: ba.o });
      const x = pop(t, 23.68, 25.35, { from: 2 });
      ov.html('bx', ICONS.cross(), { x: W / 2 - 120, y: 560, o: x.o, s: x.s * 0.55 });
      const tg = pop(t, 23.68, 25.35);
      ov.tag('tergel', 'TAK TERGELINCIR', { x: W / 2, y: 720, o: tg.o, s: tg.s }, { bg: RED, small: true });
    }
    return lab;
  }],
  // S5 — lateral undulation: S-shape pushes on rocks and grass
  [25.4, 34.6, (t) => {
    hideField('s');
    const hx = fieldHeadX(t);
    const h = fieldSnakeS(t, hx);
    const s = field.snake;
    const k = easeInOut(inv(25.4, 34.6, t));
    lookCam(cam, V(hx - lerp(4.6, 3.4, k), lerp(7.6, 8.6, k), lerp(0.6, 0.2, k)), V(hx - 2.4, 0, 0), 50, [1, 0, 0]);
    ov.flash((1 - inv(25.4, 25.75, t)) * 0.9);
    const ml = pop(t, 26.12, 27.1);
    ov.tag('meliuk', 'MELIUK-LIUK', { x: W / 2, y: 1270, o: ml.o, s: ml.s }, { bg: GREEN });
    const hs = pop(t, 27.12, 34.55, { from: 2 });
    ov.bubble('hurufS', 'S', { x: 170, y: 420 + Math.sin(t * 3) * 8, o: hs.o, s: hs.s, r: -8 }, { size: 230, top: '#c8ff8a', bot: '#2fbf5a', width: 300 });
    if (hs.o > 0) ov.tag('hurufT', 'HURUF S', { x: 170, y: 600, o: hs.o, s: hs.s }, { bg: GREEN, small: true });
    // push arrows at the bends that touch a peg
    const pa = inv(28.8, 29.1, t) * (1 - inv(34.3, 34.6, t));
    const tail = h - s.length;
    let ni = 0;
    if (pa > 0)
      for (const pg of field.pegs) {
        const l = FIELD_PATH.lenAtX(pg.x);
        if (l > h - 0.3 || l < tail + 0.4) continue;
        const c = FIELD_PATH.at(l);
        const a = scr(c.clone().add(V(0, 0.2, pg.side * 0.25)));
        const b = scr(c.clone().add(V(-0.55, 0.2, pg.side * 1.0)));
        const ang = Math.atan2(b.y - a.y, b.x - a.x);
        const pulse = 0.85 + 0.15 * Math.sin(t * 10 + ni);
        arrowAt('push' + ni, (a.x + b.x) / 2, (a.y + b.y) / 2, ang, { color: ORANGE, s: 0.6 * pulse, o: pa });
        ov.dot(scr(V(pg.x, 0.3, pg.z)).x, scr(V(pg.x, 0.3, pg.z)).y, 10, '#fff2a0', pa * 0.9);
        ni++;
      }
    const lb = scr(V(field.pegs.find((p) => p.x > hx - 2.6 && p.kind === 'batu')?.x ?? hx, 0.4, 0));
    const bt = pop(t, 29.36, 31.2), rp = pop(t, 29.84, 31.2);
    ov.tag('batu', 'BATU', { x: 250, y: 1260, o: bt.o, s: bt.s }, { bg: '#e8606a', small: true });
    ov.tag('rumput', 'RUMPUT', { x: 830, y: 1260, o: rp.o, s: rp.s }, { bg: '#43b85c', small: true });
    const tb = pop(t, 31.28, 34.55);
    ov.tag('tolak', 'TOLAK KE BELAKANG', { x: W / 2, y: 1280, o: tb.o, s: tb.s }, { bg: ORANGE });
    const kd = pop(t, 33.16, 34.55, { from: 2 });
    const hp = scr(s.headPos());
    if (kd.o > 0) {
      arrowAt('kedepan', hp.x, hp.y - 190 - ((t * 140) % 50), -Math.PI / 2, { color: GREEN, s: 0.9 * kd.s, o: kd.o });
      ov.bubble('kedepanT', 'KE DEPAN!', { x: W / 2, y: 330, o: kd.o, s: kd.s }, { size: 110, top: '#c8ff8a', bot: '#2fbf5a' });
    }
    return field;
  }],
  // S6 — concertina in a narrow gap: bunch up like a spring, then stretch
  [34.6, 40.75, (t) => {
    hideField('c');
    const { E, xh } = fieldSnakeC(t);
    const k = easeInOut(inv(34.6, 40.75, t));
    lookCam(cam, V(lerp(-4.0, -3.0, k), 9.0, CH_Z + 0.2), V(lerp(-0.9, -0.4, k), 0, CH_Z), 50, [1, 0, 0]);
    ov.flash((1 - inv(34.6, 34.95, t)) * 0.9);
    const ts = pop(t, 34.88, 40.7);
    ov.tag('sempit', 'TEMPAT SEMPIT', { x: W / 2, y: 300, o: ts.o, s: ts.s }, { bg: '#8a5cd6' });
    // squeeze marks against the walls
    if (ts.o > 0) {
      const l = scr(V(-1.2, 0.5, CH_Z - field.half - 0.25)), r = scr(V(-1.2, 0.5, CH_Z + field.half + 0.25));
      arrowAt('wl', l.x - 70, l.y, 0, { color: '#8a5cd6', s: 0.45 * ts.s, o: ts.o * (1 - inv(36.4, 36.7, t)) });
      arrowAt('wr', r.x + 70, r.y, Math.PI, { color: '#8a5cd6', s: 0.45 * ts.s, o: ts.o * (1 - inv(36.4, 36.7, t)) });
    }
    const kp = pop(t, 36.64, 38.7);
    ov.tag('kumpul', 'KUMPUL', { x: 220, y: 1240, o: kp.o, s: kp.s }, { bg: ORANGE });
    const sg = pop(t, 37.72, 39.3, { from: 2 });
    const squeeze = 1 - 0.35 * inv(36.6, 38.5, t);
    ov.html('spring', SPRING, { x: W / 2, y: 520, o: sg.o, s: sg.s * 1.1, r: 0 });
    if (sg.o > 0) ov.bubble('springT', 'MACAM SPRING!', { x: W / 2, y: 650, o: sg.o, s: sg.s }, { size: 92 });
    const rg = pop(t, 39.36, 40.7, { from: 2 });
    const hp = scr(field.snake2.headPos());
    if (rg.o > 0) {
      arrowAt('reg', hp.x, hp.y - 170 - ((t * 140) % 50), -Math.PI / 2, { color: GREEN, s: 0.85 * rg.s, o: rg.o });
      ov.bubble('regT', 'REGANG!', { x: W / 2, y: 520, o: rg.o, s: rg.s }, { size: 130, top: '#c8ff8a', bot: '#2fbf5a' });
    }
    // anchor glow where the tail end stays put
    const anc = t < 38.6 ? inv(36.6, 36.9, t) : inv(38.7, 39.0, t);
    if (anc > 0 && t < 40.6) {
      const st = scr(field.snake2.ringPos(t < 38.65 ? 4 : field.snake2.NR - 20));
      ov.dot(st.x, st.y, 16, '#ffd84a', anc * (0.6 + 0.4 * Math.sin(t * 12)));
    }
    return field;
  }],
  // S7 — the "aha" moment: the whole body does the work
  [40.75, 45.2, (t) => {
    hideField('sa');
    const ax = AFF_FIELD[0], az = AFF_FIELD[1];
    fieldSnakeS(t, ax - 0.6 + 0.45 * (t - 40.75));
    const a = field.aff;
    a.root.position.set(ax, 0, az);
    const jump = t > 40.95 && t < 41.55 ? Math.sin(((t - 40.95) / 0.6) * Math.PI) * 0.45 : 0;
    const up = keys(t, [[40.8, 0], [41.0, 1], [41.7, 1], [42.0, 0]]);
    const pt = keys(t, [[42.4, 0], [42.8, 1], [45.2, 1]]);
    a.pose({ yaw: Math.PI });
    const tgt = field.snake.ringPos(60);
    a.pose({
      yaw: Math.PI - 0.15 * pt, blink: t > 40.9 && t < 41.9 ? 0 : blinkAt(t, 6), talk: talk(t), bob: jump,
      wow: keys(t, [[40.8, 0], [40.95, 1], [41.8, 1], [42.1, 0]]), brow: keys(t, [[40.8, 0], [41.0, 1], [44, 0.5]]), smile: 1,
      headYaw: -0.25 * pt, lookX: -0.4 * pt,
      legL: { x: -0.25 * jump, knee: 0.6 * jump }, legR: { x: -0.25 * jump, knee: 0.6 * jump },
      armL: { reach: [lerp(0.55, 0.85, up), lerp(0.25, 1.85, up), lerp(0.1, 0.3, up)], pole: [1, -0.4, -0.5] },
      armR: pt > 0.01 ? { reach: mixArm([-0.85, 1.85, 0.3], reachTo(a, tgt), pt), point: pt, pole: [-1, -0.6, -0.4] } : { reach: [lerp(-0.55, -0.85, up), lerp(0.25, 1.85, up), lerp(0.1, 0.3, up)], pole: [-1, -0.4, -0.5] },
    });
    const k = easeOut(inv(40.75, 45.2, t));
    lookCam(cam, V(ax + 0.6, 3.5, az - lerp(7.4, 6.6, k)), V(ax + 0.1, 1.7, az + 2.0), 50);
    ov.flash((1 - inv(40.75, 41.05, t)) * 0.9);
    const head = scr(V(ax, 4.4 + jump, az));
    const b = pop(t, 41.0, 45.15);
    ov.html('bulb', ICONS.bulb(), { x: head.x + 260, y: head.y - 40 + Math.sin(t * 5) * 8, o: b.o, s: b.s * 0.7, r: 10 });
    const sb = pop(t, 43.16, 45.15, { fin: 0.4, from: 2.2 });
    ov.bubble('seluruh', 'SELURUH\nBADAN!', { x: W / 2, y: 1080, o: sb.o, s: sb.s }, { size: 150 });
    ov.sparkles(t, { n: 30, seed: 12, y: 250, h: 900, a: inv(41.0, 41.4, t) });
    return field;
  }],
  // S8 — safety: keep away, don't touch, tell a grown-up
  [45.2, 51.7, (t) => {
    const hx = keys(t, [[45.2, -1.0], [51.7, -5.4]], (k) => k);
    gardenSnake(t, hx);
    const a = garden.aff;
    const step = easeInOut(inv(47.7, 48.4, t));
    a.root.position.set(AFF_G.x + 0.6 * step, 0, AFF_G.z + 0.4 * step);
    const stop = keys(t, [[47.7, 0], [48.1, 1], [50.0, 1], [50.4, 0]]);
    const wave = keys(t, [[50.2, 0], [50.5, 1], [51.7, 1]]);
    const wv = POSES.waveR(t).armR;
    a.pose({
      yaw: Math.PI + 0.55, blink: blinkAt(t, 7), talk: talk(t), smile: 0.6 + 0.4 * wave, brow: 0.5 + 0.4 * stop,
      headYaw: 0.4 * (1 - wave), headPitch: 0.15, lookX: 0.3 * (1 - wave),
      armR: wave > 0 ? { reach: mixArm(REST_R, wv.reach, wave), pole: wv.pole } : { reach: mixArm(REST_R, [-0.35, 1.35, 0.85], stop), pole: [-1, -0.8, -0.2], wx: -1.2 * stop },
      armL: { reach: [0.55, 0.3, 0.15] },
    });
    const k = easeInOut(inv(45.2, 51.7, t));
    lookCam(cam, V(lerp(0.4, 0.7, k), 3.0, lerp(-6.4, -7.0, k)), V(lerp(1.2, 1.3, k), 2.0, 1.6), 50);
    ov.flash((1 - inv(45.2, 45.55, t)) * 0.9);
    const ig = pop(t, 45.6, 51.65);
    ov.tag('ingat', 'INGAT!', { x: W / 2, y: 290, o: ig.o, s: ig.s }, { bg: RED });
    const jd = pop(t, 47.88, 51.65);
    ov.tag('jdekat', 'JANGAN DEKAT', { x: W / 2, y: 430, o: jd.o, s: jd.s }, { bg: ORANGE });
    const hn = pop(t, 48.0, 50.0);
    ov.html('hand', HAND, { x: 860, y: 640, o: hn.o, s: hn.s * 0.75, r: 8 });
    const js = pop(t, 48.96, 51.65);
    ov.tag('jsentuh', 'JANGAN SENTUH', { x: W / 2, y: 560, o: js.o, s: js.s }, { bg: RED });
    const x = pop(t, 49.28, 51.65, { from: 2 });
    ov.html('sx', ICONS.cross(), { x: 180, y: 560, o: x.o, s: x.s * 0.42 });
    const bd = pop(t, 50.08, 51.65);
    ov.tag('dewasa', 'BERITAHU ORANG DEWASA', { x: W / 2, y: 690, o: bd.o, s: bd.s }, { bg: BLUE, small: true });
    return garden;
  }],
  // S9 — "Apa lagi kita nak belajar lepas ni?"
  [51.7, 54.2, (t) => {
    garden.snake.root.visible = false;
    const a = garden.aff;
    a.root.position.set(AFF_G.x + 0.6, 0, AFF_G.z + 0.4);
    const tk = keys(t, [[51.75, 0], [52.15, 1], [54.2, 1]]);
    const th2 = POSES.thinkR.armR;
    a.pose({
      yaw: Math.PI, blink: blinkAt(t, 8), talk: talk(t), smile: 1, brow: 0.3 + 0.4 * tk,
      headRoll: -0.12 * tk, lookX: 0.35 * tk, lookY: 0.4 * tk, headPitch: -0.08 * tk,
      armR: { reach: mixArm(REST_R, th2.reach, tk), pole: th2.pole, point: tk, wx: th2.wx * tk },
    });
    const ap = a.root.position;
    const k = easeInOut(inv(51.7, 54.2, t));
    lookCam(cam, V(ap.x + 0.15, 3.0, ap.z - lerp(4.9, 4.3, k)), V(ap.x, 2.6, ap.z), 46);
    const head = scr(V(ap.x, 3.1, ap.z));
    [[52.0, -260, -330, '#ffcf33', -12], [52.3, 250, -380, '#3fa2ff', 10], [52.6, 300, -120, '#ffcf33', 14]].forEach(([a0, dx, dy, c, r], i) => {
      const q = pop(t, a0, 54.15);
      ov.html('q' + i, ICONS.qmark(c), { x: head.x + dx, y: head.y + dy + Math.sin(t * 3 + i) * 10, o: q.o, s: q.s * 0.85, r });
    });
    return garden;
  }],
  // Outro — The Curious Affan logo, with the snake curled up beside Affan
  [54.2, DURATION, (t) => {
    const k = easeOut(inv(54.2, 54.9, t));
    outro.aff.root.position.set(0, 0, 0);
    const th2 = POSES.thinkR.armR;
    outro.aff.pose({ ...POSES.thinkR, armR: { ...th2 }, smile: 1, blink: blinkAt(t, 9), headRoll: -0.08, lookX: 0.25, lookY: 0.15, headYaw: 0.08 });
    outro.snake.root.visible = false;
    lookCam(cam, V(0, 2.6, lerp(7.5, 5.4, k)), V(0, 2.3, 0), 40);
    const hc = scr(V(0, 2.95, 0));
    ov.flash((1 - inv(54.2, 54.55, t)) * 1.0);
    const g = ov.g;
    const ra = inv(54.3, 54.9, t);
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
    const ic = pop(t, 54.8, 99);
    ov.html('oBulb', ICONS.bulb(), { x: 175, y: 470 + Math.sin(t * 2) * 8, o: ic.o, s: ic.s * 0.55, r: -10 });
    ov.html('oQ1', ICONS.qmark('#ffcf33'), { x: 880, y: 420 + Math.sin(t * 2 + 1) * 8, o: ic.o, s: ic.s * 0.9, r: 12 });
    const l1 = pop(t, 54.5, 99), l2 = pop(t, 54.7, 99), l3 = pop(t, 54.9, 99);
    drawLogo(ov, { k: [l1, l2, l3], star: pop(t, 55.1, 99) });
    return outro;
  }],
];

function frame(t) {
  ov.begin();
  cam.aspect = W / H;
  cam.updateProjectionMatrix();
  garden.snake.root.visible = true;
  lab.snake.root.visible = true;
  const shot = SHOTS.find(([a, b]) => t >= a && t < b) || SHOTS[SHOTS.length - 1];
  const world = shot[2](t);
  if (world.sky) world.sky.position.copy(cam.position);
  renderer.render(world.scene, cam);
  if (world !== outro) ov.vignette(0.22);
  ov.captions(t, CAPTIONS, KEYWORDS);
  ov.end();
}

// Cover / thumbnail (9:16): Affan amazed, pointing at the cute snake in an S on
// the grass, big title, episode badge and the series logo. Key elements stay
// inside the centre 3:4 area (y 240-1680) that profile grids show.
const THUMB = { cam: [0.6, 6.0, -4.4], look: [1.0, 1.0, 1.6], fov: 55, hx: 0.3, aff: [1.75, 0, 1.7] };
window.setThumb = (o) => Object.assign(THUMB, o);
function thumbnail() {
  ov.begin();
  cam.aspect = W / H;
  cam.updateProjectionMatrix();
  const t = 1.2;
  garden.snake.root.visible = true;
  gardenSnake(t, THUMB.hx, { tongue: 1, blink: 0, headLift: 0.18, headPitch: 0.35, headYaw: -1.1, look: [0, 0.2] });
  const a = garden.aff;
  a.root.position.set(...THUMB.aff);
  a.pose({ yaw: Math.PI + 0.25 });
  const tgt = garden.snake.headPos();
  a.pose({
    yaw: Math.PI + 0.25, blink: 0, talk: 0, wow: 0.9, brow: 1, headYaw: 0.3, headPitch: 0.2, lookY: -0.3, lookX: 0.2,
    armR: { reach: reachTo(a, tgt), point: 1, pole: [-1, -0.6, -0.4] },
    armL: { reach: [0.75, 1.0, 0.45], pole: [1, -0.5, -0.4] },
  });
  lookCam(cam, V(...THUMB.cam), V(...THUMB.look), THUMB.fov);
  garden.sky.position.copy(cam.position);
  renderer.render(garden.scene, cam);
  const g = ov.g;
  const top = g.createLinearGradient(0, 0, 0, 760);
  top.addColorStop(0, 'rgba(10,40,90,0.7)');
  top.addColorStop(1, 'rgba(10,40,90,0)');
  g.fillStyle = top;
  g.fillRect(0, 0, W, 760);
  const bot = g.createLinearGradient(0, H - 900, 0, H);
  bot.addColorStop(0, 'rgba(8,30,20,0)');
  bot.addColorStop(1, 'rgba(8,30,20,0.75)');
  g.fillStyle = bot;
  g.fillRect(0, H - 900, W, 900);
  ov.vignette(0.25);
  ov.tag('thBadge', 'EPISOD 19', { x: W / 2, y: 300 }, { bg: '#2f7bff', small: true });
  ov.bubble('thTitle', 'MACAM MANA ULAR\nBERGERAK?', { x: W / 2, y: 430, r: -2 }, { size: 100, top: '#c8ff8a', bot: '#3fcf5a' });
  ov.tag('thSub', 'TAK ADA KAKI!', { x: 790, y: 1180, r: 4 }, { bg: RED });
  ov.html('thQ', ICONS.qmark('#ffcf33'), { x: 950, y: 820, r: 14, s: 0.9 });
  drawLogo(ov, { y: 1455, scale: 0.52 });
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
