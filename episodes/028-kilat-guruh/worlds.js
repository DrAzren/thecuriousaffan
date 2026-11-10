// Episode 028 sets. The night road and the imagination diorama come from
// Episode 005 and are dressed for a thunderstorm here: storm clouds, rain,
// lightning bolts, and the two "racers" (light and sound) on the toy road.
import * as THREE from 'three';
import { rng, clamp, lerp } from '../../shared/core.js';
import { glow } from '../../shared/props.js';
import { buildRoadWorld, buildToyWorld, buildOutro, carX, CAR_SPEED } from '../005-bulan-ikut-kereta/worlds.js';

export { buildOutro, carX, CAR_SPEED };

// Brightness of a lightning strike dt seconds after it starts (double flicker).
export function strikeGlow(dt) {
  if (dt < 0 || dt > 0.6) return 0;
  if (dt < 0.07) return 1;
  if (dt < 0.13) return 0.25;
  if (dt < 0.22) return 0.95;
  return 0.95 * (1 - (dt - 0.22) / 0.38) ** 2;
}

// Jagged bolt from (0, height, 0) down to the origin, with a few branches.
export function makeBolt({ seed = 1, height = 100, spread = 0.12, thick = 1, color = 0xfff7c8, halo = 0x9fc0ff, steps = 11 } = {}) {
  const R = rng(seed);
  const g = new THREE.Group();
  const core = new THREE.MeshBasicMaterial({ color, transparent: true, fog: false, depthWrite: false });
  const up = new THREE.Vector3(0, 1, 0);
  const seg = (a, b, r) => {
    const d = new THREE.Vector3().subVectors(b, a);
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, d.length(), 6), core);
    m.position.copy(a).addScaledVector(d, 0.5);
    m.quaternion.setFromUnitVectors(up, d.clone().normalize());
    g.add(m);
  };
  const path = (from, to, n, r, depth) => {
    let p = from.clone();
    for (let i = 1; i <= n; i++) {
      const q = from.clone().lerp(to, i / n);
      if (i < n) q.add(new THREE.Vector3((R() - 0.5) * 2, (R() - 0.5) * 0.4, (R() - 0.5) * 0.6).multiplyScalar(spread * height));
      seg(p, q, r);
      if (depth > 0 && i > 1 && i < n - 1 && R() < 0.4) {
        const end = q.clone().add(new THREE.Vector3((R() < 0.5 ? -1 : 1) * (0.12 + R() * 0.14) * height, -(0.12 + R() * 0.12) * height, 0));
        path(q, end, 4, r * 0.5, 0);
      }
      p = q;
    }
  };
  path(new THREE.Vector3(0, height, 0), new THREE.Vector3(0, 0, 0), steps, 0.012 * height * thick, 1);
  const sprites = [];
  for (const [y, s, o] of [[height, 0.9, 0.9], [height * 0.5, 1.3, 0.5], [0, 0.6, 0.9]]) {
    const sp = glow(halo, height * s, o);
    sp.position.set(0, y, 0);
    sp.userData.o = o;
    g.add(sp);
    sprites.push(sp);
  }
  g.userData.set = (k) => {
    g.visible = k > 0.001;
    core.opacity = clamp(k * 1.4);
    for (const s of sprites) s.material.opacity = s.userData.o * k;
  };
  g.userData.set(0);
  return g;
}

function makeCloud(R, { scale = 1, color = 0x2a3360, top = 0x46508a, toy = false } = {}) {
  const g = new THREE.Group();
  const mats = [color, top].map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 1, fog: false, emissive: c, emissiveIntensity: toy ? 0.35 : 0.5 }));
  const n = toy ? 7 : 6;
  for (let i = 0; i < n; i++) {
    const r = (0.55 + R() * 0.45) * scale;
    const m = new THREE.Mesh(new THREE.SphereGeometry(r, toy ? 24 : 12, toy ? 16 : 8), mats[i % 2]);
    m.position.set((i - (n - 1) / 2) * 0.62 * scale + (R() - 0.5) * 0.2 * scale, (i % 2 ? 0.28 : 0) * scale + (R() - 0.5) * 0.15 * scale, (R() - 0.5) * 0.7 * scale);
    m.scale.y = 0.72;
    g.add(m);
  }
  g.userData.mats = mats;
  return g;
}

