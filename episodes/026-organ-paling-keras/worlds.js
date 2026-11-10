// Episode 026 sets: the sunny park (bicycle fall), the TOP 3 science studio
// with its podiums and hero models (femur, x-ray head, tooth), the enamel
// crystal world and the branded outro stage. All procedural, no external models.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { rng } from '../../shared/core.js';
import { makeAffan } from '../../shared/affan.js';
import { add, makeSky, makeTree, makeBush, glow } from '../../shared/props.js';

const std = (color, rough = 0.6, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0, ...extra });

function shadowCfg(light, size, map = 2048) {
  light.castShadow = true;
  light.shadow.mapSize.set(map, map);
  const c = light.shadow.camera;
  c.left = -size;
  c.right = size;
  c.top = size;
  c.bottom = -size;
  c.near = 1;
  c.far = 200;
  light.shadow.bias = -0.0005;
  light.shadow.normalBias = 0.02;
}

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

// Cylinder from point a to point b.
function bar(parent, a, b, r, mat) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
  const len = A.distanceTo(B);
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 12), mat);
  m.position.copy(A).add(B).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.sub(A).normalize());
  m.castShadow = true;
  parent.add(m);
  return m;
}

// ------------------------------------------------------------- Affan extras
// Teeth inside the open mouth (for the brushing and grinning moments).
export function addTeeth(aff) {
  const teeth = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.05, 0.04), std(0xffffff, 0.35, { emissive: 0xffffff, emissiveIntensity: 0.15 }));
  teeth.position.set(0, -0.012, 0.035);
  aff.parts.open.add(teeth);
  return teeth;
}

// X-ray look for the legs: the trousers turn into a glowing ghost and bright
// bones (femur + shin) appear inside.
export function addXray(aff) {
  const ghost = new THREE.MeshStandardMaterial({ color: 0x5fb8ff, emissive: 0x2a7fff, emissiveIntensity: 0.6, transparent: true, opacity: 0.32, depthWrite: false, roughness: 0.4 });
  const boneMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xbfe6ff, emissiveIntensity: 0.9, roughness: 0.4 });
  const glowMat = new THREE.MeshBasicMaterial({ color: 0xffd36b, transparent: true, opacity: 0.0, depthWrite: false, blending: THREE.AdditiveBlending });
  const swaps = [];
  const bones = [];
  for (const leg of [aff.parts.legs.L, aff.parts.legs.R]) {
    for (const g of [leg.hip, leg.knee]) {
      for (const m of g.children) if (m.isMesh && m.geometry.type === 'CapsuleGeometry') swaps.push([m, m.material]);
    }
    const femur = makeFemur({ mat: boneMat, scale: 0.105 });
    femur.position.set(0, -0.27, 0);
    leg.hip.add(femur);
    const halo = new THREE.Mesh(new THREE.CapsuleGeometry(0.13, 0.42, 6, 14), glowMat);
    halo.position.set(0, -0.26, 0);
    leg.hip.add(halo);
    const shin = new THREE.Group();
    bar(shin, [0, -0.02, 0], [0, -0.4, 0], 0.045, boneMat);
    bar(shin, [0.06, -0.04, -0.02], [0.05, -0.38, -0.02], 0.025, boneMat);
    leg.knee.add(shin);
    bones.push(femur, shin, halo);
  }
  const set = (on, glowAmt = 0) => {
    for (const [m, orig] of swaps) m.material = on ? ghost : orig;
    for (const b of bones) b.visible = on;
    glowMat.opacity = glowAmt * 0.55;
  };
  set(false);
  return set;
}

// --------------------------------------------------------------- models
// Thigh bone (femur), standing upright, ~ (5.6 * scale) tall, centred at origin.
export function makeFemur({ mat = std(0xf6ead0, 0.55), scale = 1 } = {}) {
  const g = new THREE.Group();
  const prof = [];
  for (let i = 0; i <= 24; i++) {
    const y = -2.0 + (4.0 * i) / 24;
    const k = Math.abs(y) / 2;
    prof.push(new THREE.Vector2(0.26 + 0.16 * Math.pow(k, 3), y));
  }
  add(g, new THREE.LatheGeometry(prof, 28), mat);
  // top: neck + ball (femoral head) + greater trochanter
  bar(g, [0, 1.85, 0], [-0.62, 2.45, 0], 0.24, mat);
  add(g, new THREE.SphereGeometry(0.46, 28, 20), mat, [-0.72, 2.55, 0]);
  add(g, new THREE.SphereGeometry(0.42, 24, 16), mat, [0.22, 2.2, 0], [0, 0, 0], [1, 1.25, 0.95]);
  // bottom: two knuckles (condyles)
  for (const s of [-1, 1]) add(g, new THREE.SphereGeometry(0.42, 24, 18), mat, [0.3 * s, -2.15, 0.06], [0, 0, 0], [1, 0.9, 1.15]);
  g.scale.setScalar(scale);
  return g;
}

