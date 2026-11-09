// Episode 025 sets: Affan's bedroom (real world), the "inside the body"
// imagination world (blood vessel, brain control room, giant thermometer,
// white blood cells vs germs) and the branded outro stage.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { rng, clamp } from '../../shared/core.js';
import { makeAffan, AFFAN } from '../../shared/affan.js';
import { add, makeSky, glow } from '../../shared/props.js';

const std = (color, rough = 0.6, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0, ...extra });
const basic = (color, extra = {}) => new THREE.MeshBasicMaterial({ color, ...extra });

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function shadowCfg(light, size, map = 2048) {
  light.castShadow = true;
  light.shadow.mapSize.set(map, map);
  const c = light.shadow.camera;
  c.left = -size;
  c.right = size;
  c.top = size;
  c.bottom = -size;
  c.near = 1;
  c.far = 120;
  light.shadow.bias = -0.0005;
  light.shadow.normalBias = 0.03;
}

// Fever flush: the blush material is shared by both cheeks of one Affan.
export function blushOf(aff) {
  let mat = null;
  const meshes = [];
  aff.root.traverse((o) => {
    if (o.material && o.material.isMeshBasicMaterial && o.material.transparent && Math.abs(o.material.opacity - 0.32) < 0.01) {
      mat = o.material;
      meshes.push({ o, p: o.position.clone() });
    }
  });
  return (k) => {
    if (!mat) return;
    k = clamp(k);
    mat.opacity = 0.32 + 0.5 * k;
    mat.color.setHex(k > 0.05 ? 0xff4f5a : AFFAN.blush);
    for (const m of meshes) {
      m.o.scale.setScalar(1 + 0.9 * k);
      m.o.position.copy(m.p).multiplyScalar(1 + 0.06 * k);
    }
  };
}

// A drinking glass with water, used on the bedside table and in Affan's hand.
export function makeGlass(s = 1) {
  const g = new THREE.Group();
  const glass = new THREE.MeshPhysicalMaterial({ color: 0xeaf6ff, roughness: 0.05, transparent: true, opacity: 0.35, depthWrite: false });
  add(g, new THREE.CylinderGeometry(0.2 * s, 0.17 * s, 0.55 * s, 24, 1, true), glass, [0, 0.275 * s, 0], [0, 0, 0], [1, 1, 1], false).material.side = THREE.DoubleSide;
  add(g, new THREE.CylinderGeometry(0.175 * s, 0.155 * s, 0.38 * s, 24), std(0x6cc6ff, 0.2, { transparent: true, opacity: 0.75, emissive: 0x2a8fd8, emissiveIntensity: 0.25 }), [0, 0.2 * s, 0], [0, 0, 0], [1, 1, 1], false);
  return g;
}

