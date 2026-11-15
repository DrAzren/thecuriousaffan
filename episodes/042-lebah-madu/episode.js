// THE CURIOUS AFFAN — Episode 042: "Macam Mana Lebah Buat Madu?"
// Every shot is a pure function of time t (seconds), synced to audio/narration.mp3.
import * as THREE from 'three';
import { makeRenderer, loadEnvelope, toScreen, clamp, lerp, inv, easeOut, easeIn, easeInOut, keys, rng, W, H } from '../../shared/core.js';
import { POSES, blinkAt } from '../../shared/affan.js';
import { Overlay, pop, ICONS, drawLogo } from '../../shared/overlay.js';
import { CAPTIONS, KEYWORDS } from './captions.js';
import { buildPark, buildFlowerWorld, buildHive, buildSpoon, buildOutro, PLAY_SCALE, BENCH, A_BENCH_YAW, FLOWERS_AT, HIVE_TREE, BIG_FLOWERS, hexPos, HEX_COLS, HEX_ROWS, SPOON } from './worlds.js';

const FPS = 30;
const DURATION = 81.0;
const OUTRO = 77.85;

const stage = document.getElementById('stage');
const canvas = document.createElement('canvas');
stage.appendChild(canvas);
const renderer = makeRenderer(canvas);
const ov = new Overlay(stage);
const park = buildPark();
const fw = buildFlowerWorld();
const hive = buildHive();
const sp = buildSpoon();
const outro = buildOutro();
const cam = new THREE.PerspectiveCamera(50, W / H, 0.02, 6000);
let env = { at: () => 0 };

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const talk = (t) => clamp(env.at(t) * 1.2);
const scr = (p) => toScreen(p, cam);
const mix3 = (a, b, k) => a.map((v, i) => lerp(v, b[i], k));
const BLUE = '#2f9bff', ORANGE = '#ff8a3d', PURPLE = '#7a5cf0', GREEN = '#2fbf5f', PINK = '#ff5c9a', YELLOW = '#e0b400', HONEY = '#e8920a';

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
const HEXSVG = (c = '#ffd84a') => `<svg width="220" height="200" viewBox="0 0 220 200"><polygon points="55,8 165,8 214,100 165,192 55,192 6,100" fill="none" stroke="#fff" stroke-width="18" stroke-linejoin="round"/><polygon points="55,8 165,8 214,100 165,192 55,192 6,100" fill="none" stroke="${c}" stroke-width="10" stroke-linejoin="round"/></svg>`;
// a bee hovering at p, facing a point, with buzzing wings
function beeAt(b, t, p, look, { wings = 1, bob = 0.04, seed = 0 } = {}) {
  b.root.visible = true;
  b.root.position.copy(p).add(V(0, bob * Math.sin(t * 7 + seed), 0));
  b.root.lookAt(look);
  b.setWings(t * 60 + seed, 0.7 * wings);
  b.root.updateMatrixWorld(true);
}
const beeMouth = (b) => b.head.localToWorld(V(0, -0.08, 0.16));

