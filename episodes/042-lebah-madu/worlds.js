// Episode 042 sets:
//  - the Episode 036 playground: Affan on the bench with bread and a jar of
//    honey, a flower bed beside him, and a beehive hanging from a tree in the
//    distance; a little bee that visits a flower;
//  - the "taman bunga gergasi" (giant flower) imagination world: big flowers
//    with glowing nectar, and a big friendly honeybee with a long straw-like
//    tongue and a see-through tummy (the honey stomach) that can fill up;
//  - inside the hive: a wall of hexagon wax cells that can fill with nectar,
//    turn golden and get a wax cap, with worker bees passing nectar mouth to
//    mouth and fanning their wings;
//  - the teaspoon stage: a big teaspoon and twelve bees, each adding a drop;
//  - the branded outro stage from Episode 005.
import * as THREE from 'three';
import { rng } from '../../shared/core.js';
import { makeAffan } from '../../shared/affan.js';
import { add, glow, glowTex, makeTree } from '../../shared/props.js';
import { buildOutro, RoundedBoxGeometry } from '../005-bulan-ikut-kereta/worlds.js';
import { buildPlayground, PLAY_SCALE, BENCH } from '../036-pening-berpusing/worlds.js';

export { buildOutro, PLAY_SCALE, BENCH };

const std = (color, rough = 0.7, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0, ...extra });
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const HONEY = 0xf2a31a;

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
const stripeTex = (() => {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#ffc928';
  g.fillRect(0, 0, 64, 256);
  g.fillStyle = '#2a1a10';
  for (const y of [70, 130, 190]) g.fillRect(0, y, 64, 30);
  g.fillRect(0, 238, 64, 18);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
})();

