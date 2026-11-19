// Episode 049 sets:
//  - Kundasang: a green hillside with cabbage rows and a wooden fence, Gunung
//    Kinabalu huge in the distance with a ring of cloud around its middle;
//  - the measuring stage: a model Kinabalu next to a ruler and a stack of nine
//    twin towers (452 m each) that reaches the summit;
//  - the climb: a side cut-away of the slope with zones (warm rainforest,
//    mossy cloud forest, low shrubs, bare granite) and a path for a hiker;
//  - the summit: granite slabs and spires, the Low's Peak sign, a sea of
//    clouds below, a sky that goes from night to sunrise; frost sparkles;
//  - Laban Rata at night: the dark mountain, a lit rest house, and a line of
//    headlamps climbing a zigzag path;
//  - a mossy forest floor with a giant pitcher plant and orchids;
//  - the branded outro stage from Episode 005.
import * as THREE from 'three';
import { rng } from '../../shared/core.js';
import { makeAffan } from '../../shared/affan.js';
import { add, glow, glowTex, makeTree, makeStars } from '../../shared/props.js';
import { buildOutro } from '../005-bulan-ikut-kereta/worlds.js';

export { buildOutro };

const std = (color, rough = 0.7, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0, ...extra });
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const clamp01 = (x) => Math.min(1, Math.max(0, x));

export function gradientSky(top, bot, radius = 900) {
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: { top: { value: new THREE.Color(top) }, bot: { value: new THREE.Color(bot) } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `uniform vec3 top, bot; varying vec3 vP;
      void main(){ gl_FragColor = vec4(mix(bot, top, smoothstep(-0.15, 0.6, vP.y)), 1.0);
        #include <colorspace_fragment>
      }`,
  });
  const m = new THREE.Mesh(new THREE.SphereGeometry(radius, 32, 16), mat);
  m.renderOrder = -10;
  return m;
}

// Kinabalu: a broad massif with a jagged granite crown of spires.
// Height H, base radius Rb; vertex colours forest -> rock.
export function makeKinabalu(H = 10, Rb = 9, { night = false } = {}) {
  const geo = new THREE.ConeGeometry(Rb, H, 72, 32, false);
  geo.translate(0, H / 2, 0);
  const p = geo.attributes.position;
  const colors = new Float32Array(p.count * 3);
  const forest = new THREE.Color(night ? 0x14301e : 0x2f8a45), moss = new THREE.Color(night ? 0x26341e : 0x6a8a4a), rock = new THREE.Color(night ? 0x3a3a44 : 0x8e877c), granite = new THREE.Color(night ? 0x4a4a56 : 0xa8a196);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const a = Math.atan2(z, x);
    const h = y / H;
    const n = Math.sin(a * 6) * 0.5 + Math.sin(a * 13 + 1) * 0.3 + Math.sin(a * 29 + 2) * 0.2;
    // broad shoulders, flat-ish crown
    const prof = h < 0.7 ? 1 : 1 + (h - 0.7) * 1.6;
    const r = (1 + 0.08 * n) * prof;
    let yy = y;
    if (h > 0.62) yy = H * (0.62 + (h - 0.62) * 0.55) + Math.max(0, Math.sin(a * 7) * 0.7 + Math.sin(a * 17 + 1) * 0.45 + Math.sin(a * 3) * 0.3) * (h - 0.62) * H * 0.7;
    p.setXYZ(i, x * r, yy, z * r);
    const c = forest.clone().lerp(moss, clamp01((h - 0.35) / 0.15)).lerp(rock, clamp01((h - 0.52) / 0.12)).lerp(granite, clamp01((h - 0.7) / 0.2));
    colors.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  return new THREE.Mesh(geo, std(0xffffff, 0.92, { vertexColors: true, flatShading: true }));
}

