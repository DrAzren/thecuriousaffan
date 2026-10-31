// Episode 003 sets: the sunny harbour (pier, giant ship, sea, seabed for the
// underwater shots) and Affan's science world (a cutaway water tank with a
// cross-sectioned model of the same ship).
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { rng } from '../../shared/core.js';
import { makeAffan } from '../../shared/affan.js';
import { add, makeSky, glow, glowTex } from '../../shared/props.js';
import { makeShip } from './ship.js';
import { makeSea, makeTank, seabedY } from './water.js';

const std = (color, rough = 0.6, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0, ...extra });

export const SUN = new THREE.Vector3(0.45, 0.5, 0.74).normalize(); // sun behind the camera side, lights the ship's +z side
// moored 3/4 bow-on: the bow points towards the pier and the camera-right
export const SHIP_YAW = -1.15;
export const SHIP_POS = new THREE.Vector3(24 - 100 * Math.cos(SHIP_YAW), 0, -42 + 100 * Math.sin(SHIP_YAW));
export const DECK_Y = 1.8; // pier deck height above the water

function shadowCfg(light, size, map = 2048) {
  light.castShadow = true;
  light.shadow.mapSize.set(map, map);
  Object.assign(light.shadow.camera, { left: -size, right: size, top: size, bottom: -size, near: 1, far: 400 });
  light.shadow.bias = -0.0004;
  light.shadow.normalBias = 0.03;
}

function noiseCanvasTex(size, base, spots, seed, repeat = 1) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  g.fillStyle = base;
  g.fillRect(0, 0, size, size);
  const R = rng(seed);
  for (let i = 0; i < 900; i++) {
    const [col, a] = spots[i % spots.length];
    g.globalAlpha = a * R();
    g.fillStyle = col;
    const r = 1 + R() * size * 0.02;
    g.beginPath();
    g.arc(R() * size, R() * size, r, 0, Math.PI * 2);
    g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.anisotropy = 8;
  return t;
}

function cloud(R, scale) {
  const g = new THREE.Group();
  const m = std(0xffffff, 1, { emissive: 0xdfeeff, emissiveIntensity: 0.55, fog: false });
  const n = 6 + Math.floor(R() * 4);
  for (let i = 0; i < n; i++) {
    const r = (0.6 + R() * 0.6) * scale;
    const s = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 14), m);
    s.position.set((i - n / 2) * scale * 0.7 + R() * scale * 0.3, R() * scale * 0.35 + (i % 2) * scale * 0.2, R() * scale * 0.3);
    s.scale.y = 0.75;
    g.add(s);
  }
  return g;
}

function gull() {
  const g = new THREE.Group();
  const w = std(0xffffff, 0.6), grey = std(0xa9b4c4, 0.6), beak = std(0xffb02e, 0.5);
  add(g, new THREE.SphereGeometry(0.5, 14, 10), w, [0, 0, 0], [0, 0, 0], [1, 0.8, 2], false);
  add(g, new THREE.SphereGeometry(0.32, 12, 10), w, [0, 0.25, 0.9], [0, 0, 0], [1, 1, 1], false);
  add(g, new THREE.ConeGeometry(0.1, 0.4, 8), beak, [0, 0.2, 1.3], [Math.PI / 2, 0, 0], [1, 1, 1], false);
  const wings = [];
  for (const s of [-1, 1]) {
    const piv = new THREE.Group();
    piv.position.set(0.3 * s, 0.15, 0);
    g.add(piv);
    add(piv, new THREE.BoxGeometry(2.2, 0.08, 0.8), w, [1.1 * s, 0, 0], [0, 0, 0], [1, 1, 1], false);
    add(piv, new THREE.BoxGeometry(0.7, 0.09, 0.7), grey, [2.0 * s, 0, -0.05], [0, 0, 0], [1, 1, 1], false);
    wings.push({ piv, s });
  }
  g.userData.flap = (t, ph) => wings.forEach(({ piv, s }) => (piv.rotation.z = s * 0.55 * Math.sin(t * 7 + ph)));
  return g;
}

