// Episode 047 sets:
//  - the Episode 031 living room with an aquarium on a low cabinet: glass,
//    water, gravel, plants, an air stone with bubbles and three small fish;
//  - the underwater world: a big friendly fish seen side-on, with its mouth
//    opening and closing, water flowing in at the mouth and out of the gill
//    slit, and tiny oxygen dots hidden in the water; a mini Affan swims by;
//  - the gill close-up: a gill arch with a comb of red filaments full of
//    blood, water flowing between them, oxygen dots soaking in; the filaments
//    can clump together (out of water); plus a pair of lungs for comparison;
//  - a muddy padi-field pond with keli (catfish), puyu (climbing perch) and
//    haruan (snakehead) that rise to the surface to gulp air;
//  - the branded outro stage from Episode 005.
import * as THREE from 'three';
import { rng } from '../../shared/core.js';
import { makeAffan } from '../../shared/affan.js';
import { add, glow, glowTex } from '../../shared/props.js';
import { buildOutro, RoundedBoxGeometry } from '../005-bulan-ikut-kereta/worlds.js';
import { buildLivingRoom } from '../031-geletek-diri-sendiri/worlds.js';

export { buildOutro };

const std = (color, rough = 0.7, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0, ...extra });
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

function gradientSky(top, bot) {
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: { top: { value: new THREE.Color(top) }, bot: { value: new THREE.Color(bot) } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `uniform vec3 top, bot; varying vec3 vP;
      void main(){ gl_FragColor = vec4(mix(bot, top, smoothstep(-0.3, 0.7, vP.y)), 1.0);
        #include <colorspace_fragment>
      }`,
  });
  const m = new THREE.Mesh(new THREE.SphereGeometry(200, 32, 16), mat);
  m.renderOrder = -10;
  return m;
}
function lumpy(rx, ry, rz, seed = 4) {
  const g = new THREE.SphereGeometry(1, 48, 32);
  const p = g.attributes.position;
  const R = rng(seed);
  const ph = [R() * 6, R() * 6];
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const n = Math.sin(9 * x + 2 * Math.sin(3 * y + ph[0])) * Math.sin(8 * y + 1.7 * Math.sin(2.6 * z + ph[1]));
    const r = 1 + 0.05 * n;
    p.setXYZ(i, x * r * rx, y * r * ry, z * r * rz);
  }
  g.computeVertexNormals();
  return g;
}