// ------------------------------------------------------------------ bedroom
export function buildBedroom() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x9fd4d0);
  scene.add(new THREE.HemisphereLight(0xfff4e6, 0x8a6a58, 1.35));
  const key = new THREE.DirectionalLight(0xfff0dc, 2.3);
  key.position.set(-6, 9, 7);
  key.target.position.set(0, 1.5, 0);
  shadowCfg(key, 7);
  scene.add(key, key.target);
  const lampLight = new THREE.PointLight(0xffc27a, 6, 9, 1.6);
  lampLight.position.set(2.75, 3.3, -1.9);
  scene.add(lampLight);
  const winLight = new THREE.PointLight(0xcfe6ff, 5, 10, 1.6);
  winLight.position.set(-3.4, 4.8, -1.2);
  scene.add(winLight);

  // floor, walls, skirting
  const floorTex = canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#d7a777';
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 8; i++) {
      g.fillStyle = i % 2 ? '#cf9d6c' : '#dcae80';
      g.fillRect(0, i * 64, w, 62);
      g.fillStyle = 'rgba(120,70,30,0.25)';
      g.fillRect(0, i * 64 + 62, w, 2);
      g.fillRect(((i * 197) % 400) + 40, i * 64, 2, 62);
    }
  });
  floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping;
  floorTex.repeat.set(6, 6);
  add(scene, new THREE.PlaneGeometry(40, 40), std(0xffffff, 0.8, { map: floorTex }), [0, 0, 0], [-Math.PI / 2, 0, 0]);
  const wallTex = canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#bfe6e0';
    g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(255,255,255,0.35)';
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
      g.beginPath();
      g.arc(x * 64 + (y % 2) * 32 + 16, y * 64 + 32, 5, 0, Math.PI * 2);
      g.fill();
    }
  });
  wallTex.wrapS = wallTex.wrapT = THREE.RepeatWrapping;
  wallTex.repeat.set(5, 2.5);
  add(scene, new THREE.PlaneGeometry(40, 16), std(0xffffff, 0.95, { map: wallTex }), [0, 8, -3.2]);
  const sideTex = wallTex.clone();
  sideTex.needsUpdate = true;
  add(scene, new THREE.PlaneGeometry(40, 16), std(0xe6f6f2, 0.95, { map: sideTex }), [-7.5, 8, 0], [0, Math.PI / 2, 0]);
  add(scene, new THREE.PlaneGeometry(40, 16), std(0xe6f6f2, 0.95, { map: sideTex }), [8.5, 8, 0], [0, -Math.PI / 2, 0]);
  add(scene, new THREE.BoxGeometry(40, 0.35, 0.08), std(0xffffff, 0.6), [0, 0.175, -3.16]);

  // window with day sky and curtains (back wall, left)
  const skyTex = canvasTex(256, 256, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, '#6fb8ff');
    gr.addColorStop(1, '#d6efff');
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#ffffff';
    for (const [x, y, r] of [[60, 90, 26], [90, 80, 32], [124, 92, 24], [180, 160, 20], [205, 152, 26], [228, 162, 18]]) {
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.fill();
    }
    g.fillStyle = '#7fc96b';
    g.beginPath();
    g.ellipse(70, 260, 140, 60, 0, 0, Math.PI * 2);
    g.ellipse(220, 270, 120, 70, 0, 0, Math.PI * 2);
    g.fill();
  });
  const wx = -3.6, wy = 5.0;
  add(scene, new THREE.PlaneGeometry(2.6, 2.6), basic(0xffffff, { map: skyTex }), [wx, wy, -3.17], [0, 0, 0], [1, 1, 1], false);
  const frame = std(0xffffff, 0.5);
  for (const [x, y, w, h] of [[0, 1.35, 2.9, 0.18], [0, -1.35, 2.9, 0.18], [-1.35, 0, 0.18, 2.9], [1.35, 0, 0.18, 2.9], [0, 0, 0.1, 2.7], [0, 0, 2.7, 0.1]]) add(scene, new THREE.BoxGeometry(w, h, 0.14), frame, [wx + x, wy + y, -3.1]);
  add(scene, new THREE.BoxGeometry(3.3, 0.14, 0.45), frame, [wx, wy - 1.5, -2.95]);
  const curtain = std(0xffa98a, 0.9);
  for (const s of [-1, 1]) {
    for (let i = 0; i < 4; i++) add(scene, new THREE.CylinderGeometry(0.14, 0.17, 3.6, 12), curtain, [wx + s * (1.6 + i * 0.22), wy - 0.2, -2.9 + (i % 2) * 0.08]);
  }
  add(scene, new THREE.CylinderGeometry(0.05, 0.05, 4.6, 8), std(0x8a5a3c, 0.5), [wx, wy + 1.7, -2.9], [0, 0, Math.PI / 2]);

  // wall decor: framed drawing, star decals, shelf with books
  const artTex = canvasTex(256, 200, (g, w, h) => {
    g.fillStyle = '#fffaf0';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#ffd84a';
    g.beginPath();
    g.arc(200, 50, 28, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#5fc46a';
    g.fillRect(0, 150, w, 50);
    g.fillStyle = '#ff7a5c';
    g.fillRect(60, 95, 70, 55);
    g.fillStyle = '#3d6fd8';
    g.beginPath();
    g.moveTo(50, 98);
    g.lineTo(95, 55);
    g.lineTo(140, 98);
    g.fill();
  });
  add(scene, new THREE.BoxGeometry(1.5, 1.2, 0.08), std(0xffcf5a, 0.6), [1.0, 5.6, -3.12]);
  add(scene, new THREE.PlaneGeometry(1.3, 1.0), basic(0xffffff, { map: artTex }), [1.0, 5.6, -3.07], [0, 0, 0], [1, 1, 1], false);
  const starShape = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? 0.12 : 0.28, a = (i / 10) * Math.PI * 2 + Math.PI / 2;
    starShape[i ? 'lineTo' : 'moveTo'](Math.cos(a) * r, Math.sin(a) * r);
  }
  const starGeo = new THREE.ShapeGeometry(starShape);
  for (const [x, y, c] of [[3.0, 6.4, 0xffd84a], [3.7, 5.7, 0xffffff], [-1.2, 6.7, 0xffffff], [4.6, 6.6, 0xffb3d1]]) add(scene, starGeo, basic(c), [x, y, -3.15], [0, 0, 0], [1, 1, 1], false);
  add(scene, new THREE.BoxGeometry(2.2, 0.1, 0.5), std(0x8a5a3c, 0.6), [4.6, 4.3, -2.95]);
  const R = rng(25);
  for (let i = 0; i < 6; i++) {
    const h = 0.55 + R() * 0.25;
    add(scene, new THREE.BoxGeometry(0.16, h, 0.38), std([0xff7a5c, 0x3d8bff, 0xffc93d, 0x5fc46a][i % 4], 0.7), [3.75 + i * 0.2, 4.35 + h / 2, -2.95], [0, 0, i === 5 ? 0.3 : 0]);
  }

  // bed: head against the back wall, Affan faces +z
  const wood = std(0x9a6640, 0.55);
  add(scene, new RoundedBoxGeometry(3.8, 3.2, 0.3, 3, 0.12), wood, [0, 1.6, -2.85]);
  add(scene, new RoundedBoxGeometry(3.8, 0.6, 5.8, 3, 0.1), wood, [0, 0.6, 0.0]);
  add(scene, new RoundedBoxGeometry(3.8, 1.4, 0.26, 3, 0.1), wood, [0, 0.9, 2.9]);
  add(scene, new RoundedBoxGeometry(3.55, 0.5, 5.4, 4, 0.2), std(0xfdfaf3, 0.85), [0, 1.15, -0.05]);
  add(scene, new RoundedBoxGeometry(2.6, 0.6, 1.0, 4, 0.28), std(0xffffff, 0.85), [0, 1.75, -2.25], [-0.35, 0, 0]);
  const blanketTex = canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#6fa8ff';
    g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(255,255,255,0.9)';
    const Rb = rng(9);
    for (let i = 0; i < 26; i++) {
      const x = Rb() * w, y = Rb() * h, r = 8 + Rb() * 10;
      g.beginPath();
      for (let k = 0; k < 10; k++) {
        const rr = k % 2 ? r * 0.45 : r, a = (k / 10) * Math.PI * 2;
        g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
      }
      g.fill();
    }
    g.fillStyle = '#ffd84a';
    g.fillRect(0, 40, w, 18);
  });
  const blanket = add(scene, new RoundedBoxGeometry(3.75, 0.6, 3.9, 5, 0.28), std(0xffffff, 0.9, { map: blanketTex }), [0, 1.62, 1.05]);
  add(scene, new THREE.CylinderGeometry(0.22, 0.22, 3.7, 20), std(0xfdfaf3, 0.85), [0, 1.86, -0.85], [0, 0, Math.PI / 2]);

  // bedside table with lamp and a glass of water (Affan's left = +x)
  add(scene, new RoundedBoxGeometry(1.3, 1.5, 1.2, 3, 0.08), std(0xffffff, 0.6), [2.75, 0.75, -2.3]);
  add(scene, new THREE.BoxGeometry(0.9, 0.06, 0.04), std(0x9a6640, 0.5), [2.75, 1.05, -1.68]);
  add(scene, new THREE.CylinderGeometry(0.25, 0.3, 0.12, 20), std(0xffcf5a, 0.5), [2.75, 1.56, -2.45]);
  add(scene, new THREE.CylinderGeometry(0.05, 0.05, 0.9, 10), std(0xffcf5a, 0.5), [2.75, 2.0, -2.45]);
  add(scene, new THREE.CylinderGeometry(0.32, 0.55, 0.6, 24, 1, true), std(0xfff3d6, 0.8, { emissive: 0xffc27a, emissiveIntensity: 0.6, side: THREE.DoubleSide }), [2.75, 2.6, -2.45]);
  const lg = glow(0xffd59a, 2.8, 0.5);
  lg.position.set(2.75, 2.6, -2.3);
  scene.add(lg);
  const tableGlass = makeGlass();
  tableGlass.position.set(2.55, 1.5, -1.95);
  scene.add(tableGlass);
  add(scene, new THREE.CylinderGeometry(1.9, 1.9, 0.03, 40), std(0xffb3c7, 0.95), [-3.8, 0.02, 2.2], [0, 0, 0], [1.3, 1, 0.9]);

  const aff = makeAffan();
  aff.root.position.set(0, 0.62, -1.35);
  scene.add(aff.root);
  const handGlass = makeGlass(0.62);
  handGlass.visible = false;
  aff.parts.arms.R.hand.add(handGlass);
  return { scene, aff, blanket, tableGlass, handGlass, blush: blushOf(aff), lampLight };
}

