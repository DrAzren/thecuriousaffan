// Episode 024 sets: Affan's living room, a sunny street, the imagination
// globe of cats, the breed carousel stage (with a crowd stand) and the outro.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { rng } from '../../shared/core.js';
import { makeAffan } from '../../shared/affan.js';
import { makeCat, BREEDS, crowdBreed, catFaceTexture } from '../../shared/cat.js';
import { add, makeSky, makeStars, makeTree, makeHouse, makeBush, glow } from '../../shared/props.js';

const std = (color, rough = 0.7, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0, ...extra });

function shadowCfg(light, size, map = 2048, far = 80) {
  light.castShadow = true;
  light.shadow.mapSize.set(map, map);
  const c = light.shadow.camera;
  c.left = -size;
  c.right = size;
  c.top = size;
  c.bottom = -size;
  c.near = 0.5;
  c.far = far;
  light.shadow.bias = -0.0005;
  light.shadow.normalBias = 0.03;
}

function canvasTex(w, h, draw, repeat = null) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(...repeat);
  }
  return t;
}

const rbox = (w, h, d, r = 0.12) => new RoundedBoxGeometry(w, h, d, 4, r);

// ------------------------------------------------------------- living room
export function buildHome() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf6e3c8);
  scene.fog = new THREE.Fog(0xf6e3c8, 30, 70);
  const R = rng(3);
  // wooden floor
  const floorTex = canvasTex(512, 512, (g, w, h) => {
    for (let i = 0; i < 8; i++) {
      g.fillStyle = ['#c98d55', '#d19a62', '#c4884f', '#cf955c'][i % 4];
      g.fillRect(0, i * 64, w, 64);
      g.fillStyle = 'rgba(90,50,20,0.35)';
      g.fillRect(0, i * 64, w, 3);
      const off = (i * 173) % w;
      g.fillRect(off, i * 64, 3, 64);
      g.fillRect((off + 256) % w, i * 64, 3, 64);
    }
  }, [6, 6]);
  add(scene, new THREE.PlaneGeometry(40, 40), std(0xffffff, 0.6, { map: floorTex }), [0, 0, 0], [-Math.PI / 2, 0, 0]).castShadow = false;
  // walls
  const wallTex = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#bfe6d8';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#ace0cd';
    for (let x = 0; x < w; x += 32) g.fillRect(x, 0, 14, h);
  }, [10, 3]);
  add(scene, new THREE.PlaneGeometry(40, 12), std(0xffffff, 0.9, { map: wallTex }), [0, 6, -4.6]).castShadow = false;
  add(scene, new THREE.PlaneGeometry(30, 12), std(0xffd9b8, 0.9), [-8, 6, 6], [0, Math.PI / 2, 0]).castShadow = false;
  add(scene, new THREE.BoxGeometry(40, 0.4, 0.12), std(0xffffff, 0.5), [0, 0.2, -4.54]);
  // window with a sunny sky
  const win = new THREE.Group();
  win.position.set(3.2, 3.9, -4.55);
  scene.add(win);
  const skyTex = canvasTex(256, 256, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, '#5fb8ff');
    gr.addColorStop(1, '#cdeeff');
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#ffffff';
    for (const [x, y, r] of [[60, 70, 26], [90, 62, 32], [120, 74, 24], [190, 140, 20], [212, 132, 26]]) {
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.fill();
    }
    g.fillStyle = '#6fcf73';
    g.beginPath();
    g.ellipse(80, 260, 140, 60, 0, 0, Math.PI * 2);
    g.ellipse(220, 270, 120, 70, 0, 0, Math.PI * 2);
    g.fill();
  });
  add(win, new THREE.PlaneGeometry(3.2, 2.6), new THREE.MeshBasicMaterial({ map: skyTex }), [0, 0, 0.01]).castShadow = false;
  const frameM = std(0xffffff, 0.4);
  for (const [x, y, w, h] of [[0, 1.35, 3.5, 0.18], [0, -1.35, 3.6, 0.22], [-1.7, 0, 0.18, 2.8], [1.7, 0, 0.18, 2.8], [0, 0, 0.1, 2.6], [0, 0, 3.2, 0.1]]) add(win, new THREE.BoxGeometry(w, h, 0.16), frameM, [x, y, 0.08]);
  const curtainM = std(0xffc94a, 0.9);
  for (const s of [-1, 1]) for (let i = 0; i < 4; i++) add(win, new THREE.CylinderGeometry(0.16, 0.2, 3.4, 12), curtainM, [s * (2.1 + i * 0.22), -0.2, 0.25]);
  const sunGlow = glow(0xfff2c8, 6, 0.35);
  sunGlow.position.set(3.2, 3.9, -4.3);
  scene.add(sunGlow);
  // framed cat picture
  const pic = new THREE.Group();
  pic.position.set(-2.6, 4.2, -4.52);
  scene.add(pic);
  add(pic, new THREE.BoxGeometry(1.7, 1.7, 0.1), std(0xe8763a, 0.5), [0, 0, 0]);
  add(pic, new THREE.PlaneGeometry(1.4, 1.4), new THREE.MeshBasicMaterial({ color: 0xfff6e0 }), [0, 0, 0.06]).castShadow = false;
  add(pic, new THREE.PlaneGeometry(1.2, 1.2), new THREE.MeshBasicMaterial({ map: catFaceTexture('#f0a04b'), transparent: true }), [0, 0, 0.07]).castShadow = false;
  // sofa
  const sofa = new THREE.Group();
  sofa.position.set(-0.6, 0, -3.3);
  scene.add(sofa);
  const sofaM = std(0x3aa39b, 0.85), sofaD = std(0x2f8a83, 0.85);
  add(sofa, rbox(5.4, 0.9, 1.9, 0.2), sofaM, [0, 0.65, 0]);
  add(sofa, rbox(5.4, 1.7, 0.6, 0.25), sofaM, [0, 1.6, -0.75]);
  for (const s of [-1, 1]) add(sofa, rbox(0.6, 1.5, 1.9, 0.25), sofaD, [s * 2.7, 0.95, 0]);
  for (const [x, c] of [[-1.3, 0xffb347], [1.3, 0xff7f6e]]) add(sofa, rbox(1.2, 1.0, 0.35, 0.18), std(c, 0.9), [x, 1.55, -0.3], [0.2, 0, 0]);
  for (const x of [-2.3, 2.3]) for (const z of [-0.7, 0.7]) add(sofa, new THREE.CylinderGeometry(0.08, 0.06, 0.25, 8), std(0x6b4a32), [x, 0.12, z]);
  // round rug
  const rugTex = canvasTex(512, 512, (g, w) => {
    const c = ['#ffcf6b', '#ff9a76', '#ffe7a8', '#ff9a76', '#ffcf6b'];
    for (let i = 0; i < c.length; i++) {
      g.fillStyle = c[i];
      g.beginPath();
      g.arc(w / 2, w / 2, w / 2 - i * 48, 0, Math.PI * 2);
      g.fill();
    }
  });
  add(scene, new THREE.CircleGeometry(3.6, 48), std(0xffffff, 0.95, { map: rugTex, transparent: true }), [0, 0.012, 0.4], [-Math.PI / 2, 0, 0]).castShadow = false;
  // ottoman the cat sits on
  const ott = new THREE.Group();
  ott.position.set(-1.55, 0, 0.55);
  scene.add(ott);
  add(ott, new THREE.CylinderGeometry(0.85, 0.8, 0.9, 32), std(0xe8655a, 0.85), [0, 0.45, 0]);
  add(ott, new THREE.CylinderGeometry(0.88, 0.88, 0.22, 32), std(0xffd27a, 0.9), [0, 0.98, 0]);
  add(ott, new THREE.TorusGeometry(0.86, 0.06, 8, 40), std(0xffffff, 0.6), [0, 0.9, 0], [Math.PI / 2, 0, 0]);
  // plant
  const plant = new THREE.Group();
  plant.position.set(-5.6, 0, -3.4);
  scene.add(plant);
  add(plant, new THREE.CylinderGeometry(0.55, 0.42, 1.0, 20), std(0xf2f2f2, 0.5), [0, 0.5, 0]);
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    add(plant, new THREE.SphereGeometry(0.42, 14, 10), std([0x4fb86a, 0x3ea35a, 0x62c977][i % 3], 0.8), [Math.cos(a) * 0.35, 1.5 + (i % 3) * 0.35, Math.sin(a) * 0.35], [0.7, 1.3, 0.7], [Math.cos(a) * 0.5, 0, Math.sin(a) * 0.5]);
  }
  // yarn ball + toy mouse on the rug
  const yarn = add(scene, new THREE.SphereGeometry(0.28, 20, 14), std(0xff6fa8, 0.9), [2.3, 0.28, 1.6]);
  for (let i = 0; i < 4; i++) add(yarn, new THREE.TorusGeometry(0.28, 0.02, 6, 24), std(0xff4f92, 0.9), [0, 0, 0], [i * 0.8, i * 0.5, 0]);
  add(scene, new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(2.3, 0.05, 1.6), new THREE.Vector3(2.9, 0.03, 2.0), new THREE.Vector3(2.5, 0.03, 2.6), new THREE.Vector3(3.3, 0.03, 2.9)]), 40, 0.018, 6), std(0xff4f92, 0.9));
  // side table with a lamp
  const tbl = new THREE.Group();
  tbl.position.set(3.3, 0, -3.3);
  scene.add(tbl);
  add(tbl, new THREE.CylinderGeometry(0.6, 0.6, 0.1, 24), std(0xfff3e0, 0.5), [0, 1.4, 0]);
  add(tbl, new THREE.CylinderGeometry(0.08, 0.08, 1.4, 10), std(0x8a5a3a), [0, 0.7, 0]);
  add(tbl, new THREE.CylinderGeometry(0.4, 0.4, 0.06, 20), std(0x8a5a3a), [0, 0.03, 0]);
  add(tbl, new THREE.CylinderGeometry(0.35, 0.5, 0.6, 20, 1, true), std(0xfff0c0, 0.6, { emissive: 0xffd27a, emissiveIntensity: 0.5, side: THREE.DoubleSide }), [0, 2.15, 0]);
  add(tbl, new THREE.CylinderGeometry(0.05, 0.05, 0.5, 8), std(0x8a5a3a), [0, 1.65, 0]);

  scene.add(new THREE.HemisphereLight(0xfff6e8, 0xb8865a, 1.25));
  const key = new THREE.DirectionalLight(0xfff0dc, 2.4);
  key.position.set(5, 11, 9);
  shadowCfg(key, 7);
  scene.add(key, key.target);
  const fill = new THREE.DirectionalLight(0xc8e4ff, 0.8);
  fill.position.set(-8, 5, 4);
  scene.add(fill);

  const aff = makeAffan();
  scene.add(aff.root);
  const cat = makeCat(BREEDS.kampung, { seed: 1 });
  cat.root.position.set(-1.55, 1.09, 0.55);
  scene.add(cat.root);
  return { scene, aff, cat, key, ott };
}

