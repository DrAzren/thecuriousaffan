// Episode 045 sets:
//  - a petrol station: canopy, two pump islands, a car at the pump, Affan,
//    a toy-like dinosaur (for the myth), a tanker lorry that drives in, and a
//    nozzle that goes into the car;
//  - the ancient sea: blue water with light shafts, a sandy floor, and
//    glowing plankton (sprites, plus a few big cute ones);
//  - the "lapisan bumi" (earth layers) diorama: a glass tank with sea water on
//    top; dead plankton settle into a dark layer, mud and rock layers pile on,
//    pressure and heat turn the plankton layer into black crude oil;
//  - an oil rig at sea with a see-through seabed: a derrick, a drill pipe that
//    reaches the oil, crude oil flowing up, and two small rigs far away;
//  - an oil refinery: a tall see-through tower heated by a furnace, crude
//    coming in, vapour rising, and five outlet pipes (gas, petrol, kerosene for
//    planes, diesel, tar) into coloured tanks;
//  - the branded outro stage from Episode 005.
import * as THREE from 'three';
import { rng } from '../../shared/core.js';
import { makeAffan } from '../../shared/affan.js';
import { add, glow, glowTex, makeSky, makeCar } from '../../shared/props.js';
import { buildOutro, RoundedBoxGeometry } from '../005-bulan-ikut-kereta/worlds.js';
import { makeDragon } from '../043-kenapa-mimpi/worlds.js';

export { buildOutro };

const std = (color, rough = 0.7, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0, ...extra });
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const OIL = 0x15110e;

function gradientSky(top, bot, lo = -0.3, hi = 0.7) {
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: { top: { value: new THREE.Color(top) }, bot: { value: new THREE.Color(bot) } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `uniform vec3 top, bot; varying vec3 vP;
      void main(){ gl_FragColor = vec4(mix(bot, top, smoothstep(${lo.toFixed(2)}, ${hi.toFixed(2)}, vP.y)), 1.0);
        #include <colorspace_fragment>
      }`,
  });
  const m = new THREE.Mesh(new THREE.SphereGeometry(200, 32, 16), mat);
  m.renderOrder = -10;
  return m;
}
const rodGeo = (() => {
  const g = new THREE.CylinderGeometry(1, 1, 1, 10, 1, false);
  g.translate(0, 0.5, 0);
  return g;
})();

// a tanker lorry facing +x
export function makeTanker() {
  const g = new THREE.Group();
  const cab = std(0x2f7bdf, 0.4, { metalness: 0.1 });
  add(g, new RoundedBoxGeometry(1.6, 1.7, 1.9, 3, 0.2), cab, [2.6, 1.35, 0]);
  add(g, new THREE.BoxGeometry(0.06, 0.7, 1.6), new THREE.MeshPhysicalMaterial({ color: 0xbfe3ff, roughness: 0.05, transparent: true, opacity: 0.5 }), [3.42, 1.7, 0], [0, 0, 0], [1, 1, 1], false);
  add(g, new THREE.BoxGeometry(5.4, 0.3, 1.8), std(0x3a3f4f, 0.6), [0.2, 0.55, 0]);
  add(g, new THREE.CapsuleGeometry(0.9, 3.2, 8, 24), std(0xe8ecf2, 0.25, { metalness: 0.5 }), [-0.6, 1.65, 0], [0, 0, Math.PI / 2]);
  add(g, new THREE.BoxGeometry(3.4, 0.35, 0.02), std(0xffd23a, 0.5), [-0.6, 1.65, 0.92], [0, 0, 0], [1, 1, 1], false);
  add(g, new THREE.BoxGeometry(3.4, 0.35, 0.02), std(0xffd23a, 0.5), [-0.6, 1.65, -0.92], [0, 0, 0], [1, 1, 1], false);
  const wheels = [];
  for (const x of [2.6, -0.6, -2.0]) for (const s of [-1, 1]) {
    const w = add(g, new THREE.CylinderGeometry(0.42, 0.42, 0.3, 20), std(0x1a1a20, 0.7), [x, 0.42, 0.85 * s], [Math.PI / 2, 0, 0]);
    wheels.push(w);
  }
  return { g, wheels };
}

