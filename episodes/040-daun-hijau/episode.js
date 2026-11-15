// THE CURIOUS AFFAN — Episode 040: "Kenapa Daun Berwarna Hijau?"
// Every shot is a pure function of time t (seconds), synced to audio/narration.mp3.
import * as THREE from 'three';
import { makeRenderer, loadEnvelope, toScreen, clamp, lerp, inv, easeOut, easeIn, easeInOut, keys, rng, W, H } from '../../shared/core.js';
import { POSES, blinkAt } from '../../shared/affan.js';
import { Overlay, pop, ICONS, drawLogo } from '../../shared/overlay.js';
import { CAPTIONS, KEYWORDS } from './captions.js';
import {
  buildPark, buildLab, buildInside, buildFactory, buildOutro, PLAY_SCALE, COLORS, LAB_SUN, PRISM, SCREEN_X,
  HERO_TREE, A_PK, CELLS, IN_SUN, AFF_IN, SKIN_Y, HERO_ATTACH, F_SUN, AFF_F, LEAF_S, STEM_TOP,
} from './worlds.js';

const FPS = 30;
const DURATION = 77.5;
const OUTRO = 74.35;

const stage = document.getElementById('stage');
const canvas = document.createElement('canvas');
stage.appendChild(canvas);
const renderer = makeRenderer(canvas);
const ov = new Overlay(stage);
const park = buildPark();
const lab = buildLab();
const inside = buildInside();
const fac = buildFactory();
const outro = buildOutro();
const cam = new THREE.PerspectiveCamera(50, W / H, 0.02, 6000);
let env = { at: () => 0 };

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const talk = (t) => clamp(env.at(t) * 1.2);
const scr = (p) => toScreen(p, cam);
const mix3 = (a, b, k) => a.map((v, i) => lerp(v, b[i], k));
const BLUE = '#2f9bff', ORANGE = '#ff8a3d', PURPLE = '#7a5cf0', GREEN = '#2fbf5f', PINK = '#ff5c9a', YELLOW = '#e0b400';
const CNAMES = ['MERAH', 'OREN', 'KUNING', 'HIJAU', 'BIRU', 'UNGU'];
const CHEX = ['#ff4a4a', '#ff8a1a', '#d8a800', '#2fbf4a', '#2f7bff', '#8a4aff'];

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
const _up = V(0, 1, 0), _d = V();
function rod(m, from, to, r, op = 0.95) {
  _d.subVectors(to, from);
  const len = _d.length();
  if (len < 1e-4) {
    m.visible = false;
    return;
  }
  m.position.copy(from);
  m.quaternion.setFromUnitVectors(_up, _d.normalize());
  m.scale.set(r, len, r);
  m.material.opacity = op;
  m.visible = op > 0.01;
}
const grow = (m, from, to, k, r, op = 0.95) => rod(m, from, from.clone().lerp(to, clamp(k)), r, k > 0.001 ? op : 0);

// ===================================================================== park
const GREEN_C = new THREE.Color(0x3fa84a), BLUE_C = new THREE.Color(0x3a8cff), PINK_C = new THREE.Color(0xff8ac8);
const SPR_G = new THREE.Color(0x56c25a), SPR_B = new THREE.Color(0x6ab0ff), SPR_P = new THREE.Color(0xffb0dc);
function treeColor(t) {
  // green -> blue (biru) -> pink (merah jambu) -> green
  const b = keys(t, [[5.75, 0], [6.05, 1], [7.3, 1], [7.55, 0]]);
  const p = keys(t, [[7.4, 0], [7.7, 1], [8.45, 1], [8.75, 0]]);
  park.clumpMat.color.copy(GREEN_C).lerp(BLUE_C, b).lerp(PINK_C, p);
  park.sprinkle.material.color.copy(SPR_G).lerp(SPR_B, b).lerp(SPR_P, p);
}
function parkAff(t, p = {}, pos = A_PK) {
  const a = park.aff;
  a.root.position.copy(pos);
  a.pose({ yaw: 0, blink: blinkAt(t, 1), talk: talk(t), smile: 0.9, ...p });
  a.root.updateMatrixWorld(true);
}
// put the held leaf in Affan's right hand
function holdLeaf(show = true, tiltZ = -0.35, yaw = 0.2) {
  const L = park.held;
  L.visible = show;
  if (!show) return;
  L.position.copy(park.aff.parts.arms.R.hand.getWorldPosition(V()));
  L.rotation.set(0, yaw, tiltZ);
  L.updateMatrixWorld(true);
}
const HOLD = { reach: [-0.62, 0.8, 0.5], pole: [-1, -0.6, -0.2], wx: -0.3 };
const affHead = () => park.aff.parts.head.getWorldPosition(V());
function fallers(t, a) {
  park.fallers.forEach((f, i) => {
    const u = t - a - i * 0.9;
    f.visible = u > 0 && u < 6;
    if (!f.visible) return;
    f.position.set(HERO_TREE.x + 0.6 + (i % 3) * 0.7 + Math.sin(u * 2 + i) * 0.5, Math.max(0.05, 4.2 - u * 0.75), HERO_TREE.z + 1.2 + (i % 2) * 0.8);
    f.rotation.set(Math.sin(u * 3 + i) * 0.6, u * 1.3 + i, 0.8 * Math.sin(u * 2.4 + i));
  });
}

