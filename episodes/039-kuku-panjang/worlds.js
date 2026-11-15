// Episode 039 sets:
//  - the Episode 031 living room with Affan, Mama (from Episode 038), a plate
//    of kuih on the coffee table, and a nail clipper;
//  - a giant hand (back of the hand to the camera): fingernails whose free
//    edge can grow, dirt and cartoon germs under the nails, a crack and a
//    breaking piece, and a red scratch;
//  - the "dalam hujung jari" (inside the fingertip) imagination world: a
//    fingertip cut in half, standing upright: skin, bone, nail bed, a glowing
//    nail root (matrix) under the cuticle fold, nerves that stop before the
//    free edge, and a nail plate made of stacked flat tiles that new cells
//    push upward; plus a nail clipper;
//  - the branded outro stage from Episode 005.
import * as THREE from 'three';
import { rng } from '../../shared/core.js';
import { makeAffan, AFFAN } from '../../shared/affan.js';
import { add, glow, glowTex } from '../../shared/props.js';
import { buildOutro, RoundedBoxGeometry } from '../005-bulan-ikut-kereta/worlds.js';
import { buildLivingRoom } from '../031-geletek-diri-sendiri/worlds.js';
import { makeMama } from '../038-bawang-menangis/worlds.js';

export { buildOutro };

const std = (color, rough = 0.7, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0, ...extra });
const SKIN = AFFAN.skin;

function gradientSky(top, bot) {
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: { top: { value: new THREE.Color(top) }, bot: { value: new THREE.Color(bot) } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `uniform vec3 top, bot; varying vec3 vP;
      void main(){ gl_FragColor = vec4(mix(bot, top, smoothstep(-0.3, 0.7, vP.y)), 1.0);
        #include <colorspace_fragment>
      }`,
  });
  const m = new THREE.Mesh(new THREE.SphereGeometry(200, 32, 16), mat);
  m.renderOrder = -10;
  return m;
}

// a little nail clipper (pengetip kuku): two levers and a jaw; 'open' 0..1
export function makeClipper() {
  const g = new THREE.Group();
  const steel = std(0xd8dde6, 0.2, { metalness: 0.8 });
  const lo = add(g, new RoundedBoxGeometry(1.6, 0.12, 0.42, 2, 0.05), steel, [0.8, 0, 0]);
  const hi = new THREE.Group();
  g.add(hi);
  add(hi, new RoundedBoxGeometry(1.6, 0.12, 0.42, 2, 0.05), steel, [0.8, 0.22, 0]);
  const lever = new THREE.Group();
  lever.position.set(0.5, 0.36, 0);
  g.add(lever);
  add(lever, new RoundedBoxGeometry(1.5, 0.1, 0.36, 2, 0.04), std(0xff5c9a, 0.4), [0.75, 0.05, 0]);
  add(g, new THREE.CylinderGeometry(0.06, 0.06, 0.6, 10), steel, [0.5, 0.2, 0]);
  g.userData.set = (open) => {
    hi.rotation.z = 0.12 * open;
    lever.rotation.z = 0.35 * open;
  };
  g.userData.set(0);
  void lo;
  return g;
}

// ------------------------------------------------------------- living room
export const A_LR = new THREE.Vector3(-1.4, 0, -1.9); // on the sofa
export const MAMA_LR = new THREE.Vector3(-3.15, -0.1, -1.95); // seated on the sofa, left of Affan
export function buildRoom() {
  const w = buildLivingRoom();
  w.kak.root.visible = false;
  const s = w.scene;
  // coffee table with a plate of kuih
  const table = new THREE.Group();
  table.position.set(-1.2, 0, -0.3);
  s.add(table);
  add(table, new RoundedBoxGeometry(2.0, 0.12, 1.1, 2, 0.04), std(0xc98a4a, 0.6), [0, 0.8, 0]);
  for (const [x, z] of [[-0.85, -0.45], [0.85, -0.45], [-0.85, 0.45], [0.85, 0.45]]) add(table, new THREE.CylinderGeometry(0.06, 0.06, 0.8, 10), std(0x8a5a3a, 0.6), [x, 0.4, z]);
  add(table, new THREE.CylinderGeometry(0.42, 0.36, 0.05, 32), std(0xffffff, 0.3), [0.2, 0.89, 0.05]);
  const kuih = [];
  const cols = [0x5fd86a, 0xff8ab0, 0xffd84a];
  for (let i = 0; i < 3; i++) kuih.push(add(table, new RoundedBoxGeometry(0.22, 0.12, 0.16, 2, 0.04), std(cols[i], 0.6), [0.05 + i * 0.15, 0.97, 0.05 + (i % 2) * 0.1], [0, i, 0]));
  const mama = makeMama();
  mama.root.scale.setScalar(1.25);
  s.add(mama.root);
  const clipper = makeClipper();
  clipper.scale.setScalar(0.22);
  s.add(clipper);
  // germ sprites (for "kuman masuk ke dalam perut")
  const germMat = new THREE.SpriteMaterial({ map: glowTex, color: 0x7ad83a, transparent: true, depthWrite: false });
  const germs = Array.from({ length: 10 }, () => {
    const g = new THREE.Sprite(germMat.clone());
    g.visible = false;
    s.add(g);
    return g;
  });
  return { ...w, table, kuih, mama, clipper, germs };
}