// Friendly x-ray head: a translucent blue head with an ivory skull inside,
// a glowing temporal-bone plate beside the ear and the snail-shaped inner ear.
export function makeXrayHead() {
  const g = new THREE.Group();
  const ivory = std(0xf7ecd6, 0.5);
  const skull = new THREE.Group();
  g.add(skull);
  add(skull, new THREE.SphereGeometry(1, 48, 32), ivory, [0, 0.15, 0], [0, 0, 0], [0.92, 0.9, 1.0]);
  add(skull, new RoundedBoxGeometry(1.15, 0.75, 1.1, 4, 0.3), ivory, [0, -0.45, 0.25]);
  const dark = std(0x2b2140, 0.6);
  for (const s of [-1, 1]) add(skull, new THREE.SphereGeometry(0.22, 20, 14), dark, [0.3 * s, -0.05, 0.86], [0, 0, 0], [1, 1.1, 0.5]);
  add(skull, new THREE.ConeGeometry(0.09, 0.18, 3), dark, [0, -0.33, 0.93], [Math.PI, 0, 0]);
  for (let i = 0; i < 6; i++) add(skull, new RoundedBoxGeometry(0.11, 0.14, 0.08, 2, 0.03), std(0xffffff, 0.4), [-0.28 + i * 0.112, -0.62, 0.79]);
  // temporal bone plate (both sides) + inner ear spiral
  const plateMat = new THREE.MeshStandardMaterial({ color: 0xffa040, emissive: 0xff7a1a, emissiveIntensity: 0.6, roughness: 0.4, transparent: true, opacity: 1 });
  const plates = [];
  for (const s of [-1, 1]) {
    const p = new THREE.Mesh(new THREE.SphereGeometry(1.012, 32, 24, s > 0 ? Math.PI * 0.86 : Math.PI * 1.86, Math.PI * 0.28, Math.PI * 0.3, Math.PI * 0.24), plateMat);
    p.scale.set(0.92, 0.9, 1.0);
    p.position.set(0, 0.15, 0);
    skull.add(p);
    plates.push(p);
  }
  const pts = [];
  for (let i = 0; i <= 80; i++) {
    const a = (i / 80) * Math.PI * 5;
    const r = 0.03 + 0.11 * (1 - i / 80);
    pts.push(new THREE.Vector3(0, Math.sin(a) * r, Math.cos(a) * r).add(new THREE.Vector3((i / 80) * 0.08, 0, 0)));
  }
  const coch = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 160, 0.035, 8), new THREE.MeshStandardMaterial({ color: 0xff7fb5, emissive: 0xff4f9a, emissiveIntensity: 1.0, roughness: 0.4, depthTest: false }));
  coch.renderOrder = 6;
  coch.position.set(0.55, 0.12, 0.0);
  coch.scale.setScalar(1.5);
  g.add(coch);
  // translucent skin shell + ears
  const shellMat = new THREE.MeshStandardMaterial({ color: 0x8fd0ff, emissive: 0x3a8cff, emissiveIntensity: 0.25, transparent: true, opacity: 0.28, depthWrite: false, roughness: 0.3 });
  const shell = add(g, new THREE.SphereGeometry(1.22, 48, 32), shellMat, [0, 0.0, 0.05], [0, 0, 0], [0.98, 1.08, 1.02], false);
  shell.renderOrder = 2;
  for (const s of [-1, 1]) {
    const ear = add(g, new THREE.TorusGeometry(0.2, 0.08, 12, 24), shellMat, [1.2 * s, -0.25, 0.05], [0, Math.PI / 2, 0], [0.8, 1.2, 1], false);
    ear.renderOrder = 2;
  }
  g.userData = { skull, plates, plateMat, coch, shell, shellMat, ivory };
  return g;
}

