// Episode 017 sets: Affan's dining table at home (the hook and the happy
// ending), a sunny garden of giant vegetables where he learns what each one
// does for the body (broccoli, red capsicum + tomatoes, carrots, spinach), and
// the branded outro.
//
// Garden spots: Affan stands at a spot and the vegetable for that part of the
// story towers behind him. Affan is ~3.7 units tall; giant veg are 3-4x that.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { rng } from '../../shared/core.js';
import { makeAffan } from '../../shared/affan.js';
import { add, makeSky, glow } from '../../shared/props.js';

const std = (color, rough = 0.6, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0, ...extra });

function shadowCfg(light, size, map = 2048, far = 120) {
  light.castShadow = true;
  light.shadow.mapSize.set(map, map);
  const c = light.shadow.camera;
  c.left = -size;
  c.right = size;
  c.top = size;
  c.bottom = -size;
  c.near = 0.5;
  c.far = far;
  light.shadow.bias = -0.0004;
  light.shadow.normalBias = 0.02;
}

function canvasTex(w, h, draw, repeat = false) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

const puffTex = canvasTex(256, 256, (g, w) => {
  const r = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
  r.addColorStop(0, 'rgba(255,255,255,0.95)');
  r.addColorStop(0.5, 'rgba(255,255,255,0.55)');
  r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r;
  g.fillRect(0, 0, w, w);
});
function puff(size, opacity = 0.8) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: puffTex, transparent: true, opacity, depthWrite: false }));
  s.scale.set(size, size * 0.55, 1);
  return s;
}

// --------------------------------------------------------------- vegetables
// Broccoli: pale stalk that branches into a dome of dark-green florets.
export function makeBroccoli(R, s = 1) {
  const g = new THREE.Group();
  const stalk = std(0x9fd060, 0.7);
  add(g, new THREE.CylinderGeometry(0.42 * s, 0.6 * s, 2.6 * s, 14), stalk, [0, 1.3 * s, 0]);
  const greens = [0x2c7a35, 0x358a3b, 0x24692e, 0x3f9443].map((c) => std(c, 0.9));
  const bud = new THREE.IcosahedronGeometry(1, 2);
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + R() * 0.4;
    const d = 0.9 * s;
    const br = add(g, new THREE.CylinderGeometry(0.16 * s, 0.26 * s, 1.5 * s, 8), stalk, [Math.cos(a) * d * 0.5, 2.9 * s, Math.sin(a) * d * 0.5]);
    br.rotation.set(Math.sin(a) * 0.55, 0, -Math.cos(a) * 0.55);
  }
  for (let i = 0; i < 26; i++) {
    const u = R(), v = R() * Math.PI * 2;
    const ph = Math.acos(1 - u * 0.95); // polar angle on the upper dome
    const rr = 1.55 * s;
    const p = [Math.sin(ph) * Math.cos(v) * rr * 1.15, 3.35 * s + Math.cos(ph) * rr * 0.85, Math.sin(ph) * Math.sin(v) * rr * 1.15];
    const r = (0.55 + R() * 0.35) * s;
    const m = add(g, bud, greens[i % 4], p, [R(), R(), R()], [r, r * 0.9, r]);
    // knobbly little buds on each floret
    for (let k = 0; k < 3; k++) add(m, bud, greens[(i + k + 1) % 4], [(R() - 0.5) * 1.1, 0.55 + R() * 0.3, (R() - 0.5) * 1.1], [0, 0, 0], [0.42, 0.42, 0.42]);
  }
  return g;
}

