// Episode 013 sets. 1 unit = 1 metre everywhere so every comparison is to scale.
//   - City: the twin towers (452 m) in a sunny park, with a generic skyline.
//   - Lab: Affan's measuring world (pastel grid), the same towers, and three
//     instanced stacks: single-storey houses (5 m), adults (1.7 m), Affans (1.1 m).
//   - Outro: the branded stage.
// The towers are a stylised, procedural model (no external assets).
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { rng } from '../../shared/core.js';
import { makeAffan, AFFAN } from '../../shared/affan.js';
import { add, makeSky, makeTree, makeBush, glow, glowTex } from '../../shared/props.js';

export const TOWER_H = 452;
export const TOWER_X = [40, 140]; // tower centres (lab); city uses ±50
export const STACK_X = 6; // the house stack stands just beside tower A in the lab
export const HOUSE_H = 5, ADULT_H = 1.7, KID_H = 1.1;
export const N_HOUSE = 90, N_ADULT = 266, N_KID = 411;
export const AFF_SCALE = KID_H / 3.8; // the Affan rig is ~3.8 units tall

function shadowCfg(light, size, map = 2048, far = 400) {
  light.castShadow = true;
  light.shadow.mapSize.set(map, map);
  const c = light.shadow.camera;
  c.left = -size;
  c.right = size;
  c.top = size;
  c.bottom = -size;
  c.near = 1;
  c.far = far;
  light.shadow.bias = -0.0004;
  light.shadow.normalBias = 0.02;
}

// --------------------------------------------------------------- towers
// Floor plan: two overlapping squares (an eight-point star) united with a
// circle, which gives the scalloped star outline of the real towers.
function outline(n = 192) {
  const a = 1 / Math.SQRT2;
  const sq = (p) => a / Math.max(Math.abs(Math.cos(p)), Math.abs(Math.sin(p)));
  const pts = [];
  for (let i = 0; i < n; i++) {
    const th = (i / n) * Math.PI * 2;
    const r = Math.max(sq(th), sq(th - Math.PI / 4), 0.85);
    pts.push([Math.cos(th) * r, Math.sin(th) * r]);
  }
  return pts;
}
const OUT = outline();