// Tooth outline in the x-y plane (crown on top, two roots), used both for the
// solid model and for the cut-away cross-section.
function toothShape(inset = 0) {
  const s = new THREE.Shape();
  const i = inset;
  s.moveTo(-0.62 + i, -2.05 + i * 1.6);
  s.quadraticCurveTo(-0.66, -0.9, -0.66 + i * 0.6, -0.05);
  s.bezierCurveTo(-0.92 + i, 0.25, -0.98 + i, 0.75, -0.78 + i, 1.1 - i);
  s.quadraticCurveTo(-0.66, 1.42 - i, -0.4, 1.26 - i);
  s.quadraticCurveTo(-0.2, 1.12 - i * 0.6, 0, 1.18 - i);
  s.quadraticCurveTo(0.2, 1.12 - i * 0.6, 0.4, 1.26 - i);
  s.quadraticCurveTo(0.66, 1.42 - i, 0.78 - i, 1.1 - i);
  s.bezierCurveTo(0.98 - i, 0.75, 0.92 - i, 0.25, 0.66 - i * 0.6, -0.05);
  s.quadraticCurveTo(0.66, -0.9, 0.62 - i, -2.05 + i * 1.6);
  s.quadraticCurveTo(0.45, -2.25 + i, 0.3 - i * 0.3, -2.0 + i * 1.4);
  s.quadraticCurveTo(0.12, -0.8, 0, -0.7 - i * 0.2);
  s.quadraticCurveTo(-0.12, -0.8, -0.3 + i * 0.3, -2.0 + i * 1.4);
  s.quadraticCurveTo(-0.45, -2.25 + i, -0.62 + i, -2.05 + i * 1.6);
  return s;
}
function pulpShape() {
  const s = new THREE.Shape();
  s.moveTo(-0.42, -1.85);
  s.quadraticCurveTo(-0.38, -0.6, -0.4, 0.15);
  s.quadraticCurveTo(-0.45, 0.62, -0.3, 0.72);
  s.quadraticCurveTo(0, 0.55, 0.3, 0.72);
  s.quadraticCurveTo(0.45, 0.62, 0.4, 0.15);
  s.quadraticCurveTo(0.38, -0.6, 0.42, -1.85);
  s.quadraticCurveTo(0.38, -1.95, 0.34, -1.85);
  s.quadraticCurveTo(0.24, -0.6, 0, -0.25);
  s.quadraticCurveTo(-0.24, -0.6, -0.34, -1.85);
  s.quadraticCurveTo(-0.38, -1.95, -0.42, -1.85);
  return s;
}

// Cute molar: a rounded white tooth with a face, plus a cut-away version
// (back half + coloured cross-section: enamel, dentin, pulp).
export function makeTooth() {
  const g = new THREE.Group();
  const enamelMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.15, emissive: 0xdff4ff, emissiveIntensity: 0.04 });
  const extr = (shape, depth, mat, bevel = 0.28) => {
    const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel * 0.9, bevelSegments: 8, curveSegments: 24 });
    geo.translate(0, 0, -depth / 2);
    const m = new THREE.Mesh(geo, mat);
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  };
  // full tooth
  const full = new THREE.Group();
  g.add(full);
  const body = extr(toothShape(0.0), 0.75, enamelMat, 0.36);
  full.add(body);
  // face
  const face = new THREE.Group();
  face.position.set(0, 0.45, 0.76);
  full.add(face);
  const eyeM = std(0x1b1530, 0.3);
  const eyes = [];
  for (const s of [-1, 1]) {
    const e = new THREE.Group();
    e.position.set(0.3 * s, 0.12, 0);
    face.add(e);
    add(e, new THREE.SphereGeometry(0.1, 18, 14), eyeM, [0, 0, 0], [1, 1.25, 0.5]);
    add(e, new THREE.SphereGeometry(0.035, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffffff }), [0.03, 0.05, 0.05]);
    eyes.push(e);
  }
  const mouth = add(face, new THREE.TorusGeometry(0.15, 0.035, 10, 24, Math.PI), std(0x7a2a3a, 0.4), [0, -0.12, 0.0], [0, 0, Math.PI]);
  for (const s of [-1, 1]) add(face, new THREE.CircleGeometry(0.09, 20), new THREE.MeshBasicMaterial({ color: 0xff9eb5, transparent: true, opacity: 0.6, depthWrite: false }), [0.5 * s, -0.08, 0.02], [0, 0, 0], [1.3, 0.8, 1], false);
  // shine streak
  add(full, new THREE.CapsuleGeometry(0.05, 0.5, 4, 10), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.75 }), [-0.55, 0.65, 0.62], [0, 0, 0.35], [1, 1, 0.4], false);

  // cut-away: back half of the tooth with a flat coloured section on z = 0
  const cut = new THREE.Group();
  g.add(cut);
  const half = extr(toothShape(0.0), 0.75, enamelMat, 0.36);
  half.material = enamelMat.clone();
  half.material.clippingPlanes = [new THREE.Plane()];
  const clipLocal = [[half.material.clippingPlanes[0], new THREE.Plane(new THREE.Vector3(0, 0, -1), 0)]];
  cut.add(half);
  const flat = (shape, color, z) => {
    const m = new THREE.Mesh(new THREE.ShapeGeometry(shape, 32), new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }));
    m.position.z = z;
    cut.add(m);
    return m;
  };
  // the extruded body is ~0.33 wider than the shape (bevel), so scale the section up to match
  const secEnamel = flat(toothShape(0.0), 0xe9f8ff, 0.0);
  secEnamel.scale.set(1.33, 1.17, 1);
  secEnamel.position.y = 0.07;
  const secDentin = flat(toothShape(0.25), 0xe9b85a, 0.004);
  secDentin.scale.copy(secEnamel.scale);
  secDentin.position.y = 0.07;
  const secPulp = flat(pulpShape(), 0xff4f7a, 0.008);
  secPulp.scale.copy(secEnamel.scale);
  secPulp.position.y = 0.07;
  // the white enamel band only covers the crown: hide the section's root part under dentin colour
  const rootCover = flat(toothShape(0.0), 0xd9a860, 0.002);
  rootCover.scale.copy(secEnamel.scale);
  rootCover.position.y = 0.07;
  rootCover.material.clippingPlanes = [new THREE.Plane()];
  clipLocal.push([rootCover.material.clippingPlanes[0], new THREE.Plane(new THREE.Vector3(0, -1, 0), -0.05)]);
  cut.visible = false;

  const crack = new THREE.Group();
  const crackMat = new THREE.MeshBasicMaterial({ color: 0x3a2a44 });
  const cp = [[-0.2, 1.22], [-0.05, 0.95], [-0.22, 0.75], [0.0, 0.5], [-0.12, 0.3], [0.05, 0.1]];
  for (let i = 0; i < cp.length - 1; i++) bar(crack, [cp[i][0], cp[i][1], 0], [cp[i + 1][0], cp[i + 1][1], 0], 0.03, crackMat);
  crack.position.set(0.22, 0, 0.74);
  full.add(crack);
  crack.visible = false;

  // smile <-> frown and crack, blink
  const mood = (happy = 1, blink = 0) => {
    mouth.rotation.z = happy >= 0 ? Math.PI : 0;
    mouth.position.y = happy >= 0 ? -0.12 : -0.2;
    mouth.scale.set(1, Math.max(0.3, Math.abs(happy)), 1);
    for (const e of eyes) e.scale.y = 1 - 0.9 * blink;
  };
  mood(1);
  // clipping planes live in world space: refresh them from the tooth's transform
  const updateClip = () => {
    g.updateMatrixWorld(true);
    for (const [w, l] of clipLocal) w.copy(l).applyMatrix4(g.matrixWorld);
  };
  g.userData = { full, cut, face, crack, mood, enamelMat, updateClip };
  return g;
}

