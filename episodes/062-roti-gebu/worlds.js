// Episode 062 sets:
//  - the Episode 038 kitchen with Mama kneading a ball of dough on the board,
//    and a soft loaf of bread in front of Affan that squashes and springs back;
//  - the "inside the dough" stage: the four ingredients (flour, water, sugar,
//    yeast), a giant cute yeast cell that eats sugar cubes and puffs out CO2
//    bubbles, stretchy gluten nets around growing bubbles, a bowl of dough that
//    rises to twice its size, an oven with a glowing window, and a bread slice
//    full of little holes;
//  - the branded outro stage from Episode 005.
import * as THREE from 'three';
import { rng } from '../../shared/core.js';
import { add, glow } from '../../shared/props.js';
import { buildOutro, RoundedBoxGeometry } from '../005-bulan-ikut-kereta/worlds.js';
import { buildKitchen, ISLAND_TOP, BOARD } from '../038-bawang-menangis/worlds.js';

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
function canvasTex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
// soft bread crumb with little holes
const crumbTex = canvasTex(512, 512, (g, w, h) => {
  g.fillStyle = '#f6e6c4';
  g.fillRect(0, 0, w, h);
  const R = rng(622);
  for (let i = 0; i < 260; i++) {
    const r = 4 + R() * 16;
    g.fillStyle = `rgba(${170 + R() * 30},${130 + R() * 30},${80 + R() * 20},0.55)`;
    g.beginPath();
    g.ellipse(R() * w, R() * h, r, r * (0.6 + R() * 0.5), R() * 3, 0, Math.PI * 2);
    g.fill();
  }
});

// a loaf: rounded box base with a domed top, golden crust
export function makeLoaf(s = 1) {
  const g = new THREE.Group();
  const crust = std(0xd8903e, 0.6, { emissive: 0x3a1a04, emissiveIntensity: 0.15 });
  add(g, new RoundedBoxGeometry(0.6 * s, 0.26 * s, 0.34 * s, 3, 0.05 * s), crust, [0, 0.13 * s, 0]);
  add(g, new THREE.CylinderGeometry(0.17 * s, 0.17 * s, 0.6 * s, 24, 1, false, 0, Math.PI), crust, [0, 0.26 * s, 0], [0, 0, Math.PI / 2], [1, 1, 1]);
  return g;
}

// ---------------------------------------------------------------- kitchen
export const LOAF_AT = V3(1.22, ISLAND_TOP, -0.68);
export function buildKitchen62() {
  const k = buildKitchen();
  for (const o of [k.onion, k.knife, k.shine, k.coldOnion, ...k.pieces, ...k.tears]) if (o) o.visible = false;
  const s = k.scene;
  const rf = new THREE.DirectionalLight(0xfff2e6, 1.1);
  rf.position.set(-0.5, 3.0, -4.0);
  rf.target.position.set(1.75, 1.4, -0.35);
  s.add(rf, rf.target);
  const loaf = makeLoaf(1);
  loaf.position.copy(LOAF_AT);
  loaf.rotation.y = 0.5;
  s.add(loaf);
  // dough ball on the board for Mama
  const dough = add(s, new THREE.SphereGeometry(0.17, 24, 16), std(0xf4e2c0, 0.85), [BOARD.x - 0.1, ISLAND_TOP + 0.12, BOARD.z + 0.05], [0, 0, 0], [1, 0.7, 1]);
  // flour dusting
  add(s, new THREE.CircleGeometry(0.35, 24), std(0xffffff, 0.95, { transparent: true, opacity: 0.6 }), [BOARD.x + 0.1, ISLAND_TOP + 0.072, BOARD.z], [-Math.PI / 2, 0, 0], [1, 1, 1], false);
  return { ...k, loaf, dough };
}