function makePuff(R, s = 1, mat) {
  const g = new THREE.Group();
  const n = 4 + Math.floor(R() * 3);
  for (let i = 0; i < n; i++) add(g, new THREE.SphereGeometry(1, 14, 10), mat, [(i - n / 2) * 0.9 + R() * 0.3, R() * 0.4, (R() - 0.5) * 0.8], [0, 0, 0], [0.9 + R() * 0.6, 0.6 + R() * 0.3, 0.8], false);
  g.scale.setScalar(s);
  return g;
}
const cloudMat = () => std(0xffffff, 1, { emissive: 0xe4ecf8, emissiveIntensity: 0.45 });

// a twin tower pair, height ~1 (scale it), standing on y = 0
export function makeTwinTowers() {
  const g = new THREE.Group();
  const steel = std(0xc8d0dc, 0.25, { metalness: 0.5, emissive: 0x2a3040, emissiveIntensity: 0.2 });
  for (const s of [-1, 1]) {
    let y = 0;
    const tiers = [[0.13, 0.42], [0.12, 0.2], [0.1, 0.14], [0.08, 0.1], [0.06, 0.06]];
    for (const [r, h] of tiers) {
      add(g, new THREE.CylinderGeometry(r * 0.95, r, h, 16), steel, [s * 0.2, y + h / 2, 0], [0, 0, 0], [1, 1, 1], false);
      y += h;
    }
    add(g, new THREE.ConeGeometry(0.012, 0.12, 6), steel, [s * 0.2, y + 0.06, 0], [0, 0, 0], [1, 1, 1], false);
  }
  add(g, new THREE.BoxGeometry(0.2, 0.025, 0.05), steel, [0, 0.47, 0], [0, 0, 0], [1, 1, 1], false);
  return g;
}

// ------------------------------------------------------------- Kundasang
export const A_KD = V3(0, 0, 0);
export function buildKundasang() {
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xd8e8f8, 60, 260);
  const sky = gradientSky(0x3d86e0, 0xeaf4ff);
  scene.add(sky);
  scene.add(new THREE.HemisphereLight(0xeaf4ff, 0x5a7a4a, 1.25));
  const key = new THREE.DirectionalLight(0xfff0d8, 1.9);
  key.position.set(10, 16, 12);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  Object.assign(key.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8, near: 1, far: 60 });
  scene.add(key);
  // rolling hillside
  const hill = new THREE.PlaneGeometry(400, 400, 80, 80);
  hill.rotateX(-Math.PI / 2);
  const hp = hill.attributes.position;
  for (let i = 0; i < hp.count; i++) {
    const x = hp.getX(i), z = hp.getZ(i);
    const far = clamp01((-z - 8) / 40);
    hp.setY(i, (Math.sin(x * 0.08) * 1.2 + Math.sin(z * 0.11 + 1) * 1.0) * far - (z > 0 ? 0 : 0));
  }
  hill.computeVertexNormals();
  add(scene, hill, std(0x6ab84a, 0.95), [0, 0, 0], [0, 0, 0], [1, 1, 1], false).receiveShadow = true;
  // cabbage rows in front and around
  const R = rng(49);
  const cab = std(0x9ad86a, 0.8), cab2 = std(0x7ac85a, 0.8);
  const rowMat = std(0x8a6a4a, 0.95);
  for (let r = 0; r < 7; r++) {
    const z = -3 - r * 1.3;
    add(scene, new THREE.BoxGeometry(18, 0.12, 0.7), rowMat, [-4, 0.04, z], [0, 0, 0], [1, 1, 1], false);
    for (let i = 0; i < 18; i++) add(scene, new THREE.SphereGeometry(0.26, 12, 10), i % 2 ? cab : cab2, [-12.5 + i + R() * 0.2, 0.25, z], [0, 0, 0], [1, 0.8, 1]);
  }
  // wooden fence
  const wood = std(0x8a5a3a, 0.8);
  for (let x = -6; x <= 7; x += 1.4) add(scene, new THREE.BoxGeometry(0.12, 1.1, 0.12), wood, [x, 0.55, -1.6]);
  for (const y of [0.5, 0.95]) add(scene, new THREE.BoxGeometry(13.2, 0.08, 0.06), wood, [0.5, y, -1.6]);
  // Kinabalu, far away and huge, with a cloud ring
  const mt = makeKinabalu(70, 75);
  mt.position.set(-10, -4, -190);
  scene.add(mt);
  const cm = cloudMat();
  const ring = new THREE.Group();
  scene.add(ring);
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * Math.PI * 2;
    const c = makePuff(R, 6 + R() * 4, cm);
    c.position.set(-10 + Math.cos(a) * 62, 26 + R() * 5, -190 + Math.sin(a) * 50);
    ring.add(c);
  }
  for (let i = 0; i < 8; i++) {
    const c = makePuff(R, 3 + R() * 3, cm);
    c.position.set(-80 + i * 25, 45 + R() * 15, -150 - R() * 40);
    scene.add(c);
  }
  // trees on the sides
  for (let i = 0; i < 24; i++) {
    const tr = makeTree(R, { scale: 1.0 + R() * 0.8, leaf: [0x2f8a45, 0x3f9a50, 0x267a3a], toy: true });
    const side = i % 2 ? 1 : -1;
    tr.position.set(side * (9 + R() * 14), 0, -4 - R() * 30);
    scene.add(tr);
  }
  const aff = makeAffan();
  aff.root.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  scene.add(aff.root);
  return { scene, sky, ring, aff };
}

