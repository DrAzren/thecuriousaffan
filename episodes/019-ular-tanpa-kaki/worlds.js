// Episode 019 sets: the sunny garden (real world), the science lab with a
// glowing blueprint floor (x-ray bones, belly scales), the magnified field of
// rocks and grass (S-wave and spring moves) and the branded outro stage.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { rng } from '../../shared/core.js';
import { makeAffan } from '../../shared/affan.js';
import { add, makeSky, makeTree, makeBush, glow } from '../../shared/props.js';
import { makeSnake, sPath, concertinaPath } from './snake.js';

const std = (color, rough = 0.7, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0, ...extra });

function shadowCfg(light, size, map = 2048) {
  light.castShadow = true;
  light.shadow.mapSize.set(map, map);
  const c = light.shadow.camera;
  c.left = -size;
  c.right = size;
  c.top = size;
  c.bottom = -size;
  c.near = 1;
  c.far = 300;
  light.shadow.bias = -0.0004;
  light.shadow.normalBias = 0.02;
}

function tex(size, draw, repeat = 1) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  draw(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.anisotropy = 8;
  return t;
}

const grassTex = (base, light, dark, seed, rep) =>
  tex(512, (g, s) => {
    g.fillStyle = base;
    g.fillRect(0, 0, s, s);
    const R = rng(seed);
    for (let i = 0; i < 2600; i++) {
      const x = R() * s, y = R() * s, l = 6 + R() * 14;
      g.strokeStyle = R() < 0.5 ? light : dark;
      g.globalAlpha = 0.25 + R() * 0.35;
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + (R() - 0.5) * 6, y - l);
      g.stroke();
    }
    g.globalAlpha = 1;
  }, rep);

// Tufts of grass as one instanced mesh of thin cones.
function tufts(scene, R, n, place, { h = 0.5, colors = [0x4fb84a, 0x67c94f, 0x3e9e3f], w = 0.06 } = {}) {
  const geo = new THREE.ConeGeometry(w, 1, 4);
  geo.translate(0, 0.5, 0);
  const m = new THREE.InstancedMesh(geo, std(0xffffff, 0.8), n * 5);
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), C = new THREE.Color();
  let k = 0;
  for (let i = 0; i < n; i++) {
    const [x, z] = place(R);
    for (let j = 0; j < 5; j++) {
      E.set((R() - 0.5) * 0.7, R() * 6, (R() - 0.5) * 0.7);
      Q.setFromEuler(E);
      const hh = h * (0.6 + R() * 0.7);
      M.compose(new THREE.Vector3(x + (R() - 0.5) * 0.25, 0, z + (R() - 0.5) * 0.25), Q, new THREE.Vector3(1, hh, 1));
      m.setMatrixAt(k, M);
      m.setColorAt(k, C.set(colors[Math.floor(R() * colors.length)]));
      k++;
    }
  }
  m.castShadow = true;
  m.receiveShadow = true;
  scene.add(m);
  return m;
}

function rock(R, s, color) {
  const g = new THREE.IcosahedronGeometry(1, 2);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const k = 0.85 + R() * 0.3;
    p.setXYZ(i, p.getX(i) * k, p.getY(i) * k, p.getZ(i) * k);
  }
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, std(color, 0.85, { flatShading: false }));
  m.scale.set(s, s * 0.62, s * 0.9);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function flower(R, s = 1) {
  const g = new THREE.Group();
  add(g, new THREE.CylinderGeometry(0.02 * s, 0.02 * s, 0.5 * s, 5), std(0x3f9a3c), [0, 0.25 * s, 0]);
  const pc = [0xff7aa8, 0xffd84a, 0xffffff, 0xb58cff, 0xff8a5b][Math.floor(R() * 5)];
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    add(g, new THREE.SphereGeometry(0.07 * s, 8, 6), std(pc, 0.6), [Math.cos(a) * 0.08 * s, 0.52 * s, Math.sin(a) * 0.08 * s], [0, 0, 0], [1, 0.5, 1]);
  }
  add(g, new THREE.SphereGeometry(0.05 * s, 8, 6), std(0xffb020, 0.5), [0, 0.54 * s, 0]);
  return g;
}

