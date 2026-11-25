// Episode 066 sets:
//  - the Episode 053 park on a hot sunny day: Affan, hot and sweaty after
//    playing kejar-kejar, sweat drops and a water bottle; a friendly dog that
//    pants with its tongue out;
//  - the body lab: a big Affan beside a giant thermometer (37 °C), a hot sun,
//    a warm red glow when he is too hot and a cool blue one when he cools down;
//  - a slice of skin: skin on top, sweat glands coiled underneath with ducts
//    up to little pores; sweat rises and sits on the skin, then dries up as
//    vapour carrying wavy red heat away;
//  - the branded outro stage from Episode 005.
import * as THREE from 'three';
import { rng } from '../../shared/core.js';
import { makeAffan } from '../../shared/affan.js';
import { add, glow } from '../../shared/props.js';
import { buildPark53, buildOutro, A_PK } from '../053-siang-malam/worlds.js';
import { RoundedBoxGeometry } from '../005-bulan-ikut-kereta/worlds.js';

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

const sweatMat = std(0x8fd8ff, 0.05, { transparent: true, opacity: 0.9, emissive: 0x2a7ab0, emissiveIntensity: 0.25 });
// a teardrop of sweat (point up)
export function makeDrop(s = 1) {
  const pts = [];
  for (let i = 0; i <= 16; i++) {
    const v = i / 16;
    pts.push(new THREE.Vector2(Math.sin(v * Math.PI) * (1 - v * 0.75) * 0.5, -Math.cos(v * Math.PI) * 0.5 + v * 0.35));
  }
  const m = new THREE.Mesh(new THREE.LatheGeometry(pts, 16), sweatMat);
  m.scale.setScalar(s);
  return m;
}

// a cartoon dog that can pant (tongue out)
export function makeDog() {
  const root = new THREE.Group();
  const fur = std(0xd8a060, 0.8), light = std(0xf6dcb4, 0.8), dark = std(0x6a4022, 0.8);
  const body = new THREE.Group();
  root.add(body);
  add(body, new THREE.CapsuleGeometry(0.42, 0.9, 8, 16), fur, [0, 0.85, 0], [Math.PI / 2, 0, 0]);
  add(body, new THREE.SphereGeometry(0.36, 16, 12), light, [0, 0.72, 0.35], [0, 0, 0], [0.9, 0.8, 1.1]);
  const legs = [];
  for (const [x, z] of [[-0.25, 0.45], [0.25, 0.45], [-0.25, -0.45], [0.25, -0.45]]) {
    const l = add(body, new THREE.CylinderGeometry(0.11, 0.1, 0.6, 12), fur, [x, 0.32, z]);
    add(body, new THREE.SphereGeometry(0.13, 12, 8), light, [x, 0.05, z + 0.04], [0, 0, 0], [1, 0.6, 1.3]);
    legs.push(l);
  }
  const tail = new THREE.Group();
  tail.position.set(0, 1.05, -0.8);
  body.add(tail);
  add(tail, new THREE.CapsuleGeometry(0.07, 0.4, 6, 10), fur, [0, 0.2, -0.08], [-0.5, 0, 0]);
  const head = new THREE.Group();
  head.position.set(0, 1.45, 0.75);
  body.add(head);
  add(head, new THREE.SphereGeometry(0.42, 24, 18), fur, [0, 0, 0], [1, 0.95, 0.95]);
  add(head, new THREE.SphereGeometry(0.24, 18, 12), light, [0, -0.12, 0.33], [0, 0, 0], [1.05, 0.8, 1.0]);
  add(head, new THREE.SphereGeometry(0.08, 12, 10), std(0x1a1210, 0.3), [0, -0.02, 0.56], [0, 0, 0], [1.2, 0.85, 0.9]);
  for (const sd of [-1, 1]) {
    add(head, new THREE.SphereGeometry(0.075, 14, 10), std(0x1a1210, 0.2), [sd * 0.17, 0.12, 0.35]);
    add(head, new THREE.SphereGeometry(0.025, 8, 6), std(0xffffff, 0.2), [sd * 0.17 + 0.02, 0.15, 0.41]);
    add(head, new THREE.SphereGeometry(0.22, 14, 10), dark, [sd * 0.36, 0.05, -0.05], [0, 0, sd * 0.35], [0.45, 1.1, 0.6]);
  }
  // open mouth and tongue
  const mouth = add(head, new THREE.SphereGeometry(0.12, 14, 10), std(0x4a1418, 0.6), [0, -0.27, 0.36], [0, 0, 0], [1.1, 0.55, 0.6]);
  const tongue = new THREE.Group();
  tongue.position.set(0, -0.3, 0.42);
  head.add(tongue);
  add(tongue, new THREE.CapsuleGeometry(0.08, 0.16, 6, 10), std(0xff7a9a, 0.5), [0, -0.12, 0.04], [0.35, 0, 0], [1.3, 1, 0.45]);
  // pant: k 0..1 tongue out, t time
  const pant = (t, k = 1) => {
    const b = Math.abs(Math.sin(t * 7));
    tongue.scale.set(1, Math.max(0.01, k * (0.8 + 0.3 * b)), 1);
    mouth.scale.set(1.1, 0.55 + 0.25 * k * b, 0.6);
    body.scale.set(1 + 0.03 * k * b, 1 + 0.02 * k * b, 1);
    tail.rotation.z = 0.5 * Math.sin(t * 9);
    head.rotation.x = -0.05 * k * b;
  };
  pant(0, 0);
  return { root, body, head, tongue, tail, legs, pant };
}