// -------------------------------------------------------- measuring stage
export const M_H = 12; // model height = 4,095 m
export const TOWER_H = M_H * (452 / 4095);
export function buildMeasure() {
  const scene = new THREE.Scene();
  const sky = gradientSky(0x2a6ad0, 0xdcecff);
  scene.add(sky);
  scene.add(new THREE.HemisphereLight(0xeaf4ff, 0x5a7a4a, 1.25));
  const key = new THREE.DirectionalLight(0xfff0d8, 1.8);
  key.position.set(8, 14, 12);
  scene.add(key);
  add(scene, new THREE.CircleGeometry(60, 48), std(0x6ab84a, 0.95), [0, 0, 0], [-Math.PI / 2, 0, 0], [1, 1, 1], false);
  const mt = makeKinabalu(M_H, 5.2);
  mt.position.set(-3.6, 0, -1);
  scene.add(mt);
  // ruler
  const ruler = new THREE.Group();
  ruler.position.set(4.3, 0, 0.5);
  scene.add(ruler);
  add(ruler, new THREE.BoxGeometry(0.3, M_H, 0.12), std(0xffd84a, 0.5), [0, M_H / 2, 0]);
  for (let i = 0; i <= 8; i++) add(ruler, new THREE.BoxGeometry(i % 2 ? 0.25 : 0.45, 0.06, 0.14), std(0x17256b, 0.5), [-0.12, (i / 8) * M_H * (4000 / 4095), 0.02], [0, 0, 0], [1, 1, 1], false);
  // a dashed line from the summit to the ruler
  const line = add(scene, new THREE.BoxGeometry(8.4, 0.05, 0.05), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 }), [0.1, M_H, 0.5], [0, 0, 0], [1, 1, 1], false);
  // nine stacked twin towers
  const towers = [];
  for (let i = 0; i < 9; i++) {
    const tw = makeTwinTowers();
    tw.scale.setScalar(TOWER_H);
    tw.position.set(2.4, i * TOWER_H, 0.6);
    scene.add(tw);
    towers.push(tw);
  }
  const R = rng(4900);
  const cm = cloudMat();
  for (let i = 0; i < 6; i++) {
    const c = makePuff(R, 0.8 + R() * 0.6, cm);
    c.position.set(-12 + i * 5, 6 + R() * 6, -8 - R() * 6);
    scene.add(c);
  }
  return { scene, sky, ruler, line, towers };
}