// --------------------------------------------------------------- body bits
// Red blood cell: a soft donut (biconcave disc).
const rbcGeo = new THREE.TorusGeometry(0.42, 0.26, 16, 32);
const rbcMat = std(0xe8394f, 0.45, { emissive: 0x7a0f1d, emissiveIntensity: 0.35 });

// Drifting blood cells as one instanced mesh; positions are a pure function of t.
function cellCloud(n, seed, box, flow = [1, 0, 0], speed = 2, scale = 1) {
  const R = rng(seed);
  const im = new THREE.InstancedMesh(rbcGeo, rbcMat, n);
  im.frustumCulled = false;
  const data = [];
  for (let i = 0; i < n; i++) data.push({ p: [box[0] + R() * (box[1] - box[0]), box[2] + R() * (box[3] - box[2]), box[4] + R() * (box[5] - box[4])], r: [R() * 6, R() * 6, R() * 6], sp: 0.6 + R() * 0.8, s: (0.7 + R() * 0.6) * scale, ph: R() * 10 });
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3();
  const len = [box[1] - box[0], box[3] - box[2], box[5] - box[4]];
  im.userData.update = (t) => {
    data.forEach((d, i) => {
      const off = t * speed * d.sp;
      const p = [0, 1, 2].map((k) => {
        let x = d.p[k] + flow[k] * off - box[k * 2];
        x = ((x % len[k]) + len[k]) % len[k];
        return box[k * 2] + x;
      });
      v.set(p[0], p[1] + Math.sin(t * 0.9 + d.ph) * 0.3, p[2]);
      e.set(d.r[0] + t * 0.4 * d.sp, d.r[1] + t * 0.3, d.r[2]);
      q.setFromEuler(e);
      sc.setScalar(d.s);
      im.setMatrixAt(i, m.compose(v, q, sc));
    });
    im.instanceMatrix.needsUpdate = true;
  };
  im.userData.update(0);
  return im;
}

