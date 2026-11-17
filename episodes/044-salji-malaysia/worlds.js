// Episode 044 sets:
//  - the Episode 036 playground on a hot sunny day; setSnow(k) turns it into
//    an imagined snowy day (white ground, frosted leaves, falling snow, a
//    snowman wearing a songkok);
//  - a cold cloud: water droplets that freeze into six-armed snow crystals,
//    and one big snowflake;
//  - the globe: Earth with a red equator line, polar ice caps, a Malaysia pin,
//    and parallel sunbeams (straight down on the equator, slanted at the poles);
//  - Gunung Kinabalu: a big jagged mountain, forest at the bottom, grey rock
//    and a thin sparkle of ice at the top, little Affan at the foot;
//  - snowy Malaysia: a padi field, rainforest trees and a kampung house under
//    snow (they can wilt), a shivering orang utan beside a happy polar bear,
//    a slippery road with a skidding car, and Affan in a beanie and scarf;
//  - the branded outro stage from Episode 005.
import * as THREE from 'three';
import { rng } from '../../shared/core.js';
import { makeAffan } from '../../shared/affan.js';
import { add, glow, glowTex, makeSky, makeStars, makeTree, makeHouse, makeCar } from '../../shared/props.js';
import { buildOutro, RoundedBoxGeometry } from '../005-bulan-ikut-kereta/worlds.js';
import { buildPlayground, PLAY_SCALE } from '../036-pening-berpusing/worlds.js';

export { buildOutro, PLAY_SCALE };

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
const ICE = () => std(0xeaf6ff, 0.2, { emissive: 0x6aa8e8, emissiveIntensity: 0.35, metalness: 0.1 });

