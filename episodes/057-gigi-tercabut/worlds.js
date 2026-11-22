// Episode 057 sets:
//  - the Episode 031 living room: Affan with a bitten apple (a little tooth
//    stuck in the bite), and later a toothbrush;
//  - the "x-ray" mouth stage: a child's arches with 20 milk teeth, an adult's
//    arches with 32 permanent teeth, a see-through gum-and-bone cross-section
//    where the permanent tooth pushes up, the milk root shortens, the milk
//    tooth wobbles out and the new tooth grows in, and a first-aid demo
//    (hold the crown, keep it in milk);
//  - the branded outro stage from Episode 005.
import * as THREE from 'three';
import { add, glow } from '../../shared/props.js';
import { buildOutro } from '../005-bulan-ikut-kereta/worlds.js';
import { buildLivingRoom } from '../031-geletek-diri-sendiri/worlds.js';

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

// a tooth: a lathed crown (y 0..0.8) and a cone root below (y 0..-1.2) that can shrink
const crownGeo = (() => {
  const pts = [[0.0, 0.0], [0.3, 0.0], [0.38, 0.18], [0.42, 0.4], [0.38, 0.62], [0.28, 0.76], [0.12, 0.82], [0.0, 0.83]].map(([x, y]) => new THREE.Vector2(x, y));
  return new THREE.LatheGeometry(pts, 24);
})();
const rootGeo = (() => {
  const g = new THREE.ConeGeometry(0.3, 1.2, 20, 1, true);
  g.rotateX(Math.PI);
  g.translate(0, -0.6, 0);
  return g;
})();
export function makeTooth(color = 0xfbfbf4) {
  const g = new THREE.Group();
  const mat = std(color, 0.25, { emissive: 0xfff6c0, emissiveIntensity: 0 });
  const crown = add(g, crownGeo, mat, [0, 0, 0], [0, 0, 0], [1, 1, 1], false);
  const root = add(g, rootGeo, std(0xf0e2c0, 0.5, { side: THREE.DoubleSide }), [0, 0, 0], [0, 0, 0], [0.92, 1, 0.92], false);
  return { g, crown, root, mat };
}

// an arch of teeth along a U-shaped curve, with a pink gum tube
function makeArch(parent, n, a, b, y, up, scale) {
  const g = new THREE.Group();
  g.position.y = y;
  parent.add(g);
  const pts = [];
  for (let i = 0; i <= 40; i++) {
    const th = -Math.PI / 2 + (i / 40) * Math.PI;
    pts.push(V3(a * Math.sin(th), 0, b * Math.cos(th) - b));
  }
  const curve = new THREE.CatmullRomCurve3(pts);
  add(g, new THREE.TubeGeometry(curve, 80, 0.38 * scale, 12), std(0xf08a9a, 0.55), [0, 0, 0], [0, 0, 0], [1, 0.7, 1], false);
  const teeth = [];
  for (let i = 0; i < n; i++) {
    const u = (i + 0.5) / n;
    const p = curve.getPointAt(u);
    const tg = curve.getTangentAt(u);
    const tooth = makeTooth();
    const mid = Math.abs(u - 0.5) * 2; // 0 at the front, 1 at the back
    const s = scale * (0.55 + 0.35 * mid);
    tooth.g.position.copy(p).add(V3(0, up ? 0.12 : -0.12, 0));
    tooth.g.scale.set(s * (1 + 0.6 * mid), s * 0.9, s);
    tooth.g.rotation.set(up ? Math.PI : 0, Math.atan2(tg.x, tg.z), 0, 'YXZ');
    tooth.root.visible = false;
    g.add(tooth.g);
    teeth.push(tooth);
  }
  return { g, teeth };
}

// ------------------------------------------------------------ living room
export const A_LR = V3(0.9, 0, 0.9);
export function buildRoom57() {
  const r = buildLivingRoom();
  r.kak.root.visible = false;
  const s = r.scene;
  // bitten apple with a little tooth stuck in the bite
  const apple = new THREE.Group();
  s.add(apple);
  add(apple, new THREE.SphereGeometry(0.26, 28, 20), std(0xe0303a, 0.35), [0, 0, 0], [0, 0, 0], [1, 0.92, 1]);
  add(apple, new THREE.CylinderGeometry(0.015, 0.02, 0.12, 6), std(0x6a4a2a, 0.7), [0, 0.27, 0], [0, 0, 0.2]);
  add(apple, new THREE.SphereGeometry(0.08, 10, 6), std(0x4caf50, 0.6), [0.07, 0.3, 0], [0, 0, -0.6], [1, 0.35, 0.6]);
  add(apple, new THREE.SphereGeometry(0.14, 20, 14), std(0xf6e6b0, 0.7), [0.0, 0.02, 0.17], [0, 0, 0], [1, 1.1, 0.55]);
  const bitTooth = makeTooth();
  bitTooth.root.visible = true;
  bitTooth.root.scale.y = 0.3;
  bitTooth.g.scale.setScalar(0.17);
  bitTooth.g.position.set(0.02, 0.06, 0.24);
  bitTooth.g.rotation.set(1.3, 0, 0.3);
  apple.add(bitTooth.g);
  // toothbrush
  const brush = new THREE.Group();
  s.add(brush);
  add(brush, new THREE.CylinderGeometry(0.03, 0.035, 0.5, 10), std(0x2f9bff, 0.4), [0, 0.25, 0]);
  add(brush, new THREE.BoxGeometry(0.06, 0.12, 0.04), std(0x2f9bff, 0.4), [0, 0.54, 0]);
  add(brush, new THREE.BoxGeometry(0.055, 0.1, 0.06), std(0xffffff, 0.8), [0, 0.54, 0.05]);
  add(brush, new THREE.SphereGeometry(0.035, 10, 8), std(0x7ad8ff, 0.3), [0, 0.56, 0.1], [0, 0, 0], [1.2, 1.2, 0.8]);
  brush.visible = false;
  return { ...r, apple, brush, bitTooth };
}

