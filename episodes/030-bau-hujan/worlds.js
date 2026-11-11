// Episode 030 sets. The rainy night road comes from Episode 028 (rain, no
// lightning). The imagination world is a "soil lab": a big cut-away block of
// earth with cute bacteria inside, a giant raindrop that lands on it, bubbles
// that rise and pop, and ribbons of smell that the wind carries to Affan.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { rng, clamp } from '../../shared/core.js';
import { makeAffan } from '../../shared/affan.js';
import { add, makeSky, makeStars, glow, glowTex } from '../../shared/props.js';
import { buildStormRoad, buildOutro, carX, CAR_SPEED } from '../028-kilat-guruh/worlds.js';

export { buildOutro, carX, CAR_SPEED };

export function buildRainRoad() {
  const w = buildStormRoad();
  w.flash(0);
  return w;
}

const std = (color, rough = 0.8, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: rough, ...extra });

// Soil block: top surface at y = SOIL_TOP, front cut face at z = SOIL_FRONT.
export const SOIL = { w: 9, d: 4.2, h: 2.4 };
export const SOIL_TOP = SOIL.h;
export const SOIL_FRONT = SOIL.d / 2;

function makeBacterium(R, color) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.22, 6, 14), std(color, 0.5, { emissive: color, emissiveIntensity: 0.25 }));
  body.rotation.z = Math.PI / 2;
  g.add(body);
  for (const s of [-1, 1]) {
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), std(0xffffff, 0.3));
    e.position.set(0.09 + 0.05 * s, 0.04, 0.09);
    g.add(e);
    const p = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6), std(0x111111, 0.3));
    p.position.set(0.09 + 0.05 * s, 0.04, 0.12);
    g.add(p);
  }
  const smile = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.009, 6, 12, Math.PI), std(0x3a1a1a, 0.5));
  smile.position.set(0.09, -0.02, 0.11);
  smile.rotation.z = Math.PI;
  g.add(smile);
  g.userData.ph = R() * 10;
  return g;
}

// A wavy ribbon of smell, drawn as a tube along a sine path from a to b.
export function makeSmellRibbon(color = 0x9be07a) {
  const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, depthWrite: false, fog: false });
  const mesh = new THREE.Mesh(new THREE.BufferGeometry(), mat);
  mesh.frustumCulled = false;
  const a = new THREE.Vector3(), b = new THREE.Vector3(), side = new THREE.Vector3(), p = new THREE.Vector3();
  mesh.userData.set = (from, to, t, grow = 1, alpha = 1, amp = 0.18, radius = 0.045) => {
    mesh.visible = grow > 0.01 && alpha > 0.01;
    if (!mesh.visible) return;
    a.copy(from);
    b.copy(to);
    side.subVectors(b, a).cross(new THREE.Vector3(0, 0, 1)).normalize();
    const pts = [];
    const n = 40;
    for (let i = 0; i <= n; i++) {
      const k = (i / n) * grow;
      p.copy(a).lerp(b, k).addScaledVector(side, Math.sin(k * 14 - t * 5) * amp * Math.min(1, k * 4));
      pts.push(p.clone());
    }
    mesh.geometry.dispose();
    mesh.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, radius, 8, false);
    mat.opacity = 0.85 * alpha;
  };
  mesh.visible = false;
  return mesh;
}

