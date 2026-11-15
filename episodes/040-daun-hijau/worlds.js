// Episode 040 sets:
//  - the Episode 036 playground on a sunny day, with a big hero tree whose
//    leaf clumps can change colour (green, blue, pink), and a leaf that
//    Affan holds;
//  - the Episode 037 light lab (Sun, white beam, prism, six colours);
//  - the "dalam daun" (inside the leaf) imagination world: a clear top skin
//    and two rows of leaf cells full of smiling chloroplasts, light balls
//    raining in from the Sun (red and blue are eaten, green bounces away),
//    and a small Affan on the top skin;
//  - the "kilang daun" (leaf factory): a sapling in a see-through pot with
//    roots, a big hero leaf with a pore (stoma), a smiling Sun, water drops,
//    air bubbles, sugar cubes and oxygen bubbles; the hero leaf can turn
//    yellow and fall;
//  - the branded outro stage from Episode 005.
import * as THREE from 'three';
import { rng } from '../../shared/core.js';
import { makeAffan } from '../../shared/affan.js';
import { add, glow, glowTex } from '../../shared/props.js';
import { buildOutro, RoundedBoxGeometry } from '../005-bulan-ikut-kereta/worlds.js';
import { buildPlayground, PLAY_SCALE } from '../036-pening-berpusing/worlds.js';
import { buildLab, COLORS, LAB_SUN, PRISM, SCREEN_X } from '../037-pelangi/worlds.js';

export { buildOutro, buildLab, PLAY_SCALE, COLORS, LAB_SUN, PRISM, SCREEN_X };

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
function sunFace(parent, r) {
  add(parent, new THREE.SphereGeometry(r, 40, 24), new THREE.MeshBasicMaterial({ color: 0xffd23a }), [0, 0, 0], [0, 0, 0], [1, 1, 1], false);
  parent.add(glow(0xffc040, r * 6, 0.8), glow(0xff9a30, r * 12, 0.35));
  for (const s of [-1, 1]) add(parent, new THREE.SphereGeometry(r * 0.11, 10, 8), new THREE.MeshBasicMaterial({ color: 0x6a3410 }), [r * 0.33 * s, r * 0.16, r * 0.95], [0, 0, 0], [1, 1.4, 0.5], false);
  add(parent, new THREE.TorusGeometry(r * 0.3, r * 0.05, 8, 16, Math.PI), new THREE.MeshBasicMaterial({ color: 0x6a3410 }), [0, -r * 0.12, r * 0.95], [0, 0, Math.PI], [1, 1, 1], false);
}

// ------------------------------------------------------------------ a leaf
// Leaf in its local xy plane, base at the origin, tip at +y (length 1.2),
// facing +z. Its material has a uniform uAge (0 green .. 1 yellow), which
// turns the leaf yellow patch by patch (the chlorophyll fading away).
export function leafMaterial(color = 0x3fae4a) {
  const m = std(color, 0.55, { side: THREE.DoubleSide, emissive: 0x0a2a08, emissiveIntensity: 0.25 });
  m.userData.uAge = { value: 0 };
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uAge = m.userData.uAge;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vLeaf;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvLeaf = position.xy;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vLeaf; uniform float uAge;\nfloat hh(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }')
      .replace(
        'vec4 diffuseColor = vec4( diffuse, opacity );',
        `vec4 diffuseColor = vec4( diffuse, opacity );
        vec2 cc = floor(vLeaf * 14.0);
        float nn = hh(cc) * 0.65 + 0.35 * (1.0 - clamp(vLeaf.y / 1.2, 0.0, 1.0));
        float kk = smoothstep(nn - 0.06, nn + 0.06, uAge * 1.12);
        diffuseColor.rgb = mix(diffuse, vec3(1.0, 0.76, 0.1), kk);`,
      );
  };
  m.customProgramCacheKey = () => 'leafAge';
  return m;
}
export function makeLeaf(mat = leafMaterial()) {
  const g = new THREE.Group();
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.bezierCurveTo(0.42, 0.18, 0.5, 0.72, 0, 1.2);
  s.bezierCurveTo(-0.5, 0.72, -0.42, 0.18, 0, 0);
  const blade = add(g, new THREE.ShapeGeometry(s, 32), mat, [0, 0, 0]);
  const rib = std(0x8fd860, 0.5, { emissive: 0x1a3a08, emissiveIntensity: 0.3 });
  add(g, new THREE.BoxGeometry(0.03, 1.12, 0.012), rib, [0, 0.58, 0.008], [0, 0, 0], [1, 1, 1], false);
  for (let i = 0; i < 4; i++) {
    const y = 0.22 + i * 0.22;
    const L = 0.34 - i * 0.05;
    for (const sd of [-1, 1]) add(g, new THREE.BoxGeometry(L, 0.016, 0.01), rib, [sd * L * 0.45, y + L * 0.22, 0.008], [0, 0, sd * 0.6], [1, 1, 1], false);
  }
  add(g, new THREE.CylinderGeometry(0.025, 0.03, 0.3, 8), std(0x5a9a3a, 0.6), [0, -0.14, 0]);
  g.userData.blade = blade;
  return g;
}

