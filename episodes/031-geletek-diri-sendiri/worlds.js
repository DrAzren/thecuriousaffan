// Episode 031 sets:
//  - a sunny living room at home, where Kakak tickles Affan;
//  - a "dalam kepala" (inside the head) imagination stage: a big cartoon brain
//    floating above Affan, with a glowing cerebellum and its little guard who
//    tries to guess where a touch will land;
//  - the branded outro stage from Episode 005.
// Kakak is built from the same procedural rig as Affan (re-coloured, taller,
// no glasses, with a ponytail), so she poses with the same IK.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { rng } from '../../shared/core.js';
import { makeAffan, AFFAN } from '../../shared/affan.js';
import { add, makeSky, makeStars, glow, glowTex } from '../../shared/props.js';
import { buildOutro } from '../005-bulan-ikut-kereta/worlds.js';

export { buildOutro };

const std = (color, rough = 0.7, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0, ...extra });

function shadowCfg(light, size, map = 2048) {
  light.castShadow = true;
  light.shadow.mapSize.set(map, map);
  const c = light.shadow.camera;
  c.left = c.bottom = -size;
  c.right = c.top = size;
  c.near = 0.5;
  c.far = 80;
  light.shadow.bias = -0.0005;
  light.shadow.normalBias = 0.02;
}

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

// ------------------------------------------------------------------ Kakak
// Affan's big sister: same rig, raspberry jacket, sunny-yellow T-shirt, purple
// trousers, no glasses, a high ponytail with a pink hair tie. ~15% taller.
export const KAKAK = { jacket: 0xd9487f, shirt: 0xffcf4a, stripe: 0xffcf4a, pants: 0x6b4fa8, tie: 0xff7ab0 };
export function makeKakak() {
  const k = makeAffan();
  k.root.name = 'Kakak';
  const swap = new Map([
    [AFFAN.navy, KAKAK.jacket],
    [AFFAN.shirt, KAKAK.shirt],
    [AFFAN.peach, KAKAK.stripe],
    [AFFAN.pants, KAKAK.pants],
  ]);
  const done = new Set();
  const near = (c, hex) => {
    const d = new THREE.Color(hex);
    return Math.abs(c.r - d.r) + Math.abs(c.g - d.g) + Math.abs(c.b - d.b) < 0.01;
  };
  k.root.traverse((o) => {
    if (!o.isMesh || done.has(o.material) || !o.material.color) return;
    done.add(o.material);
    for (const [from, to] of swap) {
      if (!near(o.material.color, from)) continue;
      o.material.color.setHex(to);
      if (o.material.emissive) o.material.emissive.setHex(0x1a0610);
      break;
    }
  });
  k.parts.glasses.visible = false;
  const head = k.parts.head;
  const hair = std(AFFAN.hair, 0.42, { emissive: 0x0d0805, emissiveIntensity: 0.2 });
  // ponytail: a tie at the back of the crown and a swinging tail
  const tieMat = std(KAKAK.tie, 0.5, { emissive: 0x401020, emissiveIntensity: 0.3 });
  const tie = add(head, new THREE.TorusGeometry(0.13, 0.06, 10, 20), tieMat, [0, 0.42, -0.72], [0.9, 0, 0]);
  const tail = new THREE.Group();
  tail.position.set(0, 0.42, -0.78);
  head.add(tail);
  add(tail, new THREE.SphereGeometry(0.22, 18, 14), hair, [0, -0.05, -0.12], [0, 0, 0], [0.9, 1, 1.1]);
  add(tail, new THREE.SphereGeometry(0.2, 18, 14), hair, [0, -0.38, -0.2], [0, 0, 0], [0.8, 1.5, 0.9]);
  add(tail, new THREE.SphereGeometry(0.13, 16, 12), hair, [0, -0.72, -0.17], [0, 0, 0], [0.75, 1.3, 0.8]);
  // a little bow on the tie
  for (const s of [-1, 1]) add(head, new THREE.ConeGeometry(0.12, 0.22, 12), tieMat, [0.15 * s, 0.5, -0.72], [0, 0, (Math.PI / 2) * s]);
  // longer side locks that frame the face
  for (const s of [-1, 1]) add(head, new THREE.CapsuleGeometry(0.11, 0.42, 6, 12), hair, [0.74 * s, -0.08, -0.12], [0.1, 0, 0.12 * s]);
  k.root.scale.setScalar(1.15);
  k.tail = tail;
  void tie;
  return k;
}

