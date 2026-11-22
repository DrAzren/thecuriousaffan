// Episode 055 sets:
//  - the Episode 044 park on a misty morning, with a dewy orb web between two
//    sticks next to Affan and a little spider in the middle;
//  - the macro garden: two branches with a gap; a spider sends out a bridge
//    thread on the wind, then builds the frame, the spokes and the sticky
//    spiral (every part is a thin tube that can be "drawn" bit by bit), and a
//    mosquito gets stuck; a big cut-away spider with glowing silk glands;
//    a strength test of a silk strand against a steel wire;
//  - the branded outro stage from Episode 005.
import * as THREE from 'three';
import { rng } from '../../shared/core.js';
import { add, glow, glowTex } from '../../shared/props.js';
import { buildPark, A_PK, PLAY_SCALE } from '../044-salji-malaysia/worlds.js';
import { buildOutro } from '../005-bulan-ikut-kereta/worlds.js';

export { buildOutro, A_PK, PLAY_SCALE };

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

// a tube that can be drawn progressively: set(k) shows the first k of it
function progTube(parent, pts, r, mat, seg = 64) {
  const geo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.0), seg, r, 5);
  const m = new THREE.Mesh(geo, mat);
  parent.add(m);
  const n = geo.index.count;
  m.userData.set = (k) => {
    m.visible = k > 0.001;
    geo.setDrawRange(0, Math.floor((n * Math.min(1, k)) / 6) * 6);
  };
  return m;
}

// ------------------------------------------------------------------ spider
// body along +x (head), up +y, legs out along +-z
export function makeSpider({ abdColor = 0xb88a4a, cut = false } = {}) {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const dark = std(0x3a2a22, 0.6);
  const head = add(body, new THREE.SphereGeometry(0.32, 20, 16), std(0x5a3e2e, 0.55), [0.3, 0.32, 0], [0, 0, 0], [1.1, 0.85, 1]);
  const abdMat = std(abdColor, 0.5, { transparent: true, opacity: 1 });
  const abdomen = add(body, new THREE.SphereGeometry(0.5, 24, 18), abdMat, [-0.42, 0.45, 0], [0, 0, 0.25], [1.25, 1, 1]);
  // pattern dots on the abdomen
  for (let i = 0; i < 5; i++) add(abdomen, new THREE.SphereGeometry(0.08, 10, 8), std(0xffe8b0, 0.5), [-0.2 + i * 0.1, 0.42, (i % 2 ? 1 : -1) * 0.12], [0, 0, 0], [1, 0.3, 1], false);
  // big cute eyes
  for (const z of [-1, 1]) {
    add(body, new THREE.SphereGeometry(0.11, 14, 12), std(0xffffff, 0.3), [0.58, 0.45, z * 0.12], [0, 0, 0], [1, 1, 1], false);
    add(body, new THREE.SphereGeometry(0.065, 12, 10), std(0x111118, 0.3), [0.66, 0.46, z * 0.12], [0, 0, 0], [1, 1, 1], false);
    add(body, new THREE.SphereGeometry(0.04, 10, 8), std(0x111118, 0.3), [0.55, 0.56, z * 0.25], [0, 0, 0], [1, 1, 1], false);
  }
  add(body, new THREE.TorusGeometry(0.07, 0.015, 6, 12, Math.PI), dark, [0.62, 0.27, 0], [0, Math.PI / 2, Math.PI], [1, 1, 1], false);
  // spinnerets
  const spin = add(body, new THREE.ConeGeometry(0.08, 0.16, 8), dark, [-1.03, 0.4, 0], [0, 0, Math.PI / 2], [1, 1, 1], false);
  // silk glands (visible when the abdomen is see-through)
  const glands = new THREE.Group();
  body.add(glands);
  const gMat = std(0x9ae8ff, 0.3, { emissive: 0x4ab8ff, emissiveIntensity: 0.8 });
  for (let i = 0; i < 5; i++) add(glands, new THREE.CapsuleGeometry(0.05, 0.3, 4, 8), gMat, [-0.5 - i * 0.05, 0.38 + (i - 2) * 0.07, (i - 2) * 0.08], [0, 0, Math.PI / 2 + (i - 2) * 0.15], [1, 1, 1], false);
  glands.visible = cut;
  // legs: hip -> knee
  const legs = [];
  for (const s of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      const hip = new THREE.Group();
      hip.position.set(0.42 - i * 0.14, 0.3, s * 0.18);
      body.add(hip);
      const a0 = (i - 1.5) * 0.45;
      hip.rotation.set(0, s > 0 ? -a0 : Math.PI + a0, 0);
      add(hip, new THREE.CylinderGeometry(0.04, 0.05, 0.6, 8), dark, [0, 0.18, 0.24], [0.9, 0, 0], [1, 1, 1], false);
      const knee = new THREE.Group();
      knee.position.set(0, 0.36, 0.48);
      hip.add(knee);
      add(knee, new THREE.CylinderGeometry(0.03, 0.04, 0.75, 8), dark, [0, -0.3, 0.16], [0.45, 0, 0], [1, 1, 1], false);
      legs.push({ hip, knee, s, i });
    }
  }
  const set = (t, { walk = 0 } = {}) => {
    legs.forEach((l) => {
      const ph = t * 10 + l.i * 1.6 + (l.s > 0 ? Math.PI : 0);
      l.knee.rotation.x = 0.25 * walk * Math.sin(ph);
      l.hip.rotation.x = 0.15 * walk * Math.max(0, Math.sin(ph + 1));
    });
    body.position.y = 0.03 * walk * Math.abs(Math.sin(t * 10));
  };
  set(0);
  return { root, body, head, abdomen, abdMat, glands, spin, legs, set };
}
// orient a spider so its belly faces -z and its head points along `up` (in the xy plane)
const _m = new THREE.Matrix4();
export function onWeb(spider, pos, headAngle = Math.PI / 2) {
  const x = V3(Math.cos(headAngle), Math.sin(headAngle), 0);
  const y = V3(0, 0, 1);
  const z = new THREE.Vector3().crossVectors(x, y);
  _m.makeBasis(x, y, z);
  spider.root.quaternion.setFromRotationMatrix(_m);
  spider.root.position.copy(pos);
}