// ------------------------------------------------------------ mouth stage
export const BABY_AT = V3(0, 0, 0);
export const SEC_AT = V3(20, 0, 0);
export const ADULT_AT = V3(40, 0, 0);
export const DEMO_AT = V3(60, 0, 0);
export const GUM_TOP = 0.6;
export function buildStage() {
  const scene = new THREE.Scene();
  const sky = gradientSky(0x3a6ac8, 0x10204a);
  scene.add(sky);
  scene.add(new THREE.HemisphereLight(0xeef6ff, 0x2a3a6a, 1.4));
  const key = new THREE.DirectionalLight(0xffffff, 1.5);
  key.position.set(4, 10, 12);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x9adfff, 0.8);
  rim.position.set(-8, 4, -6);
  scene.add(rim);
  // child's mouth: 10 + 10 milk teeth
  const baby = new THREE.Group();
  baby.position.copy(BABY_AT);
  scene.add(baby);
  const bLow = makeArch(baby, 10, 2.2, 2.6, 0, false, 1.0);
  const bUp = makeArch(baby, 10, 2.3, 2.7, 3.6, true, 1.0);
  bLow.g.rotation.x = 0.6;
  bUp.g.rotation.x = -0.6;
  const babyTeeth = [...bUp.teeth, ...bLow.teeth];
  // adult's mouth: 16 + 16 permanent teeth
  const adult = new THREE.Group();
  adult.position.copy(ADULT_AT);
  scene.add(adult);
  const aLow = makeArch(adult, 16, 2.9, 3.4, 0, false, 1.05);
  const aUp = makeArch(adult, 16, 3.0, 3.5, 4.0, true, 1.05);
  aLow.g.rotation.x = 0.6;
  aUp.g.rotation.x = -0.6;
  const adultTeeth = [...aUp.teeth, ...aLow.teeth];

  // see-through cross-section: gum on top of bone, three teeth in a row
  const sec = new THREE.Group();
  sec.position.copy(SEC_AT);
  scene.add(sec);
  add(sec, new THREE.BoxGeometry(7.5, 1.4, 2.0), std(0xf08a9a, 0.6, { transparent: true, opacity: 0.5, depthWrite: false }), [0, GUM_TOP - 0.7, 0], [0, 0, 0], [1, 1, 1], false);
  add(sec, new THREE.BoxGeometry(7.5, 3.6, 2.0), std(0xe8d8b0, 0.8, { transparent: true, opacity: 0.4, depthWrite: false }), [0, -2.6, 0], [0, 0, 0], [1, 1, 1], false);
  const secTeeth = [-2.4, 0, 2.4].map((x) => {
    const t = makeTooth();
    t.g.position.set(x, GUM_TOP - 0.15, 0);
    t.g.scale.setScalar(1.25);
    sec.add(t.g);
    return t;
  });
  const perm = makeTooth(0xffffff);
  perm.g.scale.setScalar(1.6);
  sec.add(perm.g);
  // dark x-ray-ish glow behind
  const back = glow(0x6ab8ff, 14, 0.25);
  back.position.set(0, -1, -3);
  sec.add(back);

  // first-aid demo: a big tooth and a glass of milk
  const demo = new THREE.Group();
  demo.position.copy(DEMO_AT);
  scene.add(demo);
  const big = makeTooth(0xffffff);
  big.root.visible = true;
  big.g.scale.setScalar(1.5);
  demo.add(big.g);
  const glass = new THREE.Group();
  glass.position.set(1.6, -2.6, 0);
  demo.add(glass);
  add(glass, new THREE.CylinderGeometry(1.0, 0.9, 2.6, 28, 1, true), new THREE.MeshPhysicalMaterial({ color: 0xe8f6ff, roughness: 0.05, transparent: true, opacity: 0.3, depthWrite: false, side: THREE.DoubleSide }), [0, 1.3, 0], [0, 0, 0], [1, 1, 1], false);
  const milk = add(glass, new THREE.CylinderGeometry(0.95, 0.88, 1.9, 28), std(0xfdfcf6, 0.4, { transparent: true, opacity: 0.85 }), [0, 0.97, 0], [0, 0, 0], [1, 1, 1], false);
  add(glass, new THREE.CircleGeometry(0.95, 28), std(0xffffff, 0.3), [0, 1.93, 0], [-Math.PI / 2, 0, 0], [1, 1, 1], false);
  return { scene, sky, baby, adult, babyTeeth, adultTeeth, sec, secTeeth, perm, demo, big, glass, milk };
}