// a six-armed snow crystal in its xy plane, radius ~1
export function makeFlake(mat = ICE()) {
  const g = new THREE.Group();
  add(g, new THREE.CylinderGeometry(0.18, 0.18, 0.06, 6), mat, [0, 0, 0], [Math.PI / 2, 0, 0], [1, 1, 1], false);
  for (let i = 0; i < 6; i++) {
    const arm = new THREE.Group();
    arm.rotation.z = (i / 6) * Math.PI * 2;
    g.add(arm);
    add(arm, new THREE.BoxGeometry(0.08, 1.0, 0.05), mat, [0, 0.5, 0], [0, 0, 0], [1, 1, 1], false);
    for (const [y, L] of [[0.45, 0.32], [0.72, 0.22]]) for (const s of [-1, 1]) add(arm, new THREE.BoxGeometry(0.06, L, 0.04), mat, [s * L * 0.35, y + L * 0.3, 0], [0, 0, -s * 0.9], [1, 1, 1], false);
    add(arm, new THREE.OctahedronGeometry(0.07, 0), mat, [0, 1.02, 0], [0, 0, 0], [1, 1, 1], false);
  }
  return g;
}
function snowfall(scene, n = 260, area = 30, color = 0xffffff) {
  const mat = new THREE.SpriteMaterial({ map: glowTex, color, transparent: true, opacity: 0.95, depthWrite: false });
  const R = rng(440);
  const flakes = Array.from({ length: n }, () => {
    const s = new THREE.Sprite(mat);
    s.userData = { x: (R() - 0.5) * area, z: (R() - 0.5) * area, ph: R(), sp: 0.6 + R() * 0.6, sz: 0.08 + R() * 0.1 };
    s.visible = false;
    scene.add(s);
    return s;
  });
  return { mat, flakes };
}
export function setSnowfall(sf, t, k, center = V3(0, 0, 0), top = 9) {
  sf.flakes.forEach((s) => {
    const d = s.userData;
    s.visible = k > 0.01;
    if (!s.visible) return;
    const u = (t * d.sp * 0.18 + d.ph) % 1;
    s.position.set(center.x + d.x + 0.4 * Math.sin(t * 1.3 + d.ph * 9), center.y + top * (1 - u), center.z + d.z);
    s.scale.setScalar(d.sz * 2.4);
  });
  sf.mat.opacity = 0.95 * k;
}
function makeSnowman() {
  const g = new THREE.Group();
  const snow = std(0xffffff, 0.8, { emissive: 0x8aa8d0, emissiveIntensity: 0.15 });
  add(g, new THREE.SphereGeometry(0.6, 24, 16), snow, [0, 0.55, 0]);
  add(g, new THREE.SphereGeometry(0.44, 24, 16), snow, [0, 1.35, 0]);
  add(g, new THREE.SphereGeometry(0.32, 24, 16), snow, [0, 1.95, 0]);
  // songkok (black velvet cap)
  add(g, new THREE.CylinderGeometry(0.24, 0.26, 0.22, 24), std(0x18181e, 0.7), [0, 2.3, 0]);
  for (const s of [-1, 1]) add(g, new THREE.SphereGeometry(0.04, 10, 8), new THREE.MeshBasicMaterial({ color: 0x101010 }), [0.1 * s, 2.0, 0.29], [0, 0, 0], [1, 1, 1], false);
  add(g, new THREE.ConeGeometry(0.05, 0.3, 12), std(0xff8a2a, 0.5), [0, 1.93, 0.42], [Math.PI / 2, 0, 0]);
  for (let i = 0; i < 3; i++) add(g, new THREE.SphereGeometry(0.04, 10, 8), new THREE.MeshBasicMaterial({ color: 0x101010 }), [0, 1.2 + i * 0.16, 0.43 - Math.abs(i - 1) * 0.02], [0, 0, 0], [1, 1, 1], false);
  add(g, new THREE.TorusGeometry(0.33, 0.06, 8, 24), std(0xd83a3a, 0.6), [0, 1.66, 0], [Math.PI / 2, 0, 0]);
  for (const s of [-1, 1]) add(g, new THREE.CylinderGeometry(0.025, 0.025, 0.8, 6), std(0x6b4a32, 0.8), [0.6 * s, 1.45, 0], [0, 0, s * 1.0]);
  return g;
}
// winter gear for Affan: beanie and scarf (parented to the head / torso)
function dressWinter(aff) {
  const beanie = new THREE.Group();
  aff.parts.head.add(beanie);
  add(beanie, new THREE.SphereGeometry(0.98, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), std(0xd83a5a, 0.8), [0, 0.5, -0.06], [1, 0.8, 0.97]);
  add(beanie, new THREE.TorusGeometry(0.92, 0.11, 10, 40), std(0xffffff, 0.8), [0, 0.52, -0.06], [Math.PI / 2 - 0.12, 0, 0], [1, 0.97, 1]);
  add(beanie, new THREE.SphereGeometry(0.2, 16, 12), std(0xffffff, 0.9), [0, 1.3, -0.06]);
  const scarf = add(aff.parts.torso, new THREE.TorusGeometry(0.34, 0.11, 10, 28), std(0x3a8cff, 0.8), [0, 1.18, 0.02], [Math.PI / 2, 0, 0]);
  const tail = add(aff.parts.torso, new RoundedBoxGeometry(0.16, 0.5, 0.06, 2, 0.03), std(0x3a8cff, 0.8), [0.15, 0.95, 0.36], [0.1, 0, 0.1]);
  const set = (on) => (beanie.visible = scarf.visible = tail.visible = on);
  set(false);
  return set;
}