// ------------------------------------------------------------- living room
const floorTex = canvasTex(1024, 1024, (g, w, h) => {
  g.fillStyle = '#d7a874';
  g.fillRect(0, 0, w, h);
  const R = rng(5);
  const pw = w / 8;
  for (let i = 0; i < 8; i++) {
    const off = (i % 2) * 300;
    g.fillStyle = `hsl(${28 + R() * 6}, ${46 + R() * 10}%, ${58 + R() * 8}%)`;
    g.fillRect(i * pw + 2, 0, pw - 4, h);
    g.strokeStyle = 'rgba(120,70,30,0.35)';
    g.lineWidth = 3;
    for (let y = off % 600; y < h; y += 600) {
      g.beginPath();
      g.moveTo(i * pw, y);
      g.lineTo(i * pw + pw, y);
      g.stroke();
    }
    g.strokeStyle = 'rgba(140,90,40,0.12)';
    g.lineWidth = 2;
    for (let k = 0; k < 6; k++) {
      const x = i * pw + 10 + R() * (pw - 20);
      g.beginPath();
      g.moveTo(x, 0);
      g.bezierCurveTo(x + 8, h * 0.3, x - 8, h * 0.6, x + 4, h);
      g.stroke();
    }
  }
});
floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping;
floorTex.repeat.set(3, 3);

const wallTex = canvasTex(512, 512, (g, w, h) => {
  g.fillStyle = '#bfe6d8';
  g.fillRect(0, 0, w, h);
  g.fillStyle = 'rgba(255,255,255,0.35)';
  for (let y = 40; y < h; y += 96) for (let x = (y / 96) % 2 ? 48 : 0; x < w; x += 96) {
    g.beginPath();
    g.arc(x + 24, y, 7, 0, Math.PI * 2);
    g.fill();
  }
});
wallTex.wrapS = wallTex.wrapT = THREE.RepeatWrapping;
wallTex.repeat.set(6, 3);

const skyTex = canvasTex(256, 512, (g, w, h) => {
  const gr = g.createLinearGradient(0, 0, 0, h);
  gr.addColorStop(0, '#5fb4ff');
  gr.addColorStop(0.7, '#bfe4ff');
  gr.addColorStop(1, '#e9f7ff');
  g.fillStyle = gr;
  g.fillRect(0, 0, w, h);
  g.fillStyle = 'rgba(255,255,255,0.95)';
  for (const [x, y, r] of [[60, 150, 34], [100, 140, 44], [145, 155, 32], [180, 320, 26], [212, 312, 34], [240, 324, 24]]) {
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  }
  // a palm tree silhouette at the bottom
  g.fillStyle = '#4caf6a';
  g.fillRect(0, h - 60, w, 60);
  g.strokeStyle = '#7a5434';
  g.lineWidth = 12;
  g.beginPath();
  g.moveTo(70, h - 50);
  g.quadraticCurveTo(80, h - 160, 60, h - 230);
  g.stroke();
  g.fillStyle = '#2f8f52';
  for (let i = 0; i < 6; i++) {
    g.save();
    g.translate(60, h - 230);
    g.rotate(-2.6 + i * 0.95);
    g.beginPath();
    g.ellipse(45, 0, 48, 12, 0, 0, Math.PI * 2);
    g.fill();
    g.restore();
  }
});

const frameArt = (c1, c2, kind) => canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = c1;
  g.fillRect(0, 0, w, h);
  g.fillStyle = c2;
  if (kind === 0) {
    g.beginPath();
    g.arc(128, 110, 50, 0, Math.PI * 2);
    g.fill();
    g.fillRect(0, 180, w, 76);
  } else {
    g.beginPath();
    g.moveTo(20, 220);
    g.lineTo(110, 70);
    g.lineTo(170, 160);
    g.lineTo(210, 110);
    g.lineTo(250, 220);
    g.fill();
  }
});