// ------------------------------------------------------------------ garden
export const GARDEN_PATH = sPath({ x0: 40, x1: -40, amp: 0.42, wave: 2.6, z: 0 }); // head travels towards -x

export function buildGarden() {
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xcfeaff, 30, 120);
  const sky = makeSky({ top: 0x2f7fe0, mid: 0x6fb6f2, horizon: 0xd8efff, bottom: 0x7cbf62 });
  scene.add(sky);
  scene.add(new THREE.HemisphereLight(0xdff0ff, 0x5a8a3c, 1.3));
  const sun = new THREE.DirectionalLight(0xfff1d8, 2.7);
  sun.position.set(-8, 14, -6);
  shadowCfg(sun, 9);
  scene.add(sun, sun.target);
  const ground = add(scene, new THREE.PlaneGeometry(300, 300), std(0xffffff, 0.95, { map: grassTex('#5fb24e', '#86d066', '#3f8f3a', 4, 60) }), [0, 0, 0], [-Math.PI / 2, 0, 0], [1, 1, 1], false);
  ground.receiveShadow = true;
  const R = rng(19);
  // keep the snake lane (|z| < 1.3 around x -10..10) and Affan's spot clear
  const clear = (x, z) => (Math.abs(z) < 1.4 && Math.abs(x) < 14) || (Math.hypot(x - 1.8, z - 2.8) < 1.7) || (Math.hypot(x - 2.6, z - 2.2) < 1.5) || (z < -1 && z > -9 && Math.abs(x) < 6);
  tufts(scene, R, 260, (R) => {
    for (;;) {
      const x = (R() - 0.5) * 36, z = -10 + R() * 22;
      if (!clear(x, z)) return [x, z];
    }
  }, { h: 0.45 });
  for (let i = 0; i < 40; i++) {
    const x = (R() - 0.5) * 30, z = -8 + R() * 20;
    if (clear(x, z)) continue;
    const f = flower(R, 0.8 + R() * 0.5);
    f.position.set(x, 0, z);
    scene.add(f);
  }
  for (const [x, z, s] of [[4.4, 1.7, 0.32], [-1.6, 1.9, 0.26], [6.6, -1.8, 0.4], [-4.5, 2.1, 0.36], [-7, -2.2, 0.3]]) {
    const r = rock(R, s, 0x9a9aa6);
    r.position.set(x, s * 0.25, z);
    scene.add(r);
  }
  // fence + bushes + trees behind
  const plank = std(0xe9c28e, 0.8);
  for (let x = -24; x <= 24; x += 0.7) add(scene, new RoundedBoxGeometry(0.5, 2.1, 0.12, 2, 0.05), plank, [x, 1.05, 7.5]);
  for (const y of [0.6, 1.6]) add(scene, new THREE.BoxGeometry(50, 0.16, 0.1), std(0xc99a64, 0.8), [0, y, 7.38]);
  for (let i = 0; i < 18; i++) {
    const b = makeBush(R, { scale: 1.3 + R() * 0.8, color: [0x3f8f3a, 0x4fa244, 0x2f7d38][i % 3] });
    b.position.set(-20 + i * 2.4 + R(), 0, 6.4 + R() * 0.6);
    scene.add(b);
  }
  const bushL = makeBush(R, { scale: 1.6, color: 0x3f9a40 });
  bushL.position.set(-8.6, 0, 0.6);
  scene.add(bushL);
  for (let i = 0; i < 9; i++) {
    const tr = makeTree(R, { scale: 1.6 + R() * 0.8, leaf: [0x3c8f45, 0x4aa34e, 0x2f7a3a], trunk: 0x7a5a3c });
    tr.position.set(-22 + i * 5.5 + R() * 2, 0, 11 + R() * 6);
    scene.add(tr);
  }
  // house wall far behind the fence
  add(scene, new THREE.BoxGeometry(14, 6, 6), std(0xfff0d6, 0.9), [9, 3, 15]);
  add(scene, new THREE.ConeGeometry(10.5, 3.2, 4), std(0xd9644a, 0.7), [9, 7.6, 15], [0, Math.PI / 4, 0], [1, 1, 0.6]);
  for (const x of [6, 12]) add(scene, new THREE.PlaneGeometry(1.4, 1.4), std(0x7fc8ff, 0.3), [x, 3.4, 11.99], [0, Math.PI, 0]);
  const aff = makeAffan();
  scene.add(aff.root);
  const snake = makeSnake({ length: 5.2, radius: 0.16 });
  scene.add(snake.root);
  return { scene, sky, sun, aff, snake };
}

