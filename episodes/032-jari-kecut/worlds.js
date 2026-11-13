// Episode 032 sets:
//  - a sunny backyard with a round paddling pool, where Affan plays in the
//    water, plus a giant "insert" hand whose fingertips can wrinkle;
//  - a "skin lab" imagination world: a big cut-away block of fingertip skin
//    with the outer skin on top, blood vessels and a glowing nerve inside, and
//    a strip of wet road where a bald tyre slips and a treaded tyre grips;
//  - the branded outro stage from Episode 005.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { rng, clamp } from '../../shared/core.js';
import { makeAffan, AFFAN } from '../../shared/affan.js';
import { add, makeSky, makeStars, glow, glowTex, makeTree } from '../../shared/props.js';
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
  c.far = 120;
  light.shadow.bias = -0.0005;
  light.shadow.normalBias = 0.02;
}

// Wrinkle pattern used by the fingertips and the skin block: crinkly ridges
// that look like a raisin when k = 1. Returns roughly -1..1.
export function crinkle(u, v, seed = 0) {
  return 0.6 * Math.sin(u * 1.0 + 1.6 * Math.sin(v * 0.55 + seed)) * Math.sin(v * 0.8 + 1.3 * Math.sin(u * 0.45 + seed * 2)) + 0.4 * Math.sin(u * 0.7 + v * 0.35 + seed);
}

// ------------------------------------------------------------------ giant hand
// A friendly cartoon hand (palm + four fingers + thumb) built at a large scale
// for close-ups. hand.setWrinkle(k) crinkles the fingertip skin; hand.pinch(k)
// brings thumb and index together; fingers are posed by rotating their groups.
function makeFinger(len, rad, mat, seed) {
  const g = new THREE.Group();
  // lathe profile of a capsule with many rings along its length (so wrinkles show)
  const prof = [];
  for (let i = 0; i <= 14; i++) {
    const a = -Math.PI / 2 + (i / 14) * (Math.PI / 2);
    prof.push(new THREE.Vector2(Math.max(1e-4, rad * Math.cos(a)), rad + rad * Math.sin(a)));
  }
  for (let i = 1; i < 60; i++) prof.push(new THREE.Vector2(rad, rad + (len * i) / 60));
  for (let i = 0; i <= 18; i++) {
    const a = (i / 18) * (Math.PI / 2);
    prof.push(new THREE.Vector2(Math.max(1e-4, rad * Math.cos(a)), rad + len + rad * Math.sin(a)));
  }
  const geo = new THREE.LatheGeometry(prof, 56);
  const base = geo.attributes.position.array.slice();
  const cols = new Float32Array(geo.attributes.position.count * 3).fill(1);
  geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = mesh.receiveShadow = true;
  g.add(mesh);
  // a nail on the back (+z is the pad side, nail on -z)
  const nail = add(g, new THREE.SphereGeometry(rad * 0.62, 16, 10), std(0xf8d0c0, 0.35), [0, len + rad * 0.55, -rad * 0.72], [0.25, 0, 0], [1, 1.25, 0.32]);
  void nail;
  const total = len + rad * 2;
  let last = -1;
  g.userData.setWrinkle = (k) => {
    if (Math.abs(k - last) < 1e-4) return;
    last = k;
    const p = geo.attributes.position.array;
    for (let i = 0; i < p.length; i += 3) {
      const x = base[i], y = base[i + 1], z = base[i + 2];
      const tip = clamp((y / total - 0.42) / 0.3);
      const ang = Math.atan2(x, z);
      const pad = 0.55 + 0.45 * Math.cos(ang); // stronger on the pad side
      const c = crinkle(y * 40, ang * 7.5, seed);
      const w = k * tip * pad;
      const d = 1 - 0.16 * w * (0.5 + 0.5 * c);
      p[i] = x * d;
      p[i + 2] = z * d;
      const shade = 1 - 0.32 * w * clamp(0.5 + 0.5 * c);
      cols[i] = shade;
      cols[i + 1] = shade * (1 - 0.06 * w);
      cols[i + 2] = shade * (1 - 0.02 * w);
    }
    geo.attributes.color.needsUpdate = true;
    geo.attributes.position.needsUpdate = true;
    geo.computeVertexNormals();
  };
  return g;
}

