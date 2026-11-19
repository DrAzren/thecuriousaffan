// Episode 051 sets:
//  - the Episode 031 living room, with a low table that gets a glass of milk,
//    a bowl of ikan bilis and a plate of greens; a milk glass for Affan;
//  - the x-ray stage: a dark blue grid room with a cartoon skeleton built to
//    Affan's proportions (skull made of plates that can open like a baby's,
//    spine, ribcage, pelvis, arms, hands and feet with every finger bone), a
//    glowing see-through "ghost" Affan around it, a baby skeleton, a brain,
//    heart and lungs inside, a cut-away thigh bone with red marrow making
//    blood cells, and a tiny stirrup bone next to a grain of rice;
//  - the branded outro stage from Episode 005.
import * as THREE from 'three';
import { rng } from '../../shared/core.js';
import { makeAffan } from '../../shared/affan.js';
import { add, glow, glowTex } from '../../shared/props.js';
import { buildOutro, RoundedBoxGeometry } from '../005-bulan-ikut-kereta/worlds.js';
import { buildLivingRoom } from '../031-geletek-diri-sendiri/worlds.js';

export { buildOutro };

const std = (color, rough = 0.7, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0, ...extra });
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const UP = V3(0, 1, 0);

function gradientSky(top, bot) {
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: { top: { value: new THREE.Color(top) }, bot: { value: new THREE.Color(bot) } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `uniform vec3 top, bot; varying vec3 vP;
      void main(){ gl_FragColor = vec4(mix(bot, top, smoothstep(-0.4, 0.6, vP.y)), 1.0);
        #include <colorspace_fragment>
      }`,
  });
  const m = new THREE.Mesh(new THREE.SphereGeometry(200, 32, 16), mat);
  m.renderOrder = -10;
  return m;
}

const boneMat = () => std(0xf6eed6, 0.5, { emissive: 0x4a6a9a, emissiveIntensity: 0.35 });
// a bone from a to b with knobbly ends
function bone(parent, a, b, r, mat, knob = 1.5) {
  const d = b.clone().sub(a);
  const len = d.length();
  const g = new THREE.Group();
  g.position.copy(a).add(b).multiplyScalar(0.5);
  g.quaternion.setFromUnitVectors(UP, d.normalize());
  parent.add(g);
  add(g, new THREE.CapsuleGeometry(r, Math.max(0.001, len - 2 * r), 4, 10), mat, [0, 0, 0], [0, 0, 0], [1, 1, 1], false);
  if (knob) for (const s of [-1, 1]) add(g, new THREE.SphereGeometry(r * knob, 10, 8), mat, [0, (s * len) / 2, 0], [0, 0, 0], [1.2, 0.8, 1], false);
  return g;
}