// ------------------------------------------------------------------- a bee
// Faces +z; ~1 unit long. setWings(phase), setTongue(0..1), setTummy(fill 0..1),
// cutaway(op): the abdomen becomes see-through to show the honey stomach.
export function makeBee() {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const abdMat = std(0xffffff, 0.5, { map: stripeTex, transparent: true, opacity: 1 });
  const abd = add(body, new THREE.SphereGeometry(0.3, 32, 20), abdMat, [0, 0, -0.32], [-Math.PI / 2, 0, 0], [1, 1.25, 1]);
  add(body, new THREE.ConeGeometry(0.05, 0.14, 10), std(0x2a1a10, 0.5), [0, 0, -0.72], [-Math.PI / 2, 0, 0]);
  const tummy = add(body, new THREE.SphereGeometry(0.15, 20, 14), std(HONEY, 0.2, { emissive: 0xa05a00, emissiveIntensity: 0.6 }), [0, 0.0, -0.3], [0, 0, 0], [1, 1, 1], false);
  tummy.visible = false;
  const fuzz = std(0xffd34a, 0.95);
  add(body, new THREE.SphereGeometry(0.2, 24, 16), fuzz, [0, 0.02, 0.0]);
  const head = new THREE.Group();
  head.position.set(0, 0.04, 0.24);
  body.add(head);
  add(head, new THREE.SphereGeometry(0.17, 24, 16), std(0x3a2618, 0.6), [0, 0, 0]);
  for (const s of [-1, 1]) {
    add(head, new THREE.SphereGeometry(0.075, 16, 12), std(0xffffff, 0.3), [0.075 * s, 0.05, 0.12], [0, 0, 0], [1, 1.15, 0.7], false);
    add(head, new THREE.SphereGeometry(0.04, 12, 10), new THREE.MeshBasicMaterial({ color: 0x101010 }), [0.075 * s, 0.05, 0.17], [0, 0, 0], [1, 1, 1], false);
    add(head, new THREE.SphereGeometry(0.014, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }), [0.085 * s, 0.07, 0.205], [0, 0, 0], [1, 1, 1], false);
    // antennae
    const ant = new THREE.CatmullRomCurve3([V3(0.05 * s, 0.13, 0.05), V3(0.1 * s, 0.26, 0.1), V3(0.16 * s, 0.32, 0.18)]);
    add(head, new THREE.TubeGeometry(ant, 10, 0.012, 6), std(0x2a1a10, 0.6), [0, 0, 0], [0, 0, 0], [1, 1, 1], false);
    add(head, new THREE.SphereGeometry(0.025, 8, 6), std(0x2a1a10, 0.6), [0.16 * s, 0.32, 0.18], [0, 0, 0], [1, 1, 1], false);
  }
  add(head, new THREE.TorusGeometry(0.04, 0.01, 6, 12, Math.PI), new THREE.MeshBasicMaterial({ color: 0x101010 }), [0, -0.04, 0.16], [0, 0, Math.PI], [1, 1, 1], false);
  // tongue (proboscis): a tube along +z from the mouth; scaled by setTongue
  const tongue = new THREE.Group();
  tongue.position.set(0, -0.08, 0.12);
  head.add(tongue);
  const tGeo = new THREE.CylinderGeometry(0.018, 0.012, 1, 10);
  tGeo.translate(0, 0.5, 0);
  tGeo.rotateX(Math.PI / 2 + 0.5);
  add(tongue, tGeo, std(0x5a2a1a, 0.5), [0, 0, 0], [0, 0, 0], [1, 1, 1], false);
  // wings
  const wingMat = new THREE.MeshPhysicalMaterial({ color: 0xeaf6ff, roughness: 0.1, transparent: true, opacity: 0.55, side: THREE.DoubleSide, clearcoat: 1, depthWrite: false });
  const wings = [];
  for (const s of [-1, 1]) {
    for (const [len, z, k] of [[0.42, -0.02, 0], [0.3, -0.12, 1]]) {
      const pivot = new THREE.Group();
      pivot.position.set(0.08 * s, 0.17, z);
      body.add(pivot);
      const w = add(pivot, new THREE.CircleGeometry(1, 24), wingMat, [s * len * 0.5, 0, 0], [-Math.PI / 2, 0, 0], [len * 0.5, 0.11 + 0.03 * (1 - k), 1], false);
      w.renderOrder = 6;
      wings.push({ pivot, s, k });
    }
  }
  // legs
  const legMat = std(0x2a1a10, 0.6);
  for (const s of [-1, 1]) for (let i = 0; i < 3; i++) {
    const l = add(body, new THREE.CylinderGeometry(0.012, 0.01, 0.26, 6), legMat, [0.12 * s, -0.16, 0.08 - i * 0.1], [0.3 * (i - 1), 0, 0.5 * s], [1, 1, 1], false);
    void l;
  }
  const setWings = (ph, amp = 0.7) => wings.forEach((w) => (w.pivot.rotation.z = w.s * (0.25 + amp * Math.sin(ph + w.k * 0.3))));
  const setTongue = (k) => {
    tongue.scale.setScalar(Math.max(0.001, k) * 0.9);
    tongue.visible = k > 0.01;
  };
  const setTummy = (fill, see = 0) => {
    abdMat.opacity = 1 - 0.65 * see;
    abdMat.depthWrite = see < 0.5;
    tummy.visible = see > 0.02;
    tummy.scale.setScalar(0.25 + 0.95 * fill);
  };
  setWings(0);
  setTongue(0);
  setTummy(0, 0);
  return { root, body, head, tongue, tummy, setWings, setTongue, setTummy };
}