// Party-cone cover that hides each podium's prize until the reveal.
function makeCover(color) {
  const g = new THREE.Group();
  const pts = [];
  for (let i = 0; i <= 20; i++) {
    const y = (i / 20) * 2.6;
    pts.push(new THREE.Vector2(Math.max(0.02, 1.15 * Math.pow(1 - i / 20, 0.8)), y));
  }
  add(g, new THREE.LatheGeometry(pts, 40), std(color, 0.75, { emissive: color, emissiveIntensity: 0.1 }));
  add(g, new THREE.TorusGeometry(1.1, 0.07, 10, 40), std(0xffd84a, 0.35, { metalness: 0.4 }), [0, 0.12, 0], [Math.PI / 2, 0, 0]);
  add(g, new THREE.SphereGeometry(0.18, 16, 12), std(0xffd84a, 0.35, { metalness: 0.4 }), [0, 2.65, 0]);
  const q = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.0), new THREE.MeshBasicMaterial({ map: canvasTex(256, 256, (c) => {
    c.font = '800 230px "Baloo 2", sans-serif';
    c.textAlign = 'center';
    c.lineWidth = 26;
    c.strokeStyle = '#17256b';
    c.fillStyle = '#ffd84a';
    c.strokeText('?', 128, 210);
    c.fillText('?', 128, 210);
  }), transparent: true, depthWrite: false }));
  q.position.set(0, 0.95, 0.82);
  q.rotation.x = -0.42;
  q.scale.setScalar(0.85);
  g.add(q);
  return g;
}

function podiumTex(n, top, bot) {
  return canvasTex(512, 512, (c) => {
    const gr = c.createLinearGradient(0, 0, 0, 512);
    gr.addColorStop(0, top);
    gr.addColorStop(1, bot);
    c.fillStyle = gr;
    c.fillRect(0, 0, 512, 512);
    c.font = '800 330px "Baloo 2", sans-serif';
    c.textAlign = 'center';
    c.lineJoin = 'round';
    c.lineWidth = 34;
    c.strokeStyle = '#17256b';
    c.fillStyle = '#ffffff';
    c.strokeText(String(n), 256, 380);
    c.fillText(String(n), 256, 380);
  });
}