// ------------------------------------------------------------------- park
export const A_PK = V3(1.6, 0, 4.2);
export function buildPark() {
  const w = buildPlayground();
  const s = w.scene;
  // clear bushes and trees out of the way between the camera and Affan
  s.children.forEach((c) => {
    if (c.isGroup && c !== w.aff.root && c !== w.mgr && c !== w.bench && c.position.z > A_PK.z - 2.5 && Math.abs(c.position.x - A_PK.x) < 7) c.visible = false;
  });
  // remember green leaf materials so they can frost over
  const greens = [];
  s.traverse((o) => {
    if (o.isMesh && o.material && o.material.color && !greens.find((g) => g.m === o.material)) {
      const c = o.material.color;
      if (c.g > c.r * 1.15 && c.g > c.b * 1.1) greens.push({ m: o.material, c0: c.clone() });
    }
  });
  const snowGround = add(s, new THREE.CircleGeometry(60, 64), std(0xf6faff, 0.9, { transparent: true, opacity: 0 }), [0, 0.08, 0], [-Math.PI / 2, 0, 0], [1, 1, 1], false);
  snowGround.receiveShadow = true;
  const snowman = makeSnowman();
  snowman.position.set(A_PK.x - 1.7, 0, A_PK.z - 0.6);
  snowman.rotation.y = 0.4;
  s.add(snowman);
  const sf = snowfall(s, 280, 26);
  const sweat = Array.from({ length: 3 }, () => {
    const d = add(s, new THREE.SphereGeometry(0.04, 12, 10), std(0x9fdcff, 0.05, { transparent: true, opacity: 0.9 }), [0, 0, 0], [0, 0, 0], [1, 1.4, 1], false);
    d.visible = false;
    return d;
  });
  const winter = dressWinter(w.aff);
  const WHITE = new THREE.Color(0xf2f7ff);
  const fogC0 = s.fog.color.clone();
  const setSnow = (t, k) => {
    greens.forEach((g) => g.m.color.copy(g.c0).lerp(WHITE, 0.75 * k));
    snowGround.material.opacity = 0.95 * k;
    snowGround.visible = k > 0.01;
    snowman.visible = k > 0.02;
    snowman.scale.setScalar(Math.max(0.001, easeOutQ(k)));
    s.fog.color.copy(fogC0).lerp(WHITE, k);
    w.sky.material.uniforms.horizon.value.setHex(0xffe6c4).lerp(new THREE.Color(0xe8f0ff), k);
    w.sky.material.uniforms.top.value.setHex(0x3d86e0).lerp(new THREE.Color(0x9ab0d0), k);
    w.sky.material.uniforms.mid.value.setHex(0x7db8f4).lerp(new THREE.Color(0xc8d6ea), k);
    w.sun.intensity = 2.6 - 1.2 * k;
    setSnowfall(sf, t, k, V3(A_PK.x, 0, A_PK.z - 4), 9);
  };
  setSnow(0, 0);
  w.aff.root.scale.setScalar(PLAY_SCALE);
  return { ...w, snowman, setSnow, sweat, winter };
}
const easeOutQ = (k) => 1 - (1 - k) * (1 - k);

// ------------------------------------------------------------ cold cloud
export function buildCloud() {
  const scene = new THREE.Scene();
  const sky = gradientSky(0x2a4a8a, 0x8ab0e0);
  scene.add(sky);
  scene.add(new THREE.HemisphereLight(0xe8f4ff, 0x4a6aa0, 1.3));
  const key = new THREE.DirectionalLight(0xffffff, 1.4);
  key.position.set(-3, 8, 8);
  scene.add(key);
  const R = rng(441);
  const puff = std(0xdfe8f6, 0.95, { emissive: 0x4a6a9a, emissiveIntensity: 0.25, transparent: true, opacity: 0.85 });
  for (let i = 0; i < 40; i++) {
    const a = R() * Math.PI * 2, r = 5 + R() * 12;
    add(scene, new THREE.SphereGeometry(1.4 + R() * 2.2, 16, 12), puff, [Math.cos(a) * r, (R() - 0.5) * 14, -6 - R() * 12], [0, 0, 0], [1, 0.7, 1], false);
  }
  // water droplets that freeze into crystals
  const iceMat = ICE();
  const drops = Array.from({ length: 16 }, (_, i) => {
    const g = new THREE.Group();
    const d = add(g, new THREE.SphereGeometry(0.18, 18, 14), new THREE.MeshPhysicalMaterial({ color: 0x7ac8ff, roughness: 0.05, transparent: true, opacity: 0.85, clearcoat: 1 }), [0, 0, 0], [0, 0, 0], [1, 1, 1], false);
    const f = makeFlake(iceMat);
    f.scale.setScalar(0.001);
    g.add(f);
    g.position.set((R() - 0.5) * 6.5, (R() - 0.5) * 9 + 0.5, (R() - 0.5) * 3);
    g.userData = { ph: R() * 6, rot: R() * 2 - 1 };
    scene.add(g);
    return { g, d, f };
  });
  const big = makeFlake(iceMat);
  big.visible = false;
  scene.add(big);
  const bigGlow = glow(0xbfe4ff, 6, 0);
  scene.add(bigGlow);
  return { scene, sky, drops, big, bigGlow };
}

