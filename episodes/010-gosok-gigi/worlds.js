// Episode 010 sets: Affan's bathroom (real world), the microscopic Tooth City
// (plaque, bacteria, sugar, acid, giant soft toothbrush, fluoride foam) and the
// branded outro stage. All procedural and deterministic.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { rng, clamp } from '../../shared/core.js';
import { makeAffan } from '../../shared/affan.js';
import { makeParent } from '../../shared/family.js';
import { add, makeSky, glow } from '../../shared/props.js';

const std = (color, rough = 0.6, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0, ...extra });
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
  c.far = 120;
  light.shadow.bias = -0.0004;
  light.shadow.normalBias = 0.03;
}

function canvasTex(w, h, draw, repeat = [1, 1]) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(...repeat);
  return t;
}

const tiles = (base, grout, n = 4) => (g, w, h) => {
  g.fillStyle = grout;
  g.fillRect(0, 0, w, h);
  const s = w / n;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const gr = g.createLinearGradient(i * s, j * s, i * s + s, j * s + s);
    gr.addColorStop(0, base[0]);
    gr.addColorStop(1, base[1]);
    g.fillStyle = gr;
    g.beginPath();
    g.roundRect(i * s + 4, j * s + 4, s - 8, s - 8, 10);
    g.fill();
    g.fillStyle = 'rgba(255,255,255,0.35)';
    g.fillRect(i * s + 12, j * s + 10, s * 0.35, 5);
  }
};

const GLSL_NOISE = `
float h3(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float vnoise(vec3 x){ vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(h3(i), h3(i + vec3(1,0,0)), f.x), mix(h3(i + vec3(0,1,0)), h3(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(h3(i + vec3(0,0,1)), h3(i + vec3(1,0,1)), f.x), mix(h3(i + vec3(0,1,1)), h3(i + vec3(1,1,1)), f.x), f.y), f.z); }
float fbm(vec3 p){ return 0.6 * vnoise(p) + 0.3 * vnoise(p * 2.1) + 0.1 * vnoise(p * 4.3); }
`;

// =================================================================== props
// Toothbrush along +x: head (bristles along -y) centred at the origin, handle out to x ~ 8.
// Soft rounded tufts; userData.bend(k) flexes the bristles a little (k ~ -1..1).
export function makeToothbrush({ handle = 0x2fbfe8, grip = 0xffffff, tuft = [0xffffff, 0x9ceaff] } = {}) {
  const g = new THREE.Group();
  const hm = std(handle, 0.3, { emissive: handle, emissiveIntensity: 0.06 });
  add(g, new RoundedBoxGeometry(2.4, 0.32, 0.8, 3, 0.14), hm, [0, 0, 0]);
  add(g, new RoundedBoxGeometry(1.7, 0.24, 0.4, 3, 0.11), hm, [2.0, 0.07, 0], [0, 0, 0.06]);
  add(g, new RoundedBoxGeometry(5.0, 0.46, 0.66, 4, 0.22), hm, [5.2, 0.22, 0], [0, 0, 0.05]);
  add(g, new RoundedBoxGeometry(2.4, 0.5, 0.56, 4, 0.22), std(grip, 0.5), [4.9, 0.21, 0], [0, 0, 0.05]);
  add(g, new THREE.SphereGeometry(0.14, 12, 10), std(0xffd84a, 0.4), [6.9, 0.48, 0]);
  const cols = 7, rows = 3;
  const geo = new THREE.CapsuleGeometry(0.1, 0.62, 4, 10);
  geo.translate(0, -0.41, 0);
  const tufts = [];
  for (let c = 0; c < 2; c++) {
    const im = new THREE.InstancedMesh(geo, std(tuft[c], 0.5, { emissive: tuft[c], emissiveIntensity: 0.08 }), Math.ceil((cols * rows) / 2));
    im.castShadow = true;
    g.add(im);
    tufts.push(im);
  }
  const base = [];
  for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) base.push([-0.98 + (i * 1.96) / (cols - 1), -0.12, -0.24 + (j * 0.48) / (rows - 1), (i + j) % 2]);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), one = new THREE.Vector3(1, 1, 1), p = new THREE.Vector3();
  const bend = (k = 0, kz = 0) => {
    const cnt = [0, 0];
    for (const [x, y, z, c] of base) {
      q.setFromEuler(e.set(kz * 0.35, 0, k * 0.35));
      tufts[c].setMatrixAt(cnt[c]++, m.compose(p.set(x, y, z), q, one));
    }
    tufts.forEach((t) => (t.instanceMatrix.needsUpdate = true));
  };
  bend(0);
  g.userData = { bend, tipY: -0.95, gripX: 4.9 };
  return g;
}

// Pea-sized toothpaste blob (white with cyan stripes), sits on top of the bristles.
export function makePasteBlob() {
  const tex = canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = '#ffffff';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#5fd8f2';
    for (let i = 0; i < 3; i++) g.fillRect(i * 43 + 8, 0, 9, h);
  });
  const m = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 18), std(0xffffff, 0.25, { map: tex, emissive: 0xffffff, emissiveIntensity: 0.08 }));
  m.castShadow = true;
  return m;
}