// ------------------------------------------------------------------- lab
export function buildLab() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b1f4a);
  scene.fog = new THREE.Fog(0x0b1f4a, 14, 46);
  scene.add(new THREE.HemisphereLight(0xbfe4ff, 0x183a7a, 1.4));
  const key = new THREE.DirectionalLight(0xffffff, 2.0);
  key.position.set(-4, 10, -6);
  shadowCfg(key, 7);
  scene.add(key, key.target);
  const rim = new THREE.DirectionalLight(0x7fd8ff, 1.4);
  rim.position.set(5, 4, 8);
  scene.add(rim);
  const floor = add(scene, new THREE.PlaneGeometry(200, 200), std(0xffffff, 0.9, {
    map: tex(256, (g, s) => {
      g.fillStyle = '#14336e';
      g.fillRect(0, 0, s, s);
      g.strokeStyle = 'rgba(120,200,255,0.55)';
      g.lineWidth = 4;
      g.strokeRect(0, 0, s, s);
      g.strokeStyle = 'rgba(120,200,255,0.2)';
      g.lineWidth = 2;
      for (let i = 1; i < 4; i++) {
        g.beginPath();
        g.moveTo((i * s) / 4, 0);
        g.lineTo((i * s) / 4, s);
        g.moveTo(0, (i * s) / 4);
        g.lineTo(s, (i * s) / 4);
        g.stroke();
      }
    }, 100),
  }), [0, 0, 0], [-Math.PI / 2, 0, 0], [1, 1, 1], false);
  floor.receiveShadow = true;
  const R = rng(7);
  const dust = new THREE.Group();
  for (let i = 0; i < 60; i++) {
    const gl = glow([0x7fd8ff, 0xfff2b0, 0xb48cff][i % 3], 0.25 + R() * 0.4, 0.5);
    gl.position.set((R() - 0.5) * 20, 0.5 + R() * 6, (R() - 0.5) * 20);
    dust.add(gl);
  }
  scene.add(dust);
  const snake = makeSnake({ length: 6.2, radius: 0.24 });
  scene.add(snake.root);

  // Belly close-up rig: a magnified slice of the snake's underside with its
  // wide belly scales overlapping like roof tiles, on a bumpy ground.
  const belly = new THREE.Group();
  belly.position.set(0, 0, 30);
  scene.add(belly);
  const bumps = new THREE.Group();
  for (let i = 0; i < 70; i++) {
    const r = rock(R, 0.14 + R() * 0.12, [0xc9a56a, 0xb98f58, 0xd8b77c][i % 3]);
    r.position.set(-14 + i * 0.4 + R() * 0.15, 0.02, (R() - 0.5) * 0.9);
    bumps.add(r);
  }
  add(bumps, new THREE.BoxGeometry(40, 0.12, 4), std(0x8a6a44, 0.95), [0, -0.05, 0]);
  belly.add(bumps);
  const slab = new THREE.Group();
  const bodyMat = std(0x46c25c, 0.42);
  const tube = add(slab, new THREE.CylinderGeometry(0.85, 0.85, 7.2, 40, 1, false), bodyMat, [0, 1.12, 0], [0, 0, Math.PI / 2]);
  tube.scale.set(1, 1, 0.75);
  for (let i = 0; i < 9; i++) add(slab, new THREE.TorusGeometry(0.855, 0.035, 6, 40, Math.PI * 0.75), std(0x24884a, 0.5), [-3.2 + i * 0.8, 1.12, 0], [0, Math.PI / 2, Math.PI * 0.125], [1, 1, 0.75]);
  const plates = [];
  const plateMat = std(0xffd36b, 0.45, { emissive: 0x6a4a00, emissiveIntensity: 0.6 });
  const edgeMat = std(0xd9862a, 0.45, { emissive: 0x000000 });
  for (let i = 0; i < 13; i++) {
    const p = new THREE.Group();
    p.position.set(3.3 - i * 0.55, 0.36, 0);
    p.rotation.z = 0.36;
    add(p, new RoundedBoxGeometry(0.8, 0.12, 1.0, 2, 0.05), plateMat, [0, 0, 0]);
    const edge = add(p, new RoundedBoxGeometry(0.12, 0.17, 1.02, 2, 0.04), edgeMat.clone(), [-0.36, -0.03, 0]);
    p.userData.edge = edge;
    slab.add(p);
    plates.push(p);
  }
  // head end of the slice (front, +x)
  const cap = add(slab, new THREE.SphereGeometry(0.85, 32, 20), bodyMat, [3.6, 1.12, 0], [0, 0, 0], [0.6, 1, 0.75]);
  cap.castShadow = true;
  belly.add(slab);
  return { scene, snake, belly, slab, plates, bumps, dust };
}