// Cute eyes (+ optional angry brows) on a creature, facing +z.
function eyes(parent, { r = 0.17, gap = 0.22, y = 0.12, z = 0.62, angry = false, scale = 1 } = {}) {
  const out = [];
  for (const s of [-1, 1]) {
    const g = new THREE.Group();
    g.position.set(gap * s * scale, y * scale, z * scale);
    parent.add(g);
    add(g, new THREE.SphereGeometry(r * scale, 20, 14), std(0xffffff, 0.3, { emissive: 0xffffff, emissiveIntensity: 0.1 }), [0, 0, 0], [0, 0, 0], [1, 1.15, 0.6]);
    const pupil = add(g, new THREE.SphereGeometry(r * 0.55 * scale, 16, 12), std(0x15101a, 0.2), [0, -0.01 * scale, r * 0.45 * scale], [0, 0, 0], [1, 1.1, 0.5]);
    add(pupil, new THREE.SphereGeometry(r * 0.18 * scale, 10, 8), basic(0xffffff), [r * 0.2 * scale, r * 0.25 * scale, r * 0.3 * scale]);
    if (angry) add(g, new THREE.BoxGeometry(r * 2.1 * scale, r * 0.45 * scale, r * 0.4 * scale), std(0x1e2a12, 0.6), [0, r * 1.25 * scale, r * 0.3 * scale], [0, 0, -0.45 * s]);
    out.push({ g, pupil });
  }
  return out;
}

// Germ: spiky round blob with a cheeky frown. kind 0 = green, 1 = purple.
export function makeGerm(kind = 0, seed = 1) {
  const R = rng(seed);
  const col = [0x7fd94f, 0xb47cff, 0x4fd1b0][kind % 3];
  const dark = [0x4f9a2b, 0x7a45c8, 0x2a9a80][kind % 3];
  const g = new THREE.Group();
  const body = new THREE.Group();
  g.add(body);
  const mat = std(col, 0.5, { emissive: dark, emissiveIntensity: 0.25 });
  add(body, new THREE.IcosahedronGeometry(0.62, 4), mat);
  const spikes = [];
  const n = 16;
  for (let i = 0; i < n; i++) {
    const y = 1 - (2 * (i + 0.5)) / n, r = Math.sqrt(1 - y * y), a = i * 2.39996;
    const dir = new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r);
    if (dir.z > 0.55 && Math.abs(dir.y) < 0.5) continue; // keep the face clear
    const sp = new THREE.Group();
    sp.position.copy(dir).multiplyScalar(0.55);
    sp.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    add(sp, new THREE.CylinderGeometry(0.05, 0.08, 0.32, 8), mat, [0, 0.16, 0]);
    add(sp, new THREE.SphereGeometry(0.1, 12, 8), std(dark, 0.5), [0, 0.34, 0]);
    body.add(sp);
    spikes.push({ sp, ph: R() * 6 });
  }
  for (let i = 0; i < 5; i++) add(body, new THREE.SphereGeometry(0.06 + R() * 0.05, 10, 8), std(dark, 0.6), [(R() - 0.5) * 0.9, (R() - 0.2) * 0.8, -0.3 - R() * 0.25]);
  const ey = eyes(body, { r: 0.15, gap: 0.2, y: 0.12, z: 0.53, angry: true });
  const mouth = add(body, new THREE.TorusGeometry(0.13, 0.035, 8, 20, Math.PI), std(0x2a1020, 0.5), [0, -0.16, 0.6], [0, 0, 0]);
  const sweat = [];
  for (const [x, y] of [[0.42, 0.45], [-0.5, 0.3], [0.55, -0.05]]) {
    const d = add(body, new THREE.SphereGeometry(0.07, 12, 10), std(0x8fd8ff, 0.1, { emissive: 0x3fa2ff, emissiveIntensity: 0.4 }), [x, y, 0.4], [0, 0, 0], [1, 1.5, 1], false);
    d.visible = false;
    sweat.push(d);
  }
  g.userData = {
    body, ey, sweat,
    update(t, { hot = 0, squash = 0 } = {}) {
      for (const s of spikes) s.sp.scale.setScalar(1 + 0.12 * Math.sin(t * 6 + s.ph));
      body.rotation.z = 0.12 * Math.sin(t * 2.3 + seed);
      body.scale.set(1 + 0.05 * Math.sin(t * 4 + seed) + squash * 0.25, 1 - 0.05 * Math.sin(t * 4 + seed) - squash * 0.25, 1);
      mouth.rotation.z = Math.PI; // frown
      mouth.scale.set(1 + hot * 0.3, 1 + hot * 0.6, 1);
      sweat.forEach((d, i) => {
        d.visible = hot > 0.1;
        d.position.y = [0.45, 0.3, -0.05][i] - ((t * 0.6 + i * 0.33) % 1) * 0.3 * hot;
      });
      mat.emissive.setHex(hot > 0.05 ? 0xff5a2a : dark);
      mat.emissiveIntensity = 0.25 + 0.35 * hot;
    },
  };
  return g;
}