// ------------------------------------------------------------ dough stage
export const ING_AT = V3(0, 0, 0);
export const YEAST_AT = V3(14, 0, 0);
export const GLUTEN_AT = V3(28, 0, 0);
export const BOWL_AT = V3(42, 0, 0);
export const OVEN_AT = V3(56, 0, 0);
export const SLICE_AT = V3(70, 0, 0);
export function buildDough() {
  const scene = new THREE.Scene();
  const sky = gradientSky(0xffd8a0, 0xc87a3a);
  scene.add(sky);
  scene.add(new THREE.HemisphereLight(0xfff6e8, 0x8a5a3a, 1.4));
  const key = new THREE.DirectionalLight(0xffffff, 1.4);
  key.position.set(4, 9, 10);
  scene.add(key);
  const R = rng(620);
  // 1) ingredients on a little table
  const ing = new THREE.Group();
  ing.position.copy(ING_AT);
  scene.add(ing);
  add(ing, new RoundedBoxGeometry(6.4, 0.3, 2.4, 3, 0.1), std(0xc89a6a, 0.7), [0, -0.15, 0]);
  const bowlM = std(0xffffff, 0.35);
  const items = [];
  const bowl = (x, fill, fillCol) => {
    const g = new THREE.Group();
    g.position.set(x, 0, 0);
    ing.add(g);
    add(g, new THREE.SphereGeometry(0.75, 28, 14, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), bowlM, [0, 0.75, 0], [0, 0, 0], [1, 1, 1]).material.side = THREE.DoubleSide;
    if (fill === 'heap') add(g, new THREE.SphereGeometry(0.62, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), std(fillCol, 0.95), [0, 0.6, 0], [0, 0, 0], [1, 0.6, 1]);
    if (fill === 'cubes') for (let i = 0; i < 9; i++) add(g, new RoundedBoxGeometry(0.22, 0.22, 0.22, 2, 0.03), std(0xffffff, 0.4), [(R() - 0.5) * 0.7, 0.55 + R() * 0.25, (R() - 0.5) * 0.5], [R(), R(), R()]);
    items.push(g);
    return g;
  };
  bowl(-2.1, 'heap', 0xfbf8f0);
  // water jug
  const jug = new THREE.Group();
  jug.position.set(-0.7, 0, 0);
  ing.add(jug);
  add(jug, new THREE.CylinderGeometry(0.5, 0.55, 1.4, 24, 1, true), new THREE.MeshPhysicalMaterial({ color: 0xe8f6ff, roughness: 0.05, transparent: true, opacity: 0.3, side: THREE.DoubleSide, depthWrite: false }), [0, 0.7, 0], [0, 0, 0], [1, 1, 1], false);
  add(jug, new THREE.CylinderGeometry(0.47, 0.52, 1.0, 24), new THREE.MeshPhysicalMaterial({ color: 0x7ad0ff, roughness: 0.1, transparent: true, opacity: 0.7 }), [0, 0.5, 0], [0, 0, 0], [1, 1, 1], false);
  items.push(jug);
  bowl(0.7, 'cubes');
  // yeast sachet
  const sachet = new THREE.Group();
  sachet.position.set(2.1, 0, 0);
  ing.add(sachet);
  add(sachet, new RoundedBoxGeometry(1.0, 1.3, 0.12, 2, 0.04), std(0xc39aff, 0.5), [0, 0.65, 0]);
  const yisTex = canvasTex(256, 256, (g) => {
    g.fillStyle = '#c39aff';
    g.fillRect(0, 0, 256, 256);
    g.fillStyle = '#ffffff';
    g.font = '800 110px "Baloo 2", Fredoka, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('YIS', 128, 140);
  });
  add(sachet, new THREE.PlaneGeometry(0.8, 0.8), new THREE.MeshBasicMaterial({ map: yisTex }), [0, 0.7, 0.065], [0, 0, 0], [1, 1, 1], false);
  items.push(sachet);

  // 2) a giant yeast cell eating sugar and puffing CO2
  const yeast = new THREE.Group();
  yeast.position.copy(YEAST_AT);
  scene.add(yeast);
  const yM = std(0xc8a8f0, 0.45, { emissive: 0x3a2060, emissiveIntensity: 0.25 });
  const body = add(yeast, new THREE.SphereGeometry(1.2, 32, 24), yM, [0, 1.6, 0], [0, 0, 0], [1, 1.15, 1]);
  add(yeast, new THREE.SphereGeometry(0.45, 20, 14), yM, [0.95, 2.6, 0], [0, 0, 0], [1, 1, 1]); // bud
  for (const x of [-0.38, 0.38]) {
    add(yeast, new THREE.SphereGeometry(0.22, 16, 12), std(0xffffff, 0.3), [x, 2.0, 1.05], [0, 0, 0], [1, 1.1, 0.5], false);
    add(yeast, new THREE.SphereGeometry(0.11, 12, 10), std(0x15151c, 0.3), [x, 2.0, 1.17], [0, 0, 0], [1, 1, 0.5], false);
  }
  const mouth = add(yeast, new THREE.SphereGeometry(0.22, 16, 12), std(0x5a2040, 0.5), [0, 1.45, 1.12], [0, 0, 0], [1.3, 0.4, 0.4], false);
  const sugars = Array.from({ length: 5 }, () => {
    const c = add(scene, new RoundedBoxGeometry(0.3, 0.3, 0.3, 2, 0.04), std(0xffffff, 0.35, { emissive: 0xffffff, emissiveIntensity: 0.15 }), [0, 0, 0], [0, 0, 0], [1, 1, 1], false);
    return c;
  });
  const bubM = new THREE.MeshPhysicalMaterial({ color: 0xdff6ff, roughness: 0.05, transparent: true, opacity: 0.45, depthWrite: false });
  const co2 = Array.from({ length: 22 }, (_, i) => {
    const b = add(scene, new THREE.SphereGeometry(0.2, 18, 12), bubM, [0, 0, 0], [0, 0, 0], [1, 1, 1], false);
    b.userData = { ph: i / 22, a: R() * Math.PI * 2, r: 0.4 + R() * 0.6 };
    return b;
  });
  // a dough "wall" behind the yeast
  add(scene, new THREE.PlaneGeometry(30, 20), std(0xf4e2c0, 0.95), [YEAST_AT.x, 3, YEAST_AT.z - 3], [0, 0, 0], [1, 1, 1], false);
  // 3) gluten nets around bubbles
  const netM = new THREE.MeshBasicMaterial({ color: 0xc8780a, wireframe: true });
  const glutenBubbles = [[-1.4, 1.2, 0, 0.9], [1.3, 1.6, 0.2, 1.1], [0, 3.0, -0.3, 0.8], [-0.4, 0.2, 0.6, 0.6], [1.6, -0.2, -0.2, 0.7]].map(([x, y, z, r]) => {
    const g = new THREE.Group();
    g.position.set(GLUTEN_AT.x + x, y + 0.8, GLUTEN_AT.z + z);
    scene.add(g);
    const b = add(g, new THREE.SphereGeometry(r * 0.96, 24, 16), bubM, [0, 0, 0], [0, 0, 0], [1, 1, 1], false);
    const n = add(g, new THREE.IcosahedronGeometry(r * 1.04, 2), netM, [0, 0, 0], [0, 0, 0], [1, 1, 1], false);
    g.userData.r = r;
    return g;
  });
  add(scene, new THREE.PlaneGeometry(30, 20), std(0xf4e2c0, 0.95), [GLUTEN_AT.x, 3, GLUTEN_AT.z - 2.5], [0, 0, 0], [1, 1, 1], false);
  // 4) a bowl of rising dough
  const rise = new THREE.Group();
  rise.position.copy(BOWL_AT);
  scene.add(rise);
  add(rise, new RoundedBoxGeometry(6, 0.3, 3, 3, 0.1), std(0xc89a6a, 0.7), [0, -0.15, 0]);
  add(rise, new THREE.CylinderGeometry(1.5, 1.0, 1.2, 32, 1, true), std(0x4aa8ff, 0.4, { side: THREE.DoubleSide }), [0, 0.6, 0]);
  const riseDough = add(rise, new THREE.SphereGeometry(1.4, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), std(0xf4e2c0, 0.85), [0, 0.6, 0], [0, 0, 0], [1, 0.45, 1]);
  // 5) an oven with a glowing window and a loaf inside
  const oven = new THREE.Group();
  oven.position.copy(OVEN_AT);
  scene.add(oven);
  add(oven, new RoundedBoxGeometry(4, 3.6, 2.6, 3, 0.15), std(0xe8ecf2, 0.4), [0, 1.8, 0]);
  const ovenWin = add(oven, new THREE.PlaneGeometry(2.8, 1.8), new THREE.MeshBasicMaterial({ color: 0x3a2010 }), [0, 1.6, 1.31], [0, 0, 0], [1, 1, 1], false);
  add(oven, new THREE.BoxGeometry(2.6, 0.12, 0.12), std(0x9aa4b4, 0.3, { metalness: 0.6 }), [0, 2.8, 1.4]);
  for (let i = 0; i < 3; i++) add(oven, new THREE.CylinderGeometry(0.16, 0.16, 0.1, 16), std(0x3a3a44, 0.4), [-1.1 + i * 1.1, 3.25, 1.35], [Math.PI / 2, 0, 0]);
  const ovenLoaf = makeLoaf(3.2);
  ovenLoaf.position.set(0, 0.95, 0.5);
  oven.add(ovenLoaf);
  const ovenGlow = glow(0xff8a2a, 5, 0);
  ovenGlow.position.set(0, 1.6, 1.5);
  oven.add(ovenGlow);
  // 6) a bread slice full of holes
  const slice = new THREE.Group();
  slice.position.copy(SLICE_AT);
  scene.add(slice);
  const sh = new THREE.Shape();
  sh.moveTo(-1.6, -1.5);
  sh.lineTo(1.6, -1.5);
  sh.lineTo(1.6, 0.6);
  sh.absarc(0.9, 0.9, 0.75, -0.4, Math.PI * 0.95, false);
  sh.absarc(-0.9, 0.9, 0.75, Math.PI * 0.05, Math.PI + 0.4, false);
  sh.lineTo(-1.6, -1.5);
  const sg = new THREE.ExtrudeGeometry(sh, { depth: 0.35, bevelEnabled: true, bevelSize: 0.08, bevelThickness: 0.06, bevelSegments: 3 });
  const uv = sg.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) + 1.8) / 3.6, (uv.getY(i) + 1.6) / 3.4);
  add(slice, sg, [std(0xffffff, 0.9, { map: crumbTex }), std(0xc8782a, 0.6)], [0, 1.6, 0]);
  return { scene, sky, items, yeast, body, mouth, sugars, co2, glutenBubbles, riseDough, oven, ovenWin, ovenLoaf, ovenGlow, slice };
}
