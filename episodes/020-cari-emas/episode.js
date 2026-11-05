// THE CURIOUS AFFAN — Episode 020: "Macam Mana Nak Cari Emas? Kenapa Emas Mahal?"
// Every shot is a pure function of time t (seconds), synced to audio/narration.mp3.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { makeRenderer, loadEnvelope, toScreen, clamp, lerp, inv, smooth, easeOut, easeIn, easeInOut, keys, wobble, rng, W, H } from '../../shared/core.js';
import { POSES, blinkAt } from '../../shared/affan.js';
import { Overlay, pop, ICONS, drawLogo } from '../../shared/overlay.js';
import { CAPTIONS, KEYWORDS } from './captions.js';
import { ANCHORS, DURATION } from './timing.js';
import {
  buildHome, buildUnderground, buildRiver, buildMine, buildPools, buildStudio, buildOutro, setGoldEnv, goldMat,
  RING_POS, PAN0, PAN_R, PAN_D, CRUSH, BAL, POOL, poolZ, STUDIO, PIT_D,
} from './worlds.js';

const FPS = 30;
const SHOT_END = 75.5; // end of the authored shot timeline (see timing.js)

// Narration time -> shot time: monotone cubic (Fritsch-Carlson) through the
// anchors, so the pace eases between chunks instead of jumping.
const shotTime = (() => {
  const xs = ANCHORS.map((a) => a[1]), ys = ANCHORS.map((a) => a[0]);
  const n = xs.length, d = [], m = new Array(n).fill(0);
  for (let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]));
  m[0] = d[0];
  m[n - 1] = d[n - 2];
  for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (2 * d[i - 1] * d[i]) / (d[i - 1] + d[i]);
  return (x) => {
    if (x <= xs[0]) return ys[0] + (x - xs[0]) * m[0];
    if (x >= xs[n - 1]) return ys[n - 1] + (x - xs[n - 1]) * m[n - 1];
    let i = 0;
    while (x > xs[i + 1]) i++;
    const h = xs[i + 1] - xs[i], s = (x - xs[i]) / h;
    const h00 = 2 * s ** 3 - 3 * s ** 2 + 1, h10 = s ** 3 - 2 * s ** 2 + s, h01 = -2 * s ** 3 + 3 * s ** 2, h11 = s ** 3 - s ** 2;
    return h00 * ys[i] + h10 * h * m[i] + h01 * ys[i + 1] + h11 * h * m[i + 1];
  };
})();
let T_NEW = 0; // current narration time (lip sync follows the real voice)

const stage = document.getElementById('stage');
const canvas = document.createElement('canvas');
stage.appendChild(canvas);
const renderer = makeRenderer(canvas);
const ov = new Overlay(stage);
const pm = new THREE.PMREMGenerator(renderer);
const ENV = pm.fromScene(new RoomEnvironment(), 0.04).texture;
const home = buildHome();
const under = buildUnderground();
const river = buildRiver();
const mine = buildMine();
const pools = buildPools();
const studio = buildStudio();
const outro = buildOutro();
// instanced meshes move far from their first-frame bounds, so never cull them
[home, under, river, mine, pools, studio, outro].forEach((w) => w.scene.traverse((o) => o.isInstancedMesh && (o.frustumCulled = false)));
const cam = new THREE.PerspectiveCamera(50, W / H, 0.05, 3000);
let env = { at: () => 0 };

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const talk = () => clamp(env.at(T_NEW) * 1.2);
const scr = (p, c = cam) => toScreen(p, c);
const deg = (r) => (r * 180) / Math.PI;
const dummy = new THREE.Object3D();

function lookCam(c, pos, look, fov = 50, up = [0, 1, 0]) {
  c.position.copy(pos);
  c.up.set(...up);
  c.fov = fov;
  c.updateProjectionMatrix();
  c.lookAt(look);
  c.updateMatrixWorld(true);
}

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
const REST_L = [0.55, 0.25, 0.1];
const JOM_R = (t, up) => ({ reach: [lerp(-0.55, -0.6, up), lerp(0.25, 1.95 + 0.06 * Math.sin(t * 14), up), lerp(0.1, 0.3, up)], pole: [-1, -0.3, -0.5] });

