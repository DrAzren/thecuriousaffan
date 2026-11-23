// Episode 058 sets:
//  - the Episode 038 kitchen with Mama: a plate of nasi lemak in front of
//    Affan, a spoon in his hand and a glass of water;
//  - the "inside the body" stage: a see-through body with a windpipe, two
//    lungs and a dome-shaped diaphragm with a cute face (it breathes, gets a
//    fright and jerks), a throat close-up with a little door (the vocal cords)
//    that snaps shut, trigger props (a plate, a fizzy can, an excited star) and
//    a baby curled up inside a womb;
//  - the branded outro stage from Episode 005.
import * as THREE from 'three';
import { add, glow, glowTex } from '../../shared/props.js';
import { buildOutro } from '../005-bulan-ikut-kereta/worlds.js';
import { buildKitchen, ISLAND_TOP } from '../038-bawang-menangis/worlds.js';

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
      void main(){ gl_FragColor = vec4(mix(bot, top, smoothstep(-0.4, 0.7, vP.y)), 1.0);
        #include <colorspace_fragment>
      }`,
  });
  const m = new THREE.Mesh(new THREE.SphereGeometry(300, 32, 16), mat);
  m.renderOrder = -10;
  return m;
}

// cute eyes (white + pupil) that can widen in fright
function addEyes(parent, x, y, z, r) {
  const eyes = [];
  for (const s of [-1, 1]) {
    const g = new THREE.Group();
    g.position.set(s * x, y, z);
    parent.add(g);
    add(g, new THREE.SphereGeometry(r, 16, 12), std(0xffffff, 0.3), [0, 0, 0], [0, 0, 0], [1, 1, 0.5], false);
    const p = add(g, new THREE.SphereGeometry(r * 0.5, 12, 10), std(0x15151c, 0.3), [0, 0, r * 0.42], [0, 0, 0], [1, 1, 0.5], false);
    eyes.push({ g, p });
  }
  return eyes;
}

// ---------------------------------------------------------------- kitchen
export const PLATE = V3(1.25, ISLAND_TOP, -0.68);
export function buildKitchen58() {
  const k = buildKitchen();
  for (const o of [k.onion, k.knife, k.shine, k.coldOnion, ...k.pieces, ...k.tears]) if (o) o.visible = false;
  const s = k.scene;
  // soft fill from behind the counter so Affan's face reads in the reverse shots
  const rf = new THREE.DirectionalLight(0xfff2e6, 1.1);
  rf.position.set(-0.5, 3.0, -4.0);
  rf.target.position.set(1.75, 1.4, -0.35);
  s.add(rf, rf.target);
  // nasi lemak
  const plate = new THREE.Group();
  plate.position.copy(PLATE);
  s.add(plate);
  add(plate, new THREE.CylinderGeometry(0.3, 0.24, 0.035, 32), std(0xffffff, 0.3), [0, 0.018, 0]);
  add(plate, new THREE.CylinderGeometry(0.3, 0.3, 0.004, 32), std(0x4caf50, 0.6), [0.02, 0.04, 0.02], [0, 0, 0], [0.9, 1, 0.9], false); // banana leaf
  const rice = add(plate, new THREE.SphereGeometry(0.13, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), std(0xfbf8ee, 0.85), [-0.03, 0.04, 0], [0, 0, 0], [1, 0.8, 1]);
  add(plate, new THREE.SphereGeometry(0.06, 14, 10), std(0xd8331f, 0.5), [0.13, 0.05, -0.05], [0, 0, 0], [1, 0.55, 1]); // sambal
  add(plate, new THREE.SphereGeometry(0.045, 14, 10), std(0xffffff, 0.4), [0.12, 0.05, 0.1], [0, 0, 0], [1, 0.6, 1.3]); // egg
  add(plate, new THREE.SphereGeometry(0.022, 10, 8), std(0xffc21a, 0.4), [0.12, 0.07, 0.1]);
  for (let i = 0; i < 3; i++) add(plate, new THREE.CylinderGeometry(0.035, 0.035, 0.01, 14), std(0x9ad86a, 0.5), [-0.15 + i * 0.03, 0.05, 0.15], [0.3, 0, 0], [1, 1, 1], false); // timun
  for (let i = 0; i < 8; i++) add(plate, new THREE.SphereGeometry(0.012, 6, 5), std(i % 2 ? 0xc88a4a : 0xe8c890, 0.6), [0.04 + (i % 4) * 0.025, 0.05, -0.15 + Math.floor(i / 4) * 0.025], [0, 0, 0], [1, 0.7, 1.4], false);
  // glass of water
  const glass = new THREE.Group();
  glass.position.set(PLATE.x - 0.45, ISLAND_TOP, PLATE.z - 0.1);
  s.add(glass);
  add(glass, new THREE.CylinderGeometry(0.07, 0.06, 0.2, 18, 1, true), new THREE.MeshPhysicalMaterial({ color: 0xe8f6ff, roughness: 0.05, transparent: true, opacity: 0.3, depthWrite: false, side: THREE.DoubleSide }), [0, 0.1, 0], [0, 0, 0], [1, 1, 1], false);
  add(glass, new THREE.CylinderGeometry(0.064, 0.058, 0.15, 18), new THREE.MeshPhysicalMaterial({ color: 0x9ad8ff, roughness: 0.1, transparent: true, opacity: 0.6 }), [0, 0.08, 0], [0, 0, 0], [1, 1, 1], false);
  // spoon (follows Affan's right hand)
  const spoon = new THREE.Group();
  s.add(spoon);
  const metal = std(0xd8dce4, 0.2, { metalness: 0.8 });
  add(spoon, new THREE.CylinderGeometry(0.008, 0.01, 0.2, 8), metal, [0, 0.1, 0]);
  add(spoon, new THREE.SphereGeometry(0.035, 12, 8), metal, [0, 0.22, 0], [0, 0, 0], [0.8, 1.2, 0.35]);
  const scoop = add(spoon, new THREE.SphereGeometry(0.022, 10, 8), std(0xfbf8ee, 0.85), [0, 0.22, 0.012], [0, 0, 0], [1, 1.1, 0.6]);
  return { ...k, plate, rice, glass, spoon, scoop };
}

// ------------------------------------------------------------ inside body
export const BODY_AT = V3(0, 0, 0);
export const THROAT = V3(0, 5.3, 0.3);
export const LUNG_Y = 2.6;
export const DIA_Y = 1.05;
export const WOMB_AT = V3(24, 2.5, 0);
export const TRIG_AT = V3(12, 2.5, 0);
export function buildBody() {
  const scene = new THREE.Scene();
  const sky = gradientSky(0x3a5ab0, 0x10183a);
  scene.add(sky);
  scene.add(new THREE.HemisphereLight(0xf4f0ff, 0x2a2a5a, 1.3));
  const key = new THREE.DirectionalLight(0xffffff, 1.4);
  key.position.set(3, 8, 10);
  scene.add(key);
  // see-through body outline
  const ghost = std(0xffd8c0, 0.6, { transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide });
  add(scene, new THREE.CapsuleGeometry(2.2, 3.4, 8, 24), ghost, [0, 1.9, 0], [0, 0, 0], [1, 1, 0.6], false);
  add(scene, new THREE.SphereGeometry(1.35, 28, 20), ghost, [0, 7.0, 0], [0, 0, 0], [1, 1, 1], false);
  add(scene, new THREE.CylinderGeometry(0.55, 0.65, 1.2, 20, 1, true), ghost, [0, 5.4, 0], [0, 0, 0], [1, 1, 1], false);
  // windpipe and bronchi
  const pipeM = std(0xf2b8c0, 0.5);
  add(scene, new THREE.CylinderGeometry(0.17, 0.17, 1.9, 14), pipeM, [0, 4.15, 0.3]);
  for (const s of [-1, 1]) add(scene, new THREE.CylinderGeometry(0.11, 0.13, 1.0, 12), pipeM, [s * 0.35, 2.95, 0.3], [0, 0, s * 0.7]);
  // lungs
  const lungM = std(0xff8aa8, 0.55, { emissive: 0x5a1020, emissiveIntensity: 0.25 });
  const lungs = [-1, 1].map((s) => {
    const g = new THREE.Group();
    g.position.set(s * 1.05, LUNG_Y, 0);
    scene.add(g);
    add(g, new THREE.SphereGeometry(0.9, 24, 18), lungM, [0, 0, 0], [0, 0, 0], [0.85, 1.35, 0.75]);
    return g;
  });
  // diaphragm: a red dome with a face
  const dia = new THREE.Group();
  dia.position.set(0, DIA_Y, 0);
  scene.add(dia);
  const domeM = std(0xe0485a, 0.5, { side: THREE.DoubleSide });
  const dome = add(dia, new THREE.SphereGeometry(2.05, 32, 14, 0, Math.PI * 2, 0, Math.PI / 2), domeM, [0, 0, 0], [0, 0, 0], [1, 0.42, 0.62]);
  const diaEyes = addEyes(dia, 0.42, 0.5, 1.12, 0.2);
  const diaMouth = add(dia, new THREE.TorusGeometry(0.16, 0.035, 8, 20, Math.PI), std(0x5a1020, 0.5), [0, 0.32, 1.2], [0, 0, Math.PI], [1, 1, 1], false);
  const diaO = add(dia, new THREE.SphereGeometry(0.14, 14, 10), std(0x3a0a14, 0.5), [0, 0.3, 1.2], [0, 0, 0], [1, 1.3, 0.4], false);
  diaO.visible = false;
  // stomach under the diaphragm
  add(scene, new THREE.SphereGeometry(0.7, 20, 14), std(0xffb86a, 0.6), [0.55, 0.35, 0], [0, 0, 0.4], [1.2, 0.8, 0.7]);
  // throat door (vocal cords): two flaps inside a ring
  const throat = new THREE.Group();
  throat.position.copy(THROAT);
  scene.add(throat);
  add(throat, new THREE.TorusGeometry(0.32, 0.07, 10, 24), std(0xe07a8a, 0.5), [0, 0, 0], [Math.PI / 2, 0, 0]);
  const flaps = [-1, 1].map((s) => {
    const pv = new THREE.Group();
    pv.position.set(s * 0.3, 0, 0);
    throat.add(pv);
    add(pv, new THREE.BoxGeometry(0.3, 0.05, 0.42), std(0xffd0d8, 0.4), [-s * 0.15, 0, 0]);
    return { pv, s };
  });
  // air particles
  const airMat = new THREE.SpriteMaterial({ map: glowTex, color: 0x9ae0ff, transparent: true, opacity: 0.9, depthWrite: false });
  const air = Array.from({ length: 26 }, (_, i) => {
    const sp = new THREE.Sprite(airMat);
    sp.scale.setScalar(0.32);
    sp.userData.ph = i / 26;
    scene.add(sp);
    return sp;
  });
  // triggers: a plate eaten fast, a fizzy can, an excited star
  const trig = new THREE.Group();
  trig.position.copy(TRIG_AT);
  scene.add(trig);
  const tPlate = new THREE.Group();
  trig.add(tPlate);
  add(tPlate, new THREE.CylinderGeometry(0.9, 0.7, 0.1, 28), std(0xffffff, 0.3), [0, 0, 0]);
  add(tPlate, new THREE.SphereGeometry(0.45, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), std(0xfbf8ee, 0.85), [0, 0.05, 0], [0, 0, 0], [1, 0.8, 1]);
  add(tPlate, new THREE.SphereGeometry(0.2, 14, 10), std(0xd8331f, 0.5), [0.45, 0.1, 0.1], [0, 0, 0], [1, 0.6, 1]);
  const can = new THREE.Group();
  trig.add(can);
  add(can, new THREE.CylinderGeometry(0.45, 0.45, 1.5, 24), std(0x2f9bff, 0.3, { metalness: 0.4 }), [0, 0.75, 0]);
  add(can, new THREE.CylinderGeometry(0.46, 0.46, 0.3, 24), std(0xffffff, 0.3), [0, 0.8, 0]);
  add(can, new THREE.CylinderGeometry(0.4, 0.45, 0.08, 24), std(0xc8ccd4, 0.2, { metalness: 0.8 }), [0, 1.54, 0]);
  const fizz = Array.from({ length: 14 }, (_, i) => {
    const b = add(can, new THREE.SphereGeometry(0.06, 8, 6), std(0xe8f8ff, 0.2, { transparent: true, opacity: 0.8 }), [0, 0, 0], [0, 0, 0], [1, 1, 1], false);
    b.userData.ph = i / 14;
    return b;
  });
  const star = new THREE.Group();
  trig.add(star);
  const shp = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const a = Math.PI / 2 + (i / 10) * Math.PI * 2, r = i % 2 ? 0.38 : 0.9;
    if (i) shp.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    else shp.moveTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  add(star, new THREE.ExtrudeGeometry(shp, { depth: 0.25, bevelEnabled: true, bevelSize: 0.06, bevelThickness: 0.06 }), std(0xffcf33, 0.4, { emissive: 0x6a4a00, emissiveIntensity: 0.4 }), [0, 0, -0.12]);
  addEyes(star, 0.2, 0.1, 0.22, 0.13);
  // the womb with a baby curled up
  const womb = new THREE.Group();
  womb.position.copy(WOMB_AT);
  scene.add(womb);
  add(womb, new THREE.SphereGeometry(2.2, 32, 24), std(0xff9ab8, 0.4, { transparent: true, opacity: 0.32, depthWrite: false, emissive: 0x6a1030, emissiveIntensity: 0.3 }), [0, 0, 0], [0, 0, 0], [1, 1.05, 0.9], false);
  const wombGlow = glow(0xffb0c8, 7, 0.4);
  womb.add(wombGlow);
  const baby = new THREE.Group();
  womb.add(baby);
  const skin = std(0xf0c4a0, 0.6);
  add(baby, new THREE.SphereGeometry(0.75, 24, 18), skin, [0.2, 0.55, 0.1]);
  add(baby, new THREE.SphereGeometry(0.85, 24, 18), skin, [-0.15, -0.45, 0], [0, 0, 0.5], [0.85, 1, 0.8]);
  add(baby, new THREE.CapsuleGeometry(0.2, 0.6, 6, 12), skin, [0.55, -0.6, 0.45], [0.3, 0, 1.2]);
  add(baby, new THREE.CapsuleGeometry(0.22, 0.7, 6, 12), skin, [0.2, -1.05, 0.4], [0.2, 0, 1.4]);
  add(baby, new THREE.CapsuleGeometry(0.15, 0.4, 6, 12), skin, [0.55, 0.05, 0.55], [0.6, 0, 0.6]);
  for (const s of [-1, 1]) add(baby, new THREE.SphereGeometry(0.1, 10, 8), std(0x3a2418, 0.5), [0.2 + s * 0.25, 0.6, 0.78], [0, 0, 0], [1, 0.25, 0.5], false);
  add(baby, new THREE.TorusGeometry(0.1, 0.025, 8, 14, Math.PI), std(0x8a3a3a, 0.5), [0.2, 0.36, 0.8], [0, 0, Math.PI], [1, 1, 1], false);
  return { scene, sky, lungs, dia, dome, diaEyes, diaMouth, diaO, throat, flaps, air, trig, tPlate, can, fizz, star, womb, baby };
}