// ------------------------------------------------------------------ a fish
// Faces +x, ~2 units long. mouth(k) opens it; set(t) wiggles the tail.
export function makeFish({ color = 0xff8a2a, belly = 0xffe0a0, len = 1, whiskers = false, spots = 0, flat = 0.55 } = {}) {
  const root = new THREE.Group();
  const g = new THREE.Group();
  root.add(g);
  const skin = std(color, 0.35, { emissive: color, emissiveIntensity: 0.12 });
  add(g, new THREE.SphereGeometry(0.5, 32, 20), skin, [0, 0, 0], [0, 0, 0], [1.0 * len + 0.2, 0.62, flat]);
  add(g, new THREE.SphereGeometry(0.42, 28, 16), std(belly, 0.5), [0.05, -0.12, 0], [0, 0, 0], [0.95 * len + 0.15, 0.42, flat * 0.9]);
  const X = 0.5 * (1.0 * len + 0.2);
  // mouth (dark hole that opens)
  const mouth = add(g, new THREE.SphereGeometry(0.09, 16, 12), new THREE.MeshBasicMaterial({ color: 0x2a0a10 }), [X - 0.02, -0.04, 0], [0, 0, 0], [0.5, 0.3, 1], false);
  // eyes
  for (const s of [-1, 1]) {
    add(g, new THREE.SphereGeometry(0.1, 16, 12), std(0xffffff, 0.3), [X - 0.28, 0.08, s * 0.24 * flat / 0.55], [0, 0, 0], [1, 1, 0.6], false);
    add(g, new THREE.SphereGeometry(0.055, 12, 10), new THREE.MeshBasicMaterial({ color: 0x101010 }), [X - 0.25, 0.08, s * 0.29 * flat / 0.55], [0, 0, 0], [1, 1, 0.6], false);
    // gill cover line and slit
    add(g, new THREE.TorusGeometry(0.22, 0.018, 6, 20, Math.PI * 0.9), std(0x000000, 0.6, { transparent: true, opacity: 0.35 }), [X - 0.52, -0.02, s * 0.25 * flat / 0.55], [0, s > 0 ? 0 : Math.PI, -Math.PI * 0.45], [0.6, 1, 1], false);
  }
  if (whiskers) {
    for (const s of [-1, 1]) for (const k of [0, 1]) {
      const c = new THREE.CatmullRomCurve3([V3(X - 0.05, -0.05 - k * 0.05, s * 0.06), V3(X + 0.15, -0.12 - k * 0.1, s * 0.25), V3(X + 0.3, -0.25 - k * 0.12, s * 0.35)]);
      add(g, new THREE.TubeGeometry(c, 10, 0.014, 6), std(0x2a2420, 0.6), [0, 0, 0], [0, 0, 0], [1, 1, 1], false);
    }
  }
  const R = rng(Math.floor(len * 100 + spots));
  for (let i = 0; i < spots; i++) {
    const x = (R() - 0.6) * X * 1.4, y = (R() - 0.3) * 0.25;
    for (const s of [-1, 1]) add(g, new THREE.CircleGeometry(0.05 + R() * 0.05, 12), std(0x2a2018, 0.6), [x, y, s * (flat * 0.5 - 0.02)], [0, s > 0 ? 0 : Math.PI, 0], [1.4, 1, 1], false);
  }
  // fins and tail
  const finMat = std(color, 0.4, { side: THREE.DoubleSide, transparent: true, opacity: 0.85, emissive: color, emissiveIntensity: 0.12 });
  const ts = new THREE.Shape();
  ts.moveTo(0, 0);
  ts.lineTo(-0.5, 0.35);
  ts.quadraticCurveTo(-0.38, 0, -0.5, -0.35);
  ts.lineTo(0, 0);
  const tail = new THREE.Group();
  tail.position.set(-X + 0.05, 0, 0);
  g.add(tail);
  add(tail, new THREE.ShapeGeometry(ts, 12), finMat, [0, 0, 0], [0, 0, 0], [1, 1, 1], false);
  const ds = new THREE.Shape();
  ds.moveTo(-0.25, 0);
  ds.quadraticCurveTo(0, 0.32, 0.25, 0);
  add(g, new THREE.ShapeGeometry(ds, 12), finMat, [-0.1, 0.27, 0], [0, 0, 0], [len, 1, 1], false);
  for (const s of [-1, 1]) add(g, new THREE.ShapeGeometry(ts, 8), finMat, [X - 0.6, -0.15, s * flat * 0.45], [0, s * 0.6, 0.6], [0.45, 0.45, 1], false);
  const set = (t, k = 1) => {
    tail.rotation.y = 0.45 * Math.sin(t * 7) * k;
    g.rotation.y = 0.06 * Math.sin(t * 7 + 1) * k;
  };
  const mouthOpen = (k) => mouth.scale.set(0.5 + 0.4 * k, 0.3 + 1.2 * k, 1);
  mouthOpen(0);
  return { root, g, tail, mouth, set, mouthOpen, X };
}