// -------------------------------------------------------------------- park
export const HERO_TREE = V3(-5.2, 0, 0.2);
export const A_PK = V3(-3.2, 0, 2.6);
export function buildPark() {
  const w = buildPlayground();
  const s = w.scene;
  // clear random trees and bushes out of the camera's way near Affan
  s.children.forEach((c) => {
    if (c.isGroup && c !== w.aff.root && c !== w.mgr && c.position.z > 1.5 && c.position.x > -10 && c.position.x < 4) c.visible = false;
  });
  const tree = new THREE.Group();
  tree.position.copy(HERO_TREE);
  s.add(tree);
  add(tree, new THREE.CylinderGeometry(0.32, 0.5, 3.2, 16), std(0x7a5232, 0.8), [0, 1.6, 0]);
  add(tree, new THREE.CylinderGeometry(0.12, 0.2, 1.4, 10), std(0x7a5232, 0.8), [0.6, 3.0, 0.2], [0, 0, -0.7]);
  add(tree, new THREE.CylinderGeometry(0.12, 0.2, 1.4, 10), std(0x7a5232, 0.8), [-0.6, 3.1, -0.1], [0, 0, 0.7]);
  const clumpMat = std(0x3fa84a, 0.75, { emissive: 0x0c2a0a, emissiveIntensity: 0.2 });
  const clumps = [];
  for (const [x, y, z, r] of [[0, 4.6, 0, 1.6], [1.3, 4.0, 0.4, 1.2], [-1.3, 4.1, 0.2, 1.25], [0.5, 5.4, -0.3, 1.1], [-0.6, 5.3, 0.6, 1.0], [0.2, 3.9, 1.1, 1.0]]) {
    clumps.push(add(tree, new THREE.IcosahedronGeometry(r, 2), clumpMat, [x, y, z]));
  }
  // little leaves sprinkled on the clumps
  const R = rng(40);
  const sprinkle = new THREE.InstancedMesh(new THREE.ShapeGeometry((() => {
    const sh = new THREE.Shape();
    sh.moveTo(0, 0);
    sh.bezierCurveTo(0.12, 0.06, 0.14, 0.22, 0, 0.34);
    sh.bezierCurveTo(-0.14, 0.22, -0.12, 0.06, 0, 0);
    return sh;
  })(), 8), std(0x56c25a, 0.6, { side: THREE.DoubleSide, emissive: 0x0c2a0a, emissiveIntensity: 0.2 }), 160);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
  for (let i = 0; i < 160; i++) {
    const c = clumps[i % clumps.length];
    const d = V3(R() - 0.5, R() - 0.3, R() - 0.5).normalize();
    const p = c.position.clone().addScaledVector(d, c.geometry.parameters.radius * 0.98);
    e.set(R() * 6, R() * 6, R() * 6);
    q.setFromEuler(e);
    m4.compose(p, q, V3(1.4, 1.4, 1.4));
    sprinkle.setMatrixAt(i, m4);
  }
  tree.add(sprinkle);
  // the leaf in Affan's hand
  const held = makeLeaf(leafMaterial(0x3fae4a));
  held.scale.setScalar(0.42);
  s.add(held);
  // falling leaves (for the ending)
  const fallers = Array.from({ length: 5 }, (_, i) => {
    const f = makeLeaf(leafMaterial(i % 2 ? 0x3fae4a : 0x5cbf3a));
    f.scale.setScalar(0.3);
    f.visible = false;
    s.add(f);
    return f;
  });
  w.aff.root.position.copy(A_PK);
  return { ...w, tree, clumps, clumpMat, sprinkle, held, fallers };
}