// Carrot planted in a dirt mound: the orange shoulder and a fan of fronds.
export function makeCarrot(R, s = 1) {
  const g = new THREE.Group();
  const orange = std(0xff8a26, 0.55, { emissive: 0x4a1800, emissiveIntensity: 0.15 });
  const top = new THREE.Group();
  top.position.y = 2.6 * s;
  g.add(top);
  const body = add(top, new THREE.ConeGeometry(1.0 * s, 6 * s, 24), orange, [0, -1.0 * s, 0], [Math.PI, 0, 0]);
  body.castShadow = true;
  add(top, new THREE.SphereGeometry(1.0 * s, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), orange, [0, 2.0 * s, 0], [0, 0, 0], [1, 0.35, 1]);
  const ridge = std(0xe8701a, 0.6);
  for (let i = 0; i < 4; i++) add(top, new THREE.TorusGeometry((0.95 - i * 0.12) * s, 0.04 * s, 6, 28), ridge, [0, (1.6 - i * 0.6) * s, 0], [Math.PI / 2, 0, 0]);
  const leaf = [0x3f9c3a, 0x56b445, 0x2f8a34].map((c) => std(c, 0.8));
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + R() * 0.3;
    const tilt = 0.25 + R() * 0.35;
    const f = new THREE.Group();
    f.position.set(0, 2.2 * s, 0);
    f.rotation.set(Math.sin(a) * tilt, 0, -Math.cos(a) * tilt);
    top.add(f);
    const L = (3.2 + R() * 1.6) * s;
    add(f, new THREE.CylinderGeometry(0.05 * s, 0.12 * s, L, 6), leaf[0], [0, L / 2, 0]);
    for (let k = 0; k < 5; k++) add(f, new THREE.SphereGeometry(0.42 * s, 10, 8), leaf[(k + i) % 3], [0, L * (0.45 + k * 0.13), 0], [0, 0, 0], [1.3, 0.5, 0.9]);
  }
  add(g, new THREE.SphereGeometry(1.3 * s, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), std(0x6b4423, 1), [0, 0, 0], [0, 0, 0], [1, 0.3, 1]);
  return g;
}

// Red capsicum: three lobes and a green stem.
export function makeCapsicum(R, s = 1, color = 0xe8322a) {
  const g = new THREE.Group();
  const red = std(color, 0.25, { emissive: 0x300000, emissiveIntensity: 0.2 });
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    add(g, new THREE.SphereGeometry(1.0 * s, 24, 18), red, [Math.cos(a) * 0.48 * s, 1.35 * s, Math.sin(a) * 0.48 * s], [0, 0, 0], [0.85, 1.3, 0.85]);
  }
  add(g, new THREE.CylinderGeometry(0.16 * s, 0.24 * s, 0.9 * s, 10), std(0x2f8a34, 0.6), [0, 3.0 * s, 0], [0.15, 0, 0.1]);
  add(g, new THREE.SphereGeometry(0.6 * s, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), std(0x3f9c3a, 0.6), [0, 2.55 * s, 0], [0, 0, 0], [1, 0.4, 1]);
  return g;
}

// Tomato plant on a stake.
export function makeTomatoPlant(R, s = 1) {
  const g = new THREE.Group();
  add(g, new THREE.CylinderGeometry(0.06 * s, 0.08 * s, 5 * s, 6), std(0x8a5a2b, 0.9), [0, 2.5 * s, 0]);
  const leaf = std(0x3f8f3a, 0.85);
  for (let i = 0; i < 8; i++) add(g, new THREE.IcosahedronGeometry(0.55 * s, 1), leaf, [(R() - 0.5) * 1.4 * s, (1 + i * 0.45) * s, (R() - 0.5) * 1.0 * s], [R(), R(), R()], [1.2, 0.6, 1]);
  const red = std(0xf0362c, 0.3, { emissive: 0x300000, emissiveIntensity: 0.2 });
  for (let i = 0; i < 6; i++) {
    const t = add(g, new THREE.SphereGeometry(0.42 * s, 18, 14), red, [(R() - 0.5) * 1.6 * s, (1.2 + R() * 2.6) * s, 0.35 * s + R() * 0.3 * s], [0, 0, 0], [1, 0.88, 1]);
    add(t, new THREE.ConeGeometry(0.3, 0.12, 5), std(0x2f8a34, 0.6), [0, 0.92, 0]);
  }
  return g;
}

// Spinach rosette: big dark leaves with pale stems and a vein.
export function makeSpinach(R, s = 1) {
  const g = new THREE.Group();
  const leafM = [0x2b7a35, 0x2f8a3c, 0x23692c].map((c) => std(c, 0.7, { side: THREE.DoubleSide }));
  const vein = std(0xa8d878, 0.7);
  const n = 9;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + R() * 0.2;
    const p = new THREE.Group();
    p.rotation.set(0, -a, 0);
    g.add(p);
    const tilt = 0.55 + R() * 0.35 + (i % 2) * 0.15;
    const lf = new THREE.Group();
    lf.rotation.set(0, 0, -(Math.PI / 2 - tilt));
    p.add(lf);
    const L = (2.2 + R() * 0.8) * s;
    add(lf, new THREE.CylinderGeometry(0.07 * s, 0.1 * s, L * 0.45, 6), vein, [0, L * 0.22, 0]);
    add(lf, new THREE.SphereGeometry(1, 20, 14), leafM[i % 3], [0, L * 0.75, 0], [0, 0, 0], [0.75 * s, L * 0.48, 0.1 * s]);
    add(lf, new THREE.BoxGeometry(0.05 * s, L * 0.75, 0.13 * s), vein, [0, L * 0.72, 0]);
  }
  return g;
}