// Fluffy storybook storm cloud: a flat-bottomed base of puffs, bigger puffs on top.
function makeToyCloud(R) {
  const g = new THREE.Group();
  const mats = [0x5c62a8, 0x7d84c8, 0xa7acdf].map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.95, emissive: c, emissiveIntensity: 0.18, fog: false }));
  const puff = (x, y, z, r, m) => {
    const s = new THREE.Mesh(new THREE.SphereGeometry(r, 28, 20), mats[m]);
    s.position.set(x, y, z);
    s.castShadow = true;
    g.add(s);
  };
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    puff(Math.cos(a) * 2.6 + (R() - 0.5) * 0.5, 0, Math.sin(a) * 2.2 + (R() - 0.5) * 0.5, 1.3 + R() * 0.4, 0);
  }
  puff(0, 0.1, 0, 2.2, 0);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + 0.4;
    puff(Math.cos(a) * 1.5, 1.1 + R() * 0.3, Math.sin(a) * 1.3, 1.35 + R() * 0.35, 1);
  }
  puff(0.2, 2.0, 0.1, 1.5, 2);
  puff(-1.0, 1.7, -0.6, 1.1, 2);
  // flatten the underside
  g.scale.set(1, 0.85, 1);
  g.userData.mats = mats;
  return g;
}

// ------------------------------------------------------------- stormy road
export function buildStormRoad() {
  const w = buildRoadWorld();
  const { scene } = w;
  w.moon.visible = false;
  w.stars.material.uniforms.uAlpha.value = 0.18;
  w.moonLight.intensity = 1.25;
  const su = w.sky.material.uniforms;
  const base = { top: new THREE.Color(0x04071a), mid: new THREE.Color(0x101a48), horizon: new THREE.Color(0x2c3a7c), bottom: new THREE.Color(0x090d22) };
  const lit = { top: new THREE.Color(0x4a5aa8), mid: new THREE.Color(0x8fa2ea), horizon: new THREE.Color(0xd4dcff), bottom: new THREE.Color(0x39447a) };

  const R = rng(61);
  const cloudMats = [];
  for (let i = 0; i < 90; i++) {
    const side = i % 3 === 0 ? -1 : 1; // most of them on Affan's window side (+z)
    const c = makeCloud(R, { scale: 34 + R() * 30 });
    c.position.set(-800 + R() * 1300, 95 + R() * 60, side * (190 + R() * 260));
    scene.add(c);
    cloudMats.push(...c.userData.mats);
  }
  const bolt = makeBolt({ seed: 4, height: 150, thick: 1.5 });
  scene.add(bolt);
  const flashLight = new THREE.HemisphereLight(0xdfe6ff, 0x8f9ad0, 0);
  scene.add(flashLight);

  // rain: line streaks in a box that follows the camera, never inside the car
  const N = 2600, BOX = [26, 16, 26], LEN = 0.75, SLANT = 0.22;
  const seedPos = new Float32Array(N * 3), speed = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    seedPos.set([R() * BOX[0], R() * BOX[1], R() * BOX[2]], i * 3);
    speed[i] = 15 + R() * 8;
  }
  const pos = new Float32Array(N * 6);
  const rg = new THREE.BufferGeometry();
  rg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const rain = new THREE.LineSegments(rg, new THREE.LineBasicMaterial({ color: 0xb9c9ff, transparent: true, opacity: 0.42, depthWrite: false }));
  rain.frustumCulled = false;
  scene.add(rain);
  const wrap = (v, c, size) => c + ((((v - c) % size) + size * 1.5) % size) - size / 2;
  w.rainAt = (t, camPos, carPos) => {
    for (let i = 0; i < N; i++) {
      const fall = speed[i] * t;
      const x = wrap(seedPos[i * 3] + fall * SLANT, camPos.x, BOX[0]);
      const y = wrap(seedPos[i * 3 + 1] - fall, camPos.y + 3, BOX[1]);
      const z = wrap(seedPos[i * 3 + 2], camPos.z, BOX[2]);
      const inCar = Math.abs(x - carPos.x) < 2.45 && Math.abs(z - carPos.z) < 1.2 && y < 2.3;
      const o = i * 6;
      if (inCar || y < 0) {
        pos.fill(0, o, o + 6);
        continue;
      }
      pos[o] = x; pos[o + 1] = y; pos[o + 2] = z;
      pos[o + 3] = x - LEN * SLANT; pos[o + 4] = y + LEN; pos[o + 5] = z;
    }
    rg.attributes.position.needsUpdate = true;
  };
  // k = 0..1 strike brightness: bolt, sky, clouds and ground light together.
  w.flash = (k) => {
    bolt.userData.set(k);
    flashLight.intensity = 3.2 * k;
    for (const key of Object.keys(base)) su[key].value.copy(base[key]).lerp(lit[key], k * 0.75);
    for (const m of cloudMats) m.emissiveIntensity = 0.5 + 2.2 * k;
  };
  w.flash(0);
  w.bolt = bolt;
  return w;
}

