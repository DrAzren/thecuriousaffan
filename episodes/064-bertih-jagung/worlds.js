// Episode 064 sets:
//  - the Episode 038 kitchen with the real 3D cast: Mama at a little gas
//    burner on the island, shaking a pot of corn whose lid rattles while
//    popcorn jumps out; Affan sitting on his stool with a bowl of popcorn;
//  - the "inside a kernel" stage: a giant corn kernel with a see-through hard
//    hull, soft starch and water droplets inside; flames heat it, the droplets
//    turn into steam that pushes on the hull (pressure arrows and a gauge),
//    the hull splits and the starch puffs out into a big fluffy popcorn;
//  - a side-by-side of a popcorn kernel (tight hull) and an ordinary corn
//    kernel whose hull leaks steam through little cracks;
//  - the branded outro stage from Episode 005.
import * as THREE from 'three';
import { rng } from '../../shared/core.js';
import { add, glow } from '../../shared/props.js';
import { buildOutro, RoundedBoxGeometry } from '../005-bulan-ikut-kereta/worlds.js';
import { buildKitchen, ISLAND_TOP, BOARD, AFF_POS, MAMA_POS } from '../038-bawang-menangis/worlds.js';

export { buildOutro, ISLAND_TOP, AFF_POS, MAMA_POS };

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
// a popped corn: a lumpy cream-white cluster with a few yellow hull flakes
const popMat = std(0xfff4d6, 0.85, { emissive: 0x3a2a10, emissiveIntensity: 0.08 });
const hullMat = std(0xf0a020, 0.45, { emissive: 0x3a1c00, emissiveIntensity: 0.12 });
export function makePopcorn(seed = 1, s = 1, lumps = 9) {
  const R = rng(seed);
  const g = new THREE.Group();
  for (let i = 0; i < lumps; i++) {
    const u = R() * 2 - 1, a = R() * Math.PI * 2, r = Math.sqrt(1 - u * u);
    const d = 0.55 + R() * 0.35;
    add(g, new THREE.SphereGeometry(1, 14, 10), popMat, [r * Math.cos(a) * d, u * d * 0.8, r * Math.sin(a) * d], [0, 0, 0], [0.55 + R() * 0.3, 0.5 + R() * 0.3, 0.55 + R() * 0.3], false);
  }
  add(g, new THREE.SphereGeometry(0.55, 12, 8), hullMat, [0.2, -0.75, 0.1], [0.3, 0, 0.5], [1, 0.35, 0.8], false);
  g.scale.setScalar(s);
  return g;
}
// a corn kernel: a rounded wedge, golden with a pale tip
const kernelProfile = (k = 1) => {
  const pts = [];
  for (let i = 0; i <= 24; i++) {
    const v = i / 24; // 0 bottom (pointed tip) .. 1 top (round crown)
    const y = v * 1.3;
    const cap = v > 0.85 ? Math.max(0, Math.cos(Math.min(1, (v - 0.85) / 0.15) * Math.PI * 0.5)) ** 0.5 : 1;
    const r = k * (0.12 + 0.62 * Math.sin(Math.min(1, v * 1.15) * Math.PI * 0.5)) * cap;
    pts.push(new THREE.Vector2(Math.max(0.001, r), y));
  }
  return pts;
};
export function makeKernel(s = 1, color = 0xf2b02a) {
  const g = new THREE.Group();
  const body = add(g, new THREE.LatheGeometry(kernelProfile(), 40), std(color, 0.35, { emissive: 0x3a1800, emissiveIntensity: 0.1 }), [0, 0, 0], [0, 0, 0], [1, 1, 0.62]);
  add(g, new THREE.SphereGeometry(0.16, 16, 10), std(0xfff0c8, 0.6), [0, 0.02, 0], [0, 0, 0], [1, 0.6, 0.7], false);
  g.scale.setScalar(s);
  g.userData.body = body;
  return g;
}