function fish(color) {
  const g = new THREE.Group();
  const m = std(color, 0.45, { emissive: color, emissiveIntensity: 0.15 });
  add(g, new THREE.SphereGeometry(0.35, 16, 12), m, [0, 0, 0], [0, 0, 0], [0.55, 0.85, 1.2], false);
  const tail = add(g, new THREE.ConeGeometry(0.28, 0.4, 3), m, [0, 0, -0.5], [-Math.PI / 2, 0, 0], [0.3, 1, 1], false);
  for (const s of [-1, 1]) {
    add(g, new THREE.SphereGeometry(0.08, 10, 8), std(0xffffff, 0.3), [0.15 * s, 0.08, 0.25], [0, 0, 0], [1, 1, 1], false);
    add(g, new THREE.SphereGeometry(0.045, 8, 6), std(0x111111, 0.3), [0.19 * s, 0.09, 0.29], [0, 0, 0], [1, 1, 1], false);
  }
  g.userData.tail = tail;
  return g;
}

function stoneGeo() {
  const g = new THREE.IcosahedronGeometry(0.17, 3);
  const p = g.attributes.position;
  const R = rng(99);
  const bumps = Array.from({ length: 6 }, () => [R() - 0.5, R() - 0.5, R() - 0.5, R() * 0.2]);
  for (let i = 0; i < p.count; i++) {
    const v = new THREE.Vector3(p.getX(i), p.getY(i), p.getZ(i));
    const n = v.clone().normalize();
    let k = 1;
    for (const [x, y, z, a] of bumps) k += a * Math.max(0, n.dot(new THREE.Vector3(x, y, z).normalize()) - 0.4);
    v.multiplyScalar(k);
    v.y *= 0.8;
    v.x *= 1.15;
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}

// ------------------------------------------------------------------ harbour
export function buildHarbor() {
  const scene = new THREE.Scene();
  const fogAir = new THREE.Fog(0xd2ebfb, 250, 2600);
  const fogUnder = new THREE.FogExp2(0x0e6f8f, 0.03);
  scene.fog = fogAir;
  const sky = makeSky({ top: 0x2f7fe0, mid: 0x5ea8f0, horizon: 0xd9efff, bottom: 0x8fcbe0, radius: 3000 });
  scene.add(sky);
  const sun = glow(0xfff4d6, 600, 0.9);
  sun.position.copy(SUN).multiplyScalar(2600);
  scene.add(sun);
  const hemi = new THREE.HemisphereLight(0xd6ecff, 0x6f8f86, 1.25);
  scene.add(hemi);
  const sunLight = new THREE.DirectionalLight(0xfff0d8, 2.7);
  shadowCfg(sunLight, 12);
  scene.add(sunLight, sunLight.target);
  const shipLight = new THREE.DirectionalLight(0xfff4e4, 0.8);
  shipLight.position.copy(SUN).multiplyScalar(100);
  scene.add(shipLight);

  const R = rng(31);
  // clouds
  for (let i = 0; i < 18; i++) {
    const c = cloud(R, 28 + R() * 30);
    const a = -Math.PI / 2 + (R() - 0.5) * 2.4;
    const d = 1300 + R() * 900;
    c.position.set(Math.cos(a) * d, 170 + R() * 380, Math.sin(a) * d);
    c.lookAt(0, c.position.y, 0);
    scene.add(c);
  }

  const sea = makeSea();
  scene.add(sea);

  // seabed
  const bedGeo = new THREE.PlaneGeometry(500, 300, 160, 120);
  bedGeo.rotateX(-Math.PI / 2);
  const bp = bedGeo.attributes.position;
  for (let i = 0; i < bp.count; i++) {
    const x = bp.getX(i), z = bp.getZ(i) - 100;
    bp.setXYZ(i, x, seabedY(z) + 0.25 * Math.sin(x * 0.7) * Math.sin(z * 0.9) + 0.15 * Math.sin(x * 2.1 + z * 1.3), z);
  }
  bedGeo.computeVertexNormals();
  const bed = new THREE.Mesh(bedGeo, std(0xffffff, 0.95, { map: noiseCanvasTex(512, '#e2c993', [['#c9a96b', 0.5], ['#f3e2b8', 0.6], ['#b8945a', 0.35]], 5, 60) }));
  bed.receiveShadow = true;
  scene.add(bed);
  const rockMat = std(0x7d8794, 0.9, { flatShading: true });
  for (let i = 0; i < 60; i++) {
    const x = -40 + R() * 80, z = 2 - R() * 40;
    add(scene, new THREE.IcosahedronGeometry(0.3 + R() * 0.9, 1), rockMat, [x, seabedY(z) + 0.1, z], [R(), R(), R()], [1, 0.6, 1]);
  }
  // seaweed (chains of capsules, swayed per frame)
  const weeds = [];
  const weedMats = [std(0x2fa35b, 0.7), std(0x52c46b, 0.7), std(0x1f8a6e, 0.7)];
  for (let i = 0; i < 40; i++) {
    const x = -22 + R() * 44, z = 1 - R() * 18;
    const root = new THREE.Group();
    root.position.set(x, seabedY(z), z);
    scene.add(root);
    let parent = root;
    const segs = [];
    const n = 4 + Math.floor(R() * 4);
    for (let k = 0; k < n; k++) {
      const s = new THREE.Group();
      s.position.y = k ? 0.55 : 0;
      parent.add(s);
      add(s, new THREE.CapsuleGeometry(0.09, 0.45, 4, 8), weedMats[i % 3], [0, 0.27, 0], [0, 0, 0], [1.6, 1, 0.6], false);
      segs.push(s);
      parent = s;
    }
    weeds.push({ segs, ph: R() * 10 });
  }
  // fish
  const fishes = [];
  const fcol = [0xff8a3d, 0xffc233, 0x2f9bff, 0xff6b9a, 0xffc233, 0x3fd0c9, 0xff8a3d, 0x9b6bff];
  for (let i = 0; i < 9; i++) {
    const f = fish(fcol[i % fcol.length]);
    scene.add(f);
    fishes.push({ f, cx: -6 + R() * 14, cz: -4 - R() * 12, cy: -2 - R() * 3, r: 2 + R() * 4, sp: (0.3 + R() * 0.4) * (R() < 0.5 ? -1 : 1), ph: R() * 6 });
  }
  // light shafts (visible underwater)
  const shaftTex = (() => {
    const c = document.createElement('canvas');
    c.width = 64;
    c.height = 256;
    const g = c.getContext('2d');
    const gr = g.createLinearGradient(0, 0, 0, 256);
    gr.addColorStop(0, 'rgba(255,255,255,0.9)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, 64, 256);
    const gx = g.createLinearGradient(0, 0, 64, 0);
    gx.addColorStop(0, 'rgba(0,0,0,1)');
    gx.addColorStop(0.5, 'rgba(0,0,0,0)');
    gx.addColorStop(1, 'rgba(0,0,0,1)');
    g.globalCompositeOperation = 'destination-out';
    g.fillStyle = gx;
    g.fillRect(0, 0, 64, 256);
    const t = new THREE.CanvasTexture(c);
    return t;
  })();
  const shafts = new THREE.Group();
  for (let i = 0; i < 9; i++) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1.6 + R() * 2, 16), new THREE.MeshBasicMaterial({ map: shaftTex, color: 0xbff6ff, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, side: THREE.DoubleSide }));
    m.position.set(-8 + R() * 16, -6, -2 - R() * 14);
    m.rotation.z = 0.25;
    m.userData.ph = R() * 6;
    shafts.add(m);
  }
  shafts.visible = false;
  scene.add(shafts);

  // pier
  const pier = new THREE.Group();
  scene.add(pier);
  const planks = new THREE.InstancedMesh(new RoundedBoxGeometry(0.56, 0.2, 14, 2, 0.04), std(0xffffff, 0.8, { map: noiseCanvasTex(256, '#c08452', [['#9a6236', 0.5], ['#d79a63', 0.5]], 8, 1) }), 101);
  const m4 = new THREE.Matrix4();
  const col = new THREE.Color();
  for (let i = 0; i <= 100; i++) {
    planks.setMatrixAt(i, m4.makeTranslation(-30 + i * 0.6, DECK_Y - 0.1, 7));
    planks.setColorAt(i, col.setHSL(0.07, 0.45, 0.62 + (R() - 0.5) * 0.12));
  }
  planks.castShadow = planks.receiveShadow = true;
  pier.add(planks);
  const darkWood = std(0x6e4a30, 0.85), algae = std(0x3d5a44, 0.9);
  add(pier, new THREE.BoxGeometry(61, 0.55, 0.4), darkWood, [0, DECK_Y - 0.4, -0.05]);
  for (let x = -28; x <= 28; x += 4) {
    for (const z of [0.3, 5, 9.5, 13.6]) {
      add(pier, new THREE.CylinderGeometry(0.34, 0.36, DECK_Y - 0.3 + 0.2, 14), darkWood, [x, (DECK_Y - 0.3 + 0.2) / 2 - 0.2 + 0.1, z]);
      add(pier, new THREE.CylinderGeometry(0.37, 0.39, 6.4, 14), algae, [x, -3.1, z]);
    }
  }
  for (const z of [0.3, 5, 9.5, 13.6]) add(pier, new THREE.BoxGeometry(60, 0.3, 0.3), darkWood, [0, DECK_Y - 0.5, z]);
  // railing
  const railWhite = std(0xf6f4ef, 0.5), railTeal = std(0x23a6a0, 0.45, { emissive: 0x0a3a38, emissiveIntensity: 0.2 });
  for (let x = -29; x <= 29; x += 2.5) add(pier, new RoundedBoxGeometry(0.18, 1.35, 0.18, 2, 0.05), railWhite, [x, DECK_Y + 0.67, 0.2]);
  add(pier, new RoundedBoxGeometry(58.5, 0.18, 0.22, 2, 0.07), railTeal, [0, DECK_Y + 1.32, 0.2]);
  add(pier, new RoundedBoxGeometry(58.5, 0.12, 0.14, 2, 0.05), railWhite, [0, DECK_Y + 0.72, 0.2]);
  // life ring on a post
  const ringPost = add(pier, new THREE.BoxGeometry(0.22, 2.6, 0.22), railWhite, [-10.5, DECK_Y + 1.3, 1.0]);
  const ring = new THREE.Group();
  ring.position.set(-10.5, DECK_Y + 1.9, 0.85);
  pier.add(ring);
  const ringGeo = new THREE.TorusGeometry(0.55, 0.17, 12, 28);
  add(ring, ringGeo, std(0xff6a2a, 0.5, { emissive: 0x401400, emissiveIntensity: 0.2 }));
  for (let k = 0; k < 4; k++) {
    add(ring, new THREE.TorusGeometry(0.55, 0.18, 12, 6, 0.32), std(0xffffff, 0.5), [0, 0, 0], [0, 0, k * (Math.PI / 2) + 0.6]);
  }
  ringPost.castShadow = true;
  // harbour sign
  const signTex = (() => {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 160;
    const g = c.getContext('2d');
    g.fillStyle = '#1f2b5c';
    g.beginPath();
    g.roundRect(0, 0, 512, 160, 30);
    g.fill();
    g.strokeStyle = '#f2915f';
    g.lineWidth = 12;
    g.beginPath();
    g.roundRect(10, 10, 492, 140, 24);
    g.stroke();
    g.fillStyle = '#ffffff';
    g.font = '800 84px "Baloo 2"';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('PELABUHAN', 256, 88);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  })();
  add(pier, new THREE.BoxGeometry(0.2, 3.6, 0.2), railWhite, [-14, DECK_Y + 1.8, 1.4]);
  add(pier, new THREE.PlaneGeometry(3.2, 1.0), new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.6, side: THREE.DoubleSide }), [-14, DECK_Y + 3.3, 1.52], [0, -0.3, 0]);
  // crates and barrels
  const crate = std(0xd9a15c, 0.8), barrel = std(0x2f7bff, 0.5), barrel2 = std(0xe8473f, 0.5);
  add(pier, new RoundedBoxGeometry(1.4, 1.4, 1.4, 2, 0.08), crate, [-9.5, DECK_Y + 0.7, 4.5], [0, 0.2, 0]);
  add(pier, new RoundedBoxGeometry(1.4, 1.4, 1.4, 2, 0.08), crate, [-11.0, DECK_Y + 0.7, 5.2], [0, -0.1, 0]);
  add(pier, new RoundedBoxGeometry(1.2, 1.2, 1.2, 2, 0.08), crate, [-10.1, DECK_Y + 2.0, 4.9], [0, 0.5, 0]);
  add(pier, new THREE.CylinderGeometry(0.55, 0.55, 1.5, 20), barrel, [-12.6, DECK_Y + 0.75, 3.8]);
  add(pier, new THREE.CylinderGeometry(0.55, 0.55, 1.5, 20), barrel2, [10.5, DECK_Y + 0.75, 4.2]);
  // bollards
  for (const x of [-16, 16]) {
    add(pier, new THREE.CylinderGeometry(0.4, 0.45, 0.8, 18), std(0x1f2b5c, 0.5), [x, DECK_Y + 0.4, 1.4]);
    add(pier, new THREE.CylinderGeometry(0.55, 0.55, 0.2, 18), std(0x1f2b5c, 0.5), [x, DECK_Y + 0.85, 1.4]);
  }
  // lamp post
  add(pier, new THREE.CylinderGeometry(0.1, 0.14, 5, 10), std(0x1f2b5c, 0.5), [13, DECK_Y + 2.5, 1.8]);
  add(pier, new THREE.SphereGeometry(0.4, 16, 12), std(0xfff4c8, 0.3, { emissive: 0xfff0b0, emissiveIntensity: 0.4 }), [13, DECK_Y + 5.2, 1.8]);

  // the ship
  const ship = makeShip();
  ship.position.copy(SHIP_POS);
  ship.rotation.y = SHIP_YAW;
  scene.add(ship);
  // tug boat
  const tug = new THREE.Group();
  add(tug, new RoundedBoxGeometry(9, 2.4, 3.6, 3, 0.9), std(0xe8473f, 0.5), [0, 0.3, 0]);
  add(tug, new RoundedBoxGeometry(9.2, 0.5, 3.8, 2, 0.2), std(0x1f2b5c, 0.5), [0, 1.3, 0]);
  add(tug, new RoundedBoxGeometry(3.5, 2.4, 2.6, 2, 0.4), std(0xffffff, 0.5), [-0.8, 2.6, 0]);
  add(tug, new THREE.BoxGeometry(0.1, 0.8, 2.2), std(0x1b3a66, 0.2), [0.97, 3.0, 0]);
  add(tug, new THREE.CylinderGeometry(0.45, 0.5, 2, 14), std(0xffc233, 0.5), [-2.2, 4.4, 0]);
  tug.position.set(-55, 0, -24);
  tug.rotation.y = -0.5;
  scene.add(tug);
  // buoys
  const buoys = [];
  for (const [x, z, c] of [[-24, -14, 0xe8473f], [34, -12, 0x2fb36b], [-48, -60, 0xe8473f], [70, -30, 0x2fb36b]]) {
    const b = new THREE.Group();
    add(b, new THREE.CylinderGeometry(0.7, 0.9, 1.4, 16), std(c, 0.5), [0, 0.3, 0]);
    add(b, new THREE.ConeGeometry(0.6, 1.4, 16), std(c, 0.5), [0, 1.7, 0]);
    add(b, new THREE.CylinderGeometry(0.95, 0.95, 0.25, 16), std(0xffffff, 0.5), [0, 0.95, 0]);
    b.position.set(x, 0, z);
    scene.add(b);
    buoys.push(b);
  }
  // far shore: hills, pastel town, cranes, lighthouse
  const hillMats = [std(0x6fb38a, 1), std(0x5aa07e, 1), std(0x7fc29a, 1)];
  for (let i = 0; i < 46; i++) {
    const x = -1500 + i * 70 + R() * 40;
    add(scene, new THREE.SphereGeometry(90 + R() * 110, 20, 12), hillMats[i % 3], [x, -40, -1100 - R() * 300], [0, 0, 0], [1.6, 0.55 + R() * 0.3, 1], false);
  }
  const townCols = [0xffd6e0, 0xfff1b8, 0xc9f0ff, 0xd9ffd0, 0xffe2c4, 0xe6dcff];
  for (let i = 0; i < 70; i++) {
    const x = -700 + i * 20 + R() * 10;
    const h = 10 + R() * 34;
    add(scene, new THREE.BoxGeometry(12 + R() * 8, h, 12), std(townCols[i % townCols.length], 0.9), [x, h / 2, -720 - R() * 60], [0, 0, 0], [1, 1, 1], false);
  }
  add(scene, new THREE.BoxGeometry(1800, 8, 160), std(0x9fb6a5, 1), [0, 2, -780], [0, 0, 0], [1, 1, 1], false);
  const craneMat = std(0xf2915f, 0.6), craneMat2 = std(0x1f2b5c, 0.6);
  for (const x of [-260, -200, -140]) {
    const c = new THREE.Group();
    for (const dx of [-6, 6]) for (const dz of [-5, 5]) add(c, new THREE.BoxGeometry(1.2, 40, 1.2), craneMat, [dx, 20, dz], [0, 0, 0], [1, 1, 1], false);
    add(c, new THREE.BoxGeometry(14, 3, 12), craneMat2, [0, 40, 0], [0, 0, 0], [1, 1, 1], false);
    add(c, new THREE.BoxGeometry(2.5, 2.5, 70), craneMat, [0, 44, 10], [0, 0, 0], [1, 1, 1], false);
    c.position.set(x, 0, -560);
    scene.add(c);
  }
  const lh = new THREE.Group();
  for (let k = 0; k < 5; k++) add(lh, new THREE.CylinderGeometry(4.2 - k * 0.45, 4.6 - k * 0.45, 6, 24), std(k % 2 ? 0xe8473f : 0xffffff, 0.5), [0, 3 + k * 6, 0], [0, 0, 0], [1, 1, 1], false);
  add(lh, new THREE.CylinderGeometry(2.6, 2.6, 4, 16), std(0xfff4c8, 0.2, { emissive: 0xffe9a0, emissiveIntensity: 0.6 }), [0, 32, 0], [0, 0, 0], [1, 1, 1], false);
  add(lh, new THREE.ConeGeometry(3.4, 4, 16), std(0x1f2b5c, 0.5), [0, 36, 0], [0, 0, 0], [1, 1, 1], false);
  add(lh, new THREE.BoxGeometry(160, 3, 10), std(0xb7b2a6, 0.9), [-80, 0.5, 0], [0, 0, 0], [1, 1, 1], false);
  lh.position.set(240, 0, -320);
  scene.add(lh);

  // gulls
  const gulls = [];
  for (let i = 0; i < 7; i++) {
    const g = gull();
    g.scale.setScalar(1.2);
    scene.add(g);
    gulls.push({ g, cx: -30 + R() * 80, cz: -30 - R() * 40, y: 22 + R() * 20, r: 12 + R() * 18, sp: 0.25 + R() * 0.2, ph: R() * 6 });
  }

  // Affan + stone + splash + bubbles
  const aff = makeAffan();
  scene.add(aff.root);
  const stone = new THREE.Mesh(stoneGeo(), std(0x8d929c, 0.85, { flatShading: false }));
  stone.castShadow = true;
  scene.add(stone);
  const dropMat = std(0xe8fbff, 0.15, { emissive: 0x9fe8ff, emissiveIntensity: 0.4, transparent: true, opacity: 0.9 });
  const drops = new THREE.InstancedMesh(new THREE.SphereGeometry(0.07, 10, 8), dropMat, 90);
  drops.frustumCulled = false;
  scene.add(drops);
  const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.25, 1, 28, 1, true), new THREE.MeshStandardMaterial({ color: 0xf2feff, transparent: true, opacity: 0.8, roughness: 0.2, emissive: 0xbff4ff, emissiveIntensity: 0.4, side: THREE.DoubleSide }));
  scene.add(crown);
  const bubbleMat = new THREE.MeshStandardMaterial({ color: 0xe9fdff, transparent: true, opacity: 0.55, roughness: 0.1, emissive: 0x9feaff, emissiveIntensity: 0.5 });
  const bubbles = new THREE.InstancedMesh(new THREE.SphereGeometry(0.06, 10, 8), bubbleMat, 60);
  bubbles.frustumCulled = false;
  scene.add(bubbles);
  const puff = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xf1dcae, transparent: true, opacity: 0, depthWrite: false }));
  scene.add(puff);

  const shipBob = (t) => 0.12 * Math.sin(t * 0.8);
  function update(t, { under = false } = {}) {
    sea.material.uniforms.uTime.value = t;
    const bob = shipBob(t);
    ship.position.y = SHIP_POS.y + bob;
    ship.rotation.z = 0.004 * Math.sin(t * 0.6 + 1);
    ship.rotation.x = 0.003 * Math.sin(t * 0.5);
    ship.userData.update(t);
    sea.material.uniforms.uShip.value.set(SHIP_POS.x, SHIP_POS.z, SHIP_YAW, bob);
    tug.position.y = 0.15 * Math.sin(t * 1.3);
    tug.rotation.z = 0.03 * Math.sin(t * 1.1);
    buoys.forEach((b, i) => {
      b.position.y = 0.2 * Math.sin(t * 1.4 + i) - 0.2;
      b.rotation.z = 0.08 * Math.sin(t * 1.2 + i * 2);
    });
    gulls.forEach(({ g, cx, cz, y, r, sp, ph }) => {
      const a = t * sp + ph;
      g.position.set(cx + Math.cos(a) * r, y + Math.sin(a * 2) * 1.5, cz + Math.sin(a) * r);
      g.rotation.set(0, -a, 0.35);
      g.userData.flap(t, ph);
    });
    weeds.forEach(({ segs, ph }) => segs.forEach((s, k) => (s.rotation.z = 0.18 * Math.sin(t * 1.3 + ph + k * 0.6))));
    fishes.forEach(({ f, cx, cz, cy, r, sp, ph }) => {
      const a = t * sp + ph;
      f.position.set(cx + Math.cos(a) * r, cy + 0.3 * Math.sin(t * 2 + ph), cz + Math.sin(a) * r);
      f.rotation.y = -a + (sp > 0 ? 0 : Math.PI);
      f.userData.tail.rotation.y = 0.5 * Math.sin(t * 12 + ph);
    });
    shafts.visible = under;
    shafts.children.forEach((m) => (m.material.opacity = 0.12 + 0.06 * Math.sin(t * 0.9 + m.userData.ph)));
    scene.fog = under ? fogUnder : fogAir;
  }
  return { scene, sky, sea, ship, aff, stone, drops, crown, bubbles, puff, shafts, sunLight, update, shipBob, ring };
}

