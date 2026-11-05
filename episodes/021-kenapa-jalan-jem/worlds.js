// Episode 021 sets: the jammed city highway (real-world car ride), Affan's
// sunny toy-traffic imagination world and the branded outro stage.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { rng } from '../../shared/core.js';
import { makeAffan } from '../../shared/affan.js';
import { add, makeSky, makeGround, makeCar, makeTree, makeLamp, makeHouse, makeBush, glow } from '../../shared/props.js';

const std = (color, rough = 0.6, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0, ...extra });

export const CAR_COLORS = [0xff6b6b, 0x4f8cff, 0x43c46b, 0xffffff, 0xb8bfcc, 0x2d3446, 0xffbf3f, 0xb36bff, 0xff9a4d, 0x3fc6c6, 0xe84d7a, 0x8a5a3c];

function shadowCfg(light, size, map = 2048) {
  light.castShadow = true;
  light.shadow.mapSize.set(map, map);
  const c = light.shadow.camera;
  c.left = -size;
  c.right = size;
  c.top = size;
  c.bottom = -size;
  c.near = 1;
  c.far = 400;
  light.shadow.bias = -0.0005;
  light.shadow.normalBias = 0.02;
}

function seatbelt(aff) {
  const strap = new THREE.Mesh(new THREE.BoxGeometry(0.11, 1.25, 0.03), std(0x2f3340, 0.7));
  strap.position.set(0.02, 0.5, 0.56);
  strap.rotation.set(-0.12, 0, -0.62);
  aff.parts.torso.add(strap);
}

// Red brake-light glow at the back of a makeCar() car (car-local units).
// Also switches off the night-time headlight beams: this episode is in daylight.
function addBrakeGlow(car, size = 1.7) {
  car.userData.body.traverse((o) => {
    if (o.isMesh && o.geometry.type === 'ConeGeometry' && o.material.blending === THREE.AdditiveBlending) o.visible = false;
  });
  const sprites = [];
  for (const s of [-1, 1]) {
    const g = glow(0xff2a20, size, 0);
    g.position.set(-2.32, 0.92, 0.66 * s);
    car.userData.body.add(g);
    sprites.push(g);
  }
  const lamps = [];
  for (const s of [-1, 1]) {
    const m = add(car.userData.body, new THREE.BoxGeometry(0.07, 0.2, 0.42), new THREE.MeshBasicMaterial({ color: 0x5a0c0c }), [-2.18, 0.92, 0.66 * s], [0, 0, 0], [1, 1, 1], false);
    lamps.push(m);
  }
  const off = new THREE.Color(0x5a0c0c), on = new THREE.Color(0xff3a2a);
  car.userData.brake = (k) => {
    for (const g of sprites) g.material.opacity = 0.95 * k;
    for (const m of lamps) m.material.color.copy(off).lerp(on, Math.min(1, k * 1.4));
  };
  return car;
}

// A tiny passenger (head + hair) sitting inside a car or bus.
function passenger(parent, pos, R, s = 1) {
  const g = new THREE.Group();
  const skins = [0xe8a57c, 0xc98a5e, 0xf2c29a, 0xa86d48];
  add(g, new THREE.SphereGeometry(0.3 * s, 16, 12), std(skins[Math.floor(R() * skins.length)], 0.6), [0, 0, 0], [0, 0, 0], [1, 1, 1], false);
  const hair = [0x22160f, 0x3a2618, 0x111111][Math.floor(R() * 3)];
  add(g, new THREE.SphereGeometry(0.31 * s, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), std(hair, 0.5), [0, 0.03 * s, 0], [0, 0, 0], [1, 1, 1], false);
  // a bright scarf / shirt dot so heads read at toy scale
  add(g, new THREE.SphereGeometry(0.26 * s, 12, 8), std([0xff8a5b, 0x4f8cff, 0x43c46b, 0xffcf33, 0xe84d7a][Math.floor(R() * 5)], 0.7), [0, -0.38 * s, 0], [0, 0, 0], [1.2, 0.7, 1.2], false);
  g.position.set(...pos);
  parent.add(g);
  return g;
}

