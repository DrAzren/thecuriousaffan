// Episode 065 sets:
//  - the Episode 038 kitchen: a tall glass of pink air sirap in front of Affan
//    on his stool, a little bowl of ice cubes, and Mama with a jug of sirap;
//  - the "zarah" lab: tiny water molecules (one red oxygen, two white
//    hydrogens) that jiggle close together as water, then hold hands in a
//    honeycomb (with empty space in the middle of each ring) as ice;
//  - a balance with a block of water and a block of ice of the same size, and
//    a tank of water with an ice cube floating in it;
//  - a frozen lake in cross-section: ice only on top, fish swimming below;
//  - the branded outro stage from Episode 005.
import * as THREE from 'three';
import { rng } from '../../shared/core.js';
import { add, glow } from '../../shared/props.js';
import { buildOutro, RoundedBoxGeometry } from '../005-bulan-ikut-kereta/worlds.js';
import { buildKitchen, ISLAND_TOP, BOARD, AFF_POS, MAMA_POS } from '../038-bawang-menangis/worlds.js';
import { makeFish } from '../047-ikan-bernafas/worlds.js';

export { buildOutro, ISLAND_TOP, AFF_POS, MAMA_POS, BOARD };

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

// ---------------------------------------------------------------- props
const iceMat = () => std(0xe8f8ff, 0.08, { transparent: true, opacity: 0.88, emissive: 0x6ab8e0, emissiveIntensity: 0.22 });
export function makeIceCube(s = 1) {
  const g = new THREE.Group();
  add(g, new RoundedBoxGeometry(1, 1, 1, 3, 0.16), iceMat(), [0, 0, 0], [0, 0, 0], [1, 1, 1], false);
  // a few frosty streaks inside
  const fr = std(0xffffff, 0.5, { transparent: true, opacity: 0.55 });
  add(g, new THREE.BoxGeometry(0.5, 0.04, 0.04), fr, [0.05, 0.15, 0.2], [0, 0, 0.6], [1, 1, 1], false);
  add(g, new THREE.BoxGeometry(0.3, 0.04, 0.04), fr, [-0.15, -0.2, 0.1], [0, 0.5, -0.4], [1, 1, 1], false);
  g.scale.setScalar(s);
  return g;
}
// a glass of liquid: returns { g, liquid, level(h) }
export function makeGlass({ r = 0.16, h = 0.5, color = 0xff6f91, fill = 0.72 } = {}) {
  const g = new THREE.Group();
  add(g, new THREE.CylinderGeometry(r, r * 0.88, h, 32, 1, true), std(0xeefaff, 0.05, { transparent: true, opacity: 0.25, side: THREE.DoubleSide, depthWrite: false }), [0, h / 2, 0], [0, 0, 0], [1, 1, 1], false);
  add(g, new THREE.CylinderGeometry(r * 0.88, r * 0.88, 0.02, 32), std(0xeefaff, 0.05, { transparent: true, opacity: 0.4 }), [0, 0.01, 0], [0, 0, 0], [1, 1, 1], false);
  const liquid = add(g, new THREE.CylinderGeometry(r * 0.95, r * 0.86, 1, 32), std(color, 0.15, { transparent: true, opacity: 0.82, emissive: color, emissiveIntensity: 0.15 }), [0, 0, 0], [0, 0, 0], [1, 1, 1], false);
  const level = (k) => {
    const lh = Math.max(0.001, h * k);
    liquid.scale.set(1, lh, 1);
    liquid.position.y = 0.02 + lh / 2;
  };
  level(fill);
  return { g, liquid, level, top: () => 0.02 + h * fill };
}
// a water molecule: one red oxygen with two white hydrogens (a little "Mickey" head)
const oMat = std(0xff5a5a, 0.35, { emissive: 0x801818, emissiveIntensity: 0.2 });
const hMat = std(0xffffff, 0.35, { emissive: 0x404040, emissiveIntensity: 0.15 });
export function makeMolecule(s = 1) {
  const g = new THREE.Group();
  add(g, new THREE.SphereGeometry(0.34, 20, 14), oMat, [0, 0, 0], [0, 0, 0], [1, 1, 1], false);
  for (const sd of [-1, 1]) {
    const a = sd * 0.9;
    add(g, new THREE.SphereGeometry(0.2, 16, 12), hMat, [Math.sin(a) * 0.36, Math.cos(a) * 0.36, 0.08], [0, 0, 0], [1, 1, 1], false);
  }
  g.scale.setScalar(s);
  return g;
}