// -------------------------------------------------------------------- park
export function buildPark() {
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xbfe6ff, 40, 160);
  const sky = makeSky({ top: 0x3d8ff0, mid: 0x6fb4ff, horizon: 0xd6f0ff, bottom: 0x9fd88a, radius: 900 });
  scene.add(sky);
  scene.add(new THREE.HemisphereLight(0xdff1ff, 0x5f8f4a, 1.5));
  const sun = new THREE.DirectionalLight(0xfff1d6, 2.6);
  sun.position.set(-12, 22, 14);
  shadowCfg(sun, 12);
  scene.add(sun, sun.target);
  const grass = add(scene, new THREE.PlaneGeometry(600, 600), std(0x7cc95b, 0.95), [0, 0, 0], [-Math.PI / 2, 0, 0], [1, 1, 1], false);
  grass.receiveShadow = true;
  const path = add(scene, new THREE.PlaneGeometry(200, 3.2), std(0xe8c99a, 0.95), [0, 0.01, 0], [-Math.PI / 2, 0, 0], [1, 1, 1], false);
  path.receiveShadow = true;
  for (const s of [-1, 1]) add(scene, new THREE.PlaneGeometry(200, 0.16), std(0xd2ad78, 0.95), [0, 0.012, 1.6 * s], [-Math.PI / 2, 0, 0], [1, 1, 1], false);
  const R = rng(26);
  const leaf = [[0x5fc46a], [0x48b45e], [0x86d45a], [0x3fae7a]];
  for (let x = -60; x < 40; x += 3 + R() * 4) {
    for (const side of [-1, 1]) {
      if (R() < 0.35) continue;
      const tr = makeTree(R, { scale: 1.0 + R() * 0.6, leaf: leaf[Math.floor(R() * 4)], trunk: 0x8a5a3a, toy: true });
      tr.position.set(x + R() * 2, 0, side * (6 + R() * 10));
      scene.add(tr);
    }
    if (R() < 0.6) {
      const b = makeBush(R, { scale: 0.8 + R() * 0.4, color: 0x4fae55 });
      b.position.set(x + R() * 3, 0, -(3 + R() * 1.5));
      scene.add(b);
    }
  }
  // flowers
  const fl = new THREE.InstancedMesh(new THREE.SphereGeometry(0.09, 8, 6), new THREE.MeshStandardMaterial({ roughness: 0.6 }), 500);
  const m4 = new THREE.Matrix4();
  const cols = [0xff6b8a, 0xffd84a, 0xffffff, 0xb36bff];
  for (let i = 0; i < 500; i++) {
    const z = (R() < 0.5 ? -1 : 1) * (2.2 + R() * 14);
    m4.makeTranslation(-50 + R() * 90, 0.12, z);
    fl.setMatrixAt(i, m4);
    fl.setColorAt(i, new THREE.Color(cols[i % 4]));
  }
  scene.add(fl);
  // distant hills + clouds
  for (let i = 0; i < 18; i++) add(scene, new THREE.SphereGeometry(18 + R() * 16, 24, 14), std([0x6fc06a, 0x5fb070, 0x83cc6a][i % 3], 1), [-120 + i * 14, -8, -70 - R() * 30], [0, 0, 0], [1.8, 0.7, 1], false);
  const cloudMat = std(0xffffff, 0.9, { emissive: 0xffffff, emissiveIntensity: 0.35 });
  for (let i = 0; i < 12; i++) {
    const c = new THREE.Group();
    for (let k = 0; k < 4; k++) add(c, new THREE.SphereGeometry(2 + R() * 1.6, 16, 12), cloudMat, [k * 2.4, R(), R()], [0, 0, 0], [1, 0.7, 0.8], false);
    c.position.set(-80 + i * 14, 26 + R() * 10, -60 - R() * 30);
    scene.add(c);
  }
  // a little rock on the path that causes the fall
  const rock = add(scene, new THREE.DodecahedronGeometry(0.16, 1), std(0x9a8f88, 0.9), [0.0, 0.08, 0.15], [0.3, 0.6, 0], [1.3, 0.8, 1]);

  // bicycle + rider rig (travels along +x)
  const rig = new THREE.Group();
  scene.add(rig);
  const bike = makeBike();
  rig.add(bike);
  const aff = makeAffan();
  rig.add(aff.root);
  addTeeth(aff);
  const setXray = addXray(aff);
  // dust puffs
  const dust = [];
  const dm = new THREE.MeshStandardMaterial({ color: 0xf2e2c4, roughness: 1, transparent: true, opacity: 0.8, depthWrite: false });
  for (let i = 0; i < 9; i++) {
    const d = add(scene, new THREE.SphereGeometry(0.3, 14, 10), dm, [0, 0, 0], [0, 0, 0], [1, 1, 1], false);
    d.visible = false;
    dust.push(d);
  }
  return { scene, sky, sun, rig, bike, aff, setXray, rock, dust, dustMat: dm };
}

