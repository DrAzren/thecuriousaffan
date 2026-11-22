// Episode 056 sets:
//  - the Episode 038 kitchen with Mama: a countertop water filter with a
//    spout, a glass of yellowish tap water and a glass that fills with clear
//    filtered water; an old (brown) and a new (white) filter cartridge;
//  - inside the filter: a tall see-through cartridge with layers (pleated
//    sediment filter, black activated-carbon granules, a blue membrane, and a
//    UV chamber), with sand, rust, dirt, smell molecules and germs that get
//    caught at each layer while clean water drips through;
//  - close-ups: a carbon granule full of tiny pores that grabs molecules,
//    and a membrane sheet whose holes let water through but not germs;
//  - a little water treatment plant: river, settling tank, sand filter,
//    chlorine, water tower and pipes to a house;
//  - the branded outro stage from Episode 005.
import * as THREE from 'three';
import { rng } from '../../shared/core.js';
import { add, glow, glowTex } from '../../shared/props.js';
import { buildOutro, RoundedBoxGeometry } from '../005-bulan-ikut-kereta/worlds.js';
import { buildKitchen, ISLAND_TOP } from '../038-bawang-menangis/worlds.js';

export { buildOutro };

const std = (color, rough = 0.7, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0, ...extra });
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const glassM = () => new THREE.MeshPhysicalMaterial({ color: 0xe8f6ff, roughness: 0.05, transparent: true, opacity: 0.28, depthWrite: false, side: THREE.DoubleSide });

function gradientSky(top, bot) {
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: { top: { value: new THREE.Color(top) }, bot: { value: new THREE.Color(bot) } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `uniform vec3 top, bot; varying vec3 vP;
      void main(){ gl_FragColor = vec4(mix(bot, top, smoothstep(-0.4, 0.7, vP.y)), 1.0);
        #include <colorspace_fragment>
      }`,
  });
  const m = new THREE.Mesh(new THREE.SphereGeometry(300, 32, 16), mat);
  m.renderOrder = -10;
  return m;
}

// a cute germ: a bumpy green ball with eyes
export function makeGerm(color = 0x7ad84a) {
  const g = new THREE.Group();
  const m = std(color, 0.6, { emissive: color, emissiveIntensity: 0.15 });
  add(g, new THREE.SphereGeometry(0.25, 16, 12), m, [0, 0, 0], [0, 0, 0], [1, 1, 1], false);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    add(g, new THREE.SphereGeometry(0.07, 8, 6), m, [Math.cos(a) * 0.26, Math.sin(a) * 0.26, 0], [0, 0, 0], [1, 1, 1], false);
  }
  const eyeW = std(0xffffff, 0.3), eyeB = std(0x111118, 0.3);
  const pupils = [];
  for (const x of [-0.08, 0.08]) {
    add(g, new THREE.SphereGeometry(0.07, 10, 8), eyeW, [x, 0.05, 0.2], [0, 0, 0], [1, 1, 1], false);
    pupils.push(add(g, new THREE.SphereGeometry(0.035, 8, 6), eyeB, [x, 0.05, 0.27], [0, 0, 0], [1, 1, 1], false));
  }
  g.userData = { m, pupils };
  return g;
}