// a mosquito
function makeMosquito() {
  const g = new THREE.Group();
  const m = std(0x3a3a44, 0.6);
  add(g, new THREE.CapsuleGeometry(0.06, 0.3, 4, 8), m, [0, 0, 0], [0, 0, Math.PI / 2], [1, 1, 1], false);
  add(g, new THREE.SphereGeometry(0.07, 10, 8), m, [0.22, 0, 0], [0, 0, 0], [1, 1, 1], false);
  add(g, new THREE.CylinderGeometry(0.008, 0.008, 0.25, 4), m, [0.38, -0.03, 0], [0, 0, Math.PI / 2 + 0.3], [1, 1, 1], false);
  const wm = new THREE.MeshBasicMaterial({ color: 0xe0f0ff, transparent: true, opacity: 0.6, side: THREE.DoubleSide });
  const wings = [-1, 1].map((s) => add(g, new THREE.PlaneGeometry(0.3, 0.1), wm, [0, 0.05, s * 0.14], [Math.PI / 2, 0, s * 0.3], [1, 1, 1], false));
  for (let i = 0; i < 6; i++) add(g, new THREE.CylinderGeometry(0.006, 0.006, 0.3, 4), m, [-0.05 + (i % 3) * 0.06, -0.1, (i < 3 ? -1 : 1) * 0.08], [(i < 3 ? -1 : 1) * 0.6, 0, 0], [1, 1, 1], false);
  g.userData.wings = wings;
  return g;
}

// ---------------------------------------------------------------- orb web
// in the xy plane of `parent`, centred at c, radius R. Pieces are progressive tubes.
export function makeWeb(parent, c, R, r, { frameMat, radMat, spiralMat, dots = true, seed = 1 } = {}) {
  const Rr = rng(seed);
  const N = 16;
  const rim = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    const rr = R * (1.08 + 0.12 * Rr());
    rim.push(V3(c.x + Math.cos(a) * rr, c.y + Math.sin(a) * rr, c.z));
  }
  const frame = progTube(parent, [...rim, rim[0]], r * 1.2, frameMat, 120);
  const radials = [];
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    const rr = R * (1.02 + 0.08 * Math.sin(i * 1.7));
    radials.push(progTube(parent, [c.clone(), V3(c.x + Math.cos(a) * rr * 0.5, c.y + Math.sin(a) * rr * 0.5, c.z), V3(c.x + Math.cos(a) * rr, c.y + Math.sin(a) * rr, c.z)], r, radMat, 10));
  }
  const sp = [];
  const turns = 9;
  for (let i = 0; i <= turns * 48; i++) {
    const u = i / (turns * 48);
    const a = -u * turns * Math.PI * 2;
    const rr = R * (0.95 - 0.8 * u);
    sp.push(V3(c.x + Math.cos(a) * rr, c.y + Math.sin(a) * rr, c.z + 0.002));
  }
  const spiral = progTube(parent, sp, r * 0.85, spiralMat, 600);
  let glue = null;
  if (dots) {
    const n = 220;
    glue = new THREE.InstancedMesh(new THREE.SphereGeometry(r * 2.2, 6, 4), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.05, transparent: true, opacity: 0.85, emissive: 0xffffff, emissiveIntensity: 0.25 }), n);
    const m4 = new THREE.Matrix4();
    for (let i = 0; i < n; i++) {
      const p = sp[Math.floor((i / n) * (sp.length - 1))];
      m4.makeTranslation(p.x, p.y, p.z + r);
      glue.setMatrixAt(i, m4);
    }
    glue.count = 0;
    parent.add(glue);
  }
  const set = ({ frame: f = 1, radials: rk = 1, spiral: s = 1 } = {}) => {
    frame.userData.set(f);
    radials.forEach((m, i) => m.userData.set(clamp01(rk * N - i)));
    spiral.userData.set(s);
    if (glue) glue.count = Math.floor(220 * s);
  };
  const spiralPoint = (k) => sp[Math.min(sp.length - 1, Math.floor(k * (sp.length - 1)))];
  set({ frame: 1, radials: 1, spiral: 1 });
  return { set, frame, radials, spiral, glue, rim, spiralPoint, center: c, R };
}
const clamp01 = (x) => Math.min(1, Math.max(0, x));