// Kid's bicycle in Affan units: forward = +x, wheels r = 0.5, ground at y = 0.
export function makeBike() {
  const g = new THREE.Group();
  const frame = std(0x19b6c9, 0.35, { metalness: 0.2, emissive: 0x0a4a52, emissiveIntensity: 0.2 });
  const dark = std(0x23262f, 0.6);
  const chrome = std(0xdfe3ea, 0.25, { metalness: 0.7 });
  const R = [-0.88, 0.5, 0], F = [0.88, 0.5, 0], B = [-0.05, 0.42, 0], S = [-0.32, 1.12, 0], H = [0.62, 1.16, 0];
  const wheels = [];
  for (const p of [R, F]) {
    const w = new THREE.Group();
    w.position.set(...p);
    g.add(w);
    add(w, new THREE.TorusGeometry(0.47, 0.06, 12, 40), dark);
    add(w, new THREE.TorusGeometry(0.4, 0.025, 8, 40), chrome);
    for (let i = 0; i < 6; i++) add(w, new THREE.CylinderGeometry(0.012, 0.012, 0.8, 6), chrome, [0, 0, 0], [0, 0, (i / 6) * Math.PI]);
    add(w, new THREE.CylinderGeometry(0.06, 0.06, 0.12, 12), chrome, [0, 0, 0], [Math.PI / 2, 0, 0]);
    wheels.push(w);
  }
  bar(g, B, S, 0.045, frame);
  bar(g, S, H, 0.045, frame);
  bar(g, B, H, 0.05, frame);
  for (const z of [-0.07, 0.07]) {
    bar(g, [B[0], B[1], z], [R[0], R[1], z], 0.03, frame);
    bar(g, [S[0], S[1], z * 0.5], [R[0], R[1], z], 0.03, frame);
    bar(g, [H[0] + 0.04, H[1] - 0.05, z], [F[0], F[1], z], 0.03, frame);
  }
  // seat, handlebar, basket, mudguard
  bar(g, S, [S[0] - 0.04, S[1] + 0.16, 0], 0.035, chrome);
  add(g, new RoundedBoxGeometry(0.42, 0.1, 0.24, 3, 0.05), dark, [S[0] - 0.06, S[1] + 0.2, 0]);
  const HB = [H[0] + 0.06, H[1] + 0.3, 0];
  bar(g, H, HB, 0.035, chrome);
  bar(g, [HB[0] - 0.08, HB[1], -0.36], [HB[0] - 0.08, HB[1], 0.36], 0.03, chrome);
  for (const z of [-0.36, 0.36]) bar(g, [HB[0] - 0.08, HB[1], z], [HB[0] - 0.08, HB[1], z * 1.3], 0.045, std(0xff6b6b, 0.6));
  add(g, new RoundedBoxGeometry(0.36, 0.26, 0.4, 3, 0.05), std(0xffb13b, 0.7), [F[0] + 0.05, HB[1] - 0.05, 0]);
  add(g, new THREE.TorusGeometry(0.52, 0.05, 6, 24, Math.PI * 0.8), frame, [R[0], R[1], 0], [0, 0, Math.PI * 0.15]);
  // crank + pedals
  const crank = new THREE.Group();
  crank.position.set(...B);
  g.add(crank);
  add(crank, new THREE.CylinderGeometry(0.12, 0.12, 0.05, 20), chrome, [0, 0, 0.1], [Math.PI / 2, 0, 0]);
  const pedals = [];
  for (const s of [-1, 1]) {
    const arm = new THREE.Group();
    arm.rotation.z = s > 0 ? 0 : Math.PI;
    crank.add(arm);
    add(arm, new THREE.BoxGeometry(0.04, 0.24, 0.03), chrome, [0, -0.12, 0.17 * s]);
    const ped = add(arm, new THREE.BoxGeometry(0.16, 0.04, 0.14), dark, [0, -0.24, 0.26 * s]);
    pedals.push(ped);
  }
  g.userData = { wheels, crank, pedals, seat: [S[0] - 0.06, S[1] + 0.25, 0], grips: [[HB[0] - 0.08, HB[1], -0.36], [HB[0] - 0.08, HB[1], 0.36]] };
  return g;
}

// ------------------------------------------------------------------ studio
export const PODIUM = { 1: { x: 0, h: 1.3 }, 2: { x: -3.1, h: 0.95 }, 3: { x: 3.1, h: 0.65 } };