// Prism along y with the star outline, radius r0 at y0 tapering to r1 at y1.
// u runs along the perimeter in mullion widths, v counts floors.
function prism(y0, y1, r0, r1, floorH = 4.2, mull = 2.2) {
  const pos = [], uv = [];
  const n = OUT.length;
  let per = 0;
  const peri = [0];
  for (let i = 0; i < n; i++) {
    const [ax, az] = OUT[i], [bx, bz] = OUT[(i + 1) % n];
    per += Math.hypot(bx - ax, bz - az) * (r0 + r1) / 2;
    peri.push(per);
  }
  for (let i = 0; i < n; i++) {
    const [ax, az] = OUT[i], [bx, bz] = OUT[(i + 1) % n];
    const u0 = peri[i] / mull, u1 = peri[i + 1] / mull, v0 = y0 / floorH, v1 = y1 / floorH;
    const A = [ax * r0, y0, az * r0], B = [bx * r0, y0, bz * r0], C = [bx * r1, y1, bz * r1], D = [ax * r1, y1, az * r1];
    pos.push(...A, ...C, ...B, ...A, ...D, ...C);
    uv.push(u0, v0, u1, v1, u1, v0, u0, v0, u0, v1, u1, v1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.computeVertexNormals();
  return g;
}
function cap(y, r) {
  const pos = [], uv = [];
  const n = OUT.length;
  for (let i = 0; i < n; i++) {
    const [ax, az] = OUT[i], [bx, bz] = OUT[(i + 1) % n];
    pos.push(0, y, 0, bx * r, y, bz * r, ax * r, y, az * r);
    uv.push(0.5, 0.5, 0.5, 0.5, 0.5, 0.5);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.computeVertexNormals();
  return g;
}

function facadeTexture() {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const g = c.getContext('2d');
  const gl = g.createLinearGradient(0, 0, 0, 64);
  gl.addColorStop(0, '#4f6f92');
  gl.addColorStop(0.5, '#7e9dbd');
  gl.addColorStop(1, '#5a7a9c');
  g.fillStyle = gl;
  g.fillRect(0, 0, 64, 64);
  // stainless-steel spandrel band (one per floor)
  g.fillStyle = '#e4e8ee';
  g.fillRect(0, 0, 64, 22);
  g.fillStyle = '#c3cad4';
  g.fillRect(0, 18, 64, 4);
  // vertical mullion
  g.fillStyle = '#d6dce4';
  g.fillRect(0, 0, 5, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  t.generateMipmaps = true;
  return t;
}

const TIERS = [
  [0, 262, 23, 23],
  [262, 292, 21, 21],
  [292, 318, 19, 19],
  [318, 341, 16.8, 16.8],
  [341, 360, 14.2, 14.2],
  [360, 375, 11.5, 9],
];

function makeTower(mat, steel) {
  const g = new THREE.Group();
  for (const [y0, y1, r0, r1] of TIERS) {
    const m = new THREE.Mesh(prism(y0, y1, r0, r1), mat);
    m.castShadow = m.receiveShadow = true;
    g.add(m);
    const c = new THREE.Mesh(cap(y1, r1 + 0.6), steel);
    g.add(c);
    // thin steel ledge at each setback
    const l = new THREE.Mesh(prism(y1 - 0.8, y1 + 0.1, r1 + 0.7, r1 + 0.7), steel);
    g.add(l);
  }
  // crown + pinnacle (spire with rings and a ball)
  add(g, prism(375, 386, 8.6, 4.2), steel);
  add(g, new THREE.CylinderGeometry(0.35, 1.7, 66, 16), steel, [0, 386 + 33, 0]);
  for (const [y, r] of [[392, 3.6], [400, 3.0], [408, 2.5], [416, 2.0], [424, 1.6]]) add(g, new THREE.TorusGeometry(r, 0.45, 8, 24), steel, [0, y, 0], [Math.PI / 2, 0, 0]);
  add(g, new THREE.SphereGeometry(1.3, 16, 12), steel, [0, 436, 0]);
  add(g, new THREE.CylinderGeometry(0.08, 0.3, 16, 8), steel, [0, 444, 0]);
  return g;
}

// Two towers + the double-deck skybridge (floors 41-42, ~170 m) and its legs.
export function makeTwinTowers(envMap, { gap = 100 } = {}) {
  const tex = facadeTexture();
  const mat = new THREE.MeshStandardMaterial({ map: tex, metalness: 0.45, roughness: 0.28, envMap, envMapIntensity: 1.0, emissive: 0x1a2430, emissiveIntensity: 0.25 });
  const steel = new THREE.MeshStandardMaterial({ color: 0xe9edf2, metalness: 0.7, roughness: 0.25, envMap, envMapIntensity: 1.1 });
  const g = new THREE.Group();
  const A = makeTower(mat, steel);
  const B = makeTower(mat, steel);
  A.position.x = -gap / 2;
  B.position.x = gap / 2;
  g.add(A, B);
  const span = gap - 2 * 21;
  add(g, new RoundedBoxGeometry(span, 9, 6, 2, 1), new THREE.MeshStandardMaterial({ color: 0x8aa6c4, metalness: 0.5, roughness: 0.25, envMap }), [0, 174.5, 0]);
  add(g, new THREE.BoxGeometry(span + 2, 0.8, 6.6), steel, [0, 170.2, 0]);
  add(g, new THREE.BoxGeometry(span + 2, 0.8, 6.6), steel, [0, 179, 0]);
  for (const s of [-1, 1]) {
    const a = new THREE.Vector3(s * 3, 170, 0), b = new THREE.Vector3(s * (gap / 2 - 21), 122, 0);
    const len = a.distanceTo(b);
    const leg = add(g, new THREE.CylinderGeometry(0.9, 0.9, len, 10), steel, [(a.x + b.x) / 2, (a.y + b.y) / 2, 0]);
    leg.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
  }
  g.userData = { A, B, mat, steel };
  return g;
}

function envFrom(renderer, sky) {
  const pm = new THREE.PMREMGenerator(renderer);
  const s = new THREE.Scene();
  s.add(sky.clone());
  const rt = pm.fromScene(s, 0.02);
  pm.dispose();
  return rt.texture;
}

function cloud(R, scale = 1) {
  const g = new THREE.Group();
  for (let i = 0; i < 6; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xffffff, transparent: true, opacity: 0.75, depthWrite: false, fog: false }));
    const k = (40 + R() * 50) * scale;
    s.scale.set(k * 1.6, k, 1);
    s.position.set((R() - 0.5) * 120 * scale, (R() - 0.5) * 18 * scale, (R() - 0.5) * 30 * scale);
    g.add(s);
  }
  return g;
}

// ------------------------------------------------------------------ city
export function buildCity(renderer) {
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xcfe3f2, 400, 2600);
  const sky = makeSky({ top: 0x2a6fd6, mid: 0x5fa4ec, horizon: 0xd8ecf8, bottom: 0x9fb8a6, radius: 3500 });
  scene.add(sky);
  const env = envFrom(renderer, sky);
  const stars = new THREE.Group();
  stars.userData.update = () => {};
  scene.add(new THREE.HemisphereLight(0xdbeaff, 0x5f7f55, 1.25));
  const sun = new THREE.DirectionalLight(0xfff0d6, 2.6);
  sun.position.set(-180, 320, -260);
  shadowCfg(sun, 30, 2048, 900);
  scene.add(sun, sun.target);
  const sunGlow = glow(0xfff4d0, 700, 0.75);
  sunGlow.position.set(-1100, 1500, -1700);
  scene.add(sunGlow);

  const towers = makeTwinTowers(env);
  scene.add(towers);
  // podium (shopping mall) around the base
  const podMat = new THREE.MeshStandardMaterial({ color: 0xd6dbe2, metalness: 0.3, roughness: 0.4, envMap: env });
  add(scene, new RoundedBoxGeometry(250, 26, 90, 3, 6), podMat, [0, 13, 52]);
  add(scene, new RoundedBoxGeometry(150, 14, 40, 3, 5), podMat, [0, 7, 0]);
  add(scene, new THREE.BoxGeometry(240, 2, 80), new THREE.MeshStandardMaterial({ color: 0x6f8fb0, metalness: 0.4, roughness: 0.3, envMap: env }), [0, 26.5, 52]);

  // ground, park lawn, paths, a lake
  add(scene, new THREE.PlaneGeometry(8000, 8000), new THREE.MeshStandardMaterial({ color: 0x8c9a90, roughness: 1 }), [0, -0.02, 0], [-Math.PI / 2, 0, 0], [1, 1, 1], false).receiveShadow = true;
  add(scene, new THREE.CircleGeometry(330, 64), new THREE.MeshStandardMaterial({ color: 0x5fae4e, roughness: 0.95 }), [0, 0.0, -200], [-Math.PI / 2, 0, 0], [1, 1, 1], false).receiveShadow = true;
  add(scene, new THREE.PlaneGeometry(10, 300), new THREE.MeshStandardMaterial({ color: 0xe8dcc4, roughness: 0.9 }), [0, 0.02, -170], [-Math.PI / 2, 0, 0], [1, 1, 1], false).receiveShadow = true;
  add(scene, new THREE.CircleGeometry(60, 48), new THREE.MeshStandardMaterial({ color: 0x4a9fd8, metalness: 0.2, roughness: 0.1, envMap: env }), [-110, 0.03, -110], [-Math.PI / 2, 0, 0], [1.4, 1, 1], false);
  const R = rng(13);
  const leaf = [[0x3f9a46], [0x4fae52], [0x2f8a44]];
  for (let i = 0; i < 160; i++) {
    const a = R() * Math.PI * 2, r = 40 + Math.sqrt(R()) * 280;
    const x = Math.cos(a) * r, z = -200 + Math.sin(a) * r * 0.8;
    if (Math.abs(x) < 9 && z < -40) continue; // keep the path clear
    if (Math.hypot(x, z + 200) < 22) continue; // and the spot where Affan stands
    const tr = makeTree(R, { scale: 2.6 + R() * 1.6, leaf: leaf[i % 3], trunk: 0x7a5636, toy: true });
    tr.position.set(x, 0, z);
    scene.add(tr);
  }
  for (let i = 0; i < 40; i++) {
    const b = makeBush(R, { scale: 2.2, color: 0x3c8d40 });
    b.position.set((R() - 0.5) * 300, 0, -60 - R() * 300);
    if (Math.abs(b.position.x) < 12) b.position.x += 30;
    scene.add(b);
  }
  // generic skyline (no real buildings other than the towers)
  const bMat = new THREE.MeshStandardMaterial({ map: facadeTexture(), metalness: 0.2, roughness: 0.5, envMap: env, envMapIntensity: 0.6 });
  const box = new THREE.BoxGeometry(1, 1, 1);
  const n = 90;
  const im = new THREE.InstancedMesh(box, bMat, n);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), col = new THREE.Color();
  let k = 0;
  while (k < n) {
    const a = R() * Math.PI * 2, r = 230 + R() * 900;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (z < -60 && Math.abs(x) < 520) continue; // keep the view from the park open
    const h = 30 + Math.pow(R(), 1.6) * 210, w = 30 + R() * 35;
    m4.compose(new THREE.Vector3(x, h / 2, z), q.setFromEuler(new THREE.Euler(0, R() * Math.PI, 0)), new THREE.Vector3(w, h, w * (0.7 + R() * 0.6)));
    im.setMatrixAt(k, m4);
    im.setColorAt(k, col.setHSL(0.58 + R() * 0.08, 0.15, 0.72 + R() * 0.2));
    k++;
  }
  scene.add(im);
  for (let i = 0; i < 9; i++) {
    const c = cloud(R, 1.6);
    c.position.set(-1400 + i * 360 + R() * 100, 700 + R() * 380, 1300 + R() * 600);
    scene.add(c);
  }
  const aff = makeAffan();
  aff.root.scale.setScalar(AFF_SCALE);
  aff.root.position.set(0, 0, -200);
  scene.add(aff.root);
  return { scene, sky, stars, sun, towers, aff };
}

