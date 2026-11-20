// Episode 053 sets:
//  - the Episode 044 park, which can fade from bright day to dusk and night
//    (sky colours, sun, stars, glowing lamp posts); Affan holds a ball;
//  - space: a big glowing Sun on the left and the Earth on the right with a
//    simple painted map, a tilted spin axis, a little Affan standing on
//    Malaysia, pins for Malaysia and America, a spinning top for comparison;
//  - a small "toy planet" with grass and trees and Affan standing on top,
//    used to show the Sun rising in the east and setting in the west;
//  - the Episode 043 bedroom at night;
//  - the branded outro stage from Episode 005.
import * as THREE from 'three';
import { rng } from '../../shared/core.js';
import { makeAffan } from '../../shared/affan.js';
import { add, glow, glowTex, makeStars, makeTree } from '../../shared/props.js';
import { buildPark, A_PK, PLAY_SCALE } from '../044-salji-malaysia/worlds.js';
import { buildBedroom, BED, MATTRESS_Y, AFF_S } from '../043-kenapa-mimpi/worlds.js';
import { buildOutro } from '../005-bulan-ikut-kereta/worlds.js';

export { buildOutro, A_PK, PLAY_SCALE, buildBedroom, BED, MATTRESS_Y, AFF_S };

const std = (color, rough = 0.7, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0, ...extra });
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

// ------------------------------------------------------------------ park
export function buildPark53() {
  const w = buildPark();
  w.setSnow(0, 0);
  const stars = makeStars(900, 800, 53);
  w.scene.add(stars);
  const ball = new THREE.Group();
  add(ball, new THREE.SphereGeometry(0.28, 20, 14), std(0xff4d5e, 0.5), [0, 0, 0], [0, 0, 0], [1, 1, 1], false);
  add(ball, new THREE.TorusGeometry(0.28, 0.035, 8, 30), std(0xffffff, 0.5), [0, 0, 0], [0, 0, 0], [1, 1, 1], false);
  add(ball, new THREE.TorusGeometry(0.28, 0.035, 8, 30), std(0xffd23a, 0.5), [0, 0, 0], [Math.PI / 2, 0, 0], [1, 1, 1], false);
  w.aff.parts.arms.R.hand.add(ball);
  ball.position.set(0, -0.3, 0.2);
  // lamp posts that glow at night
  const lamps = [];
  for (const [x, z] of [[-2.5, -1.5], [4.5, -2.0]]) {
    const g = new THREE.Group();
    g.position.set(A_PK.x + x, 0, A_PK.z + z);
    w.scene.add(g);
    add(g, new THREE.CylinderGeometry(0.06, 0.08, 3.2, 10), std(0x4a5468, 0.5), [0, 1.6, 0]);
    const bulb = add(g, new THREE.SphereGeometry(0.2, 16, 12), new THREE.MeshBasicMaterial({ color: 0xfff2c0 }), [0, 3.3, 0], [0, 0, 0], [1, 1, 1], false);
    const halo = glow(0xffd88a, 2.0, 0);
    halo.position.set(0, 3.3, 0);
    g.add(halo);
    lamps.push({ bulb, halo });
  }
  const DAY = { top: new THREE.Color(0x3d86e0), mid: new THREE.Color(0x7db8f4), horizon: new THREE.Color(0xffe6c4) };
  const DUSK = { top: new THREE.Color(0x2a3a8a), mid: new THREE.Color(0xc86a7a), horizon: new THREE.Color(0xffa860) };
  const NIGHT = { top: new THREE.Color(0x050a24), mid: new THREE.Color(0x0e1a44), horizon: new THREE.Color(0x24306a) };
  const u = w.sky.material.uniforms;
  const fog0 = w.scene.fog.color.clone();
  const setNight = (t, k) => {
    // k: 0 day, 0.5 dusk, 1 night
    const a = Math.min(1, k * 2), b = Math.max(0, k * 2 - 1);
    for (const key of ['top', 'mid', 'horizon']) u[key].value.copy(DAY[key]).lerp(DUSK[key], a).lerp(NIGHT[key], b);
    w.sun.intensity = 2.6 * (1 - 0.85 * k);
    w.sun.color.setHex(0xfff2dc).lerp(new THREE.Color(0xffa070), a).lerp(new THREE.Color(0x6a80c8), b);
    w.scene.fog.color.copy(fog0).lerp(new THREE.Color(0x1a2450), k);
    stars.visible = b > 0.05;
    stars.material.uniforms.uAlpha.value = b;
    stars.userData.update(t);
    lamps.forEach((l) => {
      l.halo.material.opacity = 0.9 * b;
      l.bulb.material.color.setHex(0x8a8a80).lerp(new THREE.Color(0xfff2c0), b);
    });
    w.scene.traverse((o) => {
      if (o.isHemisphereLight) o.intensity = 1.2 * (1 - 0.6 * k);
    });
  };
  setNight(0, 0);
  return { ...w, stars, ball, setNight };
}

