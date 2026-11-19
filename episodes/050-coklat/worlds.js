// Episode 050 sets:
//  - the Episode 038 kitchen with Mama; Affan on his stool with a chocolate
//    bar (and later a toothbrush) in his hands;
//  - a cocoa farm: cocoa trees with ribbed pods growing straight out of the
//    trunk and big branches, shade trees, and a wooden table with a pod that
//    splits open to show white, pulp-covered beans;
//  - a chocolate "factory line" with seven stations along x: a fermenting
//    crate under banana leaves, a drying mat in the sun, a roasting drum,
//    a sheller, a roller grinder with a stream of liquid chocolate, a mixer
//    (sugar, milk, cocoa butter) with a turning paddle, and a moulding tray
//    with a cold-air cooler;
//  - the branded outro stage from Episode 005.
import * as THREE from 'three';
import { rng } from '../../shared/core.js';
import { makeAffan } from '../../shared/affan.js';
import { add, glow, glowTex, makeTree } from '../../shared/props.js';
import { buildOutro, RoundedBoxGeometry } from '../005-bulan-ikut-kereta/worlds.js';
import { buildKitchen } from '../038-bawang-menangis/worlds.js';

export { buildOutro };

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
      void main(){ gl_FragColor = vec4(mix(bot, top, smoothstep(-0.2, 0.6, vP.y)), 1.0);
        #include <colorspace_fragment>
      }`,
  });
  const m = new THREE.Mesh(new THREE.SphereGeometry(400, 32, 16), mat);
  m.renderOrder = -10;
  return m;
}

export const CHOC = 0x5a3220;
const chocMat = () => std(CHOC, 0.35, { emissive: 0x1a0a04, emissiveIntensity: 0.2 });

// a chocolate bar: 2 x 4 squares, half wrapped in foil and paper; long axis x
export function makeBar(s = 1) {
  const g = new THREE.Group();
  const cm = chocMat();
  add(g, new THREE.BoxGeometry(0.62, 0.05, 0.3), cm, [0, 0, 0], [0, 0, 0], [1, 1, 1], false);
  for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) add(g, new RoundedBoxGeometry(0.14, 0.04, 0.13, 2, 0.015), cm, [-0.23 + i * 0.155, 0.035, -0.072 + j * 0.145], [0, 0, 0], [1, 1, 1], false);
  const wrap = add(g, new THREE.BoxGeometry(0.34, 0.1, 0.33), std(0xd8384a, 0.5), [0.18, 0.01, 0], [0, 0, 0], [1, 1, 1], false);
  add(g, new THREE.BoxGeometry(0.06, 0.105, 0.335), std(0xe8e8f0, 0.2, { metalness: 0.7 }), [0.0, 0.01, 0], [0, 0, 0], [1, 1, 1], false);
  g.scale.setScalar(s);
  g.userData.wrap = wrap;
  return g;
}

// a cocoa pod: ribbed lathe shape along y, length ~1
export function podGeometry(phiStart = 0, phiLength = Math.PI * 2) {
  const pts = [];
  for (let i = 0; i <= 24; i++) {
    const u = i / 24;
    pts.push(new THREE.Vector2(Math.max(0.005, 0.32 * Math.sin(Math.PI * u) ** 0.8 * (1 - 0.15 * u)), u - 0.5));
  }
  const g = new THREE.LatheGeometry(pts, 40, phiStart, phiLength);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i);
    const a = Math.atan2(z, x);
    const k = 1 + 0.07 * Math.cos(a * 10);
    p.setX(i, x * k);
    p.setZ(i, z * k);
  }
  g.computeVertexNormals();
  return g;
}
const POD_COLS = [0xf2b63a, 0xe88a2a, 0xc8502a, 0x9ab83a];

function makeCocoaTree(R, pods = 10) {
  const g = new THREE.Group();
  const bark = std(0x7a5a3a, 0.9);
  add(g, new THREE.CylinderGeometry(0.16, 0.22, 2.6, 10), bark, [0, 1.3, 0]);
  for (const [a, l] of [[0.7, 1.4], [-0.6, 1.5], [2.5, 1.3]]) {
    const b = new THREE.Group();
    b.position.set(0, 2.4, 0);
    b.rotation.set(0, a, 0.8);
    g.add(b);
    add(b, new THREE.CylinderGeometry(0.06, 0.1, l, 8), bark, [0, l / 2, 0]);
  }
  const leaf = [std(0x2f6a32, 0.8), std(0x3a7a3a, 0.8), std(0x285a2a, 0.8)];
  for (let i = 0; i < 9; i++) add(g, new THREE.SphereGeometry(0.8 + R() * 0.4, 12, 10), leaf[i % 3], [(R() - 0.5) * 2.2, 3.3 + R() * 0.9, (R() - 0.5) * 2.0], [0, 0, 0], [1, 0.75, 1]);
  const podMeshes = [];
  for (let i = 0; i < pods; i++) {
    const h = 0.5 + R() * 1.9;
    const a = R() * Math.PI * 2;
    const r = 0.2 + 0.03 * (2.6 - h);
    const pv = new THREE.Group();
    pv.position.set(Math.cos(a) * r, h, Math.sin(a) * r);
    pv.rotation.set(0, -a, 0);
    g.add(pv);
    add(pv, new THREE.CylinderGeometry(0.025, 0.025, 0.12, 6), std(0x5a6a2a, 0.8), [0.06, 0, 0], [0, 0, Math.PI / 2], [1, 1, 1], false);
    const m = add(pv, podGeometry(), std(POD_COLS[i % 4], 0.55), [0.18, -0.26, 0], [0, 0, 0.12], [0.6, 0.6, 0.6]);
    podMeshes.push(m);
  }
  g.userData.pods = podMeshes;
  return g;
}

// ---------------------------------------------------------------- kitchen
export function buildKitchenC() {
  const k = buildKitchen();
  for (const o of [k.onion, k.knife, k.shine, k.coldOnion, ...k.pieces, ...k.tears]) if (o) o.visible = false;
  const bar = makeBar(0.55);
  k.aff.parts.arms.R.hand.add(bar);
  bar.position.set(0, -0.12, 0.08);
  bar.rotation.set(0, Math.PI / 2, 1.2);
  // a toothbrush for the ending
  const brush = new THREE.Group();
  add(brush, new THREE.BoxGeometry(0.06, 0.6, 0.06), std(0x2f9bff, 0.4), [0, 0, 0], [0, 0, 0], [1, 1, 1], false);
  add(brush, new THREE.BoxGeometry(0.08, 0.14, 0.08), std(0xffffff, 0.8), [0, 0.32, 0.05], [0, 0, 0], [1, 1, 1], false);
  k.aff.parts.arms.L.hand.add(brush);
  brush.position.set(0, -0.05, 0.12);
  brush.rotation.set(1.2, 0, 0);
  brush.visible = false;
  return { ...k, bar, brush };
}

// ------------------------------------------------------------------- farm
export const TABLE = V3(1.6, 0.9, 2.2);
export function buildFarm() {
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xb8d8a8, 14, 60);
  const sky = gradientSky(0x6ab0e8, 0xe8f4d8);
  scene.add(sky);
  scene.add(new THREE.HemisphereLight(0xf8fff0, 0x4a5a2a, 1.3));
  const key = new THREE.DirectionalLight(0xfff0d8, 1.7);
  key.position.set(6, 14, 8);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  Object.assign(key.shadow.camera, { left: -10, right: 10, top: 10, bottom: -10, near: 1, far: 50 });
  scene.add(key);
  add(scene, new THREE.CircleGeometry(80, 48), std(0x6a8a3a, 0.95), [0, 0, 0], [-Math.PI / 2, 0, 0], [1, 1, 1], false).receiveShadow = true;
  const R = rng(50);
  // fallen leaves
  for (let i = 0; i < 80; i++) add(scene, new THREE.CircleGeometry(0.15, 6), std([0x8a6a3a, 0xa8803a, 0x6a5a2a][i % 3], 1), [(R() - 0.5) * 16, 0.01, (R() - 0.5) * 12], [-Math.PI / 2, 0, R() * 6], [1.6, 1, 1], false);
  // the main cocoa tree and its neighbours
  const main = makeCocoaTree(R, 14);
  main.position.set(-0.6, 0, 0);
  main.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  scene.add(main);
  for (const [x, z] of [[-4.5, -2.5], [3.5, -3.5], [-2.5, -6.5], [5.5, -1.0], [0.5, -8], [-7, -5], [8, -6]]) {
    const tr = makeCocoaTree(R, 8);
    tr.position.set(x, 0, z);
    tr.rotation.y = R() * 6;
    scene.add(tr);
  }
  for (let i = 0; i < 8; i++) {
    const tr = makeTree(R, { scale: 2.4 + R(), leaf: [0x2f6a32, 0x3a7a3a, 0x285a2a] });
    tr.position.set((R() - 0.5) * 30, 0, -12 - R() * 10);
    scene.add(tr);
  }
  // table with a pod that splits
  const table = new THREE.Group();
  table.position.set(TABLE.x, 0, TABLE.z);
  scene.add(table);
  const wood = std(0xa8784a, 0.8);
  add(table, new THREE.BoxGeometry(2.0, 0.08, 1.1), wood, [0, TABLE.y, 0]);
  for (const [x, z] of [[-0.9, -0.45], [0.9, -0.45], [-0.9, 0.45], [0.9, 0.45]]) add(table, new THREE.BoxGeometry(0.08, TABLE.y, 0.08), wood, [x, TABLE.y / 2, z]);
  const pod = new THREE.Group();
  pod.position.set(0, TABLE.y + 0.2, 0);
  pod.rotation.set(0, 0, Math.PI / 2);
  table.add(pod);
  const shellIn = std(0xfff2d8, 0.8, { side: THREE.DoubleSide });
  const halves = [0, Math.PI].map((ph) => {
    const h = new THREE.Group();
    pod.add(h);
    add(h, podGeometry(ph, Math.PI), std(0xf2a83a, 0.55, { side: THREE.FrontSide }), [0, 0, 0], [0, 0, 0], [0.8, 1.1, 0.8], false);
    add(h, podGeometry(ph, Math.PI), shellIn, [0, 0, 0], [0, 0, 0], [0.74, 1.05, 0.74], false).material.side = THREE.BackSide;
    return h;
  });
  // beans: white pulp-covered, in rows around a core
  const beans = new THREE.Group();
  pod.add(beans);
  const beanMat = std(0xfaf6f0, 0.35, { emissive: 0x3a3a3a, emissiveIntensity: 0.1 });
  for (let i = 0; i < 30; i++) {
    const row = i % 5, k = Math.floor(i / 5);
    const a = (row / 5) * Math.PI * 2;
    add(beans, new THREE.SphereGeometry(0.06, 12, 8), beanMat, [Math.cos(a) * 0.1, -0.33 + k * 0.13, Math.sin(a) * 0.1], [0, 0, 0], [1.3, 0.8, 1], false);
  }
  beans.visible = false;
  // a chocolate bar on the table (for the thumbnail)
  const bar = makeBar(1.1);
  bar.position.set(0.55, TABLE.y + 0.06, 0.25);
  bar.rotation.y = -0.4;
  bar.visible = false;
  table.add(bar);
  const aff = makeAffan();
  aff.root.scale.setScalar(0.55);
  aff.root.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  scene.add(aff.root);
  // a bean in Affan's hand for tasting
  const tasteBean = add(aff.parts.arms.R.hand, new THREE.SphereGeometry(0.1, 12, 8), beanMat, [0, -0.1, 0.12], [0, 0, 0], [1.3, 0.8, 1], false);
  tasteBean.visible = false;
  return { scene, sky, main, pods: main.userData.pods, table, pod, halves, beans, bar, aff, tasteBean };
}

// ---------------------------------------------------------------- factory
export const ST = { ferment: 0, dry: 7, roast: 14, shell: 21, grind: 28, mix: 35, mold: 42 };
export function buildFactory() {
  const scene = new THREE.Scene();
  const sky = gradientSky(0xffe8c8, 0xf6d8b0);
  scene.add(sky);
  scene.add(new THREE.HemisphereLight(0xfff6e8, 0x8a6a4a, 1.35));
  const key = new THREE.DirectionalLight(0xfff0d8, 1.4);
  key.position.set(8, 14, 10);
  scene.add(key);
  add(scene, new THREE.PlaneGeometry(120, 30), std(0xe8d8c0, 0.9), [18, 0, -2], [-Math.PI / 2, 0, 0], [1, 1, 1], false);
  add(scene, new THREE.PlaneGeometry(120, 14), std(0xf6e6d0, 0.9), [18, 7, -6], [0, 0, 0], [1, 1, 1], false);
  // a long conveyor bench behind the stations
  add(scene, new THREE.BoxGeometry(56, 0.12, 0.8), std(0x6a7488, 0.5), [21, 0.9, -3.0]);
  const R = rng(5000);
  const beanMat = std(0xfaf6f0, 0.4);
  const brownMat = std(0x7a4a2a, 0.6);
  // 1. fermenting crate with banana leaves
  const crate = new THREE.Group();
  crate.position.set(ST.ferment, 0, 0);
  scene.add(crate);
  const plank = std(0xb08050, 0.8);
  add(crate, new THREE.BoxGeometry(2.2, 0.1, 1.6), plank, [0, 0.3, 0]);
  for (const [x, z, w, d] of [[0, 0.78, 2.2, 0.08], [0, -0.78, 2.2, 0.08], [1.06, 0, 0.08, 1.6], [-1.06, 0, 0.08, 1.6]]) for (let k = 0; k < 4; k++) add(crate, new THREE.BoxGeometry(w, 0.18, d), plank, [x, 0.42 + k * 0.2, z]);
  const fBeans = new THREE.InstancedMesh(new THREE.SphereGeometry(0.07, 8, 6), std(0xffffff, 0.45), 160);
  const m4 = new THREE.Matrix4();
  for (let i = 0; i < 160; i++) {
    m4.compose(V3((R() - 0.5) * 1.9, 0.45 + R() * 0.55, (R() - 0.5) * 1.35), new THREE.Quaternion().setFromEuler(new THREE.Euler(R() * 3, R() * 3, 0)), V3(1.3, 0.85, 1));
    fBeans.setMatrixAt(i, m4);
  }
  crate.add(fBeans);
  const leafMat = std(0x4aa83a, 0.6, { side: THREE.DoubleSide });
  const leaves = [];
  for (let i = 0; i < 3; i++) {
    const l = add(crate, new THREE.PlaneGeometry(2.4, 0.7), leafMat, [0, 1.22, -0.5 + i * 0.5], [-Math.PI / 2, 0, (R() - 0.5) * 0.1], [1, 1, 1], false);
    leaves.push(l);
  }
  // 2. drying mat on a raised rack, in the sun
  const dry = new THREE.Group();
  dry.position.set(ST.dry, 0, 0);
  scene.add(dry);
  add(dry, new THREE.BoxGeometry(2.6, 0.06, 1.6), std(0xd8c088, 0.9), [0, 0.8, 0]);
  for (const [x, z] of [[-1.2, -0.7], [1.2, -0.7], [-1.2, 0.7], [1.2, 0.7]]) add(dry, new THREE.CylinderGeometry(0.05, 0.05, 0.8, 8), plank, [x, 0.4, z]);
  const dBeans = new THREE.InstancedMesh(new THREE.SphereGeometry(0.065, 8, 6), brownMat, 140);
  for (let i = 0; i < 140; i++) {
    m4.compose(V3((R() - 0.5) * 2.3, 0.87, (R() - 0.5) * 1.35), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, R() * 3, 0)), V3(1.3, 0.7, 1));
    dBeans.setMatrixAt(i, m4);
  }
  dry.add(dBeans);
  const sun = glow(0xffd84a, 3.4, 0.9);
  sun.position.set(0.6, 4.6, -1);
  dry.add(sun);
  const sunRays = [];
  for (let i = 0; i < 5; i++) {
    const r = add(dry, new THREE.PlaneGeometry(0.12, 3.2), new THREE.MeshBasicMaterial({ color: 0xffe88a, transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending }), [-0.6 + i * 0.4, 2.7, -0.4], [0, 0, 0.18 - i * 0.07], [1, 1, 1], false);
    sunRays.push(r);
  }
  // 3. roasting drum
  const roast = new THREE.Group();
  roast.position.set(ST.roast, 0, 0);
  scene.add(roast);
  const steel = std(0x9aa4b4, 0.3, { metalness: 0.6 });
  add(roast, new THREE.BoxGeometry(2.2, 0.9, 1.2), std(0x4a4a58, 0.6), [0, 0.45, 0]);
  const drum = new THREE.Group();
  drum.position.set(0, 1.55, 0);
  roast.add(drum);
  add(drum, new THREE.CylinderGeometry(0.62, 0.62, 1.8, 24, 1, false), std(0x3a3a44, 0.4, { metalness: 0.5 }), [0, 0, 0], [0, 0, Math.PI / 2]);
  for (let i = 0; i < 6; i++) add(drum, new THREE.BoxGeometry(1.82, 0.06, 0.1), steel, [0, Math.cos((i / 6) * Math.PI * 2) * 0.62, Math.sin((i / 6) * Math.PI * 2) * 0.62], [(i / 6) * Math.PI * 2, 0, 0], [1, 1, 1], false);
  add(roast, new THREE.CylinderGeometry(0.75, 0.75, 0.08, 24), steel, [0.95, 1.55, 0], [0, 0, Math.PI / 2]);
  const flame = glow(0xff7a2a, 2.2, 0.8);
  flame.position.set(0, 0.95, 0.65);
  roast.add(flame);
  const aromaMat = new THREE.SpriteMaterial({ map: glowTex, color: 0xffb0d8, transparent: true, opacity: 0.5, depthWrite: false });
  const aroma = Array.from({ length: 12 }, () => {
    const s = new THREE.Sprite(aromaMat);
    s.visible = false;
    roast.add(s);
    return s;
  });
  // 4. sheller: hopper, beans falling, shells flying, nibs in a tray
  const shell = new THREE.Group();
  shell.position.set(ST.shell, 0, 0);
  scene.add(shell);
  add(shell, new THREE.CylinderGeometry(0.75, 0.25, 0.9, 16, 1, true), std(0xc8ccd4, 0.4, { side: THREE.DoubleSide, metalness: 0.4 }), [0, 2.4, 0]);
  add(shell, new THREE.BoxGeometry(0.9, 1.2, 0.9), std(0xe0622a, 0.5), [0, 1.35, 0]);
  add(shell, new THREE.BoxGeometry(1.4, 0.12, 1.0), std(0x8a94a8, 0.5), [0.2, 0.5, 0]);
  const falling = Array.from({ length: 10 }, () => add(shell, new THREE.SphereGeometry(0.07, 8, 6), brownMat, [0, 0, 0], [0, 0, 0], [1.3, 0.8, 1], false));
  const flakes = Array.from({ length: 14 }, () => add(shell, new THREE.PlaneGeometry(0.1, 0.07), std(0xa8784a, 0.8, { side: THREE.DoubleSide }), [0, 0, 0], [0, 0, 0], [1, 1, 1], false));
  const nibs = new THREE.InstancedMesh(new THREE.TetrahedronGeometry(0.05, 0), std(0x4a2a18, 0.6), 60);
  for (let i = 0; i < 60; i++) {
    m4.compose(V3(0.2 + (R() - 0.5) * 1.2, 0.6, (R() - 0.5) * 0.8), new THREE.Quaternion().setFromEuler(new THREE.Euler(R() * 3, R() * 3, R() * 3)), V3(1, 1, 1));
    nibs.setMatrixAt(i, m4);
  }
  shell.add(nibs);
  // 5. roller grinder pouring liquid chocolate into a tank
  const grind = new THREE.Group();
  grind.position.set(ST.grind, 0, 0);
  scene.add(grind);
  add(grind, new THREE.BoxGeometry(1.6, 1.4, 1.1), std(0x2f6a9a, 0.5), [-0.4, 0.7, 0]);
  const rollers = [-0.22, 0.22].map((z) => add(grind, new THREE.CylinderGeometry(0.2, 0.2, 1.2, 20), steel, [-0.4, 1.6, z], [0, 0, Math.PI / 2], [1, 1, 1], false));
  add(grind, new THREE.CylinderGeometry(0.06, 0.06, 0.5, 8), steel, [0.45, 1.1, 0], [0, 0, Math.PI / 2], [1, 1, 1], false);
  const stream = add(grind, new THREE.CylinderGeometry(0.07, 0.09, 1.0, 12), chocMat(), [0.72, 0.62, 0], [0, 0, 0], [1, 1, 1], false);
  const tank = add(grind, new THREE.CylinderGeometry(0.55, 0.55, 0.7, 24, 1, true), std(0xd8dce4, 0.3, { metalness: 0.5, side: THREE.DoubleSide }), [0.75, 0.35, 0]);
  const tankLevel = add(grind, new THREE.CircleGeometry(0.53, 24), chocMat(), [0.75, 0.05, 0], [-Math.PI / 2, 0, 0], [1, 1, 1], false);
  // 6. mixer bowl with a paddle; ingredients drop in
  const mix = new THREE.Group();
  mix.position.set(ST.mix, 0, 0);
  scene.add(mix);
  add(mix, new THREE.CylinderGeometry(1.0, 0.75, 1.0, 32, 1, true), std(0xd8dce4, 0.3, { metalness: 0.5, side: THREE.DoubleSide }), [0, 0.9, 0]);
  add(mix, new THREE.CylinderGeometry(0.75, 0.75, 0.06, 32), std(0xb8bcc4, 0.4), [0, 0.42, 0]);
  add(mix, new THREE.CylinderGeometry(0.5, 0.6, 0.4, 16), std(0x6a7488, 0.5), [0, 0.2, 0]);
  const surface = add(mix, new THREE.CircleGeometry(0.93, 32), chocMat(), [0, 1.25, 0], [-Math.PI / 2, 0, 0], [1, 1, 1], false);
  const paddle = new THREE.Group();
  paddle.position.set(0, 1.25, 0);
  mix.add(paddle);
  add(paddle, new THREE.CylinderGeometry(0.05, 0.05, 1.6, 8), steel, [0, 0.6, 0], [0, 0, 0], [1, 1, 1], false);
  add(paddle, new THREE.BoxGeometry(1.4, 0.3, 0.06), steel, [0, -0.1, 0], [0, 0, 0], [1, 1, 1], false);
  const swirl = add(mix, new THREE.TorusGeometry(0.5, 0.03, 6, 40, Math.PI * 1.4), std(0x7a4a30, 0.3), [0, 1.27, 0], [-Math.PI / 2, 0, 0], [1, 1, 1], false);
  const sugar = Array.from({ length: 5 }, () => add(mix, new THREE.BoxGeometry(0.16, 0.16, 0.16), std(0xffffff, 0.6), [0, 0, 0], [0.4, 0.3, 0], [1, 1, 1], false));
  const carton = new THREE.Group();
  mix.add(carton);
  add(carton, new THREE.BoxGeometry(0.35, 0.6, 0.35), std(0x6ab8ff, 0.5), [0, 0, 0]);
  add(carton, new THREE.BoxGeometry(0.36, 0.22, 0.36), std(0xffffff, 0.6), [0, 0.0, 0]);
  const milk = add(mix, new THREE.CylinderGeometry(0.05, 0.05, 1.0, 10), std(0xffffff, 0.3), [0, 0, 0], [0, 0, 0], [1, 1, 1], false);
  const butter = add(mix, new RoundedBoxGeometry(0.4, 0.22, 0.3, 2, 0.04), std(0xffe8a8, 0.5), [0, 0, 0], [0, 0.4, 0], [1, 1, 1], false);
  // 7. moulding tray + cooler
  const mold = new THREE.Group();
  mold.position.set(ST.mold, 0, 0);
  scene.add(mold);
  add(mold, new THREE.BoxGeometry(2.4, 0.9, 1.4), std(0x6a7488, 0.5), [0, 0.45, 0]);
  add(mold, new THREE.BoxGeometry(2.0, 0.1, 1.0), std(0xd8e0ec, 0.3), [0, 0.95, 0]);
  const cav = [];
  for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) {
    add(mold, new THREE.BoxGeometry(0.5, 0.02, 0.36), std(0x3a3a44, 0.6), [-0.62 + i * 0.62, 1.01, -0.22 + j * 0.44], [0, 0, 0], [1, 1, 1], false);
    const fill = add(mold, new THREE.BoxGeometry(0.48, 0.08, 0.34), chocMat(), [-0.62 + i * 0.62, 1.04, -0.22 + j * 0.44], [0, 0, 0], [1, 1, 1], false);
    cav.push(fill);
  }
  const nozzle = add(mold, new THREE.ConeGeometry(0.16, 0.4, 16), steel, [0, 2.2, 0], [Math.PI, 0, 0], [1, 1, 1], false);
  const pour = add(mold, new THREE.CylinderGeometry(0.04, 0.05, 1.0, 10), chocMat(), [0, 1.5, 0], [0, 0, 0], [1, 1, 1], false);
  const coldMat = new THREE.SpriteMaterial({ map: glowTex, color: 0x9ae0ff, transparent: true, opacity: 0.6, depthWrite: false });
  const cold = Array.from({ length: 16 }, () => {
    const s = new THREE.Sprite(coldMat);
    s.visible = false;
    mold.add(s);
    return s;
  });
  const bars = Array.from({ length: 3 }, (_, i) => {
    const b = makeBar(1.4);
    b.position.set(-0.7 + i * 0.7, 1.15, 0.9);
    b.rotation.set(-0.3, 0, 0);
    b.visible = false;
    mold.add(b);
    return b;
  });
  const aff = makeAffan();
  aff.root.scale.setScalar(0.5);
  scene.add(aff.root);
  return { scene, sky, fBeans, leaves, dBeans, sun, sunRays, drum, flame, aroma, falling, flakes, nibs, rollers, stream, tankLevel, surface, paddle, swirl, sugar, carton, milk, butter, cav, nozzle, pour, cold, bars, aff };
}
