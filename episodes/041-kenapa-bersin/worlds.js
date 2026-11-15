// Episode 041 sets:
//  - the Episode 038 kitchen with Mama and Affan on his stool; Mama shakes a
//    pepper shaker, pepper specks drift, Affan sneezes a spray of droplets;
//    a tissue, and soap bubbles for washing hands;
//  - the "dalam hidung" (inside the nose) imagination world: a pink tunnel
//    seen through the nostril, nose hairs near the entrance, a shiny mucus
//    layer deeper in, dim lungs glow far away, and intruders (dust, pepper,
//    cat hair, germs) that drift in and get caught;
//  - the Episode 031 mind stage (the friendly brain) with a big red
//    "sneeze button" on a pedestal and a red alarm glow;
//  - a bright "studio" with a tape on the floor (0 to 3 metres), Affan and
//    Kakak, droplet and germ clouds, and air streams for the big sneeze;
//  - the branded outro stage from Episode 005.
import * as THREE from 'three';
import { rng } from '../../shared/core.js';
import { makeAffan } from '../../shared/affan.js';
import { add, glow, glowTex } from '../../shared/props.js';
import { buildOutro, RoundedBoxGeometry } from '../005-bulan-ikut-kereta/worlds.js';
import { buildMindStage, BRAIN, makeKakak } from '../031-geletek-diri-sendiri/worlds.js';
import { buildKitchen, ISLAND, ISLAND_TOP, BOARD, MAMA_POS, AFF_POS, FRIDGE } from '../038-bawang-menangis/worlds.js';