// a flower: petals around a yellow centre, on a stem; faces +z
export function makeFlower(color = 0xff7ab0, { petals = 8, r = 1 } = {}) {
  const g = new THREE.Group();
  const head = new THREE.Group();
  g.add(head);
  const pm = std(color, 0.6, { emissive: color, emissiveIntensity: 0.12 });
  for (let i = 0; i < petals; i++) {
    const a = (i / petals) * Math.PI * 2;
    add(head, new THREE.SphereGeometry(0.5 * r, 20, 12), pm, [Math.cos(a) * 0.55 * r, Math.sin(a) * 0.55 * r, -0.02], [0, 0, a], [1.1, 0.5, 0.18]);
  }
  add(head, new THREE.SphereGeometry(0.34 * r, 24, 16), std(0xffc928, 0.8, { emissive: 0x6a4000, emissiveIntensity: 0.25 }), [0, 0, 0.04], [0, 0, 0], [1, 1, 0.45]);
  const nectar = glow(0xfff2a0, 0.8 * r, 0.0);
  nectar.position.set(0, 0, 0.25 * r);
  head.add(nectar);
  return { g, head, nectar };
}

// ------------------------------------------------------------------- park
export const A_BENCH_YAW = -0.6;
export const FLOWERS_AT = V3(2.8, 0, 1.7);
export const HIVE_TREE = V3(9.5, 0, -6.5);
export function buildPark() {
  const w = buildPlayground();
  const s = w.scene;
  // clear the way for the camera in front of the bench
  s.children.forEach((c) => {
    if (c.isGroup && c !== w.aff.root && c !== w.mgr && c !== w.bench && c.position.z > 3 && c.position.x > -2 && c.position.x < 12) c.visible = false;
  });
  // flower bed
  const bed = new THREE.Group();
  bed.position.copy(FLOWERS_AT);
  s.add(bed);
  add(bed, new THREE.CylinderGeometry(1.0, 1.1, 0.25, 32), std(0x6a4426, 0.95), [0, 0.12, 0]);
  const flowers = [];
  const cols = [0xff7ab0, 0xffd84a, 0xb07aff, 0xff9a4a, 0xffffff];
  const R = rng(42);
  for (let i = 0; i < 7; i++) {
    const f = makeFlower(cols[i % cols.length], { r: 0.22 });
    const a = (i / 7) * Math.PI * 2;
    const h = 0.6 + R() * 0.4;
    f.g.position.set(Math.cos(a) * 0.6, h, Math.sin(a) * 0.6);
    f.g.rotation.set(-0.3, -0.6 + (R() - 0.5) * 0.6, 0);
    bed.add(f.g);
    add(bed, new THREE.CylinderGeometry(0.02, 0.025, h, 6), std(0x3f8a36, 0.6), [Math.cos(a) * 0.6, h / 2, Math.sin(a) * 0.6]);
    flowers.push(f);
  }
  // honey jar and bread on the bench
  const jar = new THREE.Group();
  s.add(jar);
  add(jar, new THREE.CylinderGeometry(0.16, 0.16, 0.3, 24), new THREE.MeshPhysicalMaterial({ color: HONEY, roughness: 0.1, transmission: 0, transparent: true, opacity: 0.85, clearcoat: 1, emissive: 0x6a3000, emissiveIntensity: 0.3 }), [0, 0.15, 0]);
  add(jar, new THREE.CylinderGeometry(0.17, 0.17, 0.06, 24), std(0xd84a3a, 0.5), [0, 0.32, 0]);
  const bread = new THREE.Group();
  s.add(bread);
  add(bread, new RoundedBoxGeometry(0.34, 0.06, 0.32, 2, 0.03), std(0xf2d49a, 0.8), [0, 0, 0]);
  add(bread, new RoundedBoxGeometry(0.28, 0.02, 0.26, 2, 0.01), std(HONEY, 0.15, { emissive: 0x6a3000, emissiveIntensity: 0.3 }), [0, 0.035, 0]);
  const drip = add(bread, new THREE.SphereGeometry(0.025, 10, 8), std(HONEY, 0.1, { emissive: 0x6a3000, emissiveIntensity: 0.3 }), [0.1, -0.05, 0.12], [0, 0, 0], [1, 1.6, 1], false);
  // a beehive hanging from a tree in the distance
  const tr = makeTree(R, { scale: 2.0, leaf: [0x3f9a50, 0x4fb060, 0x2f8a45], toy: true });
  tr.position.copy(HIVE_TREE);
  s.add(tr);
  const hive = new THREE.Group();
  hive.position.copy(HIVE_TREE).add(V3(0.9, 2.6, 0.6));
  s.add(hive);
  for (let i = 0; i < 5; i++) add(hive, new THREE.SphereGeometry(0.55 - Math.abs(i - 2) * 0.12, 24, 12), std(0xe8b04a, 0.7), [0, -i * 0.28, 0], [0, 0, 0], [1, 0.45, 1]);
  add(hive, new THREE.CircleGeometry(0.12, 16), new THREE.MeshBasicMaterial({ color: 0x2a1a10 }), [0, -0.75, 0.47]);
  add(hive, new THREE.CylinderGeometry(0.03, 0.03, 0.6, 6), std(0x6b4a32, 0.8), [0, 0.35, 0]);
  const bee = makeBee();
  bee.root.scale.setScalar(0.18);
  s.add(bee.root);
  const hiveBees = Array.from({ length: 6 }, () => {
    const b = makeBee();
    b.root.scale.setScalar(0.12);
    s.add(b.root);
    return b;
  });
  return { ...w, bed, flowers, jar, bread, drip, hive, bee, hiveBees };
}