// ----------------------------------------------------------------- climb
// slope rises along +x: ground height y = SLOPE(x)
export const SLOPE = (x) => 0.42 * x + 0.6 * Math.sin(x * 0.35);
export const ZONES = [[-4, 14, 0x2f7a3a], [14, 24, 0x5a7a3a], [24, 31, 0x7a7a4a], [31, 46, 0x9a948a]];
export function buildClimb() {
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xcfe0f0, 30, 120);
  const sky = gradientSky(0x4a8ad8, 0xe6f0fa);
  scene.add(sky);
  scene.add(new THREE.HemisphereLight(0xeaf4ff, 0x4a5a3a, 1.3));
  const key = new THREE.DirectionalLight(0xfff0d8, 1.6);
  key.position.set(-6, 20, 14);
  scene.add(key);
  // cut-away slope: one extruded slab per zone
  for (const [x0, x1, col] of ZONES) {
    const sh = new THREE.Shape();
    sh.moveTo(x0, -6);
    for (let x = x0; x <= x1 + 0.001; x += 0.5) sh.lineTo(x, SLOPE(x));
    sh.lineTo(x1, -6);
    sh.closePath();
    const g = new THREE.ExtrudeGeometry(sh, { depth: 8, bevelEnabled: false, curveSegments: 4 });
    g.translate(0, 0, -6);
    add(scene, g, std(col, 0.95, { flatShading: true }), [0, 0, 0], [0, 0, 0], [1, 1, 1], false);
  }
  // inside cut face: soil
  const soil = new THREE.Shape();
  soil.moveTo(-4, -6);
  for (let x = -4; x <= 46; x += 0.5) soil.lineTo(x, SLOPE(x) - 0.35);
  soil.lineTo(46, -6);
  soil.closePath();
  add(scene, new THREE.ShapeGeometry(soil), std(0x7a5a3a, 1), [0, 0, 2.02], [0, 0, 0], [1, 1, 1], false);
  // vegetation by zone
  const R = rng(4901);
  const moss = std(0x8aa86a, 0.9), mossHang = std(0xa8c07a, 0.9);
  for (let x = -3; x < 31; x += 0.8 + R() * 0.6) {
    const z = -5 + R() * 6.5;
    if (z > 0.6 && z < 2.4) continue;
    const y = SLOPE(x);
    let tr;
    if (x < 14) tr = makeTree(R, { scale: 1.6 + R() * 0.8, leaf: [0x1f6a32, 0x2f7a3a, 0x3f8a45] });
    else if (x < 24) {
      tr = makeTree(R, { scale: 0.8 + R() * 0.3, leaf: [0x5a7a4a, 0x6a8a52, 0x4a6a42], trunk: 0x5a4a3a });
      for (let k = 0; k < 3; k++) add(tr, new THREE.ConeGeometry(0.08, 0.6, 5), mossHang, [(R() - 0.5) * 0.8, 1.0 + R() * 0.5, (R() - 0.5) * 0.8], [Math.PI, 0, 0], [1, 1, 1], false);
    } else {
      tr = new THREE.Group();
      for (let k = 0; k < 3; k++) add(tr, new THREE.SphereGeometry(0.35, 10, 8), moss, [(R() - 0.5) * 0.6, 0.2, (R() - 0.5) * 0.6], [0, 0, 0], [1, 0.6, 1]);
    }
    tr.position.set(x, y - 0.05, z);
    scene.add(tr);
  }
  // granite boulders
  const gran = std(0xb0a89c, 0.85, { flatShading: true });
  for (let i = 0; i < 26; i++) {
    const x = 31 + R() * 14;
    const m = add(scene, new THREE.DodecahedronGeometry(0.5 + R() * 0.8, 0), gran, [x, SLOPE(x) + 0.1, -5 + R() * 6]);
    m.scale.set(1.4, 0.6, 1.1);
  }
  // mist in the mossy forest
  const mistMat = new THREE.SpriteMaterial({ map: glowTex, color: 0xffffff, transparent: true, opacity: 0.35, depthWrite: false });
  const mist = [];
  for (let i = 0; i < 18; i++) {
    const s = new THREE.Sprite(mistMat);
    const x = 14 + R() * 10;
    s.position.set(x, SLOPE(x) + 1 + R() * 2.5, -3 + R() * 5);
    s.scale.setScalar(4 + R() * 3);
    scene.add(s);
    mist.push(s);
  }
  // path stones along the trail (z = 1.5)
  for (let x = -3; x < 45; x += 0.9) add(scene, new THREE.CylinderGeometry(0.25, 0.28, 0.08, 8), std(0xc8b89a, 0.9), [x, SLOPE(x) + 0.03, 1.5], [0, 0, Math.atan(0.42)], [1, 1, 1], false);
  const aff = makeAffan();
  aff.root.scale.setScalar(0.55);
  scene.add(aff.root);
  // backpack
  add(aff.parts.torso, new THREE.BoxGeometry(0.7, 0.8, 0.35), std(0xff8a3d, 0.7), [0, 0.45, -0.5]);
  return { scene, sky, mist, aff };
}

