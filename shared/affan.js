// Affan: the recurring lead of The Curious Affan, built procedurally so he is
// identical in every scene and every episode.
//
// Model sheet (matches the approved avatar reference):
//   5-year-old Malaysian boy, big round head, warm tan skin
//   neat dark-brown/black hair with a side-swept fringe
//   dark rectangular glasses
//   peach T-shirt, navy hooded jacket with white and peach stripe accents
//
// Units: feet at y = 0, ~3.8 units tall, faces +z. Use group.scale for size.
import * as THREE from 'three';
import { clamp, lerp } from './core.js';

export const AFFAN = {
  skin: 0xe8a57c,
  skinShade: 0xd98f68,
  hair: 0x22160f,
  hairHi: 0x3a2618,
  shirt: 0xff9470,
  navy: 0x1c2752,
  white: 0xf4f2ee,
  peach: 0xf2915f,
  pants: 0x2f3b5e,
  shoe: 0xf3f3f3,
  frame: 0x111114,
  iris: 0x4b2a16,
  mouth: 0x5e1f24,
  tongue: 0xe57c7c,
  lip: 0xa8524a,
  blush: 0xf3887e,
};

const std = (color, rough = 0.6, extra = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0, ...extra });

function mesh(geo, mat, parent, pos = [0, 0, 0], scale = [1, 1, 1], rot = [0, 0, 0]) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(...pos);
  m.scale.set(...scale);
  m.rotation.set(...rot);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