// ------------------------------------------------------------------ bus
// Rounded city bus, forward = +x, ~11 long, ~3.2 tall (same units as makeCar).
export function makeBus({ color = 0x2f9bff, stripe = 0xffcf33, R = rng(3), riders = 14 } = {}) {
  const bus = new THREE.Group();
  const body = new THREE.Group();
  bus.add(body);
  const paint = std(color, 0.35, { emissive: color, emissiveIntensity: 0.05 });
  add(body, new RoundedBoxGeometry(11, 2.6, 2.5, 4, 0.4), paint, [0, 1.75, 0]);
  add(body, new RoundedBoxGeometry(11.06, 0.28, 2.56, 2, 0.12), std(stripe, 0.4), [0, 1.0, 0]);
  add(body, new RoundedBoxGeometry(10.4, 0.16, 2.3, 2, 0.06), std(0xffffff, 0.5), [0, 3.1, 0]);
  const glass = new THREE.MeshPhysicalMaterial({ color: 0xcfe9ff, roughness: 0.05, transparent: true, opacity: 0.35, depthWrite: false });
  for (const s of [-1, 1]) add(body, new THREE.BoxGeometry(9.6, 0.95, 0.04), glass, [-0.3, 2.35, 1.26 * s], [0, 0, 0], [1, 1, 1], false);
  add(body, new THREE.BoxGeometry(0.04, 1.2, 2.2), glass, [5.52, 2.25, 0], [0, 0, 0], [1, 1, 1], false);
  for (const s of [-1, 1]) {
    add(body, new THREE.SphereGeometry(0.2, 12, 10), new THREE.MeshBasicMaterial({ color: 0xfff6d0 }), [5.5, 1.0, 0.85 * s], [0, 0, 0], [0.5, 1, 1.2], false);
  }
  const people = [];
  for (let i = 0; i < riders; i++) {
    const col = i % 7, row = Math.floor(i / 7);
    people.push(passenger(body, [-4.3 + col * 1.35, 2.25, (row ? -0.55 : 0.55)], R, 1.05));
  }
  const wheels = [];
  for (const [x, z] of [[3.6, 1.15], [3.6, -1.15], [-3.4, 1.15], [-3.4, -1.15]]) {
    const w = new THREE.Group();
    w.position.set(x, 0.55, z);
    bus.add(w);
    add(w, new THREE.CylinderGeometry(0.55, 0.55, 0.4, 24), std(0x23262f, 0.6), [0, 0, 0], [Math.PI / 2, 0, 0]);
    add(w, new THREE.CylinderGeometry(0.3, 0.3, 0.42, 16), std(0xdfe3ea, 0.3, { metalness: 0.5 }), [0, 0, 0], [Math.PI / 2, 0, 0]);
    wheels.push(w);
  }
  bus.userData = { body, people, wheels, update: (d) => wheels.forEach((w) => (w.rotation.z = -d / 0.55)) };
  return bus;
}

// --------------------------------------------------------------- city jam
// Our car drives towards -x like Episode 005 (rotated 180 degrees), so the
// rear-left window (Affan's) looks out to +z, where the next lane is.
export const LANES = [3.6, 0, -3.6];
export const CREEP = (t) => {
  // stop-and-go creeping: a few metres in the whole scene
  const k = Math.max(0, t);
  return 0.35 * k + 0.25 * Math.sin(k * 0.9);
};

function windowTex(R) {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#9fb6cf';
  g.fillRect(0, 0, 64, 128);
  for (let y = 4; y < 128; y += 10)
    for (let x = 4; x < 64; x += 10) {
      g.fillStyle = R() < 0.35 ? '#ffe2a6' : R() < 0.5 ? '#6f89a8' : '#c9dcef';
      g.fillRect(x, y, 6, 6);
    }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.magFilter = THREE.NearestFilter;
  return t;
}