// -------------------------------------------------------- inside the leaf
export const CELL_W = 2.0, CELL_H = 1.9;
export const CELLS = []; // centres
for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++) CELLS.push(V3((c - 1) * CELL_W, 2.95 - r * CELL_H, 0));
export const SKIN_Y = 4.2; // top of the clear top skin
export const IN_SUN = V3(-2.3, 7.6, 0.6);
export const AFF_IN = V3(1.6, SKIN_Y, 0.9);
export const AFF_IN_S = 0.42;
export function buildInside() {
  const scene = new THREE.Scene();
  const sky = gradientSky(0xd8ffd0, 0x8ad87a);
  scene.add(sky);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x4a8a3a, 1.3));
  const key = new THREE.DirectionalLight(0xffffff, 1.4);
  key.position.set(-4, 9, 8);
  scene.add(key);
  // soft green bokeh far behind
  const R = rng(41);
  for (let i = 0; i < 16; i++) {
    const b = glow([0xc8ffb0, 0xffffd0, 0x9ae88a][i % 3], 2 + R() * 3, 0.35);
    b.position.set((R() - 0.5) * 20, (R() - 0.5) * 16 + 2, -9 - R() * 6);
    scene.add(b);
  }
  // clear top skin (epidermis)
  const skinMat = new THREE.MeshPhysicalMaterial({ color: 0xeaffe0, roughness: 0.15, clearcoat: 1, transparent: true, opacity: 0.55 });
  add(scene, new RoundedBoxGeometry(6.6, 0.42, 2.2, 3, 0.15), skinMat, [0, SKIN_Y - 0.21, 0]);
  // cells: soft rounded boxes with clear green walls
  const wallMat = new THREE.MeshPhysicalMaterial({ color: 0x9be88a, roughness: 0.3, transparent: true, opacity: 0.38, clearcoat: 0.6, depthWrite: false });
  const edgeMat = new THREE.LineBasicMaterial({ color: 0x3f9a3a, transparent: true, opacity: 0.8 });
  const chloros = [];
  const faceMat = new THREE.MeshBasicMaterial({ color: 0x173a12 });
  const chMat = std(0x2fae3a, 0.45, { emissive: 0x0f4a0a, emissiveIntensity: 0.35 });
  CELLS.forEach((c, ci) => {
    const box = add(scene, new RoundedBoxGeometry(CELL_W * 0.94, CELL_H * 0.94, 1.8, 4, 0.3), wallMat, c.toArray(), [0, 0, 0], [1, 1, 1], false);
    box.renderOrder = 3;
    const ed = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(CELL_W * 0.94, CELL_H * 0.94, 1.8)), edgeMat);
    ed.position.copy(c);
    scene.add(ed);
    // nucleus
    add(scene, new THREE.SphereGeometry(0.22, 16, 12), std(0xc8a0ff, 0.5), [c.x + 0.55, c.y - 0.45, -0.3]);
    for (let k = 0; k < 5; k++) {
      const g = new THREE.Group();
      const a = (k / 5) * Math.PI * 2 + ci;
      g.position.set(c.x + Math.cos(a) * 0.55, c.y + Math.sin(a) * 0.48, 0.35 + (k % 2) * 0.2);
      scene.add(g);
      const body = add(g, new THREE.SphereGeometry(0.24, 20, 14), chMat, [0, 0, 0], [0, 0, 0], [1.25, 0.8, 0.7]);
      for (const sd of [-1, 1]) {
        add(g, new THREE.SphereGeometry(0.05, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffffff }), [0.09 * sd, 0.05, 0.16], [0, 0, 0], [1, 1, 1], false);
        add(g, new THREE.SphereGeometry(0.026, 8, 6), faceMat, [0.09 * sd, 0.05, 0.2], [0, 0, 0], [1, 1, 1], false);
      }
      const smile = add(g, new THREE.TorusGeometry(0.06, 0.015, 6, 12, Math.PI), faceMat, [0, -0.04, 0.17], [0, 0, Math.PI], [1, 1, 1], false);
      const mouth = add(g, new THREE.SphereGeometry(0.05, 10, 8), faceMat, [0, -0.06, 0.17], [0, 0, 0], [1, 1, 0.4], false);
      mouth.visible = false;
      chloros.push({ g, body, smile, mouth, home: g.position.clone(), cell: ci });
    }
  });
  // the Sun (upper left)
  const sun = new THREE.Group();
  sun.position.copy(IN_SUN);
  scene.add(sun);
  sunFace(sun, 1.0);
  // light balls (red, green, blue), each a bright core and a glow
  const balls = Array.from({ length: 60 }, () => {
    const g = new THREE.Group();
    const core = add(g, new THREE.SphereGeometry(0.2, 14, 10), new THREE.MeshBasicMaterial({ color: 0xffffff }), [0, 0, 0], [0, 0, 0], [1, 1, 1], false);
    const halo = glow(0xffffff, 1.5, 0.95);
    g.add(halo);
    g.visible = false;
    scene.add(g);
    return { g, core, halo };
  });
  const aff = makeAffan();
  aff.root.scale.setScalar(AFF_IN_S);
  aff.root.position.copy(AFF_IN);
  scene.add(aff.root);
  return { scene, sky, chloros, sun, balls, aff };
}