// Affan's magnifying glass: grip at the origin, handle up +y to the lens ring.
export function makeMagnifier() {
  const g = new THREE.Group();
  add(g, new THREE.CapsuleGeometry(0.075, 0.45, 4, 12), std(0xffc928, 0.4), [0, 0.15, 0]);
  add(g, new THREE.CylinderGeometry(0.095, 0.095, 0.12, 16), std(0x1c2752, 0.5), [0, 0.47, 0]);
  const ring = new THREE.Group();
  ring.position.set(0, 0.86, 0);
  g.add(ring);
  add(ring, new THREE.TorusGeometry(0.33, 0.06, 14, 40), std(0xffc928, 0.35, { emissive: 0xffa000, emissiveIntensity: 0.15 }));
  add(ring, new THREE.TorusGeometry(0.39, 0.03, 10, 40), std(0x1c2752, 0.5));
  const lens = add(ring, new THREE.CircleGeometry(0.33, 40), new THREE.MeshPhysicalMaterial({ color: 0xbff0ff, roughness: 0.05, transparent: true, opacity: 0.35, emissive: 0x6fdcff, emissiveIntensity: 0.25, side: THREE.DoubleSide, depthWrite: false }), [0, 0, 0], [0, 0, 0], [1, 1, 1], false);
  g.userData = { ring, lens };
  return g;
}

function makeTube() {
  const g = new THREE.Group();
  add(g, new THREE.CapsuleGeometry(0.22, 1.0, 6, 18), std(0xffffff, 0.35), [0, 0, 0], [0, 0, Math.PI / 2], [1, 1, 0.55]);
  add(g, new THREE.CylinderGeometry(0.23, 0.23, 0.22, 18, 1, true), std(0x2fbfe8, 0.4), [0.1, 0, 0], [0, 0, Math.PI / 2], [1, 1, 0.56]);
  add(g, new THREE.CylinderGeometry(0.12, 0.13, 0.22, 16), std(0x2fbfe8, 0.35), [0.82, 0, 0], [0, 0, Math.PI / 2]);
  add(g, new THREE.BoxGeometry(0.12, 0.5, 0.06), std(0xf2915f, 0.5), [-0.76, 0, 0]);
  return g;
}

function makeDuck() {
  const g = new THREE.Group();
  const y = std(0xffd23f, 0.35, { emissive: 0x4a3000, emissiveIntensity: 0.1 });
  add(g, new THREE.SphereGeometry(0.34, 20, 14), y, [0, 0.28, 0], [0, 0, 0], [1.15, 0.85, 0.9]);
  add(g, new THREE.SphereGeometry(0.22, 20, 14), y, [0.22, 0.62, 0]);
  add(g, new THREE.ConeGeometry(0.08, 0.2, 12), std(0xff8a3d, 0.4), [0.44, 0.6, 0], [0, 0, -Math.PI / 2]);
  for (const s of [-1, 1]) add(g, new THREE.SphereGeometry(0.035, 8, 6), std(0x111111, 0.3), [0.36, 0.7, 0.11 * s]);
  add(g, new THREE.SphereGeometry(0.12, 12, 8), y, [-0.34, 0.42, 0], [0, 0, 0], [1, 0.6, 0.8]);
  return g;
}

function makeSunIcon3D() {
  return glow(0xfff2b0, 1.2, 0.9);
}