// ====================================================================== lab
const PRISM_HIT = PRISM.clone().add(V(-0.45, 0.35, 0));
const PRISM_OUT = PRISM.clone().add(V(0.45, -0.1, 0));
const SCREEN_Y = (i) => lerp(5.2, 1.6, i / 5);
function labReset() {
  [lab.white, lab.white2, lab.white3, lab.white4, ...lab.fan, ...lab.inA, ...lab.inB].forEach((m) => (m.visible = false));
  lab.spots.forEach((s) => (s.visible = false));
  lab.prism.visible = false;
  lab.screen.visible = false;
  lab.drop.visible = false;
  lab.aff.root.visible = false;
}

// =========================================================== inside the leaf
const RGB = [0xff3a3a, 0x3ae04a, 0x3a7aff];
const BALLS = (() => {
  const R = rng(400);
  const out = [];
  let i = 0;
  for (let tl = 24.9; tl < 34.0; tl += 0.2, i++) {
    const c = tl < 28.0 ? (i % 2 ? 2 : 0) : [1, 0, 1, 2, 1][i % 5];
    const k = Math.floor(R() * inside.chloros.length);
    out.push({ tl, c, k, ta: tl + 0.85, jx: R() - 0.5, jy: R(), jz: R() });
  }
  return out;
})();
const EATS = inside.chloros.map(() => []);
const NOPES = inside.chloros.map(() => []);
BALLS.forEach((b) => (b.c === 1 ? NOPES : EATS)[b.k].push(b.ta));
const SUN_IN = IN_SUN.clone();
function insideSet(t, { balls = true } = {}) {
  const eye = inside.aff.parts.head.localToWorld(V(0, 0.15, 0.6));
  inside.chloros.forEach((c, i) => {
    const eat = EATS[i].reduce((m, ta) => (t >= ta && t < ta + 0.45 ? Math.max(m, 1 - (t - ta) / 0.45) : m), 0);
    const no = NOPES[i].reduce((m, ta) => (t >= ta && t < ta + 0.6 ? Math.max(m, 1 - (t - ta) / 0.6) : m), 0);
    c.g.position.copy(c.home).add(V(0, 0.04 * Math.sin(t * 2 + i), 0));
    c.g.rotation.set(0, Math.sin((t - 0) * 22) * 0.5 * no, 0.1 * Math.sin(t * 1.5 + i));
    c.body.scale.set(1.25 * (1 + 0.25 * eat), 0.8 * (1 + 0.25 * eat), 0.7);
    c.mouth.visible = eat > 0.2;
    c.mouth.scale.set(1, 1 + eat * 1.2, 0.4);
    c.smile.visible = !c.mouth.visible;
  });
  inside.balls.forEach((b) => (b.g.visible = false));
  if (!balls) return eye;
  BALLS.forEach((b, j) => {
    const m = inside.balls[j];
    if (!m || t < b.tl) return;
    const ch = inside.chloros[b.k].home;
    const col = RGB[b.c];
    m.core.material.color.setHex(col).lerp(new THREE.Color(0xffffff), 0.35);
    m.halo.material.color.setHex(col);
    if (t < b.ta) {
      const u = (t - b.tl) / (b.ta - b.tl);
      m.g.visible = true;
      m.g.position.copy(SUN_IN).lerp(ch, u).add(V(b.jx * 0.6 * Math.sin(u * Math.PI), 0, 0));
      m.g.scale.setScalar(1);
      return;
    }
    if (b.c !== 1) {
      const u = (t - b.ta) / 0.25;
      if (u < 1) {
        m.g.visible = true;
        m.g.position.copy(ch);
        m.g.scale.setScalar(1 - u);
      }
      return;
    }
    // green: bounces away (up and out), later into Affan's eyes
    const toEye = b.ta > 30.75;
    const dur = toEye ? 0.9 : 1.1;
    const u = (t - b.ta) / dur;
    if (u >= 1) return;
    const dest = toEye ? eye : ch.clone().add(V(b.jx * 3, 3.2 + b.jy * 2, 4 + b.jz * 3));
    m.g.visible = true;
    m.g.position.copy(ch).lerp(dest, easeOut(u)).add(V(0, Math.sin(u * Math.PI) * (toEye ? 1.2 : 0.4), 0));
    m.g.scale.setScalar(toEye ? 1 - 0.6 * u : 1);
  });
  return eye;
}
function insideAff(t, p = {}) {
  const a = inside.aff;
  a.root.position.copy(AFF_IN);
  a.pose({ yaw: -0.35, blink: blinkAt(t, 3), talk: talk(t) * 0.6, smile: 0.9, headPitch: 0.25, lookY: -0.3, lookX: -0.3, ...p });
  a.root.updateMatrixWorld(true);
}