// ---------------------------------------------------------------- kitchen
export const FILTER_AT = V3(0.55, ISLAND_TOP, -1.0);
export function buildKitchen56() {
  const k = buildKitchen();
  for (const o of [k.onion, k.knife, k.shine, k.coldOnion, ...k.pieces, ...k.tears]) if (o) o.visible = false;
  const s = k.scene;
  // countertop filter
  const f = new THREE.Group();
  f.position.copy(FILTER_AT);
  s.add(f);
  add(f, new RoundedBoxGeometry(0.42, 0.06, 0.36, 2, 0.02), std(0xe8ecf2, 0.4), [0, 0.03, 0]);
  add(f, new THREE.CylinderGeometry(0.15, 0.15, 0.62, 24), glassM(), [0, 0.37, 0], [0, 0, 0], [1, 1, 1], false);
  const layerCols = [0xf6f6f0, 0x2a2a30, 0x6ab8ff, 0xb89aff];
  layerCols.forEach((c, i) => add(f, new THREE.CylinderGeometry(0.12, 0.12, 0.12, 20), std(c, 0.6), [0, 0.6 - i * 0.14, 0], [0, 0, 0], [1, 1, 1], false));
  add(f, new THREE.CylinderGeometry(0.16, 0.16, 0.05, 24), std(0x2f6fff, 0.4), [0, 0.7, 0]);
  const chrome = std(0xc8ccd4, 0.2, { metalness: 0.7 });
  add(f, new THREE.CylinderGeometry(0.025, 0.025, 0.28, 10), chrome, [0.17, 0.42, 0], [0, 0, Math.PI / 2], [1, 1, 1], false);
  add(f, new THREE.CylinderGeometry(0.03, 0.022, 0.08, 10), chrome, [0.3, 0.39, 0], [0, 0, 0], [1, 1, 1], false);
  // glasses: yellowish tap water and clear filtered water
  const mkGlass = (x, z, col) => {
    const g = new THREE.Group();
    g.position.set(FILTER_AT.x + x, ISLAND_TOP, FILTER_AT.z + z);
    s.add(g);
    add(g, new THREE.CylinderGeometry(0.09, 0.08, 0.24, 20, 1, true), glassM(), [0, 0.12, 0], [0, 0, 0], [1, 1, 1], false);
    const water = add(g, new THREE.CylinderGeometry(0.083, 0.077, 0.2, 20), new THREE.MeshPhysicalMaterial({ color: col, roughness: 0.1, transparent: true, opacity: 0.7 }), [0, 0.1, 0], [0, 0, 0], [1, 1, 1], false);
    return { g, water };
  };
  const dirty = mkGlass(-0.42, 0.18, 0xd8b84a);
  const clean = mkGlass(0.3, 0, 0x9ad8ff);
  const stream = add(s, new THREE.CylinderGeometry(0.014, 0.014, 1, 8), new THREE.MeshPhysicalMaterial({ color: 0xbfe8ff, roughness: 0.05, transparent: true, opacity: 0.8 }), [FILTER_AT.x + 0.3, ISLAND_TOP + 0.3, FILTER_AT.z], [0, 0, 0], [1, 1, 1], false);
  // cartridges for the ending, shown in Affan's hands
  const mkCart = (col) => {
    const g = new THREE.Group();
    add(g, new THREE.CylinderGeometry(0.1, 0.1, 0.4, 16), std(col, 0.7), [0, 0, 0], [0, 0, 0], [1, 1, 1], false);
    add(g, new THREE.CylinderGeometry(0.105, 0.105, 0.05, 16), std(0x2f6fff, 0.4), [0, 0.2, 0], [0, 0, 0], [1, 1, 1], false);
    return g;
  };
  const oldC = mkCart(0x8a6a3a);
  const newC = mkCart(0xf6f6f6);
  for (const c of [oldC, newC]) {
    c.scale.setScalar(0.7);
    c.visible = false;
    s.add(c);
  }
  return { ...k, filter: f, dirty, clean, stream, oldC, newC };
}