// ------------------------------------------------------- giant flower world
export const BIG_FLOWERS = [V3(-2.2, 4.2, -1.0), V3(2.4, 3.0, 0.2), V3(-0.4, 6.6, -3.5)];
export function buildFlowerWorld() {
  const scene = new THREE.Scene();
  const sky = gradientSky(0x7ec8ff, 0xfff2d8);
  scene.add(sky);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x7a9a5a, 1.3));
  const key = new THREE.DirectionalLight(0xfff4e0, 1.8);
  key.position.set(-4, 10, 9);
  scene.add(key);
  const ground = add(scene, new THREE.CylinderGeometry(14, 14.4, 0.4, 64), std(0x8ad86a, 0.95), [0, -0.2, 0]);
  ground.receiveShadow = true;
  const R = rng(420);
  // grass blades
  const blade = new THREE.ConeGeometry(0.08, 0.9, 4);
  const grass = new THREE.InstancedMesh(blade, std(0x5fbf4a, 0.8), 500);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion();
  for (let i = 0; i < 500; i++) {
    const a = R() * Math.PI * 2, r = 2 + R() * 11;
    q.setFromEuler(new THREE.Euler((R() - 0.5) * 0.4, R() * 3, (R() - 0.5) * 0.4));
    m4.compose(V3(Math.cos(a) * r, 0.4, Math.sin(a) * r - 2), q, V3(1, 0.6 + R() * 0.9, 1));
    grass.setMatrixAt(i, m4);
  }
  scene.add(grass);
  const cols = [0xff7ab0, 0xffd84a, 0xb07aff];
  const flowers = BIG_FLOWERS.map((p, i) => {
    const f = makeFlower(cols[i], { r: 1.3 });
    f.g.position.copy(p);
    f.g.rotation.set(-0.15, (i - 1) * 0.35, 0);
    scene.add(f.g);
    const stem = add(scene, new THREE.CylinderGeometry(0.1, 0.14, p.y, 10), std(0x3f8a36, 0.6), [p.x, p.y / 2, p.z - 0.1]);
    void stem;
    return f;
  });
  // bokeh
  for (let i = 0; i < 12; i++) {
    const b = glow([0xfff0c0, 0xffd0e8, 0xd0f0ff][i % 3], 2 + R() * 3, 0.3);
    b.position.set((R() - 0.5) * 22, 3 + R() * 10, -12 - R() * 6);
    scene.add(b);
  }
  const bee = makeBee();
  bee.root.scale.setScalar(2.2);
  scene.add(bee.root);
  // nectar droplets (travel up the tongue)
  const drops = Array.from({ length: 12 }, () => {
    const d = add(scene, new THREE.SphereGeometry(0.07, 12, 10), std(0xfff2a0, 0.1, { emissive: 0xffd040, emissiveIntensity: 0.6, transparent: true, opacity: 0.9 }), [0, 0, 0], [0, 0, 0], [1, 1, 1], false);
    d.visible = false;
    return d;
  });
  return { scene, sky, flowers, bee, drops };
}