// ============================================================ leaf factory
const heroPt = (x, y) => fac.hero.localToWorld(V(x, y, 0.02));
const stomaW = () => fac.stoma.getWorldPosition(V());
const ROOT_TIPS = fac.roots.map((c) => c.getPoint(1));
function facReset(t) {
  fac.heroMat.userData.uAge.value = 0;
  fac.hero.position.copy(HERO_ATTACH);
  fac.hero.rotation.set(0, 0, 1.05);
  fac.hero.visible = true;
  fac.stoma.scale.setScalar(2.4);
  fac.plant.scale.setScalar(1);
  fac.bud.scale.setScalar(0.01);
  [...fac.rays, ...fac.drops, ...fac.airs, ...fac.sugars, ...fac.oxys].forEach((m) => (m.visible = false));
  fac.leaves.forEach((L, i) => (L.rotation.x = 0.05 * Math.sin(t * 1.3 + i)));
  fac.hero.updateMatrixWorld(true);
}
function facAff(t, p = {}) {
  const a = fac.aff;
  a.root.position.copy(AFF_F);
  a.pose({ yaw: -0.55, blink: blinkAt(t, 4), talk: talk(t), smile: 0.9, ...p });
  a.root.updateMatrixWorld(true);
}
function rays(t, a, op = 0.55) {
  const targets = [heroPt(0, 0.4), heroPt(0.1, 0.8), fac.leaves[1].localToWorld(V(0, 0.6, 0)), fac.leaves[3].localToWorld(V(0, 0.6, 0))];
  fac.rays.forEach((m, i) => grow(m, F_SUN, targets[i], easeOut(inv(a + i * 0.12, a + 0.8 + i * 0.12, t)), 0.07, op * (0.8 + 0.2 * Math.sin(t * 5 + i))));
}
// water: from the root tips up the stem into the hero leaf
function water(t, a, b) {
  const leafIn = heroPt(0, 0.45);
  fac.drops.forEach((d, i) => {
    const t0 = a + i * ((b - a - 1.6) / fac.drops.length);
    const u = (t - t0) / 1.6;
    d.visible = u > 0 && u < 1;
    if (!d.visible) return;
    const tip = ROOT_TIPS[i % ROOT_TIPS.length];
    const path = new THREE.CatmullRomCurve3([tip, V(tip.x * 0.4, 0.9, tip.z * 0.4), V(0, 1.6, 0.15), V(0, HERO_ATTACH.y - 0.2, 0.18), leafIn]);
    d.position.copy(path.getPoint(easeInOut(u)));
  });
}
function air(t, a, b) {
  const st = stomaW();
  fac.airs.forEach((m, i) => {
    const t0 = a + i * ((b - a - 1.3) / fac.airs.length);
    const u = (t - t0) / 1.3;
    m.visible = u > 0 && u < 1;
    if (!m.visible) return;
    const from = V(-5.5, 2.2 + (i % 3) * 0.7, 2.5);
    m.position.copy(from).lerp(st, easeIn(u)).add(V(0, Math.sin(u * 7 + i) * 0.15, 0));
    m.scale.setScalar(1 - 0.7 * u);
  });
}
function sugar(t, a, b) {
  const from = heroPt(0, 0.5);
  fac.sugars.forEach((m, i) => {
    const t0 = a + i * ((b - a - 1.4) / fac.sugars.length);
    const u = (t - t0) / 1.4;
    m.visible = u > 0 && u < 1;
    if (!m.visible) return;
    const up = i % 2 === 0;
    const path = new THREE.CatmullRomCurve3([from, V(0, HERO_ATTACH.y, 0.2), up ? V(0, STEM_TOP * fac.plant.scale.y - 0.4, 0.2) : V(0, 1.4, 0.2)]);
    m.position.copy(path.getPoint(easeInOut(u)));
    m.rotation.set(t * 2 + i, t * 3, 0);
    m.scale.setScalar(Math.min(1, u * 5) * 1.2);
  });
}
function oxygen(t, a, b, target) {
  const srcs = [heroPt(0, 0.6), ...fac.leaves.map((L) => L.localToWorld(V(0, 0.6, 0.05)))];
  fac.oxys.forEach((m, i) => {
    const t0 = a + i * ((b - a - 1.8) / fac.oxys.length);
    const u = (t - t0) / 1.8;
    m.visible = u > 0 && u < 1;
    if (!m.visible) return;
    const from = srcs[i % srcs.length];
    const mid = from.clone().lerp(target, 0.5).add(V(0, 1.0, 0.6));
    const path = new THREE.CatmullRomCurve3([from, mid, target]);
    m.position.copy(path.getPoint(u)).add(V(Math.sin(u * 9 + i) * 0.08, 0, 0));
    m.scale.setScalar(Math.min(1, u * 4) * (1 - 0.6 * easeIn(u)));
  });
}
const affHeadF = () => fac.aff.parts.head.getWorldPosition(V());