// ================================================================ bathroom
export function buildBathroom() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xdff3f6);
  const hemi = new THREE.HemisphereLight(0xffffff, 0xbad6de, 1.25);
  scene.add(hemi);
  const key = new THREE.DirectionalLight(0xfff1e0, 2.3);
  key.position.set(2.0, 9.5, 7.5);
  key.target.position.set(0, 2.5, -0.5);
  shadowCfg(key, 6);
  scene.add(key, key.target);
  const win = new THREE.DirectionalLight(0xcfeaff, 0.9);
  win.position.set(3, 6, -9);
  scene.add(win);
  const vanity = new THREE.PointLight(0xffe6c8, 14, 9, 2);
  vanity.position.set(0, 5.9, 1.7);
  scene.add(vanity);

  const wallLow = std(0xffffff, 0.35, { map: canvasTex(256, 256, tiles(['#a9ecf6', '#7fd7ea'], '#e8fbff'), [6, 2]) });
  const wallHigh = std(0xffffff, 0.45, { map: canvasTex(256, 256, tiles(['#ffffff', '#eef8fb'], '#d5edf3'), [6, 3]) });
  const floorM = std(0xffffff, 0.4, { map: canvasTex(256, 256, (g, w, h) => {
    tiles(['#ffffff', '#f0f8fb'], '#cfe7ef', 2)(g, w, h);
    g.fillStyle = '#9fe3f0';
    g.fillRect(w / 2 + 4, 4, w / 2 - 8, h / 2 - 8);
    g.fillRect(4, h / 2 + 4, w / 2 - 8, h / 2 - 8);
  }, [8, 8]) });
  add(scene, new THREE.PlaneGeometry(14, 14), floorM, [0, 0, -1], [-Math.PI / 2, 0, 0], [1, 1, 1], false).receiveShadow = true;
  add(scene, new THREE.PlaneGeometry(9.4, 7.6), std(0xfafdff, 0.9), [0, 7.6, -1], [Math.PI / 2, 0, 0], [1, 1, 1], false);
  // walls (single-sided, facing into the room)
  const wall = (pos, rot, w) => {
    add(scene, new THREE.PlaneGeometry(w, 2.9), wallLow, [pos[0], 1.45, pos[2]], rot, [1, 1, 1], false).receiveShadow = true;
    add(scene, new THREE.PlaneGeometry(w, 4.7), wallHigh, [pos[0], 5.25, pos[2]], rot, [1, 1, 1], false).receiveShadow = true;
    add(scene, new THREE.PlaneGeometry(w, 0.16), std(0x1c2752, 0.5, { polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }), [pos[0], 2.95, pos[2]], rot, [1, 1, 1], false);
  };
  wall([0, 0, -4.2], [0, 0, 0], 9.4);
  wall([4.7, 0, -1], [0, -Math.PI / 2, 0], 6.4);
  wall([-4.7, 0, -1], [0, Math.PI / 2, 0], 6.4);
  // front (mirror) wall, facing -z
  wall([0, 0, 2.21], [0, Math.PI, 0], 9.4);

  // vanity counter + sink
  add(scene, new RoundedBoxGeometry(7.0, 1.95, 1.5, 3, 0.06), std(0xffffff, 0.45), [0, 0.98, 1.45]);
  for (const x of [-2.4, -0.8, 0.8, 2.4]) add(scene, new RoundedBoxGeometry(1.45, 1.55, 0.06, 2, 0.03), std(0xffc4a3, 0.5), [x, 1.0, 0.7]);
  for (const x of [-1.9, -0.3, 1.3, 2.9]) add(scene, new THREE.SphereGeometry(0.06, 10, 8), std(0x1c2752, 0.4), [x - 0.32, 1.35, 0.66]);
  const top = add(scene, new RoundedBoxGeometry(7.3, 0.16, 1.7, 3, 0.05), std(0xf7f3ee, 0.25), [0, 2.04, 1.38]);
  top.receiveShadow = true;
  const basin = new THREE.Group();
  basin.position.set(0, 2.13, 1.32);
  scene.add(basin);
  add(basin, new THREE.TorusGeometry(0.85, 0.11, 12, 40), std(0xffffff, 0.2), [0, 0, 0], [Math.PI / 2, 0, 0], [1, 0.72, 1]);
  const bowlGeo = new THREE.SphereGeometry(0.85, 32, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
  add(basin, bowlGeo, std(0xeaf6fa, 0.2, { side: THREE.BackSide }), [0, 0.02, 0], [0, 0, 0], [1, 0.55, 0.72]);
  add(basin, new THREE.CircleGeometry(0.08, 16), std(0x9aa6b5, 0.3, { metalness: 0.5 }), [0, -0.44, 0], [-Math.PI / 2, 0, 0]);
  const faucet = new THREE.Group();
  faucet.position.set(0, 2.12, 2.0);
  scene.add(faucet);
  const chrome = std(0xdfe8ee, 0.15, { metalness: 0.8 });
  add(faucet, new THREE.CylinderGeometry(0.11, 0.14, 0.62, 16), chrome, [0, 0.31, 0]);
  add(faucet, new THREE.CylinderGeometry(0.07, 0.07, 0.62, 12), chrome, [0, 0.6, -0.27], [Math.PI / 2, 0, 0]);
  add(faucet, new THREE.SphereGeometry(0.13, 14, 10), std(0x2fbfe8, 0.3), [0, 0.7, 0.08]);
  // counter props
  const cup = new THREE.Group();
  cup.position.set(-2.3, 2.12, 1.75);
  scene.add(cup);
  add(cup, new THREE.CylinderGeometry(0.34, 0.28, 0.8, 24), std(0xf2915f, 0.4), [0, 0.4, 0]);
  add(cup, new THREE.TorusGeometry(0.335, 0.035, 8, 24), std(0xffffff, 0.4), [0, 0.8, 0], [Math.PI / 2, 0, 0]);
  const tube = makeTube();
  tube.position.set(-1.45, 2.32, 1.6);
  tube.rotation.y = 0.35;
  scene.add(tube);
  const duck = makeDuck();
  duck.position.set(2.25, 2.12, 1.7);
  duck.rotation.y = -2.4;
  duck.scale.setScalar(0.9);
  scene.add(duck);

  // mirror (real reflection, only rendered when the camera is in front of it)
  const mirror = new Reflector(new THREE.PlaneGeometry(3.6, 2.9), { textureWidth: 720, textureHeight: 580, color: 0xcfdde4, clipBias: 0.003 });
  mirror.position.set(0, 4.2, 2.195);
  mirror.rotation.y = Math.PI;
  scene.add(mirror);
  const fr = (w, h, r) => {
    const s = new THREE.Shape();
    s.moveTo(-w / 2 + r, -h / 2);
    s.lineTo(w / 2 - r, -h / 2);
    s.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
    s.lineTo(w / 2, h / 2 - r);
    s.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
    s.lineTo(-w / 2 + r, h / 2);
    s.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
    s.lineTo(-w / 2, -h / 2 + r);
    s.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
    return s;
  };
  const outer = fr(3.95, 3.25, 0.35);
  outer.holes.push(fr(3.6, 2.9, 0.2));
  const frame = add(scene, new THREE.ExtrudeGeometry(outer, { depth: 0.06, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 2 }), std(0x2fbfe8, 0.35), [0, 4.2, 2.2], [0, Math.PI, 0]);
  add(scene, new RoundedBoxGeometry(2.6, 0.22, 0.24, 3, 0.1), std(0xffffff, 0.3, { emissive: 0xfff2d8, emissiveIntensity: 1.2 }), [0, 5.95, 2.08]);

  // back wall: window (day / night), towel, shelf
  const winG = new THREE.Group();
  winG.position.set(2.2, 4.5, -4.18);
  scene.add(winG);
  const skyTex = (night) => canvasTex(256, 256, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, night ? '#101a4a' : '#7fd3ff');
    gr.addColorStop(1, night ? '#3b2f7a' : '#e9f8ff');
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);
    if (night) {
      g.fillStyle = '#fff6c8';
      g.beginPath();
      g.arc(170, 80, 34, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#1a2560';
      g.beginPath();
      g.arc(186, 70, 30, 0, Math.PI * 2);
      g.fill();
      const R = rng(4);
      for (let i = 0; i < 30; i++) {
        g.fillStyle = `rgba(255,255,255,${0.4 + R() * 0.6})`;
        g.beginPath();
        g.arc(R() * w, R() * h * 0.8, 1 + R() * 2.5, 0, Math.PI * 2);
        g.fill();
      }
    } else {
      g.fillStyle = '#fff4b8';
      g.beginPath();
      g.arc(80, 70, 30, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = 'rgba(255,255,255,0.9)';
      for (const [x, y, r] of [[160, 150, 26], [190, 140, 32], [222, 152, 24], [60, 190, 20], [84, 184, 26]]) {
        g.beginPath();
        g.arc(x, y, r, 0, Math.PI * 2);
        g.fill();
      }
    }
  });
  add(winG, new THREE.PlaneGeometry(1.9, 1.7), new THREE.MeshBasicMaterial({ map: skyTex(false) }), [0, 0, 0.005], [0, 0, 0], [1, 1, 1], false);
  const nightPane = add(winG, new THREE.PlaneGeometry(1.9, 1.7), new THREE.MeshBasicMaterial({ map: skyTex(true), transparent: true, opacity: 0 }), [0, 0, 0.01], [0, 0, 0], [1, 1, 1], false);
  const wf = std(0xffffff, 0.4);
  add(winG, new THREE.BoxGeometry(2.15, 0.14, 0.14), wf, [0, 0.92, 0.05]);
  add(winG, new THREE.BoxGeometry(2.15, 0.18, 0.3), wf, [0, -0.92, 0.1]);
  for (const x of [-1.01, 0, 1.01]) add(winG, new THREE.BoxGeometry(0.12, 1.8, 0.12), wf, [x, 0, 0.05]);
  const plant = new THREE.Group();
  plant.position.set(-0.6, -0.84, 0.15);
  winG.add(plant);
  add(plant, new THREE.CylinderGeometry(0.16, 0.12, 0.28, 14), std(0xffd84a, 0.5), [0, 0.14, 0]);
  for (let i = 0; i < 5; i++) add(plant, new THREE.SphereGeometry(0.12, 10, 8), std(0x5cc46e, 0.6), [Math.sin(i * 1.3) * 0.1, 0.35 + i * 0.05, Math.cos(i * 1.3) * 0.08], [0, 0, 0], [0.8, 1.3, 0.6]);
  // towel bar + peach towel
  add(scene, new THREE.CylinderGeometry(0.04, 0.04, 1.8, 10), chrome, [-2.3, 4.3, -4.05], [0, 0, Math.PI / 2]);
  add(scene, new RoundedBoxGeometry(1.5, 1.9, 0.12, 3, 0.05), std(0xffa57d, 0.9), [-2.3, 3.4, -4.05]);
  add(scene, new THREE.BoxGeometry(1.52, 0.12, 0.14), std(0xffffff, 0.9), [-2.3, 2.75, -4.05]);
  add(scene, new THREE.BoxGeometry(1.52, 0.12, 0.14), std(0x2fbfe8, 0.9), [-2.3, 2.6, -4.05]);
  // bath mat + step stool
  add(scene, new RoundedBoxGeometry(2.6, 0.04, 1.6, 2, 0.02), std(0x7fd7ea, 0.95), [0, 0.02, -0.2], [0, 0, 0], [1, 1, 1], false).receiveShadow = true;
  add(scene, new RoundedBoxGeometry(1.8, 0.55, 1.2, 3, 0.1), std(0xffd84a, 0.45), [0, 0.28, 0]);

  // cast
  const aff = makeAffan();
  aff.root.position.set(0, 0.55, 0);
  scene.add(aff.root);
  const brush = makeToothbrush();
  brush.scale.setScalar(0.105);
  scene.add(brush);
  const paste = makePasteBlob();
  brush.add(paste);
  paste.position.set(0, -1.06, 0);
  paste.scale.set(0.42, 0.3, 0.32);
  const mag = makeMagnifier();
  scene.add(mag);
  const ibu = makeParent({ kind: 'ibu' });
  ibu.root.position.set(-1.25, 0, -1.05);
  scene.add(ibu.root);
  const ayah = makeParent({ kind: 'ayah' });
  ayah.root.position.set(1.3, 0, -1.15);
  scene.add(ayah.root);
  // pea for the size comparison close-up
  const pea = add(scene, new THREE.SphereGeometry(0.13, 24, 18), std(0x8fd45a, 0.45, { emissive: 0x1a3a00, emissiveIntensity: 0.15 }), [0, -10, 0]);
  // Ibu's hand + tube for the pea-sized paste close-up
  const helper = new THREE.Group();
  scene.add(helper);
  add(helper, new THREE.CapsuleGeometry(0.1, 0.9, 6, 16), std(0xffdb8a, 0.75), [0, 0.68, 0]);
  add(helper, new THREE.CylinderGeometry(0.11, 0.11, 0.05, 16), std(0xf2915f, 0.7), [0, 0.2, 0]);
  add(helper, new THREE.SphereGeometry(0.1, 18, 14), std(0xe9ab84, 0.55, { emissive: 0x3a1608, emissiveIntensity: 0.16 }), [0, 0.06, 0.02], [1.15, 1.0, 0.8]);
  for (const k of [-1, 0, 1]) add(helper, new THREE.CapsuleGeometry(0.028, 0.08, 4, 8), std(0xe9ab84, 0.55), [k * 0.045, 0.0, 0.085], [1, 1, 1], [0.3, 0, 0]);
  const hTube = makeTube();
  hTube.scale.setScalar(0.32);
  hTube.position.set(0, -0.02, 0.0);
  hTube.rotation.set(0, 0, -Math.PI / 2);
  helper.add(hTube);
  helper.visible = false;
  // spit foam blob
  const spit = add(scene, new THREE.SphereGeometry(0.06, 14, 10), std(0xffffff, 0.2, { emissive: 0xe8fbff, emissiveIntensity: 0.3 }), [0, -10, 0], [0, 0, 0], [1, 1.2, 1], false);

  const povHide = [faucet, frame, tube];
  return { scene, hemi, key, win, vanity, mirror, nightPane, aff, brush, paste, mag, ibu, ayah, pea, helper, hTube, spit, basin, cup, povHide, tube };
}