// ------------------------------------------------------------- science world
function gridTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#8b9bf0';
  g.fillRect(0, 0, 256, 256);
  g.strokeStyle = 'rgba(225,232,255,0.6)';
  g.lineWidth = 3;
  g.strokeRect(0, 0, 256, 256);
  g.strokeStyle = 'rgba(225,232,255,0.25)';
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
  t.repeat.set(120, 120);
  t.anisotropy = 8;
  return t;
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
      vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_PointSize = aSz * (14.0 / -mv.z); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `varying float vA; void main(){ vec2 p = gl_PointCoord - 0.5; float d = length(p);
      float star = max(0.0, 1.0 - abs(p.x) * 9.0) * max(0.0, 1.0 - abs(p.y) * 1.6) + max(0.0, 1.0 - abs(p.y) * 9.0) * max(0.0, 1.0 - abs(p.x) * 1.6);
      float a = (smoothstep(0.5, 0.0, d) * 0.5 + star) * vA; gl_FragColor = vec4(1.0, 0.95, 0.8, a); }`,
  });
  const pts = new THREE.Points(g, mat);
  pts.frustumCulled = false;
  pts.userData.update = (t) => (mat.uniforms.uTime.value = t);
  return pts;
}

export const TANK = { x0: -6, x1: 6, z0: -4, level0: 3.0, rise: 0.26, shipScale: 0.036 };

