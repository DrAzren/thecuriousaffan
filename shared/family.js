// Affan's parents, Ibu and Ayah, built in the same soft procedural style as
// Affan so they sit naturally beside him. They are supporting characters (no
// lip sync) used for the "parents help young children" moments.
//
//   Ibu: cyan tudung (hijab), soft-yellow baju kurung.
//   Ayah: short black hair, small moustache, navy polo with peach collar.
//
// Units: feet at y = 0, ~5.6 units tall (Affan is ~3.8), faces +z.
import * as THREE from 'three';
import { clamp, lerp } from './core.js';

const std = (color, rough = 0.65, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0, ...extra });

function mesh(geo, mat, parent, pos = [0, 0, 0], scale = [1, 1, 1], rot = [0, 0, 0], shadow = true) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(...pos);
  m.scale.set(...scale);
  m.rotation.set(...rot);
  m.castShadow = shadow;
  m.receiveShadow = shadow;
  parent.add(m);
  return m;
}

export const FAMILY = {
  ibu: { skin: 0xe9ab84, top: 0xffdb8a, trim: 0xf2915f, skirt: 0xffd27a, scarf: 0x4cc6d8, scarfHi: 0x8fe3ee, shoe: 0xf4f2ee },
  ayah: { skin: 0xd99a72, top: 0x22336e, trim: 0xf2915f, pants: 0x8e8778, hair: 0x1d140e, shoe: 0x3b3029 },
};

