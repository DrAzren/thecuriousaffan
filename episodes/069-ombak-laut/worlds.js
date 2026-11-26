// Episode 069 sets:
//  - a sunny beach: sand, an animated sea whose waves roll in to the shore with
//    a foam line, palm trees, a beach umbrella, Affan and Mama;
//  - the sea lab: a wide patch of open sea whose surface is driven per frame
//    (calm -> little ripples -> big travelling waves), wind streaks blowing
//    across, and a yellow rubber duck that only bobs up and down;
//  - the shore in cross-section: a sandy sea floor sloping up to the beach and
//    a wave whose bottom drags on the floor so its top leans over and breaks
//    into white foam;
//  - the branded outro stage from Episode 005.
import * as THREE from 'three';
import { rng } from '../../shared/core.js';
import { makeAffan } from '../../shared/affan.js';
import { add, glow, makeSky } from '../../shared/props.js';
import { buildOutro } from '../005-bulan-ikut-kereta/worlds.js';
import { makeMama } from '../038-bawang-menangis/worlds.js';

export { buildOutro };

const std = (color, rough = 0.7, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0, ...extra });
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const sandTex = canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = '#f0d9a0';
  g.fillRect(0, 0, w, h);
  const R = rng(691);
  for (let i = 0; i < 1800; i++) {
    g.fillStyle = R() > 0.5 ? 'rgba(255,248,220,0.5)' : 'rgba(170,130,70,0.25)';
    g.fillRect(R() * w, R() * h, 1.5, 1.5);
  }
});
sandTex.wrapS = sandTex.wrapT = THREE.RepeatWrapping;

// a yellow rubber duck
export function makeDuck(s = 1) {
  const g = new THREE.Group();
  const yel = std(0xffd23a, 0.35, { emissive: 0x403000, emissiveIntensity: 0.15 });
  add(g, new THREE.SphereGeometry(0.5, 24, 16), yel, [0, 0.3, 0], [0, 0, 0], [1.25, 0.8, 0.95]);
  add(g, new THREE.SphereGeometry(0.33, 20, 14), yel, [0.38, 0.85, 0]);
  add(g, new THREE.SphereGeometry(0.16, 14, 10), std(0xff8a2a, 0.4), [0.7, 0.8, 0], [0, 0, 0], [1.3, 0.5, 0.9]);
  for (const sd of [-1, 1]) add(g, new THREE.SphereGeometry(0.06, 10, 8), std(0x1a1a22, 0.3), [0.55, 0.95, sd * 0.18]);
  add(g, new THREE.SphereGeometry(0.2, 12, 8), yel, [-0.6, 0.55, 0], [0, 0, 0.6], [1, 0.6, 0.8]);
  g.scale.setScalar(s);
  return g;
}
function makePalm(scene, x, z, s) {
  const p = new THREE.Group();
  p.position.set(x, 0, z);
  p.scale.setScalar(s);
  scene.add(p);
  const curve = new THREE.CatmullRomCurve3([V3(0, 0, 0), V3(0.4, 2.5, 0), V3(1.2, 5.2, 0)]);
  add(p, new THREE.TubeGeometry(curve, 20, 0.22, 8), std(0x9a7a4a, 0.8));
  const leaf = std(0x3a9a4a, 0.7, { side: THREE.DoubleSide });
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    add(p, new THREE.SphereGeometry(1, 10, 6), leaf, [1.2 + Math.cos(a) * 1.3, 5.0, Math.sin(a) * 1.3], [0, -a, -0.5], [1.6, 0.08, 0.38]);
  }
  for (let i = 0; i < 3; i++) add(p, new THREE.SphereGeometry(0.2, 10, 8), std(0x7a5a2a, 0.6), [1.0 + (i - 1) * 0.25, 4.75, (i % 2) * 0.2]);
  return p;
}