// ------------------------------------------------------------------ street
export function buildStreet() {
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xcfeaff, 30, 120);
  const sky = makeSky({ top: 0x3d9cf0, mid: 0x74bdf6, horizon: 0xd8f0ff, bottom: 0xbfe0ff });
  scene.add(sky);
  const R = rng(9);
  add(scene, new THREE.PlaneGeometry(300, 300), std(0x7ccf6a, 1), [0, 0, 0], [-Math.PI / 2, 0, 0]).castShadow = false;
  add(scene, new THREE.PlaneGeometry(300, 3), std(0xd9d3c4, 0.9), [0, 0.01, 2.2], [-Math.PI / 2, 0, 0]).castShadow = false;
  add(scene, new THREE.PlaneGeometry(300, 6), std(0x55596a, 0.9), [0, 0.012, 6.6], [-Math.PI / 2, 0, 0]).castShadow = false;
  const dash = new THREE.InstancedMesh(new THREE.PlaneGeometry(1.4, 0.18), new THREE.MeshBasicMaterial({ color: 0xfdf6d8 }), 80);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
  for (let i = 0; i < 80; i++) dash.setMatrixAt(i, m.compose(new THREE.Vector3(-120 + i * 3, 0.02, 6.6), q, new THREE.Vector3(1, 1, 1)));
  scene.add(dash);
  // brick wall
  const brick = canvasTex(256, 128, (g, w, h) => {
    g.fillStyle = '#e8d9c4';
    g.fillRect(0, 0, w, h);
    for (let r = 0; r < 4; r++) for (let c = -1; c < 5; c++) {
      g.fillStyle = ['#d9774f', '#cf6a45', '#e2845a'][(r + c + 9) % 3];
      g.fillRect(c * 64 + (r % 2) * 32 + 3, r * 32 + 3, 58, 26);
    }
  }, [14, 1.6]);
  add(scene, new THREE.BoxGeometry(40, 1.8, 0.6), std(0xffffff, 0.9, { map: brick }), [0, 0.9, 0.2]);
  add(scene, new THREE.BoxGeometry(40.2, 0.16, 0.8), std(0xf2ebe0, 0.8), [0, 1.88, 0.2]);
  // gardens and houses behind the wall
  for (let x = -26; x < 26; x += 9 + R() * 3) {
    const h = makeHouse(R, { scale: 1.3 });
    h.position.set(x, 0, -9 - R() * 3);
    scene.add(h);
  }
  for (let x = -24; x < 24; x += 3 + R() * 3) {
    const t = makeTree(R, { scale: 0.9 + R() * 0.5, leaf: [0x4fb86a, 0x62c977, 0x3ea35a] });
    t.position.set(x, 0, -2.5 - R() * 3);
    scene.add(t);
  }
  for (let x = -20; x < 20; x += 2.5 + R() * 2) {
    const b = makeBush(R, { scale: 0.8, color: 0x46a85a });
    b.position.set(x, 0, -0.6);
    scene.add(b);
  }
  // flowers along the pavement side
  for (let x = -20; x < 20; x += 0.7 + R() * 0.6) {
    const f = add(scene, new THREE.SphereGeometry(0.1, 8, 6), std([0xff6fa8, 0xffd84a, 0xffffff, 0xff8a3d][Math.floor(R() * 4)], 0.7), [x, 0.18, 0.75 + R() * 0.2]);
    add(scene, new THREE.CylinderGeometry(0.015, 0.015, 0.18, 4), std(0x3e9a4a), [x, 0.09, f.position.z]);
  }
  scene.add(new THREE.HemisphereLight(0xe8f4ff, 0x6a9a50, 1.3));
  const sun = new THREE.DirectionalLight(0xfff2dc, 2.6);
  sun.position.set(8, 14, 10);
  shadowCfg(sun, 8, 2048, 60);
  scene.add(sun, sun.target);
  const cat = makeCat(BREEDS.kampung, { seed: 7 });
  scene.add(cat.root);
  const stray = makeCat({ ...BREEDS.kampung, coat: 0x2b2b30, dark: 0x111114, white: 0xffffff, pattern: 'solid', eye: 0xe8c33a, kink: 0 }, { seed: 8 });
  scene.add(stray.root);
  return { scene, sky, cat, stray, sun };
}