// ---------------------------------------------------------- filter inside
export const LAYERS = { sed: 6.0, carb: 2.5, mem: -1.0, uv: -4.2 };
export const CARB_AT = V3(14, 0, 0);
export const MEM_AT = V3(28, 0, 0);
export function buildFilter() {
  const scene = new THREE.Scene();
  const sky = gradientSky(0x2a6ab0, 0x0a2a5a);
  scene.add(sky);
  scene.add(new THREE.HemisphereLight(0xe0f4ff, 0x1a2a4a, 1.3));
  const key = new THREE.DirectionalLight(0xffffff, 1.3);
  key.position.set(3, 8, 10);
  scene.add(key);
  const R = rng(5600);
  // the cartridge: a glass tube with layers
  add(scene, new THREE.CylinderGeometry(2.4, 2.4, 14.5, 40, 1, true), glassM(), [0, 1.0, 0], [0, 0, 0], [1, 1, 1], false);
  // sediment: pleated white sheet
  const pleat = new THREE.Group();
  pleat.position.set(0, LAYERS.sed, 0);
  scene.add(pleat);
  for (let i = 0; i < 18; i++) add(pleat, new THREE.BoxGeometry(0.08, 0.9, 4.4), std(0xf6f2e8, 0.8), [-2.1 + i * 0.25, 0, 0], [0, 0, (i % 2 ? 1 : -1) * 0.35], [1, 1, 1], false);
  // carbon: black granules
  const carb = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(0.22, 0), std(0x2a2a30, 0.9, { flatShading: true }), 260);
  const m4 = new THREE.Matrix4();
  for (let i = 0; i < 260; i++) {
    const a = R() * Math.PI * 2, r = Math.sqrt(R()) * 2.2;
    m4.compose(V3(Math.cos(a) * r, LAYERS.carb + (R() - 0.5) * 1.6, Math.sin(a) * r), new THREE.Quaternion().setFromEuler(new THREE.Euler(R() * 3, R() * 3, R() * 3)), V3(1, 1, 1).multiplyScalar(0.8 + R() * 0.6));
    carb.setMatrixAt(i, m4);
  }
  scene.add(carb);
  // membrane: blue fibre bundle
  for (let i = 0; i < 40; i++) {
    const a = R() * Math.PI * 2, r = Math.sqrt(R()) * 2.2;
    add(scene, new THREE.CylinderGeometry(0.05, 0.05, 1.4, 6), std(0x6ab8ff, 0.4, { emissive: 0x1a4a8a, emissiveIntensity: 0.3 }), [Math.cos(a) * r, LAYERS.mem, Math.sin(a) * r], [0, 0, 0], [1, 1, 1], false);
  }
  // UV chamber: a glowing purple lamp
  const uvLamp = add(scene, new THREE.CylinderGeometry(0.22, 0.22, 2.0, 16), new THREE.MeshBasicMaterial({ color: 0xc89aff }), [0, LAYERS.uv, 0], [0, 0, Math.PI / 2], [1, 1, 1], false);
  const uvGlow = glow(0xa070ff, 4.5, 0.8);
  uvGlow.position.set(0, LAYERS.uv, 0.3);
  scene.add(uvGlow);
  // particles: water drops, dirt, smell molecules, germs
  const waterMat = new THREE.SpriteMaterial({ map: glowTex, color: 0x9ae0ff, transparent: true, opacity: 0.9, depthWrite: false });
  const drops = Array.from({ length: 60 }, () => {
    const s = new THREE.Sprite(waterMat);
    s.userData = { x: (R() - 0.5) * 3.8, z: (R() - 0.5) * 2, ph: R() };
    scene.add(s);
    return s;
  });
  const dirtCols = [0xd8b84a, 0xc8602a, 0x7a5a3a];
  const dirt = Array.from({ length: 30 }, (_, i) => {
    const m = add(scene, new THREE.DodecahedronGeometry(0.12 + R() * 0.08, 0), std(dirtCols[i % 3], 0.9), [0, 0, 0], [0, 0, 0], [1, 1, 1], false);
    m.userData = { kind: i % 3, x: (R() - 0.5) * 3.8, z: (R() - 0.5) * 2, ph: R() };
    return m;
  });
  const molCols = [0xff7ad8, 0xb87aff, 0xffb347];
  const mols = Array.from({ length: 24 }, (_, i) => {
    const g = new THREE.Group();
    const mm = std(molCols[i % 3], 0.4, { emissive: molCols[i % 3], emissiveIntensity: 0.3 });
    add(g, new THREE.SphereGeometry(0.1, 10, 8), mm, [0, 0, 0], [0, 0, 0], [1, 1, 1], false);
    add(g, new THREE.SphereGeometry(0.07, 8, 6), mm, [0.13, 0.05, 0], [0, 0, 0], [1, 1, 1], false);
    add(g, new THREE.SphereGeometry(0.07, 8, 6), mm, [-0.1, 0.09, 0], [0, 0, 0], [1, 1, 1], false);
    g.userData = { kind: i % 3, x: (R() - 0.5) * 3.8, z: (R() - 0.5) * 2, ph: R() };
    scene.add(g);
    return g;
  });
  const germs = Array.from({ length: 10 }, (_, i) => {
    const g = makeGerm(i % 2 ? 0x7ad84a : 0x5ac88a);
    g.userData.x = -1.6 + (i % 5) * 0.8;
    g.userData.ph = i * 0.13;
    g.scale.setScalar(0.9);
    scene.add(g);
    return g;
  });
  // carbon close-up: a big porous granule
  const gran = new THREE.Group();
  gran.position.copy(CARB_AT);
  scene.add(gran);
  const gg = new THREE.IcosahedronGeometry(2.4, 3);
  const gp = gg.attributes.position;
  for (let i = 0; i < gp.count; i++) {
    const v = V3(gp.getX(i), gp.getY(i), gp.getZ(i));
    const n = 1 + 0.12 * Math.sin(v.x * 3.1) * Math.sin(v.y * 2.7 + 1) * Math.sin(v.z * 3.3 + 2);
    v.multiplyScalar(n);
    gp.setXYZ(i, v.x, v.y, v.z);
  }
  gg.computeVertexNormals();
  add(gran, gg, std(0x34343c, 0.85, { flatShading: true }));
  const pores = [];
  for (let i = 0; i < 46; i++) {
    const d = V3(R() - 0.5, R() - 0.5, R() - 0.2).normalize();
    const p = add(gran, new THREE.CircleGeometry(0.16 + R() * 0.14, 14), new THREE.MeshBasicMaterial({ color: 0x0a0a10 }), d.clone().multiplyScalar(2.42).toArray(), [0, 0, 0], [1, 1, 1], false);
    p.lookAt(gran.position.clone().add(d.clone().multiplyScalar(5)));
    pores.push(d);
  }
  const stuck = Array.from({ length: 18 }, (_, i) => {
    const g = mols[i % mols.length].clone();
    g.userData = { d: pores[(i * 3) % pores.length].clone(), ph: R(), from: V3((R() - 0.5) * 10, 6 + R() * 3, (R() - 0.5) * 4 + 2) };
    scene.add(g);
    return g;
  });
  // membrane close-up: a sheet with holes, water passes, germs bounce
  const holeTex = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 512;
    const g = c.getContext('2d');
    g.fillStyle = '#5aa8f0';
    g.fillRect(0, 0, 512, 512);
    g.globalCompositeOperation = 'destination-out';
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
      g.beginPath();
      g.arc(32 + x * 64 + (y % 2) * 16, 32 + y * 64, 12, 0, Math.PI * 2);
      g.fill();
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  })();
  add(scene, new THREE.PlaneGeometry(9, 9), new THREE.MeshStandardMaterial({ map: holeTex, transparent: true, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.5 }), [MEM_AT.x, MEM_AT.y, MEM_AT.z], [-Math.PI / 2 + 0.25, 0, 0], [1, 1, 1], false);
  const h2o = Array.from({ length: 30 }, () => {
    const s = new THREE.Sprite(waterMat);
    s.userData = { x: (R() - 0.5) * 6, z: (R() - 0.5) * 3, ph: R() };
    scene.add(s);
    return s;
  });
  const mGerms = Array.from({ length: 6 }, (_, i) => {
    const g = makeGerm(0x7ad84a);
    g.userData.x = -2.5 + i;
    g.userData.ph = i * 0.17;
    g.scale.setScalar(1.6);
    scene.add(g);
    return g;
  });
  return { scene, sky, uvLamp, uvGlow, drops, dirt, mols, germs, gran, stuck, h2o, mGerms };
}