// ----------------------------------------------------------------- the hand
// Back of a right hand facing +z, fingers up (+y). setNails(free, dirt, ...).
export const FINGERS = [
  { x: -0.82, len: 1.35, r: 0.22 },
  { x: -0.28, len: 1.6, r: 0.24 },
  { x: 0.28, len: 1.5, r: 0.235 },
  { x: 0.8, len: 1.2, r: 0.21 },
];
export function buildHand() {
  const scene = new THREE.Scene();
  const sky = gradientSky(0xf8ead6, 0xe8cdb0);
  scene.add(sky);
  scene.add(new THREE.HemisphereLight(0xfff6ec, 0xa08060, 1.3));
  const key = new THREE.DirectionalLight(0xffffff, 1.8);
  key.position.set(-3, 5, 8);
  scene.add(key);
  // soft bokeh blobs behind (a cosy room, out of focus)
  const R = rng(39);
  for (let i = 0; i < 18; i++) {
    const b = glow([0xffd8a0, 0xbfe6ff, 0xffc0d0][i % 3], 2 + R() * 3, 0.35);
    b.position.set((R() - 0.5) * 16, (R() - 0.5) * 14 + 1, -8 - R() * 6);
    scene.add(b);
  }
  const skin = std(SKIN, 0.55, { emissive: 0x3a1608, emissiveIntensity: 0.18 });
  const hand = new THREE.Group();
  scene.add(hand);
  // palm, wrist and sleeve
  add(hand, new RoundedBoxGeometry(2.3, 2.0, 0.8, 4, 0.35), skin, [0, -0.5, 0]);
  add(hand, new THREE.CylinderGeometry(0.85, 0.9, 1.6, 32), skin, [0, -2.1, -0.05], [0, 0, 0], [1, 1, 0.5]);
  add(hand, new THREE.CylinderGeometry(1.0, 1.1, 2.2, 32), std(AFFAN.navy, 0.7), [0, -3.6, -0.05], [0, 0, 0], [1, 1, 0.55]);
  add(hand, new THREE.TorusGeometry(0.98, 0.08, 10, 32), std(AFFAN.peach, 0.6), [0, -2.55, -0.05], [Math.PI / 2, 0, 0], [1, 0.55, 1]);
  // thumb
  add(hand, new THREE.CapsuleGeometry(0.25, 0.9, 8, 16), skin, [-1.35, -0.2, 0.15], [0, 0, 0.75]);
  const nailBed = std(0xffd8d0, 0.25, { emissive: 0x402020, emissiveIntensity: 0.12 });
  const nailFree = std(0xfffaf2, 0.3);
  const dirtMat = std(0x5a3a22, 0.9);
  const nails = [];
  FINGERS.forEach((f) => {
    const g = new THREE.Group();
    g.position.set(f.x, 0.5, 0);
    hand.add(g);
    add(g, new THREE.CapsuleGeometry(f.r, f.len, 8, 16), skin, [0, f.len / 2 + 0.05, 0]);
    // knuckle crease
    add(g, new THREE.TorusGeometry(f.r * 0.9, 0.012, 6, 20, Math.PI), std(0xc07a5a, 0.6), [0, f.len * 0.55, f.r * 0.15], [0, 0, 0], [1, 0.4, 1], false);
    const tipY = f.len + 0.05 + f.r; // top of the finger
    const bed = add(g, new RoundedBoxGeometry(f.r * 1.45, 0.5, 0.05, 2, 0.02), nailBed, [0, tipY - 0.33, f.r * 0.92]);
    const free = new THREE.Group();
    free.position.set(0, tipY - 0.1, f.r * 0.78);
    g.add(free);
    const freeMesh = add(free, new RoundedBoxGeometry(f.r * 1.45, 1, 0.05, 2, 0.02), nailFree, [0, 0.5, 0]);
    const dirt = add(free, new THREE.BoxGeometry(f.r * 1.3, 1, 0.05), dirtMat, [0, 0.5, -0.05]);
    nails.push({ g, bed, free, freeMesh, dirt, f, tipY });
  });
  // crack and a breaking piece on the middle finger's nail
  const crack = add(scene, new THREE.BoxGeometry(0.03, 0.22, 0.02), std(0x7a4a3a, 0.8), [0, 0, 0], [0, 0, 0.6], [1, 1, 1], false);
  const piece = add(scene, new RoundedBoxGeometry(0.3, 0.16, 0.05, 2, 0.02), nailFree, [0, 0, 0]);
  // red scratch on the back of the hand
  const scratch = add(scene, new THREE.BoxGeometry(1.4, 0.05, 0.02), new THREE.MeshBasicMaterial({ color: 0xe8384a }), [0.15, -0.6, 0.42], [0, 0, -0.5], [1, 1, 1], false);
  // cartoon germs (green / purple blobs with eyes)
  const germs = Array.from({ length: 10 }, (_, i) => {
    const gg = new THREE.Group();
    const body = add(gg, new THREE.IcosahedronGeometry(0.12, 2), std(i % 2 ? 0x7ad83a : 0xa05ae0, 0.5, { emissive: i % 2 ? 0x1a4a08 : 0x2a1050, emissiveIntensity: 0.4 }), [0, 0, 0]);
    for (const s of [-1, 1]) {
      add(gg, new THREE.SphereGeometry(0.035, 10, 8), std(0xffffff, 0.3), [0.045 * s, 0.03, 0.1], [0, 0, 0], [1, 1, 1], false);
      add(gg, new THREE.SphereGeometry(0.018, 8, 6), new THREE.MeshBasicMaterial({ color: 0x101010 }), [0.045 * s, 0.03, 0.13], [0, 0, 0], [1, 1, 1], false);
    }
    for (let k = 0; k < 6; k++) add(gg, new THREE.ConeGeometry(0.025, 0.08, 6), body.material, [Math.cos(k) * 0.12, Math.sin(k) * 0.12, 0], [0, 0, k - Math.PI / 2], [1, 1, 1], false);
    gg.visible = false;
    scene.add(gg);
    return gg;
  });
  const clipper = makeClipper();
  clipper.visible = false;
  scene.add(clipper);
  // free: free-edge length; dirt 0..1; crack 0..1; broken 0..1 (piece falls)
  const setNails = (free, dirt = 0, { crackK = 0, broken = 0, t = 0 } = {}) => {
    nails.forEach((n, i) => {
      const L = Math.max(0.02, free * (0.9 + 0.12 * Math.sin(i * 2.3)));
      n.freeMesh.scale.y = L;
      n.freeMesh.position.y = L / 2;
      n.dirt.scale.y = Math.max(0.001, L * 0.9 * dirt);
      n.dirt.position.y = (L * 0.9 * dirt) / 2;
      n.dirt.visible = dirt > 0.02;
    });
    hand.updateMatrixWorld(true);
    const n = nails[1];
    const edge = n.free.localToWorld(V3(0, Math.max(0.02, free * (0.9 + 0.12 * Math.sin(2.3))), 0.04));
    crack.visible = crackK > 0.02;
    crack.position.copy(edge).add(V3(0.04, -0.12, 0.02));
    crack.scale.y = crackK;
    piece.visible = broken > 0.001 && broken < 0.999;
    piece.position.copy(edge).add(V3(0.1 + broken * 0.8, -broken * broken * 5, 0.05 + broken));
    piece.rotation.set(broken * 4, broken * 3, broken * 6);
    if (broken > 0.001) {
      n.freeMesh.scale.y = Math.max(0.02, free * 0.45);
      n.freeMesh.position.y = n.freeMesh.scale.y / 2;
    }
    void t;
  };
  setNails(0.1);
  return { scene, sky, hand, nails, setNails, crack, piece, scratch, germs, clipper };
}
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