// ------------------------------------------------------------ petrol station
export const PUMP = V3(0, 0, 0);
export const A_ST = V3(2.3, 0, 1.1);
export const CAR_AT = V3(-0.4, 0, 2.2);
export function buildStation() {
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xd8e8f8, 40, 140);
  const sky = makeSky({ top: 0x3d86e0, mid: 0x7db8f4, horizon: 0xffe6c4, bottom: 0x8a8a8a });
  scene.add(sky);
  scene.add(new THREE.HemisphereLight(0xeaf4ff, 0x6a6a6a, 1.2));
  const sun = new THREE.DirectionalLight(0xfff0d8, 2.4);
  sun.position.set(10, 16, 12);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: 1, far: 60 });
  scene.add(sun, sun.target);
  add(scene, new THREE.PlaneGeometry(200, 200), std(0x6fae54, 0.95), [0, -0.01, 0], [-Math.PI / 2, 0, 0], [1, 1, 1], false).receiveShadow = true;
  add(scene, new THREE.PlaneGeometry(26, 16), std(0x7a7e88, 0.85), [0, 0.0, 1], [-Math.PI / 2, 0, 0], [1, 1, 1], false).receiveShadow = true;
  add(scene, new THREE.PlaneGeometry(120, 5), std(0x45484f, 0.85), [0, 0.005, 11.5], [-Math.PI / 2, 0, 0], [1, 1, 1], false).receiveShadow = true;
  for (let i = 0; i < 20; i++) add(scene, new THREE.PlaneGeometry(1.6, 0.2), std(0xffffff, 0.5), [-50 + i * 5.5, 0.01, 11.5], [-Math.PI / 2, 0, 0], [1, 1, 1], false);
  // canopy
  const red = std(0xe83a3a, 0.45);
  add(scene, new RoundedBoxGeometry(12, 0.7, 7, 2, 0.12), std(0xffffff, 0.5), [0, 5.0, 0.6]);
  add(scene, new THREE.BoxGeometry(12.06, 0.3, 7.06), red, [0, 4.85, 0.6]);
  for (const [x, z] of [[-4.5, -1.4], [4.5, -1.4], [-4.5, 2.6], [4.5, 2.6]]) add(scene, new THREE.CylinderGeometry(0.22, 0.22, 4.7, 16), std(0xf4f4f4, 0.5), [x, 2.35, z]);
  // pump islands
  const pumps = [];
  for (const x of [0, -6.5]) {
    const g = new THREE.Group();
    g.position.set(x, 0, 0);
    scene.add(g);
    add(g, new RoundedBoxGeometry(2.2, 0.25, 1.0, 2, 0.06), std(0xffd23a, 0.6), [0, 0.12, 0]);
    add(g, new RoundedBoxGeometry(1.0, 2.0, 0.7, 3, 0.1), std(0xffffff, 0.45), [0, 1.25, 0]);
    add(g, new RoundedBoxGeometry(1.02, 0.5, 0.72, 2, 0.08), red, [0, 2.05, 0]);
    add(g, new THREE.PlaneGeometry(0.6, 0.35), new THREE.MeshBasicMaterial({ color: 0x1a3a2a }), [0, 1.5, 0.36], [0, 0, 0], [1, 1, 1], false);
    add(g, new THREE.PlaneGeometry(0.5, 0.12), new THREE.MeshBasicMaterial({ color: 0x5aff8a }), [0, 1.55, 0.365], [0, 0, 0], [1, 1, 1], false);
    pumps.push(g);
  }
  // nozzle and hose for the front pump
  const nozzle = new THREE.Group();
  scene.add(nozzle);
  add(nozzle, new THREE.BoxGeometry(0.12, 0.3, 0.12), std(0x2a2a30, 0.5), [0, 0, 0]);
  add(nozzle, new THREE.CylinderGeometry(0.035, 0.035, 0.32, 10), std(0x8a909a, 0.3, { metalness: 0.6 }), [0.16, -0.08, 0], [0, 0, Math.PI / 2 + 0.4]);
  const hose = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V3(0, 1, 0), V3(0.5, 0.5, 0), V3(1, 1, 0)]), 30, 0.045, 8), std(0x1a1a20, 0.6));
  scene.add(hose);
  const setHose = (from, to) => {
    const mid = from.clone().lerp(to, 0.5);
    mid.y = Math.min(from.y, to.y) - 0.5;
    hose.geometry.dispose();
    hose.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([from, mid, to]), 40, 0.045, 8);
  };
  // car at the pump (front towards +x)
  const car = makeCar({ color: 0xff7a45, accent: 0xffd23a });
  car.scale.setScalar(0.62);
  car.position.copy(CAR_AT);
  scene.add(car);
  const tanker = makeTanker();
  tanker.g.scale.setScalar(0.9);
  scene.add(tanker.g);
  // the "dinosaur" (the dragon model without wings)
  const dino = makeDragon(0.85);
  dino.root.traverse((o) => {
    if (o.isMesh && o.geometry.type === 'ShapeGeometry') o.visible = false;
  });
  dino.root.visible = false;
  scene.add(dino.root);
  const aff = makeAffan();
  aff.root.scale.setScalar(0.55);
  scene.add(aff.root);
  return { scene, sky, pumps, nozzle, setHose, car, tanker, dino, aff };
}