// ------------------------------------------------------------ globe world
// Very rough continent outlines (lon, lat) for a friendly cartoon Earth.
const LAND = [
  [[-168, 65], [-140, 70], [-95, 72], [-80, 63], [-60, 55], [-55, 48], [-70, 43], [-76, 35], [-81, 25], [-90, 29], [-97, 26], [-105, 20], [-95, 16], [-83, 9], [-80, 8], [-87, 14], [-105, 22], [-112, 30], [-118, 34], [-124, 40], [-125, 49], [-135, 57], [-150, 60], [-165, 60]],
  [[-50, 60], [-42, 60], [-22, 70], [-20, 80], [-40, 83], [-60, 80], [-70, 77], [-55, 70]],
  [[-80, 8], [-60, 10], [-50, 0], [-35, -7], [-40, -22], [-48, -28], [-58, -38], [-65, -42], [-68, -55], [-75, -50], [-73, -38], [-71, -18], [-76, -14], [-81, -5], [-78, 2]],
  [[-10, 36], [-9, 43], [-2, 44], [-5, 48], [2, 51], [8, 54], [10, 58], [5, 62], [15, 69], [28, 71], [40, 67], [45, 55], [40, 45], [28, 41], [22, 36], [15, 38], [12, 44], [5, 43], [0, 38]],
  [[-17, 15], [-17, 21], [-10, 30], [-5, 36], [10, 37], [20, 32], [32, 31], [35, 28], [43, 12], [51, 12], [40, -2], [40, -15], [33, -26], [20, -35], [17, -30], [12, -17], [13, -5], [9, 4], [-5, 5], [-12, 7]],
  [[28, 41], [40, 45], [45, 55], [40, 67], [60, 70], [80, 73], [105, 78], [140, 72], [170, 70], [180, 66], [175, 62], [160, 60], [155, 50], [140, 47], [132, 43], [122, 40], [121, 31], [120, 23], [110, 20], [106, 10], [100, 13], [98, 8], [103, 1.3], [101, 6], [98, 16], [92, 22], [88, 22], [80, 15], [77, 8], [72, 20], [66, 25], [57, 26], [56, 23], [59, 22], [52, 16], [44, 13], [43, 16], [36, 30], [34, 36]],
  [[109, 2], [117, 7], [119, 5], [117, 0], [116, -4], [110, -3]],
  [[95, 5], [98, 4], [106, -6], [102, -4]],
  [[105, -6], [114, -7], [114, -8.5], [106, -7.5]],
  [[131, -1], [141, -3], [150, -10], [141, -9], [133, -4]],
  [[114, -22], [122, -18], [130, -12], [137, -12], [142, -11], [146, -19], [153, -26], [151, -34], [146, -39], [138, -35], [131, -31], [116, -35], [114, -26]],
  [[130, 31], [136, 34], [141, 41], [142, 45], [140, 39], [135, 35]],
  [[-5, 50], [1, 51], [0, 53], [-3, 58], [-6, 57], [-3, 54]],
  [[44, -25], [50, -15], [49, -12], [44, -20]],
  [[166, -46], [174, -41], [178, -38], [173, -35], [172, -41], [167, -45]],
  [[120, 18], [123, 14], [126, 7], [122, 7], [120, 12]],
];
export const lonlatUV = (lon, lat) => [(lon + 180) / 360, (90 - lat) / 180];