export function makeBigHand() {
  const skin = std(AFFAN.skin, 0.55, { emissive: 0x3a1608, emissiveIntensity: 0.18 });
  const fingerSkin = std(AFFAN.skin, 0.55, { emissive: 0x3a1608, emissiveIntensity: 0.12, vertexColors: true });
  const hand = new THREE.Group();
  const palm = new THREE.Group();
  hand.add(palm);
  add(palm, new RoundedBoxGeometry(1.7, 1.7, 0.62, 4, 0.3), skin, [0, 0.85, 0]);
  add(palm, new THREE.CylinderGeometry(0.62, 0.7, 0.9, 24), std(AFFAN.navy, 0.7), [0, -0.3, 0], [0, 0, 0], [1.15, 1, 0.75]);
  add(palm, new THREE.CylinderGeometry(0.66, 0.66, 0.16, 24), std(AFFAN.white, 0.6), [0, 0.12, 0], [0, 0, 0], [1.16, 1, 0.76]);
  const fingers = [];
  const spec = [[-0.6, 0.78, 0.17, -0.12], [-0.2, 0.92, 0.18, -0.03], [0.2, 0.86, 0.18, 0.03], [0.58, 0.66, 0.16, 0.1]];
  spec.forEach(([x, len, r, rz], i) => {
    const f = makeFinger(len, r, fingerSkin, i * 1.7);
    f.position.set(x, 1.62, 0);
    f.rotation.z = rz;
    palm.add(f);
    fingers.push(f);
  });
  const thumb = makeFinger(0.55, 0.2, fingerSkin, 9);
  thumb.position.set(-0.78, 0.7, 0.12);
  thumb.rotation.set(0.2, 0, 0.9);
  palm.add(thumb);
  fingers.push(thumb);
  hand.userData.setWrinkle = (k) => fingers.forEach((f) => f.userData.setWrinkle(k));
  // pinch: index (fingers[0] is on the thumb side) and thumb meet in front of the palm
  hand.userData.pinch = (k, curl = 0) => {
    fingers[0].rotation.set(0.95 * k, 0, -0.12 + 0.3 * k);
    for (let i = 1; i < 4; i++) fingers[i].rotation.set((0.6 + 0.9 * curl) * k, 0, spec[i][3]);
    thumb.rotation.set(0.2 + 1.0 * k, -0.5 * k, 0.9 - 0.15 * k);
  };
  hand.userData.pinch(0);
  hand.userData.fingers = fingers;
  return hand;
}

// a raisin for comparison
export function makeRaisin() {
  const g = new THREE.SphereGeometry(1, 64, 48);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const c = crinkle(y * 9, Math.atan2(x, z) * 4, 3);
    const r = 1 + 0.12 * c;
    p.setXYZ(i, x * r * 0.8, y * r * 1.05, z * r * 0.75);
  }
  g.computeVertexNormals();
  return new THREE.Mesh(g, std(0x5a2438, 0.45, { emissive: 0x200810, emissiveIntensity: 0.4 }));
}

// glass marble
export function makeMarble(r = 0.32) {
  const m = new THREE.Group();
  add(m, new THREE.SphereGeometry(r, 32, 24), new THREE.MeshPhysicalMaterial({ color: 0x9fe8ff, roughness: 0.05, transparent: true, opacity: 0.75, emissive: 0x1a6080, emissiveIntensity: 0.3 }));
  add(m, new THREE.SphereGeometry(r * 0.55, 20, 14), std(0xff5c9a, 0.3, { emissive: 0x801030, emissiveIntensity: 0.4 }), [0, 0, 0], [0.5, 0.3, 0], [1, 0.35, 1]);
  add(m, new THREE.SphereGeometry(r * 0.18, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffffff }), [-r * 0.4, r * 0.45, r * 0.6], [0, 0, 0], [1, 1, 1], false);
  return m;
}