// ------------------------------------------------------------- ancient sea
export function buildSea() {
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x1a6aa8, 8, 50);
  const sky = gradientSky(0x6ac8f0, 0x0a2a5a, -0.6, 0.8);
  scene.add(sky);
  scene.add(new THREE.HemisphereLight(0xbfefff, 0x0a3a6a, 1.4));
  const key = new THREE.DirectionalLight(0xe0f8ff, 1.2);
  key.position.set(2, 10, 4);
  scene.add(key);
  add(scene, new THREE.PlaneGeometry(200, 200), std(0xd8c08a, 0.95), [0, -3, 0], [-Math.PI / 2, 0, 0], [1, 1, 1], false);
  // light shafts
  const shaftMat = new THREE.MeshBasicMaterial({ color: 0xbfefff, transparent: true, opacity: 0.08, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const R = rng(450);
  for (let i = 0; i < 10; i++) add(scene, new THREE.PlaneGeometry(1.2 + R() * 1.5, 30), shaftMat, [(R() - 0.5) * 22, 8, -4 - R() * 10], [0, 0, (R() - 0.5) * 0.4], [1, 1, 1], false);
  // tiny plankton (sprites)
  const pMat = new THREE.SpriteMaterial({ map: glowTex, color: 0x9affc0, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending });
  const tiny = Array.from({ length: 220 }, () => {
    const s = new THREE.Sprite(pMat);
    s.userData = { x: (R() - 0.5) * 14, y: (R() - 0.2) * 9, z: (R() - 0.5) * 8 - 2, ph: R() * 6, sz: 0.06 + R() * 0.1 };
    scene.add(s);
    return s;
  });
  // a few big cute plankton (diatom discs and star shapes with faces)
  const big = [];
  const cols = [0x7affb0, 0xffe46a, 0x8ad8ff, 0xffa0d0];
  for (let i = 0; i < 4; i++) {
    const g = new THREE.Group();
    const m = std(cols[i], 0.3, { emissive: cols[i], emissiveIntensity: 0.4, transparent: true, opacity: 0.9 });
    if (i % 2 === 0) {
      add(g, new THREE.CylinderGeometry(0.5, 0.5, 0.18, 24), m, [0, 0, 0], [Math.PI / 2, 0, 0]);
      add(g, new THREE.TorusGeometry(0.42, 0.04, 8, 32), std(0xffffff, 0.3, { transparent: true, opacity: 0.8 }), [0, 0, 0.1], [0, 0, 0], [1, 1, 1], false);
    } else {
      for (let k = 0; k < 5; k++) add(g, new THREE.CapsuleGeometry(0.1, 0.5, 6, 10), m, [Math.cos((k / 5) * Math.PI * 2) * 0.3, Math.sin((k / 5) * Math.PI * 2) * 0.3, 0], [0, 0, (k / 5) * Math.PI * 2 - Math.PI / 2]);
      add(g, new THREE.SphereGeometry(0.22, 16, 12), m, [0, 0, 0]);
    }
    for (const s of [-1, 1]) {
      add(g, new THREE.SphereGeometry(0.06, 10, 8), std(0xffffff, 0.3), [0.12 * s, 0.06, 0.2], [0, 0, 0], [1, 1, 1], false);
      add(g, new THREE.SphereGeometry(0.03, 8, 6), new THREE.MeshBasicMaterial({ color: 0x101010 }), [0.12 * s, 0.06, 0.25], [0, 0, 0], [1, 1, 1], false);
    }
    add(g, new THREE.TorusGeometry(0.06, 0.015, 6, 12, Math.PI), new THREE.MeshBasicMaterial({ color: 0x101010 }), [0, -0.06, 0.22], [0, 0, Math.PI], [1, 1, 1], false);
    g.position.set(-1.8 + i * 1.2, 1.0 + (i % 2) * 0.9, 1.5);
    scene.add(g);
    big.push(g);
  }
  return { scene, sky, tiny, big, pMat };
}

// ------------------------------------------------------------ earth layers
export const TANK = { w: 9, h: 13, d: 2.6 };
export const FLOOR_Y = 4.0; // top of the bottom layers at the start
export function buildLayers() {
  const scene = new THREE.Scene();
  const sky = gradientSky(0x2a2f5a, 0x14182e);
  scene.add(sky);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x404060, 1.2));
  const key = new THREE.DirectionalLight(0xffffff, 1.4);
  key.position.set(3, 10, 12);
  scene.add(key);
  // glass tank frame
  const glass = new THREE.MeshPhysicalMaterial({ color: 0xdff0ff, roughness: 0.05, transparent: true, opacity: 0.12, depthWrite: false, side: THREE.DoubleSide });
  add(scene, new THREE.BoxGeometry(TANK.w, TANK.h, TANK.d), glass, [0, TANK.h / 2, 0], [0, 0, 0], [1, 1, 1], false).renderOrder = 8;
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(TANK.w, TANK.h, TANK.d)), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6 }));
  edges.position.y = TANK.h / 2;
  scene.add(edges);
  add(scene, new THREE.BoxGeometry(TANK.w + 1, 0.4, TANK.d + 1), std(0x3a3f5a, 0.6), [0, -0.2, 0]);
  // bottom rock (old seabed) and the plankton layer that becomes oil
  const W2 = TANK.w - 0.1, D2 = TANK.d - 0.1;
  add(scene, new THREE.BoxGeometry(W2, 3.4, D2), std(0x6a6058, 0.9), [0, 1.7, 0]);
  const orgMat = std(0x4a6a3a, 0.6, { emissive: 0x0a2a0a, emissiveIntensity: 0.3 });
  const org = add(scene, new THREE.BoxGeometry(W2, 0.6, D2), orgMat, [0, 3.7, 0]);
  // oil blobs in the layer (glossy black), hidden until oil forms
  const oilMat = std(OIL, 0.12, { metalness: 0.3 });
  const blobs = [];
  for (let i = 0; i < 7; i++) {
    const b = add(scene, new THREE.SphereGeometry(0.6, 20, 14), oilMat, [-3.4 + i * 1.15, 3.7, D2 / 2 - 0.25], [0, 0, 0], [1.2, 0.45, 0.4], false);
    b.visible = false;
    blobs.push(b);
  }
  // layers that pile on: mud (brown), sand (tan), rock (grey), rock (dark)
  const layerCols = [0x8a5a36, 0xc8a46a, 0x8a8a90, 0x5a5a66];
  const layers = layerCols.map((c, i) => {
    const m = add(scene, new THREE.BoxGeometry(W2, 1, D2), std(c, 0.9), [0, 0, 0]);
    m.visible = false;
    m.userData.h = [1.0, 0.8, 1.1, 1.2][i];
    return m;
  });
  // sea water on top
  const waterMat = new THREE.MeshPhysicalMaterial({ color: 0x3a9ad8, roughness: 0.1, transparent: true, opacity: 0.35, depthWrite: false });
  const water = add(scene, new THREE.BoxGeometry(W2, 1, D2), waterMat, [0, 0, 0], [0, 0, 0], [1, 1, 1], false);
  water.renderOrder = 6;
  // sinking plankton specks
  const sMat = new THREE.SpriteMaterial({ map: glowTex, color: 0x9affc0, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending });
  const R = rng(451);
  const specks = Array.from({ length: 70 }, () => {
    const s = new THREE.Sprite(sMat);
    s.userData = { x: (R() - 0.5) * (TANK.w - 1), z: (R() - 0.5) * (TANK.d - 0.6), ph: R(), sp: 0.5 + R() * 0.5 };
    s.scale.setScalar(0.22);
    scene.add(s);
    return s;
  });
  // heat glow under the tank
  const heat = Array.from({ length: 5 }, (_, i) => {
    const h = glow(0xff5a1a, 4, 0);
    h.position.set(-3.6 + i * 1.8, 0.6, D2 / 2 + 0.3);
    scene.add(h);
    return h;
  });
  return { scene, sky, org, orgMat, blobs, layers, water, specks, heat };
}