export function makeCabbage(R, s = 1) {
  const g = new THREE.Group();
  add(g, new THREE.SphereGeometry(1.0 * s, 22, 16), std(0xb8e08a, 0.7), [0, 0.9 * s, 0]);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    add(g, new THREE.SphereGeometry(1.0 * s, 18, 12, 0, Math.PI), std(i % 2 ? 0x8fcf6a : 0x7cc35a, 0.7, { side: THREE.DoubleSide }), [Math.cos(a) * 0.4 * s, 0.8 * s, Math.sin(a) * 0.4 * s], [0.3, -a + Math.PI / 2, 0.2], [1.1, 1.0, 0.6]);
  }
  return g;
}

export function makeEggplant(R, s = 1) {
  const g = new THREE.Group();
  add(g, new THREE.CapsuleGeometry(0.55 * s, 1.4 * s, 8, 16), std(0x5b2a7a, 0.25, { emissive: 0x12001e, emissiveIntensity: 0.3 }), [0, 0.6 * s, 0], [0, 0, Math.PI / 2.4]);
  add(g, new THREE.ConeGeometry(0.45 * s, 0.5 * s, 6), std(0x3f8f3a, 0.6), [0.95 * s, 1.0 * s, 0], [0, 0, -Math.PI / 1.7]);
  return g;
}

// Small bite-sized versions for the dinner plate.
function floret(R, s = 0.3) {
  const g = makeBroccoli(R, s);
  return g;
}

// -------------------------------------------------------------- dining room
function clothTex() {
  return canvasTex(256, 256, (g, w) => {
    g.fillStyle = '#ffffff';
    g.fillRect(0, 0, w, w);
    g.fillStyle = 'rgba(255,120,90,0.55)';
    for (let i = 0; i < 8; i++) {
      g.fillRect(i * 32, 0, 16, w);
      g.fillRect(0, i * 32, w, 16);
    }
  }, true);
}
function wallTex() {
  return canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#ffe9c8';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#ffdcae';
    for (let x = 0; x < w; x += 64) g.fillRect(x, 0, 24, h);
  }, true);
}
function floorTex() {
  return canvasTex(512, 512, (g, w, h) => {
    for (let y = 0; y < h; y += 64) {
      for (let x = (y / 64) % 2 ? -128 : 0; x < w; x += 256) {
        g.fillStyle = ['#c58a55', '#b97d4a', '#cf9562'][((x + y) / 64) % 3 | 0];
        g.fillRect(x, y, 254, 62);
      }
    }
  }, true);
}