export function buildGlobeWorld() {
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x8c7de0, 40, 260);
  const sky = makeSky({ top: 0x1a1660, mid: 0x3c2d94, horizon: 0xa08ae8, bottom: 0x6a5cc0 });
  const stars = makeStars(1200, 1600, 8);
  scene.add(sky, stars);
  scene.add(new THREE.HemisphereLight(0xe8ecff, 0x6a58b8, 1.4));
  const key = new THREE.DirectionalLight(0xfff4e6, 2.2);
  key.position.set(8, 10, 14);
  shadowCfg(key, 10, 2048, 80);
  scene.add(key, key.target);
  // globe texture + land mask
  const TW = 1024, TH = 512;
  const c = document.createElement('canvas');
  c.width = TW;
  c.height = TH;
  const g = c.getContext('2d');
  const oc = g.createLinearGradient(0, 0, 0, TH);
  oc.addColorStop(0, '#5fb2ff');
  oc.addColorStop(0.5, '#2f86ef');
  oc.addColorStop(1, '#5fb2ff');
  g.fillStyle = oc;
  g.fillRect(0, 0, TW, TH);
  const poly = (pts) => {
    g.beginPath();
    pts.forEach(([lo, la], i) => {
      const [u, v] = lonlatUV(lo, la);
      i ? g.lineTo(u * TW, v * TH) : g.moveTo(u * TW, v * TH);
    });
    g.closePath();
  };
  g.lineJoin = 'round';
  for (const p of LAND) {
    poly(p);
    g.lineWidth = 10;
    g.strokeStyle = '#9be37a';
    g.stroke();
    g.fillStyle = '#58c26a';
    g.fill();
  }
  const mask = g.getImageData(0, 0, TW, TH).data;
  // sandy deserts and ice caps
  g.fillStyle = 'rgba(244,214,130,0.85)';
  for (const [lo, la, r] of [[15, 23, 28], [45, 24, 16], [133, -25, 16]]) {
    const [u, v] = lonlatUV(lo, la);
    g.beginPath();
    g.ellipse(u * TW, v * TH, r * 1.6, r, 0, 0, Math.PI * 2);
    g.fill();
  }
  g.fillStyle = '#f4fbff';
  g.fillRect(0, 0, TW, 18);
  g.fillRect(0, TH - 36, TW, 36);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  const GR = 4;
  const globe = new THREE.Group();
  globe.position.set(0, 6.4, -2);
  scene.add(globe);
  const spin = new THREE.Group();
  globe.add(spin);
  const ball = add(spin, new THREE.SphereGeometry(GR, 64, 40), std(0xffffff, 0.55, { map: tex, emissive: 0x10204a, emissiveIntensity: 0.25 }));
  const atm = glow(0x9fd8ff, GR * 3.0, 0.5);
  globe.add(atm);
  // cat-face markers on land
  const faces = ['#f0a04b', '#f6f3ee', '#3a3a40', '#9aa6b8', '#c79a6a', '#f3e6cc', '#e8b9a4'].map((col) => new THREE.SpriteMaterial({ map: catFaceTexture(col), transparent: true, depthWrite: false }));
  const R = rng(4);
  const markers = [];
  let tries = 0;
  while (markers.length < 230 && tries < 20000) {
    tries++;
    const u = R(), v = 0.12 + R() * 0.68;
    const px = Math.floor(u * TW), py = Math.floor(v * TH);
    const i = (py * TW + px) * 4;
    if (!(mask[i + 1] > 150 && mask[i + 2] < 160)) continue;
    const phi = u * Math.PI * 2, th = v * Math.PI;
    const dir = new THREE.Vector3(-Math.cos(phi) * Math.sin(th), Math.cos(th), Math.sin(phi) * Math.sin(th));
    const s = new THREE.Sprite(faces[Math.floor(R() * faces.length)]);
    s.position.copy(dir).multiplyScalar(GR * 1.05);
    s.userData = { born: R(), size: 0.36 + R() * 0.16 };
    s.scale.setScalar(0.0001);
    spin.add(s);
    markers.push(s);
  }
  markers.sort((a, b) => a.userData.born - b.userData.born);
  // floating island Affan stands on
  const island = new THREE.Group();
  island.position.set(-2.2, -0.2, 4.2);
  scene.add(island);
  add(island, new THREE.CylinderGeometry(2.2, 2.4, 0.5, 40), std(0x6fd36a, 0.9), [0, -0.25, 0]);
  add(island, new THREE.ConeGeometry(2.3, 2.4, 40), std(0xb07a4a, 1), [0, -1.7, 0], [Math.PI, 0, 0]);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    add(island, new THREE.SphereGeometry(0.12, 8, 6), std([0xff6fa8, 0xffd84a, 0xffffff][i % 3]), [Math.cos(a) * 1.7, 0.08, Math.sin(a) * 1.7]);
  }
  const aff = makeAffan();
  island.add(aff.root);
  // a little cat friend on the island
  const cat = makeCat(BREEDS.kampung, { seed: 1 });
  cat.root.position.set(1.2, 0, 0.4);
  island.add(cat.root);
  return { scene, sky, stars, globe, spin, ball, markers, island, aff, cat, GR };
}