export function buildCityWorld() {
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xf3c89a, 60, 420);
  const sky = makeSky({ top: 0x3f86e0, mid: 0x86b9ee, horizon: 0xffd3a1, bottom: 0xc9a88a });
  scene.add(sky);
  scene.add(new THREE.HemisphereLight(0xdcebff, 0x8a7a66, 1.15));
  const sun = new THREE.DirectionalLight(0xffe0b8, 2.6);
  shadowCfg(sun, 14);
  scene.add(sun, sun.target);
  const sunDir = new THREE.Vector3(-0.5, 0.42, 0.75).normalize();
  const sunDisc = glow(0xfff1c8, 120, 0.9);
  scene.add(sunDisc);
  scene.add(makeGround(0x7f9a62));

  // highway: 3 lanes our way + shoulder, median barrier, 3 lanes the other way
  const road = new THREE.Group();
  const len = 900, cx = -250;
  add(road, new THREE.PlaneGeometry(len, 13), std(0x3a3d48, 0.92), [cx, 0, 0], [-Math.PI / 2, 0, 0], [1, 1, 1], false).receiveShadow = true;
  add(road, new THREE.PlaneGeometry(len, 12), std(0x3a3d48, 0.92), [cx, 0, -14], [-Math.PI / 2, 0, 0], [1, 1, 1], false).receiveShadow = true;
  add(road, new THREE.BoxGeometry(len, 0.9, 0.6), std(0xc9c6bd, 0.85), [cx, 0.45, -7.2]).receiveShadow = true;
  for (const z of [5.6, -5.6]) add(road, new THREE.PlaneGeometry(len, 0.16), std(0xf2efe6, 0.7), [cx, 0.006, z], [-Math.PI / 2, 0, 0], [1, 1, 1], false);
  add(road, new THREE.BoxGeometry(len, 0.5, 0.3), std(0xb8bcc6, 0.6, { metalness: 0.3 }), [cx, 0.6, 6.6]);
  const dash = new THREE.InstancedMesh(new THREE.PlaneGeometry(3, 0.15), std(0xf2efe6, 0.6), 600);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
  let di = 0;
  for (const z of [1.8, -1.8, -12.2, -15.8])
    for (let x = cx - len / 2; x < cx + len / 2 && di < 600; x += 6) dash.setMatrixAt(di++, m.compose(new THREE.Vector3(x, 0.006, z), q, new THREE.Vector3(1, 1, 1)));
  dash.count = di;
  road.add(dash);
  scene.add(road);

  const R = rng(21);
  // our car + Affan (rear left, booster seat)
  const car = makeCar({ color: 0xffbf3f, accent: 0xff7a45 });
  car.rotation.y = Math.PI;
  scene.add(car);
  addBrakeGlow(car);
  const aff = makeAffan();
  aff.root.scale.setScalar(0.32);
  aff.root.position.set(-0.92, 0.574, -0.45);
  car.add(aff.root);
  seatbelt(aff);
  // Papa: a simple driver silhouette in the front right seat (only a shoulder/head is ever seen)
  const papa = new THREE.Group();
  add(papa, new THREE.SphereGeometry(0.26, 18, 14), std(0xc98a5e, 0.6), [0, 1.62, 0]);
  add(papa, new THREE.SphereGeometry(0.27, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), std(0x1b1410, 0.5), [0, 1.66, 0]);
  add(papa, new RoundedBoxGeometry(0.42, 0.62, 0.6, 3, 0.15), std(0x3f6fb6, 0.8), [0.05, 1.12, 0]);
  papa.position.set(0.3, 0, 0.47);
  car.userData.interior.add(papa);
  const fill = new THREE.PointLight(0xffd2a8, 0, 4, 2);
  car.add(fill);

  // jammed traffic around us
  const jam = [];
  const slots = [];
  for (const z of LANES) {
    let x = -70 + R() * 3;
    while (x < 120) {
      if (!(z === 0 && Math.abs(x) < 3.5)) slots.push([x, z]);
      x += 6.0 + R() * 1.6;
    }
  }
  let busPlaced = false;
  for (const [x, z] of slots) {
    let o;
    if (!busPlaced && z === LANES[2] && x > 12) {
      o = makeBus({ R, riders: 10 });
      o.rotation.y = Math.PI;
      o.userData.len = 11;
      busPlaced = true;
      o.position.set(x + 3, 0, z);
      o.userData.x0 = x + 3;
    } else {
      o = makeCar({ color: CAR_COLORS[Math.floor(R() * CAR_COLORS.length)], accent: 0x2b2f3a });
      o.rotation.y = Math.PI;
      addBrakeGlow(o);
      o.userData.x0 = x;
      if (R() < 0.8) passenger(o.userData.body, [0.35, 1.55, 0.47], R, 0.9);
    }
    o.position.set(o.userData.x0, 0, z);
    o.userData.phase = R() * 3;
    o.userData.lane = z;
    const far = Math.abs(x) > 30;
    o.traverse((c) => {
      if (c.isMesh && far) c.castShadow = false;
    });
    scene.add(o);
    jam.push(o);
  }
  // a few cars moving fast the other way, for life
  const other = [];
  for (let i = 0; i < 8; i++) {
    const o = makeCar({ color: CAR_COLORS[Math.floor(R() * CAR_COLORS.length)] });
    o.position.set(0, 0, i % 2 ? -12.2 : -15.8);
    o.userData.off = i * 55;
    scene.add(o);
    other.push(o);
  }
  // median lamps and city skyline
  for (let x = -300; x < 200; x += 26) {
    const l = makeLamp({ armDir: 1, pool: false, light: 0.0 });
    l.position.set(x, 0, -7.2);
    scene.add(l);
  }
  for (let x = -330; x < 220; x += 8 + R() * 10) {
    const tr = makeTree(R, { scale: 1 + R() * 0.5, leaf: [0x4f8a3e, 0x5f9c48, 0x3f7a36] });
    tr.position.set(x, 0, 9 + R() * 5);
    scene.add(tr);
    const b = makeBush(R, { color: 0x557f3e });
    b.position.set(x + 3, 0, 8.2);
    scene.add(b);
  }
  const towerMats = [0xa9bdd4, 0xcfd9e6, 0x8ea6c2, 0xe0d2c0].map((c) => new THREE.MeshStandardMaterial({ color: c, map: windowTex(R), roughness: 0.5, metalness: 0.15 }));
  for (let i = 0; i < 70; i++) {
    const x = -420 + i * 9 + R() * 6;
    const side = i % 3 === 0 ? -1 : 1;
    const h = 20 + R() * 70;
    const w = 8 + R() * 10;
    const z = side * (55 + R() * 90);
    const tower = add(scene, new THREE.BoxGeometry(w, h, w), towerMats[i % 4], [x, h / 2, z], [0, R() * 0.4, 0], [1, 1, 1], false);
    tower.material.map.repeat.set(1, h / 30);
    if (R() < 0.3) add(scene, new THREE.CylinderGeometry(0.3, 0.3, 8, 6), std(0xdfe3ea, 0.4), [x, h + 4, z], [0, 0, 0], [1, 1, 1], false);
  }
  for (let i = 0; i < 20; i++) add(scene, new THREE.SphereGeometry(40 + R() * 30, 20, 12), std(0x8aa37c, 1), [-500 + i * 50, -14, 230 + R() * 60], [0, 0, 0], [1.6, 0.7, 1], false);

  const update = (t) => {
    const c = CREEP(t);
    car.position.set(-c, 0, 0);
    car.userData.update(c);
    for (const o of jam) {
      const k = CREEP(t + o.userData.phase * 0.2) - CREEP(o.userData.phase * 0.2);
      o.position.x = o.userData.x0 - k;
      if (o.userData.update) o.userData.update(k);
      if (o.userData.brake) o.userData.brake(0.65 + 0.35 * Math.max(0, Math.sin((t + o.userData.phase) * 0.9)));
    }
    car.userData.brake(0.8);
    for (const o of other) {
      o.position.x = -300 + ((t * 22 + o.userData.off) % 480);
      o.userData.update(t * 22);
    }
    sun.target.position.copy(car.position);
    sun.position.copy(car.position).addScaledVector(sunDir, 120);
  };
  const placeSun = (cam) => sunDisc.position.copy(cam.position).addScaledVector(sunDir, 900);
  return { scene, sky, car, aff, fill, jam, update, placeSun };
}