// --------------------------------------------------------- treatment plant
export function buildPlant() {
  const scene = new THREE.Scene();
  const sky = gradientSky(0x4a9ae8, 0xe8f4ff);
  scene.add(sky);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x5a7a4a, 1.3));
  const key = new THREE.DirectionalLight(0xfff4e0, 1.5);
  key.position.set(6, 12, 10);
  scene.add(key);
  add(scene, new THREE.CircleGeometry(60, 48), std(0x6ab84a, 0.95), [0, 0, 0], [-Math.PI / 2, 0, 0], [1, 1, 1], false);
  const riverM = std(0x8a7a4a, 0.3, { transparent: true, opacity: 0.9 });
  add(scene, new THREE.PlaneGeometry(4, 40), riverM, [-9, 0.02, 0], [-Math.PI / 2, 0, 0], [1, 1, 1], false);
  const concrete = std(0xc8ccd4, 0.7);
  const tanks = [];
  const tank = (x, label, col) => {
    const g = new THREE.Group();
    g.position.set(x, 0, 0);
    scene.add(g);
    add(g, new THREE.CylinderGeometry(1.4, 1.4, 1.2, 28, 1, true), concrete, [0, 0.6, 0], [0, 0, 0], [1, 1, 1], true).material.side = THREE.DoubleSide;
    const w = add(g, new THREE.CircleGeometry(1.35, 28), std(col, 0.2, { transparent: true, opacity: 0.9 }), [0, 1.0, 0], [-Math.PI / 2, 0, 0], [1, 1, 1], false);
    tanks.push({ g, w, label });
    return g;
  };
  tank(-5, 'MENDAPAN', 0xa8946a);
  tank(-1.5, 'PENAPIS PASIR', 0x7ab8c8);
  tank(2, 'KLORIN', 0x8ad0ff);
  const towerG = new THREE.Group();
  towerG.position.set(5.5, 0, -1);
  scene.add(towerG);
  add(towerG, new THREE.CylinderGeometry(0.25, 0.3, 4, 10), concrete, [0, 2, 0]);
  add(towerG, new THREE.SphereGeometry(1.2, 20, 14), std(0x5aa8f0, 0.4), [0, 4.6, 0], [0, 0, 0], [1, 0.8, 1]);
  const house = new THREE.Group();
  house.position.set(8.5, 0, 1.5);
  scene.add(house);
  add(house, new THREE.BoxGeometry(1.6, 1.2, 1.4), std(0xfff0d8, 0.7), [0, 0.6, 0]);
  add(house, new THREE.ConeGeometry(1.3, 0.8, 4), std(0xd8584a, 0.6), [0, 1.6, 0], [0, Math.PI / 4, 0]);
  const pipeM = std(0x6a7488, 0.4);
  const path = [V3(-9, 0.4, 0), V3(-5, 0.4, 0), V3(-1.5, 0.4, 0), V3(2, 0.4, 0), V3(5.5, 0.4, -1), V3(5.5, 4, -1), V3(7, 3, 0.5), V3(8.5, 0.6, 1.5)];
  const curve = new THREE.CatmullRomCurve3(path, false, 'catmullrom', 0.1);
  add(scene, new THREE.TubeGeometry(curve, 120, 0.12, 8), pipeM, [0, 0, 0], [0, 0, 0], [1, 1, 1], false);
  const flowMat = new THREE.SpriteMaterial({ map: glowTex, color: 0x9ae0ff, transparent: true, opacity: 0.95, depthWrite: false });
  const flow = Array.from({ length: 30 }, (_, i) => {
    const s = new THREE.Sprite(flowMat);
    s.scale.setScalar(0.35);
    s.userData.ph = i / 30;
    scene.add(s);
    return s;
  });
  return { scene, sky, tanks, curve, flow, house, towerG };
}