// ---------------------------------------------------- inside the fingertip
// Upright fingertip cut in half; the nail is on the +x side, the tip at the top.
export const TIP_Y = 3.0; // top of the fingertip (where the free edge starts)
export const ROOT_Y = -2.8; // nail root (matrix)
export const NAIL_X = 1.52;
export const TILE = 0.32;
export const N_TILES = 30;
export function buildFingertip() {
  const scene = new THREE.Scene();
  const sky = gradientSky(0xffe9f2, 0xffcfd8);
  scene.add(sky);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xd09090, 1.3));
  const key = new THREE.DirectionalLight(0xffffff, 1.5);
  key.position.set(4, 6, 9);
  scene.add(key);
  const Z = 1.2; // half depth of the finger
  // finger profile (x across, y up), with a cuticle fold bump on the nail side
  const outline = new THREE.Shape();
  outline.moveTo(-1.4, -6.5);
  outline.lineTo(-1.4, TIP_Y - 1.4);
  outline.absarc(0, TIP_Y - 1.4, 1.4, Math.PI, 0, true);
  outline.lineTo(1.4, ROOT_Y + 0.2);
  outline.quadraticCurveTo(1.85, ROOT_Y + 0.35, 1.75, ROOT_Y - 0.4);
  outline.lineTo(1.5, -6.5);
  outline.lineTo(-1.4, -6.5);
  const skinSide = std(SKIN, 0.55, { emissive: 0x3a1608, emissiveIntensity: 0.18 });
  const cutFace = std(0xf7b7a4, 0.7);
  const finger = new THREE.Mesh(new THREE.ExtrudeGeometry(outline, { depth: Z * 2, bevelEnabled: false, curveSegments: 32 }), [cutFace, skinSide]);
  finger.position.z = -Z;
  scene.add(finger);
  const FZ = Z + 0.01; // drawing plane on the cut face
  const flat = (shape, color, z = FZ, extra = {}) => {
    const m = new THREE.Mesh(new THREE.ShapeGeometry(shape, 32), new THREE.MeshStandardMaterial({ color, roughness: 0.7, ...extra }));
    m.position.z = z;
    scene.add(m);
    return m;
  };
  // bone (distal phalanx)
  const bone = new THREE.Shape();
  bone.moveTo(-0.65, -6.5);
  bone.lineTo(-0.65, 0.9);
  bone.quadraticCurveTo(0, 1.9, 0.65, 0.9);
  bone.lineTo(0.65, -6.5);
  flat(bone, 0xf4ead2);
  // nail bed (pink strip under the nail)
  const bed = new THREE.Shape();
  bed.moveTo(1.12, ROOT_Y + 0.3);
  bed.lineTo(1.4, ROOT_Y + 0.3);
  bed.lineTo(1.4, TIP_Y - 0.6);
  bed.quadraticCurveTo(1.3, TIP_Y - 0.3, 1.1, TIP_Y - 0.45);
  bed.lineTo(1.12, ROOT_Y + 0.3);
  flat(bed, 0xff9aa8, FZ + 0.005);
  // nail root (matrix): glowing purple under the cuticle fold
  const matrix = new THREE.Shape();
  matrix.absellipse(1.25, ROOT_Y - 0.25, 0.32, 0.6, 0, Math.PI * 2);
  const matrixMesh = flat(matrix, 0xb07aff, FZ + 0.01, { emissive: 0x6a2aff, emissiveIntensity: 0.6 });
  const matrixGlow = glow(0xc08aff, 2.2, 0.5);
  matrixGlow.position.set(1.25, ROOT_Y - 0.25, FZ + 0.1);
  scene.add(matrixGlow);
  // nerves (yellow, stop before the free edge)
  const nerveMat = new THREE.MeshStandardMaterial({ color: 0xffe04a, emissive: 0xffb000, emissiveIntensity: 0.4, roughness: 0.4 });
  const nerves = [];
  for (const pts of [
    [[-1.0, -6.5], [-1.0, -2], [-0.9, 1.0], [-0.5, 2.1]],
    [[0.95, -6.5], [0.95, -2.5], [1.0, 0.5], [0.95, 2.2]],
    [[0.95, -1.0], [1.08, -0.4], [1.12, 0.6]],
    [[-1.0, -1.0], [-1.15, -0.2], [-1.2, 0.8]],
  ]) {
    const c = new THREE.CatmullRomCurve3(pts.map(([x, y]) => new THREE.Vector3(x, y, FZ + 0.03)));
    const m = new THREE.Mesh(new THREE.TubeGeometry(c, 40, 0.05, 8), nerveMat);
    scene.add(m);
    nerves.push(m);
  }
  // nail plate tiles (flat, stacked along y), on the +x side
  const tileMat = new THREE.MeshPhysicalMaterial({ color: 0xfff4ea, roughness: 0.2, clearcoat: 1, transparent: true, opacity: 0.92 });
  const tiles = Array.from({ length: N_TILES }, () => {
    const m = add(scene, new RoundedBoxGeometry(0.24, TILE * 0.96, Z * 2 + 0.06, 2, 0.05), tileMat.clone(), [NAIL_X, 0, 0]);
    return m;
  });
  // new cells (round) born at the matrix
  const cellMat = std(0xffd0f0, 0.4, { emissive: 0x6a2a6a, emissiveIntensity: 0.25 });
  const cells = Array.from({ length: 8 }, () => {
    const m = add(scene, new THREE.SphereGeometry(0.13, 16, 12), cellMat.clone(), [0, 0, FZ + 0.12]);
    m.visible = false;
    return m;
  });
  const clipper = makeClipper();
  clipper.visible = false;
  clipper.scale.setScalar(1.1);
  scene.add(clipper);
  const aff = makeAffan();
  aff.root.scale.setScalar(0.38);
  scene.add(aff.root);
  return { scene, sky, finger, tiles, cells, matrixMesh, matrixGlow, nerves, nerveMat, clipper, aff, FZ };
}

// ------------------------------------------------------------ the room kuih
export { V3 };