// ------------------------------------------------------------- skeleton
// Affan-proportioned cartoon skeleton, feet at y = 0, facing +z.
export function makeSkeleton({ baby = false } = {}) {
  const root = new THREE.Group();
  const groups = {};
  const grp = (name) => {
    const g = new THREE.Group();
    root.add(g);
    groups[name] = { g, mat: boneMat() };
    return groups[name];
  };
  // skull: cranium made of four top plates + a lower half, jaw, sockets
  const sk = grp('skull');
  const skull = new THREE.Group();
  skull.position.set(0, 2.62, 0);
  sk.g.add(skull);
  const plates = [];
  for (let q = 0; q < 4; q++) {
    const pg = new THREE.Group();
    skull.add(pg);
    add(pg, new THREE.SphereGeometry(0.72, 20, 12, (q * Math.PI) / 2 + 0.02, Math.PI / 2 - 0.04, 0, Math.PI / 2 - 0.02), sk.mat, [0, 0, 0], [0, 0, 0], [1, 1, 1], false);
    const a = (q * Math.PI) / 2 + Math.PI / 4;
    pg.userData.dir = V3(Math.cos(a), 0.6, -Math.sin(a)).normalize();
    plates.push(pg);
  }
  add(skull, new THREE.SphereGeometry(0.72, 24, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), sk.mat, [0, 0, 0], [0, 0, 0], [1, 1, 1], false);
  const dark = std(0x1a2238, 0.8);
  for (const s of [-1, 1]) add(skull, new THREE.SphereGeometry(0.17, 12, 10), dark, [s * 0.26, -0.05, 0.6], [0, 0, 0], [1, 1.1, 0.5], false);
  add(skull, new THREE.ConeGeometry(0.07, 0.14, 3), dark, [0, -0.26, 0.68], [Math.PI, 0, 0], [1, 1, 0.5], false);
  const jaw = add(skull, new THREE.SphereGeometry(0.42, 16, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), sk.mat, [0, -0.38, 0.18], [0, 0, 0], [1, 0.7, 1.05], false);
  for (let i = 0; i < 6; i++) add(skull, new THREE.BoxGeometry(0.06, 0.07, 0.04), std(0xffffff, 0.4), [-0.15 + i * 0.06, -0.42, 0.58], [0, 0, 0], [1, 1, 1], false);
  // brain (hidden until needed)
  const brain = add(skull, new THREE.SphereGeometry(0.6, 24, 16), std(0xff9ab8, 0.6, { emissive: 0x5a1a30, emissiveIntensity: 0.3 }), [0, 0.08, -0.04], [0, 0, 0], [1, 0.82, 1.05], false);
  brain.visible = false;
  // spine and neck
  const sp = grp('spine');
  for (let i = 0; i < 16; i++) add(sp.g, new THREE.CylinderGeometry(0.075, 0.08, 0.045, 10), sp.mat, [0, 1.02 + i * 0.062, -0.12], [0, 0, 0], [1, 1, 1], false);
  // ribcage
  const rb = grp('ribs');
  for (let i = 0; i < 6; i++) {
    const y = 1.3 + i * 0.09;
    const r = 0.3 + 0.08 * Math.sin((i / 5) * Math.PI * 0.9 + 0.3);
    const ring = add(rb.g, new THREE.TorusGeometry(r, 0.028, 6, 30, Math.PI * 1.7), rb.mat, [0, y, 0], [Math.PI / 2, 0, -Math.PI / 2 + Math.PI * 0.15], [1.15, 0.8, 1], false);
    ring.rotation.order = 'XYZ';
  }
  add(rb.g, new THREE.BoxGeometry(0.09, 0.5, 0.04), rb.mat, [0, 1.55, 0.31], [0, 0, 0], [1, 1, 1], false);
  // heart and lungs (hidden until needed)
  const organs = new THREE.Group();
  root.add(organs);
  organs.visible = false;
  for (const s of [-1, 1]) add(organs, new THREE.SphereGeometry(0.2, 16, 12), std(0xff9ab0, 0.6, { emissive: 0x5a1a30, emissiveIntensity: 0.3 }), [s * 0.17, 1.55, 0], [0, 0, 0], [0.9, 1.4, 0.9], false);
  const heart = add(organs, new THREE.SphereGeometry(0.11, 16, 12), std(0xe8304a, 0.5, { emissive: 0x6a0a18, emissiveIntensity: 0.4 }), [0.04, 1.45, 0.12], [0, 0, 0.4], [1, 1.2, 1], false);
  // clavicles + pelvis
  const pv = grp('pelvis');
  for (const s of [-1, 1]) bone(pv.g, V3(s * 0.08, 1.86, 0.18), V3(s * 0.5, 1.88, 0.02), 0.03, pv.mat, 1.3);
  add(pv.g, new THREE.TorusGeometry(0.24, 0.07, 8, 24), pv.mat, [0, 1.0, -0.02], [Math.PI / 2 - 0.3, 0, 0], [1.25, 1, 0.75], false);
  for (const s of [-1, 1]) add(pv.g, new THREE.SphereGeometry(0.16, 12, 8), pv.mat, [s * 0.22, 1.08, -0.04], [0, 0, s * 0.4], [1, 1.1, 0.4], false);
  // arms and hands (left = +x)
  const hands = {};
  for (const [side, s] of [['L', 1], ['R', -1]]) {
    const ar = grp('arm' + side);
    const sh = V3(s * 0.55, 1.84, 0), el = V3(s * 0.68, 1.36, 0.02), wr = V3(s * 0.72, 0.96, 0.06);
    bone(ar.g, sh, el, 0.05, ar.mat);
    bone(ar.g, el.clone().add(V3(0, 0, 0.03)), wr.clone().add(V3(0, 0, 0.03)), 0.03, ar.mat, 1.3);
    bone(ar.g, el.clone().add(V3(0, 0, -0.03)), wr.clone().add(V3(0, 0, -0.03)), 0.028, ar.mat, 1.3);
    const hd = grp('hand' + side);
    const hand = new THREE.Group();
    hand.position.copy(wr);
    hd.g.add(hand);
    for (let i = 0; i < 6; i++) add(hand, new THREE.SphereGeometry(0.03, 8, 6), hd.mat, [s * 0.005, -0.04 - (i % 2) * 0.03, -0.04 + Math.floor(i / 2) * 0.04], [0, 0, 0], [1, 1, 1], false);
    const fingers = [];
    for (let k = 0; k < 5; k++) {
      const thumb = k === 4;
      const base = thumb ? V3(s * -0.02, -0.12, 0.08) : V3(0, -0.11, -0.06 + k * 0.04);
      bone(hand, V3(0, -0.07, base.z * 0.6), base, 0.012, hd.mat, 1.4);
      let parent = hand;
      const f = [];
      let p = base.clone();
      const lens = thumb ? [0.06, 0.05] : [0.075, 0.055, 0.04];
      for (const L of lens) {
        const j = new THREE.Group();
        j.position.copy(p);
        parent.add(j);
        bone(j, V3(0, 0, 0), V3(0, -L, 0), 0.011, hd.mat, 1.3);
        f.push(j);
        parent = j;
        p = V3(0, -L, 0);
      }
      fingers.push(f);
    }
    hands[side] = { hand, fingers };
  }
  // legs and feet
  const femurs = {};
  for (const [side, s] of [['L', 1], ['R', -1]]) {
    const fm = grp('femur' + side);
    const hip = V3(s * 0.22, 1.0, 0), knee = V3(s * 0.24, 0.55, 0.02), ank = V3(s * 0.24, 0.13, 0);
    bone(fm.g, hip, knee, 0.065, fm.mat, 1.5);
    femurs[side] = fm;
    const lg = grp('leg' + side);
    add(lg.g, new THREE.SphereGeometry(0.05, 10, 8), lg.mat, [s * 0.24, 0.55, 0.09], [0, 0, 0], [1, 1, 0.6], false);
    bone(lg.g, knee, ank, 0.05, lg.mat);
    bone(lg.g, knee.clone().add(V3(s * 0.07, 0, -0.02)), ank.clone().add(V3(s * 0.07, 0, -0.02)), 0.022, lg.mat, 1.3);
    const ft = grp('foot' + side);
    for (let i = 0; i < 7; i++) add(ft.g, new THREE.SphereGeometry(0.035, 8, 6), ft.mat, [s * (0.21 + (i % 3) * 0.03), 0.07, -0.05 + Math.floor(i / 3) * 0.04], [0, 0, 0], [1, 0.8, 1], false);
    for (let k = 0; k < 5; k++) {
      const x = s * (0.17 + k * 0.035);
      bone(ft.g, V3(x, 0.05, 0.05), V3(x, 0.03, 0.2), 0.014, ft.mat, 1.3);
      bone(ft.g, V3(x, 0.03, 0.22), V3(x, 0.025, k === 0 ? 0.3 : 0.27), 0.012, ft.mat, 1.2);
    }
  }
  // apply group materials
  for (const { g, mat } of Object.values(groups)) g.traverse((o) => { if (o.isMesh && o.material !== dark && o.material.color && o.material.color.getHex() !== 0xffffff && o !== brain && o.parent !== organs) o.material = mat; });
  if (baby) {
    skull.scale.setScalar(1.25);
    skull.position.y = 2.5;
  }
  return { root, groups, skull, plates, jaw, brain, organs, heart, hands, femurs };
}

