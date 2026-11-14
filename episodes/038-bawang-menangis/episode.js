// THE CURIOUS AFFAN — Episode 038: "Kenapa Potong Bawang Buat Kita Menangis?"
// Every shot is a pure function of time t (seconds), synced to audio/narration.mp3.
import * as THREE from 'three';
import { makeRenderer, loadEnvelope, toScreen, clamp, lerp, inv, easeOut, easeIn, easeInOut, keys, rng, W, H } from '../../shared/core.js';
import { POSES, blinkAt } from '../../shared/affan.js';
import { Overlay, pop, ICONS, drawLogo } from '../../shared/overlay.js';
import { CAPTIONS, KEYWORDS } from './captions.js';
import { buildKitchen, buildCells, buildEye, buildOutro, BOARD, ISLAND_TOP, MAMA_POS, AFF_POS, FRIDGE, COLS, ROWS, CELL_W, CELL_H, EYE_R } from './worlds.js';

const FPS = 30;
const DURATION = 72.5;
const OUTRO = 69.35;

const stage = document.getElementById('stage');
const canvas = document.createElement('canvas');
stage.appendChild(canvas);
const renderer = makeRenderer(canvas);
const ov = new Overlay(stage);
const kit = buildKitchen();
const cellW = buildCells();
const eyeW = buildEye();
const outro = buildOutro();
const cam = new THREE.PerspectiveCamera(50, W / H, 0.02, 6000);
let env = { at: () => 0 };

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const talk = (t) => clamp(env.at(t) * 1.2);
const scr = (p) => toScreen(p, cam);
const mix3 = (a, b, k) => a.map((v, i) => lerp(v, b[i], k));
const BLUE = '#2f9bff', YELLOW = '#e0b400', ORANGE = '#ff8a3d', PURPLE = '#7a5cf0', GREEN = '#2fbf5f', PINK = '#ff5c9a', TEAL = '#20b8a0';

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

// ------------------------------------------------------------------ kitchen
const AFF_YAW = Math.atan2(MAMA_POS.x - AFF_POS.x, MAMA_POS.z - AFF_POS.z);
// Mama chops (chop 0..1), with tears (cry 0..1)
function mamaSet(t, { chop = 1, cry = 0, show = 0, smile = 0.9, p = {} } = {}) {
  const m = kit.mama;
  m.root.position.copy(MAMA_POS);
  const base = { yaw: 0, lean: 0.2, blink: blinkAt(t, 5), smile, brow: cry > 0.5 ? -0.3 : 0.2, ...p };
  m.pose(base);
  m.root.updateMatrixWorld(true);
  // right hand holds the knife over the board; left hand steadies the onion (or shows it)
  const up = 0.12 * Math.abs(Math.sin(t * 6.5)) * chop;
  const kTarget = V(BOARD.x - 0.42, ISLAND_TOP + 0.24 + up, BOARD.z + 0.05);
  const oTarget = show > 0 ? V(BOARD.x + 0.25, ISLAND_TOP + 0.6 + 0.35 * show, BOARD.z + 0.35 * show) : V(BOARD.x - 0.05, ISLAND_TOP + 0.2, BOARD.z + 0.05);
  m.pose({ ...base, armR: { reach: m.toTorso(kTarget), pole: [-1, -0.6, -0.4] }, armL: { reach: m.toTorso(oTarget), pole: [1, -0.6, -0.4] } });
  m.root.updateMatrixWorld(true);
  const hand = m.parts.arms.R.hand.getWorldPosition(V());
  kit.knife.position.copy(hand);
  kit.knife.rotation.set(0, -0.35, -0.25 - 0.3 * (up / 0.12));
  kit.shine.material.opacity = 0;
  // onion follows the left hand when shown
  const lh = m.parts.arms.L.hand.getWorldPosition(V());
  if (show > 0.01) kit.onion.position.copy(lh).add(V(0, 0.12, 0.12));
  else kit.onion.position.set(BOARD.x - 0.15, ISLAND_TOP + 0.07, BOARD.z + 0.02);
  // tears roll down her cheeks
  kit.tears.forEach((d, i) => {
    const side = i % 2 ? 1 : -1;
    const ph = ((t * 0.7 + i * 0.37) % 1);
    d.visible = cry > 0.02;
    if (!d.visible) return;
    d.position.copy(m.parts.head.localToWorld(V(0.3 * side, -0.2 - ph * 0.45, 0.7 - ph * 0.08)));
    d.scale.setScalar(cry * (0.8 + 0.3 * Math.sin(ph * Math.PI)));
  });
}
function affSet(t, p = {}) {
  const a = kit.aff;
  a.root.position.copy(AFF_POS);
  a.pose({ yaw: AFF_YAW, blink: blinkAt(t, 1), talk: talk(t), smile: 0.9, ...p });
  a.root.updateMatrixWorld(true);
}
const mamaHead = () => kit.mama.parts.head.getWorldPosition(V());
const affHead = () => kit.aff.parts.head.getWorldPosition(V());
function kitReset() {
  kit.door.rotation.y = 0;
}