export function buildStudio() {
  const scene = new THREE.Scene();
  const bg = canvasTex(512, 1024, (c, w, h) => {
    const gr = c.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, '#2a1a7a');
    gr.addColorStop(0.55, '#5a3fd0');
    gr.addColorStop(1, '#ff8fc8');
    c.fillStyle = gr;
    c.fillRect(0, 0, w, h);
    const R = rng(4);
    for (let i = 0; i < 160; i++) {
      c.fillStyle = `rgba(255,255,255,${0.15 + R() * 0.5})`;
      c.beginPath();
      c.arc(R() * w, R() * h * 0.7, 1 + R() * 2.5, 0, Math.PI * 2);
      c.fill();
    }
  });
  scene.background = new THREE.Color(0x24166a);
  const hemi = new THREE.HemisphereLight(0xe8e6ff, 0x5a3f9a, 1.3);
  scene.add(hemi);
  const key = new THREE.DirectionalLight(0xfff1e0, 2.2);
  key.position.set(4, 10, 9);
  shadowCfg(key, 9);
  scene.add(key, key.target);
  const rim = new THREE.DirectionalLight(0xc8b8ff, 1.6);
  rim.position.set(-6, 6, -8);
  scene.add(rim);
  // curved backdrop wall + floor stage
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(22, 22, 30, 64, 1, true, Math.PI * 0.6, Math.PI * 0.8), new THREE.MeshBasicMaterial({ map: bg, side: THREE.BackSide, fog: false }));
  wall.position.set(0, 12, 6);
  scene.add(wall);
  const floor = add(scene, new THREE.CircleGeometry(40, 64), std(0x3a2a8a, 0.35, { metalness: 0.1 }), [0, 0, 0], [-Math.PI / 2, 0, 0], [1, 1, 1], false);
  floor.receiveShadow = true;
  const stage = add(scene, new THREE.CylinderGeometry(7.5, 7.8, 0.3, 64), std(0x6a4fe0, 0.4), [0, 0.15, 0]);
  stage.receiveShadow = true;
  add(scene, new THREE.TorusGeometry(7.6, 0.08, 8, 80), new THREE.MeshBasicMaterial({ color: 0xffd84a }), [0, 0.3, 0], [Math.PI / 2, 0, 0], [1, 1, 1], false);
  // bulb ring lights along the stage edge
  const bulbs = new THREE.InstancedMesh(new THREE.SphereGeometry(0.09, 10, 8), new THREE.MeshBasicMaterial({ color: 0xfff1a8 }), 48);
  const m4 = new THREE.Matrix4();
  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * Math.PI * 2;
    bulbs.setMatrixAt(i, m4.makeTranslation(Math.sin(a) * 7.65, 0.22, Math.cos(a) * 7.65));
  }
  scene.add(bulbs);

  // podiums
  const podiums = {};
  const looks = { 1: ['#ffe066', '#f0a417', 0xffc93c], 2: ['#e6f1ff', '#93a9cf', 0xc9d7ef], 3: ['#ffc39a', '#d9773d', 0xf0a36b] };
  for (const n of [1, 2, 3]) {
    const P = PODIUM[n];
    const grp = new THREE.Group();
    grp.position.set(P.x, 0.3, 0);
    scene.add(grp);
    const tex = podiumTex(n, looks[n][0], looks[n][1]);
    const side = std(looks[n][2], 0.45, { emissive: looks[n][2], emissiveIntensity: 0.12 });
    const body = add(grp, new RoundedBoxGeometry(2.3, P.h, 2.0, 4, 0.12), side, [0, P.h / 2, 0]);
    body.receiveShadow = true;
    add(grp, new THREE.PlaneGeometry(1.25, 1.25 * Math.min(1, P.h / 1.1)), new THREE.MeshBasicMaterial({ map: tex, transparent: true }), [0, P.h / 2, 1.005], [0, 0, 0], [1, 1, 1], false);
    const cover = makeCover([0xb36bff, 0x4f8cff, 0xff6b8a][n - 1]);
    cover.position.set(0, P.h, 0);
    grp.add(cover);
    const spot = new THREE.SpotLight(0xfff4d8, 0, 20, 0.36, 0.5, 1.2);
    spot.position.set(P.x, 10, 3);
    spot.target.position.set(P.x, P.h, 0);
    scene.add(spot, spot.target);
    const beam = new THREE.Mesh(new THREE.ConeGeometry(1.6, 9.5, 32, 1, true), new THREE.MeshBasicMaterial({ color: 0xfff4c8, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));
    beam.position.set(P.x, P.h + 0.3 + 4.75, 0);
    scene.add(beam);
    podiums[n] = { grp, cover, spot, beam, top: P.h + 0.3 };
  }
  // hero models
  const femur = makeFemur({ scale: 0.42 });
  femur.position.set(PODIUM[3].x, podiums[3].top + 1.25, 0);
  scene.add(femur);
  const head = makeXrayHead();
  head.scale.setScalar(0.85);
  head.position.set(PODIUM[2].x, podiums[2].top + 1.15, 0);
  scene.add(head);
  const tooth = makeTooth();
  tooth.scale.setScalar(0.75);
  tooth.position.set(PODIUM[1].x, podiums[1].top + 1.75, 0);
  scene.add(tooth);
  const halo = glow(0xfff2b0, 6, 0);
  scene.add(halo);

  const aff = makeAffan();
  scene.add(aff.root);
  addTeeth(aff);
  const setXray = addXray(aff);
  // toothbrush held in Affan's right hand
  const brush = new THREE.Group();
  add(brush, new RoundedBoxGeometry(0.08, 0.62, 0.08, 2, 0.03), std(0x2fd0c0, 0.4), [0, -0.2, 0]);
  add(brush, new RoundedBoxGeometry(0.09, 0.2, 0.06, 2, 0.02), std(0x2fd0c0, 0.4), [0, -0.56, 0.0]);
  add(brush, new RoundedBoxGeometry(0.1, 0.16, 0.08, 2, 0.02), std(0xffffff, 0.8), [0, -0.58, 0.06]);
  add(brush, new RoundedBoxGeometry(0.11, 0.08, 0.05, 2, 0.02), std(0x9ff0ff, 0.6, { emissive: 0x9ff0ff, emissiveIntensity: 0.4 }), [0, -0.62, 0.1]);
  brush.visible = false;
  aff.parts.arms.R.hand.add(brush);
  return { scene, podiums, femur, head, tooth, aff, setXray, brush, halo, hemi, key, rim };
}