// ------------------------------------------------------------------ park
export const WEB_AT = V3(A_PK.x - 1.55, 1.45, A_PK.z + 0.35);
export function buildPark55() {
  const w = buildPark();
  w.setSnow(0, 0);
  const s = w.scene;
  const wood = std(0x7a5a3a, 0.9);
  for (const dx of [-0.85, 0.85]) add(s, new THREE.CylinderGeometry(0.04, 0.05, 2.4, 8), wood, [WEB_AT.x + dx, 1.2, WEB_AT.z], [0, 0, dx * 0.1]);
  const silk = new THREE.MeshStandardMaterial({ color: 0xf6faff, roughness: 0.2, emissive: 0xffffff, emissiveIntensity: 0.35 });
  const web = makeWeb(s, WEB_AT, 0.62, 0.004, { frameMat: silk, radMat: silk, spiralMat: silk, seed: 55 });
  // dew drops
  const dewMat = new THREE.SpriteMaterial({ map: glowTex, color: 0xeaf6ff, transparent: true, opacity: 0.9, depthWrite: false });
  const R = rng(551);
  const dew = Array.from({ length: 40 }, () => {
    const p = new THREE.Sprite(dewMat);
    const a = R() * Math.PI * 2, rr = 0.15 + R() * 0.5;
    p.position.set(WEB_AT.x + Math.cos(a) * rr, WEB_AT.y + Math.sin(a) * rr, WEB_AT.z + 0.01);
    p.scale.setScalar(0.03 + R() * 0.03);
    p.userData.ph = R() * 6;
    s.add(p);
    return p;
  });
  const spider = makeSpider();
  spider.root.scale.setScalar(0.1);
  s.add(spider.root);
  onWeb(spider, WEB_AT.clone().add(V3(0, 0, 0.02)));
  // morning mist
  const mistMat = new THREE.SpriteMaterial({ map: glowTex, color: 0xffffff, transparent: true, opacity: 0.18, depthWrite: false });
  for (let i = 0; i < 10; i++) {
    const m = new THREE.Sprite(mistMat);
    m.position.set(A_PK.x - 6 + R() * 12, 0.6 + R() * 1.2, A_PK.z - 3 - R() * 6);
    m.scale.setScalar(4 + R() * 3);
    s.add(m);
  }
  return { ...w, web, dew, spider };
}