// ------------------------------------------------------------------ park
export function buildPark66() {
  const w = buildPark53();
  w.setNight(0, 0);
  w.ball.visible = false;
  if (w.winter) [w.winter].flat().forEach((o) => o && o.visible !== undefined && (o.visible = false));
  // sweat drops on Affan's face and arms (parented to the head / torso)
  const drops = [];
  const head = w.aff.parts.head;
  [[0.62, 0.25, 0.5], [-0.66, 0.1, 0.45], [0.3, 0.62, 0.66], [-0.35, 0.55, 0.66], [0.75, -0.2, 0.3]].forEach(([x, y, z], i) => {
    const d = makeDrop(0.12);
    d.position.set(x, y, z);
    d.userData = { y0: y, ph: i * 0.37 };
    head.add(d);
    drops.push(d);
  });
  // a water bottle (held in the right hand when drinking)
  const bottle = new THREE.Group();
  add(bottle, new THREE.CylinderGeometry(0.11, 0.11, 0.42, 20), std(0x4aa8ff, 0.2, { transparent: true, opacity: 0.85 }), [0, 0, 0], [0, 0, 0], [1, 1, 1], false);
  add(bottle, new THREE.CylinderGeometry(0.07, 0.09, 0.08, 16), std(0x2f6fff, 0.4), [0, 0.25, 0], [0, 0, 0], [1, 1, 1], false);
  add(bottle, new THREE.CylinderGeometry(0.112, 0.112, 0.12, 20), std(0xffffff, 0.5), [0, -0.02, 0], [0, 0, 0], [1, 1, 1], false);
  w.scene.add(bottle);
  bottle.visible = false;
  // a hot sun high in the sky (moves with the camera like the sky)
  const sunG = new THREE.Group();
  const sunDisc = glow(0xfff0a0, 60, 0.9);
  sunDisc.position.set(-60, 120, -200);
  sunG.add(sunDisc);
  w.scene.add(sunG);
  // the dog, a little way off
  const dog = makeDog();
  dog.root.position.set(A_PK.x - 2.6, 0, A_PK.z - 0.8);
  dog.root.scale.setScalar(0.75);
  dog.root.rotation.y = 0.6;
  w.scene.add(dog.root);
  return { ...w, drops, bottle, sunG, dog };
}