// ===================================================================== park
const BENCH_SEAT = BENCH.clone().add(V(0.1, 0.62 - 0.24, 0.05));
const FWD = V(Math.sin(A_BENCH_YAW), 0, Math.cos(A_BENCH_YAW));
const RIGHT = V(-Math.cos(A_BENCH_YAW), 0, Math.sin(A_BENCH_YAW)); // Affan's right hand side
const EAT = { reach: [-0.2, 1.05, 0.62], pole: [-1, -0.6, -0.2], wx: -0.5 };
const REST = { reach: [-0.55, 0.38, 0.32], pole: [-1, -0.6, -0.3] };
function benchAff(t, p = {}) {
  const a = park.aff;
  a.root.position.copy(BENCH_SEAT).add(V(0, -0.98 * PLAY_SCALE + 0.24, 0));
  a.pose({ ...POSES.seated, yaw: A_BENCH_YAW, blink: blinkAt(t, 1), talk: talk(t), smile: 1, armL: { reach: [0.55, 0.35, 0.3] }, armR: REST, ...p });
  a.root.updateMatrixWorld(true);
}
const affHead = () => park.aff.parts.head.getWorldPosition(V());
const affFront = (d, side = 0.4) => affHead().addScaledVector(FWD, d).addScaledVector(RIGHT, -side).add(V(0, 0.05, 0));
function parkProps(t, { bread = true } = {}) {
  park.jar.position.copy(BENCH).addScaledVector(RIGHT, -0.85).add(V(0, 0.66, 0)).addScaledVector(FWD, 0.05);
  park.bread.visible = bread;
  if (bread) {
    park.bread.position.copy(park.aff.parts.arms.R.hand.getWorldPosition(V())).add(V(0, 0.05, 0)).addScaledVector(FWD, 0.04);
    park.bread.rotation.set(0.3, A_BENCH_YAW, 0.1);
  }
  park.drip.scale.set(1, 1.6 + 0.6 * Math.sin(t * 2), 1);
  park.flowers.forEach((f, i) => (f.head.rotation.z = 0.05 * Math.sin(t * 1.3 + i)));
  // little bees around the far hive
  park.hiveBees.forEach((b, i) => {
    const c = park.hive.position.clone().add(V(0, -0.4, 0.6));
    const a = t * (1.4 + i * 0.2) + i;
    beeAt(b, t, c.clone().add(V(Math.cos(a) * (0.9 + i * 0.12), Math.sin(a * 1.3) * 0.4, Math.sin(a) * 0.6)), c, { seed: i });
  });
}
const flowerHead = (i) => park.flowers[i].head.getWorldPosition(V());
// the park bee: flies in, hovers by the bread, then sits on a flower
function parkBee(t) {
  const b = park.bee;
  const f = flowerHead(2);
  const near = affHead().addScaledVector(FWD, 0.7).addScaledVector(RIGHT, 0.45).add(V(0, -0.15, 0));
  const start = near.clone().addScaledVector(RIGHT, 3).add(V(0, 1.2, 0));
  let p, look;
  if (t < 4.7) {
    b.root.visible = false;
    return;
  } else if (t < 6.4) {
    const u = easeOut(inv(4.7, 6.0, t));
    p = start.clone().lerp(near, u).add(V(0, 0.15 * Math.sin(t * 5), 0));
    look = affHead();
  } else {
    const u = easeInOut(inv(6.4, 7.4, t));
    p = near.clone().lerp(f.clone().add(V(0, 0.12, 0)).addScaledVector(FWD, 0.1), u);
    look = u < 0.99 ? f : f.clone().add(FWD);
  }
  beeAt(b, t, p, look);
}

// ============================================================ flower world
const FC = (i) => fw.flowers[i].head.getWorldPosition(V());
function fwReset(t) {
  fw.flowers.forEach((f, i) => {
    f.head.rotation.z = 0.04 * Math.sin(t * 1.1 + i);
    f.nectar.material.opacity = 0.75 + 0.2 * Math.sin(t * 3 + i);
  });
  fw.drops.forEach((d) => (d.visible = false));
  fw.bee.setTongue(0);
  fw.bee.setTummy(0, 0);
}
// hover spot in front of / above a flower, for sipping
const SIP = (i) => FC(i).add(V(1.75, 1.0, 0.45));
function sipDrops(t, a, b) {
  const mouth = beeMouth(fw.bee);
  const src = FC(0).add(V(0, 0.1, 0.35));
  fw.drops.forEach((d, i) => {
    const u = ((t - a) * 0.9 + i / fw.drops.length) % 1;
    d.visible = t > a && t < b;
    if (!d.visible) return;
    d.position.copy(src).lerp(mouth, u);
    d.scale.setScalar(1 - 0.5 * u);
  });
}

// ===================================================================== hive
const CENTER_CELLS = hive.cells.filter((c) => c.c >= 2 && c.c <= 6 && c.r >= 3 && c.r <= 8);
const CLEAR = new THREE.Color(0x8fd4ff), GOLD = new THREE.Color(0xf2a31a);
function hiveReset(t) {
  hive.cells.forEach((c) => {
    c.fill.visible = false;
    c.cap.visible = false;
  });
  hive.bees.forEach((b) => (b.root.visible = false));
  hive.drop.visible = false;
  hive.vapor.forEach((s) => (s.visible = false));
  hive.sparks.forEach((s) => (s.visible = false));
}
// fill: 0..1 level; gold: 0..1 colour; caps: 0..1 progress
function hiveCells(t, { fill = 0, gold = 0, caps = 0 } = {}) {
  CENTER_CELLS.forEach((c, i) => {
    const lv = clamp(fill * 1.25 - (i % 5) * 0.05);
    c.fill.visible = lv > 0.01;
    c.fill.scale.set(1, 1, Math.max(0.001, lv * 0.85));
    c.fillMat.color.copy(CLEAR).lerp(GOLD, gold);
    c.fillMat.opacity = lerp(0.6, 0.95, gold);
    c.fillMat.emissive.setHex(0x000000).lerp(new THREE.Color(0x6a3000), gold);
    c.fill.position.z = -0.44 + 0.03 * Math.sin(t * 4 + i) * (1 - gold) * lv;
    c.cap.visible = caps * CENTER_CELLS.length > i + 0.5;
  });
}
// crawling background bees on the wall
function wallBees(t, from = 2, n = 6) {
  for (let i = from; i < from + n; i++) {
    const b = hive.bees[i];
    const a = t * 0.25 + i * 1.7;
    const p = V(Math.sin(a) * 3.0, 4.5 + Math.cos(a * 0.8 + i) * 3.8, 0.75);
    beeAt(b, t, p, p.clone().add(V(Math.cos(a), -Math.sin(a * 0.8 + i), 0.3)), { wings: 0.1, bob: 0.01, seed: i });
  }
}