export function buildDining() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xffe2b8);
  scene.add(new THREE.HemisphereLight(0xfff4e4, 0x8a6a4a, 1.5));
  const key = new THREE.DirectionalLight(0xfff0d8, 2.3);
  key.position.set(4, 9, 8);
  shadowCfg(key, 7, 2048, 40);
  scene.add(key, key.target);
  const fill = new THREE.DirectionalLight(0xbfd8ff, 0.8);
  fill.position.set(-6, 4, 3);
  scene.add(fill);

  const ft = floorTex();
  ft.repeat.set(6, 6);
  add(scene, new THREE.PlaneGeometry(40, 40), std(0xffffff, 0.8, { map: ft }), [0, 0, 0], [-Math.PI / 2, 0, 0]).receiveShadow = true;
  const wt = wallTex();
  wt.repeat.set(4, 1);
  add(scene, new THREE.PlaneGeometry(40, 14), std(0xffffff, 0.95, { map: wt }), [0, 7, -5]);
  // window with a sunny garden view
  const view = canvasTex(512, 384, (g, w, h) => {
    const s = g.createLinearGradient(0, 0, 0, h);
    s.addColorStop(0, '#6fbaf5');
    s.addColorStop(1, '#cfeaff');
    g.fillStyle = s;
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#7cc35a';
    g.beginPath();
    g.ellipse(w * 0.3, h * 1.05, w * 0.6, h * 0.35, 0, 0, Math.PI * 2);
    g.ellipse(w * 0.85, h * 1.1, w * 0.5, h * 0.4, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#fff';
    for (const [x, y, r] of [[120, 90, 40], [160, 80, 50], [200, 95, 36], [380, 140, 30], [410, 130, 40]]) {
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.fill();
    }
  });
  const win = new THREE.Group();
  win.position.set(-4.2, 5.6, -4.95);
  scene.add(win);
  add(win, new THREE.PlaneGeometry(4.2, 3.2), new THREE.MeshBasicMaterial({ map: view }), [0, 0, 0.01], [0, 0, 0], [1, 1, 1], false);
  const frame = std(0xffffff, 0.5);
  for (const [x, y, w, h] of [[0, 1.65, 4.6, 0.25], [0, -1.65, 4.8, 0.3], [-2.2, 0, 0.25, 3.5], [2.2, 0, 0.25, 3.5], [0, 0, 0.14, 3.2], [0, 0, 4.2, 0.14]]) add(win, new THREE.BoxGeometry(w, h, 0.2), frame, [x, y, 0.08]);
  // a picture frame and a wall clock
  const art = canvasTex(256, 256, (g, w) => {
    g.fillStyle = '#fff6e0';
    g.fillRect(0, 0, w, w);
    const cols = ['#ff8a26', '#2f8a34', '#e8322a', '#5b2a7a', '#ffd84a'];
    cols.forEach((c, i) => {
      g.fillStyle = c;
      g.beginPath();
      g.arc(50 + i * 40, 128 + Math.sin(i) * 30, 30, 0, Math.PI * 2);
      g.fill();
    });
  });
  add(scene, new THREE.BoxGeometry(2.0, 2.0, 0.1), std(0x6b4423, 0.6), [4.6, 6.2, -4.95]);
  add(scene, new THREE.PlaneGeometry(1.7, 1.7), new THREE.MeshBasicMaterial({ map: art }), [4.6, 6.2, -4.89], [0, 0, 0], [1, 1, 1], false);
  add(scene, new THREE.CylinderGeometry(0.8, 0.8, 0.12, 32), std(0x2f7bff, 0.5), [1.4, 8.2, -4.93], [Math.PI / 2, 0, 0]);
  add(scene, new THREE.CylinderGeometry(0.66, 0.66, 0.13, 32), std(0xffffff, 0.5), [1.4, 8.2, -4.9], [Math.PI / 2, 0, 0]);
  add(scene, new THREE.BoxGeometry(0.06, 0.5, 0.05), std(0x17256b), [1.4, 8.4, -4.82]);
  add(scene, new THREE.BoxGeometry(0.36, 0.06, 0.05), std(0x17256b), [1.55, 8.2, -4.82]);
  // pendant lamp
  add(scene, new THREE.CylinderGeometry(0.02, 0.02, 3, 6), std(0x333333), [0.4, 10.5, 0.6]);
  add(scene, new THREE.ConeGeometry(1.1, 0.9, 24, 1, true), std(0xffb34a, 0.5, { side: THREE.DoubleSide }), [0.4, 8.9, 0.6]);
  const bulb = glow(0xffe0a0, 3.5, 0.5);
  bulb.position.set(0.4, 8.6, 0.6);
  scene.add(bulb);

  // table: top at y = 1.36, in front of Affan (who stands at the origin)
  const table = new THREE.Group();
  table.position.set(0, 0, 1.55);
  scene.add(table);
  const ct = clothTex();
  ct.repeat.set(3, 2);
  add(table, new RoundedBoxGeometry(7.2, 0.18, 2.8, 3, 0.06), std(0xffffff, 0.9, { map: ct }), [0, 1.27, 0]);
  add(table, new THREE.BoxGeometry(7.24, 0.5, 2.84), std(0xffffff, 0.9, { map: ct }), [0, 1.0, 0]);
  for (const [x, z] of [[-3.2, -1.1], [3.2, -1.1], [-3.2, 1.1], [3.2, 1.1]]) add(table, new THREE.CylinderGeometry(0.12, 0.1, 0.9, 10), std(0x8a5a2b, 0.6), [x, 0.45, z]);

  // plate of food (rice, broccoli, carrot slices, fried chicken) — slides when pushed
  const R = rng(17);
  const plate = new THREE.Group();
  plate.position.set(0, 1.37, -0.15);
  table.add(plate);
  add(plate, new THREE.CylinderGeometry(0.95, 0.75, 0.1, 40), std(0xffffff, 0.3), [0, 0.05, 0]);
  add(plate, new THREE.TorusGeometry(0.88, 0.03, 6, 40), std(0x8fd0ff, 0.4), [0, 0.1, 0], [Math.PI / 2, 0, 0]);
  add(plate, new THREE.SphereGeometry(0.42, 20, 12), std(0xfdfaf2, 0.9), [-0.35, 0.12, 0.05], [0, 0, 0], [1, 0.55, 1]);
  for (const [x, z] of [[0.25, -0.35], [0.5, -0.05], [0.15, -0.6]]) {
    const b = floret(R, 0.075);
    b.position.set(x, 0.1, z);
    b.rotation.set(0, R() * 6, 0.2);
    plate.add(b);
  }
  for (const [x, z] of [[0.55, 0.35], [0.3, 0.5], [0.72, 0.15]]) add(plate, new THREE.CylinderGeometry(0.12, 0.12, 0.05, 16), std(0xff8a26, 0.5), [x, 0.14, z], [0.2, 0, 0.1]);
  // fried chicken drumstick
  const chick = new THREE.Group();
  chick.position.set(-0.2, 0.2, 0.5);
  chick.rotation.set(0, 0.6, Math.PI / 2);
  plate.add(chick);
  add(chick, new THREE.CapsuleGeometry(0.2, 0.3, 6, 12), std(0xc06a1e, 0.85, { emissive: 0x301000, emissiveIntensity: 0.2 }), [0, 0, 0]);
  add(chick, new THREE.CylinderGeometry(0.05, 0.05, 0.35, 8), std(0xfff6e6, 0.5), [0, 0.4, 0]);
  add(chick, new THREE.SphereGeometry(0.07, 8, 6), std(0xfff6e6, 0.5), [0.04, 0.58, 0]);
  add(chick, new THREE.SphereGeometry(0.07, 8, 6), std(0xfff6e6, 0.5), [-0.04, 0.58, 0]);
  // glass of water
  add(table, new THREE.CylinderGeometry(0.22, 0.19, 0.6, 20), new THREE.MeshPhysicalMaterial({ color: 0xcfeaff, roughness: 0.05, transparent: true, opacity: 0.45 }), [1.9, 1.63, -0.2]);
  add(table, new THREE.CylinderGeometry(0.2, 0.18, 0.4, 20), new THREE.MeshBasicMaterial({ color: 0x9fd6ff, transparent: true, opacity: 0.5 }), [1.9, 1.55, -0.2]);
  // a fork-held broccoli floret Affan eats at the end (placed at his hand per frame)
  const bite = floret(R, 0.08);
  bite.visible = false;
  scene.add(bite);

  const aff = makeAffan();
  scene.add(aff.root);
  return { scene, aff, plate, table, bite, chick };
}