// --------------------------------------------------------- inside the onion
const CUT_X = 0.0;
const KNIFE_A = 25.9, KNIFE_B = 27.9, MIX = [28.8, 30.4], GAS0 = 30.9;
function cellsSet(t, { cut = 0, mix = 0, gas = 0 } = {}) {
  cellW.knife.visible = cut > 0 && cut < 1.2;
  const ky = lerp(ROWS * CELL_H + 3, -1.5, easeInOut(clamp(cut)));
  cellW.knife.position.set(CUT_X, ky, 0);
  cellW.cells.forEach((c, i) => {
    const hit = Math.abs(c.x - CUT_X) < CELL_W * 0.75;
    const cutY = ky + 0.3; // knife edge height
    const broken = hit && cut > 0 && cutY < c.y ? 1 : 0;
    const b = broken * clamp((cutY < c.y ? (c.y - cutY) / 1.2 : 0));
    const wob = 0.02 * Math.sin(t * 2 + c.ph);
    c.g.scale.setScalar(1 + wob);
    c.wall.material.opacity = 0.28 * (1 - b);
    c.edge.material.opacity = 0.9 * (1 - b);
    c.vac.material.opacity = 0.35 * (1 - b);
    // contents drift together and turn green when mixed
    const k = hit ? mix : 0;
    c.ys.forEach((m, j) => {
      m.position.copy(c.home.ys[j]).lerp(V(0, 0, 0.1), k * 0.8);
      m.position.x += 0.04 * Math.sin(t * 6 + j) * k;
      m.material.color.setHex(0xffd23a).lerp(new THREE.Color(0x9adf3a), k);
      m.scale.setScalar(1 - 0.6 * gas * (hit ? 1 : 0));
    });
    c.ps.forEach((m, j) => {
      m.position.copy(c.home.ps[j]).lerp(V(0, 0, 0.1), k * 0.85);
      m.position.y += 0.04 * Math.cos(t * 6 + j) * k;
      m.material.color.setHex(0x9a5ae0).lerp(new THREE.Color(0x9adf3a), k);
      m.scale.setScalar(1 - 0.6 * gas * (hit ? 1 : 0));
    });
  });
  const hits = cellW.cells.filter((c) => Math.abs(c.x - CUT_X) < CELL_W * 0.75);
  cellW.gas.forEach((s, i) => {
    const R = rng(i * 5 + 2);
    const c = hits[i % hits.length];
    s.visible = gas > 0.01;
    if (!s.visible) return;
    const life = ((t * (0.35 + R() * 0.25) + R()) % 1);
    s.position.set(c.x + (R() - 0.5) * 1.2 + Math.sin(t * 2 + i) * 0.2, c.y + life * 4.5, 0.6 + R() * 0.6);
    s.scale.setScalar(0.6 + life * 1.2);
    s.material.opacity = gas * Math.sin(life * Math.PI) * 0.8;
  });
  const a = cellW.aff;
  a.root.position.set(2.9, 0, 1.6);
  a.pose({ yaw: -0.5, blink: blinkAt(t, 3), talk: talk(t), smile: 0.9, headPitch: -0.3, lookY: 0.4 });
  a.root.updateMatrixWorld(true);
}
const cellCenter = (r, c) => cellW.cells[r * COLS + c];

