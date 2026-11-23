// Episode 060 sets:
//  - the Episode 038 kitchen with Mama: Affan with a red horseshoe magnet and
//    paper clips on the counter that jump up to it; fridge magnets on the door;
//  - the "magnet lab": a see-through bar magnet full of tiny arrows all
//    pointing the same way, two bar magnets with N/S poles (U/S in Malay)
//    that pull or push, an iron block whose jumbled arrows line up when a
//    magnet comes near, a plastic block and a wooden block that stay put;
//  - the Earth as a giant magnet with field loops and a big compass;
//  - the branded outro stage from Episode 005.
import * as THREE from 'three';
import { rng } from '../../shared/core.js';
import { add, glow } from '../../shared/props.js';
import { buildOutro, RoundedBoxGeometry } from '../005-bulan-ikut-kereta/worlds.js';
import { buildKitchen, ISLAND_TOP, FRIDGE } from '../038-bawang-menangis/worlds.js';

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
function letterTex(ch, bg) {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = bg;
  g.fillRect(0, 0, 256, 256);
  g.fillStyle = '#ffffff';
  g.font = '800 190px "Baloo 2", Fredoka, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(ch, 128, 140);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const RED = 0xe8404a, BLUE = 0x3a7ae8;

// a little arrow (points along +x)
export function makeArrow(color = 0xffffff, s = 1) {
  const g = new THREE.Group();
  const m = std(color, 0.4, { emissive: color, emissiveIntensity: 0.35 });
  add(g, new THREE.CylinderGeometry(0.035 * s, 0.035 * s, 0.32 * s, 8), m, [-0.04 * s, 0, 0], [0, 0, Math.PI / 2], [1, 1, 1], false);
  add(g, new THREE.ConeGeometry(0.09 * s, 0.18 * s, 10), m, [0.2 * s, 0, 0], [0, 0, -Math.PI / 2], [1, 1, 1], false);
  return g;
}

// a bar magnet: N (U) half red at +x, S half blue at -x
export function makeBar(len = 3.2, h = 0.9, see = false) {
  const g = new THREE.Group();
  const op = see ? { transparent: true, opacity: 0.35, depthWrite: false } : {};
  add(g, new RoundedBoxGeometry(len / 2, h, h, 3, 0.08), std(RED, 0.45, op), [len / 4, 0, 0]);
  add(g, new RoundedBoxGeometry(len / 2, h, h, 3, 0.08), std(BLUE, 0.45, op), [-len / 4, 0, 0]);
  const lm = (ch, bg) => new THREE.MeshBasicMaterial({ map: letterTex(ch, bg), transparent: see, opacity: see ? 0.85 : 1 });
  const U = lm('U', '#e8404a'), S = lm('S', '#3a7ae8');
  add(g, new THREE.PlaneGeometry(h * 0.7, h * 0.7), U, [len / 4, h / 2 + 0.005, 0], [-Math.PI / 2, 0, 0], [1, 1, 1], false);
  add(g, new THREE.PlaneGeometry(h * 0.7, h * 0.7), S, [-len / 4, h / 2 + 0.005, 0], [-Math.PI / 2, 0, 0], [1, 1, 1], false);
  add(g, new THREE.PlaneGeometry(h * 0.7, h * 0.7), U, [len / 4, 0, h / 2 + 0.005], [0, 0, 0], [1, 1, 1], false);
  add(g, new THREE.PlaneGeometry(h * 0.7, h * 0.7), S, [-len / 4, 0, h / 2 + 0.005], [0, 0, 0], [1, 1, 1], false);
  return g;
}

// ---------------------------------------------------------------- kitchen
export const CLIPS_AT = V3(1.2, ISLAND_TOP, -0.72);
export function buildKitchen60() {
  const k = buildKitchen();
  for (const o of [k.onion, k.knife, k.shine, k.coldOnion, ...k.pieces, ...k.tears]) if (o) o.visible = false;
  const s = k.scene;
  const rf = new THREE.DirectionalLight(0xfff2e6, 1.1);
  rf.position.set(-0.5, 3.0, -4.0);
  rf.target.position.set(1.75, 1.4, -0.35);
  s.add(rf, rf.target);
  // paper clips
  const clipM = std(0xd8dce4, 0.25, { metalness: 0.8 });
  const R = rng(60);
  const clips = Array.from({ length: 7 }, (_, i) => {
    const c = new THREE.Group();
    add(c, new THREE.TorusGeometry(0.03, 0.006, 6, 18), clipM, [0, 0, 0], [0, 0, 0], [2.2, 1, 1], false);
    add(c, new THREE.TorusGeometry(0.02, 0.006, 6, 18), clipM, [0.01, 0, 0], [0, 0, 0], [2.2, 1, 1], false);
    c.scale.setScalar(1.3);
    c.userData = { home: V3(CLIPS_AT.x + (R() - 0.5) * 0.45, ISLAND_TOP + 0.008, CLIPS_AT.z + (R() - 0.5) * 0.3), rot: R() * 6, ph: R() };
    s.add(c);
    return c;
  });
  // a red horseshoe magnet with silver tips (follows Affan's hand)
  const mag = new THREE.Group();
  s.add(mag);
  add(mag, new THREE.TorusGeometry(0.1, 0.035, 10, 24, Math.PI), std(RED, 0.4), [0, 0, 0]);
  for (const x of [-0.1, 0.1]) {
    add(mag, new THREE.CylinderGeometry(0.035, 0.035, 0.08, 12), std(RED, 0.4), [x, -0.04, 0]);
    add(mag, new THREE.CylinderGeometry(0.036, 0.036, 0.05, 12), std(0xd8dce4, 0.25, { metalness: 0.8 }), [x, -0.105, 0]);
  }
  const magGlow = glow(0xb090ff, 0.6, 0);
  magGlow.position.set(0, -0.14, 0);
  mag.add(magGlow);
  // fridge magnets
  const fm = [[0xffcf33, -0.3, 2.3], [0x4caf50, 0.2, 2.6], [0xff6a9a, 0.35, 1.9], [0x2f9bff, -0.2, 1.6]];
  for (const [c, x, y] of fm) add(s, new THREE.CylinderGeometry(0.1, 0.1, 0.05, 18), std(c, 0.4), [FRIDGE.x + x, y, FRIDGE.z + 0.71], [Math.PI / 2, 0, 0]);
  return { ...k, clips, mag, magGlow };
}

// --------------------------------------------------------------- magnet lab
export const LAB_BAR = V3(0, 2.0, 0);
export const POLES_AT = V3(14, 2.0, 0);
export const IRON_AT = V3(28, 2.0, 0);
export const EARTH_AT = V3(46, 2.5, 0);
export function buildLab() {
  const scene = new THREE.Scene();
  const sky = gradientSky(0x6a5ad8, 0x1a1a5a);
  scene.add(sky);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x3a3a7a, 1.4));
  const key = new THREE.DirectionalLight(0xffffff, 1.5);
  key.position.set(4, 9, 10);
  scene.add(key);
  // 1) a see-through bar magnet full of tiny arrows, all the same way
  const bar = makeBar(5.0, 1.8, true);
  bar.position.copy(LAB_BAR);
  scene.add(bar);
  const domains = [];
  for (let i = 0; i < 9; i++) for (let j = 0; j < 4; j++) {
    const a = makeArrow(0xffffff, 0.8);
    a.position.set(-2.1 + i * 0.52, -0.55 + j * 0.37, 0);
    bar.add(a);
    domains.push(a);
  }
  // 2) two bar magnets for pull / push
  const pA = makeBar(2.6, 0.8);
  const pB = makeBar(2.6, 0.8);
  scene.add(pA, pB);
  // 3) iron block with jumbled arrows; plastic and wood blocks
  const iron = new THREE.Group();
  iron.position.copy(IRON_AT);
  scene.add(iron);
  add(iron, new RoundedBoxGeometry(2.4, 1.6, 1.0, 3, 0.08), std(0x8a94a8, 0.4, { metalness: 0.5, transparent: true, opacity: 0.55, depthWrite: false }));
  const R = rng(600);
  const ironArrows = [];
  for (let i = 0; i < 5; i++) for (let j = 0; j < 3; j++) {
    const a = makeArrow(0xffe080, 0.75);
    a.position.set(-0.9 + i * 0.45, -0.45 + j * 0.45, 0.1);
    a.userData.rand = (R() - 0.5) * Math.PI * 2;
    iron.add(a);
    ironArrows.push(a);
  }
  const big = makeBar(2.6, 0.8);
  scene.add(big);
  const plastic = add(scene, new RoundedBoxGeometry(1.0, 0.8, 0.8, 3, 0.1), std(0x4cd07a, 0.3), [0, 0, 0]);
  const wood = add(scene, new RoundedBoxGeometry(1.0, 0.8, 0.8, 3, 0.06), std(0xb8844a, 0.8), [0, 0, 0]);
  // 4) the Earth as a giant magnet, with field loops and a compass
  const earth = new THREE.Group();
  earth.position.copy(EARTH_AT);
  scene.add(earth);
  const et = (() => {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 256;
    const g = c.getContext('2d');
    g.fillStyle = '#2f7be0';
    g.fillRect(0, 0, 512, 256);
    g.fillStyle = '#4cb85a';
    const blobs = [[90, 80, 60, 40], [130, 160, 35, 55], [260, 70, 45, 35], [280, 150, 40, 55], [360, 80, 90, 45], [420, 175, 35, 22]];
    for (const [x, y, rx, ry] of blobs) {
      g.beginPath();
      g.ellipse(x, y, rx, ry, 0.3, 0, Math.PI * 2);
      g.fill();
    }
    g.fillStyle = '#f4faff';
    g.fillRect(0, 0, 512, 18);
    g.fillRect(0, 238, 512, 18);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  })();
  const globe = add(earth, new THREE.SphereGeometry(1.4, 40, 28), std(0xffffff, 0.6, { map: et }));
  const loopM = new THREE.MeshBasicMaterial({ color: 0xffd860, transparent: true, opacity: 0.85 });
  const loops = [];
  for (const L of [2.0, 2.8, 3.8]) for (let k = 0; k < 6; k++) {
    const phi = (k / 6) * Math.PI * 2;
    const pts = [];
    for (let i = 0; i <= 60; i++) {
      const th = 0.12 + (i / 60) * (Math.PI - 0.24);
      const r = L * Math.sin(th) ** 2;
      if (r < 1.38) continue;
      pts.push(V3(r * Math.sin(th) * Math.cos(phi), r * Math.cos(th), r * Math.sin(th) * Math.sin(phi)));
    }
    if (pts.length < 4) continue;
    const tube = add(earth, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, 0.025, 6), loopM, [0, 0, 0], [0, 0, 0], [1, 1, 1], false);
    tube.geometry.setDrawRange(0, 0);
    loops.push(tube);
  }
  const compass = new THREE.Group();
  compass.position.set(EARTH_AT.x + 2.1, EARTH_AT.y - 2.9, 1.2);
  scene.add(compass);
  add(compass, new THREE.CylinderGeometry(0.9, 0.9, 0.18, 36), std(0xd8b04a, 0.3, { metalness: 0.6 }), [0, 0, 0], [Math.PI / 2, 0, 0]);
  add(compass, new THREE.CylinderGeometry(0.78, 0.78, 0.2, 36), std(0xfffbf0, 0.5), [0, 0, 0.01], [Math.PI / 2, 0, 0]);
  const needle = new THREE.Group();
  needle.position.z = 0.14;
  compass.add(needle);
  add(needle, new THREE.ConeGeometry(0.1, 0.65, 4), std(RED, 0.4), [0, 0.32, 0], [0, 0, 0], [1, 1, 0.3], false);
  add(needle, new THREE.ConeGeometry(0.1, 0.65, 4), std(0x8a94a8, 0.4), [0, -0.32, 0], [0, 0, Math.PI], [1, 1, 0.3], false);
  add(needle, new THREE.SphereGeometry(0.06, 10, 8), std(0x333333, 0.4), [0, 0, 0.03], [0, 0, 0], [1, 1, 1], false);
  return { scene, sky, bar, domains, pA, pB, iron, ironArrows, big, plastic, wood, earth, globe, loops, compass, needle };
}