export function buildLab() {
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x9aa6f2, 60, 260);
  const sky = makeSky({ top: 0x2a3cb8, mid: 0x5b6fe6, horizon: 0xc4ccff, bottom: 0x8a95ea, radius: 1500 });
  scene.add(sky);
  scene.add(new THREE.HemisphereLight(0xf0f2ff, 0x7a6fd0, 1.35));
  const key = new THREE.DirectionalLight(0xfff1e0, 2.4);
  key.position.set(8, 18, 14);
  shadowCfg(key, 14);
  scene.add(key, key.target);
  const rim = new THREE.DirectionalLight(0xc8d8ff, 1.2);
  rim.position.set(-10, 8, -12);
  scene.add(rim);

  add(scene, new THREE.PlaneGeometry(600, 600), new THREE.MeshStandardMaterial({ map: gridTexture(), roughness: 0.9 }), [0, -1.2, 0], [-Math.PI / 2, 0, 0], [1, 1, 1], false).receiveShadow = true;
  const { x0, x1, z0 } = TANK;
  // pedestal (cut at z = 0 like everything else)
  add(scene, new RoundedBoxGeometry(x1 - x0 + 2.4, 1.2, -z0 + 1.6, 3, 0.3), std(0xffffff, 0.6), [0, -0.6, z0 / 2 - 0.4]);
  add(scene, new THREE.BoxGeometry(x1 - x0 + 2.45, 0.22, 0.05), std(0xf2915f, 0.5), [0, -0.45, 0.42]);
  add(scene, new THREE.BoxGeometry(x1 - x0 + 2.45, 0.16, 0.05), std(0x1f2b5c, 0.5), [0, -0.8, 0.42]);
  // tank floor (sand) and glass
  add(scene, new THREE.BoxGeometry(x1 - x0, 0.3, -z0), std(0xffffff, 0.9, { map: noiseCanvasTex(256, '#f0d9a6', [['#d8b97c', 0.5], ['#fff0cc', 0.6]], 3, 4) }), [0, -0.15, z0 / 2]);
  const glassMat = new THREE.MeshPhysicalMaterial({ color: 0xdff3ff, roughness: 0.05, transparent: true, opacity: 0.18, depthWrite: false, side: THREE.DoubleSide });
  add(scene, new THREE.BoxGeometry(x1 - x0 + 0.3, 6.2, 0.12), glassMat, [0, 3.1, z0 - 0.06], [0, 0, 0], [1, 1, 1], false);
  for (const x of [x0 - 0.06, x1 + 0.06]) add(scene, new THREE.BoxGeometry(0.12, 6.2, -z0), glassMat, [x, 3.1, z0 / 2], [0, 0, 0], [1, 1, 1], false);
  // glass edge highlights (front cut edges of the side walls)
  const edge = std(0xffffff, 0.3, { emissive: 0xffffff, emissiveIntensity: 0.4 });
  for (const x of [x0 - 0.06, x1 + 0.06]) add(scene, new THREE.BoxGeometry(0.14, 6.2, 0.06), edge, [x, 3.1, 0], [0, 0, 0], [1, 1, 1], false);
  add(scene, new THREE.BoxGeometry(x1 - x0 + 0.3, 0.08, 0.08), edge, [0, 6.2, z0], [0, 0, 0], [1, 1, 1], false);
  // pebbles in the tank
  const R = rng(7);
  const peb = [0xffb3c7, 0x9fe0ff, 0xfff1a8, 0xb8f0c0];
  for (let i = 0; i < 26; i++) add(scene, new THREE.SphereGeometry(0.12 + R() * 0.12, 12, 8), std(peb[i % 4], 0.6), [x0 + 0.4 + R() * (x1 - x0 - 0.8), 0.05, z0 + 0.3 + R() * (-z0 - 0.5)], [0, 0, 0], [1, 0.6, 1]);

  const tank = makeTank({ x0, x1, z0 });
  scene.add(tank.surface, tank.face);

  const clip = new THREE.Plane(new THREE.Vector3(0, 0, -1), 0);
  const ship = makeShip({ cut: true, clip });
  ship.scale.setScalar(TANK.shipScale);
  scene.add(ship);

  // floating background decorations
  const deco = new THREE.Group();
  const decoCols = [0xffc233, 0xff8a9a, 0x7fe0ff, 0xb8f0a0, 0xffffff];
  for (let i = 0; i < 26; i++) {
    const r = 0.5 + R() * 1.4;
    const m = add(deco, i % 3 ? new THREE.SphereGeometry(r, 20, 14) : new THREE.TorusGeometry(r, r * 0.3, 12, 24), std(decoCols[i % decoCols.length], 0.4, { emissive: decoCols[i % decoCols.length], emissiveIntensity: 0.15 }), [-40 + R() * 80, 1 + R() * 26, -18 - R() * 40], [R() * 3, R() * 3, 0], [1, 1, 1], false);
    m.userData.ph = R() * 6;
    m.userData.y0 = m.position.y;
  }
  scene.add(deco);
  const sparkles = sparkleField(420, 4, [-30, 30, 0, 20, -30, 6]);
  scene.add(sparkles);

  function update(t, level, shipY) {
    sparkles.userData.update(t);
    deco.children.forEach((m, i) => {
      m.position.y = m.userData.y0 + Math.sin(t * 0.8 + m.userData.ph) * 0.6;
      m.rotation.y = t * 0.3 + i;
    });
    ship.position.set(0, shipY, 0);
    ship.userData.update(t);
    tank.set(t, level, ship);
  }
  return { scene, sky, ship, tank, update, clip };
}