// ---------------------------------------------------------------- summit
export const SUM_Y = 0;
export function buildSummit() {
  const scene = new THREE.Scene();
  const sky = gradientSky(0x0a1a3a, 0x1a2a5a);
  scene.add(sky);
  const stars = makeStars(900, 800, 49);
  scene.add(stars);
  const hemi = new THREE.HemisphereLight(0xdfe8ff, 0x4a4a5a, 0.6);
  scene.add(hemi);
  const key = new THREE.DirectionalLight(0xffd8a8, 0.4);
  key.position.set(30, 8, -40);
  scene.add(key);
  // sea of clouds below
  const R = rng(4902);
  const cm = std(0xffffff, 1, { emissive: 0xffffff, emissiveIntensity: 0.1 });
  const sea = new THREE.Group();
  scene.add(sea);
  for (let i = 0; i < 70; i++) {
    const c = makePuff(R, 2 + R() * 3, cm);
    const a = R() * Math.PI * 2, r = 12 + R() * 70;
    c.position.set(Math.cos(a) * r, -9 + R() * 2, Math.sin(a) * r - 10);
    sea.add(c);
  }
  // granite plateau: big flattened rocks
  const gran = std(0x9a9488, 0.85, { flatShading: true });
  for (let i = 0; i < 16; i++) {
    const m = add(scene, new THREE.DodecahedronGeometry(2 + R() * 2, 1), gran, [(R() - 0.5) * 22, -1.6 - R() * 0.6, (R() - 0.5) * 16 - 4]);
    m.scale.set(1.6, 0.5, 1.4);
  }
  add(scene, new THREE.CylinderGeometry(14, 18, 4, 24, 1), gran, [0, -2.4, -4]);
  // spires (Low's Peak is the tallest, behind the sign)
  const spires = [];
  for (const [x, z, h, r] of [[-1.5, -6, 5.5, 1.6], [-7, -9, 4.0, 1.4], [6, -10, 4.6, 1.7], [10, -6, 3.2, 1.2], [-11, -4, 3.0, 1.2]]) {
    const g = new THREE.ConeGeometry(r, h, 7, 4);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) p.setX(i, p.getX(i) * (1 + 0.2 * Math.sin(p.getY(i) * 3 + i)));
    g.computeVertexNormals();
    spires.push(add(scene, g, gran, [x, h / 2 - 0.8, z]));
  }
  // Low's Peak sign
  const sign = new THREE.Group();
  sign.position.set(1.2, -0.4, -2.2);
  scene.add(sign);
  add(sign, new THREE.CylinderGeometry(0.08, 0.08, 2.2, 8), std(0x6a4a2a, 0.7), [0, 1.1, -0.12]);
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 256;
  const g2 = c.getContext('2d');
  g2.fillStyle = '#2a5a2a';
  g2.fillRect(0, 0, 512, 256);
  g2.strokeStyle = '#f6e8a8';
  g2.lineWidth = 12;
  g2.strokeRect(10, 10, 492, 236);
  g2.fillStyle = '#ffffff';
  g2.textAlign = 'center';
  g2.font = '800 66px "Baloo 2", sans-serif';
  g2.fillText('PUNCAK LOW', 256, 110);
  g2.font = '800 60px "Baloo 2", sans-serif';
  g2.fillText('4,095.2 m', 256, 190);
  const signTex = new THREE.CanvasTexture(c);
  signTex.colorSpace = THREE.SRGBColorSpace;
  const board = add(sign, new THREE.BoxGeometry(1.6, 0.8, 0.06), [std(0x2a5a2a), std(0x2a5a2a), std(0x2a5a2a), std(0x2a5a2a), new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.6 }), std(0x2a5a2a)], [0, 2.0, 0]);
  // sun
  const sun = glow(0xffd88a, 16, 1);
  scene.add(sun);
  const sunDisc = add(scene, new THREE.CircleGeometry(2.2, 32), new THREE.MeshBasicMaterial({ color: 0xffe8a8 }), [0, 0, 0], [0, 0, 0], [1, 1, 1], false);
  // frost sparkles on the rocks
  const frost = [];
  for (let i = 0; i < 40; i++) {
    const s = glow(0xe8f4ff, 0.25, 0);
    s.position.set((R() - 0.5) * 14, -0.7 + R() * 0.6, (R() - 0.5) * 8 - 1);
    s.userData.ph = R() * 6;
    scene.add(s);
    frost.push(s);
  }
  // breath puffs
  const puffMat = new THREE.SpriteMaterial({ map: glowTex, color: 0xffffff, transparent: true, opacity: 0.5, depthWrite: false });
  const breath = Array.from({ length: 6 }, () => {
    const s = new THREE.Sprite(puffMat);
    s.visible = false;
    scene.add(s);
    return s;
  });
  // thin-air oxygen dots
  const oMat = new THREE.SpriteMaterial({ map: glowTex, color: 0x6affff, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending });
  const oxy = Array.from({ length: 14 }, () => {
    const s = new THREE.Sprite(oMat);
    s.userData = { x: (R() - 0.5) * 8, y: 0.5 + R() * 4, z: (R() - 0.5) * 3 + 1, ph: R() * 6 };
    s.visible = false;
    scene.add(s);
    return s;
  });
  const aff = makeAffan();
  scene.add(aff.root);
  // beanie and scarf for the cold
  const knit = std(0xff5c6a, 0.9), knit2 = std(0xffffff, 0.9);
  add(aff.parts.head, new THREE.SphereGeometry(0.98, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), knit, [0, 0.5, 0], [0, 0, 0], [1, 0.8, 0.97]);
  add(aff.parts.head, new THREE.TorusGeometry(0.92, 0.1, 10, 40), knit2, [0, 0.52, 0], [Math.PI / 2, 0, 0]);
  add(aff.parts.head, new THREE.SphereGeometry(0.2, 12, 10), knit2, [0, 1.3, 0]);
  add(aff.parts.torso, new THREE.TorusGeometry(0.42, 0.12, 10, 30), knit, [0, 0.86, 0], [Math.PI / 2, 0, 0]);
  return { scene, sky, stars, hemi, key, sea, spires, sign, board, sun, sunDisc, frost, breath, oxy, aff };
}

