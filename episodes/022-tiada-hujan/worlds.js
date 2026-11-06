// Episode 022 sets. Units are metres; Affan is scaled to ~1.2 m.
//   land   : kampung yard (house, bunga raya, outdoor tap), river, padi field,
//            forest hills. A single `dry` value (0 wet .. 1 drought) recolours
//            grass, soil, leaves and flowers; `haze` thickens the smoky air.
//   dam    : reservoir in a valley; the water level drops and shows the dry ring.
//   cycle  : water-cycle diorama (sun, sea, cloud, hills).
//   bath   : bathroom sink seen from the mirror, for the "save water" tip.
//   outro  : branded stage (same as the other episodes).
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { rng, lerp, clamp } from '../../shared/core.js';
import { makeAffan } from '../../shared/affan.js';
import { add, makeSky, glow, glowTex } from '../../shared/props.js';

const std = (color, rough = 0.7, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0, ...extra });
const C = (h) => new THREE.Color(h);
const smoothstep = (a, b, x) => {
  const k = clamp((x - a) / (b - a));
  return k * k * (3 - 2 * k);
};

function shadowCfg(light, size, map = 2048) {
  light.castShadow = true;
  light.shadow.mapSize.set(map, map);
  const c = light.shadow.camera;
  c.left = -size;
  c.right = size;
  c.top = size;
  c.bottom = -size;
  c.near = 1;
  c.far = 400;
  light.shadow.bias = -0.0004;
  light.shadow.normalBias = 0.03;
}

export const AFF_SCALE = 0.32;

// A material whose colour blends between wet and dry palettes, driven per frame.
class DryMat {
  constructor(wet, dry, rough = 0.8, extra = {}) {
    this.wet = C(wet);
    this.dry = C(dry);
    this.mat = std(wet, rough, extra);
  }
  set(k) {
    this.mat.color.copy(this.wet).lerp(this.dry, clamp(k));
  }
}

// Terrain whose vertex colours carry a wet and a dry colour, mixed by uDry.
function dryTerrainMaterial() {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 });
  m.userData.uDry = { value: 0 };
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uDry = m.userData.uDry;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec3 colorDry;\nuniform float uDry;')
      .replace('#include <color_vertex>', '#include <color_vertex>\nvColor.xyz = mix(vColor.xyz, colorDry, uDry);');
  };
  return m;
}

function terrain(size, seg, height, colours, mat) {
  const geo = new THREE.PlaneGeometry(size, size, seg, seg);
  geo.rotateX(-Math.PI / 2);
  const p = geo.attributes.position;
  const wet = new Float32Array(p.count * 3), dry = new Float32Array(p.count * 3);
  const cw = new THREE.Color(), cd = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i);
    const y = height(x, z);
    p.setY(i, y);
    colours(x, z, y, cw, cd);
    wet.set([cw.r, cw.g, cw.b], i * 3);
    dry.set([cd.r, cd.g, cd.b], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(wet, 3));
  geo.setAttribute('colorDry', new THREE.BufferAttribute(dry, 3));
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, mat);
  m.receiveShadow = true;
  return m;
}

// Voronoi crack pattern (alpha = crack), tiled.
function crackTexture(seed = 3, size = 512, cells = 34) {
  const R = rng(seed);
  const pts = [];
  for (let i = 0; i < cells; i++) pts.push([R() * size, R() * size]);
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const img = g.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let d1 = 1e9, d2 = 1e9;
      for (const [px, py] of pts) {
        for (const ox of [-size, 0, size]) {
          for (const oy of [-size, 0, size]) {
            const dx = x - px - ox, dy = y - py - oy;
            const d = dx * dx + dy * dy;
            if (d < d1) (d2 = d1), (d1 = d);
            else if (d < d2) d2 = d;
          }
        }
      }
      const e = Math.sqrt(d2) - Math.sqrt(d1);
      const a = clamp(1 - e / 3.2) ;
      const i = (y * size + x) * 4;
      img.data[i] = 70;
      img.data[i + 1] = 44;
      img.data[i + 2] = 26;
      img.data[i + 3] = Math.round(a * 235);
    }
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