// ------------------------------------------------------------------ garden
export const SPOT = {
  hub: new THREE.Vector3(0, 0, 0),
  broc: new THREE.Vector3(-26, 0, -6),
  caps: new THREE.Vector3(26, 0, -6),
  carrot: new THREE.Vector3(-22, 0, 26),
  spin: new THREE.Vector3(22, 0, 26),
};

function signTex() {
  return canvasTex(512, 220, (g, w, h) => {
    g.fillStyle = '#ffe6a8';
    g.beginPath();
    g.roundRect(6, 6, w - 12, h - 12, 30);
    g.fill();
    g.strokeStyle = '#7a4e2c';
    g.lineWidth = 12;
    g.stroke();
    g.fillStyle = '#2f6b3a';
    g.font = '800 92px "Baloo 2", sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('KEBUN SAYUR', w / 2, h / 2 + 6);
  });
}

export function buildGarden() {
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xdff1ff, 90, 420);
  const sky = makeSky({ top: 0x3d8de6, mid: 0x7cc0f5, horizon: 0xdff1ff, bottom: 0x9fd07a });
  scene.add(sky);
  scene.add(new THREE.HemisphereLight(0xf2f8ff, 0x5f8f4a, 1.45));
  const sunL = new THREE.DirectionalLight(0xfff2da, 2.5);
  sunL.position.set(14, 30, 18);
  shadowCfg(sunL, 22, 2048, 120);
  scene.add(sunL, sunL.target);
  const sun = new THREE.Group();
  sun.position.set(260, 300, -700);
  sun.add(new THREE.Mesh(new THREE.CircleGeometry(36, 40), new THREE.MeshBasicMaterial({ color: 0xfff6d0, fog: false })));
  sun.add(glow(0xfff0a8, 220, 0.9), glow(0xffd36b, 520, 0.4));
  sun.lookAt(0, 0, 0);
  scene.add(sun);

  const R = rng(1717);
  // grass
  const ground = add(scene, new THREE.CircleGeometry(600, 64), std(0x7cc35a, 1), [0, 0, 0], [-Math.PI / 2, 0, 0]);
  ground.receiveShadow = true;
  // soil beds under each spot
  const soil = std(0x7a5232, 1);
  for (const k of ['broc', 'caps', 'carrot', 'spin']) {
    const p = SPOT[k];
    add(scene, new RoundedBoxGeometry(22, 0.5, 12, 2, 0.2), soil, [p.x, 0.0, p.z - 7]).receiveShadow = true;
  }
  // grass paths between beds (lighter)
  add(scene, new THREE.PlaneGeometry(6, 120), std(0xa7d77e, 1), [0, 0.02, 0], [-Math.PI / 2, 0, 0]).receiveShadow = true;
  add(scene, new THREE.PlaneGeometry(120, 6), std(0xa7d77e, 1), [0, 0.02, 10], [-Math.PI / 2, 0, 0]).receiveShadow = true;

  const place = (obj, x, z, ry = 0) => {
    obj.position.set(x, 0, z);
    obj.rotation.y = ry;
    scene.add(obj);
    return obj;
  };
  // hero veg at each spot
  const broc = place(makeBroccoli(R, 2.5), SPOT.broc.x - 3, SPOT.broc.z - 10);
  place(makeBroccoli(R, 2.2), SPOT.broc.x + 7, SPOT.broc.z - 11, 1);
  place(makeBroccoli(R, 1.6), SPOT.broc.x - 11, SPOT.broc.z - 5, 2);
  const caps = place(makeCapsicum(R, 2.6), SPOT.caps.x + 3, SPOT.caps.z - 8);
  place(makeCapsicum(R, 1.5, 0xffb11f), SPOT.caps.x + 10, SPOT.caps.z - 5, 1);
  place(makeCapsicum(R, 1.7, 0xff6a1f), SPOT.caps.x - 7, SPOT.caps.z - 9, 0.5);
  for (let i = 0; i < 5; i++) place(makeTomatoPlant(R, 1.8), SPOT.caps.x - 10 + i * 4.5, SPOT.caps.z - 13, R());
  const carrot = place(makeCarrot(R, 2.4), SPOT.carrot.x - 2, SPOT.carrot.z - 8);
  place(makeCarrot(R, 1.6), SPOT.carrot.x + 7, SPOT.carrot.z - 10, 1);
  place(makeCarrot(R, 1.4), SPOT.carrot.x - 10, SPOT.carrot.z - 6, 2);
  const spin = place(makeSpinach(R, 3.4), SPOT.spin.x + 2, SPOT.spin.z - 8);
  place(makeSpinach(R, 2.2), SPOT.spin.x + 10, SPOT.spin.z - 6, 1);
  place(makeSpinach(R, 2.0), SPOT.spin.x - 8, SPOT.spin.z - 9, 2);
  // background veg scattered around the edges of the garden
  const makers = [makeCabbage, makeEggplant, makeCabbage, makeTomatoPlant, makeBroccoli, makeCarrot, makeSpinach];
  for (let i = 0; i < 46; i++) {
    const a = R() * Math.PI * 2, d = 46 + R() * 50;
    const x = Math.cos(a) * d, z = Math.sin(a) * d - 10;
    const mk = makers[i % makers.length];
    place(mk(R, 1.2 + R() * 1.6), x, z, R() * 6);
  }
  // hub veg ring (seen in the wide reveal)
  for (let i = 0; i < 10; i++) {
    const a = Math.PI * (1.05 + (i / 9) * 0.9), d = 13 + R() * 3;
    const mk = [makeCabbage, makeEggplant, makeCapsicum, makeCabbage, makeTomatoPlant][i % 5];
    place(mk(R, 1.0 + R() * 0.6), Math.cos(a) * d, Math.sin(a) * d - 4, R() * 6);
  }
  // signpost near the hub
  const sign = new THREE.Group();
  sign.position.set(-5.5, 0, -1.5);
  sign.rotation.y = 0.35;
  scene.add(sign);
  const wood = std(0x7a4e2c, 0.85);
  add(sign, new THREE.BoxGeometry(0.22, 3.4, 0.22), wood, [-1.4, 1.7, 0]);
  add(sign, new THREE.BoxGeometry(0.22, 3.4, 0.22), wood, [1.4, 1.7, 0]);
  add(sign, new THREE.BoxGeometry(3.4, 1.45, 0.12), new THREE.MeshStandardMaterial({ map: signTex(), roughness: 0.8 }), [0, 2.9, 0.1]);
  // distant hills and clouds
  for (let i = 0; i < 22; i++) add(scene, new THREE.SphereGeometry(50 + R() * 40, 20, 12), std([0x6fb35a, 0x82c46a, 0x5ea24e][i % 3], 1), [-500 + i * 48, -14, -260 - R() * 80], [0, 0, 0], [1.6, 0.6, 1], false);
  for (let i = 0; i < 16; i++) {
    const c = puff(60 + R() * 60, 0.85);
    c.position.set(-400 + R() * 800, 70 + R() * 70, -260 - R() * 120);
    scene.add(c);
  }
  // butterflies (simple two-wing sprites) animated by the episode
  const flies = [];
  const wingM = [0xffd84a, 0xff9fd1, 0x8fd8ff].map((c) => new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide }));
  for (let i = 0; i < 8; i++) {
    const b = new THREE.Group();
    const wl = add(b, new THREE.CircleGeometry(0.28, 10), wingM[i % 3], [-0.25, 0, 0], [0, 0, 0], [1, 0.8, 1], false);
    const wr = add(b, new THREE.CircleGeometry(0.28, 10), wingM[i % 3], [0.25, 0, 0], [0, 0, 0], [1, 0.8, 1], false);
    b.userData = { wl, wr, seed: R() * 10, r: 4 + R() * 6 };
    scene.add(b);
    flies.push(b);
  }

  const aff = makeAffan();
  scene.add(aff.root);
  // keep the shadow camera on wherever Affan is
  const focus = (p) => {
    sunL.position.set(p.x + 14, 30, p.z + 18);
    sunL.target.position.set(p.x, 0, p.z - 4);
    sunL.target.updateMatrixWorld();
  };
  return { scene, aff, sun, sunL, focus, flies, broc, caps, carrot, spin, sign };
}