export function buildLivingRoom() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf6e8cf);
  scene.add(new THREE.HemisphereLight(0xfff6e8, 0x9a7a5a, 1.35));
  const key = new THREE.DirectionalLight(0xfff0d8, 2.6);
  key.position.set(-6, 9, 7);
  shadowCfg(key, 7);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xd8ecff, 0.8);
  fill.position.set(7, 5, 6);
  scene.add(fill);
  const bounce = new THREE.PointLight(0xffd9a8, 6, 12, 2);
  bounce.position.set(0, 1.2, 3);
  scene.add(bounce);

  const floor = add(scene, new THREE.PlaneGeometry(40, 40), std(0xffffff, 0.8, { map: floorTex }), [0, 0, 0], [-Math.PI / 2, 0, 0], [1, 1, 1], false);
  floor.receiveShadow = true;
  const wallMat = std(0xffffff, 0.95, { map: wallTex });
  const back = add(scene, new THREE.PlaneGeometry(40, 14), wallMat, [0, 7, -4.2], [0, 0, 0], [1, 1, 1], false);
  back.receiveShadow = true;
  const side = add(scene, new THREE.PlaneGeometry(20, 14), std(0xf6dcb4, 0.95), [-7.5, 7, 4], [0, Math.PI / 2, 0], [1, 1, 1], false);
  side.receiveShadow = true;
  // skirting board
  add(scene, new THREE.BoxGeometry(40, 0.3, 0.08), std(0xffffff, 0.6), [0, 0.15, -4.15], [0, 0, 0], [1, 1, 1], false);

  // window with a sunny sky, white frame and curtains
  const win = new THREE.Group();
  win.position.set(3.4, 4.6, -4.15);
  scene.add(win);
  add(win, new THREE.PlaneGeometry(3.0, 3.4), new THREE.MeshBasicMaterial({ map: skyTex }), [0, 0, 0.01], [0, 0, 0], [1, 1, 1], false);
  const wf = std(0xffffff, 0.5);
  for (const [x, y, w, h] of [[0, 1.75, 3.3, 0.18], [0, -1.75, 3.5, 0.24], [-1.58, 0, 0.18, 3.6], [1.58, 0, 0.18, 3.6], [0, 0, 0.1, 3.4], [0, 0.2, 3.0, 0.1]]) add(win, new THREE.BoxGeometry(w, h, 0.14), wf, [x, y, 0.07]);
  const cur = std(0xff9a7a, 0.9, { emissive: 0x3a1006, emissiveIntensity: 0.2 });
  for (const s of [-1, 1]) {
    for (let i = 0; i < 4; i++) add(win, new THREE.CylinderGeometry(0.16, 0.2, 4.2, 12), cur, [s * (1.85 + i * 0.22), -0.3, 0.3], [0, 0, 0], [1, 1, 0.6]);
  }
  add(win, new THREE.CylinderGeometry(0.05, 0.05, 5.6, 8), std(0xb98a5a, 0.5), [0, 1.95, 0.35], [0, 0, Math.PI / 2]);
  const sun = glow(0xfff2c8, 6, 0.25);
  sun.position.set(3.4, 4.6, -3.6);
  scene.add(sun);

  // sofa behind the children
  const sofa = new THREE.Group();
  sofa.position.set(-2.2, 0, -2.9);
  scene.add(sofa);
  const sm = std(0x2f9e9a, 0.85, { emissive: 0x062220, emissiveIntensity: 0.25 });
  add(sofa, new RoundedBoxGeometry(4.6, 0.8, 1.6, 3, 0.18), sm, [0, 0.75, 0]);
  add(sofa, new RoundedBoxGeometry(4.6, 1.5, 0.45, 3, 0.18), sm, [0, 1.55, -0.62]);
  for (const s of [-1, 1]) add(sofa, new RoundedBoxGeometry(0.45, 1.25, 1.6, 3, 0.18), sm, [s * 2.3, 1.0, 0]);
  const cush = [std(0xffd166, 0.9), std(0xff7a8a, 0.9)];
  add(sofa, new RoundedBoxGeometry(0.9, 0.8, 0.3, 3, 0.14), cush[0], [-1.4, 1.5, -0.25], [-0.2, 0.2, 0.1]);
  add(sofa, new RoundedBoxGeometry(0.9, 0.8, 0.3, 3, 0.14), cush[1], [1.4, 1.5, -0.25], [-0.2, -0.2, -0.1]);
  for (const s of [-1, 1]) add(sofa, new THREE.CylinderGeometry(0.08, 0.06, 0.35, 8), std(0x7a5434, 0.5), [s * 2.1, 0.17, 0.5]);

  // rug
  const rug = add(scene, new THREE.CircleGeometry(3.6, 48), std(0xffc866, 0.95), [0.2, 0.012, 0.6], [-Math.PI / 2, 0, 0], [1.25, 1, 1], false);
  rug.receiveShadow = true;
  add(scene, new THREE.RingGeometry(3.0, 3.2, 48), std(0xff8a5c, 0.95), [0.2, 0.016, 0.6], [-Math.PI / 2, 0, 0], [1.25, 1, 1], false).receiveShadow = true;

  // pictures on the wall
  const R = rng(9);
  [[-2.6, 5.4, 1.4, 1.1, '#ffe7a8', '#ff8a5c', 0], [-0.6, 5.9, 1.0, 1.2, '#cfe8ff', '#4caf6a', 1]].forEach(([x, y, w, h, c1, c2, k]) => {
    add(scene, new THREE.BoxGeometry(w + 0.18, h + 0.18, 0.08), std(0xb98a5a, 0.5), [x, y, -4.12]);
    add(scene, new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: frameArt(c1, c2, k) }), [x, y, -4.07], [0, 0, 0], [1, 1, 1], false);
  });
  // potted plant
  const pot = new THREE.Group();
  pot.position.set(6.0, 0, -2.6);
  scene.add(pot);
  add(pot, new THREE.CylinderGeometry(0.55, 0.42, 1.0, 20), std(0xe07a4f, 0.7), [0, 0.5, 0]);
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    add(pot, new THREE.SphereGeometry(0.42, 12, 10), std([0x3f9a50, 0x4fb060, 0x2f8a45][i % 3], 0.8), [Math.cos(a) * 0.45, 1.6 + R() * 0.9, Math.sin(a) * 0.35], [0, a, 0.5], [0.6, 1.4, 0.35]);
  }
  // toy ball and blocks on the floor
  add(scene, new THREE.SphereGeometry(0.35, 24, 16), std(0x4a8dff, 0.4), [3.6, 0.35, 2.4]);
  [[4.3, 0, 1.6, 0xff6b6b], [4.7, 0, 1.9, 0xffd166], [4.45, 0.5, 1.75, 0x43b85c]].forEach(([x, y, z, c]) => add(scene, new RoundedBoxGeometry(0.5, 0.5, 0.5, 2, 0.06), std(c, 0.6), [x, y + 0.25, z], [0, R(), 0]));

  const aff = makeAffan();
  const kak = makeKakak();
  scene.add(aff.root, kak.root);
  return { scene, aff, kak, key };
}