export function buildSoilLab() {
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x9fb6e8, 30, 160);
  const sky = makeSky({ top: 0x3a5ab8, mid: 0x6f8fd8, horizon: 0xb9cdf2, bottom: 0x7f95c8 });
  const stars = makeStars(300, 1600, 31);
  stars.material.uniforms.uAlpha.value = 0.25;
  scene.add(sky, stars);
  scene.add(new THREE.HemisphereLight(0xeaf2ff, 0x6a5a48, 1.4));
  const key = new THREE.DirectionalLight(0xfff2e0, 2.2);
  key.position.set(6, 14, 12);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  const c = key.shadow.camera;
  c.left = c.bottom = -12;
  c.right = c.top = 12;
  key.shadow.bias = -0.0005;
  key.shadow.normalBias = 0.02;
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xbfd8ff, 1.0);
  rim.position.set(-8, 6, -8);
  scene.add(rim);

  // floor: soft green grass plane
  const floor = add(scene, new THREE.PlaneGeometry(400, 400), std(0x6fbf73, 0.95), [0, 0, 0], [-Math.PI / 2, 0, 0], [1, 1, 1], false);
  floor.receiveShadow = true;

  // soil block (cut-away): grass top, brown layers, darker bottom
  const lab = new THREE.Group();
  scene.add(lab);
  const layers = [[0.8, 0x5a3a26], [0.9, 0x7a5236], [0.55, 0x96673f]];
  let y = 0;
  for (const [h, col] of layers) {
    add(lab, new RoundedBoxGeometry(SOIL.w, h, SOIL.d, 2, 0.05), std(col, 0.95), [0, y + h / 2, 0]);
    y += h;
  }
  add(lab, new RoundedBoxGeometry(SOIL.w + 0.08, 0.15, SOIL.d + 0.08, 2, 0.06), std(0x5fbf5a, 0.8), [0, SOIL_TOP + 0.02, 0]);
  // grass tufts on top (not near the drop's landing spot)
  const R = rng(30);
  for (let i = 0; i < 90; i++) {
    const x = (R() - 0.5) * (SOIL.w - 0.3), z = (R() - 0.5) * (SOIL.d - 0.3);
    if (Math.abs(x) < 1.3 && Math.abs(z) < 1.2) continue;
    const blade = add(lab, new THREE.ConeGeometry(0.05, 0.3 + R() * 0.25, 5), std([0x4fb04a, 0x6fcf5a, 0x3f9a40][i % 3], 0.8), [x, SOIL_TOP + 0.2, z], [(R() - 0.5) * 0.4, 0, (R() - 0.5) * 0.4]);
    blade.castShadow = false;
  }
  // grains and pebbles on the cut face, with little air pockets (pores)
  const grainMats = [0xa77b52, 0x8b6442, 0xc29563, 0x6e4b31].map((cc) => std(cc, 0.9, { flatShading: true }));
  for (let i = 0; i < 160; i++) {
    const r = 0.06 + R() * 0.12;
    add(lab, new THREE.IcosahedronGeometry(r, 0), grainMats[i % 4], [(R() - 0.5) * (SOIL.w - 0.3), 0.15 + R() * (SOIL_TOP - 0.3), SOIL_FRONT + 0.01], [R() * 3, R() * 3, 0], [1, 1, 0.5]);
  }
  const poreMat = new THREE.MeshBasicMaterial({ color: 0x2c1a10 });
  for (let i = 0; i < 40; i++) {
    const r = 0.06 + R() * 0.07;
    const m = new THREE.Mesh(new THREE.CircleGeometry(r, 14), poreMat);
    m.position.set((R() - 0.5) * (SOIL.w - 0.6), 0.6 + R() * (SOIL_TOP - 0.8), SOIL_FRONT + 0.012);
    lab.add(m);
  }

  // bacteria living on the cut face
  const bacteria = [];
  const bcols = [0x7fe08a, 0x6fd6c8, 0xb6e86a, 0x8ad0ff];
  for (let i = 0; i < 14; i++) {
    const b = makeBacterium(R, bcols[i % 4]);
    const bx = -3.4 + (i % 7) * 1.1 + (R() - 0.5) * 0.3;
    const by = i < 7 ? 1.75 + R() * 0.3 : 0.9 + R() * 0.35;
    b.position.set(bx, by, SOIL_FRONT + 0.1);
    b.userData.home = b.position.clone();
    b.scale.setScalar(1.6);
    lab.add(b);
    bacteria.push(b);
  }

  // giant raindrop (with an inner trapped air bubble)
  const water = new THREE.MeshPhysicalMaterial({ color: 0x9fdcff, roughness: 0.05, transmission: 0, transparent: true, opacity: 0.55, depthWrite: false, emissive: 0x2f7fd0, emissiveIntensity: 0.25 });
  const dropGeo = new THREE.SphereGeometry(0.6, 40, 28);
  const dp = dropGeo.attributes.position;
  for (let i = 0; i < dp.count; i++) {
    const yy = dp.getY(i);
    if (yy > 0) {
      const k = yy / 0.6;
      dp.setX(i, dp.getX(i) * (1 - 0.75 * k * k));
      dp.setZ(i, dp.getZ(i) * (1 - 0.75 * k * k));
      dp.setY(i, yy * 1.5);
    }
  }
  dropGeo.computeVertexNormals();
  const drop = new THREE.Group();
  const dropMesh = new THREE.Mesh(dropGeo, water);
  drop.add(dropMesh);
  const shine = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 }));
  shine.position.set(-0.22, 0.15, 0.4);
  shine.scale.set(1, 1.6, 0.5);
  drop.add(shine);
  drop.visible = false;
  scene.add(drop);
  // splash crown
  const splash = new THREE.Group();
  for (let i = 0; i < 12; i++) {
    const s = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), water);
    const a = (i / 12) * Math.PI * 2;
    s.userData.dir = new THREE.Vector3(Math.cos(a), 1.2 + R() * 0.6, Math.sin(a));
    splash.add(s);
  }
  splash.visible = false;
  scene.add(splash);

  // rising bubbles that pop into a puff of tiny droplets
  const bubbleMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.05, transparent: true, opacity: 0.45, depthWrite: false, emissive: 0x9fd8ff, emissiveIntensity: 0.3 });
  const bubbles = [];
  for (let i = 0; i < 9; i++) {
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.13 + R() * 0.07, 20, 14), bubbleMat);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1, 0.06, 6, 20), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, depthWrite: false }));
    b.visible = ring.visible = false;
    scene.add(b, ring);
    bubbles.push({ b, ring, x: (R() - 0.5) * 1.1, z: (R() - 0.5) * 0.6, t0: i * 0.33 + R() * 0.12 });
  }
  // aerosol droplets carrying the smell (points)
  const N = 260;
  const ap = new Float32Array(N * 3);
  const ag = new THREE.BufferGeometry();
  ag.setAttribute('position', new THREE.BufferAttribute(ap, 3));
  const aero = new THREE.Points(ag, new THREE.PointsMaterial({ color: 0xc8ffa8, map: glowTex, size: 0.3, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending }));
  aero.frustumCulled = false;
  scene.add(aero);
  const aSeed = Array.from({ length: N }, () => [R(), R(), R(), R()]);
  // a: 0..1 visibility; spread: how far the cloud has risen/drifted (0..1); wind: drift to -x
  const setAero = (t, a, spread, wind = 0, origin = new THREE.Vector3(0, SOIL_TOP + 0.6, 0)) => {
    aero.visible = a > 0.01;
    aero.material.opacity = 0.9 * a;
    for (let i = 0; i < N; i++) {
      const [r1, r2, r3, r4] = aSeed[i];
      const up = spread * (0.4 + 2.2 * r1);
      ap[i * 3] = origin.x + (r2 - 0.5) * (0.6 + 1.6 * spread) - wind * (2 + 6 * r1) + 0.08 * Math.sin(t * 2 + r4 * 9);
      ap[i * 3 + 1] = origin.y + up + 0.08 * Math.sin(t * 3 + r3 * 9);
      ap[i * 3 + 2] = origin.z + (r3 - 0.5) * (0.6 + 1.0 * spread);
    }
    ag.attributes.position.needsUpdate = true;
  };
  setAero(0, 0, 0);

  // smell ribbons: from the bacteria (geosmin) and from the bursting bubbles to Affan
  const ribbons = Array.from({ length: 6 }, (_, i) => makeSmellRibbon([0x9be07a, 0xb7f08a, 0x7fd6a0][i % 3]));
  scene.add(...ribbons);

  // wind swoosh arrow (flat curved band)
  const wind = new THREE.Group();
  const windMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8, depthWrite: false, side: THREE.DoubleSide });
  for (let i = 0; i < 3; i++) {
    const arc = new THREE.Mesh(new THREE.TorusGeometry(1.6 + i * 0.45, 0.05, 6, 40, Math.PI * 0.55), windMat);
    arc.rotation.z = Math.PI * 0.2;
    arc.position.y = i * 0.35;
    wind.add(arc);
  }
  wind.visible = false;
  scene.add(wind);

  const aff = makeAffan();
  scene.add(aff.root);

  return { scene, sky, stars, lab, bacteria, drop, dropMesh, splash, bubbles, setAero, ribbons, wind, windMat, aff, key };
}