// -------------------------------------------------------------- night climb
export const HUT = V3(-2.2, 3.4, 4);
export function buildNight() {
  const scene = new THREE.Scene();
  const sky = gradientSky(0x050a20, 0x1a2450);
  scene.add(sky);
  const stars = makeStars(1400, 800, 50);
  scene.add(stars);
  scene.add(new THREE.HemisphereLight(0x8aa0e0, 0x101020, 0.55));
  const moon = new THREE.DirectionalLight(0xc8d8ff, 0.6);
  moon.position.set(-10, 20, 10);
  scene.add(moon);
  const mt = makeKinabalu(16, 14, { night: true });
  mt.position.set(0, -2, -6);
  scene.add(mt);
  // Laban Rata rest house
  const hut = new THREE.Group();
  hut.position.copy(HUT);
  scene.add(hut);
  add(hut, new THREE.BoxGeometry(2.4, 1.0, 1.2), std(0xd8c8a8, 0.8), [0, 0.5, 0]);
  add(hut, new THREE.ConeGeometry(1.75, 0.7, 4), std(0x8a3a2a, 0.7), [0, 1.35, 0], [0, Math.PI / 4, 0], [1, 1, 0.55]);
  const win = new THREE.MeshBasicMaterial({ color: 0xffd27a });
  for (let i = 0; i < 4; i++) add(hut, new THREE.PlaneGeometry(0.3, 0.3), win, [-0.8 + i * 0.53, 0.55, 0.61], [0, 0, 0], [1, 1, 1], false);
  const hutGlow = glow(0xffc86a, 4, 0.5);
  hutGlow.position.set(0, 0.6, 0.8);
  hut.add(hutGlow);
  // zigzag trail from the hut to the summit
  const pts = [];
  let x = HUT.x + 0.6, y = HUT.y + 0.2, z = HUT.z;
  for (let k = 0; k < 8; k++) {
    pts.push(V3(x, y, z));
    x += k % 2 ? -2.4 : 2.4;
    y += 1.15;
    z -= 0.55;
  }
  pts.push(V3(0.2, 13.4, -2.5));
  const trail = new THREE.CatmullRomCurve3(pts);
  add(scene, new THREE.TubeGeometry(trail, 120, 0.04, 5), new THREE.MeshBasicMaterial({ color: 0x8a8aa0, transparent: true, opacity: 0.5 }), [0, 0, 0], [0, 0, 0], [1, 1, 1], false);
  const lampMat = new THREE.SpriteMaterial({ map: glowTex, color: 0xfff2b0, transparent: true, opacity: 1, depthWrite: false, blending: THREE.AdditiveBlending });
  const lamps = Array.from({ length: 22 }, () => {
    const s = new THREE.Sprite(lampMat);
    s.scale.setScalar(0.45);
    scene.add(s);
    return s;
  });
  return { scene, sky, stars, trail, lamps };
}