// --------------------------------------------------------- the leaf factory
export const POT = V3(0, 0, 0);
export const STEM_TOP = 6.4;
export const HERO_ATTACH = V3(0, 3.3, 0.05);
export const F_SUN = V3(-4.8, 10.6, -1.0);
export const AFF_F = V3(3.3, 0, 1.6);
export const AFF_F_S = 0.62;
export const LEAF_S = 2.5; // hero leaf scale (2.5 x 1.2 = 3 units long)
export function buildFactory() {
  const scene = new THREE.Scene();
  const sky = gradientSky(0x8fd0ff, 0xe8fbe0);
  scene.add(sky);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8aa070, 1.25));
  const key = new THREE.DirectionalLight(0xfff4e0, 1.7);
  key.position.set(-5, 10, 8);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -9, right: 9, top: 12, bottom: -4, near: 1, far: 40 });
  scene.add(key, key.target);
  const ground = add(scene, new THREE.CylinderGeometry(9, 9.4, 0.4, 64), std(0x9ad86a, 0.95), [0, -0.2, 0]);
  ground.receiveShadow = true;
  add(scene, new THREE.TorusGeometry(9.1, 0.1, 8, 96), new THREE.MeshBasicMaterial({ color: 0xffd84a }), [0, 0, 0], [Math.PI / 2, 0, 0], [1, 1, 1], false);
  // see-through pot with soil and roots
  const plant = new THREE.Group();
  plant.position.copy(POT);
  scene.add(plant);
  const potMat = new THREE.MeshPhysicalMaterial({ color: 0xff9a6a, roughness: 0.3, transparent: true, opacity: 0.35, clearcoat: 0.5, depthWrite: false, side: THREE.DoubleSide });
  add(scene, new THREE.CylinderGeometry(1.25, 0.95, 1.6, 40, 1, true), potMat, [0, 0.8, 0], [0, 0, 0], [1, 1, 1], false).renderOrder = 4;
  add(scene, new THREE.TorusGeometry(1.25, 0.08, 8, 40), std(0xe8784a, 0.5), [0, 1.6, 0], [Math.PI / 2, 0, 0]);
  add(scene, new THREE.CylinderGeometry(1.16, 0.92, 1.4, 40), std(0x6a4426, 0.95, { transparent: true, opacity: 0.55, depthWrite: false }), [0, 0.75, 0], [0, 0, 0], [1, 1, 1], false).renderOrder = 3;
  const rootMat = std(0xf0d8a8, 0.6, { emissive: 0x3a2a10, emissiveIntensity: 0.3 });
  const roots = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.4;
    const pts = [V3(0, 1.4, 0), V3(Math.cos(a) * 0.25, 1.0, Math.sin(a) * 0.25), V3(Math.cos(a) * 0.6, 0.55, Math.sin(a) * 0.5), V3(Math.cos(a) * 0.75, 0.2, Math.sin(a) * 0.6)];
    const c = new THREE.CatmullRomCurve3(pts);
    roots.push(c);
    const m = new THREE.Mesh(new THREE.TubeGeometry(c, 24, 0.045, 6), rootMat);
    m.renderOrder = 5;
    scene.add(m);
  }
  // stem (scaled up when the plant grows)
  const stemMat = std(0x4f9a36, 0.6);
  const stem = add(plant, new THREE.CylinderGeometry(0.11, 0.16, STEM_TOP - 1.4, 14), stemMat, [0, (STEM_TOP + 1.4) / 2, 0]);
  // side leaves
  const leaves = [];
  for (const [y, side, rz, ry] of [[2.5, 1, -0.95, 0.4], [4.2, 1, -0.8, -0.3], [4.9, -1, 0.85, 0.3], [5.7, 1, -0.6, 0.2], [6.2, -1, 0.5, -0.2]]) {
    const L = makeLeaf(leafMaterial(0x3fae4a));
    L.position.set(0, y, 0);
    L.rotation.set(0, ry, rz);
    L.scale.setScalar(1.5);
    plant.add(L);
    leaves.push(L);
  }
  const bud = makeLeaf(leafMaterial(0x6ac84a));
  bud.position.set(0, STEM_TOP - 0.05, 0);
  bud.scale.setScalar(0.01);
  plant.add(bud);
  // hero leaf (left side, facing the camera); pivot at its base
  const heroMat = leafMaterial(0x3fae4a);
  const hero = makeLeaf(heroMat);
  hero.position.copy(HERO_ATTACH);
  hero.rotation.set(0, 0, 1.05);
  hero.scale.setScalar(LEAF_S);
  scene.add(hero);
  // a pore (stoma) on the hero leaf: two lips
  const stoma = new THREE.Group();
  stoma.position.set(0.12, 0.42, 0.012);
  hero.add(stoma);
  const lip = std(0x2f8a2a, 0.5);
  for (const sd of [-1, 1]) add(stoma, new THREE.TorusGeometry(0.035, 0.012, 6, 16, Math.PI), lip, [0.0, sd * 0.004, 0], [0, 0, sd > 0 ? 0 : Math.PI], [1.6, 1, 0.35], false);
  add(stoma, new THREE.CircleGeometry(0.03, 16), new THREE.MeshBasicMaterial({ color: 0x0f2a0a }), [0, 0, -0.002], [0, 0, 0], [1.5, 0.5, 1], false);
  // the Sun and its rays
  const sun = new THREE.Group();
  sun.position.copy(F_SUN);
  scene.add(sun);
  sunFace(sun, 1.1);
  const rodGeo = new THREE.CylinderGeometry(1, 1, 1, 10, 1, true);
  rodGeo.translate(0, 0.5, 0);
  const rays = Array.from({ length: 4 }, () => {
    const m = new THREE.Mesh(rodGeo, new THREE.MeshBasicMaterial({ color: 0xfff0a0, transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending }));
    m.visible = false;
    m.renderOrder = 6;
    scene.add(m);
    return m;
  });
  // particles: water drops (blue), air (grey bubbles), sugar (white cubes), oxygen (light blue bubbles)
  const mkMany = (n, geo, mat, s = 1) => Array.from({ length: n }, () => {
    const m = add(scene, geo, mat, [0, 0, 0], [0, 0, 0], [s, s, s], false);
    m.visible = false;
    m.renderOrder = 7;
    return m;
  });
  const drops = mkMany(14, new THREE.SphereGeometry(0.15, 12, 10), std(0x3aa8ff, 0.2, { emissive: 0x0a3a8a, emissiveIntensity: 0.6 }));
  const airs = mkMany(10, new THREE.SphereGeometry(0.24, 14, 10), new THREE.MeshPhysicalMaterial({ color: 0xc0c8d8, roughness: 0.2, transparent: true, opacity: 0.7, clearcoat: 1 }));
  const sugars = mkMany(10, new RoundedBoxGeometry(0.2, 0.2, 0.2, 2, 0.04), std(0xffffff, 0.3, { emissive: 0xfff0c0, emissiveIntensity: 0.5 }));
  const oxys = mkMany(14, new THREE.SphereGeometry(0.17, 16, 12), new THREE.MeshPhysicalMaterial({ color: 0xbfeaff, roughness: 0.1, transparent: true, opacity: 0.75, clearcoat: 1, emissive: 0x2a6a9a, emissiveIntensity: 0.25 }));
  const aff = makeAffan();
  aff.root.scale.setScalar(AFF_F_S);
  aff.root.position.copy(AFF_F);
  scene.add(aff.root);
  return { scene, sky, plant, stem, leaves, bud, hero, heroMat, stoma, sun, rays, roots, drops, airs, sugars, oxys, aff };
}