// ---------------------------------------------------------------- kitchen
export const GLASS_AT = V3(1.25, ISLAND_TOP, -0.72);
export const ICEBOWL_AT = V3(1.65, ISLAND_TOP, -0.95);
export const JUG_AT = V3(BOARD.x + 0.05, ISLAND_TOP, BOARD.z + 0.05);
export function buildKitchen65() {
  const k = buildKitchen();
  for (const o of [k.onion, k.knife, k.shine, k.coldOnion, ...(k.pieces || []), ...(k.tears || [])]) if (o) o.visible = false;
  const s = k.scene;
  const rf = new THREE.DirectionalLight(0xfff2e6, 1.0);
  rf.position.set(-0.5, 3.0, -4.0);
  rf.target.position.set(1.75, 1.4, -0.35);
  s.add(rf, rf.target);
  // the glass of sirap with a straw
  const glass = makeGlass({ r: 0.15, h: 0.46, color: 0xff6f91, fill: 0.7 });
  glass.g.position.copy(GLASS_AT);
  s.add(glass.g);
  add(glass.g, new THREE.CylinderGeometry(0.014, 0.014, 0.62, 10), std(0x4ad0a0, 0.4), [0.05, 0.36, 0], [0, 0, 0.18], [1, 1, 1], false);
  // ice cubes: three that end up floating in the glass, one held by Affan
  const R = rng(65);
  const floats = [0, 1, 2].map((i) => {
    const c = makeIceCube(0.085);
    c.userData.ph = R() * 6;
    c.userData.off = V3(Math.cos(i * 2.1) * 0.06, 0, Math.sin(i * 2.1) * 0.06);
    glass.g.add(c);
    return c;
  });
  const held = makeIceCube(0.085);
  s.add(held);
  // bowl of ice
  const bowl = new THREE.Group();
  bowl.position.copy(ICEBOWL_AT);
  s.add(bowl);
  const pts = [];
  for (let i = 0; i <= 10; i++) pts.push(new THREE.Vector2(0.07 + 0.15 * Math.sin((i / 10) * Math.PI * 0.5), (i / 10) * 0.12));
  add(bowl, new THREE.LatheGeometry(pts, 28), std(0x7ac8ff, 0.4, { side: THREE.DoubleSide }), [0, 0, 0]);
  for (let i = 0; i < 6; i++) {
    const c = makeIceCube(0.075);
    c.position.set((R() - 0.5) * 0.16, 0.08 + R() * 0.05, (R() - 0.5) * 0.16);
    c.rotation.set(R(), R(), R());
    bowl.add(c);
  }
  // Mama's jug of sirap
  const jug = new THREE.Group();
  jug.position.copy(JUG_AT);
  s.add(jug);
  add(jug, new THREE.CylinderGeometry(0.17, 0.2, 0.5, 28, 1, true), std(0xeefaff, 0.05, { transparent: true, opacity: 0.3, side: THREE.DoubleSide, depthWrite: false }), [0, 0.25, 0], [0, 0, 0], [1, 1, 1], false);
  add(jug, new THREE.CylinderGeometry(0.16, 0.19, 0.36, 28), std(0xff6f91, 0.15, { transparent: true, opacity: 0.85, emissive: 0xff6f91, emissiveIntensity: 0.15 }), [0, 0.19, 0], [0, 0, 0], [1, 1, 1], false);
  add(jug, new THREE.TorusGeometry(0.12, 0.025, 8, 20, Math.PI), std(0xeefaff, 0.1, { transparent: true, opacity: 0.6 }), [0.2, 0.28, 0], [0, 0, -Math.PI / 2], [1, 1, 1], false);
  // splash droplets
  const dropMat = std(0xff8fae, 0.1, { transparent: true, opacity: 0.9 });
  const splash = [0, 1, 2, 3, 4, 5].map(() => {
    const d = add(s, new THREE.SphereGeometry(0.018, 10, 8), dropMat, [0, 0, 0], [0, 0, 0], [1, 1, 1], false);
    d.visible = false;
    return d;
  });
  return { ...k, glass, floats, held, bowl, jug, splash };
}