// ------------------------------------------------------------------ space
export const EARTH_R = 3.0;
export const EARTH_AT = V3(3.0, 0, 0);
export const SUN_AT = V3(-34, 0, -6);
// position on a SphereGeometry of radius r for (lon, lat) in degrees
export function lonLat(lon, lat, r) {
  const phi = ((lon + 180) / 360) * Math.PI * 2;
  const th = ((90 - lat) / 180) * Math.PI;
  return V3(-Math.cos(phi) * Math.sin(th) * r, Math.cos(th) * r, Math.sin(phi) * Math.sin(th) * r);
}
function earthTex() {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 512;
  const g = c.getContext('2d');
  g.fillStyle = '#2a7ad8';
  g.fillRect(0, 0, 1024, 512);
  const P = (lon, lat) => [((lon + 180) / 360) * 1024, ((90 - lat) / 180) * 512];
  const blob = (pts, col = '#4ab84a') => {
    g.fillStyle = col;
    g.beginPath();
    pts.forEach(([lon, lat], i) => {
      const [x, y] = P(lon, lat);
      if (i === 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    });
    g.closePath();
    g.fill();
  };
  // very simple continents
  blob([[-165, 68], [-100, 72], [-60, 58], [-75, 45], [-80, 26], [-97, 18], [-105, 22], [-118, 33], [-125, 48], [-150, 60]]); // North America
  blob([[-80, 10], [-50, 0], [-35, -8], [-40, -22], [-58, -38], [-70, -52], [-75, -40], [-80, -5]]); // South America
  blob([[-10, 36], [10, 37], [32, 31], [43, 12], [51, 11], [40, -15], [32, -30], [20, -35], [12, -18], [8, 4], [-17, 15]]); // Africa
  blob([[-10, 43], [0, 50], [10, 58], [30, 70], [60, 72], [100, 76], [140, 72], [170, 66], [160, 58], [140, 50], [122, 40], [120, 22], [108, 15], [104, 2], [98, 8], [90, 22], [78, 8], [70, 22], [58, 25], [48, 30], [35, 36], [28, 40], [15, 38], [5, 43]]); // Eurasia
  blob([[114, -22], [122, -18], [137, -12], [146, -18], [153, -28], [146, -39], [130, -32], [115, -34]]); // Australia
  blob([[100, 6], [104, 1.3], [103.5, 4], [101, 6.5]], '#5ac85a'); // Peninsular Malaysia
  blob([[109.6, 1.5], [112, 3], [116, 7], [119, 5], [117.5, 1], [114, -3], [110, -2]], '#5ac85a'); // Borneo
  blob([[95, 5], [106, -6], [104, -5], [98, 2]], '#4ab84a'); // Sumatra
  g.fillStyle = '#f0f6ff';
  g.fillRect(0, 0, 1024, 26);
  g.fillRect(0, 486, 1024, 26);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function makePin(color) {
  const g = new THREE.Group();
  add(g, new THREE.CylinderGeometry(0.02, 0.02, 0.5, 6), std(0x333344, 0.5), [0, 0.25, 0], [0, 0, 0], [1, 1, 1], false);
  add(g, new THREE.SphereGeometry(0.12, 14, 10), std(color, 0.4, { emissive: color, emissiveIntensity: 0.4 }), [0, 0.55, 0], [0, 0, 0], [1, 1, 1], false);
  return g;
}
function onSurface(obj, parent, lon, lat, r) {
  const p = lonLat(lon, lat, r);
  obj.position.copy(p);
  obj.quaternion.setFromUnitVectors(V3(0, 1, 0), p.clone().normalize());
  parent.add(obj);
}
export function makeTop() {
  const g = new THREE.Group();
  const pts = [V3(0, 0, 0), V3(0.35, 0.25, 0), V3(0.55, 0.5, 0), V3(0.5, 0.65, 0), V3(0.2, 0.75, 0), V3(0.06, 0.8, 0), V3(0.05, 1.05, 0), V3(0, 1.08, 0)].map((v) => new THREE.Vector2(v.x, v.y));
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 64;
  const x = c.getContext('2d');
  ['#ff4d5e', '#ffd23a', '#2f9bff', '#2fbf5f'].forEach((col, i) => {
    x.fillStyle = col;
    x.fillRect(i * 64, 0, 64, 64);
  });
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  add(g, new THREE.LatheGeometry(pts, 32), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.5 }), [0, 0, 0], [0, 0, 0], [1, 1, 1], false);
  return g;
}
export function buildSpace() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x02040e);
  const stars = makeStars(1600, 300, 530);
  scene.add(stars);
  scene.add(new THREE.AmbientLight(0x3a4a7a, 0.25));
  const sunLight = new THREE.DirectionalLight(0xfff4e0, 2.6);
  sunLight.position.copy(SUN_AT);
  scene.add(sunLight);
  sunLight.target.position.copy(EARTH_AT);
  scene.add(sunLight.target);
  const sun = add(scene, new THREE.SphereGeometry(9, 40, 30), new THREE.MeshBasicMaterial({ color: 0xffd04a }), SUN_AT.toArray(), [0, 0, 0], [1, 1, 1], false);
  const corona = glow(0xffb03a, 34, 0.9);
  corona.position.copy(SUN_AT);
  scene.add(corona);
  // Earth: tilt group -> spin group
  const tilt = new THREE.Group();
  tilt.position.copy(EARTH_AT);
  tilt.rotation.z = -0.41;
  scene.add(tilt);
  const spin = new THREE.Group();
  tilt.add(spin);
  add(spin, new THREE.SphereGeometry(EARTH_R, 64, 40), new THREE.MeshStandardMaterial({ map: earthTex(), roughness: 0.8 }), [0, 0, 0], [0, 0, 0], [1, 1, 1], false);
  const atmo = add(tilt, new THREE.SphereGeometry(EARTH_R * 1.04, 48, 32), new THREE.MeshBasicMaterial({ color: 0x6ab8ff, transparent: true, opacity: 0.12, side: THREE.BackSide, depthWrite: false }), [0, 0, 0], [0, 0, 0], [1, 1, 1], false);
  // spin axis line
  add(tilt, new THREE.CylinderGeometry(0.02, 0.02, EARTH_R * 2.8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6 }), [0, 0, 0], [0, 0, 0], [1, 1, 1], false);
  // little Affan on Malaysia, and pins
  const aff = makeAffan();
  aff.root.scale.setScalar(0.32);
  const affHold = new THREE.Group();
  onSurface(affHold, spin, 102, 3.5, EARTH_R);
  affHold.add(aff.root);
  const pinMY = makePin(0xffcf33);
  onSurface(pinMY, spin, 112, 3, EARTH_R);
  const pinUS = makePin(0xff4d5e);
  onSurface(pinUS, spin, -98, 39, EARTH_R);
  const sleeper = new THREE.Group();
  onSurface(sleeper, spin, -92, 36, EARTH_R);
  add(sleeper, new THREE.BoxGeometry(0.5, 0.15, 0.3), std(0x7a5cf0, 0.6), [0, 0.08, 0], [0, 0, 0], [1, 1, 1], false);
  add(sleeper, new THREE.SphereGeometry(0.1, 12, 10), std(0xf0c8a0, 0.6), [0.22, 0.2, 0], [0, 0, 0], [1, 1, 1], false);
  // spinning top
  const top = makeTop();
  top.scale.setScalar(1.6);
  top.position.set(EARTH_AT.x, -EARTH_R - 3.2, 1.0);
  top.visible = false;
  scene.add(top);
  // the toy planet for sunrise/sunset
  const toy = new THREE.Group();
  toy.position.set(60, 0, 0);
  scene.add(toy);
  const toySpin = new THREE.Group();
  toy.add(toySpin);
  add(toySpin, new THREE.SphereGeometry(5, 48, 32), std(0x6ac84a, 0.9), [0, 0, 0], [0, 0, 0], [1, 1, 1], false);
  const R = rng(531);
  for (let i = 0; i < 26; i++) {
    const tr = makeTree(R, { scale: 0.5 + R() * 0.3, toy: true });
    onSurface(tr, toySpin, R() * 360 - 180, (R() - 0.5) * 120, 4.98);
  }
  const house = new THREE.Group();
  onSurface(house, toySpin, 0, 0, 4.98);
  const toyAff = makeAffan();
  toyAff.root.scale.setScalar(0.9);
  const toyHold = new THREE.Group();
  toyHold.position.set(0, 5.0, 0);
  toy.add(toyHold);
  toyHold.add(toyAff.root);
  const toySun = add(scene, new THREE.SphereGeometry(2.5, 32, 20), new THREE.MeshBasicMaterial({ color: 0xffd04a }), [60, 0, -60], [0, 0, 0], [1, 1, 1], false);
  const toyGlow = glow(0xffb03a, 12, 0.9);
  scene.add(toyGlow);
  const toyLight = new THREE.DirectionalLight(0xfff4e0, 1.8);
  scene.add(toyLight);
  scene.add(toyLight.target);
  // air particles that move with the Earth
  const airMat = new THREE.SpriteMaterial({ map: glowTex, color: 0xbfe8ff, transparent: true, opacity: 0.7, depthWrite: false });
  const air = Array.from({ length: 30 }, (_, i) => {
    const s = new THREE.Sprite(airMat);
    s.scale.setScalar(0.16);
    onSurface(s, spin, 60 + (i % 10) * 9, -20 + Math.floor(i / 10) * 18, EARTH_R + 0.25 + (i % 3) * 0.1);
    s.visible = false;
    return s;
  });
  return { scene, stars, sun, corona, tilt, spin, atmo, aff, pinMY, pinUS, sleeper, top, toy, toySpin, toyAff, toySun, toyGlow, toyLight, air };
}