// ---------------------------------------------------------------- crystals
// Zoomed-in enamel: long hexagonal mineral crystals that pack tightly together.
export function buildCrystals() {
  const scene = new THREE.Scene();
  const bg = canvasTex(256, 512, (c, w, h) => {
    const gr = c.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, '#0e1450');
    gr.addColorStop(0.6, '#2c3aa8');
    gr.addColorStop(1, '#7fd6ff');
    c.fillStyle = gr;
    c.fillRect(0, 0, w, h);
  });
  scene.background = bg;
  scene.fog = new THREE.Fog(0x1a2580, 14, 42);
  scene.add(new THREE.HemisphereLight(0xe8f6ff, 0x34308a, 1.4));
  const key = new THREE.DirectionalLight(0xffffff, 2.4);
  key.position.set(5, 12, 6);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x9ff0ff, 1.8);
  rim.position.set(-6, 4, -8);
  scene.add(rim);
  const geo = new THREE.CylinderGeometry(0.5, 0.5, 6, 6);
  geo.translate(0, -3, 0);
  const mat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.15, clearcoat: 1, emissive: 0x6fbfff, emissiveIntensity: 0.12, flatShading: true });
  const grid = [];
  for (let r = -9; r <= 9; r++) for (let q = -9; q <= 9; q++) {
    const x = (q + r / 2) * 1.0;
    const z = r * 0.866;
    if (x * x + z * z < 78) grid.push([x, z]);
  }
  const inst = new THREE.InstancedMesh(geo, mat, grid.length);
  const R = rng(9);
  const seeds = grid.map(() => [R() * Math.PI * 2, 0.6 + R() * 1.6, R() - 0.5, R() * 10, 0.82 + R() * 0.3]);
  const tint = [0xffffff, 0xeaf6ff, 0xdff0ff, 0xf3ecff];
  grid.forEach((_, i) => inst.setColorAt(i, new THREE.Color(tint[i % 4])));
  scene.add(inst);
  const m4 = new THREE.Matrix4(), q4 = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), s = new THREE.Vector3();
  // pack = 0: loose, floating apart; pack = 1: tightly packed, all upright.
  const update = (t, pack) => {
    grid.forEach(([x, z], i) => {
      const [a, sp, tilt, ph, len] = seeds[i];
      const loose = 1 - pack;
      const spread = 1 + 0.75 * loose;
      p.set(x * spread + Math.cos(a) * 0.6 * loose, 0.2 + loose * (sp + 0.4 * Math.sin(t * 1.3 + ph)), z * spread + Math.sin(a) * 0.6 * loose);
      e.set(tilt * 0.8 * loose, a * loose, tilt * 0.6 * loose);
      q4.setFromEuler(e);
      s.set(0.94, len * (1 - 0.15 * pack) + 0.15 * pack, 0.94);
      inst.setMatrixAt(i, m4.compose(p, q4, s));
    });
    inst.instanceMatrix.needsUpdate = true;
  };
  update(0, 0);
  return { scene, update, inst };
}

// ------------------------------------------------------------------- outro
export function buildOutro() {
  const scene = new THREE.Scene();
  const bg = canvasTex(540, 960, (g) => {
    const gr = g.createRadialGradient(270, 380, 40, 270, 420, 700);
    gr.addColorStop(0, '#8fd0ff');
    gr.addColorStop(0.45, '#3f9cf2');
    gr.addColorStop(1, '#1a5fcf');
    g.fillStyle = gr;
    g.fillRect(0, 0, 540, 960);
  });
  scene.background = bg;
  scene.add(new THREE.HemisphereLight(0xeaf4ff, 0x6a7ab8, 1.5));
  const key = new THREE.DirectionalLight(0xfff2e0, 2.4);
  key.position.set(3, 6, 8);
  shadowCfg(key, 5);
  key.shadow.normalBias = 0.03;
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xbfe0ff, 2.0);
  rim.position.set(-6, 5, -6);
  scene.add(rim);
  const aff = makeAffan();
  scene.add(aff.root);
  const halo = glow(0xfff2b0, 9, 0.35);
  halo.position.set(0, 2.9, -2);
  scene.add(halo);
  return { scene, aff };
}