// ------------------------------------------------------------- the lab
export const BODY_AT = V3(0, 0, 0);
export const SKIN_AT = V3(30, 0, 0);
export function buildLab() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xfff0e0);
  const sky = gradientSky(0xffd8b0, 0xfff6ec);
  scene.add(sky);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xe8c8a8, 1.15));
  const key = new THREE.DirectionalLight(0xffffff, 1.5);
  key.position.set(4, 9, 8);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xffe8d8, 0.6);
  fill.position.set(-6, 3, 5);
  scene.add(fill);
  const R = rng(661);

  // --- body: Affan and a giant thermometer
  add(scene, new THREE.CylinderGeometry(5.5, 5.8, 0.3, 48), std(0xf6e2cc, 0.9), [BODY_AT.x, -0.15, BODY_AT.z]);
  const aff = makeAffan();
  aff.root.position.copy(BODY_AT).add(V3(-0.9, 0, 0));
  scene.add(aff.root);
  const hot = glow(0xff5030, 6.5, 0);
  hot.position.copy(BODY_AT).add(V3(-0.9, 2.2, -0.6));
  scene.add(hot);
  const cool = glow(0x50b8ff, 6.5, 0);
  cool.position.copy(hot.position);
  scene.add(cool);
  const thermo = new THREE.Group();
  thermo.position.copy(BODY_AT).add(V3(1.9, 0, 0.2));
  scene.add(thermo);
  add(thermo, new THREE.CylinderGeometry(0.32, 0.32, 3.6, 24, 1, true), std(0xffffff, 0.05, { transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false }), [0, 2.4, 0], [0, 0, 0], [1, 1, 1], false);
  add(thermo, new THREE.SphereGeometry(0.32, 20, 14), std(0xffffff, 0.05, { transparent: true, opacity: 0.35, depthWrite: false }), [0, 4.2, 0], [0, 0, 0], [1, 1, 1], false);
  const redMat = std(0xff3b3b, 0.3, { emissive: 0xa01010, emissiveIntensity: 0.35 });
  add(thermo, new THREE.SphereGeometry(0.55, 24, 16), redMat, [0, 0.55, 0]);
  const column = add(thermo, new THREE.CylinderGeometry(0.17, 0.17, 1, 16), redMat, [0, 0, 0], [0, 0, 0], [1, 1, 1], false);
  // tick marks; the 37 mark is green
  for (let i = 0; i <= 8; i++) {
    const y = 1.2 + i * 0.35;
    add(thermo, new THREE.BoxGeometry(i === 4 ? 0.5 : 0.3, 0.05, 0.05), new THREE.MeshBasicMaterial({ color: i === 4 ? 0x2fbf5f : 0x5a6070 }), [0.4 + (i === 4 ? 0.1 : 0), y, 0.1], [0, 0, 0], [1, 1, 1], false);
  }
  const mark37 = V3(0.6, 1.2 + 4 * 0.35, 0.1);
  // level 0..1 over the tube: 0.5 = 37 °C
  const setTemp = (k) => {
    const top = 1.2 + 8 * 0.35 * k;
    const h = Math.max(0.05, top - 0.8);
    column.scale.set(1, h, 1);
    column.position.y = 0.8 + h / 2;
  };
  setTemp(0.5);
  // the sun for the hot part
  const sun = new THREE.Group();
  sun.position.copy(BODY_AT).add(V3(-2.6, 6.2, -2));
  scene.add(sun);
  add(sun, new THREE.SphereGeometry(0.8, 24, 16), new THREE.MeshBasicMaterial({ color: 0xffd23a }), [0, 0, 0], [0, 0, 0], [1, 1, 1], false);
  const rays = new THREE.Group();
  sun.add(rays);
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    add(rays, new THREE.ConeGeometry(0.16, 0.5, 8), new THREE.MeshBasicMaterial({ color: 0xffb020 }), [Math.cos(a) * 1.15, Math.sin(a) * 1.15, 0], [0, 0, a - Math.PI / 2], [1, 1, 1], false);
  }
  const sunGlow = glow(0xffe080, 4.5, 0.8);
  sun.add(sunGlow);
  sun.visible = false;

  // --- the slice of skin (about 8 wide, facing +z)
  const skin = new THREE.Group();
  skin.position.copy(SKIN_AT);
  scene.add(skin);
  add(skin, new RoundedBoxGeometry(8, 0.7, 3, 3, 0.15), std(0xe6b48a, 0.8), [0, 4.0, 0]); // outer skin
  add(skin, new RoundedBoxGeometry(8, 2.6, 3, 3, 0.1), std(0xf4a8a0, 0.85), [0, 2.35, 0]); // dermis
  add(skin, new RoundedBoxGeometry(8, 1.0, 3, 3, 0.1), std(0xffe2a0, 0.9), [0, 0.55, 0]); // fat
  // a few hairs
  for (const x of [-3.0, 0.6, 2.9]) add(skin, new THREE.CylinderGeometry(0.035, 0.03, 1.0, 8), std(0x3a2418, 0.6), [x, 4.6, 0.3], [0, 0, 0.2], [1, 1, 1], false);
  // sweat glands: a coil at the bottom of the dermis and a duct up to a pore
  const glandMat = std(0x7a5cf0, 0.5, { emissive: 0x3a2a90, emissiveIntensity: 0.25 });
  const glands = [];
  for (const gx of [-2.2, 0, 2.2]) {
    const pts = [];
    for (let i = 0; i <= 60; i++) {
      const a = (i / 60) * Math.PI * 6;
      pts.push(V3(gx + 0.35 * Math.cos(a), 1.35 + (i / 60) * 0.5, 1.6 + 0.35 * Math.sin(a) - 0.2));
    }
    const coil = add(skin, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 160, 0.09, 8, false), glandMat, [0, 0, 0], [0, 0, 0], [1, 1, 1], false);
    const duct = new THREE.CatmullRomCurve3([V3(gx + 0.35, 1.85, 1.4), V3(gx + 0.2, 2.6, 1.55), V3(gx + 0.35, 3.4, 1.5), V3(gx + 0.3, 4.35, 1.5)]);
    add(skin, new THREE.TubeGeometry(duct, 40, 0.07, 8, false), glandMat, [0, 0, 0], [0, 0, 0], [1, 1, 1], false);
    // sweat travelling up the duct, a drop on the skin, vapour + heat leaving
    const blobs = [0, 1, 2].map(() => add(skin, new THREE.SphereGeometry(0.08, 10, 8), sweatMat, [0, 0, 0], [0, 0, 0], [1, 1, 1], false));
    const drop = makeDrop(0.5);
    drop.position.set(gx + 0.3, 4.55, 1.5);
    skin.add(drop);
    glands.push({ gx, coil, duct, blobs, drop });
  }
  const vapMat = new THREE.SpriteMaterial({ map: glow(0xffffff, 1).material.map, color: 0xe8f4ff, transparent: true, opacity: 0.8, depthWrite: false });
  const vapour = [];
  const heat = [];
  const heatMat = new THREE.MeshBasicMaterial({ color: 0xff5a3a });
  for (let i = 0; i < 9; i++) {
    const sp = new THREE.Sprite(vapMat.clone());
    sp.userData = { g: i % 3, ph: i / 9 + R() * 0.1 };
    skin.add(sp);
    vapour.push(sp);
    const pts = [];
    for (let k = 0; k <= 12; k++) pts.push(V3(0.12 * Math.sin(k * 1.2), k * 0.06, 0));
    const h = add(skin, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.035, 6, false), heatMat, [0, 0, 0], [0, 0, 0], [1, 1, 1], false);
    h.userData = sp.userData;
    heat.push(h);
  }
  return { scene, sky, aff, hot, cool, thermo, setTemp, mark37, sun, rays, skin, glands, vapour, heat };
}