// Two-bone IK in torso space; bones hang along -y. Same method as Affan's arm IK.
const _S = new THREE.Vector3(), _T = new THREE.Vector3(), _d = new THREE.Vector3(), _n = new THREE.Vector3();
const _u = new THREE.Vector3(), _f = new THREE.Vector3(), _x = new THREE.Vector3(), _y = new THREE.Vector3(), _z = new THREE.Vector3();
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion();
function solve(a, reach, pole, L1, L2) {
  _S.copy(a.shoulder.position);
  _T.fromArray(reach);
  _d.subVectors(_T, _S);
  const dist = clamp(_d.length(), 0.2, L1 + L2 - 0.005);
  _d.normalize();
  const ang = Math.acos(clamp((L1 * L1 + dist * dist - L2 * L2) / (2 * L1 * dist), -1, 1));
  _n.fromArray(pole).normalize();
  _n.sub(_x.copy(_d).multiplyScalar(_n.dot(_d))).normalize();
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

// Rounded torso (lathe): hem -> waist -> chest -> soft shoulders -> neck.
function torsoGeo(y0, hem) {
  const pts = [[hem, y0], [0.58, 0.35], [0.6, 0.95], [0.62, 1.35], [0.56, 1.58], [0.4, 1.74], [0.2, 1.8], [0.001, 1.81]].map(([r, y]) => new THREE.Vector2(r, y));
  return new THREE.LatheGeometry(new THREE.SplineCurve(pts).getPoints(40), 40);
}

export function makeParent({ kind = 'ibu' } = {}) {
  const ibu = kind === 'ibu';
  const C = FAMILY[kind];
  const M = {
    skin: std(C.skin, 0.55, { emissive: 0x3a1608, emissiveIntensity: 0.16 }),
    top: std(C.top, 0.75, { emissive: ibu ? 0x3a2a08 : 0x060a1c, emissiveIntensity: ibu ? 0.12 : 0.3 }),
    trim: std(C.trim, 0.7),
    low: std(ibu ? C.skirt : C.pants, 0.8),
    shoe: std(C.shoe, 0.5),
    sclera: std(0xffffff, 0.3, { emissive: 0xffffff, emissiveIntensity: 0.1 }),
    iris: std(0x3a2214, 0.3),
    pupil: std(0x0a0605, 0.2),
    shine: new THREE.MeshBasicMaterial({ color: 0xffffff }),
    dark: std(0x1d140e, 0.5),
    lip: std(0xb0584e, 0.5),
    blush: new THREE.MeshBasicMaterial({ color: 0xf3887e, transparent: true, opacity: 0.25, depthWrite: false }),
  };
  const root = new THREE.Group();
  root.name = ibu ? 'Ibu' : 'Ayah';
  const body = new THREE.Group();
  root.add(body);

  // ---------- lower body ----------
  if (ibu) {
    mesh(new THREE.CylinderGeometry(0.56, 0.86, 2.5, 36), M.low, body, [0, 1.25, 0]);
    for (const s of [-1, 1]) mesh(new THREE.SphereGeometry(0.17, 16, 10), M.shoe, body, [0.24 * s, 0.07, 0.42], [1, 0.55, 1.5]);
  } else {
    for (const s of [-1, 1]) {
      mesh(new THREE.CapsuleGeometry(0.24, 2.0, 6, 16), M.low, body, [0.27 * s, 1.3, 0]);
      mesh(new THREE.SphereGeometry(0.22, 16, 10), M.shoe, body, [0.27 * s, 0.1, 0.1], [1, 0.55, 1.6]);
    }
  }

  // ---------- upper body: pivots at the hips so the parent can bend down ----------
  const upper = new THREE.Group();
  upper.position.set(0, 2.45, 0);
  body.add(upper);
  const torso = new THREE.Group();
  upper.add(torso);
  if (ibu) {
    // baju kurung: long tunic over the skirt
    mesh(torsoGeo(-0.45, 0.72), M.top, torso, [0, 0, 0], [1, 1, 0.82]);
    mesh(new THREE.CylinderGeometry(0.725, 0.73, 0.08, 36, 1, true), M.trim, torso, [0, -0.42, 0], [1, 1, 0.82]).material.side = THREE.DoubleSide;
  } else {
    mesh(torsoGeo(-0.15, 0.6), M.top, torso, [0, 0, 0], [1, 1, 0.82]);
    // polo collar + placket
    mesh(new THREE.TorusGeometry(0.2, 0.06, 8, 24), M.trim, torso, [0, 1.74, 0.04], [1, 1, 1], [Math.PI / 2 - 0.2, 0, 0]);
    mesh(new THREE.BoxGeometry(0.1, 0.42, 0.04), M.trim, torso, [0, 1.48, 0.565], [1, 1, 1], [0.08, 0, 0]);
  }
  mesh(new THREE.CylinderGeometry(0.17, 0.18, 0.4, 16), M.skin, torso, [0, 1.8, 0.02]);

  // ---------- arms ----------
  const L1 = 0.82, L2 = 0.8;
  const arms = {};
  for (const side of [-1, 1]) {
    const shoulder = new THREE.Group();
    shoulder.position.set(0.7 * side, 1.5, 0);
    torso.add(shoulder);
    mesh(new THREE.SphereGeometry(0.19, 16, 12), M.top, shoulder);
    mesh(new THREE.CapsuleGeometry(0.16, 0.55, 6, 16), M.top, shoulder, [0, -0.4, 0]);
    const elbow = new THREE.Group();
    elbow.position.set(0, -L1, 0);
    shoulder.add(elbow);
    mesh(new THREE.CapsuleGeometry(0.135, 0.55, 6, 16), ibu ? M.top : M.skin, elbow, [0, -0.37, 0]);
    if (ibu) mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.06, 16), M.trim, elbow, [0, -0.68, 0]);
    else mesh(new THREE.CylinderGeometry(0.175, 0.175, 0.08, 16), M.trim, shoulder, [0, -0.66, 0]);
    const hand = new THREE.Group();
    hand.position.set(0, -L2, 0);
    elbow.add(hand);
    mesh(new THREE.SphereGeometry(0.15, 18, 14), M.skin, hand, [0, -0.04, 0], [0.95, 1.15, 0.75]);
    mesh(new THREE.CapsuleGeometry(0.05, 0.12, 4, 10), M.skin, hand, [-0.09 * side, -0.02, 0.07], [1, 1, 1], [0.5, 0, 0.6 * side]);
    arms[side < 0 ? 'R' : 'L'] = { shoulder, elbow, hand };
  }

  // ---------- head ----------
  const head = new THREE.Group();
  head.position.set(0, 2.38, 0.03);
  torso.add(head);
  mesh(new THREE.SphereGeometry(0.6, 48, 36), M.skin, head, [0, 0, 0], [0.94, 1.06, 0.95]);
  const eyes = [];
  for (const side of [-1, 1]) {
    const e = new THREE.Group();
    e.position.set(0.2 * side, 0.02, 0.5);
    head.add(e);
    const ball = new THREE.Group();
    e.add(ball);
    mesh(new THREE.SphereGeometry(0.1, 18, 14), M.sclera, ball, [0, 0, 0], [1, 1.12, 0.6], [0, 0, 0], false);
    const iris = new THREE.Group();
    ball.add(iris);
    mesh(new THREE.SphereGeometry(0.068, 16, 12), M.iris, iris, [0, 0, 0.045], [1, 1.08, 0.4], [0, 0, 0], false);
    mesh(new THREE.SphereGeometry(0.038, 12, 8), M.pupil, iris, [0, 0, 0.065], [1, 1, 0.3], [0, 0, 0], false);
    mesh(new THREE.SphereGeometry(0.018, 8, 6), M.shine, iris, [0.022, 0.03, 0.075], [1, 1, 1], [0, 0, 0], false);
    if (ibu) mesh(new THREE.TorusGeometry(0.1, 0.014, 6, 16, Math.PI * 0.8), M.dark, e, [0, 0.015, 0.03], [1, 1.1, 1], [0, 0, Math.PI * 0.1], false);
    eyes.push({ ball, iris });
  }
  const brows = [];
  for (const side of [-1, 1]) {
    const b = new THREE.Group();
    b.position.set(0.21 * side, 0.2, 0.52);
    head.add(b);
    mesh(new THREE.CapsuleGeometry(ibu ? 0.018 : 0.028, 0.13, 4, 8), M.dark, b, [0, 0, 0], [1, 1, 0.7], [0, 0, Math.PI / 2 - 0.1 * side], false);
    b.rotation.y = 0.3 * side;
    brows.push(b);
  }
  mesh(new THREE.SphereGeometry(0.075, 14, 10), std(C.skin, 0.55, { emissive: 0x3a1608, emissiveIntensity: 0.1 }), head, [0, -0.1, 0.58], [1, 0.85, 0.9]);
  const smile = mesh(new THREE.TorusGeometry(0.12, 0.022, 8, 24, Math.PI), M.lip, head, [0, -0.29, 0.53], [1, 0.6, 1], [-0.2, 0, Math.PI], false);
  for (const side of [-1, 1]) {
    const b = new THREE.Mesh(new THREE.CircleGeometry(0.09, 20), M.blush);
    b.position.set(0.33 * side, -0.17, 0.47);
    b.lookAt(b.position.clone().multiply(new THREE.Vector3(2.4, 0.5, 2.0)));
    head.add(b);
  }

  if (ibu) {
    // tudung: a shell around the head with an opening for the face, plus a drape over the shoulders
    const sMat = std(C.scarf, 0.8, { emissive: 0x06303a, emissiveIntensity: 0.25, side: THREE.DoubleSide });
    const shell = sMat.clone();
    shell.onBeforeCompile = (sh) => {
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vP;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvP = position;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vP;').replace('void main() {', `void main() {
        if (vP.z > 0.0 && pow(vP.x / 0.62, 2.0) + pow((vP.y + 0.18) / 0.7, 2.0) < 1.0) discard;`);
    };
    shell.customProgramCacheKey = () => 'ibu-tudung';
    mesh(new THREE.SphereGeometry(1, 48, 32), shell, head, [0, 0.05, -0.03], [0.68, 0.76, 0.7]);
    // soft band framing the face
    mesh(new THREE.TorusGeometry(0.47, 0.06, 10, 40), std(C.scarfHi, 0.8), head, [0, -0.02, 0.36], [0.93, 1.08, 0.6], [0.06, 0, 0]);
    const drape = mesh(new THREE.CylinderGeometry(0.5, 1.02, 1.25, 40, 1, true), sMat, head, [0, -0.98, -0.02], [1, 1, 0.84], [0.12, 0, 0]);
    drape.material = sMat;
    mesh(new THREE.SphereGeometry(0.5, 24, 16), sMat, head, [0, -0.52, 0.08], [1.0, 0.45, 0.95]);
  } else {
    // short neat hair: shell clipped at a hairline
    const hMat = std(C.hair, 0.45, { emissive: 0x0d0805, emissiveIntensity: 0.2, side: THREE.DoubleSide });
    hMat.onBeforeCompile = (sh) => {
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vH;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvH = position;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vH;').replace('void main() {', `void main() {
        float c = cos(atan(vH.x, vH.z));
        float h = c > 0.0 ? mix(0.25, 0.5, c * c) : mix(0.25, -0.35, pow(-c, 1.3));
        if (vH.y < h) discard;`);
    };
    hMat.customProgramCacheKey = () => 'ayah-hair';
    mesh(new THREE.SphereGeometry(1, 48, 32), hMat, head, [0, 0.04, -0.02], [0.6, 0.66, 0.6], [0, 0, 0], false);
    for (const [x, y, z, s] of [[0, 0.56, 0.12, 0.3], [0.2, 0.5, 0.25, 0.22], [-0.18, 0.52, 0.2, 0.22]]) mesh(new THREE.SphereGeometry(s, 18, 12), hMat, head, [x, y, z], [1.2, 0.45, 1]);
    for (const side of [-1, 1]) mesh(new THREE.SphereGeometry(0.12, 12, 10), M.skin, head, [0.56 * side, -0.02, 0], [0.45, 1, 0.7]);
    mesh(new THREE.CapsuleGeometry(0.03, 0.16, 4, 10), M.dark, head, [0, -0.2, 0.57], [1, 1, 0.6], [0, 0, Math.PI / 2], false);
  }

  function setArm(a, p, side) {
    if (p.reach) solve(a, p.reach, p.pole || [0.3 * side, -1, -0.6], L1, L2);
    else {
      a.shoulder.rotation.set(p.x ?? 0, p.y ?? 0, p.z ?? 0.08 * side, 'XZY');
      a.elbow.rotation.set(p.el ?? -0.1, 0, 0);
    }
    a.hand.rotation.set(p.wx ?? 0, p.wy ?? 0, p.wz ?? 0);
  }

  function pose(p = {}) {
    upper.rotation.set(p.lean ?? 0, p.twist ?? 0, p.tilt ?? 0);
    root.rotation.y = p.yaw ?? 0;
    head.rotation.set(p.headPitch ?? 0, p.headYaw ?? 0, p.headRoll ?? 0, 'YXZ');
    const bl = clamp(p.blink ?? 0);
    for (const e of eyes) {
      e.ball.scale.y = lerp(1, 0.12, bl);
      e.iris.rotation.set(-(p.lookY ?? 0) * 0.4, (p.lookX ?? 0) * 0.45, 0);
    }
    brows.forEach((b) => (b.position.y = 0.2 + 0.05 * (p.brow ?? 0)));
    const sm = p.smile ?? 0.8;
    smile.scale.set(lerp(0.7, 1.15, sm), lerp(0.3, 0.75, sm), 1);
    setArm(arms.L, p.armL || {}, 1);
    setArm(arms.R, p.armR || {}, -1);
  }
  pose();
  const toTorso = (v) => {
    root.updateMatrixWorld(true);
    return torso.worldToLocal(v.clone()).toArray();
  };
  return { root, parts: { body, upper, torso, head, arms }, pose, toTorso };
}