// ------------------------------------------------------------- lab world
function gridTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#c9c4ff';
  g.fillRect(0, 0, 256, 256);
  g.strokeStyle = 'rgba(255,255,255,0.75)';
  g.lineWidth = 4;
  g.strokeRect(0, 0, 256, 256);
  g.strokeStyle = 'rgba(255,255,255,0.3)';
  g.lineWidth = 2;
  for (let i = 1; i < 4; i++) {
    g.beginPath();
    g.moveTo(i * 64, 0);
    g.lineTo(i * 64, 256);
    g.moveTo(0, i * 64);
    g.lineTo(256, i * 64);
    g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(800, 800);
  t.anisotropy = 8;
  return t;
}

// Instanced stack of n identical figures/houses, each `step` tall, built from
// parts [{geo, color | colors}]. show(k, t) places the first k (k may be
// fractional: the next one pops in) and hides the rest.
function makeStack(parts, n, step, { seed = 1, jitter = 0, x = STACK_X, z = 0 } = {}) {
  const g = new THREE.Group();
  const R = rng(seed);
  const meshes = parts.map((p) => {
    const m = new THREE.InstancedMesh(p.geo, new THREE.MeshStandardMaterial({ roughness: 0.65, ...(p.mat || {}) }), n);
    m.castShadow = m.receiveShadow = true;
    m.frustumCulled = false;
    const c = new THREE.Color();
    for (let i = 0; i < n; i++) m.setColorAt(i, c.set(p.colors ? p.colors[Math.floor(R() * p.colors.length)] : p.color));
    g.add(m);
    return m;
  });
  const jit = Array.from({ length: n }, () => [(R() - 0.5) * jitter, (R() - 0.5) * jitter, (R() - 0.5) * 0.12]);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), s = new THREE.Vector3();
  g.position.set(x, 0, z);
  const show = (k) => {
    const full = Math.floor(k), frac = k - full;
    for (let i = 0; i < n; i++) {
      let sc = i < full ? 1 : i === full ? frac : 0;
      const drop = i === full ? (1 - frac) * step * 1.5 : 0;
      sc = sc > 0 ? Math.min(1, sc * 1.15) : 0;
      p.set(jit[i][0], i * step + drop, jit[i][1]);
      q.setFromEuler(e.set(0, jit[i][2], 0));
      s.setScalar(Math.max(1e-4, sc));
      m4.compose(p, q, s);
      for (const m of meshes) m.setMatrixAt(i, m4);
    }
    for (const m of meshes) m.instanceMatrix.needsUpdate = true;
    g.visible = k > 0;
  };
  show(0);
  return { group: g, show, top: (k) => Math.min(k, n) * step };
}