// ------------------------------------------------------------------ beach
export const SHORE_Z = -4;
export const A_BEACH = V3(0.6, 0, 2.6);
export function buildBeach() {
  const scene = new THREE.Scene();
  const sky = makeSky({ top: 0x3d86e0, mid: 0x7db8f4, horizon: 0xdff0ff, bottom: 0x8ac8f0, radius: 400 });
  scene.add(sky);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xd8c8a0, 1.2));
  const sun = new THREE.DirectionalLight(0xfff2dc, 2.2);
  sun.position.set(6, 14, 8);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -10;
  sun.shadow.camera.right = 10;
  sun.shadow.camera.top = 10;
  sun.shadow.camera.bottom = -10;
  scene.add(sun);
  const sunDisc = glow(0xfff6c0, 40, 0.9);
  sunDisc.position.set(-40, 60, -200);
  scene.add(sunDisc);
  sandTex.repeat.set(14, 10);
  const sand = add(scene, new THREE.PlaneGeometry(120, 60), std(0xffffff, 0.95, { map: sandTex }), [0, 0, 20 + SHORE_Z], [-Math.PI / 2, 0, 0], [1, 1, 1], false);
  sand.receiveShadow = true;
  // wet sand strip
  add(scene, new THREE.PlaneGeometry(120, 3), std(0xc8a870, 0.6, { transparent: true, opacity: 0.6 }), [0, 0.01, SHORE_Z + 1.2], [-Math.PI / 2, 0, 0], [1, 1, 1], false);
  // the sea: waves roll in towards the shore (+z)
  const seaGeo = new THREE.PlaneGeometry(400, 200, 140, 90);
  seaGeo.rotateX(-Math.PI / 2);
  seaGeo.translate(0, 0, SHORE_Z - 100);
  const sea = add(scene, seaGeo, std(0x2a9ad8, 0.2, { emissive: 0x0a3a6a, emissiveIntensity: 0.25, metalness: 0.15 }), [0, 0, 0], [0, 0, 0], [1, 1, 1], false);
  const base = seaGeo.attributes.position.array.slice();
  sea.userData.update = (t) => {
    const p = seaGeo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = base[i * 3], z = base[i * 3 + 2];
      const near = Math.max(0, 1 - (SHORE_Z - z) / 30);
      p.setY(i, 0.05 + (0.18 + 0.25 * near) * Math.sin(z * 0.45 - t * 2.2 + 0.1 * Math.sin(x * 0.1)) + 0.06 * Math.sin(x * 0.3 + t));
    }
    p.needsUpdate = true;
    seaGeo.computeVertexNormals();
  };
  // foam lines that run up the sand and slide back
  const foams = [0, 1].map((i) => add(scene, new THREE.PlaneGeometry(120, 0.7), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 }), [0, 0.12, SHORE_Z], [-Math.PI / 2, 0, 0], [1, 1, 1], false));
  const setFoam = (t) => {
    foams.forEach((f, i) => {
      const ph = ((t * 0.35 + i * 0.5) % 1);
      f.position.z = SHORE_Z + 0.2 + 1.6 * Math.sin(ph * Math.PI);
      f.material.opacity = 0.85 * (1 - ph);
    });
  };
  makePalm(scene, -6, 4, 1.1);
  makePalm(scene, 7.5, 7, 1.2);
  makePalm(scene, -10, 9, 1.0);
  // a beach umbrella and a towel
  const um = new THREE.Group();
  um.position.set(-3.2, 0, 3.0);
  scene.add(um);
  add(um, new THREE.CylinderGeometry(0.05, 0.05, 2.6, 8), std(0xffffff, 0.5), [0, 1.3, 0]);
  const cols = [0xff5c5c, 0xffffff];
  for (let i = 0; i < 8; i++) add(um, new THREE.ConeGeometry(1.5, 0.6, 3, 1, true, (i / 8) * Math.PI * 2, Math.PI / 4), std(cols[i % 2], 0.6, { side: THREE.DoubleSide }), [0, 2.75, 0]);
  add(scene, new THREE.PlaneGeometry(1.2, 2.0), std(0x2fbfd0, 0.8), [-2.4, 0.02, 3.6], [-Math.PI / 2, 0, 0.3], [1, 1, 1], false);
  const aff = makeAffan();
  aff.root.scale.setScalar(0.55);
  scene.add(aff.root);
  const mama = makeMama();
  mama.root.scale.setScalar(0.62);
  scene.add(mama.root);
  return { scene, sky, sea, setFoam, aff, mama };
}

// --------------------------------------------------------------- sea lab
export const SEA_AT = V3(0, 0, 0);
export function buildSeaLab() {
  const scene = new THREE.Scene();
  const sky = makeSky({ top: 0x4a90e0, mid: 0x8ac4f4, horizon: 0xe6f4ff, bottom: 0x9ad0f0, radius: 400 });
  scene.add(sky);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x88aacc, 1.15));
  const key = new THREE.DirectionalLight(0xffffff, 1.8);
  key.position.set(-6, 10, 8);
  scene.add(key);
  // the sea patch, driven per frame
  const geo = new THREE.PlaneGeometry(60, 40, 180, 90);
  geo.rotateX(-Math.PI / 2);
  const sea = add(scene, geo, std(0x2a8ad0, 0.2, { emissive: 0x0a2a5a, emissiveIntensity: 0.25, metalness: 0.1 }), [SEA_AT.x, 0, SEA_AT.z], [0, 0, 0], [1, 1, 1], false);
  const base = geo.attributes.position.array.slice();
  // height of the water at x (waves travel +x): ripple amp a1, wave amp a2
  const height = (x, z, t, a1, a2) => a1 * Math.sin(x * 3.2 - t * 6 + Math.sin(z * 1.7) * 0.8) * 0.5 + a2 * Math.sin(x * 0.75 - t * 2.2) + 0.03 * a1 * Math.sin(z * 4 + t * 5);
  const setSea = (t, a1, a2) => {
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) p.setY(i, height(base[i * 3], base[i * 3 + 2], t, a1, a2));
    p.needsUpdate = true;
    geo.computeVertexNormals();
  };
  // wind streaks: white curvy lines sliding across above the water
  const windMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 });
  const R = rng(692);
  const winds = [];
  for (let i = 0; i < 9; i++) {
    const pts = [];
    for (let k = 0; k <= 16; k++) pts.push(V3(k * 0.22, 0.12 * Math.sin(k * 0.8), 0));
    pts.push(V3(3.5, 0.25, 0), V3(3.7, 0.5, 0), V3(3.5, 0.65, 0), V3(3.3, 0.5, 0));
    const m = add(scene, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, 0.05, 6), windMat.clone(), [0, 0, 0], [0, 0, 0], [1, 1, 1], false);
    m.userData = { y: 1.2 + R() * 2.2, z: (R() - 0.5) * 6, ph: R(), sp: 0.8 + R() * 0.5 };
    winds.push(m);
  }
  // the rubber duck
  const duck = makeDuck(0.7);
  scene.add(duck);
  // a dashed path showing the duck only goes up and down
  const path = add(scene, new THREE.TorusGeometry(0.65, 0.03, 6, 40), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 }), [0, 0, 1.5], [0, 0, 0], [0.35, 1, 1], false);
  return { scene, sky, sea, setSea, height, winds, duck, path };
}