// Crack decal that spreads outward from the centre as uReveal goes 0 -> 1.
function crackDecal(w, h, repeat, seed) {
  const tex = crackTexture(seed);
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    uniforms: { map: { value: tex }, uReveal: { value: 0 }, uRep: { value: new THREE.Vector2(repeat[0], repeat[1]) } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform sampler2D map; uniform float uReveal; uniform vec2 uRep; varying vec2 vUv;
      void main(){ vec4 c = texture2D(map, vUv * uRep); float d = length(vUv - 0.5) * 2.0;
        float r = smoothstep(uReveal * 1.5, uReveal * 1.5 - 0.35, d) * smoothstep(1.0, 0.8, d);
        gl_FragColor = vec4(c.rgb, c.a * r);
        #include <colorspace_fragment>
      }`,
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  m.rotation.x = -Math.PI / 2;
  m.renderOrder = 2;
  m.userData.set = (k) => (mat.uniforms.uReveal.value = k);
  return m;
}

// ------------------------------------------------------------------ plants
const LEAF_WET = [0x3f9a45, 0x55b84f, 0x2f8a3c];
const LEAF_DRY = [0xb7893a, 0xc9a04a, 0x94672f];

function makeLeafMats() {
  return LEAF_WET.map((w, i) => new DryMat(w, LEAF_DRY[i], 0.8, { flatShading: true }));
}

function makeTree(R, leaves, scale = 1) {
  const g = new THREE.Group();
  const h = (2.2 + R() * 1.4) * scale;
  add(g, new THREE.CylinderGeometry(0.16 * scale, 0.26 * scale, h, 8), std(0x7a5236, 0.9), [0, h / 2, 0]);
  const n = 3 + Math.floor(R() * 2);
  for (let i = 0; i < n; i++) {
    const r = (1.0 + R() * 0.6) * scale;
    add(g, new THREE.IcosahedronGeometry(r, 1), leaves[Math.floor(R() * 3)].mat, [(R() - 0.5) * 1.6 * scale, h + r * 0.4 + R() * 0.8 * scale, (R() - 0.5) * 1.6 * scale]);
  }
  return g;
}

// Coconut palm: curved trunk + drooping fronds.
function makePalm(R, leaves, scale = 1) {
  const g = new THREE.Group();
  const trunkMat = std(0x8d6a4a, 0.9);
  const segs = 7, lean = (R() - 0.5) * 0.5;
  let x = 0, y = 0;
  for (let i = 0; i < segs; i++) {
    const len = 1.05 * scale;
    const ang = lean * (i / segs);
    const m = add(g, new THREE.CylinderGeometry(0.15 * scale, 0.19 * scale, len, 8), trunkMat, [x + Math.sin(ang) * len / 2, y + Math.cos(ang) * len / 2, 0], [0, 0, -ang]);
    m.castShadow = true;
    x += Math.sin(ang) * len;
    y += Math.cos(ang) * len * 0.98;
  }
  const top = new THREE.Group();
  top.position.set(x, y, 0);
  g.add(top);
  const frond = new THREE.ConeGeometry(0.35 * scale, 3.0 * scale, 4, 1);
  frond.translate(0, 1.5 * scale, 0);
  frond.scale(1, 1, 0.25);
  for (let i = 0; i < 8; i++) {
    const f = new THREE.Mesh(frond, leaves[i % 3].mat);
    f.rotation.set(0, (i / 8) * Math.PI * 2 + R() * 0.3, 0);
    f.rotateZ(1.25 + R() * 0.35);
    f.castShadow = true;
    top.add(f);
  }
  for (let i = 0; i < 3; i++) add(top, new THREE.SphereGeometry(0.17 * scale, 10, 8), std(0x6b8a2e, 0.6), [Math.cos(i * 2.1) * 0.22 * scale, -0.2 * scale, Math.sin(i * 2.1) * 0.22 * scale]);
  return g;
}

// Bunga raya (hibiscus): head group droops and fades with dryness.
function makeHibiscus(R, petal, leaves) {
  const g = new THREE.Group();
  const stemMat = leaves[2].mat;
  add(g, new THREE.CylinderGeometry(0.018, 0.022, 0.55, 6), stemMat, [0, 0.275, 0]);
  for (let i = 0; i < 3; i++) add(g, new THREE.SphereGeometry(0.07, 8, 6), leaves[i % 3].mat, [Math.cos(i * 2.2) * 0.06, 0.2 + i * 0.09, Math.sin(i * 2.2) * 0.06], [0.5, i * 2.2, 0.6], [1, 0.35, 0.5]);
  const pivot = new THREE.Group();
  pivot.position.set(0, 0.55, 0);
  g.add(pivot);
  const head = new THREE.Group();
  head.rotation.x = -1.0; // faces up and forward (-z)
  pivot.add(head);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    add(head, new THREE.SphereGeometry(0.1, 12, 8), petal.mat, [Math.cos(a) * 0.09, 0.02, Math.sin(a) * 0.09], [0, -a, 0], [1.25, 0.18, 0.8]);
  }
  add(head, new THREE.CylinderGeometry(0.008, 0.008, 0.16, 5), std(0xffd23a, 0.5), [0, 0.09, 0], [0.3, 0, 0]);
  g.userData.pivot = pivot;
  g.userData.base = R() * 0.3;
  return g;
}

// Kampung house on stilts (front door faces -z).
function makeKampungHouse() {
  const g = new THREE.Group();
  const wood = std(0xb9804c, 0.85), woodDark = std(0x7b4f2c, 0.9), trim = std(0xf3ead8, 0.7), roof = std(0xb4473a, 0.6);
  for (const x of [-3.6, -1.2, 1.2, 3.6]) for (const z of [-2.6, 0, 2.6]) add(g, new THREE.CylinderGeometry(0.12, 0.14, 1.3, 8), woodDark, [x, 0.65, z]);
  add(g, new THREE.BoxGeometry(8, 0.2, 6), woodDark, [0, 1.3, 0]);
  add(g, new THREE.BoxGeometry(7.6, 2.6, 5.6), wood, [0, 2.7, 0]);
  // plank lines
  for (let i = 0; i < 8; i++) add(g, new THREE.BoxGeometry(7.65, 0.03, 0.02), woodDark, [0, 1.6 + i * 0.32, -2.81], [0, 0, 0], [1, 1, 1], false);
  // roof (gable along x)
  const rg = new THREE.CylinderGeometry(3.6, 3.6, 8.8, 3, 1, false);
  rg.rotateZ(Math.PI / 2);
  const r = add(g, rg, roof, [0, 4.9, 0], [0, 0, 0], [1, 0.62, 1.05]);
  r.rotation.x = Math.PI;
  add(g, new THREE.BoxGeometry(8.9, 0.12, 0.3), trim, [0, 3.95, -3.05]);
  // door + windows
  add(g, new THREE.BoxGeometry(1.1, 1.9, 0.08), woodDark, [0, 2.4, -2.84]);
  add(g, new THREE.BoxGeometry(1.3, 2.05, 0.06), trim, [0, 2.45, -2.82]);
  const glass = new THREE.MeshStandardMaterial({ color: 0x9fd4f0, roughness: 0.2, emissive: 0x1d3a52, emissiveIntensity: 0.3 });
  for (const x of [-2.5, 2.5]) {
    add(g, new THREE.BoxGeometry(1.5, 1.1, 0.08), trim, [x, 2.85, -2.84]);
    add(g, new THREE.BoxGeometry(1.25, 0.9, 0.06), glass, [x, 2.85, -2.86]);
    add(g, new THREE.BoxGeometry(0.06, 0.9, 0.1), trim, [x, 2.85, -2.88]);
  }
  // stairs
  for (let i = 0; i < 4; i++) add(g, new THREE.BoxGeometry(1.4, 0.12, 0.38), woodDark, [0, 0.25 + i * 0.3, -3.3 - (3 - i) * 0.34]);
  return g;
}

// Outdoor standpipe tap over a small concrete drain. Handle rotates.
function makeTap() {
  const g = new THREE.Group();
  const pipe = std(0x9aa3ad, 0.35, { metalness: 0.5 }), chrome = std(0xe6ebf0, 0.18, { metalness: 0.8 }), conc = std(0xb8b2a6, 0.95);
  add(g, new RoundedBoxGeometry(0.42, 0.06, 0.42, 2, 0.02), conc, [0, 0.03, 0.02]);
  add(g, new THREE.CircleGeometry(0.05, 16), std(0x55524c, 0.9), [0, 0.062, -0.02], [-Math.PI / 2, 0, 0]);
  add(g, new THREE.CylinderGeometry(0.035, 0.035, 0.7, 12), pipe, [0, 0.35, 0.18]);
  add(g, new THREE.CylinderGeometry(0.03, 0.03, 0.2, 12), chrome, [0, 0.69, 0.09], [Math.PI / 2, 0, 0]);
  add(g, new THREE.CylinderGeometry(0.026, 0.022, 0.1, 12), chrome, [0, 0.65, -0.01]);
  const handle = new THREE.Group();
  handle.position.set(0, 0.73, 0.09);
  g.add(handle);
  add(handle, new THREE.CylinderGeometry(0.01, 0.01, 0.06, 6), chrome, [0, 0.02, 0]);
  add(handle, new THREE.BoxGeometry(0.16, 0.025, 0.035), std(0xd23a3a, 0.4), [0, 0.05, 0]);
  const stream = add(g, new THREE.CylinderGeometry(0.016, 0.022, 0.55, 10), new THREE.MeshStandardMaterial({ color: 0x8fd0ff, roughness: 0.05, transparent: true, opacity: 0.7, emissive: 0x2a6a9a, emissiveIntensity: 0.4 }), [0, 0.33, -0.01], [0, 0, 0], [1, 1, 1], false);
  const drop = add(g, new THREE.SphereGeometry(0.02, 12, 10), new THREE.MeshStandardMaterial({ color: 0x9fdcff, roughness: 0.05, transparent: true, opacity: 0.9, emissive: 0x2a6a9a, emissiveIntensity: 0.5 }), [0, 0.6, -0.01], [0, 0, 0], [1, 1.3, 1], false);
  g.userData = { handle, stream, drop, spoutY: 0.6, floorY: 0.07 };
  return g;
}

function makeBall() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 128;
  const x = c.getContext('2d');
  const cols = ['#ff5a5a', '#ffd23a', '#3fa2ff', '#ffffff'];
  for (let i = 0; i < 8; i++) {
    x.fillStyle = cols[i % 4];
    x.fillRect(i * 32, 0, 32, 128);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(new THREE.SphereGeometry(0.16, 24, 16), new THREE.MeshStandardMaterial({ map: t, roughness: 0.4 }));
  m.castShadow = true;
  return m;
}

// ----------------------------------------------------------------- land
export const RIVER_X = 70;
export const PADI = { x0: -112, x1: -40, z0: -30, z1: 30 };
export const FOREST_VIEW = { x: 104, z: 28 };
export const SOIL = { x: -6, z: -5 };

const hillsH = (x, z) => {
  // gentle forest hills to the north (z > 40) and around the edges
  const n = Math.sin(x * 0.035) * 6 + Math.sin(x * 0.011 + 1.3) * 9 + Math.cos(z * 0.03 + x * 0.02) * 4;
  return smoothstep(38, 90, z) * (10 + n + smoothstep(90, 170, z) * 22);
};

export function landHeight(x, z) {
  let y = hillsH(x, z);
  const dx = Math.abs(x - RIVER_X);
  if (z < 60) {
    if (dx < 6) y = -1.6 * (1 - (dx / 6) ** 2);
    else if (dx < 9) y = lerp(0, y, smoothstep(6, 9, dx)) - 0.0;
  }
  return y;
}

export function buildLand() {
  const scene = new THREE.Scene();
  const fogCol = new THREE.Color(0xcfe6f5);
  scene.fog = new THREE.FogExp2(fogCol.getHex(), 0.0035);
  const sky = makeSky({ top: 0x2f86e8, mid: 0x5fb0f5, horizon: 0xd2ecfa, bottom: 0x9ab27a, radius: 1500 });
  scene.add(sky);
  // sun: bright disc + glows (direction set per shot)
  const sun = new THREE.Group();
  sun.add(new THREE.Mesh(new THREE.SphereGeometry(28, 32, 16), new THREE.MeshBasicMaterial({ color: 0xfff6d0, fog: false })));
  const sg1 = glow(0xfff1a0, 160, 0.9), sg2 = glow(0xffc860, 420, 0.45);
  sun.add(sg1, sg2);
  scene.add(sun);

  const hemi = new THREE.HemisphereLight(0xd8eeff, 0x8a7a4a, 1.25);
  scene.add(hemi);
  const key = new THREE.DirectionalLight(0xfff0d8, 2.6);
  shadowCfg(key, 9);
  scene.add(key, key.target);
  const rim = new THREE.DirectionalLight(0xffe2a8, 1.2);
  scene.add(rim);

  // terrain with wet/dry vertex colours
  const tmat = dryTerrainMaterial();
  const cw = (x, z, y, w, d) => {
    const dx = Math.abs(x - RIVER_X);
    const lawn = Math.abs(x) < 22 && z > -20 && z < 18;
    const padi = x > PADI.x0 - 4 && x < PADI.x1 + 4 && z > PADI.z0 - 4 && z < PADI.z1 + 4;
    if (z < 60 && dx < 6) {
      w.set(0x6f5b3e);
      d.set(0xcdb488);
    } else if (z < 60 && dx < 9.5) {
      w.set(0x9b8458);
      d.set(0xd9c39a);
    } else if (padi) {
      w.set(0x6b5a3e);
      d.set(0xc6a473);
    } else if (lawn) {
      w.set(0x66bb48);
      d.set(0xd6b05a);
    } else if (y > 6) {
      w.set(0x3e8a3d);
      d.set(0xa48548);
    } else {
      w.set(0x5aa845);
      d.set(0xc9a25a);
    }
  };
  const ground = terrain(420, 320, landHeight, cw, tmat);
  ground.position.set(0, 0, 0);
  scene.add(ground);

  const leaves = makeLeafMats();
  const grass = new DryMat(0x5cb845, 0xd8b45c, 0.9);
  const petal = new DryMat(0xe8222f, 0x8f4a36, 0.5);
  const padiMat = new DryMat(0x6cc23a, 0xb8913f, 0.75);
  const R = rng(22);

  // ---- yard
  const house = makeKampungHouse();
  house.position.set(-4.5, 0, 15);
  house.rotation.y = 0.22;
  scene.add(house);
  const tap = makeTap();
  tap.position.set(3.2, 0, 3.4);
  tap.rotation.y = Math.PI; // spout faces +z, pipe on Affan's side
  scene.add(tap);
  // rainbow arcs behind the house (shown after the rain)
  const rainbow = new THREE.Group();
  ['#ff4d4d', '#ff9a3d', '#ffe14d', '#5fd35f', '#3fa2ff', '#5b5fe0', '#a05be0'].forEach((c, i) => {
    const m = new THREE.Mesh(new THREE.TorusGeometry(70 - i * 2.2, 1.15, 8, 80, Math.PI), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.55, depthWrite: false, fog: false }));
    rainbow.add(m);
  });
  rainbow.position.set(10, -8, 150);
  rainbow.visible = false;
  scene.add(rainbow);
  const flowers = [];
  for (let i = 0; i < 11; i++) {
    const f = makeHibiscus(R, petal, leaves);
    f.position.set(-3.6 + i * 0.5 + (R() - 0.5) * 0.15, 0, 5.4 + (R() - 0.5) * 0.4);
    f.scale.setScalar(1.3 + R() * 0.3);
    scene.add(f);
    flowers.push(f);
  }
  for (let i = 0; i < 5; i++) {
    const b = new THREE.Group();
    for (let k = 0; k < 3; k++) add(b, new THREE.IcosahedronGeometry(0.45 + R() * 0.2, 1), leaves[k % 3].mat, [(k - 1) * 0.45, 0.4, (R() - 0.5) * 0.3]);
    b.position.set(-4 + i * 2.1, 0, 6.6);
    scene.add(b);
  }
  // grass tufts on the lawn
  const tuftGeo = new THREE.ConeGeometry(0.022, 0.13, 3);
  tuftGeo.translate(0, 0.065, 0);
  const tufts = new THREE.InstancedMesh(tuftGeo, grass.mat, 5200);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), v = new THREE.Vector3();
  for (let i = 0; i < 5200; i++) {
    do v.set((R() - 0.5) * 26, 0, -12 + R() * 17);
    while (Math.hypot(v.x - SOIL.x, v.z - SOIL.z) < 3.6 || Math.hypot(v.x - 3.2, v.z - 3.4) < 0.35);
    q.setFromEuler(new THREE.Euler((R() - 0.5) * 0.4, R() * 3, (R() - 0.5) * 0.4));
    s.setScalar(0.6 + R() * 0.7);
    tufts.setMatrixAt(i, m4.compose(v, q, s));
  }
  tufts.receiveShadow = true;
  scene.add(tufts);
  for (const [x, z, k] of [[-9, 12, 0], [9.5, 13, 1], [-13, 4, 1], [13, 6, 0], [-16, 16, 0], [17, 15, 1], [-7, 22, 0], [7, 24, 0]]) {
    const tr = k ? makePalm(R, leaves, 1.1) : makeTree(R, leaves, 1.1);
    tr.position.set(x, landHeight(x, z), z);
    scene.add(tr);
  }
  // fence posts along the yard edge
  for (let x = -14; x <= 14; x += 1.4) add(scene, new THREE.BoxGeometry(0.1, 0.8, 0.1), std(0xd9c7a2, 0.9), [x, 0.4, -14]);
  add(scene, new THREE.BoxGeometry(28.2, 0.08, 0.06), std(0xd9c7a2, 0.9), [0, 0.65, -14]);
  // bare soil patch with cracks (close-up shot)
  const soil = new DryMat(0x6e5236, 0xc9a477, 0.95);
  const soilDisc = add(scene, new THREE.CircleGeometry(3.4, 40), soil.mat, [SOIL.x, 0.02, SOIL.z], [-Math.PI / 2, 0, 0], [1, 1, 1], false);
  soilDisc.receiveShadow = true;
  const soilCracks = crackDecal(6.6, 6.6, [2.0, 2.0], 5);
  soilCracks.position.set(SOIL.x, 0.03, SOIL.z);
  scene.add(soilCracks);
  for (let i = 0; i < 9; i++) add(scene, new THREE.IcosahedronGeometry(0.06 + R() * 0.08, 0), std(0x9a8f80, 0.9, { flatShading: true }), [SOIL.x + (R() - 0.5) * 5, 0.04, SOIL.z + (R() - 0.5) * 5], [R(), R(), R()], [1, 0.6, 1]);
  const ball = makeBall();
  scene.add(ball);

  // ---- river (along z at RIVER_X)
  const water = new THREE.Mesh(new THREE.PlaneGeometry(18, 120), new THREE.MeshStandardMaterial({ color: 0x3f9fd8, roughness: 0.12, metalness: 0.15, transparent: true, opacity: 0.88 }));
  water.rotation.x = -Math.PI / 2;
  water.position.set(RIVER_X, -0.3, 0);
  scene.add(water);
  for (let i = 0; i < 70; i++) {
    const dx = (R() - 0.5) * 9, z = -50 + R() * 100;
    const y = landHeight(RIVER_X + dx, z);
    add(scene, new THREE.IcosahedronGeometry(0.2 + R() * 0.45, 0), std([0x8d8a84, 0x7a776f, 0xa39d92][i % 3], 0.9, { flatShading: true }), [RIVER_X + dx, y + 0.05, z], [R(), R(), R()], [1, 0.6, 1]);
  }
  for (let i = 0; i < 28; i++) {
    const side = i % 2 ? 1 : -1, z = -40 + (i / 28) * 90 + R() * 2;
    const x = RIVER_X + side * (10 + R() * 6);
    const tr = R() < 0.5 ? makePalm(R, leaves, 1.0) : makeTree(R, leaves, 1.0 + R() * 0.3);
    tr.position.set(x, landHeight(x, z), z);
    scene.add(tr);
  }

  // ---- padi field: plots with bunds, instanced padi clumps
  const bund = std(0x7d6a48, 0.95);
  for (let x = PADI.x0; x <= PADI.x1; x += 12) add(scene, new THREE.BoxGeometry(0.6, 0.25, PADI.z1 - PADI.z0), bund, [x, 0.1, (PADI.z0 + PADI.z1) / 2]);
  for (let z = PADI.z0; z <= PADI.z1; z += 10) add(scene, new THREE.BoxGeometry(PADI.x1 - PADI.x0, 0.25, 0.6), bund, [(PADI.x0 + PADI.x1) / 2, 0.1, z]);
  const padiWater = new THREE.Mesh(new THREE.PlaneGeometry(PADI.x1 - PADI.x0, PADI.z1 - PADI.z0), new THREE.MeshStandardMaterial({ color: 0x8fc8e8, roughness: 0.08, metalness: 0.2, transparent: true, opacity: 0.6 }));
  padiWater.rotation.x = -Math.PI / 2;
  padiWater.position.set((PADI.x0 + PADI.x1) / 2, 0.06, (PADI.z0 + PADI.z1) / 2);
  scene.add(padiWater);
  const padiCracks = crackDecal(PADI.x1 - PADI.x0, PADI.z1 - PADI.z0, [9, 7.5], 9);
  padiCracks.position.set((PADI.x0 + PADI.x1) / 2, 0.035, (PADI.z0 + PADI.z1) / 2);
  scene.add(padiCracks);
  const clumpGeo = new THREE.ConeGeometry(0.13, 0.75, 5, 1, true);
  clumpGeo.translate(0, 0.37, 0);
  const padiN = 3400;
  const padi = new THREE.InstancedMesh(clumpGeo, padiMat.mat, padiN);
  padi.castShadow = true;
  const padiBase = [];
  for (let i = 0; i < padiN; i++) {
    const x = PADI.x0 + 0.8 + (i % 85) * 0.84 + (R() - 0.5) * 0.15;
    const z = PADI.z0 + 0.8 + Math.floor(i / 85) * 1.45 + (R() - 0.5) * 0.15;
    padiBase.push([x, z, R() * 6, 0.8 + R() * 0.4]);
  }
  padi.userData.update = (k) => {
    for (let i = 0; i < padiN; i++) {
      const [x, z, r, sc] = padiBase[i];
      const sy = sc * lerp(1, 0.55, k);
      q.setFromEuler(new THREE.Euler(lerp(0, 0.5, k) * Math.sin(r), r, lerp(0, 0.5, k) * Math.cos(r)));
      padi.setMatrixAt(i, m4.compose(v.set(x, 0.02, z), q, s.set(sc, sy, sc)));
    }
    padi.instanceMatrix.needsUpdate = true;
  };
  padi.userData.update(0);
  scene.add(padi);
  for (let i = 0; i < 6; i++) {
    const hs = makeKampungHouse();
    hs.scale.setScalar(0.8);
    hs.position.set(PADI.x0 + 6 + i * 12, 0, PADI.z1 + 12 + R() * 6);
    hs.rotation.y = Math.PI + (R() - 0.5) * 0.4;
    scene.add(hs);
  }
  for (let i = 0; i < 16; i++) {
    const x = PADI.x0 - 4 + i * 5.2, z = PADI.z1 + 8 + R() * 18;
    const tr = makePalm(R, leaves, 1.0 + R() * 0.3);
    tr.position.set(x, landHeight(x, z), z);
    scene.add(tr);
  }

  // ---- forest on the hills north of the forest viewpoint
  const forestTrees = [];
  for (let i = 0; i < 260; i++) {
    const x = 30 + R() * 150, z = 40 + R() * 120;
    if (Math.abs(x - RIVER_X) < 12 && z < 62) continue;
    if (Math.abs(x - FOREST_VIEW.x) < 30 && z < 72) continue; // clearing in front of the viewpoint
    const tr = R() < 0.25 ? makePalm(R, leaves, 1.3) : makeTree(R, leaves, 1.2 + R() * 1.2);
    tr.position.set(x, landHeight(x, z), z);
    scene.add(tr);
    forestTrees.push(tr);
  }
  // distant mountains
  for (let i = 0; i < 14; i++) {
    add(scene, new THREE.ConeGeometry(60 + R() * 50, 70 + R() * 60, 7), std(0x4f7f6a, 1, { flatShading: true }), [-220 + i * 36, 0, 230 + R() * 40], [0, R(), 0], [1, 1, 1], false);
  }
  // smoke plumes + fire glow (forest shot)
  const smokeMat = new THREE.SpriteMaterial({ map: glowTex, color: 0x6e665e, transparent: true, opacity: 0, depthWrite: false });
  const plumes = [];
  for (const [x, z] of [[124, 92], [88, 104], [146, 84]]) {
    const y = landHeight(x, z);
    const fire = glow(0xff7a2a, 10, 0);
    fire.position.set(x, y + 2, z);
    scene.add(fire);
    const parts = [];
    for (let k = 0; k < 20; k++) {
      const sp = new THREE.Sprite(smokeMat.clone());
      scene.add(sp);
      parts.push(sp);
    }
    plumes.push({ x, y, z, fire, parts });
  }

  const aff = makeAffan();
  aff.root.scale.setScalar(AFF_SCALE);
  scene.add(aff.root);

  const skyU = sky.material.uniforms;
  const SKY = {
    clear: [C(0x2f86e8), C(0x5fb0f5), C(0xd2ecfa)],
    hot: [C(0x3d8fe0), C(0x8cc4f0), C(0xfbe7b8)],
    haze: [C(0x8a8a86), C(0xa9a090), C(0xc9b48e)],
    rain: [C(0x4a5466), C(0x6a7486), C(0x9aa4b0)],
  };
  const tmp = [new THREE.Color(), new THREE.Color(), new THREE.Color()];
  // Blend sky by weights {hot, haze, rain} over the clear sky.
  function setSky({ hot = 0, haze = 0, rain = 0 }) {
    for (let i = 0; i < 3; i++) {
      tmp[i].copy(SKY.clear[i]).lerp(SKY.hot[i], hot).lerp(SKY.haze[i], haze).lerp(SKY.rain[i], rain);
    }
    skyU.top.value.copy(tmp[0]);
    skyU.mid.value.copy(tmp[1]);
    skyU.horizon.value.copy(tmp[2]);
    scene.fog.color.copy(tmp[2]);
    scene.fog.density = lerp(0.0035, 0.03, haze) + rain * 0.006;
    sun.visible = haze < 0.9 && rain < 0.6;
    sg2.material.opacity = 0.45 * (1 - haze) * (1 - rain) + 0.25 * hot;
    hemi.intensity = lerp(1.25, 0.9, Math.max(haze, rain));
    key.intensity = lerp(2.6, 1.1, Math.max(haze * 0.8, rain));
    key.color.set(haze > 0.01 ? 0xffd0a0 : 0xfff0d8);
  }

  function setDry(k, droop = smoothstep(0.3, 1, k)) {
    tmat.userData.uDry.value = k;
    leaves.forEach((l) => l.set(k));
    grass.set(k);
    petal.set(Math.max(k * 0.6, droop));
    soil.set(k);
    for (const f of flowers) {
      f.userData.pivot.rotation.x = -lerp(0, 1.9 + f.userData.base, droop);
      f.userData.pivot.position.y = 0.55 - 0.06 * droop;
    }
  }

  // padi: colour/droop (k), standing water fades and cracks spread (wk)
  function setPadi(k, wk = k) {
    padiMat.set(k);
    padi.userData.update(k);
    padiWater.material.opacity = 0.6 * (1 - smoothstep(0, 0.6, wk));
    padiWater.visible = wk < 0.6;
    padiCracks.userData.set(smoothstep(0.3, 1, wk));
  }

  function setPlumes(t, a) {
    for (const p of plumes) {
      p.fire.material.opacity = a * (0.5 + 0.15 * Math.sin(t * 9 + p.x));
      p.parts.forEach((sp, k) => {
        const ph = ((t * 0.12 + k / p.parts.length) % 1);
        sp.position.set(p.x + ph * 18 + Math.sin(k * 3.1 + t * 0.4) * 2, p.y + 2 + ph * 40, p.z - ph * 6);
        const sc = 8 + ph * 30;
        sp.scale.set(sc, sc, 1);
        sp.material.opacity = a * 0.95 * Math.sin(ph * Math.PI);
      });
    }
  }

  // Keep the shadow camera centred on what the shot looks at.
  const sunDir = new THREE.Vector3(-0.35, 0.6, 1).normalize();
  function light(at, keyDir = [0.5, 0.9, -0.7]) {
    key.target.position.copy(at);
    key.position.copy(at).add(new THREE.Vector3(...keyDir).normalize().multiplyScalar(60));
    rim.position.copy(at).addScaledVector(sunDir, 60);
    rim.target = key.target;
  }
  function placeSun(camPos, dir = sunDir) {
    sun.position.copy(camPos).addScaledVector(dir, 900);
  }

  return { scene, sky, sun, ground, house, tap, flowers, ball, water, padi, padiWater, padiCracks, soilCracks, rainbow, aff, setSky, setDry, setPadi, setPlumes, light, placeSun, sunDir };
}

// ------------------------------------------------------------------ dam
export function buildDam() {
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0xd8ecf8, 0.0018);
  const sky = makeSky({ top: 0x3d8fe0, mid: 0x8cc4f0, horizon: 0xfbe7b8, bottom: 0x9ab27a, radius: 1800 });
  scene.add(sky);
  scene.add(new THREE.HemisphereLight(0xdceeff, 0x7a6a44, 1.3));
  const key = new THREE.DirectionalLight(0xfff0d6, 2.4);
  key.position.set(120, 200, -150);
  shadowCfg(key, 220, 2048);
  key.shadow.camera.far = 800;
  scene.add(key, key.target);
  const FULL = -1.5;
  const h = (x, z) => {
    const r = Math.hypot(x / 1.5, z);
    const n = Math.sin(x * 0.04) * 4 + Math.cos(z * 0.05 + x * 0.01) * 4 + Math.sin(x * 0.013 + z * 0.02) * 6;
    if (r < 110) return -22 * (1 - (r / 110) ** 1.6) + n * (r / 110) * 0.6;
    return smoothstep(110, 230, r) * 45 + n;
  };
  const tmat = dryTerrainMaterial();
  tmat.userData.uDry.value = 1;
  const ground = terrain(900, 260, h, (x, z, y, w, d) => {
    if (y < FULL + 0.4) {
      w.set(0xcdb88f);
      d.set(0xcdb88f);
    } else {
      w.set(0x3f8a3e);
      d.set(0x7e9a48);
    }
  }, tmat);
  scene.add(ground);
  const water = new THREE.Mesh(new THREE.PlaneGeometry(700, 500), new THREE.MeshStandardMaterial({ color: 0x2f8fd0, roughness: 0.1, metalness: 0.2 }));
  water.rotation.x = -Math.PI / 2;
  water.position.y = FULL;
  water.receiveShadow = true;
  scene.add(water);
  // concrete dam wall across the near end of the lake
  const conc = std(0xc9c6bd, 0.85);
  const wall = new THREE.Group();
  add(wall, new THREE.BoxGeometry(150, 30, 10), conc, [0, -12, 0]);
  add(wall, new THREE.BoxGeometry(152, 2, 12), std(0xe2dfd6, 0.8), [0, 3.5, 0]);
  for (let i = -4; i <= 4; i++) add(wall, new THREE.BoxGeometry(2, 3, 12), std(0xb5b1a6, 0.85), [i * 16, 5.5, 0]);
  for (let i = -7; i <= 7; i++) add(wall, new THREE.BoxGeometry(0.6, 34, 0.6), std(0xb5b1a6, 0.85), [i * 10, -13, -5.2]);
  wall.position.set(0, 0, -112);
  scene.add(wall);
  // drowned-tree stumps that appear as the water drops
  const R = rng(31);
  for (let i = 0; i < 70; i++) {
    const a = R() * Math.PI * 2, r = 30 + R() * 70;
    const x = Math.cos(a) * r * 1.5, z = Math.sin(a) * r;
    const y = h(x, z);
    if (y > FULL - 0.5 || z < -95) continue;
    add(scene, new THREE.CylinderGeometry(0.4, 0.7, 4, 6), std(0x8a7a64, 0.95), [x, y + 2, z], [(R() - 0.5) * 0.3, 0, (R() - 0.5) * 0.3]);
  }
  const treeGeo = new THREE.ConeGeometry(3.2, 9, 6);
  treeGeo.translate(0, 4.5, 0);
  const trees = new THREE.InstancedMesh(treeGeo, std(0x4f8f3e, 0.85, { flatShading: true }), 900);
  const m4 = new THREE.Matrix4(), qq = new THREE.Quaternion(), sv = new THREE.Vector3(), vv = new THREE.Vector3();
  let n = 0;
  while (n < 900) {
    const x = (R() - 0.5) * 760, z = (R() - 0.5) * 600;
    const y = h(x, z);
    if (y < FULL + 1.5) continue;
    trees.setMatrixAt(n++, m4.compose(vv.set(x, y - 0.5, z), qq.setFromEuler(new THREE.Euler(0, R() * 6, 0)), sv.setScalar(0.7 + R() * 0.8)));
  }
  trees.castShadow = true;
  scene.add(trees);
  return { scene, sky, water, FULL };
}

// ---------------------------------------------------------------- cycle
export function buildCycle() {
  const scene = new THREE.Scene();
  const sky = makeSky({ top: 0x2f86e8, mid: 0x6cb8f5, horizon: 0xd8f0ff, bottom: 0x2f8fd0, radius: 900 });
  scene.add(sky);
  scene.add(new THREE.HemisphereLight(0xe0f0ff, 0x6a8a5a, 1.35));
  const key = new THREE.DirectionalLight(0xfff2d8, 2.4);
  key.position.set(-30, 60, -40);
  shadowCfg(key, 50);
  scene.add(key, key.target);
  // land on the left, sea on the right
  const h = (x, z) => {
    if (x > 2) return -0.6;
    const m = smoothstep(2, -6, x) * (0.6 + smoothstep(-6, -30, x) * (9 + Math.sin(z * 0.2) * 2 + Math.sin(x * 0.3) * 1.5));
    return m + smoothstep(-14, -26, x) * smoothstep(-20, 10, z) * 8;
  };
  const tmat = dryTerrainMaterial();
  const ground = terrain(160, 160, h, (x, z, y, w, d) => {
    if (y < 0.15) w.set(0xf0dca8);
    else if (y > 9) w.set(0x6f8f62);
    else w.set(0x5fb24a);
    d.copy(w);
  }, tmat);
  scene.add(ground);
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(120, 160), new THREE.MeshStandardMaterial({ color: 0x2c8fe0, roughness: 0.15, metalness: 0.15 }));
  sea.rotation.x = -Math.PI / 2;
  sea.position.set(62, 0, 0);
  scene.add(sea);
  // river flowing from the hills to the sea
  const river = new THREE.Mesh(new THREE.PlaneGeometry(26, 1.6), new THREE.MeshStandardMaterial({ color: 0x4fb0ee, roughness: 0.1, emissive: 0x174a70, emissiveIntensity: 0.25 }));
  river.rotation.set(-Math.PI / 2, 0, 0.12);
  river.position.set(-10, 0.9, 4);
  scene.add(river);
  const leaves = makeLeafMats();
  const R = rng(44);
  for (let i = 0; i < 26; i++) {
    const x = -2 - R() * 22, z = -6 + R() * 26;
    const tr = R() < 0.4 ? makePalm(R, leaves, 0.9) : makeTree(R, leaves, 0.9 + R() * 0.5);
    tr.position.set(x, h(x, z), z);
    scene.add(tr);
  }
  // sun
  const sun = new THREE.Group();
  sun.add(new THREE.Mesh(new THREE.SphereGeometry(4, 32, 16), new THREE.MeshBasicMaterial({ color: 0xfff3b0 })));
  const sg = glow(0xffd860, 26, 0.9);
  sun.add(sg, glow(0xfff0b0, 12, 1));
  sun.position.set(14, 31, 20);
  scene.add(sun);
  // cloud: a puff group that grows and greys
  const cloud = new THREE.Group();
  const cmat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, emissive: 0xb8c8de, emissiveIntensity: 0.35 });
  for (const [x, y, z, r] of [[0, 0, 0, 3.4], [3.2, -0.6, 0.6, 2.6], [-3.2, -0.5, 0.3, 2.7], [1.4, 1.5, 0.4, 2.5], [-1.6, 1.2, -0.4, 2.3], [5.6, -1.1, 0, 1.8], [-5.6, -1.0, 0.2, 1.9]]) {
    add(cloud, new THREE.SphereGeometry(r, 20, 14), cmat, [x, y, z], [0, 0, 0], [1, 0.8, 0.9]);
  }
  scene.add(cloud);
  return { scene, sky, sun, sunGlow: sg, cloud, cloudMat: cmat, sea, h };
}

// ----------------------------------------------------------------- bath
export function buildBath() {
  const scene = new THREE.Scene();
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#cfeef0';
  g.fillRect(0, 0, 256, 256);
  g.strokeStyle = '#ffffff';
  g.lineWidth = 6;
  for (let i = 0; i <= 4; i++) {
    g.beginPath();
    g.moveTo(i * 64, 0);
    g.lineTo(i * 64, 256);
    g.moveTo(0, i * 64);
    g.lineTo(256, i * 64);
    g.stroke();
  }
  const tiles = new THREE.CanvasTexture(c);
  tiles.colorSpace = THREE.SRGBColorSpace;
  tiles.wrapS = tiles.wrapT = THREE.RepeatWrapping;
  tiles.repeat.set(8, 6);
  const tileMat = new THREE.MeshStandardMaterial({ map: tiles, roughness: 0.5 });
  scene.background = new THREE.Color(0xcfeef0);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xb0c4cc, 1.6));
  const key = new THREE.DirectionalLight(0xfff4e6, 2.0);
  key.position.set(1.5, 3, 2);
  shadowCfg(key, 3);
  scene.add(key, key.target);
  const fill = new THREE.PointLight(0xffffff, 3, 6, 2);
  fill.position.set(0, 1.8, 0.6);
  scene.add(fill);
  // back wall behind Affan (z = -1.6) and side walls
  add(scene, new THREE.PlaneGeometry(8, 6), tileMat, [0, 2, -1.6]);
  const sideMat = tileMat.clone();
  add(scene, new THREE.PlaneGeometry(6, 6), sideMat, [-2.2, 2, 0.5], [0, Math.PI / 2, 0]);
  add(scene, new THREE.PlaneGeometry(6, 6), sideMat, [2.2, 2, 0.5], [0, -Math.PI / 2, 0]);
  add(scene, new THREE.PlaneGeometry(8, 8), std(0xe8e2d6, 0.6), [0, 0, 0], [-Math.PI / 2, 0, 0]);
  // towel on the back wall, a door frame
  add(scene, new RoundedBoxGeometry(0.6, 0.9, 0.05, 3, 0.02), std(0xff9a6b, 0.9), [-1.2, 1.5, -1.57]);
  add(scene, new THREE.CylinderGeometry(0.02, 0.02, 0.8, 8), std(0xd8dde3, 0.3, { metalness: 0.6 }), [-1.2, 1.95, -1.55], [0, 0, Math.PI / 2]);
  // sink unit in front of Affan (towards the camera / mirror at z = +0.7)
  const sink = new THREE.Group();
  sink.position.set(0, -0.2, 0.55);
  scene.add(sink);
  const white = std(0xffffff, 0.25), chrome = std(0xe8edf2, 0.12, { metalness: 0.85 });
  add(sink, new RoundedBoxGeometry(1.1, 0.12, 0.55, 3, 0.04), white, [0, 0.78, 0]);
  add(sink, new THREE.CylinderGeometry(0.24, 0.16, 0.14, 24), std(0xdfe7ec, 0.2), [0, 0.8, 0.0], [0, 0, 0], [1.2, 1, 0.8]);
  add(sink, new THREE.CylinderGeometry(0.08, 0.1, 0.72, 16), white, [0, 0.36, 0.05]);
  const tap = new THREE.Group();
  tap.position.set(0.3, 0.84, 0.2);
  sink.add(tap);
  add(tap, new THREE.CylinderGeometry(0.03, 0.035, 0.22, 14), chrome, [0, 0.11, 0]);
  add(tap, new THREE.CylinderGeometry(0.022, 0.022, 0.2, 12), chrome, [0, 0.21, -0.09], [Math.PI / 2, 0, 0]);
  const handle = new THREE.Group();
  handle.position.set(0, 0.25, 0.0);
  tap.add(handle);
  add(handle, new THREE.BoxGeometry(0.03, 0.03, 0.14), chrome, [0, 0.02, 0.06]);
  add(handle, new THREE.SphereGeometry(0.025, 10, 8), std(0x3fa2ff, 0.3), [0, 0.02, 0.13]);
  const stream = add(tap, new THREE.CylinderGeometry(0.012, 0.018, 0.2, 10), new THREE.MeshStandardMaterial({ color: 0xa8dcff, roughness: 0.05, transparent: true, opacity: 0.75, emissive: 0x2a6a9a, emissiveIntensity: 0.4 }), [0, 0.1, -0.19], [0, 0, 0], [1, 1, 1], false);
  // cup + spare toothbrush on the sink
  add(sink, new THREE.CylinderGeometry(0.05, 0.045, 0.12, 16), std(0x7be38a, 0.4), [0.38, 0.9, 0.05]);
  // Affan + a toothbrush held in his right hand
  const aff = makeAffan();
  aff.root.scale.setScalar(AFF_SCALE);
  aff.root.position.set(0, 0, 0);
  scene.add(aff.root);
  const brush = new THREE.Group();
  add(brush, new THREE.BoxGeometry(0.06, 0.6, 0.06), std(0x2f9bff, 0.4), [0, 0.12, 0]);
  add(brush, new THREE.BoxGeometry(0.075, 0.12, 0.08), std(0xffffff, 0.6), [0, 0.42, 0.05]);
  add(brush, new THREE.BoxGeometry(0.06, 0.08, 0.06), std(0xffffff, 0.3, { emissive: 0xffffff, emissiveIntensity: 0.4 }), [0, 0.42, 0.1]);
  aff.parts.arms.R.hand.add(brush);
  brush.position.set(0, -0.1, 0.06);
  brush.rotation.set(-Math.PI / 2, 0, 0);
  return { scene, aff, tapHandle: handle, stream, brush, sink };
}

// ----------------------------------------------------------------- outro
export function buildOutro() {
  const scene = new THREE.Scene();
  const c = document.createElement('canvas');
  c.width = 540;
  c.height = 960;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(270, 380, 40, 270, 420, 700);
  gr.addColorStop(0, '#8fd0ff');
  gr.addColorStop(0.45, '#3f9cf2');
  gr.addColorStop(1, '#1a5fcf');
  g.fillStyle = gr;
  g.fillRect(0, 0, 540, 960);
  const bg = new THREE.CanvasTexture(c);
  bg.colorSpace = THREE.SRGBColorSpace;
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