export { buildOutro, BRAIN, ISLAND, ISLAND_TOP, BOARD, MAMA_POS, AFF_POS, FRIDGE };

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
      void main(){ gl_FragColor = vec4(mix(bot, top, smoothstep(-0.3, 0.7, vP.y)), 1.0);
        #include <colorspace_fragment>
      }`,
  });
  const m = new THREE.Mesh(new THREE.SphereGeometry(200, 32, 16), mat);
  m.renderOrder = -10;
  return m;
}
function sprites(scene, n, color, opacity = 0.85, add_ = false) {
  const mat = new THREE.SpriteMaterial({ map: glowTex, color, transparent: true, opacity, depthWrite: false, blending: add_ ? THREE.AdditiveBlending : THREE.NormalBlending });
  return Array.from({ length: n }, () => {
    const s = new THREE.Sprite(mat.clone());
    s.visible = false;
    s.renderOrder = 8;
    scene.add(s);
    return s;
  });
}
// a cartoon germ (green / purple blob with eyes and little spikes)
export function makeGerm(i = 0, r = 0.12) {
  const gg = new THREE.Group();
  const body = add(gg, new THREE.IcosahedronGeometry(r, 2), std(i % 2 ? 0x7ad83a : 0xa05ae0, 0.5, { emissive: i % 2 ? 0x1a4a08 : 0x2a1050, emissiveIntensity: 0.4 }), [0, 0, 0]);
  for (const s of [-1, 1]) {
    add(gg, new THREE.SphereGeometry(r * 0.3, 10, 8), std(0xffffff, 0.3), [r * 0.38 * s, r * 0.25, r * 0.82], [0, 0, 0], [1, 1, 1], false);
    add(gg, new THREE.SphereGeometry(r * 0.15, 8, 6), new THREE.MeshBasicMaterial({ color: 0x101010 }), [r * 0.38 * s, r * 0.25, r * 1.08], [0, 0, 0], [1, 1, 1], false);
  }
  for (let k = 0; k < 6; k++) add(gg, new THREE.ConeGeometry(r * 0.2, r * 0.66, 6), body.material, [Math.cos(k) * r, Math.sin(k) * r, 0], [0, 0, k - Math.PI / 2], [1, 1, 1], false);
  gg.visible = false;
  return gg;
}

// ----------------------------------------------------------------- kitchen
export function buildKitchenS() {
  const k = buildKitchen();
  const s = k.scene;
  k.knife.visible = false;
  k.onion.visible = false;
  k.pieces.forEach((p) => (p.visible = false));
  k.tears.forEach((d) => (d.visible = false));
  k.coldOnion.visible = false;
  // a pan of soup on the island (what Mama is peppering)
  const pan = new THREE.Group();
  pan.position.set(BOARD.x, ISLAND_TOP, BOARD.z);
  s.add(pan);
  add(pan, new THREE.CylinderGeometry(0.42, 0.36, 0.22, 32, 1, true), std(0xd04a3a, 0.4, { side: THREE.DoubleSide }), [0, 0.11, 0]);
  add(pan, new THREE.CylinderGeometry(0.36, 0.36, 0.02, 32), std(0xd04a3a, 0.4), [0, 0.01, 0]);
  add(pan, new THREE.CylinderGeometry(0.4, 0.4, 0.02, 32), std(0xf0b04a, 0.3, { emissive: 0x5a2a00, emissiveIntensity: 0.2 }), [0, 0.18, 0]);
  add(pan, new THREE.CylinderGeometry(0.03, 0.03, 0.5, 8), std(0x2a2a2a, 0.5), [0.62, 0.17, 0], [0, 0, Math.PI / 2]);
  // pepper shaker
  const shaker = new THREE.Group();
  s.add(shaker);
  add(shaker, new THREE.CylinderGeometry(0.075, 0.085, 0.24, 20), new THREE.MeshPhysicalMaterial({ color: 0xe8f0f8, roughness: 0.1, transparent: true, opacity: 0.6 }), [0, 0, 0]);
  add(shaker, new THREE.CylinderGeometry(0.07, 0.08, 0.17, 20), std(0x2a2420, 0.9), [0, -0.03, 0]);
  add(shaker, new THREE.SphereGeometry(0.08, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), std(0xd8dde6, 0.2, { metalness: 0.8 }), [0, 0.12, 0]);
  // pepper specks
  const pepperMat = std(0x2a1e14, 0.9);
  const pepper = Array.from({ length: 40 }, (_, i) => {
    const m = add(s, new THREE.DodecahedronGeometry(0.012 + (i % 3) * 0.004, 0), pepperMat, [0, 0, 0], [0, 0, 0], [1, 1, 1], false);
    m.visible = false;
    return m;
  });
  // sneeze spray (droplets) and germs
  const spray = sprites(s, 70, 0xbfe6ff, 0.8);
  const germs = Array.from({ length: 6 }, (_, i) => {
    const g = makeGerm(i, 0.05);
    s.add(g);
    return g;
  });
  // tissue box and a tissue
  const box = add(s, new RoundedBoxGeometry(0.42, 0.2, 0.26, 2, 0.03), std(0x7ad0ff, 0.6), [0.9, ISLAND_TOP + 0.1, -0.75]);
  add(s, new THREE.PlaneGeometry(0.16, 0.16, 4, 4), std(0xffffff, 0.9, { side: THREE.DoubleSide }), [0.9, ISLAND_TOP + 0.27, -0.75], [0.3, 0, 0.2]);
  const tissue = add(s, new THREE.SphereGeometry(0.12, 16, 12), std(0xffffff, 0.95), [0, 0, 0], [0, 0, 0], [1.2, 1, 0.6]);
  tissue.visible = false;
  // soap bubbles
  const bubbles = Array.from({ length: 14 }, () => {
    const m = add(s, new THREE.SphereGeometry(0.05, 14, 10), new THREE.MeshPhysicalMaterial({ color: 0xe8f6ff, roughness: 0.05, transparent: true, opacity: 0.55, clearcoat: 1, iridescence: 1 }), [0, 0, 0], [0, 0, 0], [1, 1, 1], false);
    m.visible = false;
    return m;
  });
  void box;
  return { ...k, pan, shaker, pepper, spray, germs, tissue, bubbles };
}

// ------------------------------------------------------------ inside the nose
export const TUN_R = 2.6;
export const NOSTRIL_Z = 4.0;
export function buildNose() {
  const scene = new THREE.Scene();
  const sky = gradientSky(0xffd8d0, 0xf0a8a0);
  scene.add(sky);
  scene.add(new THREE.HemisphereLight(0xfff0f0, 0x804040, 0.9));
  const lamp = new THREE.PointLight(0xfff2e8, 60, 40, 1.6);
  lamp.position.set(0.5, 1.2, 8);
  scene.add(lamp);
  const lamp2 = new THREE.PointLight(0xffd0d0, 30, 30, 1.6);
  lamp2.position.set(0, 0.5, -6);
  scene.add(lamp2);
  // the face wall around the nostril
  add(scene, new THREE.RingGeometry(TUN_R, 60, 64), std(0xe8a57c, 0.6, { emissive: 0x3a1608, emissiveIntensity: 0.2 }), [0, 0, NOSTRIL_Z], [0, 0, 0], [1, 1, 1], false);
  add(scene, new THREE.TorusGeometry(TUN_R, 0.35, 16, 64), std(0xe09a74, 0.6, { emissive: 0x3a1608, emissiveIntensity: 0.15 }), [0, 0, NOSTRIL_Z]);
  // the tunnel
  const L = 34;
  const tube = new THREE.CylinderGeometry(TUN_R * 0.75, TUN_R, L, 64, 24, true);
  tube.rotateX(Math.PI / 2);
  const wallMat = std(0xf08a90, 0.55, { side: THREE.BackSide, emissive: 0x5a1018, emissiveIntensity: 0.25 });
  add(scene, tube, wallMat, [0, 0, NOSTRIL_Z - L / 2], [0, 0, 0], [1, 1, 1], false).receiveShadow = false;
  // shiny mucus layer deeper in (bottom half)
  const mu = new THREE.CylinderGeometry(TUN_R * 0.8, TUN_R * 0.93, 16, 48, 1, true, Math.PI * 0.5, Math.PI);
  mu.rotateX(Math.PI / 2);
  const mucusMat = new THREE.MeshPhysicalMaterial({ color: 0xd8ef8a, roughness: 0.05, clearcoat: 1, transparent: true, opacity: 0.6, side: THREE.DoubleSide, emissive: 0x3a4a08, emissiveIntensity: 0.2, depthWrite: false });
  const mucus = add(scene, mu, mucusMat, [0, 0, -6.5], [0, 0, Math.PI], [1, 1, 1], false);
  mucus.renderOrder = 3;
  const R = rng(41);
  const blobs = [];
  for (let i = 0; i < 18; i++) {
    const a = Math.PI * (1.1 + R() * 0.8);
    const z = -1.5 - R() * 10;
    const r = TUN_R * lerpR(0.93, 0.8, (NOSTRIL_Z - z) / L) - 0.15;
    blobs.push(add(scene, new THREE.SphereGeometry(0.18 + R() * 0.2, 16, 12), mucusMat, [Math.cos(a) * r, Math.sin(a) * r, z], [0, 0, 0], [1, 0.5, 1.4], false));
  }
  // nose hairs near the entrance, pointing to the middle
  const hairMat = std(0x3a2418, 0.7);
  const hairs = [];
  for (let i = 0; i < 70; i++) {
    const a = (i / 70) * Math.PI * 2 * 3 + R() * 0.4;
    const z = NOSTRIL_Z - 0.4 - R() * 3.6;
    const r = TUN_R * lerpR(1, 0.75, (NOSTRIL_Z - z) / L) - 0.02;
    const len = 0.6 + R() * 0.7;
    const g = new THREE.Group();
    g.position.set(Math.cos(a) * r, Math.sin(a) * r, z);
    // point inwards (towards the axis) and a little deeper
    const inward = V3(-Math.cos(a), -Math.sin(a), -0.35).normalize();
    g.quaternion.setFromUnitVectors(V3(0, 1, 0), inward);
    scene.add(g);
    const h = add(g, new THREE.CylinderGeometry(0.008, 0.035, len, 6), hairMat, [0, len / 2, 0], [0, 0, 0], [1, 1, 1], false);
    void h;
    hairs.push({ g, q0: g.quaternion.clone(), a, z, len, ph: R() * 6 });
  }
  // tiny cilia carpet deeper in
  const cil = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.01, 0.02, 0.22, 4), std(0xffc0c8, 0.6), 400);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion();
  const ciliaData = [];
  for (let i = 0; i < 400; i++) {
    const a = R() * Math.PI * 2;
    const z = -0.5 - R() * 14;
    const r = TUN_R * lerpR(1, 0.75, (NOSTRIL_Z - z) / L) - 0.05;
    const pos = V3(Math.cos(a) * r, Math.sin(a) * r, z);
    q.setFromUnitVectors(V3(0, 1, 0), V3(-Math.cos(a), -Math.sin(a), 0));
    m4.compose(pos, q, V3(1, 1, 1));
    cil.setMatrixAt(i, m4);
    ciliaData.push({ pos, a });
  }
  scene.add(cil);
  // far glow (towards the lungs)
  const far = glow(0xffb0c0, 5, 0.6);
  far.position.set(0, 0, -26);
  scene.add(far);
  // intruders: dust (grey fuzz), pepper (dark specks), cat hair (orange strands), germs
  const fuzz = std(0xa8a8b0, 0.95, { flatShading: true });
  const dust = Array.from({ length: 10 }, () => {
    const g = new THREE.Group();
    add(g, new THREE.IcosahedronGeometry(0.16, 0), fuzz, [0, 0, 0], [0, 0, 0], [1, 1, 1], false);
    for (let k = 0; k < 6; k++) add(g, new THREE.IcosahedronGeometry(0.08, 0), fuzz, [(R() - 0.5) * 0.25, (R() - 0.5) * 0.25, (R() - 0.5) * 0.25], [0, 0, 0], [1, 1, 1], false);
    g.visible = false;
    scene.add(g);
    return g;
  });
  const pepperMat = std(0x2a1e14, 0.9, { flatShading: true });
  const pepper = Array.from({ length: 10 }, () => {
    const m = add(scene, new THREE.DodecahedronGeometry(0.1, 0), pepperMat, [0, 0, 0], [0, 0, 0], [1, 1, 1], false);
    m.visible = false;
    return m;
  });
  const hairOrange = std(0xf0a040, 0.6);
  const catHair = Array.from({ length: 6 }, (_, i) => {
    const c = new THREE.CatmullRomCurve3([V3(-0.5, 0, 0), V3(-0.15, 0.12, 0.05), V3(0.2, -0.05, 0), V3(0.55, 0.1, -0.05)]);
    const m = add(scene, new THREE.TubeGeometry(c, 20, 0.025, 6), hairOrange, [0, 0, 0], [0, 0, i], [1, 1, 1], false);
    m.visible = false;
    return m;
  });
  const germs = Array.from({ length: 8 }, (_, i) => {
    const g = makeGerm(i, 0.18);
    scene.add(g);
    return g;
  });
  // a nerve along the wall (lights up when the hairs are tickled)
  const nc = new THREE.CatmullRomCurve3([V3(1.9, 1.6, 3.4), V3(2.0, 1.5, 1.5), V3(1.8, 1.6, -1), V3(1.5, 1.7, -5), V3(1.2, 1.8, -12)]);
  const nerveMat = std(0xffe04a, 0.4, { emissive: 0xffb000, emissiveIntensity: 0.2 });
  add(scene, new THREE.TubeGeometry(nc, 60, 0.06, 8), nerveMat, [0, 0, 0], [0, 0, 0], [1, 1, 1], false);
  const sig = sprites(scene, 10, 0xfff27a, 1, true);
  return { scene, sky, hairs, cil, ciliaData, mucus, blobs, dust, pepper, catHair, germs, nerve: nc, nerveMat, sig, far };
}
function lerpR(a, b, k) {
  return a + (b - a) * Math.min(1, Math.max(0, k));
}

// ------------------------------------------------------- mind stage + button
export const BUTTON = V3(3.1, 0, 1.4);
export function buildMind() {
  const w = buildMindStage();
  w.kak.root.visible = false;
  w.guard.group.visible = false;
  w.ring.visible = false;
  const s = w.scene;
  const btn = new THREE.Group();
  btn.position.copy(BUTTON);
  s.add(btn);
  add(btn, new THREE.CylinderGeometry(0.55, 0.7, 1.3, 32), std(0xf4f4f8, 0.5), [0, 0.65, 0]);
  add(btn, new THREE.CylinderGeometry(0.62, 0.62, 0.12, 32), std(0xffd84a, 0.4), [0, 1.36, 0]);
  const cap = add(btn, new THREE.SphereGeometry(0.48, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), std(0xff3a3a, 0.3, { emissive: 0x8a0000, emissiveIntensity: 0.4 }), [0, 1.4, 0]);
  const alarm = glow(0xff2a2a, 9, 0);
  alarm.position.copy(BRAIN);
  s.add(alarm);
  const btnGlow = glow(0xff5a5a, 3.5, 0);
  btnGlow.position.copy(BUTTON).add(V3(0, 1.6, 0.3));
  s.add(btnGlow);
  return { ...w, btn, cap, alarm, btnGlow };
}

// ------------------------------------------------------------------ studio
export const M = 2.0; // units per metre on the tape (Affan ~1.1 m tall)
export const TAPE_X0 = -4.2;
export const A_ST = V3(-4.8, 0, 0.6);
export const K_ST = V3(TAPE_X0 + 2 * M + 0.7, 0, 0.6);
export const ST_S = 0.6;
export function buildStudio() {
  const scene = new THREE.Scene();
  const sky = gradientSky(0x9fd8ff, 0xfff4e0);
  scene.add(sky);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x9a8a70, 1.3));
  const key = new THREE.DirectionalLight(0xfff4e8, 1.8);
  key.position.set(2, 10, 9);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -10, right: 10, top: 8, bottom: -4, near: 1, far: 40 });
  scene.add(key, key.target);
  const floor = add(scene, new THREE.CylinderGeometry(11, 11.4, 0.4, 72), std(0xf6efe2, 0.9), [0, -0.2, 0]);
  floor.receiveShadow = true;
  add(scene, new THREE.TorusGeometry(11.1, 0.1, 8, 96), new THREE.MeshBasicMaterial({ color: 0xffd84a }), [0, 0, 0], [Math.PI / 2, 0, 0], [1, 1, 1], false);
  // measuring tape on the floor: 0..3 m
  const tapeTex = (() => {
    const c = document.createElement('canvas');
    c.width = 2048;
    c.height = 128;
    const g = c.getContext('2d');
    g.fillStyle = '#ffd84a';
    g.fillRect(0, 0, 2048, 128);
    g.fillStyle = '#17256b';
    for (let i = 0; i <= 30; i++) {
      const x = 40 + (i / 30) * 1968;
      g.fillRect(x - 3, 0, 6, i % 10 === 0 ? 80 : i % 5 === 0 ? 56 : 36);
    }
    g.font = '800 54px "Baloo 2", sans-serif';
    g.textAlign = 'center';
    for (let i = 0; i <= 3; i++) g.fillText(i + ' m', Math.min(1990, Math.max(70, 40 + (i / 3) * 1968)), 122);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  })();
  const tapeLen = 3 * M * (2048 / 1968);
  add(scene, new THREE.PlaneGeometry(tapeLen, 0.5), std(0xffffff, 0.6, { map: tapeTex }), [TAPE_X0 + 3 * M / 2, 0.012, 1.8], [-Math.PI / 2, 0, 0], [1, 1, 1], false).receiveShadow = true;
  const aff = makeAffan();
  aff.root.scale.setScalar(ST_S);
  scene.add(aff.root);
  const kak = makeKakak();
  kak.root.scale.setScalar(ST_S * 1.12);
  scene.add(kak.root);
  const spray = sprites(scene, 120, 0x7cc4ff, 0.9);
  const air = sprites(scene, 40, 0x8fc8ff, 0.8);
  const dust = Array.from({ length: 10 }, () => {
    const m = add(scene, new THREE.IcosahedronGeometry(0.07, 0), std(0x9a9aa4, 0.9, { flatShading: true }), [0, 0, 0], [0, 0, 0], [1, 1, 1], false);
    m.visible = false;
    return m;
  });
  const germs = Array.from({ length: 10 }, (_, i) => {
    const g = makeGerm(i, 0.11);
    scene.add(g);
    return g;
  });
  return { scene, sky, aff, kak, spray, air, dust, germs };
}