// White blood cell: a friendly lumpy white blob wearing a little soldier helmet.
export function makeWBC(seed = 1) {
  const R = rng(seed);
  const g = new THREE.Group();
  const body = new THREE.Group();
  g.add(body);
  const mat = std(0xf6f3ff, 0.55, { emissive: 0xc8c0ff, emissiveIntensity: 0.18 });
  add(body, new THREE.IcosahedronGeometry(0.8, 4), mat, [0, 0, 0], [0, 0, 0], [1, 0.92, 0.95]);
  for (let i = 0; i < 9; i++) {
    const a = R() * Math.PI * 2, y = (R() - 0.5) * 1.1;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const d = new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r * 0.7 - 0.25).normalize();
    add(body, new THREE.SphereGeometry(0.28 + R() * 0.12, 16, 12), mat, d.multiplyScalar(0.68).toArray());
  }
  // nucleus glimpse
  add(body, new THREE.SphereGeometry(0.22, 14, 10), std(0xb9a6ff, 0.5), [0.45, -0.35, 0.55], [0, 0, 0], [1.2, 0.8, 0.4]);
  const ey = eyes(body, { r: 0.18, gap: 0.24, y: 0.05, z: 0.7 });
  const smile = add(body, new THREE.TorusGeometry(0.15, 0.04, 8, 20, Math.PI), std(0x3a2050, 0.5), [0, -0.2, 0.74], [0, 0, Math.PI]);
  for (const s of [-1, 1]) add(body, new THREE.SphereGeometry(0.09, 12, 8), basic(0xff9fb0, { transparent: true, opacity: 0.6 }), [0.42 * s, -0.12, 0.66], [0, 0, 0], [1, 0.6, 0.3], false);
  // helmet
  const hel = new THREE.Group();
  hel.position.set(0, 0.42, 0);
  hel.rotation.x = -0.15;
  body.add(hel);
  add(hel, new THREE.SphereGeometry(0.62, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), std(0x4f7a3a, 0.55));
  add(hel, new THREE.CylinderGeometry(0.7, 0.7, 0.06, 28), std(0x3f6630, 0.55), [0, 0.02, 0.05]);
  const st = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? 0.06 : 0.14, a = (i / 10) * Math.PI * 2 + Math.PI / 2;
    st[i ? 'lineTo' : 'moveTo'](Math.cos(a) * r, Math.sin(a) * r);
  }
  add(hel, new THREE.ShapeGeometry(st), basic(0xffd84a, { side: THREE.DoubleSide }), [0, 0.3, 0.53], [-0.55, 0, 0], [1, 1, 1], false);
  g.userData = {
    body,
    update(t, { cheer = 0, squash = 0 } = {}) {
      body.position.y = 0.08 * Math.sin(t * 3 + seed) + cheer * Math.abs(Math.sin(t * 9)) * 0.35;
      body.scale.set(1 + squash * 0.2, 1 - squash * 0.2, 1 + squash * 0.1);
      smile.scale.set(1 + cheer * 0.4, 1 + cheer * 0.8, 1);
    },
  };
  return g;
}

// Brain with a friendly face; `alarm` widens the eyes.
function makeBrain() {
  const g = new THREE.Group();
  const R = rng(4);
  const pink = std(0xff9fbf, 0.5, { emissive: 0xd0507a, emissiveIntensity: 0.18 });
  const pink2 = std(0xffb6cf, 0.5, { emissive: 0xd0507a, emissiveIntensity: 0.15 });
  for (const s of [-1, 1]) {
    const hemi = new THREE.Group();
    hemi.position.x = 0.62 * s;
    g.add(hemi);
    add(hemi, new THREE.SphereGeometry(1, 32, 24), pink, [0, 0, 0], [0, 0, 0], [0.62, 0.95, 1.35]);
    for (let i = 0; i < 26; i++) {
      const a = R() * Math.PI * 2, y = (R() - 0.35) * 1.4;
      const r = Math.sqrt(Math.max(0.05, 1 - (y * 0.85) ** 2));
      const p = [Math.cos(a) * 0.55 * r * (Math.cos(a) * s > 0 ? 1 : 0.4), y * 0.8, Math.sin(a) * 1.2 * r];
      add(hemi, new THREE.CapsuleGeometry(0.2, 0.35 + R() * 0.3, 6, 12), i % 2 ? pink : pink2, p, [R() * 3, R() * 3, R() * 3]);
    }
  }
  const face = new THREE.Group();
  face.position.set(0, -0.15, 1.28);
  g.add(face);
  const ey = eyes(face, { r: 0.24, gap: 0.42, y: 0.15, z: 0.05 });
  const mouth = add(face, new THREE.TorusGeometry(0.2, 0.05, 8, 20, Math.PI), std(0x7a1e3a, 0.5), [0, -0.3, 0.12], [0, 0, Math.PI]);
  const oMouth = add(face, new THREE.SphereGeometry(0.17, 16, 12), std(0x7a1e3a, 0.5), [0, -0.33, 0.1], [0, 0, 0], [1, 1.2, 0.4]);
  oMouth.visible = false;
  g.userData = {
    update(t, alarm = 0) {
      g.scale.setScalar(1 + 0.02 * Math.sin(t * 2.5));
      for (const e of ey) e.g.scale.setScalar(1 + 0.35 * alarm);
      mouth.visible = alarm < 0.3;
      oMouth.visible = alarm >= 0.3;
    },
  };
  return g;
}

// Gauge face (blue = cool, red = hot) for the brain's heater dial.
const gaugeTex = canvasTex(512, 300, (g, w, h) => {
  g.fillStyle = '#17256b';
  g.beginPath();
  g.roundRect(0, 0, w, h, 40);
  g.fill();
  const cx = w / 2, cy = h - 40;
  for (let i = 0; i < 60; i++) {
    const a0 = Math.PI + (i / 60) * Math.PI, a1 = Math.PI + ((i + 1.2) / 60) * Math.PI;
    const k = i / 59;
    g.strokeStyle = `rgb(${Math.round(60 + 195 * k)},${Math.round(160 - 90 * k + 60 * Math.sin(k * Math.PI))},${Math.round(255 - 215 * k)})`;
    g.lineWidth = 46;
    g.beginPath();
    g.arc(cx, cy, 190, a0, a1);
    g.stroke();
  }
  g.fillStyle = '#ffffff';
  g.font = '800 44px "Baloo 2", sans-serif';
  g.textAlign = 'center';
  g.fillText('SEJUK', 95, h - 20);
  g.fillText('PANAS', w - 95, h - 20);
});