// ------------------------------------------------------------------ oil rig
export const SEA_Y = 0;
export const SEABED_Y = -9;
export const POCKET = V3(0, -15, 0);
export function buildRig() {
  const scene = new THREE.Scene();
  const sky = makeSky({ top: 0x3d86e0, mid: 0x8ac2f4, horizon: 0xfff0d8, bottom: 0x1a5a9a });
  scene.add(sky);
  scene.add(new THREE.HemisphereLight(0xeaf4ff, 0x2a5a8a, 1.2));
  const sun = new THREE.DirectionalLight(0xfff0d8, 2.2);
  sun.position.set(10, 16, 12);
  scene.add(sun);
  // sea surface (seen from above and as a thin slab in the cutaway)
  const seaTop = add(scene, new THREE.PlaneGeometry(400, 400), std(0x2f8ad8, 0.25, { metalness: 0.2, transparent: true, opacity: 0.85 }), [0, SEA_Y, 0], [-Math.PI / 2, 0, 0], [1, 1, 1], false);
  void seaTop;
  // cutaway block below the rig: water, seabed layers, oil pocket
  const cut = new THREE.Group();
  scene.add(cut);
  const D = 6;
  add(cut, new THREE.BoxGeometry(14, -SEABED_Y, D), new THREE.MeshPhysicalMaterial({ color: 0x2a7ac8, roughness: 0.1, transparent: true, opacity: 0.45, depthWrite: false }), [0, SEABED_Y / 2, 0], [0, 0, 0], [1, 1, 1], false).renderOrder = 4;
  const lay = [[0x8a5a36, 2], [0xc8a46a, 1.6], [0x8a8a90, 2.2], [0x5a5a66, 3.2], [0x4a4450, 3]];
  let y = SEABED_Y;
  for (const [c, h] of lay) {
    add(cut, new THREE.BoxGeometry(14, h, D), std(c, 0.9), [0, y - h / 2, 0]);
    y -= h;
  }
  const pocket = add(cut, new THREE.SphereGeometry(3, 32, 20), std(OIL, 0.12, { metalness: 0.3 }), POCKET.toArray(), [0, 0, 0], [1.6, 0.55, 0.7]);
  void pocket;
  // the rig: legs, deck, derrick
  const rig = new THREE.Group();
  scene.add(rig);
  const steel = std(0xe8a02a, 0.5, { metalness: 0.2 });
  const grey = std(0xb0b6c0, 0.4, { metalness: 0.3 });
  for (const [x, z] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) add(rig, new THREE.CylinderGeometry(0.28, 0.32, -SEABED_Y + 3.5, 12), steel, [x, (SEABED_Y + 3.5) / 2, z]);
  add(rig, new THREE.BoxGeometry(6.2, 0.6, 6.2), grey, [0, 3.6, 0]);
  add(rig, new THREE.BoxGeometry(2.2, 1.2, 2.0), std(0xffffff, 0.5), [-1.6, 4.5, -1.6]);
  add(rig, new THREE.CylinderGeometry(0.6, 0.6, 1.4, 16), std(0xff5a3a, 0.5), [1.8, 4.6, 1.6]);
  add(rig, new THREE.CylinderGeometry(0.6, 0.6, 1.4, 16), std(0xff5a3a, 0.5), [1.8, 4.6, 0.1]);
  // derrick (lattice tower)
  const der = new THREE.Group();
  der.position.set(0, 3.9, 0);
  rig.add(der);
  const dh = 7.5;
  for (const [x, z] of [[-0.9, -0.9], [0.9, -0.9], [-0.9, 0.9], [0.9, 0.9]]) {
    const leg = add(der, new THREE.CylinderGeometry(0.07, 0.07, dh, 8), steel, [x * 0.55, dh / 2, z * 0.55]);
    leg.rotation.set(-z * 0.06, 0, x * 0.06);
  }
  for (let i = 1; i < 7; i++) {
    const yy = i * dh / 7, s = 1 - (yy / dh) * 0.45;
    for (const r of [0, Math.PI / 2]) add(der, new THREE.BoxGeometry(1.8 * s, 0.06, 0.06), steel, [0, yy, 0], [0, r, 0]);
  }
  add(der, new THREE.SphereGeometry(0.16, 12, 10), new THREE.MeshBasicMaterial({ color: 0xff3a3a }), [0, dh + 0.1, 0], [0, 0, 0], [1, 1, 1], false);
  // drill pipe (rod that grows down)
  const pipe = new THREE.Mesh(rodGeo, std(0x9aa0aa, 0.3, { metalness: 0.6 }));
  scene.add(pipe);
  // crude coming up (black drops)
  const drops = Array.from({ length: 16 }, () => {
    const d = add(scene, new THREE.SphereGeometry(0.16, 12, 10), std(OIL, 0.12, { metalness: 0.3 }), [0, 0, 0], [0, 0, 0], [1, 1.3, 1], false);
    d.visible = false;
    return d;
  });
  // two small rigs far away
  const far = [];
  for (const [x, z] of [[-12, -38], [22, -48]]) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    scene.add(g);
    add(g, new THREE.BoxGeometry(6, 0.6, 6), grey, [0, 3.6, 0]);
    for (const [a, b] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) add(g, new THREE.CylinderGeometry(0.3, 0.3, 3.6, 8), steel, [a, 1.8, b]);
    add(g, new THREE.CylinderGeometry(0.5, 1.2, 7, 4), steel, [0, 7.5, 0]);
    far.push(g);
  }
  return { scene, sky, cut, rig, pipe, drops, far };
}