// --------------------------------------------------------------- the eye
const TEAR_PATH = new THREE.CatmullRomCurve3([V(3.3, 2.3, 1.1), V(2.6, 1.3, 2.5), V(1.2, 0.0, 2.9), V(0.0, -1.0, 2.8), V(-0.8, -2.0, 2.4), V(-1.1, -3.5, 1.8), V(-1.3, -6, 1.0)]);
function eyeSet(t, { open = 1, red = 0, tears = 0, gasIn = 0, wash = 0 } = {}) {
  const o = clamp(open);
  eyeW.lidU.rotation.x = lerp(0.32, -1.3, o);
  eyeW.lidL.rotation.x = lerp(-0.38, 1.3, o);
  eyeW.redMat.opacity = 0;
  eyeW.scleraMat.color.setHex(0xffffff).lerp(new THREE.Color(0xff9aa6), 0.7 * red);
  eyeW.iris.position.x = 0.15 * Math.sin(t * 1.3);
  eyeW.gland.scale.set(1.2 * (1 + 0.15 * tears * Math.sin(t * 9)), 0.8 * (1 + 0.15 * tears * Math.sin(t * 9)), 0.8);
  eyeW.tears.forEach((d, i) => {
    const u = ((t * 0.32 + i / eyeW.tears.length) % 1);
    d.visible = tears > 0.01 && u < tears * 1.05;
    if (!d.visible) return;
    d.position.copy(TEAR_PATH.getPointAt(u)).add(V(0.25 * Math.sin(i * 2.1), 0, 0.12));
    d.scale.setScalar(0.8 + 0.5 * Math.sin(i * 1.7) ** 2);
  });
  eyeW.gas.forEach((s, i) => {
    const R = rng(i * 7 + 1);
    s.visible = gasIn > 0.01;
    if (!s.visible) return;
    const life = ((t * (0.25 + R() * 0.2) + R()) % 1);
    const target = V((R() - 0.5) * 4.6, (R() - 0.5) * 2.6 + 0.4, 3.0);
    const start = V((R() - 0.5) * 8, -6, 3.4);
    const p = start.clone().lerp(target, clamp(gasIn * 1.2 * (0.3 + life)));
    p.y -= wash * (life * 6);
    s.position.copy(p).add(V(Math.sin(t * 2 + i) * 0.2, 0, 0));
    s.scale.setScalar(0.9 + life);
    s.material.opacity = 0.75 * gasIn * (1 - wash * life) * Math.sin(life * Math.PI + 0.3);
  });
}