// ---------------------------------------------------------------- kitchen
export const BURNER_AT = V3(BOARD.x - 0.05, ISLAND_TOP, BOARD.z + 0.02);
export const POT_TOP = ISLAND_TOP + 0.12 + 0.36;
export const BOWL_AT = V3(1.25, ISLAND_TOP, -0.7);
export function buildKitchen64() {
  const k = buildKitchen();
  for (const o of [k.onion, k.knife, k.shine, k.coldOnion, ...(k.pieces || []), ...(k.tears || [])]) if (o) o.visible = false;
  const s = k.scene;
  // a soft reverse fill so the faces read from Affan's side
  const rf = new THREE.DirectionalLight(0xfff2e6, 0.9);
  rf.position.set(-0.5, 3.0, -4.0);
  rf.target.position.set(1.75, 1.4, -0.35);
  s.add(rf, rf.target);
  // board hidden under the burner
  s.traverse((o) => {
    if (o.isMesh && o.position.distanceTo(V3(BOARD.x, ISLAND_TOP + 0.03, BOARD.z)) < 0.12 && o.geometry.type.includes('Box')) o.visible = false;
  });
  // the gas burner
  const burner = new THREE.Group();
  burner.position.copy(BURNER_AT);
  s.add(burner);
  add(burner, new RoundedBoxGeometry(0.7, 0.1, 0.55, 3, 0.03), std(0x2b2f38, 0.4, { metalness: 0.3 }), [0, 0.05, 0]);
  add(burner, new THREE.TorusGeometry(0.16, 0.025, 8, 24), std(0x555b66, 0.4, { metalness: 0.6 }), [0, 0.11, 0], [Math.PI / 2, 0, 0]);
  add(burner, new THREE.CylinderGeometry(0.03, 0.03, 0.04, 12), std(0xd04030, 0.5), [0.26, 0.08, 0.22], [Math.PI / 2, 0, 0]);
  const flames = [];
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const f = add(burner, new THREE.ConeGeometry(0.03, 0.09, 8), new THREE.MeshBasicMaterial({ color: 0x4aa8ff, transparent: true, opacity: 0.85 }), [Math.cos(a) * 0.14, 0.15, Math.sin(a) * 0.14], [0, 0, 0], [1, 1, 1], false);
    flames.push(f);
  }
  const flameGlow = glow(0x6ab8ff, 0.6, 0.5);
  flameGlow.position.set(0, 0.16, 0);
  burner.add(flameGlow);
  // the pot with a glass lid
  const pot = new THREE.Group();
  pot.position.set(0, 0.12, 0);
  burner.add(pot);
  const steel = std(0xc9ced6, 0.25, { metalness: 0.7 });
  add(pot, new THREE.CylinderGeometry(0.26, 0.24, 0.3, 32, 1, true), steel, [0, 0.15, 0]);
  add(pot, new THREE.CylinderGeometry(0.24, 0.24, 0.02, 32), steel, [0, 0.01, 0]);
  add(pot, new THREE.TorusGeometry(0.26, 0.015, 8, 32), steel, [0, 0.3, 0], [Math.PI / 2, 0, 0]);
  for (const sd of [-1, 1]) add(pot, new RoundedBoxGeometry(0.12, 0.035, 0.05, 2, 0.015), std(0x2b2f38, 0.5), [sd * 0.32, 0.24, 0]);
  const lid = new THREE.Group();
  lid.position.set(0, 0.3, 0);
  pot.add(lid);
  add(lid, new THREE.SphereGeometry(0.27, 32, 10, 0, Math.PI * 2, 0, Math.PI * 0.32), std(0xdff4ff, 0.05, { transparent: true, opacity: 0.35, metalness: 0.1 }), [0, -0.2, 0], [0, 0, 0], [1, 1, 1], false);
  add(lid, new THREE.TorusGeometry(0.255, 0.012, 8, 32), steel, [0, 0.0, 0], [Math.PI / 2, 0, 0]);
  add(lid, new THREE.SphereGeometry(0.04, 12, 8), std(0x2b2f38, 0.4), [0, 0.1, 0]);
  // popcorn inside the pot (fills up) and pieces that jump out
  const inside = [];
  const R = rng(64);
  for (let i = 0; i < 22; i++) {
    const p = makePopcorn(100 + i, 0.05);
    const a = R() * Math.PI * 2, r = R() * 0.17;
    p.position.set(Math.cos(a) * r, 0.05 + R() * 0.17, Math.sin(a) * r);
    p.rotation.set(R() * 6, R() * 6, R() * 6);
    p.userData.h = p.position.y;
    pot.add(p);
    inside.push(p);
  }
  const jumpers = [0, 1, 2, 3, 4, 5].map((i) => {
    const p = makePopcorn(200 + i, 0.055);
    s.add(p);
    p.visible = false;
    return p;
  });
  // a bowl of popcorn in front of Affan
  const bowl = new THREE.Group();
  bowl.position.copy(BOWL_AT);
  s.add(bowl);
  const bowlPts = [];
  for (let i = 0; i <= 12; i++) {
    const v = i / 12;
    bowlPts.push(new THREE.Vector2(0.08 + 0.2 * Math.sin(v * Math.PI * 0.5), v * 0.16));
  }
  add(bowl, new THREE.LatheGeometry(bowlPts, 32), std(0xff7a5c, 0.5, { side: THREE.DoubleSide }), [0, 0, 0]);
  const bowlCorn = [];
  for (let i = 0; i < 26; i++) {
    const p = makePopcorn(300 + i, 0.05);
    const a = R() * Math.PI * 2, r = Math.sqrt(R()) * 0.2;
    p.position.set(Math.cos(a) * r, 0.13 + (0.2 - r) * 0.5 + R() * 0.04, Math.sin(a) * r);
    p.rotation.set(R() * 6, R() * 6, R() * 6);
    bowl.add(p);
    bowlCorn.push(p);
  }
  // one piece Affan eats
  const snack = makePopcorn(77, 0.055);
  s.add(snack);
  snack.visible = false;
  // steam puffs over the pot
  const steamMat = new THREE.SpriteMaterial({ map: glow(0xffffff, 1).material.map, color: 0xffffff, transparent: true, opacity: 0.5, depthWrite: false });
  const steam = [0, 1, 2, 3, 4].map(() => {
    const sp = new THREE.Sprite(steamMat.clone());
    s.add(sp);
    return sp;
  });
  return { ...k, burner, flames, flameGlow, pot, lid, inside, jumpers, bowl, bowlCorn, snack, steam };
}