// -------------------------------------------------------------- living room
export const TANK_AT = V3(-1.3, 1.0, -1.1);
export const A_LR = V3(0.55, 0, 0.15);
export function buildRoom() {
  const w = buildLivingRoom();
  w.kak.root.visible = false;
  const s = w.scene;
  const cab = new THREE.Group();
  cab.position.set(TANK_AT.x, 0, TANK_AT.z);
  s.add(cab);
  add(cab, new RoundedBoxGeometry(2.3, 1.0, 1.1, 2, 0.06), std(0xc98a4a, 0.6), [0, 0.5, 0]);
  // tank
  const T = new THREE.Group();
  T.position.copy(TANK_AT);
  s.add(T);
  const glass = new THREE.MeshPhysicalMaterial({ color: 0xe8f6ff, roughness: 0.05, transparent: true, opacity: 0.18, depthWrite: false, side: THREE.DoubleSide });
  add(T, new THREE.BoxGeometry(2.1, 1.3, 0.95), glass, [0, 0.65, 0], [0, 0, 0], [1, 1, 1], false).renderOrder = 8;
  const water = add(T, new THREE.BoxGeometry(2.04, 1.12, 0.9), new THREE.MeshPhysicalMaterial({ color: 0x7ac8f0, roughness: 0.1, transparent: true, opacity: 0.32, depthWrite: false }), [0, 0.58, 0], [0, 0, 0], [1, 1, 1], false);
  water.renderOrder = 7;
  add(T, new THREE.BoxGeometry(2.1, 0.06, 0.95), std(0x2a2f3a, 0.5), [0, 1.33, 0]);
  const R = rng(47);
  for (let i = 0; i < 70; i++) add(T, new THREE.SphereGeometry(0.035 + R() * 0.03, 8, 6), std([0xe8d8b0, 0xc8a07a, 0xffffff, 0x8a7a6a][i % 4], 0.8), [(R() - 0.5) * 1.95, 0.05 + R() * 0.05, (R() - 0.5) * 0.8], [0, 0, 0], [1, 0.7, 1], false);
  const plants = [];
  for (let i = 0; i < 6; i++) {
    const pl = new THREE.Group();
    pl.position.set(-0.85 + i * 0.32 + (R() - 0.5) * 0.1, 0.08, -0.3 + (i % 2) * 0.15);
    T.add(pl);
    for (let k = 0; k < 4; k++) add(pl, new THREE.CapsuleGeometry(0.03, 0.25, 4, 8), std(0x3fae4a, 0.6), [0, 0.15 + k * 0.22, 0], [0, 0, 0.15 * Math.sin(k + i)]);
    plants.push(pl);
  }
  add(T, new THREE.CylinderGeometry(0.06, 0.06, 0.06, 12), std(0x6a7080, 0.6), [0.75, 0.1, 0.2]);
  const bMat = new THREE.SpriteMaterial({ map: glowTex, color: 0xffffff, transparent: true, opacity: 0.8, depthWrite: false });
  const bubbles = Array.from({ length: 14 }, () => {
    const b = new THREE.Sprite(bMat);
    b.scale.setScalar(0.06);
    T.add(b);
    return b;
  });
  const fish = [0xff8a2a, 0xffd23a, 0x4ab8ff].map((c, i) => {
    const f = makeFish({ color: c, len: 0.9 });
    f.root.scale.setScalar(0.22);
    T.add(f.root);
    return f;
  });
  // a jug for changing the water
  const jug = new THREE.Group();
  add(jug, new THREE.CylinderGeometry(0.16, 0.14, 0.4, 20, 1, true), new THREE.MeshPhysicalMaterial({ color: 0xe8f6ff, roughness: 0.05, transparent: true, opacity: 0.4, side: THREE.DoubleSide }), [0, 0, 0]);
  add(jug, new THREE.CylinderGeometry(0.15, 0.13, 0.3, 20), new THREE.MeshPhysicalMaterial({ color: 0x7ac8f0, roughness: 0.1, transparent: true, opacity: 0.5 }), [0, -0.04, 0], [0, 0, 0], [1, 1, 1], false);
  add(jug, new THREE.TorusGeometry(0.1, 0.025, 8, 16, Math.PI), std(0xe8f6ff, 0.3), [0.18, 0.02, 0], [0, 0, -Math.PI / 2]);
  jug.visible = false;
  s.add(jug);
  return { ...w, tank: T, water, plants, bubbles, fish, jug };
}