// ================================================================ tooth city
// Tooth geometry: a super-ellipsoid crown with a narrower neck at the gum line.
// kind: molar (4 cusps), premolar (2 cusps), canine (pointed), incisor (flat edge).
export function toothGeo(kind = 'molar', seg = [72, 56]) {
  const g = new THREE.SphereGeometry(1, seg[0], seg[1]);
  const p = g.attributes.position;
  const D = { molar: [4, 3.6, 8.2, 0.55, 1.1], premolar: [3.0, 3.1, 8.8, 0.6, 0.9], canine: [2.7, 2.5, 9.4, 0.7, 0], incisor: [3.0, 1.4, 9.4, 0.55, 0] }[kind];
  const [hw, hd, top, eh, cusp] = D;
  const ev = 0.42;
  const sp = (v, e) => Math.sign(v) * Math.pow(Math.abs(v), e);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const r = Math.hypot(x, z);
    const th = Math.atan2(z, x);
    const yy = sp(y, ev);
    let Y = yy > 0 ? yy * top : yy * 3.5;
    const neck = 0.8 + 0.2 * smoothstep(-0.5, top * 0.5, Y);
    const rr = Math.pow(r, ev);
    const u = rr * sp(Math.cos(th), eh), v = rr * sp(Math.sin(th), eh);
    const capW = smoothstep(0.55, 1.0, yy);
    if (cusp > 0) {
      const cu = (1 - Math.cos(2 * Math.PI * u)) / 2;
      const cv = kind === 'molar' ? (1 - Math.cos(2 * Math.PI * v)) / 2 : Math.cos(v * Math.PI * 0.5);
      Y += cusp * cu * cv * capW - 0.35 * capW;
    } else if (kind === 'canine') {
      Y += 1.6 * Math.max(0, 1 - Math.hypot(u, v * 1.3)) * capW;
    } else {
      Y -= 0.25 * capW * Math.abs(v);
    }
    p.setXYZ(i, u * hw * neck, Y, v * hd * neck);
  }
  g.computeVertexNormals();
  return g;
}