// ------------------------------------------------------------ kernel stage
export const KERN_AT = V3(0, 0, 0); // the giant kernel
export const COMP_AT = V3(30, 0, 0); // popcorn kernel vs ordinary kernel
export function buildKernelLab() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xffe9c9);
  const sky = gradientSky(0xffd9a8, 0xfff3e0);
  scene.add(sky);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xe0c8a0, 1.1));
  const key = new THREE.DirectionalLight(0xffffff, 1.6);
  key.position.set(4, 9, 8);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xffe8d0, 0.6);
  fill.position.set(-6, 3, 5);
  scene.add(fill);
  const R = rng(640);
  // floor discs
  for (const at of [KERN_AT, COMP_AT]) add(scene, new THREE.CylinderGeometry(6.5, 6.8, 0.3, 48), std(0xf4d9b0, 0.9), [at.x, -0.15, at.z]);

  // --- the giant kernel (about 4 units tall), hull is a see-through shell with a cut window
  const kern = new THREE.Group();
  kern.position.copy(KERN_AT).add(V3(0, 0.9, 0));
  scene.add(kern);
  const shellGeo = new THREE.LatheGeometry(kernelProfile(), 64, Math.PI * 0.3, Math.PI * 1.4); // open window facing +z
  const shellOut = std(0xf2a51c, 0.3, { emissive: 0x4a2000, emissiveIntensity: 0.15, side: THREE.DoubleSide });
  const shell = add(kern, shellGeo, shellOut, [0, 0, 0], [0, 0, 0], [2.6, 2.6, 1.9]);
  // a thin glassy skin over the window so the hull still reads as closed
  const glass = add(kern, new THREE.LatheGeometry(kernelProfile(), 48, -Math.PI * 0.3, Math.PI * 0.6), std(0xffc860, 0.1, { transparent: true, opacity: 0.18, depthWrite: false, side: THREE.DoubleSide }), [0, 0, 0], [0, 0, 0], [2.6, 2.6, 1.9], false);
  // rim along the cut
  const tip = add(kern, new THREE.SphereGeometry(0.42, 20, 12), std(0xfff0c8, 0.6), [0, 0.05, 0], [0, 0, 0], [1, 0.6, 0.7]);
  // starch: soft creamy lumps filling most of the inside
  const starch = new THREE.Group();
  kern.add(starch);
  const starchMat = std(0xfff6e0, 0.9, { emissive: 0x403020, emissiveIntensity: 0.05 });
  const prof = kernelProfile();
  const rAt = (y) => prof[Math.min(24, Math.max(0, Math.round((y / (2.6 * 1.3)) * 24)))].x * 2.6;
  for (let i = 0; i < 30; i++) {
    const y = 1.25 + R() * 1.7;
    const rMax = Math.max(0.1, rAt(y) - 0.55);
    const a = R() * Math.PI * 2, r = Math.sqrt(R()) * rMax;
    const m = add(starch, new THREE.SphereGeometry(0.3 + R() * 0.12, 16, 12), starchMat, [Math.sin(a) * r, y, Math.cos(a) * r * 0.7], [0, 0, 0], [1, 0.85, 1], false);
    m.userData.home = m.position.clone();
  }
  // water droplets between the starch
  const dropMat = std(0x47a8ff, 0.1, { emissive: 0x0a3a80, emissiveIntensity: 0.35, transparent: true, opacity: 0.95 });
  const drops = [];
  for (let i = 0; i < 12; i++) {
    const y = 1.3 + R() * 1.6;
    const r = (R() - 0.5) * 2 * Math.max(0.2, rAt(y) - 0.6);
    const d = add(kern, new THREE.SphereGeometry(0.16, 16, 12), dropMat, [r, y, 0.55 + R() * 0.35], [0, 0, 0], [1, 1.2, 1], false);
    d.userData.home = d.position.clone();
    d.userData.seed = R() * 10;
    drops.push(d);
  }
  // steam puffs (one per droplet)
  const puffMat = new THREE.SpriteMaterial({ map: glow(0xffffff, 1).material.map, color: 0xffffff, transparent: true, opacity: 0.85, depthWrite: false });
  const puffs = drops.map(() => {
    const p = new THREE.Sprite(puffMat.clone());
    p.visible = false;
    kern.add(p);
    return p;
  });
  // pressure arrows on the inside of the hull, pointing out
  const arrowMat = std(0xff4d5e, 0.5, { emissive: 0x801020, emissiveIntensity: 0.3 });
  const arrows = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + 0.2;
    const y = 1.0 + (i % 3) * 0.55;
    const grp = new THREE.Group();
    grp.position.set(Math.cos(a) * 1.2, y, Math.sin(a) * 0.85 + 0.2);
    grp.lookAt(kern.localToWorld(V3(Math.cos(a) * 5, y, Math.sin(a) * 5)));
    add(grp, new THREE.CylinderGeometry(0.06, 0.06, 0.4, 10), arrowMat, [0, 0, 0.2], [Math.PI / 2, 0, 0], [1, 1, 1], false);
    add(grp, new THREE.ConeGeometry(0.15, 0.25, 12), arrowMat, [0, 0, 0.5], [Math.PI / 2, 0, 0], [1, 1, 1], false);
    kern.add(grp);
    grp.visible = false;
    arrows.push(grp);
  }
  // flames underneath
  const fire = new THREE.Group();
  fire.position.copy(KERN_AT).add(V3(0, 0, 0));
  scene.add(fire);
  const flameMats = [0xff7a1a, 0xffb020, 0xffe060].map((c) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.9 }));
  const flames = [];
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    const f = add(fire, new THREE.ConeGeometry(0.22, 0.9, 10), flameMats[i % 3], [Math.cos(a) * 1.1, 0.45, Math.sin(a) * 0.8], [0, 0, 0], [1, 1, 1], false);
    f.userData.seed = R() * 10;
    flames.push(f);
  }
  const fireGlow = glow(0xff9a30, 6, 0.6);
  fireGlow.position.set(0, 0.8, 0);
  fire.add(fireGlow);
  // the burst: hull pieces and the big popcorn
  const shards = [];
  for (let i = 0; i < 6; i++) {
    const m = add(scene, new THREE.LatheGeometry(kernelProfile(), 16, (i / 6) * Math.PI * 2, Math.PI / 3), std(0xf2a51c, 0.3, { emissive: 0x4a2000, emissiveIntensity: 0.15, side: THREE.DoubleSide }), [0, 0, 0], [0, 0, 0], [2.6, 2.6, 1.9]);
    m.visible = false;
    m.userData.dir = V3(Math.cos((i / 6) * Math.PI * 2 + 0.5) * 1.2, 0.6 + R() * 0.6, -0.3 - R() * 0.5).normalize();
    m.userData.spin = V3(R() - 0.5, R() - 0.5, R() - 0.5).multiplyScalar(6);
    shards.push(m);
  }
  const bigPop = makePopcorn(9, 1, 22);
  bigPop.position.copy(KERN_AT).add(V3(0, 2.6, 0));
  bigPop.visible = false;
  scene.add(bigPop);
  // a pressure gauge on a stand beside the kernel
  const gauge = new THREE.Group();
  gauge.position.copy(KERN_AT).add(V3(2.5, 0, 1.4));
  scene.add(gauge);
  add(gauge, new THREE.CylinderGeometry(0.06, 0.06, 2.6, 10), std(0x8a8f99, 0.4, { metalness: 0.5 }), [0, 1.3, 0]);
  add(gauge, new THREE.CylinderGeometry(0.72, 0.72, 0.16, 40), std(0x40464f, 0.4, { metalness: 0.4 }), [0, 3.0, 0], [Math.PI / 2, 0, 0]);
  const face = add(gauge, new THREE.CircleGeometry(0.62, 40), std(0xffffff, 0.6), [0, 3.0, 0.085], [0, 0, 0], [1, 1, 1], false);
  // green / orange / red arc on the dial
  [[0x3fbf5f, 0], [0xffb020, 1], [0xff4d5e, 2]].forEach(([c, k]) => {
    add(gauge, new THREE.RingGeometry(0.46, 0.56, 24, 1, Math.PI * (1.25 - k * 0.5), Math.PI * 0.5), new THREE.MeshBasicMaterial({ color: c }), [0, 3.0, 0.09], [0, 0, 0], [1, 1, 1], false);
  });
  const needle = new THREE.Group();
  needle.position.set(0, 3.0, 0.1);
  gauge.add(needle);
  add(needle, new THREE.BoxGeometry(0.05, 0.5, 0.02), new THREE.MeshBasicMaterial({ color: 0x17256b }), [0, 0.22, 0], [0, 0, 0], [1, 1, 1], false);
  add(needle, new THREE.CircleGeometry(0.07, 16), new THREE.MeshBasicMaterial({ color: 0x17256b }), [0, 0, 0.01], [0, 0, 0], [1, 1, 1], false);
  void face;

  // --- comparison: popcorn kernel (tight hull) vs ordinary corn (leaky hull)
  const good = makeKernel(1.15, 0xf2b02a);
  good.position.copy(COMP_AT).add(V3(-1.35, 0.3, 0));
  scene.add(good);
  const plain = makeKernel(1.15, 0xf6d870);
  plain.position.copy(COMP_AT).add(V3(1.35, 0.3, 0));
  scene.add(plain);
  // cracks on the ordinary kernel's hull
  const crackMat = new THREE.MeshBasicMaterial({ color: 0x7a4a10 });
  const cracks = [];
  for (let i = 0; i < 5; i++) {
    const c = add(plain, new THREE.BoxGeometry(0.03, 0.18 + R() * 0.12, 0.01), crackMat, [(R() - 0.5) * 0.7, 0.4 + R() * 0.7, 0.44], [0, 0, (R() - 0.5) * 1.2], [1, 1, 1], false);
    cracks.push(c);
  }
  const leakMat = puffMat.clone();
  leakMat.color = new THREE.Color(0x9fb4cc);
  const leaks = [0, 1, 2, 3, 4, 5, 6, 7].map(() => {
    const p = new THREE.Sprite(leakMat.clone());
    scene.add(p);
    return p;
  });
  // the tight kernel's steam stays inside: a soft glow under its hull
  const holdGlow = glow(0xfff0c0, 1.1, 0.0);
  holdGlow.position.copy(good.position).add(V3(0, 0.8, 0.3));
  scene.add(holdGlow);
  const compFire = [];
  for (const k of [good, plain]) {
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      const f = add(scene, new THREE.ConeGeometry(0.1, 0.4, 10), flameMats[i % 3], [k.position.x + Math.cos(a) * 0.4, 0.2, k.position.z + Math.sin(a) * 0.3], [0, 0, 0], [1, 1, 1], false);
      f.userData.seed = R() * 10;
      compFire.push(f);
    }
  }
  return { scene, sky, kern, shell, glass, tip, starch, drops, puffs, arrows, fire, flames, fireGlow, shards, bigPop, gauge, needle, good, plain, cracks, leaks, holdGlow, compFire };
}