// ------------------------------------------------------------------- stage
export const STAGE_ORDER = ['kampung', 'parsi', 'siam', 'maineCoon', 'sphynx', 'scottishFold', 'singapura'];
export const RING_R = 3.7;
export const PODIUM_H = 0.6;
const PODIUM_COLS = [0xff8a3d, 0xff6fa8, 0x3fa2ff, 0x9b6bff, 0x43b85c, 0xffc928, 0x2ec4b6];

function sparkleField(n, seed, box) {
  const R = rng(seed);
  const pos = new Float32Array(n * 3), ph = new Float32Array(n), sz = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    pos.set([box[0] + R() * (box[1] - box[0]), box[2] + R() * (box[3] - box[2]), box[4] + R() * (box[5] - box[4])], i * 3);
    ph[i] = R() * 100;
    sz[i] = 6 + R() * 16;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aPh', new THREE.BufferAttribute(ph, 1));
  geo.setAttribute('aSz', new THREE.BufferAttribute(sz, 1));
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 } },
    vertexShader: `attribute float aPh; attribute float aSz; uniform float uTime; varying float vA;
      void main(){ vec3 p = position; p.y += sin(uTime * 0.6 + aPh) * 0.25; vA = 0.5 + 0.5 * sin(uTime * 2.5 + aPh);
      vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_PointSize = aSz * (6.0 / -mv.z); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `varying float vA; void main(){ vec2 p = gl_PointCoord - 0.5; float d = length(p);
      float star = max(0.0, 1.0 - abs(p.x) * 9.0) * max(0.0, 1.0 - abs(p.y) * 1.6) + max(0.0, 1.0 - abs(p.y) * 9.0) * max(0.0, 1.0 - abs(p.x) * 1.6);
      float a = (smoothstep(0.5, 0.0, d) * 0.5 + star) * vA; gl_FragColor = vec4(1.0, 0.95, 0.8, a); }`,
  });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  pts.userData.update = (t) => (mat.uniforms.uTime.value = t);
  return pts;
}

export function buildStage() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1b1650);
  scene.fog = new THREE.Fog(0x1b1650, 26, 70);
  // curtain backdrop (half cylinder with folds)
  const curtTex = canvasTex(1024, 256, (g, w, h) => {
    for (let x = 0; x < w; x++) {
      const k = 0.5 + 0.5 * Math.sin((x / w) * Math.PI * 2 * 26);
      g.fillStyle = `rgb(${Math.round(120 + 70 * k)},${Math.round(40 + 30 * k)},${Math.round(150 + 60 * k)})`;
      g.fillRect(x, 0, 1, h);
    }
  });
  const curtain = add(scene, new THREE.CylinderGeometry(14, 14, 16, 64, 1, true, Math.PI / 2, Math.PI), std(0xffffff, 0.9, { map: curtTex, side: THREE.BackSide }), [0, 7, 1]);
  curtain.castShadow = false;
  // stage floor
  const floorTex = canvasTex(512, 512, (g, w) => {
    g.fillStyle = '#2a2f7a';
    g.fillRect(0, 0, w, w);
    g.strokeStyle = 'rgba(160,180,255,0.25)';
    g.lineWidth = 3;
    for (let i = 0; i <= 8; i++) {
      g.beginPath();
      g.moveTo(i * 64, 0);
      g.lineTo(i * 64, w);
      g.moveTo(0, i * 64);
      g.lineTo(w, i * 64);
      g.stroke();
    }
  }, [12, 12]);
  add(scene, new THREE.PlaneGeometry(120, 120), std(0xffffff, 0.35, { map: floorTex }), [0, 0, 0], [-Math.PI / 2, 0, 0]).castShadow = false;
  // carousel
  const carousel = new THREE.Group();
  scene.add(carousel);
  add(carousel, new THREE.CylinderGeometry(5.0, 5.2, 0.32, 64), std(0xfff3e0, 0.4), [0, 0.16, 0]);
  add(carousel, new THREE.TorusGeometry(5.1, 0.07, 8, 96), std(0xffc928, 0.3, { emissive: 0xb07a00, emissiveIntensity: 0.4 }), [0, 0.3, 0], [Math.PI / 2, 0, 0]);
  const bulbs = new THREE.InstancedMesh(new THREE.SphereGeometry(0.07, 8, 6), new THREE.MeshBasicMaterial({ color: 0xfff2b0 }), 48);
  const m4 = new THREE.Matrix4();
  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * Math.PI * 2;
    bulbs.setMatrixAt(i, m4.makeTranslation(Math.sin(a) * 5.13, 0.16, Math.cos(a) * 5.13));
  }
  carousel.add(bulbs);
  // centre dais for Affan
  add(carousel, new THREE.CylinderGeometry(1.1, 1.25, 0.3, 40), std(0xffc928, 0.4), [0, 0.47, 0]);
  const cats = [];
  STAGE_ORDER.forEach((key, i) => {
    const a = (i / STAGE_ORDER.length) * Math.PI * 2;
    const pod = new THREE.Group();
    pod.position.set(Math.sin(a) * RING_R, 0.32, Math.cos(a) * RING_R);
    pod.rotation.y = a;
    carousel.add(pod);
    add(pod, new THREE.CylinderGeometry(0.95, 1.05, PODIUM_H, 40), std(PODIUM_COLS[i], 0.45), [0, PODIUM_H / 2, 0]);
    add(pod, new THREE.CylinderGeometry(0.98, 0.98, 0.08, 40), std(0xffffff, 0.4), [0, PODIUM_H, 0]);
    add(pod, new THREE.TorusGeometry(1.0, 0.04, 8, 48), std(0xffe58a, 0.3, { emissive: 0xffc928, emissiveIntensity: 0.6 }), [0, PODIUM_H * 0.5, 0], [Math.PI / 2, 0, 0]);
    const cat = makeCat(BREEDS[key], { seed: 11 + i });
    cat.root.position.set(0, PODIUM_H + 0.04, 0);
    pod.add(cat.root);
    cats.push({ key, cat, pod, a });
  });
  // lights
  scene.add(new THREE.HemisphereLight(0xd8d8ff, 0x3a2a70, 1.15));
  const spot = new THREE.SpotLight(0xfff2dc, 260, 30, 0.42, 0.55, 1.6);
  spot.position.set(0, 10, 9.5);
  spot.castShadow = true;
  spot.shadow.mapSize.set(2048, 2048);
  spot.shadow.bias = -0.0004;
  spot.shadow.normalBias = 0.03;
  spot.target.position.set(0, 0.9, RING_R);
  scene.add(spot, spot.target);
  const wash = new THREE.DirectionalLight(0xffd8f0, 0.9);
  wash.position.set(-6, 8, 10);
  scene.add(wash);
  const rimL = new THREE.PointLight(0x7fb4ff, 30, 20, 1.6);
  rimL.position.set(-5, 5, -4);
  const rimR = new THREE.PointLight(0xff8ad8, 30, 20, 1.6);
  rimR.position.set(5, 5, -4);
  scene.add(rimL, rimR);
  // visible spotlight beam
  const beamMat = new THREE.MeshBasicMaterial({ color: 0xfff4d0, transparent: true, opacity: 0.1, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const beamGeo = new THREE.ConeGeometry(1.6, 9.5, 40, 1, true);
  beamGeo.translate(0, -4.75, 0);
  const beam = new THREE.Mesh(beamGeo, beamMat);
  beam.position.set(0, 9.6, RING_R);
  scene.add(beam);
  const sparkles = sparkleField(420, 6, [-12, 12, 0.5, 11, -8, 8]);
  scene.add(sparkles);
  const aff = makeAffan();
  scene.add(aff.root);

  // ---- crowd stand (off to the side of the stage)
  const crowd = new THREE.Group();
  crowd.position.set(60, 0, 0);
  scene.add(crowd);
  const R = rng(31);
  const stepCols = [0xff8a3d, 0xffc928, 0x43b85c, 0x3fa2ff];
  const crowdCats = [];
  const rows = [9, 8, 9, 8];
  rows.forEach((n, r) => {
    const y = r * 0.7, z = -r * 1.45;
    add(crowd, rbox(n * 1.25 + 1.2, 0.7, 1.45, 0.1), std(stepCols[r], 0.5), [0, y + 0.35, z]);
    for (let i = 0; i < n; i++) {
      const c = makeCat(crowdBreed(R), { seed: 100 + r * 20 + i, detail: 0.4 });
      c.root.position.set((i - (n - 1) / 2) * 1.25 + (R() - 0.5) * 0.15, y + 0.7, z + 0.15);
      c.root.rotation.y = (R() - 0.5) * 0.5;
      c.root.userData.ph = R() * 10;
      crowd.add(c.root);
      crowdCats.push(c);
    }
  });
  add(crowd, new THREE.PlaneGeometry(40, 18), std(0x6a3fb0, 0.9), [0, 6, -7]).castShadow = false;
  const bunting = new THREE.Group();
  crowd.add(bunting);
  for (let i = 0; i < 26; i++) {
    const f = add(bunting, new THREE.ConeGeometry(0.28, 0.6, 3), std([0xff6fa8, 0xffd84a, 0x3fa2ff, 0x43b85c][i % 4], 0.8), [-13 + i * 1.04, 6.4 - 0.4 * Math.sin((i / 25) * Math.PI), -6.4], [Math.PI, 0, 0]);
    f.castShadow = false;
  }
  const crowdKey = new THREE.DirectionalLight(0xfff4e6, 2.0);
  crowdKey.position.set(64, 12, 14);
  crowdKey.target.position.set(60, 0, -2);
  shadowCfg(crowdKey, 9, 2048, 60);
  scene.add(crowdKey, crowdKey.target);
  return { scene, carousel, cats, spot, beam, sparkles, aff, crowd, crowdCats };
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
