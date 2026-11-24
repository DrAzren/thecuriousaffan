// The Curious Affan: version 2 cast (from Episode 064), built to match the
// approved 3D avatar sheets in assets/characters/:
//   affan_v2_front.webp / affan_v2_side.webp  (made by the owner in Higgsfield)
//   mama_v2_front.png  / mama_v2_side.png     (generated to match)
//
// Affan v2: a 5-6 year-old Malaysian boy with kid proportions (head about a
// quarter of his height), warm tan skin, brown eyes, full side-swept dark
// brown hair, black rectangular glasses with blue temples, a coral T-shirt
// under an open navy hooded zip jacket with white and coral colour-block
// bands on the chest and sleeves, ribbed navy cuffs and hem with white
// stripes, navy joggers with ribbed cuffs, and white sneakers with coral and
// blue panels.
//
// Mama v2: a young Malay mother with adult proportions, pastel pink hijab
// draped to a point over the chest, a teal baju kurung with small white
// flowers and navy/coral cuffs, a long teal kain and cream flat shoes.
//
// Same interface as makeAffan() in affan.js: { root, parts, pose, toTorso },
// the same torso-local frame (waist at y 0, shoulders near y 0.88, neck at
// y 1.2), so POSES and reach targets carry over. Feet at y = 0, faces +z.
import * as THREE from 'three';
import { clamp, lerp } from './core.js';

const std = (color, rough = 0.6, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0, ...extra });

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
  const x = -w / 2, y = -h / 2;
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
function floralTex() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#3e8783';
  g.fillRect(0, 0, 256, 256);
  const flower = (x, y, r) => {
    g.fillStyle = '#eef6f2';
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      g.beginPath();
      g.ellipse(x + Math.cos(a) * r * 0.55, y + Math.sin(a) * r * 0.55, r * 0.45, r * 0.3, a, 0, Math.PI * 2);
      g.fill();
    }
    g.fillStyle = '#c8e0d8';
    g.beginPath();
    g.arc(x, y, r * 0.22, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = '#cfe6dc';
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(x, y + r * 0.7);
    g.lineTo(x - r * 0.2, y + r * 1.6);
    g.stroke();
  };
  for (const [x, y] of [[40, 40], [168, 40], [104, 120], [232, 120], [40, 200], [168, 200]]) flower(x, y, 13);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

export const CAST2 = {
  skin: 0xd9996c,
  skinShade: 0xc8845a,
  hair: 0x2a1a12,
  hairHi: 0x4a3222,
  navy: 0x2b3566,
  coral: 0xec8670,
  white: 0xf3f1ec,
  frame: 0x141418,
  temple: 0x2f6fe0,
  iris: 0x6a3a1c,
  mouth: 0x5e1f24,
  tongue: 0xe57c7c,
  lip: 0xa8524a,
  blush: 0xf3887e,
  // Mama
  tudung: 0xf2a0a8,
  baju: 0x3e8783,
  shoeCream: 0xf3ead8,
};