function sparkleField(n, seed, box, color = [1.0, 0.97, 0.9]) {
  const R = rng(seed);
  const pos = new Float32Array(n * 3), ph = new Float32Array(n), sz = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    pos.set([box[0] + R() * (box[1] - box[0]), box[2] + R() * (box[3] - box[2]), box[4] + R() * (box[5] - box[4])], i * 3);
    ph[i] = R() * 100;
    sz[i] = 6 + R() * 16;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aPh', new THREE.BufferAttribute(ph, 1));
  g.setAttribute('aSz', new THREE.BufferAttribute(sz, 1));
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uA: { value: 1 }, uC: { value: new THREE.Vector3(...color) } },
    vertexShader: `attribute float aPh; attribute float aSz; uniform float uTime; varying float vA;
      void main(){ vec3 p = position; p.y += sin(uTime * 0.6 + aPh) * 0.4; vA = 0.5 + 0.5 * sin(uTime * 2.5 + aPh);
      vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_PointSize = aSz * (8.0 / -mv.z); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform float uA; uniform vec3 uC; varying float vA; void main(){ vec2 p = gl_PointCoord - 0.5; float d = length(p);
      float star = max(0.0, 1.0 - abs(p.x) * 9.0) * max(0.0, 1.0 - abs(p.y) * 1.6) + max(0.0, 1.0 - abs(p.y) * 9.0) * max(0.0, 1.0 - abs(p.x) * 1.6);
      float a = (smoothstep(0.5, 0.0, d) * 0.5 + star) * vA * uA; gl_FragColor = vec4(uC, a); }`,
  });
  const pts = new THREE.Points(g, mat);
  pts.frustumCulled = false;
  pts.userData.update = (t, a = 1) => {
    mat.uniforms.uTime.value = t;
    mat.uniforms.uA.value = a;
  };
  return pts;
}