// ======================================================================= SHOTS
const SHOTS = [
  // S1 — kitchen: Mama chops an onion, Affan watches from his stool
  [0, 2.2, (t) => {
    kitReset();
    mamaSet(t, { chop: 1, cry: 0.6 });
    affSet(t, { headPitch: 0.05 });
    camMove(t, 0, 2.2, [1.0, 2.6, 6.0], [0.75, 1.7, -1.0], [0.9, 2.5, 5.4], [0.75, 1.7, -1.0], 50);
    const q = pop(t, 0.4, 2.15);
    ov.tag('ep', 'EPISOD 38', { x: W / 2, y: 268, o: q.o, s: q.s }, { bg: '#2f7bff', small: true });
    return kit;
  }],
  // S2 — "Papa! Kenapa mama menangis? Mama sedih ke?" close on Mama's tears
  [2.2, 6.8, (t) => {
    kitReset();
    mamaSet(t, { chop: 0.7, cry: 1, smile: 0.4 });
    affSet(t, { brow: -0.6, smile: 0.3, headPitch: -0.1 });
    const mh = mamaHead();
    camMove(t, 2.2, 6.8, mh.clone().add(V(0.9, -0.2, 2.6)).toArray(), mh.clone().add(V(0, -0.35, 0)).toArray(), mh.clone().add(V(0.7, -0.25, 2.2)).toArray(), mh.clone().add(V(0, -0.35, 0)).toArray(), 46);
    const pp = pop(t, 2.26, 3.0, { from: 2 });
    ov.bubble('papa', 'PAPA!', { x: 800, y: 470, o: pp.o, s: pp.s * 0.8, r: 6 }, { size: 110 });
    bubble('menangis', 'MAMA MENANGIS?', t, 2.96, 4.65, 430, 108, { top: '#d6f0ff', bot: '#2f8fff' });
    bubble('sedih', 'MAMA SEDIH KE?', t, 4.7, 6.75, 430, 108, { top: '#e6ecff', bot: '#7aa8ff' }, 2);
    pinTag('airmata', 'AIR MATA', scr(kit.mama.parts.head.localToWorld(V(-0.3, -0.45, 0.7))), t, 3.56, 6.7, { bg: '#2f8fff', pointer: 'down' }, -60);
    return kit;
  }],
  // S3 — "Eh, mama kata tak sedih pun... mama tengah potong bawang!"
  [6.8, 11.84, (t) => {
    kitReset();
    const show = easeOut(inv(10.0, 10.6, t));
    mamaSet(t, { chop: t < 9.8 ? 0.4 : 0, cry: 0.7, smile: 1, show, p: { talk: 0, headRoll: 0.08 } });
    affSet(t, { smile: 0.9, brow: 0.3 });
    camMove(t, 6.8, 11.84, [0.9, 2.5, 5.4], [0.7, 1.8, -1.0], [0.8, 2.4, 4.8], [0.6, 1.8, -1.0], 50);
    bubble('taksedih', 'TAK SEDIH PUN!', t, 7.64, 9.9, 430, 112, { top: '#d6fff0', bot: '#2fbf8f' });
    pinTag('bawang', 'BAWANG!', scr(kit.onion.position.clone().add(V(0, 0.3, 0))), t, 10.48, 11.8, { bg: '#b06ab8', pointer: 'down' }, -50);
    return kit;
  }],
  // S4 — "Kenapa potong bawang buat kita menangis?"
  [11.84, 14.3, (t) => {
    kitReset();
    mamaSet(t, { chop: 0, cry: 0.5, smile: 1, show: 1 });
    affSet(t, { ...POSES.thinkR, brow: -0.3, smile: 0.5 });
    const ah = affHead();
    lookCam(ah.clone().add(V(0.9, 0.1, 2.3)), ah.clone().add(V(-0.1, -0.15, 0)), 46);
    const hd = scr(ah.clone().add(V(0, 0.45, 0)));
    qmarks(t, hd, 11.84, 14.25, [[11.9, -260, 0, '#ffcf33', -12], [12.3, 250, -60, '#3fa2ff', 10], [12.7, 280, 140, '#ffcf33', 14]]);
    bubble('kenapa', 'KENAPA MENANGIS?', t, 12.22, 14.25, 430, 104, { top: '#fff6d0', bot: '#ffb21f' });
    return kit;
  }],
  // S5 — "Jom ikut Affan cari jawapan!" swirl into the onion
  [14.3, 16.26, (t) => {
    kitReset();
    mamaSet(t, { chop: 0, cry: 0.4, smile: 1, show: 1 });
    const up = keys(t, [[14.32, 0], [14.55, 1], [15.8, 1], [16.1, 0.6]], easeOut);
    affSet(t, { smile: 1, brow: 0.6, armR: { reach: [lerp(-0.6, -0.55, up), lerp(0.25, 1.95 + 0.06 * Math.sin(t * 14), up), lerp(0.2, 0.35, up)], pole: [-1, -0.3, -0.5] } });
    const on = kit.onion.position.clone();
    const k = easeIn(inv(14.8, 16.26, t));
    lookCam(affHead().add(V(0.9, 0.1, 2.3)).lerp(on.clone().add(V(0.1, 0.05, 0.35)), k), affHead().add(V(-0.1, -0.15, 0)).lerp(on, k), 46);
    ov.swirl(t, W / 2, 820, inv(14.5, 16.2, t));
    ov.flash(inv(15.85, 16.26, t) ** 2);
    return kit;
  }],
  // S6 — inside the onion: tiny rooms called cells; inside, things stored apart
  [16.26, 25.6, (t) => {
    cellsSet(t);
    const c = cellCenter(2, 2);
    if (t < 21.9) camMove(t, 16.26, 21.9, [0.4, 4.0, 15.5], [0, 3.6, 0], [0.2, 3.6, 12.0], [0, 3.4, 0], 50);
    else camMove(t, 21.9, 25.6, [0.2, 3.6, 12.0], [0, 3.4, 0], [c.x + 0.3, c.y + 0.15, 2.4], [c.x, c.y, 0], 46);
    ov.flash(1 - inv(16.26, 16.6, t));
    bubble('bilik', 'BILIK-BILIK KECIL', t, 18.6, 20.5, 400, 104, { top: '#fff0f8', bot: '#d07ae0' });
    bubble('sel', 'SEL!', t, 21.08, 22.0, 400, 160, { top: '#fff6d0', bot: '#ffb21f' }, 3);
    if (t > 22.9) {
      pinTag('bahanA', 'BAHAN A', scr(c.g.localToWorld(V(-0.22, 0.32, 0.1))), t, 23.2, 25.55, { bg: YELLOW, pointer: 'down' }, -30);
      pinTag('bahanB', 'BAHAN B', scr(c.g.localToWorld(V(0.33, 0.25, 0.1))), t, 23.6, 25.55, { bg: PURPLE, pointer: 'down' }, -30);
    }
    topTag('asing', 'DISIMPAN BERASINGAN', t, 24.16, 25.55, PINK);
    return cellW;
  }],
  // S7 — the knife cuts: cells burst, the stuff mixes and turns into a fine gas
  [25.6, 32.94, (t) => {
    const cut = inv(KNIFE_A, KNIFE_B, t) + (t > KNIFE_B ? inv(KNIFE_B, KNIFE_B + 0.6, t) * 0.5 : 0);
    cellsSet(t, { cut, mix: easeInOut(inv(MIX[0], MIX[1], t)), gas: inv(GAS0, GAS0 + 0.6, t) });
    if (t < 28.6) camMove(t, 25.6, 28.6, [0.6, 4.2, 15.0], [0, 3.8, 0], [0.4, 3.8, 12.5], [0, 3.4, 0], 50);
    else camMove(t, 28.6, 32.94, [0.4, 3.8, 12.5], [0, 3.4, 0], [1.2, 4.4, 9.0], [0, 4.4, 0], 50);
    bubble('pisau', 'PISAU DATANG!', t, 25.92, 27.4, 400, 112, { top: '#e8eef8', bot: '#8a98b8' });
    bubble('pecah', 'PECAH!', t, 27.94, 28.8, 400, 160, { top: '#ffd0d0', bot: '#ff5c5c' }, 3);
    topTag('campur', 'BAHAN BERCAMPUR', t, 29.68, 31.0, ORANGE);
    bubble('gas', 'GAS HALUS!', t, 31.8, 32.9, 400, 130, { top: '#efffd0', bot: '#7ad83a' }, -2);
    return cellW;
  }],
  // S8 — the gas floats up to the eye; on the wet eye it stings
  [32.94, 38.62, (t) => {
    const red = inv(37.5, 37.9, t);
    eyeSet(t, { open: 1 - 0.45 * red, red, gasIn: inv(33.1, 34.4, t) });
    camMove(t, 32.94, 38.62, [0.4, -0.5, 15.5], [0, 0.0, 0], [0.2, 0.4, 12.5], [0, 0.4, 0], 50);
    ov.flash(1 - inv(32.94, 33.25, t));
    topTag('naik', 'GAS NAIK KE MATA', t, 33.46, 35.0, '#7ad83a');
    pinTag('basah', 'MATA BASAH', scr(V(-1.6, 1.6, 2.8)), t, 35.82, 37.5, { bg: '#2f8fff', pointer: 'down' }, -40);
    bubble('pedih', 'PEDIH!', t, 37.66, 38.6, 420, 170, { top: '#ffd0d0', bot: '#ff4d5e' }, 4);
    return eyeW;
  }],
  // S9 — the eye makes tears to wash the gas out: not sadness, protection
  [38.62, 48.58, (t) => {
    const tears = inv(39.6, 40.6, t);
    const wash = inv(41.6, 43.0, t);
    const red = 1 - inv(42.0, 44.0, t);
    eyeSet(t, { open: lerp(0.55, 1, inv(42.5, 43.5, t)), red, tears, gasIn: 1 - inv(43.0, 44.0, t) * 0.999, wash });
    if (t < 43.3) camMove(t, 38.62, 43.3, [3.8, 1.8, 10.5], [1.6, 0.8, 0], [2.6, 1.0, 11.5], [0.8, 0.2, 0], 50);
    else camMove(t, 43.3, 48.58, [2.6, 1.0, 11.5], [0.8, 0.2, 0], [0.3, 0.4, 13.5], [0, 0.4, 0], 50);
    pinTag('kelenjar', 'KELENJAR AIR MATA', scr(V(3.4, 2.5, 0.9)), t, 39.0, 41.0, { bg: PINK, pointer: 'down' }, -50);
    bubble('airmata2', 'AIR MATA!', t, 40.56, 41.55, 400, 140, { top: '#d6f0ff', bot: '#2f8fff' });
    topTag('basuh', 'BASUH GAS KELUAR', t, 41.62, 43.2, '#2f8fff');
    const q = pop(t, 44.76, 46.0, { from: 2 });
    if (q.o > 0) {
      ov.bubble('bukansedih', 'BUKAN SEDIH', { x: W / 2, y: 430, o: q.o, s: q.s, r: -2 }, { size: 120, top: '#e6ecff', bot: '#7aa8ff' });
      const c = pop(t, 45.3, 46.0, { from: 3, fin: 0.2 });
      ov.html('crossS', ICONS.cross(), { x: W / 2, y: 440, o: c.o, s: c.s * 0.9, r: 8 });
    }
    bubble('lindungi', 'MATA LINDUNGI DIRI!', t, 46.02, 48.5, 430, 96, { top: '#d6fff0', bot: '#2fbf8f' }, 2);
    ov.sparkles(t, { n: 26, seed: 21, y: 600, h: 700, a: inv(47.3, 47.6, t) });
    return eyeW;
  }],
  // S10 — tips: cold onion from the fridge, a sharp knife; knives are for grown-ups
  [48.58, 60.12, (t) => {
    const open = easeInOut(inv(49.9, 50.6, t)) * (1 - easeInOut(inv(52.0, 52.5, t)));
    kit.door.rotation.y = -1.6 * open;
    mamaSet(t, { chop: t > 53.0 && t < 56.0 ? 1 : 0, cry: 0, smile: 1 });
    kit.shine.material.opacity = Math.max(0, Math.sin(Math.PI * inv(52.9, 53.9, t)));
    kit.shine.scale.setScalar(1.4);
    affSet(t, { smile: 1, ...(t > 56.0 ? { armL: { reach: [0.35, 0.55, -0.35], pole: [1, -0.6, 0.4] }, armR: { reach: [-0.35, 0.55, -0.35], pole: [-1, -0.6, 0.4] } } : {}), headPitch: t > 58.4 ? 0.2 * Math.abs(Math.sin((t - 58.4) * 8)) : 0 });
    const fr = FRIDGE.clone().add(V(0.2, 1.6, 0.8));
    if (t < 52.4) camMove(t, 48.58, 52.4, [0.2, 2.6, 4.2], [-1.6, 1.8, -2.6], [-1.0, 2.0, 1.2], fr.toArray(), 50);
    else if (t < 56.0) camMove(t, 52.4, 56.0, [-0.2, 2.3, 1.6], [-0.4, ISLAND_TOP + 0.2, BOARD.z], [0.4, 2.2, 1.3], [-0.3, ISLAND_TOP + 0.25, BOARD.z], 46);
    else camMove(t, 56.0, 60.12, [1.0, 2.5, 5.6], [0.75, 1.8, -1.0], [0.9, 2.4, 5.0], [0.75, 1.8, -1.0], 50);
    ov.flash((1 - inv(48.58, 48.9, t)) * 0.7);
    topTag('tip', 'TIP DARI PAPA', t, 48.58, 49.9, ORANGE);
    pinTag('sejuk', 'BAWANG SEJUK', scr(FRIDGE.clone().add(V(0.4, 1.9, 0.7))), t, 50.4, 52.2, { bg: '#4aa8ff', pointer: 'down' }, -40);
    if (t > 50.4 && t < 52.3) ov.sparkles(t, { n: 22, seed: 31, x: 250, y: 600, w: 580, h: 700, colors: ['#ffffff', '#cfefff', '#9fdcff'], a: inv(50.4, 50.8, t) * (1 - inv(51.9, 52.3, t)) });
    pinTag('tajam', 'PISAU TAJAM', scr(kit.knife.position.clone().add(V(0.3, 0.15, 0))), t, 52.6, 54.2, { bg: '#8a98b8', pointer: 'down' }, -40);
    bubble('kurang', 'KURANG GAS,\nKURANG AIR MATA!', t, 54.28, 55.95, 440, 96, { top: '#d6fff0', bot: '#2fbf8f' });
    const dq = pop(t, 57.28, 60.05);
    if (dq.o > 0) ov.tag('dewasa', 'PISAU: ORANG DEWASA SAHAJA', { x: W / 2, y: 430, o: dq.o, s: dq.s }, { bg: '#ff4d5e' });
    return kit;
  }],
  // S11 — "Waaah ... Terima kasih mama, masakkan untuk kita!"
  [60.12, 67.12, (t) => {
    kitReset();
    mamaSet(t, { chop: 0, cry: 0, smile: 1, p: { headRoll: 0.06 * Math.sin(t * 2) } });
    affSet(t, { wow: keys(t, [[60.15, 0], [60.3, 0.9], [60.9, 0.9], [61.2, 0]]), smile: 1, brow: 0.6, ...(t > 64.3 ? POSES.thumbsUpR : {}) });
    camMove(t, 60.12, 67.12, [1.0, 2.6, 5.6], [0.75, 1.8, -1.0], [0.9, 2.5, 5.0], [0.75, 1.8, -1.0], 50);
    ov.flash((1 - inv(60.12, 60.4, t)) * 0.9, '255,250,235');
    const hd = scr(affHead().add(V(0, 0.5, 0)));
    const b = pop(t, 60.2, 64.2);
    ov.html('bulb', ICONS.bulb(), { x: clamp(hd.x + 180, 150, 900), y: clamp(hd.y - 120, 300, 900) + Math.sin(t * 5) * 8, o: b.o, s: b.s * 0.6, r: 10 });
    ov.sparkles(t, { n: 30, seed: 12, y: 250, h: 900, a: inv(60.2, 60.5, t) * (1 - inv(62.2, 62.8, t)) });
    bubble('basuhgas', 'MATA BASUH GAS BAWANG!', t, 60.84, 64.2, 430, 88, { top: '#d6f0ff', bot: '#2f8fff' });
    bubble('terima', 'TERIMA KASIH, MAMA!', t, 64.4, 67.05, 430, 96, { top: '#ffe0f0', bot: '#ff5c9a' }, 2);
    if (t > 64.4) {
      const mh = scr(mamaHead().add(V(0.4, 0.7, 0)));
      for (let i = 0; i < 3; i++) {
        const q = pop(t, 64.6 + i * 0.25, 67.05);
        if (q.o > 0) ov.html('heart' + i, `<div style="font:800 90px 'Baloo 2';color:#ff5c9a;-webkit-text-stroke:6px #fff">♥</div>`, { x: mh.x + (i - 1) * 90, y: mh.y - 40 - Math.sin(t * 3 + i) * 14 - i * 30, o: q.o, s: q.s * 0.8 });
      }
    }
    return kit;
  }],
  // S12 — "Apa lagi kita nak belajar lepas ni?"
  [67.12, OUTRO, (t) => {
    kitReset();
    mamaSet(t, { chop: 0, cry: 0, smile: 1 });
    const tk = keys(t, [[67.15, 0], [67.55, 1]]);
    const th2 = POSES.thinkR.armR;
    affSet(t, { smile: 1, brow: 0.3 + 0.4 * tk, headRoll: -0.12 * tk, lookX: 0.35 * tk, lookY: 0.4 * tk, headPitch: -0.08 * tk, armR: { reach: mix3([-0.55, 0.3, 0.2], th2.reach, tk), pole: th2.pole, point: tk, wx: th2.wx * tk } });
    const ah = affHead();
    lookCam(ah.clone().add(V(0.9, 0.1, 2.4)), ah.clone().add(V(-0.1, -0.2, 0)), 46);
    const hd = scr(ah.clone().add(V(0, 0.45, 0)));
    qmarks(t, hd, 67.12, OUTRO - 0.05, [[67.2, -260, -100, '#ffcf33', -12], [67.5, 250, -160, '#3fa2ff', 10], [67.8, 300, 60, '#ffcf33', 14]]);
    return kit;
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

// Cover / thumbnail (9:16): Mama smiling with tears, holding up the onion, and
// Affan surprised beside her.
function thumbnail() {
  ov.begin();
  cam.aspect = W / H;
  cam.updateProjectionMatrix();
  const t = 11.0;
  kitReset();
  mamaSet(t, { chop: 0, cry: 1, smile: 1, show: 1, p: { talk: 0 } });
  affSet(t, { talk: 0, wow: 0.9, brow: 0.8, headPitch: -0.05 });
  lookCam(V(1.0, 2.35, 3.3), V(0.35, 2.0, -1.2), 48);
  renderer.setViewport(0, 0, W, H);
  renderer.render(kit.scene, cam);
  const g = ov.g;
  const top = g.createLinearGradient(0, 0, 0, 720);
  top.addColorStop(0, 'rgba(40,30,60,0.55)');
  top.addColorStop(1, 'rgba(40,30,60,0)');
  g.fillStyle = top;
  g.fillRect(0, 0, W, 720);
  const bot = g.createLinearGradient(0, H - 900, 0, H);
  bot.addColorStop(0, 'rgba(40,30,30,0)');
  bot.addColorStop(1, 'rgba(40,30,30,0.6)');
  g.fillStyle = bot;
  g.fillRect(0, H - 900, W, 900);
  ov.vignette(0.3);
  ov.tag('thBadge', 'EPISOD 38', { x: W / 2, y: 300 }, { bg: '#2f7bff', small: true });
  ov.bubble('thTitle', 'BAWANG BUAT', { x: W / 2, y: 445, r: -3 }, { size: 120 });
  ov.bubble('thTitle2', 'MENANGIS?!', { x: W / 2, y: 590, r: 2 }, { size: 150, top: '#d6f0ff', bot: '#2f8fff' });
  ov.html('thQ', ICONS.qmark('#ffcf33'), { x: 930, y: 790, r: 14, s: 0.9 });
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