// --------------------------------------------------------------- backyard pool
export const POOL = { r: 3.2, h: 0.75, water: 0.58 };
function waterDisc(radius, color = 0x5fc8ff) {
  const geo = new THREE.CircleGeometry(radius, 96);
  geo.rotateX(-Math.PI / 2);
  const base = geo.attributes.position.array.slice();
  const mat = new THREE.MeshPhysicalMaterial({ color, roughness: 0.08, transparent: true, opacity: 0.78, emissive: 0x0a4a70, emissiveIntensity: 0.25, depthWrite: false });
  const m = new THREE.Mesh(geo, mat);
  m.receiveShadow = true;
  m.userData.update = (t, cx = 0, cz = 0, amp = 1) => {
    const p = geo.attributes.position.array;
    for (let i = 0; i < p.length; i += 3) {
      const x = base[i], z = base[i + 2];
      const d = Math.hypot(x - cx, z - cz);
      p[i + 1] = amp * (0.025 * Math.sin(d * 5 - t * 5) * Math.exp(-d * 0.3) + 0.012 * Math.sin(x * 2.3 + t * 1.7) * Math.sin(z * 1.9 - t * 1.3));
    }
    geo.attributes.position.needsUpdate = true;
    geo.computeVertexNormals();
  };
  return m;
}