// ---------------------------------------------------------------- shore
export const SHORE_AT = V3(40, 0, 0);
export function buildShore() {
  const scene = new THREE.Scene();
  const sky = makeSky({ top: 0x4a90e0, mid: 0x8ac4f4, horizon: 0xe6f4ff, bottom: 0x9ad0f0, radius: 400 });
  scene.add(sky);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xc8b890, 1.15));
  const key = new THREE.DirectionalLight(0xffffff, 1.6);
  key.position.set(4, 10, 10);
  scene.add(key);
  // sea floor: deep on the left, rising to the beach on the right
  const floorShape = new THREE.Shape();
  floorShape.moveTo(-9, -9);
  floorShape.lineTo(-9, -3.0);
  floorShape.lineTo(0, -2.4);
  floorShape.lineTo(5, -0.6);
  floorShape.lineTo(9, 0.6);
  floorShape.lineTo(9, -9);
  const floor = add(scene, new THREE.ExtrudeGeometry(floorShape, { depth: 2.4, bevelEnabled: false }), std(0xe8cc8a, 0.9), [SHORE_AT.x, 0, SHORE_AT.z - 1.2]);
  void floor;
  const water = add(scene, new THREE.BufferGeometry(), std(0x2a8ad0, 0.2, { transparent: true, opacity: 0.85, emissive: 0x0a2a5a, emissiveIntensity: 0.25 }), [SHORE_AT.x, 0, SHORE_AT.z - 1.2], [0, 0, 0], [1, 1, 1], false);
  const floorY = (x) => (x < 0 ? -3.0 + (x + 9) * (0.6 / 9) : x < 5 ? -2.4 + x * 0.36 : -0.6 + (x - 5) * 0.3);
  // rebuild the water's side profile: crest at c, height h, lean (forward shift of the top)
  const setWave = (c, h, lean) => {
    const sh = new THREE.Shape();
    const xs = [];
    for (let i = 0; i <= 120; i++) xs.push(-9 + (i / 120) * 18);
    const surf = xs.map((u) => {
      const bump = h * Math.exp(-(((u - c) / 1.4) ** 2));
      return [u + lean * (bump / Math.max(0.01, h)) * (u > c - 1.5 ? 1 : 0.4), bump];
    });
    sh.moveTo(-9, floorY(-9) - 0.6);
    surf.forEach(([x, y]) => sh.lineTo(Math.min(9, Math.max(-9, x)), Math.max(floorY(Math.min(9, x)) - 0.02, y)));
    sh.lineTo(9, floorY(9) - 0.6);
    const geo = new THREE.ExtrudeGeometry(sh, { depth: 2.4, bevelEnabled: false, curveSegments: 4 });
    water.geometry.dispose();
    water.geometry = geo;
  };
  // foam bubbles for the breaking crest
  const foamMat = std(0xffffff, 0.5);
  const foam = [];
  for (let i = 0; i < 26; i++) {
    const f = add(scene, new THREE.SphereGeometry(0.12 + (i % 4) * 0.04, 10, 8), foamMat, [0, 0, 0], [0, 0, 0], [1, 1, 1], false);
    f.userData.seed = i * 1.7;
    f.visible = false;
    foam.push(f);
  }
  // friction arrows at the bottom of the wave
  const arrows = [];
  const am = std(0xff6b4a, 0.5, { emissive: 0x802010, emissiveIntensity: 0.3 });
  for (let i = 0; i < 2; i++) {
    const g = new THREE.Group();
    add(g, new THREE.CylinderGeometry(0.06, 0.06, 0.7, 8), am, [0, 0, 0], [0, 0, Math.PI / 2], [1, 1, 1], false);
    add(g, new THREE.ConeGeometry(0.16, 0.3, 10), am, [-0.45, 0, 0], [0, 0, Math.PI / 2], [1, 1, 1], false);
    g.visible = false;
    scene.add(g);
    arrows.push(g);
  }
  return { scene, sky, water, setWave, floorY, foam, arrows };
}