// Cute, friendly bacterium: rod or round, pastel, with dot eyes (never scary).
function makeBacterium(R, i) {
  const g = new THREE.Group();
  const cols = [0x9be8a8, 0xc3b0ff, 0xffb48f, 0x8fe0ff, 0xffd97a];
  const c = cols[i % cols.length];
  const mat = new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.35, clearcoat: 0.6, emissive: c, emissiveIntensity: 0.12 });
  const rod = i % 3 !== 0;
  const bodyM = add(g, rod ? new THREE.CapsuleGeometry(0.26, 0.5, 8, 18) : new THREE.SphereGeometry(0.34, 24, 18), mat, [0, 0, 0], rod ? [0, 0, Math.PI / 2] : [0, 0, 0]);
  const face = new THREE.Group();
  face.position.set(0, 0.04, rod ? 0.24 : 0.3);
  g.add(face);
  const eyeM = std(0x1a1630, 0.3);
  for (const s of [-1, 1]) {
    add(face, new THREE.SphereGeometry(0.055, 12, 10), eyeM, [0.11 * s, 0.03, 0], [0, 0, 0], [1, 1.25, 0.6], false);
    add(face, new THREE.SphereGeometry(0.018, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }), [0.11 * s + 0.018, 0.06, 0.03], [0, 0, 0], [1, 1, 1], false);
  }
  add(face, new THREE.TorusGeometry(0.05, 0.012, 6, 12, Math.PI), eyeM, [0, -0.07, 0], [0, 0, Math.PI], [1, 0.8, 1], false);
  // little hair-like pili
  if (rod) for (let k = 0; k < 6; k++) add(g, new THREE.CapsuleGeometry(0.015, 0.12, 2, 4), mat, [Math.cos(k) * 0.42, Math.sin(k * 2.1) * 0.24, -0.05], [0, 0, k * 1.1], [1, 1, 1], false);
  g.userData = { body: bodyM, face, mat, rod, ph: R() * 10 };
  return g;
}