// ------------------------------------------------------------------ globe
export const EARTH_R = 3.0;
export const SUN_G = V3(-14, 0, 0);
export function buildGlobe() {
  const scene = new THREE.Scene();
  const sky = gradientSky(0x0a1030, 0x1a2a5a);
  const stars = makeStars(800, 150, 44);
  scene.add(sky, stars);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x2a3a6a, 0.9));
  const key = new THREE.DirectionalLight(0xfff4e0, 2.0);
  key.position.copy(SUN_G);
  scene.add(key);
  // stylised Earth texture (equirectangular): ocean, cartoon land, ice caps
  const tex = (() => {
    const c = document.createElement('canvas');
    c.width = 1024;
    c.height = 512;
    const g = c.getContext('2d');
    g.fillStyle = '#2f7bdf';
    g.fillRect(0, 0, 1024, 512);
    const R = rng(4400);
    g.fillStyle = '#4fbf5a';
    for (let i = 0; i < 26; i++) {
      const x = R() * 1024, y = 120 + R() * 280, r = 30 + R() * 70;
      g.beginPath();
      g.ellipse(x, y, r * 1.4, r, R() * 3, 0, Math.PI * 2);
      g.fill();
    }
    // Malaysia (little islands near the equator at the front, u≈0.25)
    g.fillStyle = '#3fae4a';
    g.beginPath();
    g.ellipse(250, 250, 16, 26, 0.4, 0, Math.PI * 2);
    g.fill();
    g.beginPath();
    g.ellipse(300, 248, 30, 18, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#ffffff';
    g.fillRect(0, 0, 1024, 46);
    g.fillRect(0, 466, 1024, 46);
    for (let x = 0; x < 1024; x += 40) {
      g.beginPath();
      g.arc(x + 20, 46, 22, 0, Math.PI);
      g.fill();
      g.beginPath();
      g.arc(x + 20, 466, 22, Math.PI, 0);
      g.fill();
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  })();
  const earth = new THREE.Group();
  scene.add(earth);
  add(earth, new THREE.SphereGeometry(EARTH_R, 64, 40), std(0xffffff, 0.7, { map: tex, emissive: 0x0a1a3a, emissiveIntensity: 0.25 }), [0, 0, 0]);
  add(earth, new THREE.TorusGeometry(EARTH_R * 1.004, 0.04, 8, 128), new THREE.MeshBasicMaterial({ color: 0xff3a3a }), [0, 0, 0], [Math.PI / 2, 0, 0], [1, 1, 1], false);
  // atmosphere
  earth.add(glow(0x8ac8ff, EARTH_R * 3.2, 0.35));
  // Malaysia pin (u≈0.25 of the texture faces +z after the default sphere mapping offset)
  const pin = new THREE.Group();
  earth.add(pin);
  add(pin, new THREE.ConeGeometry(0.09, 0.4, 12), std(0xff3a5a, 0.4), [0, 0.2, 0], [Math.PI, 0, 0]);
  add(pin, new THREE.SphereGeometry(0.13, 16, 12), std(0xff3a5a, 0.4), [0, 0.45, 0]);
  // the Sun and parallel beams
  const sun = new THREE.Group();
  sun.position.copy(SUN_G);
  scene.add(sun);
  add(sun, new THREE.SphereGeometry(2.2, 32, 20), new THREE.MeshBasicMaterial({ color: 0xffd23a }), [0, 0, 0], [0, 0, 0], [1, 1, 1], false);
  sun.add(glow(0xffc040, 14, 0.8));
  const rodGeo = new THREE.CylinderGeometry(1, 1, 1, 10, 1, true);
  rodGeo.translate(0, 0.5, 0);
  const beams = Array.from({ length: 3 }, () => {
    const m = new THREE.Mesh(rodGeo, new THREE.MeshBasicMaterial({ color: 0xfff0a0, transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending }));
    m.visible = false;
    m.renderOrder = 6;
    scene.add(m);
    return m;
  });
  return { scene, sky, stars, earth, pin, sun, beams };
}

// --------------------------------------------------------------- mountain
export const PEAK_Y = 9.2;
export function buildMountain() {
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xcfe0f4, 30, 90);
  const sky = makeSky({ top: 0x3d86e0, mid: 0x86bdf4, horizon: 0xeaf2ff, bottom: 0x6a9a5a });
  scene.add(sky);
  scene.add(new THREE.HemisphereLight(0xeaf4ff, 0x5a7a4a, 1.2));
  const key = new THREE.DirectionalLight(0xfff0d8, 2.0);
  key.position.set(8, 14, 10);
  scene.add(key);
  add(scene, new THREE.CircleGeometry(80, 48), std(0x5fae54, 0.95), [0, 0, 0], [-Math.PI / 2, 0, 0], [1, 1, 1], false);
  // jagged mountain: displaced cone with vertex colours (forest -> rock)
  const geo = new THREE.ConeGeometry(7.5, PEAK_Y, 48, 24, false);
  geo.translate(0, PEAK_Y / 2, 0);
  const p = geo.attributes.position;
  const colors = new Float32Array(p.count * 3);
  const forest = new THREE.Color(0x2f8a45), rock = new THREE.Color(0x8a8278), dark = new THREE.Color(0x5a554e);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const a = Math.atan2(z, x);
    const h = y / PEAK_Y;
    const n = Math.sin(a * 7) * 0.5 + Math.sin(a * 13 + 1) * 0.3 + Math.sin(a * 23 + 2) * 0.2;
    const r = 1 + 0.12 * n * (0.3 + h);
    let yy = y;
    if (h > 0.82) yy = y + Math.max(0, Math.sin(a * 5) * 0.9 + Math.sin(a * 11) * 0.4) * (h - 0.82) * 6;
    p.setXYZ(i, x * r, yy, z * r);
    const c = forest.clone().lerp(rock, clamp01((h - 0.45) / 0.25)).lerp(dark, clamp01((h - 0.85) / 0.15) * 0.4);
    colors.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  const mtn = add(scene, geo, std(0xffffff, 0.9, { vertexColors: true, flatShading: true }), [0, 0, -4]);
  // thin ice sparkles at the top
  const ice = [];
  const R = rng(4410);
  for (let i = 0; i < 26; i++) {
    const a = R() * Math.PI * 2, h = 0.86 + R() * 0.12;
    const rr = 7.5 * (1 - h) * 1.02;
    const m = add(scene, new THREE.SphereGeometry(0.12 + R() * 0.15, 10, 8), std(0xf4faff, 0.2, { emissive: 0x8ac8ff, emissiveIntensity: 0.5 }), [Math.cos(a) * rr, h * PEAK_Y + 0.1, Math.sin(a) * rr - 4], [0, 0, 0], [1.6, 0.4, 1.6], false);
    m.visible = false;
    ice.push(m);
  }
  const sparks = Array.from({ length: 10 }, () => {
    const s = glow(0xffffff, 0.5, 0);
    scene.add(s);
    return s;
  });
  // small forest trees at the foot
  for (let i = 0; i < 30; i++) {
    const a = R() * Math.PI * 2, r = 8 + R() * 10;
    const tr = makeTree(R, { scale: 0.9 + R() * 0.5, leaf: [0x2f8a45, 0x3f9a50, 0x267a3a], toy: true });
    tr.position.set(Math.cos(a) * r, 0, Math.sin(a) * r - 4);
    if (tr.position.z < -1 || Math.abs(tr.position.x) > 9) scene.add(tr);
  }
  const aff = makeAffan();
  aff.root.scale.setScalar(0.42);
  aff.root.position.set(2.6, 0, 5.6);
  scene.add(aff.root);
  void mtn;
  return { scene, sky, ice, sparks, aff };
}
const clamp01 = (x) => Math.min(1, Math.max(0, x));