// ---------------------------------------------------------- pitcher plant
export function buildPitcher() {
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xb8d0b0, 8, 40);
  const sky = gradientSky(0x9ac8a0, 0xe0ecd8);
  scene.add(sky);
  scene.add(new THREE.HemisphereLight(0xf0fff0, 0x3a4a2a, 1.3));
  const key = new THREE.DirectionalLight(0xfff4e0, 1.3);
  key.position.set(4, 10, 8);
  scene.add(key);
  add(scene, new THREE.CircleGeometry(40, 40), std(0x5a7a3a, 1), [0, 0, 0], [-Math.PI / 2, 0, 0], [1, 1, 1], false);
  const R = rng(4903);
  const mossM = std(0x7a9a4a, 1);
  for (let i = 0; i < 50; i++) add(scene, new THREE.SphereGeometry(0.3 + R() * 0.5, 10, 8), mossM, [(R() - 0.5) * 16, 0, (R() - 0.5) * 10 - 3], [0, 0, 0], [1.4, 0.4, 1.2], false);
  // ferns
  const fern = std(0x3f8a3a, 0.8, { side: THREE.DoubleSide });
  for (let i = 0; i < 16; i++) {
    const f = new THREE.Group();
    f.position.set((R() - 0.5) * 14, 0, -2 - R() * 8);
    scene.add(f);
    for (let k = 0; k < 6; k++) add(f, new THREE.PlaneGeometry(0.4, 1.8), fern, [0, 0.8, 0], [0.5 + R() * 0.3, (k / 6) * Math.PI * 2, 0], [1, 1, 1], false);
  }
  for (let i = 0; i < 8; i++) {
    const tr = makeTree(R, { scale: 1.4 + R(), leaf: [0x4a7a42, 0x5a8a4a, 0x3a6a3a], trunk: 0x5a4a3a });
    tr.position.set((R() - 0.5) * 24, 0, -9 - R() * 10);
    scene.add(tr);
  }
  // giant pitcher (Nepenthes rajah): lathe cup, ribbed rim, lid
  const pitcher = new THREE.Group();
  pitcher.position.set(0.9, 0, 0);
  scene.add(pitcher);
  const prof = [];
  for (let i = 0; i <= 20; i++) {
    const u = i / 20;
    const r = 0.25 + 0.75 * Math.sin(Math.PI * Math.min(1, u * 1.15)) ** 0.8 * (1 - 0.25 * u) + 0.15 * u;
    prof.push(new THREE.Vector2(Math.max(0.05, r), u * 2.0));
  }
  const cupMat = std(0x9a2a3a, 0.5, { emissive: 0x3a0a10, emissiveIntensity: 0.3, side: THREE.DoubleSide });
  const cup = add(pitcher, new THREE.LatheGeometry(prof, 32), cupMat, [0, 0.1, 0]);
  cup.scale.set(1, 1, 0.9);
  // spots
  const spotM = std(0xc85a4a, 0.5);
  for (let i = 0; i < 22; i++) {
    const a = R() * Math.PI * 2, h = 0.3 + R() * 1.4;
    const rr = prof[Math.round((h / 2) * 20)].x + 0.01;
    add(pitcher, new THREE.SphereGeometry(0.06 + R() * 0.05, 8, 6), spotM, [Math.cos(a) * rr, h + 0.1, Math.sin(a) * rr * 0.9], [0, 0, 0], [1, 1, 0.3], false);
  }
  const rim = add(pitcher, new THREE.TorusGeometry(prof[20].x, 0.12, 10, 40), std(0xd8384a, 0.4, { emissive: 0x5a0a10, emissiveIntensity: 0.3 }), [0, 2.1, 0], [Math.PI / 2, 0, 0], [1, 0.9, 1]);
  const lid = add(pitcher, new THREE.SphereGeometry(0.85, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), std(0x7a3a2a, 0.6, { side: THREE.DoubleSide }), [0, 2.6, -0.65], [-0.9, 0, 0], [1, 0.25, 1]);
  add(pitcher, new THREE.CylinderGeometry(0.06, 0.06, 1.2, 8), std(0x4a7a3a, 0.7), [-0.9, 0.6, 0], [0, 0, 0.6], [1, 1, 1], false);
  // liquid inside
  add(pitcher, new THREE.CircleGeometry(prof[12].x * 0.95, 24), std(0xc8b04a, 0.2, { transparent: true, opacity: 0.7 }), [0, 1.3, 0], [-Math.PI / 2, 0, 0], [1, 0.9, 1], false);
  // orchids: stems with five-petal flowers
  const orchids = [];
  const pet = [0xff7ad8, 0xffffff, 0xc39aff, 0xffd84a, 0xff9a5a];
  for (let i = 0; i < 9; i++) {
    const o = new THREE.Group();
    o.position.set(-3.6 + (i % 5) * 0.9 + (R() - 0.5) * 0.3, 0, 1.2 - Math.floor(i / 5) * 1.6 + (R() - 0.5) * 0.4);
    scene.add(o);
    add(o, new THREE.CylinderGeometry(0.03, 0.03, 1.0, 6), std(0x4a8a3a, 0.7), [0, 0.5, 0], [0, 0, 0], [1, 1, 1], false);
    const fl = new THREE.Group();
    fl.position.set(0, 1.05, 0.05);
    o.add(fl);
    const m = std(pet[i % pet.length], 0.6, { side: THREE.DoubleSide, emissive: pet[i % pet.length], emissiveIntensity: 0.15 });
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2;
      add(fl, new THREE.CircleGeometry(0.16, 12), m, [Math.cos(a) * 0.14, Math.sin(a) * 0.14, 0], [0, 0, a], [1, 0.55, 1], false);
    }
    add(fl, new THREE.SphereGeometry(0.06, 8, 6), std(0xffe04a, 0.5), [0, 0, 0.03], [0, 0, 0], [1, 1, 1], false);
    o.scale.setScalar(0);
    orchids.push(o);
  }
  const aff = makeAffan();
  aff.root.scale.setScalar(0.5);
  scene.add(aff.root);
  return { scene, sky, pitcher, lid, rim, orchids, aff };
}