export function buildToothCity() {
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xf9cfe0, 45, 300);
  const sky = makeSky({ top: 0x6fd0ff, mid: 0xb9b2ff, horizon: 0xffc9dc, bottom: 0xf3a6bc, radius: 1500 });
  scene.add(sky);
  scene.add(new THREE.HemisphereLight(0xf2fbff, 0xf0a3b6, 1.15));
  const key = new THREE.DirectionalLight(0xfff3e8, 2.5);
  key.position.set(18, 40, 26);
  shadowCfg(key, 18);
  scene.add(key, key.target);
  const rim = new THREE.DirectionalLight(0x9fe6ff, 1.4);
  rim.position.set(-30, 18, -30);
  scene.add(rim);

  // gum landscape
  const gumGeo = new THREE.PlaneGeometry(700, 700, 220, 220);
  gumGeo.rotateX(-Math.PI / 2);
  const gp = gumGeo.attributes.position;
  for (let i = 0; i < gp.count; i++) {
    const x = gp.getX(i), z = gp.getZ(i);
    const street = Math.exp(-((x / 5) ** 2));
    const ridge = 0.5 * Math.exp(-(((Math.abs(x) - 8.5) / 4) ** 2));
    gp.setY(i, ridge + (1 - street) * (0.25 * Math.sin(x * 0.21 + z * 0.13) * Math.cos(z * 0.17)) + 0.08 * Math.sin(x * 1.3) * Math.sin(z * 1.1) - 0.15 * street + Math.max(0, Math.abs(x) - 30) * 0.05);
  }
  gumGeo.computeVertexNormals();
  const gumM = new THREE.MeshPhysicalMaterial({ color: 0xf4a3b6, roughness: 0.42, clearcoat: 0.55, clearcoatRoughness: 0.35, sheen: 0.5, sheenColor: new THREE.Color(0xffd6e2) });
  const gum = add(scene, gumGeo, gumM, [0, 0, 0], [0, 0, 0], [1, 1, 1], false);
  gum.receiveShadow = true;

  const toothM = new THREE.MeshPhysicalMaterial({ color: 0xfbf6ea, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.12, sheen: 0.4, sheenColor: new THREE.Color(0xdff6ff) });
  const collarM = new THREE.MeshPhysicalMaterial({ color: 0xf59cb2, roughness: 0.4, clearcoat: 0.5 });

  // the hero molar (left of the street, chewing surface up, smooth face towards the street)
  const heroU = { uDemin: { value: 0 }, uFluor: { value: 0 }, uTime: { value: 0 } };
  const heroM = toothM.clone();
  heroM.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, heroU);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vO;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvO = position;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>\nvarying vec3 vO; uniform float uDemin, uFluor, uTime;\n${GLSL_NOISE}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        float spot = (1.0 - smoothstep(0.55, 1.05, length((vO.xy - vec2(0.9, 2.1)) / vec2(1.7, 1.15)) + 0.25 * fbm(vO * 2.5))) * step(0.0, vO.z);
        float chalk = spot * uDemin;
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(1.0, 1.0, 1.0) * (0.95 + 0.1 * fbm(vO * 9.0)), chalk);
        diffuseColor.rgb *= 1.0 - 0.12 * chalk * smoothstep(0.4, 0.9, fbm(vO * 6.0));`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        roughnessFactor = mix(roughnessFactor, 0.95, chalk);`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        float band = 0.5 + 0.5 * sin(vO.y * 1.4 - uTime * 4.0 + vO.x * 0.6);
        float sp2 = smoothstep(0.82, 0.98, vnoise(vO * 5.0 + vec3(0.0, uTime * 1.5, 0.0)));
        totalEmissiveRadiance += vec3(0.25, 0.8, 1.0) * uFluor * (0.12 + 0.35 * band * band + 0.9 * sp2);`);
  };
  heroM.customProgramCacheKey = () => 'hero-tooth';
  const hero = new THREE.Group();
  hero.position.set(-7.2, 0, 0);
  hero.rotation.y = Math.PI / 2;
  hero.scale.setScalar(1.25);
  scene.add(hero);
  const heroGeo = toothGeo('molar', [180, 140]);
  const heroMesh = add(hero, heroGeo, heroM);
  add(hero, new THREE.SphereGeometry(1, 40, 20), collarM, [0, 0.0, 0], [0, 0, 0], [4.6, 0.9, 4.2]);

  // plaque: a bumpy, sticky, yellowish layer hugging the tooth near the gum line
  const plaqueU = { uAmt: { value: 0 }, uClean: { value: 99 }, uTime: { value: 0 }, uBreak: { value: 0 } };
  const plaqueM = new THREE.MeshPhysicalMaterial({ color: 0xffe27a, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.15, transparent: true, opacity: 0.9, emissive: 0xc79a10, emissiveIntensity: 0.22, sheen: 0.6, sheenColor: new THREE.Color(0xfff4c0) });
  plaqueM.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, plaqueU);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>\nvarying vec3 vO; uniform float uTime, uAmt;\n${GLSL_NOISE}`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vO = position;
        float bump = fbm(position * 2.2 + vec3(0.0, 0.0, uTime * 0.15));
        float blob = smoothstep(0.45, 0.8, vnoise(position * 4.5));
        transformed += objectNormal * (0.05 + uAmt * (0.1 + 0.32 * bump + 0.16 * blob));`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>\nvarying vec3 vO; uniform float uAmt, uClean, uTime, uBreak;\n${GLSL_NOISE}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        float n = fbm(vO * 0.9);
        float h = 1.0 - smoothstep(2.6, 4.8, vO.y + 1.6 * (n - 0.5));
        float fis = smoothstep(7.3, 7.9, vO.y) * (1.0 - smoothstep(0.0, 1.2, abs(vO.x))) ;
        float m = max(h, fis) * smoothstep(0.0, 0.25, uAmt + n * 0.25 - 0.1);
        float edge = uClean + 0.45 * sin(vO.y * 2.3) + 0.3 * (n - 0.5);
        float clean = smoothstep(edge - 0.25, edge + 0.25, vO.x);
        m *= 1.0 - clean;
        m *= 1.0 - uBreak * smoothstep(0.35, 0.65, fbm(vO * 2.7));
        if (m < 0.5) discard;
        float sp = fbm(vO * 5.0);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(1.0, 0.97, 0.78), 0.45 * sp);
        diffuseColor.rgb *= 0.94 + 0.08 * smoothstep(0.3, 0.7, vnoise(vO * 3.0));`);
  };
  plaqueM.customProgramCacheKey = () => 'plaque';
  const plaque = add(hero, heroGeo, plaqueM, [0, 0, 0], [0, 0, 0], [1, 1, 1], false);
  plaque.renderOrder = 2;

  // tooth city: rows of teeth "buildings" along the street (instanced per kind)
  const R = rng(10);
  const kinds = ['molar', 'premolar', 'canine', 'incisor'];
  const slots = [];
  for (const side of [-1, 1]) {
    for (let z = 14; z > -260; z -= 10.5 + R() * 3) {
      if (side < 0 && Math.abs(z) < 7) continue;
      slots.push({ x: side * (8.2 + R() * 1.4), z, s: 0.95 + R() * 0.45, k: kinds[Math.floor(R() * 4)], ry: (side < 0 ? Math.PI / 2 : -Math.PI / 2) + (R() - 0.5) * 0.4 });
    }
    for (let z = 30; z > -300; z -= 16 + R() * 8) slots.push({ x: side * (24 + R() * 10), z, s: 1.6 + R() * 1.0, k: kinds[Math.floor(R() * 4)], ry: R() * Math.PI * 2 });
    for (let z = 40; z > -320; z -= 26 + R() * 10) slots.push({ x: side * (52 + R() * 30), z, s: 2.6 + R() * 2.0, k: kinds[Math.floor(R() * 4)], ry: R() * Math.PI * 2 });
  }
  const mtx = new THREE.Matrix4(), qq = new THREE.Quaternion(), sc = new THREE.Vector3(), ps = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  for (const k of kinds) {
    const list = slots.filter((s) => s.k === k);
    const im = new THREE.InstancedMesh(toothGeo(k, [40, 30]), toothM, list.length);
    const cm = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 24, 12), collarM, list.length);
    list.forEach((s, i) => {
      qq.setFromAxisAngle(up, s.ry);
      im.setMatrixAt(i, mtx.compose(ps.set(s.x, 0, s.z), qq, sc.setScalar(s.s)));
      cm.setMatrixAt(i, mtx.compose(ps.set(s.x, 0, s.z), qq, sc.set(s.s * 4.0, s.s * 0.8, s.s * 3.6)));
    });
    im.castShadow = im.receiveShadow = true;
    scene.add(im, cm);
  }
  // soft floating bubbles + sparkles for a dreamy microscopic feel
  const bubM = new THREE.MeshPhysicalMaterial({ color: 0xe8fbff, roughness: 0.05, transparent: true, opacity: 0.28, clearcoat: 1, depthWrite: false });
  const bubbles = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 20, 14), bubM, 70);
  const bubData = [];
  for (let i = 0; i < 70; i++) bubData.push([(R() - 0.5) * 60, R() * 30, 10 - R() * 90, 0.15 + R() * 0.55, R() * 10]);
  scene.add(bubbles);
  const sparkles = sparkleField(500, 4, [-40, 40, 0.5, 26, -80, 20]);
  scene.add(sparkles);
  const updateBubbles = (t) => {
    bubData.forEach(([x, y, z, r, ph], i) => {
      const yy = (y + t * (0.6 + r)) % 30;
      bubbles.setMatrixAt(i, mtx.compose(ps.set(x + Math.sin(t * 0.7 + ph) * 0.8, yy, z), qq.identity(), sc.setScalar(r)));
    });
    bubbles.instanceMatrix.needsUpdate = true;
  };

  // bacteria living in the plaque on the hero tooth's street-facing side
  const ray = new THREE.Raycaster();
  hero.updateMatrixWorld(true);
  const surf = (lx, ly) => {
    const o = hero.localToWorld(new THREE.Vector3(lx, ly, 12));
    const d = hero.localToWorld(new THREE.Vector3(lx, ly, 0)).sub(o).normalize();
    ray.set(o, d);
    const hit = ray.intersectObject(heroMesh)[0];
    if (!hit) return null;
    const n = hit.face.normal.clone().transformDirection(heroMesh.matrixWorld);
    return { p: hit.point, n };
  };
  const RB = rng(31);
  const bacteria = [];
  const spots = [];
  for (let i = 0; i < 22; i++) {
    const lx = -3.0 + RB() * 6.0, ly = 0.7 + RB() * 2.9;
    if (spots.some(([a, b]) => Math.hypot(a - lx, b - ly) < 0.85)) continue;
    const s = surf(lx, ly);
    if (!s) continue;
    spots.push([lx, ly]);
    const b = makeBacterium(RB, bacteria.length);
    b.userData.home = s.p.clone().addScaledVector(s.n, 0.42);
    b.userData.n = s.n;
    b.userData.lx = lx;
    b.userData.ly = ly;
    b.position.copy(b.userData.home);
    b.lookAt(b.position.clone().add(s.n));
    b.userData.baseQ = b.quaternion.clone();
    scene.add(b);
    bacteria.push(b);
  }

  // sugar cubes, acid droplets, foam bubbles (all animated from the episode)
  const sugarM = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.25, clearcoat: 1, emissive: 0xffffff, emissiveIntensity: 0.15, transparent: true, opacity: 0.92 });
  const sugar = [];
  for (let i = 0; i < 9; i++) {
    const m = add(scene, new RoundedBoxGeometry(0.5, 0.5, 0.5, 3, 0.08), sugarM, [0, -50, 0]);
    sugar.push(m);
  }
  const acidM = new THREE.MeshPhysicalMaterial({ color: 0xdcff6a, roughness: 0.1, transparent: true, opacity: 0.75, emissive: 0xb6e83a, emissiveIntensity: 0.45, clearcoat: 1, depthWrite: false });
  const acid = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 16, 12), acidM, 90);
  acid.frustumCulled = false;
  scene.add(acid);
  const foamM = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.15, clearcoat: 1, transparent: true, opacity: 0.85, emissive: 0xeefcff, emissiveIntensity: 0.18, depthWrite: true });
  const foam = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 18, 12), foamM, 160);
  foam.frustumCulled = false;
  scene.add(foam);
  const fluorSparks = sparkleField(260, 9, [-4.2, -2.0, 0.3, 7.5, -4.5, 4.5], [0.45, 0.9, 1.0]);
  fluorSparks.position.set(0, 0, 0);
  scene.add(fluorSparks);

  // giant soft toothbrush
  const brush = makeToothbrush();
  brush.scale.setScalar(3.2);
  brush.position.set(0, -60, 0);
  scene.add(brush);

  const aff = makeAffan();
  scene.add(aff.root);
  const mag = makeMagnifier();
  scene.add(mag);

  return { scene, sky, key, hero, heroMesh, heroU, plaque, plaqueU, bacteria, sugar, acid, foam, fluorSparks, brush, aff, mag, sparkles, updateBubbles, surf };
}