// ------------------------------------------------------- inside-the-head stage
// Brain floats above Affan, front towards +x, cerebellum at the back-bottom (-x).
export const BRAIN = new THREE.Vector3(0, 7.15, -1.2);
export const CEREB = new THREE.Vector3(-1.55, 6.05, -1.2);

function lumpyEllipsoid(rx, ry, rz, folds, seed, amp = 0.06) {
  const g = new THREE.SphereGeometry(1, 96, 64);
  const p = g.attributes.position;
  const R = rng(seed);
  const ph = [R() * 6, R() * 6, R() * 6];
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const n = Math.sin(folds * x + 2.1 * Math.sin(3 * y + ph[0]) + ph[1]) * Math.sin(folds * 0.9 * y + 1.7 * Math.sin(2.6 * z + ph[2])) +
      0.6 * Math.sin(folds * 1.3 * z + 1.3 * Math.sin(4 * x));
    const r = 1 + amp * n;
    p.setXYZ(i, x * rx * r, y * ry * r, z * rz * r);
  }
  g.computeVertexNormals();
  return g;
}

function stripedEllipsoid(rx, ry, rz, stripes) {
  const g = new THREE.SphereGeometry(1, 72, 48);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const r = 1 + 0.045 * Math.abs(Math.sin(stripes * (y + 0.15 * x)));
    p.setXYZ(i, x * rx * r, y * ry * r, z * rz * r);
  }
  g.computeVertexNormals();
  return g;
}