function roundedRectShape(w, h, r) {
  const s = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

function glassesFrameGeo() {
  const outer = roundedRectShape(0.42, 0.32, 0.1);
  const hole = roundedRectShape(0.33, 0.235, 0.07);
  outer.holes.push(new THREE.Path(hole.getPoints(24)));
  const g = new THREE.ExtrudeGeometry(outer, { depth: 0.035, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.01, bevelSegments: 2, curveSegments: 16 });
  g.translate(0, 0, -0.02);
  return g;
}

export function makeAffan() {
  const C = AFFAN;
  const M = {
    skin: std(C.skin, 0.55, { emissive: 0x3a1608, emissiveIntensity: 0.18 }),
    skinShade: std(C.skinShade, 0.55, { emissive: 0x3a1608, emissiveIntensity: 0.15 }),
    hair: std(C.hair, 0.42, { emissive: 0x0d0805, emissiveIntensity: 0.2 }),
    hairHi: std(C.hairHi, 0.4),
    shirt: std(C.shirt, 0.75, { emissive: 0x40180a, emissiveIntensity: 0.15 }),
    navy: std(C.navy, 0.72, { emissive: 0x060a1c, emissiveIntensity: 0.3 }),
    white: std(C.white, 0.7),
    peach: std(C.peach, 0.7, { emissive: 0x3a1206, emissiveIntensity: 0.15 }),
    pants: std(C.pants, 0.8),
    shoe: std(C.shoe, 0.5),
    frame: std(C.frame, 0.25, { metalness: 0.1 }),
    sclera: std(0xffffff, 0.3, { emissive: 0xffffff, emissiveIntensity: 0.12 }),
    iris: std(C.iris, 0.3),
    pupil: std(0x0a0605, 0.2),
    shine: new THREE.MeshBasicMaterial({ color: 0xffffff }),
    mouth: std(C.mouth, 0.5),
    tongue: std(C.tongue, 0.5),
    lip: std(C.lip, 0.5),
    teeth: std(0xffffff, 0.4),
    blush: new THREE.MeshBasicMaterial({ color: C.blush, transparent: true, opacity: 0.32, depthWrite: false }),
    lens: new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.05, transparent: true, opacity: 0.08, depthWrite: false }),
  };

  const root = new THREE.Group();
  root.name = 'Affan';
  const body = new THREE.Group();
  root.add(body);

  // ---------- legs (hip pivot -> knee pivot) ----------
  const legs = {};
  for (const side of [-1, 1]) {
    const hip = new THREE.Group();
    hip.position.set(0.22 * side, 1.02, 0);
    body.add(hip);
    mesh(new THREE.CapsuleGeometry(0.2, 0.3, 6, 16), M.pants, hip, [0, -0.25, 0]);
    const knee = new THREE.Group();
    knee.position.set(0, -0.5, 0);
    hip.add(knee);
    mesh(new THREE.CapsuleGeometry(0.18, 0.28, 6, 16), M.pants, knee, [0, -0.22, 0]);
    const shoe = mesh(new THREE.SphereGeometry(0.2, 20, 14), M.shoe, knee, [0, -0.47, 0.07], [0.95, 0.6, 1.45]);
    mesh(new THREE.CylinderGeometry(0.205, 0.205, 0.05, 20), M.peach, shoe, [0, -0.28, 0], [1, 1, 1]);
    legs[side < 0 ? 'R' : 'L'] = { hip, knee };
  }

  // ---------- torso ----------
  const torso = new THREE.Group();
  torso.position.set(0, 1.0, 0);
  body.add(torso);
  mesh(new THREE.CylinderGeometry(0.47, 0.5, 0.95, 28), M.shirt, torso, [0, 0.47, 0]);
  mesh(new THREE.SphereGeometry(0.47, 28, 16, 0, Math.PI * 2, 0, Math.PI / 2), M.shirt, torso, [0, 0.93, 0], [1.2, 0.5, 0.95]);

  // jacket: open at the front so the peach T-shirt shows
  const gap = 0.33;
  mesh(new THREE.CylinderGeometry(0.505, 0.555, 0.98, 32, 1, true, gap, Math.PI * 2 - gap * 2), M.navy, torso, [0, 0.47, 0]).material.side = THREE.DoubleSide;
  mesh(new THREE.SphereGeometry(0.505, 32, 12, Math.PI / 2 + gap, Math.PI * 2 - gap * 2, 0, Math.PI / 2), M.navy, torso, [0, 0.955, 0], [1.2, 0.5, 0.95]);
  // stripe accents across chest and back (white over peach), like the reference jacket
  mesh(new THREE.CylinderGeometry(0.518, 0.523, 0.1, 32, 1, true, gap, Math.PI * 2 - gap * 2), M.white, torso, [0, 0.62, 0]).material.side = THREE.DoubleSide;
  mesh(new THREE.CylinderGeometry(0.525, 0.53, 0.1, 32, 1, true, gap, Math.PI * 2 - gap * 2), M.peach, torso, [0, 0.51, 0]);
  // waistband
  mesh(new THREE.CylinderGeometry(0.565, 0.565, 0.1, 32, 1, true, gap, Math.PI * 2 - gap * 2), M.navy, torso, [0, 0.03, 0]);
  // white zip edges
  for (const side of [-1, 1]) {
    const a = gap * side;
    const z1 = mesh(new THREE.BoxGeometry(0.045, 0.98, 0.03), M.white, torso, [Math.sin(a) * 0.53, 0.47, Math.cos(a) * 0.53], [1, 1, 1], [0.05, a, 0]);
    z1.castShadow = false;
  }
  // hood behind the neck + drawstrings
  mesh(new THREE.TorusGeometry(0.3, 0.12, 12, 28), M.navy, torso, [0, 1.02, -0.12], [1.05, 1, 0.8], [Math.PI / 2 + 0.35, 0, 0]);
  mesh(new THREE.TorusGeometry(0.27, 0.05, 8, 24), M.white, torso, [0, 1.07, -0.1], [1.05, 1, 0.8], [Math.PI / 2 + 0.35, 0, 0]);
  for (const side of [-1, 1]) {
    mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.32, 6), M.white, torso, [0.15 * side, 0.82, 0.46], [1, 1, 1], [0.15, 0, 0]);
  }
  // T-shirt crew neck
  mesh(new THREE.TorusGeometry(0.19, 0.035, 8, 24), std(0xe57454, 0.7), torso, [0, 0.99, 0.03], [1, 1, 1], [Math.PI / 2 - 0.15, 0, 0]);
  // neck
  mesh(new THREE.CylinderGeometry(0.16, 0.17, 0.3, 16), M.skin, torso, [0, 1.08, 0.02]);

  // ---------- arms (shoulder -> elbow -> hand) ----------
  const arms = {};
  for (const side of [-1, 1]) {
    const shoulder = new THREE.Group();
    shoulder.position.set(0.6 * side, 0.86, 0);
    torso.add(shoulder);
    mesh(new THREE.SphereGeometry(0.17, 16, 12), M.navy, shoulder);
    mesh(new THREE.CapsuleGeometry(0.15, 0.3, 6, 16), M.navy, shoulder, [0, -0.24, 0]);
    mesh(new THREE.CylinderGeometry(0.158, 0.158, 0.07, 18), M.white, shoulder, [0, -0.18, 0]);
    mesh(new THREE.CylinderGeometry(0.158, 0.158, 0.07, 18), M.peach, shoulder, [0, -0.26, 0]);
    const elbow = new THREE.Group();
    elbow.position.set(0, -0.47, 0);
    shoulder.add(elbow);
    mesh(new THREE.CapsuleGeometry(0.135, 0.28, 6, 16), M.navy, elbow, [0, -0.19, 0]);
    mesh(new THREE.CylinderGeometry(0.145, 0.145, 0.07, 18), M.white, elbow, [0, -0.36, 0]);
    const hand = new THREE.Group();
    hand.position.set(0, -0.47, 0);
    elbow.add(hand);
    mesh(new THREE.SphereGeometry(0.13, 18, 14), M.skin, hand, [0, -0.02, 0], [1, 1.1, 0.9]);
    // index finger: pivot at the front-bottom of the fist, extends along -y
    const index = new THREE.Group();
    index.position.set(0, -0.1, 0.05);
    hand.add(index);
    mesh(new THREE.CapsuleGeometry(0.04, 0.13, 4, 10), M.skin, index, [0, -0.08, 0]);
    // thumb: extends along +z (forward of the fist)
    const thumb = new THREE.Group();
    thumb.position.set(-0.06 * side, -0.02, 0.07);
    hand.add(thumb);
    mesh(new THREE.CapsuleGeometry(0.045, 0.1, 4, 10), M.skin, thumb, [0, 0, 0.07], [1, 1, 1], [Math.PI / 2, 0, 0]);
    arms[side < 0 ? 'R' : 'L'] = { shoulder, elbow, hand, index, thumb };
  }

  // ---------- head ----------
  const neck = new THREE.Group();
  neck.position.set(0, 1.2, 0);
  torso.add(neck);
  const head = new THREE.Group();
  head.position.set(0, 0.68, 0.02);
  head.scale.setScalar(0.92);
  neck.add(head);
  // one sculpted head mesh: round skull with soft chubby cheeks
  const headGeo = new THREE.SphereGeometry(0.85, 64, 48);
  const hp = headGeo.attributes.position;
  for (let i = 0; i < hp.count; i++) {
    const x = hp.getX(i), y = hp.getY(i), z = hp.getZ(i);
    const k = Math.exp(-(((y + 0.3) / 0.28) ** 2)); // cheek band
    const front = Math.max(0, z / 0.85);
    hp.setXYZ(i, x * (1 + 0.07 * k), y * (y < 0 ? 0.97 : 1), z * (1 + 0.1 * k * front));
  }
  headGeo.computeVertexNormals();
  mesh(headGeo, M.skin, head, [0, 0, 0], [1, 0.98, 0.93]);
  for (const side of [-1, 1]) {
    mesh(new THREE.SphereGeometry(0.17, 16, 12), M.skin, head, [0.83 * side, -0.06, -0.02], [0.5, 1, 0.75]);
    mesh(new THREE.SphereGeometry(0.08, 12, 10), M.skinShade, head, [0.87 * side, -0.06, 0.0], [0.4, 0.8, 0.6]);
  }

  // hair: a shell clipped along a hairline (front fringe line, above the ears,
  // down to the nape), plus side-swept fringe strands and crown volume
  const capMat = M.hair.clone();
  capMat.side = THREE.DoubleSide;
  capMat.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vHair;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvHair = position;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vHair;')
      .replace('void main() {', `void main() {
        float az = atan(vHair.x, vHair.z);
        float c = cos(az);
        float h = c > 0.0 ? mix(0.2, 0.47, c * c) : mix(0.2, -0.72, pow(-c, 1.3));
        if (vHair.y < h) discard;`);
  };
  capMat.customProgramCacheKey = () => 'affan-hair-cap';
  const cap = mesh(new THREE.SphereGeometry(1, 56, 40), capMat, head, [0, 0.03, -0.02], [0.905, 0.9, 0.855]);
  cap.castShadow = false;
  const surfZ = (x, y) => 0.79 * Math.sqrt(Math.max(0.02, 1 - (x / 0.85) ** 2 - (y / 0.833) ** 2));
  // fringe strands sweep towards Affan's left (+x), tips just above the brows
  const strands = [
    [-0.56, 0.36, 0.26, 0.2], [-0.4, 0.43, 0.28, 0.45], [-0.22, 0.46, 0.3, 0.55], [-0.04, 0.47, 0.3, 0.6],
    [0.14, 0.46, 0.3, 0.62], [0.31, 0.43, 0.28, 0.6], [0.47, 0.39, 0.25, 0.5], [0.62, 0.3, 0.22, 0.3],
  ];
  for (const [x, y, len, rz] of strands) {
    const z = surfZ(x, y) + 0.02;
    const m = mesh(new THREE.SphereGeometry(1, 20, 14), M.hair, head, [x, y, z], [0.15, len, 0.11]);
    m.rotation.set(-Math.asin(y / 0.833) * 0.9, Math.atan2(x, z) * 0.9, rz, 'YXZ');
  }
  for (const [x, y, z, s] of [[0.0, 0.74, 0.2, 0.36], [0.3, 0.7, 0.05, 0.3], [-0.31, 0.71, 0.08, 0.3], [0.1, 0.76, -0.25, 0.34], [-0.2, 0.66, -0.46, 0.3], [0.24, 0.6, -0.53, 0.28]]) {
    mesh(new THREE.SphereGeometry(s, 20, 14), M.hair, head, [x, y, z], [1.15, 0.42, 1.05]);
  }
  // subtle hair sheen streak
  mesh(new THREE.SphereGeometry(1, 20, 14), M.hairHi, head, [-0.1, 0.83, 0.12], [0.36, 0.08, 0.25], [0.2, 0, 0.4]).castShadow = false;

  // eyes
  const eyes = [];
  for (const side of [-1, 1]) {
    const eye = new THREE.Group();
    eye.position.set(0.29 * side, -0.02, 0.68);
    head.add(eye);
    const ball = new THREE.Group();
    eye.add(ball);
    mesh(new THREE.SphereGeometry(0.155, 24, 18), M.sclera, ball, [0, 0, 0], [1, 1.12, 1]).castShadow = false;
    const iris = new THREE.Group();
    ball.add(iris);
    mesh(new THREE.SphereGeometry(0.11, 24, 16), M.iris, iris, [0, 0, 0.115], [1, 1.08, 0.35]).castShadow = false;
    mesh(new THREE.SphereGeometry(0.062, 18, 12), M.pupil, iris, [0, 0, 0.145], [1, 1.05, 0.3]).castShadow = false;
    mesh(new THREE.SphereGeometry(0.03, 10, 8), M.shine, iris, [0.035, 0.05, 0.16]).castShadow = false;
    mesh(new THREE.SphereGeometry(0.014, 8, 6), M.shine, iris, [-0.04, -0.035, 0.158]).castShadow = false;
    // upper eyelid (skin shell) closes for blinks
    const lid = new THREE.Group();
    eye.add(lid);
    const lidMesh = mesh(new THREE.SphereGeometry(0.168, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), M.skin, lid, [0, 0, 0], [1.02, 1.15, 1.02]);
    lidMesh.castShadow = false;
    eyes.push({ eye, ball, iris, lid });
  }

  // eyebrows
  const brows = [];
  for (const side of [-1, 1]) {
    const b = new THREE.Group();
    b.position.set(0.3 * side, 0.27, 0.73);
    head.add(b);
    mesh(new THREE.CapsuleGeometry(0.032, 0.17, 4, 10), M.hair, b, [0, 0, 0], [1, 1, 0.7], [0, 0, Math.PI / 2 + 0.1 * side]);
    b.rotation.y = 0.35 * side;
    brows.push(b);
  }

  // glasses (dark rectangular frames, as in the reference)
  const glasses = new THREE.Group();
  glasses.position.set(0, -0.02, 0.86);
  head.add(glasses);
  const fg = glassesFrameGeo();
  for (const side of [-1, 1]) {
    const f = mesh(fg, M.frame, glasses, [0.29 * side, 0, -0.04 * 0], [1, 1, 1], [0, 0.2 * side, 0]);
    f.position.z = -0.03;
    const lens = mesh(new THREE.PlaneGeometry(0.34, 0.24), M.lens, glasses, [0.29 * side, 0, -0.025], [1, 1, 1], [0, 0.2 * side, 0]);
    lens.castShadow = false;
    // temple arm running back to the ear
    const arm = mesh(new THREE.BoxGeometry(0.035, 0.04, 0.8), M.frame, glasses, [0.6 * side, 0.04, -0.42], [1, 1, 1], [0, -0.42 * side, 0]);
    arm.castShadow = false;
  }
  mesh(new THREE.TorusGeometry(0.07, 0.02, 8, 16, Math.PI), M.frame, glasses, [0, 0.04, 0.0], [1, 0.8, 1], [0, 0, 0]);

  // nose
  mesh(new THREE.SphereGeometry(0.075, 16, 12), M.skinShade, head, [0, -0.18, 0.79], [1.15, 0.85, 0.9]);

  // mouth: closed smile arc + open "D" mouth that scales with speech
  const mouth = new THREE.Group();
  mouth.position.set(0, -0.39, 0.715);
  mouth.rotation.x = -0.22;
  head.add(mouth);
  const smile = mesh(new THREE.TorusGeometry(0.1, 0.02, 8, 24, Math.PI), M.lip, mouth, [0, 0.03, 0.02], [1, 0.7, 1], [0, 0, Math.PI]);
  smile.castShadow = false;
  const open = new THREE.Group();
  mouth.add(open);
  const openMesh = mesh(new THREE.SphereGeometry(0.12, 24, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), M.mouth, open, [0, 0.0, 0], [1.1, 1, 0.42]);
  openMesh.castShadow = false;
  mesh(new THREE.SphereGeometry(0.06, 12, 8), M.tongue, open, [0, -0.075, 0.03], [1.2, 0.6, 0.5]).castShadow = false;
  // round "O" mouth for wow moments
  const oMouth = mesh(new THREE.SphereGeometry(0.08, 20, 14), M.mouth, mouth, [0, -0.03, 0.0], [1, 1.25, 0.4]);
  oMouth.castShadow = false;

  // cheek blush
  for (const side of [-1, 1]) {
    const b = new THREE.Mesh(new THREE.CircleGeometry(0.1, 24), M.blush);
    b.position.set(0.47 * side, -0.24, 0.62);
    b.lookAt(b.position.clone().multiply(new THREE.Vector3(2.2, 0.6, 2.2)));
    head.add(b);
  }

  const parts = { root, body, torso, neck, head, legs, arms, eyes, brows, mouth, smile, open, oMouth, glasses };

  // ---------- pose ----------
  // All values optional. Arms: {x, y, z} shoulder rotation, el = elbow bend,
  // point = index finger extension 0..1, thumb = thumbs-up 0..1.
  const DEF = {
    yaw: 0, lean: 0, tilt: 0, bob: 0,
    headYaw: 0, headPitch: 0, headRoll: 0,
    lookX: 0, lookY: 0, blink: 0,
    talk: 0, smile: 0.6, wow: 0, brow: 0,
    armL: { x: 0, y: 0, z: 0.12, el: -0.15, point: 0, thumb: 0 },
    armR: { x: 0, y: 0, z: -0.12, el: -0.15, point: 0, thumb: 0 },
    legL: { x: 0, knee: 0 }, legR: { x: 0, knee: 0 },
  };

  // Two-bone IK: place the hand at `reach` (torso-local [x, y, z]). The elbow
  // bends towards `pole` (torso-local direction, default down/back/out).
  const _S = new THREE.Vector3(), _T = new THREE.Vector3(), _d = new THREE.Vector3(), _n = new THREE.Vector3();
  const _u = new THREE.Vector3(), _f = new THREE.Vector3(), _x = new THREE.Vector3(), _y = new THREE.Vector3(), _z = new THREE.Vector3();
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion();
  function solveArm(a, reach, pole) {
    const L1 = 0.47, L2 = 0.49;
    _S.copy(a.shoulder.position);
    _T.fromArray(reach);
    _d.subVectors(_T, _S);
    const dist = clamp(_d.length(), 0.15, L1 + L2 - 0.005);
    _d.normalize();
    const ang = Math.acos(clamp((L1 * L1 + dist * dist - L2 * L2) / (2 * L1 * dist), -1, 1));
    _n.fromArray(pole).normalize();
    _n.sub(_x.copy(_d).multiplyScalar(_n.dot(_d))).normalize(); // pole projected off the aim line
    _u.copy(_d).multiplyScalar(Math.cos(ang)).addScaledVector(_n, Math.sin(ang)).normalize();
    const elbowPos = _x.copy(_S).addScaledVector(_u, L1);
    _f.copy(_T).sub(elbowPos).normalize();
    _y.copy(_u).negate();
    _z.copy(_f).addScaledVector(_u, -_f.dot(_u));
    if (_z.lengthSq() < 1e-6) _z.set(0, 0, 1).addScaledVector(_u, -_u.z);
    _z.normalize();
    _x.crossVectors(_y, _z).normalize();
    _m.makeBasis(_x, _y, _z);
    _q.setFromRotationMatrix(_m);
    a.shoulder.quaternion.copy(_q);
    a.elbow.rotation.set(-Math.acos(clamp(_u.dot(_f), -1, 1)), 0, 0);
  }

  function setArm(a, p, side) {
    if (p.reach) {
      solveArm(a, p.reach, p.pole || [0.3 * side, -1, -0.6]);
    } else {
      a.shoulder.rotation.set(p.x ?? 0, p.y ?? 0, p.z ?? 0, 'XZY');
      a.elbow.rotation.set(p.el ?? 0, 0, 0);
    }
    a.hand.rotation.set(p.wx ?? 0, p.wy ?? 0, p.wz ?? 0);
    const pt = clamp(p.point ?? 0);
    a.index.scale.setScalar(lerp(0.35, 1, pt));
    a.index.rotation.x = lerp(1.6, 0, pt);
    const th = clamp(p.thumb ?? 0);
    a.thumb.scale.setScalar(lerp(0.7, 1.45, th));
    a.thumb.rotation.set(lerp(0.6, 0, th), 0, 0);
  }

  function pose(p = {}) {
    const q = { ...DEF, ...p, armL: { ...DEF.armL, ...(p.armL || {}) }, armR: { ...DEF.armR, ...(p.armR || {}) } };
    root.rotation.y = q.yaw;
    body.position.y = q.bob;
    body.rotation.set(q.lean, 0, q.tilt);
    head.rotation.set(q.headPitch, q.headYaw, q.headRoll, 'YXZ');
    for (const e of eyes) {
      e.iris.rotation.set(-q.lookY * 0.45, q.lookX * 0.5, 0);
      const bl = clamp(q.blink);
      e.lid.rotation.x = lerp(-1.75, -0.05, bl) - 0.25 * clamp(q.wow) * (1 - bl);
      e.ball.scale.y = lerp(1, 0.25, bl * bl);
    }
    brows.forEach((b, i) => {
      b.position.y = 0.27 + 0.07 * q.brow + 0.05 * q.wow;
      b.rotation.z = (i === 0 ? -1 : 1) * 0.12 * q.brow;
    });
    const talk = clamp(q.talk);
    const wow = clamp(q.wow);
    open.scale.set(lerp(0.95, 1.1, talk) * (1 - wow), lerp(0.08, 0.95, talk) * (1 - wow) + 0.001, 1);
    open.visible = talk > 0.04 && wow < 0.95;
    smile.visible = talk < 0.25 && wow < 0.3;
    smile.scale.set(lerp(0.6, 1.1, q.smile), lerp(0.25, 0.9, q.smile), 1);
    oMouth.visible = wow > 0.05;
    oMouth.scale.set(wow, wow * 1.25, 0.4);
    setArm(arms.L, q.armL, 1);
    setArm(arms.R, q.armR, -1);
    for (const [k, leg] of [['L', legs.L], ['R', legs.R]]) {
      const l = q['leg' + k] || {};
      leg.hip.rotation.set(l.x ?? 0, 0, l.z ?? 0);
      leg.knee.rotation.set(l.knee ?? 0, 0, 0);
    }
  }
  pose();
  // Convert a world-space point to torso-local coordinates (for IK reach targets).
  const toTorso = (v) => {
    root.updateMatrixWorld(true);
    return torso.worldToLocal(v.clone()).toArray();
  };
  return { root, parts, pose, toTorso };
}

// Common poses expressed as partial pose objects.
export const POSES = {
  seated: { legL: { x: -1.5, knee: 1.45 }, legR: { x: -1.5, knee: 1.45 } },
  thumbsUpR: { armR: { reach: [-0.32, 0.62, 0.62], pole: [-1, -0.6, -0.3], thumb: 1, wy: -1.2, wx: 0.15 } },
  thinkR: { armR: { reach: [-0.02, 1.36, 0.62], pole: [-0.6, -1, 0.1], point: 1, wx: -0.4 } },
  wagR: (t) => ({ armR: { reach: [-1.0, 1.35, 0.45], pole: [-1, -1, 0], point: 1, wz: Math.sin(t * 16) * 0.4 } }),
  waveR: (t) => ({ armR: { reach: [-0.75, 1.55, 0.35 + Math.sin(t * 10) * 0.12], pole: [-1, -0.5, -0.4] } }),
};

// Natural blink pattern: closes for ~0.15 s every few seconds.
export function blinkAt(t, seed = 0) {
  const period = 3.1 + (seed % 3) * 0.4;
  const ph = (t + seed * 0.77) % period;
  return ph < 0.16 ? Math.sin((ph / 0.16) * Math.PI) : 0;
}