// ==================================================================== spoon
const SPOON_C = SPOON.clone();
function spoonSet(t, level) {
  sp.honey.visible = false;
  const L = clamp(level);
  const depth = 0.45 * (1 - L);
  const rad = Math.sqrt(Math.max(0, 1 - (1 - L) * (1 - L)));
  sp.honeyTop.visible = L > 0.01;
  sp.honeyTop.position.set(0, -depth + 0.005, 0);
  sp.honeyTop.scale.set(0.97 * rad, 1.3 * rad, 1);
  sp.bees.forEach((b) => (b.root.visible = false));
  sp.drops.forEach((d) => (d.visible = false));
}
const RING = (i) => {
  const a = Math.PI * (0.15 + 0.7 * (i / 11));
  return V(Math.cos(a) * 2.6, 2.4 + 0.5 * Math.sin(i * 1.3), Math.sin(a) * 1.4 - 0.4).add(V(0, 0, 0));
};

// ======================================================================= SHOTS
const SHOTS = [
  // S1 — playground: Affan on the bench with bread and honey
  [0, 2.26, (t) => {
    benchAff(t, { armR: EAT, talk: 0, smile: 1, lookY: -0.2 });
    parkProps(t);
    parkBee(t);
    const ah = affHead();
    camMove(t, 0, 2.26, ah.clone().addScaledVector(FWD, 5.4).addScaledVector(RIGHT, 0.8).add(V(0, 0.4, 0)).toArray(), ah.clone().add(V(0, -0.5, 0)).toArray(), ah.clone().addScaledVector(FWD, 4.6).addScaledVector(RIGHT, 0.6).add(V(0, 0.3, 0)).toArray(), ah.clone().add(V(0, -0.45, 0)).toArray(), 50);
    const q = pop(t, 0.4, 2.2);
    ov.tag('ep', 'EPISOD 42', { x: W / 2, y: 268, o: q.o, s: q.s }, { bg: '#2f7bff', small: true });
    return park;
  }],
  // S2 — "Papa! Madu ni sedap..."
  [2.26, 4.7, (t) => {
    const bite = keys(t, [[2.4, 0], [2.7, 1], [3.0, 0.6]]);
    benchAff(t, { armR: { ...EAT, reach: mix3([-0.3, 0.85, 0.6], EAT.reach, bite) }, smile: 1, brow: 0.4 });
    parkProps(t);
    parkBee(t);
    lookCam(affFront(3.4, 0.3), affHead().add(V(0, -0.4, 0)), 46);
    const pp = pop(t, 2.26, 3.0, { from: 2 });
    ov.bubble('papa', 'PAPA!', { x: 800, y: 470, o: pp.o, s: pp.s * 0.8, r: 6 }, { size: 110 });
    bubble('sedap', 'SEDAPNYA MADU!', t, 3.12, 4.65, 430, 110, { top: '#fff2c8', bot: '#ffb31f' });
    pinTag('madu', 'MADU', scr(park.bread.position.clone().add(V(0, 0.12, 0))), t, 3.2, 4.65, { bg: HONEY, pointer: 'down' }, -40);
    return park;
  }],
  // S3 — "Tapi betul ke madu dibuat oleh lebah?" a bee buzzes in
  [4.7, 7.68, (t) => {
    const k = easeInOut(inv(5.0, 5.8, t));
    benchAff(t, { armR: { ...EAT, reach: mix3(EAT.reach, [-0.4, 0.85, 0.65], k) }, smile: 0.7, brow: 0.5, wow: keys(t, [[5.0, 0], [5.3, 0.8], [6.2, 0.8], [6.6, 0]]), headYaw: -0.35 * k, lookX: -0.6 * k });
    parkProps(t);
    parkBee(t);
    lookCam(affFront(3.6, 0.0).addScaledVector(RIGHT, 0.5), affHead().add(V(0, -0.45, 0)).addScaledVector(RIGHT, 0.5), 48);
    pinTag('lebah', 'LEBAH!', scr(park.bee.root.position.clone().add(V(0, 0.15, 0))), t, 6.76, 7.65, { bg: YELLOW, pointer: 'down' }, -40);
    bubble('betul', 'BETUL KE?', t, 4.7, 6.7, 430, 130, { top: '#fff6d0', bot: '#ffb21f' });
    return park;
  }],
  // S4 — "Macam mana lebah buat madu?"
  [7.68, 9.56, (t) => {
    benchAff(t, { ...POSES.thinkR, brow: -0.3, smile: 0.5 });
    parkProps(t, { bread: false });
    parkBee(t);
    const ah = affHead();
    lookCam(affFront(3.4, 0.4), ah.clone().add(V(0, -0.35, 0)), 46);
    const hd = scr(ah.clone().add(V(0, 0.45, 0)));
    qmarks(t, hd, 7.68, 9.5, [[7.75, -260, 120, '#ffcf33', -12], [8.0, 250, 80, '#3fa2ff', 10], [8.3, 280, 260, '#ffcf33', 14]]);
    bubble('macam', 'MACAM MANA?', t, 7.68, 9.5, 430, 120, { top: '#fff6d0', bot: '#ffb21f' });
    return park;
  }],
  // S5 — "Jom ikut Affan cari jawapan!" swirl into a flower
  [9.56, 11.6, (t) => {
    const up = keys(t, [[9.58, 0], [9.8, 1], [11.1, 1], [11.4, 0.6]], easeOut);
    benchAff(t, { smile: 1, brow: 0.6, armR: { reach: [lerp(-0.6, -0.55, up), lerp(0.25, 1.95 + 0.06 * Math.sin(t * 14), up), lerp(0.2, 0.35, up)], pole: [-1, -0.3, -0.5] } });
    parkProps(t, { bread: false });
    parkBee(t);
    const f = flowerHead(2);
    const k = easeIn(inv(10.0, 11.6, t));
    lookCam(affFront(3.4, 0.4).lerp(f.clone().addScaledVector(FWD, 0.4).add(V(0, 0.05, 0)), k), affHead().add(V(0, -0.35, 0)).lerp(f, k), 46);
    ov.swirl(t, W / 2, 820, inv(9.8, 11.5, t));
    ov.flash(inv(11.15, 11.6, t) ** 2);
    return park;
  }],
  // S6 — giant flowers: the bee flies flower to flower, sips nectar with a straw-like tongue
  [11.6, 20.58, (t) => {
    fwReset(t);
    const b = fw.bee;
    const p1 = V(-7, 6.5, 2.0), p2 = SIP(1), p3 = SIP(0);
    let p, look;
    if (t < 13.4) {
      const u = easeInOut(inv(11.6, 13.4, t));
      p = p1.clone().lerp(p2, u).add(V(0, Math.sin(u * Math.PI) * 1.0, 0));
      look = FC(1).add(V(0, 1.15, 0));
    } else {
      const u = easeInOut(inv(13.4, 14.3, t));
      p = p2.clone().lerp(p3, u).add(V(0, Math.sin(u * Math.PI) * 0.8, 0));
      look = FC(0).add(V(0, 1.15, 0));
    }
    beeAt(b, t, p, look);
    b.setTongue(easeOut(inv(14.4, 15.2, t)));
    sipDrops(t, 16.6, 20.6);
    if (t < 14.3) camMove(t, 11.6, 14.3, [0.2, 5.0, 15.5], [0.0, 4.4, 0], [-0.6, 5.2, 12.5], [-0.8, 4.6, 0], 50);
    else camMove(t, 14.3, 20.58, [-0.6, 5.2, 12.5], [-0.8, 4.6, 0], [-0.3, 5.5, 7.8], [-1.0, 5.0, 0.0], 50);
    ov.flash(1 - inv(11.6, 11.95, t));
    topTag('bunga', 'DARI BUNGA KE BUNGA', t, 12.6, 14.3, PINK);
    pinTag('lidah', 'LIDAH PANJANG', scr(b.tongue.localToWorld(V(0, 0, 0)).add(V(0.3, 0.1, 0))), t, 14.56, 16.5, { bg: '#c0504a', pointer: 'down' }, -40);
    bubble('straw', 'MACAM STRAW!', t, 15.36, 16.55, 420, 116, { top: '#ffe0e0', bot: '#ff7a7a' });
    topTag('manis', 'HISAP AIR MANIS', t, 16.6, 19.0, '#d06aa0');
    bubble('nektar', 'NEKTAR!', t, 19.02, 20.55, 420, 150, { top: '#fffbd0', bot: '#ffd23a' }, 3);
    return fw;
  }],
  // S7 — the nectar goes into a special tummy (the honey stomach); when it's full, back to the hive
  [20.58, 27.02, (t) => {
    fwReset(t);
    const b = fw.bee;
    const go = easeIn(inv(25.3, 26.9, t));
    const p = SIP(0).add(V(9 * go, 4 * go, -2 * go));
    beeAt(b, t, p, go > 0 ? p.clone().add(V(1, 0.4, -0.2)) : FC(0).add(V(0, 1.15, 0)));
    b.setTongue(1 - easeOut(inv(24.2, 24.8, t)));
    const see = inv(20.9, 21.5, t) * (1 - inv(25.6, 26.0, t));
    b.setTummy(easeInOut(inv(21.0, 24.2, t)), see);
    sipDrops(t, 20.58, 24.2);
    const tc = b.tummy.getWorldPosition(V());
    if (t < 25.2) camMove(t, 20.58, 25.2, [tc.x + 0.2, tc.y + 0.8, tc.z + 5.2], [tc.x - 0.5, tc.y, tc.z], [tc.x + 0.1, tc.y + 0.6, tc.z + 4.4], [tc.x - 0.5, tc.y, tc.z], 46);
    else camMove(t, 25.2, 27.02, [SIP(0).x + 0.6, SIP(0).y + 0.6, SIP(0).z + 4.4], SIP(0).add(V(-0.5, 0, 0)).toArray(), [SIP(0).x + 2.0, SIP(0).y + 1.2, SIP(0).z + 8], SIP(0).add(V(3, 1.5, -1)).toArray(), 50);
    pinTag('khas', 'PERUT KHAS', scr(tc.clone().add(V(0, 0.5, 0))), t, 21.64, 22.9, { bg: ORANGE, pointer: 'down' }, -40);
    bubble('perutmadu', 'PERUT MADU!', t, 22.92, 24.15, 420, 130, { top: '#fff2c8', bot: '#ffb31f' });
    topTag('penuh', 'DAH PENUH!', t, 24.2, 25.3, GREEN);
    topTag('balik', 'BALIK KE SARANG', t, 25.34, 27.0, '#8a5a36');
    return fw;
  }],
  // S8 — in the hive: other bees take the nectar, mouth to mouth; special stuff changes it bit by bit
  [27.02, 36.62, (t) => {
    hiveReset(t);
    hiveCells(t, {});
    wallBees(t, 2, 6);
    const A = V(-0.95, 4.4, 1.6), B = V(0.95, 4.4, 1.6);
    beeAt(hive.bees[0], t, A, B.clone().add(V(0, 0.05, 0)), { wings: 0.15, seed: 1 });
    beeAt(hive.bees[1], t, B, A.clone().add(V(0, 0.05, 0)), { wings: 0.15, seed: 2 });
    const ma = beeMouth(hive.bees[0]), mb = beeMouth(hive.bees[1]);
    const d = hive.drop;
    d.visible = t > 27.6;
    const ph = clamp((t - 28.36) / 1.6);
    const swing = t < 28.36 ? 0 : 0.5 - 0.5 * Math.cos(Math.PI * ((t - 28.36) / 1.6));
    d.position.copy(ma).lerp(mb, t < 28.36 ? 0 : swing).add(V(0, 0.02 * Math.sin(t * 6), 0));
    void ph;
    const ch = easeInOut(inv(32.3, 36.0, t));
    d.material.color.copy(CLEAR).lerp(GOLD, ch * 0.6);
    d.material.emissive.setHex(0x000000).lerp(new THREE.Color(0x6a3000), ch * 0.6);
    d.scale.setScalar(1.3);
    if (t > 32.26) {
      hive.sparks.forEach((s, i) => {
        const a = t * 2.5 + (i / hive.sparks.length) * Math.PI * 2;
        s.visible = true;
        s.position.copy(d.position).add(V(Math.cos(a) * 0.35, Math.sin(a * 1.3) * 0.3, Math.sin(a) * 0.35));
        s.scale.setScalar(0.12 + 0.06 * Math.sin(t * 8 + i));
        s.material.opacity = inv(32.26, 32.6, t) * 0.9;
      });
    }
    if (t < 31.0) camMove(t, 27.02, 31.0, [0.2, 5.2, 9.5], [0, 4.6, 0.8], [0.0, 4.9, 6.2], [0, 4.45, 1.4], 50);
    else camMove(t, 31.0, 36.62, [0.0, 4.9, 6.2], [0, 4.45, 1.4], [0.3, 4.8, 4.8], [0, 4.45, 1.5], 46);
    ov.flash(1 - inv(27.02, 27.35, t));
    topTag('sarang', 'DALAM SARANG', t, 27.02, 28.3, '#8a5a36');
    pinTag('sambut', 'LEBAH LAIN SAMBUT', scr(B.clone().add(V(0, 0.8, 0))), t, 28.36, 30.2, { bg: YELLOW, pointer: 'down' }, -30);
    bubble('mulut', 'DARI MULUT\nKE MULUT!', t, 30.22, 32.2, 420, 108, { top: '#ffe0e0', bot: '#ff7a7a' });
    topTag('bahan', 'BAHAN KHAS DALAM BADAN LEBAH', t, 32.26, 34.8, PURPLE);
    bubble('sikit', 'SIKIT DEMI SIKIT', t, 34.88, 36.6, 420, 104, { top: '#efe0ff', bot: '#8a5cff' });
    return hive;
  }],
  // S9 — still too runny: stored in hexagon rooms and fanned dry by many wings until thick: honey!
  [36.62, 49.94, (t) => {
    hiveReset(t);
    const fill = easeInOut(inv(39.4, 41.4, t));
    const gold = easeInOut(inv(46.4, 48.8, t));
    hiveCells(t, { fill, gold });
    wallBees(t, 8, 4);
    // fanning bees in front of the cells
    const fan = inv(42.6, 43.0, t);
    for (let i = 0; i < 8; i++) {
      const c = CENTER_CELLS[(i * 4 + 2) % CENTER_CELLS.length];
      const b = hive.bees[i];
      if (t < 42.6) {
        if (i < 2) {
          // the first bees carry nectar to the cells
          const u = easeInOut(inv(38.9 + i * 0.4, 40.6 + i * 0.4, t));
          const p = V(-5 + i * 10, 6 + i, 3).lerp(c.p.clone().add(V(0, 0.4, 1.4)), u);
          beeAt(b, t, p, c.p.clone().add(V(0, 0, 0)), { seed: i });
        } else b.root.visible = false;
      } else {
        beeAt(b, t, c.p.clone().add(V(0, 0.5, 1.5)), c.p.clone().add(V(0, 0.5, 3)), { wings: 1.2 * fan, seed: i });
        b.root.rotation.x = -0.3;
      }
    }
    // water vapour rising while they fan
    const vap = inv(43.0, 43.6, t) * (1 - inv(46.2, 46.8, t));
    hive.vapor.forEach((s, i) => {
      const c = CENTER_CELLS[(i * 7) % CENTER_CELLS.length];
      const u = ((t * 0.5 + i / hive.vapor.length) % 1);
      s.visible = vap > 0.01;
      s.position.copy(c.p).add(V(Math.sin(i * 2 + t) * 0.2, u * 1.6, 0.6 + u * 1.6));
      s.scale.setScalar(0.3 + u * 0.6);
      s.material.opacity = 0.5 * vap * Math.sin(u * Math.PI);
    });
    if (t < 39.0) camMove(t, 36.62, 39.0, [0.3, 4.8, 4.8], [0, 4.45, 1.5], [0.0, 4.6, 10.5], [0, 4.5, 0], 50);
    else if (t < 42.6) camMove(t, 39.0, 42.6, [0.0, 4.6, 10.5], [0, 4.5, 0], [0.2, 4.8, 8.2], [0, 4.6, 0], 50);
    else camMove(t, 42.6, 49.94, [0.2, 4.8, 8.2], [0, 4.6, 0], [-0.2, 4.4, 9.8], [0, 4.5, 0], 50);
    bubble('cair', 'MASIH CAIR!', t, 36.62, 38.96, 420, 130, { top: '#e0f6ff', bot: '#2fa8d8' });
    topTag('bilik', 'BILIK KECIL', t, 40.2, 41.6, '#8a5a36');
    const hc = CENTER_CELLS[13];
    const hq = pop(t, 41.62, 42.75);
    if (hq.o > 0) {
      const s = scr(hc.p.clone().add(V(0, 0, 0.5)));
      ov.html('hex', HEXSVG(), { x: s.x, y: s.y, o: hq.o, s: hq.s * 0.75 });
      ov.tag('hexT', 'HEKSAGON', { x: clamp(s.x, 300, 780), y: s.y - 140, o: hq.o, s: hq.s }, { bg: YELLOW, pointer: 'down' });
    }
    topTag('kipas', 'KIPAS DENGAN SAYAP', t, 42.8, 44.0, BLUE);
    topTag('ramai', 'BERAMAI-RAMAI!', t, 44.08, 45.2, PINK, 410);
    topTag('kering', 'AIR JADI KERING', t, 45.22, 47.0, ORANGE);
    topTag('pekat', 'NEKTAR JADI PEKAT', t, 47.1, 48.7, HONEY);
    bubble('madu', 'JADILAH MADU!', t, 48.76, 49.9, 420, 130, { top: '#fff2c8', bot: '#ffb31f' });
    return hive;
  }],
  // S10 — honey is ready: the rooms are closed with wax, for food later
  [49.94, 55.7, (t) => {
    hiveReset(t);
    hiveCells(t, { fill: 1, gold: 1, caps: easeInOut(inv(51.7, 54.2, t)) });
    wallBees(t, 2, 6);
    const cap = CENTER_CELLS[Math.min(CENTER_CELLS.length - 1, Math.floor(easeInOut(inv(51.7, 54.2, t)) * CENTER_CELLS.length))];
    beeAt(hive.bees[0], t, cap.p.clone().add(V(0.2, 0.55, 1.2)), cap.p.clone().add(V(0, 0, 0)), { wings: 0.3 });
    camMove(t, 49.94, 55.7, [-0.2, 4.4, 9.8], [0, 4.5, 0], [0.4, 4.9, 7.4], [0.2, 4.6, 0], 50);
    topTag('siap', 'MADU DAH SIAP', t, 49.94, 51.6, HONEY);
    pinTag('lilin', 'TUTUP DENGAN LILIN', scr(cap.p.clone().add(V(0, 0.8, 0.5))), t, 52.12, 54.0, { bg: '#c8a040', pointer: 'down' }, -30);
    bubble('nanti', 'MAKANAN NANTI!', t, 53.96, 55.65, 420, 116, { top: '#fff2c8', bot: '#ffb31f' });
    return hive;
  }],
  // S11 — one bee makes about 1/12 teaspoon of honey in its whole life; a teaspoon is twelve bees' work
  [55.7, 68.14, (t) => {
    const n = t < 63.66 ? 0 : clamp(Math.floor((t - 63.9) / 0.3) + 1, 0, 12);
    spoonSet(t, t < 63.9 ? 0 : n / 12 * easeOut(clamp(((t - 63.9) % 0.3) / 0.3 + (n >= 12 ? 1 : 0))) + (n - 1) / 12 * (n >= 12 ? 0 : 1));
    if (t < 63.66) {
      // one bee with its tiny drop beside the spoon
      const b = sp.bees[0];
      const p = V(1.5, 2.3, 1.1);
      beeAt(b, t, p, SPOON_C.clone().add(V(0, 0.4, 0)));
      const d = sp.drops[0];
      d.visible = t > 57.4;
      d.position.copy(beeMouth(b)).add(V(0, -0.1, 0));
      d.scale.setScalar(0.8);
    } else {
      for (let i = 0; i < 12; i++) {
        const b = sp.bees[i];
        const ti = 63.9 + i * 0.3;
        const home = RING(i);
        const dive = keys(t, [[ti - 0.15, 0], [ti, 1], [ti + 0.2, 0]]);
        const p = home.clone().lerp(SPOON_C.clone().add(V(0, 0.9, 0)), 0.55 * dive);
        beeAt(b, t, p, SPOON_C.clone().add(V(0, 0.3, 0)), { seed: i });
        const d = sp.drops[i];
        d.visible = t > 63.66 && t < ti + 0.1;
        if (d.visible) d.position.copy(beeMouth(b)).add(V(0, -0.1, 0));
      }
    }
    if (t < 63.66) camMove(t, 55.7, 63.66, [0.6, 3.8, 7.2], [0.6, 1.8, 0.4], [1.0, 3.4, 5.6], [1.0, 2.0, 0.6], 46);
    else camMove(t, 63.66, 68.14, [0.0, 5.2, 9.0], [0, 1.6, 0.2], [0.0, 5.0, 8.4], [0, 1.6, 0.2], 50);
    ov.flash(1 - inv(55.7, 56.0, t));
    topTag('tahu', 'TAHU TAK?', t, 55.7, 56.9, PURPLE);
    pinTag('seekor', 'SEEKOR LEBAH', scr(V(1.5, 2.7, 1.1)), t, 56.32, 59.2, { bg: YELLOW, pointer: 'down' }, -40);
    topTag('seumur', 'SEUMUR HIDUP...', t, 59.26, 61.1, '#8a5a36');
    const fq = pop(t, 61.22, 63.6, { from: 2 });
    if (fq.o > 0) ov.html('frac', `<div style="background:#fff;border:8px solid #17256b;border-radius:30px;padding:10px 30px;text-align:center;font:800 120px 'Baloo 2';color:#17256b;line-height:1">1/12<div style="font:800 56px 'Baloo 2';color:#e8920a">SUDU TEH</div></div>`, { x: W / 2, y: 470, o: fq.o, s: fq.s });
    if (t > 63.66) {
      const q = pop(t, 63.66, 68.1);
      ov.tag('count', `${n} EKOR LEBAH`, { x: W / 2, y: 330, o: q.o, s: q.s }, { bg: n >= 12 ? GREEN : YELLOW });
    }
    bubble('duabelas', 'SATU SUDU TEH =\n12 EKOR LEBAH!', t, 66.08, 68.1, 480, 96, { top: '#e0ffd8', bot: '#3fbf4a' });
    return sp;
  }],
  // S12 — "Waaah, rupanya madu tu nektar bunga yang lebah ubah! Tapi ingat, jangan kacau sarang lebah, ya."
  [68.14, 75.62, (t) => {
    const wag = t > 73.6 && t < 75.4;
    benchAff(t, { wow: keys(t, [[68.15, 0], [68.3, 0.9], [68.9, 0.9], [69.2, 0]]), smile: 1, brow: 0.5, ...(wag ? POSES.wagR(t) : {}), ...(t > 72.6 && t < 73.6 ? { headYaw: 0.5, lookX: 0.5 } : {}) });
    parkProps(t, { bread: false });
    park.bee.root.visible = false;
    const ah = affHead();
    if (t < 72.6) lookCam(affFront(3.4, 0.4), ah.clone().add(V(0, -0.35, 0)), 46);
    else camMove(t, 72.6, 73.5, affFront(3.4, 0.4).toArray(), ah.clone().add(V(0, -0.35, 0)).toArray(), affFront(4.2, -1.2).add(V(0, 0.6, 0)).toArray(), ah.clone().add(V(0, 0.2, 0)).addScaledVector(FWD, -3).addScaledVector(RIGHT, -1.6).toArray(), 50);
    ov.flash((1 - inv(68.14, 68.45, t)) * 0.9, '255,250,235');
    const hd = scr(affHead().add(V(0, 0.5, 0)));
    const b = pop(t, 68.2, 72.5);
    if (t < 72.6) ov.html('bulb', ICONS.bulb(), { x: clamp(hd.x + 200, 150, 900), y: clamp(hd.y - 160, 300, 900) + Math.sin(t * 5) * 8, o: b.o, s: b.s * 0.6, r: 10 });
    ov.sparkles(t, { n: 30, seed: 12, y: 250, h: 900, a: inv(68.2, 68.5, t) * (1 - inv(70.6, 71.2, t)) });
    bubble('ubah', 'NEKTAR BUNGA\nYANG LEBAH UBAH!', t, 69.56, 72.55, 440, 96, { top: '#fff2c8', bot: '#ffb31f' });
    bubble('ingat', 'INGAT!', t, 72.62, 73.7, 430, 140, { top: '#fff6d0', bot: '#ffb21f' });
    pinTag('sarangT', 'SARANG LEBAH', scr(park.hive.position.clone().add(V(0, 0.6, 0))), t, 74.26, 75.6, { bg: '#c8902a', pointer: 'down' }, -30);
    bubble('jangan', 'JANGAN KACAU!', t, 73.74, 75.6, 440, 130, { top: '#ffe0e0', bot: '#ff4d5e' }, 3);
    return park;
  }],
  // S13 — "Apa lagi kita nak belajar lepas ni?"
  [75.62, OUTRO, (t) => {
    const tk = keys(t, [[75.65, 0], [76.05, 1]]);
    const th2 = POSES.thinkR.armR;
    benchAff(t, { smile: 1, brow: 0.3 + 0.4 * tk, headRoll: -0.12 * tk, lookX: 0.35 * tk, lookY: 0.4 * tk, headPitch: -0.08 * tk, armR: { reach: mix3(REST.reach, th2.reach, tk), pole: th2.pole, point: tk, wx: th2.wx * tk } });
    parkProps(t, { bread: false });
    park.bee.root.visible = false;
    const ah = affHead();
    lookCam(affFront(3.3, 0.4), ah.clone().add(V(0, -0.38, 0)), 46);
    const hd = scr(ah.clone().add(V(0, 0.45, 0)));
    qmarks(t, hd, 75.62, OUTRO - 0.05, [[75.7, -260, -100, '#ffcf33', -12], [76.0, 250, -160, '#3fa2ff', 10], [76.3, 300, 60, '#ffcf33', 14]]);
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

// Cover / thumbnail (9:16): the big bee sipping nectar from a giant flower.
function thumbnail() {
  ov.begin();
  cam.aspect = W / H;
  cam.updateProjectionMatrix();
  const t = 18.0;
  fwReset(t);
  beeAt(fw.bee, t, SIP(0), FC(0).add(V(0, 1.15, 0)));
  fw.bee.setTongue(1);
  sipDrops(t, 16.6, 20.6);
  lookCam(V(0.6, 5.0, 8.4), V(-1.5, 4.6, 0.2), 50);
  fw.sky.position.copy(cam.position);
  renderer.setViewport(0, 0, W, H);
  renderer.render(fw.scene, cam);
  const g = ov.g;
  const top = g.createLinearGradient(0, 0, 0, 720);
  top.addColorStop(0, 'rgba(60,30,0,0.45)');
  top.addColorStop(1, 'rgba(60,30,0,0)');
  g.fillStyle = top;
  g.fillRect(0, 0, W, 720);
  const bot = g.createLinearGradient(0, H - 900, 0, H);
  bot.addColorStop(0, 'rgba(40,20,0,0)');
  bot.addColorStop(1, 'rgba(40,20,0,0.55)');
  g.fillStyle = bot;
  g.fillRect(0, H - 900, W, 900);
  ov.vignette(0.3);
  ov.tag('thBadge', 'EPISOD 42', { x: W / 2, y: 300 }, { bg: '#2f7bff', small: true });
  ov.bubble('thTitle', 'LEBAH BUAT', { x: W / 2, y: 445, r: -3 }, { size: 120 });
  ov.bubble('thTitle2', 'MADU?!', { x: W / 2, y: 600, r: 2 }, { size: 170, top: '#fff2c8', bot: '#ffb31f' });
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