// ======================================================================= SHOTS
const SHOTS = [
  // S1 — playground, Affan by the big tree with a leaf
  [0, 2.3, (t) => {
    treeColor(t);
    fallers(t, 99);
    parkAff(t, { yaw: 0.2, armR: HOLD, headPitch: 0.1, lookX: -0.2 });
    holdLeaf();
    camMove(t, 0, 2.3, [-1.2, 2.4, 9.8], [-4.0, 2.4, 1.0], [-1.6, 2.2, 8.6], [-3.8, 2.2, 1.2], 50);
    const q = pop(t, 0.4, 2.25);
    ov.tag('ep', 'EPISOD 40', { x: W / 2, y: 268, o: q.o, s: q.s }, { bg: '#2f7bff', small: true });
    return park;
  }],
  // S2 — "Papa! Kenapa semua daun warna hijau?"
  [2.3, 5.28, (t) => {
    treeColor(t);
    fallers(t, 99);
    const up = easeInOut(inv(2.3, 2.9, t));
    parkAff(t, { yaw: 0.15, armR: { ...HOLD, reach: mix3(HOLD.reach, [-0.66, 1.3, 0.5], up) }, headPitch: -0.12 * up, lookY: 0.25 * up, lookX: -0.25, brow: 0.3 });
    holdLeaf(true, -0.25, 0.25);
    const ah = affHead();
    camMove(t, 2.3, 5.28, ah.toArray().map((v, i) => v + [0.5, 0.1, 4.2][i]), ah.clone().add(V(-0.15, 0.1, 0)).toArray(), ah.toArray().map((v, i) => v + [0.4, 0.1, 3.5][i]), ah.clone().add(V(-0.15, 0.15, 0)).toArray(), 46);
    const pp = pop(t, 2.3, 3.1, { from: 2 });
    ov.bubble('papa', 'PAPA!', { x: 800, y: 470, o: pp.o, s: pp.s * 0.8, r: 6 }, { size: 110 });
    bubble('semua', 'SEMUA HIJAU?', t, 3.8, 5.25, 430, 120, { top: '#e0ffd8', bot: '#3fbf4a' });
    return park;
  }],
  // S3 — "Kenapa tak biru... atau merah jambu?" (the tree tries other colours)
  [5.28, 8.68, (t) => {
    treeColor(t);
    fallers(t, 99);
    parkAff(t, { yaw: -0.5, armR: HOLD, headPitch: -0.2, lookY: 0.4, lookX: -0.3, brow: 0.5, wow: keys(t, [[5.8, 0], [6.0, 0.6], [6.6, 0.6], [6.9, 0], [7.5, 0], [7.7, 0.7], [8.3, 0.7], [8.6, 0]]) });
    holdLeaf();
    camMove(t, 5.28, 8.68, [-0.6, 1.7, 10.2], [-3.9, 3.2, 0.8], [-1.0, 1.6, 9.6], [-4.0, 3.3, 0.8], 52);
    bubble('biru', 'BIRU?', t, 5.84, 7.4, 400, 130, { top: '#d6ecff', bot: '#2f8fff' }, -4);
    bubble('pink', 'MERAH JAMBU?', t, 7.5, 8.66, 400, 110, { top: '#ffe0f0', bot: '#ff5ca8' }, 3);
    return park;
  }],
  // S4 — "Jom ikut Affan cari jawapan!" swirl into the light lab
  [8.68, 10.62, (t) => {
    treeColor(99);
    fallers(t, 99);
    const up = keys(t, [[8.7, 0], [8.95, 1], [10.2, 1], [10.5, 0.6]], easeOut);
    parkAff(t, { smile: 1, brow: 0.6, armR: { reach: [lerp(-0.6, -0.55, up), lerp(0.25, 1.95 + 0.06 * Math.sin(t * 14), up), lerp(0.2, 0.35, up)], pole: [-1, -0.3, -0.5] } });
    holdLeaf(false);
    const ah = affHead();
    const k = easeIn(inv(9.1, 10.62, t));
    lookCam(ah.clone().add(V(0.4, 0.0, lerp(3.8, 1.8, k))), ah.clone().add(V(0, lerp(-0.4, 0.4, k), 0)), 46);
    ov.swirl(t, W / 2, 820, inv(8.9, 10.5, t));
    ov.flash(inv(10.2, 10.62, t) ** 2);
    return park;
  }],
  // S5 — light lab: sunlight looks white, but it has many colours (prism)
  [10.62, 21.74, (t) => {
    labReset();
    lab.sun.position.copy(LAB_SUN);
    lab.screen.visible = true;
    const onScreen = V(SCREEN_X - 0.1, 3.6, 0);
    const pin = easeOut(inv(12.82, 13.7, t));
    lab.prism.visible = t > 12.8;
    lab.prism.position.copy(PRISM).add(V(0, (1 - pin) * 6, 0));
    if (pin < 0.98) {
      grow(lab.white, LAB_SUN, onScreen, inv(10.7, 11.5, t), 0.16);
      const sp = lab.spots[0];
      sp.visible = t > 11.5;
      sp.position.copy(onScreen).add(V(-0.15, 0, 0.1));
      sp.material.color.setHex(0xffffff);
      sp.material.opacity = 0.9 * inv(11.5, 11.8, t) * (1 - pin);
      sp.scale.setScalar(1.8);
    } else {
      grow(lab.white, LAB_SUN, PRISM_HIT, 1, 0.16);
      const T6 = [16.98, 17.96, 18.76, 19.64, 20.32, 21.0];
      lab.fan.forEach((m, i) => {
        const to = V(SCREEN_X - 0.1, SCREEN_Y(i), 0);
        const hi = t > T6[i] - 0.05 && t < (T6[i + 1] ?? 21.7) - 0.05;
        grow(m, PRISM_OUT, to, inv(13.9, 14.9, t), hi ? 0.13 : 0.09, 0.9);
        const s = lab.spots[i];
        s.visible = t > 14.8;
        s.position.copy(to).add(V(-0.15, 0, 0.1));
        s.material.color.setHex(COLORS[i]);
        s.material.opacity = 0.9 * inv(14.8, 15.1, t);
        s.scale.setScalar(1.1 + 0.6 * Math.max(0, 1 - Math.abs(t - T6[i] - 0.3) / 0.6));
      });
    }
    camMove(t, 10.62, 21.74, [-0.2, 6.0, 18.0], [0.0, 5.6, 0], [0.2, 5.6, 16.5], [0.1, 5.3, 0], 50);
    ov.flash(1 - inv(10.62, 10.95, t));
    bubble('putih', 'CAHAYA PUTIH?', t, 11.56, 12.8, 420, 120, { top: '#ffffff', bot: '#d8e0f0' });
    bubble('banyak', 'BANYAK WARNA!', t, 13.96, 15.6, 420, 116, { top: '#ffe0f0', bot: '#ff5c9a' });
    bubble('pelangi', 'MACAM PELANGI!', t, 15.66, 16.9, 420, 112, { top: '#fff6d0', bot: '#ffb21f' }, 3);
    [16.98, 17.96, 18.76, 19.64, 20.32, 21.0].forEach((a, i) => {
      const q = pop(t, a, 21.7, { from: 2 });
      if (q.o > 0) ov.tag('cn' + i, CNAMES[i], { x: 250 + (i % 2) * 300, y: 1080 + Math.floor(i / 2) * 95, o: q.o, s: q.s * 0.95 }, { bg: CHEX[i], small: true });
    });
    return lab;
  }],
  // S6 — inside the leaf: chlorophyll eats red and blue light, green bounces out into our eyes
  [21.74, 36.62, (t) => {
    insideAff(t, t > 33.5 ? { wow: keys(t, [[33.6, 0], [33.9, 0.8], [34.8, 0.8], [35.1, 0]]), headPitch: 0.15, lookX: -0.4 } : {});
    const eye = insideSet(t);
    if (t < 25.2) camMove(t, 21.74, 25.2, [0.0, 3.4, 14.5], [0.0, 3.0, 0], [-0.3, 2.8, 10.0], [-0.3, 2.5, 0], 50);
    else if (t < 30.8) camMove(t, 25.2, 30.8, [-0.3, 2.8, 10.0], [-0.3, 2.5, 0], [-0.2, 3.6, 10.5], [-0.2, 3.4, 0], 50);
    else camMove(t, 30.8, 36.62, [-0.2, 3.6, 10.5], [-0.2, 3.4, 0], [1.0, 4.6, 8.0], [1.2, 4.4, 0], 50);
    ov.flash(1 - inv(21.74, 22.1, t));
    topTag('dalam', 'DALAM DAUN', t, 21.74, 24.0, GREEN);
    const ch = inside.chloros[1].g.position.clone().add(V(0, 0.25, 0));
    pinTag('kloro', 'KLOROFIL', scr(ch), t, 23.98, 28.0, { bg: GREEN, pointer: 'down' }, -50);
    topTag('makan', 'MAKAN MERAH & BIRU', t, 26.28, 28.1, PURPLE);
    bubble('tak', 'HIJAU TAK DIMAKAN!', t, 29.4, 30.84, 420, 100, { top: '#e0ffd8', bot: '#3fbf4a' });
    topTag('pantul', 'HIJAU DIPANTUL', t, 31.68, 34.7, GREEN);
    pinTag('mata', 'MATA KITA', scr(eye.clone().add(V(0, 0.35, 0))), t, 33.68, 34.75, { bg: BLUE, pointer: 'down' }, -50);
    bubble('nampak', 'DAUN NAMPAK HIJAU!', t, 34.8, 36.6, 420, 104, { top: '#e0ffd8', bot: '#3fbf4a' }, 3);
    return inside;
  }],
  // S7 — the leaf factory: light energy + water from the roots + air through a tiny pore = sugar (photosynthesis)
  [36.62, 51.36, (t) => {
    facReset(t);
    const g = easeOut(inv(47.4, 48.6, t));
    fac.plant.scale.setScalar(1 + 0.18 * g);
    fac.bud.scale.setScalar(0.01 + 1.2 * g);
    rays(t, 36.7);
    water(t, 40.4, 43.4);
    air(t, 42.6, 45.6);
    sugar(t, 45.5, 50.8);
    facAff(t, { yaw: -0.7, headPitch: -0.1, lookY: 0.2, lookX: -0.4 });
    ov.flash(1 - inv(36.62, 36.95, t));
    const st = stomaW();
    if (t < 40.4) camMove(t, 36.62, 40.4, [0.4, 5.4, 16.5], [0.4, 4.8, 0], [-0.2, 4.6, 13.0], [-0.4, 4.0, 0], 50);
    else if (t < 43.4) camMove(t, 40.4, 43.4, [-0.2, 4.6, 13.0], [-0.4, 4.0, 0], [-0.6, 2.8, 11.0], [-0.6, 2.6, 0], 50);
    else if (t < 45.5) camMove(t, 43.4, 45.5, [-0.6, 2.8, 11.0], [-0.6, 2.6, 0], [st.x - 0.2, st.y + 0.2, st.z + 2.6], [st.x - 0.3, st.y, st.z], 46);
    else if (t < 47.4) camMove(t, 45.5, 47.4, [st.x - 0.2, st.y + 0.2, st.z + 2.6], [st.x - 0.3, st.y, st.z], [-0.4, 3.6, 10.5], [-0.4, 3.2, 0], 50);
    else camMove(t, 47.4, 51.36, [-0.4, 3.6, 10.5], [-0.4, 3.2, 0], [0.6, 5.2, 16.0], [0.6, 4.8, 0], 50);
    topTag('tenaga', 'TENAGA CAHAYA', t, 36.62, 38.8, YELLOW);
    topTag('makanan', 'BUAT MAKANAN POKOK', t, 38.82, 40.5, ORANGE);
    pinTag('air', 'AIR', scr(V(0, 2.2, 0.3)), t, 41.16, 43.4, { bg: BLUE, pointer: 'down' }, -40);
    pinTag('akar', 'DARI AKAR', scr(V(0.7, 0.5, 0.6)), t, 41.8, 43.4, { bg: '#8a5a36', pointer: 'down' }, -40);
    topTag('udara', 'UDARA', t, 42.7, 45.5, '#7a8aa8');
    pinTag('liang', 'LIANG KECIL', scr(st.clone().add(V(0, 0.15, 0))), t, 43.56, 45.5, { bg: GREEN, pointer: 'down' }, -60);
    pinTag('gula', 'GULA', scr(heroPt(0, 0.7)), t, 45.9, 47.4, { bg: '#d8a800', pointer: 'down' }, -50);
    topTag('besar', 'POKOK MEMBESAR', t, 47.46, 48.8, GREEN);
    bubble('foto', 'FOTOSINTESIS!', t, 49.7, 51.3, 420, 118, { top: '#e0ffd8', bot: '#2fae4a' });
    ov.sparkles(t, { n: 30, seed: 40, y: 250, h: 900, a: inv(49.8, 50.1, t) * (1 - inv(51.0, 51.36, t)) });
    return fac;
  }],
  // S8 — the leaves give out oxygen, the clean air we breathe
  [51.36, 56.62, (t) => {
    facReset(t);
    fac.plant.scale.setScalar(1.18);
    fac.bud.scale.setScalar(1.21);
    rays(t, 40, 0.4);
    const breathe = keys(t, [[54.0, 0], [54.6, 1], [55.6, 1], [56.1, 0.2]]);
    facAff(t, { yaw: -0.5, lean: -0.12 * breathe, headPitch: -0.15 * breathe, smile: 1, blink: breathe > 0.5 ? 0.9 : blinkAt(t, 4) });
    const nose = fac.aff.parts.head.localToWorld(V(0, -0.1, 0.65));
    oxygen(t, 51.6, 55.8, nose);
    const ah = affHeadF();
    camMove(t, 51.36, 56.62, [0.9, 4.8, 12.5], [1.2, 4.0, 0], [ah.x - 1.0, ah.y + 0.6, ah.z + 6.4], [ah.x - 0.9, ah.y + 0.2, ah.z], 50);
    pinTag('oks', 'OKSIGEN', scr(fac.leaves[1].localToWorld(V(0, 0.9, 0.1))), t, 53.18, 56.5, { bg: '#2fa8d8', pointer: 'down' }, -50);
    bubble('bersih', 'UDARA BERSIH!', t, 54.16, 56.55, 420, 116, { top: '#e0f6ff', bot: '#2fa8d8' });
    return fac;
  }],
  // S9 — an old leaf: chlorophyll fades, the hidden yellow shows, and it falls
  [56.62, 65.08, (t) => {
    facReset(t);
    fac.plant.scale.setScalar(1.18);
    fac.bud.scale.setScalar(1.21);
    fac.heroMat.userData.uAge.value = easeInOut(inv(58.78, 62.6, t));
    const f = inv(63.24, 65.0, t);
    if (f > 0) {
      fac.hero.position.copy(HERO_ATTACH).add(V(-0.8 * f + 0.4 * Math.sin(f * 7), -(HERO_ATTACH.y - 0.4) * easeIn(f), 0.6 * f));
      fac.hero.rotation.set(0.4 * Math.sin(f * 6), 0.3 * f, 1.05 + 0.7 * Math.sin(f * 5) - 0.5 * f);
    }
    facAff(t, { yaw: -0.75, headPitch: 0.1 + 0.25 * f, lookY: -0.2 - 0.3 * f, lookX: -0.4, brow: 0.3, wow: keys(t, [[63.4, 0], [63.7, 0.7], [64.6, 0.7], [64.9, 0]]) });
    const leafC = heroPt(0, 0.6);
    if (t < 63.0) camMove(t, 56.62, 63.0, [-1.8, 4.6, 8.5], [-1.4, 4.2, 0], [-1.6, 4.4, 6.8], [-1.4, 4.1, 0], 48);
    else camMove(t, 63.0, 65.08, [-1.6, 4.4, 6.8], [-1.4, 4.1, 0], [-0.6, 2.8, 10.0], [-0.8, 2.0, 0], 50);
    topTag('tua', 'DAUN TUA', t, 57.26, 58.7, '#8a5a36');
    pinTag('hilang', 'KLOROFIL HILANG', scr(leafC.clone().add(V(0, 0.6, 0))), t, 58.78, 60.4, { bg: GREEN, pointer: 'down' }, -50);
    pinTag('kuning', 'KUNING TERSOROK!', scr(leafC.clone().add(V(0, 0.6, 0))), t, 60.44, 62.9, { bg: YELLOW, pointer: 'down' }, -50);
    bubble('gugur', 'GUGUR!', t, 63.9, 65.05, 420, 140, { top: '#fff0c8', bot: '#ff9a2a' }, 3);
    return fac;
  }],
  // S10 — "Waaah, rupanya daun hijau sebab klorofil! Terima kasih, pokok, sebab bagi kita udara."
  [65.08, 72.06, (t) => {
    treeColor(99);
    fallers(t, 65.0);
    const wave = t > 68.8 && t < 71.6;
    parkAff(t, {
      yaw: wave ? -0.45 : 0.1,
      wow: keys(t, [[65.1, 0], [65.25, 0.9], [65.9, 0.9], [66.2, 0]]), smile: 1, brow: 0.5,
      armR: wave ? POSES.waveR(t).armR : HOLD,
      headPitch: wave ? -0.2 : 0, lookY: wave ? 0.3 : 0, lookX: wave ? -0.3 : 0,
    });
    holdLeaf(!wave);
    const ah = affHead();
    if (t < 68.7) lookCam(ah.clone().add(V(0.45, 0.0, 3.9)), ah.clone().add(V(-0.1, -0.4, 0)), 48);
    else camMove(t, 68.7, 72.06, [-1.2, 2.4, 9.8], [-4.0, 2.5, 1.0], [-1.6, 2.2, 8.8], [-3.9, 2.6, 1.0], 50);
    ov.flash((1 - inv(65.08, 65.4, t)) * 0.9, '255,250,235');
    const hd = scr(affHead().add(V(0, 0.5, 0)));
    const b = pop(t, 65.1, 68.6);
    if (t < 68.7) ov.html('bulb', ICONS.bulb(), { x: clamp(hd.x + 200, 150, 900), y: clamp(hd.y - 160, 300, 900) + Math.sin(t * 5) * 8, o: b.o, s: b.s * 0.6, r: 10 });
    ov.sparkles(t, { n: 30, seed: 12, y: 250, h: 900, a: inv(65.2, 65.5, t) * (1 - inv(67.6, 68.2, t)) });
    bubble('sebab', 'SEBAB KLOROFIL!', t, 66.46, 68.7, 440, 112, { top: '#e0ffd8', bot: '#2fae4a' });
    bubble('terima', 'TERIMA KASIH,\nPOKOK!', t, 68.86, 72.0, 440, 104, { top: '#fff6d0', bot: '#ffb21f' }, 3);
    return park;
  }],
  // S11 — "Apa lagi kita nak belajar lepas ni?"
  [72.06, OUTRO, (t) => {
    treeColor(99);
    fallers(t, 65.0);
    const tk = keys(t, [[72.1, 0], [72.5, 1]]);
    const th2 = POSES.thinkR.armR;
    parkAff(t, { smile: 1, brow: 0.3 + 0.4 * tk, headRoll: -0.12 * tk, lookX: 0.35 * tk, lookY: 0.4 * tk, headPitch: -0.08 * tk, armR: { reach: mix3(HOLD.reach, th2.reach, tk), pole: th2.pole, point: tk, wx: th2.wx * tk } });
    holdLeaf(false);
    const ah = affHead();
    lookCam(ah.clone().add(V(0.4, 0.0, 3.7)), ah.clone().add(V(0, -0.5, 0)), 46);
    const hd = scr(ah.clone().add(V(0, 0.45, 0)));
    qmarks(t, hd, 72.06, OUTRO - 0.05, [[72.1, -260, -100, '#ffcf33', -12], [72.4, 250, -160, '#3fa2ff', 10], [72.7, 300, 60, '#ffcf33', 14]]);
    return park;
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

// Cover / thumbnail (9:16): Affan holds up a leaf under a tree that's half pink.
function thumbnail() {
  ov.begin();
  cam.aspect = W / H;
  cam.updateProjectionMatrix();
  const t = 3.6;
  treeColor(99);
  fallers(t, 99);
  parkAff(t, { yaw: 0.15, armR: { ...HOLD, reach: [-0.66, 1.3, 0.5] }, headPitch: -0.1, lookY: 0.25, lookX: -0.25, brow: 0.5, wow: 0.6 });
  holdLeaf(true, -0.25, 0.25);
  const ah = affHead();
  lookCam(ah.clone().add(V(0.3, -0.2, 4.6)), ah.clone().add(V(-0.2, 0.15, 0)), 50);
  park.sky.position.copy(cam.position);
  renderer.setViewport(0, 0, W, H);
  renderer.render(park.scene, cam);
  const g = ov.g;
  const top = g.createLinearGradient(0, 0, 0, 720);
  top.addColorStop(0, 'rgba(10,40,20,0.5)');
  top.addColorStop(1, 'rgba(10,40,20,0)');
  g.fillStyle = top;
  g.fillRect(0, 0, W, 720);
  const bot = g.createLinearGradient(0, H - 900, 0, H);
  bot.addColorStop(0, 'rgba(10,30,20,0)');
  bot.addColorStop(1, 'rgba(10,30,20,0.55)');
  g.fillStyle = bot;
  g.fillRect(0, H - 900, W, 900);
  ov.vignette(0.3);
  ov.tag('thBadge', 'EPISOD 40', { x: W / 2, y: 300 }, { bg: '#2f7bff', small: true });
  ov.bubble('thTitle', 'KENAPA DAUN', { x: W / 2, y: 445, r: -3 }, { size: 116 });
  ov.bubble('thTitle2', 'HIJAU?!', { x: W / 2, y: 595, r: 2 }, { size: 170, top: '#e0ffd0', bot: '#2fae4a' });
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