// --------------------------------------------------------------- refinery
export const TOWER_H = 12;
export const CUTS = [
  { name: 'GAS', color: 0x9adfff, y: 11.0 },
  { name: 'PETROL', color: 0xffd23a, y: 8.9 },
  { name: 'MINYAK KAPAL TERBANG', color: 0x7ad85a, y: 6.8 },
  { name: 'DIESEL', color: 0xff9a3d, y: 4.7 },
  { name: 'TAR', color: 0x2a2420, y: 2.4 },
];
export function buildRefinery() {
  const scene = new THREE.Scene();
  const sky = makeSky({ top: 0x3d86e0, mid: 0x8ac2f4, horizon: 0xffe8c8, bottom: 0x8a8a7a });
  scene.add(sky);
  scene.add(new THREE.HemisphereLight(0xeaf4ff, 0x6a6a6a, 1.3));
  const sun = new THREE.DirectionalLight(0xfff0d8, 2.0);
  sun.position.set(8, 16, 14);
  scene.add(sun);
  add(scene, new THREE.CircleGeometry(60, 48), std(0x9a9a92, 0.9), [0, 0, 0], [-Math.PI / 2, 0, 0], [1, 1, 1], false);
  // see-through tower with trays
  const tower = add(scene, new THREE.CylinderGeometry(1.6, 1.6, TOWER_H, 40, 1, true), new THREE.MeshPhysicalMaterial({ color: 0xe8f4ff, roughness: 0.05, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide }), [0, TOWER_H / 2 + 0.8, 0], [0, 0, 0], [1, 1, 1], false);
  tower.renderOrder = 7;
  add(scene, new THREE.SphereGeometry(1.6, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), std(0xd8dde6, 0.3, { metalness: 0.5 }), [0, TOWER_H + 0.8, 0]);
  add(scene, new THREE.CylinderGeometry(1.7, 1.9, 0.8, 32), std(0x6a6e78, 0.5), [0, 0.4, 0]);
  const trays = [];
  CUTS.forEach((c) => {
    add(scene, new THREE.CylinderGeometry(1.55, 1.55, 0.08, 32), std(0xb0b6c0, 0.4, { metalness: 0.4 }), [0, c.y - 0.45, 0]);
    const liq = add(scene, new THREE.CylinderGeometry(1.5, 1.5, 0.3, 32), std(c.color, 0.2, { emissive: c.color, emissiveIntensity: 0.25, transparent: true, opacity: 0.9 }), [0, c.y - 0.25, 0], [0, 0, 0], [1, 1, 1], false);
    liq.scale.y = 0.001;
    trays.push(liq);
  });
  // outlet pipes to the right, with tanks
  const tanks = [];
  CUTS.forEach((c, i) => {
    add(scene, new THREE.CylinderGeometry(0.16, 0.16, 3.2, 12), std(0xc0c6d0, 0.3, { metalness: 0.5 }), [3.2, c.y - 0.25, 0], [0, 0, Math.PI / 2]);
    const tk = add(scene, new THREE.CylinderGeometry(0.55, 0.55, 1.0, 24), std(c.color, 0.3, { emissive: c.color, emissiveIntensity: 0.15 }), [5.3, c.y - 0.25, 0]);
    tanks.push(tk);
    void i;
  });
  // furnace and crude inlet (left)
  add(scene, new RoundedBoxGeometry(2.6, 1.6, 2.2, 3, 0.2), std(0x5a5e68, 0.6), [-3.6, 0.8, 0]);
  add(scene, new THREE.CylinderGeometry(0.22, 0.22, 2.2, 12), std(0x2a2420, 0.4), [-2.0, 1.4, 0], [0, 0, Math.PI / 2]);
  const flames = [];
  for (let i = 0; i < 4; i++) {
    const f = add(scene, new THREE.ConeGeometry(0.22, 0.8, 12), new THREE.MeshBasicMaterial({ color: i % 2 ? 0xffb020 : 0xff5a1a, transparent: true, opacity: 0.9 }), [-4.4 + i * 0.5, 1.9, 0.9], [0, 0, 0], [1, 1, 1], false);
    flames.push(f);
  }
  const fireGlow = glow(0xff7a2a, 4, 0.6);
  fireGlow.position.set(-3.6, 1.9, 1.2);
  scene.add(fireGlow);
  // crude drops along the inlet, vapour bubbles inside, product drops in the pipes
  const mk = (n, color, r, extra = {}) => Array.from({ length: n }, () => {
    const d = add(scene, new THREE.SphereGeometry(r, 12, 10), std(color, 0.2, extra), [0, 0, 0], [0, 0, 0], [1, 1, 1], false);
    d.visible = false;
    return d;
  });
  const crude = mk(8, OIL, 0.16, { metalness: 0.3 });
  const vMat = new THREE.SpriteMaterial({ map: glowTex, color: 0xffffff, transparent: true, opacity: 0.6, depthWrite: false });
  const vapour = Array.from({ length: 40 }, () => {
    const s = new THREE.Sprite(vMat.clone());
    s.visible = false;
    scene.add(s);
    return s;
  });
  const out = CUTS.map((c) => mk(4, c.color, 0.13, { emissive: c.color, emissiveIntensity: 0.3 }));
  return { scene, sky, trays, tanks, flames, fireGlow, crude, vapour, out };
}