// ------------------------------------------------------------------- toy
function gridTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#8fdcb6';
  g.fillRect(0, 0, 256, 256);
  g.strokeStyle = 'rgba(255,255,255,0.55)';
  g.lineWidth = 3;
  g.strokeRect(0, 0, 256, 256);
  g.strokeStyle = 'rgba(255,255,255,0.22)';
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
  t.repeat.set(250, 250);
  t.anisotropy = 8;
  return t;
}

export const TOY = 0.21; // toy units per metre
const LANE_W = 3.6 * TOY;

// A straight toy road along x: lanes centred around z0.
function toyRoad(parent, { x0, x1, z0 = 0, lanes = 1 }) {
  const w = lanes * LANE_W + 0.12;
  const cx = (x0 + x1) / 2, len = x1 - x0;
  add(parent, new THREE.PlaneGeometry(len, w), std(0x4d5380, 0.85), [cx, 0.012, z0], [-Math.PI / 2, 0, 0], [1, 1, 1], false).receiveShadow = true;
  for (const s of [-1, 1]) add(parent, new THREE.BoxGeometry(len, 0.05, 0.08), std(0xffffff, 0.6), [cx, 0.03, z0 + s * (w / 2)], [0, 0, 0], [1, 1, 1], false);
  for (let l = 1; l < lanes; l++) {
    const z = z0 - (lanes * LANE_W) / 2 + l * LANE_W;
    const n = Math.floor(len / 0.62);
    const im = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.3, 0.05), new THREE.MeshBasicMaterial({ color: 0xfff1a8 }), n);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
    for (let i = 0; i < n; i++) im.setMatrixAt(i, m.compose(new THREE.Vector3(x0 + i * 0.62, 0.02, z), q, new THREE.Vector3(1, 1, 1)));
    parent.add(im);
  }
}