function houseParts() {
  const body = new RoundedBoxGeometry(8, 3.4, 7, 2, 0.25);
  body.translate(0, 1.7, 0);
  const roof = new THREE.ConeGeometry(6.1, 1.6, 4);
  roof.rotateY(Math.PI / 4);
  roof.scale(1, 1, 0.95);
  roof.translate(0, 3.4 + 0.8, 0);
  const door = new THREE.BoxGeometry(1.2, 2.0, 0.12);
  door.translate(0, 1.0, -3.53);
  const wins = mergeGeometries([-2.4, 2.4].map((x) => new THREE.BoxGeometry(1.4, 1.2, 0.12).translate(x, 2.0, -3.53)));
  return [
    { geo: body, colors: [0xfff1c9, 0xffd9e3, 0xd2f0ff, 0xdfffd2, 0xffe3c2] },
    { geo: roof, colors: [0xff6b5b, 0x4f8cff, 0xffa53b, 0x9b6bff, 0x2fbf8f] },
    { geo: door, color: 0x9a5b36 },
    { geo: wins, color: 0x8fd8ff, mat: { emissive: 0x3070a0, emissiveIntensity: 0.3 } },
  ];
}

// A friendly adult figure 1.7 m tall (feet at 0, top of head at 1.7).
function adultParts() {
  const legs = mergeGeometries([-0.11, 0.11].map((x) => new THREE.CapsuleGeometry(0.09, 0.66, 4, 8).translate(x, 0.42, 0)));
  const torso = mergeGeometries([
    new THREE.CapsuleGeometry(0.2, 0.36, 4, 12).scale(1, 1, 0.75).translate(0, 1.07, 0),
    ...[-1, 1].map((s) => new THREE.CapsuleGeometry(0.065, 0.46, 4, 8).rotateZ(s * 0.25).translate(s * 0.29, 1.02, 0)),
  ]);
  const skin = mergeGeometries([
    new THREE.SphereGeometry(0.13, 14, 10).scale(1, 1.12, 1).translate(0, 1.55, 0),
    ...[-1, 1].map((s) => new THREE.SphereGeometry(0.06, 8, 6).translate(s * 0.36, 0.76, 0)),
  ]);
  const hair = new THREE.SphereGeometry(0.135, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.55).scale(1.02, 1.1, 1.05).translate(0, 1.58, 0.01);
  return [
    { geo: legs, colors: [0x2f3b5e, 0x4a4f63, 0x6b5a48, 0x2e5f7a] },
    { geo: torso, colors: [0xff6b6b, 0x4f8cff, 0xffc93b, 0x2fbf8f, 0xb36bff, 0xff9a5b, 0xffffff] },
    { geo: skin, colors: [0xe8a57c, 0xc98a62, 0xf0c09a, 0xa86f4c] },
    { geo: hair, colors: [0x22160f, 0x3a2618, 0x111111] },
  ];
}