export function buildBackyard() {
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xcfeaff, 40, 180);
  const sky = makeSky({ top: 0x2f8fff, mid: 0x6fb8ff, horizon: 0xd6efff, bottom: 0x7fbf6a });
  const stars = makeStars(10, 1600, 3);
  stars.material.uniforms.uAlpha.value = 0;
  scene.add(sky, stars);
  scene.add(new THREE.HemisphereLight(0xf2f8ff, 0x7a9a5a, 1.5));
  const key = new THREE.DirectionalLight(0xfff2dc, 2.8);
  key.position.set(8, 14, 9);
  shadowCfg(key, 9);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xcfe6ff, 0.8);
  fill.position.set(-8, 6, 6);
  scene.add(fill);
  const sun = glow(0xfff4c8, 60, 0.85);
  sun.position.set(80, 90, -260);
  scene.add(sun);

  const grass = add(scene, new THREE.PlaneGeometry(300, 300), std(0x6fc25f, 0.95), [0, 0, 0], [-Math.PI / 2, 0, 0], [1, 1, 1], false);
  grass.receiveShadow = true;
  const R = rng(32);
  for (let i = 0; i < 160; i++) {
    const a = R() * Math.PI * 2, r = 4.2 + R() * 14;
    add(scene, new THREE.ConeGeometry(0.05, 0.25 + R() * 0.2, 5), std([0x4fb04a, 0x6fcf5a, 0x3f9a40][i % 3], 0.8), [Math.cos(a) * r, 0.12, Math.sin(a) * r * 0.8 - 1], [(R() - 0.5) * 0.4, 0, (R() - 0.5) * 0.4], [1, 1, 1], false);
  }
  // house wall and a little window behind, wooden fence to the sides
  const house = new THREE.Group();
  house.position.set(-2, 0, -9);
  scene.add(house);
  add(house, new THREE.BoxGeometry(16, 7, 0.5), std(0xf6e3c0, 0.9), [0, 3.5, 0]);
  add(house, new THREE.BoxGeometry(16.6, 0.5, 1.4), std(0xc4573a, 0.7), [0, 7.1, 0.3]);
  add(house, new THREE.BoxGeometry(3.0, 2.2, 0.1), std(0x9fd8ff, 0.2, { emissive: 0x2a6080, emissiveIntensity: 0.3 }), [3, 4.2, 0.3]);
  for (const [x, y, w, h] of [[3, 5.35, 3.3, 0.16], [3, 3.05, 3.3, 0.16], [1.42, 4.2, 0.16, 2.4], [4.58, 4.2, 0.16, 2.4], [3, 4.2, 0.1, 2.2]]) add(house, new THREE.BoxGeometry(w, h, 0.18), std(0xffffff, 0.5), [x, y, 0.35]);
  add(house, new THREE.BoxGeometry(1.8, 3.4, 0.12), std(0x8a5a3a, 0.6), [-3.5, 1.7, 0.3]);
  for (let i = 0; i < 22; i++) {
    const x = 7 + i * 0.6;
    add(scene, new RoundedBoxGeometry(0.45, 2.0, 0.12, 2, 0.05), std(0xd9a86c, 0.8), [x, 1.0, -8.6 + i * 0.25], [0, -0.4, 0]);
  }
  const tree = makeTree(R, { scale: 1.6 });
  tree.position.set(-9, 0, -6);
  scene.add(tree);
  const tree2 = makeTree(R, { scale: 1.3 });
  tree2.position.set(9.5, 0, -4);
  scene.add(tree2);

  // round paddling pool: striped wall, inner rim, water
  const pool = new THREE.Group();
  scene.add(pool);
  const segs = 24;
  for (let i = 0; i < segs; i++) {
    const a0 = (i / segs) * Math.PI * 2;
    add(pool, new THREE.CylinderGeometry(POOL.r, POOL.r, POOL.h, 8, 1, true, a0, (Math.PI * 2) / segs), std(i % 2 ? 0xffffff : 0x2f9bff, 0.5, { side: THREE.DoubleSide }), [0, POOL.h / 2, 0]);
  }
  add(pool, new THREE.TorusGeometry(POOL.r, 0.18, 12, 64), std(0xffd166, 0.5), [0, POOL.h, 0], [Math.PI / 2, 0, 0]);
  add(pool, new THREE.CircleGeometry(POOL.r, 64), std(0x7fd0ff, 0.6), [0, 0.01, 0], [-Math.PI / 2, 0, 0]);
  const water = waterDisc(POOL.r - 0.05);
  water.position.y = POOL.water;
  pool.add(water);
  // rubber duck
  const duck = new THREE.Group();
  add(duck, new THREE.SphereGeometry(0.3, 20, 14), std(0xffd84a, 0.4), [0, 0.15, 0], [0, 0, 0], [1.2, 0.9, 1]);
  add(duck, new THREE.SphereGeometry(0.2, 18, 12), std(0xffd84a, 0.4), [0.2, 0.45, 0]);
  add(duck, new THREE.ConeGeometry(0.08, 0.2, 10), std(0xff8a3d, 0.5), [0.42, 0.43, 0], [0, 0, -Math.PI / 2]);
  for (const s of [-1, 1]) add(duck, new THREE.SphereGeometry(0.035, 8, 6), std(0x111111, 0.3), [0.32, 0.52, 0.12 * s]);
  duck.position.set(-1.6, POOL.water, 0.4);
  pool.add(duck);
  // a towel on the grass
  add(scene, new RoundedBoxGeometry(1.8, 0.08, 1.1, 2, 0.04), std(0xff7a8a, 0.9), [4.6, 0.04, 2.0], [0, 0.4, 0]);
  add(scene, new THREE.BoxGeometry(1.8, 0.09, 0.15), std(0xffffff, 0.9), [4.6, 0.05, 2.0], [0, 0.4, 0]);

  // splash droplets (re-used by the shots)
  const dropMat = new THREE.MeshPhysicalMaterial({ color: 0xbfeaff, roughness: 0.05, transparent: true, opacity: 0.8, emissive: 0x2a7fb0, emissiveIntensity: 0.3 });
  const drops = Array.from({ length: 40 }, () => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), dropMat);
    m.visible = false;
    scene.add(m);
    return m;
  });

  // insert props: giant hand, raisin, marble (only shown in close-ups)
  const bigHand = makeBigHand();
  bigHand.visible = false;
  scene.add(bigHand);
  const raisin = makeRaisin();
  raisin.visible = false;
  scene.add(raisin);
  const marble = makeMarble();
  marble.visible = false;
  scene.add(marble);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1, 0.04, 6, 40), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, depthWrite: false }));
  ring.rotation.x = -Math.PI / 2;
  ring.visible = false;
  scene.add(ring);

  const aff = makeAffan();
  scene.add(aff.root);
  return { scene, sky, stars, pool, water, duck, drops, bigHand, raisin, marble, ring, aff, key };
}

// ----------------------------------------------------------------- skin lab
export const SLAB = { w: 8.4, d: 3.6, dermis: 1.5, epi: 0.38 };
export const SLAB_TOP = SLAB.dermis + SLAB.epi;
export const SLAB_FRONT = SLAB.d / 2;
export const ROAD_X = 26;