function makePanel() {
  const g = new THREE.Group();
  add(g, new RoundedBoxGeometry(4.0, 2.6, 1.2, 4, 0.25), std(0x5b6fd8, 0.5), [0, 1.3, 0]);
  add(g, new RoundedBoxGeometry(4.2, 0.35, 1.5, 3, 0.12), std(0x3d4fb8, 0.5), [0, 2.7, 0.1]);
  add(g, new THREE.PlaneGeometry(2.4, 1.4), basic(0xffffff, { map: gaugeTex }), [-0.65, 1.55, 0.61], [0, 0, 0], [1, 1, 1], false);
  for (const [x, c] of [[-1.5, 0x7cf0a8], [-1.1, 0xffd84a], [-0.7, 0x8fd8ff]]) add(g, new THREE.SphereGeometry(0.1, 12, 8), basic(c), [x, 0.5, 0.62], [0, 0, 0], [1, 1, 1], false);
  const needle = new THREE.Group();
  needle.position.set(-0.65, 1.0, 0.64);
  g.add(needle);
  add(needle, new THREE.BoxGeometry(0.07, 0.85, 0.04), basic(0xffffff), [0, 0.45, 0], [0, 0, 0], [1, 1, 1], false);
  add(needle, new THREE.CylinderGeometry(0.11, 0.11, 0.06, 16), basic(0xffd84a), [0, 0, 0.02], [Math.PI / 2, 0, 0], [1, 1, 1], false);
  // big heater knob
  const knob = new THREE.Group();
  knob.position.set(1.35, 1.25, 0.62);
  g.add(knob);
  add(knob, new THREE.CylinderGeometry(0.42, 0.46, 0.3, 32), std(0xff5a3d, 0.4), [0, 0, 0.15], [Math.PI / 2, 0, 0]);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    add(knob, new THREE.BoxGeometry(0.08, 0.1, 0.28), std(0xd8432a, 0.4), [Math.cos(a) * 0.45, Math.sin(a) * 0.45, 0.15], [0, 0, a]);
  }
  add(knob, new THREE.BoxGeometry(0.1, 0.36, 0.06), basic(0xffffff), [0, 0.18, 0.32], [0, 0, 0], [1, 1, 1], false);
  // alarm siren
  const sirenMat = std(0xff3b3b, 0.3, { emissive: 0xff2020, emissiveIntensity: 0.2, transparent: true, opacity: 0.92 });
  add(g, new THREE.CylinderGeometry(0.42, 0.48, 0.2, 24), std(0x2a3570, 0.5), [0, 2.97, 0.1]);
  add(g, new THREE.SphereGeometry(0.4, 24, 14, 0, Math.PI * 2, 0, Math.PI / 2), sirenMat, [0, 3.06, 0.1]);
  const sirenGlow = glow(0xff4040, 4, 0);
  sirenGlow.position.set(0, 3.25, 0.2);
  g.add(sirenGlow);
  // signal antenna: little bulbs that blink when the alarm goes
  g.userData = {
    knob, needle,
    set(t, { heat = 0, alarm = 0 } = {}) {
      knob.rotation.z = -heat * Math.PI * 1.2;
      needle.rotation.z = Math.PI / 2 - heat * Math.PI * 0.92 - 0.02;
      const on = alarm > 0 ? 0.5 + 0.5 * Math.sin(t * 18) : 0;
      sirenMat.emissiveIntensity = 0.2 + 2.2 * on * alarm;
      sirenGlow.material.opacity = 0.9 * on * alarm;
    },
  };
  return g;
}

