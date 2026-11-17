// Episode 048 sets:
//  - an airport: runway, terminal, control tower, a viewing deck with a railing
//    where Affan watches a big passenger plane taxi (and later take off);
//    a herd of 100 elephants (one instanced mesh) for "as heavy as 100 elephants";
//  - the open sky: the plane flying through clouds with the four force arrows
//    (weight, drag, thrust, lift);
//  - a wind tunnel: a wing cross-section (airfoil) at a small angle, with air
//    streamlines bending over and under it and being pushed down behind it;
//  - the Episode 031 living room for the paper-strip blowing demo;
//  - a plane cabin with Affan in a window seat and a seatbelt;
//  - the branded outro stage from Episode 005.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { rng } from '../../shared/core.js';
import { makeAffan } from '../../shared/affan.js';
import { add, glowTex, makeTree } from '../../shared/props.js';
import { buildOutro, RoundedBoxGeometry } from '../005-bulan-ikut-kereta/worlds.js';
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
      void main(){ gl_FragColor = vec4(mix(bot, top, smoothstep(-0.2, 0.6, vP.y)), 1.0);
        #include <colorspace_fragment>
      }`,
  });
  const m = new THREE.Mesh(new THREE.SphereGeometry(900, 32, 16), mat);
  m.renderOrder = -10;
  return m;
}

// ----------------------------------------------------------------- the plane
// Faces +x. Length ~6.2, wingspan ~7.6, fuselage radius 0.55 (scale it up).
// root -> pitch (pivots about the main gear) -> body
export function makePlane() {
  const root = new THREE.Group();
  const pitch = new THREE.Group();
  const GX = -0.2;
  pitch.position.set(GX, 0, 0);
  root.add(pitch);
  const body = new THREE.Group();
  body.position.set(-GX, 0.95, 0);
  pitch.add(body);
  const white = std(0xf6f8fc, 0.35);
  const blue = std(0x2f6fff, 0.4);
  const grey = std(0xb8c0cc, 0.4);
  const dark = std(0x1a2438, 0.3);
  add(body, new THREE.CapsuleGeometry(0.55, 5.0, 10, 28), white, [0, 0, 0], [0, 0, Math.PI / 2], [1, 1, 0.95]);
  // nose shading and cockpit windows
  add(body, new THREE.SphereGeometry(0.2, 12, 8), dark, [2.9, 0.18, 0.22], [0, 0, 0], [0.7, 0.5, 1]);
  add(body, new THREE.SphereGeometry(0.2, 12, 8), dark, [2.9, 0.18, -0.22], [0, 0, 0], [0.7, 0.5, 1]);
  // livery stripe and windows
  for (const s of [-1, 1]) {
    add(body, new THREE.BoxGeometry(5.0, 0.1, 0.02), blue, [-0.1, -0.12, s * 0.53], [0, 0, 0], [1, 1, 1], false);
    for (let i = 0; i < 16; i++) add(body, new THREE.SphereGeometry(0.06, 10, 8), dark, [2.2 - i * 0.28, 0.14, s * 0.52], [0, 0, 0], [1, 1.2, 0.4], false);
  }
  // wings (swept), engines
  const wingShape = new THREE.Shape();
  wingShape.moveTo(0.7, 0);
  wingShape.lineTo(-0.7, 0);
  wingShape.lineTo(-1.6, 3.6);
  wingShape.lineTo(-1.05, 3.6);
  wingShape.closePath();
  const wingGeo = new THREE.ExtrudeGeometry(wingShape, { depth: 0.1, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 2 });
  const wings = [];
  for (const s of [-1, 1]) {
    const w = add(body, wingGeo, grey, [0.2, -0.25, s * 0.3], [s * Math.PI / 2 - 0.06 * s, 0, 0], [1, s, 1]);
    wings.push(w);
    const eng = new THREE.Group();
    eng.position.set(0.55, -0.62, s * 1.55);
    body.add(eng);
    add(eng, new THREE.CylinderGeometry(0.26, 0.24, 1.0, 20), white, [0, 0, 0], [0, 0, Math.PI / 2]);
    add(eng, new THREE.CircleGeometry(0.22, 20), dark, [0.51, 0, 0], [0, Math.PI / 2, 0], [1, 1, 1], false);
    add(eng, new THREE.BoxGeometry(0.5, 0.25, 0.06), grey, [0.1, 0.25, 0]);
  }
  // tail fin and stabilisers
  const fin = new THREE.Shape();
  fin.moveTo(0, 0);
  fin.lineTo(-1.1, 0);
  fin.lineTo(-1.3, 1.5);
  fin.lineTo(-0.85, 1.5);
  fin.closePath();
  add(body, new THREE.ExtrudeGeometry(fin, { depth: 0.08, bevelEnabled: false }), blue, [-1.7, 0.3, -0.04]);
  const stab = new THREE.Shape();
  stab.moveTo(0, 0);
  stab.lineTo(-0.7, 0);
  stab.lineTo(-1.0, 1.3);
  stab.lineTo(-0.7, 1.3);
  stab.closePath();
  const stabGeo = new THREE.ExtrudeGeometry(stab, { depth: 0.06, bevelEnabled: false });
  for (const s of [-1, 1]) add(body, stabGeo, grey, [-2.2, 0.15, s * 0.2], [s * Math.PI / 2, 0, 0], [1, s, 1]);
  // landing gear
  const gear = new THREE.Group();
  body.add(gear);
  const tyre = std(0x22242a, 0.8);
  for (const [x, z] of [[2.0, 0], [-0.2, 0.45], [-0.2, -0.45]]) {
    add(gear, new THREE.CylinderGeometry(0.04, 0.04, 0.5, 8), grey, [x, -0.55, z]);
    add(gear, new THREE.CylinderGeometry(0.2, 0.2, 0.14, 16), tyre, [x, -0.75, z], [Math.PI / 2, 0, 0]);
  }
  // engine glow (for "engines push forward")
  const flames = [-1, 1].map((s) => {
    const g = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0x9ad8ff, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
    g.position.set(-0.1, -0.62, s * 1.55);
    g.scale.set(1.2, 0.6, 1);
    body.add(g);
    return g;
  });
  return { root, pitch, body, gear, wings, flames };
}

// --------------------------------------------------------------- force arrows
export function makeArrow(color) {
  const g = new THREE.Group();
  const mat = std(color, 0.4, { emissive: color, emissiveIntensity: 0.45 });
  const shaft = add(g, new THREE.CylinderGeometry(0.14, 0.14, 1, 14), mat, [0, 0.5, 0], [0, 0, 0], [1, 1, 1], false);
  const head = add(g, new THREE.ConeGeometry(0.38, 0.6, 18), mat, [0, 1.3, 0], [0, 0, 0], [1, 1, 1], false);
  const up = V3(0, 1, 0);
  return {
    g,
    set(len, dir, w = 1) {
      g.visible = len > 0.02;
      const L = Math.max(0.02, len);
      shaft.scale.set(w, L, w);
      shaft.position.y = L / 2;
      head.scale.setScalar(w);
      head.position.y = L + 0.3 * w;
      g.quaternion.setFromUnitVectors(up, dir.clone().normalize());
    },
  };
}

// -------------------------------------------------------------------- clouds
function makeCloud(R, s = 1) {
  const g = new THREE.Group();
  const mat = std(0xffffff, 1, { emissive: 0xdde8ff, emissiveIntensity: 0.35 });
  const n = 5 + Math.floor(R() * 3);
  for (let i = 0; i < n; i++) add(g, new THREE.SphereGeometry(1, 16, 12), mat, [(i - n / 2) * 0.9 + R() * 0.3, R() * 0.5, (R() - 0.5) * 0.8], [0, 0, 0], [0.9 + R() * 0.6, 0.7 + R() * 0.4, 0.8], false);
  g.scale.setScalar(s);
  return g;
}

// ------------------------------------------------------------------- airport
export const PLANE_S = 2.5;
export const A_AP = V3(2.0, 0, 15.4);
export const RAIL_Z = 14.2;
export function buildAirport() {
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xcfe6ff, 80, 420);
  const sky = gradientSky(0x4aa0ff, 0xe8f4ff);
  scene.add(sky);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x6a8a5a, 1.25));
  const key = new THREE.DirectionalLight(0xfff4e0, 1.8);
  key.position.set(30, 60, 40);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -40, right: 40, top: 40, bottom: -40, near: 1, far: 200 });
  scene.add(key);
  scene.add(key.target);
  add(scene, new THREE.PlaneGeometry(3000, 3000), std(0x7ab85a, 0.95), [0, 0, 0], [-Math.PI / 2, 0, 0], [1, 1, 1], false).receiveShadow = true;
  // runway along x
  add(scene, new THREE.PlaneGeometry(1600, 16), std(0x3a3f4a, 0.9), [0, 0.01, 0], [-Math.PI / 2, 0, 0], [1, 1, 1], false).receiveShadow = true;
  const lineMat = std(0xf6f6f0, 0.6);
  for (const z of [-7.4, 7.4]) add(scene, new THREE.PlaneGeometry(1600, 0.3), lineMat, [0, 0.02, z], [-Math.PI / 2, 0, 0], [1, 1, 1], false);
  for (let x = -400; x < 800; x += 10) add(scene, new THREE.PlaneGeometry(5, 0.35), lineMat, [x, 0.02, 0], [-Math.PI / 2, 0, 0], [1, 1, 1], false);
  // apron (concrete) between runway and the viewing deck
  add(scene, new THREE.PlaneGeometry(1600, 5), std(0xb8bcc0, 0.9), [0, 0.008, 10.5], [-Math.PI / 2, 0, 0], [1, 1, 1], false);
  // viewing deck and railing
  add(scene, new THREE.BoxGeometry(30, 0.3, 6), std(0xd8d0c0, 0.8), [2, 0.0, RAIL_Z + 2.9]);
  const railMat = std(0x5a6478, 0.4);
  for (let x = -12; x <= 16; x += 2) add(scene, new THREE.CylinderGeometry(0.06, 0.06, 1.3, 8), railMat, [x, 0.65, RAIL_Z]);
  for (const y of [0.7, 1.25]) add(scene, new THREE.CylinderGeometry(0.05, 0.05, 28, 8), railMat, [2, y, RAIL_Z], [0, 0, Math.PI / 2]);
  // terminal and control tower
  const term = new THREE.Group();
  term.position.set(-10, 0, -34);
  scene.add(term);
  add(term, new THREE.BoxGeometry(40, 7, 10), std(0xe8ecf2, 0.6), [0, 3.5, 0]);
  add(term, new THREE.BoxGeometry(40.2, 2.4, 10.2), std(0x5a9ae0, 0.15, { emissive: 0x1a3a6a, emissiveIntensity: 0.3 }), [0, 4.2, 0]);
  add(term, new THREE.BoxGeometry(42, 0.6, 12), std(0xc0c6d0, 0.5), [0, 7.3, 0]);
  const tower = new THREE.Group();
  tower.position.set(26, 0, -30);
  scene.add(tower);
  add(tower, new THREE.CylinderGeometry(1.1, 1.5, 16, 20), std(0xe8ecf2, 0.6), [0, 8, 0]);
  add(tower, new THREE.CylinderGeometry(2.6, 2.0, 2.4, 20), std(0x5a9ae0, 0.15, { emissive: 0x1a3a6a, emissiveIntensity: 0.3 }), [0, 17.2, 0]);
  add(tower, new THREE.CylinderGeometry(2.9, 2.9, 0.4, 20), std(0xc0c6d0, 0.5), [0, 18.6, 0]);
  const R = rng(48);
  for (let i = 0; i < 40; i++) {
    const tr = makeTree(R, { scale: 1.6 + R() * 1.2 });
    tr.position.set(-140 + i * 7 + R() * 3, 0, -48 - R() * 14);
    scene.add(tr);
  }
  for (let i = 0; i < 7; i++) add(scene, new THREE.SphereGeometry(1, 24, 12), std(0x5a8a6a, 1), [-260 + i * 90, 0, -260 - R() * 60], [0, 0, 0], [70 + R() * 30, 30 + R() * 25, 40], false);
  for (let i = 0; i < 10; i++) {
    const c = makeCloud(R, 5 + R() * 4);
    c.position.set(-200 + i * 45, 60 + R() * 30, -200 - R() * 100);
    scene.add(c);
  }
  // the plane
  const plane = makePlane();
  plane.root.scale.setScalar(PLANE_S);
  plane.root.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  scene.add(plane.root);
  // 100 elephants (instanced)
  const parts = [];
  const push = (geo, pos, rot = [0, 0, 0], sc = [1, 1, 1]) => {
    const m = new THREE.Matrix4().compose(V3(...pos), new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot)), V3(...sc));
    parts.push(geo.toNonIndexed().applyMatrix4(m));
  };
  push(new THREE.SphereGeometry(1, 16, 12), [0, 0.78, 0], [0, 0, 0], [0.55, 0.42, 0.4]);
  push(new THREE.SphereGeometry(0.32, 14, 10), [0.55, 0.98, 0]);
  for (const s of [-1, 1]) push(new THREE.CylinderGeometry(0.28, 0.28, 0.05, 16), [0.45, 1.0, s * 0.3], [Math.PI / 2, 0, 0], [0.9, 1, 1.1]);
  push(new THREE.CylinderGeometry(0.05, 0.08, 0.6, 10), [0.82, 0.68, 0], [0, 0, 0.25]);
  for (const [x, z] of [[0.3, 0.2], [0.3, -0.2], [-0.3, 0.2], [-0.3, -0.2]]) push(new THREE.CylinderGeometry(0.12, 0.12, 0.55, 10), [x, 0.27, z]);
  for (const g of parts) for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
  const eGeo = mergeGeometries(parts);
  const herd = new THREE.InstancedMesh(eGeo, std(0x9aa0ae, 0.85), 100);
  herd.castShadow = true;
  const herdHome = [];
  for (let i = 0; i < 100; i++) {
    const r = Math.floor(i / 10), c = i % 10;
    herdHome.push({ x: -8.5 + c * 1.9 + (R() - 0.5) * 0.3, z: 9.0 + r * 0.0, row: r, ry: (R() - 0.5) * 0.4 });
  }
  scene.add(herd);
  return { scene, sky, key, plane, herd, herdHome, aff: (() => { const a = makeAffan(); scene.add(a.root); a.root.traverse((o) => { if (o.isMesh) o.castShadow = true; }); return a; })() };
}

// ----------------------------------------------------------------------- sky
export function buildSkyWorld() {
  const scene = new THREE.Scene();
  const sky = gradientSky(0x2a7aff, 0xdff0ff);
  scene.add(sky);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8ab0e0, 1.4));
  const key = new THREE.DirectionalLight(0xfff4e0, 1.6);
  key.position.set(10, 20, 15);
  scene.add(key);
  const R = rng(4800);
  const clouds = [];
  for (let i = 0; i < 30; i++) {
    const c = makeCloud(R, 0.8 + R() * 1.4);
    c.userData = { x: (R() - 0.5) * 80, y: -12 + R() * 22, z: -40 + R() * 36 };
    if (Math.abs(c.userData.y) < 4 && c.userData.z > -10) c.userData.z -= 14;
    scene.add(c);
    clouds.push(c);
  }
  const plane = makePlane();
  scene.add(plane.root);
  const arrows = {
    weight: makeArrow(0xff4d5e),
    drag: makeArrow(0xff9a2a),
    thrust: makeArrow(0x2f9bff),
    lift: makeArrow(0x2fbf5f),
  };
  Object.values(arrows).forEach((a) => scene.add(a.g));
  const lines = [];
  const lMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6, depthWrite: false });
  for (let i = 0; i < 24; i++) {
    const m = add(scene, new THREE.BoxGeometry(3, 0.04, 0.04), lMat, [0, 0, 0], [0, 0, 0], [1, 1, 1], false);
    m.userData = { y: (R() - 0.5) * 8, z: (R() - 0.5) * 6, ph: R() };
    lines.push(m);
  }
  return { scene, sky, plane, clouds, arrows, lines };
}

// ---------------------------------------------------------------- wind tunnel
export const CHORD = 3.2;
export function airfoilShape() {
  // a cambered teardrop wing section, leading edge at x = -CHORD/2
  const s = new THREE.Shape();
  const N = 40;
  const pts = [];
  for (let i = 0; i <= N; i++) {
    const u = i / N;
    const x = (1 - Math.cos(Math.PI * u)) / 2; // 0..1
    const t = 0.14 * (2.969 * Math.sqrt(x) - 1.26 * x - 3.516 * x * x + 2.843 * x ** 3 - 1.015 * x ** 4);
    const c = 0.06 * (x < 0.4 ? (2 * 0.4 * x - x * x) / 0.16 : (1 - 0.8 + 2 * 0.4 * x - x * x) / 0.36);
    pts.push([x, c + t, c - t]);
  }
  pts.forEach(([x, yu], i) => (i === 0 ? s.moveTo((x - 0.5) * CHORD, yu * CHORD) : s.lineTo((x - 0.5) * CHORD, yu * CHORD)));
  for (let i = N; i >= 0; i--) s.lineTo((pts[i][0] - 0.5) * CHORD, pts[i][2] * CHORD);
  return s;
}
// streamline y offset at x for a line starting at y0 (air flows +x)
export function streamY(y0, x, aoa) {
  const g = Math.exp(-((x / 2.0) ** 2));
  const above = y0 > 0;
  const bump = above ? 0.65 * Math.exp(-(y0 - 0.5) / 1.4) * g : -0.18 * Math.exp((y0 + 0.5) / 1.4) * g;
  const sm = (k) => k * k * (3 - 2 * k);
  const down = -aoa * 6.0 * Math.exp(-Math.abs(y0) / 2.2) * sm(Math.min(1, Math.max(0, (x + 1.2) / 4.5)));
  return y0 + bump + down;
}
export function buildTunnel() {
  const scene = new THREE.Scene();
  const sky = gradientSky(0x1a3a7a, 0x0a1838);
  scene.add(sky);
  scene.add(new THREE.HemisphereLight(0xe0f0ff, 0x1a2a4a, 1.3));
  const key = new THREE.DirectionalLight(0xffffff, 1.4);
  key.position.set(3, 8, 10);
  scene.add(key);
  // grid backdrop
  const gridMat = new THREE.LineBasicMaterial({ color: 0x3a6ab0, transparent: true, opacity: 0.35 });
  const gp = [];
  for (let x = -14; x <= 14; x += 1) gp.push(x, -12, -3, x, 12, -3);
  for (let y = -12; y <= 12; y += 1) gp.push(-14, y, -3, 14, y, -3);
  const gGeo = new THREE.BufferGeometry();
  gGeo.setAttribute('position', new THREE.Float32BufferAttribute(gp, 3));
  scene.add(new THREE.LineSegments(gGeo, gridMat));
  // floor for Affan
  add(scene, new THREE.BoxGeometry(30, 0.3, 8), std(0x2a3a5a, 0.8), [0, -4.35, 0]);
  // the wing section
  const wingPivot = new THREE.Group();
  scene.add(wingPivot);
  const wGeo = new THREE.ExtrudeGeometry(airfoilShape(), { depth: 2.4, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 2, curveSegments: 4 });
  wGeo.translate(0, 0, -1.2);
  const wMat = std(0xd8dee8, 0.35, { emissive: 0x2a3a5a, emissiveIntensity: 0.3 });
  const wing = add(wingPivot, wGeo, wMat, [0, 0, 0], [0, 0, 0], [1, 1, 1], false);
  // outline glow for "special shape"
  const outline = new THREE.Line(new THREE.BufferGeometry().setFromPoints(airfoilShape().getPoints(60).map((p) => V3(p.x, p.y, 1.26))), new THREE.LineBasicMaterial({ color: 0xffe14a, transparent: true, opacity: 0 }));
  wingPivot.add(outline);
  // streamlines: faint guide tubes + moving dots
  const Y0 = [-3.2, -2.4, -1.7, -1.1, -0.6, 0.6, 1.1, 1.7, 2.4, 3.2];
  const guideMat = new THREE.MeshBasicMaterial({ color: 0x7ad8ff, transparent: true, opacity: 0.0, depthWrite: false });
  const guides = Y0.map((y0) => {
    const m = new THREE.Mesh(new THREE.BufferGeometry(), guideMat);
    m.userData.y0 = y0;
    scene.add(m);
    return m;
  });
  const dotMat = new THREE.SpriteMaterial({ map: glowTex, color: 0x9ae8ff, transparent: true, opacity: 0.95, depthWrite: false, blending: THREE.AdditiveBlending });
  const dots = [];
  Y0.forEach((y0, li) => {
    for (let k = 0; k < 9; k++) {
      const s = new THREE.Sprite(dotMat);
      s.userData = { y0, ph: k / 9 + li * 0.037 };
      s.visible = false;
      scene.add(s);
      dots.push(s);
    }
  });
  const down = [0, 1, 2].map(() => makeArrow(0x2f9bff));
  const lift = makeArrow(0x2fbf5f);
  [...down, lift].forEach((a) => scene.add(a.g));
  const aff = makeAffan();
  aff.root.scale.setScalar(0.62);
  scene.add(aff.root);
  return { scene, sky, wingPivot, wing, outline, guides, guideMat, dots, down, lift, aff, Y0 };
}

// ----------------------------------------------------------- living room
export const A_RM = V3(0.2, 0, 0.6);
export function buildRoom() {
  const w = buildLivingRoom();
  w.kak.root.visible = false;
  // a strip of paper: a chain of short segments that can droop or lift
  const paper = new THREE.Group();
  w.scene.add(paper);
  const pMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8, side: THREE.DoubleSide, emissive: 0xffffff, emissiveIntensity: 0.12 });
  const segs = [];
  let parent = paper;
  for (let i = 0; i < 8; i++) {
    const pv = new THREE.Group();
    pv.position.set(0, 0, i === 0 ? 0 : 0.11);
    parent.add(pv);
    add(pv, new THREE.BoxGeometry(0.34, 0.006, 0.112), pMat, [0, 0, 0.056], [0, 0, 0], [1, 1, 1], false);
    segs.push(pv);
    parent = pv;
  }
  const puffMat = new THREE.SpriteMaterial({ map: glowTex, color: 0xcfefff, transparent: true, opacity: 0.6, depthWrite: false });
  const puffs = Array.from({ length: 16 }, () => {
    const s = new THREE.Sprite(puffMat);
    s.visible = false;
    w.scene.add(s);
    return s;
  });
  return { ...w, paper, segs, puffs };
}

// ------------------------------------------------------------------- cabin
// Aisle along z, passengers face -z. Window wall at x = -1.7.
export const SEAT_Z = 0;
export const A_CB = V3(-0.95, -0.36, SEAT_Z + 0.05);
function canvasTex(size, draw) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  draw(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function cloudWindowTex() {
  return canvasTex(512, (g, s) => {
    const gr = g.createLinearGradient(0, 0, 0, s);
    gr.addColorStop(0, '#3a8aff');
    gr.addColorStop(1, '#cfe8ff');
    g.fillStyle = gr;
    g.fillRect(0, 0, s, s);
    const R = rng(77);
    g.fillStyle = 'rgba(255,255,255,0.95)';
    for (let i = 0; i < 14; i++) {
      const x = R() * s, y = s * (0.45 + R() * 0.45), r = 20 + R() * 40;
      for (let k = 0; k < 5; k++) {
        g.beginPath();
        g.arc(x + (k - 2) * r * 0.7, y + Math.sin(k) * r * 0.2, r * (0.7 + 0.3 * Math.sin(k * 2)), 0, Math.PI * 2);
        g.fill();
      }
    }
  });
}
export function buildCabin() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xe8ecf2);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8a8a9a, 1.3));
  const key = new THREE.DirectionalLight(0xfff8f0, 1.0);
  key.position.set(2, 6, -3);
  scene.add(key);
  const wall = std(0xf0f2f6, 0.7);
  add(scene, new THREE.PlaneGeometry(6, 20), std(0x4a5a7a, 0.9), [0, 0, 0], [-Math.PI / 2, 0, 0], [1, 1, 1], false);
  add(scene, new THREE.PlaneGeometry(20, 4.2), wall, [-1.7, 2.1, 0], [0, Math.PI / 2, 0], [1, 1, 1], false);
  add(scene, new THREE.PlaneGeometry(20, 4.2), wall, [2.6, 2.1, 0], [0, -Math.PI / 2, 0], [1, 1, 1], false);
  add(scene, new THREE.PlaneGeometry(5, 20), std(0xfafbfd, 0.7), [0.45, 4.2, 0], [Math.PI / 2, 0, 0], [1, 1, 1], false);
  // overhead bins
  add(scene, new THREE.BoxGeometry(0.9, 0.6, 20), std(0xe0e4ea, 0.5), [-1.25, 3.75, 0]);
  // windows
  const tex = cloudWindowTex();
  tex.wrapS = THREE.RepeatWrapping;
  const winMat = new THREE.MeshBasicMaterial({ map: tex });
  const frameMat = std(0xd8dce4, 0.5);
  for (let i = -3; i <= 3; i++) {
    const z = SEAT_Z - 0.6 + i * 1.3;
    add(scene, new THREE.CapsuleGeometry(0.2, 0.22, 6, 16), frameMat, [-1.69, 1.55, z], [0, 0, 0], [0.2, 1.25, 1.35], false);
    add(scene, new THREE.CapsuleGeometry(0.17, 0.2, 6, 16), winMat, [-1.66, 1.55, z], [0, 0, 0], [0.05, 1.2, 1.2], false);
  }
  // seats (two per row, by the window), rows behind Affan only
  const seatMat = std(0x2f5fbf, 0.7);
  const seatMat2 = std(0x3f74d8, 0.7);
  for (let r = 0; r < 5; r++) {
    for (const x of [-0.95, -0.25]) {
      const z = SEAT_Z + r * 1.3;
      add(scene, new RoundedBoxGeometry(0.62, 0.18, 0.6, 2, 0.06), seatMat, [x, 0.48, z - 0.05]);
      add(scene, new RoundedBoxGeometry(0.62, 1.3, 0.16, 2, 0.06), seatMat2, [x, 1.1, z + 0.32], [-0.12, 0, 0]);
      add(scene, new RoundedBoxGeometry(0.4, 0.22, 0.12, 2, 0.05), std(0xffffff, 0.8), [x, 1.62, z + 0.3], [-0.12, 0, 0]);
      add(scene, new THREE.BoxGeometry(0.62, 0.4, 0.5), std(0x8a94a8, 0.6), [x, 0.2, z - 0.05]);
    }
  }
  // seatbelt (two halves + buckle)
  const belt = new THREE.Group();
  scene.add(belt);
  const strap = std(0x6a7488, 0.6);
  const halfL = add(belt, new THREE.BoxGeometry(0.34, 0.11, 0.06), strap, [-0.16, 0, 0], [0, 0, 0], [1, 1, 1], false);
  const halfR = add(belt, new THREE.BoxGeometry(0.34, 0.11, 0.06), strap, [0.16, 0, 0], [0, 0, 0], [1, 1, 1], false);
  const buckle = add(belt, new THREE.BoxGeometry(0.14, 0.14, 0.08), std(0xc8ccd4, 0.2, { metalness: 0.8 }), [0, 0, 0.01], [0, 0, 0], [1, 1, 1], false);
  const aff = makeAffan();
  scene.add(aff.root);
  return { scene, tex, belt, halfL, halfR, buckle, aff };
}