// --------------------------------------------------------------- the hive
export const HEX_R = 0.62;
export const HEX_COLS = 9, HEX_ROWS = 12;
export function hexPos(c, r) {
  return V3((c - (HEX_COLS - 1) / 2) * HEX_R * 1.5, (r - (HEX_ROWS - 1) / 2) * HEX_R * Math.sqrt(3) + (c % 2) * HEX_R * Math.sqrt(3) * 0.5 + 4.5, 0);
}
export function buildHive() {
  const scene = new THREE.Scene();
  const sky = gradientSky(0x6a3a10, 0x2a1406);
  scene.add(sky);
  scene.add(new THREE.HemisphereLight(0xffe8c0, 0x5a3010, 1.2));
  const key = new THREE.DirectionalLight(0xfff0d0, 1.6);
  key.position.set(-3, 8, 10);
  scene.add(key);
  const warm = new THREE.PointLight(0xffb040, 40, 30, 1.5);
  warm.position.set(0, 4.5, 6);
  scene.add(warm);
  const waxMat = std(0xf2c45a, 0.55, { emissive: 0x5a3a00, emissiveIntensity: 0.25 });
  const back = std(0xd89a3a, 0.8);
  const cells = [];
  const wallGeo = new THREE.CylinderGeometry(HEX_R, HEX_R, 0.9, 6, 1, true);
  wallGeo.rotateX(Math.PI / 2);
  wallGeo.rotateZ(Math.PI / 6 * 0);
  const fillGeo = new THREE.CylinderGeometry(HEX_R * 0.9, HEX_R * 0.9, 1, 6);
  fillGeo.translate(0, 0.5, 0);
  fillGeo.rotateX(Math.PI / 2);
  const capGeo = new THREE.CylinderGeometry(HEX_R * 0.95, HEX_R * 0.95, 0.06, 6);
  capGeo.rotateX(Math.PI / 2);
  const rimGeo = new THREE.TorusGeometry(HEX_R * 0.98, 0.05, 6, 6);
  for (let c = 0; c < HEX_COLS; c++) for (let r = 0; r < HEX_ROWS; r++) {
    const p = hexPos(c, r);
    const g = new THREE.Group();
    g.position.copy(p);
    scene.add(g);
    g.rotation.z = Math.PI / 6;
    add(g, wallGeo, waxMat, [0, 0, 0], [0, 0, 0], [1, 1, 1], false);
    add(g, rimGeo, waxMat, [0, 0, 0.45], [0, 0, Math.PI / 6], [1, 1, 1], false);
    add(g, new THREE.CircleGeometry(HEX_R, 6), back, [0, 0, -0.44], [0, 0, 0], [1, 1, 1], false);
    const fillMat = new THREE.MeshPhysicalMaterial({ color: 0x8fd4ff, roughness: 0.05, transparent: true, opacity: 0.85, clearcoat: 1, emissive: 0x000000, emissiveIntensity: 0.4 });
    const fill = add(g, fillGeo, fillMat, [0, 0, -0.44], [0, 0, 0], [1, 1, 0.001], false);
    fill.visible = false;
    const cap = add(g, capGeo, std(0xfff0b0, 0.6, { emissive: 0x5a4a10, emissiveIntensity: 0.2 }), [0, 0, 0.44], [0, 0, 0], [1, 1, 1], false);
    cap.visible = false;
    cells.push({ c, r, p, g, fill, fillMat, cap });
  }
  const bees = Array.from({ length: 12 }, () => {
    const b = makeBee();
    b.root.scale.setScalar(1.25);
    scene.add(b.root);
    return b;
  });
  const drop = add(scene, new THREE.SphereGeometry(0.16, 16, 12), new THREE.MeshPhysicalMaterial({ color: 0xbfe8ff, roughness: 0.05, transparent: true, opacity: 0.85, clearcoat: 1, emissive: 0x000000, emissiveIntensity: 0.5 }), [0, 0, 0], [0, 0, 0], [1, 1, 1], false);
  drop.visible = false;
  const vapor = Array.from({ length: 30 }, () => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xffffff, transparent: true, opacity: 0.5, depthWrite: false }));
    s.visible = false;
    scene.add(s);
    return s;
  });
  const sparks = Array.from({ length: 14 }, () => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xfff27a, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending }));
    s.visible = false;
    scene.add(s);
    return s;
  });
  return { scene, sky, cells, bees, drop, vapor, sparks };
}