// Giant thermometer; set(level) where level is degrees Celsius (35..41).
function makeThermometer() {
  const g = new THREE.Group();
  const H0 = 1.4, PER = 1.0; // y of 35 °C and units per degree
  const yOf = (c) => H0 + (c - 35) * PER;
  add(g, new RoundedBoxGeometry(2.2, 0.4, 2.2, 3, 0.15), std(0x5b6fd8, 0.5), [0, 0.2, 0]);
  add(g, new RoundedBoxGeometry(1.5, 8.6, 0.3, 3, 0.12), std(0xffffff, 0.45), [0, 4.6, -0.45]);
  const glass = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.05, transparent: true, opacity: 0.28, depthWrite: false });
  add(g, new THREE.CylinderGeometry(0.34, 0.34, 7.4, 28, 1, true), glass, [0, 5.0, 0], [0, 0, 0], [1, 1, 1], false).material.side = THREE.DoubleSide;
  add(g, new THREE.SphereGeometry(0.34, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), glass, [0, 8.7, 0], [0, 0, 0], [1, 1, 1], false);
  const red = std(0xff3b3b, 0.3, { emissive: 0xff2020, emissiveIntensity: 0.35 });
  add(g, new THREE.SphereGeometry(0.72, 32, 20), red, [0, 1.0, 0]);
  add(g, new THREE.SphereGeometry(0.2, 12, 8), basic(0xffffff, { transparent: true, opacity: 0.7 }), [-0.28, 1.25, 0.55], [0, 0, 0], [1, 1.3, 0.5], false);
  const col = new THREE.Group();
  col.position.set(0, 1.3, 0);
  g.add(col);
  add(col, new THREE.CylinderGeometry(0.2, 0.2, 1, 20), red, [0, 0.5, 0]);
  // tick marks: every 0.5 °C, long ticks on whole degrees
  for (let c = 35; c <= 41.01; c += 0.5) {
    const whole = Math.abs(c - Math.round(c)) < 0.01;
    add(g, new THREE.BoxGeometry(whole ? 0.5 : 0.28, 0.06, 0.04), basic(c >= 38 ? 0xff5a3d : 0x17256b), [whole ? -0.55 : -0.48, yOf(c), -0.28], [0, 0, 0], [1, 1, 1], false);
  }
  const hotGlow = glow(0xff7a3d, 6, 0);
  hotGlow.position.set(0, 7, 0.6);
  g.add(hotGlow);
  g.userData = {
    yOf,
    set(c) {
      col.scale.y = Math.max(0.01, yOf(c) - 1.3);
      hotGlow.material.opacity = clamp((c - 37.6) / 1.2) * 0.6;
      hotGlow.position.y = yOf(c);
    },
  };
  g.userData.set(37);
  return g;
}

// Heat/fever particles: glowing orange motes rising around a point.
function heatMotes(n, seed) {
  const R = rng(seed);
  const pos = new Float32Array(n * 3), ph = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const a = R() * Math.PI * 2, r = 0.8 + R() * 1.6;
    pos.set([Math.cos(a) * r, R() * 4.5, Math.sin(a) * r], i * 3);
    ph[i] = R();
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aPh', new THREE.BufferAttribute(ph, 1));
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uA: { value: 0 } },
    vertexShader: `attribute float aPh; uniform float uTime; varying float vA;
      void main(){ vec3 p = position; float k = fract(aPh + uTime * 0.35); p.y = mod(position.y + uTime * 1.4, 4.5);
      p.x += sin(uTime * 2.0 + aPh * 30.0) * 0.15; vA = sin(k * 3.14159);
      vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_PointSize = 70.0 * (1.0 / -mv.z) * 6.0; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform float uA; varying float vA; void main(){ float d = length(gl_PointCoord - 0.5);
      float a = smoothstep(0.5, 0.0, d); gl_FragColor = vec4(1.0, 0.6, 0.25, a * a * vA * uA); }`,
  });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  pts.userData.update = (t, a) => {
    mat.uniforms.uTime.value = t;
    mat.uniforms.uA.value = a;
  };
  return pts;
}

// ------------------------------------------------------------ blood vessel
export function buildVessel() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x5a0f22);
  scene.fog = new THREE.Fog(0x8a1f35, 8, 46);
  scene.add(new THREE.HemisphereLight(0xffd6d6, 0x7a2033, 1.6));
  const key = new THREE.PointLight(0xffe0d0, 60, 30, 1.5);
  key.position.set(0, 3, 6);
  scene.add(key);
  const wallTex = canvasTex(512, 256, (g, w, h) => {
    g.fillStyle = '#c63d55';
    g.fillRect(0, 0, w, h);
    const R = rng(3);
    for (let i = 0; i < 70; i++) {
      const x = R() * w, y = R() * h, r = 10 + R() * 30;
      const gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, 'rgba(255,150,160,0.5)');
      gr.addColorStop(1, 'rgba(255,150,160,0)');
      g.fillStyle = gr;
      g.fillRect(x - r, y - r, r * 2, r * 2);
    }
    g.strokeStyle = 'rgba(120,10,40,0.35)';
    g.lineWidth = 5;
    for (let i = 0; i < 14; i++) {
      g.beginPath();
      let x = R() * w, y = R() * h;
      g.moveTo(x, y);
      for (let k = 0; k < 6; k++) g.lineTo((x += (R() - 0.5) * 80), (y += (R() - 0.5) * 60));
      g.stroke();
    }
  });
  wallTex.wrapS = wallTex.wrapT = THREE.RepeatWrapping;
  wallTex.repeat.set(10, 2);
  const tube = add(scene, new THREE.CylinderGeometry(7, 7, 220, 48, 1, true), std(0xffffff, 0.7, { map: wallTex, side: THREE.BackSide, emissive: 0x501020, emissiveIntensity: 0.6 }), [0, 0, 0], [0, 0, Math.PI / 2], [1, 1, 1], false);
  tube.receiveShadow = false;
  const cells = cellCloud(170, 8, [-60, 60, -5, 5, -5, 5], [-1, 0, 0], 6, 1.6);
  scene.add(cells);
  const germs = [makeGerm(0, 1), makeGerm(1, 2), makeGerm(0, 3)];
  germs.forEach((gm) => scene.add(gm));
  return { scene, cells, germs };
}