// ---------------------------------------------------------------- macro
export const MW = V3(0, 2.0, 0); // macro web centre
export const MR = 2.3;
export const BIG_AT = V3(16, 0, 0); // big cut-away spider
export const TEST_AT = V3(32, 0, 0); // strength test
export function buildMacro() {
  const scene = new THREE.Scene();
  const sky = gradientSky(0xcfe8c0, 0x5a8a4a);
  scene.add(sky);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x3a5a2a, 1.4));
  const key = new THREE.DirectionalLight(0xfff4e0, 1.5);
  key.position.set(3, 8, 10);
  scene.add(key);
  const R = rng(5500);
  const bokMat = new THREE.SpriteMaterial({ map: glowTex, color: 0xf0ffd8, transparent: true, opacity: 0.32, depthWrite: false });
  for (let i = 0; i < 70; i++) {
    const b = new THREE.Sprite(bokMat);
    b.position.set(-10 + R() * 54, -4 + R() * 12, -8 - R() * 6);
    b.scale.setScalar(1 + R() * 2.5);
    scene.add(b);
  }
  // branches either side of the gap
  const bark = std(0x6a4a2e, 0.9);
  const brL = progTube(scene, [V3(-4.2, -3, -0.2), V3(-3.6, 1, -0.1), V3(-3.1, 4.6, 0), V3(-2.6, 7, 0)], 0.22, bark, 40);
  const brR = progTube(scene, [V3(4.2, -3, -0.2), V3(3.7, 1.2, -0.1), V3(3.2, 4.6, 0), V3(2.8, 7, 0)], 0.22, bark, 40);
  brL.userData.set(1);
  brR.userData.set(1);
  for (let i = 0; i < 6; i++) add(scene, new THREE.PlaneGeometry(1.2, 0.6), std(0x3a9a3a, 0.7, { side: THREE.DoubleSide }), [(i % 2 ? 3.3 : -3.5) + (R() - 0.5), 1 + i * 0.9, -0.2], [0.3, 0, (i % 2 ? 1 : -1) * 0.5], [1, 1, 1], false);
  const frameMat = new THREE.MeshStandardMaterial({ color: 0xf6faff, roughness: 0.3, emissive: 0xffffff, emissiveIntensity: 0.3 });
  const radMat = new THREE.MeshStandardMaterial({ color: 0xf6faff, roughness: 0.3, emissive: 0xffffff, emissiveIntensity: 0.3 });
  const spiralMat = new THREE.MeshStandardMaterial({ color: 0xf6faff, roughness: 0.3, emissive: 0xffffff, emissiveIntensity: 0.3 });
  const web = makeWeb(scene, MW, MR, 0.018, { frameMat, radMat, spiralMat, seed: 56 });
  // the bridge thread: floats on the wind then catches the far branch
  const bridgeMat = frameMat;
  const bridge = new THREE.Mesh(new THREE.BufferGeometry(), bridgeMat);
  scene.add(bridge);
  const wind = Array.from({ length: 14 }, () => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xffffff, transparent: true, opacity: 0.5, depthWrite: false }));
    s.visible = false;
    scene.add(s);
    return s;
  });
  const spider = makeSpider();
  spider.root.scale.setScalar(0.5);
  scene.add(spider.root);
  const mosq = makeMosquito();
  mosq.scale.setScalar(1.4);
  scene.add(mosq);
  // big cut-away spider
  const big = makeSpider({ cut: true });
  big.root.scale.setScalar(2.2);
  big.root.position.copy(BIG_AT);
  big.root.rotation.y = -0.5;
  scene.add(big.root);
  const thread = new THREE.Mesh(new THREE.BufferGeometry(), frameMat);
  scene.add(thread);
  const drop = add(scene, new THREE.SphereGeometry(0.18, 16, 12), std(0x9ae8ff, 0.1, { emissive: 0x4ab8ff, emissiveIntensity: 0.6, transparent: true, opacity: 0.85 }), [0, 0, 0], [0, 0, 0], [1, 1.2, 1], false);
  drop.visible = false;
  // strength test: a bar with two strands and weights
  const test = new THREE.Group();
  test.position.copy(TEST_AT);
  scene.add(test);
  add(test, new THREE.BoxGeometry(5, 0.3, 0.4), std(0x8a6a4a, 0.7), [0, 5, 0]);
  const silkS = add(test, new THREE.CylinderGeometry(0.03, 0.03, 3, 8), frameMat, [-1.2, 3.5, 0], [0, 0, 0], [1, 1, 1], false);
  const steelS = add(test, new THREE.CylinderGeometry(0.03, 0.03, 3, 8), std(0x9aa4b4, 0.3, { metalness: 0.8 }), [1.2, 3.5, 0], [0, 0, 0], [1, 1, 1], false);
  const steelTop = add(test, new THREE.CylinderGeometry(0.03, 0.03, 1.4, 8), std(0x9aa4b4, 0.3, { metalness: 0.8 }), [1.2, 4.2, 0], [0, 0, 0], [1, 1, 1], false);
  steelTop.visible = false;
  const wM = std(0x4a5468, 0.5);
  const wSilk = add(test, new THREE.CylinderGeometry(0.55, 0.55, 0.7, 20), wM, [-1.2, 1.65, 0]);
  const wSteel = add(test, new THREE.CylinderGeometry(0.55, 0.55, 0.7, 20), wM, [1.2, 1.65, 0]);
  add(test, new THREE.BoxGeometry(8, 0.2, 3), std(0xb8a888, 0.9), [0, -0.1, 0]);
  return { scene, sky, web, frameMat, radMat, spiralMat, bridge, wind, spider, mosq, big, thread, drop, test, silkS, steelS, steelTop, wSilk, wSteel };
}