// glowing see-through Affan
export function makeGhost(color = 0x6ab8ff, opacity = 0.16) {
  const a = makeAffan();
  const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.FrontSide });
  a.root.traverse((o) => { if (o.isMesh) { o.material = mat; o.renderOrder = 5; } });
  a.ghostMat = mat;
  return a;
}

// ---------------------------------------------------------------- x-ray
export const MARROW_AT = V3(14, 1.6, 0);
export const STAPES_AT = V3(-14, 1.6, 0);
export function buildXray() {
  const scene = new THREE.Scene();
  const sky = gradientSky(0x10306a, 0x050c24);
  scene.add(sky);
  scene.add(new THREE.HemisphereLight(0xd0e8ff, 0x101a3a, 1.2));
  const key = new THREE.DirectionalLight(0xffffff, 1.0);
  key.position.set(3, 6, 8);
  scene.add(key);
  // grid backdrop and floor ring
  const gp = [];
  for (let x = -30; x <= 30; x += 1) gp.push(x, -2, -4, x, 12, -4);
  for (let y = -2; y <= 12; y += 1) gp.push(-30, y, -4, 30, y, -4);
  const gGeo = new THREE.BufferGeometry();
  gGeo.setAttribute('position', new THREE.Float32BufferAttribute(gp, 3));
  scene.add(new THREE.LineSegments(gGeo, new THREE.LineBasicMaterial({ color: 0x2a5aa0, transparent: true, opacity: 0.35 })));
  add(scene, new THREE.CylinderGeometry(1.6, 1.6, 0.06, 48), new THREE.MeshBasicMaterial({ color: 0x2a6ac8, transparent: true, opacity: 0.5 }), [0, -0.03, 0], [0, 0, 0], [1, 1, 1], false);
  const sk = makeSkeleton();
  scene.add(sk.root);
  const ghost = makeGhost();
  scene.add(ghost.root);
  const baby = makeSkeleton({ baby: true });
  baby.root.scale.setScalar(0.5);
  baby.root.position.set(-1.6, 0, 0.3);
  baby.root.visible = false;
  scene.add(baby.root);
  // scan line
  const scan = add(scene, new THREE.PlaneGeometry(3.4, 0.05), new THREE.MeshBasicMaterial({ color: 0x8affff, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false }), [0, 1, 0.8], [0, 0, 0], [1, 1, 1], false);
  // marrow cut-away: big thigh bone, half-open shell, red marrow and blood cells
  const marrow = new THREE.Group();
  marrow.position.copy(MARROW_AT);
  marrow.rotation.z = Math.PI / 2;
  scene.add(marrow);
  const shellM = std(0xf6eed6, 0.5, { emissive: 0x4a6a9a, emissiveIntensity: 0.3, side: THREE.DoubleSide });
  add(marrow, new THREE.CylinderGeometry(0.8, 0.8, 4.0, 32, 1, true, 0, Math.PI), shellM, [0, 0, 0], [0, Math.PI / 2, 0], [1, 1, 1], false);
  for (const s of [-1, 1]) add(marrow, new THREE.SphereGeometry(1.15, 24, 16), shellM, [0, s * 2.3, 0], [0, 0, 0], [1, 0.75, 1], false);
  add(marrow, new THREE.CylinderGeometry(0.62, 0.62, 3.8, 24), std(0xc8283a, 0.6, { emissive: 0x5a0812, emissiveIntensity: 0.4 }), [0, 0, -0.1], [0, 0, 0], [1, 1, 1], false);
  const cellMat = std(0xff3a4a, 0.4, { emissive: 0x6a0a14, emissiveIntensity: 0.4 });
  const cells = Array.from({ length: 18 }, () => {
    const c = add(scene, new THREE.TorusGeometry(0.09, 0.05, 8, 16), cellMat, [0, 0, 0], [0, 0, 0], [1, 1, 1], false);
    c.visible = false;
    return c;
  });
  // stirrup bone (stapes) and a grain of rice
  const stapes = new THREE.Group();
  stapes.position.copy(STAPES_AT).add(V3(-0.55, 0, 0));
  scene.add(stapes);
  const sMat = std(0xfff2d0, 0.4, { emissive: 0x6a5a3a, emissiveIntensity: 0.3 });
  add(stapes, new THREE.TorusGeometry(0.32, 0.05, 10, 30, Math.PI), sMat, [0, 0.05, 0], [0, 0, 0], [1, 1.25, 1], false);
  add(stapes, new RoundedBoxGeometry(0.75, 0.08, 0.32, 2, 0.03), sMat, [0, 0.03, 0], [0, 0, 0], [1, 1, 1], false);
  add(stapes, new THREE.CylinderGeometry(0.06, 0.08, 0.22, 10), sMat, [0, 0.52, 0], [0, 0, 0], [1, 1, 1], false);
  add(stapes, new THREE.SphereGeometry(0.1, 12, 8), sMat, [0, 0.66, 0], [0, 0, 0], [1, 1, 1], false);
  const rice = add(scene, new THREE.SphereGeometry(0.5, 24, 16), std(0xfffaf0, 0.35, { emissive: 0x5a5a5a, emissiveIntensity: 0.25 }), [STAPES_AT.x + 0.9, STAPES_AT.y + 0.3, STAPES_AT.z], [0, 0, 0.25], [0.7, 1.45, 0.62], false);
  const rulerG = new THREE.Group();
  rulerG.position.set(STAPES_AT.x - 0.95, STAPES_AT.y - 0.35, 0.3);
  scene.add(rulerG);
  add(rulerG, new THREE.BoxGeometry(0.8, 0.05, 0.02), new THREE.MeshBasicMaterial({ color: 0xffd84a }), [0.4, 0, 0], [0, 0, 0], [1, 1, 1], false);
  for (const x of [0, 0.8]) add(rulerG, new THREE.BoxGeometry(0.04, 0.18, 0.02), new THREE.MeshBasicMaterial({ color: 0xffd84a }), [x, 0, 0], [0, 0, 0], [1, 1, 1], false);
  void rice;
  return { scene, sky, sk, ghost, baby, scan, marrow, cells };
}