function makeTyre(treaded) {
  const g = new THREE.Group();
  const rubber = std(0x2a2d36, 0.85);
  add(g, new THREE.TorusGeometry(0.85, 0.36, 20, 48), rubber, [0, 0, 0]);
  add(g, new THREE.CylinderGeometry(0.6, 0.6, 0.5, 32), std(0xc8ced8, 0.3, { metalness: 0.4 }), [0, 0, 0], [Math.PI / 2, 0, 0]);
  add(g, new THREE.CylinderGeometry(0.22, 0.22, 0.56, 16), std(0x7f8696, 0.4), [0, 0, 0], [Math.PI / 2, 0, 0]);
  if (treaded) {
    for (let i = 0; i < 28; i++) {
      const a = (i / 28) * Math.PI * 2;
      for (const s of [-1, 1]) {
        const b = add(g, new THREE.BoxGeometry(0.22, 0.12, 0.26), rubber, [Math.cos(a) * 1.2, Math.sin(a) * 1.2, 0.17 * s], [0, 0, a]);
        b.rotation.y = 0.5 * s;
      }
    }
  }
  return g;
}

export function buildSkinLab() {
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xa8d8f0, 40, 200);
  const sky = makeSky({ top: 0x2a7fc8, mid: 0x5fb0e8, horizon: 0xc8ecff, bottom: 0x6fa8c8 });
  const stars = makeStars(260, 1600, 32);
  stars.material.uniforms.uAlpha.value = 0.2;
  scene.add(sky, stars);
  scene.add(new THREE.HemisphereLight(0xeaf6ff, 0x6a7a88, 1.45));
  const key = new THREE.DirectionalLight(0xfff2e0, 2.3);
  key.position.set(6, 14, 12);
  shadowCfg(key, 12);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xbfe8ff, 1.0);
  rim.position.set(-8, 6, -8);
  scene.add(rim);
  const floor = add(scene, new THREE.PlaneGeometry(400, 400), std(0xdff2fa, 0.9), [0, 0, 0], [-Math.PI / 2, 0, 0], [1, 1, 1], false);
  floor.receiveShadow = true;
  const R = rng(33);
  // floating bubbles in the background
  for (let i = 0; i < 24; i++) {
    const a = R() * Math.PI, r = 14 + R() * 18;
    add(scene, new THREE.SphereGeometry(0.4 + R() * 1.0, 18, 12), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.1, transparent: true, opacity: 0.35, emissive: 0x9fd8ff, emissiveIntensity: 0.3 }), [Math.cos(a) * r - 2, 2 + R() * 12, -8 - Math.sin(a) * r], [0, 0, 0], [1, 1, 1], false);
  }

  // ---- the skin block
  const lab = new THREE.Group();
  scene.add(lab);
  // dermis (inner skin), on a scalable group so it can "shrink"
  const dermis = new THREE.Group();
  lab.add(dermis);
  add(dermis, new RoundedBoxGeometry(SLAB.w, SLAB.dermis, SLAB.d, 3, 0.08), std(0xf7a8a8, 0.8, { emissive: 0x401010, emissiveIntensity: 0.15 }), [0, SLAB.dermis / 2, 0]);
  // little fat blobs on the cut face
  for (let i = 0; i < 18; i++) add(dermis, new THREE.SphereGeometry(0.06 + R() * 0.06, 12, 10), std(0xffe8b8, 0.6), [(R() - 0.5) * (SLAB.w - 0.6), 0.12 + R() * 0.3, SLAB_FRONT + 0.01], [0, 0, 0], [1, 1, 0.4]);
  // blood vessels: red tubes running along the block, ending on the cut face
  const vesselMat = std(0xe8343f, 0.45, { emissive: 0x500810, emissiveIntensity: 0.4 });
  const vessels = [];
  [[0.62, SLAB_FRONT - 0.04], [0.9, SLAB_FRONT - 0.9], [0.58, -0.6]].forEach(([y, z], i) => {
    const v = new THREE.Group();
    v.position.set(0, y, z);
    dermis.add(v);
    const geo = new THREE.CylinderGeometry(0.22, 0.22, SLAB.w + 0.04, 24);
    geo.rotateZ(Math.PI / 2);
    add(v, geo, vesselMat);
    // short branches up towards the outer skin
    for (let b = 0; b < 4; b++) add(v, new THREE.CylinderGeometry(0.07, 0.09, 0.55, 10), vesselMat, [-2.8 + b * 1.9 + i * 0.3, 0.32, 0], [0, 0, 0.3 * (b % 2 ? 1 : -1)]);
    vessels.push(v);
  });
  // blood cells drifting in the front vessel (visible through the cut)
  const cells = [];
  for (let i = 0; i < 10; i++) {
    const c = add(scene, new THREE.TorusGeometry(0.06, 0.035, 8, 14), std(0xff4d5e, 0.4, { emissive: 0x801020, emissiveIntensity: 0.4 }), [0, 0, 0], [0, Math.PI / 2, 0], [1, 1, 1], false);
    c.userData.ph = R();
    cells.push(c);
  }
  // nerve: yellow glowing cable with branches
  const nerveMat = std(0xffd23a, 0.35, { emissive: 0xffb000, emissiveIntensity: 0.35 });
  const nerve = new THREE.Group();
  nerve.position.set(0, 1.12, SLAB_FRONT - 0.02);
  dermis.add(nerve);
  const ngeo = new THREE.CylinderGeometry(0.13, 0.13, SLAB.w + 0.04, 18);
  ngeo.rotateZ(Math.PI / 2);
  add(nerve, ngeo, nerveMat);
  for (let b = 0; b < 5; b++) add(nerve, new THREE.CylinderGeometry(0.04, 0.05, 0.45, 8), nerveMat, [-3.2 + b * 1.6, 0.22, 0], [0.2, 0, 0.35 * (b % 2 ? 1 : -1)]);
  const nerveGlow = glow(0xffd84a, 3, 0);
  scene.add(nerveGlow);
  // signal sparks along the nerve
  const sparkMat = new THREE.SpriteMaterial({ map: glowTex, color: 0xfff27a, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
  const sparks = Array.from({ length: 10 }, () => {
    const s = new THREE.Sprite(sparkMat);
    s.scale.setScalar(0.55);
    s.visible = false;
    scene.add(s);
    return s;
  });

  // epidermis (outer skin): top surface is a dense grid that can crinkle
  const epi = new THREE.Group();
  lab.add(epi);
  const skinMat = std(0xf2b38e, 0.6, { emissive: 0x3a1608, emissiveIntensity: 0.15, side: THREE.DoubleSide });
  const topGeo = new THREE.PlaneGeometry(SLAB.w, SLAB.d, 200, 90);
  topGeo.rotateX(-Math.PI / 2);
  const topBase = topGeo.attributes.position.array.slice();
  const top = new THREE.Mesh(topGeo, skinMat);
  top.castShadow = top.receiveShadow = true;
  epi.add(top);
  // the epidermis side walls (front cut face shows the outer layer)
  const wallMat = std(0xe89a74, 0.7, { emissive: 0x3a1608, emissiveIntensity: 0.12 });
  const front = add(epi, new THREE.PlaneGeometry(SLAB.w, SLAB.epi), wallMat, [0, -SLAB.epi / 2, SLAB_FRONT], [0, 0, 0], [1, 1, 1], false);
  const back = add(epi, new THREE.PlaneGeometry(SLAB.w, SLAB.epi), wallMat, [0, -SLAB.epi / 2, -SLAB_FRONT], [0, Math.PI, 0], [1, 1, 1], false);
  for (const s of [-1, 1]) add(epi, new THREE.PlaneGeometry(SLAB.d, SLAB.epi), wallMat, [s * SLAB.w / 2, -SLAB.epi / 2, 0], [0, s * Math.PI / 2, 0], [1, 1, 1], false);
  void front; void back;
  // fingerprint ridges on the smooth skin (thin lines), faded out as wrinkles grow
  const lineMat = new THREE.MeshBasicMaterial({ color: 0xd88a68, transparent: true, opacity: 0.6, depthWrite: false });
  const prints = new THREE.Group();
  epi.add(prints);
  for (let i = 0; i < 13; i++) {
    const m = new THREE.Mesh(new THREE.TorusGeometry(0.3 + i * 0.13, 0.012, 4, 64, Math.PI * 1.3), lineMat);
    m.rotation.set(-Math.PI / 2, 0, -0.6);
    m.position.set(0.5, 0.012, 0.1);
    m.scale.set(1.4, 1, 1);
    prints.add(m);
  }
  let lastK = -1;
  const setSkin = (k, drop = 0) => {
    epi.position.y = SLAB.dermis * (1 - drop) + SLAB.epi;
    dermis.scale.y = 1 - drop;
    prints.children.forEach((m) => (m.material.opacity = 0.6 * (1 - clamp(k * 2))));
    if (Math.abs(k - lastK) < 1e-4) return;
    lastK = k;
    const p = topGeo.attributes.position.array;
    for (let i = 0; i < p.length; i += 3) {
      const x = topBase[i], z = topBase[i + 2];
      const edge = clamp(Math.min(SLAB.w / 2 - Math.abs(x), SLAB.d / 2 - Math.abs(z)) / 0.25);
      p[i + 1] = 0.24 * k * edge * (0.5 + 0.5 * crinkle(x * 4.2, z * 7.0, 1.3));
    }
    topGeo.attributes.position.needsUpdate = true;
    topGeo.computeVertexNormals();
  };
  setSkin(0, 0);

  // water layer resting on the skin
  const waterMat = new THREE.MeshPhysicalMaterial({ color: 0x7fd6ff, roughness: 0.05, transparent: true, opacity: 0.35, emissive: 0x1a6fa0, emissiveIntensity: 0.3, depthWrite: false });
  const waterBox = add(scene, new RoundedBoxGeometry(SLAB.w + 0.1, 0.5, SLAB.d + 0.1, 3, 0.2), waterMat, [0, SLAB_TOP + 0.25, 0], [0, 0, 0], [1, 1, 1], false);
  waterBox.visible = false;
  // drips falling onto the skin
  const drips = Array.from({ length: 12 }, () => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 10), waterMat);
    m.visible = false;
    scene.add(m);
    return m;
  });

  // ---- wet road strip with two tyres (bald and treaded)
  const road = new THREE.Group();
  road.position.set(ROAD_X, 0, 0);
  scene.add(road);
  add(road, new THREE.BoxGeometry(14, 0.1, 6), std(0x3a3f4c, 0.35), [0, 0.05, 0]);
  for (let i = -3; i <= 3; i++) add(road, new THREE.BoxGeometry(1.2, 0.02, 0.16), std(0xf2efe6, 0.5), [i * 2, 0.11, 0], [0, 0, 0], [1, 1, 1], false);
  const puddleMat = new THREE.MeshPhysicalMaterial({ color: 0x8fd0ff, roughness: 0.02, transparent: true, opacity: 0.55, emissive: 0x2a6fa0, emissiveIntensity: 0.3, depthWrite: false });
  for (const [x, z, s] of [[-1, -1.4, 1.6], [1.8, 1.3, 1.3], [-3.5, 1.5, 1], [3.5, -1.6, 1.1]]) add(road, new THREE.CircleGeometry(s, 32), puddleMat, [x, 0.115, z], [-Math.PI / 2, 0, 0], [1.6, 1, 1], false);
  const bald = makeTyre(false);
  const tread = makeTyre(true);
  bald.position.set(0, 1.21, -1.4);
  tread.position.set(0, 1.21, 1.4);
  road.add(bald, tread);
  const spray = Array.from({ length: 30 }, () => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), puddleMat);
    m.visible = false;
    road.add(m);
    return m;
  });

  const aff = makeAffan();
  scene.add(aff.root);
  return { scene, sky, stars, lab, dermis, epi, vessels, vesselMat, cells, nerve, nerveMat, nerveGlow, sparks, setSkin, waterBox, waterMat, drips, road, bald, tread, spray, aff, key };
}

export { RoundedBoxGeometry };