// ------------------------------------------------------ body stage (zones)
// Zones along x: brain control room (0), thermometer (24), battle (-24),
// heat demo (48). A warm pink "inside the body" dome surrounds everything.
export const ZONE = { brain: 0, thermo: 24, battle: -24, heat: 48 };
export function buildBodyStage() {
  const scene = new THREE.Scene();
  const sky = makeSky({ top: 0xb0436a, mid: 0xe2738f, horizon: 0xffb7a8, bottom: 0x8a2a48, radius: 400 });
  scene.add(sky);
  scene.fog = new THREE.Fog(0xf3a0a5, 30, 160);
  const hemi = new THREE.HemisphereLight(0xfff0f0, 0xb85a6e, 1.5);
  scene.add(hemi);
  const key = new THREE.DirectionalLight(0xfff2e6, 2.4);
  shadowCfg(key, 9);
  scene.add(key, key.target);
  const rim = new THREE.DirectionalLight(0xffc0d8, 1.4);
  rim.position.set(-8, 6, -10);
  scene.add(rim);
  // soft membrane floor
  const floorTex = canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#ffb4c2';
    g.fillRect(0, 0, w, h);
    const R = rng(12);
    for (let i = 0; i < 40; i++) {
      const x = R() * w, y = R() * h, r = 20 + R() * 40;
      g.strokeStyle = 'rgba(255,255,255,0.35)';
      g.lineWidth = 5;
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.stroke();
      g.fillStyle = 'rgba(230,110,140,0.25)';
      g.beginPath();
      g.arc(x, y, r * 0.3, 0, Math.PI * 2);
      g.fill();
    }
  });
  floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping;
  floorTex.repeat.set(14, 14);
  add(scene, new THREE.CircleGeometry(160, 64), std(0xffffff, 0.85, { map: floorTex }), [12, 0, 0], [-Math.PI / 2, 0, 0]);
  // background vessels (big soft tubes) and floating blood cells
  const R = rng(31);
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const r = 70 + R() * 30;
    add(scene, new THREE.TorusGeometry(18 + R() * 10, 2.2 + R() * 1.5, 12, 40, Math.PI), std(i % 2 ? 0xd94a68 : 0xc23a5c, 0.6, { emissive: 0x6a1028, emissiveIntensity: 0.3 }), [12 + Math.cos(a) * r, -4, Math.sin(a) * r], [0, -a + Math.PI / 2, 0], [1, 1, 1], false);
  }
  const cells = cellCloud(260, 5, [-60, 90, 3, 22, -45, -8], [1, 0, 0], 1.2, 1.4);
  scene.add(cells);

  // brain control room
  const brain = makeBrain();
  brain.position.set(ZONE.brain - 1.6, 4.6, -0.6);
  brain.scale.setScalar(1.25);
  scene.add(brain);
  add(scene, new THREE.CylinderGeometry(1.4, 1.8, 2.8, 32), std(0x5b6fd8, 0.5), [ZONE.brain - 1.6, 1.4, -0.6]);
  add(scene, new THREE.CylinderGeometry(1.9, 1.9, 0.25, 32), std(0xffd84a, 0.4), [ZONE.brain - 1.6, 2.85, -0.6]);
  const panel = makePanel();
  panel.position.set(ZONE.brain + 2.4, 0, 0.6);
  panel.rotation.y = -0.35;
  scene.add(panel);
  // nerve "signal" cable from the body to the brain
  const cable = new THREE.CatmullRomCurve3([new THREE.Vector3(ZONE.brain + 9, 0.1, 4), new THREE.Vector3(ZONE.brain + 5, 0.3, 3.5), new THREE.Vector3(ZONE.brain + 1, 0.4, 2.2), new THREE.Vector3(ZONE.brain - 1.6, 1.6, 1.1), new THREE.Vector3(ZONE.brain - 1.6, 3.4, 0.6)]);
  add(scene, new THREE.TubeGeometry(cable, 60, 0.12, 10), std(0xffe36b, 0.4, { emissive: 0xffb020, emissiveIntensity: 0.3 }));
  const pulses = [];
  for (let i = 0; i < 4; i++) {
    const p = glow(0xfff2a0, 1.6, 0);
    scene.add(p);
    pulses.push(p);
  }

  // thermometer zone
  const thermo = makeThermometer();
  thermo.position.set(ZONE.thermo, 0, 0);
  scene.add(thermo);

  // battle zone: white blood cells vs germs
  const wbcs = [makeWBC(1), makeWBC(2), makeWBC(3)];
  const germs = [makeGerm(0, 4), makeGerm(1, 5), makeGerm(2, 6), makeGerm(0, 7)];
  [...wbcs, ...germs].forEach((o) => scene.add(o));

  // heat motes (follow Affan when he shivers)
  const motes = heatMotes(90, 3);
  scene.add(motes);

  const aff = makeAffan();
  scene.add(aff.root);
  return { scene, sky, hemi, key, cells, brain, panel, cable, pulses, thermo, wbcs, germs, motes, aff, blush: blushOf(aff) };
}

// ----------------------------------------------------------------- outro
export function buildOutro() {
  const scene = new THREE.Scene();
  const bg = canvasTex(540, 960, (g) => {
    const gr = g.createRadialGradient(270, 380, 40, 270, 420, 700);
    gr.addColorStop(0, '#8fd0ff');
    gr.addColorStop(0.45, '#3f9cf2');
    gr.addColorStop(1, '#1a5fcf');
    g.fillStyle = gr;
    g.fillRect(0, 0, 540, 960);
  });
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
