// Episode 067 sets:
//  - the Episode 053 park on a sunny day, with a garden bed of semalu (touch-me-not)
//    beside Affan: little feathery leaves that fold up when touched and pink
//    pompom flowers;
//  - the leaf lab: one giant semalu leaf on a stem, with its "pillow" at the base
//    (a see-through cushion full of water drops); a big finger taps the tip, a
//    yellow signal zips down to the pillow, the water flows out, the pillow goes
//    soft, the leaflets fold up pair by pair and the leaf droops; a caterpillar
//    gets a fright; then the water flows back and the leaf opens; at night the
//    sky darkens and the leaf folds to sleep;
//  - the branded outro stage from Episode 005.
import * as THREE from 'three';
import { rng } from '../../shared/core.js';
import { add, glow } from '../../shared/props.js';
import { buildPark53, buildOutro, A_PK } from '../053-siang-malam/worlds.js';
import { RoundedBoxGeometry } from '../005-bulan-ikut-kereta/worlds.js';
import { makeCaterpillar } from '../052-ulat-rama-rama/worlds.js';

export { buildOutro, A_PK };

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
      void main(){ gl_FragColor = vec4(mix(bot, top, smoothstep(-0.4, 0.7, vP.y)), 1.0);
        #include <colorspace_fragment>
      }`,
  });
  const m = new THREE.Mesh(new THREE.SphereGeometry(300, 32, 16), mat);
  m.renderOrder = -10;
  return m;
}

// ---------------------------------------------------------------- the leaf
// A semalu leaf: a pillow (pulvinus) at the origin, a short stalk along +x and two
// feathery pinnae with pairs of leaflets lying flat (normal +y). set({ fold, droop })
// folds the leaflets up together (0 open .. 1 shut) and droops the whole leaf.
const leafMat = std(0x4fae4a, 0.6, { side: THREE.DoubleSide, emissive: 0x0a2a08, emissiveIntensity: 0.15 });
const stalkMat = std(0x6a8a3a, 0.6);
export function makeMimosaLeaf({ pairs = 12, len = 1.0, pinnae = 2, seed = 1 } = {}) {
  const root = new THREE.Group(); // pivot at the pillow
  const leaf = new THREE.Group();
  root.add(leaf);
  const stalk = 0.35 * len;
  add(leaf, new THREE.CylinderGeometry(0.018 * len, 0.022 * len, stalk, 8), stalkMat, [stalk / 2, 0, 0], [0, 0, Math.PI / 2], [1, 1, 1], false);
  const leaflets = [];
  const R = rng(seed);
  for (let p = 0; p < pinnae; p++) {
    const ang = pinnae === 1 ? 0 : (p === 0 ? 1 : -1) * 0.28;
    const pin = new THREE.Group();
    pin.position.set(stalk, 0, 0);
    pin.rotation.y = ang;
    leaf.add(pin);
    add(pin, new THREE.CylinderGeometry(0.01 * len, 0.016 * len, len, 6), stalkMat, [len / 2, 0, 0], [0, 0, Math.PI / 2], [1, 1, 1], false);
    for (let i = 0; i < pairs; i++) {
      const x = (0.08 + (i / pairs) * 0.9) * len;
      const sz = (0.75 + 0.25 * Math.sin((i / pairs) * Math.PI)) * 0.11 * len;
      for (const sd of [-1, 1]) {
        const hinge = new THREE.Group(); // rotates about the pinna (x axis)
        hinge.position.set(x, 0, 0);
        pin.add(hinge);
        add(hinge, new THREE.SphereGeometry(1, 10, 6), leafMat, [0.15 * sz, 0, sd * sz * 0.95], [0, sd * 0.35, 0], [sz * 0.42, sz * 0.06, sz], false);
        hinge.userData = { sd, k: i / pairs, jit: R() * 0.1 };
        leaflets.push(hinge);
      }
    }
  }
  // fold: leaflets close pair by pair starting at the tip (wave 0..1)
  const set = ({ fold = 0, droop = 0, wave = true } = {}) => {
    leaflets.forEach((h) => {
      const u = h.userData;
      const f = wave ? Math.min(1, Math.max(0, fold * 1.6 - (1 - u.k) * 0.6)) : fold;
      h.rotation.x = -u.sd * f * (Math.PI / 2 - 0.12);
    });
    leaf.rotation.z = -droop * 0.75;
  };
  set();
  return { root, leaf, leaflets, set };
}
// a pink pompom flower
function makePompom(s = 1) {
  const g = new THREE.Group();
  const pink = std(0xff8ac8, 0.6, { emissive: 0x401028, emissiveIntensity: 0.2 });
  const R = rng(Math.floor(s * 100));
  for (let i = 0; i < 40; i++) {
    const u = R() * 2 - 1, a = R() * Math.PI * 2, r = Math.sqrt(1 - u * u);
    const d = V3(r * Math.cos(a), u, r * Math.sin(a));
    const m = add(g, new THREE.CylinderGeometry(0.006, 0.006, 0.12, 4), pink, [d.x * 0.06, d.y * 0.06, d.z * 0.06], [0, 0, 0], [1, 1, 1], false);
    m.lookAt(d.clone().multiplyScalar(10));
    m.rotateX(Math.PI / 2);
    add(g, new THREE.SphereGeometry(0.012, 6, 4), std(0xffd8f0, 0.5), [d.x * 0.12, d.y * 0.12, d.z * 0.12], [0, 0, 0], [1, 1, 1], false);
  }
  g.scale.setScalar(s);
  return g;
}

// ------------------------------------------------------------------ park
export const BED_AT = V3(A_PK.x - 1.0, 0, A_PK.z + 0.55); // garden bed in front-left of Affan
export const BED_TOP = 0.75;
export function buildPark67() {
  const w = buildPark53();
  w.setNight(0, 0);
  w.ball.visible = false;
  const s = w.scene;
  // a wooden garden bed with soil
  const bed = new THREE.Group();
  bed.position.copy(BED_AT);
  s.add(bed);
  add(bed, new RoundedBoxGeometry(1.5, BED_TOP, 0.9, 3, 0.05), std(0xa86a3a, 0.8), [0, BED_TOP / 2, 0]);
  add(bed, new THREE.BoxGeometry(1.36, 0.04, 0.76), std(0x5a3a22, 0.95), [0, BED_TOP + 0.005, 0]);
  // the semalu plant: leaves around a few creeping stems
  const leaves = [];
  const R = rng(67);
  for (let i = 0; i < 16; i++) {
    const l = makeMimosaLeaf({ pairs: 9, len: 0.32, seed: 10 + i });
    const a = R() * Math.PI * 2;
    l.root.position.set((R() - 0.5) * 1.1, BED_TOP + 0.08 + R() * 0.12, (R() - 0.5) * 0.55);
    l.root.rotation.set(0, a, 0.25);
    l.root.userData = { d: 0 };
    bed.add(l.root);
    leaves.push(l);
  }
  for (let i = 0; i < 5; i++) {
    const f = makePompom(0.9);
    f.position.set((R() - 0.5) * 1.1, BED_TOP + 0.22 + R() * 0.08, (R() - 0.5) * 0.5);
    bed.add(f);
  }
  return { ...w, bed, leaves };
}

// ------------------------------------------------------------- leaf lab
export const LEAF_AT = V3(0, 0, 0);
export function buildLeafLab() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xe8f8e0);
  const sky = gradientSky(0xb8e8ff, 0xf2fff0);
  scene.add(sky);
  const hemi = new THREE.HemisphereLight(0xffffff, 0xc8e0b8, 1.15);
  scene.add(hemi);
  const key = new THREE.DirectionalLight(0xffffff, 1.5);
  key.position.set(4, 9, 8);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xf0fff0, 0.6);
  fill.position.set(-6, 3, 5);
  scene.add(fill);
  // ground mound and the main stem coming up on the left
  add(scene, new THREE.CylinderGeometry(6, 6.4, 0.4, 48), std(0x8ac860, 0.9), [LEAF_AT.x, -0.2, LEAF_AT.z]);
  const stemCurve = new THREE.CatmullRomCurve3([V3(-3.2, 0, 0), V3(-3.0, 1.6, 0), V3(-2.7, 3.0, 0), V3(-2.4, 4.2, 0)]);
  add(scene, new THREE.TubeGeometry(stemCurve, 30, 0.14, 10), stalkMat);
  // the giant leaf: pillow at the stem, leaf facing the camera (normal +z)
  const pivot = new THREE.Group();
  pivot.position.set(LEAF_AT.x - 2.6, LEAF_AT.y + 3.2, LEAF_AT.z);
  scene.add(pivot);
  const big = makeMimosaLeaf({ pairs: 12, len: 4.6, pinnae: 2, seed: 7 });
  big.root.rotation.set(Math.PI / 2, 0, 0.18); // lie the leaf in the x-y plane
  pivot.add(big.root);
  // the pillow (pulvinus): a see-through cushion with water drops inside
  const pillow = new THREE.Group();
  pivot.add(pillow);
  const cushion = add(pillow, new THREE.SphereGeometry(0.42, 24, 16), std(0x9ae070, 0.2, { transparent: true, opacity: 0.55, depthWrite: false, emissive: 0x2a5a10, emissiveIntensity: 0.2 }), [0, 0, 0], [0, 0, 0], [1.35, 1, 1], false);
  const dropMat = std(0x47a8ff, 0.1, { emissive: 0x0a3a80, emissiveIntensity: 0.35 });
  const drops = [];
  for (let i = 0; i < 9; i++) {
    const d = add(pillow, new THREE.SphereGeometry(0.08, 12, 10), dropMat, [(R(i) - 0.5) * 0.6, (R(i + 9) - 0.5) * 0.4, 0.1 + (R(i + 18) - 0.5) * 0.3], [0, 0, 0], [1, 1.15, 1], false);
    d.userData.home = d.position.clone();
    d.userData.i = i;
    drops.push(d);
  }
  function R(i) {
    return ((Math.sin(i * 91.7 + 3.1) * 43758.5453) % 1 + 1) % 1;
  }
  // the yellow signal
  const signal = glow(0xffe030, 1.3, 0);
  scene.add(signal);
  const spark = add(scene, new THREE.OctahedronGeometry(0.16, 0), new THREE.MeshBasicMaterial({ color: 0xfff060 }), [0, 0, 0], [0, 0, 0], [1, 1.6, 1], false);
  spark.visible = false;
  // a big friendly finger
  const finger = new THREE.Group();
  scene.add(finger);
  add(finger, new THREE.CapsuleGeometry(0.32, 1.6, 8, 16), std(0xe8a878, 0.6), [0, 0, 0], [0, 0, Math.PI / 2]);
  add(finger, new THREE.SphereGeometry(0.2, 12, 8), std(0xf8d8d0, 0.4), [-0.95, 0.12, 0.12], [0, 0, 0], [0.7, 0.3, 0.9], false);
  finger.visible = false;
  // a caterpillar that wants a bite
  const cat = makeCaterpillar();
  cat.root.scale.setScalar(0.9);
  scene.add(cat.root);
  // night: darker sky, moon and Zzz
  const moon = add(scene, new THREE.SphereGeometry(1.0, 24, 16), new THREE.MeshBasicMaterial({ color: 0xfff6d8 }), [3.2, 8.5, -6], [0, 0, 0], [1, 1, 1], false);
  const moonGlow = glow(0xfff0c0, 6, 0.6);
  moonGlow.position.copy(moon.position);
  scene.add(moonGlow);
  moon.visible = false;
  moonGlow.visible = false;
  return { scene, sky, hemi, key, pivot, big, pillow, cushion, drops, signal, spark, finger, cat, moon, moonGlow };
}