// ----------------------------------------------------------- underwater
export const BIG_AT = V3(0, 3.2, 0);
export function buildWater() {
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x2a8ac8, 10, 40);
  const sky = gradientSky(0x8ad8ff, 0x0a3a7a);
  scene.add(sky);
  scene.add(new THREE.HemisphereLight(0xcff4ff, 0x0a3a6a, 1.4));
  const key = new THREE.DirectionalLight(0xe0f8ff, 1.2);
  key.position.set(2, 10, 6);
  scene.add(key);
  add(scene, new THREE.PlaneGeometry(200, 200), std(0xd8c08a, 0.95), [0, 0, 0], [-Math.PI / 2, 0, 0], [1, 1, 1], false);
  const R = rng(470);
  for (let i = 0; i < 18; i++) {
    const pl = new THREE.Group();
    pl.position.set((R() - 0.5) * 18, 0, -3 - R() * 8);
    scene.add(pl);
    const h = 4 + R() * 4;
    for (let k = 0; k < 8; k++) add(pl, new THREE.CapsuleGeometry(0.12, h / 8, 4, 8), std(0x2f9a4a, 0.6), [0.15 * Math.sin(k * 0.8), (k + 0.5) * h / 8, 0], [0, 0, 0.1 * Math.sin(k)]);
  }
  const shaftMat = new THREE.MeshBasicMaterial({ color: 0xbfefff, transparent: true, opacity: 0.08, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  for (let i = 0; i < 8; i++) add(scene, new THREE.PlaneGeometry(1 + R() * 1.4, 26), shaftMat, [(R() - 0.5) * 16, 10, -4 - R() * 8], [0, 0, (R() - 0.5) * 0.4], [1, 1, 1], false);
  const big = makeFish({ color: 0xff8a2a, len: 1.1 });
  big.root.position.copy(BIG_AT);
  big.root.scale.setScalar(2.6);
  scene.add(big.root);
  // water flow particles (in at the mouth, out of the gill slit) and oxygen dots
  const flowMat = new THREE.SpriteMaterial({ map: glowTex, color: 0x9adfff, transparent: true, opacity: 0.85, depthWrite: false });
  const flow = Array.from({ length: 40 }, () => {
    const s = new THREE.Sprite(flowMat);
    s.visible = false;
    scene.add(s);
    return s;
  });
  const oMat = new THREE.SpriteMaterial({ map: glowTex, color: 0x6affff, transparent: true, opacity: 1, depthWrite: false, blending: THREE.AdditiveBlending });
  const oxy = Array.from({ length: 60 }, () => {
    const s = new THREE.Sprite(oMat);
    s.userData = { x: (R() - 0.5) * 9, y: R() * 8 + 0.5, z: (R() - 0.5) * 4 + 1, ph: R() * 6 };
    s.visible = false;
    scene.add(s);
    return s;
  });
  const aff = makeAffan();
  aff.root.scale.setScalar(0.42);
  scene.add(aff.root);
  return { scene, sky, big, flow, oxy, oMat, aff };
}

// ------------------------------------------------------------- gill close-up
export const N_FIL = 22;
export function buildGill() {
  const scene = new THREE.Scene();
  const sky = gradientSky(0x2a8ac8, 0x0a2a5a);
  scene.add(sky);
  scene.add(new THREE.HemisphereLight(0xe0f4ff, 0x0a2a5a, 1.3));
  const key = new THREE.DirectionalLight(0xffffff, 1.4);
  key.position.set(3, 8, 10);
  scene.add(key);
  // gill arch: a curved bony bar
  const arch = new THREE.CatmullRomCurve3([V3(-3.6, 1.0, 0), V3(-1.8, 2.6, 0), V3(0, 3.1, 0), V3(1.8, 2.6, 0), V3(3.6, 1.0, 0)]);
  add(scene, new THREE.TubeGeometry(arch, 60, 0.28, 14), std(0xf6e4d8, 0.5), [0, 0, 0], [0, 0, 0], [1, 1, 1], false);
  add(scene, new THREE.TubeGeometry(arch, 60, 0.12, 10), std(0xd8202e, 0.4, { emissive: 0x5a0008, emissiveIntensity: 0.4 }), [0, 0, 0.22], [0, 0, 0], [1, 1, 1], false);
  // filaments hanging from the arch
  const filMat = std(0xe8384a, 0.45, { emissive: 0x6a0810, emissiveIntensity: 0.3 });
  const fils = [];
  for (let i = 0; i < N_FIL; i++) {
    const u = 0.05 + (i / (N_FIL - 1)) * 0.9;
    const p = arch.getPoint(u);
    const pv = new THREE.Group();
    pv.position.copy(p);
    scene.add(pv);
    const m = add(pv, new THREE.CapsuleGeometry(0.11, 3.0, 6, 12), filMat.clone(), [0, -1.65, 0]);
    // tiny plates on each filament
    for (let k = 0; k < 8; k++) add(pv, new THREE.BoxGeometry(0.34, 0.03, 0.12), m.material, [0, -0.4 - k * 0.38, 0], [0, 0, 0], [1, 1, 1], false);
    fils.push({ pv, m, home: p.clone() });
  }
  const flowMat = new THREE.SpriteMaterial({ map: glowTex, color: 0x9adfff, transparent: true, opacity: 0.8, depthWrite: false });
  const water = Array.from({ length: 50 }, () => {
    const s = new THREE.Sprite(flowMat);
    s.visible = false;
    scene.add(s);
    return s;
  });
  const oMat = new THREE.SpriteMaterial({ map: glowTex, color: 0x6affff, transparent: true, opacity: 1, depthWrite: false, blending: THREE.AdditiveBlending });
  const oxy = Array.from({ length: 30 }, () => {
    const s = new THREE.Sprite(oMat);
    s.visible = false;
    scene.add(s);
    return s;
  });
  // lungs (for "our lungs can't take oxygen from water")
  const lungs = new THREE.Group();
  lungs.position.set(0, 1.2, 0);
  lungs.visible = false;
  scene.add(lungs);
  const lungMat = std(0xff9aaa, 0.6, { emissive: 0x5a1020, emissiveIntensity: 0.2 });
  for (const s of [-1, 1]) add(lungs, lumpy(1.0, 1.6, 0.8, s > 0 ? 3 : 5), lungMat, [s * 1.15, 0, 0], [0, 0, s * 0.12]);
  add(lungs, new THREE.CylinderGeometry(0.16, 0.16, 1.6, 12), std(0xf0d0d8, 0.5), [0, 1.9, 0]);
  for (const s of [-1, 1]) add(lungs, new THREE.CylinderGeometry(0.12, 0.12, 0.9, 10), std(0xf0d0d8, 0.5), [s * 0.4, 1.0, 0], [0, 0, s * 0.8]);
  return { scene, sky, fils, water, oxy, lungs, arch };
}

// -------------------------------------------------------------- muddy pond
export const POND_Y = 4.0;
export function buildPond() {
  const scene = new THREE.Scene();
  const sky = gradientSky(0x6ab8f0, 0xe8f0d8);
  scene.add(sky);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x6a5a3a, 1.3));
  const key = new THREE.DirectionalLight(0xfff0d8, 1.6);
  key.position.set(4, 12, 8);
  scene.add(key);
  // cut-away pond: muddy water box, mud bottom, padi on the banks
  const water = add(scene, new THREE.BoxGeometry(10, POND_Y, 3), new THREE.MeshPhysicalMaterial({ color: 0x8a7a4a, roughness: 0.2, transparent: true, opacity: 0.45, depthWrite: false }), [0, POND_Y / 2, 0], [0, 0, 0], [1, 1, 1], false);
  water.renderOrder = 6;
  add(scene, new THREE.BoxGeometry(10, 0.6, 3), std(0x5a4428, 0.95), [0, -0.3, 0]);
  add(scene, new THREE.PlaneGeometry(10, 3), std(0x9a8a5a, 0.1, { transparent: true, opacity: 0.6, metalness: 0.2 }), [0, POND_Y, 0], [-Math.PI / 2, 0, 0], [1, 1, 1], false).renderOrder = 7;
  for (const x of [-6.5, 6.5]) add(scene, new THREE.BoxGeometry(3, POND_Y + 0.6, 3.4), std(0x6a5a32, 0.95), [x, (POND_Y + 0.6) / 2 - 0.6, 0]);
  const R = rng(4700);
  const blade = new THREE.ConeGeometry(0.05, 0.9, 4);
  blade.translate(0, 0.45, 0);
  for (let i = 0; i < 70; i++) {
    const x = (R() < 0.5 ? -1 : 1) * (5.2 + R() * 2.5);
    add(scene, blade, std(0x6ad84a, 0.7), [x, POND_Y, (R() - 0.5) * 3], [(R() - 0.5) * 0.4, R() * 3, (R() - 0.5) * 0.4], [1, 0.8 + R() * 0.5, 1]);
  }
  const keli = makeFish({ color: 0x4a4a52, belly: 0x8a8a90, len: 1.5, whiskers: true, flat: 0.5 });
  const puyu = makeFish({ color: 0x6a8a4a, belly: 0xc8d0a0, len: 0.9, flat: 0.6 });
  const haruan = makeFish({ color: 0x6a5232, belly: 0xc8b088, len: 1.8, spots: 6, flat: 0.5 });
  const fish = [keli, puyu, haruan];
  fish.forEach((f, i) => {
    f.root.scale.setScalar([1.1, 0.9, 1.1][i]);
    scene.add(f.root);
  });
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8, depthWrite: false, side: THREE.DoubleSide });
  const rings = fish.map(() => {
    const r = add(scene, new THREE.RingGeometry(0.3, 0.4, 32), ringMat.clone(), [0, POND_Y + 0.02, 0], [-Math.PI / 2, 0, 0], [1, 1, 1], false);
    r.visible = false;
    return r;
  });
  return { scene, sky, fish, rings };
}