// ---------------------------------------------------------- living room
export const A_RM = V3(0.2, 0, 0.6);
export const FOOD_TABLE = V3(-1.25, 0, 1.15);
export function buildRoom() {
  const w = buildLivingRoom();
  w.kak.root.visible = false;
  const s = w.scene;
  const tbl = new THREE.Group();
  tbl.position.copy(FOOD_TABLE);
  s.add(tbl);
  add(tbl, new RoundedBoxGeometry(1.3, 0.08, 0.8, 2, 0.03), std(0xc98a4a, 0.6), [0, 0.7, 0]);
  for (const [x, z] of [[-0.55, -0.32], [0.55, -0.32], [-0.55, 0.32], [0.55, 0.32]]) add(tbl, new THREE.CylinderGeometry(0.04, 0.04, 0.7, 8), std(0x8a5a3a, 0.6), [x, 0.35, z]);
  const glassMat = new THREE.MeshPhysicalMaterial({ color: 0xe8f6ff, roughness: 0.05, transparent: true, opacity: 0.35, depthWrite: false });
  const milk = new THREE.Group();
  tbl.add(milk);
  milk.position.set(-0.4, 0.74, 0.05);
  add(milk, new THREE.CylinderGeometry(0.11, 0.1, 0.3, 20, 1, true), glassMat, [0, 0.15, 0], [0, 0, 0], [1, 1, 1], false);
  add(milk, new THREE.CylinderGeometry(0.1, 0.095, 0.25, 20), std(0xffffff, 0.4), [0, 0.13, 0], [0, 0, 0], [1, 1, 1], false);
  const bilis = new THREE.Group();
  tbl.add(bilis);
  bilis.position.set(0.05, 0.74, 0.0);
  add(bilis, new THREE.SphereGeometry(0.2, 20, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), std(0x3a8ad8, 0.5, { side: THREE.DoubleSide }), [0, 0.16, 0], [0, 0, 0], [1, 0.7, 1], false);
  const R = rng(51);
  for (let i = 0; i < 18; i++) add(bilis, new THREE.CapsuleGeometry(0.012, 0.07, 3, 6), std(0xd8d0c0, 0.4, { metalness: 0.3 }), [(R() - 0.5) * 0.24, 0.13 + R() * 0.03, (R() - 0.5) * 0.24], [Math.PI / 2, R() * 3, 0], [1, 1, 1], false);
  const greens = new THREE.Group();
  tbl.add(greens);
  greens.position.set(0.42, 0.74, 0.05);
  add(greens, new THREE.CylinderGeometry(0.2, 0.17, 0.03, 24), std(0xffffff, 0.4), [0, 0.02, 0], [0, 0, 0], [1, 1, 1], false);
  for (let i = 0; i < 8; i++) add(greens, new THREE.SphereGeometry(0.06, 10, 8), std([0x3a9a3a, 0x5ab84a][i % 2], 0.6), [(R() - 0.5) * 0.22, 0.06, (R() - 0.5) * 0.22], [0, 0, 0], [1.4, 0.6, 1], false);
  for (const o of [milk, bilis, greens]) o.scale.setScalar(0.001);
  // a milk glass for Affan's hand
  const cup = new THREE.Group();
  add(cup, new THREE.CylinderGeometry(0.11, 0.1, 0.3, 20, 1, true), glassMat, [0, 0, 0], [0, 0, 0], [1, 1, 1], false);
  add(cup, new THREE.CylinderGeometry(0.1, 0.095, 0.24, 20), std(0xffffff, 0.4), [0, -0.02, 0], [0, 0, 0], [1, 1, 1], false);
  w.aff.parts.arms.R.hand.add(cup);
  cup.position.set(0, -0.1, 0.1);
  cup.visible = false;
  const sun = glow(0xffd84a, 2.2, 0);
  sun.position.set(-2.2, 3.0, -2.0);
  s.add(sun);
  return { ...w, milk, bilis, greens, cup, sun };
}