// ---------------------------------------------------------- toy storm world
export const STRIKE_X = -24; // where the toy lightning hits the toy road
export const AFF_X = 4; // where Affan stands, on the same road
export const CLOUD_Y = 6.4;

export function buildStormToy() {
  const w = buildToyWorld();
  const { scene } = w;
  w.moon.visible = false;
  w.car.visible = false;
  // clear the toys around Affan's spot so he can stand on the road
  for (const o of scene.children) {
    if (o.isGroup && o !== w.aff.root && o !== w.car && Math.abs(o.position.x - AFF_X) < 2.6 && Math.abs(o.position.z) < 2.4 && o.position.lengthSq() > 0) o.visible = false;
  }
  const cloud = makeToyCloud(rng(77));
  cloud.position.set(STRIKE_X, CLOUD_Y, 0);
  scene.add(cloud);
  const bolt = makeBolt({ seed: 9, height: CLOUD_Y - 1.2, spread: 0.16, thick: 4.6, color: 0xffe24a, halo: 0xfff0a0, steps: 6 });
  bolt.position.set(STRIKE_X, 0, 0);
  scene.add(bolt);
  const flashLight = new THREE.PointLight(0xfff2b0, 0, 40, 1.6);
  flashLight.position.set(STRIKE_X, 3, 0);
  scene.add(flashLight);

  // light racer: a glowing ball with a streak behind it
  const light = new THREE.Group();
  light.add(new THREE.Mesh(new THREE.SphereGeometry(0.34, 24, 16), new THREE.MeshBasicMaterial({ color: 0xfff07a, fog: false, toneMapped: false })));
  const lg = glow(0xffd23c, 3.4, 0.9);
  light.add(lg);
  const trailMat = new THREE.MeshBasicMaterial({ color: 0xffe45c, transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
  const trail = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.05, 1, 12, 1, true), trailMat);
  trail.rotation.z = -Math.PI / 2; // length along x, thick end towards +x (the head)
  light.add(trail);
  light.visible = false;
  scene.add(light);
  w.setLight = (x, y = 2.6, z = 0, trailLen = 0, trailA = 1, a = 1) => {
    light.visible = a > 0.001;
    light.position.set(x, y, z);
    light.scale.setScalar(Math.max(0.001, a));
    trail.visible = trailLen > 0.05 && trailA > 0.01;
    trail.scale.y = Math.max(0.05, trailLen);
    trail.position.x = -trailLen / 2;
    trailMat.opacity = 0.75 * trailA;
  };

  // sound racer: three arches ")))" rolling slowly along the road
  const sound = new THREE.Group();
  const arcs = [];
  [0.75, 1.05, 1.35].forEach((r, i) => {
    const m = new THREE.Mesh(new THREE.TorusGeometry(r, 0.09, 10, 40, Math.PI), new THREE.MeshBasicMaterial({ color: [0x9fdcff, 0x5fc0ff, 0x2f9bff][i], transparent: true, fog: false }));
    m.rotation.y = Math.PI / 2;
    m.position.x = (i - 1) * 0.55;
    sound.add(m);
    arcs.push(m);
  });
  sound.visible = false;
  scene.add(sound);
  w.setSound = (x, t, a = 1) => {
    sound.visible = a > 0.001;
    sound.position.x = x;
    arcs.forEach((m, i) => {
      const s = 1 + 0.09 * Math.sin(t * 9 - i * 1.1);
      m.scale.set(s, s, s);
      m.material.opacity = a * (0.75 + 0.25 * Math.sin(t * 9 - i * 1.1));
    });
  };
  w.flash = (k) => {
    bolt.userData.set(k);
    flashLight.intensity = 260 * k;
    for (const m of cloud.userData.mats) m.emissiveIntensity = 0.18 + 1.4 * k;
  };
  w.flash(0);
  w.cloud = cloud;
  return w;
}