const ORANGE = '#ff8a3d', GREEN = '#2fbf5a', BLUE = '#2f9bff', RED = '#ff4d5e', GOLD = '#f5b300', PURPLE = '#8a5cd6', BROWN = '#b5743f';
function arrowAt(id, x, y, ang, { color = ORANGE, s = 0.7, o = 1 } = {}) {
  ov.html(id, ICONS.arrow(color), { x, y, o, s, r: deg(ang) });
}
const TICK = `<svg width="200" height="200" viewBox="0 0 200 200"><path d="M35 105 L82 150 L168 52" fill="none" stroke="#fff" stroke-width="54" stroke-linecap="round" stroke-linejoin="round"/><path d="M35 105 L82 150 L168 52" fill="none" stroke="#2fbf5a" stroke-width="32" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const HEART = `<svg width="120" height="110" viewBox="0 0 120 110"><path d="M60 100 C20 70 8 50 8 32 C8 16 20 6 34 6 C46 6 55 14 60 24 C65 14 74 6 86 6 C100 6 112 16 112 32 C112 50 100 70 60 100 Z" fill="#ff5a7a" stroke="#fff" stroke-width="9" stroke-linejoin="round"/></svg>`;
const BEAN = `<svg width="170" height="120" viewBox="0 0 170 120"><ellipse cx="85" cy="62" rx="70" ry="48" fill="#6fcf4a" stroke="#17256b" stroke-width="10"/><path d="M60 40 C78 56 96 58 116 50" fill="none" stroke="#3f9a2a" stroke-width="8" stroke-linecap="round"/><ellipse cx="62" cy="44" rx="16" ry="10" fill="#c8ff9a" opacity="0.8"/></svg>`;
const HAND = `<svg width="170" height="200" viewBox="0 0 170 200"><path d="M45 190 C30 160 20 120 20 95 C20 80 40 78 45 95 L48 112 L48 35 C48 20 68 20 68 35 L68 95 L72 20 C72 5 92 5 92 20 L92 95 L98 28 C98 13 118 13 118 28 L116 100 L124 55 C126 40 146 42 144 58 L136 130 C132 165 115 190 100 190 Z" fill="#ffd2b0" stroke="#17256b" stroke-width="9" stroke-linejoin="round"/></svg>`;
const PRICE = (txt) => `<svg width="420" height="200" viewBox="0 0 420 200"><path d="M60 20 H390 Q404 20 404 34 V166 Q404 180 390 180 H60 L10 100 Z" fill="#ffd84a" stroke="#17256b" stroke-width="10" stroke-linejoin="round"/><circle cx="60" cy="100" r="14" fill="#fff" stroke="#17256b" stroke-width="7"/><text x="232" y="128" text-anchor="middle" font-family="Baloo 2" font-weight="800" font-size="86" fill="#17256b">${txt}</text></svg>`;
const DEPTH = `<svg width="120" height="420" viewBox="0 0 120 420"><line x1="60" y1="20" x2="60" y2="360" stroke="#17256b" stroke-width="26" stroke-linecap="round"/><line x1="60" y1="20" x2="60" y2="360" stroke="#ffd84a" stroke-width="12" stroke-linecap="round"/><path d="M14 330 L60 405 L106 330 Z" fill="#ffd84a" stroke="#17256b" stroke-width="10" stroke-linejoin="round"/></svg>`;
const CUP = `<svg width="200" height="150" viewBox="0 0 200 150"><g stroke="#17256b" stroke-width="9" stroke-linejoin="round"><path d="M20 30 H180 L160 130 H40 Z" fill="#ffd84a"/><path d="M60 52 L72 108 M100 52 V108 M140 52 L128 108" fill="none" stroke="#e09a10"/></g></svg>`;

function shadowFollow(world, x, y, z) {
  if (!world.sun) return;
  world.sun.target.position.set(x, y, z);
  world.sun.position.set(x - 8, y + 14, z - 8);
  world.sun.target.updateMatrixWorld();
}

// ===================================================================== HOME
const AFF_H = V(-0.55, 0, 0.35);
function homeAff(t, o = {}) {
  const a = home.aff;
  a.root.position.copy(AFF_H);
  a.pose({ yaw: o.yaw ?? Math.PI - 0.35 });
  return a;
}
function ringSpin(t) {
  home.ring.rotation.set(0.12, t * 0.9, 0);
  home.ring.position.set(RING_POS.x, RING_POS.y + 0.03 * Math.sin(t * 2.2), RING_POS.z);
}
function hook(t, end = 7.4) {
  const p = pop(t, 0.12, end, { fin: 0.45 });
  const fl = Math.sin(t * 3) * 6;
  ov.bubble('hook', 'MACAM MANA\nNAK CARI EMAS?', { x: W / 2, y: 440 + fl, o: p.o, s: p.s }, { size: 104, top: '#fff3a0', bot: '#f5b300' });
  const q = pop(t, 0.45, end);
  ov.tag('ep', 'EPISOD 20', { x: W / 2, y: 268, o: q.o, s: q.s }, { bg: '#2f7bff', small: true });
}

// ============================================================== UNDERGROUND
function veinGlow(t, k) {
  under.nuggets.forEach(({ n, gl, s }, i) => {
    const pulse = 0.75 + 0.25 * Math.sin(t * 5 + i * 1.3);
    gl.material.opacity = k * 0.85 * pulse;
    n.scale.setScalar(s * (1 + 0.08 * k * Math.sin(t * 6 + i)));
    n.rotation.y = i + t * 0.3;
  });
}

// ==================================================================== RIVER
const AFF_R = V(0, -0.5, 0.6);
const panNuggets = [];
{
  const R = rng(77);
  const gm = goldMat({ rough: 0.15, ei: 1.1 });
  for (let i = 0; i < 7; i++) {
    const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.035 + R() * 0.03, 0), gm);
    const a = R() * Math.PI * 2, r = R() * 0.12;
    m.position.set(Math.cos(a) * r, 0.035, Math.sin(a) * r);
    river.pan.add(m);
    panNuggets.push(m);
  }
}
setGoldEnv(ENV);
function riverFlow(t, speed = 0.12, op = 0.6) {
  river.water.material.opacity = op;
  river.ripple.offset.x = t * speed;
  river.bigWater.material.map.offset.set(t * 0.05, t * 0.03);
}
function flakes(t) {
  const f = river.flakes;
  f.userData.seed.forEach(([x0, z, ph, s], i) => {
    const x = 6 - ((((x0 * 0.3) + t * 1.2) % 12) + 12) % 12;
    dummy.position.set(x, -0.5 + 0.06 + 0.05 * Math.abs(Math.sin(t * 3 + ph * 9)), z);
    dummy.rotation.set(t * 2 + ph * 7, t * 1.3 + ph * 3, ph * 5);
    dummy.scale.set(s, s * 0.35, s);
    dummy.updateMatrix();
    f.setMatrixAt(i, dummy.matrix);
  });
  f.instanceMatrix.needsUpdate = true;
}
function holdPan(a, t, swirl = 1, extra = {}) {
  const sw = Math.sin(t * 4.2) * 0.06 * swirl;
  river.pan.rotation.set(0.12 + Math.cos(t * 4.2) * 0.04 * swirl, t * 1.6 * swirl, sw);
  a.pose({
    yaw: Math.PI, blink: blinkAt(t, 3), talk: talk(t), smile: 0.8, brow: 0.5,
    headPitch: 0.42, lookY: -0.55, lean: 0.12,
    armR: { reach: [-0.62 + sw, 0.82, 0.74], pole: [-1, -0.7, -0.2] },
    armL: { reach: [0.62 + sw, 0.82, 0.74], pole: [1, -0.7, -0.2] },
    ...extra,
  });
}
// Magnified pan: gold sinks to the bottom, light sand is washed over the rim.
const cone = (r) => (PAN_D * Math.min(r, PAN_R)) / PAN_R;
function panRig(t) {
  const big = river.big;
  const wash = smooth(inv(22.7, 23.3, t));
  big.rotation.set(0.05 * Math.sin(t * 3.1), 0, 0.06 * Math.sin(t * 2.6) * (1 - wash) - 0.2 * wash);
  const swirl = 1.1 * Math.min(t, 22.9) + 0.25 * Math.max(0, t - 22.9);
  river.sand.userData.seed.forEach(([r0, th0, ph, sp], i) => {
    const rs = r0 * PAN_R * 0.92;
    const th = th0 + swirl * (0.7 + 0.3 * ph);
    const settle = smooth(inv(19.6 + ph * 0.6, 22.4 + ph, t));
    const ySusp = PAN_D * 0.62 + 0.3 * Math.sin(t * 2 + ph * 6);
    const yRest = cone(rs) + 0.08 + 0.2 * ph;
    let x = Math.cos(th) * rs, z = Math.sin(th) * rs, y = lerp(ySusp, yRest, settle * 0.9);
    const w = clamp((t - (22.95 + ph * 1.1)) * sp / 0.7);
    let sc = 1;
    if (w > 0) {
      const ex = -PAN_R * 1.9 - ph * 2.5;
      x = lerp(x, ex, easeIn(w));
      z = lerp(z, z * 0.6 + (ph - 0.5) * 1.5, w);
      y = lerp(y, PAN_D * 1.15 + 0.15, smooth(Math.min(1, w * 1.7))) + 0.5 * Math.sin(Math.PI * w) * 0.4 - Math.max(0, w - 0.7) * 1.4;
      sc = 1 - smooth(inv(0.75, 1, w));
    }
    dummy.position.set(x, y, z);
    dummy.rotation.set(t + ph * 6, t * 0.7 + i, 0);
    dummy.scale.setScalar(Math.max(0.001, sc * (0.7 + 0.5 * ph)));
    dummy.updateMatrix();
    river.sand.setMatrixAt(i, dummy.matrix);
  });
  river.sand.instanceMatrix.needsUpdate = true;
  river.gold.userData.seed.forEach(([r0, th0, ph, s, p2], i) => {
    const sink = smooth(inv(19.3 + ph * 0.4, 20.5 + ph * 0.7, t));
    const rg = lerp(r0 * PAN_R * 0.62, r0 * PAN_R * 0.16, sink);
    const th = th0 + swirl * lerp(0.9, 0.15, sink);
    const yS = PAN_D * 0.66 + 0.32 * Math.sin(t * 2.4 + p2);
    const y = lerp(yS, cone(rg) + s * 0.6, easeIn(sink));
    dummy.position.set(Math.cos(th) * rg, y, Math.sin(th) * rg);
    dummy.rotation.set(t * (1 - sink) + p2, p2, t * 0.5 * (1 - sink));
    dummy.scale.set(s, s * 0.7, s);
    dummy.updateMatrix();
    river.gold.setMatrixAt(i, dummy.matrix);
  });
  river.gold.instanceMatrix.needsUpdate = true;
}

// ===================================================================== MINE
function digger(t) {
  const c = t * 1.5;
  mine.upper.rotation.y = 0.5 * Math.sin(t * 0.55);
  mine.boom.rotation.z = -0.35 + 0.22 * Math.sin(c);
  mine.stick.rotation.z = -1.0 + 0.35 * Math.sin(c + 1.1);
  mine.bucket.rotation.z = -0.5 + 0.5 * Math.sin(c + 2.0);
}
function crusher(t) {
  mine.rollers[0].rotation.y = t * 3;
  mine.rollers[1].rotation.y = -t * 3;
  mine.chunks.forEach((c, i) => {
    const p = (((t + i * 0.27) % 2.4) + 2.4) % 2.4 / 2.4;
    const fall = Math.min(1, p / 0.62);
    c.visible = p < 0.66;
    c.position.set((i % 3 - 1) * 0.45 * (1 - fall), lerp(9.5, 4.3, easeIn(fall)), ((i * 7) % 3 - 1) * 0.5);
    c.rotation.set(t * 2 + i, i, t + i);
    c.scale.setScalar((0.55 + (i % 3) * 0.1) * (1 - 0.6 * smooth(inv(0.5, 0.66, p))));
  });
  mine.gravel.forEach((c, i) => {
    const [a, b, d] = c.userData.seed;
    const p = (((t * 0.65 + a) % 1) + 1) % 1;
    let x, y;
    if (p < 0.25) {
      const k = p / 0.25;
      x = lerp((b - 0.5) * 0.4, 0.2, k);
      y = lerp(2.7, 1.85, easeIn(k));
    } else if (p < 0.75) {
      const k = (p - 0.25) / 0.5;
      x = lerp(0.2, 2.4, k);
      y = lerp(1.85, 1.15, k) + 0.08;
    } else {
      const k = (p - 0.75) / 0.25;
      x = lerp(2.4, 2.8 + b * 0.8, k);
      y = lerp(1.2, 0.95 + 0.2 * d, easeIn(k));
    }
    c.position.set(x, y, (d - 0.5) * 1.8);
    c.rotation.set(t * 3 + a * 9, b * 9, 0);
  });
}
// Balance: car on the left pan (-x), rock on the right (+x).
const PILE = V(6.2, 0, -5.6);
function balance(t) {
  let a = 0.17;
  const drop = easeIn(inv(32.62, 33.05, t));
  if (t > 33.05) {
    const u = t - 33.05;
    a = 0.17 * Math.exp(-u * 2.6) * Math.cos(u * 8) * 0.9 + 0.0;
  }
  a = lerp(a, 0.17, smooth(inv(34.8, 35.6, t)));
  mine.beam.rotation.z = a;
  mine.plates.forEach((p, i) => {
    const s = i ? 1 : -1;
    p.position.set(s * 6 * Math.cos(a), 4.4 + s * 6 * Math.sin(a), 0);
  });
  mine.boulder.position.set(0, -1.95 + 7 * (1 - drop), 0);
  mine.boulder.visible = t > 32.5;
  mine.bal.updateMatrixWorld(true);
  const crumble = t > 34.7;
  const start = V(6, 4.4 - 1.95, 0);
  const tmp = new THREE.Vector3();
  mine.bChunks.forEach(({ m, p0, s0, r0, land, d }) => {
    if (!crumble) {
      m.position.copy(p0);
      m.rotation.copy(r0);
      m.scale.setScalar(s0);
      return;
    }
    const k = clamp((t - 34.7 - d) / 0.75);
    tmp.copy(start).add(p0).lerp(V(PILE.x + land.x, land.y, PILE.z + land.z), easeIn(k));
    tmp.y += Math.sin(k * Math.PI) * 1.6 * (1 - k * 0.4);
    if (k <= 0) tmp.copy(start).add(p0).add(V(0, Math.sin((t - 34.7) * 40) * 0.03, 0));
    mine.bal.localToWorld(tmp);
    mine.boulder.worldToLocal(tmp);
    m.position.copy(tmp);
    m.rotation.set(r0.x + k * 4, r0.y + k * 3, r0.z);
    m.scale.setScalar(s0 * lerp(1, 0.55, k));
  });
  const bk = easeOut(inv(35.9, 36.9, t));
  mine.bean.visible = t > 35.85;
  mine.bean.position.set(PILE.x, 0.6 + 1.5 * bk + 0.06 * Math.sin(t * 3), PILE.z - 0.4);
  mine.bean.rotation.y = t * 1.4;
  mine.beanGlow.position.copy(mine.bean.position).add(V(0, 0, -0.3));
  mine.beanGlow.material.opacity = bk * (0.75 + 0.25 * Math.sin(t * 6));
}

// ==================================================================== POOLS
function poolFill(t) {
  pools.pools.forEach(({ fill }, i) => {
    const h = POOL.D * smooth(inv(44.74 + i * 0.35, 49.6 + i * 0.2, t));
    fill.visible = h > 0.01;
    fill.scale.y = Math.max(0.001, h);
    fill.position.y = h / 2;
  });
}

// =================================================================== STUDIO
const IRON0 = new THREE.Color(0x9aa4b4), RUST = new THREE.Color(0x8a3a14);
function rust(t) {
  const k = smooth(inv(52.62, 56.6, t));
  studio.iron.color.copy(IRON0).lerp(RUST, k);
  studio.iron.metalness = lerp(0.85, 0.05, k);
  studio.iron.roughness = lerp(0.32, 0.98, k);
  studio.rustSpots.userData.seed.forEach(([y, a, s, th], i) => {
    const g = smooth(clamp((k - th * 0.7) / 0.3));
    dummy.position.set(Math.cos(a) * 0.12, y, Math.sin(a) * 0.12);
    dummy.rotation.set(a, i, 0);
    dummy.scale.setScalar(Math.max(0.001, g * s));
    dummy.updateMatrix();
    studio.rustSpots.setMatrixAt(i, dummy.matrix);
  });
  studio.rustSpots.instanceMatrix.needsUpdate = true;
  studio.coin.rotation.set(0, Math.PI + 0.5 * Math.sin(t * 1.3), 0);
  studio.coin.position.y = 3.5 + 0.08 * Math.sin(t * 2);
  studio.coinGlow.material.opacity = 0.35 + 0.15 * Math.sin(t * 4);
  return k;
}
function crowd(t) {
  studio.people.forEach((p, i) => {
    const { a, r1, r0, d, ph } = p.userData;
    const k = easeOut(inv(57.0 + d, 58.6 + d, t));
    const r = lerp(r0, r1, k);
    const walking = k > 0 && k < 1;
    p.position.set(STUDIO.C + Math.cos(a) * r, 0.4 + (walking ? Math.abs(Math.sin(t * 9 + ph)) * 0.15 : 0.04 * Math.sin(t * 3 + ph)), 1.5 + Math.sin(a) * r);
    p.rotation.set(0, Math.atan2(-Math.cos(a), -Math.sin(a)), walking ? 0.06 * Math.sin(t * 9 + ph) : 0);
  });
  studio.nug.rotation.y = t * 0.8;
  studio.nugGlow.material.opacity = 0.5 + 0.2 * Math.sin(t * 5);
}

// ======================================================================= SHOTS
const SHOTS = [
  // S1a — living room: Affan spots mama's gold ring on the table
  [0, 2.96, (t) => {
    ringSpin(t);
    const a = homeAff(t);
    const pt = keys(t, [[0.15, 0], [0.6, 1], [2.96, 1]]);
    a.pose({
      yaw: Math.PI - 0.35, blink: blinkAt(t, 1), talk: talk(t), wow: keys(t, [[0, 0.7], [0.5, 0]]), smile: 1, brow: 0.9,
      headYaw: -0.45, headPitch: 0.15, lookX: -0.4, lookY: -0.2,
      armR: { reach: mixArm(REST_R, reachTo(a, home.ring.position), pt), point: pt, pole: [-1, -0.6, -0.4] },
      armL: { reach: [0.62, 0.55, 0.35], pole: [1, -0.5, -0.4] },
    });
    home.ringGlow.material.opacity = 0.5 + 0.3 * Math.sin(t * 5);
    const k = easeInOut(inv(0, 2.96, t));
    lookCam(cam, V(lerp(0.9, 0.7, k), 3.0, lerp(-6.6, -5.8, k)), V(0.45, 2.0, 0.0), 50);
    hook(t);
    const rp = scr(home.ring.position);
    const b = pop(t, 2.04, 2.96, { from: 2 });
    if (b.o > 0) ov.sparkles(t, { n: 14, seed: 3, x: rp.x - 160, y: rp.y - 160, w: 320, h: 320, a: b.o });
    return home;
  }],
  // S1b — close on the ring: where does gold come from? why so expensive?
  [2.96, 6.0, (t) => {
    ringSpin(t);
    homeAff(t);
    home.aff.pose({ yaw: Math.PI - 0.35, blink: blinkAt(t, 2), talk: talk(t), smile: 0.7, headYaw: -0.4, lookX: -0.4 });
    home.ringGlow.material.opacity = 0.7 + 0.3 * Math.sin(t * 6);
    const k = easeInOut(inv(2.96, 6.0, t));
    const rp = RING_POS;
    lookCam(cam, V(rp.x + lerp(0.5, 0.25, k), rp.y + lerp(0.55, 0.35, k), rp.z - lerp(1.9, 1.35, k)), V(rp.x, rp.y + 0.05, rp.z), 42);
    ov.flash((1 - inv(2.96, 3.2, t)) * 0.6);
    ov.sparkles(t, { n: 22, seed: 5, x: 240, y: 560, w: 600, h: 700, a: 0.9 });
    const e = pop(t, 2.98, 5.95);
    ov.tag('emas', 'EMAS', { x: W / 2, y: 330, o: e.o, s: e.s }, { bg: GOLD });
    const q = pop(t, 3.76, 5.95);
    ov.bubble('dariMana', 'DARI MANA?', { x: W / 2, y: 1170, o: q.o, s: q.s, r: -3 }, { size: 104 });
    [[3.9, -330, 760, '#ffcf33', -14], [4.1, 340, 700, '#3fa2ff', 12]].forEach(([a0, dx, y, c, r], i) => {
      const m = pop(t, a0, 5.95);
      ov.html('q' + i, ICONS.qmark(c), { x: W / 2 + dx, y: y + Math.sin(t * 3 + i) * 10, o: m.o, s: m.s * 0.85, r });
    });
    const mh = pop(t, 4.56, 5.95, { from: 2 });
    ov.tag('mahal', 'KENAPA MAHAL?', { x: W / 2, y: 1300, o: mh.o, s: mh.s }, { bg: RED });
    return home;
  }],
  // S1c — "Jom ikut Affan siasat!" magic swirl into the earth
  [6.0, 7.52, (t) => {
    ringSpin(t);
    const a = homeAff(t);
    const up = keys(t, [[6.0, 0], [6.25, 1], [7.2, 1], [7.5, 0.6]], easeOut);
    a.pose({ yaw: Math.PI - 0.1, blink: blinkAt(t, 2), talk: talk(t), smile: 1, brow: 0.7, armR: JOM_R(t, up) });
    const k = easeInOut(inv(6.0, 7.52, t));
    lookCam(cam, V(AFF_H.x + lerp(0.3, 0.1, k), lerp(2.9, 3.0, k), AFF_H.z - lerp(4.8, 4.0, k)), V(AFF_H.x, 2.55, AFF_H.z), 46);
    ov.swirl(t, W / 2, 820, inv(6.3, 7.4, t));
    ov.flash(inv(7.15, 7.52, t) ** 2);
    return home;
  }],
  // S2 — the earth cut open: gold hides in rock, deep underground
  [7.52, 11.7, (t) => {
    const a = under.aff;
    a.root.position.set(-4.5, 0, 1.4);
    a.pose({ yaw: Math.PI, blink: blinkAt(t, 4), smile: 1, wow: keys(t, [[9.9, 0], [10.2, 0.8], [11.0, 0.8], [11.4, 0]]), headPitch: 0.4, lookY: -0.6 });
    const k = easeInOut(inv(7.7, 11.2, t));
    const y = lerp(1.2, -17.6, k);
    lookCam(cam, V(lerp(-1.2, 0.2, k), y + lerp(1.0, 1.4, k), lerp(-15, -9.5, k)), V(lerp(-1.8, 0.1, k), y - lerp(1.6, 0.5, k), 0), 50);
    veinGlow(t, smooth(inv(9.0, 10.6, t)));
    ov.flash((1 - inv(7.52, 7.95, t)) * 0.9);
    const e = pop(t, 7.52, 9.0);
    ov.bubble('tersorok', 'TERSOROK!', { x: W / 2, y: 470, o: e.o, s: e.s, r: -3 }, { size: 120, top: '#fff3a0', bot: '#f5b300' });
    const bt = pop(t, 9.04, 11.65);
    ov.tag('batu', 'DALAM BATU', { x: W / 2, y: 330, o: bt.o, s: bt.s }, { bg: PURPLE });
    const dp = pop(t, 9.92, 11.65);
    ov.html('depth', DEPTH, { x: 140, y: 820, o: dp.o, s: dp.s * 1.1 });
    ov.tag('jauh', 'JAUH DALAM TANAH', { x: W / 2, y: 1240, o: dp.o, s: dp.s }, { bg: BROWN });
    const sp = smooth(inv(10.0, 10.8, t));
    if (sp > 0) {
      const c = scr(V(0.2, -17.8, -0.2));
      ov.sparkles(t, { n: 20, seed: 9, x: c.x - 330, y: c.y - 260, w: 660, h: 520, a: sp });
    }
    return under;
  }],
  // S3a — Cara 1: mendulang di sungai (Affan pans in the shallows)
  [11.7, 14.54, (t) => {
    riverFlow(t);
    flakes(t);
    river.aff.root.visible = true;
    river.aff.root.position.copy(AFF_R);
    holdPan(river.aff, t, 1);
    const k = easeInOut(inv(11.7, 14.54, t));
    lookCam(cam, V(lerp(0.9, 0.4, k), lerp(3.9, 3.5, k), lerp(-9.6, -8.4, k)), V(0.0, 1.7, 0.6), 50);
    shadowFollow(river, 0, 0, 0);
    ov.flash((1 - inv(11.7, 12.05, t)) * 0.9);
    const c1 = pop(t, 11.7, 14.5);
    ov.bubble('cara1', 'CARA 1', { x: W / 2, y: 425, o: c1.o, s: c1.s, r: -3 }, { size: 130, top: '#9fe8ff', bot: '#1d9bf0' });
    const md = pop(t, 12.94, 14.5);
    ov.tag('mendulang', 'MENDULANG', { x: W / 2, y: 235, o: md.o, s: md.s }, { bg: BLUE });
    const sg = pop(t, 13.8, 14.5);
    ov.tag('sungai', 'DI SUNGAI', { x: W / 2, y: 1270, o: sg.o, s: sg.s }, { bg: '#1fa0c8', small: true });
    return river;
  }],
  // S3b — the river carries fine gold dust along the bed
  [14.54, 17.76, (t) => {
    riverFlow(t, 0.12, 0.3);
    flakes(t);
    river.aff.root.visible = false;
    const k = easeInOut(inv(14.54, 17.76, t));
    lookCam(cam, V(lerp(1.2, 0.2, k), lerp(2.3, 1.9, k), lerp(-1.4, -1.0, k)), V(lerp(0.6, -0.6, k), -0.5, 1.3), 50);
    shadowFollow(river, 0, 0, 1);
    ov.flash((1 - inv(14.54, 14.85, t)) * 0.7, '200,240,255');
    const fl = pop(t, 14.56, 17.7);
    arrowAt('flow', W / 2 + 40 + ((t * 160) % 80), 420, 0, { color: '#1fa0c8', s: 0.9 * fl.s, o: fl.o });
    ov.tag('arus', 'AIR SUNGAI', { x: W / 2, y: 290, o: fl.o, s: fl.s }, { bg: '#1fa0c8', small: true });
    const sb = pop(t, 15.9, 17.7, { from: 2 });
    ov.tag('serbuk', 'SERBUK EMAS', { x: W / 2, y: 1240, o: sb.o, s: sb.s }, { bg: GOLD });
    if (sb.o > 0) ov.sparkles(t, { n: 26, seed: 15, y: 700, h: 700, a: sb.o, size: 16 });
    // glints on the drifting gold dust
    const m4 = new THREE.Matrix4(), p4 = new THREE.Vector3();
    for (let i = 0; i < river.flakes.count; i += 2) {
      river.flakes.getMatrixAt(i, m4);
      p4.setFromMatrixPosition(m4);
      const c = scr(p4);
      if (c.x < -40 || c.x > W + 40 || c.y < 200 || c.y > 1400) continue;
      const tw = 0.5 + 0.5 * Math.sin(t * 7 + i * 1.7);
      ov.star(c.x, c.y, 9 + 14 * tw, (0.35 + 0.65 * tw) * (0.4 + 0.6 * sb.o), '#ffe27a', t + i);
    }
    const hl = pop(t, 17.02, 17.7);
    ov.tag('halus', 'HALUS!', { x: 820, y: 1100, o: hl.o, s: hl.s, r: 6 }, { bg: ORANGE, small: true });
    return river;
  }],
  // S3c — magnified dulang: heavy gold sinks, light sand washes away
  [17.76, 25.3, (t) => {
    riverFlow(t);
    river.aff.root.visible = false;
    panRig(t);
    const k = easeInOut(inv(17.76, 25.3, t));
    lookCam(cam, V(PAN0.x + lerp(0.8, -0.6, k), PAN0.y + lerp(6.6, 5.6, k), PAN0.z - lerp(5.6, 5.4, k)), V(PAN0.x + lerp(0, -0.8, k), PAN0.y + 0.3, PAN0.z + 0.4), 46);
    shadowFollow(river, PAN0.x, 0, PAN0.z);
    ov.flash((1 - inv(17.76, 18.1, t)) * 0.8, '200,240,255');
    const br = pop(t, 18.62, 22.0);
    ov.tag('berat', 'EMAS BERAT', { x: W / 2, y: 300, o: br.o, s: br.s }, { bg: GOLD });
    const tg = pop(t, 20.14, 22.0, { from: 2 });
    if (tg.o > 0) {
      const c = scr(V(PAN0.x, PAN0.y + 0.2, PAN0.z));
      arrowAt('sink', c.x, c.y - 260 + ((t * 120) % 60), Math.PI / 2, { color: GOLD, s: 0.8 * tg.s, o: tg.o });
      ov.tag('tenggelam', 'TENGGELAM!', { x: W / 2, y: 430, o: tg.o, s: tg.s }, { bg: ORANGE });
    }
    const ps = pop(t, 22.06, 25.25);
    ov.tag('pasir', 'PASIR RINGAN', { x: W / 2, y: 300, o: ps.o, s: ps.s }, { bg: '#d9a95a' });
    const hn = pop(t, 23.74, 25.25, { from: 2 });
    if (hn.o > 0) {
      arrowAt('wash', 860 + ((t * 140) % 60), 820, 0.15, { color: '#1fa0c8', s: 0.8 * hn.s, o: hn.o });
      ov.tag('hanyut', 'HANYUT!', { x: 780, y: 640, o: hn.o, s: hn.s, r: 5 }, { bg: '#1fa0c8' });
    }
    const gl = smooth(inv(20.6, 21.4, t));
    if (gl > 0) {
      const c = scr(V(PAN0.x, PAN0.y + 0.15, PAN0.z));
      ov.sparkles(t, { n: 14, seed: 21, x: c.x - 170, y: c.y - 140, w: 340, h: 280, a: gl });
    }
    return river;
  }],
  // S4a — Cara 2: lombong. Pit, excavator digging deep
  [25.3, 29.9, (t) => {
    digger(t);
    crusher(t);
    const a = mine.aff;
    a.root.visible = true;
    a.root.position.set(3.2, 0, -26.8);
    const pt = keys(t, [[25.6, 0], [26.1, 1], [27.6, 1], [28.0, 0]]);
    a.pose({ yaw: Math.PI - 0.5 });
    a.pose({
      yaw: Math.PI - 0.5, blink: blinkAt(t, 5), talk: talk(t), smile: 1, brow: 0.6, headYaw: 0.3, lookX: 0.3,
      armR: { reach: mixArm(REST_R, reachTo(a, V(-6, -6, -4)), pt), point: pt, pole: [-1, -0.6, -0.4] },
    });
    const k = easeInOut(inv(25.3, 29.9, t));
    const c2 = easeInOut(inv(27.2, 29.9, t));
    const pos = V(lerp(6.4, 5.4, k), lerp(5.6, 6.0, k), lerp(-37.5, -36.5, k)).lerp(V(-1, 8, -21), c2);
    const look = V(lerp(1.5, -1, k), lerp(2.6, -1, k), lerp(-24, -10, k)).lerp(V(-6, -9, -5), c2);
    lookCam(cam, pos, look, 50);
    shadowFollow(mine, -4, -6, -10);
    ov.flash((1 - inv(25.3, 25.65, t)) * 0.9);
    const c1 = pop(t, 25.32, 29.85);
    ov.bubble('cara2', 'CARA 2', { x: W / 2, y: 425, o: c1.o, s: c1.s, r: 3 }, { size: 130, top: '#ffd0a0', bot: '#ff7a2f' });
    const lb = pop(t, 26.58, 29.85);
    ov.tag('lombong', 'LOMBONG', { x: W / 2, y: 235, o: lb.o, s: lb.s }, { bg: BROWN });
    const gd = pop(t, 28.72, 29.85, { from: 2 });
    ov.html('dig', DEPTH, { x: 150, y: 900, o: gd.o, s: gd.s });
    ov.tag('gali', 'GALI DALAM-DALAM', { x: W / 2, y: 1250, o: gd.o, s: gd.s }, { bg: ORANGE });
    return mine;
  }],
  // S4b — the crusher smashes lots of rock
  [29.9, 32.3, (t) => {
    digger(t);
    crusher(t);
    mine.aff.root.visible = false;
    const k = easeInOut(inv(29.9, 32.3, t));
    lookCam(cam, V(CRUSH.x + lerp(1.6, 0.8, k), CRUSH.y + lerp(4.4, 4.0, k), CRUSH.z - lerp(15.5, 14.0, k)), V(CRUSH.x + 1.0, CRUSH.y + 3.6, CRUSH.z), 50);
    shadowFollow(mine, CRUSH.x, 0, CRUSH.z);
    ov.flash((1 - inv(29.9, 30.2, t)) * 0.8);
    const hc = pop(t, 30.14, 32.25, { from: 2 });
    ov.bubble('hancur', 'HANCURKAN!', { x: W / 2, y: 340 + Math.sin(t * 20) * 4 * hc.o, o: hc.o, s: hc.s, r: -2 }, { size: 118, top: '#ffd0a0', bot: '#ff7a2f' });
    const bn = pop(t, 31.02, 32.25);
    ov.tag('banyak', 'BANYAK BATU', { x: W / 2, y: 1250, o: bn.o, s: bn.s }, { bg: PURPLE });
    return mine;
  }],
  // S4c — a rock as heavy as a car... holds gold the size of a mung bean
  [32.3, 39.08, (t) => {
    digger(t);
    balance(t);
    const a = mine.aff;
    a.root.visible = true;
    a.root.position.set(BAL.x + 9.6, 0, BAL.z - 4.6);
    const wow = keys(t, [[35.6, 0], [35.95, 1], [37.0, 1], [37.4, 0.3]]);
    a.pose({ yaw: Math.PI + 0.55 });
    const pt = keys(t, [[37.2, 0], [37.6, 1], [39.1, 1]]);
    a.pose({
      yaw: Math.PI + 0.55, blink: wow > 0.5 ? 0 : blinkAt(t, 6), talk: talk(t), smile: 1, wow: wow * 0.9, brow: 0.5 + 0.5 * wow,
      headYaw: 0.5, headPitch: 0.1, lookX: 0.5,
      armR: { reach: mixArm(REST_R, reachTo(a, mine.bean.getWorldPosition(V(0, 0, 0))), pt), point: pt, pole: [-1, -0.6, -0.4] },
      armL: { reach: [lerp(0.55, 0.8, wow), lerp(0.25, 1.5, wow), lerp(0.1, 0.5, wow)], pole: [1, -0.4, -0.5] },
    });
    const k1 = easeInOut(inv(32.3, 35.2, t));
    const k2 = easeInOut(inv(35.4, 37.4, t));
    const pos = V(BAL.x + lerp(0.2, 0.6, k1), lerp(4.2, 3.9, k1), lerp(-31, -28, k1)).lerp(V(BAL.x + PILE.x + 0.6, 1.9, PILE.z - 6.4), k2);
    const look = V(BAL.x + 0.2, lerp(2.6, 2.4, k1), -1).lerp(V(BAL.x + PILE.x + 0.4, 1.9, PILE.z), k2);
    lookCam(cam, pos, look, lerp(60, 48, k2));
    shadowFollow(mine, BAL.x, 0, 0);
    ov.flash((1 - inv(32.3, 32.6, t)) * 0.8);
    const cr = scr(mine.car.getWorldPosition(V(0, 0, 0)).add(V(0, 2.2, 0)));
    const ct = pop(t, 33.84, 35.0);
    ov.tag('kereta', 'KERETA', { x: clamp(cr.x, 200, 880), y: cr.y - 40, o: ct.o, s: ct.s }, { bg: RED, small: true, pointer: 'down' });
    const br = scr(mine.plates[1].getWorldPosition(V(0, 0, 0)).add(V(0, -0.3, 0)));
    const bt = pop(t, 32.32, 35.0);
    ov.tag('batuT', 'BATU', { x: clamp(br.x, 200, 880), y: br.y - 60, o: bt.o, s: bt.s }, { bg: PURPLE, small: true, pointer: 'down' });
    const sb = pop(t, 33.44, 34.75, { from: 2 });
    ov.bubble('sama', 'SAMA BERAT!', { x: W / 2, y: 420, o: sb.o, s: sb.s }, { size: 110 });
    const em = pop(t, 35.9, 39.0, { from: 2 });
    const bp = scr(mine.bean.position.clone().add(mine.bal.position));
    if (em.o > 0) {
      ov.sparkles(t, { n: 18, seed: 31, x: bp.x - 220, y: bp.y - 220, w: 440, h: 440, a: em.o });
      ov.tag('emasSikit', 'EMAS', { x: bp.x, y: bp.y - 210, o: em.o, s: em.s }, { bg: GOLD, pointer: 'down' });
    }
    const kc = pop(t, 37.16, 39.0, { from: 2 });
    ov.html('bean', BEAN, { x: W / 2 - 220, y: 1110, o: kc.o, s: kc.s * 0.9, r: -8 });
    ov.tag('kacang', 'SEBESAR KACANG HIJAU!', { x: W / 2, y: 1270, o: kc.o, s: kc.s }, { bg: GREEN });
    return mine;
  }],
  // S5 — so why is gold expensive? Reason 1: it is rare
  [39.08, 43.9, (t) => {
    const A = STUDIO.A;
    const a = studio.aff;
    a.root.position.set(A + 1.25, 0.4, 0.9);
    crowd(t);
    const th = keys(t, [[39.2, 0], [39.6, 1], [41.4, 1], [41.8, 0]]);
    const th2 = POSES.thinkR.armR;
    const pt = keys(t, [[42.2, 0], [42.6, 1], [43.9, 1]]);
    a.pose({ yaw: Math.PI - 0.25 });
    const bar = studio.bar;
    bar.position.set(A - 1.3, 2.9 + 0.15 * Math.sin(t * 2), 0.6);
    bar.rotation.set(0.25, t * 0.9, 0.1);
    studio.barGlow.position.copy(bar.position).add(V(0, 0, 0.5));
    a.pose({
      yaw: Math.PI - 0.25, blink: blinkAt(t, 7), talk: talk(t), smile: 1, brow: 0.3 + 0.5 * th,
      headRoll: -0.12 * th, lookX: -0.3 * pt + 0.3 * th, lookY: 0.4 * th, headYaw: -0.3 * pt,
      armR: pt > 0.01 ? { reach: mixArm(th2.reach, reachTo(a, bar.position), pt), point: 1, pole: [-1, -0.6, -0.4] } : { reach: mixArm(REST_R, th2.reach, th), pole: th2.pole, point: th, wx: th2.wx * th },
    });
    const k = easeInOut(inv(39.08, 43.9, t));
    lookCam(cam, V(A + lerp(0.4, 0.1, k), 3.2, lerp(-10.4, -9.4, k)), V(A, 2.5, 0.6), 48);
    ov.flash((1 - inv(39.08, 39.4, t)) * 0.9);
    const km = pop(t, 39.1, 43.85);
    ov.bubble('kenapa', 'KENAPA EMAS\nMAHAL?', { x: W / 2, y: 440 + Math.sin(t * 3) * 6, o: km.o, s: km.s }, { size: 104, top: '#fff3a0', bot: '#f5b300' });
    const s1 = pop(t, 41.5, 43.85);
    ov.tag('sebab1', 'SEBAB 1', { x: W / 2, y: 1130, o: s1.o, s: s1.s }, { bg: BLUE, small: true });
    const jr = pop(t, 42.6, 43.85, { from: 2.2 });
    ov.tag('jarang', 'SANGAT JARANG!', { x: W / 2, y: 1260, o: jr.o, s: jr.s }, { bg: GOLD });
    if (jr.o > 0) ov.sparkles(t, { n: 16, seed: 41, y: 1100, h: 300, a: jr.o });
    return studio;
  }],
  // S6 — all the gold ever found would fit in four swimming pools
  [43.9, 51.4, (t) => {
    poolFill(t);
    const a = pools.aff;
    a.root.position.set(8.5, POOL.D, poolZ(0) - 6.8);
    const wow = keys(t, [[49.5, 0], [49.8, 1], [51.0, 1]]);
    a.pose({ yaw: Math.PI - 0.6, blink: blinkAt(t, 8), smile: 1, wow: wow * 0.8, brow: 0.4 + 0.5 * wow, headYaw: -0.3, lookX: -0.3,
      armL: { reach: [lerp(0.55, 0.85, wow), lerp(0.25, 1.85, wow), lerp(0.1, 0.3, wow)], pole: [1, -0.4, -0.5] },
      armR: { reach: [lerp(-0.55, -0.85, wow), lerp(0.25, 1.85, wow), lerp(0.1, 0.3, wow)], pole: [-1, -0.4, -0.5] } });
    const k = easeInOut(inv(43.9, 51.4, t));
    lookCam(cam, V(lerp(8, 4, k), lerp(30, 40, k), lerp(-46, -50, k)), V(0, 0, lerp(-4, 2, k)), 50);
    shadowFollow(pools, 0, 0, 0);
    ov.flash((1 - inv(43.9, 44.25, t)) * 0.9);
    const sm = pop(t, 45.42, 49.8);
    ov.tag('semua', 'SEMUA EMAS DI DUNIA', { x: W / 2, y: 300, o: sm.o, s: sm.s }, { bg: GOLD });
    const fillA = smooth(inv(44.8, 45.4, t)) * (1 - smooth(inv(49.6, 50.0, t)));
    if (fillA > 0) ov.sparkles(t, { n: 34, seed: 43, x: 140, y: 500, w: 800, h: 1000, a: fillA });
    for (let i = 0; i < 4; i++) {
      const q = pop(t, 49.54 + i * 0.18, 51.35, { from: 2 });
      const c = scr(V(0, POOL.D + 0.5, poolZ(i)));
      ov.bubble('n' + i, String(i + 1), { x: c.x, y: c.y, o: q.o, s: q.s }, { size: 150, width: 220, top: '#ffffff', bot: '#cfe8ff' });
    }
    const kr = pop(t, 49.92, 51.35, { from: 2 });
    ov.tag('kolam', '4 KOLAM RENANG JE!', { x: W / 2, y: 300, o: kr.o, s: kr.s }, { bg: BLUE });
    return pools;
  }],
  // S7 — gold never rusts: iron nail vs gold coin over a thousand years
  [51.4, 57.08, (t) => {
    const k = rust(t);
    crowd(t);
    const B = STUDIO.B;
    const kc = easeInOut(inv(51.4, 57.08, t));
    lookCam(cam, V(B + lerp(0.3, -0.2, kc), lerp(4.8, 4.4, kc), lerp(-14.5, -13.2, kc)), V(B, 3.0, 0.8), 50);
    ov.flash((1 - inv(51.4, 51.7, t)) * 0.9);
    const ip = scr(V(B + 1.9, 5.2, 0.8)), gp = scr(V(B - 1.9, 4.8, 0.8));
    const lb = pop(t, 51.5, 57.0);
    ov.tag('besi', 'BESI', { x: ip.x, y: ip.y - 30, o: lb.o, s: lb.s }, { bg: '#6f7f99', small: true });
    ov.tag('emasC', 'EMAS', { x: gp.x, y: gp.y - 30, o: lb.o, s: lb.s }, { bg: GOLD, small: true });
    const yr = Math.round(lerp(0, 1000, smooth(inv(53.2, 56.4, t))) / 10) * 10;
    const yc = pop(t, 53.2, 57.0);
    ov.tag('tahun', `${yr} TAHUN`, { x: W / 2, y: 330, o: yc.o, s: yc.s }, { bg: '#17256b' });
    const bk = pop(t, 52.62, 57.0, { from: 2 });
    const ib = scr(V(B + 1.9, 1.2, 0.0)), gb = scr(V(B - 1.9, 1.2, 0.0));
    ov.tag('karat', 'BERKARAT', { x: ib.x, y: ib.y + 160, o: bk.o * smooth(inv(53.5, 54.0, t)), s: bk.s }, { bg: '#a8481c', small: true });
    const kl = pop(t, 53.98, 57.0, { from: 2 });
    ov.html('tick', TICK, { x: gb.x, y: gb.y + 30, o: kl.o, s: kl.s * 0.55 });
    ov.tag('kilat', 'KEKAL BERKILAT', { x: gb.x, y: gb.y + 160, o: kl.o, s: kl.s }, { bg: GREEN, small: true });
    ov.html('crossI', ICONS.cross(), { x: ib.x, y: ib.y + 30, o: bk.o * smooth(inv(53.5, 54.0, t)), s: bk.s * 0.5 });
    ov.sparkles(t, { n: 14, seed: 47, x: gp.x - 200, y: gp.y - 40, w: 400, h: 400, a: 0.4 + 0.6 * kl.o });
    const tb = pop(t, 52.44, 54.7);
    ov.bubble('takKarat', 'TAK BERKARAT!', { x: W / 2, y: 470, o: tb.o, s: tb.s }, { size: 104, top: '#fff3a0', bot: '#f5b300' });
    return studio;
  }],
  // S8 — many people want gold, but there is only a little: expensive!
  [57.08, 62.74, (t) => {
    crowd(t);
    const C = STUDIO.C;
    const k = easeInOut(inv(57.08, 62.74, t));
    lookCam(cam, V(C + lerp(0.6, 0.2, k), lerp(6.8, 5.4, k), lerp(-11.5, -9.6, k)), V(C, 2.2, 2.2), 50);
    ov.flash((1 - inv(57.08, 57.4, t)) * 0.9);
    const rn = pop(t, 57.08, 59.4);
    ov.tag('ramai', 'RAMAI NAK!', { x: W / 2, y: 300, o: rn.o, s: rn.s }, { bg: '#ff5a7a' });
    studio.people.forEach((p, i) => {
      if (i % 2) return;
      const h = pop(t, 58.0 + i * 0.05, 62.7, { from: 2 });
      const c = scr(p.position.clone().add(V(0, 3.1 * p.scale.y, 0)));
      ov.html('heart' + i, HEART, { x: c.x, y: c.y - Math.abs(Math.sin(t * 3 + i)) * 14, o: h.o, s: h.s * 0.42 });
    });
    const sk = pop(t, 59.52, 62.7);
    const np = scr(V(C, 3.4, 1.5));
    ov.tag('sikit', 'EMAS SIKIT', { x: np.x, y: np.y - 120, o: sk.o, s: sk.s }, { bg: GOLD, pointer: 'down' });
    const pr = pop(t, 60.76, 62.7, { from: 2 });
    ov.html('price', PRICE('RM ↑↑'), { x: W / 2 + 40, y: 1120, o: pr.o, s: pr.s * 0.95, r: -6 });
    const mh = pop(t, 61.98, 62.7, { from: 2.2 });
    ov.bubble('mahalB', 'MAHAL!', { x: W / 2, y: 470, o: mh.o, s: mh.s, r: 3 }, { size: 160, top: '#ffd0a0', bot: '#ff4d5e' });
    if (mh.o > 0) ov.sparkles(t, { n: 20, seed: 53, y: 300, h: 500, a: mh.o });
    return studio;
  }],
  // S9 — safety: fast rivers and mines are dangerous, go with an adult
  [62.74, 69.2, (t) => {
    riverFlow(t, 0.55);
    flakes(t);
    const a = river.aff;
    a.root.visible = true;
    river.pan.visible = false;
    a.root.position.set(0.6, 0.2, -5.6);
    const stop = keys(t, [[63.3, 0], [63.7, 1], [66.8, 1], [67.2, 0]]);
    const wave = keys(t, [[67.4, 0], [67.8, 1], [69.2, 1]]);
    const wv = POSES.waveR(t).armR;
    a.pose({
      yaw: Math.PI + 0.2, blink: blinkAt(t, 9), talk: talk(t), smile: 0.5 + 0.5 * wave, brow: 0.5 + 0.4 * stop,
      headYaw: 0.15, headPitch: 0.1,
      armR: wave > 0 ? { reach: mixArm(REST_R, wv.reach, wave), pole: wv.pole } : { reach: mixArm(REST_R, [-0.35, 1.35, 0.85], stop), pole: [-1, -0.8, -0.2], wx: -1.2 * stop },
      armL: { reach: [0.55, 0.3, 0.15] },
    });
    const k = easeInOut(inv(62.74, 69.2, t));
    lookCam(cam, V(lerp(1.4, 1.0, k), 3.6, lerp(-15.6, -16.4, k)), V(lerp(0.4, 0.5, k), 3.1, -3.0), 50);
    shadowFollow(river, 0, 0, -4);
    ov.flash((1 - inv(62.74, 63.05, t)) * 0.9);
    ov.speedLines(t, { y0: 900, y1: 1100, n: 10, a: 0.35, dir: 1 });
    const ig = pop(t, 62.76, 69.15);
    ov.tag('ingat', 'INGAT!', { x: W / 2, y: 290, o: ig.o, s: ig.s }, { bg: RED });
    const sd = pop(t, 64.42, 69.15);
    ov.tag('deras', 'SUNGAI DERAS', { x: W / 2 + 60, y: 430, o: sd.o, s: sd.s }, { bg: '#1fa0c8' });
    const x1 = pop(t, 64.82, 69.15, { from: 2 });
    ov.html('x1', ICONS.cross(), { x: 170, y: 430, o: x1.o, s: x1.s * 0.42 });
    const lb = pop(t, 66.38, 69.15);
    ov.tag('lombongS', 'LOMBONG', { x: W / 2 + 60, y: 560, o: lb.o, s: lb.s }, { bg: BROWN });
    const x2 = pop(t, 66.5, 69.15, { from: 2 });
    ov.html('x2', ICONS.cross(), { x: 170, y: 560, o: x2.o, s: x2.s * 0.42 });
    const hn = pop(t, 63.42, 66.9);
    ov.html('hand', HAND, { x: 860, y: 760, o: hn.o, s: hn.s * 0.75, r: 8 });
    const dw = pop(t, 67.16, 69.15);
    ov.tag('dewasa', 'MESTI DENGAN ORANG DEWASA', { x: W / 2, y: 690, o: dw.o, s: dw.s }, { bg: BLUE, small: true });
    return river;
  }],
  // S10 — "Apa lagi kita nak belajar lepas ni?"
  [69.2, 72.0, (t) => {
    ringSpin(t);
    const a = homeAff(t);
    const tk = keys(t, [[69.25, 0], [69.65, 1], [72.0, 1]]);
    const th2 = POSES.thinkR.armR;
    a.pose({
      yaw: Math.PI, blink: blinkAt(t, 10), talk: talk(t), smile: 1, brow: 0.3 + 0.4 * tk,
      headRoll: -0.12 * tk, lookX: 0.35 * tk, lookY: 0.4 * tk, headPitch: -0.08 * tk,
      armR: { reach: mixArm(REST_R, th2.reach, tk), pole: th2.pole, point: tk, wx: th2.wx * tk },
    });
    const ap = a.root.position;
    const k = easeInOut(inv(69.2, 72.0, t));
    lookCam(cam, V(ap.x + 0.15, 3.0, ap.z - lerp(4.9, 4.3, k)), V(ap.x, 2.6, ap.z), 46);
    ov.flash((1 - inv(69.2, 69.5, t)) * 0.8);
    const head = scr(V(ap.x, 3.1, ap.z));
    [[69.5, -260, -330, '#ffcf33', -12], [69.8, 250, -380, '#3fa2ff', 10], [70.1, 300, -120, '#ffcf33', 14]].forEach(([a0, dx, dy, c, r], i) => {
      const q = pop(t, a0, 71.95);
      ov.html('qq' + i, ICONS.qmark(c), { x: head.x + dx, y: head.y + dy + Math.sin(t * 3 + i) * 10, o: q.o, s: q.s * 0.85, r });
    });
    return home;
  }],
  // Outro — The Curious Affan logo on a golden stage
  [72.0, SHOT_END, (t) => {
    const k = easeOut(inv(72.0, 72.7, t));
    outro.aff.root.position.set(0, 0, 0);
    const th2 = POSES.thinkR.armR;
    outro.aff.pose({ ...POSES.thinkR, armR: { ...th2 }, smile: 1, blink: blinkAt(t, 9), headRoll: -0.08, lookX: 0.25, lookY: 0.15, headYaw: 0.08 });
    lookCam(cam, V(0, 2.6, lerp(7.5, 5.4, k)), V(0, 2.3, 0), 40);
    const hc = scr(V(0, 2.95, 0));
    ov.flash((1 - inv(72.0, 72.35, t)) * 1.0);
    const g = ov.g;
    const ra = inv(72.1, 72.7, t);
    g.save();
    g.globalAlpha = ra;
    g.strokeStyle = '#fff3b0';
    g.shadowColor = '#fffbe0';
    g.shadowBlur = 40;
    g.lineWidth = 14;
    g.beginPath();
    g.arc(W / 2, hc.y, 420 * (0.85 + 0.15 * easeOut(ra)), 0, Math.PI * 2);
    g.stroke();
    g.restore();
    ov.sparkles(t, { n: 30, seed: 41, y: 260, h: 1150, a: ra });
    const ic = pop(t, 72.6, 99);
    ov.html('oBulb', ICONS.bulb(), { x: 175, y: 470 + Math.sin(t * 2) * 8, o: ic.o, s: ic.s * 0.55, r: -10 });
    ov.html('oQ1', ICONS.qmark('#ffcf33'), { x: 880, y: 420 + Math.sin(t * 2 + 1) * 8, o: ic.o, s: ic.s * 0.9, r: 12 });
    const l1 = pop(t, 72.3, 99), l2 = pop(t, 72.5, 99), l3 = pop(t, 72.7, 99);
    drawLogo(ov, { k: [l1, l2, l3], star: pop(t, 72.9, 99) });
    return outro;
  }],
];

function frame(tn) {
  T_NEW = tn;
  const t = Math.min(shotTime(tn), SHOT_END - 1e-3);
  ov.begin();
  cam.aspect = W / H;
  cam.updateProjectionMatrix();
  river.pan.visible = true;
  const shot = SHOTS.find(([a, b]) => t >= a && t < b) || SHOTS[SHOTS.length - 1];
  const world = shot[2](t);
  if (world.sky) world.sky.position.copy(cam.position);
  renderer.render(world.scene, cam);
  if (world !== outro) ov.vignette(0.22);
  ov.captions(tn, CAPTIONS, KEYWORDS);
  ov.end();
}

// Cover / thumbnail (9:16): Affan in the river with his dulang full of
// glinting gold, big title, episode badge and the series logo. Key elements
// stay inside the centre 3:4 area (y 240-1680) that profile grids show.
const THUMB = { cam: [1.0, 3.7, -6.6], look: [0.0, 2.0, 0.6], fov: 50 };
window.setThumb = (o) => Object.assign(THUMB, o);
function thumbnail() {
  ov.begin();
  cam.aspect = W / H;
  cam.updateProjectionMatrix();
  const t = 12.3;
  riverFlow(t);
  flakes(t);
  river.pan.visible = true;
  const a = river.aff;
  a.root.visible = true;
  a.root.position.copy(AFF_R);
  holdPan(a, t, 0.3, { talk: 0, wow: 0.9, brow: 1, blink: 0, headPitch: 0.08, lookY: 0.05 });
  panNuggets.forEach((m, i) => m.scale.setScalar(1.6));
  lookCam(cam, V(...THUMB.cam), V(...THUMB.look), THUMB.fov);
  river.sky.position.copy(cam.position);
  renderer.render(river.scene, cam);
  panNuggets.forEach((m) => m.scale.setScalar(1));
  const g = ov.g;
  const top = g.createLinearGradient(0, 0, 0, 780);
  top.addColorStop(0, 'rgba(10,40,90,0.72)');
  top.addColorStop(1, 'rgba(10,40,90,0)');
  g.fillStyle = top;
  g.fillRect(0, 0, W, 780);
  const bot = g.createLinearGradient(0, H - 900, 0, H);
  bot.addColorStop(0, 'rgba(8,30,40,0)');
  bot.addColorStop(1, 'rgba(8,30,40,0.75)');
  g.fillStyle = bot;
  g.fillRect(0, H - 900, W, 900);
  ov.vignette(0.25);
  const pc = scr(river.pan.getWorldPosition(V(0, 0, 0)));
  ov.sparkles(1.0, { n: 18, seed: 61, x: pc.x - 240, y: pc.y - 200, w: 480, h: 360, a: 1 });
  ov.tag('thBadge', 'EPISOD 20', { x: W / 2, y: 300 }, { bg: '#2f7bff', small: true });
  ov.bubble('thTitle', 'MACAM MANA\nNAK CARI EMAS?', { x: W / 2, y: 445, r: -2 }, { size: 104, top: '#fff3a0', bot: '#f5b300' });
  ov.tag('thSub', 'KENAPA MAHAL?', { x: 760, y: 1300, r: 4 }, { bg: RED });
  ov.html('thQ', ICONS.qmark('#ffcf33'), { x: 950, y: 820, r: 14, s: 0.9 });
  drawLogo(ov, { y: 1500, scale: 0.5 });
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