// ================================================================== outro
export function buildOutro() {
  const scene = new THREE.Scene();
  const c = document.createElement('canvas');
  c.width = 540;
  c.height = 960;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(270, 380, 40, 270, 420, 700);
  gr.addColorStop(0, '#a8f0ff');
  gr.addColorStop(0.45, '#3fc3ee');
  gr.addColorStop(1, '#1a6fcf');
  g.fillStyle = gr;
  g.fillRect(0, 0, 540, 960);
  const bg = new THREE.CanvasTexture(c);
  bg.colorSpace = THREE.SRGBColorSpace;
  scene.background = bg;
  scene.add(new THREE.HemisphereLight(0xeaf8ff, 0x6a8ab8, 1.5));
  const key = new THREE.DirectionalLight(0xfff2e0, 2.4);
  key.position.set(3, 6, 8);
  shadowCfg(key, 5);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xbff0ff, 2.0);
  rim.position.set(-6, 5, -6);
  scene.add(rim);
  const aff = makeAffan();
  scene.add(aff.root);
  const brush = makeToothbrush();
  brush.scale.setScalar(0.105);
  scene.add(brush);
  const halo = glow(0xfff2b0, 9, 0.35);
  halo.position.set(0, 2.9, -2);
  scene.add(halo);
  return { scene, aff, brush };
}

export { makeSunIcon3D };