// Simplified mini-Affan (same colours as the rig) for the 411-Affan stack.
function kidParts() {
  const legs = mergeGeometries([-0.07, 0.07].map((x) => new THREE.CapsuleGeometry(0.06, 0.24, 4, 8).translate(x, 0.17, 0)));
  const jacket = mergeGeometries([
    new THREE.CylinderGeometry(0.15, 0.17, 0.32, 14).translate(0, 0.5, 0),
    ...[-1, 1].map((s) => new THREE.CapsuleGeometry(0.05, 0.22, 4, 8).rotateZ(s * 0.3).translate(s * 0.2, 0.5, 0)),
  ]);
  const shirt = new THREE.BoxGeometry(0.12, 0.28, 0.04).translate(0, 0.5, -0.16);
  const skin = new THREE.SphereGeometry(0.25, 16, 12).scale(1, 0.98, 0.93).translate(0, 0.86, 0);
  const hair = new THREE.SphereGeometry(0.262, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.42).translate(0, 0.88, 0.01);
  const specs = mergeGeometries([-0.085, 0.085].map((x) => new THREE.TorusGeometry(0.055, 0.016, 6, 12).translate(x, 0.85, -0.235)));
  return [
    { geo: legs, color: AFFAN.pants },
    { geo: jacket, color: AFFAN.navy },
    { geo: shirt, color: AFFAN.shirt },
    { geo: skin, color: AFFAN.skin },
    { geo: hair, color: AFFAN.hair },
    { geo: specs, color: AFFAN.frame },
  ];
}