export function makeCast2(who = 'affan') {
  const mama = who === 'mama';
  const C = CAST2;
  // proportions (body-local)
  const P = mama
    ? { hipY: 1.95, hipX: 0.18, thigh: 0.92, shin: 0.92, torsoY: 1.93, torsoR: 0.4, shX: 0.5, shY: 0.9, L1: 0.6, L2: 0.58, headScale: 0.56, headY: 0.48, legR: 0.16 }
    : { hipY: 1.5, hipX: 0.2, thigh: 0.72, shin: 0.72, torsoY: 1.48, torsoR: 0.44, shX: 0.56, shY: 0.88, L1: 0.5, L2: 0.5, headScale: 0.6, headY: 0.5, legR: 0.18 };
  const M = {
    skin: std(C.skin, 0.55, { emissive: 0x3a1608, emissiveIntensity: 0.18 }),
    skinShade: std(C.skinShade, 0.55, { emissive: 0x3a1608, emissiveIntensity: 0.15 }),
    hair: std(C.hair, 0.42, { emissive: 0x0d0805, emissiveIntensity: 0.2 }),
    hairHi: std(C.hairHi, 0.4),
    navy: std(C.navy, 0.75, { emissive: 0x060a1c, emissiveIntensity: 0.3 }),
    coral: std(C.coral, 0.75, { emissive: 0x3a1206, emissiveIntensity: 0.15 }),
    white: std(C.white, 0.7),
    sole: std(0xffffff, 0.5),
    frame: std(C.frame, 0.25, { metalness: 0.1 }),
    temple: std(C.temple, 0.3),
    sclera: std(0xffffff, 0.3, { emissive: 0xffffff, emissiveIntensity: 0.12 }),
    iris: std(C.iris, 0.3),
    pupil: std(0x0a0605, 0.2),
    shine: new THREE.MeshBasicMaterial({ color: 0xffffff }),
    mouth: std(C.mouth, 0.5),
    tongue: std(C.tongue, 0.5),
    lip: std(mama ? 0xc0645e : C.lip, 0.5),
    blush: new THREE.MeshBasicMaterial({ color: C.blush, transparent: true, opacity: 0.3, depthWrite: false }),
    lens: new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.05, transparent: true, opacity: 0.08, depthWrite: false }),
  };
  if (mama) {
    const tex = floralTex();
    M.baju = std(0xffffff, 0.8, { map: tex, emissive: 0x06201e, emissiveIntensity: 0.2 });
    M.bajuPlain = std(C.baju, 0.8, { emissive: 0x06201e, emissiveIntensity: 0.2 });
    M.kain = std(C.baju, 0.8, { emissive: 0x06201e, emissiveIntensity: 0.2, side: THREE.DoubleSide });
    M.tudung = std(C.tudung, 0.85, { emissive: 0x3a1020, emissiveIntensity: 0.15, side: THREE.DoubleSide });
    M.shoe = std(C.shoeCream, 0.5);
  }

  const root = new THREE.Group();
  root.name = mama ? 'Mama' : 'Affan';
  const body = new THREE.Group();
  root.add(body);

  // ---------- legs ----------
  const legs = {};
  for (const side of [-1, 1]) {
    const hip = new THREE.Group();
    hip.position.set(P.hipX * side, P.hipY, 0);
    body.add(hip);
    const legMat = mama ? M.kain : M.navy;
    mesh(new THREE.CapsuleGeometry(P.legR + 0.02, P.thigh - 0.3, 6, 16), legMat, hip, [0, -P.thigh / 2, 0]);
    const knee = new THREE.Group();
    knee.position.set(0, -P.thigh, 0);
    hip.add(knee);
    mesh(new THREE.CapsuleGeometry(P.legR, P.shin - 0.32, 6, 16), mama ? M.kain : M.navy, knee, [0, -P.shin / 2 + 0.04, 0]);
    if (!mama) {
      // ribbed jogger cuff + white sock
      mesh(new THREE.CylinderGeometry(P.legR + 0.015, P.legR + 0.01, 0.12, 18), M.navy, knee, [0, -P.shin + 0.2, 0]);
      mesh(new THREE.CylinderGeometry(P.legR - 0.02, P.legR - 0.02, 0.1, 16), M.white, knee, [0, -P.shin + 0.1, 0]);
      // sneaker: white body, coral toe and heel panels, blue heel tab, thick white sole with blue stripe
      const sh = new THREE.Group();
      sh.position.set(0, -P.shin + 0.06, 0.08);
      knee.add(sh);
      mesh(new THREE.SphereGeometry(0.2, 22, 14), M.white, sh, [0, 0, 0], [0.95, 0.55, 1.5]);
      mesh(new THREE.SphereGeometry(0.2, 22, 14, 0, Math.PI * 2, 0, Math.PI / 2), M.coral, sh, [0, 0.01, 0.14], [0.96, 0.5, 0.75]);
      mesh(new THREE.SphereGeometry(0.12, 16, 10), std(0x2f5fd0, 0.5), sh, [0, 0.03, -0.22], [1.1, 0.8, 0.5]);
      mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.07, 22), M.sole, sh, [0, -0.09, 0.02], [0.97, 1, 1.52]);
      mesh(new THREE.CylinderGeometry(0.205, 0.205, 0.02, 22), std(0x2f5fd0, 0.5), sh, [0, -0.075, 0.02], [0.97, 1, 1.53]);
      for (let i = 0; i < 3; i++) mesh(new THREE.BoxGeometry(0.16, 0.015, 0.02), M.white, sh, [0, 0.11 - i * 0.01, 0.08 + i * 0.06], [1, 1, 1], [0.5, 0, 0]);
    } else {
      // cream flats
      mesh(new THREE.SphereGeometry(0.17, 20, 12), M.shoe, knee, [0, -P.shin + 0.02, 0.07], [0.85, 0.45, 1.5]);
    }
    legs[side < 0 ? 'R' : 'L'] = { hip, knee };
  }
  // pelvis / seat
  if (!mama) mesh(new THREE.CylinderGeometry(P.torsoR + 0.01, P.torsoR - 0.02, 0.34, 28), M.navy, body, [0, P.hipY - 0.04, 0]);

  // ---------- torso (torso-local frame shared with v1) ----------
  const torso = new THREE.Group();
  torso.position.set(0, P.torsoY, 0);
  body.add(torso);
  const R = P.torsoR;
  if (!mama) {
    // coral T-shirt
    mesh(new THREE.CylinderGeometry(R - 0.02, R, 0.95, 28), M.coral, torso, [0, 0.47, 0]);
    mesh(new THREE.SphereGeometry(R - 0.02, 28, 16, 0, Math.PI * 2, 0, Math.PI / 2), M.coral, torso, [0, 0.93, 0], [1.25, 0.45, 0.95]);
    mesh(new THREE.TorusGeometry(0.17, 0.03, 8, 24), std(0xd8705a, 0.7), torso, [0, 0.99, 0.04], [1, 1, 1], [Math.PI / 2 - 0.15, 0, 0]);
    // open zip jacket, navy with colour-block bands
    const gap = 0.36;
    const band = (y, h, mat, dr = 0) => mesh(new THREE.CylinderGeometry(R + 0.035 + dr, R + 0.045 + dr, h, 32, 1, true, gap, Math.PI * 2 - gap * 2), mat, torso, [0, y, 0]);
    band(0.47, 0.98, M.navy).material.side = THREE.DoubleSide;
    mesh(new THREE.SphereGeometry(R + 0.035, 32, 12, Math.PI / 2 + gap, Math.PI * 2 - gap * 2, 0, Math.PI / 2), M.navy, torso, [0, 0.955, 0], [1.25, 0.45, 0.95]).material.side = THREE.DoubleSide;
    band(0.72, 0.15, M.white, 0.004);
    band(0.6, 0.09, M.coral, 0.005);
    band(0.525, 0.06, M.white, 0.006);
    // ribbed hem: navy with two white stripes
    band(0.04, 0.12, M.navy, 0.01);
    band(0.07, 0.02, M.white, 0.016);
    band(0.02, 0.02, M.white, 0.016);
    // zipper edges and pockets
    for (const side of [-1, 1]) {
      const a = gap * side;
      mesh(new THREE.BoxGeometry(0.035, 0.98, 0.03), std(0xc8ccd4, 0.3, { metalness: 0.5 }), torso, [Math.sin(a) * (R + 0.045), 0.47, Math.cos(a) * (R + 0.045)], [1, 1, 1], [0.04, a, 0]).castShadow = false;
      mesh(new THREE.BoxGeometry(0.16, 0.2, 0.02), std(0x24305c, 0.8), torso, [Math.sin(a * 1.7) * (R + 0.05), 0.24, Math.cos(a * 1.7) * (R + 0.05)], [1, 1, 1], [0, a * 1.7, 0]);
    }
    // hood behind the neck + drawstrings
    mesh(new THREE.TorusGeometry(0.27, 0.11, 12, 28), M.navy, torso, [0, 1.0, -0.12], [1.05, 1, 0.8], [Math.PI / 2 + 0.35, 0, 0]);
    mesh(new THREE.SphereGeometry(0.3, 20, 14, 0, Math.PI * 2, 0, Math.PI / 2), M.navy, torso, [0, 0.98, -0.3], [1.05, 0.9, 0.7], [-0.6, 0, 0]);
    for (const side of [-1, 1]) {
      mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.34, 6), M.white, torso, [0.14 * side, 0.83, R + 0.02], [1, 1, 1], [0.12, 0, 0]);
      mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.05, 6), std(0xc8ccd4, 0.3, { metalness: 0.5 }), torso, [0.14 * side, 0.65, R + 0.04]);
    }
  } else {
    // baju kurung tunic down to the knees, with the kain below
    mesh(new THREE.CylinderGeometry(R - 0.02, R + 0.16, 1.55, 32), M.baju, torso, [0, 0.2, 0]).material.map.repeat.set(3, 3);
    mesh(new THREE.SphereGeometry(R - 0.02, 28, 16, 0, Math.PI * 2, 0, Math.PI / 2), M.bajuPlain, torso, [0, 0.97, 0], [1.25, 0.45, 0.95]);
    // long kain: from under the tunic down to the ankles, wide enough to hide the legs
    const kTop = P.torsoY - 0.4, kBot = 0.17;
    mesh(new THREE.CylinderGeometry(0.44, 0.46, kTop - kBot, 32, 1, true), M.kain, body, [0, (kTop + kBot) / 2, 0]);
  }
  mesh(new THREE.CylinderGeometry(0.13, 0.14, 0.3, 16), M.skin, torso, [0, 1.08, 0.02]);

  // ---------- arms ----------
  const arms = {};
  for (const side of [-1, 1]) {
    const shoulder = new THREE.Group();
    shoulder.position.set(P.shX * side, P.shY, 0);
    torso.add(shoulder);
    const sleeve = mama ? M.baju : M.navy;
    mesh(new THREE.SphereGeometry(0.15, 16, 12), mama ? M.bajuPlain : M.navy, shoulder);
    mesh(new THREE.CapsuleGeometry(0.13, P.L1 - 0.2, 6, 16), sleeve, shoulder, [0, -P.L1 / 2, 0]);
    if (!mama) {
      mesh(new THREE.CylinderGeometry(0.138, 0.138, 0.14, 18), M.white, shoulder, [0, -0.16, 0]);
      mesh(new THREE.CylinderGeometry(0.139, 0.139, 0.09, 18), M.coral, shoulder, [0, -0.275, 0]);
      mesh(new THREE.CylinderGeometry(0.138, 0.138, 0.06, 18), M.white, shoulder, [0, -0.35, 0]);
    }
    const elbow = new THREE.Group();
    elbow.position.set(0, -P.L1, 0);
    shoulder.add(elbow);
    mesh(new THREE.CapsuleGeometry(0.12, P.L2 - 0.22, 6, 16), mama ? M.baju : M.navy, elbow, [0, -P.L2 / 2 + 0.02, 0]);
    if (!mama) {
      mesh(new THREE.CylinderGeometry(0.127, 0.127, 0.17, 18), M.coral, elbow, [0, -P.L2 * 0.5, 0]);
      mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.09, 18), M.navy, elbow, [0, -P.L2 + 0.1, 0]);
      mesh(new THREE.CylinderGeometry(0.132, 0.132, 0.015, 18), M.white, elbow, [0, -P.L2 + 0.12, 0]);
      mesh(new THREE.CylinderGeometry(0.132, 0.132, 0.015, 18), M.white, elbow, [0, -P.L2 + 0.08, 0]);
    } else {
      mesh(new THREE.CylinderGeometry(0.128, 0.128, 0.05, 18), M.coral, elbow, [0, -P.L2 + 0.12, 0]);
      mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.07, 18), M.navy, elbow, [0, -P.L2 + 0.07, 0]);
    }
    const hand = new THREE.Group();
    hand.position.set(0, -P.L2, 0);
    elbow.add(hand);
    mesh(new THREE.SphereGeometry(0.115, 18, 14), M.skin, hand, [0, -0.02, 0], [1, 1.15, 0.85]);
    const index = new THREE.Group();
    index.position.set(0, -0.1, 0.045);
    hand.add(index);
    mesh(new THREE.CapsuleGeometry(0.035, 0.12, 4, 10), M.skin, index, [0, -0.075, 0]);
    const thumb = new THREE.Group();
    thumb.position.set(-0.055 * side, -0.02, 0.065);
    hand.add(thumb);
    mesh(new THREE.CapsuleGeometry(0.04, 0.09, 4, 10), M.skin, thumb, [0, 0, 0.06], [1, 1, 1], [Math.PI / 2, 0, 0]);
    arms[side < 0 ? 'R' : 'L'] = { shoulder, elbow, hand, index, thumb };
  }

  // ---------- head ----------
  const neck = new THREE.Group();
  neck.position.set(0, 1.2, 0);
  torso.add(neck);
  const head = new THREE.Group();
  head.position.set(0, P.headY, 0.02);
  head.scale.setScalar(P.headScale);
  neck.add(head);
  const headGeo = new THREE.SphereGeometry(0.85, 64, 48);
  const hp = headGeo.attributes.position;
  for (let i = 0; i < hp.count; i++) {
    const x = hp.getX(i), y = hp.getY(i), z = hp.getZ(i);
    const k = Math.exp(-(((y + 0.3) / 0.28) ** 2));
    const front = Math.max(0, z / 0.85);
    const chin = y < -0.4 ? 1 - 0.08 * ((-y - 0.4) / 0.45) : 1; // a slightly narrower chin than v1
    hp.setXYZ(i, x * (1 + 0.05 * k) * chin, y * (y < 0 ? 1.0 : 1.02), z * (1 + 0.08 * k * front));
  }
  headGeo.computeVertexNormals();
  mesh(headGeo, M.skin, head, [0, 0, 0], [0.96, 1.0, 0.93]);
  for (const side of [-1, 1]) {
    mesh(new THREE.SphereGeometry(0.18, 16, 12), M.skin, head, [0.8 * side, -0.04, -0.02], [0.45, 1, 0.75]);
    mesh(new THREE.SphereGeometry(0.085, 12, 10), M.skinShade, head, [0.84 * side, -0.04, 0.0], [0.4, 0.8, 0.6]);
  }

  if (!mama) {
    // full side-swept hair: shell clipped at a hairline, a thick crown and a fringe sweeping to his left
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
          float h = c > 0.0 ? mix(0.12, 0.44, c * c) : mix(0.12, -0.8, pow(-c, 1.2));
          if (vHair.y < h) discard;`);
    };
    capMat.customProgramCacheKey = () => 'affan2-hair-cap';
    mesh(new THREE.SphereGeometry(1, 56, 40), capMat, head, [0, 0.04, -0.02], [0.93, 0.93, 0.89]).castShadow = false;
    const surfZ = (x, y) => 0.8 * Math.sqrt(Math.max(0.02, 1 - (x / 0.87) ** 2 - (y / 0.86) ** 2));
    const strands = [
      [-0.6, 0.32, 0.3, 0.35], [-0.44, 0.42, 0.32, 0.55], [-0.26, 0.47, 0.34, 0.65], [-0.08, 0.5, 0.34, 0.72],
      [0.1, 0.5, 0.34, 0.75], [0.28, 0.47, 0.32, 0.72], [0.45, 0.41, 0.3, 0.62], [0.6, 0.32, 0.27, 0.45],
    ];
    for (const [x, y, len, rz] of strands) {
      const z = surfZ(x, y) + 0.03;
      const m = mesh(new THREE.SphereGeometry(1, 20, 14), M.hair, head, [x, y, z], [0.17, len, 0.12]);
      m.rotation.set(-Math.asin(Math.min(0.99, y / 0.86)) * 0.9, Math.atan2(x, z) * 0.9, rz, 'YXZ');
    }
    // volume: crown, sides over the ears, and the back down to the nape
    for (const [x, y, z, s, sy] of [[0.05, 0.8, 0.18, 0.42, 0.45], [0.35, 0.72, 0.02, 0.34, 0.45], [-0.33, 0.73, 0.05, 0.34, 0.45], [0.1, 0.8, -0.28, 0.4, 0.45],
      [-0.2, 0.62, -0.52, 0.34, 0.5], [0.25, 0.58, -0.55, 0.32, 0.5], [0, 0.2, -0.7, 0.42, 0.75], [0.66, 0.35, -0.2, 0.24, 0.7], [-0.66, 0.35, -0.2, 0.24, 0.7]]) {
      mesh(new THREE.SphereGeometry(s, 20, 14), M.hair, head, [x, y, z], [1.15, sy / 0.45 * 0.42, 1.05]);
    }
    mesh(new THREE.SphereGeometry(1, 20, 14), M.hairHi, head, [-0.12, 0.92, 0.12], [0.4, 0.08, 0.26], [0.2, 0, 0.4]).castShadow = false;
  } else {
    // hijab: a full shell over the head with an oval opening for the face (shader cut-out),
    // a cream underscarf band across the forehead, and folds under the chin
    const hijab = M.tudung.clone();
    hijab.onBeforeCompile = (sh) => {
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vHj;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvHj = position;');
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vHj;')
        .replace('void main() {', `void main() {
          vec2 q = vec2(vHj.x / 0.66, (vHj.y + 0.14) / 0.66);
          if (vHj.z > 0.15 && dot(q, q) < 1.0) discard;`);
    };
    hijab.customProgramCacheKey = () => 'mama2-hijab';
    mesh(new THREE.SphereGeometry(1, 56, 40), hijab, head, [0, 0.03, 0], [1.0, 1.04, 0.99]).castShadow = false;
    mesh(new THREE.TorusGeometry(0.64, 0.028, 8, 40, Math.PI * 0.7), std(0xf6ece0, 0.8), head, [0, -0.13, 0.74], [1, 1.0, 1], [-0.18, 0, Math.PI * 0.15]);
    mesh(new THREE.TorusGeometry(0.69, 0.035, 10, 40, Math.PI * 2), M.tudung, head, [0, -0.13, 0.7], [0.97, 1.0, 1], [-0.2, 0, 0]);
    mesh(new THREE.SphereGeometry(0.8, 30, 20), M.tudung, head, [0, -0.6, -0.08], [1.1, 0.75, 0.95]);
  }

  // eyes
  const eyes = [];
  for (const side of [-1, 1]) {
    const eye = new THREE.Group();
    eye.position.set(0.29 * side, -0.02, 0.68);
    head.add(eye);
    const ball = new THREE.Group();
    eye.add(ball);
    mesh(new THREE.SphereGeometry(0.16, 24, 18), M.sclera, ball, [0, 0, 0], [1, 1.12, 1]).castShadow = false;
    const iris = new THREE.Group();
    ball.add(iris);
    mesh(new THREE.SphereGeometry(0.115, 24, 16), M.iris, iris, [0, 0, 0.115], [1, 1.08, 0.35]).castShadow = false;
    mesh(new THREE.SphereGeometry(0.064, 18, 12), M.pupil, iris, [0, 0, 0.145], [1, 1.05, 0.3]).castShadow = false;
    mesh(new THREE.SphereGeometry(0.032, 10, 8), M.shine, iris, [0.035, 0.05, 0.16]).castShadow = false;
    mesh(new THREE.SphereGeometry(0.014, 8, 6), M.shine, iris, [-0.04, -0.035, 0.158]).castShadow = false;
    const lid = new THREE.Group();
    eye.add(lid);
    mesh(new THREE.SphereGeometry(0.173, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), M.skin, lid, [0, 0, 0], [1.02, 1.15, 1.02]).castShadow = false;
    if (mama) {
      // lashes on the lid edge
      for (let i = 0; i < 3; i++) mesh(new THREE.CapsuleGeometry(0.012, 0.06, 3, 6), M.hair, lid, [side * (0.07 + i * 0.045), 0.02, 0.15], [1, 1, 1], [0.6, 0, side * (0.6 + i * 0.3)]).castShadow = false;
    }
    eyes.push({ eye, ball, iris, lid });
  }
  const brows = [];
  for (const side of [-1, 1]) {
    const b = new THREE.Group();
    b.position.set(0.3 * side, 0.27, 0.73);
    head.add(b);
    mesh(new THREE.CapsuleGeometry(mama ? 0.024 : 0.034, 0.18, 4, 10), M.hair, b, [0, 0, 0], [1, 1, 0.7], [0, 0, Math.PI / 2 + (mama ? -0.08 : 0.12) * side]);
    b.rotation.y = 0.35 * side;
    brows.push(b);
  }
  // glasses: black rectangular front, blue temples
  const glasses = new THREE.Group();
  glasses.position.set(0, -0.02, 0.86);
  head.add(glasses);
  if (!mama) {
    const outer = roundedRectShape(0.44, 0.33, 0.09);
    outer.holes.push(new THREE.Path(roundedRectShape(0.34, 0.24, 0.06).getPoints(24)));
    const fg = new THREE.ExtrudeGeometry(outer, { depth: 0.04, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.01, bevelSegments: 2, curveSegments: 16 });
    fg.translate(0, 0, -0.02);
    for (const side of [-1, 1]) {
      mesh(fg, M.frame, glasses, [0.3 * side, 0, -0.03], [1, 1, 1], [0, 0.2 * side, 0]);
      mesh(new THREE.PlaneGeometry(0.35, 0.25), M.lens, glasses, [0.3 * side, 0, -0.025], [1, 1, 1], [0, 0.2 * side, 0]).castShadow = false;
      mesh(new THREE.BoxGeometry(0.06, 0.06, 0.06), M.frame, glasses, [0.52 * side, 0.05, -0.08]).castShadow = false;
      mesh(new THREE.BoxGeometry(0.04, 0.045, 0.78), M.temple, glasses, [0.62 * side, 0.05, -0.45], [1, 1, 1], [0, -0.4 * side, 0]).castShadow = false;
    }
    mesh(new THREE.TorusGeometry(0.07, 0.022, 8, 16, Math.PI), M.frame, glasses, [0, 0.04, 0.0], [1, 0.8, 1]);
  } else glasses.visible = false;

  // nose
  mesh(new THREE.SphereGeometry(0.07, 16, 12), M.skinShade, head, [0, -0.18, 0.78], [1.1, 0.85, 0.9]);
  // mouth
  const mouth = new THREE.Group();
  mouth.position.set(0, -0.4, 0.705);
  mouth.rotation.x = -0.22;
  head.add(mouth);
  const smile = mesh(new THREE.TorusGeometry(0.1, 0.02, 8, 24, Math.PI), M.lip, mouth, [0, 0.03, 0.02], [1, 0.7, 1], [0, 0, Math.PI]);
  smile.castShadow = false;
  const open = new THREE.Group();
  mouth.add(open);
  mesh(new THREE.SphereGeometry(0.12, 24, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), M.mouth, open, [0, 0, 0], [1.1, 1, 0.42]).castShadow = false;
  mesh(new THREE.SphereGeometry(0.06, 12, 8), M.tongue, open, [0, -0.075, 0.03], [1.2, 0.6, 0.5]).castShadow = false;
  const oMouth = mesh(new THREE.SphereGeometry(0.08, 20, 14), M.mouth, mouth, [0, -0.03, 0], [1, 1.25, 0.4]);
  oMouth.castShadow = false;
  for (const side of [-1, 1]) {
    const b = new THREE.Mesh(new THREE.CircleGeometry(0.1, 24), M.blush);
    b.position.set(0.46 * side, -0.24, 0.61);
    b.lookAt(b.position.clone().multiply(new THREE.Vector3(2.2, 0.6, 2.2)));
    head.add(b);
  }
  // Mama's hijab drape over the shoulders, ending in a point over the chest
  if (mama) {
    const drape = mesh(new THREE.CylinderGeometry(0.3, 0.72, 0.7, 40, 1, true), M.tudung, torso, [0, 1.02, -0.02], [1, 1, 0.82]);
    drape.castShadow = false;
    const v = new THREE.Shape();
    v.moveTo(-0.62, 0);
    v.lineTo(0.62, 0);
    v.quadraticCurveTo(0.35, -0.5, 0, -0.78);
    v.quadraticCurveTo(-0.35, -0.5, -0.62, 0);
    mesh(new THREE.ExtrudeGeometry(v, { depth: 0.04, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 2 }), M.tudung, torso, [0, 0.82, R + 0.06], [1, 1, 1], [-0.12, 0, 0]);
  }

  const parts = { root, body, torso, neck, head, legs, arms, eyes, brows, mouth, smile, open, oMouth, glasses };

  // ---------- pose (same parameters as v1) ----------
  const DEF = {
    yaw: 0, lean: 0, tilt: 0, bob: 0, headYaw: 0, headPitch: 0, headRoll: 0, lookX: 0, lookY: 0, blink: 0,
    talk: 0, smile: 0.6, wow: 0, brow: 0,
    armL: { x: 0, y: 0, z: 0.1, el: -0.15, point: 0, thumb: 0 },
    armR: { x: 0, y: 0, z: -0.1, el: -0.15, point: 0, thumb: 0 },
    legL: { x: 0, knee: 0 }, legR: { x: 0, knee: 0 },
  };
  const _S = new THREE.Vector3(), _T = new THREE.Vector3(), _d = new THREE.Vector3(), _n = new THREE.Vector3();
  const _u = new THREE.Vector3(), _f = new THREE.Vector3(), _x = new THREE.Vector3(), _y = new THREE.Vector3(), _z = new THREE.Vector3();
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion();
  function solveArm(a, reach, pole) {
    const L1 = P.L1, L2 = P.L2;
    _S.copy(a.shoulder.position);
    _T.fromArray(reach);
    _d.subVectors(_T, _S);
    const dist = clamp(_d.length(), 0.15, L1 + L2 - 0.005);
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
  function setArm(a, p, side) {
    if (p.reach) solveArm(a, p.reach, p.pole || [0.3 * side, -1, -0.6]);
    else {
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
    const talk = clamp(q.talk), wow = clamp(q.wow);
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
  const toTorso = (v) => {
    root.updateMatrixWorld(true);
    return torso.worldToLocal(v.clone()).toArray();
  };
  return { root, parts, pose, toTorso, P };
}