// ------------------------------------------------------------- the lab
export const MOL_AT = V3(0, 0, 0); // molecules (in the x-y plane, facing +z)
export const SCALE_AT = V3(30, 0, 0); // balance + tank
export const LAKE_AT = V3(60, 0, 0); // frozen lake
export function buildLab() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xdff2ff);
  const sky = gradientSky(0xa8d8ff, 0xf0f8ff);
  scene.add(sky);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xb8d0e8, 1.15));
  const key = new THREE.DirectionalLight(0xffffff, 1.5);
  key.position.set(4, 9, 8);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xe0f0ff, 0.6);
  fill.position.set(-6, 3, 5);
  scene.add(fill);
  const R = rng(651);

  // --- molecules: liquid spots (packed, random) and ice spots (honeycomb)
  const a = 0.95; // honeycomb bond length
  const lattice = [];
  for (let i = -6; i <= 6; i++) {
    for (let j = -6; j <= 6; j++) {
      const bx = i * Math.sqrt(3) * a + j * (Math.sqrt(3) / 2) * a, by = j * 1.5 * a;
      lattice.push(V3(bx, by, 0), V3(bx, by + a, 0));
    }
  }
  const C0 = V3(0, 3.2, 0);
  const N = 30;
  lattice.sort((p, q) => p.distanceTo(V3(0, 0.5, 0)) - q.distanceTo(V3(0, 0.5, 0)));
  const ice = lattice.slice(0, N).map((p) => p.clone().add(C0));
  // liquid: the same molecules squeezed into a smaller blob
  const liquid = [];
  while (liquid.length < N) {
    const p = V3((R() - 0.5) * 4.2, (R() - 0.5) * 4.2, (R() - 0.5) * 0.8);
    if (p.length() > 2.2) continue;
    if (liquid.some((q) => q.distanceTo(p) < 0.62)) continue;
    liquid.push(p.add(C0));
  }
  // pair them so molecules travel short paths (greedy nearest)
  const used = new Set();
  const pairs = ice.map((p) => {
    let best = -1, bd = Infinity;
    liquid.forEach((q, k) => { if (!used.has(k) && q.distanceTo(p) < bd) { bd = q.distanceTo(p); best = k; } });
    used.add(best);
    return liquid[best];
  });
  const mols = ice.map((p, i) => {
    const m = makeMolecule(1);
    m.position.copy(pairs[i]);
    m.userData = { ice: p, liq: pairs[i], seed: R() * 10, rot: R() * 6 };
    scene.add(m);
    return m;
  });
  // bonds ("holding hands") between neighbouring ice spots
  const bondMat = std(0x7a5cf0, 0.5, { emissive: 0x3a2a90, emissiveIntensity: 0.3 });
  const bonds = [];
  for (let i = 0; i < N; i++) {
    for (let j = i + 1; j < N; j++) {
      const d = ice[i].distanceTo(ice[j]);
      if (Math.abs(d - a) > 0.05) continue;
      const mid = ice[i].clone().add(ice[j]).multiplyScalar(0.5);
      const b = add(scene, new THREE.CylinderGeometry(0.06, 0.06, d - 0.5, 8), bondMat, [mid.x, mid.y, mid.z], [0, 0, 0], [1, 1, 1], false);
      b.lookAt(ice[j]);
      b.rotateX(Math.PI / 2);
      b.visible = false;
      bonds.push(b);
    }
  }
  // hexagon rings with glowing empty middles
  const holes = [];
  const centres = [];
  for (let i = -4; i <= 4; i++) {
    for (let j = -4; j <= 4; j++) {
      const bx = i * Math.sqrt(3) * a + j * (Math.sqrt(3) / 2) * a, by = j * 1.5 * a + a / 2;
      const c = V3(bx + (Math.sqrt(3) / 2) * a, by + a * 0.5 * 0 + 0, 0);
      centres.push(c);
    }
  }
  centres.forEach((c) => {
    const w = c.clone().add(C0);
    // a ring centre is "complete" when its six corners are all occupied
    let k = 0;
    for (const p of ice) if (Math.abs(p.distanceTo(w) - a) < 0.05) k++;
    if (k < 6) return;
    const h = add(scene, new THREE.CircleGeometry(0.42, 6), new THREE.MeshBasicMaterial({ color: 0x5fe08a, transparent: true, opacity: 0, depthWrite: false }), [w.x, w.y, -0.05], [0, 0, Math.PI / 6], [1, 1, 1], false);
    holes.push(h);
  });
  // a frosty backdrop panel for the ice state
  const frost = add(scene, new THREE.PlaneGeometry(14, 10), new THREE.MeshBasicMaterial({ color: 0xbfe8ff, transparent: true, opacity: 0 }), [0, 3.2, -1.2], [0, 0, 0], [1, 1, 1], false);
  const snow = [];
  for (let i = 0; i < 24; i++) {
    const f = add(scene, new THREE.OctahedronGeometry(0.08, 0), std(0xffffff, 0.3, { transparent: true, opacity: 0 }), [(R() - 0.5) * 7, R() * 7, 0.5 + R()], [R(), R(), R()], [1, 1, 1], false);
    f.userData.seed = R() * 10;
    snow.push(f);
  }

  // --- balance with a water block and an ice block of the same size, and a tank
  const bal = new THREE.Group();
  bal.position.copy(SCALE_AT).add(V3(0, 0, 0));
  scene.add(bal);
  add(scene, new THREE.CylinderGeometry(6, 6.3, 0.3, 48), std(0xe8f2fb, 0.9), [SCALE_AT.x, -0.15, SCALE_AT.z]);
  add(bal, new THREE.CylinderGeometry(0.7, 0.9, 0.3, 24), std(0x4a5468, 0.5), [0, 0.15, 0]);
  add(bal, new THREE.CylinderGeometry(0.1, 0.12, 2.6, 12), std(0x4a5468, 0.5), [0, 1.6, 0]);
  const beam = new THREE.Group();
  beam.position.set(0, 2.9, 0);
  bal.add(beam);
  add(beam, new RoundedBoxGeometry(4.4, 0.16, 0.2, 2, 0.06), std(0xffb020, 0.5), [0, 0, 0]);
  add(beam, new THREE.SphereGeometry(0.18, 16, 12), std(0x4a5468, 0.5), [0, 0, 0.05]);
  const pans = [-1, 1].map((sd) => {
    const p = new THREE.Group();
    p.position.set(sd * 2.0, 0, 0);
    beam.add(p);
    const hang = new THREE.Group();
    p.add(hang);
    add(hang, new THREE.CylinderGeometry(0.02, 0.02, 1.1, 6), std(0x4a5468, 0.5), [0, -0.55, 0], [0, 0, 0], [1, 1, 1], false);
    add(hang, new THREE.CylinderGeometry(0.8, 0.65, 0.12, 28), std(0xc9ced6, 0.3, { metalness: 0.5 }), [0, -1.15, 0]);
    return { p, hang };
  });
  const waterBlock = add(pans[0].hang, new RoundedBoxGeometry(1, 1, 1, 3, 0.08), std(0x3a9cff, 0.1, { transparent: true, opacity: 0.8, emissive: 0x1050a0, emissiveIntensity: 0.25 }), [0, -0.59, 0], [0, 0, 0], [1, 1, 1], false);
  const iceBlock = makeIceCube(1);
  iceBlock.position.set(0, -0.59, 0);
  pans[1].hang.add(iceBlock);
  // the tank of water with an ice cube floating (about nine tenths under water)
  const tank = new THREE.Group();
  tank.position.copy(SCALE_AT).add(V3(0, 0, 0));
  scene.add(tank);
  add(tank, new THREE.BoxGeometry(3.4, 2.4, 2.0), std(0xeefaff, 0.05, { transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false }), [0, 1.2, 0], [0, 0, 0], [1, 1, 1], false);
  add(tank, new THREE.BoxGeometry(3.3, 1.8, 1.9), std(0x3a9cff, 0.1, { transparent: true, opacity: 0.45, depthWrite: false, emissive: 0x1050a0, emissiveIntensity: 0.2 }), [0, 0.92, 0], [0, 0, 0], [1, 1, 1], false);
  const tankIce = makeIceCube(0.9);
  tankIce.position.set(0, 1.82 - 0.45 + 0.09, 0);
  tank.add(tankIce);
  tank.visible = false;

  // --- the frozen lake in cross-section
  const lake = new THREE.Group();
  lake.position.copy(LAKE_AT);
  scene.add(lake);
  add(lake, new THREE.BoxGeometry(9, 3.6, 3), std(0x2f7fd0, 0.2, { transparent: true, opacity: 0.5, depthWrite: false, emissive: 0x0a3070, emissiveIntensity: 0.3 }), [0, 1.8, 0]);
  add(lake, new THREE.PlaneGeometry(9, 3.6), std(0x1a5aa0, 0.6), [0, 1.8, -1.5]);
  add(lake, new THREE.BoxGeometry(9.2, 0.4, 3.2), std(0x7a5a3a, 0.9), [0, -0.2, 0]);
  // snowy banks either side
  for (const sd of [-1, 1]) {
    add(lake, new RoundedBoxGeometry(3, 4.4, 3.4, 3, 0.4), std(0x8a6a4a, 0.9), [sd * 6, 1.8, 0]);
    add(lake, new RoundedBoxGeometry(3.2, 0.6, 3.6, 3, 0.28), std(0xffffff, 0.8), [sd * 6, 4.1, 0]);
  }
  const iceLayer = add(lake, new RoundedBoxGeometry(9, 0.7, 3.05, 2, 0.1), std(0xe6f8ff, 0.15, { transparent: true, opacity: 0.92, emissive: 0x6ab8e0, emissiveIntensity: 0.18 }), [0, 3.25, 0], [0, 0, 0], [1, 1, 1], false);
  const fishes = [
    makeFish({ color: 0xff8a2a, belly: 0xffe0a0, len: 1.0 }),
    makeFish({ color: 0xffd23a, belly: 0xfff0b0, len: 0.8 }),
    makeFish({ color: 0x5fd0a0, belly: 0xe0fff0, len: 0.9, spots: 3 }),
  ];
  fishes.forEach((f, i) => {
    f.root.scale.setScalar(0.85);
    f.root.userData = { y: 0.8 + i * 0.75, ph: i * 2.1, sp: 0.5 + i * 0.12 };
    lake.add(f.root);
  });
  const lakeSnow = [];
  for (let i = 0; i < 30; i++) {
    const f = add(scene, new THREE.OctahedronGeometry(0.06, 0), std(0xffffff, 0.3), [LAKE_AT.x + (R() - 0.5) * 12, 4 + R() * 5, LAKE_AT.z + (R() - 0.5) * 3 + 1.5], [R(), R(), R()], [1, 1, 1], false);
    f.userData.seed = R() * 10;
    lakeSnow.push(f);
  }
  return { scene, sky, mols, bonds, holes, frost, snow, C0, beam, pans, waterBlock, iceBlock, bal, tank, tankIce, lake, iceLayer, fishes, lakeSnow };
}