function sparkleField(n, seed, box) {
  const R = rng(seed);
  const pos = new Float32Array(n * 3), ph = new Float32Array(n), sz = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    pos.set([box[0] + R() * (box[1] - box[0]), box[2] + R() * (box[3] - box[2]), box[4] + R() * (box[5] - box[4])], i * 3);
    ph[i] = R() * 100;
    sz[i] = 6 + R() * 16;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aPh', new THREE.BufferAttribute(ph, 1));
  g.setAttribute('aSz', new THREE.BufferAttribute(sz, 1));
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 } },
    vertexShader: `attribute float aPh; attribute float aSz; uniform float uTime; varying float vA;
      void main(){ vec3 p = position; p.y += sin(uTime * 0.6 + aPh) * 0.25; vA = 0.5 + 0.5 * sin(uTime * 2.5 + aPh);
      vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_PointSize = clamp(aSz * (8.0 / -mv.z), 0.0, 40.0); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `varying float vA; void main(){ vec2 p = gl_PointCoord - 0.5; float d = length(p);
      float star = max(0.0, 1.0 - abs(p.x) * 9.0) * max(0.0, 1.0 - abs(p.y) * 1.6) + max(0.0, 1.0 - abs(p.y) * 9.0) * max(0.0, 1.0 - abs(p.x) * 1.6);
      float a = (smoothstep(0.5, 0.0, d) * 0.5 + star) * vA; gl_FragColor = vec4(1.0, 0.97, 0.85, a); }`,
  });
  const pts = new THREE.Points(g, mat);
  pts.frustumCulled = false;
  pts.userData.update = (t) => (mat.uniforms.uTime.value = t);
  return pts;
}

export function buildLab(renderer) {
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xf3dcf4, 500, 3200);
  const sky = makeSky({ top: 0x5f8ff0, mid: 0x9fc4ff, horizon: 0xffe0f0, bottom: 0xd8c8ff, radius: 3500 });
  scene.add(sky);
  const env = envFrom(renderer, sky);
  const stars = new THREE.Group();
  stars.userData.update = () => {};
  scene.add(new THREE.HemisphereLight(0xf2f0ff, 0x9a86d8, 1.35));
  const sun = new THREE.DirectionalLight(0xfff2e4, 2.4);
  sun.position.set(-120, 260, -200);
  shadowCfg(sun, 16, 2048, 800);
  scene.add(sun, sun.target);
  add(scene, new THREE.PlaneGeometry(8000, 8000), new THREE.MeshStandardMaterial({ map: gridTexture(), roughness: 0.9 }), [0, 0, 0], [-Math.PI / 2, 0, 0], [1, 1, 1], false).receiveShadow = true;

  const towers = makeTwinTowers(env);
  towers.position.x = (TOWER_X[0] + TOWER_X[1]) / 2;
  scene.add(towers);
  // round plinth under each tower, toy-like
  for (const x of TOWER_X) add(scene, new THREE.CylinderGeometry(25.5, 26.5, 1.2, 48), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 }), [x, 0.6, 0]);

  const R = rng(31);
  const leafSets = [[0x7bd66a], [0x4fc48a], [0x9be05c], [0x3fb6a0]];
  for (let i = 0; i < 60; i++) {
    const tr = makeTree(R, { scale: 1.6 + R() * 2.2, leaf: leafSets[i % 4], trunk: 0x9a6a45, toy: true });
    tr.position.set(-220 + R() * 480, 0, 60 + R() * 160);
    scene.add(tr);
  }
  for (let i = 0; i < 30; i++) {
    add(scene, new THREE.SphereGeometry(60 + R() * 80, 24, 14), new THREE.MeshStandardMaterial({ color: [0xb7a8ff, 0xa8c4ff, 0xc8b0ff][i % 3], roughness: 1 }), [-1400 + i * 100, -30, 900 + R() * 500], [0, 0, 0], [1.6, 0.7, 1], false);
  }
  for (let i = 0; i < 8; i++) {
    const c = cloud(R, 1.4);
    c.position.set(-1200 + i * 330 + R() * 100, 520 + R() * 420, 1200 + R() * 500);
    scene.add(c);
  }
  const sparkles = sparkleField(600, 4, [-60, 90, 0.5, 40, -30, 20]);
  scene.add(sparkles);

  const houses = makeStack(houseParts(), N_HOUSE, HOUSE_H, { seed: 3, jitter: 0.7 });
  const adults = makeStack(adultParts(), N_ADULT, ADULT_H, { seed: 5, jitter: 0.06, x: STACK_X + 5 });
  const kids = makeStack(kidParts(), N_KID, KID_H, { seed: 7, jitter: 0.04, x: STACK_X + 5 });
  scene.add(houses.group, adults.group, kids.group);

  // a lone house and a lone adult for the "this is one" beats
  const aff = makeAffan();
  aff.root.scale.setScalar(AFF_SCALE);
  scene.add(aff.root);
  return { scene, sky, stars, sun, towers, houses, adults, kids, aff, sparkles };
}

// ----------------------------------------------------------------- outro
export function buildOutro() {
  const scene = new THREE.Scene();
  const c = document.createElement('canvas');
  c.width = 540;
  c.height = 960;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(270, 380, 40, 270, 420, 700);
  gr.addColorStop(0, '#8fd0ff');
  gr.addColorStop(0.45, '#3f9cf2');
  gr.addColorStop(1, '#1a5fcf');
  g.fillStyle = gr;
  g.fillRect(0, 0, 540, 960);
  const bg = new THREE.CanvasTexture(c);
  bg.colorSpace = THREE.SRGBColorSpace;
  scene.background = bg;
  scene.add(new THREE.HemisphereLight(0xeaf4ff, 0x6a7ab8, 1.5));
  const key = new THREE.DirectionalLight(0xfff2e0, 2.4);
  key.position.set(3, 6, 8);
  shadowCfg(key, 5, 2048, 300);
  key.shadow.normalBias = 0.03;
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xbfe0ff, 2.0);
  rim.position.set(-6, 5, -6);
  scene.add(rim);
  const aff = makeAffan();
  scene.add(aff.root);
  const halo = glow(0xfff2b0, 9, 0.35);
  halo.position.set(0, 2.9, -2);
  scene.add(halo);
  return { scene, aff };
}