// ------------------------------------------------------------------ field
// Magnified "imagination" field. The S-wave lane runs along x at z = 0 with
// pegs (rocks, grass) at the outside of each bend; the narrow channel for the
// spring move is at z = CH_Z.
export const FIELD_PATH = sPath({ x0: -60, x1: 60, amp: 0.9, wave: 3.6, z: 0 });
export const CH_Z = 40;
export const AFF_FIELD = [-30, -3.2]; // where Affan stands in the field
export const CH = { length: 6, emin: 2.9, emax: 5.6, folds: 5 };
CH.ampMax = concertinaPath(0, CH.emin, CH.length, CH.folds).amp;

export function buildField() {
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xbfe9ff, 26, 120);
  const sky = makeSky({ top: 0x3e7be8, mid: 0x7fb8ff, horizon: 0xe6f6ff, bottom: 0xb6e39a });
  scene.add(sky);
  scene.add(new THREE.HemisphereLight(0xf0f6ff, 0x7aa860, 1.35));
  const sun = new THREE.DirectionalLight(0xfff0d4, 2.5);
  sun.position.set(-6, 14, -8);
  shadowCfg(sun, 10);
  scene.add(sun, sun.target);
  const ground = add(scene, new THREE.PlaneGeometry(400, 400), std(0xffffff, 0.95, { map: grassTex('#9fd86a', '#c4ee8a', '#7cc05a', 9, 70) }), [0, 0, 0], [-Math.PI / 2, 0, 0], [1, 1, 1], false);
  ground.receiveShadow = true;
  const R = rng(33);
  // pegs at the outside of every bend of the S path
  const pegs = [];
  const rockCols = [0xff9e6b, 0x8fb0ff, 0xc9a0ff, 0xffd36b];
  const A = 0.9, Wv = 3.6, br = 0.24 * 1.1;
  for (let k = -30; k <= 30; k++) {
    const xc = Wv / 4 + k * (Wv / 2); // crest positions: sin = +-1
    const side = Math.sin((2 * Math.PI * xc) / Wv) > 0 ? 1 : -1;
    const isRock = (k & 1) === 0;
    const z = side * (A + br + (isRock ? 0.36 : 0.18));
    let o;
    if (isRock) {
      o = rock(R, 0.38, rockCols[(k + 40) % 4]);
      o.position.set(xc, 0.12, z);
    } else {
      o = new THREE.Group();
      tufts(o, R, 4, (R) => [xc + (R() - 0.5) * 0.25, z + side * R() * 0.25], { h: 0.95, colors: [0x2fa64a, 0x45bf55, 0x239a3f], w: 0.09 });
    }
    scene.add(o);
    pegs.push({ x: xc, z, side, kind: isRock ? 'batu' : 'rumput', obj: o });
  }
  // scattered grass + rocks outside the lane
  tufts(scene, R, 340, (R) => {
    for (;;) {
      const x = (R() - 0.5) * 90, z = (R() - 0.5) * 30 + (R() < 0.3 ? CH_Z : 0);
      const inLane = Math.abs(z) < 2.4 || Math.abs(z - CH_Z) < 2.2 || Math.hypot(x - AFF_FIELD[0], z - AFF_FIELD[1]) < 2.6;
      if (!inLane) return [x, z];
    }
  }, { h: 0.8 });
  for (let i = 0; i < 40; i++) {
    const r = rock(R, 0.4 + R() * 0.7, rockCols[i % 4]);
    const z = (R() < 0.5 ? -1 : 1) * (3 + R() * 10);
    r.position.set((R() - 0.5) * 80, 0.1, z + (i % 3 === 0 ? CH_Z : 0));
    if (Math.hypot(r.position.x - AFF_FIELD[0], r.position.z - AFF_FIELD[1]) > 3.5) scene.add(r);
  }
  // narrow channel: two long smooth logs
  const half = CH.ampMax + 0.24 * 1.12 + 0.05;
  const logMat = std(0xc98a52, 0.75);
  const walls = [];
  for (const s of [-1, 1]) {
    const w = add(scene, new THREE.CapsuleGeometry(0.4, 40, 8, 20), logMat, [0, 0.4, CH_Z + s * (half + 0.4)], [0, 0, Math.PI / 2]);
    walls.push(w);
    for (let i = 0; i < 20; i++) add(scene, new THREE.TorusGeometry(0.405, 0.03, 6, 24), std(0x9c6436, 0.8), [-19 + i * 2, 0.4, CH_Z + s * (half + 0.4)], [0, Math.PI / 2, 0]);
  }
  // big background "giant" flowers and grass for scale
  for (let i = 0; i < 30; i++) {
    const f = flower(R, 3 + R() * 3);
    const z = (R() < 0.5 ? -1 : 1) * (6 + R() * 14);
    f.position.set((R() - 0.5) * 70, 0, z + (i % 2 ? CH_Z : 0));
    if (Math.hypot(f.position.x - AFF_FIELD[0], f.position.z - AFF_FIELD[1]) > 7) scene.add(f);
  }
  const aff = makeAffan();
  scene.add(aff.root);
  const snake = makeSnake({ length: 6.2, radius: 0.24 });
  scene.add(snake.root);
  const snake2 = makeSnake({ length: CH.length, radius: 0.24 });
  scene.add(snake2.root);
  return { scene, sky, sun, aff, snake, snake2, pegs, half };
}