export const ZONES = { crowd: 0, neck: -40, wave: 40, bus: 80 };
// spots where Affan stands in the toy world (kept free of trees and houses)
export const AFF_SPOTS = { reveal: [26, 2.3], secret: [-3.2, 42.4], aha: [32, 2.6] };
// ...and the ground between those spots and the camera
const CLEAR = [...Object.values(AFF_SPOTS), [32, -1.8], [32, -3.8], [26, -2.0], [-3.2, 38.4]];
const laneZ = (zone, lanes, l) => zone - (lanes * LANE_W) / 2 + (l + 0.5) * LANE_W;
export const neckLaneZ = (lat) => ZONES.neck + (lat - 1) * LANE_W;

export function buildToyWorld() {
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xcfe6ff, 40, 260);
  const sky = makeSky({ top: 0x3d8ef0, mid: 0x8cc6ff, horizon: 0xfff0d6, bottom: 0xbfe6d0 });
  scene.add(sky);
  scene.add(new THREE.HemisphereLight(0xf4f8ff, 0x7fc8a0, 1.35));
  const sun = new THREE.DirectionalLight(0xfff0d8, 2.4);
  shadowCfg(sun, 16);
  scene.add(sun, sun.target);
  const sunDir = new THREE.Vector3(-0.35, 0.8, -0.45).normalize();
  const ground = add(scene, new THREE.PlaneGeometry(700, 700), new THREE.MeshStandardMaterial({ map: gridTexture(), roughness: 0.9 }), [0, 0, 0], [-Math.PI / 2, 0, 0], [1, 1, 1], false);
  ground.receiveShadow = true;

  // A: one road for the crowding demo; C: one lane for the brake wave
  toyRoad(scene, { x0: -120, x1: 160, z0: ZONES.crowd, lanes: 1 });
  toyRoad(scene, { x0: -120, x1: 160, z0: ZONES.wave, lanes: 1 });
  // D: two lanes for the bus / LRT demo
  toyRoad(scene, { x0: -120, x1: 160, z0: ZONES.bus, lanes: 2 });
  // B: three lanes squeezing into one at x = 0
  const neck = new THREE.Group();
  toyRoad(neck, { x0: -60, x1: -2.6, z0: ZONES.neck, lanes: 3 });
  toyRoad(neck, { x0: -2.8, x1: 80, z0: ZONES.neck, lanes: 1 });
  // taper wedges + cones + striped barriers
  for (const s of [-1, 1]) {
    const shape = new THREE.Shape();
    const zw = (3 * LANE_W) / 2, zn = LANE_W / 2;
    shape.moveTo(-2.6, s * zw);
    shape.lineTo(0.6, s * zn);
    shape.lineTo(0.6, s * (zw + 0.06));
    shape.closePath();
    const wedge = new THREE.Mesh(new THREE.ShapeGeometry(shape), std(0x4d5380, 0.85));
    wedge.rotation.x = Math.PI / 2;
    wedge.position.set(0, 0.012, ZONES.neck);
    neck.add(wedge);
    for (let k = 0; k <= 5; k++) {
      const x = -2.6 + (k / 5) * 3.0;
      const z = ZONES.neck + s * (zw - (zw - zn) * (k / 5) - 0.04);
      const cone = new THREE.Group();
      add(cone, new THREE.ConeGeometry(0.09, 0.28, 14), std(0xff7a2a, 0.5), [0, 0.14, 0]);
      add(cone, new THREE.CylinderGeometry(0.065, 0.075, 0.05, 14), std(0xffffff, 0.5), [0, 0.13, 0], [0, 0, 0], [1, 1, 1], false);
      add(cone, new THREE.BoxGeometry(0.22, 0.03, 0.22), std(0xff7a2a, 0.5), [0, 0.015, 0]);
      cone.position.set(x, 0, z);
      neck.add(cone);
    }
  }
  scene.add(neck);

  // LRT viaduct over road D
  const lrt = new THREE.Group();
  const zL = ZONES.bus + 2.2;
  add(lrt, new THREE.BoxGeometry(300, 0.35, 1.0), std(0xd7dbe4, 0.7), [20, 3.2, zL]);
  for (let x = -120; x < 160; x += 9) {
    add(lrt, new THREE.CylinderGeometry(0.22, 0.28, 3.2, 14), std(0xc6cbd6, 0.7), [x, 1.6, zL]);
    add(lrt, new THREE.BoxGeometry(0.4, 0.3, 1.5), std(0xc6cbd6, 0.7), [x, 3.0, zL]);
  }
  const train = new THREE.Group();
  for (let k = 0; k < 3; k++) {
    const car = new THREE.Group();
    add(car, new RoundedBoxGeometry(4.2, 1.15, 0.95, 4, 0.22), std(0xf4f6fb, 0.4), [0, 0, 0]);
    add(car, new RoundedBoxGeometry(4.24, 0.22, 0.98, 2, 0.08), std(0x1f6fd6, 0.4), [0, -0.3, 0]);
    add(car, new RoundedBoxGeometry(3.7, 0.36, 0.99, 2, 0.08), std(0x2d3a5c, 0.3), [0, 0.16, 0], [0, 0, 0], [1, 1, 1], false);
    const R2 = rng(40 + k);
    for (let i = 0; i < 5; i++) passenger(car, [-1.5 + i * 0.75, 0.12, 0.42], R2, 0.42);
    car.position.set(-k * 4.4, 4.0, zL);
    train.add(car);
  }
  lrt.add(train);
  scene.add(lrt);

  // toy car pool (forward = +x)
  const R = rng(77);
  const cars = [];
  for (let i = 0; i < 30; i++) {
    const c = makeCar({ color: CAR_COLORS[i % CAR_COLORS.length], accent: 0x2b2f3a });
    c.scale.setScalar(TOY);
    addBrakeGlow(c, 2.2);
    c.userData.rider = passenger(c.userData.body, [-0.5, 1.5, -0.45], R, 1.1);
    c.userData.rider.visible = false;
    c.visible = false;
    scene.add(c);
    cars.push(c);
  }
  const bus = makeBus({ color: 0x2f9bff, R, riders: 14 });
  bus.scale.setScalar(TOY);
  bus.visible = false;
  scene.add(bus);

  const aff = makeAffan();
  scene.add(aff.root);

  // scenery: lollipop trees, little houses, hills
  const leaf = [[0x7bd66a], [0x4fc48a], [0x9be05c], [0x3fb6a0]];
  const walls = [0xffd6e0, 0xfff1b8, 0xc9f0ff, 0xd9ffd0], roofs = [0xff6b6b, 0x4f8cff, 0xffa53b, 0x9b6bff];
  for (const zone of [ZONES.crowd, ZONES.wave, ZONES.bus, ZONES.neck]) {
    for (let x = -110; x < 150; x += 1.6 + R() * 2.4) {
      for (const s of [-1, 1]) {
        if (zone === ZONES.bus && s < 0) continue;
        const d = (zone === ZONES.neck ? 2.2 : 1.4) + R() * 2.5;
        let o;
        const k = R();
        if (k < 0.55) o = makeTree(R, { scale: 0.3 + R() * 0.15, leaf: leaf[Math.floor(R() * 4)], trunk: 0x9a6a45, toy: true });
        else if (k < 0.8) o = makeHouse(R, { scale: 0.2, walls, roofs, toy: true });
        else o = makeBush(R, { scale: 0.35, color: 0x5fc87a });
        if (CLEAR.some(([cx, cz]) => Math.hypot(x - cx, zone + s * d - cz) < 2.2)) continue;
        o.position.set(x, 0, zone + s * d);
        if (s < 0) o.rotation.y = Math.PI;
        scene.add(o);
      }
    }
  }
  for (let i = 0; i < 40; i++) add(scene, new THREE.SphereGeometry(10 + R() * 14, 24, 14), std([0x7fd3a0, 0x9fe0b0, 0x6fc4a8][i % 3], 1), [-200 + i * 12, -5, 130 + R() * 40], [0, 0, 0], [1.6, 0.7, 1], false);
  for (let i = 0; i < 40; i++) add(scene, new THREE.SphereGeometry(10 + R() * 14, 24, 14), std([0x7fd3a0, 0x9fe0b0, 0x6fc4a8][i % 3], 1), [-200 + i * 12, -5, -90 - R() * 40], [0, 0, 0], [1.6, 0.7, 1], false);
  // fluffy clouds
  const cloudMat = std(0xffffff, 1, { emissive: 0xffffff, emissiveIntensity: 0.35 });
  for (let i = 0; i < 26; i++) {
    const g = new THREE.Group();
    for (let k = 0; k < 4; k++) add(g, new THREE.SphereGeometry(3 + R() * 2.5, 16, 12), cloudMat, [k * 3.2 - 5, R() * 1.2, R() * 2], [0, 0, 0], [1, 0.75, 1], false);
    g.position.set(-180 + R() * 340, 26 + R() * 20, (R() < 0.5 ? -1 : 1) * (70 + R() * 80));
    scene.add(g);
  }

  const hideCars = () => {
    for (const c of cars) {
      c.visible = false;
      c.userData.rider.visible = false;
      c.userData.brake(0);
    }
    bus.visible = false;
  };
  const shadowAt = (p) => {
    sun.target.position.copy(p);
    sun.position.copy(p).addScaledVector(sunDir, 120);
  };
  return { scene, sky, cars, bus, train, aff, hideCars, shadowAt, laneZ };
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
  shadowCfg(key, 5);
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