// ----------------------------------------------------------- spoon stage
export const SPOON = V3(0, 1.0, 0);
export function buildSpoon() {
  const scene = new THREE.Scene();
  const sky = gradientSky(0xffd88a, 0xfff6e0);
  scene.add(sky);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xa08050, 1.3));
  const key = new THREE.DirectionalLight(0xfff4e0, 1.8);
  key.position.set(-3, 9, 8);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -8, right: 8, top: 8, bottom: -4, near: 1, far: 40 });
  scene.add(key, key.target);
  const floor = add(scene, new THREE.CylinderGeometry(8, 8.3, 0.4, 64), std(0xfff0d0, 0.9), [0, -0.2, 0]);
  floor.receiveShadow = true;
  add(scene, new THREE.TorusGeometry(8.1, 0.08, 8, 96), new THREE.MeshBasicMaterial({ color: 0xf2a31a }), [0, 0, 0], [Math.PI / 2, 0, 0], [1, 1, 1], false);
  // a big teaspoon: bowl (half ellipsoid) + handle, on a little stand
  const spoon = new THREE.Group();
  spoon.position.copy(SPOON);
  scene.add(spoon);
  const steel = std(0xd8dee8, 0.3, { metalness: 0.25, side: THREE.DoubleSide, emissive: 0x30343c, emissiveIntensity: 0.3 });
  add(spoon, new THREE.SphereGeometry(1, 40, 20, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), steel, [0, 0, 0], [0, 0, 0], [1.0, 0.45, 1.35]);
  add(spoon, new RoundedBoxGeometry(0.36, 0.08, 3.2, 2, 0.04), steel, [0, 0.0, 2.8], [0.08, 0, 0]);
  add(scene, new THREE.CylinderGeometry(0.5, 0.7, SPOON.y - 0.4, 24), std(0xf4e4c4, 0.7), [0, (SPOON.y - 0.4) / 2, 0]);
  // honey in the bowl (a flattened sphere cap that grows)
  const honey = add(spoon, new THREE.SphereGeometry(1, 40, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), std(HONEY, 0.1, { emissive: 0x7a3a00, emissiveIntensity: 0.35, transparent: true, opacity: 0.95 }), [0, 0.0, 0], [0, 0, 0], [0.95, 0.4, 1.28], false);
  const honeyTop = add(spoon, new THREE.CircleGeometry(1, 48), std(HONEY, 0.08, { emissive: 0x7a3a00, emissiveIntensity: 0.4 }), [0, 0, 0], [-Math.PI / 2, 0, 0], [0.95, 1.28, 1], false);
  const bees = Array.from({ length: 12 }, () => {
    const b = makeBee();
    b.root.scale.setScalar(0.9);
    scene.add(b.root);
    return b;
  });
  const drops = Array.from({ length: 12 }, () => {
    const d = add(scene, new THREE.SphereGeometry(0.09, 12, 10), std(HONEY, 0.1, { emissive: 0x7a3a00, emissiveIntensity: 0.4 }), [0, 0, 0], [0, 0, 0], [1, 1.3, 1], false);
    d.visible = false;
    return d;
  });
  return { scene, sky, spoon, honey, honeyTop, bees, drops };
}