// ----------------------------------------------------------------- outro
export function buildOutro() {
  const scene = new THREE.Scene();
  const c = document.createElement('canvas');
  c.width = 540;
  c.height = 960;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(270, 380, 40, 270, 420, 700);
  gr.addColorStop(0, '#9ff0b0');
  gr.addColorStop(0.45, '#3fbf8a');
  gr.addColorStop(1, '#1a7f8f');
  g.fillStyle = gr;
  g.fillRect(0, 0, 540, 960);
  const bg = new THREE.CanvasTexture(c);
  bg.colorSpace = THREE.SRGBColorSpace;
  scene.background = bg;
  scene.add(new THREE.HemisphereLight(0xeaf4ff, 0x6a7ab8, 1.5));
  const key = new THREE.DirectionalLight(0xfff2e0, 2.4);
  key.position.set(3, 6, 8);
  shadowCfg(key, 5);
  key.shadow.normalBias = 0.03;
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xbfe0ff, 2.0);
  rim.position.set(-6, 5, -6);
  scene.add(rim);
  const aff = makeAffan();
  scene.add(aff.root);
  const snake = makeSnake({ length: 5.0, radius: 0.16 });
  scene.add(snake.root);
  const halo = glow(0xfff2b0, 9, 0.35);
  halo.position.set(0, 2.9, -2);
  scene.add(halo);
  return { scene, aff, snake };
}