// ------------------------------------------------------------ snowy Malaysia
export const SPOT = {
  padi: V3(-7, 0, 0),
  animals: V3(3, 0, 0),
  road: V3(13, 0, 0),
  affan: V3(22, 0, 0),
};
function makeOrangutan() {
  const g = new THREE.Group();
  const fur = std(0xc0602a, 0.9, { emissive: 0x3a1a08, emissiveIntensity: 0.2 });
  const face = std(0xe0a070, 0.6);
  add(g, new THREE.SphereGeometry(0.7, 24, 18), fur, [0, 1.1, 0], [0, 0, 0], [1, 1.1, 0.9]);
  add(g, new THREE.SphereGeometry(0.48, 24, 18), fur, [0, 2.1, 0.05]);
  add(g, new THREE.SphereGeometry(0.34, 20, 14), face, [0, 2.0, 0.34], [0, 0, 0], [1.1, 1, 0.6]);
  for (const s of [-1, 1]) {
    add(g, new THREE.SphereGeometry(0.07, 10, 8), std(0xffffff, 0.3), [0.12 * s, 2.12, 0.52], [0, 0, 0], [1, 1, 1], false);
    add(g, new THREE.SphereGeometry(0.04, 8, 6), new THREE.MeshBasicMaterial({ color: 0x101010 }), [0.12 * s, 2.12, 0.58], [0, 0, 0], [1, 1, 1], false);
    add(g, new THREE.CapsuleGeometry(0.16, 1.3, 6, 12), fur, [0.75 * s, 1.0, 0.15], [0.3, 0, s * 0.35]);
    add(g, new THREE.CapsuleGeometry(0.17, 0.4, 6, 12), fur, [0.32 * s, 0.35, 0.05]);
  }
  const mouth = add(g, new THREE.TorusGeometry(0.1, 0.025, 6, 12, Math.PI), new THREE.MeshBasicMaterial({ color: 0x3a1a10 }), [0, 1.86, 0.55], [0, 0, 0], [1, 1, 1], false);
  void mouth;
  return g;
}
function makePolarBear() {
  const g = new THREE.Group();
  const fur = std(0xf6f8ff, 0.9, { emissive: 0x6a7a9a, emissiveIntensity: 0.12 });
  add(g, new THREE.CapsuleGeometry(0.75, 1.5, 8, 20), fur, [0, 1.1, 0], [Math.PI / 2, 0, 0]);
  add(g, new THREE.SphereGeometry(0.55, 24, 18), fur, [0, 1.5, 1.3]);
  add(g, new THREE.SphereGeometry(0.3, 18, 14), fur, [0, 1.38, 1.75], [0, 0, 0], [1, 0.8, 1]);
  add(g, new THREE.SphereGeometry(0.09, 10, 8), new THREE.MeshBasicMaterial({ color: 0x101010 }), [0, 1.45, 2.02], [0, 0, 0], [1, 1, 1], false);
  for (const s of [-1, 1]) {
    add(g, new THREE.SphereGeometry(0.06, 10, 8), new THREE.MeshBasicMaterial({ color: 0x101010 }), [0.2 * s, 1.7, 1.72], [0, 0, 0], [1, 1, 1], false);
    add(g, new THREE.SphereGeometry(0.14, 12, 10), fur, [0.36 * s, 1.98, 1.2]);
    for (const z of [0.7, -0.7]) add(g, new THREE.CylinderGeometry(0.24, 0.26, 0.8, 14), fur, [0.45 * s, 0.4, z]);
  }
  add(g, new THREE.TorusGeometry(0.12, 0.025, 6, 12, Math.PI), new THREE.MeshBasicMaterial({ color: 0x101010 }), [0, 1.28, 1.98], [0, 0, Math.PI], [1, 1, 1], false);
  return g;
}
export function buildSnowLand() {
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xe8f0fa, 25, 80);
  const sky = makeSky({ top: 0x8aa0c8, mid: 0xbfcde4, horizon: 0xeef4fc, bottom: 0xdfe8f4 });
  scene.add(sky);
  scene.add(new THREE.HemisphereLight(0xf4f8ff, 0x9aa8c0, 1.4));
  const key = new THREE.DirectionalLight(0xfff8f0, 1.4);
  key.position.set(4, 10, 8);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -30, right: 30, top: 12, bottom: -12, near: 1, far: 60 });
  scene.add(key, key.target);
  const ground = add(scene, new THREE.PlaneGeometry(200, 120), std(0xf6faff, 0.9, { emissive: 0x8aa0c0, emissiveIntensity: 0.12 }), [8, 0, 0], [-Math.PI / 2, 0, 0], [1, 1, 1], false);
  ground.receiveShadow = true;
  const R = rng(4420);
  // padi field (rows of blades) with a frosted look; wilt() browns and droops them
  const padi = new THREE.Group();
  padi.position.copy(SPOT.padi);
  scene.add(padi);
  const bladeGeo = new THREE.ConeGeometry(0.05, 0.9, 4);
  bladeGeo.translate(0, 0.45, 0);
  const padiMat = std(0x6ad84a, 0.7);
  const blades = [];
  for (let r = 0; r < 7; r++) for (let c = 0; c < 9; c++) {
    const g = new THREE.Group();
    g.position.set(-3.2 + c * 0.8 + (R() - 0.5) * 0.15, 0, -1.5 + r * 0.7);
    padi.add(g);
    for (let k = 0; k < 4; k++) {
      const b = add(g, bladeGeo, padiMat, [0, 0, 0], [(R() - 0.5) * 0.4, R() * 3, (R() - 0.5) * 0.4], [1, 0.8 + R() * 0.5, 1]);
      blades.push(b);
    }
  }
  // rainforest trees behind the padi (they turn brown too)
  const treeMats = [];
  for (let i = 0; i < 9; i++) {
    const tr = makeTree(R, { scale: 1.6 + R() * 0.8, leaf: [0x2f8a45, 0x3f9a50, 0x267a3a], toy: true });
    tr.position.set(SPOT.padi.x - 5 + i * 1.6, 0, -5 - R() * 3);
    scene.add(tr);
    tr.traverse((o) => {
      if (o.isMesh && o.material.color.g > o.material.color.r * 1.2) treeMats.push({ m: o.material, c0: o.material.color.clone() });
    });
    // snow on top
    add(tr, new THREE.SphereGeometry(1.2, 16, 10, 0, Math.PI * 2, 0, Math.PI / 3), std(0xffffff, 0.8), [0, 3.5 + R() * 0.4, 0], [0, 0, 0], [1.3, 0.6, 1.3], false);
  }
  const house = makeHouse(R, { scale: 0.6, toy: true });
  house.position.set(SPOT.padi.x + 5.5, 0, -4);
  scene.add(house);
  add(house, new THREE.BoxGeometry(4.2, 0.2, 3.6), std(0xffffff, 0.8), [0, 3.0, 0], [0, 0, 0], [1, 1, 1], false);
  const BROWN = new THREE.Color(0x8a6a3a);
  const wilt = (k) => {
    padiMat.color.setHex(0x6ad84a).lerp(BROWN, k);
    blades.forEach((b, i) => (b.rotation.z = (i % 2 ? 1 : -1) * 1.0 * k));
    treeMats.forEach((t) => t.m.color.copy(t.c0).lerp(BROWN, 0.8 * k));
  };
  // animals
  const ou = makeOrangutan();
  ou.position.copy(SPOT.animals).add(V3(-1.6, 0, 0.5));
  ou.rotation.y = 0.3;
  scene.add(ou);
  const bear = makePolarBear();
  bear.position.copy(SPOT.animals).add(V3(1.9, 0, -0.6));
  bear.rotation.y = -0.9;
  scene.add(bear);
  // road with a car
  const road = add(scene, new THREE.PlaneGeometry(4, 40), std(0xd8e0ea, 0.15, { metalness: 0.2 }), [SPOT.road.x, 0.02, 0], [-Math.PI / 2, 0, 0], [1, 1, 1], false);
  road.receiveShadow = true;
  for (let i = 0; i < 8; i++) add(scene, new THREE.PlaneGeometry(0.2, 1.6), std(0xffffff, 0.5), [SPOT.road.x, 0.03, -16 + i * 4.5], [-Math.PI / 2, 0, 0], [1, 1, 1], false);
  const car = makeCar({ color: 0xffbf3f, accent: 0xff7a45 });
  car.scale.setScalar(0.45);
  scene.add(car);
  // Affan in winter gear
  const aff = makeAffan();
  aff.root.scale.setScalar(0.6);
  aff.root.position.copy(SPOT.affan);
  scene.add(aff.root);
  const winter = dressWinter(aff);
  winter(true);
  const breath = Array.from({ length: 6 }, () => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xffffff, transparent: true, opacity: 0.6, depthWrite: false }));
    s.visible = false;
    scene.add(s);
    return s;
  });
  const sf = snowfall(scene, 420, 60);
  return { scene, sky, padi, wilt, ou, bear, car, aff, breath, sf };
}