// ------------------------------------------------------------------ outro
export function buildOutro() {
  const scene = new THREE.Scene();
  const c = document.createElement('canvas');
  c.width = 540;
  c.height = 960;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(270, 380, 40, 270, 420, 700);
  gr.addColorStop(0, '#b8f0a0');
  gr.addColorStop(0.45, '#4fbf6a');
  gr.addColorStop(1, '#1f7f4a');
  g.fillStyle = gr;
  g.fillRect(0, 0, 540, 960);
  const bg = new THREE.CanvasTexture(c);
  bg.colorSpace = THREE.SRGBColorSpace;
  scene.background = bg;
  scene.add(new THREE.HemisphereLight(0xeaf4ff, 0x6a8a6a, 1.5));
  const key = new THREE.DirectionalLight(0xfff2e0, 2.4);
  key.position.set(3, 6, 8);
  shadowCfg(key, 5);
  key.shadow.normalBias = 0.03;
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xdfffe0, 2.0);
  rim.position.set(-6, 5, -6);
  scene.add(rim);
  const aff = makeAffan();
  scene.add(aff.root);
  const halo = glow(0xfff2b0, 9, 0.35);
  halo.position.set(0, 2.9, -2);
  scene.add(halo);
  const R = rng(5);
  const held = makeBroccoli(R, 0.2);
  scene.add(held);
  return { scene, aff, held };
}