// The cerebellum's guard: a round, friendly helper with a cap and a sign board.
function makeGuard() {
  const g = new THREE.Group();
  const body = add(g, new THREE.SphereGeometry(0.42, 28, 20), std(0xffd84a, 0.5, { emissive: 0x4a3400, emissiveIntensity: 0.3 }), [0, 0, 0], [0, 0, 0], [1, 1.05, 0.95]);
  const eyes = [];
  for (const s of [-1, 1]) {
    const e = add(g, new THREE.SphereGeometry(0.11, 16, 12), std(0xffffff, 0.3, { emissive: 0xffffff, emissiveIntensity: 0.15 }), [0.14 * s, 0.08, 0.36]);
    add(e, new THREE.SphereGeometry(0.06, 12, 10), std(0x111111, 0.3), [0, 0, 0.07]);
    add(e, new THREE.SphereGeometry(0.02, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }), [0.025, 0.03, 0.12]);
    eyes.push(e);
  }
  const smile = add(g, new THREE.TorusGeometry(0.1, 0.022, 8, 16, Math.PI), std(0x5e1f24, 0.5), [0, -0.1, 0.38], [0, 0, Math.PI]);
  const oMouth = add(g, new THREE.SphereGeometry(0.07, 14, 10), std(0x5e1f24, 0.5), [0, -0.13, 0.37], [0, 0, 0], [1, 1.3, 0.4]);
  oMouth.visible = false;
  for (const s of [-1, 1]) add(g, new THREE.SphereGeometry(0.06, 10, 8), new THREE.MeshBasicMaterial({ color: 0xff9a8a, transparent: true, opacity: 0.55 }), [0.27 * s, -0.04, 0.3], [0, 0, 0], [1, 0.6, 0.4], false);
  // cap
  const cap = new THREE.Group();
  cap.position.set(0, 0.34, 0);
  g.add(cap);
  add(cap, new THREE.SphereGeometry(0.3, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), std(0x2f6fff, 0.5), [0, 0, 0], [0, 0, 0], [1.1, 0.8, 1.1]);
  add(cap, new THREE.CylinderGeometry(0.28, 0.32, 0.04, 20, 1, false, -Math.PI / 2, Math.PI), std(0x1c3f9a, 0.5), [0, 0.01, 0.12], [0.15, 0, 0]);
  add(cap, new THREE.SphereGeometry(0.06, 12, 8), std(0xffd84a, 0.4, { emissive: 0x806000, emissiveIntensity: 0.5 }), [0, 0.12, 0.3]);
  // stubby arms holding the sign board
  const armMat = std(0xf2c23a, 0.5);
  for (const s of [-1, 1]) add(g, new THREE.CapsuleGeometry(0.07, 0.22, 4, 10), armMat, [0.4 * s, -0.08, 0.15], [0.4, 0, -0.9 * s]);
  const board = new THREE.Group();
  board.position.set(0.95, 0.15, 0.25);
  g.add(board);
  add(board, new RoundedBoxGeometry(1.25, 0.8, 0.07, 3, 0.05), std(0xffffff, 0.5, { emissive: 0xffffff, emissiveIntensity: 0.15 }), [0, 0, 0]);
  add(board, new RoundedBoxGeometry(1.33, 0.88, 0.05, 3, 0.05), std(0x17256b, 0.5), [0, 0, -0.03]);
  add(board, new THREE.CylinderGeometry(0.03, 0.03, 0.6, 8), std(0x9a6a3a, 0.6), [-0.45, -0.6, 0]);
  return { group: g, body, eyes, smile, oMouth, cap, board };
}

export function buildMindStage() {
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x8a7fd8, 30, 140);
  const sky = makeSky({ top: 0x2a1f74, mid: 0x5a4bbf, horizon: 0xb8a6f2, bottom: 0x6f62c8 });
  const stars = makeStars(420, 1600, 17);
  stars.material.uniforms.uAlpha.value = 0.55;
  scene.add(sky, stars);
  scene.add(new THREE.HemisphereLight(0xf2ecff, 0x6a5aa8, 1.45));
  const key = new THREE.DirectionalLight(0xfff2e6, 2.3);
  key.position.set(5, 12, 10);
  shadowCfg(key, 9);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xc8b8ff, 1.4);
  rim.position.set(-8, 7, -8);
  scene.add(rim);

  // round stage with a soft glowing edge
  const stage = new THREE.Group();
  scene.add(stage);
  const floor = add(stage, new THREE.CylinderGeometry(6.5, 6.8, 0.4, 64), std(0xf3e8ff, 0.8), [0, -0.2, 0]);
  floor.receiveShadow = true;
  add(stage, new THREE.TorusGeometry(6.6, 0.08, 8, 96), new THREE.MeshBasicMaterial({ color: 0xffd6ff }), [0, 0.0, 0], [Math.PI / 2, 0, 0], [1, 1, 1], false);
  const R = rng(31);
  // floating thought bubbles in the background
  const puffs = new THREE.Group();
  scene.add(puffs);
  for (let i = 0; i < 26; i++) {
    const a = R() * Math.PI * 2, r = 9 + R() * 14;
    const m = add(puffs, new THREE.SphereGeometry(0.4 + R() * 0.9, 18, 12), std([0xffffff, 0xffd6f0, 0xd6e4ff][i % 3], 0.6, { emissive: 0x302060, emissiveIntensity: 0.25, transparent: true, opacity: 0.85 }), [Math.cos(a) * r, 2 + R() * 12, -6 - Math.abs(Math.sin(a)) * r], [0, 0, 0], [1, 1, 1], false);
    m.userData.ph = R() * 10;
  }

  // ------------------------------------------------------------- the brain
  const brain = new THREE.Group();
  brain.position.copy(BRAIN);
  scene.add(brain);
  const pink = std(0xff9ec4, 0.55, { emissive: 0x5a1030, emissiveIntensity: 0.22 });
  const cortex = add(brain, lumpyEllipsoid(2.35, 1.6, 1.75, 13, 4, 0.055), pink, [0, 0, 0]);
  // cerebellum (back-bottom), striped, with its own glow material
  const cerebMat = std(0xff7aa8, 0.5, { emissive: 0xff3d7f, emissiveIntensity: 0.15 });
  const cereb = add(brain, stripedEllipsoid(0.95, 0.62, 1.15, 26), cerebMat, CEREB.clone().sub(BRAIN).toArray());
  // brain stem
  add(brain, new THREE.CylinderGeometry(0.32, 0.24, 1.4, 16), std(0xf07aa0, 0.6), [-0.65, -1.55, 0], [0, 0, -0.25]);
  // face on the brain (friendly cartoon)
  const face = new THREE.Group();
  face.position.set(1.05, -0.05, 1.58);
  face.rotation.y = 0.32;
  brain.add(face);
  for (const s of [-1, 1]) {
    const e = add(face, new THREE.SphereGeometry(0.18, 16, 12), std(0xffffff, 0.3, { emissive: 0xffffff, emissiveIntensity: 0.12 }), [0.28 * s, 0.15, 0]);
    add(e, new THREE.SphereGeometry(0.1, 12, 10), std(0x1a1010, 0.3), [0, 0, 0.12]);
    add(e, new THREE.SphereGeometry(0.035, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }), [0.04, 0.05, 0.2]);
  }
  const bSmile = add(face, new THREE.TorusGeometry(0.16, 0.035, 8, 16, Math.PI), std(0x5e1f24, 0.5), [0, -0.12, 0.05], [0, 0, Math.PI]);
  void bSmile;
  const cerebGlow = glow(0xff5c9a, 4.2, 0);
  cerebGlow.position.copy(CEREB).add(new THREE.Vector3(0, 0, 0.6));
  scene.add(cerebGlow);
  // three thought-trail puffs between Affan's head and the brain
  const trail = [];
  for (let i = 0; i < 3; i++) {
    const m = add(scene, new THREE.SphereGeometry(0.12 + i * 0.07, 16, 12), std(0xffffff, 0.5, { emissive: 0xffe8ff, emissiveIntensity: 0.35 }), [0.25 + i * 0.12, 4.15 + i * 0.42, -0.2 - i * 0.25]);
    trail.push(m);
  }

  // guard of the cerebellum, beside it
  const guard = makeGuard();
  guard.group.position.set(-3.35, 5.15, 0.2);
  guard.group.scale.setScalar(1.15);
  scene.add(guard.group);

  // signal dots: "arahan" from the top of the brain down to the hand, and a copy to the cerebellum
  const sigMat = new THREE.SpriteMaterial({ map: glowTex, color: 0xfff27a, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
  const copyMat = sigMat.clone();
  copyMat.color = new THREE.Color(0x7affd8);
  const sig = Array.from({ length: 14 }, () => {
    const s = new THREE.Sprite(sigMat);
    s.scale.setScalar(0.5);
    s.visible = false;
    scene.add(s);
    return s;
  });
  const copy = Array.from({ length: 8 }, () => {
    const s = new THREE.Sprite(copyMat);
    s.scale.setScalar(0.42);
    s.visible = false;
    scene.add(s);
    return s;
  });
  // prediction target ring (where the touch will land)
  const ringMat = new THREE.MeshBasicMaterial({ color: 0x5cff8a, transparent: true, depthWrite: false, depthTest: false, side: THREE.DoubleSide });
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.22, 0.3, 40), ringMat);
  ring.renderOrder = 5;
  ring.visible = false;
  scene.add(ring);

  const aff = makeAffan();
  const kak = makeKakak();
  scene.add(aff.root, kak.root);
  return { scene, sky, stars, brain, cortex, cereb, cerebMat, cerebGlow, trail, guard, sig, copy, sigMat, copyMat, ring, ringMat, puffs, aff, kak, key };
}

export { RoundedBoxGeometry };
